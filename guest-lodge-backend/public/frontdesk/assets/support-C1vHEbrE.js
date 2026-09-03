import{e as h,c as o}from"./settings-D2ZEeQ78.js";import{b as x}from"./index-CHgmK1pR.js";let n=null,p=null,s=!1,i=null;function l(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function b(e){const t=new Date(e);if(!Number.isFinite(t.getTime()))return"";const r=t.toDateString()===new Date().toDateString();return t.toLocaleString([],r?{hour:"numeric",minute:"2-digit"}:{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}function u(){if(document.getElementById("marketelSupportStyles"))return;const e=document.createElement("style");e.id="marketelSupportStyles",e.textContent=`
    body.marketel-support-open{overflow:hidden!important;}
    .marketel-support-overlay{position:fixed;inset:0;width:100%;z-index:100100;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(14,27,20,.38);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-sizing:border-box;overflow:hidden;box-shadow:0 0 0 200vmax #eff4f0;contain:layout;backface-visibility:hidden;}
    .marketel-support-dialog{width:min(660px,100%);height:min(760px,calc(100% - 36px));display:flex;flex-direction:column;overflow:hidden;background:#eff4f0;border:1px solid rgba(255,255,255,.75);border-radius:24px;box-shadow:0 24px 80px rgba(20,48,33,.28);}
    .marketel-support-head{display:grid;grid-template-columns:64px minmax(0,1fr) 64px;align-items:center;gap:8px;min-height:68px;padding:10px 14px;background:rgba(255,255,255,.88);border-bottom:1px solid #e3ebe6;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
    .marketel-support-title{min-width:0;text-align:center;}
    .marketel-support-title strong{display:block;overflow:hidden;font-size:17px;line-height:1.2;color:#1a2b22;text-overflow:ellipsis;white-space:nowrap;}
    .marketel-support-title span{display:block;margin-top:3px;font-size:10px;color:#6b7d72;}
    .marketel-support-status{display:inline-flex;align-items:center;justify-self:end;gap:5px;color:#2e7d5b;font-size:10px;font-weight:700;white-space:nowrap;}
    .marketel-support-status::before{content:'';width:7px;height:7px;border-radius:50%;background:#4caf7d;}
    .marketel-support-close{width:auto;height:42px;padding:0 2px;border:0;background:transparent;color:#2e7d5b;font:750 14px/1 inherit;text-align:left;cursor:pointer;}
    .marketel-support-messages{flex:1;min-height:0;overflow-y:auto;padding:22px 18px 16px;overscroll-behavior:contain;}
    .marketel-support-empty{max-width:390px;margin:12vh auto 0;text-align:center;color:#607168;}
    .marketel-support-empty .icon{width:48px;height:48px;margin:0 auto 14px;display:grid;place-items:center;border-radius:16px;background:#e4f2e9;color:#2e7d5b;font-size:23px;}
    .marketel-support-empty strong{display:block;color:#1a2b22;font-size:18px;margin-bottom:6px;}
    .marketel-support-empty p{font-size:13px;line-height:1.55;}
    .marketel-support-row{display:flex;flex-direction:column;margin:0 0 13px;align-items:flex-start;}
    .marketel-support-row.owner{align-items:flex-end;}
    .marketel-support-label{margin:0 5px 4px;color:#7b8c82;font-size:9px;font-weight:600;}
    .marketel-support-bubble{max-width:min(82%,470px);padding:10px 14px;border-radius:18px;background:#fff;border:0;color:#22342a;font-size:15px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:none;}
    .marketel-support-row.owner .marketel-support-bubble{border:0;border-radius:18px;background:#2e7d5b;color:#fff;box-shadow:none;}
    .marketel-support-composer{padding:8px max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(255,255,255,.82);border-top:1px solid #e3ebe6;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
    .marketel-support-compose-row{display:flex;align-items:flex-end;gap:9px;}
    .marketel-support-input{flex:1;min-height:42px;max-height:130px;padding:10px 14px!important;resize:none;border:0;border-radius:20px;background:#fff;color:#1a2b22;font:400 16px/1.4 -apple-system,BlinkMacSystemFont,'DM Sans',sans-serif!important;outline:none;box-shadow:0 0 0 1px rgba(35,72,49,.04);}
    .marketel-support-input:focus{box-shadow:0 0 0 1.5px rgba(46,125,91,.24);}
    .marketel-support-send{width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border:0;border-radius:50%;background:#2e7d5b;color:#fff;cursor:pointer;box-shadow:none;}
    .marketel-support-send:disabled{opacity:.48;cursor:wait;box-shadow:none;}
    .marketel-support-send svg{width:19px;height:19px;}
    .marketel-support-foot{margin:8px 2px 0;text-align:center;color:#84928a;font-size:10px;line-height:1.35;}
    .marketel-support-foot a{color:#587166;text-decoration:none;}
    .marketel-support-overlay.marketel-chat-keyboard-open .marketel-support-composer{padding-bottom:calc(var(--marketel-chat-keyboard-inset,0px) + 8px);background:#fff;}
    .marketel-support-overlay.marketel-chat-keyboard-open .marketel-support-foot{display:none;}
    .marketel-support-loading{height:100%;display:grid;place-items:center;color:#6b7d72;font-size:13px;}
    .marketel-support-unread{display:none;min-width:19px;height:19px;padding:0 6px;align-items:center;justify-content:center;border-radius:999px;background:#e05252;color:#fff;font-size:10px;font-weight:800;line-height:19px;}
    .marketel-support-unread.visible{display:inline-flex;}
    @media(max-width:600px){
      .marketel-support-overlay{padding:0;align-items:stretch;}
      .marketel-support-dialog{width:100%;height:100%;max-height:none;border:0;border-radius:0;}
      .marketel-support-head{padding-top:max(10px,env(safe-area-inset-top));}
      .marketel-support-bubble{max-width:88%;}
    }
  `,document.head.appendChild(e)}function c(){const e=Math.max(0,Number(o.supportUnreadCount||0));document.querySelectorAll(".marketel-support-unread").forEach(t=>{t.textContent=e>99?"99+":String(e),t.classList.toggle("visible",e>0)})}function w(){const e=o.supportThread?.messages||[];return e.length?e.map(t=>{const r=t.sender==="owner";return`<div class="marketel-support-row ${r?"owner":"support"}">
      <div class="marketel-support-label">${r?"You":"Marketel"} · ${l(b(t.createdAt))}</div>
      <div class="marketel-support-bubble">${l(t.body)}</div>
    </div>`}).join(""):`<div class="marketel-support-empty">
      <div class="icon" aria-hidden="true">?</div>
      <strong>Talk directly with Marketel.</strong>
      <p>Ask a question, report a problem, or share feedback. Your conversation will stay here.</p>
    </div>`}function m(){const e=document.getElementById("marketelSupportMessages");if(!e)return;e.innerHTML=w();const t=document.getElementById("marketelSupportStatus");t&&(t.textContent=o.supportThread?.status==="resolved"?"Resolved":"Replies here"),requestAnimationFrame(()=>{e.scrollTop=e.scrollHeight}),c()}async function d({markRead:e=!1,silent:t=!1}={}){if(p)return p;p=(async()=>{try{const r=await window.api("GET","/api/crm/support");if(!r?.success)throw new Error(r?.message||"Could not load support.");return o.supportThread=r.thread||null,o.supportUnreadCount=Number(r.thread?.unread||0),e&&o.supportUnreadCount>0&&(await window.api("POST","/api/crm/support/read",{}).catch(()=>null),o.supportUnreadCount=0),document.getElementById("marketelSupportOverlay")?m():c(),o.supportThread}catch(r){if(!t){const a=document.getElementById("marketelSupportMessages");a&&(a.innerHTML=`<div class="marketel-support-empty"><strong>Could not load this conversation.</strong><p>${l(r.message||"Check your connection and try again.")}</p></div>`)}throw r}})();try{return await p}finally{p=null}}function y(){g(),n=window.setInterval(()=>{document.hidden||!document.getElementById("marketelSupportOverlay")||d({markRead:!0,silent:!0}).catch(()=>{})},15e3)}function g(){n&&window.clearInterval(n),n=null}function v(){u();let e=document.getElementById("marketelSupportOverlay");if(e)return e;e=document.createElement("div"),e.id="marketelSupportOverlay",e.className="marketel-support-overlay",e.setAttribute("role","presentation"),e.onclick=r=>{r.target===e&&f()},e.innerHTML=`<section class="marketel-support-dialog" role="dialog" aria-modal="true" aria-labelledby="marketelSupportTitle">
    <header class="marketel-support-head">
      <button type="button" class="marketel-support-close" onclick="closeSupportConversation()" aria-label="Close support">Done</button>
      <div class="marketel-support-title">
        <strong id="marketelSupportTitle">Marketel</strong>
        <span>Support conversation</span>
      </div>
      <span class="marketel-support-status" id="marketelSupportStatus">Replies here</span>
    </header>
    <div class="marketel-support-messages" id="marketelSupportMessages"><div class="marketel-support-loading">Loading conversation…</div></div>
    <footer class="marketel-support-composer">
      <div class="marketel-support-compose-row">
        <textarea class="marketel-support-input" id="marketelSupportInput" maxlength="4000" rows="1" placeholder="Write a message…" aria-label="Message Marketel"></textarea>
        <button type="button" class="marketel-support-send" id="marketelSupportSend" onclick="sendMarketelSupportMessage()" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>
        </button>
      </div>
      <div class="marketel-support-foot">Replies also go to the property email · <a href="mailto:support@bookmarketel.com">Email fallback</a></div>
    </footer>
  </section>`,document.body.appendChild(e),i=x(e,{fieldSelector:".marketel-support-input",scrollSelector:".marketel-support-messages"});const t=document.getElementById("marketelSupportInput");return t&&(t.addEventListener("input",()=>{t.style.height="auto",t.style.height=`${Math.min(130,t.scrollHeight)}px`}),t.addEventListener("keydown",r=>{r.key==="Enter"&&(r.metaKey||r.ctrlKey)&&(r.preventDefault(),k())})),e}async function S(){typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()&&typeof window.nativeShellPost=="function"&&window.nativeShellPost({type:"openSupport"})||(v(),document.body.classList.add("marketel-support-open"),window.setNativeModalOpen?.("marketel-support",!0),y(),await d({markRead:!0}).catch(()=>null),document.getElementById("marketelSupportInput")?.focus({preventScroll:!0}))}function f(){g(),i?.(),i=null,document.getElementById("marketelSupportOverlay")?.remove(),document.body.classList.remove("marketel-support-open"),window.setNativeModalOpen?.("marketel-support",!1)}async function k(){if(s)return;const e=document.getElementById("marketelSupportInput"),t=document.getElementById("marketelSupportSend"),r=String(e?.value||"").trim();if(!r){window.toast?.("Write a message first.","error"),e?.focus();return}s=!0,t&&(t.disabled=!0);try{const a=await window.api("POST","/api/crm/support",{message:r,surface:`frontdesk-${o.currentFilter||"unknown"}`,pagePath:`${window.location.pathname}${window.location.search}`});if(!a?.success)throw new Error(a?.message||"Could not send that message.");o.supportThread=a.thread||o.supportThread,o.supportUnreadCount=0,e&&(e.value="",e.style.height="auto"),m()}catch(a){window.toast?.(a.message||"Could not send. Try again.","error")}finally{s=!1,t&&(t.disabled=!1),e?.focus()}}async function E(){return d({markRead:!1,silent:!0})}function T(){u(),h({closeSupportConversation:f,openSupportConversation:S,sendMarketelSupportMessage:k})}export{f as closeSupportConversation,T as install,E as loadSupportSummary,S as openSupportConversation,k as sendMarketelSupportMessage};
