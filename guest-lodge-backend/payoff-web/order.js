'use strict';
// The order page is one form, like the reference one-step order. Stripe's
// payment fields sit on the page; ticking an extra changes the amount they
// will charge without reloading them, and the server creates the payment only
// when the buyer taps the button. If Stripe's fields can't load, the same
// button opens Stripe's hosted page instead.
(() => {
  const track = window.PayoffTrack || { event() {}, pixel() {}, attribution: {}, visitor: null, headers: { 'Content-Type': 'application/json' } };
  // Each step toward paying, once per visitor, for the funnel (measure.js).
  const mark = detail => !!window.PayoffMeasure?.mark(detail);
  // Starting to pay counts as Meta's AddToCart before the 20 seconds are up.
  const cart = () => window.PayoffMeasure?.cart();
  const $ = id => document.getElementById(id);
  const form = $('order-form'), button = $('buy-button'), label = $('buy-label'), status = $('checkout-status');
  const NAME = 'Marketel Payoff - Your Debt-Free Date & Payoff Plan (Reg. $375)';
  const REGULAR_CENTS = 37500;
  const EXTRAS = [{ id: 'cashflow', name: 'Cash-flow calendar', cents: 2200 }, { id: 'reset', name: 'Spending reset', cents: 900 }];
  const RETURN_URL = location.origin + '/payoff/upgrade';
  let config = null, offer = null, attempt = null;
  let stripe = null, cardElements = null, expressElements = null, formReady = false, hosted = false, busy = false, payment = null, quoted = null, shown = null;

  const money = cents => (cents < 0 ? '-' : '') + '$' + (Math.abs(cents) / 100).toFixed(2);
  const selected = () => EXTRAS.filter(extra => $(extra.id).checked);
  const priceOf = extra => config?.addOns?.[extra.id] ?? extra.cents;
  const base = () => config?.priceCents || 3311;
  const discount = () => (offer && offer.discountCents > 0 ? offer.discountCents : 0);
  const total = () => base() - discount() + selected().reduce((sum, extra) => sum + priceOf(extra), 0);
  // The "reserved for" clock: five minutes, carried through reloads; at 00:00
  // it stays there, and the next page load starts a new five minutes. It never
  // ends the order or the gift, which the server honours whatever it shows.
  const RESERVE_MS = 5 * 60 * 1000, RESERVE = 'payoff.reserveEnd';
  let reserveEnd = Date.now() + RESERVE_MS;
  try {
    const saved = Number(localStorage.getItem(RESERVE));
    if (saved > Date.now() && saved <= Date.now() + RESERVE_MS) reserveEnd = saved;
    localStorage.setItem(RESERVE, String(reserveEnd));
  } catch { /* A fresh five minutes on each visit. */ }
  const reserveLeft = () => Math.max(0, reserveEnd - Date.now());
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
      ...(off ? [row('Discount', '', -off)] : []));
    $('order-total').textContent = money(total());
    paintClock();
    const price = base() - off;
    // No $ on the price they pay, as on the reference order pages.
    $('glance-price').textContent = (price / 100).toFixed(2).replace('.00', '');
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
    paint();
  }

  function useHosted() {
    mark('hosted');
    hosted = true;
    $('payment-element').hidden = true; $('express-checkout').hidden = true;
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
      // Must match the PaymentIntent from /api/payoff/pay: cards are kept for this visit only.
      const options = { mode: 'payment', amount: quoted, currency: 'usd', paymentMethodOptions: { card: { setup_future_usage: 'on_session' } } };
      cardElements = stripe.elements(options);
      const card = cardElements.create('payment', { layout: 'tabs', paymentMethodOrder: ['card', 'us_bank_account', 'klarna'], wallets: { link: 'never' }, fields: { billingDetails: { name: 'never', email: 'never' } } });
      card.on('ready', () => { formReady = true; setButton(); mark('stripe-ready'); });
      // Which way they chose to pay, and how far into the card details they got.
      card.on('change', ({ empty, complete, value }) => {
        if (value?.type === 'us_bank_account') mark('method-bank');
        else if (value?.type === 'klarna') mark('method-klarna');
        else if (!empty) { mark('card-start'); if (complete) mark('card-done'); }
      });
      card.on('loaderror', useHosted);
      card.mount('#payment-element');
      // Apple Pay and Google Pay on the first screen, above "Pay by card", when
      // this phone has one.
      expressElements = stripe.elements(options);
      const express = expressElements.create('expressCheckout', { buttonHeight: 48, layout: { maxColumns: 1, overflow: 'never' },
        paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'never', paypal: 'never', amazonPay: 'never' } });
      express.on('ready', ({ availablePaymentMethods }) => {
        const methods = Object.keys(availablePaymentMethods || {}).filter(method => availablePaymentMethods[method]);
        $('express-checkout').dataset.methods = methods.join(' ');
        $('express-checkout').hidden = !methods.length;
        if (methods.length) mark('wallet-shown');
      });
      express.on('click', event => { mark('wallet-tap'); cart(); if (!busy) event.resolve({ emailRequired: true }); });
      express.on('confirm', payWithWallet);
      express.mount('#express-checkout');
      setTimeout(() => { if (!formReady) useHosted(); }, 20000);
    } catch { useHosted(); }
  }

  // "Pay by card ↓" at the top is starting to pay (Meta's AddToCart); it
  // brings up the form.
  $('to-card').addEventListener('click', event => {
    event.preventDefault();
    mark('top-card'); cart();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // The arrow from "If it doesn't…" around both ways to pay to the refund
  // promise, drawn to fit this screen: out to the lane on the right, down and
  // back in, with the same rounded turn at each corner.
  function drawArrow() {
    const svg = $('why-arrow'), box = svg.parentElement.getBoundingClientRect();
    const from = $('why-if').getBoundingClientRect(), to = $('refund-head').getClientRects()[0];
    if (!to || !from.width) return svg.toggleAttribute('hidden', true);
    const r = 12, lane = box.width - 16, refund = $('refund-head').closest('.refund').getBoundingClientRect();
    const x1 = from.right - box.left + 6, y1 = from.top - box.top + from.height / 2;
    const x2 = refund.right - box.left + 7, y2 = to.top - box.top + to.height / 2;
    svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    $('why-path').setAttribute('d', `M ${x1} ${y1} H ${lane - r} A ${r} ${r} 0 0 1 ${lane} ${y1 + r} V ${y2 - r} A ${r} ${r} 0 0 1 ${lane - r} ${y2} H ${x2}`);
    svg.toggleAttribute('hidden', false);
  }
  if ('ResizeObserver' in window) new ResizeObserver(drawArrow).observe($('why-arrow').parentElement);
  else addEventListener('resize', drawArrow);
  document.fonts?.ready.then(drawArrow);
  drawArrow();

  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const fieldOk = { name: value => !!value.trim(), email: value => validEmail(value.trim()) };
  // As on the booking checkout: each missing field says so right under it, and
  // the page scrolls them into view without opening the keyboard. The button
  // sits far below the fields on phones, so a message there would go unseen.
  function flagField(id, wrong) {
    $(id).classList.toggle('invalid', wrong);
    $(id).setAttribute('aria-invalid', String(wrong));
    const note = $(id + '-error');
    if (wrong && !note.hidden) { note.style.animation = 'none'; void note.offsetWidth; note.style.animation = ''; }
    note.hidden = !wrong;
  }
  function buyer() {
    const name = $('name').value.trim(), email = $('email').value.trim();
    const missing = Object.keys(fieldOk).filter(id => !fieldOk[id]($(id).value));
    for (const id of Object.keys(fieldOk)) flagField(id, missing.includes(id));
    if (!missing.length) return { name, email };
    for (const id of missing) mark('missing-' + id);
    status.textContent = missing.length > 1 ? 'Add your name and email above to continue.' : missing[0] === 'name' ? 'Add your full name above to continue.' : 'Add a valid email above to continue.';
    $(missing[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return null;
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
    location.assign('/payoff/upgrade?payment_intent=' + encodeURIComponent(intent.id));
  }
  function failed(error) {
    if (error?.code === 'payment_intent_unexpected_state' && error.payment_intent?.status === 'succeeded') return paid(error.payment_intent);
    track.event('PayoffCheckoutFailed');
    mark(error?.type === 'card_error' ? 'declined' : 'error');
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
    cart();
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
      if (incomplete) { mark('card-incomplete'); busy = false; setButton(); paint(); return; }
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
    if (event.target.checked) mark('addon-' + event.target.id);
    try { sessionStorage.setItem('payoff.addons', JSON.stringify(selected().map(extra => extra.id))); } catch { /* Optional. */ }
    paint();
  });
  // A message goes as soon as its field is filled in properly.
  for (const id of Object.keys(fieldOk)) $(id).addEventListener('input', () => {
    if (!fieldOk[id]($(id).value)) return;
    flagField(id, false);
    if (status.textContent.startsWith('Add ') && Object.keys(fieldOk).every(other => fieldOk[other]($(other).value))) status.textContent = '';
  });
  // Filled in, not what was typed. A valid email is the first step of paying,
  // sent to Meta as StartedPaying (the server sends its copy with the same id).
  $('name').addEventListener('change', () => { if ($('name').value.trim()) mark('name'); });
  $('email').addEventListener('change', () => {
    if (!validEmail($('email').value.trim())) return;
    cart();
    if (mark('email')) track.pixel('StartedPaying', { value: 33.11 }, track.visitor ? `payoff-started.${track.visitor}` : undefined, true);
  });
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
