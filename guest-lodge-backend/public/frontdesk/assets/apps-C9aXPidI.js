import{c as l,e as rt}from"./settings-ZNxub1ed.js";const c={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},pt="32px";function Y(e,o){return e.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(o||400)+"/")}function q(e){return`border-radius:${pt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${e||""}`}function K(e){const o=Math.min(window.devicePixelRatio||1,2),t=Math.round(Math.min(window.screen.width*o,1600));return e.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${t}/`)}let L=[],z=0;function dt(e,o){m(!1),L=e,z=o||0;let t=document.getElementById("appsLightbox");if(!t){t=document.createElement("div"),t.id="appsLightbox",t.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(t),document.body.style.overflow="hidden",t._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?O(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?O(-1):i.key==="Escape"&&W()},document.addEventListener("keydown",t._keyHandler);let s=0;t.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),t.addEventListener("touchend",i=>{const r=i.changedTouches[0].clientX-s;Math.abs(r)>50&&O(r<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",V()}function W(){const e=document.getElementById("appsLightbox");e&&(document.removeEventListener("keydown",e._keyHandler),e.remove(),document.body.style.overflow="")}function O(e){const o=L.length;o<=1||(z=(z+e+o)%o,V())}function V(){const e=document.getElementById("appsLightbox");if(!e)return;const o=L[z],t=L.length,s=o.type!=="video",i=t>1?`${z+1} / ${t}`:"",r=s?`<img src="${K(o.src)}" alt="${o.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${q()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${q()}"
          ${o.poster?`poster="${Y(o.poster,400)}"`:""}>
          <source src="${o.src}" type="video/mp4">
       </video>`,n=t>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",a=t>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",d=t>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:t},(g,u)=>`<div onclick="appsOpenLightbox(_appsLbItems,${u})" style="width:7px;height:7px;border-radius:50%;background:${u===z?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";e.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${r}
      ${n}${a}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${o.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${o.title}</div>`:""}
      ${o.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${o.caption}</div>`:""}
      ${d}
    </div>`}function J(e,o){const t=e||"Video";return`<span class="${"apps-media-badge"+(o==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${t}</span></span>`}function S(e,o,t,s,i){const r=i?J("Video"):"",n=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${t},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${e}${r}</div>
      ${o?`<div class="apps-q-hint">${o}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${n}
  </button>`}function lt(){const e=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(e)&&!window.MSStream?"ios":/android/i.test(e)?"android":"ios"}function N(e){const o=document.getElementById("appsView");if(!o)return;const t=(l.activeHotelId||"")+"|"+(l.activeHotelAppIcon||"")+"|"+(l.activeHotelDomain||"");e||o.dataset.appsKey!==t||!o.querySelector(".apps-page")?(tt(),o.dataset.appsKey=t):U()}function tt(){const e=document.getElementById("appsView");if(!e)return;const o=l.activeHotelName||"Your Hotel",t=l.activeHotelAppIcon||"",s=o.trim().charAt(0).toUpperCase()||"🏨",i=l.activeHotelDomain||"",r=i?"https://"+i:"#",n=i?"https://"+i+"/install":"#";function a(Z){return JSON.stringify(Z).replace(/"/g,"&quot;")}const d=Y(c.guestHome,520),g=[{type:"image",src:c.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${o}</strong> — they tap it to book you or text you. No app store.`}],u=[{type:"image",src:c.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:c.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:c.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],_=[{type:"video",src:c.guestInstallVideo,poster:c.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],b=[{type:"image",src:c.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:c.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:c.guestMessageNotifVideo,poster:c.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],p=isStandaloneApp()||l.frontdeskInstalled,w=typeof Notification<"u"&&Notification.permission==="granted",E=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let k;p&&w?k=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:p?k=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:k=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const I=p?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${E}</button>`,A=n!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',$="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",D=t?$+"background:#fff;border:1px solid var(--border);padding:0;":$,j=t?`<img src="${t}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,y=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${D}">
        ${j}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${o}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${p?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${t?"Change picture":"Upload picture"}</button>
        ${p?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,v=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${n!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${n==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,T=n!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${n.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',x=`
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${t?`<img src="${t}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${s}</span>`}</div>
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
        <div class="apps-story-actions">${I}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${A}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,C=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${d}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${a(_)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${S("What guests see on their phone","",a(u),0,!1)}
          ${S("How guests add your hotel","",a(_),0,!0)}
          ${S("Guest texts you, you text back","",a(b),0,!0)}
          ${S("Your app and theirs — side by side","",a(g),0,!1)}
        </div>
        ${r!=="#"?`<button onclick="window.open('${r}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,P=Z=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${p?"Front Desk — installed":"Install Front Desk"}</div>
      ${k}
    </div>`,X=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${y}
    </div>`,ot=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${o}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${v}
      ${T}
    </div>`,it=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${C}
      </div>
    </details>`,st=`
    ${P()}
    ${X()}
    ${ot}
    ${guestBroadcastCardHtml()}
    ${it}`,nt=`
    ${G}
    ${x}
    ${p?st:X()}`,at=p?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";e.innerHTML=`
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

  </div>`,typeof lucide<"u"&&lucide.createIcons(),U()}async function U(){const e=document.getElementById("guestInstallStats");try{const o=await api("GET","/api/crm/guest-install-stats");if(!o.success)throw new Error(o.message||"Failed");if(guestPushSubscriberCount=o.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!e)return;const t=o.totals||{},s=o.installedBookings||0,i=t.views||0;if(!s&&!i){e.style.display="none",e.innerHTML="";return}e.style.display="block";const r=o.installRatePercent!=null?o.installRatePercent:0,n=Object.entries(o.byTouchpoint||{}).filter(function(d){return d[1].views||d[1].installed}).sort(function(d,g){return(g[1].installed||0)-(d[1].installed||0)}).slice(0,5),a=n.length?n.map(function(d){const g=d[0].replace(/-/g," "),u=d[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+g+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(u.views||0)+" views · "+(u.installed||0)+" installed</span></div>"}).join(""):"";e.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+r+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(a?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+a:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),e&&(e.style.display="none",e.innerHTML="")}}let M=[],f=0,F=!1;function et(){const e=document.getElementById("appsTourLightbox");e&&e.remove();const o=document.getElementById("appsTourTooltip");o&&o.remove(),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(t=>{t.style.position=t.dataset.appsTourOrigPosition||"",t.style.zIndex=t.dataset.appsTourOrigZIndex||"",t.style.isolation=t.dataset.appsTourOrigIsolation||"",t.style.boxShadow=t.dataset.appsTourOrigBoxShadow||"",t.style.borderRadius=t.dataset.appsTourOrigBorderRadius||"",t.style.padding=t.dataset.appsTourOrigPadding||"",t.style.boxSizing=t.dataset.appsTourOrigBoxSizing||"",t.style.outline=t.dataset.appsTourOrigOutline||"",t.style.outlineOffset=t.dataset.appsTourOrigOutlineOffset||"",t.style.lineHeight=t.dataset.appsTourOrigLineHeight||"",t.removeAttribute("data-apps-tour-highlighted"),delete t.dataset.appsTourOrigPosition,delete t.dataset.appsTourOrigZIndex,delete t.dataset.appsTourOrigIsolation,delete t.dataset.appsTourOrigBoxShadow,delete t.dataset.appsTourOrigBorderRadius,delete t.dataset.appsTourOrigPadding,delete t.dataset.appsTourOrigBoxSizing,delete t.dataset.appsTourOrigOutline,delete t.dataset.appsTourOrigOutlineOffset,delete t.dataset.appsTourOrigLineHeight})}function m(e){et(),document.body.style.overflow="";const o=F;F=!1;try{const t=typeof N=="function"?N:window.ensureAppsViewRendered;typeof t=="function"&&t(!0)}catch{}if(e&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||l.settingsTourActive)){const s=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof s=="function"){s();return}}}function ct(e){const o=f+e;o<0||o>=M.length||(f=o,B())}function R(){if(localStorage.setItem("appsTourDone","1"),F||localStorage.getItem("settingsTourStep")==="handoff"||l.settingsTourActive){l.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const o=typeof finishTourHydration=="function"?finishTourHydration:window.finishTourHydration;typeof o=="function"&&o()}}function gt(){R();const e=typeof goLive=="function"?goLive:window.goLive;if(m(!1),typeof e=="function"){e();return}const o=typeof toast=="function"?toast:window.toast;typeof o=="function"&&o("Open Go live to activate your booking page.","error")}function ut(){if(l.hotelSubscribed||document.getElementById("guestAppActivationOverlay"))return;const e=document.createElement("div");if(e.id="guestAppActivationOverlay",e.style.cssText="position:fixed;inset:0;z-index:100004;background:rgba(0,0,0,0.68);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",!document.getElementById("tourModalAnimStyle")){const t=document.createElement("style");t.id="tourModalAnimStyle",t.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(t)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("guestAppActivateNowBtn").onclick=()=>{o();const t=typeof goLive=="function"?goLive:window.goLive;if(typeof t=="function"){t();return}const s=typeof toast=="function"?toast:window.toast;typeof s=="function"&&s("Open Go live to activate your booking page.","error")},document.getElementById("guestAppActivateLaterBtn").onclick=o}function B(){const e=M[f];if(!e){m(!0);return}const o=M.length,t=f>=o-1,s=`${f+1} / ${o}`,i=document.querySelector(e.target);if(!i){f++,B();return}et();let r=document.createElement("div");r.id="appsTourLightbox",r.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.52);pointer-events:auto;",document.body.appendChild(r),i.dataset.appsTourOrigPosition=i.style.position||"",i.dataset.appsTourOrigZIndex=i.style.zIndex||"",i.dataset.appsTourOrigIsolation=i.style.isolation||"",i.dataset.appsTourOrigBoxShadow=i.style.boxShadow||"",i.dataset.appsTourOrigBorderRadius=i.style.borderRadius||"",i.dataset.appsTourOrigPadding=i.style.padding||"",i.dataset.appsTourOrigBoxSizing=i.style.boxSizing||"",i.dataset.appsTourOrigOutline=i.style.outline||"",i.dataset.appsTourOrigOutlineOffset=i.style.outlineOffset||"",i.dataset.appsTourOrigLineHeight=i.style.lineHeight||"",i.style.position=i.style.position||"relative",i.style.zIndex="100002",i.style.isolation="isolate",i.style.boxSizing="border-box",i.style.padding="16px 18px",i.style.lineHeight="1.6",i.style.boxShadow="0 14px 38px rgba(0,0,0,0.24)",i.style.outline="4px solid #2E7D5B",i.style.outlineOffset="5px",i.style.borderRadius=i.style.borderRadius||"16px",i.setAttribute("data-apps-tour-highlighted","1");const n=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,a=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,d=a&&e.mobileScrollBlock||e.scrollBlock||"center",g=n?"auto":"smooth";if(a&&e.mobileScrollToBottom){const b=Math.max(document.documentElement?document.documentElement.scrollHeight:0,document.body?document.body.scrollHeight:0);window.scrollTo({top:b,behavior:g}),setTimeout(()=>{window.scrollTo({top:b,behavior:"auto"})},g==="smooth"?520:0)}else i.scrollIntoView({behavior:g,block:d});const u=()=>{const b=document.getElementById("appsTourTooltip");b&&b.remove();const p=i.getBoundingClientRect(),w=Math.min(330,window.innerWidth-28),Q=p.left+p.width/2,E=Math.max(14,Math.min(Q-w/2,window.innerWidth-w-14)),k=a&&e.mobileTooltipAnchor||e.tooltipAnchor||"bottom",I=a&&e.mobileTooltipPosition||e.tooltipPosition||"",A=p.top,$=k==="top"?p.top:p.bottom,D=e.primaryLabel||(t?"Done":"Next"),j=e.secondaryLabel||(t?"Not now":"Skip tour"),h=document.createElement("div");h.id="appsTourTooltip",h.style.cssText=`position:fixed;z-index:100003;left:${E}px;top:14px;width:${w}px;max-width:${w}px;visibility:hidden;`,h.innerHTML=`
      <div style="background:#111827;color:#fff;border-radius:14px;padding:15px 16px;box-shadow:0 18px 46px rgba(0,0,0,0.32);max-height:calc(100vh - 28px);overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.54);font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">${s}</div>
          <button type="button" id="appsTourSkipBtn" style="border:none;background:transparent;color:rgba(255,255,255,0.62);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 0;">${j}</button>
        </div>
        <div style="font-size:17px;font-weight:800;line-height:1.25;margin-bottom:7px;">${e.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.76);line-height:1.48;margin-bottom:14px;">${e.text}</div>
        <button type="button" id="appsTourNextBtn" style="width:100%;padding:12px 14px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">${D}</button>
      </div>`,document.body.appendChild(h);const y=12,v=Math.min(h.offsetHeight||176,Math.max(120,window.innerHeight-28)),T=window.innerHeight-$,H=A;let x=I==="below"||!I&&T>=v+y+14;I==="above"&&(x=!1),x&&T<v+y+14&&H>T&&(x=!1),!x&&H<v+y+14&&T>H&&(x=!0);const G=x?$+y:A-v-y,C=Math.max(14,window.innerHeight-v-14),P=Math.max(14,Math.min(G,C));h.style.top=`${P}px`,h.style.visibility="visible",document.getElementById("appsTourNextBtn").onclick=()=>{if(e.activateOnNext){gt();return}if(t){R(),m(!1),e.showActivationOnComplete&&ut();return}f++,B()},document.getElementById("appsTourSkipBtn").onclick=()=>{if(t){R(),m(!1);return}m(!0)}},_=a&&e.mobileScrollToBottom?n?80:680:n?40:320;setTimeout(u,_)}function ht(e){const o=e&&e.replay,t=e&&e.chainFromSettingsTour;if(!o&&!t&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;W(),m(!1),F=!!t;const s=!!l.hotelSubscribed;M=[{target:"#tour-apps-headline",title:"This is the whole idea.",text:"Your hotel can live on your guest's home screen. That is the value of this page."},{target:"#tour-apps-first",title:"First: install Front Desk.",text:"Front Desk is this website saved to your property phone. This is how you get booking alerts and guest messages."},{target:"#tour-apps-then",title:"Then: send guests to your booking page.",text:"When guests are booking, the Install button is at the bottom of the page. They tap it and your hotel is on their phone."},{target:"#tour-apps-after",title:"After that, the loop is clear.",text:"Guests tap your hotel icon to book or message you. New bookings and messages come back here in Front Desk."},{target:"#tour-guest-icon-section",title:"This is the one setup item.",text:"Guests see this icon on their home screen. Uploading the picture unlocks after Front Desk is installed.",mobileScrollToBottom:!0,mobileScrollBlock:"end",mobileTooltipAnchor:"top",mobileTooltipPosition:"above"},{target:"#tour-apps-loop",title:s?"This loop is on.":"Turn this on for your property.",text:s?"Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.":"Activate once. Guests can book direct, save your hotel to their home screen, and Front Desk gets the alerts.",primaryLabel:s?"Done":"Continue to activation",secondaryLabel:s?"Close":"Not now",showActivationOnComplete:!s}],f=0,B()}const xt={appsCloseLightbox:W,appsCloudinaryFull:K,appsCloudinaryImg:Y,appsLbNav:O,appsLbRender:V,appsOpenLightbox:dt,appsPhoneImgStyle:q,appsQuestionRow:S,appsTourClose:m,appsTourNav:ct,appsTourRender:B,appsVideoBadgeHtml:J,detectAppPlatform:lt,ensureAppsViewRendered:N,loadGuestInstallStats:U,renderAppsView:tt,startAppsTour:ht};function mt(){rt(xt)}export{xt as default,mt as install};
