import { crm } from './state.js';

const DONE_KEY = 'marketelNativeOnboardingV1Done';
const STATE_KEY = 'marketelNativeOnboardingV1State';
const CONTACT_KEY = 'marketelNativeFrontDeskContactV1';
const POLICY_KEY = 'marketelNativeBookingFallbackV1';
const FRONT_DESK_PHONE = '+18339830801';
const STYLE_ID = 'marketelNativeOnboardingStyles';
const OVERLAY_ID = 'marketelNativeOnboarding';

const OPERATIONAL_STEPS = [
  {
    filter: 'settings',
    eyebrow: 'Your Page',
    title: 'Make it yours.',
    body: 'Change rooms, photos, prices and the details guests see. Your direct booking page stays live while you manage it here.',
    note: 'This is the control room for your booking page.',
    tabPosition: '12.5%',
  },
  {
    filter: 'bookings',
    eyebrow: 'Bookings',
    title: 'You decide what happens.',
    body: 'New room requests arrive here. Keep or release them in one tap, and your no-answer rule handles the moments you miss.',
    note: 'Every pending card shows the countdown and your fallback before you act.',
    tabPosition: '37.5%',
  },
  {
    filter: 'availability',
    eyebrow: 'Availability',
    title: 'Keep the real world in sync.',
    body: 'Block a room when a walk-in takes it, or let Front Desk Assistant update availability from your reply.',
    note: 'If Front Desk knows, the booking page knows.',
    tabPosition: '62.5%',
  },
  {
    filter: 'apps',
    eyebrow: 'Guest App',
    title: 'Get on their phone. Then reach it.',
    body: 'Once a guest downloads your app and turns on notifications, you can send a push notification directly to their phone whenever you want.',
    note: 'Share the QR or link, then use Show installation steps to guide them through the exact Safari buttons.',
    tabPosition: '87.5%',
  },
];

let installed = false;
let session = null;

function isNativeApp() {
  return window.location.protocol === 'capacitor:'
    || window.location.protocol === 'ionic:'
    || new URLSearchParams(window.location.search).get('native') === 'ios';
}

function postNative(message) {
  try {
    const handler = window.webkit?.messageHandlers?.marketelShell;
    if (!handler || typeof handler.postMessage !== 'function') return false;
    handler.postMessage(message);
    return true;
  } catch (_) {
    return false;
  }
}

function setShellVisible(visible) {
  if (typeof window.setNativeShellVisible === 'function') {
    window.setNativeShellVisible(visible);
    return;
  }
  postNative({ type: 'visibility', visible });
}

function setTourMode(active) {
  postNative({ type: 'tourMode', active: !!active });
}

function requestNativeNotifications() {
  postNative({ type: 'requestNotifications' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function propertyName() {
  return String(crm.activeHotelName || 'your property').trim() || 'your property';
}

function readBoolean(key) {
  try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
}

function readPolicy() {
  try { return localStorage.getItem(POLICY_KEY) === 'release' ? 'release' : 'confirm'; } catch (_) { return 'confirm'; }
}

function saveSessionState() {
  if (!session) return;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      phase: session.phase,
      step: session.step,
      contactSaved: session.contactSaved,
      noResponseAction: session.noResponseAction,
    }));
  } catch (_) {}
}

function readSessionState() {
  try {
    const value = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (!value || !['intro', 'tour'].includes(value.phase)) return null;
    const maxStep = value.phase === 'intro' ? 2 : OPERATIONAL_STEPS.length - 1;
    return {
      phase: value.phase,
      step: Math.max(0, Math.min(Number(value.step) || 0, maxStep)),
      contactSaved: value.contactSaved === true || readBoolean(CONTACT_KEY),
      noResponseAction: value.noResponseAction === 'release' ? 'release' : readPolicy(),
    };
  } catch (_) {
    return null;
  }
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.marketel-native-tour-open,
    html.marketel-native-tour-open body {
      overflow: hidden !important;
      overscroll-behavior: none;
    }

    #${OVERLAY_ID} {
      --native-green: #2E7D5B;
      --native-green-light: #4CAF7D;
      --native-green-dark: #205B43;
      --native-ink: #16231C;
      --native-muted: #65736B;
      --native-surface: #EEF2EF;
      --native-line: rgba(46, 77, 60, .13);
      --native-glass: rgba(255, 255, 255, 0.55);
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      z-index: 2147483000;
      color: var(--native-ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    #${OVERLAY_ID} * {
      box-sizing: border-box;
    }

    .mno-intro {
      width: 100%;
      height: 100%;
      height: 100dvh;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background:
        radial-gradient(ellipse 120% 50% at 80% 5%, rgba(76, 175, 125, 0.12), transparent),
        radial-gradient(ellipse 100% 60% at 10% 90%, rgba(200, 225, 210, 0.55), transparent),
        radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255, 255, 255, 0.35), transparent),
        linear-gradient(168deg, #f0f5f2 0%, #f6f9f7 40%, #edf3ef 100%);
      padding:
        max(18px, env(safe-area-inset-top))
        20px
        max(20px, env(safe-area-inset-bottom));
    }

    .mno-intro::before {
      content: "";
      position: absolute;
      width: 260px;
      height: 260px;
      border-radius: 999px;
      border: 1px solid rgba(46, 125, 91, .08);
      top: 14%;
      right: -155px;
      box-shadow:
        0 0 0 38px rgba(46, 125, 91, .025),
        0 0 0 80px rgba(46, 125, 91, .015);
      pointer-events: none;
      animation: mno-float 8s ease-in-out infinite;
    }

    .mno-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 42px;
      position: relative;
      z-index: 2;
      flex: 0 0 auto;
    }

    .mno-wordmark {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-size: 14px;
      font-weight: 760;
      letter-spacing: -.01em;
    }

    .mno-mark {
      width: 27px;
      height: 30px;
      flex: 0 0 auto;
      display: block;
      object-fit: contain;
    }

    .mno-skip,
    .mno-back {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--native-muted);
      font: inherit;
      font-size: 14px;
      font-weight: 650;
      padding: 10px 3px;
    }

    .mno-main {
      position: relative;
      z-index: 1;
      flex: 1 1 auto;
      min-height: 0;
      width: min(100%, 520px);
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: safe center;
      padding: 18px 0 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: none;
    }

    .mno-main::-webkit-scrollbar { display: none; }

    .mno-stage {
      animation: mno-enter .45s cubic-bezier(.2, .8, .2, 1) both;
    }

    .mno-kicker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: transparent;
      font-size: 11px;
      line-height: 1;
      font-weight: 850;
      letter-spacing: .13em;
      text-transform: uppercase;
      margin-bottom: 14px;
      background: linear-gradient(135deg, var(--native-green), var(--native-green-light));
      -webkit-background-clip: text;
      background-clip: text;
    }

    .mno-kicker::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #55A67A;
      box-shadow: 0 0 0 5px rgba(85, 166, 122, .15), 0 0 12px rgba(85, 166, 122, .2);
    }

    .mno-title {
      max-width: 430px;
      margin: 0;
      font-size: clamp(34px, 9.2vw, 48px);
      line-height: .99;
      letter-spacing: -.052em;
      font-weight: 850;
      text-shadow: 0 1px 2px rgba(23, 38, 31, 0.04);
    }

    .mno-copy {
      max-width: 440px;
      margin: 17px 0 0;
      color: var(--native-muted);
      font-size: 16px;
      line-height: 1.5;
      letter-spacing: -.012em;
    }

    .mno-property-card {
      margin-top: 29px;
      border: 1px solid rgba(212, 228, 218, 0.5);
      border-radius: 24px;
      padding: 16px;
      background: var(--native-glass);
      box-shadow:
        0 2px 4px rgba(43, 73, 56, 0.03),
        0 12px 28px rgba(43, 73, 56, 0.06),
        0 24px 58px rgba(43, 73, 56, 0.10),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(22px) saturate(1.3);
      -webkit-backdrop-filter: blur(22px) saturate(1.3);
      animation: mno-card-up .5s cubic-bezier(.16,1,.3,1) .15s both;
    }

    .mno-property-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mno-property-icon {
      width: 48px;
      height: 48px;
      border-radius: 15px;
      display: grid;
      place-items: center;
      color: #fff;
      background: linear-gradient(145deg, var(--native-green-light), var(--native-green-dark));
      box-shadow: inset 0 1px rgba(255,255,255,.35), 0 6px 16px rgba(46,125,91,.22), 0 0 0 3px rgba(46,125,91,.06);
      font-size: 19px;
      font-weight: 800;
    }

    .mno-property-name {
      min-width: 0;
      font-size: 16px;
      font-weight: 760;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mno-property-status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      color: var(--native-green-dark);
      font-size: 12px;
      font-weight: 680;
    }

    .mno-property-status::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #39A96B;
      box-shadow: 0 0 0 3px rgba(57,169,107,.12);
    }

    .mno-feature-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .mno-feature {
      min-width: 0;
      border-radius: 14px;
      padding: 11px 8px;
      background: rgba(238, 242, 239, 0.6);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(228, 238, 232, 0.4);
      color: #4D5C53;
      text-align: center;
      font-size: 11px;
      line-height: 1.25;
      font-weight: 690;
      transition: transform 200ms ease;
    }

    .mno-feature:active {
      transform: scale(0.97);
    }

    .mno-feature strong {
      display: block;
      color: var(--native-ink);
      font-size: 14px;
      margin-bottom: 3px;
    }

    .mno-assistant-card {
      position: relative;
      margin-top: 24px;
      padding: 16px 14px 15px;
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(214, 226, 218, 0.5);
      box-shadow:
        0 2px 4px rgba(31, 61, 44, 0.03),
        0 12px 28px rgba(31, 61, 44, 0.07),
        0 26px 60px rgba(31, 61, 44, 0.11),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
      overflow: hidden;
      animation: mno-card-up .5s cubic-bezier(.16,1,.3,1) .15s both;
    }

    .mno-assistant-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 72px;
      background: linear-gradient(180deg, rgba(114, 178, 143, .11), transparent);
      pointer-events: none;
    }

    .mno-fallback {
      position: relative;
      display: grid;
      gap: 8px;
      margin-top: 13px;
      padding-top: 13px;
      border-top: 1px solid rgba(46, 77, 60, .1);
    }

    .mno-fallback > strong {
      color: #34493e;
      font-size: 11px;
    }

    .mno-fallback-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
    }

    .mno-fallback-options button {
      display: grid;
      gap: 2px;
      min-width: 0;
      padding: 9px 8px;
      text-align: left;
      color: #64766c;
      border: 1px solid rgba(46, 77, 60, .13);
      border-radius: 12px;
      background: rgba(246, 249, 247, .86);
      font-family: inherit;
    }

    .mno-fallback-options button.is-selected {
      color: var(--native-green-dark);
      border-color: var(--native-green);
      background: #e8f5ee;
    }

    .mno-fallback-options b { overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap; }
    .mno-fallback-options span { font-size:8.5px; }
    .mno-fallback > small { color:#718379;font-size:9px;line-height:1.35; }

    .mno-assistant-head {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 1px 2px 13px;
    }

    .mno-assistant-avatar {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: var(--native-green);
      color: #fff;
      font-weight: 850;
      box-shadow: 0 6px 16px rgba(46,125,91,.22);
    }

    .mno-assistant-name {
      font-size: 13px;
      font-weight: 780;
    }

    .mno-assistant-state {
      margin-top: 2px;
      color: #678071;
      font-size: 10px;
      font-weight: 650;
    }

    .mno-preview-pill {
      margin-left: auto;
      border-radius: 999px;
      padding: 5px 8px;
      background: #E7F3EC;
      color: var(--native-green-dark);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .07em;
      text-transform: uppercase;
    }

    .mno-chat {
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }

    .mno-bubble {
      width: fit-content;
      max-width: 86%;
      border-radius: 15px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(8px) scale(.98);
      animation: mno-message .38s cubic-bezier(.2,.8,.2,1) forwards;
    }

    .mno-bubble.assistant {
      align-self: flex-start;
      border-bottom-left-radius: 5px;
      background: #E9EEEA;
      color: #26352C;
    }

    .mno-bubble.owner {
      align-self: flex-end;
      border-bottom-right-radius: 5px;
      background: linear-gradient(135deg, var(--native-green-light), var(--native-green));
      color: #fff;
      animation-delay: .72s;
    }

    .mno-bubble.final {
      animation-delay: 1.42s;
    }

    .mno-contact-strip {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-top: 12px;
      padding: 11px 12px;
      border: 1px solid rgba(214, 226, 218, 0.5);
      border-left: 3px solid var(--native-green);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .mno-contact-strip .mno-assistant-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      flex: 0 0 auto;
    }

    .mno-contact-title {
      font-size: 12px;
      font-weight: 760;
    }

    .mno-contact-number {
      margin-top: 2px;
      color: var(--native-muted);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    .mno-contact-check {
      margin-left: auto;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: linear-gradient(145deg, var(--native-green-light), var(--native-green));
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 4px 12px rgba(46, 125, 91, 0.2);
      animation: mno-check-in .4s cubic-bezier(.16,1,.3,1) both;
    }

    .mno-ready-list {
      display: grid;
      gap: 10px;
      margin-top: 27px;
    }

    .mno-ready-item {
      display: flex;
      align-items: center;
      gap: 13px;
      border-radius: 17px;
      padding: 13px 14px;
      border: 1px solid rgba(228, 238, 232, 0.5);
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: mno-item-in .4s cubic-bezier(.16,1,.3,1) both;
      animation-delay: calc(var(--i, 0) * 80ms + 150ms);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .mno-ready-item:active {
      transform: scale(0.98);
    }

    .mno-ready-number {
      width: 29px;
      height: 29px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: linear-gradient(145deg, rgba(220, 234, 226, 0.8), rgba(200, 222, 210, 0.6));
      color: var(--native-green-dark);
      font-size: 12px;
      font-weight: 850;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .mno-ready-item strong {
      display: block;
      font-size: 13px;
      line-height: 1.2;
    }

    .mno-ready-item span {
      display: block;
      margin-top: 3px;
      color: var(--native-muted);
      font-size: 11px;
      line-height: 1.3;
    }

    .mno-footer {
      position: relative;
      z-index: 2;
      width: min(100%, 520px);
      margin: 0 auto;
      flex: 0 0 auto;
    }

    .mno-primary,
    .mno-secondary {
      width: 100%;
      appearance: none;
      border: 0;
      border-radius: 16px;
      min-height: 54px;
      padding: 14px 18px;
      font: inherit;
      font-size: 15px;
      font-weight: 780;
      letter-spacing: -.01em;
    }

    .mno-primary {
      position: relative;
      color: #fff;
      background: linear-gradient(135deg, var(--native-green-light) 0%, var(--native-green) 50%, var(--native-green-dark) 100%);
      box-shadow: 0 6px 16px rgba(46,125,91,.2), 0 13px 32px rgba(46,125,91,.18);
      overflow: hidden;
    }

    .mno-primary::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 38%, rgba(255,255,255,.18) 50%, transparent 62%);
      animation: mno-shimmer 3.5s ease-in-out infinite;
      pointer-events: none;
    }

    .mno-primary:active {
      transform: scale(.985);
    }

    .mno-primary:disabled::after {
      animation: none;
    }

    .mno-secondary {
      min-height: 42px;
      margin-top: 5px;
      color: var(--native-muted);
      background: transparent;
      font-size: 13px;
    }

    .mno-progress {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 13px;
    }

    .mno-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: rgba(70, 91, 79, .18);
      transition: width .28s ease, background .28s ease, box-shadow .28s ease;
    }

    .mno-dot.active {
      width: 22px;
      background: linear-gradient(90deg, var(--native-green), var(--native-green-light));
      box-shadow: 0 0 10px rgba(46, 125, 91, 0.3);
    }

    .mno-status-note {
      min-height: 17px;
      margin: 8px 0 -2px;
      color: var(--native-green-dark);
      font-size: 11px;
      font-weight: 660;
      text-align: center;
    }

    .mno-tour {
      min-height: 100%;
      background: rgba(11, 24, 16, .30);
      backdrop-filter: blur(2.5px);
      -webkit-backdrop-filter: blur(2.5px);
      padding:
        max(14px, env(safe-area-inset-top))
        14px
        calc(max(10px, env(safe-area-inset-bottom)) + 84px);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .mno-tour-skip {
      position: absolute;
      top: max(15px, env(safe-area-inset-top));
      right: 15px;
      border: 1px solid rgba(255,255,255,.52);
      border-radius: 999px;
      padding: 9px 13px;
      color: #fff;
      background: rgba(21,35,27,.38);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      font: inherit;
      font-size: 12px;
      font-weight: 720;
    }

    .mno-coach-card {
      position: relative;
      width: min(100%, 520px);
      margin: 0 auto;
      border: 1px solid rgba(213, 226, 218, 0.5);
      border-radius: 24px;
      padding: 18px 17px 15px;
      background: rgba(249, 251, 249, .85);
      box-shadow:
        0 2px 4px rgba(0,0,0,0.03),
        0 12px 32px rgba(0,0,0,0.10),
        0 28px 72px rgba(0,0,0,0.20),
        inset 0 1px 0 rgba(255,255,255,0.8);
      backdrop-filter: blur(28px) saturate(1.4);
      -webkit-backdrop-filter: blur(28px) saturate(1.4);
      animation: mno-card-up .42s cubic-bezier(.16,1,.3,1) both;
    }

    .mno-coach-card::after {
      content: "";
      position: absolute;
      left: var(--tab-x);
      bottom: -10px;
      width: 19px;
      height: 19px;
      border-right: 1px solid rgba(255,255,255,.78);
      border-bottom: 1px solid rgba(255,255,255,.78);
      background: rgba(249, 251, 249, .98);
      transform: translateX(-50%) rotate(45deg);
    }

    .mno-coach-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 9px;
    }

    .mno-coach-eyebrow {
      color: transparent;
      font-size: 11px;
      font-weight: 850;
      letter-spacing: .12em;
      text-transform: uppercase;
      background: linear-gradient(135deg, var(--native-green), var(--native-green-light));
      -webkit-background-clip: text;
      background-clip: text;
    }

    .mno-coach-count {
      color: #7A877F;
      font-size: 11px;
      font-weight: 720;
      font-variant-numeric: tabular-nums;
    }

    .mno-coach-title {
      margin: 0;
      color: var(--native-ink);
      font-size: 24px;
      line-height: 1.04;
      letter-spacing: -.038em;
      font-weight: 820;
    }

    .mno-coach-body {
      margin: 10px 0 0;
      color: #637068;
      font-size: 13px;
      line-height: 1.45;
    }

    .mno-coach-note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      border-radius: 12px;
      padding: 9px 10px;
      color: #355844;
      background: rgba(232, 241, 235, 0.7);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(202, 225, 211, 0.4);
      font-size: 11px;
      line-height: 1.35;
      font-weight: 670;
    }

    .mno-coach-note::before {
      content: "✓";
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: #fff;
      background: linear-gradient(145deg, var(--native-green-light), var(--native-green));
      font-size: 10px;
      font-weight: 900;
      box-shadow: 0 3px 8px rgba(46, 125, 91, 0.18);
    }

    .mno-coach-actions {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .mno-coach-actions .mno-primary,
    .mno-coach-actions .mno-secondary {
      min-height: 45px;
      margin: 0;
      border-radius: 13px;
      font-size: 13px;
    }

    .mno-coach-actions .mno-secondary {
      border: 1px solid rgba(46, 77, 60, .11);
      background: #F0F3F1;
    }

    @keyframes mno-enter {
      from { opacity: 0; transform: translateY(9px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes mno-message {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes mno-card-up {
      from { opacity: 0; transform: translateY(18px) scale(.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes mno-shimmer {
      from { transform: translateX(-100%); }
      to { transform: translateX(100%); }
    }

    @keyframes mno-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    @keyframes mno-check-in {
      0% { opacity: 0; transform: scale(0.5); }
      60% { transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes mno-item-in {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-height: 720px) {
      .mno-intro { padding-top: max(10px, env(safe-area-inset-top)); }
      .mno-main { padding: 7px 0 5px; }
      .mno-title { font-size: 32px; }
      .mno-copy { margin-top: 11px; font-size: 14px; }
      .mno-property-card, .mno-assistant-card { margin-top: 14px; }
      .mno-ready-list { margin-top: 16px; gap: 7px; }
      .mno-ready-item { padding: 10px 12px; }
      .mno-bubble { padding: 8px 10px; font-size: 11px; }
      .mno-assistant-head { padding-bottom: 8px; }
      .mno-contact-strip { margin-top: 8px; padding: 8px 10px; }
      .mno-primary { min-height: 49px; }
      .mno-secondary { min-height: 36px; margin-top: 1px; padding-top: 8px; padding-bottom: 8px; }
      .mno-status-note { margin-top: 3px; font-size: 10px; }
      .mno-progress { margin-top: 8px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .mno-stage,
      .mno-coach-card,
      .mno-bubble,
      .mno-property-card,
      .mno-assistant-card,
      .mno-ready-item,
      .mno-contact-check,
      .mno-intro::before,
      .mno-primary::after {
        animation-duration: .01ms !important;
        animation-delay: 0ms !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function progressDots(active, count) {
  return Array.from({ length: count }, (_, index) =>
    `<span class="mno-dot${index === active ? ' active' : ''}" aria-hidden="true"></span>`
  ).join('');
}

function introStageHtml(step) {
  const name = escapeHtml(propertyName());
  const initial = escapeHtml(propertyName().charAt(0).toUpperCase());

  if (step === 0) {
    return `
      <div class="mno-stage">
        <div class="mno-kicker">Connected</div>
        <h1 class="mno-title">Front Desk is ready.</h1>
        <p class="mno-copy">Everything you need to run ${name} now lives on this phone.</p>
        <div class="mno-property-card">
          <div class="mno-property-row">
            <div class="mno-property-icon">${initial}</div>
            <div style="min-width:0;flex:1;">
              <div class="mno-property-name">${name}</div>
              <div class="mno-property-status">Booking page connected</div>
            </div>
          </div>
          <div class="mno-feature-row">
            <div class="mno-feature"><strong>Live</strong>Bookings</div>
            <div class="mno-feature"><strong>Synced</strong>Availability</div>
            <div class="mno-feature"><strong>Ready</strong>Guest app</div>
          </div>
        </div>
      </div>`;
  }

  if (step === 1) {
    const saved = !!session?.contactSaved;
    const releases = session?.noResponseAction === 'release';
    return `
      <div class="mno-stage">
        <div class="mno-kicker">A real second set of eyes</div>
        <h1 class="mno-title">Meet Front Desk Assistant.</h1>
        <p class="mno-copy">It checks in when a booking could collide with what happened at the property, then updates Front Desk from your reply.</p>
        <div class="mno-assistant-card">
          <div class="mno-assistant-head">
            <div class="mno-assistant-avatar">M</div>
            <div>
              <div class="mno-assistant-name">Marketel Front Desk</div>
              <div class="mno-assistant-state">Assistant conversation preview</div>
            </div>
            <div class="mno-preview-pill">Preview</div>
          </div>
          <div class="mno-chat">
            <div class="mno-bubble assistant">New direct booking: Queen Suite, tonight. Is it still free?</div>
            <div class="mno-bubble owner">A walk-in took it.</div>
            <div class="mno-bubble assistant final">Got it. I blocked tonight. I’ll ask before cancelling an existing guest.</div>
          </div>
          <div class="mno-fallback">
            <strong>If nobody answers a new-booking alert</strong>
            <div class="mno-fallback-options">
              <button type="button" data-mno-action="policy" data-mno-policy="confirm" class="${releases ? '' : 'is-selected'}"><b>Keep booking</b><span>Revenue first</span></button>
              <button type="button" data-mno-action="policy" data-mno-policy="release" class="${releases ? 'is-selected' : ''}"><b>Release request</b><span>Availability first</span></button>
            </div>
            <small>${releases ? 'No reply voids the $1 hold and notifies the guest.' : 'No reply confirms the booking automatically.'} You can change this anytime.</small>
          </div>
          <div class="mno-contact-strip">
            <div class="mno-assistant-avatar">M</div>
            <div>
              <div class="mno-contact-title">Marketel Front Desk</div>
              <div class="mno-contact-number">(833) 983-0801</div>
            </div>
            ${saved ? '<div class="mno-contact-check" aria-label="Contact saved">✓</div>' : ''}
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="mno-stage">
      <div class="mno-kicker">The essentials</div>
      <h1 class="mno-title">Four places. No maze.</h1>
      <p class="mno-copy">You already know what Marketel does. Here is where you run it.</p>
      <div class="mno-ready-list">
        <div class="mno-ready-item" style="--i:0">
          <div class="mno-ready-number">01</div>
          <div><strong>Shape the page</strong><span>Rooms, photos, rates and guest-facing details.</span></div>
        </div>
        <div class="mno-ready-item" style="--i:1">
          <div class="mno-ready-number">02</div>
          <div><strong>Run today</strong><span>Bookings and availability, without the clutter.</span></div>
        </div>
        <div class="mno-ready-item" style="--i:2">
          <div class="mno-ready-number">03</div>
          <div><strong>Bring guests back</strong><span>Share the app link or QR when they are ready.</span></div>
        </div>
      </div>
    </div>`;
}

function introFooterHtml(step) {
  if (step === 1 && !session.contactSaved) {
    return `
      <button class="mno-primary" type="button" data-mno-action="save-contact">Save Front Desk to Contacts</button>
      <button class="mno-secondary" type="button" data-mno-action="next">Continue without saving</button>
      <div class="mno-status-note">${session.contactAttempted ? 'No problem — you can save it later from Assistant.' : 'Save it now so you recognize Marketel when messages begin.'}</div>
      <div class="mno-progress">${progressDots(step, 3)}</div>`;
  }
  const label = step === 0 ? 'Set up Front Desk' : step === 1 ? 'Continue' : 'Show me the app';
  return `
    <button class="mno-primary" type="button" data-mno-action="next">${label}</button>
    <div class="mno-progress">${progressDots(step, 3)}</div>`;
}

function renderIntro() {
  setTourMode(false);
  setShellVisible(false);
  const overlay = getOverlay();
  overlay.innerHTML = `
    <section class="mno-intro" role="dialog" aria-modal="true" aria-label="Front Desk setup">
      <div class="mno-topline">
        <div class="mno-wordmark"><img class="mno-mark" src="/marketellogo.svg" alt="" aria-hidden="true">Front Desk</div>
        <button class="mno-skip" type="button" data-mno-action="skip">Skip</button>
      </div>
      <main class="mno-main">${introStageHtml(session.step)}</main>
      <footer class="mno-footer">
        ${introFooterHtml(session.step)}
      </footer>
    </section>`;
}

function selectOperationalTab(filter) {
  if (typeof window.marketelNativeSelectTab === 'function') {
    window.marketelNativeSelectTab(filter);
  }
}

function renderOperationalTour() {
  const step = OPERATIONAL_STEPS[session.step] || OPERATIONAL_STEPS[0];
  setShellVisible(true);
  setTourMode(true);
  selectOperationalTab(step.filter);
  const overlay = getOverlay();
  overlay.innerHTML = `
    <section class="mno-tour" role="dialog" aria-modal="true" aria-label="Front Desk walkthrough">
      <button class="mno-tour-skip" type="button" data-mno-action="skip">Skip tour</button>
      <div class="mno-coach-card" style="--tab-x:${step.tabPosition}">
        <div class="mno-coach-top">
          <span class="mno-coach-eyebrow">${escapeHtml(step.eyebrow)}</span>
          <span class="mno-coach-count">${session.step + 1} of ${OPERATIONAL_STEPS.length}</span>
        </div>
        <h2 class="mno-coach-title">${escapeHtml(step.title)}</h2>
        <p class="mno-coach-body">${escapeHtml(step.body)}</p>
        <div class="mno-coach-note">${escapeHtml(step.note)}</div>
        <div class="mno-coach-actions">
          <button class="mno-secondary" type="button" data-mno-action="back">Back</button>
          <button class="mno-primary" type="button" data-mno-action="next">${session.step === OPERATIONAL_STEPS.length - 1 ? 'Open Front Desk' : 'Next'}</button>
        </div>
      </div>
    </section>`;
}

function getOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', handleClick);
    document.body.appendChild(overlay);
  }
  return overlay;
}

function render() {
  if (!session) return;
  ensureStyles();
  document.documentElement.classList.add('marketel-native-tour-open');
  saveSessionState();
  if (session.phase === 'tour') renderOperationalTour();
  else renderIntro();
}

function handleClick(event) {
  const target = event.target?.closest?.('[data-mno-action]');
  if (!target || !session) return;
  const action = target.getAttribute('data-mno-action');
  if (action === 'next') next();
  else if (action === 'back') back();
  else if (action === 'skip') finish({ skipped: true });
  else if (action === 'save-contact') saveContact();
  else if (action === 'policy') selectNoResponsePolicy(target.getAttribute('data-mno-policy'));
}

function selectNoResponsePolicy(value) {
  if (!session) return;
  session.noResponseAction = value === 'release' ? 'release' : 'confirm';
  try { localStorage.setItem(POLICY_KEY, session.noResponseAction); } catch (_) {}
  saveSessionState();
  if (typeof window.api === 'function') {
    window.api('POST', '/api/crm/booking-approval', {
      noResponseAction: session.noResponseAction,
    }).catch(() => {});
  }
  render();
}

function next() {
  if (!session) return;
  if (session.phase === 'intro') {
    if (session.step < 2) {
      session.step += 1;
    } else {
      session.phase = 'tour';
      session.step = 0;
    }
  } else if (session.step < OPERATIONAL_STEPS.length - 1) {
    session.step += 1;
  } else {
    finish();
    return;
  }
  render();
}

function back() {
  if (!session) return;
  if (session.phase === 'tour') {
    if (session.step > 0) {
      session.step -= 1;
    } else {
      session.phase = 'intro';
      session.step = 2;
    }
  } else if (session.step > 0) {
    session.step -= 1;
  }
  render();
}

function saveContact() {
  if (!session) return;
  session.contactAttempted = true;
  saveSessionState();
  const opened = postNative({ type: 'saveContact', phone: FRONT_DESK_PHONE });
  if (!opened) render();
}

function cleanUp() {
  document.getElementById(OVERLAY_ID)?.remove();
  document.documentElement.classList.remove('marketel-native-tour-open');
  setTourMode(false);
  setShellVisible(true);
}

function finish({ skipped = false } = {}) {
  try {
    localStorage.setItem(DONE_KEY, '1');
    localStorage.removeItem(STATE_KEY);
  } catch (_) {}
  session = null;
  cleanUp();
  selectOperationalTab('bookings');
  requestNativeNotifications();
  if (!skipped && typeof window.toast === 'function') {
    window.toast('Front Desk is ready', 'success');
  }
}

function handleContactResult(saved) {
  if (!session) return;
  session.contactAttempted = true;
  session.contactSaved = saved === true;
  if (saved) {
    try { localStorage.setItem(CONTACT_KEY, '1'); } catch (_) {}
  }
  saveSessionState();
  if (session.phase === 'intro' && session.step === 1) render();
}

export function startNativeOnboarding({ replay = false } = {}) {
  if (!isNativeApp()) return false;
  if (session) cleanUp();
  const saved = !replay ? readSessionState() : null;
  session = saved || {
    phase: 'intro',
    step: 0,
    contactSaved: readBoolean(CONTACT_KEY),
    contactAttempted: false,
    noResponseAction: readPolicy(),
  };
  render();
  return true;
}

export function maybeStartNativeOnboarding() {
  if (!isNativeApp() || readBoolean(DONE_KEY)) return false;
  return startNativeOnboarding();
}

export function install() {
  if (installed) return;
  installed = true;
  window.marketelNativeContactResult = handleContactResult;
  window.startNativeOnboarding = startNativeOnboarding;
  window.maybeStartNativeOnboarding = maybeStartNativeOnboarding;
}
