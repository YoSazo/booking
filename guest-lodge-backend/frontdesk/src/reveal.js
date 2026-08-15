import './styles/reveal.css';
import { crm } from './state.js';
import { exposeToWindow } from './utils.js';
import assistantBookingRequestUrl from './assets/assistant-booking-request.webp';
import assistantTextResolutionUrl from './assets/assistant-text-resolution.webp';
import ownerEditorProofUrl from './assets/frontdesk-editor.webp';
import guestInstallBannerUrl from './assets/guest-install-banner.webp';
import guestInstallSheetUrl from './assets/guest-install-sheet.webp';
import guestHomeScreenUrl from './assets/guest-home-screen.webp';
import guestAppStayUrl from './assets/guest-app-stay.webp';
import guestAppBookUrl from './assets/guest-app-book.webp';
import guestBroadcastSendUrl from './assets/guest-broadcast-send.webp';
import guestBroadcastArrivesUrl from './assets/guest-broadcast-arrives.webp';

const PENDING_KEY = 'marketelValueRevealPendingV1';
const STEP_KEY = 'marketelValueRevealStepV1';
const BILLING_KEY = 'marketelBillingIntervalV1';

let currentStep = 0;
let livePreviewMode = 'guest';
let revealData = { rooms: [], rates: null };
let dataPromise = null;
let bookingPageState = { ready: false, checking: true, reason: '', attempts: 0, domain: '' };
let bookingPageTimer = 0;
// Which beat each beat-driven stage is showing. Keyed by reveal step.
let stageBeatIndex = { 1: 0, 2: 0 };
let revealStartedAt = 0;
let stageStartedAt = 0;
let billingInterval = 'month';
let activeBookingChallenge = null;
let bookingPreviewOpened = false;
let bookingPreviewUnavailable = false;
// Saving in the editor returns to the booking page to show the highlighted
// change, so mode alone can't drive the CTA — it would offer "edit" a second
// time. Once the editor has been seen, the only way on is the Home Screen.
let bookingEditorVisited = false;
let nextStageViewIsResume = false;
let assistantNoResponseAction = 'confirm';


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

// One source for the break-even maths so the reveal's rebooking beat and the
// activation screen can never quote different numbers.
function breakEvenEstimate() {
  const rate = Number(revealData.rates?.nightly);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const commissionPerNight = rate * 0.15;
  const roomNights = Math.max(1, Math.ceil(199 / commissionPerNight));
  return { rate, roomNights, savings: commissionPerNight * roomNights };
}

function directBookingValueHtml() {
  const estimate = breakEvenEstimate();
  if (!estimate) {
    return `<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;
  }
  const { rate, roomNights: breakEvenRoomNights, savings: estimatedSavings } = estimate;
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
  const labels = ['Booking page', 'Home Screen', 'Front Desk', crm.hotelSubscribed ? 'Complete' : 'Activate'];
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
      ${url && !bookingPageState.checking
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
        Open the booking page built for your property. Then see how guests save it to their Home Screen and how you run it from Front Desk.
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

// Beat-driven stages: one claim over one full-size proof, advanced only by the
// footer. Screenshots are real product, shown whole rather than cropped, so the
// owner is looking at the thing itself instead of an illustration of it.
function guestAppBeats() {
  const name = esc(propertyName());
  // The rebooking beat is the money beat, so it carries her own break-even
  // rather than a generic line — it starts the ROI argument one stage before
  // the price screen instead of only after it.
  const estimate = breakEvenEstimate();
  const rebookBody = estimate
    ? `One tap back to your rooms. About ${estimate.roomNights} direct room-night${estimate.roomNights === 1 ? '' : 's'} a month covers Marketel.`
    : 'One tap back to your rooms — a booking you keep instead of renting from an OTA.';
  return [
    {
      // Lands on the tap straight after she edits her own page in stage 1, so
      // it reads as the punchline to what just happened: the screen she was
      // using is the app. Establishing her app first makes the guest install
      // that follows a contrast rather than the first mention of either.
      title: 'The page you just edited lives in an app.',
      body: 'Front Desk, from the App Store. Rooms, prices and photos — from your phone.',
      next: 'See what your guests get',
      event: 'GuestAppOwnerEditorViewed',
      proof: {
        url: ownerEditorProofUrl,
        alt: 'Marketel Front Desk open on a phone, showing the property page editor with tappable header fields and a save button.',
      },
    },
    {
      title: 'Guests save you right from your booking page.',
      body: 'A prompt sits under the room. One tap, no App Store, no download.',
      next: 'See what iOS does',
      event: 'GuestAppInstallBannerViewed',
      proof: {
        url: guestInstallBannerUrl,
        alt: 'A real booking page open in Safari with a card offering to save the property to the guest’s Home Screen.',
      },
    },
    {
      title: 'iOS adds it like any other app.',
      body: 'Your name, your icon — handled by the phone, not by us.',
      next: 'See where it lands',
      event: 'GuestAppInstallSheetViewed',
      proof: {
        url: guestInstallSheetUrl,
        alt: 'The real iOS Add to Home Screen sheet showing the property name, its web address and the Open as Web App switch.',
      },
    },
    {
      title: 'Both, side by side.',
      // The difference is how each one is installed, not what each is called —
      // that is the version of the two-app story people actually retain.
      body: `Yours from the App Store. ${name} saved straight from your booking page.`,
      next: 'See what it wins you',
      event: 'GuestAppHomeScreenViewed',
      proof: {
        url: guestHomeScreenUrl,
        alt: 'An iPhone Home Screen showing the saved property icon beside the Marketel Front Desk icon.',
      },
    },
    {
      // Two frames: the stay they arrive to, and the rooms they rebook from.
      title: 'It opens to their stay. And to your rooms.',
      body: rebookBody,
      next: 'See what else that wins you',
      event: 'GuestAppRebookViewed',
      proof: {
        frames: [
          { url: guestAppStayUrl, alt: 'The saved property opened from the Home Screen to the guest’s stay: check-in today, room, dates, amount due and property details.' },
          { url: guestAppBookUrl, alt: 'The same saved property on its Book tab, showing the rooms ready to reserve again.' },
        ],
      },
    },
    {
      // The rest of the funnel argues cost avoidance. This is the one beat that
      // argues upside — she can create demand instead of waiting for it — and
      // it is the concrete form of owning the guest relationship an OTA keeps.
      // Two frames close the loop: her sending it, and it landing on a phone.
      title: 'And when you want them back, you tell them.',
      body: 'One message from Front Desk reaches every guest who saved you and allowed alerts. No ad spend, no OTA.',
      next: 'See how Front Desk protects you',
      event: 'GuestAppBroadcastViewed',
      proof: {
        frames: [
          { url: guestBroadcastSendUrl, alt: 'Marketel Front Desk composing a notification to saved guests, with a preview of what arrives on their phone and a send button.' },
          { url: guestBroadcastArrivesUrl, alt: 'The same notification arriving on a guest’s Home Screen from the saved property, with a badge on its icon.' },
        ],
      },
    },
  ];
}

// Beat 3 is the single real setting on the screen — text vs in-app is not a
// choice (both always fire), so it is never offered as a toggle.
function assistantBeats() {
  return [
    {
      title: 'It texts you the moment a request lands.',
      body: 'Reply naturally — a walk-in took it, you’re full, whatever changed.',
      next: 'See how you answer',
      event: 'AssistantTextProofViewed',
      proof: {
        url: assistantTextResolutionUrl,
        alt: 'A real text conversation where an owner tells Marketel a walk-in took the room, and Front Desk releases the online request, voids the hold, notifies the guest, and updates availability.',
      },
    },
    {
      title: 'Or answer with one tap.',
      body: 'The same request is already waiting in Bookings. Either way works.',
      next: 'Set your rule',
      event: 'AssistantAppProofViewed',
      proof: {
        url: assistantBookingRequestUrl,
        alt: 'A real Marketel Front Desk booking request with a push notification and buttons to keep or release the booking.',
      },
    },
    {
      title: 'And if you miss it, your rule decides.',
      body: 'That’s how a room conflict never becomes a guest problem.',
      next: 'Review plans and activation',
      event: 'AssistantFallbackViewed',
      proof: null,
      render: assistantFallbackHtml,
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
  const frames = proofFrames(beat.proof);
  const paired = frames.length > 1;
  return `<section class="mvr-stage mvr-stage-beats ${stageClass}">
    <div class="mvr-beat-band">
      <div class="mvr-eyebrow">${eyebrow}</div>
      <h1 class="mvr-beat-title">${beat.title}</h1>
      <p class="mvr-beat-body">${beat.body}</p>
    </div>
    <div class="mvr-beat-stage">
      ${beat.proof ? `<figure class="mvr-beat-proof${paired ? ' is-paired' : ''}">
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

function assistantFallbackHtml() {
  const releases = assistantNoResponseAction === 'release';
  return `<div class="mvr-fallback-control">
    <strong>If you miss the alert</strong>
    <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
      <button type="button" data-mvr-fallback="confirm" class="${releases ? '' : 'is-selected'}"><b>Keep the booking</b><span>Revenue first</span></button>
      <button type="button" data-mvr-fallback="release" class="${releases ? 'is-selected' : ''}"><b>Release request</b><span>Availability first</span></button>
    </div>
    <small>${releases
      ? 'Your rule: void the $1 hold and notify the guest if nobody replies.'
      : 'Your rule: confirm the booking automatically if nobody replies.'}</small>
  </div>`;
}

function assistantRevealHtml() {
  return beatStageHtml(
    'mvr-stage-assistant',
    '3 · Your Front Desk Assistant',
    assistantBeats(),
    stageBeatIndex[2] || 0
  );
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
    <div style="--stagger:1"><span>✓</span><p><strong>Your property on guests’ Home Screens</strong><small>No second App Store app—guests save it from your booking page</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Marketel Front Desk and Assistant</strong><small>Tell it when a walk-in takes a room; it updates remaining availability</small></p></div>
  </div>`;
  return `<section class="mvr-stage mvr-stage-finale">
    <button type="button" class="mvr-finale-back" id="mvrBack">← Back</button>
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${isSubscribed ? 'Your Marketel system' : 'Ready to activate'}</div>
      <h1>${isSubscribed ? `${esc(propertyName())} is ready.` : `Marketel is ready for ${esc(propertyName())}.`}</h1>
      <p>Guests use your direct booking page and can save your property to their Home Screen. You use Marketel Front Desk to manage bookings and availability.</p>
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
      <button type="button" class="mvr-primary" id="mvrNext">See the Home Screen experience →</button>
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
    <iframe title="${esc(propertyName())} live preview" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-back" id="mvrLiveBack" hidden>← Back</button>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp" hidden>See the Home Screen experience</button>
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
  //   editor            → Back + "See the Home Screen experience"
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
  const iframe = modal.querySelector('.mvr-live-stage > iframe');
  if (iframe) {
    iframe.title = livePreviewMode === 'edit'
      ? `${propertyName()} Front Desk editor`
      : `${propertyName()} booking-page preview`;
    if (livePreviewMode === 'edit') {
      // Re-assigning the same src reloads the frame, which is what made the
      // editor flash the loading screen, appear, then load a second time.
      setPreviewFrameSrc(iframe, frontdeskEditorUrl());
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
      setPreviewFrameSrc(iframe, guestUrl.toString());
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

function bindRevealEvents() {
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
  startBeatFrames();
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
  stageBeatIndex = { 1: 0, 2: 0 };
  bookingPreviewOpened = false;
  bookingPreviewUnavailable = false;
  bookingEditorVisited = false;
  lastRenderedRevealHtml = '';
  revealStartedAt = Date.now();
  stageStartedAt = 0;
  nextStageViewIsResume = !Number.isFinite(requestedStep) && hadPendingReveal;
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
