import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';

const PENDING_KEY = 'marketelValueRevealPendingV1';
const STEP_KEY = 'marketelValueRevealStepV1';

let currentStep = 0;
let livePreviewMode = 'guest';
let homeScreenInstalled = false;
let revealData = { rooms: [], rates: null };
let dataPromise = null;
let bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
let bookingPageTimer = 0;

function isLocalFrontdesk() {
  const host = window.location.hostname;
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || host === '::1'
    || host.endsWith('.local')
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$99';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function propertyName() {
  return crm.activeHotelName || 'Your Property';
}

function firstRoom() {
  return revealData.rooms[0] || crm.editRooms[0] || {
    name: 'Your first room',
    totalUnits: 1,
    images: [],
  };
}

function firstRoomImage() {
  const room = firstRoom();
  return room.images?.[0]?.url || room.imageUrl || '';
}

function nightlyRate() {
  return revealData.rates?.nightly || 99;
}

function bookingUrl() {
  if (isLocalFrontdesk() && crm.activeHotelId) {
    const url = new URL(window.location.href);
    url.port = '5173';
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    url.searchParams.set('hotelId', crm.activeHotelId);
    return url.toString();
  }
  const domain = bookingPageState.domain || crm.activeHotelDomain || '';
  return domain ? `https://${domain}/` : '';
}

function frontdeskEditorUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (crm.activeHotelId) url.searchParams.set('hotelId', crm.activeHotelId);
  url.searchParams.set('previewEditor', '1');
  return url.toString();
}

function appIconHtml(className = '') {
  const appImage = crm.activeHotelAppIcon || firstRoomImage();
  const initial = propertyName().trim().charAt(0).toUpperCase() || 'M';
  return appImage
    ? `<img class="${className}" src="${esc(appImage)}" alt="">`
    : `<span class="${className}">${esc(initial)}</span>`;
}

function persistStep() {
  if (crm.hotelSubscribed) return;
  try {
    localStorage.setItem(PENDING_KEY, '1');
    localStorage.setItem(STEP_KEY, String(currentStep));
  } catch (_) {}
}

function trackReveal(eventName, contentName = '') {
  if (typeof window.api !== 'function') return;
  window.api('POST', '/api/crm/value-reveal-event', {
    eventName,
    contentName,
  }).catch(() => {});
}

function cleanRevealUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    url.searchParams.delete('reveal');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (_) {}
}

function shellVisible(visible) {
  if (typeof window.setNativeShellVisible === 'function') {
    window.setNativeShellVisible(visible);
  }
}

function progressHtml() {
  const labels = ['Booking page', 'Guest app', 'Front Desk', crm.hotelSubscribed ? 'Complete' : 'Activate'];
  return `<div class="mvr-progress" aria-label="Marketel overview progress">
    ${labels.map((label, index) => `<div class="mvr-progress-item ${index === currentStep ? 'is-active' : ''} ${index < currentStep ? 'is-done' : ''}">
      <span></span><small>${esc(label)}</small>
    </div>`).join('')}
  </div>`;
}

function roomPhotoHtml(className = '') {
  const image = firstRoomImage();
  if (image) {
    return `<img class="${className}" src="${esc(image)}" alt="${esc(firstRoom().name || 'Room')}">`;
  }
  return `<div class="${className} mvr-photo-placeholder"><span>${esc((firstRoom().name || 'R').trim().charAt(0).toUpperCase())}</span></div>`;
}

function bookingPageStatusHtml() {
  if (bookingPageState.ready) {
    return `<div class="mvr-page-status is-ready"><span>✓</span>${bookingPageState.reason === 'local'
      ? 'Local guest preview connected'
      : 'Your live guest page is online'}</div>`;
  }
  if (bookingPageState.reason === 'deployment-disabled') {
    return '<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>';
  }
  return `<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${bookingPageState.checking
    ? 'Publishing your live guest page…'
    : 'Your personalized preview is ready while the live page finishes publishing.'}</div>`;
}

function bookingPreviewCardHtml() {
  const room = firstRoom();
  return `<button type="button" class="mvr-booking-preview-card" id="mvrExpandPreview">
    <div class="mvr-booking-preview-hero">
      ${roomPhotoHtml('mvr-booking-preview-photo')}
      <span class="mvr-live-pill"><i></i> Direct booking page</span>
      <div class="mvr-booking-preview-title">
        <small>Book direct with</small>
        <strong>${esc(propertyName())}</strong>
      </div>
    </div>
    <div class="mvr-booking-preview-body">
      <div>
        <span>${esc(room.name || 'Your room')}</span>
        <small>${Math.max(1, Number(room.totalUnits) || 1)} available · from ${money(nightlyRate())}/night</small>
      </div>
      <b>Open live preview <span>↗</span></b>
    </div>
  </button>`;
}

function bookingRevealHtml() {
  return `<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${esc(firstRoom().name || 'a room')}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Open the live preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${bookingPageStatusHtml()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${bookingPreviewCardHtml()}
    </div>
  </section>`;
}

function phoneIconSvg() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="mvrPhoneGreen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#62e46f"/><stop offset="1" stop-color="#08a837"/></linearGradient></defs>
    <rect width="64" height="64" rx="14" fill="url(#mvrPhoneGreen)"/>
    <path fill="#fff" d="M20.1 14.8c1.7-1 4.2-.5 5.2 1.3l4.2 7.4c.8 1.5.6 3.3-.6 4.5l-3 3c2.1 4.5 5.7 8.1 10.2 10.2l3-3c1.2-1.2 3-1.5 4.5-.6l7.4 4.2c1.8 1 2.4 3.5 1.3 5.2l-2.2 3.5c-1.7 2.8-5.1 4.2-8.3 3.4-15.7-3.7-28-16-31.7-31.7-.8-3.2.6-6.6 3.4-8.3l3.6-2.1z"/>
  </svg>`;
}

function safariIconSvg() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#fff"/>
    <circle cx="32" cy="32" r="25" fill="#40b8ed"/>
    <circle cx="32" cy="32" r="20.5" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>
    <g stroke="#fff" stroke-width="1.3" opacity=".9">
      <path d="M32 9v5M32 50v5M9 32h5M50 32h5M15.7 15.7l3.5 3.5M44.8 44.8l3.5 3.5M48.3 15.7l-3.5 3.5M19.2 44.8l-3.5 3.5"/>
    </g>
    <path d="M37.3 26.7 27.7 30l-4 9.1 9.6-3.3 4-9.1z" fill="#fff"/>
    <path d="m37.3 26.7-4 9.1-3.2-3.2 7.2-5.9z" fill="#ef3d52"/>
  </svg>`;
}

function guestAppRevealHtml() {
  return `<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${esc(propertyName())}</strong> while they are on your booking page, then reopen it whenever they want to book direct again.</p>
      <div class="mvr-callout">
        <strong>No App Store search or account.</strong>
        They tap Install on your booking page. Your property appears beside the apps they already use.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${homeScreenInstalled ? 'is-installed' : ''}">
      <div class="mvr-install-card">
        <div class="mvr-install-property-icon">${appIconHtml()}</div>
        <div>
          <strong>Add ${esc(propertyName())} to your Home Screen</strong>
          <span>Book direct in one tap next time.</span>
        </div>
        <button type="button" id="mvrInstallDemo">${homeScreenInstalled ? 'Installed ✓' : 'Install'}</button>
      </div>
      <div class="mvr-install-arrow"><span>${homeScreenInstalled ? 'Now on their phone' : 'Tap Install'}</span><b>↓</b></div>
      <div class="mvr-ios-crop">
        <div class="mvr-ios-dock">
          <div class="mvr-dock-icon mvr-dock-property">${appIconHtml()}</div>
          <div class="mvr-dock-icon">${phoneIconSvg()}</div>
          <div class="mvr-dock-icon">${safariIconSvg()}</div>
        </div>
      </div>
    </div>
  </section>`;
}

function assistantRevealHtml() {
  const roomName = firstRoom().name || 'King Suite';
  return `<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Something changed outside Marketel? Tell Front Desk once.</h1>
      <p>Keep the tools and walk-ins you already have. Front Desk checks direct bookings with the people who know the property.</p>
      <div class="mvr-callout">
        <strong>No integration maze.</strong>
        When a room is taken elsewhere, reply in plain language and Marketel updates availability for you.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-booking-alert">
        <div class="mvr-marketel-avatar">M</div>
        <div><span>Front Desk</span><strong>New ${esc(roomName)} booking</strong><small>Tomorrow · ${money(nightlyRate())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${esc(roomName)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">We gave it to a walk-in.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Done.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Handled by Front Desk</strong><small>Your booking page is up to date</small></div></div>
    </div>
  </section>`;
}

function finaleHtml() {
  const isSubscribed = crm.hotelSubscribed;
  return `<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${isSubscribed ? 'Your Marketel system' : 'Ready to activate'}</div>
      <h1>${isSubscribed ? `${esc(propertyName())} is ready.` : `Marketel is ready for ${esc(propertyName())}.`}</h1>
      <p>${isSubscribed ? 'Your direct booking page, guest app and Front Desk work together as one system.' : 'Turn on the system you just saw and finish making it yours.'}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>A direct path back to your property</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${isSubscribed ? '' : `<div class="mvr-price"><strong>$199</strong><span>/month</span></div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>Try the complete system. Cancel anytime—no contract.</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${isSubscribed ? 'Open Front Desk' : 'Activate Marketel — $199/month'}
      </button>
      <div class="mvr-secure-note">${isSubscribed
        ? 'You can replay this overview anytime from How it works.'
        : 'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`;
}

function stepHtml() {
  if (currentStep === 0) return bookingRevealHtml();
  if (currentStep === 1) return guestAppRevealHtml();
  if (currentStep === 2) return assistantRevealHtml();
  return finaleHtml();
}

function footerHtml() {
  if (currentStep === 3) {
    return `<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;
  }
  const labels = [
    'See how guests come back',
    'See how Front Desk protects you',
    'See everything you’re getting',
  ];
  return `<div class="mvr-footer">
    ${currentStep > 0 ? '<button type="button" class="mvr-back" id="mvrBack">← Back</button>' : '<span></span>'}
    <button type="button" class="mvr-primary" id="mvrNext">${labels[currentStep]} →</button>
  </div>`;
}

function renderReveal() {
  const root = document.getElementById('marketelValueReveal');
  if (!root) return;
  root.innerHTML = `<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${progressHtml()}
    </header>
    <main class="mvr-main">${stepHtml()}</main>
    ${footerHtml()}
  </div>`;
  bindRevealEvents();
}

function showExpandedPreview() {
  const url = bookingUrl();
  if (!url || document.getElementById('mvrLivePreview')) return;
  livePreviewMode = 'guest';
  const modal = document.createElement('div');
  modal.id = 'mvrLivePreview';
  modal.className = 'mvr-live-preview';
  modal.innerHTML = `<div class="mvr-live-toolbar">
    <button type="button" id="mvrClosePreview">← Back to overview</button>
    <div class="mvr-live-title"><strong>${esc(propertyName())}</strong><span>Live preview · changes in Edit save for real</span></div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${esc(propertyName())} live preview" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`;
  document.getElementById('marketelValueReveal')?.appendChild(modal);
  document.getElementById('mvrClosePreview')?.addEventListener('click', () => modal.remove());
  modal.querySelectorAll('[data-live-preview-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.livePreviewMode === 'edit' ? 'edit' : 'guest';
      if (nextMode === livePreviewMode) return;
      livePreviewMode = nextMode;
      modal.querySelectorAll('[data-live-preview-mode]').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.livePreviewMode === livePreviewMode);
      });
      const iframe = modal.querySelector('iframe');
      if (iframe) {
        iframe.title = livePreviewMode === 'edit'
          ? `${propertyName()} Front Desk editor`
          : `${propertyName()} booking-page preview`;
        iframe.src = livePreviewMode === 'edit' ? frontdeskEditorUrl() : bookingUrl();
      }
      if (livePreviewMode === 'edit') trackReveal('BookingEngineEditPreviewViewed');
    });
  });
  trackReveal('BookingEngineFullPreviewOpened');
}

function moveToStep(nextStep) {
  currentStep = Math.max(0, Math.min(3, nextStep));
  persistStep();
  const events = [
    'BookingEngineRevealViewed',
    'GuestAppRevealViewed',
    'AssistantRevealViewed',
    'ActivationOfferViewed',
  ];
  trackReveal(events[currentStep]);
  renderReveal();
  document.querySelector('.mvr-main')?.scrollTo({ top: 0, behavior: 'auto' });
}

function finishReveal() {
  if (bookingPageTimer) {
    window.clearTimeout(bookingPageTimer);
    bookingPageTimer = 0;
  }
  document.getElementById('marketelValueReveal')?.remove();
  document.documentElement.classList.remove('marketel-reveal-open');
  document.body.style.overflow = '';
  crm.settingsTourActive = false;
  try {
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(STEP_KEY);
    localStorage.setItem('settingsTourDone', '1');
    localStorage.setItem('onboardingDone', '1');
  } catch (_) {}
  cleanRevealUrl();
  shellVisible(true);
  if (typeof window.updateGoLiveBanner === 'function') window.updateGoLiveBanner();
  if (typeof window.refreshGoLiveInlineCard === 'function') window.refreshGoLiveInlineCard();
}

async function activateMarketel(button) {
  if (crm.hotelSubscribed) {
    finishReveal();
    return;
  }
  if (typeof window.goLive !== 'function') return;
  button.disabled = true;
  button.textContent = 'Opening secure checkout…';
  trackReveal('ActivationCtaClicked');
  try {
    await window.goLive();
  } finally {
    if (document.body.contains(button)) {
      button.disabled = false;
      button.textContent = 'Activate Marketel — $199/month';
    }
  }
}

function bindRevealEvents() {
  document.getElementById('mvrNext')?.addEventListener('click', () => moveToStep(currentStep + 1));
  document.getElementById('mvrBack')?.addEventListener('click', () => moveToStep(currentStep - 1));
  document.getElementById('mvrExpandPreview')?.addEventListener('click', showExpandedPreview);
  document.getElementById('mvrFinalCta')?.addEventListener('click', (event) => activateMarketel(event.currentTarget));
  document.getElementById('mvrInstallDemo')?.addEventListener('click', () => {
    if (homeScreenInstalled) return;
    homeScreenInstalled = true;
    trackReveal('GuestAppInstallDemoClicked');
    renderReveal();
  });
}

async function loadRevealData() {
  if (dataPromise || typeof window.api !== 'function') return dataPromise;
  dataPromise = window.api('GET', '/api/crm/rooms')
    .then((result) => {
      revealData = {
        rooms: Array.isArray(result?.rooms) ? result.rooms : [],
        rates: result?.rates || null,
      };
      if (revealData.rooms.length) crm.editRooms = revealData.rooms;
      if (document.getElementById('marketelValueReveal') && !document.getElementById('mvrLivePreview')) renderReveal();
      return revealData;
    })
    .catch(() => revealData)
    .finally(() => {
      dataPromise = null;
    });
  return dataPromise;
}

async function checkBookingPageStatus() {
  if (typeof window.api !== 'function' || !document.getElementById('marketelValueReveal')) return;
  if (isLocalFrontdesk()) {
    bookingPageState = {
      ready: !!bookingUrl(),
      checking: false,
      reason: 'local',
      attempts: 1,
      domain: '',
    };
    if (currentStep === 0 && !document.getElementById('mvrLivePreview')) renderReveal();
    return;
  }
  bookingPageState.checking = true;
  bookingPageState.attempts += 1;
  try {
    const result = await window.api('GET', '/api/crm/booking-page-status');
    bookingPageState = {
      ready: !!result?.ready,
      checking: false,
      reason: String(result?.reason || ''),
      attempts: bookingPageState.attempts,
      domain: String(result?.domain || ''),
    };
  } catch (_) {
    bookingPageState.checking = false;
    bookingPageState.reason = 'unreachable';
  }

  if (currentStep === 0 && !document.getElementById('mvrLivePreview')) renderReveal();
  if (bookingPageState.ready || bookingPageState.reason === 'deployment-disabled') return;
  if (bookingPageState.attempts < 10 && document.getElementById('marketelValueReveal')) {
    bookingPageTimer = window.setTimeout(checkBookingPageStatus, 6000);
  }
}

export function showMarketelValueReveal(options = {}) {
  if (document.getElementById('marketelValueReveal')) return;
  const requestedStep = Number(options.startAt);
  let storedStep = 0;
  try { storedStep = Number.parseInt(localStorage.getItem(STEP_KEY) || '0', 10); } catch (_) {}
  currentStep = Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(3, requestedStep))
    : Math.max(0, Math.min(3, Number.isFinite(storedStep) ? storedStep : 0));
  if (crm.hotelSubscribed && currentStep === 3) currentStep = 0;
  livePreviewMode = 'guest';
  homeScreenInstalled = false;
  bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
  if (bookingPageTimer) window.clearTimeout(bookingPageTimer);
  bookingPageTimer = 0;

  if (!crm.hotelSubscribed) {
    try {
      localStorage.setItem(PENDING_KEY, '1');
      localStorage.setItem(STEP_KEY, String(currentStep));
    } catch (_) {}
  }
  try {
    localStorage.setItem('settingsTourDone', '1');
    localStorage.removeItem('settingsTourStep');
  } catch (_) {}

  crm.settingsTourActive = true;
  document.documentElement.classList.add('marketel-reveal-open');
  document.body.style.overflow = 'hidden';
  shellVisible(false);

  const root = document.createElement('div');
  root.id = 'marketelValueReveal';
  root.className = 'mvr-root';
  document.body.appendChild(root);
  renderReveal();
  trackReveal('ValueRevealStarted', crm.hotelSubscribed ? 'subscribed-replay' : 'pre-activation');
  moveToStep(currentStep);
  void loadRevealData();
  void checkBookingPageStatus();
}

export function hasPendingMarketelValueReveal() {
  try {
    return localStorage.getItem(PENDING_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function clearPendingMarketelValueReveal() {
  try {
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch (_) {}
}

const revealExports = {
  clearPendingMarketelValueReveal,
  hasPendingMarketelValueReveal,
  showMarketelValueReveal,
};

export function install() {
  exposeToWindow(revealExports);
}

export default revealExports;
