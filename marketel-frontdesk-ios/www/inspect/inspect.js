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
// $25 x 12 = $300, so the annual plan saves $101 — and its report allowance is
// the monthly one times twelve, because the quota resets per billing period.
const PLANS = Object.freeze({
  year: Object.freeze({ price: 199, per: '/year', save: 'Save $101', reports: 360, terms: '$199 charged today, then yearly until cancelled.' }),
  month: Object.freeze({ price: 25, per: '/month', save: '', reports: 30, terms: '$25 charged today, then monthly until cancelled.' }),
});
// Monthly leads everywhere a price is shown. A year is not a decision cold
// traffic makes, and defaulting to it is what made the sheet read as a trap.
let planInterval = 'month';
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
const WEDGES = {
  incident: {
    noun: 'detail', nounPlural: 'details',
    seeds: ['What happened', 'Where it happened', 'Who was involved', 'What we did'],
    eyebrow: 'New incident record', dateLabel: 'Date of the incident',
    unit: 'room',
    signers: { manager: 'staff', other: 'witness' },
    disclaimer: 'A record of what was reported and observed at the time. Not a legal, medical or insurance determination.',
  },
  damage: {
    noun: 'room', nounPlural: 'rooms',
    seeds: ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Closet', 'Laundry', 'Balcony'],
    eyebrow: 'New damage report', dateLabel: 'Date you found the damage',
    // A damage report is a list of findings, not a walk through rooms, so
    // nothing has to be named before the first photograph.
    unit: 'entry',
    signers: { manager: 'owner', other: 'guest' },
    disclaimer: 'A dated record of damage as observed. Not a valuation, cause determination or insurance assessment.',
  },
  default: {
    noun: 'room', nounPlural: 'rooms',
    seeds: ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Closet', 'Laundry', 'Balcony'],
    eyebrow: 'New condition report', dateLabel: 'Inspection date',
    unit: 'room',
    signers: { manager: 'manager', other: 'resident' },
    disclaimer: 'Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.',
  },
};
const wedge = type => WEDGES[type] || WEDGES.default;
// An entry is a room with no name: a thing you said plus the photos of it.
// Numbered where it is read, never stored, so nothing claims a location that
// was never given.
const entryTool = type => wedge(type ?? draft?.document?.type).unit === 'entry';
const entryLabel = (room, index) => room?.name || `Finding ${index + 1}`;
const SIGNER_ROLES = { incident: ['manager', 'witness'], damage: ['owner', 'guest'], default: ['manager', 'resident'] };
const signerRoles = type => SIGNER_ROLES[type] || SIGNER_ROLES.default;
const ROLE_LABELS = { witness: 'Witness', resident: 'Resident / tenant', owner: 'Owner / host', guest: 'Guest', manager: 'Manager / inspector' };
const roleLabel = role => ROLE_LABELS[role] || ROLE_LABELS.manager;
// The enum is storage. This is the name the document calls itself.
const TYPE_LABELS = { incident: 'Incident record', damage: 'Damage report', 'move-in': 'Move-in report', 'move-out': 'Move-out report', routine: 'Condition report' };
const typeLabel = type => TYPE_LABELS[type] || TYPE_LABELS.routine;
// Only Inspect offers a choice of document. The other arms were chosen by the
// door someone came through, so a dropdown there is a question with one answer.
const TYPED_ARMS = new Set(['incident', 'damage']);
const COMMON_ROOMS = WEDGES.default.seeds;
const nextRoomName = rooms => {
  const used = new Set((rooms || []).map(room => String(room.name || '').trim().toLowerCase()));
  const w = wedge(draft?.document?.type);
  return w.seeds.find(name => !used.has(name.toLowerCase())) || (w.noun[0].toUpperCase() + w.noun.slice(1));
};
// Where the report was made. Never blocking: a refusal, a timeout or a
// browser without geolocation all resolve to null and the report carries on
// without the line. A document that cannot be finished because someone
// declined a permission prompt is worse than one that says less.
//
// The server stamps the time and rejects anything vaguer than two kilometres,
// so nothing here needs to be trusted — this only has to ask politely and
// give up quickly.
const LOCATION_TIMEOUT = 12000;
function captureFix(){
  if(!navigator.geolocation)return Promise.resolve(null);
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{ if(!settled){ settled=true; resolve(value); } };
    // getCurrentPosition's own timeout is not always honoured in a webview.
    setTimeout(()=>finish(null),LOCATION_TIMEOUT+1000);
    try{
      navigator.geolocation.getCurrentPosition(
        position=>finish({lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy}),
        ()=>finish(null),
        {enableHighAccuracy:true,timeout:LOCATION_TIMEOUT,maximumAge:0});
    }catch{ finish(null); }
  });
}
// Fired when a report is created and again when it is sent, so the pair says
// arrived and finished rather than merely present at an instant. Both are
// best-effort and neither delays the screen.
function markLocation(which){
  if(!draft||draft.finalizedAt)return Promise.resolve();
  return captureFix().then(fix=>{
    if(!fix||!draft||draft.finalizedAt)return;
    draft.document.location={...(draft.document.location||{}),[which]:fix};
    remember();
  }).catch(()=>{});
}
const newDocument = (propertyName, type = 'routine') => ({ propertyName: propertyName || '', author: rememberedAuthor(), type, date: localDate(), rooms: [{ name: entryTool(type) ? '' : wedge(type).seeds[0], observation: '', issue: false, photos: [] }], signatures: [] });
// Every wait on storage is bounded and the database is opened on demand, never
// at module load. WebKit can leave indexedDB.open() pending forever, and a page
// kept in the back/forward cache holds its connection; the boot used to wait on
// that with no limit, which left the banner over a blank page.
const withTimeout = (promise, ms, message = 'Timed out.') => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), ms);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    const opening = withTimeout(new Promise((resolve, reject) => {
      const request = indexedDB.open('marketel-inspect', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Device storage is busy.'));
    }), 2500, 'Device storage did not respond.');
    dbPromise = opening;
    opening.catch(() => { if (dbPromise === opening) dbPromise = null; });
  }
  return dbPromise;
}
// Leaving closes the connection (outstanding writes still finish), so a cached
// page never holds the database the next tool page needs.
window.addEventListener('pagehide', () => { const open = dbPromise; dbPromise = null; open?.then(database => database.close(), () => {}); });
// Each tool keeps its own work in progress: an Inspect draft is not a Claims draft.
const draftKey = () => `current:${toolId()}`;
async function stored(action, value) {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('drafts', action === 'get' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('drafts');
    const key = draftKey();
    const request = action === 'get' ? store.get(key) : action === 'delete' ? store.delete(key) : store.put(value, key);
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
// Drafts used to share one slot across every tool. Move a legacy draft into the
// slot of the tool whose document it is, once, without overwriting newer work.
async function migrateLegacyDraft() {
  const database = await openDb();
  await new Promise((resolve, reject) => {
    const tx = database.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    const legacy = store.get('current');
    legacy.onsuccess = () => {
      if (!legacy.result) return;
      const key = `current:${toolForType(legacy.result.document?.type)}`;
      const existing = store.get(key);
      existing.onsuccess = () => { if (!existing.result) store.put(legacy.result, key); store.delete('current'); };
    };
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
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
  // Uploads and downloads can legitimately take a while; everything else gets
  // a bound, so a request that never answers cannot hold the boot or a button.
  const controller = options.body instanceof FormData || options.blob ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 15000) : 0;
  let response;
  try {
    response = await fetch(API + path, { ...options, ...(controller ? { signal: controller.signal } : {}), headers: { ...headers, ...options.headers }, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
  } catch (error) {
    throw new Error(error?.name === 'AbortError' ? 'Marketel took too long to answer. Check your connection and retry.' : 'Could not reach Marketel. Check your connection and retry.');
  } finally { clearTimeout(timer); }
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
    type:'inspectState',visible,selectedTab:page,authenticated:!!account,hasUnfinishedDraft:hasUnfinishedDraft(),product:skin().product,
    labels:{list:skin().navList,places:skin().navPlaces},
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
  document.documentElement.style.setProperty('--viewport-pan','0px');
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
// One coordinate system owns sheet placement. The layout viewport remains
// stable; visualViewport tells us the band that is actually visible above the
// keyboard. Safari may pan that band, so its offset belongs in the sheet's
// layout coordinate and is separately cancelled on the frozen page behind it.
function settleSheet(){
  const dialog=$('dialog');
  if(!dialog?.open)return;
  // A full-screen sheet is already exactly where it belongs; shifting it would
  // only push it off one edge or the other.
  if(document.documentElement.classList.contains('sheet-full'))return;
  const style=getComputedStyle(document.documentElement);
  const number=name=>parseFloat(style.getPropertyValue(name))||0;
  const keyboard=number('--kb');
  const viewport=window.visualViewport;
  const viewTop=keyboard>0&&viewport?Math.max(0,viewport.offsetTop):0;
  const viewHeight=keyboard>0&&viewport?viewport.height:window.innerHeight;
  const nativeKeyboard=number('--kb-native');
  // The native shell and the web header are hard top boundaries even while the
  // keyboard is open. Dropping this boundary was what let the auth card shoot
  // up over the banner.
  const webHeader=native?0:($('account-button')?.closest('header')?.offsetHeight||64);
  const shellTop=Math.max(number('--shell-top'),webHeader);
  const shellBottom=keyboard>0?0:number('--shell-bottom');
  const top=viewTop+number('--safe-top')+shellTop+12;
  // visualViewport.height already excludes the web keyboard. Capacitor uses
  // resize:none, so only its native keyboard event supplies the covered height.
  const visualBottom=viewTop+viewHeight;
  const nativeBottom=window.innerHeight-nativeKeyboard;
  const bottom=Math.min(visualBottom,nativeBottom)-shellBottom-12;
  const available=Math.max(120,bottom-top);
  dialog.style.setProperty('--sheet-top',`${Math.round(top+available/2)}px`);
  dialog.style.setProperty('--sheet-max-height',`${Math.round(available)}px`);
  document.documentElement.style.setProperty('--viewport-pan',`${Math.round(viewTop)}px`);
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
  const sk = skin();
  const word = document.querySelector('#product-switch span');
  if (word && word.textContent !== sk.product) word.textContent = sk.product;
  $('product-switch').setAttribute('href', sk.home);
  for (const [id, label] of [['current-report', sk.navCreate]]) if ($(id) && $(id).textContent !== label) $(id).textContent = label;
  for (const [page, label] of [['reports', sk.navList], ['properties', sk.navPlaces]]) {
    const button = document.querySelector(`#nav [data-page="${page}"]`);
    if (button && button.textContent !== label) button.textContent = label;
  }
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
const ORIGINAL_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp', 'image/avif': 'avif' };
async function downloadOriginal(remoteId){
  const blob=await api(`/reports/${draft.serverId}/photos/${remoteId}/original`,{blob:true});
  const href=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=href;
  link.download=`marketel-original-${remoteId}.${ORIGINAL_EXTENSIONS[blob.type]||'bin'}`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(href),60000);
}
// The hero promises a transformation, so the proof beneath it has to show one
// rather than the finished artifact. Canned, not a recording: it must be
// legible on first paint and still read correctly when frozen.
const DEMO_SAID = 'Living room, small scuff on the wall beside the doorway, nothing else, everything looks fine.';
let demoTimer = 0;
function playDemo(){
  const demo=$('demo'),said=$('demo-said');
  if(!demo||!said)return;
  const script=landingArm()?.demoSaid||DEMO_SAID;
  clearTimeout(demoTimer);
  // inspect.css only collapses CSS animation and transition durations under
  // reduced motion; a JS typing loop runs straight through that, so ask here.
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
    said.textContent=script;demo.classList.add('is-in');return;
  }
  const cycle=()=>{
    // The landing screen can be replaced mid-loop; stop rather than resurrect it.
    if(!document.body.contains(said))return;
    said.textContent='';demo.classList.remove('is-in');
    let at=0;
    const type=()=>{
      if(!document.body.contains(said))return;
      said.textContent=script.slice(0,++at);
      if(at<script.length){demoTimer=setTimeout(type,32);return;}
      demoTimer=setTimeout(()=>{demo.classList.add('is-in');demoTimer=setTimeout(cycle,4600);},420);
    };
    type();
  };
  cycle();
}
// One account, several front doors. Each arm gets a root-level path because the
// URL is the one piece of positioning that survives being copied out of an ad:
// /incident reads as a product, /inspect/incident reads as a feature of
// Inspect. captureInspectAttribution already stores location.pathname in
// sourceUrl, so the arm is attributed with no new plumbing and utm_campaign
// goes back to naming the campaign rather than doubling as the arm.
//
// Claims and Incident make distinct documents with distinct language; all
// three share the same account and report allowance.
//
// The claims arm deliberately leads with the original files and the deadline
// rather than the AI: evidence must reflect what the owner actually saw, and
// these two ideas do not belong next to each other on this page. The demo further
// down still shows it — mentioned, not headlined.
const SKIN = {
  product: 'Inspect',
  writesLabel: 'Inspect writes',
  doc: 'report', docPlural: 'reports',
  comparisons: true,
  home: '/inspect/',
  terms: 'https://bookmarketel.com/inspect/terms.html',
  termsLabel: 'Inspect terms',
  navList: 'Reports', navCreate: '+ New report', navPlaces: 'Properties',
  listHeading: 'Your reports',
  placesHeading: 'Properties',
  placesLede: 'Start a fresh report, or compare a move-out with the last finalized condition report.',
  placesEmpty: 'Properties appear here after you save a report.',
  propertyPrompt: 'Which property?',
  demoBadge: 'EXAMPLE \u00b7 NOT A REAL INSPECTION',
  documentLabel: 'MARKETEL INSPECT',
  offerHeading: 'Keep every walkthrough on the record.',
  offerAnchor: 'One argument about damage costs more than a year of Inspect.',
  offerPoints: [
    'Talk through a room and Inspect writes the note',
    'No per-property or per-room fees',
    'PDF export and a private share link on every report',
    'Before and after move-out comparisons',
  ],
};
const LANDING_ARMS = {
  incident: {
    type: 'incident',
    demoSaid: 'The guest reported slipping near the lobby entrance at 6 pm. I put out a warning sign and called the manager.',
    demoNote: 'Guest reported slipping near the lobby entrance at 6 pm. A warning sign was placed and the manager was called.',
    eyebrow: 'For hotels, short-lets and venues',
    title: 'Write the incident report<br>before anyone goes home.',
    lede: 'What happened, where, who was involved and what you did \u2014 photographed, timed, signed by a witness, and exported as a PDF.',
    skin: {
      product: 'Incident',
      writesLabel: 'it writes',
      doc: 'record', docPlural: 'records',
      comparisons: false,
      home: '/incident',
      terms: 'https://bookmarketel.com/incident/terms',
      termsLabel: 'Incident terms',
      navList: 'Records', navCreate: '+ New record', navPlaces: 'Locations',
      listHeading: 'Your records',
      placesHeading: 'Locations',
      placesLede: 'Start a fresh record for a site you have logged before.',
      placesEmpty: 'Locations appear here after you save a record.',
      propertyPrompt: 'Which location?',
      demoBadge: 'EXAMPLE \u00b7 NOT A REAL INCIDENT',
      documentLabel: 'MARKETEL INCIDENT',
      offerHeading: 'Keep every incident on the record.',
      offerAnchor: 'A single disputed incident costs more than a year of this subscription.',
      offerPoints: [
        'Talk through what happened and it writes the record',
        'No per-site or per-record fees',
        'Witness signature captured and timed on the record',
        'PDF export on every record',
      ],
    },
  },
  claims: {
    demoSaid: 'Kitchen, chipped counter edge beside the sink. Found it at checkout. I took photos before cleaning.',
    demoNote: 'Chipped counter edge beside the kitchen sink, found at checkout. Photos taken before cleaning.',
    eyebrow: 'For short-let and rental hosts',
    title: 'Document the damage<br>while it is in front of you.',
    lede: 'Room-by-room photos kept as uploaded, with a dated report you can send before the claim window closes.',
    type: 'damage',
    // Free to build; paid when the finished report is sent. The ask lands at
    // the moment someone has just seen their own report, in the same session.
    golden: {
      headline: 'Document guest damage <span class="green">before the claim window closes.</span>',
      sub: 'Build a dated, photo-by-photo damage report in under 3 minutes.',
      cta: 'Build my free damage report →',
      note: 'Free to build. Takes 3 minutes. Pay only when you send it.',
      proof: 'Airbnb asks hosts to request reimbursement within 14 days of checkout.',
      jobTitle: 'Which rental had the damage?',
      jobLabel: 'Rental property / unit',
      jobPlaceholder: 'Pine Ave · Unit 2',
      photoLabel: 'Add a photo of the damage',
      building: 'Building your damage report',
      reveal: 'Here is what your guest or the platform receives.',
    },
    skin: {
      product: 'Claims',
      writesLabel: 'it writes',
      doc: 'report', docPlural: 'reports',
      comparisons: false,
      navList: 'Reports', navCreate: '+ New damage report', navPlaces: 'Properties',
      propertyPrompt: 'Which rental property?',
      placesHeading: 'Properties',
      placesEmpty: 'Properties appear here after you save a damage report.',
      home: '/claims',
      terms: 'https://bookmarketel.com/claims/terms',
      termsLabel: 'Claims terms',
      listHeading: 'Your damage reports',
      placesLede: 'Start a fresh damage report for a property you have documented before.',
      demoBadge: 'EXAMPLE \u00b7 NOT REAL DAMAGE',
      documentLabel: 'MARKETEL CLAIMS',
      offerHeading: 'Document it while it is still there.',
      offerAnchor: 'One claim you cannot evidence costs more than a year of this subscription.',
      offerPoints: [
        'Talk through a room and it writes the note',
        'Every uploaded photo kept as received',
        'No per-property or per-room fees',
        'PDF export and a private share link on every report',
      ],
    },
  },
};
const documentFileName = type => type === 'incident' ? 'incident-record.pdf' : type === 'damage' ? 'damage-report.pdf' : 'inspection-report.pdf';
// Root path first, then the legacy /inspect/<arm> path, then utm_campaign as a
// fallback so links already in flight keep working. The SPA never rewrites the
// URL, so this answer is stable for the whole session.
// The negative lookahead keeps the bare product path out: without it
// /inspect/ reads as an arm named `inspect`, which is harmless only until
// a slug collides with it.
const ARM_PATH = /^\/(?:inspect\/)?(?!inspect\/?$)([a-z][a-z-]*)\/?$/;
const landingArm = () => {
  if (native) {
    const chosen = new URLSearchParams(location.search).get('arm');
    const stored = localStorage.getItem('marketel.product');
    return LANDING_ARMS[chosen] || LANDING_ARMS[stored] || null;
  }
  const fromPath = (location.pathname.match(ARM_PATH) || [])[1];
  const fromParam = new URLSearchParams(location.search).get('utm_campaign') || '';
  return LANDING_ARMS[fromPath] || LANDING_ARMS[fromParam.toLowerCase()] || null;
};
// The chrome follows the arm someone arrived through, not the document they
// happen to have open: a returning owner who bookmarked /inspect/ sees Inspect
// even while opening an incident, which is honest, because the account really
// is one account.
const skin = () => ({ ...SKIN, ...(landingArm()?.skin || {}) });
// Which document types belong to which tool. Drafts, lists and hand-offs all
// follow it, so switching tools never shows one tool's work under another's name.
const TOOL_TYPES = Object.freeze({ inspect: ['routine', 'move-in', 'move-out'], claims: ['damage'], incident: ['incident'] });
const toolId = () => { const arm = landingArm(); return Object.keys(LANDING_ARMS).find(key => LANDING_ARMS[key] === arm) || 'inspect'; };
const toolForType = type => Object.keys(TOOL_TYPES).find(tool => TOOL_TYPES[tool].includes(type)) || 'inspect';
const toolTypesQuery = () => `types=${TOOL_TYPES[toolId()].join(',')}`;
// A tool is either 'first-free' (one lifetime free finalized report) or
// 'pay-at-export' (free to build, paid when a finished report is sent). The
// two are independent of the single-report price: a first-free tool gives the
// first one away and then sells the next at the same impulse price, because
// the alternative at that moment is a monthly subscription — and asking a cold
// click for a subscription is the shape that produced nothing on the booking
// funnel. Mirrors TOOLS in inspect.js; keep the two in step.
const TOOL_OFFERS = Object.freeze({
  inspect: Object.freeze({ mode: 'first-free', reportPrice: 12 }),
  claims: Object.freeze({ mode: 'pay-at-export', reportPrice: 12 }),
  incident: Object.freeze({ mode: 'first-free', reportPrice: 12 }),
});
const toolOffer = () => TOOL_OFFERS[toolId()] || TOOL_OFFERS.inspect;
const payAtExport = () => toolOffer().mode === 'pay-at-export';
const reportPrice = () => toolOffer().reportPrice || 0;
const canSend = () => !!account && ((account.active && account.remaining > 0) || account.credits > 0 || (!payAtExport() && account.freeAvailable));
const storedEmail = () => { try { return localStorage.getItem('inspect.email') || ''; } catch { return ''; } };
// Each step a visitor takes, per tool, before and after sign-in. Never content:
// a name, the tool, an anonymous visitor id and at most a decline reason.
const visitorId = (() => { try { let value = localStorage.getItem('inspect.visitor') || ''; if (!/^v_[A-Za-z0-9]{8,40}$/.test(value)) { value = `v_${uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`; localStorage.setItem('inspect.visitor', value); } return value; } catch { return ''; } })();
const trackedSteps = new Set();
function track(name, detail, once = true) {
  if (once && trackedSteps.has(name)) return;
  trackedSteps.add(name);
  api(session ? '/events' : '/events/anon', { method: 'POST', body: { name, tool: toolId(), visitorId, detail } }).catch(() => {});
}
const DECLINE_REASONS = [['too_expensive', 'Too expensive'], ['only_needed_one', 'I only needed one'], ['missing_something', 'It is missing something I need'], ['just_looking', 'Just looking']];
// A document carries its own brand, whichever tool it was opened through.
const documentLabelFor = type => type === 'damage' ? 'MARKETEL CLAIMS' : type === 'incident' ? 'MARKETEL INCIDENT' : 'MARKETEL INSPECT';
// ——— The simulation funnel (?sim=1) ———————————————————————————————
// A cold click off an ad cannot photograph anything: they are in bed, at work,
// in a car. Every funnel that asks them to build a real report fails at step
// one. So this one builds a report in front of them instead — our photos,
// their taps, and the single thing about this product that a screenshot cannot
// show, which is speech turning into written prose.
//
// It never touches draft, IndexedDB or /reports. It paints, it sells, and it
// dies when the tab closes.
const SIMS = {
  inspect: {
    heading: 'Create your inspection report',
    property: '123 Main Street', unit: 'Unit 4B',
    findings: [
      { id: 'wall', label: 'Wall scuff', room: 'Living Room', photo: 'inspect-wall',
        said: 'living room wall beside the door has a scuff and some of the paint has come away',
        note: 'Scuffing and localised paint loss on the lower wall beside the door frame, approximately 30cm across. Photographed for record.' },
      { id: 'carpet', label: 'Carpet wear', room: 'Bedroom', photo: 'inspect-carpet',
        said: 'bedroom carpet is worn flat along the walkway through to the hall',
        note: 'Flattened pile and visible wear along the traffic path between the bedroom and hallway. No staining or tearing observed.' },
      { id: 'grout', label: 'Grout and sealant', room: 'Bathroom', photo: 'inspect-grout',
        said: 'bathroom grout along the bottom of the tiles is going black in the corner',
        note: 'Discoloured grout and early mildew along the base of the tiled wall in the corner. Cleaning or resealing recommended.' },
    ],
  },
  claims: {
    heading: 'Create your damage report',
    property: '123 Main Street', unit: 'Unit 4B',
    findings: [
      { id: 'wall', label: 'Wall damage', room: 'Living Room', photo: 'claims-wall',
        said: 'there is a hole punched right through the wall by the bedroom door, the plasterboard is broken through',
        note: 'Impact damage to the wall beside the bedroom door: plasterboard punctured through, approximately 15cm across, with cracked paint around the opening.' },
      { id: 'carpet', label: 'Carpet stain', room: 'Bedroom', photo: 'claims-carpet',
        said: 'big red wine stain soaked into the bedroom carpet next to the drawers',
        note: 'Large red wine stain soaked into the bedroom carpet beside the chest of drawers, approximately 50cm across. Photographed before any cleaning.' },
      { id: 'cabinet', label: 'Broken cabinet', room: 'Kitchen', photo: 'claims-cabinet',
        said: 'kitchen cabinet door is hanging off, the hinge has torn straight out of the wood',
        note: 'Kitchen cabinet door detached at the hinge, with the screw fixings torn out of the door frame and the surrounding timber split.' },
    ],
  },
};
const simTool = () => SIMS[toolId()] || null;
// Phone-shaped only. A fake iOS camera sheet in a desktop browser reads as
// broken, and the traffic this exists for is almost entirely mobile.
function simActive(){
  if(native||!simTool())return false;
  if(new URLSearchParams(location.search).get('sim')!=='1')return false;
  return window.matchMedia?.('(max-width: 760px)')?.matches ?? window.innerWidth<=760;
}
const simReduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const simPhoto = (name,thumb=false) => `/inspect/sample/${name}${thumb?'-thumb':''}.jpg`;
let simPicked = null;
// Real speech is bursts at syllable rate with pauses at punctuation, so the
// bar heights come from the sentence itself. An even wave reads as fake on
// sight, and this has to pass for a recording of the line being spoken.
function speechEnvelope(text,bars=40){
  const chars=[...String(text||'')];
  if(!chars.length)return new Array(bars).fill(0.1);
  const weight=c=>/[aeiouy]/i.test(c)?1:/[.,;!?]/.test(c)?0.05:/\s/.test(c)?0.1:0.5;
  const out=[];
  for(let i=0;i<bars;i++){
    const from=Math.floor(i*chars.length/bars),to=Math.max(from+1,Math.floor((i+1)*chars.length/bars));
    let sum=0;for(let j=from;j<to&&j<chars.length;j++)sum+=weight(chars[j]);
    out.push(Math.min(1,0.16+(sum/(to-from))*0.95));
  }
  return out;
}
// They paid from the simulation, so there is no session to come back to: the
// account was created from the email Stripe collected. The one thing worth
// saying here is how to get into it, and where the app is.
function simThanks(){
  enterScreen('sim');
  const sk=skin();
  document.documentElement.classList.add('sim-mode');
  $('app').innerHTML=`<section class="sim sim-thanks"><h1>You're subscribed to Marketel ${esc(sk.product)}.</h1><p class="muted">Your account is set up under the email you paid with. Sign in with that address and your first real ${esc(sk.doc)} is ready to start.</p><button type="button" id="sim-signin" class="wide">Sign in and start →</button><a class="button secondary wide" href="${esc(appStoreUrl)}">Get the iPhone app</a><p><small>The app is where you talk through a ${esc(sk.doc)} while you are standing in the property.</small></p></section>`;
  $('sim-signin').onclick=()=>{
    document.documentElement.classList.remove('sim-mode');
    history.replaceState(null,'',location.pathname);
    ensureAuth(()=>run(()=>openAccountHome()),'signin');
  };
}
function simResume(){
  const state=new URLSearchParams(location.search).get('checkout');
  if(state==='success'){simThanks();return;}
  const s=simTool();
  let picked=null;
  try{picked=sessionStorage.getItem('inspect.sim.pick');}catch{}
  simPicked=s.findings.find(f=>f.id===picked)||null;
  if(state==='cancelled'&&simPicked){history.replaceState(null,'',`${location.pathname}?sim=1`);simReport();return;}
  simIntro();
}
function simIntro(){
  enterScreen('sim');
  const s=simTool();
  document.documentElement.classList.add('sim-mode');
  track('SimStarted');
  $('app').innerHTML=`<section class="sim sim-intro"><h1>${esc(s.heading)}<br><span class="green">in under 20 seconds</span></h1><p class="muted">We have filled in the details and picked the sample photos for you. We just want to show you what you get.</p><div class="sim-fields"><div><small>Property</small><strong>${esc(s.property)}</strong></div><div><small>Unit</small><strong>${esc(s.unit)}</strong></div></div><h2 class="sim-prompt">Pick something to document.</h2><div class="sim-picks">${s.findings.map(f=>`<button type="button" class="sim-pick" data-sim-pick="${esc(f.id)}"><img src="${esc(simPhoto(f.photo,true))}" alt=""><span>${esc(f.label)}</span></button>`).join('')}</div><p class="sim-foot"><small>These are samples. In the real thing they are your photos.</small></p></section>`;
  for(const button of $('app').querySelectorAll('[data-sim-pick]'))
    button.onclick=()=>simCamera(s.findings.find(f=>f.id===button.dataset.simPick)||s.findings[0]);
}
function simCamera(finding){
  enterScreen('sim');
  simPicked=finding;
  try{sessionStorage.setItem('inspect.sim.pick',finding.id);}catch{}
  track('SimFindingPicked',finding.id);
  $('app').innerHTML=`<section class="sim sim-camera"><div class="sim-view" id="sim-view"><img class="sim-feed" src="${esc(simPhoto(finding.photo))}" alt=""><div class="sim-grain"></div><div class="sim-reticle"></div><div class="sim-flash" id="sim-flash"></div><p class="sim-hint">${esc(finding.room)} · ${esc(finding.label)}</p></div><div class="sim-bar"><div class="sim-strip" id="sim-strip"></div><button type="button" id="sim-shutter" class="sim-shutter" aria-label="Take photo"></button><p class="muted"><small>Tap to photograph it.</small></p></div></section>`;
  let taken=false;
  $('sim-shutter').onclick=()=>{
    if(taken)return;taken=true;
    track('SimPhotoTaken',finding.id);
    const quick=simReduced();
    if(!quick){
      $('sim-view').classList.add('is-capturing');
      $('sim-flash').classList.add('is-on');
      setTimeout(()=>{$('sim-view')?.classList.remove('is-capturing');$('sim-flash')?.classList.remove('is-on');},220);
    }
    const tile=document.createElement('img');
    tile.className='sim-shot';tile.src=simPhoto(finding.photo,true);tile.alt='';
    $('sim-strip').appendChild(tile);
    requestAnimationFrame(()=>tile.classList.add('is-in'));
    setTimeout(()=>simTalk(finding),quick?0:540);
  };
}
// The hold is the speaking. No microphone and no permission prompt: a
// permission dialog on cold traffic is a hard stop, and the words appearing
// under their own finger is what makes this feel like theirs rather than a
// video they are stuck in.
function simTalk(finding){
  enterScreen('sim');
  const s=simTool(),levels=speechEnvelope(finding.said),words=finding.said.split(/\s+/).filter(Boolean);
  $('app').innerHTML=`<section class="sim sim-talk"><p class="sim-eyebrow">${esc(s.property)} · ${esc(s.unit)}</p><h1>${esc(finding.room)} <span class="sim-count">1 photo</span></h1><div class="sim-note" id="sim-note"><span class="sim-hint-line" id="sim-hint-line">Hold the button and say what you are looking at.</span><span class="sim-said" id="sim-said"></span><div class="sim-written" id="sim-written"><p>${esc(finding.note)}</p><small>Written up by Marketel ${esc(skin().product)}</small></div></div><div class="sim-wave" id="sim-wave">${levels.map(()=>'<i></i>').join('')}</div><div class="sim-strip"><img class="sim-shot is-in" src="${esc(simPhoto(finding.photo,true))}" alt=""></div><div class="sim-actions"><button type="button" id="sim-talk-button" class="sim-talk-button">Hold to talk</button><p class="muted"><small>In the real app this is your voice.</small></p></div></section>`;
  const note=$('sim-note'),said=$('sim-said'),hint=$('sim-hint-line'),wave=$('sim-wave'),button=$('sim-talk-button');
  const ticks=[...wave.querySelectorAll('i')];
  const perWord=220,span=Math.max(900,words.length*perWord);
  let holding=false,elapsed=0,last=0,frame=0,settled=false;
  const paint=progress=>{
    const shown=Math.max(1,Math.round(words.length*Math.min(1,progress)));
    said.textContent=words.slice(0,shown).join(' ');
    hint.classList.add('is-gone');
    const head=Math.min(1,progress)*ticks.length;
    ticks.forEach((bar,i)=>{
      bar.style.transform=`scaleY(${(i<head?levels[i]:0.08).toFixed(3)})`;
      bar.classList.toggle('is-live',i<head);
    });
  };
  const settle=()=>{
    if(settled)return;settled=true;
    cancelAnimationFrame(frame);
    holding=false;button.classList.remove('is-live');button.textContent='Hold to talk';
    button.disabled=true;
    paint(1);
    track('SimNoteWritten',finding.id);
    const reveal=()=>{
      note.classList.add('is-written');
      wave.classList.add('is-done');
      const next=document.createElement('button');
      next.type='button';next.id='sim-see';next.className='wide';next.textContent=`See the ${skin().doc} →`;
      next.onclick=()=>simReport();
      $('app').querySelector('.sim-actions').replaceChildren(next);
      if(!simReduced())setTimeout(()=>{if($('sim-see'))simReport();},2200);
    };
    simReduced()?reveal():setTimeout(reveal,420);
  };
  const tick=now=>{
    if(!holding)return;
    elapsed+=Math.min(64,now-(last||now));last=now;
    const progress=elapsed/span;
    paint(progress);
    if(progress>=1){settle();return;}
    frame=requestAnimationFrame(tick);
  };
  const start=event=>{
    event.preventDefault();
    if(settled||holding)return;
    holding=true;last=0;
    button.classList.add('is-live');button.textContent='Listening…';
    frame=requestAnimationFrame(tick);
  };
  // Letting go early finishes the line rather than truncating it: the written
  // note is the whole point of the screen, and a half sentence would sell it short.
  const stop=()=>{ if(!holding||settled)return; holding=false; cancelAnimationFrame(frame); settle(); };
  button.addEventListener('pointerdown',start);
  button.addEventListener('pointerup',stop);
  button.addEventListener('pointercancel',stop);
  button.addEventListener('pointerleave',stop);
  // A plain click (assistive tech, or a browser that sends no pointer events)
  // still has to reach the note.
  button.addEventListener('click',event=>{event.preventDefault();if(!settled&&!holding)settle();});
}
function simReport(){
  enterScreen('sim');
  const s=simTool(),sk=skin();
  track('SimReportShown');
  const ordered=[simPicked,...s.findings.filter(f=>f!==simPicked)].filter(Boolean);
  const sample={srcFor:photo=>simPhoto(photo),sourceLabel:'Camera capture'};
  const rooms=ordered.map(f=>({name:f.room,observation:f.note,photos:[f.photo],issue:false}));
  const plan=PLANS[planInterval]||PLANS.month;
  $('app').innerHTML=`<section class="sim sim-report"><small class="eyebrow">Your ${esc(sk.doc)}, as it would be sent.</small><article class="card sim-doc"><div class="sim-stamp">SAMPLE</div><small>${esc(documentLabelFor(landingArm()?.type||'routine'))}</small><h1>${esc(s.property)}</h1><p class="muted">${esc(s.unit)} · ${esc(localDate())}</p>${rooms.map((room,index)=>reportRoom(room,'',index,sample)).join('')}<p><small>Sample document. Real ${esc(sk.docPlural)} use your photos and your voice, and export as PDF.</small></p></article><section class="card sim-offer" id="sim-offer"><h2>That was a sample. Make real ones.</h2><p class="muted">Your photos, your voice, and a finished ${esc(sk.doc)} before you leave the property.</p><div class="billing-toggle" role="radiogroup" aria-label="Billing period"><button type="button" role="radio" aria-checked="${planInterval==='year'}" data-sim-plan="year">Annual</button><button type="button" role="radio" aria-checked="${planInterval==='month'}" data-sim-plan="month">Monthly</button></div><div class="price">$${plan.price} <small>${esc(plan.per)}</small></div><p class="price-save">${planInterval==='year'?`${esc(PLANS.year.save)} · $16.58/month`:'Cancel anytime.'}</p><ul class="offer-points"><li>Unlimited ${esc(sk.docPlural)}</li><li>No per-property or per-room fees</li><li>Talk through it and ${esc(sk.writesLabel||'it writes')} the notes</li><li>PDF export on every ${esc(sk.doc)}</li></ul><button type="button" id="sim-buy" class="wide">Start Marketel ${esc(sk.product)} →</button><p class="offer-reversal"><small>${esc(plan.terms)}</small></p><p><small>Payment by Stripe. <a href="${esc(sk.terms)}">${esc(sk.termsLabel)}</a></small></p></section></section>`;
  for(const button of $('app').querySelectorAll('[data-sim-plan]'))
    button.onclick=()=>{planInterval=button.dataset.simPlan==='year'?'year':'month';simReport();};
  $('sim-buy').onclick=event=>run(async()=>{
    haptic();
    const r=await api('/checkout/sim',{method:'POST',body:{interval:planInterval,tool:toolId(),visitorId}});
    openExternal(r.url);
  },event.currentTarget);
  // "Viewed" should mean seen, not merely rendered — the offer sits below a
  // full page of report.
  const offer=$('sim-offer');
  if(typeof IntersectionObserver==='function'){
    const watch=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){track('SimOfferViewed');watch.disconnect();}
    },{threshold:0.35});
    watch.observe(offer);
  }else track('SimOfferViewed');
}
function landing() {
  enterScreen('landing');
  const arm = landingArm();
  updateHeader();
  setActiveNav('current');
  track('LandingViewed');
  if (!native && payAtExport()) return goldenLanding(arm);
  $('app').innerHTML = `<section class="hero"><div class="eyebrow">${esc(arm?.eyebrow||'For small property managers')}</div><h1>${arm?.title||'Talk through each room.<br>Inspect writes the notes.'}</h1><p class="muted">${esc(arm?.lede||'Your photos and observations, packaged into a finished report before you leave.')}</p><button id="start">Create your first ${esc(skin().doc)} free</button><p><small>Your first complete report across Marketel Inspect is free. No card.</small></p><button id="see-plans" class="quiet">See plans</button><button id="sign-in" class="quiet">Already have reports? Sign in</button>${demoMarkup(arm)}</section>`;
  if(arm){
    $('demo-result').querySelector('.demo-note').textContent=arm.demoNote;
    if(arm.type==='incident')$('demo-result').querySelector('.demo-badge').remove();
    $('sign-in').textContent=`Already have ${skin().docPlural}? Sign in`;
    $('app').querySelector('.hero > p > small').textContent='Your first complete report across Inspect, Claims and Incident is free. No card.';
  }
  playDemo();
  $('start').onclick = () => start();
  $('see-plans').onclick=previewPlans;
  // People reach the app through the web funnel, so most of them already have
  // an account there. On the web the free report stays the one primary action.
  if(native){$('sign-in').className='secondary wide';$('start').classList.add('wide');$('start').after($('sign-in'));}
  $('sign-in').onclick=()=>ensureAuth(()=>run(()=>openAccountHome()),'signin');
  settleWedgeEntrance();
}
function demoMarkup(arm){
  return `<article class="card demo" id="demo"><small class="eyebrow">${esc(skin().demoBadge)}</small><div class="demo-step"><span class="demo-label">You say</span><blockquote id="demo-said"></blockquote></div><div class="demo-arrow" aria-hidden="true">↓</div><div class="demo-step" id="demo-result"><span class="demo-label">${esc(skin().writesLabel)}</span><p class="demo-note">Small scuff on the wall beside the doorway. No other observations recorded.</p><em class="demo-badge">Issue noted</em></div><small>Add your photos, then export a PDF${arm?.type==='incident'?'':' or a private link'}.</small></article><p><small>${esc(wedge(arm?.type).disclaimer)}</small></p>`;
}
// The booking funnel's landing, which is what already worked: one pain, one
// field, one button, one line of proof. The email is the lead; there is no code
// here, so nothing stands between the ad and the build.
function goldenLanding(arm){
  const g=arm.golden||{},sk=skin();
  $('app').innerHTML=`<section class="hero golden"><div class="eyebrow">${esc(arm.eyebrow||'')}</div><h1>${g.headline||arm.title}</h1><p class="muted">${esc(g.sub||arm.lede||'')}</p><form id="lead-form" class="lead-box" novalidate><input id="lead-email" type="email" autocomplete="email" inputmode="email" placeholder="Your email" aria-label="Your email" value="${esc(storedEmail())}"><button id="start">${esc(g.cta||`Build my free ${sk.doc} →`)}</button></form><p class="lead-note"><small>${esc(g.note||'')}</small></p>${g.proof?`<p class="proof">${esc(g.proof)}</p>`:''}<button id="see-plans" class="quiet">See prices</button><button id="sign-in" class="quiet">Already have ${esc(sk.docPlural)}? Sign in</button>${demoMarkup(arm)}</section>`;
  $('demo-result').querySelector('.demo-note').textContent=arm.demoNote||'';
  playDemo();
  $('lead-form').onsubmit=event=>{
    event.preventDefault();
    const email=$('lead-email').value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('lead-email').classList.add('invalid');notice('Enter your email to build your report.','error');return;}
    try{localStorage.setItem('inspect.email',email);}catch{}
    api('/leads',{method:'POST',body:{email,tool:toolId(),visitorId,attribution:inspectAttribution}}).catch(()=>{});
    haptic();setupFlow();
  };
  $('lead-email').oninput=()=>$('lead-email').classList.remove('invalid');
  $('see-plans').onclick=previewPlans;
  $('sign-in').onclick=()=>ensureAuth(()=>run(()=>openAccountHome()),'signin');
}
// Two small steps before anything is asked of anyone, like the booking setup:
// the business the report is sent under, then the first job. A returning owner
// whose business is already on file goes straight to the job.
function setupFlow(){
  track('SetupStarted');
  const arm=landingArm(),g=arm?.golden||{},w=wedge(arm?.type),sk=skin();
  let business=account?.businessName||'';
  try{business||=localStorage.getItem('inspect.business')||'';}catch{}
  let logo=null,logoURL='';
  const flow=flowScreen('','setup-screen');
  const one=()=>{
    flow.paint(`<p class="setup-step">Step 1 of 2</p><h2>What's your business called?</h2><p class="muted">Your ${esc(sk.doc)} is sent under this name.</p><label>Business name<input id="setup-business" maxlength="120" autocomplete="organization" placeholder="Pine Street Stays" value="${esc(business)}"></label>${logoURL?`<div class="logo-preview"><img src="${esc(logoURL)}" alt="Your logo"></div>`:''}<label class="button secondary logo-pick">${logo?'Change logo':'Add your logo'} <small>(optional)</small><input type="file" id="setup-logo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden></label><button type="button" id="setup-next" class="wide">Continue →</button><p class="muted"><small>We'll save your progress as you go.</small></p>`);
    $('setup-logo').onchange=event=>{
      const file=event.target.files?.[0];if(!file)return;
      if(file.size>12*1024*1024)return notice('That logo is too large. Maximum 12 MB.','error');
      business=$('setup-business').value;logo=file;if(logoURL)URL.revokeObjectURL(logoURL);logoURL=URL.createObjectURL(file);one();
    };
    $('setup-next').onclick=()=>{
      business=$('setup-business').value.trim();
      if(!business)return notice('Enter your business name.','error');
      try{localStorage.setItem('inspect.business',business);}catch{}
      haptic();two();
    };
  };
  const two=()=>{
    flow.paint(`<p class="setup-step">Step ${account?.businessName?'1 of 1':'2 of 2'}</p><h2>${esc(g.jobTitle||sk.propertyPrompt)}</h2><p class="muted">Just enough to start. You add rooms, photos and notes next.</p><label>${esc(g.jobLabel||'Property / unit name')}<input id="setup-property" maxlength="160" placeholder="${esc(g.jobPlaceholder||'Oak Street · Unit 2')}"></label><label class="date-field">${esc(w.dateLabel)}<input type="date" id="setup-date" value="${esc(localDate())}"></label><label class="button secondary">${esc(g.photoLabel||'Add a first photo')} <small>(optional)</small><input type="file" id="setup-photo" data-files="0" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden></label><p id="setup-photo-name" class="muted"></p><button type="button" id="setup-build" class="wide">Build my ${esc(sk.doc)} →</button>${account?.businessName?'':'<button type="button" id="setup-back" class="quiet">← Back</button>'}`);
    $('setup-photo').onchange=event=>{$('setup-photo-name').textContent=event.target.files?.[0]?'Photo added.':'';};
    if($('setup-back'))$('setup-back').onclick=one;
    $('setup-build').onclick=event=>run(async()=>{
      const property=$('setup-property').value.trim();
      if(!property)throw new Error(`Enter the ${(g.jobLabel||'property').toLowerCase()} first.`);
      const date=$('setup-date').value||localDate();
      const photo=$('setup-photo');
      flow.paint(`<div class="building"><section class="loading">${esc(g.building||`Building your ${sk.doc}`)}…</section><p class="muted">${esc(property)}${business?` · ${esc(business)}`:''}</p></div>`);
      clearURLs();
      draft={document:newDocument(property,arm?.type||'routine'),files:[],serverId:null,finalizedAt:null,branding:{name:business,logo}};
      markLocation('start');
      draft.document.date=date;
      if(!draft.document.author.trim())draft.document.author=business;
      preview=false;await persist();
      track('SetupCompleted');
      await new Promise(resolve=>setTimeout(resolve,900));
      flow.restore();
      if(photo?.files?.length)await addPhotos(photo);else editor('rooms');
    },event.currentTarget);
  };
  if(account?.businessName)two();else one();
}
// Pricing stays one tap away without turning a no-card free report into a
// purchase decision. This is informational: it neither fires the post-report
// offer event nor opens checkout.
function previewPlans(){
  let flow=null;
  const paint=()=>{
    const plan=PLANS[planInterval],each=plan.price/plan.reports;
    const unit=each<1?`${Math.round(each*100)}¢`:`$${each.toFixed(2)}`;
    const sub=planInterval==='year'?`$${(plan.price/12).toFixed(2)}/month, billed annually · ${plan.save}`:'Cancel renewal anytime.';
    flow.paint(`<h2>${payAtExport()?'Prices':`Plans after your free ${esc(skin().doc)}`}</h2><p class="muted">${payAtExport()?`Building a ${esc(skin().doc)} is free. You pay only when you send it: $${reportPrice()} for a single ${esc(skin().doc)}, or a plan.`:`Finish and export your first complete ${esc(skin().doc)} before choosing anything.`}</p><div class="billing-toggle" role="radiogroup" aria-label="Billing period"><button type="button" role="radio" aria-checked="${planInterval==='year'}" data-preview-plan="year">Annual</button><button type="button" role="radio" aria-checked="${planInterval==='month'}" data-preview-plan="month">Monthly</button></div><div class="price">$${plan.price} <small>${plan.per}</small></div><p class="price-save">${sub}</p><ul class="offer-points"><li>One operator</li><li>No per-property or per-room fees</li><li>${plan.reports} ${esc(skin().docPlural)} — about ${unit} each</li><li>${esc(skin().offerPoints[0])}</li><li>${esc(landingArm()?.type==='incident'?'PDF export on every record':'PDF export and a private share link')}</li></ul><button type="button" id="plan-start" class="wide">${payAtExport()?`Build my ${esc(skin().doc)} free`:`Create my first ${esc(skin().doc)} free`}</button><p><small>${payAtExport()?`Or $${reportPrice()} for a single ${esc(skin().doc)}, paid only when you send it.`:'No card for your first complete report across the three Marketel tools.'} <a href="${esc(skin().terms)}">${esc(skin().termsLabel)}</a></small></p>`);
    document.querySelectorAll('[data-preview-plan]').forEach(button=>button.onclick=()=>{planInterval=button.dataset.previewPlan==='month'?'month':'year';paint();});
    $('plan-start').onclick=()=>{flow.restore();start();};
  };
  flow=flowScreen('','plans-screen');paint();
}
async function start(propertyName = '', type) {
  dismissFlow();
  if (draftUnsaved() && !await confirmAction({title:`Start a new ${skin().doc}?`,message:'Your current draft is not saved online yet.',confirmLabel:`Start new ${skin().doc}`,danger:true})) return;
  if (payAtExport() && !propertyName) return setupFlow();
  clearURLs(); draft = { document: newDocument(propertyName, type || landingArm()?.type || 'routine'), files: [], serverId: null, finalizedAt: null }; preview = false;
  markLocation('start');
  await persist(); editor();
}
function editor(step) {
  if (!draft) return landing();
  dismissFlow();
  updateHeader();
  setActiveNav('current');
  const d = draft.document;
  d.signatures ||= [];
  if (preview || draft.finalizedAt) return reportPreview();
  // The draft decides which step opens: an unnamed report needs its details, a
  // named one is ready for the work. Returning lands on the work, not the form.
  editorStep = step || (d.propertyName.trim() ? 'rooms' : 'details');
  const w = wedge(d.type);
  enterScreen(`editor:${editorStep}`);
  const bar = `<div class="screen-bar">${account
    ? `<button type="button" id="editor-back" class="quiet">← All ${esc(skin().docPlural)}</button>`
    : `<button type="button" id="editor-signin" class="quiet">Already have ${esc(skin().docPlural)}? Sign in</button>`}<button type="button" id="editor-discard" class="quiet danger">Discard</button></div>`;
  if (editorStep === 'details') {
    $('app').innerHTML = `${bar}<div class="row spread"><div><small class="eyebrow">${esc(w.eyebrow)}</small><h1>${esc(skin().propertyPrompt)}</h1></div></div><section class="card grid"><div class="property-field"><label>Property / unit name<input id="property" maxlength="160" value="${esc(d.propertyName)}" placeholder="Oak Street · Unit 2"></label>${account?'<button type="button" id="use-existing-property" class="quiet inline-action">Use existing property</button>':''}</div><label>Your name<input id="author" maxlength="120" value="${esc(d.author)}" placeholder="Report prepared by"></label><label class="date-field">${esc(w.dateLabel)}<input type="date" id="date" value="${esc(d.date)}"></label>${TYPED_ARMS.has(d.type)
      // The report's date and the finalized timestamp both say when it was
      // written down. Neither says when it happened, which is the field an
      // insurer looks for first. Unknown is a real answer.
      ? `<label class="date-field">${d.type === 'damage' ? 'Time you found it' : 'Time it happened'}<input type="time" id="event-time" value="${esc(d.eventTime === 'unknown' ? '' : d.eventTime || '')}"></label><label class="issue"><input type="checkbox" id="event-time-unknown" ${d.eventTime === 'unknown' ? 'checked' : ''}>Exact time not known</label>`
      : `<label>Report type<select id="type">${['routine','move-in','move-out'].map(t => `<option value="${t}" ${d.type === t ? 'selected' : ''}>${esc(typeLabel(t))}</option>`).join('')}</select></label>`}</section><div class="actions row"><button id="to-rooms">Continue →</button></div>`;
    if(d.type==='incident')$('property').parentElement.firstChild.textContent='Location / site name';
    if(d.type==='damage')$('property').parentElement.firstChild.textContent='Rental property / unit name';
    for (const [id,key] of [['property','propertyName'],['author','author'],['date','date'],['type','type']]) if($(id)) $(id).oninput = event => { d[key] = event.target.value; if (key === 'author') storeAuthor(event.target.value); remember(); };
    if($('event-time'))$('event-time').oninput = event => { d.eventTime = event.target.value; if($('event-time-unknown'))$('event-time-unknown').checked = false; remember(); };
    if($('event-time-unknown'))$('event-time-unknown').onchange = event => { d.eventTime = event.target.checked ? 'unknown' : ($('event-time')?.value || ''); remember(); };
    if($('use-existing-property'))$('use-existing-property').onclick=()=>run(()=>chooseExistingProperty());
    $('to-rooms').onclick = () => {
      if(!d.propertyName.trim())return notice('Enter a property or unit name first.','error');
      haptic();editor('rooms');
    };
  } else {
    $('app').innerHTML = `${bar}<div class="row spread"><div><small class="eyebrow">${esc(d.propertyName)||'New condition report'}</small><h1>What did you observe?</h1></div><button type="button" class="quiet" id="to-details">← Details</button></div><div id="rooms">${d.rooms.map((r,i) => `<section class="card room-card" data-room="${i}"><label>Room name<input data-field="name" maxlength="100" value="${esc(r.name)}"></label><div class="row capture-actions"><label class="button secondary">Add photos<input type="file" data-files="${i}" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></label>${native
      ? `<button type="button" class="secondary" data-native-camera="${i}">Take photo</button>`
      : `<label class="button secondary">Take photo<input type="file" data-camera="${i}" accept="image/*" capture="environment" hidden></label>`}</div>${r.photos.length>1?'<p class="drag-hint">Press and hold a photo to lift it, then drag it where you want it.</p>':''}<div class="photo-grid" data-photo-grid="${i}">${r.photos.map((id,p) => `<figure data-photo-id="${esc(id)}" data-photo-room="${i}"><img src="${esc(photoURL(id))}" alt="Property photo ${p+1}"><button type="button" class="photo-x" data-delete-id="${i},${esc(id)}" aria-label="Remove photo">&#10005;</button><div class="photo-meta"><figcaption>${draft.files.find(f=>f.id===id)?.remoteId ? 'Uploaded' : 'On this device'}</figcaption><details class="photo-menu"><summary aria-label="Photo actions">•••</summary><div><button class="quiet" data-move-id="${i},${esc(id)},-1">Move earlier</button><button class="quiet" data-move-id="${i},${esc(id)},1">Move later</button><button class="quiet danger" data-delete-id="${i},${esc(id)}">Remove</button></div></details></div></figure>`).join('')}</div><div class="note-lead"><button class="wide" data-voice="${i}">Talk through this room</button><p class="muted">Say what you see. ${esc(skin().product)} writes the note.</p></div><details class="write-own" ${r.observation.trim() ? 'open' : ''}><summary>Write it myself</summary><label>Observations<textarea maxlength="4000" data-field="observation" placeholder="Describe only what you observed.">${esc(r.observation)}</textarea></label><button class="quiet" data-ai="${i}">Polish typed note</button></details>${d.type === 'incident' ? '' : `<div class="row note-tools"><label class="issue"><input data-field="issue" type="checkbox" ${r.issue ? 'checked' : ''}>Issue noted</label></div>`}${d.rooms.length>1?`<footer class="room-footer"><button class="quiet danger" data-remove-room="${i}">Remove this ${w.noun}</button></footer>`:''}</section>`).join('')}</div><button id="add-room" class="secondary">+ Add ${w.noun}</button><div class="actions row"><button id="preview">Preview ${esc(skin().doc)} →</button><button id="save" class="quiet">Save online</button></div>`;
    $('to-details').onclick = () => { haptic();editor('details'); };
    $('rooms').oninput = event => { const field = event.target.dataset.field; if (!field) return; d.rooms[Number(event.target.closest('[data-room]').dataset.room)][field] = field === 'issue' ? event.target.checked : event.target.value; remember(); };
    $('rooms').onchange = event => { if (event.target.matches('input[type=file]')) run(() => addPhotos(event.target)); };
    $('rooms').onclick = async event => {
      const figure = event.target.closest('figure[data-photo-id]');
      if (figure && Date.now()-photoDropAt > 400 && !event.target.closest('button') && !event.target.closest('details')) return viewPhoto(figure.dataset.photoId);
      const b = event.target.closest('button'); if (!b) return;
      if (b.dataset.removeRoom !== undefined) { if (d.rooms.length === 1) return notice(`Keep at least one ${w.noun}.`); if (await confirmAction({title:`Remove this ${w.noun}?`,message:'Its photos and notes will be removed from this report.',confirmLabel:`Remove ${w.noun}`,danger:true})) { d.rooms.splice(Number(b.dataset.removeRoom),1); remember(); editor('rooms'); } }
      if (b.dataset.deleteId) { const [roomIndex,id] = b.dataset.deleteId.split(','); const i=Number(roomIndex),pos=d.rooms[i].photos.indexOf(id); if(pos>=0){d.rooms[i].photos.splice(pos,1);const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}draft.files=draft.files.filter(file=>file.id!==id);remember();editor('rooms');} }
      if (b.dataset.moveId) { const [roomIndex,id,offsetValue] = b.dataset.moveId.split(','); const a=d.rooms[Number(roomIndex)].photos,pos=a.indexOf(id),offset=Number(offsetValue); if (pos>=0&&pos+offset>=0&&pos+offset<a.length) { a.splice(pos,1); a.splice(pos+offset,0,id); remember(); editor('rooms'); } }
      if (b.dataset.nativeCamera !== undefined) { haptic(); window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectCamera',room:Number(b.dataset.nativeCamera)}); }
      if (b.dataset.ai !== undefined) rewrite(Number(b.dataset.ai));
      if (b.dataset.voice !== undefined) run(()=>recordRoom(Number(b.dataset.voice)),b);
    };
    $('add-room').onclick = () => { if (d.rooms.length >=30) return notice(`Maximum 30 ${entryTool()?'findings':w.nounPlural}.`); d.rooms.push({name:entryTool()?'':nextRoomName(d.rooms),observation:'',issue:false,photos:[]});remember();editor('rooms'); };
    $('preview').onclick = () => { haptic();preview=true;reportPreview(); };
    $('save').onclick = event => { const button = event.currentTarget; haptic(); ensureAuth(() => run(async()=>{await save();draft.dirty=false;await persist();notice('Report saved online.','success');editor('rooms');}, button)); };
    if(d.type==='damage')for(const figure of $('rooms').querySelectorAll('figure[data-photo-id]')){
      if(draft.files.some(file=>file.id===figure.dataset.photoId&&file.remoteId))figure.querySelector('figcaption').textContent='Original file kept';
    }
    if(d.type==='incident')for(const label of $('rooms').querySelectorAll('.room-card > label:first-child'))label.firstChild.textContent='Detail heading';
    if(d.type==='incident'||d.type==='damage')$('app').querySelector('.screen-bar + .row .eyebrow').textContent=d.propertyName||w.eyebrow;
    if(d.type==='incident')for(const button of $('rooms').querySelectorAll('[data-voice]'))button.textContent='Talk through this detail';
    if(d.type!=='routine'&&d.type!=='move-in'&&d.type!=='move-out')for(const label of $('rooms').querySelectorAll('.note-lead .muted'))label.textContent=`Say what you see. ${skin().writesLabel} the note.`;
    bindPhotoDrag();
    // A finding is numbered, not named: the room name field has nothing to ask.
    if(entryTool()){
      const heading=$('app').querySelector('.row.spread h1');
      if(heading)heading.textContent='What did you find?';
      [...$('rooms').querySelectorAll('.room-card')].forEach((card,index)=>{
        const name=card.querySelector('label');
        if(name&&name.querySelector('[data-field="name"]'))name.remove();
        const title=document.createElement('h2');
        title.className='finding-heading';
        title.textContent=entryLabel(d.rooms[index],index);
        card.prepend(title);
        const voice=card.querySelector('[data-voice]');
        if(voice)voice.textContent='Talk through this finding';
      });
      if($('add-room'))$('add-room').textContent='+ Add finding';
    }
    if(payAtExport()&&$('preview'))$('preview').textContent=`Build my ${skin().doc} →`;
    if(d.rooms.some(room=>room.photos.length))track('FirstPhotoAdded');
  }
  // Signed out in the app neither chrome is on screen, so these are the only exits.
  if($('editor-back'))$('editor-back').onclick=()=>run(()=>list());
  if($('editor-signin'))$('editor-signin').onclick=()=>ensureAuth(()=>run(()=>openAccountHome()),'signin');
  $('editor-discard').onclick=async()=>{
    if(!await confirmAction({title:'Discard this report?',message:'Anything not saved online will be removed from this device.',confirmLabel:'Discard report',danger:true}))return;
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
  // loadReportFiles sets id === remoteId, so one lookup covers a loaded report
  // and a draft whose photo has been uploaded. No remoteId means the original
  // is still only on this device and there is nothing on the server to fetch.
  const remoteId=draft.files.find(file=>file.id===id)?.remoteId;
  // Downloads leave the page, which WKWebView does not allow; the app would
  // need its own export handler the way the PDF has one.
  const canDownload=!native&&draft.serverId&&remoteId;
  modal(`<h2>Photo</h2><img class="photo-full" src="${esc(url)}" alt="Property photo">${canDownload?'<p class="muted">The uploaded file as received — resized copies appear in the report.</p>':''}<div class="row"><button type="button" id="photo-close" class="secondary">Done</button>${canDownload?'<button type="button" id="photo-original" class="quiet">Download original</button>':''}<button type="button" id="photo-remove" class="quiet danger">Remove photo</button></div>`);
  $('photo-close').onclick=()=>$('dialog').close();
  if($('photo-original'))$('photo-original').onclick=event=>run(()=>downloadOriginal(remoteId),event.currentTarget);
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
  await persist();
  if(entryTool()&&!native&&cameraRoom===null)return entryScreen(i);
  editor();
}
// One finding at a time: what you just added, what it is, and the way on.
function entryScreen(index){
  const d=draft.document,room=d.rooms[index];
  if(!room)return editor('rooms');
  enterScreen(`entry:${index}`);
  updateHeader();setActiveNav('current');
  const photos=room.photos.map((id,at)=>`<figure data-photo-id="${esc(id)}"><img src="${esc(photoURL(id))}" alt="Photo ${at+1}"><button type="button" class="photo-x" data-entry-remove="${esc(id)}" aria-label="Remove photo ${at+1}">&#10005;</button></figure>`).join('');
  $('app').innerHTML=`<section class="entry-screen"><div class="screen-bar"><button type="button" id="entry-back" class="quiet">← All findings</button><span class="muted">${esc(entryLabel(room,index))}</span></div><div class="entry-photos">${photos}</div><label class="entry-note">What is this?<input id="entry-text" maxlength="4000" value="${esc(room.observation)}" placeholder="Chipped counter edge by the sink" autocomplete="off"></label>${session?`<button type="button" class="secondary wide" data-voice="${index}">Or record it</button>`:''}<div class="stack entry-actions"><label class="button wide">Add another photo<input type="file" id="entry-more" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></label><button type="button" id="entry-done" class="secondary wide">Done · ${d.rooms.filter(item=>item.photos.length||item.observation.trim()).length} ${d.rooms.filter(item=>item.photos.length||item.observation.trim()).length===1?'finding':'findings'}</button></div></section>`;
  $('entry-text').oninput=event=>{room.observation=event.target.value;remember();};
  $('entry-back').onclick=()=>editor('rooms');
  $('entry-done').onclick=()=>editor('rooms');
  document.querySelectorAll('[data-voice]').forEach(button=>button.onclick=()=>run(()=>recordRoom(index),button));
  document.querySelectorAll('[data-entry-remove]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.entryRemove,at=room.photos.indexOf(id);
    if(at<0)return;
    room.photos.splice(at,1);
    const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}
    draft.files=draft.files.filter(file=>file.id!==id);
    remember();persist().catch(()=>{});entryScreen(index);
  });
  // Another photo is another finding, which is the rhythm the report wants.
  $('entry-more').onchange=event=>run(async()=>{
    if(!event.target.files?.length)return;
    if(d.rooms.length>=30)return notice('Maximum 30 findings.');
    d.rooms.push({name:'',observation:'',issue:false,photos:[]});
    event.target.dataset.files=String(d.rooms.length-1);
    await addPhotos(event.target);
  });
}
// One step visible at a time. Both forms used to sit in the sheet together, so
// the six-digit field appeared directly under "Send sign-in code" and the sheet
// carried two inputs and two buttons at once.
// Plan previews and confirmations use an ordinary in-page screen rather than a
// browser alert or fixed dialog. Detaching preserves the exact DOM and event
// handlers, and keeping the old document height prevents Safari from collapsing
// its toolbar just because a card replaced a long report.
// Waits nest: the export run covers branding/save/refresh, and save() raises
// its own for the photo upload inside that. One element, reference counted —
// two stacked veils would paint the backdrop blur twice and read as a
// different, darker screen.
let veilEl=null,veilDepth=0;
function busyVeil(title, note = '', ratio){
  if(!veilEl){
    veilEl=document.createElement('div');
    veilEl.className='busy-veil';
    veilEl.setAttribute('role','status');
    veilEl.setAttribute('aria-live','polite');
    document.body.appendChild(veilEl);
  }
  veilDepth++;
  let closed=false;
  const paint=(heading,message,fraction)=>{
    if(closed||!veilEl)return;
    veilEl.innerHTML=`<article class="card"><section class="loading"></section><h2>${esc(heading)}</h2><p>${esc(message)}</p>${typeof fraction==='number'?`<div class="busy-track"><span style="width:${Math.round(Math.min(1,Math.max(0,fraction))*100)}%"></span></div>`:''}</article>`;
  };
  paint(title,note,ratio);
  return {
    update: paint,
    done: () => {
      if(closed)return;
      closed=true;
      veilDepth=Math.max(0,veilDepth-1);
      if(!veilDepth&&veilEl){veilEl.remove();veilEl=null;}
    },
  };
}
// A flow holds the screen it covered in a detached fragment and hands back a
// restore() that puts it back. Nothing used to invalidate that closure, so a
// flow the operator had already navigated away from could still repaint itself
// over whatever replaced it — the setup flow restores on a 900ms timer, which
// is long enough to tap a tab first and watch the old screen reappear on top.
//
// One flow is current at a time. Navigating dismisses it, and a restore() from
// a flow that is no longer current does nothing.
let activeFlow=null;
function dismissFlow(){
  const flow=activeFlow;
  activeFlow=null;
  if(flow)flow.abandon();
}
function flowScreen(content,kind=''){
  dismissFlow();
  const app=$('app'),origin=document.createDocumentFragment(),originScroll=window.scrollY||0;
  const originHeight=Math.max(window.innerHeight,document.documentElement.scrollHeight-app.offsetTop);
  while(app.firstChild)origin.appendChild(app.firstChild);
  let settled=false;
  // The account button is disabled for the life of the flow, so it is
  // re-enabled on every way out — not only the one that restores the screen.
  // Previously any exit but restore() left it dead for the rest of the session.
  const release=()=>{ settled=true; if(activeFlow===handle)activeFlow=null; $('account-button').disabled=false; };
  const restore=()=>{
    if(settled||activeFlow!==handle)return;
    release();
    app.replaceChildren(origin);
    requestAnimationFrame(()=>{window.scrollTo(0,originScroll);if($('demo'))playDemo();});
    syncNativeInspectState(currentPage,true);
  };
  const handle={restore,abandon:release,paint:html=>{ if(!settled)$('flow-body').innerHTML=html; }};
  app.innerHTML=`<section class="flow-screen ${kind}" style="--flow-page-height:${Math.round(originHeight)}px"><div class="flow-frame"><article class="card flow-card"><div id="flow-body">${content}</div><button type="button" id="flow-cancel" class="quiet flow-close" aria-label="Close">&#10005;</button></article></div></section>`;
  $('account-button').disabled=true;
  $('flow-cancel').onclick=restore;
  syncNativeInspectState(currentPage,true);
  activeFlow=handle;
  handle.closeButton=$('flow-cancel');
  return handle;
}
// Authentication belongs to the Marketel banner, not on a replacement page.
// The report stays mounted at the same scroll offset while the banner's bottom
// edge grows to reveal the email and code steps.
function headerDrawer(content){
  const drawer=$('header-drawer'),body=$('header-drawer-body'),close=$('header-drawer-close');
  const app=$('app'),nav=$('nav'),bar=document.querySelector('.header-bar');
  // The app hides this banner and draws its own. Opening a drawer nobody can
  // see still inerted the page behind it, which left every button dead until
  // the app was killed.
  if(!bar?.getClientRects().length)throw new Error('Sign in could not open here. Please try again.');
  let restored=false;
  const restore=()=>{
    if(restored)return;
    restored=true;
    document.documentElement.classList.remove('auth-open');
    drawer.setAttribute('aria-hidden','true');
    drawer.inert=true;
    app.inert=false;
    nav.inert=false;
    bar.inert=false;
    $('account-button').disabled=false;
    setTimeout(()=>{if(restored&&!document.documentElement.classList.contains('auth-open'))body.replaceChildren();},330);
    syncNativeInspectState(currentPage,true);
  };
  body.innerHTML=content;
  drawer.setAttribute('aria-hidden','false');
  drawer.inert=false;
  app.inert=true;
  nav.inert=true;
  bar.inert=true;
  $('account-button').disabled=true;
  document.activeElement?.blur?.();
  document.documentElement.classList.add('auth-open');
  close.onclick=restore;
  syncNativeInspectState(currentPage,true);
  return {restore,paint:html=>{body.innerHTML=html;},closeButton:close};
}
function confirmAction({title,message,confirmLabel='Continue',danger=false}){
  return new Promise(resolve=>{
    const flow=flowScreen(`<h2>${esc(title)}</h2><p>${esc(message)}</p><div class="row"><button type="button" id="flow-confirm" class="${danger?'danger-button':''}">${esc(confirmLabel)}</button><button type="button" id="flow-keep" class="secondary">Keep it</button></div>`,'confirm-screen');
    let answered=false;
    const finish=value=>{if(answered)return;answered=true;flow.restore();resolve(value);};
    flow.closeButton.onclick=()=>finish(false);
    $('flow-keep').onclick=()=>finish(false);
    $('flow-confirm').onclick=()=>finish(true);
  });
}
// Authentication expands the already-fixed header. It never opens a top-layer
// dialog, freezes the body or replaces the report, so Safari has only one page
// and one scroll position to reconcile with its keyboard and browser toolbar.
function authCopy(intent){
  const sk=skin();
  if(intent==='send')return {title:`Send your ${sk.doc}.`,message:'Confirm your email to send it and keep a copy. We will send you a 6-digit code.'};
  return intent==='signin'
    ?{title:`Sign in to Marketel ${sk.product}`,message:'Use the email you signed up with. We will send you a 6-digit code.'}
    :{title:`Keep your ${sk.doc}.`,message:`Verify your email to save, export and recover your work on another device. Your first complete ${sk.doc} is free.`};
}
function ensureAuth(after, intent='keep') {
  if(session && account) return after();
  const copy=authCopy(intent);
  if(native){
    nativeAuth={after,email:''};
    window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectAuth',step:'email',title:copy.title,message:copy.message,product:skin().product,email:storedEmail()});
    return;
  }
  let drawer=null;
  let email=storedEmail();
  const codeStep=()=>{
    drawer.paint(`<h2>Enter your code.</h2><p class="muted">Sent to ${esc(email)}</p><form id="code-form"><input id="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" aria-label="Six-digit code"></form><div class="row auth-back"><button type="button" id="auth-resend" class="quiet">Send a new code</button><button type="button" id="auth-back" class="quiet">← Change email</button></div>`);
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
        session=result.token;localStorage.setItem('inspect.session',session);account=result;updateHeader();prefetchLists();drawer.restore();
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
    const html=`<h2>${esc(copy.title)}</h2><p>${esc(copy.message)}</p><form id="email-form"><label>Email<input id="email" type="email" required autocomplete="email" value="${esc(email)}"></label><button class="wide">Send sign-in code</button></form>`;
    if(open)drawer=headerDrawer(html);else drawer.paint(html);
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
// In the app the email and code fields live in the native glass banner. The
// account work stays here so the session, attribution and header logic have
// one home; the shell only carries what was typed.
let nativeAuth=null;
const postAuthResult=result=>window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectAuthResult',...result});
window.marketelInspectAuthRequest=raw=>{
  const email=String(raw||'').trim();
  if(!nativeAuth||!email)return;
  nativeAuth.email=email;
  api('/auth/request',{method:'POST',body:{email}})
    .then(()=>{postAuthResult({step:'code',email});notice('Check your email for the code.','success');})
    .catch(error=>postAuthResult({step:'error',message:error.message}));
};
window.marketelInspectAuthVerify=raw=>{
  const code=String(raw||'').replace(/\D/g,'').slice(0,6);
  if(!nativeAuth||code.length!==6)return;
  const pending=nativeAuth;
  api('/auth/verify',{method:'POST',body:{email:pending.email,code,attribution:inspectAttribution}})
    .then(result=>{
      if(nativeAuth!==pending)return;
      nativeAuth=null;
      session=result.token;localStorage.setItem('inspect.session',session);account=result;
      postAuthResult({step:'verified'});
      updateHeader();prefetchLists();
      pending.after();
    })
    .catch(error=>postAuthResult({step:'error',message:error.message}));
};
window.marketelInspectAuthClosed=()=>{nativeAuth=null;};
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
  const pending=draft.document.rooms.flatMap(room=>room.photos).filter(id=>{
    const file=draft.files.find(f=>f.id===id);return file&&!file.remoteId;
  });
  const veil=pending.length?busyVeil(`Uploading ${pending.length===1?'your photo':`${pending.length} photos`}`,'Keep this page open.',0):null;
  let done=0;
  try{
    for(const room of draft.document.rooms) for(const id of room.photos){
      const f=draft.files.find(f=>f.id===id);if(!f)throw new Error('A report photo is missing from this device. Remove it or add it again.');if(f.remoteId)continue;
      const form=new FormData();form.append('photo',f.blob,f.name||'photo.jpg');form.append('source',f.source);
      const a=await api(`/reports/${draft.serverId}/photos`,{method:'POST',body:form});f.remoteId=a.id;await persist();
      done++;
      veil?.update(`Uploading ${pending.length===1?'your photo':`${pending.length} photos`}`,
        pending.length>1?`${done} of ${pending.length} uploaded. Keep this page open.`:'Keep this page open.',
        done/pending.length);
    }
  } finally { veil?.done(); }
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
// One sheet for both surfaces so the copy and layout cannot drift. The meter
// is web-only: it reads the MediaStream the page owns, and in the app the page
// owns nothing — there, real captions are the feedback instead.
function recordingSheetHtml(roomName,withMeter){
  return `<h2>Talk through ${esc(roomName)}</h2><p class="recording-state"><span class="recording-dot"></span> Recording · <strong id="recording-time">0:00</strong></p>${withMeter?`<div class="live-bars" id="live-bars" aria-hidden="true">${'<span></span>'.repeat(13)}</div>`:''}<p class="live-caption" id="live-caption" aria-live="polite">Listening…</p><p class="muted">Say only what you can observe. Mention the location and whether it should be marked as an issue. The recording and transcript are not attached to your report.</p><button id="stop-recording">Stop and review</button>`;
}
// Shared tail: whatever captured the audio, this is what turns it into a note.
function sendVoiceNote(index,blob,durationMs){
  logInspect('VoiceNoteRecorded',true);
  ensureAuth(()=>run(async()=>{
    // The write-up is the thing worth paying for, and it used to happen behind
    // a closed sheet with a toast as the only sign anything was running.
    // modal() rather than setting the body, because the auth path closes the
    // dialog on success — on a first report this would paint into a shut sheet.
    modal('<section class="loading">Writing your note…</section>');
    try{
      await ensureServerDraft();
      const form=new FormData();form.append('audio',blob,blob.type.includes('webm')?'note.webm':blob.type.includes('ogg')?'note.ogg':'note.m4a');form.append('roomIndex',String(index));form.append('durationMs',String(durationMs));
      const result=await api(`/reports/${draft.serverId}/voice-draft`,{method:'POST',body:form});
      reviewVoiceNote(index,result);
    }catch(error){
      // Never strand them on a spinner; run() surfaces the message.
      $('dialog').close();
      throw error;
    }
  }));
}
// WKWebView has no SpeechRecognition, so in the app the shell does the whole
// recording — one microphone, no competition with getUserMedia — and streams
// the live text back into the same sheet.
let nativeDictation=null;
function nativeRecordRoom(index){
  const shell=window.webkit?.messageHandlers?.marketelShell;
  if(!shell||nativeDictation)return;
  let seconds=0,stopped=false;
  modal(recordingSheetHtml(draft.document.rooms[index].name,false));
  const tick=setInterval(()=>{seconds+=1;const label=$('recording-time');if(label)label.textContent=`0:${String(seconds).padStart(2,'0')}`;if(seconds>=60)stop();},1000);
  const stop=()=>{if(stopped)return;stopped=true;clearInterval(tick);shell.postMessage({type:'inspectDictateStop'});};
  nativeDictation={index,started:Date.now(),cancelled:false};
  $('stop-recording').onclick=stop;
  // Dismissing the sheet still has to stop the engine, or the shell keeps the
  // microphone open behind a screen that is no longer there.
  $('dialog').addEventListener('close',()=>{if(nativeDictation)nativeDictation.cancelled=true;stop();},{once:true});
  shell.postMessage({type:'inspectDictate',room:index});
}
window.marketelInspectDictationText=raw=>{
  let data;try{data=JSON.parse(raw);}catch{return;}
  if(hudDictation&&draft?.document?.rooms[hudDictation.index]&&typeof data.text==='string'){
    const spoken=data.text.trim();
    if(spoken){
      const room=draft.document.rooms[hudDictation.index];
      room.observation=hudDictation.base?`${hudDictation.base}\n${spoken}`:spoken;
      remember();
      const box=$('app').querySelector('.hud-note');
      if(box)box.textContent=room.observation;
    }
    return;
  }
  const box=$('live-caption');
  if(box&&typeof data.text==='string'&&data.text.trim())box.textContent=data.text;
};
window.marketelInspectAudioCaptured=raw=>{
  if(hudDictation){hudDictation=null;persist().catch(()=>{});cameraCompanion();return;}
  const pending=nativeDictation;
  nativeDictation=null;
  if(!pending)return;
  let data;try{data=JSON.parse(raw);}catch{return;}
  if(pending.cancelled)return;
  if(typeof data.dataUrl!=='string'||!data.dataUrl){
    if($('dialog').open)$('dialog').close();
    return notice('That recording did not save. Try again, or type the note instead.','error');
  }
  run(async()=>{
    const blob=await (await fetch(data.dataUrl)).blob();
    sendVoiceNote(pending.index,blob,Math.min(60000,Math.max(250,Date.now()-pending.started)));
  },null);
};
async function recordRoom(index){
  if(native)return nativeRecordRoom(index);
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
  modal(recordingSheetHtml(draft.document.rooms[index].name,true));
  const stopMeter=liveMeter(stream),stopCaptions=liveCaptions();
  const tick=setInterval(()=>{seconds+=1;const label=$('recording-time');if(label)label.textContent=`0:${String(seconds).padStart(2,'0')}`;if(seconds>=60&&recorder.state==='recording')recorder.stop();},1000);
  const started=Date.now();
  $('stop-recording').onclick=()=>{if(recorder.state==='recording')recorder.stop();};
  $('dialog').addEventListener('close',()=>{if(recorder.state==='recording'){cancelled=true;recorder.stop();}},{once:true});
  recorder.start(250);
  let blob;
  try{blob=await recording;}catch(error){if($('dialog').open)$('dialog').close();throw error;}finally{clearInterval(tick);stopMeter();stopCaptions();stream.getTracks().forEach(track=>track.stop());finished=true;}
  if(cancelled||!finished||!blob.size)return;
  sendVoiceNote(index,blob,Math.min(60000,Math.max(250,Date.now()-started)));
}
function reviewVoiceNote(index,result){
  const noun=wedge(draft.document.type).noun;
  modal(`<h2>Review this ${noun} note</h2><p class="muted">AI only organized what it heard. Check every detail before adding it.</p><blockquote>${esc(result.suggestion)}</blockquote><details><summary>What ${esc(skin().product)} heard</summary><p class="transcript">${esc(result.transcript)}</p></details><div class="stack"><button id="replace-note">Use as ${noun} note</button><button id="append-note" class="secondary">Add after my note</button><button id="discard-note" class="quiet">Discard</button></div>`);
  // Whether the draft was kept is the only read on whether the AI actually
  // helped. Closing the sheet is an answer too, so every exit records one.
  let kept=false;
  $('dialog').addEventListener('close',()=>logInspect(kept?'VoiceNoteKept':'VoiceNoteDiscarded'),{once:true});
  const accept=mode=>{const room=draft.document.rooms[index];room.observation=mode==='append'&&room.observation.trim()?`${room.observation.trim()}\n${result.suggestion}`:result.suggestion;if(result.issueMentioned)room.issue=true;remember();kept=true;$('dialog').close();editor();};
  $('replace-note').onclick=()=>accept('replace');$('append-note').onclick=()=>accept('append');$('discard-note').onclick=()=>$('dialog').close();
}
const fixStamp = fix => {
  const at = fix?.at ? new Date(fix.at) : null;
  return at && !Number.isNaN(at.getTime()) ? at.toLocaleString() : 'time recorded when you save';
};
const fixLabel = fix => `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)} · ±${Math.round(fix.accuracy)} m · ${fixStamp(fix)}`;
function locationPreview(document){
  const location=document?.location;
  if(!location||(!location.start&&!location.end))return '';
  const rows=[];
  if(location.start)rows.push(['Started',location.start]);
  if(location.end)rows.push(['Completed',location.end]);
  let onSite='';
  const started=location.start?.at?new Date(location.start.at):null, ended=location.end?.at?new Date(location.end.at):null;
  if(started&&ended&&!Number.isNaN(started.getTime())&&!Number.isNaN(ended.getTime())){
    const minutes=Math.round((ended-started)/60000);
    if(minutes>0)onSite=`<p class="muted">On site ${Math.floor(minutes/60)}h ${minutes%60}m</p>`;
  }
  return `<section class="location-block">${rows.map(([label,fix])=>`<p><strong>${label}</strong> <span class="muted">${esc(fixLabel(fix))}</span></p>`).join('')}${onSite}<p><small>Location and times as reported by the device. Coordinates are not verified.</small></p></section>`;
}
function signaturePreview(signature){
  const paths=signature.strokes.map(stroke=>stroke.map((point,index)=>`${index?'L':'M'} ${(point.x*300).toFixed(1)} ${(point.y*100).toFixed(1)}`).join(' '));
  return `<section class="signature-preview"><strong>${esc(roleLabel(signature.role))} signature</strong><svg viewBox="0 0 300 100" aria-label="Signature">${paths.map(path=>`<path d="${path}"></path>`).join('')}</svg><small>${esc(signature.name)}${signature.signedAt?` · ${new Date(signature.signedAt).toLocaleString()}`:''}</small></section>`;
}
function reportRoom(r,label='',index=0,sample=null){
  return `<section class="report-room">${label?`<p class="compare-label">${label}</p>`:''}<h2>${esc(entryLabel(r,index))}${r.issue?' · Issue noted':''}</h2><p class="report-note">${esc(r.observation)||'No observation recorded.'}</p>${r.photos.map(id=>`<img class="report-photo" src="${esc(sample?sample.srcFor(id):photoURL(id))}" alt="Recorded photo"><small>${sample?esc(sample.sourceLabel):(draft.files.find(f=>f.id===id)?.source==='camera'?'Camera capture':'Imported photo')}</small>`).join('')}</section>`;
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
  const pw = wedge(draft?.document?.type);
  updateHeader();setActiveNav('current');const d=draft.document;d.signatures ||= [];
  const baseline=draft.baseline?.document,baselineRooms=new Map((baseline?.rooms||[]).map(room=>[room.name.toLowerCase(),room]));
  const roomMarkup=d.rooms.map((room,index)=>{const before=baselineRooms.get(room.name.toLowerCase())||baseline?.rooms?.[index];return `<div class="comparison-pair">${before?reportRoom(before,'Previous finalized report',index):''}${reportRoom(room,before?'Current report':'',index)}</div>`;}).join('');
  $('app').innerHTML=`<div class="row spread"><small class="eyebrow">${draft.finalizedAt?`Finalized ${esc(skin().doc)}`:`Your ${esc(skin().doc)} preview`}</small>${!draft.finalizedAt?'<button class="quiet" id="edit">← Edit</button>':''}</div><article class="card">${businessHeader(d)}<small>${esc(documentLabelFor(d.type))}</small><h1>${esc(d.propertyName)||'Your property'}</h1><p class="muted">${esc(typeLabel(d.type))} · ${esc(d.date)}${d.eventTime?` · ${d.type==='damage'?'found':'occurred'} ${esc(d.eventTime)}`:''} · ${esc(d.author)||'Author not entered'}</p>${locationPreview(d)}${baseline?`<div class="comparison-banner">Compared with the finalized ${esc(typeLabel(baseline.type))} from ${esc(baseline.date)}.</div>`:''}${roomMarkup}${d.signatures.map(signaturePreview).join('')}<p><small>${esc(pw.disclaimer)}</small></p></article>${!draft.finalizedAt?`<section class="card signature-actions"><div><h2>Optional signatures</h2><p class="muted">${d.type==='damage'?'Optional. A signature is rarely available after a guest has left.':`Add a ${esc(pw.signers.manager)} or ${esc(pw.signers.other)} sign-off before finalizing.`}</p></div><div class="row">${signerRoles(d.type).map((role,index)=>{const label=index?pw.signers.other:pw.signers.manager;return `<button class="secondary" data-sign="${esc(role)}">${d.signatures.some(sig=>sig.role===role)?`Replace ${esc(label)} signature`:`Add ${esc(label)} signature`}</button>`;}).join('')}</div></section>`:''}${draft.finalizedAt
    ? `<p class="muted">This version cannot change. Create a new ${esc(skin().doc)} for corrections.</p><div class="stack report-actions"><button id="pdf">Download PDF</button>${d.type==='damage'?'<button id="originals" class="secondary">Get original photos</button>':''}${d.type==='incident'?'':'<button id="share" class="secondary">Create private share link</button>'}</div>${d.type==='damage'?'<p class="muted">Original uploaded files are kept as received. PDF and share links use resized copies; no platform is guaranteed to accept a claim.</p>':''}<div class="next-actions"><button type="button" id="another-report" class="secondary">${esc(skin().navCreate)}</button>${account?`<button type="button" id="back-to-reports" class="quiet">← All ${esc(skin().docPlural)}</button>`:''}</div>${!native&&account?`<section class="card app-handoff-card"><div><small class="eyebrow">MARKETEL APP</small><h2>Keep this ${esc(skin().doc)} with you.</h2><p class="muted">We will email one secure link that signs you in and opens this ${esc(skin().doc)} in the Marketel app.</p></div><button id="send-app-handoff">Continue in the Marketel app →</button></section>`:''}`
    : `${d.rooms.some(room=>room.photos.length)?`<section class="card coverage" id="coverage-card"><div><h2>Check your photo coverage</h2><p class="muted">Inspect looks at which surfaces your photos actually show and tells you what is missing. It never comments on condition.</p></div><button type="button" id="coverage-run" class="secondary">Check photo coverage</button></section>`:''}${payAtExport()?`<div class="stack report-actions reveal-actions"><button type="button" id="send-report" class="wide">Send this ${esc(skin().doc)} →</button><button type="button" id="download-report" class="secondary wide">Download PDF</button></div><p class="muted">Building is free. Sending finalizes this version: $${reportPrice()} for this ${esc(skin().doc)}, or included in a plan.</p>`:`<div class="actions row"><button id="finalize">Save &amp; export my ${esc(skin().doc)} →</button></div><p class="muted">Finalizing freezes this version. Your first ${esc(skin().doc)} includes PDF export${skin().doc==='record'?'':' and a revocable share link'}, free.${account?'':' Exporting verifies your email once.'}</p>`}`}`;
  if(TYPED_ARMS.has(d.type))$('coverage-card')?.remove();
  paintBusinessLogo();
  if(!draft.finalizedAt&&payAtExport()){
    const eyebrow=$('app').querySelector('.row.spread .eyebrow');
    if(eyebrow)eyebrow.textContent=landingArm()?.golden?.reveal||`Your ${skin().doc}, as it will be sent.`;
    track('ReportRevealed');
    $('send-report').onclick=event=>requestExport('share',event.currentTarget);
    $('download-report').onclick=event=>requestExport('pdf',event.currentTarget);
  }
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
    await markLocation('end');
    await save();
    // The same moment as the paid path, so finishing a document looks the same
    // whichever tool made it — and the ways out of it are buttons, not a toast
    // describing buttons somewhere else.
    const veil=busyVeil(`Building your ${skin().doc}`,'Finalizing this version.');
    let r;
    try{ r=await api(`/reports/${draft.serverId}/finalize`,{method:'POST'}); } finally { veil.done(); }
    draft.finalizedAt=r.finalizedAt;draft.document=r.document;reportsCache=null;propertiesCache=null;await persist();await refresh();reportPreview();
    deliverySheet('share');
  },button));};
  if($('pdf'))$('pdf').onclick=()=>run(downloadPdfNow);
  if($('originals'))$('originals').onclick=()=>originalsSheet();
  // Revoke lives inside the share sheet rather than the floating action bar:
  // it is rare, destructive, and only means anything once a link exists.
  if($('share'))$('share').onclick=()=>run(openShareSheetNow);
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
  const title=roleLabel(role);
  let name=existing?.name || (role==='manager'||role==='owner' ? (draft.document.author||rememberedAuthor()) : '');
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
async function downloadPdfNow(){
  if(native){window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectExportPDF',reportId:draft.serverId,token:session});return;}
  const blob=await api(`/reports/${draft.serverId}/pdf`,{blob:true});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=documentFileName(draft.document.type);a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function openShareSheetNow(){
  const r=await api(`/reports/${draft.serverId}/share`,{method:'POST'});
  modal(`<h2>Private report link</h2><p>Anyone with this link can read and download this version. Creating a new link replaces the previous one.</p><input id="share-url" readonly value="${esc(r.url)}"><button id="copy-link" class="wide">Copy link</button><button id="revoke" class="quiet danger">Revoke this link</button>`);
  $('copy-link').onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(r.url);}catch{$('share-url').select();document.execCommand('copy');}notice('Link copied.');});
  $('revoke').onclick=()=>run(async()=>{await api(`/reports/${draft.serverId}/share`,{method:'DELETE'});$('dialog').close();notice('Shared link revoked.');});
}
// The business a report is sent under: typed during setup (kept on the local
// draft until there is an account), then snapshotted by the server at finalize.
function businessHeader(d){
  const name=d.business?.name||draft?.branding?.name||account?.businessName||'';
  const hasLogo=!!(draft?.branding?.logo||d.business?.logoKey||account?.hasLogo);
  if(!name&&!hasLogo)return '';
  return `<header class="biz-header">${hasLogo?'<img id="biz-logo" alt="" hidden>':''}${name?`<strong>${esc(name)}</strong>`:''}</header>`;
}
async function paintBusinessLogo(){
  const img=$('biz-logo');if(!img)return;
  let blob=draft?.branding?.logo||null;
  if(!blob&&session&&account?.hasLogo)blob=await api('/branding/logo',{blob:true}).catch(()=>null);
  if(!blob||!document.body.contains(img))return;
  img.src=URL.createObjectURL(blob);img.hidden=false;
}
async function pushBranding(){
  const branding=draft?.branding;if(!branding)return;
  if(branding.name&&branding.name!==account?.businessName)await api('/branding',{method:'PUT',body:{businessName:branding.name}});
  if(branding.logo&&!branding.logoUploaded){
    const form=new FormData();form.append('logo',branding.logo,'logo');
    await api('/branding/logo',{method:'POST',body:form});
    branding.logoUploaded=true;await persist();
  }
  await refresh();
}
// Send and Download are where a pay-at-export tool asks. Everything before
// this was free; the report is on screen, finished, under their own name.
function requestExport(action,trigger){
  haptic();
  if(!draft.document.rooms.some(room=>room.photos.length))return notice('Add at least one photo before sending.','error');
  ensureAuth(()=>run(async()=>{
    // save() raises its own veil for photos still to upload; this one covers
    // the branding, save and refresh round trips either side of it, so the
    // wait is never silent.
    const veil=busyVeil(`Preparing your ${skin().doc}`,'One moment.');
    try{
      await pushBranding();
      if(!draft.document.author.trim())draft.document.author=draft.branding?.name||account?.businessName||'';
      if(!draft.document.author.trim())throw new Error('Add your name in the editor before sending.');
      await markLocation('end');
      await save();await refresh();
    } finally { veil.done(); }
    if(canSend())return finishExport(action);
    await exportOffer(action);
  },trigger),'send');
}
function originalsSheet(){
  if(native){
    modal('<h2>Get your original photos</h2><p>Original photo downloads are available on the web. Open Claims in Safari, sign in, and open this saved report.</p><button id="originals-web" class="wide">Open Claims on the web</button>');
    $('originals-web').onclick=()=>openExternal('https://bookmarketel.com/claims');
    return;
  }
  const photos=draft.document.rooms.flatMap(room=>room.photos.map(id=>({id,room:room.name}))).filter(item=>draft.files.some(file=>file.id===item.id&&file.remoteId));
  if(!photos.length)return notice('No uploaded photos on this device to download.','error');
  modal(`<h2>Original photos</h2><p class="muted">These are the files received when you uploaded them, not the smaller copies shown in the report. Download only the photos you need.</p><div class="stack">${photos.map((photo,index)=>`<button class="secondary" data-original-photo="${index}">Download ${esc(photo.room)} photo ${index+1}</button>`).join('')}</div>`);
  document.querySelectorAll('[data-original-photo]').forEach(button=>button.onclick=()=>run(()=>downloadOriginal(photos[Number(button.dataset.originalPhoto)].id),button));
}
async function finishExport(action){
  const veil=busyVeil(`Building your ${skin().doc}`,'Finalizing this version.');
  let r;
  try{ r=await api(`/reports/${draft.serverId}/finalize`,{method:'POST'}); } finally { veil.done(); }
  draft.finalizedAt=r.finalizedAt;draft.document=r.document;reportsCache=null;propertiesCache=null;
  await persist();await refresh();preview=true;reportPreview();
  deliverySheet(action);
}
// One sheet at the moment the document becomes real, listing every way out of
// it. The button pressed before paying is only the default here, never the
// whole answer.
function deliverySheet(preferred='share'){
  const d=draft.document,sk=skin(),doc=esc(sk.doc);
  const canShare=d.type!=='incident';
  const hasOriginals=d.type==='damage'&&d.rooms.some(room=>room.photos.length);
  const order=[
    canShare?{id:'delivery-share',label:'Create a private link',hint:'Anyone with the link can read and download this version.',primary:preferred!=='pdf'}:null,
    {id:'delivery-pdf',label:'Download the PDF',hint:`The finished ${sk.doc}, ready to attach.`,primary:preferred==='pdf'||!canShare},
    hasOriginals?{id:'delivery-originals',label:'Get the original photos',hint:'The files as received, not the smaller copies in the PDF.',primary:false}:null,
  ].filter(Boolean).sort((a,b)=>Number(b.primary)-Number(a.primary));
  modal(`<h2>Your ${doc} is built.</h2><p class="muted">Choose how to send it. This version is frozen — you can come back to it from ${esc(sk.docPlural)} at any time.</p><div class="stack">${order.map(option=>`<button type="button" id="${option.id}" class="${option.primary?'wide':'secondary wide'}">${esc(option.label)}</button><p class="muted delivery-hint">${esc(option.hint)}</p>`).join('')}</div><button type="button" id="delivery-later" class="quiet">I'll send it later</button>`);
  if($('delivery-share'))$('delivery-share').onclick=event=>run(()=>openShareSheetNow(),event.currentTarget);
  if($('delivery-pdf'))$('delivery-pdf').onclick=event=>run(async()=>{await downloadPdfNow();notice(`Your ${sk.doc} was downloaded.`,'success');},event.currentTarget);
  if($('delivery-originals'))$('delivery-originals').onclick=()=>originalsSheet();
  $('delivery-later').onclick=()=>{$('dialog').close();notice(`Your ${sk.doc} is saved and ready whenever you are.`,'success');};
}
async function exportOffer(action){
  await requestStorefront();
  track('ExportOfferViewed',undefined,false);
  const sk=skin();
  if(native&&storefront!=='USA'){
    modal(`<h2>Send it from the web.</h2><p>Single ${esc(sk.docPlural)} and plans are sold on bookmarketel.com. Open ${esc(sk.product)} in Safari, sign in with the same email, and send this ${esc(sk.doc)} from there.</p><button id="offer-web" class="wide">Open ${esc(sk.product)} on the web</button>`);
    $('offer-web').onclick=()=>openExternal(`https://bookmarketel.com${sk.home||'/inspect/'}`);return;
  }
  const available=(Array.isArray(account?.plans)&&account.plans.length?account.plans:['month']).filter(value=>PLANS[value]);
  // A cold click is an impulse, and an impulse does not sign up for a year.
  // The single report leads: it disarms the "they want to lock me in" reflex,
  // and the step from it to a month is small enough to take voluntarily —
  // where the step to a year is sixteen times the price and nobody takes it.
  //
  // A year only becomes a real offer once someone has finished a document
  // before, because that is the first evidence the need actually recurs. Until
  // then it is not shown at all.
  const repeat=Number(account?.priorReports)>0;
  const single=reportPrice()?['report']:[];
  const options=[...single,...(available.includes('month')?['month']:[]),
    ...(repeat&&available.includes('year')?['year']:[]),
    ...(!single.length&&!available.includes('month')&&available.includes('year')?['year']:[])];
  const perReport=reportPrice()?Math.max(1,Math.round(PLANS.year.price/reportPrice())):0;
  const label={
    year:[`$${PLANS.year.price}/year`,perReport?`About ${perReport} ${sk.docPlural} at the single price`:`${PLANS.year.reports} ${sk.docPlural} a year · best value`],
    month:[`$${PLANS.month.price}/month`,`${PLANS.month.reports} ${sk.docPlural} a month`],
    report:[`$${reportPrice()}`,`Just this ${sk.doc}`],
  };
  let choice=options[0],settled=false;
  const decline=reason=>{if(settled)return;settled=true;track('OfferDeclined',reason,false);};
  const paint=()=>{
    const html=`<h2>Send your ${esc(sk.doc)}.</h2><p class="muted">It is built. Choose how to send it.</p><div class="offer-options" role="radiogroup" aria-label="How to pay">${options.map(value=>`<button type="button" role="radio" class="offer-option${choice===value?' is-selected':''}" aria-checked="${choice===value}" data-offer="${value}"><strong>${esc(label[value][0])}</strong><small>${esc(label[value][1])}</small></button>`).join('')}</div><button type="button" id="offer-pay" class="wide">${choice==='report'?`Pay $${reportPrice()} and send`:'Continue to secure checkout'}</button><p class="offer-reversal">${choice==='report'?'One-time payment. No subscription.':'Cancel renewal anytime.'}</p><button type="button" id="offer-later" class="quiet">Not now</button><p><small>Payment by Stripe. <a href="${esc(sk.terms)}">${esc(sk.termsLabel)}</a></small></p>`;
    if(!$('dialog').open)modal(html,{fullscreen:true});else{$('dialog-body').innerHTML=html;settleSheet();}
    document.querySelectorAll('[data-offer]').forEach(button=>button.onclick=()=>{if(choice===button.dataset.offer)return;choice=button.dataset.offer;haptic();paint();});
    $('offer-pay').onclick=event=>run(async()=>{
      haptic();
      const body=choice==='report'?{interval:'report',reportId:draft.serverId,native}:{interval:choice,tool:toolId(),reportId:draft.serverId,native};
      const r=await api('/checkout',{method:'POST',body});
      settled=true;
      try{localStorage.setItem('inspect.pendingExport',JSON.stringify({reportId:draft.serverId,action,tool:toolId(),at:Date.now()}));}catch{}
      openExternal(r.url);
    },event.currentTarget);
    $('offer-later').onclick=()=>{
      $('dialog-body').innerHTML=`<h2>What stopped you?</h2><p class="muted">One tap. It helps us price this fairly. Your ${esc(sk.doc)} stays saved.</p><div class="stack">${DECLINE_REASONS.map(([key,text])=>`<button type="button" class="secondary" data-reason="${key}">${esc(text)}</button>`).join('')}</div>`;
      document.querySelectorAll('[data-reason]').forEach(button=>button.onclick=()=>{decline(button.dataset.reason);$('dialog').close();notice(`Your ${sk.doc} is saved. Send it whenever you are ready.`);});
    };
  };
  paint();
  $('dialog').addEventListener('close',()=>decline(undefined),{once:true});
}
// After checkout (a return to this page, or the app coming back from Safari)
// the paid report finishes itself. A webhook can trail the redirect by a few
// seconds, so the entitlement is polled briefly rather than read once.
let resumingExport=false;
async function resumePendingExport({wait=0}={}){
  if(resumingExport)return false;
  let pending=null;try{pending=JSON.parse(localStorage.getItem('inspect.pendingExport')||'null');}catch{}
  if(!pending||pending.tool!==toolId()||Date.now()-Number(pending.at||0)>86400000||!session||!draft||draft.serverId!==pending.reportId)return false;
  if(draft.finalizedAt){try{localStorage.removeItem('inspect.pendingExport');}catch{}return false;}
  resumingExport=true;
  try{
    const deadline=Date.now()+wait;
    for(;;){
      await refresh().catch(()=>{});
      if(canSend())break;
      if(Date.now()>=deadline)return false;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    try{localStorage.removeItem('inspect.pendingExport');}catch{}
    await finishExport(pending.action);
    return true;
  }finally{resumingExport=false;}
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
    const sk=skin();
    const points=[sk.offerPoints[0],sk.offerPoints[1],`${plan.reports} ${sk.docPlural} — about ${unit} each`,...sk.offerPoints.slice(2)];
    const html=`<h2>${esc(sk.offerHeading)}</h2><p class="offer-anchor">${esc(sk.offerAnchor)}</p>${toggle}<div class="price">$${plan.price} <small>${plan.per}</small></div>${sub?`<p class="price-save">${sub}</p>`:''}<ul class="offer-points">${points.map(point=>`<li>${esc(point)}</li>`).join('')}</ul><p class="offer-reversal">Cancel renewal anytime.</p><button id="buy" class="wide">Subscribe — $${plan.price}${plan.per}</button><p><small>${plan.terms} The ${esc(sk.doc)} you just finished is saved and waiting, and existing finalized ${esc(sk.docPlural)} stay available. <a href="${esc(sk.terms)}">${esc(sk.termsLabel)}</a></small></p>`;
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
  $('app').innerHTML=`<h1>${esc(skin().placesHeading)}</h1><p class="muted">${esc(skin().placesLede)}</p><button id="new-property">+ New ${esc(skin().placesHeading.replace(/s$/,'').toLowerCase())}</button>${details.length?'':`<section class="card">${esc(skin().placesEmpty)}</section>`}${details.map((property,index)=>`<section class="card property-row"><div><strong>${esc(property.name)}</strong>${property.latestDate?`<p class="muted">Latest finalized: ${esc(property.latestType)} · ${esc(property.latestDate)}</p>`:''}</div><div class="row"><button class="secondary" data-property="${index}">New report</button>${skin().comparisons&&property.latestFinalizedReportId?`<button data-compare="${esc(property.latestFinalizedReportId)}">Start move-out comparison</button>`:''}</div></section>`).join('')}`;
  if(skin().doc!=='report')for(const button of $('app').querySelectorAll('[data-property]'))button.textContent=`New ${skin().doc}`;
  $('new-property').onclick=()=>{haptic();run(()=>start());};
  document.querySelectorAll('[data-property]').forEach(button=>button.onclick=()=>start(details[Number(button.dataset.property)].name));
  document.querySelectorAll('[data-compare]').forEach(button=>button.onclick=()=>run(()=>startComparison(button.dataset.compare),button));
}
function renderReports(){
  enterScreen('reports');
  const canUpgrade=!account.active&&!account.freeAvailable&&(!native||storefront==='USA');
  const status=account.freeAvailable?`Your first complete ${skin().doc} is free.`:account.active?`${account.remaining} ${skin().docPlural} remaining this billing period.`:`Your saved ${skin().docPlural} remain available.`;
  const localDraft=hasUnfinishedDraft()&&!draft.serverId
    ? `<section class="card report-row"><div><strong>${esc(draft.document.propertyName)||'Untitled report'}</strong><p class="muted">${esc(draft.document.date)} · On this device · not saved online</p></div><div class="row"><button type="button" id="open-local-draft" class="secondary">Open</button><button type="button" id="delete-local-draft" class="quiet danger">Delete</button></div></section>`
    : '';
  $('app').innerHTML=`<h1>${esc(skin().listHeading)}</h1><div class="status-line"><p class="muted">${status}</p>${canUpgrade?'<button id="plans" class="quiet">See plans →</button>':''}</div><button id="new-report">${esc(skin().navCreate)}</button>${localDraft}${reports.length||localDraft?'':`<section class="card">No saved ${esc(skin().docPlural)} yet. Start your first one.</section>`}${reports.map(report=>`<section class="card report-row"><div><strong>${esc(report.document.propertyName)}</strong><p class="muted">${esc(report.document.date)} · ${report.finalizedAt?'Finalized':'Draft'}${report.baselineReportId?' · Comparison':''}</p></div><div class="row"><button data-open="${report.id}" class="secondary">Open</button><button data-delete-report="${report.id}" class="quiet danger">Delete</button></div></section>`).join('')}${nextReportCursor?'<button id="older" class="secondary">Load older reports</button>':''}`;
  if($('older'))$('older').onclick=event=>run(()=>list('reports',true),event.currentTarget);
  $('new-report').onclick=()=>start();if($('plans'))$('plans').onclick=offer;
  if($('open-local-draft'))$('open-local-draft').onclick=()=>{haptic();editor();};
  if($('delete-local-draft'))$('delete-local-draft').onclick=async()=>{
    if(!await confirmAction({title:'Delete this unsaved report?',message:'This removes the report from this device.',confirmLabel:'Delete report',danger:true}))return;
    run(async()=>{clearURLs();draft=null;preview=false;await stored('delete');updateHeader();await list();});
  };
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>run(()=>openReport(button.dataset.open),button));
  document.querySelectorAll('[data-delete-report]').forEach(button=>button.onclick=async()=>{if(await confirmAction({title:'Permanently delete this report?',message:'Its photos and shared link will also be deleted. Your report allowance will not be restored.',confirmLabel:'Delete permanently',danger:true}))run(async()=>{await api(`/reports/${button.dataset.deleteReport}`,{method:'DELETE'});if(draft?.serverId===button.dataset.deleteReport){draft=null;await stored('delete');clearURLs();}reportsCache=null;propertiesCache=null;await list('reports');},button);});
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
  if(draftUnsaved()&&draft.serverId!==id&&!await confirmAction({title:'Replace this draft?',message:'Your current draft is not saved online yet.',confirmLabel:'Replace draft',danger:true}))return;
  haptic();
  $('app').innerHTML='<section class="loading">Opening your report…</section>';
  const payload=await api(`/reports/${id}/comparison`);
  // A report belongs to its own tool. Opened from elsewhere (an app hand-off,
  // say), the app moves there first so its lists and draft slot line up.
  const owner=toolForType(payload.report?.document?.type);
  if(native&&owner!==toolId()){localStorage.setItem('marketel.product',owner);location.replace(`index.html?arm=${owner}&open=${encodeURIComponent(id)}`);return;}
  await useComparisonPayload(payload);
}
async function startComparison(baselineId){
  if(draftUnsaved()&&!await confirmAction({title:'Start a comparison report?',message:'Your current draft is not saved online yet.',confirmLabel:'Start comparison',danger:true}))return;
  const payload=await api(`/reports/${baselineId}/comparison-draft`,{method:'POST',body:{date:localDate()}});
  reportsCache=null;await useComparisonPayload(payload);
}
async function list(page='reports',append=false){
  if(!account)return ensureAuth(()=>list(page).catch(error=>notice(error.message)));
  dismissFlow();
  updateHeader();setActiveNav(page);
  const request=++listRequest;
  if(page==='properties'){
    if(propertiesCache)renderProperties(propertiesCache);else $('app').innerHTML=`<h1>${esc(skin().placesHeading)}</h1><section class="loading">Loading saved ${esc(skin().placesHeading.toLowerCase())}…</section>`;
    const result=await api('/properties');propertiesCache=result;
    if(currentPage==='properties'&&request===listRequest)renderProperties(result);return;
  }
  if(reportsCache&&!append){reports=reportsCache.reports;nextReportCursor=reportsCache.nextCursor;renderReports();}
  else if(!append)$('app').innerHTML=`<h1>${esc(skin().listHeading)}</h1><section class="loading">Loading saved ${esc(skin().docPlural)}…</section>`;
  const pageResult=await api(`/reports?take=50&${toolTypesQuery()}${append&&nextReportCursor?`&cursor=${encodeURIComponent(nextReportCursor)}`:''}`);
  reports=append?reports.concat(pageResult.reports):pageResult.reports;nextReportCursor=pageResult.nextCursor;
  reportsCache={reports:[...reports],nextCursor:nextReportCursor};
  if(currentPage==='reports'&&request===listRequest)renderReports();
}
async function openAccountHome(){
  if(!account)return landing();
  if(hasUnfinishedDraft())return editor();
  updateHeader();setActiveNav('reports');
  const result=reportsCache||await api(`/reports?take=50&${toolTypesQuery()}`);
  reports=result.reports||[];nextReportCursor=result.nextCursor||null;reportsCache={reports:[...reports],nextCursor:nextReportCursor};
  if(!reports.length)return start();
  renderReports();
}
function prefetchLists(){if(!account)return;api('/properties').then(result=>{propertiesCache=result;}).catch(()=>{});api(`/reports?take=50&${toolTypesQuery()}`).then(result=>{reportsCache=result;}).catch(()=>{});}
$('account-button').onclick=async()=>{
  if(!account)return ensureAuth(()=>run(()=>openAccountHome()),'signin');
  await requestStorefront();
  const sk = skin();
  modal(`<h2>${esc(sk.product)} account</h2><p>${esc(account.email)}</p><p>${account.active?`${account.remaining} ${esc(sk.docPlural)} left. ${account.cancellationScheduled?'Access ends':'Next billing period'} ${new Date(account.periodEnd).toLocaleDateString()}.`:`One complete ${esc(sk.doc)} free. Existing ${esc(sk.docPlural)} stay available.`}</p><div class="stack">${(!native||storefront==='USA')?'<button id="manage">Manage subscription</button>':''}<button id="switch" class="secondary">Open booking Front Desk</button><button id="logout" class="quiet">Sign out of Marketel</button></div><details class="more-actions"><summary>More</summary><div class="stack"><button id="refresh" class="secondary">Refresh billing status</button><button id="delete-account" class="quiet danger">Delete ${esc(sk.product)} account</button></div></details><p><a href="${esc(sk.terms)}">${esc(sk.product)} terms &amp; privacy</a></p>`);
  $('refresh').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();notice('Account refreshed.');});
  if($('manage'))$('manage').onclick=()=>run(async()=>openExternal((await api('/billing',{method:'POST',body:{native}})).url));
  $('switch').onclick=()=>{localStorage.setItem('marketel.product','bookings');if(native)location.replace('../frontdesk/index.html?native=ios');else location.assign('/frontdesk');};
  $('logout').onclick=event=>run(async()=>{await api('/auth/logout',{method:'POST'});await logout();notice('Signed out.','success');},event.currentTarget);
  $('delete-account').onclick=async()=>{
    $('dialog').close();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(!await confirmAction({title:`Delete your ${skin().product} account?`,message:`This permanently deletes ${skin().product} reports and photos and cancels its subscription. Booking properties are unaffected.`,confirmLabel:'Delete account permanently',danger:true}))return;
    run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});await logout();});
  };
};
async function logout(){session='';account=null;draft=null;reportsCache=null;propertiesCache=null;clearURLs();localStorage.removeItem('inspect.session');localStorage.removeItem('marketel.product');await stored('delete');if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectSignOut'});if($('dialog').open)$('dialog').close();landing();}
$('nav').onclick=e=>{const page=e.target.closest('[data-page]')?.dataset.page;if(!page)return;if(page==='new')start();else if(page==='current')editor();else list(page).catch(error=>notice(error.message));};
$('dialog').addEventListener('close',()=>{unlockPage();document.documentElement.classList.remove('sheet-full');$('dialog').style.removeProperty('--sheet-top');$('dialog').style.removeProperty('--sheet-max-height');syncNativeInspectState(currentPage,true);});
// In the app every hop between tools replaces the page. A page left in the
// back/forward cache keeps its storage connection and scripts alive, which is
// what stranded the next tool on a blank screen.
$('product-switch').onclick=event=>{if(!native)return;event.preventDefault();location.replace('../index.html?choose=1');};
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="http"]');if(native&&link){event.preventDefault();openExternal(link.href);}});
window.marketelInspectStorefront=country=>{storefront=country;const waiters=storefrontWaiters;storefrontWaiters=[];waiters.forEach(resolve=>resolve());};
window.marketelInspectExportResult=result=>notice(result==='complete'?'PDF export complete.':result==='busy'?'Close the open screen and try exporting again.':'PDF export failed. Please retry.');
// Each shot arrives on its own while the sheet stays open, so the room rebuilds
// between captures and the photo is already in the draft if the app is killed.
// The camera sheet stops at the medium detent, and the half of the screen it
// leaves uncovered is this page. It used to be whatever the editor happened to
// be scrolled to — so photographing a property meant closing the camera once
// per room just to reach the next one.
//
// That space becomes the room list instead. Tapping a room retargets the open
// camera, so a whole property is one session.
let cameraRoom=null;
// Dictation while the camera is open writes the speaker's own words straight
// into the finding. It is the device's own engine, so there is no upload, no
// account and no AI allowance between someone and their note.
let hudDictation=null;
function hudTalk(){
  const shell=window.webkit?.messageHandlers?.marketelShell;
  if(!shell||cameraRoom===null||!draft)return;
  if(hudDictation){shell.postMessage({type:'inspectDictateStop'});hudDictation=null;cameraCompanion();return;}
  const room=draft.document.rooms[cameraRoom];
  hudDictation={index:cameraRoom,base:(room.observation||'').trim()};
  shell.postMessage({type:'inspectDictate',room:cameraRoom});
  haptic();cameraCompanion();
}
function cameraCompanion(){
  if(cameraRoom===null||!draft)return;
  document.documentElement.classList.add('camera-open');
  const rooms=draft.document.rooms,w=wedge(draft.document.type),entries=entryTool();
  const room=rooms[cameraRoom];
  if(!room)return;
  const talking=!!hudDictation;
  const note=(room.observation||'').trim();
  const strip=room.photos.map((id,index)=>`<figure><img src="${esc(photoURL(id))}" alt="Photo ${index+1}"><button type="button" class="photo-x" data-strip-remove="${esc(id)}" aria-label="Remove photo ${index+1}">&#10005;</button></figure>`).join('');
  const subjects=rooms.map((item,index)=>`<button type="button" class="camera-room${index===cameraRoom?' is-active':''}" data-camera-room="${index}"><strong>${esc(entries?entryLabel(item,index):(item.name||`${w.noun} ${index+1}`))}</strong><span>${item.photos.length}</span></button>`).join('');
  $('app').innerHTML=`<section class="camera-companion"><small class="eyebrow">${esc(draft.document.propertyName)||esc(skin().product)}</small><h1>${esc(entries?entryLabel(room,cameraRoom):(room.name||`${w.noun} ${cameraRoom+1}`))} <span class="camera-count">${room.photos.length} ${room.photos.length===1?'photo':'photos'}</span></h1><div class="hud-note${talking?' is-live':''}">${note?esc(note):`<span class="muted">${talking?'Listening…':'Say what you are looking at, then photograph it.'}</span>`}</div><div class="camera-strip">${strip||`<p class="muted"><small>Shots land here as you take them.</small></p>`}</div><div class="hud-actions">${native?`<button type="button" id="hud-talk" class="${talking?'danger-button':''} wide">${talking?'Stop':'Hold to talk'}</button>`:''}<button type="button" id="hud-next" class="secondary wide">Next ${esc(entries?'finding':w.noun)}</button></div><div class="camera-rooms">${subjects}</div></section>`;
  if($('hud-talk'))$('hud-talk').onclick=hudTalk;
  $('hud-next').onclick=()=>{
    if(rooms.length>=30)return notice(`Maximum 30 ${entries?'findings':w.nounPlural}.`);
    if(hudDictation)hudTalk();
    rooms.push({name:entries?'':nextRoomName(rooms),observation:'',issue:false,photos:[]});
    cameraRoom=rooms.length-1;
    remember();persist().catch(()=>{});
    window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectCameraRoom',room:cameraRoom,name:entries?entryLabel(rooms[cameraRoom],cameraRoom):(rooms[cameraRoom]?.name||'')});
    haptic();cameraCompanion();
  };
  document.querySelectorAll('[data-camera-room]').forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.cameraRoom);
    if(index===cameraRoom)return;
    if(hudDictation)hudTalk();
    cameraRoom=index;haptic();
    window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectCameraRoom',room:index,name:entries?entryLabel(draft.document.rooms[index],index):(draft.document.rooms[index]?.name||'')});
    cameraCompanion();
  });
  // A blurred shot is worth catching here, in front of the thing, rather than
  // at the reveal. The cross rather than the photo itself: one hand is holding
  // the phone, and a whole-thumbnail target would fire by accident.
  document.querySelectorAll('[data-strip-remove]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.stripRemove,photos=draft.document.rooms[cameraRoom].photos,at=photos.indexOf(id);
    if(at<0)return;
    photos.splice(at,1);
    const url=urls.get(id);if(url){URL.revokeObjectURL(url);urls.delete(id);}
    draft.files=draft.files.filter(file=>file.id!==id);
    haptic();remember();persist().catch(()=>{});cameraCompanion();
  });
}
window.marketelInspectCameraOpened=raw=>{
  if(!draft)return;
  cameraRoom=Number(raw)||0;
  // Name the room the shell opened on, so its caption is right before any tap.
  window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectCameraRoom',room:cameraRoom,name:draft.document.rooms[cameraRoom]?.name||''});
  cameraCompanion();
};
window.marketelInspectCameraClosed=()=>{
  document.documentElement.classList.remove('camera-open');
  if(cameraRoom===null)return;
  cameraRoom=null;
  if(draft&&!preview&&!draft.finalizedAt)editor('rooms');else if(draft)reportPreview();else landing();
};
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
  if(cameraRoom!==null)cameraCompanion();
  else if(!preview&&!draft.finalizedAt&&editorStep==='rooms')editor('rooms');
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
    updateHeader();prefetchLists();if(native&&!LANDING_ARMS[localStorage.getItem('marketel.product')])localStorage.setItem('marketel.product','inspect');
    if(result.reportId)await openReport(result.reportId);else await openAccountHome();
    notice('Signed in. Your report is ready.','success');
  }catch(error){
    notice(error.message||'This app link is invalid or expired.','error');
    ensureAuth(()=>run(()=>openAccountHome()),'signin');
  }
};
window.marketelInspectNativeAction=action=>{
  if(action==='account'){$('account-button').click();return;}
  if(action==='signin'){if($('dialog').open)$('dialog').close();ensureAuth(()=>run(()=>openAccountHome()),'signin');return;}
  if(action==='choose'){location.replace('../index.html?choose=1');return;}
  if(action==='frontdesk'){syncNativeInspectState(currentPage,false);localStorage.setItem('marketel.product','bookings');location.replace('../frontdesk/index.html?native=ios');return;}
  if(action==='refresh')run(async()=>{await refresh();if(draft)editor();else if(account)await list(currentPage==='properties'?'properties':'reports');else landing();notice(`${skin().product} refreshed.`);});
};
function beginWedgeEntrance(){
  let entering=false;
  try{entering=sessionStorage.getItem('marketel.enter')==='1';sessionStorage.removeItem('marketel.enter');}catch{}
  if(entering)document.documentElement.classList.add('wedge-enter');
}
// Removed once the first screen has had time to arrive, so a later landing
// (after Discard, say) does not replay the entrance.
function settleWedgeEntrance(){
  if(document.documentElement.classList.contains('wedge-enter'))setTimeout(()=>document.documentElement.classList.remove('wedge-enter'),900);
}
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
// Publish the total covered height and the native-only height separately. The
// web visual viewport already excludes its keyboard; Capacitor resize:none does
// not, so subtracting one undifferentiated value either double-counted the web
// keyboard or ignored the native one.
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
    root.style.setProperty('--kb-native',`${nativeKeyboard>60?Math.round(nativeKeyboard):0}px`);
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
// Back from Safari after paying in the app: finish the report that was waiting.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resumePendingExport({wait:8000}).catch(()=>{});});
// Restored from the back/forward cache: the shell has moved on since, so tell
// it where this page is again and redraw what was on screen.
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  syncNativeInspectState(currentPage,!$('dialog').open);
  if(hasUnfinishedDraft())editor();else if(account)openAccountHome().catch(()=>landing());else landing();
});
// Every foreground used to fire two calls; errors are swallowed here so a
// background refresh can never overwrite the sign-out notice or disable a button.
let lastForegroundSync=0;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!session)return;
  if(Date.now()-lastForegroundSync<60000)return;
  lastForegroundSync=Date.now();
  run(async()=>{await api('/billing/refresh',{method:'POST'}).catch(()=>{});await refresh().catch(()=>{});},null);
});
if(native){beginWedgeEntrance();const chosen=new URLSearchParams(location.search).get('arm');if(LANDING_ARMS[chosen])localStorage.setItem('marketel.product',chosen);else if(!LANDING_ARMS[localStorage.getItem('marketel.product')])localStorage.setItem('marketel.product','inspect');showNativeKeyboardDoneButton();syncNativeInspectState('current',true);window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectStorefront'});}
// A cold start often runs before the network is ready. That is not a failure
// worth alarming anyone about: the session and the local draft are intact, so
// boot quietly and let the next action surface any real problem. Only a genuine
// 401 signs the operator out, and confirmSessionLost says so itself.
//
// Nothing the boot waits on may hold the screen blank: storage and the network
// are each bounded, a signed-in start shows its loading state at once, and a
// watchdog offers a way out if no screen has drawn.
let booted=false;
function renderRecovery(){
  const sk=skin();
  $('app').innerHTML=`<section class="card recovery"><h2>Couldn't open Marketel ${esc(sk.product)}</h2><p class="muted">Your saved ${esc(sk.docPlural)} are safe. Check your connection and try again.</p><div class="stack"><button type="button" id="recovery-retry" class="wide">Try again</button>${native?'<button type="button" id="recovery-tools" class="secondary wide">Back to tools</button>':''}</div></section>`;
  $('recovery-retry').onclick=()=>location.reload();
  if($('recovery-tools'))$('recovery-tools').onclick=()=>location.replace('../index.html?choose=1');
}
const bootWatchdog=setTimeout(()=>{if(!booted)renderRecovery();},12000);
if(simActive()){clearTimeout(bootWatchdog);booted=true;simResume();}
else try{
  $('app').innerHTML=`<section class="loading">Opening Marketel ${esc(skin().product)}…</section>`;
  // Storage gets one bounded chance. If it does not answer, open without the
  // local draft rather than wait on it a second time.
  if(await withTimeout(openDb(),1500).then(()=>true,()=>false)){
    await withTimeout(migrateLegacyDraft(),1500).catch(()=>{});
    draft=await withTimeout(stored('get'),1500).catch(()=>null);
  }
  await withTimeout(refresh(),10000).catch(()=>{});
  if(account){syncInspectAttribution().catch(()=>{});prefetchLists();}
  const opening=new URLSearchParams(location.search).get('open');
  if(account&&opening&&/^[A-Za-z0-9_-]{1,64}$/.test(opening))await openReport(opening);
  else if(hasUnfinishedDraft())editor();else if(account)await openAccountHome();else if(draft?.finalizedAt)reportPreview();else landing();
  booted=true;
  settleWedgeEntrance();
  const returned=new URLSearchParams(location.search);
  if(returned.get('checkout')==='success'&&session){
    if(!native)history.replaceState(null,'',location.pathname);
    const checkoutSession=returned.get('session')||'';
    if(/^cs_[A-Za-z0-9_]{8,200}$/.test(checkoutSession))await api('/checkout/confirm',{method:'POST',body:{sessionId:checkoutSession}}).catch(()=>{});
    await api('/billing/refresh',{method:'POST'}).catch(()=>{});
    await refresh();
    if(returned.get('report')){
      notice('Payment received. Finishing your report…');
      if(!await resumePendingExport({wait:12000}))notice('Your payment is still confirming. Tap Send again in a moment.');
    }else notice(account.active?`${skin().product} is ready. Your subscription is active.`:'Payment confirmation is pending. Refresh billing status shortly.',account.active?'success':'');
  }
}catch(e){notice(e.message,'error');if(draft)editor();else landing();}
finally{booted=true;clearTimeout(bootWatchdog);}
