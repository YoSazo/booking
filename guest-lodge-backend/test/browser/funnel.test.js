'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { open } = require('./harness');
const { buildWedgeFunnel } = require('../../wedge-funnel');

// The owner's own browser, once switched off on /funnel, sends no steps at
// all, and every request it does make is marked so the server records nothing.
test('a browser switched off on /funnel goes through the whole demo without counting', async () => {
  const h = await open({ arm: 'claims', signedIn: false, demo: true, viewport: { width: 390, height: 844 } });
  try {
    await h.page.waitForSelector('[data-sim-pick]');
    await h.page.evaluate(() => localStorage.setItem('marketel.noTrack', '1'));
    const sent = [];
    h.page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/inspect/')) sent.push({ path: url.pathname, marked: request.headers()['x-marketel-no-track'] === '1' }); });
    const before = h.events.length;
    await h.page.reload({ waitUntil: 'domcontentloaded' });
    await h.page.locator('[data-sim-pick]').first().click();
    await h.page.waitForSelector('#sim-mic-button');
    await h.page.click('#sim-mic-button');
    await h.page.waitForSelector('#sim-shutter:not([disabled])', { timeout: 10000 });
    await h.page.click('#sim-shutter');
    await h.page.waitForSelector('#sim-see', { timeout: 10000 });
    await h.page.click('#sim-see');
    await h.page.waitForSelector('#sim-next'); await h.page.click('#sim-next');
    await h.page.waitForSelector('#sim-buy');
    await h.page.waitForTimeout(300);
    assert.equal(h.events.length, before, 'no demo step was sent');
    assert.ok(!sent.some(r => r.path.startsWith('/api/inspect/events')), JSON.stringify(sent));
    assert.ok(sent.every(r => r.marked), `every request is marked: ${JSON.stringify(sent)}`);
    h.assertClean();
  } finally { await h.close(); }
});

test('/funnel switches its own browser off the first time, and the button flips it', async () => {
  const body = JSON.stringify({ wedges: [{ id: 'claims', product: 'Claims' }], tool: 'claims', ...buildWedgeFunnel([]) });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('marketelAdminToken', 'test'));
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') return route.fulfill({ status: 200, body, headers: { 'content-type': 'application/json' } });
      if (url.pathname === '/funnel') return route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')), headers: { 'content-type': 'text/html' } });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel');
    await page.waitForSelector('#track-toggle');
    assert.equal(await page.evaluate(() => localStorage.getItem('marketel.noTrack')), '1');
    assert.match(await page.textContent('#track-toggle'), /Not counting this browser/);
    await page.click('#track-toggle');
    assert.equal(await page.evaluate(() => localStorage.getItem('marketel.noTrack')), '0');
    assert.match(await page.textContent('#track-toggle'), /^Counting this browser/);
    // Chosen once, it stays chosen: reopening does not switch it back off.
    await page.reload();
    await page.waitForSelector('#track-toggle');
    assert.equal(await page.evaluate(() => localStorage.getItem('marketel.noTrack')), '0');
  } finally { await browser.close(); }
});
