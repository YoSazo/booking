'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { TRACE, TRACE_EVENTS, registerTrace, unlockToken, unlockCode, verifyUnlock, isTracePurchase } = require('../trace');

const SECRET = 'trace-test-secret';
const PAID = 'cs_test_paidSession1234';

function fakeWorld({ failMailOnce = false, rejectSuffix = false, env = {}, withWebhook = false, openai = null } = {}) {
  const rows = [];
  const unique = sourceId => rows.find(row => row.sourceId && row.sourceId === sourceId);
  const prisma = { inspectEvent: {
    create: async ({ data }) => {
      if (data.sourceId && unique(data.sourceId)) throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      rows.push({ ...data }); return data;
    },
    upsert: async ({ where, create }) => unique(where.sourceId) || (rows.push({ ...create }), create),
    delete: async ({ where }) => { const i = rows.findIndex(row => row.sourceId === where.sourceId); if (i >= 0) rows.splice(i, 1); },
    count: async ({ where }) => rows.filter(row => Object.entries(where).every(([key, value]) => key === 'createdAt'
      ? (row.createdAt || new Date()) >= value.gte : row[key] === value)).length,
  } };
  const sessions = new Map([
    [PAID, { id: PAID, mode: 'payment', payment_status: 'paid', status: 'complete', amount_total: 1499,
      customer_details: { email: 'Buyer@Example.test' }, metadata: { product: 'trace', visitorId: 'v_abcdefghijk', fbp: 'fb.1.1.2', fbc: 'fb.1.1.click', sourceUrl: 'https://bookmarketel.com/trace?fbclid=click' } }],
    ['cs_test_unpaidSession12', { id: 'cs_test_unpaidSession12', mode: 'payment', payment_status: 'unpaid', status: 'open', metadata: { product: 'trace' } }],
    ['cs_test_claimsSession12', { id: 'cs_test_claimsSession12', mode: 'payment', payment_status: 'paid', status: 'complete', metadata: { product: 'marketel-inspect' } }],
    ['cs_test_ownerSession123', { id: 'cs_test_ownerSession123', mode: 'payment', payment_status: 'paid', status: 'complete', amount_total: 1499,
      customer_details: { email: 'owner@example.test' }, metadata: { product: 'trace', visitorId: 'v_ownerownerown', owner: '1' } }],
  ]);
  const calls = { creates: [], capi: [], mail: [], lists: [] };
  let mailFailures = failMailOnce ? 1 : 0;
  const stripe = { checkout: { sessions: {
    create: async params => {
      calls.creates.push(params);
      if (rejectSuffix && params.payment_intent_data?.statement_descriptor_suffix) throw Object.assign(new Error('Invalid statement_descriptor_suffix'), { param: 'payment_intent_data[statement_descriptor_suffix]' });
      return { id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new' };
    },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('No such session'), { statusCode: 404, code: 'resource_missing' }); return structuredClone(sessions.get(id)); },
    list: async params => { calls.lists.push(params); return { data: [...sessions.values()].filter(s => s.customer_details?.email?.toLowerCase() === params.customer_details.email) }; },
  } } };
  stripe.webhooks = require('stripe')('sk_test_trace_tests').webhooks;
  const mail = { sendMail: async message => { if (mailFailures > 0) { mailFailures -= 1; throw new Error('smtp down'); } calls.mail.push(message); } };
  const queueCapi = async (event, input) => { calls.capi.push({ event, ...input }); return { queued: true }; };
  const app = express();
  app.set('trust proxy', true);
  app.use('/api/inspect-stripe-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  const registration = registerTrace(app, { prisma, stripe, mail, queueCapi, openai, capiConfigured: true, isCapiExcludedEmail: email => email === 'owner@example.test',
    env: { TRACE_UNLOCK_SECRET: SECRET, TRACE_PUBLIC_ORIGIN: 'https://bookmarketel.com', ...env } });
  const inspectRegistration = withWebhook ? require('../inspect').registerInspect(app, {
    prisma, stripe, mail, handleTraceStripeEvent: registration.handleStripeEvent,
    env: { INSPECT_ENABLED: 'false', INSPECT_AUTH_SECRET: SECRET, STRIPE_INSPECT_WEBHOOK_SECRET: 'whsec_trace_tests' },
  }) : null;
  return { app, rows, calls, registration, inspectRegistration, stripe };
}

async function serve(app, fn) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (iPhone)', ...headers }, body: JSON.stringify(body) })
    .then(async res => ({ status: res.status, body: await res.json() }));
  try { await fn({ base, post }); } finally { server.close(); }
}

test('unlock tokens are signed for one session and cannot be forged or altered', () => {
  const token = unlockToken(SECRET, PAID);
  assert.equal(verifyUnlock(SECRET, token), PAID);
  assert.equal(verifyUnlock('another-secret', token), null);
  assert.equal(verifyUnlock(SECRET, token.replace(/.$/, c => (c === 'a' ? 'b' : 'a'))), null);
  assert.equal(verifyUnlock(SECRET, `cs_test_otherSession123.${token.split('.')[1]}`), null);
  assert.equal(verifyUnlock(SECRET, `${token}.extra`), null);
  assert.equal(verifyUnlock(SECRET, ''), null);
  assert.equal(verifyUnlock(SECRET, 'not-a-session.abc'), null);
});

test('only a paid Marketel Trace session counts as a purchase', () => {
  assert.ok(isTracePurchase({ mode: 'payment', payment_status: 'paid', metadata: { product: 'trace' } }));
  assert.ok(!isTracePurchase({ mode: 'payment', payment_status: 'unpaid', metadata: { product: 'trace' } }));
  assert.ok(!isTracePurchase({ mode: 'payment', payment_status: 'paid', metadata: { product: 'marketel-inspect' } }));
  assert.ok(!isTracePurchase({ mode: 'subscription', payment_status: 'paid', metadata: { product: 'trace' } }));
  assert.ok(!isTracePurchase(null));
});

test('the page is served with the camera allowed and nothing else', async () => {
  const { app } = fakeWorld();
  await serve(app, async ({ base }) => {
    for (const path of ['/trace', '/trace/']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200);
      assert.match(await res.text(), /Tracing app users:[\s\S]*Stop paying weekly\./);
      assert.match(res.headers.get('permissions-policy'), /camera=\(self\)/);
      assert.match(res.headers.get('permissions-policy'), /microphone=\(\)/);
      assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.match(res.headers.get('content-security-policy'), /script-src [^;]*https:\/\/connect\.facebook\.net/);
      assert.match(res.headers.get('content-security-policy'), /connect-src [^;]*https:\/\/www\.facebook\.com/);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    }
    const terms = await fetch(`${base}/trace/terms`);
    assert.match(await terms.text(), /never uploaded/);
    const script = await fetch(`${base}/trace/trace.js`);
    assert.equal(script.status, 200);
    for (const picture of ['girl', 'ninja', 'bald', 'profile', 'doll', 'creature']) {
      assert.equal((await fetch(`${base}/trace/pictures/${picture}.webp`)).status, 200, picture);
      assert.equal((await fetch(`${base}/trace/pictures/${picture}-t.webp`)).status, 200, `${picture} thumbnail`);
    }
  });
});

test('TRACE_ENABLED=false takes the page and the API down', async () => {
  const app = express();
  registerTrace(app, { prisma: {}, stripe: null, mail: null, env: { TRACE_ENABLED: 'false', TRACE_UNLOCK_SECRET: SECRET } });
  await serve(app, async ({ base, post }) => {
    assert.equal((await fetch(`${base}/trace`)).status, 404);
    assert.equal((await fetch(`${base}/trace/trace.js`)).status, 404);
    assert.equal((await fetch(`${base}/api/trace/event`, { method: 'POST' })).status, 404);
  });
});

test('steps are recorded anonymously under the trace tool; the owner and robots are left out', async () => {
  const { app, rows, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/event', { name: 'Nope', visitorId: 'v_abcdefghijk' })).status, 400);
    assert.equal((await post('/api/trace/event', { name: 'TracePicked', visitorId: 'v_abcdefghijk', detail: 'starter' })).status, 200);
    assert.deepEqual(rows.at(-1), { name: 'TracePicked', tool: 'trace', visitorId: 'v_abcdefghijk', detail: 'starter' });
    await post('/api/trace/event', { name: 'TracePicked', visitorId: 'not-a-visitor', detail: 'My Photo.jpg' });
    assert.deepEqual(rows.at(-1), { name: 'TracePicked', tool: 'trace', visitorId: null, detail: null }, 'free text never reaches the table');
    const before = rows.length;
    assert.deepEqual((await post('/api/trace/event', { name: 'TraceLanded', visitorId: 'v_abcdefghijk' }, { 'x-marketel-no-track': '1' })).body, { success: true, ignored: true });
    assert.deepEqual((await post('/api/trace/event', { name: 'TraceLanded', visitorId: 'v_abcdefghijk' }, { 'user-agent': 'Mozilla/5.0 HeadlessChrome/120' })).body, { success: true, ignored: true });
    assert.equal(rows.length, before);
    await post('/api/trace/event', { name: 'TraceFaded', visitorId: 'v_abcdefghijk' });
    assert.deepEqual(calls.capi.map(c => c.event), ['ViewContent'], 'only the pick went to Meta; ordinary steps and the visitor-less pick do not');
  });
});

test('picking, tracing and opening checkout are the Meta signals, once per visitor by event id', async () => {
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    const attribution = { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.click', sourceUrl: 'https://bookmarketel.com/trace?fbclid=click' };
    await post('/api/trace/event', { name: 'TracePicked', visitorId: 'v_abcdefghijk', detail: 'starter', attribution });
    await post('/api/trace/event', { name: 'TraceStarted', visitorId: 'v_abcdefghijk', detail: 'starter', attribution });
    await post('/api/trace/event', { name: 'TraceCheckoutOpened', visitorId: 'v_abcdefghijk', attribution });
    await post('/api/trace/event', { name: 'TraceStarted', visitorId: 'v_abcdefghijk', detail: 'photo', attribution }, { 'x-marketel-no-track': '1' });
    await post('/api/trace/event', { name: 'TraceLanded', visitorId: 'v_abcdefghijk', attribution });
    assert.deepEqual(calls.capi.map(c => [c.event, c.eventId, c.value]), [
      ['ViewContent', 'trace-picked.v_abcdefghijk', undefined],
      ['AddToCart', 'trace-started.v_abcdefghijk', 14.99],
      ['InitiateCheckout', 'trace-checkout.v_abcdefghijk', 14.99],
    ], 'landing alone is never sent');
    assert.equal(calls.capi[0].fbc, 'fb.1.1700000000.click');
    assert.equal(calls.capi[0].product, 'trace-anything');
  });
});

test("a long Meta click id reaches Meta whole, on the signal and in the checkout's metadata", async () => {
  const { app, calls } = fakeWorld();
  const longClick = 'IwZXh0bgNhZW0BMABhZGlkAasd' + 'Qw3rTy_aem_'.repeat(22);
  const fbc = `fb.1.1760000000000.${longClick}`;
  assert.ok(fbc.length > 250);
  await serve(app, async ({ post }) => {
    await post('/api/trace/event', { name: 'TracePicked', visitorId: 'v_longclick01', detail: 'starter', attribution: { fbp: 'fb.1.1.2', fbc } });
    assert.equal(calls.capi[0].fbc, fbc);
    await post('/api/trace/checkout', { visitorId: 'v_longclick01', attribution: { fbp: 'fb.1.1.2', fbc } });
    assert.equal(calls.creates[0].metadata.fbc, fbc);
  });
  const { buildMarketelCapiEvent } = require('../marketel-meta-capi');
  assert.equal(buildMarketelCapiEvent('ViewContent', { eventId: 'x', fbc, fbp: 'fb.1.1.2' }).user_data.fbc, fbc);
});

test('checkout sells one $14.99 unlock and returns to the page with the session id', async () => {
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    const res = await post('/api/trace/checkout', { visitorId: 'v_abcdefghijk', attribution: { fbp: 'fb.1.1.2' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.url, 'https://checkout.stripe.com/c/pay/cs_test_new');
    const params = calls.creates[0];
    assert.equal(params.mode, 'payment');
    assert.deepEqual(params.payment_method_types, ['card'], 'no bank payments that would leave the buyer locked for days');
    assert.equal(params.line_items[0].price_data.unit_amount, TRACE.priceCents);
    assert.equal(params.line_items[0].price_data.currency, 'usd');
    assert.match(params.line_items[0].price_data.product_data.description, /No subscription/);
    assert.equal(params.success_url, 'https://bookmarketel.com/trace?paid={CHECKOUT_SESSION_ID}');
    assert.equal(params.cancel_url, 'https://bookmarketel.com/trace?cancelled=1');
    assert.equal(params.metadata.product, 'trace');
    assert.equal(params.metadata.visitorId, 'v_abcdefghijk');
    assert.equal(params.payment_intent_data.statement_descriptor_suffix, 'TRACE');
  });
});

test('checkout still opens when the account refuses a descriptor suffix', async () => {
  const { app, calls } = fakeWorld({ rejectSuffix: true });
  await serve(app, async ({ post }) => {
    const res = await post('/api/trace/checkout', { visitorId: 'v_abcdefghijk' });
    assert.equal(res.status, 200);
    assert.equal(calls.creates.length, 2);
    assert.equal(calls.creates[1].payment_intent_data.statement_descriptor_suffix, undefined);
    assert.equal(calls.creates[1].payment_intent_data.metadata.product, 'trace');
  });
});

test('checkout refuses to collect money without an unlock signing secret', async () => {
  const { app, calls } = fakeWorld({ env: { TRACE_UNLOCK_SECRET: '', INSPECT_AUTH_SECRET: '' } });
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/checkout', { visitorId: 'v_abcdefghijk' })).status, 503);
    assert.equal(calls.creates.length, 0);
  });
});

test('unlock confirms the payment with Stripe and records, reports and emails it exactly once', async () => {
  const { app, rows, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/unlock', { sessionId: 'nonsense' })).status, 400);
    assert.equal((await post('/api/trace/unlock', { sessionId: 'cs_test_missingSession1' })).status, 404);
    assert.equal((await post('/api/trace/unlock', { sessionId: 'cs_test_claimsSession12' })).status, 404, 'a Claims payment is not a Trace unlock');
    assert.equal((await post('/api/trace/unlock', { sessionId: 'cs_test_unpaidSession12' })).status, 402);
    const first = await post('/api/trace/unlock', { sessionId: PAID });
    const again = await post('/api/trace/unlock', { sessionId: PAID });
    assert.equal(first.status, 200);
    assert.equal(verifyUnlock(SECRET, first.body.token), PAID);
    assert.equal(first.body.email, 'buyer@example.test');
    assert.equal(again.body.token, first.body.token);
    assert.equal(rows.filter(r => r.name === 'TracePaid').length, 1);
    assert.equal(rows.find(r => r.name === 'TracePaid').visitorId, 'v_abcdefghijk');
    assert.equal(calls.mail.length, 1, 'one email however often the page reloads');
    assert.equal(calls.mail[0].to, 'buyer@example.test');
    assert.match(calls.mail[0].text, /no subscription/);
    assert.ok(calls.mail[0].text.includes(`https://bookmarketel.com/trace?unlock=${encodeURIComponent(first.body.token)}`));
    const purchases = calls.capi.filter(c => c.event === 'Purchase');
    assert.ok(purchases.length >= 1);
    assert.ok(purchases.every(c => c.eventId === `trace-purchase.${PAID}` && c.value === 14.99 && c.email === 'buyer@example.test' && c.fbc === 'fb.1.1.click'),
      'repeat sends share one event id, which the CAPI queue sends once');
  });
});

test("the owner's own purchase is not reported to Meta", async () => {
  const { app, calls, rows } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/unlock', { sessionId: 'cs_test_ownerSession123' })).status, 200);
    assert.equal(calls.capi.length, 0);
    assert.ok(!rows.some(row => row.name === 'TracePaid'), 'test purchases must not inflate the paid funnel');
  });
});

test('a verified webhook fulfills a purchase without a browser return, safely replayed with the return', async () => {
  const { app, rows, calls, stripe, inspectRegistration } = fakeWorld({ withWebhook: true });
  const event = { type: 'checkout.session.completed', data: { object: { id: PAID, metadata: { product: 'trace' } } } };
  try {
    await serve(app, async ({ base, post }) => {
      const body = JSON.stringify(event);
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_trace_tests' });
      const webhook = signed => fetch(`${base}/api/inspect-stripe-webhook`, { method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': signed }, body });
      assert.equal((await webhook('invalid')).status, 400);
      assert.equal(calls.mail.length, 0, 'an invalid signature cannot trigger fulfillment');
      assert.equal((await webhook(signature)).status, 200);
      assert.equal((await webhook(signature)).status, 200);
      assert.equal(calls.mail.length, 1, 'payment is emailed even though the buyer never returned');
      assert.equal(rows.filter(row => row.name === 'TracePaid').length, 1);
      assert.equal(calls.capi.find(call => call.event === 'Purchase').ip, '');
      assert.equal(calls.capi.find(call => call.event === 'Purchase').userAgent, '');
      assert.equal((await post('/api/trace/unlock', { sessionId: PAID })).status, 200);
      assert.equal(calls.mail.length, 1, 'return and webhook share one fulfillment');
      assert.equal(rows.filter(row => row.name === 'TracePaid').length, 1);
    });
  } finally { inspectRegistration.close(); }
});

test('a webhook email failure releases the claim for a retry, without duplicating the purchase', async () => {
  const { registration, calls, rows } = fakeWorld({ failMailOnce: true });
  const event = { type: 'checkout.session.completed', data: { object: { id: PAID, metadata: { product: 'trace' } } } };
  const req = { headers: {}, ip: '127.0.0.1' };
  await assert.rejects(registration.handleStripeEvent(event, req), /smtp down/);
  assert.equal(await registration.handleStripeEvent(event, req), true);
  assert.equal(calls.mail.length, 1);
  assert.equal(rows.filter(row => row.name === 'TracePaid').length, 1);
  assert.equal(await registration.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { metadata: { product: 'marketel-inspect' } } } }, req), false);
});

test('a failed unlock email is retried on the next load instead of being lost', async () => {
  const { app, calls } = fakeWorld({ failMailOnce: true });
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/unlock', { sessionId: PAID })).status, 200, 'the buyer is unlocked even when mail fails');
    assert.equal(calls.mail.length, 0);
    await post('/api/trace/unlock', { sessionId: PAID });
    assert.equal(calls.mail.length, 1);
  });
});

test('an unlock link verifies only with a genuine token', async () => {
  const { app } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.deepEqual((await post('/api/trace/verify', { token: unlockToken(SECRET, PAID) })).body, { ok: true });
    assert.equal((await post('/api/trace/verify', { token: unlockToken('wrong', PAID) })).status, 400);
  });
});

test('"Already paid?" emails the link only to a buyer and answers the same either way', async () => {
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/restore', { email: 'nope' })).status, 400);
    const stranger = await post('/api/trace/restore', { email: 'stranger@example.test' });
    const buyer = await post('/api/trace/restore', { email: 'buyer@example.test' });
    assert.deepEqual(stranger.body, buyer.body);
    assert.equal(calls.mail.length, 1);
    assert.equal(calls.mail[0].to, 'buyer@example.test');
    assert.ok(calls.mail[0].text.includes('/trace?unlock='));
  });
});

test('from the iPhone app: Safari return path, nothing to Meta, and the landing says app', async () => {
  const { app, rows, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    const appOrigin = { origin: 'capacitor://localhost' };
    await post('/api/trace/event', { name: 'TraceLanded', visitorId: 'v_appvisitor1' }, appOrigin);
    assert.equal(rows.at(-1).detail, 'app');
    await post('/api/trace/event', { name: 'TraceStarted', visitorId: 'v_appvisitor1', attribution: { fbp: 'fb.1.1.2' } }, appOrigin);
    await post('/api/trace/event', { name: 'TraceCheckoutOpened', visitorId: 'v_appvisitor1' }, appOrigin);
    const res = await post('/api/trace/checkout', { visitorId: 'v_appvisitor1' }, appOrigin);
    assert.equal(res.body.id, 'cs_test_new');
    const params = calls.creates[0];
    assert.equal(params.success_url, 'https://bookmarketel.com/trace?paid={CHECKOUT_SESSION_ID}&app=1');
    assert.equal(params.cancel_url, 'https://bookmarketel.com/trace?cancelled=1&app=1');
    assert.equal(params.metadata.app, '1');
    assert.equal(params.metadata.fbp, '');
    await post('/api/trace/unlock', { sessionId: PAID }, appOrigin);
    assert.equal(calls.capi.length, 0, 'nothing done in the app reaches Meta');
  });
});

test('the 6-digit code in the email unlocks only with the email that paid', async () => {
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    await post('/api/trace/unlock', { sessionId: PAID });
    const code = unlockCode(SECRET, PAID);
    assert.match(code, /^\d{6}$/);
    assert.ok(calls.mail[0].text.includes(code), 'the unlock email carries the code');
    const good = await post('/api/trace/restore-code', { email: 'buyer@example.test', code });
    assert.equal(good.status, 200);
    assert.equal(verifyUnlock(SECRET, good.body.token), PAID);
    const wrongCode = String((Number(code) + 1) % 1000000).padStart(6, '0');
    assert.equal((await post('/api/trace/restore-code', { email: 'buyer@example.test', code: wrongCode })).status, 400);
    assert.equal((await post('/api/trace/restore-code', { email: 'stranger@example.test', code })).status, 400);
    assert.equal((await post('/api/trace/restore-code', { email: 'buyer@example.test', code: '12' })).status, 400);
    // Six tries an hour per email, then it stops answering.
    for (let i = 0; i < 4; i++) await post("/api/trace/restore-code", { email: "buyer@example.test", code: wrongCode });
    assert.equal((await post('/api/trace/restore-code', { email: 'buyer@example.test', code })).status, 429);
  });
});

test("the owner's own email unlocks through 'Already paid?' without a purchase, and nothing counts as a sale", async () => {
  const { app, rows, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.deepEqual((await post('/api/trace/restore', { email: 'owner@example.test' })).body, { success: true });
    assert.equal(calls.mail.length, 1);
    assert.equal(calls.mail[0].to, 'owner@example.test');
    const link = calls.mail[0].text.match(/trace\?unlock=([^\s]+)/)[1];
    assert.ok(verifyUnlock(SECRET, decodeURIComponent(link)), 'the emailed link unlocks the web');
    const code = calls.mail[0].text.match(/code: (\d{6})/)[1];
    const unlocked = await post('/api/trace/restore-code', { email: 'owner@example.test', code });
    assert.equal(unlocked.status, 200, 'the emailed code unlocks the app');
    assert.ok(verifyUnlock(SECRET, unlocked.body.token));
    assert.equal(calls.lists.length, 0, 'no Stripe lookup for the owner');
    assert.equal(rows.filter(r => r.name === 'TracePaid').length, 0);
    assert.equal(calls.capi.length, 0);
    assert.equal((await post('/api/trace/restore-code', { email: 'owner@example.test', code: '000000' === code ? '111111' : '000000' })).status, 400);
  });
});

function fakeOpenAI({ refuse = false, fail = false } = {}) {
  const prompts = [];
  return { prompts, images: { generate: async params => {
    prompts.push(params);
    if (refuse) throw Object.assign(new Error('Your request was rejected by the safety system.'), { status: 400, code: 'moderation_blocked' });
    if (fail) throw Object.assign(new Error('upstream'), { status: 500 });
    return { data: [{ b64_json: 'UklGRg==' }] };
  } } };
}

test('Describe it: one free AI picture per visitor, line-art prompt, counted only when drawn', async () => {
  const openai = fakeOpenAI();
  const { app, rows } = fakeWorld({ openai });
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/generate', { prompt: 'x', visitorId: 'v_freevisitor1' })).status, 400);
    const first = await post('/api/trace/generate', { prompt: '  a cat \n wearing a crown ', visitorId: 'v_freevisitor1' });
    assert.equal(first.status, 200);
    assert.equal(first.body.image, 'data:image/webp;base64,UklGRg==');
    assert.match(openai.prompts[0].prompt, /black-and-white line drawing made for tracing[\s\S]*Subject: a cat wearing a crown$/);
    assert.equal(openai.prompts[0].model, 'gpt-image-1-mini');
    assert.equal(openai.prompts[0].quality, 'low');
    assert.equal(openai.prompts[0].moderation, 'auto');
    assert.equal(rows.filter(r => r.name === 'TraceAIGenerated' && r.detail === 'free').length, 1);
    const second = await post('/api/trace/generate', { prompt: 'a dog', visitorId: 'v_freevisitor1' });
    assert.equal(second.status, 402, 'the second free picture asks to unlock');
    assert.equal(openai.prompts.length, 1, 'and costs nothing');
    assert.equal((await post('/api/trace/generate', { prompt: 'a dog', visitorId: 'v_freevisitor1' }, { 'user-agent': 'Mozilla/5.0 HeadlessChrome/120' })).status, 403);
  });
});

test('Describe it: a purchase gets its monthly allowance, then a clear limit', async () => {
  const openai = fakeOpenAI();
  const { app } = fakeWorld({ openai, env: { TRACE_AI_MONTHLY: '2' } });
  await serve(app, async ({ post }) => {
    const token = unlockToken(SECRET, PAID);
    assert.equal((await post('/api/trace/generate', { prompt: 'a rocket', visitorId: 'v_buyerbuyer1', token })).status, 200);
    assert.equal((await post('/api/trace/generate', { prompt: 'a robot', visitorId: 'v_buyerbuyer2', token })).status, 200);
    const over = await post('/api/trace/generate', { prompt: 'a tree', visitorId: 'v_buyerbuyer3', token });
    assert.equal(over.status, 429);
    assert.match(over.body.error, /2 AI pictures this month/);
    assert.equal((await post('/api/trace/generate', { prompt: 'a tree', visitorId: 'v_buyerbuyer3', token: unlockToken('forged', PAID) })).status, 200,
      'a forged token is just a visitor, who still has their one free picture');
  });
});

test('Describe it: the daily spending cap stops everyone, and 0 turns it off', async () => {
  const openai = fakeOpenAI();
  const capped = fakeWorld({ openai, env: { TRACE_AI_DAILY_CAP_USD: '0.04', TRACE_AI_COST_USD: '0.02' } });
  await serve(capped.app, async ({ post }) => {
    assert.equal((await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_capcapcap01' })).status, 200);
    assert.equal((await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_capcapcap02' })).status, 200);
    const rest = await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_capcapcap03' });
    assert.equal(rest.status, 503);
    assert.match(rest.body.error, /resting until tomorrow/);
    assert.equal(openai.prompts.length, 2);
  });
  const off = fakeWorld({ openai: fakeOpenAI(), env: { TRACE_AI_DAILY_CAP_USD: '0' } });
  await serve(off.app, async ({ post }) => {
    assert.equal((await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_offoffoff01' })).status, 503);
  });
  const noKey = fakeWorld();
  await serve(noKey.app, async ({ post }) => {
    assert.equal((await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_nokeynokey1' })).status, 503, 'no OpenAI key, no generator');
  });
});

test('Describe it: refused and failed drawings cost the visitor nothing and say so plainly', async () => {
  const refused = fakeWorld({ openai: fakeOpenAI({ refuse: true }) });
  await serve(refused.app, async ({ post }) => {
    const res = await post('/api/trace/generate', { prompt: 'something not allowed', visitorId: 'v_refusedone1' });
    assert.equal(res.status, 422);
    assert.match(res.body.error, /can't draw that one/);
    assert.equal(refused.rows.filter(r => r.name === 'TraceAIGenerated').length, 0, 'the free picture is not used up');
    assert.equal(refused.rows.filter(r => r.name === 'TraceAIRefused').length, 1);
  });
  const failed = fakeWorld({ openai: fakeOpenAI({ fail: true }) });
  await serve(failed.app, async ({ post }) => {
    const res = await post('/api/trace/generate', { prompt: 'a moon', visitorId: 'v_failedone01' });
    assert.equal(res.status, 502);
    assert.equal(failed.rows.filter(r => r.name === 'TraceAIGenerated').length, 0);
  });
});

test('every event name the page sends is one the server accepts', () => {
  const page = require('fs').readFileSync(require('path').join(__dirname, '../trace-web/trace.js'), 'utf8');
  const sent = new Set([...page.matchAll(/track\('([A-Za-z]+)'/g)].map(m => m[1]));
  for (const name of sent) assert.ok(TRACE_EVENTS.includes(name), name);
  assert.ok(sent.size >= 15);
});

test('the refund promise reads the same on the choice step, the paywall and the terms', () => {
  const fs = require('fs');
  const path = require('path');
  const page = fs.readFileSync(path.join(__dirname, '../trace-web/index.html'), 'utf8');
  const terms = fs.readFileSync(path.join(__dirname, '../trace-web/terms.html'), 'utf8');
  const choose = page.match(/id="pay-under">([^<]*7 days[^<]*)<\/p>/);
  assert.ok(choose, 'the first screen states the refund under its pay button');
  const fine = page.match(/id="pay-fine">([\s\S]*?)<\/p>/)[1];
  const refunds = terms.match(/<h2>Refunds<\/h2>\s*<p>([\s\S]*?)<\/p>/)[1];
  for (const [where, text] of [['choice step', choose[1]], ['paywall', fine], ['terms', refunds]]) {
    assert.match(text, /7 days/, `${where} says 7 days`);
    assert.match(text, /(doesn't work|Not working) on your phone/i, `${where} says when it applies`);
  }
});
