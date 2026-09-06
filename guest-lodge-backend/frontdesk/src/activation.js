import { crm } from './state.js';
import QRCode from 'qrcode';
import appIcon from './assets/marketel-frontdesk-icon.png';
import { trialSummary } from './trial-summary.js';
import './styles/activation.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const activationPendingKey = hotelId => `marketelActivationPendingV1.${hotelId}`;
const track = (action) => window.MarketelJourney?.track('JourneyControlActivated', { controlName: `trial-${action}` });

export function showActivationConfirmation() {
  if (document.getElementById('activatedModalOverlay')) return;
  const hotelId = crm.activeHotelId;
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.id = 'activatedModalOverlay';
  overlay.className = 'activation-overlay';
  overlay.innerHTML = '<section class="activation-sheet" role="dialog" aria-modal="true" aria-labelledby="activationTitle" tabindex="-1"></section>';
  const sheet = overlay.firstElementChild;
  document.documentElement.classList.add('marketel-activation-open');
  document.body.appendChild(overlay);
  let closed = false;
  let checking = false;
  let exhausted = false;
  const android = /Android/i.test(navigator.userAgent);
  const desktop = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const appStoreUrl = String(crm.frontdeskAppStoreUrl || '').trim();
  const appAvailable = /^https:\/\/apps\.apple\.com\//i.test(appStoreUrl);
  const bookingDomain = String(crm.activeHotelDomain || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const bookingUrl = bookingDomain ? `https://${bookingDomain}/` : '';
  const dismiss = () => {
    closed = true;
    overlay.remove();
    document.documentElement.classList.remove('marketel-activation-open');
    try {
      if (crm.hotelSubscribed || trialSummary(crm).ended) sessionStorage.removeItem(activationPendingKey(hotelId));
    } catch (_) {}
    previousFocus?.isConnected && previousFocus.focus();
  };
  const continueWeb = () => {
    track('continue-web');
    dismiss();
    window.setFilter?.('bookings');
    const guide = document.querySelector('#goLiveBanner details');
    if (guide) guide.open = true;
  };
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); continueWeb(); }
    if (event.key !== 'Tab') return;
    const focusable = [...sheet.querySelectorAll('button:not(:disabled), a[href]')];
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet)) {
      event.preventDefault(); first.focus();
    }
  });
  function render() {
    if (closed || crm.activeHotelId !== hotelId) { if (!closed) dismiss(); return; }
    const focusedAction = sheet.contains(document.activeElement) ? document.activeElement?.dataset?.activation : null;
    const summary = trialSummary(crm);
    const active = !!crm.hotelSubscribed;
    sheet.innerHTML = `
      <div class="activation-success" aria-hidden="true">${active ? '✓' : '…'}</div>
      <p class="activation-eyebrow">${esc(crm.activeHotelName || 'Your property')}</p>
      <h1 id="activationTitle">${!active && !summary.ended && exhausted ? 'Your trial is not confirmed yet' : esc(summary.title)}</h1>
      <div class="activation-billing" role="status">
        ${summary.trialing ? '<strong>$0 charged when your trial started</strong>' : ''}
        <p>${esc(summary.billing)}</p>
        ${active || summary.ended ? '<button class="activation-link" data-activation="billing">Manage or cancel in Trial &amp; Billing →</button>' : ''}
      </div>
      ${active ? `<p class="activation-status">Your property setup is saved. <strong>${bookingDomain ? 'Reservations are enabled.' : 'Your booking domain is still being checked.'}</strong> Review your rooms, rates, availability, and policies before sharing your link.</p>
      ${bookingUrl ? `<a class="activation-booking-link" href="${esc(bookingUrl)}" target="_blank" rel="noopener">Review ${esc(bookingDomain)} →</a>` : ''}
      <div class="activation-app">
        <div class="activation-app-heading"><img src="${appIcon}" width="64" height="64" alt="Marketel Front Desk app icon"><div><h2>Marketel Front Desk</h2><p>For you and your staff · iPhone app</p></div></div>
        <p>Manage booking requests, availability, and guest messages.</p>
        ${appAvailable ? `<a class="activation-download${android ? ' is-secondary' : ''}" data-activation="download" href="${esc(appStoreUrl)}" target="_blank" rel="noopener">Download on the App Store <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>` : '<p>The iPhone app download is not available here yet. Continue in Web Front Desk below.</p>'}
        <p class="activation-signin"><strong>Already set up. Just sign in.</strong> After installing, use the email you used to set up this property and enter the six-digit code sent to your email. Select your property when it appears.</p>
        ${desktop && appAvailable ? '<div class="activation-qr" hidden><img width="112" height="112" alt="QR code for the Marketel Front Desk App Store listing"><span>Scan with your iPhone<br><small>Then sign in with your setup email.</small></span></div>' : ''}
        ${android ? '<p>Use Web Front Desk on this device. Native booking alerts and the no-answer rule are set up in the iPhone app.</p>' : ''}
      </div>
      <div class="activation-next"><h2>Once you sign in</h2><p>Turn on booking alerts, choose what happens if nobody answers a request, and review your property details. Then check the booking experience and share your link.</p></div>
      <p class="activation-guests">Guests use your booking link. Guestel is their guest experience; Front Desk is your staff app.</p>`
      : `<p class="activation-status">${summary.ended ? 'Open Front Desk to view existing reservations and manage your subscription.' : exhausted ? 'Confirmation is taking longer than expected. Check again or contact support before trying checkout again.' : 'Please wait while we confirm access. You can leave this screen and check again from Front Desk.'}</p>`}
      <footer class="activation-footer"><button class="activation-web ${!appAvailable || android || !active ? 'is-primary' : ''}" data-activation="web">Continue in Web Front Desk</button>
      ${(!active && !summary.ended) || (summary.trialing && (!summary.price || !summary.endLabel)) ? `<button class="activation-link" data-activation="retry" ${checking ? 'disabled' : ''}>${checking ? 'Checking…' : 'Check again'}</button>` : ''}
      <a class="activation-support" href="mailto:support@bookmarketel.com">Need help? Contact support</a></footer>`;
    sheet.querySelector('[data-activation="web"]').onclick = continueWeb;
    sheet.querySelector('[data-activation="billing"]')?.addEventListener('click', () => { track('billing'); window.openMarketelBillingPortal?.(); });
    sheet.querySelector('[data-activation="download"]')?.addEventListener('click', () => track('download'));
    sheet.querySelector('[data-activation="retry"]')?.addEventListener('click', () => { track('check-again'); void reconcile(); });
    if (focusedAction) sheet.querySelector(`[data-activation="${focusedAction}"]`)?.focus();
    const qr = sheet.querySelector('.activation-qr');
    if (qr) QRCode.toDataURL(appStoreUrl, { width: 224, margin: 1 }).then(url => {
      if (!qr.isConnected) return;
      qr.querySelector('img').src = url;
      qr.hidden = false;
    }).catch(() => {});
  }
  async function reconcile() {
    if (checking || closed) return;
    checking = true;
    exhausted = false;
    render();
    try {
      for (const delay of [0, 1000, 2000, 4000]) {
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        if (closed || crm.activeHotelId !== hotelId) return;
        try { await window.loadMarketelTrialStatus?.(); } catch (_) { /* Keep access and allow another status check. */ }
        if (closed) return;
        render();
        const summary = trialSummary(crm);
        if (summary.ended) return;
        if (crm.hotelSubscribed && (!summary.trialing || (summary.price && summary.endLabel))) return;
      }
      exhausted = true;
    } finally {
      checking = false;
      render();
    }
  }
  render();
  sheet.focus();
  track('confirmation-view');
  void reconcile();
}
