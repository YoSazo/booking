import{c as n,e as X}from"./settings-loEHCcqo.js";const B="marketelValueRevealPendingV1",A="marketelValueRevealStepV1",O="marketelBillingIntervalV1";let i=0,c="guest",p=!1,y={rooms:[],rates:null},$=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},b=0,k=0,w=null,d=0,E=0,h=0,f="month",v=null;const Z="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",ee="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function U(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function s(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function te(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function g(){return n.activeHotelName||"Your Property"}function F(){return y.rooms[0]||n.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function ae(){const e=F();return e.images?.[0]?.url||e.imageUrl||""}function re(){return y.rates?.nightly||99}function P(){if(U()&&n.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",n.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||n.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return n.activeHotelId&&t.searchParams.set("hotelId",n.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function M(){const e=String(o.domain||n.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ie(){const e=new URL(window.location.href);return e.search="",e.hash="",n.activeHotelId&&e.searchParams.set("hotelId",n.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function C(e=""){const t=n.activeHotelAppIcon||ae(),a=g().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${s(t)}" alt="">`:`<span class="${e}">${s(a)}</span>`}function oe(){if(!n.hotelSubscribed)try{localStorage.setItem(B,"1"),localStorage.setItem(A,String(i))}catch{}}function m(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function l(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:i,stageName:["booking-page","guest-app","front-desk-assistant","activation"][i]||"unknown",...t},a)}function ne(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function W(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function x(e){const t=Math.max(0,Math.floor(Number(e||0)/1e3)),a=Math.floor(t/60),r=String(t%60).padStart(2,"0");return`${a}:${r}`}function R(e){e?.layer&&(e.layer.classList.remove("is-visible"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function L(e="",t=!1){const a=v;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),t&&a.status==="running"){const r=Date.now()-a.startedAt;m("BookingChallengeAbandoned",e),l("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:r},{durationMs:r})}a.timer&&(a.timer.hidden=!0),a.status==="running"&&(a.status="abandoned"),R(a)}}function Y(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=`${x(t)} / 1:00`),e.timer.classList.toggle("is-over-minute",t>=6e4)}function se(e){!e||e!==v||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),R(e),e.timer.hidden=!1,Y(e),e.timerId=window.setInterval(()=>Y(e),500),m("BookingChallengeStarted"),l("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:M()}))}function le(e){!e||e!==v||e.hasPrompted||c!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.layer.innerHTML=`<section class="mvr-challenge-card" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Try it like a guest</span>
    <h2 id="mvrChallengeTitle">Can you reach checkout in under 60 seconds?</h2>
    <p>Choose a room and dates, then continue to checkout. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start 60-second challenge</button>
      <button type="button" class="mvr-challenge-skip">Explore normally</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>se(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",R(e),m("BookingChallengeDismissed"),l("JourneyBookingChallengeDismissed")}),m("BookingChallengeShown"),l("JourneyBookingChallengeShown",{bookingDomain:M()}))}function de(e){if(!e||e!==v)return;if(e.status!=="running"){l("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.hidden=!0,e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${s(x(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{R(e),V(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{R(e)}),m("BookingChallengeCheckoutReached",x(t)),l("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function z(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(u=>u.contentWindow===e.source))){if(t==="marketel:checkout-reached"){if(v?.iframe?.contentWindow!==e.source||c!=="guest")return;de(v);return}v?.iframe?.contentWindow===e.source&&(m("GuestAppPreviewRequestedFromBookingEngine"),V(v.modal,"edit",v.previewOpenedAt,"booking-install-explainer-continued"))}}function ce(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",n.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===i?"is-active":""} ${a<i?"is-done":""}">
      <span></span><small>${s(t)}</small>
    </div>`).join("")}
  </div>`}function ue(){return o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function ve(){const e=P();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${s(M())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${s(g())} booking-page preview" src="${s(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Try booking as a guest">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Try booking as a guest</strong><i>→</i></span>
        <small>See if you can reach payment in under 60 seconds</small>
      </button>
    </div>
  </div>`}function me(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${s(F().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>Try it yourself.</span>
        Reach payment as a guest, then see exactly where you control the page in Front Desk.
      </div>
      ${ue()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${ve()}
    </div>
  </section>`}function _(e,t){return`<img class="mvr-ios-system-icon" src="${s(e)}" alt="${s(t)}">`}function pe(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${s(g())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
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
                    <div class="mvr-install-property-icon">${C()}</div>
                    <div>
                      <strong>Get the ${s(g())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${p?"disabled":""}>${p?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${p?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${C()}</div>
                      <div class="mvr-dock-icon">${_(Z,"Phone")}</div>
                      <div class="mvr-dock-icon">${_(ee,"Safari")}</div>
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
                    <span>${s(g())} stays one tap away.</span>
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
                    <strong>${s(g())}</strong>
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
  </section>`}function ge(){const e=F().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${s(e)} booking</strong><small>Tomorrow · ${te(re())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${s(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function fe(){const e=n.hotelSubscribed,t=f==="year",a=t?"$1,990":"$199",r=t?"/year":"/month",u=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month";return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${s(g())} is ready.`:`Marketel is ready for ${s(g())}.`}</h1>
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
        ${e?"Open Front Desk":u}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function he(){return i===0?me():i===1?pe():i===2?ge():fe()}function ye(){if(i===0)return"";if(i===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${i>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[i]} →</button>
  </div>`}function S(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${ce()}
    </header>
    <main class="mvr-main">${he()}</main>
    ${ye()}
  </div>`,Se())}function be(){const e=P();if(!e||document.getElementById("mvrLivePreview"))return;c="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-title"><strong>${s(g())}</strong><span data-live-preview-context>Guest booking page</span></div>
      <button type="button" class="mvr-live-forward" id="mvrLiveForward">
        <span class="mvr-live-forward-long" data-live-forward-long>See how you edit this</span>
        <span class="mvr-live-forward-short" data-live-forward-short>Edit this</span>
        <b aria-hidden="true">→</b>
      </button>
    </div>
    <div class="mvr-live-address-row" id="mvrLiveAddressRow">
      <span>Your booking link</span>
      <div class="mvr-live-address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong>${s(M())}</strong>
      </div>
      <div class="mvr-challenge-timer" hidden aria-live="polite">
        <span></span>
        <div><small>Checkout challenge</small><strong data-challenge-time>0:00 / 1:00</strong></div>
      </div>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe title="${s(g())} live preview" src="${s(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const r=a.querySelector(".mvr-live-stage > iframe");v={modal:a,iframe:r,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0},r?.addEventListener("load",()=>{v?.modal!==a||c!=="guest"||window.setTimeout(()=>le(v),250)}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{l("JourneyBookingPreviewModeChanged",{action:"closed",mode:c},{durationMs:Date.now()-t}),L("preview-closed",!0),v=null,a.remove()}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{if(c==="guest"){V(a,"edit",t,"guided-forward");return}l("JourneyRevealNavigation",{action:"continued-from-editor-preview",toStep:1},{durationMs:Date.now()-t}),L("continued-to-guest-app",!1),v=null,a.remove(),D(1)}),m("BookingEngineFullPreviewOpened"),l("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!o.ready,bookingPageReason:o.reason||""})}function V(e,t,a,r="mode-selected"){if(!e?.isConnected)return;L("edit-mode-selected",!0),c="edit",e.querySelector("#mvrLiveAddressRow")?.classList.toggle("is-editor",c==="edit");const u=e.querySelector("[data-live-preview-context]"),q=e.querySelector("#mvrLiveForward"),G=e.querySelector("[data-live-forward-long]"),J=e.querySelector("[data-live-forward-short]");u&&(u.textContent=c==="edit"?"Front Desk editor · your first room saves":"Guest booking page"),G&&(G.textContent=c==="edit"?"Continue to Guest App":"See how you edit this"),J&&(J.textContent=c==="edit"?"Continue":"Edit this"),q&&q.setAttribute("aria-label",c==="edit"?"Continue to the Guest App":"See how you edit this booking page");const T=e.querySelector(".mvr-live-stage > iframe");T&&(T.title=c==="edit"?`${g()} Front Desk editor`:`${g()} booking-page preview`,T.src=c==="edit"?ie():P()),l("JourneyBookingPreviewModeChanged",{action:r,mode:c},{durationMs:Date.now()-a}),c==="edit"&&m("BookingEngineEditPreviewViewed")}function D(e){I();const t=i,a=Math.max(0,Math.min(3,e)),r=Date.now();h&&a!==t&&l("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:r-h}),i=a,h=r,oe(),m(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][i]),l("JourneyRevealStageViewed",{resumed:E>0&&r-E<100,bookingPageReady:i===0?!!o.ready:void 0}),S(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function we(){h&&l("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:E?Date.now()-E:null},{durationMs:Date.now()-h}),b&&(window.clearTimeout(b),b=0),L("reveal-finished",!0),v=null,I(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",z),n.settingsTourActive=!1;try{localStorage.removeItem(B),localStorage.removeItem(A),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}ne(),W(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function ke(e){if(n.hotelSubscribed){we();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",m("ActivationCtaClicked"),l("JourneyCheckoutRequested",{price:f==="year"?1990:199,currency:"USD",billingInterval:f,subscribed:!!n.hotelSubscribed},{durationMs:h?Date.now()-h:null,immediate:!0});try{await window.goLive({billingInterval:f})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=f==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function I(){k&&(window.clearTimeout(k),k=0),w?.disconnect(),w=null}function N(e){p=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",p);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=p?"Installed ✓":"Install",a.disabled=p);const r=t?.querySelector(".mvr-install-arrow span");r&&(r.textContent=p?"Now on their Home Screen":"Tap Install")}function H(e,t=!1){I(),d=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",d===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((r,u)=>{r.setAttribute("aria-hidden",u===d?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(r=>{const u=Number(r.dataset.mvrAppSlide)===d;r.classList.toggle("is-active",u),r.setAttribute("aria-current",u?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(r=>{r.disabled=Number(r.dataset.mvrAppSlide)===d}),d===1?N(!0):(N(!1),j()),t&&m(d===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"),l("JourneyGuestAppDemo",{action:"slide-viewed",slide:d===1?"value":"install",manual:!!t}))}function K(e=!1){p||d!==0||(I(),N(!0),e&&m("GuestAppInstallDemoClicked"),l("JourneyGuestAppDemo",{action:"install-demonstrated",manual:!!e}),k=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&H(1,!1)},e?900:1200))}function j(){if(I(),i!==1||d!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{k||(k=window.setTimeout(()=>{i===1&&document.getElementById("marketelValueReveal")&&(p?H(1,!1):K(!1))},p?900:1300))};"IntersectionObserver"in window?(w=new IntersectionObserver(a=>{a.some(r=>r.isIntersecting&&r.intersectionRatio>=.35)&&(w?.disconnect(),w=null,t())},{threshold:[.35]}),w.observe(e)):t()}function Se(){document.getElementById("mvrNext")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"next",toStep:i+1}),D(i+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{l("JourneyRevealNavigation",{action:"back",toStep:i-1}),D(i-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",be),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>ke(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==f){f=t;try{localStorage.setItem(O,f)}catch{}m(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),l("JourneyBillingIntervalSelected",{billingInterval:f,price:f==="year"?1990:199,currency:"USD"}),S()}})}),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{K(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==d&&H(t,!0)})}),j()}async function Ie(){return $||typeof window.api!="function"||($=window.api("GET","/api/crm/rooms").then(e=>(y={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},y.rooms.length&&(n.editRooms=y.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&S(),y)).catch(()=>y).finally(()=>{$=null})),$}async function Q(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(U()){o={ready:!!P(),checking:!1,reason:"local",attempts:1,domain:""},l("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&S();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}l("JourneyBookingPageStatus",{ready:o.ready,reason:o.reason,attempts:o.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&S(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(b=window.setTimeout(Q,6e3))}}function $e(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(A)||"0",10)}catch{}try{f=localStorage.getItem(O)==="year"?"year":"month"}catch{f="month"}if(i=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),n.hotelSubscribed&&i===3&&(i=0),c="guest",p=!1,d=0,E=Date.now(),h=0,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},b&&window.clearTimeout(b),b=0,I(),!n.hotelSubscribed)try{localStorage.setItem(B,"1"),localStorage.setItem(A,String(i))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}n.settingsTourActive=!0,window.addEventListener("message",z),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",W(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),S(),m("ValueRevealStarted",n.hotelSubscribed?"subscribed-replay":"pre-activation"),l("JourneyRevealStarted",{startStep:i,replay:!!n.hotelSubscribed,pendingResume:!Number.isFinite(t)&&a>0}),D(i),Ie(),Q()}function Ae(){try{return localStorage.getItem(B)==="1"}catch{return!1}}function Ee(){try{localStorage.removeItem(B),localStorage.removeItem(A)}catch{}}const Re={clearPendingMarketelValueReveal:Ee,hasPendingMarketelValueReveal:Ae,showMarketelValueReveal:$e};function Ce(){X(Re)}export{Ee as clearPendingMarketelValueReveal,Re as default,Ae as hasPendingMarketelValueReveal,Ce as install,$e as showMarketelValueReveal};
