import{c as s,e as oe}from"./settings-iSP_3Qs_.js";const R="marketelValueRevealPendingV1",D="marketelValueRevealStepV1",X="marketelBillingIntervalV1";let r=0,u="guest",p=!1,b={rooms:[],rates:null},L=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k=0,$=0,I=null,d=0,V=0,A=0,f="month",m=null,O=!1,h=!1,T=!1;const ne="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",se="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function Z(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function c(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a])}function G(e){const a=Number(e);return Number.isFinite(a)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(a)?0:2}).format(a):"$99"}function g(){return s.activeHotelName||"Your Property"}function Y(){return b.rooms[0]||s.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function le(){const e=Y();return e.images?.[0]?.url||e.imageUrl||""}function de(){return b.rates?.nightly||99}function ce(){const e=Number(b.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const t=e*.15,i=Math.max(1,Math.ceil(199/t)),n=t*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${G(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${G(n)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function C(){if(Z()&&s.activeHotelId){const t=new URL(window.location.href);return t.port="5173",t.pathname="/",t.search="",t.hash="",t.searchParams.set("hotelId",s.activeHotelId),t.searchParams.set("preview","1"),t.toString()}const e=o.domain||s.activeHotelDomain||"";if(!e)return"";const a=new URL(`https://${e}/`);return s.activeHotelId&&a.searchParams.set("hotelId",s.activeHotelId),a.searchParams.set("preview","1"),a.toString()}function P(){const e=String(o.domain||s.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ue(){const e=new URL(window.location.href);return e.search="",e.hash="",s.activeHotelId&&e.searchParams.set("hotelId",s.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function M(e=""){const a=s.activeHotelAppIcon||le(),t=g().trim().charAt(0).toUpperCase()||"M";return a?`<img class="${e}" src="${c(a)}" alt="">`:`<span class="${e}">${c(t)}</span>`}function me(){if(!s.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(D,String(r))}catch{}}function v(e,a=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:a,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,a={},t={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...a},t)}function ve(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ee(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function H(e){const a=Math.max(0,Math.floor(Number(e||0)/1e3)),t=Math.floor(a/60),i=String(a%60).padStart(2,"0");return`${t}:${i}`}function E(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function S(e,a){const t=e?.querySelector("#mvrLiveActions");t&&(t.hidden=!a)}function x(e="",a=!1){const t=m;if(t){if(t.timerId&&(window.clearInterval(t.timerId),t.timerId=0),t.promptFallbackId&&(window.clearTimeout(t.promptFallbackId),t.promptFallbackId=0),t.promptDelayId&&(window.clearTimeout(t.promptDelayId),t.promptDelayId=0),a&&t.status==="running"){const i=Date.now()-t.startedAt;v("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}t.timer&&(t.timer.hidden=!0),t.status==="running"&&(t.status="abandoned"),E(t)}}function K(e){if(!e||e.status!=="running"||!e.timer)return;const a=Date.now()-e.startedAt,t=e.timer.querySelector("[data-challenge-time]");t&&(t.textContent=`${H(a)} / 1:00`),e.timer.classList.toggle("is-over-minute",a>=6e4)}function pe(e){!e||e!==m||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),E(e),S(e.modal,!0),e.timer.hidden=!1,K(e),e.timerId=window.setInterval(()=>K(e),500),v("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:P()}))}function ge(e){!e||e!==m||e.hasPrompted||u!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>pe(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",E(e),S(e.modal,!0),v("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),v("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:P()}))}function fe(e){if(!e||e!==m)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const a=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${c(H(a))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{E(e),J(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{E(e),S(e.modal,!0)}),v("BookingChallengeCheckoutReached",H(a)),l("JourneyBookingChallengeCompleted",{elapsedMs:a,completedWithin60Seconds:a<=6e4},{durationMs:a})}function te(e){const a=e?.data?.type;if(a!=="marketel:show-guest-app"&&a!=="marketel:continue-owner-tour"&&a!=="marketel:checkout-reached")return;const t=document.getElementById("marketelValueReveal");if(!(!t||!Array.from(t.querySelectorAll("iframe")).some(n=>n.contentWindow===e.source))){if(a==="marketel:checkout-reached"){if(m?.iframe?.contentWindow!==e.source||u!=="guest")return;fe(m);return}m?.iframe?.contentWindow===e.source&&(v("GuestAppPreviewRequestedFromBookingEngine"),J(m.modal,"edit",m.previewOpenedAt,"booking-install-explainer-continued"))}}function be(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",s.hotelSubscribed?"Complete":"Activate"].map((a,t)=>`<div class="mvr-progress-item ${t===r?"is-active":""} ${t<r?"is-done":""}">
      <span></span><small>${c(a)}</small>
    </div>`).join("")}
  </div>`}function he(){return h?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function ye(){const e=C();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${c(P())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${c(g())} booking-page preview" src="${c(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${e?"View your booking page":"Check booking page preview"}" ${h?"disabled":""}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>
          </svg>
          <strong>${h?"Still publishing":"View your booking page →"}</strong>
        </span>
      </button>
    </div>
  </div>`}function we(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${c(Y().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then continue to your Guest App and Front Desk.
      </div>
      ${he()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${ye()}
    </div>
  </section>`}function j(e,a){return`<img class="mvr-ios-system-icon" src="${c(e)}" alt="${c(a)}">`}function ke(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${c(g())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${p?"is-installed":""} ${d===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${d===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${M()}</div>
                    <div>
                      <strong>Get the ${c(g())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${p?"disabled":""}>${p?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${p?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${M()}</div>
                      <div class="mvr-dock-icon">${j(ne,"Phone")}</div>
                      <div class="mvr-dock-icon">${j(se,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${d===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${M()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${c(g())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${M()}</span>
                    <strong>${c(g())}</strong>
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
  </section>`}function Se(){const e=Y().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${c(e)} booking</strong><small>Tomorrow · ${G(de())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${c(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function Ie(){const e=s.hotelSubscribed,a=f==="year",t=a?"$1,990":"$199",i=a?"/year":"/month",n=a?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month";return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${c(g())} is ready.`:`Marketel is ready for ${c(g())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`${ce()}
        <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!a}" class="${a?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${a}" class="${a?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
        </div>
        <div class="mvr-price"><strong>${t}</strong><span>${i}</span></div>
        <div class="mvr-price-detail${a?" is-visible":""}">Two months free · $398 saved</div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${a?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":n}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function $e(){return r===0?we():r===1?ke():r===2?Se():Ie()}function Ae(){if(r===0)return!O&&!h?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">Continue to Guest App →</button>
    </div>`;if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["","See how Front Desk protects you","Review plans and activation"];return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[r]} →</button>
  </div>`}function y(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${be()}
    </header>
    <main class="mvr-main">${$e()}</main>
    ${Ae()}
  </div>`,Le())}function Ce(){const e=C();if(document.getElementById("mvrLivePreview"))return;if(!e){h=!0,l("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:o.reason||"missing-url"}),y();return}O=!0,u="guest";const a=Date.now(),t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${c(P())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${c(g())} live preview" src="${c(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">Continue to Guest App</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(t);const i=t.querySelector(".mvr-live-stage > iframe");m={modal:t,iframe:i,layer:t.querySelector(".mvr-challenge-layer"),timer:t.querySelector(".mvr-challenge-timer"),previewOpenedAt:a,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},m.promptFallbackId=window.setTimeout(()=>{m?.modal!==t||m.status!=="waiting"||S(t,!0)},4e3),i?.addEventListener("load",()=>{const n=m;n?.modal!==t||u!=="guest"||(n.promptDelayId&&window.clearTimeout(n.promptDelayId),n.promptDelayId=window.setTimeout(()=>{n.promptDelayId=0,ge(n)},1500))}),t.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:u},{durationMs:Date.now()-a}),x("preview-closed",!0),m=null,t.remove(),y()}),t.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Q(t,a,"continued-without-editor")}),t.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(u==="guest"){J(t,"edit",a,"guided-forward");return}Q(t,a,"continued-from-editor-preview")}),v("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function Q(e,a,t){e?.isConnected&&(l("JourneyRevealNavigation",{action:t,toStep:1,editorViewed:u==="edit"},{durationMs:Date.now()-a}),x("continued-to-guest-app",!1),m=null,e.remove(),F(1))}function J(e,a,t,i="mode-selected"){if(!e?.isConnected)return;x("edit-mode-selected",!0),u="edit";const n=e.querySelector("#mvrLiveLocation"),w=e.querySelector("[data-live-location-text]"),U=e.querySelector("#mvrLiveForward"),W=e.querySelector("#mvrContinueGuestApp"),z=e.querySelector("[data-live-forward-long]");n?.classList.toggle("is-editor",u==="edit"),w&&(w.textContent=u==="edit"?"Front Desk editor":P()),n&&n.setAttribute("aria-label",u==="edit"?"Front Desk editor":"Your live booking address"),z&&(z.textContent=u==="edit"?"Continue to Guest App":"See how to edit your booking page"),U&&U.setAttribute("aria-label",u==="edit"?"Continue to the Guest App":"See how you edit this booking page"),W&&(W.hidden=u==="edit"),S(e,!0);const N=e.querySelector(".mvr-live-stage > iframe");N&&(N.title=u==="edit"?`${g()} Front Desk editor`:`${g()} booking-page preview`,N.src=u==="edit"?ue():C()),l("JourneyBookingPreviewModeChanged",{action:i,mode:u},{durationMs:Date.now()-t}),u==="edit"&&v("BookingEngineEditPreviewViewed")}function F(e){B();const a=r,t=Math.max(0,Math.min(3,e)),i=Date.now();A&&t!==a&&l("JourneyRevealStageCompleted",{revealStep:a,stageName:["booking-page","guest-app","front-desk-assistant","activation"][a]||"unknown",nextStep:t,direction:t>a?"forward":"back"},{durationMs:i-A}),r=t,A=i,me(),v(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),l("JourneyRevealStageViewed",{resumed:T,bookingPageReady:r===0?!!o.ready:void 0}),T=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Re(){A&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:V?Date.now()-V:null},{durationMs:Date.now()-A}),k&&(window.clearTimeout(k),k=0),x("reveal-finished",!0),m=null,B(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",te),s.settingsTourActive=!1;try{localStorage.removeItem(R),localStorage.removeItem(D),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}ve(),ee(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Be(e){if(s.hotelSubscribed){Re();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",v("ActivationCtaClicked");try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function B(){$&&(window.clearTimeout($),$=0),I?.disconnect(),I=null}function q(e){p=!!e;const a=document.querySelector(".mvr-install-visual");a?.classList.toggle("is-installed",p);const t=document.getElementById("mvrInstallDemo");t&&(t.textContent=p?"Installed ✓":"Install",t.disabled=p);const i=a?.querySelector(".mvr-install-arrow span");i&&(i.textContent=p?"Now on their Home Screen":"Tap Install")}function _(e,a=!1){B(),d=Number(e)===1?1:0;const t=document.querySelector(".mvr-install-visual");t&&(t.classList.toggle("is-slide-2",d===1),t.querySelectorAll(".mvr-app-carousel-slide").forEach((i,n)=>{i.setAttribute("aria-hidden",n===d?"false":"true")}),t.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const n=Number(i.dataset.mvrAppSlide)===d;i.classList.toggle("is-active",n),i.setAttribute("aria-current",n?"step":"false")}),t.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===d}),d===1?q(!0):(q(!1),ie()),a&&v(d===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:d===1?"value":"install",manual:!!a}))}function ae(e=!1){p||d!==0||(B(),q(!0),e&&v("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),$=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&_(1,!1)},e?900:1200))}function ie(){if(B(),r!==1||d!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const a=()=>{$||($=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(p?_(1,!1):ae(!1))},p?900:1300))};"IntersectionObserver"in window?(I=new IntersectionObserver(t=>{t.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(I?.disconnect(),I=null,a())},{threshold:[.35]}),I.observe(e)):a()}function Le(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:r+1}),F(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:r-1}),F(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Ce),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Be(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const a=e.dataset.mvrBilling==="year"?"year":"month";if(a!==f){f=a;try{localStorage.setItem(X,f)}catch{}v(a==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{ae(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const a=Number(e.dataset.mvrAppSlide)===1?1:0;a!==d&&_(a,!0)})}),ie()}async function De(){return L||typeof window.api!="function"||(L=window.api("GET","/api/crm/rooms").then(e=>(b={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},b.rooms.length&&(s.editRooms=b.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),b)).catch(()=>b).finally(()=>{L=null})),L}async function re(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(Z()){o={ready:!!C(),checking:!1,reason:"local",attempts:1,domain:""},C()&&(h=!1),l("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}C()&&(h=!1),l("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(k=window.setTimeout(re,6e3))}}function Ee(e={}){if(document.getElementById("marketelValueReveal"))return;const a=Number(e.startAt);let t=0,i=!1;try{t=Number.parseInt(localStorage.getItem(D)||"0",10)}catch{}try{i=localStorage.getItem(R)==="1"}catch{}try{f=localStorage.getItem(X)==="year"?"year":"month"}catch{f="month"}if(r=Number.isFinite(a)?Math.max(0,Math.min(3,a)):Math.max(0,Math.min(3,Number.isFinite(t)?t:0)),s.hotelSubscribed&&r===3&&(r=0),u="guest",p=!1,d=0,O=!1,h=!1,V=Date.now(),A=0,T=!Number.isFinite(a)&&i,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k&&window.clearTimeout(k),k=0,B(),!s.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(D,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}s.settingsTourActive=!0,window.addEventListener("message",te),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ee(!1);const n=document.createElement("div");n.id="marketelValueReveal",n.className="mvr-root",document.body.appendChild(n),y(),v("ValueRevealStarted",s.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:r,replay:!!s.hotelSubscribed,pendingResume:T}),F(r),De(),re()}function Pe(){try{return localStorage.getItem(R)==="1"}catch{return!1}}function Me(){try{localStorage.removeItem(R),localStorage.removeItem(D)}catch{}}const Te={clearPendingMarketelValueReveal:Me,hasPendingMarketelValueReveal:Pe,showMarketelValueReveal:Ee};function xe(){oe(Te)}export{Me as clearPendingMarketelValueReveal,Te as default,Pe as hasPendingMarketelValueReveal,xe as install,Ee as showMarketelValueReveal};
