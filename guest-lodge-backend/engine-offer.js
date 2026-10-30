'use strict';

// The done-for-you booking engine at /engine, sold the way UENI sold its
// done-for-you website for over a year: one price in the ad, the order form on
// the page. $97 today (setup plus the first month), then $49 a month, through
// Stripe's embedded checkout on our page. Stripe is the order ledger; nothing
// about the buyer is stored here. Each lead and each sale texts the owner, who
// builds the engine and connects the hotel's PMS within 24 hours.
const express = require('express');
const crypto = require('node:crypto');
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
const PRICE = cents => Math.round(cents) / 100;
// The page's own steps, recorded per visitor so the test can be read without Meta.
const STEPS = Object.freeze(['viewed', 'time10', 'time60', 'scroll50', 'scroll100', 'example', 'faq', 'tap-hero', 'tap-plan', 'tap-sticky', 'tap-final',
  'email', 'details', 'checkout-ready', 'checkout-failed']);
const ROOT = __dirname;
const PAGES = Object.freeze({ '/engine': 'engine.html', '/engine/welcome': 'engine-welcome.html' });

const fail = (status, message) => Object.assign(new Error(message), { status, forBuyer: true });
const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const visitorId = value => typeof value === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
const sessionId = value => typeof value === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(value) ? value : null;
const idOf = value => (typeof value === 'string' ? value : value?.id) || null;
// One line of plain text from the buyer: no control characters, bounded.
const line = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const isEngine = metadata => metadata?.product === PRODUCT;

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
  return { email, property, name, phone, pms };
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
    if (session?.object !== 'checkout.session' || !isEngine(session.metadata) || session.mode !== 'subscription'
      || session.status !== 'complete' || session.payment_status !== 'paid') return null;
    const m = session.metadata;
    return { id: session.id, livemode: session.livemode, metadata: m, totalCents: session.amount_total,
      email: session.customer_details?.email || session.customer_email || '', fullName: session.customer_details?.name || m.name || '',
      property: m.property || '', name: m.name || '', phone: m.phone || '', pms: m.pms || '', subscription: idOf(session.subscription) };
  }

  async function confirm(session, { req = null, webhook = false, retryMail = false } = {}) {
    const sale = paidSession(session);
    if (!sale) throw fail(402, 'This order has not been paid. If you were charged, contact support@bookmarketel.com.');
    const visitor = visitorId(sale.metadata.visitorId);
    // Owner, no-track and sandbox orders are confirmed but don't count as sales.
    if (sale.livemode !== false && sale.metadata.noTrack !== '1' && !isExcludedEmail(sale.email)) {
      await record('EnginePaid', visitor, `engine-paid:${sale.id}`, sale.pms.slice(0, 60));
      await sendCapi('Purchase', {
        eventId: `engine-purchase.${sale.id}`,
        hotelId: visitor ? `engine-visitor:${visitor}` : `engine-session:${sale.id}`,
        externalId: visitor ? `engine-visitor:${visitor}` : `engine-session:${sale.id}`,
        email: sale.email, phone: sale.phone, fullName: sale.fullName,
        // A webhook request is Stripe's, never the buyer's IP or browser.
        ip: webhook || !req ? '' : req.ip || '', userAgent: webhook || !req ? '' : req.headers['user-agent'] || '',
        sourceUrl: sale.metadata.sourceUrl || `${origin}/engine`, fbp: sale.metadata.fbp || '', fbc: sale.metadata.fbc || '',
        value: PRICE(sale.totalCents),
      });
      await textOwner(`engine-sale-text:${sale.id}`, visitor,
        `Engine sale: $${PRICE(sale.totalCents).toFixed(2)}. ${sale.property} (${sale.pms}). ${sale.name}, ${sale.phone}, ${sale.email}. Live within 24h.`);
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
    return { paid: true, reference: sale.id, value: PRICE(sale.totalCents), property: sale.property, pms: sale.pms, email: sale.email, emailSent };
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
        `Billing: $${PRICE(sale.totalCents).toFixed(2)} today, then $${PRICE(MONTHLY.cents).toFixed(2)} a month from next month. Cancel any time by replying to this email.`,
        '30-day money-back guarantee: if we can\'t connect it to your PMS, or you\'re not happy, reply within 30 days and we\'ll refund your payment.', '',
        `Order reference: ${sale.id}`, '',
        'Marketel', 'support@bookmarketel.com',
      ].join('\n') };
  }

  for (const [route, file] of Object.entries(PAGES)) {
    app.get(route, (_req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(ROOT, file)); });
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
    if (req.body?.name !== 'EngineStep' || !STEPS.includes(req.body?.detail)) throw fail(400, 'Unknown event.');
    if (noTrack(req)) return res.json({ ignored: true });
    rate(req, 'event', 300);
    const visitor = visitorId(req.body.visitorId);
    await record('EngineStep', visitor, null, req.body.detail);
    // The server's copy of the pixel's PageView, with that page load's id.
    const viewPrefix = `engine-pv.${visitor}.`;
    const pageView = visitor && typeof req.body.pageView === 'string' && req.body.pageView.startsWith(viewPrefix)
      && /^[a-z0-9]{6,16}$/.test(req.body.pageView.slice(viewPrefix.length)) ? req.body.pageView : null;
    if (pageView && req.body.detail === 'viewed') {
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
    const metadata = { product: PRODUCT, offerVersion: VERSION, property: buyer.property, name: buyer.name, phone: buyer.phone, pms: buyer.pms,
      visitorId: visitor || '', noTrack: tracked ? '' : '1',
      fbp: (attribution.fbp || '').slice(0, 500), fbc: (attribution.fbc || '').slice(0, 500), sourceUrl: (attribution.sourceUrl || '').slice(0, 500) };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([attempt, buyer, metadata.fbp, metadata.fbc, TODAY_CENTS, VERSION])).digest('hex');
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', mode: 'subscription', customer_email: buyer.email,
      line_items: [
        { quantity: 1, price_data: { currency: 'usd', unit_amount: MONTHLY.cents, recurring: { interval: 'month' },
          product_data: { name: MONTHLY.name, description: MONTHLY.description } } },
        { quantity: 1, price_data: { currency: 'usd', unit_amount: SETUP.cents,
          product_data: { name: SETUP.name, description: SETUP.description } } },
      ],
      metadata, subscription_data: { description: `${MONTHLY.name}: ${buyer.property}`, metadata },
      custom_text: { submit: { message: `$${PRICE(TODAY_CENTS)} today, then $${PRICE(MONTHLY.cents)}/month from next month. Cancel anytime. 30-day money-back guarantee.` } },
      return_url: `${origin}/engine/welcome?session_id={CHECKOUT_SESSION_ID}`,
    }, { idempotencyKey: `engine-checkout:${fingerprint}` });
    if (!session.client_secret) throw fail(502, 'Checkout could not start. Please try again.');
    if (tracked) {
      const capi = { ...visitorCapi(visitor || attempt, attribution, req), email: buyer.email, phone: buyer.phone, fullName: buyer.name };
      await record('EngineLead', visitor, `engine-lead:${fingerprint}`, buyer.pms);
      await sendCapi('Lead', { eventId: `engine-lead.${attempt}`, value: PRICE(TODAY_CENTS), ...capi });
      await sendCapi('InitiateCheckout', { eventId: `engine-checkout.${attempt}`, value: PRICE(TODAY_CENTS), ...capi });
      await textOwner(`engine-lead-text:${attempt}`, visitor,
        `Engine lead (at checkout, not paid yet): ${buyer.property} (${buyer.pms}). ${buyer.name}, ${buyer.phone}, ${buyer.email}.`);
    }
    res.json({ clientSecret: session.client_secret, value: PRICE(TODAY_CENTS) });
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
    res.json(await confirm(session, { req }));
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
      if (object.metadata.noTrack !== '1') {
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

module.exports = { registerEngineOffer, order, PRODUCT, VERSION, SETUP, MONTHLY, TODAY_CENTS, STEPS };
