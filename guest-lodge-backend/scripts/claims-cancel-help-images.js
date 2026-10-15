'use strict';
// Builds the two pictures behind "How do I cancel?": the real management page
// (rendered by claims-paid-trial.js itself) and the real welcome email text.
// Run after changing either, then commit public/inspect/cancel-*.png.
//   node scripts/claims-cancel-help-images.js
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { chromium } = require('playwright-core');
const { createClaimsPaidTrial } = require('../claims-paid-trial');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'inspect');
const ENDS = new Date('2026-10-19T15:00:00Z');
const account = { id: 'acct_example', email: 'you@example.com', claimsPaidTrial: { version: 'claims-1-48-v1', status: 'active', sessionId: 'cs_example',
  startedAt: new Date(ENDS - 3 * 86400000).toISOString(), endsAt: ENDS.toISOString() } };
const sent = [];
const service = createClaimsPaidTrial({ prisma: { $queryRaw: async () => [{ now: new Date() }] }, stripe: {}, mail: { sendMail: async m => sent.push(m) },
  secret: 'x'.repeat(32), origin: 'https://bookmarketel.com', lockAccount: async () => account, record: async () => {}, queueCapi: async () => {} });

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// The welcome email is built by the worker; capture the real text it sends.
async function welcomeText() {
  const prisma = { inspectAccount: { findUnique: async () => structuredClone(account), findMany: async ({ cursor } = {}) => cursor ? [] : [structuredClone(account)] },
    $transaction: async fn => fn({ inspectAccount: { update: async ({ data }) => Object.assign(account, data) } }), $queryRaw: async () => [{ now: new Date(ENDS - 3 * 86400000 + 60000) }] };
  const mail = { sendMail: async m => sent.push(m) };
  const svc = createClaimsPaidTrial({ prisma, stripe: { paymentIntents: { retrieve: async () => ({}) } }, mail, secret: 'x'.repeat(32), origin: 'https://bookmarketel.com',
    lockAccount: async (tx, id) => structuredClone(account), record: async () => {}, queueCapi: async () => {},
    now: async () => new Date(ENDS - 3 * 86400000 + 60000) });
  account.claimsPaidTrial.startedRecordedAt = account.claimsPaidTrial.startedAt;
  await svc.sweep.call(null);
  const welcome = sent.find(m => /has started/.test(m.subject));
  if (!welcome) throw new Error('welcome email was not produced');
  return welcome;
}

(async () => {
  const welcome = await welcomeText();
  const link = welcome.text.match(/Manage or cancel your trial: (\S+)/)[1].replace(/account=[^&]+&token=[a-f0-9]+/, 'account=…&token=…');
  const body = welcome.text.replace(/Manage or cancel your trial: \S+/, 'Manage or cancel your trial: @@LINK@@');
  const emailHtml = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#eef2ee;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1c2a22">
<div style="width:366px;margin:12px;background:#fff;border:1px solid #d5ded7;border-radius:14px;overflow:hidden">
<div style="padding:12px 16px;background:#f6f9f6;border-bottom:1px solid #e3eae4"><div style="font-size:12px;color:#66756b">From: Marketel &lt;support@bookmarketel.com&gt;</div>
<div style="font-weight:700;margin-top:2px">${esc(welcome.subject)}</div></div>
<div style="padding:14px 16px;white-space:pre-wrap;font-size:14px">${esc(body).replace('@@LINK@@', `<br><span id="go" style="display:inline-block;margin-top:2px;padding:3px 6px;border-radius:6px;background:#fff3c4;outline:3px solid #f0a500;word-break:break-all"><b>Manage or cancel your trial</b>: <u style="color:#1a5fb4">${esc(link)}</u></span>`).replace(/Manage or cancel your trial: <br>/, '')}</div></div></body>`;
  const pageHtml = service.page(account).replace('href="/inspect/inspect.css"', `href="file://${path.join(OUT, 'inspect.css')}"`)
    .replace('</body>', '<style>.card button[type=submit]{outline:4px solid #f0a500;outline-offset:3px}</style></body>');
  const browser = await chromium.launch();
  const shot = async (html, name, selector) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 });
    // A file (not setContent) so the stylesheet link resolves like production.
    const file = path.join(require('os').tmpdir(), `claims-cancel-help-${name}.html`);
    fs.writeFileSync(file, html);
    await page.goto(`file://${file}`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const png = await (await page.$(selector)).screenshot();
    await sharp(png).resize({ width: 640 }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(path.join(OUT, name));
    await page.close();
  };
  await shot(emailHtml, 'cancel-email.png', 'body > div');
  await shot(pageHtml, 'cancel-page.png', 'section.card');
  await browser.close();
  for (const n of ['cancel-email.png', 'cancel-page.png']) console.log(n, fs.statSync(path.join(OUT, n)).size, 'bytes');
})().catch(e => { console.error(e); process.exit(1); });
