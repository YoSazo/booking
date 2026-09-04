import { crm } from './state.js';
import { createAdaptiveTourLayout, createTourSpotlightClone } from './tour-layout.js';

function windowFn(name) {
  return typeof window !== 'undefined' && typeof window[name] === 'function'
    ? window[name]
    : null;
}

function setFilter(...args) {
  return windowFn('setFilter')?.(...args);
}

function setBookingsSubview(...args) {
  return windowFn('setBookingsSubview')?.(...args);
}

function toast(...args) {
  return windowFn('toast')?.(...args);
}

function updateGoLiveBanner(...args) {
  return windowFn('updateGoLiveBanner')?.(...args);
}

function seedTourRevenueShell(...args) {
  return windowFn('seedTourRevenueShell')?.(...args);
}

function finishTourHydration(...args) {
  return windowFn('finishTourHydration')?.(...args);
}

function goLive(...args) {
  return windowFn('goLive')?.(...args);
}

// ── SETTINGS TOUR GUIDE ────────────────────────────────────────
let _settingsTourKeyHandler = null;
let _settingsTourLayout = null;
let _settingsTourSpotlight = null;

function ensureTourPolishStyles() {
  if (document.getElementById('frontdeskTourPolishStyle')) return;
  const style = document.createElement('style');
  style.id = 'frontdeskTourPolishStyle';
  style.textContent = `
    #tourBlurOverlay {
      -webkit-backdrop-filter: blur(1.25px);
      backdrop-filter: blur(1.25px);
      animation: tourOverlayFade 0.18s ease-out;
      transition: background 0.25s ease;
    }
    #tourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .tour-panel {
      pointer-events: auto;
      width: 100%;
      max-width: 560px;
      max-height: calc(100dvh - 28px);
      overflow-y: auto;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.24);
      padding: 14px;
      animation: tourPanelIn 0.2s ease-out;
    }
    .tour-progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tour-progress-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7D72;
      white-space: nowrap;
    }
    .tour-progress-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .tour-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      color: #1A2B22;
      letter-spacing: 0;
    }
    .tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.48;
      margin: 0 0 13px;
    }
    .tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .tour-btn-primary {
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
      .tour-panel {
        border-radius: 16px;
        padding: 13px;
      }
      .tour-title {
        font-size: 16px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.42;
      }
      .tour-actions {
        flex-wrap: wrap;
      }
      .tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @media (max-height: 680px) {
      .tour-panel {
        max-height: calc(100dvh - 20px);
        padding: 12px;
        border-radius: 16px;
      }
      .tour-progress-row {
        margin-bottom: 8px;
      }
      .tour-title {
        font-size: 16px;
        margin-bottom: 5px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.38;
        margin-bottom: 10px;
      }
      .tour-btn {
        min-height: 38px;
        padding: 8px 11px;
      }
      .tour-btn-primary {
        padding: 9px 16px;
      }
    }
    @keyframes tourPanelOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.98); }
    }
    @keyframes tourPageIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes tourOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes tourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #tourBlurOverlay,
      .tour-panel {
        animation: none !important;
      }
      #tourBlurOverlay {
        transition: none !important;
      }
      .tour-progress-fill {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function clearSettingsTourKeyboard() {
  if (!_settingsTourKeyHandler) return;
  document.removeEventListener('keydown', _settingsTourKeyHandler);
  _settingsTourKeyHandler = null;
}

function installSettingsTourKeyboard(actions) {
  clearSettingsTourKeyboard();
  _settingsTourKeyHandler = (event) => {
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
  document.addEventListener('keydown', _settingsTourKeyHandler);
}

function escapeTourHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function ensureTourBlurOverlay(options) {
  ensureTourPolishStyles();
  const opts = options || {};
  let overlay = document.getElementById('tourBlurOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tourBlurOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;';
    document.body.appendChild(overlay);
  }
  // Normalize mode on every call so a persistent overlay can morph between
  // highlight steps (light dim, click-through) and modal steps (dark dim,
  // pointer-blocking) with the CSS background transition instead of a flash.
  overlay.style.background = opts.dim || 'rgba(17,24,39,0.22)';
  overlay.style.pointerEvents = opts.blockPointer ? 'auto' : 'none';
  if (opts.lockScroll) document.body.style.overflow = 'hidden';
  return overlay;
}

const TOUR_MODAL_DIM = 'rgba(17,24,39,0.42)';

// Animates the current tour modal/tooltip panel out (keeps the dim overlay up)
// and resolves when it is safe to render the next step's UI.
function transitionOutTourModal() {
  const tooltip = document.getElementById('tourTooltip');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!tooltip || prefersReducedMotion) return Promise.resolve();
  tooltip.style.pointerEvents = 'none';
  const panel = tooltip.firstElementChild;
  if (panel) panel.style.animation = 'tourPanelOut 0.16s ease-in forwards';
  return new Promise((resolve) => setTimeout(resolve, 150));
}

function createSettingsTourSpotlightClone(source, stepDef) {
  _settingsTourSpotlight?.destroy();
  _settingsTourSpotlight = createTourSpotlightClone(source, {
    attribute: 'data-tour-spotlight-clone',
    zIndex: 99999,
    prepareClone(clone) {
      clone.style.boxShadow = stepDef?.spotlightBoxShadow ?? '0 18px 46px rgba(26,43,34,0.24)';
      clone.style.outline = stepDef?.spotlightOutline ?? '1px solid rgba(255,255,255,0.82)';
      clone.style.outlineOffset = stepDef?.spotlightOutlineOffset ?? '2px';
      if (stepDef?.spotlightBackground) {
        clone.style.background = stepDef.spotlightBackground;
        clone.style.backgroundColor = stepDef.spotlightBackground;
      }
      if (stepDef?.spotlightBorderRadius) {
        clone.style.borderRadius = stepDef.spotlightBorderRadius;
      }
    },
  });
  return _settingsTourSpotlight?.element || null;
}

function cleanupSettingsTourUi(options) {
  const opts = options || {};
  clearSettingsTourKeyboard();
  _settingsTourLayout?.destroy();
  _settingsTourLayout = null;
  _settingsTourSpotlight?.destroy();
  _settingsTourSpotlight = null;
  const prev = document.getElementById('tourTooltip');
  if (prev) prev.remove();
  const prevOverlay = document.getElementById('tourBlurOverlay');
  if (prevOverlay && !opts.keepOverlay) prevOverlay.remove();
  document.querySelectorAll('[data-tour-spotlight-clone]').forEach((el) => el.remove());
  document.querySelectorAll('[data-tour-highlighted]').forEach(el => {
    el.style.position = el.dataset.tourOrigPosition || '';
    el.style.zIndex = el.dataset.tourOrigZIndex || '';
    el.style.isolation = el.dataset.tourOrigIsolation || '';
    el.style.boxShadow = el.dataset.tourOrigBoxShadow || '';
    el.style.outline = el.dataset.tourOrigOutline || '';
    el.style.outlineOffset = el.dataset.tourOrigOutlineOffset || '';
    el.style.transition = el.dataset.tourOrigTransition || '';
    el.style.borderRadius = el.dataset.tourOrigBorderRadius || '';
    el.style.opacity = el.dataset.tourOrigOpacity || '';
    // Restore backgroundColor first, then the background shorthand last.
    // Clearing backgroundColor AFTER setting background wipes shorthand values
    // like `background:var(--green)` on the Preview Your Site button.
    const origBg = el.dataset.tourOrigBackground || '';
    const origBgColor = el.dataset.tourOrigBackgroundColor || '';
    if (origBgColor) el.style.backgroundColor = origBgColor;
    else el.style.removeProperty('background-color');
    if (origBg) el.style.background = origBg;
    else el.style.removeProperty('background');
    el.removeAttribute('data-tour-highlighted');
    delete el.dataset.tourOrigPosition;
    delete el.dataset.tourOrigZIndex;
    delete el.dataset.tourOrigIsolation;
    delete el.dataset.tourOrigBoxShadow;
    delete el.dataset.tourOrigOutline;
    delete el.dataset.tourOrigOutlineOffset;
    delete el.dataset.tourOrigTransition;
    delete el.dataset.tourOrigBackground;
    delete el.dataset.tourOrigBackgroundColor;
    delete el.dataset.tourOrigBorderRadius;
    delete el.dataset.tourOrigOpacity;
  });
  const goLiveBanner = document.getElementById('goLiveBanner');
  if (goLiveBanner && goLiveBanner.dataset.tourHidden) {
    delete goLiveBanner.dataset.tourHidden;
    if (typeof updateGoLiveBanner === 'function') updateGoLiveBanner();
  }
  if (!opts.keepOverlay) document.body.style.overflow = '';
}

function fadeOutSettingsTourStepUi() {
  const tooltip = document.getElementById('tourTooltip');
  const clones = Array.from(document.querySelectorAll('[data-tour-spotlight-clone]'));
  const highlighted = Array.from(document.querySelectorAll('[data-tour-highlighted]'));
  const fading = [tooltip, ...clones, ...highlighted].filter(Boolean);
  if (!fading.length && !highlighted.length) {
    cleanupSettingsTourUi({ keepOverlay: true });
    return Promise.resolve();
  }

  clearSettingsTourKeyboard();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    cleanupSettingsTourUi({ keepOverlay: true });
    return Promise.resolve();
  }

  if (tooltip) tooltip.style.pointerEvents = 'none';
  fading.forEach((el) => {
    el.style.transition = 'opacity 0.07s ease, transform 0.07s ease';
    el.style.opacity = '1';
  });

  requestAnimationFrame(() => {
    fading.forEach((el) => {
      el.style.opacity = '0';
      if (el.id === 'tourTooltip') el.style.transform = 'translateY(4px)';
    });
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      cleanupSettingsTourUi({ keepOverlay: true });
      resolve();
    }, 85);
  });
}

function fadeInSettingsTourStepUi(tooltip) {
  const elements = [
    tooltip,
    ...document.querySelectorAll('[data-tour-spotlight-clone]'),
    ...document.querySelectorAll('[data-tour-highlighted]')
  ].filter(Boolean);

  elements.forEach((el) => {
    el.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
    el.style.opacity = '0';
    if (el.id === 'tourTooltip') el.style.transform = 'translateY(4px)';
  });

  requestAnimationFrame(() => {
    elements.forEach((el) => {
      el.style.opacity = '1';
      if (el.id === 'tourTooltip') el.style.transform = 'translateY(0)';
    });
  });
}

function openTourAccordion(el, stepDef) {
  if (!stepDef.openAccordion) return;
  const card = stepDef.accordionCard
    ? document.querySelector(stepDef.accordionCard)
    : (el && el.closest ? el.closest('.booking-card') : null);
  if (!card) return;
  const acc = card.querySelector('.accordion-body');
  if (!acc) return;
  const hidden = acc.style.display === 'none' || getComputedStyle(acc).display === 'none';
  if (hidden) {
    acc.style.display = 'block';
    const arrow = card.querySelector('.accordion-arrow');
    if (arrow) arrow.style.transform = 'rotate(90deg)';
  }
}

function queryTourSelector(selectorList) {
  if (!selectorList) return null;
  for (const sel of String(selectorList).split(',').map(t => t.trim()).filter(Boolean)) {
    const el = document.querySelector(sel);
    if (el && el.isConnected) return el;
  }
  return null;
}

function resolveTourHighlightEl(el, stepDef) {
  if (stepDef.highlightSelector) {
    const highlighted = queryTourSelector(stepDef.highlightSelector);
    if (highlighted) return highlighted;
  }
  if (stepDef.highlightCard) {
    const card = stepDef.accordionCard
      ? document.querySelector(stepDef.accordionCard)
      : (el && el.closest ? el.closest('.booking-card') : null);
    if (card) return card;
  }
  if (stepDef.targetParent) {
    return el.closest('.booking-card') || el.closest('.accordion-body') || el;
  }
  return el;
}

function resolveLiveTourElement(el, stepDef) {
  if (!stepDef) return el;
  const selectors = String(stepDef.target || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const sel of selectors) {
    const candidate = document.querySelector(sel);
    if (candidate && candidate.isConnected) return candidate;
  }
  if (stepDef.accordionCard) {
    const card = document.querySelector(stepDef.accordionCard);
    if (card && card.isConnected) return card;
  }
  return el && el.isConnected ? el : null;
}

function tourElementRect(el, allowPartial) {
  if (!el || !el.isConnected) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  if (!allowPartial && (rect.bottom < 8 || rect.top > window.innerHeight - 8)) return null;
  return rect;
}

function tourAnchorRect(stepDef, highlightEl) {
  const anchor = queryTourSelector(stepDef.anchorSelector);
  if (anchor) {
    const r = tourElementRect(anchor, true);
    if (r) return r;
  }
  return tourElementRect(highlightEl, true);
}

function tourTooltipAnchorRect(stepDef, highlightEl) {
  const selector = stepDef.tooltipAnchorSelector
    || stepDef.anchorSelector;
  const anchor = queryTourSelector(selector);
  if (anchor) {
    const r = tourElementRect(anchor, true);
    if (r) return r;
  }
  return tourAnchorRect(stepDef, highlightEl);
}

function forceTourPageTop(behavior) {
  const scrollBehavior = behavior || 'auto';
  try { window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior }); } catch (_) {}
  const scrollingEl = document.scrollingElement || document.documentElement;
  if (scrollingEl) scrollingEl.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  ['#editView', '#settingsView', '#app .container'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollTop = 0;
  });
}

function scrollTourTargetIntoView(el, stepDef, options) {
  const opts = options || {};
  const scrollSel = stepDef.scrollTarget || stepDef.accordionCard;
  const target = (scrollSel ? queryTourSelector(scrollSel) : null) || el;
  if (!target && !stepDef.scrollToTop) return Promise.resolve();

  const block = stepDef.scrollBlock || 'nearest';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = opts.smooth && !prefersReducedMotion
    ? 'smooth'
    : ((crm.settingsTourActive || prefersReducedMotion) ? 'auto' : 'smooth');

  return new Promise((resolve) => {
    if (stepDef.scrollToTop) {
      forceTourPageTop(behavior);
      if (stepDef.scrollToTopOnly) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (stepDef.forcePageTop) forceTourPageTop('auto');
          resolve();
        }));
        return;
      }
    }

    if (!target) {
      resolve();
      return;
    }

    target.scrollIntoView({ behavior, block, inline: 'nearest' });
    if (behavior === 'auto') {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('scrollend', onScrollEnd);
      clearTimeout(fallbackTimer);
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    };
    const onScrollEnd = () => finish();
    if ('onscrollend' in window) window.addEventListener('scrollend', onScrollEnd, { once: true });
    const fallbackTimer = setTimeout(finish, 520);
  });
}

function handoffToGuestAppsTour() {
  cleanupSettingsTourUi();
  // Keep a marker so refresh mid-Guestel tour does not auto-mark settings tour done.
  localStorage.setItem('settingsTourStep', 'handoff');
  const go = () => {
    const tabBtn = document.querySelector('.tab[data-nav-filter="apps"]') || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');
    if (tabBtn) setFilter('apps', tabBtn);
    const renderApps = (typeof ensureAppsViewRendered === 'function')
      ? ensureAppsViewRendered
      : window.ensureAppsViewRendered;
    if (typeof renderApps === 'function') renderApps(true);
    const startTour = (typeof startAppsTour === 'function')
      ? startAppsTour
      : window.startAppsTour;
    if (typeof startTour === 'function') startTour({ chainFromSettingsTour: true });
  };
  const loadApps = (typeof loadAppsModule === 'function')
    ? loadAppsModule
    : window.loadAppsModule;
  if (typeof loadApps === 'function') {
    loadApps().then(go).catch(go);
  } else {
    go();
  }
}

function showFinaleMockModal() {
  cleanupSettingsTourUi({ keepOverlay: true });
  ensureTourPolishStyles();
  crm.settingsTourActive = false;
  updateGoLiveBanner();
  ensureTourBlurOverlay({ blockPointer: true, lockScroll: true, dim: TOUR_MODAL_DIM });

  const modal = document.createElement('div');
  modal.id = 'tourTooltip';
  modal.style.cssText = 'position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;';
  modal.innerHTML = `
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:24px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="copy-check" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Ready to share</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Your booking page is set up.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.55;margin:0 0 16px;">Copy the link, put it where guests already find you, and keep Front Desk open for new reservations.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:14px;">
          <div style="display:flex;flex-direction:column;gap:11px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">1</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Share the link</strong> on Google Business Profile, your website, texts, ads, and QR signs.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">2</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Watch bookings arrive</strong> in Front Desk with guest details and card verification status.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">3</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Confirm and collect</strong> payment at check-in using your normal process.</span>
            </div>
          </div>
        </div>
        <div style="background:#fff7ed;border-radius:12px;padding:11px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
          <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">Bookings start when guests see the link. Put it in front of real traffic before judging results.</p>
        </div>
        <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 8px 20px rgba(46,125,91,0.22);">Copy booking link</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  if (!document.getElementById('tourModalAnimStyle')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'tourModalAnimStyle';
    animStyle.textContent = '@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(animStyle);
  }
  if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 0);

  document.getElementById('tourNextBtn').onclick = () => {
    const domain = crm.activeHotelDomain || (crm.activeHotelId + '.mktel.co');
    const url = 'https://' + domain;
    navigator.clipboard.writeText(url).catch(() => {});
    void transitionOutTourModal().then(() => {
      cleanupSettingsTourUi();
      crm.settingsTourActive = false;
      localStorage.setItem('settingsTourDone', '1');
      localStorage.setItem('linkCopied', '1');
      localStorage.removeItem('settingsTourStep');
      toast('Booking link copied!', 'success');
      finishTourHydration();
      showTestDriveModal(url);
    });
  };
}

function showTestDriveModal(bookingUrl) {
  ensureTourPolishStyles();
  const overlay = document.createElement('div');
  overlay.id = 'testDriveOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;';
  overlay.innerHTML = `
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Activation</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">${crm.marketelTrialEligible !== false ? 'Start free when you are ready.' : 'Reactivate when you are ready.'}</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.6;margin:0 0 18px;">Your link is copied. ${crm.marketelTrialEligible !== false ? 'Start 14 days of full access for $0 today when you want guests to submit real bookings.' : 'Reactivate when you want guests to submit real bookings again.'}</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Booking page accepts reservations</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Card verification helps reduce no-shows</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Front Desk shows new bookings</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">No OTA commission</span></div>
          </div>
        </div>
        <button id="activateNowBtn" style="width:100%;padding:15px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">${crm.marketelTrialEligible !== false ? 'Start 14 days free' : 'Reactivate — $199/month'}</button>
        <p style="font-size:11px;color:#6B7D72;margin:0 0 14px;text-align:center;">${crm.marketelTrialEligible !== false ? '$0 today. Card required. Then $199/month.' : 'Billed monthly.'} Cancel anytime.</p>
        <button id="activateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep page inactive for now</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 0);

  const closeOverlay = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  document.getElementById('activateNowBtn').onclick = () => {
    closeOverlay();
    goLive();
  };

  document.getElementById('activateLaterBtn').onclick = () => {
    closeOverlay();
    const tabBtn = document.querySelector('.tab[data-nav-filter="bookings"]') || document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');
    if (tabBtn) setFilter('bookings', tabBtn);
  };
}

function startSettingsTour() {
  // Only show once
  if (localStorage.getItem('settingsTourDone')) return;

  if (localStorage.getItem('settingsTourStep') === 'handoff') {
    localStorage.removeItem('settingsTourStep');
    showFinaleMockModal();
    return;
  }

  if (!localStorage.getItem('settingsTourDone')) {
    localStorage.removeItem('settingsTourStep');
  }

  crm.settingsTourActive = true;
  updateGoLiveBanner();
  seedTourRevenueShell();

  const settingsTab = document.querySelector('.tab[data-nav-filter="settings"]')
    || document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');
  if (settingsTab) setFilter('settings', settingsTab);

  function kickEditPageLoadIfNeeded() {
    const ready = (typeof window.isEditPageDomReady === 'function' && window.isEditPageDomReady())
      || (typeof isEditPageDomReady === 'function' && isEditPageDomReady());
    if (ready) return;
    const needs = (typeof window.needsEditPageLoad === 'function' && window.needsEditPageLoad())
      || (typeof needsEditPageLoad === 'function' && needsEditPageLoad());
    if (!needs && !crm.editRoomsLoadPromise) return;
    const invoke = (typeof window.invokeLoadEditRooms === 'function')
      ? window.invokeLoadEditRooms
      : (typeof invokeLoadEditRooms === 'function' ? invokeLoadEditRooms : null);
    if (invoke) void invoke();
  }
  kickEditPageLoadIfNeeded();

  const steps = [
    {
      target: '#tour-preview-btn',
      highlightSelector: '#tour-preview-btn',
      anchorSelector: '#tour-preview-btn',
      scrollTarget: '#tour-preview-btn',
      title: 'Preview your booking page',
      text: 'Open the exact page guests will use. It is safe to review before activation, so check the basics here first.',
      openAccordion: false,
      tab: 'settings',
      scrollToTop: true,
      scrollToTopOnly: true,
      forcePageTop: true,
      scrollBlock: 'start'
    },
    {
      target: '#tour-header-preview-card',
      highlightSelector: '#tour-header-preview-card',
      anchorSelector: '#tour-header-preview-card',
      scrollTarget: '#tour-header-preview-card',
      title: 'Edit your booking page',
      text: 'This page is the source of truth for your guest site. Update the property name, address, phone, policy, rooms, photos, and prices here.',
      openAccordion: false,
      tab: 'settings',
      scrollBlock: 'nearest',
      tooltipPosition: 'below',
      tooltipGap: 22
    },
    {
      target: '#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',
      highlightSelector: '#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',
      anchorSelector: '#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',
      scrollTarget: '#editRoomsCards [data-tour-room-card="1"]',
      title: 'Add room photos',
      text: 'Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.',
      openAccordion: false,
      tab: 'settings',
      scrollBlock: 'center'
    },
    {
      target: '#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',
      highlightSelector: '#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',
      anchorSelector: '#editRoomsCards [data-tour-room-card="1"] [data-tour-room-details-anchor="1"]',
      tooltipAnchorSelector: '#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',
      scrollTarget: '#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',
      title: 'Edit room details',
      text: 'Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.',
      openAccordion: false,
      tab: 'settings',
      scrollBlock: 'start',
      tooltipPosition: 'auto',
      tooltipGap: 10,
      spotlightBackground: '#fff',
      spotlightBorderRadius: '12px',
      spotlightBoxShadow: 'none',
      spotlightOutline: 'none',
      spotlightOutlineOffset: '0'
    },
    {
      target: '#tour-booking-link-card',
      highlightSelector: '#tour-booking-link-card',
      anchorSelector: '#tour-booking-link-card',
      scrollTarget: '#tour-booking-link-card',
      title: 'Share your direct link',
      text: 'This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.',
      openAccordion: false,
      tab: 'settings',
      scrollBlock: 'start'
    },
    {
      target: '#tour-rates-card',
      highlightSelector: '#tour-rates-card',
      anchorSelector: '#tour-rates-card',
      scrollTarget: '#tour-rates-card',
      title: 'Set your rates',
      text: 'Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.',
      openAccordion: true,
      accordionCard: '#tour-rates-card',
      tab: 'settings',
      scrollBlock: 'center',
      tooltipPosition: 'below',
      tooltipGap: 8
    },
    {
      target: '#bookingsList',
      text: '',
      openAccordion: false,
      tab: 'bookings',
      subview: 'bookings',
      customModal: 'bookings'
    },
    {
      target: '#availabilityCalendarWrap',
      text: '',
      openAccordion: false,
      tab: 'availability',
      customModal: 'availability'
    },
    {
      target: '.revenue-savings-pill',
      title: 'Track revenue and payment status',
      text: 'Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.',
      openAccordion: false,
      tab: 'bookings',
      subview: 'revenue',
      waitForVisible: true,
      scrollBlock: 'start'
    },
    {
      target: '',
      text: '',
      openAccordion: false,
      tab: 'apps',
      customModal: 'guestAppsStory'
    }
  ];

  let step = parseInt(localStorage.getItem('settingsTourStep') || '0', 10);
  if (!Number.isFinite(step) || step < 0 || step >= steps.length) {
    step = 0;
    localStorage.removeItem('settingsTourStep');
  }

  function cleanupTour(options) {
    cleanupSettingsTourUi(options);
  }

  function skipToFinale() {
    void transitionOutTourModal().then(() => {
      cleanupTour({ keepOverlay: true });
      localStorage.removeItem('settingsTourStep');
      showFinaleMockModal();
    });
  }

  function shouldKeepUiForStepTransition(fromStep, toStep) {
    if (!fromStep || !toStep) return false;
    if (fromStep.customModal || toStep.customModal) return false;
    if (fromStep.tab !== toStep.tab) return false;
    if (!fromStep.target || !toStep.target) return false;
    return true;
  }

  function scheduleTourStepContent(stepDef, options) {
    if (stepDef.customModal) {
      showStepContent(stepDef, options);
      return;
    }
    requestAnimationFrame(() => showStepContent(stepDef, options));
  }

  function showStep(options) {
    const opts = options || {};
    // Keep the dim overlay alive between steps — modal/tooltip swaps happen on
    // top of a steady backdrop instead of flashing it off and on.
    if (!opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
    document.body.style.overflow = '';

    if (step >= steps.length) {
      cleanupTour({ keepOverlay: true });
      localStorage.removeItem('settingsTourStep');
      showFinaleMockModal();
      return;
    }

    const s = steps[step];

    // Skip revenue steps if revenue isn't enabled for this property.
    if (s.subview === 'revenue' && !crm.revenueEnabled) {
      step++;
      localStorage.setItem('settingsTourStep', String(step));
      showStep();
      return;
    }
    if (s.tab === 'apps' && !(isStandaloneApp() || crm.frontdeskInstalled) && s.target && !s.target.includes('tour-fd-install')) {
      step++;
      localStorage.setItem('settingsTourStep', String(step));
      showStep();
      return;
    }

    // Dim immediately on highlight steps so there is no blank gap after modal transitions.
    if (!s.customModal) ensureTourBlurOverlay();

    // Switch tab if this step requires a different tab
    if (s.tab && s.tab !== crm.currentFilter) {
      const tabBtn = document.querySelector(`.tab[data-nav-filter="${s.tab}"]`) || document.querySelector(`.mobile-nav-item[data-nav-filter="${s.tab}"]`);
      if (tabBtn) setFilter(s.tab, tabBtn);
      if (s.tab === 'bookings' && s.subview) setBookingsSubview(s.subview);
      if (s.tab === 'apps') {
        const renderApps = (typeof ensureAppsViewRendered === 'function')
          ? ensureAppsViewRendered
          : window.ensureAppsViewRendered;
        if (typeof renderApps === 'function') renderApps(true);
      }
      scheduleTourStepContent(s, opts);
      return;
    }
    if (s.tab === 'bookings' && s.subview && s.subview !== crm.bookingsSubview) {
      setBookingsSubview(s.subview);
      scheduleTourStepContent(s, opts);
      return;
    }
    scheduleTourStepContent(s, opts);
  }

  function showStepContent(s, options) {
    const opts = options || {};
    // Home-screen install pitch — shown first so they immediately get the value
    if (s.customModal === 'homescreen') {
      if (opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
      showHomescreenMockModal();
      return;
    }
    if (s.customModal === 'bookings') {
      if (opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
      showBookingsMockModal();
      return;
    }
    // Custom modal for availability tab — multi-page walkthrough
    if (s.customModal === 'availability') {
      if (opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
      showAvailabilityMockModal();
      return;
    }
    if (s.customModal === 'finale') {
      if (opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
      showFinaleMockModal();
      return;
    }
    if (s.customModal === 'guestAppsStory') {
      if (opts.keepCurrentUi) cleanupTour({ keepOverlay: true });
      handoffToGuestAppsTour();
      return;
    }

    // If step needs to wait for element to become visible (e.g. async-loaded content)
    if (s.waitForVisible) {
      const targets = s.target.split(',').map(t => t.trim());
      let attempts = 0;
      const maxAttempts = 30;
      ensureTourBlurOverlay();
      const pollMs = crm.settingsTourActive ? 60 : 200;
      const pollForVisible = () => {
        attempts++;
        if (s.tab === 'apps') {
          const renderApps = (typeof ensureAppsViewRendered === 'function')
            ? ensureAppsViewRendered
            : window.ensureAppsViewRendered;
          if (typeof renderApps === 'function') renderApps(true);
        }
        let el = null;
        for (const t of targets) {
          el = document.querySelector(t);
          if (el) break;
        }
        if (el) {
          if (s.openAccordion) openTourAccordion(el, s);
          if (s.openAccordion || el.offsetParent !== null) {
            showStepForElement(el, s, opts);
            return;
          }
        }
        if (attempts < maxAttempts) {
          setTimeout(pollForVisible, pollMs);
        } else {
          // Give up, skip this step
          step++;
          localStorage.setItem('settingsTourStep', String(step));
          showStep();
        }
      };
      pollForVisible();
      return;
    }

    function findTourTarget(stepDef) {
      const targets = stepDef.target.split(',').map(t => t.trim());
      for (const t of targets) {
        const candidate = document.querySelector(t);
        if (!candidate) continue;
        if (!stepDef.openAccordion && candidate.offsetParent === null && getComputedStyle(candidate).position !== 'fixed') {
          continue;
        }
        return candidate;
      }
      if (stepDef.accordionCard) {
        const card = document.querySelector(stepDef.accordionCard);
        if (card) return card;
      }
      return null;
    }

    function resolveTourTarget(stepDef, onFound) {
      const found = findTourTarget(stepDef);
      if (found) {
        onFound(found);
        return;
      }
      const needsEditPage = stepDef.tab === 'settings' && !stepDef.customModal && stepDef.target;
      const needsAppsPage = stepDef.tab === 'apps' && !stepDef.customModal && stepDef.target;
      if (!needsEditPage && !needsAppsPage) {
        step++;
        localStorage.setItem('settingsTourStep', String(step));
        showStep();
        return;
      }
      ensureTourBlurOverlay();
      let attempts = 0;
      if (needsEditPage) kickEditPageLoadIfNeeded();
      if (needsAppsPage) {
        const renderApps = (typeof ensureAppsViewRendered === 'function')
          ? ensureAppsViewRendered
          : window.ensureAppsViewRendered;
        if (typeof renderApps === 'function') renderApps(true);
      }
      const pollMs = crm.settingsTourActive ? 60 : 250;
      const pollForTarget = () => {
        attempts++;
        if (needsAppsPage) {
          const renderApps = (typeof ensureAppsViewRendered === 'function')
            ? ensureAppsViewRendered
            : window.ensureAppsViewRendered;
          if (typeof renderApps === 'function') renderApps(true);
        }
        const el = findTourTarget(stepDef);
        if (el) {
          onFound(el);
          return;
        }
        kickEditPageLoadIfNeeded();
        if (needsAppsPage) {
          const renderApps = (typeof ensureAppsViewRendered === 'function')
            ? ensureAppsViewRendered
            : window.ensureAppsViewRendered;
          if (typeof renderApps === 'function') renderApps(true);
        }
        if (attempts < 48) {
          setTimeout(pollForTarget, pollMs);
        } else {
          step++;
          localStorage.setItem('settingsTourStep', String(step));
          showStep();
        }
      };
      pollForTarget();
    }

    resolveTourTarget(s, (el) => showStepForElement(el, s, opts));
  }

  function showStepForElement(el, s, options) {
    const opts = options || {};
    openTourAccordion(el, s);
    el = resolveTourHighlightEl(el, s);
    if (!el || !el.isConnected) {
      el = resolveLiveTourElement(el, s);
      if (el) el = resolveTourHighlightEl(el, s);
    }
    if (!el) {
      step++;
      localStorage.setItem('settingsTourStep', String(step));
      showStep();
      return;
    }

    const highlightEl = el;
    ensureTourBlurOverlay();
    void scrollTourTargetIntoView(highlightEl, s, { smooth: !!opts.keepCurrentUi }).then(() => {
      if (s.forcePageTop) forceTourPageTop('auto');
      if (!highlightEl.isConnected) {
        step++;
        localStorage.setItem('settingsTourStep', String(step));
        showStep();
        return;
      }
      openTourAccordion(highlightEl, s);

      if (opts.keepCurrentUi) {
        cleanupTour({ keepOverlay: true });
        ensureTourBlurOverlay();
      }

      if (!s.noHighlight) {
        if (!highlightEl.dataset.tourOrigPosition) highlightEl.dataset.tourOrigPosition = highlightEl.style.position || '';
        if (!highlightEl.dataset.tourOrigZIndex) highlightEl.dataset.tourOrigZIndex = highlightEl.style.zIndex || '';
        if (!highlightEl.dataset.tourOrigIsolation) highlightEl.dataset.tourOrigIsolation = highlightEl.style.isolation || '';
        if (!highlightEl.dataset.tourOrigBoxShadow) highlightEl.dataset.tourOrigBoxShadow = highlightEl.style.boxShadow || '';
        if (!highlightEl.dataset.tourOrigOutline) highlightEl.dataset.tourOrigOutline = highlightEl.style.outline || '';
        if (!highlightEl.dataset.tourOrigOutlineOffset) highlightEl.dataset.tourOrigOutlineOffset = highlightEl.style.outlineOffset || '';
        if (!highlightEl.dataset.tourOrigTransition) highlightEl.dataset.tourOrigTransition = highlightEl.style.transition || '';
        if (!highlightEl.dataset.tourOrigBackground) highlightEl.dataset.tourOrigBackground = highlightEl.style.background || '';
        if (!highlightEl.dataset.tourOrigBackgroundColor) highlightEl.dataset.tourOrigBackgroundColor = highlightEl.style.backgroundColor || '';
        if (!highlightEl.dataset.tourOrigBorderRadius) highlightEl.dataset.tourOrigBorderRadius = highlightEl.style.borderRadius || '';
        if (!highlightEl.dataset.tourOrigOpacity) highlightEl.dataset.tourOrigOpacity = highlightEl.style.opacity || '';
        highlightEl.style.position = highlightEl.style.position || 'relative';
        highlightEl.style.zIndex = '99999';
        highlightEl.style.isolation = 'isolate';
        highlightEl.style.transition = 'box-shadow 0.18s ease, outline 0.18s ease';
        highlightEl.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)';
        highlightEl.style.outline = '1px solid rgba(255,255,255,0.82)';
        highlightEl.style.outlineOffset = '2px';
        if (s.spotlightBoxShadow != null) {
          highlightEl.style.boxShadow = s.spotlightBoxShadow;
        }
        if (s.spotlightOutline != null) {
          highlightEl.style.outline = s.spotlightOutline;
        }
        if (s.spotlightOutlineOffset != null) {
          highlightEl.style.outlineOffset = s.spotlightOutlineOffset;
        }
        if (s.spotlightBackground) {
          highlightEl.style.background = s.spotlightBackground;
          highlightEl.style.backgroundColor = s.spotlightBackground;
        }
        if (s.spotlightBorderRadius) {
          highlightEl.style.borderRadius = s.spotlightBorderRadius;
        }
        if (opts.keepCurrentUi) {
          highlightEl.style.opacity = '0';
        }
        highlightEl.setAttribute('data-tour-highlighted', '1');
      }
      document.body.style.overflow = '';

      const placeTooltip = () => {
        const anchor = queryTourSelector(s.anchorSelector);
        const tipTarget = anchor || highlightEl;
        if (s.freezeTooltip) {
          const rect = tipTarget && tipTarget.isConnected ? tipTarget.getBoundingClientRect() : null;
          positionTooltip(tipTarget, s, rect && rect.width >= 2 ? rect : null, { fadeIn: !!opts.keepCurrentUi });
          return;
        }
        const liveEl = resolveLiveTourElement(highlightEl, s);
        let tipEl = liveEl ? resolveTourHighlightEl(liveEl, s) : highlightEl;
        openTourAccordion(tipEl, s);
        const rect = s.tooltipAnchor ? null : tourTooltipAnchorRect(s, tipEl);
        positionTooltip(tipEl || highlightEl, s, rect, { fadeIn: !!opts.keepCurrentUi });
      };

      if (s.freezeTooltip) {
        requestAnimationFrame(() => requestAnimationFrame(placeTooltip));
        return;
      }

      const positionAfterLayout = (attempt = 0) => {
        requestAnimationFrame(() => {
          if (s.forcePageTop) forceTourPageTop('auto');
          if (s.tooltipAnchor) {
            placeTooltip();
            return;
          }
          const liveEl = resolveLiveTourElement(highlightEl, s);
          let tipEl = liveEl ? resolveTourHighlightEl(liveEl, s) : highlightEl;
          openTourAccordion(tipEl, s);
          const rect = tourTooltipAnchorRect(s, tipEl);
          if (!rect && attempt < 4) {
            requestAnimationFrame(() => positionAfterLayout(attempt + 1));
            return;
          }
          positionTooltip(tipEl || highlightEl, s, rect, { fadeIn: !!opts.keepCurrentUi });
        });
      };
      positionAfterLayout(0);
    });
  }

  function positionTooltip(el, s, measuredRect, options) {
    const opts = options || {};
    const prev = document.getElementById('tourTooltip');
    if (prev) prev.remove();

    ensureTourPolishStyles();
    const tooltip = document.createElement('div');
    tooltip.id = 'tourTooltip';

    const current = Math.min(step + 1, steps.length);
    const progress = Math.max(8, Math.min(100, Math.round((current / steps.length) * 100)));
    const title = escapeTourHtml(s.title || 'Quick setup');
    const body = escapeTourHtml(s.text || '');
    const nextLabel = s.primaryLabel || (step < steps.length - 1 ? 'Next' : 'Got it');
    const backDisabled = step <= 0;

    tooltip.style.cssText = 'position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;';
    tooltip.innerHTML = `
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${title}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${current} of ${steps.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${progress}%;"></div>
          </div>
        </div>
        <div class="tour-title">${title}</div>
        <p class="tour-copy">${body}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${backDisabled ? 'disabled' : ''}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${escapeTourHtml(nextLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(tooltip);

    const panel = tooltip.querySelector('.tour-panel');
    const tooltipAnchor = queryTourSelector(s.tooltipAnchorSelector || s.anchorSelector) || el;
    if (!s.noHighlight) createSettingsTourSpotlightClone(el, s);
    _settingsTourLayout?.destroy();
    _settingsTourLayout = createAdaptiveTourLayout({
      tooltip,
      panel,
      target: el,
      anchor: tooltipAnchor,
      spotlight: _settingsTourSpotlight,
      options: {
        preferredPlacement: s.tooltipPosition || 'auto',
        maxWidth: 380,
        gap: s.tooltipGap ?? 10,
        autoScroll: s.autoScroll !== false,
        avoidBottomSelectors: ['.mobile-bottom-nav', '#previewSiteBar'],
      },
    });

    tooltip.style.visibility = 'visible';
    if (opts.fadeIn) fadeInSettingsTourStepUi(tooltip);
    wireTourTooltipButtons();
  }

  function wireTourTooltipButtons() {
    const nextBtn = document.getElementById('tourNextBtn');
    const skipBtn = document.getElementById('tourSkipBtn');
    const moveToStep = (nextStep) => {
      if (nextStep < 0) return;
      const keepCurrentUi = shouldKeepUiForStepTransition(steps[step], steps[nextStep]);
      const finishMove = () => {
        step = nextStep;
        localStorage.setItem('settingsTourStep', String(step));
        showStep({ keepCurrentUi });
      };
      // Always fade the current step UI out (overlay stays) — even across
      // tabs/modals — so there is never a hard cut between steps.
      void fadeOutSettingsTourStepUi().then(finishMove);
    };
    const nextAction = () => {
      moveToStep(step + 1);
    };
    const skipAction = () => { skipToFinale(); };
    const backAction = () => {
      if (step <= 0) return;
      moveToStep(step - 1);
    };
    if (nextBtn) {
      nextBtn.onclick = nextAction;
    }
    if (skipBtn) skipBtn.onclick = skipAction;
    const backBtn = document.getElementById('tourBackBtn');
    if (backBtn) {
      backBtn.onclick = backAction;
    }
    installSettingsTourKeyboard({ onNext: nextAction, onBack: backAction, onSkip: skipAction });
  }

  function showHomescreenMockModal() {
    ensureTourPolishStyles();
    if (typeof invokeLoadEditRooms === 'function') void invokeLoadEditRooms();

    ensureTourBlurOverlay({ blockPointer: true, lockScroll: true, dim: TOUR_MODAL_DIM });

    const hName = crm.activeHotelName || 'Your Property';
    const initial = hName.trim().charAt(0).toUpperCase();
    const shortName = hName.length > 10 ? hName.slice(0, 10) : hName;

    // Build a uniform 4x2 home-screen grid. Every icon uses the same fixed
    // visual box; the hotel tile is highlighted by color only, not by size.
    const tileWrapStyle = 'width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;';
    const iconBaseStyle = 'width:32px;height:32px;border-radius:9px;box-sizing:border-box;';
    const labelBaseStyle = 'height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const ghostTile = `<div style="${tileWrapStyle}"><div style="${iconBaseStyle}background:rgba(255,255,255,0.22);"></div><div style="${labelBaseStyle}"></div></div>`;
    const hotelIconUrl = crm.activeHotelAppIcon || '';
    const hotelTileInner = hotelIconUrl
      ? `<img src="${hotelIconUrl}" alt="" style="width:100%;height:100%;object-fit:contain;">`
      : initial;
    const hotelTileBoxStyle = hotelIconUrl
      ? `${iconBaseStyle}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`
      : `${iconBaseStyle}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`;
    const hotelTile = `<div style="${tileWrapStyle}"><div style="${hotelTileBoxStyle}">${hotelTileInner}</div><div style="${labelBaseStyle}font-size:7.5px;color:#fff;font-weight:700;">${shortName}</div></div>`;
    const homeTiles = [ghostTile, ghostTile, ghostTile, ghostTile, hotelTile, ghostTile, ghostTile, ghostTile].join('');

    const modal = document.createElement('div');
    modal.id = 'tourTooltip';
    modal.style.cssText = 'position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;';
    modal.innerHTML = `
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${homeTiles}
            </div>
          </div>
        </div>
        <div style="padding:20px 22px 22px;text-align:center;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">1 of ${steps.length}</div>
            <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
              <div style="height:100%;width:${Math.round((1 / steps.length) * 100)}%;border-radius:999px;background:#2E7D5B;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">Your property stays with them in Guestel</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests add <strong>${hName}</strong> to Guestel from your booking page or QR. Your rooms, their stay and your messages remain one tap away without sending them back to <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Share your Guestel QR from the <strong>Guestel</strong> tab whenever a guest is in front of you.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    if (!document.getElementById('tourModalAnimStyle')) {
      const animStyle = document.createElement('style');
      animStyle.id = 'tourModalAnimStyle';
      animStyle.textContent = '@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }

    document.getElementById('tourNextBtn').onclick = () => {
      void transitionOutTourModal().then(() => {
        cleanupTour({ keepOverlay: true });
        step++;
        localStorage.setItem('settingsTourStep', String(step));
        showStep();
      });
    };
    document.getElementById('tourSkipBtn').onclick = () => { skipToFinale(); };
  }

  function showAvailabilityMockModal() {
    ensureTourPolishStyles();
    ensureTourBlurOverlay({ blockPointer: true, lockScroll: true, dim: TOUR_MODAL_DIM });

    let modalPage = 0;
    const pages = [
      // Page 1: The Calendar
      `<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Your Availability Calendar</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">See room availability at a glance</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px;">
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sun</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Mon</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Tue</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Wed</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Thu</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Fri</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sat</div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">9</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">10</div><div style="font-size:10px;color:#92400e;font-weight:600;">2</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">11</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEE2E2;border:1.5px solid #E05252;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">12</div><div style="font-size:10px;color:#991b1b;font-weight:600;">0</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">13</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">14</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">3</div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #D8E4DC;">
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:6px;padding:4px 6px;text-align:center;"><div style="font-size:10px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:9px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="font-size:11px;color:#374151;line-height:1.3;"><span style="font-weight:600;">8</span> = date &nbsp;·&nbsp; <span style="font-weight:600;">4</span> = rooms available</div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#E8F5EE;border:1.5px solid #2E7D5B;"></div><span style="font-size:11px;color:#374151;">Open</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEF3C7;border:1.5px solid #F59E0B;"></div><span style="font-size:11px;color:#374151;">Partial</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEE2E2;border:1.5px solid #E05252;"></div><span style="font-size:11px;color:#374151;">Full</span></div>
          </div>
        </div>
      </div>`,

      // Page 2: Tap a Day
      `<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Tap Any Day to Adjust</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Control exactly how many rooms are available</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:flex;justify-content:center;margin-bottom:12px;">
            <div style="background:#2E7D5B;border:2px solid #1a5c3f;border-radius:10px;padding:8px 12px;text-align:center;box-shadow:0 0 0 3px rgba(46,125,91,0.3);">
              <div style="font-size:12px;font-weight:700;color:white;">10</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.8);font-weight:600;">4</div>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:10px;">
            <span style="font-size:11px;color:#6b7280;">↓ opens this</span>
          </div>
          <div style="background:white;border-radius:12px;padding:16px;border:1.5px solid #D8E4DC;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;">Wed, Jun 10</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">−</div>
              <div style="font-size:28px;font-weight:700;color:#1a1a2e;">3</div>
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">+</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8faf9;border-radius:8px;border:1px solid #D8E4DC;">
              <span style="font-size:12px;font-weight:600;color:#374151;">Close for this day</span>
              <div style="width:36px;height:20px;border-radius:10px;background:#D8E4DC;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div></div>
            </div>
          </div>
        </div>
      </div>`,

      // Page 3: Summary
      `<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">That's It</div>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f0fdf4;border-radius:12px;padding:16px;border:1px solid #bbf7d0;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span><i data-lucide="circle-check" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Rooms default to <strong>open</strong> with all units available</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span><i data-lucide="lock" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Toggle <strong>close</strong> on days you're fully booked</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span><i data-lucide="hash" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Use +/− to reduce units when partially booked</span>
            </div>
          </div>
        </div>
      </div>`
    ];

    const modal = document.createElement('div');
    modal.id = 'tourTooltip';
    modal.style.cssText = 'position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;';

    let hasRenderedPage = false;
    function renderModalPage() {
      const isLast = modalPage >= pages.length - 1;
      const btnLabel = isLast ? 'Next \u2014 Bookings \u2192' : 'Next \u2192';
      // Panel slides in once; page swaps only crossfade the content so the
      // whole modal doesn't re-animate on every inner page.
      const panelAnim = hasRenderedPage ? 'none' : 'tourPanelIn 0.22s ease-out';
      const pageAnim = hasRenderedPage ? 'tourPageIn 0.18s ease-out' : 'none';
      modal.innerHTML = `
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${panelAnim};">
          <div style="animation:${pageAnim};">
            ${pages[modalPage]}
          </div>
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${pages.map((_, i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i === modalPage ? '#2E7D5B' : '#D8E4DC'};transition:background 0.2s ease;"></div>`).join('')}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${btnLabel}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`;
      hasRenderedPage = true;

      document.getElementById('tourNextBtn').onclick = () => {
        if (modalPage < pages.length - 1) {
          modalPage++;
          renderModalPage();
        } else {
          void transitionOutTourModal().then(() => {
            cleanupTour({ keepOverlay: true });
            step++;
            localStorage.setItem('settingsTourStep', String(step));
            showStep();
          });
        }
      };

      document.getElementById('tourSkipBtn').onclick = () => {
        skipToFinale();
      };
    }

    document.body.appendChild(modal);
    renderModalPage();

    // Add slide-up animation
    if (!document.getElementById('tourModalAnimStyle')) {
      const animStyle = document.createElement('style');
      animStyle.id = 'tourModalAnimStyle';
      animStyle.textContent = '@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }
  }

  function showBookingsMockModal() {
    ensureTourPolishStyles();
    ensureTourBlurOverlay({ blockPointer: true, lockScroll: true, dim: TOUR_MODAL_DIM });

    let modalPage = 0;
    let hasRenderedPage = false;
    const pages = [
      `
          <div style="padding:20px 18px 0;text-align:center;">
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Bookings</div>
            <div style="font-size:17px;font-weight:800;color:#1a1a2e;">A guest books. You see everything.</div>
            <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 14px;">The guest is confirmed immediately. The booking stays marked until you verify the room.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:1px solid #D8E4DC;border-radius:16px;overflow:hidden;box-shadow:0 8px 22px rgba(26,43,34,0.07);">
            <div style="height:5px;background:#F59E0B;"></div>
            <div style="padding:15px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                <div>
                  <div style="font-size:16px;font-weight:750;color:#1a1a2e;">Sarah Johnson</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">Just now</div>
                </div>
                <div style="font-size:18px;font-weight:750;color:#2E7D5B;">$284.00</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                  <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:11px;font-weight:750;padding:4px 9px;border-radius:20px;">● Needs verification</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">3 nights</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px;background:#f8faf9;border-radius:10px;margin-bottom:12px;">
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-in</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 15</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-out</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 18</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Guests</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">2</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:10px 11px;">
                  <div style="font-size:11px;color:#9A3412;line-height:1.4;"><strong>Already confirmed.</strong><br>Check your other calendars, then verify.</div>
                  <div style="font-size:18px;">✓</div>
              </div>
            </div>
          </div>
        </div>`,
      `
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Booking alerts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">See the important details immediately.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 15px;">The notification shows the room, stay, guest, and amount. Tap it to open the confirmed booking.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="max-width:318px;margin:0 auto 14px;padding:60px 10px 16px;border-radius:31px;background:linear-gradient(155deg,#B5C8C0 0%,#DCE5E1 48%,#AFC2BA 100%);box-shadow:0 12px 28px rgba(26,43,34,.15);">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;background:rgba(247,247,249,.94);border:.5px solid rgba(255,255,255,.78);border-radius:19px;padding:11px 13px 12px;text-align:left;box-shadow:0 2px 8px rgba(0,0,0,.11);backdrop-filter:blur(18px);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
                <div style="width:23px;height:23px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="/marketellogo.svg" alt="" style="width:18px;height:18px;object-fit:contain;">
                </div>
                <div style="font-size:10px;font-weight:600;letter-spacing:.02em;color:#737477;">FRONT DESK</div>
                <div style="margin-left:auto;font-size:10px;color:#8E8E93;">now</div>
              </div>
              <div style="font-size:13px;font-weight:650;color:#111114;line-height:1.25;margin-bottom:2px;">New confirmed booking</div>
              <div style="font-size:12px;color:#2C2C2E;line-height:1.38;">King Room · Jun 15–18<br>Sarah Johnson · $284 due at check-in</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:9px;padding:11px 12px;background:#F8FAF9;border:1px solid #E1E9E4;border-radius:12px;text-align:left;">
            <div style="width:28px;height:28px;border-radius:50%;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0;">→</div>
            <div style="font-size:11px;color:#4B5D52;line-height:1.45;"><strong style="color:#1A2B22;">Tap to review.</strong> The booking opens with the full details and your next action.</div>
          </div>
        </div>`,
      `
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Stay ahead of conflicts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">Remind, review, then correct availability.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">If a walk-in or another channel took the room, tell Marketel Front Desk or block it in Availability. Marketel updates the dates shown on your direct booking page. If an online guest is affected, review that booking before cancelling it.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px 12px;margin-bottom:9px;">
            <div style="font-size:9px;color:#6B7280;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">If I have not reviewed it</div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:9px 10px;font-size:11px;font-weight:750;color:#1A2B22;">
              <span>Remind every 15 minutes · up to 3 times</span><span style="color:#9CA3AF;">▾</span>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #D8E4DC;border-radius:14px;padding:13px;box-shadow:0 6px 18px rgba(26,43,34,0.06);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:10px;">
              <div>
                <div style="font-size:14px;font-weight:850;color:#1A2B22;">Sarah Johnson</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">Booked online · King Room · Tomorrow</div>
              </div>
              <div style="font-size:13px;font-weight:850;color:#2E7D5B;">$284</div>
            </div>
            <div style="background:#F8FAF9;border-radius:10px;padding:10px 11px;margin-bottom:9px;">
              <div style="font-size:9px;color:#6B7280;font-weight:750;text-transform:uppercase;margin-bottom:4px;">Why are you cancelling?</div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:750;color:#1A2B22;">
                <span>The room was already taken</span><span style="color:#9CA3AF;">▾</span>
              </div>
            </div>
            <div style="background:#B91C1C;color:#fff;border-radius:10px;padding:10px;text-align:center;font-size:11px;font-weight:800;">Room changed? Cancel this booking</div>
          </div>
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px;margin-top:9px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:10px;font-weight:850;color:#1A2B22;">Then update Availability</div><div style="font-size:9px;color:#2E7D5B;font-weight:800;">Jun 15–17</div></div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
              ${['13','14','15','16','17','18','19'].map((day, i) => `<div style="aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;${i >= 2 && i <= 4 ? 'background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;text-decoration:line-through;' : 'background:#fff;color:#7B8C82;border:1px solid #E5ECE8;'}">${day}</div>`).join('')}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:8px 9px;font-size:10px;font-weight:750;color:#1A2B22;"><span>0 rooms available</span><span style="color:#9CA3AF;">▾</span></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px;">
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">✓</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">You checked it</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="color:#166534;margin-bottom:2px;"><i data-lucide="undo-2" style="width:16px;height:16px;"></i></div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Cancel if needed</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">▦</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Dates stop selling</div>
            </div>
          </div>
        </div>`,
    ];

    const modal = document.createElement('div');
    modal.id = 'tourTooltip';
    modal.style.cssText = 'position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;';

    const renderModalPage = () => {
      const isLast = modalPage >= pages.length - 1;
      const buttonLabel = modalPage === 0
        ? 'Next — Phone alerts →'
        : (modalPage === 1 ? 'Next — Avoid conflicts →' : 'Next — Availability →');
      const panelAnim = hasRenderedPage ? 'none' : 'tourPanelIn 0.22s ease-out';
      const pageAnim = hasRenderedPage ? 'tourPageIn 0.18s ease-out' : 'none';

      modal.innerHTML = `
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${panelAnim};">
          <div style="animation:${pageAnim};">${pages[modalPage]}</div>
          <div style="padding:2px 18px 7px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;">
              ${pages.map((_, i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i === modalPage ? '#2E7D5B' : '#D8E4DC'};transition:background 0.2s ease;"></div>`).join('')}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:750;cursor:pointer;">${buttonLabel}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`;
      hasRenderedPage = true;

      document.getElementById('tourNextBtn').onclick = () => {
        if (!isLast) {
          modalPage++;
          renderModalPage();
          return;
        }
        void transitionOutTourModal().then(() => {
          cleanupTour({ keepOverlay: true });
          step++;
          localStorage.setItem('settingsTourStep', String(step));
          showStep();
        });
      };

      document.getElementById('tourSkipBtn').onclick = () => {
        skipToFinale();
      };
    };

    document.body.appendChild(modal);
    renderModalPage();

    if (!document.getElementById('tourModalAnimStyle')) {
      const animStyle = document.createElement('style');
      animStyle.id = 'tourModalAnimStyle';
      animStyle.textContent = '@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }
  }

  showStep();
}

export {
  cleanupSettingsTourUi,
  ensureTourBlurOverlay,
  handoffToGuestAppsTour,
  openTourAccordion,
  queryTourSelector,
  resolveLiveTourElement,
  resolveTourHighlightEl,
  scrollTourTargetIntoView,
  showFinaleMockModal,
  showTestDriveModal,
  startSettingsTour,
  tourAnchorRect,
  tourElementRect,
};
