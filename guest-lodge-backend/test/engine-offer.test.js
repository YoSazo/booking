'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerEngineOffer, order, PRODUCT, TODAY_CENTS, SETUP, MONTHLY, LIFETIME } = require('../engine-offer');

const ACCOUNT = '51AbCdEfGhIjKlMnO';
const ENV = { NODE_ENV: 'test', STRIPE_INSPECT_SECRET_KEY: `sk_test_${ACCOUNT}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${ACCOUNT}abc` };
const BUYER = { email: 'Owner@Lakeview.test ', property: 'Lakeview  Inn', name: 'Dana Reyes', phone: '(205) 555-0142', pms: 'Little Hotelier' };
const ATTEMPT = '0123456789abcdef0123456789abcdef';

function world({ env = ENV, failText = false, failMail = false } = {}) {
  const rows = new Map(), creates = [], sessions = new Map(), subscriptions = new Map(), capi = [], texts = [], emails = [];
  const methods = new Map(), intents = [], cancelled = [], world = { intentStatus: 'succeeded' };
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
    create: async (params, options) => { creates.push({ params, options }); return { id: 'cs_test_created' + creates.length, client_secret: 'cs_test_created_secret_' + creates.length,
      url: params.mode === 'payment' ? 'https://checkout.stripe.com/c/pay/cs_test_life' + creates.length : undefined }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions.get(id); },
  } }, subscriptions: {
    retrieve: async id => { if (!subscriptions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return subscriptions.get(id); },
    update: async (id, { metadata }) => { const sub = subscriptions.get(id); sub.metadata = { ...sub.metadata, ...metadata }; return sub; },
    cancel: async id => { const sub = subscriptions.get(id); sub.status = 'canceled'; cancelled.push(id); return sub; },
  }, paymentMethods: { retrieve: async id => { if (!methods.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return methods.get(id); } },
  paymentIntents: {
    create: async (params, options) => {
      intents.push({ params, options });
      if (world.intentStatus === 'declined') throw Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError' });
      return { id: 'pi_test' + intents.length, status: world.intentStatus, amount: params.amount, amount_received: world.intentStatus === 'succeeded' ? params.amount : 0, metadata: params.metadata };
    },
    cancel: async id => { cancelled.push(id); return { id, status: 'canceled' }; },
  } };
  const app = express();
  const registration = registerEngineOffer(app, { stripe, prisma, env, capiConfigured: true,
    mail: { sendMail: async message => { if (failMail) throw new Error('smtp down'); emails.push(message); } },
    queueCapi: async (name, input) => { capi.push({ name, ...input }); return { queued: true }; },
    text: async body => { if (failText) throw new Error('twilio down'); texts.push(body); },
    isExcludedEmail: email => email === 'owner@bookmarketel.com' });
  return { app, registration, rows, creates, sessions, subscriptions, capi, texts, emails, methods, intents, cancelled, world };
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
  assert.deepEqual(order(BUYER), { email: 'owner@lakeview.test', property: 'Lakeview Inn', name: 'Dana Reyes', phone: '(205) 555-0142', pms: 'Little Hotelier', plan: 'monthly' });
  assert.equal(order({ ...BUYER, plan: 'once' }).plan, 'once');
  assert.equal(order({ ...BUYER, plan: 'free' }).plan, 'monthly');
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
    assert.deepEqual(first.body, { clientSecret: 'cs_test_created_secret_1', value: 97, plan: 'monthly' });
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
    assert.deepEqual(done.body, { paid: true, reference: 'cs_test_paid0000001', plan: 'monthly', value: 97, property: 'Lakeview Inn', pms: 'Little Hotelier', email: 'owner@lakeview.test', emailSent: true,
      lifetime: { open: false, done: false, oneClick: false, priceCents: LIFETIME.cents } });
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

// A paid order whose monthly plan was just started with a card (or a wallet).
function justPaid(w, id, { wallet = false, minutesAgo = 2 } = {}) {
  w.sessions.set(id, paid(id, { subscription: 'sub_' + id, created: Math.floor(Date.now() / 1000) - minutesAgo * 60 }));
  w.subscriptions.set('sub_' + id, { id: 'sub_' + id, status: 'active', customer: 'cus_1', default_payment_method: 'pm_' + id, metadata: { product: PRODUCT, property: 'Lakeview Inn' } });
  w.methods.set('pm_' + id, { id: 'pm_' + id, type: 'card', customer: 'cus_1', card: wallet ? { wallet: { type: 'apple_pay' } } : { wallet: null } });
}

test('right after paying, $497 pay-once is one tap on the same card, and the monthly plan is cancelled', async () => {
  const w = world();
  justPaid(w, 'cs_test_life0000001');
  await serve(w, async ({ post }) => {
    const offer = await post('/api/engine/confirm', { sessionId: 'cs_test_life0000001' });
    assert.deepEqual(offer.body.lifetime, { open: true, done: false, oneClick: true, priceCents: 49700 });
    const yes = await post('/api/engine/lifetime', { sessionId: 'cs_test_life0000001' });
    assert.equal(yes.status, 200, JSON.stringify(yes.body));
    assert.deepEqual(yes.body, { lifetime: true, value: 497, reference: 'cs_test_life0000001' });
    assert.equal(w.intents[0].params.amount, 49700);
    assert.equal(w.intents[0].params.payment_method, 'pm_cs_test_life0000001');
    assert.equal(w.intents[0].options.idempotencyKey, 'engine-lifetime:cs_test_life0000001:saved');
    const sub = w.subscriptions.get('sub_cs_test_life0000001');
    assert.equal(sub.status, 'canceled');
    assert.equal(sub.metadata.lifetime, 'pi_test1');
    // Tapping again, the webhook and Stripe's cancellation repeat nothing.
    assert.equal((await post('/api/engine/lifetime', { sessionId: 'cs_test_life0000001' })).body.lifetime, true);
    await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_test1', amount_received: 49700,
      metadata: { product: LIFETIME.product, parentOrder: 'cs_test_life0000001' } } } });
    await w.registration.handleStripeEvent({ type: 'customer.subscription.deleted', data: { object: sub } });
    const after = await post('/api/engine/confirm', { sessionId: 'cs_test_life0000001' });
    assert.deepEqual(after.body.lifetime, { open: false, done: true, oneClick: false, priceCents: 49700 });
  });
  assert.equal(w.intents.length, 1);
  assert.deepEqual(w.texts.filter(t => /upgrade|cancelled/.test(t)), ['Engine upgrade: $497.00 pay-once from Lakeview Inn. Their $49/month is cancelled.']);
  assert.equal(w.emails.filter(e => /pay-once/.test(e.subject)).length, 1);
  const upgrades = w.capi.filter(e => e.name === LIFETIME.event);
  // Meta's queue keeps one event per id, so a repeat is harmless; Purchase stays one per customer.
  assert.deepEqual([...new Set(upgrades.map(e => `${e.eventId}:${e.value}`))], ['engine-lifetime.cs_test_life0000001:497']);
  assert.deepEqual([...new Set(w.capi.filter(e => e.name === 'Purchase').map(e => e.eventId))], ['engine-purchase.cs_test_life0000001']);
});

test('Apple Pay, or a card that needs another step, pays the $497 on Stripe\'s page instead', async () => {
  const w = world();
  justPaid(w, 'cs_test_wallet00001', { wallet: true });
  justPaid(w, 'cs_test_3dsecure001');
  w.world.intentStatus = 'requires_action';
  await serve(w, async ({ post }) => {
    const wallet = await post('/api/engine/lifetime', { sessionId: 'cs_test_wallet00001', attempt: ATTEMPT });
    assert.equal(wallet.body.next, 'checkout');
    assert.match(wallet.body.url, /^https:\/\/checkout\.stripe\.com\//);
    assert.equal(wallet.body.declined, undefined);
    assert.equal(w.intents.length, 0);
    const made = w.creates.at(-1).params;
    assert.equal(made.mode, 'payment');
    assert.equal(made.line_items[0].price_data.unit_amount, 49700);
    assert.equal(made.metadata.parentOrder, 'cs_test_wallet00001');
    assert.equal(made.success_url, 'https://bookmarketel.com/engine/welcome?session_id=cs_test_wallet00001&lifetime_session={CHECKOUT_SESSION_ID}');
    const action = await post('/api/engine/lifetime', { sessionId: 'cs_test_3dsecure001' });
    assert.equal(action.body.next, 'checkout');
    assert.match(action.body.declined, /another step/);
    assert.deepEqual(w.cancelled, ['pi_test1'], 'the half-done charge is cancelled');
    assert.equal(w.subscriptions.get('sub_cs_test_3dsecure001').status, 'active');
    // Back from Stripe's page, paid.
    w.sessions.set('cs_test_lifepaid001', { object: 'checkout.session', id: 'cs_test_lifepaid001', mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 49700,
      metadata: { product: LIFETIME.product, parentOrder: 'cs_test_wallet00001' } });
    assert.equal((await post('/api/engine/lifetime/confirm', { sessionId: 'cs_test_3dsecure001', lifetimeSession: 'cs_test_lifepaid001' })).status, 404, 'another order\'s payment');
    const back = await post('/api/engine/lifetime/confirm', { sessionId: 'cs_test_wallet00001', lifetimeSession: 'cs_test_lifepaid001' });
    assert.equal(back.body.lifetime, true);
    assert.equal(w.subscriptions.get('sub_cs_test_wallet00001').status, 'canceled');
    assert.equal(w.subscriptions.get('sub_cs_test_wallet00001').metadata.lifetime, 'cs_test_lifepaid001');
  });
});

test('the pay-once offer ends an hour after paying', async () => {
  const w = world();
  justPaid(w, 'cs_test_late0000001', { minutesAgo: 61 });
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_late0000001' })).body.lifetime.open, false);
    const late = await post('/api/engine/lifetime', { sessionId: 'cs_test_late0000001' });
    assert.equal(late.status, 410);
    assert.match(late.body.error, /offer has ended/);
  });
  assert.equal(w.intents.length, 0);
});

test('pay-once from the page: one $497 payment, no subscription, counted as the purchase', async () => {
  const w = world();
  await serve(w, async ({ post }) => {
    const opened = await post('/api/engine/checkout', { attempt: ATTEMPT, ...BUYER, plan: 'once', visitorId: 'v_abcdefgh12' });
    assert.deepEqual(opened.body, { clientSecret: 'cs_test_created_secret_1', value: 497, plan: 'once' });
    const { params } = w.creates[0];
    assert.equal(params.ui_mode, 'embedded');
    assert.equal(params.mode, 'payment');
    assert.equal(params.customer_creation, 'always');
    assert.deepEqual(params.line_items.map(i => [i.price_data.unit_amount, i.price_data.recurring]), [[49700, undefined]]);
    assert.equal(params.subscription_data, undefined);
    assert.equal(params.metadata.plan, 'once');
    assert.deepEqual(params.payment_intent_data.metadata, params.metadata);
    assert.match(w.texts[0], /pay-once \$497/);
    assert.deepEqual(w.capi.map(e => [e.name, e.value]), [['Lead', 497], ['InitiateCheckout', 497]]);
    // Paid: confirmed like any sale, with no pay-once offer after it.
    w.sessions.set('cs_test_once0000001', paid('cs_test_once0000001', { mode: 'payment', subscription: null, amount_total: 49700,
      metadata: { ...paid('x').metadata, plan: 'once' } }));
    const done = await post('/api/engine/confirm', { sessionId: 'cs_test_once0000001' });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.plan, 'once');
    assert.equal(done.body.value, 497);
    assert.deepEqual(done.body.lifetime, { open: false, done: false, oneClick: false, priceCents: 49700 });
    assert.equal((await post('/api/engine/lifetime', { sessionId: 'cs_test_once0000001' })).status, 410);
    assert.equal(await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_x', metadata: { product: PRODUCT, plan: 'once' } } } }), true);
    await w.registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_once0000001', metadata: { product: PRODUCT, plan: 'once' } } } });
  });
  assert.match(w.texts.at(-1), /^Engine sale \(pay-once\): \$497\.00\. Lakeview Inn/);
  assert.equal(w.texts.filter(t => /^Engine sale/.test(t)).length, 1);
  assert.match(w.emails[0].text, /\$497\.00 paid once\. There are no monthly charges\./);
  assert.deepEqual([...new Set(w.capi.filter(e => e.name === 'Purchase').map(e => `${e.eventId}:${e.value}`))], ['engine-purchase.cs_test_once0000001:497']);
});

test('a pay-once order is never mistaken for a monthly one, or the other way round', async () => {
  const w = world();
  w.sessions.set('cs_test_mixed000001', paid('cs_test_mixed000001', { mode: 'subscription', metadata: { ...paid('x').metadata, plan: 'once' } }));
  w.sessions.set('cs_test_mixed000002', paid('cs_test_mixed000002', { mode: 'payment' }));
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_mixed000001' })).status, 402);
    assert.equal((await post('/api/engine/confirm', { sessionId: 'cs_test_mixed000002' })).status, 402);
  });
  assert.equal(w.texts.length, 0);
});
