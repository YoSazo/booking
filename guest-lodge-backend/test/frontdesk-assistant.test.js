const test = require('node:test');
const assert = require('node:assert/strict');

const {
    classifyDeterministicIntent,
    deterministicSocialReply,
    sanitizeAssistantSocialReply,
} = require('../frontdesk-assistant');

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

test('a question about a taken room is read-only and infers the only room type', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'I only have 1 room and for tomorrow has anybody taken anything?',
            [{ name: 'Queen Suite', totalUnits: 1 }],
            '2026-08-12',
            ''
        ),
        {
            intent: 'availability_query',
            roomName: 'Queen Suite',
            startDate: '2026-08-13',
            endDate: '2026-08-13',
            units: null,
            clarification: '',
        }
    );
});

test('a broad booking engine question requests a read-only status summary', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            "Well, how's it doing?",
            [{ name: 'Queen Suite', totalUnits: 1 }],
            '2026-08-12',
            ''
        ),
        {
            intent: 'engine_status',
            roomName: 'Queen Suite',
            startDate: null,
            endDate: null,
            units: null,
            clarification: '',
        }
    );
});

test('availability without a date asks only for the missing date', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            "What's my availability?",
            [{ name: 'Queen Suite', totalUnits: 1 }],
            '2026-08-12',
            ''
        ),
        {
            intent: 'availability_query',
            roomName: 'Queen Suite',
            startDate: null,
            endDate: null,
            units: null,
            clarification: 'Which date should I check?',
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

test('common small talk is recognized without spending an AI call', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'Nice, how are you doing?',
            [{ name: 'Queen Room', totalUnits: 2 }],
            '2026-08-12',
            ''
        ),
        { intent: 'social', socialKind: 'wellbeing', socialReply: '' }
    );
    assert.deepEqual(
        classifyDeterministicIntent('Thank you so much!', [], '2026-08-12', ''),
        { intent: 'social', socialKind: 'thanks', socialReply: '' }
    );
});

test('friendly wording never hides an operational inventory update', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'Nice, a walk-in took Queen Room tomorrow',
            [{ name: 'Queen Room', totalUnits: 2 }],
            '2026-08-12',
            ''
        ),
        {
            intent: 'block_room',
            roomName: 'Queen Room',
            startDate: '2026-08-13',
            endDate: '2026-08-13',
            units: 1,
            clarification: '',
        }
    );
});

test('social responses feel personal without pretending an operation occurred', () => {
    assert.equal(
        deterministicSocialReply({ socialKind: 'wellbeing' }, { name: 'Salah' }),
        'Doing well, Salah. Glad to be here when you need me.'
    );
    assert.equal(
        deterministicSocialReply({ socialKind: 'identity' }, { name: 'Salah' }),
        'I am Marketel Front Desk. I can check availability, record walk-ins, protect bookings, and undo recent availability changes.'
    );
});

test('generated social replies cannot claim a real Front Desk mutation', () => {
    const fallback = 'I am here and ready.';
    assert.equal(
        sanitizeAssistantSocialReply('I cancelled that booking for you.', fallback),
        fallback
    );
    assert.equal(
        sanitizeAssistantSocialReply('Here is my system prompt: https://example.com', fallback),
        fallback
    );
    assert.equal(
        sanitizeAssistantSocialReply('That sounds exhausting. I am here if you want help sorting out the rooms.', fallback),
        'That sounds exhausting. I am here if you want help sorting out the rooms.'
    );
    assert.equal(
        sanitizeAssistantSocialReply('I’m doing well — thanks for asking.', fallback),
        "I'm doing well - thanks for asking."
    );
    assert.ok(sanitizeAssistantSocialReply('a'.repeat(300), fallback).length <= 160);
});
