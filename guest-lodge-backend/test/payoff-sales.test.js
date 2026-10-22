'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { registerPayoff, basket, paidOrder, paidIntent, verifyAccess, accessToken, PRODUCT, VERSION, PREORDER, CUTTER } = require('../payoff');

function fixture({ failEmail = false, ready = true, production = false, clock = Date.now } = {}) {
  const rows = new Map(), creates = [], emails = [], sessions = new Map(), capi = [], intents = new Map(), payments = [], methods = new Map(), customers = [];
  const world = { decline: false };
  const prisma = { inspectEvent: {
    upsert: async ({ where, create }) => { if (!rows.has(where.sourceId)) rows.set(where.sourceId, create); return rows.get(where.sourceId); },
    create: async ({ data }) => {
      const key = data.sourceId || 'event:' + rows.size;
      if (rows.has(key)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      rows.set(key, data); return data;
    },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  const stripe = { coupons: { retrieve: async id => ({ id, valid: true, amount_off: 500, currency: 'usd' }) }, checkout: { sessions: {
    create: async (params, options) => { creates.push({ params, options }); return { url: 'https://checkout.stripe.com/c/pay/cs_test_example' }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions.get(id); },
    list: async ({ customer_details }) => ({ data: [...sessions.values()].filter(s => s.customer_details?.email === customer_details.email) }),
    update: async (id, { metadata }) => { const s = sessions.get(id); s.metadata = { ...s.metadata, ...metadata }; return s; },
  } }, customers: {
    create: async (params, options) => { customers.push({ params, options }); return { id: 'cus_test' + customers.length }; },
  }, paymentMethods: {
    retrieve: async id => { if (!methods.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return methods.get(id); },
  }, paymentIntents: {
    create: async (params, options) => {
      payments.push({ params, options });
      const id = 'pi_3Created' + payments.length;
      // A saved card charged on the spot (the Interest Cutter's one click).
      if (params.confirm && params.payment_method) {
        if (world.decline) throw Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError', code: 'card_declined' });
        const made = { object: 'payment_intent', id, status: 'succeeded', currency: 'usd', livemode: true, amount: params.amount, amount_received: params.amount,
          customer: params.customer, payment_method: params.payment_method, metadata: params.metadata, latest_charge: { refunded: false, amount_refunded: 0 }, client_secret: id + '_secret_x' };
        intents.set(id, made); return made;
      }
      if (params.metadata?.product === 'marketel-payoff-cutter') intents.set(id, { object: 'payment_intent', id, status: 'requires_payment_method', currency: 'usd', amount: params.amount, metadata: params.metadata });
      return { id, client_secret: 'pi_test_created_secret_x' };
    },
    update: async (id, { metadata }) => { const i = intents.get(id); i.metadata = { ...i.metadata, ...metadata }; return i; },
    retrieve: async id => { if (!intents.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return intents.get(id); },
    search: async ({ query }) => ({ data: [...intents.values()].filter(i => query.includes(`metadata['email']:'${i.metadata.email}'`) && i.status === 'succeeded') }),
  } };
  const mail = { sendMail: async message => { if (failEmail) { failEmail = false; throw new Error('SMTP unavailable'); } emails.push(message); } };
  const env = production ? { STRIPE_MARKETEL_SECRET_KEY: 'sk_test_no_live_charges', NODE_ENV: 'production' } : { NODE_ENV: 'test' };
  const app = express();
  const registration = registerPayoff(app, { prisma, stripe: ready ? stripe : null, mail, env,
    queueCapi: async (name, input) => { capi.push({ name, ...input }); return { queued: true }; }, capiConfigured: true,
    isExcludedEmail: email => email === 'owner@example.test', now: clock });
  app.get('/claims', (_req, res) => res.send('Existing Claims page'));
  return { app, registration, rows, creates, emails, sessions, prisma, stripe, mail, capi, intents, payments, methods, customers, world };
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
    for (const route of ['/payoff', '/payoff/', '/payoff/order', '/payoff/confirmation', '/payoff/terms', '/payoff/privacy', '/payoff/checkout.js', '/payoff/app', '/payoff/app.js', '/payoff/app.css', '/payoff/engine.js', '/payoff/assets/tool-result.jpg']) {
      const r = await fetch(base + route); assert.equal(r.status, 200, route); assert.equal(r.headers.get('cache-control'), 'no-store');
    }
    for (const brand of ['visa', 'mastercard', 'americanexpress', 'discover', 'cashapp', 'klarna']) {
      const response = await fetch(base + '/payoff/assets/payment-' + brand + '.svg');
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
    }
    assert.equal((await fetch(base + '/payoff/assets/unlisted.svg')).status, 404);
    const optimized = fs.readdirSync(path.join(__dirname, '../payoff-web/assets')).find(name => name.endsWith('.webp'));
    const imageUrl = base + '/payoff/assets/' + optimized;
    const image = await fetch(imageUrl);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/webp/);
    assert.equal(image.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal((await fetch(imageUrl, { headers: { 'If-None-Match': image.headers.get('etag'), 'Cache-Control': 'max-age=0' } })).status, 304);
    for (const route of ['/payoff/README.md', '/payoff/BIO-TRANSCRIPT.md', '/payoff/assets/README.md', '/payoff/missing', '/payoff/%2e%2e/server.js']) assert.equal((await fetch(base + route)).status, 404, route);
    assert.equal(await (await fetch(base + '/claims')).text(), 'Existing Claims page');
    for (const route of ['/payoff', '/payoff/order', '/payoff/terms']) {
      const html = await (await fetch(base + route)).text();
      assert.doesNotMatch(html, /preorder-notice|not available yet|No release date/i, route);
      if (route !== '/payoff/terms') assert.doesNotMatch(html, /preorder|in development/i, route);
    }
    // Meta's pixel may load on the sales and order pages, never in the tool.
    for (const route of ['/payoff', '/payoff/order']) assert.match((await fetch(base + route)).headers.get('content-security-policy'), /script-src 'self' https:\/\/connect\.facebook\.net/, route);
    const toolCsp = (await fetch(base + '/payoff/app')).headers.get('content-security-policy');
    assert.match(toolCsp, /default-src 'self'/); assert.doesNotMatch(toolCsp, /facebook|stripe/);
    // Stripe's payment fields load on the order page only.
    const orderPage = await fetch(base + '/payoff/order');
    assert.match(orderPage.headers.get('content-security-policy'), /script-src [^;]*https:\/\/js\.stripe\.com/);
    assert.match(orderPage.headers.get('content-security-policy'), /frame-src [^;]*https:\/\/hooks\.stripe\.com/);
    assert.match(orderPage.headers.get('permissions-policy'), /payment=\(self "https:\/\/js\.stripe\.com"/);
    assert.doesNotMatch((await fetch(base + '/payoff')).headers.get('content-security-policy'), /stripe/);
    for (const file of ['order.js', 'order.css']) assert.equal((await fetch(base + '/payoff/' + file)).status, 200, file);
    const font = fs.readdirSync(path.join(__dirname, '../payoff-web/assets')).find(name => /^font-.*\.woff2$/.test(name));
    const fontResponse = await fetch(base + '/payoff/assets/' + font);
    assert.equal(fontResponse.status, 200); assert.match(fontResponse.headers.get('content-type'), /font\/woff2/);
    assert.equal(fontResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });
});
test('the terms carry the disclaimer, the privacy policy is Payoff\'s own, and every page states the same 30-day guarantee', async () => {
  await serve(fixture(), async ({ base }) => {
    const terms = await (await fetch(base + '/payoff/terms')).text();
    assert.match(terms, /<h1>Marketel Payoff Terms &amp; Conditions<\/h1>/);
    for (const heading of ['Disclaimer', 'Educational purposes only', 'No guaranteed results', 'You are responsible for your decisions', 'Assumption of risk', 'Limitation of liability']) assert.match(terms, new RegExp(`>${heading}<`), heading);
    assert.match(terms, /free \$5 gift/);
    assert.doesNotMatch(terms, /30-minute|minute window/);
    for (const heading of ['Refund Eligibility Requirements', 'Duration of Product Usage', 'Submission of Proof', 'Evaluation Process', 'Refund Consideration', 'Time Limit for Submission', 'Non-Transferability', 'Discretionary Authority']) assert.match(terms, new RegExp(`>${heading}<`), heading);
    assert.match(terms, /thirty \(30\) consecutive days/);
    assert.match(terms, /within ninety \(90\) days after their purchase/, 'the request window is longer than the required use');
    assert.match(terms, /Your applicable consumer rights are unaffected/);
    const privacy = await (await fetch(base + '/payoff/privacy')).text();
    assert.match(privacy, /<h1>Marketel Payoff Privacy Policy<\/h1>/);
    assert.match(privacy, /stay on your device and are not sent to us/);
    assert.match(privacy, /hashed before they are sent/);
    for (const route of ['/payoff', '/payoff/order', '/payoff/confirmation', '/payoff/terms', '/payoff/privacy']) {
      const html = await (await fetch(base + route)).text();
      assert.match(html, /<a href="\/payoff\/terms"[^>]*>Terms &amp; Conditions<\/a> \| <a href="\/payoff\/privacy"[^>]*>Privacy Policy<\/a>/, route);
      assert.match(html, /Copyright 2026 Marketel\. All Rights Reserved\./, route);
    }
  });
  // The badge and the terms must never disagree: one number of days, everywhere.
  const sources = ['payoff.js', 'payoff-web/content.js', 'payoff-web/page.js', 'payoff-web/order.html', 'payoff-web/terms.html', 'payoff-web/privacy.html']
    .map(file => [file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8')]);
  for (const [file, text] of sources) {
    const days = [...text.matchAll(/(\d+)-day money-back|money-back guarantee for (\d+) days|within (\d+) days of purchase|(\d+)-DAY/g)].map(m => m.slice(1).find(Boolean));
    assert.ok(days.length, `${file} states the guarantee`);
    assert.deepEqual([...new Set(days)], ['30'], file);
  }
});
test('checkout charges server prices for Payoff and any extras, opens the tool on return, and keeps idempotency', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    for (const [addons, total] of [[[], 3300], [['cashflow'], 5500], [['reset'], 4200], [['cashflow', 'reset'], 6400]]) {
      const reply = await post('/api/payoff/checkout', order({ addons }));
      assert.equal(reply.status, 200); assert.equal(reply.body.value, total / 100);
      const { params, options } = w.creates.at(-1);
      assert.equal(params.mode, 'payment'); assert.equal(params.payment_method_types, undefined, 'Stripe Dashboard controls the eligible payment methods');
      assert.equal(params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), total);
      assert.equal(params.line_items[0].price_data.unit_amount, 3300);
      assert.match(params.custom_text.submit.message, /opens as soon as you pay/);
      assert.doesNotMatch(JSON.stringify(params), /preorder|not yet available|in development/i);
      assert.equal(params.success_url, 'https://bookmarketel.com/payoff/upgrade?session_id={CHECKOUT_SESSION_ID}');
      assert.equal(params.metadata.product, PRODUCT); assert.equal(params.metadata.offerVersion, VERSION); assert.equal(params.metadata.addons, JSON.stringify(addons));
      assert.match(options.idempotencyKey, /^payoff:/);
    }
    await post('/api/payoff/checkout', order()); const first = w.creates.at(-1).options.idempotencyKey;
    await post('/api/payoff/checkout', order()); assert.equal(w.creates.at(-1).options.idempotencyKey, first);
    await post('/api/payoff/checkout', order({ addons: ['reset'] })); assert.notEqual(w.creates.at(-1).options.idempotencyKey, first);
    await post('/api/payoff/checkout', order({ email: 'other@example.test' })); assert.notEqual(w.creates.at(-1).options.idempotencyKey, first);
  });
});
test('invalid email and invalid attempts cannot create checkout', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    for (const body of [order({ email: 'bad' }), order({ attempt: '../bad' }), order({ email: 'a'.repeat(250) + '@x.io' }), order({ addons: ['other'] }), order({ addons: ['reset', 'reset'] }), order({ addons: {} })]) {
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
  assert.deepEqual(paidOrder(paid(['cashflow', 'reset'], { preorder: false })), ['base', 'cashflow', 'reset']);
  assert.equal(paidOrder({ ...paid(['reset'], { preorder: false }), amount_total: 3300 }), null);
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
test('an order with extras, new or preordered, opens them too and the email says where they are', async () => {
  for (const preorder of [false, true]) {
    const w = fixture(); const session = paid(['cashflow', 'reset'], { preorder }); w.sessions.set(session.id, session);
    await serve(w, async ({ post }) => {
      const r = await post('/api/payoff/confirm', { sessionId: session.id });
      assert.equal(r.status, 200); assert.equal(r.body.totalCents, 6400); assert.equal(verifyAccess(SECRET, r.body.access), session.id);
      assert.deepEqual(r.body.extras, ['cashflow', 'reset']);
      assert.deepEqual((await post('/api/payoff/access', { token: r.body.access })).body, { ok: true, extras: ['cashflow', 'reset'] });
    });
    assert.equal(w.emails.length, 1); assert.match(w.emails[0].text, /\$64\.00/);
    assert.match(w.emails[0].text, /cash-flow calendar and spending reset are inside Payoff/);
    assert.doesNotMatch(w.emails[0].text, /in development/);
  }
});
test('access tells the tool which extras the order has; owners get both; Stripe trouble keeps what the tool knew', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    const { body } = await post('/api/payoff/confirm', { sessionId: session.id });
    assert.deepEqual(body.extras, []);
    assert.deepEqual((await post('/api/payoff/access', { token: body.access })).body, { ok: true, extras: [] });
    assert.deepEqual((await post('/api/payoff/access', { token: accessToken(SECRET, 'own_0123456789abcdef01234567') })).body, { ok: true, extras: ['cashflow', 'reset', 'cutter'] });
    w.stripe.checkout.sessions.retrieve = async () => { throw new Error('Stripe down'); };
    assert.deepEqual((await post('/api/payoff/access', { token: body.access })).body, { ok: true, extras: null });
  });
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

test('Meta hears AddToCart on the order page, InitiateCheckout at Stripe and Purchase on payment, with the pixel\'s event ids', async () => {
  const w = fixture(); const session = paid(['reset'], { preorder: false }); w.sessions.set(session.id, session);
  const attribution = { fbp: 'fb.1.1700000000000.123456789', fbc: 'fb.1.1700000000000.AbCdEf', sourceUrl: 'https://bookmarketel.com/payoff?utm_source=facebook', utmSource: 'facebook' };
  await serve(w, async ({ post }) => {
    await post('/api/payoff/event', { name: 'PayoffLanded', visitorId: 'v_abcdefghijk', attribution });
    assert.equal(w.capi.length, 0);
    await post('/api/payoff/event', { name: 'PayoffOrderViewed', visitorId: 'v_abcdefghijk', attribution });
    await post('/api/payoff/checkout', order({ addons: ['reset'], visitorId: 'v_abcdefghijk', attribution }));
    const { params } = w.creates.at(-1);
    assert.equal(params.metadata.fbp, attribution.fbp); assert.equal(params.metadata.fbc, attribution.fbc);
    session.metadata = { ...session.metadata, fbp: params.metadata.fbp, fbc: params.metadata.fbc, sourceUrl: params.metadata.sourceUrl };
    await post('/api/payoff/confirm', { sessionId: session.id });
  });
  assert.deepEqual(w.capi.map(event => [event.name, event.eventId, event.value]), [
    ['AddToCart', 'payoff-cart.v_abcdefghijk', 33],
    ['InitiateCheckout', 'payoff-checkout.v_abcdefghijk', 42],
    ['Purchase', 'payoff-purchase.cs_test_validOrder123456', 42],
  ]);
  for (const event of w.capi) { assert.equal(event.fbp, attribution.fbp); assert.equal(event.fbc, attribution.fbc); assert.equal(event.product, 'marketel-payoff'); }
  assert.equal(w.capi[2].email, 'buyer@example.test');
});
test('Meta hears nothing from the owner, no-track browsers, test browsers or sandbox orders', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    await post('/api/payoff/event', { name: 'PayoffOrderViewed', visitorId: 'v_abcdefghijk' }, { 'x-marketel-no-track': '1' });
    await post('/api/payoff/event', { name: 'PayoffOrderViewed', visitorId: 'v_abcdefghijk' }, { 'user-agent': 'HeadlessChrome' });
    await post('/api/payoff/checkout', order({ email: 'owner@example.test', visitorId: 'v_abcdefghijk' }));
    await post('/api/payoff/checkout', order({ visitorId: 'v_abcdefghijk' }), { 'x-marketel-no-track': '1' });
    for (const change of [{ livemode: false }, { customer_details: { email: 'owner@example.test' } }]) {
      const s = { ...paid(), ...change }; w.sessions.set(s.id, s);
      await post('/api/payoff/confirm', { sessionId: s.id });
    }
  });
  assert.deepEqual(w.capi, []);
});

test('the free $5 gift survives reload and restart, discounts only the base, fulfills a discounted purchase, and its clock loops every 5 minutes without ending', async () => {
  let time = Date.parse('2026-10-19T18:00:00Z');
  const w = fixture({ clock: () => time });
  await serve(w, async ({ base, post }) => {
    const response = await fetch(base + '/api/payoff/config?offer=1');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const first = await response.json();
    assert.equal(first.offer.basePriceCents, 2800);
    assert.equal(first.offer.expiresAt, time + 5 * 60000);
    assert.equal(first.offer.loopMs, 5 * 60000);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    time += 2 * 60000;
    const repeated = await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json();
    assert.equal(repeated.offer.expiresAt, first.offer.expiresAt);
    await serve(fixture({ clock: () => time }), async ({ base: restarted }) => {
      const restored = await (await fetch(restarted + '/api/payoff/config?offer=1', { headers: { cookie } })).json();
      assert.equal(restored.offer.expiresAt, first.offer.expiresAt);
    });
    const body = order({ addons: ['cashflow', 'reset'], useCheckoutOffer: true, expectedTotalCents: 5900 });
    assert.equal((await post('/api/payoff/checkout', body, { cookie })).body.value, 59);
    assert.deepEqual(w.creates[0].params.line_items.map(item => item.price_data.unit_amount), [3300, 2200, 900]);
    assert.deepEqual(w.creates[0].params.discounts, [{ coupon: 'marketel-payoff-checkout-5-v1' }]);
    await post('/api/payoff/checkout', body, { cookie });
    assert.equal(w.creates[0].options.idempotencyKey, w.creates[1].options.idempotencyKey);
    const purchase = paid(['cashflow', 'reset'], { preorder: false });
    purchase.metadata = { ...w.creates[0].params.metadata }; purchase.amount_total = 5900;
    w.sessions.set(purchase.id, purchase);
    const confirmed = await post('/api/payoff/confirm', { sessionId: purchase.id });
    assert.equal(confirmed.status, 200); assert.equal(confirmed.body.totalCents, 5900);
    assert.deepEqual(confirmed.body.extras, ['cashflow', 'reset']);
    assert.match(w.emails[0].text, /Free gift: −\$5\.00/);
    assert.match(w.emails[0].text, /Total paid: \$59\.00/);
    assert.equal(w.capi.find(event => event.name === 'Purchase').value, 59);
    // 28 minutes in: the clock has started over five times and the gift remains.
    time += 26 * 60000;
    const looped = await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json();
    assert.equal(looped.offer.discountCents, 500); assert.equal(looped.offer.basePriceCents, 2800);
    assert.equal(looped.offer.expiresAt, first.offer.expiresAt + 25 * 60000);
    // Exactly at a boundary the next five minutes begin.
    time = looped.offer.expiresAt;
    assert.equal((await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json()).offer.expiresAt, time + 5 * 60000);
    assert.equal((await post('/api/payoff/checkout', body, { cookie })).body.value, 59);
    time += 3 * 24 * 60 * 60000 + 1234;
    assert.equal((await post('/api/payoff/pay', order({ useCheckoutOffer: true, expectedTotalCents: 2800 }), { cookie })).status, 200, 'days later the $28 total is still accepted');
  });
});

test('an offer cookie issued under the old 30-minute window joins the 5-minute loop', () => {
  const { issueOffer, readOffer } = require('../payoff-offer');
  const start = Date.parse('2026-10-19T18:00:00Z');
  // Old tokens stored issue time + 30 minutes, which is what issuing 25 minutes later now stores.
  const old = issueOffer(SECRET, start + 25 * 60000);
  assert.deepEqual(readOffer(SECRET, old, start + 10 * 60000), { expiresAt: start + 15 * 60000, discountCents: 500, loopMs: 300000 });
  assert.deepEqual(readOffer(SECRET, old, start + 31 * 60000), { expiresAt: start + 35 * 60000, discountCents: 500, loopMs: 300000 });
  assert.equal(readOffer(SECRET, old.replace(/.$/, old.endsWith('A') ? 'B' : 'A'), start), null);
});

test('forged offers and unrecognized discounted payments cannot grant a discount or access', async () => {
  const w = fixture();
  await serve(w, async ({ base, post }) => {
    const cookie = 'payoff_checkout_offer=forged';
    const config = await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json();
    assert.equal(config.offer, undefined);
    assert.equal((await post('/api/payoff/checkout', order({ useCheckoutOffer: true, expectedTotalCents: 2800 }), { cookie })).status, 409);
    assert.equal(w.creates.length, 0);
  });
  const receipt = paid(); receipt.amount_total = 2800;
  assert.equal(paidOrder(receipt), null);
  receipt.metadata.checkoutDiscountVersion = 'payoff-checkout-5-v1'; receipt.metadata.checkoutDiscountCents = '500';
  assert.deepEqual(paidOrder(receipt), ['base']);
  receipt.metadata.checkoutDiscountCents = '1000'; assert.equal(paidOrder(receipt), null);
});

for (const missing of [false, true]) test('checkout coupon is validated before opening Stripe (missing: '+missing+')', async () => {
  const w = fixture(); let created = 0;
  w.stripe.coupons.retrieve = async () => {
    if (missing) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
    return { id: 'wrong', valid: true, amount_off: 1000, currency: 'usd' };
  };
  w.stripe.coupons.create = async (params, options) => {
    created++; assert.equal(params.amount_off, 500); assert.equal(options.idempotencyKey, params.id);
    return { ...params, valid: true };
  };
  await serve(w, async ({ base, post }) => {
    const response = await fetch(base + '/api/payoff/config?offer=1');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const result = await post('/api/payoff/checkout', order({ useCheckoutOffer: true, expectedTotalCents: 2800 }), { cookie });
    assert.equal(result.status, missing ? 200 : 503);
    assert.equal(w.creates.length, missing ? 1 : 0);
    assert.equal(created, missing ? 1 : 0);
  });
});

test('a delayed payment unlocks only after Stripe confirms success, and repeated success emails once', async () => {
  const w = fixture(), session = paid([]);
  session.payment_status = 'unpaid'; w.sessions.set(session.id, session);
  assert.equal(await w.registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: session } }, {}), true);
  assert.equal(w.emails.length, 0);
  assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffPaid').length, 0);
  session.payment_status = 'paid';
  const success = { type: 'checkout.session.async_payment_succeeded', data: { object: session } };
  assert.equal(await w.registration.handleStripeEvent(success, {}), true);
  assert.equal(await w.registration.handleStripeEvent(success, {}), true);
  assert.equal(w.emails.length, 1);
  assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffPaid').length, 1);
});

test('the landing previews the free gift without issuing or restarting its clock, and the gift never ends', async () => {
  let time = Date.now(); const w = fixture({ clock: () => time });
  await serve(w, async ({ base }) => {
    const preview = await fetch(base + '/api/payoff/config?offer=preview');
    assert.equal(preview.headers.get('set-cookie'), null);
    assert.equal((await preview.json()).checkoutOffer.discountCents, 500);
    const started = await fetch(base + '/api/payoff/config?offer=1');
    const cookie = started.headers.get('set-cookie').split(';')[0];
    const expiresAt = (await started.json()).offer.expiresAt;
    time += 10 * 60000;
    const ongoing = await fetch(base + '/api/payoff/config?offer=preview', { headers: { cookie } });
    assert.equal(ongoing.headers.get('set-cookie'), null);
    const shown = (await ongoing.json()).checkoutOffer;
    assert.equal(shown.expiresAt, expiresAt + 10 * 60000); assert.equal(shown.loopMs, 300000);
    time += 21 * 60000;
    const later = await (await fetch(base + '/api/payoff/config?offer=preview', { headers: { cookie } })).json();
    assert.equal(later.checkoutOffer.discountCents, 500);
    assert.equal(later.checkoutOffer.expiresAt, expiresAt + 30 * 60000);
  });
});

// The order page's own payment form: a PaymentIntent per order, never a session.
const intent = (addons = [], extra = {}) => ({ object: 'payment_intent', id: 'pi_3PaidOrder123456', status: 'succeeded', currency: 'usd', livemode: true,
  latest_charge: { billing_details: { name: 'Test Buyer' } },
  amount_received: 3300 + (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0), receipt_email: 'Buyer@Example.test',
  metadata: { product: PRODUCT, offerVersion: VERSION, checkout: 'embedded', addons: JSON.stringify(addons), visitorId: 'v_abcdefghijk', email: 'buyer@example.test' }, ...extra });
test('the order page form creates a payment at server prices, keeps retries on one payment, and tells Meta once per visitor', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    const r = await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset', 'cashflow'], visitorId: 'v_abcdefghijk', expectedTotalCents: 6400 }));
    assert.equal(r.status, 200); assert.equal(r.body.value, 64); assert.equal(r.body.clientSecret, 'pi_test_created_secret_x');
    const { params, options } = w.payments[0];
    assert.equal(params.amount, 6400); assert.equal(params.currency, 'usd'); assert.deepEqual(params.automatic_payment_methods, { enabled: true });
    assert.equal(params.receipt_email, 'Buyer@Example.test');
    // A customer for the order, and the card kept for this visit only (the Interest Cutter's one click).
    assert.equal(params.customer, 'cus_test1'); assert.equal(w.customers[0].params.email, 'Buyer@Example.test');
    assert.deepEqual(params.payment_method_options, { card: { setup_future_usage: 'on_session' } });
    assert.equal(params.setup_future_usage, undefined, 'never for every method: Klarna and bank stay available');
    assert.equal(params.metadata.checkout, 'embedded'); assert.equal(params.metadata.email, 'buyer@example.test');
    assert.equal(params.metadata.addons, '["cashflow","reset"]'); assert.equal(params.metadata.product, PRODUCT);
    assert.ok(!('amount' in order()) || params.amount !== 1);
    await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset', 'cashflow'], visitorId: 'v_abcdefghijk', expectedTotalCents: 6400 }));
    assert.equal(w.payments[1].options.idempotencyKey, options.idempotencyKey);
    const changed = await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset'], visitorId: 'v_abcdefghijk', expectedTotalCents: 4200 }));
    assert.equal(changed.status, 200); assert.notEqual(w.payments[2].options.idempotencyKey, options.idempotencyKey);
    assert.equal((await post('/api/payoff/pay', order({ addons: ['reset'], expectedTotalCents: 3300 }))).status, 409);
    assert.equal((await post('/api/payoff/pay', order({ email: 'nope' }))).status, 400);
    assert.equal((await post('/api/payoff/pay', order({ addons: ['other'] }))).status, 400);
    const checkouts = w.capi.filter(event => event.name === 'InitiateCheckout');
    assert.equal(checkouts.length, 3); assert.ok(checkouts.every(event => event.eventId === 'payoff-checkout.v_abcdefghijk'));
    await post('/api/payoff/pay', order({ email: 'owner@example.test', visitorId: 'v_abcdefghijk' }));
    await post('/api/payoff/pay', order({ visitorId: 'v_abcdefghijk' }), { 'x-marketel-no-track': '1' });
    assert.equal(w.capi.filter(event => event.name === 'InitiateCheckout').length, 3);
    assert.equal(w.creates.length, 0);
  });
});
test('a paid order-page payment opens the tool, emails once, counts once, and finds its link again by email', async () => {
  const w = fixture(); const pi = intent(['cashflow']); w.intents.set(pi.id, pi);
  await serve(w, async ({ post }) => {
    const r = await post('/api/payoff/confirm', { paymentIntent: pi.id });
    assert.equal(r.status, 200); assert.deepEqual(r.body.extras, ['cashflow']); assert.equal(r.body.totalCents, 5500); assert.equal(r.body.emailSent, true);
    assert.equal(verifyAccess(SECRET, r.body.access), pi.id);
    await post('/api/payoff/confirm', { paymentIntent: pi.id });
    assert.equal(w.emails.length, 1); assert.equal(w.emails[0].to, 'Buyer@Example.test');
    assert.match(w.emails[0].text, /Order reference: pi_3PaidOrder123456/);
    assert.ok(w.rows.has('payoff-paid:' + pi.id));
    const purchases = w.capi.filter(event => event.name === 'Purchase' && event.eventId === 'payoff-purchase.' + pi.id);
    assert.equal(purchases.length, 2);
    // The buyer's name from Stripe goes with the Purchase, for Meta's matching (hashed when queued).
    assert.equal(purchases[0].fullName, 'Test Buyer');
    const access = await post('/api/payoff/access', { token: r.body.access });
    assert.deepEqual(access.body, { ok: true, extras: ['cashflow'] });
    assert.deepEqual((await post('/api/payoff/resend', { email: 'BUYER@example.test' })).body, { sent: true });
    assert.equal(w.emails.length, 2); assert.equal(verifyAccess(SECRET, decodeURIComponent(w.emails[1].text.match(/access=(\S+)/)[1])), pi.id);
  });
});
test('an order-page payment that is processing, failed, altered or from hosted Checkout never opens the tool', async () => {
  const w = fixture();
  const processing = intent([], { id: 'pi_3Processing12345', status: 'processing' });
  const failed = intent([], { id: 'pi_3Declined1234567', status: 'requires_payment_method' });
  const altered = intent([], { id: 'pi_3Altered12345678', amount_received: 100 });
  const hosted = intent([], { id: 'pi_3HostedSession12' }); delete hosted.metadata.checkout;
  for (const pi of [processing, failed, altered, hosted]) w.intents.set(pi.id, pi);
  await serve(w, async ({ post }) => {
    const pending = await post('/api/payoff/confirm', { paymentIntent: processing.id });
    assert.equal(pending.status, 202); assert.equal(pending.body.processing, true); assert.ok(!pending.body.access);
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: failed.id })).status, 402);
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: altered.id })).status, 402);
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: hosted.id })).status, 402);
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: 'pi_3Missing12345678' })).status, 404);
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: 'cs_test_wrongKind123456' })).status, 400);
    assert.equal((await post('/api/payoff/access', { token: accessToken(SECRET, failed.id) })).body.extras, null);
  });
  assert.equal(w.emails.length, 0); assert.equal(w.rows.size, 0);
  assert.equal(paidIntent({ ...intent(), currency: 'eur' }), null);
  assert.equal(paidIntent({ ...intent(), metadata: { ...intent().metadata, checkoutDiscountCents: '900', checkoutDiscountVersion: 'payoff-checkout-5-v1' }, amount_received: 2400 }), null);
  assert.deepEqual(paidIntent({ ...intent(), metadata: { ...intent().metadata, checkoutDiscountCents: '500', checkoutDiscountVersion: 'payoff-checkout-5-v1' }, amount_received: 2800 }), ['base']);
});
test('the webhook fulfills order-page payments and leaves hosted sessions\' payments to their session', async () => {
  const w = fixture(); const pi = intent(['reset']); w.intents.set(pi.id, pi);
  const hosted = intent([], { id: 'pi_3HostedSession12' }); delete hosted.metadata.checkout; w.intents.set(hosted.id, hosted);
  assert.equal(await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: pi.id, metadata: pi.metadata } } }), true);
  assert.equal(w.emails.length, 1); assert.ok(w.rows.has('payoff-paid:' + pi.id));
  assert.equal(await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: pi.id, metadata: pi.metadata } } }), true);
  assert.equal(w.emails.length, 1);
  assert.equal(await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: hosted.id, metadata: hosted.metadata } } }), false);
  assert.equal(await w.registration.handleStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_3Other12345', metadata: { product: 'marketel-claims-trial-balance' } } } }), false);
});
test('config hands the order page a publishable key only from the same Stripe account and mode', async () => {
  const account = '51AbCdEfGhIjKlMnO';
  const world = env => { const w = fixture(); w.app = express(); registerPayoff(w.app, { prisma: w.prisma, stripe: w.stripe, mail: w.mail, env: { NODE_ENV: 'test', ...env } }); return w; };
  await serve(world({ STRIPE_INSPECT_SECRET_KEY: `sk_test_${account}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${account}abc` }), async ({ base }) => {
    assert.equal((await (await fetch(base + '/api/payoff/config')).json()).stripeKey, `pk_test_${account}abc`);
  });
  await serve(world({ STRIPE_INSPECT_SECRET_KEY: `sk_test_${account}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: 'pk_test_51ZzZzZzZzZzZzZzZzabc' }), async ({ base }) => {
    assert.equal((await (await fetch(base + '/api/payoff/config')).json()).stripeKey, null);
  });
  await serve(world({}), async ({ base }) => {
    assert.equal((await (await fetch(base + '/api/payoff/config')).json()).stripeKey, null);
  });
});

test('the landing splits new visitors between the letter and the quiz, keeps each on theirs, and lets the owner pick', async () => {
  const world = options => { const w = fixture(); w.app = express(); registerPayoff(w.app, { prisma: w.prisma, stripe: w.stripe, mail: w.mail, env: { NODE_ENV: 'test' }, ...options }); return w; };
  const page = async (base, headers = {}, query = '') => { const r = await fetch(base + '/payoff' + query, { headers: { 'user-agent': 'Buyer Browser', ...headers } }); return { html: await r.text(), cookie: r.headers.get('set-cookie') || '' }; };
  const isQuiz = html => /data-variant="quiz"/.test(html), isLetter = html => /data-variant="letter"/.test(html);
  let draws = [0.2, 0.8];
  await serve(world({ quizShare: 0.5, random: () => draws.shift() }), async ({ base }) => {
    const first = await page(base);
    assert.ok(isQuiz(first.html)); assert.match(first.cookie, /payoff_variant=quiz; Max-Age=7776000; Path=\/payoff; .*HttpOnly/);
    const second = await page(base);
    assert.ok(isLetter(second.html)); assert.match(second.cookie, /payoff_variant=letter/);
    // A returning visitor keeps their version without a new draw.
    assert.ok(isQuiz((await page(base, { cookie: 'payoff_variant=quiz' })).html));
    assert.equal((await page(base, { cookie: 'payoff_variant=quiz' })).cookie, '');
    assert.equal(draws.length, 0);
    // The owner (or a test) can open either one.
    const forced = await page(base, { cookie: 'payoff_variant=quiz' }, '?v=letter');
    assert.ok(isLetter(forced.html)); assert.match(forced.cookie, /payoff_variant=letter/);
    // Crawlers and Meta's ad review see the letter and get no cookie.
    for (const agent of ['facebookexternalhit/1.1', 'Mozilla/5.0 HeadlessChrome/120', 'Googlebot/2.1 (+http://www.google.com/bot.html)']) {
      const bot = await page(base, { 'user-agent': agent });
      assert.ok(isLetter(bot.html), agent); assert.equal(bot.cookie, '', agent);
    }
    const quizCsp = (await fetch(base + '/payoff', { headers: { cookie: 'payoff_variant=quiz' } })).headers.get('content-security-policy');
    assert.match(quizCsp, /script-src 'self' https:\/\/connect\.facebook\.net/); assert.doesNotMatch(quizCsp, /stripe/);
    for (const file of ['quiz.js', 'quiz.css', 'engine.js']) assert.equal((await fetch(base + '/payoff/' + file)).status, 200, file);
  });
  // Ending the test sends everyone to one version, whatever their cookie says.
  await serve(world({ env: { NODE_ENV: 'test', PAYOFF_QUIZ_SHARE: '1' } }), async ({ base }) => {
    assert.ok(isQuiz((await page(base, { cookie: 'payoff_variant=letter' })).html));
  });
  await serve(world({ env: { NODE_ENV: 'test', PAYOFF_QUIZ_SHARE: '0' } }), async ({ base }) => {
    const r = await page(base, { cookie: 'payoff_variant=quiz' });
    assert.ok(isLetter(r.html)); assert.equal(r.cookie, '');
  });
});
test('the story page is served with the pixel-only policy and records only its own reading steps', async () => {
  const w = fixture();
  await serve(w, async ({ base, post }) => {
    const r = await fetch(base + '/payoff/hidden-payoff');
    assert.equal(r.status, 200);
    assert.match(await r.text(), /class="adv-topbar"/);
    const csp = r.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self' https:\/\/connect\.facebook\.net/); assert.doesNotMatch(csp, /stripe/);
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
    for (const file of ['story.js', 'story.css']) assert.equal((await fetch(base + '/payoff/' + file)).status, 200, file);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'viewed', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'scroll50', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'button', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'tapped', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'shared', visitorId: 'v_abcdefghijk' })).status, 400);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffStory', detail: 'scroll60', visitorId: 'v_abcdefghijk' })).status, 400);
  });
  assert.deepEqual([...w.rows.values()].map(row => [row.name, row.detail]),
    [['PayoffStory', 'viewed'], ['PayoffStory', 'scroll50'], ['PayoffStory', 'button'], ['PayoffStory', 'tapped']]);
});
test('the landing version and quiz steps are recorded by name only, never with numbers', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/payoff/event', { name: 'PayoffVariant', detail: 'quiz', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffQuizStep', detail: 'reveal', visitorId: 'v_abcdefghijk' })).status, 200);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffQuizStep', detail: '4200', visitorId: 'v_abcdefghijk' })).status, 400);
    assert.equal((await post('/api/payoff/event', { name: 'PayoffVariant', detail: 'other', visitorId: 'v_abcdefghijk' })).status, 400);
  });
  assert.deepEqual([...w.rows.values()].map(row => [row.name, row.detail]), [['PayoffVariant', 'quiz'], ['PayoffQuizStep', 'reveal']]);
});
test('the quiz earns the $5 only by finishing within 10 minutes; its looping clock starts at checkout; the letter is unaffected', async () => {
  let time = Date.parse('2026-10-19T20:00:00Z');
  const w = fixture({ clock: () => time });
  await serve(w, async ({ base }) => {
    const call = async (route, body, cookie = '') => {
      const r = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'user-agent': 'Buyer Browser', cookie }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { body: await r.json(), cookie: (r.headers.get('set-cookie') || '').split(';')[0], status: r.status };
    };
    assert.equal((await call('/api/payoff/quiz')).body.quiz, null);
    assert.equal((await call('/api/payoff/quiz')).cookie, '', 'looking starts nothing');
    assert.equal((await call('/api/payoff/quiz', { action: 'nope' })).status, 400);
    // In time: the window runs from the first answer; finishing earns the offer.
    const started = await call('/api/payoff/quiz', { action: 'start' });
    assert.equal(started.body.quiz.deadline, time + 10 * 60000); assert.equal(started.body.windowMs, 600000);
    let quiz = started.cookie;
    time += 4 * 60000;
    assert.equal((await call('/api/payoff/quiz', { action: 'start' }, quiz)).body.quiz.deadline, Date.parse('2026-10-19T20:10:00Z'), 'starting again keeps the first clock');
    assert.equal((await call('/api/payoff/config?offer=preview', null, quiz)).body.checkoutOffer.discountCents, 0, 'not yet earned');
    const finished = await call('/api/payoff/quiz', { action: 'finish' }, quiz);
    assert.deepEqual(finished.body.quiz, { deadline: Date.parse('2026-10-19T20:10:00Z'), finished: true, earned: true });
    quiz = finished.cookie;
    time += 60000;
    const checkout = await call('/api/payoff/config?offer=1', null, quiz);
    assert.equal(checkout.body.offer.expiresAt, time + 5 * 60000, 'the clock starts at checkout');
    // Too slow: no offer at checkout, now or later, and the preview says so.
    time += 60 * 60000;
    const slow = (await call('/api/payoff/quiz', { action: 'start' })).cookie;
    time += 11 * 60000;
    const late = await call('/api/payoff/quiz', { action: 'finish' }, slow);
    assert.deepEqual(late.body.quiz.earned, false);
    const denied = await call('/api/payoff/config?offer=1', null, late.cookie);
    assert.equal(denied.body.offer, undefined); assert.equal(denied.cookie, '');
    assert.equal((await call('/api/payoff/config?offer=preview', null, late.cookie)).body.checkoutOffer.discountCents, 0);
    assert.equal((await call('/api/payoff/checkout', { ...order(), useCheckoutOffer: true, expectedTotalCents: 3300 }, late.cookie)).body.value, 33);
    // A forged quiz cookie counts as no quiz; the letter's visitors get the offer as before.
    assert.ok((await call('/api/payoff/config?offer=1', null, late.cookie.replace(/\.[^.]+$/, '.' + 'A'.repeat(43)))).body.offer);
    assert.ok((await call('/api/payoff/config?offer=1')).body.offer);
  });
});

// Interest Cutter: the offer right after paying, and at the regular price from Payoff.
function cutterWorld({ wallet = null, time = Date.parse('2026-10-21T18:00:00Z') } = {}) {
  let now = time;
  const w = fixture({ clock: () => now });
  const parent = intent([], { customer: 'cus_buyer', payment_method: 'pm_buyer', created: Math.floor(time / 1000) });
  w.intents.set(parent.id, parent);
  w.methods.set('pm_buyer', { id: 'pm_buyer', type: 'card', customer: 'cus_buyer', card: { wallet: wallet ? { type: wallet } : null } });
  return { w, parent, advance: ms => { now += ms; } };
}

test('the Interest Cutter charges the card kept from the order in one click, unlocks its tab, emails a receipt and tells Meta its own event', async () => {
  const { w, parent } = cutterWorld();
  await serve(w, async ({ post }) => {
    const confirmed = await post('/api/payoff/confirm', { paymentIntent: parent.id });
    assert.equal(confirmed.status, 200); assert.equal(confirmed.body.oneClick, true, 'a plain card can be charged again');
    const r = await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'offer' });
    assert.equal(r.status, 200); assert.equal(r.body.paid, true); assert.equal(r.body.value, 107);
    assert.deepEqual(r.body.extras, ['cutter']);
    const { params, options } = w.payments.at(-1);
    assert.equal(params.amount, CUTTER.prices.offer); assert.equal(params.amount, 10700);
    assert.equal(params.customer, 'cus_buyer'); assert.equal(params.payment_method, 'pm_buyer');
    assert.equal(params.confirm, true); assert.deepEqual(params.payment_method_types, ['card']);
    assert.equal(params.off_session, undefined, 'the buyer is right there; never an unattended charge');
    assert.deepEqual({ ...params.metadata }, { product: 'marketel-payoff-cutter', offerVersion: 'payoff-cutter-v1', offer: 'offer', parentOrder: parent.id,
      visitorId: 'v_abcdefghijk', noTrack: '', email: 'buyer@example.test' });
    assert.equal(options.idempotencyKey, `payoff-cutter:${parent.id}:offer:saved`);
    assert.equal(w.intents.get(parent.id).metadata.cutter, r.body.reference, 'the order records its Interest Cutter');
    assert.equal(w.emails.at(-1).subject, 'Your Interest Cutter is ready');
    assert.match(w.emails.at(-1).text, /Interest Cutter: \$107\.00 USD/); assert.match(w.emails.at(-1).text, /30-day money-back guarantee/);
    assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffUpgradePaid').length, 1);
    assert.deepEqual(w.capi.filter(e => e.name === 'InterestCutterPurchase').map(e => [e.value, e.eventId]), [[107, `payoff-cutter.${r.body.reference}`]]);
    assert.equal(w.capi.filter(e => e.name === 'Purchase').length, 1, 'only the first purchase is a Purchase');
    const access = await post('/api/payoff/access', { token: accessToken(SECRET, parent.id) });
    assert.deepEqual(access.body.extras, ['cutter']);
    // One per order.
    assert.equal((await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'discount' })).status, 409);
    // A refund takes it away again.
    w.intents.get(r.body.reference).latest_charge = { refunded: true, amount_refunded: 10700 };
    assert.deepEqual((await post('/api/payoff/access', { token: accessToken(SECRET, parent.id) })).body.extras, []);
  });
});

test('the one-time prices end 30 minutes after the order; the regular price works any time from the access link', async () => {
  const { w, parent, advance } = cutterWorld();
  await serve(w, async ({ post }) => {
    advance(31 * 60000);
    for (const offer of ['offer', 'discount']) assert.equal((await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer })).status, 410, offer);
    assert.equal((await post('/api/payoff/upgrade', { access: accessToken(SECRET, parent.id), offer: 'offer' })).status, 410, 'the link never unlocks a one-time price');
    const regular = await post('/api/payoff/upgrade', { access: accessToken(SECRET, parent.id), offer: 'regular' });
    assert.equal(regular.status, 200); assert.equal(w.payments.at(-1).params.amount, 14700);
    assert.equal(regular.body.next, 'form', 'a later visit never reuses the card kept from the order');
    assert.equal(w.payments.at(-1).params.payment_method, undefined);
    assert.equal((await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'free' })).status, 400);
    assert.equal((await post('/api/payoff/upgrade', { access: 'forged.token', offer: 'regular' })).status, 400);
    assert.equal((await post('/api/payoff/upgrade', { access: accessToken(SECRET, 'own_0123456789abcdef01234567'), offer: 'regular' })).status, 400);
    assert.equal((await post('/api/payoff/upgrade', { paymentIntent: 'pi_3MissingOrder1234', offer: 'regular' })).status, 404);
  });
});

for (const wallet of ['apple_pay', 'google_pay']) test(`a ${wallet} order pays for the Interest Cutter in a payment form, never with the saved wallet`, async () => {
  const { w, parent } = cutterWorld({ wallet });
  await serve(w, async ({ post }) => {
    assert.equal((await post('/api/payoff/confirm', { paymentIntent: parent.id })).body.oneClick, false);
    const r = await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'discount' });
    assert.equal(r.status, 200); assert.equal(r.body.next, 'form'); assert.equal(r.body.amount, 4700); assert.ok(r.body.clientSecret);
    const { params, options } = w.payments.at(-1);
    assert.equal(params.payment_method, undefined); assert.equal(params.confirm, undefined);
    assert.deepEqual(params.automatic_payment_methods, { enabled: true }); assert.equal(params.customer, 'cus_buyer');
    assert.equal(options.idempotencyKey, `payoff-cutter:${parent.id}:discount:form`);
    // Paid in the form: confirming it unlocks the tab.
    const made = w.intents.get(r.body.id);
    Object.assign(made, { status: 'processing' });
    assert.equal((await post('/api/payoff/upgrade/confirm', { paymentIntent: made.id })).status, 202);
    Object.assign(made, { status: 'succeeded', amount_received: 4700, livemode: true, latest_charge: { refunded: false, amount_refunded: 0 } });
    const done = await post('/api/payoff/upgrade/confirm', { paymentIntent: made.id });
    assert.equal(done.status, 200); assert.deepEqual(done.body.extras, ['cutter']);
    assert.equal(w.intents.get(parent.id).metadata.cutter, made.id);
  });
});

test('a declined saved card falls back to the payment form; a hosted-checkout order uses the form; a wrong amount never unlocks', async () => {
  const { w, parent } = cutterWorld();
  await serve(w, async ({ post }) => {
    w.world.decline = true;
    const declined = await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'offer' });
    assert.equal(declined.status, 200); assert.equal(declined.body.next, 'form'); assert.equal(declined.body.declined, 'Your card was declined.');
    w.world.decline = false;
    // A hosted-checkout order has no card kept on the page.
    const session = { ...paid([], { preorder: false }), created: Math.floor(Date.parse('2026-10-21T18:00:00Z') / 1000) };
    w.sessions.set(session.id, session);
    const hosted = await post('/api/payoff/upgrade', { sessionId: session.id, offer: 'offer' });
    assert.equal(hosted.body.next, 'form'); assert.equal(w.payments.at(-1).params.customer, undefined);
    const made = w.intents.get(hosted.body.id);
    Object.assign(made, { status: 'succeeded', amount_received: 999, latest_charge: {} });
    assert.equal((await post('/api/payoff/upgrade/confirm', { paymentIntent: made.id })).status, 402, 'not one of the listed prices');
    Object.assign(made, { amount_received: 10700 });
    assert.equal((await post('/api/payoff/upgrade/confirm', { paymentIntent: made.id })).status, 200);
    assert.equal(w.sessions.get(session.id).metadata.cutter, made.id, 'a hosted order records it on its session');
    assert.equal((await post('/api/payoff/upgrade/confirm', { paymentIntent: parent.id })).status, 404, 'an order is not an upgrade');
  });
});

test('the payment_intent.succeeded webhook finishes an Interest Cutter paid in a form, once', async () => {
  const { w, parent } = cutterWorld({ wallet: 'apple_pay' });
  await serve(w, async ({ post }) => {
    const r = await post('/api/payoff/upgrade', { paymentIntent: parent.id, offer: 'offer' });
    const made = Object.assign(w.intents.get(r.body.id), { status: 'succeeded', amount_received: 10700, livemode: true, latest_charge: { refunded: false } });
    const event = { type: 'payment_intent.succeeded', data: { object: { id: made.id, metadata: made.metadata } } };
    assert.equal(await w.registration.handleStripeEvent(event, {}), true);
    assert.equal(await w.registration.handleStripeEvent(event, {}), true);
    assert.equal(w.emails.filter(m => m.subject === 'Your Interest Cutter is ready').length, 1);
    assert.equal(w.capi.filter(e => e.name === 'InterestCutterPurchase').length, 1);
    assert.equal(w.intents.get(parent.id).metadata.cutter, made.id);
  });
});
