import{c as h,e as kt}from"./settings-C2_A8Xe-.js";function S(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function it(...t){return S("ensureAppsViewRendered")?.(...t)}function nt(...t){return S("showFinaleMockModal")?.(...t)}function st(...t){return S("finishTourHydration")?.(...t)}function rt(...t){return S("goLive")?.(...t)}function at(...t){return S("toast")?.(...t)}function Tt(...t){return S("appsCloseLightbox")?.(...t)}let C=[],x=0,D=!1,_=null,F=null;function $t(){if(document.getElementById("frontdeskAppsTourStyle"))return;const t=document.createElement("style");t.id="frontdeskAppsTourStyle",t.textContent=`
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
  `,document.head.appendChild(t)}function T(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function lt(){_&&(document.removeEventListener("keydown",_),_=null)}function Bt(t){lt(),_=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",_)}function St(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"))}function zt(t,e){const o=t.querySelectorAll("input, textarea, select"),s=e.querySelectorAll("input, textarea, select");o.forEach((i,n)=>{const r=s[n];r&&(i.type==="checkbox"||i.type==="radio"?r.checked=i.checked:r.value=i.value)})}function dt(t,e){const o=getComputedStyle(t);for(const n of o)e.style.setProperty(n,o.getPropertyValue(n),o.getPropertyPriority(n));const s=t.children,i=e.children;for(let n=0;n<s.length;n+=1)i[n]&&dt(s[n],i[n])}function pt(t,e){if(!t||!t.isConnected||e?.noHighlight)return null;document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(i=>i.remove());const o=t.getBoundingClientRect();if(o.width<2||o.height<2)return null;const s=t.cloneNode(!0);return St(s),dt(t,s),zt(t,s),t.dataset.appsTourOrigVisibility||(t.dataset.appsTourOrigVisibility=t.style.visibility||""),t.style.visibility="hidden",s.setAttribute("data-apps-tour-spotlight-clone","1"),s.setAttribute("aria-hidden","true"),s.style.position="fixed",s.style.left=`${o.left}px`,s.style.top=`${o.top}px`,s.style.width=`${o.width}px`,s.style.height=`${o.height}px`,s.style.margin="0",s.style.maxWidth="none",s.style.zIndex="100002",s.style.pointerEvents="none",s.style.transform="none",s.style.boxShadow=e?.spotlightBoxShadow??"none",s.style.outline=e?.spotlightOutline??"none",s.style.outlineOffset=e?.spotlightOutlineOffset??"0",(t.classList.contains("apps-story-line")||e?.hideSpotlightBorder)&&(s.style.border="none",s.style.borderTop="none",s.style.borderTopWidth="0",s.style.paddingTop="0"),document.body.appendChild(s),s}function ct(t){const e=t||{};lt(),F&&(clearTimeout(F),F=null);const o=document.getElementById("appsTourLightbox");o&&!e.keepLightbox&&o.remove();const s=document.getElementById("appsTourTooltip");s&&s.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(i=>i.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.appsTourOrigPosition||"",i.style.zIndex=i.dataset.appsTourOrigZIndex||"",i.style.isolation=i.dataset.appsTourOrigIsolation||"",i.style.boxShadow=i.dataset.appsTourOrigBoxShadow||"",i.style.outline=i.dataset.appsTourOrigOutline||"",i.style.outlineOffset=i.dataset.appsTourOrigOutlineOffset||"",i.style.transition=i.dataset.appsTourOrigTransition||"",i.style.visibility=i.dataset.appsTourOrigVisibility||"",i.dataset.appsTourOrigBorderTop!=null&&(i.style.borderTop=i.dataset.appsTourOrigBorderTop,i.style.paddingTop=i.dataset.appsTourOrigPaddingTop||"",delete i.dataset.appsTourOrigBorderTop,delete i.dataset.appsTourOrigPaddingTop),i.removeAttribute("data-apps-tour-highlighted"),delete i.dataset.appsTourOrigPosition,delete i.dataset.appsTourOrigZIndex,delete i.dataset.appsTourOrigIsolation,delete i.dataset.appsTourOrigBoxShadow,delete i.dataset.appsTourOrigOutline,delete i.dataset.appsTourOrigOutlineOffset,delete i.dataset.appsTourOrigTransition,delete i.dataset.appsTourOrigVisibility})}function It(t){let e=t&&t.parentElement;for(;e&&e!==document.body&&e!==document.documentElement;){const o=getComputedStyle(e),s=o.overflowY||o.overflow;if(/(auto|scroll)/.test(s)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement}return null}function At(t,e){if(!e)return;const o=It(t);if(o){o.scrollTop+=e;return}window.scrollBy({top:e,left:0,behavior:"auto"})}function _t(t,e){return e&&t.mobileTooltipPosition||t.tooltipPosition||""}function Ht(t,e,o,s,i){if(!t||!t.isConnected||!o)return t?.getBoundingClientRect()||null;const n=o.querySelector(".apps-tour-panel"),r=Math.min(n&&n.offsetHeight||o.offsetHeight||190,Math.max(130,window.innerHeight-28)),d=e.tooltipGap??8,a=(i?e.mobileFitPadTop:e.fitPadTop)??14,f=window.innerHeight-((i?e.mobileFitPadBottom:e.fitPadBottom)??14);let p=t.getBoundingClientRect();if(p.width<2||p.height<2)return p;for(let v=0;v<3;v+=1){const z=Math.max(120,f-a),c=p.height+d+r<=z;let u=0;if(s==="above"){const b=p.top-d-r-a;b<0&&(u=b),c&&p.bottom>f&&(u=p.bottom-f)}else{const b=p.bottom+d+r-f;b>0&&(u=b),c&&p.top<a&&(u=p.top-a)}if(Math.abs(u)<1)break;At(t,u),p=t.getBoundingClientRect()}return p}function y(t){ct(),document.body.style.overflow="";const e=D;D=!1;try{const o=typeof it=="function"?it:window.ensureAppsViewRendered;typeof o=="function"&&o(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),e||localStorage.getItem("settingsTourStep")==="handoff"||h.settingsTourActive)){const s=typeof nt=="function"?nt:window.showFinaleMockModal;if(typeof s=="function"){s();return}}}function Ot(t){const e=x+t;e<0||e>=C.length||(x=e,$())}function K(){if(localStorage.setItem("appsTourDone","1"),D||localStorage.getItem("settingsTourStep")==="handoff"||h.settingsTourActive){h.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const e=typeof st=="function"?st:window.finishTourHydration;typeof e=="function"&&e()}}function Et(){K();const t=typeof rt=="function"?rt:window.goLive;if(y(!1),typeof t=="function"){t();return}const e=typeof at=="function"?at:window.toast;typeof e=="function"&&e("Open Go live to activate your booking page.","error")}function $(){$t();const t=C[x];if(!t){y(!0);return}const e=C.length,o=x>=e-1,s=`${x+1} / ${e}`,i=Math.max(8,Math.min(100,Math.round((x+1)/e*100))),n=document.querySelector(t.target);if(!n){x++,$();return}ct({keepLightbox:!0});let r=document.getElementById("appsTourLightbox");r||(r=document.createElement("div"),r.id="appsTourLightbox",r.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;",document.body.appendChild(r)),t.noHighlight||(n.dataset.appsTourOrigPosition=n.style.position||"",n.dataset.appsTourOrigZIndex=n.style.zIndex||"",n.dataset.appsTourOrigIsolation=n.style.isolation||"",n.dataset.appsTourOrigBoxShadow=n.style.boxShadow||"",n.dataset.appsTourOrigOutline=n.style.outline||"",n.dataset.appsTourOrigOutlineOffset=n.style.outlineOffset||"",n.dataset.appsTourOrigTransition=n.style.transition||"",n.style.position=n.style.position||"relative",n.style.zIndex="100002",n.style.isolation="isolate",n.style.transition="box-shadow 0.18s ease, outline 0.18s ease",n.style.boxShadow=t.spotlightBoxShadow??"none",n.style.outline=t.spotlightOutline??"none",n.style.outlineOffset=t.spotlightOutlineOffset??"0",(n.classList.contains("apps-story-line")||t.hideSpotlightBorder)&&(n.dataset.appsTourOrigBorderTop=n.style.borderTop||"",n.dataset.appsTourOrigPaddingTop=n.style.paddingTop||"",n.style.borderTop="none",n.style.paddingTop="0"),n.setAttribute("data-apps-tour-highlighted","1"));const d=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,a=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,f=a&&t.mobileScrollBlock||t.scrollBlock||"center",p=d?"auto":"smooth";if(a&&t.mobileScrollToBottom){const c=Math.max(document.documentElement?document.documentElement.scrollHeight:0,document.body?document.body.scrollHeight:0);window.scrollTo({top:c,behavior:p}),setTimeout(()=>{window.scrollTo({top:c,behavior:"auto"})},p==="smooth"?520:0)}else n.scrollIntoView({behavior:p,block:f});const v=()=>{const c=document.getElementById("appsTourTooltip");c&&c.remove();const u=Math.min(a?window.innerWidth-24:370,window.innerWidth-28),b=_t(t,a),G=t.primaryLabel||(o?"Done":"Next"),g=t.secondaryLabel||(o?"Not now":"Skip tour"),j=x<=0,N=t.kicker||"Guest App",l=document.createElement("div");if(l.id="appsTourTooltip",l.style.cssText=`position:fixed;z-index:100003;left:12px;top:14px;width:${u}px;max-width:${u}px;visibility:hidden;`,l.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${T(t.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${s}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${i}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${T(N)}</div>
        <div class="apps-tour-title">${T(t.title)}</div>
        <p class="apps-tour-copy">${T(t.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${j?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${T(g)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${T(G)}</button>
        </div>
      </div>`,document.body.appendChild(l),a&&!b)pt(n,t),l.style.left="12px",l.style.right="12px",l.style.width="auto",l.style.maxWidth="none",l.style.top="auto",l.style.bottom="calc(14px + env(safe-area-inset-bottom,0px))";else{const E=b||"below",k=Ht(n,t,l,E,a)||n.getBoundingClientRect();pt(n,t);const R=l.querySelector(".apps-tour-panel"),L=Math.min(R&&R.offsetHeight||l.offsetHeight||190,Math.max(130,window.innerHeight-28)),P=t.tooltipGap??8,Y=k.left+k.width/2,tt=Math.max(14,Math.min(Y-u/2,window.innerWidth-u-14)),V=E!=="above"?k.bottom+P:k.top-L-P,W=Math.max(14,Math.min(V,window.innerHeight-L-14));l.style.left=`${tt}px`,l.style.right="auto",l.style.bottom="auto",l.style.width=`${u}px`,l.style.maxWidth=`${u}px`,l.style.top=`${W}px`}l.style.visibility="visible";const w=()=>{if(t.activateOnNext){Et();return}if(o){K(),y(!1);return}x++,$()},H=()=>{if(o){K(),y(!1);return}y(!0)},O=()=>{x<=0||(x--,$())};document.getElementById("appsTourNextBtn").onclick=w,document.getElementById("appsTourSkipBtn").onclick=H;const I=document.getElementById("appsTourBackBtn");I&&(I.onclick=O),Bt({onNext:w,onBack:O,onSkip:H})},z=a&&t.mobileScrollToBottom?d?80:680:d?40:320;F=setTimeout(()=>{requestAnimationFrame(v)},z)}function Lt(t){const e=t&&t.replay,o=t&&t.chainFromSettingsTour;if(!e&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;Tt(),y(!1),D=!!o;const s=!!h.hotelSubscribed;C=[{target:"#tour-apps-intro",kicker:"The loop",title:"Your property becomes the app.",text:"Guests book direct, save your property to their phone, and come back with one tap."},{target:"#tour-apps-first",kicker:"Your side",title:"Put Front Desk on your phone in 3 steps.",text:"There is no App Store. Save this page to your home screen so new bookings can reach you before they confirm — even when Front Desk is closed.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8,mobileScrollBlock:"center",mobileTooltipPosition:"below"},{target:"#tour-apps-then",kicker:"Their side",title:"Guests install from your booking page.",text:"One tap on Install and your icon is on their home screen.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8,mobileScrollBlock:"center",mobileTooltipPosition:"below"},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the icon feel like your property.",text:"A real logo or a clear photo. Guests see this square every time.",mobileScrollToBottom:!0,mobileScrollBlock:"end",mobileTooltipAnchor:"top",mobileTooltipPosition:"above"},{target:"#tour-apps-loop",kicker:s?"Live loop":"Activation",title:s?"This loop is on.":"Everything is ready to turn on.",text:s?"Guests book, save your property, and message you. Front Desk gets the alerts.":"For $199/month, guests can book direct, save your property, and message you — while Front Desk receives the alerts.",primaryLabel:s?"Done":"Activate everything — $199/month",secondaryLabel:s?"Close":"Keep exploring",activateOnNext:!s,mobileScrollBlock:"center",tooltipPosition:"below",tooltipGap:8,mobileTooltipPosition:"below"}],x=0,$()}const m={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},Pt="32px";function X(t,e){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function Q(t){return`border-radius:${Pt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function ut(t){const e=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*e,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let q=[],B=0;function Ft(t,e){y(!1),q=t,B=e||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?M(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?M(-1):i.key==="Escape"&&gt()},document.addEventListener("keydown",o._keyHandler);let s=0;o.addEventListener("touchstart",i=>{s=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const n=i.changedTouches[0].clientX-s;Math.abs(n)>50&&M(n<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",Z()}function gt(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function M(t){const e=q.length;e<=1||(B=(B+t+e)%e,Z())}function Z(){const t=document.getElementById("appsLightbox");if(!t)return;const e=q[B],o=q.length,s=e.type!=="video",i=o>1?`${B+1} / ${o}`:"",n=s?`<img src="${ut(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${Q()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${Q()}"
          ${e.poster?`poster="${X(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,r=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",d=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",a=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(f,p)=>`<div onclick="appsOpenLightbox(_appsLbItems,${p})" style="width:7px;height:7px;border-radius:50%;background:${p===B?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${n}
      ${r}${d}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${a}
    </div>`}function ft(t,e){const o=t||"Video";return`<span class="${"apps-media-badge"+(e==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function A(t,e,o,s,i){const n=i?ft("Video"):"",r=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${s})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${n}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${r}
  </button>`}function Mt(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function Ct(t){const e=document.getElementById("appsView");if(!e)return;h.bookingApproval===null&&typeof window.loadBookingApprovalSettings=="function"&&window.loadBookingApprovalSettings({refreshApps:!0});const o=(h.activeHotelId||"")+"|"+(h.activeHotelAppIcon||"")+"|"+(h.activeHotelDomain||"");t||e.dataset.appsKey!==o||!e.querySelector(".apps-page")?(ht(),e.dataset.appsKey=o):J()}function ht(){const t=document.getElementById("appsView");if(!t)return;const e=h.activeHotelName||"Your Property",o=h.activeHotelAppIcon||"",s=e.trim().charAt(0).toUpperCase()||"🏡",i=h.activeHotelDomain||"",n=i?"https://"+i:"#",r=i?"https://"+i+"/install":"#";function d(U){return JSON.stringify(U).replace(/"/g,"&quot;")}const a=X(m.guestHome,520),f=[{type:"image",src:m.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],p=[{type:"image",src:m.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:m.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:m.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],v=[{type:"video",src:m.guestInstallVideo,poster:m.guestHome,alt:"Guest adds property to phone",title:"How guests put your property on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your property shows up on their phone like an app. You don't need to do anything."}],z=[{type:"image",src:m.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your guest app.'},{type:"image",src:m.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:m.guestMessageNotifVideo,poster:m.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],c=isStandaloneApp()||h.frontdeskInstalled,u=typeof Notification<"u"&&Notification.permission==="granted",G=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Put Front Desk on this phone":"Put Front Desk on my phone",g=h.bookingApproval,j=!!(g&&g.supported&&g.pushConfigured),N=g&&g.windowMinutes||20,l=g&&g.enabled?`${N} minutes to confirm or release`:"Bookings confirm immediately";let w;c&&u?w=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Booking alerts can reach this phone — even if Front Desk is closed.</div>${j?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid #bbf7d0;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-size:12px;font-weight:800;color:#166534;">Booking review: ${g.enabled?"On":"Off"}</div>
            <div style="font-size:11px;color:#4B5D52;margin-top:2px;">${l}</div>
          </div>
          <button type="button" onclick="toggleBookingApproval()" style="flex-shrink:0;padding:8px 11px;border-radius:9px;border:1px solid ${g.enabled?"#86EFAC":"#2E7D5B"};background:${g.enabled?"#fff":"#2E7D5B"};color:${g.enabled?"#166534":"#fff"};font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;">${g.enabled?"Turn off":"Turn on"}</button>
        </div>`:""}</div>
    </div>`:c?w=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">Front Desk is on this device. Turn on booking protection so new reservations reach your phone before they confirm.</p>
      <button onclick="enableBookingProtection()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking protection</button></div>`:w=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Put Front Desk on this phone first. There is no App Store — follow 3 quick steps and it appears on your home screen like an app.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Put Front Desk on this phone</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on your phone</div>`;const H=c?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${G}</button>`,O=r!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',I="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",E=o?I+"background:#fff;border:1px solid var(--border);padding:0;":I,k=o?`<img src="${o}" alt="Property logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${s}</span>`,L=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${E}">
        ${k}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${e}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${c?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change picture":"Upload picture"}</button>
        ${c?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,P=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${r!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your property to their phone. Scroll to the Install button.</p>`:""}
      ${r==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,Y=r!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${r.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',et=`
    <div class="apps-loop" id="tour-apps-loop">
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
    </div>`,V=`
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
        <div class="apps-story-actions">${H}</div>
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
    </section>`,W=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your property</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${a}" alt="Guest saves property to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${d(v)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${A("What guests see on their phone","",d(p),0,!1)}
          ${A("How guests add your property","",d(v),0,!0)}
          ${A("Guest texts you, you text back","",d(z),0,!0)}
          ${A("Your app and theirs — side by side","",d(f),0,!1)}
        </div>
        ${n!=="#"?`<button onclick="window.open('${n}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,xt=U=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${c?"Front Desk — installed":"Install Front Desk"}</div>
      ${w}
    </div>`,ot=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${L}
    </div>`,mt=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${e}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${P}
      ${Y}
    </div>`,bt=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${W}
      </div>
    </details>`,yt=`
    ${xt()}
    ${ot()}
    ${mt}
    ${guestBroadcastCardHtml()}
    ${bt}`,vt=`
    ${V}
    ${et}
    ${c?yt:ot()}`,wt=c?"Front Desk is installed. Guests can install your property from the direct booking page.":"Install Front Desk first. Then guests can install your property from the direct booking page.";t.innerHTML=`
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

  </div>`,typeof lucide<"u"&&lucide.createIcons(),J()}async function J(){const t=document.getElementById("guestInstallStats");try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");if(guestPushSubscriberCount=e.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const o=e.totals||{},s=e.installedBookings||0,i=o.views||0;if(!s&&!i){t.style.display="none",t.innerHTML="";return}t.style.display="block";const n=e.installRatePercent!=null?e.installRatePercent:0,r=Object.entries(e.byTouchpoint||{}).filter(function(a){return a[1].views||a[1].installed}).sort(function(a,f){return(f[1].installed||0)-(a[1].installed||0)}).slice(0,5),d=r.length?r.map(function(a){const f=a[0].replace(/-/g," "),p=a[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+f+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(p.views||0)+" views · "+(p.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(d?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+d:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}const Dt={appsCloseLightbox:gt,appsCloudinaryFull:ut,appsCloudinaryImg:X,appsLbNav:M,appsLbRender:Z,appsOpenLightbox:Ft,appsPhoneImgStyle:Q,appsQuestionRow:A,appsTourClose:y,appsTourNav:Ot,appsTourRender:$,appsVideoBadgeHtml:ft,detectAppPlatform:Mt,ensureAppsViewRendered:Ct,loadGuestInstallStats:J,renderAppsView:ht,startAppsTour:Lt};function Gt(){kt(Dt)}export{Dt as default,Gt as install};
