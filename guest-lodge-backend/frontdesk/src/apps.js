import { crm } from './state.js';

import { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad, exposeToWindow } from './utils.js';

// ── APPS PAGE ─────────────────────────────────────────

const APPS_SHOWCASE = {
  homeScreen:          'https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg',
  guestHome:           'https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png',
  guestBook:           'https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png',
  guestMessagesImg:    'https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png',
  frontdeskMessages:   'https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png',
  // Videos — live recordings
  bookingNotifVideo:        'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_21-14-19_1_eckwlk.mp4',
  guestMessageNotifVideo:   'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4',
  guestInstallVideo:        'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4',
  frontdeskInstallVideo:    'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_19-49-38_1_tc1bzm.mp4',
  guestBroadcastVideo:      'https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/v1781196304/ScreenRecording_06-11-2026_19-41-56_1_kjgudg.mp4',
};

// Real iPhone screenshots — rounded corners sell the "phone" look without a mockup frame.
const APPS_PHONE_RADIUS = '32px';

// Cloudinary URL helpers
function appsCloudinaryImg(url, width) {
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_' + (width || 400) + '/');
}
function appsPhoneImgStyle(extra) {
  return `border-radius:${APPS_PHONE_RADIUS};box-shadow:0 10px 36px rgba(0,0,0,0.22);${extra || ''}`;
}
// Full-res for lightbox (device pixel aware, max 1600px)
function appsCloudinaryFull(url) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(Math.min(window.screen.width * dpr, 1600));
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:best,w_${w}/`);
}

// ── LIGHTBOX ──────────────────────────────────────────
// Single global lightbox for the Apps page.
// items: array of { type: 'image'|'video', src, alt, caption }
let _appsLbItems = [];
let _appsLbIdx   = 0;

function appsOpenLightbox(items, startIdx) {
  appsTourClose(false);
  _appsLbItems = items;
  _appsLbIdx   = startIdx || 0;
  let lb = document.getElementById('appsLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'appsLightbox';
    lb.style.cssText = [
      'position:fixed;inset:0;z-index:102000;background:#000;',
      'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;',
      'overscroll-behavior:contain;touch-action:pan-y;',
      'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);',
    ].join('');
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    // Keyboard
    lb._keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') appsLbNav(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') appsLbNav(-1);
      else if (e.key === 'Escape') appsCloseLightbox();
    };
    document.addEventListener('keydown', lb._keyHandler);
    // Swipe support
    let touchStartX = 0;
    lb.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) appsLbNav(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  document.body.style.overflow = 'hidden';
  appsLbRender();
}

function appsCloseLightbox() {
  const lb = document.getElementById('appsLightbox');
  if (!lb) return;
  document.removeEventListener('keydown', lb._keyHandler);
  lb.remove();
  document.body.style.overflow = '';
}

function appsLbNav(dir) {
  const total = _appsLbItems.length;
  if (total <= 1) return;
  _appsLbIdx = (_appsLbIdx + dir + total) % total;
  appsLbRender();
}

function appsLbRender() {
  const lb = document.getElementById('appsLightbox');
  if (!lb) return;
  const item    = _appsLbItems[_appsLbIdx];
  const total   = _appsLbItems.length;
  const isImg   = item.type !== 'video';
  const counter = total > 1 ? `${_appsLbIdx + 1} / ${total}` : '';

  const mediaHtml = isImg
    ? `<img src="${appsCloudinaryFull(item.src)}" alt="${item.alt || ''}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${appsPhoneImgStyle()}"
          loading="eager" decoding="async">`
    : `<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${appsPhoneImgStyle()}"
          ${item.poster ? `poster="${appsCloudinaryImg(item.poster, 400)}"` : ''}>
          <source src="${item.src}" type="video/mp4">
       </video>`;

  const prevBtn = total > 1
    ? `<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>` : '';
  const nextBtn = total > 1
    ? `<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>` : '';

  const dotNav = total > 1 ? `<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length: total}, (_, i) =>
      `<div onclick="appsOpenLightbox(_appsLbItems,${i})" style="width:7px;height:7px;border-radius:50%;background:${i===_appsLbIdx ? '#fff' : 'rgba(255,255,255,0.35)'};cursor:pointer;transition:background 0.2s;"></div>`
    ).join('')}
  </div>` : '';

  lb.innerHTML = `
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${counter}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${mediaHtml}
      ${prevBtn}${nextBtn}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${item.title ? `<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${item.title}</div>` : ''}
      ${item.caption ? `<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${item.caption}</div>` : ''}
      ${dotNav}
    </div>`;
}

// Tap a question → lightbox with screenshot or video
function appsVideoBadgeHtml(label, variant) {
  const text = label || 'Video';
  const cls = 'apps-media-badge' + (variant === 'light' ? ' apps-media-badge--light' : '');
  return `<span class="${cls}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${text}</span></span>`;
}

function appsQuestionRow(question, hint, itemsEnc, startIdx, isVideo) {
  const badge = isVideo ? appsVideoBadgeHtml('Video') : '';
  const chevron = isVideo
    ? `<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>`
    : `<span class="apps-q-chevron" aria-hidden="true">›</span>`;
  return `<button type="button" class="apps-q${isVideo ? ' apps-q--video' : ''}" onclick="appsOpenLightbox(${itemsEnc},${startIdx})">
    <div class="apps-q-text">
      <div class="apps-q-title">${question}${badge}</div>
      ${hint ? `<div class="apps-q-hint">${hint}</div>` : (isVideo ? `<div class="apps-q-hint">Tap to watch — about 1 min</div>` : '')}
    </div>
    ${chevron}
  </button>`;
}

function detectAppPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'ios';
}

function ensureAppsViewRendered(force) {
  const el = document.getElementById('appsView');
  if (!el) return;
  const key = (crm.activeHotelId || '') + '|' + (crm.activeHotelAppIcon || '') + '|' + (crm.activeHotelDomain || '');
  if (force || el.dataset.appsKey !== key || !el.querySelector('.apps-page')) {
    renderAppsView();
    el.dataset.appsKey = key;
  } else {
    loadGuestInstallStats();
  }
}

function renderAppsView() {
  const el = document.getElementById('appsView');
  if (!el) return;

  const hName       = crm.activeHotelName || 'Your Hotel';
  const hotelAppIcon = crm.activeHotelAppIcon || '';
  const hotelInitial = hName.trim().charAt(0).toUpperCase() || '🏨';
  const domain      = crm.activeHotelDomain || '';
  const bookingUrl  = domain ? 'https://' + domain : '#';
  const guestInstallUrl = domain ? 'https://' + domain + '/install' : '#';

  function enc(arr) { return JSON.stringify(arr).replace(/"/g, '&quot;'); }

  const guestInstallPoster = appsCloudinaryImg(APPS_SHOWCASE.guestHome, 520);

  const homeScreenItems = [
    { type: 'image', src: APPS_SHOWCASE.homeScreen, alt: 'Two phone apps', title: 'Your app and theirs — same home screen',
      caption: `You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${hName}</strong> — they tap it to book you or text you. No app store.` },
  ];
  const guestItems = [
    { type: 'image', src: APPS_SHOWCASE.guestHome, alt: 'Guest home screen', title: 'What your guests see — Home',
      caption: 'Their stay info — check-in time, your WiFi password, and more.' },
    { type: 'image', src: APPS_SHOWCASE.guestBook, alt: 'Guest book screen', title: 'What your guests see — Book a room',
      caption: 'They book directly with you. You keep the money — no middleman.' },
    { type: 'image', src: APPS_SHOWCASE.guestMessagesImg, alt: 'Guest messages', title: 'What your guests see — Message you',
      caption: 'They text you from the app — like "What\'s the WiFi password?"' },
  ];
  const guestInstallItems = [
    { type: 'video', src: APPS_SHOWCASE.guestInstallVideo, poster: APPS_SHOWCASE.guestHome, alt: 'Guest adds hotel to phone', title: 'How your guests put your hotel on their phone',
      caption: 'They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don\'t need to do anything.' },
  ];
  const messageItems = [
    { type: 'image', src: APPS_SHOWCASE.guestMessagesImg, alt: 'Guest sends message', title: 'Your guest texts you',
      caption: 'Like "How do I connect to WiFi?" — they type it in your hotel app.' },
    { type: 'image', src: APPS_SHOWCASE.frontdeskMessages, alt: 'You reply', title: 'You text them back',
      caption: 'Open <strong>Bookings</strong>, type your reply. Takes 5 seconds.' },
    { type: 'video', src: APPS_SHOWCASE.guestMessageNotifVideo, poster: APPS_SHOWCASE.guestMessagesImg, alt: 'Guest gets reply alert', title: 'Their phone buzzes with your answer',
      caption: 'They get your reply on their phone — like a text from you.' },
  ];

  const fdInApp = isStandaloneApp() || crm.frontdeskInstalled;
  const fdGranted = (typeof Notification !== 'undefined') && Notification.permission === 'granted';
  const fdOnNarrowScreen = !!(window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  const fdInstallLabel = fdOnNarrowScreen ? 'Install on this phone' : 'Install Front Desk';

  let fdCtaHtml;
  if (fdInApp && fdGranted) {
    fdCtaHtml = `<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`;
  } else if (fdInApp) {
    fdCtaHtml = `<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`;
  } else {
    fdCtaHtml = `<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;
  }

  const storyFrontdeskActionHtml = fdInApp
    ? `<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`
    : `<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${fdInstallLabel}</button>`;
  const storyBookingActionHtml = guestInstallUrl !== '#'
    ? `<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>`
    : `<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>`;

  // Icon preview matches the loop tile: uploaded logos use the whole square,
  // while the generated letter icon is full-bleed green edge-to-edge.
  const iconBoxBase = 'width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;';
  const iconBoxStyle = hotelAppIcon
    ? iconBoxBase + 'background:#fff;border:1px solid var(--border);padding:0;'
    : iconBoxBase;
  const iconInnerHtml = hotelAppIcon
    ? `<img src="${hotelAppIcon}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${hotelInitial}</span>`;
  const iconButtonClick = fdInApp
    ? "document.getElementById('appsAppIconInput').click()"
    : "toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')";
  const logoBlockHtml = `
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${iconBoxStyle}">
        ${iconInnerHtml}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${hName}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${iconButtonClick}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${hotelAppIcon ? 'Change picture' : 'Upload picture'}</button>
        ${fdInApp ? '' : '<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`;

  const checkinActionsHtml = `
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${guestInstallUrl !== '#' ? `
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>` : ''}
      ${guestInstallUrl === '#' ? '<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>' : ''}`;

  // Guest install link — promoted out of the Help fold so it's always reachable (§1D.2).
  const guestInstallLinkHtml = guestInstallUrl !== '#' ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${guestInstallUrl.replace('https://', '')}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>` : '<div id="guestInstallStats" style="display:none;"></div>';

  // Loop diagram — shows the two-app relationship on every visit (§1D.2).
  const loopGuestTile = hotelAppIcon
    ? `<img src="${hotelAppIcon}" alt="" style="width:100%;height:100%;object-fit:contain;">`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${hotelInitial}</span>`;
  const loopDiagramHtml = `
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${loopGuestTile}</div>
        <div class="apps-loop-name">${hName}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`;

  const appsStoryHtml = `
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title" id="tour-apps-headline">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy" id="tour-apps-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line" id="tour-apps-first">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${storyFrontdeskActionHtml}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${storyBookingActionHtml}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`;

  const appsHelpBodyHtml = `
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${guestInstallPoster}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${enc(guestInstallItems)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${appsQuestionRow('What guests see on their phone', '', enc(guestItems), 0, false)}
          ${appsQuestionRow('How guests add your hotel', '', enc(guestInstallItems), 0, true)}
          ${appsQuestionRow('Guest texts you, you text back', '', enc(messageItems), 0, true)}
          ${appsQuestionRow('Your app and theirs — side by side', '', enc(homeScreenItems), 0, false)}
        </div>
        ${bookingUrl !== '#' ? `<button onclick="window.open('${bookingUrl}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>` : ''}`;

  const deviceCardHtml = (tourId) => `
    <div class="apps-step-card"${tourId ? ' id="tour-fd-install-card"' : ''}>
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${fdInApp ? 'Front Desk — installed' : 'Install Front Desk'}</div>
      ${fdCtaHtml}
    </div>`;
  const guestIconCardHtml = () => `
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${logoBlockHtml}
    </div>`;
  const guestPhonesCardHtml = `
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${hName}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${checkinActionsHtml}
      ${guestInstallLinkHtml}
    </div>`;
  const helpFoldHtml = `
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${appsHelpBodyHtml}
      </div>
    </details>`;
  const unlockedToolsHtml = `
    ${deviceCardHtml(true)}
    ${guestIconCardHtml()}
    ${guestPhonesCardHtml}
    ${guestBroadcastCardHtml()}
    ${helpFoldHtml}`;

  const appsMainHtml = `
    ${appsStoryHtml}
    ${loopDiagramHtml}
    ${fdInApp ? unlockedToolsHtml : guestIconCardHtml()}`;

  const appsFootnoteHtml = fdInApp
    ? 'Front Desk is installed. Guests can install your hotel from the direct booking page.'
    : 'Install Front Desk first. Then guests can install your hotel from the direct booking page.';

  el.innerHTML = `
  <style>
    .apps-page { padding:4px 0 28px; }
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
    .apps-broadcast-card { background:var(--white);border:1.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:var(--shadow); }
    .apps-footnote { font-size:11px;color:var(--text-muted);text-align:center;margin-top:14px;line-height:1.5; }
    .apps-tour-replay { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--border);background:var(--white);color:var(--green);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:18px;box-shadow:var(--shadow); }
    .apps-tour-replay:active { background:var(--bg); }
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

    ${isPwaSimulated() ? `<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.45;text-align:center;">📱 <strong>PWA preview</strong> — compact installed layout. Add <code style="font-size:11px;background:#ffedd5;padding:1px 5px;border-radius:4px;">?pwa=0</code> to the URL to exit.</div>` : ''}
    ${appsMainHtml}

    <p class="apps-footnote">${appsFootnoteHtml}</p>

  </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadGuestInstallStats();
}

async function loadGuestInstallStats() {
  const el = document.getElementById('guestInstallStats');
  try {
    const data = await api('GET', '/api/crm/guest-install-stats');
    if (!data.success) throw new Error(data.message || 'Failed');
    guestPushSubscriberCount = data.guestPushSubscribers ?? 0;
    applyGuestBroadcastAudienceUi();
    if (!el) return;
    const t = data.totals || {};
    const installed = data.installedBookings || 0;
    const views = t.views || 0;
    if (!installed && !views) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'block';
    const rate = data.installRatePercent != null ? data.installRatePercent : 0;
    const rows = Object.entries(data.byTouchpoint || {})
      .filter(function(entry) { return (entry[1].views || entry[1].installed); })
      .sort(function(a, b) { return (b[1].installed || 0) - (a[1].installed || 0); })
      .slice(0, 5);
    const rowHtml = rows.length ? rows.map(function(entry) {
      const label = entry[0].replace(/-/g, ' ');
      const s = entry[1];
      return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);">'
        + '<span style="color:var(--text);font-weight:600;text-transform:capitalize;">' + label + '</span>'
        + '<span style="color:var(--text-muted);white-space:nowrap;">' + (s.views || 0) + ' views · ' + (s.installed || 0) + ' installed</span>'
        + '</div>';
    }).join('') : '';

    el.innerHTML = ''
      + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div>'
      + '<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + rate + '%</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div>'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + installed + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div>'
      + '<div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;">'
      + '<div style="font-size:20px;font-weight:800;color:var(--text);">' + views + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div>'
      + '</div>'
      + (rowHtml ? '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>' + rowHtml : '');
  } catch (e) {
    guestPushSubscriberCount = 0;
    applyGuestBroadcastAudienceUi();
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }
  }
}


// ── APPS TOUR (page pointer walkthrough) ──────────────
let _appsTourSteps = [];
let _appsTourIdx = 0;
let _appsTourChainFromSettings = false;

function appsTourCleanupUi() {
  const lb = document.getElementById('appsTourLightbox');
  if (lb) lb.remove();
  const tip = document.getElementById('appsTourTooltip');
  if (tip) tip.remove();
  document.querySelectorAll('[data-apps-tour-highlighted]').forEach((el) => {
    el.style.position = el.dataset.appsTourOrigPosition || '';
    el.style.zIndex = el.dataset.appsTourOrigZIndex || '';
    el.style.isolation = el.dataset.appsTourOrigIsolation || '';
    el.style.boxShadow = el.dataset.appsTourOrigBoxShadow || '';
    el.style.borderRadius = el.dataset.appsTourOrigBorderRadius || '';
    el.removeAttribute('data-apps-tour-highlighted');
    delete el.dataset.appsTourOrigPosition;
    delete el.dataset.appsTourOrigZIndex;
    delete el.dataset.appsTourOrigIsolation;
    delete el.dataset.appsTourOrigBoxShadow;
    delete el.dataset.appsTourOrigBorderRadius;
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

function showGuestAppActivationModal() {
  if (crm.hotelSubscribed || document.getElementById('guestAppActivationOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'guestAppActivationOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100004;background:rgba(0,0,0,0.68);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;max-width:360px;width:100%;max-height:calc(100vh - 48px);overflow-y:auto;box-shadow:0 22px 64px rgba(0,0,0,0.32);animation:tourModalSlideUp 0.3s ease;">
      <div style="padding:26px 22px;text-align:center;">
        <div style="margin-bottom:12px;display:flex;justify-content:center;"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
        <div style="font-size:20px;font-weight:800;color:#1a1a2e;line-height:1.2;margin-bottom:8px;">Guest App + Front Desk is ready</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 18px;">You just saw the loop: guests book direct, save your hotel to their phone, and message you. Front Desk gets the alerts.</p>
        <div style="background:#f0fdf4;border-radius:14px;padding:15px;border:1px solid #bbf7d0;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:9px;"><span style="width:20px;height:20px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span><span style="font-size:13px;color:#166534;line-height:1.4;">Direct booking page accepts reservations</span></div>
            <div style="display:flex;align-items:flex-start;gap:9px;"><span style="width:20px;height:20px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span><span style="font-size:13px;color:#166534;line-height:1.4;">Guests install your hotel from the booking page</span></div>
            <div style="display:flex;align-items:flex-start;gap:9px;"><span style="width:20px;height:20px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span><span style="font-size:13px;color:#166534;line-height:1.4;">Front Desk gets booking and message alerts</span></div>
            <div style="display:flex;align-items:flex-start;gap:9px;"><span style="width:20px;height:20px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span><span style="font-size:13px;color:#166534;line-height:1.4;">No OTA commission. Cancel anytime.</span></div>
          </div>
        </div>
        <button type="button" id="guestAppActivateNowBtn" style="width:100%;padding:15px 18px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:8px;">Activate Guest App + Front Desk — $199/mo</button>
        <button type="button" id="guestAppActivateLaterBtn" style="background:none;border:none;color:#9ca3af;font-size:12px;font-family:inherit;font-weight:700;cursor:pointer;padding:8px 12px;">Not now</button>
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
  const step = _appsTourSteps[_appsTourIdx];
  if (!step) {
    appsTourClose(true);
    return;
  }
  const total = _appsTourSteps.length;
  const isLast = _appsTourIdx >= total - 1;
  const counter = `${_appsTourIdx + 1} / ${total}`;
  const target = document.querySelector(step.target);
  if (!target) {
    _appsTourIdx++;
    appsTourRender();
    return;
  }

  appsTourCleanupUi();
  let lb = document.createElement('div');
  lb.id = 'appsTourLightbox';
  lb.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.52);pointer-events:auto;';
  document.body.appendChild(lb);

  target.dataset.appsTourOrigPosition = target.style.position || '';
  target.dataset.appsTourOrigZIndex = target.style.zIndex || '';
  target.dataset.appsTourOrigIsolation = target.style.isolation || '';
  target.dataset.appsTourOrigBoxShadow = target.style.boxShadow || '';
  target.dataset.appsTourOrigBorderRadius = target.style.borderRadius || '';
  target.style.position = target.style.position || 'relative';
  target.style.zIndex = '100002';
  target.style.isolation = 'isolate';
  target.style.boxShadow = '0 0 0 4px #2E7D5B, 0 14px 38px rgba(0,0,0,0.24)';
  target.style.borderRadius = target.style.borderRadius || '16px';
  target.setAttribute('data-apps-tour-highlighted', '1');

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrowViewport = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  const scrollBlock = (isNarrowViewport && step.mobileScrollBlock) || step.scrollBlock || 'center';
  target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: scrollBlock });

  const placeTooltip = () => {
    const old = document.getElementById('appsTourTooltip');
    if (old) old.remove();
    const rect = target.getBoundingClientRect();
    const maxWidth = Math.min(330, window.innerWidth - 28);
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(14, Math.min(centerX - maxWidth / 2, window.innerWidth - maxWidth - 14));
    const anchorEdge = (isNarrowViewport && step.mobileTooltipAnchor) || step.tooltipAnchor || 'bottom';
    const preferredPosition = (isNarrowViewport && step.mobileTooltipPosition) || step.tooltipPosition || '';
    const anchorTop = rect.top;
    const anchorBottom = anchorEdge === 'top' ? rect.top : rect.bottom;
    const primaryLabel = step.primaryLabel || (isLast ? 'Done' : 'Next');
    const secondaryLabel = step.secondaryLabel || (isLast ? 'Not now' : 'Skip tour');
    const tip = document.createElement('div');
    tip.id = 'appsTourTooltip';
    tip.style.cssText = `position:fixed;z-index:100003;left:${left}px;top:14px;width:${maxWidth}px;max-width:${maxWidth}px;visibility:hidden;`;
    tip.innerHTML = `
      <div style="background:#111827;color:#fff;border-radius:14px;padding:15px 16px;box-shadow:0 18px 46px rgba(0,0,0,0.32);max-height:calc(100vh - 28px);overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.54);font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">${counter}</div>
          <button type="button" id="appsTourSkipBtn" style="border:none;background:transparent;color:rgba(255,255,255,0.62);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 0;">${secondaryLabel}</button>
        </div>
        <div style="font-size:17px;font-weight:800;line-height:1.25;margin-bottom:7px;">${step.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.76);line-height:1.48;margin-bottom:14px;">${step.text}</div>
        <button type="button" id="appsTourNextBtn" style="width:100%;padding:12px 14px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">${primaryLabel}</button>
      </div>`;
    document.body.appendChild(tip);
    const gap = 12;
    const tipHeight = Math.min(tip.offsetHeight || 176, Math.max(120, window.innerHeight - 28));
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
    tip.style.visibility = 'visible';

    document.getElementById('appsTourNextBtn').onclick = () => {
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
    document.getElementById('appsTourSkipBtn').onclick = () => {
      if (isLast) {
        appsTourMarkCompleteFromFinalStep();
        appsTourClose(false);
        return;
      }
      appsTourClose(true);
    };
  };
  setTimeout(placeTooltip, prefersReducedMotion ? 40 : 320);
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
      target: '#tour-apps-headline',
      title: 'This is the whole idea.',
      text: 'Your hotel can live on your guest\'s home screen. That is the value of this page.',
    },
    {
      target: '#tour-apps-first',
      title: 'First: install Front Desk.',
      text: 'Front Desk is this website saved to your property phone. This is how you get booking alerts and guest messages.',
    },
    {
      target: '#tour-apps-then',
      title: 'Then: send guests to your booking page.',
      text: 'When guests are booking, the Install button is at the bottom of the page. They tap it and your hotel is on their phone.',
    },
    {
      target: '#tour-apps-after',
      title: 'After that, the loop is clear.',
      text: 'Guests tap your hotel icon to book or message you. New bookings and messages come back here in Front Desk.',
    },
    {
      target: '#tour-guest-icon-section',
      title: 'This is the one setup item.',
      text: 'Guests see this icon on their home screen. Uploading the picture unlocks after Front Desk is installed.',
      mobileTooltipAnchor: 'top',
      mobileTooltipPosition: 'below',
    },
    {
      target: '#tour-apps-loop',
      title: hotelIsLive ? 'This loop is on.' : 'Turn this on for your property.',
      text: hotelIsLive
        ? 'Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.'
        : 'Activate once. Guests can book direct, save your hotel to their home screen, and Front Desk gets the alerts.',
      primaryLabel: hotelIsLive ? 'Done' : 'Continue to activation',
      secondaryLabel: hotelIsLive ? 'Close' : 'Not now',
      showActivationOnComplete: !hotelIsLive,
    },
  ];

  _appsTourIdx = 0;
  appsTourRender();
}



const _appsExports = {
  appsCloseLightbox,
  appsCloudinaryFull,
  appsCloudinaryImg,
  appsLbNav,
  appsLbRender,
  appsOpenLightbox,
  appsPhoneImgStyle,
  appsQuestionRow,
  appsTourClose,
  appsTourNav,
  appsTourRender,
  appsVideoBadgeHtml,
  detectAppPlatform,
  ensureAppsViewRendered,
  loadGuestInstallStats,
  renderAppsView,
  startAppsTour,
};

export function install() {
  exposeToWindow(_appsExports);
}

export default _appsExports;
