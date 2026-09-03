import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';
import frontdeskYourPageUrl from './assets/frontdesk-your-page.webp';
import frontdeskBookingsUrl from './assets/frontdesk-bookings.webp';
import frontdeskAvailabilityUrl from './assets/frontdesk-availability.webp';
import frontdeskGuestAppUrl from './assets/frontdesk-guest-app.webp';
import guestelAddBookingPageUrl from './assets/guestel-add-booking-page.webp';
import guestelAppClipCardUrl from './assets/guestel-app-clip-card.webp';
import guestelAppClipInviteUrl from './assets/guestel-app-clip-invite.webp';
import guestelChatUrl from './assets/guestel-chat.webp';
import guestelChooseRoomUrl from './assets/guestel-choose-room.webp';
import guestelHotelsUrl from './assets/guestel-hotels.webp';
import guestelPropertySavedUrl from './assets/guestel-property-saved.webp';
import guestelWalletReadyUrl from './assets/guestel-wallet-ready.webp';

// The hub shows these only after someone opens a sheet, which gives us a
// useful preload window. Warming them as soon as this chunk is requested makes
// opening a sheet a transition rather than the start of a download.
const CAROUSEL_SCREEN_URLS = [
  frontdeskYourPageUrl,
  frontdeskBookingsUrl,
  frontdeskAvailabilityUrl,
  frontdeskGuestAppUrl,
  guestelAddBookingPageUrl,
  guestelAppClipCardUrl,
  guestelAppClipInviteUrl,
  guestelPropertySavedUrl,
  guestelWalletReadyUrl,
  guestelHotelsUrl,
  guestelChooseRoomUrl,
  guestelChatUrl,
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
const VISITED_KEY = 'marketelValueRevealVisitedV1';

// `currentStep` is no longer a screen index — the reveal is a hub, not a tour.
// It survives only as "furthest depth reached", because the server's
// revealProgressStep and the emailed resume links are keyed to it.
let currentStep = 0;
// Which hub items the owner has opened, and which sheet is up right now.
let visitedItems = new Set();
let openSheetId = null;
// ActivationOfferViewed queues a Meta CAPI ViewContent on every call, and the
// hub lets someone reopen the offer freely. Fire it once per reveal so the one
// metric this redesign exists to move stays countable.
let activationOfferTracked = false;
let activationFramingTracked = false;
// null = not asked yet. A bracket id or 'skipped' once answered, which also
// stops the question being re-asked when the sheet is reopened.
let activationFramingAnswer = null;
// Checkout returns go straight to the price. Internal subscribed replays still
// show the framing question so QA sees the same path a prospect sees.
let skipActivationFraming = false;
let bookingCheckoutReachedTracked = false;
let guestelAutoplayId = 0;
let frontdeskAutoplayId = 0;
let revealData = { rooms: [], rates: null };
let dataPromise = null;
let bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
// Sticky once a status check has actually come back negative. The check retries
// every six seconds, and without this the stage would swing between "online"
// and "publishing" on every attempt.
let bookingPageCheckFailed = false;
let bookingPageTimer = 0;
let revealOpening = false;
// The app proof is deliberately optional exploration inside each beat. Keeping
// its position separate from the funnel beat means someone can inspect every
// screen or move to the next subject after seeing only one.
let appCarouselIndex = { frontdesk: 0, guestel: 0 };
let revealStartedAt = 0;
let stageStartedAt = 0;
let billingInterval = 'month';
let activationNightlyRate = null;
let activationPreviewMode = false;
let bookingPreviewUnavailable = false;
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

function nightlyRate() {
  return revealData.rates?.nightly || 99;
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
  const avoidedCommission = roomNights * commissionPerNight;
  return { rate: normalizedRate, roomNights, avoidedCommission };
}

function activationRateCalculatorHtml() {
  const { rate, roomNights, avoidedCommission } = activationBreakEven();
  const unit = roomNights === 1 ? 'room-night' : 'room-nights';
  const result = billingInterval === 'year'
    ? `could avoid about ${money(avoidedCommission)} in OTA commission — enough to offset the yearly plan's average monthly cost.`
    : `could avoid about ${money(avoidedCommission)} in OTA commission — more than one month of Marketel.`;
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
  const { roomNights, avoidedCommission } = activationBreakEven(rate);
  const input = document.getElementById('mvrActivationRate');
  const nights = document.getElementById('mvrBreakEvenNights');
  const context = document.getElementById('mvrBreakEvenContext');
  if (options.syncInput !== false && input) input.value = String(rate);
  sizeRateInput(input);
  if (nights) nights.textContent = `${roomNights} direct ${roomNights === 1 ? 'room-night' : 'room-nights'}`;
  if (context) {
    context.textContent = billingInterval === 'year'
      ? `could avoid about ${money(avoidedCommission)} in OTA commission — enough to offset the yearly plan's average monthly cost.`
      : `could avoid about ${money(avoidedCommission)} in OTA commission — more than one month of Marketel.`;
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

// The hub, in the order it is shown. `step` is the legacy depth this item
// writes to revealProgressStep; it deliberately no longer matches visual order,
// because the hub is not a sequence. `event` must stay inside
// MARKETEL_VALUE_REVEAL_EVENTS or the server rejects it with a 400.
const HUB_ITEMS = [
  {
    id: 'booking',
    step: 1,
    event: 'BookingEngineRevealViewed',
    title: 'Your booking page',
    body: 'The page your guests book on.',
    cta: 'Open your booking page',
  },
  {
    id: 'frontdesk',
    step: 2,
    event: 'AssistantRevealViewed',
    title: 'Marketel Front Desk',
    body: 'Run your property from your phone.',
    cta: 'See Marketel Front Desk',
  },
  {
    id: 'guestel',
    step: 3,
    event: 'GuestAppRevealViewed',
    title: 'Guestel',
    body: 'Keep guests coming back direct.',
    cta: 'See the Guestel experience',
  },
  {
    id: 'activation',
    step: 3,
    event: 'ActivationOfferViewed',
    // Price acceptance happens before the framing question. The question then
    // explains the economics of a figure the owner knowingly chose to inspect,
    // rather than feeling like a gate hiding a surprise price.
    title: 'Activate everything — $199/month',
    body: 'Protected by a 7-day money-back guarantee. Cancel anytime.',
    cta: '',
  },
];

function hubItem(id) {
  return HUB_ITEMS.find((item) => item.id === id) || null;
}

function visitedStorageKey() {
  return `${VISITED_KEY}.${crm.activeHotelId || 'property'}`;
}

function persistVisitedItems() {
  try {
    localStorage.setItem(visitedStorageKey(), JSON.stringify([...visitedItems]));
  } catch (_) {}
}

// Exactly one item is emphasized at a time, and this decides which one.
function nextHubItemId() {
  const pending = HUB_ITEMS.find((item) => !visitedItems.has(item.id));
  return (pending || HUB_ITEMS[HUB_ITEMS.length - 1]).id;
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
    stageName: openSheetId || 'hub',
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

// The booking sheet is the owner's real engine, so reaching checkout inside it
// is the strongest engagement signal this screen can produce. That is all this
// listener is for now — the timed challenge and the embedded editor are gone.
function handleBookingPreviewMessage(event) {
  if (event?.data?.type !== 'marketel:checkout-reached') return;
  const reveal = document.getElementById('marketelValueReveal');
  if (!reveal) return;
  const knownFrame = Array.from(reveal.querySelectorAll('iframe'))
    .some((frame) => frame.contentWindow === event.source);
  if (!knownFrame) return;
  if (bookingCheckoutReachedTracked) return;
  bookingCheckoutReachedTracked = true;
  trackReveal('BookingPreviewCheckoutReached');
  trackJourney('JourneyBookingPreviewCheckoutReached', {
    bookingPageReady: !!bookingPageState.ready,
  });
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

// The booking page is the one live, interactive proof. The two apps use real
// screenshots so owners see their complete system without getting lost in a
// second product demo or mistaking disabled preview controls for broken ones.
function appShowcases() {
  return {
    frontdesk: {
      id: 'frontdesk',
      title: 'Marketel Front Desk is your real App Store app.',
      body: 'Run your booking page, reservations, availability, and guest relationships from your phone.',
      slides: [
        {
          label: 'Your Page',
          url: frontdeskYourPageUrl,
          width: 900,
          height: 1721,
          alt: 'Marketel Front Desk Your Page showing the live booking-page editor.',
        },
        {
          label: 'Bookings',
          url: frontdeskBookingsUrl,
          width: 900,
          height: 1728,
          alt: 'Marketel Front Desk Bookings showing a reservation and its availability decision.',
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
    guestel: {
      id: 'guestel',
      eyebrow: 'FROM YOUR PAGE TO THEIR PHONE',
      title: 'Your property stays with every guest.',
      body: 'They tap Add on your booking page, open Apple’s instant App Clip, save your property in Guestel, and return direct next time.',
      slides: [
        {
          label: 'Tap Add',
          url: guestelAddBookingPageUrl,
          width: 900,
          height: 1786,
          alt: 'A booking page showing the Add control that starts the Guestel handoff.',
        },
        {
          label: 'Open Guestel',
          url: guestelAppClipCardUrl,
          width: 900,
          height: 1786,
          alt: 'Apple’s Guestel App Clip card opening over the property booking page.',
        },
        {
          label: 'See the Benefits',
          url: guestelAppClipInviteUrl,
          width: 900,
          height: 1787,
          alt: 'The personalized Guestel invitation explaining direct rates, property messaging, and faster rebooking.',
        },
        {
          label: 'Save the Property',
          url: guestelPropertySavedUrl,
          width: 900,
          height: 1787,
          alt: 'The property saved to Guestel with direct rates, Front Desk messaging and faster rebooking.',
        },
        {
          label: 'Kept for Next Time',
          url: guestelWalletReadyUrl,
          width: 900,
          height: 1787,
          alt: 'The completed Guestel hotel wallet with the property kept for the guest’s next direct stay.',
        },
        {
          label: 'Your Hotels',
          url: guestelHotelsUrl,
          width: 900,
          height: 1764,
          alt: 'Guestel showing an upcoming stay and the property saved for direct rebooking.',
        },
        {
          label: 'Book Again',
          url: guestelChooseRoomUrl,
          width: 900,
          height: 1764,
          alt: 'Guestel showing the property room picker and direct stay dates.',
        },
        {
          label: 'Book and Message',
          url: guestelChatUrl,
          width: 900,
          height: 1762,
          alt: 'Guestel Messages showing a direct conversation between a guest and the property Front Desk.',
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

function setAppCarouselSlide(root, requestedIndex) {
  if (!root?.isConnected) return;
  const showcase = appShowcases()[root.dataset.mvrCarousel];
  if (!showcase) return;
  const length = showcase.slides.length;
  const active = ((Number(requestedIndex) || 0) % length + length) % length;
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
  const title = root.closest('.mvr-stage')?.querySelector('[data-carousel-title]');
  const body = root.closest('.mvr-stage')?.querySelector('[data-carousel-body]');
  if (title) title.textContent = showcase.title;
  if (body) body.textContent = showcase.body;
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

// One question between the hub and the price. Its job is to change what $199 is
// compared against: not "the nothing I pay today" but "the commission I already
// tolerate". Every bracket makes $199 look small, including "not sure" — which
// is why this axis was chosen over typical stay length, where a one-night answer
// produces "11 bookings to break even" and argues against the product.
const ACTIVATION_FRAMING_CHOICES = [
  { id: 'under_500', label: 'Under $500' },
  { id: '500_1500', label: '$500 – $1,500' },
  { id: '1500_5000', label: '$1,500 – $5,000' },
  { id: 'over_5000', label: 'More than $5,000' },
  { id: 'not_sure', label: "I'm not sure" },
];

// "not_sure" deliberately asserts no figure. Inventing an industry average here
// would be the same fabrication that got cut from the earlier money slide.
const ACTIVATION_FRAMING_LINES = {
  under_500: 'You paid <strong>under $500 last month</strong> in OTA commission. Marketel is <strong>$199</strong>, flat — each booking moved direct keeps more of that money at your property.',
  '500_1500': 'You paid <strong>$500–$1,500 last month</strong> in OTA commission. Marketel is <strong>$199</strong>, flat.',
  '1500_5000': 'You paid <strong>$1,500–$5,000 last month</strong> in OTA commission. Marketel is <strong>$199</strong>, flat.',
  over_5000: 'You paid <strong>over $5,000 last month</strong> in OTA commission. Marketel is <strong>$199</strong>, flat.',
  not_sure: "Most owners don't know the exact number. Marketel is <strong>$199</strong>, flat, and Front Desk tracks the OTA fees your direct bookings avoid.",
};

function activationFramingHtml() {
  return `<section class="mvr-framing">
    <div class="mvr-eyebrow">Before the price</div>
    <h2>What did you pay Booking.com, Expedia or Airbnb last month?</h2>
    <p class="mvr-framing-hint">Roughly is fine.</p>
    <div class="mvr-framing-choices">
      ${ACTIVATION_FRAMING_CHOICES.map((choice) => `<button type="button" class="mvr-row is-choice" data-framing-answer="${choice.id}">
        <span class="mvr-row-text"><strong>${esc(choice.label)}</strong></span>
        <span class="mvr-row-chevron" aria-hidden="true">›</span>
      </button>`).join('')}
    </div>
    <button type="button" class="mvr-framing-skip" data-framing-answer="skipped">Skip to plans →</button>
  </section>`;
}

function framingLineHtml(answer) {
  const line = ACTIVATION_FRAMING_LINES[answer];
  if (!line) return '';
  return `<div class="mvr-framing-line">${line}</div>`;
}

// Screen B. ActivationOfferViewed fires here rather than when the sheet opens,
// so the one metric this redesign exists to move still means "saw the price".
function activationPriceHtml() {
  if (!activationOfferTracked) {
    activationOfferTracked = true;
    trackReveal('ActivationOfferViewed', activationFramingAnswer || '');
  }
  return framingLineHtml(activationFramingAnswer) + finaleHtml();
}

function answerActivationFraming(value) {
  const known = ACTIVATION_FRAMING_CHOICES.some((choice) => choice.id === value);
  activationFramingAnswer = known ? value : 'skipped';
  trackReveal('ActivationFramingAnswered', activationFramingAnswer);
  trackJourney('JourneyControlActivated', {
    controlName: 'activation-framing',
    answer: activationFramingAnswer,
  });
  const body = document.querySelector('#mvrSheet .mvr-sheet-body');
  if (!body) return;
  body.innerHTML = activationPriceHtml();
  body.scrollTop = 0;
  bindSheetEvents();
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
          <div class="mvr-payment-flow">
            <strong>Your room money stays yours.</strong>
            <span>Guests use a temporary $1 card verification, then pay your property directly at check-in. Marketel never holds the room payment.</span>
          </div>
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${activationLabel}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Try Marketel for 7 days.</strong><b>If it isn't right, get your money back.</b><small>${isYearly ? 'Cancel anytime. Renews yearly at $1,990 unless canceled.' : 'Cancel anytime. Renews monthly at $199 unless canceled.'}</small></p></div>
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

// Stage 0 embeds a live iframe of the booking page, and this function replaces
// the whole subtree — so every redundant render tore that frame down and made
// the page load again. Boot fires several renders (data load, status checks),
// which is the visible "refreshes itself three times". Skipping renders whose
// output is byte-identical keeps the frame alive.
let lastRenderedRevealHtml = '';

function hubRowHtml(item, nextId) {
  const done = visitedItems.has(item.id);
  const classes = ['mvr-row', `is-${item.id}`];
  if (done) classes.push('is-done');
  if (item.id === nextId) classes.push('is-next');
  return `<button type="button" class="${classes.join(' ')}" data-hub-item="${item.id}">
    <span class="mvr-row-mark" aria-hidden="true">${done ? '✓' : ''}</span>
    <span class="mvr-row-text">
      <strong>${esc(item.title)}</strong>
      <small>${esc(item.body)}</small>
    </span>
    <span class="mvr-row-chevron" aria-hidden="true">›</span>
  </button>`;
}

function hubHtml() {
  const nextId = nextHubItemId();
  return `<div class="mvr-hub">
    <header class="mvr-hub-head">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt=""><span>Marketel</span></div>
      <h1>${crm.hotelSubscribed && !activationPreviewMode
        ? `${esc(propertyName())} is live.`
        : 'Your Marketel is ready.'}</h1>
      <button type="button" class="mvr-hub-domain" id="mvrCopyDomain" aria-label="Copy your booking link">
        <span>${esc(bookingDisplayDomain())}</span><b aria-hidden="true">Copy</b>
      </button>
      ${bookingPageStatusHtml()}
    </header>
    <div class="mvr-hub-hero${visitedItems.has('booking') ? '' : ' is-next'}">${bookingPreviewCardHtml()}</div>
    <div class="mvr-hub-rows">
      ${HUB_ITEMS.filter((item) => item.id !== 'booking').map((item) => hubRowHtml(item, nextId)).join('')}
    </div>
  </div>`;
}

// The hub owns its own subtree so presenting a sheet never re-renders — and
// never reloads — the live preview iframe behind it.
function renderReveal() {
  const root = document.getElementById('marketelValueReveal');
  if (!root) return;
  let layer = root.querySelector('.mvr-hub-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'mvr-hub-layer';
    root.prepend(layer);
  }
  const nextHtml = hubHtml();
  if (nextHtml === lastRenderedRevealHtml && layer.firstElementChild) return;
  lastRenderedRevealHtml = nextHtml;
  layer.innerHTML = nextHtml;
  bindRevealEvents();
}

// Visited/next state changes in place. Re-rendering the hub for a checkmark
// would tear down the hero iframe, which is exactly the "page rebuilds itself"
// bug the old render guard existed to stop.
function refreshHubState() {
  const layer = document.querySelector('.mvr-hub');
  if (!layer) return;
  const nextId = nextHubItemId();
  HUB_ITEMS.forEach((item) => {
    const row = layer.querySelector(`[data-hub-item="${item.id}"]`);
    if (!row) return;
    const done = visitedItems.has(item.id);
    row.classList.toggle('is-done', done);
    row.classList.toggle('is-next', item.id === nextId);
    const mark = row.querySelector('.mvr-row-mark');
    if (mark) mark.textContent = done ? '✓' : '';
  });
  const hero = layer.querySelector('.mvr-hub-hero');
  if (hero) {
    hero.classList.toggle('is-next', nextId === 'booking');
  }
  lastRenderedRevealHtml = hubHtml();
}

// The booking sheet is their real engine and nothing else: no timer, no
// simulated address bar, no challenge, no embedded editor. One control, Close.
function showExpandedPreview() {
  const url = bookingUrl();
  if (document.getElementById('mvrLivePreview')) return false;
  if (!url) {
    bookingPreviewUnavailable = true;
    trackJourney('JourneyBookingPreviewOpened', {
      mode: 'unavailable',
      bookingPageReady: false,
      bookingPageReason: bookingPageState.reason || 'missing-url',
    });
    openSheetId = null;
    renderReveal();
    return false;
  }
  const previewOpenedAt = Date.now();
  const modal = document.createElement('div');
  modal.id = 'mvrLivePreview';
  modal.className = 'mvr-live-preview';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `<div class="mvr-live-stage">
    <iframe data-preview-frame="guest" title="${esc(propertyName())} live booking page" src="${esc(url)}"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
  </div>
  <div class="mvr-live-foot">
    <p>Guests verify their card with a temporary $1 hold, then pay your property directly. Marketel never holds your room revenue.</p>
    <button type="button" class="mvr-sheet-close" id="mvrClosePreview">Close</button>
  </div>`;
  document.getElementById('marketelValueReveal')?.appendChild(modal);
  modal.querySelector('#mvrClosePreview')?.addEventListener('click', () => {
    trackJourney('JourneyBookingPreviewModeChanged', {
      action: 'closed',
      mode: 'guest',
    }, { durationMs: Date.now() - previewOpenedAt });
    closeSheet('preview-closed');
  });
  trackJourney('JourneyBookingPreviewOpened', {
    mode: 'guest',
    bookingPageReady: !!bookingPageState.ready,
    bookingPageReason: bookingPageState.reason || '',
  });
  return true;
}

// Records depth for the server and the emailed resume links. The hub is not a
// sequence, so this only ever moves forward.
function recordHubDepth(step) {
  const normalized = Math.max(0, Math.min(3, step));
  if (normalized <= currentStep && stageStartedAt) return;
  currentStep = Math.max(currentStep, normalized);
  persistStep();
}

function openHubItem(id) {
  const item = hubItem(id);
  if (!item || openSheetId) return;
  const now = Date.now();
  openSheetId = id;
  stageStartedAt = now;

  // Only fire the stage event on open. The server writes revealProgressStep on
  // every call and follows backward moves, so firing on close would rewrite a
  // lower step. Activation is the exception: its event fires when the price
  // actually renders (activationPriceHtml), because a framing question now sits
  // in front of it and ActivationOfferViewed has to keep meaning "saw the price".
  if (item.id !== 'activation') trackReveal(item.event);
  recordHubDepth(item.step);
  trackJourney('JourneyRevealStageViewed', {
    resumed: nextStageViewIsResume,
    bookingPageReady: id === 'booking' ? !!bookingPageState.ready : undefined,
  });
  nextStageViewIsResume = false;

  let opened = true;
  if (id === 'booking') {
    opened = showExpandedPreview();
  } else {
    presentSheet(id);
  }
  // Viewing pricing is not completion. Activation remains the one unchecked
  // item until Stripe succeeds, so closing the offer never creates a false ✓.
  if (opened && id !== 'activation') {
    visitedItems.add(id);
    persistVisitedItems();
  }
  refreshHubState();
}

function closeSheet(reason = 'closed') {
  if (!openSheetId) return;
  const closed = openSheetId;
  trackJourney('JourneyRevealStageCompleted', {
    action: reason,
    stageName: closed,
  }, { durationMs: stageStartedAt ? Date.now() - stageStartedAt : undefined });
  openSheetId = null;
  stageStartedAt = 0;
  stopFrontdeskAutoplay();
  stopGuestelAutoplay();
  document.getElementById('mvrSheet')?.remove();
  document.getElementById('mvrLivePreview')?.remove();
  refreshHubState();
}

function frontdeskSheetBodyHtml() {
  const showcase = appShowcases().frontdesk;
  return `<div class="mvr-sheet-lede">
    <h2>${esc(showcase.title)}</h2>
    <p>${esc(showcase.body)}</p>
  </div>
  ${appCarouselHtml(showcase)}`;
}

function guestelSheetBodyHtml() {
  const showcase = appShowcases().guestel;
  return `<div class="mvr-sheet-lede">
    <h2>${esc(showcase.title)}</h2>
    <p>${esc(showcase.body)}</p>
  </div>
  ${appCarouselHtml(showcase)}`;
}

function presentSheet(id) {
  const root = document.getElementById('marketelValueReveal');
  if (!root || document.getElementById('mvrSheet')) return;
  const showFraming = id === 'activation'
    && !activationFramingAnswer
    && !skipActivationFraming
    && !(crm.hotelSubscribed && !activationPreviewMode);
  const body = id === 'frontdesk'
    ? frontdeskSheetBodyHtml()
    : id === 'guestel'
      ? guestelSheetBodyHtml()
      : showFraming
        ? activationFramingHtml()
        : activationPriceHtml();
  const sheet = document.createElement('div');
  sheet.id = 'mvrSheet';
  sheet.className = `mvr-sheet is-${id}`;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `<div class="mvr-sheet-scrim" data-sheet-dismiss></div>
    <div class="mvr-sheet-card">
      <div class="mvr-sheet-grab" aria-hidden="true"></div>
      <div class="mvr-sheet-body">${body}</div>
      <div class="mvr-sheet-foot">
        <button type="button" class="mvr-sheet-close" data-sheet-dismiss>Close</button>
      </div>
    </div>`;
  root.appendChild(sheet);
  if (showFraming && !activationFramingTracked) {
    activationFramingTracked = true;
    trackReveal('ActivationFramingViewed');
  }
  sheet.querySelectorAll('[data-sheet-dismiss]').forEach((control) => {
    control.addEventListener('click', () => closeSheet('sheet-closed'));
  });
  bindSheetEvents();
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
  openSheetId = null;
  stopFrontdeskAutoplay();
  stopGuestelAutoplay();
  lastRenderedRevealHtml = '';
  document.getElementById('marketelValueReveal')?.remove();
  document.documentElement.classList.remove('marketel-reveal-open');
  document.body.style.overflow = '';
  window.removeEventListener('message', handleBookingPreviewMessage);
  crm.settingsTourActive = false;
  try {
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(visitedStorageKey());
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
  document.querySelectorAll('[data-hub-item]').forEach((row) => {
    row.addEventListener('click', () => {
      trackJourney('JourneyRevealNavigation', { action: 'hub-row', target: row.dataset.hubItem });
      openHubItem(row.dataset.hubItem);
    });
  });
  document.getElementById('mvrExpandPreview')?.addEventListener('click', () => openHubItem('booking'));
  document.querySelector('.mvr-preview-teaser-veil')?.addEventListener('click', () => {
    if (bookingPreviewUnavailable) return;
    openHubItem('booking');
  });
  document.getElementById('mvrCopyDomain')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const link = `https://${bookingDisplayDomain()}`;
    navigator.clipboard?.writeText(link).then(() => {
      const flag = button.querySelector('b');
      if (!flag) return;
      flag.textContent = 'Copied';
      window.setTimeout(() => { flag.textContent = 'Copy'; }, 1600);
    }).catch(() => {});
    trackJourney('JourneyControlActivated', { controlName: 'copy-booking-link' });
  });
}

// Activation lives in a sheet now, so its controls bind when that sheet is
// presented rather than with the hub.
function bindSheetEvents() {
  document.querySelectorAll('#mvrSheet [data-framing-answer]').forEach((control) => {
    control.addEventListener('click', () => answerActivationFraming(control.dataset.framingAnswer));
  });
  document.getElementById('mvrAskBeforeActivating')?.addEventListener('click', () => {
    window.openMarketelSupport?.();
  });
  document.getElementById('mvrFinalCta')?.addEventListener('click', (event) => activateMarketel(event.currentTarget));
  document.querySelectorAll('[data-mvr-billing]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextInterval = button.dataset.mvrBilling === 'year' ? 'year' : 'month';
      if (nextInterval === billingInterval) return;
      billingInterval = nextInterval;
      try { localStorage.setItem(BILLING_KEY, billingInterval); } catch (_) {}
      trackJourney('JourneyBillingIntervalSelected', {
        billingInterval,
        price: billingInterval === 'year' ? 1990 : 199,
        currency: 'USD',
      });
      const body = document.querySelector('#mvrSheet .mvr-sheet-body');
      if (body) {
        body.innerHTML = framingLineHtml(activationFramingAnswer) + finaleHtml();
        bindSheetEvents();
      }
      refreshHubState();
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
  startFrontdeskAutoplay();
  startGuestelAutoplay();
}

// Front Desk tells a four-part story. Advance through it once, then leave the
// final Guest Reach screen in place; looping would make the proof compete with
// the owner's next decision.
function startFrontdeskAutoplay() {
  stopFrontdeskAutoplay();
  const root = document.querySelector('#mvrSheet [data-mvr-carousel="frontdesk"]');
  if (!root) return;
  const lastIndex = appShowcases().frontdesk.slides.length - 1;
  frontdeskAutoplayId = window.setInterval(() => {
    if (!root.isConnected) return stopFrontdeskAutoplay();
    const current = appCarouselIndex.frontdesk || 0;
    if (current >= lastIndex) return stopFrontdeskAutoplay();
    setAppCarouselSlide(root, current + 1, false);
  }, 2800);
  root.addEventListener('pointerdown', stopFrontdeskAutoplay, { once: true });
  root.querySelectorAll('button').forEach((control) => {
    control.addEventListener('click', stopFrontdeskAutoplay, { once: true });
  });
}

function stopFrontdeskAutoplay() {
  if (!frontdeskAutoplayId) return;
  window.clearInterval(frontdeskAutoplayId);
  frontdeskAutoplayId = 0;
}

// Owners skip carousels — the one recorded traversal of the old reveal clicked
// past every slide without opening any. So the Guestel sequence advances on its
// own, and stops the moment someone takes over.
function startGuestelAutoplay() {
  stopGuestelAutoplay();
  const root = document.querySelector('#mvrSheet [data-mvr-carousel="guestel"]');
  if (!root) return;
  const slides = appShowcases().guestel.slides.length;
  guestelAutoplayId = window.setInterval(() => {
    if (!root.isConnected) return stopGuestelAutoplay();
    const next = ((appCarouselIndex.guestel || 0) + 1) % slides;
    setAppCarouselSlide(root, next, false);
  }, 2600);
  root.addEventListener('pointerdown', stopGuestelAutoplay, { once: true });
  root.querySelectorAll('button').forEach((control) => {
    control.addEventListener('click', stopGuestelAutoplay, { once: true });
  });
}

function stopGuestelAutoplay() {
  if (!guestelAutoplayId) return;
  window.clearInterval(guestelAutoplayId);
  guestelAutoplayId = 0;
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
      if (document.getElementById('marketelValueReveal') && !openSheetId) renderReveal();
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
    if (!openSheetId) renderReveal();
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

  if (!openSheetId) renderReveal();
  if (bookingPageState.ready || bookingPageState.reason === 'deployment-disabled') return;
  if (bookingPageState.attempts < 10 && document.getElementById('marketelValueReveal')) {
    bookingPageTimer = window.setTimeout(checkBookingPageStatus, 6000);
  }
}

// revealProgressStep is a depth, not a screen. Resuming therefore reopens the
// hub with that many items already ticked, rather than dropping someone back
// into the middle of a tour that no longer exists.
function seedVisitedFromStep(step) {
  visitedItems = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(visitedStorageKey()) || '[]');
    if (Array.isArray(saved)) {
      const allowed = new Set(HUB_ITEMS.filter((item) => item.id !== 'activation').map((item) => item.id));
      saved.forEach((id) => { if (allowed.has(id)) visitedItems.add(id); });
    }
  } catch (_) {}
  if (visitedItems.size) return;
  const depth = Math.max(0, Math.min(HUB_ITEMS.length, Number(step) || 0));
  for (let index = 0; index < depth; index += 1) {
    const id = HUB_ITEMS[index].id;
    if (id !== 'activation') visitedItems.add(id);
  }
}

export async function showMarketelValueReveal(options = {}) {
  if (document.getElementById('marketelValueReveal') || revealOpening) return;
  revealOpening = true;
  // The hub's hero embeds the live booking page, and opening before the room
  // data lands forces a second render once it arrives. Waiting here costs one
  // request; the cap stops a slow API from holding the reveal shut.
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
  seedVisitedFromStep(currentStep);
  openSheetId = null;
  activationOfferTracked = false;
  activationFramingTracked = false;
  activationFramingAnswer = null;
  skipActivationFraming = currentStep >= 3;
  bookingCheckoutReachedTracked = false;
  appCarouselIndex = { frontdesk: 0, guestel: 0 };
  activationNightlyRate = null;
  bookingPreviewUnavailable = false;
  lastRenderedRevealHtml = '';
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
  // A checkout return (reveal=checkout) or an activation replay lands straight
  // on the offer; everything else opens the hub and lets them choose.
  if (currentStep >= 3 || activationPreviewMode) openHubItem('activation');
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
    localStorage.removeItem(visitedStorageKey());
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
