const l={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let q=null;function we(){return typeof lucide<"u"?Promise.resolve():q||(q=new Promise((t,e)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>t(),o.onerror=()=>e(new Error("lucide load failed")),document.head.appendChild(o)}),q)}async function Rt(t){if(!t||!t.type.startsWith("image/")||t.type==="image/webp"&&t.size<4e5)return t;try{const e=await createImageBitmap(t),o=1600,i=1200;let n=e.width,a=e.height;const r=Math.min(1,o/n,i/a);n=Math.round(n*r),a=Math.round(a*r);const s=document.createElement("canvas");s.width=n,s.height=a,s.getContext("2d").drawImage(e,0,0,n,a),e.close();const u=await new Promise((y,w)=>{s.toBlob(k=>k?y(k):w(new Error("encode failed")),"image/webp",.82)}),g=(t.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([u],g+".webp",{type:"image/webp"})}catch{return t}}function ke(){const t=()=>{l.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(t,{timeout:2500}):setTimeout(t,600)}function Mt(t){Object.assign(window,t)}function $(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function V(...t){return $("setFilter")?.(...t)}function $t(...t){return $("toast")?.(...t)}function W(...t){return $("updateGoLiveBanner")?.(...t)}function Lt(...t){return $("seedTourRevenueShell")?.(...t)}function Dt(...t){return $("finishTourHydration")?.(...t)}function Ot(...t){return $("goLive")?.(...t)}let O=null;function P(){if(document.getElementById("frontdeskTourPolishStyle"))return;const t=document.createElement("style");t.id="frontdeskTourPolishStyle",t.textContent=`
    #tourBlurOverlay {
      -webkit-backdrop-filter: blur(2.5px);
      backdrop-filter: blur(2.5px);
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
  `,document.head.appendChild(t)}function pt(){O&&(document.removeEventListener("keydown",O),O=null)}function Ft(t){pt(),O=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",O)}function J(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function R(t){P();const e=t||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText=`position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.22);pointer-events:${e.blockPointer?"auto":"none"};`,document.body.appendChild(o),e.lockScroll&&(document.body.style.overflow="hidden"),o)}function F(){pt();const t=document.getElementById("tourTooltip");t&&t.remove();const e=document.getElementById("tourBlurOverlay");e&&e.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.tourOrigPosition||"",i.style.zIndex=i.dataset.tourOrigZIndex||"",i.style.isolation=i.dataset.tourOrigIsolation||"",i.style.boxShadow=i.dataset.tourOrigBoxShadow||"",i.style.outline=i.dataset.tourOrigOutline||"",i.style.outlineOffset=i.dataset.tourOrigOutlineOffset||"",i.style.transition=i.dataset.tourOrigTransition||"",i.removeAttribute("data-tour-highlighted"),delete i.dataset.tourOrigPosition,delete i.dataset.tourOrigZIndex,delete i.dataset.tourOrigIsolation,delete i.dataset.tourOrigBoxShadow,delete i.dataset.tourOrigOutline,delete i.dataset.tourOrigOutlineOffset,delete i.dataset.tourOrigTransition});const o=document.getElementById("goLiveBanner");o&&o.dataset.tourHidden&&(delete o.dataset.tourHidden,typeof W=="function"&&W()),document.body.style.overflow=""}function C(t,e){if(!e.openAccordion)return;const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const a=o.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}}function M(t){if(!t)return null;for(const e of String(t).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(e);if(o&&o.isConnected)return o}return null}function L(t,e){if(e.highlightSelector){const o=M(e.highlightSelector);if(o)return o}if(e.highlightCard){const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(o)return o}return e.targetParent&&(t.closest(".booking-card")||t.closest(".accordion-body"))||t}function U(t,e){if(!e)return t;const o=String(e.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const n=document.querySelector(i);if(n&&n.isConnected)return n}if(e.accordionCard){const i=document.querySelector(e.accordionCard);if(i&&i.isConnected)return i}return t&&t.isConnected?t:null}function Z(t,e){if(!t||!t.isConnected)return null;const o=t.getBoundingClientRect();return o.width<2||o.height<2||!e&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function X(t,e){const o=M(t.anchorSelector);if(o){const i=Z(o,!0);if(i)return i}return Z(e,!0)}function Y(t){const e=t||"auto";try{window.scrollTo({top:0,left:0,behavior:e})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const n=document.querySelector(i);n&&(n.scrollTop=0)})}function ut(t,e){const o=e.scrollTarget||e.accordionCard,i=(o?M(o):null)||t;if(!i&&!e.scrollToTop)return Promise.resolve();const n=e.scrollBlock||"center",a=window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=l.settingsTourActive||a?"auto":"smooth";return new Promise(s=>{const u=()=>{const z=e.scrollPadTop??80,c=e.scrollPadBottom??220,p=M(e.anchorSelector)||(i&&i.isConnected?i:null)||(t&&t.isConnected?t:null);if(!p){s();return}const d=p.getBoundingClientRect();d.top<z&&window.scrollBy({top:d.top-z,left:0,behavior:"auto"}),d.bottom>window.innerHeight-c&&window.scrollBy({top:d.bottom-window.innerHeight+c,left:0,behavior:"auto"}),requestAnimationFrame(()=>requestAnimationFrame(s))},g=()=>{i&&i.scrollIntoView({behavior:e.scrollToTop?"auto":r,block:n,inline:"nearest"}),u()};if(e.scrollToTop){if(Y(r),e.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(()=>{e.forcePageTop&&Y("auto"),s()}));return}if(r==="auto"){g();return}let z=!1;const c=()=>{z||(z=!0,window.removeEventListener("scrollend",p),clearTimeout(d),g())},p=()=>c();"onscrollend"in window&&window.addEventListener("scrollend",p,{once:!0});const d=setTimeout(c,520);return}if(!i){s();return}if(i.scrollIntoView({behavior:r,block:n,inline:"nearest"}),r==="auto"){u();return}let y=!1;const w=()=>{y||(y=!0,window.removeEventListener("scrollend",k),clearTimeout(K),u())},k=()=>w();"onscrollend"in window&&window.addEventListener("scrollend",k,{once:!0});const K=setTimeout(w,620)})}function gt(){F(),localStorage.setItem("settingsTourStep","handoff");const t=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&V("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},e=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof e=="function"?e().then(t).catch(t):t()}function D(){F(),P(),l.settingsTourActive=!1,W();const t=R({blockPointer:!0,lockScroll:!0});t.style.background="rgba(17,24,39,0.42)";const e=document.createElement("div");if(e.id="tourTooltip",e.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),!document.getElementById("tourModalAnimStyle")){const o=document.createElement("style");o.id="tourModalAnimStyle",o.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(o)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const i="https://"+(l.activeHotelDomain||l.activeHotelId+".mktel.co");navigator.clipboard.writeText(i).catch(()=>{}),F(),l.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),$t("Booking link copied!","success"),Dt(),mt()}}function mt(t){P();const e=document.createElement("div");e.id="testDriveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{o(),Ot()},document.getElementById("activateLaterBtn").onclick=()=>{o();const i=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');i&&V("bookings",i)}}function tt(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),D();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),l.settingsTourActive=!0,W(),Lt();const t=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');t&&V("settings",t);function e(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!l.editRoomsLoadPromise)return;const d=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;d&&d()}e();const o=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the hotel name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",scrollPadTop:80,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"center",scrollPadTop:80,scrollPadBottom:220},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:80,scrollPadBottom:220},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-header",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:260},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,scrollBlock:"start",scrollPadTop:92,scrollPadBottom:220},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function n(){F()}function a(){n(),localStorage.removeItem("settingsTourStep"),D()}function r(c){if(c.customModal){u(c);return}requestAnimationFrame(()=>u(c))}function s(){if(n(),i>=o.length){localStorage.removeItem("settingsTourStep"),D();return}const c=o[i];if(c.tab==="revenue"&&!l.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(c.tab==="apps"&&!(isStandaloneApp()||l.frontdeskInstalled)&&c.target&&!c.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(c.customModal||R(),c.tab&&c.tab!==l.currentFilter){const p=document.querySelector(`.tab[data-nav-filter="${c.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${c.tab}"]`);if(p&&V(c.tab,p),c.tab==="apps"){const d=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof d=="function"&&d(!0)}r(c);return}r(c)}function u(c){if(c.customModal==="homescreen"){k();return}if(c.customModal===!0||c.customModal==="bookings"){z();return}if(c.customModal==="availability"){K();return}if(c.customModal==="finale"){D();return}if(c.customModal==="guestAppsStory"){gt();return}if(c.waitForVisible){const m=c.target.split(",").map(b=>b.trim());let f=0;const x=30;R();const v=l.settingsTourActive?60:200,h=()=>{if(f++,c.tab==="apps"){const E=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof E=="function"&&E(!0)}let b=null;for(const E of m)if(b=document.querySelector(E),b)break;if(b&&(c.openAccordion&&C(b,c),c.openAccordion||b.offsetParent!==null)){g(b,c);return}f<x?setTimeout(h,v):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};h();return}function p(m){const f=m.target.split(",").map(x=>x.trim());for(const x of f){const v=document.querySelector(x);if(v&&!(!m.openAccordion&&v.offsetParent===null&&getComputedStyle(v).position!=="fixed"))return v}if(m.accordionCard){const x=document.querySelector(m.accordionCard);if(x)return x}return null}function d(m,f){const x=p(m);if(x){f(x);return}const v=m.tab==="settings"&&!m.customModal&&m.target,h=m.tab==="apps"&&!m.customModal&&m.target;if(!v&&!h){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}R();let b=0;if(v&&e(),h){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}const E=l.settingsTourActive?60:250,B=()=>{if(b++,h){const S=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof S=="function"&&S(!0)}const T=p(m);if(T){f(T);return}if(e(),h){const S=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof S=="function"&&S(!0)}b<48?setTimeout(B,E):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};B()}d(c,m=>g(m,c))}function g(c,p){if(C(c,p),c=L(c,p),(!c||!c.isConnected)&&(c=U(c,p),c&&(c=L(c,p))),!c){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}const d=c;R(),ut(d,p).then(()=>{if(p.forcePageTop&&Y("auto"),!d.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}C(d,p),p.noHighlight||(d.dataset.tourOrigPosition||(d.dataset.tourOrigPosition=d.style.position||""),d.dataset.tourOrigZIndex||(d.dataset.tourOrigZIndex=d.style.zIndex||""),d.dataset.tourOrigIsolation||(d.dataset.tourOrigIsolation=d.style.isolation||""),d.dataset.tourOrigBoxShadow||(d.dataset.tourOrigBoxShadow=d.style.boxShadow||""),d.dataset.tourOrigOutline||(d.dataset.tourOrigOutline=d.style.outline||""),d.dataset.tourOrigOutlineOffset||(d.dataset.tourOrigOutlineOffset=d.style.outlineOffset||""),d.dataset.tourOrigTransition||(d.dataset.tourOrigTransition=d.style.transition||""),d.style.position=d.style.position||"relative",d.style.zIndex="99999",d.style.isolation="isolate",d.style.transition="box-shadow 0.18s ease, outline 0.18s ease",d.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",d.style.outline="1px solid rgba(255,255,255,0.82)",d.style.outlineOffset="2px",d.setAttribute("data-tour-highlighted","1")),document.body.style.overflow="hidden";const m=()=>{const v=M(p.anchorSelector)||d;if(p.freezeTooltip){const B=v&&v.isConnected?v.getBoundingClientRect():null;y(v,p,B&&B.width>=2?B:null);return}const h=U(d,p);let b=h?L(h,p):d;C(b,p);const E=p.tooltipAnchor?null:X(p,b);y(b||d,p,E)};if(p.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(m));return}const f=(x=0)=>{requestAnimationFrame(()=>{if(p.forcePageTop&&Y("auto"),p.tooltipAnchor){m();return}const v=U(d,p);let h=v?L(v,p):d;C(h,p);const b=X(p,h);if(!b&&x<4){requestAnimationFrame(()=>f(x+1));return}y(h||d,p,b)})};f(0)})}function y(c,p,d){const m=document.getElementById("tourTooltip");m&&m.remove(),P();const f=document.createElement("div");f.id="tourTooltip";const x=Math.min(i+1,o.length),v=Math.max(8,Math.min(100,Math.round(x/o.length*100))),h=J(p.title||"Quick setup"),b=J(p.text||""),E=p.primaryLabel||(i<o.length-1?"Next":"Got it"),B=i<=0;if(f.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;",f.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${h}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${x} of ${o.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${v}%;"></div>
          </div>
        </div>
        <div class="tour-title">${h}</div>
        <p class="tour-copy">${b}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${B?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${J(E)}</button>
        </div>
      </div>`,document.body.appendChild(f),!(window.matchMedia&&window.matchMedia("(max-width: 767px)").matches)&&d&&d.width>=2&&d.height>=2){const S=Math.min(380,window.innerWidth-28);f.style.setProperty("--tour-width",`${S}px`),f.style.left="0",f.style.right="auto",f.style.bottom="auto",f.style.width=`${S}px`,f.classList.add("tour-tooltip-floating");const I=Math.min(f.offsetHeight||190,Math.max(140,window.innerHeight-28)),A=14,It=d.left+d.width/2,zt=Math.max(14,Math.min(It-S/2,window.innerWidth-S-14)),ct=window.innerHeight-d.bottom,At=d.top,Pt=ct>=I+A||ct>=At?d.bottom+A:d.top-I-A,Ct=Math.max(14,Math.min(Pt,window.innerHeight-I-14));f.style.setProperty("--tour-left",`${zt}px`),f.style.setProperty("--tour-top",`${Ct}px`)}w()}function w(){const c=document.getElementById("tourNextBtn"),p=document.getElementById("tourSkipBtn"),d=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},m=()=>{a()},f=()=>{i<=0||(n(),i--,localStorage.setItem("settingsTourStep",String(i)),s())};c&&(c.onclick=d),p&&(p.onclick=m);const x=document.getElementById("tourBackBtn");x&&(x.onclick=f),Ft({onNext:d,onBack:f,onSkip:m})}function k(){P(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";const p=l.activeHotelName||"Your Hotel",d=p.trim().charAt(0).toUpperCase(),m=p.length>10?p.slice(0,10):p,f="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",x="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",v="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",h=`<div style="${f}"><div style="${x}background:rgba(255,255,255,0.22);"></div><div style="${v}"></div></div>`,b=l.activeHotelAppIcon||"",E=b?`<img src="${b}" alt="" style="width:100%;height:100%;object-fit:contain;">`:d,B=b?`${x}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${x}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,T=`<div style="${f}"><div style="${B}">${E}</div><div style="${v}font-size:7.5px;color:#fff;font-weight:700;">${m}</div></div>`,S=[h,h,h,h,T,h,h,h].join(""),I=document.createElement("div");if(I.id="tourTooltip",I.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",I.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${S}
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
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${p}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your hotel from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(I),!document.getElementById("tourModalAnimStyle")){const A=document.createElement("style");A.id="tourModalAnimStyle",A.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(A)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}function K(){P();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";let p=0;const d=[`<div style="padding:20px 18px 0;">
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
      </div>`],m=document.createElement("div");m.id="tourTooltip",m.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function f(){const v=p>=d.length-1?"Next — Revenue →":"Next →";m.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
          ${d[p]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${d.map((h,b)=>`<div style="width:8px;height:8px;border-radius:50%;background:${b===p?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${v}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{p<d.length-1?(p++,f()):(n(),i++,localStorage.setItem("settingsTourStep",String(i)),s())},document.getElementById("tourSkipBtn").onclick=()=>{a()}}if(document.body.appendChild(m),f(),!document.getElementById("tourModalAnimStyle")){const x=document.createElement("style");x.id="tourModalAnimStyle",x.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(x)}}function z(){P();const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);",document.body.appendChild(c),document.body.style.overflow="hidden";const p=document.createElement("div");if(p.id="tourTooltip",p.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",p.innerHTML=`
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
      </div>`,document.body.appendChild(p),!document.getElementById("tourModalAnimStyle")){const d=document.createElement("style");d.id="tourModalAnimStyle",d.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(d)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}s()}async function ft(){const t=document.getElementById("settingsList");if(t){t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const e=await api("GET","/api/crm/verify"),i="https://"+(e?.domain||l.activeHotelId+".mktel.co"),n="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),a=await api("GET","/api/crm/rooms");let r={nightly:69,weekly:299,monthly:999};a?.rates&&(r=a.rates);const s=a?.rooms||[];let u="";e?.subscribed||(u+=goLiveInlineCardHtml()),s.length?s.forEach(g=>{const y=g.images&&g.images.length>0;u+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${y?`<img src="${g.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${y?"Change Photo":"+ Add Photo"}
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
            <input type="text" value="${i}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${i}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
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
    `,t.innerHTML=u}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function Ht(){const t=document.getElementById("settings-booking-url");t&&navigator.clipboard.writeText(t.value).then(()=>{localStorage.setItem("linkCopied","1"),H(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function Nt(){localStorage.setItem("settingsTourDone","1");const t=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",t);let e=0;const o=setInterval(()=>{e++;const i=document.getElementById("edit-rate-nightly");if(i||e>20){if(clearInterval(o),!i)return;const n=i.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const a=n.previousElementSibling?.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const r=i.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${r.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const u=document.getElementById("checklistPointer");u&&u.remove()},6e3)},1e3)},100)}},200)}function qt(){const e="https://"+(l.activeHotelDomain||l.activeHotelId+".mktel.co");navigator.clipboard.writeText(e).then(()=>{localStorage.setItem("linkCopied","1"),H(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function jt(t,e){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const n=setInterval(()=>{i++;const a=document.querySelector(t);if(a||i>20){if(clearInterval(n),!a)return;a.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const s=a.getBoundingClientRect(),u=document.createElement("div");u.id="checklistPointer",u.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,u.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${e}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(u),setTimeout(()=>{const g=document.getElementById("checklistPointer");g&&g.remove()},6e3)},1e3)}},200)}function it(){const t=String(l.token||localStorage.getItem("crmToken")||"").trim();return t&&(l.token=t),t}async function nt(t,e){const o=it();if(!o)throw new Error("Not logged in");const i=await Rt(e),n=new FormData;n.append("image",i,i.name||"room.webp");const a=new URLSearchParams;l.activeHotelId&&a.set("hotelId",l.activeHotelId),a.set("token",o);const r=await fetch(`/api/crm/rooms/${t}/images?${a}`,{method:"POST",headers:{"x-crm-token":o},body:n}),s=await r.json().catch(()=>({}));if(!r.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${r.status})`);return s}async function Ut(t,e){const o=t.target.files[0];if(o)try{await nt(e,o),toast("Photo uploaded!","success"),ft()}catch(i){toast(i.message||"Upload failed","error")}}async function Gt(){const t=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function Vt(){const t=document.getElementById("settings-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");l.token=t,l.isMasterPin=!1;try{localStorage.setItem("crmToken",l.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(e){toast(e.message||"Failed to change PIN","error")}}async function Wt(){const t=document.getElementById("settings-support-msg")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function Yt(){const t=l.activeHotelDomain||l.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(l.activeHotelId)+"&preview=1":"https://"+t+"?preview=1";window.open(o,"_blank")}function xt(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&l.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(l.activeHotelId);const e=l.activeHotelDomain||"";return e?"https://"+e+"/":""}function _t(){const t=xt();if(!t){toast("Your booking domain is still setting up.","info");return}window.open(t,"_blank")}function Qt(){const t=document.getElementById("previewSiteBar");t&&(t.style.display=l.currentFilter==="settings"?"block":"none")}function H(){if(localStorage.getItem("settingsTourDone"))return;const t=parseInt(localStorage.getItem("settingsTourStep")||"0"),e=l.editRooms.some(r=>r.images&&r.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");t===2&&e&&localStorage.setItem("settingsTourStep","3"),t===3&&i&&localStorage.setItem("settingsTourStep","4"),t===4&&o&&localStorage.setItem("settingsTourStep","5");const n=document.getElementById("tourTooltip");n&&n.remove();const a=document.getElementById("tourBlurOverlay");a&&a.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex="",r.style.isolation="",r.style.boxShadow="",r.style.outline=r.dataset.tourOrigOutline||"",r.style.outlineOffset=r.dataset.tourOrigOutlineOffset||"",r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition,delete r.dataset.tourOrigOutline,delete r.dataset.tourOrigOutlineOffset}),document.body.style.overflow=""}function Kt(){let t=0;const e={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),t>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",e).catch(()=>{})}catch{}yt();return}const a=o[t],r=document.createElement("div");r.id="onboardingOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",a.type==="text"?(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${a.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${a.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(r),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(e[a.key]=s,t++,i())}):(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${a.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${a.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(r),r.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{e[a.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{t++,i()},250)})}))}i()}function Jt(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const t=new URL(window.location.href);t.searchParams.set("welcome","1"),t.searchParams.delete("tab");const e=t.pathname+t.search+t.hash;if(e===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(e)}function yt(){const t=document.createElement("div");t.id="welcomeModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function e(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const i=typeof tt=="function"?tt:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),t.remove()}function o(){t.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏨</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=e}document.body.appendChild(t),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function _(){const t=document.getElementById("postActivationTourTooltip");t&&t.remove();const e=document.getElementById("postActivationTourOverlay");e&&e.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function G(){_(),localStorage.setItem("postActivationTourDone","1");const t=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",t)}catch{}}function rt(){if(localStorage.getItem("postActivationTourDone")){G();return}_();const t=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. You'll get a push alert for each new one."},{tab:"apps",navFilter:"apps",text:"<strong>Guest App</strong> — put your hotel on guests&apos; home screens and send install reminders."}];let e=0;function o(){if(_(),e>=t.length){G();return}const i=t[e],n=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);n&&setFilter(i.tab,n);const a=document.createElement("div");a.id="postActivationTourOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(a),document.body.style.overflow="hidden",setTimeout(()=>{const r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&(r.setAttribute("data-post-activation-highlight","1"),r.style.position="relative",r.style.zIndex="100003",r.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",r.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=r?r.getBoundingClientRect():{left:24,bottom:80,width:200},u=document.createElement("div");u.id="postActivationTourTooltip";const g=Math.min(300,window.innerWidth-32),y=Math.max(16,Math.min(s.left+s.width/2-g/2,window.innerWidth-g-16)),w=Math.min(s.bottom+14,window.innerHeight-180);u.style.cssText=`position:fixed;z-index:100004;left:${y}px;top:${w}px;max-width:${g}px;width:${g}px;`;const k=e>=t.length-1;u.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${e+1} / ${t.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${k?"Got it — open Guest App":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(u),document.getElementById("postActivationTourNext").onclick=()=>{e+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{G()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=rt;function Zt(){if(document.getElementById("activatedModalOverlay"))return;const t=l.activeHotelDomain||(l.activeHotelId?l.activeHotelId+".mktel.co":""),e="Bookings and Guest App",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
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
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),rt()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function at(){if(isEditPageDomReady())return;if(l.editRoomsLoadPromise)return l.editRoomsLoadPromise;const t=document.getElementById("editRoomsList");if(t){l.editRoomsLoadPromise=(async()=>{t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[e,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!e.rooms)throw new Error("No data");l.editRooms=e.rooms;const i=o?.hotelName||"";i&&(l.activeHotelName=i),o&&(l.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const n=o?.hotelSubtitle||"",a=o?.hotelAddress||"",r=o?.hotelPhone||"",s=o?.appIconUrl||"";l.activeHotelAppIcon=s,updateFrontdeskManifestLink();let u={nightly:69,weekly:299,monthly:999,taxRate:.1};e.rates&&(u=e.rates);const y="https://"+(o?.domain||l.activeHotelId+".mktel.co"),w="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(y);let k=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${a}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-name" placeholder="Your Hotel Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${n}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
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
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${y}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${y.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
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
            <input type="text" id="edit-new-pin" value="${l.isMasterPin?"":l.token}" placeholder="${l.isMasterPin?"Enter a unique hotel PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${l.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
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
    `;t.innerHTML=k,N(),typeof lucide<"u"&&lucide.createIcons()}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await l.editRoomsLoadPromise}finally{l.editRoomsLoadPromise=null}}}function st(){N()}function N(){const t=document.getElementById("editRoomsCards");if(t){if(!l.editRooms.length){t.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}t.innerHTML=l.editRooms.map((e,o)=>{const i=(e.amenities||"").split("•").map(r=>r.trim()).filter(Boolean),n=(e.images||[]).filter(r=>r&&r.url),a=jsStr(e.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${e.id}" ${o===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${n.length?`
          <img class="room-edit-main-img" src="${esc(n[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${n.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${a}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${a}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${n.length}</div>
            <div class="room-edit-image-dots">
              ${n.map((r,s)=>`<button type="button" class="room-edit-image-dot ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${a}', ${s})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${a}')">
        </label>
      </div>
      ${n.length>1?'<div class="room-edit-thumbs">'+n.map((r,s)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${a}', ${s})"><img src="${esc(r.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${a}','${jsStr(r.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
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
            ${i.map(r=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${vt(r)} ${r} <button onclick="removeAmenity('${e.id}','${r.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function ht(t){const e=l.editRooms.find(o=>String(o.id)===String(t));return(e&&e.images||[]).filter(o=>o&&o.url)}function bt(t,e){const o=ht(t);if(!o.length)return;const i=document.getElementById("edit-card-"+t);if(!i)return;const n=o.length,a=((Number(e)||0)%n+n)%n,r=i.querySelector(".room-edit-main-img");r&&(r.src=o[a].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(a));const s=i.querySelector(".room-edit-photo-count");s&&(s.textContent=a+1+" / "+n),i.querySelectorAll(".room-edit-image-dot").forEach((u,g)=>{u.classList.toggle("active",g===a),g===a?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((u,g)=>{u.classList.toggle("active",g===a),g===a?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")})}function Xt(t,e){const i=document.getElementById("edit-card-"+t)?.querySelector(".room-edit-photo"),n=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;bt(t,n+e)}function vt(t){const e=t.toLowerCase();return e.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':e.includes("tv")||e.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':e.includes("fridge")||e.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':e.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':e.includes("housekeeping")||e.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':e.includes("bath")||e.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':e.includes("work")||e.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':e.includes("pet")||e.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':e.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':e.includes("kitchen")||e.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const wt=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let dt=null;function kt(t){dt=t;const o=(l.editRooms.find(a=>a.id===t)?.amenities||"").split("•").map(a=>a.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",Q),i=document.getElementById("amenityPickerModal"));const n=document.getElementById("amenityPickerGrid");n.innerHTML=wt.map(a=>{const r=o.some(s=>s.includes(a.key));return`<button onclick="toggleAmenityPreset(this,'${a.key}')" data-key="${a.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${r?"#2E7D5B":"#e5e7eb"};background:${r?"#E8F5EE":"white"};color:${r?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${a.icon}" style="width:14px;height:14px;"></i> ${a.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function te(t,e){const o=t.style.borderColor==="rgb(46, 125, 91)";t.style.borderColor=o?"#e5e7eb":"#2E7D5B",t.style.background=o?"white":"#E8F5EE",t.style.color=o?"#1a1a2e":"#2E7D5B"}function Q(){document.getElementById("amenityPickerModal").style.display="none",dt=null}function ee(){const t=l.editRooms.find(n=>n.id===dt);if(!t){Q();return}const e=document.getElementById("amenityPickerGrid"),o=[];e.querySelectorAll("button").forEach(n=>{if(n.style.background==="rgb(232, 245, 238)"){const a=wt.find(r=>r.key===n.dataset.key);a&&o.push(a.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),t.amenities=o.join(" • "),Q(),st(),typeof lucide<"u"&&lucide.createIcons()}function oe(t){kt(t)}function ie(t,e){const o=l.editRooms.find(n=>n.id===t);if(!o)return;const i=(o.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);o.amenities=i.filter(n=>n!==e).join(" • "),st(),typeof lucide<"u"&&lucide.createIcons()}async function ne(){const t=document.getElementById("edit-hotel-name")?.value.trim(),e=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),n=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:t,subtitle:e,address:o,phone:i,cancellationPolicy:n}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function re(){const t=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),localStorage.setItem("ratesChanged","1"),l.launchStatus=null,H(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function ae(){const t=document.getElementById("edit-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");l.token=t,l.isMasterPin=!1;try{localStorage.setItem("crmToken",l.token)}catch{}toast("PIN updated!","success")}catch(e){toast(e.message||"Failed to change PIN","error")}}function se(t){navigator.clipboard.writeText(t).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function de(t){const e=t.nextElementSibling,o=t.querySelector(".accordion-arrow");e.style.display==="none"?(e.style.display="block",o&&(o.style.transform="rotate(90deg)")):(e.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let j=!1;function Et(){if(document.getElementById("goLiveOverlay"))return;const t=document.createElement("div");t.id="goLiveOverlay",t.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",t.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(t)}function et(){const t=document.getElementById("goLiveOverlay");t&&t.remove()}async function le(){if(!j){j=!0,Et();try{const t=await api("POST","/api/crm/go-live");if(t.success&&t.url){window.location.href=t.url;return}et(),j=!1,toast(t.message||"Failed to start checkout","error")}catch{et(),j=!1,toast("Failed to start checkout. Try again.","error")}}}async function ce(){try{const t=await api("GET","/api/crm/billing-portal");t.success&&t.url?window.location.href=t.url:toast(t.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function pe(){const t=document.getElementById("supportMessage")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function ue(t){const e=l.editRooms.find(s=>s.id===t);if(!e){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+t)?.value.trim(),i=document.getElementById("edit-desc-"+t)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+t)?.value)||4,a=parseInt(document.getElementById("edit-units-"+t)?.value)||1,r={id:t,name:o||e.name,description:i||"",amenities:e.amenities||"",maxOccupancy:n,totalUnits:a};try{const s=await api("POST","/api/crm/rooms",r);if(s&&s.success===!1){toast(s.message||"Failed to save","error");return}e.name=r.name,e.description=r.description,e.maxOccupancy=n,e.totalUnits=a,toast("Room saved!","success")}catch(s){toast("Failed to save: "+(s.message||""),"error")}}async function ge(t,e){const o=Array.from(t.target.files);if(!o.length)return;const n=document.getElementById("edit-card-"+e)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+e+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+e+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let a=0,r="";for(const u of o){try{const y=await nt(e,u);if(y.image){const w=l.editRooms.find(k=>k.id===e);w&&(w.images||(w.images=[]),w.images.push(y.image),w.imageUrl||(w.imageUrl=y.image.url)),a++}}catch(y){r=y.message||"Upload failed"}const g=document.getElementById("upload-progress-"+e);g&&(g.textContent=a+" / "+o.length)}const s=document.getElementById("upload-spinner-"+e);s&&s.remove(),N(),a>0&&(l.launchStatus=null),H(),a>0?toast(a+" photo"+(a!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(r||"Upload failed","error")}function St(t,e=512){return new Promise((o,i)=>{const n=new Image,a=URL.createObjectURL(t);n.onload=()=>{try{const r=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-r)/2,u=(n.naturalHeight-r)/2,g=document.createElement("canvas");g.width=e,g.height=e;const y=g.getContext("2d");y.imageSmoothingQuality="high",y.drawImage(n,s,u,r,r,0,0,e,e),URL.revokeObjectURL(a),g.toBlob(w=>w?o(w):i(new Error("crop failed")),"image/png",.92)}catch(r){URL.revokeObjectURL(a),i(r)}},n.onerror=()=>{URL.revokeObjectURL(a),i(new Error("load failed"))},n.src=a})}function Bt(){const t=document.getElementById("appsAppIconPreview");t&&(t.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function lt(t){const e=document.getElementById("appsAppIconPreview");e&&(e.style.background="#fff",e.style.border="1px solid var(--border)",e.style.padding="0",e.innerHTML='<img src="'+t+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function ot(){const t=document.getElementById("appsAppIconPreview");if(!t)return;if(l.activeHotelAppIcon){lt(l.activeHotelAppIcon);return}const e=(l.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨";t.style.background="transparent",t.style.border="none",t.style.padding="0",t.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+e+"</span>"}async function me(t){const e=t.files&&t.files[0];if(!e)return;Bt();const o=new FormData;try{const i=await St(e,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",e)}try{const i=it(),n=new URLSearchParams;l.activeHotelId&&n.set("hotelId",l.activeHotelId),i&&n.set("token",i);const r=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(r.success&&r.appIconUrl){l.activeHotelAppIcon=r.appIconUrl,lt(r.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(l.activeHotelId||"")+"|"+r.appIconUrl+"|"+(l.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(r.message||"Failed to upload icon","error"),ot()}catch{toast("Failed to upload icon","error"),ot()}t.value=""}async function fe(t,e){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${t}/images/${e}`);const o=l.editRooms.find(i=>i.id===t);o&&o.images&&(o.images=o.images.filter(i=>i.id!==e),o.imageUrl=o.images[0]?.url||null),N(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function xe(t){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${t}`),toast("Room deleted","success"),at()}catch{toast("Failed to delete","error")}}function ye(){const t=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(t.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function he(){const t=document.getElementById("editNewRoomName").value.trim();t&&api("POST","/api/crm/rooms",{name:t,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),at()}).catch(()=>toast("Failed to add","error"))}const Tt={addAmenityPrompt:oe,advanceTourIfNeeded:H,changePin:ae,checklistGoTo:jt,checklistGoToRates:Nt,cleanupPostActivationTourUi:_,cleanupSettingsTourUi:F,closeAmenityPicker:Q,confirmAmenityPicker:ee,confirmEditAddRoom:he,copyBookingLink:se,copyBookingLinkFromChecklist:qt,deleteEditImage:fe,deleteEditRoom:xe,ensureTourBlurOverlay:R,finishPostActivationTour:G,getAmenityIcon:vt,getCrmAuthToken:it,getEditRoomImages:ht,goLive:le,guestBookingEngineUrl:xt,handoffToGuestAppsTour:gt,hideGoLiveOverlay:et,loadEditRooms:at,loadSettings:ft,openAmenityPicker:kt,openBillingPortal:ce,openEditAddRoom:ye,openGuestBookingEngine:_t,openPreviewSite:Yt,openTourAccordion:C,postRoomImageUpload:nt,queryTourSelector:M,removeAmenity:ie,renderEditRooms:st,renderEditRoomsCards:N,replayWalkthrough:Jt,resolveLiveTourElement:U,resolveTourHighlightEl:L,restoreAppIconPreview:ot,saveEditRoom:ue,saveHotelInfo:ne,saveRates:re,scrollTourTargetIntoView:ut,sendSupportMessage:pe,setAppIconPreviewImage:lt,setAppIconPreviewLoading:Bt,settingsChangePin:Vt,settingsCopyLink:Ht,settingsSaveRates:Gt,settingsSendSupport:Wt,settingsUploadPhoto:Ut,showActivatedModal:Zt,showEditRoomPhoto:bt,showFinaleMockModal:D,showGoLiveOverlay:Et,showOnboardingQuestions:Kt,showTestDriveModal:mt,showWelcomeModal:yt,squareCropImage:St,startPostActivationTabTour:rt,startSettingsTour:tt,stepEditRoomPhoto:Xt,toggleAmenityPreset:te,toggleSection:de,tourAnchorRect:X,tourElementRect:Z,updatePreviewSiteBar:Qt,uploadAppIcon:me,uploadEditImages:ge};function be(){Mt(Tt)}const Ee=Object.freeze(Object.defineProperty({__proto__:null,default:Tt,install:be},Symbol.toStringTag,{value:"Module"}));export{we as a,Ee as b,l as c,Mt as e,ke as s};
