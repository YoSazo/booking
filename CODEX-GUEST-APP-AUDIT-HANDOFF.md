# Codex handoff — guest app fortification audit (post-Claude pass)

> **For Codex:** This is the result of the second-opinion audit requested in
> `CLAUDE_GUEST_APP_FORTIFICATION_HANDOFF.md` §"High-value Claude follow-up audit".
> Items 1–8 and 10 are done. **Items 9 and 6 are NOT done and are the real work left.**
> Do not re-audit what is marked verified below; do not rebuild the state machine.

---

## 0. Master prompt (paste to Codex)

```
Read CODEX-GUEST-APP-AUDIT-HANDOFF.md end-to-end, then
CLAUDE_GUEST_APP_FORTIFICATION_HANDOFF.md for the state model and API contract.

Context: the guest PWA is one state-aware "Your Stay" surface backed by the same
booking record Front Desk mutates. A prior audit fixed 3 defects (below) and
verified audit items 1,2,3,4,5,7,8,10 statically.

Your job:
1. Execute §4 — the live two-device end-to-end sequence. This is the only way to
   confirm the fixes hold in production conditions.
2. Execute §5 — compact-iPhone layout checks on a physical handset.
3. If you find a defect, extend the existing state/storage/contract tests.
   Do NOT add a second state interpreter.

Do not re-open the PWA-vs-native decision: guest stays PWA, native binary is
owner Front Desk only.
```

---

## 1. Defects found and fixed in this pass

### D-A · Deep-link PMS alias hung the surface permanently (high)

`guestBookingThreadCode()` (`server.js`) returns `ourReservationCode` **first** and
never echoes the supplied code. A `?stay=` link carrying a `pmsConfirmationCode`
alias therefore resolved to a different canonical code, and
`useGuestStayDeepLink` derived readiness from `cleanCode === guestStay.code`,
which could never become true. `attemptedRef` then blocked any retry.

Impact was not a cosmetic spinner: `waitingForRequestedStay` also gates message
fetch (`GuestMessagesPage:247`), stay refresh (`:95`) and mark-as-read (`:289`),
so the whole route went inert.

The batch path already solved this (`GuestHomePage:400/404` maps
`booking.requestedCode` → local key); `/api/booking/lookup` simply never returned
`requestedCode`.

**Fix:** lookup now echoes `requestedCode`; the hook keys the stored record by
the arrival code and carries an explicit resolved marker.
Files: `server.js` (`/api/booking/lookup`), `src/useGuestStayDeepLink.js`.

### D-B · Guest polling buckets collided behind hotel wifi (high)

Rate-limit key is `` `${name}:${getRateLimitClientKey(req)}:${scope}` `` and
`getRateLimitClientKey` is IP-based with `app.set('trust proxy', true)`.
`/api/booking/stays` (40 / 5 min) and `/api/guest-messages/unread` (30 / 5 min)
were scoped to `hotelId` only — so **every guest on the property's wifi shared one
egress IP and therefore one bucket**. Each guest polls both every 15 s = 20 per
5 min, so two in-stay guests saturated `stays` and exceeded `unread`.

Neither poller honoured 429, so they re-fired every 15 s and the bucket never
drained. Failure mode: guests pinned on "Showing the last saved details" with
stale reservation status — a direct breach of invariant 2.

**Fix:** both limiters scope on hotel + sorted connected reservation codes
(`guestStaySyncScope`), a stable per-device discriminator already in the request;
both pollers honour `Retry-After`, mirroring the pattern that already existed in
`GuestMessagesPage:197,211-218`.
Files: `server.js` (limiters), `src/GuestHomePage.jsx` (`syncStays`),
`src/GuestLayout.jsx` (`fetchUnread`).

### D-C · Status hero could overflow a compact iPhone (low)

`statusTitle` / `statusBody` interpolate free text — owner-typed
`cancellationReason` and property name — with no `overflowWrap`. A URL inside a
reason, or a long unbroken property name, pushed past the viewport. The stay
switcher and masthead already ellipsize; the hero did not.
**Fix:** `overflowWrap: 'anywhere'` on both. File: `src/GuestHomePage.jsx`.

---

## 2. Verified — do not re-audit

| Item | Result | Evidence |
|---|---|---|
| 1 · no dead status + arrival/install/calendar/notification copy | PASS | Home gates install `:533`, notifications `:545`, calendar `:553` on `!dead`; messages gates `:520` / `:535` and swaps cancellation quick chips; dead states get "Call property"; Front Desk stays reachable (invariant 5) |
| 2 · all 7 mutations reach the guest | PASS | `applyBookingApprovalDecision` → notify `server.js:8231` (owner YES/NO, notification action, Assistant confirm+release, no-response sweep); `cancelBookingByOwner` → notify `:8523` (all 3 cancel paths incl. legacy delete) |
| 3 · multi-stay isolation | PASS | batch sync uses non-selecting `updateGuestStays` (`GuestHomePage:407`); aggregate unread endpoint means reading A cannot clear B's badge (`GuestLayout` maps `guest-messages-read` → refetch, not zero) |
| 4 · code/PMS aliasing | FIXED | batch path was correct; single-lookup path was the gap → D-A |
| 5 · rate-limit math | FIXED | → D-B |
| 7 · `Cache-Control: no-store` | PASS (static) | set at `server.js:3224, 3279, 3379, 3423` for messages / unread / lookup / stays. **Live-response check still open** |
| 8 · native bundle has message status UI | PASS | `marketel-frontdesk-ios/www/frontdesk/assets/index-c6IGCfUb.css` contains `message-booking-state` — not web-only |
| 10 · tests extended, not replaced | DONE | see §3 |

---

## 3. Tests added (extend these, don't fork them)

- `hotel-booking-app/test/guest-stay-storage.test.js` — a deep-linked PMS alias
  stays keyed by the code the guest arrived with, and survives a background merge.
- `guest-lodge-backend/test/guest-app-contract.test.js` — guest polling buckets
  isolate a device not a property; single lookup echoes `requestedCode`.

Note: the bucket-scope regression guard is deliberately narrowed to the two 15 s
pollers. `supportMessageRateLimit` still shares a property bucket **on purpose** —
10 per 5 min on a manual support submission has no NAT problem. Do not "fix" it.

Validation run, all green:

```bash
cd hotel-booking-app && npm test && npm run lint && npm run build
cd ../guest-lodge-backend && npm test && node --check server.js
```

Frontend 8/8 · backend 43/43 · lint 0 errors (only the repo's pre-existing Fast
Refresh warnings) · build clean.

---

## 4. NOT DONE — live two-device end-to-end (audit item 9)

Could not be executed: needs real devices, a running backend and Front Desk
credentials. **This is the highest-value remaining work.** Run the full sequence:

1. guest books → pending
2. owner sees it without manual refresh
3. owner answers YES/NO via Assistant
4. guest receives push and Home changes without restart
5. owner cancels a confirmed stay
6. guest sees reason + card-hold state
7. each side messages the other
8. unread badges clear accurately

**Add this D-B-specific check, which is the whole point of the fix:** put two
guest devices on the *same wifi* (one NAT IP), both with the app open, and leave
them 5+ minutes. Neither may fall back to the "Showing the last saved details"
offline notice, and both must keep receiving status changes. Before the fix, the
second device would starve.

Also confirm `Cache-Control: no-store` on a live response for all four guest
endpoints (completes item 7).

## 5. NOT DONE — compact-iPhone layout (audit item 6)

Audited by reading styles, not on a handset. Check on a small device:
long property name · long room name · two or more stays in the switcher ·
very long address/phone · **cancellation reason around 500 characters** ·
message keyboard open. D-C should have fixed the overflow class, but the
500-char reason deserves one real look.

---

## 6. Deployment order (unchanged)

1. Backend / Front Desk first — the new APIs and push payloads are
   backward-compatible, and D-A's client fix expects `requestedCode` from lookup.
2. Booking engine / PWA second.
3. New iOS Front Desk build after both.
4. Smoke one pending→confirmed and one confirmed→cancelled in production.

No Prisma migration required.
