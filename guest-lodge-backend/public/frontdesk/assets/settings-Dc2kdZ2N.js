const p={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let U=null;function Ae(){return typeof lucide<"u"?Promise.resolve():U||(U=new Promise((t,e)=>{const i=document.createElement("script");i.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",i.async=!0,i.onload=()=>t(),i.onerror=()=>e(new Error("lucide load failed")),document.head.appendChild(i)}),U)}async function Lt(t){if(!t||!t.type.startsWith("image/")||t.type==="image/webp"&&t.size<4e5)return t;try{const e=await createImageBitmap(t),i=1600,o=1200;let n=e.width,r=e.height;const a=Math.min(1,i/n,o/r);n=Math.round(n*a),r=Math.round(r*a);const s=document.createElement("canvas");s.width=n,s.height=r,s.getContext("2d").drawImage(e,0,0,n,r),e.close();const u=await new Promise((f,w)=>{s.toBlob(k=>k?f(k):w(new Error("encode failed")),"image/webp",.82)}),g=(t.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([u],g+".webp",{type:"image/webp"})}catch{return t}}function Ce(){const t=()=>{p.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(t,{timeout:2500}):setTimeout(t,600)}function Ft(t){Object.assign(window,t)}function $(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function Y(...t){return $("setFilter")?.(...t)}function Dt(...t){return $("toast")?.(...t)}function _(...t){return $("updateGoLiveBanner")?.(...t)}function Ht(...t){return $("seedTourRevenueShell")?.(...t)}function Nt(...t){return $("finishTourHydration")?.(...t)}function qt(...t){return $("goLive")?.(...t)}let D=null;function A(){if(document.getElementById("frontdeskTourPolishStyle"))return;const t=document.createElement("style");t.id="frontdeskTourPolishStyle",t.textContent=`
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
  `,document.head.appendChild(t)}function yt(){D&&(document.removeEventListener("keydown",D),D=null)}function jt(t){yt(),D=e=>{if(e.defaultPrevented)return;const i=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";i==="input"||i==="textarea"||i==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",D)}function X(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function O(t){A();const e=t||{};let i=document.getElementById("tourBlurOverlay");return i||(i=document.createElement("div"),i.id="tourBlurOverlay",i.style.cssText=`position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.22);pointer-events:${e.blockPointer?"auto":"none"};`,document.body.appendChild(i),e.lockScroll&&(document.body.style.overflow="hidden"),i)}function Ut(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"))}function Gt(t,e){const i=t.querySelectorAll("input, textarea, select"),o=e.querySelectorAll("input, textarea, select");i.forEach((n,r)=>{const a=o[r];a&&(n.type==="checkbox"||n.type==="radio"?a.checked=n.checked:a.value=n.value)})}function ht(t,e){const i=getComputedStyle(t);for(const r of i)e.style.setProperty(r,i.getPropertyValue(r),i.getPropertyPriority(r));const o=t.children,n=e.children;for(let r=0;r<o.length;r+=1)n[r]&&ht(o[r],n[r])}function xt(t,e){if(!t||!t.isConnected)return null;document.querySelectorAll("[data-tour-spotlight-clone]").forEach(n=>n.remove());const i=t.getBoundingClientRect();if(i.width<2||i.height<2)return null;const o=t.cloneNode(!0);return Ut(o),ht(t,o),Gt(t,o),o.setAttribute("data-tour-spotlight-clone","1"),o.setAttribute("aria-hidden","true"),o.style.position="fixed",o.style.left=`${i.left}px`,o.style.top=`${i.top}px`,o.style.width=`${i.width}px`,o.style.height=`${i.height}px`,o.style.margin="0",o.style.maxWidth="none",o.style.zIndex="99999",o.style.pointerEvents="none",o.style.transform="none",o.style.boxShadow=e?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",o.style.outline=e?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",o.style.outlineOffset=e?.spotlightOutlineOffset??"2px",e?.spotlightBackground&&(o.style.background=e.spotlightBackground,o.style.backgroundColor=e.spotlightBackground),e?.spotlightBorderRadius&&(o.style.borderRadius=e.spotlightBorderRadius),document.body.appendChild(o),o}function H(){yt();const t=document.getElementById("tourTooltip");t&&t.remove();const e=document.getElementById("tourBlurOverlay");e&&e.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(o=>o.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(o=>{o.style.position=o.dataset.tourOrigPosition||"",o.style.zIndex=o.dataset.tourOrigZIndex||"",o.style.isolation=o.dataset.tourOrigIsolation||"",o.style.boxShadow=o.dataset.tourOrigBoxShadow||"",o.style.outline=o.dataset.tourOrigOutline||"",o.style.outlineOffset=o.dataset.tourOrigOutlineOffset||"",o.style.transition=o.dataset.tourOrigTransition||"",o.style.background=o.dataset.tourOrigBackground||"",o.style.backgroundColor=o.dataset.tourOrigBackgroundColor||"",o.style.borderRadius=o.dataset.tourOrigBorderRadius||"",o.removeAttribute("data-tour-highlighted"),delete o.dataset.tourOrigPosition,delete o.dataset.tourOrigZIndex,delete o.dataset.tourOrigIsolation,delete o.dataset.tourOrigBoxShadow,delete o.dataset.tourOrigOutline,delete o.dataset.tourOrigOutlineOffset,delete o.dataset.tourOrigTransition,delete o.dataset.tourOrigBackground,delete o.dataset.tourOrigBackgroundColor,delete o.dataset.tourOrigBorderRadius});const i=document.getElementById("goLiveBanner");i&&i.dataset.tourHidden&&(delete i.dataset.tourHidden,typeof _=="function"&&_()),document.body.style.overflow=""}function R(t,e){if(!e.openAccordion)return;const i=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(!i)return;const o=i.querySelector(".accordion-body");if(!o)return;if(o.style.display==="none"||getComputedStyle(o).display==="none"){o.style.display="block";const r=i.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}}function M(t){if(!t)return null;for(const e of String(t).split(",").map(i=>i.trim()).filter(Boolean)){const i=document.querySelector(e);if(i&&i.isConnected)return i}return null}function L(t,e){if(e.highlightSelector){const i=M(e.highlightSelector);if(i)return i}if(e.highlightCard){const i=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(i)return i}return e.targetParent&&(t.closest(".booking-card")||t.closest(".accordion-body"))||t}function V(t,e){if(!e)return t;const i=String(e.target||"").split(",").map(o=>o.trim()).filter(Boolean);for(const o of i){const n=document.querySelector(o);if(n&&n.isConnected)return n}if(e.accordionCard){const o=document.querySelector(e.accordionCard);if(o&&o.isConnected)return o}return t&&t.isConnected?t:null}function Q(t,e){if(!t||!t.isConnected)return null;const i=t.getBoundingClientRect();return i.width<2||i.height<2||!e&&(i.bottom<8||i.top>window.innerHeight-8)?null:i}function N(t,e){const i=M(t.anchorSelector);if(i){const o=Q(i,!0);if(o)return o}return Q(e,!0)}function Vt(t){let e=t&&t.parentElement;for(;e&&e!==document.body&&e!==document.documentElement;){const i=getComputedStyle(e),o=i.overflowY||i.overflow;if(/(auto|scroll)/.test(o)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement}return null}function tt(t,e){if(!e)return;const i=Vt(t);if(i){i.scrollTop+=e;return}window.scrollBy({top:e,left:0,behavior:"auto"})}function Wt(t,e){return e&&t.mobileTooltipPosition||t.tooltipPosition||"below"}function Yt(t,e,i,o){if(!t||!t.isConnected||!i)return N(e,t);const n=i.querySelector(".tour-panel"),r=Math.min(n&&n.offsetHeight||i.offsetHeight||190,Math.max(140,window.innerHeight-28)),a=e.tooltipGap??8,s=e.fitPadTop??e.scrollPadTop??72,u=window.innerHeight-(e.fitPadBottom??14),g=()=>N(e,t)||Q(t,!0);let f=g();if(!f)return null;for(let w=0;w<3;w+=1){const k=Math.max(120,u-s),C=f.height+a+r<=k;let E=0;if(o==="above"){const c=f.top-a-r-s;c<0&&(E=c),C&&f.bottom>u&&(E=f.bottom-u)}else{const c=f.bottom+a+r-u;c>0&&(E=c),C&&f.top<s&&(E=f.top-s)}if(Math.abs(E)<1)break;if(tt(t,E),f=g(),!f)return null}return f}function K(t){const e=t||"auto";try{window.scrollTo({top:0,left:0,behavior:e})}catch{}const i=document.scrollingElement||document.documentElement;i&&(i.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(o=>{const n=document.querySelector(o);n&&(n.scrollTop=0)})}function bt(t,e){const i=e.scrollTarget||e.accordionCard,o=(i?M(i):null)||t;if(!o&&!e.scrollToTop)return Promise.resolve();const n=e.scrollBlock||"center",r=window.matchMedia("(prefers-reduced-motion: reduce)").matches,a=p.settingsTourActive||r?"auto":"smooth";return new Promise(s=>{const u=()=>{const E=e.scrollPadTop??80,c=e.scrollPadBottom??220,l=M(e.anchorSelector)||(o&&o.isConnected?o:null)||(t&&t.isConnected?t:null);if(!l){s();return}let d=l.getBoundingClientRect();d.top<E&&(tt(l,d.top-E),d=l.getBoundingClientRect()),d.bottom>window.innerHeight-c&&tt(l,d.bottom-window.innerHeight+c),requestAnimationFrame(()=>requestAnimationFrame(s))},g=()=>{o&&o.scrollIntoView({behavior:e.scrollToTop?"auto":a,block:n,inline:"nearest"}),u()};if(e.scrollToTop){if(K(a),e.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(()=>{e.forcePageTop&&K("auto"),s()}));return}if(a==="auto"){g();return}let E=!1;const c=()=>{E||(E=!0,window.removeEventListener("scrollend",l),clearTimeout(d),g())},l=()=>c();"onscrollend"in window&&window.addEventListener("scrollend",l,{once:!0});const d=setTimeout(c,520);return}if(!o){s();return}if(o.scrollIntoView({behavior:a,block:n,inline:"nearest"}),a==="auto"){u();return}let f=!1;const w=()=>{f||(f=!0,window.removeEventListener("scrollend",k),clearTimeout(C),u())},k=()=>w();"onscrollend"in window&&window.addEventListener("scrollend",k,{once:!0});const C=setTimeout(w,620)})}function vt(){H(),localStorage.setItem("settingsTourStep","handoff");const t=()=>{const i=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');i&&Y("apps",i);const o=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof o=="function"&&o(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},e=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof e=="function"?e().then(t).catch(t):t()}function F(){H(),A(),p.settingsTourActive=!1,_();const t=O({blockPointer:!0,lockScroll:!0});t.style.background="rgba(17,24,39,0.42)";const e=document.createElement("div");if(e.id="tourTooltip",e.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),!document.getElementById("tourModalAnimStyle")){const i=document.createElement("style");i.id="tourModalAnimStyle",i.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(i)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const o="https://"+(p.activeHotelDomain||p.activeHotelId+".mktel.co");navigator.clipboard.writeText(o).catch(()=>{}),H(),p.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),Dt("Booking link copied!","success"),Nt(),wt()}}function wt(t){A();const e=document.createElement("div");e.id="testDriveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const i=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{i(),qt()},document.getElementById("activateLaterBtn").onclick=()=>{i();const o=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');o&&Y("bookings",o)}}function et(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),F();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),p.settingsTourActive=!0,_(),Ht();const t=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');t&&Y("settings",t);function e(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!p.editRoomsLoadPromise)return;const d=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;d&&d()}e();const i=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the hotel name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",scrollPadTop:80,scrollPadBottom:360,tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8,spotlightBackground:"#fff",spotlightBorderRadius:"0 0 20px 20px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0",fitPadTop:108},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:80,scrollPadBottom:220},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:220,tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,scrollBlock:"start",scrollPadTop:92,scrollPadBottom:220},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let o=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(o)||o<0||o>=i.length)&&(o=0,localStorage.removeItem("settingsTourStep"));function n(){H()}function r(){n(),localStorage.removeItem("settingsTourStep"),F()}function a(c){if(c.customModal){u(c);return}requestAnimationFrame(()=>u(c))}function s(){if(n(),o>=i.length){localStorage.removeItem("settingsTourStep"),F();return}const c=i[o];if(c.tab==="revenue"&&!p.revenueEnabled){o++,localStorage.setItem("settingsTourStep",String(o)),s();return}if(c.tab==="apps"&&!(isStandaloneApp()||p.frontdeskInstalled)&&c.target&&!c.target.includes("tour-fd-install")){o++,localStorage.setItem("settingsTourStep",String(o)),s();return}if(c.customModal||O(),c.tab&&c.tab!==p.currentFilter){const l=document.querySelector(`.tab[data-nav-filter="${c.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${c.tab}"]`);if(l&&Y(c.tab,l),c.tab==="apps"){const d=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof d=="function"&&d(!0)}a(c);return}a(c)}function u(c){if(c.customModal==="homescreen"){k();return}if(c.customModal===!0||c.customModal==="bookings"){E();return}if(c.customModal==="availability"){C();return}if(c.customModal==="finale"){F();return}if(c.customModal==="guestAppsStory"){vt();return}if(c.waitForVisible){const x=c.target.split(",").map(b=>b.trim());let m=0;const y=30;O();const v=p.settingsTourActive?60:200,h=()=>{if(m++,c.tab==="apps"){const S=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof S=="function"&&S(!0)}let b=null;for(const S of x)if(b=document.querySelector(S),b)break;if(b&&(c.openAccordion&&R(b,c),c.openAccordion||b.offsetParent!==null)){g(b,c);return}m<y?setTimeout(h,v):(o++,localStorage.setItem("settingsTourStep",String(o)),s())};h();return}function l(x){const m=x.target.split(",").map(y=>y.trim());for(const y of m){const v=document.querySelector(y);if(v&&!(!x.openAccordion&&v.offsetParent===null&&getComputedStyle(v).position!=="fixed"))return v}if(x.accordionCard){const y=document.querySelector(x.accordionCard);if(y)return y}return null}function d(x,m){const y=l(x);if(y){m(y);return}const v=x.tab==="settings"&&!x.customModal&&x.target,h=x.tab==="apps"&&!x.customModal&&x.target;if(!v&&!h){o++,localStorage.setItem("settingsTourStep",String(o)),s();return}O();let b=0;if(v&&e(),h){const z=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof z=="function"&&z(!0)}const S=p.settingsTourActive?60:250,B=()=>{if(b++,h){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}const z=l(x);if(z){m(z);return}if(e(),h){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}b<48?setTimeout(B,S):(o++,localStorage.setItem("settingsTourStep",String(o)),s())};B()}d(c,x=>g(x,c))}function g(c,l){if(R(c,l),c=L(c,l),(!c||!c.isConnected)&&(c=V(c,l),c&&(c=L(c,l))),!c){o++,localStorage.setItem("settingsTourStep",String(o)),s();return}const d=c;O(),bt(d,l).then(()=>{if(l.forcePageTop&&K("auto"),!d.isConnected){o++,localStorage.setItem("settingsTourStep",String(o)),s();return}R(d,l),l.noHighlight||(d.dataset.tourOrigPosition||(d.dataset.tourOrigPosition=d.style.position||""),d.dataset.tourOrigZIndex||(d.dataset.tourOrigZIndex=d.style.zIndex||""),d.dataset.tourOrigIsolation||(d.dataset.tourOrigIsolation=d.style.isolation||""),d.dataset.tourOrigBoxShadow||(d.dataset.tourOrigBoxShadow=d.style.boxShadow||""),d.dataset.tourOrigOutline||(d.dataset.tourOrigOutline=d.style.outline||""),d.dataset.tourOrigOutlineOffset||(d.dataset.tourOrigOutlineOffset=d.style.outlineOffset||""),d.dataset.tourOrigTransition||(d.dataset.tourOrigTransition=d.style.transition||""),d.dataset.tourOrigBackground||(d.dataset.tourOrigBackground=d.style.background||""),d.dataset.tourOrigBackgroundColor||(d.dataset.tourOrigBackgroundColor=d.style.backgroundColor||""),d.dataset.tourOrigBorderRadius||(d.dataset.tourOrigBorderRadius=d.style.borderRadius||""),d.style.position=d.style.position||"relative",d.style.zIndex="99999",d.style.isolation="isolate",d.style.transition="box-shadow 0.18s ease, outline 0.18s ease",d.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",d.style.outline="1px solid rgba(255,255,255,0.82)",d.style.outlineOffset="2px",l.spotlightBoxShadow!=null&&(d.style.boxShadow=l.spotlightBoxShadow),l.spotlightOutline!=null&&(d.style.outline=l.spotlightOutline),l.spotlightOutlineOffset!=null&&(d.style.outlineOffset=l.spotlightOutlineOffset),l.spotlightBackground&&(d.style.background=l.spotlightBackground,d.style.backgroundColor=l.spotlightBackground),l.spotlightBorderRadius&&(d.style.borderRadius=l.spotlightBorderRadius),d.setAttribute("data-tour-highlighted","1"),xt(d,l)),document.body.style.overflow="hidden";const x=()=>{const v=M(l.anchorSelector)||d;if(l.freezeTooltip){const B=v&&v.isConnected?v.getBoundingClientRect():null;f(v,l,B&&B.width>=2?B:null);return}const h=V(d,l);let b=h?L(h,l):d;R(b,l);const S=l.tooltipAnchor?null:N(l,b);f(b||d,l,S)};if(l.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(x));return}const m=(y=0)=>{requestAnimationFrame(()=>{if(l.forcePageTop&&K("auto"),l.tooltipAnchor){x();return}const v=V(d,l);let h=v?L(v,l):d;R(h,l);const b=N(l,h);if(!b&&y<4){requestAnimationFrame(()=>m(y+1));return}f(h||d,l,b)})};m(0)})}function f(c,l,d){const x=document.getElementById("tourTooltip");x&&x.remove(),A();const m=document.createElement("div");m.id="tourTooltip";const y=Math.min(o+1,i.length),v=Math.max(8,Math.min(100,Math.round(y/i.length*100))),h=X(l.title||"Quick setup"),b=X(l.text||""),S=l.primaryLabel||(o<i.length-1?"Next":"Got it"),B=o<=0;m.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",m.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${h}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${y} of ${i.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${v}%;"></div>
          </div>
        </div>
        <div class="tour-title">${h}</div>
        <p class="tour-copy">${b}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${B?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${X(S)}</button>
        </div>
      </div>`,document.body.appendChild(m);const z=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,T=Wt(l,z);let I=d;if(d&&d.width>=2&&d.height>=2){I=Yt(c,l,m,T)||d,l.noHighlight||xt(c,l);const P=Math.min(380,window.innerWidth-28);m.style.setProperty("--tour-width",`${P}px`),m.style.left="0",m.style.right="auto",m.style.bottom="auto",m.style.width=`${P}px`,m.style.justifyContent="flex-start",m.classList.add("tour-tooltip-floating");const pt=m.querySelector(".tour-panel"),ut=Math.min(pt&&pt.offsetHeight||m.offsetHeight||190,Math.max(140,window.innerHeight-28)),gt=l.tooltipGap??8,Mt=I.left+I.width/2,mt=Math.max(14,Math.min(Mt-P/2,window.innerWidth-P-14)),$t=T!=="above"?I.bottom+gt:I.top-ut-gt,ft=Math.max(14,Math.min($t,window.innerHeight-ut-14));m.style.setProperty("--tour-left",`${mt}px`),m.style.setProperty("--tour-top",`${ft}px`),m.style.left=`${mt}px`,m.style.top=`${ft}px`}m.style.visibility="visible",w()}function w(){const c=document.getElementById("tourNextBtn"),l=document.getElementById("tourSkipBtn"),d=()=>{n(),o++,localStorage.setItem("settingsTourStep",String(o)),s()},x=()=>{r()},m=()=>{o<=0||(n(),o--,localStorage.setItem("settingsTourStep",String(o)),s())};c&&(c.onclick=d),l&&(l.onclick=x);const y=document.getElementById("tourBackBtn");y&&(y.onclick=m),jt({onNext:d,onBack:m,onSkip:x})}function k(){A(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";const l=p.activeHotelName||"Your Hotel",d=l.trim().charAt(0).toUpperCase(),x=l.length>10?l.slice(0,10):l,m="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",y="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",v="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",h=`<div style="${m}"><div style="${y}background:rgba(255,255,255,0.22);"></div><div style="${v}"></div></div>`,b=p.activeHotelAppIcon||"",S=b?`<img src="${b}" alt="" style="width:100%;height:100%;object-fit:contain;">`:d,B=b?`${y}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${y}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,z=`<div style="${m}"><div style="${B}">${S}</div><div style="${v}font-size:7.5px;color:#fff;font-weight:700;">${x}</div></div>`,T=[h,h,h,h,z,h,h,h].join(""),I=document.createElement("div");if(I.id="tourTooltip",I.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",I.innerHTML=`
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
            <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">1 of ${i.length}</div>
            <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
              <div style="height:100%;width:${Math.round(1/i.length*100)}%;border-radius:999px;background:#2E7D5B;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">You're on their home screen</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${l}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your hotel from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(I),!document.getElementById("tourModalAnimStyle")){const P=document.createElement("style");P.id="tourModalAnimStyle",P.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(P)}document.getElementById("tourNextBtn").onclick=()=>{n(),o++,localStorage.setItem("settingsTourStep",String(o)),s()},document.getElementById("tourSkipBtn").onclick=()=>{r()}}function C(){A();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";let l=0;const d=[`<div style="padding:20px 18px 0;">
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
      </div>`],x=document.createElement("div");x.id="tourTooltip",x.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function m(){const v=l>=d.length-1?"Next — Revenue →":"Next →";x.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
          ${d[l]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${d.map((h,b)=>`<div style="width:8px;height:8px;border-radius:50%;background:${b===l?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${v}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{l<d.length-1?(l++,m()):(n(),o++,localStorage.setItem("settingsTourStep",String(o)),s())},document.getElementById("tourSkipBtn").onclick=()=>{r()}}if(document.body.appendChild(x),m(),!document.getElementById("tourModalAnimStyle")){const y=document.createElement("style");y.id="tourModalAnimStyle",y.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(y)}}function E(){A();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";const l=document.createElement("div");if(l.id="tourTooltip",l.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",l.innerHTML=`
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
      </div>`,document.body.appendChild(l),!document.getElementById("tourModalAnimStyle")){const d=document.createElement("style");d.id="tourModalAnimStyle",d.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(d)}document.getElementById("tourNextBtn").onclick=()=>{n(),o++,localStorage.setItem("settingsTourStep",String(o)),s()},document.getElementById("tourSkipBtn").onclick=()=>{r()}}s()}async function kt(){const t=document.getElementById("settingsList");if(t){t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const e=await api("GET","/api/crm/verify"),o="https://"+(e?.domain||p.activeHotelId+".mktel.co"),n="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(o),r=await api("GET","/api/crm/rooms");let a={nightly:69,weekly:299,monthly:999};r?.rates&&(a=r.rates);const s=r?.rooms||[];let u="";e?.subscribed||(u+=goLiveInlineCardHtml()),s.length?s.forEach(g=>{const f=g.images&&g.images.length>0;u+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${f?`<img src="${g.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${f?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${g.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${g.name}</div>
              ${g.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${g.description}</div>`:""}
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
            <input type="text" value="${o}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${o}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${n}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
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
    `,t.innerHTML=u}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function _t(){const t=document.getElementById("settings-booking-url");t&&navigator.clipboard.writeText(t.value).then(()=>{localStorage.setItem("linkCopied","1"),q(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function Qt(){localStorage.setItem("settingsTourDone","1");const t=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",t);let e=0;const i=setInterval(()=>{e++;const o=document.getElementById("edit-rate-nightly");if(o||e>20){if(clearInterval(i),!o)return;const n=o.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const r=n.previousElementSibling?.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}setTimeout(()=>{o.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const a=o.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${a.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const u=document.getElementById("checklistPointer");u&&u.remove()},6e3)},1e3)},100)}},200)}function Kt(){const e="https://"+(p.activeHotelDomain||p.activeHotelId+".mktel.co");navigator.clipboard.writeText(e).then(()=>{localStorage.setItem("linkCopied","1"),q(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function Jt(t,e){localStorage.setItem("settingsTourDone","1");const i=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",i);let o=0;const n=setInterval(()=>{o++;const r=document.querySelector(t);if(r||o>20){if(clearInterval(n),!r)return;r.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const s=r.getBoundingClientRect(),u=document.createElement("div");u.id="checklistPointer",u.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,u.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${e}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(u),setTimeout(()=>{const g=document.getElementById("checklistPointer");g&&g.remove()},6e3)},1e3)}},200)}function nt(){const t=String(p.token||localStorage.getItem("crmToken")||"").trim();return t&&(p.token=t),t}async function rt(t,e){const i=nt();if(!i)throw new Error("Not logged in");const o=await Lt(e),n=new FormData;n.append("image",o,o.name||"room.webp");const r=new URLSearchParams;p.activeHotelId&&r.set("hotelId",p.activeHotelId),r.set("token",i);const a=await fetch(`/api/crm/rooms/${t}/images?${r}`,{method:"POST",headers:{"x-crm-token":i},body:n}),s=await a.json().catch(()=>({}));if(!a.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${a.status})`);return s}async function Zt(t,e){const i=t.target.files[0];if(i)try{await rt(e,i),toast("Photo uploaded!","success"),kt()}catch(o){toast(o.message||"Upload failed","error")}}async function Xt(){const t=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,i=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:i}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function te(){const t=document.getElementById("settings-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");p.token=t,p.isMasterPin=!1;try{localStorage.setItem("crmToken",p.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(e){toast(e.message||"Failed to change PIN","error")}}async function ee(){const t=document.getElementById("settings-support-msg")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function oe(){const t=p.activeHotelDomain||p.activeHotelId+".mktel.co",i=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(p.activeHotelId)+"&preview=1":"https://"+t+"?preview=1";window.open(i,"_blank")}function Et(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&p.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(p.activeHotelId);const e=p.activeHotelDomain||"";return e?"https://"+e+"/":""}function ie(){const t=Et();if(!t){toast("Your booking domain is still setting up.","info");return}window.open(t,"_blank")}function ne(){const t=document.getElementById("previewSiteBar");t&&(t.style.display=p.currentFilter==="settings"?"block":"none")}function q(){if(localStorage.getItem("settingsTourDone"))return;const t=parseInt(localStorage.getItem("settingsTourStep")||"0"),e=p.editRooms.some(a=>a.images&&a.images.length>0),i=!!localStorage.getItem("ratesChanged"),o=!!localStorage.getItem("linkCopied");t===2&&e&&localStorage.setItem("settingsTourStep","3"),t===3&&o&&localStorage.setItem("settingsTourStep","4"),t===4&&i&&localStorage.setItem("settingsTourStep","5");const n=document.getElementById("tourTooltip");n&&n.remove();const r=document.getElementById("tourBlurOverlay");r&&r.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(a=>{a.style.position=a.dataset.tourOrigPosition||"",a.style.zIndex="",a.style.isolation="",a.style.boxShadow="",a.style.outline=a.dataset.tourOrigOutline||"",a.style.outlineOffset=a.dataset.tourOrigOutlineOffset||"",a.removeAttribute("data-tour-highlighted"),delete a.dataset.tourOrigPosition,delete a.dataset.tourOrigOutline,delete a.dataset.tourOrigOutlineOffset}),document.body.style.overflow=""}function re(){let t=0;const e={},i=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function o(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),t>=i.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",e).catch(()=>{})}catch{}St();return}const r=i[t],a=document.createElement("div");a.id="onboardingOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",r.type==="text"?(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${i.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${r.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(a),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(e[r.key]=s,t++,o())}):(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${i.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${r.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(a),a.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{e[r.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{t++,o()},250)})}))}o()}function ae(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(i=>{localStorage.removeItem(i)});const t=new URL(window.location.href);t.searchParams.set("welcome","1"),t.searchParams.delete("tab");const e=t.pathname+t.search+t.hash;if(e===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(e)}function St(){const t=document.createElement("div");t.id="welcomeModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function e(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const o=typeof et=="function"?et:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;o&&o(),t.remove()}function i(){t.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏨</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=e}document.body.appendChild(t),i(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function J(){const t=document.getElementById("postActivationTourTooltip");t&&t.remove();const e=document.getElementById("postActivationTourOverlay");e&&e.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(i=>{i.style.boxShadow="",i.style.position="",i.style.zIndex="",i.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function W(){J(),localStorage.setItem("postActivationTourDone","1");const t=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",t)}catch{}}function at(){if(localStorage.getItem("postActivationTourDone")){W();return}J();const t=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. You'll get a push alert for each new one."},{tab:"apps",navFilter:"apps",text:"<strong>Guest App</strong> — put your hotel on guests&apos; home screens and send install reminders."}];let e=0;function i(){if(J(),e>=t.length){W();return}const o=t[e],n=document.querySelector(`.tab[data-nav-filter="${o.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${o.navFilter}"]`);n&&setFilter(o.tab,n);const r=document.createElement("div");r.id="postActivationTourOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(r),document.body.style.overflow="hidden",setTimeout(()=>{const a=document.querySelector(`.tab[data-nav-filter="${o.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${o.navFilter}"]`);a&&(a.setAttribute("data-post-activation-highlight","1"),a.style.position="relative",a.style.zIndex="100003",a.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",a.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=a?a.getBoundingClientRect():{left:24,bottom:80,width:200},u=document.createElement("div");u.id="postActivationTourTooltip";const g=Math.min(300,window.innerWidth-32),f=Math.max(16,Math.min(s.left+s.width/2-g/2,window.innerWidth-g-16)),w=Math.min(s.bottom+14,window.innerHeight-180);u.style.cssText=`position:fixed;z-index:100004;left:${f}px;top:${w}px;max-width:${g}px;width:${g}px;`;const k=e>=t.length-1;u.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${e+1} / ${t.length}</p>
          <p style="margin:0 0 14px;">${o.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${k?"Got it — open Guest App":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(u),document.getElementById("postActivationTourNext").onclick=()=>{e+=1,i()},document.getElementById("postActivationTourSkip").onclick=()=>{W()}},o.tab==="apps"?80:0)}i()}window.startPostActivationTabTour=at;function se(){if(document.getElementById("activatedModalOverlay"))return;const t=p.activeHotelDomain||(p.activeHotelId?p.activeHotelId+".mktel.co":""),e="Bookings and Guest App",i=document.createElement("div");i.id="activatedModalOverlay",i.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",i.innerHTML=`
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
  `,document.body.appendChild(i),document.getElementById("activatedModalTour").onclick=()=>{i.remove(),at()},document.getElementById("activatedModalSkip").onclick=()=>{i.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function st(){if(isEditPageDomReady())return;if(p.editRoomsLoadPromise)return p.editRoomsLoadPromise;const t=document.getElementById("editRoomsList");if(t){p.editRoomsLoadPromise=(async()=>{t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[e,i]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!e.rooms)throw new Error("No data");p.editRooms=e.rooms;const o=i?.hotelName||"";o&&(p.activeHotelName=o),i&&(p.hotelSubscribed=!!i.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const n=i?.hotelSubtitle||"",r=i?.hotelAddress||"",a=i?.hotelPhone||"",s=i?.appIconUrl||"";p.activeHotelAppIcon=s,updateFrontdeskManifestLink();let u={nightly:69,weekly:299,monthly:999,taxRate:.1};e.rates&&(u=e.rates);const f="https://"+(i?.domain||p.activeHotelId+".mktel.co"),w="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(f);let k=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${r}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${o}" id="edit-hotel-name" placeholder="Your Hotel Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${n}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
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
                <input type="text" value="${(i?.cancellationPolicy||"").replace(/"/g,"&quot;")}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;font-size:11px;color:#111827;font-weight:500;border:none;background:transparent;outline:none;font-family:inherit;text-align:center;">
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
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${f}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${f.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
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
            <input type="text" id="edit-new-pin" value="${p.isMasterPin?"":p.token}" placeholder="${p.isMasterPin?"Enter a unique hotel PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${p.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
        </div>
      </div>
      ${i?.subscribed?`<div class="booking-card" style="margin-bottom:14px;">
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
    `;t.innerHTML=k,j(),typeof lucide<"u"&&lucide.createIcons()}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await p.editRoomsLoadPromise}finally{p.editRoomsLoadPromise=null}}}function dt(){j()}function j(){const t=document.getElementById("editRoomsCards");if(t){if(!p.editRooms.length){t.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}t.innerHTML=p.editRooms.map((e,i)=>{const o=(e.amenities||"").split("•").map(a=>a.trim()).filter(Boolean),n=(e.images||[]).filter(a=>a&&a.url),r=jsStr(e.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${e.id}" ${i===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${n.length?`
          <img class="room-edit-main-img" src="${esc(n[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${n.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${r}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${r}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${n.length}</div>
            <div class="room-edit-image-dots">
              ${n.map((a,s)=>`<button type="button" class="room-edit-image-dot ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${r}', ${s})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${r}')">
        </label>
      </div>
      ${n.length>1?'<div class="room-edit-thumbs">'+n.map((a,s)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${r}', ${s})"><img src="${esc(a.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${r}','${jsStr(a.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
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
            ${o.map(a=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${It(a)} ${a} <button onclick="removeAmenity('${e.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function Bt(t){const e=p.editRooms.find(i=>String(i.id)===String(t));return(e&&e.images||[]).filter(i=>i&&i.url)}function Tt(t,e){const i=Bt(t);if(!i.length)return;const o=document.getElementById("edit-card-"+t);if(!o)return;const n=i.length,r=((Number(e)||0)%n+n)%n,a=o.querySelector(".room-edit-main-img");a&&(a.src=i[r].url),o.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(r));const s=o.querySelector(".room-edit-photo-count");s&&(s.textContent=r+1+" / "+n),o.querySelectorAll(".room-edit-image-dot").forEach((u,g)=>{u.classList.toggle("active",g===r),g===r?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")}),o.querySelectorAll(".room-edit-thumb").forEach((u,g)=>{u.classList.toggle("active",g===r),g===r?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")})}function de(t,e){const o=document.getElementById("edit-card-"+t)?.querySelector(".room-edit-photo"),n=parseInt(o?.getAttribute("data-photo-index")||"0",10)||0;Tt(t,n+e)}function It(t){const e=t.toLowerCase();return e.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':e.includes("tv")||e.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':e.includes("fridge")||e.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':e.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':e.includes("housekeeping")||e.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':e.includes("bath")||e.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':e.includes("work")||e.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':e.includes("pet")||e.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':e.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':e.includes("kitchen")||e.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const zt=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let lt=null;function Pt(t){lt=t;const i=(p.editRooms.find(r=>r.id===t)?.amenities||"").split("•").map(r=>r.trim().toLowerCase()).filter(Boolean);let o=document.getElementById("amenityPickerModal");o||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",Z),o=document.getElementById("amenityPickerModal"));const n=document.getElementById("amenityPickerGrid");n.innerHTML=zt.map(r=>{const a=i.some(s=>s.includes(r.key));return`<button onclick="toggleAmenityPreset(this,'${r.key}')" data-key="${r.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${a?"#2E7D5B":"#e5e7eb"};background:${a?"#E8F5EE":"white"};color:${a?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${r.icon}" style="width:14px;height:14px;"></i> ${r.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",o.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function le(t,e){const i=t.style.borderColor==="rgb(46, 125, 91)";t.style.borderColor=i?"#e5e7eb":"#2E7D5B",t.style.background=i?"white":"#E8F5EE",t.style.color=i?"#1a1a2e":"#2E7D5B"}function Z(){document.getElementById("amenityPickerModal").style.display="none",lt=null}function ce(){const t=p.editRooms.find(n=>n.id===lt);if(!t){Z();return}const e=document.getElementById("amenityPickerGrid"),i=[];e.querySelectorAll("button").forEach(n=>{if(n.style.background==="rgb(232, 245, 238)"){const r=zt.find(a=>a.key===n.dataset.key);r&&i.push(r.label)}});const o=document.getElementById("amenityCustomInput").value.trim();o&&i.push(o),t.amenities=i.join(" • "),Z(),dt(),typeof lucide<"u"&&lucide.createIcons()}function pe(t){Pt(t)}function ue(t,e){const i=p.editRooms.find(n=>n.id===t);if(!i)return;const o=(i.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);i.amenities=o.filter(n=>n!==e).join(" • "),dt(),typeof lucide<"u"&&lucide.createIcons()}async function ge(){const t=document.getElementById("edit-hotel-name")?.value.trim(),e=document.getElementById("edit-hotel-subtitle")?.value.trim(),i=document.getElementById("edit-hotel-address")?.value.trim(),o=document.getElementById("edit-hotel-phone")?.value.trim(),n=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:t,subtitle:e,address:i,phone:o,cancellationPolicy:n}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function me(){const t=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,i=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:i}),localStorage.setItem("ratesChanged","1"),p.launchStatus=null,q(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function fe(){const t=document.getElementById("edit-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");p.token=t,p.isMasterPin=!1;try{localStorage.setItem("crmToken",p.token)}catch{}toast("PIN updated!","success")}catch(e){toast(e.message||"Failed to change PIN","error")}}function xe(t){navigator.clipboard.writeText(t).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function ye(t){const e=t.nextElementSibling,i=t.querySelector(".accordion-arrow");e.style.display==="none"?(e.style.display="block",i&&(i.style.transform="rotate(90deg)")):(e.style.display="none",i&&(i.style.transform="rotate(0deg)"))}let G=!1;function At(){if(document.getElementById("goLiveOverlay"))return;const t=document.createElement("div");t.id="goLiveOverlay",t.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",t.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(t)}function ot(){const t=document.getElementById("goLiveOverlay");t&&t.remove()}async function he(){if(!G){G=!0,At();try{const t=await api("POST","/api/crm/go-live");if(t.success&&t.url){window.location.href=t.url;return}ot(),G=!1,toast(t.message||"Failed to start checkout","error")}catch{ot(),G=!1,toast("Failed to start checkout. Try again.","error")}}}async function be(){try{const t=await api("GET","/api/crm/billing-portal");t.success&&t.url?window.location.href=t.url:toast(t.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function ve(){const t=document.getElementById("supportMessage")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function we(t){const e=p.editRooms.find(s=>s.id===t);if(!e){toast("Room not found — try refreshing","error");return}const i=document.getElementById("edit-name-"+t)?.value.trim(),o=document.getElementById("edit-desc-"+t)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+t)?.value)||4,r=parseInt(document.getElementById("edit-units-"+t)?.value)||1,a={id:t,name:i||e.name,description:o||"",amenities:e.amenities||"",maxOccupancy:n,totalUnits:r};try{const s=await api("POST","/api/crm/rooms",a);if(s&&s.success===!1){toast(s.message||"Failed to save","error");return}e.name=a.name,e.description=a.description,e.maxOccupancy=n,e.totalUnits=r,toast("Room saved!","success")}catch(s){toast("Failed to save: "+(s.message||""),"error")}}async function ke(t,e){const i=Array.from(t.target.files);if(!i.length)return;const n=document.getElementById("edit-card-"+e)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+e+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+e+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+i.length+"</div></div>"));let r=0,a="";for(const u of i){try{const f=await rt(e,u);if(f.image){const w=p.editRooms.find(k=>k.id===e);w&&(w.images||(w.images=[]),w.images.push(f.image),w.imageUrl||(w.imageUrl=f.image.url)),r++}}catch(f){a=f.message||"Upload failed"}const g=document.getElementById("upload-progress-"+e);g&&(g.textContent=r+" / "+i.length)}const s=document.getElementById("upload-spinner-"+e);s&&s.remove(),j(),r>0&&(p.launchStatus=null),q(),r>0?toast(r+" photo"+(r!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(a||"Upload failed","error")}function Ct(t,e=512){return new Promise((i,o)=>{const n=new Image,r=URL.createObjectURL(t);n.onload=()=>{try{const a=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-a)/2,u=(n.naturalHeight-a)/2,g=document.createElement("canvas");g.width=e,g.height=e;const f=g.getContext("2d");f.imageSmoothingQuality="high",f.drawImage(n,s,u,a,a,0,0,e,e),URL.revokeObjectURL(r),g.toBlob(w=>w?i(w):o(new Error("crop failed")),"image/png",.92)}catch(a){URL.revokeObjectURL(r),o(a)}},n.onerror=()=>{URL.revokeObjectURL(r),o(new Error("load failed"))},n.src=r})}function Rt(){const t=document.getElementById("appsAppIconPreview");t&&(t.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function ct(t){const e=document.getElementById("appsAppIconPreview");e&&(e.style.background="#fff",e.style.border="1px solid var(--border)",e.style.padding="0",e.innerHTML='<img src="'+t+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function it(){const t=document.getElementById("appsAppIconPreview");if(!t)return;if(p.activeHotelAppIcon){ct(p.activeHotelAppIcon);return}const e=(p.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨";t.style.background="transparent",t.style.border="none",t.style.padding="0",t.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+e+"</span>"}async function Ee(t){const e=t.files&&t.files[0];if(!e)return;Rt();const i=new FormData;try{const o=await Ct(e,512);i.append("icon",o,"app-icon.png")}catch{i.append("icon",e)}try{const o=nt(),n=new URLSearchParams;p.activeHotelId&&n.set("hotelId",p.activeHotelId),o&&n.set("token",o);const a=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":o},body:i})).json();if(a.success&&a.appIconUrl){p.activeHotelAppIcon=a.appIconUrl,ct(a.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(p.activeHotelId||"")+"|"+a.appIconUrl+"|"+(p.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(a.message||"Failed to upload icon","error"),it()}catch{toast("Failed to upload icon","error"),it()}t.value=""}async function Se(t,e){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${t}/images/${e}`);const i=p.editRooms.find(o=>o.id===t);i&&i.images&&(i.images=i.images.filter(o=>o.id!==e),i.imageUrl=i.images[0]?.url||null),j(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function Be(t){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${t}`),toast("Room deleted","success"),st()}catch{toast("Failed to delete","error")}}function Te(){const t=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(t.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function Ie(){const t=document.getElementById("editNewRoomName").value.trim();t&&api("POST","/api/crm/rooms",{name:t,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),st()}).catch(()=>toast("Failed to add","error"))}const Ot={addAmenityPrompt:pe,advanceTourIfNeeded:q,changePin:fe,checklistGoTo:Jt,checklistGoToRates:Qt,cleanupPostActivationTourUi:J,cleanupSettingsTourUi:H,closeAmenityPicker:Z,confirmAmenityPicker:ce,confirmEditAddRoom:Ie,copyBookingLink:xe,copyBookingLinkFromChecklist:Kt,deleteEditImage:Se,deleteEditRoom:Be,ensureTourBlurOverlay:O,finishPostActivationTour:W,getAmenityIcon:It,getCrmAuthToken:nt,getEditRoomImages:Bt,goLive:he,guestBookingEngineUrl:Et,handoffToGuestAppsTour:vt,hideGoLiveOverlay:ot,loadEditRooms:st,loadSettings:kt,openAmenityPicker:Pt,openBillingPortal:be,openEditAddRoom:Te,openGuestBookingEngine:ie,openPreviewSite:oe,openTourAccordion:R,postRoomImageUpload:rt,queryTourSelector:M,removeAmenity:ue,renderEditRooms:dt,renderEditRoomsCards:j,replayWalkthrough:ae,resolveLiveTourElement:V,resolveTourHighlightEl:L,restoreAppIconPreview:it,saveEditRoom:we,saveHotelInfo:ge,saveRates:me,scrollTourTargetIntoView:bt,sendSupportMessage:ve,setAppIconPreviewImage:ct,setAppIconPreviewLoading:Rt,settingsChangePin:te,settingsCopyLink:_t,settingsSaveRates:Xt,settingsSendSupport:ee,settingsUploadPhoto:Zt,showActivatedModal:se,showEditRoomPhoto:Tt,showFinaleMockModal:F,showGoLiveOverlay:At,showOnboardingQuestions:re,showTestDriveModal:wt,showWelcomeModal:St,squareCropImage:Ct,startPostActivationTabTour:at,startSettingsTour:et,stepEditRoomPhoto:de,toggleAmenityPreset:le,toggleSection:ye,tourAnchorRect:N,tourElementRect:Q,updatePreviewSiteBar:ne,uploadAppIcon:Ee,uploadEditImages:ke};function ze(){Ft(Ot)}const Re=Object.freeze(Object.defineProperty({__proto__:null,default:Ot,install:ze},Symbol.toStringTag,{value:"Module"}));export{Ae as a,Re as b,p as c,Ft as e,Ce as s};
