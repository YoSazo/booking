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

// The dashboard draws the whole ladder: every step, the answers indented under
// the question, the reasons under the no, and a tile for each.
test('/funnel draws every step, the answers under the question and the reasons under the no', async () => {
  const ev = (name, visitorId, extra = {}) => ({ id: `${name}-${visitorId}`, name, visitorId, accountId: null, detail: null, createdAt: new Date().toISOString(), ...extra });
  const events = [
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferLanded', 'v_b', { detail: 'phone' }), ev('OfferLanded', 'v_c', { detail: 'phone' }),
    ev('OfferSawVideo', 'v_a'), ev('OfferSawVideo', 'v_b'), ev('OfferEngaged', 'v_a'),
    ev('OfferWantTapped', 'v_a'), ev('OfferDeclineTapped', 'v_b'), ev('OfferReasonPrice', 'v_b'), ev('OfferSawOffer', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
  ];
  const body = JSON.stringify({ wedges: [{ id: 'claims', product: 'Claims' }], tool: 'claims', ...buildWedgeFunnel(events) });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    await page.addInitScript(() => localStorage.setItem('marketelAdminToken', 'test'));
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') return route.fulfill({ status: 200, body, headers: { 'content-type': 'application/json' } });
      if (url.pathname === '/funnel') return route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')), headers: { 'content-type': 'text/html' } });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel');
    await page.waitForSelector('#ladder tbody tr');
    const rows = await page.$$eval('#ladder tbody tr', trs => trs.map(tr => ({ cls: tr.className, label: tr.querySelector('td.step').textContent.replace(/\s+/g, ' ').trim(), people: tr.querySelector('td:nth-child(3)').textContent.trim() })));
    const labels = rows.map(r => r.label);
    assert.deepEqual(labels.slice(0, 20), [
      'Landed from the ad', 'Saw the video', 'Did something on purpose (what Meta hears)', 'Stayed 20 seconds (not sent to Meta)', 'Answered the first question',
      '↳ Said "I want this"', '↳ Said "I don\'t want this"', '↳ The price is too expensive', '↳ Does not rent out property', '↳ Does not need it', '↳ Not sure it works', '↳ Skipped the reason',
      'Saw the offer card', 'Scrolled a quarter of the way', 'Scrolled halfway', 'Scrolled three quarters', 'Scrolled to the bottom',
      'Tapped the button', 'Opened Stripe', 'Paid once or started a trial',
    ]);
    assert.deepEqual(rows.slice(0, 20).map(r => r.people), ['3', '2', '1', '0', '2', '1', '1', '1', '0', '0', '0', '0', '1', '0', '0', '0', '0', '1', '0', '0']);
    assert.ok(rows[1].cls.includes('aside') && rows[3].cls.includes('aside') && rows[4].cls.includes('aside') && rows[5].cls.includes('child') && rows[7].cls.includes('depth2'));
    const tiles = await page.$$eval('#tiles .tile', els => els.map(el => [el.querySelector('small').textContent, el.querySelector('strong').textContent]));
    assert.deepEqual(tiles.slice(0, 8), [['Landed', '3'], ['Saw the video', '2'], ['Did something on purpose', '1'], ['Stayed 20s', '0'], ['Answered the question', '2'], ['Said I want this', '1'], ["Said I don't want this", '1'], ['Saw the offer card', '1']]);
    await page.screenshot({ path: process.env.FUNNEL_SHOT || '/tmp/funnel-shot.png', fullPage: true });
  } finally { await browser.close(); }
});

// A wedge that does not ask the first question shows a plain page funnel: the
// video, the offer, how far they scrolled, the button. No empty question rows.
test('/funnel for a page with no first question shows the page and scroll metrics, with no question rows or cards', async () => {
  const ev = (name, visitorId, extra = {}) => ({ id: `${name}-${visitorId}`, name, visitorId, accountId: null, detail: null, createdAt: new Date().toISOString(), ...extra });
  const events = [
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferLanded', 'v_b', { detail: 'phone' }), ev('OfferLanded', 'v_c', { detail: 'phone' }), ev('OfferLanded', 'v_d', { detail: 'phone' }),
    ev('OfferSawVideo', 'v_a'), ev('OfferSawVideo', 'v_b'), ev('OfferSawOffer', 'v_a'), ev('OfferSawOffer', 'v_b'), ev('OfferEngaged', 'v_a'),
    ev('OfferScroll25', 'v_a'), ev('OfferScroll25', 'v_b'), ev('OfferScroll50', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
  ];
  const body = JSON.stringify({ wedges: [{ id: 'claims', product: 'Claims' }], tool: 'claims', ...buildWedgeFunnel(events) });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('marketelAdminToken', 'test'));
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') return route.fulfill({ status: 200, body, headers: { 'content-type': 'application/json' } });
      if (url.pathname === '/funnel') return route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')), headers: { 'content-type': 'text/html' } });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel');
    await page.waitForSelector('#ladder tbody tr');
    const rows = await page.$$eval('#ladder tbody tr', trs => trs.map(tr => [tr.querySelector('td.step').textContent.replace(/\s+/g, ' ').trim(), tr.querySelector('td:nth-child(3)').textContent.trim()]));
    assert.deepEqual(rows.slice(0, 10), [['Landed from the ad', '4'], ['Saw the video', '2'], ['Did something on purpose (what Meta hears)', '1'], ['Stayed 20 seconds (not sent to Meta)', '0'], ['Saw the offer card', '2'], ['Scrolled a quarter of the way', '2'], ['Scrolled halfway', '1'], ['Scrolled three quarters', '0'], ['Scrolled to the bottom', '0'], ['Tapped the button', '1']]);
    assert.ok(!rows.some(([label]) => /first question|I want this|I don't want|reason|Skipped/i.test(label)), 'no question rows');
    const cards = await page.$$eval('#branches .card h2', hs => hs.map(h => h.textContent));
    assert.ok(cards.includes('How far down the page') && !cards.some(c => /first question|Why they did not|Could they answer/.test(c)), JSON.stringify(cards));
    const tiles = await page.$$eval('#tiles .tile small', els => els.map(el => el.textContent));
    assert.ok(!tiles.some(label => /Answered|want this/.test(label)) && tiles.includes('Scrolled halfway'), JSON.stringify(tiles));
  } finally { await browser.close(); }
});

test('/funnel has an "Only ad clicks" switch that asks the server for just those visitors', async () => {
  const seen = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('marketelAdminToken', 'test'));
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') { seen.push(url.searchParams.get('ad')); return route.fulfill({ status: 200, body: JSON.stringify({ wedges: [{ id: 'claims', product: 'Claims' }], tool: 'claims', adOnly: url.searchParams.get('ad') === '1', ...buildWedgeFunnel([]) }), headers: { 'content-type': 'application/json' } }); }
      if (url.pathname === '/funnel') return route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')), headers: { 'content-type': 'text/html' } });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel');
    await page.waitForSelector('#ad-only');
    assert.equal(await page.getAttribute('#ad-only', 'aria-pressed'), 'false');
    assert.equal(await page.isVisible('#ad-note'), false);
    await page.click('#ad-only');
    await page.waitForFunction(() => document.getElementById('ad-only').getAttribute('aria-pressed') === 'true');
    await page.waitForSelector('#ad-note', { state: 'visible' });
    assert.equal(seen[seen.length - 1], '1', 'the request asks for ad clicks only');
    await page.click('#ad-only');
    await page.waitForFunction(() => document.getElementById('ad-only').getAttribute('aria-pressed') === 'false');
    assert.equal(seen[seen.length - 1], null);
  } finally { await browser.close(); }
});
