(function marketelSessionReplay(window, document) {
  'use strict';

  var hostname = String(window.location.hostname || '').toLowerCase();
  var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  var isNative = new URLSearchParams(window.location.search).has('native')
    || window.location.protocol === 'capacitor:'
    || window.location.protocol === 'ionic:'
    || (window.Capacitor
      && typeof window.Capacitor.isNativePlatform === 'function'
      && window.Capacitor.isNativePlatform());
  if (isLocal || isNative || window.__MARKETEL_SESSION_REPLAY_LOADED__) return;
  window.__MARKETEL_SESSION_REPLAY_LOADED__ = true;

  // Microsoft Clarity. The queue exists before the network script arrives, so
  // interactions at the beginning of the landing page are not lost.
  (function loadClarity(c, l, a, r, i, t, y) {
    c[a] = c[a] || function clarityQueue() {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'y93wrwbvgb');

  // Smartlook. Keep this in the same guarded loader as Clarity so route shells
  // and cached Front Desk documents can never initialize either recorder twice.
  window.smartlook || (function loadSmartlook(d) {
    var o = window.smartlook = function smartlookQueue() { o.api.push(arguments); };
    var h = d.getElementsByTagName('head')[0];
    var c = d.createElement('script');
    o.api = [];
    c.async = true;
    c.type = 'text/javascript';
    c.charset = 'utf-8';
    c.src = 'https://web-sdk.smartlook.com/recorder.js';
    h.appendChild(c);
  })(document);
  window.smartlook('init', 'd5c0866c4148f2c64d8e7a6a48c10cedeb8b3eb4', { region: 'eu' });
})(window, document);
