'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

const phone = { width: 390, height: 844 };
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

// An ad visitor arrives without ?sim: the headline the ad promised, the real
// app making a report, and the offer under it. No simulation stands between
// them and the price.
test('phone: an ad visitor gets the video, the price and start free', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    const video = await h.page.evaluate(() => { const v = document.getElementById('offer-video'); return { muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.getAttribute('src'), poster: v.getAttribute('poster') }; });
    assert.deepEqual({ muted: video.muted, loop: video.loop, inline: video.inline }, { muted: true, loop: true, inline: true });
    assert.match(video.src, /^https:\/\/res\.cloudinary\.com\/.+\.mp4$/);
    assert.match(video.poster, /^https:\/\/res\.cloudinary\.com\/.+\.jpg$/);
    assert.equal(await h.page.$('[data-sim-pick]'), null, 'no simulation');
    const text = await h.body();
    assert.match(text, /Document guest damage/);
    assert.match(text, /38 seconds/);
    assert.match(text, /Try it free for 3 days\./);
    assert.equal(await h.page.isVisible('#sim-paybar-buy'), true, 'the price bar is there from the first second');
    // Free for the whole three days, so the bar can say it; the price after it keeps its dollar sign.
    assert.match((await h.page.textContent('#sim-paybar')).replace(/\s+/g, ' '), /Free for 3 days\s*then \$25\/month\s*Start free/);
    assert.doesNotMatch(await h.body(), /first report if sooner/);
    const shown = await h.page.evaluate(() => [...document.querySelectorAll('[hidden]')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.id || el.className));
    assert.deepEqual(shown, []);
    const landed = h.events.find(event => event.name === 'OfferLanded');
    assert.deepEqual({ tool: landed?.tool, detail: landed?.detail }, { tool: 'claims', detail: 'phone' });
    await h.page.click('#sim-paybar-buy');
    await h.page.waitForSelector('#sim-email-field');
    assert.equal(count(h, 'SimCheckoutTapped'), 1, 'start free is InitiateCheckout');
    assert.equal((await h.page.textContent('#sim-email-back')).trim(), '← Back');
    await h.page.click('#sim-email-back');
    await h.page.waitForSelector('#offer-video');
    await h.page.click('#sim-buy');
    await h.page.fill('#sim-email-field', 'host@example.test');
    await h.page.click('#sim-email-go');
    await h.page.waitForTimeout(100);
    assert.ok(h.events.some(event => event.name === 'SimEmailGiven'));
    assert.equal(h.purchases[0]?.tool, 'claims');
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

test('tapping start free before twenty seconds is engaged at once, and only once', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone });
  try {
    await h.page.waitForSelector('#offer-video');
    await h.page.click('#sim-buy');
    await h.page.waitForSelector('#sim-email-field');
    await h.page.waitForTimeout(100);
    assert.deepEqual([count(h, 'OfferEngaged'), count(h, 'SimCheckoutTapped')], [1, 1]);
    await h.page.click('#sim-email-back');
    await h.page.waitForSelector('#offer-video');
    await h.page.click('#sim-buy');
    await h.page.waitForTimeout(100);
    assert.equal(count(h, 'OfferEngaged'), 1, 'once per visit');
    h.assertClean();
  } finally { await h.close(); }
});
