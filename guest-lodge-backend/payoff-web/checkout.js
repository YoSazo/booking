'use strict';
(() => {
  const form = document.getElementById('order-form');
  const button = document.getElementById('preorder-button');
  const status = document.getElementById('checkout-status');
  let visitor = null, excluded = /HeadlessChrome|Playwright|bot\b/i.test(navigator.userAgent), attempt;
  try {
    const tracking = new URLSearchParams(location.search).get('notrack');
    if (tracking === '1') localStorage.setItem('marketel.noTrack', '1');
    if (tracking === '0') localStorage.removeItem('marketel.noTrack');
    excluded = excluded || localStorage.getItem('marketel.noTrack') === '1';
    visitor = sessionStorage.getItem('payoff.visitor');
    if (!visitor) { visitor = 'v_' + crypto.randomUUID().replaceAll('-', ''); sessionStorage.setItem('payoff.visitor', visitor); }
  } catch { /* Checkout still works when storage is unavailable. */ }
  const headers = { 'Content-Type': 'application/json', ...(excluded ? { 'x-marketel-no-track': '1' } : {}) };
  const event = (name, detail = null) => {
    if (!excluded) fetch('/api/payoff/event', { method: 'POST', headers, body: JSON.stringify({ name, detail, visitorId: visitor }), keepalive: true }).catch(() => {});
  };
  event(form ? 'PayoffOrderViewed' : 'PayoffLanded');
  if (!form) event('PayoffFrom', new URLSearchParams(location.search).has('fbclid') ? 'ad'
    : /facebook\.com|instagram\.com/i.test(document.referrer) ? 'social' : !document.referrer ? 'direct' : 'other');
  if (!form || !button) return;
  let ready = false, busy = false;
  const randomAttempt = () => crypto.randomUUID();
  try {
    attempt = sessionStorage.getItem('payoff.attempt') || randomAttempt();
    sessionStorage.setItem('payoff.attempt', attempt);
    const selected = JSON.parse(sessionStorage.getItem('payoff.addons') || '[]');
    for (const id of ['cashflow', 'reset']) document.getElementById(id).checked = selected.includes(id);
    form.dispatchEvent(new Event('change'));
  } catch { attempt = randomAttempt(); }
  if (new URLSearchParams(location.search).has('cancelled')) {
    status.textContent = 'Checkout was canceled. No completed payment was confirmed. You can review your preorder and try again.';
    event('PayoffCheckoutCancelled');
  }
  const saveExtras = () => {
    const addons = ['cashflow', 'reset'].filter(id => document.getElementById(id).checked);
    try { sessionStorage.setItem('payoff.addons', JSON.stringify(addons)); } catch { /* Optional. */ }
    return addons;
  };
  form.addEventListener('change', saveExtras);
  const refresh = () => fetch('/api/payoff/config', { headers }).then(response => {
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }).then(config => {
    ready = config.available === true;
    button.disabled = !ready;
    button.textContent = ready ? 'Continue to secure preorder payment' : 'Purchases are temporarily unavailable';
    button.classList.toggle('disabled-payment', !ready);
    if (!ready) status.textContent = config.preview ? 'Payments are disabled in the local preview.' : 'Please try again later or contact support@bookmarketel.com.';
  }).catch(() => {
    button.textContent = 'Purchases are temporarily unavailable';
    status.textContent = 'Please reload to try again or contact support@bookmarketel.com.';
  });
  form.addEventListener('submit', async submit => {
    submit.preventDefault();
    if (!ready || busy || !form.reportValidity()) return;
    busy = true; button.disabled = true; button.textContent = 'Opening secure checkout…';
    status.textContent = ''; event('PayoffCheckoutTapped');
    try {
      const response = await fetch('/api/payoff/checkout', { method: 'POST', headers,
        body: JSON.stringify({ email: document.getElementById('email').value.trim(), addons: saveExtras(),
          preorderAccepted: document.getElementById('preorder-consent').checked ? 'payoff-preorder-v1' : '', attempt, visitorId: visitor }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Checkout could not open. Please try again.');
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Checkout could not open. Please try again.');
      event('PayoffCheckoutOpened');
      location.assign(url.href);
    } catch (error) {
      event('PayoffCheckoutFailed');
      status.textContent = error.message || 'Checkout could not open. Please try again.';
      busy = false; button.disabled = false; button.textContent = 'Continue to secure preorder payment';
    }
  });
  window.addEventListener('pageshow', () => {
    busy = false;
    if (ready) { button.disabled = false; button.textContent = 'Continue to secure preorder payment'; }
  });
  refresh();
})();
