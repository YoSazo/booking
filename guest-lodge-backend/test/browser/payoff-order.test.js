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
          return { on(name, fn) { handlers[name] = fn; }, update(next) { log('element-update', type, next); }, mount(selector) {
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
  const subscribes = [], subscriptions = new Map(), coachAsks = [];
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
    retrieve: async id => {
      // Stripe's checkout for the Coach, finished: its subscription has started.
      if (id.startsWith('cs_test_coach')) {
        const made = creates.filter(create => create.params.mode === 'subscription').at(-1);
        const subscription = { object: 'subscription', id: 'sub_browserHosted01', status: 'active', customer: 'cus_browser1', metadata: made.params.subscription_data.metadata };
        subscriptions.set(subscription.id, subscription);
        return { id, mode: 'subscription', status: 'complete', subscription: subscription.id, metadata: made.params.metadata };
      }
      return { ...paid, metadata: { ...paid.metadata, ...updates.get(paid.id) } };
    },
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
  }, prices: {
    list: async () => ({ data: [] }),
    create: async params => ({ id: 'price_' + params.lookup_key, ...params }),
  }, products: {
    retrieve: async () => { throw Object.assign(new Error('missing'), { code: 'resource_missing' }); },
    create: async params => ({ id: params.id }),
  }, subscriptions: {
    create: async params => {
      subscribes.push(params);
      const made = { object: 'subscription', id: 'sub_browserCoach' + String(subscribes.length).padStart(2, '0'), status: 'active', customer: params.customer, metadata: params.metadata };
      subscriptions.set(made.id, made); return made;
    },
    retrieve: async id => { if (!subscriptions.has(id)) throw Object.assign(new Error('missing'), { code: 'resource_missing' }); return subscriptions.get(id); },
    cancel: async id => subscriptions.get(id),
  }, billingPortal: { sessions: { create: async () => ({ url: 'https://billing.stripe.com/p/session/browser' }) } } };
  // The Coach's model, answering in order.
  const coachClient = { responses: { create: async params => { coachAsks.push(params); return { output: [{ type: 'message' }], output_text: `Answer ${coachAsks.length}: put any extra on your highest rate first.` }; } } };
  let clockOffset = 0;
  const env = { NODE_ENV: 'test', ...(embedded ? { STRIPE_INSPECT_SECRET_KEY: `sk_test_${ACCOUNT}xyz`, STRIPE_INSPECT_PUBLISHABLE_KEY: `pk_test_${ACCOUNT}abc` } : {}) };
  registerPayoff(app, { now: () => Date.now() + clockOffset, stripe, prisma, mail: { sendMail: async m => emails.push(m) }, env, coachClient });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(userAgent ? { userAgent } : {}) });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: 'Stripe checkout fixture' }));
    await page.route('https://billing.stripe.com/**', route => route.fulfill({ body: 'Stripe billing portal fixture' }));
    await page.route('https://js.stripe.com/v3/', route => route.fulfill({ body: FAKE_STRIPE, headers: { 'content-type': 'application/javascript' } }));
    if (outcomes.length) await page.addInitScript(list => { window.__stripeOutcomes = list; }, outcomes);
    const stripeCalls = [];
    await page.exposeBinding('__stripeRecord', (_source, args) => stripeCalls.push(args));
    const stripeLog = async () => { await page.waitForTimeout(50).catch(() => {}); return stripeCalls; };
    await fn({ page, base, creates, payments, emails, stripeLog, rows, subscribes, coachAsks, advanceTime: ms => { clockOffset += ms; } }); assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const ready = page => page.locator('#buy-button:enabled').waitFor();
// After paying, the Coach offer comes first; "No thanks" opens Payoff.
const skipOffers = async page => {
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  await page.locator('#stage-offer:not([hidden])').waitFor();
  await page.locator('#offer-no').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
};
const fillBuyer = async page => { await page.locator('#name').fill('Test Buyer'); await page.locator('#email').fill('buyer@example.test'); };

test('the order page: one first screen with the product and price, why today, both ways to pay and the refund, then the labeled form with the order and both add-ons above the card fields, summary, guarantee and proof', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.match((await page.locator('.reserve-line').innerText()).replace(/\s+/g, ' '), /^Your plan is reserved for (05:00|04:5\d)$/);
  assert.equal(await page.locator('.glance-name').innerText(), 'Your Debt-Free Date & Payoff Plan');
  assert.equal((await page.locator('.glance-price').innerText()).replace(/\s+/g, ' '), '$375 28.11 · one time', 'the $375 anchor, and no $ on the price they pay');
  assert.equal(await page.locator('.glance-price s').evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.equal((await page.locator('.social-proof').innerText()).replace(/\s+/g, ' ').trim(), '★★★★★ 10,000+ sold');
  assert.equal(await page.locator('.social-proof .avatars img').count(), 6);
  assert.equal((await page.locator('.why').innerText()).replace(/\s+/g, ' '),
    'Your minimum shrinks every month. That’s the trap. Pay less, owe longer: the “Minimum Payment Warning” box on your statement shows how many years. Payoff keeps your payment the same and points it in the right order, so you’re out years sooner. If it doesn’t…');
  assert.equal(await page.locator('#to-card').innerText(), 'Pay by card ↓');
  assert.equal((await page.locator('.refund').innerText()).replace(/\s+/g, ' ').trim(), '✓ No sooner debt-free date? Full refund. Email us within 30 days and you get every cent back. No questions.');
  assert.match(await page.locator('.glance-quote').innerText(), /^“It told me what to focus on first, what to pay each month, and when I should be done\.” ★★★★★ Amanda$/);
  assert.equal(await page.locator('#glance-gift').count(), 0);
  assert.deepEqual(await page.locator('.glance .safe-badges > img').evaluateAll(imgs => imgs.map(img => img.alt)), ['AES-256bit encryption', 'SSL certified', 'Powered by Stripe, secure site']);
  assert.deepEqual(await page.locator('.section-head').allInnerTexts(), ['---- Contact Details ----', '---- Payment Information ----']);
  assert.deepEqual(await page.locator('.info label').allInnerTexts(), ['Full Name:', 'Email Address:']);
  assert.deepEqual(await page.locator('.info input').evaluateAll(inputs => inputs.map(input => input.placeholder)), ['Full Name', 'Email Address']);
  // The reference checkout's order: contact details, the order, the add-ons, then the card fields and the button.
  const order = await page.evaluate(() => ['#email', '.product', '.bumps', '#payment-element', '#order-summary', '#buy-button']
    .map(sel => document.querySelector(sel).getBoundingClientRect().top));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal(await page.locator('.bump').count(), 2);
  // Laid out like the reference checkout's boxes: headline, offer line, question, what it does, three ticks, price, picture.
  assert.deepEqual(await page.locator('.bump-headline').allInnerTexts(), ['Simplify Your Budget', 'Get An Instant Financial Reset']);
  assert.deepEqual(await page.locator('.bump .oto').allInnerTexts(), ['ONE TIME OFFER: Add On The Cash-Flow Calendar - $22 Today Only (Reg. $79)', 'ONE TIME OFFER: Add On The Spending Reset - $9 Today Only (Reg. $49)']);
  assert.deepEqual(await page.locator('.bump-q').allInnerTexts(), ['Want more confidence with your money month-to-month?', 'Need a little breathing room while you get started?']);
  assert.deepEqual(await page.locator('.bump').evaluateAll(boxes => boxes.map(box => box.querySelectorAll('.bump-ticks li').length)), [3, 3]);
  assert.deepEqual(await page.locator('.bump-price').allInnerTexts(), ['Regular price: $79 Today only $22!', 'Regular price: $49 Today only $9!']);
  assert.equal(await page.locator('.bump-price s').first().evaluate(el => getComputedStyle(el).textDecorationLine), 'line-through');
  assert.equal(await page.locator('#cashflow').isChecked(), false); assert.equal(await page.locator('#reset').isChecked(), false);
  const bumpLook = await page.evaluate(() => { const css = sel => getComputedStyle(document.querySelector(sel));
    return { arrow: [document.querySelectorAll('.bump-head .arrow').length, css('.arrow').animationName], headline: css('.bump-headline').color, oto: [css('.oto').color, css('.oto').textDecorationLine], bump: [css('.bump').backgroundColor, css('.bump').borderStyle] }; });
  assert.deepEqual(bumpLook, { arrow: [2, 'bump-arrow'], headline: 'rgb(0, 153, 0)', oto: ['rgb(204, 51, 0)', 'underline'], bump: ['rgb(251, 248, 227)', 'dashed'] }, 'the flashing arrow before each checkbox, as on the reference');
  assert.match(await page.locator('.product').innerText(), /Marketel Payoff - Your Debt-Free Date & Payoff Plan \(Reg\. \$375\)\s+1\s+\$33\.11/);
  const look = await page.evaluate(() => ({ button: getComputedStyle(document.getElementById('buy-button')).backgroundColor, font: getComputedStyle(document.querySelector('.order')).fontFamily }));
  assert.deepEqual(look, { button: 'rgb(55, 202, 55)', font: 'Montserrat, sans-serif' });
  assert.equal(await page.locator('.saved-note').innerText(), 'Stripe keeps your card for this visit, so you can add the optional Payoff Coach on the next page with one tap.');
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
test('Stripe\'s fields charge Payoff alone, one payment per order, then the tool opens', async () => world(async ({ page, base, payments, emails, stripeLog }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'elements'), [['elements', 'payment', 2811, 'usd'], ['elements', 'payment', 2811, 'usd']]);
  const created = (await stripeLog()).filter(entry => entry[0] === 'create');
  assert.deepEqual(created.map(entry => entry[1]), ['payment', 'expressCheckout']);
  assert.deepEqual(created[0][2], { layout: 'tabs', paymentMethodOrder: ['card', 'us_bank_account', 'klarna'], fields: { billingDetails: { name: 'never', email: 'never' } } }, 'Link stays on in the card form');
  assert.equal(created[1][2].paymentMethods.link, 'never', 'but no Link button above it');
  assert.equal(await page.locator('#express-checkout').isHidden(), false, 'a wallet is available, so it shows');
  assert.ok(await page.evaluate(() => ['#express-checkout', '#to-card', '#order-form'].map(sel => document.querySelector(sel).getBoundingClientRect().top).every((top, i, all) => !i || top > all[i - 1])),
    'the wallet sits on the first screen, above "Pay by card" and the form');
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'update'), [], 'the amount never changes on the page');
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
  assert.equal(payments[0].params.amount, 2811); assert.equal(payments[0].params.metadata.addons, '[]');
  assert.equal(payments[0].params.receipt_email, 'buyer@example.test');
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'element-update').at(-1), ['element-update', 'payment', { defaultValues: { billingDetails: { email: 'buyer@example.test' } } }],
    'the typed email goes to the card form, so Link can recognise a buyer it has not seen on this device');
  const confirm = (await stripeLog()).find(entry => entry[0] === 'confirm');
  assert.deepEqual(confirm[3], { billing_details: { name: 'Test Buyer', email: 'buyer@example.test' } });
  assert.equal(confirm[2], base + '/payoff/upgrade');
  assert.equal(await page.isVisible('#tabs'), true);
  assert.ok(await page.evaluate(() => localStorage.getItem('payoff.access')));
  assert.equal(new URL(page.url()).search, '');
  assert.equal(emails.length, 1); assert.match(emails[0].text, /Total paid: \$28\.11/);
}));
test('ticking both add-ons adds them to the total, the summary, Stripe\'s amount and the order; the pick survives a reload; the Coach page then leaves them out of "Included"', async () => world(async ({ page, base, payments, emails, stripeLog }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  const shots = process.env.ORDER_SHOT_DIR;
  if (shots) {
    await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.querySelectorAll('.bump-image')].map(img => { img.loading = 'eager'; return img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }); })]));
    await page.locator('#order-form').screenshot({ path: `${shots}/order-form.png` });
  }
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#order-total').innerText(), '$59.11');
  if (shots) await page.locator('#order-form').screenshot({ path: `${shots}/order-form-ticked.png` });
  assert.match(await page.locator('#summary-rows').innerText(), /Cash-flow calendar\s+1\s+\$ 22\.00\s+Spending reset\s+1\s+\$ 9\.00\s+Discount\s+-\$ 5\.00/);
  assert.deepEqual((await stripeLog()).filter(entry => entry[0] === 'update').map(entry => entry[1]), [5011, 5011, 5911, 5911], 'the card form and the wallet both charge the new total');
  await page.reload(); await ready(page);
  assert.equal(await page.locator('#cashflow').isChecked(), true); assert.equal(await page.locator('#reset').isChecked(), true);
  assert.equal(await page.locator('#order-total').innerText(), '$59.11');
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  await page.locator('#stage-offer:not([hidden])').waitFor();
  assert.equal(await page.locator('#up-included').isHidden(), true, 'both are bought already, so the Coach doesn\'t list them');
  await page.locator('#offer-no').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  assert.equal(payments.length, 1);
  assert.equal(payments[0].params.amount, 5911); assert.equal(payments[0].params.metadata.addons, '["cashflow","reset"]');
  assert.match(emails[0].text, /Cash-flow calendar: \$22\.00/); assert.match(emails[0].text, /Total paid: \$59\.11/);
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
  await page.evaluate(() => { const change = window.__stripeHandlers.payment.change; change({ empty: false, complete: false, value: { type: 'card' } }); change({ empty: false, complete: true, value: { type: 'card' } }); change({ empty: true, complete: false, value: { type: 'klarna' } }); change({ empty: false, complete: false, value: { type: 'link' } }); });
  await page.locator('#cashflow').check();
  await page.locator('#buy-button').scrollIntoViewIfNeeded();
  await page.locator('#buy-button').click();
  await until(['saw-form', 'name', 'email', 'card-start', 'card-done', 'method-klarna', 'method-link', 'addon-cashflow', 'saw-addons', 'saw-button', 'declined']);
  await page.locator('#email').dispatchEvent('change');
  await page.waitForTimeout(150);
  assert.deepEqual(steps().filter(step => !step.startsWith('time')).sort(), ['addon-cashflow', 'card-done', 'card-start', 'cart', 'declined', 'email', 'method-klarna', 'method-link', 'missing-email', 'missing-name', 'name', 'saw-addons', 'saw-button', 'saw-form', 'stripe-ready', 'wallet-shown'].sort());
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
test('when Stripe\'s fields can\'t be used, the button opens Stripe\'s hosted checkout for Payoff', async () => world(async ({ page, base, creates, payments }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#payment-element').isHidden(), true);
  assert.equal(await page.locator('#express-checkout').isHidden(), true);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(payments.length, 0); assert.equal(creates.length, 1);
  assert.deepEqual(creates[0].params.line_items.map(item => item.price_data.unit_amount), [3311]);
  assert.equal(creates[0].params.discounts.length, 1, 'with the $5 off');
  assert.equal(creates[0].params.customer_email, 'buyer@example.test');
}, { embedded: false }));
test('hosted checkout failure is retryable; the total survives a return; cancelling says nothing was charged', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.locator('#checkout-status:has-text("try again")').waitFor();
  assert.equal(await page.locator('#buy-button').isEnabled(), true);
  await page.locator('#buy-button').click(); await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 2);
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
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
test("Meta's pixel: PageView on each page, AddToCart once on starting to pay (not on a glance at the order page), InitiateCheckout on paying, with the server's event ids", async () => world(async ({ page, base, payments }) => {
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
  assert.ok(!calls.some(args => args[1] === 'AddToCart'), 'reaching the order page alone is not an AddToCart');
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL('https://payoff.test/payoff/upgrade**');
  await page.locator('#stage-offer:not([hidden])').waitFor();
  const tracked = calls.filter(args => args[0] === 'track');
  assert.equal(tracked.filter(args => args[1] === 'PageView').length, 3, 'sales page, order page, order page again (never the offer page or the tool)');
  assert.deepEqual(tracked.filter(args => args[1] !== 'PageView').map(args => [args[1], args[2].value, args[3]?.eventID]), [
    ['AddToCart', 33.11, `payoff-cart.${visitor}`],
    ['InitiateCheckout', 28.11, `payoff-checkout.${visitor}`],
  ], 'AddToCart once per visitor, then InitiateCheckout');
  assert.deepEqual(calls.filter(args => args[0] === 'trackCustom').map(args => [args[1], args[2].value, args[3]?.eventID]),
    [['StartedPaying', 33.11, `payoff-started.${visitor}`]], 'a valid email is the first step of paying');
  const started = posts.find(post => post.url.endsWith('/api/payoff/event') && post.body.includes('"detail":"email"'));
  assert.match(JSON.parse(started.body).attribution.fbc, /^fb\.1\.\d+\.adclick123$/);
  assert.ok(!started.body.includes('buyer@example.test'), 'never the email itself');
  // The server gets the click ids, so its copies match the same person.
  const cart = posts.find(post => post.url.endsWith('/api/payoff/event') && post.body.includes('"detail":"cart"'));
  assert.match(JSON.parse(cart.body).attribution.fbc, /^fb\.1\.\d+\.adclick123$/);
  assert.match(JSON.parse(cart.body).attribution.sourceUrl, /utm_source=facebook/);
  assert.match(payments[0].params.metadata.fbc, /adclick123$/);
}, { userAgent: PHONE_UA }));
test("20 seconds on the order page is Meta's AddToCart, once per visitor, with the server's event id", async () => world(async ({ page, base, rows }) => {
  const calls = [];
  await overHttps(page, base, calls);
  // A second of the on-screen clock passes every 10 ms here.
  await page.addInitScript(() => { const every = window.setInterval; window.setInterval = (fn, ms, ...rest) => every(fn, ms === 1000 ? 10 : ms, ...rest); });
  const steps = () => [...rows.values()].filter(row => row.name === 'PayoffOrder').map(row => row.detail);
  const until = async step => { for (let i = 0; i < 60 && !steps().includes(step); i++) await page.waitForTimeout(25); };
  await page.goto('https://payoff.test/payoff/order?fbclid=adclick123');
  await until('cart');
  const visitor = await page.evaluate(() => sessionStorage.getItem('payoff.visitor'));
  assert.ok(steps().indexOf('time10') < steps().indexOf('cart'), 'after ten seconds, not on arrival');
  await page.reload();
  await until('time60');
  assert.deepEqual(calls.filter(args => args[1] === 'AddToCart').map(args => [args[2].value, args[3]?.eventID]), [[33.11, `payoff-cart.${visitor}`]]);
  assert.equal(steps().filter(step => step === 'cart').length, 1);
}, { userAgent: PHONE_UA }));
test('20 seconds with the form in the middle of the screen is its own /funnel step, never sent to Meta', async () => world(async ({ page, base, rows }) => {
  const calls = [];
  await overHttps(page, base, calls);
  // A second of the on-screen clock passes every 10 ms here.
  await page.addInitScript(() => { const every = window.setInterval; window.setInterval = (fn, ms, ...rest) => every(fn, ms === 1000 ? 10 : ms, ...rest); });
  const steps = () => [...rows.values()].filter(row => row.name === 'PayoffOrder').map(row => row.detail);
  const until = async step => { for (let i = 0; i < 80 && !steps().includes(step); i++) await page.waitForTimeout(25); };
  await page.goto('https://payoff.test/payoff/order');
  await until('time60');
  assert.ok(steps().includes('cart') && !steps().includes('form20'), 'a minute at the top of the page is not time at the form');
  await page.evaluate(() => { const form = document.getElementById('order-form'); scrollTo(0, form.offsetTop + 200 - innerHeight / 2); });
  await until('form20');
  assert.equal(steps().filter(step => step === 'form20').length, 1);
  assert.deepEqual(calls.filter(args => args[0] === 'track' || args[0] === 'trackCustom').map(args => args[1]), ['PageView', 'AddToCart'], 'nothing new goes to Meta');
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
  // Two minutes in, a reload carries on instead of starting over.
  await page.evaluate(() => localStorage.setItem('payoff.reserveEnd', String(Date.now() + 2 * 60000 + 30000)));
  await page.reload(); await ready(page);
  assert.match(await reserveClock(page), /^(02:30|02:2\d)$/, 'a reload carries on');
  assert.match(await page.locator('#summary-rows').innerText(), /Discount/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  // At 00:00 it stays there, and the total does not change.
  await page.evaluate(() => { const original = Date.now; Date.now = () => original() + 3 * 60000; });
  await page.waitForTimeout(1300);
  assert.equal(await reserveClock(page), '00:00');
  await page.waitForTimeout(1100);
  assert.equal(await reserveClock(page), '00:00', 'it stays at 00:00');
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
  assert.equal(await page.locator('#glance-gift').count(), 0);
  // The next load after 00:00 starts a new five minutes.
  await page.evaluate(() => localStorage.setItem('payoff.reserveEnd', String(Date.parse('2026-01-01T00:00:00Z'))));
  await page.reload(); await ready(page);
  assert.match(await reserveClock(page), /^(05:00|04:5\d)$/, 'a new five minutes');
  advanceTime(31 * 60000);
  await page.reload(); await ready(page);
  assert.match(await page.locator('#summary-rows').innerText(), /Discount/);
  assert.equal(await page.locator('#order-total').innerText(), '$28.11');
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
// Most visitors decide within ten seconds, so the first screen carries the
// price, both ways to pay and the refund promise, on in-app browser heights too.
test('on every phone the first screen shows the price, both ways to pay and the refund, with the arrow from "If it doesn’t…" to the refund', async () => world(async ({ page, base }) => {
  for (const [width, height] of [[375, 548], [360, 640], [390, 664], [412, 760], [428, 746], [375, 667], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/payoff/order'); await ready(page);
    await page.locator('#express-checkout[data-methods]').waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    const seen = await page.evaluate(() => Object.fromEntries(['#reserve-clock', '.glance-price', '.why', '#express-checkout', '#to-card', '.refund']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    const arrow = await page.evaluate(() => {
      const glance = document.querySelector('.glance').getBoundingClientRect(), path = document.getElementById('why-path').getBBox();
      const from = document.getElementById('why-if').getBoundingClientRect(), to = document.getElementById('refund-head').getClientRects()[0];
      return { shown: !document.getElementById('why-arrow').hasAttribute('hidden'), starts: Math.abs(glance.top + path.y - (from.top + from.height / 2)),
        ends: Math.abs(glance.top + path.y + path.height - (to.top + to.height / 2)), clear: glance.left + path.x > from.right,
        lane: glance.left + path.x + path.width > document.getElementById('to-card').getBoundingClientRect().right };
    });
    assert.ok(arrow.shown && arrow.starts < 2 && arrow.ends < 2 && arrow.clear && arrow.lane, `${width}x${height}: ${JSON.stringify(arrow)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));
test('"Pay by card" at the top brings up the form and counts as starting to pay', async () => world(async ({ page, base, rows }) => {
  const steps = () => [...rows.values()].filter(row => row.name === 'PayoffOrder').map(row => row.detail);
  await page.goto(base + '/payoff/order'); await ready(page);
  assert.ok(!steps().includes('cart'));
  await page.locator('#to-card').click();
  for (let i = 0; i < 40 && !(steps().includes('top-card') && steps().includes('cart')); i++) await page.waitForTimeout(50);
  assert.ok(steps().includes('top-card') && steps().includes('cart'), 'Meta’s AddToCart, with the tap on /funnel');
  const formTop = () => page.evaluate(() => Math.abs(document.getElementById('order-form').getBoundingClientRect().top));
  for (let i = 0; i < 40 && await formTop() >= 30; i++) await page.waitForTimeout(50);
  assert.ok(await formTop() < 30, 'the form is at the top of the screen');
}, { userAgent: PHONE_UA }));

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

// The Payoff Coach, offered right after paying and in its tab inside Payoff.
const payThenOffer = async (page, base) => {
  await page.goto(base + '/payoff/order'); await ready(page);
  await fillBuyer(page);
  await page.locator('#buy-button').click();
  await page.waitForURL(url => url.pathname === '/payoff/upgrade');
  await page.locator('#stage-offer:not([hidden])').waitFor();
};
const text = async (page, selector) => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
test('after paying, the Coach starts in one tap on the card from the order (yearly first, monthly on a tap), and Payoff opens on the Coach tab with its tools', async () => world(async ({ page, base, payments, emails, subscribes }) => {
  await payThenOffer(page, base);
  assert.equal(await text(page, '.up-ready'), 'Your Payoff plan is ready ✓');
  assert.equal(await text(page, '#stage-offer .up-name'), 'Payoff Coach');
  assert.match(await text(page, '.up-qa'), /^“I’m getting a \$2,400 tax refund\. Where should it go\?” .*7 months sooner.*\$2,720 less interest.*Not your numbers\.$/);
  assert.equal(await page.locator('[data-plan="year"]').getAttribute('aria-checked'), 'true');
  assert.equal(await text(page, '#offer-terms'), '$67 today, then $67 every year until you cancel. Cancel any time in Payoff’s Coach tab. Your first payment is covered by the 30-day money-back guarantee.');
  assert.equal(await text(page, '#offer-one-click'), 'ONE TAP. NO CARD TO RE-ENTER.');
  assert.equal(await page.locator('[role="timer"]').count(), 0, 'no clock: the price never changes');
  await page.locator('[data-plan="month"]').click();
  assert.match(await text(page, '#offer-terms'), /^\$9 today, then \$9 every month until you cancel\./);
  await page.locator('#offer-yes').click();
  await page.locator('#stage-done:not([hidden])').waitFor();
  assert.equal(subscribes.length, 1);
  assert.deepEqual({ customer: subscribes[0].customer, method: subscribes[0].default_payment_method, price: subscribes[0].items[0].price, plan: subscribes[0].metadata.plan, parent: subscribes[0].metadata.parentOrder },
    { customer: 'cus_browser1', method: 'pm_browser_card', price: 'price_payoff-coach-month-v1', plan: 'month', parent: 'pi_3BrowserPay1' });
  assert.equal(payments.length, 1, 'the Coach is a subscription, not another payment');
  assert.ok(emails.some(mail => mail.subject === 'Your Payoff Coach is on'));
  await page.locator('#done-open').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  await page.locator('#cutter:not([hidden])').waitFor();
  assert.equal(await page.locator('#tabs button[data-tab="cutter"]').innerText(), 'Coach');
  assert.equal(await page.locator('#tabs button[data-tab="cutter"]').getAttribute('aria-current'), 'page');
  await page.locator('#cutter-tool:not([hidden])').waitFor();
  assert.equal(await page.locator('#cutter-locked').isHidden(), true, 'its tools, not the start buttons');
  for (const tab of ['cashflow', 'reset']) assert.equal(await page.locator(`#tabs button[data-tab="${tab}"]`).isHidden(), false, `${tab} is included`);
  assert.deepEqual(await page.locator('.cutter-script summary').allInnerTexts(), ['Ask for a lower interest rate', 'Ask for a late fee to be refunded', 'Ask about a hardship program']);
  await page.locator('#coach-manage').click();
  await page.waitForURL('https://billing.stripe.com/**');
}));
test('with Apple Pay, the Coach starts on Stripe’s checkout, which returns to the Coach tab with it on', async () => world(async ({ page, base, creates, subscribes }) => {
  await payThenOffer(page, base);
  assert.equal(await text(page, '#offer-one-click'), 'PAY WITH APPLE PAY, GOOGLE PAY OR A CARD.', 'never claims one tap for a wallet');
  await page.locator('#offer-yes').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(subscribes.length, 0);
  const coach = creates.at(-1).params;
  assert.equal(coach.mode, 'subscription'); assert.deepEqual(coach.line_items, [{ price: 'price_payoff-coach-year-v1', quantity: 1 }]);
  assert.equal(coach.customer, 'cus_browser1');
  await page.goto(base + '/payoff/app?coach=done&coach_session=cs_test_coachDone1');
  await page.locator('#cutter-tool:not([hidden])').waitFor();
  assert.equal(new URL(page.url()).search, '');
  assert.match(await page.locator('#toast').innerText(), /Your Payoff Coach is on/);
}, { wallet: 'apple_pay' }));
test('“No thanks” opens Payoff, and the offer never comes back', async () => world(async ({ page, base, subscribes }) => {
  await payThenOffer(page, base);
  assert.equal(await text(page, '#offer-no'), 'No thanks, take me to my plan');
  await page.locator('#offer-no').click();
  await page.waitForURL(url => url.pathname === '/payoff/app');
  await page.goto(base + '/payoff/upgrade?payment_intent=pi_3BrowserPay1');
  await page.waitForURL(url => url.pathname === '/payoff/app');
  assert.equal(subscribes.length, 0);
}));
test('the offer page shows the example, both plans and the YES button on the first screen of phones', async () => world(async ({ page, base }) => {
  await payThenOffer(page, base);
  for (const [width, height] of [[375, 667], [390, 664], [390, 844], [414, 736]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    const seen = await page.evaluate(() => Object.fromEntries(['.up-name', '.up-qa', '.up-plans', '#offer-yes']
      .map(sel => [sel, Math.round(document.querySelector(sel).getBoundingClientRect().bottom)])));
    for (const [sel, bottom] of Object.entries(seen)) assert.ok(bottom <= height, `${width}x${height}: ${sel} ends at ${bottom}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
}));
test('in Payoff, the Coach tab asks once before sending any numbers, answers three free questions with the plan, keeps the conversation on the phone, then offers the Coach on Stripe’s checkout', async () => world(async ({ page, base, coachAsks, creates, rows }) => {
  await payThenOffer(page, base);
  await page.locator('#offer-no').click(); await page.waitForURL(url => url.pathname === '/payoff/app');
  // Debts, as the Plan tab keeps them on this phone.
  await page.evaluate(() => localStorage.setItem('payoff.v1', JSON.stringify({ debts: [{ id: 'a', name: 'Chase', type: 'card', balance: 520000, apr: 24.99, minimum: 15600 }], extra: 5000, plan: null, seen: true })));
  await page.reload();
  await page.locator('#tabs button[data-tab="cutter"]').click();
  await page.locator('#coach-consent:not([hidden])').waitFor();
  assert.match(await text(page, '#coach-consent'), /sends your debts \(names, balances, rates and payments\) and your question to OpenAI, our AI provider\. We don’t keep them\./);
  assert.equal(await page.locator('#coach-chat').isHidden(), true, 'nothing can be sent before agreeing');
  assert.equal(await page.locator('#cutter-locked').isHidden(), false, 'the start buttons show without the Coach');
  assert.equal(await page.locator('#cutter-tool').isHidden(), true);
  await page.locator('#coach-agree').click();
  assert.equal(await text(page, '#coach-free'), '3 free questions left.');
  const answers = () => page.locator('#coach-turns li.assistant').count();
  const waitFor = async n => { for (let i = 0; i < 60 && await answers() < n; i++) await page.waitForTimeout(50); };
  await page.locator('#coach-ideas button').first().click();
  await waitFor(1);
  assert.deepEqual(await page.locator('#coach-turns li').allInnerTexts(), ['Where should a $1,000 tax refund go?', 'Answer 1: put any extra on your highest rate first.']);
  assert.equal(await text(page, '#coach-free'), '2 free questions left.');
  assert.match(coachAsks[0].input.at(-1).content, /- Chase \(card\): \$5,200\.00 at 24\.99%, \$156\.00 a month/);
  for (const [n, question] of [[2, 'What about $50 more?'], [3, 'And a car loan?']]) {
    await page.locator('#coach-question').fill(question); await page.locator('#coach-send').click(); await waitFor(n);
  }
  assert.deepEqual(coachAsks[1].input.slice(0, 2), [{ role: 'user', content: 'Where should a $1,000 tax refund go?' }, { role: 'assistant', content: 'Answer 1: put any extra on your highest rate first.' }], 'follow-ups carry the conversation');
  assert.equal(await text(page, '#coach-free'), 'You’ve used your 3 free questions. Start the Coach below to keep asking.');
  assert.equal(await page.locator('#coach-question').isDisabled(), true);
  assert.ok(![...rows.values()].some(row => JSON.stringify(row).includes('Chase') || JSON.stringify(row).includes('refund')), 'no question or number is stored');
  await page.reload();
  await page.locator('#tabs button[data-tab="cutter"]').click();
  assert.equal(await page.locator('#coach-turns li').count(), 6, 'the conversation is kept on this phone');
  await page.locator('[data-coach-plan="year"]').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.at(-1).params.mode, 'subscription'); assert.equal(creates.at(-1).params.line_items[0].price, 'price_payoff-coach-year-v1');
}));
