import{c as u,e as yt}from"./settings-DyH9YVsr.js";function A(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function rt(...t){return A("ensureAppsViewRendered")?.(...t)}function pt(...t){return A("showFinaleMockModal")?.(...t)}function lt(...t){return A("finishTourHydration")?.(...t)}function G(...t){return A("goLive")?.(...t)}function P(...t){return A("toast")?.(...t)}function bt(...t){return A("appsCloseLightbox")?.(...t)}let q=[],c=0,N=!1,E=null,C=null;function dt(){if(document.getElementById("frontdeskAppsTourStyle"))return;const t=document.createElement("style");t.id="frontdeskAppsTourStyle",t.textContent=`
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
  `,document.head.appendChild(t)}function T(t){return String(t??"").replace(/[&<>"']/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[o])}function ct(){E&&(document.removeEventListener("keydown",E),E=null)}function vt(t){ct(),E=o=>{if(o.defaultPrevented)return;const e=o.target&&o.target.tagName?o.target.tagName.toLowerCase():"";e==="input"||e==="textarea"||e==="select"||o.target?.isContentEditable||(o.key==="Escape"?(o.preventDefault(),t.onSkip?.()):o.key==="Enter"||o.key==="ArrowRight"?(o.preventDefault(),t.onNext?.()):o.key==="ArrowLeft"&&(o.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",E)}function wt(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(o=>o.removeAttribute("id"))}function kt(t,o){const e=t.querySelectorAll("input, textarea, select"),n=o.querySelectorAll("input, textarea, select");e.forEach((s,i)=>{const a=n[i];a&&(s.type==="checkbox"||s.type==="radio"?a.checked=s.checked:a.value=s.value)})}function ut(t,o){const e=getComputedStyle(t);for(const i of e)o.style.setProperty(i,e.getPropertyValue(i),e.getPropertyPriority(i));const n=t.children,s=o.children;for(let i=0;i<n.length;i+=1)s[i]&&ut(n[i],s[i])}function Tt(t){if(!t||!t.isConnected)return null;document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(n=>n.remove());const o=t.getBoundingClientRect();if(o.width<2||o.height<2)return null;const e=t.cloneNode(!0);return wt(e),ut(t,e),kt(t,e),t.dataset.appsTourOrigVisibility||(t.dataset.appsTourOrigVisibility=t.style.visibility||""),t.style.visibility="hidden",e.setAttribute("data-apps-tour-spotlight-clone","1"),e.setAttribute("aria-hidden","true"),e.style.position="fixed",e.style.left=`${o.left}px`,e.style.top=`${o.top}px`,e.style.width=`${o.width}px`,e.style.height=`${o.height}px`,e.style.margin="0",e.style.maxWidth="none",e.style.zIndex="100002",e.style.pointerEvents="none",e.style.transform="none",e.style.boxShadow="0 18px 46px rgba(26,43,34,0.24)",e.style.outline="1px solid rgba(255,255,255,0.82)",e.style.outlineOffset="2px",document.body.appendChild(e),e}function gt(){ct(),C&&(clearTimeout(C),C=null);const t=document.getElementById("appsTourLightbox");t&&t.remove();const o=document.getElementById("appsTourTooltip");o&&o.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(e=>e.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(e=>{e.style.position=e.dataset.appsTourOrigPosition||"",e.style.zIndex=e.dataset.appsTourOrigZIndex||"",e.style.isolation=e.dataset.appsTourOrigIsolation||"",e.style.boxShadow=e.dataset.appsTourOrigBoxShadow||"",e.style.outline=e.dataset.appsTourOrigOutline||"",e.style.outlineOffset=e.dataset.appsTourOrigOutlineOffset||"",e.style.transition=e.dataset.appsTourOrigTransition||"",e.style.visibility=e.dataset.appsTourOrigVisibility||"",e.removeAttribute("data-apps-tour-highlighted"),delete e.dataset.appsTourOrigPosition,delete e.dataset.appsTourOrigZIndex,delete e.dataset.appsTourOrigIsolation,delete e.dataset.appsTourOrigBoxShadow,delete e.dataset.appsTourOrigOutline,delete e.dataset.appsTourOrigOutlineOffset,delete e.dataset.appsTourOrigTransition,delete e.dataset.appsTourOrigVisibility})}function y(t){gt(),document.body.style.overflow="";const o=N;N=!1;try{const e=typeof rt=="function"?rt:window.ensureAppsViewRendered;typeof e=="function"&&e(!0)}catch{}if(t&&(localStorage.setItem("appsTourDone","1"),o||localStorage.getItem("settingsTourStep")==="handoff"||u.settingsTourActive)){const n=typeof pt=="function"?pt:window.showFinaleMockModal;if(typeof n=="function"){n();return}}}function zt(t){const o=c+t;o<0||o>=q.length||(c=o,z())}function tt(){if(localStorage.setItem("appsTourDone","1"),N||localStorage.getItem("settingsTourStep")==="handoff"||u.settingsTourActive){u.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const o=typeof lt=="function"?lt:window.finishTourHydration;typeof o=="function"&&o()}}function It(){tt();const t=typeof G=="function"?G:window.goLive;if(y(!1),typeof t=="function"){t();return}const o=typeof P=="function"?P:window.toast;typeof o=="function"&&o("Open Go live to activate your booking page.","error")}function At(){if(u.hotelSubscribed||document.getElementById("guestAppActivationOverlay"))return;dt();const t=document.createElement("div");if(t.id="guestAppActivationOverlay",t.style.cssText="position:fixed;inset:0;z-index:100004;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;",t.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:390px;width:100%;max-height:calc(100vh - 48px);overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:appsTourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Ready</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Guest App + Front Desk is ready.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.58;margin:0 0 18px;">You just walked through the loop: guests book direct, save your hotel to their phone, and message you. Front Desk receives the alerts.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:15px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Direct booking page accepts reservations</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Guests save your hotel from the booking page</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">Front Desk receives booking and message alerts</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="width:21px;height:21px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">✓</span><span style="font-size:13px;color:#1A2B22;line-height:1.45;">No OTA commission. Cancel anytime.</span></div>
          </div>
        </div>
        <button type="button" id="guestAppActivateNowBtn" style="width:100%;padding:15px 18px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">Activate - $199/mo</button>
        <button type="button" id="guestAppActivateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep inactive for now</button>
      </div>
    </div>`,document.body.appendChild(t),document.body.style.overflow="hidden",!document.getElementById("tourModalAnimStyle")){const e=document.createElement("style");e.id="tourModalAnimStyle",e.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(e)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{t.remove(),document.body.style.overflow=""};document.getElementById("guestAppActivateNowBtn").onclick=()=>{o();const e=typeof G=="function"?G:window.goLive;if(typeof e=="function"){e();return}const n=typeof P=="function"?P:window.toast;typeof n=="function"&&n("Open Go live to activate your booking page.","error")},document.getElementById("guestAppActivateLaterBtn").onclick=o}function z(){dt();const t=q[c];if(!t){y(!0);return}const o=q.length,e=c>=o-1,n=`${c+1} / ${o}`,s=Math.max(8,Math.min(100,Math.round((c+1)/o*100))),i=document.querySelector(t.target);if(!i){c++,z();return}gt();let a=document.createElement("div");a.id="appsTourLightbox",a.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.22);pointer-events:auto;",document.body.appendChild(a),i.dataset.appsTourOrigPosition=i.style.position||"",i.dataset.appsTourOrigZIndex=i.style.zIndex||"",i.dataset.appsTourOrigIsolation=i.style.isolation||"",i.dataset.appsTourOrigBoxShadow=i.style.boxShadow||"",i.dataset.appsTourOrigOutline=i.style.outline||"",i.dataset.appsTourOrigOutlineOffset=i.style.outlineOffset||"",i.dataset.appsTourOrigTransition=i.style.transition||"",i.style.position=i.style.position||"relative",i.style.zIndex="100002",i.style.isolation="isolate",i.style.transition="box-shadow 0.18s ease, outline 0.18s ease",i.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",i.style.outline="1px solid rgba(255,255,255,0.82)",i.style.outlineOffset="2px",i.setAttribute("data-apps-tour-highlighted","1");const l=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,x=r&&t.mobileScrollBlock||t.scrollBlock||"center",g=l?"auto":"smooth";if(r&&t.mobileScrollToBottom){const d=Math.max(document.documentElement?document.documentElement.scrollHeight:0,document.body?document.body.scrollHeight:0);window.scrollTo({top:d,behavior:g}),setTimeout(()=>{window.scrollTo({top:d,behavior:"auto"})},g==="smooth"?520:0)}else i.scrollIntoView({behavior:g,block:x});const D=()=>{const d=document.getElementById("appsTourTooltip");d&&d.remove(),Tt(i);const b=i.getBoundingClientRect(),$=Math.min(r?window.innerWidth-24:370,window.innerWidth-28),V=b.left+b.width/2,v=Math.max(14,Math.min(V-$/2,window.innerWidth-$-14)),W=r&&t.mobileTooltipAnchor||t.tooltipAnchor||"bottom",w=r&&t.mobileTooltipPosition||t.tooltipPosition||"",B=b.top,H=W==="top"?b.top:b.bottom,U=t.primaryLabel||(e?"Done":"Next"),st=t.secondaryLabel||(e?"Not now":"Skip tour"),Q=c<=0,K=t.kicker||"Guest App",p=document.createElement("div");if(p.id="appsTourTooltip",p.style.cssText=`position:fixed;z-index:100003;left:${v}px;top:14px;width:${$}px;max-width:${$}px;visibility:hidden;`,p.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${T(t.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${n}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${s}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${T(K)}</div>
        <div class="apps-tour-title">${T(t.title)}</div>
        <p class="apps-tour-copy">${T(t.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${Q?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${T(st)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${T(U)}</button>
        </div>
      </div>`,document.body.appendChild(p),r&&!w)p.style.left="12px",p.style.right="12px",p.style.width="auto",p.style.maxWidth="none",p.style.top="auto",p.style.bottom="calc(14px + env(safe-area-inset-bottom,0px))";else{const h=Math.min(p.offsetHeight||190,Math.max(130,window.innerHeight-28)),k=window.innerHeight-H,S=B;let m=w==="below"||!w&&k>=h+14+14;w==="above"&&(m=!1),m&&k<h+14+14&&S>k&&(m=!1),!m&&S<h+14+14&&k>S&&(m=!0);const Z=m?H+14:B-h-14,J=Math.max(14,window.innerHeight-h-14),M=Math.max(14,Math.min(Z,J));p.style.top=`${M}px`}p.style.visibility="visible";const X=()=>{if(t.activateOnNext){It();return}if(e){tt(),y(!1),t.showActivationOnComplete&&At();return}c++,z()},O=()=>{if(e){tt(),y(!1);return}y(!0)},L=()=>{c<=0||(c--,z())};document.getElementById("appsTourNextBtn").onclick=X,document.getElementById("appsTourSkipBtn").onclick=O;const F=document.getElementById("appsTourBackBtn");F&&(F.onclick=L),vt({onNext:X,onBack:L,onSkip:O})},Y=r&&t.mobileScrollToBottom?l?80:680:l?40:320;C=setTimeout(D,Y)}function $t(t){const o=t&&t.replay,e=t&&t.chainFromSettingsTour;if(!o&&!e&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;bt(),y(!1),N=!!e;const n=!!u.hotelSubscribed;q=[{target:"#tour-apps-intro",kicker:"The loop",title:"Your hotel becomes the app.",text:"Guests book from your direct page, save your hotel to their phone, then come back with one tap to book or message you."},{target:"#tour-apps-first",kicker:"Front Desk",title:"Install this on the property phone.",text:"Front Desk is this dashboard saved like an app. It is where booking alerts, guest messages, QR tools, and setup controls live."},{target:"#tour-apps-then",kicker:"Guest path",title:"Send guests to your direct page.",text:"The Install button sits on the booking page. Guests tap it once, and your hotel icon lands on their home screen."},{target:"#tour-apps-after",kicker:"Return visits",title:"Now the loop is easy to remember.",text:"Guests tap your icon to book direct or message you. New bookings and messages come back to Front Desk."},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the icon feel like your hotel.",text:"Use a real logo or clear property image. Guests see this square every time they save your hotel to their phone.",mobileScrollToBottom:!0,mobileScrollBlock:"end",mobileTooltipAnchor:"top",mobileTooltipPosition:"above"},{target:"#tour-apps-loop",kicker:n?"Live loop":"Activation",title:n?"This loop is on.":"Turn this on for your property.",text:n?"Guests can book direct, save your hotel, and message you. Front Desk gets the alerts.":"Activation turns on direct booking, guest installs, messages, and Front Desk alerts as one simple loop.",primaryLabel:n?"Done":"Continue to activation",secondaryLabel:n?"Close":"Not now",showActivationOnComplete:!n}],c=0,z()}const f={homeScreen:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179630/unnamed_lbsctp.jpg",guestHome:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2475_1_jxip3r.png",guestBook:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179611/IMG_2476_1_tqbmgz.png",guestMessagesImg:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179605/IMG_2477_1_zgodnn.png",frontdeskMessages:"https://res.cloudinary.com/dkmr3h5jb/image/upload/v1781179656/unnamed_2_qfhkrr.png",guestMessageNotifVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-10-2026_23-43-50_1_z22p4m.mp4",guestInstallVideo:"https://res.cloudinary.com/dkmr3h5jb/video/upload/f_mp4,q_auto/ScreenRecording_06-11-2026_00-03-19_1_lgdf59.mp4"},Bt="32px";function ot(t,o){return t.replace("/image/upload/","/image/upload/f_auto,q_auto,w_"+(o||400)+"/")}function et(t){return`border-radius:${Bt};box-shadow:0 10px 36px rgba(0,0,0,0.22);${t||""}`}function ft(t){const o=Math.min(window.devicePixelRatio||1,2),e=Math.round(Math.min(window.screen.width*o,1600));return t.replace("/image/upload/",`/image/upload/f_auto,q_auto:best,w_${e}/`)}let R=[],I=0;function St(t,o){y(!1),R=t,I=o||0;let e=document.getElementById("appsLightbox");if(!e){e=document.createElement("div"),e.id="appsLightbox",e.style.cssText=["position:fixed;inset:0;z-index:102000;background:#000;","display:flex;flex-direction:column;align-items:center;justify-content:flex-start;","overscroll-behavior:contain;touch-action:pan-y;","padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);"].join(""),document.body.appendChild(e),document.body.style.overflow="hidden",e._keyHandler=s=>{s.key==="ArrowRight"||s.key==="ArrowDown"?j(1):s.key==="ArrowLeft"||s.key==="ArrowUp"?j(-1):s.key==="Escape"&&xt()},document.addEventListener("keydown",e._keyHandler);let n=0;e.addEventListener("touchstart",s=>{n=s.changedTouches[0].clientX},{passive:!0}),e.addEventListener("touchend",s=>{const i=s.changedTouches[0].clientX-n;Math.abs(i)>50&&j(i<0?1:-1)},{passive:!0})}document.body.style.overflow="hidden",it()}function xt(){const t=document.getElementById("appsLightbox");t&&(document.removeEventListener("keydown",t._keyHandler),t.remove(),document.body.style.overflow="")}function j(t){const o=R.length;o<=1||(I=(I+t+o)%o,it())}function it(){const t=document.getElementById("appsLightbox");if(!t)return;const o=R[I],e=R.length,n=o.type!=="video",s=e>1?`${I+1} / ${e}`:"",i=n?`<img src="${ft(o.src)}" alt="${o.alt||""}"
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;object-fit:contain;${et()}"
          loading="eager" decoding="async">`:`<video autoplay loop muted playsinline webkit-playsinline
          style="max-width:100%;max-height:calc(100dvh - 160px);width:auto;height:auto;display:block;${et()}"
          ${o.poster?`poster="${ot(o.poster,400)}"`:""}>
          <source src="${o.src}" type="video/mp4">
       </video>`,a=e>1?'<button onclick="appsLbNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">‹</button>':"",l=e>1?'<button onclick="appsLbNav(1)"  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">›</button>':"",r=e>1?`<div style="display:flex;gap:7px;justify-content:center;margin-top:12px;">
    ${Array.from({length:e},(x,g)=>`<div onclick="appsOpenLightbox(_appsLbItems,${g})" style="width:7px;height:7px;border-radius:50%;background:${g===I?"#fff":"rgba(255,255,255,0.35)"};cursor:pointer;transition:background 0.2s;"></div>`).join("")}
  </div>`:"";t.innerHTML=`
    <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 12px;z-index:2;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;">${s}</div>
      <button onclick="appsCloseLightbox()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">✕</button>
    </div>
    <div style="position:relative;width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:52px 16px 8px;box-sizing:border-box;">
      ${i}
      ${a}${l}
    </div>
    <div style="flex-shrink:0;padding:8px 20px max(20px,env(safe-area-inset-bottom));text-align:center;width:100%;max-width:420px;margin:0 auto;box-sizing:border-box;">
      ${o.title?`<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.35;">${o.title}</div>`:""}
      ${o.caption?`<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;margin-bottom:10px;">${o.caption}</div>`:""}
      ${r}
    </div>`}function ht(t,o){const e=t||"Video";return`<span class="${"apps-media-badge"+(o==="light"?" apps-media-badge--light":"")}" title="Short video walkthrough"><span class="apps-media-badge__ring" aria-hidden="true"><span class="apps-media-badge__play" aria-hidden="true"></span></span><span class="apps-media-badge__label">${e}</span></span>`}function _(t,o,e,n,s){const i=s?ht("Video"):"",a=s?'<span class="apps-q-media" aria-hidden="true"><span class="apps-q-media__play"></span></span>':'<span class="apps-q-chevron" aria-hidden="true">›</span>';return`<button type="button" class="apps-q${s?" apps-q--video":""}" onclick="appsOpenLightbox(${e},${n})">
    <div class="apps-q-text">
      <div class="apps-q-title">${t}${i}</div>
      ${o?`<div class="apps-q-hint">${o}</div>`:s?'<div class="apps-q-hint">Tap to watch — about 1 min</div>':""}
    </div>
    ${a}
  </button>`}function _t(){const t=navigator.userAgent||"";return/iPad|iPhone|iPod/.test(t)&&!window.MSStream?"ios":/android/i.test(t)?"android":"ios"}function Et(t){const o=document.getElementById("appsView");if(!o)return;const e=(u.activeHotelId||"")+"|"+(u.activeHotelAppIcon||"")+"|"+(u.activeHotelDomain||"");t||o.dataset.appsKey!==e||!o.querySelector(".apps-page")?(mt(),o.dataset.appsKey=e):nt()}function mt(){const t=document.getElementById("appsView");if(!t)return;const o=u.activeHotelName||"Your Hotel",e=u.activeHotelAppIcon||"",n=o.trim().charAt(0).toUpperCase()||"🏨",s=u.activeHotelDomain||"",i=s?"https://"+s:"#",a=s?"https://"+s+"/install":"#";function l(M){return JSON.stringify(M).replace(/"/g,"&quot;")}const r=ot(f.guestHome,520),x=[{type:"image",src:f.homeScreen,alt:"Two phone apps",title:"Your app and theirs — same home screen",caption:`You get <strong>Front Desk</strong> — check bookings and reply to guests. Your guests get <strong>${o}</strong> — they tap it to book you or text you. No app store.`}],g=[{type:"image",src:f.guestHome,alt:"Guest home screen",title:"What your guests see — Home",caption:"Their stay info — check-in time, your WiFi password, and more."},{type:"image",src:f.guestBook,alt:"Guest book screen",title:"What your guests see — Book a room",caption:"They book directly with you. You keep the money — no middleman."},{type:"image",src:f.guestMessagesImg,alt:"Guest messages",title:"What your guests see — Message you",caption:`They text you from the app — like "What's the WiFi password?"`}],D=[{type:"video",src:f.guestInstallVideo,poster:f.guestHome,alt:"Guest adds hotel to phone",title:"How your guests put your hotel on their phone",caption:"They open your booking website and tap <strong>Add to Home Screen</strong>. Your hotel shows up on their phone like an app. You don't need to do anything."}],Y=[{type:"image",src:f.guestMessagesImg,alt:"Guest sends message",title:"Your guest texts you",caption:'Like "How do I connect to WiFi?" — they type it in your hotel app.'},{type:"image",src:f.frontdeskMessages,alt:"You reply",title:"You text them back",caption:"Open <strong>Bookings</strong>, type your reply. Takes 5 seconds."},{type:"video",src:f.guestMessageNotifVideo,poster:f.guestMessagesImg,alt:"Guest gets reply alert",title:"Their phone buzzes with your answer",caption:"They get your reply on their phone — like a text from you."}],d=isStandaloneApp()||u.frontdeskInstalled,b=typeof Notification<"u"&&Notification.permission==="granted",V=!!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)?"Install on this phone":"Install Front Desk";let v;d&&b?v=`<div id="tour-fd-installed-badge" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
      <div><div style="font-size:13px;font-weight:700;color:#166534;">Installed on this device</div><div style="font-size:12px;color:#166534;margin-top:2px;line-height:1.45;">You'll get booking alerts when supported — even if this is closed.</div></div>
    </div>`:d?v=`<div id="tour-fd-installed-badge"><p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;line-height:1.55;">It's installed on this device. Turn on alerts so you know when a guest books.</p>
      <button onclick="toggleAppNotifications()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Turn on booking alerts</button></div>`:v=`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Install Front Desk on the property phone first. That unlocks guest app setup, install links, QR tools, guest messages, and booking alerts.</p>
      <button type="button" disabled style="width:100%;padding:15px;border-radius:12px;border:none;background:#cbd5d1;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:not-allowed;margin-bottom:10px;">Install Front Desk</button>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.45;text-align:center;">Locked until Front Desk is installed on a property phone</div>`;const W=d?`<div class="apps-story-status">
        <span class="apps-story-status-icon">✓</span>
        <span>Front Desk is installed here. This phone can receive booking and message alerts.</span>
      </div>`:`<button type="button" class="apps-story-primary" onclick="handleInstallFrontdesk()">${V}</button>`,w=a!=="#"?'<button type="button" class="apps-story-secondary" onclick="openGuestBookingEngine({focusInstall:true})">Go to direct booking page</button>':'<div class="apps-story-domain-note">Your direct booking domain is still setting up. Once it is ready, guests install from that page.</div>',B="width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.1);box-sizing:border-box;",H=e?B+"background:#fff;border:1px solid var(--border);padding:0;":B,U=e?`<img src="${e}" alt="Hotel logo" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">${n}</span>`,Q=`
    <div class="apps-icon-card">
      <div id="appsAppIconPreview" style="${H}">
        ${U}
      </div>
      <div style="flex:1;min-width:0;">
        <input type="file" id="appsAppIconInput" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="uploadAppIcon(this)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.45;">Guests see this when they save <strong>${o}</strong> to their phone.</div>
        <button type="button" id="tour-guest-icon-btn" onclick="${d?"document.getElementById('appsAppIconInput').click()":"toast('Please install Front Desk first. Then you can change your guest app icon.', 'error')"}" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e?"Change picture":"Upload picture"}</button>
        ${d?"":'<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4;">Install Front Desk first to upload this picture.</div>'}
      </div>
    </div>`,K=`
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR</button>
      ${a!=="#"?`
      <button type="button" onclick="openGuestBookingEngine({focusInstall:true})" style="width:100%;padding:14px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Go to direct booking page</button>
      <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">Guests use this page to save your hotel to their phone. Scroll to the Install button.</p>`:""}
      ${a==="#"?'<p style="font-size:12px;color:var(--text-muted);margin:12px 0 0;">Your booking domain is still setting up.</p>':""}`,p=a!=="#"?`
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div class="apps-step-title" style="font-size:13px;margin-bottom:8px;">Guest install link</div>
        <input type="text" value="${a.replace("https://","")}" readonly id="guest-install-url" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:9.5px;color:var(--text);background:var(--bg);box-sizing:border-box;margin-bottom:8px;">
        <button type="button" onclick="navigator.clipboard.writeText('https://' + document.getElementById('guest-install-url').value).then(()=>toast('Link copied!','success'))" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy install link</button>
        <div id="guestInstallStats" style="display:none;margin-top:12px;"></div>
      </div>`:'<div id="guestInstallStats" style="display:none;"></div>',O=`
    <div class="apps-loop" id="tour-apps-loop">
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--fd"><img src="/marketellogo.svg" alt="" style="width:62%;height:62%;object-fit:contain;"></div>
        <div class="apps-loop-name">Front Desk</div>
        <div class="apps-loop-sub">buzzes when they book</div>
      </div>
      <div class="apps-loop-arrow" aria-hidden="true">⇄</div>
      <div class="apps-loop-side">
        <div class="apps-loop-tile apps-loop-tile--guest">${e?`<img src="${e}" alt="" style="width:100%;height:100%;object-fit:contain;">`:`<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--green);color:#fff;border-radius:12px;font-size:22px;font-weight:800;">${n}</span>`}</div>
        <div class="apps-loop-name">${o}</div>
        <div class="apps-loop-sub">book &amp; message, 1 tap</div>
      </div>
    </div>`,L=`
    <section class="apps-story">
      <div id="tour-apps-intro">
        <div class="apps-story-kicker">Guest App</div>
        <h2 class="apps-story-title" id="tour-apps-headline">Your hotel can be on your guest's home screen.</h2>
        <p class="apps-story-copy" id="tour-apps-copy">Guests do not need the App Store. They go to your direct booking page, scroll down, tap <strong>Install</strong>, and your hotel appears on their phone like an app.</p>
      </div>

      <div class="apps-story-line" id="tour-apps-first">
        <div class="apps-story-step">First</div>
        <h3 class="apps-story-line-title">Install Front Desk on your property phone.</h3>
        <p>Front Desk is this website saved to your phone. It turns on booking alerts, guest messages, QR tools, and the guest Install button.</p>
        <div class="apps-story-actions">${W}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-then">
        <div class="apps-story-step">Then</div>
        <h3 class="apps-story-line-title">Send guests to your direct booking page.</h3>
        <p>When guests are booking, the Install button stays at the bottom of the page. They tap it, and your hotel is on their home screen.</p>
        <div class="apps-story-actions">${w}</div>
      </div>

      <div class="apps-story-line" id="tour-apps-after">
        <div class="apps-story-step">After that</div>
        <h3 class="apps-story-line-title">Everything connects.</h3>
        <p>Guests tap your hotel icon to book direct or message you. New bookings and messages come back here in Front Desk.</p>
      </div>
    </section>`,F=`
        <div class="apps-section-divider" style="margin-top:0;padding-top:14px;">How guests add your hotel</div>
        <div style="border-radius:12px;background:#f4f7f9;border:1px solid var(--border);margin:0 0 12px;padding:16px;text-align:center;">
          <img src="${r}" alt="Guest saves hotel to phone" loading="eager" decoding="sync" style="max-width:140px;width:55%;height:auto;min-height:120px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        </div>
        <button type="button" class="apps-video-teaser" onclick="appsOpenLightbox(${l(D)},0)" style="margin-bottom:12px;"><span class="apps-video-teaser__play" aria-hidden="true"></span><span>Watch how guests install (1 min)</span></button>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;line-height:1.55;">Guests tap <strong>Add to Home Screen</strong> on your booking page or scan your QR. Then they can book and message you direct.</p>
        <div class="apps-q-list">
          ${_("What guests see on their phone","",l(g),0,!1)}
          ${_("How guests add your hotel","",l(D),0,!0)}
          ${_("Guest texts you, you text back","",l(Y),0,!0)}
          ${_("Your app and theirs — side by side","",l(x),0,!1)}
        </div>
        ${i!=="#"?`<button onclick="window.open('${i}','_blank')" style="width:100%;padding:13px;border-radius:12px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;">Preview guest website ↗</button>`:""}`,at=M=>`
    <div class="apps-step-card" id="tour-fd-install-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Your device</div>
      <div class="apps-step-title">${d?"Front Desk — installed":"Install Front Desk"}</div>
      ${v}
    </div>`,h=()=>`
    <div class="apps-step-card" id="tour-guest-icon-section">
      <div class="apps-step-title" style="margin-bottom:14px;">Your guest app icon</div>
      ${Q}
    </div>`,k=`
    <div class="apps-step-card">
      <div class="apps-section-divider" style="margin-top:0;padding-top:0;border-top:none;">Guest phones</div>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;line-height:1.55;">Guests can save <strong>${o}</strong> to their phone — one tap, no app store. Then they can book and message you direct.</p>
      ${K}
      ${p}
    </div>`,S=`
    <details class="apps-fold" id="appsHelpFold" style="margin-top:8px;">
      <summary class="apps-fold-summary">
        <div><div class="apps-fold-title">Help</div><div class="apps-fold-meta">Videos · screenshots · FAQs</div></div>
        <span class="apps-fold-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="apps-fold-body">
        ${F}
      </div>
    </details>`,m=`
    ${at()}
    ${h()}
    ${k}
    ${guestBroadcastCardHtml()}
    ${S}`,Z=`
    ${L}
    ${O}
    ${d?m:h()}`,J=d?"Front Desk is installed. Guests can install your hotel from the direct booking page.":"Install Front Desk first. Then guests can install your hotel from the direct booking page.";t.innerHTML=`
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
    ${Z}

    <p class="apps-footnote">${J}</p>

  </div>`,typeof lucide<"u"&&lucide.createIcons(),nt()}async function nt(){const t=document.getElementById("guestInstallStats");try{const o=await api("GET","/api/crm/guest-install-stats");if(!o.success)throw new Error(o.message||"Failed");if(guestPushSubscriberCount=o.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!t)return;const e=o.totals||{},n=o.installedBookings||0,s=e.views||0;if(!n&&!s){t.style.display="none",t.innerHTML="";return}t.style.display="block";const i=o.installRatePercent!=null?o.installRatePercent:0,a=Object.entries(o.byTouchpoint||{}).filter(function(r){return r[1].views||r[1].installed}).sort(function(r,x){return(x[1].installed||0)-(r[1].installed||0)}).slice(0,5),l=a.length?a.map(function(r){const x=r[0].replace(/-/g," "),g=r[1];return'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text);font-weight:600;text-transform:capitalize;">'+x+'</span><span style="color:var(--text-muted);white-space:nowrap;">'+(g.views||0)+" views · "+(g.installed||0)+" installed</span></div>"}).join(""):"";t.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guest installs — last 30 days</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+i+'%</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">of bookings installed</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+n+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">confirmed installs</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+s+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">install page views</div></div></div>'+(l?'<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">By touchpoint</div>'+l:"")}catch{guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),t&&(t.style.display="none",t.innerHTML="")}}const Dt={appsCloseLightbox:xt,appsCloudinaryFull:ft,appsCloudinaryImg:ot,appsLbNav:j,appsLbRender:it,appsOpenLightbox:St,appsPhoneImgStyle:et,appsQuestionRow:_,appsTourClose:y,appsTourNav:zt,appsTourRender:z,appsVideoBadgeHtml:ht,detectAppPlatform:_t,ensureAppsViewRendered:Et,loadGuestInstallStats:nt,renderAppsView:mt,startAppsTour:$t};function Ot(){yt(Dt)}export{Dt as default,Ot as install};
