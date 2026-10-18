'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerPayoff, basket, paidOrder, verifyAccess, accessToken, PRODUCT, VERSION, PREORDER } = require('../payoff');

function fixture({ failEmail = false, ready = true, production = false } = {}) {
  const rows = new Map(), creates = [], emails = [], sessions = new Map();
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
    create: async (params, options) => { creates.push({ params, options }); return { url: 'https://checkout.stripe.com/c/pay/cs_test_example' }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions.get(id); },
    list: async ({ customer_details }) => ({ data: [...sessions.values()].filter(s => s.customer_details?.email === customer_details.email) }),
  } } };
  const mail = { sendMail: async message => { if (failEmail) { failEmail = false; throw new Error('SMTP unavailable'); } emails.push(message); } };
  const env = production ? { STRIPE_MARKETEL_SECRET_KEY: 'sk_test_no_live_charges', NODE_ENV: 'production' } : { NODE_ENV: 'test' };
  const app = express();
  const registration = registerPayoff(app, { prisma, stripe: ready ? stripe : null, mail, env,
    isExcludedEmail: email => email === 'owner@example.test' });
  app.get('/claims', (_req, res) => res.send('Existing Claims page'));
  return { app, registration, rows, creates, emails, sessions, prisma, stripe, mail };
}
async function serve(world, fn) {
  const server = world.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (route, body, headers = {}) => {
    const response = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Buyer Browser', ...headers }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try { await fn({ base, post }); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const order = (extra = {}) => ({ email: 'buyer@example.test', attempt: '01234567-0123-4123-8123-0123456789ab', amount: 1, success_url: 'https://attacker.test', ...extra });
// An order today is Payoff alone; an earlier preorder may carry the extras.
const paid = (addons = [], { preorder = addons.length > 0 } = {}) => ({ id: 'cs_test_validOrder123456', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 3300 + (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0),
  livemode: true, metadata: { product: preorder ? PREORDER.product : PRODUCT, offerVersion: preorder ? PREORDER.version : VERSION, addons: JSON.stringify(addons), visitorId: 'v_abcdefghijk' }, customer_details: { email: 'buyer@example.test' } });
const SECRET = 'payoff-test-secret';

test('Payoff pages and assets are published without exposing source documents or catching other products', async () => {
  await serve(fixture(), async ({ base }) => {
    for (const route of ['/payoff', '/payoff/', '/payoff/order', '/payoff/confirmation', '/payoff/terms', '/payoff/checkout.js', '/payoff/app', '/payoff/app.js', '/payoff/app.css', '/payoff/engine.js', '/payoff/assets/tool-result.jpg']) {
      const r = await fetch(base + route); assert.equal(r.status, 200, route); assert.equal(r.headers.get('cache-control'), 'no-store');
    }
    for (const route of ['/payoff/README.md', '/payoff/BIO-TRANSCRIPT.md', '/payoff/assets/README.md', '/payoff/missing', '/payoff/%2e%2e/server.js']) assert.equal((await fetch(base + route)).status, 404, route);
    assert.equal(await (await fetch(base + '/claims')).text(), 'Existing Claims page');
    for (const route of ['/payoff', '/payoff/order', '/payoff/terms']) {
      const html = await (await fetch(base + route)).text();
      assert.doesNotMatch(html, /preorder-notice|not available yet|No release date/i, route);
      if (route !== '/payoff/terms') assert.doesNotMatch(html, /preorder|in development/i, route);
    }
    assert.match((await fetch(base + '/payoff/app')).headers.get('content-security-policy'), /default-src 'self'/);
  });
});
test('checkout is Payoff alone at the server price, opens the tool on return, and ignores anything the browser adds', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    for (const body of [order(), order({ addons: ['cashflow', 'reset'] }), order({ preorderAccepted: '' })]) {
      assert.equal((await post('/api/payoff/checkout', body)).status, 200);
      const { params, options } = w.creates.at(-1);
      assert.equal(params.mode, 'payment'); assert.deepEqual(params.payment_method_types, ['card']);
      assert.equal(params.line_items.length, 1);
      assert.equal(params.line_items[0].price_data.unit_amount, 3300);
      assert.match(params.custom_text.submit.message, /opens as soon as you pay/);
      assert.doesNotMatch(JSON.stringify(params), /preorder|not yet available/i);
      assert.equal(params.success_url, 'https://bookmarketel.com/payoff/app?session_id={CHECKOUT_SESSION_ID}');
      assert.equal(params.metadata.product, PRODUCT); assert.equal(params.metadata.offerVersion, VERSION); assert.equal(params.metadata.addons, '[]');
      assert.match(options.idempotencyKey, /^payoff:/);
    }
    const first = w.creates[0].options.idempotencyKey;
    await post('/api/payoff/checkout', order()); assert.equal(w.creates.at(-1).options.idempotencyKey, first);
    await post('/api/payoff/checkout', order({ email: 'other@example.test' })); assert.notEqual(w.creates.at(-1).options.idempotencyKey, first);
  });
});
test('invalid email and invalid attempts cannot create checkout', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    for (const body of [order({ email: 'bad' }), order({ attempt: '../bad' }), order({ email: 'a'.repeat(250) + '@x.io' })]) {
      assert.equal((await post('/api/payoff/checkout', body)).status, 400);
    }
    assert.equal(w.creates.length, 0);
  });
});
test('payments fail closed without Stripe and production refuses test keys', async () => {
  for (const w of [fixture({ ready: false }), fixture({ production: true })]) await serve(w, async ({ base, post }) => {
    assert.equal((await (await fetch(base + '/api/payoff/config')).json()).available, false);
    assert.equal((await post('/api/payoff/checkout', order())).status, 503); assert.equal(w.creates.length, 0);
  });
});
test('only correctly paid Payoff orders and earlier preorders count, never another product, extras on a new order or altered totals', () => {
  assert.deepEqual(basket(['reset', 'cashflow']), ['base', 'cashflow', 'reset']);
  assert.deepEqual(paidOrder(paid()), ['base']);
  assert.deepEqual(paidOrder(paid(['reset'])), ['base', 'reset']);
  assert.deepEqual(paidOrder(paid([], { preorder: true })), ['base']);
  assert.equal(paidOrder(paid(['reset'], { preorder: false })), null);
  for (const change of [{ payment_status: 'unpaid' }, { status: 'open' }, { amount_total: 1 }, { currency: 'eur' }, { mode: 'subscription' }, { metadata: { product: 'trace' } }]) assert.equal(paidOrder({ ...paid([]), ...change }), null);
});
test('a paid order opens the tool: confirmation returns a signed link and sends one email with it', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    for (let i = 0; i < 3; i++) {
      const r = await post('/api/payoff/confirm', { sessionId: session.id }); assert.equal(r.status, 200); assert.equal(r.body.paid, true); assert.equal(r.body.totalCents, 3300); assert.equal(r.body.email, undefined);
      assert.equal(verifyAccess(SECRET, r.body.access), session.id);
    }
  });
  assert.equal(w.emails.length, 1); assert.equal(w.emails[0].subject, 'Your Marketel Payoff link');
  const link = w.emails[0].text.match(/https:\/\/bookmarketel\.com\/payoff\/app\?access=(\S+)/);
  assert.ok(link); assert.equal(verifyAccess(SECRET, decodeURIComponent(link[1])), session.id);
  assert.doesNotMatch(w.emails[0].text, /preorder|in development/i);
  assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffPaid').length, 1);
});
test('an earlier preorder opens the tool too, and is told its extras are still coming', async () => {
  const w = fixture(); const session = paid(['cashflow', 'reset']); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    const r = await post('/api/payoff/confirm', { sessionId: session.id });
    assert.equal(r.status, 200); assert.equal(r.body.totalCents, 6400); assert.equal(verifyAccess(SECRET, r.body.access), session.id);
  });
  assert.equal(w.emails.length, 1); assert.match(w.emails[0].text, /\$64\.00/); assert.match(w.emails[0].text, /still in development/);
});
test('access links are checked by signature; tampered or foreign links are refused', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    const { body } = await post('/api/payoff/confirm', { sessionId: session.id });
    assert.equal((await post('/api/payoff/access', { token: body.access })).status, 200);
    for (const token of [body.access.slice(0, -1) + (body.access.endsWith('A') ? 'B' : 'A'), 'cs_test_otherOrder12345.' + body.access.split('.')[1], 'nonsense', '', body.access + '.x']) {
      assert.equal((await post('/api/payoff/access', { token })).status, 403, token);
    }
  });
  assert.equal(verifyAccess('another-secret', accessToken(SECRET, 'cs_test_validOrder123456')), null);
});
test('asking for the link again emails buyers and owners, and answers everyone the same', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  const unpaid = { ...paid(), id: 'cs_test_unpaidOrder1234', payment_status: 'unpaid', customer_details: { email: 'nobody@example.test' } }; w.sessions.set(unpaid.id, unpaid);
  await serve(w, async ({ post }) => {
    for (const email of ['buyer@example.test', 'nobody@example.test', 'stranger@example.test', 'owner@example.test']) {
      const r = await post('/api/payoff/resend', { email });
      assert.equal(r.status, 200); assert.deepEqual(r.body, { sent: true });
    }
    assert.equal((await post('/api/payoff/resend', { email: 'not-an-email' })).status, 400);
  });
  assert.deepEqual(w.emails.map(mail => mail.to), ['buyer@example.test', 'owner@example.test']);
  for (const mail of w.emails) {
    const token = decodeURIComponent(mail.text.match(/access=(\S+)/)[1]);
    assert.ok(verifyAccess(SECRET, token));
  }
});
test('unpaid, foreign, missing and invalid confirmation references never issue a confirmation or email', async () => {
  const w = fixture(); const s = { ...paid([]), payment_status: 'unpaid' }; w.sessions.set(s.id, s);
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/payoff/confirm', { sessionId: s.id })).status, 402);
    assert.equal((await post('/api/payoff/confirm', { sessionId: 'cs_test_missingOrder123' })).status, 404);
    assert.equal((await post('/api/payoff/confirm', { sessionId: 'bad' })).status, 400);
    s.payment_status = 'paid'; s.metadata.product = 'trace'; assert.equal((await post('/api/payoff/confirm', { sessionId: s.id })).status, 402);
  }); assert.equal(w.emails.length, 0);
});
test('no-track, owner and sandbox orders still get confirmations without inflating customer conversions', async () => {
  for (const kind of ['no-track', 'owner', 'sandbox']) {
    const w = fixture(), s = paid([]);
    if (kind === 'no-track') s.metadata.noTrack = '1';
    if (kind === 'owner') s.customer_details.email = 'owner@example.test';
    if (kind === 'sandbox') s.livemode = false;
    w.sessions.set(s.id, s);
    await serve(w, async ({ post }) => assert.equal((await post('/api/payoff/confirm', { sessionId: s.id })).status, 200));
    assert.equal(w.emails.length, 1);
    assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffPaid').length, 0);
  }
});
test('webhook fulfillment confirms even without a browser return; SMTP failure retries without duplicating the order', async () => {
  const w = fixture({ failEmail: true }); const s = paid([]); w.sessions.set(s.id, s);
  const event = { type: 'checkout.session.completed', data: { object: s } };
  await assert.rejects(w.registration.handleStripeEvent(event, {}), /SMTP/);
  assert.equal(await w.registration.handleStripeEvent(event, {}), true);
  assert.equal(await w.registration.handleStripeEvent(event, {}), true);
  assert.equal(w.emails.length, 1);
  assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffPaid').length, 1);
  assert.equal(await w.registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { metadata: { product: 'trace' } } } }, {}), false);
});
test('existing signed webhook verifies the signature before invoking Payoff, and rejects tampering', async () => {
  const w = fixture(); const app = express();
  const webhookSecret = 'whsec_payoff_test';
  w.stripe.webhooks = require('stripe')('sk_test_fixture').webhooks;
  app.use('/api/inspect-stripe-webhook', express.raw({ type: 'application/json' }));
  require('../inspect').registerInspect(app, { prisma: w.prisma, stripe: w.stripe, mail: w.mail,
    handleTraceStripeEvent: w.registration.handleStripeEvent,
    env: { INSPECT_ENABLED: 'false', STRIPE_INSPECT_WEBHOOK_SECRET: webhookSecret } });
  const s = paid([]); w.sessions.set(s.id, s);
  await serve({ app }, async ({ base }) => {
    const payload = JSON.stringify({ id: 'evt_payoff', type: 'checkout.session.completed', data: { object: s } });
    const signature = w.stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const send = (body, sig) => fetch(base + '/api/inspect-stripe-webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body });
    assert.equal((await send(payload, 'invalid')).status, 400); assert.equal(w.emails.length, 0);
    assert.equal((await send(payload, signature)).status, 200); assert.equal(w.emails.length, 1);
    assert.equal((await send(payload + ' ', signature)).status, 400);
  });
});
test('anonymous funnel records contain no receipt email, and owner/headless events are excluded', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    await post('/api/payoff/event', { name: 'PayoffLanded', visitorId: 'v_abcdefghijk', detail: 'private@example.test' });
    await post('/api/payoff/event', { name: 'PayoffFrom', visitorId: 'v_abcdefghijk', detail: 'ad' });
    await post('/api/payoff/event', { name: 'PayoffLanded' }, { 'x-marketel-no-track': '1' });
    await post('/api/payoff/event', { name: 'PayoffLanded' }, { 'user-agent': 'HeadlessChrome' });
    assert.equal((await post('/api/payoff/event', { name: 'Unknown' })).status, 400);
  }); assert.equal(w.rows.size, 2); assert.doesNotMatch(JSON.stringify([...w.rows.values()]), /private@/);
  const definition = require('../wedge-funnel').definitionFor('payoff');
  assert.ok(definition.steps.some(step => step.names.includes('PayoffPaid')));
});
