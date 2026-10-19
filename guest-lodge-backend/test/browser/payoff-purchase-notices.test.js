'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { createPreview } = require('../../scripts/preview-payoff');
const NOW = Date.parse('2026-10-19T17:04:45Z');
async function world(fn, { records = null, brokenStorage = false } = {}) {
  const server = createPreview().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.addInitScript(({ now, broken }) => {
      window.__now = now; Date.now = () => window.__now;
      if (broken) localStorage.setItem('payoff.purchaseNotices.seen.v1', 'unreadable');
    }, { now: NOW, broken: brokenStorage });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/payoff/purchase-notices.js*', route => route.fulfill({ contentType: 'application/javascript',
      body: fs.readFileSync(path.resolve(__dirname, '../../payoff-web/purchase-notices.js'), 'utf8')
        .replace('FIRST_DELAY = 12000, DISPLAY_TIME = 7000, BETWEEN_DELAY = 18000', 'FIRST_DELAY = 50, DISPLAY_TIME = 4000, BETWEEN_DELAY = 80')
        .replace('}, 1000);', '}, 50);') }));
    if (records) await page.route('**/payoff/content.js*', route => route.fulfill({ contentType: 'application/javascript',
      body: fs.readFileSync(path.resolve(__dirname, '../../payoff-web/content.js'), 'utf8') + '\nwindow.PAYOFF_CONTENT.purchaseNotices=' + JSON.stringify(records) + ';' }));
    await page.goto(base + '/payoff');
    await fn(page, base);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('recent purchases show the supplied names and cities once, age correctly, and stay seen on reload', async () => world(async page => {
  const card = page.locator('.purchase-notice');
  await card.locator('strong:has-text("Megan")').waitFor();
  assert.match(await card.innerText(), /Westport, New York/);
  assert.match(await card.innerText(), /About 20 minutes ago/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await card.screenshot({ path: '/tmp/payoff-purchase-notice.png' });
  await page.evaluate(() => { window.__now += 30 * 60000; });
  await card.locator('time:has-text("About 50 minutes ago")').waitFor();
  await card.locator('strong:has-text("Nicole")').waitFor();
  assert.match(await card.innerText(), /Bentley, Kansas/);
  await card.locator('strong:has-text("Rachel")').waitFor();
  assert.match(await card.innerText(), /Woodland, Minnesota/);
  await card.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('payoff.purchaseNotices.seen.v1')).length), 3);
  await page.reload(); await page.waitForTimeout(250);
  assert.equal(await card.count(), 0);
}));

test('dismiss stops the sequence and order pages have no purchase notice', async () => world(async (page, base) => {
  await page.locator('.purchase-notice:not([hidden])').waitFor();
  await page.getByRole('button', { name: 'Dismiss purchase notifications' }).click();
  await page.waitForTimeout(4250);
  assert.equal(await page.locator('.purchase-notice').count(), 0);
  await page.goto(base + '/payoff/order');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.purchase-notice').count(), 0);
}));

for (const brokenStorage of [false, true]) test(`old, future or unreadable notices stay hidden (unreadable storage: ${brokenStorage})`, async () => world(async page => {
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.purchase-notice').count(), 0);
}, { brokenStorage, records: [
  { id: 'old', name: 'Old', purchasedAt: '2026-10-17T17:04:45Z' },
  { id: 'future', name: 'Future', purchasedAt: '2026-10-20T17:04:45Z' },
  { id: 'bad', name: 'Unreadable', purchasedAt: 'unknown' },
] }));
