import{c as g,e as nt}from"./settings-cfBhTqPS.js";const c={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},at="32px";function A(o,t){return o.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(t||400)+"/")}function S(o){return`border-radius:${at};box-shadow:0 10px 36px rgba(0,0,0,0.22);${o||""}`}function q(o){const t=Math.min(window.devicePixelRatio||1,2),e=Math.round(Math.min(window.screen.width*t,1600));return o.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${e}/`)}let k=[],m=0;function rt(o,t){f(!1),k=o,m=t||0;let e=document.getElementById("appsLightbox");if(!e){e=document.createElement("div"),e.id="appsLightbox",e.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(e),document.body.style.overflow="hidden",e._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?w(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?w(-1):i.key==="Escape"&&F()},document.addEventListener("keydown",e._keyHandler);let s=0;e.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),e.addEventListener("touchend",i=>{const n=i.changedTouches[0].clientX-s;Math.abs(n)>50&&w(n<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",L()}function F(){const o=document.getElementById("appsLightbox");o&&(document.removeEventListener("keydown",o._keyHandler),o.remove(),document.body.style.overflow="")}function w(o){const t=k.length;t<=1||(m=(m+o+t)%t,L())}function L(){const o=document.getElementById("appsLightbox");if(!o)return;const t=k[m],e=k.length,s=t.type!=="video",i=e>1?`${m+1} / ${e}`:"",n=s?`<img src="${q(t.src)}" alt="${t.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${S()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${S()}"
          ${t.poster?`poster="${A(t.poster,400)}"`:""}>
          <source src="${t.src}" type="video/mp4">
       </video>`,a=e>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",l=e>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",r=e>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:e},(p,d)=>`<div onclick="appsOpenLightbox(_appsLbItems,${d})" style="width:7px;height:7px;border-radius:50%;background:${d===m?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";o.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${n}
      ${a}${l}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${t.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${t.title}</div>`:""}
      ${t.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${t.caption}</div>`:""}
      ${r}
    </div>`}function O(o,t){const e=o||"Video";return`<span class="${"apps-media-badge"+(t==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${e}</span></span>`}function b(o,t,e,s,i){const n=i?O("Video"):"",a=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${e},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${o}${n}</div>
      ${t?`<div class="apps-q-hint">${t}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function pt(){const o=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(o)&&!window.MSStream?"ios":/android/i.test(o)?"android":"ios"}function H(o){const t=document.getElementById("appsView");if(!t)return;const e=(g.activeHotelId||"")+"|"+(g.activeHotelAppIcon||"")+"|"+(g.activeHotelDomain||"");o||t.dataset.appsKey!==e||!t.querySelector(".apps-page")?(C(),t.dataset.appsKey=e):M()}function C(){const o=document.getElementById("appsView");if(!o)return;const t=g.activeHotelName||"Your Hotel",e=g.activeHotelAppIcon||"",s=t.trim().charAt(0).toUpperCase()||"🏨",i=g.activeHotelDomain||"",n=i?"https://"+i:"#",a=i?"https://"+i+"/install":"#";function l(E){return JSON.stringify(E).replace(/"/g,"&quot;")}const r=A(c.guestHome,520),p=[{type:"image",src:c.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${t}</strong> — they tap it to book you or text you. No app store.`}],d=[{type:"image",src:c.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:c.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:c.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],v=[{type:"video",src:c.guestInstallVideo,poster:c.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],z=[{type:"image",src:c.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:c.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:c.guestMessageNotifVideo,poster:c.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],u=isStandaloneApp()||g.frontdeskInstalled,$=typeof Notification<"u"&&Notification.permission==="granted",_=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let h;u&&$?h=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:u?h=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:h=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const N=u?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${_}</button>`,R=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',G="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",Y=e?G+"background:#fff;border:1px solid var(--border);padding:0;":G,W=e?`<img src="${e}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,V=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${Y}">
        ${W}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${t}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${u?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e?"Change picture":"Upload picture"}</button>
        ${u?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
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
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${e?`<img src="${e}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${s}</span>`}</div>
        <div class="apps-loop-name">${t}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,Z=`
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title" id="tour-apps-headline">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy" id="tour-apps-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line" id="tour-apps-first">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${N}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${R}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,K=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${r}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${l(v)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${b("What guests see on their phone","",l(d),0,!1)}
          ${b("How guests add your hotel","",l(v),0,!0)}
          ${b("Guest texts you, you text back","",l(z),0,!0)}
          ${b("Your app and theirs — side by side","",l(p),0,!1)}
        </div>
        ${n!=="#"?`<button onclick="window.open('${n}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,J=E=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${u?"Front Desk — installed":"Install Front Desk"}</div>
      ${h}
    </div>`,D=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${V}
    </div>`,tt=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${t}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${U}
      ${Q}
    </div>`,et=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${K}
      </div>
    </details>`,ot=`
    ${J()}
    ${D()}
    ${tt}
    ${guestBroadcastCardHtml()}
    ${et}`,it=`
    ${Z}
    ${X}
    ${u?ot:D()}`,st=u?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";o.innerHTML=`
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
    ${it}

    <p class="apps-footnote">${st}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),M()}async function M(){const o=document.getElementById("guestInstallStats");try{const t=await api("GET","/api/crm/guest-install-stats");if(!t.success)throw new Error(t.message||"Failed");if(guestPushSubscriberCount=t.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!o)return;const e=t.totals||{},s=t.installedBookings||0,i=e.views||0;if(!s&&!i){o.style.display="none",o.innerHTML="";return}o.style.display="block";const n=t.installRatePercent!=null?t.installRatePercent:0,a=Object.entries(t.byTouchpoint||{}).filter(function(r){return r[1].views||r[1].installed}).sort(function(r,p){return(p[1].installed||0)-(r[1].installed||0)}).slice(0,5),l=a.length?a.map(function(r){const p=r[0].replace(/-/g," "),d=r[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+p+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(d.views||0)+" views · "+(d.installed||0)+" installed</span></div>"}).join(""):"";o.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(l?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+l:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),o&&(o.style.display="none",o.innerHTML="")}}let T=[],x=0,I=!1;function P(){const o=document.getElementById("appsTourLightbox");o&&o.remove();const t=document.getElementById("appsTourTooltip");t&&t.remove(),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(e=>{e.style.position=e.dataset.appsTourOrigPosition||"",e.style.zIndex=e.dataset.appsTourOrigZIndex||"",e.style.isolation=e.dataset.appsTourOrigIsolation||"",e.style.boxShadow=e.dataset.appsTourOrigBoxShadow||"",e.style.borderRadius=e.dataset.appsTourOrigBorderRadius||"",e.removeAttribute("data-apps-tour-highlighted"),delete e.dataset.appsTourOrigPosition,delete e.dataset.appsTourOrigZIndex,delete e.dataset.appsTourOrigIsolation,delete e.dataset.appsTourOrigBoxShadow,delete e.dataset.appsTourOrigBorderRadius})}function f(o){P(),document.body.style.overflow="";const t=I;I=!1;try{const e=typeof H=="function"?H:window.ensureAppsViewRendered;typeof e=="function"&&e(!0)}catch{}if(o&&(localStorage.setItem("appsTourDone","1"),t||localStorage.getItem("settingsTourStep")==="handoff"||g.settingsTourActive)){const s=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof s=="function"){s();return}}}function dt(o){const t=x+o;t<0||t>=T.length||(x=t,y())}function B(){if(localStorage.setItem("appsTourDone","1"),I||localStorage.getItem("settingsTourStep")==="handoff"||g.settingsTourActive){g.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const t=typeof finishTourHydration=="function"?finishTourHydration:window.finishTourHydration;typeof t=="function"&&t()}}function lt(){B();const o=typeof goLive=="function"?goLive:window.goLive;if(f(!1),typeof o=="function"){o();return}const t=typeof toast=="function"?toast:window.toast;typeof t=="function"&&t("Open Go live to activate your booking page.","error")}function y(){const o=T[x];if(!o){f(!0);return}const t=T.length,e=x>=t-1,s=`${x+1} / ${t}`,i=document.querySelector(o.target);if(!i){x++,y();return}P();let n=document.createElement("div");n.id="appsTourLightbox",n.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.52);pointer-events:auto;",document.body.appendChild(n),i.dataset.appsTourOrigPosition=i.style.position||"",i.dataset.appsTourOrigZIndex=i.style.zIndex||"",i.dataset.appsTourOrigIsolation=i.style.isolation||"",i.dataset.appsTourOrigBoxShadow=i.style.boxShadow||"",i.dataset.appsTourOrigBorderRadius=i.style.borderRadius||"",i.style.position=i.style.position||"relative",i.style.zIndex="100002",i.style.isolation="isolate",i.style.boxShadow="0 0 0 4px #2E7D5B, 0 14px 38px rgba(0,0,0,0.24)",i.style.borderRadius=i.style.borderRadius||"16px",i.setAttribute("data-apps-tour-highlighted","1");const a=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;i.scrollIntoView({behavior:a?"auto":"smooth",block:o.scrollBlock||"center"}),setTimeout(()=>{const r=document.getElementById("appsTourTooltip");r&&r.remove();const p=i.getBoundingClientRect(),d=Math.min(330,window.innerWidth-28),v=p.left+p.width/2,z=Math.max(14,Math.min(v-d/2,window.innerWidth-d-14)),$=window.innerHeight-p.bottom>176?Math.min(p.bottom+12,window.innerHeight-160):Math.max(14,p.top-178),j=o.primaryLabel||(e?"Done":"Next"),_=o.secondaryLabel||(e?"Not now":"Skip tour"),h=document.createElement("div");h.id="appsTourTooltip",h.style.cssText=`position:fixed;z-index:100003;left:${z}px;top:${$}px;width:${d}px;max-width:${d}px;`,h.innerHTML=`
      <div style="background:#111827;color:#fff;border-radius:14px;padding:15px 16px;box-shadow:0 18px 46px rgba(0,0,0,0.32);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.54);font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">${s}</div>
          <button type="button" id="appsTourSkipBtn" style="border:none;background:transparent;color:rgba(255,255,255,0.62);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 0;">${_}</button>
        </div>
        <div style="font-size:17px;font-weight:800;line-height:1.25;margin-bottom:7px;">${o.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.76);line-height:1.48;margin-bottom:14px;">${o.text}</div>
        <button type="button" id="appsTourNextBtn" style="width:100%;padding:12px 14px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">${j}</button>
      </div>`,document.body.appendChild(h),document.getElementById("appsTourNextBtn").onclick=()=>{if(o.activateOnNext){lt();return}if(e){B(),f(!1);return}x++,y()},document.getElementById("appsTourSkipBtn").onclick=()=>{if(e){B(),f(!1);return}f(!0)}},a?40:320)}function ct(o){const t=o&&o.replay,e=o&&o.chainFromSettingsTour;if(!t&&!e&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;F(),f(!1),I=!!e;const s=!!g.hotelSubscribed;T=[{target:"#tour-apps-headline",title:"This is the whole idea.",text:"Your hotel can live on your guest's home screen. That is the value of this page."},{target:"#tour-apps-first",title:"First: install Front Desk.",text:"Front Desk is this website saved to your property phone. This is how you get booking alerts and guest messages."},{target:"#tour-apps-then",title:"Then: send guests to your booking page.",text:"When guests are booking, the Install button is at the bottom of the page. They tap it and your hotel is on their phone."},{target:"#tour-apps-after",title:"After that, the loop is clear.",text:"Guests tap your hotel icon to book or message you. New bookings and messages come back here in Front Desk."},{target:"#tour-guest-icon-section",title:"This is the one setup item.",text:"Guests see this icon on their home screen. Uploading the picture unlocks after Front Desk is installed."},{target:"#tour-apps-loop",title:s?"This loop is on.":"Turn this on for your property.",text:s?"Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.":"Activate once. Guests can book direct, save your hotel to their home screen, and Front Desk gets the alerts.",primaryLabel:s?"Done":"Activate Guest App + Front Desk — $199/mo",secondaryLabel:s?"Close":"Not now",activateOnNext:!s}],x=0,y()}const gt={appsCloseLightbox:F,appsCloudinaryFull:q,appsCloudinaryImg:A,appsLbNav:w,appsLbRender:L,appsOpenLightbox:rt,appsPhoneImgStyle:S,appsQuestionRow:b,appsTourClose:f,appsTourNav:dt,appsTourRender:y,appsVideoBadgeHtml:O,detectAppPlatform:pt,ensureAppsViewRendered:H,loadGuestInstallStats:M,renderAppsView:C,startAppsTour:ct};function ft(){nt(gt)}export{gt as default,ft as install};
