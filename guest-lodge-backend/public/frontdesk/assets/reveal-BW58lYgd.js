import{c as n,e as oe}from"./settings-CBZ0R7Zu.js";const R="marketelValueRevealPendingV1",E="marketelValueRevealStepV1",X="marketelBillingIntervalV1";let i=0,c="guest",p=!1,b={rooms:[],rates:null},B=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k=0,$=0,S=null,l=0,F=0,I=0,f="month",v=null,G=!1,h=!1,M=!1;const ne="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",se="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function Z(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function d(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function H(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function g(){return n.activeHotelName||"Your Property"}function Y(){return b.rooms[0]||n.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function le(){const e=Y();return e.images?.[0]?.url||e.imageUrl||""}function de(){return b.rates?.nightly||99}function ce(){const e=Number(b.rates?.nightly);if(!Number.isFinite(e)||e<=0)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const a=e*.15,r=Math.max(1,Math.ceil(199/a)),u=a*r;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${r} direct room-night${r===1?"":"s"} could cover a month.</strong>
    <p>At ${H(e)} per night, shifting ${r} room-night${r===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${H(u)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function C(){if(Z()&&n.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",n.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||n.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return n.activeHotelId&&t.searchParams.set("hotelId",n.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function P(){const e=String(o.domain||n.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ue(){const e=new URL(window.location.href);return e.search="",e.hash="",n.activeHotelId&&e.searchParams.set("hotelId",n.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function D(e=""){const t=n.activeHotelAppIcon||le(),a=g().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${d(t)}" alt="">`:`<span class="${e}">${d(a)}</span>`}function ve(){if(!n.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(E,String(i))}catch{}}function m(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function s(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:i,stageName:["booking-page","guest-app","front-desk-assistant","activation"][i]||"unknown",...t},a)}function me(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function ee(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function V(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),r=String(t%60).padStart(2,"0");return`${a}:${r}`}function L(e){e?.layer&&(e.layer.classList.remove("is-visible"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function T(e="",t=!1){const a=v;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),t&&a.status==="running"){const r=Date.now()-a.startedAt;m("BookingChallengeAbandoned",e),s("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:r},{durationMs:r})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),L(a)}}function K(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${V(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function pe(e){!e||e!==v||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),L(e),e.timer.hidden=!1,K(e),e.timerId=window.setInterval(()=>K(e),500),m("BookingChallengeStarted"),s("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:P()}))}function ge(e){!e||e!==v||e.hasPrompted||c!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.layer.innerHTML=`<section class="mvr-challenge-card" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Try it like a guest</span>
    <h2 id="mvrChallengeTitle">Can you reach checkout in under 60 seconds?</h2>
    <p>Choose a room and dates, then continue to checkout. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start 60-second challenge</button>
      <button type="button" class="mvr-challenge-skip">Explore normally</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>pe(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",L(e),m("BookingChallengeDismissed"),s("JourneyBookingChallengeDismissed")}),m("BookingChallengeShown"),s("JourneyBookingChallengeShown",{bookingDomain:P()}))}function fe(e){if(!e||e!==v)return;if(e.status!=="running"){s("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${d(V(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{L(e),J(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{L(e)}),m("BookingChallengeCheckoutReached",V(t)),s("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function te(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(u=>u.contentWindow===e.source))){if(t==="marketel:checkout-reached"){if(v?.iframe?.contentWindow!==e.source||c!=="guest")return;fe(v);return}v?.iframe?.contentWindow===e.source&&(m("GuestAppPreviewRequestedFromBookingEngine"),J(v.modal,"edit",v.previewOpenedAt,"booking-install-explainer-continued"))}}function he(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",n.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===i?"is-active":""} ${a<i?"is-done":""}">
      <span></span><small>${d(t)}</small>
    </div>`).join("")}
  </div>`}function be(){return h?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function ye(){const e=C();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${d(P())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${d(g())} booking-page preview" src="${d(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${e?"Expand booking page preview":"Check booking page preview"}" ${h?"disabled":""}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>
          </svg>
          <strong>${h?"Still publishing":"Expand"}</strong>
        </span>
      </button>
    </div>
  </div>`}function we(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${d(Y().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>Try it yourself.</span>
        Reach payment as a guest, then see exactly where you control the page in Front Desk.
      </div>
      ${be()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${ye()}
    </div>
  </section>`}function j(e,t){return`<img class="mvr-ios-system-icon" src="${d(e)}" alt="${d(t)}">`}function ke(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${d(g())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${p?"is-installed":""} ${l===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${l===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${D()}</div>
                    <div>
                      <strong>Get the ${d(g())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${p?"disabled":""}>${p?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${p?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${D()}</div>
                      <div class="mvr-dock-icon">${j(ne,"Phone")}</div>
                      <div class="mvr-dock-icon">${j(se,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${l===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${D()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${d(g())} stays one tap away.</span>
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
                    <span class="mvr-app-push-icon">${D()}</span>
                    <strong>${d(g())}</strong>
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
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${l===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${l===0?"is-active":""}" aria-label="Installation" aria-current="${l===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${l===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${l===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${l===1?"disabled":""}>›</button>
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
        <div><span>Front Desk</span><strong>New ${d(e)} booking</strong><small>Tomorrow · ${H(de())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${d(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function $e(){const e=n.hotelSubscribed,t=f==="year",a=t?"$1,990":"$199",r=t?"/year":"/month",u=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month";return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${d(g())} is ready.`:`Marketel is ready for ${d(g())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`${ce()}
        <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!t}" class="${t?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${t}" class="${t?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
        </div>
        <div class="mvr-price"><strong>${a}</strong><span>${r}</span></div>
        <div class="mvr-price-detail${t?" is-visible":""}">Two months free · $398 saved</div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":u}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function Ie(){return i===0?we():i===1?ke():i===2?Se():$e()}function Ce(){if(i===0)return!G&&!h?"":`<div class="mvr-footer mvr-footer-booking">
      <span>${h?"Your setup is safe while publishing finishes.":"You’ve seen the guest experience. Explore more or keep going."}</span>
      <button type="button" class="mvr-primary" id="mvrNext">Continue to Guest App →</button>
    </div>`;if(i===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["","See how Front Desk protects you","Review plans and activation"];return`<div class="mvr-footer">
    ${i>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[i]} →</button>
  </div>`}function y(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${he()}
    </header>
    <main class="mvr-main">${Ie()}</main>
    ${Ce()}
  </div>`,Ee())}function Re(){const e=C();if(document.getElementById("mvrLivePreview"))return;if(!e){h=!0,s("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:o.reason||"missing-url"}),y();return}G=!0,c="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${d(P())}</strong>
      </div>
      <div class="mvr-live-actions">
        <button type="button" class="mvr-live-continue" id="mvrContinueTour">Continue tour</button>
        <button type="button" class="mvr-live-forward" id="mvrLiveForward">
          <span class="mvr-live-forward-long" data-live-forward-long>See how you edit this</span>
          <span class="mvr-live-forward-short" data-live-forward-short>How to edit</span>
          <b aria-hidden="true">→</b>
        </button>
      </div>
    </div>
    <div class="mvr-challenge-timer" hidden aria-live="polite">
      <span></span>
      <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${d(g())} live preview" src="${d(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const r=a.querySelector(".mvr-live-stage > iframe");v={modal:a,iframe:r,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0},r?.addEventListener("load",()=>{v?.modal!==a||c!=="guest"||window.setTimeout(()=>ge(v),250)}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{s("JourneyBookingPreviewModeChanged",{action:"closed",mode:c},{durationMs:Date.now()-t}),T("preview-closed",!0),v=null,a.remove(),y()}),a.querySelector("#mvrContinueTour")?.addEventListener("click",()=>{Q(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(c==="guest"){J(a,"edit",t,"guided-forward");return}Q(a,t,"continued-from-editor-preview")}),m("BookingEngineFullPreviewOpened"),s("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function Q(e,t,a){e?.isConnected&&(s("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:c==="edit"},{durationMs:Date.now()-t}),T("continued-to-guest-app",!1),v=null,e.remove(),x(1))}function J(e,t,a,r="mode-selected"){if(!e?.isConnected)return;T("edit-mode-selected",!0),c="edit";const u=e.querySelector("#mvrLiveLocation"),w=e.querySelector("[data-live-location-text]"),_=e.querySelector("#mvrLiveForward"),U=e.querySelector("#mvrContinueTour"),W=e.querySelector("[data-live-forward-long]"),z=e.querySelector("[data-live-forward-short]");u?.classList.toggle("is-editor",c==="edit"),w&&(w.textContent=c==="edit"?"Front Desk editor":P()),u&&u.setAttribute("aria-label",c==="edit"?"Front Desk editor":"Your live booking address"),W&&(W.textContent=c==="edit"?"Continue to Guest App":"See how you edit this"),z&&(z.textContent=c==="edit"?"Continue":"How to edit"),_&&_.setAttribute("aria-label",c==="edit"?"Continue to the Guest App":"See how you edit this booking page"),U&&(U.hidden=c==="edit");const N=e.querySelector(".mvr-live-stage > iframe");N&&(N.title=c==="edit"?`${g()} Front Desk editor`:`${g()} booking-page preview`,N.src=c==="edit"?ue():C()),s("JourneyBookingPreviewModeChanged",{action:r,mode:c},{durationMs:Date.now()-a}),c==="edit"&&m("BookingEngineEditPreviewViewed")}function x(e){A();const t=i,a=Math.max(0,Math.min(3,e)),r=Date.now();I&&a!==t&&s("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:r-I}),i=a,I=r,ve(),m(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][i]),s("JourneyRevealStageViewed",{resumed:M,bookingPageReady:i===0?!!o.ready:void 0}),M=!1,y(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function Ae(){I&&s("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:F?Date.now()-F:null},{durationMs:Date.now()-I}),k&&(window.clearTimeout(k),k=0),T("reveal-finished",!0),v=null,A(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",te),n.settingsTourActive=!1;try{localStorage.removeItem(R),localStorage.removeItem(E),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}me(),ee(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Be(e){if(n.hotelSubscribed){Ae();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",m("ActivationCtaClicked");try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function A(){$&&(window.clearTimeout($),$=0),S?.disconnect(),S=null}function q(e){p=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",p);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=p?"Installed ✓":"Install",a.disabled=p);const r=t?.querySelector(".mvr-install-arrow span");r&&(r.textContent=p?"Now on their Home Screen":"Tap Install")}function O(e,t=!1){A(),l=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",l===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((r,u)=>{r.setAttribute("aria-hidden",u===l?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(r=>{const u=Number(r.dataset.mvrAppSlide)===l;r.classList.toggle("is-active",u),r.setAttribute("aria-current",u?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(r=>{r.disabled=Number(r.dataset.mvrAppSlide)===l}),l===1?q(!0):(q(!1),re()),t&&m(l===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),s("JourneyGuestAppDemo",{action:"slide-viewed",slide:l===1?"value":"install",manual:!!t}))}function ae(e=!1){p||l!==0||(A(),q(!0),e&&m("GuestAppInstallDemoClicked"),s("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),$=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&O(1,!1)},e?900:1200))}function re(){if(A(),i!==1||l!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{$||($=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&(p?O(1,!1):ae(!1))},p?900:1300))};"IntersectionObserver"in window?(S=new IntersectionObserver(a=>{a.some(r=>r.isIntersecting&&r.intersectionRatio>=.35)&&(S?.disconnect(),S=null,t())},{threshold:[.35]}),S.observe(e)):t()}function Ee(){document.getElementById("mvrNext")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"next",toStep:i+1}),x(i+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{s("JourneyRevealNavigation",{action:"back",toStep:i-1}),x(i-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",Re),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Be(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==f){f=t;try{localStorage.setItem(X,f)}catch{}m(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),s("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),y()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{ae(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==l&&O(t,!0)})}),re()}async function Le(){return B||typeof window.api!="function"||(B=window.api("GET","/api/crm/rooms").then(e=>(b={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},b.rooms.length&&(n.editRooms=b.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&y(),b)).catch(()=>b).finally(()=>{B=null})),B}async function ie(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(Z()){o={ready:!!C(),checking:!1,reason:"local",attempts:1,domain:""},C()&&(h=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&y();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}C()&&(h=!1),s("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&y(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(k=window.setTimeout(ie,6e3))}}function Pe(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0,r=!1;try{a=Number.parseInt(localStorage.getItem(E)||"0",10)}catch{}try{r=localStorage.getItem(R)==="1"}catch{}try{f=localStorage.getItem(X)==="year"?"year":"month"}catch{f="month"}if(i=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),n.hotelSubscribed&&i===3&&(i=0),c="guest",p=!1,l=0,G=!1,h=!1,F=Date.now(),I=0,M=!Number.isFinite(t)&&r,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},k&&window.clearTimeout(k),k=0,A(),!n.hotelSubscribed)try{localStorage.setItem(R,"1"),localStorage.setItem(E,String(i))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}n.settingsTourActive=!0,window.addEventListener("message",te),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",ee(!1);const u=document.createElement("div");u.id="marketelValueReveal",u.className="mvr-root",document.body.appendChild(u),y(),m("ValueRevealStarted",n.hotelSubscribed?"subscribed-replay":"pre-activation"),s("JourneyRevealStarted",{startStep:i,replay:!!n.hotelSubscribed,pendingResume:M}),x(i),Le(),ie()}function De(){try{return localStorage.getItem(R)==="1"}catch{return!1}}function Me(){try{localStorage.removeItem(R),localStorage.removeItem(E)}catch{}}const xe={clearPendingMarketelValueReveal:Me,hasPendingMarketelValueReveal:De,showMarketelValueReveal:Pe};function Ne(){oe(xe)}export{Me as clearPendingMarketelValueReveal,xe as default,De as hasPendingMarketelValueReveal,Ne as install,Pe as showMarketelValueReveal};
