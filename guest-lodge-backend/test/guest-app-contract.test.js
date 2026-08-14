const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('guest reservation APIs expose one full lifecycle contract', () => {
    assert.match(server, /function guestBookingPayload\(booking, suppliedCode = ''\)/);
    for (const field of [
        'pendingUntil',
        'approvalNoResponseAction',
        'approvalOutcome',
        'cancelledAt',
        'cancellationReason',
        'holdStatus',
        'fulfillmentStatus',
        'updatedAt',
    ]) {
        assert.match(server, new RegExp(`${field}: booking\\.${field}`));
    }
    assert.match(server, /app\.post\('\/api\/booking\/stays'/);
});

test('every Front Desk booking decision pushes its resulting state to the guest', () => {
    assert.match(server, /async function notifyGuestBookingStateChanged/);
    assert.match(server, /notifyGuestBookingStateChanged\(decided, decided\.status\)/);
    assert.match(server, /notifyGuestBookingStateChanged\(cancelled, 'cancelled'/);
    assert.match(server, /url: `\/guest\/home\?stay=/);
});

test('repeat guests receive one lightweight unread-count request', () => {
    assert.match(server, /app\.post\('\/api\/guest-messages\/unread'/);
    assert.match(server, /guestReadAt: null/);
    assert.match(server, /sender: 'hotel'/);
});

test('the legacy delete route preserves the booking and uses cancellation side effects', () => {
    assert.match(server, /app\.delete\('\/api\/crm\/bookings\/:id'[\s\S]*?cancelBookingByOwner\(id, hotelId, 'Removed in Front Desk'\)/);
});
