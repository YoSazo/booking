const crypto = require('node:crypto');

function normalizeBookingAttemptId(value) {
    const attemptId = String(value || '').trim();
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(attemptId)) return '';
    return attemptId;
}

function buildPreauthIdempotencyKey(hotelId, bookingAttemptId) {
    const cleanHotelId = String(hotelId || '').trim();
    const cleanAttemptId = normalizeBookingAttemptId(bookingAttemptId);
    if (!cleanHotelId || !cleanAttemptId) return '';
    const digest = crypto
        .createHash('sha256')
        .update(`${cleanHotelId}:${cleanAttemptId}`)
        .digest('hex')
        .slice(0, 40);
    return `marketel-preauth-v1-${digest}`;
}

module.exports = {
    buildPreauthIdempotencyKey,
    normalizeBookingAttemptId,
};
