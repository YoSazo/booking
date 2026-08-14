export const DEAD_BOOKING_STATUSES = new Set(['cancelled', 'canceled', 'released']);

export function normalizeBookingStatus(value) {
  const status = String(value || 'confirmed').trim().toLowerCase();
  if (status === 'canceled') return 'cancelled';
  return status || 'confirmed';
}

export function isDeadBookingStatus(value) {
  return DEAD_BOOKING_STATUSES.has(normalizeBookingStatus(value));
}

export function isPendingBookingStatus(value) {
  return normalizeBookingStatus(value) === 'pending';
}

function dateStamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function todayStamp(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntilStayDate(value, now = new Date()) {
  const target = dateStamp(value);
  if (target == null) return null;
  return Math.round((target - todayStamp(now)) / 86400000);
}

export function getStayPhase(booking, now = new Date()) {
  const status = normalizeBookingStatus(booking?.status);
  if (isDeadBookingStatus(status)) return status === 'released' ? 'released' : 'cancelled';
  if (status === 'pending') return 'pending';

  const untilCheckin = daysUntilStayDate(booking?.checkin || booking?.checkinDate, now);
  const untilCheckout = daysUntilStayDate(booking?.checkout || booking?.checkoutDate, now);
  if (untilCheckout != null && untilCheckout < 0) return 'completed';
  if (untilCheckout === 0) return 'checkout_today';
  if (untilCheckin != null && untilCheckin < 0) return 'in_stay';
  if (untilCheckin === 0) return 'checkin_today';
  if (untilCheckin === 1) return 'checkin_tomorrow';
  return 'confirmed';
}

export function getStayStatusMeta(booking) {
  const phase = getStayPhase(booking);
  switch (phase) {
    case 'pending':
      return { phase, label: 'Awaiting confirmation', tone: 'pending', active: true };
    case 'released':
      return { phase, label: 'Released', tone: 'dead', active: false };
    case 'cancelled':
      return { phase, label: 'Cancelled', tone: 'dead', active: false };
    case 'completed':
      return { phase, label: 'Completed', tone: 'muted', active: false };
    case 'checkin_today':
      return { phase, label: 'Check-in today', tone: 'confirmed', active: true };
    case 'checkin_tomorrow':
      return { phase, label: 'Check-in tomorrow', tone: 'confirmed', active: true };
    case 'in_stay':
      return { phase, label: 'In progress', tone: 'confirmed', active: true };
    case 'checkout_today':
      return { phase, label: 'Check-out today', tone: 'confirmed', active: true };
    default:
      return { phase: 'confirmed', label: 'Confirmed', tone: 'confirmed', active: true };
  }
}

export function formatStayDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: options.includeYear === false ? undefined : 'numeric',
    timeZone: 'UTC',
  });
}

export function stayStorageSnapshot(booking, current = {}) {
  if (!booking) return current;
  return {
    ...current,
    code: booking.reservationCode || current.code,
    email: booking.guestEmail || current.email || '',
    checkin: booking.checkin || booking.checkinDate || current.checkin,
    checkout: booking.checkout || booking.checkoutDate || current.checkout,
    roomName: booking.roomName || current.roomName || '',
    name: [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ').trim()
      || current.name
      || '',
    phone: booking.guestPhone || current.phone || '',
    total: booking.total ?? current.total ?? null,
    amountPaidNow: booking.amountPaidNow ?? current.amountPaidNow ?? null,
    bookingType: booking.bookingType || current.bookingType || '',
    status: normalizeBookingStatus(booking.status),
    pendingUntil: booking.pendingUntil || null,
    approvalNoResponseAction: booking.approvalNoResponseAction || null,
    approvalOutcome: booking.approvalOutcome || null,
    cancellationReason: booking.cancellationReason || null,
    cancelledAt: booking.cancelledAt || null,
    holdStatus: booking.holdStatus || null,
    fulfillmentStatus: booking.fulfillmentStatus || current.fulfillmentStatus || null,
    createdAt: booking.createdAt || current.createdAt || null,
    updatedAt: booking.updatedAt || current.updatedAt || null,
  };
}
