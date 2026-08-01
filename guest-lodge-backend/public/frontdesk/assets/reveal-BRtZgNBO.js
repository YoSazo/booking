import{c as i,e as x}from"./settings-BLuc2Ylr.js";const S="marketelValueRevealPendingV1",y="marketelValueRevealStepV1";let s=0,m="guest",c=!1,p={rooms:[],rates:null},w=null,l={ready:!1,checking:!0,reason:"",attempts:0,domain:""},g=0,b=0,f=null,o=0;const M="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/46/2a/e1/462ae1c9-9347-efd0-5e99-41e7f636e3f7/phone-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",G="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/23/4c/cb/234ccbb4-e65a-bb94-f877-3d230743e9e3/safari-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg";function D(){const e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||/^10\./.test(e)||/^192\.168\./.test(e)||/^172\.(1[6-9]|2\d|3[01])\./.test(e)}function n(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function C(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:Number.isInteger(t)?0:2}).format(t):"$99"}function d(){return i.activeHotelName||"Your Property"}function A(){return p.rooms[0]||i.editRooms[0]||{name:"Your first room",totalUnits:1,images:[]}}function _(){const e=A();return e.images?.[0]?.url||e.imageUrl||""}function Y(){return p.rates?.nightly||99}function $(){if(D()&&i.activeHotelId){const a=new URL(window.location.href);return a.port="5173",a.pathname="/",a.search="",a.hash="",a.searchParams.set("hotelId",i.activeHotelId),a.searchParams.set("preview","1"),a.toString()}const e=l.domain||i.activeHotelDomain||"";if(!e)return"";const t=new URL(`https://${e}/`);return i.activeHotelId&&t.searchParams.set("hotelId",i.activeHotelId),t.searchParams.set("preview","1"),t.toString()}function O(){const e=String(l.domain||i.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"").toLowerCase();return e?e.endsWith(".bookmarketel.com")?e.replace(/\.bookmarketel\.com$/,".mktel.co"):e:`${d().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"your-property"}.mktel.co`}function q(){const e=new URL(window.location.href);return e.search="",e.hash="",i.activeHotelId&&e.searchParams.set("hotelId",i.activeHotelId),e.searchParams.set("previewEditor","1"),e.toString()}function I(e=""){const t=i.activeHotelAppIcon||_(),a=d().trim().charAt(0).toUpperCase()||"M";return t?`<img class="${e}" src="${n(t)}" alt="">`:`<span class="${e}">${n(a)}</span>`}function U(){if(!i.hotelSubscribed)try{localStorage.setItem(S,"1"),localStorage.setItem(y,String(s))}catch{}}function u(e,t=""){typeof window.api=="function"&&window.api("POST","/api/crm/value-reveal-event",{eventName:e,contentName:t}).catch(()=>{})}function z(){try{const e=new URL(window.location.href);e.searchParams.delete("welcome"),e.searchParams.delete("reveal"),window.history.replaceState({},"",e.pathname+e.search+e.hash)}catch{}}function F(e){typeof window.setNativeShellVisible=="function"&&window.setNativeShellVisible(e)}function V(e){if(e?.data?.type!=="marketel:show-guest-app")return;const t=document.getElementById("marketelValueReveal");!t||!Array.from(t.querySelectorAll("iframe")).some(r=>r.contentWindow===e.source)||(document.getElementById("mvrLivePreview")?.remove(),u("GuestAppPreviewRequestedFromBookingEngine"),E(1))}function K(){return`<div class="mvr-progress" aria-label="Marketel overview progress">
    ${["Booking page","Guest app","Front Desk",i.hotelSubscribed?"Complete":"Activate"].map((t,a)=>`<div class="mvr-progress-item ${a===s?"is-active":""} ${a<s?"is-done":""}">
      <span></span><small>${n(t)}</small>
    </div>`).join("")}
  </div>`}function W(){return l.ready?`<div class="mvr-page-status is-ready"><span>✓</span>${l.reason==="local"?"Local guest preview connected":"Your live guest page is online"}</div>`:l.reason==="deployment-disabled"?'<div class="mvr-page-status is-attention"><span>!</span>Your live page deployment needs to be re-enabled. Your saved setup is safe.</div>':`<div class="mvr-page-status"><span class="mvr-status-pulse"></span>${l.checking?"Publishing your live guest page…":"Your personalized preview is ready while the live page finishes publishing."}</div>`}function j(){const e=$();return`<div class="mvr-booking-preview-card">
    <div class="mvr-preview-browser-bar">
      <span class="mvr-preview-live"><i></i>Live</span>
      <span class="mvr-preview-address"><b></b>${n(O())}</span>
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
  </div>`}function J(){return`<section class="mvr-stage mvr-stage-booking">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">1 · Your direct booking page</div>
      <h1>Your booking page is ready.</h1>
      <p>Guests can choose <strong>${n(A().name||"a room")}</strong> and book directly in under 60 seconds.</p>
      <div class="mvr-control-proof">
        <span>And it is completely yours.</span>
        Expand the preview to see what guests see, then switch to the real editor to change your details, first room, photo and price.
      </div>
      ${W()}
    </div>
    <div class="mvr-visual mvr-visual-booking">
      ${j()}
    </div>
  </section>`}function B(e,t){return`<img class="mvr-ios-system-icon" src="${n(e)}" alt="${n(t)}">`}function Q(){return`<section class="mvr-stage mvr-stage-app">
    <div class="mvr-copy">
      <div class="mvr-eyebrow">2 · Your guest app</div>
      <h1>Stay on their Home Screen. Reach them again.</h1>
      <p>Guests install <strong>${n(d())}</strong> from your booking page. After that, they can book direct in one tap and receive notifications you send from Front Desk.</p>
      <div class="mvr-callout">
        <strong>One install. Two lasting advantages.</strong>
        A direct path back for them and a direct line from Front Desk for you.
      </div>
    </div>
    <div class="mvr-visual mvr-install-visual ${c?"is-installed":""} ${o===1?"is-slide-2":""}">
      <div class="mvr-app-carousel">
        <div class="mvr-app-carousel-viewport">
          <div class="mvr-app-carousel-track">
            <div class="mvr-app-carousel-slide mvr-app-carousel-install" aria-hidden="${o===0?"false":"true"}">
              <div class="mvr-install-demo-stage">
                <div class="mvr-install-entry">
                  <small class="mvr-install-context">On your booking page</small>
                  <div class="mvr-install-card">
                    <div class="mvr-install-property-icon">${I()}</div>
                    <div>
                      <strong>Get the ${n(d())} app</strong>
                      <span>Keep us one tap away for future stays. No app store.</span>
                    </div>
                    <button type="button" id="mvrInstallDemo" ${c?"disabled":""}>${c?"Installed ✓":"Install"}</button>
                  </div>
                  <div class="mvr-install-arrow"><span>${c?"Now on their Home Screen":"Tap Install"}</span><b>↓</b></div>
                  <div class="mvr-ios-crop">
                    <div class="mvr-ios-dock">
                      <div class="mvr-dock-icon mvr-dock-property">${I()}</div>
                      <div class="mvr-dock-icon">${B(M,"Phone")}</div>
                      <div class="mvr-dock-icon">${B(G,"Safari")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mvr-app-carousel-slide mvr-app-carousel-value" aria-hidden="${o===1?"false":"true"}">
              <div class="mvr-installed-value">
                <div class="mvr-installed-value-head">
                  <div class="mvr-installed-app-icon">${I()}</div>
                  <div>
                    <strong>From their Home Screen</strong>
                    <span>${n(d())} stays one tap away.</span>
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
        </div>
        <div class="mvr-app-carousel-controls" aria-label="Guest app demonstration">
          <button type="button" data-mvr-app-slide="0" aria-label="Show how guests install the app" ${o===0?"disabled":""}>‹</button>
          <div class="mvr-app-carousel-dots">
            <button type="button" data-mvr-app-slide="0" class="${o===0?"is-active":""}" aria-label="Installation" aria-current="${o===0?"step":"false"}"></button>
            <button type="button" data-mvr-app-slide="1" class="${o===1?"is-active":""}" aria-label="What the app unlocks" aria-current="${o===1?"step":"false"}"></button>
          </div>
          <button type="button" data-mvr-app-slide="1" aria-label="Show what the guest app unlocks" ${o===1?"disabled":""}>›</button>
        </div>
      </div>
    </div>
  </section>`}function X(){const e=A().name||"King Suite";return`<section class="mvr-stage mvr-stage-assistant">
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
        <div><span>Front Desk</span><strong>New ${n(e)} booking</strong><small>Tomorrow · ${C(Y())}</small></div>
        <b>now</b>
      </div>
      <div class="mvr-chat">
        <div class="mvr-bubble mvr-bubble-in">Is ${n(e)} still available tomorrow?</div>
        <div class="mvr-bubble mvr-bubble-out">No, a walk-in took it.</div>
        <div class="mvr-bubble mvr-bubble-in success"><strong>Handled.</strong> Tomorrow is blocked, the $1 hold was released and the guest was notified.</div>
      </div>
      <div class="mvr-handled-row"><span>✓</span><div><strong>Front Desk asks. You answer.</strong><small>Marketel handles the rest.</small></div></div>
    </div>
  </section>`}function Z(){const e=i.hotelSubscribed;return`<section class="mvr-stage mvr-stage-finale">
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
  </section>`}function ee(){return s===0?J():s===1?Q():s===2?X():Z()}function te(){if(s===3)return`<div class="mvr-footer mvr-footer-final">
      <button type="button" class="mvr-back" id="mvrBack">← Back</button>
      <div></div>
    </div>`;const e=["See how guests come back","See how Front Desk protects you","See everything you’re getting"];return`<div class="mvr-footer">
    ${s>0?'<button type="button" class="mvr-back" id="mvrBack">← Back</button>':"<span></span>"}
    <button type="button" class="mvr-primary" id="mvrNext">${e[s]} →</button>
  </div>`}function k(){const e=document.getElementById("marketelValueReveal");e&&(e.innerHTML=`<div class="mvr-shell">
    <header class="mvr-header">
      <div class="mvr-brand"><img src="/marketellogo.svg" alt="Marketel"><span>Marketel</span></div>
      ${K()}
    </header>
    <main class="mvr-main">${ee()}</main>
    ${te()}
  </div>`,ie())}function ae(){const e=$();if(!e||document.getElementById("mvrLivePreview"))return;m="guest";const t=document.createElement("div");t.id="mvrLivePreview",t.className="mvr-live-preview",t.innerHTML=`<div class="mvr-live-toolbar">
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
  <iframe title="${n(d())} live preview" src="${n(e)}" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`,document.getElementById("marketelValueReveal")?.appendChild(t),document.getElementById("mvrClosePreview")?.addEventListener("click",()=>t.remove()),t.querySelectorAll("[data-live-preview-mode]").forEach(a=>{a.addEventListener("click",()=>{const r=a.dataset.livePreviewMode==="edit"?"edit":"guest";if(r===m)return;m=r,t.querySelectorAll("[data-live-preview-mode]").forEach(L=>{L.classList.toggle("is-active",L.dataset.livePreviewMode===m)});const v=t.querySelector("iframe");v&&(v.title=m==="edit"?`${d()} Front Desk editor`:`${d()} booking-page preview`,v.src=m==="edit"?q():$()),m==="edit"&&u("BookingEngineEditPreviewViewed")})}),u("BookingEngineFullPreviewOpened")}function E(e){h(),s=Math.max(0,Math.min(3,e)),U(),u(["BookingEngineRevealViewed","GuestAppRevealViewed","AssistantRevealViewed","ActivationOfferViewed"][s]),k(),document.querySelector(".mvr-main")?.scrollTo({top:0,behavior:"auto"})}function re(){g&&(window.clearTimeout(g),g=0),h(),document.getElementById("marketelValueReveal")?.remove(),document.documentElement.classList.remove("marketel-reveal-open"),document.body.style.overflow="",window.removeEventListener("message",V),i.settingsTourActive=!1;try{localStorage.removeItem(S),localStorage.removeItem(y),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("onboardingDone","1")}catch{}z(),F(!0),typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner(),typeof window.refreshGoLiveInlineCard=="function"&&window.refreshGoLiveInlineCard()}async function se(e){if(i.hotelSubscribed){re();return}if(typeof window.goLive=="function"){e.disabled=!0,e.textContent="Opening secure checkout…",u("ActivationCtaClicked");try{await window.goLive()}finally{document.body.contains(e)&&(e.disabled=!1,e.textContent="Activate Marketel — $199/month")}}}function h(){b&&(window.clearTimeout(b),b=0),f?.disconnect(),f=null}function R(e){c=!!e;const t=document.querySelector(".mvr-install-visual");t?.classList.toggle("is-installed",c);const a=document.getElementById("mvrInstallDemo");a&&(a.textContent=c?"Installed ✓":"Install",a.disabled=c);const r=t?.querySelector(".mvr-install-arrow span");r&&(r.textContent=c?"Now on their Home Screen":"Tap Install")}function P(e,t=!1){h(),o=Number(e)===1?1:0;const a=document.querySelector(".mvr-install-visual");a&&(a.classList.toggle("is-slide-2",o===1),a.querySelectorAll(".mvr-app-carousel-slide").forEach((r,v)=>{r.setAttribute("aria-hidden",v===o?"false":"true")}),a.querySelectorAll(".mvr-app-carousel-dots button").forEach(r=>{const v=Number(r.dataset.mvrAppSlide)===o;r.classList.toggle("is-active",v),r.setAttribute("aria-current",v?"step":"false")}),a.querySelectorAll(".mvr-app-carousel-controls > button").forEach(r=>{r.disabled=Number(r.dataset.mvrAppSlide)===o}),o===1?R(!0):(R(!1),T()),t&&u(o===1?"GuestAppValueSlideViewed":"GuestAppInstallSlideReplayed"))}function N(e=!1){c||o!==0||(h(),R(!0),e&&u("GuestAppInstallDemoClicked"),b=window.setTimeout(()=>{s===1&&document.getElementById("marketelValueReveal")&&P(1,!1)},e?900:1200))}function T(){if(h(),s!==1||o!==0)return;const e=document.querySelector(".mvr-install-visual");if(!e)return;const t=()=>{b||(b=window.setTimeout(()=>{s===1&&document.getElementById("marketelValueReveal")&&(c?P(1,!1):N(!1))},c?900:1300))};"IntersectionObserver"in window?(f=new IntersectionObserver(a=>{a.some(r=>r.isIntersecting&&r.intersectionRatio>=.35)&&(f?.disconnect(),f=null,t())},{threshold:[.35]}),f.observe(e)):t()}function ie(){document.getElementById("mvrNext")?.addEventListener("click",()=>E(s+1)),document.getElementById("mvrBack")?.addEventListener("click",()=>E(s-1)),document.getElementById("mvrExpandPreview")?.addEventListener("click",ae),document.getElementById("mvrFinalCta")?.addEventListener("click",e=>se(e.currentTarget)),document.getElementById("mvrInstallDemo")?.addEventListener("click",()=>{N(!0)}),document.querySelectorAll("[data-mvr-app-slide]").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.mvrAppSlide)===1?1:0;t!==o&&P(t,!0)})}),T()}async function oe(){return w||typeof window.api!="function"||(w=window.api("GET","/api/crm/rooms").then(e=>(p={rooms:Array.isArray(e?.rooms)?e.rooms:[],rates:e?.rates||null},p.rooms.length&&(i.editRooms=p.rooms),document.getElementById("marketelValueReveal")&&!document.getElementById("mvrLivePreview")&&k(),p)).catch(()=>p).finally(()=>{w=null})),w}async function H(){if(!(typeof window.api!="function"||!document.getElementById("marketelValueReveal"))){if(D()){l={ready:!!$(),checking:!1,reason:"local",attempts:1,domain:""},s===0&&!document.getElementById("mvrLivePreview")&&k();return}l.checking=!0,l.attempts+=1;try{const e=await window.api("GET","/api/crm/booking-page-status");l={ready:!!e?.ready,checking:!1,reason:String(e?.reason||""),attempts:l.attempts,domain:String(e?.domain||"")}}catch{l.checking=!1,l.reason="unreachable"}s===0&&!document.getElementById("mvrLivePreview")&&k(),!(l.ready||l.reason==="deployment-disabled")&&l.attempts<10&&document.getElementById("marketelValueReveal")&&(g=window.setTimeout(H,6e3))}}function ne(e={}){if(document.getElementById("marketelValueReveal"))return;const t=Number(e.startAt);let a=0;try{a=Number.parseInt(localStorage.getItem(y)||"0",10)}catch{}if(s=Number.isFinite(t)?Math.max(0,Math.min(3,t)):Math.max(0,Math.min(3,Number.isFinite(a)?a:0)),i.hotelSubscribed&&s===3&&(s=0),m="guest",c=!1,o=0,l={ready:!1,checking:!0,reason:"",attempts:0,domain:""},g&&window.clearTimeout(g),g=0,h(),!i.hotelSubscribed)try{localStorage.setItem(S,"1"),localStorage.setItem(y,String(s))}catch{}try{localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep")}catch{}i.settingsTourActive=!0,window.addEventListener("message",V),document.documentElement.classList.add("marketel-reveal-open"),document.body.style.overflow="hidden",F(!1);const r=document.createElement("div");r.id="marketelValueReveal",r.className="mvr-root",document.body.appendChild(r),k(),u("ValueRevealStarted",i.hotelSubscribed?"subscribed-replay":"pre-activation"),E(s),oe(),H()}function le(){try{return localStorage.getItem(S)==="1"}catch{return!1}}function ce(){try{localStorage.removeItem(S),localStorage.removeItem(y)}catch{}}const de={clearPendingMarketelValueReveal:ce,hasPendingMarketelValueReveal:le,showMarketelValueReveal:ne};function me(){x(de)}export{ce as clearPendingMarketelValueReveal,de as default,le as hasPendingMarketelValueReveal,me as install,ne as showMarketelValueReveal};
