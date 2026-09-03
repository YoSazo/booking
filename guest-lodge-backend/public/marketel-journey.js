(function installMarketelJourney(window, document) {
  'use strict';

  if (window.MarketelJourney) return;

  var VERSION = '2.0.0';
  var VISITOR_KEY = 'marketelJourneyVisitorV1';
  var SESSION_KEY = 'marketelJourneySessionV1';
  var SESSION_STARTED_KEY = 'marketelJourneyStartedV1';
  var SEQUENCE_KEY = 'marketelJourneySequenceV1';
  var FIRST_TOUCH_KEY = 'marketelJourneyFirstTouchV1';
  var MAX_QUEUE = 100;
  var BATCH_SIZE = 20;
  var FLUSH_DELAY_MS = 650;
  var pageStartedAt = Date.now();
  var initialized = false;
  var listenersInstalled = false;
  var flushTimer = 0;
  var retryDelayMs = 1500;
  var queue = [];
  // Clarity and Smartlook already record interaction detail. Persist only the
  // rare failures that need engineering attention; commercial milestones use
  // the dedicated onboarding/reveal/checkout routes and remain authoritative.
  var PERSISTED_EVENT_NAMES = {
    JourneyClientError: true,
    JourneyCheckoutFailed: true,
  };
  var persistedThisSession = {};
  var config = {
    endpoint: '/api/funnel/journey',
    surface: 'unknown',
    setupToken: '',
    hotelId: '',
    context: {},
    headers: {},
    disabled: false,
  };

  function storageGet(storage, key) {
    try { return storage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function storageSet(storage, key, value) {
    try { storage.setItem(key, value); } catch (_) {}
  }

  function randomId(prefix) {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return prefix + window.crypto.randomUUID();
      }
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var bytes = new Uint32Array(4);
        window.crypto.getRandomValues(bytes);
        return prefix + Array.prototype.map.call(bytes, function (n) { return n.toString(36); }).join('');
      }
    } catch (_) {}
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  var visitorId = storageGet(window.localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = randomId('mjv_');
    storageSet(window.localStorage, VISITOR_KEY, visitorId);
  }

  var sessionId = storageGet(window.sessionStorage, SESSION_KEY);
  if (!sessionId) {
    sessionId = randomId('mjs_');
    storageSet(window.sessionStorage, SESSION_KEY, sessionId);
    storageSet(window.sessionStorage, SESSION_STARTED_KEY, String(Date.now()));
    storageSet(window.sessionStorage, SEQUENCE_KEY, '0');
  }
  var sessionStartedAt = Number(storageGet(window.sessionStorage, SESSION_STARTED_KEY)) || Date.now();
  var sequence = Number(storageGet(window.sessionStorage, SEQUENCE_KEY)) || 0;

  function nextSequence() {
    sequence += 1;
    storageSet(window.sessionStorage, SEQUENCE_KEY, String(sequence));
    return sequence;
  }

  function redactString(value, maxLength) {
    return String(value == null ? '' : value)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]')
      .slice(0, maxLength || 300);
  }

  function safeObject(input, depth) {
    if (depth > 3 || input == null) return input == null ? null : undefined;
    if (typeof input === 'boolean') return input;
    if (typeof input === 'number') return Number.isFinite(input) ? input : null;
    if (typeof input === 'string') return redactString(input, 300);
    if (Array.isArray(input)) {
      return input.slice(0, 20).map(function (item) { return safeObject(item, depth + 1); });
    }
    if (typeof input !== 'object') return undefined;
    var out = {};
    Object.keys(input).slice(0, 40).forEach(function (key) {
      if (/password|passcode|pin|token|secret|authorization|cookie|card|email|phone|message|filename|image(data|url)/i.test(key)) return;
      var cleanKey = String(key).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60);
      if (!cleanKey) return;
      var value = safeObject(input[key], depth + 1);
      if (value !== undefined) out[cleanKey] = value;
    });
    return out;
  }

  function sanitizedPath(value) {
    try {
      var url = new URL(value || window.location.href, window.location.origin);
      return url.pathname
        .replace(/\/setup\/[^/]+/i, '/setup/:token')
        .replace(/\/{2,}/g, '/')
        .slice(0, 240) || '/';
    } catch (_) {
      return '/';
    }
  }

  function safeReferrer() {
    if (!document.referrer) return '';
    try {
      var ref = new URL(document.referrer);
      return (ref.origin + sanitizedPath(ref.href)).slice(0, 300);
    } catch (_) {
      return '';
    }
  }

  function currentAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'angle'];
    var touch = {};
    keys.forEach(function (key) {
      var value = params.get(key);
      if (value) touch[key] = redactString(value, 180);
    });
    try {
      var cookies = String(document.cookie || '').split(';');
      cookies.forEach(function (part) {
        var pieces = part.trim().split('=');
        var name = pieces.shift();
        if (name === '_fbp') touch.fbp = redactString(decodeURIComponent(pieces.join('=')), 180);
        if (name === '_fbc') touch.fbc = redactString(decodeURIComponent(pieces.join('=')), 180);
      });
    } catch (_) {}
    if (safeReferrer()) touch.referrer = safeReferrer();
    return touch;
  }

  var firstTouch = {};
  try { firstTouch = JSON.parse(storageGet(window.localStorage, FIRST_TOUCH_KEY) || '{}') || {}; } catch (_) {}
  var latestTouch = currentAttribution();
  if (!Object.keys(firstTouch).length && Object.keys(latestTouch).length) {
    firstTouch = latestTouch;
    storageSet(window.localStorage, FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
  }

  function displayMode() {
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return 'native';
      if (new URLSearchParams(window.location.search).get('native')) return 'native';
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
      if (window.navigator.standalone) return 'standalone';
    } catch (_) {}
    return 'browser';
  }

  function commonMetadata() {
    var connection = window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection || {};
    return safeObject({
      trackerVersion: VERSION,
      pageTitle: document.title || '',
      referrer: safeReferrer(),
      firstTouch: firstTouch,
      latestTouch: latestTouch,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: window.screen && window.screen.width, height: window.screen && window.screen.height },
      devicePixelRatio: window.devicePixelRatio || 1,
      language: window.navigator.language || '',
      timezone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '',
      displayMode: displayMode(),
      online: window.navigator.onLine !== false,
      visibility: document.visibilityState || 'unknown',
      connection: {
        effectiveType: connection.effectiveType || '',
        downlink: Number(connection.downlink) || null,
        saveData: !!connection.saveData,
      },
      hardwareConcurrency: Number(window.navigator.hardwareConcurrency) || null,
      deviceMemory: Number(window.navigator.deviceMemory) || null,
      pageElapsedMs: Math.max(0, Date.now() - pageStartedAt),
      sessionElapsedMs: Math.max(0, Date.now() - sessionStartedAt),
      context: config.context || {},
    }, 0);
  }

  function eventRecord(eventName, metadata, options) {
    var seq = nextSequence();
    var detail = Object.assign({}, commonMetadata(), safeObject(metadata || {}, 0));
    return {
      eventName: String(eventName || '').slice(0, 80),
      eventId: 'journey.' + sessionId + '.' + seq,
      visitorId: visitorId,
      sessionId: sessionId,
      sequence: seq,
      surface: String(config.surface || 'unknown').slice(0, 40),
      pagePath: sanitizedPath(window.location.href),
      occurredAt: new Date().toISOString(),
      durationMs: options && Number.isFinite(Number(options.durationMs)) ? Math.max(0, Math.round(Number(options.durationMs))) : null,
      metadata: detail,
    };
  }

  function scheduleFlush() {
    if (flushTimer || config.disabled) return;
    flushTimer = window.setTimeout(function () {
      flushTimer = 0;
      flush(false);
    }, FLUSH_DELAY_MS);
  }

  function flush(keepalive) {
    if (config.disabled || !queue.length) return Promise.resolve({ skipped: true });
    if (flushTimer) {
      window.clearTimeout(flushTimer);
      flushTimer = 0;
    }
    var events = queue.splice(0, BATCH_SIZE);
    var headers = Object.assign({ 'Content-Type': 'application/json' }, config.headers || {});
    var payload = {
      setupToken: config.setupToken || undefined,
      hotelId: config.hotelId || undefined,
      events: events,
    };
    return window.fetch(config.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      keepalive: !!keepalive,
    }).then(function (response) {
      if (!response.ok) throw new Error('Journey tracking request failed');
      retryDelayMs = 1500;
      if (queue.length) scheduleFlush();
      return response;
    }).catch(function () {
      queue = events.concat(queue).slice(-MAX_QUEUE);
      if (!keepalive && !flushTimer) {
        flushTimer = window.setTimeout(function () {
          flushTimer = 0;
          flush(false);
        }, retryDelayMs);
        retryDelayMs = Math.min(30000, retryDelayMs * 2);
      }
      return { success: false };
    });
  }

  function track(eventName, metadata, options) {
    if (!initialized || config.disabled || !eventName) return null;
    if (!PERSISTED_EVENT_NAMES[eventName] || persistedThisSession[eventName]) return null;
    persistedThisSession[eventName] = true;
    var record = eventRecord(eventName, metadata, options || {});
    queue.push(record);
    if (queue.length > MAX_QUEUE) queue.shift();
    if (options && options.immediate) flush(!!options.keepalive);
    else if (queue.length >= BATCH_SIZE) flush(false);
    else scheduleFlush();
    return record.eventId;
  }

  function installListeners() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    window.addEventListener('error', function (event) {
      track('JourneyClientError', {
        kind: 'error',
        errorSummary: redactString(event.message || 'Unknown browser error', 260),
        sourcePath: sanitizedPath(event.filename || ''),
        line: Number(event.lineno) || null,
        column: Number(event.colno) || null,
      }, { immediate: true });
    });

    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || 'Unhandled rejection');
      track('JourneyClientError', { kind: 'unhandledrejection', errorSummary: redactString(reason, 260) }, { immediate: true });
    });
  }

  function init(options) {
    options = options || {};
    if (initialized) {
      configure(options);
      return api;
    }
    config = Object.assign({}, config, options);
    config.context = Object.assign({}, config.context || {}, options.context || {});
    var nativeMode = displayMode() === 'native';
    var localBrowser = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && !nativeMode;
    var debugEnabled = new URLSearchParams(window.location.search || '').get('analyticsDebug') === '1';
    config.disabled = options.disabled === true || (localBrowser && !debugEnabled);
    initialized = true;
    installListeners();
    return api;
  }

  function configure(options) {
    options = options || {};
    config = Object.assign({}, config, options);
    config.context = Object.assign({}, config.context || {}, options.context || {});
    return api;
  }

  function getContext() {
    return {
      visitorId: visitorId,
      sessionId: sessionId,
      sequence: sequence,
      sessionStartedAt: new Date(sessionStartedAt).toISOString(),
      firstTouch: firstTouch,
      latestTouch: latestTouch,
      surface: config.surface,
    };
  }

  function linkage() {
    var seq = nextSequence();
    return {
      journeyVisitorId: visitorId,
      journeySessionId: sessionId,
      journeySequence: seq,
      journeyEventId: 'journey-link.' + sessionId + '.' + seq,
      journeyOccurredAt: new Date().toISOString(),
      journeySurface: String(config.surface || 'unknown').slice(0, 40),
      journeyPagePath: sanitizedPath(window.location.href),
      // These contain only URL attribution fields and are sanitized again on
      // the server. Carrying them on the durable milestone request joins the
      // eventual paid property back to the exact ad URL even if the browser
      // journey batch is delayed or blocked.
      journeyFirstTouch: safeObject(firstTouch || {}, 0),
      journeyLatestTouch: safeObject(latestTouch || {}, 0),
    };
  }

  var api = {
    init: init,
    configure: configure,
    track: track,
    flush: function () { return flush(false); },
    getContext: getContext,
    linkage: linkage,
    version: VERSION,
  };
  window.MarketelJourney = api;
})(window, document);
