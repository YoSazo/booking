const crypto = require('crypto');

const VERSION = 'v1';
const IDENTITY_LIFETIME_SECONDS = 90 * 24 * 60 * 60;
const RESERVATION_LIFETIME_SECONDS = 2 * 365 * 24 * 60 * 60;

function secret(options = {}) {
    const env = options.env || process.env;
    return String(options.secret || env.GUEST_IDENTITY_SECRET || env.SESSION_SECRET || '');
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left || ''));
    const b = Buffer.from(String(right || ''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createToken(kind, claims, lifetimeSeconds, options = {}) {
    const signingSecret = secret(options);
    if (!signingSecret) throw new Error('Guest identity signing is not configured.');
    const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
    const payload = Buffer.from(JSON.stringify({ ...claims, kind, exp: now + lifetimeSeconds })).toString('base64url');
    const prefix = `guestel.${VERSION}.${payload}`;
    const signature = crypto.createHmac('sha256', signingSecret).update(prefix).digest('base64url');
    return `${prefix}.${signature}`;
}

function readToken(token, expectedKind, options = {}) {
    const signingSecret = secret(options);
    if (!signingSecret) return null;
    const parts = String(token || '').trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'guestel' || parts[1] !== VERSION) return null;
    const prefix = parts.slice(0, 3).join('.');
    const expected = crypto.createHmac('sha256', signingSecret).update(prefix).digest('base64url');
    if (!safeEqual(parts[3], expected)) return null;
    try {
        const claims = JSON.parse(Buffer.from(parts[2], 'base64url').toString('utf8'));
        const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
        if (claims.kind !== expectedKind || !Number.isFinite(claims.exp) || claims.exp <= now) return null;
        return claims;
    } catch (_) {
        return null;
    }
}

function createGuestIdentityToken(email, options = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail.includes('@')) throw new Error('A valid guest email is required.');
    return createToken('identity', { email: normalizedEmail }, IDENTITY_LIFETIME_SECONDS, options);
}

function readGuestIdentityToken(token, options = {}) {
    const claims = readToken(token, 'identity', options);
    return claims?.email ? { email: claims.email, expiresAt: claims.exp } : null;
}

function createReservationToken(booking, options = {}) {
    if (!booking?.id || !booking?.hotelId) throw new Error('A persisted booking is required.');
    const reservationCode = String(booking.pmsConfirmationCode || booking.ourReservationCode || '').trim();
    if (!reservationCode) throw new Error('A reservation code is required.');
    return createToken('reservation', {
        bookingId: booking.id,
        hotelId: booking.hotelId,
        reservationCode,
    }, RESERVATION_LIFETIME_SECONDS, options);
}

function readReservationToken(token, options = {}) {
    const claims = readToken(token, 'reservation', options);
    if (!claims?.bookingId || !claims?.hotelId || !claims?.reservationCode) return null;
    return claims;
}

module.exports = {
    createGuestIdentityToken,
    createReservationToken,
    readGuestIdentityToken,
    readReservationToken,
};
