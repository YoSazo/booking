'use strict';
// Price lines as in the reference letter, worded three ways down the page.
// With the extra $5, the sale price is crossed out too and the $5 is named.
window.PAYOFF_PRICE_LINES = (cents, base = 3311, regular = 37500) => {
  const dollars = value => '$' + (value / 100).toFixed(2).replace('.00', '');
  const extra = base - cents, extraOff = Math.round(extra / base * 100), off = Math.floor((1 - cents / regular) * 100);
  if (extra > 0) return {
    today: { was: `Today: ${dollars(base)}`, line: `Today: ${dollars(cents)} (${dollars(extra)} off · ${extraOff}% off)`, note: '' },
    sale: { was: `Sale Price: ${dollars(base)}`, line: `Sale Price: ${dollars(cents)}`, note: `(${dollars(extra)} off · ${extraOff}% off)` },
    caps: { was: `SALE PRICE: ${dollars(base)}`, line: `SALE PRICE: ${dollars(cents)}`, note: `That's an extra ${dollars(extra)} (${extraOff}%) off.` },
  };
  return {
    today: { was: '', line: `Today: ${dollars(cents)} (${off}% off)`, note: '' },
    sale: { was: '', line: `Sale Price: ${dollars(cents)}`, note: `(${off}% off)` },
    caps: { was: '', line: `SALE PRICE: ${dollars(cents)}`, note: `That's ${off}% off.` },
  };
};
window.PAYOFF_PAINT_PRICE = (box, cents) => {
  const lines = window.PAYOFF_PRICE_LINES(cents)[box.dataset.wording || 'today'];
  const amount = box.querySelector('[data-price-amount]');
  const was = box.querySelector('[data-was]');
  if (was) { was.textContent = amount ? lines.was.replace(/^[^:]+: /, '') : lines.was; was.parentElement.hidden = !lines.was; }
  if (amount) amount.textContent = (cents / 100).toFixed(2).replace('.00', '');
  else box.querySelector('[data-price]').textContent = lines.line;
  const note = box.querySelector('[data-off]');
  if (note) {
    note.textContent = amount ? '' : lines.note;
    note.hidden = !!amount;
  }
};
(() => {
  const form = document.getElementById('order-form');
  let visitor = null, excluded = /HeadlessChrome|Playwright|bot\b/i.test(navigator.userAgent);
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
  const pixel = (name, data = {}, eventID, custom = false) => {
    try { if (pixelOn && window.fbq) window.fbq(custom ? 'trackCustom' : 'track', name, { content_name: 'Marketel Payoff', currency: 'USD', ...data }, eventID ? { eventID } : undefined); } catch { /* never break the page */ }
  };
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    // People type balances on the quiz: no automatic collection there.
    if (document.body.dataset.variant === 'quiz') window.fbq('set', 'autoConfig', false, PIXEL_ID);
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
      body: JSON.stringify({ name, detail, visitorId: visitor, ...(name === 'PayoffOrderViewed' || (name === 'PayoffOrder' && detail === 'email') ? { attribution } : {}) }) }).catch(() => {});
  };
  event(form ? 'PayoffOrderViewed' : 'PayoffLanded');
  if (form) {
    // Once per visitor, however many times they come back to this page.
    let first = true;
    try { first = sessionStorage.getItem('payoff.cartSent') !== visitor; sessionStorage.setItem('payoff.cartSent', visitor || ''); } catch { /* Send it. */ }
    if (first) pixel('AddToCart', { value: 33.11 }, visitor ? `payoff-cart.${visitor}` : undefined);
    // The order page's own form (order.js) reports through the same helpers.
    window.PayoffTrack = { event, pixel, attribution, visitor, headers };
    return;
  }
  // A visitor sent on by the story page was counted there, with the ad click.
  if (query.get('from') !== 'story') event('PayoffFrom', query.has('fbclid') ? 'ad'
    : /facebook\.com|instagram\.com/i.test(document.referrer) ? 'social' : !document.referrer ? 'direct' : 'other');
  // Which landing this visitor saw (the A/B test), once per visitor.
  const variant = document.body.dataset.variant;
  if (['letter', 'quiz'].includes(variant)) {
    let first = true;
    try { first = sessionStorage.getItem('payoff.variantSent') !== visitor; sessionStorage.setItem('payoff.variantSent', visitor || ''); } catch { /* Send it. */ }
    if (first) event('PayoffVariant', variant);
  }
  // Show the same discounted price here and at checkout. Viewing the sales
  // page does not issue or restart the checkout reservation.
  let salesActive = false;
  const paintSalesOffer = active => (salesActive = active, document.querySelectorAll('.sales-offer').forEach(box => window.PAYOFF_PAINT_PRICE(box, active ? 2811 : 3311)));
  window.PayoffTrack = { event, pixel, attribution, visitor, headers, paintOffers: () => paintSalesOffer(salesActive) };
  const refreshSalesOffer = () => fetch('/api/payoff/config?offer=preview', { headers }).then(response => {
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }).then(config => {
    if (config.checkoutOffer) paintSalesOffer(config.checkoutOffer.discountCents === 500);
  }).catch(() => { /* The sale price and checkout link remain usable. */ });
  refreshSalesOffer();
  window.addEventListener('pageshow', event => { if (event.persisted) refreshSalesOffer(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSalesOffer(); });
})();
