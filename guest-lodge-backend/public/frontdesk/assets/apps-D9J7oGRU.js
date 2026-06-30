import{c as x,e as mt}from"./settings-DGHIPyBf.js";const r={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4",frontdeskInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_19-49-38_1_tc1bzm.mp4"},yt="32px";function v(e,t){return e.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(t||400)+"/")}function w(e){return`border-radius:${yt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${e||""}`}function R(e){const t=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*t,1600));return e.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let I=[],f=0;function vt(e,t){_(!1),I=e,f=t||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?$(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?$(-1):i.key==="Escape"&&j()},document.addEventListener("keydown",o._keyHandler);let s=0;o.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const d=i.changedTouches[0].clientX-s;Math.abs(d)>50&&$(d<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",A()}function j(){const e=document.getElementById("appsLightbox");e&&(document.removeEventListener("keydown",e._keyHandler),e.remove(),document.body.style.overflow="")}function $(e){const t=I.length;t<=1||(f=(f+e+t)%t,A())}function A(){const e=document.getElementById("appsLightbox");if(!e)return;const t=I[f],o=I.length,s=t.type!=="video",i=o>1?`${f+1} / ${o}`:"",d=s?`<img src="${R(t.src)}" alt="${t.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${w()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${w()}"
          ${t.poster?`poster="${v(t.poster,400)}"`:""}>
          <source src="${t.src}" type="video/mp4">
       </video>`,a=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",l=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",n=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(g,p)=>`<div onclick="appsOpenLightbox(_appsLbItems,${p})" style="width:7px;height:7px;border-radius:50%;background:${p===f?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";e.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${d}
      ${a}${l}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${t.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${t.title}</div>`:""}
      ${t.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${t.caption}</div>`:""}
      ${n}
    </div>`}function B(e,t){const o=e||"Video";return`<span class="${"apps-media-badge"+(t==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function y(e,t,o,s,i){const d=i?B("Video"):"",a=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${e}${d}</div>
      ${t?`<div class="apps-q-hint">${t}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function wt(){const e=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(e)&&!window.MSStream?"ios":/android/i.test(e)?"android":"ios"}function S(e){const t=document.getElementById("appsView");if(!t)return;const o=(x.activeHotelId||"")+"|"+(x.activeHotelAppIcon||"")+"|"+(x.activeHotelDomain||"");e||t.dataset.appsKey!==o||!t.querySelector(".apps-page")?(Y(),t.dataset.appsKey=o):F()}function Y(){const e=document.getElementById("appsView");if(!e)return;const t=x.activeHotelName||"Your Hotel",o=x.activeHotelAppIcon||"",s=t.trim().charAt(0).toUpperCase()||"🏨",i=x.activeHotelDomain||"",d=i?"https://"+i:"#",a=i?"https://"+i+"/install":"#";function l(c){return JSON.stringify(c).replace(/"/g,"&quot;")}const n=v(r.guestHome,520),g=[{type:"image",src:r.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${t}</strong> — they tap it to book you or text you. No app store.`}],p=[{type:"image",src:r.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:r.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:r.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],b=[{type:"video",src:r.guestInstallVideo,poster:r.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],V=[{type:"image",src:r.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:r.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:r.guestMessageNotifVideo,poster:r.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],u=isStandaloneApp()||x.frontdeskInstalled,W=typeof Notification<"u"&&Notification.permission==="granted",E=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches),L=E?"Install on this phone":"Install Front Desk",U=E?"Install Front Desk on this phone first. Front Desk is this website saved to your phone. After that, guests can install your hotel and you can get booking alerts.":"Open this dashboard on the phone your staff uses and install Front Desk there. After that, guests can install your hotel, and booking/message alerts go to the property phone.",Q=[{type:"video",src:r.frontdeskInstallVideo,poster:r.frontdeskMessages,alt:"How to install Front Desk",title:"Install Front Desk on this device",caption:"Use your browser install option. No App Store. Takes about 3 seconds."},{type:"image",src:r.frontdeskMessages,alt:"Reply to guest",title:"You reply from Front Desk",caption:"Messages from guests show up in <strong>Bookings</strong>. Reply there — guests get it on their phone."}];let z;u&&W?z=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:u?z=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:z=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const X=u?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${L}</button>`,K=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',G="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",J=o?G+"background:#fff;border:1px solid var(--border);padding:0;":G,Z=o?`<img src="${o}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,tt=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${J}">
        ${Z}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${t}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="document.getElementById('appsAppIconInput').click()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change icon":"Upload icon"}</button>
      </div>
    </div>`,et=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${a!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${a==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,ot=a!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${a.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',it=`
    <div class="apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${o?`<img src="${o}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${s}</span>`}</div>
        <div class="apps-loop-name">${t}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,st=`
    <section class="apps-story">
      <div class="apps-story-kicker">Guest App</div>
      <h2 class="apps-story-title">Your hotel can be on your guest's home screen.</h2>
      <p class="apps-story-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>

      <div class="apps-story-line">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${X}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests scroll down, they see the Install button. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${K}</div>
      </div>

      <div class="apps-story-line">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,nt=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${n}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${l(b)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${y("What guests see on their phone","",l(p),0,!1)}
          ${y("How guests add your hotel","",l(b),0,!0)}
          ${y("Guest texts you, you text back","",l(V),0,!0)}
          ${y("Your app and theirs — side by side","",l(g),0,!1)}
        </div>
        ${d!=="#"?`<button onclick="window.open('${d}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,D=(x.editRooms||[]).find(c=>c&&(c.name||c.images&&c.images.length))||{},m=(D.images||[]).filter(c=>c&&c.url),at=m[0]?.url||"https://suitestay.clickinns.com/kingbedsuitestay.webp",rt=D.name||"King Suite",pt=m.length>1?`
    <div style="position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:5px;padding:5px 7px;border-radius:999px;background:rgba(0,0,0,0.28);">
      ${m.slice(0,5).map((c,N)=>`<span style="width:${N===0?"20px":"7px"};height:7px;border-radius:999px;background:${N===0?"#fff":"rgba(255,255,255,0.6)"};display:block;"></span>`).join("")}
    </div>`:"",dt=o?`<img src="${o}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;">`:`<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${s}</div>`,lt=u?"var(--green)":"#c5d5cc",ct=u?"1":".72",gt=u?"This is what guests tap after they scroll down your booking page.":"Install Front Desk first to turn this on for guests.",xt=`
    <div class="apps-step-card apps-guest-phone-card">
      <div style="padding:16px 18px 14px;">
        <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">What guests see on your booking page</div>
        <p style="font-size:13px;color:var(--text-muted);margin:0;line-height:1.55;">Room details come first. When guests scroll down, they see the Install button.</p>
      </div>
      <div style="background:#f8faf9;border-top:1px solid var(--border);padding:14px 18px 18px;">
        <div style="pointer-events:none;user-select:none;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;">
            <span style="display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#e8f5ee;border:1px solid #cfe6da;color:#1a5c3f;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:6px 10px;">Static guest preview</span>
          </div>
          <div style="background:#fff;border:1px solid rgba(226,232,240,0.9);border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="height:118px;position:relative;background:#111827;overflow:hidden;">
              <img src="${esc(at)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;opacity:.72;" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,24,39,0.08),rgba(17,24,39,0.42));"></div>
              ${m.length>1?`<div style="position:absolute;top:10px;right:10px;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,0.58);color:#fff;font-size:11px;font-weight:700;">${m.length} photos</div>`:""}
              ${pt}
            </div>
            <div style="padding:14px 16px 12px;">
              <div style="font-size:17px;font-weight:800;color:#1f2937;line-height:1.2;margin-bottom:4px;">${esc(rt)}</div>
              <div style="font-size:12px;color:#6b7280;line-height:1.35;">Room details appear above the guest install prompt.</div>
            </div>
          </div>
          <!-- 1:1 replica of InstallAppBanner, shown as a static preview. -->
          <div style="background:#fff;border:2px solid #cfe6da;border-radius:16px;padding:14px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.06);margin-top:12px;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${dt}
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:800;color:#1a1a2e;line-height:1.3;">Add ${t} to your home screen</div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.4;">Guests tap this to save your hotel to their phone.</div>
              </div>
            </div>
            <div aria-disabled="true" style="width:100%;margin-top:14px;padding:12px 16px;border-radius:10px;border:none;background:${lt};color:#fff;font-size:14px;font-weight:800;text-align:center;box-sizing:border-box;opacity:${ct};">Install</div>
            <div style="font-size:11px;color:#6b7280;line-height:1.45;text-align:center;margin-top:8px;">${gt}</div>
          </div>
        </div>
        ${a!=="#"?`
        <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-top:14px;">Go to direct booking page</button>
        <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.55;">Open the real guest page. Scroll down to see the same Install button guests use.</p>`:`
        <p style="font-size:12px;color:var(--text-muted);margin:14px 0 0;line-height:1.55;">Your direct booking domain is still setting up. Once it is ready, you can open the guest page from here.</p>`}
      </div>
    </div>`,M=c=>`
    <div class="apps-step-card"${c?' id="tour-fd-install-card"':""}>
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${u?"Front Desk — installed":"Install Front Desk"}</div>
      ${z}
    </div>`,P=c=>`
    <div class="apps-step-card"${c?' id="tour-guest-icon-section"':""}>
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${tt}
    </div>`,C=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${t}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${et}
      ${ot}
    </div>`,q=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${nt}
      </div>
    </details>`,ut=`
    ${M(!0)}
    ${P(!0)}
    ${C}
    ${guestBroadcastCardHtml()}
    ${q}`,ht=`
    <div class="apps-locked-tools" id="tour-fd-install-card">
      <div class="apps-locked-tools__content" aria-hidden="true">
        ${`
    ${M(!1)}
    ${P(!1)}
    ${C}
    ${guestBroadcastCardHtml()}
    ${q}`}
      </div>
      <div class="apps-locked-tools__overlay">
        <div class="apps-locked-tools__panel">
          <div class="apps-locked-tools__icon"><i data-lucide="lock-keyhole" style="width:20px;height:20px;"></i></div>
          <div class="apps-locked-tools__eyebrow">First step</div>
          <div class="apps-locked-tools__title">Install Front Desk first</div>
          <p>${U}</p>
          <button id="tour-fd-install-btn" onclick="handleInstallFrontdesk()">${L}</button>
          <button type="button" class="apps-video-teaser apps-locked-tools__video" onclick="appsOpenLightbox(${l(Q)},0)"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how (1 min)</span></button>
        </div>
      </div>
    </div>`,ft=`
    ${st}
    ${it}
    ${xt}
    ${u?ut:ht}`,bt=u?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";e.innerHTML=`
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
      .apps-story { padding-top:6px; }
      .apps-story-title { font-size:38px;max-width:760px; }
      .apps-story-copy { font-size:19px;max-width:720px; }
      .apps-story-line { padding-top:22px; }
      .apps-story-line-title { font-size:25px;max-width:720px; }
      .apps-story-line p { font-size:17px;max-width:720px; }
      .apps-story-actions { max-width:360px; }
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

    ${isPwaSimulated()?'<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.45;text-align:center;">📱 <strong>PWA preview</strong> — compact installed layout. Add <code style="font-size:11px;background:#ffedd5;padding:1px 5px;border-radius:4px;">?pwa=0</code> to the URL to exit.</div>':""}
    ${ft}

    <p class="apps-footnote">${bt}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),F()}async function F(){const e=document.getElementById("guestInstallStats");try{const t=await api("GET","/api/crm/guest-install-stats");if(!t.success)throw new Error(t.message||"Failed");if(guestPushSubscriberCount=t.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!e)return;const o=t.totals||{},s=t.installedBookings||0,i=o.views||0;if(!s&&!i){e.style.display="none",e.innerHTML="";return}e.style.display="block";const d=t.installRatePercent!=null?t.installRatePercent:0,a=Object.entries(t.byTouchpoint||{}).filter(function(n){return n[1].views||n[1].installed}).sort(function(n,g){return(g[1].installed||0)-(n[1].installed||0)}).slice(0,5),l=a.length?a.map(function(n){const g=n[0].replace(/-/g," "),p=n[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+g+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(p.views||0)+" views · "+(p.installed||0)+" installed</span></div>"}).join(""):"";e.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+d+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(l?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+l:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),e&&(e.style.display="none",e.innerHTML="")}}let H=[],h=0,k=!1;function _(e){const t=document.getElementById("appsTourLightbox");t&&(t._swipeStart&&t.removeEventListener("touchstart",t._swipeStart),t._swipeEnd&&t.removeEventListener("touchend",t._swipeEnd),t.remove()),document.body.style.overflow="";const o=k;k=!1;try{const s=typeof S=="function"?S:window.ensureAppsViewRendered;typeof s=="function"&&s(!0)}catch{}if(e&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||x.settingsTourActive)){const i=typeof showFinaleMockModal=="function"?showFinaleMockModal:window.showFinaleMockModal;if(typeof i=="function"){i();return}}}function O(e){const t=h+e;t<0||t>=H.length||(h=t,T())}function T(){const e=document.getElementById("appsTourLightbox");if(!e)return;const t=H[h],o=H.length,s=h>=o-1,i=`${h+1} / ${o}`,d=s?k?"Next — you're almost done":"Got it — show me":"Next →",a=t.type==="video"?B("1 min","light"):"",l=Array.from({length:o},(g,p)=>`<div style="width:7px;height:7px;border-radius:50%;background:${p===h?"#fff":"rgba(255,255,255,0.35)"};"></div>`).join("");let n="";t.type==="cta"?n=`<div style="width:100%;max-width:320px;padding:0 8px;box-sizing:border-box;">${t.ctaHtml}</div>`:t.type==="video"?n=`<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${w()}"
      poster="${t.poster||""}">
      <source src="${t.src}" type="video/mp4">
    </video>`:n=`<img src="${t.src}" alt="${t.alt||""}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${w()}">`,e.innerHTML=`
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${i}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">Skip</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${n}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">${t.title}${a}</div>
      ${t.caption?`<div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:14px;">${t.caption}</div>`:""}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${d}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${l}</div>
    </div>`,document.getElementById("appsTourNextBtn").onclick=()=>{if(s){const g=k;if(_(!0),!g){const p=document.getElementById("appsView");p&&p.scrollIntoView({behavior:"smooth",block:"start"})}}else h++,T()},document.getElementById("appsTourSkipBtn").onclick=()=>_(!0)}function kt(e){const t=e&&e.replay,o=e&&e.chainFromSettingsTour;if(k=!!o,!t&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox"))return;const s=x.activeHotelName||"Your Hotel",i=s.length>13?s.slice(0,13)+"…":s,d=s.trim().charAt(0).toUpperCase(),a=x.activeHotelAppIcon||"",l=a?`<div style="width:52px;height:52px;border-radius:14px;background:#fff;padding:8px;box-sizing:border-box;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="${a}" alt="${s}" style="width:100%;height:100%;object-fit:contain;"></div>`:`<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${d}</div>`;H=[{type:"video",src:r.guestInstallVideo,poster:v(r.guestHome,400),title:"Guests save your hotel to their phone",caption:`They tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Tap <strong>Change your icon</strong> in Guest App so they see <strong>${i}</strong>.`},{type:"image",src:v(r.guestHome,520),alt:"Guest home screen",title:"What guests see after they install",caption:"Their stay info, direct booking, and a way to message you — all from one icon on their phone."},{type:"cta",title:"In Guest App",caption:"",ctaHtml:`
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
            ${l}
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Your logo on their home screen</div>
              <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.45;">Upload at the top of <strong>Guest App</strong>. Tap <strong>Help</strong> for the full walkthrough.</p>
            </div>
          </div>
        </div>`}],h=0,j(),_(!1);const n=document.createElement("div");n.id="appsTourLightbox",n.style.cssText=["position:fixed;inset:0;z-index:102001;background:#000;","display:flex;flex-direction:column;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join("");let g=0;n._swipeStart=p=>{g=p.changedTouches[0].clientX},n._swipeEnd=p=>{const b=p.changedTouches[0].clientX-g;Math.abs(b)>50&&O(b<0?1:-1)},n.addEventListener("touchstart",n._swipeStart,{passive:!0}),n.addEventListener("touchend",n._swipeEnd,{passive:!0}),document.body.appendChild(n),document.body.style.overflow="hidden",T()}const _t={appsCloseLightbox:j,appsCloudinaryFull:R,appsCloudinaryImg:v,appsLbNav:$,appsLbRender:A,appsOpenLightbox:vt,appsPhoneImgStyle:w,appsQuestionRow:y,appsTourClose:_,appsTourNav:O,appsTourRender:T,appsVideoBadgeHtml:B,detectAppPlatform:wt,ensureAppsViewRendered:S,loadGuestInstallStats:F,renderAppsView:Y,startAppsTour:kt};function Ht(){mt(_t)}export{_t as default,Ht as install};
