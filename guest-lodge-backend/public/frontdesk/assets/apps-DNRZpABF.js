import{c,e as N}from"./settings-MjNoAsgL.js";const i={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",bookingNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_21-14-19_1_eckwlk.mp4",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4",frontdeskInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_19-49-38_1_tc1bzm.mp4",guestBroadcastVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/v1781196304/ScreenRecording_06-11-2026_19-41-56_1_kjgudg.mp4"},q="32px";function u(o,e){return o.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function b(o){return`border-radius:${q};box-shadow:0 10px 36px rgba(0,0,0,0.22);${o||""}`}function S(o){const e=Math.min(window.devicePixelRatio||1,2),t=Math.round(Math.min(window.screen.width*e,1600));return o.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${t}/`)}let w=[],m=0;function P(o,e){y(!1),w=o,m=e||0;let t=document.getElementById("appsLightbox");if(!t){t=document.createElement("div"),t.id="appsLightbox",t.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(t),document.body.style.overflow="hidden",t._keyHandler=n=>{n.key==="ArrowRight"||n.key==="ArrowDown"?v(1):n.key==="ArrowLeft"||n.key==="ArrowUp"?v(-1):n.key==="Escape"&&$()},document.addEventListener("keydown",t._keyHandler);let a=0;t.addEventListener("touchstart",n=>{a=n.changedTouches[0].clientX},{passive:!0}),t.addEventListener("touchend",n=>{const p=n.changedTouches[0].clientX-a;Math.abs(p)>50&&v(p<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",I()}function $(){const o=document.getElementById("appsLightbox");o&&(document.removeEventListener("keydown",o._keyHandler),o.remove(),document.body.style.overflow="")}function v(o){const e=w.length;e<=1||(m=(m+o+e)%e,I())}function I(){const o=document.getElementById("appsLightbox");if(!o)return;const e=w[m],t=w.length,a=e.type!=="video",n=t>1?`${m+1} / ${t}`:"",p=a?`<img src="${S(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${b()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${b()}"
          ${e.poster?`poster="${u(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,r=t>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",s=t>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",d=t>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:t},(g,l)=>`<div onclick="appsOpenLightbox(_appsLbItems,${l})" style="width:7px;height:7px;border-radius:50%;background:${l===m?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";o.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${n}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${p}
      ${r}${s}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${d}
    </div>`}function x(o,e,t,a){return`<button type="button" class="apps-q" onclick="appsOpenLightbox(${t},${a})">
    <div class="apps-q-text">
      <div class="apps-q-title">${o}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:""}
    </div>
    <span class="apps-q-chevron" aria-hidden="true">›</span>
  </button>`}function F(){const o=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(o)&&!window.MSStream?"ios":/android/i.test(o)?"android":"ios"}function Y(o){const e=document.getElementById("appsView");if(!e)return;const t=(c.activeHotelId||"")+"|"+(c.activeHotelAppIcon||"")+"|"+(c.activeHotelDomain||"");o||e.dataset.appsKey!==t||!e.querySelector(".apps-page")?(T(),e.dataset.appsKey=t):_()}function T(){const o=document.getElementById("appsView");if(!o)return;const e=c.activeHotelName||"Your Hotel",t=c.activeHotelAppIcon||"",a=e.trim().charAt(0).toUpperCase()||"🏨",n=c.activeHotelDomain||"",p=n?"https://"+n:"#",r=n?"https://"+n+"/install":"#",s=r!=="#"?"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(r):"",d=isStandaloneApp()||c.frontdeskInstalled,g=typeof Notification<"u"&&Notification.permission==="granted";let l;d&&g?l=`<div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">You're all set!</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Front Desk is on your phone. When someone books, your phone will buzz.</div></div>
    </div>`:d?l=`<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">You're almost done — tap below so your phone buzzes when a guest books you.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button>`:l=`<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">Save <strong>Front Desk</strong> to your phone's home screen — same site you're on now, one tap away. Your phone will buzz when someone books. Takes 3 seconds.</p>
      <button onclick="handleInstallFrontdesk()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Put Front Desk on my phone</button>`;const E=[{type:"image",src:i.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],j=[{type:"image",src:i.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:i.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:i.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],L=[{type:"video",src:i.guestInstallVideo,poster:i.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],A=[{type:"video",src:i.bookingNotifVideo,poster:i.homeScreen,alt:"Booking alert on phone",title:"When someone books you, your phone buzzes",caption:"You find out right away — before email, before Airbnb tells you."}],B=[{type:"image",src:i.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:i.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:i.guestMessageNotifVideo,poster:i.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],M=[{type:"video",src:i.frontdeskInstallVideo,poster:i.frontdeskMessages,alt:"How to add Front Desk",title:"How to put Front Desk on your phone",caption:"Same steps as tapping <strong>Put Front Desk on my phone</strong> at the top of this page."},{type:"image",src:i.frontdeskMessages,alt:"Reply to guest",title:"You reply from your phone",caption:"Messages from guests show up in <strong>Bookings</strong>. Tap reply — they get it on their phone."}];function f(D){return JSON.stringify(D).replace(/"/g,"&quot;")}o.innerHTML=`
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-headline { font-size:20px;font-weight:800;color:var(--text);line-height:1.3;margin:0 0 8px; }
    .apps-intro { font-size:14px;color:var(--text-muted);line-height:1.55;margin:0 0 22px; }
    .apps-step-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px; }
    .apps-step-card { background:var(--white);border:1.5px solid var(--border);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:var(--shadow); }
    .apps-step-title { font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px;line-height:1.35; }
    .apps-icon-card { display:flex;align-items:center;gap:14px; }
    .apps-how-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin:22px 0 10px; }
    .apps-how-sub { font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.45; }
    .apps-q-list { display:flex;flex-direction:column;gap:8px;margin-bottom:20px; }
    .apps-q { display:flex;align-items:center;justify-content:space-between;width:100%;padding:15px 16px;border:none;background:var(--white);border:1.5px solid var(--border);border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;box-shadow:var(--shadow);transition:background 0.15s,border-color 0.15s; }
    .apps-q:active { background:var(--bg); border-color:var(--green); }
    .apps-q-text { flex:1;min-width:0; }
    .apps-q-title { font-size:14px;font-weight:700;color:var(--text);line-height:1.35; }
    .apps-q-hint { font-size:12px;color:var(--text-muted);margin-top:3px;line-height:1.45; }
    .apps-q-chevron { font-size:20px;color:var(--green);flex-shrink:0;margin-left:12px;line-height:1;font-weight:700; }
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
  </style>

  <div class="apps-page">

    <div id="guestInstallStats" class="apps-step-card" style="margin-bottom:14px;padding:14px 16px;">
      <div class="loading" style="padding:8px 0;"><div class="logo-sprite-bounce"></div></div>
    </div>

    <h2 class="apps-headline">Guest app &amp; your phone</h2>
    <p class="apps-intro"><strong>Step 1 — you:</strong> save Front Desk to your phone (booking alerts). <strong>Step 2 — guests:</strong> they save <strong>${e}</strong> to their home screen to message you and book direct.</p>
    <button type="button" class="apps-tour-replay" onclick="startAppsTour({replay:true})">▶ Watch how it works</button>

    <div class="apps-step-label">Step 1</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Put Front Desk on your phone</div>
      ${l}
    </div>

    <div class="apps-step-label">Step 2</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Upload your hotel logo</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.45;">Guests see this icon when they save your hotel to their phone.</p>
      <div class="apps-icon-card">
        <div id="appsAppIconPreview" style="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);background:${t?"#fff":"var(--green)"};color:#fff;font-size:24px;font-weight:800;">
          ${t?`<img src="${t}" alt="Hotel logo" style="width:100%;height:100%;object-fit:cover;">`:a}
        </div>
        <div style="flex:1;min-width:0;">
          <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
          <button type="button" onclick="document.getElementById('appsAppIconInput').click()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${t?"Change logo":"Upload logo"}</button>
        </div>
      </div>
    </div>

    <div class="apps-step-label">Step 3</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Get guests on their phones</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.45;">At check-in, show a full-screen QR. Guests tap <strong>Add to Home Screen</strong> — your hotel lands on their phone like an app.</p>
      <button type="button" onclick="showCheckinQrOverlay()" style="width:100%;padding:13px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">📲 Show guest app QR</button>
      ${r!=="#"?`
      <details class="apps-fold" style="margin-top:12px;margin-bottom:0;box-shadow:none;">
        <summary class="apps-fold-summary">
          <div><div class="apps-fold-title">Share install link</div><div class="apps-fold-meta">Copy link, room cards, notify guests</div></div>
          <span class="apps-fold-chevron" aria-hidden="true">›</span>
        </summary>
        <div class="apps-fold-body">
          <div style="margin-top:12px;margin-bottom:12px;">
            <input type="text" value="${r}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:11px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="padding:8px 14px;border-radius:8px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">Copy link</button>
              <button type="button" onclick="prefillGuestInstallBroadcast()" style="padding:8px 14px;border-radius:8px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Notify guests</button>
            </div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:10px 12px;font-size:11px;color:var(--text-muted);line-height:1.45;margin-bottom:12px;">
            <strong style="color:var(--text);">Room card:</strong> <em>"Scan to message us &amp; book direct — ${e}"</em>
          </div>
          ${s?`<div style="text-align:center;"><img src="${s}" alt="Guest install QR" width="100" height="100" style="border-radius:10px;border:1px solid var(--border);"></div>`:""}
        </div>
      </details>`:'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>'}
    </div>

    <details class="apps-fold">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">How does it work?</div><div class="apps-fold-meta">6 topics · tap for photos &amp; videos</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        <div class="apps-q-list">
          ${x("When someone books you, your phone buzzes","",f(A),0)}
          ${x("What guests see on their phone","",f(j),0)}
          ${x("Guest texts you, you text back","",f(B),0)}
          ${x("How guests add your hotel","",f(L),0)}
          ${x("Your app and theirs — side by side","",f(E),0)}
          ${x("Put Front Desk on your phone","",f(M),0)}
        </div>
      </div>
    </details>

    <details class="apps-fold">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Notify all guests at once</div><div class="apps-fold-meta">Sale, event, or check-in reminder</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        <div style="margin-top:12px;margin-bottom:8px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Title</div>
          <input type="text" id="guest-broadcast-title" value="${e.replace(/"/g,"&quot;")}" maxlength="120" placeholder="e.g. Jack's Inn" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Message</div>
          <textarea id="guest-broadcast-body" maxlength="500" placeholder="e.g. Pool is open until 10pm tonight!" style="width:100%;min-height:64px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <button id="guest-broadcast-btn" onclick="sendGuestBroadcast()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send notification</button>
        <p id="guest-broadcast-result" style="font-size:12px;color:var(--green);margin:8px 0 0;text-align:center;font-weight:600;"></p>
        <video autoplay loop muted playsinline webkit-playsinline preload="metadata" style="width:100%;max-width:240px;height:auto;display:block;margin:14px auto 0;${b()}" poster="${u(i.guestMessagesImg,360)}">
          <source src="${i.guestBroadcastVideo}" type="video/mp4">
        </video>
      </div>
    </details>

    ${p!=="#"?`<button onclick="window.open('${p}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}
    <p class="apps-footnote">iPhone &amp; Android · no app store · no extra fees</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),_()}async function _(){const o=document.getElementById("guestInstallStats");if(o)try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");const t=e.totals||{},a=e.installRatePercent!=null?e.installRatePercent:0,n=Object.entries(e.byTouchpoint||{}).filter(function(r){return r[1].views||r[1].installed}).sort(function(r,s){return(s[1].installed||0)-(r[1].installed||0)}).slice(0,5),p=n.length?n.map(function(r){const s=r[0].replace(/-/g," "),d=r[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+s+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(d.views||0)+" views · "+(d.installed||0)+" installed</span></div>"}).join(""):'<div style="font-size:12px;color:var(--text-muted);">No install activity yet — show the <strong>Guest app QR</strong> at check-in.</div>';o.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+a+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+(e.installedBookings||0)+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+(t.views||0)+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div><div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+p}catch{o.innerHTML='<div style="font-size:12px;color:var(--text-muted);">Install stats unavailable right now.</div>'}}let k=[],h=0;function y(o){const e=document.getElementById("appsTourLightbox");e&&(e._swipeStart&&e.removeEventListener("touchstart",e._swipeStart),e._swipeEnd&&e.removeEventListener("touchend",e._swipeEnd),e.remove()),document.body.style.overflow="",o&&localStorage.setItem("appsTourDone","1")}function H(o){const e=h+o;e<0||e>=k.length||(h=e,z())}function z(){const o=document.getElementById("appsTourLightbox");if(!o)return;const e=k[h],t=k.length,a=h>=t-1,n=`${h+1} / ${t}`,p=a?"Got it — show me":"Next →",r=Array.from({length:t},(d,g)=>`<div style="width:7px;height:7px;border-radius:50%;background:${g===h?"#fff":"rgba(255,255,255,0.35)"};"></div>`).join("");let s="";e.type==="cta"?s=`<div style="width:100%;max-width:320px;padding:0 8px;box-sizing:border-box;">${e.ctaHtml}</div>`:e.type==="video"?s=`<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${b()}"
      poster="${e.poster||""}">
      <source src="${e.src}" type="video/mp4">
    </video>`:s=`<img src="${e.src}" alt="${e.alt||""}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${b()}">`,o.innerHTML=`
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${n}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">Skip</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${s}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;">${e.title}</div>
      ${e.caption?`<div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:14px;">${e.caption}</div>`:""}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${p}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${r}</div>
    </div>`,document.getElementById("appsTourNextBtn").onclick=()=>{if(a){y(!0);const d=document.getElementById("appsView");d&&d.scrollIntoView({behavior:"smooth",block:"start"})}else h++,z()},document.getElementById("appsTourSkipBtn").onclick=()=>y(!0)}function G(o){if(!(o&&o.replay)&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox"))return;const t=c.activeHotelName||"Your Hotel",a=t.length>13?t.slice(0,13)+"…":t,n=t.trim().charAt(0).toUpperCase(),p=c.activeHotelAppIcon||"",r=p?`<img src="${p}" alt="${t}" style="width:52px;height:52px;border-radius:14px;object-fit:cover;">`:`<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${n}</div>`;k=[{type:"video",src:i.frontdeskInstallVideo,poster:u(i.frontdeskMessages,400),title:"Put Front Desk on your phone",caption:"You're on <strong>Front Desk</strong> right now. Save it to your home screen — works like an app, no app store. Same steps as <strong>Put Front Desk on my phone</strong> at the top of this page."},{type:"image",src:u(i.homeScreen,520),alt:"Two apps on home screen",title:"Your guests can save your hotel too",caption:`You get <strong>Front Desk</strong>. They get <strong>${t}</strong>. Both sit on the home screen — like real apps.`},{type:"video",src:i.guestInstallVideo,poster:u(i.guestHome,400),title:"How your guests save your hotel",caption:`They tap <strong>Add to Home Screen</strong> on your booking website. Upload your logo on this page so they see <strong>${a}</strong>.`},{type:"video",src:i.bookingNotifVideo,poster:u(i.homeScreen,400),title:"When someone books you, your phone buzzes",caption:"That's why you put Front Desk on your phone — you find out right away, before email, before Airbnb."},{type:"video",src:i.guestBroadcastVideo,poster:u(i.guestMessagesImg,400),title:"You can notify all your guests at once",caption:"Once they have your hotel on their phone, notify everyone — a sale, an event, or a check-in reminder. Scroll down on this page to try it."},{type:"cta",title:"Now do these two things",caption:"",ctaHtml:`
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">STEP 1</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Put Front Desk on your phone</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Tap <strong>Put Front Desk on my phone</strong> at the top when you close this.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:8px;">STEP 2</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${r}
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Upload your hotel logo</div>
              <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.45;">So guests see <strong>${a}</strong> — not a random letter.</p>
            </div>
          </div>
        </div>`}],h=0,$(),y(!1);const s=document.createElement("div");s.id="appsTourLightbox",s.style.cssText=["position:fixed;inset:0;z-index:102001;background:#000;","display:flex;flex-direction:column;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join("");let d=0;s._swipeStart=g=>{d=g.changedTouches[0].clientX},s._swipeEnd=g=>{const l=g.changedTouches[0].clientX-d;Math.abs(l)>50&&H(l<0?1:-1)},s.addEventListener("touchstart",s._swipeStart,{passive:!0}),s.addEventListener("touchend",s._swipeEnd,{passive:!0}),document.body.appendChild(s),document.body.style.overflow="hidden",z()}const R={appsCloseLightbox:$,appsCloudinaryFull:S,appsCloudinaryImg:u,appsLbNav:v,appsLbRender:I,appsOpenLightbox:P,appsPhoneImgStyle:b,appsQuestionRow:x,appsTourClose:y,appsTourNav:H,appsTourRender:z,detectAppPlatform:F,ensureAppsViewRendered:Y,loadGuestInstallStats:_,renderAppsView:T,startAppsTour:G};function C(){N(R)}export{R as default,C as install};
