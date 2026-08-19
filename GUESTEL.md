# Guestel — the guest super app

Working spec. Captured from strategy discussion. Not built yet.

Guestel is the **guest-facing** companion to Marketel (which is the owner/Front Desk side).
Where Front Desk is an operations cockpit, Guestel is a **beautiful travel wallet**: the
place a guest keeps every hotel they use, rebooks directly, pays one-tap, and manages stays.

---

## 1. The one-line

A personal wallet of the hotels you already use — rebook direct, pay one-tap, manage your
stays — so a guest never has to go back to Booking.com for a hotel they already know.

## 2. Why it exists (the strategy)

Marketel's core wedge is **stop the leakage**: hotels already have traffic; stop them giving
15–25% of it to OTAs. Guestel is the *mechanism that makes stop-the-leak compound*:

- **Retention loop:** every OTA guest a hotel converts to its Guestel presence becomes a
  **permanent direct guest** — they rebook direct forever. Each hotel's direct base only
  ratchets up. You concede the *first* booking to Booking.com (discovery is its real moat);
  you capture the *repeat*.
- **Share loop:** guests already share hotels they love ("you have to stay here"). One-tap
  share drops a friend straight into that hotel inside their Guestel → a new direct guest.
  Riding natural travel word-of-mouth. (Amplifier / CAC-crusher — not literal runaway
  virality; travel is infrequent + geographic, so don't model k>1.)
- **Payments:** the card lives in Guestel → one-tap rebooking → higher conversion for the
  hotel, payment margin for Marketel. This is the second weld.

**Allergic to churn — once the flywheel spins.** The lock-in isn't the software; it's the
accumulated direct-guest base living on our rails. Cancelling Marketel = amputating that
base. That kills *voluntary/seasonal* churn (won't torch your direct channel to save one
slow month). NOTE: lock-in is **late-binding** — a brand-new hotel has zero converted guests
and can still churn early. So the #1 job is **cross the early valley fast**: get a new
hotel's guests onto the app in week one, not month six.

## 3. What Guestel is NOT (guardrails — do not violate)

- **Not an OTA / not discovery.** Guests never browse for *new* hotels here. It only holds
  hotels they *already have a relationship with*. The instant it becomes a place to shop for
  new hotels, we've rebuilt Booking.com, gutted our own pitch, and inherited the two-sided
  cold-start we can't win.
- **Rule: it's a keeper, not a finder.** Rebook the hotels you know; don't find new ones.
- **Brand rule: the hotel is the face, Marketel/Guestel is the rails.** Any idea that needs
  Marketel to build consumer mindshare directly → flip it so the *hotel* does the
  consumer-facing part to *its own* guests and Guestel powers it.
- **No cold-start problem** (this is a *personal* wallet — empty on first open for everyone,
  like a bank app; the user fills it. Total network size is irrelevant to any one user.)

## 4. Design

- **Same design system as Front Desk** (green, ink, glass, type) but warmer/calmer/consumer —
  a travel wallet, not an ops tool. Should look like something Apple would ship, not a PMS.
- **Logo:** keep the Marketel door, **mirrored/inverted.** Marketel = door opening inward
  (host coming in to manage); Guestel = mirrored, the guest's side. Two mirror-image doors =
  two sides of the same threshold.
- **Low-frequency app** (people travel rarely) → must be instantly obvious on every open →
  ruthless simplicity.

### Tabs — 3 (or 2 for v1)
```
   Hotels        Trips        Account
```
- **Hotels** (home/default): your collection of hotel cards (photo + name). Tap a hotel → its
  screen where the actions live: **Book again** (primary), **Message**, **Share**, past
  stays. Active/upcoming stay pinned at top.
- **Trips**: every reservation across hotels — upcoming (dates, check-in, address, wifi,
  confirmation) + past (receipts, one-tap rebook).
- **Account**: payment methods (the card-on-file that powers one-tap), profile, settings.

**What does NOT get a tab** (keeps it simple):
- Messaging → inside each hotel's screen (message a *specific* hotel).
- Booking/rebooking → an action button inside a hotel.
- Sharing → a button inside a hotel.
- Paying → inline at checkout + managed in Account.
- Add a hotel → a persistent **"+" / scan** button (top corner), not a tab.

**Rule:** places (nouns you return to) get tabs; actions (things you do to a hotel) live
inside the hotel screen. Front Desk is a cockpit; Guestel is a wallet with 3 pockets.

**v1 could ship 2 tabs** (Hotels + Account, upcoming trip pinned atop Hotels); add Trips when
it feels cramped.

## 5. Architecture / how it fits with what exists

- **Guestel is the ONE guest vessel** — it holds 1..N hotels per user. Do NOT build throwaway
  per-hotel PWAs and a separate super app later; that's building it twice. "A hotel's app"
  IS "Guestel with one hotel in it."
- **PWA is too shaky** on iOS (hidden Add-to-Home-Screen, unreliable push, storage eviction).
  Guestel (real native app) supersedes the *installed* experience.
- **It's NOT 2 CTAs.** Never say "download Guestel, then add your hotel." Deep-link it:
  the hotel's CTA is **"Get [Hotel]'s app"** → one tap installs Guestel with that hotel
  pre-loaded. Guest perceives ONE action ("get this hotel"); Guestel rides in invisibly.
  First hotel pays the one-time install tax; every additional hotel is a single tap.
- **Keep a no-install web booking path** as the frictionless first touch — never gate a
  guest's *first* booking behind an app install (kills conversion on cold/casual guests).
  - Web booking (no install) → frictionless top of funnel + demand-capture ads.
  - "Get [Hotel]'s app" (deep-link → Guestel + hotel) → offered at the right moment
    (post-booking / at the stay) for guests worth converting to repeat.
  - Guestel → where all repeat bookings + payments + sharing live.
- **Reuse the pipeline:** `marketel-frontdesk-ios` is a Capacitor app with the design system
  + signing/CI already working. Guestel = a second Capacitor app on the same rails. Low
  marginal cost to stand up.

## 6. Build plan / timing

**Start now, but build the atom, not the vision.** (Free time is high pre-classes — use it,
but on the right scope.)

- **v1 scope (lean vessel, the atom):** add a hotel (QR/deep-link) → rebook direct → pay
  one-tap. That single loop, one hotel per user, IS the retention thesis at n=1. Prove a
  guest will install, rebook, and pay.
- **Later (after the atom retains + hotels are paying):** Trips tab polish, the share/viral
  loop, multi-hotel flourishes, Live Activity for reservation status, referral incentives
  (two-sided: friend gets direct rate + perk, sharer gets a perk).
- **The rule that must not slip:** building Guestel is the *comfortable* work; getting a
  hotel to *pay* is the scary, unproven keystone. Build Guestel **in parallel with selling**,
  never instead of it. North star stays: **paying hotels.**

## 7. Open decisions / to figure out later

- **Name:** leaning **Guestel** (mirrors Marketel's "-tel"; passes own-it / searchable /
  say-it / consumer-ish filters "okay"). Watch: slightly corporate, faint "hostel" echo.
  Alt lane = a warmer standalone consumer name. Check trademark + domain. (Note: "The
  Guestbook" is an existing book-direct rewards player — avoid confusion in that territory.)
- **Pricing model** that makes payments + seasonality work: transaction-based (% of bookings)
  so dead months cost the hotel ~nothing (kills seasonal churn) — see payments plan.
- **Consent/privacy** for any cross-property data use (pooled pixel/CAPI): guest PII from one
  hotel can't be repurposed without proper consent — GDPR/CCPA. Do it right.
- **Referral mechanics** for the share loop (two-sided incentive, effortless one-tap,
  prompted right after a great stay).
- **Repeat-guest fit:** value concentrates in hotels with repeat guests (business, long-stay,
  seasonal returners). Less value for one-and-done transient — which is also the stickier,
  lower-churn segment we want anyway.
