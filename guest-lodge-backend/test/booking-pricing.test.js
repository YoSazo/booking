const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildBookingQuote,
    stayNights,
    tieredSubtotal,
} = require('../booking-pricing');

const rates = { nightly: 99, weekly: 594, monthly: 2376, taxRate: 0.10 };

test('stay nights use calendar dates and reject invalid or oversized stays', () => {
    assert.equal(stayNights('2026-08-12', '2026-08-13'), 1);
    assert.equal(stayNights('2026-08-12T23:30:00-05:00', '2026-08-14T01:00:00-05:00'), 2);
    assert.equal(stayNights('2026-08-12', '2026-08-12'), 0);
    assert.equal(stayNights('not-a-date', '2026-08-13'), 0);
    assert.equal(stayNights('2026-01-01', '2027-01-01'), 0);
});

test('tiered pricing mirrors the guest app weekly and monthly calculation', () => {
    assert.equal(tieredSubtotal(3, rates), 297);
    assert.equal(tieredSubtotal(7, rates), 594);
    assert.equal(tieredSubtotal(10, rates), 848.58);
    assert.equal(tieredSubtotal(28, rates), 2376);
    assert.equal(tieredSubtotal(35, rates), 2970);
});

test('server quote owns subtotal, taxes, total and night count', () => {
    assert.deepEqual(
        buildBookingQuote({ checkin: '2026-08-12', checkout: '2026-08-15', rates }),
        {
            nights: 3,
            subtotal: 297,
            taxes: 29.7,
            total: 326.7,
            totalCents: 32670,
        }
    );
});

test('server quote fails closed when rates or tax are invalid', () => {
    assert.equal(buildBookingQuote({
        checkin: '2026-08-12',
        checkout: '2026-08-13',
        rates: { nightly: 99, weekly: 594, monthly: 2376, taxRate: 5 },
    }), null);
    assert.equal(buildBookingQuote({
        checkin: '2026-08-12',
        checkout: '2026-08-13',
        rates: { nightly: 0, weekly: 594, monthly: 2376, taxRate: 0.1 },
    }), null);
});
