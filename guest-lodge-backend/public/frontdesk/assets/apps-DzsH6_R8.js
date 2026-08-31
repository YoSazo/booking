import{c as n,a as J,b as X,e as ee}from"./settings-MEhrarZv.js";function c(e){return typeof window<"u"&&typeof window[e]=="function"?window[e]:null}function R(...e){return c("ensureAppsViewRendered")?.(...e)}function H(...e){return c("showFinaleMockModal")?.(...e)}function U(...e){return c("finishTourHydration")?.(...e)}function N(...e){return c("goLive")?.(...e)}function q(...e){return c("toast")?.(...e)}function te(...e){return c("appsCloseLightbox")?.(...e)}let z=[],l=0,B=!1,T=null,I=null,E=null,m=null;function oe(){if(document.getElementById("frontdeskAppsTourStyle"))return;const e=document.createElement("style");e.id="frontdeskAppsTourStyle",e.textContent=`
    #appsTourLightbox {
      -webkit-backdrop-filter: blur(2.5px);
      backdrop-filter: blur(2.5px);
      animation: appsTourOverlayIn 0.18s ease-out;
    }
    #appsTourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .apps-tour-panel {
      width: 100%;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.26);
      max-height: calc(100vh - 28px);
      overflow-y: auto;
      animation: appsTourPanelIn 0.2s ease-out;
    }
    .apps-tour-progress {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .apps-tour-count {
      font-size: 11px;
      color: #6B7D72;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .apps-tour-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .apps-tour-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .apps-tour-kicker {
      font-size: 11px;
      color: #2E7D5B;
      font-weight: 850;
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .apps-tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      letter-spacing: 0;
    }
    .apps-tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.5;
      margin: 0 0 14px;
    }
    .apps-tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .apps-tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .apps-tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .apps-tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .apps-tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .apps-tour-btn-primary {
      margin-left: auto;
      padding: 10px 18px;
      border-color: #2E7D5B;
      background: #2E7D5B;
      color: #fff;
      font-size: 14px;
      font-weight: 850;
      box-shadow: 0 8px 20px rgba(46,125,91,0.22);
    }
    @media (max-width: 420px) {
      .apps-tour-actions {
        flex-wrap: wrap;
      }
      .apps-tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @keyframes appsTourOverlayIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes appsTourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #appsTourLightbox,
      .apps-tour-panel {
        animation: none !important;
      }
      .apps-tour-fill {
        transition: none !important;
      }
    }
  `,document.head.appendChild(e)}function x(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function V(){T&&(document.removeEventListener("keydown",T),T=null)}function ie(e){V(),T=t=>{if(t.defaultPrevented)return;const o=t.target&&t.target.tagName?t.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||t.target?.isContentEditable||(t.key==="Escape"?(t.preventDefault(),e.onSkip?.()):t.key==="Enter"||t.key==="ArrowRight"?(t.preventDefault(),e.onNext?.()):t.key==="ArrowLeft"&&(t.preventDefault(),e.onBack?.()))},document.addEventListener("keydown",T)}function re(e,t){return!e||!e.isConnected||t?.noHighlight?null:(e.dataset.appsTourOrigVisibility||(e.dataset.appsTourOrigVisibility=e.style.visibility||""),m?.destroy(),m=X(e,{attribute:"data-apps-tour-spotlight-clone",zIndex:100002,hideSource:!0,prepareClone(o){o.style.boxShadow=t?.spotlightBoxShadow??"none",o.style.outline=t?.spotlightOutline??"none",o.style.outlineOffset=t?.spotlightOutlineOffset??"0",(e.classList.contains("apps-story-line")||t?.hideSpotlightBorder)&&(o.style.border="none",o.style.borderTop="none",o.style.borderTopWidth="0",o.style.paddingTop="0")}}),m?.element||null)}function j(e){const t=e||{};V(),E?.destroy(),E=null,m?.destroy(),m=null,I&&(clearTimeout(I),I=null);const o=document.getElementById("appsTourLightbox");o&&!t.keepLightbox&&o.remove();const i=document.getElementById("appsTourTooltip");i&&i.remove(),document.querySelectorAll("[data-apps-tour-spotlight-clone]").forEach(r=>r.remove()),document.querySelectorAll("[data-apps-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.appsTourOrigPosition||"",r.style.zIndex=r.dataset.appsTourOrigZIndex||"",r.style.isolation=r.dataset.appsTourOrigIsolation||"",r.style.boxShadow=r.dataset.appsTourOrigBoxShadow||"",r.style.outline=r.dataset.appsTourOrigOutline||"",r.style.outlineOffset=r.dataset.appsTourOrigOutlineOffset||"",r.style.transition=r.dataset.appsTourOrigTransition||"",r.style.visibility=r.dataset.appsTourOrigVisibility||"",r.dataset.appsTourOrigBorderTop!=null&&(r.style.borderTop=r.dataset.appsTourOrigBorderTop,r.style.paddingTop=r.dataset.appsTourOrigPaddingTop||"",delete r.dataset.appsTourOrigBorderTop,delete r.dataset.appsTourOrigPaddingTop),r.removeAttribute("data-apps-tour-highlighted"),delete r.dataset.appsTourOrigPosition,delete r.dataset.appsTourOrigZIndex,delete r.dataset.appsTourOrigIsolation,delete r.dataset.appsTourOrigBoxShadow,delete r.dataset.appsTourOrigOutline,delete r.dataset.appsTourOrigOutlineOffset,delete r.dataset.appsTourOrigTransition,delete r.dataset.appsTourOrigVisibility})}function f(e){j(),document.body.style.overflow="";const t=B;B=!1;try{const o=typeof R=="function"?R:window.ensureAppsViewRendered;typeof o=="function"&&o(!0)}catch{}if(e&&(localStorage.setItem("appsTourDone","1"),t||localStorage.getItem("settingsTourStep")==="handoff"||n.settingsTourActive)){const i=typeof H=="function"?H:window.showFinaleMockModal;if(typeof i=="function"){i();return}}}function ae(e){const t=l+e;t<0||t>=z.length||(l=t,b())}function $(){if(localStorage.setItem("appsTourDone","1"),B||localStorage.getItem("settingsTourStep")==="handoff"||n.settingsTourActive){n.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");const t=typeof U=="function"?U:window.finishTourHydration;typeof t=="function"&&t()}}function ne(){$();const e=typeof N=="function"?N:window.goLive;if(f(!1),typeof e=="function"){e();return}const t=typeof q=="function"?q:window.toast;typeof t=="function"&&t("Open Go live to activate your booking page.","error")}function b(){oe();const e=z[l];if(!e){f(!0);return}const t=z.length,o=l>=t-1,i=`${l+1} / ${t}`,r=Math.max(8,Math.min(100,Math.round((l+1)/t*100))),a=document.querySelector(e.target);if(!a){l++,b();return}j({keepLightbox:!0});let p=document.getElementById("appsTourLightbox");p||(p=document.createElement("div"),p.id="appsTourLightbox",p.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,0.42);pointer-events:auto;",document.body.appendChild(p)),e.noHighlight||(a.dataset.appsTourOrigPosition=a.style.position||"",a.dataset.appsTourOrigZIndex=a.style.zIndex||"",a.dataset.appsTourOrigIsolation=a.style.isolation||"",a.dataset.appsTourOrigBoxShadow=a.style.boxShadow||"",a.dataset.appsTourOrigOutline=a.style.outline||"",a.dataset.appsTourOrigOutlineOffset=a.style.outlineOffset||"",a.dataset.appsTourOrigTransition=a.style.transition||"",a.style.position=a.style.position||"relative",a.style.zIndex="100002",a.style.isolation="isolate",a.style.transition="box-shadow 0.18s ease, outline 0.18s ease",a.style.boxShadow=e.spotlightBoxShadow??"none",a.style.outline=e.spotlightOutline??"none",a.style.outlineOffset=e.spotlightOutlineOffset??"0",(a.classList.contains("apps-story-line")||e.hideSpotlightBorder)&&(a.dataset.appsTourOrigBorderTop=a.style.borderTop||"",a.dataset.appsTourOrigPaddingTop=a.style.paddingTop||"",a.style.borderTop="none",a.style.paddingTop="0"),a.setAttribute("data-apps-tour-highlighted","1"));const d=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,v=e.scrollBlock||"nearest",y=d?"auto":"smooth";a.scrollIntoView({behavior:y,block:v});const w=()=>{const u=document.getElementById("appsTourTooltip");u&&u.remove();const g=Math.min(370,window.innerWidth-28),G=e.primaryLabel||(o?"Done":"Next"),C=e.secondaryLabel||(o?"Not now":"Skip tour"),D=l<=0,_=e.kicker||"Guestel",s=document.createElement("div");s.id="appsTourTooltip",s.style.cssText=`position:fixed;z-index:100003;left:12px;top:14px;width:${g}px;max-width:${g}px;visibility:hidden;`,s.innerHTML=`
      <div class="apps-tour-panel" role="dialog" aria-live="polite" aria-label="${x(e.title)}">
        <div class="apps-tour-progress">
          <div class="apps-tour-count">${i}</div>
          <div class="apps-tour-track">
            <div class="apps-tour-fill" style="width:${r}%;"></div>
          </div>
        </div>
        <div class="apps-tour-kicker">${x(_)}</div>
        <div class="apps-tour-title">${x(e.title)}</div>
        <p class="apps-tour-copy">${x(e.text)}</p>
        <div class="apps-tour-actions">
          <button type="button" id="appsTourBackBtn" class="apps-tour-btn" ${D?"disabled":""}>Back</button>
          <button type="button" id="appsTourSkipBtn" class="apps-tour-btn apps-tour-btn-ghost">${x(C)}</button>
          <button type="button" id="appsTourNextBtn" class="apps-tour-btn apps-tour-btn-primary">${x(G)}</button>
        </div>
      </div>`,document.body.appendChild(s),re(a,e);const W=s.querySelector(".apps-tour-panel");E?.destroy(),E=J({tooltip:s,panel:W,target:a,anchor:a,spotlight:m,options:{preferredPlacement:e.tooltipPosition||"auto",maxWidth:g,gap:e.tooltipGap??10,autoScroll:!0,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),s.style.visibility="visible";const S=()=>{if(e.activateOnNext){ne();return}if(o){$(),f(!1),e.openGuestInstallCoachOnNext&&window.setTimeout(()=>c("appsOpenGuestInstallCoach")?.(),0);return}l++,b()},k=()=>{if(o){$(),f(!1);return}f(!0)},L=()=>{l<=0||(l--,b())};document.getElementById("appsTourNextBtn").onclick=S,document.getElementById("appsTourSkipBtn").onclick=k;const M=document.getElementById("appsTourBackBtn");M&&(M.onclick=L),ie({onNext:S,onBack:L,onSkip:k})};I=setTimeout(()=>{requestAnimationFrame(w)},d?40:320)}function se(e){const t=e&&e.replay,o=e&&e.chainFromSettingsTour;if(!t&&!o&&localStorage.getItem("appsTourDone")||document.getElementById("appsTourLightbox")||document.getElementById("appsTourTooltip"))return;te(),f(!1),B=!!o;const i=!!n.hotelSubscribed;z=!!c("isNativeFrontdeskApp")?.()||document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1"?[{target:"#tour-guest-reach",kicker:"Guestel updates",title:"Reach guests who choose to hear from you.",text:"Guests who keep your property in Guestel and allow property updates can receive a notification from you.",tooltipPosition:"above"},{target:"#tour-native-guest-share",kicker:"Invite guests",title:"Give them one Guestel link.",text:"Show the QR or copy the Guestel link. Guests can book immediately, then keep your property and stay in Guestel.",tooltipPosition:"above"},{target:"#tour-guest-icon-section",kicker:"Make it yours",title:"Choose how your property appears.",text:"Use your logo or a clear property photo for your Guestel card.",scrollBlock:"start",tooltipPosition:"below"}]:[{target:"#tour-apps-intro",kicker:"The loop",title:"One system with a clear side for you and for guests.",text:"You use Marketel Front Desk. Guests use Guestel and your direct booking experience."},{target:"#tour-apps-first",kicker:"Your side",title:"Download Marketel Front Desk.",text:"The owner app receives new-booking alerts even when the web dashboard is closed. Guests do not download this app.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-then",kicker:"Their side",title:"Guests keep your property in Guestel.",text:"They tap Add on your booking page. Guestel keeps your property, reservations, and messages together.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-apps-after",kicker:"Direct reach",title:"Send a notification to their phone whenever you want.",text:"Anyone who keeps your property in Guestel and opts into property updates becomes reachable from Marketel Front Desk.",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#tour-guest-icon-section",kicker:"One setup item",title:"Make the Guestel card feel like your property.",text:"Use a real logo or a clear property photo.",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10},{target:"#tour-apps-loop",kicker:i?"Live loop":"Activation",title:i?"This loop is on.":"Everything is ready to turn on.",text:i?"Guests book, keep your property in Guestel, receive opted-in updates, and message you. Front Desk gets the alerts.":"For $199/month, guests can book direct, keep your property in Guestel, receive opted-in updates, and message you — while Front Desk receives the alerts.",primaryLabel:i?"Done":"Activate everything — $199/month",secondaryLabel:i?"Close":"Keep exploring",activateOnNext:!i,tooltipPosition:"below",tooltipGap:8}],l=0,b()}function h(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function K(){return String(n.guestelWalletSubtitle||n.activeHotelContext?.address||"Direct booking").trim()}function Y(){const e=document.getElementById("guestelWalletSubtitleInput"),t=String(e?.value||K()).trim()||"Direct booking",o=document.getElementById("guestelWalletPreviewSubtitle");o&&(o.textContent=t);const i=document.getElementById("guestelWalletSubtitleCount");i&&(i.textContent=`${String(e?.value||"").length}/64`)}async function pe(){const e=document.getElementById("guestelWalletSubtitleInput"),t=document.getElementById("guestelWalletSubtitleSave"),o=String(e?.value||"").replace(/\s+/g," ").trim().slice(0,64);t&&(t.disabled=!0);try{const i=await api("POST","/api/crm/guestel-wallet-card",{subtitle:o});if(!i?.success)throw new Error(i?.message||"Could not save the Guestel card.");n.guestelWalletSubtitle=String(i.subtitle||"").trim(),e&&(e.value=n.guestelWalletSubtitle||String(i.fallbackSubtitle||"").trim()),Y(),toast("Guestel card updated.","success")}catch(i){toast(i?.message||"Could not save the Guestel card.","error")}finally{t&&(t.disabled=!1)}}function le(){const e=document.getElementById("edit-offer-enabled")?.checked,t=document.getElementById("edit-offer-kind")?.value==="amount"?"amount":"percent",o=Number(document.getElementById("edit-offer-value")?.value)||0,i=document.getElementById("offerPreview");if(i){if(!e||o<=0){i.textContent="Guests see their normal rate.",i.style.opacity="0.6";return}i.style.opacity="1",i.textContent=t==="amount"?`Returning guests see $${o} off per night.`:`Returning guests see ${o}% off the direct rate.`}}async function de(){const e=!!document.getElementById("edit-offer-enabled")?.checked,t=document.getElementById("edit-offer-kind")?.value==="amount"?"amount":"percent",o=Number(document.getElementById("edit-offer-value")?.value)||0;try{await api("POST","/api/crm/hotel-info",{returnOfferEnabled:e,returnOfferKind:t,returnOfferValue:o}),n.returnOfferEnabled=e,n.returnOfferKind=t,n.returnOfferValue=o,toast(e?"Returning-guest offer saved!":"Offer turned off","success")}catch{toast("Could not save offer","error")}}function P(){const e=(n.editRooms||[]).flatMap(t=>Array.isArray(t?.images)?t.images:[]).map(t=>String(t?.url||"").trim()).find(Boolean)||"";return String(n.guestelWalletImageUrl||n.guestelWalletFallbackImageUrl||e||"").trim()}function A(e){const t=document.getElementById("guestelWalletPreviewImage");if(!t)return;const o=String(e||P()).trim();t.classList.toggle("has-image",!!o),t.innerHTML=o?`<img src="${h(o)}" alt="Guestel wallet cover">`:"<span>Add a room photo</span>";const i=document.getElementById("guestelWalletImageRemove");i&&(i.hidden=!String(n.guestelWalletImageUrl||"").trim())}async function ce(e){const t=e?.files?.[0];if(!t)return;const o=document.getElementById("guestelWalletImageButton"),i=n.guestelWalletImageUrl;o&&(o.disabled=!0,o.textContent="Uploading…");const r=new FormData;r.append("image",t);try{const a=new URLSearchParams;n.activeHotelId&&a.set("hotelId",n.activeHotelId);const p=await fetch(`/api/crm/guestel-wallet-image?${a}`,{method:"POST",headers:{"x-crm-token":n.token,...isNativeFrontdeskApp()?{"x-marketel-client":"ios"}:{}},body:r}),d=await p.json();if(!p.ok||!d?.success||!d.imageUrl)throw new Error(d?.message||"Could not update the Guestel cover.");n.guestelWalletImageUrl=d.imageUrl,A(d.imageUrl),toast("Guestel cover updated.","success")}catch(a){A(i),toast(a?.message||"Could not update the Guestel cover.","error")}finally{e.value="",o&&(o.disabled=!1,o.textContent=n.guestelWalletImageUrl?"Change cover":"Choose custom cover")}}async function ue(){const e=document.getElementById("guestelWalletImageRemove");e&&(e.disabled=!0);try{const t=await api("DELETE","/api/crm/guestel-wallet-image");if(!t?.success)throw new Error(t?.message||"Could not reset the Guestel cover.");n.guestelWalletImageUrl="",A(P());const o=document.getElementById("guestelWalletImageButton");o&&(o.textContent="Choose custom cover"),toast("Guestel will use your first room photo.","success")}catch(t){toast(t?.message||"Could not reset the Guestel cover.","error")}finally{e&&(e.disabled=!1)}}function ge(e){const t=document.getElementById("appsView");if(!t)return;const o=document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1",i=(n.activeHotelId||"")+"|"+(n.activeHotelAppIcon||"")+"|"+(n.activeHotelDomain||"")+"|"+(n.guestelWalletImageUrl||"")+"|"+(n.guestelWalletFallbackImageUrl||"")+"|"+(n.guestelWalletSubtitle||"")+"|"+(o?"native-preview":"standard");e||t.dataset.appsKey!==i||!t.querySelector(".apps-page")?(Q(),t.dataset.appsKey=i):(isNativeFrontdeskApp()||o)&&F()}function Q(){const e=document.getElementById("appsView");if(!e)return;const t=n.activeHotelName||"Your Property",o=n.activeHotelDomain||"",i=o?"https://"+o:"#",r=n.activeHotelId?`https://clip.mktel.co/clip/${encodeURIComponent(n.activeHotelId)}?intent=book&ref=frontdesk-guestel`:i,a=isStandaloneApp(),p=isNativeFrontdeskApp(),d=document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1",v=p||d,y=K(),w=P(),O=!!String(n.guestelWalletImageUrl||"").trim(),u=Number(n.returnOfferValue)||0,g=n.returnOfferKind==="amount",G=n.returnOfferEnabled&&u>0?g?`Returning guests see $${u} off per night.`:`Returning guests see ${u}% off the direct rate.`:"Guests see their normal rate.",C=`
    <div class="apps-step-card" id="tour-native-guest-share">
      <div class="apps-step-title">How guests keep you in Guestel</div>
      <p class="apps-card-help">This is the property card guests save. Change its cover and short line here; Guestel reads the same saved values.</p>
      <div class="guestel-wallet-editor">
        <div class="guestel-wallet-card" aria-label="Preview of ${h(t)} in Guestel">
          <div class="guestel-wallet-cover${w?" has-image":""}" id="guestelWalletPreviewImage">${w?`<img src="${h(w)}" alt="Guestel wallet cover">`:"<span>Choose a cover photo</span>"}</div>
          <div class="guestel-wallet-copy">
            <strong>${h(t)}</strong>
            <span id="guestelWalletPreviewSubtitle">${h(y)}</span>
          </div>
        </div>
        <input type="file" id="guestelWalletImageInput" accept="image/png,image/jpeg,image/webp" hidden onchange="uploadGuestelWalletImage(this)">
        <div class="guestel-wallet-actions">
          <button type="button" id="guestelWalletImageButton" onclick="document.getElementById('guestelWalletImageInput').click()">${O?"Change cover":"Choose custom cover"}</button>
          <button type="button" id="guestelWalletImageRemove" class="quiet" onclick="resetGuestelWalletImage()"${O?"":" hidden"}>Use room photo</button>
        </div>
        <label class="guestel-wallet-label" for="guestelWalletSubtitleInput">Short line under your name</label>
        <div class="guestel-wallet-field">
          <input id="guestelWalletSubtitleInput" maxlength="64" value="${h(y)}" placeholder="Location or a short reason to book direct" oninput="updateGuestelWalletPreview()">
          <span id="guestelWalletSubtitleCount">${y.length}/64</span>
        </div>
        <button type="button" class="guestel-wallet-save" id="guestelWalletSubtitleSave" onclick="saveGuestelWalletCard()">Save Guestel card</button>
      </div>
      <div class="apps-section-divider">Returning-guest offer</div>
      <p class="apps-card-help">Give guests who already stayed a reason to book direct again. It shows on their Guestel card — you honor it at the desk.</p>
      <label class="apps-offer-toggle">
        <input type="checkbox" id="edit-offer-enabled" ${n.returnOfferEnabled?"checked":""} onchange="updateReturnOfferPreview()"> Offer a returning-guest discount
      </label>
      <div class="apps-offer-row">
        <input type="number" min="0" inputmode="numeric" id="edit-offer-value" value="${u||10}" oninput="updateReturnOfferPreview()">
        <select id="edit-offer-kind" onchange="updateReturnOfferPreview()">
          <option value="percent" ${g?"":"selected"}>% off</option>
          <option value="amount" ${g?"selected":""}>$ off / night</option>
        </select>
      </div>
      <div id="offerPreview" class="apps-offer-preview">${G}</div>
      <button type="button" class="guestel-wallet-save" onclick="saveReturnOffer()">Save offer</button>
      <div class="apps-section-divider">Invite a guest</div>
      <div style="margin:0 0 14px;padding:11px 12px;border-radius:11px;background:var(--green-pale);color:#245a40;font-size:12px;line-height:1.5;"><strong>What to say:</strong> “Scan this to book directly and keep us in Guestel.”</div>
      <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;"><i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show Guestel QR</button>
      ${r!=="#"?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;">
          <button type="button" onclick="navigator.clipboard.writeText('${r}').then(()=>toast('Guestel link copied','success'))" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Copy Guestel link</button>
          <button type="button" onclick="window.open('${r}','_blank')" style="min-height:44px;padding:11px 9px;border-radius:11px;border:1.5px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Open guest experience</button>
        </div>
        <div id="guestInstallStats" style="display:none;margin-top:14px;"></div>`:'<div id="guestInstallStats" style="display:none;"></div><div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:10px;">Booking domain is still setting up.</div>'}
    </div>`,_=`
    <div class="apps-native-title">Guestel</div>
    <p class="apps-native-lead">Guests use Guestel. You use Marketel Front Desk. Manage how <strong>${t}</strong> appears, talk to booked guests, and invite more guests from here.</p>
    ${C}
    <div id="messagesPanel"></div>
    ${guestBroadcastCardHtml({compact:!0})}`,s=!!String(n.frontdeskAppStoreUrl||"").trim(),S=v?_:`
    <section style="min-height:52vh;display:grid;place-items:center;padding:34px 0;">
      <div style="width:min(100%,430px);padding:28px 24px;border:1.5px solid var(--border);border-radius:22px;background:#fff;text-align:center;box-shadow:0 14px 40px rgba(26,43,34,.09);">
        <div style="width:58px;height:58px;display:grid;place-items:center;margin:0 auto 16px;border-radius:17px;background:var(--green-pale);color:var(--green);font-size:25px;"><i data-lucide="arrow-up-right" style="width:15px;height:15px;"></i></div>
        <div style="font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:var(--green);">Guestel tools</div>
        <h2 style="margin:7px 0 9px;color:var(--text);font-size:23px;line-height:1.18;">Manage Guestel from the owner app.</h2>
        <p style="margin:0 0 20px;color:var(--text-muted);font-size:14px;line-height:1.55;">Download Marketel Front Desk to share your Guestel QR, reply to verified guests, and send updates to guests who opt in.</p>
        <button type="button" onclick="openFrontdeskAppDownload()" ${s?"":'aria-disabled="true"'} style="width:100%;min-height:50px;border:0;border-radius:13px;background:${s?"var(--green)":"#dce8e1"};color:${s?"#fff":"#527061"};font-family:inherit;font-size:15px;font-weight:800;cursor:${s?"pointer":"default"};">${s?"Download Marketel Front Desk":"Front Desk app coming soon"}</button>
      </div>
    </section>`,k=v?"":a?"Front Desk is installed. Guests use Guestel; owners use Marketel Front Desk.":"You use Marketel Front Desk. Guests use Guestel.";e.innerHTML=`
  <style>
    .apps-page { padding:4px 0 28px; }
    .apps-native-title { font-size:24px;font-weight:800;color:var(--text);line-height:1.2;margin:2px 0 7px; }
    .apps-native-lead { margin:0 0 16px;color:var(--text-muted);font-size:14px;line-height:1.5; }
    .apps-card-help { margin:5px 0 14px;color:var(--text-muted);font-size:12px;line-height:1.5; }
    .apps-offer-toggle { display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text);margin:2px 0 10px;cursor:pointer; }
    .apps-offer-row { display:flex;gap:8px;margin-bottom:8px; }
    .apps-offer-row input { flex:0 0 92px;min-width:0;padding:11px 13px;font-size:14px;border:1.5px solid var(--border);border-radius:11px;background:#fff;outline:none;font-family:inherit; }
    .apps-offer-row select { flex:1;min-width:0;padding:11px 13px;font-size:14px;border:1.5px solid var(--border);border-radius:11px;background:#fff;font-family:inherit; }
    .apps-offer-preview { font-size:12px;color:var(--green);font-weight:700;min-height:16px;margin-bottom:10px; }
    .guestel-wallet-editor { display:grid;gap:11px;margin-top:4px; }
    .guestel-wallet-card { position:relative;aspect-ratio:1.6/1;overflow:hidden;border:1px solid rgba(34,75,52,.16);border-radius:19px;background:linear-gradient(145deg,#4e9a72,#235f46);box-shadow:0 12px 30px rgba(22,55,36,.11); }
    .guestel-wallet-card::after { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.43),rgba(0,0,0,.02) 62%);pointer-events:none; }
    .guestel-wallet-cover { position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#4e9a72,#235f46);color:rgba(255,255,255,.8);font-size:12px;font-weight:750; }
    .guestel-wallet-cover.has-image { background:#dfe8e2; }
    .guestel-wallet-cover img { position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:center center; }
    .guestel-wallet-copy { position:relative;z-index:1;display:grid;gap:3px;padding:17px 18px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5); }
    .guestel-wallet-copy strong { overflow:hidden;color:#fff;font-size:20px;font-weight:850;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-wallet-copy span { overflow:hidden;color:rgba(255,255,255,.9);font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-wallet-actions { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
    .guestel-wallet-actions button,.guestel-wallet-save { min-height:44px;border:1.5px solid var(--green);border-radius:12px;background:var(--green);color:#fff;font:800 13px/1 inherit;cursor:pointer; }
    .guestel-wallet-actions button.quiet { border-color:var(--border);background:#fff;color:var(--text); }
    .guestel-wallet-actions button[hidden] { display:none; }
    .guestel-wallet-actions button:disabled,.guestel-wallet-save:disabled { opacity:.55;cursor:wait; }
    .guestel-wallet-label { margin-top:3px;color:var(--text);font-size:11px;font-weight:800; }
    .guestel-wallet-field { position:relative; }
    .guestel-wallet-field input { width:100%;min-height:46px;padding:11px 52px 11px 13px;border:1.5px solid var(--border);border-radius:12px;background:#fff;color:var(--text);font:600 14px/1.35 inherit;box-sizing:border-box;outline:0; }
    .guestel-wallet-field input:focus { border-color:var(--green);box-shadow:0 0 0 3px rgba(46,125,91,.1); }
    .guestel-wallet-field span { position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:9px;font-weight:700; }
    .guestel-wallet-save { width:100%;min-height:48px;font-size:14px; }
    .apps-headline { font-size:20px;font-weight:800;color:var(--text);line-height:1.3;margin:0 0 8px; }
    .apps-intro { font-size:14px;color:var(--text-muted);line-height:1.55;margin:0 0 22px; }
    .apps-story { margin:0 0 22px;padding:4px 2px 2px; }
    .apps-story-kicker { font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:10px; }
    .apps-story-title { font-size:31px;font-weight:800;color:var(--text);line-height:1.08;margin:0 0 14px;letter-spacing:0; }
    .apps-story-copy { font-size:18px;color:var(--text-soft);line-height:1.45;margin:0 0 20px; }
    .apps-story-copy strong { color:var(--text);font-weight:800; }
    .apps-story-line { border-top:1.5px solid var(--border);padding:19px 0 2px; }
    .apps-story-step { font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px; }
    .apps-story-line-title { font-size:22px;font-weight:800;color:var(--text);line-height:1.16;margin:0 0 8px;letter-spacing:0; }
    .apps-story-line p { font-size:16px;color:var(--text-soft);line-height:1.48;margin:0; }
    .apps-story-actions { display:flex;flex-direction:column;gap:10px;margin-top:14px; }
    .apps-story-primary,
    .apps-story-secondary { width:100%;min-height:48px;padding:14px 16px;border-radius:12px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;text-align:center; }
    .apps-story-primary { border:none;background:var(--green);color:#fff;box-shadow:0 8px 22px rgba(46,125,91,0.24); }
    .apps-story-secondary { border:1.5px solid var(--green);background:#fff;color:var(--green); }
    .apps-story-status { display:flex;align-items:flex-start;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:13px 14px;color:#166534;font-size:13px;font-weight:700;line-height:1.45; }
    .apps-story-status-icon { width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:800; }
    .apps-story-domain-note { border:1px solid var(--border);border-radius:12px;padding:13px 14px;background:#fff;color:var(--text-muted);font-size:13px;line-height:1.45; }
    .apps-loop { display:flex;align-items:flex-start;justify-content:center;gap:14px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1.5px solid #bbf7d0;border-radius:16px;padding:18px 14px;margin:0 0 16px; }
    .apps-loop-side { flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center; }
    .apps-loop-tile { width:54px;height:54px;border-radius:14px;background:#fff;border:1px solid var(--border);box-shadow:0 4px 14px rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:8px; }
    .apps-loop-tile--guest { padding:0; }
    .apps-loop-name { font-size:13px;font-weight:800;color:var(--text);line-height:1.25;word-break:break-word; }
    .apps-loop-sub { font-size:11px;color:var(--text-muted);line-height:1.35;margin-top:3px; }
    .apps-loop-arrow { flex-shrink:0;align-self:center;font-size:22px;color:var(--green);font-weight:700;padding-top:14px; }
    .apps-step-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px; }
    .apps-section-divider { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin:24px 0 14px;padding-top:18px;border-top:1.5px solid var(--border); }
    .apps-step-card { background:var(--white);border:1.5px solid var(--border);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:var(--shadow); }
    .apps-step-title { font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px;line-height:1.35; }
    .apps-icon-card { display:flex;align-items:center;gap:14px; }
    .guestel-owner-preview { margin:-2px 0 14px;padding:12px;border:1px solid #CFE0D6;border-radius:16px;background:linear-gradient(145deg,#EAF4EE,#F8FAF9); }
    .guestel-owner-preview__bar { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--green);font-size:11px;font-weight:850;letter-spacing:.04em;text-transform:uppercase; }
    .guestel-owner-preview__bar b { color:var(--text-muted);font-size:9px;letter-spacing:.05em; }
    .guestel-owner-preview__card { min-height:78px;display:grid;grid-template-columns:54px minmax(0,1fr);align-items:center;gap:12px;padding:12px;border-radius:15px;background:#fff;box-shadow:0 8px 22px rgba(26,43,34,.11); }
    .guestel-owner-preview__image { width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:13px;background:var(--green); }
    .guestel-owner-preview__image > img,.guestel-owner-preview__image > span { width:100% !important;height:100% !important;border-radius:13px !important;object-fit:cover; }
    .guestel-owner-preview__card strong,.guestel-owner-preview__card span { display:block;min-width:0; }
    .guestel-owner-preview__card strong { overflow:hidden;color:var(--text);font-size:15px;font-weight:850;text-overflow:ellipsis;white-space:nowrap; }
    .guestel-owner-preview__card span { margin-top:4px;color:var(--text-muted);font-size:10.5px;line-height:1.35; }
    .apps-how-label { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin:22px 0 10px; }
    .apps-how-sub { font-size:12px;color:var(--text-muted);margin:0 0 12px;line-height:1.45; }
    .apps-q-list { display:flex;flex-direction:column;gap:8px;margin-bottom:20px; }
    .apps-q { display:flex;align-items:center;justify-content:space-between;width:100%;padding:15px 16px;border:none;background:var(--white);border:1.5px solid var(--border);border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;box-shadow:var(--shadow);transition:background 0.15s,border-color 0.15s; }
    .apps-q:active { background:var(--bg); border-color:var(--green); }
    .apps-q-text { flex:1;min-width:0; }
    .apps-q-title { font-size:14px;font-weight:700;color:var(--text);line-height:1.35;display:flex;flex-wrap:wrap;align-items:center;gap:6px; }
    .apps-q-hint { font-size:12px;color:var(--text-muted);margin-top:3px;line-height:1.45; }
    .apps-q-chevron { font-size:20px;color:var(--green);flex-shrink:0;margin-left:12px;line-height:1;font-weight:700; }
    .apps-q--video { border-color:#bbf7d0;background:linear-gradient(135deg,#fff 0%,#f0fdf4 100%); }
    .apps-q-media { flex-shrink:0;margin-left:12px;width:34px;height:34px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(46,125,91,0.35); }
    .apps-q-media__play { width:0;height:0;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #fff;margin-left:2px; }
    .apps-media-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:999px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #86efac;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.45px;color:#166534;line-height:1;vertical-align:middle;flex-shrink:0; }
    .apps-media-badge--light { background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.28);color:#fff; }
    .apps-media-badge--light .apps-media-badge__ring { border-color:rgba(255,255,255,0.45); }
    .apps-media-badge--light .apps-media-badge__play { background:rgba(255,255,255,0.95); }
    .apps-media-badge--light .apps-media-badge__play::after { border-color:transparent transparent transparent #166534; }
    .apps-media-badge__ring { width:16px;height:16px;border-radius:50%;border:2px solid #4ade80;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;animation:appsVideoPulse 2s ease-in-out infinite; }
    .apps-media-badge__play { width:10px;height:10px;border-radius:50%;background:#166534;display:block;position:relative;flex-shrink:0; }
    .apps-media-badge__play::after { content:'';width:0;height:0;border-style:solid;border-width:3px 0 3px 5px;border-color:transparent transparent transparent #fff;margin-left:1px; }
    .apps-media-badge__label { line-height:1; }
    .apps-video-teaser { display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 14px;border-radius:12px;border:1.5px dashed #86efac;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);color:#166534;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s,border-color 0.15s; }
    .apps-video-teaser:active { background:#dcfce7;border-color:#4ade80; }
    .apps-video-teaser__play { width:28px;height:28px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 10px rgba(46,125,91,0.35);position:relative; }
    .apps-video-teaser__play::after { content:'';width:0;height:0;border-style:solid;border-width:6px 0 6px 9px;border-color:transparent transparent transparent #fff;margin-left:2px; }
    @keyframes appsVideoPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
    .apps-step-title-row { display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px; }
    .apps-broadcast-card { background:var(--white);border:1.5px solid #CFE0D6;border-radius:18px;padding:18px;margin-bottom:16px;box-shadow:0 12px 34px rgba(26,43,34,.09); }
    .guest-reach-intro { margin-bottom:13px; }
    .guest-reach-kicker { margin-bottom:6px;color:var(--green);font-size:10px;font-weight:850;letter-spacing:.085em;text-transform:uppercase; }
    .guest-reach-title { color:var(--text);font-size:20px;font-weight:850;line-height:1.18;letter-spacing:-.01em; }
    .guest-reach-intro p { margin:7px 0 0;color:var(--text-muted);font-size:13px;line-height:1.5; }
    .guest-notification-demo { margin:0 0 14px;padding:15px 11px 11px;border-radius:16px;background:linear-gradient(145deg,#BFD2C7,#E7ECE9);overflow:hidden; }
    .guest-notification-shell { padding:12px 13px 13px;border:1px solid rgba(255,255,255,.66);border-radius:20px;background:rgba(246,248,247,.9);box-shadow:0 8px 24px rgba(20,40,29,.16),inset 0 1px 0 rgba(255,255,255,.84);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;font-synthesis:none;font-kerning:normal;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-backdrop-filter:saturate(1.35) blur(18px);backdrop-filter:saturate(1.35) blur(18px); }
    .guest-notification-meta { min-width:0;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;color:rgba(60,60,67,.6);font-size:11px;font-weight:400;line-height:1;letter-spacing:-.01em; }
    .guest-notification-meta strong { overflow:hidden;color:rgba(60,60,67,.72);font-size:11px;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-meta > span:last-child { color:rgba(60,60,67,.55);font-weight:400; }
    .guest-notification-icon { width:28px;height:28px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(60,60,67,.12);border-radius:7px;background:#fff;color:#fff;font-size:12px;font-weight:700;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.08); }
    .guest-notification-icon img { width:100%;height:100%;display:block;padding:1px;border-radius:6px;background:#fff;object-fit:contain;box-sizing:border-box; }
    .guest-notification-icon span { width:100%;height:100%;display:grid;place-items:center;background:var(--green); }
    .guest-notification-title { margin-top:9px;overflow:hidden;color:#111;font-size:15px;font-weight:600;line-height:1.22;letter-spacing:-.012em;text-overflow:ellipsis;white-space:nowrap; }
    .guest-notification-body { min-height:36px;margin-top:2px;overflow:hidden;color:rgba(0,0,0,.78);font-size:14px;font-weight:400;line-height:1.28;letter-spacing:-.008em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2; }
    .guest-notification-caption { margin-top:8px;color:#526158;font-size:10px;font-weight:700;text-align:center; }
    .guest-reach-suggestion { margin:-2px 0 12px;padding:0;border:0;background:none;color:var(--green);font:inherit;font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer; }
    .guest-reach-video { width:100%;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;padding:8px;border:0;background:none;color:var(--green);font:inherit;font-size:11px;font-weight:750;cursor:pointer; }
    .guest-reach-video span { width:21px;height:21px;display:grid;place-items:center;padding-left:1px;border-radius:50%;background:#E6F2EB;color:var(--green);font-size:8px; }
    .apps-footnote { font-size:11px;color:var(--text-muted);text-align:center;margin-top:14px;line-height:1.5; }
    .apps-tour-replay { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--border);background:var(--white);color:var(--green);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:18px;box-shadow:var(--shadow); }
    .apps-tour-replay:active { background:var(--bg); }
    .apps-install-coach-trigger { width:100%;min-height:60px;display:grid;grid-template-columns:38px 1fr 16px;align-items:center;gap:10px;margin-top:13px;padding:9px 12px;border:1.5px solid #CFE0D6;border-radius:13px;background:#F4F9F6;color:var(--text);font:inherit;text-align:left;cursor:pointer; }
    .apps-install-coach-trigger:active { background:#EAF3EE; }
    .apps-install-coach-trigger__icon { width:34px;height:34px;display:grid;place-items:center;color:var(--green); }
    .apps-install-coach-trigger__icon svg { width:20px;height:25px;display:block;fill:currentColor;overflow:visible; }
    .apps-install-coach-trigger strong,.apps-install-coach-trigger small { display:block; }
    .apps-install-coach-trigger strong { font-size:13px;line-height:1.3;font-weight:800; }
    .apps-install-coach-trigger small { margin-top:3px;color:var(--text-muted);font-size:10.5px;line-height:1.35;font-weight:500; }
    .apps-install-coach-trigger > b { color:var(--green);font-size:20px;font-weight:500; }
    .apps-fold { border:1.5px solid var(--border);border-radius:14px;margin-bottom:12px;background:var(--white);box-shadow:var(--shadow);overflow:hidden; }
    .apps-fold-summary { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;cursor:pointer;font-family:inherit;list-style:none; }
    .apps-fold-summary::-webkit-details-marker { display:none; }
    .apps-fold-title { font-size:14px;font-weight:800;color:var(--text);line-height:1.3; }
    .apps-fold-meta { font-size:11px;color:var(--text-muted);margin-top:2px;font-weight:500; }
    .apps-fold-chevron { font-size:18px;color:var(--green);flex-shrink:0;transition:transform 0.2s;line-height:1; }
    .apps-fold[open] .apps-fold-chevron { transform:rotate(90deg); }
    .apps-fold-body { padding:0 16px 16px;border-top:1px solid var(--border); }
    .apps-fold-body .apps-q-list { margin-top:12px;margin-bottom:0; }
    .apps-fold-body .apps-how-sub { margin-top:12px;margin-bottom:0; }
    @media (min-width: 768px) {
      .apps-story { padding-top:6px; }
      .apps-story-title { font-size:38px;max-width:760px; }
      .apps-story-copy { font-size:19px;max-width:720px; }
      .apps-story-line { padding-top:22px; }
      .apps-story-line-title { font-size:25px;max-width:720px; }
      .apps-story-line p { font-size:17px;max-width:720px; }
      .apps-story-actions { max-width:360px; }
    }
  </style>

  <div class="apps-page">

    ${S}

    ${k?`<p class="apps-footnote">${k}</p>`:""}

  </div>`,typeof lucide<"u"&&lucide.createIcons(),v&&(n.guestMessages.length?renderMessages():loadMessages(),F(),Z())}async function Z(){try{const e=await api("GET","/api/crm/booking-review-settings");if(!e?.success||!e.data)return;n.bookingReviewSettings=e.data;const t=document.getElementById("bookingReviewReminderSelect");t&&(t.value=String(e.data.reminderMinutes))}catch{}}async function fe(e){const t=String(n.bookingReviewSettings?.reminderMinutes??15),o=parseInt(e?.value,10);if([0,15,30,60].includes(o)){e&&(e.disabled=!0);try{const i=await api("POST","/api/crm/booking-review-settings",{reminderMinutes:o});if(!i?.success)throw new Error(i?.message||"Could not save reminder timing.");n.bookingReviewSettings=i.data,toast(o===0?"Booking reminders off — the first alert will still arrive.":`Booking reminders set for every ${o===60?"hour":o+" minutes"}.`,"success")}catch(i){e&&(e.value=t),toast(i?.message||"Could not save reminder timing.","error")}finally{e&&(e.disabled=!1)}}}async function F(){const e=document.getElementById("guestInstallStats");try{const t=await api("GET","/api/crm/guest-install-stats");if(!t.success)throw new Error(t.message||"Failed");if(n.guestPushSubscriberCount=t.guestPushSubscribers??0,applyGuestBroadcastAudienceUi(),!e)return;const o=t.totals||{},i=o.notification_prompts||0,r=t.guestPushSubscribers||0,a=t.guestelSavedDevices||0,p=t.guestelBroadcastSubscribers||0;if(!t.guestelSavedDevices&&!t.guestelBroadcastSubscribers){e.style.display="none",e.innerHTML="";return}e.style.display="block",e.innerHTML='<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Guestel activity</div><div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+a+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">devices keeping your property</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+p+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Guestel devices opted into updates</div></div><div style="flex:1;min-width:80px;background:var(--bg);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:var(--text);">'+r+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">total reachable devices</div></div></div>'+(i?'<div style="font-size:11px;color:var(--text-muted);margin:-2px 0 10px;">Notification permission: '+(o.notification_granted||0)+" granted · "+(o.notification_denied||0)+" denied · "+(o.notification_dismissed||0)+" dismissed · "+(o.notification_failed||0)+" failed</div>":"")}catch{n.guestPushSubscriberCount=0,applyGuestBroadcastAudienceUi(),e&&(e.style.display="none",e.innerHTML="")}}const xe={appsTourClose:f,appsTourNav:ae,appsTourRender:b,ensureAppsViewRendered:ge,loadBookingReviewSettings:Z,loadGuestInstallStats:F,renderAppsView:Q,resetGuestelWalletImage:ue,saveBookingReviewReminderSetting:fe,saveGuestelWalletCard:pe,saveReturnOffer:de,startAppsTour:se,updateReturnOfferPreview:le,updateGuestelWalletPreview:Y,uploadGuestelWalletImage:ce};function me(){ee(xe)}export{xe as default,me as install};
