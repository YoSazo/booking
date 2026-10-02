'use strict';
// The wedge funnel: every step someone takes from the ad to paying, read from
// inspectEvent. Steps are counted in people, not taps: an anonymous visitor id
// before sign-in, the account after. Each step is counted on its own, so a
// share between two steps reads "of those who reached the step before".

const STEPS = Object.freeze([
  { key: 'landed', label: 'Landed from the ad', names: ['OfferLanded', 'SimStarted', 'LandingViewed:!app'] },
  // `aside` rows are parallel to the main line, not in it: a visitor can answer
  // in five seconds without ever staying twenty, and an older version of the
  // page never recorded them. They are measured against everyone who landed.
  { key: 'sawvideo', label: 'Saw the video', names: ['OfferSawVideo'], aside: true },
  // The video landing: everyone sees the price, so the step between arriving
  // and deciding is staying: twenty seconds, or tapping the button sooner.
  // It is Meta's ViewContent, and it always includes everyone who tapped.
  // What Meta hears as ViewContent: the first deliberate act (scrolled most of the
  // way, a quarter of the recording, the see-a-report pill, or the pay button).
  { key: 'engaged', label: 'Did something on purpose (what Meta hears)', names: ['OfferEngaged'] },
  { key: 'stayed', label: 'Stayed 20 seconds (not sent to Meta)', names: ['OfferStayed20'], aside: true },
  // The first question on the pay-once landing: the recording, then "I want
  // this" or "I don't want this"; either shows the offer. A decline asks why.
  { key: 'picked', label: 'Answered the first question', hideWhenEmpty: true, names: ['OfferWantTapped', 'OfferDeclineTapped', 'OfferUnsureTapped'], aside: true,
    children: [
      { key: 'want', label: 'Said "I want this"', names: ['OfferWantTapped'], depth: 1 },
      { key: 'decline', label: 'Said "I don\'t want this"', names: ['OfferDeclineTapped'], depth: 1 },
      { key: 'why-price', label: 'The price is too expensive', names: ['OfferReasonPrice'], depth: 2, of: 'decline' },
      { key: 'why-property', label: 'Does not rent out property', names: ['OfferReasonNoProperty'], depth: 2, of: 'decline' },
      { key: 'why-need', label: 'Does not need it', names: ['OfferReasonNoNeed'], depth: 2, of: 'decline' },
      { key: 'why-doubt', label: 'Not sure it works', names: ['OfferReasonDoubt'], depth: 2, of: 'decline' },
      { key: 'why-skip', label: 'Skipped the reason', names: ['OfferReasonSkipped'], depth: 2, of: 'decline' },
    ] },
  { key: 'sawoffer', label: 'Saw the offer card', names: ['OfferSawOffer'], aside: true },
  // How far down the page, by scrolling: each is everyone who got that far, of everyone who landed.
  { key: 'scroll25', label: 'Scrolled a quarter of the way', names: ['OfferScroll25'], aside: true },
  { key: 'scroll50', label: 'Scrolled halfway', names: ['OfferScroll50'], aside: true },
  { key: 'scroll75', label: 'Scrolled three quarters', names: ['OfferScroll75'], aside: true },
  { key: 'scroll100', label: 'Scrolled to the bottom', names: ['OfferScroll100'], aside: true },
  // The button is "pay once" where the wedge sells that, "start free" otherwise.
  { key: 'tapped', label: 'Tapped the button', names: ['SimCheckoutTapped'] },
  { key: 'stripe', label: 'Opened Stripe', names: ['SimCheckoutStarted'] },
  { key: 'trial', label: 'Paid once or started a trial', names: ['TrialStarted', 'SimPurchased', 'LifetimePurchased'] },
  { key: 'welcome', label: 'Saw the welcome page', names: ['SimSubscribed'] },
  { key: 'next', label: 'Got the app or started on the web', names: ['SimAppTapped', 'SimWebStarted'] },
  { key: 'signin', label: 'Signed in', names: ['AccountVerified'] },
  { key: 'sent', label: 'Sent a report', names: ['ReportFinalized'] },
  // Paying once is paid on the spot; a trial is paid at its first invoice.
  { key: 'paid', label: 'Paid', names: ['FirstPayment', 'LifetimePurchased'] },
]);

// Paths off the main line, each worth watching on its own.
const BRANCHES = Object.freeze([
  // How far down the landing page they went. Each is people who got that far at
  // any point; a page that fits the screen records no scroll at all.
  { key: 'scroll', label: 'How far down the page', steps: [['Saw the video on screen', ['OfferSawVideo']], ['Saw the offer card on screen', ['OfferSawOffer']], ['Scrolled to 25%', ['OfferScroll25']], ['Scrolled to 50%', ['OfferScroll50']], ['Scrolled to 75%', ['OfferScroll75']], ['Scrolled to the bottom', ['OfferScroll100']], ['Tapped "see a report built"', ['OfferCueTapped']]] },
  { key: 'checks', hideWhenEmpty: true, label: 'Could they answer? (checks)', steps: [['Buttons were reachable', ['OfferPickReady']], ['Buttons were blocked', ['OfferPickBlocked']], ['Touched the screen', ['OfferPickTouched']]] },
  { key: 'reasons', hideWhenEmpty: true, label: 'Why they did not want it', steps: [['The price is too expensive', ['OfferReasonPrice']], ['Does not rent out property', ['OfferReasonNoProperty']], ['Does not need it', ['OfferReasonNoNeed']], ['Not sure it works', ['OfferReasonDoubt']], ['Skipped', ['OfferReasonSkipped']]] },
  { key: 'pick', hideWhenEmpty: true, label: 'The first question', steps: [['Tapped "I want this"', ['OfferWantTapped']], ['Tapped "I don\'t want this"', ['OfferDeclineTapped']]] },
  { key: 'video', label: 'The video', steps: [['Watched a quarter', ['OfferVideoQuarter']], ['Watched half', ['OfferVideoHalf']], ['Watched to the end', ['OfferVideoEnded']]] },
  // The try-it simulation, now at ?sim=1: where the earlier weeks' visitors went.
  { key: 'demo', label: 'The try-it demo', steps: [['Started the demo', ['SimStarted']], ['Picked a finding', ['SimFindingPicked']], ['Watched the note get written', ['SimNoteWritten']], ['Took the photo', ['SimPhotoTaken']], ['Saw the report', ['SimReportShown']], ['Tapped "Get this"', ['SimGetThisTapped']], ['Saw the offer', ['SimOfferViewed']]] },
  // The try-it demo still asks for an email before Stripe; the video landing goes straight there.
  { key: 'email', label: 'Email before Stripe (demo only)', steps: [['Gave their email', ['SimEmailGiven']]] },
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
  'SimRealReportTapped', 'SimBackTapped', 'SimWebStarted', 'SimScreensViewed', 'SimScreensSwiped', 'SimGetThisTapped',
  'OfferLanded', 'OfferEngaged', 'OfferStayed20', 'OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded',
  'OfferScroll25', 'OfferScroll50', 'OfferScroll75', 'OfferScroll100', 'OfferSawVideo', 'OfferSawOffer', 'OfferCueTapped', 'OfferWantTapped', 'OfferUnsureTapped', 'OfferDeclineTapped',
  'OfferReasonPrice', 'OfferReasonNoProperty', 'OfferReasonNoNeed', 'OfferReasonDoubt', 'OfferReasonSkipped',
  'OfferPickReady', 'OfferPickBlocked', 'OfferPickTouched',
  'LandingViewed', 'SetupStarted', 'SetupCompleted', 'FirstPhotoAdded', 'ReportRevealed', 'ExportOfferViewed', 'OfferDeclined',
  'VoiceNoteRecorded',
]);

const LABELS = Object.freeze(Object.fromEntries([
  ...STEPS.flatMap(step => step.names.map(name => [name, step.label])),
  ...STEPS.flatMap(step => (step.children || []).flatMap(child => child.names.map(name => [name, child.label]))),
  ...BRANCHES.flatMap(branch => branch.steps.flatMap(([label, names]) => names.map(name => [name.split(':')[0], label]))),
  ['SimStarted', 'Started the demo'], ['LandingViewed', 'Landed on the page'], ['SimPurchased', 'Bought without a trial'],
  ['PaymentSucceeded', 'Payment'], ['TrialConverted', 'Trial ended by a report'], ['ReportExported', 'Downloaded a PDF'],
  ['ReportShared', 'Made a private link'], ['LeadCaptured', 'Email captured'], ['CheckoutStarted', 'Opened Stripe from the app'],
  ['TrialReminderSent', 'Trial reminder sent'], ['LifetimePurchased', 'Paid once'], ['LifetimeRefunded', 'Paid once again: refunded'], ['VoiceNoteDrafted', 'Voice note drafted'], ['VoiceNoteRecorded', 'Recorded a voice note'],
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
    if (step.hideWhenEmpty) row.hideWhenEmpty = true;
    if (step.aside) { row.aside = true; row.ofPrevious = row.ofLanded; }
    else previous = count;
    // The answers to a question under it: each is a share of the step it hangs
    // from (the question, or the "no" that asked why), never part of the chain.
    if (step.children) {
      const counts = {};
      row.children = step.children.map(child => {
        const n = people(events, child.names);
        counts[child.key] = n;
        const parent = child.of ? counts[child.of] : count;
        return { key: child.key, label: child.label, depth: child.depth || 1, people: n,
          ofParent: parent ? n / parent : null, ofLanded: landed ? n / landed : null };
      });
    }
    return row;
  });
  // Rows and cards about a feature a wedge does not use stay off the page until someone has used it.
  const shown = steps.filter(row => !(row.hideWhenEmpty && !row.people && !(row.children || []).some(child => child.people)));
  const branches = BRANCHES.map(branch => ({ key: branch.key, label: branch.label, hideWhenEmpty: !!branch.hideWhenEmpty,
    steps: branch.steps.map(([label, names]) => ({ label, people: people(events, names) })) }))
    .filter(branch => !(branch.hideWhenEmpty && branch.steps.every(step => !step.people)));
  const starts = events.filter(event => event.name === 'SimStarted' || event.name === 'OfferLanded');
  const split = { phone: new Set(starts.filter(e => e.detail === 'phone').map(personOf)).size,
    desktop: new Set(starts.filter(e => e.detail === 'desktop').map(personOf)).size,
    unknown: new Set(starts.filter(e => e.detail !== 'phone' && e.detail !== 'desktop').map(personOf)).size };
  const recent = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 150).map(event => ({
    name: event.name, label: LABELS[event.name] || event.name, detail: event.detail || null,
    who: personOf(event).replace(/^(v_|account:|event:)/, '').slice(-6), at: new Date(event.createdAt).toISOString() }));
  return { steps: shown, branches, split, recent, events: events.length };
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
