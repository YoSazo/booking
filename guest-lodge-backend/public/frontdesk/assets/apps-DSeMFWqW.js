import{c as r,a as we,b as ke,e as Te}from"./settings-DkZp3vyS.js";function b(e){return typeof window<"u"&&typeof window[e]=="function"?window[e]:null}function X(...e){return b("ensureAppsViewRendered")?.(...e)}function J(...e){return b("showFinaleMockModal")?.(...e)}function ee(...e){return b("finishTourHydration")?.(...e)}function te(...e){return b("goLive")?.(...e)}function oe(...e){return b("toast")?.(...e)}function Se(...e){return b("appsCloseLightbox")?.(...e)}let F=[],c=0,P=!1,A=null,O=null,D=null,k=null;function Ce(){if(document.getElementById("frontdeskAppsTourStyle"))return;const e=document.createElement("style");e.id="frontdeskAppsTourStyle",e.textContent=`
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
  `,document.head.appendChild(e)}function w(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function ie(){A&&(document.removeEventListener("keydown",A),A=null)}function ze(e){ie(),A=t=>{if(t.defaultPrevented)return;const o=t.target&&t.target.tagName?t.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||t.target?.isContentEditable||(t.key==="Escape"?(t.preventDefault(),e.onSkip?.()):t.key==="Enter"||t.key==="ArrowRight"?(t.preventDefault(),e.onNext?.()):t.key==="ArrowLeft"&&(t.preventDefault(),e.onBack?.()))},document.addEventListener("keydown",A)}function Ie(e,t){return!e||!e.isConnected||t?.noHighlight?null:(e.dataset.appsTourOrigVisibility||(e.dataset.appsTourOrigVisibility=e.style.visibility||""),k?.destroy(),k=ke(e,{attribute:"data-apps-tour-spotlight-clone",zIndex:100002,hideSource:!0,prepareClone(o){o.style.boxShadow=t?.spotlightBoxShadow??"none",o.style.outline=t?.spotlightOutline??"none",o.style.outlineOffset=t?.spotlightOutlineOffset??"0",(e.classList.contains("apps-story-line")||t?.hideSpotlightBorder)&&(o.style.border="none",o.style.borderTop="none",o.style.borderTopWidth="0",o.style.paddingTop="0")}}),k?.element||null)}function ae(e){const t=e||{};ie(),D?.destroy(),D=null,k?.destroy(),k=null,O&&(clearTimeout(O),O=null);const o=document.getElementById("appsTourLightbox");o&&!t.keepLightbox&&o.remove();const n=document.getElementById("appsTourTooltip");n&&n.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(i=>i.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.appsTourOrigPosition||"",i.style.zIndex=i.dataset.appsTourOrigZIndex||"",i.style.isolation=i.dataset.appsTourOrigIsolation||"",i.style.boxShadow=i.dataset.appsTourOrigBoxShadow||"",i.style.outline=i.dataset.appsTourOrigOutline||"",i.style.outlineOffset=i.dataset.appsTourOrigOutlineOffset||"",i.style.transition=i.dataset.appsTourOrigTransition||"",i.style.visibility=i.dataset.appsTourOrigVisibility||"",i.dataset.appsTourOrigBorderTop!=null&&(i.style.borderTop=i.dataset.appsTourOrigBorderTop,i.style.paddingTop=i.dataset.appsTourOrigPaddingTop||"",delete i.dataset.appsTourOrigBorderTop,delete i.dataset.appsTourOrigPaddingTop),i.removeAttribute("data-apps-tour-highlighted"),delete i.dataset.appsTourOrigPosition,delete i.dataset.appsTourOrigZIndex,delete i.dataset.appsTourOrigIsolation,delete i.dataset.appsTourOrigBoxShadow,delete i.dataset.appsTourOrigOutline,delete i.dataset.appsTourOrigOutlineOffset,delete i.dataset.appsTourOrigTransition,delete i.dataset.appsTourOrigVisibility})}function f(e){ae(),document.body.style.overflow="";const t=P;P=!1;try{const o=typeof X=="function"?X:window.ensureAppsViewRendered;typeof o=="function"&&o(!0)}catch{}if(e&&(localStorage.setItem("appsTourDone","1"),t||localStorage.getItem("settingsTourStep")==="handoff"||r.settingsTourActive)){const n=typeof J=="function"?J:window.showFinaleMockModal;if(typeof n=="function"){n();return}}}function _e(e){const t=c+e;t<0||t>=F.length||(c=t,T())}function q(){if(localStorage.setItem("appsTourDone","1"),P||localStorage.getItem("settingsTourStep")==="handoff"||r.settingsTourActive){r.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const t=typeof ee=="function"?ee:window.finishTourHydration;typeof t=="function"&&t()}}function $e(){q();const e=typeof te=="function"?te:window.goLive;if(f(!1),typeof e=="function"){e();return}const t=typeof oe=="function"?oe:window.toast;typeof t=="function"&&t("Open Go live to activate your booking page.","error")}function T(){Ce();const e=F[c];if(!e){f(!0);return}const t=F.length,o=c>=t-1,n=`${c+1} / ${t}`,i=Math.max(8,Math.min(100,Math.round((c+1)/t*100))),a=document.querySelector(e.target);if(!a){c++,T();return}ae({keepLightbox:!0});let s=document.getElementById("appsTourLightbox");s||(s=document.createElement("div"),s.id="appsTourLightbox",s.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;",document.body.appendChild(s)),e.noHighlight||(a.dataset.appsTourOrigPosition=a.style.position||"",a.dataset.appsTourOrigZIndex=a.style.zIndex||"",a.dataset.appsTourOrigIsolation=a.style.isolation||"",a.dataset.appsTourOrigBoxShadow=a.style.boxShadow||"",a.dataset.appsTourOrigOutline=a.style.outline||"",a.dataset.appsTourOrigOutlineOffset=a.style.outlineOffset||"",a.dataset.appsTourOrigTransition=a.style.transition||"",a.style.position=a.style.position||"relative",a.style.zIndex="100002",a.style.isolation="isolate",a.style.transition="box-shadow 0.18s ease, outline 0.18s ease",a.style.boxShadow=e.spotlightBoxShadow??"none",a.style.outline=e.spotlightOutline??"none",a.style.outlineOffset=e.spotlightOutlineOffset??"0",(a.classList.contains("apps-story-line")||e.hideSpotlightBorder)&&(a.dataset.appsTourOrigBorderTop=a.style.borderTop||"",a.dataset.appsTourOrigPaddingTop=a.style.paddingTop||"",a.style.borderTop="none",a.style.paddingTop="0"),a.setAttribute("data-apps-tour-highlighted","1"));const l=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=e.scrollBlock||"nearest",y=l?"auto":"smooth";a.scrollIntoView({behavior:y,block:m});const h=()=>{const d=document.getElementById("appsTourTooltip");d&&d.remove();const p=Math.min(370,window.innerWidth-28),x=e.primaryLabel||(o?"Done":"Next"),L=e.secondaryLabel||(o?"Not now":"Skip tour"),z=c<=0,V=e.kicker||"Guestel",u=document.createElement("div");u.id="appsTourTooltip",u.style.cssText=`position:fixed;z-index:100003;left:12px;top:14px;width:${p}px;max-width:${p}px;visibility:hidden;`,u.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${w(e.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${n}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${i}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${w(V)}</div>
        <div class="apps-tour-title">${w(e.title)}</div>
        <p class="apps-tour-copy">${w(e.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${z?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${w(L)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${w(x)}</button>
        </div>
      </div>`,document.body.appendChild(u),Ie(a,e);const K=u.querySelector(".apps-tour-panel");D?.destroy(),D=we({tooltip:u,panel:K,target:a,anchor:a,spotlight:k,options:{preferredPlacement:e.tooltipPosition||"auto",maxWidth:p,gap:e.tooltipGap??10,autoScroll:!0,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),u.style.visibility="visible";const M=()=>{if(e.activateOnNext){$e();return}if(o){q(),f(!1),e.openGuestInstallCoachOnNext&&window.setTimeout(()=>b("appsOpenGuestInstallCoach")?.(),0);return}c++,T()},I=()=>{if(o){q(),f(!1);return}f(!0)},E=()=>{c<=0||(c--,T())};document.getElementById("appsTourNextBtn").onclick=M,document.getElementById("appsTourSkipBtn").onclick=I;const _=document.getElementById("appsTourBackBtn");_&&(_.onclick=E),ze({onNext:M,onBack:E,onSkip:I})};O=setTimeout(()=>{requestAnimationFrame(h)},l?40:320)}function Ge(e){const t=e&&e.replay,o=e&&e.chainFromSettingsTour;if(!t&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;Se(),f(!1),P=!!o;const n=!!r.hotelSubscribed;F=!!b("isNativeFrontdeskApp")?.()||document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1"?[{target:"#tour-guest-reach",kicker:"Guestel updates",title:"Reach guests who choose to hear from you.",text:"Guests who keep your property in Guestel and allow property updates can receive a notification from you.",tooltipPosition:"above"},{target:"#tour-native-guest-share",kicker:"Invite guests",title:"Give them one Guestel link.",text:"Show the QR or copy the Guestel link. Guests can book immediately, then keep your property and stay in Guestel.",tooltipPosition:"above"},{target:"#tour-guest-icon-section",kicker:"Make it yours",title:"Choose how your property appears.",text:"Use your logo or a clear property photo for your Guestel card.",scrollBlock:"start",tooltipPosition:"below"}]:[{target:"#tour-apps-intro",kicker:"The loop",title:"One system with a clear side for you and for guests.",text:"You use Marketel Front Desk. Guests use Guestel and your direct booking experience."},{target:"#tour-apps-first",kicker:"Your side",title:"Download Marketel Front Desk.",text:"The owner app receives new-booking alerts even when the web dashboard is closed. Guests do not download this app.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-then",kicker:"Their side",title:"Guests keep your property in Guestel.",text:"They tap Add on your booking page. Guestel keeps your property, reservations, and messages together.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-after",kicker:"Direct reach",title:"Send a notification to their phone whenever you want.",text:"Anyone who keeps your property in Guestel and opts into property updates becomes reachable from Marketel Front Desk.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the Guestel card feel like your property.",text:"Use a real logo or a clear property photo.",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10},{target:"#tour-apps-loop",kicker:n?"Live loop":"Activation",title:n?"This loop is on.":"Everything is ready to turn on.",text:n?"Guests book, keep your property in Guestel, receive opted-in updates, and message you. Front Desk gets the alerts.":"For $199/month, guests can book direct, keep your property in Guestel, receive opted-in updates, and message you — while Front Desk receives the alerts.",primaryLabel:n?"Done":"Activate everything — $199/month",secondaryLabel:n?"Close":"Keep exploring",activateOnNext:!n,tooltipPosition:"below",tooltipGap:8}],c=0,T()}const g={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},Ae="32px";function Y(e,t){return e.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(t||400)+"/")}function R(e){return`border-radius:${Ae};box-shadow:0 10px 36px rgba(0,0,0,0.22);${e||""}`}function ne(e){const t=Math.min(window.devicePixelRatio||1,2),o=Math.round(Math.min(window.screen.width*t,1600));return e.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${o}/`)}let N=[],S=0,j="ios26",C=null,re="",B=null;function Be(e,t){f(!1),isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(!1),N=e,S=t||0;let o=document.getElementById("appsLightbox");if(!o){o=document.createElement("div"),o.id="appsLightbox",o.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(o),document.body.style.overflow="hidden",o._keyHandler=i=>{i.key==="ArrowRight"||i.key==="ArrowDown"?H(1):i.key==="ArrowLeft"||i.key==="ArrowUp"?H(-1):i.key==="Escape"&&W()},document.addEventListener("keydown",o._keyHandler);let n=0;o.addEventListener("touchstart",i=>{n=i.changedTouches[0].clientX},{passive:!0}),o.addEventListener("touchend",i=>{const a=i.changedTouches[0].clientX-n;Math.abs(a)>50&&H(a<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",U()}function W(){const e=document.getElementById("appsLightbox");e&&(document.removeEventListener("keydown",e._keyHandler),e.remove(),document.body.style.overflow="",isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&(window.setNativeShellVisible(!0),typeof window.syncNativeShellState=="function"&&window.syncNativeShellState()))}function H(e){const t=N.length;t<=1||(S=(S+e+t)%t,U())}function U(){const e=document.getElementById("appsLightbox");if(!e)return;const t=N[S],o=N.length,n=t.type!=="video",i=o>1?`${S+1} / ${o}`:"",a=n?`<img src="${ne(t.src)}" alt="${t.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${R()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${R()}"
          ${t.poster?`poster="${Y(t.poster,400)}"`:""}>
          <source src="${t.src}" type="video/mp4">
       </video>`,s=o>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",l=o>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",m=o>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:o},(y,h)=>`<div onclick="appsOpenLightbox(_appsLbItems,${h})" style="width:7px;height:7px;border-radius:50%;background:${h===S?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";e.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${i}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${a}
      ${s}${l}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${t.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${t.title}</div>`:""}
      ${t.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${t.caption}</div>`:""}
      ${m}
    </div>`}function se(){return`<svg viewBox="169 8.5 21 25.5" focusable="false" aria-hidden="true">
    <path d="M173.334 33.2705C172.21 33.2705 171.365 32.9912 170.799 32.4326C170.24 31.8812 169.961 31.0505 169.961 29.9404V19.3379C169.961 18.2279 170.24 17.3971 170.799 16.8457C171.365 16.2871 172.21 16.0078 173.334 16.0078H176.621V17.7373H173.355C172.818 17.7373 172.407 17.8805 172.12 18.167C171.834 18.4463 171.69 18.8652 171.69 19.4238V29.8545C171.69 30.4131 171.834 30.832 172.12 31.1113C172.407 31.3978 172.818 31.541 173.355 31.541H185.623C186.153 31.541 186.565 31.3978 186.858 31.1113C187.152 30.832 187.299 30.4131 187.299 29.8545V19.4238C187.299 18.8652 187.152 18.4463 186.858 18.167C186.565 17.8805 186.153 17.7373 185.623 17.7373H182.357V16.0078H185.655C186.78 16.0078 187.621 16.2871 188.18 16.8457C188.745 17.3971 189.028 18.2279 189.028 19.3379V29.9404C189.028 31.0505 188.745 31.8812 188.18 32.4326C187.621 32.9912 186.78 33.2705 185.655 33.2705H173.334ZM179.489 24.8486C179.26 24.8486 179.06 24.7663 178.888 24.6016C178.723 24.4368 178.641 24.2435 178.641 24.0215V13.0859L178.705 11.4854L178.104 12.1191L176.438 13.8916C176.288 14.0635 176.091 14.1494 175.848 14.1494C175.626 14.1494 175.439 14.0778 175.289 13.9346C175.146 13.7913 175.074 13.6123 175.074 13.3975C175.074 13.1898 175.16 13 175.332 12.8281L178.866 9.41211C178.981 9.30469 179.085 9.23307 179.178 9.19727C179.278 9.1543 179.382 9.13281 179.489 9.13281C179.604 9.13281 179.708 9.1543 179.801 9.19727C179.901 9.23307 180.005 9.30469 180.112 9.41211L183.657 12.8281C183.822 13 183.904 13.1898 183.904 13.3975C183.904 13.6123 183.829 13.7913 183.679 13.9346C183.528 14.0778 183.342 14.1494 183.12 14.1494C182.884 14.1494 182.69 14.0635 182.54 13.8916L180.886 12.1191L180.284 11.4854L180.349 13.0859V24.0215C180.349 24.2435 180.263 24.4368 180.091 24.6016C179.926 24.7663 179.726 24.8486 179.489 24.8486Z" />
  </svg>`}function pe(){return`<svg viewBox="45 41.5 19 6" focusable="false" aria-hidden="true">
    <path d="M47.2441 46.2949C46.2188 46.2949 45.3887 45.4746 45.3887 44.4492C45.3887 43.4238 46.2188 42.5938 47.2441 42.5938C48.2695 42.5938 49.0898 43.4238 49.0898 44.4492C49.0898 45.4746 48.2695 46.2949 47.2441 46.2949ZM54.5 46.2949C53.4746 46.2949 52.6445 45.4746 52.6445 44.4492C52.6445 43.4238 53.4746 42.5938 54.5 42.5938C55.5254 42.5938 56.3457 43.4238 56.3457 44.4492C56.3457 45.4746 55.5254 46.2949 54.5 46.2949ZM61.7559 46.2949C60.7305 46.2949 59.9004 45.4746 59.9004 44.4492C59.9004 43.4238 60.7305 42.5938 61.7559 42.5938C62.7812 42.5938 63.6113 43.4238 63.6113 44.4492C63.6113 45.4746 62.7812 46.2949 61.7559 46.2949Z" />
  </svg>`}function Le(){return`<svg viewBox="44 39.5 21 13" focusable="false" aria-hidden="true">
    <path d="M54.3197 51.13C54.1836 51.1313 54.0545 51.1039 53.9322 51.0478C53.8171 50.9988 53.709 50.9246 53.6077 50.8253L45.201 42.3981C45.0058 42.2066 44.9068 41.9712 44.9042 41.6919C44.9024 41.5129 44.9438 41.3477 45.0283 41.1965C45.1128 41.0453 45.2298 40.926 45.3794 40.8386C45.5218 40.7513 45.686 40.7068 45.8722 40.705C46.1372 40.7024 46.3708 40.7933 46.5731 40.9775L54.2965 48.7238L61.8693 40.8302C62.068 40.6421 62.2999 40.5468 62.5648 40.5442C62.751 40.5424 62.9161 40.5838 63.0602 40.6684C63.2114 40.7529 63.3307 40.8699 63.4181 41.0194C63.5055 41.169 63.55 41.3333 63.5517 41.5123C63.5544 41.7916 63.4636 42.0288 63.2793 42.224L55.0256 50.8116C54.9264 50.9129 54.8161 50.9891 54.6948 51.0404C54.5808 51.0988 54.4558 51.1287 54.3197 51.13Z" />
  </svg>`}function Me(){return`<svg viewBox="0 0 28 28" focusable="false" aria-hidden="true">
    <path d="M6.32 2.25h15.36c2.77 0 4.07 1.3 4.07 4.07v15.36c0 2.77-1.3 4.07-4.07 4.07H6.32c-2.77 0-4.07-1.3-4.07-4.07V6.32c0-2.77 1.3-4.07 4.07-4.07Zm.08 2C4.91 4.25 4.25 4.91 4.25 6.4v15.2c0 1.49.66 2.15 2.15 2.15h15.2c1.49 0 2.15-.66 2.15-2.15V6.4c0-1.49-.66-2.15-2.15-2.15H6.4Z" />
    <path d="M13.99 20.02c-.61 0-1.01-.41-1.01-1.03v-3.98H9c-.62 0-1.03-.4-1.03-1.01 0-.62.41-1.02 1.03-1.02h3.98V9c0-.62.4-1.03 1.01-1.03.62 0 1.02.41 1.02 1.03v3.98H19c.62 0 1.03.4 1.03 1.02 0 .61-.41 1.01-1.03 1.01h-3.99v3.98c0 .62-.4 1.03-1.02 1.03Z" />
  </svg>`}function Ee(e,t){const o=[...e?[{label:"More",icon:pe()}]:[],{label:"Share",icon:se()},...t?[{label:"View More",icon:Le()}]:[],{label:"Add to Home Screen",icon:Me()}];return`<div class="agic-sequence" aria-label="${o.map(n=>n.label).join(", then ")}">
    ${o.map((n,i)=>`${i?'<span class="agic-arrow" aria-hidden="true">→</span>':""}
      <div class="agic-step"><div class="agic-glyph" aria-hidden="true">${n.icon}</div><span>${n.label}</span></div>`).join("")}
  </div>`}function le(){const e=j==="ios26",t=C==="compact",i=e&&!C?`
    <div class="agic-content agic-choice">
      <div class="agic-kicker">Match their Safari</div>
      <h2>Which button do they see?</h2>
      <p>Ask them to look at the Safari toolbar. Then tap the matching row.</p>
      <button type="button" onclick="appsGuestInstallCoachSelectLayout('standard')">
        <span class="agic-choice-glyph">${se()}</span>
        <span><strong>Share</strong><small>Top or bottom layout</small></span><b>›</b>
      </button>
      <button type="button" onclick="appsGuestInstallCoachSelectLayout('compact')">
        <span class="agic-choice-glyph">${pe()}</span>
        <span><strong>Three dots</strong><small>Compact layout</small></span><b>›</b>
      </button>
    </div>`:`
    <div class="agic-content">
      <div class="agic-kicker">What to say</div>
      <h2>${t?"Tell them: “Tap the three dots, then Share.”":"Tell them: “Tap Share.”"}</h2>
      ${Ee(t,e)}
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
    <section class="agic-sheet" role="dialog" aria-modal="true" aria-label="How guests save your property to their Home Screen">
      <div class="agic-header">
        ${e&&C?'<button type="button" onclick="appsGuestInstallCoachSelectLayout(null)" aria-label="Back">‹</button>':"<span></span>"}
        <div class="agic-header-title">Save to Home Screen</div>
        <button type="button" onclick="appsCloseGuestInstallCoach()" aria-label="Close">×</button>
      </div>
      <div class="agic-version" aria-label="iPhone version">
        <button type="button" class="${e?"":"active"}" onclick="appsGuestInstallCoachSetVersion('classic')">Older iOS</button>
        <button type="button" class="${e?"active":""}" onclick="appsGuestInstallCoachSetVersion('ios26')">iOS 26</button>
      </div>
      ${i}
    </section>`}function de(){const e=document.getElementById("appsGuestInstallCoach");e&&(e.innerHTML=le())}function Oe(){f(!1),W(),document.getElementById("appsGuestInstallCoach")?.remove(),j="ios26",C=null,re=document.body.style.overflow,document.body.style.overflow="hidden",isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(!1),B=t=>{t.key==="Escape"&&ce()},document.addEventListener("keydown",B);const e=document.createElement("div");e.id="appsGuestInstallCoach",e.innerHTML=le(),document.body.appendChild(e)}function ce(){B&&(document.removeEventListener("keydown",B),B=null),document.getElementById("appsGuestInstallCoach")?.remove(),document.body.style.overflow=re,isNativeFrontdeskApp()&&typeof window.setNativeShellVisible=="function"&&(window.setNativeShellVisible(!0),typeof window.syncNativeShellState=="function"&&window.syncNativeShellState())}function He(e){j=e==="classic"?"classic":"ios26",C=j==="classic"?"standard":null,de()}function Fe(e){C=["standard","compact"].includes(e)?e:null,de()}function ge(e,t){const o=e||"Video";return`<span class="${"apps-media-badge"+(t==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${o}</span></span>`}function G(e,t,o,n,i){const a=i?ge("Video"):"",s=i?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${i?" apps-q--video":""}" onclick="appsOpenLightbox(${o},${n})">
    <div class="apps-q-text">
      <div class="apps-q-title">${e}${a}</div>
      ${t?`<div class="apps-q-hint">${t}</div>`:i?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${s}
  </button>`}function Pe(){const e=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(e)&&!window.MSStream?"ios":/android/i.test(e)?"android":"ios"}function De(e){const t=document.getElementById("appsView");if(!t)return;const o=document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1",n=(r.activeHotelId||"")+"|"+(r.activeHotelAppIcon||"")+"|"+(r.activeHotelDomain||"")+"|"+(o?"native-preview":"standard");e||t.dataset.appsKey!==n||!t.querySelector(".apps-page")?(ue(),t.dataset.appsKey=n):(isNativeFrontdeskApp()||o)&&Z()}function ue(){const e=document.getElementById("appsView");if(!e)return;const t=r.activeHotelName||"Your Property",o=r.activeHotelAppIcon||"",n=t.trim().charAt(0).toUpperCase()||"P",i=r.activeHotelDomain||"",a=i?"https://"+i:"#",s=r.activeHotelId?`https://clip.mktel.co/clip/${encodeURIComponent(r.activeHotelId)}?intent=book&ref=frontdesk-guestel`:a;function l(ve){return JSON.stringify(ve).replace(/"/g,"&quot;")}const m=Y(g.guestHome,520),y=[{type:"image",src:g.homeScreen,alt:"Owner and guest Home Screens",title:"Two different actions. Two different phones.",caption:`You download <strong>Marketel Front Desk</strong> from the App Store. Guests never download Front Desk; they save <strong>${t}</strong> from your booking page.`}],h=[{type:"image",src:g.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:g.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:g.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],v=[{type:"video",src:g.guestInstallVideo,poster:g.guestHome,alt:"Guest adds property to phone",title:"How guests put your property on their phone",caption:"They open your booking page and tap <strong>Add to Home Screen</strong>. Your property gets its own icon. No App Store is involved."}],d=[{type:"image",src:g.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:"Like “How do I connect to WiFi?” — they message you from the property they saved."},{type:"image",src:g.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Guest Reach</strong> in Marketel Front Desk, choose the conversation, and reply."},{type:"video",src:g.guestMessageNotifVideo,poster:g.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],p=isStandaloneApp(),x=isNativeFrontdeskApp(),L=document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1",z=x||L,V=String(r.nativeNotificationState||""),u=L||V==="registered",M=x?u:(x?u:p)&&typeof Notification<"u"&&Notification.permission==="granted";Number(r.bookingReviewSettings?.reminderMinutes??15),x||p&&M||p||String(r.frontdeskAppStoreUrl||"").trim();const I="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",E=o?I+"background:#fff;border:1px solid var(--border);padding:0;":I,_=o?`<img src="${o}" alt="Property logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${n}</span>`,xe=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${E}">
        ${_}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this image with <strong>${t}</strong> in Guestel.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${p?"document.getElementById('appsAppIconInput').click()":"toast('Download Marketel Front Desk first. Then you can change the property image guests see in Guestel.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${o?"Change picture":"Upload picture"}</button>
        ${p?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Download Marketel Front Desk first to upload this picture.</div>'}
      </div>
    </div>`;s!=="#"&&`${s.replace("https://","")}`,`${m}${l(v)}${G("What guests see on their phone","",l(h),0,!1)}${G("How guests save your property","",l(v),0,!0)}${G("Guest texts you, you text back","",l(d),0,!0)}${G("Your owner app and their saved property","",l(y),0,!1)}`,a!=="#"&&`${a}`;const fe=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your property in Guestel</div>
      ${xe}
    </div>`,be=`
    <div class="apps-step-card" id="tour-native-guest-share">
      <div class="apps-step-title" style="margin-bottom:14px;">Invite guests into Guestel</div>
      <div class="guestel-owner-preview" aria-label="Preview of the property in Guestel">
        <div class="guestel-owner-preview__bar"><span>Guestel</span><b>Saved hotel</b></div>
        <div class="guestel-owner-preview__card">
          <div class="guestel-owner-preview__image">${_}</div>
          <div><strong>${t}</strong><span>Direct booking · Messages · Stay updates</span></div>
        </div>
      </div>
      <div style="margin:0 0 14px;padding:11px 12px;border-radius:11px;background:var(--green-pale);color:#245a40;font-size:12px;line-height:1.5;"><strong>What to say:</strong> “Scan this to book directly and keep us in Guestel.”</div>
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show Guestel QR</button>
      ${s!=="#"?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;">
          <button type="button" onclick="navigator.clipboard.writeText('${s}').then(()=>toast('Guestel link copied','success'))" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Copy Guestel link</button>
          <button type="button" onclick="window.open('${s}','_blank')" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Open guest experience</button>
        </div>
        <div id="guestInstallStats" style="display:none;margin-top:14px;"></div>`:'<div id="guestInstallStats" style="display:none;"></div><div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:10px;">Booking domain is still setting up.</div>'}
    </div>`,me=`
    <div class="apps-native-title">Guestel</div>
    <p class="apps-native-lead">Guests keep <strong>${t}</strong> in Guestel for direct booking, reservation updates, and messages. You manage that relationship here.</p>
    <div id="messagesPanel"></div>
    ${guestBroadcastCardHtml({compact:!0})}
    ${be}
    ${fe()}`,$=!!String(r.frontdeskAppStoreUrl||"").trim(),ye=z?me:`
    <section style="min-height:52vh;display:grid;place-items:center;padding:34px 0;">
      <div style="width:min(100%,430px);padding:28px 24px;border:1.5px solid var(--border);border-radius:22px;background:#fff;text-align:center;box-shadow:0 14px 40px rgba(26,43,34,.09);">
        <div style="width:58px;height:58px;display:grid;place-items:center;margin:0 auto 16px;border-radius:17px;background:var(--green-pale);color:var(--green);font-size:25px;"><i data-lucide="arrow-up-right" style="width:15px;height:15px;"></i></div>
        <div style="font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:var(--green);">Guestel tools</div>
        <h2 style="margin:7px 0 9px;color:var(--text);font-size:23px;line-height:1.18;">Manage Guestel from the owner app.</h2>
        <p style="margin:0 0 20px;color:var(--text-muted);font-size:14px;line-height:1.55;">Download Marketel Front Desk to share your Guestel QR, reply to verified guests, and send updates to guests who opt in.</p>
        <button type="button" onclick="openFrontdeskAppDownload()" ${$?"":'aria-disabled="true"'} style="width:100%;min-height:50px;border:0;border-radius:13px;background:${$?"var(--green)":"#dce8e1"};color:${$?"#fff":"#527061"};font-family:inherit;font-size:15px;font-weight:800;cursor:${$?"pointer":"default"};">${$?"Download Marketel Front Desk":"Front Desk app coming soon"}</button>
      </div>
    </section>`,Q=z?"":p?"Front Desk is installed. Guests use Guestel; owners use Marketel Front Desk.":"You use Marketel Front Desk. Guests use Guestel.";e.innerHTML=`
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-native-title { font-size:24px;font-weight:800;color:var(--text);line-height:1.2;margin:2px 0 7px; }
    .apps-native-lead { margin:0 0 16px;color:var(--text-muted);font-size:14px;line-height:1.5; }
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
    .guestel-owner-preview { margin:-2px 0 14px;padding:12px;border:1px solid #CFE0D6;border-radius:16px;background:linear-gradient(145deg,#EAF4EE,#F8FAF9); }
    .guestel-owner-preview__bar { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--green);font-size:11px;font-weight:850;letter-spacing:.04em;text-transform:uppercase; }
    .guestel-owner-preview__bar b { color:var(--text-muted);font-size:9px;letter-spacing:.05em; }
    .guestel-owner-preview__card { min-height:78px;display:grid;grid-template-columns:54px minmax(0,1fr);align-items:center;gap:12px;padding:12px;border-radius:15px;background:#fff;box-shadow:0 8px 22px rgba(26,43,34,.11); }
    .guestel-owner-preview__image { width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:13px;background:var(--green); }
    .guestel-owner-preview__image > img,.guestel-owner-preview__image > span { width:100% !important;height:100% !important;border-radius:13px !important;object-fit:cover; }
    .guestel-owner-preview__card strong,.guestel-owner-preview__card span { display:block;min-width:0; }
    .guestel-owner-preview__card strong { overflow:hidden;color:var(--text);font-size:15px;font-weight:850;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-owner-preview__card span { margin-top:4px;color:var(--text-muted);font-size:10.5px;line-height:1.35; }
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
    .apps-broadcast-card { background:var(--white);border:1.5px solid #CFE0D6;border-radius:18px;padding:18px;margin-bottom:16px;box-shadow:0 12px 34px rgba(26,43,34,.09); }
    .guest-reach-intro { margin-bottom:13px; }
    .guest-reach-kicker { margin-bottom:6px;color:var(--green);font-size:10px;font-weight:850;letter-spacing:.085em;text-transform:uppercase; }
    .guest-reach-title { color:var(--text);font-size:20px;font-weight:850;line-height:1.18;letter-spacing:-.01em; }
    .guest-reach-intro p { margin:7px 0 0;color:var(--text-muted);font-size:13px;line-height:1.5; }
    .guest-notification-demo { margin:0 0 14px;padding:15px 11px 11px;border-radius:16px;background:linear-gradient(145deg,#BFD2C7,#E7ECE9);overflow:hidden; }
    .guest-notification-shell { padding:12px 13px 13px;border:1px solid rgba(255,255,255,.66);border-radius:20px;background:rgba(246,248,247,.9);box-shadow:0 8px 24px rgba(20,40,29,.16),inset 0 1px 0 rgba(255,255,255,.84);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;font-synthesis:none;font-kerning:normal;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-backdrop-filter:saturate(1.35) blur(18px);backdrop-filter:saturate(1.35) blur(18px); }
    .guest-notification-meta { min-width:0;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;color:rgba(60,60,67,.6);font-size:11px;font-weight:400;line-height:1;letter-spacing:-.01em; }
    .guest-notification-meta strong { overflow:hidden;color:rgba(60,60,67,.72);font-size:11px;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-meta > span:last-child { color:rgba(60,60,67,.55);font-weight:400; }
    .guest-notification-icon { width:28px;height:28px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(60,60,67,.12);border-radius:7px;background:#fff;color:#fff;font-size:12px;font-weight:700;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.08); }
    .guest-notification-icon img { width:100%;height:100%;display:block;padding:1px;border-radius:6px;background:#fff;object-fit:contain;box-sizing:border-box; }
    .guest-notification-icon span { width:100%;height:100%;display:grid;place-items:center;background:var(--green); }
    .guest-notification-title { margin-top:9px;overflow:hidden;color:#111;font-size:15px;font-weight:600;line-height:1.22;letter-spacing:-.012em;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-body { min-height:36px;margin-top:2px;overflow:hidden;color:rgba(0,0,0,.78);font-size:14px;font-weight:400;line-height:1.28;letter-spacing:-.008em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2; }
    .guest-notification-caption { margin-top:8px;color:#526158;font-size:10px;font-weight:700;text-align:center; }
    .guest-reach-suggestion { margin:-2px 0 12px;padding:0;border:0;background:none;color:var(--green);font:inherit;font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer; }
    .guest-reach-video { width:100%;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;padding:8px;border:0;background:none;color:var(--green);font:inherit;font-size:11px;font-weight:750;cursor:pointer; }
    .guest-reach-video span { width:21px;height:21px;display:grid;place-items:center;padding-left:1px;border-radius:50%;background:#E6F2EB;color:var(--green);font-size:8px; }
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

    ${isPwaSimulated()?'<div style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;color:#9a3412;line-height:1.45;text-align:center;"><i data-lucide="smartphone" style="width:15px;height:15px;"></i> <strong>PWA preview</strong> — compact installed layout. Add <code style="font-size:11px;background:#ffedd5;padding:1px 5px;border-radius:4px;">?pwa=0</code> to the URL to exit.</div>':""}
    ${ye}

    ${Q?`<p class="apps-footnote">${Q}</p>`:""}

  </div>`,typeof lucide<"u"&&lucide.createIcons(),z&&(r.guestMessages.length?renderMessages():loadMessages(),Z(),he())}async function he(){try{const e=await api("GET","/api/crm/booking-review-settings");if(!e?.success||!e.data)return;r.bookingReviewSettings=e.data;const t=document.getElementById("bookingReviewReminderSelect");t&&(t.value=String(e.data.reminderMinutes))}catch{}}async function Ne(e){const t=String(r.bookingReviewSettings?.reminderMinutes??15),o=parseInt(e?.value,10);if([0,15,30,60].includes(o)){e&&(e.disabled=!0);try{const n=await api("POST","/api/crm/booking-review-settings",{reminderMinutes:o});if(!n?.success)throw new Error(n?.message||"Could not save reminder timing.");r.bookingReviewSettings=n.data,toast(o===0?"Booking reminders off — the first alert will still arrive.":`Booking reminders set for every ${o===60?"hour":o+" minutes"}.`,"success")}catch(n){e&&(e.value=t),toast(n?.message||"Could not save reminder timing.","error")}finally{e&&(e.disabled=!1)}}}async function Z(){const e=document.getElementById("guestInstallStats");try{const t=await api("GET","/api/crm/guest-install-stats");if(!t.success)throw new Error(t.message||"Failed");if(r.guestPushSubscriberCount=t.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!e)return;const o=t.totals||{},n=t.installedBookings||0,i=o.views||0,a=o.notification_prompts||0,s=t.guestPushSubscribers||0,l=t.guestelSavedDevices||0,m=t.guestelBroadcastSubscribers||0;if(!n&&!i&&!t.guestelSavedDevices&&!t.guestelBroadcastSubscribers){e.style.display="none",e.innerHTML="";return}e.style.display="block";const y=t.installRatePercent!=null?t.installRatePercent:0,h=Object.entries(t.byTouchpoint||{}).filter(function(d){return d[1].views||d[1].installed}).sort(function(d,p){return(p[1].installed||0)-(d[1].installed||0)}).slice(0,5),v=h.length?h.map(function(d){const p=d[0].replace(/-/g," "),x=d[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+p+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(x.views||0)+" views · "+(x.installed||0)+" installed</span></div>"}).join(""):"";e.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guestel activity</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+l+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">devices keeping your property</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+m+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Guestel devices opted into updates</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">total reachable devices</div></div></div>'+(n||i||y?'<div style="font-size:10px;color:var(--text-muted);line-height:1.45;margin:-2px 0 10px;">Legacy Home Screen activity remains supported for existing installs: '+n+" confirmed installs · "+i+" install views · "+y+"% of recent bookings.</div>":"")+(a?'<div style="font-size:11px;color:var(--text-muted);margin:-2px 0 10px;">Notification permission: '+(o.notification_granted||0)+" granted · "+(o.notification_denied||0)+" denied · "+(o.notification_dismissed||0)+" dismissed · "+(o.notification_failed||0)+" failed</div>":"")+(v?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+v:"")}catch{r.guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),e&&(e.style.display="none",e.innerHTML="")}}const je={appsCloseLightbox:W,appsCloseGuestInstallCoach:ce,appsCloudinaryFull:ne,appsCloudinaryImg:Y,appsLbNav:H,appsLbRender:U,appsOpenLightbox:Be,appsOpenGuestInstallCoach:Oe,appsPhoneImgStyle:R,appsQuestionRow:G,appsGuestInstallCoachSelectLayout:Fe,appsGuestInstallCoachSetVersion:He,appsTourClose:f,appsTourNav:_e,appsTourRender:T,appsVideoBadgeHtml:ge,detectAppPlatform:Pe,ensureAppsViewRendered:De,loadBookingReviewSettings:he,loadGuestInstallStats:Z,renderAppsView:ue,saveBookingReviewReminderSetting:Ne,startAppsTour:Ge};function We(){Te(je)}export{je as default,We as install};
