'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

const phone = { width: 390, height: 844 };
// The Claims launch price ends at a fixed moment (2026-10-02T06:59:59Z); pages
// that show it are pinned before that, so they read the same any day they run.
const DURING_LAUNCH = '2026-09-30T12:00:00Z';
const count = (h, name) => h.events.filter(event => event.name === name).length;
// The page's one-second clock at fifty times speed, and a switch for whether
// the tab is on screen, so twenty seconds takes under half a second here.
const fastClock = async (h, { hidden = false } = {}) => {
  await h.context.addInitScript(startHidden => {
    const real = window.setInterval.bind(window);
    window.setInterval = (fn, ms, ...rest) => real(fn, Math.max(1, (ms || 0) / 50), ...rest);
    window.__hidden = startHidden;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hidden ? 'hidden' : 'visible') });
  }, hidden);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('#offer-video');
};

// An ad visitor arrives without ?sim: the price as the headline, the real app
// making a report, and one offer under it. No simulation stands between them
// and the price, and no subscription is in it: Claims is paid once.
test('phone: an ad visitor gets $99 once as the headline, the video, and one button', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#offer-video');
    const video = await h.page.evaluate(() => { const v = document.getElementById('offer-video'); return { muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.getAttribute('src'), poster: v.getAttribute('poster') }; });
    assert.deepEqual({ muted: video.muted, loop: video.loop, inline: video.inline }, { muted: true, loop: true, inline: true });
    assert.match(video.src, /^https:\/\/res\.cloudinary\.com\/.+\.mp4$/);
    assert.match(video.poster, /^https:\/\/res\.cloudinary\.com\/.+\.jpg$/);
    assert.equal(await h.page.$('[data-sim-pick]'), null, 'no simulation');
    assert.match((await h.page.textContent('h1')).trim(), /^\$99 once\.\s*Unlimited damage reports\.$/);
    const text = await h.body();
    assert.match(text, /No subscription\. Nothing renews\./);
    assert.match(text, /38 seconds/);
    assert.match(text, /Pay once\. Keep it for good\./);
    assert.match(text, /One payment of \$99\. No subscription, and nothing renews\./);
    // The launch price: the real plan it replaces, and the real moment it ends.
    assert.match(text, /Instead of \$199 every year/);
    assert.match(text, /Launch price ends in 1d 18:5\d:\d\d · then \$199/);
    assert.match(text, /Launch price until Thu, Oct 1, 11:59 PM PT, then \$199\./);
    // No trial, no monthly price, no plan to switch, no $12-a-report side door.
    assert.doesNotMatch(text, /free for 3 days|\/month|\/year|Keep it free|\$12/i);
    assert.equal(await h.page.$('[data-sim-plan]'), null);
    assert.equal(await h.page.$('#sim-keep'), null);
    assert.equal(await h.page.isVisible('#sim-paybar-buy'), true, 'the price bar is there from the first second');
    // The bar is what a phone visitor keeps seeing: the plan it replaces, the
    // price, and when it becomes $199.
    assert.match((await h.page.textContent('#sim-paybar')).replace(/\s+/g, ' '), /\$199\/yr \$99 once\s*Then \$199 in 1d 18:5\d:\d\d\s*Get it/);
    assert.equal(await h.page.textContent('#sim-paybar s'), '$199/yr');
    assert.equal(await h.page.getAttribute('#sim-paybar small', 'class'), 'bar-clock');
    // It ticks.
    const before = await h.page.textContent('[data-launch-left]');
    await h.page.waitForTimeout(1300);
    assert.notEqual(await h.page.textContent('[data-launch-left]'), before);
    const bar = await h.page.evaluate(() => { const box = el => document.querySelector(el).getBoundingClientRect();
      return { button: box('#sim-paybar-buy').height, price: box('#sim-paybar strong').bottom, terms: box('#sim-paybar small').top }; });
    assert.ok(bar.button <= 56, JSON.stringify(bar));
    assert.ok(bar.terms >= bar.price - 1, 'the clock sits under $99 once');
    const shown = await h.page.evaluate(() => [...document.querySelectorAll('[hidden]')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id || el.className));
    assert.deepEqual(shown, []);
    const landed = h.events.find(event => event.name === 'OfferLanded');
    assert.deepEqual({ tool: landed?.tool, detail: landed?.detail }, { tool: 'claims', detail: 'phone' });
    // The button goes straight to Stripe, whose page takes the email.
    await h.page.click('#sim-paybar-buy');
    for (let i = 0; i < 30 && !h.purchases.length; i++) await h.page.waitForTimeout(100);
    assert.equal(count(h, 'SimCheckoutTapped'), 1, 'the tap is InitiateCheckout');
    assert.equal(h.events.find(event => event.name === 'SimCheckoutTapped').detail, 'lifetime');
    assert.equal(h.purchases[0]?.tool, 'claims');
    assert.equal(h.purchases[0]?.plan, 'lifetime');
    assert.ok(!('email' in h.purchases[0]), 'Stripe asks for the email, not us');
    assert.equal(count(h, 'SimEmailGiven'), 0);
    h.assertClean();
  } finally { await h.close(); }
});

test('the launch price ends for real: at its moment the page redraws at $199, and after it there is no clock', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: '2026-10-02T06:59:57Z' });
  try {
    await h.page.waitForSelector('[data-launch-left]');
    assert.match(await h.page.textContent('h1'), /^\$99 once\./);
    for (let i = 0; i < 60 && await h.page.$('[data-launch-left]'); i++) await h.page.waitForTimeout(100);
    assert.match((await h.page.textContent('h1')).trim(), /^\$199 once\.\s*Unlimited damage reports\.$/);
    const text = await h.body();
    assert.doesNotMatch(text, /Launch price|Instead of|\$99/);
    assert.match((await h.page.textContent('#sim-paybar')).replace(/\s+/g, ' '), /\$199 once\s*No subscription\s*Get it/);
    h.assertClean();
  } finally { await h.close(); }

  const after = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: '2026-10-05T12:00:00Z' });
  try {
    await after.page.waitForSelector('#offer-video');
    assert.match(await after.page.textContent('#sim-offer'), /Get it for \$199/);
    assert.equal(await after.page.$('[data-launch-left]'), null);
    after.assertClean();
  } finally { await after.close(); }
});

test('after paying once, the thank-you page says it is theirs and nothing renews', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: 'sim=1&checkout=success&session=cs_test_a1GoodSessionIdentifier000001',
    simEmail: { email: 'buyer@example.com' }, viewport: phone });
  try {
    await h.context.addInitScript(() => { try { sessionStorage.setItem('inspect.sim.once', '1'); sessionStorage.setItem('inspect.sim.trial', '0'); } catch {} });
    await h.page.reload({ waitUntil: 'domcontentloaded' });
    await h.page.waitForSelector('.sim-thanks');
    const text = await h.body();
    assert.match(text, /Marketel Claims is yours\./);
    assert.match(text, /Paid once\. No subscription, and nothing renews\./);
    assert.doesNotMatch(text, /free days|subscribed/i);
    h.assertClean();
  } finally { await h.close(); }

  // Paid once again: the second payment is refunded, and the page says so.
  const again = await open({ arm: 'claims', signedIn: false, query: 'sim=1&checkout=success&session=cs_test_a1GoodSessionIdentifier000001',
    simEmail: { email: 'buyer@example.com', alreadyHad: true, refunded: true }, viewport: phone });
  try {
    await again.page.waitForSelector('.sim-thanks');
    for (let i = 0; i < 30 && !/already have Marketel/.test(await again.body()); i++) await again.page.waitForTimeout(100);
    assert.match(await again.body(), /We refunded this payment\./);
    again.assertClean();
  } finally { await again.close(); }
});

test('a paid-once account says nothing renews, and has no subscription to manage', async () => {
  const h = await open({ arm: 'claims', signedIn: true, accountData: { active: true, lifetime: true, interval: 'lifetime', periodEnd: null, remaining: 300 }, viewport: phone });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#account-button');
    await h.page.waitForSelector('#logout');
    const text = await h.page.textContent('#dialog');
    assert.match(text, /Unlimited reports\. Paid once; nothing renews\./);
    assert.equal(await h.page.$('#manage'), null);
    h.assertClean();
  } finally { await h.close(); }
});

// Watching is counted in seconds actually played while on screen, once per
// step, for our own ladder.
test('the video counts a quarter, half and the end once each', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    for (let i = 0; i < 60 && !count(h, 'OfferVideoEnded'); i++) await h.page.waitForTimeout(200);
    await h.page.waitForTimeout(1500);
    assert.deepEqual(['OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded'].map(name => count(h, name)), [1, 1, 1]);
    h.assertClean();
  } finally { await h.close(); }
});

// Stripe's back button returns ?sim=1&checkout=cancelled; someone who came from
// the video lands back on it, told nothing was charged, with a clean address.
test('coming back from Stripe without paying returns to the video landing', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: 'sim=1&checkout=cancelled', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    assert.match(await h.body(), /Nothing was charged\./);
    assert.equal(new URL(h.page.url()).search, '');
    h.assertClean();
  } finally { await h.close(); }
});

test('desktop: the video sits beside the offer, with no pinned bar', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: { width: 1280, height: 900 } });
  try {
    await h.page.waitForSelector('#offer-video');
    const layout = await h.page.evaluate(() => ({ videoRight: document.querySelector('.offer-video').getBoundingClientRect().right,
      offerLeft: document.getElementById('sim-offer').getBoundingClientRect().left, bar: getComputedStyle(document.getElementById('sim-paybar')).display }));
    assert.ok(layout.videoRight < layout.offerLeft, JSON.stringify(layout));
    assert.equal(layout.bar, 'none');
    assert.equal(h.events.find(event => event.name === 'OfferLanded')?.detail, 'desktop');
    h.assertClean();
  } finally { await h.close(); }
});

// The video replaces the simulation only where a wedge has one; ?sim=1 and a
// signed-in owner are untouched.
test('without a landing video, with ?sim=1, or signed in, nothing changes', async () => {
  const moveout = await open({ arm: 'moveout', signedIn: false, query: '', viewport: phone });
  try {
    await moveout.page.waitForSelector('[data-sim-pick]');
    assert.equal(await moveout.page.$('#offer-video'), null);
  } finally { await moveout.close(); }
  const sim = await open({ arm: 'claims', signedIn: false, query: 'sim=1', viewport: phone });
  try {
    await sim.page.waitForSelector('[data-sim-pick]');
    assert.equal(await sim.page.$('#offer-video'), null);
  } finally { await sim.close(); }
  const owner = await open({ arm: 'claims', signedIn: true, query: '', viewport: phone });
  try {
    await owner.page.waitForSelector('#new-report');
    assert.equal(await owner.page.$('#offer-video'), null);
    owner.assertClean();
  } finally { await owner.close(); }
});

// Meta's ViewContent on the video landing: twenty seconds with the page on
// screen, or tapping start free sooner, once per visit, with the Meta ids.
test('twenty seconds on screen is engaged, once, with the Meta ids; a hidden tab does not count', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: 'fbclid=test-click', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    await fastClock(h, { hidden: true });
    await h.page.waitForTimeout(1200);
    assert.equal(count(h, 'OfferEngaged'), 0, 'a minute behind other tabs is not engaged');
    await h.page.evaluate(() => { window.__hidden = false; });
    for (let i = 0; i < 30 && !count(h, 'OfferEngaged'); i++) await h.page.waitForTimeout(100);
    await h.page.waitForTimeout(600);
    assert.equal(count(h, 'OfferEngaged'), 1);
    assert.match(String(h.events.find(event => event.name === 'OfferEngaged').attribution?.fbc || ''), /test-click/);
    h.assertClean();
  } finally { await h.close(); }
});

test('tapping start free before twenty seconds is engaged at once', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    await h.page.click('#sim-buy');
    for (let i = 0; i < 30 && !h.purchases.length; i++) await h.page.waitForTimeout(100);
    assert.deepEqual([count(h, 'OfferEngaged'), count(h, 'SimCheckoutTapped'), h.purchases.length], [1, 1, 1]);
    h.assertClean();
  } finally { await h.close(); }
});

// Someone already paying who checked out again: the webhook cancels the new
// plan while it is free, and the thank-you page says so.
test('the thank-you page tells someone who already pays that nothing was charged', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: 'sim=1&checkout=success&session=cs_test_a1GoodSessionIdentifier000001',
    simEmail: { email: 'payer@example.com', alreadyHad: true }, viewport: phone });
  try {
    await h.page.waitForSelector('.sim-thanks');
    for (let i = 0; i < 30 && !/already have Marketel/.test(await h.body()); i++) await h.page.waitForTimeout(100);
    const text = await h.body();
    assert.match(text, /You already have Marketel\./);
    assert.match(text, /Nothing was charged for this one\./);
    assert.match(text, /payer@example\.com/);
    h.assertClean();
  } finally { await h.close(); }
});
