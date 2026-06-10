/**
 * Marketel Signal Extractor v2.0
 * ──────────────────────────────────────────────────────────────────────────
 * Server-side module that receives telemetry events from the client,
 * stores them in-memory per session, and produces LLM-ready digests.
 *
 * ARCHITECTURE:
 *   1. INGEST    — receives batched events from marketel-telemetry.js
 *   2. STORE     — in-memory session store with TTL auto-cleanup
 *   3. FILTER    — strips breadcrumbs, keeps only signal-tier events
 *   4. DIGEST    — builds compact session summaries (client-sent or server-built)
 *   5. TRIGGER   — evaluates whether a session warrants LLM analysis
 *   6. PROMPT    — generates ready-to-paste LLM analysis prompts
 *   7. ROUTES    — Express endpoints for the telemetry pipeline
 *
 * USAGE:
 *   const telemetry = require('./marketel-signal-extractor');
 *   telemetry.setupRoutes(app);
 *
 * ENDPOINTS:
 *   POST   /api/telemetry                       — receive events from client
 *   GET    /api/telemetry/sessions               — list sessions (with filters)
 *   GET    /api/telemetry/session/:id/digest      — LLM-ready digest
 *   GET    /api/telemetry/session/:id/signals     — raw signal events
 *   GET    /api/telemetry/session/:id/prompt      — ready-to-paste LLM prompt
 *   GET    /api/telemetry/analyze                 — all triggered sessions + digests
 *   DELETE /api/telemetry/session/:id             — delete a session
 *   DELETE /api/telemetry/sessions                — purge all sessions
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  SESSION STORE
// ═══════════════════════════════════════════════════════════════════════════

const sessionStore = new Map();

const STORE_CFG = {
  maxSessions:    500,             // hard cap
  sessionTtlMs:   4 * 60 * 60 * 1000, // 4 hours
  cleanupEveryMs: 10 * 60 * 1000,     // run cleanup every 10 min
};

function getOrCreateSession(sid, uid) {
  let session = sessionStore.get(sid);
  if (!session) {
    session = {
      sessionId:   sid,
      userId:      uid || null,
      events:      [],
      digest:      null,
      createdAt:   Date.now(),
      lastUpdated: Date.now(),
    };
    sessionStore.set(sid, session);

    // Evict oldest if over cap
    if (sessionStore.size > STORE_CFG.maxSessions) {
      const oldest = [...sessionStore.entries()]
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated)[0];
      if (oldest) sessionStore.delete(oldest[0]);
    }
  }
  return session;
}

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function fmtMs(ms) {
  if (ms == null) return '?';
  if (ms < 1000) return ms + 'ms';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m + 'm' + (rs ? rs + 's' : '');
}

function fmtTimestamp(r) {
  const sec = Math.floor((r || 0) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INGEST
// ═══════════════════════════════════════════════════════════════════════════

function ingest(sid, uid, events, digest) {
  if (!sid) return null;
  const session = getOrCreateSession(sid, uid);
  if (events && events.length) {
    session.events.push(...events);
  }
  if (digest) {
    session.digest = digest;
  }
  session.lastUpdated = Date.now();
  return session;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SIGNAL EXTRACTION — filter noise, keep semantic events
// ═══════════════════════════════════════════════════════════════════════════

function getSignals(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  return session.events.filter(e => e.tier === 'signal');
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRIGGER EVALUATION — from raw events (when no client digest)
// ═══════════════════════════════════════════════════════════════════════════

function evaluateTriggersFromEvents(events) {
  const counts = {};
  let maxStep = 0;
  let hasSetup = false;
  const lingerCount = { count: 0 };
  let totalIdleMs = 0;
  let totalHiddenMs = 0;

  for (const e of events) {
    counts[e.t] = (counts[e.t] || 0) + 1;
    if (e.t === 'setup_step_view') {
      hasSetup = true;
      const num = parseInt(e.step, 10) || 0;
      if (num > maxStep) maxStep = num;
    }
    if (e.t === 'step_linger') lingerCount.count++;
    if (e.t === 'idle_end' && e.idleDurationMs) totalIdleMs += e.idleDurationMs;
    if (e.t === 'tab_return' && e.hiddenDurationMs) totalHiddenMs += e.hiddenDurationMs;
  }

  const reasons = [];
  if ((counts.rage_click || 0) > 0)            reasons.push('rage_click_detected');
  if ((counts.dead_click || 0) > 0)            reasons.push('dead_click_detected');
  if ((counts.js_error || 0) > 0)              reasons.push('js_error');
  if ((counts.api_error || 0) > 0)             reasons.push('api_error');
  if ((counts.network_error || 0) > 0)         reasons.push('network_error');
  if ((counts.scroll_reversal || 0) > 3)       reasons.push('excessive_scroll_reversals');
  if (hasSetup && maxStep < 5)                 reasons.push('dropped_before_completion');
  if (totalIdleMs > 300000)                    reasons.push('idle_over_5min');
  if (totalHiddenMs > 300000)                  reasons.push('tabbed_away_over_5min');
  if (lingerCount.count > 0)                   reasons.push('step_lingering');

  return {
    shouldAnalyze: reasons.length > 0,
    reasons,
    severity: reasons.length >= 3 ? 'high' : reasons.length >= 1 ? 'medium' : 'low',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  NARRATIVE BUILDER — server-side fallback
// ═══════════════════════════════════════════════════════════════════════════
//  If the client didn't send a digest (e.g., crashed, lost connection),
//  the server can reconstruct a narrative from the raw signals.

function describeEvent(e) {
  switch (e.t) {
    case 'page_view':
      return '🔵 Landed on /' + (e.p || 'unknown');
    case 'page_load':
      return 'Page loaded (' + fmtMs(e.loadMs) + ', TTFB ' + fmtMs(e.ttfb) + ')';
    case 'click':
      if (e.isButton || e.href || (e.label && e.label.length > 2))
        return 'Clicked "' + (e.label || e.selector) + '"';
      return null; // skip trivial clicks
    case 'rage_click':
      return '🔴 RAGE CLICK on "' + (e.label || e.selector) + '" (' + e.count + 'x)';
    case 'dead_click':
      return '🔴 DEAD CLICK on "' + (e.label || e.selector) + '" (no response)';
    case 'field_focus':
      return 'Focused "' + e.field + '" field';
    case 'field_blur':
      if (e.timeSpentMs > 5000 || e.wasCleared || e.isEmpty) {
        const note = e.wasCleared ? ' (cleared)' : e.isEmpty ? ' (left empty)' : '';
        return '⏱️ Spent ' + fmtMs(e.timeSpentMs) + ' on "' + e.field + '"' + note;
      }
      return null;
    case 'form_submit':
      return '✅ Submitted form' + (e.formId ? ' "' + e.formId + '"' : '') +
             ' (' + e.fieldCount + ' fields, ' + fmtMs(e.timeToSubmitMs) + ')';
    case 'scroll_milestone':
      return 'Scrolled to ' + e.pct + '%';
    case 'scroll_reversal':
      return '🔄 Scrolled back ' + e.fromPct + '% → ' + e.toPct + '%';
    case 'js_error':
      return '🔴 JS ERROR: ' + e.message;
    case 'unhandled_promise':
      return '🔴 PROMISE ERROR: ' + e.reason;
    case 'api_error':
      return '🔴 API ERROR: ' + (e.method || 'GET') + ' ' + e.url + ' → ' + e.status;
    case 'network_error':
      return '🔴 NETWORK FAILURE: ' + e.url + ' — ' + e.error;
    case 'setup_step_view':
      return '📍 Entered setup step ' + e.step;
    case 'landing_cta_click':
      return '🟢 Clicked CTA' + (e.emailEntered ? ' (email entered)' : '');
    case 'landing_email_focus':
      return 'Focused landing email input';
    case 'landing_email_blur':
      return 'Left email input' + (e.hasValue ? ' (has value)' : ' (empty)');
    case 'idle_start':
      return '⏸️ Went idle';
    case 'idle_end':
      return '▶️ Resumed after ' + (e.idleDuration || fmtMs(e.idleDurationMs));
    case 'tab_away':
      return '👋 Tabbed away';
    case 'tab_return':
      return '👋 Returned after ' + (e.hiddenDuration || fmtMs(e.hiddenDurationMs));
    case 'step_linger':
      return '⚠️ LINGERED on ' + e.step + ' for ' + (e.duration || fmtMs(e.durationMs));
    case 'text_copied':
      return '📋 Copied: "' + e.preview + '"';
    case 'text_pasted':
      return '📋 Pasted into "' + (e.field || '?') + '"';
    case 'page_exit':
      return '🚪 Exited (active ' + fmtMs(e.activeMs) + ', max scroll ' + e.maxScrollPct + '%)';
    default:
      return null;
  }
}

function buildNarrativeFromEvents(signals) {
  const lines = [];
  for (const e of signals) {
    const desc = describeEvent(e);
    if (desc) {
      lines.push(fmtTimestamp(e.r) + ' ' + desc);
    }
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DIGEST BUILDER — produces the compact LLM-ready session summary
// ═══════════════════════════════════════════════════════════════════════════

function buildDigest(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // If client sent a digest, prefer it (richer context)
  if (session.digest) return session.digest;

  // Otherwise build server-side from raw events
  const signals  = session.events.filter(e => e.tier === 'signal');
  const triggers = evaluateTriggersFromEvents(session.events);
  const narrative = buildNarrativeFromEvents(signals);

  // Compute timing from events
  const firstWall = session.events[0]?.w || session.createdAt;
  const lastWall  = session.events[session.events.length - 1]?.w || session.lastUpdated;
  const totalMs   = lastWall - firstWall;

  // Extract stats from events
  const counts = {};
  let maxScrollPct = 0;
  let maxStep = 0;
  const stepsVisited = [];

  for (const e of session.events) {
    counts[e.t] = (counts[e.t] || 0) + 1;
    if (e.t === 'scroll_milestone' && e.pct > maxScrollPct) maxScrollPct = e.pct;
    if (e.t === 'setup_step_view') {
      const num = parseInt(e.step, 10) || 0;
      if (num > maxStep) maxStep = num;
      if (e.stepId && stepsVisited.indexOf(e.stepId) === -1) stepsVisited.push(e.stepId);
    }
  }

  return {
    sessionId: session.sessionId,
    userId:    session.userId,
    source:    'server-generated',

    timing: {
      totalMs,
      total: fmtMs(totalMs),
    },

    triggers,

    stats: {
      totalEvents:     session.events.length,
      signalEvents:    signals.length,
      clicks:          counts.click || 0,
      rageClicks:      counts.rage_click || 0,
      deadClicks:      counts.dead_click || 0,
      jsErrors:        counts.js_error || 0,
      apiErrors:       counts.api_error || 0,
      networkErrors:   counts.network_error || 0,
      scrollReversals: counts.scroll_reversal || 0,
      formSubmits:     counts.form_submit || 0,
      maxScrollPct,
    },

    funnel: {
      maxStepReached: maxStep,
      stepsVisited,
      completed: maxStep >= 5,
    },

    narrative,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LLM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════
//  Generates a complete, ready-to-paste prompt for an LLM to analyze
//  a specific session.  Just pipe the output to your agent.

function buildLLMPrompt(sessionId) {
  const digest = buildDigest(sessionId);
  if (!digest) return null;

  const t = digest.triggers || {};
  const s = digest.stats || {};
  const f = digest.funnel || {};
  const timing = digest.timing || {};

  const lines = [];

  lines.push('You are analyzing a user session on the Marketel onboarding funnel.');
  lines.push('The user was trying to set up their hotel booking engine.');
  lines.push('');

  // ── Session Context ──
  lines.push('## Session Context');
  lines.push('- Session ID: ' + digest.sessionId);
  if (digest.device) lines.push('- Device: ' + digest.device);
  if (digest.source) lines.push('- Source: ' + digest.source);
  if (digest.url)    lines.push('- URL: ' + digest.url);
  if (digest.referrer) lines.push('- Referrer: ' + digest.referrer);
  lines.push('- Duration: ' + (timing.total || fmtMs(timing.totalMs)));
  if (timing.active) lines.push('- Active time: ' + timing.active);
  if (timing.idle)   lines.push('- Idle time: ' + timing.idle);
  if (timing.hidden) lines.push('- Tab hidden: ' + timing.hidden);
  lines.push('');

  // ── Trigger Flags ──
  if (t.shouldAnalyze) {
    lines.push('## ⚠️ Trigger Flags');
    lines.push('This session was flagged for analysis (' + t.severity + ' severity):');
    (t.reasons || []).forEach(r => lines.push('- ' + r));
    lines.push('');
  }

  // ── Stats ──
  lines.push('## Stats');
  lines.push('- Clicks: ' + (s.clicks || 0) + ' | Rage clicks: ' + (s.rageClicks || 0) + ' | Dead clicks: ' + (s.deadClicks || 0));
  lines.push('- JS errors: ' + (s.jsErrors || 0) + ' | API errors: ' + (s.apiErrors || 0) + ' | Network errors: ' + (s.networkErrors || 0));
  lines.push('- Scroll reversals: ' + (s.scrollReversals || 0) + ' | Max scroll: ' + (s.maxScrollPct || 0) + '%');
  lines.push('- Form submits: ' + (s.formSubmits || 0) + ' | Field interactions: ' + (s.fieldInteractions || 0));
  lines.push('');

  // ── Funnel ──
  if (f.maxStepReached || (f.stepsVisited && f.stepsVisited.length)) {
    lines.push('## Funnel Progress');
    lines.push('- Max step reached: ' + (f.maxStepReached || 0) + ' of 5');
    lines.push('- Steps visited: ' + (f.stepsVisited || []).join(', '));
    lines.push('- Completed: ' + (f.completed ? 'YES ✓' : 'NO ✗'));
    if (f.lingerEvents && f.lingerEvents.length) {
      lines.push('- Lingering:');
      f.lingerEvents.forEach(l => lines.push('  - ' + l.step + ': ' + l.duration));
    }
    lines.push('');
  }

  // ── Errors ──
  if (digest.errors && digest.errors.length) {
    lines.push('## Errors');
    digest.errors.forEach(e => {
      lines.push('- ' + (e.type || 'error') + ': ' + (e.message || e.reason || JSON.stringify(e)));
    });
    lines.push('');
  }
  if (digest.apiFailures && digest.apiFailures.length) {
    lines.push('## API Failures');
    digest.apiFailures.forEach(f => {
      lines.push('- ' + (f.method || 'GET') + ' ' + f.url + ' → ' + f.status + ' (' + f.durMs + 'ms)');
    });
    lines.push('');
  }

  // ── Narrative Timeline ──
  lines.push('## Session Timeline');
  if (digest.narrative && digest.narrative.length) {
    digest.narrative.forEach(n => lines.push(n));
  } else {
    lines.push('(No narrative data available)');
  }
  lines.push('');

  // ── Analysis Request ──
  lines.push('## Analysis Request');
  lines.push('Based on this session data, provide:');
  lines.push('1. What was the user trying to accomplish?');
  lines.push('2. Where exactly did they get stuck or frustrated?');
  lines.push('3. What caused them to abandon (if they did)?');
  lines.push('4. What specific UI/UX changes would prevent this friction?');
  lines.push('5. Priority rating: Critical / High / Medium / Low');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIST SESSIONS (with trigger filtering)
// ═══════════════════════════════════════════════════════════════════════════

function listSessions({ triggerOnly = false, limit = 50, page: pageFilter, severity } = {}) {
  let sessions = [...sessionStore.values()]
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  return sessions
    .map(s => {
      const triggers = s.digest?.triggers || evaluateTriggersFromEvents(s.events);
      return {
        sessionId:   s.sessionId,
        userId:      s.userId,
        createdAt:   s.createdAt,
        lastUpdated: s.lastUpdated,
        eventCount:  s.events.length,
        hasDigest:   !!s.digest,
        page:        s.events[0]?.p || null,
        triggers,
      };
    })
    .filter(s => {
      if (triggerOnly && !s.triggers.shouldAnalyze) return false;
      if (severity && s.triggers.severity !== severity) return false;
      if (pageFilter && s.page !== pageFilter) return false;
      return true;
    })
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════
//  TTL CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

function cleanup() {
  const now = Date.now();
  let deleted = 0;
  for (const [id, session] of sessionStore) {
    if (now - session.lastUpdated > STORE_CFG.sessionTtlMs) {
      sessionStore.delete(id);
      deleted++;
    }
  }
  if (deleted > 0) {
    console.log(`[telemetry] Cleaned up ${deleted} expired session(s). Active: ${sessionStore.size}`);
  }
}

setInterval(cleanup, STORE_CFG.cleanupEveryMs);

// ═══════════════════════════════════════════════════════════════════════════
//  EXPRESS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

function setupRoutes(app) {

  // ── Receive telemetry events from client ──────────────────────────────
  app.post('/api/telemetry', (req, res) => {
    try {
      const { sid, uid, events, digest } = req.body || {};
      if (!sid) return res.status(400).json({ error: 'Missing session ID (sid)' });

      const session = ingest(sid, uid, events || [], digest || null);
      res.json({
        ok: true,
        eventCount: session.events.length,
        hasDigest:  !!session.digest,
      });
    } catch (e) {
      console.error('[telemetry] Ingest error:', e.message);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // ── List sessions ─────────────────────────────────────────────────────
  app.get('/api/telemetry/sessions', (req, res) => {
    try {
      const triggerOnly = req.query.triggers === 'true';
      const limit       = parseInt(req.query.limit) || 50;
      const page        = req.query.page || undefined;
      const severity    = req.query.severity || undefined;

      const sessions = listSessions({ triggerOnly, limit, page, severity });
      res.json({
        total:    sessionStore.size,
        returned: sessions.length,
        sessions,
      });
    } catch (e) {
      console.error('[telemetry] List error:', e.message);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // ── Get LLM-ready digest for a session ────────────────────────────────
  app.get('/api/telemetry/session/:id/digest', (req, res) => {
    const digest = buildDigest(req.params.id);
    if (!digest) return res.status(404).json({ error: 'Session not found' });
    res.json(digest);
  });

  // ── Get raw signal events ─────────────────────────────────────────────
  app.get('/api/telemetry/session/:id/signals', (req, res) => {
    const signals = getSignals(req.params.id);
    if (!signals) return res.status(404).json({ error: 'Session not found' });
    res.json({
      sessionId: req.params.id,
      count:     signals.length,
      signals,
    });
  });

  // ── Get ready-to-paste LLM prompt ─────────────────────────────────────
  app.get('/api/telemetry/session/:id/prompt', (req, res) => {
    const prompt = buildLLMPrompt(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Session not found' });

    // Return as plain text or JSON depending on Accept header
    if (req.accepts('text/plain')) {
      res.type('text/plain').send(prompt);
    } else {
      res.json({ sessionId: req.params.id, prompt });
    }
  });

  // ── Get all triggered sessions with digests (for batch analysis) ──────
  app.get('/api/telemetry/analyze', (req, res) => {
    try {
      const severity = req.query.severity || undefined;
      const limit    = parseInt(req.query.limit) || 20;

      const sessions = listSessions({ triggerOnly: true, limit, severity });
      const digests  = sessions
        .map(s => buildDigest(s.sessionId))
        .filter(Boolean);

      res.json({
        count:    digests.length,
        sessions: digests,
      });
    } catch (e) {
      console.error('[telemetry] Analyze error:', e.message);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // ── Delete a specific session ─────────────────────────────────────────
  app.delete('/api/telemetry/session/:id', (req, res) => {
    const deleted = sessionStore.delete(req.params.id);
    res.json({ ok: true, deleted });
  });

  // ── Purge all sessions ────────────────────────────────────────────────
  app.delete('/api/telemetry/sessions', (req, res) => {
    const count = sessionStore.size;
    sessionStore.clear();
    res.json({ ok: true, purged: count });
  });

  // ── Health / stats ────────────────────────────────────────────────────
  app.get('/api/telemetry/stats', (req, res) => {
    let totalEvents = 0;
    let triggeredCount = 0;
    for (const s of sessionStore.values()) {
      totalEvents += s.events.length;
      const trig = s.digest?.triggers || evaluateTriggersFromEvents(s.events);
      if (trig.shouldAnalyze) triggeredCount++;
    }
    res.json({
      activeSessions: sessionStore.size,
      totalEvents,
      triggeredSessions: triggeredCount,
      storeMaxSessions: STORE_CFG.maxSessions,
      sessionTtlHours: STORE_CFG.sessionTtlMs / 3600000,
    });
  });

  console.log('[telemetry] Routes mounted: /api/telemetry/*');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  setupRoutes,
  ingest,
  getSignals,
  buildDigest,
  buildLLMPrompt,
  listSessions,
  evaluateTriggersFromEvents,
  cleanup,
  // Exposed for testing
  _store: sessionStore,
};
