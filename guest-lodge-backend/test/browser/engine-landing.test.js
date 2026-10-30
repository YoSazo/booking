'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');

// The /engine page on its own: the real file, the real public scripts, and
// a stand-in for the two endpoints it calls.
async function world(fn, { viewport = { width: 390, height: 844 } } = {}) {
  const app = express();
  const starts = [];
  app.use(express.json());
  app.get('/engine', (req, res) => res.sendFile(path.resolve(__dirname, '../../engine.html')));
  app.post('/api/funnel/onboarding', (req, res) => res.json({ ok: true }));
  app.post('/api/setup/start', (req, res) => { starts.push(req.body); res.json({ success: true, hotelId: 'h1', token: 't1', setupUrl: '/setup/t1?angle=pms' }); });
  app.get('/setup/:token', (req, res) => res.send('<!doctype html><title>Setup</title><p>Setup wizard</p>'));
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport, ...(viewport.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/engine');
    await fn({ page, starts });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('the engine page fits a phone and says the offer, the price and the guarantee', async () => world(async ({ page }) => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'no sideways scroll at phone width');
  const text = await page.locator('body').innerText();
  assert.match(text, /connected to your PMS/);
  assert.match(text, /live in 24\s+hours/);
  assert.match(text, /14 days free, then \$149\/month/);
  assert.match(text, /If it doesn.t connect to your PMS, you don.t pay/);
  assert.equal(await page.locator('#startSetupBtn').isVisible(), true);
}));

test('a bad email stays on the page; a good one starts setup tagged as the PMS offer', async () => world(async ({ page, starts }) => {
  await page.locator('#startSetupBtn').click();
  await page.waitForTimeout(200);
  assert.equal(starts.length, 0);
  assert.equal(await page.getAttribute('#setupEmail', 'placeholder'), 'Please enter your email');
  await page.fill('#setupEmail', 'Owner@Example.test');
  await page.locator('#startSetupBtn').click();
  await page.waitForURL(url => url.pathname === '/setup/t1' && url.searchParams.get('angle') === 'pms');
  assert.equal(starts.length, 1);
  assert.equal(starts[0].email, 'owner@example.test');
  assert.equal(starts[0].acquisitionAngle, 'pms');
}));

test('the lower trial button brings the owner back to the email box', async () => world(async ({ page }) => {
  await page.locator('.offer [data-start]').scrollIntoViewIfNeeded();
  await page.locator('.offer [data-start]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'setupEmail');
  assert.equal(await page.locator('#setupEmail').isVisible(), true);
}));

test('on a computer the example sits beside the offer', async () => world(async ({ page }) => {
  const form = await page.locator('#start').boundingBox(), flow = await page.locator('.flow').boundingBox();
  assert.ok(flow.x > form.x + form.width, JSON.stringify({ form, flow }));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
}, { viewport: { width: 1280, height: 860 } }));
