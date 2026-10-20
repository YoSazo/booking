'use strict';
// The order page is one form, like the reference one-step order. Stripe's
// payment fields sit on the page; ticking an extra changes the amount they
// will charge without reloading them, and the server creates the payment only
// when the buyer taps the button. If Stripe's fields can't load, the same
// button opens Stripe's hosted page instead.
(() => {
  const track = window.PayoffTrack || { event() {}, pixel() {}, attribution: {}, visitor: null, headers: { 'Content-Type': 'application/json' } };
  const $ = id => document.getElementById(id);
  const form = $('order-form'), button = $('buy-button'), label = $('buy-label'), status = $('checkout-status');
  const NAME = 'Marketel Payoff - Your Debt-Free Date & Payoff Plan (Reg. $375)';
  const REGULAR_CENTS = 37500;
  const EXTRAS = [{ id: 'cashflow', name: 'Cash-flow calendar', cents: 2200 }, { id: 'reset', name: 'Spending reset', cents: 900 }];
  const RETURN_URL = location.origin + '/payoff/app';
  let config = null, offer = null, serverOffset = 0, attempt = null;
  let stripe = null, cardElements = null, expressElements = null, formReady = false, hosted = false, busy = false, payment = null, quoted = null, shown = null;

  const money = cents => (cents < 0 ? '-' : '') + '$' + (Math.abs(cents) / 100).toFixed(2);
  const selected = () => EXTRAS.filter(extra => $(extra.id).checked);
  const priceOf = extra => config?.addOns?.[extra.id] ?? extra.cents;
  const base = () => config?.priceCents || 3300;
  const discount = () => (offer && offer.discountCents > 0 ? offer.discountCents : 0);
  const total = () => base() - discount() + selected().reduce((sum, extra) => sum + priceOf(extra), 0);
  // The "reserved for" clock repeats every five minutes and never ends the
  // order or the gift. It follows the gift's server clock when there is one.
  const LOOP_MS = 5 * 60 * 1000;
  let reserve = { expiresAt: Date.now() + LOOP_MS, loopMs: LOOP_MS };
  const reserveLeft = () => {
    const now = Date.now() + serverOffset;
    while (reserve.expiresAt <= now) reserve.expiresAt += reserve.loopMs;
    return reserve.expiresAt - now;
  };
  const pad = value => String(value).padStart(2, '0');
  function paintClock() {
    $('reserve-clock').hidden = config?.available === false;
    const seconds = Math.ceil(reserveLeft() / 1000);
    $('reserve-minutes').textContent = pad(Math.floor(seconds / 60));
    $('reserve-seconds').textContent = pad(seconds % 60);
  }

  try {
    attempt = sessionStorage.getItem('payoff.attempt') || crypto.randomUUID();
    sessionStorage.setItem('payoff.attempt', attempt);
    const saved = JSON.parse(sessionStorage.getItem('payoff.addons') || '[]');
    for (const extra of EXTRAS) $(extra.id).checked = Array.isArray(saved) && saved.includes(extra.id);
  } catch { attempt = attempt || crypto.randomUUID(); }

  // The summary table, the value block and the amount Stripe's fields expect.
  const row = (name, quantity, cents) => {
    const line = document.createElement('div');
    line.className = 'grid line';
    for (const [className, text] of [['name', name], ['c', quantity], ['r price', money(cents).replace('$', '$ ')]]) {
      const cell = document.createElement('span');
      cell.className = className; cell.textContent = text; line.append(cell);
    }
    return line;
  };
  function paint() {
    const off = discount();
    $('summary-rows').replaceChildren(row(NAME, '1', base()), ...selected().map(extra => row(extra.name, '1', priceOf(extra))),
      ...(off ? [row('Free gift: $5 off', '', -off)] : []));
    $('order-total').textContent = money(total());
    paintClock();
    const price = base() - off;
    $('glance-price').textContent = money(price).replace('.00', '');
    $('glance-gift').hidden = !off;
    $('only-today').textContent = `Only ${money(price).replace('.00', '')} Today!`;
    $('percent-off').textContent = `(${Math.floor((1 - price / REGULAR_CENTS) * 100)}% off)`;
    const amount = total();
    shown = amount;
    if (amount !== quoted && !busy) {
      quoted = amount;
      cardElements?.update({ amount });
      expressElements?.update({ amount });
    }
  }
  function setButton() {
    button.disabled = busy || !config?.available || !(formReady || hosted);
    label.textContent = busy ? 'Processing…' : 'Get My Debt-Free Date';
  }

  async function refresh() {
    const response = await fetch('/api/payoff/config?offer=1', { headers: track.headers });
    if (!response.ok) throw new Error('Unavailable');
    config = await response.json();
    offer = config.offer || null;
    serverOffset = Number.isFinite(config.serverNow) ? config.serverNow - Date.now() : 0;
    if (offer?.expiresAt && offer.loopMs > 0) reserve = offer;
    paint();
  }

  function useHosted() {
    hosted = true;
    $('payment-element').hidden = true; $('express-checkout').hidden = true; $('or').hidden = true;
    setButton();
  }
  // Stripe.js loads only when the server can take payments in this form.
  const loadStripe = () => new Promise((resolve, reject) => {
    if (typeof window.Stripe === 'function') return resolve();
    const script = Object.assign(document.createElement('script'), { src: 'https://js.stripe.com/v3/', async: true });
    script.addEventListener('load', resolve); script.addEventListener('error', reject);
    document.head.append(script);
  });
  async function startStripe() {
    if (!config.stripeKey) return useHosted();
    try { await loadStripe(); } catch { return useHosted(); }
    if (typeof window.Stripe !== 'function') return useHosted();
    try {
      stripe = window.Stripe(config.stripeKey);
      quoted = total();
      const options = { mode: 'payment', amount: quoted, currency: 'usd' };
      cardElements = stripe.elements(options);
      const card = cardElements.create('payment', { layout: 'tabs', wallets: { link: 'never' }, fields: { billingDetails: { name: 'never', email: 'never' } } });
      card.on('ready', () => { formReady = true; setButton(); });
      card.on('loaderror', useHosted);
      card.mount('#payment-element');
      // Apple Pay and Google Pay sit where the reference has its PayPal buttons.
      expressElements = stripe.elements(options);
      const express = expressElements.create('expressCheckout', { buttonHeight: 44, layout: { maxColumns: 1, overflow: 'never' },
        paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'never', paypal: 'never', amazonPay: 'never' } });
      express.on('ready', ({ availablePaymentMethods }) => {
        const methods = Object.keys(availablePaymentMethods || {}).filter(method => availablePaymentMethods[method]);
        $('express-checkout').dataset.methods = methods.join(' ');
        $('or').hidden = !methods.length;
      });
      express.on('click', event => { if (!busy) event.resolve({ emailRequired: true }); });
      express.on('confirm', payWithWallet);
      express.mount('#express-checkout');
      setTimeout(() => { if (!formReady) useHosted(); }, 20000);
    } catch { useHosted(); }
  }

  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  function buyer() {
    const name = $('name').value.trim(), email = $('email').value.trim();
    $('name').classList.toggle('invalid', !name);
    $('email').classList.toggle('invalid', !validEmail(email));
    if (!name) { status.textContent = 'Please enter your full name.'; $('name').focus(); return null; }
    if (!validEmail(email)) { status.textContent = 'Please enter a valid email address.'; $('email').focus(); return null; }
    return { name, email };
  }
  const orderBody = email => ({ email, addons: selected().map(extra => extra.id), attempt, visitorId: track.visitor,
    attribution: track.attribution, useCheckoutOffer: discount() > 0, expectedTotalCents: total() });
  async function post(route, email) {
    const response = await fetch(route, { method: 'POST', headers: track.headers, body: JSON.stringify(orderBody(email)) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) await refresh().catch(() => {});
      throw new Error(result.message || 'We couldn’t start your payment. Please try again.');
    }
    track.event('PayoffCheckoutOpened');
    track.pixel('InitiateCheckout', { value: result.value }, track.visitor ? `payoff-checkout.${track.visitor}` : undefined);
    return result;
  }
  // The same order (after a declined card, say) keeps the same payment.
  async function createPayment(email) {
    const key = JSON.stringify([selected().map(extra => extra.id), email, total()]);
    if (payment?.key !== key) payment = { key, ...await post('/api/payoff/pay', email) };
    return payment;
  }

  function paid(intent) {
    try { sessionStorage.removeItem('payoff.attempt'); } catch { /* Optional. */ }
    location.assign('/payoff/app?payment_intent=' + encodeURIComponent(intent.id));
  }
  function failed(error) {
    if (error?.code === 'payment_intent_unexpected_state' && error.payment_intent?.status === 'succeeded') return paid(error.payment_intent);
    track.event('PayoffCheckoutFailed');
    status.textContent = error?.message || 'Your payment didn’t go through. Please try again.';
    busy = false; setButton(); paint();
  }

  // Never charge a total the buyer hasn't seen.
  function totalChanged() {
    if (total() === shown) return false;
    paint();
    status.textContent = 'Your total changed. Review the updated total and continue when you’re ready.';
    return true;
  }
  form.addEventListener('submit', async submit => {
    submit.preventDefault();
    if (busy || button.disabled) return;
    status.textContent = '';
    if (totalChanged()) return;
    const who = buyer();
    if (!who) return;
    busy = true; setButton();
    track.event('PayoffCheckoutTapped');
    try {
      if (hosted) {
        const { url } = await post('/api/payoff/checkout', who.email);
        const target = new URL(url);
        if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('Checkout could not open. Please try again.');
        return location.assign(target.href);
      }
      // Stripe shows what's missing beside its own fields.
      const { error: incomplete } = await cardElements.submit();
      if (incomplete) { busy = false; setButton(); paint(); return; }
      const { clientSecret } = await createPayment(who.email);
      const { error, paymentIntent } = await stripe.confirmPayment({ elements: cardElements, clientSecret, redirect: 'if_required',
        confirmParams: { return_url: RETURN_URL, payment_method_data: { billing_details: { name: who.name, email: who.email } } } });
      if (error) throw error;
      paid(paymentIntent);
    } catch (error) { failed(error); }
  });
  async function payWithWallet(event) {
    status.textContent = '';
    if (totalChanged()) { try { event.paymentFailed({ reason: 'fail' }); } catch { /* Already closed. */ } return; }
    busy = true; setButton();
    track.event('PayoffCheckoutTapped');
    try {
      const { error: incomplete } = await expressElements.submit();
      if (incomplete) throw incomplete;
      const { clientSecret } = await createPayment(event.billingDetails?.email || $('email').value.trim());
      const { error, paymentIntent } = await stripe.confirmPayment({ elements: expressElements, clientSecret, redirect: 'if_required', confirmParams: { return_url: RETURN_URL } });
      if (error) throw error;
      paid(paymentIntent);
    } catch (error) {
      try { event.paymentFailed({ reason: 'fail' }); } catch { /* The sheet may already be closed. */ }
      failed(error);
    }
  }

  form.addEventListener('change', event => {
    if (!EXTRAS.some(extra => extra.id === event.target.id)) return;
    try { sessionStorage.setItem('payoff.addons', JSON.stringify(selected().map(extra => extra.id))); } catch { /* Optional. */ }
    paint();
  });
  for (const id of ['name', 'email']) $(id).addEventListener('input', () => $(id).classList.remove('invalid'));
  if (new URLSearchParams(location.search).has('cancelled')) {
    status.textContent = 'Checkout was canceled and you were not charged. You can try again any time.';
    track.event('PayoffCheckoutCancelled');
  }
  window.addEventListener('pageshow', event => { if (event.persisted) { busy = false; setButton(); } });

  paint();
  setInterval(paintClock, 1000);
  refresh().then(() => {
    if (!config.available) status.textContent = config.preview ? 'Payments are disabled in the local preview.' : 'Purchases are temporarily unavailable. Please try again later or contact support@bookmarketel.com.';
    else startStripe();
    setButton();
  }).catch(() => {
    status.textContent = 'Please reload to try again or contact support@bookmarketel.com.';
    setButton();
  });
})();
