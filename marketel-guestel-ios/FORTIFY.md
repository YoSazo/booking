# Guestel — Fortification handoff (for Codex)

_Last pass: 2026-08-20 by Claude. This is a "make it real, then hand off to fortify again" doc._

Guestel is a native SwiftUI guest wallet app (companion to Marketel Front Desk).
Two tabs: **Hotels** (Apple-Wallet card stack + docked booking sheet) and **Account**.
It books against the real backend `guest-lodge-backend` (Render) — the same engine
the web booking sites (`*.mktel.co`, Vercel) and Front Desk use. I can't compile
locally (no Mac); every build is the GitHub Actions workflow `build-guestel-ios.yml`.

## ⚠️ ONE REQUIRED CONFIG (payments are dead without it)
The `$1 hold` failed because the app's Stripe **publishable** key was from a
different account (`51NymOI`) than the backend's **secret** key (`51SPnS1E`).
Fixed by serving the key from the backend. **You must set the env var:**

- In **Render** (guest-lodge-backend) and local `guest-lodge-backend/.env`:
  `STRIPE_PUBLISHABLE_KEY=pk_test_51SPnS1E…`
  — the pk that matches `STRIPE_SECRET_KEY`. It's the SAME value already in
  Vercel as `VITE_STRIPE_PUBLISHABLE_KEY` (copy it over). Switch test→live by
  swapping both secret+publishable together.
- Verify: `curl https://guest-lodge-backend.onrender.com/api/stripe-config`
  must return a non-empty `publishableKey`.

The app fetches it at launch via `StripeConfig.ensureLoaded()` and before every
payment. If it's empty, payments show "Payments aren't available right now."

## What this pass changed
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
1. **Ephemeral key api version.** `PaymentMethodsView.addCard()` passes
   `STPAPIClient.apiVersion` to `/api/guest/setup-intent`. Confirm that symbol
   exists in Stripe iOS 26 and that the ephemeral key it creates matches the SDK
   (else PaymentSheet errors loading the customer). Backend default is `2024-06-20`.
2. **$1 hold end-to-end** after `STRIPE_PUBLISHABLE_KEY` is set: HotelSheet →
   Confirm · $1 hold → PaymentSheet → book. Should no longer error.
3. **Add card → list → delete** round-trips against the customer.
4. Message web sheet actually lands on the hotel's messaging (route `/guest/messages`
   assumes the guest portal is reachable unauthenticated or handles login).

## STILL TO FORTIFY (next pass)
- **Deep integration** with Front Desk + the Front Desk Assistant: right now the app
  only reads reservations the web engine wrote (via `BookingWebView`'s localStorage
  bridge) and books holds. Wire real 2-way messaging + an in-app assistant.
- **Reservation source of truth**: reservations live only in `UserDefaults` +
  the web localStorage bridge. Move to a backend guest identity (email/login) so a
  stay follows the guest across devices. There's no auth yet.
- **Email/login** for the guest (Account has no sign-in).
- Real hotel photos on the wallet cards (currently gradient + first room image).
- Error/empty/offline states across all network calls; retries.
- Live Stripe keys before launch.
- App Store review needs: no dead ends, privacy answers, etc.

## Build / deploy
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
