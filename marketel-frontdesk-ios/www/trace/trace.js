'use strict';
// Marketel Trace. The picture floats over the live camera; the phone rests
// above the paper and the person draws along the lines they see. Pictures and
// photos stay on the phone: only anonymous step names are sent to the server.
(() => {
  const $ = id => document.getElementById(id);
  const PICTURES = [
    { id: 'butterfly', label: 'Butterfly' }, { id: 'flower', label: 'Flower' }, { id: 'cat', label: 'Cat' },
    { id: 'heart', label: 'Heart' }, { id: 'house', label: 'House' }, { id: 'fish', label: 'Fish' },
  ];
  // Real customer reviews for the moving tape. The star line is their true
  // average, worked out here so the two cannot drift apart.
  const REVIEWS = [
    { name: "Emily Carter", stars: 5, quote: "I was paying every week for another tracing app so finding this for $14.99 ONCE was honestly a relief. Does exactly what I need and I don't have to download anything." },
    { name: "Marcus J", stars: 5, quote: "Wait so I can literally type what I wanna draw and it makes it for me?? 😭 this is actually so cool" },
    { name: "Sarah Mitchell", stars: 5, quote: "My daughter loves drawing but struggles copying pictures by hand. We tried the butterfly first and she was so proud of herself. The free drawing was a nice touch too." },
    { name: "Alex P.", stars: 4, quote: "Works pretty good. Took me a few minutes to get my phone positioned properly over the paper but once I figured it out the tracing was easy." },
    { name: "Jasmine 💕", stars: 5, quote: "NO SUBSCRIPTION!!! finally somebody gets it. I don't mind paying for an app but I hate seeing $6.99 a week for something I only use sometimes." },
    { name: "Daniel Reyes", stars: 5, quote: "I use it on my iPad and my phone. No app store, no installing anything, just open the website and start. Really convenient." },
    { name: "Mia Thompson", stars: 5, quote: "The AI drawing thing is my favorite part. I asked for a cute dragon sitting on a mushroom and it actually gave me something I could trace lol. Love it." },
    { name: "Robert K", stars: 4, quote: "Good alternative to the expensive AR drawing apps. You do need to keep your phone steady though. A stand makes a big difference." },
    { name: "Ashley Nicole", stars: 5, quote: "I genuinely cannot draw 😂 but I traced a picture of my dog and it came out SO MUCH better than anything I've drawn before." },
    { name: "Kevin Brooks", stars: 5, quote: "$14.99 forever versus paying monthly? Easy choice. I don't use tracing apps enough to justify another subscription." },
    { name: "Brianna", stars: 5, quote: "I love that you can upload your own pictures instead of being stuck with whatever drawings the app gives you. I mostly use it for flowers and little tattoo ideas." },
    { name: "Chris M.", stars: 3, quote: "The actual tracing part is nice but holding the phone above the paper gets annoying after a while. Wish there was an easier way to set it up without buying a stand." },
    { name: "Olivia Grace", stars: 5, quote: "My kids have been drawing cats, butterflies and flowers all afternoon. I was expecting it to ask for my card just to try it but the first one was free." },
    { name: "Nathan", stars: 4, quote: "Simple and does what it says. I like that it's a website because I already have way too many apps installed. Would be nice to have more examples to choose from." },
    { name: "Kayla R", stars: 5, quote: "The fact that I can just DESCRIBE a picture and have it turned into something to trace is crazy to me. I spent like an hour making random cute drawings 😂" },
    { name: "Jennifer L", stars: 5, quote: "I've tried three different drawing apps and they all wanted subscriptions. This is the first one I've found with a straightforward one-time price. Much prefer this." },
    { name: "David Wilson", stars: 4, quote: "Used it to trace a photo onto paper for a birthday card. Had to adjust the size a couple times but the end result was great. Pretty useful little tool." },
    { name: "Bella 🦋", stars: 5, quote: "omggg the butterfly came out so cute!! I literally have zero drawing skills and my first attempt looked decent 😭❤️" },
    { name: "Thomas Avery", stars: 5, quote: "What sold me was not needing to install another app. Opened it in Safari, picked a picture and started tracing. That's really all I wanted." },
    { name: "Amanda S", stars: 5, quote: "I got tired of forgetting to cancel free trials and getting charged. Paid once for this and I don't have to think about another recurring payment. Thank you." },
    { name: "Jordan", stars: 3, quote: "Cool idea and the AI pictures are fun. The camera positioning takes some patience though, especially with smaller drawings. Still usable once you get the hang of it." },
    { name: "Hannah Marie", stars: 5, quote: "I'm using this to practice drawing faces and hands because those are the hardest for me. Being able to use my own reference photos instead of preset images helps a lot." },
    { name: "Luis Fernandez", stars: 4, quote: "Pretty straightforward. I tried it on my Android and then on my laptop to pick out pictures. The browser approach is nice, just make sure your camera permissions are enabled." },
    { name: "Chloe ✨", stars: 5, quote: "This is what I thought those other AR drawing apps were going to be. Pick a photo, see the lines, trace it. No weekly charges, no complicated setup. Love it!!" },
  ];
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const reviewStars = value => {
    const full = Math.round(Math.max(0, Math.min(5, Number(value) || 0)));
    return `<span class="review-stars" role="img" aria-label="${full} out of 5 stars">${'★'.repeat(full)}<span class="review-stars-off" aria-hidden="true">${'★'.repeat(5 - full)}</span></span>`;
  };
  const tapeCard = review => `<figure class="tape-card">${reviewStars(review.stars)}<blockquote>${esc(review.quote)}</blockquote><figcaption><span class="review-name">${esc(review.name)}</span></figcaption></figure>`;
  (() => {
    const average = REVIEWS.reduce((sum, review) => sum + review.stars, 0) / REVIEWS.length;
    $('trust').innerHTML = `${reviewStars(average)}<span class="trust-text">${average.toFixed(1)} · ${REVIEWS.length} reviews</span>`;
    const run = REVIEWS.map(tapeCard).join('');
    $('tape-track').innerHTML = `<div class="tape-run">${run}</div><div class="tape-run" aria-hidden="true">${run}</div>`;
  })();
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
    del: key => { try { localStorage.removeItem(key); } catch { /* private mode */ } },
  };
  const params = new URLSearchParams(location.search);
  // Inside the Marketel iPhone app the page is a local file and the native
  // shell is reachable; the API is the website's. Nothing in the app is
  // recorded by Clarity or sent to Meta.
  const shell = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.marketelShell;
  const inApp = !!shell || location.protocol === 'capacitor:';
  const API = inApp ? 'https://bookmarketel.com' : '';
  const tell = message => { try { if (shell) shell.postMessage(message); } catch { /* not in the app */ } };
  // Only the US App Store allows a link out to buy. Unknown until the shell answers.
  let storefront = inApp ? '' : 'web';
  const canBuy = () => !inApp || storefront === 'USA';

  // The owner's own visits stay out of the numbers and out of Meta. Same key as
  // the Claims page, so the switch on /funnel covers this page too.
  const ownerBrowser = (() => {
    const asked = params.get('notrack');
    if (asked === '1') store.set('marketel.noTrack', '1');
    if (asked === '0') store.del('marketel.noTrack');
    return store.get('marketel.noTrack') === '1';
  })();
  const visitorId = (() => {
    let id = store.get('trace.visitor');
    if (!/^v_[A-Za-z0-9]{8,40}$/.test(id || '')) {
      const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
      id = 'v_' + Array.from(bytes, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
      store.set('trace.visitor', id);
    }
    return id;
  })();

  // Meta's browser ids, sent with the two signals Meta optimises on.
  const cookieValue = name => { try { const m = String(document.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)); return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; } };
  const validMetaId = value => (/^fb\.1\.[A-Za-z0-9._-]+$/.test(String(value || '')) ? String(value).slice(0, 220) : '');
  const validClickId = value => (/^[A-Za-z0-9._-]{1,180}$/.test(String(value || '')) ? String(value) : '');
  const writeCookie = (name, value) => { if (value) document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=7776000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; };
  const attribution = (() => {
    // Custom-scheme pages have an opaque ("null") origin. They must not
    // construct a web URL or persist advertising identifiers in the app.
    if (inApp) return {};
    const fbclid = validClickId(params.get('fbclid'));
    let fbp = validMetaId(cookieValue('_fbp'));
    if (!fbp) { const w = new Uint32Array(2); crypto.getRandomValues(w); fbp = `fb.1.${Date.now()}.${w[0]}${w[1]}`; writeCookie('_fbp', fbp); }
    const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : validMetaId(cookieValue('_fbc'));
    if (fbclid) writeCookie('_fbc', fbc);
    const source = new URL(location.origin + location.pathname);
    const current = { fbp, ...(fbc ? { fbc } : {}) };
    for (const [param, key] of [['utm_source', 'utmSource'], ['utm_medium', 'utmMedium'], ['utm_campaign', 'utmCampaign'], ['utm_content', 'utmContent'], ['utm_term', 'utmTerm']]) {
      const value = String(params.get(param) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180);
      if (value) { current[key] = value; source.searchParams.set(param, value); }
    }
    if (fbclid) source.searchParams.set('fbclid', fbclid);
    current.sourceUrl = source.toString();
    let stored = {};
    try { stored = JSON.parse(store.get('trace.metaAttribution.v1') || '{}') || {}; } catch { stored = {}; }
    const result = !Object.keys(stored).length || fbclid ? current : { ...stored, fbp };
    store.set('trace.metaAttribution.v1', JSON.stringify(result));
    return result;
  })();

  async function api(path, body, { keepalive = false } = {}) {
    const response = await fetch(`${API}/api/trace${path}`, {
      method: 'POST', keepalive,
      headers: { 'Content-Type': 'application/json', ...(ownerBrowser ? { 'x-marketel-no-track': '1' } : {}) },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: response.status });
    return data;
  }
  const SIGNALS = new Set(['TracePicked', 'TraceStarted', 'TraceCheckoutOpened']);
  const sent = new Set();
  function track(name, detail = '', { once = true, keepalive = false } = {}) {
    const key = `${name}:${detail}`;
    if (once && sent.has(key)) return;
    sent.add(key);
    api('/event', { name, visitorId, ...(detail ? { detail } : {}), ...(SIGNALS.has(name) && !inApp ? { attribution } : {}) }, { keepalive }).catch(() => {});
  }

  // Unlock state. The token is the signed purchase; without it the first
  // picture traced is free and the next one asks.
  let token = store.get('trace.unlock') || '';
  const unlocked = () => !!token;
  const freeKey = () => store.get('trace.free') || '';
  const mayOpen = key => unlocked() || !freeKey() || freeKey() === key;

  // ----- Screens and sheets -----
  const sheets = ['paywall', 'welcome', 'restore'];
  let checkoutGeneration = 0;
  function openSheet(id) {
    checkoutGeneration++;
    for (const other of sheets) $(other).hidden = other !== id;
    $('backdrop').hidden = false;
  }
  function closeSheets() { checkoutGeneration++; for (const id of sheets) $(id).hidden = true; $('backdrop').hidden = true; }
  function busy(text) { $('busy-text').textContent = text || 'One moment…'; $('busy').hidden = !text; }
  let toastTimer = 0;
  function toast(text, ms = 2600) {
    const el = $('toast'); el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }
  function renderHome() {
    $('note').innerHTML = unlocked()
      ? '<strong>Unlocked.</strong> Trace anything, for good.'
      : canBuy() ? 'First drawing free. Then <strong>$14.99 once</strong> to trace anything, for good. No subscription.'
      : 'Your first drawing is free.';
    // For anyone who already knows they want it: pay straight away.
    $('unlock-now').hidden = unlocked() || !canBuy();
    // The other choice from the first second: try it free (pick a picture,
    // the camera opens) or buy straight away from the bar.
    $('buy-top').hidden = unlocked() || !canBuy();
    // The reviews talk about the price and about buying on the web: only where a price may be shown.
    $('trust').hidden = $('tape').hidden = !canBuy();
    $('restore-open').hidden = unlocked();
    document.querySelector('.restore-dot').hidden = unlocked();
    for (const tile of document.querySelectorAll('.tile')) tile.classList.toggle('is-free', !unlocked() && freeKey() === `starter:${tile.dataset.id}`);
  }
  // iOS scrolls the page up for the keyboard (after "Describe it") and does
  // not always scroll it back. The camera screen still looks right, but its
  // buttons' touch areas sit where the scrolled page puts them, so Done did
  // nothing until the picture was touched. Tracing pins the page at the top
  // and freezes it; home lets it scroll again.
  function settleViewport() {
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  }
  function showHome() { stopTracing(); document.documentElement.classList.remove('tracing'); $('tracer').hidden = true; $('camera-help').hidden = true; $('home').hidden = false; renderHome(); }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (!$('tracer').hidden) window.scrollTo(0, 0); });
  if (inApp) {
    // The page draws its own Marketel bar, so the app's glass bar stands down.
    tell({ type: 'visibility', visible: false });
    document.documentElement.classList.add('in-app');
    document.querySelector('.brand').addEventListener('click', event => event.preventDefault());
    // Terms open in a browser sheet rather than replacing the app's page.
    document.querySelector('a[href="/trace/terms"]').addEventListener('click', event => {
      event.preventDefault();
      tell({ type: 'openBrowser', url: 'https://bookmarketel.com/trace/terms' });
    });
    window.marketelInspectStorefront = country => { storefront = String(country || '').toUpperCase() || 'unknown'; renderHome(); renderPaywall(); };
    tell({ type: 'inspectStorefront' });
  }

  // ----- Picking a picture -----
  const grid = $('grid');
  for (const picture of PICTURES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tile'; button.dataset.id = picture.id;
    button.setAttribute('aria-label', `Trace the ${picture.label.toLowerCase()}`);
    const img = document.createElement('img'); img.src = `/trace/pictures/${picture.id}.svg`; img.alt = '';
    button.append(img);
    button.addEventListener('click', () => pickStarter(picture.id));
    grid.append(button);
  }
  function pickStarter(id) {
    track('TracePicked', 'starter', { once: false });
    const key = `starter:${id}`;
    if (!mayOpen(key)) return showPaywall('second');
    startTracing({ key, lines: `/trace/pictures/${id}.svg`, photo: '', kind: 'starter' });
  }
  // ----- Describe it: AI line art to trace -----
  // The drawing comes back as black lines on white. White becomes see-through
  // so only the lines float over the camera, the same as a photo's sketch.
  const aiCache = new Map();
  async function inkOnly(source) {
    const img = new Image();
    img.src = source;
    await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let alpha = lum > 235 ? 0 : Math.min(255, Math.round((255 - lum) * 1.4));
      if (alpha < 30) alpha = 0;
      d[i] = 22; d[i + 1] = 19; d[i + 2] = 16; d[i + 3] = alpha;
    }
    ctx.putImageData(pixels, 0, 0);
    return toBlobUrl(canvas, 'image/png');
  }
  $('describe-form').addEventListener('submit', async event => {
    event.preventDefault();
    const prompt = $('describe').value.replace(/\s+/g, ' ').trim();
    if (prompt.length < 2) { $('describe').focus(); return; }
    track('TraceAIAsked', '', { once: false });
    track('TracePicked', 'ai', { once: false });
    const key = `ai:${prompt.toLowerCase()}`;
    if (!mayOpen(key)) return showPaywall('second');
    $('describe').blur();
    if (aiCache.has(key)) return startTracing({ key, lines: aiCache.get(key), photo: '', kind: 'ai' });
    busy('Drawing your picture… about 10 seconds');
    try {
      const { image } = await api('/generate', { prompt, visitorId, ...(token ? { token } : {}) });
      const lines = await inkOnly(image);
      aiCache.set(key, lines);
      busy('');
      track('TraceAIShown');
      startTracing({ key, lines, photo: '', kind: 'ai' });
    } catch (error) {
      busy('');
      if (error.status === 402) return showPaywall('ai');
      alert(error.message || "The drawing didn't come out. Please try again.");
    }
  });

  $('own').addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    track('TracePicked', 'photo', { once: false });
    const key = `photo:${file.size}:${file.lastModified}`;
    if (!mayOpen(key)) return showPaywall('second');
    busy('Turning your photo into lines…');
    try {
      const picture = await photoToLines(file);
      busy('');
      startTracing({ key, ...picture, kind: 'photo' });
    } catch (error) {
      busy('');
      alert(error.message || 'That photo could not be opened. Try another one.');
    }
  });

  // ----- Photo to pencil lines, on the phone -----
  // A pencil sketch: the photo in grey, divided by a blurred negative of itself
  // ("colour dodge"). Flat areas go white, edges stay dark. The white becomes
  // transparent so only the lines float over the camera.
  async function decode(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ }
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be opened. Try another one.')); };
      img.src = url;
    });
  }
  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    const span = r * 2 + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w; let sum = 0;
      for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / span;
        sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / span;
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }
  const toBlobUrl = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('That photo could not be processed.'))), type, quality));
  async function photoToLines(file) {
    const image = await decode(file);
    const iw = image.width || image.naturalWidth, ih = image.height || image.naturalHeight;
    if (!iw || !ih) throw new Error('That photo could not be opened. Try another one.');
    const scale = Math.min(1, 1200 / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    if (image.close) image.close();
    const photo = await toBlobUrl(canvas, 'image/jpeg', 0.88);
    const pixels = ctx.getImageData(0, 0, w, h);
    const d = pixels.data, n = w * h;
    const gray = new Float32Array(n), negative = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const g = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      gray[i] = g; negative[i] = 255 - g;
    }
    const r = Math.max(2, Math.round(Math.max(w, h) / 150));
    let blurred = boxBlur(negative, w, h, r);
    blurred = boxBlur(blurred, w, h, r);
    for (let i = 0; i < n; i++) {
      const b = blurred[i];
      const dodge = b >= 254.5 ? 255 : Math.min(255, (gray[i] * 255) / (255 - b));
      // 245+ is paper; 150 and below is the darkest line.
      const v = Math.min(1, Math.max(0, (dodge - 150) / 95));
      let alpha = Math.round(Math.pow(1 - v, 0.8) * 255);
      // The blur runs out of picture at the edges and leaves specks there.
      const x = i % w, y = (i - x) / w;
      if (alpha < 36 || x < r || y < r || x >= w - r || y >= h - r) alpha = 0;
      d[i * 4] = 22; d[i * 4 + 1] = 19; d[i * 4 + 2] = 16; d[i * 4 + 3] = alpha;
    }
    ctx.putImageData(pixels, 0, 0);
    const lines = await toBlobUrl(canvas, 'image/png');
    return { lines, photo };
  }

  // ----- Tracing -----
  const video = $('cam'), overlay = $('overlay'), stage = $('stage');
  let stream = null, current = null, wakeLock = null, locked = false, showingPhoto = false;
  let cameraGeneration = 0;
  let tracedSince = 0, tracedMs = 0, tickTimer = 0, hintTimer = 0;
  const view = { x: 0, y: 0, s: 1, r: 0 };
  const applyView = () => { overlay.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.r}rad) scale(${view.s})`; };

  async function startCamera(generation) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'Unsupported' });
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    // Permission may finish after Back or after another picture was selected.
    // A stale response must never restart the camera behind the home screen.
    if (generation !== cameraGeneration) { acquired.getTracks().forEach(track => track.stop()); return false; }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    return generation === cameraGeneration;
  }
  async function keepAwake() {
    const generation = cameraGeneration;
    try {
      if (navigator.wakeLock && document.visibilityState === 'visible') {
        const acquired = await navigator.wakeLock.request('screen');
        if (generation !== cameraGeneration) { await acquired.release(); return; }
        wakeLock = acquired;
      }
    } catch { /* Screen locking is optional; never block tracing. */ }
  }
  function stopTracing() {
    cameraGeneration++;
    clearInterval(tickTimer); clearTimeout(hintTimer);
    if (tracedSince) { tracedMs += Date.now() - tracedSince; tracedSince = 0; }
    if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
    video.srcObject = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  function setLocked(value) {
    locked = value;
    $('lock').setAttribute('aria-pressed', String(locked));
    $('lock-label').textContent = locked ? 'Locked' : 'Lock';
    $('lock-shackle').setAttribute('d', locked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 8 0');
  }
  async function startTracing(picture) {
    stopTracing();
    settleViewport();
    document.documentElement.classList.add('tracing');
    // Once more after the keyboard has finished closing.
    setTimeout(() => { if (!$('tracer').hidden) window.scrollTo(0, 0); }, 400);
    const generation = cameraGeneration;
    current = picture; showingPhoto = false; tracedMs = 0;
    Object.assign(view, { x: 0, y: 0, s: 1, r: 0 }); applyView(); setLocked(false);
    overlay.src = picture.lines;
    overlay.style.opacity = String($('fade').value / 100);
    $('mode').hidden = !picture.photo; $('mode').textContent = 'Show photo';
    $('home').hidden = true; $('camera-help').hidden = true; $('tracer').hidden = false;
    track('TraceCameraAsked');
    // Said before iOS asks, and gone once the camera shows the paper.
    $('camera-note').hidden = false;
    try { if (!await startCamera(generation)) return; }
    catch (error) { if (generation === cameraGeneration) cameraFailed(error); return; }
    finally { if (generation === cameraGeneration) $('camera-note').hidden = true; }
    // The free drawing is spent only once the camera is actually showing it.
    if (!unlocked() && !freeKey()) store.set('trace.free', picture.key);
    track('TraceStarted', picture.kind);
    keepAwake();
    tracedSince = Date.now();
    tickTimer = setInterval(() => {
      if (!tracedSince) return;
      const total = tracedMs + Date.now() - tracedSince;
      if (total >= 30000) track('TraceTraced30');
      if (total >= 120000) track('TraceTraced120');
    }, 5000);
    $('hint').hidden = false;
    clearTimeout(hintTimer); hintTimer = setTimeout(() => { $('hint').hidden = true; }, 7000);
  }
  $('hint').addEventListener('click', () => { $('hint').hidden = true; });
  document.addEventListener('visibilitychange', () => {
    if ($('tracer').hidden || !stream) return;
    if (document.visibilityState === 'visible') { tracedSince = Date.now(); keepAwake(); }
    else if (tracedSince) { tracedMs += Date.now() - tracedSince; tracedSince = 0; }
  });

  const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Messenger|musical_ly|TikTok|Snapchat|Line\//i.test(navigator.userAgent);
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function cameraFailed(error) {
    stopTracing();
    const name = error && error.name;
    const reason = name === 'Unsupported' ? 'unsupported'
      : name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
      : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError' ? 'nocamera' : 'error';
    track('TraceCameraDenied', reason, { once: false });
    const inApp = inAppBrowser() && reason !== 'nocamera';
    track('TraceCameraHelpShown', inApp ? 'inapp' : reason, { once: false });
    let title = 'Allow your camera', body;
    const openIn = `Tap ••• at the top right, then “Open in ${isIOS() ? 'Safari' : 'browser'}”, or copy the link into your browser.`;
    if (inApp && reason === 'denied') {
      // Facebook's and Instagram's browsers do share the camera; this person
      // said no to the question. Asking again usually works.
      body = `Tap Try again, then Allow. The camera only shows your paper under the picture; nothing is recorded. Still blocked? ${openIn}`;
    } else if (inApp) {
      title = 'Open this in your browser';
      body = `The camera didn't start in this app's browser. ${openIn}`;
    } else if (reason === 'denied') {
      body = isIOS()
        ? 'Tap “aA” in the address bar, then Website Settings, then set Camera to Allow. Then tap Try again.'
        : 'Tap the icon on the left of the address bar, then Permissions, then allow Camera. Then tap Try again.';
    } else if (reason === 'nocamera') {
      title = 'No camera found';
      body = 'Open this page on your phone and point it at your paper.';
    } else {
      title = 'Open this in your browser';
      body = 'This browser can\'t use the camera. Copy the link and open it in Safari or Chrome.';
    }
    $('help-title').textContent = title;
    $('help-body').textContent = body;
    $('help-copy').hidden = !(inApp || reason === 'unsupported' || reason === 'error');
    $('tracer').hidden = true; $('camera-help').hidden = false;
  }
  $('help-retry').addEventListener('click', () => { if (current) startTracing(current); });
  $('help-home').addEventListener('click', showHome);
  $('help-copy').addEventListener('click', async () => {
    const link = inApp ? 'https://bookmarketel.com/trace' : location.href;
    try { await navigator.clipboard.writeText(link); $('help-copy').textContent = 'Link copied'; }
    catch { prompt('Copy this link:', link); }
  });

  // Move, pinch and twist the picture. Locked, it ignores every touch so a hand
  // resting on the screen can't shift it mid-drawing.
  const pointers = new Map();
  let gesture = null;
  const snapshot = () => ({ view: { ...view }, points: [...pointers.values()].map(p => ({ ...p })) });
  stage.addEventListener('pointerdown', event => {
    if (locked) { toast('Locked. Tap Locked to move the picture.'); return; }
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture = snapshot();
  });
  stage.addEventListener('pointermove', event => {
    if (locked || !pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const now = [...pointers.values()], start = gesture.points;
    if (now.length === 1 && start.length === 1) {
      view.x = gesture.view.x + now[0].x - start[0].x;
      view.y = gesture.view.y + now[0].y - start[0].y;
    } else if (now.length >= 2 && start.length >= 2) {
      const span = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      view.s = Math.min(6, Math.max(0.2, gesture.view.s * span(now[0], now[1]) / span(start[0], start[1])));
      view.r = gesture.view.r + angle(now[0], now[1]) - angle(start[0], start[1]);
      const m0 = mid(start[0], start[1]), m1 = mid(now[0], now[1]);
      view.x = gesture.view.x + m1.x - m0.x;
      view.y = gesture.view.y + m1.y - m0.y;
    }
    applyView();
    track('TraceMoved');
  });
  const lift = event => { pointers.delete(event.pointerId); gesture = pointers.size ? snapshot() : null; };
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);

  $('fade').addEventListener('input', event => { overlay.style.opacity = String(event.target.value / 100); track('TraceFaded'); });
  $('lock').addEventListener('click', () => { setLocked(!locked); if (locked) { track('TraceLocked'); toast('Locked in place. Start drawing.'); } });
  $('mode').addEventListener('click', () => {
    if (!current || !current.photo) return;
    showingPhoto = !showingPhoto;
    overlay.src = showingPhoto ? current.photo : current.lines;
    $('mode').textContent = showingPhoto ? 'Show lines' : 'Show photo';
  });
  $('back').addEventListener('click', showHome);
  // A finished drawing is a win: celebrate it before any price. Confetti, a
  // cheer, then the offer slides up. No motion for people who turned it off.
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function confetti() {
    if (reducedMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti'; canvas.className = 'confetti';
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
    const colors = ['#2e7d5b', '#4caf7d', '#ffcc33', '#ff6b6b', '#5aa9ff', '#b07cff'];
    const bits = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.62,
      vx: (Math.random() - 0.5) * 13, vy: -9 - Math.random() * 9, size: 5 + Math.random() * 6,
      spin: Math.random() * 6.3, vs: (Math.random() - 0.5) * 0.4, color: colors[Math.floor(Math.random() * colors.length)] }));
    const start = performance.now();
    const frame = now => {
      const t = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const b of bits) {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.spin += b.vs;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1800); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
        ctx.fillStyle = b.color; ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2); ctx.restore();
      }
      if (t < 1800) requestAnimationFrame(frame); else canvas.remove();
    };
    requestAnimationFrame(frame);
  }
  $('done').addEventListener('click', () => {
    track('TraceDone', '', { once: false });
    showHome();
    if (!unlocked()) {
      confetti();
      showPaywall('done', '🎉 You just traced your first drawing!');
    }
  });

  // ----- Paying -----
  let paywallReason = '';
  function renderPaywall() {
    const buy = canBuy();
    for (const id of ['buy', 'pay-compare', 'pay-price', 'pay-sub', 'pay-perks', 'pay-fine']) $(id).hidden = !buy;
    // The comparison carries the price; the old big price line stays for no one.
    $('pay-price').hidden = true;
    $('pay-elsewhere').hidden = buy;
    $('pay-title').textContent = !buy ? 'That was your free drawing' : paywallReason === 'home' || paywallReason === 'top' ? 'Unlock everything'
      : paywallReason === 'done' ? 'Keep drawing. Forever.' : 'Keep tracing anything';
  }
  function showPaywall(reason, note = '') {
    paywallReason = reason;
    track('TracePaywallShown', reason, { once: false });
    $('pay-note').textContent = note; $('pay-note').hidden = !note;
    $('pay-error').hidden = true;
    $('buy').disabled = false; $('buy').textContent = 'Unlock forever: $14.99';
    renderPaywall();
    openSheet('paywall');
  }
  $('unlock-now').addEventListener('click', () => showPaywall('home'));
  $('buy-top').addEventListener('click', () => showPaywall('top'));
  $('pay-later').addEventListener('click', () => { track('TracePaywallClosed', '', { once: false }); closeSheets(); });
  $('backdrop').addEventListener('click', () => { if (!$('paywall').hidden) track('TracePaywallClosed', '', { once: false }); closeSheets(); });
  $('buy').addEventListener('click', async () => {
    if (!canBuy()) return;
    const generation = checkoutGeneration;
    const button = $('buy');
    track('TraceCheckoutTapped', '', { once: false });
    button.disabled = true; button.textContent = 'Opening secure checkout…';
    $('pay-error').hidden = true;
    try {
      const { url, id } = await api('/checkout', { visitorId, ...(inApp ? {} : { attribution }) });
      if (generation !== checkoutGeneration) return;
      if (!/^https:\/\/checkout\.stripe\.com\//.test(String(url || ''))) throw new Error('Checkout could not be opened. Please try again.');
      track('TraceCheckoutOpened', '', { keepalive: true });
      // Keep the payment reference before leaving, on web as well as native.
      // A reload or interrupted return must not lose an already-paid unlock.
      if (id) store.set('trace.pending', id);
      if (inApp) {
        // Paying happens in Safari. The app checks this payment when it comes back.
        tell({ type: 'openPurchase', url });
        button.disabled = false; button.textContent = 'Unlock forever: $14.99';
        closeSheets();
      } else location.href = url;
    } catch (error) {
      if (generation !== checkoutGeneration) return;
      track('TraceCheckoutFailed', error.status === 429 ? 'rate' : 'error', { once: false });
      button.disabled = false; button.textContent = 'Unlock forever: $14.99';
      $('pay-error').textContent = error.message; $('pay-error').hidden = false;
    }
  });
  // Coming back from Stripe with the browser's back button restores this page
  // from memory with the button still saying "Opening…".
  window.addEventListener('pageshow', event => { if (event.persisted) { $('buy').disabled = false; $('buy').textContent = 'Unlock forever: $14.99'; busy(''); } });

  async function confirmPayment(sessionId) {
    store.set('trace.pending', sessionId);
    busy('Unlocking…');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await api('/unlock', { sessionId });
        token = result.token; store.set('trace.unlock', token); store.del('trace.pending');
        track('TraceUnlocked');
        busy('');
        $('welcome-title').textContent = 'You\'re in.';
        $('welcome-go').textContent = 'Pick a picture';
        $('welcome-body').textContent = result.email
          ? `Trace anything, for good. We emailed your receipt and a link that unlocks your other phones to ${result.email}.`
          : 'Trace anything, for good.';
        // Paid in Safari for the app: the way back in.
        $('welcome-app').hidden = !(params.get('app') === '1' && !inApp);
        renderHome();
        openSheet('welcome');
        return;
      } catch (error) {
        if (error.status !== 402 && error.status < 500) { busy(''); $('welcome-title').textContent = 'We couldn\'t confirm that payment'; $('welcome-body').textContent = `${error.message} If you were charged, email support@bookmarketel.com and we'll sort it out right away.`; $('welcome-go').textContent = 'Back to pictures'; openSheet('welcome'); return; }
        await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
    busy('');
    $('welcome-title').textContent = 'Almost there';
    $('welcome-body').textContent = 'Your payment is still being confirmed. Refresh this page in a minute. If you were charged and it still won\'t unlock, email support@bookmarketel.com.';
    $('welcome-go').textContent = 'Back to pictures';
    openSheet('welcome');
  }
  $('welcome-go').addEventListener('click', closeSheets);

  // Back in the app after paying in Safari: one quiet check of the payment it
  // opened. Not paid yet (still on Stripe's page) leaves it waiting.
  let checkingPending = false;
  async function checkPending() {
    const pending = store.get('trace.pending');
    if (!pending || unlocked() || checkingPending) return;
    checkingPending = true;
    try {
      const result = await api('/unlock', { sessionId: pending });
      token = result.token; store.set('trace.unlock', token); store.del('trace.pending');
      track('TraceUnlocked', inApp ? 'app' : 'return');
      renderHome();
      $('welcome-title').textContent = 'You\'re in.'; $('welcome-go').textContent = 'Pick a picture';
      $('welcome-body').textContent = 'Trace anything, for good. Your receipt is in your email.';
      $('welcome-app').hidden = true;
      openSheet('welcome');
    } catch (error) {
      if (error.status === 400 || error.status === 404) store.del('trace.pending');
    } finally { checkingPending = false; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkPending(); });
  window.addEventListener('pagehide', stopTracing);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    // A cached document no longer owns a live camera stream.
    if (!$('tracer').hidden) showHome();
    checkPending();
  });

  async function unlockFromLink(value) {
    busy('Unlocking this phone…');
    try {
      await api('/verify', { token: value });
      token = value; store.set('trace.unlock', token);
      track('TraceUnlocked', 'link');
      busy(''); renderHome();
      $('welcome-title').textContent = 'Unlocked on this phone';
      $('welcome-body').textContent = 'Trace anything, for good.';
      openSheet('welcome');
    } catch (error) {
      busy('');
      alert(error.message || 'That unlock link is not valid.');
    }
  }

  // ----- Already paid? -----
  const openRestore = () => {
    track('TraceRestoreAsked', '', { once: false });
    $('restore-form').hidden = false; $('restore-done').hidden = true; $('restore-error').hidden = true; $('code-form').hidden = true;
    openSheet('restore');
    setTimeout(() => $('restore-email').focus(), 50);
  };
  $('restore-open').addEventListener('click', openRestore);
  $('pay-restore').addEventListener('click', openRestore);
  $('restore-close').addEventListener('click', closeSheets);
  $('restore-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('restore-email').value.trim();
    $('restore-error').hidden = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('restore-error').textContent = 'Enter the email you paid with.'; $('restore-error').hidden = false; return; }
    $('restore-send').disabled = true;
    try {
      await api('/restore', { email });
      $('restore-form').hidden = true;
      $('restore-done').textContent = `If ${email} bought Marketel Trace, an email with a 6-digit code is on its way. Check spam if it isn't there in a minute.`;
      $('restore-done').hidden = false;
      $('code-form').hidden = false;
      setTimeout(() => $('restore-code').focus(), 50);
    } catch (error) {
      $('restore-error').textContent = error.message; $('restore-error').hidden = false;
    } finally { $('restore-send').disabled = false; }
  });

  $('code-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('restore-email').value.trim(), code = $('restore-code').value.replace(/\D/g, '');
    $('restore-error').hidden = true;
    if (code.length !== 6) { $('restore-error').textContent = 'Enter the 6-digit code from the email.'; $('restore-error').hidden = false; return; }
    $('code-send').disabled = true;
    try {
      const result = await api('/restore-code', { email, code });
      token = result.token; store.set('trace.unlock', token); store.del('trace.pending');
      track('TraceUnlocked', 'code');
      renderHome();
      $('welcome-title').textContent = 'Unlocked on this phone'; $('welcome-go').textContent = 'Pick a picture';
      $('welcome-body').textContent = 'Trace anything, for good.'; $('welcome-app').hidden = true;
      openSheet('welcome');
    } catch (error) {
      $('restore-error').textContent = error.message; $('restore-error').hidden = false;
    } finally { $('code-send').disabled = false; }
  });

  // ----- Arrival -----
  const ua = navigator.userAgent;
  track('TraceLanded');
  track('TraceFrom', params.get('fbclid') ? 'ad' : /(^|\.)(facebook|instagram|fb|messenger)\.com/i.test(document.referrer) ? 'social' : !document.referrer ? 'direct' : 'other');
  track('TraceBrowser', /FBAN|FBAV|FB_IAB/.test(ua) ? 'facebook' : /Instagram/.test(ua) ? 'instagram' : /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other');

  const paid = params.get('paid'), unlockLink = params.get('unlock'), cancelled = params.get('cancelled');
  if (paid || unlockLink || cancelled) {
    const clean = new URL(location.href);
    for (const key of ['paid', 'unlock', 'cancelled', 'app']) clean.searchParams.delete(key);
    history.replaceState(null, '', clean.pathname + clean.search);
  }
  renderHome();
  if (paid) confirmPayment(paid);
  else if (unlockLink) unlockFromLink(unlockLink);
  else if (cancelled) { store.del('trace.pending'); track('TraceCheckoutCancelled'); showPaywall('cancelled', 'No payment was taken.'); }
  else checkPending();

  // Microsoft Clarity recordings for ad visitors only, never the owner.
  if (!ownerBrowser && !inApp && /^https:$/.test(location.protocol)) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    const script = document.createElement('script'); script.async = true; script.src = 'https://www.clarity.ms/tag/y93wrwbvgb';
    document.head.append(script);
    window.clarity('set', 'wedge', 'trace');
  }
})();
