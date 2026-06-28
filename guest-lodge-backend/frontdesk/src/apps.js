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
  const fdInstallCopy = fdOnNarrowScreen
    ? 'Install Front Desk on this phone first. That unlocks the guest install tools and makes sure new booking/message alerts go to the property device.'
    : 'Open this dashboard on the phone your staff uses, then install Front Desk there. Guest install tools stay locked until a property phone has Front Desk installed.';

  const frontdeskInstallItems = [
    { type: 'video', src: APPS_SHOWCASE.frontdeskInstallVideo, poster: APPS_SHOWCASE.frontdeskMessages, alt: 'How to install Front Desk', title: 'Install Front Desk on this device',
      caption: 'Use your browser install option. No App Store. Takes about 3 seconds.' },
    { type: 'image', src: APPS_SHOWCASE.frontdeskMessages, alt: 'Reply to guest', title: 'You reply from Front Desk',
      caption: 'Messages from guests show up in <strong>Bookings</strong>. Reply there — guests get it on their phone.' },
  ];

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

  // Icon preview matches the loop tile: uploaded logos use the whole square,
  // while the generated letter icon is full-bleed green edge-to-edge.
  const iconBoxBase = 'width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;';
  const iconBoxStyle = hotelAppIcon
    ? iconBoxBase + 'background:#fff;border:1px solid var(--border);padding:0;'
    : iconBoxBase;
  const iconInnerHtml = hotelAppIcon
    ? `<img src="${hotelAppIcon}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${hotelInitial}</span>`;
  const logoBlockHtml = `
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${iconBoxStyle}">
        ${iconInnerHtml}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${hName}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="document.getElementById('appsAppIconInput').click()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${hotelAppIcon ? 'Change icon' : 'Upload icon'}</button>
      </div>
    </div>`;

  const checkinActionsHtml = `
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${guestInstallUrl !== '#' ? `
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Open your direct booking page at the guest install prompt. Guests use that page to save your hotel app after Front Desk is installed on the property phone.</p>` : ''}
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
    <div class="apps-loop">
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

  const appsHelpBodyHtml = `
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${guestInstallPoster}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${enc(guestInstallItems)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <button type="button" class="apps-tour-replay" onclick="startAppsTour({replay:true})" style="margin-bottom:14px;">▶ Watch full walkthrough</button>
        <div class="apps-q-list">
          ${appsQuestionRow('What guests see on their phone', '', enc(guestItems), 0, false)}
          ${appsQuestionRow('How guests add your hotel', '', enc(guestInstallItems), 0, true)}
          ${appsQuestionRow('Guest texts you, you text back', '', enc(messageItems), 0, true)}
          ${appsQuestionRow('Your app and theirs — side by side', '', enc(homeScreenItems), 0, false)}
        </div>
        ${bookingUrl !== '#' ? `<button onclick="window.open('${bookingUrl}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>` : ''}`;

  // 1:1 preview of what guests see on the booking page: room card, then install banner.
  const previewRoom = (crm.editRooms || []).find(r => r && (r.name || (r.images && r.images.length))) || {};
  const previewImages = ((previewRoom.images || []).filter(img => img && img.url));
  const previewRoomImage = previewImages[0]?.url || 'https://suitestay.clickinns.com/kingbedsuitestay.webp';
  const previewRoomName = previewRoom.name || 'King Suite';
  const previewPhotoDots = previewImages.length > 1 ? `
    <div style="position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:5px;padding:5px 7px;border-radius:999px;background:rgba(0,0,0,0.28);">
      ${previewImages.slice(0, 5).map((_, idx) => `<span style="width:${idx === 0 ? '20px' : '7px'};height:7px;border-radius:999px;background:${idx === 0 ? '#fff' : 'rgba(255,255,255,0.6)'};display:block;"></span>`).join('')}
    </div>` : '';
  const iconPreviewHtml = hotelAppIcon
    ? `<img src="${hotelAppIcon}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${hotelInitial}</div>`;

  const guestInstallPreviewHtml = `
    <div class="apps-step-card apps-guest-phone-card">
      <div style="padding:16px 18px 14px;">
        <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">What guests see</div>
        <p style="font-size:13px;color:var(--text-muted);margin:0;line-height:1.55;">This is a static example of the install prompt guests see on your direct booking page. The button is muted here so owners know this is only a preview.</p>
      </div>
      <div style="background:#f8faf9;border-top:1px solid var(--border);padding:14px 18px 18px;">
        <div style="pointer-events:none;user-select:none;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;">
            <span style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#e8f5ee;border:1px solid #cfe6da;color:#1a5c3f;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:6px 10px;">Static guest preview</span>
          </div>
          <div style="background:#fff;border:1px solid rgba(226,232,240,0.9);border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="height:118px;position:relative;background:#111827;overflow:hidden;">
              <img src="${esc(previewRoomImage)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;opacity:.72;" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,24,39,0.08),rgba(17,24,39,0.42));"></div>
              ${previewImages.length > 1 ? `<div style="position:absolute;top:10px;right:10px;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,0.58);color:#fff;font-size:11px;font-weight:700;">${previewImages.length} photos</div>` : ''}
              ${previewPhotoDots}
            </div>
            <div style="padding:14px 16px 12px;">
              <div style="font-size:17px;font-weight:800;color:#1f2937;line-height:1.2;margin-bottom:4px;">${esc(previewRoomName)}</div>
              <div style="font-size:12px;color:#6b7280;line-height:1.35;">Room details appear above the guest install prompt.</div>
            </div>
          </div>
          <!-- 1:1 replica of InstallAppBanner, shown as a static preview. -->
          <div style="background:#fff;border:2px solid #cfe6da;border-radius:16px;padding:14px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.06);margin-top:12px;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${iconPreviewHtml}
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:800;color:#1a1a2e;line-height:1.3;">Add ${hName} to your home screen</div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.4;">Guests see this on your booking page. It stays muted until Front Desk is installed on the property phone.</div>
              </div>
            </div>
            <div aria-disabled="true" style="width:100%;margin-top:14px;padding:12px 16px;border-radius:10px;border:none;background:#c5d5cc;color:#fff;font-size:14px;font-weight:800;text-align:center;box-sizing:border-box;opacity:.72;cursor:not-allowed;">Install</div>
            <div style="font-size:11px;color:#6b7280;line-height:1.45;text-align:center;margin-top:8px;">Preview only — unlock guest installs by installing Front Desk on your phone first.</div>
          </div>
        </div>
        ${guestInstallUrl !== '#' ? `
        <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-top:14px;">Go to direct booking page</button>
        <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.55;">Open the real guest page to see where guests will install your hotel app. Install Front Desk on your property phone first so guest installs, messages, QR tools, and booking alerts are ready before guests use it.</p>` : `
        <p style="font-size:12px;color:var(--text-muted);margin:14px 0 0;line-height:1.55;">Your direct booking domain is still setting up. Once it is ready, you can open the guest page from here.</p>`}
      </div>
    </div>`;

  const deviceCardHtml = (tourId) => `
    <div class="apps-step-card"${tourId ? ' id="tour-fd-install-card"' : ''}>
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${fdInApp ? 'Front Desk — installed' : 'Install Front Desk'}</div>
      ${fdCtaHtml}
    </div>`;
  const guestIconCardHtml = (tourId) => `
    <div class="apps-step-card"${tourId ? ' id="tour-guest-icon-section"' : ''}>
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
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">How it works · walkthrough · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${appsHelpBodyHtml}
      </div>
    </details>`;
  const unlockedToolsHtml = `
    ${deviceCardHtml(true)}
    ${guestIconCardHtml(true)}
    ${guestPhonesCardHtml}
    ${guestBroadcastCardHtml()}
    ${helpFoldHtml}`;
  const lockedPreviewHtml = `
    ${deviceCardHtml(false)}
    ${guestIconCardHtml(false)}
    ${guestPhonesCardHtml}
    ${guestBroadcastCardHtml()}
    ${helpFoldHtml}`;
  const lockedToolsHtml = `
    <div class="apps-locked-tools" id="tour-fd-install-card">
      <div class="apps-locked-tools__content" aria-hidden="true">
        ${lockedPreviewHtml}
      </div>
      <div class="apps-locked-tools__overlay">
        <div class="apps-locked-tools__panel">
          <div class="apps-locked-tools__icon"><i data-lucide="lock-keyhole" style="width:20px;height:20px;"></i></div>
          <div class="apps-locked-tools__eyebrow">Phones tools locked</div>
          <div class="apps-locked-tools__title">Install Front Desk to unlock this tab</div>
          <p>${fdInstallCopy} Until then, guest install buttons are muted in previews so setup mode is not confused with a live guest install.</p>
          <button id="tour-fd-install-btn" onclick="handleInstallFrontdesk()">${fdInstallLabel}</button>
          <button type="button" class="apps-video-teaser apps-locked-tools__video" onclick="appsOpenLightbox(${enc(frontdeskInstallItems)},0)"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how (1 min)</span></button>
        </div>
      </div>
    </div>`;

  const appsMainHtml = `
    ${loopDiagramHtml}
    ${guestInstallPreviewHtml}
    ${fdInApp ? unlockedToolsHtml : lockedToolsHtml}`;

  const appsFootnoteHtml = fdInApp
    ? 'Booking alerts live on the <strong>Bookings</strong> tab · installed from your browser'
    : 'Install Front Desk to unlock guest-app setup, QR tools, messages, and booking alerts.';

  el.innerHTML = `
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-headline { font-size:20px;font-weight:800;color:var(--text);line-height:1.3;margin:0 0 8px; }
    .apps-intro { font-size:14px;color:var(--text-muted);line-height:1.55;margin:0 0 22px; }
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
    .apps-guest-phone-card { padding:0;overflow:hidden;position:relative; }
    .apps-step-title { font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px;line-height:1.35; }
    .apps-locked-tools { position:relative;min-height:640px;border-radius:18px;overflow:hidden;margin-bottom:14px;background:#f8faf9;border:1.5px solid var(--border);box-shadow:var(--shadow); }
    .apps-locked-tools__content { filter:blur(5px);opacity:0.46;pointer-events:none;user-select:none;transform:scale(1.01);transform-origin:top center; }
    .apps-locked-tools__content .apps-step-card,
    .apps-locked-tools__content .apps-broadcast-card,
    .apps-locked-tools__content .apps-fold { box-shadow:none;margin-left:10px;margin-right:10px; }
    .apps-locked-tools__overlay { position:absolute;inset:0;z-index:3;display:flex;align-items:flex-start;justify-content:center;padding:28px 18px;background:linear-gradient(180deg,rgba(255,255,255,0.96) 0%,rgba(255,255,255,0.86) 42%,rgba(255,255,255,0.68) 100%);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px); }
    .apps-locked-tools__panel { width:min(340px,100%);background:#fff;border:1.5px solid #d8e4dc;border-radius:18px;padding:20px 18px;text-align:center;box-shadow:0 18px 48px rgba(26,43,34,0.18); }
    .apps-locked-tools__icon { width:44px;height:44px;border-radius:50%;background:#1a5c3f;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:0 8px 22px rgba(46,125,91,0.28); }
    .apps-locked-tools__eyebrow { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:6px; }
    .apps-locked-tools__title { font-size:18px;font-weight:800;color:var(--text);line-height:1.25;margin-bottom:8px; }
    .apps-locked-tools__panel p { font-size:13px;color:var(--text-muted);line-height:1.52;margin:0 0 16px; }
    .apps-locked-tools__panel > button#tour-fd-install-btn { width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:10px;box-shadow:0 8px 22px rgba(46,125,91,0.24); }
    .apps-locked-tools__video { margin:0 auto; }
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
      .apps-guest-phone-card {
        width:min(390px, 100%);
        margin:0 auto 18px;
        border:8px solid #15221b;
        border-radius:34px;
        box-shadow:0 18px 50px rgba(21,34,27,0.24), var(--shadow-lg);
      }
      .apps-guest-phone-card::before {
        content:'';
        position:absolute;
        top:9px;
        left:50%;
        transform:translateX(-50%);
        width:72px;
        height:6px;
        border-radius:999px;
        background:#23352b;
        z-index:2;
      }
      .apps-guest-phone-card > div:first-child {
        padding-top:28px !important;
      }
    }
  </style>

  <div class="apps-page">

    ${isPwaSimulated() ? `<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.45;text-align:center;">📱 <strong>PWA preview</strong> — compact installed layout. Add <code style="font-size:11px;background:#ffedd5;padding:1px 5px;border-radius:4px;">?pwa=0</code> to the URL to exit.</div>` : ''}
    <h2 class="apps-headline">Phones</h2>
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


// ── APPS TOUR (fullscreen lightbox) ───────────────────
let _appsTourSteps = [];
let _appsTourIdx = 0;
let _appsTourChainFromSettings = false;

function appsTourClose(markDone) {
  const lb = document.getElementById('appsTourLightbox');
  if (lb) {
    if (lb._swipeStart) lb.removeEventListener('touchstart', lb._swipeStart);
    if (lb._swipeEnd) lb.removeEventListener('touchend', lb._swipeEnd);
    lb.remove();
  }
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

function appsTourRender() {
  const lb = document.getElementById('appsTourLightbox');
  if (!lb) return;
  const step = _appsTourSteps[_appsTourIdx];
  const total = _appsTourSteps.length;
  const isLast = _appsTourIdx >= total - 1;
  const counter = `${_appsTourIdx + 1} / ${total}`;
  const btnLabel = isLast ? (_appsTourChainFromSettings ? 'Next — you\'re almost done' : 'Got it — show me') : 'Next →';
  const titleBadge = step.type === 'video' ? appsVideoBadgeHtml('1 min', 'light') : '';

  const dots = Array.from({ length: total }, (_, i) =>
    `<div style="width:7px;height:7px;border-radius:50%;background:${i === _appsTourIdx ? '#fff' : 'rgba(255,255,255,0.35)'};"></div>`
  ).join('');

  let mediaHtml = '';
  if (step.type === 'cta') {
    mediaHtml = `<div style="width:100%;max-width:320px;padding:0 8px;box-sizing:border-box;">${step.ctaHtml}</div>`;
  } else if (step.type === 'video') {
    mediaHtml = `<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${appsPhoneImgStyle()}"
      poster="${step.poster || ''}">
      <source src="${step.src}" type="video/mp4">
    </video>`;
  } else {
    mediaHtml = `<img src="${step.src}" alt="${step.alt || ''}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${appsPhoneImgStyle()}">`;
  }

  lb.innerHTML = `
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${counter}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">Skip</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${mediaHtml}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">${step.title}${titleBadge}</div>
      ${step.caption ? `<div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:14px;">${step.caption}</div>` : ''}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${btnLabel}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${dots}</div>
    </div>`;

  document.getElementById('appsTourNextBtn').onclick = () => {
    if (isLast) {
      const chain = _appsTourChainFromSettings;
      appsTourClose(true);
      if (!chain) {
        const appsEl = document.getElementById('appsView');
        if (appsEl) appsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      _appsTourIdx++;
      appsTourRender();
    }
  };
  document.getElementById('appsTourSkipBtn').onclick = () => appsTourClose(true);
}

function startAppsTour(opts) {
  const replay = opts && opts.replay;
  const chainFromSettings = opts && opts.chainFromSettingsTour;
  _appsTourChainFromSettings = !!chainFromSettings;
  if (!replay && !chainFromSettings && localStorage.getItem('appsTourDone')) return;
  if (document.getElementById('appsTourLightbox')) return;

  const hName = crm.activeHotelName || 'Your Hotel';
  const shortName = hName.length > 13 ? hName.slice(0, 13) + '…' : hName;
  const initial = hName.trim().charAt(0).toUpperCase();
  const iconUrl = crm.activeHotelAppIcon || '';
  const iconEl = iconUrl
    ? `<div style="width:52px;height:52px;border-radius:14px;background:#fff;padding:8px;box-sizing:border-box;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="${iconUrl}" alt="${hName}" style="width:100%;height:100%;object-fit:contain;"></div>`
    : `<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initial}</div>`;

  _appsTourSteps = [
    {
      type: 'video',
      src: APPS_SHOWCASE.guestInstallVideo,
      poster: appsCloudinaryImg(APPS_SHOWCASE.guestHome, 400),
      title: 'Guests save your hotel to their phone',
      caption: `They tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Tap <strong>Change your icon</strong> on the Phones tab so they see <strong>${shortName}</strong>.`,
    },
    {
      type: 'image',
      src: appsCloudinaryImg(APPS_SHOWCASE.guestHome, 520),
      alt: 'Guest home screen',
      title: 'What guests see after they install',
      caption: 'Their stay info, direct booking, and a way to message you — all from one icon on their phone.',
    },
    {
      type: 'cta',
      title: 'On the Phones tab',
      caption: '',
      ctaHtml: `
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">AT CHECK-IN</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">📲 Show QR at check-in</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Full-screen QR — guests scan to save <strong>${shortName}</strong>.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">NOTIFY GUESTS</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">📣 Notify all guests at once</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Push a sale, event, or install reminder to everyone on your guest app.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:8px;">CHANGE YOUR ICON</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${iconEl}
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Your logo on their home screen</div>
              <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.45;">Upload at the top of the <strong>Phones</strong> tab. Tap <strong>Help</strong> for the full walkthrough.</p>
            </div>
          </div>
        </div>`,
    },
  ];

  _appsTourIdx = 0;
  appsCloseLightbox();
  appsTourClose(false);

  const lb = document.createElement('div');
  lb.id = 'appsTourLightbox';
  lb.style.cssText = [
    'position:fixed;inset:0;z-index:102001;background:#000;',
    'display:flex;flex-direction:column;',
    'overscroll-behavior:contain;touch-action:pan-y;',
    'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);',
  ].join('');
  let touchStartX = 0;
  lb._swipeStart = (e) => { touchStartX = e.changedTouches[0].clientX; };
  lb._swipeEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) appsTourNav(dx < 0 ? 1 : -1);
  };
  lb.addEventListener('touchstart', lb._swipeStart, { passive: true });
  lb.addEventListener('touchend', lb._swipeEnd, { passive: true });
  document.body.appendChild(lb);
  document.body.style.overflow = 'hidden';
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
