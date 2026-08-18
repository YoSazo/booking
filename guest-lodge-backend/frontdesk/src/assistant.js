import { crm } from './state.js';
import { exposeToWindow } from './utils.js';

let installed = false;
let loadPromise = null;
const ASSISTANT_LOAD_TIMEOUT_MS = 12000;

function api(method, path, body) {
  if (typeof window.api !== 'function') return Promise.reject(new Error('Front Desk is not ready.'));
  return window.api(method, path, body);
}

function toast(message, kind = 'info') {
  if (typeof window.toast === 'function') window.toast(message, kind);
}

function setNativeShellForAssistant(visible) {
  if (typeof window.setNativeShellVisible === 'function') {
    window.setNativeShellVisible(visible);
    return;
  }
  try {
    window.webkit?.messageHandlers?.marketelShell?.postMessage({
      type: 'visibility',
      visible: !!visible,
    });
  } catch (_) {}
}

function withTimeout(promise, milliseconds, message) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function js(value) {
  return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
}

function activeRecipients() {
  return (crm.assistantData?.recipients || []).filter((recipient) => recipient.active);
}

function verifiedRecipients() {
  return activeRecipients().filter((recipient) => recipient.verified);
}

function isSubscribed() {
  return !!crm.assistantData?.hotel?.subscribed || !!crm.isMasterPin;
}

function isNativeFrontDesk() {
  return typeof window.isNativeFrontdeskApp === 'function' && window.isNativeFrontdeskApp();
}

// The demo conversation reads as a mock-up when it names a room the property
// does not have. Their own first room costs nothing and makes it theirs.
function firstRoomName() {
  const sources = [crm.editRooms, crm.manualAvailability?.rooms];
  for (const rooms of sources) {
    if (!Array.isArray(rooms)) continue;
    const name = String(rooms[0]?.name || '').trim();
    if (name) return name;
  }
  return 'Queen Room';
}

function latestMeaningfulActivity() {
  if (crm.assistantData?.latestResult) return crm.assistantData.latestResult;
  const meaningfulTypes = new Set([
    'availability_update',
    'booking_decision',
    'availability_warning',
  ]);
  return (crm.assistantData?.activities || []).find((activity) =>
    meaningfulTypes.has(String(activity?.type || ''))
  ) || null;
}

function activityAge(value) {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Saved in Assistant activity';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr${elapsedHours === 1 ? '' : 's'} ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  return formatWhen(value);
}

function nativeBookingAlertsHtml() {
  const native = typeof window.isNativeFrontdeskApp === 'function' && window.isNativeFrontdeskApp();
  if (!native) return '';
  const state = String(crm.nativeNotificationState || '');
  const connected = state === 'registered';
  const connecting = state === 'authorized';
  const unavailable = state === 'unavailable';
  const title = connected
    ? 'Booking alerts are on'
    : connecting
      ? 'Connecting this iPhone'
      : unavailable
        ? 'Booking alerts need attention'
        : 'Turn on booking alerts';
  const copy = connected
    ? 'This iPhone can receive new-booking and room-check alerts even when Front Desk is closed.'
    : connecting
      ? 'Notification access is allowed. Refresh once to finish connecting this iPhone.'
      : unavailable
        ? 'Front Desk could not register this iPhone for alerts. Check notification settings, then refresh.'
        : 'Allow notifications so Front Desk can warn you when a booking or room check needs attention.';
  const action = connected
    ? '<button type="button" class="fda-btn secondary full" onclick="toggleAppNotifications()">Send a test booking alert</button>'
    : connecting
      ? '<button type="button" class="fda-btn primary full" onclick="window.location.reload()">Finish connecting</button>'
      : '<button type="button" class="fda-btn primary full" onclick="openNativeNotificationSettings()">Open iPhone notification settings</button>';
  return `<div class="fda-section">
    <div class="fda-section-title">${title}</div>
    <div class="fda-section-sub">${copy}</div>
    ${action}
  </div>`;
}

function formatWhen(value, options = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const now = Date.now();
  const diffMinutes = Math.round((date.getTime() - now) / 60000);
  if (options.relative && diffMinutes > 0 && diffMinutes < 60) return `in ${diffMinutes} min`;
  if (options.relative && diffMinutes >= 60 && diffMinutes < 24 * 60) {
    const hours = Math.round(diffMinutes / 60);
    return `in ${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function frequencyLabel(value) {
  return ({
    smart: 'Evening availability check',
    '2h': 'Every 2 hours',
    '4h': 'Every 4 hours',
    daily: 'Once daily',
    booking_only: 'New bookings only',
    off: 'No check-ins',
  })[value] || 'Smart daily check';
}

function clockTimeLabel(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 'Not set';
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'Not set';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${match[2]} ${suffix}`;
}

function timeControlHtml(id, value, disabled = '') {
  const safeValue = esc(value || '');
  return `<div class="fda-time-control${disabled ? ' is-disabled' : ''}">
    <span class="fda-time-value">${esc(clockTimeLabel(value))}</span>
    <input id="${esc(id)}" type="time" value="${safeValue}" ${disabled} oninput="updateAssistantTimeDisplay(this)">
  </div>`;
}

function assistantEnabled() {
  return !!crm.assistantData?.config?.enabled;
}

function ensureStyles() {
  if (document.getElementById('frontDeskAssistantStyles')) return;
  const style = document.createElement('style');
  style.id = 'frontDeskAssistantStyles';
  style.textContent = `
    .fda-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#173b2d 0%,#21523e 100%);border-radius:17px;padding:17px 18px;margin:0 0 14px;color:#fff;box-shadow:0 8px 24px rgba(23,59,45,.13);}
    .fda-card::after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;right:-58px;top:-80px;background:rgba(255,255,255,.08);}
    .fda-card.is-off{background:#fff;color:#1a2b22;border:1.5px solid #dce7e0;box-shadow:0 3px 14px rgba(26,43,34,.05);}
    .fda-card-row{position:relative;z-index:1;display:flex;align-items:center;gap:13px;}
    .fda-card-icon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:rgba(255,255,255,.14);font-size:20px;}
    .fda-card.is-off .fda-card-icon{background:#eaf5ef;color:#2e7d5b;}
    .fda-card-copy{min-width:0;flex:1;}
    .fda-eyebrow{font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;opacity:.72;margin-bottom:3px;}
    .fda-card-title{font-size:15px;font-weight:850;line-height:1.25;}
    .fda-card-sub{font-size:11.5px;line-height:1.45;opacity:.78;margin-top:3px;}
    .fda-card-btn{position:relative;z-index:1;border:0;border-radius:10px;background:#fff;color:#245f47;padding:10px 13px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;}
    .fda-card.is-off .fda-card-btn{background:#2e7d5b;color:#fff;}
    .fda-live{display:inline-flex;align-items:center;gap:5px;}
    .fda-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#65d69a;box-shadow:0 0 0 4px rgba(101,214,154,.14);}
    .fda-native-result{width:100%;display:flex;align-items:center;gap:12px;margin:0 0 13px;padding:13px 14px;border:1px solid #d7e8de;border-radius:15px;background:linear-gradient(145deg,#f5fbf7,#fff);box-shadow:0 4px 16px rgba(25,70,45,.055);color:#1a2b22;font-family:inherit;text-align:left;cursor:pointer;}
    .fda-native-result.attention{border-color:#efd3a4;background:linear-gradient(145deg,#fff8eb,#fff);}
    .fda-native-result-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;background:#dff2e7;color:#23714f;font-size:16px;font-weight:900;}
    .fda-native-result.attention .fda-native-result-icon{background:#fff0d2;color:#a15c0b;}
    .fda-native-result-copy{min-width:0;flex:1;}
    .fda-native-result-label{display:block;font-size:9.5px;font-weight:850;letter-spacing:.075em;text-transform:uppercase;color:#39745a;margin-bottom:3px;}
    .fda-native-result.attention .fda-native-result-label{color:#9a5a12;}
    .fda-native-result-title{display:block;font-size:13px;font-weight:800;line-height:1.35;color:#1a2b22;}
    .fda-native-result-time{display:block;margin-top:3px;font-size:10.5px;line-height:1.3;color:#75857c;}
    .fda-native-result-arrow{flex:0 0 auto;color:#8aa095;font-size:20px;font-weight:500;line-height:1;}
    .fda-overlay{position:fixed;inset:0;z-index:110000;background:rgba(13,27,20,.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;padding:0;}
    .fda-sheet{width:100%;max-width:620px;max-height:min(92dvh,860px);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#eff4f0;border-radius:24px 24px 0 0;box-shadow:0 -18px 60px rgba(13,27,20,.25);padding:0 0 max(22px,env(safe-area-inset-bottom));animation:fdaSheetIn .2s ease-out;}
    .fda-sheet-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:17px 18px 13px;background:rgba(245,248,246,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(209,222,214,.8);}
    .fda-sheet-title{flex:1;min-width:0;font-size:18px;font-weight:850;color:#1a2b22;}
    .fda-close{border:0;width:34px;height:34px;border-radius:50%;background:#e4ebe7;color:#456054;font-size:20px;cursor:pointer;}
    .fda-sheet-body{width:100%;min-width:0;max-width:100%;padding:16px 16px 24px;}
    .fda-section{width:100%;min-width:0;max-width:100%;background:#fff;border:1px solid #dfe8e3;border-radius:17px;padding:16px;margin-bottom:13px;box-shadow:0 3px 14px rgba(26,43,34,.035);}
    .fda-section-title{min-width:0;font-size:14px;font-weight:850;color:#1a2b22;margin-bottom:4px;overflow-wrap:anywhere;}
    .fda-section-sub{min-width:0;font-size:12px;color:#687b70;line-height:1.5;margin-bottom:13px;overflow-wrap:anywhere;}
    .fda-story{background:linear-gradient(145deg,#e9f7ef,#f6fbf8);border-color:#cae5d5;}
    .fda-bubble{max-width:88%;border-radius:15px;padding:10px 12px;margin:8px 0;font-size:12.5px;line-height:1.45;}
    .fda-bubble.assistant{background:#fff;color:#294638;border:1px solid #d9e8df;border-bottom-left-radius:5px;}
    .fda-bubble.owner{background:#2e7d5b;color:#fff;margin-left:auto;border-bottom-right-radius:5px;}
    .fda-row{display:flex;align-items:center;gap:10px;min-width:0;}
    .fda-between{justify-content:space-between;}
    .fda-between>div:first-child{flex:1;min-width:0;}
    .fda-switch{position:relative;display:block;width:48px;height:28px;flex:0 0 48px;cursor:pointer;}
    .fda-switch input{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none;}
    .fda-switch-track{position:absolute;inset:0;border-radius:16px;background:#cfd9d3;transition:background .15s,opacity .15s;}
    .fda-switch-track::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .15s;}
    .fda-switch input:checked+.fda-switch-track{background:#2e7d5b;}
    .fda-switch input:checked+.fda-switch-track::after{transform:translateX(20px);}
    .fda-switch input:focus-visible+.fda-switch-track{box-shadow:0 0 0 3px rgba(46,125,91,.18);}
    .fda-switch input:disabled+.fda-switch-track{opacity:.5;cursor:not-allowed;}
    .fda-policy-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;}
    .fda-policy-option{position:relative;display:block;min-width:0;cursor:pointer;}
    .fda-policy-option input{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none;}
    .fda-policy-option-copy{display:block;width:100%;min-width:0;height:100%;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:13px;padding:12px;background:#fafcfb;color:#5d7166;overflow-wrap:anywhere;transition:border-color .15s,background .15s,box-shadow .15s;}
    .fda-policy-option-copy strong{display:block;color:#1a2b22;font-size:12.5px;margin-bottom:4px;}
    .fda-policy-option-copy span{display:block;font-size:10.5px;line-height:1.4;}
    .fda-policy-option input:checked + .fda-policy-option-copy{border-color:#2e7d5b;background:#edf7f1;box-shadow:0 0 0 3px rgba(46,125,91,.07);}
    .fda-policy-option input:disabled + .fda-policy-option-copy{opacity:.62;cursor:not-allowed;}
    .fda-policy-result{margin-top:9px;border-radius:11px;padding:10px 11px;background:#f1f5f3;color:#40574b;font-size:11px;line-height:1.45;}
    .fda-person{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #edf1ef;}
    .fda-person:first-of-type{border-top:0;}
    .fda-avatar{width:36px;height:36px;border-radius:50%;background:#e8f4ed;color:#2e7d5b;display:flex;align-items:center;justify-content:center;font-weight:850;flex:0 0 auto;}
    .fda-person-copy{min-width:0;flex:1;}
    .fda-person-name{font-size:13px;font-weight:800;color:#1a2b22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fda-person-meta{font-size:11px;color:#718278;margin-top:2px;}
    .fda-pill{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;background:#eaf7ef;color:#23714f;font-size:9.5px;font-weight:800;}
    .fda-pill.pending{background:#fff3df;color:#9a5a12;}
    .fda-icon-btn{border:0;background:#f1f5f3;color:#596e62;border-radius:9px;padding:8px 9px;font-family:inherit;font-size:11px;font-weight:750;cursor:pointer;}
    .fda-icon-btn.danger{color:#b42318;background:#fff1f0;}
    .fda-verify{display:flex;gap:7px;margin:1px 0 10px 46px;}
    .fda-verify input{min-width:0;flex:1;letter-spacing:.18em;text-align:center;font-weight:800;}
    .fda-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;min-width:0;}
    .fda-field{display:flex;flex-direction:column;min-width:0;width:100%;gap:5px;margin-bottom:10px;}
    .fda-field label{font-size:10.5px;font-weight:800;color:#5e7267;}
    .fda-field input,.fda-field select{display:block;width:100%;min-width:0;max-width:100%;height:46px;min-height:46px;max-height:46px;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:10px;background:#fff;color:#1a2b22;padding:0 11px;font-family:inherit;font-size:16px!important;line-height:normal;outline:none;}
    .fda-time-control{position:relative;display:flex;width:100%;min-width:0;max-width:100%;height:46px;min-height:46px;align-items:center;overflow:hidden;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:10px;background:#fff;color:#1a2b22;padding:0 38px 0 11px;}
    .fda-time-control::after{content:"";position:absolute;right:15px;top:17px;width:7px;height:7px;border-right:1.5px solid #65776d;border-bottom:1.5px solid #65776d;transform:rotate(45deg);pointer-events:none;}
    .fda-time-value{display:flex;min-width:0;align-items:center;font-size:16px;line-height:1;white-space:nowrap;}
    .fda-time-control>input[type="time"]{position:absolute;inset:0;z-index:1;width:100%!important;min-width:0!important;max-width:100%!important;height:46px!important;min-height:46px!important;max-height:46px!important;margin:0!important;padding:0!important;border:0!important;opacity:0;cursor:pointer;}
    .fda-time-control:focus-within{border-color:#2e7d5b;box-shadow:0 0 0 3px rgba(46,125,91,.09);}
    .fda-time-control.is-disabled{opacity:.62;}
    .fda-field input:focus,.fda-field select:focus{border-color:#2e7d5b;box-shadow:0 0 0 3px rgba(46,125,91,.09);}
    .fda-btn{border:0;border-radius:11px;padding:11px 14px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;}
    .fda-btn.primary{background:#2e7d5b;color:#fff;}
    .fda-btn.secondary{background:#edf3ef;color:#2b5e47;}
    .fda-btn.full{width:100%;}
    .fda-btn:disabled{opacity:.48;cursor:not-allowed;}
    .fda-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;}
    .fda-activity{display:flex;gap:10px;padding:10px 0;border-top:1px solid #edf1ef;}
    .fda-activity:first-of-type{border-top:0;}
    .fda-activity-dot{width:8px;height:8px;border-radius:50%;background:#83b49b;margin-top:5px;flex:0 0 auto;}
    .fda-activity-copy{min-width:0;flex:1;font-size:11.5px;color:#445a4f;line-height:1.4;}
    .fda-activity-time{font-size:10px;color:#8a9991;margin-top:2px;}
    .fda-lock{background:#fff8e7;border-color:#f2d899;}
    .fda-lock-price{font-size:12px;color:#7d5b16;line-height:1.5;margin-bottom:12px;}
    .fda-note{font-size:10.5px;color:#7a8b81;line-height:1.45;margin-top:9px;}
    @keyframes fdaSheetIn{from{transform:translateY(18px);opacity:.8}to{transform:translateY(0);opacity:1}}
    @media(min-width:700px){.fda-overlay{align-items:center;padding:20px}.fda-sheet{border-radius:24px;max-height:90dvh}}
    @media(max-width:560px){.fda-card-row{align-items:flex-start}.fda-card-btn{padding:9px 10px}.fda-grid{grid-template-columns:minmax(0,1fr)}.fda-actions{grid-template-columns:minmax(0,1fr)}.fda-sheet-body{padding:13px}.fda-policy-options{grid-template-columns:minmax(0,1fr)}}
  `;
  document.head.appendChild(style);
}

export async function loadFrontDeskAssistant({ force = false } = {}) {
  if (crm.assistantData && !force) return crm.assistantData;
  if (loadPromise && !force) return loadPromise;
  const requestedHotelId = crm.activeHotelId;
  crm.assistantLoading = true;
  crm.assistantError = '';
  renderFrontDeskAssistantCard();
  loadPromise = withTimeout(
    api('GET', '/api/crm/frontdesk-assistant'),
    ASSISTANT_LOAD_TIMEOUT_MS,
    'Front Desk Assistant took too long to respond. Tap retry.'
  )
    .then((result) => {
      if (!result?.success) throw new Error(result?.message || 'Could not load Front Desk Assistant.');
      if (crm.activeHotelId !== requestedHotelId) return null;
      crm.assistantData = result.data;
      return result.data;
    })
    .catch((error) => {
      if (crm.activeHotelId === requestedHotelId) {
        crm.assistantError = error?.message || 'Could not load Front Desk Assistant.';
      }
      throw error;
    })
    .finally(() => {
      crm.assistantLoading = false;
      loadPromise = null;
      renderFrontDeskAssistantCard();
      if (document.getElementById('frontDeskAssistantOverlay')) renderSheet();
    });
  return loadPromise;
}

// The pill is the Assistant's permanent home. It sits above the tab bar on
// Bookings, so it is visible without owning a tab, and it reads as an action
// rather than a buried setting. The intro card it replaces only appeared in
// one state; this appears in all of them.
// Whether this property had the Assistant configured last time we knew. Only
// ever used to choose a label before the real data lands, so a stale answer
// costs one wrong word for a moment rather than a wrong action.
const ASSISTANT_CONFIGURED_KEY = 'marketelAssistantConfigured';

function rememberedAssistantConfigured() {
  try {
    return localStorage.getItem(ASSISTANT_CONFIGURED_KEY + ':' + (crm.activeHotelId || '')) === '1';
  } catch (_) {
    return false;
  }
}

function rememberAssistantConfigured(value) {
  try {
    const key = ASSISTANT_CONFIGURED_KEY + ':' + (crm.activeHotelId || '');
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch (_) {}
}

export function renderAssistantPill() {
  ensureStyles();
  let pill = document.getElementById('frontDeskAssistantPill');
  const belongsHere = isNativeFrontDesk()
    && crm.currentFilter === 'bookings'
    && crm.bookingsSubview === 'bookings'
    && !crm.settingsTourActive;

  if (!belongsHere) {
    pill?.classList.remove('is-visible');
    return;
  }

  if (!pill) {
    pill = document.createElement('button');
    pill.id = 'frontDeskAssistantPill';
    pill.type = 'button';
    pill.className = 'fda-pill';
    pill.addEventListener('click', () => openFrontDeskAssistant());
    document.body.appendChild(pill);
  }

  // Wording follows state: an unconfigured Assistant is an invitation, a
  // configured one with something waiting is a prompt, otherwise it is a door.
  //
  // Assistant data arrives a moment after the tab paints, and treating "not
  // loaded" as "not configured" made a set-up property open on "Set up Front
  // Desk Assistant" and correct itself seconds later. The last known answer is
  // remembered, so a returning owner gets the right label on the first frame
  // and the fetch only ever confirms it.
  const data = crm.assistantData;
  const recipients = activeRecipients();
  const configured = data
    ? (!!data.config?.enabled && recipients.length > 0)
    : rememberedAssistantConfigured();
  if (data) rememberAssistantConfigured(configured);
  const activity = latestMeaningfulActivity();
  const needsReview = !!activity
    && (activity.type === 'availability_warning' || activity.status === 'attention');

  const label = !configured
    ? 'Set up Front Desk Assistant'
    : needsReview
      ? 'Front Desk needs your review'
      : 'Front Desk Assistant';

  pill.innerHTML = `<span class="fda-pill-mark" aria-hidden="true"><i data-lucide="phone" style="width:14px;height:14px;"></i></span>${needsReview ? '<span class="fda-pill-dot" aria-hidden="true"></span>' : ''}<span>${esc(label)}</span>`;
  pill.setAttribute('aria-label', label);
  pill.classList.add('is-visible');
  try { window.lucide?.createIcons(); } catch (_) {}

  if (!data && !crm.assistantLoading && !crm.assistantError) {
    loadFrontDeskAssistant().catch(() => {});
  }
}

export function hideAssistantPill() {
  document.getElementById('frontDeskAssistantPill')?.classList.remove('is-visible');
}

export function renderFrontDeskAssistantCard() {
  ensureStyles();
  const panel = document.getElementById('frontDeskAssistantPanel');
  if (!panel) return;
  const visible = crm.currentFilter === 'bookings'
    && crm.bookingsSubview === 'bookings'
    && !crm.settingsTourActive;
  panel.style.display = visible ? 'block' : 'none';
  if (!visible) return;
  if (!isNativeFrontDesk()) {
    panel.innerHTML = `<div class="fda-card is-off">
      <div class="fda-card-row">
        <div class="fda-card-icon"><i data-lucide="arrow-up-right" style="width:16px;height:16px;"></i></div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow">Front Desk app</div>
          <div class="fda-card-title">Assistant lives on your phone.</div>
          <div class="fda-card-sub">Download Marketel Front Desk from the App Store to connect phone numbers, choose your no-answer rule and manage Assistant activity.</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontdeskAppDownload()">Download</button>
      </div>
    </div>`;
    return;
  }
  if (isNativeFrontDesk()) {
    const activity = latestMeaningfulActivity();
    if (!crm.assistantData || !activity) {
      if (!crm.assistantData && !crm.assistantLoading && !crm.assistantError) {
        loadFrontDeskAssistant().catch(() => {});
      }
      // The pill now carries discovery, so an empty card here would be a
      // second invitation stacked above the first.
      panel.innerHTML = '';
      panel.style.display = 'none';
      return;
    }
    const attention = activity.type === 'availability_warning' || activity.status === 'attention';
    panel.style.display = 'block';
    panel.innerHTML = `<button type="button" class="fda-native-result${attention ? ' attention' : ''}" onclick="openFrontDeskAssistant()" aria-label="Open Front Desk Assistant activity">
      <span class="fda-native-result-icon" aria-hidden="true">${attention ? '!' : '✓'}</span>
      <span class="fda-native-result-copy">
        <span class="fda-native-result-label">${attention ? 'Front Desk needs your review' : 'Front Desk handled this'}</span>
        <span class="fda-native-result-title">${esc(activity.summary || 'Assistant updated your property')}</span>
        <span class="fda-native-result-time">${esc(activityAge(activity.createdAt))} · View activity</span>
      </span>
      <span class="fda-native-result-arrow" aria-hidden="true">›</span>
    </button>`;
    return;
  }
  if (!crm.assistantData) {
    const loadFailed = !!crm.assistantError && !crm.assistantLoading;
    panel.innerHTML = `<div class="fda-card is-off">
      <div class="fda-card-row">
        <div class="fda-card-icon"><i data-lucide="message-circle" style="width:16px;height:16px;"></i></div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow">Front Desk Assistant</div>
          <div class="fda-card-title">${crm.assistantLoading ? 'Connecting your assistant…' : (loadFailed ? 'Assistant could not connect' : 'Tell Front Desk when a room is taken')}</div>
          <div class="fda-card-sub">${loadFailed ? esc(crm.assistantError) : 'Tell it when a walk-in or another channel takes a room. It updates Availability and your direct booking page.'}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${loadFailed ? 'Retry' : 'Open'}</button>
      </div>
    </div>`;
    if (!crm.assistantLoading) loadFrontDeskAssistant().catch(() => {});
    return;
  }

  const recipients = verifiedRecipients();
  const config = crm.assistantData.config || {};
  const approval = crm.assistantData.bookingApproval || {};
  if (config.enabled) {
    const next = config.nextCheckAt ? ` · next ${formatWhen(config.nextCheckAt, { relative: true })}` : '';
    const bookingRule = approval.enabled
      ? ` · no reply ${approval.noResponseAction === 'release' ? 'releases request' : 'keeps booking'}`
      : '';
    panel.innerHTML = `<div class="fda-card">
      <div class="fda-card-row">
        <div class="fda-card-icon"><i data-lucide="message-circle" style="width:16px;height:16px;"></i></div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow fda-live">Assistant on</div>
          <div class="fda-card-title">Front Desk is watching ${recipients.length} phone${recipients.length === 1 ? '' : 's'}</div>
          <div class="fda-card-sub">${esc(frequencyLabel(config.checkFrequency))}${esc(next)}${esc(bookingRule)}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">Manage</button>
      </div>
    </div>`;
    return;
  }

  const locked = !isSubscribed();
  panel.innerHTML = `<div class="fda-card is-off">
    <div class="fda-card-row">
      <div class="fda-card-icon"><i data-lucide="message-circle" style="width:16px;height:16px;"></i></div>
      <div class="fda-card-copy">
        <div class="fda-eyebrow">${locked ? 'Included when activated' : 'Front Desk Assistant'}</div>
        <div class="fda-card-title">Text Front Desk. It handles availability.</div>
        <div class="fda-card-sub">${locked ? 'See how it protects your direct booking page before you go live.' : 'If a walk-in or another channel takes a room, text Front Desk what happened. It updates Availability for you.'}</div>
      </div>
      <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${locked ? 'See it' : 'Set up'}</button>
    </div>
  </div>`;
}

function recipientHtml(recipient) {
  const initial = esc((recipient.name || '?').charAt(0).toUpperCase());
  const meta = [recipient.role, recipient.maskedPhone].filter(Boolean).join(' · ');
  return `<div>
    <div class="fda-person">
      <div class="fda-avatar">${initial}</div>
      <div class="fda-person-copy">
        <div class="fda-person-name">${esc(recipient.name)}</div>
        <div class="fda-person-meta">${esc(meta)}</div>
      </div>
      <span class="fda-pill ${recipient.verified ? '' : 'pending'}">${recipient.verified ? 'Connected' : 'Verify'}</span>
      <button type="button" class="fda-icon-btn danger" onclick='removeAssistantRecipient(${js(recipient.id)})'>Remove</button>
    </div>
    ${recipient.verified ? '' : `<div class="fda-verify">
      <input id="assistant-code-${esc(recipient.id)}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" aria-label="Verification code">
      <button type="button" class="fda-btn primary" onclick='verifyAssistantRecipient(${js(recipient.id)})'>Verify</button>
      <button type="button" class="fda-icon-btn" onclick='resendAssistantCode(${js(recipient.id)})'>Resend</button>
    </div>`}
  </div>`;
}

function activityHtml() {
  const activities = (crm.assistantData?.activities || []).slice(0, 10);
  if (!activities.length) {
    return '<div class="fda-section-sub" style="margin:4px 0 0;">Booking alerts and availability updates will appear here.</div>';
  }
  return activities.map((activity) => `<div class="fda-activity">
    <div class="fda-activity-dot"></div>
    <div class="fda-activity-copy">
      ${esc(activity.summary || 'Front Desk activity')}
      <div class="fda-activity-time">${esc(formatWhen(activity.createdAt))}${activity.status ? ` · ${esc(activity.status)}` : ''}</div>
    </div>
  </div>`).join('');
}

function sheetBodyHtml() {
  const data = crm.assistantData;
  if (!data) {
    if (crm.assistantError && !crm.assistantLoading) {
      return `<div class="fda-section">
        <div class="fda-section-title">Assistant could not connect</div>
        <div class="fda-section-sub">${esc(crm.assistantError)}</div>
        <button type="button" class="fda-btn primary full" onclick="retryFrontDeskAssistant()">Retry</button>
      </div>`;
    }
    return '<div class="fda-section"><div class="loading"><div class="logo-sprite-bounce"></div> Opening assistant…</div></div>';
  }
  const config = data.config || {};
  const approval = data.bookingApproval || {};
  const recipients = activeRecipients();
  const capabilities = data.capabilities || {};
  const subscribed = isSubscribed();
  const recipientLimit = Number(capabilities.maxRecipients || 3);
  const canAdd = recipients.length < recipientLimit;
  const settingsDisabled = subscribed ? '' : 'disabled';
  const policyDisabled = subscribed && capabilities.manualAvailability ? '' : 'disabled';
  const zone = config.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  const isNativeApp = typeof window.isNativeFrontdeskApp === 'function' && window.isNativeFrontdeskApp();
  // "Cannot work yet" was three independent grey boxes, so a property blocked
  // on two reasons read two apologies before reaching anything actionable. One
  // blocker, stated once, with the reason that applies.
  const blockers = [];
  if (!capabilities.smsConfigured) {
    blockers.push("Marketel's texting number still needs its server credentials.");
  }
  if (!capabilities.manualAvailability) {
    blockers.push('The Assistant works with properties whose Availability is managed in Marketel.');
  }
  const blockerNote = blockers.length
    ? `<div class="fda-section fda-lock">
        <div class="fda-section-title">Not ready on this property yet</div>
        <div class="fda-section-sub" style="margin:0;">${blockers.map((reason) => esc(reason)).join(' ')}</div>
      </div>`
    : '';

  // The story teaches what texting your Front Desk means. Once recipients are
  // saved and it is switched on, it has taught that — and every later visit is
  // someone scrolling past a fixed demo conversation to reach their settings.
  const hasConfigured = !!config.enabled && recipients.length > 0;
  const storySection = hasConfigured
    ? ''
    : `<div class="fda-section fda-story">
      <div class="fda-section-title">Your Front Desk becomes someone you can text</div>
      <div class="fda-section-sub">If a walk-in or another channel takes a room, text what happened. Front Desk updates Availability and reduces what remains available on your direct booking page.</div>
      <div class="fda-bubble assistant"><strong>Front Desk</strong><br>New booking: ${esc(firstRoomName())}, tonight. Is it still free?</div>
      <div class="fda-bubble owner">A walk-in took it.</div>
      <div class="fda-bubble assistant"><strong>Done.</strong> I updated availability. If an online guest is affected, I’ll ask before cancelling anything.</div>
      <div class="fda-policy-result"><strong>You set the fallback.</strong> If nobody answers a new-booking alert, Front Desk either keeps the sale or releases the request—your choice.</div>
    </div>`;

  return `
    ${storySection}

    ${!subscribed && !isNativeApp ? `<div class="fda-section fda-lock">
      <div class="fda-section-title">Included with your $199/month activation</div>
      <div class="fda-lock-price">Activate your direct booking page to connect phones, receive booking texts, and update availability by reply.</div>
      <button type="button" class="fda-btn primary full" onclick="activateFromAssistant()">Activate Marketel</button>
    </div>` : ''}
    ${blockerNote}
    ${nativeBookingAlertsHtml()}

    <div class="fda-section">
      <div class="fda-row fda-between">
        <div>
          <div class="fda-section-title">Front Desk Assistant</div>
          <div class="fda-section-sub" style="margin:0;">Turn texting and automatic check-ins on or off.</div>
        </div>
        <label class="fda-switch" aria-label="Turn Front Desk Assistant on">
          <input id="assistant-enabled" type="checkbox" ${config.enabled ? 'checked' : ''} ${settingsDisabled} aria-label="Turn Front Desk Assistant on">
          <span class="fda-switch-track" aria-hidden="true"></span>
        </label>
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-row fda-between">
        <div>
          <div class="fda-section-title">Review before a booking locks in</div>
          <div class="fda-section-sub" style="margin:0;">Front Desk holds the room, asks connected phones, then follows your rule if nobody replies.</div>
        </div>
        <label class="fda-switch" aria-label="Review new bookings before confirmation">
          <input id="assistant-approval-enabled" type="checkbox" ${approval.enabled ? 'checked' : ''} ${policyDisabled} aria-label="Review new bookings before confirmation" onchange="updateAssistantPolicySummary()">
          <span class="fda-switch-track" aria-hidden="true"></span>
        </label>
      </div>
      <div class="fda-field" style="margin-top:13px;">
        <label for="assistant-approval-window">Time to answer</label>
        <select id="assistant-approval-window" ${policyDisabled} onchange="updateAssistantPolicySummary()">
          ${[5, 10, 15, 20, 30, 45, 60].map((minutes) => `<option value="${minutes}" ${Number(approval.windowMinutes || 20) === minutes ? 'selected' : ''}>${minutes} minutes</option>`).join('')}
        </select>
      </div>
      <div class="fda-section-title" style="margin-top:2px;">If nobody answers</div>
      <div class="fda-policy-options">
        <label class="fda-policy-option">
          <input type="radio" name="assistant-no-response" value="confirm" ${approval.noResponseAction !== 'release' ? 'checked' : ''} ${policyDisabled} onchange="updateAssistantPolicySummary()">
          <span class="fda-policy-option-copy"><strong>Keep the booking</strong><span>Confirm it automatically. Best when saving the sale matters most.</span></span>
        </label>
        <label class="fda-policy-option">
          <input type="radio" name="assistant-no-response" value="release" ${approval.noResponseAction === 'release' ? 'checked' : ''} ${policyDisabled} onchange="updateAssistantPolicySummary()">
          <span class="fda-policy-option-copy"><strong>Release the request</strong><span>Void the $1 hold and notify the guest. Best when availability must be certain.</span></span>
        </label>
      </div>
      <div class="fda-policy-result" id="assistant-policy-result"></div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Who should Front Desk text?</div>
      <div class="fda-section-sub">Add the owner, manager, or desk staff. Marketel can contact up to ${recipientLimit} people.</div>
      ${recipients.length ? recipients.map(recipientHtml).join('') : '<div class="fda-section-sub" style="padding:4px 0 10px;">No phones connected yet.</div>'}
      ${canAdd ? `<div class="fda-grid" style="margin-top:8px;">
        <div class="fda-field"><label for="assistant-person-name">Name</label><input id="assistant-person-name" type="text" maxlength="80" placeholder="e.g. Jack"></div>
        <div class="fda-field"><label for="assistant-person-role">Role</label><input id="assistant-person-role" type="text" maxlength="80" placeholder="Owner, night desk…"></div>
      </div>
      <div class="fda-field"><label for="assistant-person-phone">Mobile number</label><input id="assistant-person-phone" type="tel" autocomplete="tel" placeholder="(701) 555-0123"></div>
      <button type="button" class="fda-btn secondary full" onclick="addAssistantRecipient()" ${subscribed && capabilities.smsConfigured ? '' : 'disabled'}>Send verification code</button>` : ''}
      ${capabilities.assistantPhone ? `<button type="button" class="fda-icon-btn" style="margin-top:10px;" onclick="saveAssistantContact()">Save “Marketel Front Desk” to contacts</button>` : ''}
      <div class="fda-note">Verification confirms consent and prevents a mistyped number from texting someone else. Reply STOP anytime to disconnect.</div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">When should it check in?</div>
      <div class="fda-section-sub">Front Desk asks whether a walk-in or another channel changed your rooms. Reply with what happened; it updates Availability for you.</div>
      <div class="fda-field">
        <label for="assistant-frequency">Check-in schedule</label>
        <select id="assistant-frequency" ${settingsDisabled}>
          <option value="smart" ${config.checkFrequency === 'smart' ? 'selected' : ''}>Evening check — recommended</option>
          <option value="2h" ${config.checkFrequency === '2h' ? 'selected' : ''}>Every 2 hours</option>
          <option value="4h" ${config.checkFrequency === '4h' ? 'selected' : ''}>Every 4 hours</option>
          <option value="daily" ${config.checkFrequency === 'daily' ? 'selected' : ''}>Once daily</option>
          <option value="booking_only" ${config.checkFrequency === 'booking_only' ? 'selected' : ''}>Only when a new booking arrives</option>
          <option value="off" ${config.checkFrequency === 'off' ? 'selected' : ''}>Never check in</option>
        </select>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-check-time">Daily check time</label>${timeControlHtml('assistant-check-time', config.dailyCheckTime || '18:00', settingsDisabled)}</div>
        <div class="fda-field"><label for="assistant-time-zone">Time zone</label><input id="assistant-time-zone" type="text" value="${esc(zone)}" ${settingsDisabled}></div>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-quiet-start">Quiet hours start</label>${timeControlHtml('assistant-quiet-start', config.quietHoursStart || '', settingsDisabled)}</div>
        <div class="fda-field"><label for="assistant-quiet-end">Quiet hours end</label>${timeControlHtml('assistant-quiet-end', config.quietHoursEnd || '', settingsDisabled)}</div>
      </div>
      <label class="fda-row" style="font-size:12px;color:#40574b;margin-top:2px;cursor:pointer;">
        <input id="assistant-booking-alerts" type="checkbox" ${config.notifyNewBookings !== false ? 'checked' : ''} ${settingsDisabled}>
        Text connected phones when a new booking arrives
      </label>
      <button type="button" class="fda-btn primary full" style="margin-top:14px;" onclick="saveAssistantSettings()" ${subscribed && capabilities.smsConfigured && capabilities.manualAvailability ? '' : 'disabled'}>Save assistant settings</button>
      <div class="fda-actions">
        <button type="button" class="fda-btn secondary" onclick="sendAssistantTest()" ${verifiedRecipients().length && subscribed && capabilities.smsConfigured ? '' : 'disabled'}>Send test text</button>
        <button type="button" class="fda-btn secondary" onclick="runAssistantCheckNow()" ${verifiedRecipients().length && subscribed && capabilities.smsConfigured ? '' : 'disabled'}>Ask for an update now</button>
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Recent activity</div>
      ${activityHtml()}
    </div>
  `;
}

function renderSheet() {
  const sheet = document.getElementById('frontDeskAssistantSheet');
  if (!sheet) return;
  sheet.innerHTML = `<div class="fda-sheet-head">
    <div class="fda-sheet-title">Front Desk Assistant</div>
    <button type="button" class="fda-close" onclick="closeFrontDeskAssistant()" aria-label="Close">×</button>
  </div>
  <div class="fda-sheet-body">${sheetBodyHtml()}</div>`;
  updateAssistantPolicySummary();
}

export function refreshFrontDeskAssistantSheet() {
  if (document.getElementById('frontDeskAssistantSheet')) renderSheet();
}

export function updateAssistantPolicySummary() {
  const target = document.getElementById('assistant-policy-result');
  if (!target) return;
  const enabled = !!document.getElementById('assistant-approval-enabled')?.checked;
  const minutes = Number(document.getElementById('assistant-approval-window')?.value || 20);
  const action = document.querySelector('input[name="assistant-no-response"]:checked')?.value || 'confirm';
  if (!enabled) {
    target.innerHTML = '<strong>Off.</strong> New direct bookings confirm immediately.';
    return;
  }
  target.innerHTML = action === 'release'
    ? `<strong>Your rule:</strong> no answer after ${minutes} minutes releases the request, voids the $1 hold and emails the guest.`
    : `<strong>Your rule:</strong> no answer after ${minutes} minutes keeps the booking and emails the guest a confirmation.`;
}

export function updateAssistantTimeDisplay(input) {
  const valueNode = input?.closest?.('.fda-time-control')?.querySelector('.fda-time-value');
  if (valueNode) valueNode.textContent = clockTimeLabel(input.value);
}

// The pill becomes the sheet rather than the sheet appearing over it.
//
// View Transitions do this properly: tag both elements with the same
// view-transition-name and the browser interpolates position, size and radius
// between them, so the pill visibly grows into the sheet and shrinks back on
// close. Safari 18 and Chrome support it; anywhere else falls through to the
// existing slide-up, which is why every call is wrapped rather than assumed.
function supportsViewTransitions() {
  return typeof document.startViewTransition === 'function'
    && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// The name has to be unique while the transition runs, so it is applied to the
// pill only for the duration and removed after. Two elements sharing a name at
// the same time makes the browser skip the animation entirely.
function withPillMorph(run) {
  const pill = document.getElementById('frontDeskAssistantPill');
  if (!supportsViewTransitions()) {
    run();
    return;
  }
  if (pill) pill.style.viewTransitionName = 'fda-morph';
  const transition = document.startViewTransition(() => {
    run();
    const sheet = document.getElementById('frontDeskAssistantSheet');
    if (sheet) sheet.style.viewTransitionName = 'fda-morph';
    if (pill) pill.style.viewTransitionName = '';
  });
  transition.finished.finally(() => {
    const sheet = document.getElementById('frontDeskAssistantSheet');
    if (sheet) sheet.style.viewTransitionName = '';
    if (pill) pill.style.viewTransitionName = '';
  }).catch(() => {});
}

function openAssistantSheetNow() {
  if (!isNativeFrontDesk()) {
    window.openFrontdeskAppDownload?.();
    return;
  }
  // Hide native chrome before any lazy rendering or network work so it can
  // never sit above the web sheet.
  setNativeShellForAssistant(false);
  ensureStyles();
  let overlay = document.getElementById('frontDeskAssistantOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'frontDeskAssistantOverlay';
    overlay.className = 'fda-overlay';
    overlay.innerHTML = '<div class="fda-sheet" id="frontDeskAssistantSheet" role="dialog" aria-modal="true" aria-label="Front Desk Assistant"></div>';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeFrontDeskAssistant();
    });
    document.body.appendChild(overlay);
  }
  document.body.style.overflow = 'hidden';
  renderSheet();
  requestAnimationFrame(() => setNativeShellForAssistant(false));

  if (crm.assistantData) {
    // Cached settings render immediately. Refresh activity in the background
    // without replacing the sheet with a loader.
    loadFrontDeskAssistant({ force: true }).catch(() => {});
  } else {
    loadFrontDeskAssistant().catch(() => {});
  }
}

// Public entry: the pill morphs into the sheet where the browser can do it,
// and simply opens where it cannot.
export function openFrontDeskAssistant() {
  if (!isNativeFrontDesk()) {
    window.openFrontdeskAppDownload?.();
    return;
  }
  withPillMorph(() => openAssistantSheetNow());
}

// Closing runs the same morph in reverse: the sheet shrinks back into the
// pill rather than sliding away from it.
export function closeFrontDeskAssistant() {
  const dismiss = () => {
    document.getElementById('frontDeskAssistantOverlay')?.remove();
    document.body.style.overflow = '';
    setNativeShellForAssistant(true);
  };
  const sheet = document.getElementById('frontDeskAssistantSheet');
  if (!supportsViewTransitions() || !sheet) {
    dismiss();
    return;
  }
  sheet.style.viewTransitionName = 'fda-morph';
  const transition = document.startViewTransition(() => {
    dismiss();
    const pill = document.getElementById('frontDeskAssistantPill');
    if (pill) pill.style.viewTransitionName = 'fda-morph';
  });
  transition.finished.finally(() => {
    const pill = document.getElementById('frontDeskAssistantPill');
    if (pill) pill.style.viewTransitionName = '';
  }).catch(() => {});
}

export function retryFrontDeskAssistant() {
  crm.assistantError = '';
  renderSheet();
  loadFrontDeskAssistant({ force: true }).catch(() => {});
}

function applyResult(result, successMessage) {
  if (!result?.success) throw new Error(result?.message || 'That did not save.');
  if (result.data) crm.assistantData = result.data;
  renderFrontDeskAssistantCard();
  renderSheet();
  if (successMessage) toast(successMessage, 'success');
  return result;
}

export async function addAssistantRecipient() {
  const name = document.getElementById('assistant-person-name')?.value.trim();
  const role = document.getElementById('assistant-person-role')?.value.trim();
  const phone = document.getElementById('assistant-person-phone')?.value.trim();
  if (!name || !phone) return toast('Enter a name and mobile number.', 'error');
  try {
    const result = await api('POST', '/api/crm/frontdesk-assistant/recipients', { name, role, phone });
    applyResult(result, result.verificationSent ? 'Verification code sent.' : 'Phone connected.');
  } catch (error) {
    toast(error.message || 'Could not add that phone.', 'error');
  }
}

export async function verifyAssistantRecipient(recipientId) {
  const code = document.getElementById(`assistant-code-${recipientId}`)?.value.trim();
  if (!code || code.length !== 6) return toast('Enter the 6-digit code.', 'error');
  try {
    applyResult(
      await api('POST', `/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(recipientId)}/verify`, { code }),
      'Phone connected to Front Desk.'
    );
  } catch (error) {
    toast(error.message || 'That code could not be verified.', 'error');
  }
}

export async function resendAssistantCode(recipientId) {
  try {
    applyResult(
      await api('POST', `/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(recipientId)}/resend`, {}),
      'A new code was sent.'
    );
  } catch (error) {
    toast(error.message || 'Could not resend the code.', 'error');
  }
}

export async function removeAssistantRecipient(recipientId) {
  if (!window.confirm('Remove this phone from Front Desk Assistant?')) return;
  try {
    applyResult(
      await api('DELETE', `/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(recipientId)}`),
      'Phone removed.'
    );
  } catch (error) {
    toast(error.message || 'Could not remove that phone.', 'error');
  }
}

export async function saveAssistantSettings() {
  const payload = {
    enabled: !!document.getElementById('assistant-enabled')?.checked,
    checkFrequency: document.getElementById('assistant-frequency')?.value || 'smart',
    dailyCheckTime: document.getElementById('assistant-check-time')?.value || '18:00',
    quietHoursStart: document.getElementById('assistant-quiet-start')?.value || '',
    quietHoursEnd: document.getElementById('assistant-quiet-end')?.value || '',
    timeZone: document.getElementById('assistant-time-zone')?.value
      || Intl.DateTimeFormat().resolvedOptions().timeZone
      || 'America/Chicago',
    notifyNewBookings: !!document.getElementById('assistant-booking-alerts')?.checked,
  };
  const approvalPayload = {
    enabled: !!document.getElementById('assistant-approval-enabled')?.checked,
    windowMinutes: Number(document.getElementById('assistant-approval-window')?.value || 20),
    noResponseAction: document.querySelector('input[name="assistant-no-response"]:checked')?.value || 'confirm',
  };
  try {
    applyResult(await api('PUT', '/api/crm/frontdesk-assistant', payload));
    await api('POST', '/api/crm/booking-approval', approvalPayload);
    await loadFrontDeskAssistant({ force: true });
    toast('Front Desk Assistant and booking rule saved.', 'success');
  } catch (error) {
    toast(error.message || 'Could not save the assistant.', 'error');
  }
}

export async function sendAssistantTest() {
  try {
    const result = applyResult(
      await api('POST', '/api/crm/frontdesk-assistant/test', {}),
      'Test text sent.'
    );
    return result;
  } catch (error) {
    toast(error.message || 'Could not send a test text.', 'error');
  }
}

export async function runAssistantCheckNow() {
  try {
    applyResult(
      await api('POST', '/api/crm/frontdesk-assistant/check-now', {}),
      'Front Desk asked for an availability update.'
    );
  } catch (error) {
    toast(error.message || 'Could not send that check.', 'error');
  }
}

export function saveAssistantContact() {
  const phone = crm.assistantData?.capabilities?.assistantPhone || '';
  if (!phone) {
    return toast('The Front Desk number is not available yet.', 'error');
  }
  try {
    const nativeHandler = window.webkit?.messageHandlers?.marketelShell;
    if (nativeHandler && typeof nativeHandler.postMessage === 'function') {
      nativeHandler.postMessage({
        type: 'saveContact',
        name: 'Marketel Front Desk',
        phone,
      });
      return;
    }
  } catch (_) {}

  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Marketel Front Desk',
    'ORG:Marketel',
    `TEL;TYPE=CELL:${phone}`,
    'NOTE:If a walk-in or another channel takes a room, text what happened. Marketel Front Desk updates Availability and your direct booking page.',
    'END:VCARD',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Marketel-Front-Desk.vcf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function activateFromAssistant() {
  if (typeof window.isNativeFrontdeskApp === 'function' && window.isNativeFrontdeskApp()) {
    closeFrontDeskAssistant();
    toast('Front Desk app access is managed with your Marketel account.', 'info');
    return;
  }
  closeFrontDeskAssistant();
  try {
    const module = await window.loadSettingsModule?.();
    const activate = window.goLive || module?.goLive;
    if (typeof activate === 'function') {
      activate();
      return;
    }
  } catch (_) {}
  toast('Open Your page to activate Marketel.', 'info');
}

const exportsForWindow = {
  activateFromAssistant,
  addAssistantRecipient,
  closeFrontDeskAssistant,
  loadFrontDeskAssistant,
  openFrontDeskAssistant,
  removeAssistantRecipient,
  refreshFrontDeskAssistantSheet,
  renderFrontDeskAssistantCard,
  renderAssistantPill,
  hideAssistantPill,
  retryFrontDeskAssistant,
  resendAssistantCode,
  runAssistantCheckNow,
  saveAssistantContact,
  saveAssistantSettings,
  sendAssistantTest,
  updateAssistantPolicySummary,
  updateAssistantTimeDisplay,
  verifyAssistantRecipient,
};

export function install() {
  if (installed) return;
  installed = true;
  ensureStyles();
  exposeToWindow(exportsForWindow);
}
