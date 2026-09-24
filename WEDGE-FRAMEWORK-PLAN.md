# Wedge framework — build plan (for Codex)

Goal: a new Marketel wedge (a new audience on an existing engine, e.g. Claims →
landlord move-outs) goes from a one-paragraph brief to live on the web and in
the app in **a few hours**, and it comes out with every piece of polish Claims
has today, without anyone remembering to add it.

Three layers:

1. **The framework doc** (`docs/wedges/FRAMEWORK.md`). The rules any person or
   LLM reads before building anything in Marketel: design, tap feedback,
   transitions, copy, funnel, payments, App Store, testing. `AGENTS.md` and
   `CLAUDE.md` at the repo root point to it, so every agent reads it first.
2. **The engine and wedge manifests.** One shared engine (today's
   `public/inspect/inspect.js` + `inspect.js` on the server) and one file per
   wedge (`wedges/<id>.js`) holding everything that makes a wedge itself. No
   wedge-specific `if` statements in the engine, only capability switches.
3. **Checks.** Browser suites and a lint that run for every wedge
   automatically, plus generated screenshots and a demo recording per wedge.

Out of scope: new engines (scheduling, booking, payments between users). A
wedge that needs a capability the engine lacks is an engine change first,
then a manifest.

---

## Ground rules for doing this work

- **Work on a branch** (`wedge-framework`). A push to `main` deploys
  `bookmarketel.com` immediately (Render), and Claims is live with ads and an
  App Store review in flight. Merge only with every suite green.
- **Zero behaviour change for Claims, Inspect and Incident.** The refactor is
  proven by the suites passing identically before and after, and by the
  screenshots matching.
- **Mirrors.** `guest-lodge-backend/public/inspect/*` must be byte-identical
  to `marketel-frontdesk-ios/www/inspect/*`, and the `?v=` cache version is
  bumped in both `index.html` files on every client change. The app loads its
  own bundled copy, so a client change only reaches the phone through a new
  TestFlight build:
  `gh workflow run release-marketel-ios.yml --ref main -f upload_to_testflight=true -f signing_style=manual`
  (build number = 1000 + run number).
- **Migrations.** Render does not run `prisma migrate deploy`. Avoid schema
  changes; if one is unavoidable, it is applied by hand before the deploy.
- `npm test` in `guest-lodge-backend` (294 tests) and
  `npm run verify:release` in `marketel-frontdesk-ios` must pass on every
  commit.

---

## Phase 0 — Rebuild the browser suites in the repo (do this first)

The suites that guarded every change this month lived in a temp folder and
were lost. Only `guest-lodge-backend/test/browser/plans.js` survives; copy its
harness style. Put them in `guest-lodge-backend/test/browser/` with a shared
helper, and add `playwright-core@1.27.1` as a devDependency plus an
`npm run test:browser` script. Playwright 1.27.1 with its cached Chromium is
what runs on the dev machine; WebKit cannot launch there.

**Shared helper (`test/browser/harness.js`):**
- `page.route('http://app.test/**')` serves the web build
  (`public/inspect`) or the app build (`marketel-frontdesk-ios/www`). For the
  app build, replace line 1 of `inspect/inspect.js` with
  `const native = true;` and rewrite `svh` to `vh` in CSS and HTML.
- A fake `window.webkit.messageHandlers.marketelShell` that records every
  message (`inspectState`, `inspectCamera`, `openPurchase`, `inspectHaptic`,
  `inspectExportPDF`…). It answers `inspectStorefront` with a configurable
  country.
- An in-memory API mock for `https://bookmarketel.com/api/inspect/**`:
  account, reports CRUD, photos (a JPEG), finalize, share, rewrite (with
  delay), properties, checkout, billing, events. Options: slow list, slow
  account, refuse delete.
- **iOS realism** (Chromium is not WebKit, and bugs slipped through because of
  it):
  - iPhone never focuses a tapped button. Block it with
    `mousedown` → `preventDefault` on buttons.
  - `:active` needs a touch listener on iOS; press feedback must use the
    `.is-pressed` class.
  - Blob URLs can die on the phone. Test photo repair by pointing an
    `img[data-photo]` at a dead blob URL.
- A viewport of 390×844 by default.

**Suites to rebuild.** Each one is parametrised over every manifest, where
that makes sense.

| Suite | Covers |
|---|---|
| `demo.js` (was sim.js) | Web demo: images preloaded, one photo, dictation speed, the preview, the email wall. The trial copy ("Start 3 days free →", "$0 today…"). The keep-free path. The CTA tap sends `SimCheckoutTapped` (Meta InitiateCheckout), then the checkout redirect. |
| `landing.js` (was golden.js) | Landing → setup → reveal with the wedge's copy (`golden` block). |
| `app-flow.js` (was appflow.js) | All app scenarios, listed below. |
| `camera.js` | Native camera screen: room chips, "+ another room", the strip with per-photo times, the Before thumbnail and page, the mic, closing. |
| `matrix.js` | Every tab × state (signed in or out, empty or full, cached or not) shows a real page, never a bare "Loading…", with no page errors. |
| `entries.js` | Entry-based findings ("Finding 1") for wedges with `unit: 'entry'`. |
| `plans.js` | Exists already: See plans on Reports and in the account sheet, US storefront only, and the checkout carries the tool. |
| `prod-smoke.js` | Production web demo end to end (read-only). |
| `review-walk.mjs` | Production API walk with the App Review account (`INSPECT_REVIEW_EMAIL`/`INSPECT_REVIEW_CODE`): property, check-in, damage report with a photo and a receipt, polish, send with a credit, private link (before/after, receipts), PDF. It deletes everything it made. |

**App-flow scenarios.** Each must be an assertion, not just a click-through.

1. Signing in replaces the landing at once. The shell is told
   `authenticated: true` from the first message with a saved session, and
   there is never a "Sign in" flash.
2. A cold start shows the Reports layout (skeleton rows), never the giant
   logo. An empty account is a real page with one start button, and nothing
   auto-starts. Opening and closing "Which rental?" returns to it, never a
   stuck loader. A tap during startup is not undone when startup finishes.
3. New Report opens the setup card and stays on that tab. The setup card
   offers saved properties as one-tap chips.
4. Properties: add one on its own, delete one (optimistic, and it rolls back
   if refused), singular noun ("+ New property"), dates in words ("Last
   damage report Sep 23, 2026", never an ISO date).
5. Paying opens the default browser (`openPurchase`), never an in-app sheet.
   The return page says what happened and links back into the app.
6. Check in a unit (photos only, no mic or note, free), then a damage report
   against it. The report shows Before/After pairs by room name. Photos carry
   taken/received captions.
7. Photos upload in the background right after capture. Send does not upload
   again.
8. The name is asked once, inline at Send, never sending you back. The
   signature is drawn once, then "Sign as {name}" is one tap. The guest
   signature is a quiet ask.
9. Receipts sit under their own heading. The filing deadline shows on the
   send sheet ("File by Oct 7 — 14 days after check-out…").
10. Deleting a report folds the row away with one message and no reload flash,
    and puts it back with the reason if refused.
11. Tap feedback:
    - every button dips (`.is-pressed`), even on a quick tap;
    - slow buttons show a spinner even though the button was never focused;
    - messages show above an open sheet;
    - finished actions give a success haptic.
12. PDF: the button stays busy until the native share sheet is up (`shown`),
    and it never claims "downloaded" in the app.
13. Private link: "Your private link is ready." Copy link turns into "Copied ✓".
14. Polish: "Use this wording" or "Keep mine". Using it flashes the note and
    says "Note updated."
15. A photo that fails to load is repaired from the phone or the server. A
    sent report swaps to the server's dated copies.
16. A finished report sits under Reports, not New Report. New Report after
    sending starts fresh. Closing that card returns to the sent report with its
    photos intact.

**Done when:** every suite passes on today's `main` before any refactor
starts. That is the baseline the refactor must keep green.

---

## Phase 1 — The framework doc

Create `docs/wedges/FRAMEWORK.md`. Add `AGENTS.md` and `CLAUDE.md` at the
repo root, each saying in its first lines:

> Before building or changing any Marketel product surface, read
> `docs/wedges/FRAMEWORK.md`. Before building a wedge, follow its "Building a
> wedge" checklist.

The doc's sections, with the rules below written out in full.

### 1. What a Marketel product is
Dead simple is the moat, along with distribution. Every screen is one clear
job. Three taps to value. When in doubt, remove.

### 2. Design reference
- **The report engine** looks like Claims. Look at the running app and
  `public/inspect/inspect.css` before designing anything new.
- **Other engines** look like Front Desk (`marketel-frontdesk-ios/www/frontdesk`,
  tokens in `DESIGN-HANDOFF.md` §4).
- **Tokens** (from `inspect.css` `:root`):
  - colours: `--green #2e7d5b`, `--green-dark #245f46`, `--green-light #4caf7d`,
    `--green-pale #e8f5ee`, `--muted #6b7d72`, `--border #d8e4dc`,
    `--surface #fff`;
  - page background `#eff4f0`, text `#1a2b22`;
  - font DM Sans; the Marketel wordmark is the serif SVG.
- **Chrome:** the header pill reads "Marketel {Product}" with a ••• menu. The
  native tab bar has three tabs: {list}, New {doc} / In Progress, {places}.
- **Components:** cards (24px radius), primary, secondary and quiet buttons,
  bottom sheets (`<dialog>`), toasts, skeleton rows, chips.
- **Layout:** built for 390px width. Nothing sits under the floating tab bar
  or header at rest; pad for both. No horizontal scroll.
- **Space:** if something needs half a screen, it gets its own page. Never
  squeeze it into another.

### 3. Interaction rules: every tap answers
- Every tappable thing dips on press for at least 140ms (`.is-pressed`). The
  page registers a `touchstart` listener so iOS allows `:active`.
- Anything slow runs through `run(fn)`. The tapped button shows a spinner and
  cannot be double-tapped. `tappedButton()` finds it through `window.event`,
  because iOS never focuses a tapped button.
- Every action ends somewhere obvious:
  - the right tab is selected;
  - one short message says what happened;
  - the next sensible button is in view.
- Messages must be visible over an open sheet: the popover top layer, or
  inline inside the sheet on iOS below 17.
- A button that hands off to the native side stays busy until the native side
  confirms. Example: the PDF waits for `marketelInspectExportResult('shown')`.
- A copy button turns into "Copied ✓". Finished things give
  `haptic('success')`.
- Every modal choice has a plain way out ("Keep mine", "I'll send it later").

### 4. Transitions: before, during and after every action
- Keep what is on screen until the next thing is ready. Never swap a page for
  a bare "Loading…"; show the destination's layout with skeleton rows.
- A saved session is signed in from the first frame. Only a real 401 signs
  out, and it is double-checked against `/account` first.
- Cold start: the list layout at once. The big logo appears only in the
  seconds right after signing in. An empty account gets a real empty page;
  nothing auto-starts.
- Deletes are optimistic: fold the row away, then roll back with the reason
  if refused.
- Back and close always land on a real page, never a placeholder
  (`flowScreen` redraws if its origin was loading).
- A finished item belongs to its list tab. The New tab always starts
  something new.
- Check before/during/after for:
  - cold start (signed in or out, empty account);
  - tab switches with and without cache;
  - overlays opening and closing;
  - deletes;
  - sign-in and sign-out;
  - leaving the app and coming back.

### 5. Ask once, remember, never block late
- Name, signature, business and properties are asked for once and remembered
  on the device.
- Default from what is already known. Example: event time comes from the
  first photo.
- Nothing sends you back to a screen you already left when you press Send.
  Ask inline.
- Name inputs use `autocorrect="off" spellcheck="false" autocapitalize="words"`.

### 6. Capture
- The capture screen stays simple: the camera, plus voice as the
  centrepiece. No shot checklists, no prompts, no toggles.
- Photos upload in the background as they are taken (`syncPhotosSoon`).
  Offline capture still works.
- Every photo is dated:
  - the taken and received times travel in `document.photoTimes`;
  - the server stamps the display copy (`stampPhoto`); receipts are not
    stamped;
  - originals are kept as received.
- Images carry `data-photo` so a failed load is repaired. A sent report
  shows the server's dated copies.

### 7. Copy
- Plain words, sentence case, capitals where a sentence starts.
- Dates in words ("Sep 23, 2026") and 12-hour times. Put a non-breaking space
  between the time and AM/PM.
- No other product's words leak ("Inspect" in Claims, "damage" in a wedge
  that isn't about damage).
- Honest claims. Evidence, never guarantees: never "win your claim" or "get
  your money back". Each document type has a disclaimer.

### 8. Funnel, payments and Meta
- **One account and one plan across every tool:** $25/month or $199/year,
  unlimited with fair use of 300 a month. There are no per-wedge Stripe
  products.
- **Offer modes:**
  - `pay-at-export`: free to build, a plan to send. Claims uses it.
  - `first-free`: one free report.
- **The web demo** sells readiness with a simulation, then the email wall,
  then a 3-day trial (`SIM_TRIAL_DAYS`, card upfront, only for accounts that
  never subscribed). Server and client copy must agree; a test enforces it.
- **Meta:**
  - InitiateCheckout fires on the demo CTA tap (`SimCheckoutTapped`, with a
    deduplicating `eventId`);
  - StartTrial and Purchase come from the server;
  - app purchases are never sent (`metadata.source='app'`);
  - owner and test emails are excluded, with plus-aliases normalised.
- **In the app:**
  - paying opens the default browser, in the US storefront only;
  - outside the US, no prices, links or "you need a plan" wording;
  - Manage subscription opens the Stripe billing portal (US only).

### 9. App Store
- The listing, review notes and privacy labels live in
  `marketel-frontdesk-ios/app-store/`.
- The review account signs in with a fixed code and gets 25 report credits
  on every sign-in.
- Keywords never use other companies' trademarks.
- Every live wedge is listed in the review notes' "What to test".

### 10. Testing
- `npm test`, `npm run test:browser` and `npm run verify:release` must pass.
- Add a browser check for every new behaviour, including the path where it
  fails.
- Chromium passing is not the phone passing. Simulate iOS (no focus on tap,
  dead blobs) and look at real phone screenshots when something is visual.

### 11. Building a wedge (the checklist LLMs follow)
The Phase 4 workflow, step by step.

**Done when:** the doc exists and each rule links to the code that
implements it (function names). `AGENTS.md` and `CLAUDE.md` point to it.

---

## Phase 2 — Wedge manifests (move config, no behaviour change)

Today one wedge's settings are spread across about a dozen places:

- **Client, `public/inspect/inspect.js`:**
  - `WEDGES` (per document type), `SIGNER_ROLES`, `ROLE_LABELS`, `TYPE_LABELS`;
  - `SKIN` defaults, `LANDING_ARMS` (skin, golden copy, demo lines);
  - `SIMS` (demo findings), `TOOL_TYPES`, `TOOL_LIST_TYPES`;
  - `documentFileName`, `toolOffer` / `payAtExport`, `PLANS` points.
- **Server, `guest-lodge-backend/inspect.js`:**
  - `TOOLS`, `TYPE_LABELS`, `ROLE_LABELS`, `DOCUMENT_IDENTITY`;
  - signature roles, `REPORT_TYPES`, `SIM_EVENTS`.
- **`guest-lodge-backend/server.js`:** `INSPECT_ARMS` (terms pages).
- **`marketel-frontdesk-ios/www/index.html`:** the product chooser (buttons
  with `data-product`, the `products` list, `names`).

Move all of it into one file per tool: `guest-lodge-backend/wedges/claims.js`,
`inspect.js` and `incident.js`.

**Manifest shape** (write a validator for it; plain JS, no new dependency):

```js
module.exports = {
  id: 'claims',                 // URL /claims, arm key, tool id
  product: 'Claims',            // "Marketel Claims"
  status: 'live',               // live | hidden (off the app menu) | draft (web only, noindex)
  chooser: 'Record damage and keep the original uploaded photos.',
  offer: { mode: 'pay-at-export' },      // or 'first-free'
  listTypes: ['damage'],                 // what Reports lists
  types: {
    damage: {
      label: 'Damage report', brand: 'MARKETEL CLAIMS', file: 'damage-report.pdf',
      unit: 'entry',                     // 'entry' (Finding N) | 'room'
      seeds: ['Kitchen', 'Bathroom', /* … */],
      eyebrow: 'New damage report', dateLabel: 'Date you found the damage',
      signers: { manager: 'owner', other: 'guest' },
      disclaimer: 'A dated record of damage as observed. …',
      can: {                             // capability switches (Phase 3)
        location: false, issueToggle: false, receipts: true, originals: true,
        shareable: true, eventTime: 'first-photo', eventWord: 'found',
        baseline: 'check-in',
        deadline: { days: 14, from: 'checkoutDate', field: 'Guest checked out',
          text: '14 days after check-out, or before the next guest arrives' },
        signerHint: 'Optional. A signature is rarely available after a guest has left.',
      },
    },
    'check-in': { label: 'Check-in record', /* …, */ can: { photosOnly: true, free: true, sendable: false } },
  },
  skin: { /* nav labels, headings, places noun, offer heading/anchor/points, terms */ },
  landing: { /* eyebrow, title, lede, golden: headline/sub/cta/note/proof/jobTitle/… */ },
  demo: { said: '…', note: '…', heading: '…', property: '…', unit: '…',
          findings: [{ id, label, room, photo, said, note }] },   // photos in public/inspect/sample/
  appStore: { captions: ['Snap the damage / Say what you see', /* … */] },
};
```

**Wiring:**
- `npm run wedges:build` generates `public/inspect/wedges.js` (a plain
  script: `window.MARKETEL_WEDGES = {…}`). It loads before `inspect.js` in
  both `index.html` files, is mirrored into `www/inspect/`, and the cache
  version is bumped. The same step regenerates the chooser buttons in
  `www/index.html` from manifests with `status: 'live'`.
- The server `require`s `wedges/*.js` directly. `TOOLS`, `REPORT_TYPES`,
  labels, identities, `INSPECT_ARMS` and routes (`/<id>`, `/<id>/terms`) are
  derived from it.
- `verify:release` fails if the generated files are stale or the mirrors
  differ.

**Done when:** the three tools are manifests, the old constants are gone or
derived, and every Phase 0 suite passes unchanged.

---

## Phase 3 — Capability switches instead of type checks

Find every place the engine asks "is this Claims / damage / incident?":

```
grep -nE "'damage'|\"damage\"|toolId\(\) ?=== ?'|type ?=== ?'(incident|check-in)'" \
  guest-lodge-backend/public/inspect/inspect.js guest-lodge-backend/inspect.js
```

There are about 40 such sites. Replace each with a capability read from the
manifest (`can.*` on the type, or a tool-level flag). The ones known:

| Behaviour today | Capability |
|---|---|
| "Issue noted" box hidden on damage (editor, preview, PDF, share page) | `can.issueToggle` |
| Event time defaults from the first photo; "found" vs "occurred" | `can.eventTime`, `can.eventWord` |
| "Guest checked out" field and `fileByText` deadline (send sheet, report rows) | `can.deadline` |
| Receipts UI, "Receipts & estimates" in preview, PDF and share page | `can.receipts` |
| Check-in buttons and lines on Properties, Before/After pairing, `baselineReportId` | `can.baseline` (on the report type) plus a check-in type with `can.photosOnly` |
| "Get the original photos" on the send sheet | `can.originals` |
| Incident records not shareable by link (server 409) | `can.shareable` |
| Location captured or not | `can.location` (exists as `location`) |
| Optional-signature hint text | `can.signerHint` |
| Check-ins free, never sent, not listed under Reports | `can.free`, `can.sendable`, `listTypes` |

**Done when:** that grep returns only manifest files, and every suite passes.
Also add a **synthetic test wedge** (`wedges/_fixture.js`, status `draft`)
that flips every capability the other way. The suites run it too, which proves
the switches are real.

---

## Phase 4 — Tooling: `wedge:new` and `wedge:check`

**`npm run wedge:new -- <id>`**
- Scaffolds `wedges/<id>.js` from a template with every field and `TODO`
  markers.
- Creates `public/inspect/sample/<id>-*.jpg` placeholders.
- Sets `status: 'draft'`, so the web page works at `/<id>` (noindex) and the
  wedge is not in the app menu.

**`npm run wedge:check -- <id|all>`** fails loudly on:
- **Schema:** required fields, known capabilities only, types referenced
  exist.
- **Copy lint:**
  - length limits that fit 390px (headline, CTA, nav labels, chooser line,
    App Store captions of 2 lines);
  - no words from other manifests' nouns;
  - no "Inspect" outside the Inspect manifest;
  - no guarantee words (guarantee, win, get your money back);
  - sentence case and dates in words.
- **Assets:** three demo photos plus thumbs, each under 300KB.
- **Tests:** runs `npm test` and the browser suites for this wedge (web and
  app builds).
- **Artifacts** in `artifacts/wedges/<id>/`:
  - App Store screenshots at 1290×2796: the camera with dictation, the
    preview, the send sheet with the deadline, the private link with dated
    photos;
  - a 1080×1920 walkthrough recording of the demo, which is the footage UGC
    creators talk over (Playwright `recordVideo`, converted with `ffmpeg` when
    available);
  - the demo's opening frame for ads.

**Done when:** `wedge:new` plus filling the manifest plus three photos gives a
wedge that passes `wedge:check`.

---

## Phase 5 — Prove it with one real wedge

Build one new wedge end to end using only the manifest and the checklist, and
time it. Candidate: `moveout` for landlords, whose villain is a tenant
disputing the deposit. The deadline rule varies by state, so use `deadline`
with text only, no computed date, unless the brief gives a rule.

**Acceptance:**
- Under 3 hours from brief to `wedge:check` green, with no engine edits.
- It's live on the web at `/moveout` as a draft, and flipping `status` to
  `live` puts it in the app menu after one TestFlight build.
- Claims is unchanged: the suites are green, and the screenshots match the
  previous run.

---

## Per-wedge launch checklist (goes in FRAMEWORK.md §11)

1. **Brief from the owner:** audience, villain, clock or deadline, the job in
   one line, and which offer mode.
2. **Manifest:** copy, seeds, capabilities, demo findings (said and note),
   disclaimer, App Store captions. Research real complaints (Reddit,
   competitor reviews) and stay bounded to what the engine does.
3. **Three demo photos.**
4. `npm run wedge:check -- <id>` is green. Review the screenshots by eye.
5. `status: 'draft'` → merge → the web page is live at `/<id>`, ready for ads.
6. For the app: `status: 'live'`, then a TestFlight build, then update
   `app-store/review-notes.md` ("What to test"), then submit. Submitting
   around 6am usually clears by lunch.
7. **Hand the owner:** the ad script (hook, pain, "under 3 minutes", "works
   with whatever you use now", "free to try", villain close), the primary
   text, headline and description, and the walkthrough recording for UGC.

---

## Gotchas already learned (keep them in the doc)

- Chromium tests passed while the phone failed on:
  - tap focus (no spinners);
  - `:active` (no press feedback);
  - toasts behind a `showModal` dialog;
  - blob photos showing "?".

  Always simulate iOS, and prefer real-phone screenshots for visual changes.
- A `flowScreen` card restores whatever was underneath. Never let
  "underneath" be a loading state.
- The native PDF export returns immediately. Its completion arrives later
  through `marketelInspectExportResult` (`shown`, `complete`, `dismissed`,
  `failed`, `busy`).
- The web and app bundles must be byte-identical, and the cache version is
  bumped in both.
- The storefront is only known after asking the native side
  (`requestStorefront`). Anything US-only must re-render once it answers.
- Stripe is live: test card 4242 is declined. Verify the mode by the checkout
  URL (`cs_live_`) without charging.
- This machine's clock runs about 8 minutes fast. The server drops photo
  "taken" times from the future, so production API tests must not send local
  times as taken times.
