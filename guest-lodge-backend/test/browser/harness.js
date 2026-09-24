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
const account = (extra = {}) => ({ token, email: 'owner@example.test', active: false, freeAvailable: true, remaining: 0, credits: 0, plans: ['month', 'year'], businessName: '', ...extra });
const document = (type = 'damage', extra = {}) => ({ propertyName: 'Pine Cottage', author: 'A. Host', type, date: '2026-09-23', rooms: [{ name: type === 'damage' ? '' : 'Kitchen', observation: '', issue: false, photos: [] }], signatures: [], ...extra });
const report = (type = 'damage', extra = {}) => ({ id: `report-${Math.random().toString(36).slice(2)}`, document: document(type), attachments: [], finalizedAt: null, updatedAt: new Date().toISOString(), baselineReportId: null, ...extra });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function open({ native = false, arm = 'claims', demo = false, signedIn = true, accountData = {}, reports = [], properties = [], slowList = 0, slowAccount = 0, refuseDelete = false, country = 'USA' } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const shell = [], events = [], purchases = [], errors = [];
  const data = { reports: [...reports], properties: [...properties], account: account(accountData), photoCount: 0 };
  await context.exposeBinding('__shell', (_, message) => shell.push(message));
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
    let rel = /^\/(claims|incident|moveout)\/?$/.test(url.pathname) ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/inspect\/?/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const root = native ? APP : WEB;
    const filename = path.resolve(root, rel);
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename)) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(filename);
    if (/\.(css|html)$/.test(filename)) body = Buffer.from(body.toString().replace(/(\d)svh/g, '$1vh'));
    if (native && filename.endsWith('inspect.js')) body = Buffer.from(body.toString().replace(/^.*\n/, 'const native = true;\n'));
    return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[path.extname(filename)] || 'application/octet-stream' } });
  });
  await page.route('**/api/inspect/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname.slice('/api/inspect'.length);
    const method = request.method();
    const json = (body, status = 200) => route.fulfill({ status, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (method === 'OPTIONS') return json({});
    if (p === '/config') return json({ enabled: true, limits: { photos: 100, reports: 300 } });
    if (p === '/account' && method === 'GET') { if (slowAccount) await wait(slowAccount); return json(data.account); }
    if (p === '/properties' && method === 'GET') return json({ properties: data.properties, propertyDetails: data.properties.map(name => ({ name, reportCount: 0, checkInCount: 0, latestCheckIn: null })) });
    if (p === '/properties' && method === 'POST') { const name = JSON.parse(request.postData()).name; if (!data.properties.includes(name)) data.properties.push(name); return json({ properties: data.properties, propertyDetails: data.properties.map(name => ({ name, reportCount: 0, checkInCount: 0, latestCheckIn: null })) }); }
    if (p === '/properties' && method === 'DELETE') { if (refuseDelete) return json({ error: 'Could not delete property.' }, 409); data.properties = data.properties.filter(name => name !== JSON.parse(request.postData()).name); return json({ properties: data.properties, propertyDetails: data.properties.map(name => ({ name, reportCount: 0, checkInCount: 0, latestCheckIn: null })) }); }
    if (p === '/reports' && method === 'GET') { if (slowList) await wait(slowList); const types = url.searchParams.get('types')?.split(',') || []; return json({ reports: data.reports.filter(row => !types.length || types.includes(row.document.type)), nextCursor: null }); }
    if (p === '/reports' && method === 'POST') { const body = JSON.parse(request.postData()); const row = report(body.type, { document: body }); data.reports.unshift(row); return json(row); }
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
      if (tail === '/photos' && method === 'POST') { const id = `photo-${++data.photoCount}`; row.attachments.push({ id, source: 'camera', createdAt: new Date().toISOString() }); return json({ id, source: 'camera', createdAt: new Date().toISOString() }); }
      if (/^\/photos\/[^/]+/.test(tail)) return route.fulfill({ status: 200, body: JPEG, headers: { 'content-type': 'image/jpeg', 'access-control-allow-origin': '*' } });
      if (tail === '/coverage' && method === 'POST') return json({ rooms: [] });
      if (tail === '/rewrite' && method === 'POST') return json({ suggestion: 'The fixture wording.' });
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
