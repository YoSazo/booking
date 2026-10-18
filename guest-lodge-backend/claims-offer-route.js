'use strict';
// /claims is two things: the long-form offer an ad visitor lands on, and the
// Claims app that buyers come back to. The app's own links all carry one of
// its parameters (back from Stripe, sign-in, previews, the app's arms); a
// plain visit, whatever tracking tags it carries, is someone from an ad.
const APP_PARAMS = new Set(['sim', 'checkout', 'session', 'report', 'open', 'arm', 'take', 'choose', 'request', 'storefront', 'native', 'cursor', 'journey', 'app']);
const wantsClaimsApp = (query = {}) => Object.keys(query).some(key => APP_PARAMS.has(key));
module.exports = { APP_PARAMS, wantsClaimsApp };
