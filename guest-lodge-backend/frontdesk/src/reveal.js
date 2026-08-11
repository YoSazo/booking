import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';

const PENDING_KEY = 'marketelValueRevealPendingV1';
const STEP_KEY = 'marketelValueRevealStepV1';
const BILLING_KEY = 'marketelBillingIntervalV1';

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
let revealStartedAt = 0;
let stageStartedAt = 0;
let billingInterval = 'month';
let activeBookingChallenge = null;
let bookingPreviewOpened = false;
let bookingPreviewUnavailable = false;
let nextStageViewIsResume = false;
let assistantNoResponseAction = 'confirm';

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

function directBookingValueHtml() {
  const rate = Number(revealData.rates?.nightly);
  if (!Number.isFinite(rate) || rate <= 0) {
    return `<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;
  }
  const estimatedCommissionRate = 0.15;
  const estimatedCommissionPerNight = rate * estimatedCommissionRate;
  const breakEvenRoomNights = Math.max(1, Math.ceil(199 / estimatedCommissionPerNight));
  const estimatedSavings = estimatedCommissionPerNight * breakEvenRoomNights;
  return `<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${breakEvenRoomNights} direct room-night${breakEvenRoomNights === 1 ? '' : 's'} could cover a month.</strong>
    <p>At ${money(rate)} per night, shifting ${breakEvenRoomNights} room-night${breakEvenRoomNights === 1 ? '' : 's'} from an estimated 15% OTA fee to direct represents about ${money(estimatedSavings)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`;
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
    ...(window.MarketelJourney?.linkage?.() || {}),
  }).catch(() => {});
}

function trackJourney(eventName, metadata = {}, options = {}) {
  return window.MarketelJourney?.track(eventName, {
    revealStep: currentStep,
    stageName: ['booking-page', 'guest-app', 'front-desk-assistant', 'activation'][currentStep] || 'unknown',
    ...metadata,
  }, options);
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

function formatChallengeTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(Number(elapsedMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function hideBookingChallengeLayer(challenge) {
  if (!challenge?.layer) return;
  challenge.layer.classList.remove('is-visible', 'is-prompt');
  challenge.layer.setAttribute('aria-hidden', 'true');
  challenge.layer.innerHTML = '';
}

function setLivePreviewActionsVisible(modal, visible) {
  const actions = modal?.querySelector('#mvrLiveActions');
  if (actions) actions.hidden = !visible;
}

function stopBookingChallenge(reason = '', shouldTrack = false) {
  const challenge = activeBookingChallenge;
  if (!challenge) return;
  if (challenge.timerId) {
    window.clearInterval(challenge.timerId);
    challenge.timerId = 0;
  }
  if (challenge.promptFallbackId) {
    window.clearTimeout(challenge.promptFallbackId);
    challenge.promptFallbackId = 0;
  }
  if (challenge.promptDelayId) {
    window.clearTimeout(challenge.promptDelayId);
    challenge.promptDelayId = 0;
  }
  if (shouldTrack && challenge.status === 'running') {
    const elapsedMs = Date.now() - challenge.startedAt;
    trackReveal('BookingChallengeAbandoned', reason);
    trackJourney('JourneyBookingChallengeAbandoned', {
      reason,
      elapsedMs,
    }, { durationMs: elapsedMs });
  }
  if (challenge.timer) challenge.timer.hidden = true;
  if (challenge.status === 'running') challenge.status = 'abandoned';
  hideBookingChallengeLayer(challenge);
}

function updateBookingChallengeTimer(challenge) {
  if (!challenge || challenge.status !== 'running' || !challenge.timer) return;
  const elapsedMs = Date.now() - challenge.startedAt;
  const time = challenge.timer.querySelector('[data-challenge-time]');
  if (time) time.textContent = `${formatChallengeTime(elapsedMs)} / 1:00`;
  challenge.timer.classList.toggle('is-over-minute', elapsedMs >= 60000);
}

function startBookingChallenge(challenge) {
  if (!challenge || challenge !== activeBookingChallenge || challenge.status !== 'prompted') return;
  challenge.status = 'running';
  challenge.startedAt = Date.now();
  hideBookingChallengeLayer(challenge);
  setLivePreviewActionsVisible(challenge.modal, true);
  challenge.timer.hidden = false;
  updateBookingChallengeTimer(challenge);
  challenge.timerId = window.setInterval(() => updateBookingChallengeTimer(challenge), 500);
  trackReveal('BookingChallengeStarted');
  trackJourney('JourneyBookingChallengeStarted', {
    targetSeconds: 60,
    bookingDomain: bookingDisplayDomain(),
  });
}

function showBookingChallengePrompt(challenge) {
  if (!challenge || challenge !== activeBookingChallenge || challenge.hasPrompted || livePreviewMode !== 'guest') return;
  challenge.hasPrompted = true;
  challenge.status = 'prompted';
  if (challenge.promptFallbackId) {
    window.clearTimeout(challenge.promptFallbackId);
    challenge.promptFallbackId = 0;
  }
  setLivePreviewActionsVisible(challenge.modal, false);
  challenge.layer.innerHTML = `<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`;
  challenge.layer.classList.add('is-visible', 'is-prompt');
  challenge.layer.setAttribute('aria-hidden', 'false');
  challenge.layer.querySelector('.mvr-challenge-start')?.addEventListener('click', () => startBookingChallenge(challenge));
  challenge.layer.querySelector('.mvr-challenge-skip')?.addEventListener('click', () => {
    challenge.status = 'dismissed';
    hideBookingChallengeLayer(challenge);
    setLivePreviewActionsVisible(challenge.modal, true);
    trackReveal('BookingChallengeDismissed');
    trackJourney('JourneyBookingChallengeDismissed');
  });
  trackReveal('BookingChallengeShown');
  trackJourney('JourneyBookingChallengeShown', {
    bookingDomain: bookingDisplayDomain(),
  });
}

function completeBookingChallenge(challenge) {
  if (!challenge || challenge !== activeBookingChallenge) return;
  if (challenge.status !== 'running') {
    trackJourney('JourneyBookingPreviewCheckoutReached', {
      challengeRunning: false,
    });
    return;
  }
  const elapsedMs = Date.now() - challenge.startedAt;
  if (challenge.timerId) {
    window.clearInterval(challenge.timerId);
    challenge.timerId = 0;
  }
  challenge.status = 'completed';
  challenge.timer.hidden = true;
  setLivePreviewActionsVisible(challenge.modal, false);
  challenge.layer.innerHTML = `<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${esc(formatChallengeTime(elapsedMs))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`;
  challenge.layer.classList.add('is-visible');
  challenge.layer.setAttribute('aria-hidden', 'false');
  challenge.layer.querySelector('.mvr-challenge-edit')?.addEventListener('click', () => {
    hideBookingChallengeLayer(challenge);
    setLivePreviewMode(challenge.modal, 'edit', challenge.previewOpenedAt, 'challenge-completed');
  });
  challenge.layer.querySelector('.mvr-challenge-skip')?.addEventListener('click', () => {
    hideBookingChallengeLayer(challenge);
    setLivePreviewActionsVisible(challenge.modal, true);
  });
  trackReveal('BookingChallengeCheckoutReached', formatChallengeTime(elapsedMs));
  trackJourney('JourneyBookingChallengeCompleted', {
    elapsedMs,
    completedWithin60Seconds: elapsedMs <= 60000,
  }, { durationMs: elapsedMs });
}

function handleBookingPreviewMessage(event) {
  const messageType = event?.data?.type;
  if (
    messageType !== 'marketel:show-guest-app'
    && messageType !== 'marketel:continue-owner-tour'
    && messageType !== 'marketel:checkout-reached'
    && messageType !== 'marketel:editor-saved'
  ) return;
  const reveal = document.getElementById('marketelValueReveal');
  if (!reveal) return;
  const knownFrame = Array.from(reveal.querySelectorAll('iframe'))
    .some((frame) => frame.contentWindow === event.source);
  if (!knownFrame) return;
  if (messageType === 'marketel:editor-saved') {
    if (activeBookingChallenge?.iframe?.contentWindow !== event.source || livePreviewMode !== 'edit') return;
    if (event.data?.hotelName) crm.activeHotelName = String(event.data.hotelName);
    activeBookingChallenge.modal.dataset.editorSaved = '1';
    trackJourney('JourneyBookingPreviewEdited', {
      kind: String(event.data?.kind || 'booking-page'),
    });
    void loadRevealData();
    setLivePreviewMode(
      activeBookingChallenge.modal,
      'guest',
      activeBookingChallenge.previewOpenedAt,
      'saved-and-returned-to-booking-page'
    );
    showSavedPreviewConfirmation(activeBookingChallenge.modal);
    return;
  }
  if (messageType === 'marketel:checkout-reached') {
    if (activeBookingChallenge?.iframe?.contentWindow !== event.source || livePreviewMode !== 'guest') return;
    completeBookingChallenge(activeBookingChallenge);
    return;
  }
  if (activeBookingChallenge?.iframe?.contentWindow !== event.source) return;
  trackReveal('GuestAppPreviewRequestedFromBookingEngine');
  setLivePreviewMode(
    activeBookingChallenge.modal,
    'edit',
    activeBookingChallenge.previewOpenedAt,
    'booking-install-explainer-continued'
  );
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
  if (bookingPreviewUnavailable) {
    return '<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>';
  }
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
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${esc(bookingDisplayDomain())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${url
        ? `<iframe title="${esc(propertyName())} booking-page preview" src="${esc(url)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`
        : '<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${url ? 'View your booking page' : 'Check booking page preview'}" ${bookingPreviewUnavailable ? 'disabled' : ''}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <span class="mvr-expand-corners">
            <i class="is-top-left"></i><i class="is-top-right"></i>
            <i class="is-bottom-left"></i><i class="is-bottom-right"></i>
          </span>
          <strong>${bookingPreviewUnavailable ? 'Still publishing' : 'View your booking page'}</strong>
        </span>
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
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then continue to your Guest App and Front Desk.
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
  const releases = assistantNoResponseAction === 'release';
  return `<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>When a direct booking arrives, Front Desk asks you and the people you choose whether the room is still available. If a walk-in or another booking took it, reply normally and Marketel handles the rest.</p>
      <div class="mvr-callout">
        <strong>You stay in control—even when you miss the alert.</strong>
        Choose whether silence keeps the sale or protects availability. You can change the rule anytime.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-booking-alert">
        <div class="mvr-marketel-avatar">M</div>
        <div><span>Front Desk</span><strong>New ${esc(roomName)} booking</strong><small>Tomorrow · ${money(nightlyRate())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in" style="--stagger:0">Is ${esc(roomName)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out" style="--stagger:1">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success" style="--stagger:2"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-fallback-control">
        <strong>If nobody answers</strong>
        <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
          <button type="button" data-mvr-fallback="confirm" class="${releases ? '' : 'is-selected'}"><b>Keep the booking</b><span>Revenue first</span></button>
          <button type="button" data-mvr-fallback="release" class="${releases ? 'is-selected' : ''}"><b>Release request</b><span>Availability first</span></button>
        </div>
        <small>${releases
          ? 'Your rule: void the $1 hold and notify the guest if nobody replies.'
          : 'Your rule: confirm the booking automatically if nobody replies.'}</small>
      </div>
    </div>
  </section>`;
}

function finaleHtml() {
  const isSubscribed = crm.hotelSubscribed;
  const isYearly = billingInterval === 'year';
  const displayedPrice = isYearly ? '$1,990' : '$199';
  const displayedInterval = isYearly ? '/year' : '/month';
  const activationLabel = isYearly
    ? 'Activate Marketel — $1,990/year'
    : 'Activate Marketel — $199/month';
  const includedValueHtml = `<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
  </div>`;
  return `<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${isSubscribed ? 'Your Marketel system' : 'Ready to activate'}</div>
      <h1>${isSubscribed ? `${esc(propertyName())} is ready.` : `Marketel is ready for ${esc(propertyName())}.`}</h1>
      <p>${isSubscribed ? 'Your direct booking page, guest app and Front Desk work together as one system.' : 'Your booking page, guest app and Front Desk are ready.'}</p>
      ${isSubscribed ? `${includedValueHtml}
        <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">Open Front Desk</button>
        <div class="mvr-secure-note">You can replay this overview anytime from How it works.</div>` : `
        <div class="mvr-activation-decision">
          <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!isYearly}" class="${!isYearly ? 'is-active' : ''}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${isYearly}" class="${isYearly ? 'is-active' : ''}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
          </div>
          <div class="mvr-price"><strong>${displayedPrice}</strong><span>${displayedInterval}</span></div>
          <div class="mvr-price-detail${isYearly ? ' is-visible' : ''}">${isYearly ? 'Two months free · $398 saved' : '&nbsp;'}</div>
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${activationLabel}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${isYearly ? 'Cancel anytime. Renews yearly at $1,990 unless canceled.' : 'Cancel anytime. Renews monthly at $199 unless canceled.'}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
        </div>
        <div class="mvr-activation-proof">
          ${directBookingValueHtml()}
          <div class="mvr-included-label">Everything included</div>
          ${includedValueHtml}
        </div>`}
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
  if (currentStep === 0) {
    if (!bookingPreviewOpened && !bookingPreviewUnavailable) return '';
    return `<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">Continue to Guest App →</button>
    </div>`;
  }
  if (currentStep === 3) {
    return `<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;
  }
  const labels = [
    '',
    'See how Front Desk protects you',
    'Review plans and activation',
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
  if (document.getElementById('mvrLivePreview')) return;
  if (!url) {
    bookingPreviewUnavailable = true;
    trackJourney('JourneyBookingPreviewOpened', {
      mode: 'unavailable',
      bookingPageReady: false,
      bookingPageReason: bookingPageState.reason || 'missing-url',
    });
    renderReveal();
    return;
  }
  bookingPreviewOpened = true;
  livePreviewMode = 'guest';
  const previewOpenedAt = Date.now();
  const modal = document.createElement('div');
  modal.id = 'mvrLivePreview';
  modal.className = 'mvr-live-preview';
  modal.innerHTML = `<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${esc(bookingDisplayDomain())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${esc(propertyName())} live preview" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">Continue to Guest App</button>
  </div>`;
  document.getElementById('marketelValueReveal')?.appendChild(modal);
  const iframe = modal.querySelector('.mvr-live-stage > iframe');
  activeBookingChallenge = {
    modal,
    iframe,
    layer: modal.querySelector('.mvr-challenge-layer'),
    timer: modal.querySelector('.mvr-challenge-timer'),
    previewOpenedAt,
    status: 'waiting',
    hasPrompted: false,
    startedAt: 0,
    timerId: 0,
    promptFallbackId: 0,
    promptDelayId: 0,
  };
  activeBookingChallenge.promptFallbackId = window.setTimeout(() => {
    if (activeBookingChallenge?.modal !== modal || activeBookingChallenge.status !== 'waiting') return;
    setLivePreviewActionsVisible(modal, true);
  }, 4000);
  iframe?.addEventListener('load', () => {
    const challenge = activeBookingChallenge;
    if (challenge?.modal !== modal || livePreviewMode !== 'guest') return;
    if (challenge.promptDelayId) window.clearTimeout(challenge.promptDelayId);
    challenge.promptDelayId = window.setTimeout(() => {
      challenge.promptDelayId = 0;
      showBookingChallengePrompt(challenge);
    }, 1500);
  });
  modal.querySelector('#mvrClosePreview')?.addEventListener('click', () => {
    trackJourney('JourneyBookingPreviewModeChanged', {
      action: 'closed',
      mode: livePreviewMode,
    }, { durationMs: Date.now() - previewOpenedAt });
    stopBookingChallenge('preview-closed', true);
    activeBookingChallenge = null;
    modal.remove();
    renderReveal();
  });
  modal.querySelector('#mvrContinueGuestApp')?.addEventListener('click', () => {
    continueFromBookingPreview(modal, previewOpenedAt, 'continued-without-editor');
  });
  modal.querySelector('#mvrLiveForward')?.addEventListener('click', () => {
    if (livePreviewMode === 'guest') {
      setLivePreviewMode(modal, 'edit', previewOpenedAt, 'guided-forward');
      return;
    }
    setLivePreviewMode(modal, 'guest', previewOpenedAt, 'returned-to-booking-page');
  });
  trackReveal('BookingEngineFullPreviewOpened');
  trackJourney('JourneyBookingPreviewOpened', {
    mode: 'guest',
    bookingPageReady: !!bookingPageState.ready,
    bookingPageReason: bookingPageState.reason || '',
  });
}

function showSavedPreviewConfirmation(modal) {
  if (!modal?.isConnected) return;
  modal.querySelector('.mvr-live-saved-confirmation')?.remove();
  const confirmation = document.createElement('div');
  confirmation.className = 'mvr-live-saved-confirmation';
  confirmation.setAttribute('role', 'status');
  confirmation.innerHTML = '<span aria-hidden="true">✓</span><strong>Saved</strong><small>You’re viewing your changes.</small>';
  modal.querySelector('.mvr-live-stage')?.appendChild(confirmation);
  window.setTimeout(() => confirmation.remove(), 2600);
}

function continueFromBookingPreview(modal, previewOpenedAt, action) {
  if (!modal?.isConnected) return;
  trackJourney('JourneyRevealNavigation', {
    action,
    toStep: 1,
    editorViewed: livePreviewMode === 'edit',
  }, { durationMs: Date.now() - previewOpenedAt });
  stopBookingChallenge('continued-to-guest-app', false);
  activeBookingChallenge = null;
  modal.remove();
  moveToStep(1);
}

function setLivePreviewMode(modal, nextMode, previewOpenedAt, action = 'mode-selected') {
  if (!modal?.isConnected) return;
  if (nextMode === 'edit') stopBookingChallenge('edit-mode-selected', true);
  livePreviewMode = nextMode === 'edit' ? 'edit' : 'guest';
  const location = modal.querySelector('#mvrLiveLocation');
  const locationText = modal.querySelector('[data-live-location-text]');
  const forward = modal.querySelector('#mvrLiveForward');
  const continueGuestApp = modal.querySelector('#mvrContinueGuestApp');
  const forwardLong = modal.querySelector('[data-live-forward-long]');
  const forwardArrow = forward?.querySelector('b');
  location?.classList.toggle('is-editor', livePreviewMode === 'edit');
  if (locationText) locationText.textContent = livePreviewMode === 'edit' ? 'Front Desk editor' : bookingDisplayDomain();
  if (location) location.setAttribute('aria-label', livePreviewMode === 'edit' ? 'Front Desk editor' : 'Your live booking address');
  if (forwardLong) forwardLong.textContent = livePreviewMode === 'edit' ? 'Back to your booking page' : 'See how to edit your booking page';
  if (forwardArrow) forwardArrow.textContent = livePreviewMode === 'edit' ? '↩' : '→';
  if (forward) {
    forward.setAttribute('aria-label', livePreviewMode === 'edit' ? 'Back to your direct booking page' : 'See how you edit this booking page');
  }
  if (continueGuestApp) continueGuestApp.hidden = false;
  setLivePreviewActionsVisible(modal, true);
  const iframe = modal.querySelector('.mvr-live-stage > iframe');
  if (iframe) {
    iframe.title = livePreviewMode === 'edit'
      ? `${propertyName()} Front Desk editor`
      : `${propertyName()} booking-page preview`;
    if (livePreviewMode === 'edit') {
      iframe.src = frontdeskEditorUrl();
    } else {
      const guestUrl = new URL(bookingUrl());
      if (modal.dataset.editorSaved === '1') {
        guestUrl.searchParams.set('previewRefresh', String(Date.now()));
        delete modal.dataset.editorSaved;
      }
      iframe.src = guestUrl.toString();
    }
  }
  trackJourney('JourneyBookingPreviewModeChanged', {
    action,
    mode: livePreviewMode,
  }, { durationMs: Date.now() - previewOpenedAt });
  if (livePreviewMode === 'edit') trackReveal('BookingEngineEditPreviewViewed');
}

function moveToStep(nextStep) {
  clearGuestAppDemoSchedule();
  const previousStep = currentStep;
  const normalizedStep = Math.max(0, Math.min(3, nextStep));
  const now = Date.now();
  if (stageStartedAt && normalizedStep !== previousStep) {
    trackJourney('JourneyRevealStageCompleted', {
      revealStep: previousStep,
      stageName: ['booking-page', 'guest-app', 'front-desk-assistant', 'activation'][previousStep] || 'unknown',
      nextStep: normalizedStep,
      direction: normalizedStep > previousStep ? 'forward' : 'back',
    }, { durationMs: now - stageStartedAt });
  }
  currentStep = normalizedStep;
  stageStartedAt = now;
  persistStep();
  const events = [
    'BookingEngineRevealViewed',
    'GuestAppRevealViewed',
    'AssistantRevealViewed',
    'ActivationOfferViewed',
  ];
  trackReveal(events[currentStep]);
  trackJourney('JourneyRevealStageViewed', {
    resumed: nextStageViewIsResume,
    bookingPageReady: currentStep === 0 ? !!bookingPageState.ready : undefined,
  });
  nextStageViewIsResume = false;
  renderReveal();
  document.querySelector('.mvr-main')?.scrollTo({ top: 0, behavior: 'auto' });
}

function finishReveal() {
  if (stageStartedAt) {
    trackJourney('JourneyRevealStageCompleted', {
      action: 'reveal-finished',
      totalRevealMs: revealStartedAt ? Date.now() - revealStartedAt : null,
    }, { durationMs: Date.now() - stageStartedAt });
  }
  if (bookingPageTimer) {
    window.clearTimeout(bookingPageTimer);
    bookingPageTimer = 0;
  }
  stopBookingChallenge('reveal-finished', true);
  activeBookingChallenge = null;
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
    await window.goLive({ billingInterval });
  } finally {
    if (document.body.contains(button)) {
      button.disabled = false;
      button.textContent = billingInterval === 'year'
        ? 'Activate Marketel — $1,990/year'
        : 'Activate Marketel — $199/month';
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
  trackJourney('JourneyGuestAppDemo', {
    action: 'slide-viewed',
    slide: guestAppDemoSlide === 1 ? 'value' : 'install',
    manual: !!manual,
  });
}

function revealGuestAppValue(manual = false) {
  if (homeScreenInstalled || guestAppDemoSlide !== 0) return;
  clearGuestAppDemoSchedule();
  setGuestAppInstallVisual(true);
  if (manual) trackReveal('GuestAppInstallDemoClicked');
  trackJourney('JourneyGuestAppDemo', {
    action: 'install-demonstrated',
    manual: !!manual,
  });
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
  document.getElementById('mvrNext')?.addEventListener('click', () => {
    trackJourney('JourneyRevealNavigation', { action: 'next', toStep: currentStep + 1 });
    moveToStep(currentStep + 1);
  });
  document.getElementById('mvrBack')?.addEventListener('click', () => {
    trackJourney('JourneyRevealNavigation', { action: 'back', toStep: currentStep - 1 });
    moveToStep(currentStep - 1);
  });
  document.getElementById('mvrExpandPreview')?.addEventListener('click', showExpandedPreview);
  document.getElementById('mvrFinalCta')?.addEventListener('click', (event) => activateMarketel(event.currentTarget));
  document.querySelectorAll('[data-mvr-billing]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextInterval = button.dataset.mvrBilling === 'year' ? 'year' : 'month';
      if (nextInterval === billingInterval) return;
      billingInterval = nextInterval;
      try { localStorage.setItem(BILLING_KEY, billingInterval); } catch (_) {}
      trackReveal(nextInterval === 'year' ? 'YearlyBillingSelected' : 'MonthlyBillingSelected');
      trackJourney('JourneyBillingIntervalSelected', {
        billingInterval,
        price: billingInterval === 'year' ? 1990 : 199,
        currency: 'USD',
      });
      renderReveal();
    });
  });
  document.getElementById('mvrInstallDemo')?.addEventListener('click', () => {
    revealGuestAppValue(true);
  });
  document.querySelectorAll('[data-mvr-app-slide]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextSlide = Number(button.dataset.mvrAppSlide) === 1 ? 1 : 0;
      if (nextSlide !== guestAppDemoSlide) setGuestAppDemoSlide(nextSlide, true);
    });
  });
  document.querySelectorAll('[data-mvr-fallback]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.mvrFallback === 'release' ? 'release' : 'confirm';
      if (next === assistantNoResponseAction) return;
      assistantNoResponseAction = next;
      trackReveal(next === 'release' ? 'AssistantReleaseFallbackSelected' : 'AssistantKeepFallbackSelected');
      trackJourney('JourneyAssistantFallbackSelected', { noResponseAction: next });
      if (typeof window.api === 'function') {
        window.api('POST', '/api/crm/booking-approval', { noResponseAction: next }).catch(() => {});
      }
      renderReveal();
    });
  });
  scheduleGuestAppValueDemo();
}

async function loadRevealData() {
  if (dataPromise || typeof window.api !== 'function') return dataPromise;
  dataPromise = Promise.all([
    window.api('GET', '/api/crm/rooms'),
    window.api('GET', '/api/crm/booking-approval').catch(() => null),
  ])
    .then(([result, approvalResult]) => {
      revealData = {
        rooms: Array.isArray(result?.rooms) ? result.rooms : [],
        rates: result?.rates || null,
      };
      assistantNoResponseAction = approvalResult?.data?.noResponseAction === 'release' ? 'release' : 'confirm';
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
    if (bookingUrl()) bookingPreviewUnavailable = false;
    trackJourney('JourneyBookingPageStatus', {
      ready: bookingPageState.ready,
      reason: bookingPageState.reason,
      attempts: bookingPageState.attempts,
    });
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

  if (bookingUrl()) bookingPreviewUnavailable = false;

  trackJourney('JourneyBookingPageStatus', {
    ready: bookingPageState.ready,
    reason: bookingPageState.reason,
    attempts: bookingPageState.attempts,
  });

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
  let hadPendingReveal = false;
  try { storedStep = Number.parseInt(localStorage.getItem(STEP_KEY) || '0', 10); } catch (_) {}
  try { hadPendingReveal = localStorage.getItem(PENDING_KEY) === '1'; } catch (_) {}
  try { billingInterval = localStorage.getItem(BILLING_KEY) === 'year' ? 'year' : 'month'; } catch (_) { billingInterval = 'month'; }
  currentStep = Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(3, requestedStep))
    : Math.max(0, Math.min(3, Number.isFinite(storedStep) ? storedStep : 0));
  if (crm.hotelSubscribed && currentStep === 3) currentStep = 0;
  livePreviewMode = 'guest';
  homeScreenInstalled = false;
  guestAppDemoSlide = 0;
  bookingPreviewOpened = false;
  bookingPreviewUnavailable = false;
  revealStartedAt = Date.now();
  stageStartedAt = 0;
  nextStageViewIsResume = !Number.isFinite(requestedStep) && hadPendingReveal;
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
  trackJourney('JourneyRevealStarted', {
    startStep: currentStep,
    replay: !!crm.hotelSubscribed,
    pendingResume: nextStageViewIsResume,
  });
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
