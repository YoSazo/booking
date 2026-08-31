import { crm } from './state.js';

import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';
import {
  appsTourCleanupUi,
  appsTourClose,
  appsTourNav,
  appsTourRender,
  startAppsTour,
} from './tour-apps.js';

// Guest-facing installation is intentionally absent here. Front Desk exposes
// only Guestel wallet controls and the property's App Clip QR/link.

function appsEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function guestelWalletSubtitleValue() {
  return String(
    crm.guestelWalletSubtitle
      || crm.activeHotelContext?.address
      || 'Direct booking'
  ).trim();
}

function updateGuestelWalletPreview() {
  const subtitleInput = document.getElementById('guestelWalletSubtitleInput');
  const subtitle = String(subtitleInput?.value || guestelWalletSubtitleValue()).trim() || 'Direct booking';
  const previewSubtitle = document.getElementById('guestelWalletPreviewSubtitle');
  if (previewSubtitle) previewSubtitle.textContent = subtitle;
  const count = document.getElementById('guestelWalletSubtitleCount');
  if (count) count.textContent = `${String(subtitleInput?.value || '').length}/64`;
}

async function saveGuestelWalletCard() {
  const input = document.getElementById('guestelWalletSubtitleInput');
  const button = document.getElementById('guestelWalletSubtitleSave');
  const subtitle = String(input?.value || '').replace(/\s+/g, ' ').trim().slice(0, 64);
  if (button) button.disabled = true;
  try {
    const data = await api('POST', '/api/crm/guestel-wallet-card', { subtitle });
    if (!data?.success) throw new Error(data?.message || 'Could not save the Guestel card.');
    crm.guestelWalletSubtitle = String(data.subtitle || '').trim();
    if (input) input.value = crm.guestelWalletSubtitle || String(data.fallbackSubtitle || '').trim();
    updateGuestelWalletPreview();
    toast('Guestel card updated.', 'success');
  } catch (error) {
    toast(error?.message || 'Could not save the Guestel card.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

// Returning-guest offer lives here (guest-facing), edited from the Guestel tab.
function updateReturnOfferPreview() {
  const enabled = document.getElementById('edit-offer-enabled')?.checked;
  const kind = document.getElementById('edit-offer-kind')?.value === 'amount' ? 'amount' : 'percent';
  const value = Number(document.getElementById('edit-offer-value')?.value) || 0;
  const el = document.getElementById('offerPreview');
  if (!el) return;
  if (!enabled || value <= 0) {
    el.textContent = 'Guests see their normal rate.';
    el.style.opacity = '0.6';
    return;
  }
  el.style.opacity = '1';
  el.textContent = kind === 'amount'
    ? `Returning guests see $${value} off per night.`
    : `Returning guests see ${value}% off the direct rate.`;
}

async function saveReturnOffer() {
  const returnOfferEnabled = !!document.getElementById('edit-offer-enabled')?.checked;
  const returnOfferKind = document.getElementById('edit-offer-kind')?.value === 'amount' ? 'amount' : 'percent';
  const returnOfferValue = Number(document.getElementById('edit-offer-value')?.value) || 0;
  try {
    await api('POST', '/api/crm/hotel-info', { returnOfferEnabled, returnOfferKind, returnOfferValue });
    // Keep crm in sync so the value survives tab switches / the apps re-render.
    crm.returnOfferEnabled = returnOfferEnabled;
    crm.returnOfferKind = returnOfferKind;
    crm.returnOfferValue = returnOfferValue;
    toast(returnOfferEnabled ? 'Returning-guest offer saved!' : 'Offer turned off', 'success');
  } catch (e) {
    toast('Could not save offer', 'error');
  }
}

function guestelWalletDisplayImageUrl() {
  const roomFallback = (crm.editRooms || [])
    .flatMap((room) => Array.isArray(room?.images) ? room.images : [])
    .map((image) => String(image?.url || '').trim())
    .find(Boolean) || '';
  return String(
    crm.guestelWalletImageUrl
      || crm.guestelWalletFallbackImageUrl
      || roomFallback
      || ''
  ).trim();
}

function setGuestelWalletImagePreview(url) {
  const preview = document.getElementById('guestelWalletPreviewImage');
  if (!preview) return;
  const clean = String(url || guestelWalletDisplayImageUrl()).trim();
  preview.classList.toggle('has-image', !!clean);
  preview.innerHTML = clean
    ? `<img src="${appsEscape(clean)}" alt="Guestel wallet cover">`
    : '<span>Add a room photo</span>';
  const remove = document.getElementById('guestelWalletImageRemove');
  if (remove) remove.hidden = !String(crm.guestelWalletImageUrl || '').trim();
}

async function uploadGuestelWalletImage(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const uploadButton = document.getElementById('guestelWalletImageButton');
  const previous = crm.guestelWalletImageUrl;
  if (uploadButton) {
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading…';
  }
  const form = new FormData();
  form.append('image', file);
  try {
    const query = new URLSearchParams();
    if (crm.activeHotelId) query.set('hotelId', crm.activeHotelId);
    const response = await fetch(`/api/crm/guestel-wallet-image?${query}`, {
      method: 'POST',
      headers: {
        'x-crm-token': crm.token,
        ...(isNativeFrontdeskApp() ? { 'x-marketel-client': 'ios' } : {}),
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data?.success || !data.imageUrl) {
      throw new Error(data?.message || 'Could not update the Guestel cover.');
    }
    crm.guestelWalletImageUrl = data.imageUrl;
    setGuestelWalletImagePreview(data.imageUrl);
    toast('Guestel cover updated.', 'success');
  } catch (error) {
    setGuestelWalletImagePreview(previous);
    toast(error?.message || 'Could not update the Guestel cover.', 'error');
  } finally {
    input.value = '';
    if (uploadButton) {
      uploadButton.disabled = false;
      uploadButton.textContent = crm.guestelWalletImageUrl ? 'Change cover' : 'Choose custom cover';
    }
  }
}

async function resetGuestelWalletImage() {
  const button = document.getElementById('guestelWalletImageRemove');
  if (button) button.disabled = true;
  try {
    const data = await api('DELETE', '/api/crm/guestel-wallet-image');
    if (!data?.success) throw new Error(data?.message || 'Could not reset the Guestel cover.');
    crm.guestelWalletImageUrl = '';
    setGuestelWalletImagePreview(guestelWalletDisplayImageUrl());
    const uploadButton = document.getElementById('guestelWalletImageButton');
    if (uploadButton) uploadButton.textContent = 'Choose custom cover';
    toast('Guestel will use your first room photo.', 'success');
  } catch (error) {
    toast(error?.message || 'Could not reset the Guestel cover.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

function ensureAppsViewRendered(force) {
  const el = document.getElementById('appsView');
  if (!el) return;
  const embeddedNativePreview = document.body.classList.contains('frontdesk-editor-preview')
    || new URLSearchParams(window.location.search).get('previewEditor') === '1';
  const key = (crm.activeHotelId || '') + '|' + (crm.activeHotelAppIcon || '') + '|' + (crm.activeHotelDomain || '') + '|' + (crm.guestelWalletImageUrl || '') + '|' + (crm.guestelWalletFallbackImageUrl || '') + '|' + (crm.guestelWalletSubtitle || '') + '|' + (embeddedNativePreview ? 'native-preview' : 'standard');
  if (force || el.dataset.appsKey !== key || !el.querySelector('.apps-page')) {
    renderAppsView();
    el.dataset.appsKey = key;
  } else if (isNativeFrontdeskApp() || embeddedNativePreview) {
    loadGuestInstallStats();
  }
}

function renderAppsView() {
  const el = document.getElementById('appsView');
  if (!el) return;

  const hName       = crm.activeHotelName || 'Your Property';
  const domain      = crm.activeHotelDomain || '';
  const bookingUrl  = domain ? 'https://' + domain : '#';
  const guestInstallUrl = crm.activeHotelId
    ? `https://clip.mktel.co/clip/${encodeURIComponent(crm.activeHotelId)}?intent=book&ref=frontdesk-guestel`
    : bookingUrl;

  // Booking alerts are a current-device capability. A server-side install event
  // from another phone must not unlock them in an ordinary browser tab.
  const fdInApp = isStandaloneApp();
  const fdNativeApp = isNativeFrontdeskApp();
  const embeddedNativePreview = document.body.classList.contains('frontdesk-editor-preview')
    || new URLSearchParams(window.location.search).get('previewEditor') === '1';
  const nativePresentation = fdNativeApp || embeddedNativePreview;
  const walletSubtitle = guestelWalletSubtitleValue();
  const walletImage = guestelWalletDisplayImageUrl();
  const walletHasCustomImage = !!String(crm.guestelWalletImageUrl || '').trim();
  const offerValue = Number(crm.returnOfferValue) || 0;
  const offerIsAmount = crm.returnOfferKind === 'amount';
  const offerPreviewText = (crm.returnOfferEnabled && offerValue > 0)
    ? (offerIsAmount
        ? `Returning guests see $${offerValue} off per night.`
        : `Returning guests see ${offerValue}% off the direct rate.`)
    : 'Guests see their normal rate.';
  const nativeGuestShareHtml = `
    <div class="apps-step-card" id="tour-native-guest-share">
      <div class="apps-step-title">How guests keep you in Guestel</div>
      <p class="apps-card-help">This is the property card guests save. Change its cover and short line here; Guestel reads the same saved values.</p>
      <div class="guestel-wallet-editor">
        <div class="guestel-wallet-card" aria-label="Preview of ${appsEscape(hName)} in Guestel">
          <div class="guestel-wallet-cover${walletImage ? ' has-image' : ''}" id="guestelWalletPreviewImage">${walletImage ? `<img src="${appsEscape(walletImage)}" alt="Guestel wallet cover">` : '<span>Choose a cover photo</span>'}</div>
          <div class="guestel-wallet-copy">
            <strong>${appsEscape(hName)}</strong>
            <span id="guestelWalletPreviewSubtitle">${appsEscape(walletSubtitle)}</span>
          </div>
        </div>
        <input type="file" id="guestelWalletImageInput" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadGuestelWalletImage(this)">
        <div class="guestel-wallet-actions">
          <button type="button" id="guestelWalletImageButton" onclick="document.getElementById('guestelWalletImageInput').click()">${walletHasCustomImage ? 'Change cover' : 'Choose custom cover'}</button>
          <button type="button" id="guestelWalletImageRemove" class="quiet" onclick="resetGuestelWalletImage()"${walletHasCustomImage ? '' : ' hidden'}>Use room photo</button>
        </div>
        <label class="guestel-wallet-label" for="guestelWalletSubtitleInput">Short line under your name</label>
        <div class="guestel-wallet-field">
          <input id="guestelWalletSubtitleInput" maxlength="64" value="${appsEscape(walletSubtitle)}" placeholder="Location or a short reason to book direct" oninput="updateGuestelWalletPreview()">
          <span id="guestelWalletSubtitleCount">${walletSubtitle.length}/64</span>
        </div>
        <button type="button" class="guestel-wallet-save" id="guestelWalletSubtitleSave" onclick="saveGuestelWalletCard()">Save Guestel card</button>
      </div>
      <div class="apps-section-divider">Returning-guest offer</div>
      <p class="apps-card-help">Give guests who already stayed a reason to book direct again. It shows on their Guestel card — you honor it at the desk.</p>
      <label class="apps-offer-toggle">
        <input type="checkbox" id="edit-offer-enabled" ${crm.returnOfferEnabled ? 'checked' : ''} onchange="updateReturnOfferPreview()"> Offer a returning-guest discount
      </label>
      <div class="apps-offer-row">
        <input type="number" min="0" inputmode="numeric" id="edit-offer-value" value="${offerValue || 10}" oninput="updateReturnOfferPreview()">
        <select id="edit-offer-kind" onchange="updateReturnOfferPreview()">
          <option value="percent" ${offerIsAmount ? '' : 'selected'}>% off</option>
          <option value="amount" ${offerIsAmount ? 'selected' : ''}>$ off / night</option>
        </select>
      </div>
      <div id="offerPreview" class="apps-offer-preview">${offerPreviewText}</div>
      <button type="button" class="guestel-wallet-save" onclick="saveReturnOffer()">Save offer</button>
      <div class="apps-section-divider">Invite a guest</div>
      <div style="margin:0 0 14px;padding:11px 12px;border-radius:11px;background:var(--green-pale);color:#245a40;font-size:12px;line-height:1.5;"><strong>What to say:</strong> “Scan this to book directly and keep us in Guestel.”</div>
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show Guestel QR</button>
      ${guestInstallUrl !== '#' ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;">
          <button type="button" onclick="navigator.clipboard.writeText('${guestInstallUrl}').then(()=>toast('Guestel link copied','success'))" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Copy Guestel link</button>
          <button type="button" onclick="window.open('${guestInstallUrl}','_blank')" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Open guest experience</button>
        </div>
        <div id="guestInstallStats" style="display:none;margin-top:14px;"></div>`
        : '<div id="guestInstallStats" style="display:none;"></div><div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:10px;">Booking domain is still setting up.</div>'}
    </div>`;
  const guestMessagesPanelHtml = '<div id="messagesPanel"></div>';
  const nativeGuestToolsHtml = `
    <div class="apps-native-title">Guestel</div>
    <p class="apps-native-lead">Guests never download Front Desk. You run everything from Marketel Front Desk; guests keep <strong>${hName}</strong>, their stays, and your direct booking page in Guestel.</p>
    ${nativeGuestShareHtml}
    ${guestMessagesPanelHtml}
    ${guestBroadcastCardHtml({ compact: true })}`;
  const appStoreReady = !!String(crm.frontdeskAppStoreUrl || '').trim();
  const webAppLockHtml = `
    <section style="min-height:52vh;display:grid;place-items:center;padding:34px 0;">
      <div style="width:min(100%,430px);padding:28px 24px;border:1.5px solid var(--border);border-radius:22px;background:#fff;text-align:center;box-shadow:0 14px 40px rgba(26,43,34,.09);">
        <div style="width:58px;height:58px;display:grid;place-items:center;margin:0 auto 16px;border-radius:17px;background:var(--green-pale);color:var(--green);font-size:25px;"><i data-lucide="arrow-up-right" style="width:15px;height:15px;"></i></div>
        <div style="font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:var(--green);">Guestel tools</div>
        <h2 style="margin:7px 0 9px;color:var(--text);font-size:23px;line-height:1.18;">Manage Guestel from the owner app.</h2>
        <p style="margin:0 0 20px;color:var(--text-muted);font-size:14px;line-height:1.55;">Download Marketel Front Desk to share your Guestel QR, reply to verified guests, and send updates to guests who opt in.</p>
        <button type="button" onclick="openFrontdeskAppDownload()" ${appStoreReady ? '' : 'aria-disabled="true"'} style="width:100%;min-height:50px;border:0;border-radius:13px;background:${appStoreReady ? 'var(--green)' : '#dce8e1'};color:${appStoreReady ? '#fff' : '#527061'};font-family:inherit;font-size:15px;font-weight:800;cursor:${appStoreReady ? 'pointer' : 'default'};">${appStoreReady ? 'Download Marketel Front Desk' : 'Front Desk app coming soon'}</button>
      </div>
    </section>`;

  const appsMainHtml = nativePresentation
    ? nativeGuestToolsHtml
    : webAppLockHtml;

  const appsFootnoteHtml = nativePresentation
    ? ''
    : fdInApp
    ? 'Front Desk is installed. Guests use Guestel; owners use Marketel Front Desk.'
    : 'You use Marketel Front Desk. Guests use Guestel.';

  el.innerHTML = `
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-native-title { font-size:24px;font-weight:800;color:var(--text);line-height:1.2;margin:2px 0 7px; }
    .apps-native-lead { margin:0 0 16px;color:var(--text-muted);font-size:14px;line-height:1.5; }
    .apps-card-help { margin:5px 0 14px;color:var(--text-muted);font-size:12px;line-height:1.5; }
    .apps-offer-toggle { display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text);margin:2px 0 10px;cursor:pointer; }
    .apps-offer-row { display:flex;gap:8px;margin-bottom:8px; }
    .apps-offer-row input { flex:0 0 92px;min-width:0;padding:11px 13px;font-size:14px;border:1.5px solid var(--border);border-radius:11px;background:#fff;outline:none;font-family:inherit; }
    .apps-offer-row select { flex:1;min-width:0;padding:11px 13px;font-size:14px;border:1.5px solid var(--border);border-radius:11px;background:#fff;font-family:inherit; }
    .apps-offer-preview { font-size:12px;color:var(--green);font-weight:700;min-height:16px;margin-bottom:10px; }
    .guestel-wallet-editor { display:grid;gap:11px;margin-top:4px; }
    .guestel-wallet-card { position:relative;aspect-ratio:1.6/1;overflow:hidden;border:1px solid rgba(34,75,52,.16);border-radius:19px;background:linear-gradient(145deg,#4e9a72,#235f46);box-shadow:0 12px 30px rgba(22,55,36,.11); }
    .guestel-wallet-card::after { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.43),rgba(0,0,0,.02) 62%);pointer-events:none; }
    .guestel-wallet-cover { position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#4e9a72,#235f46);color:rgba(255,255,255,.8);font-size:12px;font-weight:750; }
    .guestel-wallet-cover.has-image { background:#dfe8e2; }
    .guestel-wallet-cover img { position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:center center; }
    .guestel-wallet-copy { position:relative;z-index:1;display:grid;gap:3px;padding:17px 18px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5); }
    .guestel-wallet-copy strong { overflow:hidden;color:#fff;font-size:20px;font-weight:850;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-wallet-copy span { overflow:hidden;color:rgba(255,255,255,.9);font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-wallet-actions { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
    .guestel-wallet-actions button,.guestel-wallet-save { min-height:44px;border:1.5px solid var(--green);border-radius:12px;background:var(--green);color:#fff;font:800 13px/1 inherit;cursor:pointer; }
    .guestel-wallet-actions button.quiet { border-color:var(--border);background:#fff;color:var(--text); }
    .guestel-wallet-actions button[hidden] { display:none; }
    .guestel-wallet-actions button:disabled,.guestel-wallet-save:disabled { opacity:.55;cursor:wait; }
    .guestel-wallet-label { margin-top:3px;color:var(--text);font-size:11px;font-weight:800; }
    .guestel-wallet-field { position:relative; }
    .guestel-wallet-field input { width:100%;min-height:46px;padding:11px 52px 11px 13px;border:1.5px solid var(--border);border-radius:12px;background:#fff;color:var(--text);font:600 14px/1.35 inherit;box-sizing:border-box;outline:0; }
    .guestel-wallet-field input:focus { border-color:var(--green);box-shadow:0 0 0 3px rgba(46,125,91,.1); }
    .guestel-wallet-field span { position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:9px;font-weight:700; }
    .guestel-wallet-save { width:100%;min-height:48px;font-size:14px; }
    .apps-headline { font-size:20px;font-weight:800;color:var(--text);line-height:1.3;margin:0 0 8px; }
    .apps-intro { font-size:14px;color:var(--text-muted);line-height:1.55;margin:0 0 22px; }
    .apps-story { margin:0 0 22px;padding:4px 2px 2px; }
    .apps-story-kicker { font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:10px; }
    .apps-story-title { font-size:31px;font-weight:800;color:var(--text);line-height:1.08;margin:0 0 14px;letter-spacing:0; }
    .apps-story-copy { font-size:18px;color:var(--text-soft);line-height:1.45;margin:0 0 20px; }
    .apps-story-copy strong { color:var(--text);font-weight:800; }
    .apps-story-line { border-top:1.5px solid var(--border);padding:19px 0 2px; }
    .apps-story-step { font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px; }
    .apps-story-line-title { font-size:22px;font-weight:800;color:var(--text);line-height:1.16;margin:0 0 8px;letter-spacing:0; }
    .apps-story-line p { font-size:16px;color:var(--text-soft);line-height:1.48;margin:0; }
    .apps-story-actions { display:flex;flex-direction:column;gap:10px;margin-top:14px; }
    .apps-story-primary,
    .apps-story-secondary { width:100%;min-height:48px;padding:14px 16px;border-radius:12px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;text-align:center; }
    .apps-story-primary { border:none;background:var(--green);color:#fff;box-shadow:0 8px 22px rgba(46,125,91,0.24); }
    .apps-story-secondary { border:1.5px solid var(--green);background:#fff;color:var(--green); }
    .apps-story-status { display:flex;align-items:flex-start;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:13px 14px;color:#166534;font-size:13px;font-weight:700;line-height:1.45; }
    .apps-story-status-icon { width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:800; }
    .apps-story-domain-note { border:1px solid var(--border);border-radius:12px;padding:13px 14px;background:#fff;color:var(--text-muted);font-size:13px;line-height:1.45; }
    .apps-loop { display:flex;align-items:flex-start;justify-content:center;gap:14px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1.5px solid #bbf7d0;border-radius:16px;padding:18px 14px;margin:0 0 16px; }
    .apps-loop-side { flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center; }
    .apps-loop-tile { width:54px;height:54px;border-radius:14px;background:#fff;border:1px solid var(--border);box-shadow:0 4px 14px rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px; }
    .apps-loop-tile--guest { padding:0; }
    .apps-loop-name { font-size:13px;font-weight:800;color:var(--text);line-height:1.25;word-break:break-word; }
    .apps-loop-sub { font-size:11px;color:var(--text-muted);line-height:1.35;margin-top:3px; }
    .apps-loop-arrow { flex-shrink:0;align-self:center;font-size:22px;color:var(--green);font-weight:700;padding-top:14px; }
    .apps-step-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px; }
    .apps-section-divider { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin:24px 0 14px;padding-top:18px;border-top:1.5px solid var(--border); }
    .apps-step-card { background:var(--white);border:1.5px solid var(--border);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:var(--shadow); }
    .apps-step-title { font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px;line-height:1.35; }
    .apps-icon-card { display:flex;align-items:center;gap:14px; }
    .guestel-owner-preview { margin:-2px 0 14px;padding:12px;border:1px solid #CFE0D6;border-radius:16px;background:linear-gradient(145deg,#EAF4EE,#F8FAF9); }
    .guestel-owner-preview__bar { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--green);font-size:11px;font-weight:850;letter-spacing:.04em;text-transform:uppercase; }
    .guestel-owner-preview__bar b { color:var(--text-muted);font-size:9px;letter-spacing:.05em; }
    .guestel-owner-preview__card { min-height:78px;display:grid;grid-template-columns:54px minmax(0,1fr);align-items:center;gap:12px;padding:12px;border-radius:15px;background:#fff;box-shadow:0 8px 22px rgba(26,43,34,.11); }
    .guestel-owner-preview__image { width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:13px;background:var(--green); }
    .guestel-owner-preview__image > img,.guestel-owner-preview__image > span { width:100% !important;height:100% !important;border-radius:13px !important;object-fit:cover; }
    .guestel-owner-preview__card strong,.guestel-owner-preview__card span { display:block;min-width:0; }
    .guestel-owner-preview__card strong { overflow:hidden;color:var(--text);font-size:15px;font-weight:850;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-owner-preview__card span { margin-top:4px;color:var(--text-muted);font-size:10.5px;line-height:1.35; }
    .apps-how-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin:22px 0 10px; }
    .apps-how-sub { font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.45; }
    .apps-q-list { display:flex;flex-direction:column;gap:8px;margin-bottom:20px; }
    .apps-q { display:flex;align-items:center;justify-content:space-between;width:100%;padding:15px 16px;border:none;background:var(--white);border:1.5px solid var(--border);border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;box-shadow:var(--shadow);transition:background 0.15s,border-color 0.15s; }
    .apps-q:active { background:var(--bg); border-color:var(--green); }
    .apps-q-text { flex:1;min-width:0; }
    .apps-q-title { font-size:14px;font-weight:700;color:var(--text);line-height:1.35;display:flex;flex-wrap:wrap;align-items:center;gap:6px; }
    .apps-q-hint { font-size:12px;color:var(--text-muted);margin-top:3px;line-height:1.45; }
    .apps-q-chevron { font-size:20px;color:var(--green);flex-shrink:0;margin-left:12px;line-height:1;font-weight:700; }
    .apps-q--video { border-color:#bbf7d0;background:linear-gradient(135deg,#fff 0%,#f0fdf4 100%); }
    .apps-q-media { flex-shrink:0;margin-left:12px;width:34px;height:34px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(46,125,91,0.35); }
    .apps-q-media__play { width:0;height:0;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #fff;margin-left:2px; }
    .apps-media-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:999px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #86efac;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.45px;color:#166534;line-height:1;vertical-align:middle;flex-shrink:0; }
    .apps-media-badge--light { background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.28);color:#fff; }
    .apps-media-badge--light .apps-media-badge__ring { border-color:rgba(255,255,255,0.45); }
    .apps-media-badge--light .apps-media-badge__play { background:rgba(255,255,255,0.95); }
    .apps-media-badge--light .apps-media-badge__play::after { border-color:transparent transparent transparent #166534; }
    .apps-media-badge__ring { width:16px;height:16px;border-radius:50%;border:2px solid #4ade80;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;animation:appsVideoPulse 2s ease-in-out infinite; }
    .apps-media-badge__play { width:10px;height:10px;border-radius:50%;background:#166534;display:block;position:relative;flex-shrink:0; }
    .apps-media-badge__play::after { content:'';width:0;height:0;border-style:solid;border-width:3px 0 3px 5px;border-color:transparent transparent transparent #fff;margin-left:1px; }
    .apps-media-badge__label { line-height:1; }
    .apps-video-teaser { display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 14px;border-radius:12px;border:1.5px dashed #86efac;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);color:#166534;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s,border-color 0.15s; }
    .apps-video-teaser:active { background:#dcfce7;border-color:#4ade80; }
    .apps-video-teaser__play { width:28px;height:28px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 10px rgba(46,125,91,0.35);position:relative; }
    .apps-video-teaser__play::after { content:'';width:0;height:0;border-style:solid;border-width:6px 0 6px 9px;border-color:transparent transparent transparent #fff;margin-left:2px; }
    @keyframes appsVideoPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
    .apps-step-title-row { display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px; }
    .apps-broadcast-card { background:var(--white);border:1.5px solid #CFE0D6;border-radius:18px;padding:18px;margin-bottom:16px;box-shadow:0 12px 34px rgba(26,43,34,.09); }
    .guest-reach-intro { margin-bottom:13px; }
    .guest-reach-kicker { margin-bottom:6px;color:var(--green);font-size:10px;font-weight:850;letter-spacing:.085em;text-transform:uppercase; }
    .guest-reach-title { color:var(--text);font-size:20px;font-weight:850;line-height:1.18;letter-spacing:-.01em; }
    .guest-reach-intro p { margin:7px 0 0;color:var(--text-muted);font-size:13px;line-height:1.5; }
    .guest-notification-demo { margin:0 0 14px;padding:15px 11px 11px;border-radius:16px;background:linear-gradient(145deg,#BFD2C7,#E7ECE9);overflow:hidden; }
    .guest-notification-shell { padding:12px 13px 13px;border:1px solid rgba(255,255,255,.66);border-radius:20px;background:rgba(246,248,247,.9);box-shadow:0 8px 24px rgba(20,40,29,.16),inset 0 1px 0 rgba(255,255,255,.84);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;font-synthesis:none;font-kerning:normal;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-backdrop-filter:saturate(1.35) blur(18px);backdrop-filter:saturate(1.35) blur(18px); }
    .guest-notification-meta { min-width:0;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;color:rgba(60,60,67,.6);font-size:11px;font-weight:400;line-height:1;letter-spacing:-.01em; }
    .guest-notification-meta strong { overflow:hidden;color:rgba(60,60,67,.72);font-size:11px;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-meta > span:last-child { color:rgba(60,60,67,.55);font-weight:400; }
    .guest-notification-icon { width:28px;height:28px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(60,60,67,.12);border-radius:7px;background:#fff;color:#fff;font-size:12px;font-weight:700;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.08); }
    .guest-notification-icon img { width:100%;height:100%;display:block;padding:1px;border-radius:6px;background:#fff;object-fit:contain;box-sizing:border-box; }
    .guest-notification-icon span { width:100%;height:100%;display:grid;place-items:center;background:var(--green); }
    .guest-notification-title { margin-top:9px;overflow:hidden;color:#111;font-size:15px;font-weight:600;line-height:1.22;letter-spacing:-.012em;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-body { min-height:36px;margin-top:2px;overflow:hidden;color:rgba(0,0,0,.78);font-size:14px;font-weight:400;line-height:1.28;letter-spacing:-.008em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2; }
    .guest-notification-caption { margin-top:8px;color:#526158;font-size:10px;font-weight:700;text-align:center; }
    .guest-reach-suggestion { margin:-2px 0 12px;padding:0;border:0;background:none;color:var(--green);font:inherit;font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer; }
    .guest-reach-video { width:100%;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;padding:8px;border:0;background:none;color:var(--green);font:inherit;font-size:11px;font-weight:750;cursor:pointer; }
    .guest-reach-video span { width:21px;height:21px;display:grid;place-items:center;padding-left:1px;border-radius:50%;background:#E6F2EB;color:var(--green);font-size:8px; }
    .apps-footnote { font-size:11px;color:var(--text-muted);text-align:center;margin-top:14px;line-height:1.5; }
    .apps-tour-replay { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--border);background:var(--white);color:var(--green);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:18px;box-shadow:var(--shadow); }
    .apps-tour-replay:active { background:var(--bg); }
    .apps-install-coach-trigger { width:100%;min-height:60px;display:grid;grid-template-columns:38px 1fr 16px;align-items:center;gap:10px;margin-top:13px;padding:9px 12px;border:1.5px solid #CFE0D6;border-radius:13px;background:#F4F9F6;color:var(--text);font:inherit;text-align:left;cursor:pointer; }
    .apps-install-coach-trigger:active { background:#EAF3EE; }
    .apps-install-coach-trigger__icon { width:34px;height:34px;display:grid;place-items:center;color:var(--green); }
    .apps-install-coach-trigger__icon svg { width:20px;height:25px;display:block;fill:currentColor;overflow:visible; }
    .apps-install-coach-trigger strong,.apps-install-coach-trigger small { display:block; }
    .apps-install-coach-trigger strong { font-size:13px;line-height:1.3;font-weight:800; }
    .apps-install-coach-trigger small { margin-top:3px;color:var(--text-muted);font-size:10.5px;line-height:1.35;font-weight:500; }
    .apps-install-coach-trigger > b { color:var(--green);font-size:20px;font-weight:500; }
    .apps-fold { border:1.5px solid var(--border);border-radius:14px;margin-bottom:12px;background:var(--white);box-shadow:var(--shadow);overflow:hidden; }
    .apps-fold-summary { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;cursor:pointer;font-family:inherit;list-style:none; }
    .apps-fold-summary::-webkit-details-marker { display:none; }
    .apps-fold-title { font-size:14px;font-weight:800;color:var(--text);line-height:1.3; }
    .apps-fold-meta { font-size:11px;color:var(--text-muted);margin-top:2px;font-weight:500; }
    .apps-fold-chevron { font-size:18px;color:var(--green);flex-shrink:0;transition:transform 0.2s;line-height:1; }
    .apps-fold[open] .apps-fold-chevron { transform:rotate(90deg); }
    .apps-fold-body { padding:0 16px 16px;border-top:1px solid var(--border); }
    .apps-fold-body .apps-q-list { margin-top:12px;margin-bottom:0; }
    .apps-fold-body .apps-how-sub { margin-top:12px;margin-bottom:0; }
    @media (min-width: 768px) {
      .apps-story { padding-top:6px; }
      .apps-story-title { font-size:38px;max-width:760px; }
      .apps-story-copy { font-size:19px;max-width:720px; }
      .apps-story-line { padding-top:22px; }
      .apps-story-line-title { font-size:25px;max-width:720px; }
      .apps-story-line p { font-size:17px;max-width:720px; }
      .apps-story-actions { max-width:360px; }
    }
  </style>

  <div class="apps-page">

    ${appsMainHtml}

    ${appsFootnoteHtml ? `<p class="apps-footnote">${appsFootnoteHtml}</p>` : ''}

  </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (nativePresentation) {
    if (crm.guestMessages.length) renderMessages();
    else loadMessages();
    loadGuestInstallStats();
    loadBookingReviewSettings();
  }
}

async function loadBookingReviewSettings() {
  try {
    const data = await api('GET', '/api/crm/booking-review-settings');
    if (!data?.success || !data.data) return;
    crm.bookingReviewSettings = data.data;
    const select = document.getElementById('bookingReviewReminderSelect');
    if (select) select.value = String(data.data.reminderMinutes);
  } catch (_) {}
}

async function saveBookingReviewReminderSetting(select) {
  const previous = String(crm.bookingReviewSettings?.reminderMinutes ?? 15);
  const reminderMinutes = parseInt(select?.value, 10);
  if (![0, 15, 30, 60].includes(reminderMinutes)) return;
  if (select) select.disabled = true;
  try {
    const data = await api('POST', '/api/crm/booking-review-settings', { reminderMinutes });
    if (!data?.success) throw new Error(data?.message || 'Could not save reminder timing.');
    crm.bookingReviewSettings = data.data;
    toast(
      reminderMinutes === 0
        ? 'Booking reminders off — the first alert will still arrive.'
        : `Booking reminders set for every ${reminderMinutes === 60 ? 'hour' : reminderMinutes + ' minutes'}.`,
      'success'
    );
  } catch (e) {
    if (select) select.value = previous;
    toast(e?.message || 'Could not save reminder timing.', 'error');
  } finally {
    if (select) select.disabled = false;
  }
}

async function loadGuestInstallStats() {
  const el = document.getElementById('guestInstallStats');
  try {
    const data = await api('GET', '/api/crm/guest-install-stats');
    if (!data.success) throw new Error(data.message || 'Failed');
    crm.guestPushSubscriberCount = data.guestPushSubscribers ?? 0;
    applyGuestBroadcastAudienceUi();
    if (!el) return;
    const t = data.totals || {};
    const notificationPrompts = t.notification_prompts || 0;
    const notificationSubscribers = data.guestPushSubscribers || 0;
    const guestelSavedDevices = data.guestelSavedDevices || 0;
    const guestelBroadcastSubscribers = data.guestelBroadcastSubscribers || 0;
    if (!data.guestelSavedDevices && !data.guestelBroadcastSubscribers) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'block';
    el.innerHTML = ''
      + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guestel activity</div>'
      + '<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + guestelSavedDevices + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">devices keeping your property</div></div>'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + guestelBroadcastSubscribers + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Guestel devices opted into updates</div></div>'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + notificationSubscribers + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">total reachable devices</div></div>'
      + '</div>'
      + (notificationPrompts ? '<div style="font-size:11px;color:var(--text-muted);margin:-2px 0 10px;">Notification permission: ' + (t.notification_granted || 0) + ' granted · ' + (t.notification_denied || 0) + ' denied · ' + (t.notification_dismissed || 0) + ' dismissed · ' + (t.notification_failed || 0) + ' failed</div>' : '');
  } catch (e) {
    crm.guestPushSubscriberCount = 0;
    applyGuestBroadcastAudienceUi();
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }
  }
}
const _appsExports = {
  appsTourClose,
  appsTourNav,
  appsTourRender,
  ensureAppsViewRendered,
  loadBookingReviewSettings,
  loadGuestInstallStats,
  renderAppsView,
  resetGuestelWalletImage,
  saveBookingReviewReminderSetting,
  saveGuestelWalletCard,
  saveReturnOffer,
  startAppsTour,
  updateReturnOfferPreview,
  updateGuestelWalletPreview,
  uploadGuestelWalletImage,
};

export function install() {
  exposeToWindow(_appsExports);
}

export default _appsExports;
