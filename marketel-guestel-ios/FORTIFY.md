# Guestel — Fortification handoff (for Codex)

_Last pass: 2026-08-20 by Claude. This is a "make it real, then hand off to fortify again" doc._

_Fortification pass: 2026-08-20 by Codex._

## Current release state (supersedes the older backlog below)

Guestel is no longer a local demo wallet or a webview wrapper. This pass added:

- Native pay-later checkout using `/api/complete-pay-later-booking`, with the
  backend's availability identifiers and a fail-closed sold-out check.
- Saved Stripe cards inside the actual booking PaymentSheet.
- Signed per-reservation capabilities plus email-code wallet recovery across
  phones. Reservation status refreshes from Front Desk instead of trusting only
  localStorage/UserDefaults.
- Native SwiftUI guest ↔ Front Desk conversations and APNs registration/routing.
- App Clip → full-app hotel handoff through `group.com.bookmarketel.guestel`.
- One scalable invocation URL family: `https://clip.mktel.co/clip/<hotelId>`.
- A real empty state, production demo-data removal, device-data clearing, and a
  privacy manifest. PWA remains the Android/no-native fallback.

### Manual Apple/hosting steps before the new native build can sign

1. In Apple Developer, enable **Push Notifications** and **App Groups** for
   `com.bookmarketel.guestel`.
2. Enable **App Groups** for `com.bookmarketel.guestel.Clip`, and attach both App
   IDs to `group.com.bookmarketel.guestel`.
3. Regenerate both App Store distribution profiles, replace
   `APPLE_GUESTEL_PROVISIONING_PROFILE_BASE64` and
   `APPLE_GUESTEL_CLIP_PROVISIONING_PROFILE_BASE64` in GitHub Actions, then run
   `build-guestel-ios.yml`.
4. Set Render `GUEST_IDENTITY_SECRET` to a new high-entropy secret and set
   `GUESTEL_APNS_BUNDLE_ID=com.bookmarketel.guestel`. The existing APNs team key
   can sign for both apps if it is an Apple Push Notification service key.
5. Point `clip.mktel.co` at the Vercel booking-engine deployment, publish the App
   Clip default/advanced experience, verify its card on an iPhone, and only then
   set Vercel `VITE_GUESTEL_APP_CLIP_ENABLED=true`.
6. Keep Stripe in test mode for this QA pass, exactly as requested. Switch the
   matching secret and publishable keys together only after the full test matrix.

The new Prisma migration is
`20260820090000_guestel_identity_and_push`; Render's existing start command runs
`prisma migrate deploy` automatically.

Guestel is a native SwiftUI guest wallet app (companion to Marketel Front Desk).
Two tabs: **Hotels** (Apple-Wallet card stack + docked booking sheet) and **Account**.
It books against the real backend `guest-lodge-backend` (Render) — the same engine
the web booking sites (`*.mktel.co`, Vercel) and Front Desk use. I can't compile
locally (no Mac); every build is the GitHub Actions workflow `build-guestel-ios.yml`.

## Stripe configuration
The `$1 hold` failed because the app's Stripe **publishable** key was from a
different account (`51NymOI`) than the backend's **secret** key (`51SPnS1E`).
Fixed by serving the key from the backend. This fortification pass added the
matching **test** publishable key as a backend-owned fallback, guarded by an
account/mode comparison with `STRIPE_SECRET_KEY`, so test payments no longer go
offline solely because the Render env value is absent. Still set the env var so
key rotation stays configuration-only:

- In **Render** (guest-lodge-backend) and local `guest-lodge-backend/.env`:
  `STRIPE_PUBLISHABLE_KEY=pk_test_51SPnS1E…`
  — the pk that matches `STRIPE_SECRET_KEY`. It's the SAME value already in
  Vercel as `VITE_STRIPE_PUBLISHABLE_KEY` (copy it over). Switch test→live by
  swapping both secret+publishable together.
- Verify: `curl https://guest-lodge-backend.onrender.com/api/stripe-config`
  must return a non-empty `publishableKey`.

Live mode has no fallback: switch `STRIPE_SECRET_KEY` and
`STRIPE_PUBLISHABLE_KEY` together.

The app fetches it at launch via `StripeConfig.ensureLoaded()` and before every
payment. If it's empty, payments show "Payments aren't available right now."

## What this pass changed
### Fortification follow-up
- Backend refuses to serve a Stripe publishable key unless its mode and account
  prefix match `STRIPE_SECRET_KEY`; the matching test key is a backend-owned
  fallback, while live mode still requires both env values.
- Saved cards are no longer addressable by email. A signed, expiring capability
  scopes one device to one Stripe customer, is stored in iOS Keychain, and is
  required to list/detach cards. Detach verifies ownership; all routes are limited.
- Confirmed `STPAPIClient.apiVersion` exists in Stripe iOS 26 and resolves to
  `2020-08-27`; the backend now uses that value as its safe fallback.
- `BookingAPI` now rejects non-2xx responses and exposes server errors instead of
  silently turning failures into empty data.
- Add Hotel now resolves and persists a real booking domain. Wallet cards refresh
  live hotel names/photos, and Message deep-links to the selected native stay.
- Replaced the dead `/support` link with a dedicated Guestel support page.

### Payments (bug fix)
- Backend `GET /api/stripe-config` → `{ publishableKey, mode }`.
- App `StripeConfig.swift` installs it into `STPAPIClient`. Removed the hardcoded
  wrong-account key from `GuestelApp.swift`.
- `HotelSheet` + `RebookView` now `await StripeConfig.ensureLoaded()` before creating
  the hold, so PaymentSheet is always keyed to the right account.

### Account tab (was mostly dead)
- `AccountView.swift` — big **left-aligned name** (34pt, no profile picture), taller
  card-style rows, each a `NavigationLink` (full-screen push, not a short sheet).
- `AccountScreens.swift` — four real screens:
  - **PersonalInfoView** — edits name/email/phone → `store.saveGuest`.
  - **NotificationsView** — `@AppStorage` toggles + requests push permission.
  - **HelpView** — FAQ disclosures + Contact support (opens `bookmarketel.com/support`).
  - **PaymentMethodsView** — lists saved cards and adds one via a Stripe
    **SetupIntent** (PaymentSheet in setup mode, saved to a customer keyed by email).
- Backend added: `POST /api/guest/setup-intent`, `GET /api/guest/payment-methods`,
  `POST /api/guest/detach-payment-method` (customer found/created by email).

### HotelSheet actions
- **Share** → native `ShareLink` (hotel booking URL).
- **Message** → opens `https://<hotel-domain>/guest/messages` in `SimpleWebSheet`.

## VERIFY THESE ON A REAL DEVICE (I could not)
1. **Ephemeral key runtime.** Source verification confirms
   `STPAPIClient.apiVersion` exists in Stripe iOS 26 and is `2020-08-27`; confirm
   PaymentSheet loads the returned customer on a real device.
2. **$1 hold end-to-end** after `STRIPE_PUBLISHABLE_KEY` is set: HotelSheet →
   Confirm · $1 hold → PaymentSheet → book. Should no longer error.
3. **Add card → list → delete** round-trips against the customer.
4. Message web sheet actually opens the correct native-booked stay. The deployed
   `/guest/messages` route returns 200 and the app now supplies `?stay=<code>`.

## STILL TO FORTIFY (next pass)
- **Native messaging (priority).** `Message` currently just opens `SimpleWebSheet`
  (an in-app browser of `/guest/messages`) — a stopgap, not real. Build a native
  SwiftUI messages screen (mirror `hotel-booking-app/src/GuestMessagesPage.jsx` +
  `guestMessaging.jsx`), threaded to the reservation, reusing whatever thread API
  Front Desk uses. It should thread with the front desk, not render a webview.
- **Deep integration** with Front Desk + the Front Desk Assistant: right now the app
  only reads reservations the web engine wrote (via `BookingWebView`'s localStorage
  bridge) and books holds. Wire real 2-way messaging + an in-app assistant.
- **Reservation source of truth**: reservations live only in `UserDefaults` +
  the web localStorage bridge. Move to a backend guest identity (email/login) so a
  stay follows the guest across devices. There's no auth yet.
- **Email/login** for the guest (Account has no sign-in).
- Broader error/empty/offline states and explicit retries outside payment methods.
- Live Stripe keys before launch.
- App Store review needs: no dead ends, privacy answers, etc.

## Build / deploy
CI uses `project-ci.yml` to point XcodeGen at the pinned Stripe 26.0.0 source
archive. Do not switch it back to SwiftPM's remote repository in CI: fresh
macOS runners spent the full 30-minute job timeout cloning that repository
without ever reaching compilation.

```bash
# iOS build → TestFlight
gh workflow run build-guestel-ios.yml --ref main -f upload_to_testflight=true
RID=$(gh run list --workflow=build-guestel-ios.yml --branch main --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RID" --exit-status
# Backend auto-deploys on push to main (Render, ~60-90s).
```

## Reference: the guest PWA (design/behavior parity)
`hotel-booking-app/src/GuestHomePage.jsx`, `GuestMessagesPage.jsx`,
`ConfirmationPage.jsx`, `GuestProvider.jsx`, `guestPushNotifications.js` — the
existing web "Guestel-like" guest experience. Mirror its behavior where the native
app is thinner. Routes: `/guest/home`, `/guest/messages`.
