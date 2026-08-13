const test = require('node:test');
const assert = require('node:assert/strict');

const { buildFrontdeskReturnPath } = require('../frontdesk-return');

test('activation return preserves property context on the generic owner domain', () => {
    assert.equal(
        buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', activated: true }),
        '/frontdesk?hotelId=hotel-cf88314d&activated=1'
    );
});

test('cancelled checkout preserves property context and reopens activation', () => {
    assert.equal(
        buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal: 'checkout' }),
        '/frontdesk?hotelId=hotel-cf88314d&welcome=1&reveal=checkout'
    );
});

test('ordinary Front Desk returns remain unchanged without context', () => {
    assert.equal(buildFrontdeskReturnPath(), '/frontdesk');
});

test('setup handoff preserves the initial value reveal without putting auth in the path', () => {
    assert.equal(
        buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal: '1' }),
        '/frontdesk?hotelId=hotel-cf88314d&welcome=1&reveal=1'
    );
});
