const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildMarketelCapiEvent,
    marketelCapiRetryDelayMs,
    marketelMetaRequestContext,
    normalizeMetaPhone,
} = require('../marketel-meta-capi');

test('normalizes US phone numbers for Meta matching', () => {
    assert.equal(normalizeMetaPhone('(612) 555-0199'), '16125550199');
    assert.equal(normalizeMetaPhone('+1 612 555 0199'), '16125550199');
});

test('builds a hashed CAPI event without exposing customer identifiers', () => {
    const event = buildMarketelCapiEvent('Subscribe', {
        email: 'Owner@Example.com',
        phone: '(612) 555-0199',
        externalId: 'hotel-123',
        eventId: 'marketel-subscribe.cs_test',
        sourceUrl: 'https://bookmarketel.com/frontdesk',
        fbp: 'fb.1.1700000000000.123456789',
        fbc: 'fb.1.1700000000000.click-id',
        value: 199,
        currency: 'usd',
    });
    assert.equal(event.event_name, 'Subscribe');
    assert.equal(event.event_id, 'marketel-subscribe.cs_test');
    assert.equal(event.custom_data.value, 199);
    assert.equal(event.custom_data.currency, 'USD');
    assert.equal(event.user_data.em[0].length, 64);
    assert.equal(event.user_data.ph[0].length, 64);
    assert.equal(event.user_data.external_id[0].length, 64);
    assert.equal(JSON.stringify(event).includes('Owner@Example.com'), false);
});

test('recovers fbp and fbc from durable journey touches', () => {
    const context = marketelMetaRequestContext({
        body: {
            journeyFirstTouch: { fbp: 'fb.1.1700000000000.first' },
            journeyLatestTouch: { fbc: 'fb.1.1700000000000.latest-click' },
        },
        headers: { referer: 'https://bookmarketel.com/frontdesk?hotelId=hotel-123' },
    }, {});
    assert.deepEqual(context, {
        fbp: 'fb.1.1700000000000.first',
        fbc: 'fb.1.1700000000000.latest-click',
        sourceUrl: 'https://bookmarketel.com/frontdesk?hotelId=hotel-123',
    });
});

test('uses bounded retry backoff', () => {
    assert.equal(marketelCapiRetryDelayMs(1), 60_000);
    assert.equal(marketelCapiRetryDelayMs(3), 15 * 60_000);
    assert.equal(marketelCapiRetryDelayMs(99), 12 * 60 * 60_000);
});
