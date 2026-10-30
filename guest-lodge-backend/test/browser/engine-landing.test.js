'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerEngineOffer, PRODUCT } = require('../../engine-offer');

const ACCOUNT = '51AbCdEfGhIjKlMnO';
const STRIPE_STUB = `
  window.__stripe = { mounts: 0, destroyed: 0, key: null };
  window.Stripe = key => { window.__stripe.key = key; return { initEmbeddedCheckout: async options => {
    window.__stripe.secret = await options.fetchClientSecret();
    let frame;
    return {
      mount: selector => {
        if (document.querySelector(selector).childNodes.length) throw new Error('Embedded Checkout must be mounted in a DOM element that contains no child nodes.');
        window.__stripe.mounts++;
        frame = document.createElement('iframe');
        frame.title = 'Stripe payment form';
        frame.style.cssText = 'width:100%;height:420px;border:0;display:block';
        frame.srcdoc = '<p>Total due today $97.00</p>';
        document.querySelector(selector).appendChild(frame);
      },
      destroy: () => { window.__stripe.destroyed++; frame?.remove(); },
    };
  } }; };`;

// The /engine pages with the real module, a stand-in Stripe and the real public scripts.
async function world(fn, { viewport = { width: 390, height: 844 }, env = {}, sessions = {} } = {}) {
  const app = express();
  const creates = [];
  const stripe = { checkout: { sessions: {
    create: async params => { creates.push(params); return { id: 'cs_test_made' + creates.length, client_secret: 'cs_test_secret_' + creates.length }; },
    retrieve: async id => { if (!sessions[id]) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions[id]; },
  } } };
  const rows = new Map();
  const prisma = { inspectEvent: {
    upsert: async ({ where, create }) => { if (!rows.has(where.sourceId)) rows.set(where.sourceId, create); return create; },
    create: async ({ data }) => { const key = data.sourceId || 'e' + rows.size; if (rows.has(key)) throw Object.assign(new Error('dup'), { code: 'P2002' }); rows.set(key, data); return data; },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  app.use(express.json());
  registerEngineOffer(app, { stripe, prisma, mail: { sendMail: async () => {} },
    env: { NODE_ENV: 'test', STRIPE_INSPECT_SECRET_KEY: `sk_test_${ACCOUNT}x`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${ACCOUNT}a`, ...env } });
  app.get('/marketel-session-replay.js', (req, res) => res.type('js').send(''));
  app.use(express.static(path.resolve(__dirname, '../../public'), { index: false }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    // Reduced motion: no smooth scrolling under Playwright's clicks.
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', ...(viewport.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://js.stripe.com/v3/', route => route.fulfill({ headers: { 'content-type': 'application/javascript' }, body: STRIPE_STUB }));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ headers: { 'content-type': 'text/css' }, body: '' }));
    await fn({ page, base, creates, rows });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

const fillDetails = async page => {
  await page.fill('#property', 'Lakeview Inn');
  await page.fill('#name', 'Dana Reyes');
  await page.fill('#phone', '205 555 0142');
  await page.fill('#pms', 'Little Hotelier');
  // Typing in the PMS box opens its suggestion list; Tab closes it, as a person would.
  await page.press('#pms', 'Tab');
};

for (const width of [320, 390]) {
  test(`${width}px: the page fits a phone and says the price, the PMS and the guarantee up top`, async () => world(async ({ page, base }) => {
    await page.goto(base + '/engine');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no sideways scroll at phone width');
    const text = await page.locator('body').innerText();
    assert.match(text, /connected to your PMS/i);
    assert.match(text, /\$97 today/);
    assert.match(text, /then \$49\/month/);
    assert.match(text, /30-day money-back guarantee/);
    assert.match(text, /If it doesn.t connect to your PMS, you don.t pay/);
    assert.equal(await page.locator('#email').isVisible(), true);
    const button = await page.locator('#emailBtn').boundingBox();
    assert.ok(button.y + button.height < 844 * 2.2, 'the order card is within two screens');
  }, { viewport: { width, height: 844 } }));
}

test('email first, then the property details, then Stripe\'s checkout on the page', async () => world(async ({ page, base, creates, rows }) => {
  await page.goto(base + '/engine?fbclid=abc123');
  await page.click('#emailBtn');
  assert.equal(await page.getAttribute('#email', 'placeholder'), 'Please enter your email');
  assert.equal(await page.locator('#detailsForm').isVisible(), false);
  await page.fill('#email', 'Owner@Lakeview.test');
  await page.click('#emailBtn');
  await page.waitForFunction(() => document.activeElement?.id === 'property');
  // Nothing goes to Stripe until every field is there.
  await page.fill('#property', 'Lakeview Inn');
  await page.click('#detailsBtn');
  await page.waitForTimeout(150);
  assert.equal(creates.length, 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'name');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 1);
  assert.equal(creates.length, 1);
  assert.equal(creates[0].customer_email, 'owner@lakeview.test');
  assert.equal(creates[0].metadata.product, PRODUCT);
  assert.equal(creates[0].metadata.pms, 'Little Hotelier');
  assert.equal(creates[0].metadata.noTrack, '1', 'a test browser is never counted');
  assert.equal(await page.evaluate(() => window.__stripe.secret), 'cs_test_secret_1');
  assert.equal(await page.locator('#detailsForm').isVisible(), false);
  assert.match(await page.locator('#payStage').innerText(), /Lakeview Inn[\s\S]*Little Hotelier · owner@lakeview\.test/);
  // Playwright's own browser is never counted.
  assert.equal([...rows.values()].filter(r => r.name === 'EngineStep').length, 0);
}));

test('Edit goes back with everything typed, and paying again opens a fresh checkout', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/engine');
  await page.fill('#email', 'owner@lakeview.test');
  await page.click('#emailBtn');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 1);
  await page.click('#editBtn');
  assert.equal(await page.inputValue('#property'), 'Lakeview Inn');
  assert.equal(await page.evaluate(() => window.__stripe.destroyed), 1);
  await page.fill('#pms', 'Cloudbeds');
  await page.press('#pms', 'Tab');
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 2);
  assert.equal(creates[1].metadata.pms, 'Cloudbeds');
}));

test('when checkout is shut the owner is told and keeps the form', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/engine');
  await page.fill('#email', 'owner@lakeview.test');
  await page.click('#emailBtn');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForSelector('#orderError.show');
  assert.match(await page.locator('#orderError').innerText(), /support@bookmarketel\.com/);
  assert.equal(await page.locator('#detailsForm').isVisible(), true);
  assert.equal(await page.isEnabled('#detailsBtn'), true);
  assert.equal(creates.length, 0);
}, { env: { ENGINE_OFFER_ENABLED: 'false' } }));

test('every lower button brings the owner back to the order card, and the sticky bar hides while paying', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  await page.locator('.plan [data-go]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('sticky').classList.contains('show'));
  await page.locator('.plan [data-go]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'email');
  await page.fill('#email', 'owner@lakeview.test');
  await page.click('#emailBtn');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 1);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.getElementById('sticky').classList.contains('show')), false);
}));

test('on a computer the order card sits beside the headline', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  const head = await page.locator('h1').boundingBox(), card = await page.locator('#order').boundingBox();
  assert.ok(card.x > head.x + head.width, JSON.stringify({ head, card }));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
  assert.equal(await page.locator('#sticky').isVisible(), false);
}, { viewport: { width: 1280, height: 860 } }));

test('the welcome page confirms the order and says what happens next', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_done0000001');
  await page.waitForSelector('#done:not([hidden])');
  const text = await page.locator('#done').innerText();
  assert.match(text, /building Lakeview Inn’s booking engine/);
  assert.match(text, /staff login for Marketel in Little Hotelier/);
  assert.match(text, /owner@lakeview\.test/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
}, { sessions: { cs_test_done0000001: { object: 'checkout.session', id: 'cs_test_done0000001', mode: 'subscription', status: 'complete', payment_status: 'paid', livemode: false,
  amount_total: 9700, customer_details: { email: 'owner@lakeview.test', name: 'Dana Reyes' },
  metadata: { product: PRODUCT, property: 'Lakeview Inn', name: 'Dana Reyes', phone: '205', pms: 'Little Hotelier' } } } }));

test('an unpaid or unknown order says so, with a way back', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_unknown00001');
  await page.waitForSelector('#problem:not([hidden])');
  assert.match(await page.locator('#problem').innerText(), /Order not found[\s\S]*go back to checkout/);
}));
