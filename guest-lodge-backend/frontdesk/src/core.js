import { crm } from './state.js';

import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';

let settingsModulePromise = null;
let appsModulePromise = null;

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

// ── PWA INSTALL / NOTIFICATIONS STATE ──────────────────────────
// Captured as early as possible so the "Install Front Desk" button can fire the
// browser's native install prompt on Android/desktop.
let guestPushSubscriberCount = 0;
const GUEST_BROADCAST_DEMO_VIDEO = 'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/v1781196304/ScreenRecording_06-11-2026_19-41-56_1_kjgudg.mp4';
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  crm.deferredInstallPrompt = e;
  try { refreshFrontdeskInstallCard(); } catch (_) {}
});
window.addEventListener('appinstalled', () => {
  crm.frontdeskInstalled = true;
  crm.deferredInstallPrompt = null;
  try { refreshFrontdeskInstallCard(); } catch (_) {}
  try { window.refreshAppsInstallSection?.(); } catch (_) {}
});

function isIosDevice() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandaloneApp() {
  try {
    const qs = new URLSearchParams(window.location.search);
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
try { crm.token = localStorage.getItem('crmToken') || ''; } catch(e) {}

// Auto-login from ?pin= URL param (coming from setup wizard)
try {
  const _urlPin = new URLSearchParams(window.location.search).get('pin');
  if (_urlPin) {
    crm.token = _urlPin;
    localStorage.setItem('crmToken', crm.token);
    // Clean URL but keep hotelId if present
    const _cleanUrl = new URL(window.location);
    _cleanUrl.searchParams.delete('pin');
    window.history.replaceState({}, '', _cleanUrl);
  }
} catch(e) {}

// Auto-login from ?magic= token (magic link email)
try {
  const _magicToken = new URLSearchParams(window.location.search).get('magic');
  if (_magicToken) {
    crm._magicLoginPending = true;
    fetch('/api/auth/verify-magic?token=' + encodeURIComponent(_magicToken))
      .then(r => r.json())
      .then(data => {
        if (data.success && data.pin) {
          crm.token = data.pin;
          localStorage.setItem('crmToken', crm.token);
          const _cleanUrl = new URL(window.location);
          _cleanUrl.searchParams.delete('magic');
          window.history.replaceState({}, '', _cleanUrl);
          // Reload to trigger normal boot with the new token
          window.location.reload();
        } else {
          crm._magicLoginPending = false;
          alert('Login link expired or invalid. Please request a new one.');
          const _cleanUrl = new URL(window.location);
          _cleanUrl.searchParams.delete('magic');
          window.history.replaceState({}, '', _cleanUrl);
        }
      })
      .catch(() => { crm._magicLoginPending = false; });
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
  const overrideHotelId = getContextParam('hotelId');
  if (overrideHotelId) return overrideHotelId;

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
  if (reason && window.console && typeof window.console.warn === 'function') {
    window.console.warn('Falling back to legacy CRM hotel resolution.', { hotelId: cleanHotelId, reason });
  }
  return true;
}

function buildHotelContextUrl() {
  const url = new URL('/api/hotel-context', window.location.origin);
  const overrideHotelId = getContextParam('hotelId');
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
}

function showBootState({ title, message, debug = '', showRetry = false } = {}) {
  document.getElementById('bootScreen').style.display = 'flex';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bootTitle').textContent = title || 'Connecting to hotel...';
  document.getElementById('bootMessage').textContent = message || 'Checking this domain and loading front desk context.';
  const debugEl = document.getElementById('bootDebug');
  debugEl.textContent = debug || '';
  debugEl.style.display = debug ? 'block' : 'none';
  document.getElementById('bootSpinnerWrap').style.display = showRetry ? 'none' : 'flex';
  document.getElementById('bootRetryBtn').style.display = showRetry ? 'block' : 'none';
}

function formatContextDebugLines(lines) {
  return lines.filter(Boolean).join('\n');
}

function showHotelContextError(error) {
  const status = Number(error && error.status) || 0;
  const host = getDetectedHostname() || 'unknown';
  const domain = (error && error.domain) ? String(error.domain) : '';
  const message = (error && error.message) ? String(error.message) : 'Could not load hotel context.';
  const debug = formatContextDebugLines([
    `Detected host: ${host}`,
    domain && domain !== host ? `Resolved domain: ${domain}` : '',
    crm.activeHotelId ? `Hotel ID: ${crm.activeHotelId}` : '',
  ]);

  if (!status) {
    showBootState({
      title: 'Network error',
      message: 'Could not reach the server to resolve this hotel. Check the network connection and try again.',
      debug,
      showRetry: true,
    });
    return;
  }

  showBootState({
    title: status === 404 ? 'Hotel not linked'
      : status === 403 ? 'Hotel inactive'
      : 'Hotel context error',
    message,
    debug,
    showRetry: true,
  });
}

async function loadHotelContext() {
  const res = await fetch(buildHotelContextUrl(), { headers: { 'Accept': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || `Failed to load hotel context (${res.status})`);
    err.status = res.status;
    err.domain = (json && json.domain) || getDetectedHostname();
    throw err;
  }

  const data = json.data || {};
  const config = data.config || {};
  if (!data.hotelId) {
    const err = new Error('Hotel context response is missing hotelId.');
    err.status = 500;
    throw err;
  }

  crm.activeHotelId = String(data.hotelId || '').trim();
  crm.activeHotelName = String(config.name || data.hotelId || '').trim();
  crm.activeHotelAppIcon = String(config.appIconUrl || '').trim();
  crm.activeHotelDomain = String(data.domain || getDetectedHostname() || '').trim();
  crm.activeHotelContext = data;
  updateHotelChrome();
  return data;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsStr(s) {
  return String(s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'\\r').replace(/\n/g,'\\n');
}

function guestBookingEngineUrl(options = {}) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const focusInstall = !!options.focusInstall;
  let url = '';

  if (isLocal && crm.activeHotelId) {
    url = 'http://localhost:5173/?hotelId=' + encodeURIComponent(crm.activeHotelId);
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
  window.open(url, '_blank');
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
  return d.toISOString().slice(0, 10);
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
  const existingBtn = document.getElementById('revenueTabBtn');
  const existingView = document.getElementById('revenueView');

  if (!crm.revenueEnabled) {
    if (existingBtn) existingBtn.remove();
    if (existingView) existingView.remove();
    if (crm.currentFilter === 'revenue') crm.currentFilter = 'bookings';
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) moveSlider(activeTab);
    updateMobileRevenueNavVisibility();
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
          </div>
          <div class="revenue-subhint" id="revenueSubhint">Last 30 days · stay dates</div>
          <div id="revenueStatus"></div>
          <div id="revenueContent" style="display:none">
            <div class="revenue-savings-pill">
              <div class="revenue-savings-copy" id="revenueSavingsCopy">You saved today</div>
              <div class="revenue-savings-value" id="revenueKpiSaved">$0</div>
            </div>
            <div class="revenue-grid">
              <div class="revenue-card">
                <div class="revenue-label">Revenue</div>
                <div class="revenue-value" id="revenueKpiRev">$0</div>
              </div>
              <div class="revenue-card">
                <div class="revenue-label">Bookings</div>
                <div class="revenue-value" id="revenueKpiBookings">0</div>
              </div>
            </div>
            <div class="revenue-bottom-grid">
              <div class="revenue-list-card">
                <div class="revenue-list-title">By room type</div>
                <div id="revenueRoomList"></div>
              </div>
            </div>
            <div style="margin-top:14px;padding:14px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;" id="paymentsExplainer">
              <div style="font-size:13px;font-weight:600;color:#166534;margin-bottom:6px;">🔒 How payments work</div>
              <p style="font-size:12px;color:#15803d;margin:0;line-height:1.6;">Guests are <strong>never charged</strong> when they book. We securely verify their card to prevent no-shows — then <strong>you collect payment at check-in</strong> however you prefer (cash, card, Venmo, etc).</p>
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
      crm.revenuePeriod = nextPeriod;
      renderRevenueView();
      if (crm.currentFilter === 'revenue') loadRevenueData();
    });
  }

  const activeTab = document.querySelector('.tab.active');
  if (activeTab) moveSlider(activeTab);
  updateMobileRevenueNavVisibility();
  syncMobileNavActive(crm.currentFilter);
}

function revenuePeriodLabel(period) {
  if (period === 'all') return 'All time';
  if (period === 'today') return 'Today';
  if (period === '7d') return 'Last 7 days';
  return 'Last 30 days';
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
  const currentPeriodLabel = revenuePeriodLabel(crm.revenuePeriod);
  if (subhintEl) subhintEl.textContent = `${currentPeriodLabel} · stay dates`;
  periodButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.period === crm.revenuePeriod);
  });
  const data = crm.revenueCache[crm.revenuePeriod] || null;

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
  const savedAmount = revenueValue * crm.OTA_COMMISSION_RATE;
  if (savedEl) savedEl.textContent = formatCurrencyCompact(savedAmount);
  if (savedCopyEl) savedCopyEl.textContent = crm.revenuePeriod === 'today' ? 'You saved today' : `You saved (${currentPeriodLabel.toLowerCase()})`;
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

  const cached = crm.revenueCache[crm.revenuePeriod];
  if (cached && !force) {
    crm.revenueError = '';
    renderRevenueView();
    return;
  }

  crm.revenueLoading = true;
  crm.revenueError = '';
  renderRevenueView();

  try {
    const data = await api('GET', `/api/crm/revenue?period=${encodeURIComponent(crm.revenuePeriod)}`);
    if (!data.success) throw new Error(data.message || 'Failed to load revenue');
    crm.revenueCache[crm.revenuePeriod] = data.data || {};
  } catch (e) {
    crm.revenueError = e.message || 'Failed to load revenue';
  } finally {
    crm.revenueLoading = false;
    renderRevenueView();
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
              <div id="roomMobileActions" class="room-mobile-actions" style="display:none">
                <button id="roomMobileEditBtn" class="room-mobile-action-btn" type="button">✎ Edit room</button>
                <button id="roomMobileDeleteBtn" class="room-mobile-action-btn danger" type="button">🗑 Delete room</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div id="roomsAddModalBg" class="rooms-modal-bg">
        <div class="rooms-modal" onclick="event.stopPropagation()">
          <h3>Inventory room</h3>
          <p style="font-size:12px;color:var(--text-muted);margin:-6px 0 12px;line-height:1.45;">For the <strong>Availability</strong> calendar only — how many units are open per day. Add photos &amp; descriptions under <strong>Your page</strong>.</p>
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
            Deleting this room will remove its day-by-day overrides.
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
  if (!crm.activeHotelId) throw new Error('Hotel context is not ready yet.');
  const res = await fetch(`/api/crm/verify?hotelId=${encodeURIComponent(crm.activeHotelId)}`, {
    headers: { 'x-crm-token': pin }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || (res.status === 401 ? 'Wrong PIN' : 'Could not verify access'));
  }
  return json;
}

// D19: proof-of-demand line — the strongest converter for a skeptical owner.
function blockedDemandLineHtml() {
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
// high-intent moments (Bookings empty state, Your page, Guest App). When real
// blocked demand exists, the pill upgrades to a proof-of-demand nudge, since
// that's the genuine high-intent signal worth re-prominence.
function goLiveBannerHtml() {
  const demand = crm.blockedDemand && crm.blockedDemand.total > 0 ? crm.blockedDemand.total : 0;
  if (demand > 0) {
    return `
      <div onclick="goLive()" role="button" tabindex="0" style="display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;column-gap:10px;min-height:44px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:1px 14px;margin-bottom:14px;cursor:pointer;">
        <span style="width:8px;height:8px;border-radius:50%;background:#ea580c;flex-shrink:0;"></span>
        <span style="font-size:13px;color:#9a3412;font-weight:600;line-height:1.25;">${demand} guest${demand>1?'s':''} tried to book — turn on direct bookings to accept reservations like these.</span>
        <span style="white-space:nowrap;font-size:13px;color:#c2410c;font-weight:800;line-height:1;">Go live →</span>
      </div>`;
  }
  return `
    <div onclick="goLive()" role="button" tabindex="0" style="display:flex;align-items:center;gap:10px;min-height:48px;background:#eef6f1;border:1px solid #cfe6da;border-radius:999px;padding:10px 14px;margin-bottom:14px;cursor:pointer;">
      <span style="width:8px;height:8px;border-radius:50%;background:#2E7D5B;flex-shrink:0;"></span>
      <span style="display:inline-flex;align-items:center;min-height:24px;font-size:13px;color:#1a5c3f;font-weight:600;line-height:1.3;">Preview mode</span>
      <span style="display:inline-flex;align-items:center;min-height:24px;font-size:12px;color:#6b7280;line-height:1.35;">· guests can browse, but can&apos;t book yet</span>
      <span style="display:inline-flex;align-items:center;min-height:24px;margin-left:auto;white-space:nowrap;font-size:13px;color:#2E7D5B;font-weight:700;line-height:1.3;">Go live →</span>
    </div>`;
}

function goLiveInlineCardHtml() {
  // D19: never surface pricing during onboarding (welcome modal + settings tour).
  // The card preloads before settingsTourActive flips true, so also gate on the
  // tour-completion flag — value is established first, price only after.
  if (crm.hotelSubscribed || crm.settingsTourActive || !localStorage.getItem('settingsTourDone')) return '';
  return `
    <div class="booking-card" id="tour-go-live-card" style="margin-bottom:14px;background:linear-gradient(135deg,#1a2b22 0%,#2E7D5B 100%);border:none;">
      <div style="padding:18px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:white;margin-bottom:6px;">Ready to go live</div>
        <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0 0 14px;line-height:1.55;">Your page is built and previewing for guests. Flip the switch to start accepting reservations.</p>
        ${blockedDemandLineHtml()}
        <button onclick="goLive()" style="width:100%;padding:12px;border-radius:10px;border:none;background:white;color:#1a5c3f;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Turn on direct bookings — $199/mo →</button>
        <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:8px;">Cancel anytime · No contracts</div>
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
  if (crm.hotelSubscribed) return;
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
  const shouldShow = !crm.hotelSubscribed && !banner.dataset.tourHidden && !crm.settingsTourActive;
  banner.style.display = shouldShow ? 'block' : 'none';
  if (shouldShow) banner.innerHTML = goLiveBannerHtml();
  const app = document.getElementById('app');
  if (app) app.classList.toggle('has-go-live-banner', shouldShow);
}

function updateBookingsTabBadge() {
  const badge = document.getElementById('countNeedsCalled');
  if (!badge) return;
  const needsCalls = (crm.bookings || []).filter(b => b.callStatus === 'not-called').length;
  const unreadMsgs = crm.guestMessages.length
    ? crm.guestMessages.filter(m => !m.read && (m.sender || 'guest') !== 'hotel').length
    : crm.messageUnreadCount;
  const actionable = needsCalls + unreadMsgs;
  badge.textContent = actionable;
  badge.style.display = actionable > 0 ? '' : 'none';
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
  if (crm.currentFilter !== 'bookings' || crm.bookingsSubview === 'growth' || !counts || counts.all === 0) {
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
    if (crm.currentFilter === 'bookings' && crm.bookingsSubview !== 'growth') renderBookings(crm.bookings);
  } catch (e) { /* non-fatal */ }
}

// ── GROWTH ("Get found") — Bookings-tab segmented view ─────────────
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
    .growth-card{background:#fff;border:1.5px solid #e6e9e7;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,0,0,0.045);}
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

function growthTriedCount() {
  if (crm.growthFunnel && Number.isFinite(crm.growthFunnel.blockedAttempts)) return crm.growthFunnel.blockedAttempts;
  return (crm.blockedDemand && crm.blockedDemand.total) || 0;
}

function renderBookingsSubtabs() {
  const wrap = document.getElementById('bookingsSubtabs');
  if (!wrap) return;
  if (crm.currentFilter !== 'bookings' || crm.settingsTourActive) { wrap.style.display = 'none'; return; }
  ensureGrowthStyles();
  wrap.style.display = 'block';
  const tried = growthTriedCount();
  const badge = (crm.bookingsSubview !== 'growth' && tried > 0) ? `<span class="subtab-badge">${tried}</span>` : '';
  // Keep the 'bookings' string literal out of template interpolations — the build
  // splitter treats ${...} as raw and would flag it as a bare state ref.
  const onBookings = crm.bookingsSubview !== 'growth';
  const bkActive = onBookings ? 'active' : '';
  const grActive = onBookings ? '' : 'active';
  wrap.innerHTML = `
    <div class="subtab-group" role="tablist">
      <button type="button" role="tab" class="subtab ${bkActive}" aria-selected="${onBookings}" onclick="setBookingsSubview('bookings')">Bookings</button>
      <button type="button" role="tab" class="subtab ${grActive}" aria-selected="${!onBookings}" onclick="setBookingsSubview('growth')">Get found${badge}</button>
    </div>`;
}

function setBookingsSubview(view) {
  crm.bookingsSubview = (view === 'growth') ? 'growth' : 'bookings';
  renderBookingsSubtabs();
  applyBookingsSubview();
}

function applyBookingsSubview() {
  const isGrowth = crm.bookingsSubview === 'growth';
  const listEl = document.getElementById('bookingsList');
  const chipsEl = document.getElementById('bookingFilterChips');
  const msgPanel = document.getElementById('messagesPanel');
  const growthEl = document.getElementById('growthPanel');
  if (listEl) listEl.style.display = isGrowth ? 'none' : '';
  if (msgPanel) msgPanel.style.display = isGrowth ? 'none' : '';
  if (isGrowth && chipsEl) chipsEl.style.display = 'none';
  if (growthEl) growthEl.style.display = isGrowth ? 'block' : 'none';
  if (isGrowth) {
    renderGrowthPanel();
  } else {
    if (!crm.guestMessages.length) loadMessages(); else renderMessages();
    renderBookings(crm.bookings);
  }
}

async function loadGrowthData() {
  try {
    const [funnel, checklist] = await Promise.all([
      api('GET', `/api/crm/growth-funnel?period=${encodeURIComponent(crm.growthPeriod)}`).catch(() => null),
      api('GET', '/api/crm/growth-checklist').catch(() => null),
    ]);
    if (funnel && funnel.success) crm.growthFunnel = funnel;
    if (checklist && checklist.success) crm.growthChecklist = checklist.checklist || {};
    renderBookingsSubtabs();
    if (crm.currentFilter === 'bookings' && crm.bookingsSubview === 'growth') renderGrowthPanel();
  } catch (e) { /* non-fatal */ }
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

function renderGrowthPanel() {
  ensureGrowthStyles();
  const el = document.getElementById('growthPanel');
  if (!el) return;
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
  const qrBtn = `<button type="button" class="growth-btn growth-btn-primary" onclick="showCheckinQrOverlay()">Show QR</button>`;

  const gbpStep = step('gbp', 'Biggest lever', 'Add your link to Google', 'Most guests find motels on Google Maps. Paste your booking link into your Google Business Profile so they book direct instead of through an OTA.', openGoogleBtn + linkBoxHtml);
  const qrStep = step('qr', '', 'Show a QR at the front desk', 'Walk-ins and repeat guests can scan it to save your hotel and book direct next time. Print it or show it on check-in.', qrBtn);
  const textStep = step('textLink', '', 'Text it to past guests', 'Repeat guests are your cheapest bookings. Text them your link so they skip Booking.com next time.', textBtn);

  const checklistCard = `
    <div class="growth-card">
      <div class="growth-card-title">Get found — put your link where guests already are</div>
      <div class="growth-card-sub">A booking page only works if people see it. These are the highest-value places to put your link — no ads required.</div>
      ${gbpStep}${qrStep}${textStep}
    </div>`;

  el.innerHTML = `<div class="growth-wrap">${funnelCard}${checklistCard}</div>`;
}

function seedTourRevenueShell() {
  if (!crm.revenueEnabled) return;
  crm.revenuePeriod = normalizeRevenuePeriod(crm.revenuePeriod || '30d');
  if (!crm.revenueCache[crm.revenuePeriod]) {
    crm.revenueCache[crm.revenuePeriod] = { rev: 0, rooms: [{ name: 'Your rooms', rev: 0 }] };
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

async function startCrmApp(verification) {
  crm.isMasterPin = !!(verification && verification.isMasterPin);
  crm.currentHotelPms = String((verification && verification.pms) || '').toLowerCase();
  crm.revenueEnabled = !!(verification && verification.isManualPms);
  crm.revenueCache = {};
  crm.revenueLoading = false;
  crm.revenueError = '';
  ensureAvailabilityUi();
  syncNotificationButtonState();
  syncRevenueUi();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('pwa') === '1') {
    try { sessionStorage.setItem('frontdeskSimulatePwa', '1'); } catch (_) {}
  } else {
    try { sessionStorage.removeItem('frontdeskSimulatePwa'); } catch (_) {}
  }
  const isFirstWelcome = urlParams.has('welcome') && !localStorage.getItem('onboardingDone');

  if (urlParams.has('welcome') || urlParams.get('tab') === 'settings') {
    crm.currentFilter = 'settings';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    // Keep ?welcome=1 in the URL until the welcome modal is dismissed (refresh-safe).
    if (urlParams.has('welcome') && localStorage.getItem('onboardingDone')) {
      cleanUrl.searchParams.delete('welcome');
    }
    window.history.replaceState({}, '', cleanUrl);
  } else if (urlParams.get('tab') === 'bookings') {
    crm.currentFilter = 'bookings';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    window.history.replaceState({}, '', cleanUrl);
  } else if (urlParams.get('tab') === 'apps' || urlParams.get('tab') === 'phones') {
    crm.currentFilter = 'apps';
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('tab');
    window.history.replaceState({}, '', cleanUrl);
  } else if (!urlParams.has('welcome') && verification && verification.subscribed) {
    // D6: live hotels open on Bookings — the daily-loop default ("anything new?").
    // Pre-activation hotels fall through to 'settings' so setup stays first.
    crm.currentFilter = 'bookings';
  }

  if (isFirstWelcome) {
    if (crm.revenueEnabled) seedTourRevenueShell();
    if (typeof loadSettingsModule === 'function') await loadSettingsModule();
    applyFilter();
    hydrateCrmInBackground();
  }

  document.getElementById('bootScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Track subscription status globally for banner visibility
  crm.hotelSubscribed = !!(verification && verification.subscribed);
  updateGoLiveBanner();
  if (!crm.hotelSubscribed) loadBlockedDemand();

  const realignActiveTab = () => {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) moveSlider(activeTab);
  };
  requestAnimationFrame(realignActiveTab);
  setTimeout(realignActiveTab, 120);

  initMobileBottomNav();
  updateMobileRevenueNavVisibility();
  syncMobileNavActive(crm.currentFilter);
  ensureLucideLoaded().then(() => {
    refreshMobileBottomNavIcons();
    requestAnimationFrame(refreshMobileBottomNavIcons);
  }).catch(() => {});

  if (isFirstWelcome) {
    showWelcomeModal();
  } else {
    cleanupSettingsTourUi();
    await Promise.allSettled([
      loadManualAvailability(),
      loadBookings({ deferMessages: true }),
    ]);

    refreshMobileBottomNavIcons();

    if (crm.currentFilter === 'bookings') {
      setFilter('bookings', document.querySelector('.tab[data-nav-filter="bookings"]'));
    } else if (crm.currentFilter === 'apps') {
      setFilter('apps', document.querySelector('.tab[data-nav-filter="apps"]')
        || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]'));
    }
  }

  if (urlParams.get('action') === 'go-live') {
    window.history.replaceState({}, '', window.location.pathname);
    goLive();
  }

  if (urlParams.get('activated') === '1') {
    const cleanUrl = new URL(window.location);
    cleanUrl.searchParams.delete('activated');
    window.history.replaceState({}, '', cleanUrl);
    crm.hotelSubscribed = true;
    updateGoLiveBanner();
    const _goLiveBanner = document.getElementById('goLiveBanner');
    if (_goLiveBanner) { _goLiveBanner.style.display = 'none'; _goLiveBanner.innerHTML = ''; }
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
  }

  if (!isFirstWelcome) {
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

  // First time opening the INSTALLED app → offer to turn on booking alerts.
  maybePromptInstalledNotifications();
}

async function doLogin() {
  const pin = document.getElementById('pinInput').value.trim();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('signInBtn');
  err.textContent = '';
  if (!crm.activeHotelId) { err.textContent = 'Hotel context is still loading'; return; }
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

async function sendMagicLink() {
  const email = document.getElementById('magicLinkEmail').value.trim();
  const msg = document.getElementById('magicLinkMsg');
  if (!email) { msg.textContent = 'Please enter your email'; return; }
  msg.textContent = 'Sending…';
  try {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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
  if (!crm.activeHotelId) throw new Error('Hotel context is not loaded.');
  const url = new URL(path, window.location.origin);
  if (!url.searchParams.get('hotelId')) {
    url.searchParams.set('hotelId', crm.activeHotelId);
  }

  const opts = { method, headers: { 'Content-Type': 'application/json', 'x-crm-token': crm.token } };
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (body || (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD')) {
    const payload = (body && typeof body === 'object' && !Array.isArray(body)) ? { ...body } : (body || {});
    if (payload.hotelId === undefined) payload.hotelId = crm.activeHotelId;
    opts.body = JSON.stringify(payload);
  }
  const res = await fetch(url.pathname + url.search, opts);
  if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
  return res.json();
}

function showLogin() {
  document.getElementById('bootScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  crm.token = '';
  crm.isMasterPin = false;
  crm.currentHotelPms = '';
  crm.revenueEnabled = false;
  crm.revenueCache = {};
  crm.revenueLoading = false;
  crm.revenueError = '';
  syncRevenueUi();
  try { localStorage.removeItem('crmToken'); } catch(e) {}
}

async function bootCrmApp() {
  if (crm.bootInFlight) return;
  crm.bootInFlight = true;
  crm.activeHotelId = '';
  crm.activeHotelName = '';
  crm.activeHotelDomain = '';
  crm.activeHotelContext = null;
  updateHotelChrome();
  showBootState({
    title: 'Connecting to hotel...',
    message: 'Checking this domain and loading front desk context.',
    debug: formatContextDebugLines([`Detected host: ${getDetectedHostname() || 'unknown'}`]),
    showRetry: false,
  });

  try {
    await loadHotelContext();
    if (crm.token) {
      try {
        const verification = await verifyCrmToken(crm.token);
        await startCrmApp(verification);
        return;
      } catch (e) {
        showLogin();
        return;
      }
    }
    showLogin();
  } catch (e) {
    const legacyHotelId = resolveLegacyCrmHotelId();
    if (legacyHotelId && applyLegacyHotelContext(legacyHotelId, e && e.message ? e.message : 'hotel-context-load-failed')) {
      if (crm.token) {
        try {
          const verification = await verifyCrmToken(crm.token);
          await startCrmApp(verification);
          return;
        } catch (verifyError) {
          showLogin();
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
    if (crm.currentFilter !== 'revenue') crm.revenueCache = {};
    
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
    if (opts.deferMessages) scheduleDeferredMessagesLoad();
    else loadMessages();
  } catch(e) {
    if (silent) return;
    if (e.message === 'Unauthorized') return;
    document.getElementById('bookingsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
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
  try {
    const data = await api('GET', '/api/crm/messages');
    if (!data.success) return;
    crm.guestMessages = data.messages || [];
    crm.messageUnreadCount = 0;
    updateMessageBadges();
    if (crm.currentFilter === 'bookings') renderMessages();
  } catch (e) { /* non-fatal */ }
}

function updateMessageBadges() {
  const unread = crm.guestMessages.length
    ? crm.guestMessages.filter(m => !m.read && (m.sender || 'guest') !== 'hotel').length
    : crm.messageUnreadCount;
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

function renderMessageThreadDetail(thread) {
  const hasUnread = thread.msgs.some(m => !m.read && (m.sender || 'guest') === 'guest');
  const phone = (thread.guestPhone || '').trim();
  const email = (thread.guestEmail || '').trim();
  const contactBtns = [
    phone ? `<a href="tel:${esc(phone)}" style="text-decoration:none;padding:7px 12px;border-radius:8px;background:#2E7D5B;color:#fff;font-size:12px;font-weight:700;">📞 Call</a>` : '',
    phone ? `<a href="sms:${esc(phone)}" style="text-decoration:none;padding:7px 12px;border-radius:8px;background:#eef6f1;color:#2E7D5B;font-size:12px;font-weight:700;">💬 Text</a>` : '',
    email ? `<a href="mailto:${esc(email)}" style="text-decoration:none;padding:7px 12px;border-radius:8px;background:#eef6f1;color:#2E7D5B;font-size:12px;font-weight:700;">✉️ Email</a>` : '',
  ].filter(Boolean).join('');

  const sortedMsgs = thread.msgs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const msgBubbles = sortedMsgs.map(m => {
    const isHotel = (m.sender || 'guest') === 'hotel';
    const chips = (m.requests || []).map(r =>
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eef6f1;color:#2E7D5B;font-size:12px;font-weight:600;margin:0 6px 6px 0;">${esc(r)}</span>`
    ).join('');
    return `
      <div style="display:flex;flex-direction:column;align-items:${isHotel ? 'flex-end' : 'flex-start'};margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;color:${isHotel ? '#2E7D5B' : '#6b7280'};margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">${isHotel ? 'You' : esc(thread.guestName || 'Guest')} · ${esc(timeAgo(m.createdAt))}</div>
        ${chips ? `<div style="margin-bottom:4px;">${chips}</div>` : ''}
        ${m.body ? `<div style="background:${isHotel ? '#2E7D5B' : '#f3f4f6'};color:${isHotel ? '#fff' : '#1a1a2e'};padding:10px 14px;border-radius:14px;${isHotel ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'}font-size:14px;line-height:1.5;max-width:85%;white-space:pre-wrap;">${esc(m.body)}</div>` : ''}
      </div>`;
  }).join('');

  const replyInputId = `reply-${esc(thread.key)}`;
  return `
    <div style="border:1px solid ${hasUnread ? '#bfe0cd' : '#e6e9e7'};background:${hasUnread ? '#f4fbf6' : '#fbfcfb'};border-radius:12px;padding:14px;margin-top:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
        <div style="font-weight:800;color:#1a1a1a;font-size:14px;display:flex;align-items:center;gap:8px;">
          ${hasUnread ? '<span style="width:8px;height:8px;border-radius:50%;background:#e0245e;display:inline-block;"></span>' : ''}
          ${esc(thread.guestName || 'Guest')}
          ${thread.roomName ? `<span style="font-weight:500;color:#6b7280;font-size:12px;">· ${esc(thread.roomName)}</span>` : ''}
        </div>
        ${thread.code ? `<div style="font-size:11px;color:#9ca3af;">#${esc(thread.code)}</div>` : ''}
      </div>
      <div style="margin-bottom:10px;max-height:min(50vh,360px);overflow-y:auto;">${msgBubbles}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        ${contactBtns}
        ${hasUnread ? thread.msgs.filter(m => !m.read && (m.sender||'guest')==='guest').map(m => `<button onclick="markMessageRead('${esc(m.id)}')" style="margin-left:auto;padding:7px 12px;border-radius:8px;border:1px solid #d7dde3;background:#fff;color:#6b7280;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">✓ Mark read</button>`).join('') : ''}
      </div>
      ${thread.code ? `
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="${replyInputId}" type="text" placeholder="Reply to ${esc(thread.guestName || 'guest')}..." maxlength="2000" style="flex:1;padding:10px 14px;border-radius:24px;border:1.5px solid #d1d5db;font-family:inherit;font-size:14px;outline:none;transition:border-color 0.2s;" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" onfocus="event.stopPropagation();this.style.borderColor='#2E7D5B'" onblur="this.style.borderColor='#d1d5db'" onkeydown="if(event.key==='Enter'){event.preventDefault();replyToThread('${esc(thread.code)}','${replyInputId}')}" />
        <button onclick="replyToThread('${esc(thread.code)}','${replyInputId}')" style="width:40px;height:40px;border-radius:50%;border:none;background:#2E7D5B;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.15s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>` : ''}
    </div>`;
}

function renderMessageThreadPicker(threadList, activeThread) {
  const summary = threadSummary(activeThread);
  const pickerList = crm.messagesThreadPickerOpen ? `
    <div style="margin-top:6px;border:1.5px solid #e6e9e7;border-radius:12px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,0.12);max-height:min(50vh,280px);overflow-y:auto;">
      ${threadList.map(thread => {
        const s = threadSummary(thread);
        const isActive = thread.key === activeThread.key;
        return `
        <button type="button" onclick="pickMessageThread('${esc(thread.key)}')" style="width:100%;display:block;padding:12px 14px;border:none;border-bottom:1px solid #f0f2f1;background:${isActive ? '#f4fbf6' : '#fff'};font-family:inherit;text-align:left;cursor:pointer;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:13px;font-weight:800;color:#1a1a1a;display:flex;align-items:center;gap:6px;">
                ${s.hasUnread ? '<span style="width:7px;height:7px;border-radius:50%;background:#e0245e;flex-shrink:0;"></span>' : ''}
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(thread.guestName || 'Guest')}</span>
                ${thread.roomName ? `<span style="font-weight:500;color:#6b7280;font-size:12px;white-space:nowrap;">· ${esc(thread.roomName)}</span>` : ''}
              </div>
              <div style="font-size:12px;color:#6b7280;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.preview)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${esc(timeAgo(s.latest?.createdAt))}${thread.code ? ` · #${esc(thread.code)}` : ''}</div>
            </div>
            ${isActive ? '<span style="font-size:11px;font-weight:700;color:#2E7D5B;flex-shrink:0;">✓</span>' : ''}
          </div>
        </button>`;
      }).join('')}
    </div>` : '';

  return `
    <div style="flex:1;min-width:200px;position:relative;">
      <span style="display:block;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Booking conversation</span>
      <button type="button" onclick="toggleMessageThreadPicker()" style="width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid #d1d5db;background:#fff;font-family:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:13px;font-weight:800;color:#1a1a1a;display:flex;align-items:center;gap:6px;">
            ${summary.hasUnread ? '<span style="width:7px;height:7px;border-radius:50%;background:#e0245e;flex-shrink:0;"></span>' : ''}
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(activeThread.guestName || 'Guest')}</span>
            ${activeThread.roomName ? `<span style="font-weight:500;color:#6b7280;font-size:12px;white-space:nowrap;">· ${esc(activeThread.roomName)}</span>` : ''}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(summary.preview)}</div>
        </div>
        <span style="font-size:14px;color:#9ca3af;flex-shrink:0;transition:transform 0.2s;transform:rotate(${crm.messagesThreadPickerOpen ? '180deg' : '0deg'});">▾</span>
      </button>
      ${pickerList}
    </div>`;
}

function renderMessages() {
  const panel = document.getElementById('messagesPanel');
  if (!panel) return;

  const isDesktopBookingsLayout = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  const installNudge = isDesktopBookingsLayout ? '' : bookingsFrontdeskNudgeHtml();
  const threadList = buildMessageThreads();
  if (threadList.length === 0) {
    const pending = crm.messageUnreadCount > 0;
    panel.innerHTML = (pending ? `
      <div style="background:#fff;border:1px solid #e6e9e7;border-radius:16px;margin-bottom:14px;padding:14px 16px;display:flex;align-items:center;gap:10px;">
        <div class="logo-sprite-bounce" style="width:22px;height:22px;flex-shrink:0;"></div>
        <div style="font-size:14px;font-weight:600;color:#6b7280;">Loading guest messages…</div>
      </div>` : '') + installNudge;
    if (pending && crm.currentFilter === 'bookings') loadMessages();
    return;
  }

  const threadKeys = new Set(threadList.map(t => t.key));
  if (!crm.selectedMessageThread || !threadKeys.has(crm.selectedMessageThread)) {
    crm.selectedMessageThread = pickDefaultMessageThread(threadList);
  }

  const unreadCount = crm.guestMessages.filter(m => !m.read && (m.sender || 'guest') === 'guest').length;
  const activeThread = threadList.find(t => t.key === crm.selectedMessageThread) || threadList[0];

  const inboxBody = crm.messagesInboxOpen ? `
    <div style="padding:0 16px 16px;border-top:1px solid #e6e9e7;">
      <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${renderMessageThreadPicker(threadList, activeThread)}
        ${unreadCount > 0 ? `<button onclick="markAllMessagesRead()" style="align-self:flex-end;padding:8px 12px;border-radius:8px;border:1px solid #d7dde3;background:#fff;color:#6b7280;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Mark all read</button>` : ''}
      </div>
      ${renderMessageThreadDetail(activeThread)}
    </div>` : '';

  panel.innerHTML = installNudge + `
    <div style="background:#fff;border:1px solid #e6e9e7;border-radius:16px;margin-bottom:14px;">
      <button type="button" onclick="toggleMessagesInbox()" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border:none;background:transparent;font-family:inherit;cursor:pointer;text-align:left;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="font-size:15px;font-weight:800;color:#1a1a1a;white-space:nowrap;">💬 Guest messages</span>
          <span style="font-size:12px;font-weight:600;color:#6b7280;white-space:nowrap;">${threadList.length} booking${threadList.length === 1 ? '' : 's'}</span>
          ${unreadCount > 0 ? `<span style="background:#e0245e;color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:2px 8px;white-space:nowrap;">${unreadCount} new</span>` : ''}
        </div>
        <span style="font-size:18px;color:#9ca3af;flex-shrink:0;transition:transform 0.2s;transform:rotate(${crm.messagesInboxOpen ? '90deg' : '0deg'});">›</span>
      </button>
      ${inboxBody}
    </div>`;
}

async function markMessageRead(id) {
  const msg = crm.guestMessages.find(m => m.id === id);
  if (msg) msg.read = true;
  updateMessageBadges();
  renderMessages();
  try { await api('POST', `/api/crm/messages/${encodeURIComponent(id)}/read`); }
  catch (e) { /* optimistic; ignore */ }
}

async function markAllMessagesRead() {
  crm.guestMessages.forEach(m => { m.read = true; });
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

async function refreshCurrentView() {
  if (!crm.token || !crm.activeHotelId || document.getElementById('app').style.display === 'none') return;
  // Don't auto-refresh when user is on Edit tab (causes disruptive reload)
  if (crm.currentFilter === 'settings') return;
  if (crm.currentFilter === 'apps') {
    loadAppsModule().then(() => loadGuestInstallStats()).catch(() => {});
    return;
  }
  const tasks = [loadBookings()];
  if (crm.currentFilter === 'bookings') tasks.push(loadMessages());
  if (crm.currentFilter === 'availability') {
    tasks.push(loadManualAvailability());
  }
  if (crm.currentFilter === 'revenue' && crm.revenueEnabled) {
    tasks.push(loadRevenueData(true));
  }
  await Promise.allSettled(tasks);
}

// ── RENDER ─────────────────────────────────────────────
const BOOKING_CARD_EST_HEIGHT = 300;
const BOOKING_VIRTUAL_THRESHOLD = 25;

function bookingCardHtml(b) {
  const isDeclined = b.notes && b.notes.includes('PAYMENT DECLINED');
  const ci = b.checkinDate ? new Date(b.checkinDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const co = b.checkoutDate ? new Date(b.checkoutDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const ago = timeAgo(b.createdAt);
  const rawPhoneDigits = String(b.guestPhone || '').replace(/\D/g, '');
  let localPhoneDigits = rawPhoneDigits;
  if (localPhoneDigits.length > 10 && localPhoneDigits.startsWith('1')) {
    localPhoneDigits = localPhoneDigits.slice(1);
  }
  localPhoneDigits = localPhoneDigits.slice(0, 10);
  const phoneHref = localPhoneDigits.length === 10 ? `tel:+1${localPhoneDigits}` : '';
  const noteBtnClass = crm.currentFilter === 'needs-call' ? 'btn btn-note btn-note-quiet' : 'btn btn-note';
  const payChip = isDeclined
    ? '<div class="declined-chip">⚠️ Card declined</div>'
    : `<div class="pay-chip" title="Guest&apos;s card was verified only (small hold may apply). Collect $${Number(b.grandTotal).toFixed(2)} at check-in — nothing charged online.">💳 Collect at check-in</div>`;
  return `
    <div class="booking-card">
      <div class="card-accent ${isDeclined ? 'declined' : ''}"></div>
      <div class="card-inner">
        <div class="card-top">
          <div class="guest-info">
            <div class="guest-name">${esc(b.guestFirstName)} ${esc(b.guestLastName)}</div>
            <div class="guest-time">${ago}</div>
          </div>
          <div class="card-amount">$${Number(b.grandTotal).toFixed(2)}</div>
        </div>
        <div class="card-meta">
          <div class="meta-chip">🛏 ${esc(b.roomName || 'Room')}</div>
          <div class="meta-chip">🌙 ${b.nights} night${b.nights !== 1 ? 's' : ''}</div>
          ${payChip}
        </div>
        <div class="card-dates">
          <div class="date-block">
            <div class="date-label">Check-in</div>
            <div class="date-value">${ci}</div>
          </div>
          <div class="date-block">
            <div class="date-label">Check-out</div>
            <div class="date-value">${co}</div>
          </div>
          <div class="date-block">
            <div class="date-label">Guests</div>
            <div class="date-value">${b.guests || 1} guest${(b.guests || 1) !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="card-contact">
          <div class="contact-details">
            <div class="contact-phone">${esc(b.guestPhone)}</div>
            <div class="contact-email">${esc(b.guestEmail)}</div>
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
          ${phoneHref ? `<a class="btn btn-confirm" href="${phoneHref}" style="text-decoration:none;text-align:center;">📞 Call Now</a>` : `<button class="btn btn-confirm" disabled>📞 No Phone</button>`}
          <button class="${noteBtnClass}" onclick="addNote('${b.id}', ${esc(JSON.stringify(b.notes || ''))})">📝 ${b.notes ? 'Edit' : 'Add'} Note</button>
        </div>
      </div>
    </div>`;
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

function renderBookings(fullList) {
  const el = document.getElementById('bookingsList');
  if (!el) return;
  fullList = fullList || [];
  el.classList.remove('bookings-virtual');
  delete el.dataset.virtualBound;
  crm.bookingsVirtualList = [];
  const isDesktopBookingsLayout = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  const inlineInstallCard = isDesktopBookingsLayout ? bookingsFrontdeskNudgeHtml() : '';
  const inlineInstallWrap = inlineInstallCard ? `<div style="margin-bottom:14px;">${inlineInstallCard}</div>` : '';

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
        ${inlineInstallWrap}
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
          <div class="empty-text">You&apos;re live — waiting for bookings</div>
          <div class="empty-sub" style="margin-bottom:12px;">Share your link to start getting direct reservations.</div>
          <button onclick="copyBookingLinkFromChecklist()" style="padding:12px 24px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy Your Link</button>
          <div style="margin-top:12px;"><button onclick="setBookingsSubview('growth')" style="background:none;border:none;color:#2E7D5B;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;">See how to get found →</button></div>
        </div>`;
    } else if (allDone && !crm.hotelSubscribed) {
      el.innerHTML = `
        ${inlineInstallWrap}
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
          <div class="empty-text">Your page is ready to go live</div>
          <div class="empty-sub" style="margin-bottom:12px;">Everything&apos;s set up. Flip the switch to start accepting direct bookings.${crm.blockedDemand && crm.blockedDemand.total > 0 ? ` <strong>${crm.blockedDemand.total} guest${crm.blockedDemand.total>1?'s':''} already tried to book.</strong>` : ''}</div>
          <button onclick="goLive()" style="padding:12px 24px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Turn on direct bookings — $199/mo →</button>
        </div>`;
      if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 0);
    } else {
      el.innerHTML = `
        ${inlineInstallWrap}
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

  if (list.length > BOOKING_VIRTUAL_THRESHOLD) {
    crm.bookingsVirtualList = list;
    ensureBookingsVirtualScroll();
    renderBookingsWindow();
    return;
  }

  el.innerHTML = list.map(bookingCardHtml).join('');
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
    if (f === 'revenue' && n.classList.contains('mobile-nav-item--hidden')) {
      n.classList.remove('active');
      n.removeAttribute('aria-current');
      return;
    }
    const match = f === filter;
    n.classList.toggle('active', match);
    if (match) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  });
}

function updateMobileRevenueNavVisibility() {
  const el = document.getElementById('mobileNavRevenueBtn');
  if (el) el.classList.toggle('mobile-nav-item--hidden', !crm.revenueEnabled);
  // Keep the desktop Revenue tab in sync too
  const deskEl = document.getElementById('desktopTabRevenueBtn');
  if (deskEl) deskEl.classList.toggle('tab--hidden', !crm.revenueEnabled);
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
    if (filter === 'revenue' && !crm.revenueEnabled) return;
    setFilter(filter, item);
  });

  // Mobile keeps a single Bookings bucket.
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches && (crm.currentFilter === 'needs-call' || crm.currentFilter === 'called')) {
    const bookingsBtn = nav.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');
    setFilter('bookings', bookingsBtn);
  }
}

function setFilter(filter, btn) {
  if (filter === 'revenue' && !crm.revenueEnabled) return;
  crm.currentFilter = filter;
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
  if (filter === 'revenue') {
    applyFilter();
    if (crm.settingsTourActive) {
      seedTourRevenueShell();
      renderRevenueView();
      updateGoLiveBanner();
      return;
    }
    if (crm.revenueCache[crm.revenuePeriod] && !crm.revenueLoading) {
      renderRevenueView();
      updateGoLiveBanner();
      return;
    }
    loadRevenueData(true);
    updateGoLiveBanner();
    return;
  }
  applyFilter();
  if (filter === 'bookings') loadMessages();
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
  if (isBookingPage) {
    return `<div class="two-room-explainer" id="tour-two-room-card">
      <div class="two-room-text">
        <div class="two-room-explainer-title">Two places for rooms — don't mix them up</div>
        <div class="two-room-cols">
          <div class="two-room-col two-room-col--here">
            <div class="two-room-col-label">① Your page (here)</div>
            What guests see when they book — photos, description, and rates.
          </div>
          <div class="two-room-col">
            <div class="two-room-col-label">② Availability tab</div>
            How many units you have open each day — your inventory calendar.
          </div>
        </div>
        <p class="two-room-explainer-foot">Start here: add the room types guests should see. Then open <strong>Availability</strong> and add matching inventory rooms so the calendar isn't empty.</p>
      </div>
      <div class="two-room-explainer-actions two-room-actions">
        <button type="button" class="two-room-btn two-room-btn--ghost" onclick="goToAvailabilityTab()">Next: set up Availability →</button>
      </div>
    </div>`;
  }
  const bookingNames = (crm.editRooms || []).map((r) => r.name).filter(Boolean);
  const namesHint = bookingNames.length
    ? `Your booking page already has: <strong>${bookingNames.map((n) => esc(n)).join(', ')}</strong>. Add matching inventory rooms here (same names work best).`
    : 'You haven\'t added booking page rooms yet — set those up under <strong>Your page</strong> first.';
  return `<div class="two-room-explainer">
    <div class="two-room-explainer-title">This calendar is empty because inventory isn't set up yet</div>
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
      <button type="button" class="two-room-btn two-room-btn--primary" onclick="openRoomsAddModal()">+ Add inventory room</button>
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
  const count = guestPushSubscriberCount || 0;
  if (audience) {
    audience.textContent = count === 0
      ? 'No guests have notifications on yet — show your QR at check-in first.'
      : count === 1
        ? '1 guest has notifications on for you.'
        : count + ' guests have notifications on for you.';
    audience.style.color = count === 0 ? 'var(--text-muted)' : '#166534';
    audience.style.fontWeight = count === 0 ? '500' : '700';
    audience.style.background = count === 0 ? 'var(--bg)' : '#f0fdf4';
    audience.style.borderColor = count === 0 ? 'var(--border)' : '#bbf7d0';
  }
  if (btn) {
    const enabled = count > 0;
    btn.disabled = !enabled;
    btn.style.background = enabled ? 'var(--green)' : '#c5d5cc';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    btn.style.opacity = enabled ? '1' : '0.9';
  }
}

function guestBroadcastCardHtml() {
  const hName = (crm.activeHotelName || 'Your Hotel').replace(/"/g, '&quot;');
  return `<div id="guestBroadcastCard" style="background:#fff;border:1px solid #e6e9e7;border-radius:16px;margin-bottom:14px;padding:16px 18px;">
    <div style="font-size:15px;font-weight:800;color:#1a1a1a;margin-bottom:4px;">📣 Notify all guests at once</div>
    <p style="font-size:12px;color:#6b7280;margin:0 0 10px;line-height:1.45;">Push a sale, event, or check-in reminder to everyone who installed your guest app.</p>
    <div id="guest-broadcast-audience" style="font-size:12px;line-height:1.45;margin:0 0 12px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text-muted);">Checking who can receive notifications…</div>
    <button type="button" onclick="prefillGuestInstallBroadcast()" style="background:none;border:none;padding:0;color:var(--green);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;margin:-4px 0 12px;">Suggest install reminder message</button>
    <div style="margin-bottom:8px;">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Title</div>
      <input type="text" id="guest-broadcast-title" value="${hName}" maxlength="120" placeholder="e.g. Jack's Inn" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Message</div>
      <textarea id="guest-broadcast-body" maxlength="500" placeholder="e.g. Pool is open until 10pm tonight!" style="width:100%;min-height:64px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
    </div>
    <button id="guest-broadcast-btn" type="button" onclick="sendGuestBroadcast()" disabled style="width:100%;padding:12px;border-radius:10px;border:none;background:#c5d5cc;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:not-allowed;">Send notification</button>
    <p id="guest-broadcast-result" style="font-size:12px;color:var(--green);margin:8px 0 0;text-align:center;font-weight:600;"></p>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;text-align:center;">What guests see</div>
      <video autoplay loop muted playsinline webkit-playsinline preload="metadata"
        src="${GUEST_BROADCAST_DEMO_VIDEO}"
        style="width:100%;max-width:260px;display:block;margin:0 auto;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,0.14);background:#000;">
      </video>
      <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:8px 0 0;line-height:1.45;">Their phone buzzes with your message — like a text from you.</p>
    </div>
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
  const growthPanelEl = document.getElementById('growthPanel');
  if (growthPanelEl) growthPanelEl.style.display = 'none';
  const previewBar = document.getElementById('previewSiteBar');
  if (previewBar) previewBar.style.display = (crm.currentFilter === 'settings') ? 'block' : 'none';
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

  if (crm.currentFilter === 'revenue') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'flex';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl = document.getElementById('editView');
    if (editEl) editEl.style.display = 'none';
    closeAvailabilityDayPopover();
    renderRevenueView();
    return;
  }

  if (crm.currentFilter === 'apps') {
    if (bookingsEl) bookingsEl.style.display = 'none';
    if (availabilityEl) availabilityEl.style.display = 'none';
    if (revenueEl) revenueEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
    const editEl2 = document.getElementById('editView');
    if (editEl2) editEl2.style.display = 'none';
    if (msgPanel) msgPanel.style.display = 'none';
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
    }).catch(() => {
      if (appsEl2) appsEl2.innerHTML = '<div class="empty-state"><div class="empty-text">Could not load Guest App</div></div>';
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
  // Bookings-tab segmented control: Bookings | Get found
  renderBookingsSubtabs();
  loadGrowthData();
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
    const wrap = document.createElement('div');
    wrap.className = 'room-pill-wrap';

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `room-pill ${crm.manualSelectedRoom === room.name ? 'active' : ''}`;
    pill.textContent = `${room.name} (${Math.max(0, parseInt(room.totalUnits, 10) || 0)})`;
    pill.addEventListener('click', () => setActiveManualRoom(room.name));

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'room-pill-action';
    editBtn.title = `Edit ${room.name}`;
    editBtn.setAttribute('aria-label', `Edit ${room.name}`);
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRoomsEditModal(room.name);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'room-pill-action danger';
    delBtn.title = `Delete ${room.name}`;
    delBtn.setAttribute('aria-label', `Delete ${room.name}`);
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRoomType(room.name);
    });

    wrap.appendChild(pill);
    wrap.appendChild(editBtn);
    wrap.appendChild(delBtn);
    bar.appendChild(wrap);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'room-pill-add';
  addBtn.textContent = '+ Add inventory room';
  addBtn.addEventListener('click', openRoomsAddModal);
  // Only show if no rooms exist yet (otherwise use Edit tab)
  if (bar.querySelectorAll('.room-pill').length === 0) {
    bar.appendChild(addBtn);
  }
}

function renderMobileRoomActions() {
  const row = document.getElementById('roomMobileActions');
  const editBtn = document.getElementById('roomMobileEditBtn');
  const delBtn = document.getElementById('roomMobileDeleteBtn');
  const room = getManualRoomByName(crm.manualSelectedRoom);
  const isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
  if (!row || !editBtn || !delBtn) return;

  if (!isMobile || !room) {
    row.style.display = 'none';
    return;
  }

  row.style.display = 'flex';
  editBtn.onclick = () => openRoomsEditModal(room.name);
  delBtn.onclick = () => deleteRoomType(room.name);
}

function openRoomsAddModal() {
  const modal = document.getElementById('roomsAddModalBg');
  if (!modal) return;
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
  modal.classList.add('open');
  nameInput.focus();
}

function closeRoomsEditModal() {
  const modal = document.getElementById('roomsEditModalBg');
  if (modal) modal.classList.remove('open');
  crm.editingRoomName = '';
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
  if (modal) modal.classList.add('open');
}

function closeRoomsDeleteModal() {
  const modal = document.getElementById('roomsDeleteModalBg');
  if (modal) modal.classList.remove('open');
  crm.pendingDeleteRoomName = '';
}

function bookingsByRoomDate() {
  const counts = {};
  for (const b of crm.bookings) {
    if (b.paymentDeclined) continue;
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
  renderMobileRoomActions();

  const noRoom = document.getElementById('availabilityNoRoom');
  const calWrap = document.getElementById('availabilityCalendarWrap');
  const activeLabel = document.getElementById('availabilityActiveRoomLabel');

  if (!crm.manualSelectedRoom) {
    renderAvailabilityEmptyState();
    if (calWrap) calWrap.style.display = 'none';
    if (activeLabel) activeLabel.textContent = 'Add an inventory room to open the calendar.';
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

  crm.availabilityEditingDay = dayIso;
  const bookedMap = bookingsByRoomDate();
  const result = availabilityForDay(room, dayIso, bookedMap);
  const date = new Date(`${dayIso}T00:00:00`);
  title.textContent = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  countEl.textContent = String(result.status === 'closed' ? result.baseUnits : result.value);
  if (closedInput) closedInput.checked = result.status === 'closed';

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
  if (!nameEl || !unitsEl) return;
  const roomName = nameEl.value.trim();
  const totalUnits = Math.max(1, parseInt(unitsEl.value, 10) || 1);
  if (!roomName) {
    toast('Room name is required', 'error');
    return;
  }

  try {
    const data = await api('POST', '/api/crm/manual-availability/rooms', { roomName, totalUnits });
    if (!data.success) throw new Error(data.message || 'Failed to save room type');
    crm.manualAvailability = data.data || crm.manualAvailability;
    crm.manualSelectedRoom = roomName;
    closeRoomsAddModal();
    refreshRoomBadge();
    renderAvailabilityView();
    toast('Room type saved', 'success');
  } catch (e) {
    toast('Failed to save room type', 'error');
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
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 100);
}

function closeNotesModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('notesModal');
  modal.style.display = 'none';
  currentNoteBookingId = null;
  document.getElementById('noteInput').value = '';
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
  if (!crm.token) { toast('Sign in first', 'error'); return; }
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('Notifications not supported on this device', 'error');
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setNotificationButtonState(false);
      toast('Notifications blocked', 'error');
      return;
    }
    const keyRes = await fetch('/api/push/vapid-public');
    const keyData = await keyRes.json().catch(() => ({}));
    if (!keyData.publicKey) { toast('Push not configured', 'error'); return; }
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
  } catch(e) {
    setNotificationButtonState(false);
    toast('Failed: ' + (e.message || e), 'error');
  }
}

function getBookingReservationCode(b) {
  return (b && (b.pmsConfirmationCode || b.ourReservationCode)) || '';
}

function buildGuestInstallUrlForQr(reservationCode, ref) {
  const domain = crm.activeHotelDomain || '';
  if (!domain) return '';
  const params = new URLSearchParams({ ref: ref || 'frontdesk-qr-generic' });
  if (reservationCode) params.set('code', reservationCode);
  return 'https://' + domain + '/install?' + params.toString();
}

function promptUploadLogoBeforeQr(preselectedCode) {
  const existing = document.getElementById('logoGateOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'logoGateOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:102400;background:rgba(0,0,0,0.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:24px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="font-size:28px;margin-bottom:10px;">🖼️</div>
      <h2 style="font-size:17px;font-weight:800;color:#1a1a2e;margin:0 0 8px;line-height:1.35;">Upload your hotel logo first?</h2>
      <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 18px;text-align:left;">Guests see this icon when they save <strong>${crm.activeHotelName || 'your hotel'}</strong> to their phone. Takes 5 seconds.</p>
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

function showCheckinQrOverlay(preselectedCode, skipLogoGate) {
  const hName = crm.activeHotelName || 'Your Hotel';
  const domain = crm.activeHotelDomain || '';
  if (!domain) { toast('Your booking domain is still loading', 'error'); return; }
  if (!skipLogoGate && !preselectedCode && !crm.activeHotelAppIcon) {
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
    if (!b.checkinDate) return false;
    const ci = new Date(b.checkinDate);
    ci.setHours(0, 0, 0, 0);
    return ci >= today && ci <= dayAfterTomorrow;
  });

  const overlay = document.createElement('div');
  overlay.id = 'checkinQrOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:102500;background:#0a0f0d;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));box-sizing:border-box;';

  function escAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

  function render() {
    const ref = mode === 'guest' && selectedCode ? 'frontdesk-qr-guest' : 'frontdesk-qr-generic';
    const url = buildGuestInstallUrlForQr(mode === 'guest' ? selectedCode : '', ref);
    const qr = url ? 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=' + encodeURIComponent(url) : '';

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
      + '<h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;line-height:1.3;">Add ' + escAttr(hName) + ' to their phone</h2>'
      + '<p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">Takes about 10 seconds. They can message you and book direct next time.</p>'
      + '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">'
      + '<button type="button" data-qr-mode="generic" style="padding:10px 16px;border-radius:20px;border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;' + (mode === 'generic' ? 'background:#fff;color:#1a5c3f;' : 'background:rgba(255,255,255,0.12);color:#fff;') + '">Any guest</button>'
      + '<button type="button" data-qr-mode="guest" style="padding:10px 16px;border-radius:20px;border:none;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;' + (mode === 'guest' ? 'background:#fff;color:#1a5c3f;' : 'background:rgba(255,255,255,0.12);color:#fff;') + '">This guest</button>'
      + '</div>'
      + (mode === 'guest' ? (
          '<div style="margin-bottom:16px;text-align:left;">'
          + '<label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;margin-bottom:6px;">Checking in today or tomorrow</label>'
          + (arrivals.length
            ? '<select id="checkinQrGuestSelect" style="width:100%;padding:12px;border-radius:10px;border:none;font-family:inherit;font-size:14px;">' + guestOptions + '</select>'
            : '<input id="checkinQrCodeInput" type="text" placeholder="Confirmation code" value="' + escAttr(selectedCode) + '" style="width:100%;padding:12px;border-radius:10px;border:none;font-family:inherit;font-size:14px;box-sizing:border-box;">')
          + '</div>'
        ) : '')
      + (qr ? '<img src="' + qr + '" alt="QR code" width="280" height="280" style="border-radius:16px;background:#fff;padding:12px;max-width:min(280px,80vw);height:auto;">' : '')
      + '<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">'
      + (mode === 'guest' && selectedCode ? 'Links to their reservation + install' : 'Generic install — good for room cards')
      + '</p></div>';

    document.getElementById('checkinQrClose').onclick = closeCheckinQrOverlay;
    overlay.querySelectorAll('[data-qr-mode]').forEach(function(btn) {
      btn.onclick = function() {
        mode = btn.getAttribute('data-qr-mode');
        if (mode === 'guest' && !selectedCode && arrivals.length) {
          selectedCode = getBookingReservationCode(arrivals[0]);
        }
        render();
      };
    });
    const sel = document.getElementById('checkinQrGuestSelect');
    if (sel) {
      sel.onchange = function() { selectedCode = sel.value; render(); };
      if (!selectedCode && sel.value) selectedCode = sel.value;
    }
    const inp = document.getElementById('checkinQrCodeInput');
    if (inp) {
      inp.oninput = function() { selectedCode = inp.value.trim(); };
    }
  }

  function closeCheckinQrOverlay() {
    overlay.remove();
    document.body.style.overflow = '';
  }

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  render();
}

function closeCheckinQrOverlay() {
  const el = document.getElementById('checkinQrOverlay');
  if (el) el.remove();
  document.body.style.overflow = '';
}

function prefillGuestInstallBroadcast() {
  const hName = crm.activeHotelName || 'Your Hotel';
  const domain = crm.activeHotelDomain || '';
  const installUrl = domain ? 'https://' + domain + '/install' : '';
  const titleEl = document.getElementById('guest-broadcast-title');
  const bodyEl = document.getElementById('guest-broadcast-body');
  if (titleEl) titleEl.value = hName;
  if (bodyEl) {
    bodyEl.value = installUrl
      ? `Add ${hName} to your home screen — message us anytime and book direct next time. Tap here: ${installUrl}`
      : `Add ${hName} to your home screen — message us anytime and book direct next time.`;
  }
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
  if (!guestPushSubscriberCount) {
    toast('No guests have notifications on yet — show your QR at check-in first', 'error');
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
  el.textContent = `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${msg}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}


// ── DOWNLOAD FRONT DESK (Bookings tab nudge) ───────────────────
// Owner-facing: install THIS front desk to the home screen to receive booking
// notifications. Deliberately framed around alerts + "Front Desk" so it never
// reads as the guest booking engine (which is installed from the booking page).
function bookingsFrontdeskNudgeHtml() {
  const installed = isStandaloneApp() || crm.frontdeskInstalled;
  if (!installed) return frontdeskInstallCardHtml();
  if (!pushSupported()) return '';
  const granted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  return granted ? '' : frontdeskInstallCardHtml();
}

function frontdeskInstallCardHtml() {
  const installed = isStandaloneApp() || crm.frontdeskInstalled;
  const granted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  let inner;
  if (installed && pushSupported()) {
    inner = granted
      ? `<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">You're all set — you'll get an alert on this device every time a guest books.</p>
         <button onclick="toggleAppNotifications()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Send a test notification</button>`
      : `<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">You're in the app. Turn on alerts to get a notification the moment a guest books — even when it's closed.</p>
         <button onclick="toggleAppNotifications()" style="padding:10px 16px;border-radius:10px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Turn on notifications</button>`;
  } else if (installed && !pushSupported()) {
    inner = `<p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.5;">Front Desk is installed for quick one-tap access. (This device can't show push notifications.)</p>`;
  } else {
    inner = `<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">Install <strong>Front Desk</strong> on this device so booking alerts can reach you when supported. Takes 3 seconds.</p>
       <button onclick="handleInstallFrontdesk()" style="padding:10px 16px;border-radius:10px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Install Front Desk</button>`;
  }
  return `<div class="booking-card" id="frontdeskInstallCard" style="margin-bottom:14px;"><div style="padding:18px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">🔔 Get booking alerts</div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:68px;height:68px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.12);background:#fff;padding:10px;box-sizing:border-box;">
          <img src="/marketellogo.svg" alt="Front Desk app" style="width:100%;height:100%;object-fit:contain;">
        </div>
        <div style="flex:1;min-width:0;">
          ${inner}
        </div>
      </div>
    </div></div>`;
}

function refreshFrontdeskInstallCard() {
  if (crm.currentFilter === 'bookings') {
    renderMessages();
    return;
  }
  const el = document.getElementById('frontdeskInstallCard');
  if (!el) return;
  const html = bookingsFrontdeskNudgeHtml();
  if (!html) el.remove();
  else el.outerHTML = html;
}

function refreshAppsInstallSection() {
  const fn = (typeof ensureAppsViewRendered === 'function')
    ? ensureAppsViewRendered
    : window.ensureAppsViewRendered;
  if (typeof fn === 'function') fn(true);
}

function handleInstallFrontdesk() {
  if (isIosDevice()) {
    showIosInstallSheet({
      title: (crm.activeHotelName ? crm.activeHotelName + ' ' : '') + 'Front Desk',
      subtitle: 'Add it to your home screen — takes 3 seconds.',
    });
    return;
  }
  if (crm.deferredInstallPrompt) {
    crm.deferredInstallPrompt.prompt();
    crm.deferredInstallPrompt.userChoice.then((choice) => {
      if (choice && choice.outcome === 'accepted') { crm.frontdeskInstalled = true; }
      crm.deferredInstallPrompt = null;
      refreshFrontdeskInstallCard();
      refreshAppsInstallSection();
    }).catch(() => {});
  } else {
    toast('Use your browser menu → "Install app" / "Add to Home screen".', 'info');
  }
}

async function toggleAppNotifications() {
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
  refreshFrontdeskInstallCard();
  refreshAppsInstallSection();
}

// First-launch nudge inside the INSTALLED app. Installing a PWA never asks for
// notifications on its own — permission is a separate, gesture-driven step (iOS
// flat-out ignores requestPermission unless it comes from a tap). So the first
// time they open the installed Front Desk we surface a one-time card whose
// "Enable" button supplies that gesture. Shown once per device.
function maybePromptInstalledNotifications() {
  try {
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
      <div style="font-size:34px;margin-bottom:10px;">🔔</div>
      <h2 style="font-size:19px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Turn on booking alerts?</h2>
      <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 20px;">Get a notification the moment a guest books — even when the app is closed.</p>
      <button id="notifPromptEnable" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Enable notifications</button>
      <button id="notifPromptLater" style="width:100%;padding:12px;border-radius:12px;border:none;background:none;color:#6b7280;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Not now</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('notifPromptEnable').onclick = async () => {
    overlay.remove();
    await enableNotifications();   // runs inside this tap → gesture requirement satisfied
    refreshFrontdeskInstallCard();
    refreshAppsInstallSection();
  };
  document.getElementById('notifPromptLater').onclick = () => overlay.remove();
}

// Reusable themed iOS "Add to Home Screen" instruction sheet.
function showIosInstallSheet({ title, subtitle, iconUrl, openUrl } = {}) {
  const existing = document.getElementById('iosInstallSheet');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'iosInstallSheet';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;align-items:flex-end;justify-content:center;';
  const iconTile = iconUrl
    ? `<img src="${iconUrl}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${(crm.activeHotelName || 'B').trim().charAt(0).toUpperCase()}</div>`;
  overlay.innerHTML = `
    <div id="iosInstallSheetCard" style="position:relative;background:#fff;width:100%;max-width:440px;border-radius:20px 20px 0 0;padding:24px 22px 32px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);">
      <button type="button" id="iosInstallSheetClose" aria-label="Close" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:none;background:#f3f4f6;color:#6b7280;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-size:20px;line-height:1;font-family:inherit;">×</button>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-right:36px;">
        ${iconTile}
        <div><div style="font-size:16px;font-weight:800;color:#1a1a2e;">${title || 'Install app'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${subtitle || ''}</div></div>
      </div>
      ${openUrl ? `<a href="${openUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;width:100%;margin-bottom:16px;padding:12px;border-radius:11px;border:1.5px solid #2E7D5B;background:none;color:#2E7D5B;font-size:14px;font-weight:700;">Open booking page →</a>` : ''}
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</span><div style="font-size:14px;color:#374151;line-height:1.4;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Tap the <strong>Share</strong> button <i data-lucide="share" style="width:18px;height:18px;color:#007aff;vertical-align:middle;"></i> in Safari's bar</div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span><div style="font-size:14px;color:#374151;line-height:1.4;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Scroll down and tap <strong>Add to Home Screen</strong> <i data-lucide="square-plus" style="width:18px;height:18px;color:#2E7D5B;vertical-align:middle;"></i></div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</span><div style="font-size:14px;color:#374151;line-height:1.4;">Tap <strong>Add</strong> — done! It's on your home screen.</div></div>
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
  applyGuestBroadcastAudienceUi,
  applyLegacyHotelContext,
  availabilityForDay,
  bindAvailabilityUiEvents,
  blockedDemandLineHtml,
  bookingCardHtml,
  bookingsByRoomDate,
  bookingsFrontdeskNudgeHtml,
  bootCrmApp,
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
  ensureAvailabilityUi,
  ensureBookingsVirtualScroll,
  ensureGrowthStyles,
  enumerateDates,
  esc,
  finishTourHydration,
  formatContextDebugLines,
  formatCurrencyCompact,
  frontdeskInstallCardHtml,
  getBookingReservationCode,
  guestBookingEngineUrl,
  openGuestBookingEngine,
  getContextParam,
  getDetectedHostname,
  getManualRoomByName,
  goLiveBannerHtml,
  goLiveInlineCardHtml,
  goToAvailabilityTab,
  growthCheckDone,
  growthTriedCount,
  guestBroadcastCardHtml,
  handleInstallFrontdesk,
  hydrateCrmAfterTour,
  hydrateCrmInBackground,
  initMobileBottomNav,
  invokeLoadEditRooms,
  isEditPageDomReady,
  isIosDevice,
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
  markConfirmed,
  markMessageRead,
  maybePromptInstalledNotifications,
  moveSlider,
  needsEditPageLoad,
  normalizeRevenuePeriod,
  openAvailabilityDayPopover,
  openRoomsAddModal,
  openRoomsDeleteModal,
  openRoomsEditModal,
  pickDefaultMessageThread,
  pickMessageThread,
  prefillGuestInstallBroadcast,
  promptUploadLogoBeforeQr,
  pushSupported,
  refreshAppsInstallSection,
  refreshCurrentView,
  refreshFrontdeskInstallCard,
  refreshGoLiveInlineCard,
  refreshMobileBottomNavIcons,
  refreshRatesInputs,
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
  renderMobileRoomActions,
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
  setActiveManualRoom,
  setAvailabilityDaySaving,
  setBookingCallFilter,
  setBookingsSubview,
  setFilter,
  setGrowthChecklistItem,
  setGrowthPeriod,
  setMessageThread,
  setNotificationButtonState,
  showBootState,
  showCheckinQrOverlay,
  showHotelContextError,
  showIosInstallSheet,
  showLogin,
  showMagicLinkForm,
  showNotifPromptModal,
  startCrmApp,
  stepAvailabilityDay,
  syncMobileNavActive,
  syncNotificationButtonState,
  syncRevenueUi,
  threadSummary,
  timeAgo,
  toIsoDate,
  toast,
  toggleAppNotifications,
  toggleAvailabilityDayClosed,
  toggleMessageThreadPicker,
  toggleMessagesInbox,
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
});

// ── INIT ───────────────────────────────────────────────
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/frontdesk-sw.js').catch(() => {});
const signInBtn = document.getElementById('signInBtn');
if (signInBtn) signInBtn.addEventListener('click', () => { void doLogin(); });
const pinInputEl = document.getElementById('pinInput');
if (pinInputEl) pinInputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doLogin(); });
const magicLinkSendBtn = document.getElementById('magicLinkSendBtn');
if (magicLinkSendBtn) magicLinkSendBtn.addEventListener('click', () => { void sendMagicLink(); });
bootCrmApp();
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => { loadAppsModule().catch(() => {}); }, { timeout: 4000 });
} else {
  setTimeout(() => { loadAppsModule().catch(() => {}); }, 2000);
}
setInterval(refreshCurrentView, 30000);
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
