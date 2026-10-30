'use strict';
// The booking engine pages' tracking, as on Payoff: one visitor id per tab,
// Meta's pixel (never for the owner, a test browser or plain http), and each
// pixel event's id sent to the server too, so Meta counts it once.
(() => {
  let visitor = null, excluded = /HeadlessChrome|Playwright|bot\b/i.test(navigator.userAgent);
  try {
    const tracking = new URLSearchParams(location.search).get('notrack');
    if (tracking === '1') localStorage.setItem('marketel.noTrack', '1');
    if (tracking === '0') localStorage.removeItem('marketel.noTrack');
    excluded = excluded || localStorage.getItem('marketel.noTrack') === '1';
    visitor = sessionStorage.getItem('engine.visitor');
    if (!visitor) { visitor = 'v_' + crypto.randomUUID().replaceAll('-', ''); sessionStorage.setItem('engine.visitor', visitor); }
  } catch { /* The page still works when storage is unavailable. */ }
  const headers = { 'Content-Type': 'application/json', ...(excluded ? { 'x-marketel-no-track': '1' } : {}) };
  const query = new URLSearchParams(location.search);
  let pageView = null;
  try { if (visitor) pageView = `engine-pv.${visitor}.` + [...crypto.getRandomValues(new Uint8Array(10))].map(b => (b % 36).toString(36)).join(''); } catch { /* No copy then. */ }

  const PIXEL_ID = '1545780930244672';
  const pixelOn = !excluded && location.protocol === 'https:' && !navigator.webdriver;
  const pixel = (name, data = {}, eventID, custom = false) => {
    try { if (pixelOn && window.fbq) window.fbq(custom ? 'trackCustom' : 'track', name, { content_name: 'Marketel booking engine', currency: 'USD', ...data }, eventID ? { eventID } : undefined); } catch { /* never break the page */ }
  };
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    // People type their details on this page: no automatic form collection.
    window.fbq('set', 'autoConfig', false, PIXEL_ID);
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView', {}, pageView ? { eventID: pageView } : undefined);
  }

  // Meta's browser ids and the ad's utm tags, kept from the first page so the
  // server's copies of the events match the same person.
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
      try { stored = JSON.parse(localStorage.getItem('engine.metaAttribution.v1') || '{}') || {}; } catch { stored = {}; }
      const result = !Object.keys(stored).length || fbclid ? current : { ...stored, fbp };
      try { localStorage.setItem('engine.metaAttribution.v1', JSON.stringify(result)); } catch { /* Optional. */ }
      return result;
    } catch { return {}; }
  })();

  // A step on the page, once per page load.
  const sent = new Set();
  const step = (detail, extra = {}) => {
    if (excluded || sent.has(detail)) return;
    sent.add(detail);
    fetch('/api/engine/event', { method: 'POST', headers, keepalive: true,
      body: JSON.stringify({ name: 'EngineStep', detail, visitorId: visitor, ...extra }) }).catch(() => {});
  };
  window.EngineTrack = { visitor, excluded, headers, pixel, attribution, step, pageView: pixelOn ? pageView : null };
})();
