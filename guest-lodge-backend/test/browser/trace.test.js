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

async function world() {
  const events = [], creates = [];
  const sessions = new Map([['cs_test_paidSession1234', { id: 'cs_test_paidSession1234', mode: 'payment', payment_status: 'paid', amount_total: 1499,
    customer_details: { email: 'buyer@example.test' }, metadata: { product: 'trace', visitorId: '' } }]]);
  const rows = [];
  const prisma = { inspectEvent: {
    create: async ({ data }) => { if (data.sourceId && rows.some(r => r.sourceId === data.sourceId)) throw Object.assign(new Error('dup'), { code: 'P2002' }); rows.push(data); events.push(data); return data; },
    upsert: async ({ where, create }) => rows.find(r => r.sourceId === where.sourceId) || (rows.push(create), events.push(create), create),
    delete: async () => {},
  } };
  const stripe = { checkout: { sessions: {
    create: async params => { creates.push(params); return { id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new' }; },
    retrieve: async id => { if (!sessions.has(id)) throw Object.assign(new Error('missing'), { statusCode: 404 }); return sessions.get(id); },
    list: async () => ({ data: [] }),
  } } };
  const app = express();
  app.use(express.json());
  registerTrace(app, { prisma, stripe, mail: { sendMail: async () => {} }, env: { TRACE_UNLOCK_SECRET: 's', TRACE_PUBLIC_ORIGIN: 'http://127.0.0.1' } });
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, events, creates, close: () => server.close() };
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
    await page.waitForSelector('.tile');
    assert.equal(await page.locator('.tile').count(), 6);
    assert.match(await page.textContent('#note'), /First drawing free/);
    // Kid-simple: the pictures and the photo button are on the first screen.
    const ownBox = await page.locator('#own-label').boundingBox();
    assert.ok(ownBox.y + ownBox.height <= 664, `own-photo button is below the fold at ${ownBox.y}`);

    await page.locator('.tile[data-id="cat"]').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    // waitForFunction evaluates a string, which the page's own CSP forbids; poll instead.
    await until(page, () => { const v = document.getElementById('cam'); return !!v.srcObject && v.readyState >= 2; });
    assert.match(await page.getAttribute('#overlay', 'src'), /cat\.svg$/);
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
    assert.equal(await page.evaluate(() => !!document.getElementById('cam').srcObject), false, 'the camera is off once tracing is done');
    assert.match(await page.textContent('#paywall'), /\$14\.99/);
    assert.match(await page.textContent('#paywall'), /No subscription/);
    await page.locator('#pay-later').tap();
    await page.waitForSelector('#paywall', { state: 'hidden' });

    // The free drawing can be reopened; a second picture asks.
    await page.locator('.tile[data-id="cat"]').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    await page.locator('#back').tap();
    await page.locator('.tile[data-id="fish"]').tap();
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
    await page.locator('.tile[data-id="fish"]').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    await settle();

    const seen = names(w.events);
    for (const step of ['TraceLanded', 'TraceFrom:ad', 'TraceBrowser:safari', 'TracePicked:starter', 'TraceCameraAsked', 'TraceStarted:starter',
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
    await page.setInputFiles('#own', PHOTO);
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

test("inside Facebook's browser a blocked camera says how to open it in Safari, and the free drawing is not spent", async () => {
  const w = await world();
  const { browser, page, errors } = await phone({ userAgent: FACEBOOK, camera: 'denied' });
  try {
    await page.goto(`${w.base}/trace`);
    await page.locator('.tile[data-id="heart"]').tap();
    await page.waitForSelector('#camera-help:not([hidden])');
    assert.match(await page.textContent('#help-title'), /Open this in your browser/);
    assert.match(await page.textContent('#help-body'), /Safari/);
    assert.equal(await page.isVisible('#help-copy'), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('trace.free')), null);
    await page.locator('#help-home').tap();
    await page.locator('.tile[data-id="fish"]').tap();
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
    await page.locator('.tile[data-id="flower"]').tap();
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
    await page.locator('.tile[data-id="cat"]').tap();
    await page.waitForSelector('#tracer:not([hidden])');
    await settle();
    assert.deepEqual(w.events, []);
  } finally { await browser.close(); w.close(); }
});

test('the page assets exist and reference only same-origin files', () => {
  const root = path.resolve(__dirname, '../../trace-web');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const routes = { '/trace/terms': 'terms.html' };
  for (const ref of html.matchAll(/(?:src|href)="(\/trace\/[^"?]+)/g)) assert.ok(fs.existsSync(path.join(root, routes[ref[1]] || ref[1].replace(/^\/trace\//, ''))), ref[1]);
});
