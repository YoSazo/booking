'use strict';
// The Payoff Coach offer, right after paying: yearly or monthly. A card kept
// from the order starts it in one tap; anything else goes to Stripe's
// checkout, which returns to Payoff. No clock: the price doesn't change.
// Whatever the buyer picks, their plan opens: they already paid for it.
(() => {
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
  // Meta's pixel hears the Coach as its own event, with the id the server uses.
  const PIXEL_ID = '1545780930244672';
  const pixelOn = !noTrack && location.protocol === 'https:' && !navigator.webdriver;
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
  }

  const order = { paymentIntent: params.get('payment_intent'), sessionId: params.get('session_id') };
  const DONE_KEY = 'payoff.upgrade.' + (order.paymentIntent || order.sessionId);
  const TERMS = {
    year: '$67 today, then $67 every year until you cancel. Cancel any time in Payoff’s Coach tab. Your first payment is covered by the 30-day money-back guarantee.',
    month: '$9 today, then $9 every month until you cancel. Cancel any time in Payoff’s Coach tab. Your first payment is covered by the 30-day money-back guarantee.',
  };
  let plan = 'year', busy = false, attempt = null;
  try { attempt = crypto.randomUUID(); } catch { attempt = null; }

  function show(name) {
    for (const id of ['stage-wait', 'stage-offer', 'stage-done']) $(id).hidden = id !== 'stage-' + name;
    window.scrollTo(0, 0);
  }
  const wait = text => { $('wait-status').textContent = text || ''; show('wait'); };
  // Their plan, which they already own, whatever happens here.
  function openPlan(coach = false) {
    memory.set(DONE_KEY, true);
    if (coach) local.set('payoff.tab', 'cutter');
    location.assign('/payoff/app');
  }
  function pick(next) {
    plan = next;
    for (const button of document.querySelectorAll('.up-plans button')) button.setAttribute('aria-checked', String(button.dataset.plan === plan));
    $('offer-terms').textContent = TERMS[plan];
  }
  for (const button of document.querySelectorAll('.up-plans button')) button.addEventListener('click', () => pick(button.dataset.plan));

  function bought(result) {
    if (result.access) local.set('payoff.access', result.access);
    if (Array.isArray(result.extras)) local.set('payoff.extras', JSON.stringify(result.extras));
    local.set('payoff.tab', 'cutter');
    memory.set(DONE_KEY, true);
    try {
      if (pixelOn && window.fbq && result.reference) window.fbq('trackCustom', 'CoachSubscribe',
        { value: result.value, currency: 'USD', content_name: 'Payoff Coach' }, { eventID: `payoff-coach.${result.reference}` });
    } catch { /* Never break the page. */ }
    show('done');
  }

  async function yes() {
    if (busy) return;
    busy = true; $('offer-yes').disabled = true; $('offer-yes-label').textContent = 'Adding it…'; $('offer-status').textContent = '';
    event('PayoffUpgradeAccepted', plan);
    try {
      const reply = await post('/api/payoff/coach/subscribe', { plan, attempt, ...(order.paymentIntent ? { paymentIntent: order.paymentIntent } : { sessionId: order.sessionId }) });
      if (reply.status === 409) return openPlan(true);
      if (!reply.ok) throw new Error(reply.body.message || 'That didn’t go through, and you weren’t charged. Please try again.');
      if (reply.body.paid) return bought(reply.body);
      if (reply.body.next === 'checkout' && reply.body.url) {
        if (reply.body.declined) $('offer-status').textContent = reply.body.declined;
        memory.set(DONE_KEY, true);
        return location.assign(reply.body.url);
      }
      throw new Error('That didn’t go through, and you weren’t charged. Please try again.');
    } catch (error) {
      $('offer-status').textContent = error.message || 'That didn’t go through, and you weren’t charged. Please try again.';
    }
    busy = false; $('offer-yes').disabled = false; $('offer-yes-label').textContent = 'Yes! Add the Coach';
  }
  $('offer-yes').addEventListener('click', yes);
  $('offer-no').addEventListener('click', () => { event('PayoffUpgradeDeclined', 'coach'); openPlan(); });

  async function start() {
    if (!order.paymentIntent && !order.sessionId) return openPlan();
    if (memory.get(DONE_KEY)) return openPlan();
    // Confirm the order first: it unlocks Payoff and sends its email.
    wait('');
    const reply = await post('/api/payoff/confirm', order.paymentIntent ? { paymentIntent: order.paymentIntent } : { sessionId: order.sessionId }).catch(() => null);
    if (!reply?.ok || reply.status === 202) return location.assign('/payoff/app' + location.search);
    local.set('payoff.access', reply.body.access);
    local.set('payoff.extras', JSON.stringify(reply.body.extras || []));
    if ((reply.body.extras || []).includes('coach')) return openPlan(true);
    // Bought at checkout already, so not a reason to start the Coach.
    const missing = [['cashflow', 'the cash-flow calendar'], ['reset', 'the spending reset']].filter(([id]) => !(reply.body.extras || []).includes(id)).map(([, name]) => name);
    $('up-included').hidden = !missing.length;
    $('up-included').querySelector('span').textContent = missing.join(' and ');
    let config = null;
    try {
      const response = await fetch('/api/payoff/config', { headers });
      config = response.ok ? await response.json() : null;
    } catch { config = null; }
    if (!config?.available) return openPlan();
    // "No card to re-enter" only where it's true: a card kept from this order.
    $('offer-one-click').textContent = reply.body.oneClick === true ? 'One tap. No card to re-enter.' : 'Pay with Apple Pay, Google Pay or a card.';
    pick('year');
    show('offer');
    event('PayoffUpgradeViewed', 'coach');
  }
  start().catch(() => openPlan());
})();
