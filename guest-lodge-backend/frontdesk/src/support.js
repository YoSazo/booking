import { crm } from './state.js';
import { exposeToWindow } from './utils.js';
import { bindChatKeyboardViewport } from './chatKeyboard.js';

let supportPollTimer = null;
let supportLoadPromise = null;
let supportSending = false;
let supportKeyboardCleanup = null;

function escapeSupport(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function supportTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString([], sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ensureSupportStyles() {
  if (document.getElementById('marketelSupportStyles')) return;
  const style = document.createElement('style');
  style.id = 'marketelSupportStyles';
  style.textContent = `
    body.marketel-support-open{overflow:hidden!important;}
    .marketel-support-overlay{position:fixed;inset:0;width:100%;z-index:12000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(14,27,20,.38);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-sizing:border-box;overflow:hidden;box-shadow:0 0 0 200vmax #eff4f0;contain:layout;backface-visibility:hidden;}
    .marketel-support-dialog{width:min(620px,100%);height:min(720px,calc(100% - 36px));display:flex;flex-direction:column;overflow:hidden;background:#eff4f0;border:1px solid rgba(255,255,255,.75);border-radius:24px;box-shadow:0 24px 80px rgba(20,48,33,.28);}
    .marketel-support-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:rgba(255,255,255,.92);border-bottom:1px solid #e3ebe6;}
    .marketel-support-mark{width:38px;height:38px;display:grid;place-items:center;flex:0 0 auto;border-radius:12px;background:#e8f5ee;overflow:hidden;}
    .marketel-support-mark img{width:27px;height:27px;object-fit:contain;}
    .marketel-support-title{min-width:0;flex:1;}
    .marketel-support-title strong{display:block;font-size:15px;line-height:1.2;color:#1a2b22;}
    .marketel-support-title span{display:block;margin-top:3px;font-size:11px;color:#6b7d72;}
    .marketel-support-status{display:inline-flex;align-items:center;gap:5px;margin-right:2px;color:#2e7d5b;font-size:11px;font-weight:700;}
    .marketel-support-status::before{content:'';width:7px;height:7px;border-radius:50%;background:#4caf7d;}
    .marketel-support-close{width:40px;height:40px;display:grid;place-items:center;flex:0 0 auto;border:0;border-radius:50%;background:#edf2ef;color:#405248;font:500 23px/1 inherit;cursor:pointer;}
    .marketel-support-messages{flex:1;min-height:0;overflow-y:auto;padding:22px 18px 16px;overscroll-behavior:contain;}
    .marketel-support-empty{max-width:390px;margin:12vh auto 0;text-align:center;color:#607168;}
    .marketel-support-empty .icon{width:48px;height:48px;margin:0 auto 14px;display:grid;place-items:center;border-radius:16px;background:#e4f2e9;color:#2e7d5b;font-size:23px;}
    .marketel-support-empty strong{display:block;color:#1a2b22;font-size:18px;margin-bottom:6px;}
    .marketel-support-empty p{font-size:13px;line-height:1.55;}
    .marketel-support-row{display:flex;flex-direction:column;margin:0 0 13px;align-items:flex-start;}
    .marketel-support-row.owner{align-items:flex-end;}
    .marketel-support-label{margin:0 5px 5px;color:#7b8c82;font-size:10px;font-weight:700;}
    .marketel-support-bubble{max-width:min(82%,470px);padding:11px 13px;border-radius:17px 17px 17px 5px;background:#fff;border:1px solid #e2eae5;color:#22342a;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 2px 8px rgba(25,58,40,.04);}
    .marketel-support-row.owner .marketel-support-bubble{border:0;border-radius:17px 17px 5px 17px;background:#2e7d5b;color:#fff;box-shadow:0 5px 16px rgba(46,125,91,.18);}
    .marketel-support-composer{padding:12px max(14px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:rgba(255,255,255,.94);border-top:1px solid #e3ebe6;}
    .marketel-support-compose-row{display:flex;align-items:flex-end;gap:9px;}
    .marketel-support-input{flex:1;min-height:46px;max-height:130px;padding:12px 14px!important;resize:none;border:1.5px solid #d7e3db;border-radius:15px;background:#fff;color:#1a2b22;font:400 16px/1.4 'DM Sans',sans-serif!important;outline:none;}
    .marketel-support-input:focus{border-color:#4caf7d;box-shadow:0 0 0 3px rgba(76,175,125,.12);}
    .marketel-support-send{width:46px;height:46px;display:grid;place-items:center;flex:0 0 auto;border:0;border-radius:15px;background:#2e7d5b;color:#fff;cursor:pointer;box-shadow:0 5px 15px rgba(46,125,91,.22);}
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
      .marketel-support-head{padding-top:max(12px,env(safe-area-inset-top));}
      .marketel-support-bubble{max-width:88%;}
    }
  `;
  document.head.appendChild(style);
}

function updateSupportUnreadBadges() {
  const unread = Math.max(0, Number(crm.supportUnreadCount || 0));
  document.querySelectorAll('.marketel-support-unread').forEach((badge) => {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.classList.toggle('visible', unread > 0);
  });
}

function supportMessagesHtml() {
  const messages = crm.supportThread?.messages || [];
  if (!messages.length) {
    return `<div class="marketel-support-empty">
      <div class="icon" aria-hidden="true">?</div>
      <strong>Talk directly with Marketel.</strong>
      <p>Ask a question, report a problem, or share feedback. Your conversation will stay here.</p>
    </div>`;
  }
  return messages.map((message) => {
    const owner = message.sender === 'owner';
    return `<div class="marketel-support-row ${owner ? 'owner' : 'support'}">
      <div class="marketel-support-label">${owner ? 'You' : 'Marketel'} · ${escapeSupport(supportTime(message.createdAt))}</div>
      <div class="marketel-support-bubble">${escapeSupport(message.body)}</div>
    </div>`;
  }).join('');
}

function renderSupportConversation() {
  const messages = document.getElementById('marketelSupportMessages');
  if (!messages) return;
  messages.innerHTML = supportMessagesHtml();
  const status = document.getElementById('marketelSupportStatus');
  if (status) status.textContent = crm.supportThread?.status === 'resolved' ? 'Resolved' : 'Replies here';
  requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  updateSupportUnreadBadges();
}

async function fetchSupportThread({ markRead = false, silent = false } = {}) {
  if (supportLoadPromise) return supportLoadPromise;
  supportLoadPromise = (async () => {
    try {
      const result = await window.api('GET', '/api/crm/support');
      if (!result?.success) throw new Error(result?.message || 'Could not load support.');
      crm.supportThread = result.thread || null;
      crm.supportUnreadCount = Number(result.thread?.unread || 0);
      if (markRead && crm.supportUnreadCount > 0) {
        await window.api('POST', '/api/crm/support/read', {}).catch(() => null);
        crm.supportUnreadCount = 0;
      }
      if (document.getElementById('marketelSupportOverlay')) renderSupportConversation();
      else updateSupportUnreadBadges();
      return crm.supportThread;
    } catch (error) {
      if (!silent) {
        const messages = document.getElementById('marketelSupportMessages');
        if (messages) messages.innerHTML = `<div class="marketel-support-empty"><strong>Could not load this conversation.</strong><p>${escapeSupport(error.message || 'Check your connection and try again.')}</p></div>`;
      }
      throw error;
    }
  })();
  try {
    return await supportLoadPromise;
  } finally {
    supportLoadPromise = null;
  }
}

function startSupportPolling() {
  stopSupportPolling();
  supportPollTimer = window.setInterval(() => {
    if (document.hidden || !document.getElementById('marketelSupportOverlay')) return;
    fetchSupportThread({ markRead: true, silent: true }).catch(() => {});
  }, 15000);
}

function stopSupportPolling() {
  if (supportPollTimer) window.clearInterval(supportPollTimer);
  supportPollTimer = null;
}

function createSupportOverlay() {
  ensureSupportStyles();
  let overlay = document.getElementById('marketelSupportOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'marketelSupportOverlay';
  overlay.className = 'marketel-support-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.onclick = (event) => {
    if (event.target === overlay) closeSupportConversation();
  };
  overlay.innerHTML = `<section class="marketel-support-dialog" role="dialog" aria-modal="true" aria-labelledby="marketelSupportTitle">
    <header class="marketel-support-head">
      <div class="marketel-support-mark"><img src="/marketellogo.svg" alt=""></div>
      <div class="marketel-support-title">
        <strong id="marketelSupportTitle">Message Marketel</strong>
        <span>Questions, problems, and feedback</span>
      </div>
      <span class="marketel-support-status" id="marketelSupportStatus">Replies here</span>
      <button type="button" class="marketel-support-close" onclick="closeSupportConversation()" aria-label="Close support">×</button>
    </header>
    <div class="marketel-support-messages" id="marketelSupportMessages"><div class="marketel-support-loading">Loading conversation…</div></div>
    <footer class="marketel-support-composer">
      <div class="marketel-support-compose-row">
        <textarea class="marketel-support-input" id="marketelSupportInput" maxlength="4000" rows="1" placeholder="Write a message…" aria-label="Message Marketel"></textarea>
        <button type="button" class="marketel-support-send" id="marketelSupportSend" onclick="sendMarketelSupportMessage()" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div class="marketel-support-foot">Replies also go to the property email · <a href="mailto:support@bookmarketel.com">Email fallback</a></div>
    </footer>
  </section>`;
  document.body.appendChild(overlay);
  supportKeyboardCleanup = bindChatKeyboardViewport(overlay, {
    fieldSelector: '.marketel-support-input',
    scrollSelector: '.marketel-support-messages',
  });
  const input = document.getElementById('marketelSupportInput');
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(130, input.scrollHeight)}px`;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        sendMarketelSupportMessage();
      }
    });
  }
  return overlay;
}

export async function openSupportConversation() {
  createSupportOverlay();
  document.body.classList.add('marketel-support-open');
  window.setNativeModalOpen?.('marketel-support', true);
  startSupportPolling();
  await fetchSupportThread({ markRead: true }).catch(() => null);
  document.getElementById('marketelSupportInput')?.focus({ preventScroll: true });
}

export function closeSupportConversation() {
  stopSupportPolling();
  supportKeyboardCleanup?.();
  supportKeyboardCleanup = null;
  document.getElementById('marketelSupportOverlay')?.remove();
  document.body.classList.remove('marketel-support-open');
  window.setNativeModalOpen?.('marketel-support', false);
}

export async function sendMarketelSupportMessage() {
  if (supportSending) return;
  const input = document.getElementById('marketelSupportInput');
  const button = document.getElementById('marketelSupportSend');
  const message = String(input?.value || '').trim();
  if (!message) {
    window.toast?.('Write a message first.', 'error');
    input?.focus();
    return;
  }
  supportSending = true;
  if (button) button.disabled = true;
  try {
    const result = await window.api('POST', '/api/crm/support', {
      message,
      surface: `frontdesk-${crm.currentFilter || 'unknown'}`,
      pagePath: `${window.location.pathname}${window.location.search}`,
    });
    if (!result?.success) throw new Error(result?.message || 'Could not send that message.');
    crm.supportThread = result.thread || crm.supportThread;
    crm.supportUnreadCount = 0;
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    renderSupportConversation();
  } catch (error) {
    window.toast?.(error.message || 'Could not send. Try again.', 'error');
  } finally {
    supportSending = false;
    if (button) button.disabled = false;
    input?.focus();
  }
}

export async function loadSupportSummary() {
  return fetchSupportThread({ markRead: false, silent: true });
}

export function install() {
  ensureSupportStyles();
  exposeToWindow({
    closeSupportConversation,
    openSupportConversation,
    sendMarketelSupportMessage,
  });
}
