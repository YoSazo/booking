import{c as r,a as Gt,b as Et,e as Dt}from"./settings-SCybeOn_.js";function v(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function ot(...t){return v("ensureAppsViewRendered")?.(...t)}function it(...t){return v("showFinaleMockModal")?.(...t)}function nt(...t){return v("finishTourHydration")?.(...t)}function at(...t){return v("goLive")?.(...t)}function st(...t){return v("toast")?.(...t)}function Pt(...t){return v("appsCloseLightbox")?.(...t)}let E=[],g=0,D=!1,A=null,H=null,P=null,T=null;function Mt(){if(document.getElementById("frontdeskAppsTourStyle"))return;const t=document.createElement("style");t.id="frontdeskAppsTourStyle",t.textContent=`
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
  `,document.head.appendChild(t)}function k(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function rt(){A&&(document.removeEventListener("keydown",A),A=null)}function Nt(t){rt(),A=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",A)}function Rt(t,e){return!t||!t.isConnected||e?.noHighlight?null:(t.dataset.appsTourOrigVisibility||(t.dataset.appsTourOrigVisibility=t.style.visibility||""),T?.destroy(),T=Et(t,{attribute:"data-apps-tour-spotlight-clone",zIndex:100002,hideSource:!0,prepareClone(o){o.style.boxShadow=e?.spotlightBoxShadow??"none",o.style.outline=e?.spotlightOutline??"none",o.style.outlineOffset=e?.spotlightOutlineOffset??"0",(t.classList.contains("apps-story-line")||e?.hideSpotlightBorder)&&(o.style.border="none",o.style.borderTop="none",o.style.borderTopWidth="0",o.style.paddingTop="0")}}),T?.element||null)}function pt(t){const e=t||{};rt(),P?.destroy(),P=null,T?.destroy(),T=null,H&&(clearTimeout(H),H=null);const o=document.getElementById("appsTourLightbox");o&&!e.keepLightbox&&o.remove();const a=document.getElementById("appsTourTooltip");a&&a.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(i=>i.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.appsTourOrigPosition||"",i.style.zIndex=i.dataset.appsTourOrigZIndex||"",i.style.isolation=i.dataset.appsTourOrigIsolation||"",i.style.boxShadow=i.dataset.appsTourOrigBoxShadow||"",i.style.outline=i.dataset.appsTourOrigOutline||"",i.style.outlineOffset=i.dataset.appsTourOrigOutlineOffset||"",i.style.transition=i.dataset.appsTourOrigTransition||"",i.style.visibility=i.dataset.appsTourOrigVisibility||"",i.dataset.appsTourOrigBorderTop!=null&&(i.style.borderTop=i.dataset.appsTourOrigBorderTop,i.style.paddingTop=i.dataset.appsTourOrigPaddingTop||"",delete i.dataset.appsTourOrigBorderTop,delete i.dataset.appsTourOrigPaddingTop),i.removeAttribute("data-apps-tour-highlighted"),delete i.dataset.appsTourOrigPosition,delete i.dataset.appsTourOrigZIndex,delete i.dataset.appsTourOrigIsolation,delete i.dataset.appsTourOrigBoxShadow,delete i.dataset.appsTourOrigOutline,delete i.dataset.appsTourOrigOutlineOffset,delete i.dataset.appsTourOrigTransition,delete i.dataset.appsTourOrigVisibility})}function b(t){pt(),document.body.style.overflow="";const e=D;D=!1;try{const o=typeof ot=="function"?ot:window.ensureAppsViewRendered;typeof o=="function"&&o(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),e||localStorage.getItem("settingsTourStep")==="handoff"||r.settingsTourActive)){const a=typeof it=="function"?it:window.showFinaleMockModal;if(typeof a=="function"){a();return}}}function jt(t){const e=g+t;e<0||e>=E.length||(g=e,S())}function Y(){if(localStorage.setItem("appsTourDone","1"),D||localStorage.getItem("settingsTourStep")==="handoff"||r.settingsTourActive){r.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const e=typeof nt=="function"?nt:window.finishTourHydration;typeof e=="function"&&e()}}function qt(){Y();const t=typeof at=="function"?at:window.goLive;if(b(!1),typeof t=="function"){t();return}const e=typeof st=="function"?st:window.toast;typeof e=="function"&&e("Open Go live to activate your booking page.","error")}function S(){Mt();const t=E[g];if(!t){b(!0);return}const e=E.length,o=g>=e-1,a=`${g+1} / ${e}`,i=Math.max(8,Math.min(100,Math.round((g+1)/e*100))),n=document.querySelector(t.target);if(!n){g++,S();return}pt({keepLightbox:!0});let s=document.getElementById("appsTourLightbox");s||(s=document.createElement("div"),s.id="appsTourLightbox",s.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;",document.body.appendChild(s)),t.noHighlight||(n.dataset.appsTourOrigPosition=n.style.position||"",n.dataset.appsTourOrigZIndex=n.style.zIndex||"",n.dataset.appsTourOrigIsolation=n.style.isolation||"",n.dataset.appsTourOrigBoxShadow=n.style.boxShadow||"",n.dataset.appsTourOrigOutline=n.style.outline||"",n.dataset.appsTourOrigOutlineOffset=n.style.outlineOffset||"",n.dataset.appsTourOrigTransition=n.style.transition||"",n.style.position=n.style.position||"relative",n.style.zIndex="100002",n.style.isolation="isolate",n.style.transition="box-shadow 0.18s ease, outline 0.18s ease",n.style.boxShadow=t.spotlightBoxShadow??"none",n.style.outline=t.spotlightOutline??"none",n.style.outlineOffset=t.spotlightOutlineOffset??"0",(n.classList.contains("apps-story-line")||t.hideSpotlightBorder)&&(n.dataset.appsTourOrigBorderTop=n.style.borderTop||"",n.dataset.appsTourOrigPaddingTop=n.style.paddingTop||"",n.style.borderTop="none",n.style.paddingTop="0"),n.setAttribute("data-apps-tour-highlighted","1"));const d=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,c=t.scrollBlock||"nearest",m=d?"auto":"smooth";n.scrollIntoView({behavior:m,block:c});const f=()=>{const _=document.getElementById("appsTourTooltip");_&&_.remove();const l=Math.min(370,window.innerWidth-28),x=t.primaryLabel||(o?"Done":"Next"),L=t.secondaryLabel||(o?"Not now":"Skip tour"),u=g<=0,y=t.kicker||"Guest App",p=document.createElement("div");p.id="appsTourTooltip",p.style.cssText=`position:fixed;z-index:100003;left:12px;top:14px;width:${l}px;max-width:${l}px;visibility:hidden;`,p.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${k(t.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${a}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${i}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${k(y)}</div>
        <div class="apps-tour-title">${k(t.title)}</div>
        <p class="apps-tour-copy">${k(t.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${u?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${k(L)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${k(x)}</button>
        </div>
      </div>`,document.body.appendChild(p),Rt(n,t);const j=p.querySelector(".apps-tour-panel");P?.destroy(),P=Gt({tooltip:p,panel:j,target:n,anchor:n,spotlight:T,options:{preferredPlacement:t.tooltipPosition||"auto",maxWidth:l,gap:t.tooltipGap??10,autoScroll:!0,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),p.style.visibility="visible";const q=()=>{if(t.activateOnNext){qt();return}if(o){Y(),b(!1),t.openGuestInstallCoachOnNext&&window.setTimeout(()=>v("appsOpenGuestInstallCoach")?.(),0);return}g++,S()},O=()=>{if(o){Y(),b(!1);return}b(!0)},w=()=>{g<=0||(g--,S())};document.getElementById("appsTourNextBtn").onclick=q,document.getElementById("appsTourSkipBtn").onclick=O;const I=document.getElementById("appsTourBackBtn");I&&(I.onclick=w),Nt({onNext:q,onBack:w,onSkip:O})};H=setTimeout(()=>{requestAnimationFrame(f)},d?40:320)}function Vt(t){const e=t&&t.replay,o=t&&t.chainFromSettingsTour;if(!e&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;Pt(),b(!1),D=!!o;const a=!!r.hotelSubscribed;E=!!v("isNativeFrontdeskApp")?.()?[{target:"#tour-guest-icon-section",kicker:"Guest App",title:"Choose the icon guests will save.",text:"Use your logo or a clear property photo.",scrollBlock:"start",tooltipPosition:"below"},{target:"#tour-native-guest-share",kicker:"Ready",title:"Share it with guests.",text:"Show the QR, copy the link, or open the guest page.",tooltipPosition:"above"},{target:"#tour-native-install-guide",kicker:"Your cheat sheet",title:"Know exactly what to tell them.",text:"Open this anytime to practice the exact Safari taps for older iPhones and every iOS 26 layout.",primaryLabel:"Show me",secondaryLabel:"Close",openGuestInstallCoachOnNext:!0,tooltipPosition:"above"}]:[{target:"#tour-apps-intro",kicker:"The loop",title:"Your property becomes the app.",text:"Guests book direct, save your property to their phone, and come back with one tap."},{target:"#tour-apps-first",kicker:"Your side",title:"Put Front Desk on your phone in 3 steps.",text:"There is no App Store. Save this page to your home screen so new bookings can reach you before they confirm — even when Front Desk is closed.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-then",kicker:"Their side",title:"Guests install from your booking page.",text:"One tap on Install and your icon is on their home screen.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the icon feel like your property.",text:"A real logo or a clear photo. Guests see this square every time.",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10},{target:"#tour-apps-loop",kicker:a?"Live loop":"Activation",title:a?"This loop is on.":"Everything is ready to turn on.",text:a?"Guests book, save your property, and message you. Front Desk gets the alerts.":"For $199/month, guests can book direct, save your property, and message you — while Front Desk receives the alerts.",primaryLabel:a?"Done":"Activate everything — $199/month",secondaryLabel:a?"Close":"Keep exploring",activateOnNext:!a,tooltipPosition:"below",tooltipGap:8}],g=0,S()}const h={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},Yt="32px";function Z(t,e){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(e||400)+"/")}function W(t){return`border-radius:${Yt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function lt(t){const e=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*e,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let M=[],C=0,N="ios26",z=null,dt="",F=null;function Wt(t,e){b(!1),isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(!1),M=t,C=e||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?G(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?G(-1):i.key==="Escape"&&U()},document.addEventListener("keydown",o._keyHandler);let a=0;o.addEventListener("touchstart",i=>{a=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const n=i.changedTouches[0].clientX-a;Math.abs(n)>50&&G(n<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",K()}function U(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="",isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&(window.setNativeShellVisible(!0),typeof window.syncNativeShellState=="function"&&window.syncNativeShellState()))}function G(t){const e=M.length;e<=1||(C=(C+t+e)%e,K())}function K(){const t=document.getElementById("appsLightbox");if(!t)return;const e=M[C],o=M.length,a=e.type!=="video",i=o>1?`${C+1} / ${o}`:"",n=a?`<img src="${lt(e.src)}" alt="${e.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${W()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${W()}"
          ${e.poster?`poster="${Z(e.poster,400)}"`:""}>
          <source src="${e.src}" type="video/mp4">
       </video>`,s=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",d=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",c=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(m,f)=>`<div onclick="appsOpenLightbox(_appsLbItems,${f})" style="width:7px;height:7px;border-radius:50%;background:${f===C?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${n}
      ${s}${d}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${e.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${e.title}</div>`:""}
      ${e.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${e.caption}</div>`:""}
      ${c}
    </div>`}function Q(){return`<svg viewBox="169 8.5 21 25.5" focusable="false" aria-hidden="true">
    <path d="M173.334 33.2705C172.21 33.2705 171.365 32.9912 170.799 32.4326C170.24 31.8812 169.961 31.0505 169.961 29.9404V19.3379C169.961 18.2279 170.24 17.3971 170.799 16.8457C171.365 16.2871 172.21 16.0078 173.334 16.0078H176.621V17.7373H173.355C172.818 17.7373 172.407 17.8805 172.12 18.167C171.834 18.4463 171.69 18.8652 171.69 19.4238V29.8545C171.69 30.4131 171.834 30.832 172.12 31.1113C172.407 31.3978 172.818 31.541 173.355 31.541H185.623C186.153 31.541 186.565 31.3978 186.858 31.1113C187.152 30.832 187.299 30.4131 187.299 29.8545V19.4238C187.299 18.8652 187.152 18.4463 186.858 18.167C186.565 17.8805 186.153 17.7373 185.623 17.7373H182.357V16.0078H185.655C186.78 16.0078 187.621 16.2871 188.18 16.8457C188.745 17.3971 189.028 18.2279 189.028 19.3379V29.9404C189.028 31.0505 188.745 31.8812 188.18 32.4326C187.621 32.9912 186.78 33.2705 185.655 33.2705H173.334ZM179.489 24.8486C179.26 24.8486 179.06 24.7663 178.888 24.6016C178.723 24.4368 178.641 24.2435 178.641 24.0215V13.0859L178.705 11.4854L178.104 12.1191L176.438 13.8916C176.288 14.0635 176.091 14.1494 175.848 14.1494C175.626 14.1494 175.439 14.0778 175.289 13.9346C175.146 13.7913 175.074 13.6123 175.074 13.3975C175.074 13.1898 175.16 13 175.332 12.8281L178.866 9.41211C178.981 9.30469 179.085 9.23307 179.178 9.19727C179.278 9.1543 179.382 9.13281 179.489 9.13281C179.604 9.13281 179.708 9.1543 179.801 9.19727C179.901 9.23307 180.005 9.30469 180.112 9.41211L183.657 12.8281C183.822 13 183.904 13.1898 183.904 13.3975C183.904 13.6123 183.829 13.7913 183.679 13.9346C183.528 14.0778 183.342 14.1494 183.12 14.1494C182.884 14.1494 182.69 14.0635 182.54 13.8916L180.886 12.1191L180.284 11.4854L180.349 13.0859V24.0215C180.349 24.2435 180.263 24.4368 180.091 24.6016C179.926 24.7663 179.726 24.8486 179.489 24.8486Z" />
  </svg>`}function ct(){return`<svg viewBox="45 41.5 19 6" focusable="false" aria-hidden="true">
    <path d="M47.2441 46.2949C46.2188 46.2949 45.3887 45.4746 45.3887 44.4492C45.3887 43.4238 46.2188 42.5938 47.2441 42.5938C48.2695 42.5938 49.0898 43.4238 49.0898 44.4492C49.0898 45.4746 48.2695 46.2949 47.2441 46.2949ZM54.5 46.2949C53.4746 46.2949 52.6445 45.4746 52.6445 44.4492C52.6445 43.4238 53.4746 42.5938 54.5 42.5938C55.5254 42.5938 56.3457 43.4238 56.3457 44.4492C56.3457 45.4746 55.5254 46.2949 54.5 46.2949ZM61.7559 46.2949C60.7305 46.2949 59.9004 45.4746 59.9004 44.4492C59.9004 43.4238 60.7305 42.5938 61.7559 42.5938C62.7812 42.5938 63.6113 43.4238 63.6113 44.4492C63.6113 45.4746 62.7812 46.2949 61.7559 46.2949Z" />
  </svg>`}function Zt(){return`<svg viewBox="44 39.5 21 13" focusable="false" aria-hidden="true">
    <path d="M54.3197 51.13C54.1836 51.1313 54.0545 51.1039 53.9322 51.0478C53.8171 50.9988 53.709 50.9246 53.6077 50.8253L45.201 42.3981C45.0058 42.2066 44.9068 41.9712 44.9042 41.6919C44.9024 41.5129 44.9438 41.3477 45.0283 41.1965C45.1128 41.0453 45.2298 40.926 45.3794 40.8386C45.5218 40.7513 45.686 40.7068 45.8722 40.705C46.1372 40.7024 46.3708 40.7933 46.5731 40.9775L54.2965 48.7238L61.8693 40.8302C62.068 40.6421 62.2999 40.5468 62.5648 40.5442C62.751 40.5424 62.9161 40.5838 63.0602 40.6684C63.2114 40.7529 63.3307 40.8699 63.4181 41.0194C63.5055 41.169 63.55 41.3333 63.5517 41.5123C63.5544 41.7916 63.4636 42.0288 63.2793 42.224L55.0256 50.8116C54.9264 50.9129 54.8161 50.9891 54.6948 51.0404C54.5808 51.0988 54.4558 51.1287 54.3197 51.13Z" />
  </svg>`}function Ut(){return`<svg viewBox="0 0 28 28" focusable="false" aria-hidden="true">
    <path d="M6.32 2.25h15.36c2.77 0 4.07 1.3 4.07 4.07v15.36c0 2.77-1.3 4.07-4.07 4.07H6.32c-2.77 0-4.07-1.3-4.07-4.07V6.32c0-2.77 1.3-4.07 4.07-4.07Zm.08 2C4.91 4.25 4.25 4.91 4.25 6.4v15.2c0 1.49.66 2.15 2.15 2.15h15.2c1.49 0 2.15-.66 2.15-2.15V6.4c0-1.49-.66-2.15-2.15-2.15H6.4Z" />
    <path d="M13.99 20.02c-.61 0-1.01-.41-1.01-1.03v-3.98H9c-.62 0-1.03-.4-1.03-1.01 0-.62.41-1.02 1.03-1.02h3.98V9c0-.62.4-1.03 1.01-1.03.62 0 1.02.41 1.02 1.03v3.98H19c.62 0 1.03.4 1.03 1.02 0 .61-.41 1.01-1.03 1.01h-3.99v3.98c0 .62-.4 1.03-1.02 1.03Z" />
  </svg>`}function Kt(t,e){const o=[...t?[{label:"More",icon:ct()}]:[],{label:"Share",icon:Q()},...e?[{label:"View More",icon:Zt()}]:[],{label:"Add to Home Screen",icon:Ut()}];return`<div class="agic-sequence" aria-label="${o.map(a=>a.label).join(", then ")}">
    ${o.map((a,i)=>`${i?'<span class="agic-arrow" aria-hidden="true">→</span>':""}
      <div class="agic-step"><div class="agic-glyph" aria-hidden="true">${a.icon}</div><span>${a.label}</span></div>`).join("")}
  </div>`}function gt(){const t=N==="ios26",e=z==="compact",i=t&&!z?`
    <div class="agic-content agic-choice">
      <div class="agic-kicker">Match their Safari</div>
      <h2>Which button do they see?</h2>
      <p>Ask them to look at the Safari toolbar. Then tap the matching row.</p>
      <button type="button" onclick="appsGuestInstallCoachSelectLayout('standard')">
        <span class="agic-choice-glyph">${Q()}</span>
        <span><strong>Share</strong><small>Top or bottom layout</small></span><b>›</b>
      </button>
      <button type="button" onclick="appsGuestInstallCoachSelectLayout('compact')">
        <span class="agic-choice-glyph">${ct()}</span>
        <span><strong>Three dots</strong><small>Compact layout</small></span><b>›</b>
      </button>
    </div>`:`
    <div class="agic-content">
      <div class="agic-kicker">What to say</div>
      <h2>${e?"Tell them: “Tap the three dots, then Share.”":"Tell them: “Tap Share.”"}</h2>
      ${Kt(e,t)}
      <p class="agic-finish">On the final screen, leave <strong>Open as Web App</strong> on and tap <strong>Add</strong>.</p>
      <p class="agic-help">If Add to Home Screen is missing, scroll down and tap Edit Actions.</p>
      <button class="agic-done" type="button" onclick="appsCloseGuestInstallCoach()">Got it</button>
    </div>`;return`
    <style>
      #appsGuestInstallCoach, #appsGuestInstallCoach * { box-sizing:border-box; }
      #appsGuestInstallCoach { position:fixed;inset:0;z-index:2147482500;display:flex;align-items:flex-end;justify-content:center;padding:8px 8px max(8px,env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;color:#1C1C1E;-webkit-font-smoothing:antialiased; }
      .agic-backdrop { position:absolute;inset:0;border:0;background:rgba(0,0,0,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px); }
      .agic-sheet { position:relative;z-index:1;width:min(100%,430px);overflow:hidden;border:.5px solid rgba(255,255,255,.8);border-radius:28px;background:rgba(246,246,248,.94);box-shadow:0 24px 72px rgba(0,0,0,.3);backdrop-filter:blur(38px) saturate(1.55);-webkit-backdrop-filter:blur(38px) saturate(1.55);animation:agic-in .28s cubic-bezier(.22,.78,.2,1); }
      .agic-header { min-height:48px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;padding:2px 4px 0; }
      .agic-header button { width:44px;height:44px;border:0;background:transparent;color:#007AFF;font:inherit;font-size:24px;display:grid;place-items:center;cursor:pointer; }
      .agic-header button:last-child { color:rgba(28,28,30,.78);font-size:19px; }
      .agic-header-title { text-align:center;font-size:13px;font-weight:650;color:rgba(60,60,67,.74); }
      .agic-version { width:max-content;display:flex;gap:2px;margin:0 auto 7px;padding:2px;border-radius:999px;background:rgba(118,118,128,.12); }
      .agic-version button { min-width:92px;min-height:29px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(60,60,67,.7);font:inherit;font-size:11px;font-weight:650;cursor:pointer; }
      .agic-version button.active { background:rgba(255,255,255,.9);color:#1C1C1E;box-shadow:0 1px 3px rgba(0,0,0,.08); }
      .agic-content { padding:14px 16px 18px;text-align:center; }
      .agic-kicker { margin-bottom:8px;color:#007AFF;font-size:10px;font-weight:750;letter-spacing:.08em;text-transform:uppercase; }
      .agic-content h2 { max-width:350px;margin:0 auto;color:#1C1C1E;font-size:20px;line-height:1.22;letter-spacing:-.018em;font-weight:650; }
      .agic-content > p { margin:7px auto 0;max-width:340px;color:rgba(60,60,67,.72);font-size:13px;line-height:1.45; }
      .agic-choice button { width:100%;min-height:61px;display:grid;grid-template-columns:42px 1fr 18px;align-items:center;gap:10px;padding:8px 13px;border:0;border-bottom:.5px solid rgba(60,60,67,.18);background:rgba(255,255,255,.78);color:#1C1C1E;text-align:left;font:inherit;cursor:pointer; }
      .agic-choice button:nth-of-type(1) { margin-top:17px;border-radius:14px 14px 0 0; }
      .agic-choice button:nth-of-type(2) { border-bottom:0;border-radius:0 0 14px 14px; }
      .agic-choice button strong,.agic-choice button small { display:block; }
      .agic-choice button strong { font-size:15px;font-weight:620; }
      .agic-choice button small { margin-top:2px;color:rgba(60,60,67,.62);font-size:11px; }
      .agic-choice button b { color:rgba(60,60,67,.32);font-size:20px;font-weight:400; }
      .agic-choice-glyph { width:36px;height:36px;display:grid;place-items:center;color:#007AFF; }
      .agic-choice-glyph svg { width:23px;height:28px;fill:currentColor;overflow:visible; }
      .agic-choice button:nth-of-type(2) .agic-choice-glyph svg { width:29px;height:27px; }
      .agic-sequence { width:100%;display:flex;align-items:flex-start;justify-content:center;margin:22px auto 0; }
      .agic-step { min-width:0;flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:7px;color:rgba(60,60,67,.72);font-size:10px;font-weight:520;line-height:1.15;text-align:center; }
      .agic-glyph { min-height:29px;display:grid;place-items:center;color:#007AFF; }
      .agic-glyph svg { width:27px;height:27px;display:block;fill:currentColor;overflow:visible;shape-rendering:geometricPrecision; }
      .agic-step:nth-child(1) .agic-glyph svg { width:23px;height:28px; }
      .agic-arrow { flex:0 0 auto;margin:6px -2px 0;color:rgba(60,60,67,.32);font-size:18px;line-height:1; }
      .agic-finish { margin-top:18px !important;color:rgba(60,60,67,.8) !important; }
      .agic-help { margin-top:7px !important;color:rgba(60,60,67,.53) !important;font-size:11px !important; }
      .agic-done { width:100%;min-height:48px;margin-top:17px;border:0;border-radius:14px;background:#007AFF;color:#fff;font:inherit;font-size:15px;font-weight:680;cursor:pointer; }
      @keyframes agic-in { from { opacity:0;transform:translateY(24px); } to { opacity:1;transform:translateY(0); } }
      @media (min-width:700px) { #appsGuestInstallCoach { align-items:center;padding:16px; } }
      @media (prefers-reduced-motion:reduce) { .agic-sheet { animation:none; } }
    </style>
    <button class="agic-backdrop" type="button" onclick="appsCloseGuestInstallCoach()" aria-label="Close installation guide"></button>
    <section class="agic-sheet" role="dialog" aria-modal="true" aria-label="How guests install your app">
      <div class="agic-header">
        ${t&&z?'<button type="button" onclick="appsGuestInstallCoachSelectLayout(null)" aria-label="Back">‹</button>':"<span></span>"}
        <div class="agic-header-title">Guest installation</div>
        <button type="button" onclick="appsCloseGuestInstallCoach()" aria-label="Close">×</button>
      </div>
      <div class="agic-version" aria-label="iPhone version">
        <button type="button" class="${t?"":"active"}" onclick="appsGuestInstallCoachSetVersion('classic')">Older iOS</button>
        <button type="button" class="${t?"active":""}" onclick="appsGuestInstallCoachSetVersion('ios26')">iOS 26</button>
      </div>
      ${i}
    </section>`}function ut(){const t=document.getElementById("appsGuestInstallCoach");t&&(t.innerHTML=gt())}function Qt(){b(!1),U(),document.getElementById("appsGuestInstallCoach")?.remove(),N="ios26",z=null,dt=document.body.style.overflow,document.body.style.overflow="hidden",isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(!1),F=e=>{e.key==="Escape"&&ht()},document.addEventListener("keydown",F);const t=document.createElement("div");t.id="appsGuestInstallCoach",t.innerHTML=gt(),document.body.appendChild(t)}function ht(){F&&(document.removeEventListener("keydown",F),F=null),document.getElementById("appsGuestInstallCoach")?.remove(),document.body.style.overflow=dt,isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&(window.setNativeShellVisible(!0),typeof window.syncNativeShellState=="function"&&window.syncNativeShellState())}function Xt(t){N=t==="classic"?"classic":"ios26",z=N==="classic"?"standard":null,ut()}function Jt(t){z=["standard","compact"].includes(t)?t:null,ut()}function ft(t,e){const o=t||"Video";return`<span class="${"apps-media-badge"+(e==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function B(t,e,o,a,i){const n=i?ft("Video"):"",s=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${a})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${n}</div>
      ${e?`<div class="apps-q-hint">${e}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${s}
  </button>`}function te(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function ee(t){const e=document.getElementById("appsView");if(!e)return;const o=(r.activeHotelId||"")+"|"+(r.activeHotelAppIcon||"")+"|"+(r.activeHotelDomain||"");t||e.dataset.appsKey!==o||!e.querySelector(".apps-page")?(xt(),e.dataset.appsKey=o):X()}function xt(){const t=document.getElementById("appsView");if(!t)return;const e=r.activeHotelName||"Your Property",o=r.activeHotelAppIcon||"",a=e.trim().charAt(0).toUpperCase()||"🏡",i=r.activeHotelDomain||"",n=i?"https://"+i:"#",s=i?"https://"+i+"/install":"#";function d(et){return JSON.stringify(et).replace(/"/g,"&quot;")}const c=Z(h.guestHome,520),m=[{type:"image",src:h.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${e}</strong> — they tap it to book you or text you. No app store.`}],f=[{type:"image",src:h.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:h.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:h.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],R=[{type:"video",src:h.guestInstallVideo,poster:h.guestHome,alt:"Guest adds property to phone",title:"How guests put your property on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your property shows up on their phone like an app. You don't need to do anything."}],_=[{type:"image",src:h.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your guest app.'},{type:"image",src:h.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:h.guestMessageNotifVideo,poster:h.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],l=isStandaloneApp(),x=isNativeFrontdeskApp(),L=String(r.nativeNotificationState||""),u=L==="registered",y=["authorized","registered","unavailable"].includes(L),p=x?u:l,j=x?u:p&&typeof Notification<"u"&&Notification.permission==="granted",O=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Put Front Desk on this phone":"Put Front Desk on my phone",w=Number(r.bookingReviewSettings?.reminderMinutes??15),I=`
    <div id="bookingReviewReminderSetting" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <label for="bookingReviewReminderSelect" style="display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${p?"var(--green)":"#8B938E"};margin-bottom:6px;">If you have not verified a booking</label>
      <select id="bookingReviewReminderSelect" onchange="saveBookingReviewReminderSetting(this)" ${p?"":'disabled aria-disabled="true"'} style="width:100%;padding:12px 11px;border:1px solid ${p?"var(--border)":"#D7DBD8"};border-radius:11px;background:${p?"#fff":"#E7E9E7"};color:${p?"var(--text)":"#8B938E"};font-family:inherit;font-size:13px;font-weight:700;box-sizing:border-box;cursor:${p?"pointer":"not-allowed"};">
        <option value="15"${w===15?" selected":""}>Remind every 15 minutes · up to 3 times</option>
        <option value="30"${w===30?" selected":""}>Remind every 30 minutes · up to 3 times</option>
        <option value="60"${w===60?" selected":""}>Remind every 1 hour · up to 3 times</option>
        <option value="0"${w===0?" selected":""}>Send the first notification only</option>
      </select>
      <div id="bookingReviewReminderHint" style="font-size:11px;color:var(--text-muted);line-height:1.45;margin-top:7px;">${x?u?"Reminders can reach this iPhone even when Front Desk is closed.":y?"Front Desk is connecting this iPhone to booking alerts.":"Allow notifications in iPhone Settings to receive booking alerts.":l?"Reminders stop as soon as you verify the room or cancel the booking.":"Download Front Desk to unlock this setting."}</div>
    </div>`;let $;x?$=`<div id="tour-fd-installed-badge" style="display:flex;align-items:flex-start;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#166534;">Front Desk is installed</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">${u?"Booking alerts can reach this iPhone even when the app is closed.":y?"Connecting this iPhone to booking alerts…":"Allow notifications in iPhone Settings so booking alerts can reach you."}</div></div>
    </div>`:l&&j?$=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">Booking and message alerts can reach this phone — even if Front Desk is closed.</div></div>
    </div>`:l?$=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">Front Desk is on this device. Turn on alerts so confirmed bookings and guest messages reach your phone.</p>
      <button onclick="enableBookingAlerts()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:$=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Put Front Desk on this phone first. There is no App Store — follow 3 quick steps and it appears on your home screen like an app.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Put Front Desk on this phone</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on your phone</div>`;const mt=x?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. ${u?"This iPhone can receive booking alerts.":y?"Booking-alert connection is in progress.":"Turn on notifications in iPhone Settings to receive booking alerts."}</span>
      </div>`:l?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${O}</button>`,yt=s!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',J="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",vt=o?J+"background:#fff;border:1px solid var(--border);padding:0;":J,wt=o?`<img src="${o}" alt="Property logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${a}</span>`,kt=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${vt}">
        ${wt}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${e}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${l?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change picture":"Upload picture"}</button>
        ${l?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,Tt=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${s!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your property to their phone. Scroll to the Install button.</p>`:""}
      ${s==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,St=s!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${s.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',Ct=`
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${o?`<img src="${o}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${a}</span>`}</div>
        <div class="apps-loop-name">${e}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,zt=`
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
        <div class="apps-story-actions">${mt}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your property is on their home screen.</p>
        <div class="apps-story-actions">${yt}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your property icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,It=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your property</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${c}" alt="Guest saves property to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${d(R)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${B("What guests see on their phone","",d(f),0,!1)}
          ${B("How guests add your property","",d(R),0,!0)}
          ${B("Guest texts you, you text back","",d(_),0,!0)}
          ${B("Your app and theirs — side by side","",d(m),0,!1)}
        </div>
        ${n!=="#"?`<button onclick="window.open('${n}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,$t=et=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${l?"Front Desk — installed":"Install Front Desk"}</div>
      ${$}
      ${I}
    </div>`,Bt=`
    <div class="apps-step-card" id="tour-fd-reminder-card" style="background:#F3F4F3;border-color:#D7DBD8;box-shadow:none;">
      <div style="display:flex;align-items:flex-start;gap:11px;">
        <div style="width:34px;height:34px;border-radius:10px;background:#E1E4E2;color:#737B76;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🔒</div>
        <div style="flex:1;min-width:0;">
          <div class="apps-section-divider" style="margin:0 0 5px;padding:0;border-top:none;color:#737B76;">Booking alerts</div>
          <div class="apps-step-title" style="color:#555D58;">Help prevent double bookings</div>
          <p style="font-size:12px;color:#737B76;line-height:1.5;margin:0;">Repeated alerts keep a new booking in front of you until you verify the room against walk-ins and other booking channels.</p>
        </div>
      </div>
      ${I}
      <button type="button" onclick="handleInstallFrontdesk()" style="width:100%;margin-top:14px;padding:13px 15px;border:none;border-radius:11px;background:var(--green);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">Download Front Desk to unlock alerts</button>
      <div style="font-size:11px;color:#737B76;line-height:1.45;text-align:center;margin-top:8px;">Booking notifications require the installed Front Desk on this device.</div>
    </div>`,V=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${kt}
    </div>`,At=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${e}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${Tt}
      ${St}
    </div>`,Ft=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${It}
      </div>
    </details>`,_t=`
    <div class="apps-step-card" id="tour-native-guest-share">
      <div class="apps-step-title" style="margin-bottom:14px;">Share guest app</div>
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show guest QR</button>
      ${s!=="#"?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;">
          <button type="button" onclick="navigator.clipboard.writeText('${s}').then(()=>toast('Guest app link copied','success'))" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Copy link</button>
          <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Open guest page</button>
        </div>
        <div id="guestInstallStats" style="display:none;margin-top:14px;"></div>`:'<div id="guestInstallStats" style="display:none;"></div><div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:10px;">Booking domain is still setting up.</div>'}
      <button type="button" class="apps-install-coach-trigger" id="tour-native-install-guide" onclick="appsOpenGuestInstallCoach()">
        <span class="apps-install-coach-trigger__icon" aria-hidden="true">${Q()}</span>
        <span><strong>Show installation steps</strong><small>Practice exactly what to tell an iPhone guest</small></span>
        <b aria-hidden="true">›</b>
      </button>
    </div>`,Lt=`
    <div class="apps-native-title">Guest App</div>
    ${`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your iPhone</div>
      <div class="apps-step-title">${u?"Booking alerts are on":y?"Connecting booking alerts":"Turn on booking alerts"}</div>
      <p style="font-size:12px;color:var(--text-muted);line-height:1.5;margin:0 0 ${u?"0":"12px"};">${u?"Front Desk can alert you about new bookings and room checks even when the app is closed.":y?"Front Desk has notification permission and is registering this iPhone. Refresh once if this message remains.":"Notifications are what let Front Desk warn you before an online booking conflicts with a walk-in or outside booking."}</p>
      ${u?'<button type="button" onclick="toggleAppNotifications()" style="width:100%;padding:11px;border:1.5px solid var(--green);border-radius:11px;background:#fff;color:var(--green);font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;margin-top:12px;">Send a test booking alert</button>':y?'<button type="button" onclick="window.location.reload()" style="width:100%;padding:12px;border:none;border-radius:11px;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">Retry booking alerts</button>':'<button type="button" onclick="openNativeNotificationSettings()" style="width:100%;padding:12px;border:none;border-radius:11px;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;">Open iPhone notification settings</button>'}
    </div>`}
    ${V()}
    ${_t}
    ${guestBroadcastCardHtml({compact:!0})}`,Ot=`
    ${$t()}
    ${V()}
    ${At}
    ${guestBroadcastCardHtml()}
    ${Ft}`,Ht=x?Lt:`${zt}
      ${Ct}
      ${l?Ot:`${Bt}${V()}`}`,tt=x?"":l?"Front Desk is installed. Guests can install your property from the direct booking page.":"Install Front Desk first. Then guests can install your property from the direct booking page.";t.innerHTML=`
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-native-title { font-size:24px;font-weight:800;color:var(--text);line-height:1.2;margin:2px 0 16px; }
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
    .apps-install-coach-trigger { width:100%;min-height:60px;display:grid;grid-template-columns:38px 1fr 16px;align-items:center;gap:10px;margin-top:13px;padding:9px 12px;border:1.5px solid #CFE0D6;border-radius:13px;background:#F4F9F6;color:var(--text);font:inherit;text-align:left;cursor:pointer; }
    .apps-install-coach-trigger:active { background:#EAF3EE; }
    .apps-install-coach-trigger__icon { width:34px;height:34px;display:grid;place-items:center;color:var(--green); }
    .apps-install-coach-trigger__icon svg { width:20px;height:25px;display:block;fill:currentColor;overflow:visible; }
    .apps-install-coach-trigger strong,.apps-install-coach-trigger small { display:block; }
    .apps-install-coach-trigger strong { font-size:13px;line-height:1.3;font-weight:800; }
    .apps-install-coach-trigger small { margin-top:3px;color:var(--text-muted);font-size:10.5px;line-height:1.35;font-weight:500; }
    .apps-install-coach-trigger > b { color:var(--green);font-size:20px;font-weight:500; }
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
    ${Ht}

    ${tt?`<p class="apps-footnote">${tt}</p>`:""}

  </div>`,typeof lucide<"u"&&lucide.createIcons(),X(),bt()}async function bt(){try{const t=await api("GET","/api/crm/booking-review-settings");if(!t?.success||!t.data)return;r.bookingReviewSettings=t.data;const e=document.getElementById("bookingReviewReminderSelect");e&&(e.value=String(t.data.reminderMinutes))}catch{}}async function oe(t){const e=String(r.bookingReviewSettings?.reminderMinutes??15),o=parseInt(t?.value,10);if([0,15,30,60].includes(o)){t&&(t.disabled=!0);try{const a=await api("POST","/api/crm/booking-review-settings",{reminderMinutes:o});if(!a?.success)throw new Error(a?.message||"Could not save reminder timing.");r.bookingReviewSettings=a.data,toast(o===0?"Booking reminders off — the first alert will still arrive.":`Booking reminders set for every ${o===60?"hour":o+" minutes"}.`,"success")}catch(a){t&&(t.value=e),toast(a?.message||"Could not save reminder timing.","error")}finally{t&&(t.disabled=!1)}}}async function X(){const t=document.getElementById("guestInstallStats");try{const e=await api("GET","/api/crm/guest-install-stats");if(!e.success)throw new Error(e.message||"Failed");if(r.guestPushSubscriberCount=e.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const o=e.totals||{},a=e.installedBookings||0,i=o.views||0;if(!a&&!i){t.style.display="none",t.innerHTML="";return}t.style.display="block";const n=e.installRatePercent!=null?e.installRatePercent:0,s=Object.entries(e.byTouchpoint||{}).filter(function(c){return c[1].views||c[1].installed}).sort(function(c,m){return(m[1].installed||0)-(c[1].installed||0)}).slice(0,5),d=s.length?s.map(function(c){const m=c[0].replace(/-/g," "),f=c[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+m+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(f.views||0)+" views · "+(f.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+a+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(d?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+d:"")}catch{r.guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}const ie={appsCloseLightbox:U,appsCloseGuestInstallCoach:ht,appsCloudinaryFull:lt,appsCloudinaryImg:Z,appsLbNav:G,appsLbRender:K,appsOpenLightbox:Wt,appsOpenGuestInstallCoach:Qt,appsPhoneImgStyle:W,appsQuestionRow:B,appsGuestInstallCoachSelectLayout:Jt,appsGuestInstallCoachSetVersion:Xt,appsTourClose:b,appsTourNav:jt,appsTourRender:S,appsVideoBadgeHtml:ft,detectAppPlatform:te,ensureAppsViewRendered:ee,loadBookingReviewSettings:bt,loadGuestInstallStats:X,renderAppsView:xt,saveBookingReviewReminderSetting:oe,startAppsTour:Vt};function pe(){Dt(ie)}export{ie as default,pe as install};
