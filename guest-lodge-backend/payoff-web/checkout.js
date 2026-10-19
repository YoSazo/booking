'use strict';
(() => {
  const form = document.getElementById('order-form');
  const button = document.getElementById('buy-button');
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
  const query = new URLSearchParams(location.search);

  // Meta's pixel, on the sales and order pages only (never the tool, never the
  // owner, never a test browser or plain http). Each signal carries the event
  // id the server sends too, so Meta counts it once. Reaching the order page is
  // AddToCart: every "Get My Debt-Free Date" button leads there.
  const PIXEL_ID = '1545780930244672';
  const pixelOn = !excluded && location.protocol === 'https:' && !navigator.webdriver;
  const pixel = (name, data = {}, eventID) => {
    try { if (pixelOn && window.fbq) window.fbq('track', name, { content_name: 'Marketel Payoff', currency: 'USD', ...data }, eventID ? { eventID } : undefined); } catch { /* never break the page */ }
  };
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  // Meta's browser ids and the ad's utm tags, kept from the landing page so
  // the server's copies of the events match the same person (as on /trace).
  const cookieValue = name => { try { const m = String(document.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)); return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; } };
  const validMetaId = value => (/^fb\.1\.[A-Za-z0-9._-]+$/.test(String(value || '')) && String(value).length <= 500 ? String(value) : '');
  const validClickId = value => (/^[A-Za-z0-9._-]{1,470}$/.test(String(value || '')) ? String(value) : '');
  const writeCookie = (name, value) => { if (value) document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=7776000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; };
  const attribution = (() => {
    if (excluded) return {};
    try {
      const fbclid = validClickId(query.get('fbclid'));
      let fbp = validMetaId(cookieValue('_fbp'));
      if (!fbp) { const w = new Uint32Array(2); crypto.getRandomValues(w); fbp = `fb.1.${Date.now()}.${w[0]}${w[1]}`; writeCookie('_fbp', fbp); }
      const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : validMetaId(cookieValue('_fbc'));
      if (fbclid) writeCookie('_fbc', fbc);
      const source = new URL(location.origin + location.pathname);
      const current = { fbp, ...(fbc ? { fbc } : {}) };
      for (const [param, key] of [['utm_source', 'utmSource'], ['utm_medium', 'utmMedium'], ['utm_campaign', 'utmCampaign'], ['utm_content', 'utmContent'], ['utm_term', 'utmTerm']]) {
        const value = String(query.get(param) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180);
        if (value) { current[key] = value; source.searchParams.set(param, value); }
      }
      if (fbclid) source.searchParams.set('fbclid', fbclid);
      current.sourceUrl = source.toString();
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('payoff.metaAttribution.v1') || '{}') || {}; } catch { stored = {}; }
      const result = !Object.keys(stored).length || fbclid ? current : { ...stored, fbp };
      try { localStorage.setItem('payoff.metaAttribution.v1', JSON.stringify(result)); } catch { /* Optional. */ }
      return result;
    } catch { return {}; }
  })();

  const event = (name, detail = null) => {
    if (!excluded) fetch('/api/payoff/event', { method: 'POST', headers, keepalive: true,
      body: JSON.stringify({ name, detail, visitorId: visitor, ...(name === 'PayoffOrderViewed' ? { attribution } : {}) }) }).catch(() => {});
  };
  event(form ? 'PayoffOrderViewed' : 'PayoffLanded');
  if (form) {
    // Once per visitor, however many times they come back to this page.
    let first = true;
    try { first = sessionStorage.getItem('payoff.cartSent') !== visitor; sessionStorage.setItem('payoff.cartSent', visitor || ''); } catch { /* Send it. */ }
    if (first) pixel('AddToCart', { value: 33 }, visitor ? `payoff-cart.${visitor}` : undefined);
  }
  if (!form) event('PayoffFrom', query.has('fbclid') ? 'ad'
    : /facebook\.com|instagram\.com/i.test(document.referrer) ? 'social' : !document.referrer ? 'direct' : 'other');
  if (!form || !button) return;
  let ready = false, busy = false, currentOffer = null, basePriceCents = 3300, quotedBaseCents = null, serverOffset = 0;
  const offerBox = document.getElementById('checkout-offer');
  const stickyOffer = document.getElementById('offer-sticky');
  let stickyFrame = null;
  const updateSticky = () => {
    if (!stickyOffer || !offerBox) return;
    const active = currentOffer && currentOffer.discountCents > 0 && Date.now() + serverOffset < currentOffer.expiresAt;
    document.body.classList.toggle('has-checkout-offer', !!active);
    const height = window.visualViewport?.height || innerHeight;
    const payment = button.getBoundingClientRect();
    const paymentVisible = payment.top < height && payment.bottom > 0;
    const typing = document.activeElement?.matches('input:not([type="checkbox"]), textarea, select');
    stickyOffer.hidden = !active || offerBox.getBoundingClientRect().bottom > 0 || paymentVisible || typing;
  };
  const scheduleSticky = () => {
    if (stickyFrame !== null) return;
    stickyFrame = requestAnimationFrame(() => { stickyFrame = null; updateSticky(); });
  };
  window.addEventListener('scroll', scheduleSticky, { passive: true });
  window.addEventListener('resize', scheduleSticky, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleSticky);
  document.addEventListener('focusin', scheduleSticky);
  document.addEventListener('focusout', scheduleSticky);
  document.getElementById('offer-sticky-review')?.addEventListener('click', () => {
    const summary = document.getElementById('order-summary');
    summary?.scrollIntoView({ block: 'start', behavior: 'instant' });
    summary?.focus({ preventScroll: true });
    scheduleSticky();
  });
  const paintOffer = () => {
    const active = currentOffer && currentOffer.discountCents > 0 && Date.now() + serverOffset < currentOffer.expiresAt;
    basePriceCents = active ? currentOffer.basePriceCents : 3300;
    if (quotedBaseCents !== basePriceCents) {
      quotedBaseCents = basePriceCents;
      window.dispatchEvent(new CustomEvent('payoff:quote', { detail: { basePriceCents } }));
    }
    if (!offerBox) return;
    offerBox.hidden = !currentOffer;
    if (!currentOffer) { updateSticky(); return; }
    offerBox.classList.toggle('is-expired', !active);
    document.getElementById('checkout-offer-heading').textContent = active ? 'Save 15% — $5 off' : 'Your checkout offer has ended';
    document.getElementById('offer-original').hidden = !active;
    document.getElementById('offer-price').textContent = active ? '$28' : '$33';
    document.getElementById('offer-clock-row').hidden = !active;
    const reminder = document.getElementById('summary-offer-reminder');
    if (reminder) reminder.hidden = !active;
    document.getElementById('offer-note').textContent = active ? '$5 off your Payoff plan. Optional extras are priced separately.' : 'Payoff is still available for $33 once. Optional extras are priced separately.';
    if (active) {
      const left = Math.max(0, Math.ceil((currentOffer.expiresAt - Date.now() - serverOffset) / 1000));
      const clock = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      document.querySelectorAll('#offer-clock, [data-offer-clock]').forEach(timer => { if (timer.textContent !== clock) timer.textContent = clock; });
    }
    updateSticky();
  };
  setInterval(() => {
    if (currentOffer && currentOffer.discountCents > 0) {
      if (Date.now() + serverOffset >= currentOffer.expiresAt) {
        currentOffer.discountCents = 0; paintOffer(); refresh();
      } else paintOffer();
    }
  }, 1000);
  const randomAttempt = () => crypto.randomUUID();
  try {
    attempt = sessionStorage.getItem('payoff.attempt') || randomAttempt();
    sessionStorage.setItem('payoff.attempt', attempt);
    const selected = JSON.parse(sessionStorage.getItem('payoff.addons') || '[]');
    for (const id of ['cashflow', 'reset']) document.getElementById(id).checked = selected.includes(id);
    form.dispatchEvent(new Event('change'));
  } catch { attempt = randomAttempt(); }
  if (new URLSearchParams(location.search).has('cancelled')) {
    status.textContent = 'Checkout was canceled and you were not charged. You can try again any time.';
    event('PayoffCheckoutCancelled');
  }
  const saveExtras = () => {
    const addons = ['cashflow', 'reset'].filter(id => document.getElementById(id).checked);
    try { sessionStorage.setItem('payoff.addons', JSON.stringify(addons)); } catch { /* Optional. */ }
    return addons;
  };
  form.addEventListener('change', saveExtras);
  const refresh = () => fetch('/api/payoff/config?offer=1', { headers }).then(response => {
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }).then(config => {
    ready = config.available === true;
    currentOffer = config.offer || null;
    serverOffset = Number.isFinite(config.serverNow) ? config.serverNow - Date.now() : 0;
    paintOffer();
    button.disabled = !ready || busy;
    button.textContent = busy ? 'Opening secure checkout…' : ready ? 'Continue to secure payment' : 'Purchases are temporarily unavailable';
    button.classList.toggle('disabled-payment', !ready);
    if (!ready) status.textContent = config.preview ? 'Payments are disabled in the local preview.' : 'Please try again later or contact support@bookmarketel.com.';
  }).catch(() => {
    ready = false; button.disabled = true;
    button.textContent = 'Purchases are temporarily unavailable';
    status.textContent = 'Please reload to try again or contact support@bookmarketel.com.';
  });
  form.addEventListener('submit', async submit => {
    submit.preventDefault();
    if (!ready || busy || !form.reportValidity()) return;
    busy = true; button.disabled = true; button.textContent = 'Opening secure checkout…';
    status.textContent = ''; event('PayoffCheckoutTapped');
    const displayedBasePrice = basePriceCents;
    paintOffer();
    if (basePriceCents !== displayedBasePrice) {
      status.textContent = 'The checkout offer has ended. Review the updated total and continue when you’re ready.';
      busy = false; button.disabled = !ready; button.textContent = 'Continue to secure payment';
      return;
    }
    const addons = saveExtras();
    const expectedTotalCents = basePriceCents + window.PAYOFF_CONTENT.addOns.filter(addon => addons.includes(addon.id)).reduce((sum, addon) => sum + addon.priceCents, 0);
    try {
      const response = await fetch('/api/payoff/checkout', { method: 'POST', headers,
        body: JSON.stringify({ email: document.getElementById('email').value.trim(), addons, attempt, visitorId: visitor, attribution,
          useCheckoutOffer: basePriceCents === 2800, expectedTotalCents }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) await refresh();
        throw new Error(result.message || 'Checkout could not open. Please try again.');
      }
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Checkout could not open. Please try again.');
      event('PayoffCheckoutOpened');
      pixel('InitiateCheckout', { value: result.value }, visitor ? `payoff-checkout.${visitor}` : undefined);
      location.assign(url.href);
    } catch (error) {
      event('PayoffCheckoutFailed');
      status.textContent = error.message || 'Checkout could not open. Please try again.';
      busy = false; button.disabled = !ready; button.textContent = ready ? 'Continue to secure payment' : 'Purchases are temporarily unavailable';
    }
  });
  window.addEventListener('pageshow', () => {
    busy = false;
    if (ready) refresh();
  });
  refresh();
})();
