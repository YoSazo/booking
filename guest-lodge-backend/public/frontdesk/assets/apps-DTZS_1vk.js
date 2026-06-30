import{c,e as ne}from"./settings-CpHdTdna.js";const f={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},ae="32px";function B(t,e){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function I(t){return`border-radius:${ae};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function N(t){const e=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*e,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let H=[],k=0;function re(t,e){w(!1),H=t,k=e||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?S(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?S(-1):i.key==="Escape"&&D()},document.addEventListener("keydown",o._keyHandler);let s=0;o.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const p=i.changedTouches[0].clientX-s;Math.abs(p)>50&&S(p<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",E()}function D(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function S(t){const e=H.length;e<=1||(k=(k+t+e)%e,E())}function E(){const t=document.getElementById("appsLightbox");if(!t)return;const e=H[k],o=H.length,s=e.type!=="video",i=o>1?`${k+1} / ${o}`:"",p=s?`<img src="${N(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${I()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${I()}"
          ${e.poster?`poster="${B(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,a=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",d=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",n=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(u,x)=>`<div onclick="appsOpenLightbox(_appsLbItems,${x})" style="width:7px;height:7px;border-radius:50%;background:${x===k?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${p}
      ${a}${d}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${n}
    </div>`}function G(t,e){const o=t||"Video";return`<span class="${"apps-media-badge"+(e==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function z(t,e,o,s,i){const p=i?G("Video"):"",a=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${p}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function pe(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function L(t){const e=document.getElementById("appsView");if(!e)return;const o=(c.activeHotelId||"")+"|"+(c.activeHotelAppIcon||"")+"|"+(c.activeHotelDomain||"");t||e.dataset.appsKey!==o||!e.querySelector(".apps-page")?(Y(),e.dataset.appsKey=o):M()}function Y(){const t=document.getElementById("appsView");if(!t)return;const e=c.activeHotelName||"Your Hotel",o=c.activeHotelAppIcon||"",s=e.trim().charAt(0).toUpperCase()||"🏨",i=c.activeHotelDomain||"",p=i?"https://"+i:"#",a=i?"https://"+i+"/install":"#";function d(_){return JSON.stringify(_).replace(/"/g,"&quot;")}const n=B(f.guestHome,520),u=[{type:"image",src:f.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],x=[{type:"image",src:f.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:f.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:f.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],l=[{type:"video",src:f.guestInstallVideo,poster:f.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],g=[{type:"image",src:f.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:f.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:f.guestMessageNotifVideo,poster:f.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],r=isStandaloneApp()||c.frontdeskInstalled,F=typeof Notification<"u"&&Notification.permission==="granted",h=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let y;r&&F?y=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:r?y=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:y=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const v=r?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${h}</button>`,T=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',C="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",R=o?C+"background:#fff;border:1px solid var(--border);padding:0;":C,V=o?`<img src="${o}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,W=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${R}">
        ${V}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${e}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${r?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change picture":"Upload picture"}</button>
        ${r?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,U=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${a!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${a==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,Q=a!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${a.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',X=`
    <div class="apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${o?`<img src="${o}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${s}</span>`}</div>
        <div class="apps-loop-name">${e}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,K=`
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${v}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${T}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,J=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${n}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${d(l)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${z("What guests see on their phone","",d(x),0,!1)}
          ${z("How guests add your hotel","",d(l),0,!0)}
          ${z("Guest texts you, you text back","",d(g),0,!0)}
          ${z("Your app and theirs — side by side","",d(u),0,!1)}
        </div>
        ${p!=="#"?`<button onclick="window.open('${p}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,Z=_=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${r?"Front Desk — installed":"Install Front Desk"}</div>
      ${y}
    </div>`,q=_=>`
    <div class="apps-step-card"${_?' id="tour-guest-icon-section"':""}>
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${W}
    </div>`,ee=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${e}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${U}
      ${Q}
    </div>`,te=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${J}
      </div>
    </details>`,oe=`
    ${Z()}
    ${q(!0)}
    ${ee}
    ${guestBroadcastCardHtml()}
    ${te}`,ie=`
    ${K}
    ${X}
    ${r?oe:q(!1)}`,se=r?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";t.innerHTML=`
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

    ${isPwaSimulated()?'<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.45;text-align:center;">📱 <strong>PWA preview</strong> — compact installed layout. Add <code style="font-size:11px;background:#ffedd5;padding:1px 5px;border-radius:4px;">?pwa=0</code> to the URL to exit.</div>':""}
    ${ie}

    <p class="apps-footnote">${se}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),M()}async function M(){const t=document.getElementById("guestInstallStats");try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");if(guestPushSubscriberCount=e.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const o=e.totals||{},s=e.installedBookings||0,i=o.views||0;if(!s&&!i){t.style.display="none",t.innerHTML="";return}t.style.display="block";const p=e.installRatePercent!=null?e.installRatePercent:0,a=Object.entries(e.byTouchpoint||{}).filter(function(n){return n[1].views||n[1].installed}).sort(function(n,u){return(u[1].installed||0)-(n[1].installed||0)}).slice(0,5),d=a.length?a.map(function(n){const u=n[0].replace(/-/g," "),x=n[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+u+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(x.views||0)+" views · "+(x.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+p+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(d?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+d:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}let j=[],m=0,$=!1;function w(t){const e=document.getElementById("appsTourLightbox");e&&(e._swipeStart&&e.removeEventListener("touchstart",e._swipeStart),e._swipeEnd&&e.removeEventListener("touchend",e._swipeEnd),e.remove()),document.body.style.overflow="";const o=$;$=!1;try{const s=typeof L=="function"?L:window.ensureAppsViewRendered;typeof s=="function"&&s(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||c.settingsTourActive)){const i=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof i=="function"){i();return}}}function P(t){const e=m+t;e<0||e>=j.length||(m=e,A())}function O(){if(localStorage.setItem("appsTourDone","1"),$||localStorage.getItem("settingsTourStep")==="handoff"||c.settingsTourActive){c.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const e=typeof finishTourHydration=="function"?finishTourHydration:window.finishTourHydration;typeof e=="function"&&e()}}function de(){O();const t=typeof goLive=="function"?goLive:window.goLive;if(w(!1),typeof t=="function"){t();return}const e=typeof toast=="function"?toast:window.toast;typeof e=="function"&&e("Open Go live to activate your booking page.","error")}function A(){const t=document.getElementById("appsTourLightbox");if(!t)return;const e=j[m],o=j.length,s=m>=o-1,i=`${m+1} / ${o}`,p=e.primaryLabel||(s?$?"Next — you're almost done":"Got it — show me":"Next →"),a=e.skipLabel||"Skip",d=e.type==="video"?G("1 min","light"):"",n=e.bigTitle?"24px":"20px",u=e.bigTitle?"15px":"14px",x=Array.from({length:o},(g,r)=>`<div style="width:7px;height:7px;border-radius:50%;background:${r===m?"#fff":"rgba(255,255,255,0.35)"};"></div>`).join("");let l="";e.type==="cta"?l=`<div style="width:100%;max-width:360px;padding:0 8px;box-sizing:border-box;">${e.ctaHtml}</div>`:e.type==="video"?l=`<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${I()}"
      poster="${e.poster||""}">
      <source src="${e.src}" type="video/mp4">
    </video>`:l=`<img src="${e.src}" alt="${e.alt||""}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${I()}">`,t.innerHTML=`
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${i}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">${a}</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${l}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:${n};font-weight:800;color:#fff;line-height:1.22;margin-bottom:8px;display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">${e.title}${d}</div>
      ${e.caption?`<div style="font-size:${u};color:rgba(255,255,255,0.74);line-height:1.48;margin-bottom:14px;">${e.caption}</div>`:""}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${p}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${x}</div>
    </div>`,document.getElementById("appsTourNextBtn").onclick=()=>{if(s&&e.activateOnNext){de();return}if(s){const g=$;if(w(!0),!g){const r=document.getElementById("appsView");r&&r.scrollIntoView({behavior:"smooth",block:"start"})}}else m++,A()},document.getElementById("appsTourSkipBtn").onclick=()=>{if(s&&e.activateOnNext){O(),w(!1);const g=document.getElementById("appsView");g&&g.scrollIntoView({behavior:"smooth",block:"start"});return}w(!0)}}function le(t){const e=t&&t.replay,o=t&&t.chainFromSettingsTour;if($=!!o,!e&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox"))return;const s=c.activeHotelName||"Your Hotel",i=s.length>13?s.slice(0,13)+"…":s,p=s.trim().charAt(0).toUpperCase(),a=c.activeHotelAppIcon||"",d=a?`<div style="width:52px;height:52px;border-radius:14px;background:#fff;padding:8px;box-sizing:border-box;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="${a}" alt="${s}" style="width:100%;height:100%;object-fit:contain;"></div>`:`<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p}</div>`,n=!!c.hotelSubscribed,u=`
    <div style="width:72px;height:72px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,0.22);">
      <img src="/marketellogo.svg" alt="" style="width:46px;height:46px;object-fit:contain;">
    </div>`,x=a?`<div style="width:72px;height:72px;border-radius:18px;background:#fff;padding:10px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,0.22);"><img src="${a}" alt="${s}" style="width:100%;height:100%;object-fit:contain;"></div>`:`<div style="width:72px;height:72px;border-radius:18px;background:#2E7D5B;color:#fff;font-size:31px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,0.22);">${p}</div>`,l="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:18px;padding:18px;box-sizing:border-box;",g="font-size:11px;font-weight:800;color:#4CAF7D;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;",r="font-size:24px;font-weight:800;color:#fff;line-height:1.12;margin:0;",F="font-size:14px;color:rgba(255,255,255,0.72);line-height:1.5;margin:10px 0 0;",b=v=>`
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <span style="width:20px;height:20px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span>
      <span style="font-size:14px;color:rgba(255,255,255,0.86);line-height:1.4;">${v}</span>
    </div>`;j=[{type:"cta",bigTitle:!0,title:"One simple loop",caption:`Your phone gets Front Desk. Guest phones get <strong>${i}</strong>. Bookings and messages come back here.`,ctaHtml:`
        <div style="${l}text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:18px;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
              ${u}
              <div style="font-size:13px;font-weight:800;color:#fff;">Front Desk</div>
            </div>
            <div style="font-size:28px;color:#4CAF7D;font-weight:800;">↔</div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
              ${x}
              <div style="font-size:13px;font-weight:800;color:#fff;">${i}</div>
            </div>
          </div>
          <p style="${r}">You are on their phone. They book direct.</p>
        </div>`},{type:"cta",bigTitle:!0,title:"First, install Front Desk",caption:"Front Desk is this website saved to your property phone. It opens like an app and receives the alerts.",ctaHtml:`
        <div style="${l}">
          <div style="${g}">Owner phone</div>
          <div style="display:flex;align-items:center;gap:16px;">
            ${u}
            <div style="min-width:0;">
              <p style="${r}">This phone becomes your desk.</p>
              <p style="${F}">Bookings, guest messages, QR tools, and app controls live here.</p>
            </div>
          </div>
        </div>`},{type:"cta",bigTitle:!0,title:`${i} is the guest app`,caption:"This is what guests save to their home screen. You can change the picture after Front Desk is installed.",ctaHtml:`
        <div style="${l}">
          <div style="${g}">Guest phone</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${d}
            <div>
              <div style="font-size:19px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:6px;">Your icon, on their home screen.</div>
              <p style="font-size:13px;color:rgba(255,255,255,0.68);margin:0;line-height:1.45;">The upload button is visible now. It unlocks after Front Desk is installed.</p>
            </div>
          </div>
        </div>`},{type:"cta",bigTitle:!0,title:"Guests install from your booking page",caption:"They book direct. At the bottom of the page, they see Install. One tap puts your hotel on their home screen.",ctaHtml:`
        <div style="${l}padding:14px;">
          <div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 12px 28px rgba(0,0,0,0.22);">
            <div style="font-size:12px;font-weight:800;color:#1a1a2e;margin-bottom:10px;">${i} booking page</div>
            <div style="height:124px;border-radius:12px;background:linear-gradient(180deg,#eef6f1,#ffffff);border:1px solid #d7eadf;padding:12px;box-sizing:border-box;">
              <div style="width:80%;height:10px;border-radius:999px;background:#2E7D5B;margin-bottom:10px;"></div>
              <div style="width:58%;height:8px;border-radius:999px;background:#cfe6da;margin-bottom:18px;"></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="height:42px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;"></div>
                <div style="height:42px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;"></div>
              </div>
            </div>
            <div style="margin-top:10px;border-radius:12px;background:#2E7D5B;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;">
              ${d}
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:800;line-height:1.2;">Install ${i}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.78);line-height:1.35;">Add this hotel to your home screen</div>
              </div>
            </div>
          </div>
        </div>`},{type:"cta",bigTitle:!0,title:"Then everything comes back here",caption:"Guests tap your hotel icon to book or message. Front Desk tells you when something happens.",ctaHtml:`
        <div style="${l}">
          <div style="${g}">The payoff</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${b("Guest books direct from your hotel app.")}
            ${b("Front Desk gets the booking alert.")}
            ${b("Guest messages you, and you reply from here.")}
          </div>
        </div>`},{type:"cta",bigTitle:!0,title:n?"Guest App + Front Desk is on":"Turn this on for your property",caption:n?"Your booking page is active. Guests can book direct, save your hotel, and message you.":"Activate once. Your booking page accepts reservations, guests can save your hotel, and Front Desk gets the alerts.",primaryLabel:n?"Open Guest App":"Activate Guest App + Front Desk — $199/mo",skipLabel:n?"Close":"Not now",activateOnNext:!n,ctaHtml:`
        <div style="${l}">
          <div style="${g}">${n?"Live now":"Activation"}</div>
          <p style="${r}">${n?"Guests can use the loop now.":"This is the full loop, switched on."}</p>
          <div style="display:flex;flex-direction:column;gap:11px;margin-top:18px;">
            ${b("Direct booking page accepts reservations.")}
            ${b("Guests can save your hotel to their home screen.")}
            ${b("Front Desk gets booking and message alerts.")}
            ${n?"":b("No OTA commission. Cancel anytime.")}
          </div>
        </div>`}],m=0,D(),w(!1);const h=document.createElement("div");h.id="appsTourLightbox",h.style.cssText=["position:fixed;inset:0;z-index:102001;background:#000;","display:flex;flex-direction:column;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join("");let y=0;h._swipeStart=v=>{y=v.changedTouches[0].clientX},h._swipeEnd=v=>{const T=v.changedTouches[0].clientX-y;Math.abs(T)>50&&P(T<0?1:-1)},h.addEventListener("touchstart",h._swipeStart,{passive:!0}),h.addEventListener("touchend",h._swipeEnd,{passive:!0}),document.body.appendChild(h),document.body.style.overflow="hidden",A()}const ce={appsCloseLightbox:D,appsCloudinaryFull:N,appsCloudinaryImg:B,appsLbNav:S,appsLbRender:E,appsOpenLightbox:re,appsPhoneImgStyle:I,appsQuestionRow:z,appsTourClose:w,appsTourNav:P,appsTourRender:A,appsVideoBadgeHtml:G,detectAppPlatform:pe,ensureAppsViewRendered:L,loadGuestInstallStats:M,renderAppsView:Y,startAppsTour:le};function he(){ne(ce)}export{ce as default,he as install};
