# Opus Jump Guide — Marketel UX Redesign

> **For Opus:** This is the primary creative brief. Say *"do everything in OPUS-JUMP-GUIDE.md"* and work top-to-bottom.
> **Companion doc:** `DESIGN-HANDOFF.md` has token migration, line-level color debt, and polish inventory. Use this guide for **product story, IA, ambiguity, and redesign direction**; use the handoff for **implementation specs** after design is locked.
>
> **Read these first — they are the design-thinking spine, all verified against current code (routes, copy, step order):** §1A users · §1B paired journeys & the seam · **§1C decisions register (every ambiguity already resolved — don't reopen)** · §1D wireframes · §1E copy system. Sections 2–11 are the per-surface briefs and file index. If a brief below ever reads "Opus picks…", §1C has already made the call.

**Repo:** `/home/sazo/BOOKING/booking`  
**Guest app:** `hotel-booking-app/src/` (Vite/React)  
**Front Desk:** `guest-lodge-backend/simple-crm.html` → `npm run build:frontdesk`  
**Do not hand-edit** `guest-lodge-backend/public/frontdesk/` — it's the build output.

---

## 0. Master prompt (paste to Opus)

```
Read OPUS-JUMP-GUIDE.md end-to-end, then DESIGN-HANDOFF.md §4 for tokens.

Your job is DESIGN — not implementation yet:
1. Deliver wireframes (mobile-first) + copy blocks + component names for every §1–§8 item marked P0/P1.
2. Fix ambiguity: guests must understand where bookings go and what the installed app is FOR.
3. Owners must understand two home-screen apps (Front Desk vs guest hotel app) without reading Help.
4. Unify visual language: DM Sans, #2E7D5B, Lucide icons (no emoji UI). Reference setup.html tokens as "done."

Output per screen: problem → proposed layout → key copy → states (empty/loading/error/success).

Then implement in a second pass if asked.
```

---

## 1. North star — what Opus is really designing

Marketel is **not** a booking widget. It's a **two-app system on one domain:**

| Who | Home-screen app | Job to be done |
|-----|-----------------|----------------|
| **Guest** | `{Hotel Name}` | See my stay · book again · message front desk |
| **Owner** | `Front Desk` | See new bookings · reply to guests · get buzzed |

**The failure mode today:** both sides use the same green and words like "install" / "phones" / "bookings" without ever showing the **paired journey**. Guests checkout in a blue Bootstrap-looking browser flow and only learn about the app at the end (if at all). Owners land on a "Bookings" tab that's sometimes a launch checklist.

**Opus deliverable #0:** One **journey map** (guest left, owner right, 6–8 steps) that every screen redesign references.

```
Guest: Browse rooms → Pay/hold card → Confirmation code → (optional) Add to Home Screen
       → Home tab (stay) → Messages tab → Check-in day

Owner: Setup Your page → Go live → Booking appears in Bookings → Reply in thread
       → Guest gets push → Phones tab explains guest install + QR
```

---

## 1A. The two users (design against these, not "the user")

**Persona A — "Maya," the owner-operator.** Runs a 12-room motel. Lives on her phone between the front desk, the laundry, and the lot. Pays Booking.com ~15% and resents it. Non-technical — "an app" means "a thing on my home screen." Her real onboarding answers prove the mindset: the four questionnaire questions are verbatim **"Why do you want a booking engine?"**, **"How do guests currently book with you?"** ("They call me or walk in" / "Through Booking.com / Expedia"), **"How many rooms do you have?"**, **"What's most important to you?"** ("Stop paying OTA commissions" / "Get more direct bookings"). **Maya needs reassurance + rhythm:** real bookings, a clear daily loop, and "is this real?" resolved.

**Persona B — "Devon," the guest.** Booked tonight, maybe arriving in hours. Mobile, impatient, fee-averse. The **"$0 today · $1 verification (released immediately) · pay at check-in"** promise is the *entire* trust play. Wants WiFi/parking/early-check-in without phone tag. Installs the hotel app only if the value is obvious *in the moment* — which today it isn't, because the value prop changes on every surface (§1E). **Devon needs speed + trust:** no fee ambiguity, no dead ends, one obvious reason to install.

> Audit every screen against: **which user · which job · which emotion.** If a screen can't name all three, it's under-designed.

---

## 1B. Paired journey maps & the seam

The north-star map (§1) is the skeleton. These add the **emotion at each beat** and — critically — the **seam** where the guest and owner journeys touch. Design seam moments as *pairs*; a change on one side implies the other. All routes/copy below are verified in code.

### Guest journey (emotion-mapped)
`/` → `/guest-info` → `/final-confirmation` → `/guest/home` → `/guest/check-in` → `/guest/messages`

| Beat | Screen | Emotion | Must be true | Today's friction |
|---|---|---|---|---|
| Discover | BookingPage `/` | "is this legit/available?" | hotel + dates + rooms in 2s | no global date bar; rooms show **"$0 today"** pre-dates; Bootstrap-blue brand |
| Choose | RoomCard / CalendarModal | "this room, these dates" | pick dates → real rates | dates live per-card; calendar uses `alert()` + `<`/`>` glyphs |
| Review | checkout "Review Cart" | "what am I paying?" | $0 today / balance at check-in clear | "Reserve for $0 Today" competes w/ savings badges |
| Identify | checkout "Info" | "quick, don't make me think" | 4 fields, no friction | fine — polish only |
| **Pay (hold)** | checkout "Payment" | **"will I get charged?"** ← trust moment | "$1, released immediately, pay at check-in" unmissable | good auto-modal "Why we need your card"; undercut by blue focus rings + "⚠️" errors + lying progress bar |
| **Confirm** | ConfirmationPage | "did it work? now what?" | **stay first, install second** | inverted — stay hidden in `<details>` "Booking & payment details" |
| Install | install card / page | "why add this?" | one reason, frictionless iOS *and* Android | 4+ conflicting value props (§1E); Android dead-ends on disabled button |
| Land | GuestHomePage | "good, it's here" | "Welcome, {first}" + stay at a glance | solid; nav active state generic black |
| Pre-arrival | GuestCheckInPage | "get me ready" | WiFi/parking → one tap to message | banner-only discovery hides it |
| Stay/ask | GuestMessagesPage | "just answer me" | text-like thread + quick chips | chips exist ("Early check-in"/"Late check-out"/"Extra towels"/"Quiet room"); fragile compose offset |
| Rebook | back to `/` | "easy, again" | one tap from home | "Book again or extend your stay" exists |

### Owner journey A — onboarding (verified step order)
boot → login → **questionnaire (4 Qs, "Question X of 4")** → **welcome** ("Welcome to your Front Desk" → "Show me how →", anchors "$99/mo") → **settings tour (14 steps)** → **go-live** ("🔒 Guests can preview — but can't book yet" → "Activate direct bookings — $99/mo →") → **activated** ("You're live — payment received" + 4 checkmarks) → **unlock tour (2 steps: Bookings, Phones)**. *Trust keystone to preserve verbatim:* the payments-explainer — "their card is verified but never charged… you collect payment however you want when they physically check in."

### Owner journey B — daily loop
open (lands on **Your page** ✗ should be Bookings) → scan ("📥 {n} Needs Call" — **hidden on mobile** ✗) → act (card: name/$/"🛏 room"/"🌙 nights"/dates/phone/"💳 Collect at check-in" + "📞 Call Now"/"📝 Add Note") → message (thread + "Reply to {guest}…" + "✓ Mark read") → install ("📲 Guest QR" → "Any guest"/"This guest") → notify ("📣 Notify all guests at once" → "Send notification") → finish (Launch checklist).

### The seam — design these as pairs
| Seam | Guest side | Owner side | Pair so… |
|---|---|---|---|
| Install at checkout | Confirmation install card | "Guests save {hotel}" on Phones | guest's value prop matches owner's promise |
| QR at check-in | scan → install / open reservation | "📲 Guest QR" · Any/This guest | QR lands guest somewhere coherent (install *and* booking) |
| Message | "Message the front desk" | thread + "✓ Mark read" | guest quick-chips render as owner request chips |
| Broadcast | push buzzes guest app | "📣 Notify all guests" | "like a text from you" is true both ends |
| Rebook | "Book again or extend" | new booking in Bookings | the loop visibly closes — the whole thesis |

---

## 1C. Decisions register — every ambiguity RESOLVED

> This guide's prime directive is **no open questions**. Where earlier sections (and the original draft) said "Opus picks X or Y," the call is **made here**. **All 21 are resolved** — including D19–D21, which touch revenue/brand levers and carry full reasoning in §1C.1. The founder can of course revisit the *business value* of D19–D21, but design does not wait on them and should build to the decisions as written.

| # | Ambiguity | **Decision** | Why |
|---|---|---|---|
| D1 | One green or two? | **One green** — `--brand #2E7D5B` is also success; drop `#28a745`/`#15803d`/`#059669`. | unity is the point; money block still reads positive |
| D2 | Canonical landing page | **`landing-page/index.html`**; retire `guest-lodge-backend/landing.html`. | richer tokens + type scale; one source = no drift |
| D3 | Guest install value prop | **One promise, three context-skins** (§1E matrix). | kills the 4-way divergence; matches journey stage |
| D4 | Confirmation: stay vs install | **Stay first, install second** (§1D.1). | trust at conversion > growth-hacking the install |
| D5 | Checkout 3 or 4 steps | **3 steps** — reconcile code's internal "step 4" to "Review → Details → Payment." | bar already shows 3; make code match UI |
| D6 | Front Desk default tab | **Bookings**, not "Your page." | daily-loop beat 1 is "anything new?", not settings |
| D7 | Desktop vs mobile nav (resolves §5.1) | **Same 5 destinations on both platforms:** Bookings · Availability · Revenue · Phones · Your page. | desktop currently can't reach Availability/Revenue — a defect |
| D8 | "$0 today" on room cards | **"Choose dates to see rates."** | "$0" reads broken/free; it's a placeholder, not a price |
| D9 | Modal patterns | **Two only:** center dialog (forms) + bottom sheet (mobile instructional), radius 20px, one backdrop, one close button. | collapses 4+ current modal languages |
| D10 | Android install dead-end (resolves §4.6) | **Never a disabled CTA** — manual-steps accordion mirroring iOS. | dead button = dead end; Chrome-menu self-install always works |
| D11 | `/booking` lookup vs `/guest/home` | **Fold lookup into Home's empty state.** | "Home with no stay" *is* the lookup; two routes → one place |
| D12 | Check-in page discoverability | **Promote to top card on Home in the 48h window** (§1D.5); keep route. | banner-only hides a high-value arrival surface |
| D13 | Money copy wording | **Standardize everywhere:** "$0 today · $1 verification (released immediately) · pay at check-in." | trust dies if the promise word-drifts across checkout/confirmation/email |
| D14 | Welcome-email PIN block | **Recolor to brand-muted green**; keep system font + emoji (email-safe). | only off-brand element in an on-brand email |
| D15 | 14-step settings tour | **Re-chunk to ~6 grouped beats** (Set up page · Your link · Your login · Where bookings land · How payment works · Get it on your phone). | 14 single-element stops fatigue |
| D16 | Guest-facing freemium gate (resolves §5.3) | **Guest never sees owner billing.** On unsubscribed hotels, show a clean guest "Preview — booking opens soon," not "Activate $99/mo." | a guest seeing owner pricing is a catastrophic trust break |
| D17 | "Needs Call" on mobile | **Surface as a Bookings-tab badge + filter chips** at top of list. | core workflow currently hidden on Maya's primary device |
| D18 | `availability-simple.html` / `funnel.html` palettes | **Leave** — intentional standalone/internal tools, out of unification scope. | not worth the churn; not customer-facing |
| **D19** | "$99/mo" gate prominence/framing | **RESOLVED:** keep the gate, but reframe lock → **"readiness switch"** and make conversion ride on **blocked-demand proof** ("N guests tried to book"), not a constant price banner. Full reasoning §1C.1. | a skeptical owner converts on *proof of demand*, not nagging |
| **D20** | push install to all guests or only likely-rebookers? | **RESOLVED: offer to ALL guests, need-triggered, never nag.** The install's *first-order* value (message front desk + check-in info) is universal — rebooking is second-order. Full reasoning §1C.1. | gating on predicted rebooking denies the universal messaging utility |
| **D21** | Front Desk login brand (also resolves §5.6) | **RESOLVED: hotel name leads** — "{Hotel} · Front Desk — staff login," Marketel as quiet footer. Full reasoning §1C.1. | daily staff tool + multi-property disambiguation + ownership psychology |

### 1C.1 Reasoning for D19–D21 (the three business-lever decisions)

These touch revenue and brand, so here's the *why*, not just the *what*.

**D19 — the $99/mo gate.** Maya is a skeptic who's been sold to; the whole onboarding (questionnaire, free setup, preview mode, "verified but never charged" explainer) is a trust ramp. The structural problem: **she can't evaluate the product until she sees a real booking, but the gate blocks bookings until she pays** — a chicken-and-egg. So the conversion strategy isn't louder pricing; it's *removing the doubt the gate creates*. Three moves: (1) **Reframe** the persistent "🔒 …can't book yet" — which leads with deprivation — to a **readiness/endowment frame**: she's already built the page, so activation is *flipping a switch on something that's done and proven*, not buying blind. (2) **De-escalate the nag** — a banner on every tab reads desperate; replace with a calm persistent status pill, re-prominent only at high-intent moments (sharing the booking link; completing the launch checklist). (3) **The real lever — surface blocked demand.** The preview page is public; if a guest actually tries to book and is gated, capture it and show Maya *"2 guests tried to book today — activate to accept reservations like these."* Proof of real demand converts a skeptic far harder than any price framing. Keep "$99/mo · cancel anytime · no contracts" — risk-reversal matters for this persona.

**D20 — who gets pushed to install.** The framing "only likely-rebookers" is wrong because it misreads the install's primary job. **The install's first-order value is *this* stay** — message the front desk, get WiFi/parking/early-check-in, see check-in info. That utility is universal; *every* guest with an upcoming stay benefits. Rebooking (no OTA next time) is real but *second-order* and unpredictable at booking time. Gating offers to predicted rebookers would deny the messaging utility to everyone else and bet on a bad prediction. So: **offer to all.** The discipline is anti-nag, because Devon is spam-averse and over-prompting burns the trust the checkout just earned. Make every prompt **need-triggered, not calendar-triggered**: (1) confirmation ("your reservation + a direct line to the front desk"), (2) pre-arrival/check-in ("message us for WiFi or early check-in" — peak contextual need), (3) the first time they try to message from the browser ("install to get our replies"). One modal per moment; a "Maybe later" is respected for the session and falls back to a quiet inline entry, never another modal. Rebooking value becomes *copy* in the browsing-footer context, not a *gate* on who's asked.

**D21 — login brand.** This is a **daily, PIN-based staff login** on a home-screen app that sits next to the guest's view of the same hotel. Maya's mental model is "open *my* hotel's front desk" — so leading with Marketel branding inserts a vendor wall between her and her work, every single day. Three reasons hotel-name-leads wins: (1) **Ownership** — her name reinforces "this is infrastructure I own," not "a SaaS I rent." (2) **Disambiguation** — the owner app is generically named "Front Desk" (only the *guest* app is hotel-named); putting the hotel name on login is the natural place to tie the generic icon back to *which* property, which matters for multi-property owners and multiple staff. (3) **Where platform brand actually pays off** — Marketel equity is better built at acquisition (landing page, billing, a "powered by" line) than re-asserted as daily login friction. So: **"{Hotel Name}"** prominent · **"Front Desk — staff login"** descriptor · PIN · **"Marketel"** quiet footer. (This is also exactly what §5.6 already asks for — now it's a decision, not a suggestion.)

---

## 1D. Wireframe specs (ASCII — hierarchy & content order, not pixels)

Tokens/hex/radius come from `DESIGN-HANDOFF.md` §4. Each wireframe fixes **content priority**; the visual layer is the handoff's job.

### 1D.1 Confirmation — stay first, install second *(D4; fixes §3.3)*
```
┌─────────────────────────────────────────┐
│ ✓ Booking confirmed   #A1B2C3D4E          │ ← compact success, NOT full-bleed hero
├─────────────────────────────────────────┤
│ YOUR STAY  (always visible — was hidden)  │
│  {Room}                      [Confirmed]  │
│  Check-in   Fri Jun 27 · 3:00pm           │
│  Check-out  Mon Jun 30 · 11:00am          │
│  ─────────────────────────────────────    │
│  Paid today           $0.00               │ ← the trust payoff
│  $1 hold (released)                       │
│  Due at check-in      $227.70             │
│  [ Add to calendar ]  [ Extend / rebook ] │
├─────────────────────────────────────────┤
│ STAY IN TOUCH  (secondary module)         │
│  Add {hotel} to your home screen — message│
│  the front desk & get check-in updates.   │
│  [ Add to Home Screen ]      Maybe later  │
├─────────────────────────────────────────┤
│ ⌄ Cancellation policy & email updates     │ ← only THIS stays collapsed
└─────────────────────────────────────────┘
priority: 1 confirmed+code · 2 stay+money · 3 install · 4 fine print
```

### 1D.2 Phones tab — the dual-app hub *(§3, §3.5)*
```
┌─────────────────────────────────────────┐
│ Phones                                    │
│  ┌─────────────────────────────────────┐ │
│  │  YOUR phone ⇄ GUEST'S phone          │ │ ← loop diagram FIRST, every visit
│  │  ▣ Front Desk     ▣ {hotel}          │ │
│  │  "buzzes when     "book & message    │ │
│  │   they book"       you, 1 tap"       │ │
│  └─────────────────────────────────────┘ │
├──────────────── YOUR PHONE ──────────────┤
│  ● Front Desk on home screen · Alerts ON  │ ← or CTA "Add Front Desk"/"Turn on alerts"
├─────────────── GUEST PHONES ─────────────┤
│  ① [QrCode]   Show check-in QR    ALWAYS  │
│  ② [Link]     Guest install link · 14 on  │   VISIBLE — never in <details>
│  ③ [Megaphone] Notify guests             │
├─────────────────────────────────────────┤
│  ⌄ Help · how it works · FAQs             │ ← fold holds help ONLY
└─────────────────────────────────────────┘
```

### 1D.3 Booking page — sticky date bar *(D8; fixes §4.1)*
```
[MapPin] 123 Main St · {City}              ← address muted
{Hotel name}                               ← 28px/800, brand green (not blue)
▣ STICKY [ Check-in ▸ Check-out ]   2 👤    ← global date strip (replaces per-card dates)
┌ [photo] {Room} · WiFi · TV · Parking ───┐
│  before dates → "Choose dates to see     │ ← NEVER "$0 today"
│                  rates"                   │
│  after dates  → $69/night · $227.70 total │
│                               [ Book now ]│
└──────────────────────────────────────────┘
```

### 1D.4 Checkout — honest progress + trust block *(D5, D13; fixes §3.1)*
```
●━━━●━━━○   "Step 2 of 3 — Your details"   ← 3 real steps (code's "step 4" → reconcile)
┌ Payment-step trust block (the keystone) ─┐
│ [ShieldCheck] $0 charged today            │
│ $1 verification only — released instantly │
│ You pay $227.70 at check-in               │
└──────────────────────────────────────────┘
[ Confirm reservation · $0 today ]   ← sticky, safe-area-inset-bottom, brand green
focus rings → brand (today blue) · errors → AlertCircle (not "⚠️")
+ persistent "What happens next" module (§3.1): code+email → add to home → Home=stay, Messages=front desk
```

### 1D.5 Check-in — promote to top Home card *(D12)*
```
Home, inside 48h:  this becomes the TOP card
┌ ● Check-in tomorrow ─────────────────────┐
│ Almost here, {first} — get ready          │
│ [MessageSquare] Message front desk        │ ← WiFi / parking / early check-in
│ [FileText]      View my stay              │
└──────────────────────────────────────────┘
```

### 1D.6 Front Desk Bookings — default landing *(D6, D17; fixes §3.4, §5.4)*
```
Bookings                 [PhoneIncoming] 2   ← "Needs call" badge VISIBLE on mobile
[ All ] [ Needs call ] [ Called ]            ← filter chips (today hidden on mobile)
┌ {Guest name}                 $227.70 ─────┐
│ [BedDouble] {Room} · [Moon] 3 nights      │
│ Fri Jun 27 → Mon Jun 30                   │
│ [Phone] (555) 123-4567   ≥18px on mobile  │ ← not 15px
│ [CreditCard] Collect at check-in          │
│ [ Reply ]  [ Call ]  [ Add note ]         │ ← Reply primary; Lucide; ≥44px
└──────────────────────────────────────────┘
pre-live: Launch checklist lives on Your page (banner), NOT here
post-live empty: "Waiting for your first booking" + share-link CTA
```

---

## 1E. Copy system

### 1E.1 Install copy — ONE matrix (resolves the 4-way split; D3)
Today's value prop differs on every surface (all verbatim): *"Get check-in updates and message the front desk…"* (GuestInstallCard) · *"Book direct in one tap — no searching, no fees."* (InstallAppBanner) · *"Works like an app. No app store. Message us anytime and book direct next time."* (InstallPage) · *"You're almost here — install now…"* (check-in) — plus four "takes 3 seconds" variants. **Collapse to one promise, lead-benefit rotates by context:**

| Context | Lead | Full line |
|---|---|---|
| Post-booking (Confirmation) | stay in touch | "Add {hotel} to your home screen — message the front desk and get check-in updates. No app store, ~3 sec." |
| Pre-arrival (check-in) | be ready | "Add {hotel} before you arrive — message us for WiFi, parking, or early check-in. ~3 sec." |
| Browsing (booking footer) | rebook fast | "Add {hotel} to your home screen — book direct in one tap next time. No fees, no app store." |
| iOS sheet | how | "Tap **Share** → **Add to Home Screen** → **Add**. Done." |
| Android (no prompt) | how | "Open this page in Chrome's menu → **Add to Home screen**." *(accordion, never a disabled CTA — D10)* |

CTA everywhere: **"Add to Home Screen"**. Dismiss everywhere: **"Maybe later"** (text link, not `×`).

### 1E.2 Microcopy principles (both apps)
1. **Lead with benefit, not mechanism** ("Message us for WiFi" > "PWA install").
2. **Money copy is sacred + identical** everywhere (D13).
3. **One verb per action** ("Add to Home Screen", "Send notification", "Mark read", "Call").
4. **Name apps consistently** — owner = **"Front Desk"**, guest = **"{hotel}"**, never "the app."
5. **No emoji as UI** (§1E.3) — emoji allowed only in the *email* template.

### 1E.3 Emoji → Lucide + label (copy-level; hex in handoff §8)
| Emoji | → | Emoji | → |
|---|---|---|---|
| 🎉/✨ | remove or tiny `PartyPopper` | 📞 Call | `Phone` "Call" |
| ⚠️ | `AlertCircle` | 💬 Text | `MessageSquare` "Text" |
| 🔒 | `Lock`/`ShieldCheck` | ✉️ Email | `Mail` "Email" |
| 📝 Note | `PenLine` "Add note" | 📲/📷 | `QrCode`/`Camera` |
| 📣 Notify | `Megaphone` "Notify guests" | 🛏/🌙 | `BedDouble`/`Moon` |
| 📥 Needs Call | `PhoneIncoming` "Needs call" | 🚀/🔒 empty | `Rocket`/`Lock` |
| 🏨/💬 empty (guest) | `Building2`/`MessageCircle` in pale-green circle | | |

---

## 2. Design system reference (don't reinvent)

**Best existing tokens:** `guest-lodge-backend/setup.html` lines 10–15 and `landing-page/index.html` lines 10–26.

```css
/* Promote this everywhere */
--green: #2E7D5B;
--green-dark: #1a5c3f;
--green-lt: #e8f5ee;
--text: #1a1a2e;
--muted: #6b7280;
--border: #e5e7eb;
--r: 16px;
```

**Guest app debt:** `hotel-booking-app/src/index.css:11` still has `--primary-color: #007bff`. Booking flow reads as legacy Bootstrap, not the guest PWA.

**Font:** DM Sans globally. Guest app currently mixes Inter + inline `system-ui`.

**Icons:** Lucide only in UI. Emoji inventory in `DESIGN-HANDOFF.md` §8.

---

## 3. P0 — Ambiguity killers (do these first)

### 3.1 Guest checkout: "Where does my booking go?"

**Files:** `hotel-booking-app/src/GuestInfoPage.jsx`  
**Lines:** progress 1540–1549 · card modal 1411–1450 · step 1 review 1557+

**Problem:** Steps are Review → Info → Payment (but code uses `currentStep === 4` for payment). Zero copy about post-booking destination. Card modal explains Stripe hold, not the guest app.

```1540:1549:hotel-booking-app/src/GuestInfoPage.jsx
                <div className="checkout-progress-bar">
                    <div className={`progress-step ...`}>
                        <div className="step-circle"></div><span className="step-name">Review Cart</span>
                    </div>
                    ...
                    <div className={`progress-step ${currentStep === 4 ? 'completed active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Payment</span>
                    </div>
```

**Redesign brief for Opus:**
- Add persistent **"What happens next"** module visible on steps 1–3:
  1. You get a confirmation code + email
  2. Add `{Hotel}` to your home screen (optional but recommended)
  3. **Home** = your stay · **Messages** = text the front desk
- Include a **3-tab ghost preview** (non-interactive mock) so guests see the destination before paying.
- Renumber steps 1–3 in UI and copy; kill the step-4 ghost.
- Suggested copy block: *"Your reservation lives in the {Hotel} app on your phone — message us anytime, no phone tag."*

---

### 3.2 Browser vs installed app — invisible bridge

**File:** `hotel-booking-app/src/GuestLayout.jsx`  
**Lines:** 7–11 (tabs) · 68–70 (nav gate) · 72–82 (active tab logic)

```7:11:hotel-booking-app/src/GuestLayout.jsx
const NAV_TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/guest/home' },
  { key: 'book', label: 'Book', icon: CalendarSearch, path: '/' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, path: '/guest/messages' },
];
```

```68:70:hotel-booking-app/src/GuestLayout.jsx
  // Bottom nav: installed PWA only. Browser booking flow stays nav-free.
  const showNav = installedApp && isMobile && !isInstallPage;
```

**Redesign brief:**
- **Browser booking:** subtle top ribbon or footer — *"After booking, add to Home Screen for messages & check-in"* (not a full nav).
- **Installed:** brand-green active tab (not `#111`). Derive `paddingBottom` from nav height + safe area, not magic `110`.
- **Confirmation + `/booking` lookup:** don't highlight "Home" tab as if they're home — use neutral or no selection.
- Deliverable: **Guest App IA spec** — one page defining Home / Book / Messages for every state (no stay, active stay, post-checkout).

---

### 3.3 Confirmation page hierarchy

**File:** `hotel-booking-app/src/ConfirmationPage.jsx`  
**Lines:** 259–358

**Problem:** Install hero beats stay details. Dates/payment in collapsed `<details>`. Success animation + install CTA compete.

```277:289:hotel-booking-app/src/ConfirmationPage.jsx
        <GuestInstallCard
          ...
          variant="hero"
          headline={`Add ${hotelName} to your home screen`}
          subline="Tap below — takes 3 seconds. You'll get notified when check-in is ready and can message the front desk directly."
        />

        <details className="confirmation-details">
          <summary>Booking &amp; payment details</summary>
```

**Redesign brief:**
1. **Hero block:** "You're booked" + confirmation code + dates (always visible)
2. **Secondary:** Install CTA with 3-tab preview + one line tying install → Messages
3. **Tertiary:** collapsed payment/email extras
4. Replace emoji payment alerts in `PaymentSummary` (~21–50) with Lucide + brand surfaces
5. **"We'll call to confirm"** modal (~184–256) is strong — keep tone, unify visual system with install card

---

### 3.4 Front Desk Bookings tab — tab name lies

**File:** `guest-lodge-backend/simple-crm.html`  
**Functions:** `renderBookings()` ~3663 · `bookingCardHtml()` ~3566 · `renderMessages()` ~3447

**Problem A — empty state is onboarding, not bookings:**

```3710:3714:guest-lodge-backend/simple-crm.html
        <div style="padding:20px 0;">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:18px;font-weight:700;color:#1a1a2e;">Launch checklist</div>
            <p style="font-size:13px;color:#6b7280;...">Finish these on the <strong>Your page</strong> tab...</p>
```

**Problem B — messages hidden behind collapsed inbox:**

```3481:3486:guest-lodge-backend/simple-crm.html
  panel.innerHTML = installNudge + `
    <div style="background:#fff;...">
      <button type="button" onclick="toggleMessagesInbox()" ...>
          <span ...>💬 Guest messages</span>
```

**Problem C — booking cards don't surface reply:**

```3626:3629:guest-lodge-backend/simple-crm.html
        <div class="card-footer">
          ${phoneHref ? `<a class="btn btn-confirm" ...>📞 Call Now</a>` : ...}
          <button class="${noteBtnClass}" ...>📝 Add Note</button>
```

**Redesign brief:**
- **Pre-live:** rename or relocate "Launch checklist" — don't occupy the Bookings tab (banner on Your page, or "Setup" sub-mode).
- **Post-live empty:** "Waiting for your first booking" + share link CTA.
- **With bookings:** card stack = **Reply** (primary) · Call · Note. Thread visible inline or one tap, not collapsed by default.
- **Install nudge** (`bookingsFrontdeskNudgeHtml` ~5823): distinct **system banner**, not `.booking-card` styling — copy: *"For you: get buzzed when guests book"* vs *"Guest reservations below"*

---

### 3.5 Phones tab — two apps, one muddy tab

**File:** `guest-lodge-backend/simple-crm.html`  
**Function:** `renderAppsView()` ~8041 · headline ~8242

**Best existing copy (buried in data, not layout):**

```8056:8058:guest-lodge-backend/simple-crm.html
  const homeScreenItems = [
    { type: 'image', ... title: 'Your app and theirs — same home screen',
      caption: `You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${hName}</strong> — they tap it to book you or text you. No app store.` },
```

**Guest app screenshots to align real UI with:**

```8060:8066:guest-lodge-backend/simple-crm.html
  const guestItems = [
    { title: 'What your guests see — Home', caption: 'Their stay info — check-in time, your WiFi password, and more.' },
    { title: 'What your guests see — Book a room', ... },
    { title: 'What your guests see — Message you', ... },
```

**Redesign brief:**
- **Rename tab** → "Guest apps" or "Phones & guests" (owner-tested copy)
- **Top of tab (always visible):** side-by-side diagram — Front Desk icon | Guest hotel icon
- **Three blocks:** (1) Your alerts — install Front Desk (2) Guest installs — link/QR/stats (3) Check-in — QR
- **After owner installs:** don't demote guest section to `<details id="appsHelpFold">` (~8245)
- Reduce competing dashed "Watch how" teasers — one primary CTA per block
- Use `guestItems` captions as the **canonical guest app spec** — redesign `GuestHomePage`, `GuestMessagesPage`, `BookingPage` to match promises

---

## 4. P1 — Guest app full redesign (under-designed today)

The guest PWA is the weakest product surface. Opus should treat it as a **standalone consumer app**, not a skin on the booking engine.

### 4.1 Booking landing — first impression

**File:** `hotel-booking-app/src/BookingPage.jsx` ~66–158

```66:72:hotel-booking-app/src/BookingPage.jsx
    <div className="container">
      <header className="header">
        <p className="header-address">{hotel.address}</p>
        <h1>{hotel.name}</h1>
        <p>{hotel.subtitle}</p>
      </header>
```

**Issues:**
- No **global date strip** — dates only inside room cards; `$0 today` until checkout picked (`RoomCard.jsx` ~451)
- Header uses blue legacy styles (`index.css`) vs green guest home
- `InstallAppBanner` at footer — easy to miss; duplicates install surfaces
- Loading: plain text + spinner; empty: emoji 🏨

**Redesign brief:**
- Sticky **Dates · Nights · Edit** bar under hotel name
- Hotel header matches `GuestHomePage` greeting style (28px/800, brand green)
- Single install entry point per page (banner OR card, not both)
- Shared `EmptyState` component spec (Lucide in pale green circle)

---

### 4.2 Guest Home — two modes need two designs

**File:** `hotel-booking-app/src/GuestHomePage.jsx`

| Mode | Lines | State |
|------|-------|-------|
| Pre-book hub | 34–80 | No `guestStay.code` |
| Active stay | 198–297 | Has booking |

**Pre-book (`PreBookHub`):** only "Book a room" + "Find reservation" — doesn't explain 3-tab app.

**Active stay:** good bones (stay card, Message, Calendar) but `GuestInstallCard` sits **above** stay card (~221–229) — install competes with the thing they already have.

**Redesign brief:**
- **Pre-book:** hero explaining 3 jobs with tab icons; if installed, lean into "Book" CTA
- **Active stay:** stay card first; install only if `!isStandalone()`; add **Check-in** entry when relevant (link to `GuestCheckInPage.jsx`)
- Remove emoji empty states (~154, ~217 check-in CTA uses ✓ text)
- **Loading:** use `LoadingScreen.jsx` pattern (currently off-brand blue pulse — fix in handoff)

---

### 4.3 Messages — gated but unexplained

**File:** `hotel-booking-app/src/GuestMessagesPage.jsx` ~239–259 · compose bar ~fixed bottom 140px

**Redesign brief:**
- Empty state: visual flow *Book → Code → Messages unlock*
- Quick chips (`QUICK_CHIPS` line 8) are good — make them the hero when thread is empty
- Compose bar: use `--guest-nav-offset` CSS var (coordinate with `GuestLayout`)
- Push permission: silent today — consider soft prompt after first message sent

---

### 4.4 Find reservation — orphan path

**File:** `hotel-booking-app/src/MyBookingPage.jsx` ~71+  
**Route:** `/booking`

**Redesign brief:**
- Success state should mirror confirmation: "You're connected" + buttons to Home & Messages
- Form uses legacy blues (`#007bff`, `#15803d`) — tokenize
- Clarify relationship to magic link (`code` in URL auto-lookup ~58–61)

---

### 4.5 Check-in day — high-touch, under-linked

**File:** `hotel-booking-app/src/GuestCheckInPage.jsx` ~57–80 · WiFi/directions/messaging

**Redesign brief:**
- This is the **arrival moment** — give it a distinct "day-of" visual treatment (not generic card)
- Surface from: confirmation, Home banner, push notification copy
- Inline styles throughout — candidate for first extracted guest component set

---

### 4.6 Install surfaces — unify 4 into 1 system

**Files:**
- `guestInstallUi.jsx` — `INSTALL_THEME`, `IosInstallSheet`, `HotelIcon`
- `GuestInstallCard.jsx` — `hero` | `card` variants
- `InstallAppBanner.jsx` — booking footer duplicate
- `InstallPage.jsx` — `/install` standalone

**Touchpoints today:** booking footer, confirmation hero, guest home card, messages, owner `?scroll=install`

**Redesign brief — deliver `GuestInstallPrompt` spec:**
| Variant | Where | Job |
|---------|-------|-----|
| `hero` | Confirmation | Primary post-booking CTA |
| `inline` | Guest home, messages | Secondary reminder |
| `compact` | Booking footer | One-line teaser |
| `page` | `/install` | Full instructions + QR |

Shared copy config per `touchpoint`. Mobile `<400px`: stack vertically, "Maybe later" not `×`. Android: never dead disabled button — show manual steps (`InstallPage.jsx`).

---

### 4.7 Calendar & room cards — core commerce UX

**Files:** `CalendarModal.jsx` (~230 month nav `<` `>`) · `RoomCard.jsx` (~47 emoji upload, ~451 pricing)

**Redesign brief:**
- Calendar: brand green owns selection (not `#3b82f6` / `#28a745` in `index.css` ~5141–5211)
- Lucide chevrons; replace `alert()` validation with inline message
- Room card: amenity modal, photo carousel, pricing states — one coherent card system
- **Pay-at-check-in** messaging should match confirmation and owner `pay-chip` copy

---

### 4.8 Checkout form — 1400 lines of trust UX

**File:** `hotel-booking-app/src/GuestInfoPage.jsx` (full file)

**Beyond §3.1, Opus should redesign:**
- Payment step layout (Klarna/wallet boxes ~2182–2268 — off-brand pinks)
- Freemium gate overlay ~1382–1406 ("Go live to accept bookings" — guest-facing, confusing)
- Sticky CTA bar — sticky or not? safe-area?
- Card decline recovery modal ~1456–1525 — excellent content, unify with confirmation call modal
- All focus rings blue → brand (see `DESIGN-HANDOFF.md` §5.6)

---

## 5. P1 — Front Desk operator UX

### 5.1 Navigation IA — desktop/mobile split brain

**File:** `simple-crm.html` ~1891–1934

| Desktop tabs | Mobile nav |
|--------------|------------|
| Your page, Bookings, Phones | + Availability, Revenue |

Mobile labels "Your page" (globe); desktop tab says "Your page" but code uses `settings` filter. **Revenue hidden** unless enabled (~3785).

**Redesign brief — DECIDED (D7, D6):** One nav model, **same 5 destinations on desktop and mobile** — Bookings · Availability · Revenue · Phones · Your page — and **default to Bookings**, not "Your page." Desktop currently can't reach Availability/Revenue at all; that's a defect, not a layout preference. Don't bury them inside Your page. See §1C / §1D.6.

---

### 5.2 Your page — owner edits public guest experience

**Containers:** `#settingsView` ~2628 · `#editView` ~2637 · room cards with emoji 📷 🗑

**Conceptual split owners don't understand:**
- **Your page** = what guests see (photos, rates, copy)
- **Availability** = inventory calendar (mobile only today)
- Copy at ~2680 tries to explain but UI doesn't reinforce

**Redesign brief:**
- Your page = **"Guest-facing"** section label
- Preview button: open booking site in context
- Room editor: Lucide icons, match guest `RoomCard` preview

---

### 5.3 Go-live & preview mode — anxiety moment

**Functions:** `goLiveBannerHtml()` ~2813 · `goLiveInlineCardHtml()` ~2823 · guest `GuestInfoPage` freemium gate ~1382

**Problem:** Guests can hit checkout on unsubscribed hotels and see owner "Activate $99/mo" — catastrophic trust break.

**Redesign brief — DECIDED (D16):**
- **Guest-facing: the guest NEVER sees owner billing.** On an unsubscribed hotel, show a clean guest "Preview — booking opens soon" (or block checkout entirely) — never the owner "Activate $99/mo" surface. A guest seeing owner pricing is a catastrophic trust break.
- **Owner-facing: ONE go-live pattern.** Today there are three (banner `goLiveBannerHtml` ~2813, inline card `goLiveInlineCardHtml` ~2823, and a bookings-tab card). Collapse to a single component; soften the lock framing per D19.
- Post-activation modal ~5775: good content, unify with the one tour/modal system (D9).

---

### 5.4 Bookings filters — hidden on mobile

**Code:** `needs-call` / `called` filters exist; mobile collapses to single Bookings bucket (~3803–3807)

**Redesign brief:**
- "Needs call" is core workflow — badge on tab (partially exists `countNeedsCalled`) + filter chips at top of list
- Phone number 15px on mobile (~317–331 CSS) — design ≥18px, Lucide CTAs

---

### 5.5 Onboarding questionnaire → welcome → settings tour

**Lines:** questionnaire ~5547–5594 · welcome ~5613+ · settings tour ~5990+ · post-activation ~5688 · apps tour ~8319

**Redesign brief:**
- **One tour/modal system** — overlay, radius 20px, step counter, skip placement
- Questionnaire: full-screen green gradient is fine — migrate buttons to token classes, not inline `style.background` mutation on select
- **"How it works"** reloads page after clearing localStorage — redesign as in-app replay
- Reduce tour count or chain into single progressive onboarding

---

### 5.6 Login — staff context missing

**File:** `simple-crm.html` ~1856–1868 (HTML) · login CSS ~44–100

**Redesign brief:**
- Show **hotel name** + "Staff login"
- PIN input: left-aligned or segmented boxes (not OTP-style centered tracking)
- Magic link: secondary card step, not inline expando with duplicate green buttons

---

### 5.7 Header crowding (mobile)

**~1881–1887 header · statNew hidden mobile ~1603**

**Redesign brief:** Overflow menu; keep one primary action; "Needs call" as chip/badge visible on mobile

---

## 6. P2 — Supporting surfaces (Opus if time)

### 6.1 Owner setup wizard
**File:** `guest-lodge-backend/setup.html` — reference-grade tokens; use as visual source of truth for onboarding flows.

### 6.2 Marketing landing
**File:** `landing-page/index.html` — emoji feature icons (📱🔔💳); swap Lucide. Near-duplicate `guest-lodge-backend/landing.html` — de-dupe.

### 6.3 Welcome email
**File:** `guest-lodge-backend/email-templates/welcome.html` ~42–45 — PIN block off-brand blue `#f0f4ff`; recolor to green. Emoji OK in email.

### 6.4 Stripe return
**File:** `hotel-booking-app/src/CheckoutReturnPage.jsx` ~83–111 — inline styles, error/success colors off-brand; first paint after payment.

### 6.5 Availability / Revenue (mobile-only views)
**Functions:** `renderAvailabilityView()` · `renderRevenueView()` — divergent palettes, emoji edit buttons. Lower priority unless promoted to desktop.

### 6.6 `availability-simple.html` (root)
Standalone internal tool — different green `#2d6a4f`. Only align if it becomes customer-facing.

---

## 7. Emotional & trust moments (Opus narrative design)

These are where **copy + visual hierarchy** matter more than tokens.

| Moment | File | Design goal |
|--------|------|-------------|
| Card hold explanation | `GuestInfoPage` why-card modal ~1421 | Reduce payment anxiety; add post-booking destination |
| "We'll call to confirm" | `ConfirmationPage` ~197 · `GuestInfoPage` decline ~1469 | Reassure without feeling like failure |
| Pay at check-in | `bookingCardHtml` pay-chip ~3581 · guest confirmation | Same language both sides |
| First booking (owner) | `renderBookings` empty ~3694 | Celebrate + show exactly where thread will appear |
| Guest first message | `GuestMessagesPage` | Owner reply path obvious in Bookings |
| Check-in day | `GuestCheckInPage` | Warm, human, "you're here" |
| Dual app install | `renderAppsView` | Owner pride — "your brand on their phone" |

---

## 8. Opus deliverables checklist

Several of these are **pre-seeded** in §1B–§1E (journeys, decisions, wireframes, copy matrix) — your job is to take them from ASCII intent to pixel-level mocks, not to re-derive them.

- [ ] **Journey map** — guest + owner ✦ *spine in §1B; expand to visual swimlane incl. the seam*
- [ ] **Guest App IA** — Home / Book / Messages, all states ✦ *model decided in §1C (D11) — produce the state matrix*
- [ ] **Phones tab wireframe** — dual-app diagram + 3 blocks ✦ *ASCII in §1D.2 → mock*
- [ ] **Bookings tab wireframe** — pre-live vs post-live vs active ✦ *ASCII in §1D.6 → mock*
- [ ] **Confirmation page** — hierarchy mock (stay > install > details) ✦ *ASCII in §1D.1 → mock*
- [ ] **Checkout** — honest 3-step + trust block + "What happens next" ✦ *ASCII in §1D.4 → mock*
- [ ] **`GuestInstallPrompt`** — 4 variants + copy matrix ✦ *copy matrix done in §1E.1; design the variants*
- [ ] **Tour/modal system** — one component spec (D9)
- [ ] **Token sheet** — from `DESIGN-HANDOFF.md` §4, finalized (one-green per D1)
- [ ] **Component list** — `EmptyState`, `StayCard`, `BookingCard`, `ReplyThread`, `DualAppDiagram`, `TrustBlock`, `DateStrip`

---

## 9. File index (zero search)

| # | Surface | File | Function / area | ~Line |
|---|---------|------|---------------|-------|
| 1 | Guest checkout | `hotel-booking-app/src/GuestInfoPage.jsx` | progress, modals, payment | 1540, 1411, 1382 |
| 2 | Guest nav | `hotel-booking-app/src/GuestLayout.jsx` | `NAV_TABS`, `showNav` | 7, 68 |
| 3 | Guest home | `hotel-booking-app/src/GuestHomePage.jsx` | `PreBookHub`, stay card | 34, 198 |
| 4 | Guest messages | `hotel-booking-app/src/GuestMessagesPage.jsx` | no-code gate, compose | 239, 8 |
| 5 | Guest confirm | `hotel-booking-app/src/ConfirmationPage.jsx` | install-first layout | 259 |
| 6 | Guest lookup | `hotel-booking-app/src/MyBookingPage.jsx` | find reservation | 71 |
| 7 | Guest check-in | `hotel-booking-app/src/GuestCheckInPage.jsx` | arrival day | 57 |
| 8 | Guest booking | `hotel-booking-app/src/BookingPage.jsx` | landing, rooms | 66 |
| 9 | Room card | `hotel-booking-app/src/RoomCard.jsx` | pricing, photos | 47, 451 |
| 10 | Calendar | `hotel-booking-app/src/CalendarModal.jsx` | date picker | 230 |
| 11 | Install system | `hotel-booking-app/src/guestInstallUi.jsx` | theme, iOS sheet | 1 |
| 12 | Install card | `hotel-booking-app/src/GuestInstallCard.jsx` | hero/card | 119 |
| 13 | Install page | `hotel-booking-app/src/InstallPage.jsx` | `/install` | 19 |
| 14 | Install banner | `hotel-booking-app/src/InstallAppBanner.jsx` | booking footer | 1 |
| 15 | Stripe return | `hotel-booking-app/src/CheckoutReturnPage.jsx` | post-payment | 83 |
| 16 | Guest CSS | `hotel-booking-app/src/index.css` | legacy tokens | 11 |
| 17 | FD bookings | `simple-crm.html` | `renderBookings`, `bookingCardHtml` | 3663, 3566 |
| 18 | FD messages | `simple-crm.html` | `renderMessages` | 3447 |
| 19 | FD install nudge | `simple-crm.html` | `bookingsFrontdeskNudgeHtml` | 5823 |
| 20 | FD phones | `simple-crm.html` | `renderAppsView` | 8041 |
| 21 | FD go-live | `simple-crm.html` | `goLiveBannerHtml` | 2813 |
| 22 | FD onboarding | `simple-crm.html` | questionnaire | 5547 |
| 23 | FD login | `simple-crm.html` | `#loginScreen` | 1856 |
| 24 | FD nav | `simple-crm.html` | tabs + mobile nav | 1891 |
| 25 | FD your page | `simple-crm.html` | `#settingsView`, `#editView` | 2628 |
| 26 | Setup wizard | `guest-lodge-backend/setup.html` | tokens reference | 10 |
| 27 | Marketing | `landing-page/index.html` | public site | 10 |
| 28 | Welcome email | `email-templates/welcome.html` | PIN block | 42 |
| 29 | Token audit | `DESIGN-HANDOFF.md` | full polish list | all |
| 30 | PWA icon API | `guest-lodge-backend/server.js` | `guest-app-icon.png` | ~5883 |

---

## 10. Snippet appendix — copy & code anchors

### Guest progress step ghost (fix in design + code)
```javascript
// GuestInfoPage.jsx — payment is step 4 in code, step 3 in UI
const paymentStep = 4;  // ~line 398
```

### Guest nav only when installed
```javascript
const showNav = installedApp && isMobile && !isInstallPage;  // GuestLayout.jsx:70
```

### Owner booking card — no reply CTA
```javascript
// bookingCardHtml — footer only Call + Note, ~3626
${phoneHref ? `<a class="btn btn-confirm" ...>📞 Call Now</a>` : ...}
```

### Owner phones — post-install shrinks guest story
```javascript
// renderAppsView — fdInApp ternary ~8148
const appsMainHtml = fdInApp ? `...icon + broadcast + check-in...` : `...full dual-app story...`;
```

### Guest confirmation — details hidden
```jsx
<details className="confirmation-details">
  <summary>Booking &amp; payment details</summary>  // ConfirmationPage.jsx:289
```

### Dual-app caption (promote to top of Phones tab)
```javascript
caption: `You get Front Desk... Your guests get ${hName}...`  // simple-crm.html:8058
```

---

## 11. Implementation order (after design locked)

1. Token layer in `index.css` + enforce in Front Desk (`DESIGN-HANDOFF.md` §4)
2. Guest journey fixes: checkout "what's next" → confirmation hierarchy → `GuestLayout` bridge
3. `GuestInstallPrompt` unification
4. Front Desk Bookings tab restructure + reply-first cards
5. Phones tab rename + dual-app diagram
6. Tour/modal system collapse
7. Polish pass per handoff §5–§7

---

*Last updated: conversation handoff. Pair with `DESIGN-HANDOFF.md` for exhaustive token/line audits.*
