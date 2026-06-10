/**
 * Marketel Funnel Telemetry v2.0 — LLM-Optimized Session Intelligence
 *
 * PURPOSE:
 *   Captures user behavior across landing, setup wizard, and CRM pages.
 *   Designed from the ground up for LLM analysis — not Hotjar-style replay.
 *
 * KEY DESIGN DECISIONS:
 *   ✗ NO mouse_move tracking      (saves ~7,200 events per 30-min session)
 *   ✗ NO scroll_position tracking  (saves ~3,600 events per 30-min session)
 *   ✗ NO mouse_stopped heartbeat   (saves hundreds of noise events)
 *   ✓ Two-tier events: SIGNALS (LLM sees) + BREADCRUMBS (stored, filtered)
 *   ✓ Client-side session digest with human-readable narrative
 *   ✓ Trigger flags that gate whether LLM analysis is warranted
 *   ✓ Idle & lingering detection with duration annotations
 *   ✓ Time-gap awareness between major events
 *
 * TYPICAL 30-MIN SESSION:
 *   v1: ~11,000 events → v2: ~80–200 events (99% noise reduction)
 *
 * USAGE:
 *   <script src="/marketel-telemetry.js"></script>
 *   (paste before </body> on each page)
 *
 * PUBLIC API:
 *   window._mkt.track(type, data)    — push a custom event
 *   window._mkt.flush()              — force-send buffered events
 *   window._mkt.digest()             — get current session digest (for debugging)
 *   window._mkt.triggers()           — evaluate current trigger flags
 *   window._mkt.sessionId            — current session ID
 *   window._mkt.userId               — persistent user ID
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  var CFG = {
    endpoint:             '/api/telemetry',
    flushIntervalMs:      10000,       // batch-send events every 10 s
    flushOnQuietMs:       5000,        // flush after 5 s of no new events
    maxBuffer:            100,         // force-flush at this size

    // Rage / dead click
    rageWindowMs:         800,         // ≥ 3 clicks within this window
    rageMinCount:         3,
    deadClickDelayMs:     150,         // DOM-change check delay

    // Scroll — milestones only
    scrollMilestones:     [10, 25, 50, 75, 90, 100],
    reversalMinPct:       10,          // back ≥ 10 % = reversal

    // Idle detection
    idleThresholdMs:      30000,       // 30 s no interaction → idle

    // Lingering detection (per funnel step)
    lingerThresholdMs:    60000,       // > 60 s on one step → noteworthy

    // Narrative
    maxNarrativeEntries:  300,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  SESSION IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════

  var SESSION_ID = (function () {
    var s = sessionStorage.getItem('mkt_sid');
    if (!s) {
      s = 'S' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('mkt_sid', s);
    }
    return s;
  })();

  var USER_ID = (function () {
    var u = localStorage.getItem('mkt_uid');
    if (!u) {
      u = 'U' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem('mkt_uid', u);
    }
    return u;
  })();

  var PAGE = (function () {
    var p = window.location.pathname;
    if (p.startsWith('/setup'))      return 'setup';
    if (p.startsWith('/frontdesk'))  return 'frontdesk';
    if (p === '/' || p.startsWith('/landing')) return 'landing';
    return p.replace(/^\//, '') || 'unknown';
  })();

  var PAGE_LOAD_TS  = performance.now();
  var SESSION_WALL  = Date.now();

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEVICE / VIEWPORT CONTEXT  (captured once per page)
  // ═══════════════════════════════════════════════════════════════════════════

  var params = new URLSearchParams(window.location.search);
  var CTX = {
    ua:          navigator.userAgent,
    vp:          { w: window.innerWidth, h: window.innerHeight },
    scr:         { w: screen.width, h: screen.height },
    dpr:         window.devicePixelRatio || 1,
    touch:       'ontouchstart' in window || navigator.maxTouchPoints > 0,
    fbBrowser:   /FBAN|FBAV|FB_IAB|Instagram|BytedanceWebview/.test(navigator.userAgent),
    ios:         /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    android:     /android/i.test(navigator.userAgent),
    conn:        navigator.connection
                   ? { eff: navigator.connection.effectiveType, dl: navigator.connection.downlink, rtt: navigator.connection.rtt }
                   : null,
    ref:         document.referrer,
    url:         window.location.href,
    fbclid:      params.get('fbclid')       || null,
    utm_src:     params.get('utm_source')    || null,
    utm_med:     params.get('utm_medium')    || null,
    utm_camp:    params.get('utm_campaign')  || null,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  TWO-TIER EVENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  //
  //  SIGNAL  — semantic, high-value. LLM always sees these.
  //  CRUMB   — supporting context, stored server-side but excluded from digest.
  //
  //  The set below defines which event types are signals; everything else
  //  defaults to breadcrumb.

  var SIGNAL_TYPES = [
    'page_view', 'page_load', 'page_exit',
    'click', 'rage_click', 'dead_click',
    'field_focus', 'field_blur', 'form_submit',
    'scroll_milestone', 'scroll_reversal',
    'js_error', 'unhandled_promise', 'api_error', 'network_error',
    'setup_step_view', 'landing_cta_click', 'landing_email_focus', 'landing_email_blur',
    'idle_start', 'idle_end',
    'tab_away', 'tab_return',
    'step_linger',
    'text_copied', 'text_pasted',
    'video_play', 'video_pause', 'video_ended',
  ];
  var _sigSet = {};
  SIGNAL_TYPES.forEach(function (t) { _sigSet[t] = 1; });

  // ═══════════════════════════════════════════════════════════════════════════
  //  SESSION-LEVEL ACCUMULATORS  (fed into the exit digest)
  // ═══════════════════════════════════════════════════════════════════════════

  var stats = {
    rageClicks:       0,
    deadClicks:       0,
    jsErrors:         0,
    apiErrors:        0,
    netErrors:        0,
    scrollReversals:  0,
    maxScrollPct:     0,
    maxStep:          0,
    completedFunnel:  false,
    formSubmits:      0,
    fieldInteractions:0,
    clicks:           0,
    stepsVisited:     [],
    lingerEvents:     [],   // [{step, durationMs}]
    errors:           [],   // [{type, message, …}]
    apiFails:         [],   // [{url, status}]
    totalIdleMs:      0,
    totalHiddenMs:    0,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  BUFFER + FLUSH
  // ═══════════════════════════════════════════════════════════════════════════

  var buffer        = [];
  var flushTimer    = null;
  var quietTimer    = null;

  function relMs() {
    return Math.round(performance.now() - PAGE_LOAD_TS);
  }

  // ── Narrative log (lightweight timeline for the digest) ────────────────
  var narrativeLog = [];

  function addNarrative(r, emoji, text) {
    if (narrativeLog.length < CFG.maxNarrativeEntries) {
      narrativeLog.push({ r: r, e: emoji || '', t: text });
    }
  }

  // ── Main push function ─────────────────────────────────────────────────
  function push(type, data, forceTier) {
    var tier = forceTier || (_sigSet[type] ? 'signal' : 'crumb');
    var r    = relMs();
    var evt  = { t: type, s: SESSION_ID, u: USER_ID, p: PAGE, w: Date.now(), r: r, tier: tier };

    // Merge data keys
    if (data) {
      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) evt[keys[i]] = data[keys[i]];
    }

    buffer.push(evt);

    // Auto-record narrative for signal-tier events
    if (tier === 'signal') {
      var narr = narrateEvent(type, data || {});
      if (narr) addNarrative(r, narr.emoji, narr.text);
    }

    if (buffer.length >= CFG.maxBuffer) flushNow();
    resetQuietTimer();
  }

  function resetQuietTimer() {
    clearTimeout(quietTimer);
    quietTimer = setTimeout(flushNow, CFG.flushOnQuietMs);
  }

  function flushNow() {
    if (!buffer.length) return;
    var payload = buffer.splice(0);
    try {
      fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: SESSION_ID, uid: USER_ID, events: payload }),
        keepalive: true,
      }).catch(function () { /* telemetry must never break the page */ });
    } catch (_) { /* swallow */ }
  }

  flushTimer = setInterval(flushNow, CFG.flushIntervalMs);

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    var parts = [];
    var cur   = el;
    for (var i = 0; i < 4 && cur && cur !== document.body; i++) {
      var part = cur.tagName.toLowerCase();
      if (cur.id) {
        part += '#' + cur.id;
      } else if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.trim().split(/\s+/).slice(0, 3).join('.');
        if (cls) part += '.' + cls;
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function getLabel(el) {
    if (!el) return '';
    return (el.getAttribute('aria-label') || el.getAttribute('data-label') ||
            el.getAttribute('placeholder') || el.textContent || '').trim().slice(0, 80);
  }

  function fmtMs(ms) {
    if (ms == null) return '?';
    if (ms < 1000) return ms + 'ms';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    var rs = s % 60;
    return m + 'm' + (rs ? rs + 's' : '');
  }

  function fmtTimestamp(r) {
    var sec = Math.floor(r / 1000);
    var m   = Math.floor(sec / 60);
    var s   = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  NARRATIVE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════
  //  Converts each signal event into a short human-readable string.
  //  Only notable interactions make it into the narrative — plain clicks
  //  on non-interactive elements are skipped to keep it focused.

  function narrateEvent(type, d) {
    switch (type) {
      case 'page_view':
        var src = d.ctx && d.ctx.utm_src ? d.ctx.utm_src
                : d.ctx && d.ctx.fbclid  ? 'facebook_ad'
                : d.ctx && d.ctx.ref     ? 'referral (' + new URL(d.ctx.ref).hostname + ')'
                : 'direct';
        var dev = d.ctx
          ? (d.ctx.ios ? 'iOS' : d.ctx.android ? 'Android' : 'Desktop')
            + (d.ctx.fbBrowser ? ', FB in-app browser' : '')
          : '';
        return { emoji: '🔵', text: 'Landed on /' + (d.ctx && d.ctx.url ? new URL(d.ctx.url).pathname.replace(/^\//, '') : PAGE) + ' (' + dev + ', ' + src + ')' };

      case 'click':
        // Only narrate clicks on buttons, links, or labelled elements
        if (d.isButton || d.href || (d.label && d.label.length > 2)) {
          return { emoji: '', text: 'Clicked "' + (d.label || d.selector) + '"' };
        }
        return null;

      case 'rage_click':
        return { emoji: '🔴', text: 'RAGE CLICKED "' + (d.label || d.selector) + '" (' + d.count + ' rapid clicks)' };

      case 'dead_click':
        return { emoji: '🔴', text: 'DEAD CLICK on "' + (d.label || d.selector) + '" (no response)' };

      case 'field_focus':
        return { emoji: '', text: 'Started filling "' + d.field + '" field' };

      case 'field_blur':
        // Only narrate if notable (long time, cleared, or left empty)
        if (d.timeSpentMs > 5000 || d.wasCleared || d.isEmpty) {
          var note = d.wasCleared ? ' (cleared it)' : d.isEmpty ? ' (left empty)' : '';
          return { emoji: '⏱️', text: 'Spent ' + fmtMs(d.timeSpentMs) + ' on "' + d.field + '"' + note };
        }
        return null;

      case 'form_submit':
        return { emoji: '✅', text: 'Submitted form' + (d.formId ? ' "' + d.formId + '"' : '') + ' (' + d.fieldCount + ' fields, took ' + fmtMs(d.timeToSubmitMs) + ')' };

      case 'scroll_milestone':
        return { emoji: '', text: 'Scrolled to ' + d.pct + '% of page' };

      case 'scroll_reversal':
        return { emoji: '🔄', text: 'Scrolled back from ' + d.fromPct + '% to ' + d.toPct + '% (confusion signal)' };

      case 'js_error':
        return { emoji: '🔴', text: 'JS ERROR: ' + d.message };

      case 'unhandled_promise':
        return { emoji: '🔴', text: 'PROMISE REJECTION: ' + d.reason };

      case 'api_error':
        return { emoji: '🔴', text: 'API ERROR: ' + (d.method || 'GET') + ' ' + d.url + ' → ' + d.status + ' (' + d.durMs + 'ms)' };

      case 'network_error':
        return { emoji: '🔴', text: 'NETWORK FAILURE: ' + d.url + ' — ' + d.error };

      case 'setup_step_view':
        return { emoji: '📍', text: 'Entered setup step ' + d.step };

      case 'landing_cta_click':
        return { emoji: '🟢', text: 'Clicked CTA button' + (d.emailEntered ? ' (email entered)' : ' (no email yet)') };

      case 'landing_email_focus':
        return { emoji: '', text: 'Focused email input on landing page' };

      case 'landing_email_blur':
        return { emoji: '', text: 'Left email input' + (d.hasValue ? ' (has value)' : ' (empty)') };

      case 'idle_start':
        return { emoji: '⏸️', text: 'Went idle (no interaction for 30 s)' };

      case 'idle_end':
        return { emoji: '▶️', text: 'Resumed after ' + d.idleDuration + ' idle' };

      case 'tab_away':
        return { emoji: '👋', text: 'Switched away from tab' };

      case 'tab_return':
        return { emoji: '👋', text: 'Returned to tab after ' + d.hiddenDuration };

      case 'step_linger':
        return { emoji: '⚠️', text: 'LINGERED on ' + d.step + ' for ' + d.duration };

      case 'text_copied':
        return { emoji: '📋', text: 'Copied text: "' + d.preview + '"' };

      case 'text_pasted':
        return { emoji: '📋', text: 'Pasted into "' + (d.field || 'unknown') + '"' };

      case 'video_play':
        return { emoji: '▶️', text: 'Started video' + (d.src ? ' (' + d.src + ')' : '') };

      case 'video_pause':
        return { emoji: '⏸️', text: 'Paused video at ' + d.currentTime + 's' };

      case 'video_ended':
        return { emoji: '🏁', text: 'Finished video' };

      case 'page_exit':
        return { emoji: '🚪', text: 'Exited page (active ' + fmtMs(d.activeMs) + ', max scroll ' + d.maxScrollPct + '%)' };

      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. PAGE VIEW & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════

  push('page_view', {
    ctx:        CTX,
    historyLen: history.length,
  });

  window.addEventListener('load', function () {
    var nav = performance.getEntriesByType('navigation')[0];
    push('page_load', {
      loadMs: Math.round(performance.now() - PAGE_LOAD_TS),
      dcl:    nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      ttfb:   nav ? Math.round(nav.responseStart) : null,
      fcp:    (function () {
        var e = performance.getEntriesByName('first-contentful-paint')[0];
        return e ? Math.round(e.startTime) : null;
      })(),
    });
  });

  // Web Vitals — breadcrumbs (only notable CLS makes it)
  try {
    new PerformanceObserver(function (list) {
      var e = list.getEntries().at(-1);
      if (e) push('lcp', {
        ms:  Math.round(e.startTime),
        el:  e.element ? e.element.tagName + (e.element.id ? '#' + e.element.id : '') : null,
      }, 'crumb');
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  try {
    var cls = 0;
    new PerformanceObserver(function (list) {
      for (var i = 0; i < list.getEntries().length; i++) {
        var e = list.getEntries()[i];
        if (!e.hadRecentInput) cls += e.value;
      }
      if (cls > 0.1) push('cls_bad', { cls: Math.round(cls * 1000) / 1000 }, 'crumb');
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. SCROLL — Milestones + Reversals ONLY  (zero continuous tracking)
  // ═══════════════════════════════════════════════════════════════════════════

  var lastScrollPct  = 0;
  var milestonesHit  = {};
  var scrollThrottle = null;

  function scrollPct() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / scrollable) * 100));
  }

  window.addEventListener('scroll', function () {
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(function () {
      scrollThrottle = null;
      var pct = scrollPct();
      if (pct > stats.maxScrollPct) stats.maxScrollPct = pct;

      // Milestones
      for (var i = 0; i < CFG.scrollMilestones.length; i++) {
        var m = CFG.scrollMilestones[i];
        if (pct >= m && !milestonesHit[m]) {
          milestonesHit[m] = true;
          push('scroll_milestone', { pct: m });
        }
      }

      // Reversals
      if (pct < lastScrollPct - CFG.reversalMinPct) {
        stats.scrollReversals++;
        push('scroll_reversal', { fromPct: lastScrollPct, toPct: pct });
      }

      lastScrollPct = pct;
    }, 300);
  }, { passive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. CLICK TRACKING  (rage + dead detection, ZERO mouse tracking)
  // ═══════════════════════════════════════════════════════════════════════════

  var recentClicks = [];

  document.addEventListener('click', function (e) {
    var el    = e.target;
    var x     = Math.round(e.clientX);
    var y     = Math.round(e.clientY);
    var sel   = getSelector(el);
    var label = getLabel(el);
    var now   = Date.now();

    stats.clicks++;

    push('click', {
      x: x, y: y,
      selector: sel,
      label:    label,
      tag:      el.tagName.toLowerCase(),
      href:     el.href || (el.closest && el.closest('a') ? el.closest('a').href : null) || null,
      isButton: el.tagName === 'BUTTON' || el.type === 'submit' || el.role === 'button',
    });

    // ── Rage Click ──
    recentClicks = recentClicks.filter(function (c) { return now - c.ts < CFG.rageWindowMs; });
    recentClicks.push({ ts: now, x: x, y: y });
    var nearby = recentClicks.filter(function (c) { return Math.abs(c.x - x) < 60 && Math.abs(c.y - y) < 60; });
    if (nearby.length >= CFG.rageMinCount) {
      stats.rageClicks++;
      push('rage_click', { x: x, y: y, selector: sel, label: label, count: nearby.length });
      recentClicks = [];
    }

    // ── Dead Click ──
    var snapBefore = document.activeElement ? document.activeElement.id : null;
    var urlBefore  = window.location.href;
    setTimeout(function () {
      var snapAfter  = document.activeElement ? document.activeElement.id : null;
      var urlChanged = window.location.href !== urlBefore;
      var noResponse = snapBefore === snapAfter && !urlChanged;
      if (noResponse && ['INPUT','TEXTAREA','SELECT'].indexOf(el.tagName) === -1) {
        var st = window.getComputedStyle(el);
        if (st.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A') {
          stats.deadClicks++;
          push('dead_click', { x: x, y: y, selector: sel, label: label });
        }
      }
    }, CFG.deadClickDelayMs);
  }, true);

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. FORM & INPUT TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  var inputStartTimes = new WeakMap();
  var inputValues     = new WeakMap();
  var formStartTime   = null;
  var INPUT_TAGS      = ['INPUT', 'TEXTAREA', 'SELECT'];

  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (INPUT_TAGS.indexOf(el.tagName) === -1) return;
    if (!formStartTime) formStartTime = Date.now();
    inputStartTimes.set(el, Date.now());
    stats.fieldInteractions++;
    push('field_focus', {
      field: el.id || el.name || el.placeholder || el.type || 'unknown',
      type:  el.type || el.tagName.toLowerCase(),
    });
  }, true);

  document.addEventListener('focusout', function (e) {
    var el = e.target;
    if (INPUT_TAGS.indexOf(el.tagName) === -1) return;
    var start      = inputStartTimes.get(el);
    var timeSpent  = start ? Date.now() - start : null;
    var prev       = inputValues.get(el) || '';
    var cur        = el.value || '';

    push('field_blur', {
      field:       el.id || el.name || el.placeholder || el.type || 'unknown',
      type:        el.type || el.tagName.toLowerCase(),
      timeSpentMs: timeSpent,
      charCount:   cur.length,
      wasEdited:   cur !== prev,
      wasCleared:  !!prev && !cur,
      isEmpty:     !cur,
      // Actual values are NEVER logged — only structural signals
    });
    inputValues.set(el, cur);
  }, true);

  // Keystroke activity — breadcrumb, batched every 10 keystrokes
  var keystrokeCounts = new WeakMap();
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
    var count = (keystrokeCounts.get(el) || 0) + 1;
    keystrokeCounts.set(el, count);
    if (count % 10 === 0) {
      push('field_typing', {
        field:      el.id || el.name || 'unknown',
        keystrokes: count,
        charCount:  el.value.length,
      }, 'crumb');
    }
  }, { passive: true });

  // Form submission
  document.addEventListener('submit', function (e) {
    var form        = e.target;
    var timeToSubmit = formStartTime ? Date.now() - formStartTime : null;
    stats.formSubmits++;
    push('form_submit', {
      formId:         form.id || null,
      action:         form.action || null,
      method:         form.method || 'get',
      timeToSubmitMs: timeToSubmit,
      fieldCount:     form.querySelectorAll('input, textarea, select').length,
    });
  }, true);

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. COPY / PASTE
  // ═══════════════════════════════════════════════════════════════════════════

  document.addEventListener('copy', function (e) {
    var sel = window.getSelection();
    push('text_copied', {
      preview:  sel ? sel.toString().slice(0, 40) : '',
      selector: getSelector(e.target),
    });
  });

  document.addEventListener('paste', function (e) {
    push('text_pasted', { field: e.target.id || e.target.name || null });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. TAB VISIBILITY — with Duration  (replaces noisy page_visible/hidden)
  // ═══════════════════════════════════════════════════════════════════════════

  var hiddenAt = null;

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      hiddenAt = Date.now();
      push('tab_away', { scrollPct: scrollPct() });
    } else {
      var dur = hiddenAt ? Date.now() - hiddenAt : 0;
      stats.totalHiddenMs += dur;
      hiddenAt = null;
      push('tab_return', {
        hiddenDurationMs: dur,
        hiddenDuration:   fmtMs(dur),
        totalHiddenMs:    stats.totalHiddenMs,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. IDLE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  //  Fires idle_start / idle_end with human-readable duration.
  //  An idle period ≠ "tab away" — the user may be staring at the screen.

  var idleTimer    = null;
  var isIdle       = false;
  var idleStartAt  = null;
  var activeMs     = 0;

  function onActivity() {
    if (isIdle) {
      var dur = Date.now() - idleStartAt;
      stats.totalIdleMs += dur;
      isIdle = false;
      push('idle_end', {
        idleDurationMs: dur,
        idleDuration:   fmtMs(dur),
        totalIdleMs:    stats.totalIdleMs,
      });
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      isIdle      = true;
      idleStartAt = Date.now();
      push('idle_start', { scrollPct: scrollPct() });
    }, CFG.idleThresholdMs);
  }

  // Active-time accumulator (1 s ticks)
  setInterval(function () {
    if (!isIdle && !document.hidden) activeMs += 1000;
  }, 1000);

  ['click', 'scroll', 'keydown', 'touchstart', 'mousemove'].forEach(function (ev) {
    window.addEventListener(ev, onActivity, { passive: true });
  });
  onActivity(); // start the first idle timer

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. FUNNEL STEP TRACKING — with Lingering Detection
  // ═══════════════════════════════════════════════════════════════════════════

  var currentStep   = null;
  var stepEnteredAt = null;

  function onStepChange(stepId) {
    var now = Date.now();

    // Close out previous step — check for lingering
    if (currentStep && stepEnteredAt) {
      var dur = now - stepEnteredAt;
      if (dur > CFG.lingerThresholdMs) {
        stats.lingerEvents.push({ step: currentStep, durationMs: dur });
        push('step_linger', {
          step:     currentStep,
          durationMs: dur,
          duration: fmtMs(dur),
        });
      }
    }

    // Record new step
    var num = parseInt((stepId || '').replace('step-', ''), 10) || 0;
    if (num > stats.maxStep) stats.maxStep = num;
    if (stats.stepsVisited.indexOf(stepId) === -1) stats.stepsVisited.push(stepId);
    if (num >= 5) stats.completedFunnel = true;

    currentStep   = stepId;
    stepEnteredAt = now;

    push('setup_step_view', { step: num, stepId: stepId });
  }

  function hookSetupWizard() {
    var steps = document.querySelectorAll('.step');
    if (!steps.length) return;

    var initial = document.querySelector('.step.active');
    if (initial) onStepChange(initial.id);

    var obs = new MutationObserver(function () {
      var active = document.querySelector('.step.active');
      if (active && active.id !== currentStep) onStepChange(active.id);
    });
    steps.forEach(function (s) { obs.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  }

  // ── Landing Page CTA Hooks ─────────────────────────────────────────────
  function hookLandingCta() {
    var input = document.getElementById('setupEmail');
    var btn   = document.querySelector('.cta-btn');
    if (input) {
      var touched = false;
      input.addEventListener('focus', function () {
        if (!touched) push('landing_email_focus', {});
        touched = true;
      });
      input.addEventListener('blur', function () {
        push('landing_email_blur', { hasValue: !!input.value.trim(), charCount: input.value.length });
      });
    }
    if (btn) {
      btn.addEventListener('click', function () {
        var email = document.getElementById('setupEmail');
        push('landing_cta_click', { emailEntered: !!(email && email.value.trim()) });
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  9. ERROR TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  window.addEventListener('error', function (e) {
    stats.jsErrors++;
    var err = {
      message: e.message,
      source:  e.filename ? e.filename.split('/').slice(-2).join('/') : null,
      line:    e.lineno,
      col:     e.colno,
      stack:   e.error && e.error.stack ? e.error.stack.slice(0, 400) : null,
    };
    stats.errors.push(err);
    push('js_error', err);
  });

  window.addEventListener('unhandledrejection', function (e) {
    stats.jsErrors++;
    var err = { reason: String(e.reason || '').slice(0, 200) };
    stats.errors.push(err);
    push('unhandled_promise', err);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  10. API TRACKING — Monkey-patched fetch
  // ═══════════════════════════════════════════════════════════════════════════

  var origFetch = window.fetch;
  window.fetch = function (url, opts) {
    var start  = Date.now();
    var urlStr = String(url);

    // Skip the telemetry endpoint itself
    if (urlStr.indexOf('/api/telemetry') !== -1) {
      return origFetch.apply(this, arguments);
    }

    return origFetch.apply(this, arguments).then(function (res) {
      var durMs = Date.now() - start;
      var funnel = ['/api/setup', '/api/availability', '/api/book', '/api/crm', '/api/hotel', '/api/funnel']
        .some(function (p) { return urlStr.indexOf(p) !== -1; });

      if (funnel) {
        var method = (opts && opts.method || 'GET').toUpperCase();
        // Successful calls → breadcrumb
        push('api_call', {
          url: urlStr.split('?')[0], status: res.status, durMs: durMs, method: method,
        }, 'crumb');

        // Failed calls → SIGNAL
        if (!res.ok) {
          stats.apiErrors++;
          var fail = { url: urlStr.split('?')[0], status: res.status, durMs: durMs, method: method };
          stats.apiFails.push(fail);
          push('api_error', fail);
        }
      }
      return res;
    }).catch(function (err) {
      stats.netErrors++;
      push('network_error', { url: urlStr.split('?')[0], error: err.message });
      throw err;
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  11. VIDEO TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  function hookVideos() {
    document.querySelectorAll('video').forEach(function (el) {
      el.addEventListener('play',  function () { push('video_play',  { src: el.src ? el.src.split('/').slice(-1)[0] : null }); });
      el.addEventListener('pause', function () { push('video_pause', { currentTime: Math.round(el.currentTime) }); });
      el.addEventListener('ended', function () { push('video_ended', {}); });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  12. ELEMENT VISIBILITY — IntersectionObserver for Funnel Landmarks
  // ═══════════════════════════════════════════════════════════════════════════
  //  These are breadcrumbs — the step_view signals are the real funnel events.

  var OBSERVE_SELS = [
    '.cta-box', '.cta-btn', '.hero', '.demo-section',
    '#step-1', '#step-2', '#step-3', '#step-4', '#step-5',
    '#loginScreen', '#app', '.booking-card',
    'button[type="submit"]', '.btn-primary',
  ];

  var observedEls = new Map();

  function setupVisibilityObserver() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el  = entry.target;
        var sel = getSelector(el);
        if (entry.isIntersecting) {
          observedEls.set(el, Date.now());
          push('element_visible', { selector: sel, label: getLabel(el) }, 'crumb');
        } else if (observedEls.has(el)) {
          var vis = Date.now() - observedEls.get(el);
          observedEls.delete(el);
          if (vis > 3000) {
            push('element_viewed', { selector: sel, visibleForMs: vis, visibleFor: fmtMs(vis) }, 'crumb');
          }
        }
      });
    }, { threshold: 0.5 });

    OBSERVE_SELS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { observer.observe(el); });
    });

    // Dynamic elements via MutationObserver
    var mutObs = new MutationObserver(function (muts) {
      muts.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          OBSERVE_SELS.forEach(function (sel) {
            if (node.matches && node.matches(sel)) observer.observe(node);
            if (node.querySelectorAll) node.querySelectorAll(sel).forEach(function (el) { observer.observe(el); });
          });
        });
      });
    });
    mutObs.observe(document.body, { childList: true, subtree: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  13. VIEWPORT RESIZE — breadcrumb
  // ═══════════════════════════════════════════════════════════════════════════

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      push('viewport_resize', {
        w: window.innerWidth, h: window.innerHeight,
        prev: { w: CTX.vp.w, h: CTX.vp.h },
      }, 'crumb');
      CTX.vp = { w: window.innerWidth, h: window.innerHeight };
    }, 300);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  14. TRIGGER EVALUATOR
  // ═══════════════════════════════════════════════════════════════════════════
  //  Determines if this session warrants LLM analysis.  If shouldAnalyze
  //  is false, the agent pipeline can skip this session entirely.

  function evaluateTriggers() {
    var reasons = [];

    if (stats.rageClicks > 0)                                   reasons.push('rage_click_detected');
    if (stats.deadClicks > 0)                                   reasons.push('dead_click_detected');
    if (stats.jsErrors > 0)                                     reasons.push('js_error');
    if (stats.apiErrors > 0)                                    reasons.push('api_error');
    if (stats.netErrors > 0)                                    reasons.push('network_error');
    if (stats.scrollReversals > 3)                              reasons.push('excessive_scroll_reversals');
    if (PAGE === 'setup' && !stats.completedFunnel)             reasons.push('dropped_before_completion');
    if (stats.totalIdleMs > 300000)                             reasons.push('idle_over_5min');
    if (stats.totalHiddenMs > 300000)                           reasons.push('tabbed_away_over_5min');
    if (stats.lingerEvents.length > 0)                          reasons.push('step_lingering');

    var totalMs = Date.now() - SESSION_WALL;
    if (totalMs > 600000 && !stats.completedFunnel && PAGE === 'setup') {
      reasons.push('long_session_no_conversion');
    }

    return {
      shouldAnalyze: reasons.length > 0,
      reasons:       reasons,
      severity:      reasons.length >= 3 ? 'high' : reasons.length >= 1 ? 'medium' : 'low',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  15. SESSION DIGEST — the entire payload an LLM will consume
  // ═══════════════════════════════════════════════════════════════════════════

  function generateDigest() {
    var totalMs  = Date.now() - SESSION_WALL;
    var triggers = evaluateTriggers();

    // Readable device string
    var device = (CTX.ios ? 'iOS' : CTX.android ? 'Android' : 'Desktop')
               + (CTX.fbBrowser ? ', FB In-App Browser' : '')
               + ' ' + CTX.vp.w + '×' + CTX.vp.h;

    var source = CTX.utm_src || (CTX.fbclid ? 'facebook_ad' : CTX.ref ? 'referral' : 'direct');

    // Sort narrative chronologically and format
    narrativeLog.sort(function (a, b) { return a.r - b.r; });
    var narrative = narrativeLog.map(function (n) {
      return fmtTimestamp(n.r) + ' ' + (n.e ? n.e + ' ' : '— ') + n.t;
    });

    return {
      sessionId: SESSION_ID,
      userId:    USER_ID,
      page:      PAGE,
      device:    device,
      source:    source,
      url:       CTX.url,
      referrer:  CTX.ref || null,

      timing: {
        totalMs:    totalMs,
        total:      fmtMs(totalMs),
        activeMs:   activeMs,
        active:     fmtMs(activeMs),
        idleMs:     stats.totalIdleMs,
        idle:       fmtMs(stats.totalIdleMs),
        hiddenMs:   stats.totalHiddenMs,
        hidden:     fmtMs(stats.totalHiddenMs),
      },

      triggers: triggers,

      stats: {
        clicks:           stats.clicks,
        rageClicks:       stats.rageClicks,
        deadClicks:       stats.deadClicks,
        jsErrors:         stats.jsErrors,
        apiErrors:        stats.apiErrors,
        networkErrors:    stats.netErrors,
        scrollReversals:  stats.scrollReversals,
        maxScrollPct:     stats.maxScrollPct,
        formSubmits:      stats.formSubmits,
        fieldInteractions:stats.fieldInteractions,
      },

      funnel: {
        maxStepReached: stats.maxStep,
        stepsVisited:   stats.stepsVisited,
        completed:      stats.completedFunnel,
        lingerEvents:   stats.lingerEvents.map(function (e) {
          return { step: e.step, duration: fmtMs(e.durationMs), durationMs: e.durationMs };
        }),
      },

      errors:     stats.errors.slice(0, 10),
      apiFailures:stats.apiFails.slice(0, 10),

      narrative: narrative,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  16. PAGE EXIT — Send Digest + Remaining Buffer via Beacon
  // ═══════════════════════════════════════════════════════════════════════════

  var exitSent = false;

  function sendExit() {
    if (exitSent) return;
    exitSent = true;

    // Close out current step lingering
    if (currentStep && stepEnteredAt) {
      var dur = Date.now() - stepEnteredAt;
      if (dur > CFG.lingerThresholdMs) {
        stats.lingerEvents.push({ step: currentStep, durationMs: dur });
        push('step_linger', { step: currentStep, durationMs: dur, duration: fmtMs(dur) });
      }
    }

    // Close out idle
    if (isIdle && idleStartAt) {
      stats.totalIdleMs += Date.now() - idleStartAt;
    }

    // Close out hidden
    if (hiddenAt) {
      stats.totalHiddenMs += Date.now() - hiddenAt;
    }

    // Push exit event
    push('page_exit', {
      activeMs:       activeMs,
      totalHiddenMs:  stats.totalHiddenMs,
      maxScrollPct:   stats.maxScrollPct,
      finalScrollPct: scrollPct(),
    });

    // Generate digest
    var digest = CFG.digestOnExit ? generateDigest() : null;

    // Ship everything
    var payload = JSON.stringify({
      sid:    SESSION_ID,
      uid:    USER_ID,
      events: buffer.splice(0),
      digest: digest,
    });

    // sendBeacon is the only reliable way to send data on page exit
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CFG.endpoint, payload);
    } else {
      // Fallback: sync XHR (blocking, but last resort)
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CFG.endpoint, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      } catch (_) {}
    }
  }

  window.addEventListener('pagehide',    sendExit);
  window.addEventListener('beforeunload', sendExit);

  // ═══════════════════════════════════════════════════════════════════════════
  //  17. INIT — Hook Page-Specific Behaviors on DOMContentLoaded
  // ═══════════════════════════════════════════════════════════════════════════

  function initPage() {
    push('dom_ready', { domNodes: document.querySelectorAll('*').length }, 'crumb');
    hookLandingCta();
    hookSetupWizard();
    hookVideos();
    setupVisibilityObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  18. PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  window._mkt = {
    track:     push,
    flush:     flushNow,
    digest:    generateDigest,
    triggers:  evaluateTriggers,
    sessionId: SESSION_ID,
    userId:    USER_ID,
    stats:     stats,
    version:   '2.0',
  };

})();
