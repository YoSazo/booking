import{c as d,e as ce}from"./settings-B4WoF5xs.js";const ue="/frontdesk/assets/assistant-booking-request-C_4ilmju.webp",me="/frontdesk/assets/assistant-text-resolution-D0wrGQzD.webp",C="marketelValueRevealPendingV1",H="marketelValueRevealStepV1",te="marketelBillingIntervalV1";let o=0,u="guest",f=!1,S={rooms:[],rates:null},T=null,s={ready:!1,checking:!0,reason:"",attempts:0,domain:""},$=0,P=0,R=null,c=0,p=0,Y=0,E=0,y="month",n=null,z=!1,k=!1,V=!1,G="confirm";const ve="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",pe="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function ae(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function m(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function X(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function h(){return d.activeHotelName||"Your Property"}function ie(){return S.rooms[0]||d.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function ge(){const e=ie();return e.images?.[0]?.url||e.imageUrl||""}function fe(){const e=Number(S.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),r=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${X(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${X(r)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function B(){if(ae()&&d.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",d.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=s.domain||d.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return d.activeHotelId&&t.searchParams.set("hotelId",d.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function F(){const e=String(s.domain||d.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${h().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function he(){const e=new URL(window.location.href);return e.search="",e.hash="",d.activeHotelId&&e.searchParams.set("hotelId",d.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function q(e=""){const t=d.activeHotelAppIcon||ge(),a=h().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${m(t)}" alt="">`:`<span class="${e}">${m(a)}</span>`}function be(){if(!d.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(H,String(o))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:o,stageName:["booking-page","guest-app","front-desk-assistant","activation"][o]||"unknown",...t},a)}function ye(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function re(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function _(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function x(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function A(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function J(e="",t=!1){const a=n;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;g("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),x(a)}}function Z(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${_(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function we(e){!e||e!==n||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),x(e),A(e.modal,!0),e.timer.hidden=!1,Z(e),e.timerId=window.setInterval(()=>Z(e),500),g("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:F()}))}function ke(e){!e||e!==n||e.hasPrompted||u!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),A(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>we(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",x(e),A(e.modal,!0),g("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),g("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:F()}))}function Se(e){if(!e||e!==n)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,A(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${m(_(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{x(e),M(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{x(e),A(e.modal,!0)}),g("BookingChallengeCheckoutReached",_(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function oe(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(r=>r.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(n?.iframe?.contentWindow!==e.source||u!=="edit")return;e.data?.hotelName&&(d.activeHotelName=String(e.data.hotelName)),n.modal.dataset.editorSaved="1";const r=Array.isArray(e.data?.changedFields)?e.data.changedFields.map(I=>String(I)):[],v=String(e.data?.kind||"booking-page");let b="header";if(v==="header"){const I=new Set(["name","subtitle","address","phone"]);b=r.length===1&&I.has(r[0])?`header-${r[0]}`:"header"}else v.includes("photo")?b="room-photo":v==="room"?b="room":v==="checkout-policy"&&(b="checkout-policy",n.modal.dataset.editorPreviewTarget="checkout");n.modal.dataset.editorHighlight=b,e.data?.roomId?n.modal.dataset.editorHighlightRoom=String(e.data.roomId):delete n.modal.dataset.editorHighlightRoom,l("JourneyBookingPreviewEdited",{kind:v,changedFields:r,highlightTarget:b}),le(),M(n.modal,"guest",n.previewOpenedAt,"saved-and-returned-to-booking-page");return}if(t==="marketel:checkout-reached"){if(n?.iframe?.contentWindow!==e.source||u!=="guest")return;Se(n);return}n?.iframe?.contentWindow===e.source&&(g("GuestAppPreviewRequestedFromBookingEngine"),M(n.modal,"edit",n.previewOpenedAt,"booking-install-explainer-continued"))}}function $e(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Home Screen","Front Desk",d.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===o?"is-active":""} ${a<o?"is-done":""}">
      <span></span><small>${m(t)}</small>
    </div>`).join("")}
  </div>`}function Ae(){return k?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':s.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${s.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:s.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${s.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Ie(){const e=B();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${m(F())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${m(h())} booking-page preview" src="${m(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
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
  </div>`}function Re(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${m(ie().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then see how guests save it to their Home Screen and how you run it from Front Desk.
      </div>
      ${Ae()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Ie()}
    </div>
  </section>`}function ee(e,t){return`<img class="mvr-ios-system-icon" src="${m(e)}" alt="${m(t)}">`}function Pe(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Guests’ Home Screens</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests save <strong>${m(h())}</strong> to their Home Screen from your booking page—no App Store download. Then they can return in one tap and receive notifications you send from Marketel Front Desk.</p>
      <div class="mvr-callout">
        <strong>One Home Screen save. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${f?"is-installed":""} ${c===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${c===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${q()}</div>
                    <div>
                      <strong>Save ${m(h())} to your Home Screen</strong>
                      <span>Return to this booking page in one tap. No App Store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${f?"disabled":""}>${f?"Saved ✓":"Add"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${f?"Saved to their Home Screen":"Tap Add to Home Screen"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${q()}</div>
                      <div class="mvr-dock-icon">${ee(ve,"Phone")}</div>
                      <div class="mvr-dock-icon">${ee(pe,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${c===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${q()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${m(h())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${q()}</span>
                    <strong>${m(h())}</strong>
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
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests save the property to their Home Screen" ${c===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${c===0?"is-active":""}" aria-label="Save to Home Screen" aria-current="${c===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${c===1?"is-active":""}" aria-label="What Home Screen access unlocks" aria-current="${c===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what saving the property unlocks" ${c===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function Ee(){const e=G==="release";return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Front Desk checks in before a room conflict becomes a guest problem.</h1>
      <p>A direct booking triggers an alert. Reply naturally if a walk-in took the room—or handle it with one tap in the app. Marketel updates Availability, releases the $1 hold and tells the guest.</p>
      <div class="mvr-callout">
        <strong>You stay in control—even when you miss the alert.</strong>
        Choose whether silence keeps the sale or protects availability. You can change the rule anytime.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-assistant-proof-head">
        <div>
          <span>Real Marketel workflow</span>
          <strong>Two ways to answer Front Desk</strong>
        </div>
        <div class="mvr-assistant-proof-tabs" role="tablist" aria-label="Front Desk response examples">
          <button type="button" role="tab" data-mvr-assistant-slide="0" aria-selected="${p===0}" class="${p===0?"is-active":""}">By text</button>
          <button type="button" role="tab" data-mvr-assistant-slide="1" aria-selected="${p===1}" class="${p===1?"is-active":""}">In the app</button>
        </div>
      </div>
      <div class="mvr-assistant-proof-viewport">
        <div class="mvr-assistant-proof-track" style="--mvr-assistant-slide:${p}">
          <figure class="mvr-assistant-proof-slide" role="tabpanel" aria-hidden="${p!==0}">
            <img src="${me}" width="780" height="1532" decoding="async" alt="A real text conversation where an owner tells Marketel a walk-in took the room, and Front Desk releases the online request, voids the hold, notifies the guest, and updates availability.">
            <figcaption><strong>Tell it what changed.</strong><span>Front Desk handles the work and confirms exactly what it did.</span></figcaption>
          </figure>
          <figure class="mvr-assistant-proof-slide" role="tabpanel" aria-hidden="${p!==1}">
            <img src="${ue}" width="780" height="1524" decoding="async" alt="A real Marketel Front Desk booking request with a push notification and buttons to keep or release the booking.">
            <figcaption><strong>Or decide inside the app.</strong><span>The same request appears in Bookings with one-tap controls.</span></figcaption>
          </figure>
        </div>
      </div>
      <div class="mvr-assistant-proof-controls" aria-label="Choose a Front Desk example">
        <button type="button" data-mvr-assistant-slide="0" class="${p===0?"is-active":""}" aria-label="Show the text conversation"></button>
        <button type="button" data-mvr-assistant-slide="1" class="${p===1?"is-active":""}" aria-label="Show the in-app booking request"></button>
      </div>
      <div class="mvr-assistant-settings-proof">
        <div class="mvr-fallback-control">
          <strong>If you miss the alert</strong>
          <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
            <button type="button" data-mvr-fallback="confirm" class="${e?"":"is-selected"}"><b>Keep the booking</b><span>Revenue first</span></button>
            <button type="button" data-mvr-fallback="release" class="${e?"is-selected":""}"><b>Release request</b><span>Availability first</span></button>
          </div>
          <small>${e?"Your rule: void the $1 hold and notify the guest if nobody replies.":"Your rule: confirm the booking automatically if nobody replies."}</small>
        </div>
      </div>
    </div>
  </section>`}function Be(){const e=d.hotelSubscribed,t=y==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",r=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",v=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your property on guests’ Home Screens</strong><small>No second App Store app—guests save it from your booking page</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Marketel Front Desk and Assistant</strong><small>Tell it when a walk-in takes a room; it updates remaining availability</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${m(h())} is ready.`:`Marketel is ready for ${m(h())}.`}</h1>
      <p>Guests use your direct booking page and can save your property to their Home Screen. You use Marketel Front Desk to manage bookings and availability.</p>
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
          ${fe()}
          <div class="mvr-included-label">Everything included</div>
          ${v}
        </div>`}
    </div>
  </section>`}function Ce(){return o===0?Re():o===1?Pe():o===2?Ee():Be()}function Le(){if(o===0)return!z&&!k?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">See the Home Screen experience →</button>
    </div>`;if(o===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["","See how Front Desk protects you","Review plans and activation"];return`<div class="mvr-footer">
    ${o>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[o]} →</button>
  </div>`}function w(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${$e()}
    </header>
    <main class="mvr-main">${Ce()}</main>
    ${Le()}
  </div>`,Fe())}function De(){const e=B();if(document.getElementById("mvrLivePreview"))return;if(!e){k=!0,l("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:s.reason||"missing-url"}),w();return}z=!0,u="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${m(F())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${m(h())} live preview" src="${m(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">See the Home Screen experience</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");n={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},n.promptFallbackId=window.setTimeout(()=>{n?.modal!==a||n.status!=="waiting"||A(a,!0)},4e3),i?.addEventListener("load",()=>{const r=n;r?.modal!==a||u!=="guest"||(r.promptDelayId&&window.clearTimeout(r.promptDelayId),r.promptDelayId=window.setTimeout(()=>{r.promptDelayId=0,ke(r)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:u},{durationMs:Date.now()-t}),J("preview-closed",!0),n=null,a.remove(),w()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Te(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(u==="guest"){M(a,"edit",t,"guided-forward");return}M(a,"guest",t,"returned-to-booking-page")}),g("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!s.ready,bookingPageReason:s.reason||""})}function Te(e,t,a){e?.isConnected&&(l("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:u==="edit"},{durationMs:Date.now()-t}),J("continued-to-guest-app",!1),n=null,e.remove(),O(1))}function M(e,t,a,i="mode-selected"){if(!e?.isConnected)return;t==="edit"&&J("edit-mode-selected",!0),u=t==="edit"?"edit":"guest";const r=e.querySelector("#mvrLiveLocation"),v=e.querySelector("[data-live-location-text]"),b=e.querySelector("#mvrLiveForward"),I=e.querySelector("#mvrContinueGuestApp"),K=e.querySelector("[data-live-forward-long]"),j=b?.querySelector("b");r?.classList.toggle("is-editor",u==="edit"),v&&(v.textContent=u==="edit"?"Front Desk editor":F()),r&&r.setAttribute("aria-label",u==="edit"?"Front Desk editor":"Your live booking address"),K&&(K.textContent=u==="edit"?"Back to your booking page":"See how to edit your booking page"),j&&(j.textContent=u==="edit"?"↩":"→"),b&&b.setAttribute("aria-label",u==="edit"?"Back to your direct booking page":"See how you edit this booking page"),I&&(I.hidden=!1),A(e,!0);const N=e.querySelector(".mvr-live-stage > iframe");if(N)if(N.title=u==="edit"?`${h()} Front Desk editor`:`${h()} booking-page preview`,u==="edit")N.src=he();else{const D=new URL(B());if(e.dataset.editorSaved==="1"){D.searchParams.set("previewRefresh",String(Date.now()));const Q=e.dataset.editorPreviewTarget==="checkout";D.searchParams.set("previewHighlight",Q?"checkout-policy":e.dataset.editorHighlight||"header"),Q?D.searchParams.set("previewCheckout","1"):e.dataset.editorHighlightRoom&&D.searchParams.set("previewHighlightRoom",e.dataset.editorHighlightRoom),delete e.dataset.editorSaved,delete e.dataset.editorHighlight,delete e.dataset.editorHighlightRoom,delete e.dataset.editorPreviewTarget}N.src=D.toString()}l("JourneyBookingPreviewModeChanged",{action:i,mode:u},{durationMs:Date.now()-a}),u==="edit"&&g("BookingEngineEditPreviewViewed")}function O(e){L();const t=o,a=Math.max(0,Math.min(3,e)),i=Date.now();E&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-E}),o=a,E=i,be(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][o]),l("JourneyRevealStageViewed",{resumed:V,bookingPageReady:o===0?!!s.ready:void 0}),V=!1,w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function He(){E&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:Y?Date.now()-Y:null},{durationMs:Date.now()-E}),$&&(window.clearTimeout($),$=0),J("reveal-finished",!0),n=null,L(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",oe),d.settingsTourActive=!1;try{localStorage.removeItem(C),localStorage.removeItem(H),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}ye(),re(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function xe(e){if(d.hotelSubscribed){He();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked");try{await window.goLive({billingInterval:y})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=y==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function L(){P&&(window.clearTimeout(P),P=0),R?.disconnect(),R=null}function U(e){f=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",f);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=f?"Saved ✓":"Add",a.disabled=f);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=f?"Saved to their Home Screen":"Tap Add to Home Screen")}function W(e,t=!1){L(),c=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",c===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,r)=>{i.setAttribute("aria-hidden",r===c?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const r=Number(i.dataset.mvrAppSlide)===c;i.classList.toggle("is-active",r),i.setAttribute("aria-current",r?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===c}),c===1?U(!0):(U(!1),ne()),t&&g(c===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:c===1?"value":"install",manual:!!t}))}function se(e=!1){f||c!==0||(L(),U(!0),e&&g("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),P=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&W(1,!1)},e?900:1200))}function Me(e,t=!1){p=Number(e)===1?1:0;const a=document.querySelector(".mvr-assistant-visual");a&&(a.querySelector(".mvr-assistant-proof-track")?.style.setProperty("--mvr-assistant-slide",String(p)),a.querySelectorAll(".mvr-assistant-proof-slide").forEach((i,r)=>{i.setAttribute("aria-hidden",r===p?"false":"true")}),a.querySelectorAll("[data-mvr-assistant-slide]").forEach(i=>{const r=Number(i.dataset.mvrAssistantSlide)===p;i.classList.toggle("is-active",r),i.getAttribute("role")==="tab"&&i.setAttribute("aria-selected",String(r))}),t&&(g(p===1?"AssistantAppProofViewed":"AssistantTextProofViewed"),l("JourneyAssistantProofViewed",{proof:p===1?"app":"text"})))}function ne(){if(L(),o!==1||c!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{P||(P=window.setTimeout(()=>{o===1&&document.getElementById("marketelValueReveal")&&(f?W(1,!1):se(!1))},f?900:1300))};"IntersectionObserver"in window?(R=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(R?.disconnect(),R=null,t())},{threshold:[.35]}),R.observe(e)):t()}function Fe(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:o+1}),O(o+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:o-1}),O(o-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",De),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>xe(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==y){y=t;try{localStorage.setItem(te,y)}catch{}g(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:y,price:y==="year"?1990:199,currency:"USD"}),w()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{se(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==c&&W(t,!0)})}),document.querySelectorAll("[data-mvr-assistant-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAssistantSlide)===1?1:0;t!==p&&Me(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==G&&(G=t,g(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),l("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),w())})}),ne()}async function le(){return T||typeof window.api!="function"||(T=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(S={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},G=t?.data?.noResponseAction==="release"?"release":"confirm",S.rooms.length&&(d.editRooms=S.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&w(),S)).catch(()=>S).finally(()=>{T=null})),T}async function de(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(ae()){s={ready:!!B(),checking:!1,reason:"local",attempts:1,domain:""},B()&&(k=!1),l("JourneyBookingPageStatus",{ready:s.ready,reason:s.reason,attempts:s.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&w();return}s.checking=!0,s.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");s={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:s.attempts,domain:String(e?.domain||"")}}catch{s.checking=!1,s.reason="unreachable"}B()&&(k=!1),l("JourneyBookingPageStatus",{ready:s.ready,reason:s.reason,attempts:s.attempts}),o===0&&!document.getElementById("mvrLivePreview")&&w(),!(s.ready||s.reason==="deployment-disabled")&&s.attempts<10&&document.getElementById("marketelValueReveal")&&($=window.setTimeout(de,6e3))}}function Ne(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(H)||"0",10)}catch{}try{i=localStorage.getItem(C)==="1"}catch{}try{y=localStorage.getItem(te)==="year"?"year":"month"}catch{y="month"}if(o=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),d.hotelSubscribed&&o===3&&(o=0),u="guest",f=!1,c=0,z=!1,k=!1,Y=Date.now(),E=0,V=!Number.isFinite(t)&&i,s={ready:!1,checking:!0,reason:"",attempts:0,domain:""},$&&window.clearTimeout($),$=0,L(),!d.hotelSubscribed)try{localStorage.setItem(C,"1"),localStorage.setItem(H,String(o))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}d.settingsTourActive=!0,window.addEventListener("message",oe),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",re(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),w(),g("ValueRevealStarted",d.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:o,replay:!!d.hotelSubscribed,pendingResume:V}),O(o),le(),de()}function qe(){try{return localStorage.getItem(C)==="1"}catch{return!1}}function Ve(){try{localStorage.removeItem(C),localStorage.removeItem(H)}catch{}}const Ge={clearPendingMarketelValueReveal:Ve,hasPendingMarketelValueReveal:qe,showMarketelValueReveal:Ne};function Je(){ce(Ge)}export{Ve as clearPendingMarketelValueReveal,Ge as default,qe as hasPendingMarketelValueReveal,Je as install,Ne as showMarketelValueReveal};
