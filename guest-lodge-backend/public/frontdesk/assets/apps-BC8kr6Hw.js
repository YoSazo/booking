import{c as d,e as rt}from"./settings-dqv3ZVJh.js";const l={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},pt="32px";function P(t,o){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(o||400)+"/")}function O(t){return`border-radius:${pt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function X(t){const o=Math.min(window.devicePixelRatio||1,2),e=Math.round(Math.min(window.screen.width*o,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${e}/`)}let M=[],z=0;function dt(t,o){m(!1),M=t,z=o||0;let e=document.getElementById("appsLightbox");if(!e){e=document.createElement("div"),e.id="appsLightbox",e.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(e),document.body.style.overflow="hidden",e._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?H(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?H(-1):i.key==="Escape"&&N()},document.addEventListener("keydown",e._keyHandler);let s=0;e.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),e.addEventListener("touchend",i=>{const n=i.changedTouches[0].clientX-s;Math.abs(n)>50&&H(n<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",R()}function N(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function H(t){const o=M.length;o<=1||(z=(z+t+o)%o,R())}function R(){const t=document.getElementById("appsLightbox");if(!t)return;const o=M[z],e=M.length,s=o.type!=="video",i=e>1?`${z+1} / ${e}`:"",n=s?`<img src="${X(o.src)}" alt="${o.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${O()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${O()}"
          ${o.poster?`poster="${P(o.poster,400)}"`:""}>
          <source src="${o.src}" type="video/mp4">
       </video>`,a=e>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",r=e>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",p=e>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:e},(b,c)=>`<div onclick="appsOpenLightbox(_appsLbItems,${c})" style="width:7px;height:7px;border-radius:50%;background:${c===z?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${n}
      ${a}${r}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${o.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${o.title}</div>`:""}
      ${o.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${o.caption}</div>`:""}
      ${p}
    </div>`}function Z(t,o){const e=t||"Video";return`<span class="${"apps-media-badge"+(o==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${e}</span></span>`}function _(t,o,e,s,i){const n=i?Z("Video"):"",a=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${e},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${n}</div>
      ${o?`<div class="apps-q-hint">${o}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function lt(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function C(t){const o=document.getElementById("appsView");if(!o)return;const e=(d.activeHotelId||"")+"|"+(d.activeHotelAppIcon||"")+"|"+(d.activeHotelDomain||"");t||o.dataset.appsKey!==e||!o.querySelector(".apps-page")?(K(),o.dataset.appsKey=e):Y()}function K(){const t=document.getElementById("appsView");if(!t)return;const o=d.activeHotelName||"Your Hotel",e=d.activeHotelAppIcon||"",s=o.trim().charAt(0).toUpperCase()||"🏨",i=d.activeHotelDomain||"",n=i?"https://"+i:"#",a=i?"https://"+i+"/install":"#";function r(Q){return JSON.stringify(Q).replace(/"/g,"&quot;")}const p=P(l.guestHome,520),b=[{type:"image",src:l.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${o}</strong> — they tap it to book you or text you. No app store.`}],c=[{type:"image",src:l.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:l.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:l.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],h=[{type:"video",src:l.guestInstallVideo,poster:l.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],w=[{type:"image",src:l.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:l.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:l.guestMessageNotifVideo,poster:l.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],g=isStandaloneApp()||d.frontdeskInstalled,j=typeof Notification<"u"&&Notification.permission==="granted",I=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let y;g&&j?y=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:g?y=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:y=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const A=g?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${I}</button>`,D=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',B="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",u=e?B+"background:#fff;border:1px solid var(--border);padding:0;":B,v=e?`<img src="${e}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,T=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${u}">
        ${v}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${o}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${g?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e?"Change picture":"Upload picture"}</button>
        ${g?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,$=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${a!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${a==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,x=a!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${a.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',E=`
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${e?`<img src="${e}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${s}</span>`}</div>
        <div class="apps-loop-name">${o}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,G=`
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title" id="tour-apps-headline">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy" id="tour-apps-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line" id="tour-apps-first">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${A}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${D}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,tt=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${p}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${r(h)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${_("What guests see on their phone","",r(c),0,!1)}
          ${_("How guests add your hotel","",r(h),0,!0)}
          ${_("Guest texts you, you text back","",r(w),0,!0)}
          ${_("Your app and theirs — side by side","",r(b),0,!1)}
        </div>
        ${n!=="#"?`<button onclick="window.open('${n}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,et=Q=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${g?"Front Desk — installed":"Install Front Desk"}</div>
      ${y}
    </div>`,U=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${T}
    </div>`,ot=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${o}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${$}
      ${x}
    </div>`,it=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${tt}
      </div>
    </details>`,st=`
    ${et()}
    ${U()}
    ${ot}
    ${guestBroadcastCardHtml()}
    ${it}`,nt=`
    ${G}
    ${E}
    ${g?st:U()}`,at=g?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";t.innerHTML=`
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
    ${nt}

    <p class="apps-footnote">${at}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),Y()}async function Y(){const t=document.getElementById("guestInstallStats");try{const o=await api("GET","/api/crm/guest-install-stats");if(!o.success)throw new Error(o.message||"Failed");if(guestPushSubscriberCount=o.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const e=o.totals||{},s=o.installedBookings||0,i=e.views||0;if(!s&&!i){t.style.display="none",t.innerHTML="";return}t.style.display="block";const n=o.installRatePercent!=null?o.installRatePercent:0,a=Object.entries(o.byTouchpoint||{}).filter(function(p){return p[1].views||p[1].installed}).sort(function(p,b){return(b[1].installed||0)-(p[1].installed||0)}).slice(0,5),r=a.length?a.map(function(p){const b=p[0].replace(/-/g," "),c=p[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+b+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(c.views||0)+" views · "+(c.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(r?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+r:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}let L=[],f=0,F=!1;function J(){const t=document.getElementById("appsTourLightbox");t&&t.remove();const o=document.getElementById("appsTourTooltip");o&&o.remove(),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(e=>{e.style.position=e.dataset.appsTourOrigPosition||"",e.style.zIndex=e.dataset.appsTourOrigZIndex||"",e.style.isolation=e.dataset.appsTourOrigIsolation||"",e.style.boxShadow=e.dataset.appsTourOrigBoxShadow||"",e.style.borderRadius=e.dataset.appsTourOrigBorderRadius||"",e.removeAttribute("data-apps-tour-highlighted"),delete e.dataset.appsTourOrigPosition,delete e.dataset.appsTourOrigZIndex,delete e.dataset.appsTourOrigIsolation,delete e.dataset.appsTourOrigBoxShadow,delete e.dataset.appsTourOrigBorderRadius})}function m(t){J(),document.body.style.overflow="";const o=F;F=!1;try{const e=typeof C=="function"?C:window.ensureAppsViewRendered;typeof e=="function"&&e(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||d.settingsTourActive)){const s=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof s=="function"){s();return}}}function ct(t){const o=f+t;o<0||o>=L.length||(f=o,S())}function q(){if(localStorage.setItem("appsTourDone","1"),F||localStorage.getItem("settingsTourStep")==="handoff"||d.settingsTourActive){d.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const o=typeof finishTourHydration=="function"?finishTourHydration:window.finishTourHydration;typeof o=="function"&&o()}}function gt(){q();const t=typeof goLive=="function"?goLive:window.goLive;if(m(!1),typeof t=="function"){t();return}const o=typeof toast=="function"?toast:window.toast;typeof o=="function"&&o("Open Go live to activate your booking page.","error")}function ut(){if(d.hotelSubscribed||document.getElementById("guestAppActivationOverlay"))return;const t=document.createElement("div");if(t.id="guestAppActivationOverlay",t.style.cssText="position:fixed;inset:0;z-index:100004;background:rgba(0,0,0,0.68);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;",t.innerHTML=`
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
    </div>`,document.body.appendChild(t),document.body.style.overflow="hidden",!document.getElementById("tourModalAnimStyle")){const e=document.createElement("style");e.id="tourModalAnimStyle",e.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(e)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{t.remove(),document.body.style.overflow=""};document.getElementById("guestAppActivateNowBtn").onclick=()=>{o();const e=typeof goLive=="function"?goLive:window.goLive;if(typeof e=="function"){e();return}const s=typeof toast=="function"?toast:window.toast;typeof s=="function"&&s("Open Go live to activate your booking page.","error")},document.getElementById("guestAppActivateLaterBtn").onclick=o}function S(){const t=L[f];if(!t){m(!0);return}const o=L.length,e=f>=o-1,s=`${f+1} / ${o}`,i=document.querySelector(t.target);if(!i){f++,S();return}J();let n=document.createElement("div");n.id="appsTourLightbox",n.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.52);pointer-events:auto;",document.body.appendChild(n),i.dataset.appsTourOrigPosition=i.style.position||"",i.dataset.appsTourOrigZIndex=i.style.zIndex||"",i.dataset.appsTourOrigIsolation=i.style.isolation||"",i.dataset.appsTourOrigBoxShadow=i.style.boxShadow||"",i.dataset.appsTourOrigBorderRadius=i.style.borderRadius||"",i.style.position=i.style.position||"relative",i.style.zIndex="100002",i.style.isolation="isolate",i.style.boxShadow="0 0 0 4px #2E7D5B, 0 14px 38px rgba(0,0,0,0.24)",i.style.borderRadius=i.style.borderRadius||"16px",i.setAttribute("data-apps-tour-highlighted","1");const a=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,p=r&&t.mobileScrollBlock||t.scrollBlock||"center";i.scrollIntoView({behavior:a?"auto":"smooth",block:p}),setTimeout(()=>{const c=document.getElementById("appsTourTooltip");c&&c.remove();const h=i.getBoundingClientRect(),w=Math.min(330,window.innerWidth-28),g=h.left+h.width/2,j=Math.max(14,Math.min(g-w/2,window.innerWidth-w-14)),W=r&&t.mobileTooltipAnchor||t.tooltipAnchor||"bottom",I=r&&t.mobileTooltipPosition||t.tooltipPosition||"",y=h.top,A=W==="top"?h.top:h.bottom,D=t.primaryLabel||(e?"Done":"Next"),B=t.secondaryLabel||(e?"Not now":"Skip tour"),u=document.createElement("div");u.id="appsTourTooltip",u.style.cssText=`position:fixed;z-index:100003;left:${j}px;top:14px;width:${w}px;max-width:${w}px;visibility:hidden;`,u.innerHTML=`
      <div style="background:#111827;color:#fff;border-radius:14px;padding:15px 16px;box-shadow:0 18px 46px rgba(0,0,0,0.32);max-height:calc(100vh - 28px);overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.54);font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">${s}</div>
          <button type="button" id="appsTourSkipBtn" style="border:none;background:transparent;color:rgba(255,255,255,0.62);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 0;">${B}</button>
        </div>
        <div style="font-size:17px;font-weight:800;line-height:1.25;margin-bottom:7px;">${t.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.76);line-height:1.48;margin-bottom:14px;">${t.text}</div>
        <button type="button" id="appsTourNextBtn" style="width:100%;padding:12px 14px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">${D}</button>
      </div>`,document.body.appendChild(u);const v=12,k=Math.min(u.offsetHeight||176,Math.max(120,window.innerHeight-28)),T=window.innerHeight-A,$=y;let x=I==="below"||!I&&T>=k+v+14;I==="above"&&(x=!1),x&&T<k+v+14&&$>T&&(x=!1),!x&&$<k+v+14&&T>$&&(x=!0);const V=x?A+v:y-k-v,E=Math.max(14,window.innerHeight-k-14),G=Math.max(14,Math.min(V,E));u.style.top=`${G}px`,u.style.visibility="visible",document.getElementById("appsTourNextBtn").onclick=()=>{if(t.activateOnNext){gt();return}if(e){q(),m(!1),t.showActivationOnComplete&&ut();return}f++,S()},document.getElementById("appsTourSkipBtn").onclick=()=>{if(e){q(),m(!1);return}m(!0)}},a?40:320)}function ht(t){const o=t&&t.replay,e=t&&t.chainFromSettingsTour;if(!o&&!e&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;N(),m(!1),F=!!e;const s=!!d.hotelSubscribed;L=[{target:"#tour-apps-headline",title:"This is the whole idea.",text:"Your hotel can live on your guest's home screen. That is the value of this page."},{target:"#tour-apps-first",title:"First: install Front Desk.",text:"Front Desk is this website saved to your property phone. This is how you get booking alerts and guest messages."},{target:"#tour-apps-then",title:"Then: send guests to your booking page.",text:"When guests are booking, the Install button is at the bottom of the page. They tap it and your hotel is on their phone."},{target:"#tour-apps-after",title:"After that, the loop is clear.",text:"Guests tap your hotel icon to book or message you. New bookings and messages come back here in Front Desk."},{target:"#tour-guest-icon-section",title:"This is the one setup item.",text:"Guests see this icon on their home screen. Uploading the picture unlocks after Front Desk is installed.",mobileTooltipAnchor:"top",mobileTooltipPosition:"below"},{target:"#tour-apps-loop",title:s?"This loop is on.":"Turn this on for your property.",text:s?"Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.":"Activate once. Guests can book direct, save your hotel to their home screen, and Front Desk gets the alerts.",primaryLabel:s?"Done":"Continue to activation",secondaryLabel:s?"Close":"Not now",showActivationOnComplete:!s}],f=0,S()}const xt={appsCloseLightbox:N,appsCloudinaryFull:X,appsCloudinaryImg:P,appsLbNav:H,appsLbRender:R,appsOpenLightbox:dt,appsPhoneImgStyle:O,appsQuestionRow:_,appsTourClose:m,appsTourNav:ct,appsTourRender:S,appsVideoBadgeHtml:Z,detectAppPlatform:lt,ensureAppsViewRendered:C,loadGuestInstallStats:Y,renderAppsView:K,startAppsTour:ht};function mt(){rt(xt)}export{xt as default,mt as install};
