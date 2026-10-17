'use strict';
// Marketel Trace. The picture floats over the live camera; the phone rests
// above the paper and the person draws along the lines they see. Pictures and
// photos stay on the phone: only anonymous step names are sent to the server.
(() => {
  const $ = id => document.getElementById(id);
  // The starters, line drawings that look like what the page promises. Each has a
  // small thumbnail for the grid and a larger see-through picture to trace.
  const PICTURES = [
    { id: 'dragon', label: 'Dragon' },
    { id: 'girl', label: 'Anime girl' }, { id: 'ninja', label: 'Ninja boy' }, { id: 'bald', label: 'Bald hero' },
    { id: 'profile', label: 'Boy in profile' }, { id: 'doll', label: 'Stitched doll' }, { id: 'creature', label: 'Grinning creature' },
  ];
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
  // Meta's click ids (fbclid) are often well over 180 characters; cutting or
  // refusing them sent events to Meta that it could not tie to the ad click.
  const validMetaId = value => (/^fb\.1\.[A-Za-z0-9._-]+$/.test(String(value || '')) && String(value).length <= 500 ? String(value) : '');
  const validClickId = value => (/^[A-Za-z0-9._-]{1,470}$/.test(String(value || '')) ? String(value) : '');
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
  const SIGNALS = new Set(['TraceAnswered', 'TracePicked', 'TraceStarted', 'TraceCheckoutOpened']);

  // Meta's pixel, on the website only (never the app, never the owner, never a
  // test page over http). It gives Ads Manager landing page views and Meta's own
  // browser match. Each signal goes with the same event id the server sends, so
  // Meta counts it once. Mirrors TRACE_SIGNALS in trace.js. ViewContent is the
  // first meaningful tap: the answer to "What brought you here?", or a pick.
  const PIXEL_ID = '1545780930244672';
  const pixelOn = !ownerBrowser && !inApp && location.protocol === 'https:' && !navigator.webdriver;
  const PIXEL_SIGNALS = {
    TraceAnswered: { event: 'ViewContent', id: 'trace-view', when: /^why-/ },
    TracePicked: { event: 'ViewContent', id: 'trace-view' },
    TraceStarted: { event: 'AddToCart', id: 'trace-started', value: 14.99 },
    TraceCheckoutOpened: { event: 'InitiateCheckout', id: 'trace-checkout', value: 14.99 },
  };
  const pixelSent = new Set();
  const pixel = (event, data, eventID) => { try { if (pixelOn && window.fbq) window.fbq('track', event, { content_name: 'Marketel Trace', currency: 'USD', ...data }, eventID ? { eventID } : undefined); } catch { /* never break the page */ } };
  if (pixelOn) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  const purchasePixel = sessionId => pixel('Purchase', { value: 14.99 }, `trace-purchase.${sessionId}`);

  const sent = new Set();
  function track(name, detail = '', { once = true, keepalive = false } = {}) {
    const key = `${name}:${detail}`;
    if (once && sent.has(key)) return;
    sent.add(key);
    const signal = PIXEL_SIGNALS[name];
    if (signal && (!signal.when || signal.when.test(detail)) && !pixelSent.has(signal.event)) {
      pixelSent.add(signal.event);
      pixel(signal.event, signal.value ? { value: signal.value } : {}, `${signal.id}.${visitorId}`);
    }
    api('/event', { name, visitorId, ...(detail ? { detail } : {}), ...(SIGNALS.has(name) && !inApp ? { attribution } : {}) }, { keepalive }).catch(() => {});
  }

  // Unlock state. The token is the signed purchase; without it the first
  // picture traced is free and the next one asks.
  let token = store.get('trace.unlock') || '';
  const unlocked = () => !!token;
  const freeKey = () => store.get('trace.free') || '';
  const mayOpen = key => unlocked() || !freeKey() || freeKey() === key;

  // ----- Screens and sheets -----
  const sheets = ['paywall', 'welcome', 'restore', 'camera-why'];
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
    // The bar's Buy belongs to the picture grid; the first screen has its own
    // quiet link, and the guided steps ask for nothing.
    $('buy-top').hidden = unlocked() || !canBuy() || currentStep !== 'pick';
    $('buy-now').hidden = unlocked() || !canBuy();
    // The cards say $0 today while the free drawing is unused, and the price once it is.
    const spent = !unlocked() && !!freeKey();
    for (const box of document.querySelectorAll('.today')) {
      box.querySelector('.today-big').innerHTML = spent ? '<strong>$14.99</strong> once' : '<strong>$0</strong> today';
      box.querySelector('.today-sub').textContent = spent ? 'Your free drawing is used. Pay once and trace anything, for good.' : 'Your first drawing is free. No card needed.';
    }
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
  function showHome() { stopTracing(); document.documentElement.classList.remove('tracing'); $('tracer').hidden = true; $('camera-help').hidden = true; $('home').hidden = false; showStep(homeStep()); renderHome(); }
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


  // ----- The web's guided path -----
  // "About you" (behind ?journey=1 until it is the default): three questions in
  // their own words, their answers read back beside the real recording, then
  // their choice: try it first, pay now, or look around. Trying shows drawings
  // that match their answer. The cards (built like the booking engine: the
  // name, the ad's promise, one button per card) are for looking around and
  // returning visitors. A pick is read back, the camera is explained right
  // before it asks, then tracing. The app and buyers go straight from the
  // picture grid to the camera.
  const STEPS = ['q1', 'q2', 'q3', 'forward', 'mine', 'cards', 'review', 'pick'];
  const QUESTIONS = ['q1', 'q2', 'q3', 'forward', 'mine'];
  // Each ad can open with its own call-out and promise (?hook=).
  const HOOKS = {
    tracing: { callout: 'Tracing app users: stop paying weekly.', promise: 'No Subscription. No Weekly Fees. No Account. Just Simple Tracing.' },
    cantdraw: { callout: "Can't draw? You can now.", promise: "Can't Draw? You Can Now. No Lessons. No Subscription. Just Trace." },
  };
  const hook = HOOKS[String(params.get('hook') || '').toLowerCase()] || HOOKS.tracing;
  $('promise').textContent = hook.promise;
  $('q-hook').textContent = hook.callout;
  const JOURNEY_DEFAULT = false;
  const journeyOn = (() => {
    const asked = params.get('journey');
    if (asked === '1') store.set('trace.journeyPreview', '1');
    if (asked === '0') store.del('trace.journeyPreview');
    return JOURNEY_DEFAULT || store.get('trace.journeyPreview') === '1';
  })();
  let answers = {};
  try { answers = JSON.parse(store.get('trace.journey.v1') || '{}') || {}; } catch { answers = {}; }
  const saveAnswers = () => store.set('trace.journey.v1', JSON.stringify(answers));
  const homeStep = () => (inApp || unlocked() ? 'pick' : journeyOn && !answers.done ? 'q1' : 'cards');
  let currentStep = 'pick';
  let chosen = null;
  function showStep(name, { push = false } = {}) {
    if (name !== 'pick' && (inApp || unlocked())) name = 'pick';
    // A drawing's read-back needs a drawing, and later questions need the first
    // answer; Back or Forward into them after a reload has neither.
    if (name === 'review' && !chosen) name = homeStep();
    if (QUESTIONS.includes(name) && name !== 'q1' && !answers.why) name = homeStep();
    currentStep = name;
    resetCheckout();
    for (const step of STEPS) $(`step-${step}`).hidden = step !== name;
    if (name === 'q3') renderQ3();
    if (name === 'forward') renderForward();
    if (name === 'mine') renderMine();
    // The recording fills the screen; the page behind it stays put.
    const video = $('forward-video');
    document.documentElement.classList.toggle('reel-open', name === 'forward');
    if (name === 'forward') video.play().catch(() => {}); else video.pause();
    if (QUESTIONS.includes(name)) track('TraceAsked', name);
    $('buy-top').hidden = name !== 'pick' || unlocked() || !canBuy();
    const state = { traceStep: name };
    if (push) history.pushState(state, ''); else history.replaceState(state, '');
    window.scrollTo(0, 0);
    const title = document.querySelector(`#step-${name} h1, #step-${name} h2`);
    if (title) title.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', event => {
    const name = event.state && STEPS.includes(event.state.traceStep) ? event.state.traceStep : homeStep();
    if (!$('tracer').hidden) return;
    closeSheets();
    showStep(name);
  });
  for (const back of document.querySelectorAll('[data-back]')) back.addEventListener('click', () => history.back());

  // ----- About you -----
  // An answer shows it was tapped (the framework's 140ms press), is kept on the
  // phone, and moves on. Their words come back on every screen after.
  const WEEKLY = { 499: 4.99, 999: 9.99, 2499: 24.99 };
  const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  const weeklyPrice = () => WEEKLY[answers.weekly] || 0;
  const yearly = () => Math.round(weeklyPrice() * 52);
  const NEXT = { why: 'q2', want: 'q3', pay: 'forward', weekly: 'forward' };
  for (const group of document.querySelectorAll('.answers')) {
    for (const button of group.querySelectorAll('.answer')) {
      button.addEventListener('click', () => {
        if (group.dataset.busy) return;
        group.dataset.busy = '1';
        button.classList.add('chosen');
        const q = group.dataset.q, value = button.dataset.value;
        answers[q] = value;
        // A different first answer asks the third question afresh.
        if (q === 'why') { delete answers.pay; delete answers.weekly; }
        saveAnswers();
        track('TraceAnswered', `${q}-${value}`, { once: false });
        setTimeout(() => { delete group.dataset.busy; button.classList.remove('chosen'); showStep(NEXT[q], { push: true }); }, 160);
      });
    }
  }
  // Question 3 is about money either way: what they pay now, or how they feel about subscriptions.
  function renderQ3() {
    const paying = answers.why === 'paying';
    $('q3-title').textContent = paying ? 'What do you pay now?' : 'How do you feel about app subscriptions?';
    $('q3-paying').hidden = !paying; $('q3-pref').hidden = paying;
  }
  const WANT = {
    anime: { title: 'You want to draw anime.', pick: 'Pick your anime drawing', tiles: ['girl', 'ninja', 'bald', 'profile'], type: 'Or type your own', ideas: ['An anime girl with a sword', 'A chibi fox', 'An anime boy with headphones'] },
    animals: { title: 'You want to draw animals.', pick: 'Pick your animal', tiles: ['dragon'], type: 'Or type any animal', ideas: ['A cute puppy', 'A kitten', 'A horse', 'A butterfly'] },
    people: { title: 'You want to draw people.', pick: 'Draw someone', tiles: ['profile'], photo: 'Use a photo of them' },
    type: { title: 'You want to draw anything you think of.', pick: 'What do you want to draw?', tiles: [], type: 'Type anything', ideas: ['A cute puppy', 'A sports car', 'A rose', 'A butterfly'] },
    photo: { title: 'You want to draw your own photos.', pick: 'Pick your photo', tiles: [], photo: 'Choose a photo' },
  };
  const want = () => WANT[answers.want] || WANT.type;
  // The money line answers question 3 in their own terms.
  function priceLine() {
    if (weeklyPrice()) return `You pay ${money(weeklyPrice())} a week: ${money(yearly())} a year. Trace is $14.99 once.`;
    return {
      monthly: 'You pay every month. Trace is $14.99 once, and nothing renews.',
      once: "You'd rather pay once. Trace is $14.99 once.",
      adds: 'Weekly fees add up. Trace is $14.99 once, and nothing renews.',
      fine: 'No subscription to keep track of: $14.99 once.',
    }[answers.weekly || answers.pay] || 'Trace is $14.99 once. Nothing renews.';
  }
  const shortPriceLine = () => (weeklyPrice() ? `Instead of ${money(yearly())} a year.`
    : { once: 'Pay once, like you prefer.', adds: 'No weekly fees.' }[answers.pay] || 'No subscription.');
  function renderForward() {
    $('forward-title').textContent = want().title;
    $('forward-line').textContent = priceLine();
    $('forward-price').textContent = shortPriceLine();
  }
  // How they move forward is their call, and it ends "About you" either way.
  const moveForward = how => { answers.done = true; saveAnswers(); track('TraceForward', how, { once: false }); };
  $('forward-try').addEventListener('click', () => { moveForward('try'); showStep('mine', { push: true }); });
  $('forward-pay').addEventListener('click', () => {
    moveForward('pay');
    checkout({ button: $('forward-pay'), idleText: 'This is for me: $14.99 once', error: $('forward-error') });
  });
  $('forward-look').addEventListener('click', () => { moveForward('look'); showStep('cards', { push: true }); });

  // ----- Your drawing: what matches their answer -----
  function renderMine() {
    const w = want();
    $('mine-title').textContent = w.pick;
    $('mine-grid').replaceChildren(...w.tiles.map(id => {
      const tile = tileFor(PICTURES.find(p => p.id === id));
      tile.addEventListener('click', () => { track('TraceSelected', 'mine', { once: false }); pickStarter(id); });
      return tile;
    }));
    $('mine-grid').hidden = !w.tiles.length;
    $('mine-photo').hidden = !w.photo; $('mine-photo-note').hidden = !w.photo;
    if (w.photo) $('mine-photo-label').textContent = w.photo;
    $('mine-type').hidden = !w.type;
    if (w.type) {
      $('mine-type-label').textContent = w.type;
      $('mine-ideas').replaceChildren(...w.ideas.map(text => {
        const idea = Object.assign(document.createElement('button'), { type: 'button', className: 'idea', textContent: text });
        idea.addEventListener('click', () => { $('mine-input').value = text; describe($('mine-input'), true); });
        return idea;
      }));
    }
  }
  $('mine-type').addEventListener('submit', event => { event.preventDefault(); describe($('mine-input'), true); });
  $('mine-photo').addEventListener('click', () => track('TraceSelected', 'mine-photo', { once: false }));
  $('mine-all').addEventListener('click', () => showStep('cards', { push: true }));

  // ----- A pick, read back -----
  // On the guided path a pick is read back first; elsewhere the camera opens.
  function choose(picture, guided) {
    if (!guided) return startTracing(picture);
    settleViewport();
    chosen = picture;
    $('review-img').src = picture.lines;
    $('review-name').textContent = picture.label;
    // After "About you" this is step 2 of 3; from the cards it's step 1 of 2.
    const about = !!answers.why;
    $('review-title').textContent = about ? 'Step 2 of 3 — Your drawing' : 'Step 1 of 2 — Your drawing';
    $('review-bar').style.width = about ? '92%' : '50%';
    showStep('review', { push: true });
  }
  // "Why we need your camera", with the set-up, right before iOS asks: like the
  // booking engine's "Why we need your card".
  $('review-go').addEventListener('click', () => {
    track('TraceReviewed', '', { once: false });
    $('why-free').textContent = unlocked() ? 'Yours for good. Trace anything.' : 'Free today. No card needed.';
    openSheet('camera-why');
  });
  for (const id of ['review-back', 'review-change']) $(id).addEventListener('click', () => history.back());
  $('why-go').addEventListener('click', () => { track('TraceCameraOk', '', { once: false }); closeSheets(); if (chosen) startTracing(chosen); });
  $('why-later').addEventListener('click', closeSheets);
  // Skip, under the big button: straight to the camera. iOS still asks, with the note.
  $('review-skip').addEventListener('click', () => { track('TraceSkipped', 'review', { once: false }); if (chosen) startTracing(chosen); });

  // ----- Picking a picture -----
  const grid = $('grid'), more = $('more-grid');
  const tileFor = picture => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tile'; button.dataset.id = picture.id;
    button.setAttribute('aria-label', `Trace the ${picture.label.toLowerCase()}`);
    const img = document.createElement('img'); img.src = `/trace/pictures/${picture.id}-t.webp`; img.alt = '';
    button.append(img);
    return button;
  };
  for (const picture of PICTURES) {
    const tile = tileFor(picture);
    tile.addEventListener('click', () => pickStarter(picture.id));
    grid.append(tile);
    // The first screen shows the dragon as its own card.
    if (picture.id === 'dragon') continue;
    const card = tileFor(picture);
    card.addEventListener('click', () => { track('TraceSelected', 'more', { once: false }); pickStarter(picture.id); });
    more.append(card);
  }
  $('select-dragon').addEventListener('click', () => { track('TraceSelected', 'dragon', { once: false }); pickStarter('dragon'); });
  const guidedStep = () => currentStep === 'cards' || currentStep === 'mine';
  function pickStarter(id) {
    const guided = guidedStep();
    track('TracePicked', 'starter', { once: false });
    const key = `starter:${id}`;
    if (!mayOpen(key)) return showPaywall('second');
    const picture = PICTURES.find(p => p.id === id);
    choose({ key, lines: `/trace/pictures/${id}.webp`, photo: '', kind: 'starter', label: picture ? picture.label : 'Your drawing' }, guided);
  }
  // "Anything You Type": Select opens the box on the card, like the booking
  // engine's calendar; an idea fills it and draws straight away.
  $('select-type').addEventListener('click', () => {
    track('TraceSelected', 'type', { once: false });
    $('select-type').hidden = true; $('select-type').setAttribute('aria-expanded', 'true');
    $('type-form').hidden = false;
    $('type-input').focus();
  });
  for (const idea of document.querySelectorAll('.idea')) idea.addEventListener('click', () => { $('type-input').value = idea.textContent; describe($('type-input'), true); });
  $('type-form').addEventListener('submit', event => { event.preventDefault(); describe($('type-input'), true); });
  $('select-photo').addEventListener('click', () => track('TraceSelected', 'photo', { once: false }));
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
  async function describe(input, guided) {
    const prompt = input.value.replace(/\s+/g, ' ').trim();
    if (prompt.length < 2) { input.focus(); return; }
    track('TraceAIAsked', '', { once: false });
    track('TracePicked', 'ai', { once: false });
    const key = `ai:${prompt.toLowerCase()}`;
    if (!mayOpen(key)) return showPaywall('second');
    input.blur();
    const label = prompt.charAt(0).toUpperCase() + prompt.slice(1);
    if (aiCache.has(key)) return choose({ key, lines: aiCache.get(key), photo: '', kind: 'ai', label }, guided);
    busy('Drawing your picture… about 10 seconds');
    try {
      const { image } = await api('/generate', { prompt, visitorId, ...(token ? { token } : {}) });
      const lines = await inkOnly(image);
      aiCache.set(key, lines);
      busy('');
      track('TraceAIShown');
      choose({ key, lines, photo: '', kind: 'ai', label }, guided);
    } catch (error) {
      busy('');
      if (error.status === 402) return showPaywall('ai');
      alert(error.message || "The drawing didn't come out. Please try again.");
    }
  }
  $('describe-form').addEventListener('submit', event => { event.preventDefault(); describe($('describe'), false); });

  async function ownPhoto(event) {
    const guided = event.target.id !== 'own';
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
      choose({ key, ...picture, kind: 'photo', label: 'Your photo' }, guided);
    } catch (error) {
      busy('');
      alert(error.message || 'That photo could not be opened. Try another one.');
    }
  }
  $('own').addEventListener('change', ownPhoto);
  $('own-cards').addEventListener('change', ownPhoto);
  $('own-mine').addEventListener('change', ownPhoto);

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
  // The cheer is for a real drawing: 30 seconds or more with the camera on.
  // Done before that (to see what's next) shows the offer without claiming a drawing.
  $('done').addEventListener('click', () => {
    track('TraceDone', '', { once: false });
    showHome();
    if (unlocked()) return;
    if (tracedMs >= 30000) {
      confetti();
      showPaywall('done', '🎉 You just traced your first drawing!');
    } else showPaywall('quick', 'Your free drawing is still here. Trace it anytime.');
  });

  // ----- Paying -----
  let paywallReason = '';
  function renderPaywall() {
    const buy = canBuy();
    for (const id of ['buy', 'pay-compare', 'pay-price', 'pay-sub', 'pay-perks', 'pay-fine']) $(id).hidden = !buy;
    // The comparison carries the price; the old big price line stays for no one.
    $('pay-price').hidden = true;
    $('pay-elsewhere').hidden = buy;
    $('pay-title').textContent = !buy ? 'That was your free drawing' : ['home', 'top', 'now'].includes(paywallReason) ? 'Unlock everything'
      : paywallReason === 'done' ? 'Keep drawing. Forever.' : paywallReason === 'quick' ? 'Trace anything. Forever.' : 'Keep tracing anything';
    // What they said about paying comes back here, in their own terms.
    $('pay-sub').textContent = weeklyPrice() ? `You pay ${money(weeklyPrice())} a week now (${money(yearly())} a year). Keep this forever for $14.99.`
      : { once: 'Pay once, like you prefer. Nothing renews.', adds: "Weekly fees add up. This doesn't: pay once, it's yours." }[answers.pay]
      || "No subscription. Nothing renews. Pay once, it's yours.";
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
  $('buy-top').addEventListener('click', () => showPaywall('top'));
  $('buy-now').addEventListener('click', () => showPaywall('now'));
  $('pay-later').addEventListener('click', () => { track('TracePaywallClosed', '', { once: false }); closeSheets(); });
  $('backdrop').addEventListener('click', () => { if (!$('paywall').hidden) track('TracePaywallClosed', '', { once: false }); closeSheets(); });
  // Forget any checkout still loading and put the Pay button back. A response
  // that arrives later sees a new generation and does nothing: no redirect, no event.
  function resetCheckout() {
    checkoutGeneration++;
    $('buy').disabled = false; $('buy').textContent = 'Unlock forever: $14.99';
    $('forward-pay').disabled = false; $('forward-pay').textContent = 'This is for me: $14.99 once';
    $('forward-error').hidden = true;
  }
  // `error` is the element that says what went wrong, next to the button tapped.
  async function checkout({ button, idleText, error }) {
    if (!canBuy()) return;
    const generation = checkoutGeneration;
    track('TraceCheckoutTapped', '', { once: false });
    button.disabled = true; button.textContent = 'Opening secure checkout…';
    error.hidden = true;
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
        button.disabled = false; button.textContent = idleText;
        closeSheets();
      } else location.href = url;
    } catch (failure) {
      if (generation !== checkoutGeneration) return;
      track('TraceCheckoutFailed', failure.status === 429 ? 'rate' : 'error', { once: false });
      button.disabled = false; button.textContent = idleText;
      error.textContent = failure.message; error.hidden = false;
    }
  }
  $('buy').addEventListener('click', () => checkout({ button: $('buy'), idleText: 'Unlock forever: $14.99', error: $('pay-error') }));
  // Coming back from Stripe with the browser's back button restores this page
  // from memory with the button still saying "Opening…".
  window.addEventListener('pageshow', event => { if (event.persisted) { resetCheckout(); busy(''); } });

  async function confirmPayment(sessionId) {
    store.set('trace.pending', sessionId);
    busy('Unlocking…');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await api('/unlock', { sessionId });
        token = result.token; store.set('trace.unlock', token); store.del('trace.pending');
        purchasePixel(sessionId);
        track('TraceUnlocked');
        busy('');
        $('welcome-title').textContent = 'You\'re in.';
        $('welcome-go').textContent = 'Pick a picture';
        $('welcome-body').textContent = result.email
          ? `Trace anything, for good. We emailed your receipt and a link that unlocks your other phones to ${result.email}.`
          : 'Trace anything, for good.';
        // Paid in Safari for the app: the way back in.
        $('welcome-app').hidden = !(params.get('app') === '1' && !inApp);
        showStep('pick'); renderHome();
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
      purchasePixel(pending);
      track('TraceUnlocked', inApp ? 'app' : 'return');
      showStep('pick'); renderHome();
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
      busy(''); showStep('pick'); renderHome();
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
      showStep('pick'); renderHome();
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
  showStep(homeStep());
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
