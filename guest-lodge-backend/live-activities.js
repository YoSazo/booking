'use strict';

// Live Activities for booking decisions.
//
// A pending booking is a countdown the owner has to answer, which is exactly
// what a Live Activity is for: it sits on the Lock Screen and in the Dynamic
// Island with a live timer and Keep/Release buttons.
//
// This module is deliberately pure — payload shapes, content state and the
// lifecycle decision for a booking transition. No network, no Prisma. The
// transport and persistence live in server.js so this stays unit-testable, and
// so the rules below can be asserted directly rather than through APNs.
//
// The one invariant that matters: an activity belongs to a booking, and it must
// end whenever that booking leaves the pending state — no matter which surface
// caused it (app button, SMS reply, notification action, or the auto sweep).
// Otherwise owners are left with a ghost countdown for a decision already made.

const ACTIVITY_ATTRIBUTES_TYPE = 'BookingDecisionAttributes';

// iOS keeps a dismissed activity on screen briefly after it ends. Giving the
// terminal state a short grace period lets the owner see the outcome they just
// chose instead of the card vanishing under their thumb.
const END_DISMISSAL_GRACE_SECONDS = 8;

const PENDING_STATUS = 'pending';
const TERMINAL_STATUSES = new Set(['confirmed', 'released', 'cancelled']);

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'canceled') return 'cancelled';
  return status;
}

function epochSeconds(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(ms)) return fallback;
  return Math.floor(ms / 1000);
}

function cleanText(value, max = 64) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function guestDisplayName(booking) {
  const first = cleanText(booking?.guestFirstName, 40);
  const last = cleanText(booking?.guestLastName, 40);
  const full = [first, last].filter(Boolean).join(' ').trim();
  return full || cleanText(booking?.guestName, 60) || 'New guest';
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

/**
 * Static half of the activity. ActivityKit fixes these when the activity starts
 * and they can never change, so nothing here may depend on booking state.
 */
function activityAttributes(booking, hotel) {
  return {
    bookingId: String(booking?.id || ''),
    hotelId: String(booking?.hotelId || hotel?.id || ''),
    propertyName: cleanText(hotel?.name, 48) || 'Your property',
    guestName: guestDisplayName(booking),
    roomName: cleanText(booking?.roomName, 48) || 'Room',
    checkIn: epochSeconds(booking?.checkinDate ?? booking?.checkin),
    checkOut: epochSeconds(booking?.checkoutDate ?? booking?.checkout),
    nights: Number.isFinite(Number(booking?.nights)) ? Number(booking.nights) : null,
    amountLabel: money(booking?.grandTotal ?? booking?.total),
  };
}

/**
 * Dynamic half. Everything the Lock Screen re-renders lives here.
 * `deadline` drives the native countdown, so it must be an absolute instant
 * rather than a remaining duration — the widget keeps ticking without pushes.
 */
function activityContentState(booking, options = {}) {
  const status = normalizeStatus(booking?.status) || PENDING_STATUS;
  const decidedBy = cleanText(options.decidedBy || booking?.approvalOutcome || '', 24);
  const noResponseAction = String(options.noResponseAction || booking?.approvalNoResponseAction || 'confirm')
    .trim()
    .toLowerCase() === 'release' ? 'release' : 'confirm';

  return {
    status,
    // Absolute epoch seconds; null once decided so the widget stops counting.
    deadline: status === PENDING_STATUS
      ? epochSeconds(options.pendingUntil ?? booking?.pendingUntil)
      : null,
    noResponseAction,
    decidedBy,
    headline: activityHeadline(status, noResponseAction),
    updatedAt: epochSeconds(options.now ?? Date.now(), Math.floor(Date.now() / 1000)),
  };
}

function activityHeadline(status, noResponseAction) {
  switch (normalizeStatus(status)) {
    case 'confirmed':
      return 'Booking kept';
    case 'released':
      return 'Request released';
    case 'cancelled':
      return 'Booking cancelled';
    default:
      return noResponseAction === 'release'
        ? 'Reply or it releases'
        : 'Reply or it is kept';
  }
}

/**
 * Push-to-start payload (iOS 17.2+). Sent to a device's push-to-start token, so
 * the activity can begin while the app is closed — which is the whole point,
 * since nobody is holding the phone when a booking lands.
 */
function buildStartPayload(booking, hotel, options = {}) {
  const contentState = activityContentState(booking, options);
  const attributes = activityAttributes(booking, hotel);
  const staleSeconds = contentState.deadline
    ? contentState.deadline + 60
    : Math.floor(Date.now() / 1000) + 900;

  return {
    aps: {
      timestamp: Math.floor(Date.now() / 1000),
      event: 'start',
      'content-state': contentState,
      'attributes-type': ACTIVITY_ATTRIBUTES_TYPE,
      attributes,
      'stale-date': staleSeconds,
      alert: {
        title: `${attributes.guestName} · ${attributes.roomName}`,
        body: contentState.noResponseAction === 'release'
          ? 'Is this room still free? No reply releases it.'
          : 'Is this room still free? No reply keeps it.',
      },
    },
  };
}

function buildUpdatePayload(booking, options = {}) {
  const contentState = activityContentState(booking, options);
  return {
    aps: {
      timestamp: Math.floor(Date.now() / 1000),
      event: 'update',
      'content-state': contentState,
      ...(contentState.deadline ? { 'stale-date': contentState.deadline + 60 } : {}),
    },
  };
}

function buildEndPayload(booking, options = {}) {
  const contentState = activityContentState(booking, options);
  const now = Math.floor(Date.now() / 1000);
  return {
    aps: {
      timestamp: now,
      event: 'end',
      'content-state': contentState,
      'dismissal-date': now + END_DISMISSAL_GRACE_SECONDS,
    },
  };
}

/**
 * The lifecycle rule, expressed once.
 *
 * Given a booking's status, decide what should happen to its Live Activity.
 * server.js calls this from the same place every decision already funnels
 * through, so SMS replies, notification actions, in-app taps and the auto sweep
 * all converge here and cannot drift apart.
 */
function liveActivityActionForBooking(booking, existingActivity = null) {
  const status = normalizeStatus(booking?.status);
  const hasActive = !!existingActivity && existingActivity.state === 'active';

  if (status === PENDING_STATUS) {
    // Never start a second activity for the same booking — a duplicate would
    // leave one card orphaned with no token to end it.
    return hasActive ? { action: 'update' } : { action: 'start' };
  }

  if (TERMINAL_STATUSES.has(status)) {
    return hasActive ? { action: 'end' } : { action: 'none', reason: 'no-active-activity' };
  }

  return { action: 'none', reason: `unhandled-status:${status || 'empty'}` };
}

/** APNs headers differ from alert pushes: distinct topic and push type. */
function liveActivityApnsHeaders(bundleId, { priority = 10 } = {}) {
  return {
    'apns-topic': `${bundleId}.push-type.liveactivity`,
    'apns-push-type': 'liveactivity',
    'apns-priority': String(priority),
  };
}

module.exports = {
  ACTIVITY_ATTRIBUTES_TYPE,
  END_DISMISSAL_GRACE_SECONDS,
  normalizeStatus,
  activityAttributes,
  activityContentState,
  activityHeadline,
  buildStartPayload,
  buildUpdatePayload,
  buildEndPayload,
  liveActivityActionForBooking,
  liveActivityApnsHeaders,
};
