import{c as l,e as ne}from"./settings-DzmlfyYA.js";const C="marketelValueRevealPendingV1",L="marketelValueRevealStepV1",Z="marketelBillingIntervalV1";let r=0,u="guest",p=!1,h={rooms:[],rates:null},B=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k=0,$=0,I=null,d=0,G=0,A=0,f="month",m=null,O=!1,w=!1,M=!1,F="confirm";const se="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",le="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function ee(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function H(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function g(){return l.activeHotelName||"Your Property"}function J(){return h.rooms[0]||l.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function de(){const e=J();return e.images?.[0]?.url||e.imageUrl||""}function ce(){return h.rates?.nightly||99}function ue(){const e=Number(h.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),n=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${H(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${H(n)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function R(){if(ee()&&l.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",l.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||l.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return l.activeHotelId&&t.searchParams.set("hotelId",l.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function P(){const e=String(o.domain||l.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function me(){const e=new URL(window.location.href);return e.search="",e.hash="",l.activeHotelId&&e.searchParams.set("hotelId",l.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function T(e=""){const t=l.activeHotelAppIcon||de(),a=g().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${c(t)}" alt="">`:`<span class="${e}">${c(a)}</span>`}function ve(){if(!l.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(L,String(r))}catch{}}function v(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function s(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...t},a)}function pe(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function te(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function q(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function D(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function S(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function N(e="",t=!1){const a=m;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;v("BookingChallengeAbandoned",e),s("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),D(a)}}function j(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${q(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function ge(e){!e||e!==m||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),D(e),S(e.modal,!0),e.timer.hidden=!1,j(e),e.timerId=window.setInterval(()=>j(e),500),v("BookingChallengeStarted"),s("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:P()}))}function be(e){!e||e!==m||e.hasPrompted||u!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>ge(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",D(e),S(e.modal,!0),v("BookingChallengeDismissed"),s("JourneyBookingChallengeDismissed")}),v("BookingChallengeShown"),s("JourneyBookingChallengeShown",{bookingDomain:P()}))}function fe(e){if(!e||e!==m)return;if(e.status!=="running"){s("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${c(q(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{D(e),_(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{D(e),S(e.modal,!0)}),v("BookingChallengeCheckoutReached",q(t)),s("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function ae(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(n=>n.contentWindow===e.source))){if(t==="marketel:checkout-reached"){if(m?.iframe?.contentWindow!==e.source||u!=="guest")return;fe(m);return}m?.iframe?.contentWindow===e.source&&(v("GuestAppPreviewRequestedFromBookingEngine"),_(m.modal,"edit",m.previewOpenedAt,"booking-install-explainer-continued"))}}function ye(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",l.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${c(t)}</small>
    </div>`).join("")}
  </div>`}function he(){return w?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function we(){const e=R();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${c(P())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${c(g())} booking-page preview" src="${c(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${e?"View your booking page":"Check booking page preview"}" ${w?"disabled":""}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <span class="mvr-expand-corners">
            <i class="is-top-left"></i><i class="is-top-right"></i>
            <i class="is-bottom-left"></i><i class="is-bottom-right"></i>
          </span>
          <strong>${w?"Still publishing":"View your booking page"}</strong>
        </span>
      </button>
    </div>
  </div>`}function ke(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${c(J().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then continue to your Guest App and Front Desk.
      </div>
      ${he()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${we()}
    </div>
  </section>`}function Q(e,t){return`<img class="mvr-ios-system-icon" src="${c(e)}" alt="${c(t)}">`}function Se(){return`<section class="mvr-stage mvr-stage-app">
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
                    <div class="mvr-install-property-icon">${T()}</div>
                    <div>
                      <strong>Get the ${c(g())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${p?"disabled":""}>${p?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${p?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${T()}</div>
                      <div class="mvr-dock-icon">${Q(se,"Phone")}</div>
                      <div class="mvr-dock-icon">${Q(le,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${d===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${T()}</div>
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
                    <span class="mvr-app-push-icon">${T()}</span>
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
  </section>`}function Ie(){const e=J().name||"King Suite",t=F==="release";return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>When a direct booking arrives, Front Desk asks you and the people you choose whether the room is still available. If a walk-in or another booking took it, reply normally and Marketel handles the rest.</p>
      <div class="mvr-callout">
        <strong>You stay in control—even when you miss the alert.</strong>
        Choose whether silence keeps the sale or protects availability. You can change the rule anytime.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-booking-alert">
        <div class="mvr-marketel-avatar">M</div>
        <div><span>Front Desk</span><strong>New ${c(e)} booking</strong><small>Tomorrow · ${H(ce())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in" style="--stagger:0">Is ${c(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out" style="--stagger:1">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success" style="--stagger:2"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-fallback-control">
        <strong>If nobody answers</strong>
        <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
          <button type="button" data-mvr-fallback="confirm" class="${t?"":"is-selected"}"><b>Keep the booking</b><span>Revenue first</span></button>
          <button type="button" data-mvr-fallback="release" class="${t?"is-selected":""}"><b>Release request</b><span>Availability first</span></button>
        </div>
        <small>${t?"Your rule: void the $1 hold and notify the guest if nobody replies.":"Your rule: confirm the booking automatically if nobody replies."}</small>
      </div>
    </div>
  </section>`}function $e(){const e=l.hotelSubscribed,t=f==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",n=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",b=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${c(g())} is ready.`:`Marketel is ready for ${c(g())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Your booking page, guest app and Front Desk are ready."}</p>
      ${e?`${b}
        <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">Open Front Desk</button>
        <div class="mvr-secure-note">You can replay this overview anytime from How it works.</div>`:`
        <div class="mvr-activation-decision">
          <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!t}" class="${t?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${t}" class="${t?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
          </div>
          <div class="mvr-price"><strong>${a}</strong><span>${i}</span></div>
          <div class="mvr-price-detail${t?" is-visible":""}">${t?"Two months free · $398 saved":"&nbsp;"}</div>
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${n}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
        </div>
        <div class="mvr-activation-proof">
          ${ue()}
          <div class="mvr-included-label">Everything included</div>
          ${b}
        </div>`}
    </div>
  </section>`}function Ae(){return r===0?ke():r===1?Se():r===2?Ie():$e()}function Re(){if(r===0)return!O&&!w?"":`<div class="mvr-footer mvr-footer-booking">
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
      ${ye()}
    </header>
    <main class="mvr-main">${Ae()}</main>
    ${Re()}
  </div>`,Le())}function Ce(){const e=R();if(document.getElementById("mvrLivePreview"))return;if(!e){w=!0,s("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:o.reason||"missing-url"}),y();return}O=!0,u="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
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
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");m={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},m.promptFallbackId=window.setTimeout(()=>{m?.modal!==a||m.status!=="waiting"||S(a,!0)},4e3),i?.addEventListener("load",()=>{const n=m;n?.modal!==a||u!=="guest"||(n.promptDelayId&&window.clearTimeout(n.promptDelayId),n.promptDelayId=window.setTimeout(()=>{n.promptDelayId=0,be(n)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{s("JourneyBookingPreviewModeChanged",{action:"closed",mode:u},{durationMs:Date.now()-t}),N("preview-closed",!0),m=null,a.remove(),y()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{X(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(u==="guest"){_(a,"edit",t,"guided-forward");return}X(a,t,"continued-from-editor-preview")}),v("BookingEngineFullPreviewOpened"),s("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function X(e,t,a){e?.isConnected&&(s("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:u==="edit"},{durationMs:Date.now()-t}),N("continued-to-guest-app",!1),m=null,e.remove(),x(1))}function _(e,t,a,i="mode-selected"){if(!e?.isConnected)return;N("edit-mode-selected",!0),u="edit";const n=e.querySelector("#mvrLiveLocation"),b=e.querySelector("[data-live-location-text]"),K=e.querySelector("#mvrLiveForward"),W=e.querySelector("#mvrContinueGuestApp"),z=e.querySelector("[data-live-forward-long]");n?.classList.toggle("is-editor",u==="edit"),b&&(b.textContent=u==="edit"?"Front Desk editor":P()),n&&n.setAttribute("aria-label",u==="edit"?"Front Desk editor":"Your live booking address"),z&&(z.textContent=u==="edit"?"Continue to Guest App":"See how to edit your booking page"),K&&K.setAttribute("aria-label",u==="edit"?"Continue to the Guest App":"See how you edit this booking page"),W&&(W.hidden=u==="edit"),S(e,!0);const V=e.querySelector(".mvr-live-stage > iframe");V&&(V.title=u==="edit"?`${g()} Front Desk editor`:`${g()} booking-page preview`,V.src=u==="edit"?me():R()),s("JourneyBookingPreviewModeChanged",{action:i,mode:u},{durationMs:Date.now()-a}),u==="edit"&&v("BookingEngineEditPreviewViewed")}function x(e){E();const t=r,a=Math.max(0,Math.min(3,e)),i=Date.now();A&&a!==t&&s("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-A}),r=a,A=i,ve(),v(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),s("JourneyRevealStageViewed",{resumed:M,bookingPageReady:r===0?!!o.ready:void 0}),M=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Ee(){A&&s("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:G?Date.now()-G:null},{durationMs:Date.now()-A}),k&&(window.clearTimeout(k),k=0),N("reveal-finished",!0),m=null,E(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",ae),l.settingsTourActive=!1;try{localStorage.removeItem(C),localStorage.removeItem(L),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}pe(),te(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Be(e){if(l.hotelSubscribed){Ee();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",v("ActivationCtaClicked");try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function E(){$&&(window.clearTimeout($),$=0),I?.disconnect(),I=null}function Y(e){p=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",p);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=p?"Installed ✓":"Install",a.disabled=p);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=p?"Now on their Home Screen":"Tap Install")}function U(e,t=!1){E(),d=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",d===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,n)=>{i.setAttribute("aria-hidden",n===d?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const n=Number(i.dataset.mvrAppSlide)===d;i.classList.toggle("is-active",n),i.setAttribute("aria-current",n?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===d}),d===1?Y(!0):(Y(!1),re()),t&&v(d===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),s("JourneyGuestAppDemo",{action:"slide-viewed",slide:d===1?"value":"install",manual:!!t}))}function ie(e=!1){p||d!==0||(E(),Y(!0),e&&v("GuestAppInstallDemoClicked"),s("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),$=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&U(1,!1)},e?900:1200))}function re(){if(E(),r!==1||d!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{$||($=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(p?U(1,!1):ie(!1))},p?900:1300))};"IntersectionObserver"in window?(I=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(I?.disconnect(),I=null,t())},{threshold:[.35]}),I.observe(e)):t()}function Le(){document.getElementById("mvrNext")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"next",toStep:r+1}),x(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"back",toStep:r-1}),x(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Ce),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Be(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==f){f=t;try{localStorage.setItem(Z,f)}catch{}v(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),s("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{ie(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==d&&U(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==F&&(F=t,v(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),s("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),y())})}),re()}async function De(){return B||typeof window.api!="function"||(B=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(h={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},F=t?.data?.noResponseAction==="release"?"release":"confirm",h.rooms.length&&(l.editRooms=h.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),h)).catch(()=>h).finally(()=>{B=null})),B}async function oe(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(ee()){o={ready:!!R(),checking:!1,reason:"local",attempts:1,domain:""},R()&&(w=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}R()&&(w=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(k=window.setTimeout(oe,6e3))}}function Pe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(L)||"0",10)}catch{}try{i=localStorage.getItem(C)==="1"}catch{}try{f=localStorage.getItem(Z)==="year"?"year":"month"}catch{f="month"}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),l.hotelSubscribed&&r===3&&(r=0),u="guest",p=!1,d=0,O=!1,w=!1,G=Date.now(),A=0,M=!Number.isFinite(t)&&i,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k&&window.clearTimeout(k),k=0,E(),!l.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(L,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}l.settingsTourActive=!0,window.addEventListener("message",ae),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",te(!1);const n=document.createElement("div");n.id="marketelValueReveal",n.className="mvr-root",document.body.appendChild(n),y(),v("ValueRevealStarted",l.hotelSubscribed?"subscribed-replay":"pre-activation"),s("JourneyRevealStarted",{startStep:r,replay:!!l.hotelSubscribed,pendingResume:M}),x(r),De(),oe()}function Te(){try{return localStorage.getItem(C)==="1"}catch{return!1}}function Me(){try{localStorage.removeItem(C),localStorage.removeItem(L)}catch{}}const Fe={clearPendingMarketelValueReveal:Me,hasPendingMarketelValueReveal:Te,showMarketelValueReveal:Pe};function Ne(){ne(Fe)}export{Me as clearPendingMarketelValueReveal,Fe as default,Te as hasPendingMarketelValueReveal,Ne as install,Pe as showMarketelValueReveal};
