const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    createGuestIdentityToken,
    createReservationToken,
    readGuestIdentityToken,
    readReservationToken,
} = require('../guest-access');

const secret = 'guestel-test-secret-long-enough-for-hmac';
const nowMs = Date.UTC(2026, 7, 20);

test('verified guest identity round-trips and rejects tampering', () => {
    const token = createGuestIdentityToken('Guest@Example.com', { secret, nowMs });
    assert.equal(readGuestIdentityToken(token, { secret, nowMs })?.email, 'guest@example.com');
    assert.equal(readGuestIdentityToken(`${token}x`, { secret, nowMs }), null);
});

test('reservation capability is scoped to one persisted booking', () => {
    const booking = {
        id: 'booking_1',
        hotelId: 'hotel_1',
        pmsConfirmationCode: 'CONFIRM-1',
        ourReservationCode: 'OUR-1',
    };
    const token = createReservationToken(booking, { secret, nowMs });
    const claims = readReservationToken(token, { secret, nowMs });
    assert.equal(claims?.bookingId, 'booking_1');
    assert.equal(claims?.hotelId, 'hotel_1');
    assert.equal(claims?.reservationCode, 'CONFIRM-1');
    assert.equal(readReservationToken(token, { secret: `${secret}x`, nowMs }), null);
});

test('Guestel native checkout uses the pay-later contract and fails closed on availability', () => {
    const root = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const api = fs.readFileSync(path.join(root, 'BookingAPI.swift'), 'utf8');
    const hotelSheet = fs.readFileSync(path.join(root, 'HotelSheet.swift'), 'utf8');
    const rebook = fs.readFileSync(path.join(root, 'RebookView.swift'), 'utf8');
    assert.match(api, /api\/complete-pay-later-booking/);
    assert.doesNotMatch(api, /static func book[\s\S]{0,200}api\/book/);
    for (const source of [hotelSheet, rebook]) {
        assert.match(source, /guard let match = available\.first/);
        assert.match(source, /details\["roomTypeID"\] = match\.roomTypeID/);
        assert.match(source, /details\["rateID"\] = match\.rateID/);
        assert.match(source, /BookingAPI\.completePayLater/);
    }
});

test('saved-card sessions require the signed customer capability', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /app\.post\('\/api\/guest\/payment-session', guestPaymentSessionRateLimit/);
    assert.match(server, /const customerId = guestPaymentCustomerId\(req\)/);
    assert.match(server, /if \(!customerId\)[\s\S]{0,100}status\(401\)/);
});

test('Guestel hotel handoff receives a primary booking domain', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const publicHotelRoute = server.slice(
        server.indexOf("app.get('/api/hotel/:hotelId/public'"),
        server.indexOf('// ── END SELF-SERVE SETUP')
    );
    assert.match(publicHotelRoute, /domains:\s*\{\s*where:\s*\{\s*isPrimary:\s*true\s*\},\s*take:\s*1\s*\}/);
    assert.match(publicHotelRoute, /domain:\s*hotel\.domains\?\.\[0\]\?\.domain/);
});

test('native guest pushes respect the selected notification category', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /const preference = opts\.preference === 'stayUpdates' \? 'stayUpdates' : 'messages'/);
    assert.match(server, /where:\s*\{ bookingId, active: true, \[preference\]: true \}/);
    assert.match(server, /preference: 'stayUpdates'/);
});

test('Guestel push delivery is independently configured, observable, and testable', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const iosRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const account = fs.readFileSync(path.join(iosRoot, 'AccountScreens.swift'), 'utf8');
    const hotels = fs.readFileSync(path.join(iosRoot, 'HotelsView.swift'), 'utf8');

    // Front Desk working must not make Guestel silently claim it is configured.
    assert.match(server, /const GUESTEL_APNS_CONFIGURED =/);
    assert.match(server, /pushConfigured: GUESTEL_APNS_CONFIGURED/);
    assert.match(server, /app\.post\('\/api\/guest\/native\/push\/test'/);
    assert.match(server, /Apple rejected the test notification/);
    assert.match(server, /❌ \[guest-apns\]/);

    // A normal in-app booking—not just an App Clip handoff—must reach the
    // contextual notification explanation, and Settings can prove delivery.
    assert.match(hotels, /store\.arrival = GuestelArrival\(hotel: hotel, stay: stay\)/);
    assert.match(account, /Send test notification/);
    assert.match(account, /BookingAPI\.testPush/);
    assert.match(account, /Confirmations, releases, cancellations/);
    assert.doesNotMatch(account, /Check-in reminders, room readiness/);
});

test('Guestel property updates work before a guest has a reservation', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
    const iosRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const pushManager = fs.readFileSync(path.join(iosRoot, 'GuestPushManager.swift'), 'utf8');
    const rootView = fs.readFileSync(path.join(iosRoot, 'RootView.swift'), 'utf8');

    assert.match(schema, /model GuestelPropertyDevice/);
    assert.match(server, /requestedHotelIds/);
    assert.match(server, /prisma\.guestelPropertyDevice\.upsert/);
    assert.match(server, /sendNativeBroadcastToHotelGuests/);
    assert.match(server, /where: \{ hotelId, active: true, updates: true \}/);
    assert.match(pushManager, /hotelIds = Array\(Set\(store\.hotels\.map/);
    assert.match(pushManager, /"propertyUpdates": defaults\.bool/);
    assert.match(rootView, /guestelOpenHotels/);
});

test('Guestel and its App Clip request the real iOS App Group entitlement', () => {
    const iosRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios');
    for (const relative of ['Guestel/Guestel.entitlements', 'GuestelClip/GuestelClip.entitlements']) {
        const source = fs.readFileSync(path.join(iosRoot, relative), 'utf8');
        assert.match(source, /<key>com\.apple\.security\.application-groups<\/key>/);
        assert.doesNotMatch(source, /<key>com\.apple\.developer\.application-groups<\/key>/);
        assert.match(source, /group\.com\.bookmarketel\.guestel/);
    }
});
