const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('guest reservation APIs expose one full lifecycle contract', () => {
    assert.match(server, /function guestBookingPayload\(booking, suppliedCode = ''\)/);
    for (const field of [
        'pendingUntil',
        'approvalNoResponseAction',
        'approvalOutcome',
        'cancelledAt',
        'cancellationReason',
        'holdStatus',
        'fulfillmentStatus',
        'updatedAt',
    ]) {
        assert.match(server, new RegExp(`${field}: booking\\.${field}`));
    }
    assert.match(server, /app\.post\('\/api\/booking\/stays'/);
});

test('every Front Desk booking decision pushes its resulting state to the guest', () => {
    assert.match(server, /async function notifyGuestBookingStateChanged/);
    assert.match(server, /notifyGuestBookingStateChanged\(decided, decided\.status\)/);
    assert.match(server, /notifyGuestBookingStateChanged\(cancelled, 'cancelled'/);
    assert.match(server, /url: `\/guest\/home\?stay=/);
});

test('repeat guests receive one lightweight unread-count request', () => {
    assert.match(server, /app\.post\('\/api\/guest-messages\/unread'/);
    assert.match(server, /guestReadAt: null/);
    assert.match(server, /sender: 'hotel'/);
});

test('the legacy delete route preserves the booking and uses cancellation side effects', () => {
    assert.match(server, /app\.delete\('\/api\/crm\/bookings\/:id'[\s\S]*?cancelBookingByOwner\(id, hotelId, 'Removed in Front Desk'\)/);
});

test('guest polling buckets isolate one device rather than one property', () => {
    // Rate-limit keys are IP-based, so scoping on hotelId alone collides behind
    // the property's wifi NAT: two in-stay guests would exhaust a hotel-wide
    // bucket and everyone else would sit on stale reservation state.
    assert.match(server, /function guestStaySyncScope/);
    assert.match(server, /'guest-unread-sync',[\s\S]*?scope: guestStaySyncScope/);
    assert.match(server, /'guest-booking-sync',[\s\S]*?scope: guestStaySyncScope/);
    // Guard the regression specifically for the 15s pollers. Low-frequency
    // manual routes (support messages) may still share a property bucket.
    assert.doesNotMatch(server, /'guest-(unread|booking)-sync',[\s\S]{0,160}?scope: \(req\) => req\.body\?\.hotelId/);
});

test('single reservation lookup echoes the requested code like the batch endpoint', () => {
    // Without this a PMS alias resolves to a canonical code the client never
    // asked for, and the deep-link surface can never confirm it resolved.
    assert.match(server, /requestedCode: code/);
});

test('account deletion stays owner-only except for the synthetic review property', () => {
    // A shared front-desk PIN must never be able to delete a real business, so
    // the exception has to stay keyed on the seeded App Review marker and
    // nothing broader.
    assert.match(server, /function isAppReviewDemoProperty\(hotel\)[\s\S]{0,220}app_review/);
    assert.match(server, /function hasAccountOwnerSession\(req, hotel\)[\s\S]{0,120}isAppReviewDemoProperty\(hotel\)/);
    assert.match(server, /function hasAccountOwnerSession[\s\S]{0,400}crmIsNativeSession[\s\S]{0,160}sessionEmail === ownerEmail/);

    // Both the gate and the button state must read the same predicate, or the
    // control can appear without the request succeeding.
    assert.match(server, /function requireNativeOwnerSession[\s\S]{0,120}hasAccountOwnerSession\(req, hotel\)/);
    assert.match(server, /ownerSession: hasAccountOwnerSession\(req, hotel\)/);

    // The predicate reads a field the deletion queries must actually select.
    assert.match(server, /select: \{ ownerEmail: true, marketelSubscriptionStatus: true \}/);
});

test('only the seed writes the App Review subscription marker', () => {
    const seed = fs.readFileSync(
        path.join(__dirname, '..', 'scripts', 'seed-app-review-property.js'),
        'utf8'
    );
    assert.match(seed, /marketelSubscriptionStatus: 'app_review'/);
    // server.js may read the marker but must never assign it.
    assert.doesNotMatch(server, /marketelSubscriptionStatus: 'app_review'/);
});

test('Guestel Help links to a dedicated support page instead of a dead route', () => {
    const accountScreens = fs.readFileSync(
        path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel', 'AccountScreens.swift'),
        'utf8'
    );
    assert.match(server, /app\.get\('\/guest-support'/);
    assert.match(accountScreens, /guest-lodge-backend\.onrender\.com\/guest-support/);
    assert.doesNotMatch(accountScreens, /bookmarketel\.com\/support/);
});

test('Guestel hotel actions use live data instead of placeholder dead ends', () => {
    const guestelRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const addHotel = fs.readFileSync(path.join(guestelRoot, 'AddHotelView.swift'), 'utf8');
    const hotelSheet = fs.readFileSync(path.join(guestelRoot, 'HotelSheet.swift'), 'utf8');
    const nativeMessages = fs.readFileSync(path.join(guestelRoot, 'NativeMessagesView.swift'), 'utf8');
    const hotels = fs.readFileSync(path.join(guestelRoot, 'HotelsView.swift'), 'utf8');

    assert.match(addHotel, /BookingAPI\.hotelId\(forDomain: domain\)/);
    assert.doesNotMatch(addHotel, /hotelId: "new-hotel"/);
    assert.match(hotelSheet, /NativeMessagesView\(hotel: hotel, stay: stay\)/);
    assert.match(nativeMessages, /BookingAPI\.messages\(hotelId: hotel\.hotelId/);
    assert.doesNotMatch(hotelSheet, /SimpleWebSheet/);
    assert.match(hotels, /AsyncImage\(url: imageURL\)/);
    assert.doesNotMatch(hotels, /Paid · Confirmed/);
});
