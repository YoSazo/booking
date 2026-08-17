import{e as L,c as i}from"./settings-D95_0fBc.js";let E=!1,m=null;const q=12e3;function l(t,e,a){return typeof window.api!="function"?Promise.reject(new Error("Front Desk is not ready.")):window.api(t,e,a)}function c(t,e="info"){typeof window.toast=="function"&&window.toast(t,e)}function D(t){if(typeof window.setNativeShellVisible=="function"){window.setNativeShellVisible(t);return}try{window.webkit?.messageHandlers?.marketelShell?.postMessage({type:"visibility",visible:!!t})}catch{}}function P(t,e,a){let n=null;const s=new Promise((d,r)=>{n=setTimeout(()=>r(new Error(a)),e)});return Promise.race([t,s]).finally(()=>clearTimeout(n))}function o(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function w(t){return JSON.stringify(String(t??"")).replace(/</g,"\\u003c")}function I(){return(i.assistantData?.recipients||[]).filter(t=>t.active)}function $(){return I().filter(t=>t.verified)}function N(){return!!i.assistantData?.hotel?.subscribed||!!i.isMasterPin}function F(){return typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()}function O(){const t=[i.editRooms,i.manualAvailability?.rooms];for(const e of t){if(!Array.isArray(e))continue;const a=String(e[0]?.name||"").trim();if(a)return a}return"Queen Room"}function H(){if(i.assistantData?.latestResult)return i.assistantData.latestResult;const t=new Set(["availability_update","booking_decision","availability_warning"]);return(i.assistantData?.activities||[]).find(e=>t.has(String(e?.type||"")))||null}function j(t){const e=new Date(t||0).getTime();if(!Number.isFinite(e)||e<=0)return"Saved in Assistant activity";const a=Math.max(0,Math.floor((Date.now()-e)/6e4));if(a<1)return"Just now";if(a<60)return`${a} min ago`;const n=Math.floor(a/60);if(n<24)return`${n} hr${n===1?"":"s"} ago`;const s=Math.floor(n/24);return s<7?`${s} day${s===1?"":"s"} ago`:S(t)}function _(){if(!(typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()))return"";const e=String(i.nativeNotificationState||""),a=e==="registered",n=e==="authorized",s=e==="unavailable";return`<div class="fda-section">
    <div class="fda-section-title">${a?"Booking alerts are on":n?"Connecting this iPhone":s?"Booking alerts need attention":"Turn on booking alerts"}</div>
    <div class="fda-section-sub">${a?"This iPhone can receive new-booking and room-check alerts even when Front Desk is closed.":n?"Notification access is allowed. Refresh once to finish connecting this iPhone.":s?"Front Desk could not register this iPhone for alerts. Check notification settings, then refresh.":"Allow notifications so Front Desk can warn you when a booking or room check needs attention."}</div>
    ${a?'<button type="button" class="fda-btn secondary full" onclick="toggleAppNotifications()">Send a test booking alert</button>':n?'<button type="button" class="fda-btn primary full" onclick="window.location.reload()">Finish connecting</button>':'<button type="button" class="fda-btn primary full" onclick="openNativeNotificationSettings()">Open iPhone notification settings</button>'}
  </div>`}function S(t,e={}){if(!t)return"";const a=new Date(t);if(!Number.isFinite(a.getTime()))return"";const n=Date.now(),s=Math.round((a.getTime()-n)/6e4);if(e.relative&&s>0&&s<60)return`in ${s} min`;if(e.relative&&s>=60&&s<1440){const d=Math.round(s/60);return`in ${d} hr${d===1?"":"s"}`}return a.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}function V(t){return{smart:"Evening availability check","2h":"Every 2 hours","4h":"Every 4 hours",daily:"Once daily",booking_only:"New bookings only",off:"No check-ins"}[t]||"Smart daily check"}function C(t){const e=String(t||"").match(/^(\d{1,2}):(\d{2})$/);if(!e)return"Not set";const a=Number(e[1]);if(!Number.isInteger(a)||a<0||a>23)return"Not set";const n=a>=12?"PM":"AM";return`${a%12||12}:${e[2]} ${n}`}function A(t,e,a=""){const n=o(e||"");return`<div class="fda-time-control${a?" is-disabled":""}">
    <span class="fda-time-value">${o(C(e))}</span>
    <input id="${o(t)}" type="time" value="${n}" ${a} oninput="updateAssistantTimeDisplay(this)">
  </div>`}function T(){if(document.getElementById("frontDeskAssistantStyles"))return;const t=document.createElement("style");t.id="frontDeskAssistantStyles",t.textContent=`
    .fda-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#173b2d 0%,#21523e 100%);border-radius:17px;padding:17px 18px;margin:0 0 14px;color:#fff;box-shadow:0 8px 24px rgba(23,59,45,.13);}
    .fda-card::after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;right:-58px;top:-80px;background:rgba(255,255,255,.08);}
    .fda-card.is-off{background:#fff;color:#1a2b22;border:1.5px solid #dce7e0;box-shadow:0 3px 14px rgba(26,43,34,.05);}
    .fda-card-row{position:relative;z-index:1;display:flex;align-items:center;gap:13px;}
    .fda-card-icon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:rgba(255,255,255,.14);font-size:20px;}
    .fda-card.is-off .fda-card-icon{background:#eaf5ef;color:#2e7d5b;}
    .fda-card-copy{min-width:0;flex:1;}
    .fda-eyebrow{font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;opacity:.72;margin-bottom:3px;}
    .fda-card-title{font-size:15px;font-weight:850;line-height:1.25;}
    .fda-card-sub{font-size:11.5px;line-height:1.45;opacity:.78;margin-top:3px;}
    .fda-card-btn{position:relative;z-index:1;border:0;border-radius:10px;background:#fff;color:#245f47;padding:10px 13px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;}
    .fda-card.is-off .fda-card-btn{background:#2e7d5b;color:#fff;}
    .fda-live{display:inline-flex;align-items:center;gap:5px;}
    .fda-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#65d69a;box-shadow:0 0 0 4px rgba(101,214,154,.14);}
    .fda-native-result{width:100%;display:flex;align-items:center;gap:12px;margin:0 0 13px;padding:13px 14px;border:1px solid #d7e8de;border-radius:15px;background:linear-gradient(145deg,#f5fbf7,#fff);box-shadow:0 4px 16px rgba(25,70,45,.055);color:#1a2b22;font-family:inherit;text-align:left;cursor:pointer;}
    .fda-native-result.attention{border-color:#efd3a4;background:linear-gradient(145deg,#fff8eb,#fff);}
    /* The empty state is an invitation, not a result: quieter than an activity
       card so it never reads as something that needs attention. */
    .fda-native-result.is-intro{border-style:dashed;background:#fff;box-shadow:none;}
    .fda-native-result.is-intro .fda-native-result-icon{background:#eef5f1;color:#4a7a63;font-weight:700;}
    .fda-native-result-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;background:#dff2e7;color:#23714f;font-size:16px;font-weight:900;}
    .fda-native-result.attention .fda-native-result-icon{background:#fff0d2;color:#a15c0b;}
    .fda-native-result-copy{min-width:0;flex:1;}
    .fda-native-result-label{display:block;font-size:9.5px;font-weight:850;letter-spacing:.075em;text-transform:uppercase;color:#39745a;margin-bottom:3px;}
    .fda-native-result.attention .fda-native-result-label{color:#9a5a12;}
    .fda-native-result-title{display:block;font-size:13px;font-weight:800;line-height:1.35;color:#1a2b22;}
    .fda-native-result-time{display:block;margin-top:3px;font-size:10.5px;line-height:1.3;color:#75857c;}
    .fda-native-result-arrow{flex:0 0 auto;color:#8aa095;font-size:20px;font-weight:500;line-height:1;}
    .fda-overlay{position:fixed;inset:0;z-index:110000;background:rgba(13,27,20,.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;padding:0;}
    .fda-sheet{width:100%;max-width:620px;max-height:min(92dvh,860px);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#eff4f0;border-radius:24px 24px 0 0;box-shadow:0 -18px 60px rgba(13,27,20,.25);padding:0 0 max(22px,env(safe-area-inset-bottom));animation:fdaSheetIn .2s ease-out;}
    .fda-sheet-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:17px 18px 13px;background:rgba(245,248,246,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(209,222,214,.8);}
    .fda-sheet-title{flex:1;min-width:0;font-size:18px;font-weight:850;color:#1a2b22;}
    .fda-close{border:0;width:34px;height:34px;border-radius:50%;background:#e4ebe7;color:#456054;font-size:20px;cursor:pointer;}
    .fda-sheet-body{width:100%;min-width:0;max-width:100%;padding:16px 16px 24px;}
    .fda-section{width:100%;min-width:0;max-width:100%;background:#fff;border:1px solid #dfe8e3;border-radius:17px;padding:16px;margin-bottom:13px;box-shadow:0 3px 14px rgba(26,43,34,.035);}
    .fda-section-title{min-width:0;font-size:14px;font-weight:850;color:#1a2b22;margin-bottom:4px;overflow-wrap:anywhere;}
    .fda-section-sub{min-width:0;font-size:12px;color:#687b70;line-height:1.5;margin-bottom:13px;overflow-wrap:anywhere;}
    .fda-story{background:linear-gradient(145deg,#e9f7ef,#f6fbf8);border-color:#cae5d5;}
    .fda-bubble{max-width:88%;border-radius:15px;padding:10px 12px;margin:8px 0;font-size:12.5px;line-height:1.45;}
    .fda-bubble.assistant{background:#fff;color:#294638;border:1px solid #d9e8df;border-bottom-left-radius:5px;}
    .fda-bubble.owner{background:#2e7d5b;color:#fff;margin-left:auto;border-bottom-right-radius:5px;}
    .fda-row{display:flex;align-items:center;gap:10px;min-width:0;}
    .fda-between{justify-content:space-between;}
    .fda-between>div:first-child{flex:1;min-width:0;}
    .fda-switch{position:relative;display:block;width:48px;height:28px;flex:0 0 48px;cursor:pointer;}
    .fda-switch input{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none;}
    .fda-switch-track{position:absolute;inset:0;border-radius:16px;background:#cfd9d3;transition:background .15s,opacity .15s;}
    .fda-switch-track::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .15s;}
    .fda-switch input:checked+.fda-switch-track{background:#2e7d5b;}
    .fda-switch input:checked+.fda-switch-track::after{transform:translateX(20px);}
    .fda-switch input:focus-visible+.fda-switch-track{box-shadow:0 0 0 3px rgba(46,125,91,.18);}
    .fda-switch input:disabled+.fda-switch-track{opacity:.5;cursor:not-allowed;}
    .fda-policy-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;}
    .fda-policy-option{position:relative;display:block;min-width:0;cursor:pointer;}
    .fda-policy-option input{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none;}
    .fda-policy-option-copy{display:block;width:100%;min-width:0;height:100%;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:13px;padding:12px;background:#fafcfb;color:#5d7166;overflow-wrap:anywhere;transition:border-color .15s,background .15s,box-shadow .15s;}
    .fda-policy-option-copy strong{display:block;color:#1a2b22;font-size:12.5px;margin-bottom:4px;}
    .fda-policy-option-copy span{display:block;font-size:10.5px;line-height:1.4;}
    .fda-policy-option input:checked + .fda-policy-option-copy{border-color:#2e7d5b;background:#edf7f1;box-shadow:0 0 0 3px rgba(46,125,91,.07);}
    .fda-policy-option input:disabled + .fda-policy-option-copy{opacity:.62;cursor:not-allowed;}
    .fda-policy-result{margin-top:9px;border-radius:11px;padding:10px 11px;background:#f1f5f3;color:#40574b;font-size:11px;line-height:1.45;}
    .fda-person{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #edf1ef;}
    .fda-person:first-of-type{border-top:0;}
    .fda-avatar{width:36px;height:36px;border-radius:50%;background:#e8f4ed;color:#2e7d5b;display:flex;align-items:center;justify-content:center;font-weight:850;flex:0 0 auto;}
    .fda-person-copy{min-width:0;flex:1;}
    .fda-person-name{font-size:13px;font-weight:800;color:#1a2b22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fda-person-meta{font-size:11px;color:#718278;margin-top:2px;}
    .fda-pill{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;background:#eaf7ef;color:#23714f;font-size:9.5px;font-weight:800;}
    .fda-pill.pending{background:#fff3df;color:#9a5a12;}
    .fda-icon-btn{border:0;background:#f1f5f3;color:#596e62;border-radius:9px;padding:8px 9px;font-family:inherit;font-size:11px;font-weight:750;cursor:pointer;}
    .fda-icon-btn.danger{color:#b42318;background:#fff1f0;}
    .fda-verify{display:flex;gap:7px;margin:1px 0 10px 46px;}
    .fda-verify input{min-width:0;flex:1;letter-spacing:.18em;text-align:center;font-weight:800;}
    .fda-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;min-width:0;}
    .fda-field{display:flex;flex-direction:column;min-width:0;width:100%;gap:5px;margin-bottom:10px;}
    .fda-field label{font-size:10.5px;font-weight:800;color:#5e7267;}
    .fda-field input,.fda-field select{display:block;width:100%;min-width:0;max-width:100%;height:46px;min-height:46px;max-height:46px;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:10px;background:#fff;color:#1a2b22;padding:0 11px;font-family:inherit;font-size:16px!important;line-height:normal;outline:none;}
    .fda-time-control{position:relative;display:flex;width:100%;min-width:0;max-width:100%;height:46px;min-height:46px;align-items:center;overflow:hidden;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:10px;background:#fff;color:#1a2b22;padding:0 38px 0 11px;}
    .fda-time-control::after{content:"";position:absolute;right:15px;top:17px;width:7px;height:7px;border-right:1.5px solid #65776d;border-bottom:1.5px solid #65776d;transform:rotate(45deg);pointer-events:none;}
    .fda-time-value{display:flex;min-width:0;align-items:center;font-size:16px;line-height:1;white-space:nowrap;}
    .fda-time-control>input[type="time"]{position:absolute;inset:0;z-index:1;width:100%!important;min-width:0!important;max-width:100%!important;height:46px!important;min-height:46px!important;max-height:46px!important;margin:0!important;padding:0!important;border:0!important;opacity:0;cursor:pointer;}
    .fda-time-control:focus-within{border-color:#2e7d5b;box-shadow:0 0 0 3px rgba(46,125,91,.09);}
    .fda-time-control.is-disabled{opacity:.62;}
    .fda-field input:focus,.fda-field select:focus{border-color:#2e7d5b;box-shadow:0 0 0 3px rgba(46,125,91,.09);}
    .fda-btn{border:0;border-radius:11px;padding:11px 14px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;}
    .fda-btn.primary{background:#2e7d5b;color:#fff;}
    .fda-btn.secondary{background:#edf3ef;color:#2b5e47;}
    .fda-btn.full{width:100%;}
    .fda-btn:disabled{opacity:.48;cursor:not-allowed;}
    .fda-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;}
    .fda-activity{display:flex;gap:10px;padding:10px 0;border-top:1px solid #edf1ef;}
    .fda-activity:first-of-type{border-top:0;}
    .fda-activity-dot{width:8px;height:8px;border-radius:50%;background:#83b49b;margin-top:5px;flex:0 0 auto;}
    .fda-activity-copy{min-width:0;flex:1;font-size:11.5px;color:#445a4f;line-height:1.4;}
    .fda-activity-time{font-size:10px;color:#8a9991;margin-top:2px;}
    .fda-lock{background:#fff8e7;border-color:#f2d899;}
    .fda-lock-price{font-size:12px;color:#7d5b16;line-height:1.5;margin-bottom:12px;}
    .fda-note{font-size:10.5px;color:#7a8b81;line-height:1.45;margin-top:9px;}
    @keyframes fdaSheetIn{from{transform:translateY(18px);opacity:.8}to{transform:translateY(0);opacity:1}}
    @media(min-width:700px){.fda-overlay{align-items:center;padding:20px}.fda-sheet{border-radius:24px;max-height:90dvh}}
    @media(max-width:560px){.fda-card-row{align-items:flex-start}.fda-card-btn{padding:9px 10px}.fda-grid{grid-template-columns:minmax(0,1fr)}.fda-actions{grid-template-columns:minmax(0,1fr)}.fda-sheet-body{padding:13px}.fda-policy-options{grid-template-columns:minmax(0,1fr)}}
  `,document.head.appendChild(t)}async function u({force:t=!1}={}){if(i.assistantData&&!t)return i.assistantData;if(m&&!t)return m;const e=i.activeHotelId;return i.assistantLoading=!0,i.assistantError="",x(),m=P(l("GET","/api/crm/frontdesk-assistant"),q,"Front Desk Assistant took too long to respond. Tap retry.").then(a=>{if(!a?.success)throw new Error(a?.message||"Could not load Front Desk Assistant.");return i.activeHotelId!==e?null:(i.assistantData=a.data,a.data)}).catch(a=>{throw i.activeHotelId===e&&(i.assistantError=a?.message||"Could not load Front Desk Assistant."),a}).finally(()=>{i.assistantLoading=!1,m=null,x(),document.getElementById("frontDeskAssistantOverlay")&&v()}),m}function x(){T();const t=document.getElementById("frontDeskAssistantPanel");if(!t)return;const e=i.currentFilter==="bookings"&&i.bookingsSubview==="bookings"&&!i.settingsTourActive;if(t.style.display=e?"block":"none",!e)return;if(!F()){t.innerHTML=`<div class="fda-card is-off">
      <div class="fda-card-row">
        <div class="fda-card-icon">↗</div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow">Front Desk app</div>
          <div class="fda-card-title">Assistant lives on your phone.</div>
          <div class="fda-card-sub">Download Marketel Front Desk from the App Store to connect phone numbers, choose your no-answer rule and manage Assistant activity.</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontdeskAppDownload()">Download</button>
      </div>
    </div>`;return}if(F()){const r=H();if(!i.assistantData||!r){if(!i.assistantData&&!i.assistantLoading&&!i.assistantError&&u().catch(()=>{}),i.assistantLoading){t.innerHTML="",t.style.display="none";return}t.style.display="block",t.innerHTML=`<button type="button" class="fda-native-result is-intro" onclick="openFrontDeskAssistant()" aria-label="Set up Front Desk Assistant">
        <span class="fda-native-result-icon" aria-hidden="true">☎</span>
        <span class="fda-native-result-copy">
          <span class="fda-native-result-label">Front Desk Assistant</span>
          <span class="fda-native-result-title">Get a text when a room is requested.</span>
          <span class="fda-native-result-time">Reply in words — it updates availability for you</span>
        </span>
        <span class="fda-native-result-arrow" aria-hidden="true">›</span>
      </button>`;return}const f=r.type==="availability_warning"||r.status==="attention";t.style.display="block",t.innerHTML=`<button type="button" class="fda-native-result${f?" attention":""}" onclick="openFrontDeskAssistant()" aria-label="Open Front Desk Assistant activity">
      <span class="fda-native-result-icon" aria-hidden="true">${f?"!":"✓"}</span>
      <span class="fda-native-result-copy">
        <span class="fda-native-result-label">${f?"Front Desk needs your review":"Front Desk handled this"}</span>
        <span class="fda-native-result-title">${o(r.summary||"Assistant updated your property")}</span>
        <span class="fda-native-result-time">${o(j(r.createdAt))} · View activity</span>
      </span>
      <span class="fda-native-result-arrow" aria-hidden="true">›</span>
    </button>`;return}if(!i.assistantData){const r=!!i.assistantError&&!i.assistantLoading;t.innerHTML=`<div class="fda-card is-off">
      <div class="fda-card-row">
        <div class="fda-card-icon">💬</div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow">Front Desk Assistant</div>
          <div class="fda-card-title">${i.assistantLoading?"Connecting your assistant…":r?"Assistant could not connect":"Tell Front Desk when a room is taken"}</div>
          <div class="fda-card-sub">${r?o(i.assistantError):"Tell it when a walk-in or another channel takes a room. It updates Availability and your direct booking page."}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${r?"Retry":"Open"}</button>
      </div>
    </div>`,i.assistantLoading||u().catch(()=>{});return}const a=$(),n=i.assistantData.config||{},s=i.assistantData.bookingApproval||{};if(n.enabled){const r=n.nextCheckAt?` · next ${S(n.nextCheckAt,{relative:!0})}`:"",f=s.enabled?` · no reply ${s.noResponseAction==="release"?"releases request":"keeps booking"}`:"";t.innerHTML=`<div class="fda-card">
      <div class="fda-card-row">
        <div class="fda-card-icon">💬</div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow fda-live">Assistant on</div>
          <div class="fda-card-title">Front Desk is watching ${a.length} phone${a.length===1?"":"s"}</div>
          <div class="fda-card-sub">${o(V(n.checkFrequency))}${o(r)}${o(f)}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">Manage</button>
      </div>
    </div>`;return}const d=!N();t.innerHTML=`<div class="fda-card is-off">
    <div class="fda-card-row">
      <div class="fda-card-icon">💬</div>
      <div class="fda-card-copy">
        <div class="fda-eyebrow">${d?"Included when activated":"Front Desk Assistant"}</div>
        <div class="fda-card-title">Text Front Desk. It handles availability.</div>
        <div class="fda-card-sub">${d?"See how it protects your direct booking page before you go live.":"If a walk-in or another channel takes a room, text Front Desk what happened. It updates Availability for you."}</div>
      </div>
      <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${d?"See it":"Set up"}</button>
    </div>
  </div>`}function U(t){const e=o((t.name||"?").charAt(0).toUpperCase()),a=[t.role,t.maskedPhone].filter(Boolean).join(" · ");return`<div>
    <div class="fda-person">
      <div class="fda-avatar">${e}</div>
      <div class="fda-person-copy">
        <div class="fda-person-name">${o(t.name)}</div>
        <div class="fda-person-meta">${o(a)}</div>
      </div>
      <span class="fda-pill ${t.verified?"":"pending"}">${t.verified?"Connected":"Verify"}</span>
      <button type="button" class="fda-icon-btn danger" onclick='removeAssistantRecipient(${w(t.id)})'>Remove</button>
    </div>
    ${t.verified?"":`<div class="fda-verify">
      <input id="assistant-code-${o(t.id)}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" aria-label="Verification code">
      <button type="button" class="fda-btn primary" onclick='verifyAssistantRecipient(${w(t.id)})'>Verify</button>
      <button type="button" class="fda-icon-btn" onclick='resendAssistantCode(${w(t.id)})'>Resend</button>
    </div>`}
  </div>`}function Y(){const t=(i.assistantData?.activities||[]).slice(0,10);return t.length?t.map(e=>`<div class="fda-activity">
    <div class="fda-activity-dot"></div>
    <div class="fda-activity-copy">
      ${o(e.summary||"Front Desk activity")}
      <div class="fda-activity-time">${o(S(e.createdAt))}${e.status?` · ${o(e.status)}`:""}</div>
    </div>
  </div>`).join(""):'<div class="fda-section-sub" style="margin:4px 0 0;">Booking alerts and availability updates will appear here.</div>'}function W(){const t=i.assistantData;if(!t)return i.assistantError&&!i.assistantLoading?`<div class="fda-section">
        <div class="fda-section-title">Assistant could not connect</div>
        <div class="fda-section-sub">${o(i.assistantError)}</div>
        <button type="button" class="fda-btn primary full" onclick="retryFrontDeskAssistant()">Retry</button>
      </div>`:'<div class="fda-section"><div class="loading"><div class="logo-sprite-bounce"></div> Opening assistant…</div></div>';const e=t.config||{},a=t.bookingApproval||{},n=I(),s=t.capabilities||{},d=N(),r=Number(s.maxRecipients||3),f=n.length<r,p=d?"":"disabled",g=d&&s.manualAvailability?"":"disabled",z=e.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",M=typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp(),y=[];s.smsConfigured||y.push("Marketel's texting number still needs its server credentials."),s.manualAvailability||y.push("The Assistant works with properties whose Availability is managed in Marketel.");const B=y.length?`<div class="fda-section fda-lock">
        <div class="fda-section-title">Not ready on this property yet</div>
        <div class="fda-section-sub" style="margin:0;">${y.map(h=>o(h)).join(" ")}</div>
      </div>`:"";return`
    ${!!e.enabled&&n.length>0?"":`<div class="fda-section fda-story">
      <div class="fda-section-title">Your Front Desk becomes someone you can text</div>
      <div class="fda-section-sub">If a walk-in or another channel takes a room, text what happened. Front Desk updates Availability and reduces what remains available on your direct booking page.</div>
      <div class="fda-bubble assistant"><strong>Front Desk</strong><br>New booking: ${o(O())}, tonight. Is it still free?</div>
      <div class="fda-bubble owner">A walk-in took it.</div>
      <div class="fda-bubble assistant"><strong>Done.</strong> I updated availability. If an online guest is affected, I’ll ask before cancelling anything.</div>
      <div class="fda-policy-result"><strong>You set the fallback.</strong> If nobody answers a new-booking alert, Front Desk either keeps the sale or releases the request—your choice.</div>
    </div>`}

    ${!d&&!M?`<div class="fda-section fda-lock">
      <div class="fda-section-title">Included with your $199/month activation</div>
      <div class="fda-lock-price">Activate your direct booking page to connect phones, receive booking texts, and update availability by reply.</div>
      <button type="button" class="fda-btn primary full" onclick="activateFromAssistant()">Activate Marketel</button>
    </div>`:""}
    ${B}
    ${_()}

    <div class="fda-section">
      <div class="fda-row fda-between">
        <div>
          <div class="fda-section-title">Front Desk Assistant</div>
          <div class="fda-section-sub" style="margin:0;">Turn texting and automatic check-ins on or off.</div>
        </div>
        <label class="fda-switch" aria-label="Turn Front Desk Assistant on">
          <input id="assistant-enabled" type="checkbox" ${e.enabled?"checked":""} ${p} aria-label="Turn Front Desk Assistant on">
          <span class="fda-switch-track" aria-hidden="true"></span>
        </label>
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-row fda-between">
        <div>
          <div class="fda-section-title">Review before a booking locks in</div>
          <div class="fda-section-sub" style="margin:0;">Front Desk holds the room, asks connected phones, then follows your rule if nobody replies.</div>
        </div>
        <label class="fda-switch" aria-label="Review new bookings before confirmation">
          <input id="assistant-approval-enabled" type="checkbox" ${a.enabled?"checked":""} ${g} aria-label="Review new bookings before confirmation" onchange="updateAssistantPolicySummary()">
          <span class="fda-switch-track" aria-hidden="true"></span>
        </label>
      </div>
      <div class="fda-field" style="margin-top:13px;">
        <label for="assistant-approval-window">Time to answer</label>
        <select id="assistant-approval-window" ${g} onchange="updateAssistantPolicySummary()">
          ${[5,10,15,20,30,45,60].map(h=>`<option value="${h}" ${Number(a.windowMinutes||20)===h?"selected":""}>${h} minutes</option>`).join("")}
        </select>
      </div>
      <div class="fda-section-title" style="margin-top:2px;">If nobody answers</div>
      <div class="fda-policy-options">
        <label class="fda-policy-option">
          <input type="radio" name="assistant-no-response" value="confirm" ${a.noResponseAction!=="release"?"checked":""} ${g} onchange="updateAssistantPolicySummary()">
          <span class="fda-policy-option-copy"><strong>Keep the booking</strong><span>Confirm it automatically. Best when saving the sale matters most.</span></span>
        </label>
        <label class="fda-policy-option">
          <input type="radio" name="assistant-no-response" value="release" ${a.noResponseAction==="release"?"checked":""} ${g} onchange="updateAssistantPolicySummary()">
          <span class="fda-policy-option-copy"><strong>Release the request</strong><span>Void the $1 hold and notify the guest. Best when availability must be certain.</span></span>
        </label>
      </div>
      <div class="fda-policy-result" id="assistant-policy-result"></div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Who should Front Desk text?</div>
      <div class="fda-section-sub">Add the owner, manager, or desk staff. Marketel can contact up to ${r} people.</div>
      ${n.length?n.map(U).join(""):'<div class="fda-section-sub" style="padding:4px 0 10px;">No phones connected yet.</div>'}
      ${f?`<div class="fda-grid" style="margin-top:8px;">
        <div class="fda-field"><label for="assistant-person-name">Name</label><input id="assistant-person-name" type="text" maxlength="80" placeholder="e.g. Jack"></div>
        <div class="fda-field"><label for="assistant-person-role">Role</label><input id="assistant-person-role" type="text" maxlength="80" placeholder="Owner, night desk…"></div>
      </div>
      <div class="fda-field"><label for="assistant-person-phone">Mobile number</label><input id="assistant-person-phone" type="tel" autocomplete="tel" placeholder="(701) 555-0123"></div>
      <button type="button" class="fda-btn secondary full" onclick="addAssistantRecipient()" ${d&&s.smsConfigured?"":"disabled"}>Send verification code</button>`:""}
      ${s.assistantPhone?'<button type="button" class="fda-icon-btn" style="margin-top:10px;" onclick="saveAssistantContact()">Save “Marketel Front Desk” to contacts</button>':""}
      <div class="fda-note">Verification confirms consent and prevents a mistyped number from texting someone else. Reply STOP anytime to disconnect.</div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">When should it check in?</div>
      <div class="fda-section-sub">Front Desk asks whether a walk-in or another channel changed your rooms. Reply with what happened; it updates Availability for you.</div>
      <div class="fda-field">
        <label for="assistant-frequency">Check-in schedule</label>
        <select id="assistant-frequency" ${p}>
          <option value="smart" ${e.checkFrequency==="smart"?"selected":""}>Evening check — recommended</option>
          <option value="2h" ${e.checkFrequency==="2h"?"selected":""}>Every 2 hours</option>
          <option value="4h" ${e.checkFrequency==="4h"?"selected":""}>Every 4 hours</option>
          <option value="daily" ${e.checkFrequency==="daily"?"selected":""}>Once daily</option>
          <option value="booking_only" ${e.checkFrequency==="booking_only"?"selected":""}>Only when a new booking arrives</option>
          <option value="off" ${e.checkFrequency==="off"?"selected":""}>Never check in</option>
        </select>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-check-time">Daily check time</label>${A("assistant-check-time",e.dailyCheckTime||"18:00",p)}</div>
        <div class="fda-field"><label for="assistant-time-zone">Time zone</label><input id="assistant-time-zone" type="text" value="${o(z)}" ${p}></div>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-quiet-start">Quiet hours start</label>${A("assistant-quiet-start",e.quietHoursStart||"",p)}</div>
        <div class="fda-field"><label for="assistant-quiet-end">Quiet hours end</label>${A("assistant-quiet-end",e.quietHoursEnd||"",p)}</div>
      </div>
      <label class="fda-row" style="font-size:12px;color:#40574b;margin-top:2px;cursor:pointer;">
        <input id="assistant-booking-alerts" type="checkbox" ${e.notifyNewBookings!==!1?"checked":""} ${p}>
        Text connected phones when a new booking arrives
      </label>
      <button type="button" class="fda-btn primary full" style="margin-top:14px;" onclick="saveAssistantSettings()" ${d&&s.smsConfigured&&s.manualAvailability?"":"disabled"}>Save assistant settings</button>
      <div class="fda-actions">
        <button type="button" class="fda-btn secondary" onclick="sendAssistantTest()" ${$().length&&d&&s.smsConfigured?"":"disabled"}>Send test text</button>
        <button type="button" class="fda-btn secondary" onclick="runAssistantCheckNow()" ${$().length&&d&&s.smsConfigured?"":"disabled"}>Ask for an update now</button>
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Recent activity</div>
      ${Y()}
    </div>
  `}function v(){const t=document.getElementById("frontDeskAssistantSheet");t&&(t.innerHTML=`<div class="fda-sheet-head">
    <div class="fda-sheet-title">Front Desk Assistant</div>
    <button type="button" class="fda-close" onclick="closeFrontDeskAssistant()" aria-label="Close">×</button>
  </div>
  <div class="fda-sheet-body">${W()}</div>`,R())}function G(){document.getElementById("frontDeskAssistantSheet")&&v()}function R(){const t=document.getElementById("assistant-policy-result");if(!t)return;const e=!!document.getElementById("assistant-approval-enabled")?.checked,a=Number(document.getElementById("assistant-approval-window")?.value||20),n=document.querySelector('input[name="assistant-no-response"]:checked')?.value||"confirm";if(!e){t.innerHTML="<strong>Off.</strong> New direct bookings confirm immediately.";return}t.innerHTML=n==="release"?`<strong>Your rule:</strong> no answer after ${a} minutes releases the request, voids the $1 hold and emails the guest.`:`<strong>Your rule:</strong> no answer after ${a} minutes keeps the booking and emails the guest a confirmation.`}function Z(t){const e=t?.closest?.(".fda-time-control")?.querySelector(".fda-time-value");e&&(e.textContent=C(t.value))}function J(){if(!F()){window.openFrontdeskAppDownload?.();return}D(!1),T();let t=document.getElementById("frontDeskAssistantOverlay");t||(t=document.createElement("div"),t.id="frontDeskAssistantOverlay",t.className="fda-overlay",t.innerHTML='<div class="fda-sheet" id="frontDeskAssistantSheet" role="dialog" aria-modal="true" aria-label="Front Desk Assistant"></div>',t.addEventListener("click",e=>{e.target===t&&k()}),document.body.appendChild(t)),document.body.style.overflow="hidden",v(),requestAnimationFrame(()=>D(!1)),i.assistantData?u({force:!0}).catch(()=>{}):u().catch(()=>{})}function k(){document.getElementById("frontDeskAssistantOverlay")?.remove(),document.body.style.overflow="",D(!0)}function Q(){i.assistantError="",v(),u({force:!0}).catch(()=>{})}function b(t,e){if(!t?.success)throw new Error(t?.message||"That did not save.");return t.data&&(i.assistantData=t.data),x(),v(),e&&c(e,"success"),t}async function K(){const t=document.getElementById("assistant-person-name")?.value.trim(),e=document.getElementById("assistant-person-role")?.value.trim(),a=document.getElementById("assistant-person-phone")?.value.trim();if(!t||!a)return c("Enter a name and mobile number.","error");try{const n=await l("POST","/api/crm/frontdesk-assistant/recipients",{name:t,role:e,phone:a});b(n,n.verificationSent?"Verification code sent.":"Phone connected.")}catch(n){c(n.message||"Could not add that phone.","error")}}async function X(t){const e=document.getElementById(`assistant-code-${t}`)?.value.trim();if(!e||e.length!==6)return c("Enter the 6-digit code.","error");try{b(await l("POST",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}/verify`,{code:e}),"Phone connected to Front Desk.")}catch(a){c(a.message||"That code could not be verified.","error")}}async function tt(t){try{b(await l("POST",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}/resend`,{}),"A new code was sent.")}catch(e){c(e.message||"Could not resend the code.","error")}}async function et(t){if(window.confirm("Remove this phone from Front Desk Assistant?"))try{b(await l("DELETE",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}`),"Phone removed.")}catch(e){c(e.message||"Could not remove that phone.","error")}}async function at(){const t={enabled:!!document.getElementById("assistant-enabled")?.checked,checkFrequency:document.getElementById("assistant-frequency")?.value||"smart",dailyCheckTime:document.getElementById("assistant-check-time")?.value||"18:00",quietHoursStart:document.getElementById("assistant-quiet-start")?.value||"",quietHoursEnd:document.getElementById("assistant-quiet-end")?.value||"",timeZone:document.getElementById("assistant-time-zone")?.value||Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",notifyNewBookings:!!document.getElementById("assistant-booking-alerts")?.checked},e={enabled:!!document.getElementById("assistant-approval-enabled")?.checked,windowMinutes:Number(document.getElementById("assistant-approval-window")?.value||20),noResponseAction:document.querySelector('input[name="assistant-no-response"]:checked')?.value||"confirm"};try{b(await l("PUT","/api/crm/frontdesk-assistant",t)),await l("POST","/api/crm/booking-approval",e),await u({force:!0}),c("Front Desk Assistant and booking rule saved.","success")}catch(a){c(a.message||"Could not save the assistant.","error")}}async function it(){try{return b(await l("POST","/api/crm/frontdesk-assistant/test",{}),"Test text sent.")}catch(t){c(t.message||"Could not send a test text.","error")}}async function nt(){try{b(await l("POST","/api/crm/frontdesk-assistant/check-now",{}),"Front Desk asked for an availability update.")}catch(t){c(t.message||"Could not send that check.","error")}}function st(){const t=i.assistantData?.capabilities?.assistantPhone||"";if(!t)return c("The Front Desk number is not available yet.","error");try{const s=window.webkit?.messageHandlers?.marketelShell;if(s&&typeof s.postMessage=="function"){s.postMessage({type:"saveContact",name:"Marketel Front Desk",phone:t});return}}catch{}const e=["BEGIN:VCARD","VERSION:3.0","FN:Marketel Front Desk","ORG:Marketel",`TEL;TYPE=CELL:${t}`,"NOTE:If a walk-in or another channel takes a room, text what happened. Marketel Front Desk updates Availability and your direct booking page.","END:VCARD"].join(`\r
`),a=URL.createObjectURL(new Blob([e],{type:"text/vcard;charset=utf-8"})),n=document.createElement("a");n.href=a,n.download="Marketel-Front-Desk.vcf",document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(a),2e3)}async function ot(){if(typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()){k(),c("Front Desk app access is managed with your Marketel account.","info");return}k();try{const t=await window.loadSettingsModule?.(),e=window.goLive||t?.goLive;if(typeof e=="function"){e();return}}catch{}c("Open Your page to activate Marketel.","info")}const rt={activateFromAssistant:ot,addAssistantRecipient:K,closeFrontDeskAssistant:k,loadFrontDeskAssistant:u,openFrontDeskAssistant:J,removeAssistantRecipient:et,refreshFrontDeskAssistantSheet:G,renderFrontDeskAssistantCard:x,retryFrontDeskAssistant:Q,resendAssistantCode:tt,runAssistantCheckNow:nt,saveAssistantContact:st,saveAssistantSettings:at,sendAssistantTest:it,updateAssistantPolicySummary:R,updateAssistantTimeDisplay:Z,verifyAssistantRecipient:X};function ft(){E||(E=!0,T(),L(rt))}export{ot as activateFromAssistant,K as addAssistantRecipient,k as closeFrontDeskAssistant,ft as install,u as loadFrontDeskAssistant,J as openFrontDeskAssistant,G as refreshFrontDeskAssistantSheet,et as removeAssistantRecipient,x as renderFrontDeskAssistantCard,tt as resendAssistantCode,Q as retryFrontDeskAssistant,nt as runAssistantCheckNow,st as saveAssistantContact,at as saveAssistantSettings,it as sendAssistantTest,R as updateAssistantPolicySummary,Z as updateAssistantTimeDisplay,X as verifyAssistantRecipient};
