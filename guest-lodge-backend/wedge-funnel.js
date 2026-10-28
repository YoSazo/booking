'use strict';
// The wedge funnel: every step someone takes from the ad to paying, read from
// inspectEvent. Steps are counted in people, not taps: an anonymous visitor id
// before sign-in, the account after. Each step is counted on its own, so a
// share between two steps reads "of those who reached the step before".

const STEPS = Object.freeze([
  { key: 'landed', label: 'Landed on the page', names: ['OfferLanded', 'SimStarted', 'LandingViewed:!app'] },
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
  { key: 'payment-step', label: 'Opened the payment step', names: ['SimPaymentStepViewed'], hideWhenEmpty: true },
  { key: 'stripe', label: 'Stripe session created', names: ['SimCheckoutStarted'] },
  { key: 'checkout-ready', label: 'Payment form ready (what Meta hears)', names: ['SimCheckoutRendered'] },
  { key: 'trial', label: 'Paid once or started a trial', names: ['TrialStarted', 'SimPurchased', 'LifetimePurchased', 'PaidTrialStarted'] },
  { key: 'welcome', label: 'Saw the welcome page', names: ['SimSubscribed'] },
  { key: 'next', label: 'Got the app or started on the web', names: ['SimAppTapped', 'SimWebStarted'] },
  { key: 'signin', label: 'Signed in', names: ['AccountVerified'] },
  { key: 'sent', label: 'Sent a report', names: ['ReportFinalized'] },
  // Paying once is paid on the spot; a trial is paid at its first invoice.
  { key: 'paid', label: 'Paid in full', names: ['FirstPayment', 'LifetimePurchased', 'PaidTrialConverted'] },
]);

// Paths off the main line, each worth watching on its own.
const BRANCHES = Object.freeze([
  { key: 'cancel-help', hideWhenEmpty: true, label: 'Looked up how to cancel the trial', steps: [['Opened "How do I cancel?"', ['SimCancelHelpOpened']]] },
  { key: 'paid-trial', hideWhenEmpty: true, label: '$1 paid trial → $49 lifetime access', steps: [['Paid $1 to start', ['PaidTrialStarted']], ['Reminder sent', ['PaidTrialReminderSent']], ['Remaining $48 paid', ['PaidTrialConverted']], ['Cancelled before the balance', ['PaidTrialCancelled']], ['Balance payment failed', ['PaidTrialPaymentFailed']], ['Payment refunded or disputed', ['PaidTrialRefunded']]] },
  // How far down the landing page they went. Each is people who got that far at
  // any point; a page that fits the screen records no scroll at all.
  { key: 'scroll', label: 'How far down the page', steps: [['Saw the video on screen', ['OfferSawVideo']], ['Saw the offer card on screen', ['OfferSawOffer']], ['Scrolled to 25%', ['OfferScroll25']], ['Scrolled to 50%', ['OfferScroll50']], ['Scrolled to 75%', ['OfferScroll75']], ['Scrolled to the bottom', ['OfferScroll100']], ['Tapped "see a report built"', ['OfferCueTapped']]] },
  // Where each landing came from. "ad" is a visit that carried Meta's click id; "direct" has no
  // referrer (typed, a QR code, a bookmark, or the owner's own browser).
  { key: 'why', label: 'Quiz: what’s been in the way', hideWhenEmpty: true, steps: [
    ['The interest eats most of what I pay', ['PayoffQuizStep:why-interest']],
    ['I don’t know which card to pay first', ['PayoffQuizStep:why-order']],
    ['I’ve tried spreadsheets and gave up', ['PayoffQuizStep:why-tracking']],
    ['Something always comes up', ['PayoffQuizStep:why-life']],
  ] },
  { key: 'from', label: 'Where they came from', steps: [['Clicked the ad (Meta click id)', ['OfferFrom:ad']], ['From Facebook or Instagram, no click id', ['OfferFrom:social']], ['No referrer: typed, QR, or you', ['OfferFrom:direct']], ['From another site', ['OfferFrom:other']]] },
  { key: 'browser', label: 'Which browser', steps: [['Instagram app', ['OfferBrowser:instagram']], ['Facebook app', ['OfferBrowser:facebook']], ['Safari', ['OfferBrowser:safari']], ['Chrome', ['OfferBrowser:chrome']], ['Other', ['OfferBrowser:other']]] },
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
  'SimEmailGiven', 'SimSubscribed', 'SimAppTapped', 'SimKeepFreeOpened', 'SimKeptFree', 'SimCheckoutTapped', 'SimPaymentStepViewed', 'SimCancelHelpOpened', 'SimCheckoutRendered',
  'SimRealReportTapped', 'SimBackTapped', 'SimWebStarted', 'SimScreensViewed', 'SimScreensSwiped', 'SimGetThisTapped',
  'OfferLanded', 'OfferEngaged', 'OfferStayed20', 'OfferVideoQuarter', 'OfferVideoHalf', 'OfferVideoEnded',
  'OfferScroll25', 'OfferScroll50', 'OfferScroll75', 'OfferScroll100', 'OfferSawVideo', 'OfferSawOffer', 'OfferCueTapped', 'OfferWantTapped', 'OfferUnsureTapped', 'OfferDeclineTapped',
  'OfferReasonPrice', 'OfferReasonNoProperty', 'OfferReasonNoNeed', 'OfferReasonDoubt', 'OfferReasonSkipped',
  'OfferPickReady', 'OfferPickBlocked', 'OfferPickTouched', 'OfferFrom', 'OfferBrowser',
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

// Marketel Trace is its own page (trace.js), not a report wedge, so it has its
// own ladder: landing, picking something, tracing, the price, paying.
// "About you": each answer is TraceAnswered with "<question>-<answer>".
const TRACE_WHY = [["I want to draw, but I can't", 'TraceAnswered:why-cantdraw'], ['I pay for a tracing app and want out', 'TraceAnswered:why-paying'],
  ['I want to draw something for someone', 'TraceAnswered:why-gift'], ['Just looking', 'TraceAnswered:why-looking']];
const TRACE_WANT = [['Anime characters', 'TraceAnswered:want-anime'], ['Animals and pets', 'TraceAnswered:want-animals'], ['People', 'TraceAnswered:want-people'],
  ['Anything I type', 'TraceAnswered:want-type'], ['My own photo', 'TraceAnswered:want-photo']];
const TRACE_PAY = [["I'd rather pay once", 'TraceAnswered:pay-once'], ['Weekly fees add up', 'TraceAnswered:pay-adds'], ["They're fine", 'TraceAnswered:pay-fine'],
  ['Pays $4.99 a week', 'TraceAnswered:weekly-499'], ['Pays $9.99 a week', 'TraceAnswered:weekly-999'], ['Pays $24.99 a week', 'TraceAnswered:weekly-2499'],
  ['Pays monthly', 'TraceAnswered:weekly-monthly'], ['Pays, not sure how much', 'TraceAnswered:weekly-unsure']];
const TRACE_STEPS = Object.freeze([
  { key: 'landed', label: 'Landed on the page', names: ['TraceLanded'] },
  // Before 2026-10-17 the web had a 'Get started' page first; kept for old ranges.
  { key: 'intro', label: 'Tapped Get started (old 3-page version)', names: ['TraceIntroDone'], aside: true, hideWhenEmpty: true },
  // Oct 17, 2026 (morning): one screen with "try it first" or "pay now".
  { key: 'chose', label: 'Chose try or pay (old one-screen version)', names: ['TraceChose'], aside: true, hideWhenEmpty: true },
  // From Oct 17, 2026 (behind ?journey=1 first): "About you", three questions, then their choice.
  { key: 'answered1', label: 'Answered "What brought you here?" (Meta: ViewContent)', names: TRACE_WHY.map(([, name]) => name), aside: true, hideWhenEmpty: true },
  { key: 'answered2', label: 'Answered "What do you want to draw?"', names: TRACE_WANT.map(([, name]) => name), aside: true, hideWhenEmpty: true },
  { key: 'answered3', label: 'Answered the subscription question', names: TRACE_PAY.map(([, name]) => name), aside: true, hideWhenEmpty: true },
  { key: 'forward', label: 'Chose how to move forward (try, pay or look around)', names: ['TraceForward'], aside: true, hideWhenEmpty: true },
  // From Oct 17, 2026: cards like the booking engine, then the read-back.
  { key: 'selected', label: 'Tapped Select on a card or a matching drawing', names: ['TraceSelected'], aside: true, hideWhenEmpty: true },
  { key: 'picked', label: 'Picked a picture, a photo or a description (Meta: ViewContent, unless they answered first)', names: ['TracePicked'] },
  { key: 'reviewed', label: 'Read back their drawing and tapped Continue (camera pop-up)', names: ['TraceReviewed'], aside: true, hideWhenEmpty: true },
  { key: 'setup', label: 'Step 2 done: tapped Continue to Trace (the set-up step, Oct 17)', names: ['TraceSetupDone'], aside: true, hideWhenEmpty: true },
  { key: 'cameraok', label: 'Tapped Got It — Open My Camera', names: ['TraceCameraOk'], aside: true, hideWhenEmpty: true },
  { key: 'skipped', label: 'Tapped Skip to tracing (step 1 or 2)', names: ['TraceSkipped'], aside: true, hideWhenEmpty: true },
  { key: 'camera', label: 'Asked for the camera', names: ['TraceCameraAsked'], aside: true },
  { key: 'started', label: 'Started tracing (Meta: AddToCart)', names: ['TraceStarted'] },
  { key: 'traced30', label: 'Traced for 30 seconds', names: ['TraceTraced30'], aside: true },
  { key: 'traced120', label: 'Traced for 2 minutes', names: ['TraceTraced120'], aside: true },
  { key: 'done', label: 'Tapped Done', names: ['TraceDone'], aside: true },
  { key: 'paywall', label: 'Saw the price (the offer sheet, or the old Pay now button)', names: ['TracePaywallShown', 'TraceChose:pay'] },
  { key: 'tapped', label: 'Tapped Unlock', names: ['TraceCheckoutTapped'] },
  { key: 'checkout', label: 'Stripe checkout opened (what Meta hears)', names: ['TraceCheckoutOpened'] },
  { key: 'paid', label: 'Paid $14.99', names: ['TracePaid'] },
  { key: 'unlocked', label: 'Came back unlocked', names: ['TraceUnlocked'], aside: true },
]);
const TRACE_BRANCHES = Object.freeze([
  { key: 'why', hideWhenEmpty: true, label: 'Why they came', steps: TRACE_WHY.map(([label, name]) => [label, [name]]) },
  { key: 'want', hideWhenEmpty: true, label: 'What they want to draw', steps: TRACE_WANT.map(([label, name]) => [label, [name]]) },
  { key: 'subs', hideWhenEmpty: true, label: 'Subscriptions: how they feel, or what they pay now', steps: TRACE_PAY.map(([label, name]) => [label, [name]]) },
  { key: 'forward', hideWhenEmpty: true, label: 'How they moved forward', steps: [['I want to try it first', ['TraceForward:try']], ['This is for me: $14.99 once (straight to Stripe)', ['TraceForward:pay']], ['Just let me look around', ['TraceForward:look']]] },
  { key: 'cards', hideWhenEmpty: true, label: 'The first screen: which card', steps: [['Dragon', ['TraceSelected:dragon']], ['Anything You Type', ['TraceSelected:type']], ['Your Own Photo', ['TraceSelected:photo']], ['More drawings', ['TraceSelected:more']], ['A drawing that matched their answer', ['TraceSelected:mine']], ['A photo, after saying what they want', ['TraceSelected:mine-photo']]] },
  { key: 'skipped', hideWhenEmpty: true, label: 'Skipped to tracing', steps: [['From step 1 (your drawing)', ['TraceSkipped:review']], ['From step 2 (set up)', ['TraceSkipped:setup']]] },
  { key: 'chose', hideWhenEmpty: true, label: 'The old one-screen version (Oct 17 morning)', steps: [['Tapped "I want to try it first"', ['TraceChose:try']], ['Tapped "I\'m ready: pay $14.99" (straight to Stripe)', ['TraceChose:pay']]] },
  { key: 'picked', label: 'What they picked', steps: [['A starter picture', ['TracePicked:starter']], ['Their own photo', ['TracePicked:photo']], ['Describe it (AI)', ['TracePicked:ai']]] },
  { key: 'ai', hideWhenEmpty: true, label: 'Describe it (AI)', steps: [['Typed a description', ['TraceAIAsked']], ['Picture drawn (costs money)', ['TraceAIGenerated']], ['Shown to trace', ['TraceAIShown']], ['Refused by the safety filter', ['TraceAIRefused']], ['Failed', ['TraceAIFailed']]] },
  { key: 'camera', label: 'The camera', steps: [['Camera on, tracing', ['TraceStarted']], ['Blocked by the person', ['TraceCameraDenied:denied']], ['No camera found', ['TraceCameraDenied:nocamera']], ["Browser can't use it", ['TraceCameraDenied:unsupported']], ['Other camera error', ['TraceCameraDenied:error']], ['Told to open in Safari (in-app browser)', ['TraceCameraHelpShown:inapp']]] },
  { key: 'using', label: 'While tracing', steps: [['Changed the fade', ['TraceFaded']], ['Moved or resized the picture', ['TraceMoved']], ['Locked the picture', ['TraceLocked']], ['Tapped Done', ['TraceDone']]] },
  { key: 'price', label: 'When they saw the price', steps: [['Tapped "Buy $14.99" in the top bar', ['TracePaywallShown:top']], ['Tapped "Already sure? Unlock everything" on the first screen', ['TracePaywallShown:now']], ['Tapped "Unlock everything" on the old home page (before Oct 16)', ['TracePaywallShown:home']], ['After tapping Done (traced 30s or more: the cheer)', ['TracePaywallShown:done']], ['After tapping Done before tracing 30s (no cheer)', ['TracePaywallShown:quick']], ['Picked a second picture', ['TracePaywallShown:second']], ['Asked for a second AI picture', ['TracePaywallShown:ai']], ['Came back from Stripe unpaid', ['TracePaywallShown:cancelled']], ['Closed it ("Not now")', ['TracePaywallClosed']]] },
  { key: 'checkout', label: 'Checkout', steps: [['Tapped Unlock', ['TraceCheckoutTapped']], ["Checkout didn't open", ['TraceCheckoutFailed']], ['Came back without paying', ['TraceCheckoutCancelled']], ['Paid', ['TracePaid']]] },
  { key: 'restore', hideWhenEmpty: true, label: 'Already paid?', steps: [['Asked to restore', ['TraceRestoreAsked']], ['Unlocked with the code', ['TraceUnlocked:code']], ['Unlocked with the email link', ['TraceUnlocked:link']]] },
  { key: 'why', label: 'Quiz: what’s been in the way', hideWhenEmpty: true, steps: [
    ['The interest eats most of what I pay', ['PayoffQuizStep:why-interest']],
    ['I don’t know which card to pay first', ['PayoffQuizStep:why-order']],
    ['I’ve tried spreadsheets and gave up', ['PayoffQuizStep:why-tracking']],
    ['Something always comes up', ['PayoffQuizStep:why-life']],
  ] },
  { key: 'from', label: 'Where they came from', steps: [['Clicked the ad (Meta click id)', ['TraceFrom:ad']], ['From Facebook or Instagram, no click id', ['TraceFrom:social']], ['No referrer: typed, QR, or you', ['TraceFrom:direct']], ['From another site', ['TraceFrom:other']]] },
  { key: 'browser', label: 'Which browser', steps: [['Instagram app', ['TraceBrowser:instagram']], ['Facebook app', ['TraceBrowser:facebook']], ['Safari', ['TraceBrowser:safari']], ['Chrome', ['TraceBrowser:chrome']], ['Other', ['TraceBrowser:other']]] },
  { key: 'where', label: 'Web or iPhone app', steps: [['On the web', ['TraceLanded:web']], ['In the iPhone app', ['TraceLanded:app']]] },
]);
const TRACE_VISITOR_EVENTS = Object.freeze(['TraceLanded', 'TraceFrom', 'TraceBrowser', 'TraceIntroDone', 'TraceChose', 'TraceSelected', 'TraceReviewed', 'TraceSetupDone', 'TraceCameraOk', 'TraceSkipped', 'TraceAsked', 'TraceAnswered', 'TraceForward', 'TracePicked', 'TraceCameraAsked', 'TraceCameraDenied', 'TraceCameraHelpShown',
  'TraceStarted', 'TraceFaded', 'TraceLocked', 'TraceMoved', 'TraceTraced30', 'TraceTraced120', 'TraceDone', 'TracePaywallShown', 'TracePaywallClosed',
  'TraceCheckoutTapped', 'TraceCheckoutOpened', 'TraceCheckoutFailed', 'TraceCheckoutCancelled', 'TraceUnlocked', 'TraceRestoreAsked', 'TraceAIAsked', 'TraceAIShown']);
// Branch labels first, so a ladder step's own label wins for the same event.
const labelsOf = (steps, branches) => Object.fromEntries([
  ...branches.flatMap(branch => branch.steps.flatMap(([label, names]) => names.map(name => [name.split(':')[0], label]))),
  ...steps.flatMap(step => step.names.map(name => [name, step.label])),
]);
// What each dashboard shows: the report wedges share one definition.
const PAYOFF_STEPS = Object.freeze([
  { key: 'landed', label: 'Landed (story page or sales letter)', names: ['PayoffLanded'] },
  { key: 'letter', label: 'Opened the sales letter', names: ['PayoffVariant:letter'] },
  { key: 'order', label: 'Reached the order page', names: ['PayoffOrderViewed'] },
  { key: 'cart', label: 'Stayed 20 seconds or started paying', names: ['PayoffOrder:cart'] },
  { key: 'email', label: 'Typed a valid email', names: ['PayoffOrder:email'] },
  { key: 'tapped', label: 'Tapped Complete Order', names: ['PayoffCheckoutTapped'] },
  { key: 'checkout', label: 'Sent payment to Stripe', names: ['PayoffCheckoutOpened'] },
  { key: 'paid', label: 'Paid', names: ['PayoffPaid'] },
  { key: 'emailed', label: 'Payoff link emailed', names: ['PayoffConfirmationEmailed'], aside: true },
  { key: 'failed', label: 'Payment failed or declined', names: ['PayoffCheckoutFailed'], aside: true },
  { key: 'cancelled', label: 'Returned without payment', names: ['PayoffCheckoutCancelled'], aside: true },
]);
const PAYOFF_BRANCHES = Object.freeze([
  { key: 'quiz', label: 'Quiz: how far they got', hideWhenEmpty: true, steps: [
    ['Saw the quiz', ['PayoffVariant:quiz']],
    ['Answered how many cards', ['PayoffQuizStep:q1']],
    ['Answered how they pay now', ['PayoffQuizStep:q2']],
    ['Said what’s in the way', ['PayoffQuizStep:why-interest', 'PayoffQuizStep:why-order', 'PayoffQuizStep:why-tracking', 'PayoffQuizStep:why-life']],
    ['Entered card 1', ['PayoffQuizStep:card-1']],
    ['Entered all their cards', ['PayoffQuizStep:cards']],
    ['Saw their date on minimums', ['PayoffQuizStep:reveal']],
    ['Picked an extra amount', ['PayoffQuizStep:extra']],
    ['Saw their locked plan', ['PayoffQuizStep:plan']],
    ['Tapped Unlock My Plan', ['PayoffQuizStep:unlock']],
  ] },
  { key: 'why', label: 'Quiz: what’s been in the way', hideWhenEmpty: true, steps: [
    ['The interest eats most of what I pay', ['PayoffQuizStep:why-interest']],
    ['I don’t know which card to pay first', ['PayoffQuizStep:why-order']],
    ['I’ve tried spreadsheets and gave up', ['PayoffQuizStep:why-tracking']],
    ['Something always comes up', ['PayoffQuizStep:why-life']],
  ] },
  // The story page the static ad opens, before the sales letter.
  { key: 'story', label: 'Story page (static ad)', hideWhenEmpty: true, steps: [
    ['Opened the story page', ['PayoffStory:viewed']],
    ['Read a quarter (into the kitchen-table night)', ['PayoffStory:scroll25']],
    ['Read half (into the $79,000 example)', ['PayoffStory:scroll50']],
    ['Saw the first button', ['PayoffStory:button']],
    ['Read three quarters (the comments)', ['PayoffStory:scroll75']],
    ['Read to the end', ['PayoffStory:scroll100']],
    ['Tapped through to the sales letter', ['PayoffStory:tapped']],
  ] },
  // measure.js: the sales letter section by section, then the order page step by step.
  // Each card shows only for ranges where its page sent these events, never as zeros before.
  { key: 'letter', label: 'Sales letter: how far they read', shownBy: 'PayoffLetter', steps: [
    ['Opened the sales letter', ['PayoffVariant:letter']],
    ['Reached “where’s the finish line?”', ['PayoffLetter:problem']],
    ['Reached the worked example', ['PayoffLetter:example']],
    ['Reached “less figuring it out”', ['PayoffLetter:mechanism']],
    ['Reached the customer reviews', ['PayoffLetter:proof']],
    ['Reached Lauren’s story', ['PayoffLetter:founder']],
    ['Reached what’s included', ['PayoffLetter:included']],
    ['Reached the FAQ', ['PayoffLetter:faq']],
    ['Read to the end', ['PayoffLetter:end']],
  ] },
  { key: 'letter-taps', label: 'Sales letter: what they tapped', shownBy: 'PayoffLetter', steps: [
    ['The first button (under the headline)', ['PayoffLetter:tap-hero']],
    ['The button after “finish line”', ['PayoffLetter:tap-problem']],
    ['The button after the worked example', ['PayoffLetter:tap-example']],
    ['The button after “less figuring it out”', ['PayoffLetter:tap-mechanism']],
    ['The button after the reviews', ['PayoffLetter:tap-proof']],
    ['The button after Lauren’s story', ['PayoffLetter:tap-founder']],
    ['The button after what’s included', ['PayoffLetter:tap-included']],
    ['The button after the FAQ', ['PayoffLetter:tap-faq']],
    ['Opened a FAQ answer', ['PayoffLetter:faq-open']],
    ['Opened “see how this was worked out”', ['PayoffLetter:math-open']],
  ] },
  { key: 'order-steps', label: 'Order page: how far they got', shownBy: 'PayoffOrder', steps: [
    ['Viewed the order page', ['PayoffOrderViewed']],
    ['Stayed 20 seconds or started paying (Meta: AddToCart)', ['PayoffOrder:cart']],
    ['Stayed 20 seconds at the form (for comparison, not sent to Meta)', ['PayoffOrder:form20']],
    ['Scrolled to the form', ['PayoffOrder:saw-form']],
    ['Typed their name', ['PayoffOrder:name']],
    ['Typed a valid email (Meta: StartedPaying)', ['PayoffOrder:email']],
    ['Started card details', ['PayoffOrder:card-start']],
    ['Finished card details', ['PayoffOrder:card-done']],
    ['Scrolled to the button', ['PayoffOrder:saw-button']],
    ['Tapped Complete Order', ['PayoffCheckoutTapped']],
    ['Paid', ['PayoffPaid']],
  ] },
  { key: 'order-other', label: 'Order page: everything else', shownBy: 'PayoffOrder', steps: [
    ['Payment form loaded', ['PayoffOrder:stripe-ready']],
    ['Form didn’t load: sent to Stripe’s page', ['PayoffOrder:hosted']],
    ['Apple Pay or Google Pay offered', ['PayoffOrder:wallet-shown']],
    ['Tapped Apple Pay or Google Pay', ['PayoffOrder:wallet-tap']],
    ['Tapped “Pay by card” at the top', ['PayoffOrder:top-card']],
    ['Picked bank account', ['PayoffOrder:method-bank']],
    ['Picked Klarna', ['PayoffOrder:method-klarna']],
    ['Paid with Link (a saved card)', ['PayoffOrder:method-link']],
    ['Scrolled to the add-ons', ['PayoffOrder:saw-addons']],
    ['Ticked the cash-flow calendar ($22)', ['PayoffOrder:addon-cashflow']],
    ['Ticked the spending reset ($9)', ['PayoffOrder:addon-reset']],
    ['Paid with the cash-flow calendar', ['PayoffPaid:base,cashflow', 'PayoffPaid:base,cashflow,reset']],
    ['Paid with the spending reset', ['PayoffPaid:base,reset', 'PayoffPaid:base,cashflow,reset']],
    ['Tapped with no name', ['PayoffOrder:missing-name']],
    ['Tapped with no valid email', ['PayoffOrder:missing-email']],
    ['Tapped with card details unfinished', ['PayoffOrder:card-incomplete']],
    ['Card declined', ['PayoffOrder:declined']],
    ['Other payment error', ['PayoffOrder:error']],
  ] },
  // Ten seconds on screen is a real reader, not a bounce.
  { key: 'time', label: 'Time on screen', hideWhenEmpty: true, steps: [
    ['Story page: 10 seconds or more', ['PayoffStory:time10']],
    ['Story page: 1 minute or more', ['PayoffStory:time60']],
    ['Story page: 3 minutes or more', ['PayoffStory:time180']],
    ['Sales letter: 10 seconds or more', ['PayoffLetter:time10']],
    ['Sales letter: 1 minute or more', ['PayoffLetter:time60']],
    ['Sales letter: 3 minutes or more', ['PayoffLetter:time180']],
    ['Order page: 10 seconds or more', ['PayoffOrder:time10']],
    ['Order page: 1 minute or more', ['PayoffOrder:time60']],
    ['Order page: 3 minutes or more', ['PayoffOrder:time180']],
  ] },
  { key: 'from', label: 'Where they came from', steps: [
    ['Clicked the ad (Meta click id)', ['PayoffFrom:ad']],
    ['From Facebook or Instagram, no click id', ['PayoffFrom:social']],
    ['No referrer: typed, QR, or bookmark', ['PayoffFrom:direct']],
    ['From another site', ['PayoffFrom:other']],
  ] },
  // The Payoff Coach, the one upsell since the Interest Cutter: offered right
  // after paying, and in its own tab inside Payoff (three questions free).
  { key: 'coach', label: 'Payoff Coach', hideWhenEmpty: true, steps: [
    ['Saw the Coach offer after paying', ['PayoffUpgradeViewed:coach']],
    ['Tapped Yes: yearly', ['PayoffUpgradeAccepted:year']],
    ['Tapped Yes: monthly', ['PayoffUpgradeAccepted:month']],
    ['Said no thanks', ['PayoffUpgradeDeclined:coach']],
    ['Opened the Coach tab', ['PayoffCoach:opened']],
    ['Agreed to send their numbers', ['PayoffCoach:consent']],
    ['Asked the Coach a question', ['PayoffCoach:asked']],
    ['Tapped start in the Coach tab', ['PayoffCoach:start-year', 'PayoffCoach:start-month']],
    ['Started the Coach: yearly', ['PayoffCoachPaid:year']],
    ['Started the Coach: monthly', ['PayoffCoachPaid:month']],
    ['Renewed the Coach', ['PayoffCoachRenewed']],
  ] },
  // The Interest Cutter, the upsell before the Coach: each price on its own page.
  { key: 'cutter', label: 'Interest Cutter after purchase', hideWhenEmpty: true, steps: [
    ['Saw the 107 offer', ['PayoffUpgradeViewed:offer']],
    ['Tapped YES at 107', ['PayoffUpgradeAccepted:offer']],
    ['Bought at 107', ['PayoffUpgradePaid:offer']],
    ['Saw the 47 discount', ['PayoffUpgradeViewed:discount']],
    ['Tapped YES at 47', ['PayoffUpgradeAccepted:discount']],
    ['Bought at 47', ['PayoffUpgradePaid:discount']],
    ['Opened the 147 page in Payoff', ['PayoffUpgradeViewed:regular']],
    ['Bought at 147', ['PayoffUpgradePaid:regular']],
    ['Let a 2-minute offer run out', ['PayoffUpgradeExpired:offer', 'PayoffUpgradeExpired:discount']],
  ] },
]);
const DEFINITIONS = Object.freeze({
  payoff: { steps: PAYOFF_STEPS, branches: PAYOFF_BRANCHES, labels: Object.freeze({ ...labelsOf(PAYOFF_STEPS, PAYOFF_BRANCHES), PayoffVariant: 'Landing version', PayoffQuizStep: 'Quiz step', PayoffStory: 'Story page', PayoffLetter: 'Sales letter', PayoffOrder: 'Order page',
    PayoffUpgradeDeclined: 'Said no to an upsell', PayoffUpgradeEmailed: 'Interest Cutter receipt emailed', PayoffCoach: 'Coach tab',
    PayoffCoachFree: 'Free Coach question', PayoffCoachEmailed: 'Coach receipt emailed', PayoffAd: 'Came from ad' }),
    fromEvent: 'PayoffFrom', visitorEvents: new Set([...PAYOFF_STEPS.flatMap(step => step.names).map(name => name.split(':')[0]).filter(name => !['PayoffPaid', 'PayoffConfirmationEmailed'].includes(name)), 'PayoffFrom', 'PayoffVariant', 'PayoffQuizStep',
      'PayoffUpgradeViewed', 'PayoffUpgradeAccepted', 'PayoffUpgradeDeclined', 'PayoffUpgradeExpired', 'PayoffStory', 'PayoffLetter', 'PayoffOrder', 'PayoffCoach', 'PayoffAd']),
    // The landing A/B test: each version's own ladder, judged on purchases per visitor.
    variants: { event: 'PayoffVariant', values: [['letter', 'Sales letter'], ['quiz', 'Quiz']],
      steps: [['Landed', 'landed'], ['Viewed order', 'order'], ['Tapped Complete Order', 'tapped'], ['Paid', 'paid']] },
    // Each ad's own ladder, from the ad id its link carries (PayoffAd).
    ads: { event: 'PayoffAd', steps: [
      ['Opened the story page', ['PayoffStory:viewed']],
      ['Opened the sales letter', ['PayoffVariant:letter']],
      ['Viewed the order page', ['PayoffOrderViewed']],
      ['Stayed 20 seconds or started paying (Meta: AddToCart)', ['PayoffOrder:cart']],
      ['Typed a valid email', ['PayoffOrder:email']],
      ['Paid', ['PayoffPaid']],
    ] },
    split: false, tiles: [['Landed', 'landed'], ['Sales letter', 'letter'], ['Order page', 'order'], ['Stayed 20 seconds', 'cart'], ['Typed email', 'email'], ['Paid', 'paid']] },
  report: { steps: STEPS, branches: BRANCHES, labels: LABELS, fromEvent: 'OfferFrom', visitorEvents: VISITOR_EVENTS, split: true, tiles: null },
  trace: { steps: TRACE_STEPS, branches: TRACE_BRANCHES, fromEvent: 'TraceFrom', visitorEvents: TRACE_VISITOR_EVENTS, split: false,
    // Events whose detail says which one (source, browser, what was picked) are
    // named for the card; the detail column shows the value.
    labels: Object.freeze({ ...labelsOf(TRACE_STEPS, TRACE_BRANCHES), TraceFrom: 'Where they came from', TraceBrowser: 'Which browser',
      TraceChose: 'Chose try or pay', TraceSelected: 'Tapped Select on a card', TraceSkipped: 'Skipped to tracing', TraceAsked: 'Saw a question', TraceAnswered: 'Answered', TraceForward: 'Chose how to move forward', TracePicked: 'Picked something', TraceCameraDenied: 'Camera problem', TraceCameraHelpShown: 'Shown camera help', TracePaywallShown: 'Saw the price',
      TraceUnlocked: 'Unlocked', TraceAIGenerated: 'AI picture drawn', TraceAIRefused: 'AI picture refused', TraceAIFailed: 'AI picture failed', TraceUnlockEmailed: 'Unlock email sent' }),
    tiles: [['Landed', 'landed'], ['Answered question 1', 'answered1'], ['Moved forward', 'forward'], ['Picked something', 'picked'], ['Read back', 'reviewed'], ['Started tracing', 'started'], ['Traced 30s', 'traced30'], ['Saw the price', 'paywall'], ['Tapped Unlock', 'tapped'], ['Checkout opened', 'checkout'], ['Paid', 'paid']] },
});
const definitionFor = tool => DEFINITIONS[tool] || DEFINITIONS.report;

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

// The ads' ladders side by side. A visitor belongs to the last ad they
// clicked; `adTags` are the clicks from before the range began, so someone who
// clicked yesterday and paid today still counts for their ad.
function byAd(events, ads, adTags, limit = 8) {
  const last = new Map();
  for (const tag of [...adTags, ...events.filter(event => event.name === ads.event)]) {
    if (!tag.visitorId || !/^\d{6,25}$/.test(tag.detail || '')) continue;
    const at = new Date(tag.createdAt).getTime(), seen = last.get(tag.visitorId);
    if (!seen || at >= seen.at) last.set(tag.visitorId, { ad: tag.detail, at });
  }
  const groups = new Map();
  for (const event of events) {
    const ad = event.visitorId && last.get(event.visitorId)?.ad;
    if (ad) groups.set(ad, [...(groups.get(ad) || []), event]);
  }
  return [...groups].map(([ad, theirs]) => {
    const visitors = new Set(theirs.map(personOf)).size;
    return { ad, visitors, steps: [{ label: 'Visitors from this ad', people: visitors, ofVisitors: 1 },
      ...ads.steps.map(([label, names]) => { const n = people(theirs, names); return { label, people: n, ofVisitors: n / visitors }; })] };
  }).sort((a, b) => b.visitors - a.visitors).slice(0, limit);
}

function buildWedgeFunnel(events, definition = DEFINITIONS.report, adTags = []) {
  const { steps: STEP_LIST, branches: BRANCH_LIST, labels: LABEL_MAP } = definition;
  const landed = people(events, STEP_LIST[0].names);
  let previous = null;
  const steps = STEP_LIST.map(step => {
    const count = people(events, step.names);
    const latest = events.filter(event => matches(event, step.names)).reduce((last, event) => Math.max(last, new Date(event.createdAt).getTime()), 0);
    const row = { key: step.key, label: step.label, people: count,
      lastAt: latest ? new Date(latest).toISOString() : null,
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
  const branches = BRANCH_LIST.filter(branch => !branch.shownBy || events.some(event => event.name === branch.shownBy)).map(branch => ({ key: branch.key, label: branch.label, hideWhenEmpty: !!branch.hideWhenEmpty,
    steps: branch.steps.map(([label, names]) => ({ label, people: people(events, names) })) }))
    .filter(branch => !(branch.hideWhenEmpty && branch.steps.every(step => !step.people)));
  const starts = events.filter(event => event.name === 'SimStarted' || event.name === 'OfferLanded');
  const split = definition.split ? { phone: new Set(starts.filter(e => e.detail === 'phone').map(personOf)).size,
    desktop: new Set(starts.filter(e => e.detail === 'desktop').map(personOf)).size,
    unknown: new Set(starts.filter(e => e.detail !== 'phone' && e.detail !== 'desktop').map(personOf)).size } : null;
  const recent = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 150).map(event => ({
    name: event.name, label: LABEL_MAP[event.name] || event.name, detail: event.detail || null,
    who: personOf(event).replace(/^(v_|account:|event:)/, '').slice(-6), at: new Date(event.createdAt).toISOString() }));
  const variants = definition.variants ? definition.variants.values.map(([value, label]) => {
    const who = new Set(events.filter(event => event.name === definition.variants.event && event.detail === value).map(personOf));
    const theirs = events.filter(event => who.has(personOf(event)));
    return { key: value, label, steps: definition.variants.steps.map(([stepLabel, key]) => {
      const n = key === STEP_LIST[0].key ? who.size : people(theirs, STEP_LIST.find(step => step.key === key).names);
      return { label: stepLabel, people: n, ofLanded: who.size ? n / who.size : null };
    }) };
  }) : null;
  const ads = definition.ads ? byAd(events, definition.ads, adTags) : null;
  return { steps: shown, branches, split, recent, events: events.length, ...(definition.tiles ? { tiles: definition.tiles } : {}), ...(variants ? { variants } : {}), ...(ads ? { ads } : {}) };
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

// Only the people who arrived with Meta's click id, with everything they did (a payment record
// carries the visitor id too). Visits from before the source was recorded are left out.
function onlyAdClicks(events, sources = events, fromEvent = 'OfferFrom') {
  const ads = new Set(sources.filter(event => event.name === fromEvent && event.detail === 'ad' && event.visitorId).map(event => event.visitorId));
  return events.filter(event => event.visitorId && ads.has(event.visitorId));
}

module.exports = { byAd, onlyAdClicks, STEPS, BRANCHES, VISITOR_EVENTS, LABELS, RESET_EVENT, buildWedgeFunnel, excludedAccountIds, countingSince,
  TRACE_STEPS, TRACE_BRANCHES, TRACE_VISITOR_EVENTS, DEFINITIONS, definitionFor };
