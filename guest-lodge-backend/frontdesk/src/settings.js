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

async function loadSettings() {
  const list = document.getElementById('settingsList');
  if (!list) return;
  list.innerHTML = '<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';
  try {
    const hotelRes = await api('GET', '/api/crm/verify');
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
                📷 ${hasImage ? 'Change Photo' : '+ Add Photo'}
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
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `;

    // Subscription
    if (hotelRes?.subscribed) {
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

    // Support
    html += `
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `;

    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>';
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
  qs.set('token', authToken);
  const res = await fetch(`/api/crm/rooms/${roomId}/images?${qs}`, {
    method: 'POST',
    headers: { 'x-crm-token': authToken },
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
  if (!newPin || newPin.length < 4) { toast('PIN must be at least 4 characters', 'error'); return; }
  try {
    const result = await api('POST', '/api/crm/change-pin', { newPin });
    if (!result.success) throw new Error(result.message || 'Failed to change PIN');
    crm.token = newPin;
    crm.isMasterPin = false;
    try { localStorage.setItem('crmToken', crm.token); } catch(e) {}
    toast('PIN updated!', 'success');
    document.getElementById('settings-new-pin').value = '';
  } catch (e) { toast(e.message || 'Failed to change PIN', 'error'); }
}

async function settingsSendSupport() {
  const msg = document.getElementById('settings-support-msg')?.value.trim();
  if (!msg) { toast('Please enter a message', 'error'); return; }
  try {
    await api('POST', '/api/crm/support', { message: msg });
    toast('Message sent!', 'success');
    document.getElementById('settings-support-msg').value = '';
  } catch (e) { toast('Failed to send', 'error'); }
}

function openPreviewSite() {
  const domain = crm.activeHotelDomain || (crm.activeHotelId + '.mktel.co');
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const url = isLocal ? 'http://localhost:5173/?hotelId=' + encodeURIComponent(crm.activeHotelId) + '&preview=1' : 'https://' + domain + '?preview=1';
  window.open(url, '_blank');
}

function guestBookingEngineUrl() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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
  window.open(url, '_blank');
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
        <div style="font-size:32px;margin-bottom:12px;">🏡</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
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
      text: '<strong>Bookings</strong> — live reservations land here. Once phone setup is complete, new bookings can alert you even when Front Desk is closed.',
    },
    {
      tab: 'apps',
      navFilter: 'apps',
      text: '<strong>Last step: set up your phone.</strong> No App Store needed. Follow the 3 steps here, then turn on booking alerts so confirmed reservations and guest messages can reach you.',
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
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${isLast ? 'Set up this phone' : 'Next tab →'}</button>
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
  const unlockedTabs = 'Bookings and Guest App';
  const overlay = document.createElement('div');
  overlay.id = 'activatedModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2E7D5B 0%,#1a5c3f 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">🎉</div>
      <h2 style="font-size:21px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">You're live — payment received</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 18px;">Thank you! Your subscription is active and your booking page is now switched on.</p>
      <div style="text-align:left;background:#f0f7f3;border:1px solid #d6e9df;border-radius:14px;padding:16px 18px;margin-bottom:18px;">
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>Guests can now book.</strong> The paywall is gone — reservations go through on your page immediately.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>Next, set up your phone</strong> — no App Store needed. Then booking alerts can reach you when Front Desk is closed.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>${unlockedTabs}</strong> are now part of your daily workflow.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>A receipt is on its way</strong> to your email from Stripe.</span>
        </div>
      </div>
      ${bookingDomain ? `<p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Your booking page: <strong style="color:#2E7D5B;">${bookingDomain}</strong></p>` : ''}
      <button id="activatedModalTour" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Quick tour →</button>
      <button id="activatedModalSkip" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid #d6e9df;background:#fff;color:#6b7280;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Skip — go to Bookings</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('activatedModalTour').onclick = () => {
    overlay.remove();
    startPostActivationTabTour();
  };
  document.getElementById('activatedModalSkip').onclick = () => {
    overlay.remove();
    localStorage.setItem('postActivationTourDone', '1');
    try { setFilter('bookings'); } catch (e) { /* ignore */ }
  };
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
    const [res, hotelRes] = await Promise.all([
      api('GET', '/api/crm/rooms'),
      api('GET', '/api/crm/verify'),
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
    const hotelAppIcon = hotelRes?.appIconUrl || '';
    // Sync the home-screen icon/title with the freshest values from verify.
    crm.activeHotelAppIcon = hotelAppIcon;
    updateFrontdeskManifestLink();

    // Fetch rates
    let rates = { nightly: 69, weekly: 299, monthly: 999, taxRate: 0.10 };
    if (res.rates) rates = res.rates;

    // Render hotel info section + rates + PIN + rooms
    const bookingDomain = hotelRes?.domain || (crm.activeHotelId + '.mktel.co');
    const bookingUrl = 'https://' + bookingDomain;
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(bookingUrl);
    let html = `
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${hotelAddress}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${hotelName}" id="edit-hotel-name" placeholder="Your Property Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${hotelSubtitle}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${hotelPhone}" id="edit-hotel-phone" placeholder="(555) 123-4567" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
        </div>
      </div>
      </div>
      <div class="dash-b">
      ${goLiveInlineCardHtml()}
      ${(typeof twoRoomExplainerHtml === 'function' ? twoRoomExplainerHtml : window.twoRoomExplainerHtml)('booking-page')}
      <div id="editRoomsCards"></div>
      <button style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:8px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add booking page room</button>
      </div>
      <div class="dash-c">
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Checkout Page Preview</div>
          <div style="background:#f4f7f9;border-radius:12px;overflow:hidden;border:1px solid var(--border);">
            <!-- Back button pill (matches .back-button-pill) -->
            <div style="padding:12px 16px 0;">
              <span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(16,185,129,0.2);">‹ Back to Booking</span>
            </div>
            <!-- Cancellation policy banner (matches .static-banner — white pill with shadow) -->
            <div style="padding:10px 16px;display:flex;justify-content:center;">
              <div style="background:white;border-radius:20px;padding:8px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:2px dashed #10b981;width:fit-content;max-width:100%;position:relative;">
                <div style="position:absolute;top:-8px;right:8px;background:#10b981;color:white;font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">Editable</div>
                <input type="text" value="${(hotelRes?.cancellationPolicy || '').replace(/"/g, '&quot;')}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;font-size:11px;color:#111827;font-weight:500;border:none;background:transparent;outline:none;font-family:inherit;text-align:center;">
              </div>
            </div>
            <!-- Progress bar (matches .checkout-progress-bar with pill step-circles) -->
            <div style="padding:8px 16px 14px;position:relative;">
              <div style="display:flex;justify-content:space-between;align-items:center;position:relative;">
                <!-- Connecting line -->
                <div style="position:absolute;top:11px;left:15%;right:15%;height:2px;background:#ddd;z-index:0;"></div>
                <!-- Step 1: Review Cart (active/completed) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:#28a745;border:2px solid #28a745;"></div>
                  <span style="font-size:10px;color:#000;font-weight:600;">Review Cart</span>
                </div>
                <!-- Step 2: Info (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Info</span>
                </div>
                <!-- Step 3: Payment (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Payment</span>
                </div>
              </div>
            </div>
            <!-- Placeholder content -->
            <div style="padding:0 16px 14px;">
              <div style="background:white;border-radius:8px;padding:10px;border:1px solid var(--border);">
                <div style="height:8px;background:var(--border);border-radius:4px;margin-bottom:6px;width:60%;"></div>
                <div style="height:8px;background:var(--border);border-radius:4px;width:40%;"></div>
              </div>
            </div>
          </div>
          <p style="font-size:10px;color:var(--text-muted);margin-top:6px;text-align:center;">Edit the green banner above — shown to guests during checkout.</p>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;">Save Banner</button>
        </div>
      </div>
      <div class="booking-card" id="tour-booking-link-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">Your Booking Link</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${bookingUrl}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${bookingUrl.replace(/'/g, "\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
          </div>
          <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">
            <i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR
          </button>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Add this to your Google Business, website, or text it to guests.</p>
        </div>
      </div>
      <div class="booking-card" id="tour-rates-card" style="margin-bottom:14px;">
        <div id="tour-rates-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Rates</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${rates.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${rates.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${rates.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
      <div class="booking-card" id="tour-pin-card" style="margin-bottom:14px;">
        <div id="tour-pin-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Change PIN</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <input type="text" id="edit-new-pin" value="${crm.isMasterPin ? '' : crm.token}" placeholder="${crm.isMasterPin ? 'Enter a unique property PIN' : 'Enter new PIN (min 4 chars)'}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${crm.isMasterPin ? 'You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.' : "You'll need to use the new PIN next time you log in."}</p>
        </div>
      </div>
      ${hotelRes?.subscribed ? `<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
        </div>
      </div>` : ''}
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Need Help?</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <textarea id="supportMessage" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;"></textarea>
          </div>
          <button onclick="sendSupportMessage()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email on file.</p>
        </div>
      </div>
      </div>
      </div>
    `;
    list.innerHTML = html;
    renderEditRoomsCards();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>';
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

function renderEditRoomsCards() {
  const cards = document.getElementById('editRoomsCards');
  if (!cards) return;
  if (!crm.editRooms.length) {
    cards.innerHTML = '<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';
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
          <img class="room-edit-main-img" src="${esc(images[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${images.length > 1 ? `
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${roomIdJs}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${roomIdJs}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${images.length}</div>
            <div class="room-edit-image-dots">
              ${images.map((_, idx) => `<button type="button" class="room-edit-image-dot ${idx === 0 ? 'active' : ''}" aria-label="Show photo ${idx + 1}" ${idx === 0 ? 'aria-current="true"' : ''} onclick="event.stopPropagation();showEditRoomPhoto('${roomIdJs}', ${idx})"></button>`).join('')}
            </div>` : ''}
        ` : `<div class="room-edit-photo-placeholder">No photos yet</div>`}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${roomIdJs}')">
        </label>
      </div>
      ${images.length > 1 ? `<div class="room-edit-thumbs">` + images.map((img, idx) => `<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${idx === 0 ? 'active' : ''}" aria-label="Show photo ${idx + 1}" ${idx === 0 ? 'aria-current="true"' : ''} onclick="showEditRoomPhoto('${roomIdJs}', ${idx})"><img src="${esc(img.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${roomIdJs}','${jsStr(img.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join('') + `</div>` : ''}
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
          <button onclick="saveEditRoom('${r.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Changes</button>
          <button onclick="deleteEditRoom('${r.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`;
  }).join('');
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

function openAmenityPicker(roomId) {
  amenityPickerRoomId = roomId;
  const room = crm.editRooms.find(r => r.id === roomId);
  const current = (room?.amenities || '').split('•').map(a => a.trim().toLowerCase()).filter(Boolean);
  
  let modal = document.getElementById('amenityPickerModal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="amenityPickerModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;align-items:center;justify-content:center;padding:20px;">
        <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
          <div style="font-size:16px;font-weight:700;margin-bottom:14px;">Select Amenities</div>
          <div id="amenityPickerGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>
          <div style="margin-bottom:14px;">
            <input type="text" id="amenityCustomInput" placeholder="Or type a custom one..." style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:14px;outline:none;">
          </div>
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

  // Render preset pills
  const grid = document.getElementById('amenityPickerGrid');
  grid.innerHTML = AMENITY_PRESETS.map(p => {
    const isSelected = current.some(c => c.includes(p.key));
    return `<button onclick="toggleAmenityPreset(this,'${p.key}')" data-key="${p.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${isSelected ? '#2E7D5B' : '#e5e7eb'};background:${isSelected ? '#E8F5EE' : 'white'};color:${isSelected ? '#2E7D5B' : '#1a1a2e'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${p.icon}" style="width:14px;height:14px;"></i> ${p.label}</button>`;
  }).join('');
  
  document.getElementById('amenityCustomInput').value = '';
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
  document.getElementById('amenityPickerModal').style.display = 'none';
  amenityPickerRoomId = null;
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

  const custom = document.getElementById('amenityCustomInput').value.trim();
  if (custom) selected.push(custom);

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

async function saveHotelInfo() {
  const name = document.getElementById('edit-hotel-name')?.value.trim();
  const subtitle = document.getElementById('edit-hotel-subtitle')?.value.trim();
  const address = document.getElementById('edit-hotel-address')?.value.trim();
  const phone = document.getElementById('edit-hotel-phone')?.value.trim();
  const cancellationPolicy = document.getElementById('edit-hotel-policy')?.value.trim();
  try {
    await api('POST', '/api/crm/hotel-info', { name, subtitle, address, phone, cancellationPolicy });
    toast('Property info saved!', 'success');
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
  } catch (e) {
    toast('Failed to save rates', 'error');
  }
}

async function changePin() {
  const newPin = document.getElementById('edit-new-pin')?.value.trim();
  if (!newPin || newPin.length < 4) {
    toast('PIN must be at least 4 characters', 'error');
    return;
  }
  try {
    const result = await api('POST', '/api/crm/change-pin', { newPin });
    if (!result.success) throw new Error(result.message || 'Failed to change PIN');
    crm.token = newPin;
    crm.isMasterPin = false;
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

function toggleSection(header) {
  const body = header.nextElementSibling;
  const arrow = header.querySelector('.accordion-arrow');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(90deg)';
  } else {
    body.style.display = 'none';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
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
async function goLive() {
  if (goLiveInFlight) return;
  goLiveInFlight = true;
  showGoLiveOverlay();
  try {
    const res = await api('POST', '/api/crm/go-live');
    if (res.success && res.url) {
      window.location.href = res.url; // leave overlay up through the redirect
      return;
    }
    hideGoLiveOverlay();
    goLiveInFlight = false;
    toast(res.message || 'Failed to start checkout', 'error');
  } catch (e) {
    hideGoLiveOverlay();
    goLiveInFlight = false;
    toast('Failed to start checkout. Try again.', 'error');
  }
}

async function openBillingPortal() {
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

async function sendSupportMessage() {
  const msg = document.getElementById('supportMessage')?.value.trim();
  if (!msg) { toast('Please enter a message', 'error'); return; }
  try {
    await api('POST', '/api/crm/support', { message: msg });
    document.getElementById('supportMessage').value = '';
    toast('Message sent! We\'ll reply to your email.', 'success');
  } catch (e) {
    toast('Failed to send. Email support@bookmarketel.com directly.', 'error');
  }
}

async function saveEditRoom(roomId) {
  const room = crm.editRooms.find(r => r.id === roomId);
  if (!room) { toast('Room not found — try refreshing', 'error'); return; }
  const name = document.getElementById('edit-name-' + roomId)?.value.trim();
  const description = document.getElementById('edit-desc-' + roomId)?.value.trim();
  const maxOccupancy = parseInt(document.getElementById('edit-occ-' + roomId)?.value) || 4;
  const totalUnits = parseInt(document.getElementById('edit-units-' + roomId)?.value) || 1;
  const body = { id: roomId, name: name || room.name, description: description || '', amenities: room.amenities || '', maxOccupancy, totalUnits };
  try {
    const res = await api('POST', '/api/crm/rooms', body);
    if (res && res.success === false) { toast(res.message || 'Failed to save', 'error'); return; }
    room.name = body.name;
    room.description = body.description;
    room.maxOccupancy = maxOccupancy;
    room.totalUnits = totalUnits;
    toast('Room saved!', 'success');
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
    toast(uploaded + ' photo' + (uploaded !== 1 ? 's' : '') + ' added. Check the Bookings tab to continue your launch checklist!', 'success');
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
  const initial = (crm.activeHotelName || 'P').trim().charAt(0).toUpperCase() || '🏡';
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
    if (authToken) qs.set('token', authToken);
    const res = await fetch(`/api/crm/hotel-app-icon?${qs}`, {
      method: 'POST',
      headers: { 'x-crm-token': authToken },
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
      toast('Logo updated! Guests will see it on their phone.', 'success');
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

async function deleteEditImage(roomId, imageId) {
  if (!confirm('Delete this photo?')) return;
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
  } catch (e) {
    toast('Failed to delete', 'error');
  }
}

async function deleteEditRoom(roomId) {
  if (!confirm('Delete this room type?')) return;
  try {
    await api('DELETE', `/api/crm/rooms/${roomId}`);
    toast('Room deleted', 'success');
    loadEditRooms();
  } catch (e) {
    toast('Failed to delete', 'error');
  }
}

function openEditAddRoom() {
  const list = document.getElementById('editRoomsList');
  // Check if add form already exists
  if (document.getElementById('editAddForm')) return;
  list.insertAdjacentHTML('beforeend', `
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `);
  document.getElementById('editNewRoomName').focus();
}

function confirmEditAddRoom() {
  const name = document.getElementById('editNewRoomName').value.trim();
  if (!name) return;
  api('POST', '/api/crm/rooms', { name, maxOccupancy: 4, totalUnits: 5 })
    .then(() => { toast('Room added', 'success'); loadEditRooms(); })
    .catch(() => toast('Failed to add', 'error'));
}


const _settingsExports = {
  addAmenityPrompt,
  advanceTourIfNeeded,
  changePin,
  checklistGoTo,
  checklistGoToRates,
  cleanupPostActivationTourUi,
  cleanupSettingsTourUi,
  closeAmenityPicker,
  confirmAmenityPicker,
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
  openBillingPortal,
  openEditAddRoom,
  openGuestBookingEngine,
  openPreviewSite,
  openTourAccordion,
  postRoomImageUpload,
  queryTourSelector,
  removeAmenity,
  renderEditRooms,
  renderEditRoomsCards,
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
