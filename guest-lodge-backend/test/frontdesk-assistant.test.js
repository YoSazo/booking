const test = require('node:test');
const assert = require('node:assert/strict');

const {
    classifyDeterministicIntent,
    deterministicSocialReply,
    sanitizeAssistantSocialReply,
    bookingDateContext,
    buildNewBookingAlertMessage,
    formatRecentBookingStatus,
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

test('a week-long walk-in consumes every occupied night instead of only today', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'A walk-in just took Queen Suite for a week',
            [{ name: 'Queen Suite', totalUnits: 5 }],
            '2026-08-13',
            ''
        ),
        {
            intent: 'block_room',
            roomName: 'Queen Suite',
            startDate: '2026-08-13',
            endDate: '2026-08-19',
            units: 1,
            clarification: '',
        }
    );
});

test('a natural NO with context answers the booking alert instead of mutating one day', () => {
    assert.deepEqual(
        classifyDeterministicIntent(
            'No, a walk-in just took Queen Suite for a week',
            [{ name: 'Queen Suite', totalUnits: 5 }],
            '2026-08-13',
            'booking_alert'
        ),
        {
            intent: 'booking_taken',
            roomName: 'Queen Suite',
            startDate: '2026-08-13',
            endDate: '2026-08-19',
            units: 1,
            clarification: '',
        }
    );
});

test('recent-booking follow-ups are read-only status questions', () => {
    for (const message of [
        'Booking was kept right?',
        'For that msg you sent, it was kept?',
        'Was it kept?',
        'The most recent booking',
        'Bro, the most recent bookings',
    ]) {
        assert.equal(
            classifyDeterministicIntent(
                message,
                [{ name: 'Queen Suite', totalUnits: 5 }],
                '2026-08-13',
                'booking_alert'
            ).intent,
            'booking_status',
            message
        );
    }
});

test('natural correction and cancellation replies retain safe deterministic meanings', () => {
    assert.deepEqual(
        classifyDeterministicIntent('change that back', [], '2026-08-13', ''),
        { intent: 'undo' }
    );
    assert.deepEqual(
        classifyDeterministicIntent('yes', [], '2026-08-13', 'cancel_question'),
        { intent: 'cancel_booking' }
    );
    assert.deepEqual(
        classifyDeterministicIntent('leave it alone', [], '2026-08-13', 'cancel_question'),
        { intent: 'keep_booking' }
    );
});

test('booking dates distinguish guest checkout from the final occupied night', () => {
    assert.deepEqual(
        bookingDateContext({
            checkinDate: new Date('2026-08-13T00:00:00.000Z'),
            checkoutDate: new Date('2026-08-20T00:00:00.000Z'),
        }),
        {
            startDate: '2026-08-13',
            checkoutDate: '2026-08-20',
            lastOccupiedDate: '2026-08-19',
            stayLabel: 'Aug 13–Aug 20',
        }
    );
});

test('booking alert copy uses checkout, never the final occupied night', () => {
    const now = new Date('2026-08-13T12:00:00.000Z').getTime();
    const message = buildNewBookingAlertMessage({
        status: 'pending',
        roomName: 'Queen Suite',
        checkinDate: new Date('2026-08-13T00:00:00.000Z'),
        checkoutDate: new Date('2026-08-20T00:00:00.000Z'),
        grandTotal: 328.9,
        pendingUntil: new Date(now + 5 * 60 * 1000),
        approvalNoResponseAction: 'confirm',
    }, "Jack's Inn", now);

    assert.equal(
        message,
        "New request at Jack's Inn: Queen Suite, Aug 13–Aug 20, $328.90.\nIs it still free? Say yes to keep it, or tell me what changed. If I don’t hear from you, I’ll keep it in 5 min."
    );
    assert.doesNotMatch(message, /Aug 19/);
});

test('recent booking status explains an automatic keep directly', () => {
    assert.equal(
        formatRecentBookingStatus({
            status: 'confirmed',
            approvalOutcome: 'auto_confirmed',
            fulfillmentStatus: 'completed',
            roomName: 'Queen Suite',
            checkinDate: new Date('2026-08-13T00:00:00.000Z'),
            checkoutDate: new Date('2026-08-20T00:00:00.000Z'),
        }),
        'Yes — the most recent booking was kept automatically because nobody answered: Queen Suite, Aug 13–Aug 20. The guest confirmation was sent.'
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
    const mutationClaim = /\b(?:i|we)\s+(?:blocked|removed|cancelled|canceled|released|confirmed|changed|updated|closed|opened|booked|charged|refunded|emailed|notified)\b/i;
    const kinds = ['wellbeing', 'greeting', 'thanks', 'praise', 'farewell', 'apology', 'identity', 'empathy'];
    for (const socialKind of kinds) {
        // Replies vary, so exercise every variant many times.
        for (let i = 0; i < 40; i++) {
            const reply = deterministicSocialReply({ socialKind }, { name: 'Salah' });
            assert.ok(reply.length > 0 && reply.length <= 160, `${socialKind} within SMS length`);
            assert.match(reply, /Salah/, `${socialKind} addresses the owner by name`);
            assert.doesNotMatch(reply, mutationClaim, `${socialKind} never claims an operation happened`);
            assert.doesNotMatch(reply, /https?:\/\//, `${socialKind} has no link`);
        }
    }
    // Identity still explains what the front desk can actually do.
    const identity = deterministicSocialReply({ socialKind: 'identity' }, { name: 'Salah' });
    assert.match(identity, /front desk/i);
    assert.match(identity, /availability|bookings|walk-ins|rooms/i);
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
