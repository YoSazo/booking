# Marketel Trace (consumer test)

`bookmarketel.com/trace`. You pick a picture (six starters, or your own photo
turned into pencil lines on the phone), it floats over the live rear camera,
you rest the phone above paper and draw along the lines. The first drawing is
free. After that it's **$14.99 once**: no subscription, nothing renews.

This is the first consumer test after Claims. It's judged by the consumer
money line: one paying customer must cost about $8–12 or less in ads.

## The web flow (since Oct 17, 2026)

Built like the booking engine (`hotel-booking-app/src/BookingPage.jsx` and
`GuestInfoPage.jsx`), the only funnel that has had cold Meta traffic finish a
card form, then given an "About you" opening so visitors put themselves into
it, the way a viewer reads themselves into a video.

**About you** (behind `?journey=1` until `JOURNEY_DEFAULT` in
`trace-web/trace.js` is true; the choice is remembered per browser,
`?journey=0` clears it):

1. "What brought you here?" (the ad's call-out from `?hook=` sits above it).
2. "What do you want to draw?" (anime, animals, people, anything I type, my
   own photo).
3. Money as a preference: "How do you feel about app subscriptions?", or, for
   someone who pays for a tracing app, "What do you pay now?".
4. Their answers read back beside the real recording, then "How would you
   like to move forward?": try it first (free), "This is for me: $14.99
   once" (straight to Stripe), or "Just let me look around" (the cards).
5. Trying shows drawings that match their answer (step 2 of 3), then the
   read-back.

**Everyone else** (the default, looking around, returning visitors) gets the
cards: "Trace Anything", the promise, Dragon, Anything You Type (Select opens
a box with ideas), Your Own Photo, "More drawings", and a quiet "Already
sure?" link to the price.

Then, for both: the drawing read back on ruled paper with "Trace it for $0
today" (and Skip to Tracing), "Why we need your camera" with the three
set-up lines, iOS asks, tracing. After 30 seconds of tracing, Done gives the
cheer and the price; the price line uses what they said about paying.

The app and buyers skip all of this: the picture grid opens the camera.
Events: `TraceAsked:<step>`, `TraceAnswered:<question>-<answer>` (the first
answer is Meta's ViewContent), `TraceForward:<try|pay|look>`,
`TraceSelected:<card>`, `TracePicked` (ViewContent with the same event id
when they didn't answer first), `TraceReviewed`, `TraceCameraOk`,
`TraceSkipped`, then `TraceStarted`.

## Where it lives

- `guest-lodge-backend/trace.js`: page routes, `/api/trace/*`, unlock tokens.
  It's registered in `server.js` next to Inspect.
- `guest-lodge-backend/trace-web/`: `index.html`, `trace.js`, `trace.css`,
  `terms.html`, `pictures/*.webp` (line drawings, the cards' art and the setup photo). These files
  are served only through `trace.js`. They aren't under `public/`; the build
  script mirrors them into the iOS app's `www/trace` directory.
- Tests: `test/trace.test.js` and `test/browser/trace.test.js` (Chromium with
  a fake camera).

## Money

- Checkout is Stripe's **hosted** page, on the same account as Inspect. The
  statement reads `MARKETEL* TRACE`. The page uses the Marketel theme (DM Sans, green, the Marketel bar), the same as Claims, so the ad, the page, Stripe's page (which shows Marketel), the email and the statement all read as one company, falling back to the plain descriptor if
  the account refuses a suffix.
- There is no account and no new table:
  - A paid Checkout Session (`metadata.product = trace`) is the purchase.
  - The unlock token is the session id signed with `TRACE_UNLOCK_SECRET`, or
    with `INSPECT_AUTH_SECRET` if that isn't set.
  - The token is stored on the phone, and the buyer is emailed a
    `/trace?unlock=` link once.
- **"Already paid?"** looks up paid sessions by email in Stripe and emails the
  link. It gives the same answer whether or not that email bought.
- **Payment fulfillment:** the existing `/api/inspect-stripe-webhook` verifies
  the signature and dispatches Trace checkout completions to Trace's handler.
  It confirms the paid session, records `TracePaid`, queues Meta's Purchase
  and emails the unlock even if the buyer never returns from Stripe. The browser
  return uses the same fulfillment and email claim, so replays don't duplicate
  the purchase or email. Failed email sends release the claim and make the
  webhook retry. Keep `checkout.session.completed` enabled on that Stripe
  webhook and `STRIPE_INSPECT_WEBHOOK_SECRET` configured.
- The pending checkout id is saved before leaving for Stripe on both web and
  native. Reloading an interrupted return can recover the paid unlock without
  needing the removed `?paid=` parameter. Checkout refuses to create a session
  if the server cannot sign unlocks.

## Funnel and Meta

Steps are written to `InspectEvent` with `tool = 'trace'`, as names only:
`TraceLanded`, `TraceFrom`, `TraceBrowser`, `TracePicked`,
`TraceCameraAsked`, `TraceCameraDenied`, `TraceCameraHelpShown`,
`TraceStarted`, `TraceFaded`, `TraceLocked`, `TraceMoved`, `TraceTraced30`,
`TraceTraced120`, `TraceDone`, `TracePaywallShown`, `TracePaywallClosed`,
`TraceCheckoutTapped`, `TraceCheckoutOpened`, `TraceCheckoutFailed`,
`TraceCheckoutCancelled`, `TraceUnlocked`, `TraceRestoreAsked`, and the
server-side `TracePaid`.

`/funnel` doesn't show this tool yet, so read it from the database.

Four events go to Meta through the same pixel and CAPI queue as Claims, each
once per visitor. The campaign optimises ViewContent:

| Step | Meta event |
|---|---|
| `TracePicked` (first deliberate tap: a picture, a photo or a description) | ViewContent |
| `TraceStarted` (tracing on camera) | AddToCart ($14.99) |
| `TraceCheckoutOpened` | InitiateCheckout ($14.99) |
| Confirmed payment | Purchase |

Until 2026-10-16 ViewContent was `TraceStarted`. It was moved one step earlier
because 0 of the first 7 visitors started tracing, which left Meta nothing to
learn from.

Owner browsers (`?notrack=1`, which uses the same `marketel.noTrack` key as
Claims) and headless browsers are left out. Owner/test purchases do not create
`TracePaid` counts. Native startup skips advertising attribution altogether:
custom-scheme pages have an opaque origin and must not build a web source URL.
Webhook purchases use the buyer's email and saved click identifiers, never
Stripe's request IP or user-agent.

## Turning it off

Set `TRACE_ENABLED=false` on Render. The page and the API return 404 with no
deploy needed.

## Open before spending

1. **Camera in Facebook's in-app browser.** It's tested only with Chromium's
   fake camera. Open the ad link inside the Facebook app on a real iPhone. If
   the camera is refused there, the page shows "Open in Safari" with a copy
   link button.
2. **The refund line** ("Not working on your phone? Email within 7 days for a
   full refund") is a promise on the paywall and the terms page. Remove both
   if the owner doesn't want to make it.
3. **The pixel is shared with Claims.** Pause Claims' campaign so its events
   don't mix with these.

## In the iPhone app (from version 3.33)

Marketel Trace replaces Claims on the app's menu. With only one tool on the
menu, the app opens straight into it. Claims stays live on the web and on
`/funnel`, and its emailed sign-in links still open Claims in the app.

- **The page:** `npm run wedges:build` copies `trace-web` into
  `marketel-frontdesk-ios/www/trace`, and `wedges:check` fails when the copy is
  stale. The page notices it's in the app (the native shell is reachable),
  calls the API at `https://bookmarketel.com`, hides the app's glass bar and
  draws its own.
- **Buying:** only in the US App Store (`inspectStorefront` answers `USA`).
  - The page creates the Checkout and opens it in Safari with `openPurchase`,
    then keeps the session id.
  - When the app comes back to the front, it checks that session and unlocks
    itself.
  - Stripe's return page in Safari also shows a "Back to the Marketel app"
    button (`com.bookmarketel.frontdesk://trace`).
- **Outside the US:** no price and no buy button. The first drawing is free,
  and a web purchase can be unlocked with the code.
- **"Already paid?":** the buyer enters their email and gets a 6-digit code by
  email. The code works only with the email that paid, with six tries an hour
  per email. The email still carries the web unlock link too.
- **Tracking:** nothing done in the app goes to Meta or Clarity. App
  activity is recorded with `TraceLanded` detail `app`.
