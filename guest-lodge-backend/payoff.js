'use strict';

// Payoff is sold once and opens straight after payment. Stripe is the durable
// order ledger; no financial inputs or payment details are stored here. The
// buyer's numbers stay in their browser (payoff-web/app.js), and reach the
// server only with a question to the Coach, which keeps nothing.
const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { sanitizeInspectAttribution, inspectPublishableKey } = require('./inspect');
const { OFFER, issueOffer, readOffer, offerCookie, orderDiscount, QUIZ, issueQuiz, readQuiz, quizCookie } = require('./payoff-offer');
const { COACH, askCoach, cleanPlan } = require('./payoff-coach');

const PRODUCT = 'marketel-payoff';
// v2 records the $33.11 base price; v1 receipts retain their $33/$28 amounts.
const VERSION = 'payoff-v2';
const LEGACY_VERSION = 'payoff-v1';
// Paid preorders from before the tool existed open it too, with their extras.
const PREORDER = Object.freeze({ product: 'marketel-payoff-preorder', version: 'payoff-preorder-v1' });
const EXTRAS = Object.freeze(['cashflow', 'reset']);
const DESCRIPTIONS = Object.freeze({
  base: 'Regular price was $375. Sale price $33.11. Your debt payoff plan opens right after payment. 30-day money-back guarantee.',
  cashflow: 'Income, bills and debt payments on one calendar, with your projected balance up to 18 months ahead. Opens inside Payoff.',
  reset: 'A spending reset you set up and track day by day. Opens inside Payoff.',
});
const ITEMS = Object.freeze({
  base: { name: 'Marketel Payoff', cents: 3311 },
  cashflow: { name: 'Cash-flow calendar', cents: 2200 },
  reset: { name: 'Spending reset', cents: 900 },
});
// The Coach is the one upsell: a subscription (COACH in payoff-coach.js) on the
// order's Stripe customer, linked to the order through `parentOrder` and
// recorded on it as `coach`. Right after paying, a card kept from the order
// starts it in one tap for COACH_WINDOW_MS; otherwise Stripe's checkout.
const COACH_WINDOW_MS = 30 * 60 * 1000;
const ROOT = path.join(__dirname, 'payoff-web');
const EVENTS = ['PayoffLanded', 'PayoffFrom', 'PayoffVariant', 'PayoffQuizStep', 'PayoffOrderViewed', 'PayoffCheckoutTapped', 'PayoffCheckoutOpened', 'PayoffCheckoutFailed', 'PayoffCheckoutCancelled',
  'PayoffUpgradeViewed', 'PayoffUpgradeAccepted', 'PayoffUpgradeDeclined', 'PayoffUpgradeExpired', 'PayoffStory', 'PayoffLetter', 'PayoffOrder', 'PayoffCoach', 'PayoffAd', 'PayoffEntry', 'PayoffShow'];
// The A/B test on the landing: the sales letter or the quiz, kept per visitor.
const VARIANTS = Object.freeze(['letter', 'quiz']);
const VARIANT_COOKIE = 'payoff_variant';
// The landing test (Oct 28): new visitors to the story page the ads open are
// split between it and going straight to the sales letter, as the reference
// funnel does. The cookie keeps each visitor on one side; the page they land
// on reads it to record their side (PayoffEntry).
const ENTRY_COOKIE = 'payoff_entry';
// The landing test's sides. 'story' is the page the ads link to; since Oct 29
// the test is the sales letter vs the one-page product page ('show'), and
// visitors already on the story side keep it.
const ENTRIES = Object.freeze(['story', 'letter', 'show']);
const QUIZ_STEPS = Object.freeze(['q1', 'q2', 'why-interest', 'why-order', 'why-tracking', 'why-life', 'card-1', 'cards', 'reveal', 'extra', 'plan', 'unlock']);
// 'offer', 'discount' and 'regular' were the Interest Cutter's pages; they
// stay so older rows still read. The Coach's page is 'coach', its plans
// 'month' and 'year'.
const UPGRADE_OFFERS = ['offer', 'discount', 'regular', 'coach', 'month', 'year'];
// measure.js: seconds on screen, and the sales letter's sections in page order.
const ON_SCREEN = ['time10', 'time60', 'time180'];
const LETTER_SECTIONS = ['problem', 'example', 'mechanism', 'proof', 'founder', 'included', 'faq'];
const EVENT_DETAILS = Object.freeze({ PayoffFrom: ['ad', 'social', 'direct', 'other'], PayoffVariant: VARIANTS, PayoffEntry: ENTRIES, PayoffQuizStep: QUIZ_STEPS,
  PayoffUpgradeViewed: UPGRADE_OFFERS, PayoffUpgradeAccepted: UPGRADE_OFFERS, PayoffUpgradeDeclined: UPGRADE_OFFERS, PayoffUpgradeExpired: UPGRADE_OFFERS,
  PayoffStory: ['viewed', 'scroll25', 'scroll50', 'scroll75', 'scroll100', 'button', 'tapped', ...ON_SCREEN],
  PayoffLetter: [...ON_SCREEN, ...LETTER_SECTIONS, 'end', ...['hero', ...LETTER_SECTIONS, 'other'].map(place => 'tap-' + place), 'faq-open', 'math-open'],
  PayoffOrder: [...ON_SCREEN, 'cart', 'form20', 'saw-form', 'saw-addons', 'saw-button', 'stripe-ready', 'hosted', 'wallet-shown', 'wallet-tap', 'top-card', 'name', 'email',
    'card-start', 'card-done', 'method-bank', 'method-klarna', 'method-link', 'addon-cashflow', 'addon-reset', 'missing-name', 'missing-email', 'card-incomplete', 'declined', 'error'],
  // The product page: how far down they got, which order option and which button.
  PayoffShow: ['viewed', ...ON_SCREEN, 'saw-buy', 'saw-math', 'saw-reviews', 'end', 'tap-buy', 'tap-sticky', 'tap-final', 'option-1', 'option-2', 'option-3'],
  // The Coach tab inside Payoff: opened, agreed to send their numbers, asked, tapped to start it.
  PayoffCoach: ['opened', 'consent', 'asked', 'start-month', 'start-year', 'manage'] });
const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const sessionId = value => typeof value === 'string' && /^cs_(?:live|test)_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
const intentId = value => typeof value === 'string' && /^pi_[A-Za-z0-9]{8,200}$/.test(value) ? value : null;
// PayoffAd's detail is the Meta ad id from the ad's utm_content tag.
const adId = value => typeof value === 'string' && /^\d{6,25}$/.test(value) ? value : null;
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
// Existing receipts and payments still in flight keep the price they bought.
const paidBasePrice = metadata => {
  if (metadata?.product === PRODUCT && metadata.offerVersion === VERSION) return ITEMS.base.cents;
  if ((metadata?.product === PRODUCT && metadata.offerVersion === LEGACY_VERSION)
    || (metadata?.product === PREORDER.product && metadata.offerVersion === PREORDER.version)) return 3300;
  return null;
};
const paidTotal = (ids, base) => ids.reduce((sum, id) => sum + (id === 'base' ? base : ITEMS[id].cents), 0);
function paidOrder(session) {
  const base = paidBasePrice(session?.metadata);
  const preorder = session?.metadata?.product === PREORDER.product && session.metadata.offerVersion === PREORDER.version;
  if (base === null || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid'
    || session.currency !== 'usd') return null;
  let ids;
  try { ids = basket(JSON.parse(session.metadata.addons)); } catch { return null; }
  const discount = orderDiscount(session);
  if (discount === null || (preorder && discount)) return null;
  if (session.amount_total !== paidTotal(ids, base) - discount) return null;
  return ids;
}
// A payment made in the order page's own form. A hosted session's
// PaymentIntent carries the same product but not `checkout: embedded`, so it
// is only ever counted through its session.
function paidIntent(intent) {
  const metadata = intent?.metadata || {};
  const base = paidBasePrice(metadata);
  if (intent?.object !== 'payment_intent' || metadata.product !== PRODUCT || base === null || metadata.checkout !== 'embedded'
    || intent.status !== 'succeeded' || intent.currency !== 'usd') return null;
  let ids;
  try { ids = basket(JSON.parse(metadata.addons)); } catch { return null; }
  const discount = orderDiscount(intent);
  if (discount === null || intent.amount_received !== paidTotal(ids, base) - discount) return null;
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
function registerPayoff(app, { stripe, mail, prisma, isExcludedEmail = () => false, queueCapi = null, capiConfigured = false, text = null, env = process.env, now = Date.now, quizShare, entryShare, random = Math.random, coachClient = null }) {
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
  // The share of new story-page visitors sent straight to the letter; the rest
  // get the product page (PAYOFF_ENTRY_SHARE overrides; 0 ends the test with
  // everyone on the story page the ads link to, 1 with everyone on the letter).
  const letterShare = Math.min(1, Math.max(0, Number(entryShare ?? env.PAYOFF_ENTRY_SHARE ?? (env.NODE_ENV === 'test' ? 0 : 0.5)) || 0));
  function entry(req, res) {
    // ?entry=story, letter or show shows that side without joining the test.
    if (ENTRIES.includes(req.query.entry)) return req.query.entry;
    if (letterShare === 0 || letterShare === 1) return letterShare ? 'letter' : 'story';
    const saved = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${ENTRY_COOKIE}=`))?.slice(ENTRY_COOKIE.length + 1);
    if (ENTRIES.includes(saved)) return saved;
    // Crawlers and Meta's ad review see the page the ad links to, with no cookie.
    if (automated(req) || /facebookexternalhit|Facebot/i.test(req.headers['user-agent'] || '')) return 'story';
    const side = random() < letterShare ? 'letter' : 'show';
    // Readable by the page (it holds only the side), so the page can record it.
    res.cookie(ENTRY_COOKIE, side, { httpOnly: false, secure: env.NODE_ENV !== 'test', sameSite: 'lax', path: '/payoff', maxAge: 90 * 24 * 60 * 60 * 1000 });
    return side;
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
  // The static ad opens the story page, whose buttons lead to the sales letter;
  // the landing test sends its sides straight to the sales letter or to the
  // product page instead, keeping the ad's click id and tags.
  pages.get('/hidden-payoff', (req, res, next) => {
    const side = entry(req, res);
    if (side === 'story') return next();
    const query = new URLSearchParams(req.originalUrl.split('?')[1] || '');
    query.delete('entry'); query.delete('v');
    if (side === 'show') return res.redirect(302, `/payoff/show${query.toString() ? '?' + query : ''}`);
    res.redirect(302, `/payoff?v=letter${query.toString() ? '&' + query : ''}`);
  });
  for (const [route, file] of [['/hidden-payoff', 'story.html'], ['/show', 'show.html'], ['/order', 'order.html'], ['/upgrade', 'upgrade.html'], ['/confirmation', 'confirmation.html'], ['/terms', 'terms.html'], ['/privacy', 'privacy.html'], ['/app', 'app.html']]) {
    pages.get(route, (_req, res) => {
      if (file === 'order.html' || file === 'upgrade.html') res.set({ 'Content-Security-Policy': ORDER_CSP, 'Permissions-Policy': ORDER_PERMISSIONS });
      else if (file !== 'app.html') res.set('Content-Security-Policy', META_CSP);
      res.sendFile(path.join(ROOT, file));
    });
  }
  for (const file of ['content.js', 'page.js', 'purchase-notices.js', 'checkout.js', 'order.js', 'quiz.js', 'confirmation.js', 'style.css', 'order.css', 'quiz.css', 'app.js', 'app.css', 'engine.js', 'cutter-content.js', 'upgrade.js', 'upgrade.css', 'story.js', 'story.css', 'measure.js', 'show.js', 'show.css']) {
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
            ...ids.map(id => `${ITEMS[id].name}: $${((id === 'base' ? paidBasePrice(order.metadata) : ITEMS[id].cents) / 100).toFixed(2)}`),
            ...(orderDiscount(order) ? ['Discount: −$5.00'] : []),
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

  const idOf = value => (typeof value === 'string' ? value : value?.id) || null;
  // The Coach's two prices, found by lookup key and created once if missing.
  let coachPricesPromise;
  function coachPrices() {
    if (!coachPricesPromise) coachPricesPromise = (async () => {
      const plans = Object.entries(COACH.plans);
      const found = await stripe.prices.list({ lookup_keys: plans.map(([, info]) => info.lookup), active: true, limit: 10 });
      const byKey = new Map((found.data || []).map(price => [price.lookup_key, price]));
      const product = plans.every(([, info]) => byKey.has(info.lookup)) ? null : await coachProduct();
      const prices = {};
      for (const [plan, info] of plans) {
        const price = byKey.get(info.lookup) || await stripe.prices.create({ product, currency: 'usd', unit_amount: info.cents,
          recurring: { interval: info.interval }, lookup_key: info.lookup, nickname: `${COACH.name}, ${info.label}` }, { idempotencyKey: `payoff-coach-price:${info.lookup}` });
        if (price.unit_amount !== info.cents || price.currency !== 'usd' || price.recurring?.interval !== info.interval) throw fail(503, 'The Coach is temporarily unavailable. Your plan is ready in Payoff.');
        prices[plan] = price.id;
      }
      return prices;
    })().catch(error => { coachPricesPromise = null; throw error; });
    return coachPricesPromise;
  }
  async function coachProduct() {
    try { return (await stripe.products.retrieve(COACH.product)).id; }
    catch (error) { if (error.code !== 'resource_missing') throw error; }
    return (await stripe.products.create({ id: COACH.product, name: COACH.name,
      description: 'Ask anything about your Payoff plan, with lower-rate tools, call scripts, the cash-flow calendar and the spending reset.' },
    { idempotencyKey: `payoff-coach-product:${COACH.version}` })).id;
  }
  // A Coach subscription that has started: ours, on a listed plan, for a paid order.
  function startedCoach(subscription) {
    const metadata = subscription?.metadata || {};
    if (subscription?.object !== 'subscription' || metadata.product !== COACH.product || metadata.offerVersion !== COACH.version
      || !Object.hasOwn(COACH.plans, metadata.plan) || !accessId(metadata.parentOrder) || !COACH.active.includes(subscription.status)) return null;
    return { id: subscription.id, parent: metadata.parentOrder, plan: metadata.plan, cents: COACH.plans[metadata.plan].cents };
  }
  // The Coach a paid order has, if it is still running: the order records it as `coach`.
  async function coachOf(parent) {
    const id = parent?.metadata?.coach;
    if (typeof id !== 'string' || !/^sub_[A-Za-z0-9]{8,200}$/.test(id)) return null;
    const subscription = await stripe.subscriptions.retrieve(id).catch(() => null);
    return startedCoach(subscription) && subscription.metadata.parentOrder === parent.id ? subscription : null;
  }
  // What the order opens: its extras, and with the Coach everything it includes.
  const extrasFor = (order, coach) => [...new Set([...order.ids.filter(id => id !== 'base'), ...(coach ? ['coach', ...EXTRAS] : [])])];
  async function finishCoach(subscription, { req = null, webhook = false } = {}) {
    const coach = startedCoach(subscription);
    if (!coach) throw fail(402, 'The Coach hasn’t started. If you were charged, contact support@bookmarketel.com.');
    const parent = await retrieve(coach.parent);
    const order = paidPurchase(parent);
    if (!order) throw fail(409, 'We couldn’t find the order the Coach belongs to. Contact support@bookmarketel.com.');
    if (parent.metadata?.coach !== coach.id) {
      const resource = parent.object === 'payment_intent' ? stripe.paymentIntents : stripe.checkout.sessions;
      await resource.update(parent.id, { metadata: { coach: coach.id } });
    }
    const metadata = order.metadata || {}, visitor = visitorId(metadata.visitorId), plan = COACH.plans[coach.plan];
    let firstTime = false;
    if (order.livemode !== false && metadata.noTrack !== '1' && !isExcludedEmail(order.email || '')) {
      try {
        await prisma.inspectEvent.create({ data: { name: 'PayoffCoachPaid', tool: 'payoff', visitorId: visitor, sourceId: `payoff-coach-paid:${coach.id}`, detail: coach.plan } });
        firstTime = true;
      } catch (error) { if (error.code !== 'P2002') throw error; }
    }
    if (firstTime) {
      // Its own event, so Meta keeps optimizing the ads for first purchases.
      await sendCapi('CoachSubscribe', {
        eventId: `payoff-coach.${coach.id}`, contentName: COACH.name,
        hotelId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        externalId: visitor ? `payoff-visitor:${visitor}` : `payoff-session:${order.id}`,
        email: order.email || '', fullName: order.name,
        ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
        sourceUrl: metadata.sourceUrl || `${origin}/payoff`, fbp: metadata.fbp || '', fbc: metadata.fbc || '',
        value: PRICE(coach.cents),
      });
      await textOwner(`payoff-coach-text:${coach.id}`, visitor, `Payoff Coach started: ${plan.label}.`);
    }
    if (order.email && mail) {
      const sourceId = `payoff-coach-mail:${coach.id}`;
      let claimed = false;
      try { await prisma.inspectEvent.create({ data: { name: 'PayoffCoachEmailed', tool: 'payoff', sourceId, visitorId: visitor } }); claimed = true; }
      catch (error) { if (error.code !== 'P2002') throw error; }
      if (claimed) {
        try {
          await mail.sendMail({ from: '"Marketel" <support@bookmarketel.com>', to: order.email, subject: 'Your Payoff Coach is on',
            text: [
              'Your Payoff Coach is ready in the Coach tab at the top of Payoff:', '',
              accessUrl(order.id), '',
              `Payoff Coach: ${plan.label} until you cancel. It renews automatically each ${plan.interval}.`,
              'Cancel any time: in Payoff, open the Coach tab and tap “Manage or cancel”, or reply to this email. It stays on until the end of the time you’ve paid for.',
              `Subscription reference: ${coach.id}`, `Order reference: ${order.id}`, '',
              'Your first payment is covered by the same 30-day money-back guarantee as your order. Terms:',
              `${origin}/payoff/terms`,
            ].join('\n') });
        } catch (error) {
          await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
          console.error('Payoff coach email failed:', error.message);
        }
      }
    }
    return { paid: true, reference: coach.id, plan: coach.plan, value: PRICE(coach.cents), access: accessToken(secret, order.id), extras: extrasFor(order, true) };
  }
  const api = express.Router();
  // A Coach question carries the buyer's plan and the last few turns.
  const smallBody = express.json({ limit: '8kb' }), coachBody = express.json({ limit: '48kb' });
  api.use((req, res, next) => (req.path === '/coach/ask' ? coachBody : smallBody)(req, res, next));
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
    const detail = req.body.name === 'PayoffAd' ? adId(req.body.detail) : EVENT_DETAILS[req.body.name]?.includes(req.body.detail) ? req.body.detail : null;
    if ((EVENT_DETAILS[req.body.name] || req.body.name === 'PayoffAd') && !detail && req.body.name !== 'PayoffFrom') throw fail(400, 'Unknown event.');
    const visitor = visitorId(req.body.visitorId);
    await record(req.body.name, visitor, null, detail);
    // The server's copy of the pixel's PageView, with that page load's id, so
    // Meta still counts views the browser pixel misses (blockers, iPhone).
    const viewPrefix = `payoff-pv.${visitor}.`;
    const pageView = visitor && typeof req.body.pageView === 'string' && req.body.pageView.startsWith(viewPrefix)
      && /^[a-z0-9]{6,16}$/.test(req.body.pageView.slice(viewPrefix.length)) ? req.body.pageView : null;
    if (pageView && ['PayoffLanded', 'PayoffOrderViewed'].includes(req.body.name)) {
      const page = typeof req.body.page === 'string' && req.body.page.length <= 500 && req.body.page.startsWith(`${origin}/payoff`) ? req.body.page : null;
      const attribution = sanitizeInspectAttribution(req.body.attribution, req) || {};
      await sendCapi('PageView', { eventId: pageView, ...visitorCapi(visitor, page ? { ...attribution, sourceUrl: page } : attribution, req) });
    }
    // Meta's AddToCart is staying 20 seconds on the order page, or starting to
    // pay sooner (measure.js), not a glance at it; the browser pixel sends the
    // same event id.
    if (req.body.name === 'PayoffOrder' && detail === 'cart' && visitor) {
      await sendCapi('AddToCart', { eventId: `payoff-cart.${visitor}`, value: PRICE(ITEMS.base.cents),
        ...visitorCapi(visitor, sanitizeInspectAttribution(req.body.attribution, req) || {}, req) });
    }
    // Typing a valid email on the order page is the first step of paying:
    // a custom event Meta can learn from, without the email itself.
    if (req.body.name === 'PayoffOrder' && detail === 'email' && visitor) {
      await sendCapi('StartedPaying', { eventId: `payoff-started.${visitor}`, value: PRICE(ITEMS.base.cents),
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
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([order.attempt, order.ids, order.email, order.metadata.fbp, order.metadata.fbc, order.discount, order.total, 'embedded-v2'])).digest('hex');
    // A card is kept for this visit only (on_session), so the Coach offer
    // right after can start in one tap. Wallets and other methods go through
    // Stripe's checkout on that page.
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
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, ids, email, metadata.fbp, metadata.fbc, discount, coupon, total, 'dashboard-methods-v1'])).digest('hex');
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
    // Whether the Coach can start on this order's card in one tap.
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
  // The order behind a Coach request: the payment just made, or the buyer's
  // access link (from inside Payoff, any time).
  async function upgradeOrder(req) {
    const byLink = verifyAccess(secret, req.body?.access);
    const id = byLink || intentId(req.body?.paymentIntent) || sessionId(req.body?.sessionId);
    if (!id || id.startsWith('own_')) throw fail(400, 'Open this from your Payoff link.');
    let parent;
    try { parent = await retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    const order = paidPurchase(parent);
    if (!order) throw fail(402, 'This order has not been paid yet.');
    return { parent, order, byLink: !!byLink };
  }
  // Starting the Coach. Right after paying, a card kept from the order starts
  // it in one tap; if that card needs another step or is declined, and from
  // inside Payoff, Stripe's checkout takes the payment (Apple Pay, Google Pay
  // or any card) and returns to Payoff.
  api.post('/coach/subscribe', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'The Coach is temporarily unavailable. Your plan is ready in Payoff.');
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open this on bookmarketel.com.');
    rate(req, 'coach-subscribe', 30);
    const plan = req.body?.plan;
    if (!Object.hasOwn(COACH.plans, plan)) throw fail(400, 'Choose monthly or yearly.');
    const { parent, order, byLink } = await upgradeOrder(req);
    if (await coachOf(parent)) throw fail(409, 'You already have the Coach. It’s in the Coach tab inside Payoff.');
    const prices = await coachPrices();
    const metadata = { product: COACH.product, offerVersion: COACH.version, plan, parentOrder: order.id,
      visitorId: order.metadata?.visitorId || '', noTrack: order.metadata?.noTrack || '', email: String(order.email || '').toLowerCase() };
    const customer = idOf(parent.customer);
    const saved = !byLink && req.body?.method !== 'checkout' && now() - parent.created * 1000 <= COACH_WINDOW_MS ? await savedCard(parent) : null;
    let declined = null;
    if (saved) {
      let subscription = null;
      try {
        subscription = await stripe.subscriptions.create({ customer, items: [{ price: prices[plan] }], default_payment_method: saved.id,
          payment_behavior: 'allow_incomplete', payment_settings: { save_default_payment_method: 'on_subscription' }, metadata },
        { idempotencyKey: `payoff-coach:${order.id}:${plan}:saved` });
      } catch (error) {
        if (error.type !== 'StripeCardError') throw error;
      }
      if (subscription?.status === 'active') return res.json(await finishCoach(subscription, { req }));
      // A card that needs another step, or was declined: nothing is left running.
      if (subscription && subscription.status !== 'incomplete_expired') await stripe.subscriptions.cancel(subscription.id).catch(() => {});
      declined = 'Your card needs another step. Finish on the secure checkout, or use Apple Pay, Google Pay or another card.';
    }
    const attempt = typeof req.body?.attempt === 'string' && /^[a-f0-9-]{16,64}$/.test(req.body.attempt) ? req.body.attempt : crypto.randomUUID();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', line_items: [{ price: prices[plan], quantity: 1 }],
      ...(customer ? { customer } : order.email ? { customer_email: order.email } : {}),
      metadata, subscription_data: { metadata },
      custom_text: { submit: { message: `Payoff Coach: ${COACH.plans[plan].label} until you cancel. Cancel any time in Payoff’s Coach tab.` } },
      success_url: `${origin}/payoff/app?coach=done&coach_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payoff/app?coach=cancelled`,
    }, { idempotencyKey: `payoff-coach-checkout:${order.id}:${plan}:${attempt}` });
    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) throw fail(502, 'Checkout could not open. Please try again.');
    res.json({ next: 'checkout', url: session.url, ...(declined ? { declined } : {}) });
  }));
  // Back from Stripe's checkout: the Coach starts once its subscription has.
  api.post('/coach/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Coach confirmation is temporarily unavailable.');
    rate(req, 'coach-confirm', 60);
    const id = sessionId(req.body?.sessionId);
    if (!id) throw fail(400, 'The checkout reference is invalid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Checkout not found.'); throw error; }
    if (session.mode !== 'subscription' || session.metadata?.product !== COACH.product) throw fail(404, 'Checkout not found.');
    if (session.status !== 'complete' || !session.subscription) throw fail(402, 'The checkout wasn’t finished, and you weren’t charged.');
    res.json(await finishCoach(await stripe.subscriptions.retrieve(idOf(session.subscription)), { req }));
  }));
  // Stripe's page for changing the plan, the card, or cancelling.
  api.post('/coach/manage', guarded(async (req, res) => {
    rate(req, 'coach-manage', 20);
    const id = verifyAccess(secret, req.body?.access);
    if (!id || id.startsWith('own_')) throw fail(403, 'Open this from your Payoff link.');
    const coach = await coachOf(await retrieve(id).catch(() => null));
    if (!coach) throw fail(404, 'There’s no Coach on this order. If you were charged, contact support@bookmarketel.com.');
    const session = await stripe.billingPortal.sessions.create({ customer: idOf(coach.customer), return_url: `${origin}/payoff/app` }).catch(error => {
      console.error('Payoff coach portal unavailable:', error.code || error.type || 'unknown');
      throw fail(503, 'Managing the Coach is unavailable right now. Email support@bookmarketel.com and we’ll change or cancel it for you.');
    });
    res.json({ url: session.url });
  }));
  // A question to the Coach. Three are free on each order; after that the
  // Coach must be running. Nothing about the question or plan is stored.
  api.post('/coach/ask', guarded(async (req, res) => {
    rate(req, 'coach-ask', 60);
    const id = verifyAccess(secret, req.body?.access);
    if (!id) throw fail(403, 'Open the Coach from your Payoff link.');
    rate({ ip: `order:${id}` }, 'coach-order', 40);
    const question = String(req.body?.question || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
    if (!question || question.length > 600) throw fail(400, 'Ask a question of up to 600 characters.');
    if (!env.OPENAI_API_KEY && !coachClient) throw fail(503, 'The Coach can’t answer right now. Please try again later.');
    let subscribed = id.startsWith('own_');
    if (!subscribed) {
      let parent;
      try { parent = await retrieve(id); } catch { throw fail(503, 'The Coach can’t answer right now. Please try again.'); }
      if (!paidPurchase(parent)) throw fail(402, 'This order has not been paid.');
      subscribed = !!(await coachOf(parent));
    }
    let free = 0;
    for (let n = 1; !subscribed && !free && n <= COACH.freeQuestions; n++) {
      try { await prisma.inspectEvent.create({ data: { name: 'PayoffCoachFree', tool: 'payoff', sourceId: `payoff-coach-free:${id}:${n}`, detail: String(n) } }); free = n; }
      catch (error) { if (error.code !== 'P2002') throw error; }
    }
    if (!subscribed && !free) return res.status(402).json({ message: `You’ve used your ${COACH.freeQuestions} free questions. Start the Coach to keep asking.`, freeLeft: 0 });
    let answer;
    try { answer = await askCoach({ env, question, plan: cleanPlan(req.body?.plan), history: req.body?.history, who: id, client: coachClient }); }
    catch (error) {
      if (free) await prisma.inspectEvent.delete({ where: { sourceId: `payoff-coach-free:${id}:${free}` } }).catch(() => {});
      console.error('Payoff coach answer failed:', error.status || error.name || 'unknown');
      throw fail(503, 'The Coach couldn’t answer just now. Please try again.');
    }
    res.json({ answer, freeLeft: subscribed ? null : COACH.freeQuestions - free });
  }));
  api.post('/access', guarded(async (req, res) => {
    rate(req, 'access', 120);
    const id = verifyAccess(secret, req.body?.token);
    if (!id) throw fail(403, 'This link is not valid. Use the link in your Payoff email, or ask for a new one.');
    // Which extras the order included comes from Stripe each time; if Stripe
    // can't answer, the app keeps what it last knew (extras: null).
    if (id.startsWith('own_')) return res.json({ ok: true, extras: ['coach', ...EXTRAS] });
    let extras = null;
    try {
      const object = stripe && await retrieve(id);
      const order = object && paidPurchase(object);
      if (order) extras = extrasFor(order, await coachOf(object));
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
  // The Coach's subscription events: its first payment starts it (if the
  // buyer's browser didn't), each later one is a renewal. Everything else
  // about it (cancelling, a failed renewal) is read from Stripe when used.
  async function coachEvent(event) {
    const object = event.data?.object || {};
    let subscriptionId = null;
    if (event.type.startsWith('customer.subscription.')) subscriptionId = object.metadata?.product === COACH.product ? object.id : null;
    else if (event.type === 'checkout.session.completed') subscriptionId = object.metadata?.product === COACH.product ? idOf(object.subscription) : null;
    else if (event.type === 'invoice.paid') {
      // The invoice carries its subscription's metadata, so other products' invoices end here.
      const details = object.parent?.subscription_details || object.subscription_details || {};
      subscriptionId = details.metadata?.product === COACH.product ? idOf(details.subscription || object.subscription) : null;
    }
    if (!subscriptionId) return false;
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Coach confirmation is unavailable.');
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata?.product !== COACH.product) return false;
    if (event.type === 'checkout.session.completed' || (event.type === 'invoice.paid' && object.billing_reason === 'subscription_create')) {
      if (startedCoach(subscription)) await finishCoach(subscription, { webhook: true });
    } else if (event.type === 'invoice.paid' && object.amount_paid > 0 && subscription.metadata.noTrack !== '1' && !isExcludedEmail(subscription.metadata.email || '')) {
      const visitor = visitorId(subscription.metadata.visitorId);
      try { await prisma.inspectEvent.create({ data: { name: 'PayoffCoachRenewed', tool: 'payoff', visitorId: visitor, sourceId: `payoff-coach-renewal:${object.id}`, detail: subscription.metadata.plan } }); }
      catch (error) { if (error.code !== 'P2002') throw error; return true; }
      await textOwner(`payoff-coach-renewal-text:${object.id}`, visitor, `Payoff Coach renewed: $${(object.amount_paid / 100).toFixed(2)}.`);
    }
    return true;
  }
  return { handleStripeEvent: async (event, _req) => {
    if (await coachEvent(event)) return true;
    if (event.type === 'payment_intent.succeeded') {
      const object = event.data?.object;
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
module.exports = { registerPayoff, paidOrder, paidIntent, basket, verifyAccess, accessToken, ITEMS, VERSION, PRODUCT, PREORDER, VARIANTS, QUIZ_STEPS, COACH };
