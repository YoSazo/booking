import{c as i,e as T}from"./settings-DSYMW-tA.js";const y="marketelValueRevealPendingV1",b="marketelValueRevealStepV1";let r=0,m="guest",v=!1,u={rooms:[],rates:null},h=null,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},p=0,s=0,c=null;function R(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function n(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function A(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function d(){return i.activeHotelName||"Your Property"}function E(){return u.rooms[0]||i.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function F(){const e=E();return e.images?.[0]?.url||e.imageUrl||""}function M(){return u.rates?.nightly||99}function k(){if(R()&&i.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",i.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=o.domain||i.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return i.activeHotelId&&t.searchParams.set("hotelId",i.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function V(){const e=String(o.domain||i.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${d().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function H(){const e=new URL(window.location.href);return e.search="",e.hash="",i.activeHotelId&&e.searchParams.set("hotelId",i.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function I(e=""){const t=i.activeHotelAppIcon||F(),a=d().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${n(t)}" alt="">`:`<span class="${e}">${n(a)}</span>`}function x(){if(!i.hotelSubscribed)try{localStorage.setItem(y,"1"),localStorage.setItem(b,String(r))}catch{}}function g(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function N(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function P(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function B(e){if(e?.data?.type!=="marketel:show-guest-app")return;const t=document.getElementById("marketelValueReveal");!t||!Array.from(t.querySelectorAll("iframe")).some(l=>l.contentWindow===e.source)||(document.getElementById("mvrLivePreview")?.remove(),g("GuestAppPreviewRequestedFromBookingEngine"),S(1))}function C(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",i.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===r?"is-active":""} ${a<r?"is-done":""}">
      <span></span><small>${n(t)}</small>
    </div>`).join("")}
  </div>`}function G(){return o.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${o.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:o.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${o.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function Y(){const e=k();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${n(V())}</span>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-preview-teaser">
      ${e?`<iframe title="${n(d())} booking-page preview" src="${n(e)}" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`:'<div class="mvr-preview-teaser-fallback"><strong>Your booking page</strong><span>Personalized preview publishing…</span></div>'}
      <div class="mvr-preview-teaser-veil" aria-hidden="true"></div>
      <button type="button" id="mvrExpandPreview" aria-label="Expand your booking page preview">
        <span class="mvr-expand-cue" aria-hidden="true"><i>←</i><strong>Expand</strong><i>→</i></span>
        <small>See the full page right here</small>
      </button>
    </div>
  </div>`}function U(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${n(E().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${G()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${Y()}
    </div>
  </section>`}function _(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${n(d())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${v?"is-installed":""}">
      <div class="mvr-install-demo-stage">
        <div class="mvr-install-entry">
          <div class="mvr-install-card">
            <div class="mvr-install-property-icon">${I()}</div>
            <div>
              <strong>Get the ${n(d())} app</strong>
              <span>Keep us one tap away for future stays. No app store.</span>
            </div>
            <button type="button" id="mvrInstallDemo" ${v?"disabled":""}>${v?"Installed ✓":"Install"}</button>
          </div>
          <small class="mvr-install-context">The same Install button guests see on your booking page.</small>
        </div>
        <div class="mvr-installed-value" aria-hidden="${v?"false":"true"}">
          <div class="mvr-installed-value-head">
            <div class="mvr-installed-app-icon">${I()}</div>
            <div>
              <strong>${n(d())} is now on their Home Screen</strong>
              <span>No App Store search or account.</span>
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
              <span class="mvr-app-push-icon">${I()}</span>
              <strong>${n(d())}</strong>
              <span>now</span>
            </div>
            <div class="mvr-app-push-title">Summer dates are open</div>
            <div class="mvr-app-push-body">Tap to see availability and book direct.</div>
          </div>
          <div class="mvr-app-push-foot">Sent from Front Desk → delivered to their phone</div>
        </div>
      </div>
    </div>
  </section>`}function q(){const e=E().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${n(e)} booking</strong><small>Tomorrow · ${A(M())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${n(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function O(){const e=i.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
    <div class="mvr-finale-card">
      <div class="mvr-finale-mark">✓</div>
      <div class="mvr-eyebrow">${e?"Your Marketel system":"Ready to activate"}</div>
      <h1>${e?`${n(d())} is ready.`:`Marketel is ready for ${n(d())}.`}</h1>
      <p>${e?"Your direct booking page, guest app and Front Desk work together as one system.":"Turn on the system you just saw and finish making it yours."}</p>
      <div class="mvr-value-list">
        <div><span>✓</span><p><strong>Editable direct booking page</strong><small>Rooms, photos, prices, policies and branding</small></p></div>
        <div><span>✓</span><p><strong>Your guest Home Screen app</strong><small>Book direct again and receive notifications from Front Desk</small></p></div>
        <div><span>✓</span><p><strong>Front Desk and Assistant</strong><small>Keep outside changes from becoming surprises</small></p></div>
      </div>
      ${e?"":`<div class="mvr-price"><strong>$199</strong><span>/month</span></div>
        <div class="mvr-guarantee"><span>7</span><p><strong>Seven-day money-back guarantee</strong><small>Try the complete system. Cancel anytime—no contract.</small></p></div>`}
      <button type="button" class="mvr-primary mvr-final-cta" id="mvrFinalCta">
        ${e?"Open Front Desk":"Activate Marketel — $199/month"}
      </button>
      <div class="mvr-secure-note">${e?"You can replay this overview anytime from How it works.":'Secure checkout powered by Stripe · <a href="/terms" target="_blank" rel="noopener">Guarantee terms</a>'}</div>
    </div>
  </section>`}function K(){return r===0?U():r===1?_():r===2?q():O()}function W(){if(r===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${r>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[r]} →</button>
  </div>`}function w(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${C()}
    </header>
    <main class="mvr-main">${K()}</main>
    ${W()}
  </div>`,X())}function z(){const e=k();if(!e||document.getElementById("mvrLivePreview"))return;m="guest";const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
    <div class="mvr-live-topline">
      <button type="button" id="mvrClosePreview">← Back to overview</button>
      <div class="mvr-live-title"><strong>${n(d())}</strong><span>Live preview · changes in Edit save for real</span></div>
      <i aria-hidden="true"></i>
    </div>
    <div class="mvr-live-switch" role="tablist" aria-label="Guest page and editor">
      <button type="button" data-live-preview-mode="guest" class="is-active">Guest booking page</button>
      <button type="button" data-live-preview-mode="edit">Edit in Front Desk</button>
    </div>
  </div>
  <iframe title="${n(d())} live preview" src="${n(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),t.querySelectorAll("[data-live-preview-mode]").forEach(a=>{a.addEventListener("click",()=>{const l=a.dataset.livePreviewMode==="edit"?"edit":"guest";if(l===m)return;m=l,t.querySelectorAll("[data-live-preview-mode]").forEach($=>{$.classList.toggle("is-active",$.dataset.livePreviewMode===m)});const f=t.querySelector("iframe");f&&(f.title=m==="edit"?`${d()} Front Desk editor`:`${d()} booking-page preview`,f.src=m==="edit"?H():k()),m==="edit"&&g("BookingEngineEditPreviewViewed")})}),g("BookingEngineFullPreviewOpened")}function S(e){s&&(window.clearTimeout(s),s=0),c?.disconnect(),c=null,r=Math.max(0,Math.min(3,e)),x(),g(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][r]),w(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function j(){p&&(window.clearTimeout(p),p=0),s&&(window.clearTimeout(s),s=0),c?.disconnect(),c=null,document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",B),i.settingsTourActive=!1;try{localStorage.removeItem(y),localStorage.removeItem(b),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}N(),P(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function J(e){if(i.hotelSubscribed){j();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",g("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function D(e=!1){if(v)return;v=!0,s&&(window.clearTimeout(s),s=0),c?.disconnect(),c=null;const t=document.querySelector(".mvr-install-visual");t?.classList.add("is-installed");const a=t?.querySelector(".mvr-installed-value");a&&a.setAttribute("aria-hidden","false");const l=document.getElementById("mvrInstallDemo");l&&(l.textContent="Installed ✓",l.disabled=!0),e&&g("GuestAppInstallDemoClicked")}function Q(){if(s&&window.clearTimeout(s),s=0,c?.disconnect(),c=null,r!==1||v)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{s||v||(s=window.setTimeout(()=>{r===1&&document.getElementById("marketelValueReveal")&&D(!1)},1600))};"IntersectionObserver"in window?(c=new IntersectionObserver(a=>{a.some(l=>l.isIntersecting&&l.intersectionRatio>=.35)&&(c?.disconnect(),c=null,t())},{threshold:[.35]}),c.observe(e)):t()}function X(){document.getElementById("mvrNext")?.addEventListener("click",()=>S(r+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>S(r-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",z),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>J(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{D(!0)}),Q()}async function Z(){return h||typeof window.api!="function"||(h=window.api("GET","/api/crm/rooms").then(e=>(u={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},u.rooms.length&&(i.editRooms=u.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&w(),u)).catch(()=>u).finally(()=>{h=null})),h}async function L(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(R()){o={ready:!!k(),checking:!1,reason:"local",attempts:1,domain:""},r===0&&!document.getElementById("mvrLivePreview")&&w();return}o.checking=!0,o.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");o={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:o.attempts,domain:String(e?.domain||"")}}catch{o.checking=!1,o.reason="unreachable"}r===0&&!document.getElementById("mvrLivePreview")&&w(),!(o.ready||o.reason==="deployment-disabled")&&o.attempts<10&&document.getElementById("marketelValueReveal")&&(p=window.setTimeout(L,6e3))}}function ee(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(b)||"0",10)}catch{}if(r=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),i.hotelSubscribed&&r===3&&(r=0),m="guest",v=!1,o={ready:!1,checking:!0,reason:"",attempts:0,domain:""},p&&window.clearTimeout(p),p=0,s&&window.clearTimeout(s),s=0,c?.disconnect(),c=null,!i.hotelSubscribed)try{localStorage.setItem(y,"1"),localStorage.setItem(b,String(r))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}i.settingsTourActive=!0,window.addEventListener("message",B),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",P(!1);const l=document.createElement("div");l.id="marketelValueReveal",l.className="mvr-root",document.body.appendChild(l),w(),g("ValueRevealStarted",i.hotelSubscribed?"subscribed-replay":"pre-activation"),S(r),Z(),L()}function te(){try{return localStorage.getItem(y)==="1"}catch{return!1}}function ae(){try{localStorage.removeItem(y),localStorage.removeItem(b)}catch{}}const re={clearPendingMarketelValueReveal:ae,hasPendingMarketelValueReveal:te,showMarketelValueReveal:ee};function ne(){T(re)}export{ae as clearPendingMarketelValueReveal,re as default,te as hasPendingMarketelValueReveal,ne as install,ee as showMarketelValueReveal};
