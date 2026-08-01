import{c as a,e as B}from"./settings-DSYMW-tA.js";const b="marketelValueRevealPendingV1",f="marketelValueRevealStepV1";let o=0,c="guest",p=!1,d={rooms:[],rates:null},h=null,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},m=0;const D="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",A="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function E(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function i(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function H(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function s(){return a.activeHotelName||"Your Property"}function k(){return d.rooms[0]||a.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function M(){const e=k();return e.images?.[0]?.url||e.imageUrl||""}function F(){return d.rates?.nightly||99}function w(){if(E()&&a.activeHotelId){const r=new URL(window.location.href);return r.port="5173",r.pathname="/",r.search="",r.hash="",r.searchParams.set("hotelId",a.activeHotelId),r.searchParams.set("preview","1"),r.toString()}const e=n.domain||a.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return a.activeHotelId&&t.searchParams.set("hotelId",a.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function x(){const e=String(n.domain||a.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${s().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function N(){const e=new URL(window.location.href);return e.search="",e.hash="",a.activeHotelId&&e.searchParams.set("hotelId",a.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function I(e=""){const t=a.activeHotelAppIcon||M(),r=s().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${i(t)}" alt="">`:`<span class="${e}">${i(r)}</span>`}function T(){if(!a.hotelSubscribed)try{localStorage.setItem(b,"1"),localStorage.setItem(f,String(o))}catch{}}function v(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function V(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function P(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function R(e){if(e?.data?.type!=="marketel:show-guest-app")return;const t=document.getElementById("marketelValueReveal");!t||!Array.from(t.querySelectorAll("iframe")).some(l=>l.contentWindow===e.source)||(document.getElementById("mvrLivePreview")?.remove(),v("GuestAppPreviewRequestedFromBookingEngine"),y(1))}function C(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",a.hotelSubscribed?"Complete":"Activate"].map((t,r)=>`<div class="mvr-progress-item ${r===o?"is-active":""} ${r<o?"is-done":""}">
      <span></span><small>${i(t)}</small>
    </div>`).join("")}
  </div>`}function _(){return n.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${n.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:n.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${n.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Y(){const e=w();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${i(x())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${i(s())} booking-page preview" src="${i(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
    </div>
  </div>`}function G(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${i(k().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${_()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Y()}
    </div>
  </section>`}function $(e,t){return`<img class="mvr-ios-system-icon" src="${i(e)}" alt="${i(t)}">`}function U(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on your guests’ Home Screens.</h1>
      <p>Guests can save <strong>${i(s())}</strong> while they are on your booking page, return to book direct again, and receive your updates if they turn on notifications.</p>
      <div class="mvr-callout">
        <strong>No App Store search or account.</strong>
        They tap Install on your booking page. Your property appears beside the apps they already use.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${p?"is-installed":""}">
      <div class="mvr-install-card">
        <div class="mvr-install-property-icon">${I()}</div>
        <div>
          <strong>Add ${i(s())} to your Home Screen</strong>
          <span>Book direct in one tap next time.</span>
        </div>
        <button type="button" id="mvrInstallDemo">${p?"Installed ✓":"Install"}</button>
      </div>
      <div class="mvr-install-arrow"><span>${p?"Now on their phone":"Tap Install"}</span><b>↓</b></div>
      <div class="mvr-ios-crop">
        <div class="mvr-ios-dock">
          <div class="mvr-dock-icon mvr-dock-property">${I()}</div>
          <div class="mvr-dock-icon">${$(D,"Phone")}</div>
          <div class="mvr-dock-icon">${$(A,"Safari")}</div>
        </div>
      </div>
    </div>
  </section>`}function O(){const e=k().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${i(e)} booking</strong><small>Tomorrow · ${H(F())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${i(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function q(){const e=a.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${i(s())} is ready.`:`Marketel is ready for ${i(s())}.`}</h1>
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
  </section>`}function z(){return o===0?G():o===1?U():o===2?O():q()}function K(){if(o===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${o>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[o]} →</button>
  </div>`}function g(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${C()}
    </header>
    <main class="mvr-main">${z()}</main>
    ${K()}
  </div>`,Q())}function W(){const e=w();if(!e||document.getElementById("mvrLivePreview"))return;c="guest";const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${i(s())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${i(s())} live preview" src="${i(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),t.querySelectorAll("[data-live-preview-mode]").forEach(r=>{r.addEventListener("click",()=>{const l=r.dataset.livePreviewMode==="edit"?"edit":"guest";if(l===c)return;c=l,t.querySelectorAll("[data-live-preview-mode]").forEach(S=>{S.classList.toggle("is-active",S.dataset.livePreviewMode===c)});const u=t.querySelector("iframe");u&&(u.title=c==="edit"?`${s()} Front Desk editor`:`${s()} booking-page preview`,u.src=c==="edit"?N():w()),c==="edit"&&v("BookingEngineEditPreviewViewed")})}),v("BookingEngineFullPreviewOpened")}function y(e){o=Math.max(0,Math.min(3,e)),T(),v(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][o]),g(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function j(){m&&(window.clearTimeout(m),m=0),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",R),a.settingsTourActive=!1;try{localStorage.removeItem(b),localStorage.removeItem(f),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}V(),P(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function J(e){if(a.hotelSubscribed){j();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",v("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function Q(){document.getElementById("mvrNext")?.addEventListener("click",()=>y(o+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>y(o-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",W),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>J(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{p||(p=!0,v("GuestAppInstallDemoClicked"),g())})}async function X(){return h||typeof window.api!="function"||(h=window.api("GET","/api/crm/rooms").then(e=>(d={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},d.rooms.length&&(a.editRooms=d.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&g(),d)).catch(()=>d).finally(()=>{h=null})),h}async function L(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(E()){n={ready:!!w(),checking:!1,reason:"local",attempts:1,domain:""},o===0&&!document.getElementById("mvrLivePreview")&&g();return}n.checking=!0,n.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");n={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:n.attempts,domain:String(e?.domain||"")}}catch{n.checking=!1,n.reason="unreachable"}o===0&&!document.getElementById("mvrLivePreview")&&g(),!(n.ready||n.reason==="deployment-disabled")&&n.attempts<10&&document.getElementById("marketelValueReveal")&&(m=window.setTimeout(L,6e3))}}function Z(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let r=0;try{r=Number.parseInt(localStorage.getItem(f)||"0",10)}catch{}if(o=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(r)?r:0)),a.hotelSubscribed&&o===3&&(o=0),c="guest",p=!1,n={ready:!1,checking:!0,reason:"",attempts:0,domain:""},m&&window.clearTimeout(m),m=0,!a.hotelSubscribed)try{localStorage.setItem(b,"1"),localStorage.setItem(f,String(o))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}a.settingsTourActive=!0,window.addEventListener("message",R),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",P(!1);const l=document.createElement("div");l.id="marketelValueReveal",l.className="mvr-root",document.body.appendChild(l),g(),v("ValueRevealStarted",a.hotelSubscribed?"subscribed-replay":"pre-activation"),y(o),X(),L()}function ee(){try{return localStorage.getItem(b)==="1"}catch{return!1}}function te(){try{localStorage.removeItem(b),localStorage.removeItem(f)}catch{}}const ae={clearPendingMarketelValueReveal:te,hasPendingMarketelValueReveal:ee,showMarketelValueReveal:Z};function oe(){B(ae)}export{te as clearPendingMarketelValueReveal,ae as default,ee as hasPendingMarketelValueReveal,oe as install,Z as showMarketelValueReveal};
