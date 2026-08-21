const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    createGuestPaymentToken,
    readGuestPaymentToken,
} = require('../guest-payment-access');

const secret = 'test-signing-secret-that-is-long-enough';
const nowMs = Date.UTC(2026, 7, 20);

test('guest payment capabilities round-trip and reject tampering', () => {
    const token = createGuestPaymentToken('cus_guest_device', { secret, nowMs });
    assert.equal(readGuestPaymentToken(token, { secret, nowMs })?.customerId, 'cus_guest_device');
    assert.equal(readGuestPaymentToken(`${token}x`, { secret, nowMs }), null);
    assert.equal(readGuestPaymentToken(token, { secret: `${secret}x`, nowMs }), null);
});

test('guest payment capabilities expire', () => {
    const token = createGuestPaymentToken('cus_guest_device', { secret, nowMs });
    const afterOneYear = nowMs + (366 * 24 * 60 * 60 * 1000);
    assert.equal(readGuestPaymentToken(token, { secret, nowMs: afterOneYear }), null);
});

test('saved-card routes require capability access and verify ownership', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /app\.get\('\/api\/guest\/payment-methods', guestPaymentReadRateLimit/);
    assert.match(server, /app\.post\('\/api\/guest\/detach-payment-method', guestPaymentDetachRateLimit/);
    assert.match(server, /if \(!customerId\) return res\.status\(401\)/);
    assert.match(server, /paymentMethod\.customer !== customerId/);
    assert.doesNotMatch(server, /stripe\.customers\.list\(\{ email/);
});

test('Stripe config refuses a publishable key from another account', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(server, /DEFAULT_GUESTEL_TEST_PUBLISHABLE_KEY/);
    assert.match(server, /secretMatch\[1\] === publishableMatch\[1\]/);
    assert.match(server, /secretMatch\[2\] === publishableMatch\[2\]/);
    assert.match(server, /mode: publishableKey \? .* : 'unavailable'/);
});

test('saved-card checkout binds the hold and PaymentSheet to the same customer', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const iosRoot = path.join(__dirname, '..', '..', 'marketel-guestel-ios', 'Guestel');
    const api = fs.readFileSync(path.join(iosRoot, 'BookingAPI.swift'), 'utf8');
    const hotelSheet = fs.readFileSync(path.join(iosRoot, 'HotelSheet.swift'), 'utf8');
    const rebook = fs.readFileSync(path.join(iosRoot, 'RebookView.swift'), 'utf8');

    const createHoldRoute = server.slice(
        server.indexOf("app.post('/api/create-preauth-hold'"),
        server.indexOf('// ── Guestel native app: Stripe support')
    );
    assert.match(createHoldRoute, /const savedCustomerId = guestPaymentCustomerId\(req\)/);
    assert.match(createHoldRoute, /paymentIntentParams\.customer = savedCustomerId/);
    assert.match(createHoldRoute, /paymentCustomer = \{[\s\S]{0,160}ephemeralKeySecret: ephemeralKey\.secret/);
    assert.match(api, /bearerToken: customerToken/);
    assert.match(api, /paymentCustomer: customer/);
    for (const source of [hotelSheet, rebook]) {
        assert.match(source, /customerToken: savedCardToken/);
        assert.match(source, /customer: hold\.paymentCustomer/);
    }
});

test('pay-later completion trusts the Stripe-stamped quote and recovers webhook races', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const route = server.slice(
        server.indexOf("app.post('/api/complete-pay-later-booking'"),
        server.indexOf('function requireCrmAuthDeferred')
    );

    assert.match(route, /const bookingDetails = parseJsonObject\(paymentIntent\.metadata\?\.bookingDetails\)/);
    assert.match(route, /validateStripeIntentAgainstBooking\(paymentIntent, \{[\s\S]{0,180}bookingDetails,/);
    assert.doesNotMatch(route, /submittedBookingDetails/);
    assert.match(route, /where: \{ stripePaymentIntentId: paymentIntent\.id \}/);
    assert.match(route, /recovered: true/);
});
