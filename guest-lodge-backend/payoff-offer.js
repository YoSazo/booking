'use strict';
const crypto = require('node:crypto');
// The free $5 gift deliberately never ends (see payoff-web/README.md): its
// "reserved for" clock repeats every five minutes from the moment checkout
// first opened. Older tokens stored a 30-minute end; it anchors the loop.
const LOOP_MS = 5 * 60 * 1000;
const OFFER = Object.freeze({ version: 'payoff-checkout-5-v1', discountCents: 500, durationMs: LOOP_MS, loopMs: LOOP_MS, cookie: 'payoff_checkout_offer' });
const signature = (secret, payload) => crypto.createHmac('sha256', secret).update(`payoff-offer:${payload}`).digest('base64url');
function issueOffer(secret, now = Date.now()) {
  const payload = `${crypto.randomBytes(16).toString('hex')}.${now + OFFER.loopMs}`;
  return `${payload}.${signature(secret, payload)}`;
}
function readOffer(secret, token, now = Date.now()) {
  if (!secret || typeof token !== 'string') return null;
  const match = /^([a-f0-9]{32})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(signature(secret, `${match[1]}.${match[2]}`)), supplied = Buffer.from(match[3]);
  if (!crypto.timingSafeEqual(expected, supplied)) return null;
  const left = ((Number(match[2]) - now) % OFFER.loopMs + OFFER.loopMs) % OFFER.loopMs || OFFER.loopMs;
  return { expiresAt: now + left, discountCents: OFFER.discountCents, loopMs: OFFER.loopMs };
}
const cookieValue = (req, name) => {
  const entry = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
};
const offerCookie = req => cookieValue(req, OFFER.cookie);

// The quiz earns the same $5: finish it within the window from the first
// answer. The checkout offer's own clock still starts at checkout.
const QUIZ = Object.freeze({ cookie: 'payoff_quiz', windowMs: 10 * 60 * 1000 });
function issueQuiz(secret, startAt, finishAt = 0, nonce = crypto.randomBytes(16).toString('hex')) {
  const payload = `${nonce}.${startAt}.${finishAt}`;
  return `${payload}.${signature(secret, `quiz:${payload}`)}`;
}
function readQuiz(secret, token) {
  if (!secret || typeof token !== 'string') return null;
  const match = /^([a-f0-9]{32})\.(\d{13})\.(0|\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(signature(secret, `quiz:${match[1]}.${match[2]}.${match[3]}`)), supplied = Buffer.from(match[4]);
  if (!crypto.timingSafeEqual(expected, supplied)) return null;
  const startAt = Number(match[2]), finishAt = Number(match[3]) || null, deadline = startAt + QUIZ.windowMs;
  return { nonce: match[1], startAt, finishAt, deadline, earned: !!finishAt && finishAt <= deadline };
}
const quizCookie = req => cookieValue(req, QUIZ.cookie);
function orderDiscount(session) {
  const metadata = session?.metadata || {};
  if (metadata.checkoutDiscountCents === undefined && metadata.checkoutDiscountVersion === undefined) return 0;
  return metadata.checkoutDiscountVersion === OFFER.version && metadata.checkoutDiscountCents === String(OFFER.discountCents) ? OFFER.discountCents : null;
}
module.exports = { OFFER, issueOffer, readOffer, offerCookie, orderDiscount, QUIZ, issueQuiz, readQuiz, quizCookie };
