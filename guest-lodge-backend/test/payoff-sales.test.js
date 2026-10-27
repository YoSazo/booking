'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { registerPayoff, basket, paidOrder, paidIntent, verifyAccess, accessToken, PRODUCT, VERSION, PREORDER } = require('../payoff');

function fixture({ failEmail = false, ready = true, production = false, clock = Date.now, failText = false, coach = true } = {}) {
  const rows = new Map(), creates = [], emails = [], sessions = new Map(), capi = [], intents = new Map(), payments = [], methods = new Map(), customers = [], texts = [];
  const subscriptions = new Map(), subscribes = [], prices = new Map(), coachCalls = [], portals = [];
  const world = { decline: false, subscriptionStatus: 'active', coachFail: false, coachTool: false };
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
  }, prices: {
    list: async ({ lookup_keys }) => ({ data: [...prices.values()].filter(price => lookup_keys.includes(price.lookup_key)) }),
    create: async (params, options) => { const price = { id: 'price_' + params.lookup_key, ...params, options }; prices.set(price.id, price); return price; },
  }, products: {
    retrieve: async () => { throw Object.assign(new Error('missing'), { code: 'resource_missing' }); },
    create: async params => ({ id: params.id }),
  }, subscriptions: {
    create: async (params, options) => {
      subscribes.push({ params, options });
      if (world.decline) throw Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError', code: 'card_declined' });
      const made = { object: 'subscription', id: 'sub_test' + String(subscribes.length).padStart(8, '0'), status: world.subscriptionStatus, customer: params.customer, metadata: { ...params.metadata } };
      subscriptions.set(made.id, made); return made;
    },
    retrieve: async id => { if (!subscriptions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return subscriptions.get(id); },
    cancel: async id => { const made = subscriptions.get(id); made.status = 'canceled'; return made; },
  }, billingPortal: { sessions: {
    create: async params => { portals.push(params); return { url: 'https://billing.stripe.com/p/session/test_portal' }; },
  } } };
  // The Coach's model: asks the engine once when coachTool is set, then answers.
  const coachClient = { responses: { create: async params => {
    coachCalls.push(params);
    if (world.coachFail) throw Object.assign(new Error('OpenAI down'), { status: 503 });
    const toolOutput = params.input.find(item => item.type === 'function_call_output');
    if (world.coachTool && !toolOutput) return { output: [{ type: 'function_call', call_id: 'call_1', name: 'run_plan', arguments: JSON.stringify({ strategy: 'current', extra_monthly: 150, one_time: 0 }) }] };
    return { output: [{ type: 'message' }], output_text: toolOutput ? `With $150 extra: ${JSON.parse(toolOutput.output).debt_free}.` : 'Pay the highest rate first.' };
  } } };
  const mail = { sendMail: async message => { if (failEmail) { failEmail = false; throw new Error('SMTP unavailable'); } emails.push(message); } };
  const env = production ? { STRIPE_MARKETEL_SECRET_KEY: 'sk_test_no_live_charges', NODE_ENV: 'production' } : { NODE_ENV: 'test' };
  const app = express();
  const registration = registerPayoff(app, { prisma, stripe: ready ? stripe : null, mail, env,
    queueCapi: async (name, input) => { capi.push({ name, ...input }); return { queued: true }; }, capiConfigured: true,
    text: async body => { if (failText) { failText = false; throw new Error('Twilio unavailable'); } texts.push(body); },
    isExcludedEmail: email => email === 'owner@example.test', now: clock, coachClient: coach ? coachClient : null });
  app.get('/claims', (_req, res) => res.send('Existing Claims page'));
  return { app, registration, rows, creates, emails, sessions, prisma, stripe, mail, capi, intents, payments, methods, customers, world, texts, subscriptions, subscribes, prices, coachCalls, portals };
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
const paid = (addons = [], { preorder = addons.length > 0 } = {}) => ({ id: 'cs_test_validOrder123456', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: (preorder ? 3300 : 3311) + (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0),
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
    for (const font of fs.readdirSync(path.join(__dirname, '../payoff-web/assets')).filter(name => /^font-.*\.woff2$/.test(name))) {
      const fontResponse = await fetch(base + '/payoff/assets/' + font);
      assert.equal(fontResponse.status, 200, font); assert.match(fontResponse.headers.get('content-type'), /font\/woff2/);
      assert.equal(fontResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    }
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
    for (const [addons, total] of [[[], 3311], [['cashflow'], 5511], [['reset'], 4211], [['cashflow', 'reset'], 6411]]) {
      const reply = await post('/api/payoff/checkout', order({ addons }));
      assert.equal(reply.status, 200); assert.equal(reply.body.value, total / 100);
      const { params, options } = w.creates.at(-1);
      assert.equal(params.mode, 'payment'); assert.equal(params.payment_method_types, undefined, 'Stripe Dashboard controls the eligible payment methods');
      assert.equal(params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), total);
      assert.equal(params.line_items[0].price_data.unit_amount, 3311);
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
  assert.equal(paidOrder({ ...paid(['reset'], { preorder: false }), amount_total: 3311 }), null);
  for (const change of [{ payment_status: 'unpaid' }, { status: 'open' }, { amount_total: 1 }, { currency: 'eur' }, { mode: 'subscription' }, { metadata: { product: 'trace' } }]) assert.equal(paidOrder({ ...paid([]), ...change }), null);
});
test('a paid order opens the tool: confirmation returns a signed link and sends one email with it', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    for (let i = 0; i < 3; i++) {
      const r = await post('/api/payoff/confirm', { sessionId: session.id }); assert.equal(r.status, 200); assert.equal(r.body.paid, true); assert.equal(r.body.totalCents, 3311); assert.equal(r.body.email, undefined);
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
      assert.equal(r.status, 200); assert.equal(r.body.totalCents, preorder ? 6400 : 6411); assert.equal(verifyAccess(SECRET, r.body.access), session.id);
      assert.deepEqual(r.body.extras, ['cashflow', 'reset']);
      assert.deepEqual((await post('/api/payoff/access', { token: r.body.access })).body, { ok: true, extras: ['cashflow', 'reset'] });
    });
    assert.equal(w.emails.length, 1); assert.ok(w.emails[0].text.includes(preorder ? '$64.00' : '$64.11'));
    assert.match(w.emails[0].text, /cash-flow calendar and spending reset are inside Payoff/);
    assert.doesNotMatch(w.emails[0].text, /in development/);
  }
});
test('access tells the tool which extras the order has; owners get the Coach and all it includes; Stripe trouble keeps what the tool knew', async () => {
  const w = fixture(); const session = paid(); w.sessions.set(session.id, session);
  await serve(w, async ({ post }) => {
    const { body } = await post('/api/payoff/confirm', { sessionId: session.id });
    assert.deepEqual(body.extras, []);
    assert.deepEqual((await post('/api/payoff/access', { token: body.access })).body, { ok: true, extras: [] });
    assert.deepEqual((await post('/api/payoff/access', { token: accessToken(SECRET, 'own_0123456789abcdef01234567') })).body, { ok: true, extras: ['coach', 'cashflow', 'reset'] });
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
test('each real sale texts the owner once; owner, no-track and sandbox orders never do; a failed text retries without blocking the buyer', async () => {
  const w = fixture({ failText: true }); const s = paid(['cashflow'], { preorder: true }); w.sessions.set(s.id, s);
  const event = { type: 'checkout.session.completed', data: { object: s } };
  await serve(w, async ({ post }) => {
    const first = await post('/api/payoff/confirm', { sessionId: s.id });
    assert.equal(first.status, 200); assert.equal(first.body.paid, true, 'a Twilio outage never stops the buyer getting in');
    assert.deepEqual(w.texts, []);
    assert.equal((await post('/api/payoff/confirm', { sessionId: s.id })).status, 200);
    assert.equal(await w.registration.handleStripeEvent(event, {}), true);
  });
  assert.deepEqual(w.texts, ['Payoff sale: $55.00 (Marketel Payoff + Cash-flow calendar).']);
  for (const kind of ['no-track', 'owner', 'sandbox']) {
    const quiet = fixture(), q = paid([]);
    if (kind === 'no-track') q.metadata.noTrack = '1';
    if (kind === 'owner') q.customer_details.email = 'owner@example.test';
    if (kind === 'sandbox') q.livemode = false;
    quiet.sessions.set(q.id, q);
    await serve(quiet, async ({ post }) => assert.equal((await post('/api/payoff/confirm', { sessionId: q.id })).status, 200));
    assert.deepEqual(quiet.texts, [], kind);
  }
});
test('the owner texter uses OWNER_ALERT_PHONE, else the owner\'s verified Front Desk phone, and stays off without Twilio or a phone', async () => {
  const { ownerTexter, OWNER_HOTEL_ID } = require('../owner-text');
  const sent = [], lookups = [], client = { messages: { create: async options => { sent.push(options); return { sid: 'SM1' }; } } };
  let saved = { phoneE164: '+15557654321' };
  const prisma = { frontDeskAssistantRecipient: { findFirst: async args => { lookups.push(args); return saved; } } };
  const twilioEnv = { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'secret', TWILIO_PHONE_NUMBER: '+15550000000' };
  assert.equal(ownerTexter(twilioEnv, { client }), null, 'no phone source');
  assert.equal(ownerTexter({ ...twilioEnv, OWNER_ALERT_PHONE: '555-123-4567' }, { client }), null, 'not a +1… number');
  assert.equal(ownerTexter({ OWNER_ALERT_PHONE: '+15551234567' }, { client, prisma }), null, 'no Twilio sender');
  await ownerTexter({ ...twilioEnv, OWNER_ALERT_PHONE: '+15551234567' }, { client, prisma })('Payoff sale: $28.11 (Marketel Payoff).');
  assert.equal(lookups.length, 0, 'a set phone needs no lookup');
  const fromFrontDesk = ownerTexter({ ...twilioEnv, TWILIO_MESSAGING_SERVICE_SID: 'MG1' }, { client, prisma });
  await fromFrontDesk('hi');
  assert.equal(lookups[0].where.hotelId, OWNER_HOTEL_ID);
  assert.deepEqual(lookups[0].where.consentAt, { not: null }, 'only a phone that agreed to these texts');
  saved = null;
  await assert.rejects(fromFrontDesk('lost'), /No owner phone/);
  assert.deepEqual(sent, [
    { to: '+15551234567', body: 'Payoff sale: $28.11 (Marketel Payoff).', from: '+15550000000' },
    { to: '+15557654321', body: 'hi', messagingServiceSid: 'MG1' },
  ]);
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

test('Meta hears AddToCart once someone stays on the order page or starts paying, InitiateCheckout at Stripe and Purchase on payment, with the pixel\'s event ids', async () => {
  const w = fixture(); const session = paid(['reset'], { preorder: false }); w.sessions.set(session.id, session);
  const attribution = { fbp: 'fb.1.1700000000000.123456789', fbc: 'fb.1.1700000000000.AbCdEf', sourceUrl: 'https://bookmarketel.com/payoff?utm_source=facebook', utmSource: 'facebook' };
  await serve(w, async ({ post }) => {
    await post('/api/payoff/event', { name: 'PayoffLanded', visitorId: 'v_abcdefghijk', attribution });
    await post('/api/payoff/event', { name: 'PayoffOrderViewed', visitorId: 'v_abcdefghijk', attribution });
    assert.equal(w.capi.length, 0, 'a glance at the order page is not an AddToCart');
    await post('/api/payoff/event', { name: 'PayoffOrder', detail: 'cart', visitorId: 'v_abcdefghijk', attribution });
    await post('/api/payoff/checkout', order({ addons: ['reset'], visitorId: 'v_abcdefghijk', attribution }));
    const { params } = w.creates.at(-1);
    assert.equal(params.metadata.fbp, attribution.fbp); assert.equal(params.metadata.fbc, attribution.fbc);
    session.metadata = { ...session.metadata, fbp: params.metadata.fbp, fbc: params.metadata.fbc, sourceUrl: params.metadata.sourceUrl };
    await post('/api/payoff/confirm', { sessionId: session.id });
  });
  assert.deepEqual(w.capi.map(event => [event.name, event.eventId, event.value]), [
    ['AddToCart', 'payoff-cart.v_abcdefghijk', 33.11],
    ['InitiateCheckout', 'payoff-checkout.v_abcdefghijk', 42.11],
    ['Purchase', 'payoff-purchase.cs_test_validOrder123456', 42.11],
  ]);
  for (const event of w.capi) { assert.equal(event.fbp, attribution.fbp); assert.equal(event.fbc, attribution.fbc); assert.equal(event.product, 'marketel-payoff'); }
  assert.equal(w.capi[2].email, 'buyer@example.test');
});
test('Meta hears nothing from the owner, no-track browsers, test browsers or sandbox orders', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    await post('/api/payoff/event', { name: 'PayoffOrder', detail: 'cart', visitorId: 'v_abcdefghijk' }, { 'x-marketel-no-track': '1' });
    await post('/api/payoff/event', { name: 'PayoffOrder', detail: 'cart', visitorId: 'v_abcdefghijk' }, { 'user-agent': 'HeadlessChrome' });
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
    assert.equal(first.offer.basePriceCents, 2811);
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
    const body = order({ addons: ['cashflow', 'reset'], useCheckoutOffer: true, expectedTotalCents: 5911 });
    assert.equal((await post('/api/payoff/checkout', body, { cookie })).body.value, 59.11);
    assert.deepEqual(w.creates[0].params.line_items.map(item => item.price_data.unit_amount), [3311, 2200, 900]);
    assert.deepEqual(w.creates[0].params.discounts, [{ coupon: 'marketel-payoff-checkout-5-v1' }]);
    await post('/api/payoff/checkout', body, { cookie });
    assert.equal(w.creates[0].options.idempotencyKey, w.creates[1].options.idempotencyKey);
    const purchase = paid(['cashflow', 'reset'], { preorder: false });
    purchase.metadata = { ...w.creates[0].params.metadata }; purchase.amount_total = 5911;
    w.sessions.set(purchase.id, purchase);
    const confirmed = await post('/api/payoff/confirm', { sessionId: purchase.id });
    assert.equal(confirmed.status, 200); assert.equal(confirmed.body.totalCents, 5911);
    assert.deepEqual(confirmed.body.extras, ['cashflow', 'reset']);
    assert.match(w.emails[0].text, /Discount: −\$5\.00/);
    assert.match(w.emails[0].text, /Total paid: \$59\.11/);
    assert.equal(w.capi.find(event => event.name === 'Purchase').value, 59.11);
    // 28 minutes in: the clock has started over five times and the gift remains.
    time += 26 * 60000;
    const looped = await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json();
    assert.equal(looped.offer.discountCents, 500); assert.equal(looped.offer.basePriceCents, 2811);
    assert.equal(looped.offer.expiresAt, first.offer.expiresAt + 25 * 60000);
    // Exactly at a boundary the next five minutes begin.
    time = looped.offer.expiresAt;
    assert.equal((await (await fetch(base + '/api/payoff/config?offer=1', { headers: { cookie } })).json()).offer.expiresAt, time + 5 * 60000);
    assert.equal((await post('/api/payoff/checkout', body, { cookie })).body.value, 59.11);
    time += 3 * 24 * 60 * 60000 + 1234;
    assert.equal((await post('/api/payoff/pay', order({ useCheckoutOffer: true, expectedTotalCents: 2811 }), { cookie })).status, 200, 'days later the $28.11 total is still accepted');
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
    assert.equal((await post('/api/payoff/checkout', order({ useCheckoutOffer: true, expectedTotalCents: 2811 }), { cookie })).status, 409);
    assert.equal(w.creates.length, 0);
  });
  const receipt = paid(); receipt.amount_total = 2811;
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
    const result = await post('/api/payoff/checkout', order({ useCheckoutOffer: true, expectedTotalCents: 2811 }), { cookie });
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
  amount_received: 3311 + (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0), receipt_email: 'Buyer@Example.test',
  metadata: { product: PRODUCT, offerVersion: VERSION, checkout: 'embedded', addons: JSON.stringify(addons), visitorId: 'v_abcdefghijk', email: 'buyer@example.test' }, ...extra });
test('the order page form creates a payment at server prices, keeps retries on one payment, and tells Meta once per visitor', async () => {
  const w = fixture();
  await serve(w, async ({ post }) => {
    const r = await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset', 'cashflow'], visitorId: 'v_abcdefghijk', expectedTotalCents: 6411 }));
    assert.equal(r.status, 200); assert.equal(r.body.value, 64.11); assert.equal(r.body.clientSecret, 'pi_test_created_secret_x');
    const { params, options } = w.payments[0];
    assert.equal(params.amount, 6411); assert.equal(params.currency, 'usd'); assert.deepEqual(params.automatic_payment_methods, { enabled: true });
    assert.equal(params.receipt_email, 'Buyer@Example.test');
    // A customer for the order, and the card kept for this visit only (the Interest Cutter's one click).
    assert.equal(params.customer, 'cus_test1'); assert.equal(w.customers[0].params.email, 'Buyer@Example.test');
    assert.deepEqual(params.payment_method_options, { card: { setup_future_usage: 'on_session' } });
    assert.equal(params.setup_future_usage, undefined, 'never for every method: Klarna and bank stay available');
    assert.equal(params.metadata.checkout, 'embedded'); assert.equal(params.metadata.email, 'buyer@example.test');
    assert.equal(params.metadata.addons, '["cashflow","reset"]'); assert.equal(params.metadata.product, PRODUCT);
    assert.ok(!('amount' in order()) || params.amount !== 1);
    await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset', 'cashflow'], visitorId: 'v_abcdefghijk', expectedTotalCents: 6411 }));
    assert.equal(w.payments[1].options.idempotencyKey, options.idempotencyKey);
    const changed = await post('/api/payoff/pay', order({ email: 'Buyer@Example.test', addons: ['reset'], visitorId: 'v_abcdefghijk', expectedTotalCents: 4211 }));
    assert.equal(changed.status, 200); assert.notEqual(w.payments[2].options.idempotencyKey, options.idempotencyKey);
    assert.equal((await post('/api/payoff/pay', order({ addons: ['reset'], expectedTotalCents: 3311 }))).status, 409);
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
    assert.equal(r.status, 200); assert.deepEqual(r.body.extras, ['cashflow']); assert.equal(r.body.totalCents, 5511); assert.equal(r.body.emailSent, true);
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
  assert.deepEqual(paidIntent({ ...intent(), metadata: { ...intent().metadata, checkoutDiscountCents: '500', checkoutDiscountVersion: 'payoff-checkout-5-v1' }, amount_received: 2811 }), ['base']);
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
test('the letter and order pages record their steps by name only, and a valid email on the order page is Meta\'s StartedPaying', async () => {
  const w = fixture();
  const attribution = { fbp: 'fb.1.1700000000000.123456789', fbc: 'fb.1.1700000000000.AbCdEf' };
  await serve(w, async ({ post }) => {
    for (const [name, detail] of [['PayoffLetter', 'example'], ['PayoffLetter', 'end'], ['PayoffLetter', 'tap-faq'], ['PayoffLetter', 'math-open'], ['PayoffLetter', 'time60'],
      ['PayoffOrder', 'saw-form'], ['PayoffOrder', 'form20'], ['PayoffOrder', 'card-start'], ['PayoffOrder', 'declined'], ['PayoffStory', 'time10']]) {
      assert.equal((await post('/api/payoff/event', { name, detail, visitorId: 'v_abcdefghijk' })).status, 200, `${name}:${detail}`);
    }
    for (const [name, detail] of [['PayoffLetter', 'tap-sticky'], ['PayoffLetter', 'time30'], ['PayoffOrder', 'buyer@example.test'], ['PayoffOrder', null], ['PayoffOrder', 'scroll50']]) {
      assert.equal((await post('/api/payoff/event', { name, detail, visitorId: 'v_abcdefghijk' })).status, 400, `${name}:${detail}`);
    }
    assert.equal(w.capi.length, 0, 'only the email and add-to-cart steps go to Meta');
    assert.equal((await post('/api/payoff/event', { name: 'PayoffOrder', detail: 'email', visitorId: 'v_abcdefghijk', attribution })).status, 200);
  });
  assert.deepEqual(w.capi.map(event => [event.name, event.eventId, event.value, event.fbp, event.fbc]),
    [['StartedPaying', 'payoff-started.v_abcdefghijk', 33.11, attribution.fbp, attribution.fbc]]);
  assert.equal(w.capi[0].email, undefined, 'never the email itself');
  assert.equal([...w.rows.values()].length, 11);
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
    assert.equal((await call('/api/payoff/checkout', { ...order(), useCheckoutOffer: true, expectedTotalCents: 3311 }, late.cookie)).body.value, 33.11);
    // A forged quiz cookie counts as no quiz; the letter's visitors get the offer as before.
    assert.ok((await call('/api/payoff/config?offer=1', null, late.cookie.replace(/\.[^.]+$/, '.' + 'A'.repeat(43)))).body.offer);
    assert.ok((await call('/api/payoff/config?offer=1')).body.offer);
  });
});

// The Coach: the one upsell, a subscription, offered right after paying and from inside Payoff.
function coachWorld({ wallet = null, time = Date.parse('2026-10-27T18:00:00Z'), coach = true } = {}) {
  let now = time;
  const w = fixture({ clock: () => now, coach });
  const parent = intent([], { customer: 'cus_buyer', payment_method: 'pm_buyer', created: Math.floor(time / 1000) });
  w.intents.set(parent.id, parent);
  w.methods.set('pm_buyer', { id: 'pm_buyer', type: 'card', customer: 'cus_buyer', card: { wallet: wallet ? { type: wallet } : null } });
  return { w, parent, advance: ms => { now += ms; } };
}
const coachMetadata = (parent, plan) => ({ product: 'marketel-payoff-coach', offerVersion: 'payoff-coach-v1', plan, parentOrder: parent.id,
  visitorId: 'v_abcdefghijk', noTrack: '', email: 'buyer@example.test' });

test('the Coach starts in one tap on the card kept from the order, is recorded on the order, opens everything it includes, and emails, texts and tells Meta once', async () => {
  const { w, parent } = coachWorld();
  await serve(w, async ({ post }) => {
    const confirmed = await post('/api/payoff/confirm', { paymentIntent: parent.id });
    assert.equal(confirmed.body.oneClick, true, 'a plain card can start it in one tap');
    const r = await post('/api/payoff/coach/subscribe', { paymentIntent: parent.id, plan: 'month' });
    assert.equal(r.status, 200); assert.equal(r.body.paid, true); assert.equal(r.body.plan, 'month'); assert.equal(r.body.value, 9);
    assert.deepEqual(r.body.extras, ['coach', 'cashflow', 'reset']);
    const { params, options } = w.subscribes.at(-1);
    assert.deepEqual({ customer: params.customer, default_payment_method: params.default_payment_method, items: params.items, payment_behavior: params.payment_behavior },
      { customer: 'cus_buyer', default_payment_method: 'pm_buyer', items: [{ price: 'price_payoff-coach-month-v1' }], payment_behavior: 'allow_incomplete' });
    assert.equal(params.off_session, undefined, 'the buyer is right there; never an unattended first charge');
    assert.deepEqual(params.metadata, coachMetadata(parent, 'month'));
    assert.equal(options.idempotencyKey, `payoff-coach:${parent.id}:month:saved`);
    // Both prices exist once, at their amounts.
    assert.deepEqual([...w.prices.values()].map(p => [p.lookup_key, p.unit_amount, p.recurring.interval, p.currency]),
      [['payoff-coach-month-v1', 900, 'month', 'usd'], ['payoff-coach-year-v1', 6700, 'year', 'usd']]);
    assert.equal(w.intents.get(parent.id).metadata.coach, r.body.reference, 'the order records its Coach');
    const mail = w.emails.at(-1);
    assert.equal(mail.subject, 'Your Payoff Coach is on');
    assert.match(mail.text, /Payoff Coach: \$9 a month until you cancel\. It renews automatically each month\./);
    assert.match(mail.text, /Cancel any time: in Payoff, open the Coach tab and tap “Manage or cancel”/);
    assert.equal([...w.rows.values()].filter(row => row.name === 'PayoffCoachPaid').length, 1);
    assert.deepEqual(w.capi.filter(e => e.name === 'CoachSubscribe').map(e => [e.value, e.eventId]), [[9, `payoff-coach.${r.body.reference}`]]);
    assert.equal(w.capi.filter(e => e.name === 'Purchase').length, 1, 'only the first purchase is a Purchase');
    assert.deepEqual(w.texts.slice(-1), ['Payoff Coach started: $9 a month.']);
    assert.deepEqual((await post('/api/payoff/access', { token: accessToken(SECRET, parent.id) })).body.extras, ['coach', 'cashflow', 'reset']);
    // One per order, and a cancelled Coach closes again.
    assert.equal((await post('/api/payoff/coach/subscribe', { paymentIntent: parent.id, plan: 'year' })).status, 409);
    w.subscriptions.get(r.body.reference).status = 'canceled';
    assert.deepEqual((await post('/api/payoff/access', { token: accessToken(SECRET, parent.id) })).body.extras, []);
  });
});

test('after 30 minutes, from the access link, with a wallet, or when the card needs another step, the Coach opens Stripe’s checkout instead', async () => {
  const fresh = coachWorld();
  await serve(fresh.w, async ({ post }) => {
    const link = await post('/api/payoff/coach/subscribe', { access: accessToken(SECRET, fresh.parent.id), plan: 'year' });
    assert.equal(link.body.next, 'checkout', 'a later visit never reuses the card kept from the order');
    assert.equal(fresh.w.subscribes.length, 0);
    const { params } = fresh.w.creates.at(-1);
    assert.equal(params.mode, 'subscription'); assert.deepEqual(params.line_items, [{ price: 'price_payoff-coach-year-v1', quantity: 1 }]);
    assert.equal(params.customer, 'cus_buyer');
    assert.deepEqual(params.metadata, coachMetadata(fresh.parent, 'year')); assert.deepEqual(params.subscription_data.metadata, coachMetadata(fresh.parent, 'year'));
    assert.equal(params.success_url, 'https://bookmarketel.com/payoff/app?coach=done&coach_session={CHECKOUT_SESSION_ID}');
    assert.match(params.custom_text.submit.message, /\$67 a year until you cancel/);
    fresh.advance(31 * 60000);
    assert.equal((await post('/api/payoff/coach/subscribe', { paymentIntent: fresh.parent.id, plan: 'month' })).body.next, 'checkout');
    assert.equal(fresh.w.subscribes.length, 0, 'the one tap ends 30 minutes after the order');
    for (const [body, status] of [[{ paymentIntent: fresh.parent.id, plan: 'week' }, 400], [{ access: 'forged.token', plan: 'month' }, 400],
      [{ access: accessToken(SECRET, 'own_0123456789abcdef01234567'), plan: 'month' }, 400], [{ paymentIntent: 'pi_3MissingOrder1234', plan: 'month' }, 404]]) {
      assert.equal((await post('/api/payoff/coach/subscribe', body)).status, status, JSON.stringify(body));
    }
  });
  for (const wallet of ['apple_pay', 'google_pay']) {
    const { w, parent } = coachWorld({ wallet });
    await serve(w, async ({ post }) => {
      assert.equal((await post('/api/payoff/confirm', { paymentIntent: parent.id })).body.oneClick, false);
      assert.equal((await post('/api/payoff/coach/subscribe', { paymentIntent: parent.id, plan: 'month' })).body.next, 'checkout', wallet);
      assert.equal(w.subscribes.length, 0, wallet);
    });
  }
  const declined = coachWorld();
  await serve(declined.w, async ({ post }) => {
    declined.w.world.decline = true;
    const r = await post('/api/payoff/coach/subscribe', { paymentIntent: declined.parent.id, plan: 'month' });
    assert.equal(r.body.next, 'checkout'); assert.match(r.body.declined, /Finish on the secure checkout/);
    declined.w.world.decline = false; declined.w.world.subscriptionStatus = 'incomplete';
    const action = await post('/api/payoff/coach/subscribe', { paymentIntent: declined.parent.id, plan: 'year' });
    assert.equal(action.body.next, 'checkout');
    assert.equal([...declined.w.subscriptions.values()].at(-1).status, 'canceled', 'an unfinished one is never left running');
  });
});

test('back from Stripe’s checkout the Coach starts once; an unfinished or foreign checkout never opens it; the webhook starts it if the browser didn’t, and counts renewals', async () => {
  const { w, parent } = coachWorld();
  await serve(w, async ({ post }) => {
    w.subscriptions.set('sub_testHosted0001', { object: 'subscription', id: 'sub_testHosted0001', status: 'active', customer: 'cus_buyer', metadata: coachMetadata(parent, 'year') });
    const done = { id: 'cs_test_coachDone12345', mode: 'subscription', status: 'complete', subscription: 'sub_testHosted0001', metadata: coachMetadata(parent, 'year') };
    w.sessions.set(done.id, done);
    const r = await post('/api/payoff/coach/confirm', { sessionId: done.id });
    assert.equal(r.status, 200); assert.equal(r.body.value, 67); assert.deepEqual(r.body.extras, ['coach', 'cashflow', 'reset']);
    assert.equal(w.intents.get(parent.id).metadata.coach, 'sub_testHosted0001');
    await post('/api/payoff/coach/confirm', { sessionId: done.id });
    assert.equal(w.emails.filter(m => m.subject === 'Your Payoff Coach is on').length, 1, 'once, however often it is confirmed');
    assert.equal(w.capi.filter(e => e.name === 'CoachSubscribe').length, 1);
    w.sessions.set('cs_test_coachOpen123456', { ...done, id: 'cs_test_coachOpen123456', status: 'open', subscription: null });
    assert.equal((await post('/api/payoff/coach/confirm', { sessionId: 'cs_test_coachOpen123456' })).status, 402);
    w.sessions.set('cs_test_otherProduct1234', { ...done, id: 'cs_test_otherProduct1234', metadata: { product: 'marketel-inspect' } });
    assert.equal((await post('/api/payoff/coach/confirm', { sessionId: 'cs_test_otherProduct1234' })).status, 404);
  });
  // The webhook: the first invoice starts it, later ones are renewals, other products' invoices are not ours.
  const hook = coachWorld();
  hook.w.subscriptions.set('sub_testWebhook0001', { object: 'subscription', id: 'sub_testWebhook0001', status: 'active', customer: 'cus_buyer', metadata: coachMetadata(hook.parent, 'month') });
  const invoice = (id, reason, metadata = coachMetadata(hook.parent, 'month')) => ({ type: 'invoice.paid', data: { object: { id, billing_reason: reason, amount_paid: 900,
    parent: { subscription_details: { subscription: 'sub_testWebhook0001', metadata } } } } });
  assert.equal(await hook.w.registration.handleStripeEvent(invoice('in_first', 'subscription_create'), {}), true);
  assert.equal(await hook.w.registration.handleStripeEvent(invoice('in_first', 'subscription_create'), {}), true);
  assert.equal(hook.w.intents.get(hook.parent.id).metadata.coach, 'sub_testWebhook0001');
  assert.equal(hook.w.emails.filter(m => m.subject === 'Your Payoff Coach is on').length, 1);
  assert.equal(await hook.w.registration.handleStripeEvent(invoice('in_second', 'subscription_cycle'), {}), true);
  assert.equal(await hook.w.registration.handleStripeEvent(invoice('in_second', 'subscription_cycle'), {}), true);
  assert.equal([...hook.w.rows.values()].filter(row => row.name === 'PayoffCoachRenewed').length, 1);
  assert.deepEqual(hook.w.texts.filter(t => t.startsWith('Payoff Coach renewed')), ['Payoff Coach renewed: $9.00.']);
  let looked = 0; const retrieve = hook.w.stripe.subscriptions.retrieve;
  hook.w.stripe.subscriptions.retrieve = async id => { looked += 1; return retrieve(id); };
  assert.equal(await hook.w.registration.handleStripeEvent(invoice('in_inspect', 'subscription_cycle', { product: 'marketel-inspect' }), {}), false);
  assert.equal(looked, 0, 'another product’s invoice is left to its own handler without a Stripe call');
});

test('Coach questions: three free on each order, then only with the Coach; numbers come from the engine; nothing is stored; a failed answer gives the question back', async () => {
  const { w, parent } = coachWorld();
  const access = accessToken(SECRET, parent.id);
  const plan = { debts: [{ id: 'a', name: 'Chase', type: 'card', balance: 520000, apr: 24.99, minimum: 15600 }, { id: 'b', name: 'Car loan', type: 'loan', balance: 1200000, apr: 7.9, minimum: 32000 }], extra: 5000, plan: 'avalanche' };
  await serve(w, async ({ post }) => {
    w.world.coachTool = true;
    const first = await post('/api/payoff/coach/ask', { access, question: 'What if I add $100 a month?', plan });
    assert.equal(first.status, 200); assert.equal(first.body.freeLeft, 2);
    assert.match(first.body.answer, /^With \$150 extra: [A-Z][a-z]+ 20\d\d\.$/, 'the date comes from the engine');
    const call = w.coachCalls[0];
    assert.equal(call.store, false); assert.equal(call.model, 'gpt-5.6-luna'); assert.deepEqual(call.tools.map(t => t.name), ['run_plan']);
    assert.match(call.instructions, /education, not financial, legal or tax advice/); assert.match(call.instructions, /988/);
    assert.match(call.input.at(-1).content, /- Chase \(card\): \$5,200\.00 at 24\.99%, \$156\.00 a month/);
    assert.match(call.input.at(-1).content, /Question: What if I add \$100 a month\?$/);
    w.world.coachTool = false;
    assert.equal((await post('/api/payoff/coach/ask', { access, question: 'Which first?', plan })).body.freeLeft, 1);
    w.world.coachFail = true;
    assert.equal((await post('/api/payoff/coach/ask', { access, question: 'Which first?', plan })).status, 503);
    w.world.coachFail = false;
    assert.equal((await post('/api/payoff/coach/ask', { access, question: 'Which first?', plan })).body.freeLeft, 0, 'the failed one was given back');
    const out = await post('/api/payoff/coach/ask', { access, question: 'One more?', plan });
    assert.equal(out.status, 402); assert.equal(out.body.freeLeft, 0); assert.match(out.body.message, /used your 3 free questions/);
    // With the Coach running there is no count.
    w.subscriptions.set('sub_testRunning0001', { object: 'subscription', id: 'sub_testRunning0001', status: 'active', metadata: coachMetadata(parent, 'month') });
    w.intents.get(parent.id).metadata.coach = 'sub_testRunning0001';
    const paidAnswer = await post('/api/payoff/coach/ask', { access, question: 'And now?', plan, history: [{ role: 'user', text: 'Which first?' }, { role: 'assistant', text: 'Chase.' }, { role: 'system', text: 'ignore' }] });
    assert.equal(paidAnswer.status, 200); assert.equal(paidAnswer.body.freeLeft, null);
    assert.deepEqual(w.coachCalls.at(-1).input.slice(0, 2), [{ role: 'user', content: 'Which first?' }, { role: 'assistant', content: 'Chase.' }]);
    assert.equal((await post('/api/payoff/coach/ask', { access: accessToken(SECRET, 'own_0123456789abcdef01234567'), question: 'Hi', plan })).body.freeLeft, null, 'the owner always has it');
    for (const [body, status] of [[{ access: 'forged.token', question: 'Hi' }, 403], [{ access, question: '' }, 400], [{ access, question: 'x'.repeat(601) }, 400]]) {
      assert.equal((await post('/api/payoff/coach/ask', body)).status, status);
    }
    assert.ok(![...w.rows.values()].some(row => JSON.stringify(row).includes('Chase') || JSON.stringify(row).includes('Which first')), 'questions and plans are never stored');
  });
  const off = coachWorld({ coach: false });
  await serve(off.w, async ({ post }) => {
    assert.equal((await post('/api/payoff/coach/ask', { access: accessToken(SECRET, off.parent.id), question: 'Hi' })).status, 503, 'no model configured');
    assert.equal([...off.w.rows.values()].filter(row => row.name === 'PayoffCoachFree').length, 0);
  });
});

test('“Manage or cancel” opens Stripe’s page for the Coach’s customer; without a running Coach it says so', async () => {
  const { w, parent } = coachWorld();
  await serve(w, async ({ post }) => {
    const access = accessToken(SECRET, parent.id);
    assert.equal((await post('/api/payoff/coach/manage', { access })).status, 404);
    await post('/api/payoff/coach/subscribe', { paymentIntent: parent.id, plan: 'month' });
    const r = await post('/api/payoff/coach/manage', { access });
    assert.equal(r.status, 200); assert.equal(r.body.url, 'https://billing.stripe.com/p/session/test_portal');
    assert.deepEqual(w.portals.at(-1), { customer: 'cus_buyer', return_url: 'https://bookmarketel.com/payoff/app' });
    assert.equal((await post('/api/payoff/coach/manage', { access: accessToken(SECRET, 'own_0123456789abcdef01234567') })).status, 403);
  });
});

test('the .11 price verifies new receipts exactly and preserves v1 payments and preorders at their original amounts', async () => {
  for (const addons of [[], ['cashflow'], ['reset'], ['cashflow', 'reset']]) {
    const extras = (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0);
    for (const discounted of [false, true]) {
      const gift = discounted ? { checkoutDiscountVersion: 'payoff-checkout-5-v1', checkoutDiscountCents: '500' } : {};
      const current = paid(addons, { preorder: false });
      current.metadata = { ...current.metadata, ...gift };
      current.amount_total = 3311 + extras - (discounted ? 500 : 0);
      assert.deepEqual(paidOrder(current), ['base', ...addons]);
      assert.equal(paidOrder({ ...current, amount_total: current.amount_total - 11 }), null);
      const legacy = { ...current, metadata: { ...current.metadata, offerVersion: 'payoff-v1' }, amount_total: 3300 + extras - (discounted ? 500 : 0) };
      assert.deepEqual(paidOrder(legacy), ['base', ...addons]);
      const oldIntent = intent(addons, { metadata: { ...legacy.metadata, checkout: 'embedded' }, amount_received: legacy.amount_total });
      assert.deepEqual(paidIntent(oldIntent), ['base', ...addons]);
      const newIntent = intent(addons, { metadata: { ...current.metadata, checkout: 'embedded' }, amount_received: current.amount_total });
      assert.deepEqual(paidIntent(newIntent), ['base', ...addons]);
      assert.equal(paidIntent({ ...newIntent, amount_received: legacy.amount_total }), null);
      if (!discounted) assert.deepEqual(paidOrder(paid(addons, { preorder: true })), ['base', ...addons]);
    }
  }
  const w = fixture();
  const legacy = paid([], { preorder: false });
  legacy.metadata.offerVersion = 'payoff-v1';
  legacy.amount_total = 2800;
  Object.assign(legacy.metadata, { checkoutDiscountVersion: 'payoff-checkout-5-v1', checkoutDiscountCents: '500' });
  w.sessions.set(legacy.id, legacy);
  await serve(w, async ({ post }) => {
    const result = await post('/api/payoff/confirm', { sessionId: legacy.id });
    assert.equal(result.status, 200);
    assert.equal(result.body.totalCents, 2800);
    assert.ok(w.emails[0].text.includes('Marketel Payoff: $33.00'));
    assert.ok(w.emails[0].text.includes('Total paid: $28.00 USD'));
    assert.ok(!w.emails[0].text.includes('$33.11'));
    assert.equal((await post('/api/payoff/access', { token: result.body.access })).body.ok, true);
  });
});
