import{c as d,e as me}from"./settings-B4WoF5xs.js";const ve="/frontdesk/assets/assistant-booking-request-C_4ilmju.webp",pe="/frontdesk/assets/assistant-text-resolution-D0wrGQzD.webp",L="marketelValueRevealPendingV1",x="marketelValueRevealStepV1",ie="marketelBillingIntervalV1";let r=0,u="guest",g=!1,S={rooms:[],rates:null},H=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},$=0,P=0,B=null,c=0,y=0,_=0,E=0,b="month",s=null,W=!1,k=!1,G=!1,O="confirm";const ge="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",fe="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function re(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function m(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Z(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function f(){return d.activeHotelName||"Your Property"}function oe(){return S.rooms[0]||d.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function he(){const e=oe();return e.images?.[0]?.url||e.imageUrl||""}function be(){const e=Number(S.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,i=Math.max(1,Math.ceil(199/a)),o=a*i;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${i} direct room-night${i===1?"":"s"} could cover a month.</strong>
    <p>At ${Z(e)} per night, shifting ${i} room-night${i===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${Z(o)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function C(){if(re()&&d.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",d.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=n.domain||d.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return d.activeHotelId&&t.searchParams.set("hotelId",d.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function N(){const e=String(n.domain||d.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${f().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ye(){const e=new URL(window.location.href);return e.search="",e.hash="",d.activeHotelId&&e.searchParams.set("hotelId",d.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function q(e=""){const t=d.activeHotelAppIcon||he(),a=f().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${m(t)}" alt="">`:`<span class="${e}">${m(a)}</span>`}function we(){if(!d.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(x,String(r))}catch{}}function p(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:r,stageName:["booking-page","guest-app","front-desk-assistant","activation"][r]||"unknown",...t},a)}function ke(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ne(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function U(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),i=String(t%60).padStart(2,"0");return`${a}:${i}`}function M(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function I(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function Y(e="",t=!1){const a=s;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const i=Date.now()-a.startedAt;p("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:i},{durationMs:i})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),M(a)}}function ee(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${U(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function Se(e){!e||e!==s||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),M(e),I(e.modal,!0),e.timer.hidden=!1,ee(e),e.timerId=window.setInterval(()=>ee(e),500),p("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:N()}))}function $e(e){!e||e!==s||e.hasPrompted||u!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),I(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>Se(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",M(e),I(e.modal,!0),p("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),p("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:N()}))}function Ie(e){if(!e||e!==s)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,I(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${m(U(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{M(e),F(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{M(e),I(e.modal,!0)}),p("BookingChallengeCheckoutReached",U(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function se(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(o=>o.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(s?.iframe?.contentWindow!==e.source||u!=="edit")return;e.data?.hotelName&&(d.activeHotelName=String(e.data.hotelName)),s.modal.dataset.editorSaved="1";const o=Array.isArray(e.data?.changedFields)?e.data.changedFields.map(R=>String(R)):[],v=String(e.data?.kind||"booking-page");let h="header";if(v==="header"){const R=new Set(["name","subtitle","address","phone"]);h=o.length===1&&R.has(o[0])?`header-${o[0]}`:"header"}else v.includes("photo")?h="room-photo":v==="room"?h="room":v==="checkout-policy"&&(h="checkout-policy",s.modal.dataset.editorPreviewTarget="checkout");s.modal.dataset.editorHighlight=h,e.data?.roomId?s.modal.dataset.editorHighlightRoom=String(e.data.roomId):delete s.modal.dataset.editorHighlightRoom,l("JourneyBookingPreviewEdited",{kind:v,changedFields:o,highlightTarget:h}),ce(),F(s.modal,"guest",s.previewOpenedAt,"saved-and-returned-to-booking-page");return}if(t==="marketel:checkout-reached"){if(s?.iframe?.contentWindow!==e.source||u!=="guest")return;Ie(s);return}s?.iframe?.contentWindow===e.source&&(p("GuestAppPreviewRequestedFromBookingEngine"),F(s.modal,"edit",s.previewOpenedAt,"booking-install-explainer-continued"))}}function Ae(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Home Screen","Front Desk",d.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${m(t)}</small>
    </div>`).join("")}
  </div>`}function Re(){return k?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':n.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Be(){const e=C();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${m(N())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${m(f())} booking-page preview" src="${m(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
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
  </div>`}function Pe(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${m(oe().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then see how guests save it to their Home Screen and how you run it from Front Desk.
      </div>
      ${Re()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Be()}
    </div>
  </section>`}function te(e,t){return`<img class="mvr-ios-system-icon" src="${m(e)}" alt="${m(t)}">`}function Ee(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Guests’ Home Screens</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests save <strong>${m(f())}</strong> to their Home Screen from your booking page—no App Store download. Then they can return in one tap and receive notifications you send from Marketel Front Desk.</p>
      <div class="mvr-callout">
        <strong>One Home Screen save. Two lasting advantages.</strong>
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
                    <div class="mvr-install-property-icon">${q()}</div>
                    <div>
                      <strong>Save ${m(f())} to your Home Screen</strong>
                      <span>Return to this booking page in one tap. No App Store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${g?"disabled":""}>${g?"Saved ✓":"Add"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${g?"Saved to their Home Screen":"Tap Add to Home Screen"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${q()}</div>
                      <div class="mvr-dock-icon">${te(ge,"Phone")}</div>
                      <div class="mvr-dock-icon">${te(fe,"Safari")}</div>
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
                    <span>${m(f())} stays one tap away.</span>
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
                    <strong>${m(f())}</strong>
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
  </section>`}const A=[{title:"It texts you the moment a request lands.",body:"Reply naturally — a walk-in took it, you’re full, whatever changed.",next:"See how you answer",event:"AssistantTextProofViewed",proof:{url:pe,alt:"A real text conversation where an owner tells Marketel a walk-in took the room, and Front Desk releases the online request, voids the hold, notifies the guest, and updates availability."}},{title:"Or answer with one tap.",body:"The same request is already waiting in Bookings. Either way works.",next:"Set your rule",event:"AssistantAppProofViewed",proof:{url:ve,alt:"A real Marketel Front Desk booking request with a push notification and buttons to keep or release the booking."}},{title:"And if you miss it, your rule decides.",body:"That’s how a room conflict never becomes a guest problem.",next:"Review plans and activation",event:"AssistantFallbackViewed",proof:null}];function Ce(){const e=O==="release";return`<div class="mvr-fallback-control">
    <strong>If you miss the alert</strong>
    <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
      <button type="button" data-mvr-fallback="confirm" class="${e?"":"is-selected"}"><b>Keep the booking</b><span>Revenue first</span></button>
      <button type="button" data-mvr-fallback="release" class="${e?"is-selected":""}"><b>Release request</b><span>Availability first</span></button>
    </div>
    <small>${e?"Your rule: void the $1 hold and notify the guest if nobody replies.":"Your rule: confirm the booking automatically if nobody replies."}</small>
  </div>`}function Le(){const e=A[y]||A[0];return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-beat-band">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1 class="mvr-beat-title">${e.title}</h1>
      <p class="mvr-beat-body">${e.body}</p>
      ${e.proof?'<span class="mvr-proof-badge">Real Marketel workflow</span>':""}
    </div>
    <div class="mvr-beat-stage">
      ${e.proof?`<figure class="mvr-beat-proof">
        <img src="${e.proof.url}" width="780" height="1532" decoding="async" alt="${m(e.proof.alt)}">
      </figure>`:`<div class="mvr-beat-settings">${Ce()}</div>`}
    </div>
  </section>`}function De(){const e=d.hotelSubscribed,t=b==="year",a=t?"$1,990":"$199",i=t?"/year":"/month",o=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",v=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your property on guests’ Home Screens</strong><small>No second App Store app—guests save it from your booking page</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Marketel Front Desk and Assistant</strong><small>Tell it when a walk-in takes a room; it updates remaining availability</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${m(f())} is ready.`:`Marketel is ready for ${m(f())}.`}</h1>
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
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${o}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
        </div>
        <div class="mvr-activation-proof">
          ${be()}
          <div class="mvr-included-label">Everything included</div>
          ${v}
        </div>`}
    </div>
  </section>`}function Te(){return r===0?Pe():r===1?Ee():r===2?Le():De()}function He(){if(r===0)return!W&&!k?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">See the Home Screen experience →</button>
    </div>`;if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=r===2?(A[y]||A[0]).next:"See how Front Desk protects you";return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e} →</button>
  </div>`}function w(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${Ae()}
    </header>
    <main class="mvr-main">${Te()}</main>
    ${He()}
  </div>`,Ve())}function xe(){const e=C();if(document.getElementById("mvrLivePreview"))return;if(!e){k=!0,l("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:n.reason||"missing-url"}),w();return}W=!0,u="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${m(N())}</strong>
      </div>
      <span class="mvr-live-balance" aria-hidden="true"></span>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${m(f())} live preview" src="${m(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp">See the Home Screen experience</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const i=a.querySelector(".mvr-live-stage > iframe");s={modal:a,iframe:i,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},s.promptFallbackId=window.setTimeout(()=>{s?.modal!==a||s.status!=="waiting"||I(a,!0)},4e3),i?.addEventListener("load",()=>{const o=s;o?.modal!==a||u!=="guest"||(o.promptDelayId&&window.clearTimeout(o.promptDelayId),o.promptDelayId=window.setTimeout(()=>{o.promptDelayId=0,$e(o)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:u},{durationMs:Date.now()-t}),Y("preview-closed",!0),s=null,a.remove(),w()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Me(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(u==="guest"){F(a,"edit",t,"guided-forward");return}F(a,"guest",t,"returned-to-booking-page")}),p("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!n.ready,bookingPageReason:n.reason||""})}function Me(e,t,a){e?.isConnected&&(l("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:u==="edit"},{durationMs:Date.now()-t}),Y("continued-to-guest-app",!1),s=null,e.remove(),J(1))}function F(e,t,a,i="mode-selected"){if(!e?.isConnected)return;t==="edit"&&Y("edit-mode-selected",!0),u=t==="edit"?"edit":"guest";const o=e.querySelector("#mvrLiveLocation"),v=e.querySelector("[data-live-location-text]"),h=e.querySelector("#mvrLiveForward"),R=e.querySelector("#mvrContinueGuestApp"),j=e.querySelector("[data-live-forward-long]"),Q=h?.querySelector("b");o?.classList.toggle("is-editor",u==="edit"),v&&(v.textContent=u==="edit"?"Front Desk editor":N()),o&&o.setAttribute("aria-label",u==="edit"?"Front Desk editor":"Your live booking address"),j&&(j.textContent=u==="edit"?"Back to your booking page":"See how to edit your booking page"),Q&&(Q.textContent=u==="edit"?"↩":"→"),h&&h.setAttribute("aria-label",u==="edit"?"Back to your direct booking page":"See how you edit this booking page"),R&&(R.hidden=!1),I(e,!0);const V=e.querySelector(".mvr-live-stage > iframe");if(V)if(V.title=u==="edit"?`${f()} Front Desk editor`:`${f()} booking-page preview`,u==="edit")V.src=ye();else{const T=new URL(C());if(e.dataset.editorSaved==="1"){T.searchParams.set("previewRefresh",String(Date.now()));const X=e.dataset.editorPreviewTarget==="checkout";T.searchParams.set("previewHighlight",X?"checkout-policy":e.dataset.editorHighlight||"header"),X?T.searchParams.set("previewCheckout","1"):e.dataset.editorHighlightRoom&&T.searchParams.set("previewHighlightRoom",e.dataset.editorHighlightRoom),delete e.dataset.editorSaved,delete e.dataset.editorHighlight,delete e.dataset.editorHighlightRoom,delete e.dataset.editorPreviewTarget}V.src=T.toString()}l("JourneyBookingPreviewModeChanged",{action:i,mode:u},{durationMs:Date.now()-a}),u==="edit"&&p("BookingEngineEditPreviewViewed")}function J(e){D();const t=r,a=Math.max(0,Math.min(3,e)),i=Date.now();E&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:i-E}),r=a,E=i,we(),p(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),l("JourneyRevealStageViewed",{resumed:G,bookingPageReady:r===0?!!n.ready:void 0}),G=!1,w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Fe(){E&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:_?Date.now()-_:null},{durationMs:Date.now()-E}),$&&(window.clearTimeout($),$=0),Y("reveal-finished",!0),s=null,D(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",se),d.settingsTourActive=!1;try{localStorage.removeItem(L),localStorage.removeItem(x),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}ke(),ne(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Ne(e){if(d.hotelSubscribed){Fe();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",p("ActivationCtaClicked");try{await window.goLive({billingInterval:b})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=b==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function D(){P&&(window.clearTimeout(P),P=0),B?.disconnect(),B=null}function z(e){g=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",g);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=g?"Saved ✓":"Add",a.disabled=g);const i=t?.querySelector(".mvr-install-arrow span");i&&(i.textContent=g?"Saved to their Home Screen":"Tap Add to Home Screen")}function K(e,t=!1){D(),c=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",c===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((i,o)=>{i.setAttribute("aria-hidden",o===c?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(i=>{const o=Number(i.dataset.mvrAppSlide)===c;i.classList.toggle("is-active",o),i.setAttribute("aria-current",o?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(i=>{i.disabled=Number(i.dataset.mvrAppSlide)===c}),c===1?z(!0):(z(!1),de()),t&&p(c===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:c===1?"value":"install",manual:!!t}))}function le(e=!1){g||c!==0||(D(),z(!0),e&&p("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),P=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&K(1,!1)},e?900:1200))}function ae(e,t=!1){const a=Math.max(0,Math.min(A.length-1,Number(e)||0));a!==y&&(y=a,w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"}),t&&(p(A[y].event),l("JourneyAssistantBeatViewed",{beat:y})))}function de(){if(D(),r!==1||c!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{P||(P=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&(g?K(1,!1):le(!1))},g?900:1300))};"IntersectionObserver"in window?(B=new IntersectionObserver(a=>{a.some(i=>i.isIntersecting&&i.intersectionRatio>=.35)&&(B?.disconnect(),B=null,t())},{threshold:[.35]}),B.observe(e)):t()}function Ve(){document.getElementById("mvrNext")?.addEventListener("click",()=>{if(r===2&&y<A.length-1){ae(y+1,!0);return}l("JourneyRevealNavigation",{action:"next",toStep:r+1}),J(r+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{if(r===2&&y>0){ae(y-1,!0);return}l("JourneyRevealNavigation",{action:"back",toStep:r-1}),J(r-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",xe),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Ne(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==b){b=t;try{localStorage.setItem(ie,b)}catch{}p(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:b,price:b==="year"?1990:199,currency:"USD"}),w()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{le(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==c&&K(t,!0)})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==O&&(O=t,p(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),l("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),w())})}),de()}async function ce(){return H||typeof window.api!="function"||(H=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(S={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},O=t?.data?.noResponseAction==="release"?"release":"confirm",S.rooms.length&&(d.editRooms=S.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&w(),S)).catch(()=>S).finally(()=>{H=null})),H}async function ue(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(re()){n={ready:!!C(),checking:!1,reason:"local",attempts:1,domain:""},C()&&(k=!1),l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&w();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")}}catch{n.checking=!1,n.reason="unreachable"}C()&&(k=!1),l("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),r===0&&!document.getElementById("mvrLivePreview")&&w(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&($=window.setTimeout(ue,6e3))}}function qe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,i=!1;try{a=Number.parseInt(localStorage.getItem(x)||"0",10)}catch{}try{i=localStorage.getItem(L)==="1"}catch{}try{b=localStorage.getItem(ie)==="year"?"year":"month"}catch{b="month"}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),d.hotelSubscribed&&r===3&&(r=0),u="guest",g=!1,c=0,W=!1,k=!1,_=Date.now(),E=0,G=!Number.isFinite(t)&&i,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},$&&window.clearTimeout($),$=0,D(),!d.hotelSubscribed)try{localStorage.setItem(L,"1"),localStorage.setItem(x,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}d.settingsTourActive=!0,window.addEventListener("message",se),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ne(!1);const o=document.createElement("div");o.id="marketelValueReveal",o.className="mvr-root",document.body.appendChild(o),w(),p("ValueRevealStarted",d.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:r,replay:!!d.hotelSubscribed,pendingResume:G}),J(r),ce(),ue()}function Ge(){try{return localStorage.getItem(L)==="1"}catch{return!1}}function Oe(){try{localStorage.removeItem(L),localStorage.removeItem(x)}catch{}}const Je={clearPendingMarketelValueReveal:Oe,hasPendingMarketelValueReveal:Ge,showMarketelValueReveal:qe};function _e(){me(Je)}export{Oe as clearPendingMarketelValueReveal,Je as default,Ge as hasPendingMarketelValueReveal,_e as install,qe as showMarketelValueReveal};
