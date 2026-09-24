'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWedgeFunnel, excludedAccountIds, STEPS, VISITOR_EVENTS } = require('../wedge-funnel');

const at = minutes => new Date(Date.UTC(2026, 8, 24, 12, minutes)).toISOString();
let seq = 0;
const ev = (name, who, extra = {}) => ({ id: `e${++seq}`, name, visitorId: who.startsWith('v_') ? who : null, accountId: who.startsWith('v_') ? null : who, detail: null, createdAt: at(seq), ...extra });

test('the funnel counts people, not taps, and reads each step against the one before', () => {
  const events = [
    ev('SimStarted', 'v_a', { detail: 'phone' }), ev('SimStarted', 'v_a', { detail: 'phone' }), // a reload is one person
    ev('SimStarted', 'v_b', { detail: 'desktop' }), ev('LandingViewed', 'v_c'),
    ev('SimFindingPicked', 'v_a'), ev('SimFindingPicked', 'v_b'),
    ev('SimReportShown', 'v_a'),
    ev('SimCheckoutTapped', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
    ev('TrialStarted', 'acct1', { visitorId: 'v_a' }),
    ev('FirstPayment', 'acct1', { visitorId: 'v_a' }),
    ev('CancellationScheduled', 'acct2', { detail: 'trial' }),
  ];
  const f = buildWedgeFunnel(events);
  const step = key => f.steps.find(s => s.key === key);
  assert.equal(f.steps.length, STEPS.length);
  assert.equal(step('landed').people, 3, 'three people landed: two in the demo, one on the desktop page');
  assert.equal(step('demo').people, 2);
  assert.equal(step('picked').people, 2);
  assert.equal(step('picked').ofPrevious, 1);
  assert.equal(step('report').people, 1);
  assert.equal(step('tapped').people, 1, 'tapping twice is one person');
  assert.equal(step('trial').people, 1);
  assert.equal(step('paid').people, 1);
  assert.equal(step('paid').ofLanded, 1 / 3);
  assert.deepEqual(f.split, { phone: 1, desktop: 1, unknown: 0 });
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
