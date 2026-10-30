'use strict';

// The done-for-you booking engine at /engine, sold the way UENI sold its
// done-for-you website for over a year: one price in the ad, the order form on
// the page. $97 today (setup plus the first month), then $49 a month, through
// Stripe's embedded checkout on our page. Stripe is the order ledger; nothing
// about the buyer is stored here. Each lead and each sale texts the owner, who
// builds the engine and connects the hotel's PMS within 24 hours.
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { sanitizeInspectAttribution, inspectPublishableKey } = require('./inspect');

const PRODUCT = 'marketel-engine';
const VERSION = 'engine-v1';
// The first invoice is the setup plus the first month; then the month alone.
const SETUP = Object.freeze({ name: 'Done-for-you setup and PMS connection', cents: 4800,
  description: 'We build your booking engine and connect it to your PMS within 24 hours.' });
const MONTHLY = Object.freeze({ name: 'Marketel booking engine', cents: 4900,
  description: 'Your booking engine, connected to your PMS: every booking entered and checked for you. Hosting and support included.' });
const TODAY_CENTS = SETUP.cents + MONTHLY.cents;
// The one upsell: on the welcome page, for an hour after paying, $497 once
// instead of $49 a month (about ten months of it), and the monthly plan is
// cancelled. Meta hears it as its own event, so Purchase stays one per customer.
// The two plans on the page, as Artistly shows its two: the ad's price first,
// pay-once below it. A pay-once order is a single $497 payment, no subscription.
const PLANS = Object.freeze({ monthly: { todayCents: TODAY_CENTS }, once: { todayCents: 49700 } });
const LIFETIME = Object.freeze({ product: 'marketel-engine-lifetime', name: 'Marketel booking engine, paid once', cents: 49700,
  description: 'Your booking engine and PMS connection, paid once. No monthly charge.', windowMs: 60 * 60 * 1000, event: 'LifetimeUpgrade' });
const PRICE = cents => Math.round(cents) / 100;
// The page's own steps, recorded per visitor so the test can be read without Meta.
const STEPS = Object.freeze(['viewed', 'time10', 'time60', 'scroll50', 'scroll100', 'example', 'faq', 'tap-hero', 'tap-plan', 'tap-sticky', 'tap-final',
  'email', 'details', 'checkout-ready', 'checkout-failed', 'lifetime-viewed', 'lifetime-yes', 'lifetime-no', 'plan-once', 'plan-monthly',
  'how', 'bridge', 'demo']);
// Where a visitor came from, and which ad: the funnel page's per-ad view.
const FROM = Object.freeze(['ad', 'social', 'direct', 'other']);
const ROOT = __dirname;
const PAGES = Object.freeze({ '/engine': 'engine.html', '/engine/welcome': 'engine-welcome.html' });

// The pages ask for the tracking script by its content's hash: Cloudflare lets
// browsers keep static files for four hours, and an older copy would miss what
// the page records now.
const pages = new Map();
function pageHtml(file) {
  if (!pages.has(file)) {
    const script = fs.readFileSync(path.join(ROOT, 'public', 'engine-track.js'));
    const version = crypto.createHash('sha256').update(script).digest('hex').slice(0, 10);
    pages.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/src="\/engine-track\.js"/g, `src="/engine-track.js?v=${version}"`));
  }
  return pages.get(file);
}

const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const visitorId = value => typeof value === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
const sessionId = value => typeof value === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(value) ? value : null;
const idOf = value => (typeof value === 'string' ? value : value?.id) || null;
// One line of plain text from the buyer: no control characters, bounded.
const line = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const isEngine = metadata => metadata?.product === PRODUCT;
const isLifetime = metadata => metadata?.product === LIFETIME.product;

// What the checkout sells, from the order form's fields. The price is the server's.
function order(body) {
  const email = line(body?.email, 254).toLowerCase();
  if (!validEmail(email)) throw fail(400, 'Enter a valid email.');
  const property = line(body?.property, 120);
  if (property.length < 2) throw fail(400, 'Enter your property’s name.');
  const name = line(body?.name, 80);
  if (name.length < 2) throw fail(400, 'Enter your name.');
  const phone = line(body?.phone, 30);
  if (phone.replace(/\D/g, '').length < 7) throw fail(400, 'Enter a mobile number we can text about your setup.');
  const pms = line(body?.pms, 60);
  if (pms.length < 2) throw fail(400, 'Tell us which PMS you use.');
  return { email, property, name, phone, pms, plan: body?.plan === 'once' ? 'once' : 'monthly' };
}

function registerEngineOffer(app, { stripe, mail, prisma, isExcludedEmail = () => false, queueCapi = null, capiConfigured = false, text = null, env = process.env }) {
  const origin = 'https://bookmarketel.com';
  const key = env.STRIPE_INSPECT_SECRET_KEY || env.STRIPE_MARKETEL_SECRET_KEY || '';
  const available = () => env.ENGINE_OFFER_ENABLED !== 'false' && !!stripe && !!prisma?.inspectEvent && !!inspectPublishableKey(env)
    && (env.NODE_ENV === 'test' || (key.startsWith('sk_live_') && String(env.STRIPE_INSPECT_WEBHOOK_SECRET || '').startsWith('whsec_')));
  const automated = req => /HeadlessChrome|bot\b|crawler|spider|Playwright|facebookexternalhit|Facebot/i.test(req.headers['user-agent'] || '');
  const noTrack = req => req.headers['x-marketel-no-track'] === '1' || automated(req);
  const guarded = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const hits = new Map();
  function rate(req, action, limit) {
    const now = Date.now(), slot = `${action}:${req.ip}`;
    if (hits.size > 5000) for (const [k, values] of hits) if (!values.some(at => now - at < 3600000)) hits.delete(k);
    const recent = (hits.get(slot) || []).filter(at => now - at < 3600000);
    if (recent.length >= limit) throw fail(429, 'Too many requests. Please try again later.');
    recent.push(now); hits.set(slot, recent);
  }
  const record = (name, visitor, sourceId, detail = null) => sourceId
    ? prisma.inspectEvent.upsert({ where: { sourceId }, create: { name, tool: 'engine', visitorId: visitor, sourceId, detail }, update: {} })
    : prisma.inspectEvent.create({ data: { name, tool: 'engine', visitorId: visitor, detail } });

  // Server copies of the pixel's events, with the same event ids, so Meta
  // counts each once and still hears about the ones a browser blocked.
  const sendCapi = (eventName, input) => {
    if (!capiConfigured || typeof queueCapi !== 'function') return Promise.resolve({ queued: false });
    return queueCapi(eventName, { product: PRODUCT, currency: 'USD', contentName: 'Marketel booking engine', ...input })
      .catch(error => { console.error('Engine CAPI queue failed:', eventName, error.message); return { queued: false }; });
  };
  const visitorCapi = (visitor, attribution, req) => ({
    hotelId: `engine-visitor:${visitor}`, externalId: `engine-visitor:${visitor}`,
    ip: attribution.ipAddress || req.ip || '', userAgent: attribution.userAgent || req.headers['user-agent'] || '',
    sourceUrl: attribution.sourceUrl || `${origin}/engine`, fbp: attribution.fbp || '', fbc: attribution.fbc || '',
  });

  // One text to the owner per claim. A failed text frees its claim so a retry
  // (the next confirmation or webhook) sends it; it never blocks the buyer.
  async function textOwner(sourceId, visitor, body) {
    if (typeof text !== 'function') return;
    try { await prisma.inspectEvent.create({ data: { name: 'EngineTexted', tool: 'engine', sourceId, visitorId: visitor } }); }
    catch (error) { if (error.code !== 'P2002') console.error('Engine text claim failed:', error.message); return; }
    try { await text(body); }
    catch (error) {
      await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
      console.error('Engine owner text failed:', error.message);
    }
  }

  // A completed, paid checkout for this product, or null.
  function paidSession(session) {
    const once = session?.metadata?.plan === 'once';
    if (session?.object !== 'checkout.session' || !isEngine(session.metadata) || session.mode !== (once ? 'payment' : 'subscription')
      || session.status !== 'complete' || session.payment_status !== 'paid') return null;
    const m = session.metadata;
    return { id: session.id, livemode: session.livemode, metadata: m, totalCents: session.amount_total, plan: once ? 'once' : 'monthly',
      email: session.customer_details?.email || session.customer_email || '', fullName: session.customer_details?.name || m.name || '',
      property: m.property || '', name: m.name || '', phone: m.phone || '', pms: m.pms || '', subscription: idOf(session.subscription) };
  }

  // Who bought, for Meta. A webhook request is Stripe's, never the buyer's IP or browser.
  function saleCapi(sale, { req = null, webhook = false } = {}) {
    const visitor = visitorId(sale.metadata.visitorId);
    return {
      hotelId: visitor ? `engine-visitor:${visitor}` : `engine-session:${sale.id}`,
      externalId: visitor ? `engine-visitor:${visitor}` : `engine-session:${sale.id}`,
      email: sale.email, phone: sale.phone, fullName: sale.fullName,
      ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
      sourceUrl: sale.metadata.sourceUrl || `${origin}/engine`, fbp: sale.metadata.fbp || '', fbc: sale.metadata.fbc || '',
    };
  }
  // Owner, no-track and sandbox orders are confirmed but don't count as sales.
  const counted = sale => sale.livemode !== false && sale.metadata.noTrack !== '1' && !isExcludedEmail(sale.email);

  async function confirm(session, { req = null, webhook = false, retryMail = false } = {}) {
    const sale = paidSession(session);
    if (!sale) throw fail(402, 'This order has not been paid. If you were charged, contact support@bookmarketel.com.');
    const visitor = visitorId(sale.metadata.visitorId);
    if (counted(sale)) {
      await record('EnginePaid', visitor, `engine-paid:${sale.id}`, sale.plan);
      await sendCapi('Purchase', { eventId: `engine-purchase.${sale.id}`, ...saleCapi(sale, { req, webhook }), value: PRICE(sale.totalCents) });
      await textOwner(`engine-sale-text:${sale.id}`, visitor,
        `Engine sale${sale.plan === 'once' ? ' (pay-once)' : ''}: $${PRICE(sale.totalCents).toFixed(2)}. ${sale.property} (${sale.pms}). ${sale.name}, ${sale.phone}, ${sale.email}. Live within 24h.`);
    }
    let emailSent = false;
    if (sale.email && mail) {
      const sourceId = `engine-welcome-mail:${sale.id}`;
      let claimed = false;
      try { await prisma.inspectEvent.create({ data: { name: 'EngineWelcomeEmailed', tool: 'engine', sourceId, visitorId: visitor } }); claimed = true; }
      catch (error) { if (error.code !== 'P2002') throw error; emailSent = true; }
      if (claimed) {
        try { await mail.sendMail(welcomeMail(sale)); emailSent = true; }
        catch (error) {
          await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {});
          console.error('Engine welcome email failed:', error.message);
          if (retryMail) throw error;
        }
      }
    }
    return { paid: true, reference: sale.id, plan: sale.plan, value: PRICE(sale.totalCents), property: sale.property, pms: sale.pms, email: sale.email, emailSent };
  }

  function welcomeMail(sale) {
    return { from: '"Marketel" <support@bookmarketel.com>', to: sale.email, replyTo: 'support@bookmarketel.com',
      subject: `We're building ${sale.property}'s booking engine`,
      text: [
        `Hi ${sale.name.split(' ')[0] || 'there'},`, '',
        `Thanks for your order. We've started on ${sale.property}'s booking engine, and it will be live within 24 hours.`, '',
        'What happens next:',
        `1. We'll text or email you shortly to set up a staff login for Marketel in ${sale.pms}. It's a separate user you can switch off any time.`,
        '2. We build your booking page with your rooms, photos and rates. Reply with your website or a few photos if you like; otherwise we\'ll ask.',
        `3. We connect it to ${sale.pms}, test a booking end to end, and send you your link.`, '',
        sale.plan === 'once'
          ? `Billing: $${PRICE(sale.totalCents).toFixed(2)} paid once. There are no monthly charges.`
          : `Billing: $${PRICE(sale.totalCents).toFixed(2)} today, then $${PRICE(MONTHLY.cents).toFixed(2)} a month from next month. Cancel any time by replying to this email.`,
        '30-day money-back guarantee: if we can\'t connect it to your PMS, or you\'re not happy, reply within 30 days and we\'ll refund your payment.', '',
        `Order reference: ${sale.id}`, '',
        'Marketel', 'support@bookmarketel.com',
      ].join('\n') };
  }

  // The pay-once upgrade. Its state lives on the monthly subscription:
  // metadata.lifetime names the payment that replaced it.
  async function lifetimeState(session) {
    const subscriptionId = idOf(session.subscription);
    const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId).catch(() => null) : null;
    const done = !!subscription?.metadata?.lifetime;
    const open = !done && ['active', 'trialing'].includes(subscription?.status) && Date.now() - session.created * 1000 <= LIFETIME.windowMs;
    return { subscription, done, open };
  }
  // The card the buyer just paid with, if it can pay again in one tap. A
  // wallet (Apple Pay, Google Pay) can't, so it goes through Stripe's page.
  async function savedCard(subscription) {
    const methodId = idOf(subscription?.default_payment_method), customer = idOf(subscription?.customer);
    if (!methodId || !customer) return null;
    const method = await stripe.paymentMethods.retrieve(methodId).catch(() => null);
    return method?.type === 'card' && !method.card?.wallet && idOf(method.customer) === customer ? method : null;
  }
  // Paid: off the monthly plan (marked first, so its cancellation reads as the
  // upgrade), then recorded, Meta, the owner's text and the buyer's email.
  // Every step is safe to repeat; the one-tap, Stripe's page and the webhook
  // can all arrive here for the same order.
  async function finishLifetime(parentId, { ref, cents, req = null, webhook = false }) {
    const sale = paidSession(await stripe.checkout.sessions.retrieve(parentId));
    if (!sale) throw fail(404, 'Order not found.');
    const visitor = visitorId(sale.metadata.visitorId);
    if (sale.subscription) {
      const subscription = await stripe.subscriptions.retrieve(sale.subscription);
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
        if (!subscription.metadata?.lifetime) await stripe.subscriptions.update(sale.subscription, { metadata: { lifetime: ref } });
        await stripe.subscriptions.cancel(sale.subscription);
      }
    }
    if (counted(sale)) {
      await record('EngineLifetime', visitor, `engine-lifetime:${parentId}`, sale.pms.slice(0, 60));
      await sendCapi(LIFETIME.event, { eventId: `engine-lifetime.${parentId}`, ...saleCapi(sale, { req, webhook }), value: PRICE(cents), contentName: LIFETIME.name });
      await textOwner(`engine-lifetime-text:${parentId}`, visitor, `Engine upgrade: $${PRICE(cents).toFixed(2)} pay-once from ${sale.property}. Their $49/month is cancelled.`);
    }
    if (sale.email && mail) {
      const sourceId = `engine-lifetime-mail:${parentId}`;
      try {
        await prisma.inspectEvent.create({ data: { name: 'EngineLifetimeEmailed', tool: 'engine', sourceId, visitorId: visitor } });
        try { await mail.sendMail(lifetimeMail(sale, cents)); }
        catch (error) { await prisma.inspectEvent.delete({ where: { sourceId } }).catch(() => {}); console.error('Engine pay-once email failed:', error.message); }
      } catch (error) { if (error.code !== 'P2002') throw error; }
    }
    return { lifetime: true, value: PRICE(cents), reference: parentId };
  }
  function lifetimeMail(sale, cents) {
    return { from: '"Marketel" <support@bookmarketel.com>', to: sale.email, replyTo: 'support@bookmarketel.com',
      subject: `${sale.property} is on pay-once`,
      text: [
        `Hi ${sale.name.split(' ')[0] || 'there'},`, '',
        `You've switched to pay-once: $${PRICE(cents).toFixed(2)}, paid today. Your $49 a month is cancelled, so there's nothing more to pay.`, '',
        `Everything else is the same: we're building ${sale.property}'s booking engine and connecting it to ${sale.pms}, live within 24 hours.`,
        '30-day money-back guarantee: reply within 30 days and we\'ll refund your payments.', '',
        `Order reference: ${sale.id}`, '',
        'Marketel', 'support@bookmarketel.com',
      ].join('\n') };
  }

  for (const [route, file] of Object.entries(PAGES)) {
    app.get(route, (_req, res) => { res.set('Cache-Control', 'no-cache'); res.type('html').send(pageHtml(file)); });
  }

  const api = express.Router();
  api.use(express.json({ limit: '8kb' }));
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.get('/config', (_req, res) => {
    const config = { available: available(), todayCents: TODAY_CENTS, monthlyCents: MONTHLY.cents };
    if (config.available) config.stripeKey = inspectPublishableKey(env) || null;
    res.json(config);
  });
  api.post('/event', guarded(async (req, res) => {
    const { name, detail } = req.body || {};
    const known = (name === 'EngineStep' && STEPS.includes(detail)) || (name === 'EngineFrom' && FROM.includes(detail))
      || (name === 'EngineAd' && typeof detail === 'string' && /^\d{6,25}$/.test(detail));
    if (!known) throw fail(400, 'Unknown event.');
    if (noTrack(req)) return res.json({ ignored: true });
    rate(req, 'event', 300);
    const visitor = visitorId(req.body.visitorId);
    await record(name, visitor, null, detail);
    // The server's copy of the pixel's PageView, with that page load's id.
    const viewPrefix = `engine-pv.${visitor}.`;
    const pageView = visitor && typeof req.body.pageView === 'string' && req.body.pageView.startsWith(viewPrefix)
      && /^[a-z0-9]{6,16}$/.test(req.body.pageView.slice(viewPrefix.length)) ? req.body.pageView : null;
    if (pageView && name === 'EngineStep' && detail === 'viewed') {
      await sendCapi('PageView', { eventId: pageView, ...visitorCapi(visitor, sanitizeInspectAttribution(req.body.attribution, req) || {}, req) });
    }
    res.json({ success: true });
  }));
  // The order form's details become a Stripe checkout on the same page.
  // Retrying the same attempt (a double tap, a reload) returns the same checkout.
  api.post('/checkout', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'Checkout is temporarily unavailable. Please try again later.');
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open checkout on bookmarketel.com.');
    rate(req, 'checkout', 20);
    const attempt = req.body?.attempt;
    if (typeof attempt !== 'string' || !/^[a-f0-9-]{16,64}$/.test(attempt)) throw fail(400, 'Please reload the page and try again.');
    const buyer = order(req.body);
    const visitor = visitorId(req.body?.visitorId);
    const attribution = sanitizeInspectAttribution(req.body?.attribution, req) || {};
    const tracked = !noTrack(req) && !isExcludedEmail(buyer.email);
    const today = PLANS[buyer.plan].todayCents;
    const metadata = { product: PRODUCT, offerVersion: VERSION, plan: buyer.plan, property: buyer.property, name: buyer.name, phone: buyer.phone, pms: buyer.pms,
      visitorId: visitor || '', noTrack: tracked ? '' : '1',
      fbp: (attribution.fbp || '').slice(0, 500), fbc: (attribution.fbc || '').slice(0, 500), sourceUrl: (attribution.sourceUrl || '').slice(0, 500) };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, buyer, metadata.fbp, metadata.fbc, today, VERSION])).digest('hex');
    const shared = { ui_mode: 'embedded', customer_email: buyer.email, metadata, return_url: `${origin}/engine/welcome?session_id={CHECKOUT_SESSION_ID}` };
    const session = await stripe.checkout.sessions.create(buyer.plan === 'once' ? {
      ...shared, mode: 'payment', customer_creation: 'always',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: today, product_data: { name: LIFETIME.name, description: LIFETIME.description } } }],
      payment_intent_data: { description: `${LIFETIME.name}: ${buyer.property}`, metadata },
      custom_text: { submit: { message: `One payment of $${PRICE(today)}. No monthly fees. 30-day money-back guarantee.` } },
    } : {
      ...shared, mode: 'subscription',
      line_items: [
        { quantity: 1, price_data: { currency: 'usd', unit_amount: MONTHLY.cents, recurring: { interval: 'month' },
          product_data: { name: MONTHLY.name, description: MONTHLY.description } } },
        { quantity: 1, price_data: { currency: 'usd', unit_amount: SETUP.cents,
          product_data: { name: SETUP.name, description: SETUP.description } } },
      ],
      subscription_data: { description: `${MONTHLY.name}: ${buyer.property}`, metadata },
      custom_text: { submit: { message: `$${PRICE(TODAY_CENTS)} today, then $${PRICE(MONTHLY.cents)}/month from next month. Cancel anytime. 30-day money-back guarantee.` } },
    }, { idempotencyKey: `engine-checkout:${fingerprint}` });
    if (!session.client_secret) throw fail(502, 'Checkout could not start. Please try again.');
    if (tracked) {
      const capi = { ...visitorCapi(visitor || attempt, attribution, req), email: buyer.email, phone: buyer.phone, fullName: buyer.name };
      await record('EngineLead', visitor, `engine-lead:${fingerprint}`, buyer.pms);
      await sendCapi('Lead', { eventId: `engine-lead.${attempt}`, value: PRICE(today), ...capi });
      await sendCapi('InitiateCheckout', { eventId: `engine-checkout.${attempt}`, value: PRICE(today), ...capi });
      await textOwner(`engine-lead-text:${attempt}`, visitor,
        `Engine lead (at checkout${buyer.plan === 'once' ? ', pay-once $497' : ''}, not paid yet): ${buyer.property} (${buyer.pms}). ${buyer.name}, ${buyer.phone}, ${buyer.email}.`);
    }
    res.json({ clientSecret: session.client_secret, value: PRICE(today), plan: buyer.plan });
  }));
  // The welcome page confirms its own order; the webhook does the same if the
  // buyer never gets there. Both are safe to repeat.
  api.post('/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Order confirmation is temporarily unavailable.');
    rate(req, 'confirm', 60);
    const id = sessionId(req.body?.sessionId);
    if (!id) throw fail(400, 'The order reference is invalid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    if (!isEngine(session.metadata)) throw fail(404, 'Order not found.');
    if (session.status === 'complete' && session.payment_status === 'unpaid') {
      return res.status(202).json({ processing: true, message: 'Your bank is still confirming the payment. We’ll email you as soon as it clears.' });
    }
    if (session.status !== 'complete') throw fail(402, 'Your payment didn’t go through and you weren’t charged. Go back to try again.');
    const result = await confirm(session, { req });
    const state = available() ? await lifetimeState(session) : { done: false, open: false };
    const oneClick = state.open ? !!(await savedCard(state.subscription)) : false;
    res.json({ ...result, lifetime: { open: state.open, done: state.done, oneClick, priceCents: LIFETIME.cents } });
  }));
  // Yes to pay-once: the saved card in one tap, or Stripe's page.
  api.post('/lifetime', guarded(async (req, res) => {
    if (!available()) throw fail(503, 'This offer is temporarily unavailable.');
    if (req.headers.origin && req.headers.origin !== origin && env.NODE_ENV !== 'test') throw fail(403, 'Open this on bookmarketel.com.');
    rate(req, 'lifetime', 30);
    const id = sessionId(req.body?.sessionId);
    if (!id) throw fail(400, 'The order reference is invalid.');
    let session;
    try { session = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    const sale = paidSession(session);
    if (!sale) throw fail(404, 'Order not found.');
    const { subscription, done, open } = await lifetimeState(session);
    // Already paid: finish whatever didn't (a retry after a dropped connection).
    if (done) return res.json(await finishLifetime(session.id, { ref: subscription.metadata.lifetime, cents: LIFETIME.cents, req }));
    if (!open) throw fail(410, 'This offer has ended. Reply to your welcome email if you’d like to switch to pay-once.');
    const customer = idOf(subscription.customer);
    const metadata = { product: LIFETIME.product, offerVersion: VERSION, parentOrder: session.id, property: sale.property, pms: sale.pms,
      visitorId: sale.metadata.visitorId || '', noTrack: sale.metadata.noTrack || '' };
    const saved = req.body?.method !== 'checkout' ? await savedCard(subscription) : null;
    let declined = null;
    if (saved) {
      let intent = null;
      try {
        intent = await stripe.paymentIntents.create({ amount: LIFETIME.cents, currency: 'usd', customer, payment_method: saved.id,
          payment_method_types: ['card'], confirm: true, receipt_email: sale.email || undefined, description: LIFETIME.name, metadata },
        { idempotencyKey: `engine-lifetime:${session.id}:saved` });
      } catch (error) {
        if (error.type !== 'StripeCardError') throw error;
      }
      if (intent?.status === 'succeeded') return res.json(await finishLifetime(session.id, { ref: intent.id, cents: intent.amount_received, req }));
      // A card that needs another step: nothing is left waiting on it.
      if (intent && intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id).catch(() => {});
      declined = 'Your card needs another step. Finish on Stripe’s secure page, or use Apple Pay, Google Pay or another card.';
    }
    const attempt = typeof req.body?.attempt === 'string' && /^[a-f0-9-]{16,64}$/.test(req.body.attempt) ? req.body.attempt : crypto.randomUUID();
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment', ...(customer ? { customer } : { customer_email: sale.email }),
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: LIFETIME.cents, product_data: { name: LIFETIME.name, description: LIFETIME.description } } }],
      metadata, payment_intent_data: { metadata, description: LIFETIME.name },
      custom_text: { submit: { message: `One payment of $${PRICE(LIFETIME.cents)}. Your $49/month plan is cancelled. 30-day money-back guarantee.` } },
      success_url: `${origin}/engine/welcome?session_id=${session.id}&lifetime_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/engine/welcome?session_id=${session.id}`,
    }, { idempotencyKey: `engine-lifetime-checkout:${session.id}:${attempt}` });
    if (!checkout.url || !checkout.url.startsWith('https://checkout.stripe.com/')) throw fail(502, 'Checkout could not open. Please try again.');
    res.json({ next: 'checkout', url: checkout.url, ...(declined ? { declined } : {}) });
  }));
  // Back from Stripe's page with the pay-once paid.
  api.post('/lifetime/confirm', guarded(async (req, res) => {
    if (!stripe || !prisma?.inspectEvent) throw fail(503, 'Confirmation is temporarily unavailable.');
    rate(req, 'lifetime-confirm', 60);
    const parent = sessionId(req.body?.sessionId), id = sessionId(req.body?.lifetimeSession);
    if (!parent || !id) throw fail(400, 'The order reference is invalid.');
    let checkout;
    try { checkout = await stripe.checkout.sessions.retrieve(id); }
    catch (error) { if (error.code === 'resource_missing') throw fail(404, 'Order not found.'); throw error; }
    if (!isLifetime(checkout.metadata) || checkout.metadata.parentOrder !== parent) throw fail(404, 'Order not found.');
    if (checkout.status !== 'complete' || checkout.payment_status !== 'paid') throw fail(402, 'The payment wasn’t finished, and you weren’t charged. You’re still on $49/month.');
    res.json(await finishLifetime(parent, { ref: checkout.id, cents: checkout.amount_total, req }));
  }));
  api.use((error, _req, res, _next) => {
    if (!error.forBuyer) console.error('Engine offer error:', error.message);
    const status = error.forBuyer ? error.status : error.type === 'StripeCardError' ? 402 : 500;
    res.status(status).json({ error: error.forBuyer ? error.message : 'Something went wrong. Please try again, or email support@bookmarketel.com.' });
  });
  app.use('/api/engine', api);

  // Sales, renewals and cancellations from Stripe's verified webhook. Returns
  // true when the event was this product's, so other handlers skip it.
  async function handleStripeEvent(event) {
    const object = event.data?.object || {};
    if (isLifetime(object.metadata)) {
      const paid = event.type === 'payment_intent.succeeded'
        || (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.payment_status === 'paid');
      if (paid && sessionId(object.metadata.parentOrder)) {
        await finishLifetime(object.metadata.parentOrder, { ref: object.id, cents: object.amount_received ?? object.amount_total, webhook: true });
      }
      return true;
    }
    if (event.type === 'payment_intent.succeeded' && isEngine(object.metadata)) return true;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      if (!isEngine(object.metadata)) return false;
      const session = await stripe.checkout.sessions.retrieve(object.id);
      if (session.payment_status === 'paid') await confirm(session, { webhook: true, retryMail: true });
      return true;
    }
    if (event.type === 'invoice.paid') {
      const details = object.parent?.subscription_details || object.subscription_details || {};
      if (!isEngine(details.metadata)) return false;
      // The first invoice is the sale itself, confirmed above.
      if (object.billing_reason === 'subscription_create' || !(object.amount_paid > 0) || details.metadata.noTrack === '1') return true;
      const visitor = visitorId(details.metadata.visitorId);
      await record('EngineRenewed', visitor, `engine-renewal:${object.id}`, details.metadata.pms || null);
      await textOwner(`engine-renewal-text:${object.id}`, visitor, `Engine renewed: $${PRICE(object.amount_paid).toFixed(2)} from ${details.metadata.property || 'a property'}.`);
      return true;
    }
    if (event.type === 'customer.subscription.deleted') {
      if (!isEngine(object.metadata)) return false;
      const visitor = visitorId(object.metadata.visitorId);
      if (object.metadata.noTrack !== '1' && !object.metadata.lifetime) {
        await record('EngineCancelled', visitor, `engine-cancelled:${object.id}`, object.metadata.pms || null);
        await textOwner(`engine-cancelled-text:${object.id}`, visitor, `Engine cancelled: ${object.metadata.property || 'a property'}.`);
      }
      return true;
    }
    if (event.type.startsWith('customer.subscription.')) return isEngine(object.metadata);
    return false;
  }
  return { handleStripeEvent };
}

module.exports = { registerEngineOffer, pageHtml, order, PRODUCT, VERSION, SETUP, MONTHLY, TODAY_CENTS, PLANS, LIFETIME, STEPS, FROM };
