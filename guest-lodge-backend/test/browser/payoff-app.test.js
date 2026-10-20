'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff, PRODUCT, VERSION } = require('../../payoff');

const SHOTS = process.env.PAYOFF_SHOTS || '';
async function world(fn, { addons = [] } = {}) {
  const app = express(), emails = [], requests = [];
  const paid = { id: 'cs_test_appOrder1234567', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd',
    amount_total: 3300 + (addons.includes('cashflow') ? 2200 : 0) + (addons.includes('reset') ? 900 : 0), livemode: false,
    metadata: { product: PRODUCT, offerVersion: VERSION, addons: JSON.stringify(addons) }, customer_details: { email: 'buyer@example.test' } };
  const rows = new Map();
  const prisma = { inspectEvent: {
    upsert: async () => ({}),
    create: async ({ data }) => { if (data.sourceId && rows.has(data.sourceId)) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); rows.set(data.sourceId || rows.size, data); },
    delete: async ({ where }) => rows.delete(where.sourceId),
  } };
  const stripe = { checkout: { sessions: {
    create: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_app' }),
    retrieve: async () => paid,
    list: async ({ customer_details }) => ({ data: customer_details.email === 'buyer@example.test' ? [paid] : [] }),
  } } };
  registerPayoff(app, { stripe, prisma, mail: { sendMail: async m => emails.push(m) }, env: { NODE_ENV: 'test' } });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 3 : 1 });
    await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => requests.push({ url: request.url(), body: request.postData() || '' }));
    await fn({ page, base, emails, requests, shot: async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
async function addDebt(page, { name, type = 'card', balance, apr, minimum }) {
  await page.click(await page.isVisible('#add-first') ? '#add-first' : '#add-more');
  await page.waitForSelector('#sheet:not([hidden])');
  if (name) await page.fill('#debt-name', name);
  await page.click(`.segmented [data-type="${type}"]`);
  await page.fill('#debt-balance', balance);
  await page.fill('#debt-apr', apr);
  await page.fill('#debt-minimum', minimum);
  await page.click('#sheet-save');
  await page.waitForSelector('#sheet', { state: 'hidden' });
}
const text = (page, selector) => page.textContent(selector).then(value => value.trim());

test('a buyer returning from Stripe gets straight in, builds a plan, and their numbers never leave the phone', async () => world(async ({ page, base, emails, requests, shot }) => {
  await page.goto(base + '/payoff/app?session_id=cs_test_appOrder1234567');
  await page.waitForSelector('#debts:not([hidden])');
  assert.equal(new URL(page.url()).search, '');
  assert.match(await text(page, '#toast'), /Payment confirmed/);
  assert.ok(await page.evaluate(() => localStorage.getItem('payoff.access')));
  assert.equal(emails.length, 1);
  await shot('1-empty');

  // Add three debts; the sheet catches a missing balance first.
  await page.click('#add-first');
  await page.click('#sheet-save');
  assert.match(await text(page, '#sheet-warning'), /balance/);
  assert.ok(await page.$eval('#debt-balance', el => el.classList.contains('invalid')));
  await page.click('#sheet-cancel');
  await addDebt(page, { name: 'Visa', balance: '4,200', apr: '24.99', minimum: '126' });
  await addDebt(page, { name: 'Store card', balance: '850', apr: '29.99', minimum: '35' });
  await addDebt(page, { name: 'Car loan', type: 'loan', balance: '9800', apr: '7.5', minimum: '310' });
  assert.equal(await page.$$eval('.debt-row', rows => rows.length), 3);
  assert.equal(await text(page, '#total-owed'), '$14,850.00');
  assert.equal(await text(page, '#total-minimums'), '$471.00');
  await page.fill('#extra', '50');
  assert.match(await text(page, '#monthly-total'), /\$521\.00 a month/);
  await shot('2-list');

  await page.click('#show-result');
  await page.waitForSelector('#result:not([hidden])');
  const date = await text(page, '#date-big');
  assert.match(date, /^(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d$/);
  assert.match(await text(page, '#date-minimums'), /Paying only the minimums: \w+ 20\d\d/);
  assert.match(await text(page, '#date-win'), /sooner · \$[\d,]+ less interest/);
  assert.equal(await page.$$eval('.plan', cards => cards.length), 5);
  assert.equal(await page.$$eval('.plan .tag', tags => tags.length), 1);
  assert.equal(await page.$$eval('.payoff-order li', items => items.length), 3);
  assert.equal(await page.$$eval('#schedule details[open]', open => open.length), 1);
  await shot('3-result');

  // Switching plans changes the order shown.
  await page.click('.plan[data-plan="snowball"]');
  assert.equal(await page.getAttribute('.plan[data-plan="snowball"]', 'aria-pressed'), 'true');
  assert.match(await text(page, '#order-title'), /Snowball/);
  assert.match(await text(page, '.payoff-order li:first-child .who'), /^Store card/);
  await page.click('.plan[data-plan="avalanche"]');
  assert.match(await text(page, '.payoff-order li:first-child .who'), /^Store card/); // 29.99% is also the highest rate
  await page.click('#schedule details:nth-of-type(2) summary');
  assert.ok(await page.$$eval('#schedule details:nth-of-type(2) .month', months => months.length) > 0);
  await page.evaluate(() => document.querySelector('#schedule').scrollIntoView());
  await shot('4-schedule');

  // What if: +$100 a month brings the date forward; tapping again undoes it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('.chip[data-more="10000"]');
  assert.notEqual(await text(page, '#date-big'), date);
  assert.match(await text(page, '#date-label'), /\+\$100 a month/);
  assert.match(await text(page, '#date-was'), /sooner than/);
  await page.fill('#one-time', '1500');
  assert.match(await text(page, '#date-label'), /\$1,500 once/);
  await page.evaluate(() => document.querySelector('.whatif').scrollIntoView({ block: 'center' }));
  await shot('5-whatif');
  await page.click('.chip[data-more="10000"]');
  await page.fill('#one-time', '');
  assert.equal(await text(page, '#date-big'), date);

  // Edit and delete.
  await page.click('#edit-debts');
  await page.click('.debt-row >> text=Store card');
  await page.fill('#debt-balance', '900');
  await page.click('#sheet-save');
  assert.equal(await text(page, '#total-owed'), '$14,900.00');
  await page.click('.debt-row >> text=Car loan');
  await page.click('#sheet-delete');
  assert.equal(await text(page, '#sheet-delete'), 'Tap again to delete');
  await page.click('#sheet-delete');
  assert.equal(await page.$$eval('.debt-row', rows => rows.length), 2);
  await page.click('#show-result');

  // Reload: the plan is still there.
  await page.reload();
  await page.waitForSelector('#result:not([hidden])');
  assert.equal(await page.$$eval('.payoff-order li', items => items.length), 2);

  // Save as PDF opens every year and prints without the controls.
  await page.click('#save-pdf');
  assert.equal(await page.evaluate(() => window.__printed), 1);
  assert.equal(await page.$$eval('#schedule details', all => all.every(d => d.open)), true);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.isVisible('.whatif'), false);
  assert.equal(await page.isVisible('#save-pdf'), false);
  assert.equal(await page.isVisible('#date-big'), true);
  await page.emulateMedia({ media: 'screen' });

  // Clear asks twice, then empties everything but keeps access.
  await page.click('#clear');
  assert.match(await text(page, '#clear'), /Tap again/);
  await page.click('#clear');
  await page.waitForSelector('#debts:not([hidden])');
  assert.equal(await page.isVisible('#add-first'), true);
  await page.reload();
  await page.waitForSelector('#debts:not([hidden])');
  assert.equal(await page.$$eval('.debt-row', rows => rows.length), 0);

  for (const request of requests) {
    for (const secret of ['4200', '4,200', '24.99', '9800', 'Visa', 'Car loan', '126']) {
      assert.ok(!request.url.includes(secret) && !request.body.includes(secret), `${request.url} carried ${secret}`);
    }
  }
}));

test('without access the tool asks for the emailed link, resends it, and the link opens the tool', async () => world(async ({ page, base, emails }) => {
  await page.goto(base + '/payoff/app');
  await page.waitForSelector('#gate:not([hidden])');
  assert.equal(await page.isVisible('#debts'), false);
  await page.fill('#resend-email', 'buyer@example.test');
  await page.click('#resend-button');
  await page.waitForFunction(() => /on its way/.test(document.getElementById('resend-status').textContent));
  assert.equal(emails.length, 1);
  const link = emails[0].text.match(/https:\/\/bookmarketel\.com(\/payoff\/app\?access=\S+)/)[1];
  await page.goto(base + '/payoff/app?access=nonsense');
  await page.waitForSelector('#gate:not([hidden])');
  assert.match(await text(page, '#resend-status'), /not valid/);
  await page.goto(base + link);
  await page.waitForSelector('#debts:not([hidden])');
  assert.equal(new URL(page.url()).search, '');
  await page.reload();
  await page.waitForSelector('#debts:not([hidden])');
}));

test('the order page sells Payoff alone and the sales page shows the real tool', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff');
  assert.equal(await page.$('.preorder-notice'), null);
  assert.equal(await page.$('.owner-placeholder'), null);
  assert.equal(await page.locator('[data-section="founder"]').count(), 1);
  assert.equal(await page.locator('.proof-image').count(), 14);
  assert.ok(await page.$('.product-shot'));
  await page.goto(base + '/payoff/order');
  assert.equal(await page.$('.preorder-notice'), null);
  assert.equal(await page.$('#preorder-consent'), null);
  assert.match(await page.locator('#summary-rows .line').first().innerText(), /^Marketel Payoff - Your Debt-Free Date & Payoff Plan \(Reg\. \$375\)\s+1\s+\$ 33\.00$/);
  assert.equal(await page.locator('#summary-rows .line').filter({ hasText: /calendar|reset/i }).count(), 0);
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#buy-label').innerText(), 'Get My Debt-Free Date');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, 'no sideways scroll');
}));

test('a buyer without extras sees no tabs', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/app?session_id=cs_test_appOrder1234567');
  await page.waitForSelector('#debts:not([hidden])');
  assert.equal(await page.isVisible('#tabs'), false);
  assert.doesNotMatch(await text(page, '#toast'), /tabs/);
}));

test('a buyer with both extras gets tabs, a cash-flow calendar that warns before a shortfall, and a spending reset', async () => world(async ({ page, base, requests, shot }) => {
  await page.goto(base + '/payoff/app?session_id=cs_test_appOrder1234567');
  await page.waitForSelector('#debts:not([hidden])');
  assert.match(await text(page, '#toast'), /cash-flow calendar and spending reset are in the tabs/);
  assert.equal(await page.isVisible('#tabs'), true);
  assert.equal(await page.$$eval('#tabs button:not([hidden])', tabs => tabs.length), 3);
  await addDebt(page, { name: 'Visa', balance: '3000', apr: '24', minimum: '90' });
  await page.click('#show-result');
  await page.waitForSelector('#result:not([hidden])');

  // Cash flow: $500 today, paid $1,200 every two weeks from the 30th... the date pickers use real dates.
  await page.click('#tabs [data-tab="cashflow"]');
  await page.waitForSelector('#cashflow:not([hidden])');
  assert.equal(await page.getAttribute('#tabs [data-tab="cashflow"]', 'aria-current'), 'page');
  const today = await page.evaluate(() => { const d = new Date(); return [d.getFullYear(), d.getMonth(), d.getDate()]; });
  const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  await page.fill('#cf-balance', '500');
  await page.click('#cf-add-bill');
  await page.fill('#cf-name', 'Rent');
  await page.fill('#cf-amount', '1400');
  await page.selectOption('#cf-repeat', 'monthly');
  await page.fill('#cf-date', iso(today[0], today[1], today[2] + 3));
  await page.click('#cf-form button[type="submit"]');
  await page.waitForSelector('#cf-sheet', { state: 'hidden' });
  assert.match(await text(page, '#cf-alert'), /Short by \$900\.00 on/);
  assert.match(await text(page, '#cf-alert'), /Rent \(\$1,400\.00\)/);
  assert.ok(await page.$$eval('.cf-day.is-low', days => days.length) > 0);
  await page.click('#cf-add-income');
  await page.fill('#cf-name', 'Paycheck');
  await page.fill('#cf-amount', '1200');
  await page.selectOption('#cf-repeat', 'biweekly');
  await page.fill('#cf-date', iso(today[0], today[1], today[2] + 1));
  await page.click('#cf-form button[type="submit"]');
  assert.match(await text(page, '#cf-alert'), /You stay above \$0 for the next 3 months/);
  await page.check('#cf-debts');
  assert.match(await page.textContent('#cf-agenda'), /Paycheck/);
  await shot('6-cashflow');
  await page.click('#cf-next');
  assert.match(await page.textContent('#cf-agenda'), /Debt payments/);
  assert.equal(await page.$$eval('.cf-agenda li', items => items.length) > 0, true);
  await page.click('.debt-row >> text=Rent');
  await page.fill('#cf-amount', '1450');
  await page.click('#cf-form button[type="submit"]');
  assert.match(await page.textContent('#cf-items'), /1,450\.00/);

  // Spending reset: pick what to pause, start, log two days.
  await page.click('#tabs [data-tab="reset"]');
  await page.waitForSelector('#reset:not([hidden])');
  await page.click('[data-length="7"]');
  await page.click('#reset-paused-chips >> text=Takeout');
  await page.fill('#reset-paused-costs input', '70');
  await page.click('#reset-rule-ideas >> text=Groceries from a list only');
  await page.fill('#reset-rule', 'No shopping apps');
  await page.press('#reset-rule', 'Enter');
  assert.equal(await page.$$eval('#reset-rules li', rules => rules.length), 2);
  await shot('7-reset-setup');
  await page.click('#reset-start');
  await page.waitForSelector('#reset-track:not([hidden])');
  assert.equal(await text(page, '#reset-title'), 'Day 1 of 7');
  await page.click('#reset-kept');
  assert.equal(await text(page, '#reset-saved'), '$10');
  assert.equal(await text(page, '#reset-streak'), '1 day');
  assert.match(await text(page, '#reset-logged'), /stuck to it/);
  await page.click('#reset-slipped');
  await page.fill('#reset-spent', '4');
  assert.equal(await text(page, '#reset-saved'), '$6');
  assert.equal(await text(page, '#reset-streak'), '0 days');
  await page.click('#reset-kept');
  await shot('8-reset-track');
  await page.click('#reset-review .big');
  await page.waitForSelector('#result:not([hidden])');
  assert.match(await text(page, '#date-label'), /\$10 once/);
  assert.equal(await page.inputValue('#one-time'), '10');

  // Everything survives a reload, and the tab comes back.
  await page.click('#tabs [data-tab="reset"]');
  await page.reload();
  await page.waitForSelector('#reset-track:not([hidden])');
  assert.equal(await page.isVisible('#tabs'), true);
  await page.click('#tabs [data-tab="cashflow"]');
  assert.match(await page.textContent('#cf-items'), /Paycheck/);
  for (const request of requests) for (const secret of ['1400', '1450', '1200', 'Takeout', 'Rent', 'Paycheck']) {
    assert.ok(!request.url.includes(secret) && !request.body.includes(secret), `${request.url} carried ${secret}`);
  }
}, { addons: ['cashflow', 'reset'] }));

test('the order page offers both extras, unchecked, and checkout includes the ones picked', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.isChecked('#cashflow'), false);
  assert.equal(await page.isChecked('#reset'), false);
  await page.check('#cashflow');
  assert.equal(await text(page, '#order-total'), '$50.00');
  await page.check('#reset');
  assert.equal(await text(page, '#order-total'), '$59.00');
}));
