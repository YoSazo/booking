'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWedgeFunnel, excludedAccountIds, STEPS, VISITOR_EVENTS } = require('../wedge-funnel');

const at = minutes => new Date(Date.UTC(2026, 8, 24, 12, minutes)).toISOString();
let seq = 0;
const ev = (name, who, extra = {}) => ({ id: `e${++seq}`, name, visitorId: who.startsWith('v_') ? who : null, accountId: who.startsWith('v_') ? null : who, detail: null, createdAt: at(seq), ...extra });

test('the funnel counts people, not taps, and reads each step against the one before', () => {
  const events = [
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferLanded', 'v_a', { detail: 'phone' }), // a reload is one person
    ev('OfferLanded', 'v_b', { detail: 'desktop' }), ev('SimStarted', 'v_d', { detail: 'phone' }), ev('LandingViewed', 'v_c'),
    ev('OfferVideoQuarter', 'v_a'), ev('OfferVideoQuarter', 'v_b'),
    ev('OfferVideoHalf', 'v_a'),
    ev('SimFindingPicked', 'v_d'),
    ev('SimCheckoutTapped', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
    ev('TrialStarted', 'acct1', { visitorId: 'v_a' }),
    ev('FirstPayment', 'acct1', { visitorId: 'v_a' }),
    ev('CancellationScheduled', 'acct2', { detail: 'trial' }),
  ];
  const f = buildWedgeFunnel(events);
  const step = key => f.steps.find(s => s.key === key);
  assert.equal(f.steps.length, STEPS.length);
  assert.equal(step('landed').people, 4, 'the video landing, the try-it demo and the desktop page all count as landing');
  assert.equal(step('quarter').people, 2);
  assert.equal(step('half').people, 1);
  assert.equal(step('half').ofPrevious, 0.5);
  assert.equal(step('tapped').people, 1, 'tapping twice is one person');
  assert.equal(step('trial').people, 1);
  assert.equal(step('paid').people, 1);
  assert.equal(step('paid').ofLanded, 1 / 4);
  assert.deepEqual(f.split, { phone: 2, desktop: 1, unknown: 0 });
  const demo = f.branches.find(b => b.key === 'demo');
  assert.equal(demo.steps.find(s => s.label === 'Picked a finding').people, 1, 'the try-it demo is its own card');
  const churn = f.branches.find(b => b.key === 'churn');
  assert.equal(churn.steps.find(s => s.label === 'Cancelled in the trial').people, 1);
  assert.equal(churn.steps.find(s => s.label === 'Cancelled after paying').people, 0);
  assert.equal(f.recent[0].name, 'CancellationScheduled', 'newest first');
  assert.ok(f.recent.every(r => r.label && r.who.length <= 6));
});

test('an empty range reads as zeros, never a division by zero', () => {
  const f = buildWedgeFunnel([]);
  assert.ok(f.steps.every(s => s.people === 0 && (s.ofLanded === null) && (s.ofPrevious === null)));
  assert.deepEqual(f.recent, []);
});

test('a reset can only clear visitor steps, never the server records that prevent doing things twice', () => {
  for (const kept of ['TrialStarted', 'FirstPayment', 'PaymentSucceeded', 'TrialReminderSent', 'KeptFree', 'AccountVerified', 'ReportFinalized', 'SimCheckoutStarted', 'SimPurchased'])
    assert.ok(!VISITOR_EVENTS.includes(kept), `${kept} must never be reset`);
  assert.ok(VISITOR_EVENTS.includes('SimStarted') && VISITOR_EVENTS.includes('SimCheckoutTapped'));
  assert.ok(['OfferLanded', 'OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded'].every(name => VISITOR_EVENTS.includes(name)), 'a reset clears the video landing too');
});

test('owner accounts, their plus-aliases and App Review are left out', async () => {
  let where;
  const prisma = { inspectAccount: { findMany: async args => { where = args.where; return [{ id: 'owner' }, { id: 'alias' }]; } } };
  const ids = await excludedAccountIds(prisma, ['Owner@Gmail.com', 'appreview@bookmarketel.com', null]);
  assert.deepEqual(ids, ['owner', 'alias']);
  assert.deepEqual(where.OR[0], { email: 'owner@gmail.com' });
  assert.deepEqual(where.OR[1], { AND: [{ email: { startsWith: 'owner+' } }, { email: { endsWith: '@gmail.com' } }] });
  assert.deepEqual(where.OR[2], { email: 'appreview@bookmarketel.com' });
  assert.deepEqual(await excludedAccountIds(prisma, []), []);
});

test('the app\'s own start screen is not a visit from an ad', () => {
  const events = [ev('LandingViewed', 'v_web1', { detail: 'web' }), ev('LandingViewed', 'v_app1', { detail: 'app' }), ev('LandingViewed', 'v_old1')];
  const f = buildWedgeFunnel(events);
  assert.equal(f.steps.find(s => s.key === 'landed').people, 2, 'web and untagged older visits count; the app does not');
});

test('a reset marks where counting starts, from the latest marker', async () => {
  const { countingSince, RESET_EVENT } = require('../wedge-funnel');
  let where;
  const at = new Date('2026-09-24T19:05:00Z');
  const prisma = { inspectEvent: { findFirst: async args => { where = args; return { createdAt: at }; } } };
  assert.deepEqual(await countingSince(prisma, 'claims'), at);
  assert.deepEqual(where.where, { tool: 'claims', name: RESET_EVENT });
  assert.deepEqual(where.orderBy, { createdAt: 'desc' });
  assert.equal(await countingSince({ inspectEvent: { findFirst: async () => null } }, 'claims'), null);
  assert.ok(!VISITOR_EVENTS.includes(RESET_EVENT), 'a reset never deletes its own marker');
});
