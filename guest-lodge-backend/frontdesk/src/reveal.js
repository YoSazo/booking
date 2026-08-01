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
let guestAppDemoTimer = 0;
let guestAppDemoObserver = null;
let guestAppDemoSlide = 0;

const IOS_PHONE_ICON_URL = 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg';
const IOS_SAFARI_ICON_URL = 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg';

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
    url.searchParams.set('preview', '1');
    return url.toString();
  }
  const domain = bookingPageState.domain || crm.activeHotelDomain || '';
  if (!domain) return '';
  const url = new URL(`https://${domain}/`);
  if (crm.activeHotelId) url.searchParams.set('hotelId', crm.activeHotelId);
  url.searchParams.set('preview', '1');
  return url.toString();
}

function bookingDisplayDomain() {
  const configuredDomain = String(bookingPageState.domain || crm.activeHotelDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (configuredDomain) {
    return configuredDomain.endsWith('.bookmarketel.com')
      ? configuredDomain.replace(/\.bookmarketel\.com$/, '.mktel.co')
      : configuredDomain;
  }
  const propertySlug = propertyName()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${propertySlug || 'your-property'}.mktel.co`;
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

function handleBookingPreviewMessage(event) {
  if (event?.data?.type !== 'marketel:show-guest-app') return;
  const reveal = document.getElementById('marketelValueReveal');
  if (!reveal) return;
  const knownFrame = Array.from(reveal.querySelectorAll('iframe'))
    .some((frame) => frame.contentWindow === event.source);
  if (!knownFrame) return;
  document.getElementById('mvrLivePreview')?.remove();
  trackReveal('GuestAppPreviewRequestedFromBookingEngine');
  moveToStep(1);
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
  const url = bookingUrl();
  return `<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${esc(bookingDisplayDomain())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${url
        ? `<iframe title="${esc(propertyName())} booking-page preview" src="${esc(url)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`
        : '<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
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
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${bookingPageStatusHtml()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${bookingPreviewCardHtml()}
    </div>
  </section>`;
}

function iosSystemIcon(url, label) {
  return `<img class="mvr-ios-system-icon" src="${esc(url)}" alt="${esc(label)}">`;
}

function guestAppRevealHtml() {
  return `<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${esc(propertyName())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${homeScreenInstalled ? 'is-installed' : ''} ${guestAppDemoSlide === 1 ? 'is-slide-2' : ''}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${guestAppDemoSlide === 0 ? 'false' : 'true'}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${appIconHtml()}</div>
                    <div>
                      <strong>Get the ${esc(propertyName())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${homeScreenInstalled ? 'disabled' : ''}>${homeScreenInstalled ? 'Installed ✓' : 'Install'}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${homeScreenInstalled ? 'Now on their Home Screen' : 'Tap Install'}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${appIconHtml()}</div>
                      <div class="mvr-dock-icon">${iosSystemIcon(IOS_PHONE_ICON_URL, 'Phone')}</div>
                      <div class="mvr-dock-icon">${iosSystemIcon(IOS_SAFARI_ICON_URL, 'Safari')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${guestAppDemoSlide === 1 ? 'false' : 'true'}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${appIconHtml()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${esc(propertyName())} stays one tap away.</span>
                  </div>
                  <b>✓</b>
                </div>
                <div class="mvr-app-direct-result">
                  <span aria-hidden="true">↗</span>
                  <div>
                    <strong>Book direct again</strong>
                    <small>One tap brings them straight back to your booking page.</small>
                  </div>
                </div>
                <div class="mvr-app-push-preview">
                  <div class="mvr-app-push-meta">
                    <span class="mvr-app-push-icon">${appIconHtml()}</span>
                    <strong>${esc(propertyName())}</strong>
                    <span>now</span>
                  </div>
                  <div class="mvr-app-push-title">Summer dates are open</div>
                  <div class="mvr-app-push-body">Tap to see availability and book direct.</div>
                </div>
                <div class="mvr-app-push-foot">Sent from Front Desk → delivered to their phone</div>
              </div>
            </div>
          </div>
        </div>
        <div class="mvr-app-carousel-controls" aria-label="Guest app demonstration">
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${guestAppDemoSlide === 0 ? 'disabled' : ''}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${guestAppDemoSlide === 0 ? 'is-active' : ''}" aria-label="Installation" aria-current="${guestAppDemoSlide === 0 ? 'step' : 'false'}"></button>
            <button type="button" data-mvr-app-slide="1" class="${guestAppDemoSlide === 1 ? 'is-active' : ''}" aria-label="What the app unlocks" aria-current="${guestAppDemoSlide === 1 ? 'step' : 'false'}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${guestAppDemoSlide === 1 ? 'disabled' : ''}>›</button>
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
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>When a direct booking arrives, Front Desk asks you and the people you choose whether the room is still available. If a walk-in or another booking took it, reply normally and Marketel handles the rest.</p>
      <div class="mvr-callout">
        <strong>Front Desk follows up—you don't have to remember.</strong>
        One reply can block the dates, release the guest's $1 hold and notify them automatically.
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
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
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
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
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
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${esc(propertyName())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
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
  clearGuestAppDemoSchedule();
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
  clearGuestAppDemoSchedule();
  document.getElementById('marketelValueReveal')?.remove();
  document.documentElement.classList.remove('marketel-reveal-open');
  document.body.style.overflow = '';
  window.removeEventListener('message', handleBookingPreviewMessage);
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

function clearGuestAppDemoSchedule() {
  if (guestAppDemoTimer) {
    window.clearTimeout(guestAppDemoTimer);
    guestAppDemoTimer = 0;
  }
  guestAppDemoObserver?.disconnect();
  guestAppDemoObserver = null;
}

function setGuestAppInstallVisual(installed) {
  homeScreenInstalled = !!installed;
  const visual = document.querySelector('.mvr-install-visual');
  visual?.classList.toggle('is-installed', homeScreenInstalled);
  const button = document.getElementById('mvrInstallDemo');
  if (button) {
    button.textContent = homeScreenInstalled ? 'Installed ✓' : 'Install';
    button.disabled = homeScreenInstalled;
  }
  const arrowLabel = visual?.querySelector('.mvr-install-arrow span');
  if (arrowLabel) arrowLabel.textContent = homeScreenInstalled ? 'Now on their Home Screen' : 'Tap Install';
}

function setGuestAppDemoSlide(nextSlide, manual = false) {
  clearGuestAppDemoSchedule();
  guestAppDemoSlide = Number(nextSlide) === 1 ? 1 : 0;
  const visual = document.querySelector('.mvr-install-visual');
  if (!visual) return;
  visual.classList.toggle('is-slide-2', guestAppDemoSlide === 1);
  visual.querySelectorAll('.mvr-app-carousel-slide').forEach((slide, index) => {
    slide.setAttribute('aria-hidden', index === guestAppDemoSlide ? 'false' : 'true');
  });
  visual.querySelectorAll('.mvr-app-carousel-dots button').forEach((dot) => {
    const isActive = Number(dot.dataset.mvrAppSlide) === guestAppDemoSlide;
    dot.classList.toggle('is-active', isActive);
    dot.setAttribute('aria-current', isActive ? 'step' : 'false');
  });
  visual.querySelectorAll('.mvr-app-carousel-controls > button').forEach((button) => {
    button.disabled = Number(button.dataset.mvrAppSlide) === guestAppDemoSlide;
  });
  if (guestAppDemoSlide === 1) {
    setGuestAppInstallVisual(true);
  } else {
    setGuestAppInstallVisual(false);
    scheduleGuestAppValueDemo();
  }
  if (manual) trackReveal(guestAppDemoSlide === 1 ? 'GuestAppValueSlideViewed' : 'GuestAppInstallSlideReplayed');
}

function revealGuestAppValue(manual = false) {
  if (homeScreenInstalled || guestAppDemoSlide !== 0) return;
  clearGuestAppDemoSchedule();
  setGuestAppInstallVisual(true);
  if (manual) trackReveal('GuestAppInstallDemoClicked');
  guestAppDemoTimer = window.setTimeout(() => {
    if (currentStep === 1 && document.getElementById('marketelValueReveal')) {
      setGuestAppDemoSlide(1, false);
    }
  }, manual ? 900 : 1200);
}

function scheduleGuestAppValueDemo() {
  clearGuestAppDemoSchedule();
  if (currentStep !== 1 || guestAppDemoSlide !== 0) return;
  const visual = document.querySelector('.mvr-install-visual');
  if (!visual) return;
  const begin = () => {
    if (guestAppDemoTimer) return;
    guestAppDemoTimer = window.setTimeout(() => {
      if (currentStep === 1 && document.getElementById('marketelValueReveal')) {
        if (homeScreenInstalled) setGuestAppDemoSlide(1, false);
        else revealGuestAppValue(false);
      }
    }, homeScreenInstalled ? 900 : 1300);
  };
  if ('IntersectionObserver' in window) {
    guestAppDemoObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) return;
      guestAppDemoObserver?.disconnect();
      guestAppDemoObserver = null;
      begin();
    }, { threshold: [0.35] });
    guestAppDemoObserver.observe(visual);
  } else {
    begin();
  }
}

function bindRevealEvents() {
  document.getElementById('mvrNext')?.addEventListener('click', () => moveToStep(currentStep + 1));
  document.getElementById('mvrBack')?.addEventListener('click', () => moveToStep(currentStep - 1));
  document.getElementById('mvrExpandPreview')?.addEventListener('click', showExpandedPreview);
  document.getElementById('mvrFinalCta')?.addEventListener('click', (event) => activateMarketel(event.currentTarget));
  document.getElementById('mvrInstallDemo')?.addEventListener('click', () => {
    revealGuestAppValue(true);
  });
  document.querySelectorAll('[data-mvr-app-slide]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextSlide = Number(button.dataset.mvrAppSlide) === 1 ? 1 : 0;
      if (nextSlide !== guestAppDemoSlide) setGuestAppDemoSlide(nextSlide, true);
    });
  });
  scheduleGuestAppValueDemo();
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
  guestAppDemoSlide = 0;
  bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
  if (bookingPageTimer) window.clearTimeout(bookingPageTimer);
  bookingPageTimer = 0;
  clearGuestAppDemoSchedule();

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
  window.addEventListener('message', handleBookingPreviewMessage);
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
