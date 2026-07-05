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

function createAppsTourSpotlightClone(source) {
  if (!source || !source.isConnected) return null;
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
  clone.style.boxShadow = '0 18px 46px rgba(26,43,34,0.24)';
  clone.style.outline = '1px solid rgba(255,255,255,0.82)';
  clone.style.outlineOffset = '2px';
  document.body.appendChild(clone);
  return clone;
}

function appsTourCleanupUi() {
  clearAppsTourKeyboard();
  if (_appsTourTooltipTimer) {
    clearTimeout(_appsTourTooltipTimer);
    _appsTourTooltipTimer = null;
  }
  const lb = document.getElementById('appsTourLightbox');
  if (lb) lb.remove();
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

function applyAppsTourScrollPadding(target, step, isNarrowViewport) {
  if (!target || !target.isConnected) return;
  const padTop = (isNarrowViewport ? step.mobileScrollPadTop : step.scrollPadTop);
  const padBottom = (isNarrowViewport ? step.mobileScrollPadBottom : step.scrollPadBottom);
  if (padTop == null && padBottom == null) return;

  let rect = target.getBoundingClientRect();
  const topPad = padTop ?? 80;
  const bottomPad = padBottom ?? 220;
  if (rect.top < topPad) {
    appsTourScrollBy(target, rect.top - topPad);
    rect = target.getBoundingClientRect();
  }
  if (rect.bottom > window.innerHeight - bottomPad) {
    appsTourScrollBy(target, rect.bottom - window.innerHeight + bottomPad);
  }
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
        <p style="font-size:13px;color:#4B5D52;line-height:1.58;margin:0 0 18px;">You just walked through the loop: guests book direct, save your hotel to their phone, and message you. Front Desk receives the alerts.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:15px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Direct booking page accepts reservations</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Guests save your hotel from the booking page</span></div>
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

  appsTourCleanupUi();
  let lb = document.createElement('div');
  lb.id = 'appsTourLightbox';
  lb.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.22);pointer-events:auto;';
  document.body.appendChild(lb);

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
  target.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)';
  target.style.outline = '1px solid rgba(255,255,255,0.82)';
  target.style.outlineOffset = '2px';
  target.setAttribute('data-apps-tour-highlighted', '1');

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
    createAppsTourSpotlightClone(target);
    const rect = target.getBoundingClientRect();
    const maxWidth = Math.min(isNarrowViewport ? window.innerWidth - 24 : 370, window.innerWidth - 28);
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(14, Math.min(centerX - maxWidth / 2, window.innerWidth - maxWidth - 14));
    const anchorEdge = (isNarrowViewport && step.mobileTooltipAnchor) || step.tooltipAnchor || 'bottom';
    const preferredPosition = (isNarrowViewport && step.mobileTooltipPosition) || step.tooltipPosition || '';
    const anchorTop = rect.top;
    const anchorBottom = anchorEdge === 'top' ? rect.top : rect.bottom;
    const primaryLabel = step.primaryLabel || (isLast ? 'Done' : 'Next');
    const secondaryLabel = step.secondaryLabel || (isLast ? 'Not now' : 'Skip tour');
    const backDisabled = _appsTourIdx <= 0;
    const kicker = step.kicker || 'Guest App';
    const tip = document.createElement('div');
    tip.id = 'appsTourTooltip';
    tip.style.cssText = `position:fixed;z-index:100003;left:${left}px;top:14px;width:${maxWidth}px;max-width:${maxWidth}px;visibility:hidden;`;
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
      tip.style.left = '12px';
      tip.style.right = '12px';
      tip.style.width = 'auto';
      tip.style.maxWidth = 'none';
      tip.style.top = 'auto';
      tip.style.bottom = 'calc(14px + env(safe-area-inset-bottom,0px))';
    } else {
      const gap = 14;
      const tipHeight = Math.min(tip.offsetHeight || 190, Math.max(130, window.innerHeight - 28));
      const spaceBelow = window.innerHeight - anchorBottom;
      const spaceAbove = anchorTop;
      let placeBelow = preferredPosition === 'below'
        || (!preferredPosition && spaceBelow >= tipHeight + gap + 14);
      if (preferredPosition === 'above') placeBelow = false;
      if (placeBelow && spaceBelow < tipHeight + gap + 14 && spaceAbove > spaceBelow) placeBelow = false;
      if (!placeBelow && spaceAbove < tipHeight + gap + 14 && spaceBelow > spaceAbove) placeBelow = true;
      const rawTop = placeBelow ? anchorBottom + gap : anchorTop - tipHeight - gap;
      const maxTop = Math.max(14, window.innerHeight - tipHeight - 14);
      const top = Math.max(14, Math.min(rawTop, maxTop));
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
    applyAppsTourScrollPadding(target, step, isNarrowViewport);
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
      title: 'Your hotel becomes the app.',
      text: 'Guests book from your direct page, save your hotel to their phone, then come back with one tap to book or message you.',
    },
    {
      target: '#tour-apps-first',
      kicker: 'Front Desk',
      title: 'Install this on the property phone.',
      text: 'Front Desk is this dashboard saved like an app. It is where booking alerts, guest messages, QR tools, and setup controls live.',
      scrollBlock: 'center',
      tooltipAnchor: 'top',
      tooltipPosition: 'above',
      mobileScrollBlock: 'center',
      mobileScrollPadTop: 260,
      mobileScrollPadBottom: 180,
      mobileTooltipAnchor: 'top',
      mobileTooltipPosition: 'above',
    },
    {
      target: '#tour-apps-then',
      kicker: 'Guest path',
      title: 'Send guests to your direct page.',
      text: 'The Install button sits on the booking page. Guests tap it once, and your hotel icon lands on their home screen.',
      scrollBlock: 'center',
      tooltipAnchor: 'top',
      tooltipPosition: 'above',
      mobileScrollBlock: 'center',
      mobileScrollPadTop: 260,
      mobileScrollPadBottom: 180,
      mobileTooltipAnchor: 'top',
      mobileTooltipPosition: 'above',
    },
    {
      target: '#tour-apps-after',
      kicker: 'Return visits',
      title: 'Now the loop is easy to remember.',
      text: 'Guests tap your icon to book direct or message you. New bookings and messages come back to Front Desk.',
    },
    {
      target: '#tour-guest-icon-section',
      kicker: 'One setup item',
      title: 'Make the icon feel like your hotel.',
      text: 'Use a real logo or clear property image. Guests see this square every time they save your hotel to their phone.',
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
        ? 'Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.'
        : 'Activation turns on direct booking, guest installs, messages, and Front Desk alerts as one simple loop.',
      primaryLabel: hotelIsLive ? 'Done' : 'Continue to activation',
      secondaryLabel: hotelIsLive ? 'Close' : 'Not now',
      showActivationOnComplete: !hotelIsLive,
      mobileScrollBlock: 'center',
      mobileScrollPadBottom: 300,
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
