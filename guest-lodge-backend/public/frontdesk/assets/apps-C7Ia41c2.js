import{f as m,e as D}from"./settings-BlBMC3y7.js";const i={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",bookingNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_21-14-19_1_eckwlk.mp4",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4",frontdeskInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_19-49-38_1_tc1bzm.mp4",guestBroadcastVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/v1781196304/ScreenRecording_06-11-2026_19-41-56_1_kjgudg.mp4"},M="32px";function l(t,e){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function f(t){return`border-radius:${M};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function I(t){const e=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*e,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let w=[],x=0;function F(t,e){y(!1),w=t,x=e||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=n=>{n.key==="ArrowRight"||n.key==="ArrowDown"?v(1):n.key==="ArrowLeft"||n.key==="ArrowUp"?v(-1):n.key==="Escape"&&$()},document.addEventListener("keydown",o._keyHandler);let p=0;o.addEventListener("touchstart",n=>{p=n.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",n=>{const s=n.changedTouches[0].clientX-p;Math.abs(s)>50&&v(s<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",_()}function $(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function v(t){const e=w.length;e<=1||(x=(x+t+e)%e,_())}function _(){const t=document.getElementById("appsLightbox");if(!t)return;const e=w[x],o=w.length,p=e.type!=="video",n=o>1?`${x+1} / ${o}`:"",s=p?`<img src="${I(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${f()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${f()}"
          ${e.poster?`poster="${l(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,r=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",a=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",d=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(b,g)=>`<div onclick="appsOpenLightbox(_appsLbItems,${g})" style="width:7px;height:7px;border-radius:50%;background:${g===x?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${n}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${s}
      ${r}${a}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${d}
    </div>`}function u(t,e,o,p){return`<button type="button" class="apps-q" onclick="appsOpenLightbox(${o},${p})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:""}
    </div>
    <span class="apps-q-chevron" aria-hidden="true">›</span>
  </button>`}function q(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function Y(){const t=document.getElementById("appsView");if(!t)return;const e=typeof m.activeHotelName<"u"&&m.activeHotelName?activeHotelName:"Your Hotel",o=activeHotelAppIcon,p=e.trim().charAt(0).toUpperCase()||"🏨",n=typeof m.activeHotelDomain<"u"&&m.activeHotelDomain?activeHotelDomain:"",s=n?"https://"+n:"#",r=n?"https://"+n+"/install":"#",a=r!=="#"?"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(r):"",d=isStandaloneApp()||m.frontdeskInstalled,b=typeof Notification<"u"&&Notification.permission==="granted";let g;d&&b?g=`<div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">You're all set!</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Front Desk is on your phone. When someone books, your phone will buzz.</div></div>
    </div>`:d?g=`<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">You're almost done — tap below so your phone buzzes when a guest books you.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button>`:g=`<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">Save <strong>Front Desk</strong> to your phone's home screen — same site you're on now, one tap away. Your phone will buzz when someone books. Takes 3 seconds.</p>
      <button onclick="handleInstallFrontdesk()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Put Front Desk on my phone</button>`;const H=[{type:"image",src:i.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check fd.bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],j=[{type:"image",src:i.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:i.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:i.guestMessages,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],E=[{type:"video",src:i.guestInstallVideo,poster:i.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],L=[{type:"video",src:i.bookingNotifVideo,poster:i.homeScreen,alt:"Booking alert on phone",title:"When someone books you, your phone buzzes",caption:"You find out right away — before email, before Airbnb tells you."}],N=[{type:"image",src:i.guestMessages,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:i.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:i.guestMessageNotifVideo,poster:i.guestMessages,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],A=[{type:"video",src:i.frontdeskInstallVideo,poster:i.frontdeskMessages,alt:"How to add Front Desk",title:"How to put Front Desk on your phone",caption:"Same steps as tapping <strong>Put Front Desk on my phone</strong> at the top of this page."},{type:"image",src:i.frontdeskMessages,alt:"Reply to guest",title:"You reply from your phone",caption:"Messages from guests show up in <strong>Bookings</strong>. Tap reply — they get it on their phone."}];function h(B){return JSON.stringify(B).replace(/"/g,"&quot;")}t.innerHTML=`
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
  </style>

  <div class="apps-page">

    <div id="guestInstallStats" class="apps-step-card" style="margin-bottom:14px;padding:14px 16px;">
      <div style="font-size:12px;color:var(--text-muted);">Loading guest install stats…</div>
    </div>

    <h2 class="apps-headline">You on your phone. Guests on theirs.</h2>
    <p class="apps-intro">You're on <strong>Front Desk</strong> right now. Save it to your phone's home screen — it works like an app, but you don't need the app store. When someone books you, your phone buzzes. Your guests can save <strong>${e}</strong> the same way — just upload your logo in Step 2 so they recognize you on their phone.</p>

    <div class="apps-step-label">Step 1 — start here</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Put Front Desk on your phone</div>
      ${g}
    </div>

    <div class="apps-step-label">Step 2</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Upload your hotel logo</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">When your guests save your hotel to their phone, this is the picture they see. Upload your logo or a photo of your property.</p>
      <div class="apps-icon-card">
        <div id="appsAppIconPreview" style="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);background:${o?"#fff":"var(--green)"};color:#fff;font-size:24px;font-weight:800;">
          ${o?`<img src="${o}" alt="Hotel logo" style="width:100%;height:100%;object-fit:cover;">`:p}
        </div>
        <div style="flex:1;min-width:0;">
          <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
          <button type="button" onclick="document.getElementById('appsAppIconInput').click()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change logo":"Upload logo"}</button>
        </div>
      </div>
    </div>

    <div class="apps-step-label">Step 3 — get guests on their phones</div>
    <div class="apps-step-card">
      <div class="apps-step-title">Help guests install your hotel app</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 10px;line-height:1.55;">After someone books, they get an email with an <strong>Add to Home Screen</strong> link. At check-in, tap <strong>📲 Check-in QR</strong> at the top of Front Desk — full-screen QR, one tap.</p>
      <button type="button" onclick="showCheckinQrOverlay()" style="width:100%;padding:13px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:14px;">📲 Show check-in QR (full screen)</button>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">For room cards, print the generic link below (no guest name). For a specific guest at the desk, use the button above and pick <strong>This guest</strong>.</p>
      ${r!=="#"?`
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;">
        ${a?`<img src="${a}" alt="Guest install QR" width="120" height="120" style="border-radius:10px;border:1px solid var(--border);flex-shrink:0;">`:""}
        <div style="flex:1;min-width:180px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Guest install link</div>
          <input type="text" value="${r}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
          <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="padding:8px 14px;border-radius:8px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-right:6px;">Copy link</button>
          <button type="button" onclick="prefillGuestInstallBroadcast()" style="padding:8px 14px;border-radius:8px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Notify guests</button>
        </div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:12px;font-size:12px;color:var(--text-muted);line-height:1.55;">
        <strong style="color:var(--text);">Room card idea:</strong> Print the QR with text: <em>"Scan to message us &amp; book direct — ${e}"</em>
      </div>`:'<p style="font-size:12px;color:var(--text-muted);margin:0;">Your booking domain is still setting up — check back shortly.</p>'}
    </div>

    <div class="apps-how-label">Want to see how it works?</div>
    <p class="apps-how-sub">Tap any row below — you'll see real photos and short videos from a real phone.</p>

    <div class="apps-q-list">
      ${u("When someone books you, your phone buzzes","See what that looks like",h(L),0)}
      ${u("What your guests see on their phone","Home, book a room, message you",h(j),0)}
      ${u("When a guest texts you, you text back","Like WiFi questions",h(N),0)}
      ${u("How your guests put your hotel on their phone","They tap one button on your website",h(E),0)}
      ${u("Your app and theirs — same home screen","Side by side",h(H),0)}
      ${u("Need help putting Front Desk on your phone?","Watch a short video",h(A),0)}
    </div>

    <div class="apps-broadcast-card">
      <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:4px;">Notify all your guests at once</div>
      <p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">Once your guests have your hotel on their phone, you can notify everyone at once. Great for a sale, an event, or reminding them check-in is at 3pm.</p>
      <div style="margin-bottom:8px;">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">Notification title</div>
        <input type="text" id="guest-broadcast-title" value="${e.replace(/"/g,"&quot;")}" maxlength="120" placeholder="e.g. Jack's Inn" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">What you're notifying them about</div>
        <textarea id="guest-broadcast-body" maxlength="500" placeholder="e.g. Pool is open until 10pm tonight!" style="width:100%;min-height:72px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
      </div>
      <button id="guest-broadcast-btn" onclick="sendGuestBroadcast()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Notify all guests</button>
      <p id="guest-broadcast-result" style="font-size:12px;color:var(--green);margin:8px 0 0;text-align:center;font-weight:600;"></p>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
        <p style="font-size:11px;color:var(--text-muted);margin:0 0 10px;line-height:1.45;text-align:center;">This is what pops up on their phone when you notify them:</p>
        <video autoplay loop muted playsinline webkit-playsinline preload="metadata" style="width:100%;max-width:280px;height:auto;display:block;margin:0 auto;${f()}" poster="${l(i.guestMessages,360)}">
          <source src="${i.guestBroadcastVideo}" type="video/mp4">
        </video>
      </div>
    </div>

    ${s!=="#"?`<button onclick="window.open('${s}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">See what your guests see on your website ↗</button>`:""}
    <p class="apps-footnote">Works on your iPhone or Android. No app store. No extra fees.</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),S()}async function S(){const t=document.getElementById("guestInstallStats");if(t)try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");const o=e.totals||{},p=e.installRatePercent!=null?e.installRatePercent:0,n=Object.entries(e.byTouchpoint||{}).filter(function(r){return r[1].views||r[1].installed}).sort(function(r,a){return(a[1].installed||0)-(r[1].installed||0)}).slice(0,5),s=n.length?n.map(function(r){const a=r[0].replace(/-/g," "),d=r[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+a+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(d.views||0)+" views · "+(d.installed||0)+" installed</span></div>"}).join(""):'<div style="font-size:12px;color:var(--text-muted);">No install activity yet — try the check-in QR at the desk.</div>';t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+p+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of fd.bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+(e.installedBookings||0)+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+(o.views||0)+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div><div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+s}catch{t.innerHTML='<div style="font-size:12px;color:var(--text-muted);">Install stats unavailable right now.</div>'}}let k=[],c=0;function y(t){const e=document.getElementById("appsTourLightbox");e&&(e._swipeStart&&e.removeEventListener("touchstart",e._swipeStart),e._swipeEnd&&e.removeEventListener("touchend",e._swipeEnd),e.remove()),document.body.style.overflow="",t&&localStorage.setItem("appsTourDone","1")}function T(t){const e=c+t;e<0||e>=k.length||(c=e,z())}function z(){const t=document.getElementById("appsTourLightbox");if(!t)return;const e=k[c],o=k.length,p=c>=o-1,n=`${c+1} / ${o}`,s=p?"Got it — show me":"Next →",r=Array.from({length:o},(d,b)=>`<div style="width:7px;height:7px;border-radius:50%;background:${b===c?"#fff":"rgba(255,255,255,0.35)"};"></div>`).join("");let a="";e.type==="cta"?a=`<div style="width:100%;max-width:320px;padding:0 8px;box-sizing:border-box;">${e.ctaHtml}</div>`:e.type==="video"?a=`<video autoplay loop muted playsinline webkit-playsinline preload="metadata"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;${f()}"
      poster="${e.poster||""}">
      <source src="${e.src}" type="video/mp4">
    </video>`:a=`<img src="${e.src}" alt="${e.alt||""}" loading="eager" decoding="async"
      style="max-width:100%;max-height:min(50dvh,440px);width:auto;height:auto;display:block;object-fit:contain;${f()}">`,t.innerHTML=`
    <div style="flex-shrink:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 16px 10px;box-sizing:border-box;">
      <div style="font-size:12px;color:rgba(255,255,255,0.55);font-weight:600;">${n}</div>
      <button type="button" id="appsTourSkipBtn" style="background:rgba(255,255,255,0.12);border:none;color:rgba(255,255,255,0.8);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:8px 14px;border-radius:20px;">Skip</button>
    </div>
    <div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:0 16px;box-sizing:border-box;overflow:hidden;">
      ${a}
    </div>
    <div style="flex-shrink:0;width:100%;max-width:400px;margin:0 auto;padding:12px 20px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;">
      <div style="font-size:17px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:6px;">${e.title}</div>
      ${e.caption?`<div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:14px;">${e.caption}</div>`:""}
      <button type="button" id="appsTourNextBtn" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">${s}</button>
      <div style="display:flex;gap:6px;justify-content:center;">${r}</div>
    </div>`,document.getElementById("appsTourNextBtn").onclick=()=>{if(p){y(!0);const d=document.getElementById("appsView");d&&d.scrollIntoView({behavior:"smooth",block:"start"})}else c++,z()},document.getElementById("appsTourSkipBtn").onclick=()=>y(!0)}function P(){if(localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox"))return;const t=typeof activeHotelName<"u"&&activeHotelName?activeHotelName:"Your Hotel",e=t.length>13?t.slice(0,13)+"…":t,o=t.trim().charAt(0).toUpperCase(),p=typeof activeHotelAppIcon<"u"?activeHotelAppIcon:"",n=p?`<img src="${p}" alt="${t}" style="width:52px;height:52px;border-radius:14px;object-fit:cover;">`:`<div style="width:52px;height:52px;border-radius:14px;background:#2E7D5B;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${o}</div>`;k=[{type:"video",src:i.frontdeskInstallVideo,poster:l(i.frontdeskMessages,400),title:"Put Front Desk on your phone",caption:"You're on <strong>Front Desk</strong> right now. Save it to your home screen — works like an app, no app store. Same steps as <strong>Put Front Desk on my phone</strong> at the top of this page."},{type:"image",src:l(i.homeScreen,520),alt:"Two apps on home screen",title:"Your guests can save your hotel too",caption:`You get <strong>Front Desk</strong>. They get <strong>${t}</strong>. Both sit on the home screen — like real apps.`},{type:"video",src:i.guestInstallVideo,poster:l(i.guestHome,400),title:"How your guests save your hotel",caption:`They tap <strong>Add to Home Screen</strong> on your booking website. Upload your logo on this page so they see <strong>${e}</strong>.`},{type:"video",src:i.bookingNotifVideo,poster:l(i.homeScreen,400),title:"When someone books you, your phone buzzes",caption:"That's why you put Front Desk on your phone — you find out right away, before email, before Airbnb."},{type:"video",src:i.guestBroadcastVideo,poster:l(i.guestMessages,400),title:"You can notify all your guests at once",caption:"Once they have your hotel on their phone, notify everyone — a sale, an event, or a check-in reminder. Scroll down on this page to try it."},{type:"cta",title:"Now do these two things",caption:"",ctaHtml:`
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:4px;">STEP 1</div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Put Front Desk on your phone</div>
          <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.5;">Tap <strong>Put Front Desk on my phone</strong> at the top when you close this.</p>
        </div>
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px;text-align:left;">
          <div style="font-size:11px;font-weight:800;color:#4CAF7D;margin-bottom:8px;">STEP 2</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${n}
            <div>
              <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Upload your hotel logo</div>
              <p style="font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.45;">So guests see <strong>${e}</strong> — not a random letter.</p>
            </div>
          </div>
        </div>`}],c=0,$(),y(!1);const s=document.createElement("div");s.id="appsTourLightbox",s.style.cssText=["position:fixed;inset:0;z-index:102001;background:#000;","display:flex;flex-direction:column;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join("");let r=0;s._swipeStart=a=>{r=a.changedTouches[0].clientX},s._swipeEnd=a=>{const d=a.changedTouches[0].clientX-r;Math.abs(d)>50&&T(d<0?1:-1)},s.addEventListener("touchstart",s._swipeStart,{passive:!0}),s.addEventListener("touchend",s._swipeEnd,{passive:!0}),document.body.appendChild(s),document.body.style.overflow="hidden",z()}const R={appsCloseLightbox:$,appsCloudinaryFull:I,appsCloudinaryImg:l,appsLbNav:v,appsLbRender:_,appsOpenLightbox:F,appsPhoneImgStyle:f,appsQuestionRow:u,appsTourClose:y,appsTourNav:T,appsTourRender:z,detectAppPlatform:q,loadGuestInstallStats:S,renderAppsView:Y,startAppsTour:P};function G(){D(R)}export{R as default,G as install};
