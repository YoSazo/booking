import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';
import assistantAlertStackUrl from './assets/assistant-alert-stack.webp';
import assistantBookingRequestUrl from './assets/assistant-booking-request.webp';
import assistantTextResolutionUrl from './assets/assistant-text-resolution.webp';
import bookingPageStudios17Url from './assets/booking-page-studios17.webp';
import frontdeskYourPageUrl from './assets/frontdesk-your-page.webp';
import frontdeskBookingsUrl from './assets/frontdesk-bookings.webp';
import frontdeskAvailabilityUrl from './assets/frontdesk-availability.webp';
import frontdeskGuestAppUrl from './assets/frontdesk-guest-app.webp';
import guestelHotelsUrl from './assets/guestel-hotels.webp';
import guestelChooseRoomUrl from './assets/guestel-choose-room.webp';
import guestelChatUrl from './assets/guestel-chat.webp';
import guestelAddBookingPageUrl from './assets/guestel-add-booking-page.webp';
import guestelAppClipCardUrl from './assets/guestel-app-clip-card.webp';
import guestelAppClipInviteUrl from './assets/guestel-app-clip-invite.webp';
import guestelPropertySavedUrl from './assets/guestel-property-saved.webp';
import guestelWalletReadyUrl from './assets/guestel-wallet-ready.webp';

// The owner reaches these carousels only after inspecting the live booking
// page, which gives us a useful preload window. Warm every carousel screenshot
// as soon as this reveal chunk is requested so changing slides is a transition,
// not the moment the browser starts fetching or decoding the next screen.
const CAROUSEL_SCREEN_URLS = [
  frontdeskYourPageUrl,
  frontdeskBookingsUrl,
  frontdeskAvailabilityUrl,
  frontdeskGuestAppUrl,
  guestelHotelsUrl,
  guestelChooseRoomUrl,
  guestelChatUrl,
  guestelAddBookingPageUrl,
  guestelAppClipCardUrl,
  guestelAppClipInviteUrl,
  guestelPropertySavedUrl,
  guestelWalletReadyUrl,
  assistantAlertStackUrl,
  assistantTextResolutionUrl,
  assistantBookingRequestUrl,
  bookingPageStudios17Url,
];
const carouselImageWarmups = new Map();

function preloadCarouselScreens() {
  if (typeof Image === 'undefined' || carouselImageWarmups.size) return;
  CAROUSEL_SCREEN_URLS.forEach((url) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = url;
    carouselImageWarmups.set(url, image);
    if (typeof image.decode === 'function') image.decode().catch(() => {});
  });
}

preloadCarouselScreens();

const PENDING_KEY = 'marketelValueRevealPendingV1';
const STEP_KEY = 'marketelValueRevealStepV1';
const BILLING_KEY = 'marketelBillingIntervalV1';

let currentStep = 0;
let livePreviewMode = 'guest';
let revealData = { rooms: [], rates: null };
let dataPromise = null;
let bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
// Sticky once a status check has actually come back negative. The check retries
// every six seconds, and without this the stage would swing between "online"
// and "publishing" on every attempt.
let bookingPageCheckFailed = false;
let bookingPageTimer = 0;
let revealOpening = false;
// Which beat each beat-driven stage is showing. Keyed by reveal step.
let stageBeatIndex = { 1: 0, 2: 0 };
// The app proof is deliberately optional exploration inside each beat. Keeping
// its position separate from the funnel beat means someone can inspect every
// screen or move to the next subject after seeing only one.
let appCarouselIndex = { frontdesk: 0, guestelInstall: 0, guestel: 0, assistant: 0, system: 0 };
let revealStartedAt = 0;
let stageStartedAt = 0;
let billingInterval = 'month';
let activationNightlyRate = null;
let activationPreviewMode = false;
let activeBookingChallenge = null;
let bookingPreviewOpened = false;
let bookingPreviewUnavailable = false;
// Saving in the editor returns to the booking page to show the highlighted
// change, so mode alone can't drive the CTA — it would offer "edit" a second
// time. Once the editor has been seen, the only way on is the Guestel stage.
let bookingEditorVisited = false;
let nextStageViewIsResume = false;


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

// The earlier Guestel chapter uses the saved setup rate. The activation screen
// has its own editable calculator below because an owner may have skipped that
// field or may want to test a different room rate before paying.
function breakEvenEstimate() {
  const rate = Number(revealData.rates?.nightly);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const commissionPerNight = rate * 0.15;
  const roomNights = Math.max(1, Math.ceil(199 / commissionPerNight));
  return { rate, roomNights, savings: commissionPerNight * roomNights };
}

function normalizedActivationRate(value, fallback = 99) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(5000, Math.max(25, Math.round(numeric * 100) / 100));
}

function currentActivationRate() {
  const savedRate = normalizedActivationRate(revealData.rates?.nightly, 99);
  return normalizedActivationRate(activationNightlyRate, savedRate);
}

function activationBreakEven(rate = currentActivationRate()) {
  const normalizedRate = normalizedActivationRate(rate);
  const monthlyCost = billingInterval === 'year' ? 1990 / 12 : 199;
  const commissionPerNight = normalizedRate * 0.15;
  const roomNights = Math.max(1, Math.ceil(monthlyCost / commissionPerNight));
  return { rate: normalizedRate, roomNights };
}

function activationRateCalculatorHtml() {
  const { rate, roomNights } = activationBreakEven();
  const unit = roomNights === 1 ? 'room-night' : 'room-nights';
  const result = billingInterval === 'year'
    ? 'per month could cover the yearly plan.'
    : 'could cover one month of Marketel.';
  return `<div class="mvr-rate-calculator">
    <div class="mvr-rate-heading"><span>Your nightly rate</span><small>Adjust it</small></div>
    <div class="mvr-rate-stepper" role="group" aria-label="Nightly room rate">
      <button type="button" data-mvr-rate-step="-5" aria-label="Lower nightly rate by five dollars">−</button>
      <label><span>$</span><input type="number" id="mvrActivationRate" min="25" max="5000" step="1" inputmode="decimal" value="${rate}" aria-label="Nightly room rate in dollars"></label>
      <button type="button" data-mvr-rate-step="5" aria-label="Raise nightly rate by five dollars">+</button>
    </div>
    <div class="mvr-rate-result" aria-live="polite">
      <strong id="mvrBreakEvenNights">${roomNights} direct ${unit}</strong>
      <span id="mvrBreakEvenContext">${result}</span>
    </div>
    <small>Estimate uses a 15% OTA commission. Actual savings depend on your rates and channels.</small>
  </div>`;
}

function directBookingProofHtml() {
  return `<div class="mvr-direct-proof">
    <strong>$5,800 booked direct</strong>
    <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
  </div>`;
}

// Safari has no field-sizing: content, so the input cannot shrink to its digits
// on its own. Setting the width from the digit count keeps the $ and the number
// together as one centred figure instead of leaving a gap between them.
function sizeRateInput(input) {
  if (!input) return;
  const digits = String(input.value ?? '').replace(/[^\d]/g, '').length;
  input.style.width = Math.min(5, Math.max(2, digits)) + 'ch';
}

function updateActivationRateCalculator(value, options = {}) {
  const rate = normalizedActivationRate(value, currentActivationRate());
  activationNightlyRate = rate;
  const { roomNights } = activationBreakEven(rate);
  const input = document.getElementById('mvrActivationRate');
  const nights = document.getElementById('mvrBreakEvenNights');
  const context = document.getElementById('mvrBreakEvenContext');
  if (options.syncInput !== false && input) input.value = String(rate);
  sizeRateInput(input);
  if (nights) nights.textContent = `${roomNights} direct ${roomNights === 1 ? 'room-night' : 'room-nights'}`;
  if (context) {
    context.textContent = billingInterval === 'year'
      ? 'per month could cover the yearly plan.'
      : 'could cover one month of Marketel.';
  }
  if (options.track) {
    trackJourney('JourneyControlActivated', {
      controlName: 'activation-nightly-rate',
      nightlyRate: rate,
      breakEvenRoomNights: roomNights,
      billingInterval,
    });
  }
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

function challengeSeconds(elapsedMs) {
  return Math.max(0, Math.floor(Number(elapsedMs || 0) / 1000));
}

// The dial counts straight up in seconds — 01, 02 … 60, 61 — rather than
// rolling over to mm:ss, so a sub-minute checkout reads as one number.
function formatChallengeTicks(elapsedMs) {
  return String(challengeSeconds(elapsedMs)).padStart(2, '0');
}

function formatChallengeTime(elapsedMs) {
  return `${challengeSeconds(elapsedMs)}s`;
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
  challenge.timer?.classList.remove('is-live');
  if (challenge.status === 'running') challenge.status = 'abandoned';
  hideBookingChallengeLayer(challenge);
}

function updateBookingChallengeTimer(challenge) {
  if (!challenge || challenge.status !== 'running' || !challenge.timer) return;
  const elapsedMs = Date.now() - challenge.startedAt;
  const time = challenge.timer.querySelector('[data-challenge-time]');
  if (time) time.textContent = formatChallengeTicks(elapsedMs);
  challenge.timer.classList.toggle('is-over-minute', elapsedMs >= 60000);
}

function startBookingChallenge(challenge) {
  if (!challenge || challenge !== activeBookingChallenge || challenge.status !== 'prompted') return;
  challenge.status = 'running';
  challenge.startedAt = Date.now();
  hideBookingChallengeLayer(challenge);
  setLivePreviewActionsVisible(challenge.modal, true);
  challenge.timer.classList.add('is-live');
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
  challenge.timer.classList.remove('is-live');
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
    const changedFields = Array.isArray(event.data?.changedFields)
      ? event.data.changedFields.map((field) => String(field))
      : [];
    const kind = String(event.data?.kind || 'booking-page');
    let highlightTarget = 'header';
    if (kind === 'header') {
      const exactHeaderTargets = new Set(['name', 'subtitle', 'address', 'phone']);
      highlightTarget = changedFields.length === 1 && exactHeaderTargets.has(changedFields[0])
        ? `header-${changedFields[0]}`
        : 'header';
    } else if (kind.includes('photo')) {
      highlightTarget = 'room-photo';
    } else if (kind === 'room') {
      highlightTarget = 'room';
    } else if (kind === 'checkout-policy') {
      highlightTarget = 'checkout-policy';
      activeBookingChallenge.modal.dataset.editorPreviewTarget = 'checkout';
    }
    activeBookingChallenge.modal.dataset.editorHighlight = highlightTarget;
    if (event.data?.roomId) {
      activeBookingChallenge.modal.dataset.editorHighlightRoom = String(event.data.roomId);
    } else {
      delete activeBookingChallenge.modal.dataset.editorHighlightRoom;
    }
    trackJourney('JourneyBookingPreviewEdited', {
      kind,
      changedFields,
      highlightTarget,
    });
    void loadRevealData();
    setLivePreviewMode(
      activeBookingChallenge.modal,
      'guest',
      activeBookingChallenge.previewOpenedAt,
      'saved-and-returned-to-booking-page'
    );
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
  const labels = ['Booking page', 'Your apps', 'Front Desk', crm.hotelSubscribed ? 'Complete' : 'Activate'];
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

// The wildcard guest domain serves a property the moment its row exists, so the
// page is already live by the time the reveal opens — the status check only
// confirms it. Showing "publishing" until that check returns made stage 0 paint
// twice, and the second paint replaces the subtree and reloads the preview
// frame, which is the rebuild owners see. So the stage opens in its finished
// state and steps back only if a check actually disagrees.
function bookingPageLooksReady() {
  if (bookingPreviewUnavailable) return false;
  if (bookingPageState.reason === 'deployment-disabled') return false;
  if (bookingPageCheckFailed && !bookingPageState.ready) return false;
  return !!bookingUrl();
}

function bookingPageStatusHtml() {
  if (bookingPageLooksReady()) {
    return `<div class="mvr-page-status is-ready"><span>✓</span>${bookingPageState.reason === 'local'
      ? 'Local guest preview connected'
      : 'Your live guest page is online'}</div>`;
  }
  if (bookingPreviewUnavailable) {
    return '<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>';
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
        ? `<iframe title="${esc(propertyName())} booking-page preview" src="${esc(url)}" tabindex="-1" aria-hidden="true" scrolling="no" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`
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
        Open the booking page built for your property. Then see how Front Desk runs it and Guestel keeps guests coming back.
      </div>
      ${bookingPageStatusHtml()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${bookingPreviewCardHtml()}
    </div>
  </section>`;
}


function guestAppRevealHtml() {
  return beatStageHtml(
    'mvr-stage-app',
    '2 · Your app and theirs',
    guestAppBeats(),
    stageBeatIndex[1] || 0
  );
}

// These are real screens, not feature illustrations. The active screen comes
// forward while the neighboring screens remain visible behind it, making the
// breadth of each app obvious without forcing seven separate funnel steps.
function appShowcases() {
  const estimate = breakEvenEstimate();
  const rebookBody = estimate
    ? `They save your property and book direct again. About ${estimate.roomNights} room-night${estimate.roomNights === 1 ? '' : 's'} could cover Marketel.`
    : 'They save your property, book direct again and message you in Guestel.';
  return {
    frontdesk: {
      id: 'frontdesk',
      eyebrow: 'CONTROL YOUR ENGINE',
      title: 'Control your engine from one app.',
      body: 'Your page, bookings, rooms and guest reach all live in Front Desk.',
      slides: [
        {
          label: 'Your Page',
          url: frontdeskYourPageUrl,
          width: 900,
          height: 1721,
          alt: 'Marketel Front Desk Your Page showing the live booking-page editor.',
          event: 'GuestAppOwnerEditorViewed',
        },
        {
          label: 'Bookings',
          url: frontdeskBookingsUrl,
          width: 900,
          height: 1728,
          alt: 'Marketel Front Desk Bookings showing a complete reservation and availability decision.',
        },
        {
          label: 'Availability',
          url: frontdeskAvailabilityUrl,
          width: 900,
          height: 1734,
          alt: 'Marketel Front Desk Availability showing a room calendar and remaining inventory.',
        },
        {
          label: 'Guest Reach',
          url: frontdeskGuestAppUrl,
          width: 900,
          height: 1734,
          alt: 'Marketel Front Desk Guest Reach showing a live guest notification preview and composer.',
        },
      ],
    },
    guestelInstall: {
      id: 'guestelInstall',
      eyebrow: 'HOW GUESTS ADD YOU',
      title: 'One tap keeps your property on their phone.',
      body: 'They tap Add on your booking page, open Apple\'s instant App Clip, and keep your property, their stay and a direct way back in Guestel.',
      slides: [
        {
          label: 'Tap Add',
          url: guestelAddBookingPageUrl,
          width: 900,
          height: 1786,
          alt: 'The Studios 17 booking page showing the Add control that starts the Guestel handoff.',
        },
        {
          label: 'Open Guestel',
          url: guestelAppClipCardUrl,
          width: 900,
          height: 1786,
          alt: 'Apple\'s Guestel App Clip card opening over the property booking page.',
        },
        {
          label: 'See the Benefits',
          url: guestelAppClipInviteUrl,
          width: 900,
          height: 1787,
          alt: 'The personalized Guestel invitation explaining direct rates, property messaging and faster rebooking.',
        },
        {
          label: 'Save the Property',
          url: guestelPropertySavedUrl,
          width: 900,
          height: 1787,
          alt: 'Studios 17 saved to Guestel with direct rates, Front Desk messaging and faster rebooking enabled.',
        },
        {
          label: 'Kept for Next Time',
          url: guestelWalletReadyUrl,
          width: 900,
          height: 1787,
          alt: 'The completed Guestel hotel wallet with Studios 17 kept for the guest\'s next direct stay.',
        },
      ],
    },
    guestel: {
      id: 'guestel',
      eyebrow: 'KEEP YOUR GUESTS',
      title: 'Keep every guest one tap away.',
      body: rebookBody,
      slides: [
        {
          label: 'Your Hotels',
          url: guestelHotelsUrl,
          width: 900,
          height: 1764,
          alt: 'Guestel Your Hotels showing an upcoming stay and the property saved for direct rebooking.',
          event: 'GuestelWalletViewed',
        },
        {
          label: 'Book Again',
          url: guestelChooseRoomUrl,
          width: 900,
          height: 1764,
          alt: 'Guestel showing a property room picker and direct stay dates.',
        },
        {
          label: 'Messages',
          url: guestelChatUrl,
          width: 900,
          height: 1762,
          alt: 'Guestel Messages showing a direct conversation between a guest and the property Front Desk.',
          event: 'GuestelReachViewed',
        },
      ],
    },
    assistant: {
      id: 'assistant',
      eyebrow: 'PROTECT YOUR SETUP',
      title: 'Nothing slips through the cracks.',
      body: 'The moment a request lands, Front Desk alerts you three ways — Live Activity, text, and push. Reply in plain words or tap once in the app, and it checks the request and updates availability for you.',
      slides: [
        {
          label: 'Booking Alert',
          url: assistantAlertStackUrl,
          width: 900,
          height: 1748,
          alt: 'A Marketel booking request reaching the owner through a Front Desk Live Activity, text message and push notification.',
        },
        {
          label: 'Reply by Text',
          url: assistantTextResolutionUrl,
          width: 780,
          height: 1528,
          alt: 'A real text conversation where an owner tells Marketel a walk-in took the room, and Front Desk handles the online request and availability.',
          event: 'AssistantTextProofViewed',
        },
        {
          label: 'Answer in App',
          url: assistantBookingRequestUrl,
          width: 780,
          height: 1528,
          alt: 'A Marketel Front Desk booking request with a push notification and buttons to keep or release the booking.',
          event: 'AssistantAppProofViewed',
        },
      ],
    },
    system: {
      id: 'system',
      eyebrow: 'THE COMPLETE LOOP',
      title: 'The full direct-booking loop.',
      body: 'Your page converts. Front Desk runs it. Guestel keeps them forever.',
      compact: true,
      slides: [
        {
          label: 'Booking Page',
          url: bookingPageStudios17Url,
          width: 900,
          height: 1724,
          alt: 'The Studios 17 direct booking page showing its property details, room and Add control.',
        },
        {
          label: 'Front Desk',
          url: frontdeskYourPageUrl,
          width: 900,
          height: 1721,
          alt: 'Marketel Front Desk showing the page editor used to run the property.',
        },
        {
          label: 'Guestel',
          url: guestelHotelsUrl,
          width: 900,
          height: 1764,
          alt: 'Guestel showing the property kept in the guest’s hotel wallet.',
        },
      ],
    },
  };
}

function carouselPosition(index, active, length) {
  if (index === active) return 'is-active';
  if (length === 2) return 'is-next';
  if (index === (active - 1 + length) % length) return 'is-prev';
  if (index === (active + 1) % length) return 'is-next';
  return 'is-far';
}

function appCarouselHtml(showcase) {
  const active = Math.max(0, Math.min(showcase.slides.length - 1, appCarouselIndex[showcase.id] || 0));
  const subject = {
    frontdesk: 'Front Desk screen',
    guestelInstall: 'Guestel setup step',
    guestel: 'Guestel screen',
    assistant: 'Front Desk response',
    system: 'Marketel system screen',
  }[showcase.id] || 'screen';
  return `<div class="mvr-coverflow${showcase.compact ? ' is-system' : ''}" data-mvr-carousel="${showcase.id}" data-active="${active}">
    <div class="mvr-coverflow-viewport" tabindex="0" role="group" aria-label="Explore ${esc(showcase.title)}">
      ${showcase.slides.map((slide, index) => `<button type="button" class="mvr-coverflow-card ${carouselPosition(index, active, showcase.slides.length)}" style="aspect-ratio:${slide.width}/${slide.height}" data-carousel-slide="${index}" aria-label="View ${esc(slide.label)}" aria-pressed="${index === active ? 'true' : 'false'}">
        <img src="${slide.url}" width="${slide.width}" height="${slide.height}" loading="eager" decoding="async" alt="${esc(slide.alt)}">
      </button>`).join('')}
    </div>
    <div class="mvr-coverflow-controls">
      <button type="button" class="mvr-coverflow-arrow" data-carousel-prev aria-label="Previous ${esc(subject)}">‹</button>
      <span class="mvr-coverflow-dots" role="group" aria-label="Choose a screen">
        ${showcase.slides.map((slide, index) => `<button type="button" data-carousel-dot="${index}" class="${index === active ? 'is-active' : ''}" aria-label="${esc(slide.label)}" aria-current="${index === active ? 'true' : 'false'}"></button>`).join('')}
      </span>
      <button type="button" class="mvr-coverflow-arrow" data-carousel-next aria-label="Next ${esc(subject)}">›</button>
    </div>
  </div>`;
}

function guestAppBeats() {
  const showcases = appShowcases();
  return [
    {
      next: 'See how guests add you',
      event: 'GuestAppOwnerEditorViewed',
      carousel: showcases.frontdesk,
    },
    {
      next: 'See what Guestel does next',
      event: 'GuestelInstallFlowViewed',
      carousel: showcases.guestelInstall,
    },
    {
      next: 'See how Front Desk protects you',
      event: 'GuestelWalletViewed',
      carousel: showcases.guestel,
    },
  ];
}

// The assistant's two response surfaces belong to one idea, so they swipe
// inside one beat. The second beat then closes the story with the complete
// booking-page → Front Desk → Guestel loop.
function assistantBeats() {
  const showcases = appShowcases();
  return [
    {
      next: 'See the complete loop',
      event: 'AssistantTextProofViewed',
      carousel: showcases.assistant,
    },
    {
      next: 'Review plans and activation',
      event: 'MarketelSystemViewed',
      systemShowcase: true,
      carousel: showcases.system,
    },
  ];
}

function stageBeats(step = currentStep) {
  if (step === 1) return guestAppBeats();
  if (step === 2) return assistantBeats();
  return null;
}

// A proof may carry one frame or a pair. A pair cross-fades on its own so the
// beat can show both halves of a loop — sent and received, stay and rebook —
// without a second control competing with the footer.
function proofFrames(proof) {
  if (!proof) return [];
  return proof.frames || [{ url: proof.url, alt: proof.alt }];
}

function beatStageHtml(stageClass, eyebrow, beats, index) {
  const beat = beats[Math.max(0, Math.min(beats.length - 1, index))] || beats[0];
  const carousel = beat.carousel;
  const frames = proofFrames(beat.proof);
  const paired = frames.length > 1;
  return `<section class="mvr-stage mvr-stage-beats ${stageClass}${beat.systemShowcase ? ' is-system-showcase' : ''}">
    <div class="mvr-beat-band">
      <div class="mvr-eyebrow">${carousel ? carousel.eyebrow : eyebrow}</div>
      <h1 class="mvr-beat-title"${carousel ? ' data-carousel-title' : ''}>${carousel ? carousel.title : beat.title}</h1>
      <p class="mvr-beat-body"${carousel ? ' data-carousel-body' : ''}>${carousel ? carousel.body : beat.body}</p>
    </div>
    <div class="mvr-beat-stage">
      ${carousel ? appCarouselHtml(carousel) : beat.proof ? `<figure class="mvr-beat-proof${paired ? ' is-paired' : ''}">
        ${frames.map((frame, i) => `<img class="mvr-beat-frame${i === 0 ? ' is-active' : ''}" src="${frame.url}" width="780" height="1528" decoding="async" alt="${esc(frame.alt)}">`).join('')}
        ${paired ? `<span class="mvr-beat-frame-dots" aria-hidden="true">${frames.map((_, i) => `<i${i === 0 ? ' class="is-active"' : ''}></i>`).join('')}</span>` : ''}
      </figure>` : `<div class="mvr-beat-settings">${beat.render ? beat.render() : ''}</div>`}
    </div>
  </section>`;
}

// The first swap comes fast so a paired beat announces itself before she taps
// on; after that it settles into a slower loop that is readable rather than busy.
const BEAT_FRAME_FIRST_MS = 850;
const BEAT_FRAME_MS = 2600;
let beatFrameTimer = 0;
let beatFrameDelay = 0;

function clearBeatFrames() {
  if (beatFrameTimer) {
    window.clearInterval(beatFrameTimer);
    beatFrameTimer = 0;
  }
  if (beatFrameDelay) {
    window.clearTimeout(beatFrameDelay);
    beatFrameDelay = 0;
  }
}

// Runs after every render; a paired proof advances itself and loops. Restarting
// from scratch each render is what keeps the timer from outliving its beat.
function startBeatFrames() {
  clearBeatFrames();
  const figure = document.querySelector('.mvr-beat-proof.is-paired');
  if (!figure) return;
  const frames = [...figure.querySelectorAll('.mvr-beat-frame')];
  const dots = [...figure.querySelectorAll('.mvr-beat-frame-dots i')];
  if (frames.length < 2) return;
  let shown = 0;
  const advance = () => {
    if (!figure.isConnected) return clearBeatFrames();
    shown = (shown + 1) % frames.length;
    frames.forEach((frame, i) => frame.classList.toggle('is-active', i === shown));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === shown));
    return undefined;
  };
  beatFrameDelay = window.setTimeout(() => {
    beatFrameDelay = 0;
    advance();
    beatFrameTimer = window.setInterval(advance, BEAT_FRAME_MS);
  }, BEAT_FRAME_FIRST_MS);
}

function setAppCarouselSlide(root, requestedIndex, manual = false) {
  if (!root?.isConnected) return;
  const showcase = appShowcases()[root.dataset.mvrCarousel];
  if (!showcase) return;
  const length = showcase.slides.length;
  const active = ((Number(requestedIndex) || 0) % length + length) % length;
  const previous = appCarouselIndex[showcase.id] || 0;
  appCarouselIndex[showcase.id] = active;
  root.dataset.active = String(active);
  root.querySelectorAll('[data-carousel-slide]').forEach((card) => {
    const index = Number(card.dataset.carouselSlide);
    card.classList.remove('is-active', 'is-prev', 'is-next', 'is-far');
    card.classList.add(carouselPosition(index, active, length));
    card.setAttribute('aria-pressed', index === active ? 'true' : 'false');
    card.tabIndex = index === active ? 0 : -1;
  });
  root.querySelectorAll('[data-carousel-dot]').forEach((dot) => {
    const selected = Number(dot.dataset.carouselDot) === active;
    dot.classList.toggle('is-active', selected);
    dot.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  const slide = showcase.slides[active];
  const title = root.closest('.mvr-stage')?.querySelector('[data-carousel-title]');
  const body = root.closest('.mvr-stage')?.querySelector('[data-carousel-body]');
  if (title) title.textContent = showcase.title;
  if (body) body.textContent = showcase.body;
  if (!manual || active === previous) return;
  if (slide.event) trackReveal(slide.event);
  trackJourney('JourneyAppCarouselSlideViewed', {
    showcase: showcase.id,
    slide: active,
    screen: slide.label,
  });
}

function bindAppCarousels() {
  document.querySelectorAll('[data-mvr-carousel]').forEach((root) => {
    const showcase = appShowcases()[root.dataset.mvrCarousel];
    if (!showcase) return;
    const active = () => appCarouselIndex[showcase.id] || 0;
    let suppressCardClickUntil = 0;
    root.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
      setAppCarouselSlide(root, active() - 1, true);
    });
    root.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
      setAppCarouselSlide(root, active() + 1, true);
    });
    root.querySelectorAll('[data-carousel-slide]').forEach((card) => {
      card.addEventListener('click', () => {
        if (performance.now() < suppressCardClickUntil) return;
        setAppCarouselSlide(root, Number(card.dataset.carouselSlide), true);
      });
    });
    root.querySelectorAll('[data-carousel-dot]').forEach((dot) => {
      dot.addEventListener('click', () => setAppCarouselSlide(root, Number(dot.dataset.carouselDot), true));
    });
    const viewport = root.querySelector('.mvr-coverflow-viewport');
    viewport?.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setAppCarouselSlide(root, active() + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    let startX = null;
    viewport?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      startX = event.clientX;
    });
    viewport?.addEventListener('pointerup', (event) => {
      if (startX == null) return;
      const distance = event.clientX - startX;
      startX = null;
      if (Math.abs(distance) < 34) return;
      // A pointer gesture can still synthesize a click on the card it began
      // over. Suppress only that trailing click or it would undo the swipe.
      suppressCardClickUntil = performance.now() + 260;
      setAppCarouselSlide(root, active() + (distance < 0 ? 1 : -1), true);
    });
    viewport?.addEventListener('pointercancel', () => { startX = null; });
  });
}

function setStageBeat(nextBeat, manual = false) {
  const beats = stageBeats();
  if (!beats) return;
  const clamped = Math.max(0, Math.min(beats.length - 1, Number(nextBeat) || 0));
  if (clamped === (stageBeatIndex[currentStep] || 0)) return;
  stageBeatIndex[currentStep] = clamped;
  renderReveal();
  document.querySelector('.mvr-main')?.scrollTo({ top: 0, behavior: 'auto' });
  if (!manual) return;
  const beat = beats[clamped];
  if (beat.event) trackReveal(beat.event);
  trackJourney('JourneyRevealBeatViewed', { revealStep: currentStep, beat: clamped });
}

function assistantRevealHtml() {
  return beatStageHtml(
    'mvr-stage-assistant',
    '3 · Marketel Front Desk',
    assistantBeats(),
    stageBeatIndex[2] || 0
  );
}

function finaleHtml() {
  const isSubscribed = crm.hotelSubscribed && !activationPreviewMode;
  const isYearly = billingInterval === 'year';
  const displayedPrice = isYearly ? '$1,990' : '$199';
  const displayedInterval = isYearly ? '/year' : '/month';
  const activationLabel = isYearly
    ? 'Activate Marketel — $1,990/year'
    : 'Activate Marketel — $199/month';
  const includedValueHtml = `<div class="mvr-value-list">
    <div style="--stagger:0"><span>1</span><p><strong>Direct Booking Page</strong><small>Take bookings on your own page without OTA commission</small></p></div>
    <div style="--stagger:1"><span>2</span><p><strong>Marketel Front Desk</strong><small>Control bookings and availability around the setup you already use</small></p></div>
    <div style="--stagger:2"><span>3</span><p><strong>Guestel</strong><small>Keep repeat direct bookings and guest messages one tap away</small></p></div>
  </div>`;
  return `<section class="mvr-stage mvr-stage-finale">
    <button type="button" class="mvr-finale-back" id="mvrBack">← Back</button>
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${isSubscribed ? 'Your Marketel system' : 'Ready to activate'}</div>
      <h1>${isSubscribed ? `${esc(propertyName())} is ready.` : `Marketel is ready for ${esc(propertyName())}.`}</h1>
      <p>Take direct bookings without OTA commission, stay in control of availability, and give every guest a direct way back.</p>
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
          ${activationRateCalculatorHtml()}
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${activationLabel}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${isYearly ? 'Cancel anytime. Renews yearly at $1,990 unless canceled.' : 'Cancel anytime. Renews monthly at $199 unless canceled.'}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
          <button type="button" id="mvrAskBeforeActivating" style="display:block;margin:10px auto 0;padding:8px 10px;border:0;background:transparent;color:#2E7D5B;font:inherit;font-size:12px;font-weight:750;cursor:pointer;">Question before activating? Message Salah</button>
        </div>
        <div class="mvr-activation-proof">
          ${directBookingProofHtml()}
          <div class="mvr-included-label">Three things you're activating</div>
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
      <button type="button" class="mvr-primary" id="mvrNext">See your Front Desk app →</button>
    </div>`;
  }
  // The activation screen carries its own Back pill so the page can run the
  // full height. A footer row here cropped the card at a hard edge, which read
  // as the end of the content and hid the fact that it scrolls.
  if (currentStep === 3) return '';
  // One forward affordance for the whole reveal. Inside the Assistant stage it
  // walks the beats before advancing the stage, so the progress bar never lies
  // and there is never a second "next" competing with this one.
  const beats = stageBeats();
  const label = beats
    ? (beats[stageBeatIndex[currentStep] || 0] || beats[0]).next
    : 'See how Front Desk protects you';
  return `<div class="mvr-footer">
    ${currentStep > 0 ? '<button type="button" class="mvr-back" id="mvrBack">← Back</button>' : '<span></span>'}
    <button type="button" class="mvr-primary" id="mvrNext">${label} →</button>
  </div>`;
}

// Stage 0 embeds a live iframe of the booking page, and this function replaces
// the whole subtree — so every redundant render tore that frame down and made
// the page load again. Boot fires several renders (data load, status checks),
// which is the visible "refreshes itself three times". Skipping renders whose
// output is byte-identical keeps the frame alive.
let lastRenderedRevealHtml = '';
let lastRenderedStep = -1;
let lastRenderedBeat = -1;

function renderReveal() {
  const root = document.getElementById('marketelValueReveal');
  if (!root) return;
  const nextHtml = `<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${progressHtml()}
    </header>
    <main class="mvr-main">${stepHtml()}</main>
    ${footerHtml()}
  </div>`;
  if (nextHtml === lastRenderedRevealHtml && root.firstElementChild) return;
  // Entrance animations belong to moving through the reveal, not to content
  // arriving. Boot re-renders when the property name and the page status land,
  // and replaying the stage slide each time reads as the page rebuilding itself.
  const beatNow = stageBeatIndex[currentStep] || 0;
  const advanced = currentStep !== lastRenderedStep || beatNow !== lastRenderedBeat;
  root.classList.toggle('mvr-no-enter', !advanced && lastRenderedStep !== -1);
  lastRenderedStep = currentStep;
  lastRenderedBeat = beatNow;
  lastRenderedRevealHtml = nextHtml;
  root.innerHTML = nextHtml;
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
      <span class="mvr-challenge-timer" aria-live="polite" aria-label="Seconds elapsed">
        <strong data-challenge-time>00</strong>
      </span>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe data-preview-frame="guest" title="${esc(propertyName())} live preview" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <iframe data-preview-frame="editor" title="${esc(propertyName())} Front Desk editor" hidden sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-back" id="mvrLiveBack" hidden>← Back</button>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how you edit it in Front Desk</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp" hidden>See your Front Desk app</button>
  </div>`;
  document.getElementById('marketelValueReveal')?.appendChild(modal);
  const iframe = modal.querySelector('[data-preview-frame="guest"]');
  // Front Desk cold-booting in front of the owner is not part of the pitch.
  // The editor loads behind the booking page so that by the time they ask to
  // see it, it is already up — they get the product, not its loading screen.
  // It starts after the booking page so the two are not racing for the network.
  window.setTimeout(() => {
    const editorFrame = modal.querySelector('[data-preview-frame="editor"]');
    if (!editorFrame?.isConnected || editorFrame.getAttribute('src')) return;
    editorFrame.src = frontdeskEditorUrl();
  }, 1200);
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
    setLivePreviewMode(modal, 'edit', previewOpenedAt, 'guided-forward');
  });
  modal.querySelector('#mvrLiveBack')?.addEventListener('click', () => {
    setLivePreviewMode(modal, 'guest', previewOpenedAt, 'returned-to-booking-page');
  });
  trackReveal('BookingEngineFullPreviewOpened');
  trackJourney('JourneyBookingPreviewOpened', {
    mode: 'guest',
    bookingPageReady: !!bookingPageState.ready,
    bookingPageReason: bookingPageState.reason || '',
  });
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

function setPreviewFrameSrc(iframe, nextSrc) {
  if (!iframe || !nextSrc) return;
  let current = '';
  try { current = new URL(iframe.getAttribute('src') || '', window.location.href).toString(); }
  catch (_) { current = iframe.getAttribute('src') || ''; }
  if (current === nextSrc) return;
  iframe.src = nextSrc;
}

function setLivePreviewMode(modal, nextMode, previewOpenedAt, action = 'mode-selected') {
  if (!modal?.isConnected) return;
  if (nextMode === 'edit') stopBookingChallenge('edit-mode-selected', true);
  livePreviewMode = nextMode === 'edit' ? 'edit' : 'guest';
  const location = modal.querySelector('#mvrLiveLocation');
  const locationText = modal.querySelector('[data-live-location-text]');
  const forward = modal.querySelector('#mvrLiveForward');
  const continueGuestApp = modal.querySelector('#mvrContinueGuestApp');
  const back = modal.querySelector('#mvrLiveBack');
  const editing = livePreviewMode === 'edit';
  if (editing) bookingEditorVisited = true;
  location?.classList.toggle('is-editor', editing);
  if (locationText) locationText.textContent = editing ? 'Front Desk editor' : bookingDisplayDomain();
  if (location) location.setAttribute('aria-label', editing ? 'Front Desk editor' : 'Your live booking address');
  // Exactly one green CTA, and it always names where you are not.
  //   engine            → "See how to edit your booking page"
  //   editor            → Back + "See your Front Desk app"
  //   engine after save → forward, because re-offering the step just completed
  //                       reads as though the save did not take.
  // Returning via Back is deliberately *not* a save, so the editor stays one
  // tap away instead of stranding the owner on the engine.
  const savedReturn = !editing && String(action || '').startsWith('saved-');
  const showContinue = editing || savedReturn;
  if (forward) forward.hidden = showContinue;
  if (continueGuestApp) continueGuestApp.hidden = !showContinue;
  if (back) back.hidden = !editing;
  setLivePreviewActionsVisible(modal, true);
  const guestFrame = modal.querySelector('[data-preview-frame="guest"]');
  const editorFrame = modal.querySelector('[data-preview-frame="editor"]');
  if (guestFrame && editorFrame) {
    if (editing) {
      // Normally already loaded from the preload above; this only covers a jump
      // to the editor faster than the preload timer.
      if (!editorFrame.getAttribute('src')) editorFrame.src = frontdeskEditorUrl();
    } else {
      const guestUrl = new URL(bookingUrl());
      if (modal.dataset.editorSaved === '1') {
        guestUrl.searchParams.set('previewRefresh', String(Date.now()));
        const checkoutPreview = modal.dataset.editorPreviewTarget === 'checkout';
        guestUrl.searchParams.set('previewHighlight', checkoutPreview
          ? 'checkout-policy'
          : (modal.dataset.editorHighlight || 'header'));
        if (checkoutPreview) {
          guestUrl.searchParams.set('previewCheckout', '1');
        } else if (modal.dataset.editorHighlightRoom) {
          guestUrl.searchParams.set('previewHighlightRoom', modal.dataset.editorHighlightRoom);
        }
        delete modal.dataset.editorSaved;
        delete modal.dataset.editorHighlight;
        delete modal.dataset.editorHighlightRoom;
        delete modal.dataset.editorPreviewTarget;
      }
      // A save-return deliberately carries a fresh previewRefresh, so this
      // still reloads when it should; it only skips a genuinely identical URL.
      setPreviewFrameSrc(guestFrame, guestUrl.toString());
    }
    // Both pages stay loaded and only their visibility changes, so moving
    // between the booking page and the editor never costs a page load.
    guestFrame.hidden = editing;
    editorFrame.hidden = !editing;
    if (activeBookingChallenge?.modal === modal) {
      activeBookingChallenge.iframe = editing ? editorFrame : guestFrame;
    }
  }
  trackJourney('JourneyBookingPreviewModeChanged', {
    action,
    mode: livePreviewMode,
  }, { durationMs: Date.now() - previewOpenedAt });
  if (livePreviewMode === 'edit') trackReveal('BookingEngineEditPreviewViewed');
}

function moveToStep(nextStep) {
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
  const openingBeat = stageBeats(currentStep)?.[stageBeatIndex[currentStep] || 0];
  if (openingBeat?.event) trackReveal(openingBeat.event);
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
  clearBeatFrames();
  lastRenderedRevealHtml = '';
  lastRenderedStep = -1;
  lastRenderedBeat = -1;
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
  if (activationPreviewMode && crm.hotelSubscribed) {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = `${propertyName()} is already active`;
    window.setTimeout(() => {
      if (!document.body.contains(button)) return;
      button.disabled = false;
      button.textContent = originalLabel;
    }, 1800);
    return;
  }
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

function bindRevealEvents() {
  document.getElementById('mvrAskBeforeActivating')?.addEventListener('click', () => {
    window.openMarketelSupport?.();
  });
  document.getElementById('mvrNext')?.addEventListener('click', () => {
    const beats = stageBeats();
    const beatIndex = stageBeatIndex[currentStep] || 0;
    if (beats && beatIndex < beats.length - 1) {
      setStageBeat(beatIndex + 1, true);
      return;
    }
    trackJourney('JourneyRevealNavigation', { action: 'next', toStep: currentStep + 1 });
    moveToStep(currentStep + 1);
  });
  document.getElementById('mvrBack')?.addEventListener('click', () => {
    const beats = stageBeats();
    const beatIndex = stageBeatIndex[currentStep] || 0;
    if (beats && beatIndex > 0) {
      setStageBeat(beatIndex - 1, true);
      return;
    }
    trackJourney('JourneyRevealNavigation', { action: 'back', toStep: currentStep - 1 });
    moveToStep(currentStep - 1);
  });
  document.getElementById('mvrExpandPreview')?.addEventListener('click', showExpandedPreview);
  document.querySelector('.mvr-preview-teaser-veil')?.addEventListener('click', () => {
    if (bookingPreviewUnavailable) return;
    showExpandedPreview();
  });
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
  const rateInput = document.getElementById('mvrActivationRate');
  sizeRateInput(rateInput);
  rateInput?.addEventListener('input', () => {
    sizeRateInput(rateInput);
    if (rateInput.value.trim() === '') return;
    updateActivationRateCalculator(rateInput.value, { syncInput: false });
  });
  rateInput?.addEventListener('change', () => {
    updateActivationRateCalculator(rateInput.value, { track: true });
  });
  document.querySelectorAll('[data-mvr-rate-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.dataset.mvrRateStep) || 0;
      const current = Number(rateInput?.value) || currentActivationRate();
      updateActivationRateCalculator(current + delta, { track: true });
    });
  });
  bindAppCarousels();
  startBeatFrames();
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
    bookingPageCheckFailed = !bookingPageState.ready;
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
    bookingPageCheckFailed = !bookingPageState.ready;
  } catch (_) {
    bookingPageState.checking = false;
    bookingPageState.reason = 'unreachable';
    // A check we could not complete says nothing about the page, so the stage
    // keeps showing what it has rather than accusing a live page of being down.
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

export async function showMarketelValueReveal(options = {}) {
  if (document.getElementById('marketelValueReveal') || revealOpening) return;
  revealOpening = true;
  // Stage 0 embeds the live booking page, and opening before the room data
  // lands forces a second render once it arrives — which replaces the subtree
  // and makes the frame load again. Waiting here costs one request; the cap
  // stops a slow API from holding the reveal shut.
  let preloadedRevealData = false;
  if (!crm.editRooms?.length && typeof window.api === 'function') {
    await Promise.race([
      loadRevealData(),
      new Promise((resolve) => { setTimeout(resolve, 2500); }),
    ]);
    preloadedRevealData = true;
  }
  revealOpening = false;
  if (document.getElementById('marketelValueReveal')) return;

  activationPreviewMode = options.previewActivation === true && !!crm.hotelSubscribed;
  const requestedStep = Number(options.startAt);
  let storedStep = 0;
  let hadPendingReveal = false;
  try { storedStep = Number.parseInt(localStorage.getItem(STEP_KEY) || '0', 10); } catch (_) {}
  try { hadPendingReveal = localStorage.getItem(PENDING_KEY) === '1'; } catch (_) {}
  try { billingInterval = localStorage.getItem(BILLING_KEY) === 'year' ? 'year' : 'month'; } catch (_) { billingInterval = 'month'; }
  currentStep = Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(3, requestedStep))
    : Math.max(0, Math.min(3, Number.isFinite(storedStep) ? storedStep : 0));
  if (crm.hotelSubscribed && !activationPreviewMode && currentStep === 3) currentStep = 0;
  livePreviewMode = 'guest';
  stageBeatIndex = { 1: 0, 2: 0 };
  appCarouselIndex = { frontdesk: 0, guestelInstall: 0, guestel: 0, assistant: 0, system: 0 };
  activationNightlyRate = null;
  bookingPreviewOpened = false;
  bookingPreviewUnavailable = false;
  bookingEditorVisited = false;
  lastRenderedRevealHtml = '';
  lastRenderedStep = -1;
  lastRenderedBeat = -1;
  revealStartedAt = Date.now();
  stageStartedAt = 0;
  nextStageViewIsResume = !Number.isFinite(requestedStep) && hadPendingReveal;
  bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
  bookingPageCheckFailed = false;
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
  if (!preloadedRevealData) void loadRevealData();
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
