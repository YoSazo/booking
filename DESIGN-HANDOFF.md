# Design Handoff — Marketel (Guest Booking + Owner Front Desk)

> **Audience:** Opus 4.8, working screen by screen.
> **Goal:** one visual language across **browser booking → installed guest PWA → owner Front Desk**, plus clarity around the two home-screen apps (guest vs owner).
> **Scope of this doc:** the full-repo design audit — the targeted first pass (booking core + Front Desk core) **merged with** a second pass over every previously-unreviewed surface. Items new in the second pass are tagged **`[2nd-pass]`**.

---

## 0. The big picture

Two products share one domain (guest booking + owner Front Desk) but don't yet feel like one design system:

- **Guest/PWA surfaces** lean into Marketel green `#2E7D5B` and modern install UI.
- **Booking/checkout flow** still carries Bootstrap-era blue/green (`#007bff`, `#28a745`).
- **Front Desk** *has* design tokens in `:root` but tours, install cards, and modals frequently bypass them with one-off grays and inline styles.

**Central finding from the second pass:** the split isn't symmetric.
- The **guest booking app has essentially NO token system** — `hotel-booking-app/src/index.css` `:root` defines only legacy Bootstrap vars (`--primary-color: #007bff`, `--success-color: #28a745`). Brand green lives as a hardcoded `BRAND = '#2E7D5B'` JS constant passed around components. **This is the root cause of the "two products" feel.**
- **Front Desk already has a real token system** (`--green`, `--text`, `--text-muted #6B7D72`, `--border #D8E4DC`, `--green-pale`, shadows). The problem there is **bypass** — tours/modals/cards hardcode `#1a1a2e`, `#6b7280`, `#9ca3af` instead of the tokens that already exist.
- **The marketing/setup family** (`setup.html`, `landing-page/index.html`, `landing.html`, `frontdesk-demo.html`) is actually the **most consistent** part of the repo — DM Sans + `#2E7D5B` + full `--bg/--card/--border/--text/--muted/--green*/--shadow*/--r` tokens. It's a good reference for what "done" looks like.

So the work splits cleanly:
1. **Guest app** — *create* the token layer and migrate components onto it (biggest lift).
2. **Front Desk** — *enforce* the tokens that already exist; collapse modal/tour sprawl.
3. **Marketing/setup** — already close; minor convergence (emoji icons, PIN-block color, radius tokens).

---

## 1. Suggested Opus priority order

1. **Guest design-system tokens + install-prompt unification** — fixes the "two products" feel fastest. (§4 tokens, §5.1)
2. **Phones tab restructure (Front Desk)** — biggest owner confusion (dual-app story). (§6.1)
3. **Confirmation page hierarchy** — trust at the conversion moment. (§5.2)
4. **Full checkout pass `[2nd-pass]`** — `GuestInfoPage.jsx` is where money changes hands and is the most token-violating file in the app. (§5.6)
5. **Front Desk tour/modal system** — reduces visual noise across onboarding. (§6.4)
6. **Mobile layout fixes** — nav offsets, header crowding, booking date bar, safe-area. (§5.4, §6.3)
7. **Arrival + lookup + room/calendar polish `[2nd-pass]`** — high-touch guest moments. (§5.5, §5.7)

---

## 2. Deliverables that help engineering most

1. **Token sheet** — colors, type scale, spacing, radius, shadows (guest + Front Desk). Draft in §4.
2. **Component specs** — install-prompt variants, empty state, modal vs bottom sheet, tour step card.
3. **Phones tab wireframe** — the dual-app story is the biggest conceptual UX gap.
4. **Confirmation page mock** — ideal hierarchy (stay summary vs install CTA).
5. **Mobile nav spec** — guest bottom nav + Front Desk bottom nav + safe-area/toast rules.

---

## 3. Repo / build notes

- **Repo root:** `/home/sazo/BOOKING/booking`
- **Guest app:** `hotel-booking-app/src/*.jsx` + `index.css` (Vite/React).
- **Front Desk:** edit `guest-lodge-backend/simple-crm.html`, then `npm run build:frontdesk`. Production serves `public/frontdesk/` (`guest-lodge-backend/frontdesk/index.html` is the built bundle — treat as equivalent, don't hand-edit).
- **Marketing/setup/legal:** standalone HTML in `landing-page/` and `guest-lodge-backend/`.

---

## 4. Cross-cutting design system brief (draft token sheet)

The objective: **one token set**, defined once per runtime (guest CSS `:root`, Front Desk `:root`, and the marketing pages' shared `<style>`), with the **same names and values**.

### Colors
| Token | Value | Replaces (legacy / scattered) |
|---|---|---|
| `--brand` | `#2E7D5B` | bootstrap `#007bff`, hardcoded `BRAND` const, `#15803d`, `#059669`, `#047857`, `#0070f3`, `#2563eb`, `#3b82f6` focus/CTA |
| `--brand-dark` | `#1a5c3f` | `#1a5c3f` (already used in setup/landing/FD — promote to shared) |
| `--brand-muted` | `#E8F5EE` / `#eef6f1` / `#f0fdf4` | the 3 light-green backgrounds in use — pick one |
| `--brand-pale` | `#f0f7f3` | success pill bgs (`#f0f7f3`, `#ecfdf5`) |
| `--success` | decide: brand green **or** `#10b981` | bootstrap `#28a745`, `#166534`, `#15803d` |
| `--error` | `#dc2626` | `#c0392b`, `#d32f2f`, `#dc3545` (three different reds in guest app) |
| `--accent-alert` | `#e0245e` | unread-dot red (6+ instances in Front Desk) |
| `--surface` | `#ffffff` | `#fff` |
| `--surface-muted` | `#f4f7f9` / `#f8f9fa` | `#f4f7f9`, `#f8f9fa`, `#fafafa` |
| `--text` | `#1a1a2e` | `#1a1a1a`, `#1a1a2e`, `#334155` (hardcoded everywhere; FD has `--text` already) |
| `--text-muted` | `#6B7D72` | `#6b7280`, `#374151`, `#475569`, `#667`, `#4b5563` |
| `--text-soft` | `#9ca3af` | thread codes/timestamps |
| `--border` | `#D8E4DC` (FD) / `#e5e7eb` (guest) — unify | `#e5e7eb`, `#d1d5db`, `#d7dde3`, `#dee2e6`, `#e0e0e0`, `#e2e8f0` |
| `--overlay` | `rgba(26,43,34,0.55)` | backdrops: `rgba(0,0,0,0.4/0.55)`, `rgba(8,15,20,0.38)` |
| `--overlay-dark` | `#0a0f0d` | QR full-screen bg |

> **Open decision for the user/Opus:** is `--success` the brand green (one green) or a separate semantic green (two greens)? Affects confirmation amounts, checkmarks, FD success pills. Recommend **brand green** for visual unity unless red/green colorblind contrast on confirmation demands a distinct hue.

### Type
- **One font stack:** DM Sans is the de-facto brand font (setup, landing, install page, availability tool all use it). Guest app core currently mixes `Inter` + inline `system-ui` overrides. **Pick DM Sans, define once, delete inline `fontFamily` overrides** (e.g. `CheckoutReturnPage.jsx:88`).
- **Three roles:** `--font-display` / `--font-body` / `--font-caption`. Marketing landing already has a good responsive scale (`h1 clamp(34–56px)`, `h2 30px`, body `18/15/14`) — promote it.

### Radius
Scattered today: `8 / 9 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28px`. Collapse to:
`--r-sm: 8px` · `--r: 12px` · `--r-lg: 16px` · `--r-xl: 20px`. (Rooms bottom sheet `28px` → `20px`; inputs `8/10px` → `12px`.)

### Shadows
Marketing pages already have a clean 3-step scale (`--shadow` `1px 3px`, `--shadow-md` `4px 16px`, `--shadow-lg` `12px 40px`). Promote to shared.

### Z-index scale (Front Desk — currently chaotic: 240 → 260 → 10000 → 100001 → 102400)
Define: `nav 100` · `sticky 200` · `modal 1000` · `overlay 10000` · `full-screen/toast 100000`. Toasts must clear the bottom nav: `bottom: calc(88px + env(safe-area-inset-bottom))`.

### Icons
**Lucide everywhere; no emoji as UI.** Full emoji inventory in §8. (Email template is the one allowed exception — emoji are email-client-safe.)

### Mobile rules (apply globally)
`100dvh` not `100vh` · `env(safe-area-inset-*)` on every fixed/sticky element and toast · inputs `font-size: 16px` (prevents iOS zoom) · tap targets ≥ 44×44px.

---

## 5. Guest booking app — `hotel-booking-app/`

### 5.1 — P0 Install prompt fragmentation *(prior pass)*
Three near-duplicate install UIs (`GuestInstallCard.jsx`, `InstallAppBanner.jsx`, `guestInstallUi.jsx`); hero gradient vs inline card; copy varies by surface ("Book direct" vs "check-in updates").
**→ Single `GuestInstallPrompt` with `hero | inline | compact` variants + shared copy config per touchpoint.** On small screens (<400px) stack vertically: full-width CTA, "Maybe later" text link instead of `×`. Android dead-end (`InstallPage.jsx`, disabled CTA at 55% opacity when `beforeinstallprompt` missing) → manual-steps accordion or "Open in Chrome" guidance, never a dead disabled button.

### 5.2 — P0 Confirmation hierarchy *(prior pass)*
`ConfirmationPage.jsx` + `index.css`: success animation + install hero compete with stay details; dates/payment live in collapsed `<details>`; emoji alerts (🎉, ⚠️) in payment summary.
**→ Always-visible "Your stay" card** (dates, room, paid today, balance). Install as a secondary module below. Lucide + brand surfaces instead of emoji alerts.

### 5.3 — P0 Brand split (booking vs guest) *(prior pass)*
`index.css`, `BookingPage.jsx`, `ConfirmationPage.jsx`: booking uses blue `#007bff`; guest/install uses `#2E7D5B`; confirmation amounts use `#28a745`.
**→ Token file (§4); replace legacy blues/greens in booking + confirmation.** Match booking header to guest-home (28px/800 brand name, muted subtitle, `MapPin` for address, no full-width divider).

### 5.4 — P1 Mobile UX & layout *(prior pass)*
- **Date selection before rooms** (`BookingPage.jsx`, `RoomCard.jsx`): no global date bar; cards show "$0 today" until checkout picked. → **Sticky date strip** under hotel header; neutral "Choose dates to see rates" instead of `$0`.
- **Bottom nav** (`GuestLayout.jsx`): active tab generic black `#111`; magic `paddingBottom: 110`; `/final-confirmation` highlights "Home". → Brand-green active state; derive padding from nav height + safe area.
- **Messages compose offset** (`GuestMessagesPage.jsx`): hard-coded `bottom: 140px`; `100vh` not `100dvh`. → CSS var `--guest-nav-offset` + `calc()`; test iOS keyboard.

> **Token foundation that everything in §5 depends on:** `index.css:11–19` currently defines `--primary-color: #007bff`, `--success-color: #28a745`, `--accent-color: #0056b3`, `--border #dee2e6`. **This `:root` is the first thing to replace** with the §4 token set. Off-brand blues to sweep: `#007bff`/`#3b82f6`/`#2563eb` appear in `.premium-book-button`, amenity icon boxes (`#eff6ff`/`#3b82f6`), selected-dates card border, stepper hover, lightbox placeholder (`#1a2b22`/`#16213e`).

### 5.5 — Arrival, lookup, return & boot `[2nd-pass]`

**`GuestCheckInPage.jsx`** (check-in day: WiFi, directions, messaging — high-touch arrival surface)
| Pri | Issue | Direction |
|---|---|---|
| P1 | Badge text `11px`, padding `6px 10px` (< 44px tap); action-row padding cramped | Badge ≥14px / `8px 12px`; action-row padding 16px |
| P2 | Hardcoded `#f4f7f9` page bg, `#1a1a2e` title, `#6b7280` subtitle, `#f0fdf4` badge bg, `#e5e7eb`/`#374151` secondary button | Map to `--surface-muted` / `--text` / `--text-muted` / `--brand-muted` / `--border` |
| P2 | Inline `actionRow` spread-then-override (`:129`) — fragile | Extract `.action-hint` class |

**`MyBookingPage.jsx`** (find-reservation lookup)
| Pri | Issue | Direction |
|---|---|---|
| P0 | Lookup button green `#15803d` (`:106`); confirmation-code label blue `#007bff`; checkmark stroke `#28a745` (css `:1695–1715`) | All → `--brand` |
| P1 | Error text `#c0392b`; `minHeight: 60vh` can clip on mobile | `--error`; drop fixed minHeight / use `auto` |
| P2 | Inputs `#d7dde3` border, radius `10`, padding `12/13px`; secondary buttons custom `#d7e3dc`/`#f5f9f6` | `--border`, radius 12, `--brand-muted` |

**`CheckoutReturnPage.jsx` / `CheckoutReturnPageWrapper.jsx`** (Stripe post-payment — "looks broken if ugly")
| Pri | Issue | Direction |
|---|---|---|
| P0 | Error heading `#d32f2f`, success button `#15803d` | `--error`, `--brand` |
| P1 | Entire UI inline-styled (`:83–111`), hardcoded `50px` padding, no semantic markup | Extract `.payment-status/.payment-error/.payment-loading`; responsive padding |
| P2 | Inline `fontFamily: system-ui` overrides brand font; button radius `8` | Inherit font; radius 12 |

**`LoadingScreen.jsx`** (first paint)
| Pri | Issue | Direction |
|---|---|---|
| P0 | Overlay gradient dark slate `#0f172a→#1e293b`; pulse ring **blue** `rgba(59,130,246,.5)` — off-brand first impression | Brand-green radial / `rgba(46,125,91,.5)` ring |

### 5.6 — Full checkout `GuestInfoPage.jsx` (~1400 lines) `[2nd-pass]`
> Prior pass flagged *only* the progress bar (3 steps shown, payment is "step 4" in code, removed "Plan" step, `#28a745` completed color → renumber to 3, numbered circles, "Step 2 of 3 — Your details"). **This is the rest** — and it's the single most token-violating file in the app.

| Pri | Where | Issue | Direction |
|---|---|---|---|
| P0 | inputs/focus (css `:4716–4729`, jsx `:2028–2150`) | **Focus rings are blue** `#3b82f6` / `#0070f3` / `rgba(0,112,243,.1)` across every field + payment tabs (`:2688`) + card field (`:2877`) | Single `.form-field:focus` class, `--brand` ring |
| P0 | payment error (jsx `:2280–2294`) | `bg #fee` + `2px #dc3545` border + emoji `⚠️` | `--error` tokens + Lucide `AlertCircle` |
| P1 | labels/inputs (css `:4706–4736`) | `#374151` labels, `#d1d5db` border, `#9ca3af` hover, `#dc2626` `0.75rem` errors | Token-map; error ≥12px mobile |
| P1 | reassurance/verify (jsx `:2159–2335`) | `#047857` text + emoji `🔒`; verify box `#f0fdf4`/`#bbf7d0` + inline SVG; header inline SVG `#334155` | `--brand` + Lucide `Lock`/`ShieldCheck`; `--brand-muted` |
| P1 | sticky CTA (css `:2499–2576`) | `position: relative` ("never sticky") but no `safe-area-inset-bottom`; CTA shadow hardcoded green; mobile font-size unset (verify ≥16px, padding ≥18px) | Decide sticky intent + safe-area; tokenize |
| P2 | Klarna/wallet boxes (jsx `:2182–2268`) | Off-palette pinks `#fdf0f5/#f0b8cc/#cc3a6b`; wallet `#f8f9fa` | Klarna brand token-set or neutralize |
| P2 | inputs everywhere | radius `8px`; repeated inline focus styles across City/State/Zip | radius 12; extract to class |

### 5.7 — Rooms, gallery, calendar, messaging `[2nd-pass]`

**`RoomCard.jsx`**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Emoji `📷 Change photos` (`:47`); upload overlay `rgba(0,0,0,.7)`/`white`, radius `10` | Lucide `Camera`; tokenize; radius 12 |
| P1 | "$0 today" shown when `nights = 0` (`:451–457`) — no placeholder state | "Choose dates to see rates" empty state |
| P1 | Amenity modal `#D8E4DC` border + hardcoded `#2E7D5B`; edit fields `#6B7D72` labels, delete `#E05252` | Tokens (`--border`, `--brand`, `--text-muted`, `--error`) |

**`ImageLightbox.jsx`**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Shimmer placeholder dark navy `#1a2b22`/`#16213e`; nav buttons low-contrast `rgba(255,255,255,.1)`; counter `bottom: 30px` ignores safe-area | Neutral placeholder; stronger nav contrast; `env(safe-area-inset-bottom)` |

**`CalendarModal.jsx`** (core booking UX)
| Pri | Issue | Direction |
|---|---|---|
| P1 | Apply button `#28a745`; quick-book + selected-date + today indicator **blue** `#3b82f6` (css `:5141–5211`) | `--brand` owns selection + CTA |
| P1 | Month nav uses `<` `>` text glyphs (`:230–232`); validation via `alert()` (`:126`); quick-book padding `12px 16px` < 44px | Lucide `ChevronLeft/Right`; disable-with-message; bump tap target |
| P2 | Sticky header no `safe-area-inset-top` | add inset |

**`guestMessaging.jsx`**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Active chip `✓` emoji (`:131`); success `CheckCircle` uses `#28a745` on `#e8f7ee` (`:103`); error `#c0392b`; disabled send `#b8c4bd` | Lucide check; `--brand`/`--brand-muted`; `--error`; clearer disabled |

### 5.8 — P2 Polish & consistency *(prior pass)*
- **Typography:** DM Sans on install only; mixed grays. → one stack + 3 text roles (§4).
- **Empty & loading states:** emoji empties (🏨, 💬); lazy routes `Suspense fallback={null}` (blank flash). → shared `EmptyState` + `LoadingScreen` (Lucide in pale-green circle, title, subtitle, CTA).

---

## 6. Front Desk — `guest-lodge-backend/simple-crm.html`

> Front Desk **already has `:root` tokens** (`--green`, `--green-dark`, `--green-pale`, `--text`, `--text-muted #6B7D72`, `--border #D8E4DC`, `--shadow*`). Most findings below are **bypass** — hardcoding values the tokens already cover. The fix pattern is usually "replace literal with existing `var(--…)`," not "invent a token."

### 6.1 — P0 Clarity & IA (Phones tab + nav) *(prior pass)*
- **Two apps, one tab:** "Phones" mixes owner Front Desk PWA install + guest hotel-app install; similar copy on Bookings nudge + tours; owners don't understand two home-screen icons. → **Rename/restructure** (e.g. "Guest apps" with two labeled sections: "Your alerts" vs "{Hotel} for guests"); one-line diagram at top; consistent vocabulary; three always-visible blocks — (1) Check-in QR, (2) Guest install link/stats, (3) Notify guests — help accordion at bottom only.
- **Desktop vs mobile nav mismatch:** desktop 3 tabs (Your page, Bookings, Phones); mobile adds Availability + Revenue (5). Desktop has no path to calendar/revenue. → Unify IA (add the tabs on desktop, or fold Availability/Revenue into Your page with clear entry points). Note `[2nd-pass]`: mobile labels the settings tab "Your page" (globe icon) while desktop calls it "Settings" — align label + icon.

### 6.2 — P1 Operator UX on mobile *(prior pass)*
- **Login:** generic Marketel branding; centered letter-spaced PIN reads like an OTP. → Hotel name + "Staff login"; left-aligned/segmented PIN; magic link secondary.
- **Header crowding:** two rows of 11px pills (Guest QR, Refresh, How it works, Notifications); `#statNew` "Needs Call" hidden on mobile. → Overflow menu; surface "Needs call" as a Bookings badge; one primary action visible.
- **Booking card phone row:** phone shrinks to 15px on mobile; emoji `📞 Call`. → ≥18px phone, Lucide phone/message, ≥44px targets.

### 6.3 — Not-yet-reviewed surfaces `[2nd-pass]`

**"Your page" tab (editor / room cards)**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Emoji `📷 + Add Photos` / `🗑 Delete`; pencil-edit already Lucide (inconsistent) | All Lucide (`camera`/`trash`) |
| P2 | Amenity pills hardcode `#E8F5EE` + `1.5px #2E7D5B` | `--brand-muted` + `--brand` |

**Availability view** (mobile-only calendar)
| Pri | Issue | Direction |
|---|---|---|
| P1 | Day popover title/count `#1a1a2e`; room actions emoji `✎ Edit room` / `🗑 Delete room` | `var(--text)`; Lucide |
| P2 | Legend hardcodes `#FEF3C7/#FEE2E2/#f2f4f3`; step buttons `#374151`; toggle track `#D8E4DC` | Status tokens; `--text-muted`; `--border` |

**Revenue view** (mobile-only)
| Pri | Issue | Direction |
|---|---|---|
| P1 | Period buttons lack focus/disabled contrast (a11y) | WCAG-AA active state + focus ring |
| P2 | Explainer box `#f0fdf4`/`#bbf7d0`, text `#166534`/`#15803d` | success-bg/border/text tokens |

**Bookings list + card detail** (beyond the phone row)
| Pri | Issue | Direction |
|---|---|---|
| P1 | Unread dot `#e0245e` hardcoded ~6× | `--accent-alert` |
| P1 | Thread labels `#6b7280` (~45× across file), titles `#1a1a1a`/`#1a1a2e`, checklist text | `--text-muted` / `--text` |
| P2 | Codes/timestamps `#9ca3af`; "Mark read" `#d7dde3`+`#6b7280`; contact pills `#eef6f1`/`#2E7D5B` | `--text-soft`; `--border`; `--brand-muted`/`--brand` |

**Onboarding questionnaire**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Next button `background:white;color:#2E7D5B`; option buttons `rgba(255,255,255,.95)`/`#1a1a2e`; **selected state mutates `style.background` inline** instead of class toggle | Tokens; refactor to CSS class toggle |
| P2 | Overlay gradient `#1a2b22→#2E7D5B` + `rgba(255,255,255,.6)` step counter hardcoded | gradient + overlay-text tokens |

**Go-live banner/card + activated/welcome modals + post-activation tour**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Welcome `🏨` + `#6b7280` text + `#1a1a2e`/`#1a5c3f`; activated checkmarks `#2E7D5B` + pill text `#1a1a2e`; go-live button `white`/`#1a5c3f` | `--text`/`--text-muted`/`--brand`/`--brand-dark` |
| P1 | Tour tooltip `#1a1a2e`/`#fff` + custom shadow; backdrops inconsistent (`rgba(0,0,0,.55)` vs notes `rgba(26,43,34,.45)`) | One `--overlay` token; shared tooltip class |
| P2 | Go-live gradient duplicated inline in banner + card (DRY) | shared `.go-live-banner` class |

**Amenity-picker / logo-gate / QR modals**
| Pri | Issue | Direction |
|---|---|---|
| P1 | Amenity modal inputs `#e5e7eb`, Done `#2E7D5B`, Cancel `#6b7280`; logo-gate primary `#1a1a2e`, skip `#9ca3af`; QR mode buttons `#1a5c3f`/`rgba(255,255,255,.12)` | tokens throughout |
| P2 | Selected amenity pill mutates `style.borderColor` inline | CSS class toggle |

### 6.4 — P2 Tour/Modal system & patterns *(prior pass + `[2nd-pass]` reinforcement)*
- **Tour/modal sprawl:** 4+ visual languages (green questionnaire, white cards w/ `#1a1a2e`, dark tooltips, black apps lightbox). Notes/rooms modals use tokens; tours don't. → **One Tour/Modal spec:** overlay, radius `20px`, title/body/button tokens, step counter, skip placement; migrate hardcoded grays to `--text`/`--text-muted`.
- **Modal/sheet inconsistency:** notes centered `16px`; rooms bottom sheet `28px` (+ backdrop `rgba(8,15,20,.38)`); iOS install inline styles; QR full-screen. → **Two patterns only:** center dialog (forms) + bottom sheet (mobile instructional, `20px`), same close button/padding/hierarchy, one `--overlay` backdrop.
- **Install/broadcast styling:** broadcast card `#1a1a1a`/`#6b7280`; multiple dashed-border video teasers compete with primary CTAs. → tokenize to `.apps-step-card`; one primary CTA per section; video as ghost secondary.
- **Toasts vs bottom nav:** toasts at `bottom: 20px` don't offset for nav + safe-area (can sit under pill nav). → `bottom: calc(88px + env(safe-area-inset-bottom))`; adopt z-index scale (§4).

---

## 7. Marketing / setup / admin / legal `[2nd-pass]`

Scope tags: **`[unify]`** = bring onto the shared system · **`[lower-priority]`** = intentional standalone / leave unless touched.

| File | Scope | State | Action |
|---|---|---|---|
| `guest-lodge-backend/setup.html` | **[unify]** | **Reference-grade** — DM Sans, full tokens (`--bg/--card/--border/--text/--muted/--green*/--shadow*/--r:16px`) | Promote its token block as the shared source of truth; add type-scale tokens |
| `landing-page/index.html` | **[unify]** | Strong tokens + responsive type scale; **but emoji feature icons** (📱🔔💳📋🌐📞🍎📊⚡) | Swap emoji → Lucide; drop unused `--green-bright #22c76e` |
| `guest-lodge-backend/landing.html` | **[unify]** | Minimal-but-consistent token subset; near-duplicate of the above | **De-dupe** — decide canonical landing; share one token file |
| `guest-lodge-backend/frontdesk-demo.html` | **[unify]** | DM Sans + DM Mono, good tokens; emoji `👆`/`📷`; radii scattered 8–20px | Lucide; adopt `--r` scale |
| `guest-lodge-backend/funnel.html` | **[lower-priority]** (admin) | Divergent analytics palette: `--blue/--amber/--purple` + 6 hardcoded event hues; emoji event icons; radius scatter | If kept internal, leave; if shown to owners, define a sanctioned **data-viz** sub-palette |
| `guest-lodge-backend/email-templates/welcome.html` | **[unify]** | **PIN block off-brand blue** `#f0f4ff` / `#c7d2fe` (green block is fine); system font + emoji are correctly email-safe | Recolor PIN block to `--brand-muted`/`--brand`; keep system font + emoji (email constraint) |
| `availability-simple.html` (root) | **[lower-priority]** | Standalone tool — **non-brand green `#2d6a4f`**, warm taupe bg `#f5f2ee`, DM Sans + DM Mono, dashed editable fields | Treat as intentional sub-brand; only align if it becomes guest/owner-facing |
| `guest-lodge-backend/privacy.html` | **[lower-priority]** | Neutral + `#2E7D5B` links — legal-appropriate | Leave |
| `guest-lodge-backend/terms.html` | **[lower-priority]** | Identical to privacy | Leave |

---

## 8. Appendix — emoji-as-UI inventory (replace with Lucide)

**Guest app:** 🎉 ⚠️ (confirmation alerts) · 🏨 💬 (empty states) · 📷 (RoomCard upload) · ✓ (messaging chip) · 🔒 (checkout reassurance) · 📞 (booking/contact).
**Front Desk (`simple-crm.html`):** 📷 🗑 ✎ 🏨 🎉 🔒 🔔 💬 ✉️ 📞 (≈10 distinct).
**Marketing:** 📱 🔔 💳 📋 🌐 📞 🍎 📊 ⚡ (landing) · 👆 📷 (frontdesk-demo) · 👁 📧 1️⃣–4️⃣ 🏨 🖱 ✅ (funnel).
**Allowed exception:** `welcome.html` email (🎉 ✏️ 📷) — email clients don't render icon fonts/SVG reliably.

## 9. Appendix — what this audit did *not* deeply cover
- Desktop-wide Front Desk layouts (audit skewed mobile).
- `install-page-redesign (1).html` if present (a mock/reference file — Opus may use or ignore).
- `marketel-telemetry.js` (analytics, not UI).
- The three `tmp_rovodev_*` working copies of the repo (use `BOOKING/booking` as canonical).
