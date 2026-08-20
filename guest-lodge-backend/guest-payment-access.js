const crypto = require('crypto');

const TOKEN_VERSION = 'v1';
const TOKEN_LIFETIME_SECONDS = 365 * 24 * 60 * 60;

function signingSecret(env = process.env) {
    // A dedicated secret is preferred, but the Stripe secret is already a
    // high-entropy server-only value and keeps existing deployments secure
    // while GUEST_PAYMENT_TOKEN_SECRET is rolled out.
    return String(env.GUEST_PAYMENT_TOKEN_SECRET || env.STRIPE_SECRET_KEY || '');
}

function sign(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createGuestPaymentToken(customerId, options = {}) {
    const cleanCustomerId = String(customerId || '').trim();
    const secret = String(options.secret || signingSecret(options.env));
    if (!cleanCustomerId.startsWith('cus_')) throw new Error('A Stripe customer is required.');
    if (!secret) throw new Error('Guest payment token signing is not configured.');

    const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
    const payload = Buffer.from(JSON.stringify({
        customerId: cleanCustomerId,
        exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    })).toString('base64url');
    return `${TOKEN_VERSION}.${payload}.${sign(`${TOKEN_VERSION}.${payload}`, secret)}`;
}

function readGuestPaymentToken(token, options = {}) {
    const secret = String(options.secret || signingSecret(options.env));
    if (!secret) return null;

    const parts = String(token || '').trim().split('.');
    if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
    const [version, payload, suppliedSignature] = parts;
    const expectedSignature = sign(`${version}.${payload}`, secret);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
        if (!String(decoded.customerId || '').startsWith('cus_')) return null;
        if (!Number.isFinite(decoded.exp) || decoded.exp <= nowSeconds) return null;
        return { customerId: decoded.customerId, expiresAt: decoded.exp };
    } catch (_) {
        return null;
    }
}

function bearerToken(req) {
    const authorization = String(req?.headers?.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

module.exports = {
    bearerToken,
    createGuestPaymentToken,
    readGuestPaymentToken,
};
