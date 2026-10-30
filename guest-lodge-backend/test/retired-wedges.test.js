'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { retiredSalesPage, redirectRetiredSalesPages } = require('../retired-wedges');

test('the shelved sales pages go to the engine offer; what buyers use stays', () => {
  for (const page of ['/payoff', '/payoff/', '/Payoff', '/payoff/hidden-payoff', '/payoff/show', '/payoff/order', '/claims/offer']) {
    assert.equal(retiredSalesPage(page, { utm_source: 'facebook', fbclid: 'x' }), true, page);
  }
  for (const page of ['/claims', '/incident', '/intake', '/moveout', '/inspect', '/inspect/claims', '/trace']) {
    assert.equal(retiredSalesPage(page, {}), true, page);
    assert.equal(retiredSalesPage(page, { fbclid: 'x' }), true, `${page} from an ad`);
  }
  // Buyers' links.
  assert.equal(retiredSalesPage('/claims', { session: 'abc' }), false);
  assert.equal(retiredSalesPage('/incident', { checkout: 'done' }), false);
  assert.equal(retiredSalesPage('/inspect/moveout', { native: '1' }), false);
  assert.equal(retiredSalesPage('/trace', { unlock: 'token' }), false);
  assert.equal(retiredSalesPage('/trace', { paid: 'cs_test_1' }), false);
  for (const page of ['/payoff/app', '/payoff/confirmation', '/payoff/upgrade', '/payoff/terms', '/payoff/privacy', '/claims/terms', '/trace/terms',
    '/api/payoff/config', '/api/inspect-stripe-webhook', '/payoff/assets/x.png']) {
    assert.equal(retiredSalesPage(page, {}), false, page);
  }
  // The engine and the rest of the site.
  for (const page of ['/', '/engine', '/engine/welcome', '/landing', '/setup/abc', '/frontdesk', '/funnel', '/privacy', '/terms']) {
    assert.equal(retiredSalesPage(page, {}), false, page);
  }
});

test('the redirect keeps the ad\'s query, and can be switched off', async () => {
  const serve = async (env, fn) => {
    const app = express();
    app.use(redirectRetiredSalesPages(env));
    app.use((req, res) => res.send('page'));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    try { await fn(base); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  };
  await serve({}, async base => {
    const sold = await fetch(base + '/payoff/hidden-payoff?fbclid=abc&utm_source=facebook', { redirect: 'manual' });
    assert.equal(sold.status, 302);
    assert.equal(sold.headers.get('location'), '/?fbclid=abc&utm_source=facebook');
    const plain = await fetch(base + '/claims', { redirect: 'manual' });
    assert.equal(plain.headers.get('location'), '/');
    assert.equal((await fetch(base + '/claims?session=abc', { redirect: 'manual' })).status, 200);
    assert.equal((await fetch(base + '/payoff/app?access=x', { redirect: 'manual' })).status, 200);
    assert.equal((await fetch(base + '/payoff', { method: 'POST', redirect: 'manual' })).status, 200);
  });
  await serve({ RETIRED_WEDGES_REDIRECT: 'false' }, async base => {
    assert.equal((await fetch(base + '/payoff', { redirect: 'manual' })).status, 200);
  });
});
