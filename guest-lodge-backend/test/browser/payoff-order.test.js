'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff, PRODUCT, VERSION } = require('../../payoff');

// Stands in for Stripe.js: the payment fields mount and report ready, every
// amount update and confirmation is recorded in Node (so it survives leaving
// the page), and window.__stripeOutcomes can make a confirmation decline.
const FAKE_STRIPE = `
window.Stripe = function (key) {
  const log = (...args) => window.__stripeRecord && window.__stripeRecord(JSON.parse(JSON.stringify(args)));
  log('init', key);
  return {
    elements(options) {
      log('elements', options.mode, options.amount, options.currency);
      return {
        update(next) { log('update', next.amount); },
        submit: async () => ({}),
        create(type, options) {
          const handlers = {};
          log('create', type, options);
          return { on(name, fn) { handlers[name] = fn; }, mount(selector) {
            const box = document.createElement('div'); box.className = 'fake-' + type; box.textContent = type === 'payment' ? 'Card number' : 'Pay';
            document.querySelector(selector).append(box);
            setTimeout(() => handlers.ready && handlers.ready(type === 'expressCheckout' ? { availablePaymentMethods: { applePay: true, googlePay: false } } : {}), 30);
          } };
        },
      };
    },
    async confirmPayment({ clientSecret, confirmParams }) {
      log('confirm', clientSecret, confirmParams.return_url, confirmParams.payment_method_data || null);
      if ((window.__stripeOutcomes || []).shift() === 'decline') return { error: { type: 'card_error', code: 'card_declined', message: 'Your card was declined.' } };
      return { paymentIntent: { id: clientSecret.split('_secret')[0], status: 'succeeded' } };
    },
  };
};`;
const ACCOUNT = '51AbCdEfGhIjKlMnO';

async function world(fn, { rejectFirst = false, unpaid = false, userAgent = null, embedded = true, outcomes = [] } = {}) {
  const app = express(), creates = [], payments = [], emails = [], rows = new Map();
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
  } }, paymentIntents: {
    create: async (params, options) => {
      payments.push({ params, options });
      await new Promise(resolve => setTimeout(resolve, 100));
      if (rejectFirst) { rejectFirst = false; throw new Error('Stripe unavailable'); }
      const id = 'pi_3BrowserPay' + payments.length;
      return { id, client_secret: id + '_secret_fixture' };
    },
    retrieve: async id => {
      const made = payments[Number(id.replace('pi_3BrowserPay', '')) - 1];
      if (!made) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
      return { object: 'payment_intent', id, status: unpaid ? 'requires_payment_method' : 'succeeded', currency: 'usd', amount_received: made.params.amount,
        livemode: false, receipt_email: made.params.receipt_email, metadata: made.params.metadata };
    },
  } };
  let clockOffset = 0;
  const env = { NODE_ENV: 'test', ...(embedded ? { STRIPE_INSPECT_SECRET_KEY: `sk_test_${ACCOUNT}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${ACCOUNT}abc` } : {}) };
  registerPayoff(app, { now: () => Date.now() + clockOffset, stripe, prisma, mail: { sendMail: async m => emails.push(m) }, env });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(userAgent ? { userAgent } : {}) });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: 'Stripe checkout fixture' }));
    await page.route('https://js.stripe.com/v3/', route => route.fulfill({ body: FAKE_STRIPE, headers: { 'content-type': 'application/javascript' } }));
    if (outcomes.length) await page.addInitScript(list => { window.__stripeOutcomes = list; }, outcomes);
    const stripeCalls = [];
    await page.exposeBinding('__stripeRecord', (_source, args) => stripeCalls.push(args));
    const stripeLog = async () => { await page.waitForTimeout(50).catch(() => {}); return stripeCalls; };
    await fn({ page, base, creates, payments, emails, stripeLog, advanceTime: ms => { clockOffset += ms; } }); assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const ready = page => page.locator('#buy-button:enabled').waitFor();
const fillBuyer = async page => { await page.locator('#name').fill('Test Buyer'); await page.locator('#email').fill('buyer@example.test'); };

test('the order page follows the reference form: two unchecked extras with flashing arrows, the summary, guarantee and proof', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('main .text').first().innerText(), 'Enter your info below to see your Debt-Free Date in the next 5 minutes:');
  assert.deepEqual(await page.locator('.info input').evaluateAll(inputs => inputs.map(input => input.placeholder)), ['Full Name', 'Email Address']);
  assert.match(await page.locator('.product').innerText(), /Marketel Payoff - Your Debt-Free Date & Payoff Plan \(Reg\. \$375\)\s+1\s+\$33\.00/);
  assert.equal(await page.locator('.bump').count(), 2);
  assert.equal(await page.locator('#cashflow').isChecked(), false); assert.equal(await page.locator('#reset').isChecked(), false);
  assert.deepEqual(await page.locator('.bump-headline').allInnerTexts(), ['Plan Around Payday', 'Get A Fresh Start']);
  const look = await page.evaluate(() => {
    const css = selector => getComputedStyle(document.querySelector(selector));
    return { arrow: css('.arrow').animationName, headline: css('.bump-headline').color, oto: [css('.oto').color, css('.oto').textDecorationLine],
      bump: [css('.bump').backgroundColor, css('.bump').borderStyle], button: css('#buy-button').backgroundColor, font: css('.order').fontFamily };
  });
  assert.deepEqual(look, { arrow: 'bump-arrow', headline: 'rgb(0, 153, 0)', oto: ['rgb(204, 51, 0)', 'underline'],
    bump: ['rgb(251, 248, 227)', 'dashed'], button: 'rgb(55, 202, 55)', font: 'Montserrat, sans-serif' });
  assert.equal(await page.locator('#buy-label').innerText(), 'Complete Order');
  assert.equal(await page.locator('.secure').innerText(), '* 100% Secure & Safe Payments *');
  assert.match(await page.locator('#summary-rows').innerText(), /Checkout offer: \$5 off, ends in (29:\d\d|30:00)\s+-\$ 5\.00/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  assert.equal(await page.locator('#only-today').innerText(), 'Only $28 Today!');
  assert.equal(await page.locator('#percent-off').innerText(), '(92% off)');
  assert.equal(await page.locator('.logos img').count(), 5);
  assert.match(await page.locator('.guarantee').innerText(), /30-day money-back guarantee\.\s+One-time payment\. No monthly fees\./);
  assert.equal(await page.locator('img.seal').count(), 1);
  assert.match(await page.locator('.grey .text').innerText(), /Here's what happens when you order today:/);
  assert.equal(await page.locator('.grey s').innerText(), 'Total Value: $375');
  assert.equal(await page.locator('img.proof[src*="/comment-"]').count(), 4);
  assert.equal(await page.locator('.preorder-notice, #preorder-consent, #checkout-offer, #offer-sticky, .software-included, .checkout-value').count(), 0);
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, String(width));
  }
}));
test('Stripe\'s fields charge the extras picked: the amount follows the boxes, one payment per order, then the tool opens', async () => world(async ({ page, base, payments, emails, stripeLog }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'elements'), [['elements', 'payment', 2800, 'usd'], ['elements', 'payment', 2800, 'usd']]);
  const created = (await stripeLog()).filter(entry => entry[0] === 'create');
  assert.deepEqual(created.map(entry => entry[1]), ['payment', 'expressCheckout']);
  assert.deepEqual(created[0][2], { layout: 'tabs', wallets: { link: 'never' }, fields: { billingDetails: { name: 'never', email: 'never' } } });
  assert.equal(await page.locator('#or').isHidden(), false, 'a wallet is available, so OR shows');
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#order-total').innerText(), '$59.00');
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'update').map(entry => entry[1]), [5000, 5000, 5900, 5900]);
  await page.locator('#buy-button').click();
  assert.equal(payments.length, 0, 'nothing is created without a name and email');
  assert.equal(await page.locator('#checkout-status').innerText(), 'Please enter your full name.');
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  await page.locator('#debts:not([hidden])').waitFor();
  assert.equal(payments.length, 1);
  assert.equal(payments[0].params.amount, 5900); assert.equal(payments[0].params.metadata.addons, '["cashflow","reset"]');
  assert.equal(payments[0].params.receipt_email, 'buyer@example.test');
  const confirm = (await stripeLog()).find(entry => entry[0] === 'confirm');
  assert.deepEqual(confirm[3], { billing_details: { name: 'Test Buyer', email: 'buyer@example.test' } });
  assert.equal(confirm[2], base + '/payoff/app');
  assert.equal(await page.isVisible('#tabs'), true);
  assert.ok(await page.evaluate(() => localStorage.getItem('payoff.access')));
  assert.equal(new URL(page.url()).search, '');
  assert.equal(emails.length, 1); assert.match(emails[0].text, /Total paid: \$59\.00/);
}));
test('a declined card says why, keeps the same payment for the retry, and stays on the page', async () => world(async ({ page, base, payments }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("Your card was declined.")').waitFor();
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  assert.equal(await page.locator('#buy-label').innerText(), 'Complete Order');
  assert.ok(page.url().endsWith('/payoff/order'));
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  assert.equal(payments.length, 1, 'the retry confirms the same payment');
}, { outcomes: ['decline'] }));
test('a payment Stripe reports as not paid sends the buyer back to checkout and never opens the tool', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.locator('#opening-back:not([hidden])').waitFor();
  assert.equal(await page.locator('#opening-title').innerText(), 'Your payment didn’t go through');
  assert.equal(await page.locator('#opening-back').getAttribute('href'), '/payoff/order');
  assert.equal(await page.evaluate(() => localStorage.getItem('payoff.access')), null);
  assert.equal(emails.length, 0);
}, { unpaid: true }));
test('when Stripe\'s fields can\'t be used, Complete Order opens Stripe\'s hosted checkout with the extras picked', async () => world(async ({ page, base, creates, payments }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#payment-element').isHidden(), true);
  assert.equal(await page.locator('#or').isHidden(), true);
  await fillBuyer(page);
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(payments.length, 0); assert.equal(creates.length, 1);
  assert.equal(creates[0].params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), 5500);
  assert.equal(creates[0].params.customer_email, 'buyer@example.test');
}, { embedded: false }));
test('hosted checkout failure is retryable; the pick survives a return; cancelling says nothing was charged', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("try again")').waitFor();
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').click(); await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 2);
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#cashflow').isChecked(), true, 'the pick survives a return from Stripe');
  await page.goto(base + '/payoff/order?cancelled=1'); await ready(page);
  assert.match(await page.locator('#checkout-status').innerText(), /not charged/);
  assert.equal(creates.length, 2);
}, { rejectFirst: true, embedded: false }));
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
test("Meta's pixel: PageView on each page, AddToCart once on reaching the order page, InitiateCheckout on paying, with the server's event ids", async () => world(async ({ page, base, payments }) => {
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
  await fillBuyer(page);
  await page.locator('#reset').check();
  await page.locator('#buy-button').click();
  await page.waitForURL('https://payoff.test/payoff/app**');
  const tracked = calls.filter(args => args[0] === 'track');
  assert.equal(tracked.filter(args => args[1] === 'PageView').length, 3, 'sales page, order page, order page again (never the tool)');
  assert.deepEqual(tracked.filter(args => args[1] !== 'PageView').map(args => [args[1], args[2].value, args[3]?.eventID]), [
    ['AddToCart', 33, `payoff-cart.${visitor}`],
    ['InitiateCheckout', 37, `payoff-checkout.${visitor}`],
  ], 'AddToCart once per visitor, then InitiateCheckout');
  // The server gets the click ids, so its copies match the same person.
  const viewed = posts.find(post => post.url.endsWith('/api/payoff/event') && post.body.includes('PayoffOrderViewed'));
  assert.match(JSON.parse(viewed.body).attribution.fbc, /^fb\.1\.\d+\.adclick123$/);
  assert.match(JSON.parse(viewed.body).attribution.sourceUrl, /utm_source=facebook/);
  assert.match(payments[0].params.metadata.fbc, /adclick123$/);
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

test('the checkout offer shows in the summary, survives reload, and ends without resetting the extras', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  await page.locator('#cashflow').check();
  assert.equal(await page.locator('#order-total').innerText(), '$50.00');
  advanceTime(10 * 60000);
  await page.reload(); await ready(page);
  assert.match(await page.locator('#summary-rows').innerText(), /ends in (19:\d\d|20:00)/);
  assert.equal(await page.locator('#order-total').innerText(), '$50.00');
  advanceTime(21 * 60000);
  await page.reload(); await ready(page);
  assert.doesNotMatch(await page.locator('#summary-rows').innerText(), /Checkout offer/);
  assert.equal(await page.locator('#order-total').innerText(), '$55.00');
  assert.equal(await page.locator('#only-today').innerText(), 'Only $33 Today!');
  assert.equal(await page.locator('#percent-off').innerText(), '(91% off)');
}));
for (const delayedTimer of [false, true]) test('expiry while paying asks the buyer to review the total (delayed timer: '+delayedTimer+')', async () => world(async ({ page, base, payments, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  advanceTime(31 * 60000);
  if (delayedTimer) await page.evaluate(() => {
    const original = Date.now; Date.now = () => original() + 31 * 60000;
    document.getElementById('order-form').requestSubmit();
  });
  else await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("Review the updated total")').waitFor();
  assert.equal(await page.locator('#order-total').innerText(), '$33.00');
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  await page.locator('#buy-button').click(); await page.waitForURL(url => url.pathname === '/payoff/app');
  assert.equal(payments.at(-1).params.amount, 3300);
}));

// The first screen is the hook: with the $5 bar and the three-line price (the
// tallest it gets), the button, the guarantee, the stars and who uses it fit
// without scrolling on small phones and inside Facebook's browser.
test('the letter\'s first screen fits everything needed to tap the button, on small phones', async () => world(async ({ page, base }) => {
  for (const [width, height] of [[375, 548], [360, 640], [390, 664], [414, 640]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/payoff');
    await page.locator('#offer-bar:not([hidden])').waitFor();
    await page.locator('.hero .offer-was:not([hidden])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const seen = await page.evaluate(() => Object.fromEntries(['.hero h1', '.hero [data-price]', '.hero .cta', '.hero .offer-terms-line', '.hero .rating-stars', '.hero .rating-label']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    assert.ok(await page.locator('.hero .cta').evaluate(el => el.getBoundingClientRect().height >= 44), 'the button keeps a 44px tap target');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));
test('sales offer blocks show the eligible price without starting the deadline; an expired offer returns to regular price', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer [data-price]:has-text("Today: $28 ($5 off · 15% off)")').first().waitFor();
  assert.equal(await page.locator('.sales-offer').count(), 8);
  // Worded three ways down the page, as in the reference letter.
  // With the extra $5, the sale price is crossed out too.
  assert.deepEqual(await page.locator('.sales-offer').evaluateAll(boxes => boxes.slice(0, 3).map(box => box.innerText.replace(/\s+/g, ' ').trim())), [
    '(Reg. price $375) Today: $33 Today: $28 ($5 off · 15% off) Get My Debt-Free Date One-time purchase. No monthly fees. 30-day money-back guarantee.',
    '(Reg. price $375) Sale Price: $33 Sale Price: $28 ($5 off · 15% off) Get My Debt-Free Date',
    "(Reg. price $375) SALE PRICE: $33 SALE PRICE: $28 That's an extra $5 (15%) off. Get My Debt-Free Date"]);
  assert.equal(await page.locator('.sales-offer .offer-was s').first().evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.equal((await page.locator('#offer-bar').innerText()).replace(/\s+/g, ' ').trim(), '🎁 You’ve got an extra $5 off! Your 30 minutes start at checkout.');
  assert.equal((await page.context().cookies()).filter(c => c.name === 'payoff_checkout_offer').length, 0);
  await page.locator('.sales-offer .cta').first().click();
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer [data-price]:has-text("Today: $28 ($5 off · 15% off)")').first().waitFor();
  await page.locator('#deal-clock:not([hidden])').waitFor();
  assert.match((await page.locator('#offer-bar').innerText()).replace(/\s+/g, ' ').trim(), /^🎉 You got an extra \$5 off! It’s saved for you for (29:\d\d|30:00)$/);
  advanceTime(31 * 60000);
  const previewDone = page.waitForResponse(r => r.url().includes('offer=preview'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await previewDone;
  await page.locator('.sales-offer [data-price]:has-text("Today: $33 (91% off)")').first().waitFor();
  assert.equal(await page.locator('.sales-offer [data-price]').first().innerText(), 'Today: $33 (91% off)');
  assert.equal(await page.locator('.sales-offer [data-offer-anchor]').first().isHidden(), false);
  assert.equal(await page.locator('.sales-offer .offer-was').first().isHidden(), true, 'no crossed-out $33 once the extra $5 ends');
  assert.equal(await page.locator('#offer-bar').isHidden(), true);
}));
test('sales offers retain the regular price and usable checkout when the offer lookup fails', async () => world(async ({ page, base }) => {
  await page.route('**/api/payoff/config?offer=preview', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer .cta').first().waitFor();
  assert.equal(await page.locator('.sales-offer [data-price]').first().innerText(), 'Today: $33 (91% off)');
  await page.locator('.sales-offer .cta').first().click();
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
}));
