import{c as g,e as it}from"./settings-DGHIPyBf.js";const l={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},nt="32px";function m(e,t){return e.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(t||400)+"/")}function y(e){return`border-radius:${nt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${e||""}`}function B(e){const t=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*t,1600));return e.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let $=[],h=0;function st(e,t){w(!1),$=e,h=t||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?z(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?z(-1):i.key==="Escape"&&S()},document.addEventListener("keydown",o._keyHandler);let n=0;o.addEventListener("touchstart",i=>{n=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const p=i.changedTouches[0].clientX-n;Math.abs(p)>50&&z(p<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",A()}function S(){const e=document.getElementById("appsLightbox");e&&(document.removeEventListener("keydown",e._keyHandler),e.remove(),document.body.style.overflow="")}function z(e){const t=$.length;t<=1||(h=(h+e+t)%t,A())}function A(){const e=document.getElementById("appsLightbox");if(!e)return;const t=$[h],o=$.length,n=t.type!=="video",i=o>1?`${h+1} / ${o}`:"",p=n?`<img src="${B(t.src)}" alt="${t.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${y()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${y()}"
          ${t.poster?`poster="${m(t.poster,400)}"`:""}>
          <source src="${t.src}" type="video/mp4">
       </video>`,a=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",d=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",s=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(c,r)=>`<div onclick="appsOpenLightbox(_appsLbItems,${r})" style="width:7px;height:7px;border-radius:50%;background:${r===h?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";e.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${p}
      ${a}${d}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${t.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${t.title}</div>`:""}
      ${t.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${t.caption}</div>`:""}
      ${s}
    </div>`}function j(e,t){const o=e||"Video";return`<span class="${"apps-media-badge"+(t==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function b(e,t,o,n,i){const p=i?j("Video"):"",a=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${n})">
    <div class="apps-q-text">
      <div class="apps-q-title">${e}${p}</div>
      ${t?`<div class="apps-q-hint">${t}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function at(){const e=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(e)&&!window.MSStream?"ios":/android/i.test(e)?"android":"ios"}function T(e){const t=document.getElementById("appsView");if(!t)return;const o=(g.activeHotelId||"")+"|"+(g.activeHotelAppIcon||"")+"|"+(g.activeHotelDomain||"");e||t.dataset.appsKey!==o||!t.querySelector(".apps-page")?(G(),t.dataset.appsKey=o):E()}function G(){const e=document.getElementById("appsView");if(!e)return;const t=g.activeHotelName||"Your Hotel",o=g.activeHotelAppIcon||"",n=t.trim().charAt(0).toUpperCase()||"🏨",i=g.activeHotelDomain||"",p=i?"https://"+i:"#",a=i?"https://"+i+"/install":"#";function d(H){return JSON.stringify(H).replace(/"/g,"&quot;")}const s=m(l.guestHome,520),c=[{type:"image",src:l.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${t}</strong> — they tap it to book you or text you. No app store.`}],r=[{type:"image",src:l.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:l.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:l.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],f=[{type:"video",src:l.guestInstallVideo,poster:l.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],M=[{type:"image",src:l.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:l.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:l.guestMessageNotifVideo,poster:l.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],u=isStandaloneApp()||g.frontdeskInstalled,q=typeof Notification<"u"&&Notification.permission==="granted",C=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let k;u&&q?k=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:u?k=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:k=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const N=u?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${C}</button>`,D=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',L="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",P=o?L+"background:#fff;border:1px solid var(--border);padding:0;":L,Y=o?`<img src="${o}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${n}</span>`,R=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${P}">
        ${Y}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${t}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="document.getElementById('appsAppIconInput').click()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change icon":"Upload icon"}</button>
      </div>
    </div>`,O=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${a!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${a==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,V=a!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${a.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',U=`
    <div class="apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${o?`<img src="${o}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${n}</span>`}</div>
        <div class="apps-loop-name">${t}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,W=`
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${N}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${D}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,Q=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${s}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${d(f)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${b("What guests see on their phone","",d(r),0,!1)}
          ${b("How guests add your hotel","",d(f),0,!0)}
          ${b("Guest texts you, you text back","",d(M),0,!0)}
          ${b("Your app and theirs — side by side","",d(c),0,!1)}
        </div>
        ${p!=="#"?`<button onclick="window.open('${p}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,X=H=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${u?"Front Desk — installed":"Install Front Desk"}</div>
      ${k}
    </div>`,K=H=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${R}
    </div>`,J=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${t}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${O}
      ${V}
    </div>`,Z=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${Q}
      </div>
    </details>`,tt=`
    ${X()}
    ${K()}
    ${J}
    ${guestBroadcastCardHtml()}
    ${Z}`,et=`
    ${W}
    ${U}
    ${u?tt:""}`,ot=u?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";e.innerHTML=`
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
    ${et}

    <p class="apps-footnote">${ot}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),E()}async function E(){const e=document.getElementById("guestInstallStats");try{const t=await api("GET","/api/crm/guest-install-stats");if(!t.success)throw new Error(t.message||"Failed");if(guestPushSubscriberCount=t.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!e)return;const o=t.totals||{},n=t.installedBookings||0,i=o.views||0;if(!n&&!i){e.style.display="none",e.innerHTML="";return}e.style.display="block";const p=t.installRatePercent!=null?t.installRatePercent:0,a=Object.entries(t.byTouchpoint||{}).filter(function(s){return s[1].views||s[1].installed}).sort(function(s,c){return(c[1].installed||0)-(s[1].installed||0)}).slice(0,5),d=a.length?a.map(function(s){const c=s[0].replace(/-/g," "),r=s[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+c+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(r.views||0)+" views · "+(r.installed||0)+" installed</span></div>"}).join(""):"";e.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+p+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(d?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+d:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),e&&(e.style.display="none",e.innerHTML="")}}let I=[],x=0,v=!1;function w(e){const t=document.getElementById("appsTourLightbox");t&&(t._swipeStart&&t.removeEventListener("touchstart",t._swipeStart),t._swipeEnd&&t.removeEventListener("touchend",t._swipeEnd),t.remove()),document.body.style.overflow="";const o=v;v=!1;try{const n=typeof T=="function"?T:window.ensureAppsViewRendered;typeof n=="function"&&n(!0)}catch{}if(e&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||g.settingsTourActive)){const i=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof i=="function"){i();return}}}function F(e){const t=x+e;t<0||t>=I.length||(x=t,_())}function _(){const e=document.getElementById("appsTourLightbox");if(!e)return;const t=I[x],o=I.length,n=x>=o-1,i=`${x+1} / ${o}`,p=n?v?"Next — you're almost done":"Got it — show me":"Next →",a=t.type==="video"?j("1 min","light"):"",d=Array.from({length:o},(c,r)=>`<div style="width:7px;height:7px;border-radius:50%;background:${r===x?"#fff":"rgba(255,255,255,0.35)"};"></div>`).join("");let s="";t.type==="cta"?s=`<div style="width:100%;max-width:320px;padding:0 8px;box-sizing:border-box;">${t.ctaHtml}</div>`:t.type==="video"?s=`<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${y()}"
      poster="${t.poster||""}">
      <source src="${t.src}" type="video/mp4">
    </video>`:s=`<img src="${t.src}" alt="${t.alt||""}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${y()}">`,e.innerHTML=`
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${i}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">Skip</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${s}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">${t.title}${a}</div>
      ${t.caption?`<div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:14px;">${t.caption}</div>`:""}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${p}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${d}</div>
    </div>`,document.getElementById("appsTourNextBtn").onclick=()=>{if(n){const c=v;if(w(!0),!c){const r=document.getElementById("appsView");r&&r.scrollIntoView({behavior:"smooth",block:"start"})}}else x++,_()},document.getElementById("appsTourSkipBtn").onclick=()=>w(!0)}function rt(e){const t=e&&e.replay,o=e&&e.chainFromSettingsTour;if(v=!!o,!t&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox"))return;const n=g.activeHotelName||"Your Hotel",i=n.length>13?n.slice(0,13)+"…":n,p=n.trim().charAt(0).toUpperCase(),a=g.activeHotelAppIcon||"",d=a?`<div style="width:52px;height:52px;border-radius:14px;background:#fff;padding:8px;box-sizing:border-box;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="${a}" alt="${n}" style="width:100%;height:100%;object-fit:contain;"></div>`:`<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${p}</div>`;I=[{type:"video",src:l.guestInstallVideo,poster:m(l.guestHome,400),title:"Guests save your hotel to their phone",caption:`They tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Tap <strong>Change your icon</strong> in Guest App so they see <strong>${i}</strong>.`},{type:"image",src:m(l.guestHome,520),alt:"Guest home screen",title:"What guests see after they install",caption:"Their stay info, direct booking, and a way to message you — all from one icon on their phone."},{type:"cta",title:"In Guest App",caption:"",ctaHtml:`
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">AT CHECK-IN</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">📲 Show QR at check-in</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Full-screen QR — guests scan to save <strong>${i}</strong>.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">NOTIFY GUESTS</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">📣 Notify all guests at once</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Push a sale, event, or install reminder to everyone on your guest app.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:8px;">CHANGE YOUR ICON</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${d}
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Your logo on their home screen</div>
              <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.45;">Upload at the top of <strong>Guest App</strong>. Tap <strong>Help</strong> for the full walkthrough.</p>
            </div>
          </div>
        </div>`}],x=0,S(),w(!1);const s=document.createElement("div");s.id="appsTourLightbox",s.style.cssText=["position:fixed;inset:0;z-index:102001;background:#000;","display:flex;flex-direction:column;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join("");let c=0;s._swipeStart=r=>{c=r.changedTouches[0].clientX},s._swipeEnd=r=>{const f=r.changedTouches[0].clientX-c;Math.abs(f)>50&&F(f<0?1:-1)},s.addEventListener("touchstart",s._swipeStart,{passive:!0}),s.addEventListener("touchend",s._swipeEnd,{passive:!0}),document.body.appendChild(s),document.body.style.overflow="hidden",_()}const pt={appsCloseLightbox:S,appsCloudinaryFull:B,appsCloudinaryImg:m,appsLbNav:z,appsLbRender:A,appsOpenLightbox:st,appsPhoneImgStyle:y,appsQuestionRow:b,appsTourClose:w,appsTourNav:F,appsTourRender:_,appsVideoBadgeHtml:j,detectAppPlatform:at,ensureAppsViewRendered:T,loadGuestInstallStats:E,renderAppsView:G,startAppsTour:rt};function gt(){it(pt)}export{pt as default,gt as install};
