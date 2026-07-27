const c={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,frontdeskInstallReported:!1,bookingApproval:null,bookingConflicts:[],_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let V=null;function Le(){return typeof lucide<"u"?Promise.resolve():V||(V=new Promise((t,e)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>t(),o.onerror=()=>e(new Error("lucide load failed")),document.head.appendChild(o)}),V)}async function qt(t){if(!t||!t.type.startsWith("image/")||t.type==="image/webp"&&t.size<4e5)return t;try{const e=await createImageBitmap(t),o=1600,i=1200;let a=e.width,n=e.height;const r=Math.min(1,o/a,i/n);a=Math.round(a*r),n=Math.round(n*r);const d=document.createElement("canvas");d.width=a,d.height=n,d.getContext("2d").drawImage(e,0,0,a,n),e.close();const p=await new Promise((h,k)=>{d.toBlob(B=>B?h(B):k(new Error("encode failed")),"image/webp",.82)}),f=(t.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([p],f+".webp",{type:"image/webp"})}catch{return t}}function He(){const t=()=>{c.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(t,{timeout:2500}):setTimeout(t,600)}const jt=["cancelled","canceled","released"];function Ne(t){return t?jt.includes(String(t.status||"").trim().toLowerCase()):!0}function qe(t){return String(t?.status||"").trim().toLowerCase()==="pending"}function Ut(t){Object.assign(window,t)}function D(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function Z(...t){return D("setFilter")?.(...t)}function Gt(...t){return D("toast")?.(...t)}function X(...t){return D("updateGoLiveBanner")?.(...t)}function Yt(...t){return D("seedTourRevenueShell")?.(...t)}function Wt(...t){return D("finishTourHydration")?.(...t)}function Vt(...t){return D("goLive")?.(...t)}let j=null;function F(){if(document.getElementById("frontdeskTourPolishStyle"))return;const t=document.createElement("style");t.id="frontdeskTourPolishStyle",t.textContent=`
    #tourBlurOverlay {
      -webkit-backdrop-filter: blur(1.25px);
      backdrop-filter: blur(1.25px);
      animation: tourOverlayFade 0.18s ease-out;
      transition: background 0.25s ease;
    }
    #tourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .tour-panel {
      pointer-events: auto;
      width: 100%;
      max-width: 560px;
      max-height: calc(100dvh - 28px);
      overflow-y: auto;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.24);
      padding: 14px;
      animation: tourPanelIn 0.2s ease-out;
    }
    .tour-progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tour-progress-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7D72;
      white-space: nowrap;
    }
    .tour-progress-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .tour-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      color: #1A2B22;
      letter-spacing: 0;
    }
    .tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.48;
      margin: 0 0 13px;
    }
    .tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .tour-btn-primary {
      margin-left: auto;
      padding: 10px 18px;
      border-color: #2E7D5B;
      background: #2E7D5B;
      color: #fff;
      font-size: 14px;
      font-weight: 850;
      box-shadow: 0 8px 20px rgba(46,125,91,0.22);
    }
    @media (min-width: 768px) {
      #tourTooltip.tour-tooltip-floating {
        left: var(--tour-left);
        top: var(--tour-top);
        width: var(--tour-width);
        right: auto;
        bottom: auto;
        justify-content: flex-start;
      }
      #tourTooltip.tour-tooltip-floating .tour-panel {
        max-width: none;
      }
    }
    @media (max-width: 420px) {
      .tour-actions {
        flex-wrap: wrap;
      }
      .tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @keyframes tourPanelOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.98); }
    }
    @keyframes tourPageIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes tourOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes tourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #tourBlurOverlay,
      .tour-panel {
        animation: none !important;
      }
      #tourBlurOverlay {
        transition: none !important;
      }
      .tour-progress-fill {
        transition: none !important;
      }
    }
  `,document.head.appendChild(t)}function lt(){j&&(document.removeEventListener("keydown",j),j=null)}function _t(t){lt(),j=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",j)}function nt(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function P(t){F();const e=t||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText="position:fixed;inset:0;z-index:99998;",document.body.appendChild(o)),o.style.background=e.dim||"rgba(17,24,39,0.22)",o.style.pointerEvents=e.blockPointer?"auto":"none",e.lockScroll&&(document.body.style.overflow="hidden"),o}const K="rgba(17,24,39,0.42)";function H(){const t=document.getElementById("tourTooltip"),e=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!t||e)return Promise.resolve();t.style.pointerEvents="none";const o=t.firstElementChild;return o&&(o.style.animation="tourPanelOut 0.16s ease-in forwards"),new Promise(i=>setTimeout(i,150))}function Kt(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"))}function Qt(t,e){const o=t.querySelectorAll("input, textarea, select"),i=e.querySelectorAll("input, textarea, select");o.forEach((a,n)=>{const r=i[n];r&&(a.type==="checkbox"||a.type==="radio"?r.checked=a.checked:r.value=a.value)})}function Et(t,e){const o=getComputedStyle(t);for(const n of o)e.style.setProperty(n,o.getPropertyValue(n),o.getPropertyPriority(n));const i=t.children,a=e.children;for(let n=0;n<i.length;n+=1)a[n]&&Et(i[n],a[n])}function kt(t,e){if(!t||!t.isConnected)return null;document.querySelectorAll("[data-tour-spotlight-clone]").forEach(a=>a.remove());const o=t.getBoundingClientRect();if(o.width<2||o.height<2)return null;const i=t.cloneNode(!0);return Kt(i),Et(t,i),Qt(t,i),i.setAttribute("data-tour-spotlight-clone","1"),i.setAttribute("aria-hidden","true"),i.style.position="fixed",i.style.left=`${o.left}px`,i.style.top=`${o.top}px`,i.style.width=`${o.width}px`,i.style.height=`${o.height}px`,i.style.margin="0",i.style.maxWidth="none",i.style.zIndex="99999",i.style.pointerEvents="none",i.style.transform="none",i.style.boxShadow=e?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",i.style.outline=e?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",i.style.outlineOffset=e?.spotlightOutlineOffset??"2px",e?.spotlightBackground&&(i.style.background=e.spotlightBackground,i.style.backgroundColor=e.spotlightBackground),e?.spotlightBorderRadius&&(i.style.borderRadius=e.spotlightBorderRadius),document.body.appendChild(i),i}function O(t){const e=t||{};lt();const o=document.getElementById("tourTooltip");o&&o.remove();const i=document.getElementById("tourBlurOverlay");i&&!e.keepOverlay&&i.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(n=>n.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(n=>{n.style.position=n.dataset.tourOrigPosition||"",n.style.zIndex=n.dataset.tourOrigZIndex||"",n.style.isolation=n.dataset.tourOrigIsolation||"",n.style.boxShadow=n.dataset.tourOrigBoxShadow||"",n.style.outline=n.dataset.tourOrigOutline||"",n.style.outlineOffset=n.dataset.tourOrigOutlineOffset||"",n.style.transition=n.dataset.tourOrigTransition||"",n.style.borderRadius=n.dataset.tourOrigBorderRadius||"",n.style.opacity=n.dataset.tourOrigOpacity||"";const r=n.dataset.tourOrigBackground||"",d=n.dataset.tourOrigBackgroundColor||"";d?n.style.backgroundColor=d:n.style.removeProperty("background-color"),r?n.style.background=r:n.style.removeProperty("background"),n.removeAttribute("data-tour-highlighted"),delete n.dataset.tourOrigPosition,delete n.dataset.tourOrigZIndex,delete n.dataset.tourOrigIsolation,delete n.dataset.tourOrigBoxShadow,delete n.dataset.tourOrigOutline,delete n.dataset.tourOrigOutlineOffset,delete n.dataset.tourOrigTransition,delete n.dataset.tourOrigBackground,delete n.dataset.tourOrigBackgroundColor,delete n.dataset.tourOrigBorderRadius,delete n.dataset.tourOrigOpacity});const a=document.getElementById("goLiveBanner");a&&a.dataset.tourHidden&&(delete a.dataset.tourHidden,typeof X=="function"&&X()),e.keepOverlay||(document.body.style.overflow="")}function Jt(){const t=document.getElementById("tourTooltip"),e=Array.from(document.querySelectorAll("[data-tour-spotlight-clone]")),o=Array.from(document.querySelectorAll("[data-tour-highlighted]")),i=[t,...e,...o].filter(Boolean);return!i.length&&!o.length?(O({keepOverlay:!0}),Promise.resolve()):(lt(),window.matchMedia("(prefers-reduced-motion: reduce)").matches?(O({keepOverlay:!0}),Promise.resolve()):(t&&(t.style.pointerEvents="none"),i.forEach(n=>{n.style.transition="opacity 0.07s ease, transform 0.07s ease",n.style.opacity="1"}),requestAnimationFrame(()=>{i.forEach(n=>{n.style.opacity="0",n.id==="tourTooltip"&&(n.style.transform="translateY(4px)")})}),new Promise(n=>{setTimeout(()=>{O({keepOverlay:!0}),n()},85)})))}function Zt(t){const e=[t,...document.querySelectorAll("[data-tour-spotlight-clone]"),...document.querySelectorAll("[data-tour-highlighted]")].filter(Boolean);e.forEach(o=>{o.style.transition="opacity 0.1s ease, transform 0.1s ease",o.style.opacity="0",o.id==="tourTooltip"&&(o.style.transform="translateY(4px)")}),requestAnimationFrame(()=>{e.forEach(o=>{o.style.opacity="1",o.id==="tourTooltip"&&(o.style.transform="translateY(0)")})})}function $(t,e){if(!e.openAccordion)return;const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const n=o.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}}function M(t){if(!t)return null;for(const e of String(t).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(e);if(o&&o.isConnected)return o}return null}function N(t,e){if(e.highlightSelector){const o=M(e.highlightSelector);if(o)return o}if(e.highlightCard){const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(o)return o}return e.targetParent&&(t.closest(".booking-card")||t.closest(".accordion-body"))||t}function Q(t,e){if(!e)return t;const o=String(e.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const a=document.querySelector(i);if(a&&a.isConnected)return a}if(e.accordionCard){const i=document.querySelector(e.accordionCard);if(i&&i.isConnected)return i}return t&&t.isConnected?t:null}function tt(t,e){if(!t||!t.isConnected)return null;const o=t.getBoundingClientRect();return o.width<2||o.height<2||!e&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function U(t,e){const o=M(t.anchorSelector);if(o){const i=tt(o,!0);if(i)return i}return tt(e,!0)}function Xt(t){let e=t&&t.parentElement;for(;e&&e!==document.body&&e!==document.documentElement;){const o=getComputedStyle(e),i=o.overflowY||o.overflow;if(/(auto|scroll)/.test(i)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement}return null}function rt(t,e){if(!e)return;const o=Xt(t);if(o){o.scrollTop+=e;return}window.scrollBy({top:e,left:0,behavior:"auto"})}function te(t,e){return e&&t.mobileTooltipPosition||t.tooltipPosition||"below"}function ee(t,e,o,i){if(!t||!t.isConnected||!o)return U(e,t);const a=o.querySelector(".tour-panel"),n=Math.min(a&&a.offsetHeight||o.offsetHeight||190,Math.max(140,window.innerHeight-28)),r=e.tooltipGap??8,d=e.fitPadTop??e.scrollPadTop??72,p=window.innerHeight-(e.fitPadBottom??14),f=()=>U(e,t)||tt(t,!0);let h=f();if(!h)return null;for(let k=0;k<3;k+=1){const B=Math.max(120,p-d),R=h.height+r+n<=B;let z=0;if(i==="above"){const A=h.top-r-n-d;A<0&&(z=A),R&&h.bottom>p&&(z=h.bottom-p)}else{const A=h.bottom+r+n-p;A>0&&(z=A),R&&h.top<d&&(z=h.top-d)}if(Math.abs(z)<1)break;if(rt(t,z),h=f(),!h)return null}return h}function et(t){const e=t||"auto";try{window.scrollTo({top:0,left:0,behavior:e})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const a=document.querySelector(i);a&&(a.scrollTop=0)})}function Bt(t,e,o){const i=o||{},a=e.scrollTarget||e.accordionCard,n=(a?M(a):null)||t;if(!n&&!e.scrollToTop)return Promise.resolve();const r=e.scrollBlock||"center",d=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let p=i.smooth&&!d?"smooth":c.settingsTourActive||d?"auto":"smooth";return new Promise(f=>{(()=>{if(!i.smooth||!n||e.forceSmoothScroll)return!1;const l=M(e.anchorSelector)||(n&&n.isConnected?n:null)||(t&&t.isConnected?t:null);if(!l)return!0;const g=l.getBoundingClientRect(),y=e.scrollPadTop??80,s=e.scrollPadBottom??220,x=Math.max(0,y-g.top),m=Math.max(0,g.bottom-(window.innerHeight-s));return Math.max(x,m)<=(e.quickScrollThreshold??180)})()&&(p="auto");const k=()=>{const l=e.scrollPadTop??80,g=e.scrollPadBottom??220,y=M(e.anchorSelector)||(n&&n.isConnected?n:null)||(t&&t.isConnected?t:null);if(!y){f();return}let s=y.getBoundingClientRect();s.top<l&&(rt(y,s.top-l),s=y.getBoundingClientRect()),s.bottom>window.innerHeight-g&&rt(y,s.bottom-window.innerHeight+g),requestAnimationFrame(()=>requestAnimationFrame(f))},B=()=>{n&&n.scrollIntoView({behavior:e.scrollToTop?"auto":p,block:r,inline:"nearest"}),k()};if(e.scrollToTop){if(et(p),e.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(()=>{e.forcePageTop&&et("auto"),f()}));return}if(p==="auto"){B();return}let l=!1;const g=()=>{l||(l=!0,window.removeEventListener("scrollend",y),clearTimeout(s),B())},y=()=>g();"onscrollend"in window&&window.addEventListener("scrollend",y,{once:!0});const s=setTimeout(g,520);return}if(!n){f();return}if(n.scrollIntoView({behavior:p,block:r,inline:"nearest"}),p==="auto"){k();return}let R=!1;const z=()=>{R||(R=!0,window.removeEventListener("scrollend",A),clearTimeout(u),k())},A=()=>z();"onscrollend"in window&&window.addEventListener("scrollend",A,{once:!0});const u=setTimeout(z,620)})}function St(){O(),localStorage.setItem("settingsTourStep","handoff");const t=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&Z("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const a=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof a=="function"&&a({chainFromSettingsTour:!0})},e=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof e=="function"?e().then(t).catch(t):t()}function q(){O({keepOverlay:!0}),F(),c.settingsTourActive=!1,X(),P({blockPointer:!0,lockScroll:!0,dim:K});const t=document.createElement("div");if(t.id="tourTooltip",t.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:24px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="copy-check" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Ready to share</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Your booking page is set up.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.55;margin:0 0 16px;">Copy the link, put it where guests already find you, and keep Front Desk open for new reservations.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:14px;">
          <div style="display:flex;flex-direction:column;gap:11px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">1</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Share the link</strong> on Google Business Profile, your website, texts, ads, and QR signs.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">2</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Watch bookings arrive</strong> in Front Desk with guest details and card verification status.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">3</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Confirm and collect</strong> payment at check-in using your normal process.</span>
            </div>
          </div>
        </div>
        <div style="background:#fff7ed;border-radius:12px;padding:11px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
          <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">Bookings start when guests see the link. Put it in front of real traffic before judging results.</p>
        </div>
        <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 8px 20px rgba(46,125,91,0.22);">Copy booking link</button>
      </div>
    </div>`,document.body.appendChild(t),!document.getElementById("tourModalAnimStyle")){const e=document.createElement("style");e.id="tourModalAnimStyle",e.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(e)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const o="https://"+(c.activeHotelDomain||c.activeHotelId+".mktel.co");navigator.clipboard.writeText(o).catch(()=>{}),H().then(()=>{O(),c.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),Gt("Booking link copied!","success"),Wt(),Tt()})}}function Tt(t){F();const e=document.createElement("div");e.id="testDriveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Activation</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Go live when you are ready.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.6;margin:0 0 18px;">Your link is copied. Activate when you want guests to submit real bookings through this page.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Booking page accepts reservations</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Card verification helps reduce no-shows</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Front Desk shows new bookings</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">No OTA commission</span></div>
          </div>
        </div>
        <button id="activateNowBtn" style="width:100%;padding:15px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">$199/mo - Go live now</button>
        <p style="font-size:11px;color:#6B7D72;margin:0 0 14px;text-align:center;">Cancel anytime. No contracts.</p>
        <button id="activateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep page inactive for now</button>
      </div>
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{o(),Vt()},document.getElementById("activateLaterBtn").onclick=()=>{o();const i=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');i&&Z("bookings",i)}}function at(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),q();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),c.settingsTourActive=!0,X(),Yt();const t=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');t&&Z("settings",t);function e(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!c.editRoomsLoadPromise)return;const g=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;g&&g()}e();const o=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the property name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",scrollPadTop:80,scrollPadBottom:360,tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8,spotlightBackground:"#fff",spotlightBorderRadius:"0 0 20px 20px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0",fitPadTop:108},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:80,scrollPadBottom:220},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,scrollBlock:"start",scrollPadTop:92,scrollPadBottom:220},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function a(u){O(u)}function n(){H().then(()=>{a({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),q()})}function r(u,l){return!(!u||!l||u.customModal||l.customModal||u.tab!==l.tab||!u.target||!l.target)}function d(u,l){if(u.customModal){f(u,l);return}requestAnimationFrame(()=>f(u,l))}function p(u){const l=u||{};if(l.keepCurrentUi||a({keepOverlay:!0}),document.body.style.overflow="",i>=o.length){a({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),q();return}const g=o[i];if(g.tab==="revenue"&&!c.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}if(g.tab==="apps"&&!(isStandaloneApp()||c.frontdeskInstalled)&&g.target&&!g.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}if(g.customModal||P(),g.tab&&g.tab!==c.currentFilter){const y=document.querySelector(`.tab[data-nav-filter="${g.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${g.tab}"]`);if(y&&Z(g.tab,y),g.tab==="apps"){const s=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof s=="function"&&s(!0)}d(g,l);return}d(g,l)}function f(u,l){const g=l||{};if(u.customModal==="homescreen"){g.keepCurrentUi&&a({keepOverlay:!0}),R();return}if(u.customModal===!0||u.customModal==="bookings"){g.keepCurrentUi&&a({keepOverlay:!0}),A();return}if(u.customModal==="availability"){g.keepCurrentUi&&a({keepOverlay:!0}),z();return}if(u.customModal==="finale"){g.keepCurrentUi&&a({keepOverlay:!0}),q();return}if(u.customModal==="guestAppsStory"){g.keepCurrentUi&&a({keepOverlay:!0}),St();return}if(u.waitForVisible){const x=u.target.split(",").map(w=>w.trim());let m=0;const v=30;P();const b=c.settingsTourActive?60:200,E=()=>{if(m++,u.tab==="apps"){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}let w=null;for(const T of x)if(w=document.querySelector(T),w)break;if(w&&(u.openAccordion&&$(w,u),u.openAccordion||w.offsetParent!==null)){h(w,u,g);return}m<v?setTimeout(E,b):(i++,localStorage.setItem("settingsTourStep",String(i)),p())};E();return}function y(x){const m=x.target.split(",").map(v=>v.trim());for(const v of m){const b=document.querySelector(v);if(b&&!(!x.openAccordion&&b.offsetParent===null&&getComputedStyle(b).position!=="fixed"))return b}if(x.accordionCard){const v=document.querySelector(x.accordionCard);if(v)return v}return null}function s(x,m){const v=y(x);if(v){m(v);return}const b=x.tab==="settings"&&!x.customModal&&x.target,E=x.tab==="apps"&&!x.customModal&&x.target;if(!b&&!E){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}P();let w=0;if(b&&e(),E){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}const T=c.settingsTourActive?60:250,S=()=>{if(w++,E){const C=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof C=="function"&&C(!0)}const I=y(x);if(I){m(I);return}if(e(),E){const C=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof C=="function"&&C(!0)}w<48?setTimeout(S,T):(i++,localStorage.setItem("settingsTourStep",String(i)),p())};S()}s(u,x=>h(x,u,g))}function h(u,l,g){const y=g||{};if($(u,l),u=N(u,l),(!u||!u.isConnected)&&(u=Q(u,l),u&&(u=N(u,l))),!u){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}const s=u;P(),Bt(s,l,{smooth:!!y.keepCurrentUi}).then(()=>{if(l.forcePageTop&&et("auto"),!s.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}$(s,l),y.keepCurrentUi&&(a({keepOverlay:!0}),P()),l.noHighlight||(s.dataset.tourOrigPosition||(s.dataset.tourOrigPosition=s.style.position||""),s.dataset.tourOrigZIndex||(s.dataset.tourOrigZIndex=s.style.zIndex||""),s.dataset.tourOrigIsolation||(s.dataset.tourOrigIsolation=s.style.isolation||""),s.dataset.tourOrigBoxShadow||(s.dataset.tourOrigBoxShadow=s.style.boxShadow||""),s.dataset.tourOrigOutline||(s.dataset.tourOrigOutline=s.style.outline||""),s.dataset.tourOrigOutlineOffset||(s.dataset.tourOrigOutlineOffset=s.style.outlineOffset||""),s.dataset.tourOrigTransition||(s.dataset.tourOrigTransition=s.style.transition||""),s.dataset.tourOrigBackground||(s.dataset.tourOrigBackground=s.style.background||""),s.dataset.tourOrigBackgroundColor||(s.dataset.tourOrigBackgroundColor=s.style.backgroundColor||""),s.dataset.tourOrigBorderRadius||(s.dataset.tourOrigBorderRadius=s.style.borderRadius||""),s.dataset.tourOrigOpacity||(s.dataset.tourOrigOpacity=s.style.opacity||""),s.style.position=s.style.position||"relative",s.style.zIndex="99999",s.style.isolation="isolate",s.style.transition="box-shadow 0.18s ease, outline 0.18s ease",s.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",s.style.outline="1px solid rgba(255,255,255,0.82)",s.style.outlineOffset="2px",l.spotlightBoxShadow!=null&&(s.style.boxShadow=l.spotlightBoxShadow),l.spotlightOutline!=null&&(s.style.outline=l.spotlightOutline),l.spotlightOutlineOffset!=null&&(s.style.outlineOffset=l.spotlightOutlineOffset),l.spotlightBackground&&(s.style.background=l.spotlightBackground,s.style.backgroundColor=l.spotlightBackground),l.spotlightBorderRadius&&(s.style.borderRadius=l.spotlightBorderRadius),y.keepCurrentUi&&(s.style.opacity="0"),s.setAttribute("data-tour-highlighted","1"),kt(s,l)),document.body.style.overflow="hidden";const x=()=>{const b=M(l.anchorSelector)||s;if(l.freezeTooltip){const S=b&&b.isConnected?b.getBoundingClientRect():null;k(b,l,S&&S.width>=2?S:null,{fadeIn:!!y.keepCurrentUi});return}const E=Q(s,l);let w=E?N(E,l):s;$(w,l);const T=l.tooltipAnchor?null:U(l,w);k(w||s,l,T,{fadeIn:!!y.keepCurrentUi})};if(l.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(x));return}const m=(v=0)=>{requestAnimationFrame(()=>{if(l.forcePageTop&&et("auto"),l.tooltipAnchor){x();return}const b=Q(s,l);let E=b?N(b,l):s;$(E,l);const w=U(l,E);if(!w&&v<4){requestAnimationFrame(()=>m(v+1));return}k(E||s,l,w,{fadeIn:!!y.keepCurrentUi})})};m(0)})}function k(u,l,g,y){const s=y||{},x=document.getElementById("tourTooltip");x&&x.remove(),F();const m=document.createElement("div");m.id="tourTooltip";const v=Math.min(i+1,o.length),b=Math.max(8,Math.min(100,Math.round(v/o.length*100))),E=nt(l.title||"Quick setup"),w=nt(l.text||""),T=l.primaryLabel||(i<o.length-1?"Next":"Got it"),S=i<=0;m.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",m.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${E}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${v} of ${o.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${b}%;"></div>
          </div>
        </div>
        <div class="tour-title">${E}</div>
        <p class="tour-copy">${w}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${S?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${nt(T)}</button>
        </div>
      </div>`,document.body.appendChild(m);const I=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,C=te(l,I);let L=g;if(g&&g.width>=2&&g.height>=2){L=ee(u,l,m,C)||g,l.noHighlight||kt(u,l);const W=Math.min(380,window.innerWidth-28);m.style.setProperty("--tour-width",`${W}px`),m.style.left="0",m.style.right="auto",m.style.bottom="auto",m.style.width=`${W}px`,m.style.justifyContent="flex-start",m.classList.add("tour-tooltip-floating");const yt=m.querySelector(".tour-panel"),ht=Math.min(yt&&yt.offsetHeight||m.offsetHeight||190,Math.max(140,window.innerHeight-28)),vt=l.tooltipGap??8,Ht=L.left+L.width/2,bt=Math.max(14,Math.min(Ht-W/2,window.innerWidth-W-14)),Nt=C!=="above"?L.bottom+vt:L.top-ht-vt,wt=Math.max(14,Math.min(Nt,window.innerHeight-ht-14));m.style.setProperty("--tour-left",`${bt}px`),m.style.setProperty("--tour-top",`${wt}px`),m.style.left=`${bt}px`,m.style.top=`${wt}px`}m.style.visibility="visible",s.fadeIn&&Zt(m),B()}function B(){const u=document.getElementById("tourNextBtn"),l=document.getElementById("tourSkipBtn"),g=v=>{if(v<0)return;const b=r(o[i],o[v]),E=()=>{i=v,localStorage.setItem("settingsTourStep",String(i)),p({keepCurrentUi:b})};Jt().then(E)},y=()=>{g(i+1)},s=()=>{n()},x=()=>{i<=0||g(i-1)};u&&(u.onclick=y),l&&(l.onclick=s);const m=document.getElementById("tourBackBtn");m&&(m.onclick=x),_t({onNext:y,onBack:x,onSkip:s})}function R(){F(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms(),P({blockPointer:!0,lockScroll:!0,dim:K});const u=c.activeHotelName||"Your Property",l=u.trim().charAt(0).toUpperCase(),g=u.length>10?u.slice(0,10):u,y="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",s="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",x="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",m=`<div style="${y}"><div style="${s}background:rgba(255,255,255,0.22);"></div><div style="${x}"></div></div>`,v=c.activeHotelAppIcon||"",b=v?`<img src="${v}" alt="" style="width:100%;height:100%;object-fit:contain;">`:l,E=v?`${s}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${s}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,w=`<div style="${y}"><div style="${E}">${b}</div><div style="${x}font-size:7.5px;color:#fff;font-weight:700;">${g}</div></div>`,T=[m,m,m,m,w,m,m,m].join(""),S=document.createElement("div");if(S.id="tourTooltip",S.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",S.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${T}
            </div>
          </div>
        </div>
        <div style="padding:20px 22px 22px;text-align:center;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">1 of ${o.length}</div>
            <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
              <div style="height:100%;width:${Math.round(1/o.length*100)}%;border-radius:999px;background:#2E7D5B;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">You're on their home screen</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${u}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your property from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(S),!document.getElementById("tourModalAnimStyle")){const I=document.createElement("style");I.id="tourModalAnimStyle",I.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(I)}document.getElementById("tourNextBtn").onclick=()=>{H().then(()=>{a({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}}function z(){F(),P({blockPointer:!0,lockScroll:!0,dim:K});let u=0;const l=[`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Your Availability Calendar</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">See room availability at a glance</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px;">
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sun</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Mon</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Tue</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Wed</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Thu</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Fri</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sat</div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">9</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">10</div><div style="font-size:10px;color:#92400e;font-weight:600;">2</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">11</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEE2E2;border:1.5px solid #E05252;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">12</div><div style="font-size:10px;color:#991b1b;font-weight:600;">0</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">13</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">14</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">3</div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #D8E4DC;">
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:6px;padding:4px 6px;text-align:center;"><div style="font-size:10px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:9px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="font-size:11px;color:#374151;line-height:1.3;"><span style="font-weight:600;">8</span> = date &nbsp;·&nbsp; <span style="font-weight:600;">4</span> = rooms available</div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#E8F5EE;border:1.5px solid #2E7D5B;"></div><span style="font-size:11px;color:#374151;">Open</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEF3C7;border:1.5px solid #F59E0B;"></div><span style="font-size:11px;color:#374151;">Partial</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEE2E2;border:1.5px solid #E05252;"></div><span style="font-size:11px;color:#374151;">Full</span></div>
          </div>
        </div>
      </div>`,`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Tap Any Day to Adjust</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Control exactly how many rooms are available</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:flex;justify-content:center;margin-bottom:12px;">
            <div style="background:#2E7D5B;border:2px solid #1a5c3f;border-radius:10px;padding:8px 12px;text-align:center;box-shadow:0 0 0 3px rgba(46,125,91,0.3);">
              <div style="font-size:12px;font-weight:700;color:white;">10</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.8);font-weight:600;">4</div>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:10px;">
            <span style="font-size:11px;color:#6b7280;">↓ opens this</span>
          </div>
          <div style="background:white;border-radius:12px;padding:16px;border:1.5px solid #D8E4DC;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;">Wed, Jun 10</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">−</div>
              <div style="font-size:28px;font-weight:700;color:#1a1a2e;">3</div>
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">+</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8faf9;border-radius:8px;border:1px solid #D8E4DC;">
              <span style="font-size:12px;font-weight:600;color:#374151;">Close for this day</span>
              <div style="width:36px;height:20px;border-radius:10px;background:#D8E4DC;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div></div>
            </div>
          </div>
        </div>
      </div>`,`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">That's It</div>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f0fdf4;border-radius:12px;padding:16px;border:1px solid #bbf7d0;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">✅</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Rooms default to <strong>open</strong> with all units available</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">🔒</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Toggle <strong>close</strong> on days you're fully booked</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">🔢</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Use +/− to reduce units when partially booked</span>
            </div>
          </div>
        </div>
      </div>`],g=document.createElement("div");g.id="tourTooltip",g.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";let y=!1;function s(){const m=u>=l.length-1?"Next — Revenue →":"Next →",v=y?"none":"tourPanelIn 0.22s ease-out",b=y?"tourPageIn 0.18s ease-out":"none";g.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">
            ${l[u]}
          </div>
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${l.map((E,w)=>`<div style="width:8px;height:8px;border-radius:50%;background:${w===u?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${m}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,y=!0,document.getElementById("tourNextBtn").onclick=()=>{u<l.length-1?(u++,s()):H().then(()=>{a({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}}if(document.body.appendChild(g),s(),!document.getElementById("tourModalAnimStyle")){const x=document.createElement("style");x.id="tourModalAnimStyle",x.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(x)}}function A(){F(),P({blockPointer:!0,lockScroll:!0,dim:K});let u=0,l=!1;const g=[`
          <div style="padding:20px 18px 0;text-align:center;">
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Bookings</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">A guest books. We hold the room.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 14px;">No one else can book it online while you decide.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:2px solid #D8E4DC;border-radius:16px;overflow:hidden;box-shadow:0 8px 22px rgba(26,43,34,0.07);">
            <div style="height:5px;background:#F59E0B;"></div>
            <div style="padding:15px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                <div>
                  <div style="font-size:16px;font-weight:750;color:#1a1a2e;">Sarah Johnson</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">Just now</div>
                </div>
                <div style="font-size:18px;font-weight:750;color:#2E7D5B;">$284.00</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:11px;font-weight:750;padding:4px 9px;border-radius:20px;">⏳ Auto-confirms in 20 min</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">🛏 King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">🌙 3 nights</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px;background:#f8faf9;border-radius:10px;margin-bottom:12px;">
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-in</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 15</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-out</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 18</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Guests</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">2</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:10px 11px;">
                <div style="font-size:11px;color:#9A3412;line-height:1.4;"><strong>Room held.</strong><br>No one else can book it online.</div>
                <div style="font-size:18px;">🔒</div>
              </div>
            </div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Double-booking protection</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">Why put Front Desk on your phone?</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">Bookings can arrive while you’re away. A phone notification gives you time to confirm the room is still free.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="width:238px;margin:0 auto 12px;background:#18231E;border-radius:26px;padding:10px;box-shadow:0 14px 30px rgba(26,43,34,0.22);">
            <div style="background:#F7F9F8;border-radius:19px;padding:13px 13px 12px;text-align:left;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <div style="width:28px;height:28px;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.09);">
                  <img src="/marketellogo.svg" alt="" style="width:20px;height:20px;object-fit:contain;">
                </div>
                <div>
                  <div style="font-size:10px;font-weight:850;letter-spacing:.03em;color:#2E7D5B;">FRONT DESK</div>
                  <div style="font-size:9px;color:#9CA3AF;">now</div>
                </div>
              </div>
              <div style="font-size:13px;font-weight:800;color:#1A2B22;margin-bottom:3px;">New booking — confirm or release</div>
              <div style="font-size:11px;color:#4B5D52;line-height:1.45;margin-bottom:11px;">Jun 15–18 · King Room<br>Sarah Johnson · auto-confirms in 20 min</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
                <div style="background:#2E7D5B;color:white;border-radius:9px;padding:9px 5px;text-align:center;font-size:11px;font-weight:800;">✓ Confirm</div>
                <div style="background:#fff;color:#B91C1C;border:1.5px solid #FCA5A5;border-radius:9px;padding:8px 5px;text-align:center;font-size:11px;font-weight:800;">Room taken</div>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:10px;text-align:center;">
              <div style="font-size:18px;margin-bottom:3px;">✓</div>
              <div style="font-size:11px;font-weight:800;color:#166534;">Confirm</div>
              <div style="font-size:10px;color:#4B5D52;line-height:1.35;margin-top:2px;">Guest is emailed</div>
            </div>
            <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:10px;text-align:center;">
              <div style="font-size:18px;margin-bottom:3px;">↩</div>
              <div style="font-size:11px;font-weight:800;color:#9A3412;">Room taken</div>
              <div style="font-size:10px;color:#4B5D52;line-height:1.35;margin-top:2px;">Room freed · hold voided</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:11px;padding:9px;text-align:center;">
              <div style="font-size:9px;font-weight:850;color:#991B1B;text-transform:uppercase;margin-bottom:3px;">Without alerts</div>
              <div style="font-size:10px;color:#4B5D52;line-height:1.35;">The booking confirms automatically</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:11px;padding:9px;text-align:center;">
              <div style="font-size:9px;font-weight:850;color:#166534;text-transform:uppercase;margin-bottom:3px;">With alerts</div>
              <div style="font-size:10px;color:#4B5D52;line-height:1.35;">You can confirm or tap Room taken</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:9px;background:#E8F5EE;border:1.5px solid #A7D9BE;border-radius:12px;padding:11px 12px;margin-top:10px;text-align:left;">
            <div style="font-size:19px;line-height:1;">📲</div>
            <div>
              <div style="font-size:11px;font-weight:850;color:#166534;margin-bottom:2px;">No App Store needed</div>
              <div style="font-size:10px;color:#4B5D52;line-height:1.45;">It takes 3 quick steps to put Front Desk on your phone. We’ll show you exactly how under <strong>Guest App</strong> later in this tour.</div>
            </div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#B91C1C;margin-bottom:5px;">Plans changed?</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">What if a walk-in takes the room later?</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">Open the online booking and tap <strong>Cancel this booking</strong>.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:#fff;border:1.5px solid #D8E4DC;border-radius:14px;padding:13px;box-shadow:0 8px 22px rgba(26,43,34,0.07);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:10px;">
              <div>
                <div style="font-size:14px;font-weight:850;color:#1A2B22;">Sarah Johnson</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">Booked online · King Room · Tomorrow</div>
              </div>
              <div style="font-size:13px;font-weight:850;color:#2E7D5B;">$284</div>
            </div>
            <div style="background:#F8FAF9;border-radius:10px;padding:10px 11px;margin-bottom:9px;">
              <div style="font-size:9px;color:#6B7280;font-weight:750;text-transform:uppercase;margin-bottom:4px;">Why are you cancelling?</div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:750;color:#1A2B22;">
                <span>The room was already taken</span><span style="color:#9CA3AF;">▾</span>
              </div>
            </div>
            <div style="background:#B91C1C;color:#fff;border-radius:10px;padding:10px;text-align:center;font-size:11px;font-weight:800;">Cancel the booking</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">✓</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Guest is emailed</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">$1</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Card hold released</div>
            </div>
          </div>
        </div>`],y=document.createElement("div");y.id="tourTooltip",y.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";const s=()=>{const x=u>=g.length-1,m=u===0?"Next — Phone alerts →":u===1?"Next — If plans change →":"Next — Availability →",v=l?"none":"tourPanelIn 0.22s ease-out",b=l?"tourPageIn 0.18s ease-out":"none";y.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">${g[u]}</div>
          <div style="padding:2px 18px 7px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;">
              ${g.map((E,w)=>`<div style="width:8px;height:8px;border-radius:50%;background:${w===u?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:750;cursor:pointer;">${m}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,l=!0,document.getElementById("tourNextBtn").onclick=()=>{if(!x){u++,s();return}H().then(()=>{a({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}};if(document.body.appendChild(y),s(),!document.getElementById("tourModalAnimStyle")){const x=document.createElement("style");x.id="tourModalAnimStyle",x.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(x)}}p()}async function zt(){const t=document.getElementById("settingsList");if(t){t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const e=await api("GET","/api/crm/verify"),i="https://"+(e?.domain||c.activeHotelId+".mktel.co"),a="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),n=await api("GET","/api/crm/rooms");let r={nightly:69,weekly:299,monthly:999};n?.rates&&(r=n.rates);const d=n?.rooms||[];let p="";e?.subscribed||(p+=goLiveInlineCardHtml()),d.length?d.forEach(f=>{const h=f.images&&f.images.length>0;p+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${h?`<img src="${f.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${h?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${f.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${f.name}</div>
              ${f.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${f.description}</div>`:""}
            </div>
          </div>
        `}):p+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${i}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${i}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${a}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `,p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${r.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${r.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${r.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `,p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,e?.subscribed&&(p+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `,t.innerHTML=p}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function oe(){const t=document.getElementById("settings-booking-url");t&&navigator.clipboard.writeText(t.value).then(()=>{localStorage.setItem("linkCopied","1"),G(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function ie(){localStorage.setItem("settingsTourDone","1");const t=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",t);let e=0;const o=setInterval(()=>{e++;const i=document.getElementById("edit-rate-nightly");if(i||e>20){if(clearInterval(o),!i)return;const a=i.closest(".accordion-body");if(a&&a.style.display==="none"){a.style.display="block";const n=a.previousElementSibling?.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const n=document.getElementById("checklistPointer");n&&n.remove();const r=i.getBoundingClientRect(),d=document.createElement("div");d.id="checklistPointer",d.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${r.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,d.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(d),setTimeout(()=>{const p=document.getElementById("checklistPointer");p&&p.remove()},6e3)},1e3)},100)}},200)}function ne(){const e="https://"+(c.activeHotelDomain||c.activeHotelId+".mktel.co");navigator.clipboard.writeText(e).then(()=>{localStorage.setItem("linkCopied","1"),G(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function re(t,e){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const a=setInterval(()=>{i++;const n=document.querySelector(t);if(n||i>20){if(clearInterval(a),!n)return;n.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const d=n.getBoundingClientRect(),p=document.createElement("div");p.id="checklistPointer",p.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${d.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,p.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${e}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(p),setTimeout(()=>{const f=document.getElementById("checklistPointer");f&&f.remove()},6e3)},1e3)}},200)}function ct(){const t=String(c.token||localStorage.getItem("crmToken")||"").trim();return t&&(c.token=t),t}async function pt(t,e){const o=ct();if(!o)throw new Error("Not logged in");const i=await qt(e),a=new FormData;a.append("image",i,i.name||"room.webp");const n=new URLSearchParams;c.activeHotelId&&n.set("hotelId",c.activeHotelId),n.set("token",o);const r=await fetch(`/api/crm/rooms/${t}/images?${n}`,{method:"POST",headers:{"x-crm-token":o},body:a}),d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.message||d.error||`Upload failed (${r.status})`);return d}async function ae(t,e){const o=t.target.files[0];if(o)try{await pt(e,o),toast("Photo uploaded!","success"),zt()}catch(i){toast(i.message||"Upload failed","error")}}async function se(){const t=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function de(){const t=document.getElementById("settings-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");c.token=t,c.isMasterPin=!1;try{localStorage.setItem("crmToken",c.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(e){toast(e.message||"Failed to change PIN","error")}}async function le(){const t=document.getElementById("settings-support-msg")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function ce(){const t=c.activeHotelDomain||c.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(c.activeHotelId)+"&preview=1":"https://"+t+"?preview=1";window.open(o,"_blank")}function It(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&c.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(c.activeHotelId);const e=c.activeHotelDomain||"";return e?"https://"+e+"/":""}function pe(){const t=It();if(!t){toast("Your booking domain is still setting up.","info");return}window.open(t,"_blank")}function ue(){const t=document.getElementById("previewSiteBar");t&&(t.style.display=c.currentFilter==="settings"?"block":"none")}function G(){if(localStorage.getItem("settingsTourDone"))return;const t=parseInt(localStorage.getItem("settingsTourStep")||"0"),e=c.editRooms.some(r=>r.images&&r.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");t===2&&e&&localStorage.setItem("settingsTourStep","3"),t===3&&i&&localStorage.setItem("settingsTourStep","4"),t===4&&o&&localStorage.setItem("settingsTourStep","5");const a=document.getElementById("tourTooltip");a&&a.remove();const n=document.getElementById("tourBlurOverlay");n&&n.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex=r.dataset.tourOrigZIndex||"",r.style.isolation=r.dataset.tourOrigIsolation||"",r.style.boxShadow=r.dataset.tourOrigBoxShadow||"",r.style.outline=r.dataset.tourOrigOutline||"",r.style.outlineOffset=r.dataset.tourOrigOutlineOffset||"",r.style.transition=r.dataset.tourOrigTransition||"",r.style.borderRadius=r.dataset.tourOrigBorderRadius||"",r.style.opacity=r.dataset.tourOrigOpacity||"";const d=r.dataset.tourOrigBackground||"",p=r.dataset.tourOrigBackgroundColor||"";p?r.style.backgroundColor=p:r.style.removeProperty("background-color"),d?r.style.background=d:r.style.removeProperty("background"),r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition,delete r.dataset.tourOrigZIndex,delete r.dataset.tourOrigIsolation,delete r.dataset.tourOrigBoxShadow,delete r.dataset.tourOrigOutline,delete r.dataset.tourOrigOutlineOffset,delete r.dataset.tourOrigTransition,delete r.dataset.tourOrigBackground,delete r.dataset.tourOrigBackgroundColor,delete r.dataset.tourOrigBorderRadius,delete r.dataset.tourOrigOpacity}),document.body.style.overflow=""}function ge(){let t=0;const e={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many bookable rooms or units do you offer?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let a=document.getElementById("onboardingOverlay");if(a&&a.remove(),t>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",e).catch(()=>{})}catch{}At();return}const n=o[t],r=document.createElement("div");r.id="onboardingOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",n.type==="text"?(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${n.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(r),document.getElementById("onboardingTextSubmit").onclick=()=>{const d=document.getElementById("onboardingTextInput").value.trim();d&&(e[n.key]=d,t++,i())}):(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${n.options.map(d=>`
              <button class="onboarding-opt" data-value="${d.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${d.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(r),r.querySelectorAll(".onboarding-opt").forEach(d=>{d.addEventListener("click",()=>{e[n.key]=d.dataset.value,d.style.background="#1a1a2e",d.style.color="white",d.style.fontWeight="600",setTimeout(()=>{t++,i()},250)})}))}i()}function me(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const t=new URL(window.location.href);t.searchParams.set("welcome","1"),t.searchParams.delete("tab");const e=t.pathname+t.search+t.hash;if(e===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(e)}function At(){const t=document.createElement("div");t.id="welcomeModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function e(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const a=new URL(window.location);a.searchParams.delete("welcome"),window.history.replaceState({},"",a)}catch{}const i=typeof at=="function"?at:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),t.remove()}function o(){t.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏡</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=e}document.body.appendChild(t),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function ot(){const t=document.getElementById("postActivationTourTooltip");t&&t.remove();const e=document.getElementById("postActivationTourOverlay");e&&e.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function J(){ot(),localStorage.setItem("postActivationTourDone","1");const t=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",t)}catch{}}function ut(){if(localStorage.getItem("postActivationTourDone")){J();return}ot();const t=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. Once phone setup is complete, new bookings can alert you even when Front Desk is closed."},{tab:"bookings",navFilter:"bookings",text:"<strong>Booking review</strong> — turn it on here and new bookings wait for your OK before locking in, so a room you've already given away never gets sold twice."},{tab:"apps",navFilter:"apps",text:"<strong>Last step: set up your phone.</strong> No App Store needed. Follow the 3 steps here, then turn on booking protection so new reservations can reach you."}];let e=0;function o(){if(ot(),e>=t.length){J();return}const i=t[e],a=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);a&&setFilter(i.tab,a);const n=document.createElement("div");n.id="postActivationTourOverlay",n.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(n),document.body.style.overflow="hidden",setTimeout(()=>{const r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&(r.setAttribute("data-post-activation-highlight","1"),r.style.position="relative",r.style.zIndex="100003",r.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",r.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const d=r?r.getBoundingClientRect():{left:24,bottom:80,width:200},p=document.createElement("div");p.id="postActivationTourTooltip";const f=Math.min(300,window.innerWidth-32),h=Math.max(16,Math.min(d.left+d.width/2-f/2,window.innerWidth-f-16)),k=Math.min(d.bottom+14,window.innerHeight-180);p.style.cssText=`position:fixed;z-index:100004;left:${h}px;top:${k}px;max-width:${f}px;width:${f}px;`;const B=e>=t.length-1;p.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${e+1} / ${t.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${B?"Set up this phone":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(p),document.getElementById("postActivationTourNext").onclick=()=>{e+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{J()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=ut;function fe(){if(document.getElementById("activatedModalOverlay"))return;const t=c.activeHotelDomain||(c.activeHotelId?c.activeHotelId+".mktel.co":""),e="Bookings and Guest App",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
    <div style="background:white;border-radius:20px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2E7D5B 0%,#1a5c3f 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">🎉</div>
      <h2 style="font-size:21px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">You're live — payment received</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 18px;">Thank you! Your subscription is active and your booking page is now switched on.</p>
      <div style="text-align:left;background:#f0f7f3;border:1px solid #d6e9df;border-radius:14px;padding:16px 18px;margin-bottom:18px;">
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>Guests can now book.</strong> The paywall is gone — reservations go through on your page immediately.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>Next, set up your phone</strong> — no App Store needed. Then booking alerts can reach you when Front Desk is closed.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>${e}</strong> are now part of your daily workflow.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>A receipt is on its way</strong> to your email from Stripe.</span>
        </div>
      </div>
      ${t?`<p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Your booking page: <strong style="color:#2E7D5B;">${t}</strong></p>`:""}
      <button id="activatedModalTour" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Quick tour →</button>
      <button id="activatedModalSkip" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid #d6e9df;background:#fff;color:#6b7280;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Skip — go to Bookings</button>
    </div>
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),ut()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function gt(){if(isEditPageDomReady())return;if(c.editRoomsLoadPromise)return c.editRoomsLoadPromise;const t=document.getElementById("editRoomsList");if(t){c.editRoomsLoadPromise=(async()=>{t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[e,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!e.rooms)throw new Error("No data");c.editRooms=e.rooms;const i=o?.hotelName||"";i&&(c.activeHotelName=i),o&&(c.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const a=o?.hotelSubtitle||"",n=o?.hotelAddress||"",r=o?.hotelPhone||"",d=o?.appIconUrl||"";c.activeHotelAppIcon=d,updateFrontdeskManifestLink();let p={nightly:69,weekly:299,monthly:999,taxRate:.1};e.rates&&(p=e.rates);const h="https://"+(o?.domain||c.activeHotelId+".mktel.co"),k="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(h);let B=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${n}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-name" placeholder="Your Property Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${a}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${r}" id="edit-hotel-phone" placeholder="(555) 123-4567" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
        </div>
      </div>
      </div>
      <div class="dash-b">
      ${goLiveInlineCardHtml()}
      ${(typeof twoRoomExplainerHtml=="function"?twoRoomExplainerHtml:window.twoRoomExplainerHtml)("booking-page")}
      <div id="editRoomsCards"></div>
      <button style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:8px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add booking page room</button>
      </div>
      <div class="dash-c">
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Checkout Page Preview</div>
          <div style="background:#f4f7f9;border-radius:12px;overflow:hidden;border:1px solid var(--border);">
            <!-- Back button pill (matches .back-button-pill) -->
            <div style="padding:12px 16px 0;">
              <span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(16,185,129,0.2);">‹ Back to Booking</span>
            </div>
            <!-- Cancellation policy banner (matches .static-banner — white pill with shadow) -->
            <div style="padding:10px 16px;display:flex;justify-content:center;">
              <div style="background:white;border-radius:20px;padding:8px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:2px dashed #10b981;width:fit-content;max-width:100%;position:relative;">
                <div style="position:absolute;top:-8px;right:8px;background:#10b981;color:white;font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">Editable</div>
                <input type="text" value="${(o?.cancellationPolicy||"").replace(/"/g,"&quot;")}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;font-size:11px;color:#111827;font-weight:500;border:none;background:transparent;outline:none;font-family:inherit;text-align:center;">
              </div>
            </div>
            <!-- Progress bar (matches .checkout-progress-bar with pill step-circles) -->
            <div style="padding:8px 16px 14px;position:relative;">
              <div style="display:flex;justify-content:space-between;align-items:center;position:relative;">
                <!-- Connecting line -->
                <div style="position:absolute;top:11px;left:15%;right:15%;height:2px;background:#ddd;z-index:0;"></div>
                <!-- Step 1: Review Cart (active/completed) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:#28a745;border:2px solid #28a745;"></div>
                  <span style="font-size:10px;color:#000;font-weight:600;">Review Cart</span>
                </div>
                <!-- Step 2: Info (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Info</span>
                </div>
                <!-- Step 3: Payment (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Payment</span>
                </div>
              </div>
            </div>
            <!-- Placeholder content -->
            <div style="padding:0 16px 14px;">
              <div style="background:white;border-radius:8px;padding:10px;border:1px solid var(--border);">
                <div style="height:8px;background:var(--border);border-radius:4px;margin-bottom:6px;width:60%;"></div>
                <div style="height:8px;background:var(--border);border-radius:4px;width:40%;"></div>
              </div>
            </div>
          </div>
          <p style="font-size:10px;color:var(--text-muted);margin-top:6px;text-align:center;">Edit the green banner above — shown to guests during checkout.</p>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;">Save Banner</button>
        </div>
      </div>
      <div class="booking-card" id="tour-booking-link-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">Your Booking Link</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${h}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${h.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
          </div>
          <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">
            <i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR
          </button>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Add this to your Google Business, website, or text it to guests.</p>
        </div>
      </div>
      <div class="booking-card" id="tour-rates-card" style="margin-bottom:14px;">
        <div id="tour-rates-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Rates</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${p.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${p.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${p.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
      <div class="booking-card" id="tour-pin-card" style="margin-bottom:14px;">
        <div id="tour-pin-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Change PIN</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <input type="text" id="edit-new-pin" value="${c.isMasterPin?"":c.token}" placeholder="${c.isMasterPin?"Enter a unique property PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${c.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
        </div>
      </div>
      ${o?.subscribed?`<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
        </div>
      </div>`:""}
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Need Help?</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <textarea id="supportMessage" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;"></textarea>
          </div>
          <button onclick="sendSupportMessage()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email on file.</p>
        </div>
      </div>
      </div>
      </div>
    `;t.innerHTML=B,Y(),typeof lucide<"u"&&lucide.createIcons()}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await c.editRoomsLoadPromise}finally{c.editRoomsLoadPromise=null}}}function mt(){Y()}function Y(){const t=document.getElementById("editRoomsCards");if(t){if(!c.editRooms.length){t.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}t.innerHTML=c.editRooms.map((e,o)=>{const i=(e.amenities||"").split("•").map(r=>r.trim()).filter(Boolean),a=(e.images||[]).filter(r=>r&&r.url),n=jsStr(e.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${e.id}" ${o===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${a.length?`
          <img class="room-edit-main-img" src="${esc(a[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${a.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${n}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${n}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${a.length}</div>
            <div class="room-edit-image-dots">
              ${a.map((r,d)=>`<button type="button" class="room-edit-image-dot ${d===0?"active":""}" aria-label="Show photo ${d+1}" ${d===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${n}', ${d})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${n}')">
        </label>
      </div>
      ${a.length>1?'<div class="room-edit-thumbs">'+a.map((r,d)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${d===0?"active":""}" aria-label="Show photo ${d+1}" ${d===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${n}', ${d})"><img src="${esc(r.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${n}','${jsStr(r.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
      </div>
      <div class="room-edit-fields" style="padding:18px;">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Room Name</div>
          <input type="text" value="${e.name}" id="edit-name-${e.id}" style="width:100%;font-size:18px;font-weight:700;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Description</div>
          <input type="text" value="${(e.description||"").replace(/"/g,"&quot;")}" id="edit-desc-${e.id}" placeholder="e.g. A spacious room with king bed and city view" style="width:100%;font-size:14px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;color:var(--text);">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Amenities</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;" id="edit-amenity-pills-${e.id}">
            ${i.map(r=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${Ot(r)} ${r} <button onclick="removeAmenity('${e.id}','${r.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
          </div>
          <button onclick="openAmenityPicker('${e.id}')" style="background:none;border:1.5px dashed var(--border);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:inherit;">+ Add amenities</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Max Guests</div>
            <input type="number" value="${e.maxOccupancy||4}" min="1" max="20" id="edit-occ-${e.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Total Units</div>
            <input type="number" value="${e.totalUnits||1}" min="1" max="200" id="edit-units-${e.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="saveEditRoom('${e.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Changes</button>
          <button onclick="deleteEditRoom('${e.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function Pt(t){const e=c.editRooms.find(o=>String(o.id)===String(t));return(e&&e.images||[]).filter(o=>o&&o.url)}function Ct(t,e){const o=Pt(t);if(!o.length)return;const i=document.getElementById("edit-card-"+t);if(!i)return;const a=o.length,n=((Number(e)||0)%a+a)%a,r=i.querySelector(".room-edit-main-img");r&&(r.src=o[n].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(n));const d=i.querySelector(".room-edit-photo-count");d&&(d.textContent=n+1+" / "+a),i.querySelectorAll(".room-edit-image-dot").forEach((p,f)=>{p.classList.toggle("active",f===n),f===n?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((p,f)=>{p.classList.toggle("active",f===n),f===n?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")})}function xe(t,e){const i=document.getElementById("edit-card-"+t)?.querySelector(".room-edit-photo"),a=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;Ct(t,a+e)}function Ot(t){const e=t.toLowerCase();return e.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':e.includes("tv")||e.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':e.includes("fridge")||e.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':e.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':e.includes("housekeeping")||e.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':e.includes("bath")||e.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':e.includes("work")||e.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':e.includes("pet")||e.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':e.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':e.includes("kitchen")||e.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const Rt=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let ft=null;function Ft(t){ft=t;const o=(c.editRooms.find(n=>n.id===t)?.amenities||"").split("•").map(n=>n.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
      <div id="amenityPickerModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;align-items:center;justify-content:center;padding:20px;">
        <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
          <div style="font-size:16px;font-weight:700;margin-bottom:14px;">Select Amenities</div>
          <div id="amenityPickerGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>
          <div style="margin-bottom:14px;">
            <input type="text" id="amenityCustomInput" placeholder="Or type a custom one..." style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:14px;outline:none;">
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="confirmAmenityPicker()" style="flex:1;padding:11px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Done</button>
            <button onclick="closeAmenityPicker()" style="padding:11px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:none;font-family:inherit;font-size:14px;color:#6b7280;cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    `),document.getElementById("amenityPickerModal").addEventListener("click",it),i=document.getElementById("amenityPickerModal"));const a=document.getElementById("amenityPickerGrid");a.innerHTML=Rt.map(n=>{const r=o.some(d=>d.includes(n.key));return`<button onclick="toggleAmenityPreset(this,'${n.key}')" data-key="${n.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${r?"#2E7D5B":"#e5e7eb"};background:${r?"#E8F5EE":"white"};color:${r?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${n.icon}" style="width:14px;height:14px;"></i> ${n.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function ye(t,e){const o=t.style.borderColor==="rgb(46, 125, 91)";t.style.borderColor=o?"#e5e7eb":"#2E7D5B",t.style.background=o?"white":"#E8F5EE",t.style.color=o?"#1a1a2e":"#2E7D5B"}function it(){document.getElementById("amenityPickerModal").style.display="none",ft=null}function he(){const t=c.editRooms.find(a=>a.id===ft);if(!t){it();return}const e=document.getElementById("amenityPickerGrid"),o=[];e.querySelectorAll("button").forEach(a=>{if(a.style.background==="rgb(232, 245, 238)"){const n=Rt.find(r=>r.key===a.dataset.key);n&&o.push(n.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),t.amenities=o.join(" • "),it(),mt(),typeof lucide<"u"&&lucide.createIcons()}function ve(t){Ft(t)}function be(t,e){const o=c.editRooms.find(a=>a.id===t);if(!o)return;const i=(o.amenities||"").split("•").map(a=>a.trim()).filter(Boolean);o.amenities=i.filter(a=>a!==e).join(" • "),mt(),typeof lucide<"u"&&lucide.createIcons()}async function we(){const t=document.getElementById("edit-hotel-name")?.value.trim(),e=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),a=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:t,subtitle:e,address:o,phone:i,cancellationPolicy:a}),toast("Property info saved!","success")}catch{toast("Failed to save","error")}}async function ke(){const t=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),localStorage.setItem("ratesChanged","1"),c.launchStatus=null,G(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function Ee(){const t=document.getElementById("edit-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");c.token=t,c.isMasterPin=!1;try{localStorage.setItem("crmToken",c.token)}catch{}toast("PIN updated!","success")}catch(e){toast(e.message||"Failed to change PIN","error")}}function Be(t){navigator.clipboard.writeText(t).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function Se(t){const e=t.nextElementSibling,o=t.querySelector(".accordion-arrow");e.style.display==="none"?(e.style.display="block",o&&(o.style.transform="rotate(90deg)")):(e.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let _=!1;function Mt(){if(document.getElementById("goLiveOverlay"))return;const t=document.createElement("div");t.id="goLiveOverlay",t.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",t.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(t)}function st(){const t=document.getElementById("goLiveOverlay");t&&t.remove()}async function Te(){if(!_){_=!0,Mt();try{const t=await api("POST","/api/crm/go-live");if(t.success&&t.url){window.location.href=t.url;return}st(),_=!1,toast(t.message||"Failed to start checkout","error")}catch{st(),_=!1,toast("Failed to start checkout. Try again.","error")}}}async function ze(){try{const t=await api("GET","/api/crm/billing-portal");t.success&&t.url?window.location.href=t.url:toast(t.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function Ie(){const t=document.getElementById("supportMessage")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function Ae(t){const e=c.editRooms.find(d=>d.id===t);if(!e){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+t)?.value.trim(),i=document.getElementById("edit-desc-"+t)?.value.trim(),a=parseInt(document.getElementById("edit-occ-"+t)?.value)||4,n=parseInt(document.getElementById("edit-units-"+t)?.value)||1,r={id:t,name:o||e.name,description:i||"",amenities:e.amenities||"",maxOccupancy:a,totalUnits:n};try{const d=await api("POST","/api/crm/rooms",r);if(d&&d.success===!1){toast(d.message||"Failed to save","error");return}e.name=r.name,e.description=r.description,e.maxOccupancy=a,e.totalUnits=n,toast("Room saved!","success")}catch(d){toast("Failed to save: "+(d.message||""),"error")}}async function Pe(t,e){const o=Array.from(t.target.files);if(!o.length)return;const a=document.getElementById("edit-card-"+e)?.querySelector("div:first-child");a&&(a.style.position="relative",a.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+e+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+e+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let n=0,r="";for(const p of o){try{const h=await pt(e,p);if(h.image){const k=c.editRooms.find(B=>B.id===e);k&&(k.images||(k.images=[]),k.images.push(h.image),k.imageUrl||(k.imageUrl=h.image.url)),n++}}catch(h){r=h.message||"Upload failed"}const f=document.getElementById("upload-progress-"+e);f&&(f.textContent=n+" / "+o.length)}const d=document.getElementById("upload-spinner-"+e);d&&d.remove(),Y(),n>0&&(c.launchStatus=null),G(),n>0?toast(n+" photo"+(n!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(r||"Upload failed","error")}function $t(t,e=512){return new Promise((o,i)=>{const a=new Image,n=URL.createObjectURL(t);a.onload=()=>{try{const r=Math.min(a.naturalWidth,a.naturalHeight),d=(a.naturalWidth-r)/2,p=(a.naturalHeight-r)/2,f=document.createElement("canvas");f.width=e,f.height=e;const h=f.getContext("2d");h.imageSmoothingQuality="high",h.drawImage(a,d,p,r,r,0,0,e,e),URL.revokeObjectURL(n),f.toBlob(k=>k?o(k):i(new Error("crop failed")),"image/png",.92)}catch(r){URL.revokeObjectURL(n),i(r)}},a.onerror=()=>{URL.revokeObjectURL(n),i(new Error("load failed"))},a.src=n})}function Dt(){const t=document.getElementById("appsAppIconPreview");t&&(t.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function xt(t){const e=document.getElementById("appsAppIconPreview");e&&(e.style.background="#fff",e.style.border="1px solid var(--border)",e.style.padding="0",e.innerHTML='<img src="'+t+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function dt(){const t=document.getElementById("appsAppIconPreview");if(!t)return;if(c.activeHotelAppIcon){xt(c.activeHotelAppIcon);return}const e=(c.activeHotelName||"P").trim().charAt(0).toUpperCase()||"🏡";t.style.background="transparent",t.style.border="none",t.style.padding="0",t.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+e+"</span>"}async function Ce(t){const e=t.files&&t.files[0];if(!e)return;Dt();const o=new FormData;try{const i=await $t(e,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",e)}try{const i=ct(),a=new URLSearchParams;c.activeHotelId&&a.set("hotelId",c.activeHotelId),i&&a.set("token",i);const r=await(await fetch(`/api/crm/hotel-app-icon?${a}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(r.success&&r.appIconUrl){c.activeHotelAppIcon=r.appIconUrl,xt(r.appIconUrl);const d=document.getElementById("appsView");d&&(d.dataset.appsKey=(c.activeHotelId||"")+"|"+r.appIconUrl+"|"+(c.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(r.message||"Failed to upload icon","error"),dt()}catch{toast("Failed to upload icon","error"),dt()}t.value=""}async function Oe(t,e){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${t}/images/${e}`);const o=c.editRooms.find(i=>i.id===t);o&&o.images&&(o.images=o.images.filter(i=>i.id!==e),o.imageUrl=o.images[0]?.url||null),Y(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function Re(t){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${t}`),toast("Room deleted","success"),gt()}catch{toast("Failed to delete","error")}}function Fe(){const t=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(t.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function Me(){const t=document.getElementById("editNewRoomName").value.trim();t&&api("POST","/api/crm/rooms",{name:t,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),gt()}).catch(()=>toast("Failed to add","error"))}const Lt={addAmenityPrompt:ve,advanceTourIfNeeded:G,changePin:Ee,checklistGoTo:re,checklistGoToRates:ie,cleanupPostActivationTourUi:ot,cleanupSettingsTourUi:O,closeAmenityPicker:it,confirmAmenityPicker:he,confirmEditAddRoom:Me,copyBookingLink:Be,copyBookingLinkFromChecklist:ne,deleteEditImage:Oe,deleteEditRoom:Re,ensureTourBlurOverlay:P,finishPostActivationTour:J,getAmenityIcon:Ot,getCrmAuthToken:ct,getEditRoomImages:Pt,goLive:Te,guestBookingEngineUrl:It,handoffToGuestAppsTour:St,hideGoLiveOverlay:st,loadEditRooms:gt,loadSettings:zt,openAmenityPicker:Ft,openBillingPortal:ze,openEditAddRoom:Fe,openGuestBookingEngine:pe,openPreviewSite:ce,openTourAccordion:$,postRoomImageUpload:pt,queryTourSelector:M,removeAmenity:be,renderEditRooms:mt,renderEditRoomsCards:Y,replayWalkthrough:me,resolveLiveTourElement:Q,resolveTourHighlightEl:N,restoreAppIconPreview:dt,saveEditRoom:Ae,saveHotelInfo:we,saveRates:ke,scrollTourTargetIntoView:Bt,sendSupportMessage:Ie,setAppIconPreviewImage:xt,setAppIconPreviewLoading:Dt,settingsChangePin:de,settingsCopyLink:oe,settingsSaveRates:se,settingsSendSupport:le,settingsUploadPhoto:ae,showActivatedModal:fe,showEditRoomPhoto:Ct,showFinaleMockModal:q,showGoLiveOverlay:Mt,showOnboardingQuestions:ge,showTestDriveModal:Tt,showWelcomeModal:At,squareCropImage:$t,startPostActivationTabTour:ut,startSettingsTour:at,stepEditRoomPhoto:xe,toggleAmenityPreset:ye,toggleSection:Se,tourAnchorRect:U,tourElementRect:tt,updatePreviewSiteBar:ue,uploadAppIcon:Ce,uploadEditImages:Pe};function $e(){Ut(Lt)}const je=Object.freeze(Object.defineProperty({__proto__:null,default:Lt,install:$e},Symbol.toStringTag,{value:"Module"}));export{Le as a,qe as b,c,je as d,Ut as e,Ne as i,He as s};
