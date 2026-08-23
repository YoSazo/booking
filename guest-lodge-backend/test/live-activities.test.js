const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIVITY_ATTRIBUTES_TYPE,
  activityAttributes,
  activityContentState,
  buildStartPayload,
  buildUpdatePayload,
  buildEndPayload,
  liveActivityActionForBooking,
  liveActivityApnsHeaders,
} = require('../live-activities.js');

const HOTEL = { id: 'hotel-1', name: "Jack's Inn" };
const PENDING_UNTIL = new Date('2026-08-15T18:05:00.000Z');

function pendingBooking(overrides = {}) {
  return {
    id: 'bk_1',
    hotelId: 'hotel-1',
    status: 'pending',
    guestFirstName: 'Bob',
    guestLastName: 'Murphy',
    roomName: 'Queen Suite',
    checkinDate: '2026-08-20T00:00:00.000Z',
    checkoutDate: '2026-08-22T00:00:00.000Z',
    nights: 2,
    grandTotal: 328.9,
    pendingUntil: PENDING_UNTIL,
    approvalNoResponseAction: 'confirm',
    ...overrides,
  };
}

test('static attributes never carry booking state', () => {
  const attrs = activityAttributes(pendingBooking(), HOTEL);
  // ActivityKit fixes attributes at start, so anything that can change later
  // must live in content state or it silently goes stale on the Lock Screen.
  assert.equal(attrs.guestName, 'Bob Murphy');
  assert.equal(attrs.roomName, 'Queen Suite');
  assert.equal(attrs.propertyName, "Jack's Inn");
  assert.equal(attrs.amountLabel, '$328.90');
  assert.ok(!('status' in attrs));
  assert.ok(!('deadline' in attrs));
});

test('a pending booking counts down to an absolute instant', () => {
  const state = activityContentState(pendingBooking());
  // A remaining-duration would freeze between pushes; an absolute deadline lets
  // the widget keep ticking on its own.
  assert.equal(state.status, 'pending');
  assert.equal(state.deadline, Math.floor(PENDING_UNTIL.getTime() / 1000));
  assert.equal(state.headline, 'Reply or it is kept');
});

test('the headline states the fallback the owner actually chose', () => {
  const releases = activityContentState(pendingBooking({ approvalNoResponseAction: 'release' }));
  assert.equal(releases.noResponseAction, 'release');
  assert.equal(releases.headline, 'Reply or it releases');
});

test('a decided booking stops counting down', () => {
  for (const status of ['confirmed', 'released', 'cancelled']) {
    const state = activityContentState(pendingBooking({ status }));
    assert.equal(state.deadline, null, `${status} must not keep a live timer`);
  }
  assert.equal(activityContentState(pendingBooking({ status: 'confirmed' })).headline, 'Booking kept');
  assert.equal(activityContentState(pendingBooking({ status: 'released' })).headline, 'Request released');
});

test('canceled and cancelled resolve to one terminal state', () => {
  const state = activityContentState(pendingBooking({ status: 'canceled' }));
  assert.equal(state.status, 'cancelled');
  assert.equal(state.headline, 'Booking cancelled');
});

test('the start payload carries the attributes type push-to-start requires', () => {
  const payload = buildStartPayload(pendingBooking(), HOTEL);
  assert.equal(payload.aps.event, 'start');
  assert.equal(payload.aps['attributes-type'], ACTIVITY_ATTRIBUTES_TYPE);
  assert.ok(payload.aps.attributes.bookingId);
  assert.ok(payload.aps['content-state'].deadline);
  // Without a stale date the card can outlive the decision window if a push is
  // lost, leaving a countdown that never resolves.
  assert.ok(payload.aps['stale-date'] > payload.aps['content-state'].deadline);
  assert.match(payload.aps.alert.body, /still free/i);
});

test('an update carries no attributes', () => {
  const payload = buildUpdatePayload(pendingBooking());
  assert.equal(payload.aps.event, 'update');
  assert.ok(!('attributes' in payload.aps));
  assert.ok(!('attributes-type' in payload.aps));
});

test('an end payload dismisses only after the outcome can be read', () => {
  const payload = buildEndPayload(pendingBooking({ status: 'confirmed' }), { decidedBy: 'owner' });
  assert.equal(payload.aps.event, 'end');
  assert.equal(payload.aps['content-state'].status, 'confirmed');
  assert.equal(payload.aps['content-state'].decidedBy, 'owner');
  assert.ok(payload.aps['dismissal-date'] > payload.aps.timestamp);
});

test('live activity pushes use their own topic and push type', () => {
  const headers = liveActivityApnsHeaders('com.bookmarketel.frontdesk');
  // A liveactivity push sent on the plain bundle topic is rejected by APNs.
  assert.equal(headers['apns-topic'], 'com.bookmarketel.frontdesk.push-type.liveactivity');
  assert.equal(headers['apns-push-type'], 'liveactivity');
});

test('one booking never gets two activities', () => {
  const booking = pendingBooking();
  assert.deepEqual(liveActivityActionForBooking(booking, null), { action: 'start' });
  // A second start would orphan the first card with no token left to end it.
  assert.deepEqual(
    liveActivityActionForBooking(booking, { state: 'active' }),
    { action: 'update' }
  );
});

test('every terminal status ends the activity, whichever surface decided it', () => {
  // Owner tap, SMS reply, notification action and the auto sweep all land here
  // as a status change, so this single rule covers all of them.
  for (const status of ['confirmed', 'released', 'cancelled', 'canceled']) {
    assert.deepEqual(
      liveActivityActionForBooking(pendingBooking({ status }), { state: 'active' }),
      { action: 'end' },
      `${status} must end a running activity`
    );
  }
});

test('ending an already-ended activity is a no-op rather than a second push', () => {
  const result = liveActivityActionForBooking(pendingBooking({ status: 'confirmed' }), { state: 'ended' });
  assert.equal(result.action, 'none');
});

test('an unknown status never starts or ends anything', () => {
  const result = liveActivityActionForBooking(pendingBooking({ status: 'weird' }), null);
  assert.equal(result.action, 'none');
  assert.match(result.reason, /unhandled-status/);
});

test('the native Live Activity stays focused on the Front Desk decision', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const widget = fs.readFileSync(
    path.join(__dirname, '..', '..', 'marketel-frontdesk-ios', 'ios', 'App', 'MarketelActivityWidget', 'MarketelActivityWidget.swift'),
    'utf8'
  );
  assert.match(widget, /Text\("FRONT DESK"\)/);
  assert.ok(widget.includes('Is \\(context.attributes.roomName) still free?'));
  assert.match(widget, /Label\("Confirm", systemImage: "checkmark"\)/);
  assert.match(widget, /Label\("Release", systemImage: "xmark"\)/);
  assert.match(widget, /No reply: keep/);
  assert.match(widget, /No reply: release/);
  // Apple's Lock Screen presentation tops out at 160pt. Interval timers and
  // roomy stacked labels previously pushed the decision below that budget.
  assert.doesNotMatch(widget, /Text\(timerInterval:/);
  assert.match(widget, /controlSize\(\.mini\)/);
});

test('Live Activity intents are compiled into the app as well as the widget', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const project = fs.readFileSync(
    path.join(__dirname, '..', '..', 'marketel-frontdesk-ios', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
    'utf8'
  );
  // LiveActivityIntent executes in the app process. Targeting only the widget
  // renders the buttons but leaves the system with no app-side implementation.
  const sourceMemberships = project.match(/BookingDecisionIntents\.swift in Sources \*\//g) || [];
  assert.ok(sourceMemberships.length >= 4, 'intent source must appear in both target source phases');
});
