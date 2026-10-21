'use strict';
// The Interest Cutter offer: right after paying, two one-time prices, each
// with a real two-minute clock (when it ends, so does the price); from
// inside Payoff, the regular price. Whatever the buyer picks, their plan
// opens: they already paid for it.
(() => {
  const C = window.PAYOFF_CUTTER;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const local = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* This visit only. */ } },
  };
  const memory = {
    get: key => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } },
    set: (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* This page only. */ } },
  };
  const noTrack = (local.get('marketel.noTrack') === '1') || /HeadlessChrome|Playwright|bot\b/i.test(navigator.userAgent);
  const headers = { 'Content-Type': 'application/json', ...(noTrack ? { 'x-marketel-no-track': '1' } : {}) };
  let visitor = null;
  try { visitor = sessionStorage.getItem('payoff.visitor'); } catch { /* Untracked. */ }
  const post = async (route, body) => {
    const response = await fetch(route, { method: 'POST', headers, body: JSON.stringify(body) });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  };
  const event = (name, detail) => {
    if (!noTrack) fetch('/api/payoff/event', { method: 'POST', headers, keepalive: true, body: JSON.stringify({ name, detail, visitorId: visitor }) }).catch(() => {});
  };
  // Meta's pixel hears the upgrade as its own event, with the id the server uses.
  const PIXEL_ID = '1545780930244672';
  const pixelOn = !noTrack && location.protocol === 'https:' && !navigator.webdriver;
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
  }

  const CLOCK_MS = 2 * 60 * 1000;
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const regular = params.get('offer') === 'regular';
  const order = params.get('cutter') ? {} : { paymentIntent: params.get('payment_intent'), sessionId: params.get('session_id') };
  const STAGE_KEY = 'payoff.upgrade.' + (order.paymentIntent || order.sessionId || 'regular');
  const PRICES = C.prices;
  let config = null, stripe = null, stage = null, timer = null, busy = false, sheetOpen = false, oneClick = false;

  function show(name) {
    for (const id of ['stage-wait', 'stage-offer', 'stage-discount', 'stage-done']) $(id).hidden = id !== 'stage-' + name;
    window.scrollTo(0, 0);
  }
  const wait = text => { $('wait-status').textContent = text || ''; show('wait'); };
  // Their plan, which they already own, whatever happens here.
  function openPlan(bought = false) {
    clearInterval(timer);
    if (!regular) memory.set(STAGE_KEY, { stage: 'done' });
    if (bought) local.set('payoff.tab', 'cutter');
    location.assign('/payoff/app');
  }

  function fillCopy() {
    const offer = C.offer;
    $('offer-headline').textContent = regular ? 'Add the Interest Cutter to your plan' : offer.headline;
    $('offer-ready').textContent = offer.ready;
    $('offer-gap').textContent = offer.gap;
    $('offer-question').textContent = offer.question;
    $('offer-built').textContent = regular ? C.name : offer.built;
    $('offer-benefits').replaceChildren(...offer.benefits.map(text => Object.assign(document.createElement('li'), { textContent: text })));
    for (const [id, text] of [['example-label', offer.example.label], ['example-current-title', offer.example.current.title],
      ['example-current-interest', offer.example.current.interest], ['example-current-date', offer.example.current.date],
      ['example-option-title', offer.example.option.title], ['example-option-interest', offer.example.option.interest],
      ['example-option-date', offer.example.option.date], ['example-saving', offer.example.saving], ['example-note', offer.example.note],
      ['offer-yes-label', offer.yes], ['offer-one-click', offer.oneClick], ['offer-guarantee', '✓ ' + offer.guarantee],
      ['discount-headline', C.discount.headline], ['discount-lead', C.discount.lead], ['discount-yes-label', C.discount.yes],
      ['discount-one-click', offer.oneClick], ['discount-guarantee', '✓ ' + offer.guarantee], ['discount-no', C.discount.no]]) $(id).textContent = text;
    $('offer-no').textContent = regular ? 'Not now, back to my plan' : offer.no;
    const dollars = cents => String(cents / 100);
    $('offer-price').textContent = dollars(regular ? PRICES.regular : PRICES.offer);
    $('discount-price').textContent = dollars(PRICES.discount);
    const price = document.querySelector('#stage-offer .up-price s');
    price.hidden = regular;
    $('offer-save').textContent = regular ? '' : `Save ${dollars(PRICES.regular - PRICES.offer)}`;
    $('offer-clock-row').hidden = regular;
  }

  // Each one-time price gets two minutes from when it first showed, kept
  // across a reload; at 00:00 the page moves on and the server refuses it.
  function startStage(name) {
    stage = name;
    clearInterval(timer);
    show(name === 'discount' ? 'discount' : 'offer');
    event('PayoffUpgradeViewed', name);
    if (name === 'regular') return;
    let saved = memory.get(STAGE_KEY);
    if (!saved || saved.stage !== name || !saved.startedAt) { saved = { stage: name, startedAt: Date.now() }; memory.set(STAGE_KEY, saved); }
    const tick = () => {
      const left = saved.startedAt + CLOCK_MS - Date.now();
      $(name + '-clock').textContent = clock(left);
      if (left <= 0 && !busy && !sheetOpen) { clearInterval(timer); event('PayoffUpgradeExpired', name); moveOn(name); }
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  const moveOn = from => (from === 'offer' ? startStage('discount') : openPlan());

  function setBusy(name, on) {
    busy = on;
    const button = $(name === 'discount' ? 'discount-yes' : 'offer-yes');
    button.disabled = on;
    const label = $(name === 'discount' ? 'discount-yes-label' : 'offer-yes-label');
    label.textContent = on ? 'Adding it…' : (name === 'discount' ? C.discount.yes : C.offer.yes);
  }
  const statusFor = name => $(name === 'discount' ? 'discount-status' : 'offer-status');
  const orderRef = () => (regular ? { access: local.get('payoff.access') } : order.paymentIntent ? { paymentIntent: order.paymentIntent } : { sessionId: order.sessionId });

  async function yes(name) {
    if (busy) return;
    setBusy(name, true);
    statusFor(name).textContent = '';
    event('PayoffUpgradeAccepted', name);
    try {
      const reply = await post('/api/payoff/upgrade', { offer: name, ...orderRef() });
      if (reply.status === 409) return openPlan(true);
      if (reply.status === 410) { statusFor(name).textContent = reply.body.message || 'This offer has ended.'; setBusy(name, false); return moveOn(name); }
      if (!reply.ok) throw new Error(reply.body.message || 'That didn’t go through, and you weren’t charged. Please try again.');
      if (reply.body.paid) return bought(reply.body);
      await loadStripe();
      if (reply.body.next === 'action') {
        const { error } = await stripe.handleNextAction({ clientSecret: reply.body.clientSecret });
        if (error) throw error;
        return confirmCutter(reply.body.id, name);
      }
      if (reply.body.declined) statusFor(name).textContent = reply.body.declined + ' You can use another way to pay.';
      openSheet(name, reply.body);
    } catch (error) {
      statusFor(name).textContent = error.message || 'That didn’t go through, and you weren’t charged. Please try again.';
    }
    setBusy(name, false);
  }

  async function confirmCutter(id, name) {
    const reply = await post('/api/payoff/upgrade/confirm', { paymentIntent: id });
    if (reply.status === 202) { wait(reply.body.message); setTimeout(() => openPlan(), 4000); return; }
    if (!reply.ok) throw new Error(reply.body.message || 'That payment didn’t go through, and you weren’t charged.');
    bought(reply.body);
    if (name) setBusy(name, false);
  }

  function bought(result) {
    clearInterval(timer);
    if (result.access) local.set('payoff.access', result.access);
    if (Array.isArray(result.extras)) local.set('payoff.extras', JSON.stringify(result.extras));
    local.set('payoff.tab', 'cutter');
    if (!regular) memory.set(STAGE_KEY, { stage: 'done' });
    try {
      if (pixelOn && window.fbq && result.reference) window.fbq('trackCustom', 'InterestCutterPurchase',
        { value: result.value, currency: 'USD', content_name: C.name }, { eventID: `payoff-cutter.${result.reference}` });
    } catch { /* Never break the page. */ }
    closeSheet();
    show('done');
  }

  // Stripe.js, only when a payment form or a bank check is needed.
  const loadStripe = () => new Promise((resolve, reject) => {
    if (stripe) return resolve();
    if (!config?.stripeKey) return reject(new Error('Payments can’t open right now. Your plan is ready: tap “No thanks” to open it.'));
    const ready = () => { try { stripe = window.Stripe(config.stripeKey); resolve(); } catch (error) { reject(error); } };
    if (typeof window.Stripe === 'function') return ready();
    const script = Object.assign(document.createElement('script'), { src: 'https://js.stripe.com/v3/', async: true });
    script.addEventListener('load', ready);
    script.addEventListener('error', () => reject(new Error('Payments can’t open right now. Your plan is ready: tap “No thanks” to open it.')));
    document.head.append(script);
  });

  // Apple Pay, Google Pay, Klarna, bank, or another card: Stripe's form in a pop-up.
  let sheet = null;
  function openSheet(name, intent) {
    sheetOpen = true;
    $('pay-amount').textContent = `Today Only ${intent.amount / 100}`;
    $('pay-status').textContent = '';
    $('pay-button').disabled = true;
    $('pay-element').replaceChildren(); $('pay-express').replaceChildren(); $('pay-or').hidden = true;
    const elements = stripe.elements({ clientSecret: intent.clientSecret });
    const returnUrl = `${location.origin}/payoff/upgrade?cutter=1${regular ? '&offer=regular' : ''}`;
    const finish = async paymentIntent => confirmCutter(paymentIntent.id, name);
    const form = elements.create('payment', { layout: 'tabs', paymentMethodOrder: ['card', 'us_bank_account', 'klarna'] });
    form.on('ready', () => { $('pay-button').disabled = false; });
    form.mount('#pay-element');
    const express = elements.create('expressCheckout', { buttonHeight: 44, layout: { maxColumns: 1, overflow: 'never' },
      paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'never', paypal: 'never', amazonPay: 'never' } });
    express.on('ready', ({ availablePaymentMethods }) => { $('pay-or').hidden = !Object.values(availablePaymentMethods || {}).some(Boolean); });
    express.on('confirm', async wallet => {
      try {
        const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required', confirmParams: { return_url: returnUrl } });
        if (error) throw error;
        await finish(paymentIntent);
      } catch (error) {
        try { wallet.paymentFailed({ reason: 'fail' }); } catch { /* Already closed. */ }
        $('pay-status').textContent = error.message || 'That payment didn’t go through.';
      }
    });
    express.mount('#pay-express');
    sheet = { name, elements, returnUrl, finish };
    $('pay-sheet').hidden = false;
  }
  function closeSheet() {
    sheetOpen = false; sheet = null;
    $('pay-sheet').hidden = true;
  }
  $('pay-button').addEventListener('click', async () => {
    if (!sheet || $('pay-button').disabled) return;
    $('pay-button').disabled = true; $('pay-label').textContent = 'Processing…'; $('pay-status').textContent = '';
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements: sheet.elements, redirect: 'if_required', confirmParams: { return_url: sheet.returnUrl } });
      if (error) throw error;
      await sheet.finish(paymentIntent);
    } catch (error) {
      $('pay-status').textContent = error.message || 'That payment didn’t go through.';
      $('pay-button').disabled = false;
    }
    $('pay-label').textContent = 'Pay now';
  });
  $('pay-cancel').addEventListener('click', closeSheet);

  $('offer-yes').addEventListener('click', () => yes(regular ? 'regular' : 'offer'));
  $('discount-yes').addEventListener('click', () => yes('discount'));
  $('offer-no').addEventListener('click', () => { event('PayoffUpgradeDeclined', regular ? 'regular' : 'offer'); regular ? openPlan() : moveOn('offer'); });
  $('discount-no').addEventListener('click', () => { event('PayoffUpgradeDeclined', 'discount'); openPlan(); });

  async function start() {
    fillCopy();
    // Back from a payment method that left the page (Klarna, a bank).
    if (params.get('cutter')) {
      const id = params.get('payment_intent');
      if (!id) return openPlan();
      wait('Confirming your upgrade…');
      try { await confirmCutter(id); } catch (error) { wait(error.message); setTimeout(() => openPlan(), 4000); }
      return;
    }
    if (regular) {
      if (!local.get('payoff.access')) return openPlan();
    } else {
      if (!order.paymentIntent && !order.sessionId) return openPlan();
      if (memory.get(STAGE_KEY)?.stage === 'done') return openPlan();
      // Confirm the order first: it unlocks Payoff and sends its email.
      wait('');
      const reply = await post('/api/payoff/confirm', order.paymentIntent ? { paymentIntent: order.paymentIntent } : { sessionId: order.sessionId }).catch(() => null);
      if (!reply?.ok || reply.status === 202) return location.assign('/payoff/app' + location.search);
      local.set('payoff.access', reply.body.access);
      local.set('payoff.extras', JSON.stringify(reply.body.extras || []));
      if ((reply.body.extras || []).includes('cutter')) return openPlan(true);
      oneClick = reply.body.oneClick === true;
    }
    try {
      const response = await fetch('/api/payoff/config', { headers });
      config = response.ok ? await response.json() : null;
    } catch { config = null; }
    if (!config?.available) return openPlan();
    // "No card to re-enter" only where it's true: a card kept from this order.
    for (const id of ['offer-one-click', 'discount-one-click']) $(id).textContent = oneClick ? C.offer.oneClick : 'Pay with Apple Pay, Google Pay or a card.';
    if (regular) return startStage('regular');
    startStage(memory.get(STAGE_KEY)?.stage === 'discount' ? 'discount' : 'offer');
  }
  start().catch(() => openPlan());
})();
