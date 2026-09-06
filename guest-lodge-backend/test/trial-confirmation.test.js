const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../frontdesk/src/core.js'), 'utf8');
const activationSource = fs.readFileSync(path.join(__dirname, '../frontdesk/src/activation.js'), 'utf8');
const assistantSource = fs.readFileSync(path.join(__dirname, '../frontdesk/src/assistant.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const statusFunction = source.slice(source.indexOf('async function loadMarketelTrialStatus()'), source.indexOf('\nasync function confirmTrialLinkPlaced()'));
const summaryModule = import('../frontdesk/src/trial-summary.js');
const trial = (overrides = {}) => ({
  hotelSubscribed: true, marketelSubscriptionStatus: 'trialing', marketelTrialDays: 14,
  trialStatus: { trialing: true, endsAt: '2026-09-20T16:00:00Z', renewalAmountUsd: 199, billingInterval: 'month', daysLeft: 0 },
  ...overrides,
});

test('renewal summary uses the selected annual charge and preserves zero remaining days', async () => {
  const {trialSummary} = await summaryModule;
  const state = trial();
  assert.equal(trialSummary(state).daysLeft, 0);
  assert.match(trialSummary(state).billing, /\$199\/month/);
  state.trialStatus.billingInterval = 'year'; state.trialStatus.renewalAmountUsd = 1990;
  assert.match(trialSummary(state).billing, /\$1,990\/year/);
});

test('missing billing values never become a guessed price or a fresh trial date', async () => {
  const {trialSummary} = await summaryModule;
  const summary = trialSummary(trial({trialStatus: null}));
  assert.equal(summary.price, ''); assert.equal(summary.endLabel, '');
  assert.equal(summary.daysLeft, null);
  assert.match(summary.billing, /loading/);
  assert.doesNotMatch(summary.billing, /\$199|Automatically renews/);
});

test('activation exposes the booking domain and keeps annual fallback terms annual', () => {
  assert.match(activationSource, /Review \$\{esc\(bookingDomain\)\}/);
  assert.match(serverSource, /normalizedBillingInterval === 'year'[\s\S]{0,120}MARKETEL_YEARLY_PRICE_USD/);
});

test('web trial handoff preserves navigation and keeps compact guidance closed by default', () => {
  assert.match(activationSource, /window\.finishActivatedReveal\?\.\(\);[\s\S]{0,100}window\.setFilter\?\.\('bookings'\)/);
  assert.doesNotMatch(activationSource, /guide\.open\s*=\s*true/);
  assert.match(source, /<details class="trial-overview-details">/);
  assert.doesNotMatch(source, /<details class="trial-overview-details" open/);
  assert.match(assistantSource, /marketel-frontdesk-icon\.png/);
  assert.match(assistantSource, /fda-card-app-icon/);
});

test('canceled, paid and expired access each have distinct billing language', async () => {
  const {trialSummary} = await summaryModule;
  const state = trial(); state.trialStatus.cancellationScheduled = true;
  assert.match(trialSummary(state).billing, /No subscription charge/);
  assert.doesNotMatch(trialSummary(state).billing, /Automatically renews/);
  assert.equal(trialSummary(trial({marketelSubscriptionStatus:'active',trialStatus:null})).trialing,false);
  const expired = trialSummary(trial({hotelSubscribed:false,marketelSubscriptionStatus:'',trialStatus:null,
    marketelLatestTrialState:{startedAt:'2026-08-01',canceledAt:'2026-08-15'}}));
  assert.equal(expired.ended,true); assert.match(expired.billing,/bookings are paused/);
});

function loader(crm, api, hasReveal = false) {
  const context = {crm,api,AbortController,setTimeout,clearTimeout,
    updateGoLiveBanner(){},syncNativeShellState(){},document:{getElementById:()=>hasReveal},
    loadRevealModule:async()=>({finishActivatedReveal:()=>context.revealClosed=true})};
  vm.createContext(context); vm.runInContext(statusFunction,context);
  return context;
}

test('delayed trial confirmation grants access and closes the pre-activation reveal',async()=>{
  const crm={token:'test',activeHotelId:'a',hotelSubscribed:false};
  const ctx=loader(crm,async()=>({success:true,trialing:true,subscribed:true,endsAt:'2026-09-20',trialDays:14}),true);
  await ctx.loadMarketelTrialStatus();
  assert.equal(crm.hotelSubscribed,true);assert.equal(crm.marketelSubscriptionStatus,'trialing');
  assert.equal(ctx.revealClosed,true);
});

test('trial status failure preserves verified access and a property switch discards stale results',async()=>{
  const crm={token:'test',activeHotelId:'a',hotelSubscribed:true};
  const failure=loader(crm,async()=>{throw new Error('offline');});
  await failure.loadMarketelTrialStatus(); assert.equal(crm.hotelSubscribed,true);
  const switched=loader(crm,async()=>{crm.activeHotelId='b';return {success:true,subscribed:false};});
  await switched.loadMarketelTrialStatus(); assert.equal(crm.hotelSubscribed,true);
});

test('unstarted previews are not labeled expired, and subscribed overview replays stay open',async()=>{
  const crm={token:'test',activeHotelId:'a',hotelSubscribed:false};
  const ctx=loader(crm,async()=>({success:true,trialing:false,subscribed:false,startedAt:null}));
  await ctx.loadMarketelTrialStatus(); assert.equal(!!crm.operationalAccessOnly,false);
  crm.hotelSubscribed=true;
  const replay=loader(crm,async()=>({success:true,trialing:false,subscribed:true}),true);
  await replay.loadMarketelTrialStatus(); assert.equal(replay.revealClosed,undefined);
});
