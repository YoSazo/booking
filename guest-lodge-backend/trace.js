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
  'TraceCheckoutCancelled', 'TraceUnlocked', 'TraceRestoreAsked', 'TraceAIAsked', 'TraceAIShown',
]);

// "Describe it": OpenAI draws simple line art to trace. Every picture costs
// money, so the server counts each one (TraceAIGenerated rows), allows one free
// picture per visitor, a monthly allowance per purchase, and stops for the day
// at a total spending cap.
const AI_STYLE = [
  'A simple, clean black-and-white line drawing made for tracing onto paper.',
  'Bold, smooth black outlines on a plain white background.',
  'No shading, no color, no gray fill, no text, no border, no frame.',
  'One subject, centered, filling most of the picture, with a beginner-friendly amount of detail.',
  'If the request names a trademarked or copyrighted character, draw an original character in a similar spirit instead.',
  'Subject:',
].join(' ');
const promptOf = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

// What Meta may optimise for, shallow to deep, each once per visitor. The
// campaign optimises ViewContent: the first deliberate tap (a picture, a photo
// or a description), common enough for Meta to learn from but never a stray
// touch. Tracing on camera is AddToCart, a deeper signal to move to once it is
// frequent. A Checkout ready to pay is InitiateCheckout; the purchase itself is
// sent when the payment is confirmed.
const TRACE_SIGNALS = Object.freeze({
  TracePicked: { event: 'ViewContent', id: 'trace-picked' },
  TraceStarted: { event: 'AddToCart', id: 'trace-started', value: TRACE.priceCents / 100 },
  TraceCheckoutOpened: { event: 'InitiateCheckout', id: 'trace-checkout', value: TRACE.priceCents / 100 },
});

const visitorOf = value => (/^v_[A-Za-z0-9]{8,40}$/.test(String(value || '')) ? String(value) : null);
const detailOf = value => (/^[a-z][a-z0-9_-]{0,23}$/.test(String(value || '')) ? String(value) : null);
const sessionIdOf = value => (/^cs_(?:live|test)_[A-Za-z0-9]{8,240}$/.test(String(value || '')) ? String(value) : null);
const emailOf = value => {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};
// Messages written here are meant for the buyer (shown even for 5xx); any
// other error keeps its details in the log.
const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });

function unlockSignature(secret, sessionId) {
  return crypto.createHmac('sha256', secret).update(`trace-unlock:${sessionId}`).digest('base64url').slice(0, 32);
}
function unlockToken(secret, sessionId) {
  return `${sessionId}.${unlockSignature(secret, sessionId)}`;
}
// Six digits for unlocking inside the iPhone app, where an emailed link opens
// Safari instead. Tied to one purchase; only useful with the email that paid.
function unlockCode(secret, sessionId) {
  const digest = crypto.createHmac('sha256', secret).update(`trace-code:${sessionId}`).digest();
  return String(digest.readUInt32BE(0) % 1000000).padStart(6, '0');
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
  openai = null,
  env = process.env,
}) {
  const origin = String(env.TRACE_PUBLIC_ORIGIN || env.INSPECT_PUBLIC_ORIGIN || 'https://bookmarketel.com').replace(/\/+$/, '');
  const secret = env.TRACE_UNLOCK_SECRET || env.INSPECT_AUTH_SECRET || '';
  const guarded = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const ownerBrowser = req => String(req?.headers?.['x-marketel-no-track'] || '') === '1';
  // The iPhone app loads this page from capacitor://localhost. Nothing done in
  // the app goes to Meta: pairing app activity with ad identifiers is tracking
  // under Apple's rules, and the ads land on the website anyway.
  const fromApp = req => /^(capacitor|ionic):\/\//.test(String(req?.headers?.origin || ''));
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
  // The owner's own emails (the /funnel exclusion list) unlock through "Already
  // paid?" without a purchase, for recordings and testing. Their stand-in
  // session id never exists in Stripe, so nothing is recorded as a sale.
  const ownerSession = email => `cs_live_owner${crypto.createHash('sha256').update(`trace-owner:${email}`).digest('hex').slice(0, 24)}`;
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
      `In the Marketel app, tap "Already paid?" and enter this code: ${unlockCode(secret, sessionId)}`,
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
    const app = fromApp(req);
    await record(name, { visitorId, detail: name === 'TraceLanded' ? (app ? 'app' : 'web') : detailOf(req.body?.detail) });
    const signal = TRACE_SIGNALS[name];
    if (signal && visitorId && !app) {
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
    // Never collect money when we cannot issue the purchased unlock.
    if (!stripe || !secret) throw fail(503, 'Payments are not available right now.');
    rate(`trace-checkout:${req.ip}`, 20, 3600000);
    const visitorId = visitorOf(req.body?.visitorId) || '';
    const app = fromApp(req);
    const attribution = app ? {} : meta(req.body?.attribution, req);
    // From the app, Stripe opens in Safari; the page it returns to offers the
    // way back into the app, which unlocks itself when it comes to the front.
    const back = app ? '&app=1' : '';
    const params = {
      mode: 'payment',
      submit_type: 'pay',
      // Cards only (Apple Pay and Google Pay are cards). A bank payment takes
      // days to clear, so the buyer would come back to a page that can't unlock.
      payment_method_types: ['card'],
      line_items: [{ quantity: 1, price_data: { currency: TRACE.currency, unit_amount: TRACE.priceCents,
        product_data: { name: `${TRACE.name}: yours for good`, description: 'Trace any picture onto paper. One payment. No subscription. Nothing renews.' } } }],
      success_url: `${origin}/trace?paid={CHECKOUT_SESSION_ID}${back}`,
      cancel_url: `${origin}/trace?cancelled=1${back}`,
      payment_intent_data: { statement_descriptor_suffix: TRACE.descriptorSuffix, metadata: { product: TRACE.product } },
      metadata: { product: TRACE.product, visitorId, fbp: (attribution.fbp || '').slice(0, 500), fbc: (attribution.fbc || '').slice(0, 500),
        sourceUrl: (attribution.sourceUrl || '').slice(0, 450), owner: ownerBrowser(req) || automatedBrowser(req) ? '1' : '', app: app ? '1' : '' },
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
    res.json({ url: session.url, id: session.id });
  }));

  // Shared by the verified Stripe webhook and the browser return. A buyer
  // must receive their unlock even when they close Stripe before returning.
  async function fulfillPurchase(session, req, { retryMail = false, webhook = false } = {}) {
    const sessionId = session.id;
    const visitorId = visitorOf(session.metadata.visitorId);
    const email = emailOf(session.customer_details?.email);
    const owner = session.metadata.owner === '1' || ownerBrowser(req) || (email && isCapiExcludedEmail(email))
      || session.livemode === false;
    if (!owner) await record('TracePaid', { visitorId, sourceId: `trace-paid:${sessionId}` });
    const appPurchase = session.metadata.app === '1' || fromApp(req);
    if (!owner && !appPurchase) {
      await sendCapi('Purchase', {
        eventId: `trace-purchase.${sessionId}`,
        hotelId: visitorId ? `trace-visitor:${visitorId}` : `trace-session:${sessionId}`,
        externalId: visitorId ? `trace-visitor:${visitorId}` : `trace-session:${sessionId}`,
        email: email || '',
        // A webhook request belongs to Stripe, not the buyer. Never send
        // Stripe's IP or user-agent as the customer's matching information.
        ip: webhook ? '' : req.ip || '',
        userAgent: webhook ? '' : req.headers['user-agent'] || '',
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
          if (retryMail) throw error; // Let Stripe retry delivery after SMTP recovers.
        }
      }
    }
    return { token: unlockToken(secret, sessionId), email: email || '' };
  }

  // Called only after registerInspect has verified Stripe's signature, using
  // the existing endpoint/secret on the same Stripe account. Other products
  // fall through to their unchanged handlers.
  async function handleStripeEvent(event, req) {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
      || event.data?.object?.metadata?.product !== TRACE.product) return false;
    if (!stripe || !secret) throw fail(503, 'Unlocking is not available right now.');
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (isTracePurchase(session)) await fulfillPurchase(session, req, { retryMail: true, webhook: true });
    return true;
  }

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
    res.json(await fulfillPurchase(session, req));
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
  // ----- Describe it: AI line art -----
  const aiModel = env.TRACE_IMAGE_MODEL || 'gpt-image-1-mini';
  const aiCost = Number(env.TRACE_AI_COST_USD) > 0 ? Number(env.TRACE_AI_COST_USD) : 0.02;
  const aiDailyCap = Number(env.TRACE_AI_DAILY_CAP_USD) >= 0 && env.TRACE_AI_DAILY_CAP_USD !== undefined && env.TRACE_AI_DAILY_CAP_USD !== '' ? Number(env.TRACE_AI_DAILY_CAP_USD) : 5;
  const aiMonthly = Number(env.TRACE_AI_MONTHLY) > 0 ? Math.floor(Number(env.TRACE_AI_MONTHLY)) : 30;
  let aiClient = openai;
  const imageApi = () => {
    if (aiClient) return aiClient;
    if (!env.OPENAI_API_KEY) return null;
    const OpenAI = require('openai');
    aiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });
    return aiClient;
  };
  const purchaseKey = sessionId => `p_${crypto.createHash('sha256').update(`trace-ai:${sessionId}`).digest('hex').slice(0, 20)}`;
  const generated = where => prisma.inspectEvent.count({ where: { tool: TRACE.product, name: 'TraceAIGenerated', ...where } });
  router.post('/generate', guarded(async (req, res) => {
    if (automatedBrowser(req)) throw fail(403, 'Not available.');
    const api = imageApi();
    if (!api) throw fail(503, "The drawing maker isn't available right now.");
    rate(`trace-ai:${req.ip}`, 12, 3600000);
    const prompt = promptOf(req.body?.prompt);
    if (prompt.length < 2) throw fail(400, 'Type what you want to draw.');
    const visitorId = visitorOf(req.body?.visitorId);
    const sessionId = req.body?.token ? verifyUnlock(secret, req.body.token) : null;
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (aiDailyCap === 0 || (await generated({ createdAt: { gte: dayStart } })) * aiCost >= aiDailyCap) {
      throw fail(503, 'The drawing maker is resting until tomorrow. Pick a picture or use your own photo.');
    }
    let detail;
    if (sessionId) {
      detail = purchaseKey(sessionId);
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      if (await generated({ detail, createdAt: { gte: monthStart } }) >= aiMonthly) {
        throw fail(429, `You've made your ${aiMonthly} AI pictures this month. More next month, and you can still use any picture or photo.`);
      }
    } else {
      if (!visitorId) throw fail(400, 'Reload the page and try again.');
      // One free picture per visitor, and a few per network a day for anyone
      // clearing their browser to get more.
      if (await generated({ visitorId, detail: 'free' }) >= 1) throw fail(402, 'Your free AI picture is used. Unlock to make more.');
      rate(`trace-ai-free:${req.ip}`, 3, 86400000);
      detail = 'free';
    }
    let image;
    try {
      const result = await api.images.generate({
        model: aiModel,
        prompt: `${AI_STYLE} ${prompt}`,
        size: '1024x1024',
        quality: 'low',
        output_format: 'webp',
        moderation: 'auto',
        n: 1,
        user: crypto.createHash('sha256').update(`trace:${sessionId || visitorId || req.ip}`).digest('hex').slice(0, 32),
      });
      image = result?.data?.[0]?.b64_json;
    } catch (error) {
      const refused = error?.code === 'moderation_blocked' || /safety|moderation|content policy/i.test(String(error?.message || ''));
      await record(refused ? 'TraceAIRefused' : 'TraceAIFailed', { visitorId }).catch(() => {});
      if (refused) throw fail(422, "We can't draw that one. Try describing something else.");
      console.error('Trace AI generation failed:', error?.status || '', error?.code || '', String(error?.message || '').slice(0, 200));
      throw fail(502, "The drawing didn't come out. Please try again.");
    }
    if (!image) throw fail(502, "The drawing didn't come out. Please try again.");
    // Counted only when a picture was actually made (and billed).
    await record('TraceAIGenerated', { visitorId, detail });
    res.json({ image: `data:image/webp;base64,${image}` });
  }));

  router.post('/restore', guarded(async (req, res) => {
    rate(`trace-restore:${req.ip}`, 10, 3600000);
    const email = emailOf(req.body?.email);
    if (!email) throw fail(400, 'Enter the email you paid with.');
    rate(`trace-restore-email:${email}`, 3, 3600000);
    if (secret && mail && isCapiExcludedEmail(email)) {
      await sendUnlockEmail(email, ownerSession(email)).catch(error => console.error('Trace owner unlock email failed:', error.message));
    } else if (stripe && secret && mail) {
      try {
        const list = await stripe.checkout.sessions.list({ customer_details: { email }, limit: 20 });
        const purchase = (list?.data || []).find(isTracePurchase);
        if (purchase) await sendUnlockEmail(email, purchase.id);
      } catch (error) { console.error('Trace restore failed:', error.message); }
    }
    res.json({ success: true });
  }));

  // The code from the unlock email, typed into the app (or a browser) with the
  // email that paid. Few tries per email and per network keep six digits safe.
  router.post('/restore-code', guarded(async (req, res) => {
    if (!stripe || !secret) throw fail(503, 'Unlocking is not available right now.');
    rate(`trace-code:${req.ip}`, 20, 3600000);
    const email = emailOf(req.body?.email);
    const code = String(req.body?.code || '').replace(/\D/g, '');
    if (!email || code.length !== 6) throw fail(400, 'Enter your email and the 6-digit code from the email.');
    rate(`trace-code-email:${email}`, 6, 3600000);
    if (isCapiExcludedEmail(email) && crypto.timingSafeEqual(Buffer.from(unlockCode(secret, ownerSession(email))), Buffer.from(code))) {
      return res.json({ token: unlockToken(secret, ownerSession(email)) });
    }
    const list = await stripe.checkout.sessions.list({ customer_details: { email }, limit: 20 });
    const purchase = (list?.data || []).find(session => isTracePurchase(session)
      && crypto.timingSafeEqual(Buffer.from(unlockCode(secret, session.id)), Buffer.from(code)));
    if (!purchase) throw fail(400, "That code doesn't match. Check the newest email from Marketel.");
    res.json({ token: unlockToken(secret, purchase.id) });
  }));

  router.use((error, req, res, _next) => {
    const status = Number(error?.status) || (error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500 && !error?.forBuyer) console.error('Trace route failed:', error?.message || error);
    res.status(status).json({ error: status >= 500 && !error?.forBuyer ? 'Something went wrong. Please try again.' : error.message });
  });
  app.use('/api/trace', router);
  return { handleStripeEvent };
}

module.exports = { TRACE, TRACE_EVENTS, TRACE_SIGNALS, registerTrace, unlockToken, unlockCode, verifyUnlock, isTracePurchase, tracePageHeaders };
