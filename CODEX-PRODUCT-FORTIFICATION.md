# Codex handoff — Marketel product review & fortification

> **For Codex:** Read this end-to-end before changing product copy, money paths, or the two-sided app story. This is a founder + codebase audit (Aug 2026, updated after Guestel + native Front Desk ship). Companion docs: `GUESTEL.md` (guest wallet thesis), `OPUS-JUMP-GUIDE.md` (UX/IA), `DESIGN-HANDOFF.md` (tokens), `marketel-frontdesk-ios/app-store/submission-checklist.md` (Front Desk iOS ship), `marketel-guestel-ios/FORTIFY.md` (Guestel release QA).
>
> **Do not reopen the product thesis.** Fortify money integrity, one pricing truth, paired owner/guest language, and unfinished surface craft. Ads start only after Front Desk is live on the App Store, `MARKETEL_FRONTDESK_APP_STORE_URL` is set, and Guestel review/TestFlight QA is green enough not to contradict the owner pitch.

---

## 0. Master prompt (paste to Codex)

```
Read CODEX-PRODUCT-FORTIFICATION.md end-to-end.
Also skim GUESTEL.md §3–§5 (keeper-not-finder, one guest vessel, web-first booking),
OPUS-JUMP-GUIDE.md §1 (paired journey, stay-first confirmation),
and marketel-frontdesk-ios/app-store/submission-checklist.md.

Context:
- Product: Marketel — direct booking SaaS for independent hotels/lodges at $199/mo.
- Goal: $18k cash collected (not MRR) after iOS Front Desk is live, then Meta ads.
- Funnel: landing.html → setup.html → Front Desk reveal → go live (Stripe) → activated modal → Download Front Desk.
- Thesis: acquire (direct page) → retain (Guestel wallet + optional App Clip) → defend (Front Desk + Assistant).

Your job when asked to implement:
1. Prefer P0 fortifications in §4 before polish.
2. Never leave dual pricing ($997 vs $199) or dual-app mush ("install"/"phones" without naming which app).
3. Confirmation: stay trust FIRST, guest install/keep SECOND.
4. Activated modal: never "coming soon" after pay once App Store URL exists.
5. Guest path is layered: web booking (no install) → Guestel/App Clip for repeat guests. Do not gate first booking behind app install.
6. Guestel is the native guest wallet (SwiftUI + App Clip). PWA/Home Screen remains Android/no-native fallback, not the primary iOS story.

If only asked to plan: output ordered fix list with file paths. Do not expand scope into new features.
```

---

## 1. Verdict (honest)

**The product is strong enough to test seriously for the $18k cash goal.** The result is not guaranteed by the code or funnel; the decision sequence is Front Desk App Store live → Guestel TestFlight/review green → store URL on activated modal → full production smoke test → proven Booking.com / 60s ad as control → Assistant as challenger. PWA-only cold ads and Airbnb are not the initial angles.

**Product thesis is well designed and now has native execution on both sides.** Acquire → retain → defend matches how independents operate, and Guestel gives the retain leg a real iOS wallet instead of only Add-to-Home-Screen hope.

**Craft is converging but still uneven in places.** Reveal, Guest Reach, checkout desktop layout, and native Front Desk messaging/assistant are much closer to the thesis. Remaining drift is mostly copy seams (PWA vs Guestel vs App Clip), Guestel distribution setup, and a few beta-smell surfaces.

**$199/mo is a good price** for 8–30 room independents. Lock landing, Terms, reveal, and ads to that one number.

---

## 2. What Marketel is

Not a booking widget. A **paired app system on one property:**

| Who | Home-screen app | Job |
|-----|-----------------|-----|
| Guest (Devon) | **Guestel** (native iOS wallet + App Clip) with web booking as first touch | Save hotel, rebook direct, pay one-tap, message desk |
| Owner (Maya) | **Marketel Front Desk** (web + Capacitor iOS) | New bookings, reply, inventory, get buzzed |

**Guest path is layered, not either/or:**
1. **Web booking** (`*.mktel.co`) — frictionless first booking, no install gate.
2. **Guestel App Clip** (`clip.mktel.co/clip/<hotelId>`) — instant in-context save/book on iOS.
3. **Guestel full app** — wallet of saved hotels, saved cards, native messaging, push.
4. **PWA / Add to Home Screen** — Android and no-native fallback only; not the primary iOS pitch anymore.

**Third leg — Front Desk Assistant:** Twilio SMS plus native in-app assistant in Front Desk iOS. It asks about outside reality (OTA / walk-in / phone booking), can answer read-only questions (“what’s available tomorrow?”), and can update Marketel availability from a reply, with CANCEL/KEEP on conflict and a short undo window.

**Stack (short):**
- `hotel-booking-app/` — React guest booking web engine + PWA fallback
- `marketel-guestel-ios/` — native SwiftUI guest wallet + App Clip (`com.bookmarketel.guestel`)
- `guest-lodge-backend/` — Express/Prisma monolith, `landing.html`, `setup.html`, Front Desk build
- `guest-lodge-backend/frontdesk/` — Vite vanilla JS Front Desk source → `public/frontdesk/`
- `marketel-frontdesk-ios/` — Capacitor iOS owner companion (`com.bookmarketel.frontdesk`)

**Funnel spine:**
`Ad → landing.html → setup.html → /frontdesk?...&welcome=1&reveal=1 → go live (Stripe) → activated modal → Download Front Desk`

Reveal now walks **Booking page → Guestel → Front Desk → Activate** so Front Desk reads as the owner app, not just an editor. Post-activation tour ends on **Guest Reach / Guestel**.

Activated modal uses real App Store link when `MARKETEL_FRONTDESK_APP_STORE_URL` is set; otherwise honest **Open Web Front Desk** primary (`frontdesk/src/settings.js` → `showActivatedModal`).

**Founder sequence (locked):** Front Desk Apple live → Guestel profiles/AASA/TestFlight green → set store URL → smoke full funnel → then ads. Do not run ads into a coming-soon climax or a Guestel story that isn’t shippable yet.

---

## 3. System design vs surface design (indepth)

### System design (strong)
Invisible architecture: jobs, money/inventory flows, paired guest/owner journeys. Holds, approval windows, CRM stages, Assistant, guest messaging, fulfillment outbox — operator-real, not calendar cosplay.

### Surface design (uneven)
What people see/hear: one price, one vocabulary, one visual language, calm errors, finished empty states. Still carries fossils from earlier pricing and prototype UX.

| Layer | Today |
|-------|--------|
| Jobs / loop | Clear |
| Domain model | Thoughtful |
| Funnel spine | Real + recovery emails |
| Native owner shell | Front Desk iOS 3.27 with native messaging + assistant |
| Native guest shell | Guestel SwiftUI + App Clip shipped in repo |
| One price everywhere | Locked to $199/mo on canonical funnel |
| Paired owner/guest vocabulary | Mostly locked; PWA fallback copy still leaks in places |
| One visual + error language | Much improved on guest checkout + desktop booking |
| Climax screens (confirm, activated, reveal) | Activated + reveal much stronger; Guestel distribution still manual |

**“As designed as the thesis” means convergence, not more features:**
1. One price ($199/mo) on every public surface, matching Terms.
2. Three named products always: **Front Desk** (owner), **Guestel** (guest wallet), **web booking page** (first touch).
3. Confirmation: stay proof first; Guestel/App Clip/Home Screen second, one guest benefit.
4. Activated modal: real Download or honest web path — never coming soon after Stripe.
5. Same brand tokens + in-UI errors on guest and owner; no `alert()`, no Bootstrap blue islands.
6. Room card price story = checkout price story (taxes).

---

## 4. Two-app language & paired journey (indepth)

### The failure mode
Guests and owners share vague words — **“install”**, **“phones”**, **“bookings”**, **“app”** — without a clear paired journey. Maya downloads Front Desk and still cannot explain Guestel vs the booking page to a walk-in.

### Same words, different objects

**Install / save**
- Guest first touch: book on the property’s **web page** (no install).
- Guest repeat: **Get [Hotel] in Guestel** (App Clip or full app) — one perceived action.
- Guest fallback: **Add to Home Screen** on Android or when native isn’t available.
- Owner: **Download Marketel Front Desk** from the App Store.

**Phones / Guest Reach tab**
Often mixes three meanings:
1. Owner putting Front Desk on her phone
2. Guests keeping the hotel in **Guestel**
3. Assistant “connected phones” (SMS recipients)

**Bookings**
- Guest: reservation trust (“am I confirmed?”)
- Owner: CRM inbox (needs call, notes, approval)

### Paired journey (required mental model)

Every seam has a guest side and owner side with the **same promise**:

| Seam | Guest | Owner |
|------|--------|--------|
| After pay | “I’m reserved; here’s my stay” | “They’re on the books” |
| Keep / rebook | “Save **this hotel** in Guestel” | “Guests keep **{Hotel}** in Guestel — not Marketel” |
| QR at desk | Scan → book / save in Guestel | “Scan for *your* reservation” |
| Message | “Message the front desk” | Same thread in Front Desk (native on iOS) |

Copy must lock these together. Guest Reach now edits the **Guestel wallet card**; older surfaces still mention Home Screen in fallback/help copy.

### Confirmation = conversion poison when inverted
After pay/hold, Devon’s only question is **“Did it work? Do I have a room?”** (stay trust). Guestel/App Clip is optional and second.

If confirmation pushes app install before stay details are undeniable, it reads as “we got your card — now install something” at the scam-vs-real moment. **Stay first, keep-in-Guestel second** (`OPUS-JUMP-GUIDE.md` D4).

### Shipping iOS without fixing the explanation
Front Desk App Store completes **owner** half. Guestel completes **repeat-guest** half. Maya needs one sentence:

> “Guests book on our link or save us in **Guestel**. *I* use **Front Desk** for bookings and alerts.”

Until reveal / Guest Reach / QR / activated modal train that sentence, iOS alone does not close the retain loop.

See also `OPUS-JUMP-GUIDE.md` §1, §1B, §1E and `GUESTEL.md` §3–§5.

---

## 5. Ads (for context; don’t expand product for creative)

**Proven control spine:** OTA guilt → 3 min build / 60s book → works with hand reservations → free to try → “stop giving Booking.com free money.” Screen recording + floating facecam.

**Challenger:** Front Desk Assistant / “won’t mess up phone, walk-in, or Booking.com reservations — texts you when something’s at risk.”

**Do not lead cold with PWA or Guestel install** — retention proof, not cold hook. OK as a line inside control or retarget. Lead cold with direct booking + OTA savings.

**Park Airbnb cold ads** — wrong ICP + ToS/brand risk. Product is hotel/lodge Front Desk.

**Cash math:** $18k requires 91 × $199 monthly first payments before refunds, fees, or taxes. Annual payments can shorten the calendar, but activation (Front Desk install + first booking) still matters for month-2 cash.

---

## 6. Fortification list (read-only audit — prioritized)

### P0 — Fix before scaling ads

| Issue | Where | Why | Status |
|-------|--------|-----|--------|
| Client sets Stripe charge amount; server never recomputes from rates | `server.js` payment/book routes | Underpay a stay | **Fixed Aug 2026** — server-priced quotes |
| Guest Stripe webhook: incomplete backup + always ACK 200 | `payment_intent.succeeded` handler | Paid guest, no DB row | **Fixed Aug 2026** — idempotent recovery + 5xx on hard fail |
| Pricing story split: $997 one-time vs $199/mo | `landing-page/index.html` vs canonical funnel | Bait-and-switch | **Fixed Aug 2026** — redirect to $199 funnel |
| Post-pay CTA “Front Desk app coming soon” | `frontdesk/src/settings.js` | Dead button after Stripe | **Fixed** — App Store or web primary |
| App Review notes placeholders | `marketel-frontdesk-ios/app-store/` | Review fail | **Fixed** — `review-notes.md`, `review-notes-2.1-merged.txt`, `guestel-review-notes.txt` |
| Setup token never cleared after complete/go-live | `HotelConfig.setupToken` | Leaked token = durable write | **Fixed Aug 2026** — rotated after handoff |
| Guestel Apple signing / AASA / profiles not live | `marketel-guestel-ios/FORTIFY.md` | Native guest story blocked on device | **Manual — in progress** |
| Guestel + Front Desk both need production smoke on real devices | TestFlight matrices | Ads into broken retain loop | **Manual before ads** |

### P1 — Reliability / unfinished feel

| Issue | Where | Why | Status |
|-------|--------|-----|--------|
| Ephemeral signing secrets if env missing | CRM return / magic / native session boot | Render restart invalidates links | Open — verify prod env |
| Cloudbeds confirm-before-DB + webhook backup race | `/api/book` + webhook | Possible double PMS reservation | Open |
| Pay-later: PMS/hold OK, DB fail still returns success | BookingCenter pay-later path | Hold exists; Front Desk never sees booking | **Partially fixed** — metadata + reconciliation sweep |
| Account deletion doesn’t release active $1 holds | Deletion sweep | Card holds linger | **Fixed Aug 2026** |
| Deletion can cancel sibling Stripe subs (same email) | Deletion handler | Multi-property owner loses billing | **Fixed Aug 2026** — property-scoped cancel |
| Guestel vs PWA vs App Clip copy fights itself | `apps.js`, reveal, booking banners, landing FAQ | Mixed “no App Store” / “Guestel” / “Home Screen” | **Mostly fixed — spot-check seams** |
| Room cards omit tax; checkout adds ~10% | Booking vs checkout | Looks like pricing bug | **Fixed Aug 2026** |
| Checkout/calendar failures use `alert()` | Guest app | Prototype-grade | **Fixed Aug 2026** on blocking paths |
| PIN hash falls back to unkeyed SHA-256 | Missing `CRM_PIN_HASH_SECRET` | Crackable PINs | Open if env missing |
| `forgot-pin` has no rate limit | `/api/forgot-pin` | Reset spam | **Fixed Aug 2026** |
| Go-live success puts pin/returnToken in URL | `go-live-success` redirect | Leak via history / Referer | **Fixed Aug 2026** — fragment handoff |
| Thin tests — no book/hold/webhook coverage | `guest-lodge-backend/test/` | Money regressions | **Improved** — guest-access, funnel-recovery, guest-app-contract, payment-access tests added |
| Stripe publishable/secret key mismatch for Guestel | Render `STRIPE_PUBLISHABLE_KEY` + `/api/stripe-config` | $1 hold fails on device | **Fixed in code** — verify Render env |
| Funnel drop-off after setup/checkout | `send-comeback-emails.js`, setup resume | Lost leads | **Added Aug 2026** — setup resume + checkout recovery emails |

### P2 — Beta smell (not ship blockers)

- Bootstrap blue leftovers on a few guest controls (Edit button, some calendar accents) — mostly green now on booking desktop
- Empty rooms → “Coming Soon” + emoji on guest site
- Phones / Guest Reach naming still mixed with legacy “Home Screen link” helper copy
- BookingCenter defaults to **test** SOAP URLs
- Hardcoded Stripe product ID fallback (`prod_Uls6…`)
- In-memory rate limits reset on Render wake
- Guest messaging: email optional if reservation code known
- `server.js` ~13k-line monolith (debt)
- Guestel FORTIFY.md still lists some items now shipped (native messaging) — treat FORTIFY as release checklist, not backlog truth

### Not half-assed (don’t “fix” what works)
Manual inventory `pg_advisory_xact_lock`, Marketel go-live Stripe verification, account deletion owner gate + 7-day grace, live `/privacy` `/terms` `/app-support`, Assistant safety rules (verify phone, CANCEL/KEEP, undo window, read-only questions). Front Desk iOS native messaging + assistant. Guestel wallet, App Clip handoff, signed guest identity, saved-card checkout. Desktop/tablet booking + checkout two-column layout at 768px+. iOS `npm run verify:release` passing for Front Desk.

---

## 7. If Codex only hardens five things before ads

1. **Guestel distribution complete** — App Groups, AASA on `clip.mktel.co`, regenerated profiles, TestFlight device QA (`marketel-guestel-ios/FORTIFY.md`).
2. **Production secrets stable** — no ephemeral signing secrets; `GUEST_IDENTITY_SECRET`, Stripe live keys, APNs envs set on Render.
3. **Full funnel smoke on real devices** — setup → reveal → go live → Front Desk download → guest web book → Guestel/App Clip save → message → approve in Front Desk.
4. **`MARKETEL_FRONTDESK_APP_STORE_URL`** on activated modal after Apple publishes Front Desk.
5. **Copy seam pass** — one sentence for Maya: web book first, Guestel for repeat, Front Desk for owner. Kill leftover PWA-primary iOS copy where Guestel is the story.

Then: live Stripe verification, production migrations, and ad creative using the proven Booking.com control.

### Implementation update — Aug 12, 2026

This status supersedes the original read-only findings above:

- Server-priced booking quotes now own dates, nights, subtotal, tax, and total for new guest PaymentIntents; the obsolete client-priced half-total intent was removed.
- Standard-payment webhook recovery is idempotent for manual inventory, rejects legacy underpayment, returns 5xx on unsafe failure, and ignores unrelated Stripe intents.
- BookingCenter/Cloudbeds pay-later confirmations are written to Stripe metadata before the database write; a reconciliation sweep can restore a missing Front Desk row without booking the PMS twice.
- The alternate `$997` public landing now redirects to the canonical `$199/month` funnel.
- Completed setup credentials rotate after the reveal handoff; return credentials moved from query strings to URL fragments.
- Account deletion now releases active `$1` holds and cancels only the property-scoped Stripe subscription.
- Forgot-PIN is rate-limited, new setup PINs use the keyed hash path, the open browser-diagnostics endpoint was removed, availability is rate-limited, guest room cards include tax, and blocking guest `alert()` calls were replaced with in-page feedback.
- The activated screen has a working web fallback when the App Store URL is not configured; after Apple publishes the listing, `MARKETEL_FRONTDESK_APP_STORE_URL` remains a required manual Render setting.
- Owner/guest vocabulary is now locked in the live UI: owners download **Marketel Front Desk** from the App Store; guests save the **property** from its booking page to their Home Screen. The former Guest App tab is **Guest Reach**, and the Availability screen permanently explains the walk-in rule.
- Still manual before App Review/ads: stable distinct production secrets, App Review demo credentials/screenshots, Apple/APNs credentials, App Store URL, live Stripe object verification, production migrations, and device smoke testing.

### Implementation update — Aug 23, 2026 (post-pull)

This status supersedes guest-side assumptions from Aug 12 where they conflict:

**Guestel (native guest wallet)**
- New `marketel-guestel-ios/` SwiftUI app + App Clip (`com.bookmarketel.guestel` / `.Clip`).
- Wallet card stack, native rebooking, Stripe $1 hold via backend-owned publishable key, saved cards, account deletion, APNs.
- App Clip invocation: `https://clip.mktel.co/clip/<hotelId>` with handoff to full app via App Group.
- App Store materials: `guestel-description.txt`, `guestel-review-notes.txt`.
- Product spec: `GUESTEL.md`. Release QA: `FORTIFY.md`.

**Front Desk iOS + web**
- Native SwiftUI messaging (`NativeMessages.swift`) and native assistant sheet (`NativeAssistant.swift`) — “ask it anything” beyond SMS.
- Front Desk iOS release bumped to **3.27**.
- Reveal reframed: progress **Booking page → Guestel → Front Desk → Activate**; framing bridge so Front Desk reads as the owner app.
- Guest Reach edits Guestel wallet card (cover + tagline); post-activation tour ends on Guestel.
- Assistant SMS copy improved; read-only inventory/status questions supported (`FRONTDESK_ASSISTANT.md`).

**Guest web booking**
- Desktop/tablet two-column layout from **768px** (room left, dates/book rail right; checkout rail on payment step).
- Install banner tells Guestel story in owner preview; desktop install card under room content.
- App Clip hooks in web (`appClipInstall.js`, AASA on property domains).
- Checkout polish: policy banner placement, Inter font on Back/Edit buttons, unpaid-hotel call gate on payment sheet only.

**Backend / funnel**
- Guest identity + wallet persistence (`guest-access.js`, `guest-payment-access.js`, Prisma migrations).
- Funnel recovery: setup resume email, preview-ready email, checkout recovery (`funnel-recovery.test.js`).
- Secure setup resume (no duplicate properties on re-start); magic login scoped without mutating staff PINs.
- Expanded test coverage: guest-access, guest-app-contract, guest-payment-access, funnel-recovery, frontdesk-assistant.

**Still manual before ads**
- Guestel provisioning profile swap + TestFlight matrix on physical iPhone.
- `GUEST_IDENTITY_SECRET`, `GUESTEL_APNS_BUNDLE_ID`, live Stripe key pair together.
- `VITE_GUESTEL_APP_CLIP_ENABLED=true` only after App Clip card verified on device.
- Front Desk + Guestel App Review submissions with attached screen recordings.

---

## 8. iOS / App Store checklist pointer

**Front Desk:** `marketel-frontdesk-ios/app-store/submission-checklist.md`, `review-notes.md`, `review-notes-2.1-merged.txt`.

**Guestel:** `marketel-guestel-ios/FORTIFY.md`, `app-store/guestel-review-notes.txt`, `app-store/guestel-description.txt`. CI: `.github/workflows/build-guestel-ios.yml`.

Must before Submit (both apps): App IDs + Push + App Groups + Associated Domains, certs/profiles regenerated, APNs on Render, GitHub Actions secrets, demo credentials in App Store Connect (not repo), screen recordings attached, device QA on physical iPhone.

Bundle IDs: `com.bookmarketel.frontdesk` (owner), `com.bookmarketel.guestel` + `com.bookmarketel.guestel.Clip` (guest). App Group: `group.com.bookmarketel.guestel`.

---

## 9. File index (high traffic)

| Area | Path |
|------|------|
| Guest booking web | `hotel-booking-app/src/` |
| Guestel native app | `marketel-guestel-ios/Guestel/`, `GuestelClip/` |
| Guestel product spec | `GUESTEL.md` |
| Guestel release QA | `marketel-guestel-ios/FORTIFY.md` |
| Front Desk source | `guest-lodge-backend/frontdesk/src/` (build → `public/frontdesk/`) |
| Reveal + activation | `guest-lodge-backend/frontdesk/src/reveal.js`, `settings.js` |
| Guest Reach / Guestel card | `guest-lodge-backend/frontdesk/src/apps.js` |
| Backend / webhooks / setup | `guest-lodge-backend/server.js` |
| Guest identity API | `guest-lodge-backend/guest-access.js`, `guest-payment-access.js` |
| Schema | `guest-lodge-backend/prisma/schema.prisma` |
| Ad landing (current funnel) | `guest-lodge-backend/landing.html` |
| Alternate marketing landing | `landing-page/index.html` (redirects to canonical funnel) |
| Setup wizard | `guest-lodge-backend/setup.html` |
| Assistant | `guest-lodge-backend/frontdesk-assistant.js`, `FRONTDESK_ASSISTANT.md` |
| Front Desk iOS shell | `marketel-frontdesk-ios/` (native messaging + assistant in `ios/App/App/`) |
| Product fortification brief | `CODEX-PRODUCT-FORTIFICATION.md` (this file) |
| UX brief | `OPUS-JUMP-GUIDE.md` |
| Design tokens debt | `DESIGN-HANDOFF.md` |

---

## 10. Explicit non-goals (unless founder asks)

- Rebuilding Guestel as Expo/RN (already native SwiftUI)
- Leading ads with Airbnb ICP
- Reopening “is $199 right?” — yes it is; lock it
- Expanding PMS parity before distribution + copy fortification
- Running ads before Front Desk App Store URL is live and Guestel TestFlight QA is credible
- Making Guestel an OTA / hotel discovery marketplace (`GUESTEL.md` §3 guardrail)

---

*Audit compiled from full-repo review (guest-lodge-backend, hotel-booking-app, frontdesk, marketel-frontdesk-ios, marketel-guestel-ios) + founder strategy session, Aug 2026. Updated Aug 23, 2026 after Guestel + native Front Desk pull. Read-only findings + implementation brief.*
