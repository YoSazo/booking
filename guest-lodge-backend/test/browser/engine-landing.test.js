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
async function world(fn, { viewport = { width: 390, height: 844 }, env = {}, sessions = {}, subscriptions = {}, methods = {}, reducedMotion = 'reduce' } = {}) {
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
    // Reduced motion: no smooth scrolling under Playwright's clicks (and the agent's booking shown done).
    const page = await browser.newPage({ viewport, reducedMotion, ...(viewport.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
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
  test(`${width}px: the page fits a phone and says what it is, the proof, the price and the guarantee up top`, async () => world(async ({ page, base }) => {
    await page.goto(base + '/engine');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no sideways scroll at phone width');
    assert.equal(await page.locator('h1').innerText(), 'Your own booking engine, built for you. Connected to any PMS.');
    const hero = await page.locator('.hero').innerText();
    assert.match(hero, /Trusted by 23 hotels/);
    assert.match(hero, /257 bookings by our AI agent · 99% accurate/);
    assert.match(hero, /How does it work\?/);
    assert.match(hero, /\$97 today, then \$49\/month/);
    assert.match(hero, /Doesn.t work with your PMS\? You don.t pay\./);
    const text = await page.locator('body').innerText();
    assert.match(text, /30-day money-back guarantee/);
    assert.match(text, /a person on our team enters the booking by hand within a minute/i);
    // The PMS logos load and fit.
    for (const alt of ['Cloudbeds', 'BookingCenter']) {
      assert.ok(await page.locator(`.logos img[alt="${alt}"]`).evaluate(img => img.complete && img.naturalWidth > 0), alt);
    }
    assert.match(await page.locator('.logos').innerText(), /Little Hotelier[\s\S]*\+ Yours/);
    assert.equal(await page.locator('#email').isVisible(), true);
    // The order card is on the first screen, Get started included (no web fonts here, so a little slack).
    const button = await page.locator('#emailBtn').boundingBox();
    assert.ok(button.y + button.height < 844 * 1.05, JSON.stringify(button));
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

test('on a computer the headline and the order card are centered, one under the other', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  const head = await page.locator('h1').boundingBox(), card = await page.locator('#order').boundingBox();
  assert.ok(card.y > head.y + head.height, JSON.stringify({ head, card }));
  assert.ok(Math.abs(card.x + card.width / 2 - 640) < 2 && Math.abs(head.x + head.width / 2 - 640) < 2, JSON.stringify({ head, card }));
  assert.ok(card.y + 200 < 860, 'the card starts on the first screen');
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

test('the live hotel sites switch in place, with the address to match and no new-tab link', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  await page.locator('.browser').scrollIntoViewIfNeeded();
  assert.match(await page.locator('.examples').innerText(), /A FEW EXAMPLES/i);
  assert.equal(await page.locator('.examples a').count(), 0);
  // The site is shown whole, can't be scrolled or tapped inside, and with motion off it rests at the top.
  const shown = await page.locator('#liveFrame').evaluate(frame => ({ scrolling: frame.getAttribute('scrolling'), taps: getComputedStyle(frame).pointerEvents,
    height: frame.offsetHeight, glides: frame.getAnimations().length }));
  assert.deepEqual({ ...shown, height: shown.height > 1700 }, { scrolling: 'no', taps: 'none', height: true, glides: 0 });
  assert.equal(await page.getAttribute('#liveFrame', 'src'), 'https://suitestay.clickinns.com');
  await page.click('.tabs [data-site="hp"]');
  assert.equal(await page.getAttribute('#liveFrame', 'src'), 'https://hp.clickinns.com');
  assert.equal(await page.locator('#liveHost').innerText(), 'hp.clickinns.com');
  assert.equal(await page.getAttribute('.tabs [data-site="hp"]', 'aria-selected'), 'true');
  assert.equal(await page.getAttribute('.tabs [data-site="suitestay"]', 'aria-selected'), 'false');
  const frame = page.frameLocator('#liveFrame');
  await frame.locator('h1').waitFor();
  assert.equal(await frame.locator('h1').innerText(), 'hp.clickinns.com');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
}));

test('the live site glides down and back up on its own while in view, and scrolling over it scrolls the page', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  const glide = () => page.evaluate(() => document.getElementById('liveFrame').getAnimations()[0]?.playState || 'none');
  await page.locator('.browser').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('liveFrame').getAnimations()[0]?.playState === 'running');
  // Down to the end of the last room and back: Suite Stay's ends about 1,600px down.
  const travel = await page.evaluate(() => -parseFloat(document.getElementById('liveFrame').getAnimations()[0].effect.getKeyframes()[2].transform.match(/-?[\d.]+/)[0]));
  assert.ok(travel > 900 && travel < 1400, String(travel));
  const box = await page.locator('.browser .screen').boundingBox(), before = await page.evaluate(() => scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForFunction(y => scrollY > y + 200, before);
  // Out of view it waits; back in view it carries on.
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => document.getElementById('liveFrame').getAnimations()[0]?.playState === 'paused');
  await page.locator('.browser').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('liveFrame').getAnimations()[0]?.playState === 'running');
  // Another hotel starts from its own top, at its own length.
  await page.click('.tabs [data-site="hp"]');
  await page.waitForFunction(() => document.getElementById('liveFrame').offsetHeight > 2600);
  await page.frameLocator('#liveFrame').locator('h1', { hasText: 'hp.clickinns.com' }).waitFor();
  await page.waitForFunction(() => document.getElementById('liveFrame').getAnimations()[0]?.playState === 'running');
  assert.equal(await glide(), 'running');
}, { viewport: { width: 1280, height: 860 }, reducedMotion: 'no-preference' }));

test('How does it work? and each But…? lead down the story, one part at a time', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  const order = [['.howlink', 'how'], ['#how .next', 'checked'], ['#checked .next', 'site'], ['#site .next', 'setup'], ['#setup .next', 'cost']];
  for (const [link, section] of order) {
    await page.click(link);
    await page.waitForFunction(id => Math.abs(document.getElementById(id).getBoundingClientRect().top) < 12, section);
  }
  // Sarah's booking answers How does it work?, and each part asks the next question.
  assert.match(await page.locator('#how').innerText(), /11:42 pm, Thursday[\s\S]*Sarah books Room 104 for Friday/i);
  assert.match(await page.locator('#how .logos').innerText(), /Little Hotelier[\s\S]*\+ Yours/);
  assert.match(await page.locator('#how .next').innerText(), /But what if it types something wrong\?/);
  assert.match(await page.locator('#checked .next').innerText(), /But what will my site look like\?/);
  assert.match(await page.locator('#site').innerText(), /Your rooms, live on your own booking site[\s\S]*A few examples/i);
  assert.match(await page.locator('#site .next').innerText(), /But how do I get set up\?/);
  assert.match(await page.locator('#checked').innerText(), /99% accurate[\s\S]*across 257 bookings/);
  // With reduced motion the agent's booking is shown saved.
  assert.equal(await page.locator('#pmsTarget').evaluate(cell => cell.classList.contains('booked')), true);
  assert.match(await page.locator('#pmsCaption').innerText(), /Sarah is in your PMS: Room 104, Friday\./);
}));

test('the agent plays its booking while in view, stops when scrolled away and starts over on return', async () => world(async ({ page, base }) => {
  await page.goto(base + '/engine');
  const status = () => page.locator('#pmsStatus').innerText();
  assert.equal(await status(), 'AI agent ready');
  await page.locator('#pmsDemo').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('pmsStatus').textContent === 'Typing the booking…', null, { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  const stoppedAt = await page.locator('#pfDates').innerText();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#pfDates').innerText(), stoppedAt, 'nothing types while out of view');
  await page.locator('#pmsDemo').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('pmsStatus').textContent === 'Checking availability…', null, { timeout: 3000 });
  await page.waitForFunction(() => document.getElementById('pmsTarget').classList.contains('booked'), null, { timeout: 20000 });
  assert.equal(await page.locator('#pfGuest').innerText(), 'Sarah Lee');
  assert.equal(await page.locator('#pfRoom').innerText(), '104 · Queen');
  assert.equal(await status(), 'Saved · checked twice');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
}, { reducedMotion: 'no-preference' }));

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
  assert.equal(await page.getAttribute('[data-pick="monthly"]', 'aria-checked'), 'true');
  await page.locator('.plans [data-plan="once"]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'email');
  assert.equal(await page.getAttribute('[data-pick="once"]', 'aria-checked'), 'true');
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
  await page.click('[data-pick="monthly"]');
  assert.equal(await page.evaluate(() => window.__stripe.destroyed), 1);
  assert.equal(await page.locator('#detailsForm').isVisible(), true);
  assert.equal(await page.inputValue('#property'), 'Lakeview Inn');
  assert.equal(await page.getAttribute('[data-pick="monthly"]', 'aria-checked'), 'true');
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

test('the one-time ad\'s link lands with $497 picked; both options sit above the email, side by side', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/engine?plan=once&utm_content=123456789');
  assert.equal(await page.getAttribute('[data-pick="once"]', 'aria-checked'), 'true');
  assert.match(await page.locator('#orderFine').innerText(), /\$497 once\. No monthly fees/);
  const picker = await page.locator('.picker').boundingBox(), email = await page.locator('#email').boundingBox();
  assert.ok(picker.y + picker.height <= email.y, 'the choice comes before the email');
  const [a, b] = await Promise.all([page.locator('[data-pick="monthly"]').boundingBox(), page.locator('[data-pick="once"]').boundingBox()]);
  assert.equal(Math.round(a.y), Math.round(b.y), 'side by side');
  // With DM Sans the button fits too (818px of 844); this browser has no web fonts, so only the box is checked.
  assert.ok(email.y + email.height < 844, 'the email box is on the first screen');
  await page.fill('#email', 'owner@lakeview.test');
  await page.click('#emailBtn');
  await fillDetails(page);
  await page.click('#detailsBtn');
  await page.waitForFunction(() => window.__stripe?.mounts === 1);
  assert.equal(creates[0].mode, 'payment');
  await page.goto(base + '/engine');
  assert.equal(await page.getAttribute('[data-pick="monthly"]', 'aria-checked'), 'true', 'the $97 ad lands on $97');
}));
