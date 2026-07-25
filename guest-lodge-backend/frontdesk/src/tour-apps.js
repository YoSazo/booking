import { crm } from './state.js';

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

function stripAppsTourCloneIds(root) {
  root.removeAttribute('id');
  root.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
}

function syncAppsTourCloneFormValues(source, clone) {
  const sourceFields = source.querySelectorAll('input, textarea, select');
  const cloneFields = clone.querySelectorAll('input, textarea, select');
  sourceFields.forEach((field, idx) => {
    const cloneField = cloneFields[idx];
    if (!cloneField) return;
    if (field.type === 'checkbox' || field.type === 'radio') {
      cloneField.checked = field.checked;
    } else {
      cloneField.value = field.value;
    }
  });
}

function copyAppsTourCloneComputedStyles(source, clone) {
  const computed = getComputedStyle(source);
  for (const property of computed) {
    clone.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  const sourceChildren = source.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < sourceChildren.length; i += 1) {
    if (cloneChildren[i]) copyAppsTourCloneComputedStyles(sourceChildren[i], cloneChildren[i]);
  }
}

function createAppsTourSpotlightClone(source, stepDef) {
  if (!source || !source.isConnected) return null;
  if (stepDef?.noHighlight) return null;
  document.querySelectorAll('[data-apps-tour-spotlight-clone]').forEach((el) => el.remove());
  const rect = source.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;

  const clone = source.cloneNode(true);
  stripAppsTourCloneIds(clone);
  copyAppsTourCloneComputedStyles(source, clone);
  syncAppsTourCloneFormValues(source, clone);
  if (!source.dataset.appsTourOrigVisibility) source.dataset.appsTourOrigVisibility = source.style.visibility || '';
  source.style.visibility = 'hidden';
  clone.setAttribute('data-apps-tour-spotlight-clone', '1');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.maxWidth = 'none';
  clone.style.zIndex = '100002';
  clone.style.pointerEvents = 'none';
  clone.style.transform = 'none';
  // Focus is the content itself over the dim overlay — no square ring/outline.
  clone.style.boxShadow = stepDef?.spotlightBoxShadow ?? 'none';
  clone.style.outline = stepDef?.spotlightOutline ?? 'none';
  clone.style.outlineOffset = stepDef?.spotlightOutlineOffset ?? '0';
  // Story-line steps use a top border as a section separator; hide it in the
  // spotlight so it doesn't read as a floating weird line.
  if (source.classList.contains('apps-story-line') || stepDef?.hideSpotlightBorder) {
    clone.style.border = 'none';
    clone.style.borderTop = 'none';
    clone.style.borderTopWidth = '0';
    clone.style.paddingTop = '0';
  }
  document.body.appendChild(clone);
  return clone;
}

function appsTourCleanupUi(options) {
  const opts = options || {};
  clearAppsTourKeyboard();
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

function appsTourScrollParent(el) {
  let node = el && el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY || style.overflow;
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function appsTourScrollBy(el, delta) {
  if (!delta) return;
  const scroller = appsTourScrollParent(el);
  if (scroller) {
    scroller.scrollTop += delta;
    return;
  }
  window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
}

function appsTourPlacementForStep(step, isNarrowViewport) {
  return (isNarrowViewport && step.mobileTooltipPosition) || step.tooltipPosition || '';
}

function fitAppsTourTargetAndTooltip(target, step, tooltip, placement, isNarrowViewport) {
  if (!target || !target.isConnected || !tooltip) return target?.getBoundingClientRect() || null;
  const panel = tooltip.querySelector('.apps-tour-panel');
  const tipHeight = Math.min(
    (panel && panel.offsetHeight) || tooltip.offsetHeight || 190,
    Math.max(130, window.innerHeight - 28)
  );
  const gap = step.tooltipGap ?? 8;
  const topLimit = (isNarrowViewport ? step.mobileFitPadTop : step.fitPadTop) ?? 14;
  const bottomLimit = window.innerHeight - ((isNarrowViewport ? step.mobileFitPadBottom : step.fitPadBottom) ?? 14);

  let rect = target.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return rect;

  for (let i = 0; i < 3; i += 1) {
    const availableHeight = Math.max(120, bottomLimit - topLimit);
    const canFitPair = rect.height + gap + tipHeight <= availableHeight;
    let delta = 0;

    if (placement === 'above') {
      const topOverflow = rect.top - gap - tipHeight - topLimit;
      if (topOverflow < 0) delta = topOverflow;
      if (canFitPair && rect.bottom > bottomLimit) delta = rect.bottom - bottomLimit;
    } else {
      const bottomOverflow = rect.bottom + gap + tipHeight - bottomLimit;
      if (bottomOverflow > 0) delta = bottomOverflow;
      if (canFitPair && rect.top < topLimit) delta = rect.top - topLimit;
    }

    if (Math.abs(delta) < 1) break;
    appsTourScrollBy(target, delta);
    rect = target.getBoundingClientRect();
  }

  return rect;
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

function showGuestAppActivationModal() {
  if (crm.hotelSubscribed || document.getElementById('guestAppActivationOverlay')) return;
  ensureAppsTourStyles();

  const overlay = document.createElement('div');
  overlay.id = 'guestAppActivationOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100004;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;';
  overlay.innerHTML = `
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:390px;width:100%;max-height:calc(100vh - 48px);overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:appsTourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Ready</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Guest App + Front Desk is ready.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.58;margin:0 0 18px;">You just walked through the loop: guests book direct, save your property to their phone, and message you. Front Desk receives the alerts.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:15px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Direct booking page accepts reservations</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Guests save your property from the booking page</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Front Desk receives booking and message alerts</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">No OTA commission. Cancel anytime.</span></div>
          </div>
        </div>
        <button type="button" id="guestAppActivateNowBtn" style="width:100%;padding:15px 18px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">Activate - $199/mo</button>
        <button type="button" id="guestAppActivateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep inactive for now</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  if (!document.getElementById('tourModalAnimStyle')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'tourModalAnimStyle';
    animStyle.textContent = '@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(animStyle);
  }
  if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 0);

  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  document.getElementById('guestAppActivateNowBtn').onclick = () => {
    closeModal();
    const go = (typeof goLive === 'function') ? goLive : window.goLive;
    if (typeof go === 'function') {
      go();
      return;
    }
    const notify = (typeof toast === 'function') ? toast : window.toast;
    if (typeof notify === 'function') notify('Open Go live to activate your booking page.', 'error');
  };
  document.getElementById('guestAppActivateLaterBtn').onclick = closeModal;
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
  const isNarrowViewport = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  const scrollBlock = (isNarrowViewport && step.mobileScrollBlock) || step.scrollBlock || 'center';
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
  if (isNarrowViewport && step.mobileScrollToBottom) {
    const scrollHeight = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
    window.scrollTo({ top: scrollHeight, behavior: scrollBehavior });
    setTimeout(() => { window.scrollTo({ top: scrollHeight, behavior: 'auto' }); }, scrollBehavior === 'smooth' ? 520 : 0);
  } else {
    target.scrollIntoView({ behavior: scrollBehavior, block: scrollBlock });
  }

  const placeTooltip = () => {
    const old = document.getElementById('appsTourTooltip');
    if (old) old.remove();
    const maxWidth = Math.min(isNarrowViewport ? window.innerWidth - 24 : 370, window.innerWidth - 28);
    const preferredPosition = appsTourPlacementForStep(step, isNarrowViewport);
    const primaryLabel = step.primaryLabel || (isLast ? 'Done' : 'Next');
    const secondaryLabel = step.secondaryLabel || (isLast ? 'Not now' : 'Skip tour');
    const backDisabled = _appsTourIdx <= 0;
    const kicker = step.kicker || 'Guest App';
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

    if (isNarrowViewport && !preferredPosition) {
      createAppsTourSpotlightClone(target, step);
      tip.style.left = '12px';
      tip.style.right = '12px';
      tip.style.width = 'auto';
      tip.style.maxWidth = 'none';
      tip.style.top = 'auto';
      tip.style.bottom = 'calc(14px + env(safe-area-inset-bottom,0px))';
    } else {
      const placement = preferredPosition || 'below';
      const rect = fitAppsTourTargetAndTooltip(target, step, tip, placement, isNarrowViewport)
        || target.getBoundingClientRect();
      createAppsTourSpotlightClone(target, step);

      const panel = tip.querySelector('.apps-tour-panel');
      const tipHeight = Math.min((panel && panel.offsetHeight) || tip.offsetHeight || 190, Math.max(130, window.innerHeight - 28));
      const gap = step.tooltipGap ?? 8;
      const centerX = rect.left + rect.width / 2;
      const left = Math.max(14, Math.min(centerX - maxWidth / 2, window.innerWidth - maxWidth - 14));
      const placeBelow = placement !== 'above';
      const rawTop = placeBelow ? rect.bottom + gap : rect.top - tipHeight - gap;
      const top = Math.max(14, Math.min(rawTop, window.innerHeight - tipHeight - 14));
      tip.style.left = `${left}px`;
      tip.style.right = 'auto';
      tip.style.bottom = 'auto';
      tip.style.width = `${maxWidth}px`;
      tip.style.maxWidth = `${maxWidth}px`;
      tip.style.top = `${top}px`;
    }
    tip.style.visibility = 'visible';

    const nextAction = () => {
      if (step.activateOnNext) {
        appsTourActivateFromFinalStep();
        return;
      }
      if (isLast) {
        appsTourMarkCompleteFromFinalStep();
        appsTourClose(false);
        if (step.showActivationOnComplete) showGuestAppActivationModal();
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
  const tooltipDelay = isNarrowViewport && step.mobileScrollToBottom
    ? (prefersReducedMotion ? 80 : 680)
    : (prefersReducedMotion ? 40 : 320);
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
  _appsTourSteps = [
    {
      target: '#tour-apps-intro',
      kicker: 'The loop',
      title: 'Your property becomes the app.',
      text: 'Guests book direct, save your property to their phone, and come back with one tap.',
    },
    {
      target: '#tour-apps-first',
      kicker: 'Your side',
      title: 'Front Desk lives on this phone.',
      text: 'This dashboard, saved like an app. Booking alerts, guest messages, and QR tools land here.',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
      mobileScrollBlock: 'center',
      mobileTooltipPosition: 'below',
    },
    {
      target: '#tour-apps-then',
      kicker: 'Their side',
      title: 'Guests install from your booking page.',
      text: 'One tap on Install and your icon is on their home screen.',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
      mobileScrollBlock: 'center',
      mobileTooltipPosition: 'below',
    },
    {
      target: '#tour-guest-icon-section',
      kicker: 'One setup item',
      title: 'Make the icon feel like your property.',
      text: 'A real logo or a clear photo. Guests see this square every time.',
      mobileScrollToBottom: true,
      mobileScrollBlock: 'end',
      mobileTooltipAnchor: 'top',
      mobileTooltipPosition: 'above',
    },
    {
      target: '#tour-apps-loop',
      kicker: hotelIsLive ? 'Live loop' : 'Activation',
      title: hotelIsLive ? 'This loop is on.' : 'Turn this on for your property.',
      text: hotelIsLive
        ? 'Guests book, save your property, and message you. Front Desk gets the alerts.'
        : 'One activation turns it all on: direct booking, guest installs, messages, and alerts.',
      primaryLabel: hotelIsLive ? 'Done' : 'Continue to activation',
      secondaryLabel: hotelIsLive ? 'Close' : 'Not now',
      showActivationOnComplete: !hotelIsLive,
      mobileScrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8,
      mobileTooltipPosition: 'below',
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
