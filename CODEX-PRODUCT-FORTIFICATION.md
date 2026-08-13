# Codex handoff — Marketel product review & fortification

> **For Codex:** Read this end-to-end before changing product copy, money paths, or the two-app story. This is a founder + codebase audit (Aug 2026). Companion docs: `OPUS-JUMP-GUIDE.md` (UX/IA), `DESIGN-HANDOFF.md` (tokens), `marketel-frontdesk-ios/app-store/submission-checklist.md` (iOS ship).
>
> **Do not reopen the product thesis.** Fortify money integrity, one pricing truth, two-app language, and unfinished surface craft. Apple Dev Program is paid; ads start only after Front Desk is live on the App Store and `MARKETEL_FRONTDESK_APP_STORE_URL` is set.

---

## 0. Master prompt (paste to Codex)

```
Read CODEX-PRODUCT-FORTIFICATION.md end-to-end.
Also skim OPUS-JUMP-GUIDE.md §1 (two-app system, paired journey, stay-first confirmation)
and marketel-frontdesk-ios/app-store/submission-checklist.md.

Context:
- Product: Marketel — direct booking SaaS for independent hotels/lodges at $199/mo.
- Goal: $18k cash collected (not MRR) after iOS Front Desk is live, then Meta ads.
- Funnel: landing.html → setup.html → Front Desk reveal → go live → activated modal → Download app.
- Thesis: acquire (direct page) → retain (guest hotel PWA) → defend (Front Desk + Assistant SMS).

Your job when asked to implement:
1. Prefer P0 fortifications in §4 before polish.
2. Never leave dual pricing ($997 vs $199) or dual-app mush ("install"/"phones" without naming which app).
3. Confirmation: stay trust FIRST, guest install SECOND.
4. Activated modal: never "coming soon" after pay once App Store URL exists.
5. Do not invent Expo/RN guest App Store binary — guest stays PWA; native binary is owner Front Desk only.

If only asked to plan: output ordered fix list with file paths. Do not expand scope into new features.
```

---

## 1. Verdict (honest)

**The product is strong enough to test seriously for the $18k cash goal.** The result is not guaranteed by the code or funnel; the decision sequence is App Store live → store URL on activated modal → full production smoke test → proven Booking.com / 60s ad as control → Assistant as challenger. PWA/Airbnb are not the initial cold-lead angles.

**Product thesis is well designed.** Acquire → retain → defend matches how independents actually operate.

**Craft is uneven.** Strong system design, unfinished surface design. Pricing/copy drift, dual-app language, prototype UX (alerts, coming soon, tax mismatch) mean it doesn’t *feel* as designed as the thesis is.

**$199/mo is a good price** for 8–30 room independents. Lock landing, Terms, reveal, and ads to that one number.

---

## 2. What Marketel is

Not a booking widget. A **two-app system on one property:**

| Who | Home-screen app | Job |
|-----|-----------------|-----|
| Guest (Devon) | `{Hotel Name}` PWA | Stay, message desk, rebook |
| Owner (Maya) | `Marketel Front Desk` (web + Capacitor iOS) | New bookings, reply, inventory, get buzzed |

**Third leg — Front Desk Assistant:** Twilio SMS that asks about outside reality (OTA / walk-in / phone booking) and can update Marketel availability from a reply, with CANCEL/KEEP on conflict and a short undo window. That is the “protect you from anything outside Marketel” wedge.

**Stack (short):**
- `hotel-booking-app/` — React guest booking + guest PWA
- `guest-lodge-backend/` — Express/Prisma monolith, `landing.html`, `setup.html`, Front Desk build
- `guest-lodge-backend/frontdesk/` — Vite vanilla JS Front Desk source → `public/frontdesk/`
- `marketel-frontdesk-ios/` — Capacitor iOS companion (`com.bookmarketel.frontdesk`)

**Funnel spine:**
`Ad → landing.html → setup.html → /frontdesk?...&welcome=1&reveal=1 → go live (Stripe) → activated modal → Download Front Desk`

Today the last CTA is often a disabled **“Front Desk app coming soon”** until `MARKETEL_FRONTDESK_APP_STORE_URL` is set (`frontdesk/src/settings.js` → `showActivatedModal`).

**Founder sequence (locked):** Apple live → set store URL → smoke full funnel → then ads. Do not run ads into a coming-soon climax.

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
| Funnel spine | Real |
| One price everywhere | Not locked |
| One two-app vocabulary | Not locked |
| One visual + error language | Not locked |
| Climax screens (confirm, activated) | Still show growth/beta artifacts |

**“As designed as the thesis” means convergence, not more features:**
1. One price ($199/mo) on every public surface, matching Terms.
2. Two named products always: “Front Desk” (owner) vs “{Hotel} on your phone” (guest).
3. Confirmation: stay proof first; install second, one guest benefit.
4. Activated modal: real Download or honest web path — never coming soon after Stripe.
5. Same brand tokens + in-UI errors on guest and owner; no `alert()`, no Bootstrap blue islands.
6. Room card price story = checkout price story (taxes).

---

## 4. Two-app language & paired journey (indepth)

### The failure mode
Guests and owners share vague words — **“install”**, **“phones”**, **“bookings”**, **“app”** — without a clear paired journey. Maya downloads Front Desk and still cannot explain the guest hotel PWA to a walk-in.

### Same words, different objects

**Install**
- Guest: Add *this hotel* to Home Screen (Safari share).
- Owner: Download *Marketel Front Desk* from the App Store.
Different verbs are deliberate: guests **save the property**; owners **download Front Desk**.

**Phones / Guest App tab**
Often mixes three meanings:
1. Owner putting Front Desk on her phone
2. Guests saving the hotel PWA
3. Assistant “connected phones” (SMS recipients)

**Bookings**
- Guest: reservation trust (“am I confirmed?”)
- Owner: CRM inbox (needs call, notes, approval)

### Paired journey (required mental model)

Every seam has a guest side and owner side with the **same promise**:

| Seam | Guest | Owner |
|------|--------|--------|
| After pay | “I’m reserved; here’s my stay” | “They’re on the books” |
| Install | “Save **this hotel** for WiFi / messages / next stay” | “Guests save **{Hotel}** — not Marketel” |
| QR at desk | Scan → stay / install hotel | “Scan for *your* reservation” |
| Message | “Message the front desk” | Same thread in Front Desk |

Copy must lock these together. Today guest install, owner Guest App, and marketing FAQ can contradict (“no App Store” next to “Download Front Desk”).

### Confirmation = conversion poison when inverted
After pay/hold, Devon’s only question is **“Did it work? Do I have a room?”** (stay trust). Install is optional and second.

If confirmation pushes home-screen install before stay details are undeniable, it reads as “we got your card — now install something” at the scam-vs-real moment. **Stay first, install second** (`OPUS-JUMP-GUIDE.md` D4).

### Shipping iOS without fixing the explanation
App Store completes **owner** half. Walk-in still asks “do you have an app?” Maya needs one sentence:

> “Guests open our link and Add to Home Screen — that’s *our hotel*. *I* use Front Desk for bookings and alerts.”

Until reveal / Guest App / QR / activated modal train that sentence, iOS alone does not close the retain loop.

See also `OPUS-JUMP-GUIDE.md` §1, §1B, §1E.

---

## 5. Ads (for context; don’t expand product for creative)

**Proven control spine:** OTA guilt → 3 min build / 60s book → works with hand reservations → free to try → “stop giving Booking.com free money.” Screen recording + floating facecam.

**Challenger:** Front Desk Assistant / “won’t mess up phone, walk-in, or Booking.com reservations — texts you when something’s at risk.”

**Do not lead cold with PWA** — retention proof, not cold hook. OK as a line inside control or retarget.

**Park Airbnb cold ads** — wrong ICP + ToS/brand risk. Product is hotel/lodge Front Desk.

**Cash math:** $18k requires 91 × $199 monthly first payments before refunds, fees, or taxes. Annual payments can shorten the calendar, but activation (Front Desk install + first booking) still matters for month-2 cash.

---

## 6. Fortification list (read-only audit — prioritized)

### P0 — Fix before scaling ads

| Issue | Where | Why |
|-------|--------|-----|
| Client sets Stripe charge amount; server never recomputes from rates | `guest-lodge-backend/server.js` `POST /api/create-payment-intent`, `/api/book` | Underpay a stay; half-total also accepted as valid |
| Guest Stripe webhook: incomplete backup + always ACK 200 | `payment_intent.succeeded` handler | Paid guest, no DB/PMS row; Stripe won’t retry |
| Pricing story split: $997 one-time vs $199/mo | `landing-page/index.html` vs `landing.html` / reveal / Terms | Bait-and-switch under ad traffic |
| Post-pay CTA “Front Desk app coming soon” | `frontdesk/src/settings.js` `showActivatedModal` | Emotional peak after Stripe is a dead button |
| App Review notes still `REPLACE_WITH_*` | `marketel-frontdesk-ios/app-store/review-notes.md` | Review fail if submitted as-is |
| Setup token never cleared after complete/go-live | `HotelConfig.setupToken` + `/api/setup/:token/*` | Leaked token = durable write on live hotel |

### P1 — Reliability / unfinished feel

| Issue | Where | Why |
|-------|--------|-----|
| Ephemeral signing secrets if env missing | CRM return / magic / native session boot | Render restart invalidates links/sessions |
| Cloudbeds confirm-before-DB + webhook backup race | `/api/book` + webhook | Possible double PMS reservation |
| Pay-later: PMS/hold OK, DB fail still returns success | BookingCenter pay-later path | Hold exists; Front Desk never sees booking |
| Account deletion doesn’t release active $1 holds | Deletion sweep | Card holds linger after wipe |
| Deletion can cancel sibling Stripe subs (same email) | `cancelStripeSubscriptionsForDeletion` | Multi-property owner loses other hotel billing |
| Guest App vs Front Desk copy fights itself | `apps.js`, landing FAQ, activated modal | “No App Store” next to “Download Front Desk” |
| Room cards omit tax; checkout adds ~10% | `BookingPage` vs `GuestInfoPage` | Looks like pricing bug at trust moment |
| Checkout/calendar failures use `alert()` | `App.jsx`, `CalendarModal` | Prototype-grade on mobile Safari |
| PIN hash falls back to unkeyed SHA-256 | Missing `CRM_PIN_HASH_SECRET` | 6-digit PINs crackable without HMAC |
| `forgot-pin` has no rate limit | `/api/forgot-pin` | Reset spam / inbox DoS |
| Go-live success puts pin/returnToken in URL | `go-live-success` redirect | Leak via history / Referer / logs |
| Thin tests — no book/hold/webhook coverage | `guest-lodge-backend/test/` (~3 files) | Money regressions won’t catch |

### P2 — Beta smell (not ship blockers)

- “iOS 26” coach chrome exposed to owners/guests
- Bootstrap blue (`#007bff`) + Inter leftovers on guest vs DM Sans / brand green
- Empty rooms → “Coming Soon” + emoji on guest site
- Phones / Guest App / SMS “phones” naming mess; URL still `?tab=phones`
- BookingCenter defaults to **test** SOAP URLs
- Hardcoded Stripe product ID fallback (`prod_Uls6…`)
- In-memory rate limits reset on Render wake; `/api/availability` unmetered
- Guest messaging: email optional if reservation code known
- Open `/api/browser-diagnostics`
- Dummy bookings API behind crmAuth only
- `server.js` ~13k-line monolith (debt)

### Not half-assed (don’t “fix” what works)
Manual inventory `pg_advisory_xact_lock`, Marketel go-live Stripe verification, account deletion owner gate + 7-day grace, live `/privacy` `/terms` `/app-support`, Assistant safety rules (verify phone, CANCEL/KEEP, undo window). iOS `npm run verify:release` was passing at audit time.

---

## 7. If Codex only hardens five things before ads

1. **Server-side price** from `hotelRates` / catalog — never trust client `amount` for standard charges.
2. **Webhook backup** that creates the booking for manual (+ other PMS as applicable) and returns non-2xx on hard failure so Stripe retries.
3. **One pricing truth** — $199/mo everywhere; kill or retire `$997` `landing-page` story.
4. **Rotate/clear `setupToken` after complete**; fail boot in production if signing secrets missing (no ephemeral random).
5. **App live → `MARKETEL_FRONTDESK_APP_STORE_URL`** on activated modal (founder already sequencing this).

Then: two-app copy pass + stay-first confirmation + replace `alert()` on guest checkout + align tax display.

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

---

## 8. iOS / App Store checklist pointer

Full list: `marketel-frontdesk-ios/app-store/submission-checklist.md`.

Must before Submit: App ID + Push, certs, APNs on Render, GitHub Actions secrets, filled `review-notes.md` demo account, screenshots, device QA (sign-in, tabs, push actions, deletion cancel).

Bundle ID: `com.bookmarketel.frontdesk`. SKU: `marketel-frontdesk-ios`.

---

## 9. File index (high traffic)

| Area | Path |
|------|------|
| Guest booking | `hotel-booking-app/src/` |
| Front Desk source | `guest-lodge-backend/frontdesk/src/` (build → `public/frontdesk/`) |
| Backend / webhooks / setup | `guest-lodge-backend/server.js` |
| Schema | `guest-lodge-backend/prisma/schema.prisma` |
| Ad landing (current funnel) | `guest-lodge-backend/landing.html` |
| Alternate marketing landing | `landing-page/index.html` (**pricing drift**) |
| Setup wizard | `guest-lodge-backend/setup.html` |
| Assistant | `guest-lodge-backend/frontdesk-assistant.js`, `FRONTDESK_ASSISTANT.md` |
| iOS shell | `marketel-frontdesk-ios/` |
| UX brief | `OPUS-JUMP-GUIDE.md` |
| Design tokens debt | `DESIGN-HANDOFF.md` |

---

## 10. Explicit non-goals (unless founder asks)

- React Native / Expo guest App Store app
- Leading ads with Airbnb ICP
- Reopening “is $199 right?” — yes it is; lock it
- Expanding PMS parity before money-path + two-app copy fortification
- Running ads before App Store URL is live on the activated modal

---

*Audit compiled from full-repo review (guest-lodge-backend, hotel-booking-app, frontdesk, marketel-frontdesk-ios) + founder strategy session, Aug 2026. Read-only findings; this file is the implementation brief.*
