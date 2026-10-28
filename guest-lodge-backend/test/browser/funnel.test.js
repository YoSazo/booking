'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { open } = require('./harness');
const { buildWedgeFunnel, definitionFor } = require('../../wedge-funnel');

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
      'Landed on the page', 'Saw the video', 'Did something on purpose (what Meta hears)', 'Stayed 20 seconds (not sent to Meta)', 'Answered the first question',
      '↳ Said "I want this"', '↳ Said "I don\'t want this"', '↳ The price is too expensive', '↳ Does not rent out property', '↳ Does not need it', '↳ Not sure it works', '↳ Skipped the reason',
      'Saw the offer card', 'Scrolled a quarter of the way', 'Scrolled halfway', 'Scrolled three quarters', 'Scrolled to the bottom',
      'Tapped the button', 'Stripe session created', 'Payment form ready (what Meta hears)',
    ]);
    assert.deepEqual(rows.slice(0, 20).map(r => r.people), ['3', '2', '1', '0', '2', '1', '1', '1', '0', '0', '0', '0', '1', '0', '0', '0', '0', '1', '0', '0']);
    assert.ok(rows[1].cls.includes('aside') && rows[3].cls.includes('aside') && rows[4].cls.includes('aside') && rows[5].cls.includes('child') && rows[7].cls.includes('depth2'));
    const tiles = await page.$$eval('#tiles .tile', els => els.map(el => [el.querySelector('small').textContent, el.querySelector('strong').textContent]));
    assert.deepEqual(tiles.slice(0, 8), [['Landed', '3'], ['Saw the video', '2'], ['Did something on purpose', '1'], ['Stayed 20s', '0'], ['Answered the question', '2'], ['Said I want this', '1'], ["Said I don't want this", '1'], ['Saw the offer card', '1']]);
    await page.screenshot({ path: process.env.FUNNEL_SHOT || '/tmp/funnel-shot.png', fullPage: true });
  } finally { await browser.close(); }
});

test('/funnel shows Payoff\'s ads side by side, named as in Ads Manager, or by id when Meta gave no name', async () => {
  const ev = (name, visitorId, extra = {}) => ({ id: `${name}-${visitorId}-${extra.detail || ''}`, name, visitorId, accountId: null, detail: null, createdAt: new Date().toISOString(), ...extra });
  const events = [
    ev('PayoffAd', 'v_a', { detail: '120251563772920103' }), ev('PayoffStory', 'v_a', { detail: 'viewed' }), ev('PayoffOrderViewed', 'v_a'), ev('PayoffOrder', 'v_a', { detail: 'cart' }),
    ev('PayoffAd', 'v_b', { detail: '120251563772920103' }), ev('PayoffStory', 'v_b', { detail: 'viewed' }),
    ev('PayoffAd', 'v_c', { detail: '120251563874800103' }), ev('PayoffStory', 'v_c', { detail: 'viewed' }),
  ];
  const funnel = buildWedgeFunnel(events, definitionFor('payoff'));
  for (const ad of funnel.ads) ad.name = ad.ad === '120251563772920103' ? 'PROJECT PAYOFF | ADD TO CART | CAR' : null;
  const body = JSON.stringify({ wedges: [{ id: 'payoff', product: 'Payoff' }], tool: 'payoff', ...funnel });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('marketelAdminToken', 'test'));
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') return route.fulfill({ status: 200, body, headers: { 'content-type': 'application/json' } });
      if (url.pathname === '/funnel') return route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')), headers: { 'content-type': 'text/html' } });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel');
    await page.waitForSelector('#ads:not([hidden]) tbody tr');
    assert.deepEqual(await page.$$eval('#ads thead th', ths => ths.map(th => th.textContent)), ['', 'CAR', 'Ad …800103']);
    const rows = await page.$$eval('#ads tbody tr', trs => trs.map(tr => [...tr.cells].map(td => td.textContent.trim())));
    assert.deepEqual(rows[0], ['Visitors from this ad', '2', '1']);
    assert.deepEqual(rows.find(row => row[0].startsWith('Stayed 20 seconds')), ['Stayed 20 seconds or started paying (Meta: AddToCart)', '1 50%', '0 0%']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'fits a phone');
    await page.screenshot({ path: process.env.FUNNEL_ADS_SHOT || '/tmp/funnel-ads-shot.png', fullPage: true });
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
    assert.deepEqual(rows.slice(0, 10), [['Landed on the page', '4'], ['Saw the video', '2'], ['Did something on purpose (what Meta hears)', '1'], ['Stayed 20 seconds (not sent to Meta)', '0'], ['Saw the offer card', '2'], ['Scrolled a quarter of the way', '2'], ['Scrolled halfway', '1'], ['Scrolled three quarters', '0'], ['Scrolled to the bottom', '0'], ['Tapped the button', '1']]);
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

async function dateDashboard(viewport = { width: 390, height: 844 }) {
  const { wedgeFunnelRange } = require('../../wedge-funnel-range');
  const clock = new Date('2026-10-15T14:12:00Z');
  const events = [
    { id: 'ad', name: 'OfferFrom', detail: 'ad', visitorId: 'v_one', createdAt: '2026-10-15T03:48:28Z' },
    { id: 'arrival', name: 'OfferLanded', detail: 'phone', visitorId: 'v_one', createdAt: '2026-10-15T03:48:28Z' },
    { id: 'ready', name: 'SimCheckoutRendered', detail: 'lifetime_trial', visitorId: 'v_one', createdAt: '2026-10-15T03:50:11.755Z' },
    { id: 'new', name: 'OfferLanded', detail: 'phone', visitorId: 'v_two', createdAt: '2026-10-15T13:00:00Z' },
  ];
  const { onlyAdClicks } = require('../../wedge-funnel');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, timezoneId: 'Asia/Tokyo' });
  const seen = [];
  await page.addInitScript(() => {
    localStorage.setItem('marketelAdminToken', 'test');
    // An existing seven-day preference must not bring yesterday into Today.
    if (!localStorage.getItem('marketelWedgeFunnel')) localStorage.setItem('marketelWedgeFunnel', JSON.stringify({ days: '7', tool: 'claims' }));
  });
  await page.route('http://funnel.test/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/funnel/wedge') {
      const query = Object.fromEntries(url.searchParams);
      seen.push(query);
      try {
        const r = wedgeFunnelRange(query, clock);
        let filtered = events.filter(e => new Date(e.createdAt) >= r.since && new Date(e.createdAt) <= r.until);
        if (query.ad === '1') filtered = onlyAdClicks(filtered, events);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          wedges: [{ id: 'claims', product: 'Claims' }], tool: 'claims', period: r.period, timezone: r.timeZone,
          from: r.since.toISOString(), to: r.until.toISOString(), countingSince: '2026-10-15T06:00:00Z',
          adOnly: query.ad === '1', ...buildWedgeFunnel(filtered),
        }) });
      } catch (e) { return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: e.message }) }); }
    }
    if (url.pathname === '/funnel') return route.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://funnel.test/funnel');
  await page.waitForSelector('#tiles .tile');
  return { browser, page, seen };
}

test('/funnel separates calendar Today from Yesterday and 24h, and displays Chicago dates even in a Tokyo browser', async () => {
  const h = await dateDashboard();
  try {
    assert.equal(h.seen[0].period, 'today');
    assert.equal(h.seen[0].timezone, 'America/Chicago');
    assert.match(await h.page.textContent('#range-summary'), /Oct 15, 2026.*12:00:00 AM.*America\/Chicago/);
    assert.match(await h.page.textContent('#since-note'), /does not shorten your selected range/);
    const ready = () => h.page.locator('#tiles .tile').filter({ has: h.page.locator('small', { hasText: /^Payment form ready$/ }) });
    assert.equal(await ready().locator('strong').textContent(), '0');
    await h.page.click('[data-period="yesterday"]');
    await h.page.waitForFunction(() => document.getElementById('range-summary').textContent.includes('Oct 14, 2026'));
    assert.equal(await ready().locator('strong').textContent(), '1');
    assert.match(await ready().locator('.last-event').textContent(), /Oct 14, 2026.*10:50:11 PM/);
    assert.match(await h.page.locator('#feed time').first().textContent(), /Oct 14, 2026.*10:50:11 PM/);
    await h.page.click('[data-period="24h"]');
    await h.page.waitForFunction(() => document.querySelector('[data-period="24h"]').getAttribute('aria-pressed') === 'true');
    assert.equal(h.seen.at(-1).period, '24h');
    assert.equal(await ready().locator('strong').textContent(), '1');
    assert.equal(await h.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'phone dashboard does not overflow horizontally');
  } finally { await h.browser.close(); }
});

test('/funnel applies custom times, persists them, changes timezone, and reports invalid DST times without stale totals', async () => {
  const h = await dateDashboard({ width: 1280, height: 1000 });
  try {
    await h.page.click('[data-period="custom"]');
    await h.page.fill('#range-from', '2026-10-14T22:45');
    await h.page.fill('#range-to', '2026-10-14T22:55');
    await h.page.click('#apply-range');
    await h.page.waitForFunction(() => document.getElementById('range-summary').textContent.includes('10:45:00 PM'));
    assert.equal(h.seen.at(-1).from, '2026-10-14T22:45');
    assert.equal(h.seen.at(-1).to, '2026-10-14T22:55');
    assert.match(await h.page.textContent('#range-summary'), /10:55:59 PM/);
    await h.page.reload();
    await h.page.waitForSelector('#tiles .tile');
    assert.equal(await h.page.inputValue('#range-from'), '2026-10-14T22:45');
    assert.equal(await h.page.getAttribute('[data-period="custom"]', 'aria-pressed'), 'true');
    await h.page.selectOption('#timezone', 'UTC');
    await h.page.waitForFunction(() => document.getElementById('range-summary').textContent.endsWith('All sources') && document.getElementById('range-summary').textContent.includes('· UTC ·'));
    assert.equal(h.seen.at(-1).timezone, 'UTC');
    await h.page.selectOption('#timezone', 'America/Chicago');
    await h.page.waitForFunction(() => document.getElementById('range-summary').textContent.includes('· America/Chicago ·'));
    await h.page.fill('#range-from', '2026-03-08T02:30');
    await h.page.fill('#range-to', '2026-03-08T04:00');
    await h.page.click('#apply-range');
    await h.page.waitForSelector('#range-error', { state: 'visible' });
    assert.match(await h.page.textContent('#range-error'), /daylight saving/);
    assert.equal(await h.page.locator('#tiles .tile').count(), 0, 'an API range error cannot leave stale totals under the new selection');
    await h.page.fill('#range-from', '2026-10-16T09:00');
    await h.page.fill('#range-to', '2026-10-15T09:00');
    const before = h.seen.length;
    await h.page.click('#apply-range');
    assert.match(await h.page.textContent('#range-error'), /start at or before the end/);
    assert.equal(h.seen.length, before, 'inverted ranges never hit the server');
  } finally { await h.browser.close(); }
});

for (const linked of [false, true]) test(`/funnel opens Payoff ${linked ? 'from a link over a saved Trace selection' : 'by default'} and keeps product switching`, async () => {
  const { definitionFor } = require('../../wedge-funnel');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const requests = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(saved => {
      localStorage.setItem('marketelAdminToken', 'test');
      if (saved) localStorage.setItem('marketelWedgeFunnel', JSON.stringify({ version: 2, tool: 'trace', period: 'today', timezone: 'America/Chicago' }));
    }, linked);
    await page.route('http://funnel.test/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/funnel/wedge') {
        requests.push(url.searchParams.get('tool'));
        const tool = ['payoff', 'trace'].includes(url.searchParams.get('tool')) ? url.searchParams.get('tool') : 'payoff';
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ wedges: [{ id: 'payoff', product: 'Payoff' }, { id: 'trace', product: 'Trace' }], tool,
          ...buildWedgeFunnel([], definitionFor(tool)) }) });
      }
      if (url.pathname === '/funnel') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(__dirname, '../../wedge-funnel.html')) });
      return route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://funnel.test/funnel' + (linked ? '?tool=payoff' : ''));
    await page.locator('#wedge-name:has-text("Payoff")').waitFor();
    assert.equal(requests[0], 'payoff');
    assert.match(await page.locator('#ladder').innerText(), /Landed on Payoff/);
    assert.match(await page.locator('#branches').innerText(), /Where they came from/);
    assert.equal(await page.locator('#split-card').isHidden(), true);
    await page.locator('#wedge').selectOption('trace');
    await page.locator('#wedge-name:has-text("Trace")').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('tool'), 'trace');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
