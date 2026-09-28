# Marketel wedge framework

Read this before changing a Marketel product surface. A wedge is a new audience
and job on the existing report engine. The engine owns capture, evidence,
reports, accounts and payment. A manifest owns the wedge's words, document
types, capabilities and demo. A capability the engine lacks is an engine change
first, with tests, then a manifest choice.

## 1. The job

Dead simple is the moat, alongside distribution. Each screen does one clear
job; aim for three taps to value. Remove a decision when the product already
knows the answer. `setupFlow`, `start`, `renderReports` and `renderProperties`
in `guest-lodge-backend/public/inspect/inspect.js` are the working reference.

## 2. Design reference

The report engine looks like Claims. Inspect its live phone flow and
`guest-lodge-backend/public/inspect/inspect.css` before designing another
report wedge. Other engines use Front Desk; see
`marketel-frontdesk-ios/www/frontdesk` and `DESIGN-HANDOFF.md` §4.

Use DM Sans and the Marketel serif SVG wordmark. The report tokens in
`inspect.css` are green `#2e7d5b`, dark green `#245f46`, light green
`#4caf7d`, pale green `#e8f5ee`, muted `#6b7d72`, border `#d8e4dc`,
surface white, page `#eff4f0`, and text `#1a2b22`. The product pill says
“Marketel {Product}” and has a ••• menu. Native navigation has list,
New/In Progress, and places tabs. Use the existing 24px cards, three button
levels, sheets, notices, skeleton rows and property chips. Design at 390px;
keep content clear of the header and floating tab bar. Give a job that needs
half a screen its own page. No horizontal scroll.

## 3. Every tap answers

The client’s `releasePress`, `run`, `tappedButton`, `notice`, `haptic` and
`flowScreen` implement the interaction contract. Press feedback lasts at least
140ms, including quick taps on iOS; the registered `touchstart` makes
`:active` work. A slow button shows a spinner, cannot be tapped twice and
does not depend on button focus, which iPhone does not provide. An action
ends on the right tab, with a short outcome and the next action visible.
Messages must appear over an open sheet. Native handoffs stay busy until the
native completion callback; PDF sharing waits for `shown`. Copy buttons say
“Copied ✓”; completed actions give success haptics. Every sheet has a plain
way out, such as “Keep mine” or “I'll send it later”.

## 4. Keep the page stable through transitions

`openAccountHome`, `reportsSkeleton`, `list`, `flowScreen`,
`deleteReportRow`, `deleteProperty` and `marketelInspectNativeSelectTab` are
the reference. A saved session is signed in from the first frame; only a real
401, checked against `/account`, signs it out. Cold start shows the list
layout with skeleton rows. The big logo belongs only to the seconds after
sign-in. Empty accounts get a real page and no automatic draft. Keep the old
content until the next screen is ready; never replace it with bare “Loading…”.
Delete rows optimistically and restore them with the server’s reason on
failure. Back and close return to real content. Finalized reports belong on
the list tab; New starts a new report. Check cold start, tab changes, sheets,
deletes, auth changes and foreground return in both cached and uncached
states. `test/browser/matrix.test.js` and `app-flow.test.js` cover the base.

## 5. Ask once

`rememberedAuthor`, `storeAuthor`, `savedSignature`, `savedPropertyChips` and
`setupFlow` preserve what the operator already supplied. Remember name,
signature, business and properties on the device; default from a known fact
when honest, such as event time from the first camera photo. Sending asks for
any missing name inline instead of sending the operator backward. Name fields
use `autocorrect="off" spellcheck="false" autocapitalize="words"`.

## 6. Capture and evidence

`openNativeCamera`, `cameraCompanion`, `syncPhotosSoon`, `stampPhoto` and
`photoCaption` are the reference. The camera and voice are the center of
capture; do not add checklists, prompts and toggles to that screen. Upload
photos in the background and keep offline capture usable. Store taken and
received moments in `document.photoTimes`; stamp a dated display copy on the
server, but leave the original bytes intact. Receipt images are not stamped.
Images use `data-photo` so failed blob URLs can be repaired. A sent report
loads the saved dated copies. See `test/browser/camera.test.js` and
`guest-lodge-backend/test/inspect.test.js`.

## 7. Words must belong to this wedge

Use plain sentence case, dates such as “Sep 23, 2026”, and 12-hour times with
a nonbreaking space before AM/PM. The client’s `skin`, `wedge`, `typeLabel`
and the server’s `typeLabel`, `documentIdentity`, `disclaimerFor` are the
reference. No other product’s noun belongs on a rendered page. Say what
Marketel produces: evidence and a report, never a guaranteed outcome or a
claim filed on a platform. Every document type carries its disclaimer.
`wedge:check` scans both manifest copy and rendered pages: another wedge's
nouns, and any sentence of five or more words from another wedge's manifest
(unless the engine builds it from a template around this wedge's own noun).
Copy that differs by wedge lives in the manifest, never in the engine; the
send sheet's originals line is `originalsLine` on the report type.

## 8. Funnel, plan and Meta

`toolOffer`, `simOffer`, `simCheckout` and the server’s `entitlement`,
`validateInspectPrice` and `queueInspectCapi` own this contract. One account,
one subscription and one report allowance span the wedges: $25/month or
$199/year, with fair use of 300 reports per billing period. No per-wedge
Stripe product. `pay-at-export` lets someone build for free and asks for a
plan when sending; Claims uses it. `first-free` grants one lifetime free
complete report. The video landing goes straight to Stripe, whose page takes
the email (Apple Pay fills it in); a checkout without an address gets the three
free days, and the webhook cancels a second plan for someone who already pays,
while it is still free, and records a repeat trial. The try-it simulation still
asks for the email first. Server and client copy agree. The
trial is the full three days (the price bar says "Free for 3 days"): nothing
sent in them ends it early, and every trialist is emailed the day before.
`SimCheckoutTapped` fires Meta InitiateCheckout on the CTA tap with a
deduplicating event ID. The server sends StartTrial and Purchase, excludes
owner/test emails with normalized plus aliases, and excludes app purchases
(`metadata.source='app'`). Native purchases open the default browser only in
the US storefront. Outside the US, show no prices, purchase links, or “need a
plan” language. The Stripe billing portal is US only.

**Desktop.** Cold visitors have no damage in front of them, so on a computer
the landing leads with "See how it works →", which runs the same simulation
inside a phone frame (`simFrame`; `?sim=1` also brings Stripe's demo buyers
back into it). From about 880px wide the report builds beside the phone as
they go (`simSide`: the note as it is said, the dated photo, the filing date),
and the offer moves out of the phone to sit next to it. Starting a real report stays one quiet link below. Phones get
the simulation directly.

**Report, then offer.** The demo's report is its own page with one button,
"Get this for my {place} →"; the price is the next page (on desktop, the side
panel beside the report). Three demo steps go to Meta for optimizing, each
once per visitor and never from the app or an owner's browser: report seen
(ViewContent), "Get this" (AddToCart), start free (InitiateCheckout). Optimize
for the deepest one with enough weekly volume, and move down as it grows.

**Video landing.** A wedge with `landing.video` (a Cloudinary `.mp4`, a
`.jpg` poster, whole `seconds`, a `sub` line and a `label`) gives ad visitors
the offer first: the ad's headline, a real-time recording of the real app
making a report, and the offer card with its pinned price bar under it. The ad
already showed how it works, so every paid visitor meets the price and each
week answers whether they start a trial. The simulation stays at `?sim=1`;
Stripe returns and signed-in owners are untouched. Meta's ViewContent there is
twenty seconds with the page on screen, or tapping start free, whichever comes
first, so the visitor who gets it in ten seconds counts too. How much of the
video they watch (seconds actually played on screen) is on `/funnel` only. The
page's content policy allows media from Cloudinary only.
Record it in real time and never speed it up: the page says how long it took.

**Pay once.** A wedge with `offer.lifetime` (whole dollars, 19 to 999) sells
that on its video landing instead of a trial: the price is the headline
("$99 once. Unlimited damage reports."), one button, no plan switch and no
"keep it free". Checkout is one Stripe payment with no subscription; the
webhook (and the thank-you page, whichever is first) sets the account's
`lifetimeSince`, which keeps the plan active whatever any subscription does.
Paying once again is refunded automatically, and paying once over a live
subscription cancels it. The ad click rides on the checkout's metadata, so
Meta hears the Purchase although the account is created after the payment.
On `/funnel` it counts as both "Paid once or started a trial" and "Paid". The
ad must say the same thing: an ad promising "free to try" that lands on "$99
once" is the mismatch that sinks a week.

**Launch price.** `offer.launch` (`price` below `offer.lifetime`, and a fixed
UTC `until`) shows the lower price with a live countdown to that moment, the
same for everyone, and "Instead of ~~$199 every year~~" (the real annual plan).
At `until` the page redraws at the full price and checkout charges it; the
registry refuses a launch that is not lower or not a fixed time. Urgency here
is always real: published tests show real deadlines lifting sales (median
+9%) and fake or resetting ones lowering them, and the FTC names baseless
timers as deceptive. A new launch price later is a real price change, never a
reset. "Only N left" waits until real sales make the number true.

**App switch.** Each wedge's `appStore.live` says whether the approved iPhone
app carries it. While it is `false`, the web funnel keeps buyers in the
browser: the page after paying says it works right here and starts the first
report, and no App Store link or "open in the app" card appears. Ads can run
before Apple approves. Once Apple approves a build that carries the wedge, set
`appStore.live: true`, run `npm run wedges:build`, and push; the funnel then
points buyers at the app. A live wedge can also list `appStore.screens`
(480px-wide images in `public/inspect/sample/`, each with a caption, under
80KB); the demo then shows them under its offer as "The real app", with the
captions as page text so a bad caption is a one-line fix.

**Funnel dashboard.** `/funnel` shows each live, in-app wedge from the ad to
paying (`wedge-funnel.js` reads `inspectEvent`). Every step a visitor can take
is recorded with the wedge's tool and the visitor id; server records (trial,
first payment, cancellation) carry them too. A new step in any wedge must be
recorded and listed in `wedge-funnel.js` before it ships. Headless browsers are
not counted, so production checks never pollute it. The old booking and
support dashboard is at `/funnel/legacy`. Opening `/funnel` in a browser switches that
browser off ("Not counting this browser"): it sends no steps, every request is
marked `x-marketel-no-track`, and the server records nothing and tells Meta
nothing for it. `?notrack=1` on any page does the same for in-app browsers.

## 9. App Store

The listing, review notes and privacy labels live under
`marketel-frontdesk-ios/app-store/`. The review account uses a fixed code and
receives 25 report credits on sign-in. Avoid competitors’ trademarks in
keywords. Put every live wedge in review notes’ “What to test”. App bundles
ship through TestFlight; a web deployment does not update an installed app.

## 10. Tests and mirrors

Run `npm test` and `npm run test:browser` in `guest-lodge-backend`, then
`npm run verify:release` in `marketel-frontdesk-ios`. Add a success and a
failure browser check for new behavior. Chromium does not prove the phone:
the harness simulates iOS tap focus and dead blob URLs, and visual changes
need real-phone review. The `guest-lodge-backend/public/inspect` files and
`marketel-frontdesk-ios/www/inspect` copies must match byte for byte. Bump
both `index.html` asset versions together. `verify:release` checks the app;
`wedge:check` checks mirrors and generated data.

## 11. Building a wedge

**Finding one: unbundle a bloated incumbent.** Start from demand, not from
our engines. Look for a product many people already pay for that does far
too much, where its App Store reviews, Reddit threads and price changes say
"too complicated", "too expensive", "I only use one thing", or "fees on
clients who were already mine". The wedge is that one job: simpler, cheaper
($25/month or less), in a well-designed iPhone app. It does not have to fit
an existing engine if the one job is simple enough to build in days. It
must fill every part of the winning script (identity, the money they lose
to someone, the fast fix, one sentence on how, the detail that kills the
objection, free to try, the injustice close), and it wins on distribution
and simplicity, because every such incumbent already has cheap rivals.
`WEDGE-UNBUNDLE-PROMPT.md` at the repo root is the research brief.

1. Get a brief: incumbent and its price, audience, villain, deadline or
   clock, one-line job, and offer mode. Research real complaints and
   competitor reviews.
2. Run `npm run wedge:new -- <id>`. Fill its manifest: copy, document types,
   seeds, capabilities, disclaimer, demo findings and App Store captions.
   Use a type name unique across all wedges. A photos-only baseline is a type
   with `can.free` and `can.photosOnly`; the paid type points to it through
   `can.baseline`. `startBaseline`, `linkBaseline`, `/properties` and
   `baselineReportId` then use it without engine edits. A deadline with only
   `text` displays guidance and computes no “File by” date. Add `days`,
   `from` and `field` only when one rule truly applies to the whole audience.
   When what is photographed is not a room, give the type `capture` words
   (`ask`, `another`, `missing`, such as "Which part of the car?"); its
   first seed is the camera's placeholder. Walk every screen and read it: the
   copy scan cannot know which of the engine's defaults sound wrong.
3. Provide three real demo photos and thumbnails.
4. Run `npm run wedge:check -- <id>`. Review its screenshots at phone size and
   the demo recording by eye, including the wording on every rendered page.
   `wedges/_fixture.js` exercises new nouns such as unit and tenant, and
   `test/browser/wedges.test.js` checks them in the page, editor and send
   sheet. The checker writes screenshots and a 1080×1920 recording under
   `artifacts/wedges/<id>/` and reruns the backend, browser and iOS gates.
5. Keep `status: 'draft'` until review. Merging makes its web route available
   with noindex; `status: 'live'` adds it to the app chooser after a TestFlight
   build and updated App Store review notes.
6. Hand over ad script, primary text, headline, description and the demo
   recording for the UGC creator. The script can say “under 3 minutes”,
   “works with whatever you use now” and “free to try” only when the wedge
   actually demonstrates those claims.

For the first proof wedge, read `docs/wedges/MOVEOUT-BRIEF.md` before changing
its offer or deadline copy. It records the research and intended limits.

### Launch playbook: the ads

Every wedge gets the same test on the video landing (§8), and spends more only
once it passes. The budget is $300 a week of the owner's money: two wedges at
$20/day while testing. At $10/day a verdict takes twice as long for the same
money, and Meta learns from half the events.

| Stage | Spend | Creative | Pass line |
|---|---|---|---|
| 1. Does the hook land? | First 2–3 days | Real-time screen recording of the real app, with AI voice and subtitles, or the creator video | Link CTR above ~3% (link clicks, not CTR (all)); under ~$2 per landed visitor on `/funnel` |
| 2. Do they want it? | 1–2 weeks at $20/day (~$150–300) | Same | The checkpoints below |
| 3. Scale or kill | Revenue funds it | Fresh UGC faces when frequency climbs | Keep while a paying customer costs under ~$150 (about six months to pay back); scale when it is under ~$75 |

**Checkpoints.** Judge on people who landed, never on a day: Meta can spend
most of a day's budget in one burst. Each row is a `/funnel` row.

| Checkpoint | Judge once there are | Healthy | Otherwise |
|---|---|---|---|
| Stayed 20 seconds or tapped start free | 100 landed | 25% or more | Under 15%: the ad and the page do not match. Fix the headline or the video once before judging the wedge. |
| Tapped start free | 100 landed | 3 or more | 0–1: kill. 2: one more week. |
| Gave their email | 5 taps | 60% of taps | The email step scares people: fix it, do not kill the wedge. |
| Opened Stripe, then started a trial | 5 opened Stripe | 50–70% | Checkout friction, shared by every wedge: fix it once for all. |
| Started a trial | 200 landed | 3 or more (1.5%) | 0–1: kill. 2: one more week. |

The minimums keep a good wedge from being killed by bad luck: one where 5 in
100 really tap shows 0–1 taps in 100 visitors about 4% of the time, and one
where 2 in 100 really start a trial shows none in 100 visitors 13% of the time
but in 200 only about 2%.

**Fixing.** One change a week, at the step losing the most people. A wedge
gets at most two fix weeks after its first read; still under the line, kill
it. Fix only what one change can close: a step that must double can be fixed,
a step that must grow five times cannot. Run at most four wedges at once and
move money to the one whose paying customer costs least.

**Meta.** On the video landing, ViewContent is twenty seconds on the page or
tapping start free. Move the ads to InitiateCheckout (start free) once it
reaches about 20 a week. A killed wedge is a week or two and a few hundred
dollars: move to the next brief, and keep the next one ready before you need
it.

### Gotchas

Chromium once passed while iPhone failed on button focus, `:active`, notices
behind `showModal`, and dead blob photos. A `flowScreen` must never restore a
loading placeholder. The native PDF callback has `shown`, `complete`,
`dismissed`, `failed` and `busy` states. Storefront arrives asynchronously
from `requestStorefront`; re-render US-only choices when it does. Stripe is
live, and card 4242 is declined; verify checkout mode by its `cs_live_` URL
without charging. This development machine’s clock can run ahead of the
server, so production API tests must not send local future timestamps as
camera taken times. Never style a bare element selector that report content
also uses: a global `header` rule pinned the business name over the site bar
on the web and hid it in the app; site chrome is `body > header`. Any rule
that sets `display` overrides the `hidden` attribute, so `inspect.css` makes
`[hidden]` win with `!important`; without it the demo camera's Done showed
from the start and let visitors skip the note and the photo. Chromium
does not expose the body of an upload that carries a file, so the browser
harness reads each photo in the page and keys it to the upload URL.
