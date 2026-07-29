import{c as a,a as kt,b as Tt,e as $t}from"./settings-x53CwbLy.js";function z(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function K(...t){return z("ensureAppsViewRendered")?.(...t)}function Q(...t){return z("showFinaleMockModal")?.(...t)}function X(...t){return z("finishTourHydration")?.(...t)}function Z(...t){return z("goLive")?.(...t)}function J(...t){return z("toast")?.(...t)}function zt(...t){return z("appsCloseLightbox")?.(...t)}let F=[],c=0,L=!1,B=null,D=null,H=null,k=null;function St(){if(document.getElementById("frontdeskAppsTourStyle"))return;const t=document.createElement("style");t.id="frontdeskAppsTourStyle",t.textContent=`
    #appsTourLightbox {
      -webkit-backdrop-filter: blur(2.5px);
      backdrop-filter: blur(2.5px);
      animation: appsTourOverlayIn 0.18s ease-out;
    }
    #appsTourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .apps-tour-panel {
      width: 100%;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.26);
      max-height: calc(100vh - 28px);
      overflow-y: auto;
      animation: appsTourPanelIn 0.2s ease-out;
    }
    .apps-tour-progress {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .apps-tour-count {
      font-size: 11px;
      color: #6B7D72;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .apps-tour-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .apps-tour-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .apps-tour-kicker {
      font-size: 11px;
      color: #2E7D5B;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .apps-tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      letter-spacing: 0;
    }
    .apps-tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.5;
      margin: 0 0 14px;
    }
    .apps-tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .apps-tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .apps-tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .apps-tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .apps-tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .apps-tour-btn-primary {
      margin-left: auto;
      padding: 10px 18px;
      border-color: #2E7D5B;
      background: #2E7D5B;
      color: #fff;
      font-size: 14px;
      font-weight: 850;
      box-shadow: 0 8px 20px rgba(46,125,91,0.22);
    }
    @media (max-width: 420px) {
      .apps-tour-actions {
        flex-wrap: wrap;
      }
      .apps-tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @keyframes appsTourOverlayIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes appsTourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #appsTourLightbox,
      .apps-tour-panel {
        animation: none !important;
      }
      .apps-tour-fill {
        transition: none !important;
      }
    }
  `,document.head.appendChild(t)}function w(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function tt(){B&&(document.removeEventListener("keydown",B),B=null)}function It(t){tt(),B=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",B)}function Bt(t,e){return!t||!t.isConnected||e?.noHighlight?null:(t.dataset.appsTourOrigVisibility||(t.dataset.appsTourOrigVisibility=t.style.visibility||""),k?.destroy(),k=Tt(t,{attribute:"data-apps-tour-spotlight-clone",zIndex:100002,hideSource:!0,prepareClone(o){o.style.boxShadow=e?.spotlightBoxShadow??"none",o.style.outline=e?.spotlightOutline??"none",o.style.outlineOffset=e?.spotlightOutlineOffset??"0",(t.classList.contains("apps-story-line")||e?.hideSpotlightBorder)&&(o.style.border="none",o.style.borderTop="none",o.style.borderTopWidth="0",o.style.paddingTop="0")}}),k?.element||null)}function et(t){const e=t||{};tt(),H?.destroy(),H=null,k?.destroy(),k=null,D&&(clearTimeout(D),D=null);const o=document.getElementById("appsTourLightbox");o&&!e.keepLightbox&&o.remove();const n=document.getElementById("appsTourTooltip");n&&n.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(i=>i.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.appsTourOrigPosition||"",i.style.zIndex=i.dataset.appsTourOrigZIndex||"",i.style.isolation=i.dataset.appsTourOrigIsolation||"",i.style.boxShadow=i.dataset.appsTourOrigBoxShadow||"",i.style.outline=i.dataset.appsTourOrigOutline||"",i.style.outlineOffset=i.dataset.appsTourOrigOutlineOffset||"",i.style.transition=i.dataset.appsTourOrigTransition||"",i.style.visibility=i.dataset.appsTourOrigVisibility||"",i.dataset.appsTourOrigBorderTop!=null&&(i.style.borderTop=i.dataset.appsTourOrigBorderTop,i.style.paddingTop=i.dataset.appsTourOrigPaddingTop||"",delete i.dataset.appsTourOrigBorderTop,delete i.dataset.appsTourOrigPaddingTop),i.removeAttribute("data-apps-tour-highlighted"),delete i.dataset.appsTourOrigPosition,delete i.dataset.appsTourOrigZIndex,delete i.dataset.appsTourOrigIsolation,delete i.dataset.appsTourOrigBoxShadow,delete i.dataset.appsTourOrigOutline,delete i.dataset.appsTourOrigOutlineOffset,delete i.dataset.appsTourOrigTransition,delete i.dataset.appsTourOrigVisibility})}function b(t){et(),document.body.style.overflow="";const e=L;L=!1;try{const o=typeof K=="function"?K:window.ensureAppsViewRendered;typeof o=="function"&&o(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),e||localStorage.getItem("settingsTourStep")==="handoff"||a.settingsTourActive)){const n=typeof Q=="function"?Q:window.showFinaleMockModal;if(typeof n=="function"){n();return}}}function _t(t){const e=c+t;e<0||e>=F.length||(c=e,T())}function C(){if(localStorage.setItem("appsTourDone","1"),L||localStorage.getItem("settingsTourStep")==="handoff"||a.settingsTourActive){a.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const e=typeof X=="function"?X:window.finishTourHydration;typeof e=="function"&&e()}}function At(){C();const t=typeof Z=="function"?Z:window.goLive;if(b(!1),typeof t=="function"){t();return}const e=typeof J=="function"?J:window.toast;typeof e=="function"&&e("Open Go live to activate your booking page.","error")}function T(){St();const t=F[c];if(!t){b(!0);return}const e=F.length,o=c>=e-1,n=`${c+1} / ${e}`,i=Math.max(8,Math.min(100,Math.round((c+1)/e*100))),s=document.querySelector(t.target);if(!s){c++,T();return}et({keepLightbox:!0});let r=document.getElementById("appsTourLightbox");r||(r=document.createElement("div"),r.id="appsTourLightbox",r.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;",document.body.appendChild(r)),t.noHighlight||(s.dataset.appsTourOrigPosition=s.style.position||"",s.dataset.appsTourOrigZIndex=s.style.zIndex||"",s.dataset.appsTourOrigIsolation=s.style.isolation||"",s.dataset.appsTourOrigBoxShadow=s.style.boxShadow||"",s.dataset.appsTourOrigOutline=s.style.outline||"",s.dataset.appsTourOrigOutlineOffset=s.style.outlineOffset||"",s.dataset.appsTourOrigTransition=s.style.transition||"",s.style.position=s.style.position||"relative",s.style.zIndex="100002",s.style.isolation="isolate",s.style.transition="box-shadow 0.18s ease, outline 0.18s ease",s.style.boxShadow=t.spotlightBoxShadow??"none",s.style.outline=t.spotlightOutline??"none",s.style.outlineOffset=t.spotlightOutlineOffset??"0",(s.classList.contains("apps-story-line")||t.hideSpotlightBorder)&&(s.dataset.appsTourOrigBorderTop=s.style.borderTop||"",s.dataset.appsTourOrigPaddingTop=s.style.paddingTop||"",s.style.borderTop="none",s.style.paddingTop="0"),s.setAttribute("data-apps-tour-highlighted","1"));const d=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,l=t.scrollBlock||"nearest",h=d?"auto":"smooth";s.scrollIntoView({behavior:h,block:l});const g=()=>{const _=document.getElementById("appsTourTooltip");_&&_.remove();const p=Math.min(370,window.innerWidth-28),y=t.primaryLabel||(o?"Done":"Next"),f=t.secondaryLabel||(o?"Not now":"Skip tour"),G=c<=0,Y=t.kicker||"Guest App",x=document.createElement("div");x.id="appsTourTooltip",x.style.cssText=`position:fixed;z-index:100003;left:12px;top:14px;width:${p}px;max-width:${p}px;visibility:hidden;`,x.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${w(t.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${n}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${i}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${w(Y)}</div>
        <div class="apps-tour-title">${w(t.title)}</div>
        <p class="apps-tour-copy">${w(t.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${G?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${w(f)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${w(y)}</button>
        </div>
      </div>`,document.body.appendChild(x),Bt(s,t);const v=x.querySelector(".apps-tour-panel");H?.destroy(),H=kt({tooltip:x,panel:v,target:s,anchor:s,spotlight:k,options:{preferredPlacement:t.tooltipPosition||"auto",maxWidth:p,gap:t.tooltipGap??10,autoScroll:!0,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),x.style.visibility="visible";const S=()=>{if(t.activateOnNext){At();return}if(o){C(),b(!1);return}c++,T()},m=()=>{if(o){C(),b(!1);return}b(!0)},A=()=>{c<=0||(c--,T())};document.getElementById("appsTourNextBtn").onclick=S,document.getElementById("appsTourSkipBtn").onclick=m;const O=document.getElementById("appsTourBackBtn");O&&(O.onclick=A),It({onNext:S,onBack:A,onSkip:m})};D=setTimeout(()=>{requestAnimationFrame(g)},d?40:320)}function Ot(t){const e=t&&t.replay,o=t&&t.chainFromSettingsTour;if(!e&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;zt(),b(!1),L=!!o;const n=!!a.hotelSubscribed;F=[{target:"#tour-apps-intro",kicker:"The loop",title:"Your property becomes the app.",text:"Guests book direct, save your property to their phone, and come back with one tap."},{target:"#tour-apps-first",kicker:"Your side",title:"Put Front Desk on your phone in 3 steps.",text:"There is no App Store. Save this page to your home screen so new bookings can reach you before they confirm — even when Front Desk is closed.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-then",kicker:"Their side",title:"Guests install from your booking page.",text:"One tap on Install and your icon is on their home screen.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the icon feel like your property.",text:"A real logo or a clear photo. Guests see this square every time.",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10},{target:"#tour-apps-loop",kicker:n?"Live loop":"Activation",title:n?"This loop is on.":"Everything is ready to turn on.",text:n?"Guests book, save your property, and message you. Front Desk gets the alerts.":"For $199/month, guests can book direct, save your property, and message you — while Front Desk receives the alerts.",primaryLabel:n?"Done":"Activate everything — $199/month",secondaryLabel:n?"Close":"Keep exploring",activateOnNext:!n,tooltipPosition:"below",tooltipGap:8}],c=0,T()}const u={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},Dt="32px";function j(t,e){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function R(t){return`border-radius:${Dt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function ot(t){const e=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*e,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let P=[],$=0;function Et(t,e){b(!1),P=t,$=e||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?E(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?E(-1):i.key==="Escape"&&it()},document.addEventListener("keydown",o._keyHandler);let n=0;o.addEventListener("touchstart",i=>{n=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const s=i.changedTouches[0].clientX-n;Math.abs(s)>50&&E(s<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",q()}function it(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function E(t){const e=P.length;e<=1||($=($+t+e)%e,q())}function q(){const t=document.getElementById("appsLightbox");if(!t)return;const e=P[$],o=P.length,n=e.type!=="video",i=o>1?`${$+1} / ${o}`:"",s=n?`<img src="${ot(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${R()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${R()}"
          ${e.poster?`poster="${j(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,r=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",d=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",l=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(h,g)=>`<div onclick="appsOpenLightbox(_appsLbItems,${g})" style="width:7px;height:7px;border-radius:50%;background:${g===$?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${s}
      ${r}${d}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${l}
    </div>`}function st(t,e){const o=t||"Video";return`<span class="${"apps-media-badge"+(e==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function I(t,e,o,n,i){const s=i?st("Video"):"",r=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${n})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${s}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${r}
  </button>`}function Ft(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function Lt(t){const e=document.getElementById("appsView");if(!e)return;const o=(a.activeHotelId||"")+"|"+(a.activeHotelAppIcon||"")+"|"+(a.activeHotelDomain||"");t||e.dataset.appsKey!==o||!e.querySelector(".apps-page")?(nt(),e.dataset.appsKey=o):N()}function nt(){const t=document.getElementById("appsView");if(!t)return;const e=a.activeHotelName||"Your Property",o=a.activeHotelAppIcon||"",n=e.trim().charAt(0).toUpperCase()||"🏡",i=a.activeHotelDomain||"",s=i?"https://"+i:"#",r=i?"https://"+i+"/install":"#";function d(U){return JSON.stringify(U).replace(/"/g,"&quot;")}const l=j(u.guestHome,520),h=[{type:"image",src:u.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],g=[{type:"image",src:u.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:u.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:u.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],M=[{type:"video",src:u.guestInstallVideo,poster:u.guestHome,alt:"Guest adds property to phone",title:"How guests put your property on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your property shows up on their phone like an app. You don't need to do anything."}],_=[{type:"image",src:u.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your guest app.'},{type:"image",src:u.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:u.guestMessageNotifVideo,poster:u.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],p=isStandaloneApp(),y=isNativeFrontdeskApp(),f=p&&!y,G=f&&typeof Notification<"u"&&Notification.permission==="granted",x=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Put Front Desk on this phone":"Put Front Desk on my phone",v=Number(a.bookingReviewSettings?.reminderMinutes??15),S=`
    <div id="bookingReviewReminderSetting" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <label for="bookingReviewReminderSelect" style="display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${f?"var(--green)":"#8B938E"};margin-bottom:6px;">If you have not verified a booking</label>
      <select id="bookingReviewReminderSelect" onchange="saveBookingReviewReminderSetting(this)" ${f?"":'disabled aria-disabled="true"'} style="width:100%;padding:12px 11px;border:1px solid ${f?"var(--border)":"#D7DBD8"};border-radius:11px;background:${f?"#fff":"#E7E9E7"};color:${f?"var(--text)":"#8B938E"};font-family:inherit;font-size:13px;font-weight:700;box-sizing:border-box;cursor:${f?"pointer":"not-allowed"};">
        <option value="15"${v===15?" selected":""}>Remind every 15 minutes · up to 3 times</option>
        <option value="30"${v===30?" selected":""}>Remind every 30 minutes · up to 3 times</option>
        <option value="60"${v===60?" selected":""}>Remind every 1 hour · up to 3 times</option>
        <option value="0"${v===0?" selected":""}>Send the first notification only</option>
      </select>
      <div id="bookingReviewReminderHint" style="font-size:11px;color:var(--text-muted);line-height:1.45;margin-top:7px;">${y?"Native booking alerts will unlock after APNs is connected.":p?"Reminders stop as soon as you verify the room or cancel the booking.":"Download Front Desk to unlock this setting."}</div>
    </div>`;let m;y?m=`<div id="tour-fd-installed-badge" style="display:flex;align-items:flex-start;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#166534;">Private iPhone test installed</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Use this build to test Front Desk on your phone. Native booking alerts are the next iOS step.</div></div>
    </div>`:p&&G?m=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Booking and message alerts can reach this phone — even if Front Desk is closed.</div></div>
    </div>`:p?m=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">Front Desk is on this device. Turn on alerts so confirmed bookings and guest messages reach your phone.</p>
      <button onclick="enableBookingAlerts()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:m=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Put Front Desk on this phone first. There is no App Store — follow 3 quick steps and it appears on your home screen like an app.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Put Front Desk on this phone</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on your phone</div>`;const A=y?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Private Front Desk test is installed here. Native booking alerts are not connected in this first build.</span>
      </div>`:p?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${x}</button>`,O=r!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',V="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",at=o?V+"background:#fff;border:1px solid var(--border);padding:0;":V,pt=o?`<img src="${o}" alt="Property logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${n}</span>`,dt=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${at}">
        ${pt}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${e}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${p?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change picture":"Upload picture"}</button>
        ${p?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,lt=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${r!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your property to their phone. Scroll to the Install button.</p>`:""}
      ${r==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,ct=r!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${r.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',ut=`
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${o?`<img src="${o}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${n}</span>`}</div>
        <div class="apps-loop-name">${e}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,gt=`
    <section class="apps-story">
      <div id="tour-apps-intro">
        <div class="apps-story-kicker">Guest App</div>
        <h2 class="apps-story-title" id="tour-apps-headline">Your property can be on your guest&apos;s home screen.</h2>
        <p class="apps-story-copy" id="tour-apps-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your property appears on their phone like an app.</p>
      </div>

      <div class="apps-story-line" id="tour-apps-first">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Put Front Desk on your phone.</h3>
        <p>No App Store. Tap the button below, follow 3 quick steps, and Front Desk appears on your home screen. Then new bookings can reach you even when Front Desk is closed — a normal browser tab cannot reliably do that.</p>
        <div class="apps-story-actions">${A}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your property is on their home screen.</p>
        <div class="apps-story-actions">${O}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your property icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,ft=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your property</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${l}" alt="Guest saves property to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${d(M)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${I("What guests see on their phone","",d(g),0,!1)}
          ${I("How guests add your property","",d(M),0,!0)}
          ${I("Guest texts you, you text back","",d(_),0,!0)}
          ${I("Your app and theirs — side by side","",d(h),0,!1)}
        </div>
        ${s!=="#"?`<button onclick="window.open('${s}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,xt=U=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${p?"Front Desk — installed":"Install Front Desk"}</div>
      ${m}
      ${S}
    </div>`,ht=`
    <div class="apps-step-card" id="tour-fd-reminder-card" style="background:#F3F4F3;border-color:#D7DBD8;box-shadow:none;">
      <div style="display:flex;align-items:flex-start;gap:11px;">
        <div style="width:34px;height:34px;border-radius:10px;background:#E1E4E2;color:#737B76;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🔒</div>
        <div style="flex:1;min-width:0;">
          <div class="apps-section-divider" style="margin:0 0 5px;padding:0;border-top:none;color:#737B76;">Booking alerts</div>
          <div class="apps-step-title" style="color:#555D58;">Help prevent double bookings</div>
          <p style="font-size:12px;color:#737B76;line-height:1.5;margin:0;">Repeated alerts keep a new booking in front of you until you verify the room against walk-ins and other booking channels.</p>
        </div>
      </div>
      ${S}
      <button type="button" onclick="handleInstallFrontdesk()" style="width:100%;margin-top:14px;padding:13px 15px;border:none;border-radius:11px;background:var(--green);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">Download Front Desk to unlock alerts</button>
      <div style="font-size:11px;color:#737B76;line-height:1.45;text-align:center;margin-top:8px;">Booking notifications require the installed Front Desk on this device.</div>
    </div>`,W=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${dt}
    </div>`,mt=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${e}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${lt}
      ${ct}
    </div>`,bt=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${ft}
      </div>
    </details>`,yt=`
    ${xt()}
    ${W()}
    ${mt}
    ${guestBroadcastCardHtml()}
    ${bt}`,vt=`
    ${gt}
    ${ut}
    ${p?yt:`${ht}${W()}`}`,wt=p?"Front Desk is installed. Guests can install your property from the direct booking page.":"Install Front Desk first. Then guests can install your property from the direct booking page.";t.innerHTML=`
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
    ${vt}

    <p class="apps-footnote">${wt}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),N(),rt()}async function rt(){try{const t=await api("GET","/api/crm/booking-review-settings");if(!t?.success||!t.data)return;a.bookingReviewSettings=t.data;const e=document.getElementById("bookingReviewReminderSelect");e&&(e.value=String(t.data.reminderMinutes))}catch{}}async function Ht(t){const e=String(a.bookingReviewSettings?.reminderMinutes??15),o=parseInt(t?.value,10);if([0,15,30,60].includes(o)){t&&(t.disabled=!0);try{const n=await api("POST","/api/crm/booking-review-settings",{reminderMinutes:o});if(!n?.success)throw new Error(n?.message||"Could not save reminder timing.");a.bookingReviewSettings=n.data,toast(o===0?"Booking reminders off — the first alert will still arrive.":`Booking reminders set for every ${o===60?"hour":o+" minutes"}.`,"success")}catch(n){t&&(t.value=e),toast(n?.message||"Could not save reminder timing.","error")}finally{t&&(t.disabled=!1)}}}async function N(){const t=document.getElementById("guestInstallStats");try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");if(a.guestPushSubscriberCount=e.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const o=e.totals||{},n=e.installedBookings||0,i=o.views||0;if(!n&&!i){t.style.display="none",t.innerHTML="";return}t.style.display="block";const s=e.installRatePercent!=null?e.installRatePercent:0,r=Object.entries(e.byTouchpoint||{}).filter(function(l){return l[1].views||l[1].installed}).sort(function(l,h){return(h[1].installed||0)-(l[1].installed||0)}).slice(0,5),d=r.length?r.map(function(l){const h=l[0].replace(/-/g," "),g=l[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+h+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(g.views||0)+" views · "+(g.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(d?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+d:"")}catch{a.guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}const Pt={appsCloseLightbox:it,appsCloudinaryFull:ot,appsCloudinaryImg:j,appsLbNav:E,appsLbRender:q,appsOpenLightbox:Et,appsPhoneImgStyle:R,appsQuestionRow:I,appsTourClose:b,appsTourNav:_t,appsTourRender:T,appsVideoBadgeHtml:st,detectAppPlatform:Ft,ensureAppsViewRendered:Lt,loadBookingReviewSettings:rt,loadGuestInstallStats:N,renderAppsView:nt,saveBookingReviewReminderSetting:Ht,startAppsTour:Ot};function Rt(){$t(Pt)}export{Pt as default,Rt as install};
