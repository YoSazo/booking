import{c as a,e as B}from"./settings-BVJy4Woh.js";const f="marketelValueRevealPendingV1",b="marketelValueRevealStepV1";let r=0,l="guest",u=!1,c={rooms:[],rates:null},h=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},d=0;const L="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",H="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function E(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function o(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function M(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function s(){return a.activeHotelName||"Your Property"}function k(){return c.rooms[0]||a.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function A(){const e=k();return e.images?.[0]?.url||e.imageUrl||""}function T(){return c.rates?.nightly||99}function w(){if(E()&&a.activeHotelId){const i=new URL(window.location.href);return i.port="5173",i.pathname="/",i.search="",i.hash="",i.searchParams.set("hotelId",a.activeHotelId),i.searchParams.set("preview","1"),i.toString()}const e=n.domain||a.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return a.activeHotelId&&t.searchParams.set("hotelId",a.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function D(){const e=new URL(window.location.href);return e.search="",e.hash="",a.activeHotelId&&e.searchParams.set("hotelId",a.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function I(e=""){const t=a.activeHotelAppIcon||A(),i=s().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${o(t)}" alt="">`:`<span class="${e}">${o(i)}</span>`}function N(){if(!a.hotelSubscribed)try{localStorage.setItem(f,"1"),localStorage.setItem(b,String(r))}catch{}}function p(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function V(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function P(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function x(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",a.hotelSubscribed?"Complete":"Activate"].map((t,i)=>`<div class="mvr-progress-item ${i===r?"is-active":""} ${i<r?"is-done":""}">
      <span></span><small>${o(t)}</small>
    </div>`).join("")}
  </div>`}function F(){return n.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Y(){const e=w();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <div class="mvr-preview-dots"><i></i><i></i><i></i></div>
      <span><b></b> Your direct booking page</span>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${o(s())} booking-page preview" src="${o(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview">
        <span>Open full booking page ↗</span>
        <small>See the guest experience, then switch to Edit</small>
      </button>
    </div>
  </div>`}function _(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${o(k().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Open the live preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${F()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Y()}
    </div>
  </section>`}function $(e,t){return`<img class="mvr-ios-system-icon" src="${o(e)}" alt="${o(t)}">`}function C(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${o(s())}</strong> while they are on your booking page, then reopen it whenever they want to book direct again.</p>
      <div class="mvr-callout">
        <strong>No App Store search or account.</strong>
        They tap Install on your booking page. Your property appears beside the apps they already use.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${u?"is-installed":""}">
      <div class="mvr-install-card">
        <div class="mvr-install-property-icon">${I()}</div>
        <div>
          <strong>Add ${o(s())} to your Home Screen</strong>
          <span>Book direct in one tap next time.</span>
        </div>
        <button type="button" id="mvrInstallDemo">${u?"Installed ✓":"Install"}</button>
      </div>
      <div class="mvr-install-arrow"><span>${u?"Now on their phone":"Tap Install"}</span><b>↓</b></div>
      <div class="mvr-ios-crop">
        <div class="mvr-ios-dock">
          <div class="mvr-dock-icon mvr-dock-property">${I()}</div>
          <div class="mvr-dock-icon">${$(L,"Phone")}</div>
          <div class="mvr-dock-icon">${$(H,"Safari")}</div>
        </div>
      </div>
    </div>
  </section>`}function G(){const e=k().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${o(e)} booking</strong><small>Tomorrow · ${M(T())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${o(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">We gave it to a walk-in.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Done.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Handled by Front Desk</strong><small>Your booking page is up to date</small></div></div>
    </div>
  </section>`}function U(){const e=a.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${o(s())} is ready.`:`Marketel is ready for ${o(s())}.`}</h1>
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
  </section>`}function O(){return r===0?_():r===1?C():r===2?G():U()}function q(){if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[r]} →</button>
  </div>`}function g(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${x()}
    </header>
    <main class="mvr-main">${O()}</main>
    ${q()}
  </div>`,W())}function z(){const e=w();if(!e||document.getElementById("mvrLivePreview"))return;l="guest";const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${o(s())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${o(s())} live preview" src="${o(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),t.querySelectorAll("[data-live-preview-mode]").forEach(i=>{i.addEventListener("click",()=>{const v=i.dataset.livePreviewMode==="edit"?"edit":"guest";if(v===l)return;l=v,t.querySelectorAll("[data-live-preview-mode]").forEach(S=>{S.classList.toggle("is-active",S.dataset.livePreviewMode===l)});const m=t.querySelector("iframe");m&&(m.title=l==="edit"?`${s()} Front Desk editor`:`${s()} booking-page preview`,m.src=l==="edit"?D():w()),l==="edit"&&p("BookingEngineEditPreviewViewed")})}),p("BookingEngineFullPreviewOpened")}function y(e){r=Math.max(0,Math.min(3,e)),N(),p(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),g(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function K(){d&&(window.clearTimeout(d),d=0),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",a.settingsTourActive=!1;try{localStorage.removeItem(f),localStorage.removeItem(b),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}V(),P(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function j(e){if(a.hotelSubscribed){K();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",p("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function W(){document.getElementById("mvrNext")?.addEventListener("click",()=>y(r+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>y(r-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",z),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>j(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{u||(u=!0,p("GuestAppInstallDemoClicked"),g())})}async function J(){return h||typeof window.api!="function"||(h=window.api("GET","/api/crm/rooms").then(e=>(c={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},c.rooms.length&&(a.editRooms=c.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&g(),c)).catch(()=>c).finally(()=>{h=null})),h}async function R(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(E()){n={ready:!!w(),checking:!1,reason:"local",attempts:1,domain:""},r===0&&!document.getElementById("mvrLivePreview")&&g();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")}}catch{n.checking=!1,n.reason="unreachable"}r===0&&!document.getElementById("mvrLivePreview")&&g(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&(d=window.setTimeout(R,6e3))}}function Q(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let i=0;try{i=Number.parseInt(localStorage.getItem(b)||"0",10)}catch{}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(i)?i:0)),a.hotelSubscribed&&r===3&&(r=0),l="guest",u=!1,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},d&&window.clearTimeout(d),d=0,!a.hotelSubscribed)try{localStorage.setItem(f,"1"),localStorage.setItem(b,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}a.settingsTourActive=!0,document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",P(!1);const v=document.createElement("div");v.id="marketelValueReveal",v.className="mvr-root",document.body.appendChild(v),g(),p("ValueRevealStarted",a.hotelSubscribed?"subscribed-replay":"pre-activation"),y(r),J(),R()}function X(){try{return localStorage.getItem(f)==="1"}catch{return!1}}function Z(){try{localStorage.removeItem(f),localStorage.removeItem(b)}catch{}}const ee={clearPendingMarketelValueReveal:Z,hasPendingMarketelValueReveal:X,showMarketelValueReveal:Q};function ae(){B(ee)}export{Z as clearPendingMarketelValueReveal,ee as default,X as hasPendingMarketelValueReveal,ae as install,Q as showMarketelValueReveal};
