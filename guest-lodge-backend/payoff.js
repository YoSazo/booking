'use strict';

// Payoff is sold once and opens straight after payment. Stripe is the durable
// order ledger; no financial inputs or payment details are stored here. The
// buyer's numbers stay in their browser (payoff-web/app.js).
const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { sanitizeInspectAttribution } = require('./inspect');

const PRODUCT = 'marketel-payoff';
const VERSION = 'payoff-v1';
// Paid preorders from before the tool existed open it too, with their extras.
const PREORDER = Object.freeze({ product: 'marketel-payoff-preorder', version: 'payoff-preorder-v1' });
const EXTRAS = Object.freeze(['cashflow', 'reset']);
const DESCRIPTIONS = Object.freeze({
  base: 'Your debt payoff plan on your phone. Opens right after payment. One payment, no subscription.',
  cashflow: 'Income, bills and debt payments on one calendar, with your projected balance up to 18 months ahead. Opens inside Payoff.',
  reset: 'A spending reset you set up and track day by day. Opens inside Payoff.',
});
const ITEMS = Object.freeze({
  base: { name: 'Marketel Payoff', cents: 3300 },
  cashflow: { name: 'Cash-flow calendar', cents: 2200 },
  reset: { name: 'Spending reset', cents: 900 },
});
const ROOT = path.join(__dirname, 'payoff-web');
const EVENTS = ['PayoffLanded', 'PayoffFrom', 'PayoffOrderViewed', 'PayoffCheckoutTapped', 'PayoffCheckoutOpened', 'PayoffCheckoutFailed', 'PayoffCheckoutCancelled'];
const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const sessionId = value => typeof value === 'string' && /^cs_(?:live|test)_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
// Access is the paid session id (or an owner id) signed with the server secret.
const accessId = value => sessionId(value) || (typeof value === 'string' && /^own_[a-f0-9]{24}$/.test(value) ? value : null);
const accessSignature = (secret, id) => crypto.createHmac('sha256', secret).update(`payoff-access:${id}`).digest('base64url').slice(0, 32);
const accessToken = (secret, id) => `${id}.${accessSignature(secret, id)}`;
function verifyAccess(secret, token) {
  const [id, signature, extra] = String(token || '').split('.');
  if (!secret || extra !== undefined || !accessId(id) || !signature) return null;
  const expected = Buffer.from(accessSignature(secret, id)), given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected) ? id : null;
}
const ownerId = email => 'own_' + crypto.createHash('sha256').update(`payoff-owner:${email.toLowerCase()}`).digest('hex').slice(0, 24);
const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const visitorId = value => typeof value === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;

function basket(addons) {
  if (!Array.isArray(addons) || addons.length > 2 || new Set(addons).size !== addons.length
    || addons.some(id => !['cashflow', 'reset'].includes(id))) throw fail(400, 'Choose only the listed optional tools.');
  return ['base', ...['cashflow', 'reset'].filter(id => addons.includes(id))];
}
const isPayoff = metadata => metadata?.product === PRODUCT || metadata?.product === PREORDER.product;
function paidOrder(session) {
  const current = session?.metadata?.product === PRODUCT && session.metadata.offerVersion === VERSION;
  const preorder = session?.metadata?.product === PREORDER.product && session.metadata.offerVersion === PREORDER.version;
  if (!(current || preorder) || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid'
    || session.currency !== 'usd') return null;
  let ids;
  try { ids = basket(JSON.parse(session.metadata.addons)); } catch { return null; }
  if (session.amount_total !== ids.reduce((sum, id) => sum + ITEMS[id].cents, 0)) return null;
  return ids;
}
// Meta's pixel loads from connect.facebook.net and reports to www.facebook.com,
// on the sales and order pages only. The tool itself (/payoff/app) never loads
// it, so nothing a buyer types there can reach Meta.
const META_CSP = "default-src 'self'; script-src 'self' https://connect.facebook.net; style-src 'self'; img-src 'self' https://www.facebook.com; font-src 'self'; connect-src 'self' https://www.facebook.com https://connect.facebook.net; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PRICE = cents => Math.round(cents) / 100;
function pageHeaders(res) {
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
}
function registerPayoff(app, { stripe, mail, prisma, isExcludedEmail = () => false, queueCapi = null, capiConfigured = false, env = process.env }) {
  const origin = 'https://bookmarketel.com';
  const key = env.STRIPE_INSPECT_SECRET_KEY || env.STRIPE_MARKETEL_SECRET_KEY || '';
  const secret = env.PAYOFF_ACCESS_SECRET || env.INSPECT_AUTH_SECRET || (env.NODE_ENV === 'test' ? 'payoff-test-secret' : '');
  const accessUrl = id => `${origin}/payoff/app?access=${encodeURIComponent(accessToken(secret, id))}`;
  const available = () => env.PAYOFF_ENABLED !== 'false' && !!stripe && !!mail && !!prisma?.inspectEvent && !!secret
    && (env.NODE_ENV === 'test' || (key.startsWith('sk_live_') && String(env.STRIPE_INSPECT_WEBHOOK_SECRET || '').startsWith('whsec_')));
  const automated = req => /HeadlessChrome|bot\b|crawler|spider|Playwright/i.test(req.headers['user-agent'] || '');
  const noTrack = req => req.headers['x-marketel-no-track'] === '1' || automated(req);
  const hits = new Map();
  function rate(req, action, limit) {
    const now = Date.now(), key = `${action}:${req.ip}`;
    if (hits.size > 5000) for (const [k, values] of hits) if (!values.some(at => now-at < 3600000)) hits.delete(k);
    const recent = (hits.get(key) || []).filter(at => now-at < 3600000);
    if (recent.length >= limit) throw fail(429, 'Too many requests. Please try again later.');
    recent.push(now); hits.set(key, recent);
  }
  const record = (name, visitor, sourceId, detail = null) => sourceId
    ? prisma.inspectEvent.upsert({ where: { sourceId }, create: { name, tool: 'payoff', visitorId: visitor, sourceId, detail }, update: {} })
    : prisma.inspectEvent.create({ data: { name, tool: 'payoff', visitorId: visitor, detail } });
  const guarded = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  const pages = express.Router();
  pages.use((req, res, next) => {
    pageHeaders(res);
    if (env.PAYOFF_ENABLED === 'false') return res.sendStatus(404);
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).send('Use the secure checkout to buy.');
    next();
  });
  for (const [route, file] of [['/', 'index.html'], ['/order', 'order.html'], ['/confirmation', 'confirmation.html'], ['/terms', 'terms.html'], ['/app', 'app.html']]) {
    pages.get(route, (_req, res) => {
      if (file !== 'app.html') res.set('Content-Security-Policy', META_CSP);
      res.sendFile(path.join(ROOT, file));
    });
  }
  for (const file of ['content.js', 'page.js', 'checkout.js', 'confirmation.js', 'style.css', 'app.js', 'app.css', 'engine.js']) {
    pages.get('/' + file, (_req, res) => res.sendFile(path.join(ROOT, file)));
  }
  pages.get('/assets/:file', (req, res) => {
    if (!/^[a-z0-9-]+\.(?:png|jpg)$/.test(req.params.file)) return res.sendStatus(404);
    res.sendFile(path.join(ROOT, 'assets', req.params.file));
  });
  pages.use((_req, res) => res.sendStatus(404));
  app.use('/payoff', pages);

  // Server copies of the pixel's events, with the same event ids, so Meta
  // counts each once and still hears about the ones a browser blocked.
  const sendCapi = (eventName, input) => {
    if (!capiConfigured || typeof queueCapi !== 'function') return Promise.resolve({ queued: false });
    return queueCapi(eventName, { product: 'marketel-payoff', currency: 'USD', contentName: 'Marketel Payoff', ...input })
      .catch(error => { console.error('Payoff CAPI queue failed:', eventName, error.message); return { queued: false }; });
  };
  const visitorCapi = (visitor, attribution, req) => ({
    hotelId: `payoff-visitor:${visitor}`, externalId: `payoff-visitor:${visitor}`,
    ip: attribution.ipAddress || req.ip || '', userAgent: attribution.userAgent || req.headers['user-agent'] || '',
    sourceUrl: attribution.sourceUrl || `${origin}/payoff`, fbp: attribution.fbp || '', fbc: attribution.fbc || '',
  });

  async function confirm(session, { retryMail = false, req = null, webhook = false } = {}) {
    const ids = paidOrder(session);
    if (!ids) throw fail(402, 'This order has not been paid. If you were charged, contact support@bookmarketel.com.');
    const visitor = visitorId(session.metadata.visitorId);
    const email = session.customer_details?.email;
    // Stripe retains every order. Owner, no-track and sandbox orders receive
    // confirmations but do not inflate the customer conversion ladder.
    if (session.livemode !== false && session.metadata.noTrack !== '1' && !isExcludedEmail(email || '')) {
      await record('PayoffPaid', visitor, `payoff-paid:${session.id}`, ids.join(','));
      await sendCapi('Purchase', {
        eventId: `payoff-purchase.${session.id}`,
        hotelId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${session.id}`,
        externalId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${session.id}`,
        email: email || '',
        // A webhook request is Stripe's, never the buyer's IP or browser.
        ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
        sourceUrl: session.metadata.sourceUrl || `${origin}/payoff`, fbp: session.metadata.fbp || '', fbc: session.metadata.fbc || '',
        value: PRICE(session.amount_total),
      });
    }
    let emailSent = false;
    if (email && mail) {
      const sourceId = `payoff-access-mail:${session.id}`;
      let claimed = false;
      try {
        await prisma.inspectEvent.create({ data: { name: 'PayoffConfirmationEmailed', tool: 'payoff', sourceId, visitorId: visitor } });
        claimed = true;
      } catch (error) {
        if (error.code !== 'P2002') throw error;
        emailSent = true;
      }
      if (claimed) {
        try {
          await mail.sendMail(accessMail(email, session.id, [
            ...ids.map(id => `${ITEMS[id].name}: $${(ITEMS[id].cents / 100).toFixed(2)}`),
            `Total paid: $${(session.amount_total / 100).toFixed(2)} USD. One payment, no subscription.`,
            `Order reference: ${session.id}`,
            ...(ids.length > 1 ? ['', `Your ${ids.slice(1).map(id => ITEMS[id].name.toLowerCase()).join(' and ')} ${ids.length > 2 ? 'are' : 'is'} inside Payoff, in the tabs at the top.`] : []),
          ]));
          emailSent = true;
        } catch (error) {
          await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
          console.error('Payoff access email failed:', error.message);
          if (retryMail) throw error;
        }
      }
    }
    return { paid: true, reference: session.id, totalCents: session.amount_total, items: ids.map(id => ITEMS[id].name), emailSent,
      access: accessToken(secret, session.id), extras: ids.filter(id => id !== 'base') };
  }
  // One email for every way of getting the link: after payment and on request.
  function accessMail(to, id, lines = []) {
    return { from: '"Marketel" <support@bookmarketel.com>', to, subject: 'Your Marketel Payoff link',
      text: [
        'Here is your Marketel Payoff. Open this link on your phone to see your debt-free date:', '',
        accessUrl(id), '',
        'Keep this email. The link opens your plan on any phone or computer. Your numbers stay on the device where you type them.', '',
        ...(lines.length ? [...lines, ''] : []),
        'Questions or refund requests: reply to this email or contact support@bookmarketel.com.',
        `${origin}/payoff/terms`,
      ].join('\n') };
  }
  const api = express.Router();
  api.use(express.json({ limit: '8kb' }));
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.get('/config', (_req, res) => res.json({ available: available(), priceCents: ITEMS.base.cents, addOns: { cashflow: 2200, reset: 900 } }));
  api.post('/event', guarded(async (req, res) => {
    if (!EVENTS.includes(req.body?.name)) throw fail(400, 'Unknown event.');
    if (noTrack(req)) return res.json({ ignored: true });
    rate(req, 'event', 300);
    const detail = req.body.name === 'PayoffFrom' && ['ad', 'social', 'direct', 'other'].includes(req.body.detail) ? req.body.detail : null;
    const visitor = visitorId(req.body.visitorId);
    await record(req.body.name, visitor, null, detail);
    // Reaching the order page is Meta's AddToCart (every "Get My Debt-Free
    // Date" button leads there); the browser pixel sends the same event id.
    if (req.body.name === 'PayoffOrderViewed' && visitor) {
      await sendCapi('AddToCart', { eventId: `payoff-cart.${visitor}`, value: PRICE(ITEMS.base.cents),
        ...visitorCapi(visitor, sanitizeInspectAttribution(req.body.attribution, req) || {}, req) });
    }
    res.json({ success: true });
  }));
  api.post('/checkout', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'Purchases are temporarily unavailable. Please try again later.');
    // Browser requests must come from our own page. A supplied Origin is never
    // used to construct redirects or set the price.
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open checkout on bookmarketel.com.');
    rate(req, 'checkout', 20);
    const ids = basket(req.body?.addons || []);
    const attempt = req.body?.attempt;
    if (typeof attempt !== 'string' || !/^[a-f0-9-]{16,64}$/.test(attempt)) throw fail(400, 'Please reload the order page and try again.');
    const email = String(req.body?.email || '').trim();
    if (!validEmail(email)) throw fail(400, 'Enter a valid email.');
    const visitor = visitorId(req.body?.visitorId);
    const attribution = sanitizeInspectAttribution(req.body?.attribution, req) || {};
    const metadata = { product: PRODUCT, offerVersion: VERSION, addons: JSON.stringify(ids.filter(id => id !== 'base')),
      visitorId: visitor || '', noTrack: noTrack(req) ? '1' : '',
      fbp: (attribution.fbp || '').slice(0, 500), fbc: (attribution.fbc || '').slice(0, 500), sourceUrl: (attribution.sourceUrl || '').slice(0, 500) };
    const total = ids.reduce((sum, id) => sum + ITEMS[id].cents, 0);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, ids, email, metadata.fbp, metadata.fbc])).digest('hex');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', submit_type: 'pay', payment_method_types: ['card'], customer_email: email,
      line_items: ids.map(id => ({ quantity: 1, price_data: { currency: 'usd', unit_amount: ITEMS[id].cents,
        product_data: { name: ITEMS[id].name, description: DESCRIPTIONS[id] } } })),
      custom_text: { submit: { message: 'Your plan opens as soon as you pay, and we email you the link. One payment, no subscription. Questions or refund requests: support@bookmarketel.com.' } },
      success_url: `${origin}/payoff/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payoff/order?cancelled=1`,
      metadata, payment_intent_data: { metadata },
    }, { idempotencyKey: `payoff:${fingerprint}` });
    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) throw fail(502, 'Checkout could not open. Please try again.');
    if (visitor && !metadata.noTrack && !isExcludedEmail(email)) {
      await sendCapi('InitiateCheckout', { eventId: `payoff-checkout.${visitor}`, value: PRICE(total), email, ...visitorCapi(visitor, attribution, req) });
    }
    res.json({ url: session.url, value: PRICE(total) });
  }));
  api.post('/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Order confirmation is temporarily unavailable.');
    rate(req, 'confirm', 60);
    const id = sessionId(req.body?.sessionId);
    if (!id) throw fail(400, 'The order reference is invalid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    res.json(await confirm(session, { req }));
  }));
  api.post('/access', guarded(async (req, res) => {
    rate(req, 'access', 120);
    const id = verifyAccess(secret, req.body?.token);
    if (!id) throw fail(403, 'This link is not valid. Use the link in your Payoff email, or ask for a new one.');
    // Which extras the order included comes from Stripe each time; if Stripe
    // can't answer, the app keeps what it last knew (extras: null).
    if (id.startsWith('own_')) return res.json({ ok: true, extras: [...EXTRAS] });
    let extras = null;
    try {
      const ids = stripe && paidOrder(await stripe.checkout.sessions.retrieve(id));
      if (ids) extras = ids.filter(item => item !== 'base');
    } catch (error) { console.error('Payoff access lookup failed:', error.type || error.message); }
    res.json({ ok: true, extras });
  }));
  // The same answer whether or not the address bought, so it reveals nothing.
  api.post('/resend', guarded(async (req, res) => {
    rate(req, 'resend', 10);
    const email = String(req.body?.email || '').trim();
    if (!validEmail(email)) throw fail(400, 'Enter the email you used at checkout.');
    if (!stripe || !mail || !secret) throw fail(503, 'Sending links is temporarily unavailable. Contact support@bookmarketel.com.');
    let id = isExcludedEmail(email) ? ownerId(email) : null;
    for (const address of id ? [] : [...new Set([email, email.toLowerCase()])]) {
      const found = await stripe.checkout.sessions.list({ customer_details: { email: address }, limit: 50 });
      const order = (found.data || []).find(session => paidOrder(session));
      if (order) { id = order.id; break; }
    }
    if (id) await mail.sendMail(accessMail(email, id));
    res.json({ sent: true });
  }));
  api.use((error, _req, res, _next) => {
    if (!error.forBuyer) console.error('Payoff request failed:', error.type || error.name);
    res.status(error.forBuyer ? error.status : 503).json({ message: error.forBuyer ? error.message : 'We could not complete that request. Please try again.' });
  });
  app.use('/api/payoff', api);
  return { handleStripeEvent: async (event, _req) => {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
      || !isPayoff(event.data?.object?.metadata)) return false;
    if (!stripe || !prisma?.inspectEvent || !mail) throw fail(503, 'Order confirmation is unavailable.');
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status === 'paid') await confirm(session, { retryMail: true, webhook: true });
    return true;
  } };
}
module.exports = { registerPayoff, paidOrder, basket, verifyAccess, accessToken, ITEMS, VERSION, PRODUCT, PREORDER };
