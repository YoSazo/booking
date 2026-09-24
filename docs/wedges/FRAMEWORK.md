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
complete report. The web simulation leads to an email wall and a three-day
trial for accounts that never subscribed; server and client copy agree.
`SimCheckoutTapped` fires Meta InitiateCheckout on the CTA tap with a
deduplicating event ID. The server sends StartTrial and Purchase, excludes
owner/test emails with normalized plus aliases, and excludes app purchases
(`metadata.source='app'`). Native purchases open the default browser only in
the US storefront. Outside the US, show no prices, purchase links, or “need a
plan” language. The Stripe billing portal is US only.

**Desktop.** Cold visitors have no damage in front of them, so on a computer
the landing leads with "See how it works →", which runs the same simulation
inside a phone frame (`simFrame`; `?sim=1` also brings Stripe's demo buyers
back into it). Starting a real report stays one quiet link below. Phones get
the simulation directly.

**App switch.** Each wedge's `appStore.live` says whether the approved iPhone
app carries it. While it is `false`, the web funnel keeps buyers in the
browser: the page after paying says it works right here and starts the first
report, and no App Store link or "open in the app" card appears. Ads can run
before Apple approves. Once Apple approves a build that carries the wedge, set
`appStore.live: true`, run `npm run wedges:build`, and push; the funnel then
points buyers at the app.

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

1. Get a brief: audience, villain, deadline or clock, one-line job, and offer
   mode. Research real complaints and competitor reviews. Stay within what
   the report engine can honestly do.
2. Run `npm run wedge:new -- <id>`. Fill its manifest: copy, document types,
   seeds, capabilities, disclaimer, demo findings and App Store captions.
   Use a type name unique across all wedges. A photos-only baseline is a type
   with `can.free` and `can.photosOnly`; the paid type points to it through
   `can.baseline`. `startBaseline`, `linkBaseline`, `/properties` and
   `baselineReportId` then use it without engine edits. A deadline with only
   `text` displays guidance and computes no “File by” date. Add `days`,
   `from` and `field` only when one rule truly applies to the whole audience.
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
on the web and hid it in the app; site chrome is `body > header`. Chromium
does not expose the body of an upload that carries a file, so the browser
harness reads each photo in the page and keys it to the upload URL.
