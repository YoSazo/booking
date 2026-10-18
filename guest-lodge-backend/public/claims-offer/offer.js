'use strict';
// The long-form Claims offer. Everything it records uses the Claims landing's
// existing events, so /funnel and Meta read it the same way: arriving, where
// from, how far down, the recording, the first deliberate act (ViewContent),
// the button, and a ready checkout (InitiateCheckout). It sells the $49
// one-time plan through the existing Claims checkout.
(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  // Someone already signed in to Claims came here for the app, not the pitch.
  try { if (localStorage.getItem('inspect.session')) { location.replace('/claims?app=1'); return; } } catch { /* private mode */ }
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
    del: key => { try { localStorage.removeItem(key); } catch { /* private mode */ } },
  };
  // The owner's own visits stay out of the numbers (same switch as /claims).
  const owner = (() => {
    if (params.get('notrack') === '1') store.set('marketel.noTrack', '1');
    if (params.get('notrack') === '0') store.del('marketel.noTrack');
    return store.get('marketel.noTrack') === '1';
  })();
  // The same visitor id as /claims, so the purchase ties back to this visit.
  const visitorId = (() => {
    let value = store.get('inspect.visitor') || '';
    if (!/^v_[A-Za-z0-9]{8,40}$/.test(value)) {
      const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
      value = 'v_' + Array.from(bytes, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
      store.set('inspect.visitor', value);
    }
    return value;
  })();

  // Meta's click ids. fbclid values are often far longer than 180 characters;
  // dropping them left Meta unable to tie a visit to the ad.
  const cookie = name => { try { const m = String(document.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)); return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; } };
  const validMetaId = v => (/^fb\.1\.[A-Za-z0-9._-]+$/.test(String(v || '')) && String(v).length <= 500 ? String(v) : '');
  const validClickId = v => (/^[A-Za-z0-9._-]{1,470}$/.test(String(v || '')) ? String(v) : '');
  const writeCookie = (name, value) => { if (value) document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=7776000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; };
  const attribution = (() => {
    const key = 'inspect.metaAttribution.v1';
    const fbclid = validClickId(params.get('fbclid'));
    let fbp = validMetaId(cookie('_fbp'));
    if (!fbp) { const w = new Uint32Array(2); crypto.getRandomValues(w); fbp = `fb.1.${Date.now()}.${w[0]}${w[1]}`; writeCookie('_fbp', fbp); }
    const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : validMetaId(cookie('_fbc'));
    if (fbclid) writeCookie('_fbc', fbc);
    const source = new URL(location.origin + location.pathname);
    const current = { fbp, ...(fbc ? { fbc } : {}) };
    for (const [param, field] of [['utm_source', 'utmSource'], ['utm_medium', 'utmMedium'], ['utm_campaign', 'utmCampaign'], ['utm_content', 'utmContent'], ['utm_term', 'utmTerm']]) {
      const value = String(params.get(param) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180);
      if (value) { current[field] = value; source.searchParams.set(param, value); }
    }
    if (fbclid) source.searchParams.set('fbclid', fbclid);
    current.sourceUrl = source.toString();
    let stored = {};
    try { stored = JSON.parse(store.get(key) || '{}') || {}; } catch { stored = {}; }
    const result = !Object.keys(stored).length || fbclid ? current : { ...stored, fbp };
    store.set(key, JSON.stringify(result));
    return result;
  })();

  const headers = { 'Content-Type': 'application/json', ...(owner ? { 'x-marketel-no-track': '1' } : {}) };
  // Meta hears these two (with the click ids); the rest stay on /funnel.
  const SIGNALS = new Set(['OfferEngaged', 'SimCheckoutRendered']);
  const sent = new Set();
  function track(name, detail = '', { once = true, keepalive = false } = {}) {
    const key = `${name}:${detail}`;
    if (once && sent.has(key)) return;
    sent.add(key);
    fetch('/api/inspect/events/anon', { method: 'POST', keepalive, headers,
      body: JSON.stringify({ name, tool: 'claims', visitorId, ...(detail ? { detail } : {}), ...(SIGNALS.has(name) ? { attribution } : {}) }) }).catch(() => {});
  }

  // ----- The offer, repeated -----
  const template = $('offer');
  for (const slot of document.querySelectorAll('.offer-slot')) slot.append(template.content.cloneNode(true));
  const IDLE = 'Get My Damage Report';
  const buttons = () => [...document.querySelectorAll('.cta')];
  const reset = () => { for (const b of buttons()) { b.disabled = false; b.textContent = IDLE; } $('busy').hidden = true; };
  let generation = 0;
  async function checkout(button) {
    const mine = ++generation;
    const block = button.closest('.offer');
    const error = block.querySelector('.error');
    error.hidden = true;
    track('OfferEngaged');
    track('SimCheckoutTapped', 'lifetime', { once: false });
    for (const b of buttons()) b.disabled = true;
    button.textContent = 'Opening secure checkout…';
    $('busy').hidden = false;
    try {
      const response = await fetch('/api/inspect/checkout/sim', { method: 'POST', headers,
        body: JSON.stringify({ tool: 'claims', plan: 'lifetime', visitorId, attribution, embedded: false }) });
      const data = await response.json().catch(() => ({}));
      if (mine !== generation) return;
      if (!response.ok || !/^https:\/\/checkout\.stripe\.com\//.test(String(data.url || ''))) throw new Error(data.error || data.message || 'Checkout could not be opened. Please try again.');
      track('SimCheckoutRendered', 'lifetime', { keepalive: true });
      location.href = data.url;
    } catch (failure) {
      if (mine !== generation) return;
      reset();
      error.textContent = failure.message; error.hidden = false;
    }
  }
  for (const b of buttons()) b.addEventListener('click', () => checkout(b));
  // Back from Stripe restores this page from memory with the buttons still busy.
  window.addEventListener('pageshow', event => { if (event.persisted) { generation++; reset(); } });

  // ----- Reviews and the rating, from the Claims manifest -----
  const landing = (((window.MARKETEL_WEDGES || {}).claims || {}).landing) || {};
  const reviews = Array.isArray(landing.reviews) ? landing.reviews : [];
  const starsOf = n => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
  if (landing.reviewsRating && landing.reviewsRating.label) {
    const rating = $('rating');
    const stars = Object.assign(document.createElement('span'), { className: 'stars', textContent: starsOf(Number(landing.reviewsRating.stars) || 5) });
    rating.replaceChildren(stars, document.createTextNode(landing.reviewsRating.label));
    rating.hidden = false;
  }
  if (reviews.length) {
    const box = $('reviews');
    const card = r => {
      const el = document.createElement('figure'); el.className = 'review';
      const stars = Object.assign(document.createElement('div'), { className: 'stars', textContent: starsOf(Number(r.stars) || 5) });
      const quote = Object.assign(document.createElement('p'), { textContent: `“${r.quote}”` });
      const who = Object.assign(document.createElement('div'), { className: 'who', textContent: r.name || '' });
      if (r.role) who.append(Object.assign(document.createElement('span'), { className: 'role', textContent: ` · ${r.role}` }));
      el.append(stars, quote, who);
      return el;
    };
    const SHOWN = 6;
    reviews.slice(0, SHOWN).forEach(r => box.append(card(r)));
    if (reviews.length > SHOWN) {
      const more = $('more');
      more.textContent = `Show all ${reviews.length} reviews`;
      more.hidden = false;
      more.addEventListener('click', () => { reviews.slice(SHOWN).forEach(r => box.append(card(r))); more.hidden = true; });
    }
    $('proof-title').textContent = landing.reviewsTitle || 'What hosts say';
    $('proof').hidden = false;
  }

  // ----- Where they came from, how far they read, the recording -----
  const ua = navigator.userAgent;
  track('OfferLanded', matchMedia('(pointer: coarse)').matches || innerWidth < 760 ? 'phone' : 'desktop');
  track('OfferFrom', params.get('fbclid') ? 'ad' : /(^|\.)(facebook|instagram|fb|messenger)\.com/i.test(document.referrer) ? 'social' : !document.referrer ? 'direct' : 'other');
  track('OfferBrowser', /FBAN|FBAV|FB_IAB/.test(ua) ? 'facebook' : /Instagram/.test(ua) ? 'instagram' : /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other');
  setTimeout(() => { if (document.visibilityState === 'visible') track('OfferStayed20'); }, 20000);
  // Reading half the page is the first deliberate act (Meta: ViewContent).
  const onScroll = () => {
    const depth = (scrollY + innerHeight) / Math.max(1, document.documentElement.scrollHeight);
    for (const [mark, name] of [[0.25, 'OfferScroll25'], [0.5, 'OfferScroll50'], [0.75, 'OfferScroll75'], [0.97, 'OfferScroll100']]) if (depth >= mark) track(name);
    if (depth >= 0.5) track('OfferEngaged');
  };
  addEventListener('scroll', onScroll, { passive: true });
  const video = $('demo');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries, observer) => {
      if (entries.some(e => e.isIntersecting)) { track('OfferSawVideo'); observer.disconnect(); }
    }, { threshold: 0.4 }).observe(video);
  }
  video.addEventListener('play', () => track('OfferEngaged'));
  video.addEventListener('timeupdate', () => {
    const p = video.duration ? video.currentTime / video.duration : 0;
    if (p >= 0.25) track('OfferVideoQuarter');
    if (p >= 0.5) track('OfferVideoHalf');
  });
  video.addEventListener('ended', () => track('OfferVideoEnded'));
})();
