import{c as n,e as q}from"./settings-loEHCcqo.js";const R="marketelValueRevealPendingV1",I="marketelValueRevealStepV1",x="marketelBillingIntervalV1";let r=0,p="guest",v=!1,f={rooms:[],rates:null},$=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},h=0,w=0,y=null,s=0,E=0,b=0,u="month";const J="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",O="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function T(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function l(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function U(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function m(){return n.activeHotelName||"Your Property"}function M(){return f.rooms[0]||n.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function z(){const e=M();return e.images?.[0]?.url||e.imageUrl||""}function K(){return f.rates?.nightly||99}function P(){if(T()&&n.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",n.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||n.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return n.activeHotelId&&t.searchParams.set("hotelId",n.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function W(){const e=String(o.domain||n.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${m().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function j(){const e=new URL(window.location.href);return e.search="",e.hash="",n.activeHotelId&&e.searchParams.set("hotelId",n.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function A(e=""){const t=n.activeHotelAppIcon||z(),a=m().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${l(t)}" alt="">`:`<span class="${e}">${l(a)}</span>`}function Q(){if(!n.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(I,String(r))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function d(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...t},a)}function X(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function G(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function H(e){if(e?.data?.type!=="marketel:show-guest-app")return;const t=document.getElementById("marketelValueReveal");!t||!Array.from(t.querySelectorAll("iframe")).some(i=>i.contentWindow===e.source)||(document.getElementById("mvrLivePreview")?.remove(),g("GuestAppPreviewRequestedFromBookingEngine"),d("JourneyBookingPreviewModeChanged",{action:"guest-app-requested-from-booking-engine"}),B(1))}function Z(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",n.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${l(t)}</small>
    </div>`).join("")}
  </div>`}function ee(){return o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function te(){const e=P();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${l(W())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${l(m())} booking-page preview" src="${l(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
    </div>
  </div>`}function ae(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${l(M().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${ee()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${te()}
    </div>
  </section>`}function F(e,t){return`<img class="mvr-ios-system-icon" src="${l(e)}" alt="${l(t)}">`}function re(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${l(m())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${v?"is-installed":""} ${s===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${s===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${A()}</div>
                    <div>
                      <strong>Get the ${l(m())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${v?"disabled":""}>${v?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${v?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${A()}</div>
                      <div class="mvr-dock-icon">${F(J,"Phone")}</div>
                      <div class="mvr-dock-icon">${F(O,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${s===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${A()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${l(m())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${A()}</span>
                    <strong>${l(m())}</strong>
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
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${s===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${s===0?"is-active":""}" aria-label="Installation" aria-current="${s===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${s===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${s===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${s===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function ie(){const e=M().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${l(e)} booking</strong><small>Tomorrow · ${U(K())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${l(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function oe(){const e=n.hotelSubscribed,t=u==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",c=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month";return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${l(m())} is ready.`:`Marketel is ready for ${l(m())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`<div class="mvr-proof"><strong>$5,800 booked direct</strong><span>in one recorded month through this booking engine for Suite Stay, Alabama.</span></div>
        <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!t}" class="${t?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${t}" class="${t?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
        </div>
        <div class="mvr-price"><strong>${a}</strong><span>${i}</span></div>
        <div class="mvr-price-detail${t?" is-visible":""}">Two months free · $398 saved</div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Renews yearly at $1,990 unless canceled.":"Renews monthly at $199 unless canceled."}</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":c}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function ne(){return r===0?ae():r===1?re():r===2?ie():oe()}function se(){if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[r]} →</button>
  </div>`}function k(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${Z()}
    </header>
    <main class="mvr-main">${ne()}</main>
    ${se()}
  </div>`,ve())}function le(){const e=P();if(!e||document.getElementById("mvrLivePreview"))return;p="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${l(m())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${l(m())} live preview" src="${l(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(a),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>{d("JourneyBookingPreviewModeChanged",{action:"closed",mode:p},{durationMs:Date.now()-t}),a.remove()}),a.querySelectorAll("[data-live-preview-mode]").forEach(i=>{i.addEventListener("click",()=>{const c=i.dataset.livePreviewMode==="edit"?"edit":"guest";if(c===p)return;p=c,a.querySelectorAll("[data-live-preview-mode]").forEach(V=>{V.classList.toggle("is-active",V.dataset.livePreviewMode===p)});const D=a.querySelector("iframe");D&&(D.title=p==="edit"?`${m()} Front Desk editor`:`${m()} booking-page preview`,D.src=p==="edit"?j():P()),d("JourneyBookingPreviewModeChanged",{action:"mode-selected",mode:p},{durationMs:Date.now()-t}),p==="edit"&&g("BookingEngineEditPreviewViewed")})}),g("BookingEngineFullPreviewOpened"),d("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function B(e){S();const t=r,a=Math.max(0,Math.min(3,e)),i=Date.now();b&&a!==t&&d("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-b}),r=a,b=i,Q(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),d("JourneyRevealStageViewed",{resumed:E>0&&i-E<100,bookingPageReady:r===0?!!o.ready:void 0}),k(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function de(){b&&d("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:E?Date.now()-E:null},{durationMs:Date.now()-b}),h&&(window.clearTimeout(h),h=0),S(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",H),n.settingsTourActive=!1;try{localStorage.removeItem(R),localStorage.removeItem(I),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}X(),G(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function ce(e){if(n.hotelSubscribed){de();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked"),d("JourneyCheckoutRequested",{price:u==="year"?1990:199,currency:"USD",billingInterval:u,subscribed:!!n.hotelSubscribed},{durationMs:b?Date.now()-b:null,immediate:!0});try{await window.goLive({billingInterval:u})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=u==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function S(){w&&(window.clearTimeout(w),w=0),y?.disconnect(),y=null}function L(e){v=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",v);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=v?"Installed ✓":"Install",a.disabled=v);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=v?"Now on their Home Screen":"Tap Install")}function N(e,t=!1){S(),s=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",s===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,c)=>{i.setAttribute("aria-hidden",c===s?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const c=Number(i.dataset.mvrAppSlide)===s;i.classList.toggle("is-active",c),i.setAttribute("aria-current",c?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===s}),s===1?L(!0):(L(!1),_()),t&&g(s===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),d("JourneyGuestAppDemo",{action:"slide-viewed",slide:s===1?"value":"install",manual:!!t}))}function C(e=!1){v||s!==0||(S(),L(!0),e&&g("GuestAppInstallDemoClicked"),d("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),w=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&N(1,!1)},e?900:1200))}function _(){if(S(),r!==1||s!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{w||(w=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(v?N(1,!1):C(!1))},v?900:1300))};"IntersectionObserver"in window?(y=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(y?.disconnect(),y=null,t())},{threshold:[.35]}),y.observe(e)):t()}function ve(){document.getElementById("mvrNext")?.addEventListener("click",()=>{d("JourneyRevealNavigation",{action:"next",toStep:r+1}),B(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{d("JourneyRevealNavigation",{action:"back",toStep:r-1}),B(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",le),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>ce(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==u){u=t;try{localStorage.setItem(x,u)}catch{}g(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),d("JourneyBillingIntervalSelected",{billingInterval:u,price:u==="year"?1990:199,currency:"USD"}),k()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{C(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==s&&N(t,!0)})}),_()}async function me(){return $||typeof window.api!="function"||($=window.api("GET","/api/crm/rooms").then(e=>(f={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},f.rooms.length&&(n.editRooms=f.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&k(),f)).catch(()=>f).finally(()=>{$=null})),$}async function Y(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(T()){o={ready:!!P(),checking:!1,reason:"local",attempts:1,domain:""},d("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&k();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}d("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&k(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(h=window.setTimeout(Y,6e3))}}function ue(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(I)||"0",10)}catch{}try{u=localStorage.getItem(x)==="year"?"year":"month"}catch{u="month"}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),n.hotelSubscribed&&r===3&&(r=0),p="guest",v=!1,s=0,E=Date.now(),b=0,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},h&&window.clearTimeout(h),h=0,S(),!n.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(I,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}n.settingsTourActive=!0,window.addEventListener("message",H),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",G(!1);const i=document.createElement("div");i.id="marketelValueReveal",i.className="mvr-root",document.body.appendChild(i),k(),g("ValueRevealStarted",n.hotelSubscribed?"subscribed-replay":"pre-activation"),d("JourneyRevealStarted",{startStep:r,replay:!!n.hotelSubscribed,pendingResume:!Number.isFinite(t)&&a>0}),B(r),me(),Y()}function pe(){try{return localStorage.getItem(R)==="1"}catch{return!1}}function ge(){try{localStorage.removeItem(R),localStorage.removeItem(I)}catch{}}const be={clearPendingMarketelValueReveal:ge,hasPendingMarketelValueReveal:pe,showMarketelValueReveal:ue};function he(){q(be)}export{ge as clearPendingMarketelValueReveal,be as default,pe as hasPendingMarketelValueReveal,he as install,ue as showMarketelValueReveal};
