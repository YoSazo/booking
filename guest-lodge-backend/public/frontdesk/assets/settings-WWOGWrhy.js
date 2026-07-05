const c={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let Y=null;function $e(){return typeof lucide<"u"?Promise.resolve():Y||(Y=new Promise((t,e)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>t(),o.onerror=()=>e(new Error("lucide load failed")),document.head.appendChild(o)}),Y)}async function Ht(t){if(!t||!t.type.startsWith("image/")||t.type==="image/webp"&&t.size<4e5)return t;try{const e=await createImageBitmap(t),o=1600,i=1200;let r=e.width,n=e.height;const a=Math.min(1,o/r,i/n);r=Math.round(r*a),n=Math.round(n*a);const d=document.createElement("canvas");d.width=r,d.height=n,d.getContext("2d").drawImage(e,0,0,r,n),e.close();const u=await new Promise((x,w)=>{d.toBlob(S=>S?x(S):w(new Error("encode failed")),"image/webp",.82)}),m=(t.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([u],m+".webp",{type:"image/webp"})}catch{return t}}function Le(){const t=()=>{c.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(t,{timeout:2500}):setTimeout(t,600)}function Nt(t){Object.assign(window,t)}function F(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function K(...t){return F("setFilter")?.(...t)}function qt(...t){return F("toast")?.(...t)}function J(...t){return F("updateGoLiveBanner")?.(...t)}function Ut(...t){return F("seedTourRevenueShell")?.(...t)}function jt(...t){return F("finishTourHydration")?.(...t)}function Gt(...t){return F("goLive")?.(...t)}let q=null;function M(){if(document.getElementById("frontdeskTourPolishStyle"))return;const t=document.createElement("style");t.id="frontdeskTourPolishStyle",t.textContent=`
    #tourBlurOverlay {
      -webkit-backdrop-filter: blur(1.25px);
      backdrop-filter: blur(1.25px);
      animation: tourOverlayFade 0.18s ease-out;
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
      .tour-progress-fill {
        transition: none !important;
      }
    }
  `,document.head.appendChild(t)}function st(){q&&(document.removeEventListener("keydown",q),q=null)}function Vt(t){st(),q=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",q)}function ot(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function O(t){M();const e=t||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText=`position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.22);pointer-events:${e.blockPointer?"auto":"none"};`,document.body.appendChild(o),e.lockScroll&&(document.body.style.overflow="hidden"),o)}function Yt(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"))}function Wt(t,e){const o=t.querySelectorAll("input, textarea, select"),i=e.querySelectorAll("input, textarea, select");o.forEach((r,n)=>{const a=i[n];a&&(r.type==="checkbox"||r.type==="radio"?a.checked=r.checked:a.value=r.value)})}function wt(t,e){const o=getComputedStyle(t);for(const n of o)e.style.setProperty(n,o.getPropertyValue(n),o.getPropertyPriority(n));const i=t.children,r=e.children;for(let n=0;n<i.length;n+=1)r[n]&&wt(i[n],r[n])}function vt(t,e){if(!t||!t.isConnected)return null;document.querySelectorAll("[data-tour-spotlight-clone]").forEach(r=>r.remove());const o=t.getBoundingClientRect();if(o.width<2||o.height<2)return null;const i=t.cloneNode(!0);return Yt(i),wt(t,i),Wt(t,i),i.setAttribute("data-tour-spotlight-clone","1"),i.setAttribute("aria-hidden","true"),i.style.position="fixed",i.style.left=`${o.left}px`,i.style.top=`${o.top}px`,i.style.width=`${o.width}px`,i.style.height=`${o.height}px`,i.style.margin="0",i.style.maxWidth="none",i.style.zIndex="99999",i.style.pointerEvents="none",i.style.transform="none",i.style.boxShadow=e?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",i.style.outline=e?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",i.style.outlineOffset=e?.spotlightOutlineOffset??"2px",e?.spotlightBackground&&(i.style.background=e.spotlightBackground,i.style.backgroundColor=e.spotlightBackground),e?.spotlightBorderRadius&&(i.style.borderRadius=e.spotlightBorderRadius),document.body.appendChild(i),i}function C(t){const e=t||{};st();const o=document.getElementById("tourTooltip");o&&o.remove();const i=document.getElementById("tourBlurOverlay");i&&!e.keepOverlay&&i.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(n=>n.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(n=>{n.style.position=n.dataset.tourOrigPosition||"",n.style.zIndex=n.dataset.tourOrigZIndex||"",n.style.isolation=n.dataset.tourOrigIsolation||"",n.style.boxShadow=n.dataset.tourOrigBoxShadow||"",n.style.outline=n.dataset.tourOrigOutline||"",n.style.outlineOffset=n.dataset.tourOrigOutlineOffset||"",n.style.transition=n.dataset.tourOrigTransition||"",n.style.background=n.dataset.tourOrigBackground||"",n.style.backgroundColor=n.dataset.tourOrigBackgroundColor||"",n.style.borderRadius=n.dataset.tourOrigBorderRadius||"",n.style.opacity=n.dataset.tourOrigOpacity||"",n.removeAttribute("data-tour-highlighted"),delete n.dataset.tourOrigPosition,delete n.dataset.tourOrigZIndex,delete n.dataset.tourOrigIsolation,delete n.dataset.tourOrigBoxShadow,delete n.dataset.tourOrigOutline,delete n.dataset.tourOrigOutlineOffset,delete n.dataset.tourOrigTransition,delete n.dataset.tourOrigBackground,delete n.dataset.tourOrigBackgroundColor,delete n.dataset.tourOrigBorderRadius,delete n.dataset.tourOrigOpacity});const r=document.getElementById("goLiveBanner");r&&r.dataset.tourHidden&&(delete r.dataset.tourHidden,typeof J=="function"&&J()),e.keepOverlay||(document.body.style.overflow="")}function _t(){const t=document.getElementById("tourTooltip"),e=Array.from(document.querySelectorAll("[data-tour-spotlight-clone]")),o=Array.from(document.querySelectorAll("[data-tour-highlighted]")),i=[t,...e,...o].filter(Boolean);return!i.length&&!o.length?(C({keepOverlay:!0}),Promise.resolve()):(st(),window.matchMedia("(prefers-reduced-motion: reduce)").matches?(C({keepOverlay:!0}),Promise.resolve()):(t&&(t.style.pointerEvents="none"),i.forEach(n=>{n.style.transition="opacity 0.12s ease, transform 0.12s ease",n.style.opacity="1"}),requestAnimationFrame(()=>{i.forEach(n=>{n.style.opacity="0",n.id==="tourTooltip"&&(n.style.transform="translateY(4px)")})}),new Promise(n=>{setTimeout(()=>{C({keepOverlay:!0}),n()},135)})))}function Qt(t){const e=[t,...document.querySelectorAll("[data-tour-spotlight-clone]"),...document.querySelectorAll("[data-tour-highlighted]")].filter(Boolean);e.forEach(o=>{o.style.transition="opacity 0.16s ease, transform 0.16s ease",o.style.opacity="0",o.id==="tourTooltip"&&(o.style.transform="translateY(4px)")}),requestAnimationFrame(()=>{e.forEach(o=>{o.style.opacity="1",o.id==="tourTooltip"&&(o.style.transform="translateY(0)")})})}function $(t,e){if(!e.openAccordion)return;const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const n=o.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}}function L(t){if(!t)return null;for(const e of String(t).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(e);if(o&&o.isConnected)return o}return null}function H(t,e){if(e.highlightSelector){const o=L(e.highlightSelector);if(o)return o}if(e.highlightCard){const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(o)return o}return e.targetParent&&(t.closest(".booking-card")||t.closest(".accordion-body"))||t}function _(t,e){if(!e)return t;const o=String(e.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const r=document.querySelector(i);if(r&&r.isConnected)return r}if(e.accordionCard){const i=document.querySelector(e.accordionCard);if(i&&i.isConnected)return i}return t&&t.isConnected?t:null}function Z(t,e){if(!t||!t.isConnected)return null;const o=t.getBoundingClientRect();return o.width<2||o.height<2||!e&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function U(t,e){const o=L(t.anchorSelector);if(o){const i=Z(o,!0);if(i)return i}return Z(e,!0)}function Kt(t){let e=t&&t.parentElement;for(;e&&e!==document.body&&e!==document.documentElement;){const o=getComputedStyle(e),i=o.overflowY||o.overflow;if(/(auto|scroll)/.test(i)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement}return null}function it(t,e){if(!e)return;const o=Kt(t);if(o){o.scrollTop+=e;return}window.scrollBy({top:e,left:0,behavior:"auto"})}function Jt(t,e){return e&&t.mobileTooltipPosition||t.tooltipPosition||"below"}function Zt(t,e,o,i){if(!t||!t.isConnected||!o)return U(e,t);const r=o.querySelector(".tour-panel"),n=Math.min(r&&r.offsetHeight||o.offsetHeight||190,Math.max(140,window.innerHeight-28)),a=e.tooltipGap??8,d=e.fitPadTop??e.scrollPadTop??72,u=window.innerHeight-(e.fitPadBottom??14),m=()=>U(e,t)||Z(t,!0);let x=m();if(!x)return null;for(let w=0;w<3;w+=1){const S=Math.max(120,u-d),R=x.height+a+n<=S;let z=0;if(i==="above"){const A=x.top-a-n-d;A<0&&(z=A),R&&x.bottom>u&&(z=x.bottom-u)}else{const A=x.bottom+a+n-u;A>0&&(z=A),R&&x.top<d&&(z=x.top-d)}if(Math.abs(z)<1)break;if(it(t,z),x=m(),!x)return null}return x}function X(t){const e=t||"auto";try{window.scrollTo({top:0,left:0,behavior:e})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const r=document.querySelector(i);r&&(r.scrollTop=0)})}function kt(t,e,o){const i=o||{},r=e.scrollTarget||e.accordionCard,n=(r?L(r):null)||t;if(!n&&!e.scrollToTop)return Promise.resolve();const a=e.scrollBlock||"center",d=window.matchMedia("(prefers-reduced-motion: reduce)").matches,u=i.smooth&&!d?"smooth":c.settingsTourActive||d?"auto":"smooth";return new Promise(m=>{const x=()=>{const p=e.scrollPadTop??80,s=e.scrollPadBottom??220,g=L(e.anchorSelector)||(n&&n.isConnected?n:null)||(t&&t.isConnected?t:null);if(!g){m();return}let h=g.getBoundingClientRect();h.top<p&&(it(g,h.top-p),h=g.getBoundingClientRect()),h.bottom>window.innerHeight-s&&it(g,h.bottom-window.innerHeight+s),requestAnimationFrame(()=>requestAnimationFrame(m))},w=()=>{n&&n.scrollIntoView({behavior:e.scrollToTop?"auto":u,block:a,inline:"nearest"}),x()};if(e.scrollToTop){if(X(u),e.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(()=>{e.forcePageTop&&X("auto"),m()}));return}if(u==="auto"){w();return}let p=!1;const s=()=>{p||(p=!0,window.removeEventListener("scrollend",g),clearTimeout(h),w())},g=()=>s();"onscrollend"in window&&window.addEventListener("scrollend",g,{once:!0});const h=setTimeout(s,520);return}if(!n){m();return}if(n.scrollIntoView({behavior:u,block:a,inline:"nearest"}),u==="auto"){x();return}let S=!1;const R=()=>{S||(S=!0,window.removeEventListener("scrollend",z),clearTimeout(A),x())},z=()=>R();"onscrollend"in window&&window.addEventListener("scrollend",z,{once:!0});const A=setTimeout(R,620)})}function Et(){C(),localStorage.setItem("settingsTourStep","handoff");const t=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&K("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const r=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof r=="function"&&r({chainFromSettingsTour:!0})},e=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof e=="function"?e().then(t).catch(t):t()}function N(){C(),M(),c.settingsTourActive=!1,J();const t=O({blockPointer:!0,lockScroll:!0});t.style.background="rgba(17,24,39,0.42)";const e=document.createElement("div");if(e.id="tourTooltip",e.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),!document.getElementById("tourModalAnimStyle")){const o=document.createElement("style");o.id="tourModalAnimStyle",o.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(o)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const i="https://"+(c.activeHotelDomain||c.activeHotelId+".mktel.co");navigator.clipboard.writeText(i).catch(()=>{}),C(),c.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),qt("Booking link copied!","success"),jt(),St()}}function St(t){M();const e=document.createElement("div");e.id="testDriveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{o(),Gt()},document.getElementById("activateLaterBtn").onclick=()=>{o();const i=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');i&&K("bookings",i)}}function nt(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),N();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),c.settingsTourActive=!0,J(),Ut();const t=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');t&&K("settings",t);function e(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!c.editRoomsLoadPromise)return;const g=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;g&&g()}e();const o=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the hotel name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",scrollPadTop:80,scrollPadBottom:360,tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8,spotlightBackground:"#fff",spotlightBorderRadius:"0 0 20px 20px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0",fitPadTop:108},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:80,scrollPadBottom:220},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,scrollBlock:"start",scrollPadTop:92,scrollPadBottom:220},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function r(p){C(p)}function n(){r(),localStorage.removeItem("settingsTourStep"),N()}function a(p,s){return!(!p||!s||p.customModal||s.customModal||p.tab!==s.tab||!p.target||!s.target)}function d(p,s){if(p.customModal){m(p,s);return}requestAnimationFrame(()=>m(p,s))}function u(p){const s=p||{};if(s.keepCurrentUi?document.body.style.overflow="":r(),i>=o.length){r(),localStorage.removeItem("settingsTourStep"),N();return}const g=o[i];if(g.tab==="revenue"&&!c.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),u();return}if(g.tab==="apps"&&!(isStandaloneApp()||c.frontdeskInstalled)&&g.target&&!g.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),u();return}if(g.customModal||O(),g.tab&&g.tab!==c.currentFilter){const h=document.querySelector(`.tab[data-nav-filter="${g.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${g.tab}"]`);if(h&&K(g.tab,h),g.tab==="apps"){const l=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof l=="function"&&l(!0)}d(g,s);return}d(g,s)}function m(p,s){const g=s||{};if(p.customModal==="homescreen"){g.keepCurrentUi&&r(),R();return}if(p.customModal===!0||p.customModal==="bookings"){g.keepCurrentUi&&r(),A();return}if(p.customModal==="availability"){g.keepCurrentUi&&r(),z();return}if(p.customModal==="finale"){g.keepCurrentUi&&r(),N();return}if(p.customModal==="guestAppsStory"){g.keepCurrentUi&&r(),Et();return}if(p.waitForVisible){const y=p.target.split(",").map(E=>E.trim());let f=0;const b=30;O();const v=c.settingsTourActive?60:200,k=()=>{if(f++,p.tab==="apps"){const B=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof B=="function"&&B(!0)}let E=null;for(const B of y)if(E=document.querySelector(B),E)break;if(E&&(p.openAccordion&&$(E,p),p.openAccordion||E.offsetParent!==null)){x(E,p,g);return}f<b?setTimeout(k,v):(i++,localStorage.setItem("settingsTourStep",String(i)),u())};k();return}function h(y){const f=y.target.split(",").map(b=>b.trim());for(const b of f){const v=document.querySelector(b);if(v&&!(!y.openAccordion&&v.offsetParent===null&&getComputedStyle(v).position!=="fixed"))return v}if(y.accordionCard){const b=document.querySelector(y.accordionCard);if(b)return b}return null}function l(y,f){const b=h(y);if(b){f(b);return}const v=y.tab==="settings"&&!y.customModal&&y.target,k=y.tab==="apps"&&!y.customModal&&y.target;if(!v&&!k){i++,localStorage.setItem("settingsTourStep",String(i)),u();return}O();let E=0;if(v&&e(),k){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}const B=c.settingsTourActive?60:250,P=()=>{if(E++,k){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}const T=h(y);if(T){f(T);return}if(e(),k){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}E<48?setTimeout(P,B):(i++,localStorage.setItem("settingsTourStep",String(i)),u())};P()}l(p,y=>x(y,p,g))}function x(p,s,g){const h=g||{};if($(p,s),p=H(p,s),(!p||!p.isConnected)&&(p=_(p,s),p&&(p=H(p,s))),!p){i++,localStorage.setItem("settingsTourStep",String(i)),u();return}const l=p;O(),kt(l,s,{smooth:!!h.keepCurrentUi}).then(()=>{if(s.forcePageTop&&X("auto"),!l.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),u();return}$(l,s),h.keepCurrentUi&&(r({keepOverlay:!0}),O()),s.noHighlight||(l.dataset.tourOrigPosition||(l.dataset.tourOrigPosition=l.style.position||""),l.dataset.tourOrigZIndex||(l.dataset.tourOrigZIndex=l.style.zIndex||""),l.dataset.tourOrigIsolation||(l.dataset.tourOrigIsolation=l.style.isolation||""),l.dataset.tourOrigBoxShadow||(l.dataset.tourOrigBoxShadow=l.style.boxShadow||""),l.dataset.tourOrigOutline||(l.dataset.tourOrigOutline=l.style.outline||""),l.dataset.tourOrigOutlineOffset||(l.dataset.tourOrigOutlineOffset=l.style.outlineOffset||""),l.dataset.tourOrigTransition||(l.dataset.tourOrigTransition=l.style.transition||""),l.dataset.tourOrigBackground||(l.dataset.tourOrigBackground=l.style.background||""),l.dataset.tourOrigBackgroundColor||(l.dataset.tourOrigBackgroundColor=l.style.backgroundColor||""),l.dataset.tourOrigBorderRadius||(l.dataset.tourOrigBorderRadius=l.style.borderRadius||""),l.dataset.tourOrigOpacity||(l.dataset.tourOrigOpacity=l.style.opacity||""),l.style.position=l.style.position||"relative",l.style.zIndex="99999",l.style.isolation="isolate",l.style.transition="box-shadow 0.18s ease, outline 0.18s ease",l.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",l.style.outline="1px solid rgba(255,255,255,0.82)",l.style.outlineOffset="2px",s.spotlightBoxShadow!=null&&(l.style.boxShadow=s.spotlightBoxShadow),s.spotlightOutline!=null&&(l.style.outline=s.spotlightOutline),s.spotlightOutlineOffset!=null&&(l.style.outlineOffset=s.spotlightOutlineOffset),s.spotlightBackground&&(l.style.background=s.spotlightBackground,l.style.backgroundColor=s.spotlightBackground),s.spotlightBorderRadius&&(l.style.borderRadius=s.spotlightBorderRadius),h.keepCurrentUi&&(l.style.opacity="0"),l.setAttribute("data-tour-highlighted","1"),vt(l,s)),document.body.style.overflow="hidden";const y=()=>{const v=L(s.anchorSelector)||l;if(s.freezeTooltip){const P=v&&v.isConnected?v.getBoundingClientRect():null;w(v,s,P&&P.width>=2?P:null,{fadeIn:!!h.keepCurrentUi});return}const k=_(l,s);let E=k?H(k,s):l;$(E,s);const B=s.tooltipAnchor?null:U(s,E);w(E||l,s,B,{fadeIn:!!h.keepCurrentUi})};if(s.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(y));return}const f=(b=0)=>{requestAnimationFrame(()=>{if(s.forcePageTop&&X("auto"),s.tooltipAnchor){y();return}const v=_(l,s);let k=v?H(v,s):l;$(k,s);const E=U(s,k);if(!E&&b<4){requestAnimationFrame(()=>f(b+1));return}w(k||l,s,E,{fadeIn:!!h.keepCurrentUi})})};f(0)})}function w(p,s,g,h){const l=h||{},y=document.getElementById("tourTooltip");y&&y.remove(),M();const f=document.createElement("div");f.id="tourTooltip";const b=Math.min(i+1,o.length),v=Math.max(8,Math.min(100,Math.round(b/o.length*100))),k=ot(s.title||"Quick setup"),E=ot(s.text||""),B=s.primaryLabel||(i<o.length-1?"Next":"Got it"),P=i<=0;f.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",f.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${k}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${b} of ${o.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${v}%;"></div>
          </div>
        </div>
        <div class="tour-title">${k}</div>
        <p class="tour-copy">${E}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${P?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${ot(B)}</button>
        </div>
      </div>`,document.body.appendChild(f);const T=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,I=Jt(s,T);let D=g;if(g&&g.width>=2&&g.height>=2){D=Zt(p,s,f,I)||g,s.noHighlight||vt(p,s);const V=Math.min(380,window.innerWidth-28);f.style.setProperty("--tour-width",`${V}px`),f.style.left="0",f.style.right="auto",f.style.bottom="auto",f.style.width=`${V}px`,f.style.justifyContent="flex-start",f.classList.add("tour-tooltip-floating");const ft=f.querySelector(".tour-panel"),xt=Math.min(ft&&ft.offsetHeight||f.offsetHeight||190,Math.max(140,window.innerHeight-28)),yt=s.tooltipGap??8,Ft=D.left+D.width/2,ht=Math.max(14,Math.min(Ft-V/2,window.innerWidth-V-14)),Dt=I!=="above"?D.bottom+yt:D.top-xt-yt,bt=Math.max(14,Math.min(Dt,window.innerHeight-xt-14));f.style.setProperty("--tour-left",`${ht}px`),f.style.setProperty("--tour-top",`${bt}px`),f.style.left=`${ht}px`,f.style.top=`${bt}px`}f.style.visibility="visible",l.fadeIn&&Qt(f),S()}function S(){const p=document.getElementById("tourNextBtn"),s=document.getElementById("tourSkipBtn"),g=b=>{if(b<0)return;const v=a(o[i],o[b]),k=()=>{i=b,localStorage.setItem("settingsTourStep",String(i)),u({keepCurrentUi:v})};if(!v){r(),k();return}_t().then(k)},h=()=>{g(i+1)},l=()=>{n()},y=()=>{i<=0||g(i-1)};p&&(p.onclick=h),s&&(s.onclick=l);const f=document.getElementById("tourBackBtn");f&&(f.onclick=y),Vt({onNext:h,onBack:y,onSkip:l})}function R(){M(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms();const p=document.createElement("div");p.id="tourBlurOverlay",p.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(p),document.body.style.overflow="hidden";const s=c.activeHotelName||"Your Hotel",g=s.trim().charAt(0).toUpperCase(),h=s.length>10?s.slice(0,10):s,l="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",y="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",f="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",b=`<div style="${l}"><div style="${y}background:rgba(255,255,255,0.22);"></div><div style="${f}"></div></div>`,v=c.activeHotelAppIcon||"",k=v?`<img src="${v}" alt="" style="width:100%;height:100%;object-fit:contain;">`:g,E=v?`${y}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${y}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,B=`<div style="${l}"><div style="${E}">${k}</div><div style="${f}font-size:7.5px;color:#fff;font-weight:700;">${h}</div></div>`,P=[b,b,b,b,B,b,b,b].join(""),T=document.createElement("div");if(T.id="tourTooltip",T.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",T.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${P}
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
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${s}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your hotel from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(T),!document.getElementById("tourModalAnimStyle")){const I=document.createElement("style");I.id="tourModalAnimStyle",I.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(I)}document.getElementById("tourNextBtn").onclick=()=>{r(),i++,localStorage.setItem("settingsTourStep",String(i)),u()},document.getElementById("tourSkipBtn").onclick=()=>{n()}}function z(){M();const p=document.createElement("div");p.id="tourBlurOverlay",p.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(p),document.body.style.overflow="hidden";let s=0;const g=[`<div style="padding:20px 18px 0;">
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
      </div>`],h=document.createElement("div");h.id="tourTooltip",h.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function l(){const f=s>=g.length-1?"Next — Revenue →":"Next →";h.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
          ${g[s]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${g.map((b,v)=>`<div style="width:8px;height:8px;border-radius:50%;background:${v===s?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${f}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{s<g.length-1?(s++,l()):(r(),i++,localStorage.setItem("settingsTourStep",String(i)),u())},document.getElementById("tourSkipBtn").onclick=()=>{n()}}if(document.body.appendChild(h),l(),!document.getElementById("tourModalAnimStyle")){const y=document.createElement("style");y.id="tourModalAnimStyle",y.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(y)}}function A(){M();const p=document.createElement("div");p.id="tourBlurOverlay",p.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(p),document.body.style.overflow="hidden";const s=document.createElement("div");if(s.id="tourTooltip",s.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",s.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
        <div style="padding:20px 18px 0;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#1a1a2e;">When a guest books, it looks like this</div>
          </div>
        </div>
        <!-- Mock booking card -->
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:2px solid #D8E4DC;border-radius:16px;overflow:hidden;">
            <div style="height:5px;background:#2E7D5B;"></div>
            <div style="padding:16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <div>
                  <div style="font-size:16px;font-weight:700;color:#1a1a2e;">Sarah Johnson</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">2 minutes ago</div>
                </div>
                <div style="font-size:18px;font-weight:700;color:#2E7D5B;">$284.00</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🛏 King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🌙 3 nights</span>
                <span style="background:#eff6ff;color:#1e40af;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">💳 Collect at check-in</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px;background:#f8faf9;border-radius:10px;margin-bottom:14px;">
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Check-in</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">Jun 15</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Check-out</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">Jun 18</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Guests</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">2</div>
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <div style="font-size:12px;color:#6b7280;">(555) 867-5309</div>
                <div style="font-size:12px;color:#6b7280;">sarah.j@email.com</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="padding:10px;border-radius:10px;background:#2E7D5B;color:white;font-size:13px;font-weight:700;text-align:center;">📞 Call Now</div>
                <div style="padding:10px;border-radius:10px;background:#f3f4f6;color:#374151;font-size:13px;font-weight:700;text-align:center;">📝 Add Note</div>
              </div>
            </div>
          </div>
        </div>
        <div style="padding:0 18px 20px;text-align:center;">
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Next — Availability →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(s),!document.getElementById("tourModalAnimStyle")){const g=document.createElement("style");g.id="tourModalAnimStyle",g.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(g)}document.getElementById("tourNextBtn").onclick=()=>{r(),i++,localStorage.setItem("settingsTourStep",String(i)),u()},document.getElementById("tourSkipBtn").onclick=()=>{n()}}u()}async function Bt(){const t=document.getElementById("settingsList");if(t){t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const e=await api("GET","/api/crm/verify"),i="https://"+(e?.domain||c.activeHotelId+".mktel.co"),r="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),n=await api("GET","/api/crm/rooms");let a={nightly:69,weekly:299,monthly:999};n?.rates&&(a=n.rates);const d=n?.rooms||[];let u="";e?.subscribed||(u+=goLiveInlineCardHtml()),d.length?d.forEach(m=>{const x=m.images&&m.images.length>0;u+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${x?`<img src="${m.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${x?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${m.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${m.name}</div>
              ${m.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${m.description}</div>`:""}
            </div>
          </div>
        `}):u+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${i}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${i}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${r}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${a.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${a.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${a.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,e?.subscribed&&(u+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `,t.innerHTML=u}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function Xt(){const t=document.getElementById("settings-booking-url");t&&navigator.clipboard.writeText(t.value).then(()=>{localStorage.setItem("linkCopied","1"),j(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function te(){localStorage.setItem("settingsTourDone","1");const t=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",t);let e=0;const o=setInterval(()=>{e++;const i=document.getElementById("edit-rate-nightly");if(i||e>20){if(clearInterval(o),!i)return;const r=i.closest(".accordion-body");if(r&&r.style.display==="none"){r.style.display="block";const n=r.previousElementSibling?.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const n=document.getElementById("checklistPointer");n&&n.remove();const a=i.getBoundingClientRect(),d=document.createElement("div");d.id="checklistPointer",d.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${a.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,d.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(d),setTimeout(()=>{const u=document.getElementById("checklistPointer");u&&u.remove()},6e3)},1e3)},100)}},200)}function ee(){const e="https://"+(c.activeHotelDomain||c.activeHotelId+".mktel.co");navigator.clipboard.writeText(e).then(()=>{localStorage.setItem("linkCopied","1"),j(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function oe(t,e){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const r=setInterval(()=>{i++;const n=document.querySelector(t);if(n||i>20){if(clearInterval(r),!n)return;n.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const d=n.getBoundingClientRect(),u=document.createElement("div");u.id="checklistPointer",u.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${d.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,u.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${e}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(u),setTimeout(()=>{const m=document.getElementById("checklistPointer");m&&m.remove()},6e3)},1e3)}},200)}function dt(){const t=String(c.token||localStorage.getItem("crmToken")||"").trim();return t&&(c.token=t),t}async function lt(t,e){const o=dt();if(!o)throw new Error("Not logged in");const i=await Ht(e),r=new FormData;r.append("image",i,i.name||"room.webp");const n=new URLSearchParams;c.activeHotelId&&n.set("hotelId",c.activeHotelId),n.set("token",o);const a=await fetch(`/api/crm/rooms/${t}/images?${n}`,{method:"POST",headers:{"x-crm-token":o},body:r}),d=await a.json().catch(()=>({}));if(!a.ok||!d.success)throw new Error(d.message||d.error||`Upload failed (${a.status})`);return d}async function ie(t,e){const o=t.target.files[0];if(o)try{await lt(e,o),toast("Photo uploaded!","success"),Bt()}catch(i){toast(i.message||"Upload failed","error")}}async function ne(){const t=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function re(){const t=document.getElementById("settings-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");c.token=t,c.isMasterPin=!1;try{localStorage.setItem("crmToken",c.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(e){toast(e.message||"Failed to change PIN","error")}}async function ae(){const t=document.getElementById("settings-support-msg")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function se(){const t=c.activeHotelDomain||c.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(c.activeHotelId)+"&preview=1":"https://"+t+"?preview=1";window.open(o,"_blank")}function Tt(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&c.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(c.activeHotelId);const e=c.activeHotelDomain||"";return e?"https://"+e+"/":""}function de(){const t=Tt();if(!t){toast("Your booking domain is still setting up.","info");return}window.open(t,"_blank")}function le(){const t=document.getElementById("previewSiteBar");t&&(t.style.display=c.currentFilter==="settings"?"block":"none")}function j(){if(localStorage.getItem("settingsTourDone"))return;const t=parseInt(localStorage.getItem("settingsTourStep")||"0"),e=c.editRooms.some(a=>a.images&&a.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");t===2&&e&&localStorage.setItem("settingsTourStep","3"),t===3&&i&&localStorage.setItem("settingsTourStep","4"),t===4&&o&&localStorage.setItem("settingsTourStep","5");const r=document.getElementById("tourTooltip");r&&r.remove();const n=document.getElementById("tourBlurOverlay");n&&n.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(a=>{a.style.position=a.dataset.tourOrigPosition||"",a.style.zIndex="",a.style.isolation="",a.style.boxShadow="",a.style.outline=a.dataset.tourOrigOutline||"",a.style.outlineOffset=a.dataset.tourOrigOutlineOffset||"",a.removeAttribute("data-tour-highlighted"),delete a.dataset.tourOrigPosition,delete a.dataset.tourOrigOutline,delete a.dataset.tourOrigOutlineOffset}),document.body.style.overflow=""}function ce(){let t=0;const e={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let r=document.getElementById("onboardingOverlay");if(r&&r.remove(),t>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",e).catch(()=>{})}catch{}It();return}const n=o[t],a=document.createElement("div");a.id="onboardingOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",n.type==="text"?(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${n.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(a),document.getElementById("onboardingTextSubmit").onclick=()=>{const d=document.getElementById("onboardingTextInput").value.trim();d&&(e[n.key]=d,t++,i())}):(a.innerHTML=`
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
      `,document.body.appendChild(a),a.querySelectorAll(".onboarding-opt").forEach(d=>{d.addEventListener("click",()=>{e[n.key]=d.dataset.value,d.style.background="#1a1a2e",d.style.color="white",d.style.fontWeight="600",setTimeout(()=>{t++,i()},250)})}))}i()}function pe(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const t=new URL(window.location.href);t.searchParams.set("welcome","1"),t.searchParams.delete("tab");const e=t.pathname+t.search+t.hash;if(e===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(e)}function It(){const t=document.createElement("div");t.id="welcomeModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function e(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const r=new URL(window.location);r.searchParams.delete("welcome"),window.history.replaceState({},"",r)}catch{}const i=typeof nt=="function"?nt:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),t.remove()}function o(){t.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏨</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=e}document.body.appendChild(t),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function tt(){const t=document.getElementById("postActivationTourTooltip");t&&t.remove();const e=document.getElementById("postActivationTourOverlay");e&&e.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function Q(){tt(),localStorage.setItem("postActivationTourDone","1");const t=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",t)}catch{}}function ct(){if(localStorage.getItem("postActivationTourDone")){Q();return}tt();const t=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. You'll get a push alert for each new one."},{tab:"apps",navFilter:"apps",text:"<strong>Guest App</strong> — put your hotel on guests&apos; home screens and send install reminders."}];let e=0;function o(){if(tt(),e>=t.length){Q();return}const i=t[e],r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&setFilter(i.tab,r);const n=document.createElement("div");n.id="postActivationTourOverlay",n.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(n),document.body.style.overflow="hidden",setTimeout(()=>{const a=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);a&&(a.setAttribute("data-post-activation-highlight","1"),a.style.position="relative",a.style.zIndex="100003",a.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",a.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const d=a?a.getBoundingClientRect():{left:24,bottom:80,width:200},u=document.createElement("div");u.id="postActivationTourTooltip";const m=Math.min(300,window.innerWidth-32),x=Math.max(16,Math.min(d.left+d.width/2-m/2,window.innerWidth-m-16)),w=Math.min(d.bottom+14,window.innerHeight-180);u.style.cssText=`position:fixed;z-index:100004;left:${x}px;top:${w}px;max-width:${m}px;width:${m}px;`;const S=e>=t.length-1;u.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${e+1} / ${t.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${S?"Got it — open Guest App":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(u),document.getElementById("postActivationTourNext").onclick=()=>{e+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{Q()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=ct;function ue(){if(document.getElementById("activatedModalOverlay"))return;const t=c.activeHotelDomain||(c.activeHotelId?c.activeHotelId+".mktel.co":""),e="Bookings and Guest App",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
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
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>New bookings appear in Bookings</strong> — you'll get a notification for each one.</span>
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
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),ct()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function pt(){if(isEditPageDomReady())return;if(c.editRoomsLoadPromise)return c.editRoomsLoadPromise;const t=document.getElementById("editRoomsList");if(t){c.editRoomsLoadPromise=(async()=>{t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[e,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!e.rooms)throw new Error("No data");c.editRooms=e.rooms;const i=o?.hotelName||"";i&&(c.activeHotelName=i),o&&(c.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const r=o?.hotelSubtitle||"",n=o?.hotelAddress||"",a=o?.hotelPhone||"",d=o?.appIconUrl||"";c.activeHotelAppIcon=d,updateFrontdeskManifestLink();let u={nightly:69,weekly:299,monthly:999,taxRate:.1};e.rates&&(u=e.rates);const x="https://"+(o?.domain||c.activeHotelId+".mktel.co"),w="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(x);let S=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${n}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-name" placeholder="Your Hotel Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${r}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${a}" id="edit-hotel-phone" placeholder="(555) 123-4567" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
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
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${x}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${x.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
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
              <input type="number" value="${u.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${u.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${u.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
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
            <input type="text" id="edit-new-pin" value="${c.isMasterPin?"":c.token}" placeholder="${c.isMasterPin?"Enter a unique hotel PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
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
    `;t.innerHTML=S,G(),typeof lucide<"u"&&lucide.createIcons()}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await c.editRoomsLoadPromise}finally{c.editRoomsLoadPromise=null}}}function ut(){G()}function G(){const t=document.getElementById("editRoomsCards");if(t){if(!c.editRooms.length){t.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}t.innerHTML=c.editRooms.map((e,o)=>{const i=(e.amenities||"").split("•").map(a=>a.trim()).filter(Boolean),r=(e.images||[]).filter(a=>a&&a.url),n=jsStr(e.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${e.id}" ${o===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${r.length?`
          <img class="room-edit-main-img" src="${esc(r[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${r.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${n}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${n}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${r.length}</div>
            <div class="room-edit-image-dots">
              ${r.map((a,d)=>`<button type="button" class="room-edit-image-dot ${d===0?"active":""}" aria-label="Show photo ${d+1}" ${d===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${n}', ${d})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${n}')">
        </label>
      </div>
      ${r.length>1?'<div class="room-edit-thumbs">'+r.map((a,d)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${d===0?"active":""}" aria-label="Show photo ${d+1}" ${d===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${n}', ${d})"><img src="${esc(a.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${n}','${jsStr(a.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
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
            ${i.map(a=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${At(a)} ${a} <button onclick="removeAmenity('${e.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function zt(t){const e=c.editRooms.find(o=>String(o.id)===String(t));return(e&&e.images||[]).filter(o=>o&&o.url)}function Pt(t,e){const o=zt(t);if(!o.length)return;const i=document.getElementById("edit-card-"+t);if(!i)return;const r=o.length,n=((Number(e)||0)%r+r)%r,a=i.querySelector(".room-edit-main-img");a&&(a.src=o[n].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(n));const d=i.querySelector(".room-edit-photo-count");d&&(d.textContent=n+1+" / "+r),i.querySelectorAll(".room-edit-image-dot").forEach((u,m)=>{u.classList.toggle("active",m===n),m===n?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((u,m)=>{u.classList.toggle("active",m===n),m===n?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")})}function ge(t,e){const i=document.getElementById("edit-card-"+t)?.querySelector(".room-edit-photo"),r=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;Pt(t,r+e)}function At(t){const e=t.toLowerCase();return e.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':e.includes("tv")||e.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':e.includes("fridge")||e.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':e.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':e.includes("housekeeping")||e.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':e.includes("bath")||e.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':e.includes("work")||e.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':e.includes("pet")||e.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':e.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':e.includes("kitchen")||e.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const Ct=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let gt=null;function Rt(t){gt=t;const o=(c.editRooms.find(n=>n.id===t)?.amenities||"").split("•").map(n=>n.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",et),i=document.getElementById("amenityPickerModal"));const r=document.getElementById("amenityPickerGrid");r.innerHTML=Ct.map(n=>{const a=o.some(d=>d.includes(n.key));return`<button onclick="toggleAmenityPreset(this,'${n.key}')" data-key="${n.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${a?"#2E7D5B":"#e5e7eb"};background:${a?"#E8F5EE":"white"};color:${a?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${n.icon}" style="width:14px;height:14px;"></i> ${n.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function me(t,e){const o=t.style.borderColor==="rgb(46, 125, 91)";t.style.borderColor=o?"#e5e7eb":"#2E7D5B",t.style.background=o?"white":"#E8F5EE",t.style.color=o?"#1a1a2e":"#2E7D5B"}function et(){document.getElementById("amenityPickerModal").style.display="none",gt=null}function fe(){const t=c.editRooms.find(r=>r.id===gt);if(!t){et();return}const e=document.getElementById("amenityPickerGrid"),o=[];e.querySelectorAll("button").forEach(r=>{if(r.style.background==="rgb(232, 245, 238)"){const n=Ct.find(a=>a.key===r.dataset.key);n&&o.push(n.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),t.amenities=o.join(" • "),et(),ut(),typeof lucide<"u"&&lucide.createIcons()}function xe(t){Rt(t)}function ye(t,e){const o=c.editRooms.find(r=>r.id===t);if(!o)return;const i=(o.amenities||"").split("•").map(r=>r.trim()).filter(Boolean);o.amenities=i.filter(r=>r!==e).join(" • "),ut(),typeof lucide<"u"&&lucide.createIcons()}async function he(){const t=document.getElementById("edit-hotel-name")?.value.trim(),e=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),r=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:t,subtitle:e,address:o,phone:i,cancellationPolicy:r}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function be(){const t=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),localStorage.setItem("ratesChanged","1"),c.launchStatus=null,j(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function ve(){const t=document.getElementById("edit-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");c.token=t,c.isMasterPin=!1;try{localStorage.setItem("crmToken",c.token)}catch{}toast("PIN updated!","success")}catch(e){toast(e.message||"Failed to change PIN","error")}}function we(t){navigator.clipboard.writeText(t).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function ke(t){const e=t.nextElementSibling,o=t.querySelector(".accordion-arrow");e.style.display==="none"?(e.style.display="block",o&&(o.style.transform="rotate(90deg)")):(e.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let W=!1;function Ot(){if(document.getElementById("goLiveOverlay"))return;const t=document.createElement("div");t.id="goLiveOverlay",t.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",t.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(t)}function rt(){const t=document.getElementById("goLiveOverlay");t&&t.remove()}async function Ee(){if(!W){W=!0,Ot();try{const t=await api("POST","/api/crm/go-live");if(t.success&&t.url){window.location.href=t.url;return}rt(),W=!1,toast(t.message||"Failed to start checkout","error")}catch{rt(),W=!1,toast("Failed to start checkout. Try again.","error")}}}async function Se(){try{const t=await api("GET","/api/crm/billing-portal");t.success&&t.url?window.location.href=t.url:toast(t.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function Be(){const t=document.getElementById("supportMessage")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function Te(t){const e=c.editRooms.find(d=>d.id===t);if(!e){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+t)?.value.trim(),i=document.getElementById("edit-desc-"+t)?.value.trim(),r=parseInt(document.getElementById("edit-occ-"+t)?.value)||4,n=parseInt(document.getElementById("edit-units-"+t)?.value)||1,a={id:t,name:o||e.name,description:i||"",amenities:e.amenities||"",maxOccupancy:r,totalUnits:n};try{const d=await api("POST","/api/crm/rooms",a);if(d&&d.success===!1){toast(d.message||"Failed to save","error");return}e.name=a.name,e.description=a.description,e.maxOccupancy=r,e.totalUnits=n,toast("Room saved!","success")}catch(d){toast("Failed to save: "+(d.message||""),"error")}}async function Ie(t,e){const o=Array.from(t.target.files);if(!o.length)return;const r=document.getElementById("edit-card-"+e)?.querySelector("div:first-child");r&&(r.style.position="relative",r.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+e+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+e+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let n=0,a="";for(const u of o){try{const x=await lt(e,u);if(x.image){const w=c.editRooms.find(S=>S.id===e);w&&(w.images||(w.images=[]),w.images.push(x.image),w.imageUrl||(w.imageUrl=x.image.url)),n++}}catch(x){a=x.message||"Upload failed"}const m=document.getElementById("upload-progress-"+e);m&&(m.textContent=n+" / "+o.length)}const d=document.getElementById("upload-spinner-"+e);d&&d.remove(),G(),n>0&&(c.launchStatus=null),j(),n>0?toast(n+" photo"+(n!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(a||"Upload failed","error")}function Mt(t,e=512){return new Promise((o,i)=>{const r=new Image,n=URL.createObjectURL(t);r.onload=()=>{try{const a=Math.min(r.naturalWidth,r.naturalHeight),d=(r.naturalWidth-a)/2,u=(r.naturalHeight-a)/2,m=document.createElement("canvas");m.width=e,m.height=e;const x=m.getContext("2d");x.imageSmoothingQuality="high",x.drawImage(r,d,u,a,a,0,0,e,e),URL.revokeObjectURL(n),m.toBlob(w=>w?o(w):i(new Error("crop failed")),"image/png",.92)}catch(a){URL.revokeObjectURL(n),i(a)}},r.onerror=()=>{URL.revokeObjectURL(n),i(new Error("load failed"))},r.src=n})}function $t(){const t=document.getElementById("appsAppIconPreview");t&&(t.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function mt(t){const e=document.getElementById("appsAppIconPreview");e&&(e.style.background="#fff",e.style.border="1px solid var(--border)",e.style.padding="0",e.innerHTML='<img src="'+t+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function at(){const t=document.getElementById("appsAppIconPreview");if(!t)return;if(c.activeHotelAppIcon){mt(c.activeHotelAppIcon);return}const e=(c.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨";t.style.background="transparent",t.style.border="none",t.style.padding="0",t.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+e+"</span>"}async function ze(t){const e=t.files&&t.files[0];if(!e)return;$t();const o=new FormData;try{const i=await Mt(e,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",e)}try{const i=dt(),r=new URLSearchParams;c.activeHotelId&&r.set("hotelId",c.activeHotelId),i&&r.set("token",i);const a=await(await fetch(`/api/crm/hotel-app-icon?${r}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(a.success&&a.appIconUrl){c.activeHotelAppIcon=a.appIconUrl,mt(a.appIconUrl);const d=document.getElementById("appsView");d&&(d.dataset.appsKey=(c.activeHotelId||"")+"|"+a.appIconUrl+"|"+(c.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(a.message||"Failed to upload icon","error"),at()}catch{toast("Failed to upload icon","error"),at()}t.value=""}async function Pe(t,e){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${t}/images/${e}`);const o=c.editRooms.find(i=>i.id===t);o&&o.images&&(o.images=o.images.filter(i=>i.id!==e),o.imageUrl=o.images[0]?.url||null),G(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function Ae(t){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${t}`),toast("Room deleted","success"),pt()}catch{toast("Failed to delete","error")}}function Ce(){const t=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(t.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function Re(){const t=document.getElementById("editNewRoomName").value.trim();t&&api("POST","/api/crm/rooms",{name:t,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),pt()}).catch(()=>toast("Failed to add","error"))}const Lt={addAmenityPrompt:xe,advanceTourIfNeeded:j,changePin:ve,checklistGoTo:oe,checklistGoToRates:te,cleanupPostActivationTourUi:tt,cleanupSettingsTourUi:C,closeAmenityPicker:et,confirmAmenityPicker:fe,confirmEditAddRoom:Re,copyBookingLink:we,copyBookingLinkFromChecklist:ee,deleteEditImage:Pe,deleteEditRoom:Ae,ensureTourBlurOverlay:O,finishPostActivationTour:Q,getAmenityIcon:At,getCrmAuthToken:dt,getEditRoomImages:zt,goLive:Ee,guestBookingEngineUrl:Tt,handoffToGuestAppsTour:Et,hideGoLiveOverlay:rt,loadEditRooms:pt,loadSettings:Bt,openAmenityPicker:Rt,openBillingPortal:Se,openEditAddRoom:Ce,openGuestBookingEngine:de,openPreviewSite:se,openTourAccordion:$,postRoomImageUpload:lt,queryTourSelector:L,removeAmenity:ye,renderEditRooms:ut,renderEditRoomsCards:G,replayWalkthrough:pe,resolveLiveTourElement:_,resolveTourHighlightEl:H,restoreAppIconPreview:at,saveEditRoom:Te,saveHotelInfo:he,saveRates:be,scrollTourTargetIntoView:kt,sendSupportMessage:Be,setAppIconPreviewImage:mt,setAppIconPreviewLoading:$t,settingsChangePin:re,settingsCopyLink:Xt,settingsSaveRates:ne,settingsSendSupport:ae,settingsUploadPhoto:ie,showActivatedModal:ue,showEditRoomPhoto:Pt,showFinaleMockModal:N,showGoLiveOverlay:Ot,showOnboardingQuestions:ce,showTestDriveModal:St,showWelcomeModal:It,squareCropImage:Mt,startPostActivationTabTour:ct,startSettingsTour:nt,stepEditRoomPhoto:ge,toggleAmenityPreset:me,toggleSection:ke,tourAnchorRect:U,tourElementRect:Z,updatePreviewSiteBar:le,uploadAppIcon:ze,uploadEditImages:Ie};function Oe(){Nt(Lt)}const Fe=Object.freeze(Object.defineProperty({__proto__:null,default:Lt,install:Oe},Symbol.toStringTag,{value:"Module"}));export{$e as a,Fe as b,c,Nt as e,Le as s};
