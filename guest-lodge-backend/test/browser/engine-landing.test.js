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
async function world(fn, { viewport = { width: 390, height: 844 }, env = {}, sessions = {}, subscriptions = {}, methods = {} } = {}) {
  const app = express();
  const creates = [], charges = [];
  const stripe = { checkout: { sessions: {
    create: async params => { creates.push(params); return { id: 'cs_test_made' + creates.length, client_secret: 'cs_test_secret_' + creates.length,
      url: params.mode === 'payment' ? 'https://checkout.stripe.com/c/pay/cs_test_lifetime' : undefined }; },
    retrieve: async id => { if (!sessions[id]) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return sessions[id]; },
  } }, subscriptions: {
    retrieve: async id => subscriptions[id],
    update: async (id, { metadata }) => Object.assign(subscriptions[id].metadata, metadata),
    cancel: async id => Object.assign(subscriptions[id], { status: 'canceled' }),
  }, paymentMethods: { retrieve: async id => methods[id] },
  paymentIntents: { create: async params => { charges.push(params); return { id: 'pi_test' + charges.length, status: 'succeeded', amount_received: params.amount }; }, cancel: async () => ({}) } };
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
    // The live hotel pages, stood in for.
    await page.route(/^https:\/\/[a-z]+\.clickinns\.com\/?$/, route => route.fulfill({ headers: { 'content-type': 'text/html' },
      body: `<title>live</title><h1>${new URL(route.request().url()).hostname}</h1>` }));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ headers: { 'content-type': 'text/html' }, body: '<title>Stripe</title><p>Stripe checkout</p>' }));
    await fn({ page, base, creates, rows, charges, subscriptions });
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
    assert.match(text, /Trusted by 23 hotels/);
    // The PMS logos load and fit.
    for (const alt of ['Cloudbeds', 'BookingCenter']) {
      assert.ok(await page.locator(`.logos img[alt="${alt}"]`).evaluate(img => img.complete && img.naturalWidth > 0), alt);
    }
    assert.match(await page.locator('.logos').innerText(), /Little Hotelier[\s\S]*\+ Yours/);
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
  await page.locator('.plan [data-plan="monthly"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('sticky').classList.contains('show'));
  await page.locator('.plan [data-plan="monthly"]').click();
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

test('the live hotel pages switch in place, with the address and the new-tab link to match', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  await page.locator('.live').scrollIntoViewIfNeeded();
  assert.equal(await page.getAttribute('#liveFrame', 'src'), 'https://suitestay.clickinns.com');
  await page.click('.tabs [data-site="hp"]');
  assert.equal(await page.getAttribute('#liveFrame', 'src'), 'https://hp.clickinns.com');
  assert.equal(await page.locator('#liveHost').innerText(), 'hp.clickinns.com');
  assert.equal(await page.getAttribute('#exampleLink', 'href'), 'https://hp.clickinns.com');
  assert.match(await page.locator('#exampleLink').innerText(), /Home Place Suites/);
  assert.equal(await page.getAttribute('.tabs [data-site="hp"]', 'aria-selected'), 'true');
  assert.equal(await page.getAttribute('.tabs [data-site="suitestay"]', 'aria-selected'), 'false');
  const frame = page.frameLocator('#liveFrame');
  await frame.locator('h1').waitFor();
  assert.equal(await frame.locator('h1').innerText(), 'hp.clickinns.com');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
}));

const welcomeOrder = (id, { minutesAgo = 2 } = {}) => ({ object: 'checkout.session', id, mode: 'subscription', status: 'complete', payment_status: 'paid', livemode: false,
  amount_total: 9700, subscription: 'sub_' + id, created: Math.floor(Date.now() / 1000) - minutesAgo * 60,
  customer_details: { email: 'owner@lakeview.test', name: 'Dana Reyes' }, metadata: { product: PRODUCT, property: 'Lakeview Inn', name: 'Dana Reyes', phone: '205', pms: 'Little Hotelier' } });
const monthly = (id, wallet = false) => ({
  subscriptions: { ['sub_' + id]: { id: 'sub_' + id, status: 'active', customer: 'cus_1', default_payment_method: 'pm_1', metadata: { product: PRODUCT } } },
  methods: { pm_1: { id: 'pm_1', type: 'card', customer: 'cus_1', card: { wallet: wallet ? { type: 'apple_pay' } : null } } },
});

test('after paying: the $497 pay-once offer, one tap on the same card, and the page says it is done', async () => world(async ({ page, base, charges, subscriptions }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_life0000001');
  await page.waitForSelector('#lifetime:not([hidden])');
  assert.match(await page.locator('#lifetime').innerText(), /Pay \$497 once[\s\S]*Charged to the card you just used/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.click('#lifetimeYes');
  await page.waitForSelector('#lifetimeDone:not([hidden])');
  assert.equal(await page.locator('#lifetime').isVisible(), false);
  assert.match(await page.locator('#billing').innerText(), /\$97 \+ \$497 paid\. No monthly charges/);
  assert.equal(charges.length, 1);
  assert.equal(charges[0].amount, 49700);
  assert.equal(subscriptions.sub_cs_test_life0000001.status, 'canceled');
  // Coming back to the page shows it done, not the offer again.
  await page.reload();
  await page.waitForSelector('#lifetimeDone:not([hidden])');
  assert.equal(await page.locator('#lifetime').isVisible(), false);
}, { sessions: { cs_test_life0000001: welcomeOrder('cs_test_life0000001') }, ...monthly('cs_test_life0000001') }));

test('paid with Apple Pay: yes opens Stripe\'s page for the $497; no thanks just closes the offer', async () => world(async ({ page, base, charges }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_wallet00001');
  await page.waitForSelector('#lifetime:not([hidden])');
  assert.match(await page.locator('#lifetimeFine').innerText(), /Stripe.s secure page/);
  await page.click('#lifetimeYes');
  await page.waitForURL(url => url.hostname === 'checkout.stripe.com');
  assert.equal(charges.length, 0);
  await page.goto(base + '/engine/welcome?session_id=cs_test_wallet00001');
  await page.waitForSelector('#lifetime:not([hidden])');
  await page.click('#lifetimeNo');
  assert.equal(await page.locator('#lifetime').isVisible(), false);
  assert.equal(await page.locator('#done').isVisible(), true);
}, { sessions: { cs_test_wallet00001: welcomeOrder('cs_test_wallet00001') }, ...monthly('cs_test_wallet00001', true) }));

test('an hour after paying, the welcome page no longer offers pay-once', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_late0000001');
  await page.waitForSelector('#done:not([hidden])');
  assert.equal(await page.locator('#lifetime').isVisible(), false);
}, { sessions: { cs_test_late0000001: welcomeOrder('cs_test_late0000001', { minutesAgo: 61 }) }, ...monthly('cs_test_late0000001') }));

test('two plans on the page: pay-once switches the order card to one $497 payment, and back', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/engine');
  const plans = page.locator('.plans .plan');
  assert.equal(await plans.count(), 2);
  assert.match(await plans.nth(0).innerText(), /\$97[\s\S]*then \$49\/month/);
  assert.match(await plans.nth(1).innerText(), /\$497[\s\S]*no monthly fees/);
  // The order card at the top leads with the ad's price.
  assert.equal(await page.locator('#dealAmount').innerText(), '$97');
  assert.equal(await page.locator('#planNote').isVisible(), false);
  await page.locator('.plans [data-plan="once"]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'email');
  assert.equal(await page.locator('#dealAmount').innerText(), '$497');
  assert.equal(await page.locator('#planNote').isVisible(), true);
  assert.match(await page.locator('#orderFine').innerText(), /\$497 once\. No monthly fees/);
  assert.equal(await page.locator('#stickyPrice').innerText(), '$497 once');
  await page.fill('#email', 'owner@lakeview.test');
  await page.click('#emailBtn');
  assert.equal(await page.locator('#detailsBtn').innerText(), 'Lock in my $497 pay-once');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 1);
  assert.equal(creates[0].mode, 'payment');
  assert.equal(creates[0].metadata.plan, 'once');
  assert.equal(creates[0].line_items[0].price_data.unit_amount, 49700);
  // Switching back closes the $497 checkout and returns to the details, as typed.
  await page.click('#planBack');
  assert.equal(await page.evaluate(() => window.__stripe.destroyed), 1);
  assert.equal(await page.locator('#detailsForm').isVisible(), true);
  assert.equal(await page.inputValue('#property'), 'Lakeview Inn');
  assert.equal(await page.locator('#dealAmount').innerText(), '$97');
  assert.equal(await page.locator('#detailsBtn').innerText(), 'Lock in my $97 launch');
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 2);
  assert.equal(creates[1].mode, 'subscription');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
}));

test('a pay-once buyer\'s welcome page says paid once, with nothing more to buy', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine/welcome?session_id=cs_test_once0000001');
  await page.waitForSelector('#done:not([hidden])');
  assert.equal(await page.locator('#billing').innerText(), '$497 paid once. No monthly charges, ever.');
  assert.equal(await page.locator('#lifetime').isVisible(), false);
}, { sessions: { cs_test_once0000001: { ...welcomeOrder('cs_test_once0000001'), mode: 'payment', subscription: null, amount_total: 49700,
  metadata: { ...welcomeOrder('x').metadata, plan: 'once' } } } }));
