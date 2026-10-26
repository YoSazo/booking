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
      if (options.clientSecret) log('elements-intent', options.clientSecret);
      return {
        clientSecret: options.clientSecret,
        update(next) { log('update', next.amount); },
        submit: async () => ({}),
        create(type, options) {
          const handlers = {};
          log('create', type, options);
          window.__stripeHandlers = { ...window.__stripeHandlers, [type]: handlers };
          return { on(name, fn) { handlers[name] = fn; }, mount(selector) {
            const box = document.createElement('div'); box.className = 'fake-' + type; box.textContent = type === 'payment' ? 'Card number' : 'Pay';
            document.querySelector(selector).append(box);
            setTimeout(() => handlers.ready && handlers.ready(type === 'expressCheckout' ? { availablePaymentMethods: { applePay: true, googlePay: false } } : {}), 30);
          } };
        },
      };
    },
    async confirmPayment({ clientSecret, elements, confirmParams }) {
      const secret = clientSecret || elements.clientSecret;
      log('confirm', secret, confirmParams.return_url, confirmParams.payment_method_data || null);
      if ((window.__stripeOutcomes || []).shift() === 'decline') return { error: { type: 'card_error', code: 'card_declined', message: 'Your card was declined.' } };
      return { paymentIntent: { id: secret.split('_secret')[0], status: 'succeeded' } };
    },
    async handleNextAction({ clientSecret }) { log('action', clientSecret); return {}; },
  };
};`;
const ACCOUNT = '51AbCdEfGhIjKlMnO';

async function world(fn, { rejectFirst = false, unpaid = false, userAgent = null, embedded = true, outcomes = [], wallet = null } = {}) {
  const app = express(), creates = [], payments = [], emails = [], rows = new Map(), updates = new Map();
  const paid = { id: 'cs_test_browserOrder123', mode: 'payment', status: 'complete', payment_status: unpaid ? 'unpaid' : 'paid', currency: 'usd', amount_total: 3311, livemode: false,
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
    retrieve: async () => ({ ...paid, metadata: { ...paid.metadata, ...updates.get(paid.id) } }),
    update: async (id, { metadata }) => { updates.set(id, { ...updates.get(id), ...metadata }); return paid; },
  } }, customers: {
    create: async () => ({ id: 'cus_browser1' }),
  }, paymentMethods: {
    // The card the order was paid with, kept on its customer for this visit.
    retrieve: async id => ({ id, type: 'card', customer: 'cus_browser1', card: { wallet: wallet ? { type: wallet } : null } }),
  }, paymentIntents: {
    create: async (params, options) => {
      payments.push({ params, options, created: Math.floor(Date.now() / 1000) });
      await new Promise(resolve => setTimeout(resolve, 100));
      if (rejectFirst) { rejectFirst = false; throw new Error('Stripe unavailable'); }
      const id = 'pi_3BrowserPay' + payments.length;
      if (params.confirm && params.payment_method) return { id, status: 'succeeded', client_secret: id + '_secret_fixture' };
      return { id, client_secret: id + '_secret_fixture' };
    },
    update: async (id, { metadata }) => { updates.set(id, { ...updates.get(id), ...metadata }); return {}; },
    retrieve: async id => {
      const made = payments[Number(id.replace('pi_3BrowserPay', '')) - 1];
      if (!made) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
      return { object: 'payment_intent', id, status: unpaid ? 'requires_payment_method' : 'succeeded', currency: 'usd', amount_received: made.params.amount,
        livemode: false, receipt_email: made.params.receipt_email, metadata: { ...made.params.metadata, ...updates.get(id) }, created: made.created,
        customer: made.params.customer, payment_method: made.params.payment_method || 'pm_browser_card', latest_charge: { refunded: false, amount_refunded: 0 } };
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
    await fn({ page, base, creates, payments, emails, stripeLog, rows, advanceTime: ms => { clockOffset += ms; } }); assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const ready = page => page.locator('#buy-button:enabled').waitFor();
// After paying, the Interest Cutter offer comes first; saying no twice opens Payoff.
const skipOffers = async page => {
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  await page.locator('#stage-offer:not([hidden])').waitFor();
  await page.locator('#offer-no').click();
  await page.locator('#stage-discount:not([hidden])').waitFor();
  await page.locator('#discount-no').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
};
const fillBuyer = async page => { await page.locator('#name').fill('Test Buyer'); await page.locator('#email').fill('buyer@example.test'); };

test('the order page follows the reference: reservation, product, price and safe checkout first, then the labeled form, extras, summary, guarantee and proof', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.deepEqual([await page.locator('.reserve-name').innerText(), await page.locator('.reserve-lead').innerText()], ['Your Debt-Free Date & Payoff Plan', 'Is Reserved For:']);
  assert.match(`${await page.locator('#reserve-minutes').innerText()}:${await page.locator('#reserve-seconds').innerText()}`, /^(05:00|04:5\d)$/);
  assert.equal(await page.locator('.summary-label').innerText(), 'Order Summary');
  assert.equal((await page.locator('.social-proof').innerText()).replace(/\s+/g, ' ').trim(), '★★★★★ 10,000+ sold');
  assert.equal(await page.locator('.social-proof .avatars img').count(), 6);
  assert.equal((await page.locator('.glance-price').innerText()).replace(/\s+/g, ' '), '$33.11 Only 28.11');
  assert.equal(await page.locator('.glance-name').innerText(), 'Your Debt-Free Date & Payoff Plan');
  assert.equal(await page.locator('.glance-value').innerText(), 'Valued at $375');
  assert.equal(await page.locator('#glance-gift').count(), 0);
  assert.deepEqual(await page.locator('.glance .safe-badges > img').evaluateAll(imgs => imgs.map(img => img.alt)), ['AES-256bit encryption', 'SSL certified', 'Powered by Stripe, secure site']);
  assert.equal(await page.locator('.glance-guarantee').getAttribute('alt'), '30-day 100% money back guarantee');
  assert.deepEqual(await page.locator('.section-head').allInnerTexts(), ['---- Contact Details ----', '---- Payment Information ----']);
  assert.deepEqual(await page.locator('.info label').allInnerTexts(), ['Full Name:', 'Email Address:']);
  assert.deepEqual(await page.locator('.info input').evaluateAll(inputs => inputs.map(input => input.placeholder)), ['Full Name', 'Email Address']);
  // Payment comes before the extras, as in the reference.
  const order = await page.evaluate(() => ['#payment-element', '.product', '.bumps', '#order-summary', '#buy-button']
    .map(sel => document.querySelector(sel).getBoundingClientRect().top));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  for (const copy of await page.locator('.bump-copy').allInnerTexts()) assert.match(copy, /^ONE TIME OFFER: .*This is a one-time offer, and you will never see this price again\.$/);
  assert.deepEqual(await page.locator('.bump-price').allInnerTexts(), ['Regular price: $79 Today only $22!', 'Regular price: $49 Today only $9!']);
  assert.equal(await page.locator('.bump-price s').first().evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.match(await page.locator('.product').innerText(), /Marketel Payoff - Your Debt-Free Date & Payoff Plan \(Reg\. \$375\)\s+1\s+\$33\.11/);
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
  assert.equal(await page.locator('#buy-label').innerText(), 'Get My Debt-Free Date');
  assert.equal(await page.locator('.buy-text small').innerText(), 'OPENS RIGHT AFTER YOU PAY');
  assert.equal(await page.locator('.secure').innerText(), '* 100% Secure & Safe Payments *');
  assert.match(await page.locator('#summary-rows').innerText(), /Discount\s+-\$ 5\.00/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  assert.equal(await page.locator('#only-today').innerText(), 'Only $28.11 Today!');
  assert.equal(await page.locator('#percent-off').innerText(), '(92% off)');
  assert.equal(await page.locator('.logos img').count(), 5);
  assert.match(await page.locator('.guarantee').innerText(), /30-day money-back guarantee\.\s+One-time payment\. No monthly fees\./);
  assert.equal(await page.locator('img.seal').count(), 1);
  assert.equal(await page.locator('main > .safe').count(), 1, 'the safe-checkout box repeats under the button');
  assert.equal(await page.locator('#offer-bar').count(), 0);
  assert.match((await page.locator('footer.legal').innerText()).replace(/\s+/g, ' '), /Terms & Conditions \| Privacy Policy Copyright 2026 Marketel\. All Rights Reserved\./);
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
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'elements'), [['elements', 'payment', 2811, 'usd'], ['elements', 'payment', 2811, 'usd']]);
  const created = (await stripeLog()).filter(entry => entry[0] === 'create');
  assert.deepEqual(created.map(entry => entry[1]), ['payment', 'expressCheckout']);
  assert.deepEqual(created[0][2], { layout: 'tabs', paymentMethodOrder: ['card', 'us_bank_account', 'klarna'], wallets: { link: 'never' }, fields: { billingDetails: { name: 'never', email: 'never' } } });
  assert.equal(await page.locator('#or').isHidden(), false, 'a wallet is available, so OR shows');
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#order-total').innerText(), '$59.11');
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'update').map(entry => entry[1]), [5011, 5011, 5911, 5911]);
  await page.locator('#buy-button').click();
  assert.equal(payments.length, 0, 'nothing is created without a name and email');
  // What's missing shows under each field, the page brings the fields into view, and each message clears once filled in.
  assert.equal(await page.locator('#name-error').innerText(), 'Enter your full name to continue.');
  assert.equal(await page.locator('#email-error').innerText(), 'Enter a valid email to continue.');
  assert.equal(await page.locator('#checkout-status').innerText(), 'Add your name and email above to continue.');
  const nameOnScreen = () => page.evaluate(() => { const box = document.getElementById('name').getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; });
  for (let i = 0; i < 40 && !(await nameOnScreen()); i++) await page.waitForTimeout(50);
  assert.equal(await nameOnScreen(), true, 'the page scrolls the fields into view');
  assert.ok(!['name', 'email'].includes(await page.evaluate(() => document.activeElement?.id || '')), 'no text field is focused, so the keyboard stays closed');
  assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
  await page.locator('#name').fill('Test Buyer');
  assert.equal(await page.locator('#name-error').isHidden(), true);
  assert.equal(await page.locator('#email-error').isVisible(), true);
  await page.locator('#email').fill('buyer@');
  assert.equal(await page.locator('#email-error').isVisible(), true, 'not until the email is valid');
  await page.locator('#email').fill('buyer@example.test');
  assert.equal(await page.locator('#email-error').isHidden(), true);
  assert.equal(await page.locator('#checkout-status').innerText(), '');
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await skipOffers(page);
  await page.locator('#debts:not([hidden])').waitFor();
  assert.equal(payments.length, 1);
  assert.equal(payments[0].params.amount, 5911); assert.equal(payments[0].params.metadata.addons, '["cashflow","reset"]');
  assert.equal(payments[0].params.receipt_email, 'buyer@example.test');
  const confirm = (await stripeLog()).find(entry => entry[0] === 'confirm');
  assert.deepEqual(confirm[3], { billing_details: { name: 'Test Buyer', email: 'buyer@example.test' } });
  assert.equal(confirm[2], base + '/payoff/upgrade');
  assert.equal(await page.isVisible('#tabs'), true);
  assert.ok(await page.evaluate(() => localStorage.getItem('payoff.access')));
  assert.equal(new URL(page.url()).search, '');
  assert.equal(emails.length, 1); assert.match(emails[0].text, /Total paid: \$59\.11/);
}));
test('a declined card says why, keeps the same payment for the retry, and stays on the page', async () => world(async ({ page, base, payments }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("Your card was declined.")').waitFor();
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  assert.equal(await page.locator('#buy-label').innerText(), 'Get My Debt-Free Date');
  assert.ok(page.url().endsWith('/payoff/order'));
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  assert.equal(payments.length, 1, 'the retry confirms the same payment');
}, { outcomes: ['decline'] }));
test('the order page records how far each visitor gets toward paying, by step name only, once each', async () => world(async ({ page, base, rows }) => {
  const steps = () => [...rows.values()].filter(row => row.name === 'PayoffOrder').map(row => row.detail);
  const until = async want => { for (let i = 0; i < 40 && !want.every(step => steps().includes(step)); i++) await page.waitForTimeout(50); };
  await page.goto(base + '/payoff/order');
  await ready(page);
  await until(['stripe-ready', 'wallet-shown']);
  assert.ok(!steps().includes('saw-button'), 'the button is below the first screen on phones');
  await page.locator('#buy-button').click();
  await until(['missing-name']);
  await page.locator('#order-form').scrollIntoViewIfNeeded();
  await page.locator('#name').fill('Test Buyer'); await page.locator('#name').dispatchEvent('change');
  await page.locator('#email').fill('not-an-email'); await page.locator('#email').dispatchEvent('change');
  await page.waitForTimeout(150);
  assert.ok(!steps().includes('email'), 'only a valid email counts');
  await page.locator('#email').fill('buyer@example.test'); await page.locator('#email').dispatchEvent('change');
  await page.evaluate(() => { const change = window.__stripeHandlers.payment.change; change({ empty: false, complete: false, value: { type: 'card' } }); change({ empty: false, complete: true, value: { type: 'card' } }); change({ empty: true, complete: false, value: { type: 'klarna' } }); });
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').scrollIntoViewIfNeeded();
  await page.locator('#buy-button').click();
  await until(['saw-form', 'name', 'email', 'card-start', 'card-done', 'method-klarna', 'addon-cashflow', 'saw-addons', 'saw-button', 'declined']);
  await page.locator('#email').dispatchEvent('change');
  await page.waitForTimeout(150);
  assert.deepEqual(steps().filter(step => !step.startsWith('time')).sort(), ['addon-cashflow', 'card-done', 'card-start', 'declined', 'email', 'method-klarna', 'missing-email', 'missing-name', 'name', 'saw-addons', 'saw-button', 'saw-form', 'stripe-ready', 'wallet-shown'].sort());
  assert.ok(![...rows.values()].some(row => JSON.stringify(row).includes('example.test') || JSON.stringify(row).includes('Test Buyer')), 'step names, never what they typed');
}, { userAgent: PHONE_UA, outcomes: ['decline'] }));
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
test('when Stripe\'s fields can\'t be used, the button opens Stripe\'s hosted checkout with the extras picked', async () => world(async ({ page, base, creates, payments }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#payment-element').isHidden(), true);
  assert.equal(await page.locator('#or').isHidden(), true);
  await fillBuyer(page);
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(payments.length, 0); assert.equal(creates.length, 1);
  assert.equal(creates[0].params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), 5511);
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
  await page.waitForURL('https://payoff.test/payoff/upgrade**');
  await page.locator('#stage-offer:not([hidden])').waitFor();
  const tracked = calls.filter(args => args[0] === 'track');
  assert.equal(tracked.filter(args => args[1] === 'PageView').length, 3, 'sales page, order page, order page again (never the offer page or the tool)');
  assert.deepEqual(tracked.filter(args => args[1] !== 'PageView').map(args => [args[1], args[2].value, args[3]?.eventID]), [
    ['AddToCart', 33.11, `payoff-cart.${visitor}`],
    ['InitiateCheckout', 37.11, `payoff-checkout.${visitor}`],
  ], 'AddToCart once per visitor, then InitiateCheckout');
  assert.deepEqual(calls.filter(args => args[0] === 'trackCustom').map(args => [args[1], args[2].value, args[3]?.eventID]),
    [['StartedPaying', 33.11, `payoff-started.${visitor}`]], 'a valid email is the first step of paying');
  const started = posts.find(post => post.url.endsWith('/api/payoff/event') && post.body.includes('"detail":"email"'));
  assert.match(JSON.parse(started.body).attribution.fbc, /^fb\.1\.\d+\.adclick123$/);
  assert.ok(!started.body.includes('buyer@example.test'), 'never the email itself');
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

const reserveClock = async page => `${await page.locator('#reserve-minutes').innerText()}:${await page.locator('#reserve-seconds').innerText()}`;
test('the discount survives reload; the reservation clock carries on through a reload, stays at 00:00, and the next load after that starts a new 05:00', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.match(await reserveClock(page), /^(05:00|04:5\d)$/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  await page.locator('#cashflow').check();
  assert.equal(await page.locator('#order-total').innerText(), '$50.11');
  // Two minutes in, a reload carries on instead of starting over.
  await page.evaluate(() => localStorage.setItem('payoff.reserveEnd', String(Date.now() + 2 * 60000 + 30000)));
  await page.reload(); await ready(page);
  assert.match(await reserveClock(page), /^(02:30|02:2\d)$/, 'a reload carries on');
  assert.match(await page.locator('#summary-rows').innerText(), /Discount/);
  assert.equal(await page.locator('#order-total').innerText(), '$50.11');
  // At 00:00 it stays there, and the total and extras do not change.
  await page.evaluate(() => { const original = Date.now; Date.now = () => original() + 3 * 60000; });
  await page.waitForTimeout(1300);
  assert.equal(await reserveClock(page), '00:00');
  await page.waitForTimeout(1100);
  assert.equal(await reserveClock(page), '00:00', 'it stays at 00:00');
  assert.equal(await page.locator('#order-total').innerText(), '$50.11');
  assert.equal(await page.locator('#cashflow').isChecked(), true);
  assert.equal(await page.locator('#glance-gift').count(), 0);
  // The next load after 00:00 starts a new five minutes.
  await page.evaluate(() => localStorage.setItem('payoff.reserveEnd', String(Date.parse('2026-01-01T00:00:00Z'))));
  await page.reload(); await ready(page);
  assert.match(await reserveClock(page), /^(05:00|04:5\d)$/, 'a new five minutes');
  advanceTime(31 * 60000);
  await page.reload(); await ready(page);
  assert.match(await page.locator('#summary-rows').innerText(), /Discount/);
  assert.equal(await page.locator('#order-total').innerText(), '$50.11');
  assert.equal(await page.locator('#only-today').innerText(), 'Only $28.11 Today!');
}));
for (const delayedTimer of [false, true]) test('days later the buyer still pays $28.11: the reservation never ends the gift (delayed timer: '+delayedTimer+')', async () => world(async ({ page, base, payments, advanceTime }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  advanceTime(3 * 24 * 60 * 60000);
  if (delayedTimer) await page.evaluate(() => {
    const original = Date.now; Date.now = () => original() + 3 * 24 * 60 * 60000;
    document.getElementById('order-form').requestSubmit();
  });
  else await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  assert.equal(payments.at(-1).params.amount, 2811);
}));
// Price and refund reassurance stay prominent together above the fields.
test('the order page puts its large final price and compact guarantee together on phones', async () => world(async ({ page, base }) => {
  for (const [width, height] of [[375, 667], [390, 664], [390, 844], [414, 736]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/payoff/order'); await ready(page);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('.glance-price').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 32));
    const positions = await page.evaluate(() => ['.glance-price', '.glance-guarantee', '.glance .safe', '#order-form'].map(sel => document.querySelector(sel).getBoundingClientRect().top));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    const seen = await page.evaluate(() => Object.fromEntries(['#reserve-clock', '.summary-label', '.glance-image', '.glance-price']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));

// Include reduced viewport heights to account for in-app browser controls.
test('small phones show the price, action, checkout proof row and start of Amanda’s review without scrolling', async () => world(async ({ page, base }) => {
  for (const [width, height] of [[320, 568], [375, 548], [360, 640], [390, 600], [390, 664], [390, 844], [414, 640]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/payoff');
    await page.locator('.hero .offer-was:not([hidden])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('.hero [data-price]').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 32), 'the final price is larger than body text');
    assert.equal(await page.locator('.hero .offer-guarantee').getAttribute('alt'), '30-day money-back guarantee');
    assert.match(await page.locator('.hero .offer-terms-line').innerText(), /30-day money-back guarantee/);
    assert.equal(await page.locator('.hero .rating-label').innerText(), '10,000+ sold');
    assert.equal(await page.locator('.hero .avatars img').count(), 6);
    const seen = await page.evaluate(() => Object.fromEntries(['.hero h1', '.hero [data-price]', '.hero .cta', '.hero .offer-guarantee', '.hero .hero-social-proof']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    assert.ok(await page.evaluate(() => {
      const action = document.querySelector('.hero .cta').getBoundingClientRect();
      const badge = document.querySelector('.hero .offer-guarantee').getBoundingClientRect();
      const proof = document.querySelector('.hero .hero-social-proof').getBoundingClientRect();
      return action.bottom <= badge.top && badge.bottom <= proof.top;
    }), 'the compact badge stays between the button and the customer proof row');
    const review = await page.locator('.hero [data-proof=early] img').first().evaluate(el => ({ top: el.getBoundingClientRect().top, alt: el.alt }));
    assert.equal(review.alt, 'Testimonial from Amanda');
    assert.ok(review.top + 80 <= height, `${width}x${height}: at least 80px of Amanda's review is visible (starts at ${review.top})`);
    assert.ok(await page.locator('.hero .cta').evaluate(el => el.getBoundingClientRect().height >= 56), 'the button keeps a large tap target');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));
test('sales offer blocks show the discounted price without gift wording or a reservation timer', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer [data-price]:has-text("Only 28.11")').first().waitFor();
  assert.equal(await page.locator('.sales-offer').count(), 8);
  for (const [index, offer] of (await page.locator('.sales-offer').allInnerTexts()).entries()) {
    const assurance = index === 0 ? 'Instant access · 30-day money-back guarantee.' : 'Opens right after you pay.';
    assert.equal(offer.replace(/\s+/g, ' ').trim(), '(Reg. price $375) $33.11 Only 28.11 USD · One-time payment. No monthly fees. Get My Debt-Free Date ' + assurance);
  }
  assert.equal(await page.locator('.offer-guarantee[alt="30-day money-back guarantee"]').count(), 8);
  assert.equal(await page.locator('.sales-offer .offer-was s').first().evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.equal(await page.locator('#offer-bar').count(), 0, 'the letter has no bar; the clock is on the order page');
  assert.equal((await page.context().cookies()).filter(c => c.name === 'payoff_checkout_offer').length, 0);
  await page.locator('.sales-offer .cta').first().click();
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer [data-price]:has-text("Only 28.11")').first().waitFor();
  advanceTime(31 * 60000);
  const previewDone = page.waitForResponse(r => r.url().includes('offer=preview'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await previewDone;
  await page.waitForTimeout(100);
  assert.equal((await page.locator('.sales-offer [data-price]').first().innerText()).replace(/\s+/g, ' '), 'Only 28.11');
  assert.equal(await page.locator('.sales-offer .offer-was').first().isHidden(), false, 'the crossed-out $33.11 stays');
  assert.match((await page.locator('footer').innerText()).replace(/\s+/g, ' '), /Terms & Conditions \| Privacy Policy Copyright 2026 Marketel\. All Rights Reserved\./);
}));
test('sales offers retain the regular price and usable checkout when the offer lookup fails', async () => world(async ({ page, base }) => {
  await page.route('**/api/payoff/config?offer=preview', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto(base + '/payoff');
  await page.locator('.sales-offer .cta').first().waitFor();
  assert.equal((await page.locator('.sales-offer [data-price]').first().innerText()).replace(/\s+/g, ' '), 'Only 33.11');
  await page.locator('.sales-offer .cta').first().click();
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
}));

// The Interest Cutter, offered right after paying.
const payThenOffer = async (page, base) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  await page.locator('#stage-offer:not([hidden])').waitFor();
};
const text = async (page, selector) => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
test('after paying, YES on the 107 offer charges the card from the order in one click, and Payoff opens on the Interest Cutter tab', async () => world(async ({ page, base, payments, emails }) => {
  await payThenOffer(page, base);
  assert.equal(await text(page, '#offer-headline'), 'WAIT! Your plan isn’t complete yet...');
  assert.equal(await text(page, '#stage-offer .up-price'), '$147 Today Only 107 Save 40');
  assert.equal(await page.locator('#stage-offer .up-price s').evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.equal(await page.locator('#offer-price').evaluate(el => getComputedStyle(el).color), 'rgb(0, 153, 0)', 'the price they pay is green, with no $');
  assert.match(await page.locator('#offer-clock').innerText(), /^(02:00|01:5\d)$/);
  assert.equal(await text(page, '#offer-one-click'), 'ONE CLICK. NO CARD TO RE-ENTER.');
  assert.equal(await text(page, '#offer-no'), 'No thanks, I’ll keep paying full interest');
  assert.equal(await page.locator('#offer-no').evaluate(el => getComputedStyle(el).color), 'rgb(154, 154, 154)', 'the no is muted');
  assert.equal(await page.locator('.social-proof .avatars img').count(), 6);
  assert.match(await text(page, '.up-example'), /Example: \$65,000 of debt, \$1,350 a month .*Saves \$22,710 after fees .*An example, not your numbers/);
  // Real buyers' emails, right under the button, with results qualified.
  assert.deepEqual(await page.locator('.up-proof img').evaluateAll(imgs => imgs.map(img => img.alt.split(':')[0])), ['Email from Melissa', 'Email from Sarah']);
  assert.match(await text(page, '.up-proof .up-note'), /^Individual results vary\./);
  const below = await page.evaluate(() => document.querySelector('.up-proof').getBoundingClientRect().top >= document.querySelector('#offer-yes').getBoundingClientRect().bottom);
  assert.equal(below, true, 'the testimonials follow the YES button, which stays on the first screen');
  await page.locator('#offer-yes').click();
  await page.locator('#stage-done:not([hidden])').waitFor();
  const charge = payments.at(-1).params;
  assert.equal(charge.amount, 10700); assert.equal(charge.payment_method, 'pm_browser_card'); assert.equal(charge.customer, 'cus_browser1');
  assert.equal(charge.confirm, true); assert.equal(charge.metadata.parentOrder, 'pi_3BrowserPay1'); assert.equal(charge.metadata.offer, 'offer');
  assert.equal(payments[0].params.customer, 'cus_browser1');
  assert.deepEqual(payments[0].params.payment_method_options, { card: { setup_future_usage: 'on_session' } });
  assert.ok(emails.some(mail => mail.subject === 'Your Interest Cutter is ready'));
  await page.locator('#done-open').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  await page.locator('#cutter:not([hidden])').waitFor();
  assert.equal(await page.locator('#cutter-tool').isHidden(), false, 'the tool, not the locked preview');
  assert.equal(await page.locator('#tabs button[data-tab="cutter"]').getAttribute('aria-current'), 'page');
  // The tool: its comparison waits for debts, the three scripts, and the promo tracker.
  assert.equal(await page.locator('#cutter-needs-debts').isHidden(), false);
  assert.deepEqual(await page.locator('.cutter-script summary').allInnerTexts(), ['Ask for a lower interest rate', 'Ask for a late fee to be refunded', 'Ask about a hardship program']);
  await page.locator('#cutter-promo-name').fill('Citi transfer card');
  await page.locator('#cutter-promo-end').fill('2028-04-01');
  await page.locator('#cutter-promo-rate').fill('24.99');
  await page.locator('#cutter-promo-form button[type="submit"]').click();
  assert.match(await text(page, '#cutter-promos'), /^Citi transfer card Ends Apr 1, 2028 · then 24\.99% \d+ days left Remove$/);
  assert.match(await text(page, '#cutter-disclaimer'), /nothing here guarantees they will/);
}));
test('the 107 offer moves to the 47 discount when its clock ends; the discount ends the same way, Payoff opens, and the offer never comes back', async () => world(async ({ page, base, payments }) => {
  await payThenOffer(page, base);
  await page.evaluate(() => { const original = Date.now; Date.now = () => original() + 2 * 60000 + 2000; });
  await page.locator('#stage-discount:not([hidden])').waitFor({ timeout: 4000 });
  assert.equal(await text(page, '#discount-headline'), 'I get it. Money’s tight right now.');
  assert.match(await text(page, '#discount-lead'), /^That’s exactly why you’re paying off debt\..*one lowered rate could save you more than it costs\.$/);
  assert.equal(await text(page, '#stage-discount .up-price'), '$107 Today Only 47');
  assert.match(await page.locator('#discount-clock').innerText(), /^(02:00|01:5\d)$/);
  assert.equal(await text(page, '#discount-no'), 'No thanks, take me to my plan');
  await page.evaluate(() => { const original = Date.now; Date.now = () => original() + 2 * 60000 + 2000; });
  await page.waitForURL(url => url.pathname === '/payoff/app', { timeout: 4000 });
  assert.equal(payments.length, 1, 'nothing was charged for the Interest Cutter');
  await page.goto(base + '/payoff/upgrade?payment_intent=pi_3BrowserPay1');
  await page.waitForURL(url => url.pathname === '/payoff/app');
}));
test('an Apple Pay order pays for the Interest Cutter in the pop-up form, at 47 after saying no to 107', async () => world(async ({ page, base, payments }) => {
  await payThenOffer(page, base);
  assert.equal(await text(page, '#offer-one-click'), 'PAY WITH APPLE PAY, GOOGLE PAY OR A CARD.', 'never claims one click for a wallet');
  await page.locator('#offer-no').click();
  await page.locator('#stage-discount:not([hidden])').waitFor();
  await page.locator('#discount-yes').click();
  await page.locator('#pay-sheet:not([hidden])').waitFor();
  assert.equal(await text(page, '#pay-amount'), 'Today Only 47');
  await page.locator('#pay-button:enabled').waitFor();
  assert.equal(await page.locator('#pay-or').isHidden(), false, 'Apple Pay sits above the card form');
  const form = payments.at(-1).params;
  assert.equal(form.amount, 4700); assert.deepEqual(form.automatic_payment_methods, { enabled: true }); assert.equal(form.payment_method, undefined);
  await page.locator('#pay-button').click();
  await page.locator('#stage-done:not([hidden])').waitFor();
  assert.equal(await page.locator('#pay-sheet').isHidden(), true);
}, { wallet: 'apple_pay' }));
test('inside Payoff, the locked Interest Cutter tab leads to the 147 page, with no clock, and buying it unlocks the tool', async () => world(async ({ page, base, payments }) => {
  await payThenOffer(page, base);
  await page.locator('#offer-no').click(); await page.locator('#stage-discount:not([hidden])').waitFor();
  await page.locator('#discount-no').click(); await page.waitForURL(url => url.pathname === '/payoff/app');
  await page.locator('#tabs button[data-tab="cutter"]').click();
  await page.locator('#cutter-locked:not([hidden])').waitFor();
  assert.equal(await text(page, '#cutter-buy'), 'Get the Interest Cutter, $147');
  assert.equal(await page.locator('#cutter-buy').getAttribute('href'), '/payoff/upgrade?offer=regular');
  await page.locator('#cutter-buy').click();
  await page.locator('#stage-offer:not([hidden])').waitFor();
  assert.equal(await text(page, '#stage-offer .up-price'), 'Today Only 147');
  assert.equal(await page.locator('#offer-clock-row').isHidden(), true, 'the regular price has no clock');
  assert.equal(await text(page, '#offer-one-click'), 'PAY WITH APPLE PAY, GOOGLE PAY OR A CARD.');
  await page.locator('#offer-yes').click();
  await page.locator('#pay-sheet:not([hidden])').waitFor();
  assert.equal(payments.at(-1).params.amount, 14700); assert.equal(payments.at(-1).params.metadata.offer, 'regular');
  assert.equal(payments.at(-1).params.payment_method, undefined, 'a later visit pays in the form, never with the card kept from the order');
  await page.locator('#pay-button:enabled').waitFor();
  await page.locator('#pay-button').click();
  await page.locator('#stage-done:not([hidden])').waitFor();
  await page.locator('#done-open').click();
  await page.locator('#cutter-tool:not([hidden])').waitFor();
}));
test('the offer page shows the clock, the price and the YES button on the first screen of phones', async () => world(async ({ page, base }) => {
  await payThenOffer(page, base);
  for (const [width, height] of [[375, 667], [390, 664], [390, 844], [414, 736]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    const seen = await page.evaluate(() => Object.fromEntries(['#offer-headline', '#offer-clock-row', '.up-example', '.up-price', '#offer-yes']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));
