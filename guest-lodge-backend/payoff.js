'use strict';

// Payoff is sold once and opens straight after payment. Stripe is the durable
// order ledger; no financial inputs or payment details are stored here. The
// buyer's numbers stay in their browser (payoff-web/app.js).
const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { sanitizeInspectAttribution, inspectPublishableKey } = require('./inspect');
const { OFFER, issueOffer, readOffer, offerCookie, orderDiscount, QUIZ, issueQuiz, readQuiz, quizCookie } = require('./payoff-offer');

const PRODUCT = 'marketel-payoff';
const VERSION = 'payoff-v1';
// Paid preorders from before the tool existed open it too, with their extras.
const PREORDER = Object.freeze({ product: 'marketel-payoff-preorder', version: 'payoff-preorder-v1' });
const EXTRAS = Object.freeze(['cashflow', 'reset']);
const DESCRIPTIONS = Object.freeze({
  base: 'Regular price was $375. Sale price $33. Your debt payoff plan opens right after payment. 30-day money-back guarantee.',
  cashflow: 'Income, bills and debt payments on one calendar, with your projected balance up to 18 months ahead. Opens inside Payoff.',
  reset: 'A spending reset you set up and track day by day. Opens inside Payoff.',
});
const ITEMS = Object.freeze({
  base: { name: 'Marketel Payoff', cents: 3300 },
  cashflow: { name: 'Cash-flow calendar', cents: 2200 },
  reset: { name: 'Spending reset', cents: 900 },
});
// The Interest Cutter, sold after the first purchase: $107 on the page right
// after paying, then $47 on the next, each only within WINDOW of that payment;
// $147 inside Payoff at any time. Its own PaymentIntent, linked to the order
// it belongs to through `parentOrder`, and recorded on that order as `cutter`.
const CUTTER = Object.freeze({
  product: 'marketel-payoff-cutter', version: 'payoff-cutter-v1', name: 'Interest Cutter',
  prices: Object.freeze({ offer: 10700, discount: 4700, regular: 14700 }), windowMs: 30 * 60 * 1000,
});
const ROOT = path.join(__dirname, 'payoff-web');
const EVENTS = ['PayoffLanded', 'PayoffFrom', 'PayoffVariant', 'PayoffQuizStep', 'PayoffOrderViewed', 'PayoffCheckoutTapped', 'PayoffCheckoutOpened', 'PayoffCheckoutFailed', 'PayoffCheckoutCancelled',
  'PayoffUpgradeViewed', 'PayoffUpgradeAccepted', 'PayoffUpgradeDeclined', 'PayoffUpgradeExpired', 'PayoffStory'];
// The A/B test on the landing: the sales letter or the quiz, kept per visitor.
const VARIANTS = Object.freeze(['letter', 'quiz']);
const VARIANT_COOKIE = 'payoff_variant';
const QUIZ_STEPS = Object.freeze(['q1', 'q2', 'why-interest', 'why-order', 'why-tracking', 'why-life', 'card-1', 'cards', 'reveal', 'extra', 'plan', 'unlock']);
const UPGRADE_OFFERS = ['offer', 'discount', 'regular'];
const EVENT_DETAILS = Object.freeze({ PayoffFrom: ['ad', 'social', 'direct', 'other'], PayoffVariant: VARIANTS, PayoffQuizStep: QUIZ_STEPS,
  PayoffUpgradeViewed: UPGRADE_OFFERS, PayoffUpgradeAccepted: UPGRADE_OFFERS, PayoffUpgradeDeclined: UPGRADE_OFFERS, PayoffUpgradeExpired: UPGRADE_OFFERS,
  PayoffStory: ['viewed', 'scroll25', 'scroll50', 'scroll75', 'scroll100', 'button', 'tapped'] });
const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const sessionId = value => typeof value === 'string' && /^cs_(?:live|test)_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
const intentId = value => typeof value === 'string' && /^pi_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
// Access is the paid order's id (a hosted Checkout Session, a PaymentIntent
// from the order page, or an owner id) signed with the server secret.
const accessId = value => sessionId(value) || intentId(value) || (typeof value === 'string' && /^own_[a-f0-9]{24}$/.test(value) ? value : null);
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
  const discount = orderDiscount(session);
  if (discount === null || (preorder && discount)) return null;
  if (session.amount_total !== ids.reduce((sum, id) => sum + ITEMS[id].cents, 0) - discount) return null;
  return ids;
}
// A payment made in the order page's own form. A hosted session's
// PaymentIntent carries the same product but not `checkout: embedded`, so it
// is only ever counted through its session.
function paidIntent(intent) {
  const metadata = intent?.metadata || {};
  if (intent?.object !== 'payment_intent' || metadata.product !== PRODUCT || metadata.offerVersion !== VERSION || metadata.checkout !== 'embedded'
    || intent.status !== 'succeeded' || intent.currency !== 'usd') return null;
  let ids;
  try { ids = basket(JSON.parse(metadata.addons)); } catch { return null; }
  const discount = orderDiscount(intent);
  if (discount === null || intent.amount_received !== ids.reduce((sum, id) => sum + ITEMS[id].cents, 0) - discount) return null;
  return ids;
}
// One shape for either kind of paid order.
function paidPurchase(object) {
  const intent = object?.object === 'payment_intent';
  const ids = intent ? paidIntent(object) : paidOrder(object);
  return ids && { id: object.id, ids, livemode: object.livemode, metadata: object.metadata,
    email: intent ? object.receipt_email || object.metadata.email : object.customer_details?.email,
    name: (intent ? object.latest_charge?.billing_details?.name : object.customer_details?.name) || '',
    totalCents: intent ? object.amount_received : object.amount_total };
}
// Meta's pixel loads from connect.facebook.net and reports to www.facebook.com,
// on the sales and order pages only. The tool itself (/payoff/app) never loads
// it, so nothing a buyer types there can reach Meta.
const META_CSP = "default-src 'self'; script-src 'self' https://connect.facebook.net; style-src 'self'; img-src 'self' https://www.facebook.com; font-src 'self'; connect-src 'self' https://www.facebook.com https://connect.facebook.net; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
// The order page also holds Stripe's payment fields: Stripe.js, its frames, and
// the inline styles it adds for its overlays (3D Secure, Link).
const ORDER_CSP = "default-src 'self'; script-src 'self' https://connect.facebook.net https://js.stripe.com https://*.js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.facebook.com https://*.stripe.com; font-src 'self'; connect-src 'self' https://www.facebook.com https://connect.facebook.net https://api.stripe.com https://r.stripe.com https://*.link.com; frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://*.link.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const ORDER_PERMISSIONS = 'payment=(self "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")';
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
function registerPayoff(app, { stripe, mail, prisma, isExcludedEmail = () => false, queueCapi = null, capiConfigured = false, text = null, env = process.env, now = Date.now, quizShare, random = Math.random }) {
  const origin = 'https://bookmarketel.com';
  const key = env.STRIPE_INSPECT_SECRET_KEY || env.STRIPE_MARKETEL_SECRET_KEY || '';
  const secret = env.PAYOFF_ACCESS_SECRET || env.INSPECT_AUTH_SECRET || (env.NODE_ENV === 'test' ? 'payoff-test-secret' : '');
  const accessUrl = id => `${origin}/payoff/app?access=${encodeURIComponent(accessToken(secret, id))}`;
  const available = () => env.PAYOFF_ENABLED !== 'false' && !!stripe && !!mail && !!prisma?.inspectEvent && !!secret
    && (env.NODE_ENV === 'test' || (key.startsWith('sk_live_') && String(env.STRIPE_INSPECT_WEBHOOK_SECRET || '').startsWith('whsec_')));
  const couponId = 'marketel-payoff-checkout-5-v1';
  let couponPromise;
  async function checkoutCoupon() {
    if (!couponPromise) couponPromise = (async () => {
      let coupon;
      try { coupon = await stripe.coupons.retrieve(couponId); }
      catch (error) {
        if (error.code !== 'resource_missing') throw error;
        coupon = await stripe.coupons.create({ id: couponId, name: 'Checkout offer — $5 off Payoff',
          amount_off: OFFER.discountCents, currency: 'usd', duration: 'once' }, { idempotencyKey: couponId });
      }
      if (coupon.deleted || !coupon.valid || coupon.amount_off !== OFFER.discountCents || coupon.currency !== 'usd'
        || coupon.percent_off || coupon.applies_to) throw fail(503, 'The checkout offer is temporarily unavailable. Please try again.');
      return coupon.id;
    })().catch(error => { couponPromise = null; throw error; });
    return couponPromise;
  }
  const automated = req => /HeadlessChrome|bot\b|crawler|spider|Playwright/i.test(req.headers['user-agent'] || '');
  // Half of new visitors get the quiz (PAYOFF_QUIZ_SHARE overrides; 0 or 1
  // ends the test for everyone, whatever their cookie says).
  const share = Math.min(1, Math.max(0, Number(quizShare ?? env.PAYOFF_QUIZ_SHARE ?? (env.NODE_ENV === 'test' ? 0 : 0.5)) || 0));
  function landing(req, res) {
    const remember = variant => res.cookie(VARIANT_COOKIE, variant, { httpOnly: true, secure: env.NODE_ENV !== 'test', sameSite: 'lax', path: '/payoff', maxAge: 90 * 24 * 60 * 60 * 1000 });
    if (VARIANTS.includes(req.query.v)) { remember(req.query.v); return req.query.v; }
    if (share === 0 || share === 1) return share ? 'quiz' : 'letter';
    const saved = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${VARIANT_COOKIE}=`))?.slice(VARIANT_COOKIE.length + 1);
    if (VARIANTS.includes(saved)) return saved;
    // Crawlers and Meta's ad review always see the letter and get no cookie.
    if (automated(req) || /facebookexternalhit|Facebot/i.test(req.headers['user-agent'] || '')) return 'letter';
    const variant = random() < share ? 'quiz' : 'letter';
    remember(variant);
    return variant;
  }
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
  pages.get('/', (req, res) => {
    res.set('Content-Security-Policy', META_CSP);
    res.sendFile(path.join(ROOT, landing(req, res) === 'quiz' ? 'quiz.html' : 'index.html'));
  });
  // The static ad opens the story page, whose buttons lead to the sales letter.
  for (const [route, file] of [['/hidden-payoff', 'story.html'], ['/order', 'order.html'], ['/upgrade', 'upgrade.html'], ['/confirmation', 'confirmation.html'], ['/terms', 'terms.html'], ['/privacy', 'privacy.html'], ['/app', 'app.html']]) {
    pages.get(route, (_req, res) => {
      if (file === 'order.html' || file === 'upgrade.html') res.set({ 'Content-Security-Policy': ORDER_CSP, 'Permissions-Policy': ORDER_PERMISSIONS });
      else if (file !== 'app.html') res.set('Content-Security-Policy', META_CSP);
      res.sendFile(path.join(ROOT, file));
    });
  }
  for (const file of ['content.js', 'page.js', 'purchase-notices.js', 'checkout.js', 'order.js', 'quiz.js', 'confirmation.js', 'style.css', 'order.css', 'quiz.css', 'app.js', 'app.css', 'engine.js', 'cutter-content.js', 'upgrade.js', 'upgrade.css', 'story.js', 'story.css']) {
    pages.get('/' + file, (_req, res) => res.sendFile(path.join(ROOT, file)));
  }
  pages.get('/assets/:file', (req, res) => {
    if (!/^[a-z0-9-]+\.(?:png|jpg|webp)$/.test(req.params.file) && !/^font-[a-z]+-[a-f0-9]{10}\.woff2$/.test(req.params.file)
      && !/^payment-(?:visa|mastercard|americanexpress|discover|cashapp|klarna)\.svg$/.test(req.params.file)) return res.sendStatus(404);
    if (/-[a-f0-9]{10}\.(?:webp|woff2)$/.test(req.params.file)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
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

  // One text to the owner's phone per sale. A failed text frees its claim so
  // the next confirmation or webhook retries it; it never blocks fulfillment.
  async function textOwner(sourceId, visitor, body) {
    if (typeof text !== 'function') return;
    try { await prisma.inspectEvent.create({ data: { name: 'PayoffSaleTexted', tool: 'payoff', sourceId, visitorId: visitor } }); }
    catch (error) { if (error.code !== 'P2002') console.error('Payoff sale text claim failed:', error.message); return; }
    try { await text(body); }
    catch (error) {
      await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
      console.error('Payoff sale text failed:', error.message);
    }
  }

  async function confirm(object, { retryMail = false, req = null, webhook = false } = {}) {
    const order = paidPurchase(object);
    if (!order) throw fail(402, 'This order has not been paid. If you were charged, contact support@bookmarketel.com.');
    const { ids, email, metadata } = order;
    const visitor = visitorId(metadata.visitorId);
    // Stripe retains every order. Owner, no-track and sandbox orders receive
    // confirmations but do not inflate the customer conversion ladder.
    if (order.livemode !== false && metadata.noTrack !== '1' && !isExcludedEmail(email || '')) {
      await record('PayoffPaid', visitor, `payoff-paid:${order.id}`, ids.join(','));
      await sendCapi('Purchase', {
        eventId: `payoff-purchase.${order.id}`,
        hotelId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        externalId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        email: email || '', fullName: order.name,
        // A webhook request is Stripe's, never the buyer's IP or browser.
        ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
        sourceUrl: metadata.sourceUrl || `${origin}/payoff`, fbp: metadata.fbp || '', fbc: metadata.fbc || '',
        value: PRICE(order.totalCents),
      });
      await textOwner(`payoff-sale-text:${order.id}`, visitor,
        `Payoff sale: $${(order.totalCents / 100).toFixed(2)} (${ids.map(id => ITEMS[id].name).join(' + ')}).`);
    }
    let emailSent = false;
    if (email && mail) {
      const sourceId = `payoff-access-mail:${order.id}`;
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
          await mail.sendMail(accessMail(email, order.id, [
            ...ids.map(id => `${ITEMS[id].name}: $${(ITEMS[id].cents / 100).toFixed(2)}`),
            ...(orderDiscount(order) ? ['Free gift: −$5.00'] : []),
            `Total paid: $${(order.totalCents / 100).toFixed(2)} USD. One payment, no subscription.`,
            `Order reference: ${order.id}`,
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
    return { paid: true, reference: order.id, totalCents: order.totalCents, items: ids.map(id => ITEMS[id].name), emailSent,
      access: accessToken(secret, order.id), extras: ids.filter(id => id !== 'base') };
  }
  // The latest charge carries the buyer's name for Meta's matching.
  const retrieve = id => id.startsWith('pi_') ? stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] }) : stripe.checkout.sessions.retrieve(id);
  // One email for every way of getting the link: after payment and on request.
  function accessMail(to, id, lines = []) {
    return { from: '"Marketel" <support@bookmarketel.com>', to, subject: 'Your Marketel Payoff link',
      text: [
        'Here is your Marketel Payoff. Open this link on your phone to see your debt-free date:', '',
        accessUrl(id), '',
        'Keep this email. The link opens your plan on any phone or computer. Your numbers stay on the device where you type them.', '',
        ...(lines.length ? [...lines, ''] : []),
        '30-day money-back guarantee: to request a refund, reply to this email or contact support@bookmarketel.com with your order reference. Refund eligibility is set out in the terms:',
        `${origin}/payoff/terms`,
      ].join('\n') };
  }

  // Interest Cutter. A paid one is its own succeeded PaymentIntent at one of
  // the listed prices, not refunded; its order points to it as `cutter`.
  function paidCutter(intent) {
    const metadata = intent?.metadata || {};
    if (intent?.object !== 'payment_intent' || metadata.product !== CUTTER.product || metadata.offerVersion !== CUTTER.version
      || intent.status !== 'succeeded' || intent.currency !== 'usd' || intent.amount_received !== CUTTER.prices[metadata.offer]) return null;
    if (intent.latest_charge && typeof intent.latest_charge === 'object' && (intent.latest_charge.refunded || intent.latest_charge.amount_refunded > 0)) return null;
    return { id: intent.id, parent: metadata.parentOrder, offer: metadata.offer, cents: intent.amount_received };
  }
  async function ownsCutter(parent) {
    const id = parent?.metadata?.cutter;
    if (!intentId(id)) return false;
    try { return !!paidCutter(await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] })); } catch { return false; }
  }
  const idOf = value => (typeof value === 'string' ? value : value?.id) || null;
  async function finishCutter(intent, { req = null, webhook = false } = {}) {
    const cutter = paidCutter(intent);
    if (!cutter || !accessId(cutter.parent)) throw fail(402, 'This upgrade has not been paid. If you were charged, contact support@bookmarketel.com.');
    const parent = await retrieve(cutter.parent);
    const order = paidPurchase(parent);
    if (!order) throw fail(409, 'We couldn’t find the order this upgrade belongs to. Contact support@bookmarketel.com.');
    if (parent.metadata?.cutter !== cutter.id) {
      const resource = parent.object === 'payment_intent' ? stripe.paymentIntents : stripe.checkout.sessions;
      await resource.update(parent.id, { metadata: { cutter: cutter.id } });
    }
    const metadata = order.metadata || {}, visitor = visitorId(metadata.visitorId);
    let firstTime = false;
    if (order.livemode !== false && metadata.noTrack !== '1' && !isExcludedEmail(order.email || '')) {
      try {
        await prisma.inspectEvent.create({ data: { name: 'PayoffUpgradePaid', tool: 'payoff', visitorId: visitor, sourceId: `payoff-cutter-paid:${cutter.id}`, detail: cutter.offer } });
        firstTime = true;
      } catch (error) { if (error.code !== 'P2002') throw error; }
    }
    if (firstTime) {
      // Its own event, so Meta keeps optimizing the ads for first purchases.
      await sendCapi('InterestCutterPurchase', {
        eventId: `payoff-cutter.${cutter.id}`, contentName: CUTTER.name,
        hotelId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        externalId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        email: order.email || '', fullName: order.name,
        ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
        sourceUrl: metadata.sourceUrl || `${origin}/payoff`, fbp: metadata.fbp || '', fbc: metadata.fbc || '',
        value: PRICE(cutter.cents),
      });
      await textOwner(`payoff-cutter-text:${cutter.id}`, visitor, `Payoff upsell: $${(cutter.cents / 100).toFixed(2)} (${CUTTER.name}).`);
    }
    if (order.email && mail) {
      const sourceId = `payoff-cutter-mail:${cutter.id}`;
      let claimed = false;
      try { await prisma.inspectEvent.create({ data: { name: 'PayoffUpgradeEmailed', tool: 'payoff', sourceId, visitorId: visitor } }); claimed = true; }
      catch (error) { if (error.code !== 'P2002') throw error; }
      if (claimed) {
        try {
          await mail.sendMail({ from: '"Marketel" <support@bookmarketel.com>', to: order.email, subject: 'Your Interest Cutter is ready',
            text: [
              'The Interest Cutter is now inside your Marketel Payoff, in its own tab at the top:', '',
              accessUrl(order.id), '',
              `Interest Cutter: $${(cutter.cents / 100).toFixed(2)} USD. One payment, no subscription.`,
              `Upgrade reference: ${cutter.id}`, `Order reference: ${order.id}`, '',
              'It’s covered by the same 30-day money-back guarantee as your order: reply to this email or contact support@bookmarketel.com with your reference. Refund eligibility is set out in the terms:',
              `${origin}/payoff/terms`,
            ].join('\n') });
        } catch (error) {
          await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
          console.error('Payoff upgrade email failed:', error.message);
        }
      }
    }
    return { paid: true, reference: cutter.id, value: PRICE(cutter.cents), access: accessToken(secret, order.id),
      extras: [...order.ids.filter(id => id !== 'base'), 'cutter'] };
  }
  const api = express.Router();
  api.use(express.json({ limit: '8kb' }));
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.get('/config', (req, res) => {
    const config = { available: available(), priceCents: ITEMS.base.cents, addOns: { cashflow: 2200, reset: 900 } };
    // Without a matching publishable key the order page falls back to hosted Checkout.
    if (config.available) config.stripeKey = inspectPublishableKey(env) || null;
    // Someone who took the quiz gets the $5 only by finishing it in time.
    const quiz = readQuiz(secret, quizCookie(req)), quizMissed = !!quiz && !quiz.earned;
    if (req.query.offer === '1' && config.available) {
      let token = offerCookie(req);
      if (!token && !quizMissed) {
        token = issueOffer(secret, now());
        res.cookie(OFFER.cookie, token, { httpOnly: true, secure: env.NODE_ENV !== 'test', sameSite: 'lax',
          path: '/api/payoff', maxAge: 90 * 24 * 60 * 60 * 1000 });
      }
      const offer = token ? readOffer(secret, token, now()) : null;
      if (offer) config.offer = { ...offer, basePriceCents: ITEMS.base.cents - offer.discountCents };
      config.serverNow = now();
    }
    if (req.query.offer === 'preview') {
      const token = offerCookie(req), existing = token ? readOffer(secret, token, now()) : null;
      config.checkoutOffer = { discountCents: config.available ? (token ? existing?.discountCents || 0 : quizMissed ? 0 : OFFER.discountCents) : 0,
        durationMs: OFFER.durationMs, loopMs: OFFER.loopMs, expiresAt: existing?.expiresAt || null };
      config.serverNow = now();
    }
    res.json(config);
  });
  // The quiz's deal: 'state' only looks, 'start' begins the window at the
  // first answer (once), 'finish' records reaching the plan (once).
  const quizDeal = fixed => guarded(async (req, res) => {
    rate(req, 'quiz', 120);
    const action = fixed || req.body?.action;
    if (!['state', 'start', 'finish'].includes(action)) throw fail(400, 'Unknown action.');
    let quiz = readQuiz(secret, quizCookie(req));
    const save = (startAt, finishAt) => {
      const token = issueQuiz(secret, startAt, finishAt, quiz?.nonce);
      res.cookie(QUIZ.cookie, token, { httpOnly: true, secure: env.NODE_ENV !== 'test', sameSite: 'lax', path: '/api/payoff', maxAge: 90 * 24 * 60 * 60 * 1000 });
      return readQuiz(secret, token);
    };
    if (secret && action !== 'state' && !quiz) quiz = save(now(), 0);
    if (secret && action === 'finish' && !quiz.finishAt) quiz = save(quiz.startAt, now());
    const token = offerCookie(req), offer = token ? readOffer(secret, token, now()) : null;
    res.json({ available: available(), windowMs: QUIZ.windowMs, discountCents: OFFER.discountCents, serverNow: now(),
      quiz: quiz ? { deadline: quiz.deadline, finished: !!quiz.finishAt, earned: quiz.earned } : null,
      checkoutOffer: offer ? { expiresAt: offer.expiresAt, discountCents: offer.discountCents, loopMs: offer.loopMs } : null });
  });
  api.get('/quiz', quizDeal('state'));
  api.post('/quiz', quizDeal(null));
  api.post('/event', guarded(async (req, res) => {
    if (!EVENTS.includes(req.body?.name)) throw fail(400, 'Unknown event.');
    if (noTrack(req)) return res.json({ ignored: true });
    rate(req, 'event', 300);
    const detail = EVENT_DETAILS[req.body.name]?.includes(req.body.detail) ? req.body.detail : null;
    if (EVENT_DETAILS[req.body.name] && !detail && req.body.name !== 'PayoffFrom') throw fail(400, 'Unknown event.');
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
  // What either checkout charges: the items, the buyer's email, the ad click
  // and the checkout offer if it is still running. The total is the server's.
  function quote(req) {
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
    const offer = req.body?.useCheckoutOffer === true ? readOffer(secret, offerCookie(req), now()) : null;
    const discount = offer?.discountCents || 0;
    const total = ids.reduce((sum, id) => sum + ITEMS[id].cents, 0) - discount;
    if (req.body?.expectedTotalCents !== undefined && req.body.expectedTotalCents !== total) {
      throw fail(409, 'The checkout offer has ended or your order changed. Review the updated total and continue when you’re ready.');
    }
    if (discount) Object.assign(metadata, { checkoutDiscountVersion: OFFER.version, checkoutDiscountCents: String(discount) });
    return { ids, attempt, email, visitor, attribution, metadata, discount, total };
  }
  const initiated = (order, req) => order.visitor && !order.metadata.noTrack && !isExcludedEmail(order.email)
    ? sendCapi('InitiateCheckout', { eventId: `payoff-checkout.${order.visitor}`, value: PRICE(order.total), email: order.email, ...visitorCapi(order.visitor, order.attribution, req) })
    : null;
  // The order page's own payment form: Stripe's fields on our page, charged
  // only when the buyer taps Complete Order. Retrying the same order (after a
  // declined card, say) returns the same payment.
  api.post('/pay', guarded(async (req, res) => {
    const order = quote(req);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([order.attempt, order.ids, order.email, order.metadata.fbp, order.metadata.fbc, order.discount, 'embedded-v2'])).digest('hex');
    // A card is kept for this visit only (on_session), so the Interest Cutter
    // offer right after can charge it with one click. Wallets and other
    // methods pay again on that page.
    const customer = await stripe.customers.create({ email: order.email, metadata: { product: PRODUCT } }, { idempotencyKey: `payoff-customer:${fingerprint}` });
    const intent = await stripe.paymentIntents.create({
      amount: order.total, currency: 'usd', automatic_payment_methods: { enabled: true }, customer: customer.id,
      payment_method_options: { card: { setup_future_usage: 'on_session' } },
      receipt_email: order.email, description: order.ids.map(id => ITEMS[id].name).join(' + '),
      metadata: { ...order.metadata, checkout: 'embedded', email: order.email.toLowerCase() },
    }, { idempotencyKey: `payoff-pay:${fingerprint}` });
    if (!intent.client_secret) throw fail(502, 'Payment could not start. Please try again.');
    await initiated(order, req);
    res.json({ id: intent.id, clientSecret: intent.client_secret, value: PRICE(order.total) });
  }));
  // Stripe's hosted page: what the order page uses when its own form can't load.
  api.post('/checkout', guarded(async (req, res) => {
    const { ids, attempt, email, metadata, discount, total, ...order } = quote(req);
    const coupon = discount ? await checkoutCoupon() : null;
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, ids, email, metadata.fbp, metadata.fbc, discount, coupon, 'dashboard-methods-v1'])).digest('hex');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', submit_type: 'pay', customer_email: email,
      line_items: ids.map(id => ({ quantity: 1, price_data: { currency: 'usd', unit_amount: ITEMS[id].cents,
        product_data: { name: ITEMS[id].name, description: DESCRIPTIONS[id] } } })),
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      custom_text: { submit: { message: 'Your plan opens as soon as you pay, and we email you the link. One payment, no subscription. 30-day money-back guarantee: see our terms for refund eligibility.' } },
      success_url: `${origin}/payoff/upgrade?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payoff/order?cancelled=1`,
      metadata, payment_intent_data: { metadata },
    }, { idempotencyKey: `payoff:${fingerprint}` });
    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) throw fail(502, 'Checkout could not open. Please try again.');
    await initiated({ ...order, email, metadata, total }, req);
    res.json({ url: session.url, value: PRICE(total) });
  }));
  api.post('/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Order confirmation is temporarily unavailable.');
    rate(req, 'confirm', 60);
    const id = sessionId(req.body?.sessionId) || intentId(req.body?.paymentIntent);
    if (!id) throw fail(400, 'The order reference is invalid.');
    let object;
    try { object = await retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    if (object.object === 'payment_intent' && object.status === 'processing') {
      return res.status(202).json({ processing: true, message: 'Your bank is still confirming the payment. We’ll email your Payoff link as soon as it clears.' });
    }
    if (object.object === 'payment_intent' && object.status !== 'succeeded') {
      throw fail(402, 'Your payment didn’t go through and you weren’t charged. Go back to checkout to try again.');
    }
    const result = await confirm(object, { req });
    // Whether the Interest Cutter offer can charge this order's card in one click.
    res.json({ ...result, oneClick: await savedCard(object) !== null });
  }));
  // A card (not a wallet: Apple Pay can't be reused while the buyer is
  // present) kept on this order's customer for this visit.
  async function savedCard(parent) {
    const customer = parent?.object === 'payment_intent' ? idOf(parent.customer) : null;
    const methodId = parent?.object === 'payment_intent' ? idOf(parent.payment_method) : null;
    if (!customer || !methodId) return null;
    const method = await stripe.paymentMethods.retrieve(methodId).catch(() => null);
    return method?.type === 'card' && !method.card?.wallet && idOf(method.customer) === customer ? method : null;
  }
  // The Interest Cutter offer. The order is the payment just made (the
  // one-time prices hold for CUTTER.windowMs after it) or the buyer's access
  // link (the regular price, any time). A card kept from that payment is
  // charged in one click; anything else (Apple Pay, Google Pay, Klarna, bank,
  // a hosted-checkout order) gets a client secret for a payment form.
  async function upgradeOrder(req) {
    const byLink = verifyAccess(secret, req.body?.access);
    const id = byLink || intentId(req.body?.paymentIntent) || sessionId(req.body?.sessionId);
    if (!id || id.startsWith('own_')) throw fail(400, 'Open this from your Payoff link.');
    let parent;
    try { parent = await retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    const order = paidPurchase(parent);
    if (!order) throw fail(402, 'This order has not been paid yet.');
    return { parent, order };
  }
  api.post('/upgrade', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'The upgrade is temporarily unavailable. Your plan is ready in Payoff.');
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open this on bookmarketel.com.');
    rate(req, 'upgrade', 30);
    const offer = req.body?.offer;
    if (!Object.hasOwn(CUTTER.prices, offer)) throw fail(400, 'Unknown offer.');
    const { parent, order } = await upgradeOrder(req);
    if (offer !== 'regular' && now() - parent.created * 1000 > CUTTER.windowMs) throw fail(410, 'This one-time offer has ended. The Interest Cutter is still in its tab inside Payoff.');
    if (await ownsCutter(parent)) throw fail(409, 'You already have the Interest Cutter. It’s in its tab inside Payoff.');
    const cents = CUTTER.prices[offer];
    const customer = parent.object === 'payment_intent' ? idOf(parent.customer) : null;
    const metadata = { product: CUTTER.product, offerVersion: CUTTER.version, offer, parentOrder: order.id,
      visitorId: order.metadata?.visitorId || '', noTrack: order.metadata?.noTrack || '', email: String(order.email || '').toLowerCase() };
    const base = { amount: cents, currency: 'usd', description: CUTTER.name, metadata,
      ...(order.email ? { receipt_email: order.email } : {}), ...(customer ? { customer } : {}) };
    // The card is kept for the visit of the order only: the regular price,
    // bought later from inside Payoff, always uses the payment form.
    const saved = req.body?.method === 'form' || offer === 'regular' ? null : await savedCard(parent);
    if (saved) {
      try {
        const intent = await stripe.paymentIntents.create({ ...base, payment_method: saved.id, payment_method_types: ['card'], confirm: true },
          { idempotencyKey: `payoff-cutter:${order.id}:${offer}:saved` });
        if (intent.status === 'succeeded') {
          return res.json(await finishCutter(await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] }), { req }));
        }
        if (intent.status === 'requires_action' && intent.client_secret) return res.json({ next: 'action', id: intent.id, clientSecret: intent.client_secret });
      } catch (error) {
        if (error.type !== 'StripeCardError') throw error;
        return res.json({ next: 'form', declined: error.message || 'Your card was declined.', ...(await upgradeForm(base, order, offer)) });
      }
    }
    res.json({ next: 'form', ...(await upgradeForm(base, order, offer)) });
  }));
  async function upgradeForm(base, order, offer) {
    const intent = await stripe.paymentIntents.create({ ...base, automatic_payment_methods: { enabled: true } },
      { idempotencyKey: `payoff-cutter:${order.id}:${offer}:form` });
    if (!intent.client_secret) throw fail(502, 'Payment could not start. Please try again.');
    return { id: intent.id, clientSecret: intent.client_secret, amount: base.amount };
  }
  api.post('/upgrade/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Upgrade confirmation is temporarily unavailable.');
    rate(req, 'upgrade-confirm', 60);
    const id = intentId(req.body?.paymentIntent);
    if (!id) throw fail(400, 'The upgrade reference is invalid.');
    let intent;
    try { intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] }); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Upgrade not found.'); throw error; }
    if (intent.metadata?.product !== CUTTER.product) throw fail(404, 'Upgrade not found.');
    if (intent.status === 'processing') return res.status(202).json({ processing: true, message: 'Your bank is still confirming the payment. The Interest Cutter unlocks as soon as it clears.' });
    if (intent.status !== 'succeeded') throw fail(402, 'That payment didn’t go through and you weren’t charged.');
    res.json(await finishCutter(intent, { req }));
  }));
  api.post('/access', guarded(async (req, res) => {
    rate(req, 'access', 120);
    const id = verifyAccess(secret, req.body?.token);
    if (!id) throw fail(403, 'This link is not valid. Use the link in your Payoff email, or ask for a new one.');
    // Which extras the order included comes from Stripe each time; if Stripe
    // can't answer, the app keeps what it last knew (extras: null).
    if (id.startsWith('own_')) return res.json({ ok: true, extras: [...EXTRAS, 'cutter'] });
    let extras = null;
    try {
      const object = stripe && await retrieve(id);
      const order = object && paidPurchase(object);
      if (order) extras = [...order.ids.filter(item => item !== 'base'), ...(await ownsCutter(object) ? ['cutter'] : [])];
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
    if (!id) {
      // Payments made in the order page's form carry the email in metadata.
      const found = await stripe.paymentIntents.search({ limit: 20,
        query: `status:'succeeded' AND metadata['email']:'${email.toLowerCase().replace(/['\\]/g, '\\$&')}'` });
      id = (found.data || []).find(intent => paidIntent(intent))?.id || null;
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
    if (event.type === 'payment_intent.succeeded') {
      const object = event.data?.object;
      if (object?.metadata?.product === CUTTER.product) {
        if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Upgrade confirmation is unavailable.');
        await finishCutter(await stripe.paymentIntents.retrieve(object.id, { expand: ['latest_charge'] }), { webhook: true });
        return true;
      }
      if (object?.metadata?.product !== PRODUCT || object.metadata.checkout !== 'embedded') return false;
      if (!stripe || !prisma?.inspectEvent || !mail) throw fail(503, 'Order confirmation is unavailable.');
      await confirm(await retrieve(object.id), { retryMail: true, webhook: true });
      return true;
    }
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
      || !isPayoff(event.data?.object?.metadata)) return false;
    if (!stripe || !prisma?.inspectEvent || !mail) throw fail(503, 'Order confirmation is unavailable.');
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status === 'paid') await confirm(session, { retryMail: true, webhook: true });
    return true;
  } };
}
module.exports = { registerPayoff, paidOrder, paidIntent, basket, verifyAccess, accessToken, ITEMS, VERSION, PRODUCT, PREORDER, VARIANTS, QUIZ_STEPS, CUTTER };
