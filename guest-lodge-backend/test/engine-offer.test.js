'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerEngineOffer, order, PRODUCT, TODAY_CENTS, SETUP, MONTHLY } = require('../engine-offer');

const ACCOUNT = '51AbCdEfGhIjKlMnO';
const ENV = { NODE_ENV: 'test', STRIPE_INSPECT_SECRET_KEY: `sk_test_${ACCOUNT}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${ACCOUNT}abc` };
const BUYER = { email: 'Owner@Lakeview.test ', property: 'Lakeview  Inn', name: 'Dana Reyes', phone: '(205) 555-0142', pms: 'Little Hotelier' };
const ATTEMPT = '0123456789abcdef0123456789abcdef';

function world({ env = ENV, failText = false, failMail = false } = {}) {
  const rows = new Map(), creates = [], sessions = new Map(), subscriptions = new Map(), capi = [], texts = [], emails = [];
  const prisma = { inspectEvent: {
    upsert: async ({ where, create }) => { if (!rows.has(where.sourceId)) rows.set(where.sourceId, create); return rows.get(where.sourceId); },
    create: async ({ data }) => {
      const key = data.sourceId || 'event:' + rows.size;
      if (rows.has(key)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      rows.set(key, data); return data;
    },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  const stripe = { checkout: { sessions: {
    create: async (params, options) => { creates.push({ params, options }); return { id: 'cs_test_created' + creates.length, client_secret: 'cs_test_created_secret_' + creates.length }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions.get(id); },
  } }, subscriptions: { retrieve: async id => subscriptions.get(id) } };
  const app = express();
  const registration = registerEngineOffer(app, { stripe, prisma, env, capiConfigured: true,
    mail: { sendMail: async message => { if (failMail) throw new Error('smtp down'); emails.push(message); } },
    queueCapi: async (name, input) => { capi.push({ name, ...input }); return { queued: true }; },
    text: async body => { if (failText) throw new Error('twilio down'); texts.push(body); },
    isExcludedEmail: email => email === 'owner@bookmarketel.com' });
  return { app, registration, rows, creates, sessions, subscriptions, capi, texts, emails };
}

async function serve(w, fn) {
  const server = w.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    .then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) }));
  try { await fn({ base, post }); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

const paid = (id, overrides = {}) => ({ object: 'checkout.session', id, mode: 'subscription', status: 'complete', payment_status: 'paid', livemode: true,
  amount_total: TODAY_CENTS, subscription: 'sub_test1', customer_details: { email: 'owner@lakeview.test', name: 'Dana Reyes' },
  metadata: { product: PRODUCT, property: 'Lakeview Inn', name: 'Dana Reyes', phone: '(205) 555-0142', pms: 'Little Hotelier', visitorId: 'v_abcdefgh12', fbp: 'fb.1.1.2', fbc: '', sourceUrl: 'https://bookmarketel.com/engine' },
  ...overrides });

test('the order form needs an email, the property, a name, a textable phone and the PMS', () => {
  assert.deepEqual(order(BUYER), { email: 'owner@lakeview.test', property: 'Lakeview Inn', name: 'Dana Reyes', phone: '(205) 555-0142', pms: 'Little Hotelier' });
  assert.throws(() => order({ ...BUYER, email: 'nope' }), /valid email/);
  assert.throws(() => order({ ...BUYER, property: ' ' }), /property/);
  assert.throws(() => order({ ...BUYER, name: '' }), /your name/);
  assert.throws(() => order({ ...BUYER, phone: '12345' }), /mobile number/);
  assert.throws(() => order({ ...BUYER, pms: '' }), /PMS/);
  assert.equal(order({ ...BUYER, property: 'Inn\n\u0007Two' }).property, 'Inn Two');
});

test('checkout is $97 today: the $49 month plus the $48 setup, as one subscription on our page', async () => {
  const w = world();
  await serve(w, async ({ post }) => {
    const first = await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER, visitorId: 'v_abcdefgh12', attribution: { fbp: 'fb.1.1.2', sourceUrl: 'https://bookmarketel.com/engine' } });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.deepEqual(first.body, { clientSecret: 'cs_test_created_secret_1', value: 97 });
    const { params, options } = w.creates[0];
    assert.equal(params.ui_mode, 'embedded');
    assert.equal(params.mode, 'subscription');
    assert.equal(params.customer_email, 'owner@lakeview.test');
    assert.equal(params.line_items[0].price_data.unit_amount, MONTHLY.cents);
    assert.deepEqual(params.line_items[0].price_data.recurring, { interval: 'month' });
    assert.equal(params.line_items[1].price_data.unit_amount, SETUP.cents);
    assert.equal(params.line_items[1].price_data.recurring, undefined);
    assert.equal(MONTHLY.cents + SETUP.cents, 9700);
    assert.equal(params.metadata.product, PRODUCT);
    assert.equal(params.metadata.property, 'Lakeview Inn');
    assert.equal(params.metadata.noTrack, '');
    assert.deepEqual(params.subscription_data.metadata, params.metadata);
    assert.equal(params.return_url, 'https://bookmarketel.com/engine/welcome?session_id={CHECKOUT_SESSION_ID}');
    // The same attempt and details ask Stripe for the same session.
    await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER, visitorId: 'v_abcdefgh12', attribution: { fbp: 'fb.1.1.2', sourceUrl: 'https://bookmarketel.com/engine' } });
    assert.equal(w.creates[1].options.idempotencyKey, options.idempotencyKey);
    // Meta hears Lead and InitiateCheckout with the ids the pixel uses; the owner gets one text.
    assert.deepEqual(w.capi.map(e => [e.name, e.eventId, e.value]), [['Lead', `engine-lead.${ATTEMPT}`, 97], ['InitiateCheckout', `engine-checkout.${ATTEMPT}`, 97],
      ['Lead', `engine-lead.${ATTEMPT}`, 97], ['InitiateCheckout', `engine-checkout.${ATTEMPT}`, 97]]);
    assert.equal(w.texts.length, 1);
    assert.match(w.texts[0], /Engine lead .*Lakeview Inn \(Little Hotelier\)\. Dana Reyes, \(205\) 555-0142, owner@lakeview\.test/);
  });
});

test('a test browser or the owner can open checkout without being counted', async () => {
  const w = world();
  await serve(w, async ({ post }) => {
    const opened = await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER }, { 'x-marketel-no-track': '1' });
    assert.equal(opened.status, 200);
    assert.equal(w.creates[0].params.metadata.noTrack, '1');
    await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER, email: 'owner@bookmarketel.com' });
    assert.deepEqual([w.capi.length, w.texts.length], [0, 0]);
  });
});

test('bad details and a missing attempt never reach Stripe', async () => {
  const w = world();
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/engine/checkout', { ...BUYER })).status, 400);
    const bad = await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER, phone: '12' });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /mobile number/);
    assert.equal(w.creates.length, 0);
  });
});

test('without live keys in production, checkout stays shut and the page gets no key', async () => {
  const w = world({ env: { ...ENV, NODE_ENV: 'production' } });
  await serve(w, async ({ base, post }) => {
    const config = await (await fetch(base + '/api/engine/config')).json();
    assert.deepEqual(config, { available: false, todayCents: 9700, monthlyCents: 4900 });
    assert.equal((await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER })).status, 503);
  });
  const open = world();
  await serve(open, async ({ base }) => {
    const config = await (await fetch(base + '/api/engine/config')).json();
    assert.equal(config.stripeKey, ENV.STRIPE_INSPECT_PUBLISHABLE_KEY);
  });
});

test('a paid order is confirmed once: one Purchase, one text, one welcome email, however often it is asked', async () => {
  const w = world();
  w.sessions.set('cs_test_paid0000001', paid('cs_test_paid0000001'));
  await serve(w, async ({ post }) => {
    const done = await post('/api/engine/confirm', { sessionId: 'cs_test_paid0000001' });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.deepEqual(done.body, { paid: true, reference: 'cs_test_paid0000001', value: 97, property: 'Lakeview Inn', pms: 'Little Hotelier', email: 'owner@lakeview.test', emailSent: true });
    await post('/api/engine/confirm', { sessionId: 'cs_test_paid0000001' });
    await w.registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_paid0000001', metadata: { product: PRODUCT } } } });
  });
  assert.equal(w.texts.length, 1);
  assert.match(w.texts[0], /^Engine sale: \$97\.00\. Lakeview Inn \(Little Hotelier\)\./);
  assert.equal(w.emails.length, 1);
  assert.equal(w.emails[0].to, 'owner@lakeview.test');
  assert.match(w.emails[0].text, /\$97\.00 today, then \$49\.00 a month/);
  assert.match(w.emails[0].text, /staff login for Marketel in Little Hotelier/);
  const purchases = w.capi.filter(e => e.name === 'Purchase');
  assert.equal(new Set(purchases.map(e => e.eventId)).size, 1);
  assert.equal(purchases[0].eventId, 'engine-purchase.cs_test_paid0000001');
  assert.equal(purchases[0].value, 97);
  assert.ok(w.rows.has('engine-paid:cs_test_paid0000001'));
});

test('a failed text or email is retried by the next confirmation, never lost', async () => {
  const w = world({ failText: true, failMail: true });
  w.sessions.set('cs_test_paid0000002', paid('cs_test_paid0000002'));
  await serve(w, async ({ post }) => {
    const first = await post('/api/engine/confirm', { sessionId: 'cs_test_paid0000002' });
    assert.equal(first.status, 200);
    assert.equal(first.body.emailSent, false);
  });
  assert.equal(w.rows.has('engine-sale-text:cs_test_paid0000002'), false);
  assert.equal(w.rows.has('engine-welcome-mail:cs_test_paid0000002'), false);
});

test('unpaid, foreign and malformed orders are not confirmed', async () => {
  const w = world();
  w.sessions.set('cs_test_open0000001', paid('cs_test_open0000001', { status: 'open', payment_status: 'unpaid' }));
  w.sessions.set('cs_test_wait0000001', paid('cs_test_wait0000001', { payment_status: 'unpaid' }));
  w.sessions.set('cs_test_other000001', paid('cs_test_other000001', { metadata: { product: 'marketel-payoff' } }));
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_open0000001' })).status, 402);
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_wait0000001' })).status, 202);
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_other000001' })).status, 404);
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_missing00001' })).status, 404);
    assert.equal((await post('/api/engine/confirm', { sessionId: 'nope' })).status, 400);
  });
  assert.deepEqual([w.texts.length, w.emails.length], [0, 0]);
});

test('the webhook takes only this product: renewals and cancellations text the owner', async () => {
  const w = world();
  const meta = { product: PRODUCT, property: 'Lakeview Inn', pms: 'Little Hotelier', visitorId: 'v_abcdefgh12' };
  assert.equal(await w.registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_x', metadata: { product: 'marketel-payoff' } } } }), false);
  assert.equal(await w.registration.handleStripeEvent({ type: 'invoice.paid', data: { object: { id: 'in_1', billing_reason: 'subscription_create', amount_paid: 9700,
    parent: { subscription_details: { metadata: meta, subscription: 'sub_1' } } } } }), true);
  assert.equal(w.texts.length, 0, 'the first invoice is the sale, texted on confirmation');
  assert.equal(await w.registration.handleStripeEvent({ type: 'invoice.paid', data: { object: { id: 'in_2', billing_reason: 'subscription_cycle', amount_paid: 4900,
    parent: { subscription_details: { metadata: meta, subscription: 'sub_1' } } } } }), true);
  assert.equal(await w.registration.handleStripeEvent({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', metadata: meta } } }), true);
  assert.equal(await w.registration.handleStripeEvent({ type: 'customer.subscription.updated', data: { object: { id: 'sub_1', metadata: meta } } }), true);
  assert.equal(await w.registration.handleStripeEvent({ type: 'customer.subscription.updated', data: { object: { id: 'sub_2', metadata: { product: 'other' } } } }), false);
  assert.equal(await w.registration.handleStripeEvent({ type: 'invoice.paid', data: { object: { id: 'in_3', amount_paid: 100, parent: { subscription_details: { metadata: { product: 'other' } } } } } }), false);
  assert.deepEqual(w.texts, ['Engine renewed: $49.00 from Lakeview Inn.', 'Engine cancelled: Lakeview Inn.']);
});

test('page steps are recorded per visitor; unknown ones are refused', async () => {
  const w = world();
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/engine/event', { name: 'EngineStep', detail: 'viewed', visitorId: 'v_abcdefgh12', pageView: 'engine-pv.v_abcdefgh12.abc123def4', attribution: { fbp: 'fb.1.1.2' } })).status, 200);
    assert.equal((await post('/api/engine/event', { name: 'EngineStep', detail: 'hacked' })).status, 400);
    assert.equal((await post('/api/engine/event', { name: 'EngineStep', detail: 'email' }, { 'x-marketel-no-track': '1' })).body.ignored, true);
  });
  assert.deepEqual([...w.rows.values()].map(r => [r.name, r.detail]), [['EngineStep', 'viewed']]);
  assert.deepEqual(w.capi.map(e => [e.name, e.eventId]), [['PageView', 'engine-pv.v_abcdefgh12.abc123def4']]);
});
