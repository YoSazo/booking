'use strict';

// Payoff is sold as a preorder until the app is ready. Stripe is the durable
// order ledger; no financial inputs or payment details are stored here.
const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');

const PRODUCT = 'marketel-payoff-preorder';
const VERSION = 'payoff-preorder-v1';
const ITEMS = Object.freeze({
  base: { name: 'Marketel Payoff — preorder', cents: 3300 },
  cashflow: { name: 'Cash-flow calendar — preorder', cents: 2200 },
  reset: { name: 'Spending reset — preorder', cents: 900 },
});
const ROOT = path.join(__dirname, 'payoff-web');
const EVENTS = ['PayoffLanded', 'PayoffFrom', 'PayoffOrderViewed', 'PayoffCheckoutTapped', 'PayoffCheckoutOpened', 'PayoffCheckoutFailed', 'PayoffCheckoutCancelled'];
const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const sessionId = value => typeof value === 'string' && /^cs_(?:live|test)_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
const visitorId = value => typeof value === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;

function basket(addons) {
  if (!Array.isArray(addons) || addons.length > 2 || new Set(addons).size !== addons.length
    || addons.some(id => !['cashflow', 'reset'].includes(id))) throw fail(400, 'Choose only the listed optional tools.');
  return ['base', ...['cashflow', 'reset'].filter(id => addons.includes(id))];
}
function paidOrder(session) {
  if (!session || session.metadata?.product !== PRODUCT || session.metadata?.offerVersion !== VERSION
    || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid'
    || session.currency !== 'usd') return null;
  let ids;
  try { ids = basket(JSON.parse(session.metadata.addons)); } catch { return null; }
  if (session.amount_total !== ids.reduce((sum, id) => sum + ITEMS[id].cents, 0)) return null;
  return ids;
}
function pageHeaders(res) {
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
}
function registerPayoff(app, { stripe, mail, prisma, isExcludedEmail = () => false, env = process.env }) {
  const origin = 'https://bookmarketel.com';
  const key = env.STRIPE_INSPECT_SECRET_KEY || env.STRIPE_MARKETEL_SECRET_KEY || '';
  const available = () => env.PAYOFF_ENABLED !== 'false' && !!stripe && !!mail && !!prisma?.inspectEvent
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
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).send('Use the secure checkout to preorder.');
    next();
  });
  for (const [route, file] of [['/', 'index.html'], ['/order', 'order.html'], ['/confirmation', 'confirmation.html'], ['/terms', 'terms.html']]) {
    pages.get(route, (_req, res) => res.sendFile(path.join(ROOT, file)));
  }
  for (const file of ['content.js', 'page.js', 'checkout.js', 'confirmation.js', 'style.css']) {
    pages.get('/' + file, (_req, res) => res.sendFile(path.join(ROOT, file)));
  }
  pages.get('/assets/:file', (req, res) => {
    if (!/^[a-z0-9-]+\.png$/.test(req.params.file)) return res.sendStatus(404);
    res.sendFile(path.join(ROOT, 'assets', req.params.file));
  });
  pages.use((_req, res) => res.sendStatus(404));
  app.use('/payoff', pages);

  async function confirm(session, { retryMail = false } = {}) {
    const ids = paidOrder(session);
    if (!ids) throw fail(402, 'This preorder has not been paid. If you were charged, contact support@bookmarketel.com.');
    const visitor = visitorId(session.metadata.visitorId);
    const email = session.customer_details?.email;
    // Stripe retains every order. Owner, no-track and sandbox orders receive
    // confirmations but do not inflate the customer conversion ladder.
    if (session.livemode !== false && session.metadata.noTrack !== '1' && !isExcludedEmail(email || '')) {
      await record('PayoffPaid', visitor, `payoff-paid:${session.id}`, ids.join(','));
    }
    let emailSent = false;
    if (email && mail) {
      const sourceId = `payoff-mail:${session.id}`;
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
          await mail.sendMail({ from: '"Marketel" <support@bookmarketel.com>', to: email,
            subject: 'Your Marketel Payoff preorder confirmation',
            text: [
              'Thank you for preordering Marketel Payoff.', '',
              'This is a paid preorder. The app and optional tools are in development and are not available yet. No release date has been announced. We will email this address when your purchased tools are ready.', '',
              ...ids.map(id => `${ITEMS[id].name}: $${(ITEMS[id].cents / 100).toFixed(2)}`),
              `Total paid: $${(session.amount_total / 100).toFixed(2)} USD. One payment, no subscription.`,
              `Order reference: ${session.id}`, '',
              'For order questions, cancellations or refund requests, reply to this email or contact support@bookmarketel.com.',
              `${origin}/payoff/terms`,
            ].join('\n') });
          emailSent = true;
        } catch (error) {
          await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
          console.error('Payoff preorder email failed:', error.message);
          if (retryMail) throw error;
        }
      }
    }
    return { paid: true, reference: session.id, totalCents: session.amount_total, items: ids.map(id => ITEMS[id].name), emailSent };
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
    await record(req.body.name, visitorId(req.body.visitorId), null, detail);
    res.json({ success: true });
  }));
  api.post('/checkout', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'Purchases are temporarily unavailable. Please try again later.');
    // Browser requests must come from our own page. A supplied Origin is never
    // used to construct redirects or set the price.
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open checkout on bookmarketel.com.');
    rate(req, 'checkout', 20);
    const ids = basket(req.body?.addons || []);
    if (req.body?.preorderAccepted !== VERSION) throw fail(400, 'Please acknowledge that this is a paid preorder.');
    const attempt = req.body?.attempt;
    if (typeof attempt !== 'string' || !/^[a-f0-9-]{16,64}$/.test(attempt)) throw fail(400, 'Please reload the order page and try again.');
    const email = String(req.body?.email || '').trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Enter a valid receipt email.');
    const metadata = { product: PRODUCT, offerVersion: VERSION, addons: JSON.stringify(ids.filter(id => id !== 'base')),
      visitorId: visitorId(req.body?.visitorId) || '', noTrack: noTrack(req) ? '1' : '' };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, ids, email])).digest('hex');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', submit_type: 'pay', payment_method_types: ['card'], customer_email: email,
      line_items: ids.map(id => ({ quantity: 1, price_data: { currency: 'usd', unit_amount: ITEMS[id].cents,
        product_data: { name: ITEMS[id].name, description: 'PAID PREORDER. In development; not yet available. No release date announced. You pay now; access will be emailed when ready. No subscription.' } } })),
      custom_text: { submit: { message: 'Paid preorder: charged today. Software is in development, not yet available, and no release date is announced. We will email you when ready. Order questions or refund requests: support@bookmarketel.com.' } },
      success_url: `${origin}/payoff/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payoff/order?cancelled=1`,
      metadata, payment_intent_data: { metadata },
    }, { idempotencyKey: `payoff:${fingerprint}` });
    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) throw fail(502, 'Checkout could not open. Please try again.');
    res.json({ url: session.url });
  }));
  api.post('/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Order confirmation is temporarily unavailable.');
    rate(req, 'confirm', 60);
    const id = sessionId(req.body?.sessionId);
    if (!id) throw fail(400, 'The order reference is invalid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    res.json(await confirm(session));
  }));
  api.use((error, _req, res, _next) => {
    if (!error.forBuyer) console.error('Payoff request failed:', error.type || error.name);
    res.status(error.forBuyer ? error.status : 503).json({ message: error.forBuyer ? error.message : 'We could not complete that request. Please try again.' });
  });
  app.use('/api/payoff', api);
  return { handleStripeEvent: async (event, _req) => {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
      || event.data?.object?.metadata?.product !== PRODUCT) return false;
    if (!stripe || !prisma?.inspectEvent || !mail) throw fail(503, 'Order confirmation is unavailable.');
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status === 'paid') await confirm(session, { retryMail: true });
    return true;
  } };
}
module.exports = { registerPayoff, paidOrder, basket, ITEMS, VERSION, PRODUCT };
