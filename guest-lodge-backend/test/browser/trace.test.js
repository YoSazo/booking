'use strict';
// Marketel Trace in a phone-sized Chromium with a fake camera: pick a picture,
// trace it, meet the paywall, pay (Stripe faked), come back unlocked. Also the
// two ways the camera can fail, and a photo turned into lines on the phone.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { chromium } = require('playwright-core');
const { registerTrace } = require('../../trace');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const FACEBOOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBAV/520.0.0.38.101;FBBV/700000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]';
const PHOTO = path.resolve(__dirname, '../../public/inspect/sample/claims-wall-thumb.jpg');

async function world({ drawing = null } = {}) {
  const events = [], creates = [], prompts = [];
  const sessions = new Map([['cs_test_paidSession1234', { id: 'cs_test_paidSession1234', mode: 'payment', payment_status: 'paid', amount_total: 1499,
    customer_details: { email: 'buyer@example.test' }, metadata: { product: 'trace', visitorId: '' } }]]);
  const rows = [];
  const prisma = { inspectEvent: {
    create: async ({ data }) => { if (data.sourceId && rows.some(r => r.sourceId === data.sourceId)) throw Object.assign(new Error('dup'), { code: 'P2002' }); rows.push(data); events.push(data); return data; },
    upsert: async ({ where, create }) => rows.find(r => r.sourceId === where.sourceId) || (rows.push(create), events.push(create), create),
    delete: async () => {},
    count: async ({ where }) => rows.filter(row => Object.entries(where).every(([key, value]) => key === 'createdAt' || row[key] === value)).length,
  } };
  const openai = { images: { generate: async params => { prompts.push(params.prompt); return { data: [{ b64_json: drawing }] }; } } };
  const stripe = { checkout: { sessions: {
    create: async params => { creates.push(params); return { id: 'cs_test_newSession123', url: 'https://checkout.stripe.com/c/pay/cs_test_newSession123' }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { statusCode: 404 }); return sessions.get(id); },
    list: async () => ({ data: [] }),
  } } };
  const app = express();
  app.use(express.json());
  registerTrace(app, { prisma, stripe, openai: drawing ? openai : null, mail: { sendMail: async () => {} }, env: { TRACE_UNLOCK_SECRET: 's', TRACE_PUBLIC_ORIGIN: 'http://127.0.0.1' } });
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, events, creates, sessions, prompts, close: () => server.close() };
}

async function phone({ userAgent = IPHONE, camera = 'fake' } = {}) {
  const args = camera === 'fake' ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] : [];
  const browser = await chromium.launch({ args });
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, userAgent });
  if (camera === 'denied') await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://www.clarity.ms/**', route => route.fulfill({ status: 200, body: '', headers: { 'content-type': 'application/javascript' } }));
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ status: 200, body: '<!doctype html><title>Stripe Checkout</title><p>Stripe</p>', headers: { 'content-type': 'text/html' } }));
  return { browser, page, errors };
}
const names = events => events.map(e => e.name + (e.detail ? `:${e.detail}` : ''));
const settle = () => new Promise(resolve => setTimeout(resolve, 300));
// The web starts on the cards (like the booking engine's rooms); the app and a
// buyer start on the picture grid. Either way a visible tile is ready.
async function toPicker(page) {
  await page.waitForSelector('.tile:visible');
}
// The one visible tile for a picture: the cards' "More drawings" or the grid.
const tile = (page, id) => page.locator(`.tile[data-id="${id}"]:visible`);
// The web's guided steps: step 1 (the drawing read back), step 2 (set up), then
// "Why we need your camera". The app and buyers skip straight to the camera.
async function throughSteps(page) {
  await page.waitForSelector('#step-review:not([hidden]), #tracer:not([hidden]), #paywall:not([hidden])');
  if (!(await page.isVisible('#step-review'))) return;
  await page.locator('#review-go').tap();
  await page.waitForSelector('#step-setup:not([hidden])');
  await page.locator('#setup-go').tap();
  await page.waitForSelector('#camera-why:not([hidden])');
  await page.locator('#why-go').tap();
}
async function traceTile(page, id) {
  await tile(page, id).tap();
  await throughSteps(page);
}
async function until(page, predicate, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(predicate)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${predicate}`);
}

test('pick a picture, trace it over the camera, then meet the paywall and pay', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace?fbclid=adclick123`);
    await toPicker(page);
    assert.equal(await page.locator('#more-grid .tile').count(), 6);
    assert.match(await page.textContent('#card-dragon .today'), /\$0 today[\s\S]*first drawing is free/);
    // Someone who already wants it can buy from the first screen.
    await page.locator('#buy-now').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(await page.textContent('#pay-title'), 'Unlock everything');
    await page.locator('#pay-later').tap();
    await page.waitForSelector('#paywall', { state: 'hidden' });

    await tile(page, 'girl').tap();
    await page.waitForSelector('#step-review:not([hidden])');
    assert.equal(await page.textContent('#review-name'), 'Anime girl');
    assert.match(await page.getAttribute('#review-img', 'src'), /girl\.webp$/);
    await throughSteps(page);
    await page.waitForSelector('#tracer:not([hidden])');
    // waitForFunction evaluates a string, which the page's own CSP forbids; poll instead.
    await until(page, () => { const v = document.getElementById('cam'); return !!v.srcObject && v.readyState >= 2; });
    assert.equal(await page.isVisible('#camera-note'), false, 'the camera note goes once the camera shows the paper');
    assert.match(await page.getAttribute('#overlay', 'src'), /girl\.webp$/);
    assert.equal(await page.isVisible('#hint'), true);

    // The fade slider changes how see-through the picture is.
    await page.locator('#fade').fill('30');
    assert.equal(await page.$eval('#overlay', el => el.style.opacity), '0.3');
    // Locked, a drag does not move the picture.
    await page.locator('#lock').tap();
    assert.equal(await page.getAttribute('#lock', 'aria-pressed'), 'true');
    const before = await page.$eval('#overlay', el => el.style.transform);
    await page.mouse.move(200, 300); await page.mouse.down(); await page.mouse.move(260, 360); await page.mouse.up();
    assert.equal(await page.$eval('#overlay', el => el.style.transform), before);
    await page.locator('#lock').tap();
    await page.mouse.move(200, 300); await page.mouse.down(); await page.mouse.move(260, 360, { steps: 4 }); await page.mouse.up();
    assert.notEqual(await page.$eval('#overlay', el => el.style.transform), before);

    await page.locator('#done').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    // A win first: confetti and a cheer, then the offer against what others charge.
    assert.equal(await page.evaluate(() => !!document.getElementById('confetti')), true, 'confetti on Done');
    assert.match(await page.textContent('#pay-note'), /You just traced your first drawing/);
    assert.equal(await page.textContent('#pay-title'), 'Keep drawing. Forever.');
    assert.match(await page.textContent('#pay-compare'), /up to \$24\.99\/week[\s\S]*\$14\.99 once/);
    assert.equal(await page.textContent('#buy'), 'Unlock forever: $14.99');
    await new Promise(resolve => setTimeout(resolve, 2100));
    assert.equal(await page.evaluate(() => !!document.getElementById('confetti')), false, 'the confetti clears itself');
    assert.equal(await page.evaluate(() => !!document.getElementById('cam').srcObject), false, 'the camera is off once tracing is done');
    assert.match(await page.textContent('#paywall'), /\$14\.99/);
    assert.match(await page.textContent('#paywall'), /No subscription/);
    await page.locator('#pay-later').tap();
    await page.waitForSelector('#paywall', { state: 'hidden' });

    // The cards now show the price. The free drawing can be reopened; a second picture asks.
    assert.match(await page.textContent('#card-dragon .today'), /\$14\.99 once/);
    await traceTile(page, 'girl');
    await page.waitForSelector('#tracer:not([hidden])');
    await page.locator('#back').tap();
    await tile(page, 'ninja').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(await page.isVisible('#tracer'), false);

    await Promise.all([page.waitForURL(/checkout\.stripe\.com/), page.locator('#buy').tap()]);
    assert.equal(w.creates.length, 1);
    assert.equal(w.creates[0].metadata.product, 'trace');
    assert.match(w.creates[0].metadata.fbc, /^fb\.1\.\d+\.adclick123$/);

    // Stripe sends the buyer back with the session id.
    await page.goto(`${w.base}/trace?paid=cs_test_paidSession1234`);
    await page.waitForSelector('#welcome:not([hidden])');
    assert.match(await page.textContent('#welcome'), /buyer@example\.test/);
    assert.equal(new URL(page.url()).search, '', 'the session id is taken out of the address bar');
    assert.ok(await page.evaluate(() => localStorage.getItem('trace.unlock')));
    await page.locator('#welcome-go').tap();
    assert.match(await page.textContent('#note'), /Unlocked/);
    assert.equal(await page.isVisible('#step-cards'), false, 'a buyer is on the picture grid');
    assert.equal(await page.isVisible('#buy-top'), false, 'no Buy in the bar once unlocked');
    await tile(page, 'ninja').tap();
    await page.waitForSelector('#tracer:not([hidden])', { timeout: 3000 });
    await settle();

    const seen = names(w.events);
    for (const step of ['TraceLanded:web', 'TraceFrom:ad', 'TraceBrowser:safari', 'TraceSelected:more', 'TracePicked:starter', 'TraceReviewed', 'TraceSetupDone', 'TraceCameraOk',
      'TraceCameraAsked', 'TraceStarted:starter', 'TracePaywallShown:now',
      'TraceFaded', 'TraceLocked', 'TraceMoved', 'TraceDone', 'TracePaywallShown:done', 'TracePaywallClosed', 'TracePaywallShown:second',
      'TraceCheckoutTapped', 'TraceCheckoutOpened', 'TracePaid', 'TraceUnlocked']) assert.ok(seen.includes(step), `${step} missing from ${seen.join(', ')}`);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('a photo from the phone becomes see-through lines, with the photo one tap away', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await page.locator('#select-photo').tap().catch(() => {});
    await page.setInputFiles('#own-cards', PHOTO);
    await page.waitForSelector('#step-review:not([hidden])');
    assert.equal(await page.textContent('#review-name'), 'Your photo');
    assert.match(await page.getAttribute('#review-img', 'src'), /^blob:/);
    await throughSteps(page);
    await page.waitForSelector('#tracer:not([hidden])');
    const src = await page.getAttribute('#overlay', 'src');
    assert.match(src, /^blob:/);
    const transparent = await page.evaluate(async () => {
      const img = document.getElementById('overlay');
      await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, ink = 0;
      for (let i = 3; i < d.length; i += 4) { if (d[i] === 0) clear++; else if (d[i] > 120) ink++; }
      return { clear: clear / (d.length / 4), ink: ink / (d.length / 4) };
    });
    assert.ok(transparent.clear > 0.3, `most of the sketch should be see-through, got ${transparent.clear}`);
    assert.ok(transparent.ink > 0.005, `the sketch should have lines, got ${transparent.ink}`);
    assert.equal(await page.isVisible('#mode'), true);
    await page.locator('#mode').tap();
    assert.notEqual(await page.getAttribute('#overlay', 'src'), src);
    assert.equal(await page.textContent('#mode'), 'Show lines');
    await settle();
    assert.ok(names(w.events).includes('TraceStarted:photo'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test("inside Facebook's browser a camera they said no to asks again, with Safari as the fallback, and the free drawing is not spent", async () => {
  const w = await world();
  const { browser, page, errors } = await phone({ userAgent: FACEBOOK, camera: 'denied' });
  try {
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await traceTile(page, 'bald');
    await page.waitForSelector('#camera-help:not([hidden])');
    assert.match(await page.textContent('#help-title'), /Allow your camera/);
    assert.match(await page.textContent('#help-body'), /Tap Try again, then Allow/);
    assert.match(await page.textContent('#help-body'), /Open in Safari/);
    assert.equal(await page.isVisible('#help-copy'), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.free')), null);
    await page.locator('#help-home').tap();
    await traceTile(page, 'ninja');
    await page.waitForSelector('#camera-help:not([hidden])');
    assert.equal(await page.isVisible('#paywall'), false, 'a different picture is still free because nothing was traced');
    await settle();
    const seen = names(w.events);
    assert.ok(seen.includes('TraceBrowser:facebook'));
    assert.ok(seen.includes('TraceCameraDenied:denied'));
    assert.ok(seen.includes('TraceCameraHelpShown:inapp'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('in Safari a denied camera explains where to allow it', async () => {
  const w = await world();
  const { browser, page } = await phone({ camera: 'denied' });
  try {
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await traceTile(page, 'profile');
    await page.waitForSelector('#camera-help:not([hidden])');
    assert.match(await page.textContent('#help-title'), /Allow your camera/);
    assert.match(await page.textContent('#help-body'), /Website Settings/);
    assert.equal(await page.isVisible('#help-copy'), false);
  } finally { await browser.close(); w.close(); }
});

test('coming back from Stripe without paying says nothing was taken', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.goto(`${w.base}/trace?cancelled=1`);
    await page.waitForSelector('#paywall:not([hidden])');
    assert.match(await page.textContent('#pay-note'), /No payment was taken/);
  } finally { await browser.close(); w.close(); }
});

test('the owner opening ?notrack=1 records nothing', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.goto(`${w.base}/trace?notrack=1`);
    await toPicker(page);
    await traceTile(page, 'girl');
    await page.waitForSelector('#tracer:not([hidden])');
    await settle();
    assert.deepEqual(w.events, []);
  } finally { await browser.close(); w.close(); }
});

test('inside the Marketel app: the glass bar stands down, US buyers pay in Safari and come back unlocked', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    // The app's shell bridge, the US App Store, and the app's API host pointed at the test server.
    await page.addInitScript(base => {
      window.__shell = [];
      window.webkit = { messageHandlers: { marketelShell: { postMessage(message) {
        window.__shell.push(message);
        if (message.type === 'inspectStorefront') setTimeout(() => window.marketelInspectStorefront('USA'), 10);
      } } } };
      const realFetch = window.fetch;
      window.fetch = (url, options) => realFetch(String(url).replace('https://bookmarketel.com', base), options);
    }, w.base);
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    assert.equal(await page.isVisible('#step-cards'), false, 'the app opens on the picture grid');
    assert.equal(await page.locator('#grid .tile').count(), 7);
    const shell = () => page.evaluate(() => window.__shell);
    assert.deepEqual((await shell()).find(m => m.type === 'visibility'), { type: 'visibility', visible: false });
    assert.match(await page.textContent('#note'), /\$14\.99 once/);
    await tile(page, 'girl').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    assert.equal(await page.isVisible('#step-review'), false, 'no guided steps in the app');
    await page.locator('#done').tap();
    await page.waitForSelector('#buy:visible');
    await page.locator('#buy').tap();
    await until(page, () => window.__shell.some(m => m.type === 'openPurchase'));
    const purchase = (await shell()).find(m => m.type === 'openPurchase');
    assert.equal(purchase.url, 'https://checkout.stripe.com/c/pay/cs_test_newSession123');
    assert.match(new URL(page.url()).href, /\/trace$/, 'the app stays on its own page while Safari takes the payment');
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.pending')), 'cs_test_newSession123');
    // Paid in Safari; the session the app opened is now paid. Coming back unlocks it.
    w.sessions.set('cs_test_newSession123', { id: 'cs_test_newSession123', mode: 'payment', payment_status: 'paid', amount_total: 1499, customer_details: { email: 'buyer@example.test' }, metadata: { product: 'trace', app: '1' } });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForSelector('#welcome:not([hidden])');
    assert.ok(await page.evaluate(() => localStorage.getItem('trace.unlock')));
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.pending')), null);
    await settle();
    assert.ok(names(w.events).includes('TraceLanded:web'), 'served over http here; the real app is recorded as app by its origin');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('inside the app outside the US there is no price and no buy button, only the code for a web purchase', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.addInitScript(() => {
      window.webkit = { messageHandlers: { marketelShell: { postMessage(message) {
        if (message.type === 'inspectStorefront') setTimeout(() => window.marketelInspectStorefront('GBR'), 10);
      } } } };
    });
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await page.waitForTimeout(100);
    assert.doesNotMatch(await page.textContent('#note'), /\$/);
    await page.evaluate(() => localStorage.setItem('trace.free', 'starter:cat'));
    await tile(page, 'ninja').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(await page.isVisible('#buy'), false);
    assert.equal(await page.isVisible('#pay-price'), false);
    assert.doesNotMatch(await page.innerText('#paywall'), /\$/);
    assert.equal(await page.isVisible('#pay-elsewhere'), true);
    assert.equal(await page.isVisible('#buy-top'), false, 'no Buy in the bar where the app may not sell');
  } finally { await browser.close(); w.close(); }
});

test('Describe it: type a picture, it is drawn as see-through lines to trace; the second one asks to unlock', async () => {
  // A real WebP line drawing: black circle on white, made by Chromium itself.
  const maker = await chromium.launch();
  const drawing = await (await maker.newPage()).evaluate(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#000'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 80, 0, Math.PI * 2); x.stroke();
    return c.toDataURL('image/webp').split(',')[1];
  });
  await maker.close();
  const w = await world({ drawing });
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    // "Anything You Type": Select opens the box on its card.
    assert.equal(await page.isVisible('#type-form'), false);
    await page.locator('#select-type').tap();
    await page.waitForSelector('#type-form:not([hidden])');
    assert.equal(await page.isVisible('#select-type'), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'type-input');
    await page.fill('#type-input', 'a cat wearing a crown');
    // As the iPhone keyboard does: the field focused and the page scrolled up.
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.locator('#type-go').tap();
    await page.waitForSelector('#step-review:not([hidden])');
    assert.equal(await page.textContent('#review-name'), 'A cat wearing a crown');
    assert.match(await page.getAttribute('#review-img', 'src'), /^blob:/);
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'type-input', 'the keyboard is dismissed');
    await throughSteps(page);
    await page.waitForSelector('#tracer:not([hidden])');
    // Tracing starts once the camera shows the paper; wait for it before Done.
    await until(page, () => { const v = document.getElementById('cam'); return !!v.srcObject && v.readyState >= 2; });
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'tracing pins the page at the top');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('tracing')), true);
    assert.match(w.prompts[0], /Subject: a cat wearing a crown$/);
    const pixels = await page.evaluate(async () => {
      const img = document.getElementById('overlay'); await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      return { corner: d[3], ring: d[(128 * c.width + 48) * 4 + 3] };
    });
    assert.equal(pixels.corner, 0, 'white paper becomes see-through');
    assert.ok(pixels.ring > 200, `the line stays dark, alpha ${pixels.ring}`);
    // Done answers straight away, without touching the picture first.
    await page.locator('#done').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('tracing')), false, 'home scrolls again');
    assert.match(await page.textContent('#paywall'), /30 AI pictures a month/);
    await page.locator('#pay-later').tap();
    await page.fill('#type-input', 'a dog');
    await page.locator('#type-go').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(w.prompts.length, 1, 'no second free drawing is paid for');
    await settle();
    const seen = names(w.events);
    for (const step of ['TraceSelected:type', 'TraceAIAsked', 'TracePicked:ai', 'TraceAIShown', 'TraceStarted:ai', 'TraceAIGenerated:free']) assert.ok(seen.includes(step), `${step} missing from ${seen.join(', ')}`);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('while iOS asks for the camera, the page says why; the note goes once the camera shows', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.addInitScript(() => {
      const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => { window.__allow = () => resolve(real(constraints)); });
    });
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await traceTile(page, 'doll');
    await page.waitForSelector('#camera-note:not([hidden])');
    assert.match(await page.textContent('#camera-note'), /Nothing is recorded/);
    await page.evaluate(() => window.__allow());
    await page.waitForSelector('#camera-note', { state: 'hidden' });
  } finally { await browser.close(); w.close(); }
});

// Meta's pixel only loads on the real https site. Serve the page from an https
// test origin, stub Meta's script so its queued calls stay readable.
async function overHttps(page, base) {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.route('https://connect.facebook.net/**', route => route.fulfill({ status: 200, body: '', headers: { 'content-type': 'application/javascript' } }));
  await page.route('https://trace.test/**', async route => {
    const request = route.request();
    const url = request.url().replace('https://trace.test', base);
    const response = await page.request.fetch(url, { method: request.method(), headers: request.headers(), data: request.postDataBuffer() || undefined });
    await route.fulfill({ response });
  });
}
const pixelCalls = page => page.evaluate(() => (window.fbq && window.fbq.queue || []).map(args => [...args].map(a => (a && typeof a === 'object' ? JSON.parse(JSON.stringify(a)) : a))));

test("Meta's pixel: PageView on arrival, then the same events and event ids the server sends", async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await overHttps(page, w.base);
    await page.goto('https://trace.test/trace?fbclid=adclick123');
    await toPicker(page);
    let calls = await pixelCalls(page);
    assert.deepEqual(calls.slice(0, 2), [['init', '1545780930244672'], ['track', 'PageView']]);
    const visitor = await page.evaluate(() => localStorage.getItem('trace.visitor'));
    await page.locator('.tile:visible').first().tap();
    await throughSteps(page);
    await page.waitForSelector('#tracer:not([hidden])');
    await until(page, () => (window.fbq.queue || []).some(args => args[1] === 'AddToCart'));
    await page.locator('#back').tap();
    await toPicker(page);
    await page.locator('.tile:visible').nth(1).tap();
    await settle();
    calls = (await pixelCalls(page)).filter(args => args[0] === 'track' && args[1] !== 'PageView');
    assert.deepEqual(calls.map(args => [args[1], args[3]?.eventID]), [
      ['ViewContent', `trace-picked.${visitor}`],
      ['AddToCart', `trace-started.${visitor}`],
    ], 'each signal once, with the server event id');
    assert.equal(calls[1][2].value, 14.99);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test("Meta's pixel never loads for the owner, the app or over http", async () => {
  const w = await world();
  for (const setup of ['owner', 'app', 'http']) {
    const { browser, page } = await phone();
    try {
      const facebook = [];
      page.on('request', request => { if (/facebook\.(net|com)/.test(request.url())) facebook.push(request.url()); });
      if (setup !== 'http') await overHttps(page, w.base);
      if (setup === 'app') await page.addInitScript(() => { window.webkit = { messageHandlers: { marketelShell: { postMessage() {} } } }; });
      await page.goto(setup === 'http' ? `${w.base}/trace` : `https://trace.test/trace${setup === 'owner' ? '?notrack=1' : ''}`);
      await page.waitForSelector('body');
      await settle();
      assert.equal(await page.evaluate(() => typeof window.fbq), 'undefined', setup);
      assert.deepEqual(facebook, [], setup);
    } finally { await browser.close(); }
  }
  w.close();
});

test('the page assets exist and reference only same-origin files', () => {
  const root = path.resolve(__dirname, '../../trace-web');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const routes = { '/trace/terms': 'terms.html' };
  for (const ref of html.matchAll(/(?:src|href)="(\/trace\/[^"?]+)/g)) assert.ok(fs.existsSync(path.join(root, routes[ref[1]] || ref[1].replace(/^\/trace\//, ''))), ref[1]);
});

test('the native opaque origin starts without constructing a web attribution URL', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.addInitScript(base => {
      window.__nativeLocation = { origin: 'null', protocol: 'capacitor:', pathname: '/trace/index.html', search: '', href: 'capacitor://localhost/trace/index.html' };
      window.webkit = { messageHandlers: { marketelShell: { postMessage(message) {
        if (message.type === 'inspectStorefront') setTimeout(() => window.marketelInspectStorefront('USA'), 10);
      } } } };
      const realFetch = window.fetch;
      window.fetch = (url, options) => realFetch(String(url).replace('https://bookmarketel.com', base), options);
    }, w.base);
    // The normal browser harness has an HTTP origin even when the bridge is
    // mocked. Exercise the location exposed by Capacitor's actual scheme.
    await page.route('**/trace/trace.js?*', route => route.fulfill({
      contentType: 'application/javascript',
      body: fs.readFileSync(path.resolve(__dirname, '../../trace-web/trace.js'), 'utf8').replace(/\blocation\b/g, 'window.__nativeLocation'),
    }));
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    assert.equal(await page.locator('#grid .tile').count(), 7);
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.metaAttribution.v1')), null);
    assert.doesNotMatch(await page.evaluate(() => document.cookie), /_fb[p c]=/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('Back while camera permission is pending stops a late stream and preserves the free drawing', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.addInitScript(() => {
      const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => {
        window.__allowCamera = async () => { window.__lateStream = await getMedia(constraints); resolve(window.__lateStream); };
      });
    });
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await traceTile(page, 'girl');
    await page.waitForSelector('#tracer:not([hidden])');
    await page.locator('#back').tap();
    await page.evaluate(() => window.__allowCamera());
    await until(page, () => window.__lateStream.getTracks().every(track => track.readyState === 'ended'));
    assert.equal(await page.evaluate(() => !!document.getElementById('cam').srcObject), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.free')), null);
    assert.equal(await page.isVisible('#home'), true);
    await settle();
    assert.ok(!names(w.events).some(name => name.startsWith('TraceStarted')));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('a camera playback failure offers help without spending the free drawing', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new Error('Playback failed'));
    });
    await page.goto(`${w.base}/trace`);
    await toPicker(page);
    await traceTile(page, 'girl');
    await page.waitForSelector('#camera-help:not([hidden])');
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.free')), null);
    assert.equal(await page.evaluate(() => !!document.getElementById('cam').srcObject), false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('reloading an interrupted paid return recovers the purchase after the URL has been cleaned', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.route('**/api/trace/unlock', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Temporarily unavailable"}' }));
    await page.goto(`${w.base}/trace?paid=cs_test_paidSession1234`);
    assert.equal(new URL(page.url()).search, '');
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.pending')), 'cs_test_paidSession1234');
    await page.unroute('**/api/trace/unlock');
    await page.reload();
    await page.waitForSelector('#welcome:not([hidden])');
    assert.ok(await page.evaluate(() => localStorage.getItem('trace.unlock')));
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.pending')), null);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('closing the paywall while checkout loads never redirects when the late response arrives', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  let release;
  try {
    const waiting = new Promise(resolve => { release = resolve; });
    let requested = false;
    await page.route('**/api/trace/checkout', async route => {
      requested = true;
      await waiting;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'cs_test_lateSession123', url: 'https://checkout.stripe.com/c/pay/cs_test_lateSession123' }) });
    });
    await page.goto(`${w.base}/trace?cancelled=1`);
    await page.locator('#buy').tap();
    assert.equal(requested, true);
    await page.locator('#pay-later').tap();
    release();
    await settle();
    assert.equal(new URL(page.url()).origin, w.base);
    assert.equal(await page.isVisible('#paywall'), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.pending')), null);
    assert.ok(!names(w.events).includes('TraceCheckoutOpened'));
    assert.deepEqual(errors, []);
  } finally { release(); await browser.close(); w.close(); }
});

test('the first screen is built like the booking engine: the name, the promise, and cards with $0 today and one button each', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace?fbclid=adclick123`);
    assert.equal(await page.isVisible('#step-cards'), true);
    assert.equal(await page.textContent('#cards-title'), 'Trace Anything');
    assert.equal(await page.textContent('#promise'), 'No Subscription. No Weekly Fees. No Account. Just Simple Tracing.');
    for (const card of ['#card-dragon', '#card-type']) {
      assert.match(await page.innerText(`${card} .today`), /\$0 today\s*Your first drawing is free\. No card needed\./, card);
    }
    assert.equal(await page.textContent('#select-dragon'), 'Select Drawing');
    assert.equal(await page.textContent('#select-type'), 'Select');
    assert.match(await page.textContent('#select-photo'), /Select Photo/);
    // The dragon is the first thing under the promise, and its picture is on the first screen.
    const art = await page.locator('#card-dragon .card-art').boundingBox();
    assert.ok(art.y < 664 && art.y + art.height <= 664, `the dragon is on the first screen (${art.y}-${art.y + art.height})`);
    assert.equal(await page.locator('#more-grid .tile').count(), 6);
    // No pitch, no made-up reviews, no Buy in the bar: only a quiet link at the bottom.
    assert.doesNotMatch(await page.innerText('#step-cards'), /24\.99|a week/);
    assert.equal(await page.locator('#trust, .tape, .tape-card, .demo').count(), 0);
    assert.equal(await page.isVisible('#buy-top'), false);
    assert.equal(await page.isVisible('#buy-now'), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('each ad can open with its own promise (?hook=), defaulting to no weekly fees', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.goto(`${w.base}/trace?hook=cantdraw`);
    assert.match(await page.textContent('#promise'), /^Can't Draw\? You Can Now\./);
    await page.goto(`${w.base}/trace?hook=nonsense`);
    assert.match(await page.textContent('#promise'), /^No Subscription\. No Weekly Fees\./);
  } finally { await browser.close(); w.close(); }
});

test('Select Drawing reads it back as step 1 of 3, then set up, then the camera is explained right before it asks', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace?fbclid=adclick123`);
    await page.locator('#select-dragon').tap();
    await page.waitForSelector('#step-review:not([hidden])');
    assert.equal(await page.isVisible('#step-cards'), false);
    assert.match(await page.textContent('#review-title'), /Step 1 of 3/);
    assert.equal(await page.textContent('#review-name'), 'Dragon');
    assert.match(await page.getAttribute('#review-img', 'src'), /dragon\.webp$/);
    assert.match(await page.innerText('#review-free'), /Trace it for \$0 today[\s\S]*No card needed[\s\S]*\$14\.99 once/);
    assert.equal(await page.isVisible('#review-go'), true, 'the button stays on screen');
    // Change goes back to the cards; the phone's Forward and Back move between steps.
    await page.locator('#review-change').tap();
    await page.waitForSelector('#step-cards:not([hidden])');
    await page.goForward();
    await page.waitForSelector('#step-review:not([hidden])');
    await page.locator('#review-go').tap();
    await page.waitForSelector('#step-setup:not([hidden])');
    assert.match(await page.textContent('#setup-title'), /Step 2 of 3/);
    assert.match(await page.innerText('#step-setup'), /Phone on a glass above it/);
    await page.goBack();
    await page.waitForSelector('#step-review:not([hidden])');
    await page.locator('#review-go').tap();
    await page.waitForSelector('#step-setup:not([hidden])');
    // "Why we need your camera": Not now stays put; Got it opens the camera.
    await page.locator('#setup-go').tap();
    await page.waitForSelector('#camera-why:not([hidden])');
    assert.match(await page.innerText('#camera-why'), /Why we need your camera[\s\S]*Nothing is recorded[\s\S]*Free today\. No card needed\./);
    assert.equal(await page.isVisible('#tracer'), false, 'the camera waits for the answer');
    await page.locator('#why-later').tap();
    await page.waitForSelector('#camera-why', { state: 'hidden' });
    assert.equal(await page.isVisible('#step-setup'), true);
    await page.locator('#setup-go').tap();
    await page.locator('#why-go').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    await until(page, () => { const v = document.getElementById('cam'); return !!v.srcObject && v.readyState >= 2; });
    assert.match(await page.getAttribute('#overlay', 'src'), /dragon\.webp$/);
    await settle();
    const seen = names(w.events);
    for (const name of ['TraceSelected:dragon', 'TracePicked:starter', 'TraceReviewed', 'TraceSetupDone', 'TraceCameraOk', 'TraceCameraAsked', 'TraceStarted:starter']) assert.ok(seen.includes(name), `${name} in ${seen.join()}`);
    assert.ok(seen.indexOf('TraceCameraOk') < seen.indexOf('TraceCameraAsked'), 'the camera is asked for only after Got it');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('an idea under "What do you want to draw?" draws straight away', async () => {
  const maker = await chromium.launch();
  const drawing = await (await maker.newPage()).evaluate(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#000'; x.fillRect(20, 20, 24, 24);
    return c.toDataURL('image/webp').split(',')[1];
  });
  await maker.close();
  const w = await world({ drawing });
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace`);
    await page.locator('#select-type').tap();
    await page.locator('.idea', { hasText: 'A sports car' }).tap();
    await page.waitForSelector('#step-review:not([hidden])');
    assert.equal(await page.textContent('#review-name'), 'A sports car');
    assert.match(w.prompts[0], /Subject: A sports car$/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('a step opened again after a reload has no drawing, so it shows the cards', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace`);
    await page.locator('#select-dragon').tap();
    await page.waitForSelector('#step-review:not([hidden])');
    await page.reload();
    await page.waitForSelector('#step-cards:not([hidden])');
    assert.equal(await page.isVisible('#step-review'), false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); w.close(); }
});

test('"Already sure?" opens the price and pays, with nothing in between', async () => {
  const w = await world();
  const { browser, page, errors } = await phone();
  try {
    await page.goto(`${w.base}/trace?fbclid=adclick123`);
    await page.locator('#buy-now').tap();
    await page.waitForSelector('#paywall:not([hidden])');
    assert.equal(await page.textContent('#pay-title'), 'Unlock everything');
    await Promise.all([page.waitForURL(/checkout\.stripe\.com/), page.locator('#buy').tap()]);
    assert.equal(w.creates.length, 1);
    await settle();
    const seen = names(w.events);
    for (const name of ['TracePaywallShown:now', 'TraceCheckoutTapped', 'TraceCheckoutOpened']) assert.ok(seen.includes(name), `${name} in ${seen.join()}`);
    assert.deepEqual(errors.filter(error => !/stripe/i.test(error)), []);
  } finally { await browser.close(); w.close(); }
});

test('when checkout will not open, the price sheet says so and keeps the button usable', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.route('**/api/trace/checkout', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Checkout is not available right now.' }) }));
    await page.goto(`${w.base}/trace`);
    await page.locator('#buy-now').tap();
    await page.locator('#buy').tap();
    await page.waitForSelector('#pay-error:not([hidden])');
    assert.match(await page.textContent('#pay-error'), /not available/);
    assert.equal(await page.isDisabled('#buy'), false);
    assert.equal(await page.textContent('#buy'), 'Unlock forever: $14.99');
    await settle();
    assert.ok(names(w.events).includes('TraceCheckoutFailed:error'), names(w.events).join());
  } finally { await browser.close(); w.close(); }
});

test('a buyer never sees the cards: unlocked, the page opens on the pictures and the camera opens straight away', async () => {
  const w = await world();
  const { browser, page } = await phone();
  try {
    await page.goto(`${w.base}/trace?paid=cs_test_paidSession1234`);
    await page.waitForSelector('#welcome:not([hidden])');
    assert.equal(await page.isVisible('#step-pick'), true, 'the welcome sheet sits over the pictures');
    await page.locator('#welcome-go').tap();
    await page.goto(`${w.base}/trace`);
    await page.waitForSelector('#step-pick:not([hidden])');
    assert.equal(await page.isVisible('#step-cards'), false);
    assert.equal(await page.locator('#grid .tile').count(), 7);
    await tile(page, 'dragon').tap();
    await page.waitForSelector('#tracer:not([hidden])');
  } finally { await browser.close(); w.close(); }
});
