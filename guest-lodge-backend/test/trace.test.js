'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { TRACE, TRACE_EVENTS, registerTrace, unlockToken, verifyUnlock, isTracePurchase } = require('../trace');

const SECRET = 'trace-test-secret';
const PAID = 'cs_test_paidSession1234';

function fakeWorld({ failMailOnce = false, rejectSuffix = false } = {}) {
  const rows = [];
  const unique = sourceId => rows.find(row => row.sourceId && row.sourceId === sourceId);
  const prisma = { inspectEvent: {
    create: async ({ data }) => {
      if (data.sourceId && unique(data.sourceId)) throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      rows.push({ ...data }); return data;
    },
    upsert: async ({ where, create }) => unique(where.sourceId) || (rows.push({ ...create }), create),
    delete: async ({ where }) => { const i = rows.findIndex(row => row.sourceId === where.sourceId); if (i >= 0) rows.splice(i, 1); },
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
  const mail = { sendMail: async message => { if (mailFailures > 0) { mailFailures -= 1; throw new Error('smtp down'); } calls.mail.push(message); } };
  const queueCapi = async (event, input) => { calls.capi.push({ event, ...input }); return { queued: true }; };
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  registerTrace(app, { prisma, stripe, mail, queueCapi, capiConfigured: true, isCapiExcludedEmail: email => email === 'owner@example.test',
    env: { TRACE_UNLOCK_SECRET: SECRET, TRACE_PUBLIC_ORIGIN: 'https://bookmarketel.com' } });
  return { app, rows, calls };
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
      assert.match(await res.text(), /Trace any picture onto paper/);
      assert.match(res.headers.get('permissions-policy'), /camera=\(self\)/);
      assert.match(res.headers.get('permissions-policy'), /microphone=\(\)/);
      assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    }
    const terms = await fetch(`${base}/trace/terms`);
    assert.match(await terms.text(), /never uploaded/);
    const script = await fetch(`${base}/trace/trace.js`);
    assert.equal(script.status, 200);
    for (const picture of ['butterfly', 'flower', 'cat', 'heart', 'house', 'fish']) {
      assert.equal((await fetch(`${base}/trace/pictures/${picture}.svg`)).status, 200, picture);
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
    assert.equal(calls.capi.length, 0, 'ordinary steps are not sent to Meta');
  });
});

test('starting to trace and opening checkout are the Meta signals, once per visitor by event id', async () => {
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    const attribution = { fbp: 'fb.1.1700000000.123', fbc: 'fb.1.1700000000.click', sourceUrl: 'https://bookmarketel.com/trace?fbclid=click' };
    await post('/api/trace/event', { name: 'TraceStarted', visitorId: 'v_abcdefghijk', detail: 'starter', attribution });
    await post('/api/trace/event', { name: 'TraceCheckoutOpened', visitorId: 'v_abcdefghijk', attribution });
    await post('/api/trace/event', { name: 'TraceStarted', visitorId: 'v_abcdefghijk', detail: 'photo', attribution }, { 'x-marketel-no-track': '1' });
    assert.deepEqual(calls.capi.map(c => [c.event, c.eventId, c.value]), [
      ['ViewContent', 'trace-started.v_abcdefghijk', undefined],
      ['InitiateCheckout', 'trace-checkout.v_abcdefghijk', 14.99],
    ]);
    assert.equal(calls.capi[0].fbc, 'fb.1.1700000000.click');
    assert.equal(calls.capi[0].product, 'trace-anything');
  });
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
  const { app, calls } = fakeWorld();
  await serve(app, async ({ post }) => {
    assert.equal((await post('/api/trace/unlock', { sessionId: 'cs_test_ownerSession123' })).status, 200);
    assert.equal(calls.capi.length, 0);
  });
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

test('every event name the page sends is one the server accepts', () => {
  const page = require('fs').readFileSync(require('path').join(__dirname, '../trace-web/trace.js'), 'utf8');
  const sent = new Set([...page.matchAll(/track\('([A-Za-z]+)'/g)].map(m => m[1]));
  for (const name of sent) assert.ok(TRACE_EVENTS.includes(name), name);
  assert.ok(sent.size >= 15);
});
