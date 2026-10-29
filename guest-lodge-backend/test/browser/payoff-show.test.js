'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff } = require('../../payoff');

// Enough of Stripe.js for the order page to mount its fields.
const FAKE_STRIPE = `window.Stripe = () => ({ elements: () => ({ update() {}, submit: async () => ({}),
  create: () => ({ on() {}, update() {}, mount(selector) { document.querySelector(selector)?.append(document.createElement('div')); } }) }) });`;

async function world(fn) {
  const app = express();
  const prisma = { inspectEvent: { upsert: async () => ({}), create: async () => {}, delete: async () => {} } };
  const stripe = { coupons: { retrieve: async id => ({ id, valid: true, amount_off: 500, currency: 'usd' }) } };
  registerPayoff(app, { stripe, prisma, mail: { sendMail: async () => {} }, env: { NODE_ENV: 'test' } });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://js.stripe.com/v3/', route => route.fulfill({ body: FAKE_STRIPE, headers: { 'content-type': 'application/javascript' } }));
    await fn({ page, base });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const text = (page, selector) => page.locator(selector).first().innerText().then(value => value.trim());
const MONTH_YEAR = /^(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d$/;

test('the product page fits a phone, works its numbers out with the app\'s own maths, and its gallery, tabs and sticky button work', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/show');
  await page.locator('[data-chart-payment] svg').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'no sideways scroll at phone width');
  const minDate = await text(page, '[data-min-date]'), planDate = await text(page, '[data-plan-date]');
  assert.match(minDate, MONTH_YEAR); assert.match(planDate, MONTH_YEAR);
  assert.ok(Number(planDate.slice(-4)) < Number(minDate.slice(-4)), 'the plan finishes before minimums only');
  assert.match(await text(page, '[data-saved]'), /^\$[\d,]+$/);

  // Gallery: a thumbnail or the arrow changes the main picture.
  const main = page.locator('[data-main]');
  await page.locator('.thumb').nth(2).click();
  assert.match(await main.getAttribute('src'), /show-product-ontrack/);
  await page.locator('[data-next]').click();
  assert.match(await main.getAttribute('src'), /show-product-easy/);

  // Testimonial tabs show their own slides only.
  assert.equal(await page.locator('.slide[data-group="date"]:visible').count(), 2);
  await page.locator('.tab[data-tab="order"]').click();
  assert.equal(await page.locator('.slide[data-group="date"]:visible').count(), 0);
  assert.equal(await page.locator('.slide[data-group="order"]:visible').count(), 2);

  // The sticky button waits until the order box has scrolled away.
  assert.equal(await page.locator('[data-sticky]').isVisible(), false);
  await page.locator('.reviews').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-sticky]').isVisible(), true);
}));

test('the chosen order goes to the order page: its add-ons arrive ticked and the total matches the button', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/show');
  await page.waitForLoadState('networkidle');
  // The calendar bundle is chosen to start; the button shows its price.
  assert.equal(await page.locator('.option.is-on').getAttribute('data-option'), '2');
  assert.equal(await text(page, '[data-cta-price]'), await text(page, '.option.is-on .opt-price'));
  await page.locator('.option[data-option="3"]').click();
  assert.equal(await page.locator('.option[data-option="3"]').getAttribute('aria-checked'), 'true');
  const price = await text(page, '[data-cta-price]');
  assert.equal(price, await text(page, '.option[data-option="3"] .opt-price'));
  assert.match(await text(page, '.option[data-option="3"] .opt-save'), /^Save \$\d+$/);
  await page.locator('[data-cta]').click();
  await page.waitForURL(url => url.pathname === '/payoff/order' && url.searchParams.get('from') === 'show');
  await page.locator('#order-total').waitFor();
  assert.equal(await page.locator('#cashflow').isChecked(), true);
  assert.equal(await page.locator('#reset').isChecked(), true);
  assert.equal(await text(page, '#order-total'), price, 'the order page charges what the product page said');
}));
