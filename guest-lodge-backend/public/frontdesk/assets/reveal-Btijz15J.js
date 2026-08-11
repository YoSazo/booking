import{c as l,e as le}from"./settings-DfNzs4jA.js";const C="marketelValueRevealPendingV1",L="marketelValueRevealStepV1",ee="marketelBillingIntervalV1";let r=0,m="guest",p=!1,h={rooms:[],rates:null},E=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k=0,$=0,I=null,c=0,G=0,A=0,f="month",d=null,_=!1,w=!1,N=!1,x="confirm";const de="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",ce="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function te(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function u(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Y(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function g(){return l.activeHotelName||"Your Property"}function U(){return h.rooms[0]||l.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function ue(){const e=U();return e.images?.[0]?.url||e.imageUrl||""}function me(){return h.rates?.nightly||99}function ve(){const e=Number(h.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),n=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${Y(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${Y(n)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function R(){if(te()&&l.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",l.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||l.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return l.activeHotelId&&t.searchParams.set("hotelId",l.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function T(){const e=String(o.domain||l.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function pe(){const e=new URL(window.location.href);return e.search="",e.hash="",l.activeHotelId&&e.searchParams.set("hotelId",l.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function F(e=""){const t=l.activeHotelAppIcon||ue(),a=g().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${u(t)}" alt="">`:`<span class="${e}">${u(a)}</span>`}function ge(){if(!l.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(L,String(r))}catch{}}function v(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function s(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...t},a)}function be(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ae(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function O(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function P(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function S(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function q(e="",t=!1){const a=d;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;v("BookingChallengeAbandoned",e),s("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),P(a)}}function X(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${O(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function fe(e){!e||e!==d||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),P(e),S(e.modal,!0),e.timer.hidden=!1,X(e),e.timerId=window.setInterval(()=>X(e),500),v("BookingChallengeStarted"),s("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:T()}))}function ye(e){!e||e!==d||e.hasPrompted||m!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>fe(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",P(e),S(e.modal,!0),v("BookingChallengeDismissed"),s("JourneyBookingChallengeDismissed")}),v("BookingChallengeShown"),s("JourneyBookingChallengeShown",{bookingDomain:T()}))}function he(e){if(!e||e!==d)return;if(e.status!=="running"){s("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,S(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${u(O(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{P(e),D(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{P(e),S(e.modal,!0)}),v("BookingChallengeCheckoutReached",O(t)),s("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function ie(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(n=>n.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(d?.iframe?.contentWindow!==e.source||m!=="edit")return;e.data?.hotelName&&(l.activeHotelName=String(e.data.hotelName)),d.modal.dataset.editorSaved="1",s("JourneyBookingPreviewEdited",{kind:String(e.data?.kind||"booking-page")}),ne(),D(d.modal,"guest",d.previewOpenedAt,"saved-and-returned-to-booking-page"),Le(d.modal);return}if(t==="marketel:checkout-reached"){if(d?.iframe?.contentWindow!==e.source||m!=="guest")return;he(d);return}d?.iframe?.contentWindow===e.source&&(v("GuestAppPreviewRequestedFromBookingEngine"),D(d.modal,"edit",d.previewOpenedAt,"booking-install-explainer-continued"))}}function we(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",l.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${u(t)}</small>
    </div>`).join("")}
  </div>`}function ke(){return w?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Se(){const e=R();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${u(T())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${u(g())} booking-page preview" src="${u(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
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
  </div>`}function Ie(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${u(U().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then continue to your Guest App and Front Desk.
      </div>
      ${ke()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Se()}
    </div>
  </section>`}function Z(e,t){return`<img class="mvr-ios-system-icon" src="${u(e)}" alt="${u(t)}">`}function $e(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${u(g())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${p?"is-installed":""} ${c===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${c===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${F()}</div>
                    <div>
                      <strong>Get the ${u(g())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${p?"disabled":""}>${p?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${p?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${F()}</div>
                      <div class="mvr-dock-icon">${Z(de,"Phone")}</div>
                      <div class="mvr-dock-icon">${Z(ce,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${c===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${F()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${u(g())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${F()}</span>
                    <strong>${u(g())}</strong>
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
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${c===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${c===0?"is-active":""}" aria-label="Installation" aria-current="${c===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${c===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${c===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${c===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function Ae(){const e=U().name||"King Suite",t=x==="release";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${u(e)} booking</strong><small>Tomorrow · ${Y(me())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in" style="--stagger:0">Is ${u(e)} still available tomorrow?</div>
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
  </section>`}function Re(){const e=l.hotelSubscribed,t=f==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",n=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",b=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${u(g())} is ready.`:`Marketel is ready for ${u(g())}.`}</h1>
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
          ${ve()}
          <div class="mvr-included-label">Everything included</div>
          ${b}
        </div>`}
    </div>
  </section>`}function Ce(){return r===0?Ie():r===1?$e():r===2?Ae():Re()}function Be(){if(r===0)return!_&&!w?"":`<div class="mvr-footer mvr-footer-booking">
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
      ${we()}
    </header>
    <main class="mvr-main">${Ce()}</main>
    ${Be()}
  </div>`,Me())}function Ee(){const e=R();if(document.getElementById("mvrLivePreview"))return;if(!e){w=!0,s("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:o.reason||"missing-url"}),y();return}_=!0,m="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${u(T())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${u(g())} live preview" src="${u(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">Continue to Guest App</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");d={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},d.promptFallbackId=window.setTimeout(()=>{d?.modal!==a||d.status!=="waiting"||S(a,!0)},4e3),i?.addEventListener("load",()=>{const n=d;n?.modal!==a||m!=="guest"||(n.promptDelayId&&window.clearTimeout(n.promptDelayId),n.promptDelayId=window.setTimeout(()=>{n.promptDelayId=0,ye(n)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{s("JourneyBookingPreviewModeChanged",{action:"closed",mode:m},{durationMs:Date.now()-t}),q("preview-closed",!0),d=null,a.remove(),y()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Pe(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(m==="guest"){D(a,"edit",t,"guided-forward");return}D(a,"guest",t,"returned-to-booking-page")}),v("BookingEngineFullPreviewOpened"),s("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function Le(e){if(!e?.isConnected)return;e.querySelector(".mvr-live-saved-confirmation")?.remove();const t=document.createElement("div");t.className="mvr-live-saved-confirmation",t.setAttribute("role","status"),t.innerHTML='<span aria-hidden="true">✓</span><strong>Saved</strong><small>You’re viewing your changes.</small>',e.querySelector(".mvr-live-stage")?.appendChild(t),window.setTimeout(()=>t.remove(),2600)}function Pe(e,t,a){e?.isConnected&&(s("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:m==="edit"},{durationMs:Date.now()-t}),q("continued-to-guest-app",!1),d=null,e.remove(),V(1))}function D(e,t,a,i="mode-selected"){if(!e?.isConnected)return;t==="edit"&&q("edit-mode-selected",!0),m=t==="edit"?"edit":"guest";const n=e.querySelector("#mvrLiveLocation"),b=e.querySelector("[data-live-location-text]"),H=e.querySelector("#mvrLiveForward"),W=e.querySelector("#mvrContinueGuestApp"),z=e.querySelector("[data-live-forward-long]"),j=H?.querySelector("b");n?.classList.toggle("is-editor",m==="edit"),b&&(b.textContent=m==="edit"?"Front Desk editor":T()),n&&n.setAttribute("aria-label",m==="edit"?"Front Desk editor":"Your live booking address"),z&&(z.textContent=m==="edit"?"Back to your booking page":"See how to edit your booking page"),j&&(j.textContent=m==="edit"?"↩":"→"),H&&H.setAttribute("aria-label",m==="edit"?"Back to your direct booking page":"See how you edit this booking page"),W&&(W.hidden=!1),S(e,!0);const M=e.querySelector(".mvr-live-stage > iframe");if(M)if(M.title=m==="edit"?`${g()} Front Desk editor`:`${g()} booking-page preview`,m==="edit")M.src=pe();else{const Q=new URL(R());e.dataset.editorSaved==="1"&&(Q.searchParams.set("previewRefresh",String(Date.now())),delete e.dataset.editorSaved),M.src=Q.toString()}s("JourneyBookingPreviewModeChanged",{action:i,mode:m},{durationMs:Date.now()-a}),m==="edit"&&v("BookingEngineEditPreviewViewed")}function V(e){B();const t=r,a=Math.max(0,Math.min(3,e)),i=Date.now();A&&a!==t&&s("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-A}),r=a,A=i,ge(),v(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),s("JourneyRevealStageViewed",{resumed:N,bookingPageReady:r===0?!!o.ready:void 0}),N=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function De(){A&&s("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:G?Date.now()-G:null},{durationMs:Date.now()-A}),k&&(window.clearTimeout(k),k=0),q("reveal-finished",!0),d=null,B(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",ie),l.settingsTourActive=!1;try{localStorage.removeItem(C),localStorage.removeItem(L),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}be(),ae(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Te(e){if(l.hotelSubscribed){De();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",v("ActivationCtaClicked");try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function B(){$&&(window.clearTimeout($),$=0),I?.disconnect(),I=null}function J(e){p=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",p);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=p?"Installed ✓":"Install",a.disabled=p);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=p?"Now on their Home Screen":"Tap Install")}function K(e,t=!1){B(),c=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",c===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,n)=>{i.setAttribute("aria-hidden",n===c?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const n=Number(i.dataset.mvrAppSlide)===c;i.classList.toggle("is-active",n),i.setAttribute("aria-current",n?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===c}),c===1?J(!0):(J(!1),oe()),t&&v(c===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),s("JourneyGuestAppDemo",{action:"slide-viewed",slide:c===1?"value":"install",manual:!!t}))}function re(e=!1){p||c!==0||(B(),J(!0),e&&v("GuestAppInstallDemoClicked"),s("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),$=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&K(1,!1)},e?900:1200))}function oe(){if(B(),r!==1||c!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{$||($=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(p?K(1,!1):re(!1))},p?900:1300))};"IntersectionObserver"in window?(I=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(I?.disconnect(),I=null,t())},{threshold:[.35]}),I.observe(e)):t()}function Me(){document.getElementById("mvrNext")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"next",toStep:r+1}),V(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"back",toStep:r-1}),V(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Ee),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Te(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==f){f=t;try{localStorage.setItem(ee,f)}catch{}v(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),s("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{re(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==c&&K(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==x&&(x=t,v(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),s("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),y())})}),oe()}async function ne(){return E||typeof window.api!="function"||(E=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(h={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},x=t?.data?.noResponseAction==="release"?"release":"confirm",h.rooms.length&&(l.editRooms=h.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),h)).catch(()=>h).finally(()=>{E=null})),E}async function se(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(te()){o={ready:!!R(),checking:!1,reason:"local",attempts:1,domain:""},R()&&(w=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}R()&&(w=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&y(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(k=window.setTimeout(se,6e3))}}function Fe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(L)||"0",10)}catch{}try{i=localStorage.getItem(C)==="1"}catch{}try{f=localStorage.getItem(ee)==="year"?"year":"month"}catch{f="month"}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),l.hotelSubscribed&&r===3&&(r=0),m="guest",p=!1,c=0,_=!1,w=!1,G=Date.now(),A=0,N=!Number.isFinite(t)&&i,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k&&window.clearTimeout(k),k=0,B(),!l.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(L,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}l.settingsTourActive=!0,window.addEventListener("message",ie),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ae(!1);const n=document.createElement("div");n.id="marketelValueReveal",n.className="mvr-root",document.body.appendChild(n),y(),v("ValueRevealStarted",l.hotelSubscribed?"subscribed-replay":"pre-activation"),s("JourneyRevealStarted",{startStep:r,replay:!!l.hotelSubscribed,pendingResume:N}),V(r),ne(),se()}function Ne(){try{return localStorage.getItem(C)==="1"}catch{return!1}}function xe(){try{localStorage.removeItem(C),localStorage.removeItem(L)}catch{}}const Ve={clearPendingMarketelValueReveal:xe,hasPendingMarketelValueReveal:Ne,showMarketelValueReveal:Fe};function He(){le(Ve)}export{xe as clearPendingMarketelValueReveal,Ve as default,Ne as hasPendingMarketelValueReveal,He as install,Fe as showMarketelValueReveal};
