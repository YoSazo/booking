'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff } = require('../../payoff');

// A real phone browser (not flagged as a test browser), so the funnel events
// are sent and can be checked. The quiz takes every new visitor here, so the
// story page's buttons have to choose the letter themselves.
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS]';
async function world(fn) {
  const app = express(), rows = [];
  const prisma = { inspectEvent: { upsert: async () => ({}), create: async ({ data }) => { rows.push(data); return data; }, delete: async () => ({}) } };
  registerPayoff(app, { prisma, stripe: { checkout: { sessions: {} }, paymentIntents: {} }, mail: { sendMail: async () => {} }, env: { NODE_ENV: 'test' }, quizShare: 1 });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: PHONE_UA });
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await fn({ page, base, rows });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const named = rows => rows.map(row => row.detail ? `${row.name}:${row.detail}` : row.name);
const settle = async (page, rows, want) => {
  for (let i = 0; i < 40 && !want.every(name => named(rows).includes(name)); i++) await page.waitForTimeout(50);
};

test('the story page reads as the article, counts the ad click once, and every button opens the sales letter', async () => world(async ({ page, base, rows }) => {
  await page.goto(base + '/payoff/hidden-payoff?fbclid=IwAR0story');
  assert.match(await page.locator('.adv-topbar').innerText(), /10,000\+ Sold.*One-Time Purchase.*30-Day Money-Back Guarantee/);
  assert.match(await page.locator('h1').innerText(), /\$122,000/);
  assert.match(await page.locator('.adv-disclaimer').innerText(), /THIS IS AN ADVERTISEMENT/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const links = await page.locator('a.adv-cta').evaluateAll(list => list.map(a => a.getAttribute('href')));
  assert.deepEqual(links, ['/payoff?v=letter&from=story', '/payoff?v=letter&from=story', '/payoff?v=letter&from=story']);
  await settle(page, rows, ['PayoffLanded', 'PayoffFrom:ad', 'PayoffStory:viewed']);
  assert.deepEqual(named(rows).sort(), ['PayoffFrom:ad', 'PayoffLanded', 'PayoffStory:viewed']);

  // Nothing about reading depth until they scroll; then each step once, in order.
  assert.ok(!named(rows).some(name => /PayoffStory:(scroll|button)/.test(name)));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.3));
  await settle(page, rows, ['PayoffStory:scroll25']);
  assert.ok(named(rows).includes('PayoffStory:scroll25'));
  assert.ok(!named(rows).includes('PayoffStory:scroll50') && !named(rows).includes('PayoffStory:button'));
  await page.locator('a.adv-cta').first().scrollIntoViewIfNeeded();
  await settle(page, rows, ['PayoffStory:scroll50', 'PayoffStory:button']);
  for (let y = 0; y < 30; y++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(30); }
  await settle(page, rows, ['PayoffStory:scroll75', 'PayoffStory:scroll100']);
  for (const step of ['scroll25', 'scroll50', 'button', 'scroll75', 'scroll100']) {
    assert.equal(named(rows).filter(name => name === 'PayoffStory:' + step).length, 1, step);
  }

  // A second look in the same visit is not a second reader.
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  assert.equal(named(rows).filter(name => name === 'PayoffStory:viewed').length, 1);
  assert.equal(named(rows).filter(name => name === 'PayoffStory:scroll100').length, 1);

  await page.locator('a.adv-cta').last().tap();
  await page.waitForURL(url => url.pathname === '/payoff' && url.searchParams.get('from') === 'story');
  assert.equal(await page.locator('body').getAttribute('data-variant'), 'letter');
  await settle(page, rows, ['PayoffStory:tapped', 'PayoffVariant:letter']);
  assert.ok(named(rows).includes('PayoffStory:tapped'));
  assert.ok(named(rows).includes('PayoffVariant:letter'));
  // The source was the ad, recorded on the story page (once per load); the letter adds no other.
  const sources = named(rows).filter(name => name.startsWith('PayoffFrom'));
  assert.ok(sources.length && sources.every(name => name === 'PayoffFrom:ad'), sources.join());
}));

test('a visitor who reaches the letter without the story page is still asked where they came from', async () => world(async ({ page, base, rows }) => {
  await page.goto(base + '/payoff?v=letter');
  await settle(page, rows, ['PayoffFrom:direct']);
  assert.ok(named(rows).includes('PayoffFrom:direct'));
  assert.ok(!named(rows).some(name => name.startsWith('PayoffStory')));
}));
