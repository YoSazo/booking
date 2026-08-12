import{c as d,e as le}from"./settings-C-XMJ1IW.js";const E="marketelValueRevealPendingV1",D="marketelValueRevealStepV1",ee="marketelBillingIntervalV1";let o=0,m="guest",g=!1,w={rooms:[],rates:null},P=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},S=0,R=0,A=null,c=0,O=0,B=0,f="month",s=null,K=!1,k=!1,V=!1,q="confirm";const de="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",ce="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function te(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function u(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function J(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function b(){return d.activeHotelName||"Your Property"}function W(){return w.rooms[0]||d.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function ue(){const e=W();return e.images?.[0]?.url||e.imageUrl||""}function me(){return w.rates?.nightly||99}function ve(){const e=Number(w.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),r=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${J(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${J(r)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function C(){if(te()&&d.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",d.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=n.domain||d.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return d.activeHotelId&&t.searchParams.set("hotelId",d.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function M(){const e=String(n.domain||d.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${b().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function pe(){const e=new URL(window.location.href);return e.search="",e.hash="",d.activeHotelId&&e.searchParams.set("hotelId",d.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function H(e=""){const t=d.activeHotelAppIcon||ue(),a=b().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${u(t)}" alt="">`:`<span class="${e}">${u(a)}</span>`}function ge(){if(!d.hotelSubscribed)try{localStorage.setItem(E,"1"),localStorage.setItem(D,String(o))}catch{}}function p(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:o,stageName:["booking-page","guest-app","front-desk-assistant","activation"][o]||"unknown",...t},a)}function be(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ae(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function _(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function T(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function I(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function Y(e="",t=!1){const a=s;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;p("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),T(a)}}function X(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${_(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function fe(e){!e||e!==s||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),T(e),I(e.modal,!0),e.timer.hidden=!1,X(e),e.timerId=window.setInterval(()=>X(e),500),p("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:M()}))}function he(e){!e||e!==s||e.hasPrompted||m!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),I(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>fe(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",T(e),I(e.modal,!0),p("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),p("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:M()}))}function ye(e){if(!e||e!==s)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,I(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${u(_(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{T(e),F(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{T(e),I(e.modal,!0)}),p("BookingChallengeCheckoutReached",_(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function ie(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(r=>r.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(s?.iframe?.contentWindow!==e.source||m!=="edit")return;e.data?.hotelName&&(d.activeHotelName=String(e.data.hotelName)),s.modal.dataset.editorSaved="1";const r=Array.isArray(e.data?.changedFields)?e.data.changedFields.map($=>String($)):[],v=String(e.data?.kind||"booking-page");let h="header";if(v==="header"){const $=new Set(["name","subtitle","address"]);h=r.length===1&&$.has(r[0])?`header-${r[0]}`:"header"}else v.includes("photo")?h="room-photo":v==="room"&&(h="room");s.modal.dataset.editorHighlight=h,e.data?.roomId?s.modal.dataset.editorHighlightRoom=String(e.data.roomId):delete s.modal.dataset.editorHighlightRoom,l("JourneyBookingPreviewEdited",{kind:v,changedFields:r,highlightTarget:h}),ne(),F(s.modal,"guest",s.previewOpenedAt,"saved-and-returned-to-booking-page");return}if(t==="marketel:checkout-reached"){if(s?.iframe?.contentWindow!==e.source||m!=="guest")return;ye(s);return}s?.iframe?.contentWindow===e.source&&(p("GuestAppPreviewRequestedFromBookingEngine"),F(s.modal,"edit",s.previewOpenedAt,"booking-install-explainer-continued"))}}function we(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",d.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===o?"is-active":""} ${a<o?"is-done":""}">
      <span></span><small>${u(t)}</small>
    </div>`).join("")}
  </div>`}function ke(){return k?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':n.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Se(){const e=C();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${u(M())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${u(b())} booking-page preview" src="${u(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${e?"View your booking page":"Check booking page preview"}" ${k?"disabled":""}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <span class="mvr-expand-corners">
            <i class="is-top-left"></i><i class="is-top-right"></i>
            <i class="is-bottom-left"></i><i class="is-bottom-right"></i>
          </span>
          <strong>${k?"Still publishing":"View your booking page"}</strong>
        </span>
      </button>
    </div>
  </div>`}function Ie(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${u(W().name||"a room")}</strong> and book directly in under 60 seconds.</p>
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
      <p>Guests install <strong>${u(b())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${g?"is-installed":""} ${c===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${c===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${H()}</div>
                    <div>
                      <strong>Get the ${u(b())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${g?"disabled":""}>${g?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${g?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${H()}</div>
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
                  <div class="mvr-installed-app-icon">${H()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${u(b())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${H()}</span>
                    <strong>${u(b())}</strong>
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
  </section>`}function Ae(){const e=W().name||"King Suite",t=q==="release";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${u(e)} booking</strong><small>Tomorrow · ${J(me())}</small></div>
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
  </section>`}function Re(){const e=d.hotelSubscribed,t=f==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",r=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",v=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${u(b())} is ready.`:`Marketel is ready for ${u(b())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Your booking page, guest app and Front Desk are ready."}</p>
      ${e?`${v}
        <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">Open Front Desk</button>
        <div class="mvr-secure-note">You can replay this overview anytime from How it works.</div>`:`
        <div class="mvr-activation-decision">
          <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!t}" class="${t?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${t}" class="${t?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
          </div>
          <div class="mvr-price"><strong>${a}</strong><span>${i}</span></div>
          <div class="mvr-price-detail${t?" is-visible":""}">${t?"Two months free · $398 saved":"&nbsp;"}</div>
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${r}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
        </div>
        <div class="mvr-activation-proof">
          ${ve()}
          <div class="mvr-included-label">Everything included</div>
          ${v}
        </div>`}
    </div>
  </section>`}function Be(){return o===0?Ie():o===1?$e():o===2?Ae():Re()}function Ce(){if(o===0)return!K&&!k?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">Continue to Guest App →</button>
    </div>`;if(o===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["","See how Front Desk protects you","Review plans and activation"];return`<div class="mvr-footer">
    ${o>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[o]} →</button>
  </div>`}function y(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${we()}
    </header>
    <main class="mvr-main">${Be()}</main>
    ${Ce()}
  </div>`,Te())}function Ee(){const e=C();if(document.getElementById("mvrLivePreview"))return;if(!e){k=!0,l("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:n.reason||"missing-url"}),y();return}K=!0,m="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${u(M())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${u(b())} live preview" src="${u(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">Continue to Guest App</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");s={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},s.promptFallbackId=window.setTimeout(()=>{s?.modal!==a||s.status!=="waiting"||I(a,!0)},4e3),i?.addEventListener("load",()=>{const r=s;r?.modal!==a||m!=="guest"||(r.promptDelayId&&window.clearTimeout(r.promptDelayId),r.promptDelayId=window.setTimeout(()=>{r.promptDelayId=0,he(r)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:m},{durationMs:Date.now()-t}),Y("preview-closed",!0),s=null,a.remove(),y()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Le(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(m==="guest"){F(a,"edit",t,"guided-forward");return}F(a,"guest",t,"returned-to-booking-page")}),p("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!n.ready,bookingPageReason:n.reason||""})}function Le(e,t,a){e?.isConnected&&(l("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:m==="edit"},{durationMs:Date.now()-t}),Y("continued-to-guest-app",!1),s=null,e.remove(),G(1))}function F(e,t,a,i="mode-selected"){if(!e?.isConnected)return;t==="edit"&&Y("edit-mode-selected",!0),m=t==="edit"?"edit":"guest";const r=e.querySelector("#mvrLiveLocation"),v=e.querySelector("[data-live-location-text]"),h=e.querySelector("#mvrLiveForward"),$=e.querySelector("#mvrContinueGuestApp"),j=e.querySelector("[data-live-forward-long]"),Q=h?.querySelector("b");r?.classList.toggle("is-editor",m==="edit"),v&&(v.textContent=m==="edit"?"Front Desk editor":M()),r&&r.setAttribute("aria-label",m==="edit"?"Front Desk editor":"Your live booking address"),j&&(j.textContent=m==="edit"?"Back to your booking page":"See how to edit your booking page"),Q&&(Q.textContent=m==="edit"?"↩":"→"),h&&h.setAttribute("aria-label",m==="edit"?"Back to your direct booking page":"See how you edit this booking page"),$&&($.hidden=!1),I(e,!0);const N=e.querySelector(".mvr-live-stage > iframe");if(N)if(N.title=m==="edit"?`${b()} Front Desk editor`:`${b()} booking-page preview`,m==="edit")N.src=pe();else{const x=new URL(C());e.dataset.editorSaved==="1"&&(x.searchParams.set("previewRefresh",String(Date.now())),x.searchParams.set("previewHighlight",e.dataset.editorHighlight||"header"),e.dataset.editorHighlightRoom&&x.searchParams.set("previewHighlightRoom",e.dataset.editorHighlightRoom),delete e.dataset.editorSaved,delete e.dataset.editorHighlight,delete e.dataset.editorHighlightRoom),N.src=x.toString()}l("JourneyBookingPreviewModeChanged",{action:i,mode:m},{durationMs:Date.now()-a}),m==="edit"&&p("BookingEngineEditPreviewViewed")}function G(e){L();const t=o,a=Math.max(0,Math.min(3,e)),i=Date.now();B&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-B}),o=a,B=i,ge(),p(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][o]),l("JourneyRevealStageViewed",{resumed:V,bookingPageReady:o===0?!!n.ready:void 0}),V=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Pe(){B&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:O?Date.now()-O:null},{durationMs:Date.now()-B}),S&&(window.clearTimeout(S),S=0),Y("reveal-finished",!0),s=null,L(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",ie),d.settingsTourActive=!1;try{localStorage.removeItem(E),localStorage.removeItem(D),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}be(),ae(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function De(e){if(d.hotelSubscribed){Pe();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",p("ActivationCtaClicked");try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function L(){R&&(window.clearTimeout(R),R=0),A?.disconnect(),A=null}function U(e){g=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",g);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=g?"Installed ✓":"Install",a.disabled=g);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=g?"Now on their Home Screen":"Tap Install")}function z(e,t=!1){L(),c=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",c===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,r)=>{i.setAttribute("aria-hidden",r===c?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const r=Number(i.dataset.mvrAppSlide)===c;i.classList.toggle("is-active",r),i.setAttribute("aria-current",r?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===c}),c===1?U(!0):(U(!1),oe()),t&&p(c===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:c===1?"value":"install",manual:!!t}))}function re(e=!1){g||c!==0||(L(),U(!0),e&&p("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),R=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&z(1,!1)},e?900:1200))}function oe(){if(L(),o!==1||c!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{R||(R=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&(g?z(1,!1):re(!1))},g?900:1300))};"IntersectionObserver"in window?(A=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(A?.disconnect(),A=null,t())},{threshold:[.35]}),A.observe(e)):t()}function Te(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:o+1}),G(o+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:o-1}),G(o-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Ee),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>De(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==f){f=t;try{localStorage.setItem(ee,f)}catch{}p(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{re(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==c&&z(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==q&&(q=t,p(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),l("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),y())})}),oe()}async function ne(){return P||typeof window.api!="function"||(P=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(w={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},q=t?.data?.noResponseAction==="release"?"release":"confirm",w.rooms.length&&(d.editRooms=w.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),w)).catch(()=>w).finally(()=>{P=null})),P}async function se(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(te()){n={ready:!!C(),checking:!1,reason:"local",attempts:1,domain:""},C()&&(k=!1),l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&y();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")}}catch{n.checking=!1,n.reason="unreachable"}C()&&(k=!1),l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&y(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&(S=window.setTimeout(se,6e3))}}function Fe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(D)||"0",10)}catch{}try{i=localStorage.getItem(E)==="1"}catch{}try{f=localStorage.getItem(ee)==="year"?"year":"month"}catch{f="month"}if(o=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),d.hotelSubscribed&&o===3&&(o=0),m="guest",g=!1,c=0,K=!1,k=!1,O=Date.now(),B=0,V=!Number.isFinite(t)&&i,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},S&&window.clearTimeout(S),S=0,L(),!d.hotelSubscribed)try{localStorage.setItem(E,"1"),localStorage.setItem(D,String(o))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}d.settingsTourActive=!0,window.addEventListener("message",ie),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ae(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),y(),p("ValueRevealStarted",d.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:o,replay:!!d.hotelSubscribed,pendingResume:V}),G(o),ne(),se()}function Me(){try{return localStorage.getItem(E)==="1"}catch{return!1}}function Ne(){try{localStorage.removeItem(E),localStorage.removeItem(D)}catch{}}const xe={clearPendingMarketelValueReveal:Ne,hasPendingMarketelValueReveal:Me,showMarketelValueReveal:Fe};function Ve(){le(xe)}export{Ne as clearPendingMarketelValueReveal,xe as default,Me as hasPendingMarketelValueReveal,Ve as install,Fe as showMarketelValueReveal};
