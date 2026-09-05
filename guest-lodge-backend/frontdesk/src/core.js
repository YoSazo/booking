import { crm } from './state.js';
import QRCode from 'qrcode';
import guestelAppIconUrl from './assets/guestel-app-icon.png';

import { ensureLucideLoaded, isDeadBooking, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';
import { bindChatKeyboardViewport } from './chatKeyboard.js';

const MARKETEL_BACKEND_ORIGIN = 'https://guest-lodge-backend.onrender.com';
const isBundledNativeFrontdesk = window.location.protocol === 'capacitor:'
  || window.location.protocol === 'ionic:';
const marketelLocalUrlBase = isBundledNativeFrontdesk ? window.location.href : window.location.origin;
const FRONTDESK_STARTUP_TIMEOUT_MS = 8000;
const NATIVE_ONBOARDING_DONE_KEY = 'marketelNativeOnboardingV1Done';
const checkinQrDataUrlCache = new Map();

function createCheckinQrDataUrl(url) {
  const target = String(url || '').trim();
  if (!target) return Promise.resolve('');
  if (checkinQrDataUrlCache.has(target)) return checkinQrDataUrlCache.get(target);
  const pending = QRCode.toDataURL(target, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A0F0D', light: '#FFFFFF' },
  }).catch(error => {
    checkinQrDataUrlCache.delete(target);
    throw error;
  });
  checkinQrDataUrlCache.set(target, pending);
  return pending;
}

function warmGenericCheckinQr() {
  const url = buildGuestInstallUrlForQr('', 'frontdesk-qr-generic');
  if (url) createCheckinQrDataUrl(url).catch(() => {});
}

// The App Store build ships this JavaScript inside the IPA. Only API requests
// cross the network; rewriting them here keeps every existing feature module
// on the same authenticated backend without turning the app back into a remote
// website wrapper.
if (isBundledNativeFrontdesk) {
  const browserFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const rawUrl = input instanceof URL
        ? input.href
        : (typeof input === 'string' ? input : input?.url);
      const parsed = new URL(rawUrl, window.location.href);
      if (
        parsed.protocol === window.location.protocol
        && parsed.hostname === window.location.hostname
        && parsed.pathname.startsWith('/api/')
      ) {
        const backendUrl = new URL(parsed.pathname + parsed.search + parsed.hash, MARKETEL_BACKEND_ORIGIN);
        if (typeof input === 'string' || input instanceof URL) {
          return browserFetch(backendUrl.href, init);
        }
        return browserFetch(new Request(backendUrl.href, input), init);
      }
    } catch (_) {
      // Let the browser surface the original fetch error.
    }
    return browserFetch(input, init);
  };
}

async function fetchWithTimeout(input, init = {}, milliseconds = FRONTDESK_STARTUP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error('The server took too long to respond. Check your connection and try again.');
      timeoutError.status = 0;
      timeoutError.code = 'frontdesk_startup_timeout';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

let settingsModulePromise = null;
let appsModulePromise = null;
let assistantModulePromise = null;
let supportModulePromise = null;
let revealModulePromise = null;
let nativeOnboardingModulePromise = null;
let messagesLoadPromise = null;
let messagesKeyboardCleanup = null;
let growthLoadPromise = null;
let conflictsLoadPromise = null;
const WALKTHROUGH_STORAGE_KEYS = [
  'onboardingDone',
  'settingsTourDone',
  'settingsTourStep',
  'linkCopied',
  'ratesChanged',
  'appsTourDone',
  'postActivationTourDone',
];

export function loadSettingsModule() {
  if (!settingsModulePromise) {
    settingsModulePromise = import('./settings.js').then((m) => {
      m.install();
      return m;
    });
  }
  return settingsModulePromise;
}

export function loadAppsModule() {
  if (!appsModulePromise) {
    appsModulePromise = import('./apps.js').then((m) => {
      m.install();
      return m;
    });
  }
  return appsModulePromise;
}

export function loadAssistantModule() {
  if (!assistantModulePromise) {
    assistantModulePromise = import('./assistant.js').then((m) => {
      m.install();
      return m;
    });
  }
  return assistantModulePromise;
}

export function loadSupportModule() {
  if (!supportModulePromise) {
    supportModulePromise = import('./support.js').then((m) => {
      m.install();
      return m;
    });
  }
  return supportModulePromise;
}

function openMarketelSupport() {
  if (isNativeFrontdeskApp() && nativeShellPost({ type: 'openSupport' })) {
    return Promise.resolve();
  }
  return loadSupportModule()
    .then((module) => module.openSupportConversation())
    .catch((error) => {
      console.error('Unable to open Marketel support:', error);
      toast('Could not open support. Email support@bookmarketel.com.', 'error');
    });
}

function refreshSupportSummary() {
  return loadSupportModule()
    .then((module) => module.loadSupportSummary())
    .catch(() => {});
}

export function loadRevealModule() {
  if (!revealModulePromise) {
    revealModulePromise = import('./reveal.js').then((m) => {
      m.install();
      return m;
    });
  }
  return revealModulePromise;
}

export function loadNativeOnboardingModule() {
  if (!nativeOnboardingModulePromise) {
    nativeOnboardingModulePromise = import('./native-onboarding.js').then((m) => {
      m.install();
      return m;
    });
  }
  return nativeOnboardingModulePromise;
}

function resetWalkthroughProgress() {
  WALKTHROUGH_STORAGE_KEYS.forEach((k) => {
    try { localStorage.removeItem(k); } catch (_) {}
  });
}

function replayWalkthrough() {
  if (isNativeFrontdeskApp()) {
    loadNativeOnboardingModule()
      .then((module) => module.startNativeOnboarding({ replay: true }))
      .catch(() => toast('Could not open the Front Desk tour.', 'error'));
    return;
  }
  resetWalkthroughProgress();
  const u = new URL(window.location.href);
  u.searchParams.set('welcome', '1');
  u.searchParams.set('reveal', '1');
  u.searchParams.delete('tab');
  const next = u.pathname + u.search + u.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash) {
    window.location.reload();
    return;
  }
  window.location.assign(next);
}

// Internal funnel QA: a development master credential or an explicitly scoped
// dogfood property identifies our own session, so this shortcut never appears
// for a customer. Reload through the same URL contract used by setup.html
// instead of mounting the reveal ad hoc; that tests the real authentication,
// boot, data preload, and step-zero handoff together.
function replayValueReveal() {
  if (!(crm.isMasterPin || crm.isDogfoodPreview) || isNativeFrontdeskApp()) return;
  const u = new URL(window.location.href);
  u.searchParams.set('reveal', 'step-0');
  u.searchParams.delete('welcome');
  u.searchParams.delete('tab');
  u.searchParams.delete('checkoutCancelled');
  window.location.assign(u.pathname + u.search + u.hash);
}

function syncAdminReplayControl() {
  const button = document.getElementById('btnReplayReveal');
  if (!button) return;
  button.style.display = (crm.isMasterPin || crm.isDogfoodPreview) && !isNativeFrontdeskApp() ? '' : 'none';
}

// ── PWA INSTALL / NOTIFICATIONS STATE ──────────────────────────
// Captured as early as possible so the "Install Front Desk" button can fire the
// browser's native install prompt on Android/desktop.
const GUEST_BROADCAST_DEMO_VIDEO = 'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/v1781196304/ScreenRecording_06-11-2026_19-41-56_1_kjgudg.mp4';
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  crm.deferredInstallPrompt = e;
  try { refreshAppsInstallSection(); } catch (_) {}
});
window.addEventListener('appinstalled', () => {
  crm.frontdeskInstalled = true;
  crm.deferredInstallPrompt = null;
  try { reportFrontdeskInstalled(); } catch (_) {}
  try { refreshAppsInstallSection(); } catch (_) {}
});

function isIosDevice() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isNativeFrontdeskApp() {
  try {
    const nativeParam = new URLSearchParams(window.location.search || '').get('native');
    if (nativeParam === 'ios' || nativeParam === 'android') return true;
    if (isBundledNativeFrontdesk) return true;
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform());
  } catch (_) {
    return false;
  }
}
if (isNativeFrontdeskApp()) {
  document.documentElement.classList.add('native-ios');
  const markNativeBody = () => document.body && document.body.classList.add('native-ios');
  if (document.body) markNativeBody();
  else document.addEventListener('DOMContentLoaded', markNativeBody, { once: true });
  const rewriteNativeLegalLinks = () => {
    document.querySelectorAll('a[href="/privacy"],a[href="/terms"],a[href="/app-support"]').forEach(link => {
      const href = link.getAttribute('href');
      link.href = MARKETEL_BACKEND_ORIGIN + href;
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewriteNativeLegalLinks, { once: true });
  } else {
    rewriteNativeLegalLinks();
  }
}
// iOS 26+ Safari hides Share behind the "⋯" menu (Compact layout is the
// default) and tucks Add to Home Screen behind "View More". Apple froze the OS
// version in the UA, but Safari still reports its real major version via the
// "Version/26.x" token.
function isIos26Plus() {
  if (!isIosDevice()) return false;
  const m = (navigator.userAgent || '').match(/Version\/(\d+)/);
  return !!m && parseInt(m[1], 10) >= 26;
}
function isStandaloneApp() {
  try {
    const qs = new URLSearchParams(window.location.search);
    if (isNativeFrontdeskApp()) return true;
    if (qs.get('pwa') === '1') return true;
    if (qs.get('pwa') === '0') return false;
    if (sessionStorage.getItem('frontdeskSimulatePwa') === '1') return true;
  } catch (_) {}
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
}
function isPwaSimulated() {
  try {
    if (new URLSearchParams(window.location.search).get('pwa') === '1') return true;
    return sessionStorage.getItem('frontdeskSimulatePwa') === '1';
  } catch (_) {}
  return false;
}
function pushSupported() {
  return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
}

// Point the page's manifest at this hotel's dynamic Front Desk manifest so the
// installed app is branded as their hotel (name + icon). Also refresh the
// iOS-specific tags (apple-touch-icon + title) because iOS reads THOSE from the
// DOM at "Add to Home Screen" time and largely ignores manifest icons — and it
// only accepts PNG, never SVG, so a custom uploaded icon (photo/PNG) or our
// PNG fallback is what makes the home-screen icon render instead of blank.
function updateFrontdeskManifestLink() {
  if (!crm.activeHotelId) return;
  const link = document.querySelector('link[rel="manifest"]');
  if (link) {
    link.href = '/api/hotel/' + encodeURIComponent(crm.activeHotelId) + '/frontdesk-manifest.webmanifest';
  }
  try {
    // The Front Desk ALWAYS uses the Marketel logo — it's the owner's back-office
    // app and must look distinct from the hotel's guest booking engine (which uses
    // the custom uploaded icon). So we never swap in activeHotelAppIcon here.
    let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = '/apple-touch-icon.png';
    // Home-screen label should be short — just the hotel name (iOS shows the
    // app full-screen so "Front Desk" context is obvious once it's open).
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (titleMeta) titleMeta.content = crm.activeHotelName || 'Front Desk';
  } catch (_) {}
}
const FRONTDESK_AUTH_BUILD = 'stripe-return-bridge-2026-07-05';
function getFrontdeskCookie(name) {
  try {
    const prefix = `${name}=`;
    const parts = String(document.cookie || '').split(';');
    for (const part of parts) {
      const clean = part.trim();
      if (clean.startsWith(prefix)) return decodeURIComponent(clean.slice(prefix.length));
    }
  } catch (e) {}
  return '';
}
function frontdeskTokenKind(token) {
  const clean = String(token || '');
  if (!clean) return 'none';
  if (clean.startsWith('fds_')) return 'session';
  if (clean.startsWith('fdn_')) return 'native-session';
  return clean.startsWith('fd_') ? 'return-token' : 'pin';
}
function frontdeskAuthDebugEnabled() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return params.has('activated') || params.has('returnToken') || params.has('pin') || params.has('authReturn') ||
      sessionStorage.getItem('frontdeskAuthDebug') === '1';
  } catch (e) {
    return false;
  }
}
function logFrontdeskAuth(event, data = {}, level = 'info') {
  if (!frontdeskAuthDebugEnabled()) return;
  try {
    const fn = level === 'warn' ? console.warn : console.info;
    fn.call(console, `[FrontDesk auth] ${event}`, {
      build: FRONTDESK_AUTH_BUILD,
      ...data,
    });
  } catch (e) {}
}
try { crm.token = localStorage.getItem('crmToken') || ''; } catch(e) {}
try {
  const cookieToken = getFrontdeskCookie('frontdeskReturnToken');
  if (!crm.token && cookieToken && cookieToken.startsWith('fd_')) {
    crm.token = cookieToken;
  }
} catch (e) {}

// Auto-login from URL auth params. Setup can pass a real ?pin=, while Stripe
// returns with a signed fd_ token that is only a short-lived Front Desk session.
try {
  const _params = new URLSearchParams(window.location.search);
  const _urlPin = String(_params.get('pin') || '').trim();
  const _returnToken = String(_params.get('returnToken') || '').trim();
  const _stripeReturnToken = _returnToken.startsWith('fd_') ? _returnToken : (_urlPin.startsWith('fd_') ? _urlPin : '');
  const _cleanUrl = new URL(window.location);
  logFrontdeskAuth('url-auth-start', {
    hasStoredToken: !!crm.token,
    storedTokenKind: frontdeskTokenKind(crm.token),
    hasPinParam: !!_urlPin,
    pinParamKind: frontdeskTokenKind(_urlPin),
    hasReturnTokenParam: !!_returnToken,
    returnTokenParamKind: frontdeskTokenKind(_returnToken),
    selectedUrlTokenKind: frontdeskTokenKind(_stripeReturnToken),
  });

  if (_urlPin && !_urlPin.startsWith('fd_')) {
    crm.token = _urlPin;
    localStorage.setItem('crmToken', crm.token);
    _cleanUrl.searchParams.delete('pin');
    _cleanUrl.searchParams.delete('returnToken');
    window.history.replaceState({}, '', _cleanUrl);
  } else if (_stripeReturnToken) {
    crm.frontdeskReturnTokenPending = true;
    crm.token = _stripeReturnToken;
    localStorage.setItem('crmToken', crm.token);
  } else if (_returnToken) {
    _cleanUrl.searchParams.delete('returnToken');
    window.history.replaceState({}, '', _cleanUrl);
  }
  logFrontdeskAuth('url-auth-complete', {
    hasToken: !!crm.token,
    tokenKind: frontdeskTokenKind(crm.token),
    returnTokenPending: !!crm.frontdeskReturnTokenPending,
  });
} catch(e) {}

function cleanFrontdeskReturnAuthParams() {
  try {
    const cleanUrl = new URL(window.location);
    const pinParam = String(cleanUrl.searchParams.get('pin') || '').trim();
    let changed = false;
    if (pinParam.startsWith('fd_')) {
      cleanUrl.searchParams.delete('pin');
      changed = true;
    }
    if (cleanUrl.searchParams.has('returnToken')) {
      cleanUrl.searchParams.delete('returnToken');
      changed = true;
    }
    if (changed) window.history.replaceState({}, '', cleanUrl);
    crm.frontdeskReturnTokenPending = false;
  } catch (e) {}
}

// Auto-login from ?magic= token (magic link email)
try {
  const _magicToken = new URLSearchParams(window.location.search).get('magic');
  if (_magicToken) {
    crm._magicLoginPending = true;
    fetch('/api/auth/verify-magic?token=' + encodeURIComponent(_magicToken))
      .then(r => r.json())
      .then(data => {
        if (data.success && data.token) {
          crm.token = data.token;
          localStorage.setItem('crmToken', crm.token);
          if (isNativeFrontdeskApp() && data.hotelId) {
            localStorage.setItem(NATIVE_SELECTED_HOTEL_KEY, String(data.hotelId));
          }
          const _cleanUrl = new URL(window.location);
          _cleanUrl.searchParams.delete('magic');
          _cleanUrl.searchParams.delete('reveal');
          _cleanUrl.searchParams.delete('welcome');
          if (!data.subscribed) {
            const revealStep = Math.max(0, Math.min(3, Number(data.revealStep) || 0));
            _cleanUrl.searchParams.set('reveal', revealStep === 3 ? 'checkout' : `step-${revealStep}`);
          }
          window.history.replaceState({}, '', _cleanUrl);
          // Reload to trigger normal boot with the new token
          window.location.reload();
        } else {
          crm._magicLoginPending = false;
          alert('Login link expired or invalid. Please request a new one.');
          const _cleanUrl = new URL(window.location);
          _cleanUrl.searchParams.delete('magic');
          _cleanUrl.searchParams.delete('reveal');
          _cleanUrl.searchParams.delete('welcome');
          window.history.replaceState({}, '', _cleanUrl);
          bootCrmApp();
        }
      })
      .catch(() => {
        crm._magicLoginPending = false;
        const _cleanUrl = new URL(window.location);
        _cleanUrl.searchParams.delete('magic');
        _cleanUrl.searchParams.delete('reveal');
        _cleanUrl.searchParams.delete('welcome');
        window.history.replaceState({}, '', _cleanUrl);
        alert('We could not open that login link. Please request a new one.');
        bootCrmApp();
      });
  }
} catch(e) {}

function getContextParam(name) {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return String(params.get(name) || '').trim();
  } catch (e) {
    return '';
  }
}

function getDetectedHostname() {
  return (window.location && window.location.hostname) ? String(window.location.hostname).toLowerCase() : '';
}

const NATIVE_PROPERTIES_KEY = 'marketelNativeProperties';
const NATIVE_SELECTED_HOTEL_KEY = 'marketelNativeSelectedHotelId';

function normalizeNativeProperty(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || raw.hotelId || '').trim();
  if (!id) return null;
  return {
    id,
    name: String(raw.name || raw.hotelName || id).trim(),
    domain: String(raw.domain || '').trim(),
    appIconUrl: String(raw.appIconUrl || '').trim(),
  };
}

function getNativeProperties() {
  if (!isNativeFrontdeskApp()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(NATIVE_PROPERTIES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNativeProperty).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function saveNativeProperties(properties) {
  if (!isNativeFrontdeskApp()) return;
  const clean = (Array.isArray(properties) ? properties : [])
    .map(normalizeNativeProperty)
    .filter(Boolean);
  const byId = new Map();
  clean.forEach(property => byId.set(property.id, property));
  try { localStorage.setItem(NATIVE_PROPERTIES_KEY, JSON.stringify([...byId.values()])); } catch (_) {}
}

function getNativeSelectedHotelId() {
  if (!isNativeFrontdeskApp()) return '';
  try { return String(localStorage.getItem(NATIVE_SELECTED_HOTEL_KEY) || '').trim(); } catch (_) { return ''; }
}

function getRequestedHotelId() {
  return getContextParam('hotelId') || getNativeSelectedHotelId();
}

// The hotel a session belongs to only ever lived in the URL query string, so a
// navigation that dropped ?hotelId= made the next bootstrap ambiguous. The
// server then scoped the request purely by hostname, and a PIN whose grant
// depends on an explicit hotelId (dogfood/master) failed the host check with a
// 403 — which the client reads as "signed out". Remembering the resolved hotel
// keeps every request explicit, exactly as api() already does.
const CRM_HOTEL_ID_KEY = 'crmHotelId';

function getStoredCrmHotelId() {
  try { return String(localStorage.getItem(CRM_HOTEL_ID_KEY) || '').trim(); }
  catch (_) { return ''; }
}

function rememberCrmHotelId(hotelId) {
  const clean = String(hotelId || '').trim();
  try {
    if (clean) localStorage.setItem(CRM_HOTEL_ID_KEY, clean);
    else localStorage.removeItem(CRM_HOTEL_ID_KEY);
  } catch (_) { /* private mode: fall back to host scoping */ }
}

function nativeShellPost(message) {
  if (!isNativeFrontdeskApp()) return false;
  try {
    const handler = window.webkit?.messageHandlers?.marketelShell;
    if (!handler || typeof handler.postMessage !== 'function') return false;
    handler.postMessage(message || {});
    return true;
  } catch (_) {
    return false;
  }
}

function setNativeShellVisible(visible) {
  if (!isNativeFrontdeskApp()) return;
  document.body?.classList.toggle('native-shell-visible', !!visible);
  nativeShellPost({ type: 'visibility', visible: !!visible });
}

const nativeModalOwners = new Set();

function setNativeModalOpen(owner, open) {
  if (!isNativeFrontdeskApp()) return;
  const key = String(owner || 'modal');
  if (open) nativeModalOwners.add(key);
  else nativeModalOwners.delete(key);
  setNativeShellVisible(nativeModalOwners.size === 0);
  if (nativeModalOwners.size === 0) syncNativeShellState();
}

function openInAppBrowser(url) {
  const target = String(url || '').trim();
  if (!target) return false;
  if (nativeShellPost({ type: 'openBrowser', url: target })) return true;
  window.open(target, '_blank', 'noopener');
  return true;
}

function syncNativeShellState() {
  if (!isNativeFrontdeskApp()) return;
  const needsCalls = (crm.bookings || []).filter(b => b.callStatus === 'not-called').length;
  const unreadMessages = crm.guestMessages.length
    ? crm.guestMessages.filter(m => !m.read && (m.sender || 'guest') !== 'hotel').length
    : Number(crm.messageUnreadCount || 0);
  const trialing = crm.marketelSubscriptionStatus === 'trialing' || !!crm.trialStatus?.trialing;
  const explicitDaysLeft = Number(crm.trialStatus?.daysLeft);
  const trialEnd = new Date(crm.trialStatus?.endsAt || crm.marketelSubscriptionPeriodEnd || '');
  const calculatedDaysLeft = Number.isFinite(trialEnd.getTime())
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : Number(crm.marketelTrialDays) || 14;
  nativeShellPost({
    type: 'state',
    visible: document.getElementById('app')?.style.display !== 'none',
    hotelId: crm.activeHotelId || '',
    hotelName: crm.activeHotelName || 'Front Desk',
    selectedTab: crm.currentFilter === 'apps' ? 'apps'
      : crm.currentFilter === 'availability' ? 'availability'
      : (crm.currentFilter === 'bookings' || crm.currentFilter === 'revenue') ? 'bookings'
      : 'settings',
    bookingBadge: Math.max(0, needsCalls),
    guestAppBadge: Math.max(0, unreadMessages),
    trialing,
    trialDaysLeft: trialing
      ? Math.max(0, Number.isFinite(explicitDaysLeft) ? explicitDaysLeft : calculatedDaysLeft)
      : 0,
    trialEndsAt: trialing ? String(crm.trialStatus?.endsAt || crm.marketelSubscriptionPeriodEnd || '') : '',
    // The pill is drawn natively so it can use the same UIGlassEffect as the
    // tab bar; the web only decides whether it belongs on screen and what it
    // should say. A CSS pill could never match that material.
    assistantPill: crm.currentFilter === 'bookings' && crm.bookingsSubview === 'bookings' && !crm.settingsTourActive,
    assistantPillLabel: window.marketelAssistantPillLabel || 'Front Desk',
  });
}

function syncNativeAuthenticatedSession() {
  if (!isNativeFrontdeskApp() || !crm.activeHotelId || !crm.token || !crm.hotelSubscribed) return;
  nativeShellPost({
    type: 'authenticated',
    hotelId: crm.activeHotelId,
    hotelName: crm.activeHotelName || 'Front Desk',
    domain: crm.activeHotelDomain || '',
    authToken: crm.token,
    appIconUrl: crm.activeHotelAppIcon || '',
    guestelWalletImageUrl: crm.guestelWalletImageUrl || '',
    guestelWalletSubtitle: crm.guestelWalletSubtitle || '',
    isManualPms: !!crm.revenueEnabled,
    subscribed: true,
    deferNotifications: localStorage.getItem(NATIVE_ONBOARDING_DONE_KEY) !== '1',
  });
}

function setNativePropertyMessage(id, message, kind = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('is-error', kind === 'error');
  el.classList.toggle('is-success', kind === 'success');
}

function renderNativePropertyChoices() {
  const choices = document.getElementById('nativePropertyChoices');
  if (!choices) return;
  const selected = getNativeSelectedHotelId() || crm.activeHotelId;
  const properties = getNativeProperties();
  choices.innerHTML = properties.map(property => {
    const initial = esc((property.name || property.id).charAt(0).toUpperCase());
    const icon = property.appIconUrl
      ? `<img src="${esc(property.appIconUrl)}" alt="">`
      : initial;
    return `<button type="button" class="native-property-choice${property.id === selected ? ' is-active' : ''}" data-native-hotel-id="${esc(property.id)}">
      <span class="native-property-choice-icon">${icon}</span>
      <span class="native-property-choice-name">${esc(property.name || property.id)}</span>
      ${property.id === selected ? '<span class="native-property-choice-check">✓</span>' : '<span aria-hidden="true">›</span>'}
    </button>`;
  }).join('');
  choices.querySelectorAll('[data-native-hotel-id]').forEach(button => {
    button.addEventListener('click', () => selectNativeProperty(button.getAttribute('data-native-hotel-id')));
  });
}

function showNativePropertyScreen({ choose = false, allowCancel = false } = {}) {
  if (!isNativeFrontdeskApp()) return;
  setNativeShellVisible(false);
  const screen = document.getElementById('nativePropertyScreen');
  const signIn = document.getElementById('nativePropertySignIn');
  const pinLogin = document.getElementById('nativePinLogin');
  const list = document.getElementById('nativePropertyList');
  const cancel = document.getElementById('nativePropertyCancelBtn');
  if (!screen || !signIn || !pinLogin || !list) return;
  document.getElementById('bootScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  screen.style.display = 'flex';

  const canChoose = choose && getNativeProperties().length > 0;
  signIn.style.display = canChoose ? 'none' : 'block';
  pinLogin.style.display = 'none';
  list.style.display = canChoose ? 'block' : 'none';
  if (cancel) cancel.style.display = allowCancel ? 'block' : 'none';
  if (canChoose) renderNativePropertyChoices();
}

function hideNativePropertyScreen() {
  const screen = document.getElementById('nativePropertyScreen');
  if (screen) screen.style.display = 'none';
}

function selectNativeProperty(hotelId) {
  const cleanHotelId = String(hotelId || '').trim();
  if (!cleanHotelId) return;
  try { localStorage.setItem(NATIVE_SELECTED_HOTEL_KEY, cleanHotelId); } catch (_) {}
  const url = new URL(window.location.href);
  url.searchParams.set('hotelId', cleanHotelId);
  url.searchParams.set('native', 'ios');
  url.searchParams.delete('welcome');
  window.location.assign(url.toString());
}

function showNativePropertyPicker() {
  if (!isNativeFrontdeskApp()) return;
  if (!getNativeProperties().length) {
    showNativePropertyScreen({ choose: false, allowCancel: true });
    return;
  }
  showNativePropertyScreen({ choose: true, allowCancel: true });
}

function cancelNativePropertyPicker() {
  if (!crm.activeHotelId) return;
  hideNativePropertyScreen();
  document.getElementById('app').style.display = 'block';
  setNativeShellVisible(true);
  syncNativeShellState();
}

function resetNativeSignIn() {
  const screen = document.getElementById('nativePropertyScreen');
  if (!screen || screen.style.display === 'none') showNativePropertyScreen();
  document.getElementById('nativePropertySignIn').style.display = 'block';
  document.getElementById('nativePinLogin').style.display = 'none';
  document.getElementById('nativePropertyList').style.display = 'none';
  document.getElementById('nativeCodeStep').style.display = 'none';
  setNativePropertyMessage('nativePropertyMessage', '');
  setNativePropertyMessage('nativePinMessage', '');
}

async function requestNativeLoginCode() {
  const emailInput = document.getElementById('nativePropertyEmail');
  const button = document.getElementById('nativeCodeRequestBtn');
  const email = String(emailInput?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    setNativePropertyMessage('nativePropertyMessage', 'Enter the email used for your property.', 'error');
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'Sending…'; }
  setNativePropertyMessage('nativePropertyMessage', '');
  try {
    const res = await fetch('/api/auth/native-code/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not send the code.');
    document.getElementById('nativeCodeStep').style.display = 'block';
    setNativePropertyMessage('nativePropertyMessage', 'Check your email for the six-digit code.', 'success');
    document.getElementById('nativePropertyCode')?.focus();
  } catch (error) {
    setNativePropertyMessage('nativePropertyMessage', error.message || 'Could not send the code.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Email me a code'; }
  }
}

async function verifyNativeLoginCode() {
  if (verifyNativeLoginCode.inFlight) return;
  const email = String(document.getElementById('nativePropertyEmail')?.value || '').trim().toLowerCase();
  const code = String(document.getElementById('nativePropertyCode')?.value || '').replace(/\D/g, '').slice(0, 6);
  const button = document.getElementById('nativeCodeVerifyBtn');
  if (code.length !== 6) {
    setNativePropertyMessage('nativePropertyMessage', 'Enter the six-digit code.', 'error');
    return;
  }
  verifyNativeLoginCode.inFlight = true;
  if (button) { button.disabled = true; button.textContent = 'Checking…'; }
  try {
    const res = await fetch('/api/auth/native-code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.sessionToken) {
      throw new Error(data.message || 'That code is invalid or expired.');
    }
    crm.token = String(data.sessionToken);
    localStorage.setItem('crmToken', crm.token);
    saveNativeProperties(data.properties || []);
    const properties = getNativeProperties();
    if (!properties.length) throw new Error('No active properties were found for this account.');
    if (properties.length === 1) selectNativeProperty(properties[0].id);
    else {
      document.getElementById('nativePropertySignIn').style.display = 'none';
      document.getElementById('nativePropertyList').style.display = 'block';
      renderNativePropertyChoices();
    }
  } catch (error) {
    setNativePropertyMessage('nativePropertyMessage', error.message || 'That code is invalid or expired.', 'error');
  } finally {
    verifyNativeLoginCode.inFlight = false;
    if (button) { button.disabled = false; button.textContent = 'Continue'; }
  }
}

async function nativePinLogin() {
  const hotelId = String(document.getElementById('nativePropertyId')?.value || '').trim();
  const pin = String(document.getElementById('nativePropertyPin')?.value || '').trim();
  const button = document.getElementById('nativePinLoginBtn');
  if (!hotelId || !pin) {
    setNativePropertyMessage('nativePinMessage', 'Enter both the property ID and PIN.', 'error');
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'Opening…'; }
  try {
    const contextRes = await fetch('/api/hotel-context?hotelId=' + encodeURIComponent(hotelId), {
      headers: { Accept: 'application/json' },
    });
    const contextJson = await contextRes.json().catch(() => ({}));
    if (!contextRes.ok || !contextJson.success) throw new Error(contextJson.message || 'Property not found.');
    const verifyRes = await fetch('/api/crm/verify?hotelId=' + encodeURIComponent(hotelId), {
      headers: {
        'x-crm-token': pin,
        'x-marketel-client': 'ios',
        Accept: 'application/json',
      },
    });
    const verification = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verification.success) throw new Error(verification.message || 'Wrong property ID or PIN.');
    if (!verification.subscribed && !verification.nativePreviewAccess) {
      throw new Error('This property does not currently have Front Desk app access.');
    }
    crm.token = pin;
    localStorage.setItem('crmToken', crm.token);
    const config = contextJson.data?.config || {};
    const currentProperty = {
      id: hotelId,
      name: config.name || verification.hotelName || hotelId,
      domain: verification.domain || contextJson.data?.domain || '',
      appIconUrl: config.appIconUrl || verification.appIconUrl || '',
    };
    let availableProperties = [...getNativeProperties(), currentProperty];
    try {
      const propertiesRes = await fetch('/api/crm/properties?hotelId=' + encodeURIComponent(hotelId), {
        headers: {
          'x-crm-token': pin,
          'x-marketel-client': 'ios',
          Accept: 'application/json',
        },
      });
      const propertiesJson = await propertiesRes.json().catch(() => ({}));
      if (propertiesRes.ok && propertiesJson.success && Array.isArray(propertiesJson.properties)) {
        availableProperties = propertiesJson.properties;
      }
    } catch (_) {}
    saveNativeProperties(availableProperties);
    selectNativeProperty(hotelId);
  } catch (error) {
    setNativePropertyMessage('nativePinMessage', error.message || 'Could not open this property.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Open Front Desk'; }
  }
}

function nativeSignOut() {
  nativeShellPost({ type: 'signedOut' });
  // Retire any Lock Screen card before the session goes: a card that outlives
  // sign-out would offer a decision this device may no longer make.
  import('./live-activity.js')
    .then(module => module.clearLiveActivityCredentials())
    .catch(() => {});
  crm.token = '';
  try {
    localStorage.removeItem('crmToken');
    localStorage.removeItem(NATIVE_PROPERTIES_KEY);
    localStorage.removeItem(NATIVE_SELECTED_HOTEL_KEY);
  } catch (_) {}
  const url = new URL(window.location.href);
  url.searchParams.delete('hotelId');
  url.searchParams.set('native', 'ios');
  window.history.replaceState({}, '', url);
  resetNativeSignIn();
}

function marketelNativeSelectTab(filter) {
  // Keep "revenue" for older dogfood shells; setFilter maps it into Bookings.
  const allowed = ['settings', 'bookings', 'availability', 'revenue', 'apps'];
  if (!allowed.includes(filter)) return;
  setFilter(filter, document.querySelector(`.tab[data-nav-filter="${filter}"]`));
}

function marketelNativeSwitchProperty(hotelId) {
  selectNativeProperty(hotelId);
}

function marketelNativeAction(action) {
  if (action === 'qr') showCheckinQrOverlay();
  else if (action === 'refresh') refreshCurrentView({ force: true, visibleOnly: false });
  else if (action === 'browserClosed') {
    // Stripe changes happen outside the WKWebView. Reconcile both the billing
    // badge/card and visible property data as soon as Safari closes.
    void Promise.allSettled([
      loadMarketelTrialStatus(),
      refreshCurrentView({ force: true, visibleOnly: false }),
    ]);
  }
  else if (action === 'tour') replayWalkthrough();
  else if (action === 'assistant') {
    if (!nativeShellPost({ type: 'openAssistant' })) {
      // Older installed shells retain the web modal fallback.
      setNativeShellVisible(false);
      loadAssistantModule().then((module) => module.openFrontDeskAssistant()).catch(() => {
        setNativeShellVisible(true);
        toast('Could not open Front Desk Assistant.', 'error');
      });
    }
  }
  else if (action === 'support') {
    if (!nativeShellPost({ type: 'openSupport' })) {
      setNativeShellVisible(false);
      loadSupportModule().then((module) => module.openSupportConversation()).catch(() => {
        setNativeShellVisible(true);
        toast('Could not open support. Email support@bookmarketel.com.', 'error');
      });
    }
  }
  else if (action === 'properties') showNativePropertyPicker();
  else if (action === 'account') {
    const settingsButton = document.querySelector('.tab[data-nav-filter="settings"]');
    setFilter('settings', settingsButton);
    let attempts = 0;
    const revealAccount = setInterval(() => {
      attempts += 1;
      const accountCard = document.getElementById('privacyAccountCard');
      if (accountCard || attempts >= 30) {
        clearInterval(revealAccount);
        accountCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  else if (action === 'signout') nativeSignOut();
}

function openNativeNotificationSettings() {
  nativeShellPost({ type: 'notificationSettings' });
}

function marketelNativeNotificationState(state) {
  crm.nativeNotificationState = String(state || '');
  if (document.getElementById('frontDeskAssistantOverlay')) {
    loadAssistantModule()
      .then(module => module.refreshFrontDeskAssistantSheet?.())
      .catch(() => {});
  }
  if (crm.currentFilter === 'apps') {
    loadAppsModule()
      .then(module => module.ensureAppsViewRendered(true))
      .catch(() => {});
  }
}

async function refreshNativeProperties() {
  if (!isNativeFrontdeskApp() || !crm.token || !crm.activeHotelId) return;
  try {
    const data = await api('GET', '/api/crm/properties');
    if (data?.success && Array.isArray(data.properties) && data.properties.length) {
      saveNativeProperties(data.properties);
    }
  } catch (_) {
    // Property switching is convenience UI. A temporary failure must never
    // block the active Front Desk session.
  }
}

function setNotificationButtonState(enabled) {
  const btn = document.getElementById('btnNotify');
  if (!btn) return;
  btn.classList.toggle('notify-on', !!enabled);
  btn.classList.toggle('notify-off', !enabled);
  btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  btn.textContent = enabled ? 'Notifications: On' : 'Notifications: Off';
}

async function syncNotificationButtonState() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    setNotificationButtonState(false);
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const enabled = Notification.permission === 'granted' && !!sub;
    setNotificationButtonState(enabled);
  } catch (e) {
    setNotificationButtonState(false);
  }
}

function resolveLegacyCrmHotelId() {
  const overrideHotelId = getRequestedHotelId();
  if (overrideHotelId) return overrideHotelId;
  // A native app has no property-specific hostname. Never silently open a
  // client property just because the app is hosted on Render.
  if (isNativeFrontdeskApp()) return '';

  const host = getDetectedHostname();
  if (host && crm.CRM_HOTEL_BY_HOST[host]) return crm.CRM_HOTEL_BY_HOST[host];
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.onrender.com') || host.endsWith('.vercel.app')) {
    return 'guest-lodge-minot';
  }
  return '';
}

function applyLegacyHotelContext(hotelId, reason = '') {
  const cleanHotelId = String(hotelId || '').trim();
  if (!cleanHotelId) return false;
  crm.activeHotelId = cleanHotelId;
  crm.activeHotelName = crm.CRM_HOTEL_LABELS[cleanHotelId] || cleanHotelId;
  crm.activeHotelDomain = getDetectedHostname();
  crm.activeHotelContext = {
    hotelId: cleanHotelId,
    domain: crm.activeHotelDomain || '',
    config: {
      id: cleanHotelId,
      name: crm.activeHotelName,
      source: 'legacy-fallback',
    },
  };
  updateHotelChrome();
  warmGenericCheckinQr();
  if (reason && window.console && typeof window.console.warn === 'function') {
    window.console.warn('Falling back to legacy CRM hotel resolution.', { hotelId: cleanHotelId, reason });
  }
  return true;
}

function buildHotelContextUrl() {
  const url = new URL('/api/hotel-context', marketelLocalUrlBase);
  const overrideHotelId = getRequestedHotelId();
  const overrideDomain = getContextParam('domain');
  if (overrideHotelId) url.searchParams.set('hotelId', overrideHotelId);
  // Always pass the current hostname so the backend can resolve the hotel
  // even if x-forwarded-host is not set by the proxy
  const domain = overrideDomain || getDetectedHostname();
  if (domain) url.searchParams.set('domain', domain);
  return url.toString();
}

function updateHotelChrome() {
  const label = crm.activeHotelName ? `Front Desk · ${crm.activeHotelName}` : 'Front Desk';
  const headerSuffix = document.querySelector('.header-logo-suffix');
  if (headerSuffix) headerSuffix.textContent = label;
  // D21: hotel name leads the login screen; "Front Desk · staff login" is the
  // descriptor; Marketel sits in the footer.
  const loginName = document.getElementById('loginHotelName');
  const loginDescriptor = document.getElementById('loginDescriptor');
  if (loginName) loginName.textContent = crm.activeHotelName || 'Front Desk';
  if (loginDescriptor) {
    loginDescriptor.textContent = crm.activeHotelName ? 'Front Desk · staff login' : 'Staff login';
  }
  const loginIcon = document.getElementById('loginHotelIcon');
  if (loginIcon) {
    if (crm.activeHotelAppIcon) {
      loginIcon.innerHTML = `<img src="${crm.activeHotelAppIcon}" alt="">`;
      loginIcon.style.display = 'flex';
    } else if (crm.activeHotelName) {
      loginIcon.innerHTML = `<span>${esc(crm.activeHotelName.trim().charAt(0).toUpperCase())}</span>`;
      loginIcon.style.display = 'flex';
    } else {
      loginIcon.style.display = 'none';
    }
  }
  document.title = crm.activeHotelName ? `${crm.activeHotelName} · Front Desk` : 'Front Desk · Marketel';
  updateFrontdeskManifestLink();
  syncNativeShellState();
}

function showBootState({ title, message, debug = '', showRetry = false } = {}) {
  hideNativePropertyScreen();
  setNativeShellVisible(false);
  document.getElementById('bootScreen').style.display = 'flex';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bootTitle').textContent = title || 'Connecting to property...';
  document.getElementById('bootMessage').textContent = message || 'Checking this domain and loading front desk context.';
  const debugEl = document.getElementById('bootDebug');
  debugEl.textContent = debug || '';
  debugEl.style.display = debug ? 'block' : 'none';
  document.getElementById('bootSpinnerWrap').style.display = showRetry ? 'none' : 'flex';
  document.getElementById('bootRetryBtn').style.display = showRetry ? 'block' : 'none';
}

// The reveal is a full-screen takeover of a product the owner has not been
// introduced to yet, so letting the Front Desk shell paint first flashes a UI
// that means nothing to them. The boot screen stays over the shell until the
// reveal is mounted and hands straight over to it.
function holdBootScreenForReveal() {
  document.getElementById('bootScreen')?.classList.add('is-holding-for-reveal');
}

function releaseBootScreenHold() {
  const boot = document.getElementById('bootScreen');
  if (!boot) return;
  boot.classList.remove('is-holding-for-reveal');
  boot.style.display = 'none';
}

function formatContextDebugLines(lines) {
  return lines.filter(Boolean).join('\n');
}

function showHotelContextError(error) {
  const status = Number(error && error.status) || 0;
  const host = getDetectedHostname() || 'unknown';
  const domain = (error && error.domain) ? String(error.domain) : '';
  const message = (error && error.message) ? String(error.message) : 'Could not load property context.';
  const debug = formatContextDebugLines([
    `Detected host: ${host}`,
    domain && domain !== host ? `Resolved domain: ${domain}` : '',
    crm.activeHotelId ? `Property ID: ${crm.activeHotelId}` : '',
  ]);

  if (!status) {
    showBootState({
      title: 'Network error',
      message: 'Could not reach the server to resolve this property. Check the network connection and try again.',
      debug,
      showRetry: true,
    });
    return;
  }

  showBootState({
    title: status === 404 ? 'Property not linked'
      : status === 403 ? 'Property inactive'
      : 'Property context error',
    message,
    debug,
    showRetry: true,
  });
}

function applyHotelContextData(data = {}) {
  const config = data.config || {};
  if (!data.hotelId) {
    const err = new Error('Property context response is missing hotelId.');
    err.status = 500;
    throw err;
  }

  crm.activeHotelId = String(data.hotelId || '').trim();
  rememberCrmHotelId(crm.activeHotelId);
  // Lazy so the web build never pays for native-only code.
  if (isNativeFrontdeskApp()) {
    import('./live-activity.js')
      .then(module => module.initLiveActivities())
      .catch(() => {});
  }
  crm.activeHotelName = String(config.name || data.hotelId || '').trim();
  crm.activeHotelAppIcon = String(config.appIconUrl || '').trim();
  crm.guestelWalletImageUrl = String(config.guestelWalletImageUrl || '').trim();
  crm.guestelWalletFallbackImageUrl = String(config.guestelWalletFallbackImageUrl || '').trim();
  crm.guestelWalletSubtitle = String(config.guestelWalletSubtitle || '').trim();
  const nativeStoredProperty = isNativeFrontdeskApp()
    ? getNativeProperties().find(property => property.id === crm.activeHotelId)
    : null;
  crm.activeHotelDomain = String(
    nativeStoredProperty?.domain || data.domain || getDetectedHostname() || ''
  ).trim();
  crm.activeHotelContext = data;
  if (isNativeFrontdeskApp()) {
    try { localStorage.setItem(NATIVE_SELECTED_HOTEL_KEY, crm.activeHotelId); } catch (_) {}
    saveNativeProperties([
      ...getNativeProperties(),
      {
        id: crm.activeHotelId,
        name: crm.activeHotelName,
        domain: crm.activeHotelDomain,
        appIconUrl: crm.activeHotelAppIcon,
      },
    ]);
  }
  updateHotelChrome();
  warmGenericCheckinQr();
  return data;
}

async function loadHotelContext() {
  const res = await fetchWithTimeout(buildHotelContextUrl(), {
    headers: { 'Accept': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || `Failed to load property context (${res.status})`);
    err.status = res.status;
    err.domain = (json && json.domain) || getDetectedHostname();
    throw err;
  }
  return applyHotelContextData(json.data || {});
}

async function loadCrmBootstrap() {
  const url = new URL('/api/crm/bootstrap', marketelLocalUrlBase);
  const requestedHotelId = getRequestedHotelId() || getStoredCrmHotelId();
  if (requestedHotelId) url.searchParams.set('hotelId', requestedHotelId);
  const res = await fetchWithTimeout(url.pathname + url.search, {
    headers: {
      'Accept': 'application/json',
      'x-crm-token': crm.token,
      ...(isNativeFrontdeskApp() ? { 'x-marketel-client': 'ios' } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data?.verification) {
    const err = new Error(json.message || json.error || `Could not start Front Desk (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = json.data;
  applyHotelContextData(data.context || {});
  crm.bookings = Array.isArray(data.bookings) ? data.bookings : [];
  crm.manualAvailability = data.manualAvailability || { rooms: [], overrides: {} };
  if (!Array.isArray(crm.manualAvailability.rooms)) crm.manualAvailability.rooms = [];
  if (!crm.manualAvailability.overrides || typeof crm.manualAvailability.overrides !== 'object') {
    crm.manualAvailability.overrides = {};
  }
  if (!crm.manualSelectedRoom && crm.manualAvailability.rooms.length) {
    crm.manualSelectedRoom = crm.manualAvailability.rooms[0].name;
  }
  const needsCalls = crm.bookings.filter(booking => booking.callStatus === 'not-called');
  const statEl = document.getElementById('statCount');
  if (statEl) statEl.textContent = needsCalls.length;
  updateBookingsTabBadge();
  refreshRoomBadge();
  return data.verification;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsStr(s) {
  return String(s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'\\r').replace(/\n/g,'\\n');
}

function guestBookingEngineUrl(options = {}) {
  const host = window.location.hostname;
  const isLocal = !isNativeFrontdeskApp() && (
    host === 'localhost'
      || host === '127.0.0.1'
      || host === '0.0.0.0'
      || host === '::1'
      || host.endsWith('.local')
      || /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
  const focusInstall = !!options.focusInstall;
  let url = '';

  if (isLocal && crm.activeHotelId) {
    const localUrl = new URL(window.location.href);
    localUrl.port = '5173';
    localUrl.pathname = '/';
    localUrl.search = '';
    localUrl.hash = '';
    localUrl.searchParams.set('hotelId', crm.activeHotelId);
    url = localUrl.toString();
  } else {
    const domain = crm.activeHotelDomain || '';
    url = domain ? 'https://' + domain + '/' : '';
  }

  if (url && focusInstall) {
    url += (url.includes('?') ? '&' : '?') + 'scroll=install';
  }

  return url;
}

function openGuestBookingEngine(options = {}) {
  const url = guestBookingEngineUrl(options);
  if (!url) {
    toast('Your booking domain is still setting up.', 'info');
    return;
  }
  openInAppBrowser(url);
}

function toIsoDate(dateLike) {
  if (!dateLike) return '';
  if (typeof dateLike === 'string' && dateLike.length >= 10) {
    if (dateLike.includes('T')) return dateLike.split('T')[0];
    return dateLike.slice(0, 10);
  }
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  // Ensure we use the local date values to prevent UTC-shifting the day
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function enumerateDates(startIso, endIso, maxDays = 180) {
  if (!startIso || !endIso || endIso < startIso) return [];
  const out = [];
  let cursor = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  while (cursor <= end && out.length < maxDays) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return out;
}

const AVAIL_DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const AVAIL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrencyCompact(value) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const compact = (amount / 1000).toFixed(abs >= 100000 ? 0 : 1).replace(/\.0$/, '');
    return `$${compact}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function syncRevenueUi() {
  const existingView = document.getElementById('revenueView');

  if (!crm.revenueEnabled) {
    if (existingView) existingView.remove();
    if (crm.bookingsSubview === 'revenue') crm.bookingsSubview = 'bookings';
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) moveSlider(activeTab);
    syncMobileNavActive(crm.currentFilter);
    return;
  }

  const container = document.querySelector('.container');
  if (container && !existingView) {
    container.insertAdjacentHTML('beforeend', `
      <div id="revenueView" class="revenue-view" style="display:none">
        <div class="revenue-wrap">
          <div class="revenue-period-bar" id="revenuePeriodBar">
            <button type="button" class="revenue-period-btn" data-period="today">Today</button>
            <button type="button" class="revenue-period-btn" data-period="7d">7 days</button>
            <button type="button" class="revenue-period-btn active" data-period="30d">30 days</button>
            <button type="button" class="revenue-period-btn" data-period="all">All time</button>
            <button type="button" class="revenue-period-btn" data-period="custom">Custom</button>
          </div>
          <div class="revenue-custom-range" id="revenueCustomRange" style="display:none">
            <label class="revenue-custom-field">
              <span>From</span>
              <input type="date" id="revenueCustomStart">
            </label>
            <label class="revenue-custom-field">
              <span>To</span>
              <input type="date" id="revenueCustomEnd">
            </label>
            <button type="button" class="revenue-custom-apply" id="revenueCustomApply">View revenue</button>
          </div>
          <div class="revenue-subhint" id="revenueSubhint">Last 30 days · check-in dates</div>
          <div id="revenueStatus"></div>
          <div id="revenueContent" style="display:none">
            <div class="revenue-savings-pill">
              <div class="revenue-savings-copy" id="revenueSavingsCopy">Est. OTA fees avoided today</div>
              <div class="revenue-savings-value" id="revenueKpiSaved">$0</div>
            </div>
            <div class="revenue-grid">
              <div class="revenue-card">
                <div class="revenue-label">Booked revenue</div>
                <div class="revenue-value" id="revenueKpiRev">$0</div>
              </div>
              <div class="revenue-card">
                <div class="revenue-label">Bookings</div>
                <div class="revenue-value" id="revenueKpiBookings">0</div>
              </div>
            </div>
            <div class="revenue-loop-card">
              <div class="revenue-list-title">The Guestel loop</div>
              <div class="revenue-loop-row"><span>Repeat guests</span><b id="revenueKpiRepeat">0</b></div>
              <div class="revenue-loop-row"><span>Booked via Guestel</span><b id="revenueKpiGuestel">0</b></div>
              <div class="revenue-loop-row"><span>Offer redemptions</span><b id="revenueKpiOffers">0</b></div>
            </div>
            <div class="revenue-bottom-grid">
              <div class="revenue-list-card">
                <div class="revenue-list-title">By room type</div>
                <div id="revenueRoomList"></div>
              </div>
            </div>
            <div style="margin-top:14px;padding:14px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;" id="paymentsExplainer">
              <div style="font-size:13px;font-weight:600;color:#166534;margin-bottom:6px;">How payments work</div>
              <p style="font-size:12px;color:#15803d;margin:0;line-height:1.6;">A temporary <strong>$1 card hold</strong> helps prevent fake bookings. Guests are not charged for their stay online — <strong>you collect payment at check-in</strong> however you prefer (cash, card, Venmo, etc).</p>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  const periodBar = document.getElementById('revenuePeriodBar');
  if (periodBar && !periodBar.dataset.bound) {
    periodBar.dataset.bound = '1';
    periodBar.addEventListener('click', (event) => {
      const btn = event.target.closest('.revenue-period-btn');
      if (!btn) return;
      const nextPeriod = normalizeRevenuePeriod(btn.dataset.period || '');
      if (!nextPeriod || nextPeriod === crm.revenuePeriod) return;
      if (nextPeriod === 'custom') ensureRevenueCustomDates();
      crm.revenuePeriod = nextPeriod;
      renderRevenueView();
      if (crm.currentFilter === 'bookings' && crm.bookingsSubview === 'revenue') loadRevenueData();
    });
  }

  const customApply = document.getElementById('revenueCustomApply');
  if (customApply && !customApply.dataset.bound) {
    customApply.dataset.bound = '1';
    customApply.addEventListener('click', () => {
      const first = String(document.getElementById('revenueCustomStart')?.value || '').trim();
      const second = String(document.getElementById('revenueCustomEnd')?.value || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(second)) {
        toast('Choose both dates', 'error');
        return;
      }
      crm.revenueCustomStart = first <= second ? first : second;
      crm.revenueCustomEnd = first <= second ? second : first;
      crm.revenuePeriod = 'custom';
      renderRevenueView();
      loadRevenueData(true);
    });
  }

  const activeTab = document.querySelector('.tab.active');
  if (activeTab) moveSlider(activeTab);
  syncMobileNavActive(crm.currentFilter);
}

function revenuePeriodLabel(period) {
  if (period === 'all') return 'All time';
  if (period === 'today') return 'Today';
  if (period === '7d') return 'Last 7 days';
  if (period === 'custom') {
    const start = formatRevenueRangeDate(crm.revenueCustomStart);
    const end = formatRevenueRangeDate(crm.revenueCustomEnd);
    return start && end ? `${start} – ${end}` : 'Custom dates';
  }
  return 'Last 30 days';
}

function formatRevenueRangeDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  const date = new Date(`${iso}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ensureRevenueCustomDates() {
  if (!crm.revenueCustomEnd) crm.revenueCustomEnd = addDaysIso(0);
  if (!crm.revenueCustomStart) crm.revenueCustomStart = addDaysIso(-29);
}

function revenueCacheKey(period = crm.revenuePeriod) {
  if (period !== 'custom') return period;
  ensureRevenueCustomDates();
  return `custom:${crm.revenueCustomStart}:${crm.revenueCustomEnd}`;
}

function normalizeRevenuePeriod(period) {
  if (crm.ALLOWED_REVENUE_PERIODS.has(period)) return period;
  return '30d';
}

function renderRevenueRooms(rooms) {
  const list = document.getElementById('revenueRoomList');
  if (!list) return;

  const items = Array.isArray(rooms) ? rooms : [];
  if (!items.length) {
    list.innerHTML = '<div class="revenue-empty-inline">No room revenue yet for this period.</div>';
    return;
  }

  list.innerHTML = items.map((room) => `
      <div class="revenue-room-row revenue-room-row--simple">
        <div class="revenue-room-name">${esc(room.name || 'Room')}</div>
        <div class="revenue-room-value">${esc(formatCurrencyCompact(room.rev))}</div>
      </div>
    `).join('');
}

function renderRevenueView() {
  syncRevenueUi();
  const view = document.getElementById('revenueView');
  if (!view) return;
  crm.revenuePeriod = normalizeRevenuePeriod(crm.revenuePeriod);

  const statusEl = document.getElementById('revenueStatus');
  const contentEl = document.getElementById('revenueContent');
  const subhintEl = document.getElementById('revenueSubhint');
  const periodButtons = document.querySelectorAll('.revenue-period-btn');
  const customRange = document.getElementById('revenueCustomRange');
  if (crm.revenuePeriod === 'custom') ensureRevenueCustomDates();
  const currentPeriodLabel = revenuePeriodLabel(crm.revenuePeriod);
  if (subhintEl) subhintEl.textContent = `${currentPeriodLabel} · check-in dates`;
  if (customRange) customRange.style.display = crm.revenuePeriod === 'custom' ? 'grid' : 'none';
  const customStart = document.getElementById('revenueCustomStart');
  const customEnd = document.getElementById('revenueCustomEnd');
  if (customStart) customStart.value = crm.revenueCustomStart || '';
  if (customEnd) customEnd.value = crm.revenueCustomEnd || '';
  periodButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.period === crm.revenuePeriod);
  });
  const data = crm.revenueCache[revenueCacheKey()] || null;

  if (!data) {
    if (contentEl) contentEl.style.display = 'none';
    if (statusEl) {
      if (crm.revenueLoading) {
        statusEl.innerHTML = '<div class="loading"><div class="logo-sprite-bounce"></div> Loading revenue...</div>';
      } else if (crm.revenueError) {
        statusEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">!</div>
            <div class="empty-text">Could not load revenue</div>
            <div class="empty-sub">${esc(crm.revenueError)}</div>
          </div>`;
      } else {
        statusEl.innerHTML = '';
      }
    }
    return;
  }

  if (statusEl) statusEl.innerHTML = '';
  if (contentEl) contentEl.style.display = 'block';

  const revEl = document.getElementById('revenueKpiRev');
  const bookingsEl = document.getElementById('revenueKpiBookings');
  const savedEl = document.getElementById('revenueKpiSaved');
  const savedCopyEl = document.getElementById('revenueSavingsCopy');
  const revenueValue = Number(data.rev || 0);
  if (revEl) revEl.textContent = formatCurrencyCompact(revenueValue);
  if (bookingsEl) bookingsEl.textContent = String(data['bookings'] || 0);
  // Prefer the owner's real OTA commission %, falling back to the default.
  const serverRate = Number(data.otaCommissionRate);
  const otaRate = Number.isFinite(serverRate) && serverRate > 0 ? serverRate : crm.OTA_COMMISSION_RATE;
  const savedAmount = revenueValue * otaRate;
  if (savedEl) savedEl.textContent = formatCurrencyCompact(savedAmount);
  if (savedCopyEl) savedCopyEl.textContent = crm.revenuePeriod === 'today'
    ? 'Est. OTA fees avoided today'
    : `Est. OTA fees avoided (${currentPeriodLabel.toLowerCase()})`;
  const stats = data.stats || {};
  const repeatEl = document.getElementById('revenueKpiRepeat');
  const guestelEl = document.getElementById('revenueKpiGuestel');
  const offersEl = document.getElementById('revenueKpiOffers');
  if (repeatEl) repeatEl.textContent = String(stats.repeatGuests || 0);
  if (guestelEl) guestelEl.textContent = String(stats.guestelBookings || 0);
  if (offersEl) offersEl.textContent = String(stats.offerRedemptions || 0);
  renderRevenueRooms(data.rooms);
}

async function loadRevenueData(force = false) {
  if (!crm.revenueEnabled) return;
  if (crm.settingsTourActive) {
    seedTourRevenueShell();
    renderRevenueView();
    return;
  }
  crm.revenuePeriod = normalizeRevenuePeriod(crm.revenuePeriod);
  if (crm.revenuePeriod === 'custom') ensureRevenueCustomDates();
  const requestedPeriod = crm.revenuePeriod;
  const requestedCacheKey = revenueCacheKey(requestedPeriod);
  const requestId = (crm.revenueRequestId || 0) + 1;
  crm.revenueRequestId = requestId;

  const cached = crm.revenueCache[requestedCacheKey];
  if (cached && !force) {
    crm.revenueLoading = false;
    crm.revenueError = '';
    renderRevenueView();
    return;
  }

  crm.revenueLoading = true;
  crm.revenueError = '';
  renderRevenueView();

  try {
    const params = new URLSearchParams({ period: requestedPeriod });
    if (requestedPeriod === 'custom') {
      params.set('startDate', crm.revenueCustomStart);
      params.set('endDate', crm.revenueCustomEnd);
    }
    const data = await api('GET', `/api/crm/revenue?${params.toString()}`);
    if (!data.success) throw new Error(data.message || 'Failed to load revenue');
    crm.revenueCache[requestedCacheKey] = data.data || {};
  } catch (e) {
    if (requestId === crm.revenueRequestId) {
      crm.revenueError = e.message || 'Failed to load revenue';
    }
  } finally {
    if (requestId === crm.revenueRequestId) {
      crm.revenueLoading = false;
      renderRevenueView();
    }
  }
}

function ensureAvailabilityUi() {
  const tabs = document.querySelector('.tabs-container');

  // Add Settings tab if not present
  if (tabs && !tabs.querySelector('[data-nav-filter="settings"]')) {
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'tab';
    settingsBtn.setAttribute('type', 'button');
    settingsBtn.innerHTML = 'Your page';
    settingsBtn.dataset.navFilter = 'settings';
    settingsBtn.onclick = function () { setFilter('settings', settingsBtn); };
    tabs.appendChild(settingsBtn);
  }

  const container = document.querySelector('.container');

  // Add Settings view if not present
  if (container && !document.getElementById('settingsView')) {
    container.insertAdjacentHTML('beforeend', `
      <div id="settingsView" style="display:none; margin-top:8px;">
        <div id="settingsList"></div>
      </div>
    `);
  }

  // Add Edit view (used by Settings tab for room/photo/amenity editing)
  if (container && !document.getElementById('editView')) {
    container.insertAdjacentHTML('beforeend', `
      <div id="editView" style="display:none; margin-top:8px;">
        <div id="editRoomsList"></div>
      </div>
    `);
  }

  if (container && !document.getElementById('availabilityView')) {
    container.insertAdjacentHTML('beforeend', `
      <div id="availabilityView" class="availability-view" style="display:none">
        <div class="rooms-shell">
          <div id="roomsPillBar" class="room-pill-bar"></div>

          <div id="availabilityWalkinHint" style="position:relative;margin:0 0 12px;padding:12px 42px 12px 14px;border:1px solid #cce4d5;border-radius:13px;background:#f2fbf6;color:#1a5c3f;font-size:12px;line-height:1.5;">
            <button id="availabilityWalkinHintDismiss" type="button" aria-label="Dismiss walk-in help" style="position:absolute;top:7px;right:7px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent;color:#47735e;font-family:inherit;font-size:18px;font-weight:600;line-height:1;cursor:pointer;">×</button>
            <strong style="display:block;font-size:13px;margin-bottom:2px;">Walk-in or another channel took a room?</strong>
            Tap the affected dates and set how many rooms are still available. Once saved, that is the number guests can book on your direct booking page. Or text the Marketel Front Desk contact what happened.
          </div>

          <div class="availability-card mobile-cal-card">
            <div id="availabilityNoRoom" class="availability-empty"></div>
            <div id="availabilityCalendarWrap" style="display:none">
              <div class="cal-header">
                <div id="availabilityMonthLabel" class="cal-month-label"></div>
                <div class="cal-nav">
                  <button class="cal-nav-btn" type="button" id="availabilityPrevMonthBtn">‹</button>
                  <button class="cal-nav-btn" type="button" id="availabilityNextMonthBtn">›</button>
                </div>
              </div>
              <div id="availabilityCalendarGrid" class="cal-grid"></div>
              <div class="legend">
                <div class="legend-item"><div class="legend-dot" style="background:var(--green-pale);border:1px solid var(--green)"></div>Open</div>
                <div class="legend-item"><div class="legend-dot" style="background:#FEF3C7;border:1px solid #F59E0B"></div>Partial</div>
                <div class="legend-item"><div class="legend-dot" style="background:#FEE2E2;border:1px solid #E05252"></div>Full</div>
                <div class="legend-item"><div class="legend-dot" style="background:#f2f4f3;border:1px solid #d0d7d3"></div>Closed</div>
                <div class="legend-item" style="width:100%;margin-top:4px;">Numbers on each day = <strong>rooms still available</strong> to book</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div id="roomsAddModalBg" class="rooms-modal-bg">
        <div class="rooms-modal" onclick="event.stopPropagation()">
          <h3>Add room type</h3>
          <p style="font-size:12px;color:var(--text-muted);margin:-6px 0 12px;line-height:1.45;">This creates the room on your booking page and in Availability. Add photos and details under <strong>Your page</strong>.</p>
          <input id="roomsAddNameInput" type="text" placeholder="Room name (e.g. King Room)">
          <input id="roomsAddUnitsInput" type="number" min="1" step="1" placeholder="Total rooms">
          <div class="rooms-modal-row">
            <button id="roomsAddCancelBtn" class="rooms-modal-btn" type="button">Cancel</button>
            <button id="roomsAddSaveBtn" class="rooms-modal-btn primary" type="button">Save</button>
          </div>
        </div>
      </div>

      <div id="roomsEditModalBg" class="rooms-modal-bg">
        <div class="rooms-modal" onclick="event.stopPropagation()">
          <h3>Edit room type</h3>
          <input id="roomsEditNameInput" type="text" placeholder="Room name">
          <input id="roomsEditUnitsInput" type="number" min="1" step="1" placeholder="Total rooms">
          <div class="rooms-modal-row">
            <button id="roomsEditCancelBtn" class="rooms-modal-btn" type="button">Cancel</button>
            <button id="roomsEditSaveBtn" class="rooms-modal-btn primary" type="button">Save changes</button>
          </div>
        </div>
      </div>

      <div id="roomsDeleteModalBg" class="rooms-modal-bg">
        <div class="rooms-modal" onclick="event.stopPropagation()">
          <h3>Delete room type?</h3>
          <p class="rooms-modal-delete-copy" id="roomsDeleteCopy">
            This removes the room from your booking page and Availability, including its saved day-by-day changes. Rooms with current or upcoming bookings cannot be deleted.
          </p>
          <div class="rooms-modal-row">
            <button id="roomsDeleteCancelBtn" class="rooms-modal-btn" type="button">Keep room</button>
            <button id="roomsDeleteConfirmBtn" class="rooms-modal-btn primary" type="button">Delete room</button>
          </div>
        </div>
      </div>

      <div id="availabilitySheetBackdrop" class="availability-sheet-backdrop"></div>
      <div id="availabilityDayPopover" class="availability-edit-sheet" aria-hidden="true" style="display:none;">
        <div id="availabilityDaySavingOverlay" class="availability-day-saving-overlay" hidden aria-hidden="true">
          <div class="loading availability-day-saving-inner"><div class="logo-sprite-bounce"></div> Saving…</div>
        </div>
        <button id="availabilityDayCloseBtn" type="button" style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;color:var(--text-muted);cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;" onclick="closeAvailabilityDayPopover()" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">×</button>
        <div style="padding:18px 18px 16px;">
          <div id="availabilityDayPopoverTitle" style="font-size:13px;font-weight:700;color:#1a1a2e;text-align:center;margin-bottom:14px;"></div>
          <div id="availabilitySheetDate" style="display:none;"></div>
          <div id="availabilityActiveRoomLabel" style="display:none;"></div>
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;">
            <button id="availabilityStepDownBtn" type="button" onclick="stepAvailabilityDay(-1)" style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg);font-size:18px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;color:#374151;">−</button>
            <div id="availabilityDayCount" style="font-size:28px;font-family:'DM Mono',monospace;font-weight:700;min-width:40px;text-align:center;color:#1a1a2e;">0</div>
            <button id="availabilityStepUpBtn" type="button" onclick="stepAvailabilityDay(1)" style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg);font-size:18px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;color:#374151;">+</button>
          </div>
          <input id="availabilityDayClosedInput" type="checkbox" hidden>
          <button id="availabilityClosedToggleBtn" type="button" onclick="toggleAvailabilityDayClosed()" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);cursor:pointer;margin-bottom:14px;font-family:inherit;">
            <span style="font-size:12px;font-weight:600;color:#374151;">Close for this day</span>
            <div id="availabilityClosedToggleTrack" style="width:36px;height:20px;border-radius:10px;background:#D8E4DC;position:relative;transition:background 0.2s;"><div id="availabilityClosedToggleThumb" style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:left 0.2s;"></div></div>
          </button>
          <button id="availabilityDaySaveBtn" type="button" onclick="saveAvailabilityDay()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Done</button>
        </div>
      </div>
      <button id="availabilityClosedToggle" style="display:none;"></button>
      <button id="availabilityDayCancelBtn" style="display:none;" onclick="closeAvailabilityDayPopover()"></button>
    `);
  }

  bindAvailabilityUiEvents();
}

function bindAvailabilityUiEvents() {
  const wrap = document.getElementById('availabilityView');
  if (!wrap || wrap.dataset.bound === 'true') return;
  wrap.dataset.bound = 'true';

  const prev = document.getElementById('availabilityPrevMonthBtn');
  const next = document.getElementById('availabilityNextMonthBtn');
  if (prev) prev.addEventListener('click', () => changeAvailabilityMonth(-1));
  if (next) next.addEventListener('click', () => changeAvailabilityMonth(1));

  const walkinHint = document.getElementById('availabilityWalkinHint');
  const walkinHintDismiss = document.getElementById('availabilityWalkinHintDismiss');
  const walkinHintKey = `marketelAvailabilityWalkinHintDismissed:${crm.activeHotelId || 'default'}`;
  try {
    if (walkinHint && localStorage.getItem(walkinHintKey) === '1') walkinHint.hidden = true;
  } catch (_) {}
  if (walkinHint && walkinHintDismiss) {
    walkinHintDismiss.addEventListener('click', () => {
      walkinHint.hidden = true;
      try { localStorage.setItem(walkinHintKey, '1'); } catch (_) {}
    });
  }

  const modalBg = document.getElementById('roomsAddModalBg');
  const modalCancel = document.getElementById('roomsAddCancelBtn');
  const modalSave = document.getElementById('roomsAddSaveBtn');
  if (modalBg) {
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) closeRoomsAddModal();
    });
  }
  if (modalCancel) modalCancel.addEventListener('click', closeRoomsAddModal);
  if (modalSave) modalSave.addEventListener('click', saveRoomType);

  const editModalBg = document.getElementById('roomsEditModalBg');
  const editModalCancel = document.getElementById('roomsEditCancelBtn');
  const editModalSave = document.getElementById('roomsEditSaveBtn');
  if (editModalBg) {
    editModalBg.addEventListener('click', (e) => {
      if (e.target === editModalBg) closeRoomsEditModal();
    });
  }
  if (editModalCancel) editModalCancel.addEventListener('click', closeRoomsEditModal);
  if (editModalSave) editModalSave.addEventListener('click', saveEditedRoomType);

  const deleteModalBg = document.getElementById('roomsDeleteModalBg');
  const deleteModalCancel = document.getElementById('roomsDeleteCancelBtn');
  const deleteModalConfirm = document.getElementById('roomsDeleteConfirmBtn');
  if (deleteModalBg) {
    deleteModalBg.addEventListener('click', (e) => {
      if (e.target === deleteModalBg) closeRoomsDeleteModal();
    });
  }
  if (deleteModalCancel) deleteModalCancel.addEventListener('click', closeRoomsDeleteModal);
  if (deleteModalConfirm) deleteModalConfirm.addEventListener('click', confirmDeleteRoomType);

  const stepDown = document.getElementById('availabilityStepDownBtn');
  const stepUp = document.getElementById('availabilityStepUpBtn');
  const closedInput = document.getElementById('availabilityDayClosedInput');
  const saveDayBtn = document.getElementById('availabilityDaySaveBtn');
  const cancelDayBtn = document.getElementById('availabilityDayCancelBtn');
  const closedToggle = document.getElementById('availabilityClosedToggle');
  const sheetBackdrop = document.getElementById('availabilitySheetBackdrop');
  // Event listeners now handled via inline onclick — no need to bind here
  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeAvailabilityDayPopover);
}

// ── LOGIN ──────────────────────────────────────────────
async function verifyCrmToken(pin) {
  if (!crm.activeHotelId) throw new Error('Property context is not ready yet.');
  logFrontdeskAuth('verify-start', {
    hotelId: crm.activeHotelId,
    tokenKind: frontdeskTokenKind(pin),
    tokenLength: String(pin || '').length,
  });
  const res = await fetchWithTimeout(`/api/crm/verify?hotelId=${encodeURIComponent(crm.activeHotelId)}`, {
    headers: {
      'x-crm-token': pin,
      ...(isNativeFrontdeskApp() ? { 'x-marketel-client': 'ios' } : {}),
    }
  });
  const json = await res.json().catch(() => ({}));
  logFrontdeskAuth('verify-response', {
    hotelId: crm.activeHotelId,
    status: res.status,
    ok: res.ok,
    success: !!json.success,
    message: json.message || json.error || '',
    verifiedHotelId: json.hotelId || '',
    subscribed: !!json.subscribed,
  }, (!res.ok || !json.success) ? 'warn' : 'info');
  if (!res.ok || !json.success) {
    const error = new Error(json.message || (res.status === 401 ? 'Wrong PIN' : 'Could not verify access'));
    error.status = res.status;
    throw error;
  }
  return json;
}

// D19: proof-of-demand line — the strongest converter for a skeptical owner.
function blockedDemandLineHtml() {
  if (isNativeFrontdeskApp()) return '';
  if (!crm.blockedDemand || crm.blockedDemand.total < 1) return '';
  const n = crm.blockedDemand.today > 0 ? crm.blockedDemand.today : crm.blockedDemand.total;
  const when = crm.blockedDemand.today > 0 ? 'today' : 'recently';
  return `
    <div style="background:rgba(255,255,255,0.16);border-radius:10px;padding:10px 12px;margin:0 0 14px;font-size:12.5px;color:#fff;font-weight:600;line-height:1.45;">
      ${n} guest${n > 1 ? 's' : ''} tried to book ${when} — activate to accept reservations like these.
    </div>`;
}

// D19: the persistent, every-tab surface is a CALM STATUS PILL — not a sales
// banner. The full gradient CTA card (goLiveInlineCardHtml) is reserved for
// high-intent moments (Bookings empty state, Your page, Guestel). When real
// blocked demand exists, the pill upgrades to a proof-of-demand nudge, since
// that's the genuine high-intent signal worth re-prominence.
function goLiveBannerHtml() {
  if (isNativeFrontdeskApp()) return '';
  const demand = crm.blockedDemand && crm.blockedDemand.total > 0 ? crm.blockedDemand.total : 0;
  const hasTrial = crm.marketelTrialEligible !== false;
  if (demand > 0) {
    return `
      <div onclick="goLive()" role="button" tabindex="0" style="display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;column-gap:10px;min-height:44px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:1px 14px;margin-bottom:14px;cursor:pointer;">
        <span style="width:8px;height:8px;border-radius:50%;background:#ea580c;flex-shrink:0;"></span>
        <span style="font-size:13px;color:#9a3412;font-weight:600;line-height:1.25;">${demand} guest${demand>1?'s':''} tried to book — ${hasTrial ? 'start your free trial' : 'reactivate'} to accept reservations like these.</span>
        <span style="white-space:nowrap;font-size:13px;color:#c2410c;font-weight:800;line-height:1;">${hasTrial ? 'Start free' : 'Reactivate'} →</span>
      </div>`;
  }
  return `
    <div onclick="goLive()" role="button" tabindex="0" style="display:flex;align-items:center;gap:10px;min-height:48px;background:#eef6f1;border:1px solid #cfe6da;border-radius:999px;padding:10px 14px;margin-bottom:14px;cursor:pointer;">
      <span style="width:8px;height:8px;border-radius:50%;background:#2E7D5B;flex-shrink:0;"></span>
      <span style="display:inline-flex;align-items:center;min-height:24px;font-size:13px;color:#1a5c3f;font-weight:600;line-height:1.3;">Preview mode</span>
      <span style="display:inline-flex;align-items:center;min-height:24px;font-size:12px;color:#6b7280;line-height:1.35;">· guests can browse, but can&apos;t book yet</span>
      <span style="display:inline-flex;align-items:center;min-height:24px;margin-left:auto;white-space:nowrap;font-size:13px;color:#2E7D5B;font-weight:700;line-height:1.3;">${hasTrial ? 'Start free' : 'Reactivate'} →</span>
    </div>`;
}

function trialDateLabel(value) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return 'the end of your trial';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function trialChecklistHtml() {
  const trial = crm.trialStatus || {};
  const milestones = trial.milestones || {};
  const endLabel = trialDateLabel(trial.endsAt || crm.marketelSubscriptionPeriodEnd);
  const interval = trial.billingInterval === 'year' ? 'year' : 'month';
  const renewal = Number(trial.renewalAmountUsd) || (interval === 'year' ? 1990 : 199);
  const items = [
    { done: !!milestones.nativeAppActivated, label: 'Open Marketel Front Desk on your phone' },
    { done: !!milestones.linkPlacementConfirmed, label: 'Place your booking link where guests find you', action: true },
    { done: !!milestones.firstBookingReceived, label: 'Receive your first booking' },
  ];
  return `<section aria-label="Trial launch checklist" style="background:#eef6f1;border:1px solid #cfe6da;border-radius:16px;padding:14px 15px;margin-bottom:14px;color:#183d2e;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;">
      <div><strong style="display:block;font-size:14px;line-height:1.25;">Your ${crm.marketelTrialDays || 14}-day trial is live</strong><span style="display:block;margin-top:3px;font-size:11.5px;color:#577266;line-height:1.35;">${trial.cancellationScheduled ? `Canceled · access remains through ${esc(endLabel)}` : `${Number(trial.daysLeft) || crm.marketelTrialDays || 14} days left · $${renewal.toLocaleString('en-US')}/${interval} on ${esc(endLabel)}`}</span></div>
      <span style="width:9px;height:9px;border-radius:50%;background:#2E7D5B;box-shadow:0 0 0 5px rgba(46,125,91,.10);margin:5px 4px 0 0;flex:0 0 auto;"></span>
    </div>
    <div style="display:grid;gap:7px;">
      ${items.map((item) => `<div style="display:grid;grid-template-columns:22px minmax(0,1fr)${item.action && !item.done ? ' auto' : ''};align-items:center;gap:8px;min-height:28px;">
        <span aria-hidden="true" style="display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:${item.done ? '#2E7D5B' : '#fff'};border:1px solid ${item.done ? '#2E7D5B' : '#bdd5c8'};color:#fff;font-size:12px;font-weight:800;">${item.done ? '✓' : ''}</span>
        <span style="font-size:12px;line-height:1.3;color:${item.done ? '#577266' : '#183d2e'};${item.done ? 'text-decoration:line-through;text-decoration-color:#9db8aa;' : ''}">${esc(item.label)}</span>
        ${item.action && !item.done ? '<button type="button" onclick="confirmTrialLinkPlaced()" style="border:0;background:transparent;color:#2E7D5B;font:inherit;font-size:11.5px;font-weight:800;padding:5px 0 5px 7px;cursor:pointer;white-space:nowrap;">I added it</button>' : ''}
      </div>`).join('')}
    </div>
    <div style="border-top:1px solid #cfe6da;margin-top:11px;padding-top:9px;text-align:right;">
      <button type="button" onclick="openMarketelBillingPortal()" style="border:0;background:transparent;color:#2E7D5B;font:inherit;font-size:11.5px;font-weight:800;padding:5px 0;cursor:pointer;">Manage trial &amp; billing&nbsp; →</button>
    </div>
  </section>`;
}

function operationalAccessBannerHtml() {
  return `<section aria-label="Direct bookings paused" style="display:flex;align-items:flex-start;gap:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:12px 14px;margin-bottom:14px;color:#9a3412;">
    <span style="width:8px;height:8px;border-radius:50%;background:#ea580c;margin-top:5px;flex:0 0 auto;"></span>
    <span style="font-size:12.5px;line-height:1.4;"><strong style="display:block;">New direct bookings are paused</strong>Your existing reservations and guest messages remain available here.</span>
  </section>`;
}

async function loadMarketelTrialStatus() {
  // The status endpoint is authoritative. Do not gate it on the earlier verify
  // response: a freshly-created Stripe trial can become visible between those
  // two requests, and older native sessions may carry a stale verify payload.
  if (!crm.token || !crm.activeHotelId) {
    crm.trialStatus = null;
    updateGoLiveBanner();
    syncNativeShellState();
    return;
  }
  try {
    const data = await api('GET', '/api/crm/trial-status');
    if (data?.success) {
      crm.trialStatus = data.trialing ? data : null;
      crm.marketelTrialDays = Math.max(1, Number(data.trialDays) || crm.marketelTrialDays || 14);
      if (data.trialing) {
        crm.marketelSubscriptionStatus = 'trialing';
        crm.marketelSubscriptionPeriodEnd = String(data.endsAt || crm.marketelSubscriptionPeriodEnd || '');
        crm.hotelSubscribed = data.subscribed !== false;
      } else if (crm.marketelSubscriptionStatus === 'trialing') {
        // Avoid leaving a stale trial banner behind after conversion or
        // cancellation. The normal subscription sync supplies the exact next
        // status; this endpoint only needs to establish that it is no longer a
        // trial.
        crm.marketelSubscriptionStatus = data.subscribed ? 'active' : '';
        crm.hotelSubscribed = !!data.subscribed;
      }
      updateGoLiveBanner();
      syncNativeShellState();
    }
  } catch (_) { /* Trial status is helpful, never app-blocking. */ }
}

async function confirmTrialLinkPlaced() {
  try {
    const data = await api('POST', '/api/crm/trial-milestone', { milestone: 'link-placed' });
    if (data?.success) {
      crm.trialStatus = { ...(crm.trialStatus || {}), milestones: data.milestones || {} };
      updateGoLiveBanner();
      toast('Booking link marked as placed', 'success');
    }
  } catch (_) {
    toast('Could not save that yet. Try again.', 'error');
  }
}

let billingPortalOpening = false;

async function openMarketelBillingPortal() {
  if (billingPortalOpening) return;
  billingPortalOpening = true;
  try {
    const result = await api('GET', '/api/crm/billing-portal');
    // Comped, demo and App Review properties are subscribed with no Stripe
    // customer. That is a legitimate state, so it must not read as an error.
    if (result?.reason === 'not-stripe-managed') {
      toast(result.message || 'This account is billed directly by Marketel.');
      return;
    }
    if (!result?.success || !result.url) {
      throw new Error(result?.message || 'Billing is unavailable right now.');
    }
    if (isNativeFrontdeskApp()) openInAppBrowser(result.url);
    else window.location.assign(result.url);
  } catch (error) {
    toast(error?.message || 'Contact support@bookmarketel.com for billing help.', 'error');
  } finally {
    billingPortalOpening = false;
  }
}

function goLiveInlineCardHtml() {
  // D19: never surface pricing during onboarding (welcome modal + settings tour).
  // The card preloads before settingsTourActive flips true, so also gate on the
  // tour-completion flag — value is established first, price only after.
  if (isNativeFrontdeskApp() || crm.hotelSubscribed || crm.settingsTourActive || !localStorage.getItem('settingsTourDone')) return '';
  const hasTrial = crm.marketelTrialEligible !== false;
  return `
    <div class="booking-card" id="tour-go-live-card" style="margin-bottom:14px;background:linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%);border:none;">
      <div style="padding:18px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:white;margin-bottom:6px;">${hasTrial ? 'Start your 14-day free trial' : 'Ready to reactivate'}</div>
        <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0 0 14px;line-height:1.55;">Your page is built. ${hasTrial ? 'Start full access to accept reservations and run Front Desk for $0 today.' : 'Reactivate to accept reservations and run Front Desk again.'}</p>
        ${blockedDemandLineHtml()}
        <button onclick="goLive()" style="width:100%;padding:12px;border-radius:10px;border:none;background:white;color:#1a5c3f;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${hasTrial ? 'Start 14 days free' : 'Reactivate — $199/month'} →</button>
        <div style="font-size:10px;color:rgba(255,255,255,0.68);margin-top:8px;">${hasTrial ? 'Card required · Then $199/month · Cancel anytime' : 'Billed monthly · Cancel anytime'}</div>
      </div>
    </div>`;
}

// D19: the Your-page go-live card is gated off during onboarding (see
// goLiveInlineCardHtml). The edit page renders once and isn't auto-rebuilt, so
// once the tour completes we inject the card into the already-mounted DOM.
function refreshGoLiveInlineCard() {
  const existing = document.getElementById('tour-go-live-card');
  const html = goLiveInlineCardHtml();
  if (existing) {
    if (html) existing.outerHTML = html;
    else existing.remove();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  if (!html) return;
  const list = document.getElementById('editRoomsList');
  if (!list) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = html.trim();
  const card = tmp.firstElementChild;
  if (!card) return;
  const ratesCard = document.getElementById('tour-rates-card');
  if (ratesCard && ratesCard.parentNode === list) list.insertBefore(card, ratesCard);
  else list.insertBefore(card, list.firstChild);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// D19: fetch blocked-demand counts and refresh any visible go-live surfaces.
async function loadBlockedDemand() {
  if (isNativeFrontdeskApp() || crm.hotelSubscribed) return;
  try {
    const data = await api('GET', '/api/crm/blocked-demand');
    if (data && data.success) {
      crm.blockedDemand = { total: data.total || 0, today: data.today || 0, recent: data.recent || [] };
      updateGoLiveBanner();
      const inline = document.getElementById('tour-go-live-card');
      if (inline) inline.outerHTML = goLiveInlineCardHtml();
    }
  } catch (e) { /* non-fatal */ }
}

function updateGoLiveBanner() {
  const banner = document.getElementById('goLiveBanner');
  if (!banner) return;
  const trialing = crm.marketelSubscriptionStatus === 'trialing';
  const operationalOnly = !!crm.operationalAccessOnly;
  const shouldShow = !banner.dataset.tourHidden && (
    trialing || operationalOnly || (!isNativeFrontdeskApp() && !crm.hotelSubscribed)
  );
  banner.style.display = shouldShow ? 'block' : 'none';
  if (shouldShow) banner.innerHTML = trialing
    ? trialChecklistHtml()
    : operationalOnly ? operationalAccessBannerHtml() : goLiveBannerHtml();
  const app = document.getElementById('app');
  if (app) app.classList.toggle('has-go-live-banner', shouldShow);
}

function updateBookingsTabBadge() {
  const badge = document.getElementById('countNeedsCalled');
  const needsCalls = (crm.bookings || []).filter(b => b.callStatus === 'not-called').length;
  if (badge) {
    badge.textContent = needsCalls;
    badge.style.display = needsCalls > 0 ? '' : 'none';
  }
  syncNativeShellState();
}

// D17: call-status filter chips at the top of the Bookings list, so the
// "needs a call" workflow is visible and actionable on mobile (Maya's main device).
function setBookingCallFilter(f) {
  crm.bookingCallFilter = (f === 'needs' || f === 'called') ? f : 'all';
  renderBookings(crm.bookings);
}

function renderBookingFilterChips(counts) {
  const wrap = document.getElementById('bookingFilterChips');
  if (!wrap) return;
  // Only on the Bookings tab (not the Get found subview), and only when there's something to filter.
  if (crm.currentFilter !== 'bookings' || crm.bookingsSubview !== 'bookings' || !counts || counts.all === 0) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const chip = (id, label, n, accent) => {
    const active = crm.bookingCallFilter === id;
    const bg = active ? (accent || '#2E7D5B') : '#fff';
    const fg = active ? '#fff' : '#374151';
    const bd = active ? (accent || '#2E7D5B') : '#e5e7eb';
    return `<button type="button" onclick="setBookingCallFilter('${id}')" style="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;border:1.5px solid ${bd};background:${bg};color:${fg};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;">${label}<span style="font-weight:800;opacity:${active ? '1' : '0.7'};">${n}</span></button>`;
  };
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div style="display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;-webkit-overflow-scrolling:touch;">
      ${chip('all', 'All', counts.all)}
      ${chip('needs', 'Needs call', counts.needs, '#ea580c')}
      ${chip('called', 'Called', counts.called)}
    </div>`;
}

// Launch checklist truth: a real photo and real rates exist on the server.
async function loadLaunchStatus() {
  try {
    const res = await api('GET', '/api/crm/rooms');
    if (!res || !res.success) return;
    const photo = (res.rooms || []).some(r => (r.images && r.images.length > 0) || r.imageUrl);
    const rates = !!(res.rates && (Number(res.rates.nightly) > 0 || Number(res.rates.weekly) > 0 || Number(res.rates.monthly) > 0));
    crm.launchStatus = { photo, rates };
    if (Array.isArray(res.rooms)) crm.editRooms = res.rooms;
    if (crm.currentFilter === 'bookings' && crm.bookingsSubview === 'bookings') renderBookings(crm.bookings);
  } catch (e) { /* non-fatal */ }
}

// ── GROWTH ("Get found") — Your Page acquisition workspace ───────────
function ensureGrowthStyles() {
  if (document.getElementById('growthStyles')) return;
  const s = document.createElement('style');
  s.id = 'growthStyles';
  s.textContent = `
    .subtab-group{display:flex;background:#eef2f0;border-radius:13px;padding:4px;gap:4px;margin:0 0 16px;width:100%;box-sizing:border-box;}
    .subtab{flex:1;border:none;background:transparent;font-family:inherit;font-size:14px;font-weight:700;color:#6b7280;padding:10px 14px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,color .15s,box-shadow .15s;white-space:nowrap;}
    .subtab.active{background:#fff;color:#1a1a2e;box-shadow:0 1px 4px rgba(0,0,0,0.09);}
    .subtab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ea580c;color:#fff;font-size:11px;font-weight:800;line-height:1;}
    .growth-wrap{padding:2px 0 8px;animation:growthFade .2s ease;}
    @keyframes growthFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .growth-card{position:relative;background:#fff;border:1.5px solid #e6e9e7;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,0,0,0.045);}
    .growth-card-close{position:absolute;top:9px;right:9px;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:#758078;font:700 22px/1 system-ui;cursor:pointer;}
    .growth-card-close:hover{background:#f0f4f1;color:#26372e;}
    .growth-card-dismissible .growth-card-title{padding-right:34px;}
    .growth-card-title{font-size:15px;font-weight:800;color:#1a1a2e;margin:0 0 2px;}
    .growth-card-sub{font-size:12.5px;color:#6b7280;line-height:1.5;margin:0 0 14px;}
    .growth-period{display:inline-flex;gap:3px;background:#f1f5f3;border-radius:9px;padding:3px;margin-bottom:16px;}
    .growth-period button{border:none;background:transparent;font-family:inherit;font-size:12px;font-weight:700;color:#6b7280;padding:6px 12px;border-radius:7px;cursor:pointer;}
    .growth-period button.active{background:#fff;color:#2E7D5B;box-shadow:0 1px 3px rgba(0,0,0,0.09);}
    .growth-funnel{display:flex;align-items:stretch;gap:7px;}
    .growth-stat{flex:1;text-align:center;background:#f7faf8;border:1px solid #e6efe9;border-radius:13px;padding:15px 6px;}
    .growth-stat-num{font-size:25px;font-weight:800;color:#1a1a2e;line-height:1;}
    .growth-stat-num.accent{color:#2E7D5B;}
    .growth-stat-label{font-size:11px;color:#6b7280;font-weight:600;margin-top:7px;line-height:1.3;}
    .growth-arrow{display:flex;align-items:center;color:#cbd5d0;font-size:15px;font-weight:800;flex-shrink:0;}
    .growth-insight{margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:11px;padding:11px 13px;font-size:12.5px;color:#166534;line-height:1.5;font-weight:600;}
    .growth-insight.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
    .growth-step{display:flex;gap:13px;align-items:flex-start;padding:16px 0;border-top:1px solid #f0f2f1;}
    .growth-step:first-of-type{border-top:none;padding-top:2px;}
    .growth-step-check{flex-shrink:0;width:26px;height:26px;border-radius:50%;border:2px solid #d0d7d3;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;margin-top:1px;padding:0;}
    .growth-step-check.done{background:#2E7D5B;border-color:#2E7D5B;}
    .growth-step-body{flex:1;min-width:0;}
    .growth-step-title{font-size:14px;font-weight:700;color:#1a1a2e;line-height:1.3;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .growth-pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#2E7D5B;background:#e8f5ee;border-radius:6px;padding:3px 7px;}
    .growth-step-desc{font-size:12.5px;color:#6b7280;line-height:1.5;margin:5px 0 0;}
    .growth-step-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px;}
    .growth-btn{border:none;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none;}
    .growth-btn-primary{background:#2E7D5B;color:#fff;}
    .growth-btn-ghost{background:#fff;color:#1a1a2e;border:1.5px solid #e0e4e2;}
    .growth-link-box{display:flex;flex-direction:column;gap:8px;align-items:stretch;background:#f7faf8;border:1px solid #e0e4e2;border-radius:10px;padding:12px;margin-top:11px;}
    .growth-link-box input{width:100%;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:10px;color:#1a1a2e;outline:none;}
  `;
  document.head.appendChild(s);
}

function renderBookingsSubtabs() {
  const wrap = document.getElementById('bookingsSubtabs');
  if (!wrap) return;
  if (crm.currentFilter !== 'bookings' || crm.settingsTourActive) { wrap.style.display = 'none'; return; }
  ensureGrowthStyles();
  wrap.style.display = 'block';
  const onBookings = crm.bookingsSubview === 'bookings';
  const onRevenue = crm.bookingsSubview === 'revenue' && crm.revenueEnabled;
  const revenueTab = crm.revenueEnabled
    ? `<button type="button" role="tab" class="subtab ${onRevenue ? 'active' : ''}" aria-selected="${onRevenue}" onclick="setBookingsSubview('revenue')">Revenue</button>`
    : '';
  wrap.innerHTML = `
    <div class="subtab-group" role="tablist">
      <button type="button" role="tab" class="subtab ${onBookings ? 'active' : ''}" aria-selected="${onBookings}" onclick="setBookingsSubview('bookings')">Bookings</button>
      ${revenueTab}
    </div>`;
}

function setBookingsSubview(view) {
  // Preserve older links while keeping Bookings focused on reservations and revenue.
  if (view === 'growth') {
    openGrowthWorkspace();
    return;
  }
  if (view === 'revenue' && !crm.revenueEnabled) view = 'bookings';
  crm.bookingsSubview = ['bookings', 'revenue'].includes(view) ? view : 'bookings';
  // Native chrome is outside the web view. Hide the assistant pill before the
  // Revenue paint starts so it cannot linger for a frame and disappear later.
  syncNativeShellState();
  renderBookingsSubtabs();
  applyBookingsSubview();
  if (crm.bookingsSubview === 'revenue') loadRevenueData();
}

async function openGrowthWorkspace() {
  crm.bookingsSubview = 'bookings';
  const settingsButton = document.querySelector('.tab[data-nav-filter="settings"]')
    || document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');
  setFilter('settings', settingsButton);
  try {
    await loadSettingsModule();
    if (typeof window.invokeLoadEditRooms === 'function') await window.invokeLoadEditRooms();
    await loadGrowthData();
  } catch (_) {
    // Your Page remains useful if acquisition metrics are temporarily unavailable.
  }
  document.getElementById('yourPageGrowthPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderEmbeddedAssistantPreviewCard() {
  const panel = document.getElementById('frontDeskAssistantPanel');
  if (!panel) return;
  panel.innerHTML = `
    <div style="margin:0 0 14px;padding:15px 16px;border:1px solid #dbe7df;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(28,67,45,.06);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
        <div style="min-width:0;">
          <div style="color:#2E7D5B;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Front Desk Assistant</div>
          <strong style="display:block;margin-top:4px;color:#1a1a1a;font-size:14px;">Tell Front Desk when something changes elsewhere.</strong>
          <span style="display:block;margin-top:4px;color:#6b7280;font-size:12px;line-height:1.45;">It checks direct bookings with your team and updates availability from a simple reply.</span>
        </div>
        <button type="button" style="flex:0 0 auto;padding:9px 13px;border:0;border-radius:10px;background:#2E7D5B;color:#fff;font-family:inherit;font-size:12px;font-weight:800;">Open</button>
      </div>
    </div>`;
}

function applyBookingsSubview() {
  const isRevenue = crm.bookingsSubview === 'revenue' && crm.revenueEnabled;
  const isBookings = !isRevenue;
  const listEl = document.getElementById('bookingsList');
  const chipsEl = document.getElementById('bookingFilterChips');
  const msgPanel = document.getElementById('messagesPanel');
  const revenueEl = document.getElementById('revenueView');
  const assistantEl = document.getElementById('frontDeskAssistantPanel');
  if (listEl) listEl.style.display = isBookings ? '' : 'none';
  if (msgPanel) msgPanel.style.display = 'none';
  if (!isBookings && chipsEl) chipsEl.style.display = 'none';
  if (revenueEl) revenueEl.style.display = isRevenue ? 'flex' : 'none';
  if (assistantEl) assistantEl.style.display = isBookings ? 'block' : 'none';
  if (isRevenue) {
    renderRevenueView();
  } else {
    renderBookings(crm.bookings);
    if (document.body.classList.contains('frontdesk-editor-preview')) {
      renderEmbeddedAssistantPreviewCard();
    } else {
      loadAssistantModule().then((module) => {
        module.renderFrontDeskAssistantCard();
        module.renderAssistantPill();
      }).catch(() => {});
    }
  }
  renderBookingsNotices();
}

async function loadGrowthData() {
  if (growthLoadPromise) return growthLoadPromise;
  growthLoadPromise = (async () => {
    try {
      const [funnel, checklist] = await Promise.all([
        api('GET', `/api/crm/growth-funnel?period=${encodeURIComponent(crm.growthPeriod)}`).catch(() => null),
        api('GET', '/api/crm/growth-checklist').catch(() => null),
      ]);
      if (funnel && funnel.success) crm.growthFunnel = funnel;
      if (checklist && checklist.success) crm.growthChecklist = checklist.checklist || {};
      renderBookingsSubtabs();
      renderGrowthPanel();
      renderBookingsNotices();
    } catch (e) { /* non-fatal */ }
  })();
  try {
    return await growthLoadPromise;
  } finally {
    growthLoadPromise = null;
  }
}

function setGrowthPeriod(p) {
  crm.growthPeriod = ['today', '7d', '30d'].includes(p) ? p : '30d';
  renderGrowthPanel();
  loadGrowthData();
}

async function setGrowthChecklistItem(key, done) {
  crm.growthChecklist = { ...crm.growthChecklist, [key]: done ? { done: true } : { done: false } };
  renderGrowthPanel();
  try {
    const res = await api('POST', '/api/crm/growth-checklist', { key, done });
    if (res && res.success) { crm.growthChecklist = res.checklist || crm.growthChecklist; renderGrowthPanel(); }
  } catch (e) { toast('Could not save — try again', 'error'); }
}

function growthCheckDone(key) {
  return !!(crm.growthChecklist && crm.growthChecklist[key] && crm.growthChecklist[key].done);
}

function growthDiscoveryCardDismissed() {
  if (!crm.activeHotelId) return false;
  try {
    return localStorage.getItem(`marketelGrowthDiscoveryDismissed:${crm.activeHotelId}`) === '1';
  } catch (_) {
    return false;
  }
}

function dismissGrowthDiscoveryCard() {
  if (crm.activeHotelId) {
    try { localStorage.setItem(`marketelGrowthDiscoveryDismissed:${crm.activeHotelId}`, '1'); } catch (_) {}
  }
  renderGrowthPanel();
}

function renderGrowthPanel() {
  ensureGrowthStyles();
  const targets = [document.getElementById('yourPageGrowthPanel')].filter(Boolean);
  if (!targets.length) return;
  const domain = crm.activeHotelDomain || (crm.activeHotelId ? crm.activeHotelId + '.mktel.co' : '');
  const bookingUrl = domain ? 'https://' + domain : '';
  const urlAttr = bookingUrl.replace(/'/g, "\\'");
  const f = crm.growthFunnel || {};
  const pv = f.pageViews || 0, cs = f.checkoutStarted || 0, blk = f.blockedAttempts || 0, bk = f.completedBookings || 0;

  let insight = '', insightCls = '';
  if (pv === 0) {
    insight = 'No page views yet. Put your link where guests already look — start with Google below.';
  } else if (blk > 0 && !crm.hotelSubscribed) {
    insight = `${blk} guest${blk > 1 ? 's' : ''} tried to book but couldn’t — you’re in preview mode. Activate to accept reservations like these.`;
    insightCls = 'warn';
  } else if (bk > 0) {
    insight = `${bk} direct booking${bk > 1 ? 's' : ''} this period — that’s money you kept off the OTAs. Keep your link in front of guests.`;
  } else if (cs > 0) {
    insight = `${cs} reached checkout but didn’t finish. More visits up top means more bookings down here.`;
  } else {
    insight = 'People are viewing your page. Make it effortless to find — share your link everywhere below.';
  }

  const periodBtn = (p, label) => `<button type="button" class="${crm.growthPeriod === p ? 'active' : ''}" onclick="setGrowthPeriod('${p}')">${label}</button>`;
  const stat = (num, label, accent) => `<div class="growth-stat"><div class="growth-stat-num${accent ? ' accent' : ''}">${num}</div><div class="growth-stat-label">${label}</div></div>`;
  const arrow = '<div class="growth-arrow">→</div>';
  const checkMark = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>';

  const step = (key, pill, title, desc, actionsHtml) => {
    const done = growthCheckDone(key);
    return `
    <div class="growth-step">
      <button type="button" class="growth-step-check ${done ? 'done' : ''}" onclick="setGrowthChecklistItem('${key}', ${done ? 'false' : 'true'})" aria-label="${done ? 'Mark not done' : 'Mark done'}">${done ? checkMark : ''}</button>
      <div class="growth-step-body">
        <div class="growth-step-title">${title}${pill ? `<span class="growth-pill">${pill}</span>` : ''}</div>
        <div class="growth-step-desc">${desc}</div>
        <div class="growth-step-actions">${actionsHtml}</div>
      </div>
    </div>`;
  };

  // Precompute every sub-string at statement level. The build splitter's masker
  // treats `${...}` interpolations as raw, so nested template literals inside an
  // interpolation desync it — keep interpolations to simple values only.
  const linkBoxHtml = bookingUrl
    ? `<div class="growth-link-box"><input type="text" readonly value="${domain}"><button type="button" class="growth-btn growth-btn-primary" style="justify-content:center;" onclick="navigator.clipboard.writeText('${urlAttr}').then(()=>toast('Link copied!','success'))">Copy</button></div>`
    : `<div class="growth-step-desc" style="margin-top:8px;">Your booking link is still setting up.</div>`;

  const periodHtml = periodBtn('today', 'Today') + periodBtn('7d', '7 days') + periodBtn('30d', '30 days');
  const statsHtml = stat(pv, 'Page views') + arrow + stat(cs, 'Reached checkout') + arrow + stat(bk, 'Booked', true);

  const funnelCard = `
    <div class="growth-card">
      <div class="growth-card-title">Your guest funnel</div>
      <div class="growth-card-sub">Where your direct bookings come from. Page views are how many people landed on your booking page.</div>
      <div class="growth-period">${periodHtml}</div>
      <div class="growth-funnel">${statsHtml}</div>
      <div class="growth-insight ${insightCls}">${insight}</div>
    </div>`;

  const openGoogleBtn = bookingUrl ? `<a class="growth-btn growth-btn-ghost" href="https://business.google.com/" target="_blank" rel="noopener">Open Google Business &#8599;</a>` : '';
  const textBtn = bookingUrl ? `<button type="button" class="growth-btn growth-btn-ghost" onclick="navigator.clipboard.writeText('${urlAttr}').then(()=>toast('Link copied!','success'))">Copy link to text</button>` : '';
  const qrBtn = `<button type="button" class="growth-btn growth-btn-primary" onclick="openGuestAppSharing()">Open Guestel</button>`;

  const gbpStep = step('gbp', 'Biggest lever', 'Add your link to Google', 'Most guests find motels on Google Maps. Paste your booking link into your Google Business Profile so they book direct instead of through an OTA.', openGoogleBtn + linkBoxHtml);
  const qrStep = step('qr', '', 'Share a QR at check-in', 'Guests can scan it to save your property and book direct next time. Print it or show it during check-in.', qrBtn);
  const textStep = step('textLink', '', 'Text it to past guests', 'Repeat guests are your cheapest bookings. Text them your link so they skip Booking.com next time.', textBtn);

  const checklistCard = growthDiscoveryCardDismissed() ? '' : `
    <div class="growth-card growth-card-dismissible">
      <button type="button" class="growth-card-close" onclick="dismissGrowthDiscoveryCard()" aria-label="Dismiss Get found tips">×</button>
      <div class="growth-card-title">Get found — put your link where guests already are</div>
      <div class="growth-card-sub">A booking page only works if people see it. These are the highest-value places to put your link — no ads required.</div>
      ${gbpStep}${qrStep}${textStep}
    </div>`;

  const html = `<div class="growth-wrap">${funnelCard}${checklistCard}</div>`;
  targets.forEach((target) => { target.innerHTML = html; });
}

async function openGuestAppSharing() {
  const appsButton = document.querySelector('.tab[data-nav-filter="apps"]')
    || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');
  setFilter('apps', appsButton);
  try {
    const module = await loadAppsModule();
    module.ensureAppsViewRendered(true);
  } catch (_) {}
  requestAnimationFrame(() => {
    const shareCard = document.getElementById('guest-app-share-card')
      || document.getElementById('tour-native-guest-share');
    shareCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// Server-side install signal, mirroring the guest install funnel. Lets the growth
// checklist and the no-alerts nudge reason about adoption without a browser flag.
function reportFrontdeskInstalled() {
  if (!crm.token) return;
  if (crm.frontdeskInstallReported) return;
  crm.frontdeskInstallReported = true;
  api('POST', '/api/crm/frontdesk-install-event', { installed: true }).catch(() => {});
}

function seedTourRevenueShell() {
  if (!crm.revenueEnabled) return;
  crm.revenuePeriod = normalizeRevenuePeriod(crm.revenuePeriod || '30d');
  const cacheKey = revenueCacheKey();
  if (!crm.revenueCache[cacheKey]) {
    crm.revenueCache[cacheKey] = { rev: 0, rooms: [{ name: 'Your rooms', rev: 0 }] };
  }
  crm.revenueLoading = false;
  crm.revenueError = '';
  const statusEl = document.getElementById('revenueStatus');
  const contentEl = document.getElementById('revenueContent');
  if (statusEl) statusEl.innerHTML = '';
  if (contentEl) contentEl.style.display = 'block';
  renderRevenueView();
}

async function invokeLoadEditRooms() {
  if (typeof loadSettingsModule === 'function') await loadSettingsModule();
  const fn = (typeof loadEditRooms === 'function')
    ? loadEditRooms
    : (typeof window.loadEditRooms === 'function' ? window.loadEditRooms : null);
  return fn ? fn() : Promise.resolve();
}
window.invokeLoadEditRooms = invokeLoadEditRooms;

function hydrateCrmInBackground() {
  void (async () => {
    if (typeof loadSettingsModule === 'function') await loadSettingsModule();
    if (crm.revenueEnabled) seedTourRevenueShell();
    const editLoad = (typeof needsEditPageLoad === 'function' && needsEditPageLoad())
      ? invokeLoadEditRooms()
      : Promise.resolve();
    // Your page first — availability/bookings can wait so we don't stampede the DB.
    await editLoad;
    await Promise.allSettled([
      loadBookings({ deferMessages: true, silent: true }),
      loadManualAvailability({ silent: true }),
    ]);
  })();
}

async function hydrateCrmAfterTour() {
  if (typeof loadSettingsModule === 'function') await loadSettingsModule();
  crm.settingsTourActive = false;
  updateGoLiveBanner();
  const editLoad = (typeof needsEditPageLoad === 'function' && needsEditPageLoad())
    ? invokeLoadEditRooms()
    : Promise.resolve();
  await Promise.allSettled([
    editLoad,
    loadManualAvailability(),
    loadBookings({ deferMessages: true }),
    crm.revenueEnabled ? loadRevenueData(true) : Promise.resolve(),
  ]);
  // Tour is over and value is established — now the go-live pricing card is
  // allowed to surface on Your page (it was gated off during onboarding).
  refreshGoLiveInlineCard();
}

function finishTourHydration() {
  void hydrateCrmAfterTour();
}

function installEmbeddedEditorPreview() {
  document.documentElement.classList.add('frontdesk-editor-preview');
  document.body.classList.add('frontdesk-editor-preview');
  const header = document.querySelector('#app > .header');
  if (header && !document.getElementById('embeddedPreviewScope')) {
    header.insertAdjacentHTML('afterend', `
      <div id="embeddedPreviewScope" role="note">
        <strong>Make it yours</strong>
        <span>Your header and first room are ready to edit. The softly faded areas unlock after activation.</span>
      </div>
    `);
  }
  const editView = document.getElementById('editView');
  if (editView && !document.getElementById('embeddedEditorNotice')) {
    editView.insertAdjacentHTML('afterbegin', `
      <div id="embeddedEditorNotice">
        <div>
          <strong>This is where you control your booking page.</strong>
          <span>Edit your header or first room, then choose Save &amp; see changes to view the live result.</span>
        </div>
      </div>
    `);
  }

  // Keep the complete product visible for context, but focus this preview on
  // the two things the owner can change and immediately see on their page.
  // Capture-time locking remains a safety net behind the visual treatment.
  if (document.body.dataset.previewActionGuard !== '1') {
    document.body.dataset.previewActionGuard = '1';
    const isAllowedPreviewTarget = (target) => {
      const interactive = target?.closest?.('button, a, input, select, textarea, label, form, [role="button"], [onclick]');
      if (!interactive) return true;
      const firstRoomCard = interactive.closest('#editRoomsCards > .booking-card:first-child');
      const isFirstRoomEditor = !!firstRoomCard && !interactive.closest('.room-edit-delete-btn');
      const isFirstRoomEditorModal = !!interactive.closest('[data-preview-action-scope="first-room-editor"]');
      const isHeaderEditor = !!interactive.closest('#tour-header-preview-card');
      // Switching tabs changes nothing, and a visible-but-dead nav reads as a
      // mock — it also leaves the owner thinking Front Desk is only an editor,
      // which undersells the app the very next beat is about to claim. Looking
      // around stays open; everything inside those tabs is still locked.
      const isNavTab = !!interactive.closest('[data-nav-filter]');
      return isHeaderEditor || isFirstRoomEditor || isFirstRoomEditorModal || isNavTab;
    };
    const blockLockedPreviewAction = (event) => {
      const interactive = event.target?.closest?.('button, a, input, select, textarea, label, form, [role="button"], [onclick]');
      if (!interactive) return;
      if (isAllowedPreviewTarget(interactive)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'click' || event.type === 'keydown') {
        const now = Date.now();
        const lastNotice = Number(document.body.dataset.previewLockNoticeAt || 0);
        if (now - lastNotice > 900) {
          document.body.dataset.previewLockNoticeAt = String(now);
          toast('For now, edit your header or first room. Everything else unlocks after activation.');
        }
      }
    };
    document.addEventListener('click', blockLockedPreviewAction, true);
    document.addEventListener('change', blockLockedPreviewAction, true);
    document.addEventListener('submit', blockLockedPreviewAction, true);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      blockLockedPreviewAction(event);
    }, true);
  }
}

function initializeFrontdeskJourney(isEmbeddedEditorPreview) {
  // The acquisition/checkout funnel runs on the web. Keep the App Store build
  // free of this analytics layer; native owners are already activated and the
  // app has separate operational diagnostics.
  if (isNativeFrontdeskApp()) return;
  const tracker = window.MarketelJourney;
  if (!tracker || !crm.activeHotelId || !crm.token) return;
  tracker.init({
    endpoint: '/api/crm/journey-events?hotelId=' + encodeURIComponent(crm.activeHotelId),
    hotelId: crm.activeHotelId,
    surface: isEmbeddedEditorPreview ? 'frontdesk-editor-preview' : 'frontdesk',
    headers: {
      'x-crm-token': crm.token,
    },
    context: {
      subscribed: !!crm.hotelSubscribed,
      pms: crm.currentHotelPms || 'unknown',
      initialTab: crm.currentFilter || 'unknown',
      embeddedEditorPreview: !!isEmbeddedEditorPreview,
    },
  });
  tracker.track('JourneyFrontDeskReady', {
    subscribed: !!crm.hotelSubscribed,
    initialTab: crm.currentFilter || 'unknown',
    revealRequested: new URLSearchParams(window.location.search).has('reveal'),
  });
}

async function startCrmApp(verification, options = {}) {
  const bootstrapped = options.bootstrapped === true;
  if (
    isNativeFrontdeskApp()
    && !(verification && (verification.subscribed || verification.nativePreviewAccess))
  ) {
    throw new Error('This property does not currently have Front Desk app access.');
  }
  crm.lastAuthError = '';
  crm.isMasterPin = !!(verification && verification.isMasterPin);
  crm.isDogfoodPreview = !!(verification && verification.nativePreviewAccess);
  syncAdminReplayControl();
  crm.currentHotelPms = String((verification && verification.pms) || '').toLowerCase();
  crm.revenueEnabled = !!(verification && verification.isManualPms);
  crm.revenueCache = {};
  crm.revenueLoading = false;
  crm.revenueError = '';
  crm.assistantData = null;
  crm.assistantLoading = false;
  crm.assistantError = '';
  crm.supportThread = null;
  crm.supportUnreadCount = 0;
  crm.operationalReadiness = null;
  crm.operationalReadinessLoading = false;
  ensureAvailabilityUi();
  syncNotificationButtonState();
  syncRevenueUi();
  cleanFrontdeskReturnAuthParams();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('checkoutCancelled') === '1') {
    window.MarketelJourney?.track('JourneyCheckoutCancelled', {
      hotelId: crm.activeHotelId || verification?.hotelId || '',
      returnedTo: 'activation',
    }, { immediate: true });
    const cancelledUrl = new URL(window.location);
    cancelledUrl.searchParams.delete('checkoutCancelled');
    window.history.replaceState({}, '', cancelledUrl);
    setTimeout(() => toast('No charge was made. Your Marketel is still saved here.'), 500);
  }
  const isEmbeddedEditorPreview = urlParams.get('previewEditor') === '1';
  document.documentElement.classList.toggle('frontdesk-editor-preview', isEmbeddedEditorPreview);
  document.body.classList.toggle('frontdesk-editor-preview', isEmbeddedEditorPreview);
  if (urlParams.get('pwa') === '1') {
    try { sessionStorage.setItem('frontdeskSimulatePwa', '1'); } catch (_) {}
  } else {
    try { sessionStorage.removeItem('frontdeskSimulatePwa'); } catch (_) {}
  }
  const revealRequest = urlParams.get('reveal');
  const revealStepMatch = /^step-([0-2])$/.exec(String(revealRequest || ''));
  const isSavedValueReveal = revealRequest === 'checkout' || !!revealStepMatch;
  // Old setup/recovery links can contain both `welcome=1` and a saved reveal
  // stage. The reveal is the setup payoff; the welcome flag belongs to the
  // retired owner-dashboard walkthrough and must never win that conflict.
  const isFirstWelcome = urlParams.has('welcome') && !isSavedValueReveal;
  if (isSavedValueReveal && urlParams.has('welcome')) {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('welcome');
    window.history.replaceState({}, '', cleanUrl);
    urlParams.delete('welcome');
  }
  let hasPendingValueReveal = false;
  try { hasPendingValueReveal = localStorage.getItem('marketelValueRevealPendingV1') === '1'; } catch (_) {}
  const shouldResumeValueReveal = !(verification && verification.subscribed) && hasPendingValueReveal;
  const shouldShowValueReveal = !isEmbeddedEditorPreview && (
    revealRequest === '1'
      || revealRequest === 'checkout'
      || !!revealStepMatch
      || shouldResumeValueReveal
  );
  const revealStartAt = revealRequest === 'checkout'
    ? 3
    : (revealStepMatch
        ? Number(revealStepMatch[1])
        : (revealRequest === '1' && !shouldResumeValueReveal ? 0 : undefined));
  const previewActivation = !!(
    verification?.subscribed
    && (crm.isMasterPin || crm.isDogfoodPreview)
    && shouldShowValueReveal
  );
  if (isFirstWelcome) resetWalkthroughProgress();

  if (isEmbeddedEditorPreview || isFirstWelcome || urlParams.get('tab') === 'settings') {
    crm.currentFilter = 'settings';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    // Keep ?welcome=1 in the URL until the welcome modal is dismissed (refresh-safe).
    window.history.replaceState({}, '', cleanUrl);
  } else if (urlParams.get('tab') === 'bookings') {
    crm.currentFilter = 'bookings';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    window.history.replaceState({}, '', cleanUrl);
  } else if (urlParams.get('tab') === 'revenue' && crm.revenueEnabled) {
    crm.currentFilter = 'bookings';
    crm.bookingsSubview = 'revenue';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    window.history.replaceState({}, '', cleanUrl);
  } else if (urlParams.get('tab') === 'apps' || urlParams.get('tab') === 'phones') {
    crm.currentFilter = 'apps';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    window.history.replaceState({}, '', cleanUrl);
  } else if (!isFirstWelcome && verification && verification.subscribed) {
    // D6: live hotels open on Bookings — the daily-loop default ("anything new?").
    // Pre-activation hotels fall through to 'settings' so setup stays first.
    crm.currentFilter = 'bookings';
  }

  // Notifications deep-link to a surface, and the surface has to answer. A
  // support reply sent the owner to /frontdesk?support=1, nothing read the
  // parameter, and the app opened on whatever tab it would have anyway — so
  // tapping "Marketel replied" produced no reply.
  if (urlParams.get('support') === '1') {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('support');
    window.history.replaceState({}, '', cleanUrl);
    // After the first paint, so the conversation opens over a rendered app
    // rather than a blank one.
    window.setTimeout(() => {
      setNativeShellVisible(false);
      loadSupportModule().then((module) => module.openSupportConversation()).catch(() => {
        setNativeShellVisible(true);
        toast('Could not open support. Email support@bookmarketel.com.', 'error');
      });
    }, 0);
  }

  if (isFirstWelcome) {
    if (crm.revenueEnabled) seedTourRevenueShell();
    if (typeof loadSettingsModule === 'function') await loadSettingsModule();
    applyFilter();
    if (!bootstrapped) hydrateCrmInBackground();
  }

  if (shouldShowValueReveal) holdBootScreenForReveal();
  else document.getElementById('bootScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  hideNativePropertyScreen();
  document.getElementById('app').style.display = 'block';
  if (!isEmbeddedEditorPreview) setNativeShellVisible(true);

  // Track subscription status globally for banner visibility
  crm.hotelSubscribed = !!(verification && verification.subscribed);
  crm.marketelSubscriptionStatus = String(verification?.subscriptionStatus || '').trim().toLowerCase();
  crm.marketelSubscriptionPeriodEnd = String(verification?.subscriptionPeriodEnd || '').trim();
  crm.marketelTrialEligible = verification?.trialEligible !== false;
  crm.marketelTrialDays = Math.max(1, Number(verification?.trialDays) || 14);
  crm.operationalAccessOnly = !!verification?.operationalAccessOnly;
  crm.frontdeskAppStoreUrl = String(verification?.frontdeskAppStoreUrl || '').trim();
  crm.guestelWalletImageUrl = String(
    verification?.guestelWalletImageUrl || crm.guestelWalletImageUrl || ''
  ).trim();
  crm.guestelWalletFallbackImageUrl = String(
    verification?.guestelWalletFallbackImageUrl || crm.guestelWalletFallbackImageUrl || ''
  ).trim();
  crm.guestelWalletSubtitle = String(
    verification?.guestelWalletSubtitle || verification?.hotelAddress || crm.guestelWalletSubtitle || ''
  ).trim();
  // Returning-guest offer lives on the guest-facing Guestel tab, so keep it on crm state.
  crm.returnOfferEnabled = !!verification?.returnOfferEnabled;
  crm.returnOfferKind = verification?.returnOfferKind === 'amount' ? 'amount' : 'percent';
  crm.returnOfferValue = Number(verification?.returnOfferValue) || 0;
  if (crm.hotelSubscribed) {
    try {
      localStorage.removeItem('marketelValueRevealPendingV1');
      localStorage.removeItem('marketelValueRevealStepV1');
    } catch (_) {}
  }
  updateGoLiveBanner();
  void loadMarketelTrialStatus();
  if (!crm.hotelSubscribed) loadBlockedDemand();
  initializeFrontdeskJourney(isEmbeddedEditorPreview);

  // Device registration and property-list maintenance are useful, but neither
  // belongs on the critical path to the owner's bookings. Let the first frame
  // render before they compete for API/database time.
  const runNativeMaintenance = () => {
    syncNativeAuthenticatedSession();
    void refreshNativeProperties();
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(runNativeMaintenance, { timeout: 1800 });
  } else {
    setTimeout(runNativeMaintenance, 500);
  }

  const realignActiveTab = () => {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) moveSlider(activeTab);
  };
  requestAnimationFrame(realignActiveTab);
  setTimeout(realignActiveTab, 120);

  if (!isEmbeddedEditorPreview) {
    initMobileBottomNav();
    updateMobileRevenueNavVisibility();
    syncMobileNavActive(crm.currentFilter);
    syncNativeShellState();
    ensureLucideLoaded().then(() => {
      refreshMobileBottomNavIcons();
      requestAnimationFrame(refreshMobileBottomNavIcons);
    }).catch(() => {});
  }

  if (isEmbeddedEditorPreview) {
    if (typeof loadSettingsModule === 'function') await loadSettingsModule();
    crm.currentFilter = 'settings';
    applyFilter();
    initMobileBottomNav();
    updateMobileRevenueNavVisibility();
    syncMobileNavActive(crm.currentFilter);
    ensureLucideLoaded().then(() => {
      refreshMobileBottomNavIcons();
      requestAnimationFrame(refreshMobileBottomNavIcons);
    }).catch(() => {});
    installEmbeddedEditorPreview();
  } else if (shouldShowValueReveal) {
    try {
      if (typeof loadSettingsModule === 'function') await loadSettingsModule();
      const revealModule = await loadRevealModule();
      await revealModule.showMarketelValueReveal({ startAt: revealStartAt, previewActivation });
    } catch (error) {
      console.error('Marketel value reveal failed:', error);
      if (isFirstWelcome) showWelcomeModal();
    } finally {
      releaseBootScreenHold();
    }
  } else if (isFirstWelcome) {
    showWelcomeModal();
  } else if (bootstrapped) {
    // Bootstrap has already supplied the data needed for the first useful
    // screen. Render it synchronously and leave secondary alerts/messages to
    // idle time instead of requesting the same booking data again.
    applyFilter();
    refreshMobileBottomNavIcons();
    const loadSecondaryData = () => {
      loadBookingConflicts().catch(() => {});
      loadOperationalReadiness().catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadSecondaryData, { timeout: 2200 });
    } else {
      setTimeout(loadSecondaryData, 650);
    }
  } else {
    // The settings/tour code is lazy-loaded. A returning owner can sign in
    // directly to Bookings before that module has ever been installed, so an
    // unqualified cleanupSettingsTourUi() call crashes the native app here.
    // Only clean tour remnants when the module was actually loaded.
    if (settingsModulePromise) {
      try {
        const settingsModule = await settingsModulePromise;
        settingsModule.cleanupSettingsTourUi();
      } catch (error) {
        console.warn('Unable to clean up settings tour UI:', error);
      }
    }
    await Promise.allSettled([
      loadManualAvailability(),
      loadBookings({ deferMessages: true }),
      loadOperationalReadiness(),
    ]);

    refreshMobileBottomNavIcons();

    if (crm.currentFilter === 'bookings') {
      setFilter('bookings', document.querySelector('.tab[data-nav-filter="bookings"]'));
    } else if (crm.currentFilter === 'apps') {
      setFilter('apps', document.querySelector('.tab[data-nav-filter="apps"]')
        || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]'));
    }
  }

  if (!isNativeFrontdeskApp() && urlParams.get('action') === 'go-live') {
    window.history.replaceState({}, '', window.location.pathname);
    goLive();
  }

  if (urlParams.get('activated') === '1') {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('activated');
    window.history.replaceState({}, '', cleanUrl);
    if (crm.hotelSubscribed) {
      updateGoLiveBanner();
      const openActivatedModal = () => {
        const fn = (typeof showActivatedModal === 'function')
          ? showActivatedModal
          : (typeof window.showActivatedModal === 'function' ? window.showActivatedModal : null);
        if (fn) fn();
      };
      if (typeof loadSettingsModule === 'function') {
        loadSettingsModule().then(openActivatedModal).catch(openActivatedModal);
      } else {
        openActivatedModal();
      }
    } else {
      toast('Stripe has not confirmed this subscription yet. Refresh in a moment or contact support.', 'error');
    }
  }

  if (urlParams.get('billingReturn') === '1') {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('billingReturn');
    window.history.replaceState({}, '', cleanUrl);
    toast('Billing details updated.', 'success');
    // Stripe webhooks normally arrive first, but retry once to cover the
    // narrow race where the owner returns before subscription.updated lands.
    void loadMarketelTrialStatus();
    window.setTimeout(() => { void loadMarketelTrialStatus(); }, 1400);
  }

  if (urlParams.get('activation_error') === '1') {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('activation_error');
    window.history.replaceState({}, '', cleanUrl);
    toast('We could not verify the Stripe payment. Nothing was activated or charged twice.', 'error');
  }

  if (!isEmbeddedEditorPreview && !isFirstWelcome) {
    if (!localStorage.getItem('onboardingDone')) localStorage.setItem('onboardingDone', '1');
    // Don't mark tour done if a step is in progress (e.g. refresh mid-walkthrough).
    if (!localStorage.getItem('settingsTourDone') && !localStorage.getItem('settingsTourStep')) {
      localStorage.setItem('settingsTourDone', '1');
    }
    if (localStorage.getItem('settingsTourStep') === 'handoff') {
      localStorage.removeItem('settingsTourStep');
      if (!localStorage.getItem('settingsTourDone')) {
        const runFinale = () => {
          const showFinale = (typeof showFinaleMockModal === 'function')
            ? showFinaleMockModal
            : window.showFinaleMockModal;
          if (typeof showFinale === 'function') showFinale();
        };
        if (typeof loadSettingsModule === 'function') {
          loadSettingsModule().then(runFinale).catch(runFinale);
        } else {
          runFinale();
        }
      }
    }
  }

  // Running standalone is the only trustworthy install signal on iOS, where
  // 'appinstalled' never fires — record it every launch, server-side dedupes.
  if (!isEmbeddedEditorPreview && isStandaloneApp()) reportFrontdeskInstalled();

  const shouldOpenSupport = !isEmbeddedEditorPreview && urlParams.get('openSupport') === '1';
  if (shouldOpenSupport) {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('openSupport');
    window.history.replaceState({}, '', cleanUrl);
    requestAnimationFrame(() => openMarketelSupport());
  } else if (!isEmbeddedEditorPreview && isNativeFrontdeskApp()) {
    // The native app explains the operational value before iOS asks for
    // notification permission. Returning owners bypass this entirely.
    requestAnimationFrame(() => {
      loadNativeOnboardingModule()
        .then((module) => module.maybeStartNativeOnboarding())
        .catch((error) => console.warn('Unable to start native onboarding:', error));
    });
  } else if (!isEmbeddedEditorPreview) {
    // First time opening the INSTALLED PWA → offer to turn on booking alerts.
    maybePromptInstalledNotifications();
  }
}

async function doLogin() {
  const pin = document.getElementById('pinInput').value.trim();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('signInBtn');
  err.textContent = '';
  if (!crm.activeHotelId) { err.textContent = 'Property context is still loading'; return; }
  if (!pin) { err.textContent = 'Please enter PIN'; return; }

  const prevLabel = btn ? btn.textContent : 'Sign In';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Signing in…';
  }
  try {
    const verification = await verifyCrmToken(pin);
    crm.token = pin;
    try { localStorage.setItem('crmToken', crm.token); } catch(e) {}
    await startCrmApp(verification);
    upgradeToDurableSession(verification).catch(() => {});
  } catch (e) {
    err.textContent = e.message === 'Wrong PIN' ? 'Wrong PIN' : (e.message || 'Connection failed');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  }
}

function showMagicLinkForm(e) {
  e.preventDefault();
  document.getElementById('magicLinkForm').style.display = 'block';
  e.target.style.display = 'none';
}

function toggleWebLoginMethod(e) {
  if (e) e.preventDefault();
  const emailForm = document.getElementById('magicLinkForm');
  const pinForm = document.getElementById('webPinLoginForm');
  const prompt = document.getElementById('webLoginPrompt');
  const toggle = document.getElementById('webLoginMethodToggle');
  if (!emailForm || !pinForm || !toggle) return;
  const showingPin = pinForm.style.display !== 'none';
  emailForm.style.display = showingPin ? 'block' : 'none';
  pinForm.style.display = showingPin ? 'none' : 'block';
  toggle.textContent = showingPin ? 'Use Front Desk PIN instead' : 'Use email instead';
  if (prompt) {
    prompt.textContent = showingPin
      ? 'Front Desk — continue securely by email'
      : 'Front Desk — enter your property PIN';
  }
  const focusTarget = showingPin
    ? document.getElementById('magicLinkEmail')
    : document.getElementById('pinInput');
  setTimeout(() => focusTarget?.focus(), 0);
}

async function sendMagicLink() {
  const email = document.getElementById('magicLinkEmail').value.trim();
  const msg = document.getElementById('magicLinkMsg');
  if (!email) { msg.textContent = 'Please enter your email'; return; }
  try { localStorage.setItem('marketelOwnerEmail', email.toLowerCase()); } catch (_) {}
  msg.textContent = 'Sending…';
  try {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, hotelId: crm.activeHotelId || '' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      msg.textContent = data.message || 'No account found with that email.';
      msg.style.color = '#E05252';
      return;
    }
  } catch (e) {
    msg.textContent = 'Something went wrong. Try again.';
    msg.style.color = '#E05252';
    return;
  }
  msg.textContent = "Check your email — we sent you a login link.";
  msg.style.color = '#2E7D5B';
}

// ── API ────────────────────────────────────────────────
async function api(method, path, body) {
  if (!crm.activeHotelId) throw new Error('Property context is not loaded.');
  const url = new URL(path, marketelLocalUrlBase);
  if (!url.searchParams.get('hotelId')) {
    url.searchParams.set('hotelId', crm.activeHotelId);
  }

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-crm-token': crm.token,
      ...(isNativeFrontdeskApp() ? { 'x-marketel-client': 'ios' } : {}),
    },
  };
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (body || (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD')) {
    const payload = (body && typeof body === 'object' && !Array.isArray(body)) ? { ...body } : (body || {});
    if (payload.hotelId === undefined) payload.hotelId = crm.activeHotelId;
    opts.body = JSON.stringify(payload);
  }
  const res = await fetch(url.pathname + url.search, opts);
  if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
  // The server now says 503 when it could not verify the credential rather than
  // claiming it is invalid. Keep the session and surface it as retryable, so a
  // database blip never presents itself as a logout.
  if (res.status === 503) {
    const error = new Error('Front Desk is reconnecting. Try that again in a moment.');
    error.status = 503;
    error.retryable = true;
    throw error;
  }
  return res.json();
}

function showLogin() {
  logFrontdeskAuth('show-login', {
    activeHotelId: crm.activeHotelId || '',
    hadToken: !!crm.token,
    tokenKind: frontdeskTokenKind(crm.token),
    returnTokenPending: !!crm.frontdeskReturnTokenPending,
    lastAuthError: crm.lastAuthError || '',
  }, 'warn');
  document.getElementById('bootScreen').style.display = 'none';
  hideNativePropertyScreen();
  setNativeShellVisible(false);
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  const emailForm = document.getElementById('magicLinkForm');
  const pinForm = document.getElementById('webPinLoginForm');
  const prompt = document.getElementById('webLoginPrompt');
  const toggle = document.getElementById('webLoginMethodToggle');
  if (emailForm) emailForm.style.display = 'block';
  if (pinForm) pinForm.style.display = 'none';
  if (prompt) prompt.textContent = 'Front Desk — continue securely by email';
  if (toggle) toggle.textContent = 'Use Front Desk PIN instead';
  try {
    const savedEmail = localStorage.getItem('marketelOwnerEmail') || '';
    const emailInput = document.getElementById('magicLinkEmail');
    if (emailInput && !emailInput.value) emailInput.value = savedEmail;
  } catch (_) {}
  crm.token = '';
  crm.isMasterPin = false;
  crm.isDogfoodPreview = false;
  syncAdminReplayControl();
  crm.currentHotelPms = '';
  crm.revenueEnabled = false;
  crm.revenueCache = {};
  crm.revenueLoading = false;
  crm.revenueError = '';
  crm.assistantData = null;
  crm.assistantLoading = false;
  crm.assistantError = '';
  syncRevenueUi();
  try { localStorage.removeItem('crmToken'); } catch(e) {}
  // Keep the last resolved property after an expired/invalid credential. The
  // replacement login still needs that scope, and losing it made the generic
  // web Front Desk look like it had forgotten the owner's property as well as
  // their session. Explicit native sign-out clears its own selected property.
}

function showNativeAuthenticationError(error) {
  if (!isNativeFrontdeskApp()) return false;
  const message = error?.message || 'Sign in again to continue.';
  nativeSignOut();
  setNativePropertyMessage('nativePropertyMessage', message, 'error');
  return true;
}

// Browser credentials are exchanged for a property-scoped 90-day session as
// soon as one request proves them. This covers setup/Stripe handoff tokens and
// ordinary web PIN logins, so returning owners do not have to authenticate on
// every visit and their reusable PIN is not kept in browser storage. Native
// sessions already have their own durable identity. Failure is non-fatal: the
// proven credential remains usable and the next launch can try again.
async function upgradeToDurableSession(verification = null) {
  const token = String(crm.token || '');
  if (!token || isNativeFrontdeskApp() || token.startsWith('fds_') || token.startsWith('fdn_')) return;
  // Development master access should remain visibly administrative rather
  // than being converted into an ordinary property session.
  if (verification && verification.isMasterPin) return;
  if (crm.sessionUpgradeInFlight) return;
  crm.sessionUpgradeInFlight = true;
  try {
    const data = await api('POST', '/api/crm/session/exchange');
    if (data?.success && typeof data.token === 'string' && data.token.startsWith('fds_')) {
      crm.token = data.token;
      try { localStorage.setItem('crmToken', crm.token); } catch (_) {}
      logFrontdeskAuth('session-upgraded', { hotelId: data.hotelId || '' });
    }
  } catch (_) {
    // Keep the proven credential and retry on a future launch.
  } finally {
    crm.sessionUpgradeInFlight = false;
  }
}

function isAuthenticationFailure(error) {
  const status = Number(error?.status) || 0;
  return status === 401 || status === 403;
}

function shouldUseLegacyStartup(error) {
  const status = Number(error?.status) || 0;
  return !status || status === 404 || status === 408 || status === 429 || status >= 500;
}

async function bootCrmApp() {
  if (crm.bootInFlight) return;
  crm.bootInFlight = true;
  crm.activeHotelId = '';
  crm.activeHotelName = '';
  crm.activeHotelDomain = '';
  crm.activeHotelContext = null;
  updateHotelChrome();
  const requestedHotelId = getRequestedHotelId();
  const requestedProperty = isNativeFrontdeskApp()
    ? getNativeProperties().find(property => property.id === requestedHotelId)
    : null;
  showBootState({
    title: requestedProperty?.name ? `Opening ${requestedProperty.name}...` : 'Connecting to property...',
    message: isNativeFrontdeskApp()
      ? 'Loading your bookings and availability.'
      : 'Checking this domain and loading front desk context.',
    debug: formatContextDebugLines([
      isBundledNativeFrontdesk
        ? `App bundle host: ${getDetectedHostname() || 'localhost'} (normal)`
        : `Detected host: ${getDetectedHostname() || 'unknown'}`,
      requestedHotelId ? `Property ID: ${requestedHotelId}` : '',
    ]),
    showRetry: false,
  });

  // Magic-link verification owns startup until it has exchanged the emailed
  // credential. Holding here prevents a PIN screen flash and avoids a second
  // context request racing the secure return.
  if (crm._magicLoginPending) {
    showBootState({
      title: 'Opening your saved Marketel...',
      message: 'Returning you to the exact place you left off.',
      debug: '',
      showRetry: false,
    });
    crm.bootInFlight = false;
    return;
  }

  if (isNativeFrontdeskApp() && !getRequestedHotelId()) {
    showNativePropertyScreen({ choose: getNativeProperties().length > 0, allowCancel: false });
    crm.bootInFlight = false;
    return;
  }

  // Runs before the auth gate on purpose: the approval token proves itself, so a
  // notification tap can be answered without stopping to enter a PIN.
  maybeShowBookingReviewCard().catch(() => {});
  maybeShowBookingApprovalCard().catch(() => {});

  try {
    if (crm.token) {
      try {
        const verification = await loadCrmBootstrap();
        await startCrmApp(verification, { bootstrapped: true });
        // Bootstrap succeeding is the proof the credential works, which is the
        // right moment to trade browser auth for a lasting scoped session.
        upgradeToDurableSession(verification).catch(() => {});
        return;
      } catch (e) {
        // Safe rolling deploy: an already-installed native bundle may launch
        // while the backend is still on the prior release. Use the established
        // startup path until /bootstrap is available instead of signing the
        // owner out.
        if (shouldUseLegacyStartup(e)) {
          try {
            await loadHotelContext();
            const verification = await verifyCrmToken(crm.token);
            await startCrmApp(verification);
            upgradeToDurableSession(verification).catch(() => {});
            return;
          } catch (legacyError) {
            e = legacyError;
          }
        }
        crm.lastAuthError = e && e.message ? e.message : 'verify failed';
        // Only a real credential rejection should end the session. Anything else
        // — 503, 5xx, a dropped connection — is a reachability problem, and
        // signing the owner out for it is both wrong and alarming.
        if (!isAuthenticationFailure(e)) {
          showHotelContextError(e);
        } else if (!showNativeAuthenticationError(e)) {
          // Bootstrap authentication can fail before context is populated.
          // Web/PWA login still needs the resolved hotel in order to submit a
          // replacement PIN, so recover that lightweight context first.
          try {
            await loadHotelContext();
            showLogin();
          } catch (contextError) {
            showHotelContextError(contextError);
          }
        }
        return;
      }
    }
    await loadHotelContext();
    showLogin();
  } catch (e) {
    const legacyHotelId = resolveLegacyCrmHotelId();
    if (legacyHotelId && applyLegacyHotelContext(legacyHotelId, e && e.message ? e.message : 'hotel-context-load-failed')) {
      if (crm.token) {
        try {
          const verification = await verifyCrmToken(crm.token);
          await startCrmApp(verification);
          upgradeToDurableSession(verification).catch(() => {});
          return;
        } catch (verifyError) {
          crm.lastAuthError = verifyError && verifyError.message ? verifyError.message : 'legacy verify failed';
          if (!showNativeAuthenticationError(verifyError)) showLogin();
          return;
        }
      }
      showLogin();
      return;
    }
    showHotelContextError(e);
  } finally {
    crm.bootInFlight = false;
  }
}

// ── LOAD ───────────────────────────────────────────────
async function loadBookings(opts = {}) {
  const silent = !!opts.silent;
  try {
    const data = await api('GET', '/api/crm/bookings');
    if (!data.success) throw new Error(data.message);
    crm.bookings = data.data || [];
    if (!(crm.currentFilter === 'bookings' && crm.bookingsSubview === 'revenue')) crm.revenueCache = {};
    
    // Update counts
    const needsCalls = crm.bookings.filter(b => b.callStatus === 'not-called');
    const statEl = document.getElementById('statCount');
    if (statEl) statEl.textContent = needsCalls.length;
    updateBookingsTabBadge();
    
    if (silent) {
      if (opts.deferMessages) scheduleDeferredMessagesLoad();
      return;
    }
    // Render based on current filter
    applyFilter();
    loadBookingConflicts();
  } catch(e) {
    if (silent) return;
    if (e.message === 'Unauthorized') return;
    document.getElementById('bookingsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="circle-alert" style="width:26px;height:26px;"></i></div>
      <div class="empty-text">Could not load bookings</div>
      <div class="empty-sub">${esc(e.message)}</div>
      </div>`;
  }
}

// ── GUEST MESSAGES ─────────────────────────────────────
async function loadMessageBadges() {
  try {
    const data = await api('GET', '/api/crm/messages/unread-count');
    if (!data.success) return;
    crm.messageUnreadCount = Number(data.unread) || 0;
    updateMessageBadges();
  } catch (e) { /* non-fatal */ }
}

async function loadMessages() {
  if (messagesLoadPromise) return messagesLoadPromise;
  messagesLoadPromise = (async () => {
    try {
      const data = await api('GET', '/api/crm/messages');
      if (!data.success) return;
      crm.guestMessages = data.messages || [];
      crm.messageUnreadCount = crm.guestMessages.filter(
        message => !message.read && (message.sender || 'guest') !== 'hotel'
      ).length;
      updateMessageBadges();
      if (crm.currentFilter === 'apps' || crm.messagesExpanded) renderMessages();
    } catch (e) { /* non-fatal */ }
  })();
  try {
    return await messagesLoadPromise;
  } finally {
    messagesLoadPromise = null;
  }
}

function updateMessageBadges() {
  const appOnlySurface = isNativeFrontdeskApp()
    || document.body.classList.contains('frontdesk-editor-preview')
    || new URLSearchParams(window.location.search).get('previewEditor') === '1';
  const loadedUnread = crm.guestMessages.filter(
    message => !message.read && (message.sender || 'guest') !== 'hotel'
  ).length;
  const unread = !appOnlySurface
    ? 0
    : Math.max(loadedUnread, Number(crm.messageUnreadCount || 0));
  const badge = document.getElementById('msgUnreadBadge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? '' : 'none';
  }
  const dot = document.getElementById('msgUnreadDot');
  if (dot) dot.style.display = unread > 0 ? '' : 'none';
  updateBookingsTabBadge();
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function buildMessageThreads() {
  const threads = {};
  crm.guestMessages.forEach(m => {
    const key = m.reservationCode || m.id;
    if (!threads[key]) {
      threads[key] = {
        key,
        code: m.reservationCode,
        guestName: m.guestName,
        roomName: m.roomName,
        guestPhone: m.guestPhone,
        guestEmail: m.guestEmail,
        bookingStatus: m.bookingStatus || '',
        checkin: m.checkin || null,
        checkout: m.checkout || null,
        cancellationReason: m.cancellationReason || '',
        msgs: [],
      };
    }
    threads[key].msgs.push(m);
  });
  return Object.values(threads).sort((a, b) => {
    const aUnread = a.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest');
    const bUnread = b.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest');
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;
    const aLatest = new Date(Math.max(...a.msgs.map(m => new Date(m.createdAt))));
    const bLatest = new Date(Math.max(...b.msgs.map(m => new Date(m.createdAt))));
    return bLatest - aLatest;
  });
}

function pickDefaultMessageThread(threadList) {
  if (!threadList.length) return '';
  const unread = threadList.find(t => t.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest'));
  return (unread || threadList[0]).key;
}

function threadSummary(thread) {
  const hasUnread = thread.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest');
  const sorted = thread.msgs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const latest = sorted[sorted.length - 1];
  const preview = latest?.body
    ? latest.body.replace(/\s+/g, ' ').trim().slice(0, 56) + (latest.body.length > 56 ? '…' : '')
    : (latest?.requests?.length ? latest.requests.join(', ') : 'Request');
  return { hasUnread, latest, preview };
}

function toggleMessageThreadPicker() {
  crm.messagesThreadPickerOpen = !crm.messagesThreadPickerOpen;
  renderMessages();
}

function pickMessageThread(key) {
  crm.selectedMessageThread = key || '';
  crm.messagesThreadPickerOpen = false;
  renderMessages();
}

function toggleMessagesInbox() {
  crm.messagesInboxOpen = !crm.messagesInboxOpen;
  if (crm.messagesInboxOpen && !crm.selectedMessageThread) {
    crm.selectedMessageThread = pickDefaultMessageThread(buildMessageThreads());
  }
  if (!crm.messagesInboxOpen) crm.messagesThreadPickerOpen = false;
  renderMessages();
}

function setMessageThread(key) {
  pickMessageThread(key);
}

function normalizePhoneTarget(rawPhone) {
  const raw = String(rawPhone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+1${digits.slice(1)}`;
  // Keep a local 10-digit number local. iOS can dial it directly, and we
  // avoid manufacturing a second country-code digit in its confirmation UI.
  if (digits.length === 10) return digits;
  if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}

function messageGuestInitial(name) {
  return String(name || 'Guest').trim().charAt(0).toUpperCase() || 'G';
}

function renderMessageThreadDetail(thread) {
  const hasUnread = thread.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest');
  const phone = normalizePhoneTarget(thread.guestPhone);
  const email = (thread.guestEmail || '').trim();
  const bookingStatus = String(thread.bookingStatus || '').trim().toLowerCase();
  const bookingStateClass = ['cancelled', 'canceled', 'released'].includes(bookingStatus)
    ? 'dead'
    : bookingStatus === 'pending'
      ? 'pending'
      : 'confirmed';
  const bookingStateLabel = bookingStateClass === 'dead'
    ? (bookingStatus === 'released' ? 'Released' : 'Cancelled')
    : bookingStateClass === 'pending'
      ? 'Awaiting decision'
      : bookingStatus
        ? 'Confirmed'
        : '';
  const bookingStateNotice = bookingStateClass === 'dead'
    ? `<div class="message-booking-notice dead">This reservation is ${bookingStatus === 'released' ? 'released' : 'cancelled'}.${thread.cancellationReason ? ` ${esc(thread.cancellationReason)}` : ''}</div>`
    : bookingStateClass === 'pending'
      ? '<div class="message-booking-notice pending">This room request is still waiting for a keep or release decision.</div>'
      : '';
  const contactBtns = [
    phone ? `<a href="tel:${esc(phone)}" class="message-contact-btn primary" aria-label="Call ${esc(thread.guestName || 'guest')}">Call</a>` : '',
    phone ? `<a href="sms:${esc(phone)}" class="message-contact-btn">Text</a>` : '',
    email ? `<a href="mailto:${esc(email)}" class="message-contact-btn">Email</a>` : '',
  ].filter(Boolean).join('');

  const sortedMsgs = thread.msgs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const msgBubbles = sortedMsgs.map(m => {
    const isHotel = (m.sender || 'guest') === 'hotel';
    const chips = (m.requests || []).map(r =>
      `<span class="message-request-chip">${esc(r)}</span>`
    ).join('');
    return `
      <div class="message-row ${isHotel ? 'from-hotel' : 'from-guest'}">
        <div class="message-meta">${isHotel ? 'You' : esc(thread.guestName || 'Guest')} · ${esc(timeAgo(m.createdAt))}</div>
        ${chips ? `<div class="message-request-chips">${chips}</div>` : ''}
        ${m.body ? `<div class="message-bubble">${esc(m.body)}</div>` : ''}
      </div>`;
  }).join('');

  const replyInputId = 'activeMessageReply';
  return `
    <section class="message-thread-detail${hasUnread ? ' has-unread' : ''}">
      <div class="message-thread-heading">
        <div class="message-avatar">${esc(messageGuestInitial(thread.guestName))}</div>
        <div class="message-guest-copy">
          <div class="message-guest-name">
            ${hasUnread ? '<span class="message-unread-dot"></span>' : ''}
            ${esc(thread.guestName || 'Guest')}
          </div>
          <div class="message-booking-context">
            ${thread.roomName ? esc(thread.roomName) : 'Booking guest'}
            ${thread.code ? `<span>· #${esc(thread.code)}</span>` : ''}
            ${bookingStateLabel ? `<span class="message-booking-state ${bookingStateClass}">${esc(bookingStateLabel)}</span>` : ''}
          </div>
        </div>
        <div class="message-contact-actions">${contactBtns}</div>
      </div>
      <div class="message-conversation" id="activeMessageConversation">
        ${bookingStateNotice}
        ${msgBubbles}
      </div>
      ${hasUnread ? '<button type="button" class="message-mark-read" onclick="markActiveMessageThreadRead()">Mark conversation read</button>' : ''}
      ${thread.code ? `
      <div class="message-composer">
        <input id="${replyInputId}" type="text" placeholder="Message ${esc(thread.guestName || 'guest')}" maxlength="2000" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){event.preventDefault();replyToThread('${esc(thread.code)}','${replyInputId}')}" />
        <button type="button" onclick="replyToThread('${esc(thread.code)}','${replyInputId}')" aria-label="Send reply">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>
        </button>
      </div>` : ''}
    </section>`;
}

function renderMessageThreadPicker(threadList, activeThread) {
  const summary = threadSummary(activeThread);
  const pickerList = crm.messagesThreadPickerOpen ? `
    <div class="message-thread-menu">
      ${threadList.map(thread => {
        const s = threadSummary(thread);
        const isActive = thread.key === activeThread.key;
        return `
        <button type="button" onclick="pickMessageThread('${esc(thread.key)}')" class="message-thread-option${isActive ? ' active' : ''}">
          <span class="message-avatar small">${esc(messageGuestInitial(thread.guestName))}</span>
          <span class="message-thread-option-copy">
              <span class="message-thread-option-name">
                ${s.hasUnread ? '<span class="message-unread-dot"></span>' : ''}
                ${esc(thread.guestName || 'Guest')}
              </span>
              <span class="message-thread-option-preview">${esc(s.preview)}</span>
              <span class="message-thread-option-time">${esc(timeAgo(s.latest?.createdAt))}${thread.roomName ? ` · ${esc(thread.roomName)}` : ''}</span>
          </span>
          ${isActive ? '<span class="message-thread-check">✓</span>' : ''}
        </button>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="message-thread-picker">
      <span class="message-thread-picker-label">Conversation</span>
      <button type="button" onclick="toggleMessageThreadPicker()" class="message-thread-picker-button">
        <div class="message-thread-picker-copy">
          <div class="message-thread-option-name">
            ${summary.hasUnread ? '<span class="message-unread-dot"></span>' : ''}
            ${esc(activeThread.guestName || 'Guest')}
          </div>
          <div class="message-thread-option-preview">${esc(summary.preview)}</div>
        </div>
        <span class="message-thread-chevron${crm.messagesThreadPickerOpen ? ' open' : ''}">⌄</span>
      </button>
      ${pickerList}
    </div>`;
}

function renderMessageThreadList(threadList, activeThread) {
  return `<div class="messages-workspace-thread-list" role="list" aria-label="Guest conversations">
    ${threadList.map(thread => {
      const summary = threadSummary(thread);
      const isActive = thread.key === activeThread.key;
      return `<button type="button" role="listitem" class="messages-workspace-thread${isActive ? ' active' : ''}${summary.hasUnread ? ' unread' : ''}" onclick="openMessagesWorkspaceThread('${jsStr(thread.key)}')" aria-current="${isActive ? 'true' : 'false'}">
        <span class="message-avatar small">${esc(messageGuestInitial(thread.guestName))}</span>
        <span class="messages-workspace-thread-copy">
          <span class="messages-workspace-thread-line"><span class="messages-workspace-thread-name">${summary.hasUnread ? '<i></i>' : ''}${esc(thread.guestName || 'Guest')}</span><time>${esc(timeAgo(summary.latest?.createdAt))}</time></span>
          <span class="messages-workspace-thread-preview">${esc(summary.preview)}</span>
          <span class="messages-workspace-thread-context">${thread.roomName ? esc(thread.roomName) : 'Booked guest'}${thread.checkin ? ` · ${esc(formatMessageStayDates(thread.checkin, thread.checkout))}` : ''}</span>
        </span>
        ${summary.hasUnread ? `<span class="messages-workspace-thread-badge">${Math.min(99, thread.msgs.filter(m => !m.read && (m.sender || 'guest') === 'guest').length)}</span>` : '<span class="messages-workspace-thread-chevron">›</span>'}
      </button>`;
    }).join('')}
  </div>`;
}

function formatMessageStayDates(checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  if (!Number.isFinite(start.getTime())) return '';
  const fmt = { month: 'short', day: 'numeric' };
  return Number.isFinite(end.getTime())
    ? `${start.toLocaleDateString([], fmt)}–${end.toLocaleDateString([], fmt)}`
    : start.toLocaleDateString([], fmt);
}

function openMessagesWorkspaceThread(key) {
  crm.selectedMessageThread = key || crm.selectedMessageThread;
  crm.messagesWorkspaceThreadOpen = true;
  crm.messagesThreadPickerOpen = false;
  renderMessages();
  markActiveMessageThreadRead();
}

function handleMessagesWorkspaceBack() {
  if (window.matchMedia?.('(max-width: 700px)').matches && crm.messagesWorkspaceThreadOpen) {
    crm.messagesWorkspaceThreadOpen = false;
    renderMessages();
    return;
  }
  closeMessagesWorkspace();
}

function openMessagesWorkspace() {
  if (isNativeFrontdeskApp() && nativeShellPost({ type: 'openGuestMessages' })) return;
  crm.messagesExpanded = true;
  crm.messagesInboxOpen = true;
  // Guestel opens on its native conversation list on a phone. A desktop has
  // room for both panes, so the conversation represented by the tapped card is
  // immediately active there.
  crm.messagesWorkspaceThreadOpen = !window.matchMedia?.('(max-width: 700px)').matches;
  crm.messagesThreadPickerOpen = false;
  if (!crm.selectedMessageThread) crm.selectedMessageThread = pickDefaultMessageThread(buildMessageThreads());
  setNativeModalOpen('guest-messages', true);
  renderMessages();
  if (crm.messagesWorkspaceThreadOpen) markActiveMessageThreadRead();
}

function closeMessagesWorkspace() {
  crm.messagesExpanded = false;
  crm.messagesWorkspaceThreadOpen = false;
  crm.messagesThreadPickerOpen = false;
  messagesKeyboardCleanup?.();
  messagesKeyboardCleanup = null;
  document.getElementById('messagesWorkspace')?.remove();
  setNativeModalOpen('guest-messages', false);
  renderMessages();
}

function renderMessagesWorkspace(threadList, activeThread, unreadCount) {
  let workspace = document.getElementById('messagesWorkspace');
  if (!workspace) {
    workspace = document.createElement('div');
    workspace.id = 'messagesWorkspace';
    workspace.className = 'messages-workspace';
    document.body.appendChild(workspace);
    messagesKeyboardCleanup = bindChatKeyboardViewport(workspace, {
      fieldSelector: '.message-composer input',
      scrollSelector: '.message-conversation',
    });
  }
  workspace.classList.toggle('is-thread-open', !!crm.messagesWorkspaceThreadOpen);
  const showingThread = !!crm.messagesWorkspaceThreadOpen;
  workspace.innerHTML = `
    <header class="messages-workspace-header">
      <button type="button" class="messages-workspace-close" onclick="handleMessagesWorkspaceBack()" aria-label="${showingThread ? 'Back to conversations' : 'Close guest messages'}">${showingThread ? '‹' : 'Done'}</button>
      <div class="messages-workspace-heading">
        <div class="messages-workspace-title">${showingThread ? esc(activeThread.guestName || 'Guest') : 'Messages'}</div>
        <div class="messages-workspace-subtitle">${showingThread ? `${esc(activeThread.roomName || 'Booked guest')}${activeThread.checkin ? ` · ${esc(formatMessageStayDates(activeThread.checkin, activeThread.checkout))}` : ''}` : `${threadList.length} booking conversation${threadList.length === 1 ? '' : 's'}`}</div>
      </div>
      ${!showingThread && unreadCount > 0 ? `<button type="button" class="messages-workspace-read" onclick="markAllMessagesRead()">Read all</button>` : '<span></span>'}
    </header>
    <main class="messages-workspace-body">
      <aside class="messages-workspace-sidebar">
        <div class="messages-workspace-sidebar-heading">
          <strong>Conversations</strong>
          <span>${threadList.length}</span>
        </div>
        ${renderMessageThreadList(threadList, activeThread)}
      </aside>
      <div class="messages-workspace-chat">
        ${renderMessageThreadDetail(activeThread)}
      </div>
    </main>`;
  requestAnimationFrame(() => {
    const conversation = document.getElementById('activeMessageConversation');
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
    workspace.querySelector('.messages-workspace-thread.active')?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  });
}

function renderMessages() {
  const panel = document.getElementById('messagesPanel');
  if (!panel) return;

  const threadList = buildMessageThreads();
  if (threadList.length === 0) {
    if (crm.messagesExpanded) closeMessagesWorkspace();
    const pending = crm.messageUnreadCount > 0;
    panel.innerHTML = (pending ? `
      <div class="guest-messages-card loading">
        <div class="logo-sprite-bounce" style="width:22px;height:22px;flex-shrink:0;"></div>
        <div>Loading guest messages…</div>
      </div>` : `
      <section class="guest-messages-card guest-messages-empty">
        <span class="guest-messages-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        </span>
        <span><strong>No guest conversations yet</strong><small>After someone books, messages and replies stay with that reservation.</small></span>
      </section>`);
    if (pending && crm.currentFilter === 'apps') loadMessages();
    return;
  }

  const threadKeys = new Set(threadList.map(t => t.key));
  if (!crm.selectedMessageThread || !threadKeys.has(crm.selectedMessageThread)) {
    crm.selectedMessageThread = pickDefaultMessageThread(threadList);
  }

  const unreadCount = crm.guestMessages.filter(m => !m.read && (m.sender || 'guest') === 'guest').length;
  const activeThread = threadList.find(t => t.key === crm.selectedMessageThread) || threadList[0];

  if (crm.messagesExpanded) renderMessagesWorkspace(threadList, activeThread, unreadCount);
  else {
    messagesKeyboardCleanup?.();
    messagesKeyboardCleanup = null;
    document.getElementById('messagesWorkspace')?.remove();
  }

  const summary = threadSummary(activeThread);

  panel.innerHTML = `
    <section class="guest-messages-card">
      <button type="button" onclick="openMessagesWorkspace()" class="guest-messages-native-row">
        <span class="message-avatar">${esc(messageGuestInitial(activeThread.guestName))}</span>
        <span class="guest-messages-native-copy">
          <span class="guest-messages-native-line"><strong>${esc(activeThread.guestName || 'Guest')}</strong><time>${esc(timeAgo(summary.latest?.createdAt))}</time></span>
          <span class="guest-messages-native-preview">${esc(summary.preview)}</span>
          <small>${esc(activeThread.roomName || 'Booked guest')}${activeThread.checkin ? ` · ${esc(formatMessageStayDates(activeThread.checkin, activeThread.checkout))}` : ''}</small>
        </span>
        ${unreadCount > 0 ? `<span class="guest-messages-unread">${Math.min(99, unreadCount)}</span>` : '<span class="guest-messages-native-chevron">›</span>'}
      </button>
      ${threadList.length > 1 ? `<button type="button" class="guest-messages-all" onclick="openMessagesWorkspace()">View all ${threadList.length} conversations</button>` : ''}
    </section>`;
  // Messages load after the tab is already on screen, so the card replaces a
  // loading row rather than arriving with the page. Rise it in so the swap
  // reads as content settling instead of a jump.
  window.applyRiseStagger?.(panel);
}

function markActiveMessageThreadRead() {
  const active = buildMessageThreads().find(thread => thread.key === crm.selectedMessageThread);
  const pending = new Set((active?.msgs || [])
    .filter(message => !message.read && (message.sender || 'guest') === 'guest')
    .map(message => message.id));
  if (!pending.size) return;
  crm.guestMessages.forEach(message => {
    if (pending.has(message.id)) message.read = true;
  });
  crm.messageUnreadCount = crm.guestMessages.filter(
    message => !message.read && (message.sender || 'guest') !== 'hotel'
  ).length;
  updateMessageBadges();
  renderMessages();
  Promise.all([...pending].map(id =>
    api('POST', `/api/crm/messages/${encodeURIComponent(id)}/read`).catch(() => null)
  )).catch(() => {});
}

async function markMessageRead(id) {
  const msg = crm.guestMessages.find(m => m.id === id);
  if (msg) msg.read = true;
  crm.messageUnreadCount = crm.guestMessages.filter(
    message => !message.read && (message.sender || 'guest') !== 'hotel'
  ).length;
  updateMessageBadges();
  renderMessages();
  try { await api('POST', `/api/crm/messages/${encodeURIComponent(id)}/read`); }
  catch (e) { /* optimistic; ignore */ }
}

async function markAllMessagesRead() {
  crm.guestMessages.forEach(m => { m.read = true; });
  crm.messageUnreadCount = 0;
  updateMessageBadges();
  renderMessages();
  try { await api('POST', '/api/crm/messages/read-all'); }
  catch (e) { /* optimistic; ignore */ }
}

async function replyToThread(reservationCode, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const body = input.value.trim();
  if (!body) return;
  input.disabled = true;
  try {
    const data = await api('POST', `/api/crm/messages/${encodeURIComponent(reservationCode)}/reply`, { body });
    if (data.success && data.message) {
      // Add the reply to our local messages array so it renders immediately
      crm.guestMessages.push({
        id: data.message.id,
        reservationCode,
        guestName: crm.guestMessages.find(m => m.reservationCode === reservationCode)?.guestName || 'Guest',
        body: data.message.body,
        sender: 'hotel',
        createdAt: data.message.createdAt,
        read: true,
        requests: [],
      });
      input.value = '';
      renderMessages();
    }
  } catch (e) {
    console.error('Reply failed:', e);
  }
  input.disabled = false;
}

let currentViewRefreshPromise = null;

async function refreshCurrentView(options = {}) {
  if (currentViewRefreshPromise) return currentViewRefreshPromise;
  if (!crm.token || !crm.activeHotelId || document.getElementById('app').style.display === 'none') return;
  if (options.visibleOnly !== false && document.visibilityState === 'hidden') return;

  currentViewRefreshPromise = (async () => {
    // Every surface keeps lightweight booking/message badges fresh. The active
    // surface then reloads its own data without resetting unrelated editors or
    // forms that the owner may currently be using.
    if (crm.currentFilter === 'settings') {
      await Promise.allSettled([
        loadBookings({ silent: true, deferMessages: true }),
        loadMessageBadges(),
      ]);
      syncNativeShellState();
      return;
    }

    if (crm.currentFilter === 'apps') {
      const activeComposer = document.querySelector('.message-composer input');
      const composerBusy = !!activeComposer && (
        activeComposer === document.activeElement || String(activeComposer.value || '').trim().length > 0
      );
      await Promise.allSettled([
        loadBookings({ silent: true, deferMessages: true }),
        loadAppsModule().then(() => Promise.allSettled([
          loadGuestInstallStats(),
          composerBusy ? loadMessageBadges() : loadMessages(),
        ])),
      ]);
      syncNativeShellState();
      return;
    }

    if (crm.currentFilter === 'availability') {
      // Availability renders booking occupancy, so update the booking snapshot
      // first and then paint the room grid from that same snapshot.
      await loadBookings({ silent: true, deferMessages: true });
      await Promise.allSettled([
        loadManualAvailability(),
        loadMessageBadges(),
      ]);
      syncNativeShellState();
      return;
    }

    const tasks = [loadBookings(), loadMessageBadges()];
    if (crm.currentFilter === 'bookings') {
      tasks.push(loadOperationalReadiness({ force: options.force === true }));
    }
    if (crm.currentFilter === 'bookings' && crm.bookingsSubview === 'revenue' && crm.revenueEnabled) {
      tasks.push(loadRevenueData(options.force === true));
    }
    await Promise.allSettled(tasks);
    syncNativeShellState();
  })();

  try {
    return await currentViewRefreshPromise;
  } finally {
    currentViewRefreshPromise = null;
  }
}

let lastAutomaticRefreshAt = 0;
let nativeScrollInteractionActive = false;
let nativeScrollIdleTimer = 0;
let deferredAutomaticRefreshSource = '';

function markNativeScrollInteraction() {
  if (!isNativeFrontdeskApp()) return;
  nativeScrollInteractionActive = true;
  clearTimeout(nativeScrollIdleTimer);
  nativeScrollIdleTimer = setTimeout(() => {
    nativeScrollInteractionActive = false;
    if (!deferredAutomaticRefreshSource) return;
    const source = deferredAutomaticRefreshSource;
    deferredAutomaticRefreshSource = '';
    requestAutomaticRefresh(source);
  }, 280);
}

function requestAutomaticRefresh(source = 'automatic') {
  if (document.visibilityState === 'hidden') return;
  const activeElement = document.activeElement;
  const editing = !!activeElement && (
    activeElement.matches?.('input, textarea, select, [contenteditable="true"]')
  );
  if (isNativeFrontdeskApp() && (nativeScrollInteractionActive || editing)) {
    deferredAutomaticRefreshSource = source;
    return;
  }
  const now = Date.now();
  if (now - lastAutomaticRefreshAt < 1200) return;
  lastAutomaticRefreshAt = now;
  void refreshCurrentView({ force: source === 'manual' });
}

// ── RENDER ─────────────────────────────────────────────
const BOOKING_CARD_EST_HEIGHT = 156;
const BOOKING_VIRTUAL_THRESHOLD = 25;
const expandedBookingCards = new Set();

function toggleBookingDetails(bookingId) {
  const id = String(bookingId || '');
  const details = document.getElementById(`booking-details-${id}`);
  const card = document.getElementById(`booking-card-${id}`);
  const button = document.getElementById(`booking-toggle-${id}`);
  if (!details) return;
  const opening = details.hidden;
  details.hidden = !opening;
  card?.classList.toggle('is-expanded', opening);
  button?.setAttribute('aria-expanded', String(opening));
  if (opening) expandedBookingCards.add(id);
  else expandedBookingCards.delete(id);
}

function bookingCardHtml(b) {
  const isDeclined = b.notes && b.notes.includes('PAYMENT DECLINED');
  const ci = b.checkinDate ? new Date(b.checkinDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const co = b.checkoutDate ? new Date(b.checkoutDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const ago = timeAgo(b.createdAt);
  const normalizedPhone = normalizePhoneTarget(b.guestPhone);
  const phoneHref = normalizedPhone ? `tel:${normalizedPhone}` : '';
  const noteBtnClass = crm.currentFilter === 'needs-call' ? 'btn btn-note btn-note-quiet' : 'btn btn-note';
  const guestLabel = [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ') || 'this guest';
  const reviewStatus = String(b.ownerReviewStatus || '').toLowerCase();
  const fulfillmentStatus = String(b.fulfillmentStatus || '').toLowerCase();
  const isPendingApproval = String(b.status || '').toLowerCase() === 'pending';
  const pendingMinutes = isPendingApproval ? approvalMinutesLeft(b.pendingUntil) : 0;
  const pendingReleases = b.approvalNoResponseAction === 'release';
  const needsAttention = isDeclined
    || isPendingApproval
    || reviewStatus === 'unreviewed'
    || fulfillmentStatus === 'attention';
  const isExample = String(b.id) === 'preview-example-booking';
  const isExpanded = needsAttention || isExample || expandedBookingCards.has(String(b.id));
  const status = isDeclined
    ? { label: 'Card needs attention', tone: 'danger' }
    : (fulfillmentStatus === 'attention'
      ? { label: 'Guest action needed', tone: 'danger' }
      : (isPendingApproval
        ? { label: pendingMinutes ? `Decision due in ${pendingMinutes} min` : 'Decision due now', tone: 'attention' }
        : (reviewStatus === 'unreviewed'
          ? { label: 'Verify availability', tone: 'attention' }
          : (fulfillmentStatus === 'pending'
            ? { label: 'Sending guest update', tone: 'info' }
            : { label: 'Confirmed', tone: 'confirmed' }))));
  const detailNotice = isPendingApproval
    ? `<div class="reservation-notice reservation-notice--${pendingReleases ? 'attention' : 'info'}">
        <strong>Is this room still free?</strong>
        <span>No reply ${pendingReleases ? 'releases this request' : 'keeps this booking'}.</span>
      </div>`
    : (reviewStatus === 'unreviewed'
      ? '<div class="reservation-notice reservation-notice--attention"><strong>Check this room.</strong><span>Confirm it is still available before the guest arrives.</span></div>'
      : (fulfillmentStatus === 'attention'
        ? '<div class="reservation-notice reservation-notice--danger"><strong>The guest update needs attention.</strong><span>Open this booking to finish the handoff.</span></div>'
        : (isDeclined
          ? '<div class="reservation-notice reservation-notice--danger"><strong>The guest card could not be verified.</strong><span>Contact the guest before relying on this booking.</span></div>'
          : '')));
  const roomName = esc(b.roomName || 'Room');
  const nights = Number(b.nights) || 1;
  const guests = Number(b.guests) || 1;
  const fullName = [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ') || 'Guest';
  const amount = Number(b.grandTotal || 0).toFixed(2);
  return `
    <article class="booking-card reservation-card reservation-card--${status.tone}${isExpanded ? ' is-expanded' : ''}${isExample ? ' reservation-card--example' : ''}" id="booking-card-${esc(b.id)}">
      <button class="reservation-summary" id="booking-toggle-${esc(b.id)}" type="button" aria-expanded="${isExpanded}" aria-controls="booking-details-${esc(b.id)}" onclick="toggleBookingDetails('${b.id}')">
        <span class="reservation-summary-copy">
          <span class="reservation-primary-row">
            <span class="guest-name">${esc(fullName)}</span>
            <span class="card-amount">$${amount}</span>
          </span>
          <span class="reservation-trip-line">
            <span>${roomName}</span><span aria-hidden="true">·</span><span>${ci} – ${co}</span><span aria-hidden="true">·</span><span>${nights} night${nights !== 1 ? 's' : ''}</span>
          </span>
          <span class="reservation-status-row">
            <span class="reservation-status reservation-status--${status.tone}"><span class="reservation-status-dot" aria-hidden="true"></span>${status.label}</span>
            <span class="reservation-payment">${isDeclined ? 'Payment not verified' : 'Collect at check-in'} · ${ago}</span>
          </span>
        </span>
        <span class="reservation-chevron" aria-hidden="true"></span>
      </button>
      <div class="reservation-details" id="booking-details-${esc(b.id)}" ${isExpanded ? '' : 'hidden'}>
        ${detailNotice}
        <div class="reservation-detail-grid">
          <div class="reservation-detail-item">
            <span>Check-in</span>
            <strong>${ci}</strong>
          </div>
          <div class="reservation-detail-item">
            <span>Check-out</span>
            <strong>${co}</strong>
          </div>
          <div class="reservation-detail-item">
            <span>Guests</span>
            <strong>${guests}</strong>
          </div>
        </div>
        <div class="reservation-contact">
          <div>
            <span>Phone</span>
            ${phoneHref ? `<a href="${phoneHref}">${esc(b.guestPhone)}</a>` : '<strong>No phone provided</strong>'}
          </div>
          <div>
            <span>Email</span>
            ${b.guestEmail ? `<a href="mailto:${esc(b.guestEmail)}">${esc(b.guestEmail)}</a>` : '<strong>No email provided</strong>'}
          </div>
        </div>
        ${b.notes ? `
        <div class="card-notes">
          <div class="notes-header">
            <div class="notes-title">Notes</div>
          </div>
          <div class="notes-content">${esc(b.notes)}</div>
        </div>
        ` : ''}
        <div class="card-footer">
          ${isPendingApproval
            ? `<button class="btn btn-confirm" type="button" onclick="decideBookingFromCard('${b.id}', 'confirm')">Yes, keep it</button>`
            : (reviewStatus === 'unreviewed'
            ? `<button class="btn btn-confirm" type="button" onclick="openBookingReviewFromCard('${b.id}')">Verify room</button>`
            : (phoneHref ? `<a class="btn btn-confirm" href="${phoneHref}" style="text-decoration:none;text-align:center;">Call guest</a>` : `<button class="btn btn-confirm" disabled>No phone</button>`))}
          ${isPendingApproval
            ? `<button class="btn btn-note" type="button" style="color:#b91c1c;" onclick="decideBookingFromCard('${b.id}', 'release')">No, release</button>`
            : `<button class="${noteBtnClass}" onclick="addNote('${b.id}', ${esc(JSON.stringify(b.notes || ''))})">${b.notes ? 'Edit note' : 'Add note'}</button>`}
        </div>
        ${isDeclined ? `<div style="margin-top:8px;text-align:right;">
          <button type="button" onclick="dismissDeclinedLead('${b.id}', ${esc(JSON.stringify(guestLabel))})" style="padding:6px 10px;border-radius:8px;border:none;background:none;color:#b91c1c;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;">Remove from Bookings</button>
        </div>` : (isPendingApproval ? '' : `<div style="margin-top:8px;text-align:right;">
          <button type="button" onclick="promptCancelBooking('${b.id}', ${esc(JSON.stringify(guestLabel))})" style="padding:6px 10px;border-radius:8px;border:none;background:none;color:#b91c1c;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;">Cancel this booking</button>
        </div>`)}
      </div>
    </article>`;
}

async function dismissDeclinedLead(id, guestLabel) {
  const label = String(guestLabel || 'this guest');
  if (!window.confirm(`Remove the declined card attempt for ${label} from Bookings?`)) return;
  const card = document.getElementById(`booking-card-${id}`);
  if (card) {
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.55';
  }
  try {
    const result = await api('PATCH', `/api/crm/payment-declined/${encodeURIComponent(id)}`, { called: true });
    if (!result?.success) throw new Error(result?.message || 'Could not remove this card attempt.');
    crm.bookings = crm.bookings.filter((booking) => String(booking.id) !== String(id));
    expandedBookingCards.delete(String(id));
    renderBookings();
    refreshRoomBadge();
    toast('Removed from Bookings', 'success');
  } catch (error) {
    if (card) {
      card.style.pointerEvents = '';
      card.style.opacity = '';
    }
    toast(error?.message || 'Could not remove this card attempt.', 'error');
  }
}

function ensureBookingsVirtualScroll() {
  const el = document.getElementById('bookingsList');
  if (!el || el.dataset.virtualBound === '1') return;
  el.dataset.virtualBound = '1';
  el.classList.add('bookings-virtual');
  el.addEventListener('scroll', () => {
    if (crm.bookingsVirtualRaf) return;
    crm.bookingsVirtualRaf = requestAnimationFrame(() => {
      crm.bookingsVirtualRaf = 0;
      renderBookingsWindow();
    });
  }, { passive: true });
}

function renderBookingsWindow() {
  const el = document.getElementById('bookingsList');
  const list = crm.bookingsVirtualList;
  if (!el || !list.length) return;
  const scrollTop = el.scrollTop || 0;
  const viewHeight = el.clientHeight || window.innerHeight;
  const start = Math.max(0, Math.floor(scrollTop / BOOKING_CARD_EST_HEIGHT) - 2);
  const end = Math.min(list.length, Math.ceil((scrollTop + viewHeight) / BOOKING_CARD_EST_HEIGHT) + 2);
  const topPad = start * BOOKING_CARD_EST_HEIGHT;
  const bottomPad = Math.max(0, (list.length - end) * BOOKING_CARD_EST_HEIGHT);
  el.innerHTML = `<div style="height:${topPad}px" aria-hidden="true"></div>`
    + list.slice(start, end).map(bookingCardHtml).join('')
    + `<div style="height:${bottomPad}px" aria-hidden="true"></div>`;
}

function embeddedExampleBookingHtml() {
  const room = (crm.editRooms || [])[0] || {};
  const roomName = room.name || 'Your first room';
  const rateInput = document.getElementById('edit-rate-nightly');
  const nightlyRate = Number(rateInput?.value || crm.editRates?.nightly);
  const amount = Number.isFinite(nightlyRate) && nightlyRate > 0 ? nightlyRate : 99;
  const checkin = new Date();
  checkin.setHours(12, 0, 0, 0);
  checkin.setDate(checkin.getDate() + 1);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + 1);
  const exampleBooking = {
    id: 'preview-example-booking',
    guestFirstName: 'Example',
    guestLastName: 'Guest',
    guestPhone: '(555) 014-7284',
    guestEmail: 'example@guest.com',
    roomName,
    nights: 1,
    guests: 2,
    grandTotal: amount,
    checkinDate: checkin.toISOString(),
    checkoutDate: checkout.toISOString(),
    createdAt: new Date().toISOString(),
    callStatus: 'not-called',
    ownerReviewStatus: 'available',
    notes: 'Arriving around 8 PM. Please send check-in details.',
  };

  return `
    <section class="embedded-example-booking" aria-label="Example direct booking">
      <div class="embedded-example-booking-heading">
        <div>
          <span class="embedded-example-kicker">Booking preview</span>
          <strong>Direct bookings land here.</strong>
          <p>This is an example of what you will see when a guest books your page.</p>
        </div>
        <span class="embedded-example-badge">Example</span>
      </div>
      <div class="embedded-example-booking-card">${bookingCardHtml(exampleBooking)}</div>
    </section>`;
}

// Cards arrive top-down instead of the whole list flashing in at once. The
// index is set per element so one keyframe serves any list length, and the
// whole thing is skipped under reduced motion rather than run at 0ms.
function applyRiseStagger(container, selector) {
  if (!container) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const children = container.querySelectorAll(selector || ':scope > *');
  children.forEach((child, index) => {
    child.style.setProperty('--rise-index', String(index));
    child.classList.add('marketel-rise');
  });
}

function renderBookings(fullList) {
  const el = document.getElementById('bookingsList');
  if (!el) return;
  fullList = fullList || [];
  el.classList.remove('bookings-virtual');
  delete el.dataset.virtualBound;
  crm.bookingsVirtualList = [];

  // The embedded sales preview should demonstrate the outcome of the booking
  // engine, not onboard the prospect as though they already bought it. Keep the
  // example entirely presentational so it can never enter real booking logic.
  if (document.body.classList.contains('frontdesk-editor-preview')) {
    renderBookingFilterChips({ all: 0, needs: 0, called: 0 });
    el.innerHTML = embeddedExampleBookingHtml();
    return;
  }

  // D17: counts come from the full set; the chips apply a view filter.
  const counts = {
    all: fullList.length,
    needs: fullList.filter(b => b.callStatus === 'not-called').length,
    called: fullList.filter(b => b.callStatus !== 'not-called').length,
  };
  renderBookingFilterChips(counts);

  let list = fullList;
  if (crm.bookingCallFilter === 'needs') list = fullList.filter(b => b.callStatus === 'not-called');
  else if (crm.bookingCallFilter === 'called') list = fullList.filter(b => b.callStatus !== 'not-called');

  // D17: a filter that matches nothing (but bookings exist) shows a quiet note,
  // never the launch checklist.
  if (list.length === 0 && fullList.length > 0) {
    const label = crm.bookingCallFilter === 'needs' ? 'No bookings need a call right now' : 'No called bookings yet';
    el.innerHTML = `<div class="empty-state" style="padding:32px 0;"><div class="empty-text" style="font-size:15px;">${label}</div><div class="empty-sub">Switch filters above to see your other bookings.</div></div>`;
    return;
  }

  if (list.length === 0) {
    // Launch checklist completion is derived from SERVER truth (rooms + rates),
    // not browser-local flags — a localStorage flag is wrong across devices and
    // after a reinstall. localStorage flags are kept only as an optimistic OR.
    if (crm.launchStatus === null) loadLaunchStatus();
    const hasPhoto = crm.launchStatus
      ? crm.launchStatus.photo
      : (crm.editRooms.length > 0 ? crm.editRooms.some(r => (r.images && r.images.length > 0) || r.imageUrl) : false);
    const hasRates = (crm.launchStatus ? crm.launchStatus.rates : false) || !!localStorage.getItem('ratesChanged');
    const hasSharedLink = !!localStorage.getItem('linkCopied') || crm.hotelSubscribed;

    const checkIcon = (done) => done 
      ? '<div style="width:24px;height:24px;border-radius:50%;background:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
      : '<div style="width:24px;height:24px;border-radius:6px;border:2px solid #d0d7d3;flex-shrink:0;"></div>';

    const allDone = hasPhoto && hasSharedLink && hasRates;

    if (allDone && crm.hotelSubscribed) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
          <div class="empty-text">You&apos;re live — waiting for bookings</div>
          <div class="empty-sub" style="margin-bottom:12px;">Share your link to start getting direct reservations.</div>
          <button onclick="copyBookingLinkFromChecklist()" style="padding:12px 24px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Your Link</button>
          <div style="margin-top:12px;"><button onclick="openGrowthWorkspace()" style="background:none;border:none;color:#2E7D5B;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;">See how to get found →</button></div>
        </div>`;
    } else if (allDone && !crm.hotelSubscribed) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
          <div class="empty-text">Your page is ready to go live</div>
          <div class="empty-sub" style="margin-bottom:12px;">Everything&apos;s set up. ${crm.marketelTrialEligible !== false ? 'Start 14 days of full access for $0 today.' : 'Reactivate to start accepting direct bookings again.'}${crm.blockedDemand && crm.blockedDemand.total > 0 ? ` <strong>${crm.blockedDemand.total} guest${crm.blockedDemand.total>1?'s':''} already tried to book.</strong>` : ''}</div>
          <button onclick="goLive()" style="padding:12px 24px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${crm.marketelTrialEligible !== false ? 'Start 14 days free' : 'Reactivate — $199/month'} →</button>
        </div>`;
      if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 0);
    } else {
      el.innerHTML = `
        <div style="padding:20px 0;">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:18px;font-weight:700;color:#1a1a2e;">Launch checklist</div>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Finish these on the <strong>Your page</strong> tab, then activate when ready</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button onclick="checklistGoTo('#editRoomsCards label', 'Tap here to add your photo')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:white;border-radius:12px;border:1.5px solid ${hasPhoto ? '#2E7D5B' : '#e5e7eb'};cursor:pointer;text-align:left;font-family:inherit;width:100%;">
              ${checkIcon(hasPhoto)}
              <div>
                <div style="font-size:14px;font-weight:600;color:#1a1a2e;">Add a photo to your room</div>
                <div style="font-size:12px;color:#6b7280;">Guests book more when they see photos</div>
              </div>
            </button>
            <button onclick="checklistGoToRates()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:white;border-radius:12px;border:1.5px solid ${hasRates ? '#2E7D5B' : '#e5e7eb'};cursor:pointer;text-align:left;font-family:inherit;width:100%;">
              ${checkIcon(hasRates)}
              <div>
                <div style="font-size:14px;font-weight:600;color:#1a1a2e;">Change your rates</div>
                <div style="font-size:12px;color:#6b7280;">Set your nightly, weekly, and monthly pricing</div>
              </div>
            </button>
            <button onclick="copyBookingLinkFromChecklist()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:white;border-radius:12px;border:1.5px solid ${hasSharedLink ? '#2E7D5B' : '#e5e7eb'};cursor:pointer;text-align:left;font-family:inherit;width:100%;">
              ${checkIcon(hasSharedLink)}
              <div>
                <div style="font-size:14px;font-weight:600;color:#1a1a2e;">Share your booking link</div>
                <div style="font-size:12px;color:#6b7280;">Text it to a guest or add to Google Business</div>
              </div>
            </button>
          </div>
        </div>`;
    }
    return;
  }

  // WKWebView must keep one scrolling surface. A nested virtual list creates
  // the "page inside a page" effect when its scroll reaches either edge.
  if (list.length > BOOKING_VIRTUAL_THRESHOLD && !isNativeFrontdeskApp()) {
    crm.bookingsVirtualList = list;
    ensureBookingsVirtualScroll();
    renderBookingsWindow();
    return;
  }

  el.innerHTML = list.map(bookingCardHtml).join('');
  applyRiseStagger(el);
}

// ── FILTER TABS ────────────────────────────────────────
function refreshMobileBottomNavIcons() {
  if (typeof lucide === 'undefined' || typeof lucide.createIcons !== 'function') {
    ensureLucideLoaded().then(() => refreshMobileBottomNavIcons()).catch(() => {});
    return;
  }
  const root = document.getElementById('mobileBottomNav');
  if (!root || !root.querySelector('i[data-lucide]')) return;
  try {
    lucide.createIcons();
  } catch (e) { /* ignore */ }
}

function syncMobileNavActive(filter) {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav) return;
  nav.querySelectorAll('.mobile-nav-item').forEach((n) => {
    const f = n.getAttribute('data-nav-filter');
    const match = f === filter;
    n.classList.toggle('active', match);
    if (match) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  });
}

function updateMobileRevenueNavVisibility() {
  if (!crm.revenueEnabled && crm.bookingsSubview === 'revenue') {
    crm.bookingsSubview = 'bookings';
  }
}

function initMobileBottomNav() {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav || nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';
  nav.addEventListener('click', (e) => {
    const item = e.target.closest('.mobile-nav-item');
    if (!item || item.classList.contains('mobile-nav-item--hidden')) return;
    const filter = item.getAttribute('data-nav-filter');
    if (!filter) return;
    setFilter(filter, item);
  });

  // Mobile keeps a single Bookings bucket.
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches && (crm.currentFilter === 'needs-call' || crm.currentFilter === 'called')) {
    const bookingsBtn = nav.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');
    setFilter('bookings', bookingsBtn);
  }
}

function setFilter(filter, btn) {
  // Backward-compatible links and old native shells still route "revenue"
  // here. Revenue now lives inside Bookings, so quietly map them to the
  // Bookings tab and select its Revenue segment.
  if (filter === 'revenue') {
    if (!crm.revenueEnabled) return;
    filter = 'bookings';
    crm.bookingsSubview = 'revenue';
    btn = document.querySelector('.tab[data-nav-filter="bookings"]')
      || document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');
  }
  crm.currentFilter = filter;
  syncNativeShellState();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  let tabBtn = null;
  if (btn && btn.classList && btn.classList.contains('tab')) {
    tabBtn = btn;
  } else {
    tabBtn = document.querySelector(`.tab[data-nav-filter="${filter}"]`);
  }
  if (tabBtn) {
    tabBtn.classList.add('active');
    moveSlider(tabBtn);
  }
  syncMobileNavActive(filter);
  if (filter === 'availability') {
    applyFilter();
    if ((crm.manualAvailability.rooms || []).length) {
      renderAvailabilityView();
      updateGoLiveBanner();
      return;
    }
    const calWrap = document.getElementById('availabilityCalendarWrap');
    const noRoom = document.getElementById('availabilityNoRoom');
    if (calWrap) calWrap.style.display = 'none';
    if (noRoom) { noRoom.style.display = 'block'; noRoom.innerHTML = '<div class="loading"><div class="logo-sprite-bounce"></div> Loading availability…</div>'; }
    loadManualAvailability().then(() => { renderAvailabilityView(); }).catch(() => { renderAvailabilityView(); });
    updateGoLiveBanner();
    return;
  }
  applyFilter();
  if (filter === 'bookings') {
    if (crm.bookingsSubview === 'revenue') {
      if (crm.settingsTourActive) {
        seedTourRevenueShell();
        renderRevenueView();
      } else if (crm.revenueCache[revenueCacheKey()] && !crm.revenueLoading) {
        renderRevenueView();
      } else {
        loadRevenueData(true);
      }
    }
  }
  updateGoLiveBanner();
}

function moveSlider(activeTab) {
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) return;
  const slider = document.getElementById('tabsSlider');
  const tabs = activeTab ? activeTab.closest('.tabs-container') : null;
  if (!slider || !activeTab || !tabs) return;

  const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  const tabRect = activeTab.getBoundingClientRect();
  const tabsRect = tabs.getBoundingClientRect();
  const cs = getComputedStyle(tabs);

  if (isDesktop) {
    // Vertical sidebar: slide the highlight down to the active tab.
    const borderTop = parseFloat(cs.borderTopWidth) || 0;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const top = tabRect.top - tabsRect.top + tabs.scrollTop - borderTop - padTop;
    slider.style.width = 'calc(100% - 10px)';
    slider.style.height = `${Math.round(tabRect.height)}px`;
    slider.style.transform = `translateY(${Math.round(top)}px)`;
  } else {
    // Horizontal pills: slide the highlight across to the active tab.
    const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    // Slider is `left: Npx` from the padding edge; delta from border box must subtract border + padding.
    const left = tabRect.left - tabsRect.left + tabs.scrollLeft - borderLeft - padLeft;
    slider.style.width = `${Math.round(tabRect.width)}px`;
    slider.style.height = 'calc(100% - 10px)';
    slider.style.transform = `translateX(${Math.round(left)}px)`;
  }
}

// Call on load to position slider under the default active tab
document.addEventListener('DOMContentLoaded', () => {
  ensureAvailabilityUi();
  syncRevenueUi();
  initMobileBottomNav();
  updateMobileRevenueNavVisibility();
  syncMobileNavActive(crm.currentFilter);
  refreshMobileBottomNavIcons();
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) moveSlider(activeTab);

  const tabs = document.querySelector('.tabs-container');
  if (tabs) {
    tabs.addEventListener('scroll', () => {
      const current = document.querySelector('.tab.active');
      if (current) moveSlider(current);
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    const current = document.querySelector('.tab.active');
    if (current) moveSlider(current);
    if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches && (crm.currentFilter === 'needs-call' || crm.currentFilter === 'called')) {
      const bookingsBtn = document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');
      setFilter('bookings', bookingsBtn);
      return;
    }
    syncMobileNavActive(crm.currentFilter);
  });

  window.addEventListener('load', refreshMobileBottomNavIcons, { once: true });
});

function twoRoomExplainerHtml(context) {
  const isBookingPage = context === 'booking-page';
  if (isBookingPage) return '';
  const bookingNames = (crm.editRooms || []).map((r) => r.name).filter(Boolean);
  const namesHint = bookingNames.length
    ? `Your booking page has: <strong>${bookingNames.map((n) => esc(n)).join(', ')}</strong>. Refresh once; Marketel will restore a missing Availability row without deleting saved dates.`
    : 'Add your first room here. You can add its photos and description under <strong>Your page</strong> afterward.';
  return `<div class="two-room-explainer">
    <div class="two-room-explainer-title">Add your first room to open the calendar</div>
    <div class="two-room-cols">
      <div class="two-room-col">
        <div class="two-room-col-label">Your page</div>
        Guest-facing rooms — photos, copy, rates.
      </div>
      <div class="two-room-col two-room-col--here">
        <div class="two-room-col-label">Availability (here)</div>
        Day-by-day counts — how many units are open to sell.
      </div>
    </div>
    <p class="two-room-explainer-foot">${namesHint}</p>
    <div class="two-room-explainer-actions">
      <button type="button" class="two-room-btn two-room-btn--primary" onclick="openRoomsAddModal()">+ Add room</button>
      <button type="button" class="two-room-btn two-room-btn--ghost" onclick="setFilter('settings', document.querySelector('[data-nav-filter=\\'settings\\']'))">← Back to Your page</button>
    </div>
  </div>`;
}
window.twoRoomExplainerHtml = twoRoomExplainerHtml;

function goToAvailabilityTab() {
  const tabBtn = document.querySelector('.tab[data-nav-filter="availability"]')
    || document.querySelector('.mobile-nav-item[data-nav-filter="availability"]');
  setFilter('availability', tabBtn);
}

function renderAvailabilityEmptyState() {
  const noRoom = document.getElementById('availabilityNoRoom');
  if (!noRoom) return;
  const fn = typeof twoRoomExplainerHtml === 'function' ? twoRoomExplainerHtml : window.twoRoomExplainerHtml;
  noRoom.innerHTML = fn ? fn('availability') : '';
  noRoom.style.display = 'block';
}

function isEditPageDomReady() {
  const list = document.getElementById('editRoomsList');
  if (!list) return false;
  const nightly = list.querySelector('#edit-rate-nightly');
  return !!nightly && !nightly.readOnly;
}
window.isEditPageDomReady = isEditPageDomReady;

function needsEditPageLoad() {
  return !isEditPageDomReady();
}
window.needsEditPageLoad = needsEditPageLoad;

async function refreshRatesInputs() {
  const nightlyEl = document.getElementById('edit-rate-nightly');
  if (!nightlyEl || nightlyEl.readOnly) return;
  try {
    const res = await api('GET', '/api/crm/rooms');
    if (!res?.rates) return;
    nightlyEl.value = res.rates.nightly;
    const weeklyEl = document.getElementById('edit-rate-weekly');
    const monthlyEl = document.getElementById('edit-rate-monthly');
    if (weeklyEl) weeklyEl.value = res.rates.weekly;
    if (monthlyEl) monthlyEl.value = res.rates.monthly;
  } catch (e) { /* ignore */ }
}
window.refreshRatesInputs = refreshRatesInputs;

function applyGuestBroadcastAudienceUi() {
  const audience = document.getElementById('guest-broadcast-audience');
  const btn = document.getElementById('guest-broadcast-btn');
  const count = crm.guestPushSubscriberCount || 0;
  if (audience) {
    audience.textContent = count === 0
      ? 'No Guestel devices have opted into property updates yet. Share your Guestel QR first.'
      : count === 1
        ? '1 opted-in device can receive this notification.'
        : count + ' opted-in devices can receive this notification.';
    audience.style.color = count === 0 ? 'var(--text-muted)' : '#166534';
    audience.style.fontWeight = count === 0 ? '500' : '700';
    audience.style.background = count === 0 ? 'var(--bg)' : '#f0fdf4';
    audience.style.borderColor = count === 0 ? 'var(--border)' : '#bbf7d0';
  }
  if (btn) {
    const enabled = count > 0;
    btn.disabled = !enabled;
    btn.textContent = enabled
      ? `Send to ${count} guest${count === 1 ? '' : 's'}`
      : 'No guests to notify yet';
    btn.style.background = enabled ? 'var(--green)' : '#c5d5cc';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    btn.style.opacity = enabled ? '1' : '0.9';
  }
}

function updateGuestBroadcastPreview() {
  const title = document.getElementById('guest-broadcast-title')?.value.trim();
  const body = document.getElementById('guest-broadcast-body')?.value.trim();
  const previewTitle = document.getElementById('guest-broadcast-preview-title');
  const previewBody = document.getElementById('guest-broadcast-preview-body');
  if (previewTitle) previewTitle.textContent = title || (crm.activeHotelName || 'Your Property');
  if (previewBody) previewBody.textContent = body || 'Your message will appear here as you type.';
}

function guestBroadcastCardHtml(options = {}) {
  const compact = !!options.compact;
  const rawName = crm.activeHotelName || 'Your Property';
  const hName = esc(rawName);
  const hNameAttr = hName;
  // Native iOS notifications always carry the sending app's fixed icon.
  // Property branding belongs in the notification title and Guestel card;
  // pretending iOS swaps the app icon per hotel makes this preview dishonest.
  const appIcon = `<img src="${esc(guestelAppIconUrl)}" alt="Guestel">`;
  return `<div id="guestBroadcastCard" class="apps-broadcast-card guest-reach-card" data-compact="${compact ? 'true' : 'false'}">
    <div id="tour-guest-reach" class="guest-reach-intro">
      <div class="guest-reach-kicker">Guestel notifications</div>
      <div class="guest-reach-title">Reach guests who choose to hear from you.</div>
      <p>When a guest keeps your property in Guestel and allows property updates, you can send a push notification directly to their phone from Marketel Front Desk.</p>
    </div>
    <div id="guest-broadcast-audience" style="font-size:12px;line-height:1.45;margin:0 0 12px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text-muted);">Checking who can receive notifications…</div>
    <div class="guest-notification-demo" aria-label="Preview of the notification guests will receive">
      <div class="guest-notification-shell">
        <div class="guest-notification-meta">
          <span class="guest-notification-icon">${appIcon}</span>
          <strong>Guestel</strong>
          <span>now</span>
        </div>
        <div id="guest-broadcast-preview-title" class="guest-notification-title">${hName}</div>
        <div id="guest-broadcast-preview-body" class="guest-notification-body">Your message will appear here as you type.</div>
      </div>
      <div class="guest-notification-caption">This is what arrives on their phone.</div>
    </div>
    ${compact ? '' : '<button type="button" onclick="prefillGuestInstallBroadcast()" class="guest-reach-suggestion">Draft a Guestel invitation</button>'}
    <div style="margin-bottom:8px;">
      <label for="guest-broadcast-title" style="display:block;font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Notification title</label>
      <input type="text" id="guest-broadcast-title" value="${hNameAttr}" maxlength="120" placeholder="e.g. Weekend dates just opened" oninput="updateGuestBroadcastPreview()" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:10px;">
      <label for="guest-broadcast-body" style="display:block;font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Message</label>
      <textarea id="guest-broadcast-body" maxlength="500" placeholder="e.g. Our pool is open until 10pm tonight." oninput="updateGuestBroadcastPreview()" style="width:100%;min-height:64px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
    </div>
    <button id="guest-broadcast-btn" type="button" onclick="sendGuestBroadcast()" disabled style="width:100%;padding:12px;border-radius:10px;border:none;background:#c5d5cc;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:not-allowed;">No guests to notify yet</button>
    <p id="guest-broadcast-result" style="font-size:12px;color:var(--green);margin:8px 0 0;text-align:center;font-weight:600;"></p>
  </div>`;
}

function applyFilter() {
  const bookingsEl = document.getElementById('bookingsList');
  const availabilityEl = document.getElementById('availabilityView');
  const revenueEl = document.getElementById('revenueView');
  const settingsEl = document.getElementById('settingsView');
  const goLiveBanner = document.getElementById('goLiveBanner');
  const msgPanel = document.getElementById('messagesPanel');
  if (msgPanel) msgPanel.style.display = 'none';
  const appsEl = document.getElementById('appsView');
  if (appsEl) appsEl.style.display = 'none';
  const subtabsEl = document.getElementById('bookingsSubtabs');
  if (subtabsEl) subtabsEl.style.display = 'none';
  const assistantPanelEl = document.getElementById('frontDeskAssistantPanel');
  if (assistantPanelEl) assistantPanelEl.style.display = 'none';
  const previewBar = document.getElementById('previewSiteBar');
  if (previewBar) previewBar.style.display = (crm.currentFilter === 'settings') ? 'block' : 'none';
  // Remove Bookings-only notices immediately when leaving Bookings. Several
  // branches below return early, so waiting until applyBookingsSubview() left
  // the old readiness card stranded on unrelated tabs.
  renderBookingsNotices();
  // Remove any checklist pointer when switching tabs
  const ptr = document.getElementById('checklistPointer');
  if (ptr) ptr.remove();

  // D19: refresh the calm preview-mode pill (all tabs when not subscribed; hidden during tour)
  if (goLiveBanner) {
    updateGoLiveBanner();
  }

  // D17: filter chips belong to the Bookings tab only.
  const bookingChips = document.getElementById('bookingFilterChips');
  if (bookingChips && crm.currentFilter !== 'bookings') {
    bookingChips.style.display = 'none';
  }

  if (crm.currentFilter === 'settings') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl = document.getElementById('editView');
    if (editEl) editEl.style.display = 'block';
    closeAvailabilityDayPopover();
    loadSettingsModule().then(() => {
      const needsLoad = typeof window.needsEditPageLoad === 'function' && window.needsEditPageLoad();
      if (needsLoad) {
        if (typeof window.invokeLoadEditRooms === 'function') window.invokeLoadEditRooms();
        else if (typeof window.loadEditRooms === 'function') window.loadEditRooms();
      } else if (typeof window.refreshRatesInputs === 'function' && window.isEditPageDomReady && window.isEditPageDomReady()) {
        window.refreshRatesInputs();
      }
    });
    return;
  }

  if (crm.currentFilter === 'availability') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'flex';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl = document.getElementById('editView');
    if (editEl) editEl.style.display = 'none';
    renderAvailabilityView();
    return;
  }

  if (crm.currentFilter === 'apps') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl2 = document.getElementById('editView');
    if (editEl2) editEl2.style.display = 'none';
    const appsEl2 = document.getElementById('appsView');
    if (appsEl2) {
      appsEl2.style.display = 'block';
      if (!appsEl2.querySelector('.apps-page')) {
        appsEl2.innerHTML = '<div class="loading" style="padding:48px 0;"><div class="logo-sprite-bounce"></div></div>';
      }
    }
    closeAvailabilityDayPopover();
    loadAppsModule().then(() => {
      const appsTourOpen = !!document.getElementById('appsTourLightbox');
      if (!appsTourOpen) ensureAppsViewRendered();
      const embeddedNativePreview = document.body.classList.contains('frontdesk-editor-preview')
        || new URLSearchParams(window.location.search).get('previewEditor') === '1';
      if (isNativeFrontdeskApp() || embeddedNativePreview) {
        const guestMessagesPanel = document.getElementById('messagesPanel');
        if (guestMessagesPanel) guestMessagesPanel.style.display = 'block';
        if (!crm.guestMessages.length) loadMessages();
        else renderMessages();
      }
    }).catch(() => {
      if (appsEl2) appsEl2.innerHTML = '<div class="empty-state"><div class="empty-text">Could not load Guestel</div></div>';
    });
    return;
  }

  if (bookingsEl) bookingsEl.style.display = '';
  if (availabilityEl) availabilityEl.style.display = 'none';
  if (revenueEl) revenueEl.style.display = 'none';
  if (settingsEl) settingsEl.style.display = 'none';
  const editEl = document.getElementById('editView');
  if (editEl) editEl.style.display = 'none';
  closeAvailabilityDayPopover();
  // Bookings stays focused on the daily workflow: reservations and revenue.
  if (crm.bookingsSubview === 'growth') crm.bookingsSubview = 'bookings';
  renderBookingsSubtabs();
  applyBookingsSubview();
}

async function loadManualAvailability(opts = {}) {
  const silent = !!opts.silent;
  try {
    const data = await api('GET', '/api/crm/manual-availability');
    if (!data.success) throw new Error(data.message || 'Failed to load manual availability');
    crm.manualAvailability = data.data || { rooms: [], overrides: {} };
    if (!Array.isArray(crm.manualAvailability.rooms)) crm.manualAvailability.rooms = [];
    if (!crm.manualAvailability.overrides || typeof crm.manualAvailability.overrides !== 'object') {
      crm.manualAvailability.overrides = {};
    }
    if (!crm.manualSelectedRoom && crm.manualAvailability.rooms.length) {
      crm.manualSelectedRoom = crm.manualAvailability.rooms[0].name;
    }
    refreshRoomBadge();
    if (!silent) renderAvailabilityView();
  } catch (e) {
    if (!silent) toast('Could not load manual availability', 'error');
  }
}

function roomDateKey(roomName, day) {
  return `${String(roomName || '').trim()}|${day}`;
}

function refreshRoomBadge() {
  const badge = document.getElementById('countRooms');
  if (badge) badge.textContent = crm.manualAvailability.rooms.length;
}

function getManualRoomByName(name) {
  return (crm.manualAvailability.rooms || []).find(r => r.name === name) || null;
}

function setActiveManualRoom(name) {
  const room = getManualRoomByName(name);
  if (!room) return;
  crm.manualSelectedRoom = room.name;
  renderAvailabilityView();
}

function renderRoomPills() {
  const bar = document.getElementById('roomsPillBar');
  if (!bar) return;
  const rooms = crm.manualAvailability.rooms || [];

  bar.innerHTML = '';
  rooms.forEach((room) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `room-pill ${crm.manualSelectedRoom === room.name ? 'active' : ''}`;
    pill.textContent = `${room.name} (${Math.max(0, parseInt(room.totalUnits, 10) || 0)})`;
    pill.addEventListener('click', () => setActiveManualRoom(room.name));
    bar.appendChild(pill);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'room-pill-add';
  addBtn.textContent = '+ Add room';
  addBtn.addEventListener('click', openRoomsAddModal);
  // Only show if no rooms exist yet (otherwise use Edit tab)
  if (bar.querySelectorAll('.room-pill').length === 0) {
    bar.appendChild(addBtn);
  }
}

function openRoomsAddModal() {
  const modal = document.getElementById('roomsAddModalBg');
  if (!modal) return;
  setNativeModalOpen('rooms-add', true);
  modal.classList.add('open');
  const nameInput = document.getElementById('roomsAddNameInput');
  const unitsInput = document.getElementById('roomsAddUnitsInput');
  if (nameInput) nameInput.value = '';
  if (unitsInput) unitsInput.value = '';
  if (nameInput) nameInput.focus();
}

function closeRoomsAddModal() {
  const modal = document.getElementById('roomsAddModalBg');
  if (!modal) return;
  modal.classList.remove('open');
  setNativeModalOpen('rooms-add', false);
}

function openRoomsEditModal(roomName) {
  const room = getManualRoomByName(roomName);
  if (!room) return;

  const modal = document.getElementById('roomsEditModalBg');
  const nameInput = document.getElementById('roomsEditNameInput');
  const unitsInput = document.getElementById('roomsEditUnitsInput');
  if (!modal || !nameInput || !unitsInput) return;

  crm.editingRoomName = room.name;
  nameInput.value = room.name;
  unitsInput.value = Math.max(0, parseInt(room.totalUnits, 10) || 0);
  setNativeModalOpen('rooms-edit', true);
  modal.classList.add('open');
  nameInput.focus();
}

function closeRoomsEditModal() {
  const modal = document.getElementById('roomsEditModalBg');
  if (modal) modal.classList.remove('open');
  crm.editingRoomName = '';
  setNativeModalOpen('rooms-edit', false);
}

function openRoomsDeleteModal(roomName) {
  const room = getManualRoomByName(roomName);
  if (!room) return;
  crm.pendingDeleteRoomName = room.name;
  const modal = document.getElementById('roomsDeleteModalBg');
  const copy = document.getElementById('roomsDeleteCopy');
  if (copy) {
    copy.innerHTML = `Delete <strong>${esc(room.name)}</strong>? This removes its day-by-day overrides and cannot be undone.`;
  }
  if (modal) {
    setNativeModalOpen('rooms-delete', true);
    modal.classList.add('open');
  }
}

function closeRoomsDeleteModal() {
  const modal = document.getElementById('roomsDeleteModalBg');
  if (modal) modal.classList.remove('open');
  crm.pendingDeleteRoomName = '';
  setNativeModalOpen('rooms-delete', false);
}

function bookingsByRoomDate() {
  const counts = {};
  for (const b of crm.bookings) {
    if (b.paymentDeclined) continue;
    if (isDeadBooking(b)) continue;
    const roomName = String(b.roomName || '').trim();
    if (!roomName) continue;
    const ci = toIsoDate(b.checkinDate);
    const co = toIsoDate(b.checkoutDate);
    if (!ci || !co || co <= ci) continue;
    const endDateObj = new Date(new Date(`${co}T00:00:00.000Z`).getTime() - 86400000);
    const days = enumerateDates(ci, endDateObj.toISOString().slice(0, 10));
    for (const day of days) {
      const key = roomDateKey(roomName, day);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function availabilityForDay(room, dayIso, bookedMap) {
  const baseUnits = Math.max(0, Number(room.totalUnits || 0));
  const booked = bookedMap[roomDateKey(room.name, dayIso)] || 0;
  const override = crm.manualAvailability.overrides[roomDateKey(room.name, dayIso)];

  if (override?.closed) {
    return { status: 'closed', value: 0, booked, baseUnits, mode: 'closed' };
  }

  let value = Math.max(0, baseUnits - booked);
  let mode = 'auto';
  if (override && override.availableUnits !== null && override.availableUnits !== undefined && override.availableUnits !== '') {
    value = Math.max(0, Number(override.availableUnits) || 0);
    mode = 'override';
  }

  let status = 'open';
  if (value <= 0) status = 'full';
  else if (value < baseUnits) status = 'partial';

  return { status, value, booked, baseUnits, mode };
}

function renderAvailabilityView() {
  ensureAvailabilityUi();
  renderRoomPills();

  const rooms = crm.manualAvailability.rooms || [];
  if (!crm.manualSelectedRoom && rooms.length) {
    crm.manualSelectedRoom = rooms[0].name;
  }
  if (crm.manualSelectedRoom && !rooms.some(r => r.name === crm.manualSelectedRoom)) {
    crm.manualSelectedRoom = rooms.length ? rooms[0].name : '';
  }
  const noRoom = document.getElementById('availabilityNoRoom');
  const calWrap = document.getElementById('availabilityCalendarWrap');
  const activeLabel = document.getElementById('availabilityActiveRoomLabel');

  if (!crm.manualSelectedRoom) {
    renderAvailabilityEmptyState();
    if (calWrap) calWrap.style.display = 'none';
    if (activeLabel) activeLabel.textContent = 'Add a room to open the calendar.';
    closeAvailabilityDayPopover();
    return;
  }

  if (noRoom) noRoom.style.display = 'none';
  if (calWrap) calWrap.style.display = 'block';
  const room = getManualRoomByName(crm.manualSelectedRoom);
  if (activeLabel && room) {
    activeLabel.textContent = `Editing: ${room.name} (${Math.max(0, Number(room.totalUnits || 0))} total units)`;
  }

  renderAvailabilityCalendar();
}

function renderAvailabilityCalendar() {
  const room = getManualRoomByName(crm.manualSelectedRoom);
  const grid = document.getElementById('availabilityCalendarGrid');
  const monthLabel = document.getElementById('availabilityMonthLabel');
  if (!room || !grid || !monthLabel) return;

  monthLabel.textContent = `${AVAIL_MONTHS[crm.availabilityMonth]} ${crm.availabilityYear}`;
  grid.innerHTML = '';
  AVAIL_DOW.forEach((dow) => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = dow;
    grid.appendChild(el);
  });

  const firstDay = new Date(crm.availabilityYear, crm.availabilityMonth, 1).getDay();
  const daysInMonth = new Date(crm.availabilityYear, crm.availabilityMonth + 1, 0).getDate();
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const bookedMap = bookingsByRoomDate();

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(crm.availabilityYear, crm.availabilityMonth, d);
    const iso = toIsoDate(date);
    const isPast = date.getTime() < todayMidnight;
    const isToday = date.getTime() === todayMidnight;

    const result = availabilityForDay(room, iso, bookedMap);
    const dayEl = document.createElement('div');
    dayEl.className = `cal-day ${result.status}${isPast ? ' past' : ''}${isToday ? ' today' : ''}`;

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = String(d);

    const avail = document.createElement('div');
    avail.className = 'day-avail';
    avail.textContent = result.status === 'closed' ? '--' : String(result.value);

    dayEl.appendChild(num);
    dayEl.appendChild(avail);
    if (!isPast) {
      dayEl.addEventListener('click', (event) => openAvailabilityDayPopover(event, iso));
    }
    grid.appendChild(dayEl);
  }
}

function changeAvailabilityMonth(delta) {
  crm.availabilityMonth += delta;
  if (crm.availabilityMonth > 11) {
    crm.availabilityMonth = 0;
    crm.availabilityYear += 1;
  }
  if (crm.availabilityMonth < 0) {
    crm.availabilityMonth = 11;
    crm.availabilityYear -= 1;
  }
  closeAvailabilityDayPopover();
  renderAvailabilityCalendar();
}

function openAvailabilityDayPopover(event, dayIso) {
  const room = getManualRoomByName(crm.manualSelectedRoom);
  const pop = document.getElementById('availabilityDayPopover');
  const backdrop = document.getElementById('availabilitySheetBackdrop');
  const title = document.getElementById('availabilityDayPopoverTitle');
  const countEl = document.getElementById('availabilityDayCount');
  const closedInput = document.getElementById('availabilityDayClosedInput');
  if (!room || !pop || !title || !countEl) return;

  // This is a compact editor inside the Availability screen, not a new
  // full-screen destination. Hiding the UIKit shell here changes the web
  // view's usable height and container padding, which makes iOS jump the
  // document and removes the header/tab bar while a day is being edited.
  // Leave the native shell anchored and layer this popover inside it.
  crm.availabilityEditingDay = dayIso;
  const bookedMap = bookingsByRoomDate();
  const result = availabilityForDay(room, dayIso, bookedMap);
  const date = new Date(`${dayIso}T00:00:00`);
  title.textContent = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  countEl.textContent = String(result.status === 'closed' ? result.baseUnits : result.value);
  if (closedInput) closedInput.checked = result.status === 'closed';
  crm.availabilityDayOriginal = {
    closed: result.status === 'closed',
    availableUnits: result.status === 'closed' ? null : Number(result.value),
  };

  // Sync toggle visual state
  const isClosed = result.status === 'closed';
  const track = document.getElementById('availabilityClosedToggleTrack');
  const thumb = document.getElementById('availabilityClosedToggleThumb');
  const stepDown = document.getElementById('availabilityStepDownBtn');
  const stepUp = document.getElementById('availabilityStepUpBtn');
  if (track) track.style.background = isClosed ? '#E05252' : '#D8E4DC';
  if (thumb) thumb.style.left = isClosed ? '18px' : '2px';
  if (countEl) countEl.style.opacity = isClosed ? '0.35' : '1';
  if (stepDown) { stepDown.disabled = isClosed; stepDown.style.opacity = isClosed ? '0.35' : '1'; stepDown.style.pointerEvents = isClosed ? 'none' : ''; }
  if (stepUp) { stepUp.disabled = isClosed; stepUp.style.opacity = isClosed ? '0.35' : '1'; stepUp.style.pointerEvents = isClosed ? 'none' : ''; }

  if (backdrop) backdrop.classList.add('open');

  // Always center the popover as a floating modal
  pop.style.position = 'fixed';
  pop.style.left = '50%';
  pop.style.top = '50%';
  pop.style.transform = 'translate(-50%, -50%)';
  pop.style.width = '260px';
  pop.style.maxWidth = 'calc(100vw - 32px)';
  pop.style.bottom = '';
  pop.style.right = '';
  pop.style.display = 'block';
  pop.style.zIndex = '262';
  pop.style.background = 'var(--white)';
  pop.style.borderRadius = '16px';
  pop.style.border = '1.5px solid var(--border)';
  pop.style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';

  setAvailabilityDaySaving(false);

  pop.classList.add('open');
  pop.setAttribute('aria-hidden', 'false');
  if (event) event.stopPropagation();
}

function setAvailabilityDaySaving(saving) {
  crm.availabilityDaySaving = !!saving;
  const overlay = document.getElementById('availabilityDaySavingOverlay');
  const saveBtn = document.getElementById('availabilityDaySaveBtn');
  const closeBtn = document.getElementById('availabilityDayCloseBtn');
  const stepDown = document.getElementById('availabilityStepDownBtn');
  const stepUp = document.getElementById('availabilityStepUpBtn');
  const closedToggle = document.getElementById('availabilityClosedToggleBtn');
  if (overlay) {
    overlay.hidden = !saving;
    overlay.setAttribute('aria-hidden', saving ? 'false' : 'true');
  }
  [saveBtn, closeBtn, stepDown, stepUp, closedToggle].forEach((el) => {
    if (!el) return;
    el.disabled = saving;
    el.style.pointerEvents = saving ? 'none' : '';
    el.style.opacity = saving ? '0.45' : '';
  });
  if (!saving) {
    const closedInput = document.getElementById('availabilityDayClosedInput');
    const isClosed = !!(closedInput && closedInput.checked);
    if (stepDown) {
      stepDown.style.opacity = isClosed ? '0.35' : '';
      stepDown.style.pointerEvents = isClosed ? 'none' : '';
    }
    if (stepUp) {
      stepUp.style.opacity = isClosed ? '0.35' : '';
      stepUp.style.pointerEvents = isClosed ? 'none' : '';
    }
    if (closedToggle) closedToggle.style.opacity = '';
    if (saveBtn) saveBtn.style.opacity = '';
    if (closeBtn) closeBtn.style.opacity = '';
  }
}

function closeAvailabilityDayPopover() {
  if (crm.availabilityDaySaving) return;
  crm.availabilityEditingDay = '';
  crm.availabilityDayOriginal = null;
  setAvailabilityDaySaving(false);
  const backdrop = document.getElementById('availabilitySheetBackdrop');
  const pop = document.getElementById('availabilityDayPopover');
  if (backdrop) backdrop.classList.remove('open');
  if (pop) {
    pop.classList.remove('open');
    pop.setAttribute('aria-hidden', 'true');
    pop.style.display = 'none';
  }
}

function closeAvailabilityPopoverIfOutside(event) {
  const pop = document.getElementById('availabilityDayPopover');
  if (!pop || !pop.classList.contains('open')) return;
  if (!pop.contains(event.target)) closeAvailabilityDayPopover();
}

function stepAvailabilityDay(delta) {
  if (!crm.availabilityEditingDay) return;
  const room = getManualRoomByName(crm.manualSelectedRoom);
  const countEl = document.getElementById('availabilityDayCount');
  const closedInput = document.getElementById('availabilityDayClosedInput');
  if (!room || !countEl || !closedInput || closedInput.checked) return;
  const cur = parseInt(countEl.textContent, 10) || 0;
  const maxUnits = Math.max(0, parseInt(room.totalUnits, 10) || 0);
  const next = Math.max(0, Math.min(maxUnits, cur + delta));
  countEl.textContent = String(next);
}

function toggleAvailabilityDayClosed() {
  const closedInput = document.getElementById('availabilityDayClosedInput');
  const countEl = document.getElementById('availabilityDayCount');
  const stepDown = document.getElementById('availabilityStepDownBtn');
  const stepUp = document.getElementById('availabilityStepUpBtn');
  const track = document.getElementById('availabilityClosedToggleTrack');
  const thumb = document.getElementById('availabilityClosedToggleThumb');
  if (!closedInput || !countEl) return;

  // Toggle the checkbox
  closedInput.checked = !closedInput.checked;
  const isClosed = closedInput.checked;

  // Update visual state
  countEl.style.opacity = isClosed ? '0.35' : '1';
  if (stepDown) { stepDown.disabled = isClosed; stepDown.style.opacity = isClosed ? '0.35' : '1'; stepDown.style.pointerEvents = isClosed ? 'none' : ''; }
  if (stepUp) { stepUp.disabled = isClosed; stepUp.style.opacity = isClosed ? '0.35' : '1'; stepUp.style.pointerEvents = isClosed ? 'none' : ''; }

  // Update toggle track/thumb visual
  if (track) track.style.background = isClosed ? '#E05252' : '#D8E4DC';
  if (thumb) thumb.style.left = isClosed ? '18px' : '2px';
}

async function saveAvailabilityDay() {
  if (crm.availabilityDaySaving || !crm.availabilityEditingDay || !crm.manualSelectedRoom) return;
  const closedInput = document.getElementById('availabilityDayClosedInput');
  const countEl = document.getElementById('availabilityDayCount');
  if (!closedInput || !countEl) return;

  const payload = {
    roomName: crm.manualSelectedRoom,
    startDate: crm.availabilityEditingDay,
    endDate: crm.availabilityEditingDay,
    closed: !!closedInput.checked,
  };
  if (!closedInput.checked) {
    payload.availableUnits = Math.max(0, parseInt(countEl.textContent, 10) || 0);
  }

  const original = crm.availabilityDayOriginal;
  const unchanged = !!original
    && original.closed === payload.closed
    && (payload.closed || Number(original.availableUnits) === Number(payload.availableUnits));
  if (unchanged) {
    closeAvailabilityDayPopover();
    return;
  }

  setAvailabilityDaySaving(true);
  try {
    const data = await api('POST', '/api/crm/manual-availability/range', payload);
    if (!data.success) throw new Error(data.message || 'Failed to save day');
    crm.manualAvailability = data.data || crm.manualAvailability;
    crm.availabilityDaySaving = false;
    closeAvailabilityDayPopover();
    renderAvailabilityCalendar();
    toast('Day updated', 'success');
  } catch (e) {
    setAvailabilityDaySaving(false);
    toast('Failed to update availability', 'error');
  }
}

async function saveRoomType() {
  const nameEl = document.getElementById('roomsAddNameInput');
  const unitsEl = document.getElementById('roomsAddUnitsInput');
  const saveBtn = document.getElementById('roomsAddSaveBtn');
  if (!nameEl || !unitsEl) return;
  const roomName = nameEl.value.trim();
  const totalUnits = Math.max(1, parseInt(unitsEl.value, 10) || 1);
  if (!roomName) {
    toast('Room name is required', 'error');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Adding…';
  }

  try {
    const data = await api('POST', '/api/crm/manual-availability/rooms', { roomName, totalUnits });
    if (!data.success) throw new Error(data.message || 'Failed to save room type');

    const nextAvailability = data.data && Array.isArray(data.data.rooms)
      ? data.data
      : crm.manualAvailability;
    if (!Array.isArray(nextAvailability.rooms)) nextAvailability.rooms = [];
    if (!nextAvailability.overrides || typeof nextAvailability.overrides !== 'object') {
      nextAvailability.overrides = {};
    }
    // The successful response normally contains the new room. Keep a local
    // fallback so a stale read replica can never leave the owner staring at an
    // unchanged calendar after Marketel has already said the room was added.
    if (!nextAvailability.rooms.some(room => room.name === roomName)) {
      nextAvailability.rooms = [...nextAvailability.rooms, { name: roomName, totalUnits }]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    crm.manualAvailability = nextAvailability;
    crm.manualSelectedRoom = roomName;
    closeRoomsAddModal();
    refreshRoomBadge();
    renderAvailabilityView();
    toast('Room added', 'success');

    // Keep Your Page's room cards synchronized without waiting for an app
    // background/foreground cycle. This is deliberately non-blocking because
    // the Availability screen is already correct from the local update above.
    loadSettingsModule()
      .then(module => module.refreshEditRoomsData?.({ render: true }))
      .catch(() => {});
  } catch (e) {
    toast(e.message || 'Failed to save room type', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }
}

async function saveEditedRoomType() {
  const nameEl = document.getElementById('roomsEditNameInput');
  const unitsEl = document.getElementById('roomsEditUnitsInput');
  if (!nameEl || !unitsEl || !crm.editingRoomName) return;

  const newRoomName = nameEl.value.trim();
  const totalUnits = Math.max(1, parseInt(unitsEl.value, 10) || 1);
  if (!newRoomName) {
    toast('Room name is required', 'error');
    return;
  }

  try {
    const data = await api('PUT', '/api/crm/manual-availability/rooms', {
      currentRoomName: crm.editingRoomName,
      newRoomName,
      totalUnits,
    });
    if (!data.success) throw new Error(data.message || 'Failed to update room type');
    crm.manualAvailability = data.data || crm.manualAvailability;
    crm.manualSelectedRoom = newRoomName;
    closeRoomsEditModal();
    refreshRoomBadge();
    renderAvailabilityView();
    toast('Room type updated', 'success');
  } catch (e) {
    toast(e.message || 'Failed to update room type', 'error');
  }
}

async function deleteRoomType(roomName) {
  const room = getManualRoomByName(roomName);
  if (!room) return;
  openRoomsDeleteModal(room.name);
}

async function confirmDeleteRoomType() {
  if (!crm.pendingDeleteRoomName) return;
  const room = getManualRoomByName(crm.pendingDeleteRoomName);
  if (!room) {
    closeRoomsDeleteModal();
    return;
  }

  try {
    const data = await api('DELETE', '/api/crm/manual-availability/rooms', { roomName: room.name });
    if (!data.success) throw new Error(data.message || 'Failed to delete room type');
    crm.manualAvailability = data.data || crm.manualAvailability;
    if (crm.manualSelectedRoom === room.name) {
      crm.manualSelectedRoom = (crm.manualAvailability.rooms && crm.manualAvailability.rooms[0] && crm.manualAvailability.rooms[0].name) || '';
    }
    closeAvailabilityDayPopover();
    closeRoomsDeleteModal();
    refreshRoomBadge();
    renderAvailabilityView();
    toast('Room type deleted', 'success');
    loadSettingsModule()
      .then(module => module.refreshEditRoomsData?.({ render: true }))
      .catch(() => {});
  } catch (e) {
    toast(e.message || 'Failed to delete room type', 'error');
  }
}

// ── ACTIONS ────────────────────────────────────────────
async function markConfirmed(id) {
  try {
    await api('POST', `/api/crm/bookings/${id}/confirm`);
    crm.bookings = crm.bookings.map(b => b.id === id ? { ...b, callStatus: 'called' } : b);
    
    // Update counts
    const needsCalls = crm.bookings.filter(b => b.callStatus === 'not-called');
    document.getElementById('statCount').textContent = needsCalls.length;
    updateBookingsTabBadge();
    
    applyFilter();
    toast('Marked as called', 'success');
  } catch(e) { toast('Failed to update', 'error'); }
}

// ── NOTES MODAL ────────────────────────────────────────
let currentNoteBookingId = null;

function addNote(id, existingNote = '') {
  currentNoteBookingId = id;
  const modal = document.getElementById('notesModal');
  const input = document.getElementById('noteInput');
  input.value = existingNote;
  setNativeModalOpen('booking-note', true);
  document.documentElement.classList.add('marketel-modal-open');
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 100);
}

function closeNotesModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('notesModal');
  modal.style.display = 'none';
  document.documentElement.classList.remove('marketel-modal-open');
  currentNoteBookingId = null;
  document.getElementById('noteInput').value = '';
  setNativeModalOpen('booking-note', false);
}

async function saveNote() {
  const note = document.getElementById('noteInput').value.trim();
  if (!note) {
    toast('Please enter a note', 'error');
    return;
  }
  
  try {
    await api('POST', `/api/crm/bookings/${currentNoteBookingId}/note`, { note });
    toast('Note saved', 'success');
    closeNotesModal();
    loadBookings();
  } catch(e) {
    toast('Failed to save note', 'error');
  }
}

// Close modals/popovers on Escape, and submit room modal on Enter
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('notesModal');
    if (modal.style.display === 'flex') {
      closeNotesModal();
    }
    closeRoomsAddModal();
    closeRoomsEditModal();
    closeRoomsDeleteModal();
    closeAvailabilityDayPopover();
    if (crm.messagesExpanded) closeMessagesWorkspace();
    if (document.getElementById('editAddRoomModal')) window.closeEditAddRoom?.();
  }

  if (e.key === 'Enter') {
    const roomModal = document.getElementById('roomsAddModalBg');
    const roomEditModal = document.getElementById('roomsEditModalBg');
    const roomDeleteModal = document.getElementById('roomsDeleteModalBg');
    if (roomModal && roomModal.classList.contains('open')) {
      e.preventDefault();
      saveRoomType();
      return;
    }
    if (roomEditModal && roomEditModal.classList.contains('open')) {
      e.preventDefault();
      saveEditedRoomType();
      return;
    }
    if (roomDeleteModal && roomDeleteModal.classList.contains('open')) {
      e.preventDefault();
      confirmDeleteRoomType();
    }
  }
});

// ── ADD DUMMY BOOKINGS ─────────────────────────────────
async function addDummyBookings() {
  if (!confirm('Add 4 test bookings (1 with payment declined)?')) return;
  try {
    const data = await api('POST', '/api/crm/add-dummy-bookings');
    if (data.success) {
      crm.revenueCache = {};
      toast(`Added ${data.count} test bookings`, 'success');
      refreshCurrentView();
    } else {
      toast('Failed to add test bookings', 'error');
    }
  } catch(e) {
    toast('Error adding test bookings', 'error');
  }
}

// ── NOTIFICATIONS ──────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function enableNotifications() {
  if (!crm.token) { toast('Sign in first', 'error'); return false; }
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('Notifications not supported on this device', 'error');
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setNotificationButtonState(false);
      toast('Notifications blocked', 'error');
      return false;
    }
    const keyRes = await fetch('/api/push/vapid-public');
    const keyData = await keyRes.json().catch(() => ({}));
    if (!keyData.publicKey) { toast('Push not configured', 'error'); return false; }
    // Register from /frontdesk-sw.js (a dedicated path) and race `ready` against a
    // timeout so a failed SW load surfaces an error instead of hanging forever.
    try { await navigator.serviceWorker.register('/frontdesk-sw.js'); } catch (_) {}
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Service worker unavailable')), 8000)),
    ]);
    const sub = await Promise.race([
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Subscription timed out')), 15000)),
    ]);
    const bufToB64 = buf => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
    await api('POST', '/api/push/subscribe', {
      endpoint: sub.endpoint,
      p256dh: sub.getKey('p256dh') ? bufToB64(sub.getKey('p256dh')) : '',
      auth: sub.getKey('auth') ? bufToB64(sub.getKey('auth')) : '',
      source: 'simple-crm'
    });
    toast('Notifications enabled', 'success');
    setNotificationButtonState(true);
    return true;
  } catch(e) {
    setNotificationButtonState(false);
    toast('Failed: ' + (e.message || e), 'error');
    return false;
  }
}

function getBookingReservationCode(b) {
  return (b && (b.pmsConfirmationCode || b.ourReservationCode)) || '';
}

function buildGuestInstallUrlForQr(reservationCode, ref, handoffToken) {
  const hotelId = crm.activeHotelId || '';
  const domain = crm.activeHotelDomain || '';
  if (!hotelId && !domain) return '';
  const transfersStay = !!reservationCode && !!handoffToken;
  const params = new URLSearchParams({
    intent: transfersStay ? 'stay' : 'book',
    ref: ref || 'frontdesk-guestel-qr',
  });
  if (handoffToken) params.set('handoff', handoffToken);
  if (hotelId) return `https://clip.mktel.co/clip/${encodeURIComponent(hotelId)}?${params.toString()}`;
  return 'https://' + domain + '/?' + params.toString();
}

function promptUploadLogoBeforeQr(preselectedCode) {
  const existing = document.getElementById('logoGateOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'logoGateOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:102400;background:rgba(0,0,0,0.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:24px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="margin-bottom:10px;"><i data-lucide="image" style="width:26px;height:26px;"></i></div>
      <h2 style="font-size:17px;font-weight:800;color:#1a1a2e;margin:0 0 8px;line-height:1.35;">Upload your property logo first?</h2>
      <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 18px;text-align:left;">Guests see this image with <strong>${crm.activeHotelName || 'your property'}</strong> in Guestel. Takes 5 seconds.</p>
      <input type="file" id="logoGateFileInput" accept="image/png,image/jpeg,image/webp" style="display:none;">
      <button type="button" id="logoGateUploadBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Upload logo</button>
      <button type="button" id="logoGateSkipBtn" style="width:100%;padding:10px;border:none;background:transparent;color:#9ca3af;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Show QR without logo</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('logoGateUploadBtn').onclick = () => {
    document.getElementById('logoGateFileInput').click();
  };
  document.getElementById('logoGateFileInput').onchange = async (e) => {
    const input = e.target;
    if (!input.files || !input.files[0]) return;
    await uploadAppIcon(input);
    if (crm.activeHotelAppIcon) {
      close();
      showCheckinQrOverlay(preselectedCode, true);
    }
  };
  document.getElementById('logoGateSkipBtn').onclick = () => {
    close();
    showCheckinQrOverlay(preselectedCode, true);
  };
}

async function showCheckinQrOverlay(preselectedCode, skipLogoGate) {
  const hName = crm.activeHotelName || 'Your Property';
  const domain = crm.activeHotelDomain || '';
  if (!domain) { toast('Your booking domain is still loading', 'error'); return; }
  if (!skipLogoGate && !preselectedCode && !crm.activeHotelAppIcon) {
    setNativeShellVisible(false);
    promptUploadLogoBeforeQr(preselectedCode);
    return;
  }

  const existing = document.getElementById('checkinQrOverlay');
  if (existing) existing.remove();

  let selectedCode = preselectedCode || '';
  let mode = selectedCode ? 'guest' : 'generic';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const arrivals = (crm.bookings || []).filter(function(b) {
    if (b.paymentDeclined) return false;
    if (isDeadBooking(b)) return false;
    if (!b.checkinDate) return false;
    const ci = new Date(b.checkinDate);
    ci.setHours(0, 0, 0, 0);
    return ci >= today && ci <= dayAfterTomorrow;
  });

  const overlay = document.createElement('div');
  overlay.id = 'checkinQrOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:102500;background:#0a0f0d;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));box-sizing:border-box;';
  let renderSequence = 0;
  const handoffByCode = new Map();

  function escAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

  async function render() {
    const sequence = ++renderSequence;
    const ref = mode === 'guest' && selectedCode ? 'frontdesk-qr-guest' : 'frontdesk-qr-generic';
    let handoffToken = '';
    if (mode === 'guest' && selectedCode) {
      handoffToken = handoffByCode.get(selectedCode) || '';
      if (!handoffToken) {
        try {
          const handoff = await api('POST', '/api/crm/guestel-handoff', { reservationCode: selectedCode });
          if (handoff?.success && handoff.handoffToken) {
            handoffToken = handoff.handoffToken;
            handoffByCode.set(selectedCode, handoffToken);
          }
        } catch (_) {}
      }
    }
    const url = buildGuestInstallUrlForQr(mode === 'guest' ? selectedCode : '', ref, handoffToken);
    let qr = '';
    try {
      qr = url ? await createCheckinQrDataUrl(url) : '';
    } catch (_) {
      if (sequence === renderSequence) toast('Could not create the QR code', 'error');
      return;
    }
    if (sequence !== renderSequence) return;

    const guestOptions = arrivals.map(function(b) {
      const code = getBookingReservationCode(b);
      const name = [b.guestFirstName, b.guestLastName].filter(Boolean).join(' ');
      const ci = b.checkinDate ? new Date(b.checkinDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
      return '<option value="' + escAttr(code) + '"' + (code === selectedCode ? ' selected' : '') + '>' + escAttr(name) + ' — ' + escAttr(ci) + '</option>';
    }).join('');

    overlay.innerHTML = ''
      + '<button type="button" id="checkinQrClose" style="position:absolute;top:max(12px,env(safe-area-inset-top));right:16px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);color:#fff;font-size:22px;cursor:pointer;font-family:inherit;">×</button>'
      + '<div style="text-align:center;max-width:400px;width:100%;">'
      + '<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Guest scans this</div>'
      + '<h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;line-height:1.3;">Keep ' + escAttr(hName) + ' in Guestel</h2>'
      + '<p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">' + (mode === 'guest' ? 'This one-use QR brings the selected reservation into Guestel.' : 'This QR opens your direct booking experience and lets guests keep the property in Guestel.') + '</p>'
      + '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">'
      + '<button type="button" data-qr-mode="generic" style="padding:10px 16px;border-radius:20px;border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;' + (mode === 'generic' ? 'background:#fff;color:#1a5c3f;' : 'background:rgba(255,255,255,0.12);color:#fff;') + '">Any guest</button>'
      + '<button type="button" data-qr-mode="guest" style="padding:10px 16px;border-radius:20px;border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;' + (mode === 'guest' ? 'background:#fff;color:#1a5c3f;' : 'background:rgba(255,255,255,0.12);color:#fff;') + '">This guest</button>'
      + '</div>'
      + (mode === 'guest' ? (
          '<div style="width:min(280px,80vw);max-width:100%;margin:0 auto 16px;text-align:left;">'
          + '<label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;margin-bottom:6px;">Checking in today or tomorrow</label>'
          + (arrivals.length
            ? '<select id="checkinQrGuestSelect" style="width:100%;padding:12px;border-radius:10px;border:none;font-family:inherit;font-size:14px;">' + guestOptions + '</select>'
            : '<input id="checkinQrCodeInput" type="text" placeholder="Confirmation code" value="' + escAttr(selectedCode) + '" style="width:100%;padding:12px;border-radius:10px;border:none;font-family:inherit;font-size:14px;box-sizing:border-box;">')
          + '</div>'
        ) : '')
      + (qr ? '<img src="' + qr + '" alt="QR code" width="280" height="280" style="display:block;width:min(280px,80vw);max-width:100%;height:auto;box-sizing:border-box;margin:0 auto;border-radius:16px;background:#fff;padding:12px;">' : '')
      + '<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">'
      + (mode === 'guest' && selectedCode ? (handoffToken ? 'One-use reservation pass · expires in 24 hours' : 'Guestel link · reservation transfer unavailable') : 'Guestel booking link · good for room cards')
      + '</p></div>';

    if (!overlay.isConnected) {
      setNativeShellVisible(false);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    }

    overlay.querySelector('#checkinQrClose').onclick = closeCheckinQrOverlay;
    overlay.querySelectorAll('[data-qr-mode]').forEach(function(btn) {
      btn.onclick = function() {
        mode = btn.getAttribute('data-qr-mode');
        if (mode === 'guest' && !selectedCode && arrivals.length) {
          selectedCode = getBookingReservationCode(arrivals[0]);
        }
        render();
      };
    });
    const sel = overlay.querySelector('#checkinQrGuestSelect');
    if (sel) {
      sel.onchange = function() { selectedCode = sel.value; render(); };
      if (!selectedCode && sel.value) selectedCode = sel.value;
    }
    const inp = overlay.querySelector('#checkinQrCodeInput');
    if (inp) {
      inp.oninput = function() { selectedCode = inp.value.trim(); };
    }
  }

  function closeCheckinQrOverlay() {
    overlay.remove();
    document.body.style.overflow = '';
    setNativeShellVisible(true);
    syncNativeShellState();
  }

  await render();
}

function closeCheckinQrOverlay() {
  const el = document.getElementById('checkinQrOverlay');
  if (el) el.remove();
  document.body.style.overflow = '';
  setNativeShellVisible(true);
  syncNativeShellState();
}

function prefillGuestInstallBroadcast() {
  const hName = crm.activeHotelName || 'Your Property';
  const domain = crm.activeHotelDomain || '';
  const installUrl = buildGuestInstallUrlForQr('', 'frontdesk-broadcast');
  const titleEl = document.getElementById('guest-broadcast-title');
  const bodyEl = document.getElementById('guest-broadcast-body');
  if (titleEl) titleEl.value = hName;
  if (bodyEl) {
    bodyEl.value = installUrl
      ? `Keep ${hName} in Guestel for direct rates, property updates, and easier direct booking: ${installUrl}`
      : `Keep ${hName} in Guestel for direct rates, property updates, and easier direct booking.`;
  }
  updateGuestBroadcastPreview();
  document.getElementById('guestBroadcastCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (crm.currentFilter !== 'apps') {
    const tabBtn = document.querySelector('.tab[data-nav-filter="apps"]')
      || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');
    setFilter('apps', tabBtn);
    setTimeout(() => {
      document.getElementById('guestBroadcastCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  }
}

async function sendGuestBroadcast() {
  if (!crm.guestPushSubscriberCount) {
    toast('No Guestel devices have opted into property updates yet — share your QR first', 'error');
    return;
  }
  const titleEl = document.getElementById('guest-broadcast-title');
  const bodyEl = document.getElementById('guest-broadcast-body');
  const resultEl = document.getElementById('guest-broadcast-result');
  const title = titleEl?.value.trim();
  const body = bodyEl?.value.trim();
  if (!title || !body) {
    toast('Enter a title and what you want to notify them about', 'error');
    return;
  }
  const btn = document.getElementById('guest-broadcast-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Notifying…'; }
  if (resultEl) resultEl.textContent = '';
  try {
    const data = await api('POST', '/api/crm/guest-broadcast', { title, body });
    if (data.success) {
      const msg = data.sent > 0
        ? `Notified ${data.sent} guest${data.sent === 1 ? '' : 's'}`
        : 'No guests to notify yet';
      if (resultEl) resultEl.textContent = msg;
      toast(msg, data.sent > 0 ? 'success' : '');
      if (bodyEl) bodyEl.value = '';
      updateGuestBroadcastPreview();
    } else {
      toast(data.message || 'Broadcast failed', 'error');
    }
  } catch (e) {
    toast('Broadcast failed', 'error');
  } finally {
    if (btn) btn.textContent = 'Send notification';
    applyGuestBroadcastAudienceUi();
  }
}


function toast(msg, type = '') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'i'} ${msg}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}


// ── DOUBLE-BOOKING CONFLICTS ───────────────────────────────────
// A room-night with more live bookings than units is an unambiguous clash — it
// happens when a walk-in gets written over a room an online guest already holds.
// Surfaced at the top of Bookings because by the time this is true, the approval
// window has usually long closed and nothing else will flag it.

async function loadBookingConflicts() {
  if (!crm.token) return;
  if (conflictsLoadPromise) return conflictsLoadPromise;
  conflictsLoadPromise = (async () => {
    try {
      const res = await api('GET', '/api/crm/conflicts');
      crm.bookingConflicts = (res && res.success) ? (res.conflicts || []) : [];
    } catch (_) {
      crm.bookingConflicts = [];
    }
    renderBookingsNotices();
  })();
  try {
    return await conflictsLoadPromise;
  } finally {
    conflictsLoadPromise = null;
  }
}

async function loadOperationalReadiness({ force = false } = {}) {
  if (!crm.token || !crm.hotelSubscribed) {
    crm.operationalReadiness = null;
    renderBookingsNotices();
    return null;
  }
  if (crm.operationalReadinessLoading && !force) return crm.operationalReadiness;
  crm.operationalReadinessLoading = true;
  try {
    const result = await api('GET', '/api/crm/operational-readiness');
    if (result?.success) crm.operationalReadiness = result.data || null;
  } catch (_) {
    // This check must never hold up the owner's bookings. Leave the last known
    // state in place and try again on the next refresh.
  } finally {
    crm.operationalReadinessLoading = false;
    renderBookingsNotices();
  }
  return crm.operationalReadiness;
}

function operationalReadinessAction(action) {
  if (action === 'assistant') {
    if (!isNativeFrontdeskApp()) {
      openFrontdeskAppDownload();
      return;
    }
    loadAssistantModule().then((module) => module.openFrontDeskAssistant()).catch(() => {
      toast('Could not open Front Desk Assistant.', 'error');
    });
    return;
  }
  if (action === 'page' || action === 'preview') {
    openGuestBookingEngine();
  }
}

function openFrontdeskAppDownload() {
  const appStoreUrl = String(crm.frontdeskAppStoreUrl || '').trim();
  if (appStoreUrl) {
    window.open(appStoreUrl, '_blank', 'noopener');
    return;
  }
  toast('The Front Desk app download will appear here as soon as the App Store listing is live.', 'info');
}

async function retryBookingFulfillment(bookingId) {
  const cleanId = String(bookingId || '').trim();
  if (!cleanId) return;
  const button = document.querySelector(`[data-booking-retry="${CSS.escape(cleanId)}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = 'Retrying…';
  }
  try {
    const result = await api('POST', `/api/crm/booking-actions/${encodeURIComponent(cleanId)}/retry`);
    if (!result?.success) throw new Error(result?.message || 'Could not retry that action.');
    if (result.fulfillment?.status === 'completed') {
      toast('Guest action completed.', 'success');
    } else if (result.fulfillment?.status === 'attention') {
      toast('It still needs attention. Check your email and payment settings.', 'error');
    } else {
      toast('Retry started. Front Desk will keep working on it.', 'info');
    }
    await Promise.allSettled([
      loadOperationalReadiness({ force: true }),
      loadBookings({ deferMessages: true }),
    ]);
  } catch (error) {
    toast(error?.message || 'Could not retry that guest action.', 'error');
    await loadOperationalReadiness({ force: true });
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}

function operationalReadinessHtml() {
  const readiness = crm.operationalReadiness;
  if (!readiness?.visible) return '';
  const issues = Array.isArray(readiness.issues) ? readiness.issues : [];
  const items = Array.isArray(readiness.items) ? readiness.items : [];

  if (readiness.complete) {
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:11px 13px;border:1px solid #cce4d5;border-radius:13px;background:#f2fbf6;color:#1a5c3f;">
      <span aria-hidden="true" style="display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#2E7D5B;color:#fff;font-size:13px;font-weight:900;">✓</span>
      <div style="font-size:12px;line-height:1.35;"><strong style="display:block;font-size:13px;">Ready for live bookings</strong>Your page, alert path and fallback rule are verified.</div>
    </div>`;
  }

  const rows = items.map((item) => {
    const actionLabel = item.action === 'assistant' ? 'Set up' : item.action === 'preview' ? 'Test it' : 'Open';
    const action = item.done ? '' : `<button type="button" onclick="operationalReadinessAction('${esc(item.action)}')" style="flex:0 0 auto;border:0;background:none;color:#2E7D5B;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:8px;">${actionLabel}</button>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(46,125,91,.11);">
      <span aria-hidden="true" style="display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:${item.done ? '#2E7D5B' : '#eef2ef'};color:${item.done ? '#fff' : '#829087'};font-size:12px;font-weight:900;">${item.done ? '✓' : '·'}</span>
      <div style="min-width:0;flex:1;"><div style="font-size:12px;font-weight:800;color:#1a1a2e;">${esc(item.label)}</div><div style="font-size:11px;color:#6b7280;line-height:1.35;">${esc(item.detail)}</div></div>
      ${action}
    </div>`;
  }).join('');

  const issueRows = issues.map((issue) => `<div style="margin-top:9px;padding:11px;border-radius:11px;background:#fff;border:1px solid #fecaca;">
    <div style="font-size:12px;font-weight:800;color:#991b1b;">${esc(issue.guestName)} · ${esc(issue.roomName)}</div>
    <div style="font-size:11px;color:#7f1d1d;line-height:1.4;margin:3px 0 8px;">${issue.status === 'failed' ? 'A guest email or card-hold update did not finish. Front Desk stopped after safe retries so you can review it.' : 'A guest email or card-hold update is taking longer than expected. Front Desk is still retrying it automatically.'}</div>
    <button type="button" data-booking-retry="${esc(issue.bookingId)}" onclick="retryBookingFulfillment('${esc(issue.bookingId)}')" style="border:1px solid #dc2626;border-radius:9px;background:#fff;color:#b91c1c;font-family:inherit;font-size:11px;font-weight:800;padding:7px 10px;cursor:pointer;">Retry guest action</button>
  </div>`).join('');

  return `<div style="margin-bottom:14px;padding:14px 15px;border:1px solid ${issues.length ? '#fca5a5' : '#d5e5db'};border-radius:15px;background:${issues.length ? '#fff7f7' : '#f8fcf9'};">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;">
      <div><div style="font-size:13px;font-weight:850;color:#1a1a2e;">Finish your live-booking check</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">${Number(readiness.readyCount) || 0} of ${Number(readiness.totalCount) || items.length} verified · each item protects a real guest.</div></div>
      <button type="button" aria-label="Refresh readiness" onclick="loadOperationalReadiness({ force: true })" style="border:0;background:none;color:#6b7280;font-size:18px;line-height:1;cursor:pointer;padding:4px;">↻</button>
    </div>
    ${rows}${issueRows}
  </div>`;
}

function conflictDateLabel(iso) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch (_) { return iso; }
}

function conflictBannerHtml() {
  const conflicts = crm.bookingConflicts || [];
  if (!conflicts.length) return '';

  const rows = conflicts.slice(0, 6).map((c) => {
    const guests = c.bookings.map((b) => {
      const walkIn = b.bookingType === 'manual';
      const money = Number(b.grandTotal || 0).toFixed(2);
      const label = walkIn ? 'added at the desk' : 'booked online';
      const action = walkIn
        ? ''
        : `<button type="button" onclick="promptCancelBooking('${b.id}', ${esc(JSON.stringify(b.guestName || 'this guest'))})" style="padding:7px 12px;border-radius:9px;border:1.5px solid #dc2626;background:none;color:#dc2626;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Cancel this one</button>`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(0,0,0,0.06);">
          <div style="min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#1a1a2e;">${esc(b.guestName)}</div>
            <div style="font-size:11px;color:#6b7280;">${label} · $${money}${b.guestPhone ? ` · ${esc(b.guestPhone)}` : ''}</div>
          </div>
          ${action}
        </div>`;
    }).join('');

    const why = c.closed
      ? `You marked this room closed for this night, but ${c.booked} booking${c.booked !== 1 ? 's are' : ' is'} still on it`
      : `${c.booked} bookings for ${c.units} room${c.units !== 1 ? 's' : ''}`;

    return `<div style="background:#fff;border-radius:10px;padding:12px 14px;margin-top:10px;">
        <div style="font-size:13px;font-weight:800;color:#7f1d1d;">${esc(c.roomName)} · ${conflictDateLabel(c.date)}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${why}</div>
        ${guests}
      </div>`;
  }).join('');

  const more = conflicts.length > 6
    ? `<div style="font-size:11px;color:#7f1d1d;margin-top:8px;">+ ${conflicts.length - 6} more night${conflicts.length - 6 !== 1 ? 's' : ''} affected.</div>`
    : '';

  return `<div id="conflictBanner" style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:14px;padding:16px;margin-bottom:14px;">
      <div style="font-size:14px;font-weight:800;color:#7f1d1d;margin-bottom:4px;">Double-booked ${conflicts.length === 1 ? 'room' : 'rooms'}</div>
      <div style="font-size:12px;color:#7f1d1d;line-height:1.5;">More bookings than rooms on the nights below. Cancel the online booking to free the room and void the guest's card hold — they'll get an email explaining.</div>
      ${rows}${more}
    </div>`;
}

// Keep conflict warnings in one stable host above the bookings list.
function renderBookingsNotices() {
  const list = document.getElementById('bookingsList');
  if (!list || !list.parentNode) return;

  let host = document.getElementById('bookingsNotices');
  const suppressed = crm.currentFilter !== 'bookings'
    || crm.bookingsSubview !== 'bookings'
    || crm.settingsTourActive
    || document.body.classList.contains('frontdesk-editor-preview');
  const html = suppressed ? '' : `${operationalReadinessHtml()}${conflictBannerHtml()}`;

  if (!html) {
    if (host) host.remove();
    return;
  }
  if (!host) {
    host = document.createElement('div');
    host.id = 'bookingsNotices';
    list.parentNode.insertBefore(host, list);
  }
  host.innerHTML = html;
}

function promptCancelBooking(bookingId, guestName) {
  const existing = document.getElementById('cancelBookingOverlay');
  if (existing) existing.remove();
  setNativeModalOpen('cancel-booking', true);

  const overlay = document.createElement('div');
  overlay.id = 'cancelBookingOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100005;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:24px 22px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="text-align:center;margin-bottom:6px;"><i data-lucide="ban" style="width:26px;height:26px;"></i></div>
      <h2 style="font-size:18px;font-weight:800;color:#1a1a2e;margin:0 0 8px;text-align:center;">Cancel ${esc(guestName)}'s booking?</h2>
      <p style="font-size:12px;color:#6b7280;line-height:1.55;margin:0 0 16px;text-align:center;">The room goes back on sale, the $1 card hold is voided, and they get an email explaining. This can't be undone.</p>
      <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">Reason (the guest sees this)</label>
      <select id="cancelBookingReason" style="width:100%;padding:11px;border-radius:10px;border:1.5px solid #e5e7eb;font-family:inherit;font-size:13px;margin-bottom:16px;background:#fff;color:#1a1a2e;">
        <option value="The room was already taken">The room was already taken</option>
        <option value="The room is out of service">The room is out of service</option>
        <option value="Double booking on our side">Double booking on our side</option>
        <option value="">No reason given</option>
      </select>
      <button type="button" id="cancelBookingGo" style="width:100%;padding:14px;border-radius:12px;border:none;background:#dc2626;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Cancel the booking</button>
      <button type="button" id="cancelBookingBack" style="width:100%;padding:11px;border-radius:12px;border:none;background:none;color:#6b7280;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Keep it</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    setNativeModalOpen('cancel-booking', false);
  };
  document.getElementById('cancelBookingBack').onclick = close;
  document.getElementById('cancelBookingGo').onclick = async () => {
    const go = document.getElementById('cancelBookingGo');
    const reason = document.getElementById('cancelBookingReason').value;
    go.disabled = true;
    go.textContent = 'Cancelling…';
    try {
      const res = await api('POST', '/api/crm/bookings/cancel', { id: bookingId, reason });
      if (res && res.success) {
        if (res.alreadyCancelled) {
          toast('That booking was already cancelled.', 'info');
        } else {
          showBookingFulfillmentToast('release', res.fulfillment);
        }
        close();
        await loadBookings();
        await Promise.allSettled([loadBookingConflicts(), loadManualAvailability()]);
        if (!res.alreadyCancelled && res.calendarCorrection) {
          showAvailabilityCorrectionModal(res.calendarCorrection);
        }
      } else {
        toast((res && res.message) || 'Could not cancel that booking.', 'error');
        go.disabled = false;
        go.textContent = 'Cancel the booking';
      }
    } catch (e) {
      toast('Could not cancel that booking.', 'error');
      go.disabled = false;
      go.textContent = 'Cancel the booking';
    }
  };
}

// ── BOOKING APPROVAL ───────────────────────────────────────────
// A new booking waits a few minutes before it locks in, so the owner can release
// a room they already sold on an OTA. The push carries Confirm / Release buttons,
// but iOS doesn't reliably render those — tapping the notification body lands
// here instead, which is the path that always works. The token in the URL is
// self-authenticating, so this card also works before the owner enters their PIN.

function approvalMinutesLeft(pendingUntil) {
  const due = new Date(pendingUntil || 0).getTime();
  if (!due) return 0;
  return Math.max(0, Math.round((due - Date.now()) / 60000));
}

function getApprovalTokenFromUrl() {
  try {
    return String(new URLSearchParams(window.location.search).get('approve') || '').trim();
  } catch (_) {
    return '';
  }
}

function stripApprovalTokenFromUrl() {
  try {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('approve');
    window.history.replaceState({}, '', cleanUrl);
  } catch (_) {}
}

async function maybeShowBookingApprovalCard() {
  const token = getApprovalTokenFromUrl();
  if (!token) return;
  stripApprovalTokenFromUrl();

  let booking = null;
  try {
    const res = await fetch('/api/booking-approval/peek?token=' + encodeURIComponent(token));
    const body = await res.json().catch(() => ({}));
    if (body && body.success && body.data) booking = body.data;
    else {
      toast(body && body.message ? body.message : 'That approval link has expired.', 'error');
      return;
    }
  } catch (_) {
    toast('Could not load that booking.', 'error');
    return;
  }

  if (String(booking.status || '').toLowerCase() !== 'pending') {
    const decided = String(booking.status || '').toLowerCase() === 'released' ? 'released' : 'confirmed';
    toast(`That booking was already ${decided}.`, 'info');
    return;
  }
  showBookingApprovalModal(token, booking);
}

function showBookingApprovalModal(token, booking) {
  const existing = document.getElementById('bookingApprovalOverlay');
  if (existing) existing.remove();
  setNativeModalOpen('booking-approval', true);

  const fmt = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (_) { return '—'; }
  };
  const mins = approvalMinutesLeft(booking.pendingUntil);
  const total = Number(booking.grandTotal || 0).toFixed(2);
  const releasesOnSilence = booking.approvalNoResponseAction === 'release';
  const fallbackCopy = releasesOnSilence
    ? (mins > 0
      ? `No answer in <strong>${mins} min</strong> releases this request, voids the $1 hold and tells the guest.`
      : 'Your no-answer rule is about to release this request and notify the guest.')
    : (mins > 0
      ? `No answer in <strong>${mins} min</strong> keeps this booking and sends the confirmation.`
      : 'Your no-answer rule is about to keep this booking and send the confirmation.');

  const overlay = document.createElement('div');
  overlay.id = 'bookingApprovalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100004;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:24px 22px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="margin-bottom:6px;"><i data-lucide="bed" style="width:28px;height:28px;"></i></div>
        <h2 style="font-size:18px;font-weight:800;color:#1a1a2e;margin:0 0 6px;">Is this room still free?</h2>
        <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;">
          ${fallbackCopy}
        </p>
      </div>
      <div style="background:#f8f9fa;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
        <div style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:2px;">${esc(booking.guestName || 'Guest')}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${esc(booking.guestPhone || '')}</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;">
          <div>${esc(booking.roomName || 'Room')}</div>
          <div>${fmt(booking.checkinDate)} → ${fmt(booking.checkoutDate)}</div>
          <div>${booking.nights} night${booking.nights !== 1 ? 's' : ''} · $${total}</div>
        </div>
      </div>
      <button type="button" id="bookingApprovalConfirm" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Yes, keep the booking</button>
      <button type="button" id="bookingApprovalRelease" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid #dc2626;background:none;color:#dc2626;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">No, release the request</button>
      <button type="button" id="bookingApprovalLater" style="width:100%;padding:11px;border-radius:12px;border:none;background:none;color:#6b7280;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Close for now</button>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:10px 0 0;text-align:center;">Releasing voids the $1 card hold and emails the guest that you couldn't take it.</p>
    </div>`;
  document.body.appendChild(overlay);

  const buttons = ['bookingApprovalConfirm', 'bookingApprovalRelease', 'bookingApprovalLater']
    .map((id) => document.getElementById(id));
  const setBusy = (busy) => buttons.forEach((btn) => { if (btn) btn.disabled = busy; });
  const close = () => {
    overlay.remove();
    setNativeModalOpen('booking-approval', false);
  };

  const decide = async (action) => {
    setBusy(true);
    const ok = await submitBookingApproval(token, action);
    setBusy(false);
    if (ok) close();
  };

  document.getElementById('bookingApprovalConfirm').onclick = () => decide('confirm');
  document.getElementById('bookingApprovalRelease').onclick = () => decide('release');
  document.getElementById('bookingApprovalLater').onclick = close;
}

async function submitBookingApproval(token, action) {
  try {
    const res = await fetch('/api/booking-approval/act', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!body || body.success !== true) {
      toast(body && body.message ? body.message : 'Could not apply that.', 'error');
      return false;
    }
    if (body.alreadyDecided) toast(`Already ${body.status || 'decided'}.`, 'info');
    else showBookingFulfillmentToast(action, body.fulfillment);
    if (crm.token) loadBookings().catch(() => {});
    return true;
  } catch (_) {
    toast('Could not apply that.', 'error');
    return false;
  }
}

function showBookingFulfillmentToast(action, fulfillment) {
  const state = String(fulfillment?.status || 'pending').toLowerCase();
  if (state === 'completed') {
    toast(
      action === 'release'
        ? 'Handled — room released, card hold cleared, and guest notified.'
        : 'Handled — booking confirmed and guest emailed.',
      'success'
    );
    return;
  }
  if (state === 'attention') {
    toast('The room decision is saved, but a guest action needs attention. Front Desk will show the issue.', 'error');
    return;
  }
  toast(
    action === 'release'
      ? 'Room released. Front Desk is finishing the card hold and guest email.'
      : 'Booking confirmed. Front Desk is finishing the guest email.',
    'info'
  );
}

// Deciding costs a POST and then a reload of bookings, conflicts and
// availability — several seconds on hotel wifi. Without a pending state the
// owner taps, nothing moves, and the honest reading is that the tap missed. So
// the card commits visually the moment it is pressed, and both buttons lock so
// the same request cannot be sent twice while the first is in flight.
function setBookingDecisionPending(bookingId, action) {
  const card = document.querySelector(`[data-booking-id="${CSS.escape(String(bookingId))}"]`);
  const scope = card || document;
  const buttons = [...scope.querySelectorAll('button')]
    .filter((button) => (button.getAttribute('onclick') || '').includes(`'${bookingId}'`));
  if (!buttons.length) return () => {};
  const restore = buttons.map((button) => ({ button, html: button.innerHTML, disabled: button.disabled }));
  buttons.forEach((button) => {
    button.disabled = true;
    button.classList.add('is-deciding');
    const isThisOne = (button.getAttribute('onclick') || '').includes(`'${action}'`);
    if (isThisOne) {
      button.classList.add('is-active');
      button.innerHTML = action === 'confirm' ? 'Keeping…' : 'Releasing…';
    }
  });
  return () => restore.forEach(({ button, html, disabled }) => {
    button.innerHTML = html;
    button.disabled = disabled;
    button.classList.remove('is-deciding', 'is-active');
  });
}

async function decideBookingFromCard(bookingId, action) {
  const restoreButtons = setBookingDecisionPending(bookingId, action);
  try {
    const body = await api('POST', `/api/crm/bookings/${encodeURIComponent(bookingId)}/approval`, { action });
    if (!body?.success) throw new Error(body?.message || 'Could not apply that decision.');
    if (body.alreadyDecided) toast(`That request was already ${body.status || 'decided'}.`, 'info');
    else showBookingFulfillmentToast(action, body.fulfillment);
    // No restore on success: loadBookings replaces the card with its decided
    // state, so putting the old label back would flash the pending buttons.
    await loadBookings();
    await Promise.allSettled([loadBookingConflicts(), loadManualAvailability()]);
  } catch (error) {
    restoreButtons();
    toast(error?.message || 'Could not apply that decision.', 'error');
  }
}

// ── CONFIRMED BOOKING REVIEW ───────────────────────────────────
// The guest is already confirmed. This follow-up keeps the booking visible until
// the owner verifies the room, and lets a signed notification link cancel safely
// without making the owner enter a PIN first.

function getBookingReviewTokenFromUrl() {
  try {
    return String(new URLSearchParams(window.location.search).get('review') || '').trim();
  } catch (_) {
    return '';
  }
}

function stripBookingReviewTokenFromUrl() {
  try {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('review');
    window.history.replaceState({}, '', cleanUrl);
  } catch (_) {}
}

function bookingReviewDateLabel(value) {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
  } catch (_) {
    return '—';
  }
}

async function maybeShowBookingReviewCard() {
  const token = getBookingReviewTokenFromUrl();
  if (!token) return;
  stripBookingReviewTokenFromUrl();
  try {
    const res = await fetch('/api/booking-review/peek?token=' + encodeURIComponent(token));
    const body = await res.json().catch(() => ({}));
    if (!body?.success || !body.data) {
      toast(body?.message || 'That booking link has expired.', 'error');
      return;
    }
    showBookingReviewModal(token, body.data);
  } catch (_) {
    toast('Could not load that booking.', 'error');
  }
}

async function openBookingReviewFromCard(bookingId) {
  try {
    const body = await api('GET', `/api/crm/bookings/${encodeURIComponent(bookingId)}/review-token`);
    if (!body?.success || !body.token || !body.data) {
      toast(body?.message || 'Could not open that booking.', 'error');
      return;
    }
    showBookingReviewModal(body.token, body.data);
  } catch (_) {
    toast('Could not open that booking.', 'error');
  }
}

function showBookingReviewModal(token, booking) {
  document.getElementById('bookingReviewOverlay')?.remove();
  setNativeModalOpen('booking-review', true);
  const total = Number(booking.grandTotal || 0).toFixed(2);
  const paidNow = Number(booking.amountPaidNow || 0);
  const isDead = ['cancelled', 'canceled', 'released'].includes(String(booking.status || '').toLowerCase());
  const alreadyAvailable = String(booking.reviewStatus || '').toLowerCase() === 'available';
  const overlay = document.createElement('div');
  overlay.id = 'bookingReviewOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100006;background:rgba(15,23,20,.58);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;';
  overlay.innerHTML = `
    <div style="background:#fff;border:1.5px solid #D8E4DC;border-radius:22px;padding:22px 20px;max-width:390px;width:100%;max-height:calc(100dvh - 32px);overflow-y:auto;box-shadow:0 24px 70px rgba(15,35,26,.28);box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <div style="width:42px;height:42px;border-radius:13px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;">✓</div>
        <div>
          <div style="font-size:11px;font-weight:850;color:#2E7D5B;text-transform:uppercase;letter-spacing:.07em;">Confirmed booking</div>
          <h2 style="font-size:20px;font-weight:850;color:#1A2B22;margin:2px 0 0;">Verify the room</h2>
        </div>
      </div>
      <p style="font-size:13px;color:#5D6E64;line-height:1.55;margin:0 0 15px;">The guest is already confirmed. Check your notebook and other booking sites, then mark whether this room is available.</p>
      <div style="background:#F7F9F8;border:1px solid #E1E9E4;border-radius:15px;padding:15px;margin-bottom:16px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px;">
          <div style="min-width:0;">
            <div style="font-size:16px;font-weight:850;color:#1A2B22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(booking.guestName || 'Guest')}</div>
            <div style="font-size:12px;color:#6B7D72;margin-top:2px;">${esc(booking.guestPhone || booking.guestEmail || '')}</div>
          </div>
          <div style="font-size:16px;font-weight:850;color:#2E7D5B;white-space:nowrap;">$${total}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="background:#fff;border-radius:10px;padding:9px 10px;"><div style="font-size:9px;text-transform:uppercase;font-weight:800;color:#7B8C82;">Check-in</div><div style="font-size:12px;font-weight:750;color:#1A2B22;margin-top:2px;">${bookingReviewDateLabel(booking.checkinDate)}</div></div>
          <div style="background:#fff;border-radius:10px;padding:9px 10px;"><div style="font-size:9px;text-transform:uppercase;font-weight:800;color:#7B8C82;">Check-out</div><div style="font-size:12px;font-weight:750;color:#1A2B22;margin-top:2px;">${bookingReviewDateLabel(booking.checkoutDate)}</div></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;color:#33443A;">
          <strong>${esc(booking.roomName || 'Room')}</strong>
          <span>${paidNow > 0 ? 'Paid online' : 'Collect at check-in'}</span>
        </div>
      </div>
      ${isDead
        ? '<div style="background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;text-align:center;">This booking has already been cancelled.</div>'
        : (alreadyAvailable
          ? '<div style="background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;text-align:center;">Room availability has been verified.</div>'
          : `<button type="button" id="bookingReviewAvailable" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:9px;">Room Is Available</button>
             <button type="button" id="bookingReviewCancel" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid #DC2626;background:#fff;color:#B91C1C;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">Room Is Taken — Cancel Booking</button>
             <p style="font-size:10.5px;color:#8A9990;line-height:1.45;margin:9px 3px 0;text-align:center;">Cancelling emails the guest and releases their card hold or refunds any captured payment.</p>`)}
      <button type="button" id="bookingReviewLater" style="width:100%;padding:11px;border:none;background:none;color:#7B8C82;font-family:inherit;font-size:13px;font-weight:650;cursor:pointer;margin-top:5px;">${isDead || alreadyAvailable ? 'Close' : 'Review later'}</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    setNativeModalOpen('booking-review', false);
  };
  const setBusy = (busy) => {
    ['bookingReviewAvailable', 'bookingReviewCancel', 'bookingReviewLater'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = busy;
    });
  };
  document.getElementById('bookingReviewLater').onclick = close;
  const availableBtn = document.getElementById('bookingReviewAvailable');
  if (availableBtn) {
    availableBtn.onclick = async () => {
      setBusy(true);
      const result = await submitBookingReview(token, 'available');
      setBusy(false);
      if (result?.success) {
        close();
        toast('Room verified — reminders stopped.', 'success');
        if (crm.token) loadBookings().catch(() => {});
      }
    };
  }
  const cancelBtn = document.getElementById('bookingReviewCancel');
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      setBusy(true);
      cancelBtn.textContent = 'Cancelling…';
      const result = await submitBookingReview(token, 'cancel');
      setBusy(false);
      if (result?.success) {
        close();
        toast('Booking cancelled — the guest has been emailed.', 'success');
        if (crm.token) loadBookings().catch(() => {});
        if (result.calendarCorrection) {
          showAvailabilityCorrectionModal(result.calendarCorrection, { token });
        }
      } else {
        cancelBtn.textContent = 'Room Is Taken — Cancel Booking';
      }
    };
  }
}

async function submitBookingReview(token, action) {
  try {
    const res = await fetch('/api/booking-review/act', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!body?.success) {
      toast(body?.message || 'Could not update that booking.', 'error');
      return null;
    }
    return body;
  } catch (_) {
    toast('Could not update that booking.', 'error');
    return null;
  }
}

function showAvailabilityCorrectionModal(correction, options = {}) {
  if (!correction?.roomName || !correction?.checkinDate || !correction?.checkoutDate) return;
  document.getElementById('availabilityCorrectionOverlay')?.remove();
  setNativeModalOpen('availability-correction', true);
  const totalUnits = Math.max(1, parseInt(correction.totalUnits, 10) || 1);
  const choices = Array.from({ length: totalUnits + 1 }, (_, value) =>
    `<option value="${value}"${value === 0 ? ' selected' : ''}>${value} room${value === 1 ? '' : 's'} available</option>`
  ).join('');
  const overlay = document.createElement('div');
  overlay.id = 'availabilityCorrectionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100007;background:rgba(15,23,20,.58);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
  overlay.innerHTML = `
    <div style="background:#fff;border:1.5px solid #D8E4DC;border-radius:22px;padding:22px 20px;max-width:390px;width:100%;max-height:calc(100dvh - 32px);overflow-y:auto;box-shadow:0 24px 70px rgba(15,35,26,.28);box-sizing:border-box;">
      <div style="font-size:11px;font-weight:850;color:#B45309;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;">Fix the calendar</div>
      <h2 style="font-size:20px;font-weight:850;color:#1A2B22;margin:0 0 7px;">Stop this happening again</h2>
      <p style="font-size:13px;color:#5D6E64;line-height:1.55;margin:0 0 15px;">Set Marketel’s remaining availability for <strong>${esc(correction.roomName)}</strong> during this stay.</p>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;background:#F7F9F8;border:1px solid #E1E9E4;border-radius:13px;padding:13px;margin-bottom:14px;">
        <div style="background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:7px 9px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#7B8C82;text-transform:uppercase;">From</div><div style="font-size:12px;font-weight:800;color:#1A2B22;">${bookingReviewDateLabel(correction.checkinDate)}</div></div>
        <div style="color:#2E7D5B;font-weight:900;">→</div>
        <div style="background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:7px 9px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#7B8C82;text-transform:uppercase;">Until</div><div style="font-size:12px;font-weight:800;color:#1A2B22;">${bookingReviewDateLabel(correction.checkoutDate)}</div></div>
      </div>
      <label for="availabilityCorrectionUnits" style="display:block;font-size:11px;font-weight:800;color:#52645A;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Remaining online availability</label>
      <select id="availabilityCorrectionUnits" style="width:100%;padding:13px 12px;border:1.5px solid #D8E4DC;border-radius:11px;background:#fff;color:#1A2B22;font-family:inherit;font-size:14px;font-weight:700;margin-bottom:11px;">${choices}</select>
      <button type="button" id="availabilityCorrectionSave" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;">Update These Dates</button>
      <button type="button" id="availabilityCorrectionLater" style="width:100%;padding:11px;border:none;background:none;color:#7B8C82;font-family:inherit;font-size:13px;font-weight:650;cursor:pointer;margin-top:5px;">Not now</button>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    setNativeModalOpen('availability-correction', false);
  };
  document.getElementById('availabilityCorrectionLater').onclick = close;
  document.getElementById('availabilityCorrectionSave').onclick = async () => {
    const save = document.getElementById('availabilityCorrectionSave');
    const availableUnits = Math.max(0, parseInt(document.getElementById('availabilityCorrectionUnits').value, 10) || 0);
    save.disabled = true;
    save.textContent = 'Updating…';
    try {
      let body;
      if (options.token) {
        const res = await fetch('/api/booking-review/block-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: options.token, availableUnits }),
        });
        body = await res.json().catch(() => ({}));
      } else {
        const lastNight = new Date(correction.checkoutDate);
        lastNight.setUTCDate(lastNight.getUTCDate() - 1);
        body = await api('POST', '/api/crm/manual-availability/range', {
          roomName: correction.roomName,
          startDate: new Date(correction.checkinDate).toISOString().slice(0, 10),
          endDate: lastNight.toISOString().slice(0, 10),
          availableUnits,
          closed: availableUnits === 0,
        });
      }
      if (!body?.success) throw new Error(body?.message || 'Could not update those dates.');
      close();
      toast('Availability updated for those dates.', 'success');
      if (crm.token) loadManualAvailability({ silent: true }).catch(() => {});
    } catch (e) {
      toast(e?.message || 'Could not update those dates.', 'error');
      save.disabled = false;
      save.textContent = 'Update These Dates';
    }
  };
}

function refreshAppsInstallSection() {
  const fn = (typeof ensureAppsViewRendered === 'function')
    ? ensureAppsViewRendered
    : window.ensureAppsViewRendered;
  if (typeof fn === 'function') fn(true);
}

function handleInstallFrontdesk() {
  openFrontdeskAppDownload();
}

async function toggleAppNotifications() {
  if (isNativeFrontdeskApp()) {
    try {
      const result = await api('POST', '/api/push/test', {});
      if (!result?.success) throw new Error(result?.message || 'Could not reach this iPhone.');
      toast('Test notification sent', 'success');
    } catch (e) {
      toast(e.message || 'Could not send test', 'error');
    }
    return;
  }
  const granted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  if (granted) {
    // Already on — fire a test so they know it works.
    try {
      await api('POST', '/api/push/test', {});
      toast('Test notification sent', 'success');
    } catch (e) {
      toast('Could not send test', 'error');
    }
    return;
  }
  await enableNotifications();
  refreshAppsInstallSection();
}

async function enableBookingAlerts() {
  const granted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  if (!granted) {
    const notificationsEnabled = await enableNotifications();
    if (!notificationsEnabled) return false;
  }
  refreshAppsInstallSection();
  return true;
}

// First-launch nudge inside the INSTALLED app. Installing a PWA never asks for
// notifications on its own — permission is a separate, gesture-driven step (iOS
// flat-out ignores requestPermission unless it comes from a tap). So the first
// time they open the installed Front Desk we surface a one-time card whose
// "Enable" button supplies that gesture. Shown once per device.
function maybePromptInstalledNotifications() {
  try {
    if (isNativeFrontdeskApp()) return;             // native onboarding owns this permission
    if (!isStandaloneApp()) return;                 // only inside the installed app
    if (!pushSupported()) return;                   // device can't do web push
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    if (localStorage.getItem('notifPromptShown') === '1') return;
    // Don't stack on top of the welcome / payment-success modals.
    if (document.getElementById('welcomeModalOverlay') || document.getElementById('activatedModalOverlay')) return;
    localStorage.setItem('notifPromptShown', '1');
    setTimeout(showNotifPromptModal, 700);
  } catch (_) {}
}

function showNotifPromptModal() {
  if (document.getElementById('notifPromptOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'notifPromptOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="margin-bottom:10px;"><i data-lucide="bell" style="width:28px;height:28px;"></i></div>
      <h2 style="font-size:19px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Turn on booking alerts?</h2>
      <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 20px;">Confirmed bookings and guest messages will reach this phone, even when Front Desk is closed.</p>
      <button id="notifPromptEnable" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Turn on booking alerts</button>
      <button id="notifPromptLater" style="width:100%;padding:12px;border-radius:12px;border:none;background:none;color:#6b7280;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Not now</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('notifPromptEnable').onclick = async () => {
    overlay.remove();
    await enableBookingAlerts();   // runs inside this tap → gesture requirement satisfied
  };
  document.getElementById('notifPromptLater').onclick = () => overlay.remove();
}

// Reusable themed iOS "Add to Home Screen" instruction sheet.
// On iOS 26+ the card pins to the TOP of the screen: Safari's "⋯" menu and the
// share sheet slide up over the bottom half, so a top-pinned card stays visible
// the whole time the user is following the steps.
function showIosInstallSheet({ title, subtitle, iconUrl, openUrl, alertsNote } = {}) {
  const existing = document.getElementById('iosInstallSheet');
  if (existing) existing.remove();
  const ios26 = isIos26Plus();
  const overlay = document.createElement('div');
  overlay.id = 'iosInstallSheet';
  overlay.style.cssText = `position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;align-items:${ios26 ? 'flex-start' : 'flex-end'};justify-content:center;`;
  const iconTile = iconUrl
    ? `<img src="${iconUrl}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${(crm.activeHotelName || 'B').trim().charAt(0).toUpperCase()}</div>`;
  const stepBadge = (n) => `<span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${n}</span>`;
  const stepRow = (n, inner) => `<div style="display:flex;align-items:center;gap:12px;">${stepBadge(n)}<div style="font-size:14px;color:#374151;line-height:1.4;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">${inner}</div></div>`;
  const stepsHtml = ios26
    ? `
        ${stepRow(1, `Tap the <i data-lucide="ellipsis" style="width:18px;height:18px;color:#374151;vertical-align:middle;"></i> button in the bottom right`)}
        ${stepRow(2, `Tap <strong>Share</strong> <i data-lucide="share" style="width:18px;height:18px;color:#007aff;vertical-align:middle;"></i>`)}
        ${stepRow(3, `Tap <strong>View More</strong>, then <strong>Add to Home Screen</strong> <i data-lucide="square-plus" style="width:18px;height:18px;color:#2E7D5B;vertical-align:middle;"></i>`)}
        ${stepRow(4, `Tap <strong>Add</strong> — done! It's on your home screen.`)}
        <div style="font-size:12px;color:#6b7280;line-height:1.4;padding-left:38px;">Already see the Share button in Safari's bar? Skip step 1.</div>
        <div style="margin-top:2px;font-size:12px;font-weight:600;color:#2E7D5B;background:#E8F5EE;border:1px solid #D8E4DC;border-radius:10px;padding:9px 12px;text-align:center;">These steps stay on screen while you do it — go ahead.</div>`
    : `
        ${stepRow(1, `Tap the <strong>Share</strong> button <i data-lucide="share" style="width:18px;height:18px;color:#007aff;vertical-align:middle;"></i> in Safari's bar`)}
        ${stepRow(2, `Scroll down and tap <strong>Add to Home Screen</strong> <i data-lucide="square-plus" style="width:18px;height:18px;color:#2E7D5B;vertical-align:middle;"></i>`)}
        ${stepRow(3, `Tap <strong>Add</strong> — done! It's on your home screen.`)}`;
  const cardStyle = ios26
    ? 'position:relative;background:#fff;width:100%;max-width:440px;border-radius:0 0 20px 20px;padding:calc(18px + env(safe-area-inset-top,0px)) 22px 22px;box-shadow:0 8px 40px rgba(0,0,0,0.2);'
    : 'position:relative;background:#fff;width:100%;max-width:440px;border-radius:20px 20px 0 0;padding:24px 22px 32px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);';
  overlay.innerHTML = `
    <div id="iosInstallSheetCard" style="${cardStyle}">
      <button type="button" id="iosInstallSheetClose" aria-label="Close" style="position:absolute;top:${ios26 ? 'calc(14px + env(safe-area-inset-top,0px))' : '14px'};right:14px;width:32px;height:32px;border-radius:50%;border:none;background:#f3f4f6;color:#6b7280;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-size:20px;line-height:1;font-family:inherit;">×</button>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-right:36px;">
        ${iconTile}
        <div><div style="font-size:16px;font-weight:800;color:#1a1a2e;">${title || 'Install app'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${subtitle || ''}</div></div>
      </div>
      ${openUrl ? `<a href="${openUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;width:100%;margin-bottom:16px;padding:12px;border-radius:11px;border:1.5px solid #2E7D5B;background:none;color:#2E7D5B;font-size:14px;font-weight:700;">Open booking page →</a>` : ''}
      ${alertsNote ? `<div style="margin-bottom:16px;font-size:12px;color:#92400E;background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 12px;line-height:1.5;">${alertsNote}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:12px;">${stepsHtml}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const close = () => overlay.remove();
  const closeBtn = document.getElementById('iosInstallSheetClose');
  if (closeBtn) closeBtn.onclick = close;
}


exposeToWindow({
  addDaysIso,
  addDummyBookings,
  addNote,
  api,
  applyBookingsSubview,
  applyFilter,

  applyRiseStagger,
  applyGuestBroadcastAudienceUi,
  applyLegacyHotelContext,
  availabilityForDay,
  bindAvailabilityUiEvents,
  blockedDemandLineHtml,
  bookingCardHtml,
  bookingsByRoomDate,
  bootCrmApp,
  conflictBannerHtml,
  decideBookingFromCard,
  dismissDeclinedLead,
  dismissGrowthDiscoveryCard,
  loadBookingConflicts,
  loadOperationalReadiness,
  maybeShowBookingApprovalCard,
  maybeShowBookingReviewCard,
  openBookingReviewFromCard,
  promptCancelBooking,
  operationalReadinessAction,
  renderBookingsNotices,
  retryBookingFulfillment,
  reportFrontdeskInstalled,
  showBookingApprovalModal,
  showBookingReviewModal,
  showAvailabilityCorrectionModal,
  submitBookingApproval,
  submitBookingReview,
  toggleBookingDetails,
  buildGuestInstallUrlForQr,
  buildHotelContextUrl,
  buildMessageThreads,
  changeAvailabilityMonth,
  closeAvailabilityDayPopover,
  closeAvailabilityPopoverIfOutside,
  closeCheckinQrOverlay,
  closeNotesModal,
  closeRoomsAddModal,
  closeRoomsDeleteModal,
  closeRoomsEditModal,
  confirmDeleteRoomType,
  deleteRoomType,
  doLogin,
  enableNotifications,
  enableBookingAlerts,
  ensureAvailabilityUi,
  ensureBookingsVirtualScroll,
  ensureGrowthStyles,
  enumerateDates,
  esc,
  finishTourHydration,
  formatContextDebugLines,
  formatCurrencyCompact,
  getBookingReservationCode,
  guestBookingEngineUrl,
  openGuestBookingEngine,
  openFrontdeskAppDownload,
  getContextParam,
  getDetectedHostname,
  getManualRoomByName,
  goLiveBannerHtml,
  goLiveInlineCardHtml,
  goToAvailabilityTab,
  growthCheckDone,
  guestBroadcastCardHtml,
  handleInstallFrontdesk,
  hydrateCrmAfterTour,
  hydrateCrmInBackground,
  initMobileBottomNav,
  invokeLoadEditRooms,
  isEditPageDomReady,
  isIosDevice,
  isNativeFrontdeskApp,
  marketelNativeNotificationState,
  nativeShellPost,
  openNativeNotificationSettings,
  isPwaSimulated,
  isStandaloneApp,
  jsStr,
  loadBlockedDemand,
  loadBookings,
  loadGrowthData,
  loadHotelContext,
  loadLaunchStatus,
  loadManualAvailability,
  loadMessageBadges,
  loadMessages,
  loadRevenueData,
  markAllMessagesRead,
  markActiveMessageThreadRead,
  markConfirmed,
  markMessageRead,
  marketelNativeAction,
  marketelNativeSelectTab,
  marketelNativeSwitchProperty,
  maybePromptInstalledNotifications,
  moveSlider,
  needsEditPageLoad,
  normalizeRevenuePeriod,
  openAvailabilityDayPopover,
  openGrowthWorkspace,
  openGuestAppSharing,
  openInAppBrowser,
  openMarketelBillingPortal,
  openMarketelSupport,
  openMessagesWorkspace,
  openRoomsAddModal,
  openRoomsDeleteModal,
  openRoomsEditModal,
  pickDefaultMessageThread,
  pickMessageThread,
  prefillGuestInstallBroadcast,
  updateGuestBroadcastPreview,
  promptUploadLogoBeforeQr,
  pushSupported,
  refreshAppsInstallSection,
  refreshCurrentView,
  refreshGoLiveInlineCard,
  refreshMobileBottomNavIcons,
  refreshRatesInputs,
  refreshSupportSummary,
  refreshRoomBadge,
  renderAvailabilityCalendar,
  renderAvailabilityEmptyState,
  renderAvailabilityView,
  renderBookingFilterChips,
  renderBookings,
  renderBookingsSubtabs,
  renderBookingsWindow,
  renderGrowthPanel,
  renderMessageThreadDetail,
  renderMessageThreadPicker,
  renderMessages,
  renderRevenueRooms,
  renderRevenueView,
  renderRoomPills,
  replyToThread,
  resolveLegacyCrmHotelId,
  revenuePeriodLabel,
  roomDateKey,
  saveAvailabilityDay,
  saveEditedRoomType,
  saveNote,
  saveRoomType,
  seedTourRevenueShell,
  sendGuestBroadcast,
  sendMagicLink,
  selectNativeProperty,
  setActiveManualRoom,
  setAvailabilityDaySaving,
  setBookingCallFilter,
  setBookingsSubview,
  setFilter,
  setGrowthChecklistItem,
  setGrowthPeriod,
  setMessageThread,
  openMessagesWorkspaceThread,
  handleMessagesWorkspaceBack,
  setNativeModalOpen,
  setNativeShellVisible,
  setNotificationButtonState,
  showBootState,
  showCheckinQrOverlay,
  showHotelContextError,
  showIosInstallSheet,
  showLogin,
  showMagicLinkForm,
  showNativePropertyPicker,
  showNotifPromptModal,
  startCrmApp,
  stepAvailabilityDay,
  syncMobileNavActive,
  syncNotificationButtonState,
  syncNativeShellState,
  syncRevenueUi,
  threadSummary,
  timeAgo,
  toIsoDate,
  toast,
  toggleWebLoginMethod,
  toggleAppNotifications,
  toggleAvailabilityDayClosed,
  toggleMessageThreadPicker,
  toggleMessagesInbox,
  closeMessagesWorkspace,
  confirmTrialLinkPlaced,
  twoRoomExplainerHtml,
  updateBookingsTabBadge,
  updateFrontdeskManifestLink,
  updateGoLiveBanner,
  updateHotelChrome,
  updateMessageBadges,
  updateMobileRevenueNavVisibility,
  urlBase64ToUint8Array,
  verifyCrmToken,
  loadSettingsModule,
  loadAppsModule,
  loadRevealModule,
  loadMarketelTrialStatus,
  replayWalkthrough,
  replayValueReveal,
  resetWalkthroughProgress,
});

// ── INIT ───────────────────────────────────────────────
if (!isNativeFrontdeskApp() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/frontdesk-sw.js').catch(() => {});
}
const signInBtn = document.getElementById('signInBtn');
if (signInBtn) signInBtn.addEventListener('click', () => { void doLogin(); });
const pinInputEl = document.getElementById('pinInput');
if (pinInputEl) pinInputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doLogin(); });
const magicLinkSendBtn = document.getElementById('magicLinkSendBtn');
if (magicLinkSendBtn) magicLinkSendBtn.addEventListener('click', () => { void sendMagicLink(); });
const nativeCodeRequestBtn = document.getElementById('nativeCodeRequestBtn');
if (nativeCodeRequestBtn) nativeCodeRequestBtn.addEventListener('click', () => { void requestNativeLoginCode(); });
const nativeCodeVerifyBtn = document.getElementById('nativeCodeVerifyBtn');
if (nativeCodeVerifyBtn) nativeCodeVerifyBtn.addEventListener('click', () => { void verifyNativeLoginCode(); });
const nativeCodeInput = document.getElementById('nativePropertyCode');
if (nativeCodeInput) {
  let nativeCodeAutoSubmitTimer = null;
  nativeCodeInput.addEventListener('input', () => {
    nativeCodeInput.value = nativeCodeInput.value.replace(/\D/g, '').slice(0, 6);
    if (nativeCodeAutoSubmitTimer) clearTimeout(nativeCodeAutoSubmitTimer);
    if (nativeCodeInput.value.length === 6) {
      // iOS 17.2+ can fill Mail/SMS codes into one-time-code fields in a
      // WKWebView. Let that single tap finish sign-in without requiring a
      // second tap on Continue. The short delay lets WebKit finish committing
      // the AutoFill value before the request reads it.
      nativeCodeAutoSubmitTimer = setTimeout(() => {
        nativeCodeAutoSubmitTimer = null;
        void verifyNativeLoginCode();
      }, 120);
    }
  });
  nativeCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void verifyNativeLoginCode(); });
}
const nativePinLoginBtn = document.getElementById('nativePinLoginBtn');
if (nativePinLoginBtn) nativePinLoginBtn.addEventListener('click', () => { void nativePinLogin(); });
const nativePinInput = document.getElementById('nativePropertyPin');
if (nativePinInput) nativePinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void nativePinLogin(); });
const nativePinLoginToggle = document.getElementById('nativePinLoginToggle');
if (nativePinLoginToggle) nativePinLoginToggle.addEventListener('click', () => {
  document.getElementById('nativePropertySignIn').style.display = 'none';
  document.getElementById('nativePinLogin').style.display = 'block';
});
const nativeEmailLoginToggle = document.getElementById('nativeEmailLoginToggle');
if (nativeEmailLoginToggle) nativeEmailLoginToggle.addEventListener('click', resetNativeSignIn);
const nativeAddAccountBtn = document.getElementById('nativeAddAccountBtn');
if (nativeAddAccountBtn) nativeAddAccountBtn.addEventListener('click', () => {
  try {
    localStorage.removeItem('crmToken');
    localStorage.removeItem(NATIVE_PROPERTIES_KEY);
    localStorage.removeItem(NATIVE_SELECTED_HOTEL_KEY);
  } catch (_) {}
  crm.token = '';
  resetNativeSignIn();
});
const nativePropertyCancelBtn = document.getElementById('nativePropertyCancelBtn');
if (nativePropertyCancelBtn) nativePropertyCancelBtn.addEventListener('click', cancelNativePropertyPicker);
bootCrmApp();
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => { loadAppsModule().catch(() => {}); }, { timeout: 4000 });
} else {
  setTimeout(() => { loadAppsModule().catch(() => {}); }, 2000);
}
// Freshness is event-driven first: an incoming Web Push/native APNs alert,
// returning to the app, reconnecting, or reopening a tab refreshes immediately.
// A visible-only poll is the fallback for changes made by another employee.
window.addEventListener('focus', () => requestAutomaticRefresh('focus'));
window.addEventListener('pageshow', () => requestAutomaticRefresh('pageshow'));
window.addEventListener('online', () => requestAutomaticRefresh('online'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestAutomaticRefresh('visible');
});
if (isNativeFrontdeskApp()) {
  document.addEventListener('touchstart', markNativeScrollInteraction, { passive: true });
  document.addEventListener('touchmove', markNativeScrollInteraction, { passive: true });
  document.addEventListener('touchend', markNativeScrollInteraction, { passive: true });
  document.addEventListener('scroll', markNativeScrollInteraction, { passive: true, capture: true });
  document.addEventListener('focusout', () => {
    if (!deferredAutomaticRefreshSource) return;
    window.setTimeout(() => {
      if (!deferredAutomaticRefreshSource) return;
      const source = deferredAutomaticRefreshSource;
      deferredAutomaticRefreshSource = '';
      requestAutomaticRefresh(source);
    }, 180);
  });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.type === 'marketel-frontdesk-data-updated') {
      requestAutomaticRefresh('push');
    }
  });
}
setInterval(() => requestAutomaticRefresh('poll'), 12000);
(function(){
  function loadTelemetry(){
    const s = document.createElement('script');
    s.src = '/marketel-telemetry.js';
    s.defer = true;
    document.body.appendChild(s);
  }
  if ('requestIdleCallback' in window) requestIdleCallback(loadTelemetry, { timeout: 8000 });
  else setTimeout(loadTelemetry, 4000);
})();
