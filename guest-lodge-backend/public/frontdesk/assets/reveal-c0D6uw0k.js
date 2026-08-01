import{c as s,e as _}from"./settings-CpDa2Wb2.js";const E="marketelValueRevealPendingV1",S="marketelValueRevealStepV1";let r=0,u="guest",c=!1,f={rooms:[],rates:null},k=null,i={ready:!1,checking:!0,reason:"",attempts:0,domain:""},b=0,w=0,h=null,n=0,I=0,p=0;const O="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",q="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function V(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function l(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function J(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function v(){return s.activeHotelName||"Your Property"}function L(){return f.rooms[0]||s.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function Y(){const e=L();return e.images?.[0]?.url||e.imageUrl||""}function U(){return f.rates?.nightly||99}function A(){if(V()&&s.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",s.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=i.domain||s.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return s.activeHotelId&&t.searchParams.set("hotelId",s.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function z(){const e=String(i.domain||s.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${v().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function K(){const e=new URL(window.location.href);return e.search="",e.hash="",s.activeHotelId&&e.searchParams.set("hotelId",s.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function R(e=""){const t=s.activeHotelAppIcon||Y(),a=v().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${l(t)}" alt="">`:`<span class="${e}">${l(a)}</span>`}function W(){if(!s.hotelSubscribed)try{localStorage.setItem(E,"1"),localStorage.setItem(S,String(r))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function d(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...t},a)}function j(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function x(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function T(e){if(e?.data?.type!=="marketel:show-guest-app")return;const t=document.getElementById("marketelValueReveal");!t||!Array.from(t.querySelectorAll("iframe")).some(o=>o.contentWindow===e.source)||(document.getElementById("mvrLivePreview")?.remove(),g("GuestAppPreviewRequestedFromBookingEngine"),d("JourneyBookingPreviewModeChanged",{action:"guest-app-requested-from-booking-engine"}),P(1))}function Q(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",s.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${l(t)}</small>
    </div>`).join("")}
  </div>`}function X(){return i.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${i.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:i.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${i.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Z(){const e=A();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${l(z())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${l(v())} booking-page preview" src="${l(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
    </div>
  </div>`}function ee(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${l(L().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${X()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Z()}
    </div>
  </section>`}function F(e,t){return`<img class="mvr-ios-system-icon" src="${l(e)}" alt="${l(t)}">`}function te(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${l(v())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${c?"is-installed":""} ${n===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${n===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${R()}</div>
                    <div>
                      <strong>Get the ${l(v())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${c?"disabled":""}>${c?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${c?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${R()}</div>
                      <div class="mvr-dock-icon">${F(O,"Phone")}</div>
                      <div class="mvr-dock-icon">${F(q,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${n===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${R()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${l(v())} stays one tap away.</span>
                  </div>
                  <b>✓</b>
                </div>
                <div class="mvr-app-direct-result">
                  <span aria-hidden="true">↗</span>
                  <div>
                    <strong>Book direct again</strong>
                    <small>One tap brings them straight back to your booking page.</small>
                  </div>
                </div>
                <div class="mvr-app-push-preview">
                  <div class="mvr-app-push-meta">
                    <span class="mvr-app-push-icon">${R()}</span>
                    <strong>${l(v())}</strong>
                    <span>now</span>
                  </div>
                  <div class="mvr-app-push-title">Summer dates are open</div>
                  <div class="mvr-app-push-body">Tap to see availability and book direct.</div>
                </div>
                <div class="mvr-app-push-foot">Sent from Front Desk → delivered to their phone</div>
              </div>
            </div>
          </div>
        </div>
        <div class="mvr-app-carousel-controls" aria-label="Guest app demonstration">
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${n===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${n===0?"is-active":""}" aria-label="Installation" aria-current="${n===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${n===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${n===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${n===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function ae(){const e=L().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>When a direct booking arrives, Front Desk asks you and the people you choose whether the room is still available. If a walk-in or another booking took it, reply normally and Marketel handles the rest.</p>
      <div class="mvr-callout">
        <strong>Front Desk follows up—you don't have to remember.</strong>
        One reply can block the dates, release the guest's $1 hold and notify them automatically.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-booking-alert">
        <div class="mvr-marketel-avatar">M</div>
        <div><span>Front Desk</span><strong>New ${l(e)} booking</strong><small>Tomorrow · ${J(U())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${l(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function re(){const e=s.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${l(v())} is ready.`:`Marketel is ready for ${l(v())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`<div class="mvr-proof"><strong>$5,800 booked direct</strong><span>in one recorded month through this booking engine for Suite Stay, Alabama.</span></div>
        <div class="mvr-price"><strong>$199</strong><span>/month</span></div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>Try the complete system. Cancel anytime—no contract.</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":"Activate Marketel — $199/month"}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function oe(){return r===0?ee():r===1?te():r===2?ae():re()}function ie(){if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[r]} →</button>
  </div>`}function $(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${Q()}
    </header>
    <main class="mvr-main">${oe()}</main>
    ${ie()}
  </div>`,de())}function se(){const e=A();if(!e||document.getElementById("mvrLivePreview"))return;u="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${l(v())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${l(v())} live preview" src="${l(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(a),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>{d("JourneyBookingPreviewModeChanged",{action:"closed",mode:u},{durationMs:Date.now()-t}),a.remove()}),a.querySelectorAll("[data-live-preview-mode]").forEach(o=>{o.addEventListener("click",()=>{const m=o.dataset.livePreviewMode==="edit"?"edit":"guest";if(m===u)return;u=m,a.querySelectorAll("[data-live-preview-mode]").forEach(N=>{N.classList.toggle("is-active",N.dataset.livePreviewMode===u)});const D=a.querySelector("iframe");D&&(D.title=u==="edit"?`${v()} Front Desk editor`:`${v()} booking-page preview`,D.src=u==="edit"?K():A()),d("JourneyBookingPreviewModeChanged",{action:"mode-selected",mode:u},{durationMs:Date.now()-t}),u==="edit"&&g("BookingEngineEditPreviewViewed")})}),g("BookingEngineFullPreviewOpened"),d("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!i.ready,bookingPageReason:i.reason||""})}function P(e){y();const t=r,a=Math.max(0,Math.min(3,e)),o=Date.now();p&&a!==t&&d("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:o-p}),r=a,p=o,W(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),d("JourneyRevealStageViewed",{resumed:I>0&&o-I<100,bookingPageReady:r===0?!!i.ready:void 0}),$(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function ne(){p&&d("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:I?Date.now()-I:null},{durationMs:Date.now()-p}),b&&(window.clearTimeout(b),b=0),y(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",T),s.settingsTourActive=!1;try{localStorage.removeItem(E),localStorage.removeItem(S),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}j(),x(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function le(e){if(s.hotelSubscribed){ne();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked"),d("JourneyCheckoutRequested",{price:199,currency:"USD",subscribed:!!s.hotelSubscribed},{durationMs:p?Date.now()-p:null,immediate:!0});try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function y(){w&&(window.clearTimeout(w),w=0),h?.disconnect(),h=null}function B(e){c=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",c);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=c?"Installed ✓":"Install",a.disabled=c);const o=t?.querySelector(".mvr-install-arrow span");o&&(o.textContent=c?"Now on their Home Screen":"Tap Install")}function M(e,t=!1){y(),n=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",n===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((o,m)=>{o.setAttribute("aria-hidden",m===n?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(o=>{const m=Number(o.dataset.mvrAppSlide)===n;o.classList.toggle("is-active",m),o.setAttribute("aria-current",m?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(o=>{o.disabled=Number(o.dataset.mvrAppSlide)===n}),n===1?B(!0):(B(!1),C()),t&&g(n===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),d("JourneyGuestAppDemo",{action:"slide-viewed",slide:n===1?"value":"install",manual:!!t}))}function H(e=!1){c||n!==0||(y(),B(!0),e&&g("GuestAppInstallDemoClicked"),d("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),w=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&M(1,!1)},e?900:1200))}function C(){if(y(),r!==1||n!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{w||(w=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(c?M(1,!1):H(!1))},c?900:1300))};"IntersectionObserver"in window?(h=new IntersectionObserver(a=>{a.some(o=>o.isIntersecting&&o.intersectionRatio>=.35)&&(h?.disconnect(),h=null,t())},{threshold:[.35]}),h.observe(e)):t()}function de(){document.getElementById("mvrNext")?.addEventListener("click",()=>{d("JourneyRevealNavigation",{action:"next",toStep:r+1}),P(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{d("JourneyRevealNavigation",{action:"back",toStep:r-1}),P(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",se),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>le(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{H(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==n&&M(t,!0)})}),C()}async function ce(){return k||typeof window.api!="function"||(k=window.api("GET","/api/crm/rooms").then(e=>(f={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},f.rooms.length&&(s.editRooms=f.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&$(),f)).catch(()=>f).finally(()=>{k=null})),k}async function G(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(V()){i={ready:!!A(),checking:!1,reason:"local",attempts:1,domain:""},d("JourneyBookingPageStatus",{ready:i.ready,reason:i.reason,attempts:i.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&$();return}i.checking=!0,i.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");i={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:i.attempts,domain:String(e?.domain||"")}}catch{i.checking=!1,i.reason="unreachable"}d("JourneyBookingPageStatus",{ready:i.ready,reason:i.reason,attempts:i.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&$(),!(i.ready||i.reason==="deployment-disabled")&&i.attempts<10&&document.getElementById("marketelValueReveal")&&(b=window.setTimeout(G,6e3))}}function ve(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(S)||"0",10)}catch{}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),s.hotelSubscribed&&r===3&&(r=0),u="guest",c=!1,n=0,I=Date.now(),p=0,i={ready:!1,checking:!0,reason:"",attempts:0,domain:""},b&&window.clearTimeout(b),b=0,y(),!s.hotelSubscribed)try{localStorage.setItem(E,"1"),localStorage.setItem(S,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}s.settingsTourActive=!0,window.addEventListener("message",T),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",x(!1);const o=document.createElement("div");o.id="marketelValueReveal",o.className="mvr-root",document.body.appendChild(o),$(),g("ValueRevealStarted",s.hotelSubscribed?"subscribed-replay":"pre-activation"),d("JourneyRevealStarted",{startStep:r,replay:!!s.hotelSubscribed,pendingResume:!Number.isFinite(t)&&a>0}),P(r),ce(),G()}function me(){try{return localStorage.getItem(E)==="1"}catch{return!1}}function ue(){try{localStorage.removeItem(E),localStorage.removeItem(S)}catch{}}const pe={clearPendingMarketelValueReveal:ue,hasPendingMarketelValueReveal:me,showMarketelValueReveal:ve};function fe(){_(pe)}export{ue as clearPendingMarketelValueReveal,pe as default,me as hasPendingMarketelValueReveal,fe as install,ve as showMarketelValueReveal};
