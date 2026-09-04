import { crm } from './state.js';
import { createAdaptiveTourLayout, createTourSpotlightClone } from './tour-layout.js';

function windowFn(name) {
  return typeof window !== 'undefined' && typeof window[name] === 'function'
    ? window[name]
    : null;
}

function ensureAppsViewRendered(...args) {
  return windowFn('ensureAppsViewRendered')?.(...args);
}

function showFinaleMockModal(...args) {
  return windowFn('showFinaleMockModal')?.(...args);
}

function finishTourHydration(...args) {
  return windowFn('finishTourHydration')?.(...args);
}

function goLive(...args) {
  return windowFn('goLive')?.(...args);
}

function toast(...args) {
  return windowFn('toast')?.(...args);
}

function appsCloseLightbox(...args) {
  return windowFn('appsCloseLightbox')?.(...args);
}

// ── APPS TOUR (page pointer walkthrough) ──────────────
let _appsTourSteps = [];
let _appsTourIdx = 0;
let _appsTourChainFromSettings = false;
let _appsTourKeyHandler = null;
let _appsTourTooltipTimer = null;
let _appsTourLayout = null;
let _appsTourSpotlight = null;

function ensureAppsTourStyles() {
  if (document.getElementById('frontdeskAppsTourStyle')) return;
  const style = document.createElement('style');
  style.id = 'frontdeskAppsTourStyle';
  style.textContent = `
    #appsTourLightbox {
      -webkit-backdrop-filter: blur(2.5px);
      backdrop-filter: blur(2.5px);
      animation: appsTourOverlayIn 0.18s ease-out;
    }
    #appsTourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .apps-tour-panel {
      width: 100%;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.26);
      max-height: calc(100vh - 28px);
      overflow-y: auto;
      animation: appsTourPanelIn 0.2s ease-out;
    }
    .apps-tour-progress {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .apps-tour-count {
      font-size: 11px;
      color: #6B7D72;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .apps-tour-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .apps-tour-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .apps-tour-kicker {
      font-size: 11px;
      color: #2E7D5B;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .apps-tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      letter-spacing: 0;
    }
    .apps-tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.5;
      margin: 0 0 14px;
    }
    .apps-tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .apps-tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .apps-tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .apps-tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .apps-tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .apps-tour-btn-primary {
      margin-left: auto;
      padding: 10px 18px;
      border-color: #2E7D5B;
      background: #2E7D5B;
      color: #fff;
      font-size: 14px;
      font-weight: 850;
      box-shadow: 0 8px 20px rgba(46,125,91,0.22);
    }
    @media (max-width: 420px) {
      .apps-tour-actions {
        flex-wrap: wrap;
      }
      .apps-tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @keyframes appsTourOverlayIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes appsTourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #appsTourLightbox,
      .apps-tour-panel {
        animation: none !important;
      }
      .apps-tour-fill {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeAppsTourHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function clearAppsTourKeyboard() {
  if (!_appsTourKeyHandler) return;
  document.removeEventListener('keydown', _appsTourKeyHandler);
  _appsTourKeyHandler = null;
}

function installAppsTourKeyboard(actions) {
  clearAppsTourKeyboard();
  _appsTourKeyHandler = (event) => {
    if (event.defaultPrevented) return;
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      actions.onSkip?.();
    } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      actions.onNext?.();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      actions.onBack?.();
    }
  };
  document.addEventListener('keydown', _appsTourKeyHandler);
}

function createAppsTourSpotlightClone(source, stepDef) {
  if (!source || !source.isConnected || stepDef?.noHighlight) return null;
  if (!source.dataset.appsTourOrigVisibility) source.dataset.appsTourOrigVisibility = source.style.visibility || '';
  _appsTourSpotlight?.destroy();
  _appsTourSpotlight = createTourSpotlightClone(source, {
    attribute: 'data-apps-tour-spotlight-clone',
    zIndex: 100002,
    hideSource: true,
    prepareClone(clone) {
      clone.style.boxShadow = stepDef?.spotlightBoxShadow ?? 'none';
      clone.style.outline = stepDef?.spotlightOutline ?? 'none';
      clone.style.outlineOffset = stepDef?.spotlightOutlineOffset ?? '0';
      if (source.classList.contains('apps-story-line') || stepDef?.hideSpotlightBorder) {
        clone.style.border = 'none';
        clone.style.borderTop = 'none';
        clone.style.borderTopWidth = '0';
        clone.style.paddingTop = '0';
      }
    },
  });
  return _appsTourSpotlight?.element || null;
}

function appsTourCleanupUi(options) {
  const opts = options || {};
  clearAppsTourKeyboard();
  _appsTourLayout?.destroy();
  _appsTourLayout = null;
  _appsTourSpotlight?.destroy();
  _appsTourSpotlight = null;
  if (_appsTourTooltipTimer) {
    clearTimeout(_appsTourTooltipTimer);
    _appsTourTooltipTimer = null;
  }
  const lb = document.getElementById('appsTourLightbox');
  // keepLightbox: persist the dim between steps so it doesn't flash off/on.
  if (lb && !opts.keepLightbox) lb.remove();
  const tip = document.getElementById('appsTourTooltip');
  if (tip) tip.remove();
  document.querySelectorAll('[data-apps-tour-spotlight-clone]').forEach((el) => el.remove());
  document.querySelectorAll('[data-apps-tour-highlighted]').forEach((el) => {
    el.style.position = el.dataset.appsTourOrigPosition || '';
    el.style.zIndex = el.dataset.appsTourOrigZIndex || '';
    el.style.isolation = el.dataset.appsTourOrigIsolation || '';
    el.style.boxShadow = el.dataset.appsTourOrigBoxShadow || '';
    el.style.outline = el.dataset.appsTourOrigOutline || '';
    el.style.outlineOffset = el.dataset.appsTourOrigOutlineOffset || '';
    el.style.transition = el.dataset.appsTourOrigTransition || '';
    el.style.visibility = el.dataset.appsTourOrigVisibility || '';
    if (el.dataset.appsTourOrigBorderTop != null) {
      el.style.borderTop = el.dataset.appsTourOrigBorderTop;
      el.style.paddingTop = el.dataset.appsTourOrigPaddingTop || '';
      delete el.dataset.appsTourOrigBorderTop;
      delete el.dataset.appsTourOrigPaddingTop;
    }
    el.removeAttribute('data-apps-tour-highlighted');
    delete el.dataset.appsTourOrigPosition;
    delete el.dataset.appsTourOrigZIndex;
    delete el.dataset.appsTourOrigIsolation;
    delete el.dataset.appsTourOrigBoxShadow;
    delete el.dataset.appsTourOrigOutline;
    delete el.dataset.appsTourOrigOutlineOffset;
    delete el.dataset.appsTourOrigTransition;
    delete el.dataset.appsTourOrigVisibility;
  });
}

function appsTourClose(markDone) {
  appsTourCleanupUi();
  document.body.style.overflow = '';
  const wasChain = _appsTourChainFromSettings;
  _appsTourChainFromSettings = false;
  try {
    const refresh = (typeof ensureAppsViewRendered === 'function')
      ? ensureAppsViewRendered
      : window.ensureAppsViewRendered;
    if (typeof refresh === 'function') refresh(true);
  } catch (_) {}
  if (markDone) {
    localStorage.setItem('appsTourDone', '1');
    const chainedFromSettings = wasChain
      || localStorage.getItem('settingsTourStep') === 'handoff'
      || crm.settingsTourActive;
    if (chainedFromSettings) {
      const finale = (typeof showFinaleMockModal === 'function')
        ? showFinaleMockModal
        : window.showFinaleMockModal;
      if (typeof finale === 'function') {
        finale();
        return;
      }
    }
  }
}

function appsTourNav(dir) {
  const next = _appsTourIdx + dir;
  if (next < 0 || next >= _appsTourSteps.length) return;
  _appsTourIdx = next;
  appsTourRender();
}

function appsTourMarkCompleteFromFinalStep() {
  localStorage.setItem('appsTourDone', '1');
  const chainedFromSettings = _appsTourChainFromSettings
    || localStorage.getItem('settingsTourStep') === 'handoff'
    || crm.settingsTourActive;
  if (chainedFromSettings) {
    crm.settingsTourActive = false;
    localStorage.setItem('settingsTourDone', '1');
    localStorage.removeItem('settingsTourStep');
    const finish = (typeof finishTourHydration === 'function')
      ? finishTourHydration
      : window.finishTourHydration;
    if (typeof finish === 'function') finish();
  }
}

function appsTourActivateFromFinalStep() {
  appsTourMarkCompleteFromFinalStep();
  const go = (typeof goLive === 'function') ? goLive : window.goLive;
  appsTourClose(false);
  if (typeof go === 'function') {
    go();
    return;
  }
  const notify = (typeof toast === 'function') ? toast : window.toast;
  if (typeof notify === 'function') notify('Open Go live to activate your booking page.', 'error');
}

function appsTourRender() {
  ensureAppsTourStyles();
  const step = _appsTourSteps[_appsTourIdx];
  if (!step) {
    appsTourClose(true);
    return;
  }
  const total = _appsTourSteps.length;
  const isLast = _appsTourIdx >= total - 1;
  const counter = `${_appsTourIdx + 1} / ${total}`;
  const progress = Math.max(8, Math.min(100, Math.round(((_appsTourIdx + 1) / total) * 100)));
  const target = document.querySelector(step.target);
  if (!target) {
    _appsTourIdx++;
    appsTourRender();
    return;
  }

  appsTourCleanupUi({ keepLightbox: true });
  let lb = document.getElementById('appsTourLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'appsTourLightbox';
    // Stronger dim so the elevated step content (text/card) reads as the focus.
    lb.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;';
    document.body.appendChild(lb);
  }

  if (!step.noHighlight) {
    target.dataset.appsTourOrigPosition = target.style.position || '';
    target.dataset.appsTourOrigZIndex = target.style.zIndex || '';
    target.dataset.appsTourOrigIsolation = target.style.isolation || '';
    target.dataset.appsTourOrigBoxShadow = target.style.boxShadow || '';
    target.dataset.appsTourOrigOutline = target.style.outline || '';
    target.dataset.appsTourOrigOutlineOffset = target.style.outlineOffset || '';
    target.dataset.appsTourOrigTransition = target.style.transition || '';
    target.style.position = target.style.position || 'relative';
    target.style.zIndex = '100002';
    target.style.isolation = 'isolate';
    target.style.transition = 'box-shadow 0.18s ease, outline 0.18s ease';
    // Content punches through the dim — no bounding-box outline.
    target.style.boxShadow = step.spotlightBoxShadow ?? 'none';
    target.style.outline = step.spotlightOutline ?? 'none';
    target.style.outlineOffset = step.spotlightOutlineOffset ?? '0';
    if (target.classList.contains('apps-story-line') || step.hideSpotlightBorder) {
      target.dataset.appsTourOrigBorderTop = target.style.borderTop || '';
      target.dataset.appsTourOrigPaddingTop = target.style.paddingTop || '';
      target.style.borderTop = 'none';
      target.style.paddingTop = '0';
    }
    target.setAttribute('data-apps-tour-highlighted', '1');
  }

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBlock = step.scrollBlock || 'nearest';
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
  target.scrollIntoView({ behavior: scrollBehavior, block: scrollBlock });

  const placeTooltip = () => {
    const old = document.getElementById('appsTourTooltip');
    if (old) old.remove();
    const maxWidth = Math.min(370, window.innerWidth - 28);
    const primaryLabel = step.primaryLabel || (isLast ? 'Done' : 'Next');
    const secondaryLabel = step.secondaryLabel || (isLast ? 'Not now' : 'Skip tour');
    const backDisabled = _appsTourIdx <= 0;
    const kicker = step.kicker || 'Guestel';
    const tip = document.createElement('div');
    tip.id = 'appsTourTooltip';
    tip.style.cssText = `position:fixed;z-index:100003;left:12px;top:14px;width:${maxWidth}px;max-width:${maxWidth}px;visibility:hidden;`;
    tip.innerHTML = `
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${escapeAppsTourHtml(step.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${counter}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${progress}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${escapeAppsTourHtml(kicker)}</div>
        <div class="apps-tour-title">${escapeAppsTourHtml(step.title)}</div>
        <p class="apps-tour-copy">${escapeAppsTourHtml(step.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${backDisabled ? 'disabled' : ''}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${escapeAppsTourHtml(secondaryLabel)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${escapeAppsTourHtml(primaryLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(tip);

    createAppsTourSpotlightClone(target, step);
    const panel = tip.querySelector('.apps-tour-panel');
    _appsTourLayout?.destroy();
    _appsTourLayout = createAdaptiveTourLayout({
      tooltip: tip,
      panel,
      target,
      anchor: target,
      spotlight: _appsTourSpotlight,
      options: {
        preferredPlacement: step.tooltipPosition || 'auto',
        maxWidth,
        gap: step.tooltipGap ?? 10,
        autoScroll: true,
        avoidBottomSelectors: ['.mobile-bottom-nav', '#previewSiteBar'],
      },
    });
    tip.style.visibility = 'visible';

    const nextAction = () => {
      if (step.activateOnNext) {
        appsTourActivateFromFinalStep();
        return;
      }
      if (isLast) {
        appsTourMarkCompleteFromFinalStep();
        appsTourClose(false);
        if (step.openGuestInstallCoachOnNext) {
          window.setTimeout(() => windowFn('appsOpenGuestInstallCoach')?.(), 0);
        }
        return;
      }
      _appsTourIdx++;
      appsTourRender();
    };
    const skipAction = () => {
      if (isLast) {
        appsTourMarkCompleteFromFinalStep();
        appsTourClose(false);
        return;
      }
      appsTourClose(true);
    };
    const backAction = () => {
      if (_appsTourIdx <= 0) return;
      _appsTourIdx--;
      appsTourRender();
    };
    document.getElementById('appsTourNextBtn').onclick = nextAction;
    document.getElementById('appsTourSkipBtn').onclick = skipAction;
    const backBtn = document.getElementById('appsTourBackBtn');
    if (backBtn) backBtn.onclick = backAction;
    installAppsTourKeyboard({ onNext: nextAction, onBack: backAction, onSkip: skipAction });
  };
  const tooltipDelay = prefersReducedMotion ? 40 : 320;
  _appsTourTooltipTimer = setTimeout(() => {
    requestAnimationFrame(placeTooltip);
  }, tooltipDelay);
}

function startAppsTour(opts) {
  const replay = opts && opts.replay;
  const chainFromSettings = opts && opts.chainFromSettingsTour;
  if (!replay && !chainFromSettings && localStorage.getItem('appsTourDone')) return;
  if (document.getElementById('appsTourLightbox') || document.getElementById('appsTourTooltip')) return;

  appsCloseLightbox();
  appsTourClose(false);
  _appsTourChainFromSettings = !!chainFromSettings;

  const hotelIsLive = !!crm.hotelSubscribed;
  const nativeMode = !!windowFn('isNativeFrontdeskApp')?.()
    || document.body.classList.contains('frontdesk-editor-preview')
    || new URLSearchParams(window.location.search).get('previewEditor') === '1';
  _appsTourSteps = nativeMode ? [
    {
      target: '#tour-guest-reach',
      kicker: 'Guestel updates',
      title: 'Reach guests who choose to hear from you.',
      text: 'Guests who keep your property in Guestel and allow property updates can receive a notification from you.',
      tooltipPosition: 'above',
    },
    {
      target: '#tour-native-guest-share',
      kicker: 'Invite guests',
      title: 'Give them one Guestel link.',
      text: 'Show the QR or copy the Guestel link. Guests can book immediately, then keep your property and stay in Guestel.',
      tooltipPosition: 'above',
    },
    {
      target: '#tour-guest-icon-section',
      kicker: 'Make it yours',
      title: 'Choose how your property appears.',
      text: 'Use your logo or a clear property photo for your Guestel card.',
      scrollBlock: 'start',
      tooltipPosition: 'below',
    },
  ] : [
    {
      target: '#tour-apps-intro',
      kicker: 'The loop',
      title: 'One system with a clear side for you and for guests.',
      text: 'You use Marketel Front Desk. Guests use Guestel and your direct booking experience.',
    },
    {
      target: '#tour-apps-first',
      kicker: 'Your side',
      title: 'Download Marketel Front Desk.',
      text: 'The owner app receives new-booking alerts even when the web dashboard is closed. Guests do not download this app.',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
    },
    {
      target: '#tour-apps-then',
      kicker: 'Their side',
      title: 'Guests keep your property in Guestel.',
      text: 'They tap Add on your booking page. Guestel keeps your property, reservations, and messages together.',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
    },
    {
      target: '#tour-apps-after',
      kicker: 'Direct reach',
      title: 'Send a notification to their phone whenever you want.',
      text: 'Anyone who keeps your property in Guestel and opts into property updates becomes reachable from Marketel Front Desk.',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
    },
    {
      target: '#tour-guest-icon-section',
      kicker: 'One setup item',
      title: 'Make the Guestel card feel like your property.',
      text: 'Use a real logo or a clear property photo.',
      scrollBlock: 'start',
      tooltipPosition: 'auto',
      tooltipGap: 10,
    },
    {
      target: '#tour-apps-loop',
      kicker: hotelIsLive ? 'Live loop' : 'Activation',
      title: hotelIsLive ? 'This loop is on.' : 'Everything is ready to turn on.',
      text: hotelIsLive
        ? 'Guests book, keep your property in Guestel, receive opted-in updates, and message you. Front Desk gets the alerts.'
        : (crm.marketelTrialEligible !== false
          ? 'Start with 14 days of full access for $0 today. Guests can book direct, keep your property in Guestel, receive opted-in updates, and message you — while Front Desk receives the alerts.'
          : 'Reactivate Marketel so guests can book direct, keep your property in Guestel, receive opted-in updates, and message you — while Front Desk receives the alerts.'),
      primaryLabel: hotelIsLive ? 'Done' : (crm.marketelTrialEligible !== false ? 'Start 14 days free' : 'Reactivate Marketel'),
      secondaryLabel: hotelIsLive ? 'Close' : 'Keep exploring',
      activateOnNext: !hotelIsLive,
      tooltipPosition: 'below',
      tooltipGap: 8,
    },
  ];

  _appsTourIdx = 0;
  appsTourRender();
}

export {
  appsTourCleanupUi,
  appsTourClose,
  appsTourNav,
  appsTourRender,
  startAppsTour,
};
