(function installMarketelJourney(window, document) {
  'use strict';

  if (window.MarketelJourney) return;

  var VERSION = '1.0.0';
  var VISITOR_KEY = 'marketelJourneyVisitorV1';
  var SESSION_KEY = 'marketelJourneySessionV1';
  var SESSION_STARTED_KEY = 'marketelJourneyStartedV1';
  var SEQUENCE_KEY = 'marketelJourneySequenceV1';
  var FIRST_TOUCH_KEY = 'marketelJourneyFirstTouchV1';
  var MAX_QUEUE = 100;
  var BATCH_SIZE = 20;
  var FLUSH_DELAY_MS = 650;
  var pageStartedAt = Date.now();
  var activeStartedAt = pageStartedAt;
  var hiddenStartedAt = 0;
  var hiddenTotalMs = 0;
  var maxScrollPercent = 0;
  var initialized = false;
  var listenersInstalled = false;
  var pageExitTracked = false;
  var flushTimer = 0;
  var retryDelayMs = 1500;
  var queue = [];
  var focusedFields = new WeakMap();
  var scrollMilestones = {};
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
    var record = eventRecord(eventName, metadata, options || {});
    queue.push(record);
    if (queue.length > MAX_QUEUE) queue.shift();
    if (options && options.immediate) flush(!!options.keepalive);
    else if (queue.length >= BATCH_SIZE) flush(false);
    else scheduleFlush();
    return record.eventId;
  }

  function fieldName(field) {
    return redactString(field.getAttribute('data-journey-field') || field.id || field.name || field.type || field.tagName.toLowerCase(), 80);
  }

  function fieldLengthBucket(field) {
    if (field.type === 'password') return 'excluded';
    var length = String(field.value || '').trim().length;
    if (!length) return 'empty';
    if (length <= 3) return '1-3';
    if (length <= 10) return '4-10';
    if (length <= 30) return '11-30';
    return '31+';
  }

  function controlMetadata(control) {
    var hrefPath = '';
    if (control.tagName === 'A' && control.getAttribute('href')) hrefPath = sanitizedPath(control.href);
    var action = control.getAttribute('data-journey') || control.id || '';
    if (!action) {
      action = Array.prototype.slice.call(control.classList || []).filter(function (name) {
        return /btn|cta|tab|link|choice|toggle|preview|install/i.test(name);
      }).slice(0, 3).join('.');
    }
    return {
      control: redactString(action || control.tagName.toLowerCase(), 100),
      tag: control.tagName.toLowerCase(),
      type: control.getAttribute('type') || '',
      destinationPath: hrefPath,
    };
  }

  function updateScrollDepth() {
    var root = document.documentElement;
    var maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
    var percent = maxScroll ? Math.min(100, Math.round((window.scrollY / maxScroll) * 100)) : 100;
    maxScrollPercent = Math.max(maxScrollPercent, percent);
    [25, 50, 75, 90, 100].forEach(function (milestone) {
      if (percent >= milestone && !scrollMilestones[milestone]) {
        scrollMilestones[milestone] = true;
        track('JourneyScrollDepth', { percent: milestone });
      }
    });
  }

  function capturePagePerformance() {
    window.setTimeout(function () {
      try {
        var navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        if (!navigation) return;
        track('JourneyPagePerformance', {
          ttfbMs: Math.round(navigation.responseStart),
          domInteractiveMs: Math.round(navigation.domInteractive),
          domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
          loadMs: Math.round(navigation.loadEventEnd || performance.now()),
          transferBytes: Number(navigation.transferSize) || null,
          encodedBytes: Number(navigation.encodedBodySize) || null,
        });
      } catch (_) {}
    }, 0);
  }

  function installListeners() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    document.addEventListener('click', function (event) {
      var control = event.target && event.target.closest && event.target.closest('button, a, [role="button"]');
      if (!control || control.closest('[data-journey-ignore]')) return;
      track('JourneyControlActivated', controlMetadata(control));
    }, true);

    document.addEventListener('focusin', function (event) {
      var field = event.target;
      if (!field || !/^(INPUT|SELECT|TEXTAREA)$/.test(field.tagName) || field.type === 'password') return;
      focusedFields.set(field, Date.now());
      track('JourneyFieldFocused', { field: fieldName(field), type: field.type || field.tagName.toLowerCase() });
    }, true);

    document.addEventListener('focusout', function (event) {
      var field = event.target;
      if (!field || !/^(INPUT|SELECT|TEXTAREA)$/.test(field.tagName) || field.type === 'password') return;
      var started = focusedFields.get(field) || Date.now();
      track('JourneyFieldCompleted', {
        field: fieldName(field),
        type: field.type || field.tagName.toLowerCase(),
        filled: String(field.value || '').trim().length > 0,
        lengthBucket: fieldLengthBucket(field),
      }, { durationMs: Date.now() - started });
      focusedFields.delete(field);
    }, true);

    var scrollScheduled = false;
    window.addEventListener('scroll', function () {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.requestAnimationFrame(function () {
        scrollScheduled = false;
        updateScrollDepth();
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        hiddenStartedAt = Date.now();
        track('JourneyVisibilityChanged', { state: 'hidden' });
      } else {
        var hiddenMs = hiddenStartedAt ? Date.now() - hiddenStartedAt : 0;
        hiddenTotalMs += hiddenMs;
        hiddenStartedAt = 0;
        activeStartedAt = Date.now();
        track('JourneyVisibilityChanged', { state: 'visible', hiddenMs: hiddenMs });
      }
    });

    window.addEventListener('online', function () { track('JourneyConnectivityChanged', { online: true }); });
    window.addEventListener('offline', function () { track('JourneyConnectivityChanged', { online: false }); });

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

    [10, 30, 60, 120, 300].forEach(function (seconds) {
      window.setTimeout(function () {
        if (!pageExitTracked) track('JourneyEngagementMilestone', { seconds: seconds, maxScrollPercent: maxScrollPercent });
      }, seconds * 1000);
    });

    if (document.readyState === 'complete') capturePagePerformance();
    else window.addEventListener('load', capturePagePerformance, { once: true });

    window.addEventListener('pagehide', function () {
      if (pageExitTracked) return;
      pageExitTracked = true;
      if (hiddenStartedAt) hiddenTotalMs += Date.now() - hiddenStartedAt;
      track('JourneyPageExited', {
        maxScrollPercent: maxScrollPercent,
        hiddenTotalMs: hiddenTotalMs,
        activeSinceLastVisibleMs: Math.max(0, Date.now() - activeStartedAt),
      }, { durationMs: Date.now() - pageStartedAt, immediate: true, keepalive: true });
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
    track('JourneyPageViewed', {
      entry: true,
      navigationType: (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type || '',
    }, { immediate: true });
    updateScrollDepth();
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
