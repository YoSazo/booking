import{e as C,c as a}from"./settings-BVJy4Woh.js";let w=!1,p=null;const I=12e3,z="1231231234";function c(t,e,i){return typeof window.api!="function"?Promise.reject(new Error("Front Desk is not ready.")):window.api(t,e,i)}function r(t,e="info"){typeof window.toast=="function"&&window.toast(t,e)}function h(t){if(typeof window.setNativeShellVisible=="function"){window.setNativeShellVisible(t);return}try{window.webkit?.messageHandlers?.marketelShell?.postMessage({type:"visibility",visible:!!t})}catch{}}function N(t,e,i){let n=null;const s=new Promise((d,g)=>{n=setTimeout(()=>g(new Error(i)),e)});return Promise.race([t,s]).finally(()=>clearTimeout(n))}function o(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function m(t){return JSON.stringify(String(t??"")).replace(/</g,"\\u003c")}function A(){return(a.assistantData?.recipients||[]).filter(t=>t.active)}function y(){return A().filter(t=>t.verified)}function D(){return!!a.assistantData?.hotel?.subscribed||!!a.isMasterPin}function $(t,e={}){if(!t)return"";const i=new Date(t);if(!Number.isFinite(i.getTime()))return"";const n=Date.now(),s=Math.round((i.getTime()-n)/6e4);if(e.relative&&s>0&&s<60)return`in ${s} min`;if(e.relative&&s>=60&&s<1440){const d=Math.round(s/60);return`in ${d} hr${d===1?"":"s"}`}return i.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}function R(t){return{smart:"Evening availability check","2h":"Every 2 hours","4h":"Every 4 hours",daily:"Once daily",booking_only:"New bookings only",off:"No check-ins"}[t]||"Smart daily check"}function x(){if(document.getElementById("frontDeskAssistantStyles"))return;const t=document.createElement("style");t.id="frontDeskAssistantStyles",t.textContent=`
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
    .fda-overlay{position:fixed;inset:0;z-index:110000;background:rgba(13,27,20,.48);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;padding:0;}
    .fda-sheet{width:100%;max-width:620px;max-height:min(92dvh,860px);overflow:auto;overscroll-behavior:contain;background:#f5f8f6;border-radius:24px 24px 0 0;box-shadow:0 -18px 60px rgba(13,27,20,.25);padding:0 0 max(22px,env(safe-area-inset-bottom));animation:fdaSheetIn .2s ease-out;}
    .fda-sheet-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:17px 18px 13px;background:rgba(245,248,246,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(209,222,214,.8);}
    .fda-sheet-title{flex:1;min-width:0;font-size:18px;font-weight:850;color:#1a2b22;}
    .fda-close{border:0;width:34px;height:34px;border-radius:50%;background:#e4ebe7;color:#456054;font-size:20px;cursor:pointer;}
    .fda-sheet-body{padding:16px 16px 24px;}
    .fda-section{background:#fff;border:1px solid #dfe8e3;border-radius:17px;padding:16px;margin-bottom:13px;box-shadow:0 3px 14px rgba(26,43,34,.035);}
    .fda-section-title{font-size:14px;font-weight:850;color:#1a2b22;margin-bottom:4px;}
    .fda-section-sub{font-size:12px;color:#687b70;line-height:1.5;margin-bottom:13px;}
    .fda-story{background:linear-gradient(145deg,#e9f7ef,#f6fbf8);border-color:#cae5d5;}
    .fda-bubble{max-width:88%;border-radius:15px;padding:10px 12px;margin:8px 0;font-size:12.5px;line-height:1.45;}
    .fda-bubble.assistant{background:#fff;color:#294638;border:1px solid #d9e8df;border-bottom-left-radius:5px;}
    .fda-bubble.owner{background:#2e7d5b;color:#fff;margin-left:auto;border-bottom-right-radius:5px;}
    .fda-row{display:flex;align-items:center;gap:10px;}
    .fda-between{justify-content:space-between;}
    .fda-toggle{appearance:none;-webkit-appearance:none;width:48px;height:28px;border-radius:16px;background:#cfd9d3;position:relative;cursor:pointer;transition:.15s;flex:0 0 auto;}
    .fda-toggle::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:.15s;}
    .fda-toggle:checked{background:#2e7d5b;}
    .fda-toggle:checked::after{transform:translateX(20px);}
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
    .fda-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
    .fda-field{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;}
    .fda-field label{font-size:10.5px;font-weight:800;color:#5e7267;}
    .fda-field input,.fda-field select{width:100%;box-sizing:border-box;border:1.5px solid #dbe5df;border-radius:10px;background:#fff;color:#1a2b22;padding:11px;font-family:inherit;font-size:13px;outline:none;}
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
    @media(max-width:420px){.fda-card-row{align-items:flex-start}.fda-card-btn{padding:9px 10px}.fda-grid{grid-template-columns:1fr}.fda-actions{grid-template-columns:1fr}.fda-sheet-body{padding:13px}}
  `,document.head.appendChild(t)}async function u({force:t=!1}={}){if(a.assistantData&&!t)return a.assistantData;if(p&&!t)return p;const e=a.activeHotelId;return a.assistantLoading=!0,a.assistantError="",b(),p=N(c("GET","/api/crm/frontdesk-assistant"),I,"Front Desk Assistant took too long to respond. Tap retry.").then(i=>{if(!i?.success)throw new Error(i?.message||"Could not load Front Desk Assistant.");return a.activeHotelId!==e?null:(a.assistantData=i.data,i.data)}).catch(i=>{throw a.activeHotelId===e&&(a.assistantError=i?.message||"Could not load Front Desk Assistant."),i}).finally(()=>{a.assistantLoading=!1,p=null,b(),document.getElementById("frontDeskAssistantOverlay")&&v()}),p}function b(){x();const t=document.getElementById("frontDeskAssistantPanel");if(!t)return;const e=a.currentFilter==="bookings"&&a.bookingsSubview==="bookings"&&!a.settingsTourActive;if(t.style.display=e?"block":"none",!e)return;if(!a.assistantData){const d=!!a.assistantError&&!a.assistantLoading;t.innerHTML=`<div class="fda-card is-off">
      <div class="fda-card-row">
        <div class="fda-card-icon">💬</div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow">Front Desk Assistant</div>
          <div class="fda-card-title">${a.assistantLoading?"Connecting your assistant…":d?"Assistant could not connect":"Tell Front Desk when a room is taken"}</div>
          <div class="fda-card-sub">${d?o(a.assistantError):"It updates availability for you and helps prevent outside bookings from colliding."}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${d?"Retry":"Open"}</button>
      </div>
    </div>`,a.assistantLoading||u().catch(()=>{});return}const i=y(),n=a.assistantData.config||{};if(n.enabled){const d=n.nextCheckAt?` · next ${$(n.nextCheckAt,{relative:!0})}`:"";t.innerHTML=`<div class="fda-card">
      <div class="fda-card-row">
        <div class="fda-card-icon">💬</div>
        <div class="fda-card-copy">
          <div class="fda-eyebrow fda-live">Assistant on</div>
          <div class="fda-card-title">Front Desk is watching ${i.length} phone${i.length===1?"":"s"}</div>
          <div class="fda-card-sub">${o(R(n.checkFrequency))}${o(d)}</div>
        </div>
        <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">Manage</button>
      </div>
    </div>`;return}const s=!D();t.innerHTML=`<div class="fda-card is-off">
    <div class="fda-card-row">
      <div class="fda-card-icon">💬</div>
      <div class="fda-card-copy">
        <div class="fda-eyebrow">${s?"Included when activated":"Front Desk Assistant"}</div>
        <div class="fda-card-title">Text Front Desk. It handles availability.</div>
        <div class="fda-card-sub">${s?"See how it protects your direct booking page before you go live.":"Connect your phone and tell it when a walk-in takes a room."}</div>
      </div>
      <button type="button" class="fda-card-btn" onclick="openFrontDeskAssistant()">${s?"See it":"Set up"}</button>
    </div>
  </div>`}function M(t){const e=o((t.name||"?").charAt(0).toUpperCase()),i=[t.role,t.maskedPhone].filter(Boolean).join(" · ");return`<div>
    <div class="fda-person">
      <div class="fda-avatar">${e}</div>
      <div class="fda-person-copy">
        <div class="fda-person-name">${o(t.name)}</div>
        <div class="fda-person-meta">${o(i)}</div>
      </div>
      <span class="fda-pill ${t.verified?"":"pending"}">${t.verified?"Connected":"Verify"}</span>
      <button type="button" class="fda-icon-btn danger" onclick='removeAssistantRecipient(${m(t.id)})'>Remove</button>
    </div>
    ${t.verified?"":`<div class="fda-verify">
      <input id="assistant-code-${o(t.id)}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" aria-label="Verification code">
      <button type="button" class="fda-btn primary" onclick='verifyAssistantRecipient(${m(t.id)})'>Verify</button>
      <button type="button" class="fda-icon-btn" onclick='resendAssistantCode(${m(t.id)})'>Resend</button>
    </div>`}
  </div>`}function O(){const t=(a.assistantData?.activities||[]).slice(0,10);return t.length?t.map(e=>`<div class="fda-activity">
    <div class="fda-activity-dot"></div>
    <div class="fda-activity-copy">
      ${o(e.summary||"Front Desk activity")}
      <div class="fda-activity-time">${o($(e.createdAt))}${e.status?` · ${o(e.status)}`:""}</div>
    </div>
  </div>`).join(""):'<div class="fda-section-sub" style="margin:4px 0 0;">Booking alerts and availability updates will appear here.</div>'}function L(){const t=a.assistantData;if(!t)return a.assistantError&&!a.assistantLoading?`<div class="fda-section">
        <div class="fda-section-title">Assistant could not connect</div>
        <div class="fda-section-sub">${o(a.assistantError)}</div>
        <button type="button" class="fda-btn primary full" onclick="retryFrontDeskAssistant()">Retry</button>
      </div>`:'<div class="fda-section"><div class="loading"><div class="logo-sprite-bounce"></div> Opening assistant…</div></div>';const e=t.config||{},i=A(),n=t.capabilities||{},s=D(),d=Number(n.maxRecipients||3),g=i.length<d,l=s?"":"disabled",E=e.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",F=typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp(),T=n.smsConfigured?"":`<div class="fda-section fda-lock"><div class="fda-section-title">Messaging is being connected</div><div class="fda-section-sub" style="margin:0;">The interface is ready, but Marketel's texting number still needs its server credentials before it can send.</div></div>`,S=n.manualAvailability?"":'<div class="fda-section fda-lock"><div class="fda-section-title">Availability updates are not available here yet</div><div class="fda-section-sub" style="margin:0;">The Assistant currently works with properties whose Availability is managed directly in Marketel.</div></div>';return`
    <div class="fda-section fda-story">
      <div class="fda-section-title">Your Front Desk becomes someone you can text</div>
      <div class="fda-section-sub">No forms. Tell it what happened in plain English and it safely updates Marketel.</div>
      <div class="fda-bubble assistant"><strong>Front Desk</strong><br>New booking: Queen Room, tonight. Is it still free?</div>
      <div class="fda-bubble owner">A walk-in took it.</div>
      <div class="fda-bubble assistant"><strong>Done.</strong> I updated availability. If an online guest is affected, I’ll ask before cancelling anything.</div>
    </div>

    ${s?"":`<div class="fda-section fda-lock">
      <div class="fda-section-title">Included with your $199/month activation</div>
      <div class="fda-lock-price">Activate your direct booking page to connect phones, receive booking texts, and update availability by reply.</div>
      <button type="button" class="fda-btn primary full" onclick="activateFromAssistant()">Activate Marketel</button>
    </div>`}
    ${T}
    ${S}

    <div class="fda-section">
      <div class="fda-row fda-between">
        <div>
          <div class="fda-section-title">Front Desk Assistant</div>
          <div class="fda-section-sub" style="margin:0;">Turn texting and automatic check-ins on or off.</div>
        </div>
        <input class="fda-toggle" id="assistant-enabled" type="checkbox" ${e.enabled?"checked":""} ${l} aria-label="Turn Front Desk Assistant on">
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Who should Front Desk text?</div>
      <div class="fda-section-sub">Add the owner, manager, or desk staff. Marketel can contact up to ${d} people.</div>
      ${i.length?i.map(M).join(""):'<div class="fda-section-sub" style="padding:4px 0 10px;">No phones connected yet.</div>'}
      ${g?`<div class="fda-grid" style="margin-top:8px;">
        <div class="fda-field"><label for="assistant-person-name">Name</label><input id="assistant-person-name" type="text" maxlength="80" placeholder="e.g. Jack"></div>
        <div class="fda-field"><label for="assistant-person-role">Role</label><input id="assistant-person-role" type="text" maxlength="80" placeholder="Owner, night desk…"></div>
      </div>
      <div class="fda-field"><label for="assistant-person-phone">Mobile number</label><input id="assistant-person-phone" type="tel" autocomplete="tel" placeholder="(701) 555-0123"></div>
      <button type="button" class="fda-btn secondary full" onclick="addAssistantRecipient()" ${s&&n.smsConfigured?"":"disabled"}>Send verification code</button>`:""}
      ${n.assistantPhone||F?'<button type="button" class="fda-icon-btn" style="margin-top:10px;" onclick="saveAssistantContact()">Save “Marketel Front Desk” to contacts</button>':""}
      <div class="fda-note">Verification confirms consent and prevents a mistyped number from texting someone else. Reply STOP anytime to disconnect.</div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">When should it check in?</div>
      <div class="fda-section-sub">A booking text carries news. Availability check-ins ask whether a walk-in or outside booking changed anything.</div>
      <div class="fda-field">
        <label for="assistant-frequency">Check-in schedule</label>
        <select id="assistant-frequency" ${l}>
          <option value="smart" ${e.checkFrequency==="smart"?"selected":""}>Evening check — recommended</option>
          <option value="2h" ${e.checkFrequency==="2h"?"selected":""}>Every 2 hours</option>
          <option value="4h" ${e.checkFrequency==="4h"?"selected":""}>Every 4 hours</option>
          <option value="daily" ${e.checkFrequency==="daily"?"selected":""}>Once daily</option>
          <option value="booking_only" ${e.checkFrequency==="booking_only"?"selected":""}>Only when a new booking arrives</option>
          <option value="off" ${e.checkFrequency==="off"?"selected":""}>Never check in</option>
        </select>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-check-time">Daily check time</label><input id="assistant-check-time" type="time" value="${o(e.dailyCheckTime||"18:00")}" ${l}></div>
        <div class="fda-field"><label for="assistant-time-zone">Time zone</label><input id="assistant-time-zone" type="text" value="${o(E)}" ${l}></div>
      </div>
      <div class="fda-grid">
        <div class="fda-field"><label for="assistant-quiet-start">Quiet hours start</label><input id="assistant-quiet-start" type="time" value="${o(e.quietHoursStart||"")}" ${l}></div>
        <div class="fda-field"><label for="assistant-quiet-end">Quiet hours end</label><input id="assistant-quiet-end" type="time" value="${o(e.quietHoursEnd||"")}" ${l}></div>
      </div>
      <label class="fda-row" style="font-size:12px;color:#40574b;margin-top:2px;cursor:pointer;">
        <input id="assistant-booking-alerts" type="checkbox" ${e.notifyNewBookings!==!1?"checked":""} ${l}>
        Text connected phones when a new booking arrives
      </label>
      <button type="button" class="fda-btn primary full" style="margin-top:14px;" onclick="saveAssistantSettings()" ${s&&n.smsConfigured&&n.manualAvailability?"":"disabled"}>Save assistant settings</button>
      <div class="fda-actions">
        <button type="button" class="fda-btn secondary" onclick="sendAssistantTest()" ${y().length&&s&&n.smsConfigured?"":"disabled"}>Send test text</button>
        <button type="button" class="fda-btn secondary" onclick="runAssistantCheckNow()" ${y().length&&s&&n.smsConfigured?"":"disabled"}>Ask for an update now</button>
      </div>
    </div>

    <div class="fda-section">
      <div class="fda-section-title">Recent activity</div>
      ${O()}
    </div>
  `}function v(){const t=document.getElementById("frontDeskAssistantSheet");t&&(t.innerHTML=`<div class="fda-sheet-head">
    <div class="fda-sheet-title">Front Desk Assistant</div>
    <button type="button" class="fda-close" onclick="closeFrontDeskAssistant()" aria-label="Close">×</button>
  </div>
  <div class="fda-sheet-body">${L()}</div>`)}function q(){h(!1),x();let t=document.getElementById("frontDeskAssistantOverlay");t||(t=document.createElement("div"),t.id="frontDeskAssistantOverlay",t.className="fda-overlay",t.innerHTML='<div class="fda-sheet" id="frontDeskAssistantSheet" role="dialog" aria-modal="true" aria-label="Front Desk Assistant"></div>',t.addEventListener("click",e=>{e.target===t&&k()}),document.body.appendChild(t)),document.body.style.overflow="hidden",v(),requestAnimationFrame(()=>h(!1)),a.assistantData?u({force:!0}).catch(()=>{}):u().catch(()=>{})}function k(){document.getElementById("frontDeskAssistantOverlay")?.remove(),document.body.style.overflow="",h(!0)}function B(){a.assistantError="",v(),u({force:!0}).catch(()=>{})}function f(t,e){if(!t?.success)throw new Error(t?.message||"That did not save.");return t.data&&(a.assistantData=t.data),b(),v(),e&&r(e,"success"),t}async function P(){const t=document.getElementById("assistant-person-name")?.value.trim(),e=document.getElementById("assistant-person-role")?.value.trim(),i=document.getElementById("assistant-person-phone")?.value.trim();if(!t||!i)return r("Enter a name and mobile number.","error");try{const n=await c("POST","/api/crm/frontdesk-assistant/recipients",{name:t,role:e,phone:i});f(n,n.verificationSent?"Verification code sent.":"Phone connected.")}catch(n){r(n.message||"Could not add that phone.","error")}}async function H(t){const e=document.getElementById(`assistant-code-${t}`)?.value.trim();if(!e||e.length!==6)return r("Enter the 6-digit code.","error");try{f(await c("POST",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}/verify`,{code:e}),"Phone connected to Front Desk.")}catch(i){r(i.message||"That code could not be verified.","error")}}async function j(t){try{f(await c("POST",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}/resend`,{}),"A new code was sent.")}catch(e){r(e.message||"Could not resend the code.","error")}}async function _(t){if(window.confirm("Remove this phone from Front Desk Assistant?"))try{f(await c("DELETE",`/api/crm/frontdesk-assistant/recipients/${encodeURIComponent(t)}`),"Phone removed.")}catch(e){r(e.message||"Could not remove that phone.","error")}}async function U(){const t={enabled:!!document.getElementById("assistant-enabled")?.checked,checkFrequency:document.getElementById("assistant-frequency")?.value||"smart",dailyCheckTime:document.getElementById("assistant-check-time")?.value||"18:00",quietHoursStart:document.getElementById("assistant-quiet-start")?.value||"",quietHoursEnd:document.getElementById("assistant-quiet-end")?.value||"",timeZone:document.getElementById("assistant-time-zone")?.value||Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",notifyNewBookings:!!document.getElementById("assistant-booking-alerts")?.checked};try{f(await c("PUT","/api/crm/frontdesk-assistant",t),"Front Desk Assistant saved.")}catch(e){r(e.message||"Could not save the assistant.","error")}}async function V(){try{return f(await c("POST","/api/crm/frontdesk-assistant/test",{}),"Test text sent.")}catch(t){r(t.message||"Could not send a test text.","error")}}async function W(){try{f(await c("POST","/api/crm/frontdesk-assistant/check-now",{}),"Front Desk asked for an availability update.")}catch(t){r(t.message||"Could not send that check.","error")}}function Y(){const t=a.assistantData?.capabilities?.assistantPhone||z;try{const s=window.webkit?.messageHandlers?.marketelShell;if(s&&typeof s.postMessage=="function"){s.postMessage({type:"saveContact",name:"Marketel Front Desk",phone:t});return}}catch{}if(!a.assistantData?.capabilities?.assistantPhone)return r("The Front Desk number is not available yet.","error");const e=["BEGIN:VCARD","VERSION:3.0","FN:Marketel Front Desk","ORG:Marketel",`TEL;TYPE=CELL:${t}`,"NOTE:Text this contact when a walk-in or outside booking changes your availability.","END:VCARD"].join(`\r
`),i=URL.createObjectURL(new Blob([e],{type:"text/vcard;charset=utf-8"})),n=document.createElement("a");n.href=i,n.download="Marketel-Front-Desk.vcf",document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(i),2e3)}async function Z(){k();try{const t=await window.loadSettingsModule?.(),e=window.goLive||t?.goLive;if(typeof e=="function"){e();return}}catch{}r("Open Your page to activate Marketel.","info")}const G={activateFromAssistant:Z,addAssistantRecipient:P,closeFrontDeskAssistant:k,loadFrontDeskAssistant:u,openFrontDeskAssistant:q,removeAssistantRecipient:_,renderFrontDeskAssistantCard:b,retryFrontDeskAssistant:B,resendAssistantCode:j,runAssistantCheckNow:W,saveAssistantContact:Y,saveAssistantSettings:U,sendAssistantTest:V,verifyAssistantRecipient:H};function J(){w||(w=!0,x(),C(G))}export{Z as activateFromAssistant,P as addAssistantRecipient,k as closeFrontDeskAssistant,J as install,u as loadFrontDeskAssistant,q as openFrontDeskAssistant,_ as removeAssistantRecipient,b as renderFrontDeskAssistantCard,j as resendAssistantCode,B as retryFrontDeskAssistant,W as runAssistantCheckNow,Y as saveAssistantContact,U as saveAssistantSettings,V as sendAssistantTest,H as verifyAssistantRecipient};
