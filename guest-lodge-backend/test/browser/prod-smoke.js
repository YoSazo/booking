// Read-only production demo smoke. Run explicitly with `npm run test:browser:prod`.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    const response = await page.goto('https://bookmarketel.com/claims?sim=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
    assert.equal(response.status(), 200);
    await page.waitForSelector('[data-sim-pick]', { timeout: 10000 });
    await page.locator('[data-sim-pick]').first().click();
    await page.locator('#sim-mic-button').click();
    await page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 15000 });
    await page.locator('#sim-shutter').click();
    await page.waitForSelector('#sim-see');
    await page.locator('#sim-see').click();
    await page.waitForSelector('#sim-buy');
    assert.match(await page.locator('#sim-offer').innerText(), /\$25/);
    assert.deepEqual(failures, []);
    console.log('Production Claims demo smoke passed. No account or purchase was created.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
