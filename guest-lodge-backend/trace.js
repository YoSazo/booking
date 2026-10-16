'use strict';
// Marketel Trace: point the phone at paper, follow the lines of a picture laid
// over the camera. A consumer test sold once ($14.99, no subscription) from a
// Meta ad. Everything about the picture happens on the phone: no photo, camera
// frame or drawing ever reaches this server. The server only sells the unlock,
// confirms it, and records anonymous steps for the funnel.
//
// There is no account and no new table. A paid Checkout Session is the
// purchase; the unlock token is that session's id signed with a server secret,
// kept on the phone and emailed to the buyer so another phone (or a cleared
// browser) can unlock again.
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const { sanitizeInspectAttribution } = require('./inspect');

const TRACE = Object.freeze({
  product: 'trace',
  name: 'Marketel Trace',
  priceCents: 1499,
  currency: 'usd',
  descriptorSuffix: 'TRACE',
  supportEmail: 'support@bookmarketel.com',
});

// Anonymous steps a visitor can take. Names only, with at most a short
// lowercase detail: never a picture, a file name or anything typed.
const TRACE_EVENTS = Object.freeze([
  'TraceLanded', 'TraceFrom', 'TraceBrowser',
  'TracePicked', 'TraceCameraAsked', 'TraceCameraDenied', 'TraceCameraHelpShown', 'TraceStarted',
  'TraceFaded', 'TraceLocked', 'TraceMoved', 'TraceTraced30', 'TraceTraced120', 'TraceDone',
  'TracePaywallShown', 'TracePaywallClosed', 'TraceCheckoutTapped', 'TraceCheckoutOpened', 'TraceCheckoutFailed',
  'TraceCheckoutCancelled', 'TraceUnlocked', 'TraceRestoreAsked',
]);

// What Meta may optimise for. Starting to trace (camera on, picture over it) is
// the first deliberate act; a Checkout ready to pay is the checkout signal. The
// purchase itself is sent from /unlock, where the payment is confirmed.
const TRACE_SIGNALS = Object.freeze({
  TraceStarted: { event: 'ViewContent', id: 'trace-started' },
  TraceCheckoutOpened: { event: 'InitiateCheckout', id: 'trace-checkout', value: TRACE.priceCents / 100 },
});

const visitorOf = value => (/^v_[A-Za-z0-9]{8,40}$/.test(String(value || '')) ? String(value) : null);
const detailOf = value => (/^[a-z][a-z0-9_-]{0,23}$/.test(String(value || '')) ? String(value) : null);
const sessionIdOf = value => (/^cs_(?:live|test)_[A-Za-z0-9]{8,240}$/.test(String(value || '')) ? String(value) : null);
const emailOf = value => {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};
const fail = (status, message) => Object.assign(new Error(message), { status });

function unlockSignature(secret, sessionId) {
  return crypto.createHmac('sha256', secret).update(`trace-unlock:${sessionId}`).digest('base64url').slice(0, 32);
}
function unlockToken(secret, sessionId) {
  return `${sessionId}.${unlockSignature(secret, sessionId)}`;
}
// The session id a valid token was signed for, or null.
function verifyUnlock(secret, token) {
  const [sessionId, signature, extra] = String(token || '').split('.');
  if (extra !== undefined || !sessionIdOf(sessionId) || !signature) return null;
  const expected = Buffer.from(unlockSignature(secret, sessionId));
  const given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected) ? sessionId : null;
}

// A paid Checkout Session for this product, and only that, is a purchase.
const isTracePurchase = session => !!session && session.metadata?.product === TRACE.product
  && session.mode === 'payment' && session.payment_status === 'paid';

const WEB_ROOT = path.join(__dirname, 'trace-web');

// The page needs the camera and nothing else. Payment happens on Stripe's own
// page, so no Stripe script or frame runs here.
function tracePageHeaders(res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://www.clarity.ms https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.clarity.ms https://c.bing.com; media-src 'self' blob: mediastream:; connect-src 'self' https://*.clarity.ms https://c.bing.com; worker-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
}

function registerTrace(app, {
  prisma,
  stripe,
  mail,
  queueCapi = null,
  capiConfigured = false,
  isCapiExcludedEmail = () => false,
  env = process.env,
}) {
  const origin = String(env.TRACE_PUBLIC_ORIGIN || env.INSPECT_PUBLIC_ORIGIN || 'https://bookmarketel.com').replace(/\/+$/, '');
  const secret = env.TRACE_UNLOCK_SECRET || env.INSPECT_AUTH_SECRET || '';
  const guarded = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const ownerBrowser = req => String(req?.headers?.['x-marketel-no-track'] || '') === '1';
  const automatedBrowser = req => /HeadlessChrome|bot\b|crawler|spider|Playwright/i.test(String(req?.headers?.['user-agent'] || ''));
  const hits = new Map();
  const rate = (key, maximum, windowMs) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter(at => now - at < windowMs);
    if (recent.length >= maximum) throw fail(429, 'Too many requests. Try again in a little while.');
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, list] of hits) if (!list.some(at => now - at < windowMs)) hits.delete(k);
  };
  const record = async (name, { visitorId = null, detail = null, sourceId = null } = {}) => {
    const data = { name, tool: TRACE.product, visitorId, detail };
    if (sourceId) return prisma.inspectEvent.upsert({ where: { sourceId }, create: { ...data, sourceId }, update: {} });
    return prisma.inspectEvent.create({ data });
  };
  const meta = (attribution, req) => sanitizeInspectAttribution(attribution, req) || {};
  const sendCapi = (eventName, input) => {
    if (!capiConfigured || typeof queueCapi !== 'function') return Promise.resolve({ queued: false });
    return queueCapi(eventName, { product: 'trace-anything', currency: 'USD', contentName: TRACE.name, ...input })
      .catch(error => { console.error('Trace CAPI queue failed:', eventName, error.message); return { queued: false }; });
  };
  const unlockUrl = sessionId => `${origin}/trace?unlock=${encodeURIComponent(unlockToken(secret, sessionId))}`;
  const sendUnlockEmail = (to, sessionId) => mail.sendMail({
    from: `"Marketel" <${TRACE.supportEmail}>`,
    to,
    subject: 'Your Marketel Trace unlock',
    text: [
      `Thanks for buying ${TRACE.name}. It's yours for good: you paid once, there's no subscription and nothing renews.`,
      '',
      'To unlock it on another phone, or after clearing your browser, open this link on that phone:',
      unlockUrl(sessionId),
      '',
      `Something not working? Reply to this email or write to ${TRACE.supportEmail}.`,
    ].join('\n'),
  });

  // TRACE_ENABLED=false on Render takes the page and its API down without a deploy.
  const off = (req, res, next) => (env.TRACE_ENABLED === 'false' ? res.sendStatus(404) : next());
  app.use(['/trace', '/api/trace'], off);
  app.get(['/trace', '/trace/'], (req, res) => { tracePageHeaders(res); res.sendFile(path.join(WEB_ROOT, 'index.html')); });
  app.get('/trace/terms', (req, res) => { tracePageHeaders(res); res.sendFile(path.join(WEB_ROOT, 'terms.html')); });
  app.use('/trace', express.static(WEB_ROOT, { index: false, maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));

  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));

  router.post('/event', guarded(async (req, res) => {
    const name = req.body?.name;
    if (!TRACE_EVENTS.includes(name)) throw fail(400, 'Unknown event.');
    if (ownerBrowser(req) || automatedBrowser(req)) return res.json({ success: true, ignored: true });
    rate(`trace-event:${req.ip}`, 300, 3600000);
    const visitorId = visitorOf(req.body?.visitorId);
    await record(name, { visitorId, detail: detailOf(req.body?.detail) });
    const signal = TRACE_SIGNALS[name];
    if (signal && visitorId) {
      const attribution = meta(req.body?.attribution, req);
      await sendCapi(signal.event, {
        eventId: `${signal.id}.${visitorId}`,
        hotelId: `trace-visitor:${visitorId}`,
        externalId: `trace-visitor:${visitorId}`,
        ip: attribution.ipAddress || req.ip || '',
        userAgent: attribution.userAgent || req.headers['user-agent'] || '',
        sourceUrl: attribution.sourceUrl || `${origin}/trace`,
        fbp: attribution.fbp || '',
        fbc: attribution.fbc || '',
        ...(signal.value ? { value: signal.value } : {}),
      });
    }
    res.json({ success: true });
  }));

  router.post('/checkout', guarded(async (req, res) => {
    if (!stripe) throw fail(503, 'Payments are not available right now.');
    rate(`trace-checkout:${req.ip}`, 20, 3600000);
    const visitorId = visitorOf(req.body?.visitorId) || '';
    const attribution = meta(req.body?.attribution, req);
    const params = {
      mode: 'payment',
      submit_type: 'pay',
      // Cards only (Apple Pay and Google Pay are cards). A bank payment takes
      // days to clear, so the buyer would come back to a page that can't unlock.
      payment_method_types: ['card'],
      line_items: [{ quantity: 1, price_data: { currency: TRACE.currency, unit_amount: TRACE.priceCents,
        product_data: { name: `${TRACE.name}: yours for good`, description: 'Trace any picture onto paper. One payment. No subscription. Nothing renews.' } } }],
      success_url: `${origin}/trace?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/trace?cancelled=1`,
      payment_intent_data: { statement_descriptor_suffix: TRACE.descriptorSuffix, metadata: { product: TRACE.product } },
      metadata: { product: TRACE.product, visitorId, fbp: (attribution.fbp || '').slice(0, 200), fbc: (attribution.fbc || '').slice(0, 200),
        sourceUrl: (attribution.sourceUrl || '').slice(0, 450), owner: ownerBrowser(req) ? '1' : '' },
    };
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (error) {
      // An account without a shortened descriptor refuses a suffix. A plain
      // descriptor is better than no checkout at all.
      if (!/statement_descriptor/i.test(String(error?.message || error?.param || ''))) throw error;
      const { statement_descriptor_suffix: _, ...intent } = params.payment_intent_data;
      session = await stripe.checkout.sessions.create({ ...params, payment_intent_data: intent });
    }
    res.json({ url: session.url });
  }));

  // Called by the page Stripe returns to. Confirms the payment with Stripe,
  // records it once, tells Meta once, emails the unlock link once.
  router.post('/unlock', guarded(async (req, res) => {
    if (!stripe || !secret) throw fail(503, 'Unlocking is not available right now.');
    rate(`trace-unlock:${req.ip}`, 60, 3600000);
    const sessionId = sessionIdOf(req.body?.sessionId);
    if (!sessionId) throw fail(400, 'That payment link is not valid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(sessionId); }
    catch (error) { if (error?.statusCode === 404 || error?.code === 'resource_missing') throw fail(404, 'We could not find that payment.'); throw error; }
    if (session?.metadata?.product !== TRACE.product) throw fail(404, 'We could not find that payment.');
    if (!isTracePurchase(session)) throw fail(402, 'The payment has not finished yet.');
    const visitorId = visitorOf(session.metadata.visitorId);
    const email = emailOf(session.customer_details?.email);
    await record('TracePaid', { visitorId, sourceId: `trace-paid:${sessionId}` });
    const owner = session.metadata.owner === '1' || ownerBrowser(req) || (email && isCapiExcludedEmail(email));
    if (!owner) {
      await sendCapi('Purchase', {
        eventId: `trace-purchase.${sessionId}`,
        hotelId: visitorId ? `trace-visitor:${visitorId}` : `trace-session:${sessionId}`,
        externalId: visitorId ? `trace-visitor:${visitorId}` : `trace-session:${sessionId}`,
        email: email || '',
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        sourceUrl: session.metadata.sourceUrl || `${origin}/trace`,
        fbp: session.metadata.fbp || '',
        fbc: session.metadata.fbc || '',
        value: (session.amount_total || TRACE.priceCents) / 100,
      });
    }
    if (email && mail) {
      // The claim row makes the email go out once however often the buyer
      // reloads; a failed send releases it so the next load tries again.
      const claim = `trace-mail:${sessionId}`;
      let claimed = false;
      try { await prisma.inspectEvent.create({ data: { name: 'TraceUnlockEmailed', tool: TRACE.product, visitorId, sourceId: claim } }); claimed = true; }
      catch (error) { if (error?.code !== 'P2002') console.error('Trace unlock email claim failed:', error.message); }
      if (claimed) {
        try { await sendUnlockEmail(email, sessionId); }
        catch (error) {
          console.error('Trace unlock email failed:', error.message);
          await prisma.inspectEvent.delete({ where: { sourceId: claim } }).catch(() => {});
        }
      }
    }
    res.json({ token: unlockToken(secret, sessionId), email: email || '' });
  }));

  router.post('/verify', guarded(async (req, res) => {
    if (!secret) throw fail(503, 'Unlocking is not available right now.');
    rate(`trace-verify:${req.ip}`, 60, 3600000);
    if (!verifyUnlock(secret, req.body?.token)) throw fail(400, 'That unlock link is not valid.');
    res.json({ ok: true });
  }));

  // "Already paid?": the unlock link goes only to the email that paid, and the
  // answer is the same whether or not that email bought, so this cannot be used
  // to find out who has.
  router.post('/restore', guarded(async (req, res) => {
    rate(`trace-restore:${req.ip}`, 10, 3600000);
    const email = emailOf(req.body?.email);
    if (!email) throw fail(400, 'Enter the email you paid with.');
    rate(`trace-restore-email:${email}`, 3, 3600000);
    if (stripe && secret && mail) {
      try {
        const list = await stripe.checkout.sessions.list({ customer_details: { email }, limit: 20 });
        const purchase = (list?.data || []).find(isTracePurchase);
        if (purchase) await sendUnlockEmail(email, purchase.id);
      } catch (error) { console.error('Trace restore failed:', error.message); }
    }
    res.json({ success: true });
  }));

  router.use((error, req, res, _next) => {
    const status = Number(error?.status) || (error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('Trace route failed:', error?.message || error);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  app.use('/api/trace', router);
}

module.exports = { TRACE, TRACE_EVENTS, TRACE_SIGNALS, registerTrace, unlockToken, verifyUnlock, isTracePurchase, tracePageHeaders };
