'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdsReport, verdictOf, cleanNote, RULE_DEFAULTS } = require('../funnel-ads');

const rules = { ...RULE_DEFAULTS };
const CAR = '120251580459180103', TABLE = '120251580460930103', OLD = '120251524067610103';

function fakePrisma(events = []) {
  const notes = [];
  let seq = 0;
  const matches = (row, where) => Object.entries(where).every(([key, want]) => {
    if (want && typeof want === 'object' && 'in' in want) return want.in.includes(row[key]);
    if (want && typeof want === 'object' && 'gte' in want) return row[key] >= want.gte;
    return row[key] === want;
  });
  return {
    notes,
    inspectEvent: { findMany: async ({ where }) => events.filter(row => matches(row, where)) },
    funnelNote: {
      findMany: async ({ where }) => notes.filter(row => matches(row, where)).sort((a, b) => b.createdAt - a.createdAt),
      create: async ({ data }) => { const row = { id: `n${++seq}`, createdAt: new Date(Date.UTC(2026, 9, 28, 12, seq)), updatedAt: new Date(), key: null, ...data }; notes.push(row); return row; },
      upsert: async ({ where: { tool_kind_key: key }, create, update }) => {
        const row = notes.find(n => n.tool === key.tool && n.kind === key.kind && n.key === key.key);
        if (row) { Object.assign(row, update); return row; }
        const made = { id: `n${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...create }; notes.push(made); return made;
      },
      updateMany: async ({ where, data }) => { const rows = notes.filter(n => matches(n, where)); rows.forEach(n => Object.assign(n, data)); return { count: rows.length }; },
      deleteMany: async ({ where }) => { const before = notes.length; notes.splice(0, notes.length, ...notes.filter(n => !matches(n, where))); return { count: before - notes.length }; },
    },
  };
}

const metaAd = (id, name, status, event, extra = {}) => ({
  id, name, created_time: '2026-10-28T15:00:00+0000', effective_status: status, campaign: { id: 'c1', name: 'PROJECT PAYOFF | TESTING' },
  adset: { id: 's1', name: 'set', promoted_object: { pixel_id: '1', custom_event_type: event } },
  creative: { thumbnail_url: `https://scontent.example/${id}-thumb.jpg`, image_url: `https://scontent.example/${id}.jpg`,
    object_story_spec: { link_data: { link: 'https://bookmarketel.com/payoff/hidden-payoff', name: `${name} headline`, description: 'desc', message: 'First line hook.\n\nSecond paragraph of the body.' } } },
  ...extra,
});

function fakeMeta(ads, stats, todayStats = []) {
  const calls = [];
  const meta = async (path, params) => {
    calls.push(path);
    if (path === 'me/adaccounts') return { data: [{ account_id: '42' }] };
    if (path === 'act_42/ads') return { data: ads };
    if (path === 'act_42/insights') return { data: (params.date_preset === 'today' ? todayStats : stats).filter(row => params.filtering[0].value.includes(row.ad_id)) };
    throw new Error(`unexpected ${path}`);
  };
  return { meta, calls };
}

test('the rules judge each ad: testing toward $60, off at $60 with no sale, one sale is a lead, two cheap sales is a winner', () => {
  assert.deepEqual(verdictOf({ status: 'running', event: 'PURCHASE', spend: 15, sales: 0 }, rules), { key: 'testing', label: '$15.00 of $60.00, no sale yet', progress: 0.25 });
  assert.deepEqual(verdictOf({ status: 'running', event: 'PURCHASE', spend: 61, sales: 0 }, rules), { key: 'kill', label: 'Turn it off: $61.00 with no sale' });
  assert.equal(verdictOf({ status: 'running', event: 'PURCHASE', spend: 20, sales: 1 }, rules).label, '1 sale at $20.00 each. 1 more to call it.');
  assert.equal(verdictOf({ status: 'running', event: 'PURCHASE', spend: 45, sales: 1 }, rules).label, '1 sale at $45.00 each (above $28.11). 1 more to call it.');
  assert.deepEqual(verdictOf({ status: 'running', event: 'PURCHASE', spend: 50, sales: 2 }, rules), { key: 'winner', label: 'Winner: 2 sales at $25.00 each. Don\'t touch it.' });
  assert.equal(verdictOf({ status: 'running', event: 'PURCHASE', spend: 70, sales: 2 }, rules).key, 'selling', 'two sales above the price is not a winner');
  assert.equal(verdictOf({ status: 'off', event: 'PURCHASE', spend: 38.16, sales: 0 }, rules).label, 'Off after $38.16, no sale');
  assert.equal(verdictOf({ status: 'running', event: 'ADD_TO_CART', spend: 99, sales: 0 }, rules).key, 'old', 'add-to-cart ads are not judged');
  assert.equal(verdictOf({ status: 'running', event: 'PURCHASE', spend: 40, sales: 0 }, { ...rules, killAt: 30 }).key, 'kill', 'the saved rules decide');
});

test('the Ads report lists Payoff ads with picture, copy, Meta numbers, our steps by ad and the notes; Meta trouble still shows the log', async () => {
  const at = minute => new Date(Date.UTC(2026, 9, 28, 13, minute));
  const prisma = fakePrisma([
    { id: 'e1', tool: 'payoff', name: 'PayoffAd', detail: CAR, visitorId: 'v_a', createdAt: at(1) },
    { id: 'e2', tool: 'payoff', name: 'PayoffStory', detail: 'viewed', visitorId: 'v_a', createdAt: at(2) },
    { id: 'e3', tool: 'payoff', name: 'PayoffVariant', detail: 'letter', visitorId: 'v_a', createdAt: at(3) },
    { id: 'e4', tool: 'payoff', name: 'PayoffOrderViewed', detail: null, visitorId: 'v_a', createdAt: at(4) },
    { id: 'e5', tool: 'payoff', name: 'PayoffPaid', detail: 'x', visitorId: 'v_a', createdAt: at(5) },
    { id: 'e6', tool: 'payoff', name: 'PayoffAd', detail: CAR, visitorId: 'v_b', createdAt: at(6) },
    { id: 'e7', tool: 'payoff', name: 'PayoffStory', detail: 'viewed', visitorId: 'v_b', createdAt: at(7) },
    // Yesterday afternoon (Central): counts all time, not today.
    { id: 'e8', tool: 'payoff', name: 'PayoffAd', detail: CAR, visitorId: 'v_old', createdAt: new Date(Date.UTC(2026, 9, 27, 20)) },
  ]);
  const ads = [metaAd(CAR, 'PROJECT PAYOFF | PURCHASE | CAR', 'ACTIVE', 'PURCHASE'), metaAd(TABLE, 'PROJECT PAYOFF | PURCHASE | TABLE', 'PENDING_REVIEW', 'PURCHASE'),
    metaAd(OLD, 'PROJECT PAYOFF | ATC | OLD AD', 'CAMPAIGN_PAUSED', 'ADD_TO_CART'),
    metaAd('999', 'CLAIMS AD', 'ACTIVE', 'PURCHASE', { creative: { object_story_spec: { link_data: { link: 'https://bookmarketel.com/claims' } } } }),
    metaAd('998', 'OLD PAYOFF', 'PAUSED', 'PURCHASE', { created_time: '2026-08-01T00:00:00+0000' }),
    // A video ad keeps its link and words in video_data.
    metaAd('997', 'PROJECT PAYOFF | PURCHASE | VIDEO', 'ACTIVE', 'PURCHASE', { created_time: '2026-10-20T00:00:00+0000', creative: { thumbnail_url: 'https://scontent.example/997-thumb.jpg',
      object_story_spec: { video_data: { title: 'See Your Debt-Free Date in 2 Minutes', message: 'Spreadsheets aren\'t for everyone.', call_to_action: { type: 'LEARN_MORE', value: { link: 'https://bookmarketel.com/payoff' } } } } } })];
  const stats = [{ ad_id: CAR, spend: '12.50', impressions: '300', cpm: '41.6', inline_link_clicks: '25', inline_link_click_ctr: '8.3',
    actions: [{ action_type: 'landing_page_view', value: '20' }, { action_type: 'offsite_conversion.fb_pixel_purchase', value: '0' }] }];
  const todayStats = [{ ad_id: CAR, spend: '4.10', impressions: '90', cpm: '45.5', inline_link_clicks: '6', inline_link_click_ctr: '6.7', actions: [{ action_type: 'landing_page_view', value: '5' }] }];
  const { meta, calls } = fakeMeta(ads, stats, todayStats);
  const reporter = createAdsReport({ prisma, meta, now: () => Date.UTC(2026, 9, 28, 16) });
  await reporter.save({ tool: 'payoff', kind: 'ad', key: CAR, data: { image: 'Car at night', copy: 'Customer voice, long-form', extra: 'dropped' } });
  const logged = await reporter.save({ tool: 'payoff', kind: 'log', data: { title: 'Round 1: CAR vs TABLE vs kitchen', status: 'running', ads: [CAR, 'nope'],
    outcomes: [{ if: 'CAR sells', means: 'customer voice works', next: 'hospital image, same copy' }, { if: '', means: '', next: '' }] } });
  const report = await reporter.report('payoff');
  assert.equal(report.supported, true);
  assert.deepEqual(report.ads.map(ad => ad.short), ['CAR', 'TABLE', 'VIDEO', 'OLD AD'], 'Payoff ads from the last 30 days, live ones first, video ads too');
  const video = report.ads.find(ad => ad.short === 'VIDEO');
  assert.equal(video.headline, 'See Your Debt-Free Date in 2 Minutes'); assert.equal(video.body, 'Spreadsheets aren\'t for everyone.'); assert.equal(video.image, 'https://scontent.example/997-thumb.jpg');
  const car = report.ads[0];
  assert.equal(car.image, `https://scontent.example/${CAR}.jpg`);
  assert.equal(car.headline, 'PROJECT PAYOFF | PURCHASE | CAR headline');
  assert.equal(car.words, 8);
  assert.deepEqual(car.meta, { spend: 12.5, impressions: 300, cpm: 41.6, clicks: 25, ctr: 8.3, landingViews: 20, purchases: 0 });
  assert.deepEqual(car.steps.map(s => s.people), [3, 2, 1, 1, 0, 0, 1]);
  // Today (the ad account's day, US/Central): Meta's numbers for today and our visitors tagged since its midnight.
  assert.deepEqual(car.today, { spend: 4.1, impressions: 90, cpm: 45.5, clicks: 6, ctr: 6.7, landingViews: 5, purchases: 0 });
  assert.deepEqual(car.stepsToday.map(s => s.people), [2, 2, 1, 1, 0, 0, 1], 'both visitors came on Oct 28, which is today at 11 AM Central');
  assert.equal(car.salesToday, 1);
  assert.equal(report.ads.find(ad => ad.short === 'TABLE').today.spend, 0, 'no row today is zero, not missing');
  assert.equal(car.sales, 1, 'our paid count counts even when Meta missed it');
  assert.equal(car.verdict.key, 'selling');
  assert.deepEqual(car.note, { image: 'Car at night', copy: 'Customer voice, long-form', testing: '', verdict: '' });
  assert.equal(report.ads[1].statusLabel, 'In review');
  assert.equal(report.ads.find(ad => ad.short === 'OLD AD').verdict.key, 'old');
  assert.equal(report.log.length, 1);
  assert.deepEqual(report.log[0].ads, [CAR]);
  assert.deepEqual(report.log[0].outcomes, [{ if: 'CAR sells', means: 'customer voice works', next: 'hospital image, same copy' }]);
  assert.equal(report.rules.killAt, 60);
  // Meta is asked once per five minutes.
  await reporter.report('payoff');
  assert.equal(calls.filter(path => path.endsWith('/ads')).length, 1);
  // Edits, the rules and a delete.
  await reporter.save({ tool: 'payoff', kind: 'log', id: logged.id, data: { title: 'Round 1', status: 'done', result: 'CAR sold twice' } });
  await reporter.save({ tool: 'payoff', kind: 'rules', data: { killAt: 50, breakEven: 'x', winnerSales: 3, text: ['Purchase only', ''] } });
  const after = await reporter.report('payoff');
  assert.equal(after.log[0].status, 'done');
  assert.deepEqual([after.rules.killAt, after.rules.breakEven, after.rules.winnerSales, after.rules.text], [50, 28.11, 3, ['Purchase only']]);
  await reporter.save({ tool: 'payoff', kind: 'log', id: logged.id, delete: true });
  assert.equal((await reporter.report('payoff')).log.length, 0);
  // Bad input is refused; other products have no ads section.
  await assert.rejects(reporter.save({ tool: 'payoff', kind: 'ad', key: 'abc', data: {} }), error => error.status === 400);
  await assert.rejects(reporter.save({ tool: 'payoff', kind: 'log', data: { title: '' } }), error => error.status === 400);
  await assert.rejects(reporter.save({ tool: 'claims', kind: 'log', data: { title: 'x' } }), error => error.status === 400);
  await assert.rejects(reporter.save({ tool: 'payoff', kind: 'log', id: 'gone', data: { title: 'x' } }), error => error.status === 404);
  assert.deepEqual(await reporter.report('claims'), { tool: 'claims', supported: false });
  // Without Meta the rules and log still load.
  const broken = createAdsReport({ prisma, meta: async () => { throw new Error('No Meta token on the server'); } });
  const offline = await broken.report('payoff');
  assert.equal(offline.metaError, 'No Meta token on the server');
  assert.deepEqual(offline.ads, []);
});

test('notes are trimmed to their fields and sizes', () => {
  assert.equal(cleanNote('ad', { image: 'x'.repeat(900) }).image.length, 600);
  const entry = cleanNote('log', { title: ' T ', status: 'weird', outcomes: Array.from({ length: 20 }, (_, i) => ({ if: `r${i}` })) });
  assert.equal(entry.title, 'T');
  assert.equal(entry.status, 'running');
  assert.equal(cleanNote('log', { title: 'Routine', status: 'guide' }).status, 'guide', 'the standing routine');
  assert.equal(entry.outcomes.length, 10);
});

test('the booking engine gets its own ads (linked to bookmarketel.com), its own $100 / $97 rules, and its own steps', async () => {
  const ENGINE_AD = '120251620741660103';
  const engineAd = metaAd(ENGINE_AD, 'PROJECT ENGINE | PURCHASE | TEST 1 | $97 STATIC (UENI COPY)', 'ACTIVE', 'PURCHASE');
  engineAd.creative.object_story_spec.link_data.link = 'https://bookmarketel.com/engine';
  const { meta } = fakeMeta([engineAd, metaAd(CAR, 'PROJECT PAYOFF | CAR', 'PAUSED', 'PURCHASE')],
    [{ ad_id: ENGINE_AD, spend: '42.10', impressions: '3000', cpm: '14.03', inline_link_clicks: '30', inline_link_click_ctr: '1', actions: [{ action_type: 'landing_page_view', value: '22' }] }]);
  const at = new Date();
  const prisma = fakePrisma([
    { id: 1, tool: 'engine', name: 'EngineAd', detail: ENGINE_AD, visitorId: 'v_a', createdAt: at },
    { id: 2, tool: 'engine', name: 'EngineStep', detail: 'viewed', visitorId: 'v_a', createdAt: at },
    { id: 3, tool: 'engine', name: 'EngineStep', detail: 'email', visitorId: 'v_a', createdAt: at },
    { id: 4, tool: 'engine', name: 'EnginePaid', detail: 'monthly', visitorId: 'v_a', createdAt: at },
  ]);
  const report = createAdsReport({ prisma, meta, accountId: '42' });
  const engine = await report.report('engine');
  assert.equal(engine.supported, true);
  assert.deepEqual(engine.ads.map(ad => ad.id), [ENGINE_AD]);
  assert.equal(engine.rules.killAt, 100);
  assert.equal(engine.rules.breakEven, 97);
  assert.deepEqual(engine.ads[0].steps.map(step => step.people), [1, 1, 1, 0, 0, 1]);
  assert.equal(engine.ads[0].sales, 1);
  assert.equal(engine.ads[0].verdict.label, '1 sale at $42.10 each. 1 more to call it.');
  const payoff = await report.report('payoff');
  assert.deepEqual(payoff.ads.map(ad => ad.id), [CAR]);
  assert.equal(payoff.rules.killAt, 60);
  // Saving the engine's rules keeps its own defaults for anything left blank.
  await report.save({ tool: 'engine', kind: 'rules', data: { killAt: 150 } });
  assert.deepEqual([...[(await report.report('engine')).rules].map(r => [r.killAt, r.breakEven])], [[150, 97]]);
});
