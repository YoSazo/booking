'use strict';
// The long-form Claims offer (/claims/offer) only sends events and plans the
// server accepts, so its visits land on /funnel and its checkout is the $49 one.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const page = fs.readFileSync(path.join(__dirname, '../public/claims-offer/offer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/claims-offer/index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '../inspect.js'), 'utf8');

test('every event the offer page sends is on the anonymous Claims allowlist', () => {
  const allowed = new Set([...server.matchAll(/'((?:Offer|Sim)[A-Za-z0-9]+)'/g)].map(m => m[1]));
  const sent = [...new Set([...page.matchAll(/track\('([A-Za-z0-9]+)'/g)].map(m => m[1]))];
  assert.ok(sent.length >= 10, sent.join());
  for (const name of sent) assert.ok(allowed.has(name), `${name} is not accepted by /api/inspect/events/anon`);
});

test('it sells the one-time plan through the existing checkout and keeps long Meta click ids', () => {
  assert.match(page, /\/api\/inspect\/checkout\/sim/);
  assert.match(page, /plan: 'lifetime'/);
  assert.doesNotMatch(page, /lifetime_trial/);
  assert.match(page, /\{1,470\}/, 'fbclid values up to 470 characters are kept');
});

test('the page states the real guarantee and makes no promise a platform will pay', () => {
  assert.match(html, /haven't sent a report/);
  assert.match(html, /within 3 days/);
  assert.match(html, /No platform is guaranteed to accept a claim/);
  assert.doesNotMatch(html, /line-through|Reg\. price|countdown/i);
});
