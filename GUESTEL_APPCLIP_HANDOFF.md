# Guestel App Clip — Handoff

_Last updated: 2026-08-20. Pick up right here._

## Where we are (TL;DR)
The Guestel iOS app + embedded **App Clip** build and sign cleanly and upload to
TestFlight. The clip is now wired to launch from each hotel's **branded
`*.mktel.co` domain** (not bookmarketel.com). Latest build in flight:
`gh run view 32341847339` (dispatched, was uploading to TestFlight at handoff).

## Architecture facts (verified live — don't re-derive)
- **bookmarketel.com → Render** (the `guest-lodge-backend` Express app, Cloudflare in front).
- **`*.mktel.co` (jacksinn / studios17 / marketel-review-inn) → Vercel** (the `hotel-booking-app` React SPA). Each is a hotel's real branded booking engine.
- **AASA is live on all of them:**
  - `https://bookmarketel.com/.well-known/apple-app-site-association` → served by an explicit Express route in `guest-lodge-backend/server.js` (static ignores `.well-known` dotfiles, hence the earlier 404). Returns `{"appclips":{"apps":["YAS2Z7ZY3M.com.bookmarketel.guestel.Clip"]}}`.
  - `https://<hotel>.mktel.co/.well-known/apple-app-site-association` → served by Vercel from `hotel-booking-app/public/.well-known/...`. Same JSON.
- **App Clips do NOT support wildcard associated domains.** So the 3 hotel
  subdomains are listed explicitly in the clip entitlement. Adding hotel #4 = a
  new clip build. If it ever scales large, switch to one `clip.mktel.co/<hotel>`
  router domain.
- **Host → hotel resolution:** `GET https://guest-lodge-backend.onrender.com/api/hotel-context?domain=<host>` returns `{ data: { hotelId } }`. Verified:
  - jacksinn.mktel.co → `hotel-a39be0df`
  - studios17.mktel.co → `hotel-9dbf11ec`
  - marketel-review-inn.mktel.co → `marketel-review-inn`

## The clip flow (as built)
1. Guest opens/scans a link to e.g. `https://jacksinn.mktel.co`.
2. iOS launches the clip; `AppClipApp.target(from:)` reads the invocation **host**
   → `ClipTarget.domain("jacksinn.mktel.co")` (also accepts `?hotelId=` / `/clip/<id>` as fallback).
3. `ClipRootView.load()` → `BookingAPI.hotelId(forDomain:)` → `BookingAPI.hotel(id)`.
4. Shows hotel hero + **Book direct** (opens that hotel's own engine
   `https://jacksinn.mktel.co/` in a `WKWebView`) + `SKOverlay` "Get full app".

## Key files
- `marketel-guestel-ios/GuestelClip/AppClipApp.swift` — `@main`, `ClipTarget` enum, host parsing.
- `marketel-guestel-ios/GuestelClip/ClipRootView.swift` — resolve + hero + Book direct + SKOverlay.
- `marketel-guestel-ios/GuestelClip/GuestelClip.entitlements` — parent-app id + `appclips:` domains (3 hotels + bookmarketel.com).
- `marketel-guestel-ios/GuestelClip/ClipWebView.swift` — minimal WKWebView.
- `marketel-guestel-ios/Guestel/BookingAPI.swift` — added `hotelId(forDomain:)`.
- `marketel-guestel-ios/project.yml` — `GuestelClip` target (`application.on-demand-install-capable`), embedded in `Guestel` app.
- `marketel-guestel-ios/ExportOptions.plist` + `.github/workflows/build-guestel-ios.yml` — dual-profile (app + clip) signing.
- `guest-lodge-backend/server.js` — AASA route (search `apple-app-site-association`).

## Signing (all in place, don't touch)
- Profiles live in `~/apple-marketel-signing/` (mode 700, SENSITIVE — has Apple keys/certs).
  - App: `Marketel_Guestel_App_Store.mobileprovision`
  - Clip: `Marketel_Guestel_Clip_App_Store.mobileprovision` (bundle `com.bookmarketel.guestel.Clip`, parent-linked, wildcard associated-domains capability).
- GitHub secrets set: `APPLE_GUESTEL_PROVISIONING_PROFILE_BASE64`,
  `APPLE_GUESTEL_CLIP_PROVISIONING_PROFILE_BASE64`, distribution cert + ASC key secrets.

## Build / deploy commands
```bash
# Rebuild + upload clip to TestFlight
gh workflow run build-guestel-ios.yml --ref main -f upload_to_testflight=true

# Watch latest
RID=$(gh run list --workflow=build-guestel-ios.yml --branch main --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RID" --exit-status

# Backend (bookmarketel.com) auto-deploys on push to main (~60-90s).
```

## Web "Add" button → App Clip card (no QR)
A link to Apple's default App Clip URL **is** a supported invocation — iOS renders
the card from that navigation (there's no JS `presentAppClipCard()`, but a `<a href>`/
`location.href` to the link works). Implemented:
- `hotel-booking-app/src/appClipInstall.js` — `guestelAppClipUrl()` builds
  `https://appclip.apple.com/id?p=com.bookmarketel.guestel.Clip&domain=<host>`
  (or `&hotelId=` off-brand-domain). `APP_CLIP_INSTALL_ENABLED` flag (default **false**).
- `hotel-booking-app/src/GuestInstallCard.jsx` — the "Add" button's iOS path uses the
  App Clip link when the flag is on; else the existing PWA coach.
- Clip `AppClipApp.target(from:)` now reads `domain`/`hotelId` query params (the Apple
  link's host is appclip.apple.com, not the hotel domain).

**To turn it on:** (1) publish a **default App Clip experience** in App Store Connect
(the appclip.apple.com link errors until then), (2) set `APP_CLIP_INSTALL_ENABLED = true`
and redeploy the engine. Optional stronger variant: Smart App Banner meta
(`apple-itunes-app … app-clip-bundle-id=… app-clip-display=card`) on a dedicated `/add`
page — needs the numeric App Store app-id.

## NEXT STEPS (in order)
1. **Confirm build 32341847339 finished** and the build appears under Guestel →
   TestFlight in App Store Connect (Apple processing takes a few min).
2. **Test the clip on-device without ASC config:** Settings → Developer →
   App Clips Testing → **Local Experience** → URL prefix `https://jacksinn.mktel.co`,
   bundle id `com.bookmarketel.guestel.Clip`. Scan a QR/NFC/link to that URL → clip launches.
3. **Register real App Clip Experiences** in App Store Connect (Guestel → the build →
   App Clip): one **Advanced Experience per hotel URL** (`https://jacksinn.mktel.co`, etc.)
   so each shows that hotel's own card art/title/subtitle. (Default experience = one
   generic card; Advanced = per-hotel.)
4. **Generate App Clip Codes** (Apple's branded QR) per hotel for front-desk/door/email.

## Deferred / backlog (from earlier, not blocking)
- Real hotel photos on the Wallet cards (currently gradient + first room image).
- Wire Message/Share buttons (Share = native share sheet, easy).
- Resolve dead Account/Profile buttons before App Store review.
- Email login.
- Custom swipe-down fade dismiss on the docked sheet (needs a non-system sheet).
- Reconcile `main` vs `live-activities` branch for Front Desk (see memory).
