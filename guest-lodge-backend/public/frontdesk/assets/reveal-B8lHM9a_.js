import{c as r,e as B}from"./settings-ByuEsxF5.js";const p="marketelValueRevealPendingV1",u="marketelValueRevealStepV1";let n=0,i="guest",d={rooms:[],rates:null},m=null,s={ready:!1,checking:!0,reason:"",attempts:0},c=0;function a(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function y(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function o(){return r.activeHotelName||"Your Property"}function v(){return d.rooms[0]||r.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function $(){const e=v();return e.images?.[0]?.url||e.imageUrl||""}function k(){return d.rates?.nightly||99}function w(){return typeof window.guestBookingEngineUrl=="function"?window.guestBookingEngineUrl()||"":r.activeHotelDomain?`https://${r.activeHotelDomain}/`:""}function P(){if(!r.hotelSubscribed)try{localStorage.setItem(p,"1"),localStorage.setItem(u,String(n))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function M(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function E(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function D(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",r.hotelSubscribed?"Complete":"Activate"].map((t,l)=>`<div class="mvr-progress-item ${l===n?"is-active":""} ${l<n?"is-done":""}">
      <span></span><small>${a(t)}</small>
    </div>`).join("")}
  </div>`}function I(e=""){const t=$();return t?`<img class="${e}" src="${a(t)}" alt="${a(v().name||"Room")}">`:`<div class="${e} mvr-photo-placeholder"><span>${a((v().name||"R").trim().charAt(0).toUpperCase())}</span></div>`}function H(){const e=v();return`<div class="mvr-fallback-site">
    <div class="mvr-fallback-hero">
      ${I("mvr-fallback-photo")}
      <div class="mvr-fallback-brand">${a(o())}</div>
      <div class="mvr-fallback-sub">Book your stay directly</div>
    </div>
    <div class="mvr-fallback-search"><span>Check in</span><span>Check out</span><button>Search</button></div>
    <div class="mvr-fallback-room">
      <div><strong>${a(e.name||"Your room")}</strong><small>${Math.max(1,Number(e.totalUnits)||1)} available</small></div>
      <strong>${y(k())}<small>/night</small></strong>
    </div>
  </div>`}function T(){const e=s.ready?w():"";return`<div class="mvr-phone mvr-booking-phone">
    <div class="mvr-phone-speaker"></div>
    <div class="mvr-browser-bar">
      <span class="mvr-browser-lock">●</span>
      <span>${a(r.activeHotelDomain||"your-property.mktel.co")}</span>
    </div>
    <div class="mvr-phone-screen">
      ${e?`<iframe title="${a(o())} booking page" src="${a(e)}" loading="eager" sandbox="allow-scripts allow-same-origin"></iframe>`:H()}
    </div>
  </div>`}function N(){return s.ready?'<div class="mvr-page-status is-ready"><span>✓</span>Your live guest page is online</div>':s.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${s.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function V(){const e=v();return`<div class="mvr-editor-window">
    <div class="mvr-editor-top">
      <div class="mvr-mini-mark">M</div>
      <div><strong>Front Desk</strong><span>Your page</span></div>
      <span class="mvr-saved-pill">Saved</span>
    </div>
    <div class="mvr-editor-note">Everything here controls what guests see.</div>
    <div class="mvr-editor-field">
      <span>Property name</span>
      <strong>${a(o())}</strong>
    </div>
    <div class="mvr-editor-room">
      ${I("mvr-editor-photo")}
      <div><span>Room or unit</span><strong>${a(e.name||"Your room")}</strong></div>
      <button type="button" tabindex="-1">Edit</button>
    </div>
    <div class="mvr-editor-grid">
      <div><span>Nightly rate</span><strong>${y(k())}</strong></div>
      <div><span>Units</span><strong>${Math.max(1,Number(e.totalUnits)||1)}</strong></div>
    </div>
    <div class="mvr-edit-sync">
      <span class="mvr-sync-pulse"></span>
      Changes update your guest page
    </div>
  </div>`}function A(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${a(v().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Change rooms, photos, rates, policies and property details anytime from Front Desk.
      </div>
      <div class="mvr-segmented" role="tablist" aria-label="Booking page and editor preview">
        <button type="button" data-engine-mode="guest" class="${i==="guest"?"is-active":""}">Guest view</button>
        <button type="button" data-engine-mode="edit" class="${i==="edit"?"is-active":""}">Edit view</button>
      </div>
      ${i==="guest"?N():""}
      ${i==="guest"&&s.ready&&w()?'<button type="button" class="mvr-text-action" id="mvrExpandPreview">Open the full live preview ↗</button>':""}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${i==="guest"?T():V()}
      <div class="mvr-proof-chip">${i==="guest"?"What guests see":"What you control"}</div>
    </div>
  </section>`}function L(){const e=a(o().trim().charAt(0).toUpperCase()||"M"),t=r.activeHotelAppIcon||$(),l=t?`<img src="${a(t)}" alt="">`:`<span>${e}</span>`;return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${a(o())}</strong> while they are on your booking page, then reopen it whenever they want to book direct again.</p>
      <div class="mvr-callout">
        <strong>No App Store search.</strong>
        They scan your QR code or tap Add to Home Screen from the booking page.
      </div>
    </div>
    <div class="mvr-visual mvr-home-visual">
      <div class="mvr-home-phone">
        <div class="mvr-home-status"><span>9:41</span><span>● ●</span></div>
        <div class="mvr-home-grid">
          <div class="mvr-home-app faded"><span>☀</span><small>Weather</small></div>
          <div class="mvr-home-app faded"><span>✉</span><small>Mail</small></div>
          <div class="mvr-home-app mvr-property-app"><div>${l}</div><small>${a(o())}</small></div>
          <div class="mvr-home-app faded"><span>⌁</span><small>Maps</small></div>
        </div>
        <div class="mvr-home-dock"><span>☎</span><span>◉</span><span>▣</span></div>
      </div>
      <div class="mvr-qr-card"><div class="mvr-qr-pattern">▦</div><span>Scan once</span><strong>Book direct again</strong></div>
    </div>
  </section>`}function C(){const e=v().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${a(e)} booking</strong><small>Tomorrow · ${y(k())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${a(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">We gave it to a walk-in.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Done.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Handled by Front Desk</strong><small>Your booking page is up to date</small></div></div>
    </div>
  </section>`}function F(){const e=r.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${a(o())} is ready.`:`Marketel is ready for ${a(o())}.`}</h1>
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
  </section>`}function Y(){return n===0?A():n===1?L():n===2?C():F()}function x(){if(n===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${n>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[n]} →</button>
  </div>`}function h(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${D()}
    </header>
    <main class="mvr-main">${Y()}</main>
    ${x()}
  </div>`,q())}function G(){const e=w();if(!s.ready||!e||document.getElementById("mvrLivePreview"))return;const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <button type="button" id="mvrClosePreview">← Back to overview</button>
    <div><strong>${a(o())}</strong><span>${a(r.activeHotelDomain||"")}</span></div>
  </div>
  <iframe title="${a(o())} full booking-page preview" src="${a(e)}" sandbox="allow-scripts allow-same-origin"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),g("BookingEngineFullPreviewOpened")}function f(e){n=Math.max(0,Math.min(3,e)),P(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][n]),h(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function U(){c&&(window.clearTimeout(c),c=0),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",r.settingsTourActive=!1;try{localStorage.removeItem(p),localStorage.removeItem(u),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}M(),E(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function _(e){if(r.hotelSubscribed){U();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function q(){document.getElementById("mvrNext")?.addEventListener("click",()=>f(n+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>f(n-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",G),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>_(e.currentTarget)),document.querySelectorAll("[data-engine-mode]").forEach(e=>{e.addEventListener("click",()=>{i=e.dataset.engineMode==="edit"?"edit":"guest",i==="edit"&&g("BookingEngineEditPreviewViewed"),h()})})}async function O(){return m||typeof window.api!="function"||(m=window.api("GET","/api/crm/rooms").then(e=>(d={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},d.rooms.length&&(r.editRooms=d.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&h(),d)).catch(()=>d).finally(()=>{m=null})),m}async function R(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){s.checking=!0,s.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");s={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:s.attempts}}catch{s.checking=!1,s.reason="unreachable"}n===0&&!document.getElementById("mvrLivePreview")&&h(),!(s.ready||s.reason==="deployment-disabled")&&s.attempts<10&&document.getElementById("marketelValueReveal")&&(c=window.setTimeout(R,6e3))}}function W(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let l=0;try{l=Number.parseInt(localStorage.getItem(u)||"0",10)}catch{}if(n=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(l)?l:0)),r.hotelSubscribed&&n===3&&(n=0),i="guest",s={ready:!1,checking:!0,reason:"",attempts:0},c&&window.clearTimeout(c),c=0,!r.hotelSubscribed)try{localStorage.setItem(p,"1"),localStorage.setItem(u,String(n))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}r.settingsTourActive=!0,document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",E(!1);const b=document.createElement("div");b.id="marketelValueReveal",b.className="mvr-root",document.body.appendChild(b),h(),g("ValueRevealStarted",r.hotelSubscribed?"subscribed-replay":"pre-activation"),f(n),O(),R()}function K(){try{return localStorage.getItem(p)==="1"}catch{return!1}}function j(){try{localStorage.removeItem(p),localStorage.removeItem(u)}catch{}}const z={clearPendingMarketelValueReveal:j,hasPendingMarketelValueReveal:K,showMarketelValueReveal:W};function J(){B(z)}export{j as clearPendingMarketelValueReveal,z as default,K as hasPendingMarketelValueReveal,J as install,W as showMarketelValueReveal};
