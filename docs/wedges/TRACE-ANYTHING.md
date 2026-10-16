# Marketel Trace (consumer test)

`bookmarketel.com/trace`. You pick a picture (six starters, or your own photo
turned into pencil lines on the phone), it floats over the live rear camera,
you rest the phone above paper and draw along the lines. The first drawing is
free. After that it's **$14.99 once**: no subscription, nothing renews.

This is the first consumer test after Claims. It's judged by the consumer
money line: one paying customer must cost about $8–12 or less in ads.

## Where it lives

- `guest-lodge-backend/trace.js`: page routes, `/api/trace/*`, unlock tokens.
  It's registered in `server.js` next to Inspect.
- `guest-lodge-backend/trace-web/`: `index.html`, `trace.js`, `trace.css`,
  `terms.html`, `pictures/*.svg` (original drawings). These files
  are served only through `trace.js`. They aren't under `public/` and aren't in
  the iOS app.
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
- **No webhook.** The unlock, the `TracePaid` row and Meta's Purchase all
  happen when Stripe returns the buyer to `/trace?paid=…`. Someone who closes
  the tab before returning is still paid in Stripe. They use "Already paid?",
  but Meta never hears about that purchase.

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

Three events go to Meta through the same pixel and CAPI queue as Claims:

| Step | Meta event |
|---|---|
| `TraceStarted` | ViewContent |
| `TraceCheckoutOpened` | InitiateCheckout ($14.99) |
| Confirmed payment | Purchase |

Owner browsers (`?notrack=1`, which uses the same `marketel.noTrack` key as
Claims) and headless browsers are left out.

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
