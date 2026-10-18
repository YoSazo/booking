'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff, PRODUCT, VERSION } = require('../../payoff');

async function world(fn, { rejectFirst = false, unpaid = false } = {}) {
  const app = express(), creates = [], emails = [], rows = new Map();
  const paid = { id: 'cs_test_browserOrder123', mode: 'payment', status: 'complete', payment_status: unpaid ? 'unpaid' : 'paid', currency: 'usd', amount_total: 5500, livemode: false,
    metadata: { product: PRODUCT, offerVersion: VERSION, addons: '["cashflow"]' }, customer_details: { email: 'buyer@example.test' } };
  const prisma = { inspectEvent: {
    upsert: async () => ({}),
    create: async ({ data }) => { if (data.sourceId && rows.has(data.sourceId)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); rows.set(data.sourceId || rows.size, data); },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  const stripe = { checkout: { sessions: {
    create: async (params, options) => {
      creates.push({ params, options });
      await new Promise(resolve => setTimeout(resolve, 150));
      if (rejectFirst) { rejectFirst = false; throw new Error('Stripe unavailable'); }
      return { url: 'https://checkout.stripe.com/c/pay/cs_test_browser' };
    },
    retrieve: async () => paid,
  } } };
  registerPayoff(app, { stripe, prisma, mail: { sendMail: async m => emails.push(m) }, env: { NODE_ENV: 'test' } });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: 'Stripe checkout fixture' }));
    await fn({ page, base, creates, emails }); assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('live preorder requires acknowledgement and opens one Stripe checkout with the selected extras', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order');
  const button = page.locator('#preorder-button'); await page.locator('#preorder-button:enabled').waitFor();
  assert.match(await page.locator('.preorder-notice').innerText(), /not available yet/);
  assert.match(await page.locator('.preorder-notice').innerText(), /No release date/);
  await page.locator('#email').fill('buyer@example.test');
  await button.click(); assert.equal(creates.length, 0);
  await page.locator('#cashflow').check(); await page.locator('#reset').check();
  assert.equal(await page.locator('#order-total').innerText(), '$64.00');
  await page.locator('#preorder-consent').check();
  await button.click();
  await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 1);
  assert.equal(creates[0].params.line_items.reduce((sum, item) => sum + item.price_data.unit_amount, 0), 6400);
  assert.equal(creates[0].params.customer_email, 'buyer@example.test');
  assert.match(creates[0].params.custom_text.submit.message, /Paid preorder/);
}));
test('failed checkout is retryable, preserves selections and reuses its idempotency key', async () => world(async ({ page, base, creates }) => {
  await page.goto(base + '/payoff/order'); await page.locator('#preorder-button:enabled').waitFor();
  await page.locator('#email').fill('buyer@example.test'); await page.locator('#cashflow').check(); await page.locator('#preorder-consent').check();
  await page.locator('#preorder-button').click();
  await page.locator('#checkout-status:has-text("try again")').waitFor();
  assert.equal(await page.locator('#cashflow').isChecked(), true);
  assert.equal(await page.locator('#preorder-button').isEnabled(), true);
  await page.locator('#preorder-button').click(); await page.waitForURL('https://checkout.stripe.com/**');
  assert.equal(creates.length, 2); assert.equal(creates[0].options.idempotencyKey, creates[1].options.idempotencyKey);
  await page.goto(base + '/payoff/order?cancelled=1');
  await page.locator('#preorder-button:enabled').waitFor();
  assert.equal(await page.locator('#cashflow').isChecked(), true);
  assert.equal(await page.locator('#order-total').innerText(), '$55.00');
  assert.equal(creates.length, 2);
}, { rejectFirst: true }));
test('paid return confirms the actual order without promising immediate access', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/confirmation?session_id=cs_test_browserOrder123');
  await page.locator('#confirmation-heading:has-text("Your preorder is confirmed")').waitFor();
  assert.match(await page.locator('#confirmation-details').innerText(), /\$55\.00/);
  assert.match(await page.locator('.preorder-notice').innerText(), /No release date/);
  assert.equal(emails.length, 1);
}));
test('unpaid return shows pending confirmation and never invents a purchase', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/confirmation?session_id=cs_test_browserOrder123');
  await page.locator('#confirmation-retry').waitFor();
  assert.equal(await page.locator('#confirmation-heading').innerText(), 'Payment confirmation is pending');
  assert.match(await page.locator('#confirmation-status').innerText(), /do not pay again/);
  assert.equal(emails.length, 0);
}, { unpaid: true }));
