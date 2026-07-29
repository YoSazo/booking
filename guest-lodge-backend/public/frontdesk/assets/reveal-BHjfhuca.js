import{c as o,e as L}from"./settings-BVJy4Woh.js";const y="marketelValueRevealPendingV1",b="marketelValueRevealStepV1";let a=0,l="guest",u=!1,c={rooms:[],rates:null},f=null,i={ready:!1,checking:!0,reason:"",attempts:0,domain:""},d=0;function I(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function r(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function E(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function s(){return o.activeHotelName||"Your Property"}function p(){return c.rooms[0]||o.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function M(){const e=p();return e.images?.[0]?.url||e.imageUrl||""}function R(){return c.rates?.nightly||99}function w(){if(I()&&o.activeHotelId){const t=new URL(window.location.href);return t.port="5173",t.pathname="/",t.search="",t.hash="",t.searchParams.set("hotelId",o.activeHotelId),t.toString()}const e=i.domain||o.activeHotelDomain||"";return e?`https://${e}/`:""}function D(){const e=new URL(window.location.href);return e.search="",e.hash="",o.activeHotelId&&e.searchParams.set("hotelId",o.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function $(e=""){const t=o.activeHotelAppIcon||M(),n=s().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${r(t)}" alt="">`:`<span class="${e}">${r(n)}</span>`}function T(){if(!o.hotelSubscribed)try{localStorage.setItem(y,"1"),localStorage.setItem(b,String(a))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function x(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function P(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function A(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",o.hotelSubscribed?"Complete":"Activate"].map((t,n)=>`<div class="mvr-progress-item ${n===a?"is-active":""} ${n<a?"is-done":""}">
      <span></span><small>${r(t)}</small>
    </div>`).join("")}
  </div>`}function H(e=""){const t=M();return t?`<img class="${e}" src="${r(t)}" alt="${r(p().name||"Room")}">`:`<div class="${e} mvr-photo-placeholder"><span>${r((p().name||"R").trim().charAt(0).toUpperCase())}</span></div>`}function V(){return i.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${i.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:i.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${i.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function N(){const e=p();return`<button type="button" class="mvr-booking-preview-card" id="mvrExpandPreview">
    <div class="mvr-booking-preview-hero">
      ${H("mvr-booking-preview-photo")}
      <span class="mvr-live-pill"><i></i> Direct booking page</span>
      <div class="mvr-booking-preview-title">
        <small>Book direct with</small>
        <strong>${r(s())}</strong>
      </div>
    </div>
    <div class="mvr-booking-preview-body">
      <div>
        <span>${r(e.name||"Your room")}</span>
        <small>${Math.max(1,Number(e.totalUnits)||1)} available · from ${E(R())}/night</small>
      </div>
      <b>Open live preview <span>↗</span></b>
    </div>
  </button>`}function F(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${r(p().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Open the live preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${V()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${N()}
    </div>
  </section>`}function G(){return`<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="mvrPhoneGreen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#62e46f"/><stop offset="1" stop-color="#08a837"/></linearGradient></defs>
    <rect width="64" height="64" rx="14" fill="url(#mvrPhoneGreen)"/>
    <path fill="#fff" d="M20.1 14.8c1.7-1 4.2-.5 5.2 1.3l4.2 7.4c.8 1.5.6 3.3-.6 4.5l-3 3c2.1 4.5 5.7 8.1 10.2 10.2l3-3c1.2-1.2 3-1.5 4.5-.6l7.4 4.2c1.8 1 2.4 3.5 1.3 5.2l-2.2 3.5c-1.7 2.8-5.1 4.2-8.3 3.4-15.7-3.7-28-16-31.7-31.7-.8-3.2.6-6.6 3.4-8.3l3.6-2.1z"/>
  </svg>`}function Y(){return`<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#fff"/>
    <circle cx="32" cy="32" r="25" fill="#40b8ed"/>
    <circle cx="32" cy="32" r="20.5" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>
    <g stroke="#fff" stroke-width="1.3" opacity=".9">
      <path d="M32 9v5M32 50v5M9 32h5M50 32h5M15.7 15.7l3.5 3.5M44.8 44.8l3.5 3.5M48.3 15.7l-3.5 3.5M19.2 44.8l-3.5 3.5"/>
    </g>
    <path d="M37.3 26.7 27.7 30l-4 9.1 9.6-3.3 4-9.1z" fill="#fff"/>
    <path d="m37.3 26.7-4 9.1-3.2-3.2 7.2-5.9z" fill="#ef3d52"/>
  </svg>`}function C(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${r(s())}</strong> while they are on your booking page, then reopen it whenever they want to book direct again.</p>
      <div class="mvr-callout">
        <strong>No App Store search or account.</strong>
        They tap Install on your booking page. Your property appears beside the apps they already use.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${u?"is-installed":""}">
      <div class="mvr-install-card">
        <div class="mvr-install-property-icon">${$()}</div>
        <div>
          <strong>Add ${r(s())} to your Home Screen</strong>
          <span>Book direct in one tap next time.</span>
        </div>
        <button type="button" id="mvrInstallDemo">${u?"Installed ✓":"Install"}</button>
      </div>
      <div class="mvr-install-arrow"><span>${u?"Now on their phone":"Tap Install"}</span><b>↓</b></div>
      <div class="mvr-ios-crop">
        <div class="mvr-ios-dock">
          <div class="mvr-dock-icon mvr-dock-property">${$()}</div>
          <div class="mvr-dock-icon">${G()}</div>
          <div class="mvr-dock-icon">${Y()}</div>
        </div>
      </div>
    </div>
  </section>`}function U(){const e=p().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">3 · Your Front Desk Assistant</div>
      <h1>Something changed outside Marketel? Tell Front Desk once.</h1>
      <p>Keep the tools and walk-ins you already have. Front Desk checks direct bookings with the people who know the property.</p>
      <div class="mvr-callout">
        <strong>No integration maze.</strong>
        When a room is taken elsewhere, reply in plain language and Marketel updates availability for you.
      </div>
    </div>
    <div class="mvr-visual mvr-assistant-visual">
      <div class="mvr-booking-alert">
        <div class="mvr-marketel-avatar">M</div>
        <div><span>Front Desk</span><strong>New ${r(e)} booking</strong><small>Tomorrow · ${E(R())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${r(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">We gave it to a walk-in.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Done.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Handled by Front Desk</strong><small>Your booking page is up to date</small></div></div>
    </div>
  </section>`}function _(){const e=o.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${r(s())} is ready.`:`Marketel is ready for ${r(s())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>A direct path back to your property</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`<div class="mvr-price"><strong>$199</strong><span>/month</span></div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>Try the complete system. Cancel anytime—no contract.</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":"Activate Marketel — $199/month"}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function O(){return a===0?F():a===1?C():a===2?U():_()}function q(){if(a===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${a>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[a]} →</button>
  </div>`}function h(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${A()}
    </header>
    <main class="mvr-main">${O()}</main>
    ${q()}
  </div>`,j())}function z(){const e=w();if(!e||document.getElementById("mvrLivePreview"))return;l="guest";const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <button type="button" id="mvrClosePreview">← Back to overview</button>
    <div class="mvr-live-title"><strong>${r(s())}</strong><span>Live preview · changes in Edit save for real</span></div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${r(s())} live preview" src="${r(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),t.querySelectorAll("[data-live-preview-mode]").forEach(n=>{n.addEventListener("click",()=>{const v=n.dataset.livePreviewMode==="edit"?"edit":"guest";if(v===l)return;l=v,t.querySelectorAll("[data-live-preview-mode]").forEach(S=>{S.classList.toggle("is-active",S.dataset.livePreviewMode===l)});const m=t.querySelector("iframe");m&&(m.title=l==="edit"?`${s()} Front Desk editor`:`${s()} booking-page preview`,m.src=l==="edit"?D():w()),l==="edit"&&g("BookingEngineEditPreviewViewed")})}),g("BookingEngineFullPreviewOpened")}function k(e){a=Math.max(0,Math.min(3,e)),T(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][a]),h(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function K(){d&&(window.clearTimeout(d),d=0),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",o.settingsTourActive=!1;try{localStorage.removeItem(y),localStorage.removeItem(b),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}x(),P(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function W(e){if(o.hotelSubscribed){K();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function j(){document.getElementById("mvrNext")?.addEventListener("click",()=>k(a+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>k(a-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",z),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>W(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{u||(u=!0,g("GuestAppInstallDemoClicked"),h())})}async function J(){return f||typeof window.api!="function"||(f=window.api("GET","/api/crm/rooms").then(e=>(c={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},c.rooms.length&&(o.editRooms=c.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&h(),c)).catch(()=>c).finally(()=>{f=null})),f}async function B(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(I()){i={ready:!!w(),checking:!1,reason:"local",attempts:1,domain:""},a===0&&!document.getElementById("mvrLivePreview")&&h();return}i.checking=!0,i.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");i={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:i.attempts,domain:String(e?.domain||"")}}catch{i.checking=!1,i.reason="unreachable"}a===0&&!document.getElementById("mvrLivePreview")&&h(),!(i.ready||i.reason==="deployment-disabled")&&i.attempts<10&&document.getElementById("marketelValueReveal")&&(d=window.setTimeout(B,6e3))}}function Q(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let n=0;try{n=Number.parseInt(localStorage.getItem(b)||"0",10)}catch{}if(a=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(n)?n:0)),o.hotelSubscribed&&a===3&&(a=0),l="guest",u=!1,i={ready:!1,checking:!0,reason:"",attempts:0,domain:""},d&&window.clearTimeout(d),d=0,!o.hotelSubscribed)try{localStorage.setItem(y,"1"),localStorage.setItem(b,String(a))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}o.settingsTourActive=!0,document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",P(!1);const v=document.createElement("div");v.id="marketelValueReveal",v.className="mvr-root",document.body.appendChild(v),h(),g("ValueRevealStarted",o.hotelSubscribed?"subscribed-replay":"pre-activation"),k(a),J(),B()}function X(){try{return localStorage.getItem(y)==="1"}catch{return!1}}function Z(){try{localStorage.removeItem(y),localStorage.removeItem(b)}catch{}}const ee={clearPendingMarketelValueReveal:Z,hasPendingMarketelValueReveal:X,showMarketelValueReveal:Q};function ae(){L(ee)}export{Z as clearPendingMarketelValueReveal,ee as default,X as hasPendingMarketelValueReveal,ae as install,Q as showMarketelValueReveal};
