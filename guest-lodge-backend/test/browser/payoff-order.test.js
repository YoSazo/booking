'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff, PRODUCT, VERSION } = require('../../payoff');

async function world(fn, { rejectFirst = false, unpaid = false, userAgent = null } = {}) {
  const app = express(), creates = [], emails = [], rows = new Map();
  const paid = { id: 'cs_test_browserOrder123', mode: 'payment', status: 'complete', payment_status: unpaid ? 'unpaid' : 'paid', currency: 'usd', amount_total: 3300, livemode: false,
    metadata: { product: PRODUCT, offerVersion: VERSION, addons: '[]' }, customer_details: { email: 'buyer@example.test' } };
  const prisma = { inspectEvent: {
    upsert: async () => ({}),
    create: async ({ data }) => { if (data.sourceId && rows.has(data.sourceId)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); rows.set(data.sourceId || rows.size, data); },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  const stripe = { coupons: { retrieve: async id => ({ id, valid: true, amount_off: 500, currency: 'usd' }) }, checkout: { sessions: {
    create: async (params, options) => {
      creates.push({ params, options });
      await new Promise(resolve => setTimeout(resolve, 150));
      if (rejectFirst) { rejectFirst = false; throw new Error('Stripe unavailable'); }
      return { url: 'https://checkout.stripe.com/c/pay/cs_test_browser' };
    },
    retrieve: async () => paid,
  } } };
  let clockOffset = 0;
  registerPayoff(app, { now: () => Date.now() + clockOffset, stripe, prisma, mail: { sendMail: async m => emails.push(m) }, env: { NODE_ENV: 'test' } });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(userAgent ? { userAgent } : {}) });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: 'Stripe checkout fixture' }));
    await fn({ page, base, creates, emails, advanceTime: ms => { clockOffset += ms; } }); assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('the order page offers both extras unchecked and opens one Stripe checkout with the ones picked', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order');
  const button = page.locator('#buy-button'); await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('.preorder-notice, #preorder-consent').count(), 0);
  assert.equal(await page.locator('.order-bump').count(), 2);
  assert.equal(await page.locator('#cashflow').isChecked(), false); assert.equal(await page.locator('#reset').isChecked(), false);
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  assert.doesNotMatch(await page.locator('.order-bump').first().innerText(), /preorder|in development/i);
  await button.click(); assert.equal(creates.length, 0);
  await page.locator('#email').fill('buyer@example.test');
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#order-total').innerText(), '$59.00');
  await button.click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 1);
  assert.equal(creates[0].params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), 6400);
  assert.equal(creates[0].params.customer_email, 'buyer@example.test');
  assert.match(creates[0].params.custom_text.submit.message, /opens as soon as you pay/);
}));
test('failed checkout is retryable and reuses its idempotency key; cancelling says nothing was charged', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order'); await page.locator('#buy-button:enabled').waitFor();
  await page.locator('#email').fill('buyer@example.test');
  await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("try again")').waitFor();
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').click(); await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 2);
  await page.goto(base + '/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#cashflow').isChecked(), true, 'the pick survives a return from Stripe');
  await page.goto(base + '/payoff/order?cancelled=1');
  await page.locator('#buy-button:enabled').waitFor();
  assert.match(await page.locator('#checkout-status').innerText(), /not charged/);
  assert.equal(creates.length, 2);
}, { rejectFirst: true }));
test('an older confirmation link confirms the order and opens the tool', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/confirmation?session_id=cs_test_browserOrder123');
  await page.waitForURL(url => url.pathname === '/payoff/app' && !url.search);
  await page.locator('#debts:not([hidden])').waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem('payoff.access')));
  assert.equal(emails.length, 1);
}));
test('unpaid return shows pending confirmation and never invents a purchase', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/confirmation?session_id=cs_test_browserOrder123');
  await page.locator('#confirmation-retry').waitFor();
  assert.equal(await page.locator('#confirmation-heading').innerText(), 'Payment confirmation is pending');
  assert.match(await page.locator('#confirmation-status').innerText(), /do not pay again/);
  assert.equal(emails.length, 0);
  await page.goto(base + '/payoff/app?session_id=cs_test_browserOrder123');
  await page.locator('#opening-retry').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('#opening-title').innerText(), 'Your payment is still confirming');
  assert.equal(await page.locator('#debts').isHidden(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('payoff.access')), null);
}, { unpaid: true }));

// Meta's pixel only loads on the real https site, for a real browser. Serve
// the page from an https test origin, stub Meta's script, and record every
// fbq call in Node so they survive page changes.
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS]';
async function overHttps(page, base, calls) {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.exposeBinding('__pixel', (_source, args) => calls.push(args));
  await page.addInitScript(() => { window.fbq = (...args) => window.__pixel(JSON.parse(JSON.stringify(args))); });
  await page.route('https://connect.facebook.net/**', route => route.fulfill({ status: 200, body: '', headers: { 'content-type': 'application/javascript' } }));
  await page.route('https://payoff.test/**', async route => {
    const request = route.request();
    const response = await page.request.fetch(request.url().replace('https://payoff.test', base), { method: request.method(), headers: request.headers(), data: request.postDataBuffer() || undefined });
    await route.fulfill({ response });
  });
}
test("Meta's pixel: PageView on each page, AddToCart once on reaching the order page, InitiateCheckout at Stripe, with the server's event ids", async () => world(async ({ page, base, creates }) => {
  const calls = [], posts = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push({ url: request.url(), body: request.postData() || '' }); });
  await overHttps(page, base, calls);
  await page.goto('https://payoff.test/payoff?fbclid=adclick123&utm_source=facebook');
  await page.locator('.offer-slot .cta').first().waitFor();
  assert.deepEqual(calls.slice(0, 2), [['init', '1545780930244672'], ['track', 'PageView']]);
  const visitor = await page.evaluate(() => sessionStorage.getItem('payoff.visitor'));
  await page.locator('.offer-slot .cta').first().click();
  await page.waitForURL('https://payoff.test/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  await page.reload();
  await page.locator('#buy-button:enabled').waitFor();
  await page.locator('#email').fill('buyer@example.test');
  await page.locator('#reset').check();
  await page.locator('#buy-button').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  const tracked = calls.filter(args => args[0] === 'track');
  assert.equal(tracked.filter(args => args[1] === 'PageView').length, 3, 'sales page, order page, order page again');
  assert.deepEqual(tracked.filter(args => args[1] !== 'PageView').map(args => [args[1], args[2].value, args[3]?.eventID]), [
    ['AddToCart', 33, `payoff-cart.${visitor}`],
    ['InitiateCheckout', 37, `payoff-checkout.${visitor}`],
  ], 'AddToCart once per visitor, then InitiateCheckout');
  // The server gets the click ids, so its copies match the same person.
  const viewed = posts.find(post => post.url.endsWith('/api/payoff/event') && post.body.includes('PayoffOrderViewed'));
  assert.match(JSON.parse(viewed.body).attribution.fbc, /^fb\.1\.\d+\.adclick123$/);
  assert.match(JSON.parse(viewed.body).attribution.sourceUrl, /utm_source=facebook/);
  assert.match(creates[0].params.metadata.fbc, /adclick123$/);
}, { userAgent: PHONE_UA }));
test("Meta's pixel never loads for the owner, over http, or in the tool", async () => {
  for (const setup of ['owner', 'http', 'tool']) await world(async ({ page, base }) => {
    const facebook = [];
    page.on('request', request => { if (/facebook\.(net|com)/.test(request.url())) facebook.push(request.url()); });
    if (setup !== 'http') {
      await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
      await page.route('https://payoff.test/**', async route => {
        const request = route.request();
        await route.fulfill({ response: await page.request.fetch(request.url().replace('https://payoff.test', base), { method: request.method(), headers: request.headers(), data: request.postDataBuffer() || undefined }) });
      });
    }
    const url = { owner: 'https://payoff.test/payoff/order?notrack=1', http: base + '/payoff/order', tool: 'https://payoff.test/payoff/app' }[setup];
    await page.goto(url);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => typeof window.fbq), 'undefined', setup);
    assert.deepEqual(facebook, [], setup);
  }, { userAgent: PHONE_UA });
});

test('the checkout offer is clear, survives reload, and ends without resetting or changing extras', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  assert.match(await page.locator('#checkout-offer').innerText(), /Save 15% — \$5 off/);
  assert.equal(await page.locator('#offer-price').innerText(), '$28');
  assert.match(await page.locator('#offer-clock').innerText(), /^(29:\d\d|30:00)$/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  await page.locator('#cashflow').check();
  assert.equal(await page.locator('#order-total').innerText(), '$50.00');
  if (process.env.PAYOFF_DISCOUNT_SHOT) await page.screenshot({ path: process.env.PAYOFF_DISCOUNT_SHOT, fullPage: false });
  advanceTime(10 * 60000);
  await page.reload(); await page.locator('#buy-button:enabled').waitFor();
  assert.match(await page.locator('#offer-clock').innerText(), /^(19:\d\d|20:00)$/);
  assert.equal(await page.locator('#order-total').innerText(), '$50.00');
  advanceTime(21 * 60000);
  await page.reload(); await page.locator('#buy-button:enabled').waitFor();
  assert.match(await page.locator('#checkout-offer-heading').innerText(), /offer has ended/);
  assert.equal(await page.locator('#offer-clock-row').isHidden(), true);
  assert.equal(await page.locator('#offer-price').innerText(), '$33');
  assert.equal(await page.locator('#order-total').innerText(), '$55.00');
}));

for (const delayedTimer of [false, true]) test('expiry while continuing to Stripe asks the buyer to review the total (delayed timer: '+delayedTimer+')', async () => world(async ({ page, base, creates, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await page.locator('#buy-button:enabled').waitFor();
  await page.locator('#email').fill('buyer@example.test');
  advanceTime(31 * 60000);
  if (delayedTimer) await page.evaluate(() => {
    const original = Date.now; Date.now = () => original() + 31 * 60000;
    document.getElementById('order-form').requestSubmit();
  });
  else await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("Review the updated total")').waitFor();
  assert.equal(creates.length, 0);
  assert.equal(await page.locator('#order-total').innerText(), '$33.00');
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  await page.locator('#buy-button').click(); await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates[0].params.line_items[0].price_data.unit_amount, 3300);
}));

test('the sticky offer follows scrolling, shows the same red clock, and reviews the actual selected total', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#offer-sticky').isHidden(), true);
  await page.locator('.order-bump').first().evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.locator('#offer-sticky:not([hidden])').waitFor();
  assert.equal(await page.locator('#offer-sticky [data-offer-clock]').innerText(), await page.locator('#offer-clock').innerText());
  assert.equal(await page.locator('#offer-clock').evaluate(el => getComputedStyle(el).color), 'rgb(180, 35, 24)');
  await page.locator('#email').evaluate(el => el.focus({ preventScroll: true }));
  await page.locator('#offer-sticky').waitFor({ state: 'hidden' });
  await page.locator('#email').evaluate(el => el.blur());
  await page.locator('#offer-sticky:not([hidden])').waitFor();
  if (process.env.PAYOFF_STICKY_SHOT) await page.screenshot({ path: process.env.PAYOFF_STICKY_SHOT });
  await page.locator('#offer-sticky-review').click();
  await page.locator('#offer-sticky').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#summary-lines').innerText(), /Regular Payoff price.*\$33.00.*Checkout offer.*−\$5.00.*Payoff after offer.*\$28.00/s);
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#selected-regular-price').innerText(), '$64.00');
  assert.equal(await page.locator('#selected-offer-total').innerText(), '$59.00');
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  advanceTime(31 * 60000); await page.reload(); await page.locator('#buy-button:enabled').waitFor();
  await page.locator('.order-bump').first().evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  assert.equal(await page.locator('#offer-sticky').isHidden(), true);
  assert.equal(await page.locator('.summary-discount').count(), 0);
  assert.equal(await page.locator('#order-total').innerText(), '$64.00');
}));
