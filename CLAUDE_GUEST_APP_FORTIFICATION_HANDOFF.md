# Guest App ↔ Front Desk Fortification Handoff

## Objective and non-negotiable invariants

This pass turns the guest PWA into one state-aware **Your Stay** surface backed by the same booking record Front Desk mutates.

Preserve these invariants in any follow-up:

1. A cancelled/released booking must never show arrival, check-in, calendar, install, or notification-promotional copy.
2. Front Desk confirm, release, auto-decision, and owner cancellation must become visible in the guest PWA without an app restart.
3. A reservation may enter through confirmation, install, lookup, email, push, or messages, but every path must converge on `/guest/home`.
4. A guest with multiple stays must receive the correct notification and open the correct thread; refreshing one stay must not select another.
5. Front Desk messages remain available after cancellation so the guest can ask about the reason, card hold, or another room.
6. Booking records are never physically deleted from the legacy CRM delete route; cancellation must preserve revenue history and run side effects.
7. API responses containing reservation/message data are `Cache-Control: no-store`.

## State model (single source of truth)

Implemented in `hotel-booking-app/src/guestStayState.js`.

| Booking state | Guest phase | Guest UI | Messages | Promotions |
|---|---|---|---|---|
| `pending` | `pending` | Room held; exact no-response rule/deadline | Open, pending context | Install + notification allowed |
| `confirmed`, future | `confirmed` | Confirmed dates and property details | Open | Allowed |
| `confirmed`, today | `checkin_today` | Arrival language + property check-in time | Open | Allowed |
| `confirmed`, in stay | `in_stay` | In-stay language | Open | Allowed |
| `confirmed`, checkout | `checkout_today` | Checkout language | Open | Allowed |
| `confirmed`, past | `completed` | Post-stay state | Open for 90 days | Notification prompt hidden |
| `released` | `released` | Request not confirmed; hold explanation | Open with release context | Hidden |
| `cancelled`/`canceled` | `cancelled` | Cancellation reason; hold explanation | Open with cancellation context | Hidden |

Canonical normalization:

```js
export function normalizeBookingStatus(value) {
  const status = String(value || 'confirmed').trim().toLowerCase();
  if (status === 'canceled') return 'cancelled';
  return status || 'confirmed';
}
```

Storage snapshot fields that all entry points now use:

```js
{
  code, email, checkin, checkout, roomName, name, phone,
  total, amountPaidNow, bookingType,
  status, pendingUntil, approvalNoResponseAction, approvalOutcome,
  cancellationReason, cancelledAt, holdStatus, fulfillmentStatus,
  createdAt, updatedAt
}
```

Recent completed stays are retained locally for 90 days so messages remain available. They sort after active/upcoming stays. Non-standalone Safari only auto-enters Your Stay for an active, non-cancelled stay; an installed PWA still opens Your Stay by design.

## Backend guest contract

### One reservation

`GET /api/booking/lookup?hotelId=...&code=...&email=...`

Response:

```json
{
  "success": true,
  "booking": {
    "reservationCode": "...",
    "confirmationCode": "...",
    "guestFirstName": "...",
    "guestLastName": "...",
    "guestEmail": "...",
    "guestPhone": "...",
    "roomName": "Queen Suite",
    "checkin": "ISO date",
    "checkout": "ISO date",
    "nights": 2,
    "total": 199,
    "amountPaidNow": 0,
    "status": "pending|confirmed|released|cancelled",
    "bookingType": "payLater",
    "holdStatus": "active|released|captured|null",
    "pendingUntil": "ISO date|null",
    "approvalNoResponseAction": "confirm|release|null",
    "approvalOutcome": "...|null",
    "cancelledAt": "ISO date|null",
    "cancellationReason": "...|null",
    "fulfillmentStatus": "none|pending|completed|attention",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "hotel": {
    "name": "...",
    "subtitle": "...",
    "address": "...",
    "phone": "...",
    "appIconUrl": "absolute URL",
    "checkInTime": "15:00",
    "checkOutTime": "11:00",
    "cancellationPolicy": "..."
  },
  "serverTime": "ISO date"
}
```

The response is produced by `guestBookingPayload()` and `guestHotelPayload()` in `guest-lodge-backend/server.js`. Do not create a second guest serializer.

### All locally connected stays

`POST /api/booking/stays`

```json
{
  "hotelId": "hotel-...",
  "stays": [
    { "code": "ABC", "email": "guest@example.com" },
    { "code": "DEF", "email": "guest@example.com" }
  ]
}
```

Returns `{ success, bookings, hotel, serverTime }`, maximum 12 stays. Every returned booking also contains `requestedCode` so aliases (PMS vs Marketel code) map back to the correct local record. Guest Home polls this once every 15 seconds and refreshes immediately on focus, online, pageshow, service-worker push, and tab changes.

### Aggregate unread count

`POST /api/guest-messages/unread` accepts the same `{hotelId, stays}` shape and returns:

```json
{
  "success": true,
  "total": 2,
  "counts": [
    { "code": "ABC", "unread": 2 },
    { "code": "DEF", "unread": 0 }
  ]
}
```

This replaced N full-conversation downloads every 15 seconds. It powers the PWA tab marker and the native app badge even while one conversation is open.

## Front Desk → guest propagation

The centralized push hook is `notifyGuestBookingStateChanged()` in `guest-lodge-backend/server.js`.

```js
return sendPushToGuests(booking.hotelId, {
  title,
  body,
  url: `/guest/home?stay=${encodeURIComponent(code)}`,
  icon: `/api/hotel/${encodeURIComponent(booking.hotelId)}/guest-app-icon.png?s=192`,
  badge: '/icon-192.png',
  tag: `guest-booking-${booking.id}`,
  requireInteraction: isDeadState,
  data: {
    type: 'guest_booking_status',
    hotelId: booking.hotelId,
    reservationCode: code,
    status: normalized
  }
}, pushOptions, 'guestBookingStatus', guestBookingThreadCodes(booking, code));
```

It is called from:

- `applyBookingApprovalDecision()` — covers owner YES/NO, notification action, Assistant text action, and auto-decision sweep.
- `cancelBookingByOwner()` — covers confirmed-booking cancellation, booking-review cancellation, Front Desk cancel, and the hardened legacy delete route.

Front Desk replies use reservation-specific guest push data and the property icon:

```js
{
  url: `/guest/messages?stay=${encodeURIComponent(canonicalCode)}`,
  tag: `guest-message-${canonicalCode}`,
  requireInteraction: false,
  data: { type: 'guest_message', hotelId, reservationCode: canonicalCode }
}
```

`hotel-booking-app/public/engine-sw.js` now:

- honors per-payload `tag` and `requireInteraction`;
- sends the reservation/status to every open client;
- navigates/focuses an existing PWA window instead of opening duplicate windows;
- maintains notification badges.

## Front Desk message context

`GET /api/crm/messages` now attaches `bookingStatus`, `checkin`, `checkout`, and `cancellationReason` from the booking.

`guest-lodge-backend/frontdesk/src/core.js` carries those fields into each thread and renders:

- `Awaiting decision` for pending;
- `Confirmed` for live bookings;
- `Released`/`Cancelled` for dead bookings;
- a thread-level notice explaining pending or cancellation state.

This prevents the owner from holding a conversation whose reservation state is invisible. Relevant CSS is in `frontdesk/src/styles/core.css` under `.message-booking-state` and `.message-booking-notice`.

## Guest routing and entry points

- `/guest/home`: the only reservation-state surface.
- `/guest/messages?stay=CODE`: correct reservation thread, including after storage loss.
- `/booking/:code`: reconnects, then routes to `/guest/home?stay=CODE`.
- `/install?code=CODE`: reconnects with the full snapshot; CTA is `Open Your Stay`.
- `/guest/check-in`: compatibility redirect to `/guest/home` only.
- `GuestCheckInPage.jsx`: deliberately deleted.
- `MyBookingPage.jsx`: deliberately reduced to lookup/reconnection; it no longer renders a duplicate reservation card.

`useGuestStayDeepLink.js` owns notification/email deep-link recovery. If the requested stay is already stored it selects it; otherwise it verifies the code through the lookup API and writes the canonical snapshot.

## Main files — start here, no search required

Guest PWA:

- `hotel-booking-app/src/GuestHomePage.jsx` — full state-aware Your Stay UI and batch sync.
- `hotel-booking-app/src/guestStayState.js` — state machine, display metadata, storage serializer.
- `hotel-booking-app/src/guestStayStorage.js` — multi-stay persistence/selection/90-day retention.
- `hotel-booking-app/src/GuestProvider.jsx` — cross-tab/window synchronization and non-selecting background updates.
- `hotel-booking-app/src/useGuestStayDeepLink.js` — notification/email thread recovery.
- `hotel-booking-app/src/GuestMessagesPage.jsx` — state-aware conversation and keyboard-safe chat.
- `hotel-booking-app/src/GuestLayout.jsx` — two-tab shell and aggregate unread/native badge.
- `hotel-booking-app/src/ConfirmationPage.jsx` — writes immediate pending/confirmed state.
- `hotel-booking-app/src/InstallPage.jsx` — lookup/install handoff to Your Stay.
- `hotel-booking-app/src/MyBookingPage.jsx` — lookup only, then canonical handoff.
- `hotel-booking-app/public/engine-sw.js` — guest push routing and window focus.

Backend/Front Desk:

- `guest-lodge-backend/server.js`:
  - rate limit definitions around `guestMessagesFetchRateLimit`;
  - `guestBookingPayload` / `guestHotelPayload`;
  - `/api/guest-messages/unread`;
  - `/api/booking/lookup` and `/api/booking/stays`;
  - `notifyGuestBookingStateChanged`;
  - `applyBookingApprovalDecision` and `cancelBookingByOwner`;
  - `/api/crm/messages` and reply;
  - legacy `DELETE /api/crm/bookings/:id`.
- `guest-lodge-backend/frontdesk/src/core.js` — `buildMessageThreads()` and `renderMessageThreadDetail()`.
- `guest-lodge-backend/frontdesk/src/styles/core.css` — message booking-state styles.

Tests:

- `hotel-booking-app/test/guest-stay-state.test.js`
- `hotel-booking-app/test/guest-stay-storage.test.js`
- `guest-lodge-backend/test/guest-app-contract.test.js`

## Generated bundles and native app

The Front Desk is built twice:

```bash
cd guest-lodge-backend/frontdesk
npm run build          # browser/server bundle → public/frontdesk + simple-crm.html
npm run build:native   # bundled iOS web assets → marketel-frontdesk-ios/www

cd ../../marketel-frontdesk-ios
npm run sync           # copies www into Xcode project
npm run verify:release
```

Do not hand-edit hashed files under either `public/frontdesk/assets` or `marketel-frontdesk-ios/www/frontdesk/assets`.

## Validation completed in this pass

```bash
cd hotel-booking-app
npm test
npm run lint
npm run build

cd ../guest-lodge-backend
npm test
node --check server.js

cd frontdesk
npm run build
npm run build:native

cd ../../marketel-frontdesk-ios
npm run sync
npm run verify:release
```

All passed. Frontend lint has only the repository's pre-existing Fast Refresh warnings (zero errors).

## High-value Claude follow-up audit (do these in order)

The implementation is complete; this is a second-opinion pass, not a request to rebuild it.

1. Inspect only the state table and files listed above. Confirm no guest-facing branch can pair a dead status with arrival language or an actionable calendar/install prompt.
2. Trace these exact mutations to guest delivery: owner confirm, owner release, no-response confirm, no-response release, post-confirm cancellation, legacy delete/cancel, Front Desk reply.
3. Verify multi-stay behavior: booking B must not replace selected booking A during background refresh; a B notification must open B; reading A must not clear B's badge.
4. Audit code/PMS-code aliasing through `guestBookingThreadCodes`, `requestedCode`, message retrieval, push subscription filtering, and notification URLs.
5. Audit rate-limit math at 15-second home/unread polling and 25/30-second message/status polling, including focus/pageshow bursts.
6. Check iPhone compact/small-height layouts for:
   - long property name;
   - long room name;
   - two or more stays;
   - very long address/phone;
   - cancellation reason around 500 characters;
   - message keyboard open.
7. Verify `Cache-Control: no-store` on all guest reservation/message reads in a live response.
8. Confirm installed iOS Front Desk contains the new message status badge/notice after the native bundle build—not only the web bundle.
9. Run a live end-to-end sequence with two browsers/devices:
   - guest books pending;
   - owner sees it without manual refresh;
   - owner says YES/NO via Assistant;
   - guest receives push and Home changes;
   - owner cancels a confirmed stay;
   - guest reason/hold state changes;
   - each side messages the other;
   - unread badges clear accurately.
10. If you find a defect, extend the existing state/storage/contract tests rather than adding another state interpreter.

## Deployment order

1. Deploy backend/Front Desk first (new APIs and push payloads are backward-compatible).
2. Deploy the booking engine/PWA second.
3. Build/upload a new iOS Front Desk build after both deployments.
4. Smoke-test one pending→confirmed and one confirmed→cancelled booking in production.

No Prisma migration is required for this pass; all exposed booking/property fields already exist.
