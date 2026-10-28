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
async function world(fn, options = {}) {
  const app = express(), rows = [];
  const prisma = { inspectEvent: { upsert: async () => ({}), create: async ({ data }) => { rows.push(data); return data; }, delete: async () => ({}) } };
  registerPayoff(app, { prisma, stripe: { checkout: { sessions: {} }, paymentIntents: {} }, mail: { sendMail: async () => {} }, env: { NODE_ENV: 'test' }, quizShare: 1, ...options });
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

test('a click from an ad records which ad (its utm_content id) once per load, and the letter it leads to records none', async () => world(async ({ page, base, rows }) => {
  await page.goto(base + '/payoff/hidden-payoff?utm_source=facebook&utm_medium=paid&utm_campaign=120251563772910103&utm_content=120251563772920103&fbclid=IwAR0story');
  await settle(page, rows, ['PayoffFrom:ad', 'PayoffAd:120251563772920103']);
  assert.deepEqual(named(rows).filter(name => name.startsWith('PayoffAd')), ['PayoffAd:120251563772920103']);
  await page.locator('a.adv-cta').first().tap();
  await page.waitForURL(url => url.pathname === '/payoff');
  await settle(page, rows, ['PayoffVariant:letter']);
  assert.equal(named(rows).filter(name => name.startsWith('PayoffAd')).length, 1);
  // A tag that is not an ad id is not sent.
  await page.goto(base + '/payoff/hidden-payoff?utm_content=summer-sale&fbclid=IwAR0story');
  await page.waitForTimeout(300);
  assert.equal(named(rows).filter(name => name.startsWith('PayoffAd')).length, 1);
}));

test('the landing test: a letter-side visitor lands on the sales letter with the ad click and the ad recorded, a story-side visitor on the story page, each recorded once; a forced look records no side', async () => {
  const AD = '/payoff/hidden-payoff?utm_source=facebook&utm_medium=paid&utm_content=120251580459180103&fbclid=IwAR0story';
  let draw = 0.2;
  await world(async ({ page, base, rows }) => {
    await page.goto(base + AD);
    assert.equal(new URL(page.url()).pathname, '/payoff');
    assert.equal(await page.locator('body').getAttribute('data-variant'), 'letter');
    await settle(page, rows, ['PayoffEntry:letter', 'PayoffFrom:ad', 'PayoffAd:120251580459180103', 'PayoffVariant:letter']);
    for (const name of ['PayoffEntry:letter', 'PayoffFrom:ad', 'PayoffAd:120251580459180103', 'PayoffVariant:letter']) assert.ok(named(rows).includes(name), name);
    assert.ok(!named(rows).some(name => name.startsWith('PayoffStory')), 'they never saw the story page');
    await page.reload(); await page.waitForTimeout(300);
    assert.equal(named(rows).filter(name => name.startsWith('PayoffEntry')).length, 1, 'once per visitor');
  }, { entryShare: 0.5, random: () => draw });
  draw = 0.8;
  await world(async ({ page, base, rows }) => {
    await page.goto(base + AD);
    assert.equal(new URL(page.url()).pathname, '/payoff/hidden-payoff');
    await settle(page, rows, ['PayoffEntry:story', 'PayoffFrom:ad', 'PayoffStory:viewed']);
    assert.ok(named(rows).includes('PayoffEntry:story'));
    // Through the story page to the letter: still one side, the story one.
    await page.locator('a.adv-cta').first().tap();
    await page.waitForURL(url => url.pathname === '/payoff');
    await settle(page, rows, ['PayoffVariant:letter']);
    assert.deepEqual(named(rows).filter(name => name.startsWith('PayoffEntry')), ['PayoffEntry:story']);
  }, { entryShare: 0.5, random: () => draw });
  await world(async ({ page, base, rows }) => {
    await page.goto(base + '/payoff/hidden-payoff?entry=letter&fbclid=IwAR0look');
    assert.equal(new URL(page.url()).pathname, '/payoff');
    await settle(page, rows, ['PayoffFrom:ad']);
    await page.waitForTimeout(200);
    assert.ok(!named(rows).some(name => name.startsWith('PayoffEntry')), 'a forced look joins no side');
  }, { entryShare: 0.5, random: () => 0.2 });
});

test('a visitor who reaches the letter without the story page is still asked where they came from', async () => world(async ({ page, base, rows }) => {
  await page.goto(base + '/payoff?v=letter');
  await settle(page, rows, ['PayoffFrom:direct']);
  assert.ok(named(rows).includes('PayoffFrom:direct'));
  assert.ok(!named(rows).some(name => name.startsWith('PayoffStory')));
}));

test('the story page and the sales letter count time on screen, each letter section reached, and the buttons and answers tapped, once per visitor', async () => world(async ({ page, base, rows }) => {
  // A second of the on-screen clock passes every 10 ms here.
  await page.addInitScript(() => { const every = window.setInterval; window.setInterval = (fn, ms, ...rest) => every(fn, ms === 1000 ? 10 : ms, ...rest); });
  await page.goto(base + '/payoff/hidden-payoff?fbclid=IwAR0story');
  await settle(page, rows, ['PayoffStory:time10', 'PayoffStory:time60', 'PayoffStory:time180']);
  for (const step of ['time10', 'time60', 'time180']) assert.equal(named(rows).filter(name => name === 'PayoffStory:' + step).length, 1, step);

  await page.locator('a.adv-cta').first().tap();
  await page.waitForURL(url => url.pathname === '/payoff');
  await settle(page, rows, ['PayoffVariant:letter', 'PayoffLetter:time10']);
  assert.ok(!named(rows).some(name => /PayoffLetter:(problem|example|end)/.test(name)), 'the first screen reaches no section yet');
  await page.locator('[data-section="example"]').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100));
  await settle(page, rows, ['PayoffLetter:problem', 'PayoffLetter:example']);
  assert.ok(!named(rows).includes('PayoffLetter:faq') && !named(rows).includes('PayoffLetter:end'));
  await page.locator('.calculation-details summary').click();
  // A fling to the bottom still counts every section on the way.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page, rows, ['PayoffLetter:faq']);
  for (let y = 0; y < 20 && !named(rows).includes('PayoffLetter:end'); y++) { await page.mouse.wheel(0, 3000); await page.waitForTimeout(50); }
  const sections = ['problem', 'example', 'mechanism', 'proof', 'founder', 'included', 'faq', 'end'];
  await settle(page, rows, sections.map(step => 'PayoffLetter:' + step));
  await page.locator('[data-section="faq"] details summary').first().click();
  await settle(page, rows, ['PayoffLetter:math-open', 'PayoffLetter:faq-open']);
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  for (const step of [...sections, 'math-open', 'faq-open', 'time10']) assert.equal(named(rows).filter(name => name === 'PayoffLetter:' + step).length, 1, step);

  await page.locator('[data-placement="faq"] .cta').tap();
  await page.waitForURL(url => url.pathname === '/payoff/order');
  await settle(page, rows, ['PayoffLetter:tap-faq', 'PayoffOrderViewed']);
  assert.deepEqual(named(rows).filter(name => name.startsWith('PayoffLetter:tap-')), ['PayoffLetter:tap-faq'], 'the button they used, by its section');
}));
