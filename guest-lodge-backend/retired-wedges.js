'use strict';
// The shelved products' sales pages open the booking engine offer at
// bookmarketel.com instead (Oct 30 2026). What their buyers still use is left
// alone: Payoff's app, receipts, upgrade and Coach pages; each report app when
// the link carries one of the app's own parameters (sign-in, Stripe returns,
// previews); Trace's unlock and payment links; every terms page, API and
// webhook. RETIRED_WEDGES_REDIRECT=false on Render turns this off without a deploy.
const { wantsClaimsApp } = require('./claims-offer-route');

// Pages that only ever sold.
const SALES_PAGES = new Set(['/payoff', '/payoff/hidden-payoff', '/payoff/show', '/payoff/order', '/claims/offer']);
// Report apps: a plain visit is an ad visitor; a link with the app's parameters is a buyer.
const APP_ENTRIES = new Set(['/claims', '/incident', '/intake', '/moveout',
  '/inspect', '/inspect/claims', '/inspect/incident', '/inspect/intake', '/inspect/moveout']);
const TRACE_RETURNS = ['unlock', 'paid', 'cancelled'];

function retiredSalesPage(pathname, query = {}) {
  const page = String(pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
  if (SALES_PAGES.has(page)) return true;
  if (APP_ENTRIES.has(page)) return !wantsClaimsApp(query);
  if (page === '/trace') return !TRACE_RETURNS.some(key => Object.hasOwn(query, key));
  return false;
}

// To the homepage on the same host, keeping the query (an ad's click id and tags).
function redirectRetiredSalesPages(env = process.env) {
  return (req, res, next) => {
    if (env.RETIRED_WEDGES_REDIRECT === 'false' || !['GET', 'HEAD'].includes(req.method) || !retiredSalesPage(req.path, req.query)) return next();
    const at = req.originalUrl.indexOf('?');
    res.set('Cache-Control', 'no-store');
    res.redirect(302, `/${at === -1 ? '' : req.originalUrl.slice(at)}`);
  };
}

module.exports = { retiredSalesPage, redirectRetiredSalesPages };
