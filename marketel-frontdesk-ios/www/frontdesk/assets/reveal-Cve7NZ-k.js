import{c,e as we}from"./settings-BjIgv-Fo.js";const ke=""+new URL("assistant-booking-request-DM4sqyhz.webp",import.meta.url).href,Se=""+new URL("assistant-text-resolution-GXaNrbcO.webp",import.meta.url).href,B="marketelValueRevealPendingV1",F="marketelValueRevealStepV1",le="marketelBillingIntervalV1";let i=0,p="guest",S={rooms:[],rates:null},C=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},q=!1,$=0,K=!1,k={1:0,2:0},z=0,A=0,y="month",s=null,Q=!1,b=!1,G=!1,Y="confirm";function de(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function m(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function ae(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function g(){return c.activeHotelName||"Your Property"}function Z(){return S.rooms[0]||c.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function re(){const e=Z();return e.images?.[0]?.url||e.imageUrl||""}function ce(){const e=Number(S.rates?.nightly);if(!Number.isFinite(e)||e<=0)return null;const t=e*.15,a=Math.max(1,Math.ceil(199/t));return{rate:e,roomNights:a,savings:t*a}}function $e(){const e=ce();if(!e)return`<div class="mvr-value-bridge is-proof-only">
      <strong>$5,800 booked direct</strong>
      <span>in one recorded month through this booking engine for Suite Stay, Alabama.</span>
    </div>`;const{rate:t,roomNights:a,savings:o}=e;return`<div class="mvr-value-bridge">
    <span>Your potential break-even</span>
    <strong>About ${a} direct room-night${a===1?"":"s"} could cover a month.</strong>
    <p>At ${ae(t)} per night, shifting ${a} room-night${a===1?"":"s"} from an estimated 15% OTA fee to direct represents about ${ae(o)} in commission savings.</p>
    <small><b>Real result:</b> Suite Stay booked $5,800 direct in one recorded month through this booking engine. Estimates vary with your OTA fees.</small>
  </div>`}function I(){if(de()&&c.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",c.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=n.domain||c.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return c.activeHotelId&&t.searchParams.set("hotelId",c.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function N(){const e=String(n.domain||c.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${g().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function ue(){const e=new URL(window.location.href);return e.search="",e.hash="",c.activeHotelId&&e.searchParams.set("hotelId",c.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function Ie(){if(!c.hotelSubscribed)try{localStorage.setItem(B,"1"),localStorage.setItem(F,String(i))}catch{}}function v(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t,...window.MarketelJourney?.linkage?.()||{}}).catch(()=>{})}function u(e,t={},a={}){return window.MarketelJourney?.track(e,{revealStep:i,stageName:["booking-page","guest-app","front-desk-assistant","activation"][i]||"unknown",...t},a)}function Re(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function me(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function ve(e){return Math.max(0,Math.floor(Number(e||0)/1e3))}function Pe(e){return String(ve(e)).padStart(2,"0")}function ie(e){return`${ve(e)}s`}function x(e){e?.layer&&(e.layer.classList.remove("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","true"),e.layer.innerHTML="")}function R(e,t){const a=e?.querySelector("#mvrLiveActions");a&&(a.hidden=!t)}function W(e="",t=!1){const a=s;if(a){if(a.timerId&&(window.clearInterval(a.timerId),a.timerId=0),a.promptFallbackId&&(window.clearTimeout(a.promptFallbackId),a.promptFallbackId=0),a.promptDelayId&&(window.clearTimeout(a.promptDelayId),a.promptDelayId=0),t&&a.status==="running"){const o=Date.now()-a.startedAt;v("BookingChallengeAbandoned",e),u("JourneyBookingChallengeAbandoned",{reason:e,elapsedMs:o},{durationMs:o})}a.timer?.classList.remove("is-live"),a.status==="running"&&(a.status="abandoned"),x(a)}}function oe(e){if(!e||e.status!=="running"||!e.timer)return;const t=Date.now()-e.startedAt,a=e.timer.querySelector("[data-challenge-time]");a&&(a.textContent=Pe(t)),e.timer.classList.toggle("is-over-minute",t>=6e4)}function Ae(e){!e||e!==s||e.status!=="prompted"||(e.status="running",e.startedAt=Date.now(),x(e),R(e.modal,!0),e.timer.classList.add("is-live"),oe(e),e.timerId=window.setInterval(()=>oe(e),500),v("BookingChallengeStarted"),u("JourneyBookingChallengeStarted",{targetSeconds:60,bookingDomain:N()}))}function Be(e){!e||e!==s||e.hasPrompted||p!=="guest"||(e.hasPrompted=!0,e.status="prompted",e.promptFallbackId&&(window.clearTimeout(e.promptFallbackId),e.promptFallbackId=0),R(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-intro" role="dialog" aria-labelledby="mvrChallengeTitle">
    <span class="mvr-challenge-eyebrow">Optional · Test the guest experience</span>
    <h2 id="mvrChallengeTitle">Can you reach payment in under 60 seconds?</h2>
    <p>Try the booking flow yourself. Nothing you do here creates a real booking.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-start">Start challenge</button>
      <button type="button" class="mvr-challenge-skip">Not now</button>
    </div>
  </section>`,e.layer.classList.add("is-visible","is-prompt"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-start")?.addEventListener("click",()=>Ae(e)),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{e.status="dismissed",x(e),R(e.modal,!0),v("BookingChallengeDismissed"),u("JourneyBookingChallengeDismissed")}),v("BookingChallengeShown"),u("JourneyBookingChallengeShown",{bookingDomain:N()}))}function Le(e){if(!e||e!==s)return;if(e.status!=="running"){u("JourneyBookingPreviewCheckoutReached",{challengeRunning:!1});return}const t=Date.now()-e.startedAt;e.timerId&&(window.clearInterval(e.timerId),e.timerId=0),e.status="completed",e.timer.classList.remove("is-live"),R(e.modal,!1),e.layer.innerHTML=`<section class="mvr-challenge-card mvr-challenge-complete" role="dialog" aria-labelledby="mvrChallengeCompleteTitle">
    <span class="mvr-challenge-check" aria-hidden="true">✓</span>
    <span class="mvr-challenge-eyebrow">Checkout reached in ${m(ie(t))}</span>
    <h2 id="mvrChallengeCompleteTitle">That is the direct-booking experience your guests get.</h2>
    <p>Now see where you change rooms, prices, photos, and availability.</p>
    <div class="mvr-challenge-actions">
      <button type="button" class="mvr-challenge-edit">See how you edit it</button>
      <button type="button" class="mvr-challenge-skip">Keep exploring</button>
    </div>
  </section>`,e.layer.classList.add("is-visible"),e.layer.setAttribute("aria-hidden","false"),e.layer.querySelector(".mvr-challenge-edit")?.addEventListener("click",()=>{x(e),D(e.modal,"edit",e.previewOpenedAt,"challenge-completed")}),e.layer.querySelector(".mvr-challenge-skip")?.addEventListener("click",()=>{x(e),R(e.modal,!0)}),v("BookingChallengeCheckoutReached",ie(t)),u("JourneyBookingChallengeCompleted",{elapsedMs:t,completedWithin60Seconds:t<=6e4},{durationMs:t})}function pe(e){const t=e?.data?.type;if(t!=="marketel:show-guest-app"&&t!=="marketel:continue-owner-tour"&&t!=="marketel:checkout-reached"&&t!=="marketel:editor-saved")return;const a=document.getElementById("marketelValueReveal");if(!(!a||!Array.from(a.querySelectorAll("iframe")).some(r=>r.contentWindow===e.source))){if(t==="marketel:editor-saved"){if(s?.iframe?.contentWindow!==e.source||p!=="edit")return;e.data?.hotelName&&(c.activeHotelName=String(e.data.hotelName)),s.modal.dataset.editorSaved="1";const r=Array.isArray(e.data?.changedFields)?e.data.changedFields.map(f=>String(f)):[],l=String(e.data?.kind||"booking-page");let d="header";if(l==="header"){const f=new Set(["name","subtitle","address","phone"]);d=r.length===1&&f.has(r[0])?`header-${r[0]}`:"header"}else l.includes("photo")?d="room-photo":l==="room"?d="room":l==="checkout-policy"&&(d="checkout-policy",s.modal.dataset.editorPreviewTarget="checkout");s.modal.dataset.editorHighlight=d,e.data?.roomId?s.modal.dataset.editorHighlightRoom=String(e.data.roomId):delete s.modal.dataset.editorHighlightRoom,u("JourneyBookingPreviewEdited",{kind:l,changedFields:r,highlightTarget:d}),X(),D(s.modal,"guest",s.previewOpenedAt,"saved-and-returned-to-booking-page");return}if(t==="marketel:checkout-reached"){if(s?.iframe?.contentWindow!==e.source||p!=="guest")return;Le(s);return}s?.iframe?.contentWindow===e.source&&(v("GuestAppPreviewRequestedFromBookingEngine"),D(s.modal,"edit",s.previewOpenedAt,"booking-install-explainer-continued"))}}function Ee(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guestel","Front Desk",c.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===i?"is-active":""} ${a<i?"is-done":""}">
      <span></span><small>${m(t)}</small>
    </div>`).join("")}
  </div>`}function Ce(){return b||n.reason==="deployment-disabled"||q&&!n.ready?!1:!!I()}function Te(){return Ce()?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:b?'<div class="mvr-page-status is-attention"><span>!</span>The live preview is still publishing. Your setup is saved, so you can continue without waiting.</div>':n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Me(){const e=I();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-browser-dots"><i></i><i></i><i></i></span>
      <span class="mvr-preview-address"><b></b>${m(N())}</span>
      <span class="mvr-preview-live"><i></i>Live</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${m(g())} booking-page preview" src="${m(e)}" tabindex="-1" aria-hidden="true" scrolling="no" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="${e?"View your booking page":"Check booking page preview"}" ${b?"disabled":""}>
        <span class="mvr-expand-cue" aria-hidden="true">
          <span class="mvr-expand-corners">
            <i class="is-top-left"></i><i class="is-top-right"></i>
            <i class="is-bottom-left"></i><i class="is-bottom-right"></i>
          </span>
          <strong>${b?"Still publishing":"View your booking page"}</strong>
        </span>
      </button>
    </div>
  </div>`}function Fe(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${m(Z().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>See what guests will use.</span>
        Open the booking page built for your property. Then see how guests keep you in Guestel and how you run it from Front Desk.
      </div>
      ${Te()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Me()}
    </div>
  </section>`}function xe(){return he("mvr-stage-app","2 · Your app and theirs",ge(),k[1]||0)}function De(){const e=m(g());return`<div class="mvr-guestel-proof mvr-guestel-install-proof">
    <div class="mvr-guestel-booking-card">
      <span class="mvr-guestel-property-mark">${m(g().trim().charAt(0).toUpperCase()||"P")}</span>
      <div><small>${e}</small><strong>Keep this property in Guestel</strong></div>
      <b>Add</b>
    </div>
    <span class="mvr-guestel-flow-arrow" aria-hidden="true">↓</span>
    <div class="mvr-guestel-system-card">
      <div class="mvr-guestel-icon">G</div>
      <div><small>APP CLIP</small><strong>Guestel</strong><span>Book direct. Keep every stay together.</span></div>
      <b>OPEN</b>
    </div>
  </div>`}function Ne(){const e=m(g()),t=m(Z().name||"Your room"),a=m(g().trim().charAt(0).toUpperCase()||"P");return`<div class="mvr-guestel-proof mvr-guestel-phone">
    <div class="mvr-guestel-phone-head"><span class="mvr-guestel-icon is-small">G</span><strong>Guestel</strong><i></i></div>
    <div class="mvr-guestel-wallet-card">
      <div class="mvr-guestel-wallet-image">${re()?`<img src="${m(re())}" alt="">`:`<span>${a}</span>`}</div>
      <div class="mvr-guestel-wallet-copy"><small>Saved property</small><strong>${e}</strong><span>${t} · Direct booking</span></div>
      <button type="button" tabindex="-1">Book direct</button>
    </div>
    <div class="mvr-guestel-wallet-nav"><b>Properties</b><span>Stays</span><span>Messages</span></div>
  </div>`}function He(){const e=m(g());return`<div class="mvr-guestel-proof mvr-guestel-reach-proof">
    <div class="mvr-guestel-notification">
      <span class="mvr-guestel-property-mark">${m(g().trim().charAt(0).toUpperCase()||"P")}</span>
      <div><small>${e} · now</small><strong>Come back direct and save</strong><p>Your returning-guest rate is ready in Guestel.</p></div>
    </div>
    <div class="mvr-guestel-outcomes">
      <span><b>01</b><strong>Book direct again</strong><small>Your rooms stay one tap away</small></span>
      <span><b>02</b><strong>Message the property</strong><small>The conversation stays with the stay</small></span>
    </div>
  </div>`}function ge(){const e=ce(),t=e?`Guests keep your property, then return to your rooms in one tap. About ${e.roomNights} direct room-night${e.roomNights===1?"":"s"} could cover Marketel.`:"Guests keep your property, then return to your rooms in one tap instead of searching an OTA again.";return[{title:"Guests tap Add. Guestel handles the rest.",body:"Your booking page opens a real Apple experience. They can book immediately and install Guestel without hunting through the App Store.",next:"See what they keep",event:"GuestelInstallFlowViewed",render:De},{title:"Your property stays in their Guestel wallet.",body:t,next:"See what that unlocks",event:"GuestelWalletViewed",render:Ne},{title:"The guest relationship stays yours.",body:"Their stay, your messages and your next direct offer live together—without paying an OTA to reach the same guest again.",next:"See how Front Desk protects you",event:"GuestelReachViewed",render:He}]}function fe(){return[{title:"It texts you the moment a request lands.",body:"Reply naturally — a walk-in took it, you’re full, whatever changed.",next:"See how you answer",event:"AssistantTextProofViewed",proof:{url:Se,alt:"A real text conversation where an owner tells Marketel a walk-in took the room, and Front Desk releases the online request, voids the hold, notifies the guest, and updates availability."}},{title:"Or answer with one tap.",body:"The same request is already waiting in Bookings. Either way works.",next:"Set your rule",event:"AssistantAppProofViewed",proof:{url:ke,alt:"A real Marketel Front Desk booking request with a push notification and buttons to keep or release the booking."}},{title:"And if you miss it, your rule decides.",body:"That’s how a room conflict never becomes a guest problem.",next:"Review plans and activation",event:"AssistantFallbackViewed",proof:null,render:Je}]}function J(e=i){return e===1?ge():e===2?fe():null}function Ve(e){return e?e.frames||[{url:e.url,alt:e.alt}]:[]}function he(e,t,a,o){const r=a[Math.max(0,Math.min(a.length-1,o))]||a[0],l=Ve(r.proof),d=l.length>1;return`<section class="mvr-stage mvr-stage-beats ${e}">
    <div class="mvr-beat-band">
      <div class="mvr-eyebrow">${t}</div>
      <h1 class="mvr-beat-title">${r.title}</h1>
      <p class="mvr-beat-body">${r.body}</p>
    </div>
    <div class="mvr-beat-stage">
      ${r.proof?`<figure class="mvr-beat-proof${d?" is-paired":""}">
        ${l.map((f,P)=>`<img class="mvr-beat-frame${P===0?" is-active":""}" src="${f.url}" width="780" height="1528" decoding="async" alt="${m(f.alt)}">`).join("")}
        ${d?`<span class="mvr-beat-frame-dots" aria-hidden="true">${l.map((f,P)=>`<i${P===0?' class="is-active"':""}></i>`).join("")}</span>`:""}
      </figure>`:`<div class="mvr-beat-settings">${r.render?r.render():""}</div>`}
    </div>
  </section>`}const qe=850,Ge=2600;let V=0,T=0;function j(){V&&(window.clearInterval(V),V=0),T&&(window.clearTimeout(T),T=0)}function Ye(){j();const e=document.querySelector(".mvr-beat-proof.is-paired");if(!e)return;const t=[...e.querySelectorAll(".mvr-beat-frame")],a=[...e.querySelectorAll(".mvr-beat-frame-dots i")];if(t.length<2)return;let o=0;const r=()=>{if(!e.isConnected)return j();o=(o+1)%t.length,t.forEach((l,d)=>l.classList.toggle("is-active",d===o)),a.forEach((l,d)=>l.classList.toggle("is-active",d===o))};T=window.setTimeout(()=>{T=0,r(),V=window.setInterval(r,Ge)},qe)}function ne(e,t=!1){const a=J();if(!a)return;const o=Math.max(0,Math.min(a.length-1,Number(e)||0));if(o===(k[i]||0)||(k[i]=o,w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"}),!t))return;const r=a[o];r.event&&v(r.event),u("JourneyRevealBeatViewed",{revealStep:i,beat:o})}function Je(){const e=Y==="release";return`<div class="mvr-fallback-control">
    <strong>If you miss the alert</strong>
    <div class="mvr-fallback-options" role="group" aria-label="Choose what happens when nobody answers">
      <button type="button" data-mvr-fallback="confirm" class="${e?"":"is-selected"}"><b>Keep the booking</b><span>Revenue first</span></button>
      <button type="button" data-mvr-fallback="release" class="${e?"is-selected":""}"><b>Release request</b><span>Availability first</span></button>
    </div>
    <small>${e?"Your rule: void the $1 hold and notify the guest if nobody replies.":"Your rule: confirm the booking automatically if nobody replies."}</small>
  </div>`}function Oe(){return he("mvr-stage-assistant","3 · Your Front Desk Assistant",fe(),k[2]||0)}function Ue(){const e=c.hotelSubscribed,t=y==="year",a=t?"$1,990":"$199",o=t?"/year":"/month",r=t?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month",l=`<div class="mvr-value-list">
    <div style="--stagger:0"><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
    <div style="--stagger:1"><span>✓</span><p><strong>Your property in Guestel</strong><small>Guests keep your rooms, their stays and your messages one tap away</small></p></div>
    <div style="--stagger:2"><span>✓</span><p><strong>Marketel Front Desk and Assistant</strong><small>Tell it when a walk-in takes a room; it updates remaining availability</small></p></div>
  </div>`;return`<section class="mvr-stage mvr-stage-finale">
    <button type="button" class="mvr-finale-back" id="mvrBack">← Back</button>
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${m(g())} is ready.`:`Marketel is ready for ${m(g())}.`}</h1>
      <p>Guests book on your direct page and keep your property in Guestel. You use Marketel Front Desk to manage bookings, availability and the guest relationship.</p>
      ${e?`${l}
        <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">Open Front Desk</button>
        <div class="mvr-secure-note">You can replay this overview anytime from How it works.</div>`:`
        <div class="mvr-activation-decision">
          <div class="mvr-billing-toggle" role="radiogroup" aria-label="Billing frequency">
          <button type="button" role="radio" aria-checked="${!t}" class="${t?"":"is-active"}" data-mvr-billing="month">Monthly</button>
          <button type="button" role="radio" aria-checked="${t}" class="${t?"is-active":""}" data-mvr-billing="year">Yearly <span>Save $398</span></button>
          </div>
          <div class="mvr-price"><strong>${a}</strong><span>${o}</span></div>
          <div class="mvr-price-detail${t?" is-visible":""}">${t?"Two months free · $398 saved":"&nbsp;"}</div>
          <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">${r}</button>
          <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>${t?"Cancel anytime. Renews yearly at $1,990 unless canceled.":"Cancel anytime. Renews monthly at $199 unless canceled."}</small></p></div>
          <div class="mvr-secure-note">Billing starts when you complete secure Stripe checkout · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a></div>
        </div>
        <div class="mvr-activation-proof">
          ${$e()}
          <div class="mvr-included-label">Everything included</div>
          ${l}
        </div>`}
    </div>
  </section>`}function _e(){return i===0?Fe():i===1?xe():i===2?Oe():Ue()}function We(){if(i===0)return!Q&&!b?"":`<div class="mvr-footer mvr-footer-booking">
      <button type="button" class="mvr-primary" id="mvrNext">See the Guestel experience →</button>
    </div>`;if(i===3)return"";const e=J(),t=e?(e[k[i]||0]||e[0]).next:"See how Front Desk protects you";return`<div class="mvr-footer">
    ${i>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${t} →</button>
  </div>`}let O="",M=-1,U=-1;function w(){const e=document.getElementById("marketelValueReveal");if(!e)return;const t=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${Ee()}
    </header>
    <main class="mvr-main">${_e()}</main>
    ${We()}
  </div>`;if(t===O&&e.firstElementChild)return;const a=k[i]||0,o=i!==M||a!==U;e.classList.toggle("mvr-no-enter",!o&&M!==-1),M=i,U=a,O=t,e.innerHTML=t,Qe()}function se(){const e=I();if(document.getElementById("mvrLivePreview"))return;if(!e){b=!0,u("JourneyBookingPreviewOpened",{mode:"unavailable",bookingPageReady:!1,bookingPageReason:n.reason||"missing-url"}),w();return}Q=!0,p="guest";const t=Date.now(),a=document.createElement("div");a.id="mvrLivePreview",a.className="mvr-live-preview",a.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" class="mvr-live-exit" id="mvrClosePreview" aria-label="Exit preview">×</button>
      <div class="mvr-live-address" id="mvrLiveLocation" aria-label="Your live booking address">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M5 8h10v8H5z"/></svg>
        <strong data-live-location-text>${m(N())}</strong>
      </div>
      <span class="mvr-challenge-timer" aria-live="polite" aria-label="Seconds elapsed">
        <strong data-challenge-time>00</strong>
      </span>
    </div>
  </div>
  <div class="mvr-live-stage">
    <iframe data-preview-frame="guest" title="${m(g())} live preview" src="${m(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <iframe data-preview-frame="editor" title="${m(g())} Front Desk editor" hidden sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
    <div class="mvr-challenge-layer" aria-hidden="true"></div>
  </div>
  <div class="mvr-live-actions" id="mvrLiveActions" hidden>
    <button type="button" class="mvr-live-back" id="mvrLiveBack" hidden>← Back</button>
    <button type="button" class="mvr-live-forward" id="mvrLiveForward">
      <span data-live-forward-long>See how to edit your booking page</span>
      <b aria-hidden="true">→</b>
    </button>
    <button type="button" class="mvr-live-continue" id="mvrContinueGuestApp" hidden>See the Guestel experience</button>
  </div>`,document.getElementById("marketelValueReveal")?.appendChild(a);const o=a.querySelector('[data-preview-frame="guest"]');window.setTimeout(()=>{const r=a.querySelector('[data-preview-frame="editor"]');!r?.isConnected||r.getAttribute("src")||(r.src=ue())},1200),s={modal:a,iframe:o,layer:a.querySelector(".mvr-challenge-layer"),timer:a.querySelector(".mvr-challenge-timer"),previewOpenedAt:t,status:"waiting",hasPrompted:!1,startedAt:0,timerId:0,promptFallbackId:0,promptDelayId:0},s.promptFallbackId=window.setTimeout(()=>{s?.modal!==a||s.status!=="waiting"||R(a,!0)},4e3),o?.addEventListener("load",()=>{const r=s;r?.modal!==a||p!=="guest"||(r.promptDelayId&&window.clearTimeout(r.promptDelayId),r.promptDelayId=window.setTimeout(()=>{r.promptDelayId=0,Be(r)},1500))}),a.querySelector("#mvrClosePreview")?.addEventListener("click",()=>{u("JourneyBookingPreviewModeChanged",{action:"closed",mode:p},{durationMs:Date.now()-t}),W("preview-closed",!0),s=null,a.remove(),w()}),a.querySelector("#mvrContinueGuestApp")?.addEventListener("click",()=>{Ke(a,t,"continued-without-editor")}),a.querySelector("#mvrLiveForward")?.addEventListener("click",()=>{D(a,"edit",t,"guided-forward")}),a.querySelector("#mvrLiveBack")?.addEventListener("click",()=>{D(a,"guest",t,"returned-to-booking-page")}),v("BookingEngineFullPreviewOpened"),u("JourneyBookingPreviewOpened",{mode:"guest",bookingPageReady:!!n.ready,bookingPageReason:n.reason||""})}function Ke(e,t,a){e?.isConnected&&(u("JourneyRevealNavigation",{action:a,toStep:1,editorViewed:p==="edit"},{durationMs:Date.now()-t}),W("continued-to-guest-app",!1),s=null,e.remove(),_(1))}function ze(e,t){if(!e||!t)return;let a="";try{a=new URL(e.getAttribute("src")||"",window.location.href).toString()}catch{a=e.getAttribute("src")||""}a!==t&&(e.src=t)}function D(e,t,a,o="mode-selected"){if(!e?.isConnected)return;t==="edit"&&W("edit-mode-selected",!0),p=t==="edit"?"edit":"guest";const r=e.querySelector("#mvrLiveLocation"),l=e.querySelector("[data-live-location-text]"),d=e.querySelector("#mvrLiveForward"),f=e.querySelector("#mvrContinueGuestApp"),P=e.querySelector("#mvrLiveBack"),h=p==="edit";r?.classList.toggle("is-editor",h),l&&(l.textContent=h?"Front Desk editor":N()),r&&r.setAttribute("aria-label",h?"Front Desk editor":"Your live booking address");const be=!h&&String(o||"").startsWith("saved-"),ee=h||be;d&&(d.hidden=ee),f&&(f.hidden=!ee),P&&(P.hidden=!h),R(e,!0);const H=e.querySelector('[data-preview-frame="guest"]'),L=e.querySelector('[data-preview-frame="editor"]');if(H&&L){if(h)L.getAttribute("src")||(L.src=ue());else{const E=new URL(I());if(e.dataset.editorSaved==="1"){E.searchParams.set("previewRefresh",String(Date.now()));const te=e.dataset.editorPreviewTarget==="checkout";E.searchParams.set("previewHighlight",te?"checkout-policy":e.dataset.editorHighlight||"header"),te?E.searchParams.set("previewCheckout","1"):e.dataset.editorHighlightRoom&&E.searchParams.set("previewHighlightRoom",e.dataset.editorHighlightRoom),delete e.dataset.editorSaved,delete e.dataset.editorHighlight,delete e.dataset.editorHighlightRoom,delete e.dataset.editorPreviewTarget}ze(H,E.toString())}H.hidden=h,L.hidden=!h,s?.modal===e&&(s.iframe=h?L:H)}u("JourneyBookingPreviewModeChanged",{action:o,mode:p},{durationMs:Date.now()-a}),p==="edit"&&v("BookingEngineEditPreviewViewed")}function _(e){const t=i,a=Math.max(0,Math.min(3,e)),o=Date.now();A&&a!==t&&u("JourneyRevealStageCompleted",{revealStep:t,stageName:["booking-page","guest-app","front-desk-assistant","activation"][t]||"unknown",nextStep:a,direction:a>t?"forward":"back"},{durationMs:o-A}),i=a,A=o,Ie(),v(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][i]),u("JourneyRevealStageViewed",{resumed:G,bookingPageReady:i===0?!!n.ready:void 0}),G=!1,w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function je(){A&&u("JourneyRevealStageCompleted",{action:"reveal-finished",totalRevealMs:z?Date.now()-z:null},{durationMs:Date.now()-A}),$&&(window.clearTimeout($),$=0),W("reveal-finished",!0),s=null,j(),O="",M=-1,U=-1,document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",pe),c.settingsTourActive=!1;try{localStorage.removeItem(B),localStorage.removeItem(F),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}Re(),me(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function Xe(e){if(c.hotelSubscribed){je();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",v("ActivationCtaClicked");try{await window.goLive({billingInterval:y})}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent=y==="year"?"Activate Marketel — $1,990/year":"Activate Marketel — $199/month")}}}function Qe(){document.getElementById("mvrNext")?.addEventListener("click",()=>{const e=J(),t=k[i]||0;if(e&&t<e.length-1){ne(t+1,!0);return}u("JourneyRevealNavigation",{action:"next",toStep:i+1}),_(i+1)}),document.getElementById("mvrBack")?.addEventListener("click",()=>{const e=J(),t=k[i]||0;if(e&&t>0){ne(t-1,!0);return}u("JourneyRevealNavigation",{action:"back",toStep:i-1}),_(i-1)}),document.getElementById("mvrExpandPreview")?.addEventListener("click",se),document.querySelector(".mvr-preview-teaser-veil")?.addEventListener("click",()=>{b||se()}),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>Xe(e.currentTarget)),document.querySelectorAll("[data-mvr-billing]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrBilling==="year"?"year":"month";if(t!==y){y=t;try{localStorage.setItem(le,y)}catch{}v(t==="year"?"YearlyBillingSelected":"MonthlyBillingSelected"),u("JourneyBillingIntervalSelected",{billingInterval:y,price:y==="year"?1990:199,currency:"USD"}),w()}})}),document.querySelectorAll("[data-mvr-fallback]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.mvrFallback==="release"?"release":"confirm";t!==Y&&(Y=t,v(t==="release"?"AssistantReleaseFallbackSelected":"AssistantKeepFallbackSelected"),u("JourneyAssistantFallbackSelected",{noResponseAction:t}),typeof window.api=="function"&&window.api("POST","/api/crm/booking-approval",{noResponseAction:t}).catch(()=>{}),w())})}),Ye()}async function X(){return C||typeof window.api!="function"||(C=Promise.all([window.api("GET","/api/crm/rooms"),window.api("GET","/api/crm/booking-approval").catch(()=>null)]).then(([e,t])=>(S={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},Y=t?.data?.noResponseAction==="release"?"release":"confirm",S.rooms.length&&(c.editRooms=S.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&w(),S)).catch(()=>S).finally(()=>{C=null})),C}async function ye(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(de()){n={ready:!!I(),checking:!1,reason:"local",attempts:1,domain:""},q=!n.ready,I()&&(b=!1),u("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&w();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")},q=!n.ready}catch{n.checking=!1,n.reason="unreachable"}I()&&(b=!1),u("JourneyBookingPageStatus",{ready:n.ready,reason:n.reason,attempts:n.attempts}),i===0&&!document.getElementById("mvrLivePreview")&&w(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&($=window.setTimeout(ye,6e3))}}async function Ze(e={}){if(document.getElementById("marketelValueReveal")||K)return;K=!0;let t=!1;if(!c.editRooms?.length&&typeof window.api=="function"&&(await Promise.race([X(),new Promise(d=>{setTimeout(d,2500)})]),t=!0),K=!1,document.getElementById("marketelValueReveal"))return;const a=Number(e.startAt);let o=0,r=!1;try{o=Number.parseInt(localStorage.getItem(F)||"0",10)}catch{}try{r=localStorage.getItem(B)==="1"}catch{}try{y=localStorage.getItem(le)==="year"?"year":"month"}catch{y="month"}if(i=Number.isFinite(a)?Math.max(0,Math.min(3,a)):Math.max(0,Math.min(3,Number.isFinite(o)?o:0)),c.hotelSubscribed&&i===3&&(i=0),p="guest",k={1:0,2:0},Q=!1,b=!1,O="",M=-1,U=-1,z=Date.now(),A=0,G=!Number.isFinite(a)&&r,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},q=!1,$&&window.clearTimeout($),$=0,!c.hotelSubscribed)try{localStorage.setItem(B,"1"),localStorage.setItem(F,String(i))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}c.settingsTourActive=!0,window.addEventListener("message",pe),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",me(!1);const l=document.createElement("div");l.id="marketelValueReveal",l.className="mvr-root",document.body.appendChild(l),w(),v("ValueRevealStarted",c.hotelSubscribed?"subscribed-replay":"pre-activation"),u("JourneyRevealStarted",{startStep:i,replay:!!c.hotelSubscribed,pendingResume:G}),_(i),t||X(),ye()}function et(){try{return localStorage.getItem(B)==="1"}catch{return!1}}function tt(){try{localStorage.removeItem(B),localStorage.removeItem(F)}catch{}}const at={clearPendingMarketelValueReveal:tt,hasPendingMarketelValueReveal:et,showMarketelValueReveal:Ze};function it(){we(at)}export{tt as clearPendingMarketelValueReveal,at as default,et as hasPendingMarketelValueReveal,it as install,Ze as showMarketelValueReveal};
