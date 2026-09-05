const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const server = read('guest-lodge-backend', 'server.js');
const reveal = read('guest-lodge-backend', 'frontdesk', 'src', 'reveal.js');
const core = read('guest-lodge-backend', 'frontdesk', 'src', 'core.js');
const settings = read('guest-lodge-backend', 'frontdesk', 'src', 'settings.js');
const report = read('guest-lodge-backend', 'marketel-report.js');
const appDelegate = read('marketel-frontdesk-ios', 'ios', 'App', 'App', 'AppDelegate.swift');
const hotelSheet = read('marketel-guestel-ios', 'Guestel', 'HotelSheet.swift');
const rebook = read('marketel-guestel-ios', 'Guestel', 'RebookView.swift');
const clip = read('marketel-guestel-ios', 'GuestelClip', 'ClipRootView.swift');

test('both Marketel checkout paths create one card-required 14-day trial', () => {
  assert.match(server, /const MARKETEL_TRIAL_DAYS = 14/);
  assert.ok((server.match(/trial_period_days: trialDays/g) || []).length >= 2);
  assert.ok((server.match(/missing_payment_method: 'cancel'/g) || []).length >= 2);
  const checkoutCode = server.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(checkoutCode, /payment_method_collection:\s*'if_required'/);
  assert.match(server, /async function hotelTrialEligible/);
  assert.match(server, /where: \{ hotelId, eventName: \{ in: \['TrialStarted', 'PaymentSucceeded'\] \} \}/);
  assert.match(server, /marketel-trial-start\.\$\{hotelId\}/);
  assert.match(server, /FUNNEL_PURGE_PROTECTED = new Set\([\s\S]*?'TrialStarted'[\s\S]*?'PaymentSucceeded'/);
});

test('a free trial is access but never cash or a Meta purchase', () => {
  assert.match(server, /MARKETEL_ACTIVE_SUBSCRIPTION_STATUSES[\s\S]*?'trialing'/);
  assert.match(server, /function marketelCheckoutCanActivate/);
  assert.match(server, /\['paid', 'no_payment_required'\]\.includes\(paymentStatus\)/);
  assert.match(server, /: paymentStatus === 'paid'/);
  assert.match(server, /value: 0,[\s\S]*?queueMarketelCAPI\('StartTrial'/);
  assert.match(server, /if \(invoice\) \{[\s\S]*?amount_paid[\s\S]*?amountUsd <= 0\) return/);
  assert.match(server, /event\.type === 'invoice\.paid' && amountPaid > 0/);
  assert.match(server, /convertedFromTrial: !!converted/);
  assert.match(server, /marketel-subscribe\.\$\{sourceId\}/);
  assert.match(server, /invoice\?\.id \|\| stripeObjectId\(checkoutSession\?\.invoice\) \|\| checkoutSession\?\.id/);
  assert.match(server, /paidSourceId = stripeObjectId\(checkoutSession\.invoice\) \|\| checkoutSession\.id/);
  assert.match(server, /converted: !!trialStarted && !priorPayment/);
  assert.match(server, /reportSubscribe: !priorPayment/);
  assert.match(server, /if \(reportSubscribe\) \{[\s\S]*?queueMarketelCAPI\('Subscribe'/);
  assert.doesNotMatch(server, /recordMarketelPaymentSuccess\([\s\S]{0,250}value:\s*199/);
});

test('trial lifecycle and milestones are exact, observable business events', () => {
  for (const event of [
    'TrialStarted',
    'TrialWillEnd',
    'TrialConverted',
    'TrialCancellationScheduled',
    'TrialCancellationReversed',
    'TrialCanceled',
    'TrialNativeAppActivated',
    'TrialLinkPlacementConfirmed',
    'TrialFirstBookingReceived',
  ]) {
    assert.match(server, new RegExp(`'${event}'`));
  }
  assert.match(server, /async function createFunnelEventOnce/);
  assert.match(server, /pg_advisory_xact_lock/);
  assert.match(server, /app\.get\('\/api\/crm\/trial-status'/);
  assert.match(server, /app\.post\('\/api\/crm\/trial-milestone'/);
  assert.match(server, /This property does not have an active trial/);
  assert.match(server, /createdAt: trialBookingWindow/);
  assert.match(core, /Your \$\{crm\.marketelTrialDays \|\| 14\}-day trial is live/);
  assert.match(core, /if \(!crm\.token \|\| !crm\.activeHotelId\)/);
  assert.doesNotMatch(core, /if \(crm\.marketelSubscriptionStatus !== 'trialing' \|\| !crm\.token/);
  assert.match(core, /trialDaysLeft: trialing/);
  assert.ok(appDelegate.includes('TRIAL · \\(days)D'));
  assert.match(appDelegate, /updateTrialStatus\(/);
  assert.match(core, /confirmTrialLinkPlaced/);
  assert.match(core, /Manage trial &amp; billing/);
  assert.match(core, /async function openMarketelBillingPortal/);
  assert.match(core, /action === 'browserClosed'/);
  assert.doesNotMatch(server, /req\.crmIsNativeClient[\s\S]{0,180}Manage your Marketel subscription on the web/);
  assert.match(server, /return_url: 'https:\/\/bookmarketel\.com\/frontdesk\?billingReturn=1'/);
  assert.match(settings, /if \(hotelRes\?\.subscribed\) \{/);
  assert.match(settings, /window\.openMarketelBillingPortal/);
  assert.match(appDelegate, /SFSafariViewControllerDelegate/);
  assert.match(appDelegate, /sendWebAction\("browserClosed"\)/);
  assert.match(report, /trialsStarted/);
  assert.match(report, /trialAppsOpened/);
  assert.match(report, /currently trialing/);
});

test('trial terms are explicit before Stripe and existing trial users do not get another trial', () => {
  assert.match(reveal, /\$0 today · first \$\{displayedPrice\} charge \$\{renewalDate\}/);
  assert.match(reveal, /Card required\. Cancel before \$\{renewalDate\}/);
  assert.match(reveal, /Then \$1,990 for one year/);
  assert.match(reveal, /crm\.marketelTrialEligible !== false/);
  assert.match(server, /trialEligible/);
  assert.match(server, /Duplicate Marketel trial rejected/);
  assert.match(server, /subscriptions\.cancel\(subscriptionId\)/);
});

test('expired properties stop new Guestel bookings without erasing stays or messages', () => {
  assert.match(hotelSheet, /private var acceptsBookings: Bool \{ hotelData\?\.subscribed != false \}/);
  assert.match(hotelSheet, /Your saved stays and messages remain here/);
  assert.match(rebook, /data\?\.subscribed == false/);
  assert.match(rebook, /Your saved stay and messages remain in Guestel/);
  assert.match(clip, /hotel\.subscribed == false/);
  assert.match(clip, /not accepting new direct booking requests/);
  assert.match(server, /hotelHasOpenGuestObligations/);
  assert.match(server, /Existing reservations, guest messages and stay records[\s\S]*?untouched/);
});
