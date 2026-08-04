import{c as o,e as W}from"./settings-loEHCcqo.js";const L="marketelValueRevealPendingV1",B="marketelValueRevealStepV1",q="marketelBillingIntervalV1";let i=0,v="guest",m=!1,f={rooms:[],rates:null},E=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},y=0,k=0,w=null,d=0,A=0,b=0,g="month",h=null;const j="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",Q="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function J(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function s(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function X(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function p(){return o.activeHotelName||"Your Property"}function V(){return f.rooms[0]||o.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function Z(){const e=V();return e.images?.[0]?.url||e.imageUrl||""}function ee(){return f.rates?.nightly||99}function P(){if(J()&&o.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",o.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=n.domain||o.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return o.activeHotelId&&t.searchParams.set("hotelId",o.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function M(){const e=String(n.domain||o.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${p().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function te(){const e=new URL(window.location.href);return e.search="",e.hash="",o.activeHotelId&&e.searchParams.set("hotelId",o.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function C(e=""){const t=o.activeHotelAppIcon||Z(),a=p().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${s(t)}" alt="">`:`<span class="${e}">${s(a)}</span>`}function ae(){if(!o.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(B,String(i))}catch{}}function u(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:i,stageName:["booking-page","guest-app","front-desk-assistant","activation"][i]||"unknown",...t},a)}function re(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function Y(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function N(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),r=String(t%60).padStart(2,"0");return`${a}:${r}`}function R(e){e?.layer&&(e.layer.classList.remove("is-visible"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function T(e="",t=!1){const a=h;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),t&&a.status==="running"){const r=Date.now()-a.startedAt;u("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:r},{durationMs:r})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),R(a)}}function F(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${N(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function ie(e){!e||e!==h||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),R(e),e.timer.hidden=!1,F(e),e.timerId=window.setInterval(()=>F(e),500),u("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:M()}))}function ne(e){!e||e!==h||e.hasPrompted||v!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.layer.innerHTML=`<section class="mvr-challenge-card" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Try it like a guest</span>
    <h2 id="mvrChallengeTitle">Can you reach checkout in under 60 seconds?</h2>
    <p>Choose a room and dates, then continue to checkout. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start 60-second challenge</button>
      <button type="button" class="mvr-challenge-skip">Explore normally</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>ie(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",R(e),u("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),u("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:M()}))}function oe(e){if(!e||e!==h)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${s(N(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{R(e),O(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{R(e)}),u("BookingChallengeCheckoutReached",N(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function _(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:checkout-reached")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(c=>c.contentWindow===e.source))){if(t==="marketel:checkout-reached"){if(h?.iframe?.contentWindow!==e.source||v!=="guest")return;oe(h);return}T("guest-app-selected",!0),h=null,document.getElementById("mvrLivePreview")?.remove(),u("GuestAppPreviewRequestedFromBookingEngine"),l("JourneyBookingPreviewModeChanged",{action:"guest-app-requested-from-booking-engine"}),D(1)}}function se(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",o.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===i?"is-active":""} ${a<i?"is-done":""}">
      <span></span><small>${s(t)}</small>
    </div>`).join("")}
  </div>`}function le(){return n.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function de(){const e=P();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${s(M())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${s(p())} booking-page preview" src="${s(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
    </div>
  </div>`}function ce(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${s(V().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${le()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${de()}
    </div>
  </section>`}function G(e,t){return`<img class="mvr-ios-system-icon" src="${s(e)}" alt="${s(t)}">`}function ve(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${s(p())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${m?"is-installed":""} ${d===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${d===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${C()}</div>
                    <div>
                      <strong>Get the ${s(p())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${m?"disabled":""}>${m?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${m?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${C()}</div>
                      <div class="mvr-dock-icon">${G(j,"Phone")}</div>
                      <div class="mvr-dock-icon">${G(Q,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${d===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${C()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${s(p())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${C()}</span>
                    <strong>${s(p())}</strong>
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
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${d===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${d===0?"is-active":""}" aria-label="Installation" aria-current="${d===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${d===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${d===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${d===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function ue(){const e=V().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${s(e)} booking</strong><small>Tomorrow · ${X(ee())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${s(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function me(){const e=o.hotelSubscribed,t=g==="year",a=t?"$1,990":"$199",r=t?"/year":"/month",c=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month";return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${s(p())} is ready.`:`Marketel is ready for ${s(p())}.`}</h1>
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
        <div class="mvr-price"><strong>${a}</strong><span>${r}</span></div>
        <div class="mvr-price-detail${t?" is-visible":""}">Two months free · $398 saved</div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Renews yearly at $1,990 unless canceled.":"Renews monthly at $199 unless canceled."}</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":c}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function pe(){return i===0?ce():i===1?ve():i===2?ue():me()}function ge(){if(i===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${i>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[i]} →</button>
  </div>`}function S(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${se()}
    </header>
    <main class="mvr-main">${pe()}</main>
    ${ge()}
  </div>`,ye())}function he(){const e=P();if(!e||document.getElementById("mvrLivePreview"))return;v="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${s(p())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-address-row" id="mvrLiveAddressRow">
      <span>Your booking link</span>
      <div class="mvr-live-address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong>${s(M())}</strong>
      </div>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${s(p())} live preview" src="${s(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const r=a.querySelector(".mvr-live-stage > iframe");h={modal:a,iframe:r,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0},r?.addEventListener("load",()=>{h?.modal!==a||v!=="guest"||window.setTimeout(()=>ne(h),250)}),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:v},{durationMs:Date.now()-t}),T("preview-closed",!0),h=null,a.remove()}),a.querySelectorAll("[data-live-preview-mode]").forEach(c=>{c.addEventListener("click",()=>{const $=c.dataset.livePreviewMode==="edit"?"edit":"guest";$!==v&&O(a,$,t)})}),u("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!n.ready,bookingPageReason:n.reason||""})}function O(e,t,a,r="mode-selected"){if(!e?.isConnected)return;t==="edit"&&T("edit-mode-selected",!0),v=t==="edit"?"edit":"guest",e.querySelectorAll("[data-live-preview-mode]").forEach($=>{$.classList.toggle("is-active",$.dataset.livePreviewMode===v)}),e.querySelector("#mvrLiveAddressRow")?.classList.toggle("is-editor",v==="edit");const c=e.querySelector(".mvr-live-stage > iframe");c&&(c.title=v==="edit"?`${p()} Front Desk editor`:`${p()} booking-page preview`,c.src=v==="edit"?te():P()),l("JourneyBookingPreviewModeChanged",{action:r,mode:v},{durationMs:Date.now()-a}),v==="edit"&&u("BookingEngineEditPreviewViewed")}function D(e){I();const t=i,a=Math.max(0,Math.min(3,e)),r=Date.now();b&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:r-b}),i=a,b=r,ae(),u(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][i]),l("JourneyRevealStageViewed",{resumed:A>0&&r-A<100,bookingPageReady:i===0?!!n.ready:void 0}),S(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function be(){b&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:A?Date.now()-A:null},{durationMs:Date.now()-b}),y&&(window.clearTimeout(y),y=0),T("reveal-finished",!0),h=null,I(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",_),o.settingsTourActive=!1;try{localStorage.removeItem(L),localStorage.removeItem(B),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}re(),Y(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function fe(e){if(o.hotelSubscribed){be();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",u("ActivationCtaClicked"),l("JourneyCheckoutRequested",{price:g==="year"?1990:199,currency:"USD",billingInterval:g,subscribed:!!o.hotelSubscribed},{durationMs:b?Date.now()-b:null,immediate:!0});try{await window.goLive({billingInterval:g})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=g==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function I(){k&&(window.clearTimeout(k),k=0),w?.disconnect(),w=null}function x(e){m=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",m);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=m?"Installed ✓":"Install",a.disabled=m);const r=t?.querySelector(".mvr-install-arrow span");r&&(r.textContent=m?"Now on their Home Screen":"Tap Install")}function H(e,t=!1){I(),d=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",d===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((r,c)=>{r.setAttribute("aria-hidden",c===d?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(r=>{const c=Number(r.dataset.mvrAppSlide)===d;r.classList.toggle("is-active",c),r.setAttribute("aria-current",c?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(r=>{r.disabled=Number(r.dataset.mvrAppSlide)===d}),d===1?x(!0):(x(!1),z()),t&&u(d===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:d===1?"value":"install",manual:!!t}))}function U(e=!1){m||d!==0||(I(),x(!0),e&&u("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),k=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&H(1,!1)},e?900:1200))}function z(){if(I(),i!==1||d!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{k||(k=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&(m?H(1,!1):U(!1))},m?900:1300))};"IntersectionObserver"in window?(w=new IntersectionObserver(a=>{a.some(r=>r.isIntersecting&&r.intersectionRatio>=.35)&&(w?.disconnect(),w=null,t())},{threshold:[.35]}),w.observe(e)):t()}function ye(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:i+1}),D(i+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:i-1}),D(i-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",he),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>fe(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==g){g=t;try{localStorage.setItem(q,g)}catch{}u(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:g,price:g==="year"?1990:199,currency:"USD"}),S()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{U(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==d&&H(t,!0)})}),z()}async function we(){return E||typeof window.api!="function"||(E=window.api("GET","/api/crm/rooms").then(e=>(f={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},f.rooms.length&&(o.editRooms=f.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&S(),f)).catch(()=>f).finally(()=>{E=null})),E}async function K(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(J()){n={ready:!!P(),checking:!1,reason:"local",attempts:1,domain:""},l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&S();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")}}catch{n.checking=!1,n.reason="unreachable"}l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&S(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&(y=window.setTimeout(K,6e3))}}function ke(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(B)||"0",10)}catch{}try{g=localStorage.getItem(q)==="year"?"year":"month"}catch{g="month"}if(i=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),o.hotelSubscribed&&i===3&&(i=0),v="guest",m=!1,d=0,A=Date.now(),b=0,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},y&&window.clearTimeout(y),y=0,I(),!o.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(B,String(i))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}o.settingsTourActive=!0,window.addEventListener("message",_),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",Y(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),S(),u("ValueRevealStarted",o.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:i,replay:!!o.hotelSubscribed,pendingResume:!Number.isFinite(t)&&a>0}),D(i),we(),K()}function Se(){try{return localStorage.getItem(L)==="1"}catch{return!1}}function Ie(){try{localStorage.removeItem(L),localStorage.removeItem(B)}catch{}}const $e={clearPendingMarketelValueReveal:Ie,hasPendingMarketelValueReveal:Se,showMarketelValueReveal:ke};function Be(){W($e)}export{Ie as clearPendingMarketelValueReveal,$e as default,Se as hasPendingMarketelValueReveal,Be as install,ke as showMarketelValueReveal};
