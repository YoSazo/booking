'use strict';
const crypto = require('node:crypto');
const OFFER = Object.freeze({ version: 'payoff-checkout-5-v1', discountCents: 500, durationMs: 30 * 60 * 1000, cookie: 'payoff_checkout_offer' });
const signature = (secret, payload) => crypto.createHmac('sha256', secret).update(`payoff-offer:${payload}`).digest('base64url');
function issueOffer(secret, now = Date.now()) {
  const payload = `${crypto.randomBytes(16).toString('hex')}.${now + OFFER.durationMs}`;
  return `${payload}.${signature(secret, payload)}`;
}
function readOffer(secret, token, now = Date.now()) {
  if (!secret || typeof token !== 'string') return null;
  const match = /^([a-f0-9]{32})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(signature(secret, `${match[1]}.${match[2]}`)), supplied = Buffer.from(match[3]);
  if (!crypto.timingSafeEqual(expected, supplied)) return null;
  const expiresAt = Number(match[2]);
  return { expiresAt, discountCents: now < expiresAt ? OFFER.discountCents : 0 };
}
function offerCookie(req) {
  const entry = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${OFFER.cookie}=`));
  return entry ? entry.slice(OFFER.cookie.length + 1) : null;
}
function orderDiscount(session) {
  const metadata = session?.metadata || {};
  if (metadata.checkoutDiscountCents === undefined && metadata.checkoutDiscountVersion === undefined) return 0;
  return metadata.checkoutDiscountVersion === OFFER.version && metadata.checkoutDiscountCents === String(OFFER.discountCents) ? OFFER.discountCents : null;
}
module.exports = { OFFER, issueOffer, readOffer, offerCookie, orderDiscount };
