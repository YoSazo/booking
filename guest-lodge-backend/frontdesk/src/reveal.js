import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';

const PENDING_KEY = 'marketelValueRevealPendingV1';
const STEP_KEY = 'marketelValueRevealStepV1';

let currentStep = 0;
let engineMode = 'guest';
let revealData = { rooms: [], rates: null };
let dataPromise = null;
let bookingPageState = { ready: false, checking: true, reason: '', attempts: 0 };
let bookingPageTimer = 0;

function isLocalFrontdesk() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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
  if (typeof window.guestBookingEngineUrl === 'function') {
    return window.guestBookingEngineUrl() || '';
  }
  return crm.activeHotelDomain ? `https://${crm.activeHotelDomain}/` : '';
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

function fallbackGuestPreviewHtml() {
  const room = firstRoom();
  return `<div class="mvr-fallback-site">
    <div class="mvr-fallback-hero">
      ${roomPhotoHtml('mvr-fallback-photo')}
      <div class="mvr-fallback-brand">${esc(propertyName())}</div>
      <div class="mvr-fallback-sub">Book your stay directly</div>
    </div>
    <div class="mvr-fallback-search"><span>Check in</span><span>Check out</span><button>Search</button></div>
    <div class="mvr-fallback-room">
      <div><strong>${esc(room.name || 'Your room')}</strong><small>${Math.max(1, Number(room.totalUnits) || 1)} available</small></div>
      <strong>${money(nightlyRate())}<small>/night</small></strong>
    </div>
  </div>`;
}

function guestPhoneHtml() {
  const url = bookingPageState.ready ? bookingUrl() : '';
  return `<div class="mvr-phone mvr-booking-phone">
    <div class="mvr-phone-speaker"></div>
    <div class="mvr-browser-bar">
      <span class="mvr-browser-lock">●</span>
      <span>${esc(crm.activeHotelDomain || 'your-property.mktel.co')}</span>
    </div>
    <div class="mvr-phone-screen">
      ${url
        ? `<iframe title="${esc(propertyName())} booking page" src="${esc(url)}" loading="eager" sandbox="allow-scripts allow-same-origin"></iframe>`
        : fallbackGuestPreviewHtml()}
    </div>
  </div>`;
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

function editPreviewHtml() {
  const room = firstRoom();
  return `<div class="mvr-editor-window">
    <div class="mvr-editor-top">
      <div class="mvr-mini-mark">M</div>
      <div><strong>Front Desk</strong><span>Your page</span></div>
      <span class="mvr-saved-pill">Saved</span>
    </div>
    <div class="mvr-editor-note">Everything here controls what guests see.</div>
    <div class="mvr-editor-field">
      <span>Property name</span>
      <strong>${esc(propertyName())}</strong>
    </div>
    <div class="mvr-editor-room">
      ${roomPhotoHtml('mvr-editor-photo')}
      <div><span>Room or unit</span><strong>${esc(room.name || 'Your room')}</strong></div>
      <button type="button" tabindex="-1">Edit</button>
    </div>
    <div class="mvr-editor-grid">
      <div><span>Nightly rate</span><strong>${money(nightlyRate())}</strong></div>
      <div><span>Units</span><strong>${Math.max(1, Number(room.totalUnits) || 1)}</strong></div>
    </div>
    <div class="mvr-edit-sync">
      <span class="mvr-sync-pulse"></span>
      Changes update your guest page
    </div>
  </div>`;
}

function bookingRevealHtml() {
  return `<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${esc(firstRoom().name || 'a room')}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Change rooms, photos, rates, policies and property details anytime from Front Desk.
      </div>
      <div class="mvr-segmented" role="tablist" aria-label="Booking page and editor preview">
        <button type="button" data-engine-mode="guest" class="${engineMode === 'guest' ? 'is-active' : ''}">Guest view</button>
        <button type="button" data-engine-mode="edit" class="${engineMode === 'edit' ? 'is-active' : ''}">Edit view</button>
      </div>
      ${engineMode === 'guest' ? bookingPageStatusHtml() : ''}
      ${engineMode === 'guest' && bookingPageState.ready && bookingUrl() ? '<button type="button" class="mvr-text-action" id="mvrExpandPreview">Open the full live preview ↗</button>' : ''}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${engineMode === 'guest' ? guestPhoneHtml() : editPreviewHtml()}
      <div class="mvr-proof-chip">${engineMode === 'guest' ? 'What guests see' : 'What you control'}</div>
    </div>
  </section>`;
}

function guestAppRevealHtml() {
  const initial = esc(propertyName().trim().charAt(0).toUpperCase() || 'M');
  const appImage = crm.activeHotelAppIcon || firstRoomImage();
  const appIcon = appImage
    ? `<img src="${esc(appImage)}" alt="">`
    : `<span>${initial}</span>`;
  return `<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${esc(propertyName())}</strong> while they are on your booking page, then reopen it whenever they want to book direct again.</p>
      <div class="mvr-callout">
        <strong>No App Store search.</strong>
        They scan your QR code or tap Add to Home Screen from the booking page.
      </div>
    </div>
    <div class="mvr-visual mvr-home-visual">
      <div class="mvr-home-phone">
        <div class="mvr-home-status"><span>9:41</span><span>● ●</span></div>
        <div class="mvr-home-grid">
          <div class="mvr-home-app faded"><span>☀</span><small>Weather</small></div>
          <div class="mvr-home-app faded"><span>✉</span><small>Mail</small></div>
          <div class="mvr-home-app mvr-property-app"><div>${appIcon}</div><small>${esc(propertyName())}</small></div>
          <div class="mvr-home-app faded"><span>⌁</span><small>Maps</small></div>
        </div>
        <div class="mvr-home-dock"><span>☎</span><span>◉</span><span>▣</span></div>
      </div>
      <div class="mvr-qr-card"><div class="mvr-qr-pattern">▦</div><span>Scan once</span><strong>Book direct again</strong></div>
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
  if (!bookingPageState.ready || !url || document.getElementById('mvrLivePreview')) return;
  const modal = document.createElement('div');
  modal.id = 'mvrLivePreview';
  modal.className = 'mvr-live-preview';
  modal.innerHTML = `<div class="mvr-live-toolbar">
    <button type="button" id="mvrClosePreview">← Back to overview</button>
    <div><strong>${esc(propertyName())}</strong><span>${esc(crm.activeHotelDomain || '')}</span></div>
  </div>
  <iframe title="${esc(propertyName())} full booking-page preview" src="${esc(url)}" sandbox="allow-scripts allow-same-origin"></iframe>`;
  document.getElementById('marketelValueReveal')?.appendChild(modal);
  document.getElementById('mvrClosePreview')?.addEventListener('click', () => modal.remove());
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
  document.querySelectorAll('[data-engine-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      engineMode = button.dataset.engineMode === 'edit' ? 'edit' : 'guest';
      if (engineMode === 'edit') trackReveal('BookingEngineEditPreviewViewed');
      renderReveal();
    });
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
  engineMode = 'guest';
  bookingPageState = { ready: false, checking: true, reason: '', attempts: 0 };
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
