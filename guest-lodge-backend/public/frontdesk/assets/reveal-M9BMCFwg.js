import{c as d,e as de}from"./settings-B4WoF5xs.js";const L="marketelValueRevealPendingV1",H="marketelValueRevealStepV1",te="marketelBillingIntervalV1";let o=0,m="guest",g=!1,k={rooms:[],rates:null},E=null,s={ready:!1,checking:!0,reason:"",attempts:0,domain:""},S=0,R=0,A=null,v=0,Y=0,D=0,b="month",n=null,W=!1,w=!1,V=!1,q="confirm";const ce="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",ve="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function ae(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function J(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function f(){return d.activeHotelName||"Your Property"}function z(){return k.rooms[0]||d.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function me(){const e=z();return e.images?.[0]?.url||e.imageUrl||""}function ue(){return k.rates?.nightly||99}function pe(){const e=Number(k.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),r=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${J(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${J(r)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function B(){if(ae()&&d.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",d.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=s.domain||d.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return d.activeHotelId&&t.searchParams.set("hotelId",d.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function M(){const e=String(s.domain||d.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${f().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ge(){const e=new URL(window.location.href);return e.search="",e.hash="",d.activeHotelId&&e.searchParams.set("hotelId",d.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function N(e=""){const t=d.activeHotelAppIcon||me(),a=f().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${c(t)}" alt="">`:`<span class="${e}">${c(a)}</span>`}function fe(){if(!d.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(H,String(o))}catch{}}function p(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:o,stageName:["booking-page","guest-app","front-desk-assistant","activation"][o]||"unknown",...t},a)}function he(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ie(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function _(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function T(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function $(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function O(e="",t=!1){const a=n;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;p("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),T(a)}}function Z(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${_(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function be(e){!e||e!==n||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),T(e),$(e.modal,!0),e.timer.hidden=!1,Z(e),e.timerId=window.setInterval(()=>Z(e),500),p("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:M()}))}function ye(e){!e||e!==n||e.hasPrompted||m!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),$(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>be(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",T(e),$(e.modal,!0),p("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),p("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:M()}))}function ke(e){if(!e||e!==n)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,$(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${c(_(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{T(e),F(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{T(e),$(e.modal,!0)}),p("BookingChallengeCheckoutReached",_(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function re(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(r=>r.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(n?.iframe?.contentWindow!==e.source||m!=="edit")return;e.data?.hotelName&&(d.activeHotelName=String(e.data.hotelName)),n.modal.dataset.editorSaved="1";const r=Array.isArray(e.data?.changedFields)?e.data.changedFields.map(I=>String(I)):[],u=String(e.data?.kind||"booking-page");let h="header";if(u==="header"){const I=new Set(["name","subtitle","address","phone"]);h=r.length===1&&I.has(r[0])?`header-${r[0]}`:"header"}else u.includes("photo")?h="room-photo":u==="room"?h="room":u==="checkout-policy"&&(h="checkout-policy",n.modal.dataset.editorPreviewTarget="checkout");n.modal.dataset.editorHighlight=h,e.data?.roomId?n.modal.dataset.editorHighlightRoom=String(e.data.roomId):delete n.modal.dataset.editorHighlightRoom,l("JourneyBookingPreviewEdited",{kind:u,changedFields:r,highlightTarget:h}),ne(),F(n.modal,"guest",n.previewOpenedAt,"saved-and-returned-to-booking-page");return}if(t==="marketel:checkout-reached"){if(n?.iframe?.contentWindow!==e.source||m!=="guest")return;ke(n);return}n?.iframe?.contentWindow===e.source&&(p("GuestAppPreviewRequestedFromBookingEngine"),F(n.modal,"edit",n.previewOpenedAt,"booking-install-explainer-continued"))}}function we(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Home Screen","Front Desk",d.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===o?"is-active":""} ${a<o?"is-done":""}">
      <span></span><small>${c(t)}</small>
    </div>`).join("")}
  </div>`}function Se(){return w?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':s.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${s.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:s.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${s.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function $e(){const e=B();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${c(M())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${c(f())} booking-page preview" src="${c(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
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
      <p>Guests can choose <strong>${c(z().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then see how guests save it to their Home Screen and how you run it from Front Desk.
      </div>
      ${Se()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${$e()}
    </div>
  </section>`}function ee(e,t){return`<img class="mvr-ios-system-icon" src="${c(e)}" alt="${c(t)}">`}function Ae(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Guests’ Home Screens</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests save <strong>${c(f())}</strong> to their Home Screen from your booking page—no App Store download. Then they can return in one tap and receive notifications you send from Marketel Front Desk.</p>
      <div class="mvr-callout">
        <strong>One Home Screen save. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${g?"is-installed":""} ${v===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${v===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${N()}</div>
                    <div>
                      <strong>Save ${c(f())} to your Home Screen</strong>
                      <span>Return to this booking page in one tap. No App Store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${g?"disabled":""}>${g?"Saved ✓":"Add"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${g?"Saved to their Home Screen":"Tap Add to Home Screen"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${N()}</div>
                      <div class="mvr-dock-icon">${ee(ce,"Phone")}</div>
                      <div class="mvr-dock-icon">${ee(ve,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${v===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${N()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${c(f())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${N()}</span>
                    <strong>${c(f())}</strong>
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
        <div class="mvr-app-carousel-controls" aria-label="Guest Home Screen demonstration">
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests save the property to their Home Screen" ${v===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${v===0?"is-active":""}" aria-label="Save to Home Screen" aria-current="${v===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${v===1?"is-active":""}" aria-label="What Home Screen access unlocks" aria-current="${v===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what saving the property unlocks" ${v===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function Re(){const e=z().name||"King Suite",t=q==="release",a=new Date;a.setDate(a.getDate()+1);const i=new Date(a);i.setDate(i.getDate()+1);const r=u=>u.toLocaleDateString("en-US",{month:"short",day:"numeric"});return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>When a direct booking arrives, Front Desk asks if the room is still free. If a walk-in or another channel took it, reply with what changed. Marketel updates Availability, releases the request and tells the guest.</p>
      <div class="mvr-callout">
        <strong>You stay in control—even when you miss the alert.</strong>
        Choose whether silence keeps the sale or protects availability. You can change the rule anytime.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-fd-header">
        <div class="mvr-fd-brand">
          <img src="/marketellogo.svg" alt="">
          <div><strong>Front Desk</strong><span>${c(f())}</span></div>
        </div>
        <div class="mvr-fd-live"><i></i> Live</div>
      </div>
      <div class="mvr-fd-tabs" aria-label="Front Desk preview">
        <span>Your page</span>
        <span class="is-active">Bookings <b>1</b></span>
        <span>Availability</span>
        <span>Guest Reach</span>
      </div>
      <div class="mvr-fd-workspace">
        <div class="mvr-fd-page-heading">
          <div><strong>Bookings</strong><span>One request needs a decision</span></div>
          <b>1 needs attention</b>
        </div>
        <article class="mvr-fd-booking">
          <div class="mvr-fd-booking-summary">
            <div class="mvr-fd-booking-main">
              <div class="mvr-fd-booking-name"><strong>Jordan Lee</strong><b>${J(ue())}</b></div>
              <div class="mvr-fd-trip">${c(e)} · ${r(a)} – ${r(i)} · 1 night</div>
              <div class="mvr-fd-status"><span><i></i> Decision due in 5 min</span><small>$1 hold verified</small></div>
            </div>
          </div>
          <div class="mvr-fd-booking-detail">
            <div class="mvr-fd-question"><strong>Is this room still free?</strong><span>No reply ${t?"releases this request":"keeps this booking"}.</span></div>
            <div class="mvr-fd-booking-actions" aria-hidden="true">
              <span>Yes, keep it</span><span>No, release</span>
            </div>
          </div>
        </article>

        <section class="mvr-fd-assistant-activity">
          <div class="mvr-fd-activity-head">
            <div><img src="/marketellogo.svg" alt=""><strong>Front Desk Assistant</strong></div>
            <span>Text conversation</span>
          </div>
          <div class="mvr-fd-message mvr-fd-message-in" style="--stagger:0">Is ${c(e)} still free for ${r(a)}?</div>
          <div class="mvr-fd-message mvr-fd-message-out" style="--stagger:1">No, a walk-in took it.</div>
          <div class="mvr-fd-handled" style="--stagger:2">
            <span>✓</span>
            <div><strong>Handled in Front Desk</strong><small>One fewer room available · guest notified · $1 hold released</small></div>
          </div>
        </section>

        <div class="mvr-fallback-control">
          <strong>If you miss the alert</strong>
          <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
            <button type="button" data-mvr-fallback="confirm" class="${t?"":"is-selected"}"><b>Keep the booking</b><span>Revenue first</span></button>
            <button type="button" data-mvr-fallback="release" class="${t?"is-selected":""}"><b>Release request</b><span>Availability first</span></button>
          </div>
          <small>${t?"Your rule: void the $1 hold and notify the guest if nobody replies.":"Your rule: confirm the booking automatically if nobody replies."}</small>
        </div>
      </div>
    </div>
  </section>`}function De(){const e=d.hotelSubscribed,t=b==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",r=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",u=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your property on guests’ Home Screens</strong><small>No second App Store app—guests save it from your booking page</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Marketel Front Desk and Assistant</strong><small>Tell it when a walk-in takes a room; it updates remaining availability</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${c(f())} is ready.`:`Marketel is ready for ${c(f())}.`}</h1>
      <p>Guests use your direct booking page and can save your property to their Home Screen. You use Marketel Front Desk to manage bookings and availability.</p>
      ${e?`${u}
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
          ${pe()}
          <div class="mvr-included-label">Everything included</div>
          ${u}
        </div>`}
    </div>
  </section>`}function Be(){return o===0?Ie():o===1?Ae():o===2?Re():De()}function Le(){if(o===0)return!W&&!w?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">See the Home Screen experience →</button>
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
    ${Le()}
  </div>`,Te())}function Pe(){const e=B();if(document.getElementById("mvrLivePreview"))return;if(!e){w=!0,l("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:s.reason||"missing-url"}),y();return}W=!0,m="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${c(M())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${c(f())} live preview" src="${c(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">See the Home Screen experience</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");n={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},n.promptFallbackId=window.setTimeout(()=>{n?.modal!==a||n.status!=="waiting"||$(a,!0)},4e3),i?.addEventListener("load",()=>{const r=n;r?.modal!==a||m!=="guest"||(r.promptDelayId&&window.clearTimeout(r.promptDelayId),r.promptDelayId=window.setTimeout(()=>{r.promptDelayId=0,ye(r)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:m},{durationMs:Date.now()-t}),O("preview-closed",!0),n=null,a.remove(),y()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Ce(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(m==="guest"){F(a,"edit",t,"guided-forward");return}F(a,"guest",t,"returned-to-booking-page")}),p("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!s.ready,bookingPageReason:s.reason||""})}function Ce(e,t,a){e?.isConnected&&(l("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:m==="edit"},{durationMs:Date.now()-t}),O("continued-to-guest-app",!1),n=null,e.remove(),G(1))}function F(e,t,a,i="mode-selected"){if(!e?.isConnected)return;t==="edit"&&O("edit-mode-selected",!0),m=t==="edit"?"edit":"guest";const r=e.querySelector("#mvrLiveLocation"),u=e.querySelector("[data-live-location-text]"),h=e.querySelector("#mvrLiveForward"),I=e.querySelector("#mvrContinueGuestApp"),j=e.querySelector("[data-live-forward-long]"),Q=h?.querySelector("b");r?.classList.toggle("is-editor",m==="edit"),u&&(u.textContent=m==="edit"?"Front Desk editor":M()),r&&r.setAttribute("aria-label",m==="edit"?"Front Desk editor":"Your live booking address"),j&&(j.textContent=m==="edit"?"Back to your booking page":"See how to edit your booking page"),Q&&(Q.textContent=m==="edit"?"↩":"→"),h&&h.setAttribute("aria-label",m==="edit"?"Back to your direct booking page":"See how you edit this booking page"),I&&(I.hidden=!1),$(e,!0);const x=e.querySelector(".mvr-live-stage > iframe");if(x)if(x.title=m==="edit"?`${f()} Front Desk editor`:`${f()} booking-page preview`,m==="edit")x.src=ge();else{const C=new URL(B());if(e.dataset.editorSaved==="1"){C.searchParams.set("previewRefresh",String(Date.now()));const X=e.dataset.editorPreviewTarget==="checkout";C.searchParams.set("previewHighlight",X?"checkout-policy":e.dataset.editorHighlight||"header"),X?C.searchParams.set("previewCheckout","1"):e.dataset.editorHighlightRoom&&C.searchParams.set("previewHighlightRoom",e.dataset.editorHighlightRoom),delete e.dataset.editorSaved,delete e.dataset.editorHighlight,delete e.dataset.editorHighlightRoom,delete e.dataset.editorPreviewTarget}x.src=C.toString()}l("JourneyBookingPreviewModeChanged",{action:i,mode:m},{durationMs:Date.now()-a}),m==="edit"&&p("BookingEngineEditPreviewViewed")}function G(e){P();const t=o,a=Math.max(0,Math.min(3,e)),i=Date.now();D&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-D}),o=a,D=i,fe(),p(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][o]),l("JourneyRevealStageViewed",{resumed:V,bookingPageReady:o===0?!!s.ready:void 0}),V=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Ee(){D&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:Y?Date.now()-Y:null},{durationMs:Date.now()-D}),S&&(window.clearTimeout(S),S=0),O("reveal-finished",!0),n=null,P(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",re),d.settingsTourActive=!1;try{localStorage.removeItem(L),localStorage.removeItem(H),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}he(),ie(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function He(e){if(d.hotelSubscribed){Ee();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",p("ActivationCtaClicked");try{await window.goLive({billingInterval:b})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=b==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function P(){R&&(window.clearTimeout(R),R=0),A?.disconnect(),A=null}function U(e){g=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",g);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=g?"Saved ✓":"Add",a.disabled=g);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=g?"Saved to their Home Screen":"Tap Add to Home Screen")}function K(e,t=!1){P(),v=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",v===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,r)=>{i.setAttribute("aria-hidden",r===v?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const r=Number(i.dataset.mvrAppSlide)===v;i.classList.toggle("is-active",r),i.setAttribute("aria-current",r?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===v}),v===1?U(!0):(U(!1),se()),t&&p(v===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:v===1?"value":"install",manual:!!t}))}function oe(e=!1){g||v!==0||(P(),U(!0),e&&p("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),R=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&K(1,!1)},e?900:1200))}function se(){if(P(),o!==1||v!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{R||(R=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&(g?K(1,!1):oe(!1))},g?900:1300))};"IntersectionObserver"in window?(A=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(A?.disconnect(),A=null,t())},{threshold:[.35]}),A.observe(e)):t()}function Te(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:o+1}),G(o+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:o-1}),G(o-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Pe),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>He(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==b){b=t;try{localStorage.setItem(te,b)}catch{}p(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:b,price:b==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{oe(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==v&&K(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==q&&(q=t,p(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),l("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),y())})}),se()}async function ne(){return E||typeof window.api!="function"||(E=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(k={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},q=t?.data?.noResponseAction==="release"?"release":"confirm",k.rooms.length&&(d.editRooms=k.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),k)).catch(()=>k).finally(()=>{E=null})),E}async function le(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(ae()){s={ready:!!B(),checking:!1,reason:"local",attempts:1,domain:""},B()&&(w=!1),l("JourneyBookingPageStatus",{ready:s.ready,reason:s.reason,attempts:s.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&y();return}s.checking=!0,s.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");s={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:s.attempts,domain:String(e?.domain||"")}}catch{s.checking=!1,s.reason="unreachable"}B()&&(w=!1),l("JourneyBookingPageStatus",{ready:s.ready,reason:s.reason,attempts:s.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&y(),!(s.ready||s.reason==="deployment-disabled")&&s.attempts<10&&document.getElementById("marketelValueReveal")&&(S=window.setTimeout(le,6e3))}}function Fe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(H)||"0",10)}catch{}try{i=localStorage.getItem(L)==="1"}catch{}try{b=localStorage.getItem(te)==="year"?"year":"month"}catch{b="month"}if(o=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),d.hotelSubscribed&&o===3&&(o=0),m="guest",g=!1,v=0,W=!1,w=!1,Y=Date.now(),D=0,V=!Number.isFinite(t)&&i,s={ready:!1,checking:!0,reason:"",attempts:0,domain:""},S&&window.clearTimeout(S),S=0,P(),!d.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(H,String(o))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}d.settingsTourActive=!0,window.addEventListener("message",re),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ie(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),y(),p("ValueRevealStarted",d.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:o,replay:!!d.hotelSubscribed,pendingResume:V}),G(o),ne(),le()}function Me(){try{return localStorage.getItem(L)==="1"}catch{return!1}}function xe(){try{localStorage.removeItem(L),localStorage.removeItem(H)}catch{}}const Ne={clearPendingMarketelValueReveal:xe,hasPendingMarketelValueReveal:Me,showMarketelValueReveal:Fe};function qe(){de(Ne)}export{xe as clearPendingMarketelValueReveal,Ne as default,Me as hasPendingMarketelValueReveal,qe as install,Fe as showMarketelValueReveal};
