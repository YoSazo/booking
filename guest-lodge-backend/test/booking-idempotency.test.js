const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPreauthIdempotencyKey,
    normalizeBookingAttemptId,
} = require('../booking-idempotency');

test('refresh/back reuses the same Stripe preauthorization request', () => {
    const first = buildPreauthIdempotencyKey('hotel-a39be0df', 'ABC123XYZ');
    const retry = buildPreauthIdempotencyKey('hotel-a39be0df', 'ABC123XYZ');
    assert.equal(first, retry);
    assert.match(first, /^marketel-preauth-v1-[a-f0-9]{40}$/);
});

test('a new booking attempt cannot collide with the prior hold', () => {
    assert.notEqual(
        buildPreauthIdempotencyKey('hotel-a39be0df', 'ABC123XYZ'),
        buildPreauthIdempotencyKey('hotel-a39be0df', 'NEW456XYZ')
    );
    assert.notEqual(
        buildPreauthIdempotencyKey('hotel-a39be0df', 'ABC123XYZ'),
        buildPreauthIdempotencyKey('hotel-other', 'ABC123XYZ')
    );
});

test('malformed or missing attempt IDs never become Stripe keys', () => {
    assert.equal(normalizeBookingAttemptId('ABC123XYZ'), 'ABC123XYZ');
    assert.equal(buildPreauthIdempotencyKey('hotel-a39be0df', ''), '');
    assert.equal(buildPreauthIdempotencyKey('hotel-a39be0df', 'bad id with spaces'), '');
});
