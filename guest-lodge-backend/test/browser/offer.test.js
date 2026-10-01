'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('./harness');

const phone = { width: 390, height: 844 };
// The Claims launch price ends at a fixed moment set in its manifest; pages that
// show it are pinned to a time before that, so they read the same on any day.
const OFFER = require('../../wedges/claims').offer;
const LAUNCH = OFFER.launch.price, STANDING = OFFER.lifetime;
const LAUNCH_END = Date.parse(OFFER.launch.until);
const at = offsetMs => new Date(LAUNCH_END + offsetMs).toISOString();
const HOUR = 3600000;
const DURING_LAUNCH = at(-42 * HOUR);
const launchEndText = `${new Date(LAUNCH_END).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} PT`;
// The pay-once landing opens on the recording and one question; the offer is the answer.
const choose = async (h, which = 'yes', reason = 'price') => {
  if (which === 'yes') await h.page.click('#pick-yes');
  else {
    await h.page.click('#pick-no');
    await h.page.waitForSelector(`[data-reason="${reason}"]`, { state: 'visible' });
    await h.page.click(`[data-reason="${reason}"]`);
  }
  await h.page.waitForSelector('#sim-offer', { state: 'visible' });
  await h.page.waitForTimeout(450);
};
const SECONDS = require('../../wedges/claims').landing.video.seconds;
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
test('phone: an ad visitor gets the launch price once as the headline, the video, and one button', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#offer-video');
    await choose(h);
    const video = await h.page.evaluate(() => { const v = document.getElementById('offer-video'); return { muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.getAttribute('src'), poster: v.getAttribute('poster') }; });
    assert.deepEqual({ muted: video.muted, loop: video.loop, inline: video.inline }, { muted: true, loop: true, inline: true });
    assert.match(video.src, /^https:\/\/res\.cloudinary\.com\/.+\.mp4$/);
    assert.match(video.poster, /^https:\/\/res\.cloudinary\.com\/.+\.jpg$/);
    assert.equal(await h.page.$('[data-sim-pick]'), null, 'no simulation');
    assert.match((await h.page.textContent('h1')).trim(), new RegExp(`^\\$${LAUNCH} once\\.\\s*Unlimited damage reports\\.$`));
    const text = await h.body();
    assert.match(text, /No subscription\. Nothing renews\./);
    assert.match(text, new RegExp(`${SECONDS} seconds`));
    assert.match(text, /Pay once\. Keep it for good\./);
    // The paragraph of fine print is not on the page; the terms page carries it.
    assert.doesNotMatch(text, /One payment of|Launch price until|fair use/);
    assert.match(require('fs').readFileSync(require('path').join(__dirname, '../../public/inspect/terms.html'), 'utf8'), new RegExp(`\\$${LAUNCH} USD at its launch price until`));
    // Signing in is the header's job; the landing carries no second link for it.
    assert.equal(await h.page.$('#offer-sign-in'), null);
    assert.doesNotMatch(text, /Already have/);
    // What they get is a list right under the button, inside the card.
    const under = await h.page.evaluate(() => { const card = document.getElementById('sim-offer'), button = document.getElementById('sim-buy'), list = card.querySelector('.offer-points'), video = document.getElementById('offer-video'); return { inside: !!list, below: !!list && list.getBoundingClientRect().top >= button.getBoundingClientRect().bottom, nextIsList: button.nextElementSibling === list, items: list ? [...list.querySelectorAll('li')].map(li => li.textContent) : [], beforeVideo: !!list && list.getBoundingClientRect().bottom <= video.getBoundingClientRect().top, outside: document.querySelectorAll('.offer-buy > .offer-points').length }; });
    assert.deepEqual({ inside: under.inside, below: under.below, nextIsList: under.nextIsList, beforeVideo: under.beforeVideo, outside: under.outside }, { inside: true, below: true, nextIsList: true, beforeVideo: true, outside: 0 });
    assert.ok(under.items.some(item => /Talk through a room/.test(item)), JSON.stringify(under.items));
    // The launch price: the real plan it replaces, and the real moment it ends.
    assert.match(text, new RegExp(`Instead of \\$${STANDING}\\b`));
    assert.match(text, new RegExp(`Launch price ends in 1d \\d\\d:\\d\\d:\\d\\d · then \\$${STANDING}`));
    // No trial, no monthly price, no plan to switch, no $12-a-report side door.
    assert.doesNotMatch(text, /free for 3 days|\/month|\/year|Keep it free|\$12/i);
    assert.equal(await h.page.$('[data-sim-plan]'), null);
    assert.equal(await h.page.$('#sim-keep'), null);
    // The offer comes first: its card and button are on the first screen, so the
    // pinned bar stands down until the card scrolls away, then it slides in.
    const first = await h.page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { buy: r('sim-buy').bottom, video: r('offer-video').top, height: window.innerHeight, down: document.getElementById('sim-paybar').classList.contains('is-stood-down') }; });
    assert.ok(first.buy < first.height, 'the button is on the first screen: ' + JSON.stringify(first));
    assert.ok(first.video > first.buy, 'the video is under the offer');
    assert.equal(first.down, true, 'the pinned bar is not repeating the card');
    await h.page.evaluate(() => document.getElementById('offer-video').scrollIntoView({ block: 'center' }));
    await h.page.waitForTimeout(500);
    assert.equal(await h.page.isVisible('#sim-paybar-buy'), true, 'the price bar comes in once the card is behind them');
    // The bar is what a phone visitor keeps seeing: the plan it replaces, the
    // price, and when it becomes the standing price.
    assert.match((await h.page.textContent('#sim-paybar')).replace(/\s+/g, ' '), new RegExp(`\\$${STANDING} \\$${LAUNCH} once\\s*Then \\$${STANDING} in 1d \\d\\d:\\d\\d:\\d\\d\\s*Get it`));
    assert.equal(await h.page.textContent('#sim-paybar s'), `$${STANDING}`);
    assert.equal(await h.page.getAttribute('#sim-paybar small', 'class'), 'bar-clock');
    // It ticks.
    const before = await h.page.textContent('[data-launch-left]');
    await h.page.waitForTimeout(1300);
    assert.notEqual(await h.page.textContent('[data-launch-left]'), before);
    const bar = await h.page.evaluate(() => { const box = el => document.querySelector(el).getBoundingClientRect();
      return { button: box('#sim-paybar-buy').height, price: box('#sim-paybar strong').bottom, terms: box('#sim-paybar small').top }; });
    assert.ok(bar.button <= 56, JSON.stringify(bar));
    assert.ok(bar.terms >= bar.price - 1, 'the clock sits under the price');
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

test('the launch price ends for real: at its moment the page redraws at the standing price, and after it there is no clock', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: at(-3000) });
  try {
    await h.page.waitForSelector('#pick-yes');
    await h.page.click('#pick-yes');
    await h.page.waitForSelector('[data-launch-left]', { state: 'visible' });
    await h.page.waitForFunction(() => /once/.test(document.querySelector('h1').textContent));
    assert.match(await h.page.textContent('h1'), new RegExp(`^\\$${LAUNCH} once\\.`));
    for (let i = 0; i < 60 && await h.page.$('[data-launch-left]'); i++) await h.page.waitForTimeout(100);
    assert.match((await h.page.textContent('h1')).trim(), new RegExp(`^\\$${STANDING} once\\.\\s*Unlimited damage reports\\.$`));
    const text = await h.body();
    assert.doesNotMatch(text, new RegExp(`Launch price|Instead of|\\$${LAUNCH}\\b`));
    assert.match((await h.page.textContent('#sim-paybar')).replace(/\s+/g, ' '), new RegExp(`\\$${STANDING} once\\s*No subscription\\s*Get it`));
    h.assertClean();
  } finally { await h.close(); }

  const after = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: at(24 * HOUR) });
  try {
    await after.page.waitForSelector('#offer-video');
    await choose(after);
    assert.match(await after.page.textContent('#sim-offer'), new RegExp(`Get it for \\$${STANDING}`));
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
    await choose(h);
    await h.page.evaluate(() => document.getElementById('offer-video').scrollIntoView({ block: 'center' }));
    for (let i = 0; i < 60 && !count(h, 'OfferVideoEnded'); i++) await h.page.waitForTimeout(200);
    await h.page.waitForTimeout(1500);
    assert.deepEqual(['OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded'].map(name => count(h, name)), [1, 1, 1]);
    h.assertClean();
  } finally { await h.close(); }
});

// Step one: the recording and one question, with no price on screen. The answer,
// either one, shows the offer on the same page without redrawing the recording.
for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }, { width: 360, height: 640 }]) {
  test(`phone ${size.width}x${size.height}: the recording floats over the page with two buttons under it, and no price in front`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: size, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#offer-video');
      await h.page.waitForTimeout(500);
      const first = await h.page.evaluate(() => { const box = el => el.getBoundingClientRect(), $ = id => document.getElementById(id), fig = box(document.querySelector('.offer-video')), v = box($('offer-video')), yes = box($('pick-yes')), maybe = box($('pick-no')), buy = box($('sim-buy')), front = document.elementFromPoint(buy.left + buy.width / 2, buy.top + buy.height / 2);
        return { height: window.innerHeight, width: window.innerWidth, fig: { position: getComputedStyle(document.querySelector('.offer-video')).position, top: fig.top, bottom: fig.bottom }, video: { top: v.top, bottom: v.bottom, height: v.height, middle: v.left + v.width / 2, radius: parseFloat(getComputedStyle($('offer-video')).borderTopLeftRadius), border: parseFloat(getComputedStyle($('offer-video')).borderTopWidth), fit: getComputedStyle($('offer-video')).objectFit }, surface: { background: getComputedStyle(document.querySelector('.offer-video')).backgroundColor, border: parseFloat(getComputedStyle(document.querySelector('.offer-video')).borderTopWidth), shadow: getComputedStyle(document.querySelector('.offer-video')).boxShadow }, side: { sameRow: Math.abs(yes.top - maybe.top) <= 1, yesLeftOfMaybe: yes.right <= maybe.left + 1 }, yes: { bottom: yes.bottom, top: yes.top, text: $('pick-yes').textContent.trim() }, maybe: { bottom: maybe.bottom, height: maybe.height, text: $('pick-no').textContent.trim() }, label: $('pick-label').textContent.trim(), priceBehindScrim: !front || !front.closest('#sim-offer'), behindIsInert: document.querySelector('.offer-buy').hasAttribute('inert'), scrollLocked: getComputedStyle(document.documentElement).overflow, paybar: getComputedStyle($('sim-paybar')).display, cue: getComputedStyle($('video-cue')).display }; });
      assert.equal(first.fig.position, 'fixed', 'the recording floats');
      assert.match(first.yes.text, /^I want this/);
      assert.equal(first.maybe.text, "I don't want this");
      assert.ok(first.yes.bottom - first.yes.top <= 56 && first.maybe.height <= 56, 'each button is one line: ' + JSON.stringify([first.yes, first.maybe]));
      assert.equal(first.label, `A damage report made in ${SECONDS} seconds`);
      assert.ok(first.yes.bottom <= first.height && first.maybe.bottom <= first.height, 'both buttons are on screen: ' + JSON.stringify(first));
      assert.ok(first.video.bottom <= first.yes.top + 1, 'the buttons do not cover the recording');
      assert.ok(first.video.height >= first.height * 0.6, 'the recording is big: ' + first.video.height);
      assert.ok(Math.abs(first.video.middle - first.width / 2) <= 2, 'the recording is centred');
      assert.ok(first.video.radius >= 20 && first.video.radius <= 30 && first.video.border === 0, 'softly rounded corners and no frame: ' + JSON.stringify(first.video));
      assert.deepEqual([first.surface.background, first.surface.border, first.surface.shadow], ['rgba(0, 0, 0, 0)', 0, 'none'], 'the recording is the surface: no white card');
      assert.deepEqual([first.side.sameRow, first.side.yesLeftOfMaybe], [true, true], 'the two buttons sit side by side');
      assert.ok(first.fig.top >= 70, 'the page header stays clear above the recording');
      assert.equal(first.priceBehindScrim, true, 'the price is behind the card, not in front of it');
      assert.equal(first.behindIsInert, true, 'the page behind cannot be tapped');
      assert.equal(first.scrollLocked, 'hidden', 'the page does not scroll behind the card');
      assert.deepEqual([first.paybar, first.cue], ['none', 'none']);
      h.assertClean();
    } finally { await h.close(); }
  });
}

// "I don't want this" is counted at once, then asks why. Any reason, or Skip, shows
// the offer exactly as "I want this" does.
for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }]) {
  test(`phone ${size.width}x${size.height}: I don't want this asks why before the offer, and the price is one of the choices`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: size, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#pick-no');
      await h.page.waitForTimeout(400);
      await h.page.click('#pick-no');
      await h.page.waitForSelector('[data-reason="price"]', { state: 'visible' });
      await h.page.waitForTimeout(400);
      assert.equal(count(h, 'OfferDeclineTapped'), 1, 'the decline is counted before they answer why');
      const ask = await h.page.evaluate(() => { const vh = window.innerHeight, buttons = [...document.querySelectorAll('[data-reason]')]; return { label: document.getElementById('pick-label').textContent, texts: buttons.map(b => b.textContent.trim()), onScreen: buttons.every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; }), videoShown: getComputedStyle(document.getElementById('offer-video')).display !== 'none', yes: !!document.getElementById('pick-yes'), offerInert: document.querySelector('.offer-buy').hasAttribute('inert'), stage: sessionStorage.getItem('inspect.offerStage') }; });
      assert.equal(ask.label, "What's the main reason?");
      assert.deepEqual(ask.texts, [`$${LAUNCH} is too expensive`, "I don't rent out property", "I don't need this", "I'm not sure it works", 'Skip']);
      assert.equal(ask.onScreen, true, 'every choice fits on screen');
      assert.deepEqual([ask.videoShown, ask.yes, ask.offerInert, ask.stage], [false, false, true, null], 'still asking: the offer is not shown yet');
      await h.page.click('[data-reason="skip"]');
      await h.page.waitForTimeout(600);
      assert.equal(count(h, 'OfferReasonSkipped'), 1);
      assert.equal(await h.page.isVisible('#sim-buy'), true);
      assert.equal(await h.page.$('.pick-reasons'), null);
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('each reason is its own event, then the offer', async () => {
  for (const [key, event] of [['price', 'OfferReasonPrice'], ['noproperty', 'OfferReasonNoProperty'], ['noneed', 'OfferReasonNoNeed'], ['doubt', 'OfferReasonDoubt']]) {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#pick-no');
      await choose(h, 'no', key);
      const names = ['OfferReasonPrice', 'OfferReasonNoProperty', 'OfferReasonNoNeed', 'OfferReasonDoubt', 'OfferReasonSkipped'];
      assert.deepEqual(names.map(name => count(h, name)), names.map(name => (name === event ? 1 : 0)));
      assert.equal(count(h, 'OfferDeclineTapped'), 1);
      assert.equal(await h.page.isVisible('#sim-buy'), true);
      assert.equal(h.events.find(e => e.name === event)?.detail, 'phone');
    } finally { await h.close(); }
  }
});

test('either answer shows the offer on the same page: the recording is not redrawn, and the answer is counted', async () => {
  for (const [which, event] of [['yes', 'OfferWantTapped'], ['no', 'OfferDeclineTapped']]) {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#offer-video');
      await h.page.evaluate(() => { document.getElementById('offer-video').dataset.same = 'yes'; });
      assert.equal(count(h, 'OfferLanded'), 1);
      await choose(h, which);
      assert.equal(await h.page.evaluate(() => document.getElementById('offer-video').dataset.same), 'yes', 'the same video element');
      assert.equal(await h.page.$('#pick-bar'), null);
      assert.equal(await h.page.evaluate(() => window.scrollY), 0);
      assert.match(await h.page.textContent('h1'), new RegExp(`^\\$${LAUNCH} once`));
      assert.equal(await h.page.isVisible('#sim-buy'), true);
      assert.deepEqual(['OfferWantTapped', 'OfferDeclineTapped'].map(name => count(h, name)), which === 'yes' ? [1, 0] : [0, 1]);
      if (which === 'no') assert.equal(count(h, 'OfferReasonPrice'), 1);
      assert.equal(h.events.find(e => e.name === event)?.detail, 'phone');
      assert.equal(count(h, 'OfferLanded'), 1, 'not a second landing');
      // Reloading keeps them on the offer.
      await h.page.reload({ waitUntil: 'domcontentloaded' });
      await h.page.waitForSelector('#sim-offer', { state: 'visible' });
      assert.equal(await h.page.$('#pick-bar'), null);
      h.assertClean();
    } finally { await h.close(); }
  }
});

// Under the offer the recording is as big as fits: all of it on screen at once,
// with gentle corners.
for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
  test(`phone ${size.width}x${size.height}: the recording under the offer shows whole, big, with gentle corners`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: size, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#offer-video');
      await choose(h);
      await h.page.evaluate(() => document.getElementById('offer-video').scrollIntoView({ block: 'center' }));
      await h.page.waitForTimeout(600);
      const v = await h.page.evaluate(() => { const r = document.getElementById('offer-video').getBoundingClientRect(), bar = document.getElementById('sim-paybar').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, width: r.width, middle: r.left + r.width / 2, page: window.innerWidth / 2, vh: window.innerHeight, barTop: bar.top, radius: parseFloat(getComputedStyle(document.getElementById('offer-video')).borderTopLeftRadius) }; });
      assert.ok(v.top >= 64 && v.bottom <= v.barTop, 'all of it is on screen between the header and the price bar: ' + JSON.stringify(v));
      assert.ok(v.height >= v.vh * 0.7, 'big: ' + JSON.stringify(v));
      assert.ok(v.radius > 0 && v.radius <= 18, 'gentle corners: ' + v.radius);
      assert.ok(Math.abs(v.middle - v.page) <= 2, 'centred');
      h.assertClean();
    } finally { await h.close(); }
  });
}

// Answering must not look like a reload: the page underneath stays exactly
// where it is, at full strength, while the card fades away.
test('answering leaves the offer page still: no headline swap, no shift, no flicker', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#pick-yes');
    await h.page.waitForTimeout(500);
    const before = await h.page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { h1: document.querySelector('h1').textContent, h1h: document.querySelector('h1').getBoundingClientRect().height, offerTop: r('sim-offer').top, buyTop: r('sim-buy').top }; });
    await h.page.evaluate(() => {
      window.__samples = [];
      const sample = () => { const o = document.getElementById('sim-offer'), b = document.querySelector('.offer-buy'), r = o.getBoundingClientRect(); window.__samples.push({ opacity: parseFloat(getComputedStyle(b).opacity), top: r.top, h1: document.querySelector('h1').textContent }); if (window.__samples.length < 40) requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
    });
    await h.page.click('#pick-yes');
    await h.page.waitForTimeout(900);
    const samples = await h.page.evaluate(() => window.__samples);
    assert.ok(samples.length >= 30, 'sampled ' + samples.length);
    assert.ok(samples.every(x => x.opacity === 1), 'the offer never fades or flickers: ' + JSON.stringify(samples.map(x => x.opacity).filter(o => o !== 1)));
    assert.ok(samples.every(x => Math.abs(x.top - before.offerTop) <= 0.5), 'the offer never moves: ' + JSON.stringify([...new Set(samples.map(x => Math.round(x.top)))]));
    assert.ok(samples.every(x => x.h1 === before.h1), 'the headline never changes');
    assert.equal(await h.page.evaluate(() => document.querySelector('h1').getBoundingClientRect().height), before.h1h);
    h.assertClean();
  } finally { await h.close(); }
});

test('desktop: the question sits under the recording, and answering shows the offer beside it', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: { width: 1280, height: 800 }, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#pick-yes');
    const layout = await h.page.evaluate(() => { const v = document.getElementById('offer-video').getBoundingClientRect(), y = document.getElementById('pick-yes').getBoundingClientRect(), fig = getComputedStyle(document.querySelector('.offer-video')).position; return { videoBottom: v.bottom, yesTop: y.top, yesBottom: y.bottom, fig, offerShown: getComputedStyle(document.querySelector('.offer-buy')).display !== 'none', height: window.innerHeight }; });
    assert.ok(layout.yesTop >= layout.videoBottom - 1 && layout.yesBottom <= layout.height && layout.fig === 'sticky' && !layout.offerShown, JSON.stringify(layout));
    await choose(h);
    assert.equal(await h.page.isVisible('#sim-buy'), true);
    h.assertClean();
  } finally { await h.close(); }
});

// The recording starts by itself. A tap-to-play button appears only when the
// browser says it wants a tap; an interrupted start is retried quietly, and the
// native player controls never replace it.
const stubPlay = async (h, mode) => {
  await h.context.addInitScript(mode => {
    const real = HTMLMediaElement.prototype.play; let calls = 0;
    window.__tapped = false; document.addEventListener('pointerdown', () => { window.__tapped = true; }, true);
    HTMLMediaElement.prototype.play = function () {
      calls++; window.__playCalls = calls;
      if (mode === 'blocked' && !window.__tapped) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      if (mode === 'interrupted' && calls <= 2) return Promise.reject(Object.assign(new Error('interrupted'), { name: 'AbortError' }));
      return real.call(this);
    };
  }, mode);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('#offer-video');
  await h.page.waitForTimeout(900);
};

test('when the browser wants a tap, a play button sits over the recording, and tapping it plays', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await stubPlay(h, 'blocked');
    const shown = await h.page.evaluate(() => { const b = document.querySelector('.video-play'), v = document.getElementById('offer-video'); if (!b) return null; const r = b.getBoundingClientRect(), vr = v.getBoundingClientRect(); return { dx: Math.abs(r.left + r.width / 2 - (vr.left + vr.width / 2)), dy: Math.abs(r.top + r.height / 2 - (vr.top + vr.height / 2)), controls: v.controls }; });
    assert.ok(shown, 'a play button appears');
    assert.ok(shown.dx <= 2 && shown.dy <= 2, 'centred on the recording: ' + JSON.stringify(shown));
    assert.equal(shown.controls, false, 'not the native controls');
    await h.page.click('.video-play');
    await h.page.waitForTimeout(500);
    assert.equal(await h.page.$('.video-play'), null, 'it goes once the recording plays');
    assert.equal(await h.page.evaluate(() => !document.getElementById('offer-video').paused), true);
    h.assertClean();
  } finally { await h.close(); }
});

test('a play that is merely interrupted is retried, with no button and no controls', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await stubPlay(h, 'interrupted');
    const state = await h.page.evaluate(() => ({ button: !!document.querySelector('.video-play'), controls: document.getElementById('offer-video').controls, playing: !document.getElementById('offer-video').paused, calls: window.__playCalls }));
    assert.deepEqual([state.button, state.controls, state.playing], [false, false, true], JSON.stringify(state));
    h.assertClean();
  } finally { await h.close(); }
});

test('with no trouble at all there is no play button', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#offer-video');
    await h.page.waitForTimeout(900);
    assert.equal(await h.page.$('.video-play'), null);
    assert.equal(await h.page.evaluate(() => document.getElementById('offer-video').controls), false);
    h.assertClean();
  } finally { await h.close(); }
});

// The recording is under the offer, so every phone size is told it is there:
// a pill at the bottom while the offer shows and the recording does not, gone
// once the recording is on screen, and the recording sits in the middle.
for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
  test(`phone ${size.width}x${size.height}: a pill says the recording is below, and the recording is centred`, async () => {
    const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: size, now: DURING_LAUNCH });
    try {
      await h.page.waitForSelector('#offer-video');
      await choose(h);
      await h.page.waitForTimeout(400);
      const cue = await h.page.evaluate(() => { const el = document.getElementById('video-cue'), r = el.getBoundingClientRect(), v = document.getElementById('offer-video').getBoundingClientRect(); return { shown: el.classList.contains('is-shown'), opacity: getComputedStyle(el).opacity, text: el.textContent.trim(), left: r.left, right: r.right, bottom: r.bottom, width: window.innerWidth, height: window.innerHeight, videoOnScreen: Math.max(0, Math.min(v.bottom, window.innerHeight) - Math.max(v.top, 0)) / v.height }; });
      // Either it points to the recording, or the recording is already showing.
      assert.ok(cue.shown || cue.videoOnScreen >= 0.2, JSON.stringify(cue));
      assert.match(cue.text, new RegExp(`See a real report built in ${SECONDS} seconds`));
      assert.ok(cue.left >= 8 && cue.width - cue.right >= 8 && cue.bottom <= cue.height, 'the pill fits on screen: ' + JSON.stringify(cue));
      const middle = await h.page.evaluate(() => { const r = document.getElementById('offer-video').getBoundingClientRect(); return { video: r.left + r.width / 2, page: window.innerWidth / 2 }; });
      assert.ok(Math.abs(middle.video - middle.page) <= 2, 'the recording is centred: ' + JSON.stringify(middle));
      if (cue.shown) {
        assert.equal(cue.opacity, '1');
        await h.page.click('#video-cue');
        await h.page.waitForTimeout(900);
        assert.equal(count(h, 'OfferCueTapped'), 1);
        assert.equal(await h.page.evaluate(() => document.getElementById('video-cue').classList.contains('is-shown')), false, 'it goes once the recording is on screen');
        const visible = await h.page.evaluate(() => { const r = document.getElementById('offer-video').getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
        assert.equal(visible, true, 'the tap brings the recording into view');
      } else {
        assert.equal(cue.opacity, '0', 'no pill while the recording is already showing');
      }
      h.assertClean();
    } finally { await h.close(); }
  });
}

test('desktop: no pill, the recording is already beside the offer', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: { width: 1280, height: 800 }, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#offer-video');
    assert.equal(await h.page.evaluate(() => getComputedStyle(document.getElementById('video-cue')).display), 'none');
  } finally { await h.close(); }
});

// Scroll depth and what was on screen are recorded once each, with only the
// device attached, and nothing on the page changes for the visitor.
test('scrolling the landing records depth and what came on screen, once each', async () => {
  const h = await open({ arm: 'claims', signedIn: false, query: '', viewport: phone, now: DURING_LAUNCH });
  try {
    await h.page.waitForSelector('#offer-video');
    await choose(h);
    const names = ['OfferScroll25', 'OfferScroll50', 'OfferScroll75', 'OfferScroll100', 'OfferSawVideo', 'OfferSawOffer'];
    await h.page.waitForTimeout(500);
    assert.deepEqual(names.slice(0, 4).map(name => count(h, name)), [0, 0, 0, 0], 'standing still records no depth');
    const tall = await h.page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight * 1.2);
    assert.equal(tall, true, 'the phone landing is taller than the screen');
    for (const share of [0.3, 0.55, 0.8, 1]) {
      await h.page.evaluate(share => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * share), share);
      await h.page.waitForTimeout(150);
    }
    await h.page.evaluate(() => window.scrollTo(0, 0));
    await h.page.waitForTimeout(150);
    await h.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await h.page.waitForTimeout(400);
    assert.deepEqual(names.map(name => count(h, name)), [1, 1, 1, 1, 1, 1]);
    assert.ok(names.every(name => h.events.find(event => event.name === name)?.detail === 'phone'), 'phone or desktop is the only detail');
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
    await choose(h);
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
    await choose(h);
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
