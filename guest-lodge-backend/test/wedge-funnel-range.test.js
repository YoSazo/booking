'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { wedgeFunnelRange } = require('../wedge-funnel-range');
const now = new Date('2026-10-15T14:12:00Z');
const bounds = (query, clock = now) => {
  const r = wedgeFunnelRange(query, clock);
  return [r.since.toISOString(), r.until.toISOString()];
};

test('Today starts at reporting midnight, not 24 hours ago; Yesterday cannot include today', () => {
  assert.deepEqual(bounds({ period: 'today' }), ['2026-10-15T05:00:00.000Z', now.toISOString()]);
  assert.deepEqual(bounds({ days: '1' }), bounds({ period: 'today' }));
  assert.deepEqual(bounds({ period: 'yesterday' }), ['2026-10-14T05:00:00.000Z', '2026-10-15T04:59:59.999Z']);
  assert.deepEqual(bounds({ period: '24h' }), ['2026-10-14T14:12:00.000Z', now.toISOString()]);
  assert.deepEqual(bounds({ period: 'today', timezone: 'UTC' }), ['2026-10-15T00:00:00.000Z', now.toISOString()]);
});

test('calendar days are 23 or 25 hours at Chicago daylight-saving boundaries', () => {
  for (const [clock, start, end, hours] of [
    ['2026-03-09T15:00:00Z', '2026-03-08T06:00:00.000Z', '2026-03-09T04:59:59.999Z', 23],
    ['2026-11-02T15:00:00Z', '2026-11-01T05:00:00.000Z', '2026-11-02T05:59:59.999Z', 25],
  ]) {
    const r = bounds({ period: 'yesterday' }, new Date(clock));
    assert.deepEqual(r, [start, end]);
    assert.equal((Date.parse(r[1]) - Date.parse(r[0]) + 1) / 3600000, hours);
  }
});

test('7/30 days include today; old rolling-days callers remain supported', () => {
  assert.equal(bounds({ period: '7d' })[0], '2026-10-09T05:00:00.000Z');
  assert.equal(bounds({ period: '30d' })[0], '2026-09-16T05:00:00.000Z');
  assert.equal(bounds({ days: '7' })[0], '2026-10-08T14:12:00.000Z');
  assert.equal(bounds({ period: 'all' })[0], '2020-01-01T00:00:00.000Z');
});

test('custom local times use the requested timezone and include the entire end minute', () => {
  assert.deepEqual(bounds({ period: 'custom', timezone: 'America/Chicago', from: '2026-10-14T18:19', to: '2026-10-15T09:12' }),
    ['2026-10-14T23:19:00.000Z', '2026-10-15T14:12:59.999Z']);
  assert.deepEqual(bounds({ from: '2026-10-14', to: '2026-10-14' }), ['2026-10-14T00:00:00.000Z', '2026-10-14T23:59:59.999Z']);
  assert.deepEqual(bounds({ from: '2026-03-08', to: '2026-03-08', timezone: 'America/Chicago' }),
    ['2026-03-08T06:00:00.000Z', '2026-03-09T04:59:59.999Z']);
  assert.deepEqual(bounds({ period: 'custom', from: '2026-10-14T23:19:19Z', to: '2026-10-15T09:12:00-05:00' }),
    ['2026-10-14T23:19:19.000Z', now.toISOString()]);
});

test('invalid, inverted, incomplete and ambiguous date ranges fail closed with HTTP 400', () => {
  for (const query of [
    { period: 'bogus' }, { timezone: 'Not/AZone' }, { period: 'custom' },
    { from: '2026-02-30', to: '2026-03-02' }, { from: '2026-10-16', to: '2026-10-15' },
    { from: '2026-02-30T00:00:00Z', to: '2026-03-02T00:00:00Z' },
    { from: '2026-10-14T25:00', to: '2026-10-15' }, { from: ['2026-10-14'], to: '2026-10-15' },
    { from: '2026-03-08T02:30', to: '2026-03-08T04:00', timezone: 'America/Chicago' },
    { from: '2026-11-01T01:30', to: '2026-11-01T03:00', timezone: 'America/Chicago' },
  ]) assert.throws(() => wedgeFunnelRange(query, now), error => error.status === 400, JSON.stringify(query));
});

test('explicit dashboard periods bypass reset clipping; server exposes actual bounds and truncation', () => {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const route = server.slice(server.indexOf("app.get('/api/funnel/wedge',"), server.indexOf("app.post('/api/funnel/wedge/reset',"));
  assert.match(route, /range\.period === 'since-reset' \|\| \(!req\.query\.period/);
  assert.match(route, /timezone: range\.timeZone/);
  assert.match(route, /requestedFrom/);
  assert.match(route, /take: 20001/);
  assert.match(route, /onlyAdClicks\(visibleEvents, adSources\)/);
  assert.match(route, /if \(e\.status === 400\)/);
});

test('the actual dashboard handler excludes yesterday\'s checkout, preserves pre-midnight attribution, and rejects invalid ranges', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const route = source.slice(source.indexOf("app.get('/api/funnel/wedge',"), source.indexOf('// Clears a wedge\'s visitor steps only.'));
  const funnel = require('../wedge-funnel');
  const events = [
    { id: 'old', tool: 'claims', name: 'OfferFrom', detail: 'ad', visitorId: 'v_ad', createdAt: new Date('2026-10-15T03:48:00Z') },
    { id: 'old-checkout', tool: 'claims', name: 'SimCheckoutRendered', visitorId: 'v_ad', createdAt: new Date('2026-10-15T03:50:11Z') },
    { id: 'new-activity', tool: 'claims', name: 'OfferEngaged', visitorId: 'v_ad', createdAt: new Date('2026-10-15T13:00:00Z') },
  ];
  let handler;
  const queries = [];
  const prisma = {
    inspectAccount: { findMany: async () => [] },
    inspectEvent: {
      findFirst: async () => ({ createdAt: new Date('2026-10-15T12:00:00Z') }),
      findMany: async query => {
        queries.push(query);
        return events.filter(e => e.createdAt <= query.where.createdAt.lte &&
          (!query.where.createdAt.gte || e.createdAt >= query.where.createdAt.gte) &&
          (!query.where.name || e.name === query.where.name));
      },
    },
  };
  new Function('app', 'adminAuth', 'dashboardWedges', 'wedgeFunnelRange', 'wedgeFunnel', 'prisma', 'withRetry', 'FUNNEL_DASHBOARD_EXCLUDED_OWNER_EMAILS', route)(
    { get: (url, auth, fn) => { handler = fn; } }, () => {}, () => [{ id: 'claims', product: 'Claims' }],
    query => wedgeFunnelRange(query, now), funnel, prisma, fn => fn(), []);
  const request = async query => {
    let status = 200, body;
    const response = { status: value => { status = value; return response; }, json: value => { body = value; } };
    await handler({ query: { tool: 'claims', ...query } }, response);
    return { status, body };
  };
  const today = await request({ period: 'today', timezone: 'America/Chicago', ad: '1' });
  assert.equal(today.status, 200);
  assert.equal(today.body.from, '2026-10-15T05:00:00.000Z', 'the later marker does not shorten Today');
  assert.equal(today.body.resetApplied, false);
  assert.equal(today.body.steps.find(s => s.key === 'checkout-ready').people, 0);
  assert.equal(today.body.steps.find(s => s.key === 'engaged').people, 1, 'today\'s engagement keeps its earlier ad attribution');
  assert.equal(queries[1].where.createdAt.gte, undefined, 'source lookup is not clipped to today');
  const yesterday = await request({ period: 'yesterday', timezone: 'America/Chicago', ad: '1' });
  assert.equal(yesterday.body.steps.find(s => s.key === 'checkout-ready').people, 1);
  const reset = await request({ period: 'since-reset' });
  assert.equal(reset.body.from, '2026-10-15T12:00:00.000Z');
  assert.equal(reset.body.resetApplied, true);
  const invalid = await request({ period: 'custom', from: 'not-a-time', to: '2026-10-15T00:00' });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /timestamp/i);
});
