'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff, PRODUCT, VERSION } = require('../../payoff');

const SHOTS = process.env.PAYOFF_SHOTS || '';
async function world(fn) {
  const app = express(), emails = [], requests = [];
  const paid = { id: 'cs_test_appOrder1234567', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 3300, livemode: false,
    metadata: { product: PRODUCT, offerVersion: VERSION, addons: '[]' }, customer_details: { email: 'buyer@example.test' } };
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
  assert.equal(await page.$('[data-section="founder"]'), null);
  assert.ok(await page.$('.product-shot'));
  await page.goto(base + '/payoff/order');
  assert.equal(await page.$('.preorder-notice'), null);
  assert.equal(await page.$('#preorder-consent'), null);
  assert.equal(await page.$$eval('.summary-line', lines => lines.length), 1);
  await page.waitForFunction(() => document.getElementById('buy-button').textContent === 'Continue to secure payment');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, 'no sideways scroll');
}));
