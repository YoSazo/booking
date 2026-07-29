const u={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",assistantData:null,assistantLoading:!1,assistantError:"",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,frontdeskInstallReported:!1,guestPushSubscriberCount:0,bookingReviewSettings:{reminderMinutes:15,maxReminders:3},bookingConflicts:[],_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let Q=null;function Ze(){return typeof lucide<"u"?Promise.resolve():Q||(Q=new Promise((t,e)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>t(),o.onerror=()=>e(new Error("lucide load failed")),document.head.appendChild(o)}),Q)}async function Vt(t){if(!t||!t.type.startsWith("image/")||t.type==="image/webp"&&t.size<4e5)return t;try{const e=await createImageBitmap(t),o=1600,i=1200;let r=e.width,n=e.height;const a=Math.min(1,o/r,i/n);r=Math.round(r*a),n=Math.round(n*a);const s=document.createElement("canvas");s.width=r,s.height=n,s.getContext("2d").drawImage(e,0,0,r,n),e.close();const p=await new Promise((b,k)=>{s.toBlob(S=>S?b(S):k(new Error("encode failed")),"image/webp",.82)}),f=(t.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([p],f+".webp",{type:"image/webp"})}catch{return t}}function Xe(){const t=()=>{u.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(t,{timeout:2500}):setTimeout(t,600)}const Gt=["cancelled","canceled","released"];function to(t){return t?Gt.includes(String(t.status||"").trim().toLowerCase()):!0}function Yt(t){Object.assign(window,t)}const _t=14,Wt=10;function pt(t,e,o){return Math.max(e,Math.min(t,o))}function C(t,e,o,i){return{left:t,top:e,width:o,height:i,right:t+o,bottom:e+i}}function Kt(){const t=window.visualViewport,e=t?t.offsetLeft:0,o=t?t.offsetTop:0,i=t?t.width:window.innerWidth,r=t?t.height:window.innerHeight;return C(e,o,i,r)}function M(t){if(!t||!t.isConnected)return null;const e=t.getBoundingClientRect();return e.width<2||e.height<2?null:C(e.left,e.top,e.width,e.height)}function Qt(t,e){if(!t||!e)return 0;const o=Math.max(0,Math.min(t.right,e.right)-Math.max(t.left,e.left)),i=Math.max(0,Math.min(t.bottom,e.bottom)-Math.max(t.top,e.top));return o*i}function Jt(t,e){return Math.max(0,e.left-t.left)+Math.max(0,t.right-e.right)+Math.max(0,e.top-t.top)+Math.max(0,t.bottom-e.bottom)}function Zt(t,e){let o=0;for(const i of e||[]){const r=document.querySelector(i);if(!r||getComputedStyle(r).display==="none")continue;const n=M(r);!n||n.bottom<t.bottom-2||n.top>=t.bottom||(o=Math.max(o,t.bottom-n.top))}return o}function Xt(t){const e=Kt(),o=t.margin??_t,i=Math.max(Number(t.bottomInset||0),Zt(e,t.avoidBottomSelectors)),r=e.left+o+Number(t.leftInset||0),n=e.top+o+Number(t.topInset||0),a=e.right-o-Number(t.rightInset||0),s=e.bottom-o-i;return C(r,n,Math.max(1,a-r),Math.max(1,s-n))}function te(t){return t==="above"||t==="top"?["top","bottom","right","left"]:t==="right"?["right","left","bottom","top"]:t==="left"?["left","right","bottom","top"]:["bottom","top","right","left"]}function ee(t,e,o,i,r){return t==="top"?C(e.left+(e.width-o)/2,e.top-i-r,o,i):t==="right"?C(e.right+r,e.top+(e.height-i)/2,o,i):t==="left"?C(e.left-o-r,e.top+(e.height-i)/2,o,i):C(e.left+(e.width-o)/2,e.bottom+r,o,i)}function oe(t,e){const o=pt(t.left,e.left,Math.max(e.left,e.right-t.width)),i=pt(t.top,e.top,Math.max(e.top,e.bottom-t.height));return C(o,i,t.width,t.height)}function ie(t){let e=t&&t.parentElement;for(;e&&e!==document.body&&e!==document.documentElement;){const o=getComputedStyle(e),i=o.overflowY||o.overflow;if(/(auto|scroll)/.test(i)&&e.scrollHeight>e.clientHeight+1)return e;e=e.parentElement}return null}function ne(t,e){if(!t||Math.abs(e)<1)return!1;const o=ie(t);return o?o.scrollTop+=e:window.scrollBy({top:e,left:0,behavior:"auto"}),!0}function lt(t,e){const o=M(t);if(!o||e.height<60)return!1;let i;return o.height<=e.height?i=pt(o.top,e.top,e.bottom-o.height):i=e.bottom-o.height,ne(t,o.top-i)}function zt(t,e){const o=getComputedStyle(t);for(const n of o)e.style.setProperty(n,o.getPropertyValue(n),o.getPropertyPriority(n));const i=t.children,r=e.children;for(let n=0;n<i.length;n+=1)r[n]&&zt(i[n],r[n])}function re(t){t.removeAttribute("id"),t.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"))}function ae(t,e){const o=t.querySelectorAll("input, textarea, select"),i=e.querySelectorAll("input, textarea, select");o.forEach((r,n)=>{const a=i[n];a&&(r.type==="checkbox"||r.type==="radio"?a.checked=r.checked:a.value=r.value)})}function se(t,e={}){if(!t||!t.isConnected||e.disabled||!M(t))return null;const i=t.cloneNode(!0);re(i),zt(t,i),ae(t,i),i.setAttribute(e.attribute||"data-adaptive-tour-spotlight","1"),i.setAttribute("aria-hidden","true"),i.style.position="fixed",i.style.margin="0",i.style.maxWidth="none",i.style.zIndex=String(e.zIndex||100002),i.style.pointerEvents="none",i.style.transform="none",e.prepareClone?.(i,t);const r=t.style.visibility;e.hideSource&&(t.style.visibility="hidden"),document.body.appendChild(i);const n=()=>{const s=M(t);return s?(i.style.display="",i.style.left=`${s.left}px`,i.style.top=`${s.top}px`,i.style.width=`${s.width}px`,i.style.height=`${s.height}px`,s):(i.style.display="none",null)},a=()=>{i.remove(),e.hideSource&&(t.style.visibility=r)};return n(),{element:i,source:t,update:n,destroy:a}}function de({tooltip:t,panel:e,target:o,anchor:i,spotlight:r,options:n={}}){if(!t||!e||!o)return null;let a=0,s=!1,p=!1,f=!1,b="";const k=(d=!0)=>{if(s||!t.isConnected||!o.isConnected)return null;const c=Xt(n),v=`${c.left}:${c.top}:${c.width}:${c.height}`;b&&b!==v&&(p=!1,d=!0),b=v;const l=M(i)||M(o),m=M(o);if(!l||!m)return null;const x=Math.min(Number(n.maxWidth||380),c.width);t.style.position="fixed",t.style.right="auto",t.style.bottom="auto",t.style.width=`${x}px`,t.style.maxWidth=`${x}px`,t.style.margin="0",t.style.justifyContent="flex-start",e.style.maxHeight=`${Math.max(120,c.height)}px`;const y=Math.min(e.offsetHeight||t.offsetHeight||190,c.height),h=Number(n.gap??Wt);d&&!p&&n.autoScroll!==!1&&m.height+y+h<=c.height&&(p=lt(o,c),p&&requestAnimationFrame(()=>k(!1)));const w=te(n.preferredPlacement).map((z,O)=>{const U=ee(z,l,x,y,h),Et=Jt(U,c),St=Qt(U,m);return{placement:z,index:O,raw:U,overflow:Et,overlap:St,score:Et*1e5+St*100+O}}),T=w.find(z=>z.overflow<.5&&z.overlap<1),B=T||w.slice().sort((z,O)=>z.score-O.score)[0],I=n.forceDock===!0||!T;let A="floating",D;if(I){A="docked";const z=Math.min(y,Number(n.dockMaxHeight||Math.max(180,c.height*.42)),c.height);e.style.maxHeight=`${z}px`;const O=Math.min(e.offsetHeight||z,z);if(D=C(c.left+(c.width-x)/2,c.bottom-O,x,O),d&&!p&&n.autoScroll!==!1){const U=C(c.left,c.top,c.width,Math.max(60,D.top-h-c.top));p=lt(o,U),p&&requestAnimationFrame(()=>k(!1))}}else if(D=oe(B.raw,c),d&&!p&&n.autoScroll!==!1){let z=c;if(B.placement==="bottom")z=C(c.left,c.top,c.width,Math.max(60,D.top-h-c.top));else if(B.placement==="top"){const O=D.bottom+h;z=C(c.left,O,c.width,Math.max(60,c.bottom-O))}p=lt(o,z),p&&requestAnimationFrame(()=>k(!1))}return t.dataset.tourLayoutMode=A,t.dataset.tourPlacement=I?"bottom-dock":B.placement,t.style.left=`${D.left}px`,t.style.top=`${D.top}px`,r?.update?.(),n.onLayout?.({mode:A,placement:t.dataset.tourPlacement,viewport:c,targetRect:M(o),anchorRect:M(i)||M(o),tooltipRect:D}),{mode:A,placement:t.dataset.tourPlacement,rect:D}},S=(d=!1)=>{f=f||d===!0,!(s||a)&&(a=requestAnimationFrame(()=>{a=0;const c=f;f=!1,k(c)}))},P=()=>{p=!1,S(!0)},N=typeof ResizeObserver=="function"?new ResizeObserver(S):null;N?.observe(o),i&&i!==o&&N?.observe(i),N?.observe(e),window.addEventListener("resize",P),window.addEventListener("orientationchange",P),window.addEventListener("scroll",S,!0),window.visualViewport&&(window.visualViewport.addEventListener("resize",P),window.visualViewport.addEventListener("scroll",S));const dt=()=>{s=!0,a&&cancelAnimationFrame(a),N?.disconnect(),window.removeEventListener("resize",P),window.removeEventListener("orientationchange",P),window.removeEventListener("scroll",S,!0),window.visualViewport&&(window.visualViewport.removeEventListener("resize",P),window.visualViewport.removeEventListener("scroll",S))},g=k(!0);return{destroy:dt,reposition:()=>k(!1),result:g}}function H(t){return typeof window<"u"&&typeof window[t]=="function"?window[t]:null}function et(...t){return H("setFilter")?.(...t)}function Bt(...t){return H("setBookingsSubview")?.(...t)}function le(...t){return H("toast")?.(...t)}function ot(...t){return H("updateGoLiveBanner")?.(...t)}function ce(...t){return H("seedTourRevenueShell")?.(...t)}function pe(...t){return H("finishTourHydration")?.(...t)}function ue(...t){return H("goLive")?.(...t)}let _=null,it=null,j=null;function $(){if(document.getElementById("frontdeskTourPolishStyle"))return;const t=document.createElement("style");t.id="frontdeskTourPolishStyle",t.textContent=`
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
    @media (max-width: 420px) {
      .tour-panel {
        border-radius: 16px;
        padding: 13px;
      }
      .tour-title {
        font-size: 16px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.42;
      }
      .tour-actions {
        flex-wrap: wrap;
      }
      .tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @media (max-height: 680px) {
      .tour-panel {
        max-height: calc(100dvh - 20px);
        padding: 12px;
        border-radius: 16px;
      }
      .tour-progress-row {
        margin-bottom: 8px;
      }
      .tour-title {
        font-size: 16px;
        margin-bottom: 5px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.38;
        margin-bottom: 10px;
      }
      .tour-btn {
        min-height: 38px;
        padding: 8px 11px;
      }
      .tour-btn-primary {
        padding: 9px 16px;
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
  `,document.head.appendChild(t)}function ft(){_&&(document.removeEventListener("keydown",_),_=null)}function ge(t){ft(),_=e=>{if(e.defaultPrevented)return;const o=e.target&&e.target.tagName?e.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||e.target?.isContentEditable||(e.key==="Escape"?(e.preventDefault(),t.onSkip?.()):e.key==="Enter"||e.key==="ArrowRight"?(e.preventDefault(),t.onNext?.()):e.key==="ArrowLeft"&&(e.preventDefault(),t.onBack?.()))},document.addEventListener("keydown",_)}function ct(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function R(t){$();const e=t||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText="position:fixed;inset:0;z-index:99998;",document.body.appendChild(o)),o.style.background=e.dim||"rgba(17,24,39,0.22)",o.style.pointerEvents=e.blockPointer?"auto":"none",e.lockScroll&&(document.body.style.overflow="hidden"),o}const Z="rgba(17,24,39,0.42)";function V(){const t=document.getElementById("tourTooltip"),e=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!t||e)return Promise.resolve();t.style.pointerEvents="none";const o=t.firstElementChild;return o&&(o.style.animation="tourPanelOut 0.16s ease-in forwards"),new Promise(i=>setTimeout(i,150))}function me(t,e){return j?.destroy(),j=se(t,{attribute:"data-tour-spotlight-clone",zIndex:99999,prepareClone(o){o.style.boxShadow=e?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",o.style.outline=e?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",o.style.outlineOffset=e?.spotlightOutlineOffset??"2px",e?.spotlightBackground&&(o.style.background=e.spotlightBackground,o.style.backgroundColor=e.spotlightBackground),e?.spotlightBorderRadius&&(o.style.borderRadius=e.spotlightBorderRadius)}}),j?.element||null}function F(t){const e=t||{};ft(),it?.destroy(),it=null,j?.destroy(),j=null;const o=document.getElementById("tourTooltip");o&&o.remove();const i=document.getElementById("tourBlurOverlay");i&&!e.keepOverlay&&i.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(n=>n.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(n=>{n.style.position=n.dataset.tourOrigPosition||"",n.style.zIndex=n.dataset.tourOrigZIndex||"",n.style.isolation=n.dataset.tourOrigIsolation||"",n.style.boxShadow=n.dataset.tourOrigBoxShadow||"",n.style.outline=n.dataset.tourOrigOutline||"",n.style.outlineOffset=n.dataset.tourOrigOutlineOffset||"",n.style.transition=n.dataset.tourOrigTransition||"",n.style.borderRadius=n.dataset.tourOrigBorderRadius||"",n.style.opacity=n.dataset.tourOrigOpacity||"";const a=n.dataset.tourOrigBackground||"",s=n.dataset.tourOrigBackgroundColor||"";s?n.style.backgroundColor=s:n.style.removeProperty("background-color"),a?n.style.background=a:n.style.removeProperty("background"),n.removeAttribute("data-tour-highlighted"),delete n.dataset.tourOrigPosition,delete n.dataset.tourOrigZIndex,delete n.dataset.tourOrigIsolation,delete n.dataset.tourOrigBoxShadow,delete n.dataset.tourOrigOutline,delete n.dataset.tourOrigOutlineOffset,delete n.dataset.tourOrigTransition,delete n.dataset.tourOrigBackground,delete n.dataset.tourOrigBackgroundColor,delete n.dataset.tourOrigBorderRadius,delete n.dataset.tourOrigOpacity});const r=document.getElementById("goLiveBanner");r&&r.dataset.tourHidden&&(delete r.dataset.tourHidden,typeof ot=="function"&&ot()),e.keepOverlay||(document.body.style.overflow="")}function fe(){const t=document.getElementById("tourTooltip"),e=Array.from(document.querySelectorAll("[data-tour-spotlight-clone]")),o=Array.from(document.querySelectorAll("[data-tour-highlighted]")),i=[t,...e,...o].filter(Boolean);return!i.length&&!o.length?(F({keepOverlay:!0}),Promise.resolve()):(ft(),window.matchMedia("(prefers-reduced-motion: reduce)").matches?(F({keepOverlay:!0}),Promise.resolve()):(t&&(t.style.pointerEvents="none"),i.forEach(n=>{n.style.transition="opacity 0.07s ease, transform 0.07s ease",n.style.opacity="1"}),requestAnimationFrame(()=>{i.forEach(n=>{n.style.opacity="0",n.id==="tourTooltip"&&(n.style.transform="translateY(4px)")})}),new Promise(n=>{setTimeout(()=>{F({keepOverlay:!0}),n()},85)})))}function xe(t){const e=[t,...document.querySelectorAll("[data-tour-spotlight-clone]"),...document.querySelectorAll("[data-tour-highlighted]")].filter(Boolean);e.forEach(o=>{o.style.transition="opacity 0.1s ease, transform 0.1s ease",o.style.opacity="0",o.id==="tourTooltip"&&(o.style.transform="translateY(4px)")}),requestAnimationFrame(()=>{e.forEach(o=>{o.style.opacity="1",o.id==="tourTooltip"&&(o.style.transform="translateY(0)")})})}function q(t,e){if(!e.openAccordion)return;const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const n=o.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}}function L(t){if(!t)return null;for(const e of String(t).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(e);if(o&&o.isConnected)return o}return null}function G(t,e){if(e.highlightSelector){const o=L(e.highlightSelector);if(o)return o}if(e.highlightCard){const o=e.accordionCard?document.querySelector(e.accordionCard):t&&t.closest?t.closest(".booking-card"):null;if(o)return o}return e.targetParent&&(t.closest(".booking-card")||t.closest(".accordion-body"))||t}function X(t,e){if(!e)return t;const o=String(e.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const r=document.querySelector(i);if(r&&r.isConnected)return r}if(e.accordionCard){const i=document.querySelector(e.accordionCard);if(i&&i.isConnected)return i}return t&&t.isConnected?t:null}function nt(t,e){if(!t||!t.isConnected)return null;const o=t.getBoundingClientRect();return o.width<2||o.height<2||!e&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function It(t,e){const o=L(t.anchorSelector);if(o){const i=nt(o,!0);if(i)return i}return nt(e,!0)}function Tt(t,e){const o=t.tooltipAnchorSelector||t.anchorSelector,i=L(o);if(i){const r=nt(i,!0);if(r)return r}return It(t,e)}function rt(t){const e=t||"auto";try{window.scrollTo({top:0,left:0,behavior:e})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const r=document.querySelector(i);r&&(r.scrollTop=0)})}function At(t,e,o){const i=o||{},r=e.scrollTarget||e.accordionCard,n=(r?L(r):null)||t;if(!n&&!e.scrollToTop)return Promise.resolve();const a=e.scrollBlock||"nearest",s=window.matchMedia("(prefers-reduced-motion: reduce)").matches,p=i.smooth&&!s?"smooth":u.settingsTourActive||s?"auto":"smooth";return new Promise(f=>{if(e.scrollToTop&&(rt(p),e.scrollToTopOnly)){requestAnimationFrame(()=>requestAnimationFrame(()=>{e.forcePageTop&&rt("auto"),f()}));return}if(!n){f();return}if(n.scrollIntoView({behavior:p,block:a,inline:"nearest"}),p==="auto"){requestAnimationFrame(()=>requestAnimationFrame(f));return}let b=!1;const k=()=>{b||(b=!0,window.removeEventListener("scrollend",S),clearTimeout(P),requestAnimationFrame(()=>requestAnimationFrame(f)))},S=()=>k();"onscrollend"in window&&window.addEventListener("scrollend",S,{once:!0});const P=setTimeout(k,520)})}function Ct(){F(),localStorage.setItem("settingsTourStep","handoff");const t=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&et("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const r=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof r=="function"&&r({chainFromSettingsTour:!0})},e=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof e=="function"?e().then(t).catch(t):t()}function Y(){F({keepOverlay:!0}),$(),u.settingsTourActive=!1,ot(),R({blockPointer:!0,lockScroll:!0,dim:Z});const t=document.createElement("div");if(t.id="tourTooltip",t.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
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
    </div>`,document.body.appendChild(t),!document.getElementById("tourModalAnimStyle")){const e=document.createElement("style");e.id="tourModalAnimStyle",e.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(e)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const o="https://"+(u.activeHotelDomain||u.activeHotelId+".mktel.co");navigator.clipboard.writeText(o).catch(()=>{}),V().then(()=>{F(),u.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),le("Booking link copied!","success"),pe(),Pt()})}}function Pt(t){$();const e=document.createElement("div");e.id="testDriveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{e.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{o(),ue()},document.getElementById("activateLaterBtn").onclick=()=>{o();const i=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');i&&et("bookings",i)}}function ut(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),Y();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),u.settingsTourActive=!0,ot(),ce();const t=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');t&&et("settings",t);function e(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!u.editRoomsLoadPromise)return;const c=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;c&&c()}e();const o=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the property name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center"},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] [data-tour-room-details-anchor="1"]',tooltipAnchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10,spotlightBackground:"#fff",spotlightBorderRadius:"12px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0"},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start"},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",subview:"bookings",customModal:"bookings"},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"bookings",subview:"revenue",waitForVisible:!0,scrollBlock:"start"},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function r(g){F(g)}function n(){V().then(()=>{r({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),Y()})}function a(g,d){return!(!g||!d||g.customModal||d.customModal||g.tab!==d.tab||!g.target||!d.target)}function s(g,d){if(g.customModal){f(g,d);return}requestAnimationFrame(()=>f(g,d))}function p(g){const d=g||{};if(d.keepCurrentUi||r({keepOverlay:!0}),document.body.style.overflow="",i>=o.length){r({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),Y();return}const c=o[i];if(c.subview==="revenue"&&!u.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}if(c.tab==="apps"&&!(isStandaloneApp()||u.frontdeskInstalled)&&c.target&&!c.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}if(c.customModal||R(),c.tab&&c.tab!==u.currentFilter){const v=document.querySelector(`.tab[data-nav-filter="${c.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${c.tab}"]`);if(v&&et(c.tab,v),c.tab==="bookings"&&c.subview&&Bt(c.subview),c.tab==="apps"){const l=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof l=="function"&&l(!0)}s(c,d);return}if(c.tab==="bookings"&&c.subview&&c.subview!==u.bookingsSubview){Bt(c.subview),s(c,d);return}s(c,d)}function f(g,d){const c=d||{};if(g.customModal==="homescreen"){c.keepCurrentUi&&r({keepOverlay:!0}),P();return}if(g.customModal==="bookings"){c.keepCurrentUi&&r({keepOverlay:!0}),dt();return}if(g.customModal==="availability"){c.keepCurrentUi&&r({keepOverlay:!0}),N();return}if(g.customModal==="finale"){c.keepCurrentUi&&r({keepOverlay:!0}),Y();return}if(g.customModal==="guestAppsStory"){c.keepCurrentUi&&r({keepOverlay:!0}),Ct();return}if(g.waitForVisible){const m=g.target.split(",").map(w=>w.trim());let x=0;const y=30;R();const h=u.settingsTourActive?60:200,E=()=>{if(x++,g.tab==="apps"){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}let w=null;for(const T of m)if(w=document.querySelector(T),w)break;if(w&&(g.openAccordion&&q(w,g),g.openAccordion||w.offsetParent!==null)){b(w,g,c);return}x<y?setTimeout(E,h):(i++,localStorage.setItem("settingsTourStep",String(i)),p())};E();return}function v(m){const x=m.target.split(",").map(y=>y.trim());for(const y of x){const h=document.querySelector(y);if(h&&!(!m.openAccordion&&h.offsetParent===null&&getComputedStyle(h).position!=="fixed"))return h}if(m.accordionCard){const y=document.querySelector(m.accordionCard);if(y)return y}return null}function l(m,x){const y=v(m);if(y){x(y);return}const h=m.tab==="settings"&&!m.customModal&&m.target,E=m.tab==="apps"&&!m.customModal&&m.target;if(!h&&!E){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}R();let w=0;if(h&&e(),E){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}const T=u.settingsTourActive?60:250,B=()=>{if(w++,E){const A=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof A=="function"&&A(!0)}const I=v(m);if(I){x(I);return}if(e(),E){const A=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof A=="function"&&A(!0)}w<48?setTimeout(B,T):(i++,localStorage.setItem("settingsTourStep",String(i)),p())};B()}l(g,m=>b(m,g,c))}function b(g,d,c){const v=c||{};if(q(g,d),g=G(g,d),(!g||!g.isConnected)&&(g=X(g,d),g&&(g=G(g,d))),!g){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}const l=g;R(),At(l,d,{smooth:!!v.keepCurrentUi}).then(()=>{if(d.forcePageTop&&rt("auto"),!l.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),p();return}q(l,d),v.keepCurrentUi&&(r({keepOverlay:!0}),R()),d.noHighlight||(l.dataset.tourOrigPosition||(l.dataset.tourOrigPosition=l.style.position||""),l.dataset.tourOrigZIndex||(l.dataset.tourOrigZIndex=l.style.zIndex||""),l.dataset.tourOrigIsolation||(l.dataset.tourOrigIsolation=l.style.isolation||""),l.dataset.tourOrigBoxShadow||(l.dataset.tourOrigBoxShadow=l.style.boxShadow||""),l.dataset.tourOrigOutline||(l.dataset.tourOrigOutline=l.style.outline||""),l.dataset.tourOrigOutlineOffset||(l.dataset.tourOrigOutlineOffset=l.style.outlineOffset||""),l.dataset.tourOrigTransition||(l.dataset.tourOrigTransition=l.style.transition||""),l.dataset.tourOrigBackground||(l.dataset.tourOrigBackground=l.style.background||""),l.dataset.tourOrigBackgroundColor||(l.dataset.tourOrigBackgroundColor=l.style.backgroundColor||""),l.dataset.tourOrigBorderRadius||(l.dataset.tourOrigBorderRadius=l.style.borderRadius||""),l.dataset.tourOrigOpacity||(l.dataset.tourOrigOpacity=l.style.opacity||""),l.style.position=l.style.position||"relative",l.style.zIndex="99999",l.style.isolation="isolate",l.style.transition="box-shadow 0.18s ease, outline 0.18s ease",l.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",l.style.outline="1px solid rgba(255,255,255,0.82)",l.style.outlineOffset="2px",d.spotlightBoxShadow!=null&&(l.style.boxShadow=d.spotlightBoxShadow),d.spotlightOutline!=null&&(l.style.outline=d.spotlightOutline),d.spotlightOutlineOffset!=null&&(l.style.outlineOffset=d.spotlightOutlineOffset),d.spotlightBackground&&(l.style.background=d.spotlightBackground,l.style.backgroundColor=d.spotlightBackground),d.spotlightBorderRadius&&(l.style.borderRadius=d.spotlightBorderRadius),v.keepCurrentUi&&(l.style.opacity="0"),l.setAttribute("data-tour-highlighted","1")),document.body.style.overflow="";const m=()=>{const h=L(d.anchorSelector)||l;if(d.freezeTooltip){const B=h&&h.isConnected?h.getBoundingClientRect():null;k(h,d,B&&B.width>=2?B:null,{fadeIn:!!v.keepCurrentUi});return}const E=X(l,d);let w=E?G(E,d):l;q(w,d);const T=d.tooltipAnchor?null:Tt(d,w);k(w||l,d,T,{fadeIn:!!v.keepCurrentUi})};if(d.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(m));return}const x=(y=0)=>{requestAnimationFrame(()=>{if(d.forcePageTop&&rt("auto"),d.tooltipAnchor){m();return}const h=X(l,d);let E=h?G(h,d):l;q(E,d);const w=Tt(d,E);if(!w&&y<4){requestAnimationFrame(()=>x(y+1));return}k(E||l,d,w,{fadeIn:!!v.keepCurrentUi})})};x(0)})}function k(g,d,c,v){const l=v||{},m=document.getElementById("tourTooltip");m&&m.remove(),$();const x=document.createElement("div");x.id="tourTooltip";const y=Math.min(i+1,o.length),h=Math.max(8,Math.min(100,Math.round(y/o.length*100))),E=ct(d.title||"Quick setup"),w=ct(d.text||""),T=d.primaryLabel||(i<o.length-1?"Next":"Got it"),B=i<=0;x.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",x.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${E}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${y} of ${o.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${h}%;"></div>
          </div>
        </div>
        <div class="tour-title">${E}</div>
        <p class="tour-copy">${w}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${B?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${ct(T)}</button>
        </div>
      </div>`,document.body.appendChild(x);const I=x.querySelector(".tour-panel"),A=L(d.tooltipAnchorSelector||d.anchorSelector)||g;d.noHighlight||me(g,d),it?.destroy(),it=de({tooltip:x,panel:I,target:g,anchor:A,spotlight:j,options:{preferredPlacement:d.tooltipPosition||"auto",maxWidth:380,gap:d.tooltipGap??10,autoScroll:d.autoScroll!==!1,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),x.style.visibility="visible",l.fadeIn&&xe(x),S()}function S(){const g=document.getElementById("tourNextBtn"),d=document.getElementById("tourSkipBtn"),c=y=>{if(y<0)return;const h=a(o[i],o[y]),E=()=>{i=y,localStorage.setItem("settingsTourStep",String(i)),p({keepCurrentUi:h})};fe().then(E)},v=()=>{c(i+1)},l=()=>{n()},m=()=>{i<=0||c(i-1)};g&&(g.onclick=v),d&&(d.onclick=l);const x=document.getElementById("tourBackBtn");x&&(x.onclick=m),ge({onNext:v,onBack:m,onSkip:l})}function P(){$(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms(),R({blockPointer:!0,lockScroll:!0,dim:Z});const g=u.activeHotelName||"Your Property",d=g.trim().charAt(0).toUpperCase(),c=g.length>10?g.slice(0,10):g,v="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",l="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",m="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",x=`<div style="${v}"><div style="${l}background:rgba(255,255,255,0.22);"></div><div style="${m}"></div></div>`,y=u.activeHotelAppIcon||"",h=y?`<img src="${y}" alt="" style="width:100%;height:100%;object-fit:contain;">`:d,E=y?`${l}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${l}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,w=`<div style="${v}"><div style="${E}">${h}</div><div style="${m}font-size:7.5px;color:#fff;font-weight:700;">${c}</div></div>`,T=[x,x,x,x,w,x,x,x].join(""),B=document.createElement("div");if(B.id="tourTooltip",B.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",B.innerHTML=`
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
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${g}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your property from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(B),!document.getElementById("tourModalAnimStyle")){const I=document.createElement("style");I.id="tourModalAnimStyle",I.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(I)}document.getElementById("tourNextBtn").onclick=()=>{V().then(()=>{r({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}}function N(){$(),R({blockPointer:!0,lockScroll:!0,dim:Z});let g=0;const d=[`<div style="padding:20px 18px 0;">
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
      </div>`],c=document.createElement("div");c.id="tourTooltip",c.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";let v=!1;function l(){const x=g>=d.length-1?"Next — Bookings →":"Next →",y=v?"none":"tourPanelIn 0.22s ease-out",h=v?"tourPageIn 0.18s ease-out":"none";c.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${y};">
          <div style="animation:${h};">
            ${d[g]}
          </div>
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${d.map((E,w)=>`<div style="width:8px;height:8px;border-radius:50%;background:${w===g?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${x}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,v=!0,document.getElementById("tourNextBtn").onclick=()=>{g<d.length-1?(g++,l()):V().then(()=>{r({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}}if(document.body.appendChild(c),l(),!document.getElementById("tourModalAnimStyle")){const m=document.createElement("style");m.id="tourModalAnimStyle",m.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(m)}}function dt(){$(),R({blockPointer:!0,lockScroll:!0,dim:Z});let g=0,d=!1;const c=[`
          <div style="padding:20px 18px 0;text-align:center;">
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Bookings</div>
            <div style="font-size:17px;font-weight:800;color:#1a1a2e;">A guest books. You see everything.</div>
            <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 14px;">The guest is confirmed immediately. The booking stays marked until you verify the room.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:1px solid #D8E4DC;border-radius:16px;overflow:hidden;box-shadow:0 8px 22px rgba(26,43,34,0.07);">
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
                  <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:11px;font-weight:750;padding:4px 9px;border-radius:20px;">● Needs verification</span>
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
                  <div style="font-size:11px;color:#9A3412;line-height:1.4;"><strong>Already confirmed.</strong><br>Check your other calendars, then verify.</div>
                  <div style="font-size:18px;">✓</div>
              </div>
            </div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Booking alerts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">See the important details immediately.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 15px;">The notification shows the room, stay, guest, and amount. Tap it to open the confirmed booking.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="max-width:318px;margin:0 auto 14px;padding:60px 10px 16px;border-radius:31px;background:linear-gradient(155deg,#B5C8C0 0%,#DCE5E1 48%,#AFC2BA 100%);box-shadow:0 12px 28px rgba(26,43,34,.15);">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;background:rgba(247,247,249,.94);border:.5px solid rgba(255,255,255,.78);border-radius:19px;padding:11px 13px 12px;text-align:left;box-shadow:0 2px 8px rgba(0,0,0,.11);backdrop-filter:blur(18px);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
                <div style="width:23px;height:23px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="/marketellogo.svg" alt="" style="width:18px;height:18px;object-fit:contain;">
                </div>
                <div style="font-size:10px;font-weight:600;letter-spacing:.02em;color:#737477;">FRONT DESK</div>
                <div style="margin-left:auto;font-size:10px;color:#8E8E93;">now</div>
              </div>
              <div style="font-size:13px;font-weight:650;color:#111114;line-height:1.25;margin-bottom:2px;">New confirmed booking</div>
              <div style="font-size:12px;color:#2C2C2E;line-height:1.38;">King Room · Jun 15–18<br>Sarah Johnson · $284 due at check-in</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:9px;padding:11px 12px;background:#F8FAF9;border:1px solid #E1E9E4;border-radius:12px;text-align:left;">
            <div style="width:28px;height:28px;border-radius:50%;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0;">→</div>
            <div style="font-size:11px;color:#4B5D52;line-height:1.45;"><strong style="color:#1A2B22;">Tap to review.</strong> The booking opens with the full details and your next action.</div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Stay ahead of conflicts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">Remind, review, then correct availability.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">Choose how often to be reminded until you check. If a walk-in or another channel already took the room, cancel this booking and update Availability.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px 12px;margin-bottom:9px;">
            <div style="font-size:9px;color:#6B7280;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">If I have not reviewed it</div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:9px 10px;font-size:11px;font-weight:750;color:#1A2B22;">
              <span>Remind every 15 minutes · up to 3 times</span><span style="color:#9CA3AF;">▾</span>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #D8E4DC;border-radius:14px;padding:13px;box-shadow:0 6px 18px rgba(26,43,34,0.06);">
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
            <div style="background:#B91C1C;color:#fff;border-radius:10px;padding:10px;text-align:center;font-size:11px;font-weight:800;">Room changed? Cancel this booking</div>
          </div>
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px;margin-top:9px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:10px;font-weight:850;color:#1A2B22;">Then update Availability</div><div style="font-size:9px;color:#2E7D5B;font-weight:800;">Jun 15–17</div></div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
              ${["13","14","15","16","17","18","19"].map((m,x)=>`<div style="aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;${x>=2&&x<=4?"background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;text-decoration:line-through;":"background:#fff;color:#7B8C82;border:1px solid #E5ECE8;"}">${m}</div>`).join("")}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:8px 9px;font-size:10px;font-weight:750;color:#1A2B22;"><span>0 rooms available</span><span style="color:#9CA3AF;">▾</span></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px;">
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">✓</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">You checked it</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">↩</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Cancel if needed</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">▦</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Dates stop selling</div>
            </div>
          </div>
        </div>`],v=document.createElement("div");v.id="tourTooltip",v.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";const l=()=>{const m=g>=c.length-1,x=g===0?"Next — Phone alerts →":g===1?"Next — Avoid conflicts →":"Next — Availability →",y=d?"none":"tourPanelIn 0.22s ease-out",h=d?"tourPageIn 0.18s ease-out":"none";v.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${y};">
          <div style="animation:${h};">${c[g]}</div>
          <div style="padding:2px 18px 7px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;">
              ${c.map((E,w)=>`<div style="width:8px;height:8px;border-radius:50%;background:${w===g?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:750;cursor:pointer;">${x}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,d=!0,document.getElementById("tourNextBtn").onclick=()=>{if(!m){g++,l();return}V().then(()=>{r({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),p()})},document.getElementById("tourSkipBtn").onclick=()=>{n()}};if(document.body.appendChild(v),l(),!document.getElementById("tourModalAnimStyle")){const m=document.createElement("style");m.id="tourModalAnimStyle",m.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(m)}}p()}async function Ot(){const t=document.getElementById("settingsList");if(t){t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const e=await api("GET","/api/crm/verify"),i="https://"+(e?.domain||u.activeHotelId+".mktel.co"),r="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),n=await api("GET","/api/crm/rooms");let a={nightly:69,weekly:299,monthly:999};n?.rates&&(a=n.rates);const s=n?.rooms||[];let p="";e?.subscribed||(p+=goLiveInlineCardHtml()),s.length?s.forEach(f=>{const b=f.images&&f.images.length>0;p+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${b?`<img src="${f.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${b?"Change Photo":"+ Add Photo"}
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
          <div style="text-align:center;margin-top:20px;"><img src="${r}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
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
    `,t.innerHTML=p}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function ye(){const t=document.getElementById("settings-booking-url");t&&navigator.clipboard.writeText(t.value).then(()=>{localStorage.setItem("linkCopied","1"),W(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function he(){localStorage.setItem("settingsTourDone","1");const t=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",t);let e=0;const o=setInterval(()=>{e++;const i=document.getElementById("edit-rate-nightly");if(i||e>20){if(clearInterval(o),!i)return;const r=i.closest(".accordion-body");if(r&&r.style.display==="none"){r.style.display="block";const n=r.previousElementSibling?.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const n=document.getElementById("checklistPointer");n&&n.remove();const a=i.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${a.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const p=document.getElementById("checklistPointer");p&&p.remove()},6e3)},1e3)},100)}},200)}function ve(){const e="https://"+(u.activeHotelDomain||u.activeHotelId+".mktel.co");navigator.clipboard.writeText(e).then(()=>{localStorage.setItem("linkCopied","1"),W(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function be(t,e){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const r=setInterval(()=>{i++;const n=document.querySelector(t);if(n||i>20){if(clearInterval(r),!n)return;n.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const s=n.getBoundingClientRect(),p=document.createElement("div");p.id="checklistPointer",p.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,p.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${e}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(p),setTimeout(()=>{const f=document.getElementById("checklistPointer");f&&f.remove()},6e3)},1e3)}},200)}function xt(){const t=String(u.token||localStorage.getItem("crmToken")||"").trim();return t&&(u.token=t),t}async function yt(t,e){const o=xt();if(!o)throw new Error("Not logged in");const i=await Vt(e),r=new FormData;r.append("image",i,i.name||"room.webp");const n=new URLSearchParams;u.activeHotelId&&n.set("hotelId",u.activeHotelId),n.set("token",o);const a=await fetch(`/api/crm/rooms/${t}/images?${n}`,{method:"POST",headers:{"x-crm-token":o},body:r}),s=await a.json().catch(()=>({}));if(!a.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${a.status})`);return s}async function we(t,e){const o=t.target.files[0];if(o)try{await yt(e,o),toast("Photo uploaded!","success"),Ot()}catch(i){toast(i.message||"Upload failed","error")}}async function ke(){const t=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function Ee(){const t=document.getElementById("settings-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");u.token=t,u.isMasterPin=!1;try{localStorage.setItem("crmToken",u.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(e){toast(e.message||"Failed to change PIN","error")}}async function Se(){const t=document.getElementById("settings-support-msg")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function Be(){const t=u.activeHotelDomain||u.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(u.activeHotelId)+"&preview=1":"https://"+t+"?preview=1";window.open(o,"_blank")}function Rt(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&u.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(u.activeHotelId);const e=u.activeHotelDomain||"";return e?"https://"+e+"/":""}function Te(){const t=Rt();if(!t){toast("Your booking domain is still setting up.","info");return}window.open(t,"_blank")}function ze(){const t=document.getElementById("previewSiteBar");t&&(t.style.display=u.currentFilter==="settings"?"block":"none")}function W(){if(localStorage.getItem("settingsTourDone"))return;const t=parseInt(localStorage.getItem("settingsTourStep")||"0"),e=u.editRooms.some(a=>a.images&&a.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");t===2&&e&&localStorage.setItem("settingsTourStep","3"),t===3&&i&&localStorage.setItem("settingsTourStep","4"),t===4&&o&&localStorage.setItem("settingsTourStep","5");const r=document.getElementById("tourTooltip");r&&r.remove();const n=document.getElementById("tourBlurOverlay");n&&n.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(a=>{a.style.position=a.dataset.tourOrigPosition||"",a.style.zIndex=a.dataset.tourOrigZIndex||"",a.style.isolation=a.dataset.tourOrigIsolation||"",a.style.boxShadow=a.dataset.tourOrigBoxShadow||"",a.style.outline=a.dataset.tourOrigOutline||"",a.style.outlineOffset=a.dataset.tourOrigOutlineOffset||"",a.style.transition=a.dataset.tourOrigTransition||"",a.style.borderRadius=a.dataset.tourOrigBorderRadius||"",a.style.opacity=a.dataset.tourOrigOpacity||"";const s=a.dataset.tourOrigBackground||"",p=a.dataset.tourOrigBackgroundColor||"";p?a.style.backgroundColor=p:a.style.removeProperty("background-color"),s?a.style.background=s:a.style.removeProperty("background"),a.removeAttribute("data-tour-highlighted"),delete a.dataset.tourOrigPosition,delete a.dataset.tourOrigZIndex,delete a.dataset.tourOrigIsolation,delete a.dataset.tourOrigBoxShadow,delete a.dataset.tourOrigOutline,delete a.dataset.tourOrigOutlineOffset,delete a.dataset.tourOrigTransition,delete a.dataset.tourOrigBackground,delete a.dataset.tourOrigBackgroundColor,delete a.dataset.tourOrigBorderRadius,delete a.dataset.tourOrigOpacity}),document.body.style.overflow=""}function Ie(){let t=0;const e={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many bookable rooms or units do you offer?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let r=document.getElementById("onboardingOverlay");if(r&&r.remove(),t>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",e).catch(()=>{})}catch{}Mt();return}const n=o[t],a=document.createElement("div");a.id="onboardingOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",n.type==="text"?(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${n.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(a),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(e[n.key]=s,t++,i())}):(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${t+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${n.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(a),a.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{e[n.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{t++,i()},250)})}))}i()}function Ae(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const t=new URL(window.location.href);t.searchParams.set("welcome","1"),t.searchParams.delete("tab");const e=t.pathname+t.search+t.hash;if(e===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(e)}function Mt(){const t=document.createElement("div");t.id="welcomeModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function e(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const r=new URL(window.location);r.searchParams.delete("welcome"),window.history.replaceState({},"",r)}catch{}const i=typeof ut=="function"?ut:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),t.remove()}function o(){t.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏡</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=e}document.body.appendChild(t),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function at(){const t=document.getElementById("postActivationTourTooltip");t&&t.remove();const e=document.getElementById("postActivationTourOverlay");e&&e.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function tt(){at(),localStorage.setItem("postActivationTourDone","1");const t=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",t)}catch{}}function ht(){if(localStorage.getItem("postActivationTourDone")){tt();return}at();const t=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. Once phone setup is complete, new bookings can alert you even when Front Desk is closed."},{tab:"apps",navFilter:"apps",text:"<strong>Last step: set up your phone.</strong> No App Store needed. Follow the 3 steps here, then turn on booking alerts so confirmed reservations and guest messages can reach you."}];let e=0;function o(){if(at(),e>=t.length){tt();return}const i=t[e],r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&setFilter(i.tab,r);const n=document.createElement("div");n.id="postActivationTourOverlay",n.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(n),document.body.style.overflow="hidden",setTimeout(()=>{const a=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);a&&(a.setAttribute("data-post-activation-highlight","1"),a.style.position="relative",a.style.zIndex="100003",a.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",a.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=a?a.getBoundingClientRect():{left:24,bottom:80,width:200},p=document.createElement("div");p.id="postActivationTourTooltip";const f=Math.min(300,window.innerWidth-32),b=Math.max(16,Math.min(s.left+s.width/2-f/2,window.innerWidth-f-16)),k=Math.min(s.bottom+14,window.innerHeight-180);p.style.cssText=`position:fixed;z-index:100004;left:${b}px;top:${k}px;max-width:${f}px;width:${f}px;`;const S=e>=t.length-1;p.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${e+1} / ${t.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${S?"Set up this phone":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(p),document.getElementById("postActivationTourNext").onclick=()=>{e+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{tt()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=ht;function Ce(){if(document.getElementById("activatedModalOverlay"))return;const t=u.activeHotelDomain||(u.activeHotelId?u.activeHotelId+".mktel.co":""),e="Bookings and Guest App",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
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
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),ht()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function vt(){if(isEditPageDomReady())return;if(u.editRoomsLoadPromise)return u.editRoomsLoadPromise;const t=document.getElementById("editRoomsList");if(t){u.editRoomsLoadPromise=(async()=>{t.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[e,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!e.rooms)throw new Error("No data");u.editRooms=e.rooms;const i=o?.hotelName||"";i&&(u.activeHotelName=i),o&&(u.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const r=o?.hotelSubtitle||"",n=o?.hotelAddress||"",a=o?.hotelPhone||"",s=o?.appIconUrl||"";u.activeHotelAppIcon=s,updateFrontdeskManifestLink();let p={nightly:69,weekly:299,monthly:999,taxRate:.1};e.rates&&(p=e.rates);const b="https://"+(o?.domain||u.activeHotelId+".mktel.co"),k="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(b);let S=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${n}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-name" placeholder="Your Property Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
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
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${b}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${b.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
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
            <input type="text" id="edit-new-pin" value="${u.isMasterPin?"":u.token}" placeholder="${u.isMasterPin?"Enter a unique property PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${u.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
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
    `;t.innerHTML=S,K(),typeof lucide<"u"&&lucide.createIcons()}catch{t.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await u.editRoomsLoadPromise}finally{u.editRoomsLoadPromise=null}}}function bt(){K()}function K(){const t=document.getElementById("editRoomsCards");if(t){if(!u.editRooms.length){t.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}t.innerHTML=u.editRooms.map((e,o)=>{const i=(e.amenities||"").split("•").map(a=>a.trim()).filter(Boolean),r=(e.images||[]).filter(a=>a&&a.url),n=jsStr(e.id);return`
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
              ${r.map((a,s)=>`<button type="button" class="room-edit-image-dot ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${n}', ${s})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${n}')">
        </label>
      </div>
      ${r.length>1?'<div class="room-edit-thumbs">'+r.map((a,s)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${n}', ${s})"><img src="${esc(a.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${n}','${jsStr(a.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
      </div>
      <div class="room-edit-fields" style="padding:18px;">
        <div data-tour-room-details-anchor="1" style="margin-bottom:12px;">
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
            ${i.map(a=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${$t(a)} ${a} <button onclick="removeAmenity('${e.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function Dt(t){const e=u.editRooms.find(o=>String(o.id)===String(t));return(e&&e.images||[]).filter(o=>o&&o.url)}function Ft(t,e){const o=Dt(t);if(!o.length)return;const i=document.getElementById("edit-card-"+t);if(!i)return;const r=o.length,n=((Number(e)||0)%r+r)%r,a=i.querySelector(".room-edit-main-img");a&&(a.src=o[n].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(n));const s=i.querySelector(".room-edit-photo-count");s&&(s.textContent=n+1+" / "+r),i.querySelectorAll(".room-edit-image-dot").forEach((p,f)=>{p.classList.toggle("active",f===n),f===n?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((p,f)=>{p.classList.toggle("active",f===n),f===n?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")})}function Pe(t,e){const i=document.getElementById("edit-card-"+t)?.querySelector(".room-edit-photo"),r=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;Ft(t,r+e)}function $t(t){const e=t.toLowerCase();return e.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':e.includes("tv")||e.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':e.includes("fridge")||e.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':e.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':e.includes("housekeeping")||e.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':e.includes("bath")||e.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':e.includes("work")||e.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':e.includes("pet")||e.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':e.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':e.includes("kitchen")||e.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const Lt=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let wt=null;function Ht(t){wt=t;const o=(u.editRooms.find(n=>n.id===t)?.amenities||"").split("•").map(n=>n.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",st),i=document.getElementById("amenityPickerModal"));const r=document.getElementById("amenityPickerGrid");r.innerHTML=Lt.map(n=>{const a=o.some(s=>s.includes(n.key));return`<button onclick="toggleAmenityPreset(this,'${n.key}')" data-key="${n.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${a?"#2E7D5B":"#e5e7eb"};background:${a?"#E8F5EE":"white"};color:${a?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${n.icon}" style="width:14px;height:14px;"></i> ${n.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function Oe(t,e){const o=t.style.borderColor==="rgb(46, 125, 91)";t.style.borderColor=o?"#e5e7eb":"#2E7D5B",t.style.background=o?"white":"#E8F5EE",t.style.color=o?"#1a1a2e":"#2E7D5B"}function st(){document.getElementById("amenityPickerModal").style.display="none",wt=null}function Re(){const t=u.editRooms.find(r=>r.id===wt);if(!t){st();return}const e=document.getElementById("amenityPickerGrid"),o=[];e.querySelectorAll("button").forEach(r=>{if(r.style.background==="rgb(232, 245, 238)"){const n=Lt.find(a=>a.key===r.dataset.key);n&&o.push(n.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),t.amenities=o.join(" • "),st(),bt(),typeof lucide<"u"&&lucide.createIcons()}function Me(t){Ht(t)}function De(t,e){const o=u.editRooms.find(r=>r.id===t);if(!o)return;const i=(o.amenities||"").split("•").map(r=>r.trim()).filter(Boolean);o.amenities=i.filter(r=>r!==e).join(" • "),bt(),typeof lucide<"u"&&lucide.createIcons()}async function Fe(){const t=document.getElementById("edit-hotel-name")?.value.trim(),e=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),r=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:t,subtitle:e,address:o,phone:i,cancellationPolicy:r}),toast("Property info saved!","success")}catch{toast("Failed to save","error")}}async function $e(){const t=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,e=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:t,weekly:e,monthly:o}),localStorage.setItem("ratesChanged","1"),u.launchStatus=null,W(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function Le(){const t=document.getElementById("edit-new-pin")?.value.trim();if(!t||t.length<4){toast("PIN must be at least 4 characters","error");return}try{const e=await api("POST","/api/crm/change-pin",{newPin:t});if(!e.success)throw new Error(e.message||"Failed to change PIN");u.token=t,u.isMasterPin=!1;try{localStorage.setItem("crmToken",u.token)}catch{}toast("PIN updated!","success")}catch(e){toast(e.message||"Failed to change PIN","error")}}function He(t){navigator.clipboard.writeText(t).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function Ne(t){const e=t.nextElementSibling,o=t.querySelector(".accordion-arrow");e.style.display==="none"?(e.style.display="block",o&&(o.style.transform="rotate(90deg)")):(e.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let J=!1;function Nt(){if(document.getElementById("goLiveOverlay"))return;const t=document.createElement("div");t.id="goLiveOverlay",t.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",t.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(t)}function gt(){const t=document.getElementById("goLiveOverlay");t&&t.remove()}async function qe(){if(!J){J=!0,Nt();try{const t=await api("POST","/api/crm/go-live");if(t.success&&t.url){window.location.href=t.url;return}gt(),J=!1,toast(t.message||"Failed to start checkout","error")}catch{gt(),J=!1,toast("Failed to start checkout. Try again.","error")}}}async function je(){try{const t=await api("GET","/api/crm/billing-portal");t.success&&t.url?window.location.href=t.url:toast(t.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function Ue(){const t=document.getElementById("supportMessage")?.value.trim();if(!t){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:t}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function Ve(t){const e=u.editRooms.find(s=>s.id===t);if(!e){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+t)?.value.trim(),i=document.getElementById("edit-desc-"+t)?.value.trim(),r=parseInt(document.getElementById("edit-occ-"+t)?.value)||4,n=parseInt(document.getElementById("edit-units-"+t)?.value)||1,a={id:t,name:o||e.name,description:i||"",amenities:e.amenities||"",maxOccupancy:r,totalUnits:n};try{const s=await api("POST","/api/crm/rooms",a);if(s&&s.success===!1){toast(s.message||"Failed to save","error");return}e.name=a.name,e.description=a.description,e.maxOccupancy=r,e.totalUnits=n,toast("Room saved!","success")}catch(s){toast("Failed to save: "+(s.message||""),"error")}}async function Ge(t,e){const o=Array.from(t.target.files);if(!o.length)return;const r=document.getElementById("edit-card-"+e)?.querySelector("div:first-child");r&&(r.style.position="relative",r.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+e+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+e+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let n=0,a="";for(const p of o){try{const b=await yt(e,p);if(b.image){const k=u.editRooms.find(S=>S.id===e);k&&(k.images||(k.images=[]),k.images.push(b.image),k.imageUrl||(k.imageUrl=b.image.url)),n++}}catch(b){a=b.message||"Upload failed"}const f=document.getElementById("upload-progress-"+e);f&&(f.textContent=n+" / "+o.length)}const s=document.getElementById("upload-spinner-"+e);s&&s.remove(),K(),n>0&&(u.launchStatus=null),W(),n>0?toast(n+" photo"+(n!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(a||"Upload failed","error")}function qt(t,e=512){return new Promise((o,i)=>{const r=new Image,n=URL.createObjectURL(t);r.onload=()=>{try{const a=Math.min(r.naturalWidth,r.naturalHeight),s=(r.naturalWidth-a)/2,p=(r.naturalHeight-a)/2,f=document.createElement("canvas");f.width=e,f.height=e;const b=f.getContext("2d");b.imageSmoothingQuality="high",b.drawImage(r,s,p,a,a,0,0,e,e),URL.revokeObjectURL(n),f.toBlob(k=>k?o(k):i(new Error("crop failed")),"image/png",.92)}catch(a){URL.revokeObjectURL(n),i(a)}},r.onerror=()=>{URL.revokeObjectURL(n),i(new Error("load failed"))},r.src=n})}function jt(){const t=document.getElementById("appsAppIconPreview");t&&(t.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function kt(t){const e=document.getElementById("appsAppIconPreview");e&&(e.style.background="#fff",e.style.border="1px solid var(--border)",e.style.padding="0",e.innerHTML='<img src="'+t+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function mt(){const t=document.getElementById("appsAppIconPreview");if(!t)return;if(u.activeHotelAppIcon){kt(u.activeHotelAppIcon);return}const e=(u.activeHotelName||"P").trim().charAt(0).toUpperCase()||"🏡";t.style.background="transparent",t.style.border="none",t.style.padding="0",t.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+e+"</span>"}async function Ye(t){const e=t.files&&t.files[0];if(!e)return;jt();const o=new FormData;try{const i=await qt(e,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",e)}try{const i=xt(),r=new URLSearchParams;u.activeHotelId&&r.set("hotelId",u.activeHotelId),i&&r.set("token",i);const a=await(await fetch(`/api/crm/hotel-app-icon?${r}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(a.success&&a.appIconUrl){u.activeHotelAppIcon=a.appIconUrl,kt(a.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(u.activeHotelId||"")+"|"+a.appIconUrl+"|"+(u.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(a.message||"Failed to upload icon","error"),mt()}catch{toast("Failed to upload icon","error"),mt()}t.value=""}async function _e(t,e){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${t}/images/${e}`);const o=u.editRooms.find(i=>i.id===t);o&&o.images&&(o.images=o.images.filter(i=>i.id!==e),o.imageUrl=o.images[0]?.url||null),K(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function We(t){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${t}`),toast("Room deleted","success"),vt()}catch{toast("Failed to delete","error")}}function Ke(){const t=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(t.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function Qe(){const t=document.getElementById("editNewRoomName").value.trim();t&&api("POST","/api/crm/rooms",{name:t,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),vt()}).catch(()=>toast("Failed to add","error"))}const Ut={addAmenityPrompt:Me,advanceTourIfNeeded:W,changePin:Le,checklistGoTo:be,checklistGoToRates:he,cleanupPostActivationTourUi:at,cleanupSettingsTourUi:F,closeAmenityPicker:st,confirmAmenityPicker:Re,confirmEditAddRoom:Qe,copyBookingLink:He,copyBookingLinkFromChecklist:ve,deleteEditImage:_e,deleteEditRoom:We,ensureTourBlurOverlay:R,finishPostActivationTour:tt,getAmenityIcon:$t,getCrmAuthToken:xt,getEditRoomImages:Dt,goLive:qe,guestBookingEngineUrl:Rt,handoffToGuestAppsTour:Ct,hideGoLiveOverlay:gt,loadEditRooms:vt,loadSettings:Ot,openAmenityPicker:Ht,openBillingPortal:je,openEditAddRoom:Ke,openGuestBookingEngine:Te,openPreviewSite:Be,openTourAccordion:q,postRoomImageUpload:yt,queryTourSelector:L,removeAmenity:De,renderEditRooms:bt,renderEditRoomsCards:K,replayWalkthrough:Ae,resolveLiveTourElement:X,resolveTourHighlightEl:G,restoreAppIconPreview:mt,saveEditRoom:Ve,saveHotelInfo:Fe,saveRates:$e,scrollTourTargetIntoView:At,sendSupportMessage:Ue,setAppIconPreviewImage:kt,setAppIconPreviewLoading:jt,settingsChangePin:Ee,settingsCopyLink:ye,settingsSaveRates:ke,settingsSendSupport:Se,settingsUploadPhoto:we,showActivatedModal:Ce,showEditRoomPhoto:Ft,showFinaleMockModal:Y,showGoLiveOverlay:Nt,showOnboardingQuestions:Ie,showTestDriveModal:Pt,showWelcomeModal:Mt,squareCropImage:qt,startPostActivationTabTour:ht,startSettingsTour:ut,stepEditRoomPhoto:Pe,toggleAmenityPreset:Oe,toggleSection:Ne,tourAnchorRect:It,tourElementRect:nt,updatePreviewSiteBar:ze,uploadAppIcon:Ye,uploadEditImages:Ge};function Je(){Yt(Ut)}const eo=Object.freeze(Object.defineProperty({__proto__:null,default:Ut,install:Je},Symbol.toStringTag,{value:"Module"}));export{de as a,se as b,u as c,Ze as d,Yt as e,eo as f,to as i,Xe as s};
