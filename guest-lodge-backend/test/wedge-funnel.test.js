'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWedgeFunnel, excludedAccountIds, STEPS, VISITOR_EVENTS, LABELS, onlyAdClicks } = require('../wedge-funnel');

const at = minutes => new Date(Date.UTC(2026, 8, 24, 12, minutes)).toISOString();
let seq = 0;
const ev = (name, who, extra = {}) => ({ id: `e${++seq}`, name, visitorId: who.startsWith('v_') ? who : null, accountId: who.startsWith('v_') ? null : who, detail: null, createdAt: at(seq), ...extra });

test('$1 paid trial is not a paid-in-full customer; the balance and cancellation remain separate', () => {
  const events = [ev('OfferLanded', 'v_trial'), ev('PaidTrialStarted', 'v_trial')];
  let f = buildWedgeFunnel(events);
  assert.equal(f.steps.find(s => s.key === 'trial').people, 1);
  assert.equal(f.steps.find(s => s.key === 'paid').people, 0);
  events.push(ev('PaidTrialCancelled', 'v_trial'));
  f = buildWedgeFunnel(events);
  assert.equal(f.steps.find(s => s.key === 'paid').people, 0);
  events.push(ev('PaidTrialConverted', 'v_full'));
  f = buildWedgeFunnel(events);
  assert.equal(f.steps.find(s => s.key === 'paid').people, 1);
  assert.equal(f.branches.find(b => b.key === 'paid-trial').steps.find(s => s.label === 'Cancelled before the balance').people, 1);
  for (const name of ['PaidTrialStarted', 'PaidTrialConverted', 'PaidTrialCancelled']) assert.equal(VISITOR_EVENTS.includes(name), false);
});

test('the funnel counts people, not taps, and reads each step against the one before', () => {
  const events = [
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferLanded', 'v_a', { detail: 'phone' }), // a reload is one person
    ev('OfferLanded', 'v_b', { detail: 'desktop' }), ev('SimStarted', 'v_d', { detail: 'phone' }), ev('LandingViewed', 'v_c'),
    ev('OfferEngaged', 'v_a'), ev('OfferEngaged', 'v_b'),
    ev('OfferVideoQuarter', 'v_a'),
    ev('SimFindingPicked', 'v_d'),
    ev('SimCheckoutTapped', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
    ev('TrialStarted', 'acct1', { visitorId: 'v_a' }),
    ev('FirstPayment', 'acct1', { visitorId: 'v_a' }),
    ev('CancellationScheduled', 'acct2', { detail: 'trial' }),
  ];
  const f = buildWedgeFunnel(events);
  const step = key => f.steps.find(s => s.key === key);
  assert.equal(f.steps.length, STEPS.filter(step => !step.hideWhenEmpty).length, 'rows about the first question stay off until someone uses it');
  assert.equal(step('landed').people, 4, 'the video landing, the try-it demo and the desktop page all count as landing');
  assert.equal(step('engaged').people, 2);
  assert.equal(step('engaged').ofPrevious, 0.5);
  assert.equal(f.branches.find(b => b.key === 'video').steps.find(s => s.label === 'Watched a quarter').people, 1, 'the video is its own card');
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

test('each step exposes its latest timestamp, so yesterday\'s checkout is not mistaken for today', () => {
  const f = buildWedgeFunnel([ev('OfferLanded', 'v_a'),
    ev('SimCheckoutRendered', 'v_a', { createdAt: '2026-10-15T03:50:11.755Z' }),
    ev('SimCheckoutRendered', 'v_b', { createdAt: '2026-10-14T22:00:00.000Z' })]);
  assert.equal(f.steps.find(s => s.key === 'checkout-ready').lastAt, '2026-10-15T03:50:11.755Z');
  assert.equal(f.steps.find(s => s.key === 'paid').lastAt, null);
});

test('an earlier ad attribution keeps today\'s activity, without importing earlier events', () => {
  const sources = [ev('OfferFrom', 'v_ad', { detail: 'ad' }), ev('OfferFrom', 'v_direct', { detail: 'direct' })];
  const today = [ev('SimCheckoutRendered', 'v_ad'), ev('SimCheckoutRendered', 'v_direct')];
  const filtered = onlyAdClicks(today, sources);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].visitorId, 'v_ad');
  assert.equal(filtered.some(e => e.name === 'OfferFrom'), false);
});

test('a reset can only clear visitor steps, never the server records that prevent doing things twice', () => {
  for (const kept of ['TrialStarted', 'FirstPayment', 'PaymentSucceeded', 'TrialReminderSent', 'KeptFree', 'AccountVerified', 'ReportFinalized', 'SimCheckoutStarted', 'SimPurchased'])
    assert.ok(!VISITOR_EVENTS.includes(kept), `${kept} must never be reset`);
  assert.ok(VISITOR_EVENTS.includes('SimStarted') && VISITOR_EVENTS.includes('SimCheckoutTapped'));
  assert.ok(['OfferLanded', 'OfferEngaged', 'OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded'].every(name => VISITOR_EVENTS.includes(name)), 'a reset clears the video landing too');
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

test('paying once is paid on the spot: it counts as the purchase step and as paid', () => {
  const events = [
    ev('OfferLanded', 'v_p', { detail: 'phone' }), ev('OfferEngaged', 'v_p'), ev('SimCheckoutTapped', 'v_p', { detail: 'lifetime' }),
    ev('SimCheckoutStarted', 'v_p'), ev('LifetimePurchased', 'acctP', { visitorId: 'v_p' }),
  ];
  const f = buildWedgeFunnel(events);
  const step = key => f.steps.find(s => s.key === key);
  assert.equal(step('trial').people, 1);
  assert.equal(step('paid').people, 1);
  assert.equal(step('paid').ofLanded, 1);
  assert.equal(f.recent[0].label, 'Paid once');
});

test('how far down the page is its own card, and a reset clears it', () => {
  const f = buildWedgeFunnel([
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferLanded', 'v_b', { detail: 'phone' }),
    ev('OfferSawVideo', 'v_a'), ev('OfferSawOffer', 'v_a'), ev('OfferScroll25', 'v_a'), ev('OfferScroll25', 'v_b'), ev('OfferScroll100', 'v_a'),
  ]);
  const card = f.branches.find(b => b.key === 'scroll');
  assert.deepEqual(card.steps.map(s => [s.label, s.people]), [['Saw the video on screen', 1], ['Saw the offer card on screen', 1], ['Scrolled to 25%', 2], ['Scrolled to 50%', 0], ['Scrolled to 75%', 0], ['Scrolled to the bottom', 1], ['Tapped "see a report built"', 0]]);
  assert.ok(['OfferScroll25', 'OfferScroll50', 'OfferScroll75', 'OfferScroll100', 'OfferSawVideo', 'OfferSawOffer', 'OfferCueTapped'].every(name => VISITOR_EVENTS.includes(name)));
});

test('the first question is a funnel step between staying and tapping, and its own card', () => {
  const f = buildWedgeFunnel([
    ev('OfferLanded', 'v_a'), ev('OfferLanded', 'v_b'), ev('OfferLanded', 'v_c'),
    ev('OfferEngaged', 'v_a'), ev('OfferEngaged', 'v_b'),
    ev('OfferWantTapped', 'v_a'), ev('OfferDeclineTapped', 'v_b'),
    ev('SimCheckoutTapped', 'v_a'),
  ]);
  const keys = f.steps.map(step => step.key);
  assert.ok(keys.indexOf('engaged') < keys.indexOf('picked') && keys.indexOf('picked') < keys.indexOf('tapped'));
  assert.equal(f.steps.find(step => step.key === 'picked').people, 2);
  const card = f.branches.find(b => b.key === 'pick');
  assert.deepEqual(card.steps.map(s => [s.label, s.people]), [['Tapped "I want this"', 1], ['Tapped "I don\'t want this"', 1]]);
  assert.ok(['OfferWantTapped', 'OfferDeclineTapped', 'OfferUnsureTapped'].every(name => VISITOR_EVENTS.includes(name)));
});

test('why they did not want it is its own card, and a reset clears it', () => {
  const f = buildWedgeFunnel([
    ev('OfferLanded', 'v_a'), ev('OfferLanded', 'v_b'), ev('OfferLanded', 'v_c'),
    ev('OfferDeclineTapped', 'v_a'), ev('OfferDeclineTapped', 'v_b'), ev('OfferDeclineTapped', 'v_c'),
    ev('OfferReasonPrice', 'v_a'), ev('OfferReasonPrice', 'v_b'), ev('OfferReasonSkipped', 'v_c'),
  ]);
  const card = f.branches.find(b => b.key === 'reasons');
  assert.deepEqual(card.steps.map(s => [s.label, s.people]), [['The price is too expensive', 2], ['Does not rent out property', 0], ['Does not need it', 0], ['Not sure it works', 0], ['Skipped', 1]]);
  assert.ok(['OfferReasonPrice', 'OfferReasonNoProperty', 'OfferReasonNoNeed', 'OfferReasonDoubt', 'OfferReasonSkipped'].every(name => VISITOR_EVENTS.includes(name)));
});

test('the ladder lists every step in order, with the answers and reasons under the question', () => {
  const f = buildWedgeFunnel([
    ev('OfferLanded', 'v_a'), ev('OfferLanded', 'v_b'), ev('OfferLanded', 'v_c'), ev('OfferLanded', 'v_d'),
    ev('OfferSawVideo', 'v_a'), ev('OfferSawVideo', 'v_b'), ev('OfferSawVideo', 'v_c'),
    ev('OfferEngaged', 'v_a'), ev('OfferEngaged', 'v_b'),
    ev('OfferWantTapped', 'v_a'), ev('OfferDeclineTapped', 'v_b'), ev('OfferDeclineTapped', 'v_c'),
    ev('OfferReasonPrice', 'v_b'), ev('OfferReasonSkipped', 'v_c'),
    ev('OfferSawOffer', 'v_a'), ev('SimCheckoutTapped', 'v_a'),
  ]);
  assert.deepEqual(f.steps.slice(0, 11).map(s => s.key), ['landed', 'sawvideo', 'engaged', 'stayed', 'picked', 'sawoffer', 'scroll25', 'scroll50', 'scroll75', 'scroll100', 'tapped']);
  const row = key => f.steps.find(s => s.key === key);
  assert.equal(row('sawvideo').people, 3);
  assert.equal(row('sawvideo').aside, true);
  assert.equal(row('engaged').ofPrevious, 0.5, 'engaged is still of landed');
  assert.equal(row('picked').people, 3);
  assert.equal(row('picked').aside, true);
  assert.equal(row('picked').ofPrevious, 0.75, 'a row beside the line is of everyone who landed, so it can never read over 100%');
  const kids = Object.fromEntries(row('picked').children.map(c => [c.key, c]));
  assert.deepEqual(['want', 'decline', 'why-price', 'why-property', 'why-need', 'why-doubt', 'why-skip'].map(k => kids[k].people), [1, 2, 1, 0, 0, 0, 1]);
  assert.deepEqual([kids.want.depth, kids['why-price'].depth], [1, 2]);
  assert.equal(kids.decline.ofParent, 2 / 3, 'the no is a share of the answers');
  assert.equal(kids['why-price'].ofParent, 0.5, 'a reason is a share of the no');
  assert.equal(row('tapped').people, 1);
  assert.equal(row('tapped').ofPrevious, 0.5, 'the main line skips the rows beside it: tapped is of those who stayed');
  assert.equal(f.steps.every(s => s.children === undefined || s.key === 'picked'), true);
  assert.equal(LABELS.OfferReasonPrice, 'The price is too expensive');
});

test('where they came from is its own card, and "only ad clicks" keeps just those visitors and everything they did', () => {
  const events = [
    ev('OfferLanded', 'v_a', { detail: 'phone' }), ev('OfferFrom', 'v_a', { detail: 'ad' }), ev('OfferBrowser', 'v_a', { detail: 'instagram' }),
    ev('OfferLanded', 'v_b', { detail: 'phone' }), ev('OfferFrom', 'v_b', { detail: 'direct' }), ev('OfferBrowser', 'v_b', { detail: 'safari' }),
    ev('OfferLanded', 'v_c', { detail: 'phone' }), ev('OfferFrom', 'v_c', { detail: 'social' }), ev('OfferBrowser', 'v_c', { detail: 'facebook' }),
    ev('OfferEngaged', 'v_a'), ev('OfferEngaged', 'v_b'), ev('SimCheckoutTapped', 'v_a'),
    ev('LifetimePurchased', 'acct1', { visitorId: 'v_a' }), ev('LifetimePurchased', 'acct2', { visitorId: 'v_b' }),
  ];
  const f = buildWedgeFunnel(events);
  const from = f.branches.find(b => b.key === 'from');
  assert.deepEqual(from.steps.map(s => [s.label, s.people]), [['Clicked the ad (Meta click id)', 1], ['From Facebook or Instagram, no click id', 1], ['No referrer: typed, QR, or you', 1], ['From another site', 0]]);
  assert.deepEqual(f.branches.find(b => b.key === 'browser').steps.map(s => s.people), [1, 1, 1, 0, 0]);
  const ads = buildWedgeFunnel(onlyAdClicks(events));
  const row = key => ads.steps.find(s => s.key === key);
  assert.deepEqual([row('landed').people, row('engaged').people, row('tapped').people, row('trial').people], [1, 1, 1, 1], 'only the ad visitor, with their tap and their payment');
  assert.ok(['OfferFrom', 'OfferBrowser'].every(name => VISITOR_EVENTS.includes(name)));
  assert.deepEqual(onlyAdClicks([ev('OfferLanded', 'v_old')]), [], 'a visit from before the source was recorded is left out');
});

test('Marketel Trace has its own ladder, side cards and ad-click filter', () => {
  const { buildWedgeFunnel, definitionFor, onlyAdClicks } = require('../wedge-funnel');
  const at = '2026-10-16T18:00:00Z';
  const ev = (name, visitorId, detail = null) => ({ id: `${name}-${visitorId}-${detail}`, name, visitorId, detail, accountId: null, createdAt: at });
  const events = [
    ev('TraceLanded', 'v_one', 'web'), ev('TraceFrom', 'v_one', 'ad'), ev('TracePicked', 'v_one', 'ai'), ev('TraceAIGenerated', 'v_one', 'free'),
    ev('TraceStarted', 'v_one', 'ai'), ev('TraceTraced30', 'v_one'), ev('TracePaywallShown', 'v_one', 'done'), ev('TraceCheckoutTapped', 'v_one'),
    ev('TraceCheckoutOpened', 'v_one'), ev('TracePaid', 'v_one'),
    ev('TraceLanded', 'v_two', 'web'), ev('TraceFrom', 'v_two', 'direct'), ev('TracePicked', 'v_two', 'starter'), ev('TraceCameraDenied', 'v_two', 'denied'),
  ];
  const trace = definitionFor('trace');
  const f = buildWedgeFunnel(events, trace);
  const row = key => f.steps.find(step => step.key === key);
  assert.equal(row('landed').people, 2);
  assert.equal(row('picked').people, 2);
  assert.equal(row('started').people, 1);
  assert.equal(row('started').ofPrevious, 0.5);
  assert.equal(row('paid').people, 1);
  assert.equal(row('traced30').aside, true);
  assert.equal(f.split, null, 'no phone/computer split for Trace');
  assert.deepEqual(f.tiles.map(([, key]) => key), ['landed', 'answered1', 'forward', 'picked', 'reviewed', 'started', 'traced30', 'paywall', 'tapped', 'checkout', 'paid']);
  const card = key => Object.fromEntries(f.branches.find(b => b.key === key).steps.map(s => [s.label, s.people]));
  assert.equal(card('picked')['Describe it (AI)'], 1);
  assert.equal(card('picked')['A starter picture'], 1);
  assert.equal(card('camera')['Blocked by the person'], 1);
  assert.equal(card('ai')['Picture drawn (costs money)'], 1);
  assert.equal(card('from')['Clicked the ad (Meta click id)'], 1);
  assert.ok(f.recent.some(r => r.label === 'Paid $14.99'));
  assert.ok(f.recent.some(r => r.name === 'TraceFrom' && r.label === 'Where they came from' && r.detail === 'ad'));
  const adOnly = buildWedgeFunnel(onlyAdClicks(events, events, trace.fromEvent), trace);
  assert.equal(adOnly.steps.find(s => s.key === 'landed').people, 1, 'only the visitor who clicked the ad');
  assert.ok(trace.visitorEvents.includes('TraceStarted') && !trace.visitorEvents.includes('TracePaid'), 'a reset never deletes payments');
  // The report wedges are unchanged.
  assert.equal(definitionFor('claims').fromEvent, 'OfferFrom');
});

test('Marketel Trace: the three pages are counted, and paying on page 2 cannot make taps outnumber price views', () => {
  const { buildWedgeFunnel, definitionFor } = require('../wedge-funnel');
  const at = '2026-10-16T18:00:00Z';
  const ev = (name, visitorId, detail = null) => ({ id: `${name}-${visitorId}-${detail}`, name, visitorId, detail, accountId: null, createdAt: at });
  const events = [
    // one visitor reads the pitch, tries it free, traces, sees the offer sheet and pays
    ev('TraceLanded', 'v_try', 'web'), ev('TraceIntroDone', 'v_try'), ev('TraceChose', 'v_try', 'try'), ev('TracePicked', 'v_try', 'starter'),
    ev('TraceStarted', 'v_try', 'starter'), ev('TracePaywallShown', 'v_try', 'done'), ev('TraceCheckoutTapped', 'v_try'), ev('TraceCheckoutOpened', 'v_try'),
    // another pays on page 2 and never sees the offer sheet
    ev('TraceLanded', 'v_pay', 'web'), ev('TraceIntroDone', 'v_pay'), ev('TraceChose', 'v_pay', 'pay'), ev('TraceCheckoutTapped', 'v_pay'), ev('TraceCheckoutOpened', 'v_pay'),
    // a third leaves on page 1
    ev('TraceLanded', 'v_gone', 'web'),
    // a returning visitor skips the pitch
    ev('TraceLanded', 'v_back', 'web'), ev('TracePicked', 'v_back', 'photo'),
  ];
  const f = buildWedgeFunnel(events, definitionFor('trace'));
  const row = key => f.steps.find(step => step.key === key);
  assert.equal(row('landed').people, 4);
  assert.equal(row('intro').people, 2, 'the old Get started page still counts in old ranges');
  assert.equal(row('intro').aside, true);
  assert.equal(row('chose').people, 2);
  assert.equal(row('paywall').people, 2, 'the offer sheet and Pay once on page 2 both count as seeing the price');
  assert.equal(row('tapped').people, 2);
  assert.ok(row('tapped').ofPrevious <= 1, `taps are never more than price views (${row('tapped').ofPrevious})`);
  const card = key => Object.fromEntries(f.branches.find(b => b.key === key).steps.map(s => [s.label, s.people]));
  assert.equal(card('chose')['Tapped "I want to try it first"'], 1);
  assert.equal(card('chose')['Tapped "I\'m ready: pay $14.99" (straight to Stripe)'], 1);
});

test('Marketel Trace: the cards and the three steps are counted, and stay off the page for ranges without them', () => {
  const { buildWedgeFunnel, definitionFor } = require('../wedge-funnel');
  const at = '2026-10-17T22:00:00Z';
  const ev = (name, visitorId, detail = null) => ({ id: `${name}-${visitorId}-${detail}`, name, visitorId, detail, accountId: null, createdAt: at });
  const events = [
    // one taps the dragon, reads it back, sets up, allows the camera and traces
    ev('TraceLanded', 'v_all', 'web'), ev('TraceSelected', 'v_all', 'dragon'), ev('TracePicked', 'v_all', 'starter'), ev('TraceReviewed', 'v_all'),
    ev('TraceSetupDone', 'v_all'), ev('TraceCameraOk', 'v_all'), ev('TraceCameraAsked', 'v_all'), ev('TraceStarted', 'v_all', 'starter'),
    // one opens the type box and leaves at step 1
    ev('TraceLanded', 'v_typed', 'web'), ev('TraceSelected', 'v_typed', 'type'), ev('TracePicked', 'v_typed', 'ai'),
    // one skips from step 1 straight to the camera
    ev('TraceLanded', 'v_skip', 'web'), ev('TraceSelected', 'v_skip', 'more'), ev('TracePicked', 'v_skip', 'starter'), ev('TraceSkipped', 'v_skip', 'review'),
    // one only looks
    ev('TraceLanded', 'v_look', 'web'),
  ];
  const trace = definitionFor('trace');
  const f = buildWedgeFunnel(events, trace);
  const row = key => f.steps.find(step => step.key === key);
  assert.equal(row('selected').people, 3);
  assert.equal(row('picked').people, 3);
  assert.equal(row('skipped').people, 1);
  assert.equal(row('reviewed').people, 1);
  assert.equal(row('setup').people, 1);
  assert.equal(row('cameraok').people, 1);
  assert.equal(row('started').ofPrevious, 1 / 3, 'the steps are asides: started is measured against picked');
  assert.equal(row('chose'), undefined, 'the old one-screen row hides when nobody used it');
  const card = key => Object.fromEntries(f.branches.find(b => b.key === key).steps.map(s => [s.label, s.people]));
  assert.equal(card('cards').Dragon, 1);
  assert.equal(card('cards')['Anything You Type'], 1);
  assert.equal(card('skipped')['From step 1 (your drawing)'], 1);
  assert.equal(f.branches.some(b => b.key === 'chose'), false);
  for (const name of ['TraceSelected', 'TraceReviewed', 'TraceSetupDone', 'TraceCameraOk', 'TraceSkipped']) assert.ok(trace.visitorEvents.includes(name), name);
  // A range from before the cards shows none of their rows.
  const old = buildWedgeFunnel([ev('TraceLanded', 'v_old', 'web'), ev('TracePicked', 'v_old', 'starter')], trace);
  for (const key of ['selected', 'reviewed', 'setup', 'cameraok', 'skipped']) assert.equal(old.steps.some(s => s.key === key), false, key);
});

test('Marketel Trace: "About you" shows why they came, what they want, how they feel about subscriptions and how they moved forward', () => {
  const { buildWedgeFunnel, definitionFor } = require('../wedge-funnel');
  const at = '2026-10-18T15:00:00Z';
  const ev = (name, visitorId, detail = null) => ({ id: `${name}-${visitorId}-${detail}`, name, visitorId, detail, accountId: null, createdAt: at });
  const events = [
    ev('TraceLanded', 'v_a', 'web'), ev('TraceAnswered', 'v_a', 'why-cantdraw'), ev('TraceAnswered', 'v_a', 'want-anime'), ev('TraceAnswered', 'v_a', 'pay-once'),
    ev('TraceForward', 'v_a', 'try'), ev('TraceSelected', 'v_a', 'mine'), ev('TracePicked', 'v_a', 'starter'),
    ev('TraceLanded', 'v_b', 'web'), ev('TraceAnswered', 'v_b', 'why-paying'), ev('TraceAnswered', 'v_b', 'want-type'), ev('TraceAnswered', 'v_b', 'weekly-999'), ev('TraceForward', 'v_b', 'pay'),
    ev('TraceLanded', 'v_c', 'web'), ev('TraceAnswered', 'v_c', 'why-looking'),
    ev('TraceLanded', 'v_d', 'web'),
  ];
  const f = buildWedgeFunnel(events, definitionFor('trace'));
  const row = key => f.steps.find(step => step.key === key);
  assert.equal(row('answered1').people, 3);
  assert.equal(row('answered1').ofLanded, 0.75);
  assert.equal(row('answered2').people, 2);
  assert.equal(row('answered3').people, 2);
  assert.equal(row('forward').people, 2);
  const card = key => Object.fromEntries(f.branches.find(b => b.key === key).steps.map(s => [s.label, s.people]));
  assert.equal(card('why')["I want to draw, but I can't"], 1);
  assert.equal(card('why')['I pay for a tracing app and want out'], 1);
  assert.equal(card('why')['Just looking'], 1);
  assert.equal(card('want')['Anime characters'], 1);
  assert.equal(card('subs')['Pays $9.99 a week'], 1);
  assert.equal(card('subs')["I'd rather pay once"], 1);
  assert.equal(card('forward')['I want to try it first'], 1);
  assert.equal(card('forward')['This is for me: $14.99 once (straight to Stripe)'], 1);
  assert.equal(card('cards')['A drawing that matched their answer'], 1);
  assert.ok(f.recent.some(r => r.name === 'TraceAnswered' && r.label === 'Answered' && r.detail === 'why-cantdraw'));
  // A range from before the journey shows none of it.
  const old = buildWedgeFunnel([ev('TraceLanded', 'v_old', 'web'), ev('TracePicked', 'v_old', 'starter')], definitionFor('trace'));
  for (const key of ['answered1', 'answered2', 'answered3', 'forward']) assert.equal(old.steps.some(s => s.key === key), false, key);
  for (const key of ['why', 'want', 'subs', 'forward']) assert.equal(old.branches.some(b => b.key === key), false, key);
});

test('Payoff counts checkout, purchases, delivery and sources separately', () => {
  const definition = require('../wedge-funnel').definitionFor('payoff');
  const events = [ev('PayoffLanded', 'v_a'), ev('PayoffLanded', 'v_a'), ev('PayoffLanded', 'v_b'),
    ev('PayoffFrom', 'v_a', { detail: 'ad' }), ev('PayoffFrom', 'v_b', { detail: 'direct' }),
    ev('PayoffOrderViewed', 'v_a'), ev('PayoffCheckoutTapped', 'v_a'), ev('PayoffCheckoutOpened', 'v_a'),
    ev('PayoffPaid', 'v_a'), ev('PayoffConfirmationEmailed', 'v_a'), ev('PayoffCheckoutFailed', 'v_b')];
  const funnel = buildWedgeFunnel(events, definition);
  assert.equal(funnel.steps.find(s => s.key === 'landed').people, 2);
  assert.equal(funnel.steps.find(s => s.key === 'paid').people, 1);
  assert.equal(funnel.steps.find(s => s.key === 'paid').ofLanded, 0.5);
  assert.equal(funnel.steps.find(s => s.key === 'emailed').people, 1);
  assert.equal(funnel.steps.find(s => s.key === 'failed').people, 1);
  assert.deepEqual(funnel.branches[0].steps.map(s => s.people), [1, 0, 1, 0]);
  assert.equal(onlyAdClicks(events, events, definition.fromEvent).length, 8);
  for (const name of ['PayoffPaid', 'PayoffConfirmationEmailed']) assert.equal(definition.visitorEvents.has(name), false);
});

test('Payoff shows how far each visitor read the sales letter, how far they got on the order page, and how long each page was on screen', () => {
  const { definitionFor, buildWedgeFunnel } = require('../wedge-funnel');
  const definition = definitionFor('payoff');
  const events = [
    ev('PayoffLanded', 'v_a'), ev('PayoffVariant', 'v_a', { detail: 'letter' }), ev('PayoffLetter', 'v_a', { detail: 'problem' }), ev('PayoffLetter', 'v_a', { detail: 'example' }),
    ev('PayoffLetter', 'v_a', { detail: 'tap-example' }), ev('PayoffLetter', 'v_a', { detail: 'time10' }),
    ev('PayoffOrderViewed', 'v_a'), ev('PayoffOrder', 'v_a', { detail: 'saw-form' }), ev('PayoffOrder', 'v_a', { detail: 'email' }), ev('PayoffOrder', 'v_a', { detail: 'declined' }),
    ev('PayoffLanded', 'v_b'), ev('PayoffVariant', 'v_b', { detail: 'letter' }), ev('PayoffLetter', 'v_b', { detail: 'problem' }), ev('PayoffLetter', 'v_b', { detail: 'time10' }),
    ev('PayoffStory', 'v_b', { detail: 'time10' }), ev('PayoffStory', 'v_b', { detail: 'time60' }),
  ];
  const funnel = buildWedgeFunnel(events, definition);
  const card = key => Object.fromEntries(funnel.branches.find(b => b.key === key).steps.map(step => [step.label, step.people]));
  const letter = card('letter');
  assert.equal(letter['Opened the sales letter'], 2); assert.equal(letter['Reached “where’s the finish line?”'], 2);
  assert.equal(letter['Reached the worked example'], 1); assert.equal(letter['Read to the end'], 0);
  assert.equal(card('letter-taps')['The button after the worked example'], 1);
  const order = card('order-steps');
  assert.equal(order['Viewed the order page'], 1); assert.equal(order['Stayed 20 seconds or started paying (Meta: AddToCart)'], 0); assert.equal(order['Stayed 20 seconds at the form (for comparison, not sent to Meta)'], 0);assert.equal(order['Scrolled to the form'], 1); assert.equal(order['Typed a valid email (Meta: StartedPaying)'], 1); assert.equal(order['Paid'], 0);
  assert.equal(card('order-other')['Card declined'], 1);
  const time = card('time');
  assert.equal(time['Sales letter: 10 seconds or more'], 2); assert.equal(time['Story page: 1 minute or more'], 1); assert.equal(time['Order page: 10 seconds or more'], 0);
  for (const name of ['PayoffLetter', 'PayoffOrder']) assert.equal(definition.visitorEvents.has(name), true);
  assert.equal(definition.labels.PayoffOrder, 'Order page');
  const bare = buildWedgeFunnel([ev('PayoffLanded', 'v_x')], definition).branches.map(b => b.key);
  for (const key of ['letter', 'letter-taps', 'order-steps', 'order-other', 'time']) assert.equal(bare.includes(key), false, `${key} hidden until someone reaches it`);
});
test('Payoff compares the sales letter and the quiz on each version\'s own visitors, and shows how far quiz visitors got', () => {
  const definition = require('../wedge-funnel').definitionFor('payoff');
  const events = [
    ev('PayoffLanded', 'v_l1'), ev('PayoffVariant', 'v_l1', { detail: 'letter' }), ev('PayoffOrderViewed', 'v_l1'),
    ev('PayoffLanded', 'v_l2'), ev('PayoffVariant', 'v_l2', { detail: 'letter' }),
    ev('PayoffLanded', 'v_q1'), ev('PayoffVariant', 'v_q1', { detail: 'quiz' }), ev('PayoffQuizStep', 'v_q1', { detail: 'q1' }),
    ev('PayoffQuizStep', 'v_q1', { detail: 'reveal' }), ev('PayoffQuizStep', 'v_q1', { detail: 'unlock' }),
    ev('PayoffOrderViewed', 'v_q1'), ev('PayoffCheckoutTapped', 'v_q1'), ev('PayoffPaid', 'v_q1'),
    ev('PayoffLanded', 'v_q2'), ev('PayoffVariant', 'v_q2', { detail: 'quiz' }), ev('PayoffQuizStep', 'v_q2', { detail: 'q1' }),
  ];
  const funnel = buildWedgeFunnel(events, definition);
  assert.deepEqual(funnel.variants.map(v => [v.key, v.steps.map(s => s.people)]), [['letter', [2, 1, 0, 0]], ['quiz', [2, 1, 1, 1]]]);
  assert.equal(funnel.variants[1].steps.find(s => s.label === 'Paid').ofLanded, 0.5);
  const quiz = funnel.branches.find(b => b.key === 'quiz');
  assert.deepEqual(quiz.steps.map(s => s.people), [2, 2, 0, 0, 0, 0, 1, 0, 0, 1]);
  for (const name of ['PayoffVariant', 'PayoffQuizStep']) assert.equal(definition.visitorEvents.has(name), true);
  assert.equal(buildWedgeFunnel([ev('PayoffLanded', 'v_x')], definition).branches.some(b => b.key === 'quiz'), false, 'hidden until someone takes the quiz');
});
