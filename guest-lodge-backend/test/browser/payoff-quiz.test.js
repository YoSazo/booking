'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { registerPayoff } = require('../../payoff');
const E = require('../../payoff-web/engine');

// A real phone browser (not flagged as a test browser), so the funnel events
// are sent and can be checked; every request is kept to look for leaked numbers.
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS]';
async function world(fn, { width = 390 } = {}) {
  const app = express(), rows = [];
  let clockOffset = 0;
  const prisma = { inspectEvent: { upsert: async () => ({}), create: async ({ data }) => { rows.push(data); return data; }, delete: async () => ({}) } };
  registerPayoff(app, { prisma, stripe: { checkout: { sessions: {} }, paymentIntents: {} }, mail: { sendMail: async () => {} }, env: { NODE_ENV: 'test' }, quizShare: 1, now: () => Date.now() + clockOffset });
  app.use(express.static(path.resolve(__dirname, '../../public')));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, userAgent: PHONE_UA });
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.route('https://js.stripe.com/v3/', route => route.fulfill({ body: '', headers: { 'content-type': 'application/javascript' } }));
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => requests.push({ url: request.url(), body: request.postData() || '' }));
    await fn({ page, base, rows, requests, advanceTime: ms => { clockOffset += ms; } });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const now = new Date(), start = { year: now.getFullYear(), month: now.getMonth() };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CARDS = [{ id: 'q1', name: 'Card 1', type: 'card', balance: 420000, apr: 24, minimum: 12600 }, { id: 'q2', name: 'Card 2', type: 'card', balance: 150000, apr: 19.99, minimum: 3500 }];
const money = cents => '$' + Math.round(cents / 100).toLocaleString('en-US');
// The "what's in the way" question and the screen that answers it.
const pastWhy = async (page, answer = 'which card to pay first') => {
  await page.locator('.choice', { hasText: answer }).click();
  await page.locator('.go', { hasText: 'Show me with my cards' }).click();
};

test('the quiz opens on the ad\'s hook and walks to the real date on minimums, the plan and the order page, with the cards handed to the tool', async () => world(async ({ page, base, rows, requests }) => {
  await page.goto(base + '/payoff');
  assert.equal(await page.locator('body').getAttribute('data-variant'), 'quiz');
  assert.equal((await page.locator('.caption').innerText()).replace(/\s+/g, ' ').trim(), 'CREDIT CARD HOLDERS 👇');
  assert.equal(await page.locator('#back').isHidden(), true);
  await page.locator('#offer-bar:not([hidden])').waitFor();
  assert.equal((await page.locator('#offer-bar').innerText()).trim(), '🎁 Finish in 10 minutes for an extra $5 off');
  await page.locator('.choice', { hasText: '2' }).click();
  await page.locator('#deal-clock:not([hidden])').waitFor();
  assert.match((await page.locator('#offer-bar').innerText()).replace(/\s+/g, ' ').trim(), /^🎁 Finish in (10:00|09:\d\d) to unlock an extra \$5 off$/);
  assert.match(await page.locator('.kicker').innerText(), /2 cards/);
  await page.locator('#back').click();
  assert.equal(await page.locator('.caption').count(), 1, 'back returns to the hook');
  await page.locator('.choice', { hasText: '2' }).click();
  await page.locator('.choice', { hasText: 'Mostly the minimums' }).click();
  // What's in the way, said back and turned toward the plan.
  await page.locator('.kicker', { hasText: 'No judgment. Most people start right here.' }).waitFor();
  await page.locator('.choice', { hasText: 'which card to pay first' }).click();
  await page.locator('.insight .kicker', { hasText: 'You said: “I don’t know which card to pay first.”' }).waitFor();
  assert.equal(await page.locator('.insight .q').innerText(), 'That’s the part nobody tells you.');
  await page.locator('.go', { hasText: 'Show me with my cards' }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'balance-0', 'the number field is ready to type');
  await page.locator('.go').click();
  assert.match(await page.locator('.error').innerText(), /Enter a number/);
  await page.fill('#balance-0', '4,200'); await page.keyboard.press('Enter');
  await page.locator('.chip', { hasText: 'Use 24%' }).click();
  assert.equal(await page.locator('.fact').innerText(), 'At 24%, this card adds about $84 in interest every month.');
  await page.locator('.chip', { hasText: 'Use about $126' }).click();
  assert.equal(await page.locator('.done').innerText(), '✓ Card 1 added: about $84 of its $126 minimum is interest.');
  await page.fill('#balance-1', '1500'); await page.locator('.go').click();
  await page.reload();
  assert.equal(await page.locator('#apr-1').count(), 1, 'a reload keeps their place');
  await page.fill('#apr-1', '19.99'); await page.locator('.go').click();
  await page.fill('#minimum-1', '9000'); await page.locator('.go').click();
  assert.match(await page.locator('.error').innerText(), /more than the balance/);
  await page.fill('#minimum-1', '35'); await page.locator('.go').click();

  const minimums = E.plan(CARDS, { start }).minimums;
  // The year rolls up from this year to theirs.
  await page.locator('.big', { hasText: `${MONTHS[minimums.date.month]} ${minimums.date.year}` }).waitFor();
  assert.match(await page.locator('.reveal .sub').innerText(), new RegExp(`with \\${money(minimums.totalInterest)} paid in interest`));
  assert.equal(await page.locator('.reveal .fact').innerText(), 'Right now, about $109 of your $161 in minimums goes to interest every month.');
  assert.equal(await page.locator('.reveal .echo').innerText(), 'That’s paying every card its minimum, with no order.');
  await page.locator('.go').click();
  const plain = E.plan(CARDS, { start }), plainFastest = plain.plans.find(plan => plan.key === plain.fastest);
  assert.match(await page.locator('.baseline').innerText(), new RegExp(`keep paying what you pay now, in the right order, and you’re out .+ sooner\\.$`));
  assert.ok(plainFastest.months < minimums.months);
  assert.equal(await page.locator('.go', { hasText: 'Build my plan' }).isDisabled(), true);
  await page.locator('.choice', { hasText: '+$100' }).click();
  const planned = E.plan(CARDS, { extra: 10000, start }), fastest = planned.plans.find(plan => plan.key === planned.fastest);
  await page.locator('.impact span', { hasText: money(minimums.totalInterest - fastest.totalInterest) + ' less interest' }).waitFor();
  await page.locator('.go', { hasText: 'Build my plan' }).click();
  await page.locator('.plan .sales-offer [data-price]:has-text("Today: $28 ($5 off · 15% off)")').waitFor();
  assert.equal(await page.locator('.plan .offer-was').innerText(), 'Today: $33');
  assert.match(await page.locator('.plan .q').innerText(), /sooner\.$/);
  assert.equal(await page.locator('.locked .blurred').count(), 3);
  assert.equal((await page.locator('.told').innerText()).replace(/\s+/g, ' ').trim(), 'You told us: “I don’t know which card to pay first.” Your plan: The exact order, and what to pay on each card every month.');
  assert.equal(await page.locator('#worth').innerText(), `Your plan could save you ${money(minimums.totalInterest - fastest.totalInterest)} in interest. It costs $375 $33 $28, once.`);
  assert.deepEqual(await page.locator('#worth s').allInnerTexts(), ['$375', '$33'], 'the earlier prices are crossed out');
  // Finishing in time earns the $5; its looping clock starts at checkout.
  assert.equal((await page.locator('#offer-bar').innerText()).replace(/\s+/g, ' ').trim(), '🎉 You unlocked an extra $5 off! It’s reserved for you at checkout.');
  assert.equal(await page.locator('#offer-saved').innerText(), 'Your extra $5 is reserved for you when you open checkout.');
  assert.equal(await page.locator('.plan img.proof').count(), 5);
  assert.equal(await page.locator('.plan').innerText().then(text => text.includes(`${MONTHS[fastest.date.month]} ${fastest.date.year}`)), false, 'the plan\'s date stays locked');
  await page.locator('a.go', { hasText: 'Unlock My Plan' }).click();
  await page.waitForURL(url => url.pathname === '/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  assert.match(`${await page.locator('#reserve-minutes').innerText()}:${await page.locator('#reserve-seconds').innerText()}`, /^(05:00|04:5\d)$/, 'the clock starts at checkout');
  assert.equal(await page.locator('#order-total').innerText(), '$28.00');
  const handed = await page.evaluate(() => JSON.parse(localStorage.getItem('payoff.v1')));
  assert.deepEqual(handed, { debts: CARDS, extra: 10000, plan: null, seen: true });

  const sent = rows.map(row => row.name + (row.detail ? ':' + row.detail : ''));
  for (const name of ['PayoffLanded', 'PayoffVariant:quiz', 'PayoffQuizStep:q1', 'PayoffQuizStep:q2', 'PayoffQuizStep:why-order', 'PayoffQuizStep:card-1', 'PayoffQuizStep:cards',
    'PayoffQuizStep:reveal', 'PayoffQuizStep:extra', 'PayoffQuizStep:plan', 'PayoffQuizStep:unlock', 'PayoffOrderViewed']) assert.ok(sent.includes(name), name);
  assert.equal(sent.filter(name => name === 'PayoffQuizStep:q1').length, 1, 'each step once, even after going back');
  // As whole values: random visitor and attempt ids can contain the same digits.
  for (const secret of ['4200', '4,200', '1500', '19.99', '12600', '126']) {
    const value = new RegExp(`(?<![A-Za-z0-9_.,-])${secret.replace(/[.,]/g, '\\$&')}(?![A-Za-z0-9_-])`);
    assert.ok(requests.every(request => !value.test(request.url) && !value.test(request.body)), `${secret} left the phone`);
  }
}));
test('the tool keeps cards it already has; one card and "4 or more" read right; no sideways scroll', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff');
  await page.evaluate(() => localStorage.setItem('payoff.v1', JSON.stringify({ debts: [{ id: 'mine', name: 'Visa', type: 'card', balance: 100000, apr: 20, minimum: 3000 }], extra: 0 })));
  await page.locator('.choice', { hasText: '4+' }).click();
  assert.match(await page.locator('.kicker').innerText(), /Start with your 4 biggest/);
  await page.locator('#back').click();
  await page.locator('.choice', { hasText: '1' }).first().click();
  await page.locator('.choice', { hasText: 'As much as I can' }).click();
  await pastWhy(page, 'spreadsheets');
  await page.fill('#balance-0', '900'); await page.locator('.go').click();
  await page.fill('#apr-0', '0'); await page.locator('.go').click();
  await page.fill('#minimum-0', '30'); await page.locator('.go').click();
  await page.locator('.go').click();
  await page.locator('.choice', { hasText: '$0' }).click();
  assert.match(await page.locator('.impact').innerText(), /Same money you pay now/);
  await page.locator('.go', { hasText: 'Build my plan' }).click();
  assert.match(await page.locator('.wins').innerText(), /A plan for your card/);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, String(width));
  }
  await page.locator('a.go').click(); await page.waitForURL(url => url.pathname === '/payoff/order');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('payoff.v1')).debts[0].id), 'mine');
}));
test('cards whose minimums never cover the interest are told so, and a plan still shows how to finish', async () => world(async ({ page, base }) => {
  await page.goto(base + '/payoff');
  await page.locator('.choice', { hasText: '1' }).first().click();
  await page.locator('.choice', { hasText: 'Mostly the minimums' }).click();
  await pastWhy(page, 'interest');
  await page.fill('#balance-0', '10000'); await page.locator('.go').click();
  await page.fill('#apr-0', '29.99'); await page.locator('.go').click();
  await page.fill('#minimum-0', '200'); await page.locator('.go').click();
  assert.match(await page.locator('.reveal .q').innerText(), /never be paid off/);
  await page.locator('.go').click();
  await page.locator('.choice', { hasText: '+$200' }).click();
  assert.match(await page.locator('.impact').innerText(), /Paid off for good/);
}));

test('taking longer than 10 minutes means no extra $5: the bar goes, the plan and checkout show $33', async () => world(async ({ page, base, advanceTime }) => {
  await page.goto(base + '/payoff');
  await page.locator('.choice', { hasText: '1' }).first().click();
  await page.locator('#deal-clock:not([hidden])').waitFor();
  await page.locator('.choice', { hasText: 'Mostly the minimums' }).click();
  await pastWhy(page, 'interest');
  await page.fill('#balance-0', '3000'); await page.locator('.go').click();
  await page.locator('.chip').click(); await page.locator('.chip').click();
  advanceTime(11 * 60000);
  await page.locator('.go').click();
  await page.locator('.choice', { hasText: '+$50' }).click();
  await page.locator('.go', { hasText: 'Build my plan' }).click();
  await page.locator('#offer-bar[hidden]').waitFor({ state: 'attached' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#offer-bar').isHidden(), true);
  assert.equal(await page.locator('.plan [data-price]').innerText(), 'Today: $33 (91% off)');
  assert.equal(await page.locator('#offer-saved').isHidden(), true);
  await page.locator('a.go').click(); await page.waitForURL(url => url.pathname === '/payoff/order');
  await page.locator('#buy-button:enabled').waitFor();
  assert.equal(await page.locator('#glance-gift').isHidden(), true, 'no free gift line');
  assert.equal(await page.locator('#glance-price').innerText(), '33');
  assert.equal(await page.locator('#order-total').innerText(), '$33.00');
}));
