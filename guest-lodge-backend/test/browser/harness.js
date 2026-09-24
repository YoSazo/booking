// Browser contract harness. The bundled app is exercised in Chromium with the
// few WebKit behaviours that previously escaped desktop tests.
'use strict';

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const WEB = path.resolve(__dirname, '../../public/inspect');
const APP = path.resolve(__dirname, '../../../marketel-frontdesk-ios/www/inspect');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const JPEG = fs.readFileSync(path.join(WEB, 'sample/claims-wall-thumb.jpg'));
const token = 't'.repeat(43);
const fixtureManifest = require('../../wedges/_fixture');
// Every wedge's own page (/claims, /moveout, …), read from the manifests.
const WEDGE_PAGE = new RegExp(`^/(${require('../../wedges/registry').load({ fixture: true }).all.map(wedge => wedge.id).filter(id => id !== 'inspect').join('|')})/?$`);
const account = (extra = {}) => ({ token, email: 'owner@example.test', active: false, freeAvailable: true, remaining: 0, credits: 0, plans: ['month', 'year'], businessName: '', ...extra });
const document = (type = 'damage', extra = {}) => ({ propertyName: 'Pine Cottage', author: 'A. Host', type, date: '2026-09-23', rooms: [{ name: type === 'damage' ? '' : 'Kitchen', observation: '', issue: false, photos: [] }], signatures: [], ...extra });
const report = (type = 'damage', extra = {}) => ({ id: `report-${Math.random().toString(36).slice(2)}`, document: document(type), attachments: [], finalizedAt: null, updatedAt: new Date().toISOString(), baselineReportId: null, ...extra });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function open({ native = false, arm = 'claims', demo = false, signedIn = true, accountData = {}, reports = [], properties = [], slowList = 0, slowAccount = 0, slowRewrite = 0, refuseDelete = false, country = 'USA', includeFixture = false, viewport = { width: 390, height: 844 }, deviceScaleFactor = 1, videoDir = null, photoFallback = null, sentPhoto = null, webRoot = WEB, appRoot = APP } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile: true, hasTouch: true, ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 1080, height: 1920 } } } : {}) });
  const shell = [], events = [], purchases = [], errors = [];
  const fallbackPhoto = photoFallback ? fs.readFileSync(photoFallback) : JPEG;
  const data = { reports: [...reports], properties: [...properties], account: account(accountData), photoCount: 0, photoBytes: new Map() };
  await context.exposeBinding('__shell', (_, message) => shell.push(message));
  // Chromium does not hand test code the body of an upload that carries a file,
  // so each photo is read in the page, stored here by key, and the upload URL
  // carries the key. Without this every photo came back as the fallback.
  const uploadedPhotos = new Map();
  await context.exposeBinding('__storePhoto', (_, key, base64) => { uploadedPhotos.set(key, Buffer.from(base64, 'base64')); });
  await context.addInitScript(() => {
    const realFetch = window.fetch;
    let seq = 0;
    window.fetch = async (url, options = {}) => {
      const photo = options?.body instanceof FormData ? options.body.get('photo') : null;
      if (typeof url === 'string' && /\/api\/inspect\/reports\/[^/?]+\/photos$/.test(url) && photo instanceof Blob) {
        const key = `photo-key-${++seq}`;
        const base64 = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.readAsDataURL(photo); });
        await window.__storePhoto(key, base64);
        url = `${url}?photoKey=${key}`;
      }
      return realFetch(url, options);
    };
  });
  await context.addInitScript(({ native, signedIn, token, arm, country }) => {
    if (signedIn) localStorage.setItem('inspect.session', token);
    if (native) localStorage.setItem('marketel.product', arm);
    window.webkit = { messageHandlers: { marketelShell: { postMessage(message) {
      window.__shell(JSON.parse(JSON.stringify(message)));
      if (message.type === 'inspectStorefront') setTimeout(() => window.marketelInspectStorefront?.(country), 10);
      if (message.type === 'inspectExportPDF') setTimeout(() => window.marketelInspectExportResult?.('shown'), 10);
    } } } };
    // An iPhone tap does not focus a button; code depending on activeElement
    // for loading feedback will fail this check.
    document.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); }, true);
  }, { native, signedIn, token, arm, country });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://app.test/**', route => {
    const url = new URL(route.request().url());
    let rel = WEDGE_PAGE.test(url.pathname) ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/inspect\/?/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const root = native ? appRoot : webRoot;
    let filename = path.resolve(root, rel);
    if (url.pathname.startsWith('/frontdesk/')) filename = path.resolve(root, '..', url.pathname.slice(1));
    if (/^\/(marketel\.svg|marketel-frontdesk-icon\.png)$/.test(url.pathname)) filename = path.resolve(root, '..', url.pathname.slice(1));
    if ((!filename.startsWith(root + path.sep) && !filename.startsWith(path.resolve(root, '..') + path.sep)) || !fs.existsSync(filename)) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(filename);
    if (/\.(css|html)$/.test(filename)) body = Buffer.from(body.toString().replace(/(\d)svh/g, '$1vh'));
    if (includeFixture && filename.endsWith('wedges.js')) body = Buffer.from(body.toString() + `\nwindow.MARKETEL_WEDGES.fixture = ${JSON.stringify(fixtureManifest)};\n`);
    if (native && filename.endsWith('inspect.js')) body = Buffer.from(body.toString().replace(/^.*\n/, 'const native = true;\n'));
    return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[path.extname(filename)] || 'application/octet-stream' } });
  });
  const propertyDetails = () => data.properties.map(name => {
    const rows = data.reports.filter(row => row.document.propertyName === name);
    const baselines = {};
    for (const row of rows.filter(row => row.finalizedAt)) {
      const type = row.document.type;
      if (!baselines[type]) baselines[type] = { count: 0, latest: null };
      baselines[type].count++;
      if (!baselines[type].latest) baselines[type].latest = { id: row.id, date: row.document.date,
        photoCount: row.document.rooms.reduce((sum, room) => sum + room.photos.length, 0) };
    }
    return { name, reportCount: rows.filter(row => row.document.type !== 'check-in' && row.document.type !== 'landlord-move-in' && row.document.type !== 'fixture-arrival').length,
      baselines, checkInCount: baselines['check-in']?.count || 0, latestCheckIn: baselines['check-in']?.latest || null };
  });
  await page.route('**/api/inspect/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname.slice('/api/inspect'.length);
    const method = request.method();
    const json = (body, status = 200) => route.fulfill({ status, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (method === 'OPTIONS') return json({});
    if (p === '/shared/test' && method === 'GET') {
      const row = data.reports.find(item => item.finalizedAt && item.document.rooms.some(room => room.photos.length));
      if (!row) return route.fulfill({ status: 404, body: 'No shared report' });
      const date = new Date(`${row.document.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      const rooms = row.document.rooms.map(room => `<section><h2>${room.name || 'Finding'}</h2>${room.photos.map(id => `<figure><img src="/api/inspect/shared/test/photos/${id}" alt="Recorded photo"><figcaption>Imported · received by Marketel ${date}</figcaption></figure>`).join('')}</section>`).join('');
      return route.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;max-width:850px;margin:40px auto;padding:20px;color:#21372b}img{max-width:100%;max-height:500px}section{border-top:1px solid #ccc;padding:24px 0}figcaption{font-size:13px;color:#587064}</style></head><body><small>PRIVATE REPORT LINK</small><h1>${row.document.propertyName}</h1><p>${date}</p>${rooms}</body></html>` });
    }
    if (p.startsWith('/shared/test/photos/') && method === 'GET') return route.fulfill({ status: 200,
      body: data.photoBytes.get(p.split('/').pop()) || fallbackPhoto, headers: { 'content-type': 'image/jpeg' } });
    if (p === '/config') return json({ enabled: true, limits: { photos: 100, reports: 300 } });
    if (p === '/account' && method === 'GET') { if (slowAccount) await wait(slowAccount); return json(data.account); }
    if (p === '/properties' && method === 'GET') return json({ properties: data.properties, propertyDetails: propertyDetails() });
    if (p === '/properties' && method === 'POST') { const name = JSON.parse(request.postData()).name; if (!data.properties.includes(name)) data.properties.push(name); return json({ properties: data.properties, propertyDetails: propertyDetails() }); }
    if (p === '/properties' && method === 'DELETE') { if (refuseDelete) return json({ error: 'Could not delete property.' }, 409); data.properties = data.properties.filter(name => name !== JSON.parse(request.postData()).name); return json({ properties: data.properties, propertyDetails: propertyDetails() }); }
    if (p === '/reports' && method === 'GET') { if (slowList) await wait(slowList); const types = url.searchParams.get('types')?.split(',') || []; return json({ reports: data.reports.filter(row => !types.length || types.includes(row.document.type)), nextCursor: null }); }
    if (p === '/reports' && method === 'POST') { const body = JSON.parse(request.postData()); const row = report(body.type, { document: body, baselineReportId: JSON.parse(request.postData()).baselineReportId || null }); data.reports.unshift(row); return json(row); }
    const match = /^\/reports\/([^/]+)(.*)$/.exec(p);
    if (match) {
      const row = data.reports.find(item => item.id === match[1]);
      if (!row) return json({ error: 'Report not found.' }, 404);
      const tail = match[2];
      if (!tail && method === 'GET') return json(row);
      if (!tail && method === 'PUT') { row.document = JSON.parse(request.postData()); return json(row); }
      if (!tail && method === 'DELETE') { if (refuseDelete) return json({ error: 'Could not delete report.' }, 409); data.reports = data.reports.filter(item => item.id !== row.id); return json({ success: true }); }
      if (tail === '/comparison' && method === 'GET') return json({ report: row, baseline: data.reports.find(item => item.id === row.baselineReportId) || null });
      if (tail === '/finalize' && method === 'POST') { row.finalizedAt = new Date().toISOString(); return json(row); }
      if (tail === '/photos' && method === 'POST') {
        const id = `photo-${++data.photoCount}`, raw = request.postDataBuffer(), start = raw?.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
        // Cut at the multipart boundary, not the first end-of-image marker: a
        // JPEG with an embedded thumbnail has an earlier one, and the truncated
        // photo made every sent report show the fallback picture.
        const boundary = (String(request.headers()['content-type'] || '').match(/boundary=([^;]+)/) || [])[1];
        const cut = boundary && start >= 0 ? raw.indexOf(Buffer.from(`\r\n--${boundary}`), start) : -1;
        const end = cut > start ? cut - 2 : start >= 0 ? raw.lastIndexOf(Buffer.from([0xff, 0xd9])) : -1;
        const keyed = uploadedPhotos.get(new URL(request.url()).searchParams.get('photoKey') || '');
        if (keyed) data.photoBytes.set(id, keyed);
        else if (end > start) data.photoBytes.set(id, raw.subarray(start, end + 2));
        row.attachments.push({ id, source: 'camera', createdAt: new Date().toISOString() });
        return json({ id, source: 'camera', createdAt: new Date().toISOString() });
      }
      if (/^\/photos\/[^/]+/.test(tail)) return route.fulfill({ status: 200, body: row.finalizedAt && sentPhoto ? fs.readFileSync(sentPhoto) : data.photoBytes.get(tail.split('/')[2]) || fallbackPhoto, headers: { 'content-type': 'image/jpeg', 'access-control-allow-origin': '*' } });
      if (tail === '/coverage' && method === 'POST') return json({ rooms: [] });
      if (tail === '/rewrite' && method === 'POST') { if (slowRewrite) await wait(slowRewrite); return json({ suggestion: 'The fixture wording.' }); }
      if (tail === '/share' && method === 'POST') return json({ url: 'https://bookmarketel.com/api/inspect/shared/test' });
      if (tail === '/pdf' && method === 'GET') return route.fulfill({ status: 200, body: '%PDF-1.4 fixture', headers: { 'content-type': 'application/pdf' } });
    }
    if (p === '/checkout' || p === '/checkout/sim') { purchases.push(JSON.parse(request.postData() || '{}')); return json({ url: 'https://checkout.stripe.com/c/pay/cs_live_fixture' }); }
    if (p.startsWith('/events')) { events.push(JSON.parse(request.postData() || '{}')); return json({ success: true }); }
    if (p === '/billing/refresh') return json(data.account);
    return json({ success: true });
  });
  await page.goto(native ? `http://app.test/inspect/index.html?arm=${arm}` : `http://app.test/${arm === 'inspect' ? 'inspect/' : arm}?sim=${demo ? '1' : '0'}`, { waitUntil: 'domcontentloaded' });
  const close = async () => { await context.close(); await browser.close(); };
  const body = () => page.locator('body').innerText();
  const assertClean = () => assert.deepEqual(errors, []);
  return { browser, context, page, shell, events, purchases, errors, data, body, close, assertClean };
}

module.exports = { open, account, document, report, wait, JPEG };
