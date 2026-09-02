import { crm } from './state.js';

import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';
import {
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
} from './tour-settings.js';

// ── SETTINGS TAB ───────────────────────────────────────────────

// Bookings staggers its cards; Your Page did not, so its sections simply
// appeared. Two renders feed this tab — a flat list of cards, and the
// dashboard grid whose columns hold the real sections — so stagger whichever
// one is actually present rather than guessing at a depth.
function staggerSettingsCards(list) {
  if (!list || typeof window.applyRiseStagger !== 'function') return;
  const grid = list.querySelector('.settings-dashboard-grid');
  if (!grid) {
    window.applyRiseStagger(list, ':scope > *');
    return;
  }
  // Columns are layout, not content; the cards inside them are what arrive.
  grid.querySelectorAll(':scope > *').forEach((column) => {
    window.applyRiseStagger(column, ':scope > *');
  });
}

function isNativeApp() {
  return typeof window.isNativeFrontdeskApp === 'function' && window.isNativeFrontdeskApp();
}

function isEmbeddedEditorPreview() {
  return document.body.classList.contains('frontdesk-editor-preview')
    || new URLSearchParams(window.location.search).get('previewEditor') === '1';
}

function isOpaqueCrmSessionToken(value) {
  return /^(?:fd_|fds_|fdn_)/.test(String(value || ''));
}

let embeddedHeaderSnapshot = null;

function normalizedPreviewValue(value) {
  return String(value ?? '').trim();
}

function notifyEmbeddedEditorSaved(kind, detail = {}) {
  if (!isEmbeddedEditorPreview() || window.parent === window) return;
  try {
    window.parent.postMessage({
      type: 'marketel:editor-saved',
      kind: String(kind || 'booking-page'),
      hotelId: crm.activeHotelId || '',
      ...detail,
    }, window.location.origin);
  } catch (_) {}
}

function supportCardHtml() {
  return `<div class="booking-card" style="margin-bottom:14px;">
    <div style="padding:18px;display:flex;align-items:center;gap:14px;">
      <div style="width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:13px;background:var(--green-pale);color:var(--green);font-size:19px;font-weight:800;">?</div>
      <div style="min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:7px;font-size:14px;font-weight:800;color:var(--text);">Need help? <span class="marketel-support-unread"></span></div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.45;margin:4px 0 0;">Ask a question, report a problem, or share feedback directly with Marketel.</p>
      </div>
      <button type="button" onclick="openMarketelSupport()" style="flex:0 0 auto;padding:10px 13px;border-radius:10px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Message us</button>
    </div>
  </div>`;
}

function legalAccountCardHtml(deletionStatus = null) {
  const native = isNativeApp();
  const legalOrigin = native ? 'https://guest-lodge-backend.onrender.com' : '';
  const request = deletionStatus?.request || null;
  const scheduled = request?.scheduledFor
    ? new Date(request.scheduledFor).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const deletionControls = !native ? '' : request
    ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;font-weight:700;color:#9a3412;">Account deletion scheduled</div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.5;margin:5px 0 10px;">Your property and account data will be deleted${scheduled ? ` on ${scheduled}` : ''}. You can cancel until processing begins.</p>
        <button type="button" onclick="cancelAccountDeletion()" style="width:100%;padding:11px;border-radius:10px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Keep my Marketel account</button>
      </div>`
    : deletionStatus?.ownerSession
      ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
          <button type="button" onclick="requestAccountDeletion()" style="border:0;background:none;padding:0;color:#b42318;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Delete Marketel account and property data</button>
          <p style="font-size:11px;color:var(--text-muted);line-height:1.45;margin:6px 0 0;">Includes a seven-day recovery window. The subscription is canceled when deletion completes.</p>
        </div>`
      : `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
          <button type="button" onclick="window.marketelNativeAction?.('signout')" style="border:0;background:none;padding:0;color:#b42318;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Sign in with the owner email to delete this account</button>
        </div>`;

  return `<div class="booking-card" id="privacyAccountCard" style="margin-bottom:14px;scroll-margin-top:96px;">
    <div style="padding:18px;">
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px;">Privacy &amp; account</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <a href="${legalOrigin}/privacy" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Privacy Policy</a>
        <a href="${legalOrigin}/terms" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Terms of Service</a>
        <a href="mailto:support@bookmarketel.com" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Email support</a>
      </div>
      ${deletionControls}
    </div>
  </div>`;
}

async function loadSettings() {
  const list = document.getElementById('settingsList');
  if (!list) return;
  list.innerHTML = '<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';
  try {
    const [hotelRes, deletionStatus] = await Promise.all([
      api('GET', '/api/crm/verify'),
      isNativeApp()
        ? api('GET', '/api/crm/account-deletion/status').catch(() => null)
        : Promise.resolve(null),
    ]);
    const bookingDomain = hotelRes?.domain || (crm.activeHotelId + '.mktel.co');
    const bookingUrl = 'https://' + bookingDomain;
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(bookingUrl);

    const ratesRes = await api('GET', '/api/crm/rooms');
    let rates = { nightly: 69, weekly: 299, monthly: 999 };
    if (ratesRes?.rates) rates = ratesRes.rates;
    const rooms = ratesRes?.rooms || [];

    let html = '';

    if (!hotelRes?.subscribed) {
      html += goLiveInlineCardHtml();
    }

    // Room Cards with photo upload
    if (rooms.length) {
      rooms.forEach(r => {
        const hasImage = r.images && r.images.length > 0;
        html += `
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${hasImage ? `<img src="${r.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">` : `<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>`}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                ${hasImage ? 'Change Photo' : '+ Add Photo'}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${r.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${r.name}</div>
              ${r.description ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${r.description}</div>` : ''}
            </div>
          </div>
        `;
      });
    } else {
      html += `
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `;
    }

    // Booking Link + QR
    html += `
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${bookingUrl}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${bookingUrl}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${qrUrl}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `;

    // Rates
    html += `
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${rates.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${rates.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${rates.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `;

    // Change PIN
    html += `
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 6 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `;

    // Subscription
    if (hotelRes?.subscribed && !isNativeApp()) {
      html += `
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `;
    }

    // Founder support conversation
    html += supportCardHtml();

    html += legalAccountCardHtml(deletionStatus);
    list.innerHTML = html;
    staggerSettingsCards(list);
    window.refreshSupportSummary?.();
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-alert" style="width:26px;height:26px;"></i></div><div class="empty-text">Failed to load settings</div></div>';
  }
}

function settingsCopyLink() {
  const input = document.getElementById('settings-booking-url');
  if (input) navigator.clipboard.writeText(input.value).then(() => { localStorage.setItem('linkCopied', '1'); advanceTourIfNeeded(); toast('Link copied!', 'success'); }).catch(() => toast('Copy failed', 'error'));
}

function checklistGoToRates() {
  localStorage.setItem('settingsTourDone', '1');
  const settingsBtn = document.querySelector('[data-nav-filter="settings"]');
  setFilter('settings', settingsBtn);

  // Poll for the rates accordion, open it, then scroll to the input
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const rateInput = document.getElementById('edit-rate-nightly');
    if (rateInput || attempts > 20) {
      clearInterval(poll);
      if (!rateInput) return;

      // Open the accordion if it's closed
      const accordionBody = rateInput.closest('.accordion-body');
      if (accordionBody && accordionBody.style.display === 'none') {
        accordionBody.style.display = 'block';
        const arrow = accordionBody.previousElementSibling?.querySelector('.accordion-arrow');
        if (arrow) arrow.style.transform = 'rotate(90deg)';
      }

      // Now scroll and show pointer
      setTimeout(() => {
        rateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Fixed delay to let scroll finish
        setTimeout(() => {
          const prev = document.getElementById('checklistPointer');
          if (prev) prev.remove();

          const rect = rateInput.getBoundingClientRect();
          const pointer = document.createElement('div');
          pointer.id = 'checklistPointer';
          pointer.style.cssText = `position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${rect.bottom + 12}px;max-width:240px;width:calc(100% - 40px);`;
          pointer.innerHTML = `
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `;
          document.body.appendChild(pointer);
          setTimeout(() => { const p = document.getElementById('checklistPointer'); if (p) p.remove(); }, 6000);
        }, 1000);
      }, 100);
    }
  }, 200);
}

function copyBookingLinkFromChecklist() {
  const domain = crm.activeHotelDomain || (crm.activeHotelId + '.mktel.co');
  const url = 'https://' + domain;
  navigator.clipboard.writeText(url).then(() => {
    localStorage.setItem('linkCopied', '1');
    advanceTourIfNeeded();
    toast('Link copied!', 'success');
    loadBookings();
  }).catch(() => toast('Copy failed', 'error'));
}

function checklistGoTo(target, label) {
  // Prevent tour from triggering when navigating from checklist
  localStorage.setItem('settingsTourDone', '1');
  // Switch to settings tab
  const settingsBtn = document.querySelector('[data-nav-filter="settings"]');
  setFilter('settings', settingsBtn);

  // Poll for the target element (loadEditRooms is async)
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const el = document.querySelector(target);
    if (el || attempts > 20) {
      clearInterval(poll);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Fixed delay to let scroll finish before positioning tooltip
      setTimeout(() => {
        const prev = document.getElementById('checklistPointer');
        if (prev) prev.remove();

        const rect = el.getBoundingClientRect();
        const pointer = document.createElement('div');
        pointer.id = 'checklistPointer';
        pointer.style.cssText = `
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${rect.bottom + 12}px;max-width:240px;width:calc(100% - 40px);
        `;
        pointer.innerHTML = `
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${label}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `;
        document.body.appendChild(pointer);

        setTimeout(() => { const p = document.getElementById('checklistPointer'); if (p) p.remove(); }, 6000);
      }, 1000);
    }
  }, 200);
}

function getCrmAuthToken() {
  const t = String(crm.token || localStorage.getItem('crmToken') || '').trim();
  if (t) crm.token = t;
  return t;
}

async function postRoomImageUpload(roomId, file) {
  const authToken = getCrmAuthToken();
  if (!authToken) throw new Error('Not logged in');
  const optimized = await optimizeRoomPhotoForUpload(file);
  const uploadForm = new FormData();
  uploadForm.append('image', optimized, optimized.name || 'room.webp');
  const qs = new URLSearchParams();
  if (crm.activeHotelId) qs.set('hotelId', crm.activeHotelId);
  const res = await fetch(`/api/crm/rooms/${roomId}/images?${qs}`, {
    method: 'POST',
    headers: {
      'x-crm-token': authToken,
      ...(isNativeApp() ? { 'x-marketel-client': 'ios' } : {}),
    },
    body: uploadForm,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || `Upload failed (${res.status})`);
  }
  return data;
}

async function settingsUploadPhoto(event, roomId) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await postRoomImageUpload(roomId, file);
    toast('Photo uploaded!', 'success');
    loadSettings();
  } catch (e) {
    toast(e.message || 'Upload failed', 'error');
  }
}

async function settingsSaveRates() {
  const nightly = parseFloat(document.getElementById('settings-rate-nightly')?.value) || 69;
  const weekly = parseFloat(document.getElementById('settings-rate-weekly')?.value) || 299;
  const monthly = parseFloat(document.getElementById('settings-rate-monthly')?.value) || 999;
  try {
    await api('POST', '/api/crm/rates', { nightly, weekly, monthly });
    toast('Rates saved', 'success');
  } catch (e) { toast('Failed to save rates', 'error'); }
}

async function settingsChangePin() {
  const newPin = document.getElementById('settings-new-pin')?.value.trim();
  if (!newPin || newPin.length < 6) { toast('PIN must be at least 6 characters', 'error'); return; }
  try {
    const result = await api('POST', '/api/crm/change-pin', { newPin });
    if (!result.success) throw new Error(result.message || 'Failed to change PIN');
    crm.token = newPin;
    crm.isMasterPin = false;
    crm.isDogfoodPreview = false;
    try { localStorage.setItem('crmToken', crm.token); } catch(e) {}
    toast('PIN updated!', 'success');
    document.getElementById('settings-new-pin').value = '';
  } catch (e) { toast(e.message || 'Failed to change PIN', 'error'); }
}

async function settingsSendSupport() {
  window.openMarketelSupport?.();
}

function openPreviewSite(options = {}) {
  const domain = crm.activeHotelDomain || (crm.activeHotelId + '.mktel.co');
  const isLocal = !isNativeApp()
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const url = new URL(isLocal ? 'http://localhost:5173/' : 'https://' + domain + '/');
  if (isLocal) url.searchParams.set('hotelId', crm.activeHotelId);
  url.searchParams.set('preview', '1');
  if (options.highlight) url.searchParams.set('previewHighlight', String(options.highlight));
  if (options.roomId) url.searchParams.set('previewHighlightRoom', String(options.roomId));
  if (options.refresh) url.searchParams.set('previewRefresh', String(Date.now()));
  if (typeof window.openInAppBrowser === 'function') window.openInAppBrowser(url.toString());
  else window.open(url.toString(), '_blank', 'noopener');
}

function openCheckoutPreview(options = {}) {
  const domain = crm.activeHotelDomain || (crm.activeHotelId + '.mktel.co');
  const isLocal = !isNativeApp()
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const url = new URL(isLocal ? 'http://localhost:5173/' : 'https://' + domain + '/');
  if (isLocal) url.searchParams.set('hotelId', crm.activeHotelId);
  url.searchParams.set('preview', '1');
  url.searchParams.set('previewCheckout', '1');
  url.searchParams.set('previewHighlight', 'checkout-policy');
  if (options.refresh) url.searchParams.set('previewRefresh', String(Date.now()));
  if (typeof window.openInAppBrowser === 'function') window.openInAppBrowser(url.toString());
  else window.open(url.toString(), '_blank', 'noopener');
}

function previewSavedVisual(highlight, roomId = '') {
  if (!crm.hotelSubscribed || isEmbeddedEditorPreview()) return;
  if (highlight === 'checkout-policy') {
    openCheckoutPreview({ refresh: true });
    return;
  }
  openPreviewSite({ highlight, roomId, refresh: true });
}

function guestBookingEngineUrl() {
  const isLocal = !isNativeApp()
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal && crm.activeHotelId) {
    return 'http://localhost:5173/?hotelId=' + encodeURIComponent(crm.activeHotelId);
  }
  const domain = crm.activeHotelDomain || '';
  return domain ? 'https://' + domain + '/' : '';
}

function openGuestBookingEngine() {
  const url = guestBookingEngineUrl();
  if (!url) {
    toast('Your booking domain is still setting up.', 'info');
    return;
  }
  if (typeof window.openInAppBrowser === 'function') window.openInAppBrowser(url);
  else window.open(url, '_blank', 'noopener');
}

function updatePreviewSiteBar() {
  const bar = document.getElementById('previewSiteBar');
  if (!bar) return;
  bar.style.display = (crm.currentFilter === 'settings') ? 'block' : 'none';
}

// Single rule: when a checklist action completes, advance the tour past that step
function advanceTourIfNeeded() {
  if (localStorage.getItem('settingsTourDone')) return;
  const step = parseInt(localStorage.getItem('settingsTourStep') || '0');
  const hasPhoto = crm.editRooms.some(r => r.images && r.images.length > 0);
  const hasRates = !!localStorage.getItem('ratesChanged');
  const hasLink = !!localStorage.getItem('linkCopied');

  // Steps: 2=room editor, 3=booking link/QR, 4=rates
  if (step === 2 && hasPhoto) localStorage.setItem('settingsTourStep', '3');
  if (step === 3 && hasLink) localStorage.setItem('settingsTourStep', '4');
  if (step === 4 && hasRates) localStorage.setItem('settingsTourStep', '5');

  // Remove active tour tooltip and overlay if stale
  const tooltip = document.getElementById('tourTooltip');
  if (tooltip) tooltip.remove();
  const overlay = document.getElementById('tourBlurOverlay');
  if (overlay) overlay.remove();
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
  document.body.style.overflow = '';
}

// ── ONBOARDING QUESTIONNAIRE ───────────────────────────────────
function showOnboardingQuestions() {
  let step = 0;
  const answers = {};

  const questions = [
    {
      title: 'Why do you want a booking page?',
      key: 'why',
      type: 'text',
      placeholder: 'e.g. I want guests to book directly instead of calling me...'
    },
    {
      title: 'How do guests currently book with you?',
      key: 'currentBooking',
      type: 'choice',
      options: [
        { label: 'They call me or walk in', value: 'phone_walkin' },
        { label: 'Through Booking.com / Expedia', value: 'ota' },
        { label: 'I have a website but no booking system', value: 'website_no_booking' },
        { label: 'I don\'t take bookings online yet', value: 'no_online' },
      ]
    },
    {
      title: 'How many bookable rooms or units do you offer?',
      key: 'roomCount',
      type: 'choice',
      options: [
        { label: '1–5 rooms', value: '1-5' },
        { label: '6–15 rooms', value: '6-15' },
        { label: '16–50 rooms', value: '16-50' },
        { label: '50+ rooms', value: '50+' },
      ]
    },
    {
      title: 'What\'s most important to you?',
      key: 'priority',
      type: 'choice',
      options: [
        { label: 'Stop paying OTA commissions', value: 'no_commission' },
        { label: 'Get more direct bookings', value: 'more_bookings' },
        { label: 'Have a professional online presence', value: 'professional' },
        { label: 'Make it easier for guests to book', value: 'easier_booking' },
      ]
    }
  ];

  function render() {
    let existing = document.getElementById('onboardingOverlay');
    if (existing) existing.remove();

    if (step >= questions.length) {
      // Done — save answers and show welcome modal
      localStorage.setItem('onboardingDone', '1');
      try {
        api('POST', '/api/crm/onboarding-answers', answers).catch(() => {});
      } catch(e) {}
      showWelcomeModal();
      return;
    }

    const q = questions[step];
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;';

    if (q.type === 'text') {
      overlay.innerHTML = `
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${step + 1} of ${questions.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${q.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${q.placeholder || ''}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('onboardingTextSubmit').onclick = () => {
        const val = document.getElementById('onboardingTextInput').value.trim();
        if (!val) return; // require an answer
        answers[q.key] = val;
        step++;
        render();
      };
    } else {
      overlay.innerHTML = `
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${step + 1} of ${questions.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${q.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${q.options.map(opt => `
              <button class="onboarding-opt" data-value="${opt.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${opt.label}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelectorAll('.onboarding-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          answers[q.key] = btn.dataset.value;
          btn.style.background = '#1a1a2e';
          btn.style.color = 'white';
          btn.style.fontWeight = '600';
          setTimeout(() => { step++; render(); }, 250);
        });
      });
    }
  }

  render();
}

// ── WELCOME MODAL (after questionnaire) ────────────────────────
function replayWalkthrough() {
  ['onboardingDone', 'settingsTourDone', 'settingsTourStep', 'linkCopied', 'ratesChanged', 'appsTourDone', 'postActivationTourDone'].forEach((k) => {
    localStorage.removeItem(k);
  });
  const u = new URL(window.location.href);
  u.searchParams.set('welcome', '1');
  u.searchParams.set('reveal', '1');
  u.searchParams.delete('tab');
  const next = u.pathname + u.search + u.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash) {
    window.location.reload();
    return;
  }
  window.location.assign(next);
}

function showWelcomeModal() {
  const overlay = document.createElement('div');
  overlay.id = 'welcomeModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;';

  function startSettingsTourFromWelcome() {
    localStorage.setItem('onboardingDone', '1');
    localStorage.removeItem('settingsTourDone');
    localStorage.removeItem('settingsTourStep');
    try {
      const cleanUrl = new URL(window.location);
      cleanUrl.searchParams.delete('welcome');
      window.history.replaceState({}, '', cleanUrl);
    } catch (_) {}
    const startTour = (typeof startSettingsTour === 'function')
      ? startSettingsTour
      : (typeof window.startSettingsTour === 'function' ? window.startSettingsTour : null);
    if (startTour) startTour();
    overlay.remove();
  }

  function renderWelcomeStep() {
    overlay.innerHTML = `
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="margin-bottom:12px;"><i data-lucide="house" style="width:28px;height:28px;"></i></div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">Guests use your direct booking page. This is the owner dashboard where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`;
    document.getElementById('welcomeModalNext').onclick = startSettingsTourFromWelcome;
  }

  document.body.appendChild(overlay);
  renderWelcomeStep();
  if (typeof invokeLoadEditRooms === 'function') void invokeLoadEditRooms();
}

function cleanupPostActivationTourUi() {
  const tooltip = document.getElementById('postActivationTourTooltip');
  if (tooltip) tooltip.remove();
  const overlay = document.getElementById('postActivationTourOverlay');
  if (overlay) overlay.remove();
  document.querySelectorAll('[data-post-activation-highlight]').forEach((el) => {
    el.style.boxShadow = '';
    el.style.position = '';
    el.style.zIndex = '';
    el.removeAttribute('data-post-activation-highlight');
  });
  document.body.style.overflow = '';
}

function finishPostActivationTour() {
  cleanupPostActivationTourUi();
  localStorage.setItem('postActivationTourDone', '1');
  const tabBtn = document.querySelector('.tab[data-nav-filter="apps"]')
    || document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');
  try { setFilter('apps', tabBtn); } catch (e) { /* ignore */ }
}

function startPostActivationTabTour() {
  if (localStorage.getItem('postActivationTourDone')) {
    finishPostActivationTour();
    return;
  }
  cleanupPostActivationTourUi();

  const steps = [
    {
      tab: 'bookings',
      navFilter: 'bookings',
      text: '<strong>Bookings</strong> — live reservations land here. Once the Front Desk app is connected, new bookings can alert you even when it is closed.',
    },
    {
      tab: 'apps',
      navFilter: 'apps',
      text: '<strong>Last step: open Guestel.</strong> Share the Guestel QR, see your property card, reply to verified guests, and send updates to guests who opt in.',
    },
  ];

  let stepIdx = 0;

  function showStep() {
    cleanupPostActivationTourUi();
    if (stepIdx >= steps.length) {
      finishPostActivationTour();
      return;
    }

    const s = steps[stepIdx];
    const tabBtn = document.querySelector(`.tab[data-nav-filter="${s.navFilter}"]`)
      || document.querySelector(`.mobile-nav-item[data-nav-filter="${s.navFilter}"]`);
    if (tabBtn) setFilter(s.tab, tabBtn);

    const overlay = document.createElement('div');
    overlay.id = 'postActivationTourOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const target = document.querySelector(`.tab[data-nav-filter="${s.navFilter}"]`)
        || document.querySelector(`.mobile-nav-item[data-nav-filter="${s.navFilter}"]`);
      if (target) {
        target.setAttribute('data-post-activation-highlight', '1');
        target.style.position = 'relative';
        target.style.zIndex = '100003';
        target.style.boxShadow = '0 0 0 3px #fff, 0 0 0 6px #2E7D5B';
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      const rect = target ? target.getBoundingClientRect() : { left: 24, bottom: 80, width: 200 };
      const tooltip = document.createElement('div');
      tooltip.id = 'postActivationTourTooltip';
      const tooltipW = Math.min(300, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16));
      const top = Math.min(rect.bottom + 14, window.innerHeight - 180);
      tooltip.style.cssText = `position:fixed;z-index:100004;left:${left}px;top:${top}px;max-width:${tooltipW}px;width:${tooltipW}px;`;
      const isLast = stepIdx >= steps.length - 1;
      tooltip.innerHTML = `
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${stepIdx + 1} / ${steps.length}</p>
          <p style="margin:0 0 14px;">${s.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${isLast ? 'Open Guestel' : 'Next tab →'}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`;
      document.body.appendChild(tooltip);

      document.getElementById('postActivationTourNext').onclick = () => {
        stepIdx += 1;
        showStep();
      };
      document.getElementById('postActivationTourSkip').onclick = () => {
        finishPostActivationTour();
      };
    }, s.tab === 'apps' ? 80 : 0);
  }

  showStep();
}
window.startPostActivationTabTour = startPostActivationTabTour;

// Shown when the owner returns from a successful Go Live payment — removes all
// ambiguity about what just happened and what's now true for their hotel.
function showActivatedModal() {
  if (document.getElementById('activatedModalOverlay')) return;
  const bookingDomain = crm.activeHotelDomain || (crm.activeHotelId ? crm.activeHotelId + '.mktel.co' : '');
  const bookingUrl = bookingDomain ? `https://${bookingDomain}` : '';
  const appStoreUrl = String(crm.frontdeskAppStoreUrl || '').trim();
  const appDownloadCta = appStoreUrl
    ? `<a id="activatedModalDownload" href="${esc(appStoreUrl)}" target="_blank" rel="noopener" style="display:block;width:100%;padding:15px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;text-decoration:none;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;box-sizing:border-box;">Download Marketel Front Desk</a>`
    : `<button id="activatedModalContinueWebPrimary" type="button" style="display:block;width:100%;padding:15px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;">Open Web Front Desk</button>`;
  const overlay = document.createElement('div');
  overlay.id = 'activatedModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:22px;padding:32px 24px 22px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="width:56px;height:56px;border-radius:50%;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:29px;font-weight:900;">✓</div>
      <h2 style="font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">You're live</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.55;margin:0 0 8px;">Guests can now book directly at</p>
      ${bookingUrl ? `<a href="${esc(bookingUrl)}" target="_blank" rel="noopener" style="display:block;color:#2E7D5B;font-size:15px;font-weight:800;text-decoration:none;word-break:break-word;margin:0 0 22px;">${esc(bookingDomain)}</a>` : '<div style="height:8px;"></div>'}
      ${appDownloadCta}
      <p style="font-size:12px;color:#7a857e;line-height:1.45;margin:10px 4px 4px;">${appStoreUrl ? 'This is the App Store app for you and your staff. Guests never download it; they keep using your booking-page link.' : 'Your booking page is live. This web Front Desk is for you and your staff; guests keep using your booking-page link.'}</p>
      ${appStoreUrl ? '<button id="activatedModalContinueWeb" type="button" style="width:100%;padding:11px;margin-top:6px;border:0;background:transparent;color:#8a948e;font-family:inherit;font-size:13px;font-weight:650;cursor:pointer;">Continue to Web Front Desk</button>' : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  const continueToWeb = () => {
    overlay.remove();
    localStorage.setItem('postActivationTourDone', '1');
    try { setFilter('bookings'); } catch (e) { /* ignore */ }
  };
  document.getElementById('activatedModalContinueWeb')?.addEventListener('click', continueToWeb);
  document.getElementById('activatedModalContinueWebPrimary')?.addEventListener('click', continueToWeb);
}


// ── EDIT TAB ───────────────────────────────────────────────


async function loadEditRooms() {
  if (isEditPageDomReady()) return;
  if (crm.editRoomsLoadPromise) return crm.editRoomsLoadPromise;
  const list = document.getElementById('editRoomsList');
  if (!list) return;
  crm.editRoomsLoadPromise = (async () => {
  list.innerHTML = '<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';
  try {
    const [res, hotelRes, deletionStatus] = await Promise.all([
      api('GET', '/api/crm/rooms'),
      api('GET', '/api/crm/verify'),
      isNativeApp()
        ? api('GET', '/api/crm/account-deletion/status').catch(() => null)
        : Promise.resolve(null),
    ]);
    if (!res.rooms) throw new Error('No data');
    crm.editRooms = res.rooms;
    const hotelName = hotelRes?.hotelName || '';
    // Keep the global name in sync — context API can fall back to the hotel id,
    // but verify returns the real name (used by the tour's home-screen modal).
    if (hotelName) crm.activeHotelName = hotelName;
    if (hotelRes) {
      crm.hotelSubscribed = !!hotelRes.subscribed;
      if (typeof updateGoLiveBanner === 'function') updateGoLiveBanner();
      else if (typeof window.updateGoLiveBanner === 'function') window.updateGoLiveBanner();
    }
    const hotelSubtitle = hotelRes?.hotelSubtitle || '';
    const hotelAddress = hotelRes?.hotelAddress || '';
    const hotelPhone = hotelRes?.hotelPhone || '';
    embeddedHeaderSnapshot = {
      name: normalizedPreviewValue(hotelName),
      subtitle: normalizedPreviewValue(hotelSubtitle),
      address: normalizedPreviewValue(hotelAddress),
      phone: normalizedPreviewValue(hotelPhone),
      cancellationPolicy: normalizedPreviewValue(hotelRes?.cancellationPolicy),
    };
    const hotelAppIcon = hotelRes?.appIconUrl || '';
    // Sync the home-screen icon/title with the freshest values from verify.
    crm.activeHotelAppIcon = hotelAppIcon;
    updateFrontdeskManifestLink();

    // Fetch rates
    let rates = { nightly: 69, weekly: 483, monthly: 1932, taxRate: 0 };
    if (res.rates) rates = res.rates;
    crm.editRates = rates;

    // Render hotel info section + rates + PIN + rooms
    const bookingDomain = hotelRes?.domain || (crm.activeHotelId + '.mktel.co');
    const bookingUrl = 'https://' + bookingDomain;
    const embeddedPreview = isEmbeddedEditorPreview();
    let html = `
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${hotelAddress}" id="edit-hotel-address" placeholder="Add your property address (optional)" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${hotelName}" id="edit-hotel-name" placeholder="Your Property Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${hotelSubtitle}" id="edit-hotel-subtitle" placeholder="Add a short description (optional)" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${hotelPhone}" id="edit-hotel-phone" placeholder="Add your guest phone number (optional)" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo('header')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">${embeddedPreview || crm.hotelSubscribed ? 'Save &amp; see changes' : 'Save'}</button>
        </div>
      </div>
      </div>
      <div class="dash-b">
      ${goLiveInlineCardHtml()}
      ${(typeof twoRoomExplainerHtml === 'function' ? twoRoomExplainerHtml : window.twoRoomExplainerHtml)('booking-page')}
      <div id="editRoomsCards"></div>
      <button id="edit-add-room-btn" style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:8px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add booking page room</button>
      </div>
      <div class="dash-c">
      ${pageSectionHtml('Checkout note', `
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 10px;line-height:1.5;">One line shown to guests on the checkout page. Check-in and check-out times, or anything they should know before paying.</p>
        <input type="text" value="${(hotelRes?.cancellationPolicy || '').replace(/"/g, '&quot;')}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;padding:11px 13px;font-size:13px;color:var(--text);border:1.5px solid var(--border);border-radius:10px;background:var(--white);outline:none;font-family:inherit;">
        <button onclick="saveHotelInfo('policy')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
      `, { open: !hotelRes?.cancellationPolicy, hint: hotelRes?.cancellationPolicy ? '' : 'Not set yet' })}
      ${pageSectionHtml('Your booking link', `
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${bookingUrl}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${bookingUrl.replace(/'/g, "\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy Link</button>
          </div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Use this link on your website, Google Business Profile, or in a message.</p>
      `, { open: true, id: 'tour-booking-link-card' })}
      </div>
      <div class="dash-growth">
        <div id="yourPageGrowthPanel" style="scroll-margin-top:96px;">
          <div class="loading" style="padding:24px 0;"><div class="logo-sprite-bounce"></div> Loading direct-booking activity…</div>
        </div>
      </div>
      <div class="dash-d">
      ${pageSectionHtml('Rates', `
            <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
                <input type="number" value="${rates.nightly}" id="edit-rate-nightly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
                <input type="number" value="${rates.weekly}" id="edit-rate-weekly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
                <input type="number" value="${rates.monthly}" id="edit-rate-monthly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
            </div>
            <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${crm.hotelSubscribed && !embeddedPreview ? 'Save &amp; see changes' : 'Save Rates'}</button>`, {
        open: !(hotelRes?.rates?.nightly > 0),
        hint: hotelRes?.rates?.nightly > 0 ? `$${hotelRes.rates.nightly} nightly` : 'Not set yet',
        id: 'tour-rates-card',
      })}
      ${pageSectionHtml('Change PIN', `
            <div style="margin-bottom:12px;">
              <input type="text" id="edit-new-pin" value="${crm.isMasterPin || isOpaqueCrmSessionToken(crm.token) ? '' : crm.token}" placeholder="${crm.isMasterPin ? 'Enter a unique property PIN' : 'Enter new PIN (min 6 chars)'}" style="width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
            </div>
            <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${crm.isMasterPin ? 'You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.' : "You'll need to use the new PIN next time you log in."}</p>`)}
      ${hotelRes?.subscribed && !isNativeApp() ? `<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
        </div>
      </div>` : ''}
      ${supportCardHtml()}
      ${legalAccountCardHtml(deletionStatus)}
      </div>
      </div>
    `;
    list.innerHTML = html;
    staggerSettingsCards(list);
    renderEditRoomsCards();
    window.renderGrowthPanel?.();
    window.loadGrowthData?.().catch(() => {});
    window.refreshSupportSummary?.();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-alert" style="width:26px;height:26px;"></i></div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>';
  }
  })();
  try {
    await crm.editRoomsLoadPromise;
  } finally {
    crm.editRoomsLoadPromise = null;
  }
}

function renderEditRooms() {
  renderEditRoomsCards();
}

async function refreshEditRoomsData({ render = true } = {}) {
  const res = await api('GET', '/api/crm/rooms');
  if (!Array.isArray(res?.rooms)) throw new Error('Could not refresh rooms');
  crm.editRooms = res.rooms;
  if (res.rates) crm.editRates = res.rates;
  if (render) renderEditRoomsCards();
  return crm.editRooms;
}

function renderEditRoomsCards() {
  const cards = document.getElementById('editRoomsCards');
  if (!cards) return;
  if (!crm.editRooms.length) {
    cards.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="bed" style="width:26px;height:26px;"></i></div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';
    return;
  }
  cards.innerHTML = crm.editRooms.map((r, idx) => {
    const currentAmenities = (r.amenities || '').split('•').map(a => a.trim()).filter(Boolean);
    const images = (r.images || []).filter(img => img && img.url);
    const roomIdJs = jsStr(r.id);
    return `
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${r.id}" ${idx === 0 ? 'data-tour-room-card="1"' : ''}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${images.length ? `
          <img class="room-edit-main-img" src="${esc(images[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/room-placeholder.svg';">
          ${images.length > 1 ? `
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${roomIdJs}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${roomIdJs}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${images.length}</div>
            <div class="room-edit-image-dots">
              ${images.map((_, idx) => `<button type="button" class="room-edit-image-dot ${idx === 0 ? 'active' : ''}" aria-label="Show photo ${idx + 1}" ${idx === 0 ? 'aria-current="true"' : ''} onclick="event.stopPropagation();showEditRoomPhoto('${roomIdJs}', ${idx})"></button>`).join('')}
            </div>` : ''}
        ` : `<div class="room-edit-photo-placeholder">No photos yet</div>`}
        <label class="room-edit-photo-upload">
          + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${roomIdJs}')">
        </label>
      </div>
      ${images.length > 1 ? `<div class="room-edit-thumbs">` + images.map((img, idx) => `<div class="room-edit-thumb-wrap" data-thumb-id="${esc(img.id)}"><button type="button" class="room-edit-thumb ${idx === 0 ? 'active' : ''}" aria-label="Show photo ${idx + 1}" ${idx === 0 ? 'aria-current="true"' : ''} onclick="showEditRoomPhoto('${roomIdJs}', ${idx})"><img src="${esc(img.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/room-placeholder.svg';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${roomIdJs}','${jsStr(img.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join('') + `</div>` : ''}
      </div>
      <div class="room-edit-fields" style="padding:18px;">
        <div data-tour-room-details-anchor="1" style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Room Name</div>
          <input type="text" value="${r.name}" id="edit-name-${r.id}" style="width:100%;font-size:18px;font-weight:700;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Description</div>
          <input type="text" value="${(r.description || '').replace(/"/g, '&quot;')}" id="edit-desc-${r.id}" placeholder="e.g. A spacious room with king bed and city view" style="width:100%;font-size:14px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;color:var(--text);">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Amenities</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;" id="edit-amenity-pills-${r.id}">
            ${currentAmenities.map(a => `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${getAmenityIcon(a)} ${a} <button onclick="removeAmenity('${r.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join('')}
          </div>
          <button onclick="openAmenityPicker('${r.id}')" style="background:none;border:1.5px dashed var(--border);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:inherit;">+ Add amenities</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Max Guests</div>
            <input type="number" value="${r.maxOccupancy || 4}" min="1" max="20" id="edit-occ-${r.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Total Units</div>
            <input type="number" value="${r.totalUnits || 1}" min="1" max="200" id="edit-units-${r.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="saveEditRoom('${r.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${isEmbeddedEditorPreview() || crm.hotelSubscribed ? 'Save &amp; see changes' : 'Save Changes'}</button>
          <button class="room-edit-delete-btn" onclick="deleteEditRoom('${r.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`;
  }).join('');
  // Room cards arrive after their own fetch, so without this they pop in
  // against a page that has already settled.
  window.applyRiseStagger?.(cards);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getEditRoomImages(roomId) {
  const room = crm.editRooms.find(r => String(r.id) === String(roomId));
  return ((room && room.images) || []).filter(img => img && img.url);
}

function showEditRoomPhoto(roomId, index) {
  const images = getEditRoomImages(roomId);
  if (!images.length) return;
  const card = document.getElementById('edit-card-' + roomId);
  if (!card) return;
  const total = images.length;
  const next = ((Number(index) || 0) % total + total) % total;
  const main = card.querySelector('.room-edit-main-img');
  if (main) main.src = images[next].url;
  card.querySelector('.room-edit-photo')?.setAttribute('data-photo-index', String(next));
  const count = card.querySelector('.room-edit-photo-count');
  if (count) count.textContent = (next + 1) + ' / ' + total;
  card.querySelectorAll('.room-edit-image-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === next);
    if (idx === next) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
  card.querySelectorAll('.room-edit-thumb').forEach((thumb, idx) => {
    thumb.classList.toggle('active', idx === next);
    if (idx === next) thumb.setAttribute('aria-current', 'true');
    else thumb.removeAttribute('aria-current');
  });
}

function stepEditRoomPhoto(roomId, delta) {
  const card = document.getElementById('edit-card-' + roomId);
  const photo = card?.querySelector('.room-edit-photo');
  const current = parseInt(photo?.getAttribute('data-photo-index') || '0', 10) || 0;
  showEditRoomPhoto(roomId, current + delta);
}

function getAmenityIcon(amenity) {
  const a = amenity.toLowerCase();
  if (a.includes('wifi')) return '<i data-lucide="wifi" style="width:14px;height:14px;"></i>';
  if (a.includes('tv') || a.includes('television')) return '<i data-lucide="tv" style="width:14px;height:14px;"></i>';
  if (a.includes('fridge') || a.includes('refrigerator')) return '<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>';
  if (a.includes('parking')) return '<i data-lucide="car" style="width:14px;height:14px;"></i>';
  if (a.includes('housekeeping') || a.includes('cleaning')) return '<i data-lucide="sparkles" style="width:14px;height:14px;"></i>';
  if (a.includes('bath') || a.includes('shower')) return '<i data-lucide="bath" style="width:14px;height:14px;"></i>';
  if (a.includes('work') || a.includes('desk')) return '<i data-lucide="laptop" style="width:14px;height:14px;"></i>';
  if (a.includes('pet') || a.includes('dog')) return '<i data-lucide="paw-print" style="width:14px;height:14px;"></i>';
  if (a.includes('pool')) return '<i data-lucide="waves" style="width:14px;height:14px;"></i>';
  if (a.includes('kitchen') || a.includes('microwave')) return '<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>';
  return '<i data-lucide="check" style="width:14px;height:14px;"></i>';
}

const AMENITY_PRESETS = [
  { key: 'wifi', label: 'Free WiFi', icon: 'wifi' },
  { key: 'tv', label: 'Smart TV', icon: 'tv' },
  { key: 'fridge', label: 'Fridge', icon: 'thermometer-snowflake' },
  { key: 'parking', label: 'Free Parking', icon: 'car' },
  { key: 'housekeeping', label: 'Weekly Housekeeping', icon: 'sparkles' },
  { key: 'bath', label: 'Bath', icon: 'bath' },
  { key: 'workstation', label: 'Workstation', icon: 'laptop' },
  { key: 'pet', label: 'Pet Friendly', icon: 'paw-print' },
  { key: 'pool', label: 'Pool', icon: 'waves' },
  { key: 'kitchen', label: 'Kitchenette', icon: 'cooking-pot' },
  { key: 'ac', label: 'Air Conditioning', icon: 'wind' },
  { key: 'laundry', label: 'Laundry', icon: 'shirt' },
];

let amenityPickerRoomId = null;
let amenityPickerCustomValues = [];

function amenityHtmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function amenityPresetFor(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return AMENITY_PRESETS.find((preset) => (
    normalized === preset.label.toLowerCase()
    || normalized === preset.key
    || normalized.includes(preset.key)
  ));
}

function renderAmenityCustomPills() {
  const host = document.getElementById('amenityCustomPills');
  if (!host) return;
  host.innerHTML = amenityPickerCustomValues.map((value, index) => `
    <span style="display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:8px;background:#E8F5EE;color:#2E7D5B;font-size:13px;font-weight:650;">
      ${amenityHtmlEscape(value)}
      <button type="button" onclick="removeCustomAmenity(${index})" aria-label="Remove ${amenityHtmlEscape(value)}" style="width:20px;height:20px;border:0;background:transparent;color:inherit;font:700 17px/1 system-ui;cursor:pointer;padding:0;">×</button>
    </span>`).join('');
  host.hidden = amenityPickerCustomValues.length === 0;
}

function openAmenityPicker(roomId) {
  amenityPickerRoomId = roomId;
  const room = crm.editRooms.find(r => r.id === roomId);
  const currentValues = (room?.amenities || '').split('•').map(a => a.trim()).filter(Boolean);
  const current = currentValues.map((value) => value.toLowerCase());
  amenityPickerCustomValues = currentValues.filter((value) => !amenityPresetFor(value));

  let modal = document.getElementById('amenityPickerModal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="amenityPickerModal" style="display:none;position:fixed;inset:0;background:transparent;z-index:10000;align-items:center;justify-content:center;padding:20px;">
        <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
          <div style="font-size:16px;font-weight:700;margin-bottom:14px;">Select Amenities</div>
          <div id="amenityPickerGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>
          <div id="amenityCustomPills" style="display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px;"></div>
          <button type="button" onclick="openCustomAmenityModal()" style="width:100%;margin-bottom:14px;padding:10px 12px;border:1.5px dashed #cbd5d0;border-radius:9px;background:#f8faf9;color:#2E7D5B;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">+ Custom amenity</button>
          <div style="display:flex;gap:8px;">
            <button onclick="confirmAmenityPicker()" style="flex:1;padding:11px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Done</button>
            <button onclick="closeAmenityPicker()" style="padding:11px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:none;font-family:inherit;font-size:14px;color:#6b7280;cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById('amenityPickerModal').addEventListener('click', closeAmenityPicker);
    modal = document.getElementById('amenityPickerModal');
  }

  const firstRoom = crm.editRooms[0];
  const isFirstRoomEditor = firstRoom && String(firstRoom.id) === String(roomId);
  if (isFirstRoomEditor) modal.dataset.previewActionScope = 'first-room-editor';
  else delete modal.dataset.previewActionScope;

  // Render preset pills
  const grid = document.getElementById('amenityPickerGrid');
  grid.innerHTML = AMENITY_PRESETS.map(p => {
    const isSelected = current.some(c => c.includes(p.key));
    return `<button onclick="toggleAmenityPreset(this,'${p.key}')" data-key="${p.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${isSelected ? '#2E7D5B' : '#e5e7eb'};background:${isSelected ? '#E8F5EE' : 'white'};color:${isSelected ? '#2E7D5B' : '#1a1a2e'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${p.icon}" style="width:14px;height:14px;"></i> ${p.label}</button>`;
  }).join('');

  renderAmenityCustomPills();
  modal.style.display = 'flex';
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleAmenityPreset(btn, key) {
  const isActive = btn.style.borderColor === 'rgb(46, 125, 91)';
  btn.style.borderColor = isActive ? '#e5e7eb' : '#2E7D5B';
  btn.style.background = isActive ? 'white' : '#E8F5EE';
  btn.style.color = isActive ? '#1a1a2e' : '#2E7D5B';
}

function closeAmenityPicker() {
  closeCustomAmenityModal();
  document.getElementById('amenityPickerModal').style.display = 'none';
  amenityPickerRoomId = null;
  amenityPickerCustomValues = [];
}

function positionCustomAmenityModal() {
  const modal = document.getElementById('amenityCustomModal');
  if (!modal || modal.style.display === 'none') return;
  const viewport = window.visualViewport;
  modal.style.top = `${Math.round(viewport?.offsetTop || 0)}px`;
  modal.style.height = `${Math.round(viewport?.height || window.innerHeight)}px`;
}

function ensureCustomAmenityModal() {
  let modal = document.getElementById('amenityCustomModal');
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="amenityCustomModal" data-marketel-keyboard-surface style="display:none;position:fixed;left:0;right:0;top:0;height:100vh;background:transparent;z-index:10020;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
      <div style="width:100%;max-width:340px;padding:20px;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.22);" onclick="event.stopPropagation()">
        <div style="font-size:16px;font-weight:750;color:#1a1a2e;margin-bottom:12px;">Custom amenity</div>
        <input type="text" id="amenityCustomInput" maxlength="60" enterkeyhint="done" autocomplete="off" placeholder="e.g. EV charger" style="width:100%;box-sizing:border-box;padding:12px;border:1.5px solid #d9dfdc;border-radius:10px;font-family:inherit;font-size:16px;outline:none;" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmCustomAmenity();}">
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button type="button" onclick="closeCustomAmenityModal()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;color:#6b7280;font-family:inherit;font-size:14px;font-weight:700;">Cancel</button>
          <button type="button" onclick="confirmCustomAmenity()" style="flex:1;padding:11px;border-radius:10px;border:0;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;">Add</button>
        </div>
      </div>
    </div>`);
  modal = document.getElementById('amenityCustomModal');
  modal.addEventListener('click', closeCustomAmenityModal);
  if (window.visualViewport && modal.dataset.viewportBound !== '1') {
    modal.dataset.viewportBound = '1';
    window.visualViewport.addEventListener('resize', positionCustomAmenityModal);
    window.visualViewport.addEventListener('scroll', positionCustomAmenityModal);
  }
  return modal;
}

function openCustomAmenityModal() {
  const modal = ensureCustomAmenityModal();
  const input = document.getElementById('amenityCustomInput');
  if (input) input.value = '';
  modal.style.display = 'flex';
  positionCustomAmenityModal();
  requestAnimationFrame(() => input?.focus({ preventScroll: true }));
}

function closeCustomAmenityModal() {
  const modal = document.getElementById('amenityCustomModal');
  if (!modal) return;
  document.getElementById('amenityCustomInput')?.blur();
  modal.style.display = 'none';
}

function confirmCustomAmenity() {
  const input = document.getElementById('amenityCustomInput');
  const custom = String(input?.value || '').replace(/\s+/g, ' ').trim();
  if (!custom) return;
  if (!amenityPickerCustomValues.some((value) => value.toLowerCase() === custom.toLowerCase())) {
    amenityPickerCustomValues.push(custom);
  }
  closeCustomAmenityModal();
  renderAmenityCustomPills();
}

function removeCustomAmenity(index) {
  amenityPickerCustomValues.splice(Number(index), 1);
  renderAmenityCustomPills();
}

function confirmAmenityPicker() {
  const room = crm.editRooms.find(r => r.id === amenityPickerRoomId);
  if (!room) { closeAmenityPicker(); return; }

  const grid = document.getElementById('amenityPickerGrid');
  const selected = [];
  grid.querySelectorAll('button').forEach(btn => {
    if (btn.style.background === 'rgb(232, 245, 238)') {
      const preset = AMENITY_PRESETS.find(p => p.key === btn.dataset.key);
      if (preset) selected.push(preset.label);
    }
  });

  selected.push(...amenityPickerCustomValues);

  room.amenities = selected.join(' • ');
  closeAmenityPicker();
  renderEditRooms();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addAmenityPrompt(roomId) { openAmenityPicker(roomId); }

function removeAmenity(roomId, amenity) {
  const room = crm.editRooms.find(r => r.id === roomId);
  if (!room) return;
  const current = (room.amenities || '').split('•').map(a => a.trim()).filter(Boolean);
  room.amenities = current.filter(a => a !== amenity).join(' • ');
  renderEditRooms();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function saveHotelInfo(source = 'header') {
  const name = document.getElementById('edit-hotel-name')?.value.trim();
  const subtitle = document.getElementById('edit-hotel-subtitle')?.value.trim();
  const address = document.getElementById('edit-hotel-address')?.value.trim();
  const phone = document.getElementById('edit-hotel-phone')?.value.trim();
  const cancellationPolicy = document.getElementById('edit-hotel-policy')?.value.trim();
  const nextHeader = { name, subtitle, address, phone };
  const changedFields = Object.keys(nextHeader).filter((field) => (
    normalizedPreviewValue(nextHeader[field]) !== normalizedPreviewValue(embeddedHeaderSnapshot?.[field])
  ));
  const policyChanged = normalizedPreviewValue(cancellationPolicy)
    !== normalizedPreviewValue(embeddedHeaderSnapshot?.cancellationPolicy);
  try {
    await api('POST', '/api/crm/hotel-info', { name, subtitle, address, phone, cancellationPolicy });
    if (name) crm.activeHotelName = name;
    toast(source === 'policy' ? 'Checkout banner saved!' : 'Property info saved!', 'success');
    embeddedHeaderSnapshot = {
      ...Object.fromEntries(
        Object.entries(nextHeader).map(([field, value]) => [field, normalizedPreviewValue(value)])
      ),
      cancellationPolicy: normalizedPreviewValue(cancellationPolicy),
    };
    notifyEmbeddedEditorSaved(source === 'policy' ? 'checkout-policy' : 'header', {
      hotelName: name || '',
      changedFields: source === 'policy'
        ? (policyChanged ? ['cancellationPolicy'] : ['checkout-policy'])
        : (changedFields.length ? changedFields : ['header']),
    });
    if (source === 'header') {
      const exactHeaderTargets = new Set(['name', 'subtitle', 'address', 'phone']);
      const highlight = changedFields.length === 1 && exactHeaderTargets.has(changedFields[0])
        ? `header-${changedFields[0]}`
        : 'header';
      previewSavedVisual(highlight);
    } else if (source === 'policy') {
      previewSavedVisual('checkout-policy');
    }
  } catch (e) {
    toast('Failed to save', 'error');
  }
}

async function saveRates() {
  const nightly = parseFloat(document.getElementById('edit-rate-nightly')?.value) || 69;
  const weekly = parseFloat(document.getElementById('edit-rate-weekly')?.value) || 299;
  const monthly = parseFloat(document.getElementById('edit-rate-monthly')?.value) || 999;
  try {
    await api('POST', '/api/crm/rates', { nightly, weekly, monthly });
    localStorage.setItem('ratesChanged', '1');
    crm.launchStatus = null; // re-derive launch checklist from fresh server truth
    advanceTourIfNeeded();
    toast('Rates saved!', 'success');
    previewSavedVisual('room', crm.editRooms[0]?.id || '');
  } catch (e) {
    toast('Failed to save rates', 'error');
  }
}

async function changePin() {
  const newPin = document.getElementById('edit-new-pin')?.value.trim();
  if (!newPin || newPin.length < 6) {
    toast('PIN must be at least 6 characters', 'error');
    return;
  }
  try {
    const result = await api('POST', '/api/crm/change-pin', { newPin });
    if (!result.success) throw new Error(result.message || 'Failed to change PIN');
    crm.token = newPin;
    crm.isMasterPin = false;
    crm.isDogfoodPreview = false;
    try { localStorage.setItem('crmToken', crm.token); } catch(e) {}
    toast('PIN updated!', 'success');
    // Keep the new PIN visible in the input
  } catch (e) {
    toast(e.message || 'Failed to change PIN', 'error');
  }
}

function copyBookingLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    toast('Booking link copied!', 'success');
  }).catch(() => {
    toast('Failed to copy', 'error');
  });
}


// Your Page used three disclosure patterns at once — a tab switcher for rates
// and PIN, a real accordion for Subscription, and everything else permanently
// open — so no section behaved the way the last one did. This is the single
// pattern they all now use.
//
// Open by default when the section is unfinished and closed when it is done:
// a new property gets the guided full-length page, an established one gets a
// short list of labelled sections and opens the one it came for.
function pageSectionHtml(title, bodyHtml, { open = false, hint = '', id = '' } = {}) {
  return `<div class="booking-card page-section" style="margin-bottom:14px;"${id ? ` id="${id}"` : ''}>
    <div class="page-section-head" onclick="toggleSection(this)">
      <div>
        <div class="page-section-title">${title}</div>
        ${hint ? `<div class="page-section-hint">${hint}</div>` : ''}
      </div>
      <span class="accordion-arrow" style="${open ? 'transform:rotate(90deg);' : ''}">›</span>
    </div>
    <div class="accordion-body" style="display:${open ? 'block' : 'none'};padding:0 18px 18px;">${bodyHtml}</div>
  </div>`;
}

// These are utility sections, not a reveal. Switching them immediately avoids
// the measured-height transition's visible two-step close when controls such as
// time inputs or validation copy change the section height during the motion.
function toggleSection(header) {
  const body = header.nextElementSibling;
  if (!body) return;
  const arrow = header.querySelector('.accordion-arrow');
  const opening = body.style.display === 'none' || !body.style.display;
  if (body._sectionTimer) {
    clearTimeout(body._sectionTimer);
    body._sectionTimer = null;
  }
  body.classList.remove('is-animating', 'is-opening', 'is-collapsed');
  body.style.removeProperty('height');
  body.style.removeProperty('transition');
  body.style.removeProperty('will-change');
  body.style.display = opening ? 'block' : 'none';
  if (arrow) arrow.style.transform = opening ? 'rotate(90deg)' : 'rotate(0deg)';
}

let goLiveInFlight = false;
function showGoLiveOverlay() {
  if (document.getElementById('goLiveOverlay')) return;
  const ov = document.createElement('div');
  ov.id = 'goLiveOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(255,255,255,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
  ov.innerHTML = '<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>';
  document.body.appendChild(ov);
}
function hideGoLiveOverlay() {
  const ov = document.getElementById('goLiveOverlay');
  if (ov) ov.remove();
}
function showGoLiveError(onRetry) {
  let ov = document.getElementById('goLiveOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'goLiveOverlay';
    document.body.appendChild(ov);
  }
  ov.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(15,23,20,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  ov.innerHTML = `<div role="alertdialog" aria-modal="true" aria-labelledby="goLiveErrorTitle" style="width:min(100%,420px);background:#fff;border:1px solid #d8e4dc;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(15,23,20,.28);text-align:center;box-sizing:border-box;">
    <div aria-hidden="true" style="width:44px;height:44px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#fff7ed;color:#9a3412;font-size:22px;font-weight:800;">!</div>
    <div id="goLiveErrorTitle" style="font-size:20px;font-weight:800;color:#1a2b22;line-height:1.2;">Checkout couldn't open</div>
    <div style="font-size:14px;line-height:1.55;color:#5f7066;margin:9px auto 18px;max-width:330px;">Your setup is saved. Try again, or contact us if secure checkout still won't open.</div>
    <button type="button" id="goLiveRetry" style="width:100%;min-height:48px;border:0;border-radius:14px;background:#2e7d5b;color:#fff;font:700 15px inherit;cursor:pointer;">Try secure checkout again</button>
    <button type="button" id="goLiveDismiss" style="width:100%;min-height:44px;margin-top:5px;border:0;background:transparent;color:#607168;font:700 13px inherit;cursor:pointer;">Back to activation</button>
    <a href="mailto:support@bookmarketel.com?subject=Marketel%20checkout%20help" style="display:inline-block;margin-top:8px;color:#2e7d5b;font-size:12px;font-weight:700;text-decoration:none;">Contact support</a>
  </div>`;
  ov.querySelector('#goLiveDismiss')?.addEventListener('click', hideGoLiveOverlay);
  ov.querySelector('#goLiveRetry')?.addEventListener('click', () => {
    hideGoLiveOverlay();
    onRetry?.();
  });
}
async function goLive(options = {}) {
  if (isNativeApp()) {
    toast('Front Desk app access is managed with your Marketel account.', 'info');
    return;
  }
  if (goLiveInFlight) return;
  const billingInterval = options?.billingInterval === 'year' ? 'year' : 'month';
  const checkoutPrice = billingInterval === 'year' ? 1990 : 199;
  goLiveInFlight = true;
  showGoLiveOverlay();
  const journey = window.MarketelJourney;
  journey?.track('JourneyCheckoutRequested', {
    source: document.getElementById('marketelValueReveal') ? 'value-reveal' : 'frontdesk',
    price: checkoutPrice,
    currency: 'USD',
    billingInterval,
  }, { immediate: true });
  const journeyContext = journey?.getContext?.() || {};
  const journeyLinkage = journey?.linkage?.() || {};
  try {
    const res = await api('POST', '/api/crm/go-live', {
      ...journeyLinkage,
      journeyVisitorId: journeyLinkage.journeyVisitorId || journeyContext.visitorId || '',
      journeySessionId: journeyLinkage.journeySessionId || journeyContext.sessionId || '',
      journeySequence: journeyLinkage.journeySequence || journeyContext.sequence || null,
      billingInterval,
    });
    if (res.success && res.url) {
      journey?.track('JourneyCheckoutRedirected', {
        provider: 'stripe',
        price: checkoutPrice,
        currency: 'USD',
        billingInterval,
      }, { immediate: true, keepalive: true });
      window.location.href = res.url; // leave overlay up through the redirect
      return;
    }
    journey?.track('JourneyCheckoutFailed', {
      stage: 'create-checkout-session',
      reason: 'server-rejected',
      serverMessage: String(res?.message || '').slice(0, 160),
    }, { immediate: true });
    goLiveInFlight = false;
    console.warn('Marketel checkout was rejected:', res?.message || 'Unknown server response');
    showGoLiveError(() => goLive(options));
  } catch (e) {
    journey?.track('JourneyCheckoutFailed', {
      stage: 'create-checkout-session',
      reason: 'network-or-server-error',
      errorName: String(e?.name || '').slice(0, 80),
    }, { immediate: true });
    goLiveInFlight = false;
    console.warn('Marketel checkout could not start:', e);
    showGoLiveError(() => goLive(options));
  }
}

async function openBillingPortal() {
  if (isNativeApp()) {
    toast('Email support@bookmarketel.com for billing help.', 'info');
    return;
  }
  try {
    const res = await api('GET', '/api/crm/billing-portal');
    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      toast(res.message || 'Contact support@bookmarketel.com to manage your subscription.', 'error');
    }
  } catch (e) {
    toast('Contact support@bookmarketel.com to manage your subscription.', 'error');
  }
}

async function requestAccountDeletion() {
  if (!confirm('Delete this Marketel account and all property data? The subscription will be canceled when deletion completes.')) return;
  const confirmation = prompt('Type DELETE to schedule permanent deletion after a seven-day recovery window.');
  if (String(confirmation || '').trim().toUpperCase() !== 'DELETE') return;
  try {
    const result = await api('POST', '/api/crm/account-deletion/request', { confirmation: 'DELETE' });
    if (!result?.success) throw new Error(result?.message || 'Could not schedule deletion.');
    toast('Account deletion scheduled. You can cancel during the next seven days.', 'success');
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    toast(error.message || 'Could not schedule account deletion.', 'error');
  }
}

async function cancelAccountDeletion() {
  try {
    const result = await api('POST', '/api/crm/account-deletion/cancel');
    if (!result?.success) throw new Error(result?.message || 'Could not cancel deletion.');
    toast('Account deletion cancelled.', 'success');
    setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    toast(error.message || 'Could not cancel account deletion.', 'error');
  }
}

async function sendSupportMessage() {
  window.openMarketelSupport?.();
}

async function saveEditRoom(roomId) {
  const room = crm.editRooms.find(r => r.id === roomId);
  if (!room) { toast('Room not found — try refreshing', 'error'); return; }
  const name = document.getElementById('edit-name-' + roomId)?.value.trim();
  const description = document.getElementById('edit-desc-' + roomId)?.value.trim();
  const maxOccupancy = parseInt(document.getElementById('edit-occ-' + roomId)?.value) || 4;
  const totalUnits = parseInt(document.getElementById('edit-units-' + roomId)?.value) || 1;
  const body = { id: roomId, name: name || room.name, description: description || '', amenities: room.amenities || '', maxOccupancy, totalUnits };
  const changedFields = ['name', 'description', 'amenities', 'maxOccupancy', 'totalUnits'].filter((field) => (
    normalizedPreviewValue(body[field]) !== normalizedPreviewValue(room[field])
  ));
  try {
    const res = await api('POST', '/api/crm/rooms', body);
    if (res && res.success === false) { toast(res.message || 'Failed to save', 'error'); return; }
    room.name = body.name;
    room.description = body.description;
    room.maxOccupancy = maxOccupancy;
    room.totalUnits = totalUnits;
    toast('Room saved!', 'success');
    notifyEmbeddedEditorSaved('room', {
      roomId,
      roomName: body.name,
      changedFields: changedFields.length ? changedFields : ['room'],
    });
    previewSavedVisual('room', roomId);
  } catch (e) {
    toast('Failed to save: ' + (e.message || ''), 'error');
  }
}

async function uploadEditImages(event, roomId) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  // Show loading on the room card
  const card = document.getElementById('edit-card-' + roomId);
  const imgContainer = card?.querySelector('div:first-child');
  if (imgContainer) {
    imgContainer.style.position = 'relative';
    imgContainer.insertAdjacentHTML('beforeend', '<div id="upload-spinner-' + roomId + '" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-' + roomId + '" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / ' + files.length + '</div></div>');
  }
  let uploaded = 0;
  let lastError = '';
  for (const file of files) {
    try {
      const data = await postRoomImageUpload(roomId, file);
      if (data.image) {
        const room = crm.editRooms.find(r => r.id === roomId);
        if (room) {
          if (!room.images) room.images = [];
          room.images.push(data.image);
          if (!room.imageUrl) room.imageUrl = data.image.url;
        }
        uploaded++;
      }
    } catch (e) {
      lastError = e.message || 'Upload failed';
    }
    const prog = document.getElementById('upload-progress-' + roomId);
    if (prog) prog.textContent = uploaded + ' / ' + files.length;
  }
  const spinner = document.getElementById('upload-spinner-' + roomId);
  if (spinner) spinner.remove();
  renderEditRoomsCards();
  if (uploaded > 0) crm.launchStatus = null; // re-derive launch checklist from fresh server truth
  advanceTourIfNeeded();
  if (uploaded > 0) {
    notifyEmbeddedEditorSaved('room-photos', { roomId, changedFields: ['photos'] });
    toast(uploaded + ' photo' + (uploaded !== 1 ? 's' : '') + ' added. Check the Bookings tab to continue your launch checklist!', 'success');
    previewSavedVisual('room-photo', roomId);
  } else {
    toast(lastError || 'Upload failed', 'error');
  }
}

// Center-crop any uploaded image to a perfect square PNG before sending it up.
// Home-screen icons are ALWAYS square tiles — if the source is a portrait/landscape
// photo the OS stretches it (the "vertically squished" look). Cropping to square
// here means the file itself is square, so it renders correctly everywhere.
function squareCropImage(file, size = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('crop failed')), 'image/png', 0.92);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
    img.src = url;
  });
}

function setAppIconPreviewLoading() {
  const el = document.getElementById('appsAppIconPreview');
  if (!el) return;
  el.innerHTML = '<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>';
}

function setAppIconPreviewImage(url) {
  const el = document.getElementById('appsAppIconPreview');
  if (!el) return;
  el.style.background = '#fff';
  el.style.border = '1px solid var(--border)';
  el.style.padding = '0';
  el.innerHTML = '<img src="' + url + '" alt="App icon" style="width:100%;height:100%;object-fit:contain;">';
}

function restoreAppIconPreview() {
  const el = document.getElementById('appsAppIconPreview');
  if (!el) return;
  if (crm.activeHotelAppIcon) {
    setAppIconPreviewImage(crm.activeHotelAppIcon);
    return;
  }
  // Letter icon: full-bleed green edge-to-edge, no white inner frame.
  const initial = (crm.activeHotelName || 'P').trim().charAt(0).toUpperCase() || 'P';
  el.style.background = 'transparent';
  el.style.border = 'none';
  el.style.padding = '0';
  el.innerHTML = '<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">' + initial + '</span>';
}

async function uploadAppIcon(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  setAppIconPreviewLoading();
  const uploadForm = new FormData();
  try {
    const squared = await squareCropImage(file, 512);
    uploadForm.append('icon', squared, 'app-icon.png');
  } catch (_) {
    uploadForm.append('icon', file); // fall back to raw upload if canvas fails
  }
  try {
    const authToken = getCrmAuthToken();
    const qs = new URLSearchParams();
    if (crm.activeHotelId) qs.set('hotelId', crm.activeHotelId);
    const res = await fetch(`/api/crm/hotel-app-icon?${qs}`, {
      method: 'POST',
      headers: {
        'x-crm-token': authToken,
        ...(isNativeApp() ? { 'x-marketel-client': 'ios' } : {}),
      },
      body: uploadForm,
    });
    const data = await res.json();
    if (data.success && data.appIconUrl) {
      crm.activeHotelAppIcon = data.appIconUrl;
      setAppIconPreviewImage(data.appIconUrl);
      const appsEl = document.getElementById('appsView');
      if (appsEl) {
        appsEl.dataset.appsKey = (crm.activeHotelId || '') + '|' + data.appIconUrl + '|' + (crm.activeHotelDomain || '');
      }
      if (typeof updateFrontdeskManifestLink === 'function') updateFrontdeskManifestLink();
      toast('Guestel icon updated.', 'success');
    } else {
      toast(data.message || 'Failed to upload icon', 'error');
      restoreAppIconPreview();
    }
  } catch (e) {
    toast('Failed to upload icon', 'error');
    restoreAppIconPreview();
  }
  input.value = '';
}

// The thumbnail used to vanish on the next full re-render, so a delete read as
// the strip flickering rather than that photo leaving. It now collapses in
// place first, and the request runs behind the animation instead of before it.
async function deleteEditImage(roomId, imageId) {
  if (!confirm('Delete this photo?')) return;
  const thumb = document.querySelector(`[data-thumb-id="${CSS.escape(String(imageId))}"]`);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (thumb && !reduced) {
    thumb.classList.add('marketel-removing');
    // Width and margin collapse after the scale, so neighbours slide into the
    // gap rather than jumping the moment it is gone.
    setTimeout(() => {
      thumb.style.transition = 'width 140ms var(--ease-in-out), margin 140ms var(--ease-in-out)';
      thumb.style.width = '0px';
      thumb.style.margin = '0';
    }, 120);
  }
  try {
    await api('DELETE', `/api/crm/rooms/${roomId}/images/${imageId}`);
    // Remove from local state
    const room = crm.editRooms.find(r => r.id === roomId);
    if (room && room.images) {
      room.images = room.images.filter(i => i.id !== imageId);
      room.imageUrl = room.images[0]?.url || null;
    }
    renderEditRoomsCards();
    toast('Photo deleted', 'success');
    notifyEmbeddedEditorSaved('room-photo-deleted', { roomId, changedFields: ['photos'] });
    previewSavedVisual('room-photo', roomId);
  } catch (e) {
    // Put it back: the animation promised a deletion that did not happen.
    if (thumb) {
      thumb.classList.remove('marketel-removing');
      thumb.style.transition = '';
      thumb.style.width = '';
      thumb.style.margin = '';
    }
    toast('Failed to delete', 'error');
  }
}

async function deleteEditRoom(roomId) {
  if (!confirm('Delete this room from your booking page and Availability? Saved date changes will also be removed.')) return;
  const room = crm.editRooms.find(item => item.id === roomId);
  try {
    await api('DELETE', `/api/crm/rooms/${roomId}`);
    crm.editRooms = crm.editRooms.filter(item => item.id !== roomId);
    if (room) {
      const availability = crm.manualAvailability || { rooms: [], overrides: {} };
      availability.rooms = (availability.rooms || []).filter(item => item.name !== room.name);
      availability.overrides = Object.fromEntries(
        Object.entries(availability.overrides || {}).filter(([key]) => !key.startsWith(`${room.name}|`))
      );
      crm.manualAvailability = availability;
      if (crm.manualSelectedRoom === room.name) {
        crm.manualSelectedRoom = availability.rooms[0]?.name || '';
      }
    }
    renderEditRoomsCards();
    window.refreshRoomBadge?.();
    window.renderAvailabilityView?.();
    toast('Room deleted', 'success');
    refreshEditRoomsData({ render: true }).catch(() => {});
    const availabilityRefresh = window.loadManualAvailability?.({ silent: true });
    availabilityRefresh?.catch(() => {});
  } catch (e) {
    toast(e.message || 'Failed to delete', 'error');
  }
}

function openEditAddRoom() {
  if (document.getElementById('editAddRoomModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="editAddRoomModal" class="edit-add-room-modal" role="dialog" aria-modal="true" aria-labelledby="editAddRoomTitle" onclick="if(event.target===this) closeEditAddRoom()">
      <div class="edit-add-room-card">
        <h3 id="editAddRoomTitle">Add a room to your booking page</h3>
        <p>You can add photos, pricing and details as soon as the room is created.</p>
        <input type="text" id="editNewRoomName" placeholder="Room name, like King Suite" autocomplete="off" onkeydown="if(event.key==='Enter') confirmEditAddRoom(); if(event.key==='Escape') closeEditAddRoom();">
        <div class="edit-add-room-actions">
          <button type="button" onclick="closeEditAddRoom()">Cancel</button>
          <button type="button" class="primary" onclick="confirmEditAddRoom()">Add room</button>
        </div>
      </div>
    </div>
  `);
  window.setNativeModalOpen?.('edit-add-room', true);
  requestAnimationFrame(() => document.getElementById('editNewRoomName')?.focus());
}

function closeEditAddRoom() {
  document.getElementById('editAddRoomModal')?.remove();
  window.setNativeModalOpen?.('edit-add-room', false);
}

async function confirmEditAddRoom() {
  const input = document.getElementById('editNewRoomName');
  const submit = document.querySelector('#editAddRoomModal .edit-add-room-actions .primary');
  const name = input?.value.trim() || '';
  if (!name) return;
  if (input) input.disabled = true;
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Adding…';
  }

  const totalUnits = 5;
  try {
    const result = await api('POST', '/api/crm/rooms', {
      name,
      maxOccupancy: 4,
      totalUnits,
    });
    if (!result?.success || !result.room?.id) {
      throw new Error(result?.message || 'Failed to add room');
    }

    const createdRoom = {
      id: result.room.id,
      name: result.room.name || name,
      description: '',
      amenities: '',
      maxOccupancy: 4,
      totalUnits,
      imageUrl: null,
      images: [],
    };
    const existingIndex = crm.editRooms.findIndex(room => room.id === createdRoom.id);
    if (existingIndex >= 0) {
      crm.editRooms = crm.editRooms.map((room, index) => index === existingIndex ? createdRoom : room);
    } else {
      crm.editRooms = [...crm.editRooms, createdRoom];
    }

    const availability = crm.manualAvailability || { rooms: [], overrides: {} };
    if (!Array.isArray(availability.rooms)) availability.rooms = [];
    if (!availability.overrides || typeof availability.overrides !== 'object') availability.overrides = {};
    if (!availability.rooms.some(room => room.name === createdRoom.name)) {
      availability.rooms = [...availability.rooms, { name: createdRoom.name, totalUnits }]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    crm.manualAvailability = availability;
    if (!crm.manualSelectedRoom) crm.manualSelectedRoom = createdRoom.name;

    closeEditAddRoom();
    renderEditRoomsCards();
    window.refreshRoomBadge?.();
    toast('Room added', 'success');

    // Reconcile the optimistic card with the complete server representation
    // (including any defaults) after it is already visible to the owner.
    refreshEditRoomsData({ render: true }).catch(() => {});
    const availabilityRefresh = window.loadManualAvailability?.({ silent: true });
    availabilityRefresh?.catch(() => {});
  } catch (error) {
    if (input) input.disabled = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Add room';
    }
    toast(error.message || 'Failed to add room', 'error');
  }
}


const _settingsExports = {
  addAmenityPrompt,
  advanceTourIfNeeded,
  changePin,
  checklistGoTo,
  checklistGoToRates,
  cleanupPostActivationTourUi,
  cleanupSettingsTourUi,
  cancelAccountDeletion,
  closeAmenityPicker,
  closeCustomAmenityModal,
  closeEditAddRoom,
  confirmAmenityPicker,
  confirmCustomAmenity,
  confirmEditAddRoom,
  copyBookingLink,
  copyBookingLinkFromChecklist,
  deleteEditImage,
  deleteEditRoom,
  ensureTourBlurOverlay,
  finishPostActivationTour,
  getAmenityIcon,
  getCrmAuthToken,
  getEditRoomImages,
  goLive,
  guestBookingEngineUrl,
  handoffToGuestAppsTour,
  hideGoLiveOverlay,
  loadEditRooms,
  loadSettings,
  openAmenityPicker,
  openCustomAmenityModal,
  openBillingPortal,
  openEditAddRoom,
  openGuestBookingEngine,
  openPreviewSite,
  openTourAccordion,
  postRoomImageUpload,
  queryTourSelector,
  requestAccountDeletion,
  removeAmenity,
  removeCustomAmenity,
  renderEditRooms,
  renderEditRoomsCards,
  refreshEditRoomsData,
  replayWalkthrough,
  resolveLiveTourElement,
  resolveTourHighlightEl,
  restoreAppIconPreview,
  saveEditRoom,
  saveHotelInfo,
  saveRates,
  scrollTourTargetIntoView,
  sendSupportMessage,
  setAppIconPreviewImage,
  setAppIconPreviewLoading,
  settingsChangePin,
  settingsCopyLink,
  settingsSaveRates,
  settingsSendSupport,
  settingsUploadPhoto,
  showActivatedModal,
  showEditRoomPhoto,
  showFinaleMockModal,
  showGoLiveOverlay,
  showOnboardingQuestions,
  showTestDriveModal,
  showWelcomeModal,
  squareCropImage,
  startPostActivationTabTour,
  startSettingsTour,
  stepEditRoomPhoto,
  toggleAmenityPreset,
  toggleSection,
  tourAnchorRect,
  tourElementRect,
  updatePreviewSiteBar,
  uploadAppIcon,
  uploadEditImages,
};

export function install() {
  exposeToWindow(_settingsExports);
}

export default _settingsExports;
