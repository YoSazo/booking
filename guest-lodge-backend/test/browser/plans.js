// Browser check, run by hand (not part of npm test). Needs playwright-core 1.27.1
// and its cached Chromium: NODE_PATH=<dir with playwright-core> node test/browser/plans.js
// See plans: reachable from Reports and the account sheet, US storefront only,
// and the checkout it starts carries the tool it was bought from.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const WWW = path.resolve(__dirname, '../../../marketel-frontdesk-ios/www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const results = []; const check = (n, ok, d = '') => results.push([ok ? 'PASS' : 'FAIL', n, d]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(50); } return false; };
async function scenario(browser, { country, account }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const LOG = [], checkouts = [];
  await ctx.exposeBinding('__record', (_s, m) => LOG.push(m));
  await ctx.addInitScript(([t, country]) => {
    window.webkit = { messageHandlers: { marketelShell: { postMessage: m => { window.__record(JSON.parse(JSON.stringify(m))); if (m.type === 'inspectStorefront') setTimeout(() => window.marketelInspectStorefront(country), 20); } } } };
    localStorage.setItem('inspect.session', t);
  }, ['t'.repeat(43), country]);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('http://app.test/**', r => { const f = path.join(WWW, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f); if (/\.(css|html)$/.test(f)) body = body.toString().replace(/(\d)svh/g, '$1vh');
    if (/inspect\/inspect\.js$/.test(f)) body = body.toString().replace(/^.*\n/, 'const native = true;\n');
    r.fulfill({ status: 200, body, headers: { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' } }); });
  await page.route('https://bookmarketel.com/api/inspect/**', async r => {
    const req = r.request(), p = new URL(req.url()).pathname.slice('/api/inspect'.length);
    const j = b => r.fulfill({ status: 200, body: JSON.stringify(b), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (req.method() === 'OPTIONS') return j({});
    if (p === '/config') return j({ enabled: true });
    if (p === '/account') return j(account);
    if (p === '/reports') return j({ reports: [], nextCursor: null });
    if (p === '/properties') return j({ properties: [], propertyDetails: [] });
    if (p === '/checkout') { checkouts.push(JSON.parse(req.postData())); return j({ url: 'https://checkout.stripe.com/c/pay/cs_live_x' }); }
    return j({ ok: true });
  });
  await page.goto('http://app.test/inspect/index.html?arm=claims', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#new-report');
  await sleep(400);
  const text = () => page.evaluate(() => document.getElementById('app').innerText.replace(/\s+/g, ' '));
  return { ctx, page, LOG, checkouts, errs, text };
}
(async () => {
  const browser = await chromium.launch();
  const fresh = { token: 't'.repeat(43), email: 'o@e.com', businessName: 'Pine Stays', active: false, freeAvailable: true, remaining: 0, credits: 0, plans: ['year', 'month'] };
  { // US, no plan: plans are one tap away from Reports and the account sheet.
    const { ctx, page, LOG, checkouts, errs, text } = await scenario(browser, { country: 'USA', account: fresh });
    await until(async () => !!(await page.$('#plans')), 3000);
    const t = await text();
    check('US, no plan: Reports says building is free and sending needs a plan, never "first report is free"', /Building a report is free\. Sending one needs a plan\./.test(t) && !/first complete report is free/.test(t), t.slice(0, 160));
    check('US, no plan: "See plans →" is on Reports', !!(await page.$('#plans')));
    await page.click('#plans'); await page.waitForSelector('#buy');
    check('it opens the plans sheet with both plans', (await page.$$('[data-plan]')).length === 2);
    await page.click('#buy');
    await until(async () => LOG.some(m => m.type === 'openPurchase'), 3000);
    check('Subscribe opens Stripe outside the app, for Claims, from the app', LOG.some(m => m.type === 'openPurchase' && /checkout\.stripe\.com/.test(m.url)) && checkouts[0]?.tool === 'claims' && checkouts[0]?.native === true, JSON.stringify(checkouts));
    await page.evaluate(() => document.getElementById('dialog').close());
    await page.evaluate(() => window.marketelInspectNativeAction('account'));
    await page.waitForSelector('#see-plans', { timeout: 3000 }).catch(() => {});
    check('the account sheet offers See plans too', !!(await page.$('#see-plans')));
    if (await page.$('#see-plans')) { await page.click('#see-plans'); check('and it opens the same plans sheet', !!(await page.waitForSelector('#buy', { timeout: 3000 }).catch(() => null))); }
    check('no page errors (US)', !errs.length, errs.join(' | '));
    await ctx.close(); }
  { // Outside the US: no price, no link, nothing that points at paying elsewhere.
    const { ctx, page, errs, text } = await scenario(browser, { country: 'GBR', account: fresh });
    await sleep(600);
    const t = await text();
    check('outside the US: no See plans, and no "needs a plan"', !(await page.$('#plans')) && !/needs a plan/.test(t) && /Building a report is free\./.test(t), t.slice(0, 160));
    await page.evaluate(() => window.marketelInspectNativeAction('account'));
    await sleep(1300);
    check('outside the US: the account sheet has no See plans', !(await page.$('#see-plans')));
    check('no page errors (outside US)', !errs.length, errs.join(' | '));
    await ctx.close(); }
  { // Subscribed, or holding credits: nothing to sell.
    const { ctx, page, text } = await scenario(browser, { country: 'USA', account: { ...fresh, active: true, remaining: 300, freeAvailable: false } });
    await sleep(600);
    check('subscribed: no See plans, and it says unlimited', !(await page.$('#plans')) && /Unlimited reports on your plan\./.test(await text()));
    await ctx.close(); }
  { const { ctx, page, text } = await scenario(browser, { country: 'USA', account: { ...fresh, credits: 3 } });
    await sleep(600);
    check('holding credits: says how many are ready to send, no See plans', !(await page.$('#plans')) && /3 reports ready to send\./.test(await text()), (await text()).slice(0, 120));
    await ctx.close(); }
  await browser.close();
  for (const [s, n, d] of results) console.log(`${s}  ${n}${s === 'FAIL' && d ? `\n      ${String(d).slice(0, 300)}` : ''}`);
  console.log(`\n${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
})().catch(e => { console.log('SCRIPT', e.message.slice(0, 400)); process.exit(1); });
