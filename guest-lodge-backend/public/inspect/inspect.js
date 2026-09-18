const native = location.protocol === 'capacitor:' || location.protocol === 'ionic:';
if(native)document.documentElement.classList.add('native-inspect-shell');
const API = native ? 'https://bookmarketel.com/api/inspect' : '/api/inspect';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session = localStorage.getItem('inspect.session') || '';
let account = null, draft = null, reports = [], nextReportCursor = null, preview = false, storefront = null, storefrontWaiters = [];
let currentPage = 'current';
let reportsCache = null, propertiesCache = null, listRequest = 0;
const DEFAULT_APP_STORE_URL = 'https://apps.apple.com/us/app/marketel/id6801005750';
let appStoreUrl = DEFAULT_APP_STORE_URL;
// $29 x 12 = $348, so the annual plan saves $149 — and its report allowance is
// the monthly one times twelve, because the quota resets per billing period.
const PLANS = Object.freeze({
  year: Object.freeze({ price: 199, per: '/year', save: 'Save $149', reports: 360, terms: '$199 charged today, then yearly until cancelled.' }),
  month: Object.freeze({ price: 29, per: '/month', save: '', reports: 30, terms: '$29 charged today, then monthly until cancelled.' }),
});
let planInterval = 'year';
let editorStep = 'details';
const urls = new Map();
const attributionKey = 'inspect.metaAttribution.v1';
const cookieValue = name => {
  try {
    const match = String(document.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  } catch { return ''; }
};
const validMetaId = value => /^fb\.1\.[A-Za-z0-9._-]+$/.test(String(value || '')) ? String(value).slice(0,220) : '';
const validClickId = value => /^[A-Za-z0-9._-]{1,180}$/.test(String(value || '')) ? String(value) : '';
function writeMetaCookie(name,value){
  if(!/^https?:$/.test(location.protocol)||!value)return;
  document.cookie=`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=7776000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
}
function generatedFbp(){
  const words=new Uint32Array(2);crypto.getRandomValues(words);
  return `fb.1.${Date.now()}.${words[0]}${words[1]}`;
}
function captureInspectAttribution(){
  if(native||!/^https?:$/.test(location.protocol))return null;
  const params=new URLSearchParams(location.search),fbclid=validClickId(params.get('fbclid'));
  let fbp=validMetaId(cookieValue('_fbp'));
  if(!fbp){fbp=generatedFbp();writeMetaCookie('_fbp',fbp);}
  let fbc=fbclid?`fb.1.${Date.now()}.${fbclid}`:validMetaId(cookieValue('_fbc'));
  if(fbclid)writeMetaCookie('_fbc',fbc);
  let stored={};
  try{stored=JSON.parse(localStorage.getItem(attributionKey)||'{}')||{};}catch{}
  const source=new URL(location.origin+location.pathname);
  const fields={utm_source:'utmSource',utm_medium:'utmMedium',utm_campaign:'utmCampaign',utm_content:'utmContent',utm_term:'utmTerm'};
  const current={fbp,...(fbc?{fbc}:{}),sourceUrl:source.toString()};
  for(const [parameter,key] of Object.entries(fields)){
    const value=String(params.get(parameter)||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180);
    if(value){current[key]=value;source.searchParams.set(parameter,value);}
  }
  if(fbclid)source.searchParams.set('fbclid',fbclid);
  current.sourceUrl=source.toString();
  const result=!Object.keys(stored).length||fbclid?current:{...stored,fbp};
  try{localStorage.setItem(attributionKey,JSON.stringify(result));}catch{}
  return result;
}
const inspectAttribution=captureInspectAttribution();
const localDate = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const uid = () => crypto.randomUUID?.() || `${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(2)).join('_')}`;
// Who prepares the report does not change between walkthroughs, so it is
// remembered on the device. Report type deliberately is not: it prints on a
// document used in deposit disputes, and inheriting last week's "move-out" is
// worse than retyping one dropdown.
const AUTHOR_KEY = 'inspect.author';
const rememberedAuthor = () => { try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch { return ''; } };
const storeAuthor = value => { try { const name = String(value || '').trim(); if (name) localStorage.setItem(AUTHOR_KEY, name); } catch {} };
// A whole unit is five to eight rooms, and every one of them used to arrive
// called "Room". Names already used in this report are skipped.
const COMMON_ROOMS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Closet', 'Laundry', 'Balcony'];
const nextRoomName = rooms => {
  const used = new Set((rooms || []).map(room => String(room.name || '').trim().toLowerCase()));
  return COMMON_ROOMS.find(name => !used.has(name.toLowerCase())) || 'Room';
};
const newDocument = propertyName => ({ propertyName: propertyName || '', author: rememberedAuthor(), type: 'routine', date: localDate(), rooms: [{ name: 'Living room', observation: '', issue: false, photos: [] }], signatures: [] });
const db = new Promise((resolve, reject) => {
  const request = indexedDB.open('marketel-inspect', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts');
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
async function stored(action, value) {
  const database = await db;
  return new Promise((resolve, reject) => {
    const tx = database.transaction('drafts', action === 'get' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('drafts');
    const request = action === 'get' ? store.get('current') : action === 'delete' ? store.delete('current') : store.put(value, 'current');
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
function notice(message, type = '') {
  const box = $('notice');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.textContent = message;
  box.appendChild(el);
  // Slightly outlives the CSS fade so the pill is never removed mid-animation.
  setTimeout(() => el.remove(), 3800);
  while (box.children.length > 3) box.firstChild.remove();
}
async function persist() { if (draft) await stored('put', draft); }
// True only when this device holds work the server has not seen. Without it the
// "save your draft online first" warning fired even straight after saving.
function draftUnsaved(){ return !!draft && !draft.finalizedAt && (!draft.serverId || draft.dirty === true); }
function hasUnfinishedDraft(){ return !!draft && !draft.finalizedAt; }
function remember() { if (draft) draft.dirty = true; persist().catch(() => notice('Device storage is full or unavailable. Keep this page open and save your report online.')); }
function dropSession() { session = ''; account = null; try { localStorage.removeItem('inspect.session'); } catch {} }
// A 401 from any single call is not proof the session is gone. Background and
// optional calls — /billing/refresh on every foreground, for one — used to sign
// the operator out silently, because their errors are swallowed by .catch().
// Re-check /account before believing it, and never touch the local draft: it
// lives in IndexedDB and must survive an expired token.
let sessionCheck = null;
function confirmSessionLost() {
  if (!session) return Promise.resolve(true);
  if (!sessionCheck) sessionCheck = (async () => {
    let lost = false;
    try { lost = (await fetch(`${API}/account`, { headers: { Authorization: `Bearer ${session}` } })).status === 401; }
    catch { lost = false; }
    if (lost) { dropSession(); updateHeader(); notice('Signed out. Your report is safe on this device — sign in again to keep saving it.'); }
    return lost;
  })().finally(() => { sessionCheck = null; });
  return sessionCheck;
}
async function api(path, options = {}) {
  const headers = { ...(session ? { Authorization: `Bearer ${session}` } : {}), ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) };
  const response = await fetch(API + path, { ...options, headers: { ...headers, ...options.headers }, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) await confirmSessionLost();
    throw Object.assign(new Error(error.error || 'Could not complete that action. Please retry.'), { status: response.status });
  }
  return options.blob ? response.blob() : response.json();
}
async function run(fn, trigger = document.activeElement?.closest?.('button')) {
  if (trigger?.disabled) return;
  if (trigger) { trigger.disabled = true; trigger.classList.add('is-busy'); }
  try { await fn(); } catch (error) { notice(error.message, 'error'); }
  finally { if (trigger) { trigger.disabled = false; trigger.classList.remove('is-busy'); } }
}
// Screens inherited the previous screen's scroll, so Preview opened halfway down
// a long editor instead of at the top of the report.
let currentScreen='';
function enterScreen(key){
  const keep = currentScreen===key ? window.scrollY : 0;
  currentScreen=key;
  requestAnimationFrame(()=>{ try { window.scrollTo({ top: keep, behavior: 'auto' }); } catch { window.scrollTo(0, keep); } });
}
function syncNativeInspectState(page=currentPage,visible=!$('dialog').open){
  if(!native)return;
  window.webkit?.messageHandlers?.marketelShell?.postMessage({
    type:'inspectState',visible,selectedTab:page,authenticated:!!account,hasUnfinishedDraft:hasUnfinishedDraft(),
  });
}
// A sheet is a card on top of the app, so the shell stays put — `true` keeps the
// native header and tab bar visible instead of suppressing them.
// `overflow: hidden` does not stop iOS scrolling the document behind a fixed
// sheet — which is how a sheet ended up stranded at the top of a white page
// with the keyboard up. Pinning the body does stop it, and the offset has to
// be restored on close, because pinning jumps the page to the top.
let lockedScrollY=0;
function lockPage(){
  if(document.documentElement.classList.contains('sheet-open'))return;
  lockedScrollY=window.scrollY||window.pageYOffset||0;
  document.documentElement.classList.add('sheet-open');
  document.body.style.top=`-${lockedScrollY}px`;
}
function unlockPage(){
  if(!document.documentElement.classList.contains('sheet-open'))return;
  document.documentElement.classList.remove('sheet-open');
  document.body.style.top='';
  window.scrollTo(0,lockedScrollY);
  lockedScrollY=0;
}
function modal(content, { fullscreen = false } = {}) {
  $('dialog-body').innerHTML = content;
  document.documentElement.classList.toggle('sheet-full', fullscreen);
  if (!$('dialog').open) { lockPage(); $('dialog').showModal(); }
  // Deliberately not focusing the first field. Autofocus opened the keyboard
  // the instant a sheet appeared, and on iOS that drags in everything at once:
  // the keyboard shrinks the visual viewport, iOS pans it to reveal the focused
  // field, and it computes where to pan against a body we have pinned at
  // -scrollY — so the sheet landed somewhere different depending on where the
  // page happened to be scrolled. Opening with no keyboard makes the sheet
  // stable, and the field is one tap away when they are ready for it.
  $('dialog').focus();
  // A sheet that needs the whole screen has to take the native header and tab
  // bar with it: UIKit draws those over the webview, so no z-index reaches past
  // them and a tall sheet is simply cut off underneath.
  syncNativeInspectState(currentPage, !fullscreen);
  settleSheet();
}
// The sheet is nudged up by however much the keyboard actually covers and no
// further, clamped so it can never ride up over the status bar.
function settleSheet(){
  const dialog=$('dialog');
  if(!dialog?.open)return;
  // A full-screen sheet is already exactly where it belongs; shifting it would
  // only push it off one edge or the other.
  if(document.documentElement.classList.contains('sheet-full')){dialog.style.setProperty('--sheet-shift','0px');return;}
  const style=getComputedStyle(document.documentElement);
  const number=name=>parseFloat(style.getPropertyValue(name))||0;
  const keyboard=number('--kb');
  // Two separate reasons the usable band is not the viewport.
  //
  // The native header and tab bar sit inside the viewport and are drawn over
  // it, so centring in the whole thing put a tall sheet's first line under the
  // header.
  //
  // And on iOS Safari a keyboard does not shrink the layout viewport — it
  // shrinks the visual one and lets the user pan it around inside the layout
  // viewport. A position:fixed sheet is fixed to the layout viewport, so it
  // slides off the top as though it were page content, which no amount of
  // locking document scroll can prevent. Follow the visual viewport instead.
  // offsetTop is trusted only while a keyboard is up: iOS 26 leaves it stale
  // afterwards, and reading it then used to pin the sheet to the top.
  const viewport=window.visualViewport;
  const viewTop=keyboard>0&&viewport?viewport.offsetTop:0;
  const viewHeight=viewport?viewport.height:window.innerHeight;
  const top=viewTop+number('--safe-top')+number('--shell-top')+12;
  const bottom=viewTop+viewHeight-Math.max(number('--kb-native'),number('--shell-bottom'))-12;
  // Derived from the sheet's height rather than its rect: the shift is animated,
  // so a rect read mid-transition would measure a position it is still leaving.
  const height=dialog.offsetHeight;
  const centre=window.innerHeight/2;
  // Centre inside the band that is usable, not inside the viewport. Shifting
  // only far enough to fit pinned the sheet against whichever edge crowded it
  // first, which with the keyboard up read as sitting too high.
  const maxUp=(centre-height/2)-top;
  const maxDown=bottom-(centre+height/2);
  const shift=height>=(bottom-top)
    ? maxUp                                                  // taller than the band: keep the top on screen
    : Math.max(-maxDown,Math.min(centre-(top+bottom)/2,maxUp));
  dialog.style.setProperty('--sheet-shift',`${-Math.round(shift)}px`);
}
const haptic=()=>{if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectHaptic'});};
// Best effort by design: a dropped count is better than a blocked walkthrough.
// `anonymous` routes past the auth boundary for the one event that has to fire
// before the email wall — otherwise the owners it exists to count are invisible.
const logInspect=(name,anonymous=false)=>{
  if(!session&&!anonymous)return;
  api(session?'/events':'/events/anon',{method:'POST',body:{name}}).catch(()=>{});
};
$('dialog-close').onclick = () => $('dialog').close();
function setActiveNav(page) { currentPage=page;document.querySelectorAll('#nav button').forEach(button => button.classList.toggle('is-active', page === 'current' ? button.id === 'current-report' : button.dataset.page === page));syncNativeInspectState(page); }
function updateHeader() {
  $('account-button').textContent = account ? 'Account' : 'Sign in';
  $('nav').hidden = !account;
  document.documentElement.classList.toggle('inspect-authenticated',!!account);
  const current=$('current-report');
  if(current){const unfinished=hasUnfinishedDraft();current.dataset.page=unfinished?'current':'new';current.textContent=unfinished?'In Progress':'+ New Report';}
  syncNativeInspectState(currentPage,true);
}
function photoURL(id) {
  if (urls.has(id)) return urls.get(id);
  const file = draft.files.find(f => f.id === id);
  if (!file?.blob) return '';
  const url = URL.createObjectURL(file.blob); urls.set(id, url); return url;
}
function clearURLs() { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); }
// The hero promises a transformation, so the proof beneath it has to show one
// rather than the finished artifact. Canned, not a recording: it must be
// legible on first paint and still read correctly when frozen.
const DEMO_SAID = 'Living room, small scuff on the wall beside the doorway, nothing else, everything looks fine.';
let demoTimer = 0;
function playDemo(){
  const demo=$('demo'),said=$('demo-said');
  if(!demo||!said)return;
  clearTimeout(demoTimer);
  // inspect.css only collapses CSS animation and transition durations under
  // reduced motion; a JS typing loop runs straight through that, so ask here.
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
    said.textContent=DEMO_SAID;demo.classList.add('is-in');return;
  }
  const cycle=()=>{
    // The landing screen can be replaced mid-loop; stop rather than resurrect it.
    if(!document.body.contains(said))return;
    said.textContent='';demo.classList.remove('is-in');
    let at=0;
    const type=()=>{
      if(!document.body.contains(said))return;
      said.textContent=DEMO_SAID.slice(0,++at);
      if(at<DEMO_SAID.length){demoTimer=setTimeout(type,32);return;}
      demoTimer=setTimeout(()=>{demo.classList.add('is-in');demoTimer=setTimeout(cycle,4600);},420);
    };
    type();
  };
  cycle();
}
function landing() {
  enterScreen('landing');
  updateHeader();
  setActiveNav('current');
  $('app').innerHTML = `<section class="hero"><div class="eyebrow">For small property managers</div><h1>Talk through each room.<br>Inspect writes the notes.</h1><p class="muted">Your photos and observations, packaged into a finished report before you leave.</p><button id="start">Create your first report free</button><p><small>One complete report free. No card.<br>Then $199/year or $29/month. One operator.</small></p><button id="sign-in" class="quiet">Already have reports? Sign in</button><article class="card demo" id="demo"><small class="eyebrow">EXAMPLE · NOT A REAL INSPECTION</small><div class="demo-step"><span class="demo-label">You say</span><blockquote id="demo-said"></blockquote></div><div class="demo-arrow" aria-hidden="true">↓</div><div class="demo-step" id="demo-result"><span class="demo-label">Inspect writes</span><p class="demo-note">Small scuff on the wall beside the doorway. No other observations recorded.</p><em class="demo-badge">Issue noted</em></div><small>Add your photos, then export a PDF or a private link.</small></article><p><small>Your report records what you observe. It is not a professional building inspection or legal certification.</small></p></section>`;
  playDemo();
  $('start').onclick = () => start();
  // The native shell hides the web header, so without this there was no way back
  // in after signing out short of the overflow menu.
  if($('sign-in'))$('sign-in').onclick=()=>ensureAuth(()=>run(()=>openAccountHome()));
}
async function start(propertyName = '') {
  if (draftUnsaved() && !confirm('Start a new report? Your current draft is not saved online yet.')) return;
  clearURLs(); draft = { document: newDocument(propertyName), files: [], serverId: null, finalizedAt: null }; preview = false;
  await persist(); editor();
}
function editor(step) {
  if (!draft) return landing(); updateHeader();
  setActiveNav('current');
  const d = draft.document;
  d.signatures ||= [];
  if (preview || draft.finalizedAt) return reportPreview();
  // The draft decides which step opens: an unnamed report needs its details, a
  // named one is ready for the work. Returning lands on the work, not the form.
  editorStep = step || (d.propertyName.trim() ? 'rooms' : 'details');
  enterScreen(`editor:${editorStep}`);
  const bar = `<div class="screen-bar">${account
    ? '<button type="button" id="editor-back" class="quiet">← All reports</button>'
    : '<button type="button" id="editor-signin" class="quiet">Already have reports? Sign in</button>'}<button type="button" id="editor-discard" class="quiet danger">Discard</button></div>`;
  if (editorStep === 'details') {
    $('app').innerHTML = `${bar}<div class="row spread"><div><small class="eyebrow">New condition report</small><h1>Which property?</h1></div></div><section class="card grid"><div class="property-field"><label>Property / unit name<input id="property" maxlength="160" value="${esc(d.propertyName)}" placeholder="Oak Street · Unit 2"></label>${account?'<button type="button" id="use-existing-property" class="quiet inline-action">Use existing property</button>':''}</div><label>Your name<input id="author" maxlength="120" value="${esc(d.author)}" placeholder="Report prepared by"></label><label class="date-field">Inspection date<input type="date" id="date" value="${esc(d.date)}"></label><label>Report type<select id="type">${['routine','move-in','move-out'].map(t => `<option ${d.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></section><div class="actions row"><button id="to-rooms">Continue →</button></div>`;
    for (const [id,key] of [['property','propertyName'],['author','author'],['date','date'],['type','type']]) $(id).oninput = event => { d[key] = event.target.value; if (key === 'author') storeAuthor(event.target.value); remember(); };
    if($('use-existing-property'))$('use-existing-property').onclick=()=>run(()=>chooseExistingProperty());
    $('to-rooms').onclick = () => {
      if(!d.propertyName.trim())return notice('Enter a property or unit name first.','error');
      haptic();editor('rooms');
    };
  } else {
    $('app').innerHTML = `${bar}<div class="row spread"><div><small class="eyebrow">${esc(d.propertyName)||'New condition report'}</small><h1>What did you observe?</h1></div><button type="button" class="quiet" id="to-details">← Details</button></div><div id="rooms">${d.rooms.map((r,i) => `<section class="card room-card" data-room="${i}"><label>Room name<input data-field="name" maxlength="100" value="${esc(r.name)}"></label><div class="row capture-actions"><label class="button secondary">Add photos<input type="file" data-files="${i}" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></label>${native
      ? `<button type="button" class="secondary" data-native-camera="${i}">Take photo</button>`
      : `<label class="button secondary">Take photo<input type="file" data-camera="${i}" accept="image/*" capture="environment" hidden></label>`}</div>${r.photos.length>1?'<p class="drag-hint">Press and hold a photo to lift it, then drag it where you want it.</p>':''}<div class="photo-grid" data-photo-grid="${i}">${r.photos.map((id,p) => `<figure data-photo-id="${esc(id)}" data-photo-room="${i}"><img src="${esc(photoURL(id))}" alt="Property photo ${p+1}"><button type="button" class="photo-x" data-delete-id="${i},${esc(id)}" aria-label="Remove photo">&#10005;</button><div class="photo-meta"><figcaption>${draft.files.find(f=>f.id===id)?.remoteId ? 'Uploaded' : 'On this device'}</figcaption><details class="photo-menu"><summary aria-label="Photo actions">•••</summary><div><button class="quiet" data-move-id="${i},${esc(id)},-1">Move earlier</button><button class="quiet" data-move-id="${i},${esc(id)},1">Move later</button><button class="quiet danger" data-delete-id="${i},${esc(id)}">Remove</button></div></details></div></figure>`).join('')}</div><div class="note-lead"><button class="wide" data-voice="${i}">Talk through this room</button><p class="muted">Say what you see. Inspect writes the note.</p></div><details class="write-own" ${r.observation.trim() ? 'open' : ''}><summary>Write it myself</summary><label>Observations<textarea maxlength="4000" data-field="observation" placeholder="Describe only what you observed.">${esc(r.observation)}</textarea></label><button class="quiet" data-ai="${i}">Polish typed note</button></details><div class="row note-tools"><label class="issue"><input data-field="issue" type="checkbox" ${r.issue ? 'checked' : ''}>Issue noted</label></div>${d.rooms.length>1?`<footer class="room-footer"><button class="quiet danger" data-remove-room="${i}">Remove this room</button></footer>`:''}</section>`).join('')}</div><button id="add-room" class="secondary">+ Add room</button><div class="actions row"><button id="preview">Preview report →</button><button id="save" class="quiet">Save online</button></div>`;
    $('to-details').onclick = () => { haptic();editor('details'); };
    $('rooms').oninput = event => { const field = event.target.dataset.field; if (!field) return; d.rooms[Number(event.target.closest('[data-room]').dataset.room)][field] = field === 'issue' ? event.target.checked : event.target.value; remember(); };
    $('rooms').onchange = event => { if (event.target.matches('input[type=file]')) run(() => addPhotos(event.target)); };
    $('rooms').onclick = event => {
      const figure = event.target.closest('figure[data-photo-id]');
      if (figure && Date.now()-photoDropAt > 400 && !event.target.closest('button') && !event.target.closest('details')) return viewPhoto(figure.dataset.photoId);
      const b = event.target.closest('button'); if (!b) return;
      if (b.dataset.removeRoom !== undefined) { if (d.rooms.length === 1) return notice('Keep at least one room.'); if (confirm('Remove this room and its photos from the report?')) { d.rooms.splice(Number(b.dataset.removeRoom),1); remember(); editor('rooms'); } }
      if (b.dataset.deleteId) { const [roomIndex,id] = b.dataset.deleteId.split(','); const i=Number(roomIndex),pos=d.rooms[i].photos.indexOf(id); if(pos>=0){d.rooms[i].photos.splice(pos,1);const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}draft.files=draft.files.filter(file=>file.id!==id);remember();editor('rooms');} }
      if (b.dataset.moveId) { const [roomIndex,id,offsetValue] = b.dataset.moveId.split(','); const a=d.rooms[Number(roomIndex)].photos,pos=a.indexOf(id),offset=Number(offsetValue); if (pos>=0&&pos+offset>=0&&pos+offset<a.length) { a.splice(pos,1); a.splice(pos+offset,0,id); remember(); editor('rooms'); } }
      if (b.dataset.nativeCamera !== undefined) { haptic(); window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectCamera',room:Number(b.dataset.nativeCamera)}); }
      if (b.dataset.ai !== undefined) rewrite(Number(b.dataset.ai));
      if (b.dataset.voice !== undefined) run(()=>recordRoom(Number(b.dataset.voice)),b);
    };
    $('add-room').onclick = () => { if (d.rooms.length >=30) return notice('Maximum 30 rooms.'); d.rooms.push({name:nextRoomName(d.rooms),observation:'',issue:false,photos:[]});remember();editor('rooms'); };
    $('preview').onclick = () => { haptic();preview=true;reportPreview(); };
    $('save').onclick = event => { const button = event.currentTarget; haptic(); ensureAuth(() => run(async()=>{await save();draft.dirty=false;await persist();notice('Report saved online.','success');editor('rooms');}, button)); };
    bindPhotoDrag();
  }
  // Signed out in the app neither chrome is on screen, so these are the only exits.
  if($('editor-back'))$('editor-back').onclick=()=>run(()=>list());
  if($('editor-signin'))$('editor-signin').onclick=()=>ensureAuth(()=>run(()=>openAccountHome()));
  $('editor-discard').onclick=()=>{
    if(!confirm('Discard this report? Anything not saved online is removed from this device.'))return;
    run(async()=>{clearURLs();draft=null;preview=false;await stored('delete');updateHeader();if(account)await openAccountHome();else landing();});
  };
}


async function chooseExistingProperty(){
  if(!account)return;
  const data=propertiesCache||await api('/properties');propertiesCache=data;
  const details=data?.propertyDetails||data?.properties?.map(name=>({name}))||[];
  if(!details.length)return notice('Saved properties appear here after you save a report.');
  modal(`<h2>Use an existing property</h2><p class="muted">Choose the exact property or unit for this report.</p><div class="stack property-choices">${details.map((property,index)=>`<button type="button" class="secondary" data-existing-property="${index}">${esc(property.name)}</button>`).join('')}</div><button type="button" id="keep-new-property" class="quiet">Enter a new property or unit</button>`);
  document.querySelectorAll('[data-existing-property]').forEach(button=>button.onclick=()=>{
    draft.document.propertyName=details[Number(button.dataset.existingProperty)].name;remember();$('dialog').close();editor();
  });
  $('keep-new-property').onclick=()=>{$('dialog').close();$('property')?.focus();};
}

// Tapping a photo opens it full size, because a thumbnail cannot show whether a
// scuff actually read on camera.
function viewPhoto(id){
  const url=photoURL(id);
  if(!url)return;
  const room=draft.document.rooms.findIndex(r=>r.photos.includes(id));
  modal(`<h2>Photo</h2><img class="photo-full" src="${esc(url)}" alt="Property photo"><div class="row"><button type="button" id="photo-close" class="secondary">Done</button><button type="button" id="photo-remove" class="quiet danger">Remove photo</button></div>`);
  $('photo-close').onclick=()=>$('dialog').close();
  $('photo-remove').onclick=()=>{
    const photos=draft.document.rooms[room]?.photos||[];
    const pos=photos.indexOf(id);
    if(pos>=0){photos.splice(pos,1);const objectUrl=urls.get(id);if(objectUrl){URL.revokeObjectURL(objectUrl);urls.delete(id);}draft.files=draft.files.filter(file=>file.id!==id);remember();}
    $('dialog').close();editor('rooms');
  };
}
// Reordering is a lift, not a hover. The tile leaves the grid and follows the
// finger; the empty slot it left behind is what travels, so the photos under it
// close that gap and open a new one wherever the finger currently is — the way
// iOS moves an app icon.
//
// Pointer events cannot stop a page scroll: preventDefault on pointermove does
// nothing, and touch-action is settled before the gesture begins. That is why
// the old version was unusable — the page scrolled out from under the drag and
// iOS then cancelled it. So each grid carries a non-passive touchmove listener
// and cancels the scroll itself, but only once a tile is actually lifted; until
// then a finger on a photo scrolls the report like anywhere else.
let photoDrag=null,photoDropAt=0;
function photoDragBlock(event){ if(photoDrag?.lifted) event.preventDefault(); }
function photoDragLift(){
  const s=photoDrag; if(!s) return;
  const rect=s.figure.getBoundingClientRect();
  const ghost=s.figure.cloneNode(true);
  ghost.className='photo-ghost';
  ghost.removeAttribute('data-photo-id');
  ghost.style.cssText=`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
  document.body.appendChild(ghost);
  Object.assign(s,{lifted:true,ghost,rect});
  s.figure.classList.add('is-drag-source');
  s.figure.setPointerCapture?.(s.pointerId);
  photoDragFollow();
  haptic();
  s.frame=requestAnimationFrame(photoDragEdge);
}
function photoDragFollow(){
  const s=photoDrag; if(!s?.ghost) return;
  s.ghost.style.transform=`translate(${s.x-s.startX}px,${s.y-s.startY}px) scale(1.06)`;
}
// Held near an edge the report scrolls itself, because the slot someone is
// aiming for is usually off screen and their finger is no longer free to scroll.
function photoDragEdge(){
  const s=photoDrag; if(!s?.lifted) return;
  const zone=96;
  const by=s.y<zone ? -Math.ceil((zone-s.y)/6)
    : s.y>window.innerHeight-zone ? Math.ceil((s.y-(window.innerHeight-zone))/6) : 0;
  if(by){ const was=window.scrollY; window.scrollBy(0,by); if(window.scrollY!==was) photoDragShuffle(); }
  s.frame=requestAnimationFrame(photoDragEdge);
}
function photoDragShuffle(){
  const s=photoDrag; if(!s?.lifted) return;
  const over=document.elementFromPoint(s.x,s.y)?.closest('.photo-grid figure');
  if(!over||over===s.figure||over.dataset.photoRoom!==s.figure.dataset.photoRoom) return;
  const photos=draft.document.rooms[Number(s.figure.dataset.photoRoom)]?.photos;
  if(!photos) return;
  const from=photos.indexOf(s.figure.dataset.photoId),to=photos.indexOf(over.dataset.photoId);
  if(from<0||to<0||from===to) return;
  const grid=over.parentElement;
  const before=new Map([...grid.children].map(item=>[item,item.getBoundingClientRect()]));
  photos.splice(to,0,photos.splice(from,1)[0]);
  grid.insertBefore(s.figure,to>from?over.nextSibling:over);
  for(const item of grid.children){
    const was=before.get(item); if(!was||item===s.figure) continue;
    const now=item.getBoundingClientRect(),x=was.left-now.left,y=was.top-now.top;
    if(x||y) item.animate?.([{transform:`translate(${x}px,${y}px)`},{transform:'none'}],{duration:180,easing:'ease-out'});
  }
}
function photoDragDrop(){
  const s=photoDrag; if(!s) return;
  clearTimeout(s.timer); if(s.frame) cancelAnimationFrame(s.frame);
  photoDrag=null;
  if(!s.lifted) return;
  // A drop ends in a tap, so the lightbox has to know this one was not for it.
  photoDropAt=Date.now();
  const land=s.figure.getBoundingClientRect();
  const settle=()=>{ s.ghost?.remove(); s.figure.classList.remove('is-drag-source'); };
  const fall=s.ghost?.animate?.(
    [{transform:s.ghost.style.transform},
     {transform:`translate(${land.left-s.rect.left}px,${land.top-s.rect.top}px) scale(1)`}],
    {duration:170,easing:'ease-out'});
  if(fall){ fall.onfinish=fall.oncancel=settle; setTimeout(settle,400); } else settle();
  remember();
  haptic();
}
function bindPhotoDrag(){
  document.querySelectorAll('.photo-grid').forEach(grid=>grid.addEventListener('touchmove',photoDragBlock,{passive:false}));
  document.querySelectorAll('.photo-grid figure').forEach(figure=>{
    figure.onpointerdown=event=>{
      if(event.target.closest('button,summary,details')) return;
      if(figure.parentElement.children.length<2) return;
      photoDragDrop();
      photoDrag={figure,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,lifted:false};
      photoDrag.timer=setTimeout(photoDragLift,320);
    };
    figure.onpointermove=event=>{
      const s=photoDrag; if(!s||s.figure!==figure) return;
      s.x=event.clientX; s.y=event.clientY;
      // A finger that travels before the hold completes wanted to scroll.
      if(!s.lifted){ if(Math.hypot(s.x-s.startX,s.y-s.startY)>10){ clearTimeout(s.timer); photoDrag=null; } return; }
      photoDragFollow();
      photoDragShuffle();
    };
    figure.onpointerup=figure.onpointercancel=photoDragDrop;
    figure.onlostpointercapture=()=>{ if(photoDrag?.figure===figure) photoDragDrop(); };
  });
}
async function addPhotos(input) {
  const i=Number(input.dataset.files ?? input.dataset.camera);
  const source=input.dataset.camera !== undefined ? 'camera' : 'import';
  for(const file of input.files) {
    if(draft.document.rooms.reduce((n,r)=>n+r.photos.length,0)>=100) { notice('Maximum 100 photos per report.');break; }
    if(file.size>12*1024*1024){notice(`${file.name} is too large. Maximum 12 MB.`);continue;}
    // Convert using the device's image decoder, including HEIC where supported.
    const img=new Image(); const objectURL=URL.createObjectURL(file);
    try {
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=objectURL;});
      if(img.naturalWidth*img.naturalHeight>40000000) throw new Error('Image too large');
      const id=uid();
      draft.files.push({id,blob:file,source,name:file.name});draft.document.rooms[i].photos.push(id);
    } catch { notice(`${file.name} could not be opened. Export it as JPEG or take a photo.`); }
    finally {URL.revokeObjectURL(objectURL);}
  }
  await persist();editor();
}
// One step visible at a time. Both forms used to sit in the sheet together, so
// the six-digit field appeared directly under "Send sign-in code" and the sheet
// carried two inputs and two buttons at once.
function ensureAuth(after) {
  if(session && account) return after();
  let email='';
  const codeStep=()=>{
    $('dialog-body').innerHTML=`<h2>Enter your code.</h2><p class="muted">Sent to ${esc(email)}</p><form id="code-form"><input id="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" aria-label="Six-digit code"></form><div class="row auth-back"><button type="button" id="auth-resend" class="quiet">Send a new code</button><button type="button" id="auth-back" class="quiet">← Change email</button></div>`;
    const input=$('code');
    // Synchronous focus inside the same user gesture: an await here would let
    // iOS dismiss the keyboard before the code field exists.
    input.focus();
    let verifying=false,lastTried='';
    const attempt=()=>{
      const code=input.value.replace(/\D/g,'').slice(0,6);
      if(verifying||code.length!==6||code===lastTried)return;
      // Deliberately not disabled while verifying: disabling a focused input
      // drops the iOS keyboard, and re-focusing outside a user gesture will not
      // bring it back. The flag alone prevents a second submit.
      verifying=true;lastTried=code;
      run(async()=>{
        const result=await api('/auth/verify',{method:'POST',body:{email,code,attribution:inspectAttribution}});
        session=result.token;localStorage.setItem('inspect.session',session);account=result;updateHeader();prefetchLists();$('dialog').close();
      },null).then(()=>{
        verifying=false;
        if(account)return after();
        // Left in place and selected, so the next digit typed replaces it.
        input.focus();input.select?.();
      });
    };
    input.oninput=attempt;
    $('code-form').onsubmit=event=>{event.preventDefault();attempt();};
    // Codes expire after ten minutes, and without this the only way out of an
    // expired one was to back out and retype the address.
    $('auth-resend').onclick=()=>{
      input.value='';lastTried='';input.focus();
      run(async()=>{await api('/auth/request',{method:'POST',body:{email}});notice('New code sent. Check your email.','success');},null);
    };
    $('auth-back').onclick=()=>emailStep(false);
  };
  const emailStep=open=>{
    const html=`<h2>Keep your report.</h2><p>Verify your email to save, export and recover your work on another device. Your first complete report is free.</p><form id="email-form"><label>Email<input id="email" type="email" required autocomplete="email" value="${esc(email)}"></label><button class="wide">Send sign-in code</button></form>`;
    if(open)modal(html);else $('dialog-body').innerHTML=html;
    if(!open)$('email').focus();
    $('email-form').onsubmit=event=>{
      event.preventDefault();
      email=$('email').value.trim();
      if(!email)return;
      codeStep();
      run(async()=>{await api('/auth/request',{method:'POST',body:{email}});notice('Check your email for the code.','success');},null);
    };
  };
  emailStep(true);
}
async function refresh(){if(session){account=await api('/account');updateHeader();}}
async function syncInspectAttribution(){
  if(session&&account&&inspectAttribution)await api('/attribution',{method:'POST',body:{attribution:inspectAttribution}});
}
function remoteDocument(){
  return {...draft.document,rooms:draft.document.rooms.map(room=>({...room,photos:room.photos.map(id=>draft.files.find(file=>file.id===id)?.remoteId).filter(Boolean)}))};
}
async function ensureServerDraft(){
  if(!draft.document.propertyName.trim())throw new Error('Enter a property name first.');
  if(!draft.serverId){
    const result=await api('/reports',{method:'POST',body:{...draft.document,rooms:draft.document.rooms.map(room=>({...room,photos:[]}))}});
    draft.serverId=result.id;reportsCache=null;propertiesCache=null;await persist();
  }else await api(`/reports/${draft.serverId}`,{method:'PUT',body:remoteDocument()});
}
async function save() {
  if(!draft.document.propertyName.trim())throw new Error('Enter a property name.');
  const referenced=draft.document.rooms.flatMap(room=>room.photos);
  if(referenced.some(id=>!draft.files.some(file=>file.id===id)))throw new Error('A report photo is missing from this device. Remove it or add it again.');
  await ensureServerDraft();
  // Remove remotely uploaded photos the operator took out of the report before
  // adding replacements. This keeps the 100-photo quota truthful.
  const existingDoc=remoteDocument();
  await api(`/reports/${draft.serverId}`,{method:'PUT',body:existingDoc});
  for(const room of draft.document.rooms) for(const id of room.photos){
    const f=draft.files.find(f=>f.id===id);if(!f)throw new Error('A report photo is missing from this device. Remove it or add it again.');if(f.remoteId)continue;
    notice('Uploading report photos… Keep this page open.');
    const form=new FormData();form.append('photo',f.blob,f.name||'photo.jpg');form.append('source',f.source);
    const a=await api(`/reports/${draft.serverId}/photos`,{method:'POST',body:form});f.remoteId=a.id;await persist();
  }
  const doc=remoteDocument();
  await api(`/reports/${draft.serverId}`,{method:'PUT',body:doc});reportsCache=null;propertiesCache=null;await persist();
}
// Two kinds of feedback while recording, because one of them may not exist.
//
// The meter is driven from the stream already being recorded, so it costs no
// second microphone and always works — it is what makes a screen recording of
// someone talking show anything at all.
//
// Captions are a bonus. SpeechRecognition opens its OWN microphone rather than
// accepting our stream, so on iOS it competes with the MediaRecorder and in a
// WKWebView it frequently does not exist. Every failure here is silent and the
// recording carries on: the note comes from the server transcript regardless,
// and losing the audio to win a caption would be a bad trade.
function liveMeter(stream){
  const bars=$('live-bars');
  let ctx,frame=0;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx||!bars)return()=>{};
    ctx=new Ctx();
    const analyser=ctx.createAnalyser();
    analyser.fftSize=256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data=new Uint8Array(analyser.frequencyBinCount);
    const spans=[...bars.children];
    const draw=()=>{
      analyser.getByteFrequencyData(data);
      const step=Math.floor(data.length/spans.length)||1;
      spans.forEach((span,i)=>{
        let sum=0;
        for(let n=i*step;n<(i+1)*step;n++)sum+=data[n]||0;
        span.style.transform=`scaleY(${Math.max(0.12,Math.min(1,(sum/step)/120))})`;
      });
      frame=requestAnimationFrame(draw);
    };
    draw();
  }catch{return()=>{};}
  return()=>{if(frame)cancelAnimationFrame(frame);ctx?.close?.().catch(()=>{});};
}
function liveCaptions(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const target=$('live-caption');
  if(!Recognition||!target)return()=>{};
  let recognition,stopped=false,settled='';
  try{
    recognition=new Recognition();
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.lang=navigator.language||'en-US';
    recognition.onresult=event=>{
      let interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=event.results[i][0]?.transcript||'';
        if(event.results[i].isFinal)settled=`${settled} ${text}`.trim();else interim+=text;
      }
      target.textContent=`${settled} ${interim}`.trim();
      target.scrollTop=target.scrollHeight;
    };
    // Safari ends the session on a pause; keep it alive until we say otherwise.
    recognition.onend=()=>{if(!stopped){try{recognition.start();}catch{}}};
    recognition.onerror=()=>{};
    recognition.start();
  }catch{return()=>{};}
  return()=>{stopped=true;try{recognition.stop();}catch{}};
}
async function recordRoom(index){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Voice notes are not supported on this device. You can type the observation instead.');
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});}
  catch{throw new Error('Allow microphone access to talk through the room. You can still type instead.');}
  const supported=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported?.(type));
  const recorder=new MediaRecorder(stream,supported?{mimeType:supported,audioBitsPerSecond:64000}:undefined),chunks=[];let seconds=0,finished=false,cancelled=false;
  const recording=new Promise((resolve,reject)=>{
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=()=>reject(new Error('Recording failed. Please retry.'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||supported||'audio/mp4'}));
  });
  modal(`<h2>Talk through ${esc(draft.document.rooms[index].name)}</h2><p class="recording-state"><span class="recording-dot"></span> Recording · <strong id="recording-time">0:00</strong></p><div class="live-bars" id="live-bars" aria-hidden="true">${'<span></span>'.repeat(13)}</div><p class="live-caption" id="live-caption" aria-live="polite">Listening…</p><p class="muted">Say only what you can observe. Mention the location and whether it should be marked as an issue. The recording and transcript are not attached to your report.</p><button id="stop-recording">Stop and review</button>`);
  const stopMeter=liveMeter(stream),stopCaptions=liveCaptions();
  const tick=setInterval(()=>{seconds+=1;const label=$('recording-time');if(label)label.textContent=`0:${String(seconds).padStart(2,'0')}`;if(seconds>=60&&recorder.state==='recording')recorder.stop();},1000);
  const started=Date.now();
  $('stop-recording').onclick=()=>{if(recorder.state==='recording')recorder.stop();};
  $('dialog').addEventListener('close',()=>{if(recorder.state==='recording'){cancelled=true;recorder.stop();}},{once:true});
  recorder.start(250);
  let blob;
  try{blob=await recording;}catch(error){if($('dialog').open)$('dialog').close();throw error;}finally{clearInterval(tick);stopMeter();stopCaptions();stream.getTracks().forEach(track=>track.stop());finished=true;}
  if(cancelled||!finished||!blob.size)return;
  const durationMs=Math.min(60000,Math.max(250,Date.now()-started));
  $('dialog').close();
  logInspect('VoiceNoteRecorded',true);
  const process=()=>run(async()=>{
    await ensureServerDraft();
    const form=new FormData();form.append('audio',blob,blob.type.includes('webm')?'note.webm':blob.type.includes('ogg')?'note.ogg':'note.m4a');form.append('roomIndex',String(index));form.append('durationMs',String(durationMs));
    notice('Turning your walkthrough into a room note…');
    const result=await api(`/reports/${draft.serverId}/voice-draft`,{method:'POST',body:form});
    reviewVoiceNote(index,result);
  });
  ensureAuth(process);
}
function reviewVoiceNote(index,result){
  modal(`<h2>Review this room note</h2><p class="muted">AI only organized what it heard. Check every detail before adding it.</p><blockquote>${esc(result.suggestion)}</blockquote><details><summary>What Inspect heard</summary><p class="transcript">${esc(result.transcript)}</p></details><div class="stack"><button id="replace-note">Use as room note</button><button id="append-note" class="secondary">Add after my note</button><button id="discard-note" class="quiet">Discard</button></div>`);
  // Whether the draft was kept is the only read on whether the AI actually
  // helped. Closing the sheet is an answer too, so every exit records one.
  let kept=false;
  $('dialog').addEventListener('close',()=>logInspect(kept?'VoiceNoteKept':'VoiceNoteDiscarded'),{once:true});
  const accept=mode=>{const room=draft.document.rooms[index];room.observation=mode==='append'&&room.observation.trim()?`${room.observation.trim()}\n${result.suggestion}`:result.suggestion;if(result.issueMentioned)room.issue=true;remember();kept=true;$('dialog').close();editor();};
  $('replace-note').onclick=()=>accept('replace');$('append-note').onclick=()=>accept('append');$('discard-note').onclick=()=>$('dialog').close();
}
function signaturePreview(signature){
  const paths=signature.strokes.map(stroke=>stroke.map((point,index)=>`${index?'L':'M'} ${(point.x*300).toFixed(1)} ${(point.y*100).toFixed(1)}`).join(' '));
  return `<section class="signature-preview"><strong>${signature.role==='resident'?'Resident / tenant':'Manager / inspector'} signature</strong><svg viewBox="0 0 300 100" aria-label="Signature">${paths.map(path=>`<path d="${path}"></path>`).join('')}</svg><small>${esc(signature.name)}${signature.signedAt?` · ${new Date(signature.signedAt).toLocaleString()}`:''}</small></section>`;
}
function reportRoom(r,label=''){
  return `<section class="report-room">${label?`<p class="compare-label">${label}</p>`:''}<h2>${esc(r.name)}${r.issue?' · Issue noted':''}</h2><p class="report-note">${esc(r.observation)||'No observation recorded.'}</p>${r.photos.map(id=>`<img class="report-photo" src="${esc(photoURL(id))}" alt="Recorded room condition"><small>${draft.files.find(f=>f.id===id)?.source==='camera'?'Camera capture':'Imported photo'}</small>`).join('')}</section>`;
}
const surfaceList=items=>items.length<2?items[0]:`${items.slice(0,-1).join(', ')} or ${items[items.length-1]}`;
// A reminder, never a requirement — the finalize button is untouched either way.
function renderCoverage(rooms){
  const card=$('coverage-card');
  if(!card)return;
  card.innerHTML=`<div><h2>Photo coverage</h2></div>${rooms.length
    ? `<ul class="coverage-list">${rooms.map(room=>`<li><strong>${esc(room.name)}</strong> — no photo of the ${esc(surfaceList(room.missing))}</li>`).join('')}</ul><p class="muted">Add what is missing, or finalize as it is.</p>`
    : '<p class="muted">Every room shows the usual surfaces. Nothing obvious is missing.</p>'}`;
}
function reportPreview(){
  enterScreen('preview');
  updateHeader();setActiveNav('current');const d=draft.document;d.signatures ||= [];
  const baseline=draft.baseline?.document,baselineRooms=new Map((baseline?.rooms||[]).map(room=>[room.name.toLowerCase(),room]));
  const roomMarkup=d.rooms.map((room,index)=>{const before=baselineRooms.get(room.name.toLowerCase())||baseline?.rooms?.[index];return `<div class="comparison-pair">${before?reportRoom(before,'Previous finalized report'):''}${reportRoom(room,before?'Current report':'')}</div>`;}).join('');
  $('app').innerHTML=`<div class="row spread"><small class="eyebrow">${draft.finalizedAt?'Finalized report':'Your report preview'}</small>${!draft.finalizedAt?'<button class="quiet" id="edit">← Edit</button>':''}</div><article class="card"><small>MARKETEL INSPECT</small><h1>${esc(d.propertyName)||'Your property'}</h1><p class="muted">${esc(d.type)} · ${esc(d.date)} · ${esc(d.author)||'Author not entered'}</p>${baseline?`<div class="comparison-banner">Compared with the finalized ${esc(baseline.type)} report from ${esc(baseline.date)}.</div>`:''}${roomMarkup}${d.signatures.map(signaturePreview).join('')}<p><small>Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.</small></p></article>${!draft.finalizedAt?`<section class="card signature-actions"><div><h2>Optional signatures</h2><p class="muted">Add a manager or resident sign-off before finalizing.</p></div><div class="row"><button class="secondary" data-sign="manager">${d.signatures.some(s=>s.role==='manager')?'Replace manager signature':'Add manager signature'}</button><button class="secondary" data-sign="resident">${d.signatures.some(s=>s.role==='resident')?'Replace resident signature':'Add resident signature'}</button></div></section>`:''}${draft.finalizedAt
    ? `<p class="muted">This version cannot change. Create a new report for corrections.</p><div class="stack report-actions"><button id="pdf">Download PDF</button><button id="share" class="secondary">Create private share link</button></div><div class="next-actions"><button type="button" id="another-report" class="secondary">+ New report</button>${account?'<button type="button" id="back-to-reports" class="quiet">← All reports</button>':''}</div>${!native&&account?'<section class="card app-handoff-card"><div><small class="eyebrow">MARKETEL APP</small><h2>Keep this report with you.</h2><p class="muted">We will email one secure link that signs you in and opens this report in the Marketel app.</p></div><button id="send-app-handoff">Continue in the Marketel app →</button></section>':''}`
    : `${d.rooms.some(room=>room.photos.length)?`<section class="card coverage" id="coverage-card"><div><h2>Check your photo coverage</h2><p class="muted">Inspect looks at which surfaces your photos actually show and tells you what is missing. It never comments on condition.</p></div><button type="button" id="coverage-run" class="secondary">Check photo coverage</button></section>`:''}<div class="actions row"><button id="finalize">Save &amp; export my report →</button></div><p class="muted">Finalizing freezes this version. Your first report includes PDF export and a revocable share link, free.${account?'':' Exporting verifies your email once.'}</p>`}`;
  if($('edit'))$('edit').onclick=()=>{preview=false;editor();};
  if($('coverage-run'))$('coverage-run').onclick=event=>{
    const button=event.currentTarget;
    haptic();
    ensureAuth(()=>run(async()=>{await save();const result=await api(`/reports/${draft.serverId}/coverage`,{method:'POST'});renderCoverage(result.rooms||[]);},button));
  };
  document.querySelectorAll('[data-sign]').forEach(button=>button.onclick=()=>captureSignature(button.dataset.sign));
  if($('finalize'))$('finalize').onclick=event=>{const button=event.currentTarget;haptic();ensureAuth(()=>run(async()=>{
    await refresh();if(!account.freeAvailable&&(!account.active||!account.remaining))return offer();
    if(!draft.document.author.trim())throw new Error('Add your name in the editor before finalizing.');
    await save();const r=await api(`/reports/${draft.serverId}/finalize`,{method:'POST'});draft.finalizedAt=r.finalizedAt;draft.document=r.document;reportsCache=null;propertiesCache=null;await persist();await refresh();reportPreview();notice('Your report is ready. Download the PDF or create a private link.','success');
  },button));};
  if($('pdf'))$('pdf').onclick=()=>run(async()=>{
    if(native){window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectExportPDF',reportId:draft.serverId,token:session});return;}
    const blob=await api(`/reports/${draft.serverId}/pdf`,{blob:true});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='inspection-report.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  });
  // Revoke lives inside the share sheet rather than the floating action bar:
  // it is rare, destructive, and only means anything once a link exists.
  if($('share'))$('share').onclick=()=>run(async()=>{const r=await api(`/reports/${draft.serverId}/share`,{method:'POST'});modal(`<h2>Private report link</h2><p>Anyone with this link can read and download this version. Creating a new link replaces the previous one.</p><input id="share-url" readonly value="${esc(r.url)}"><button id="copy-link" class="wide">Copy link</button><button id="revoke" class="quiet danger">Revoke this link</button>`);$('copy-link').onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(r.url);}catch{$('share-url').select();document.execCommand('copy');}notice('Link copied.');});$('revoke').onclick=()=>run(async()=>{await api(`/reports/${draft.serverId}/share`,{method:'DELETE'});$('dialog').close();notice('Shared link revoked.');});});
  if($('another-report'))$('another-report').onclick=()=>{haptic();run(()=>start());};
  if($('back-to-reports'))$('back-to-reports').onclick=()=>run(()=>list());
  if($('send-app-handoff'))$('send-app-handoff').onclick=event=>run(async()=>{
    const result=await api('/app-handoff',{method:'POST',body:{reportId:draft.serverId}});
    appStoreUrl=result.appStoreUrl||appStoreUrl;
    modal(`<h2>Check your email.</h2><p>We sent <strong>${esc(account.email)}</strong> a secure <strong>Open your report in Marketel</strong> link.</p><p class="muted">If Marketel is already installed, tap that email button to open this report. Otherwise install the app first, then tap it. The link expires in 10 minutes and works once.</p><a class="button wide" href="${esc(appStoreUrl)}" target="_blank" rel="noopener">Download Marketel on the App Store</a><button id="handoff-done" class="quiet">Keep using the web</button>`);
    $('handoff-done').onclick=()=>$('dialog').close();
  },event.currentTarget);
}
// Two steps rather than one tall sheet: the name, then the pad. A sheet with a
// text field and a signature canvas together is tall enough that opening the
// keyboard shoved it around the screen on every focus.
function captureSignature(role){
  const existing=draft.document.signatures?.find(signature=>signature.role===role);
  const title=role==='resident'?'Resident / tenant':'Manager / inspector';
  let name=existing?.name || (role==='manager' ? (draft.document.author||rememberedAuthor()) : '');
  const strokes=existing?structuredClone(existing.strokes):[];

  const nameStep=()=>{
    modal(`<h2>${title}</h2><label>Signer name<input id="signer-name" maxlength="120" value="${esc(name)}"></label><div class="row"><button type="button" id="signer-next">Next →</button>${existing?'<button type="button" id="remove-signature" class="quiet danger">Remove</button>':''}</div>`);
    $('signer-name').oninput=event=>{name=event.target.value;};
    $('signer-next').onclick=()=>{
      if(!name.trim())return notice('Enter the signer name.','error');
      padStep();
    };
    if($('remove-signature'))$('remove-signature').onclick=()=>{
      draft.document.signatures=draft.document.signatures.filter(signature=>signature.role!==role);
      remember();$('dialog').close();reportPreview();
    };
  };

  const padStep=()=>{
    $('dialog-body').innerHTML=`<h2>${title}</h2><p class="muted">${esc(name)}</p><canvas id="signature-pad" width="600" height="200" aria-label="Signature pad"></canvas><div class="row"><button type="button" id="save-signature">Use signature</button><button type="button" id="clear-signature" class="secondary">Clear</button><button type="button" id="signer-back" class="quiet">← Name</button></div>`;
    // Nothing is focused here, so the keyboard stays down and the sheet stays put.
    settleSheet();
    const canvas=$('signature-pad'),ctx=canvas.getContext('2d');let current=null;
    const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#1a2b22';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){ctx.beginPath();stroke.forEach((p,i)=>{const x=p.x*canvas.width,y=p.y*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}};
    const point=event=>{const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};};
    canvas.onpointerdown=event=>{current=[point(event)];strokes.push(current);canvas.setPointerCapture(event.pointerId);draw();};
    canvas.onpointermove=event=>{if(!current)return;const next=point(event),last=current[current.length-1];if(Math.hypot(next.x-last.x,next.y-last.y)>.003&&current.length<300){current.push(next);draw();}};
    canvas.onpointerup=canvas.onpointercancel=()=>{if(current?.length===1)current.push({...current[0],x:Math.min(1,current[0].x+.002)});current=null;};
    $('clear-signature').onclick=()=>{strokes.splice(0);draw();};
    $('signer-back').onclick=()=>nameStep();
    $('save-signature').onclick=()=>{
      if(!strokes.length)return notice('Add a signature first.','error');
      const signatures=(draft.document.signatures||[]).filter(signature=>signature.role!==role);
      signatures.push({role,name:name.trim(),strokes});
      draft.document.signatures=signatures;remember();$('dialog').close();reportPreview();
    };
    draw();
  };

  nameStep();
}

function rewrite(index){ensureAuth(()=>run(async()=>{
  await ensureServerDraft();const original=draft.document.rooms[index].observation;
  if(!original.trim())throw new Error('Type an observation first, or use Talk through this room.');
  const r=await api(`/reports/${draft.serverId}/rewrite`,{method:'POST',body:{observation:original}});
  modal(`<h2>Review the wording</h2><p class="muted">Check that this still says exactly what you observed.</p><blockquote>${esc(r.suggestion)}</blockquote><button id="accept-ai">Use this wording</button>`);
  $('accept-ai').onclick=()=>{draft.document.rooms[index].observation=r.suggestion;remember();$('dialog').close();editor();};
}));}
async function requestStorefront(){
  if(!native)return storefront;
  window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectStorefront'});
  return new Promise(resolve=>{const done=()=>{storefrontWaiters=storefrontWaiters.filter(item=>item!==done);resolve(storefront);};storefrontWaiters.push(done);setTimeout(done,1000);});
}
async function offer(){
  await requestStorefront();
  logInspect('AdditionalReportOfferViewed');
  if(native&&storefront!=='USA')return modal('<h2>Your free report is yours.</h2><p>This account has no additional report allowance available. Existing subscribers can refresh their account access.</p><button id="refresh-access">Refresh access</button>'),$('refresh-access').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();});
  // Annual is preselected — $29/month takes over three months to repay what one
  // customer costs to acquire — but only intervals the server has a price for
  // are offered, so a missing annual price degrades to monthly, not a dead tap.
  const available=(Array.isArray(account?.plans)&&account.plans.length?account.plans:['month']).filter(value=>PLANS[value]);
  if(!available.includes(planInterval))planInterval=available[0];
  const paint=first=>{
    const plan=PLANS[planInterval];
    const toggle=available.length>1?`<div class="billing-toggle" role="radiogroup" aria-label="Billing period">${available.map(value=>`<button type="button" role="radio" aria-checked="${planInterval===value}" data-plan="${value}">${value==='year'?'Annual':'Monthly'}</button>`).join('')}</div>`:'';
    // Priced against nothing, $199 is only a big number. The anchor line and the
    // per-report figure are what make it small, and both are derived from PLANS
    // so a price change cannot leave the arithmetic behind.
    const each=plan.price/plan.reports;
    const unit=each<1?`${Math.round(each*100)}¢`:`$${each.toFixed(2)}`;
    const sub=planInterval==='year'?`$${(plan.price/12).toFixed(2)}/month, billed annually${plan.save?` · ${plan.save}`:''}`:plan.save;
    const html=`<h2>Keep every walkthrough on the record.</h2><p class="offer-anchor">One argument about damage costs more than a year of Inspect.</p>${toggle}<div class="price">$${plan.price} <small>${plan.per}</small></div>${sub?`<p class="price-save">${sub}</p>`:''}<ul class="offer-points"><li>Talk through a room and Inspect writes the note</li><li>No per-property or per-room fees</li><li>${plan.reports} reports — about ${unit} each</li><li>PDF export and a private share link on every report</li><li>Before and after move-out comparisons</li></ul><p class="offer-reversal">Cancel renewal anytime.</p><button id="buy" class="wide">Subscribe — $${plan.price}${plan.per}</button><p><small>${plan.terms} The report you just finished is saved and waiting, and existing finalized reports stay available. <a href="https://bookmarketel.com/inspect/terms.html">Inspect terms</a></small></p>`;
    if(first)modal(html,{fullscreen:true});else{$('dialog-body').innerHTML=html;settleSheet();}
    document.querySelectorAll('[data-plan]').forEach(button=>{button.onclick=()=>{const next=button.dataset.plan==='year'?'year':'month';if(next===planInterval)return;haptic();planInterval=next;paint(false);};});
    $('buy').onclick=()=>run(async()=>{haptic();const r=await api('/checkout',{method:'POST',body:{native,interval:planInterval}});openExternal(r.url);});
  };
  paint(true);
}
function openExternal(url){if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'openBrowser',url});else location.assign(url);}
function renderProperties(data){
  enterScreen('properties');
  const details=data?.propertyDetails||data?.properties?.map(name=>({name}))||[];
  $('app').innerHTML=`<h1>Properties</h1><p class="muted">Start a fresh report, or compare a move-out with the last finalized condition report.</p><button id="new-property">+ New property</button>${details.length?'':'<section class="card">Properties appear here after you save a report.</section>'}${details.map((property,index)=>`<section class="card property-row"><div><strong>${esc(property.name)}</strong>${property.latestDate?`<p class="muted">Latest finalized: ${esc(property.latestType)} · ${esc(property.latestDate)}</p>`:''}</div><div class="row"><button class="secondary" data-property="${index}">New report</button>${property.latestFinalizedReportId?`<button data-compare="${esc(property.latestFinalizedReportId)}">Start move-out comparison</button>`:''}</div></section>`).join('')}`;
  $('new-property').onclick=()=>{haptic();run(()=>start());};
  document.querySelectorAll('[data-property]').forEach(button=>button.onclick=()=>start(details[Number(button.dataset.property)].name));
  document.querySelectorAll('[data-compare]').forEach(button=>button.onclick=()=>run(()=>startComparison(button.dataset.compare),button));
}
function renderReports(){
  enterScreen('reports');
  const canUpgrade=!account.active&&!account.freeAvailable&&(!native||storefront==='USA');
  const status=account.freeAvailable?'Your first complete report is free.':account.active?`${account.remaining} reports remaining this billing period.`:'Your saved reports remain available.';
  const localDraft=hasUnfinishedDraft()&&!draft.serverId
    ? `<section class="card report-row"><div><strong>${esc(draft.document.propertyName)||'Untitled report'}</strong><p class="muted">${esc(draft.document.date)} · On this device · not saved online</p></div><div class="row"><button type="button" id="open-local-draft" class="secondary">Open</button><button type="button" id="delete-local-draft" class="quiet danger">Delete</button></div></section>`
    : '';
  $('app').innerHTML=`<h1>Your reports</h1><div class="status-line"><p class="muted">${status}</p>${canUpgrade?'<button id="plans" class="quiet">See plans →</button>':''}</div><button id="new-report">+ New report</button>${localDraft}${reports.length||localDraft?'':'<section class="card">No saved reports yet. Start your first walkthrough.</section>'}${reports.map(report=>`<section class="card report-row"><div><strong>${esc(report.document.propertyName)}</strong><p class="muted">${esc(report.document.date)} · ${report.finalizedAt?'Finalized':'Draft'}${report.baselineReportId?' · Comparison':''}</p></div><div class="row"><button data-open="${report.id}" class="secondary">Open</button><button data-delete-report="${report.id}" class="quiet danger">Delete</button></div></section>`).join('')}${nextReportCursor?'<button id="older" class="secondary">Load older reports</button>':''}`;
  if($('older'))$('older').onclick=event=>run(()=>list('reports',true),event.currentTarget);
  $('new-report').onclick=()=>start();if($('plans'))$('plans').onclick=offer;
  if($('open-local-draft'))$('open-local-draft').onclick=()=>{haptic();editor();};
  if($('delete-local-draft'))$('delete-local-draft').onclick=()=>{
    if(!confirm('Delete this unsaved report from this device?'))return;
    run(async()=>{clearURLs();draft=null;preview=false;await stored('delete');updateHeader();await list();});
  };
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>run(()=>openReport(button.dataset.open),button));
  document.querySelectorAll('[data-delete-report]').forEach(button=>button.onclick=()=>{if(confirm('Permanently delete this report, its photos and shared link? This does not restore report allowance.'))run(async()=>{await api(`/reports/${button.dataset.deleteReport}`,{method:'DELETE'});if(draft?.serverId===button.dataset.deleteReport){draft=null;await stored('delete');clearURLs();}reportsCache=null;propertiesCache=null;await list('reports');},button);});
}
async function loadReportFiles(report){
  const files=[];
  for(let i=0;i<(report.attachments||[]).length;i+=6){
    const loaded=await Promise.all(report.attachments.slice(i,i+6).map(async attachment=>({id:attachment.id,remoteId:attachment.id,blob:await api(`/reports/${report.id}/photos/${attachment.id}`,{blob:true}),source:attachment.source})));
    files.push(...loaded);
  }
  return files;
}
async function useComparisonPayload(payload){
  const report=payload.report,baseline=payload.baseline;
  const files=await loadReportFiles(report);
  if(baseline)files.push(...await loadReportFiles(baseline));
  clearURLs();draft={document:report.document,serverId:report.id,finalizedAt:report.finalizedAt,files,baseline};
  await persist();preview=!!report.finalizedAt;editor();
}
async function openReport(id){
  if(draftUnsaved()&&draft.serverId!==id&&!confirm('Replace the draft on this device? Your current draft is not saved online yet.'))return;
  haptic();
  $('app').innerHTML='<section class="loading">Opening your report…</section>';
  await useComparisonPayload(await api(`/reports/${id}/comparison`));
}
async function startComparison(baselineId){
  if(draftUnsaved()&&!confirm('Start a comparison report? Your current draft is not saved online yet.'))return;
  const payload=await api(`/reports/${baselineId}/comparison-draft`,{method:'POST',body:{date:localDate()}});
  reportsCache=null;await useComparisonPayload(payload);
}
async function list(page='reports',append=false){
  if(!account)return ensureAuth(()=>list(page).catch(error=>notice(error.message)));
  updateHeader();setActiveNav(page);
  const request=++listRequest;
  if(page==='properties'){
    if(propertiesCache)renderProperties(propertiesCache);else $('app').innerHTML='<h1>Properties</h1><section class="loading">Loading saved properties…</section>';
    const result=await api('/properties');propertiesCache=result;
    if(currentPage==='properties'&&request===listRequest)renderProperties(result);return;
  }
  if(reportsCache&&!append){reports=reportsCache.reports;nextReportCursor=reportsCache.nextCursor;renderReports();}
  else if(!append)$('app').innerHTML='<h1>Your reports</h1><section class="loading">Loading saved reports…</section>';
  const pageResult=await api(`/reports?take=50${append&&nextReportCursor?`&cursor=${encodeURIComponent(nextReportCursor)}`:''}`);
  reports=append?reports.concat(pageResult.reports):pageResult.reports;nextReportCursor=pageResult.nextCursor;
  reportsCache={reports:[...reports],nextCursor:nextReportCursor};
  if(currentPage==='reports'&&request===listRequest)renderReports();
}
async function openAccountHome(){
  if(!account)return landing();
  if(hasUnfinishedDraft())return editor();
  updateHeader();setActiveNav('reports');
  const result=reportsCache||await api('/reports?take=50');
  reports=result.reports||[];nextReportCursor=result.nextCursor||null;reportsCache={reports:[...reports],nextCursor:nextReportCursor};
  if(!reports.length)return start();
  renderReports();
}
function prefetchLists(){if(!account)return;api('/properties').then(result=>{propertiesCache=result;}).catch(()=>{});api('/reports?take=50').then(result=>{reportsCache=result;}).catch(()=>{});}
$('account-button').onclick=async()=>{
  if(!account)return ensureAuth(()=>run(()=>openAccountHome()));
  await requestStorefront();
  modal(`<h2>Inspect account</h2><p>${esc(account.email)}</p><p>${account.active?`${account.remaining} reports left. ${account.cancellationScheduled?'Access ends':'Next billing period'} ${new Date(account.periodEnd).toLocaleDateString()}.`:'One complete report free. Existing reports stay available.'}</p><div class="stack">${(!native||storefront==='USA')?'<button id="manage">Manage subscription</button>':''}<button id="switch" class="secondary">Open booking Front Desk</button><button id="logout" class="quiet">Sign out of Marketel</button></div><details class="more-actions"><summary>More</summary><div class="stack"><button id="refresh" class="secondary">Refresh billing status</button><button id="delete-account" class="quiet danger">Delete Inspect account</button></div></details><p><a href="https://bookmarketel.com/inspect/terms.html">Inspect terms & privacy</a></p>`);
  $('refresh').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();notice('Account refreshed.');});
  if($('manage'))$('manage').onclick=()=>run(async()=>openExternal((await api('/billing',{method:'POST',body:{native}})).url));
  $('switch').onclick=()=>{localStorage.setItem('marketel.product','bookings');location.assign(native?'../frontdesk/index.html?native=ios':'/frontdesk');};
  $('logout').onclick=event=>run(async()=>{await api('/auth/logout',{method:'POST'});await logout();notice('Signed out.','success');},event.currentTarget);
  $('delete-account').onclick=()=>{if(prompt('This permanently deletes Inspect reports and photos and cancels its subscription. Booking properties are unaffected. Type DELETE to confirm.')==='DELETE')run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});await logout();});};
};
async function logout(){session='';account=null;draft=null;reportsCache=null;propertiesCache=null;clearURLs();localStorage.removeItem('inspect.session');localStorage.removeItem('marketel.product');await stored('delete');if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectSignOut'});$('dialog').close();landing();}
$('nav').onclick=e=>{const page=e.target.closest('[data-page]')?.dataset.page;if(!page)return;if(page==='new')start();else if(page==='current')editor();else list(page).catch(error=>notice(error.message));};
$('dialog').addEventListener('close',()=>{unlockPage();document.documentElement.classList.remove('sheet-full');$('dialog').style.setProperty('--sheet-shift','0px');syncNativeInspectState(currentPage,true);});
$('product-switch').onclick=event=>{if(!native)return;event.preventDefault();location.assign('../index.html?choose=1');};
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="http"]');if(native&&link){event.preventDefault();openExternal(link.href);}});
window.marketelInspectStorefront=country=>{storefront=country;const waiters=storefrontWaiters;storefrontWaiters=[];waiters.forEach(resolve=>resolve());};
window.marketelInspectExportResult=result=>notice(result==='complete'?'PDF export complete.':result==='busy'?'Close the open screen and try exporting again.':'PDF export failed. Please retry.');
// Each shot arrives on its own while the sheet stays open, so the room rebuilds
// between captures and the photo is already in the draft if the app is killed.
window.marketelInspectPhotoCaptured=raw=>run(async()=>{
  let data; try{data=JSON.parse(raw);}catch{return;}
  const i=Number(data.room);
  if(!draft||!draft.document.rooms[i]||typeof data.dataUrl!=='string')return;
  if(draft.document.rooms.reduce((total,room)=>total+room.photos.length,0)>=100)return notice('Maximum 100 photos per report.','error');
  const blob=await (await fetch(data.dataUrl)).blob();
  const id=uid();
  draft.files.push({id,blob,source:'camera',name:`camera-${id}.jpg`});
  draft.document.rooms[i].photos.push(id);
  remember();await persist();
  if(!preview&&!draft.finalizedAt&&editorStep==='rooms')editor('rooms');
},null);
window.marketelInspectNativeSelectTab=page=>{
  // The tab bar stays visible over a sheet now, so a tap has to dismiss it first.
  if($('dialog').open)$('dialog').close();
  if(page==='current'){if(draft)editor();else run(()=>start());return;}
  list(page).catch(error=>notice(error.message));
};
window.marketelInspectOpenHandoff=async rawToken=>{
  try{
    const raw=String(rawToken||'');
    if(!/^[A-Za-z0-9_-]{43}$/.test(raw))throw new Error('This app link is invalid or expired.');
    const response=await fetch(`${API}/auth/handoff`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:raw})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'This app link is invalid or expired.');
    session=result.token;localStorage.setItem('inspect.session',session);account=result;
    clearURLs();draft=null;preview=false;await stored('delete');reportsCache=null;propertiesCache=null;
    updateHeader();prefetchLists();localStorage.setItem('marketel.product','inspect');
    if(result.reportId)await openReport(result.reportId);else await openAccountHome();
    notice('Signed in. Your report is ready.','success');
  }catch(error){
    notice(error.message||'This app link is invalid or expired.','error');
    ensureAuth(()=>run(()=>openAccountHome()));
  }
};
window.marketelInspectNativeAction=action=>{
  if(action==='account'){$('account-button').click();return;}
  if(action==='frontdesk'){syncNativeInspectState(currentPage,false);localStorage.setItem('marketel.product','bookings');location.assign('../frontdesk/index.html?native=ios');return;}
  if(action==='refresh')run(async()=>{await refresh();if(draft)editor();else if(account)await list(currentPage==='properties'?'properties':'reports');else landing();notice('Inspect refreshed.');});
};
function showNativeKeyboardDoneButton(){
  if(!native)return;
  let attempts=0;
  const show=()=>{
    attempts+=1;
    const keyboard=window.Capacitor?.Plugins?.Keyboard;
    if(typeof keyboard?.setAccessoryBarVisible==='function')return Promise.resolve(keyboard.setAccessoryBarVisible({isVisible:true})).catch(()=>{});
    if(attempts<8)setTimeout(show,attempts*100);
  };
  show();
}
// One published value: --kb, the height the keyboard is covering, 0 when closed.
// CSS centres the sheet in what is left, so there is no open/closed branch and
// nothing to get stuck. visualViewport.offsetTop is used only to measure the
// inset and never to position anything, because iOS 26 leaves it non-zero after
// the keyboard closes — which is what pinned the sheet to the top of the screen.
// The app also runs Capacitor's Keyboard plugin with resize "none", so on iOS
// the web viewport never shrinks and only the plugin knows the real height.
function trackKeyboard(){
  const root=document.documentElement;
  let nativeKeyboard=0,frame=0;
  const measure=()=>{
    frame=0;
    const viewport=window.visualViewport;
    const webInset=viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
    const inset=Math.round(Math.max(nativeKeyboard,webInset));
    // Below this it is browser chrome settling, not a keyboard.
    root.style.setProperty('--kb',`${inset>60?inset:0}px`);
    settleSheet();
  };
  const apply=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  const heightOf=event=>Number(event?.keyboardHeight??event?.detail?.keyboardHeight??0)||0;
  window.addEventListener('keyboardWillShow',event=>{nativeKeyboard=heightOf(event)||nativeKeyboard;apply();});
  window.addEventListener('keyboardDidShow',event=>{nativeKeyboard=heightOf(event)||nativeKeyboard;apply();});
  window.addEventListener('keyboardWillHide',()=>{nativeKeyboard=0;apply();});
  window.addEventListener('keyboardDidHide',()=>{nativeKeyboard=0;apply();});
  window.visualViewport?.addEventListener('resize',apply);
  window.visualViewport?.addEventListener('scroll',apply);
  window.addEventListener('orientationchange',apply);
  window.addEventListener('focusout',apply);
  apply();
}
trackKeyboard();
window.addEventListener('pagehide',()=>remember());
// Every foreground used to fire two calls; errors are swallowed here so a
// background refresh can never overwrite the sign-out notice or disable a button.
let lastForegroundSync=0;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!session)return;
  if(Date.now()-lastForegroundSync<60000)return;
  lastForegroundSync=Date.now();
  run(async()=>{await api('/billing/refresh',{method:'POST'}).catch(()=>{});await refresh().catch(()=>{});},null);
});
if(native){localStorage.setItem('marketel.product','inspect');showNativeKeyboardDoneButton();syncNativeInspectState('current',true);window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectStorefront'});}
// A cold start often runs before the network is ready. That is not a failure
// worth alarming anyone about: the session and the local draft are intact, so
// boot quietly and let the next action surface any real problem. Only a genuine
// 401 signs the operator out, and confirmSessionLost says so itself.
try{
  draft=await stored('get');
  await refresh().catch(()=>{});
  if(account){await syncInspectAttribution().catch(()=>{});prefetchLists();}
  if(hasUnfinishedDraft())editor();else if(account)await openAccountHome();else if(draft?.finalizedAt)reportPreview();else landing();
  if(new URLSearchParams(location.search).get('checkout')==='success'&&session){
    await api('/billing/refresh',{method:'POST'});
    await refresh();
    notice(account.active?'Inspect is ready. Your subscription is active.':'Payment confirmation is pending. Refresh billing status shortly.',account.active?'success':'');
  }
}catch(e){notice(e.message,'error');if(draft)editor();else landing();}
