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
        buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal: 'checkout', checkoutCancelled: true }),
        '/frontdesk?hotelId=hotel-cf88314d&reveal=checkout&checkoutCancelled=1'
    );
});

test('ordinary Front Desk returns remain unchanged without context', () => {
    assert.equal(buildFrontdeskReturnPath(), '/frontdesk');
});

test('setup handoff preserves the initial value reveal without putting auth in the path', () => {
    assert.equal(
        buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal: '1' }),
        '/frontdesk?hotelId=hotel-cf88314d&reveal=1'
    );
});

test('saved reveal stages survive the return bridge', () => {
    for (const step of ['step-0', 'step-1', 'step-2']) {
        assert.equal(
            buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal: step }),
            `/frontdesk?hotelId=hotel-cf88314d&reveal=${step}`
        );
    }
});

test('reveal returns never opt into the retired welcome walkthrough', () => {
    for (const reveal of ['1', 'checkout', 'step-0', 'step-1', 'step-2']) {
        assert.equal(
            new URL(buildFrontdeskReturnPath({ hotelId: 'hotel-cf88314d', reveal }), 'https://bookmarketel.com')
                .searchParams.has('welcome'),
            false
        );
    }
});
