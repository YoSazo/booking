const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyDeterministicIntent } = require('../frontdesk-assistant');

test('NO after an inventory check records no change', () => {
    assert.deepEqual(
        classifyDeterministicIntent('NO', [], '2026-07-31', 'inventory_check'),
        { intent: 'no_change' }
    );
});

test('NO after a booking alert marks the room taken for confirmation', () => {
    assert.deepEqual(
        classifyDeterministicIntent('NO', [], '2026-07-31', 'booking_alert'),
        { intent: 'booking_taken' }
    );
});

test('a context-free NO is never treated as a destructive booking answer', () => {
    const result = classifyDeterministicIntent('NO', [], '2026-07-31', '');
    assert.equal(result.intent, 'unknown');
    assert.match(result.clarification, /booking alert|nothing changed/i);
});

test('YES after an inventory check also means no inventory changed', () => {
    assert.deepEqual(
        classifyDeterministicIntent('YES', [], '2026-07-31', 'inventory_check'),
        { intent: 'no_change' }
    );
});

test('an explicit walk-in message resolves the room and relative date', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'A walk-in took Queen Room tomorrow',
            [{ name: 'Queen Room', totalUnits: 2 }],
            '2026-07-31',
            'inventory_check'
        ),
        {
            intent: 'block_room',
            roomName: 'Queen Room',
            startDate: '2026-08-01',
            endDate: '2026-08-01',
            units: 1,
            clarification: '',
        }
    );
});

test('a room name the property does not have is never turned into an inventory action', () => {
    assert.equal(
        classifyDeterministicIntent(
            'A walk-in took Presidential Suite tomorrow',
            [{ name: 'Queen Room', totalUnits: 2 }],
            '2026-07-31',
            'inventory_check'
        ),
        null
    );
});

test('cancel requires the explicit follow-up word instead of conversational language', () => {
    assert.equal(
        classifyDeterministicIntent(
            'I think we may need to cancel something',
            [{ name: 'Queen Room', totalUnits: 2 }],
            '2026-07-31',
            'booking_alert'
        ),
        null
    );
    assert.deepEqual(
        classifyDeterministicIntent('CANCEL', [], '2026-07-31', 'booking_alert'),
        { intent: 'cancel_booking' }
    );
});
