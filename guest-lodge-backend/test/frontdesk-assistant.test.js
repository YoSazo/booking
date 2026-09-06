const test = require('node:test');
const assert = require('node:assert/strict');

const {
    classifyDeterministicIntent,
    deterministicSocialReply,
    sanitizeAssistantSocialReply,
    sanitizeFrontDeskAnswer,
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

test('front desk answers stay grounded and never claim an operation', () => {
    const fallback = 'Here is where the property stands.';
    // A normal, data-grounded answer passes through (longer than a social reply).
    assert.equal(
        sanitizeFrontDeskAnswer('You have 3 rooms open tonight and 2 pending requests.', fallback),
        'You have 3 rooms open tonight and 2 pending requests.'
    );
    // Claiming an operation happened is rejected.
    assert.equal(
        sanitizeFrontDeskAnswer('I blocked the Queen for tonight.', fallback),
        fallback
    );
    // Links / secrets are rejected.
    assert.equal(
        sanitizeFrontDeskAnswer('Check https://example.com for details.', fallback),
        fallback
    );
    // Long output is capped.
    assert.ok(sanitizeFrontDeskAnswer('a'.repeat(1000), fallback).length <= 700);
});

// ── Booking review's channel plumbing ──────────────────────────────
// These guard the regression that made the sheet unusable: an owner added a
// phone, verified it, and the booking rule still refused to save because the
// channel count reads config.enabled — a toggle on a different screen.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const readRepo = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');
const assistantModule = readRepo('guest-lodge-backend', 'frontdesk-assistant.js');
const assistantWeb = readRepo('guest-lodge-backend', 'frontdesk', 'src', 'assistant.js');
const viteConfig = readRepo('guest-lodge-backend', 'frontdesk', 'vite.config.js');
const nativeAssistant = readRepo('marketel-frontdesk-ios', 'ios', 'App', 'App', 'NativeAssistant.swift');
const nativeAppDelegate = readRepo('marketel-frontdesk-ios', 'ios', 'App', 'App', 'AppDelegate.swift');

test('connecting the first phone turns the Assistant on so booking review has a channel', () => {
    // The coupling that caused the bug — kept asserted so it stays visible.
    assert.match(assistantModule, /if \(!config\?\.enabled \|\| config\.notifyNewBookings === false\) return 0;/);
    assert.match(assistantModule, /const verifiedCount = await prisma\.frontDeskAssistantRecipient\.count/);
    assert.match(assistantModule, /if \(verifiedCount === 1\)/);
    assert.match(assistantModule, /nextCheckAt: computeNextCheckAt\(\{ \.\.\.current, enabled: true \}\)/);
});

test('only a first verification enables the Assistant, so a deliberate off stays off', () => {
    assert.match(assistantModule, /if \(current && !current\.enabled\)/);
    assert.doesNotMatch(assistantModule, /if \(verifiedCount >= 1\)/);
});

test('a booking rule the server refused is never reported as saved', () => {
    assert.match(assistantWeb, /const approval = await api\('POST', '\/api\/crm\/booking-approval'/);
    assert.match(assistantWeb, /if \(!approval\?\.success\)/);
});

test('the native sheet never shows its own cancelled request as an error', () => {
    assert.match(nativeAssistant, /static func isCancellation/);
    assert.match(nativeAssistant, /nsError\.code == NSURLErrorCancelled/);
    assert.match(nativeAssistant, /if !silent, !Self\.isCancellation\(error\)/);
});

test('the native sheet is one task until a phone is connected', () => {
    assert.match(nativeAssistant, /if model\.hasVerifiedPhone \{/);
    assert.match(nativeAssistant, /private var setupCard: some View/);
    assert.match(nativeAssistant, /var pendingRecipient: MarketelAssistantRecipient\?/);
    // An added-but-unverified phone must change what the sheet says.
    assert.match(nativeAssistant, /return "Enter your code"/);
});

test('every phone can be removed without discovering a swipe gesture', () => {
    assert.match(nativeAssistant, /Label\("Remove this phone", systemImage: "trash"\)/);
});

test('saving the booking rule does not rewrite the check-in settings', () => {
    assert.match(nativeAssistant, /func saveApprovalOnly\(\) async/);
    assert.match(nativeAssistant, /busyKey: "save-approval"/);
});

test('the Contacts entry uses the shipped app icon', () => {
    assert.match(nativeAppDelegate, /forResource: "marketel-frontdesk-icon"/);
    assert.match(viteConfig, /'marketel-frontdesk-icon\.png'/);
});

// ── Answering a booking alert in sentences ─────────────────────────
// The reported failure: "no don't keep it, cancel it" was read as a walk-in
// report, which then asked which room was taken and which night — about a
// booking whose room and nights the alert itself carried.

const alertRooms = [{ name: 'Test Suite', totalUnits: 1 }];
const onAlert = (message) =>
    classifyDeterministicIntent(message, alertRooms, '2026-09-06', 'booking_alert');

test('an explicit decline in a sentence cancels rather than reporting a walk-in', () => {
    for (const message of [
        "no don't keep it, cancel it",
        'no dont keep it cancel it',
        "don't keep it",
        'release it',
        'decline it',
        'reject it',
        'cancel the booking',
        'get rid of it',
        'turn it down',
    ]) {
        assert.equal(onAlert(message).intent, 'cancel_booking', message);
    }
});

test('an explicit keep in a sentence is never read as a cancellation', () => {
    for (const message of ['yes keep it', "that's fine keep it", 'keep the booking', 'accept it']) {
        assert.equal(onAlert(message).intent, 'keep_booking', message);
    }
    // Negation is read before the bare verb.
    assert.equal(onAlert("don't cancel it").intent, 'keep_booking');
    assert.equal(onAlert('do not release it').intent, 'keep_booking');
});

test('hedged language still goes to the model rather than acting destructively', () => {
    for (const message of [
        'I think we may need to cancel something',
        'should we cancel it?',
        'not sure if we should keep it',
    ]) {
        assert.equal(onAlert(message), null, message);
    }
});

test('a bare NO on an alert still means the room is gone, not merely declined', () => {
    // Unchanged on purpose: NO answers "is it still free?".
    assert.deepEqual(onAlert('NO'), { intent: 'booking_taken' });
});

test('the block follow-up reads negation before the verb', () => {
    const onBlock = (message) =>
        classifyDeterministicIntent(message, alertRooms, '2026-09-06', 'block_question');
    for (const message of ['block it', 'yes', 'yes block it', 'take it out', 'block the room']) {
        assert.equal(onBlock(message).intent, 'confirm_block', message);
    }
    for (const message of ["don't block it", 'no', "no it's still free", 'leave it', 'nah']) {
        assert.equal(onBlock(message).intent, 'decline_block', message);
    }
});

test('a booking alert is never asked for a room and a night it already carries', () => {
    const src = readRepo('guest-lodge-backend', 'frontdesk-assistant.js');
    assert.match(src, /function clarificationFor\(contextType\)/);
    assert.match(src, /Do you want that request kept or released\?/);
    // Releasing must ask about inventory rather than assume a walk-in.
    assert.match(src, /async function releaseAlertedBooking/);
    assert.match(src, /kind: 'block_question'/);
});
