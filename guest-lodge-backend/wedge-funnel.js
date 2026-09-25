'use strict';
// The wedge funnel: every step someone takes from the ad to paying, read from
// inspectEvent. Steps are counted in people, not taps: an anonymous visitor id
// before sign-in, the account after. Each step is counted on its own, so a
// share between two steps reads "of those who reached the step before".

const STEPS = Object.freeze([
  { key: 'landed', label: 'Landed from the ad', names: ['SimStarted', 'LandingViewed:!app'] },
  { key: 'demo', label: 'Started the demo', names: ['SimStarted'] },
  { key: 'picked', label: 'Picked a finding', names: ['SimFindingPicked'] },
  { key: 'note', label: 'Watched the note get written', names: ['SimNoteWritten'] },
  { key: 'photo', label: 'Took the photo', names: ['SimPhotoTaken'] },
  { key: 'report', label: 'Saw the report', names: ['SimReportShown'] },
  { key: 'offer', label: 'Saw the offer', names: ['SimOfferViewed'] },
  { key: 'tapped', label: 'Tapped start free', names: ['SimCheckoutTapped'] },
  { key: 'email', label: 'Gave their email', names: ['SimEmailGiven'] },
  { key: 'stripe', label: 'Opened Stripe', names: ['SimCheckoutStarted'] },
  { key: 'trial', label: 'Started a trial', names: ['TrialStarted', 'SimPurchased'] },
  { key: 'welcome', label: 'Saw the welcome page', names: ['SimSubscribed'] },
  { key: 'next', label: 'Got the app or started on the web', names: ['SimAppTapped', 'SimWebStarted'] },
  { key: 'signin', label: 'Signed in', names: ['AccountVerified'] },
  { key: 'sent', label: 'Sent a report', names: ['ReportFinalized'] },
  { key: 'paid', label: 'Paid', names: ['FirstPayment'] },
]);

// Paths off the main line, each worth watching on its own.
const BRANCHES = Object.freeze([
  { key: 'kept', label: 'Kept it free', steps: [['Opened keep it free', ['SimKeepFreeOpened']], ['Left their email', ['SimKeptFree', 'KeptFree']]] },
  { key: 'real', label: 'Desktop: started a real report', steps: [['Tapped start a real report', ['SimRealReportTapped']], ['Started setup', ['SetupStarted']], ['Finished setup', ['SetupCompleted']], ['Added a photo', ['FirstPhotoAdded']], ['Saw their report', ['ReportRevealed']], ['Saw the offer', ['ExportOfferViewed']]] },
  { key: 'shots', label: 'App screenshots', steps: [['Saw them under the offer', ['SimScreensViewed']], ['Swiped through', ['SimScreensSwiped']]] },
  { key: 'left', label: 'Left the demo', steps: [['Pressed back', ['SimBackTapped']], ['Declined the offer', ['OfferDeclined']]] },
  { key: 'churn', label: 'Cancellations', steps: [['Cancelled in the trial', ['CancellationScheduled:trial']], ['Cancelled after paying', ['CancellationScheduled:paid']], ['Subscription ended', ['SubscriptionEnded']]] },
]);

// Steps a visitor makes in the browser. A reset clears only these, and only
// rows without a sourceId: server records (a trial, a payment, a reminder
// already sent) guard against doing things twice and are never deleted.
const VISITOR_EVENTS = Object.freeze([
  'SimStarted', 'SimFindingPicked', 'SimPhotoTaken', 'SimNoteWritten', 'SimReportShown', 'SimOfferViewed',
  'SimEmailGiven', 'SimSubscribed', 'SimAppTapped', 'SimKeepFreeOpened', 'SimKeptFree', 'SimCheckoutTapped',
  'SimRealReportTapped', 'SimBackTapped', 'SimWebStarted', 'SimScreensViewed', 'SimScreensSwiped',
  'LandingViewed', 'SetupStarted', 'SetupCompleted', 'FirstPhotoAdded', 'ReportRevealed', 'ExportOfferViewed', 'OfferDeclined',
  'VoiceNoteRecorded',
]);

const LABELS = Object.freeze(Object.fromEntries([
  ...STEPS.flatMap(step => step.names.map(name => [name, step.label])),
  ...BRANCHES.flatMap(branch => branch.steps.flatMap(([label, names]) => names.map(name => [name.split(':')[0], label]))),
  ['SimStarted', 'Started the demo'], ['LandingViewed', 'Landed on the page'], ['SimPurchased', 'Bought without a trial'],
  ['PaymentSucceeded', 'Payment'], ['TrialConverted', 'Trial ended by a report'], ['ReportExported', 'Downloaded a PDF'],
  ['ReportShared', 'Made a private link'], ['LeadCaptured', 'Email captured'], ['CheckoutStarted', 'Opened Stripe from the app'],
  ['TrialReminderSent', 'Trial reminder sent'], ['VoiceNoteDrafted', 'Voice note drafted'], ['VoiceNoteRecorded', 'Recorded a voice note'],
]));

const personOf = event => event.visitorId || (event.accountId ? `account:${event.accountId}` : `event:${event.id}`);
// "CancellationScheduled:trial" matches that event with that detail;
// "LandingViewed:!app" matches it with any other detail.
const matches = (event, names) => names.some(name => {
  const [eventName, detail] = name.split(':');
  if (event.name !== eventName) return false;
  if (!detail) return true;
  return detail.startsWith('!') ? event.detail !== detail.slice(1) : event.detail === detail;
});
const people = (events, names) => new Set(events.filter(event => matches(event, names)).map(personOf)).size;

function buildWedgeFunnel(events) {
  const landed = people(events, STEPS[0].names);
  let previous = null;
  const steps = STEPS.map(step => {
    const count = people(events, step.names);
    const row = { key: step.key, label: step.label, people: count,
      ofPrevious: previous === null ? null : previous ? count / previous : null,
      ofLanded: landed ? count / landed : null };
    previous = count;
    return row;
  });
  const branches = BRANCHES.map(branch => ({ key: branch.key, label: branch.label,
    steps: branch.steps.map(([label, names]) => ({ label, people: people(events, names) })) }));
  const starts = events.filter(event => event.name === 'SimStarted');
  const split = { phone: new Set(starts.filter(e => e.detail === 'phone').map(personOf)).size,
    desktop: new Set(starts.filter(e => e.detail === 'desktop').map(personOf)).size,
    unknown: new Set(starts.filter(e => e.detail !== 'phone' && e.detail !== 'desktop').map(personOf)).size };
  const recent = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 150).map(event => ({
    name: event.name, label: LABELS[event.name] || event.name, detail: event.detail || null,
    who: personOf(event).replace(/^(v_|account:|event:)/, '').slice(-6), at: new Date(event.createdAt).toISOString() }));
  return { steps, branches, split, recent, events: events.length };
}

// Owner and App Review accounts, including plus-aliases of the owner emails
// (owner+claims1@gmail.com), never count as customers.
async function excludedAccountIds(prisma, emails) {
  const clauses = emails.filter(Boolean).flatMap(email => {
    const [user, domain] = String(email).toLowerCase().split('@');
    return domain ? [{ email: `${user}@${domain}` }, { AND: [{ email: { startsWith: `${user}+` } }, { email: { endsWith: `@${domain}` } }] }] : [];
  });
  if (!clauses.length) return [];
  const rows = await prisma.inspectAccount.findMany({ where: { OR: clauses }, select: { id: true } });
  return rows.map(row => row.id);
}

// A reset leaves a marker row, never deleted, and the dashboard counts from the
// latest one: server records from before it (trials, payments, test runs)
// stay in the database and out of the numbers.
const RESET_EVENT = 'FunnelReset';
async function countingSince(prisma, tool) {
  const marker = await prisma.inspectEvent.findFirst({ where: { tool, name: RESET_EVENT }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  return marker ? new Date(marker.createdAt) : null;
}

module.exports = { STEPS, BRANCHES, VISITOR_EVENTS, LABELS, RESET_EVENT, buildWedgeFunnel, excludedAccountIds, countingSince };
