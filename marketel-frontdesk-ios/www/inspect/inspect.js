const native = location.protocol === 'capacitor:' || location.protocol === 'ionic:';
if(native)document.documentElement.classList.add('native-inspect-shell');
const API = native ? 'https://bookmarketel.com/api/inspect' : '/api/inspect';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session = localStorage.getItem('inspect.session') || '';
let account = null, draft = null, reports = [], nextReportCursor = null, preview = false, storefront = null, storefrontWaiters = [];
let currentPage = 'current';
let reportsCache = null, propertiesCache = null, listRequest = 0;
// $29 x 12 = $348, so the annual plan saves $149 — and its report allowance is
// the monthly one times twelve, because the quota resets per billing period.
const PLANS = Object.freeze({
  year: Object.freeze({ price: 199, per: '/year', save: 'Save $149', reports: 360, terms: '$199 charged today, then yearly until cancelled.' }),
  month: Object.freeze({ price: 29, per: '/month', save: '', reports: 30, terms: '$29 charged today, then monthly until cancelled.' }),
});
let planInterval = 'year';
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
const newDocument = propertyName => ({ propertyName: propertyName || '', author: '', type: 'routine', date: localDate(), rooms: [{ name: 'Living room', observation: '', issue: false, photos: [] }], signatures: [] });
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
function notice(message) { $('notice').textContent = message; $('notice').style.display = 'block'; clearTimeout(notice.timer); notice.timer = setTimeout(() => $('notice').style.display = 'none', 9000); }
async function persist() { if (draft) await stored('put', draft); }
function remember() { persist().catch(() => notice('Device storage is full or unavailable. Keep this page open and save your report online.')); }
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
  if (trigger) trigger.disabled = true;
  try { await fn(); } catch (error) { notice(error.message); }
  finally { if (trigger) trigger.disabled = false; }
}
function syncNativeInspectState(page=currentPage,visible=!$('dialog').open){
  if(!native)return;
  window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectState',visible,selectedTab:page,hasDraft:!!draft});
}
function modal(content) { $('dialog-body').innerHTML = content; if (!$('dialog').open) $('dialog').showModal(); syncNativeInspectState(currentPage,false); }
$('dialog-close').onclick = () => $('dialog').close();
function setActiveNav(page) { currentPage=page;document.querySelectorAll('#nav button').forEach(button => button.classList.toggle('is-active', page === 'current' ? button.id === 'current-report' : button.dataset.page === page));syncNativeInspectState(page); }
function updateHeader() { $('account-button').textContent = account ? 'Account' : 'Sign in'; $('nav').hidden = !draft && !account;const current=$('current-report');if(current){const unfinished=draft&&!draft.finalizedAt;current.dataset.page=unfinished?'current':'new';current.textContent=unfinished?'Current report':'+ New report';} }
function photoURL(id) {
  if (urls.has(id)) return urls.get(id);
  const file = draft.files.find(f => f.id === id);
  if (!file?.blob) return '';
  const url = URL.createObjectURL(file.blob); urls.set(id, url); return url;
}
function clearURLs() { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); }
function landing() {
  updateHeader();
  setActiveNav('current');
  $('app').innerHTML = `<section class="hero"><div class="eyebrow">For small property managers</div><h1>Your walkthrough.<br>A finished report.</h1><p class="muted">Keep photos, observations and issues organized by room.<br>Send a clear condition report before you leave.</p><button id="start">Create your first report free</button><p><small>One complete report free. No card.<br>Then $29/month for 30 reports. One operator.</small></p><article class="card example"><div class="example-head"><small>SAMPLE REPORT · NOT A REAL INSPECTION</small><h2>Oak Street · Unit 2</h2><span class="status">Routine condition report</span></div><div class="example-photo">Your room photos, together</div><strong>Living room · Issue noted</strong><p>Small scuff on the wall beside the doorway. No other observations recorded.</p><small>Photos + your observations → PDF and private sharing link</small></article><p><small>Your report records what you observe. It is not a professional building inspection or legal certification.</small></p></section>`;
  $('start').onclick = () => start();
}
async function start(propertyName = '') {
  if (draft && !draft.finalizedAt && !confirm('Start a new report? Save your current draft online first if you want to keep it.')) return;
  clearURLs(); draft = { document: newDocument(propertyName), files: [], serverId: null, finalizedAt: null }; preview = false;
  await persist(); editor();
}
function editor() {
  if (!draft) return landing(); updateHeader();
  setActiveNav('current');
  const d = draft.document;
  d.signatures ||= [];
  if (preview || draft.finalizedAt) return reportPreview();
  const photos=d.rooms.reduce((total,room)=>total+room.photos.length,0), photographed=d.rooms.filter(room=>room.photos.length).length, issues=d.rooms.filter(room=>room.issue).length;
  $('app').innerHTML = `<div class="row spread"><div><small class="eyebrow">New condition report</small><h1>What did you observe?</h1></div><span class="status">${draft.serverId ? 'Draft · save changes online' : 'Draft stored on this device'}</span></div><p class="muted">${d.rooms.length} room${d.rooms.length===1?'':'s'} · ${photographed} photographed · ${photos} photo${photos===1?'':'s'} · ${issues} issue${issues===1?'':'s'}</p><section class="card grid"><label>Property / unit name<input id="property" maxlength="160" value="${esc(d.propertyName)}" placeholder="Oak Street · Unit 2"></label><label>Your name<input id="author" maxlength="120" value="${esc(d.author)}" placeholder="Report prepared by"></label><label class="date-field">Inspection date<input type="date" id="date" value="${esc(d.date)}"></label><label>Report type<select id="type">${['routine','move-in','move-out'].map(t => `<option ${d.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></section><div id="rooms">${d.rooms.map((r,i) => `<section class="card room-card" data-room="${i}"><label>Room name<input data-field="name" maxlength="100" value="${esc(r.name)}"></label><div class="row capture-actions"><label class="button secondary">Add photos<input type="file" data-files="${i}" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></label><label class="button secondary">Take photo<input type="file" data-camera="${i}" accept="image/*" capture="environment" hidden></label></div>${r.photos.length>1?'<p class="drag-hint">Press and hold a photo, then drag to reorder.</p>':''}<div class="photo-grid" data-photo-grid="${i}">${r.photos.map((id,p) => `<figure data-photo-id="${esc(id)}" data-photo-room="${i}"><img src="${esc(photoURL(id))}" alt="Property photo ${p+1}"><div class="photo-meta"><figcaption>${draft.files.find(f=>f.id===id)?.remoteId ? 'Uploaded' : 'On this device'}</figcaption><details class="photo-menu"><summary aria-label="Photo actions">•••</summary><div><button class="quiet" data-move-id="${i},${esc(id)},-1">Move earlier</button><button class="quiet" data-move-id="${i},${esc(id)},1">Move later</button><button class="quiet danger" data-delete-id="${i},${esc(id)}">Remove</button></div></details></div></figure>`).join('')}</div><label>Observations<textarea maxlength="4000" data-field="observation" placeholder="Describe only what you observed.">${esc(r.observation)}</textarea></label><div class="row note-tools"><label class="issue"><input data-field="issue" type="checkbox" ${r.issue ? 'checked' : ''}>Issue noted</label><button class="secondary" data-voice="${i}">Talk through this room</button><button class="quiet" data-ai="${i}">Polish typed note</button></div>${d.rooms.length>1?`<footer class="room-footer"><button class="quiet danger" data-remove-room="${i}">Remove this room</button></footer>`:''}</section>`).join('')}</div><button id="add-room" class="secondary">+ Add room</button><div class="actions row"><button id="preview">Preview report →</button><button id="save" class="quiet">Save online</button></div>`;
  for (const [id,key] of [['property','propertyName'],['author','author'],['date','date'],['type','type']]) $(id).oninput = event => { d[key] = event.target.value; remember(); };
  $('rooms').oninput = event => { const field = event.target.dataset.field; if (!field) return; d.rooms[Number(event.target.closest('[data-room]').dataset.room)][field] = field === 'issue' ? event.target.checked : event.target.value; remember(); };
  $('rooms').onchange = event => { if (event.target.matches('input[type=file]')) run(() => addPhotos(event.target)); };
  $('rooms').onclick = event => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.dataset.removeRoom !== undefined) { if (d.rooms.length === 1) return notice('Keep at least one room.'); if (confirm('Remove this room and its photos from the report?')) { d.rooms.splice(Number(b.dataset.removeRoom),1); remember(); editor(); } }
    if (b.dataset.deleteId) { const [roomIndex,id] = b.dataset.deleteId.split(','); const i=Number(roomIndex),p=d.rooms[i].photos.indexOf(id); if(p>=0){d.rooms[i].photos.splice(p,1);const url=urls.get(id);if(url)URL.revokeObjectURL(url);urls.delete(id);remember();editor();} }
    if (b.dataset.moveId) { const [roomIndex,id,offsetValue] = b.dataset.moveId.split(','); const a=d.rooms[Number(roomIndex)].photos,p=a.indexOf(id),offset=Number(offsetValue); if (p>=0&&p+offset>=0&&p+offset<a.length) { [a[p],a[p+offset]]=[a[p+offset],a[p]]; remember(); editor(); } }
    if (b.dataset.ai !== undefined) rewrite(Number(b.dataset.ai));
    if (b.dataset.voice !== undefined) run(()=>recordRoom(Number(b.dataset.voice)),b);
  };
  $('add-room').onclick = () => { if (d.rooms.length >=30) return notice('Maximum 30 rooms.'); d.rooms.push({name:'Room',observation:'',issue:false,photos:[]});remember();editor(); };
  $('preview').onclick = () => { preview=true;reportPreview(); };
  $('save').onclick = () => ensureAuth(() => run(async()=>{await save();notice('Report saved online.');editor();}));
  bindPhotoDrag();
}

function bindPhotoDrag(){
  document.querySelectorAll('.photo-grid figure').forEach(figure=>{
    let timer=null,dragging=false,startX=0,startY=0,pointerId=null;
    const finish=()=>{clearTimeout(timer);timer=null;if(dragging){dragging=false;figure.classList.remove('is-dragging');remember();editor();}};
    figure.onpointerdown=event=>{
      if(event.target.closest('button,summary,details'))return;
      pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;
      timer=setTimeout(()=>{dragging=true;figure.classList.add('is-dragging');figure.setPointerCapture?.(pointerId);if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectHaptic'});},350);
    };
    figure.onpointermove=event=>{
      if(!timer&&!dragging)return;
      if(!dragging&&Math.hypot(event.clientX-startX,event.clientY-startY)>10){clearTimeout(timer);timer=null;return;}
      if(!dragging)return;
      event.preventDefault();
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.photo-grid figure');
      if(!target||target===figure||target.dataset.photoRoom!==figure.dataset.photoRoom)return;
      const room=draft.document.rooms[Number(figure.dataset.photoRoom)].photos;
      const from=room.indexOf(figure.dataset.photoId),to=room.indexOf(target.dataset.photoId);
      if(from<0||to<0)return;
      const grid=target.parentElement,positions=new Map([...grid.children].map(item=>[item,item.getBoundingClientRect()]));
      room.splice(to,0,room.splice(from,1)[0]);
      grid.insertBefore(figure,to>from?target.nextSibling:target);
      for(const item of grid.children){const before=positions.get(item),after=item.getBoundingClientRect();if(!before)continue;const x=before.left-after.left,y=before.top-after.top;if(x||y)item.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:180,easing:'ease-out'});}
    };
    figure.onpointerup=finish;figure.onpointercancel=finish;figure.onlostpointercapture=()=>{if(dragging)finish();};
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
    $('dialog-body').innerHTML=`<h2>Enter your code.</h2><p>We sent a six-digit code to ${esc(email)}.</p><form id="code-form"><label>Six-digit code<input id="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code"></label></form><button type="button" id="auth-back" class="quiet auth-back">← Use a different email</button>`;
    const input=$('code');
    // Synchronous focus inside the same user gesture: an await here would let
    // iOS dismiss the keyboard before the code field exists.
    input.focus();
    let verifying=false;
    const attempt=()=>{
      const code=input.value.replace(/\D/g,'').slice(0,6);
      if(verifying||code.length!==6)return;
      // Deliberately not disabled while verifying: disabling a focused input
      // drops the iOS keyboard, and re-focusing outside a user gesture will not
      // bring it back. The flag alone prevents a second submit.
      verifying=true;
      run(async()=>{
        const result=await api('/auth/verify',{method:'POST',body:{email,code,attribution:inspectAttribution}});
        session=result.token;localStorage.setItem('inspect.session',session);account=result;updateHeader();prefetchLists();$('dialog').close();
      },null).then(()=>{
        verifying=false;
        if(account)after();else{input.value='';input.focus();}
      });
    };
    input.oninput=attempt;
    $('code-form').onsubmit=event=>{event.preventDefault();attempt();};
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
      run(async()=>{await api('/auth/request',{method:'POST',body:{email}});notice('Check your email for the code.');},null);
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
  modal(`<h2>Talk through ${esc(draft.document.rooms[index].name)}</h2><p class="recording-state"><span class="recording-dot"></span> Recording · <strong id="recording-time">0:00</strong></p><p class="muted">Say only what you can observe. Mention the location and whether it should be marked as an issue. The recording and transcript are not attached to your report.</p><button id="stop-recording">Stop and review</button>`);
  const tick=setInterval(()=>{seconds+=1;const label=$('recording-time');if(label)label.textContent=`0:${String(seconds).padStart(2,'0')}`;if(seconds>=60&&recorder.state==='recording')recorder.stop();},1000);
  const started=Date.now();
  $('stop-recording').onclick=()=>{if(recorder.state==='recording')recorder.stop();};
  $('dialog').addEventListener('close',()=>{if(recorder.state==='recording'){cancelled=true;recorder.stop();}},{once:true});
  recorder.start(250);
  let blob;
  try{blob=await recording;}catch(error){if($('dialog').open)$('dialog').close();throw error;}finally{clearInterval(tick);stream.getTracks().forEach(track=>track.stop());finished=true;}
  if(cancelled||!finished||!blob.size)return;
  const durationMs=Math.min(60000,Math.max(250,Date.now()-started));
  $('dialog').close();
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
  const accept=mode=>{const room=draft.document.rooms[index];room.observation=mode==='append'&&room.observation.trim()?`${room.observation.trim()}\n${result.suggestion}`:result.suggestion;if(result.issueMentioned)room.issue=true;remember();$('dialog').close();editor();};
  $('replace-note').onclick=()=>accept('replace');$('append-note').onclick=()=>accept('append');$('discard-note').onclick=()=>$('dialog').close();
}
function signaturePreview(signature){
  const paths=signature.strokes.map(stroke=>stroke.map((point,index)=>`${index?'L':'M'} ${(point.x*300).toFixed(1)} ${(point.y*100).toFixed(1)}`).join(' '));
  return `<section class="signature-preview"><strong>${signature.role==='resident'?'Resident / tenant':'Manager / inspector'} signature</strong><svg viewBox="0 0 300 100" aria-label="Signature">${paths.map(path=>`<path d="${path}"></path>`).join('')}</svg><small>${esc(signature.name)}${signature.signedAt?` · ${new Date(signature.signedAt).toLocaleString()}`:''}</small></section>`;
}
function reportRoom(r,label=''){
  return `<section class="report-room">${label?`<p class="compare-label">${label}</p>`:''}<h2>${esc(r.name)}${r.issue?' · Issue noted':''}</h2><p class="report-note">${esc(r.observation)||'No observation recorded.'}</p>${r.photos.map(id=>`<img class="report-photo" src="${esc(photoURL(id))}" alt="Recorded room condition"><small>${draft.files.find(f=>f.id===id)?.source==='camera'?'Camera capture':'Imported photo'}</small>`).join('')}</section>`;
}
function reportPreview(){
  updateHeader();setActiveNav('current');const d=draft.document;d.signatures ||= [];
  const baseline=draft.baseline?.document,baselineRooms=new Map((baseline?.rooms||[]).map(room=>[room.name.toLowerCase(),room]));
  const roomMarkup=d.rooms.map((room,index)=>{const before=baselineRooms.get(room.name.toLowerCase())||baseline?.rooms?.[index];return `<div class="comparison-pair">${before?reportRoom(before,'Previous finalized report'):''}${reportRoom(room,before?'Current report':'')}</div>`;}).join('');
  $('app').innerHTML=`<div class="row spread"><small class="eyebrow">${draft.finalizedAt?'Finalized report':'Your report preview'}</small>${!draft.finalizedAt?'<button class="quiet" id="edit">← Edit</button>':''}</div><article class="card"><small>MARKETEL INSPECT</small><h1>${esc(d.propertyName)||'Your property'}</h1><p class="muted">${esc(d.type)} · ${esc(d.date)} · ${esc(d.author)||'Author not entered'}</p>${baseline?`<div class="comparison-banner">Compared with the finalized ${esc(baseline.type)} report from ${esc(baseline.date)}.</div>`:''}${roomMarkup}${d.signatures.map(signaturePreview).join('')}<p><small>Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.</small></p></article>${!draft.finalizedAt?`<section class="card signature-actions"><div><h2>Optional signatures</h2><p class="muted">Add a manager or resident sign-off before finalizing.</p></div><div class="row"><button class="secondary" data-sign="manager">${d.signatures.some(s=>s.role==='manager')?'Replace manager signature':'Add manager signature'}</button><button class="secondary" data-sign="resident">${d.signatures.some(s=>s.role==='resident')?'Replace resident signature':'Add resident signature'}</button></div></section>`:''}<div class="actions row">${draft.finalizedAt?'<button id="pdf">Download PDF</button><button id="share" class="secondary">Create private share link</button>':'<button id="finalize">Save & export my report →</button>'}</div><p class="muted">${draft.finalizedAt?'This version cannot change. Create a new report for corrections.':'Finalizing freezes this version. Your first report includes PDF export and a revocable share link, free.'}</p>`;
  if($('edit'))$('edit').onclick=()=>{preview=false;editor();};
  document.querySelectorAll('[data-sign]').forEach(button=>button.onclick=()=>captureSignature(button.dataset.sign));
  if($('finalize'))$('finalize').onclick=()=>ensureAuth(()=>run(async()=>{
    await refresh();if(!account.freeAvailable&&(!account.active||!account.remaining))return offer();
    if(!draft.document.author.trim())throw new Error('Add your name in the editor before finalizing.');
    await save();const r=await api(`/reports/${draft.serverId}/finalize`,{method:'POST'});draft.finalizedAt=r.finalizedAt;draft.document=r.document;reportsCache=null;propertiesCache=null;await persist();await refresh();reportPreview();notice('Your report is ready. Download the PDF or create a private link.');
  }));
  if($('pdf'))$('pdf').onclick=()=>run(async()=>{
    if(native){window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectExportPDF',reportId:draft.serverId,token:session});return;}
    const blob=await api(`/reports/${draft.serverId}/pdf`,{blob:true});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='inspection-report.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  });
  // Revoke lives inside the share sheet rather than the floating action bar:
  // it is rare, destructive, and only means anything once a link exists.
  if($('share'))$('share').onclick=()=>run(async()=>{const r=await api(`/reports/${draft.serverId}/share`,{method:'POST'});modal(`<h2>Private report link</h2><p>Anyone with this link can read and download this version. Creating a new link replaces the previous one.</p><input id="share-url" readonly value="${esc(r.url)}"><button id="copy-link" class="wide">Copy link</button><button id="revoke" class="quiet danger">Revoke this link</button>`);$('copy-link').onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(r.url);}catch{$('share-url').select();document.execCommand('copy');}notice('Link copied.');});$('revoke').onclick=()=>run(async()=>{await api(`/reports/${draft.serverId}/share`,{method:'DELETE'});$('dialog').close();notice('Shared link revoked.');});});
}
function captureSignature(role){
  const existing=draft.document.signatures?.find(signature=>signature.role===role);
  modal(`<h2>${role==='resident'?'Resident / tenant':'Manager / inspector'} signature</h2><label>Signer name<input id="signer-name" maxlength="120" value="${esc(existing?.name||'')}"></label><p class="muted">Sign inside the box. This is optional and will be dated by Marketel when the report is finalized.</p><canvas id="signature-pad" width="600" height="200" aria-label="Signature pad"></canvas><div class="row"><button id="save-signature">Use signature</button><button id="clear-signature" class="secondary">Clear</button>${existing?'<button id="remove-signature" class="quiet danger">Remove</button>':''}</div>`);
  const canvas=$('signature-pad'),ctx=canvas.getContext('2d'),strokes=existing?structuredClone(existing.strokes):[];let current=null;
  const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#1a2b22';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){ctx.beginPath();stroke.forEach((point,index)=>{const x=point.x*canvas.width,y=point.y*canvas.height;index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}};
  const point=event=>{const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};};
  canvas.onpointerdown=event=>{current=[point(event)];strokes.push(current);canvas.setPointerCapture(event.pointerId);draw();};
  canvas.onpointermove=event=>{if(!current)return;const next=point(event),last=current[current.length-1];if(Math.hypot(next.x-last.x,next.y-last.y)>.003&&current.length<300){current.push(next);draw();}};
  canvas.onpointerup=canvas.onpointercancel=()=>{if(current?.length===1)current.push({...current[0],x:Math.min(1,current[0].x+.002)});current=null;};
  $('clear-signature').onclick=()=>{strokes.splice(0);draw();};
  $('save-signature').onclick=()=>{const name=$('signer-name').value.trim();if(!name)return notice('Enter the signer name.');if(!strokes.length)return notice('Add a signature first.');const signatures=(draft.document.signatures||[]).filter(signature=>signature.role!==role);signatures.push({role,name,strokes});draft.document.signatures=signatures;remember();$('dialog').close();reportPreview();};
  if($('remove-signature'))$('remove-signature').onclick=()=>{draft.document.signatures=draft.document.signatures.filter(signature=>signature.role!==role);remember();$('dialog').close();reportPreview();};
  draw();
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
  if(session)api('/events',{method:'POST',body:{name:'AdditionalReportOfferViewed'}}).catch(()=>{});
  if(native&&storefront!=='USA')return modal('<h2>Your free report is yours.</h2><p>This account has no additional report allowance available. Existing subscribers can refresh their account access.</p><button id="refresh-access">Refresh access</button>'),$('refresh-access').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();});
  // Annual is preselected — $29/month takes over three months to repay what one
  // customer costs to acquire — but only intervals the server has a price for
  // are offered, so a missing annual price degrades to monthly, not a dead tap.
  const available=(Array.isArray(account?.plans)&&account.plans.length?account.plans:['month']).filter(value=>PLANS[value]);
  if(!available.includes(planInterval))planInterval=available[0];
  const paint=first=>{
    const plan=PLANS[planInterval];
    const toggle=available.length>1?`<div class="billing-toggle" role="radiogroup" aria-label="Billing period">${available.map(value=>`<button type="button" role="radio" aria-checked="${planInterval===value}" data-plan="${value}">${value==='year'?'Annual':'Monthly'}</button>`).join('')}</div>`:'';
    const html=`<h2>Ready for the next property?</h2>${toggle}<div class="price">$${plan.price} <small>${plan.per}</small></div>${plan.save?`<p class="price-save">${plan.save}</p>`:''}<p>${plan.reports} reports per billing period · One operator<br>Up to 100 photos and 10 wording suggestions per report</p><button id="buy" class="wide">Continue with Inspect</button><p><small>${plan.terms} Cancel renewal anytime. Existing finalized reports remain available. <a href="https://bookmarketel.com/inspect/terms.html">Inspect terms</a></small></p>`;
    if(first)modal(html);else $('dialog-body').innerHTML=html;
    document.querySelectorAll('[data-plan]').forEach(button=>{button.onclick=()=>{planInterval=button.dataset.plan==='year'?'year':'month';paint(false);};});
    $('buy').onclick=()=>run(async()=>{const r=await api('/checkout',{method:'POST',body:{native,interval:planInterval}});openExternal(r.url);});
  };
  paint(true);
}
function openExternal(url){if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'openBrowser',url});else location.assign(url);}
function renderProperties(data){
  const details=data?.propertyDetails||data?.properties?.map(name=>({name}))||[];
  $('app').innerHTML=`<h1>Properties</h1><p class="muted">Start a fresh report, or compare a move-out with the last finalized condition report.</p>${details.length?'':'<section class="card">Properties appear here after you save a report.</section>'}${details.map((property,index)=>`<section class="card property-row"><div><strong>${esc(property.name)}</strong>${property.latestDate?`<p class="muted">Latest finalized: ${esc(property.latestType)} · ${esc(property.latestDate)}</p>`:''}</div><div class="row"><button class="secondary" data-property="${index}">New report</button>${property.latestFinalizedReportId?`<button data-compare="${esc(property.latestFinalizedReportId)}">Start move-out comparison</button>`:''}</div></section>`).join('')}`;
  document.querySelectorAll('[data-property]').forEach(button=>button.onclick=()=>start(details[Number(button.dataset.property)].name));
  document.querySelectorAll('[data-compare]').forEach(button=>button.onclick=()=>run(()=>startComparison(button.dataset.compare),button));
}
function renderReports(){
  $('app').innerHTML=`<h1>Your reports</h1><p class="muted">${account.freeAvailable?'Your first complete report is free.':account.active?`${account.remaining} reports remaining this billing period.`:'Your saved reports remain available.'}</p>${reports.length?'':'<section class="card">No saved reports yet. Start your first walkthrough.</section>'}${reports.map(report=>`<section class="card report-row"><div><strong>${esc(report.document.propertyName)}</strong><p class="muted">${esc(report.document.date)} · ${report.finalizedAt?'Finalized':'Draft'}${report.baselineReportId?' · Comparison':''}</p></div><div class="row"><button data-open="${report.id}" class="secondary">Open</button><button data-delete-report="${report.id}" class="quiet danger">Delete</button></div></section>`).join('')}${nextReportCursor?'<button id="older" class="secondary">Load older reports</button>':''}<button id="new-report">+ New report</button>${!account.active&&!account.freeAvailable&&(!native||storefront==='USA')?'<button id="plans" class="quiet">Continue with Inspect</button>':''}`;
  if($('older'))$('older').onclick=event=>run(()=>list('reports',true),event.currentTarget);
  $('new-report').onclick=()=>start();if($('plans'))$('plans').onclick=offer;
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
  if(draft&&!draft.finalizedAt&&draft.serverId!==id&&!confirm('Replace the draft on this device? Save it online first to keep it.'))return;
  await useComparisonPayload(await api(`/reports/${id}/comparison`));
}
async function startComparison(baselineId){
  if(draft&&!draft.finalizedAt&&!confirm('Start a comparison report? Save your current draft online first if you want to keep it.'))return;
  const payload=await api(`/reports/${baselineId}/comparison-draft`,{method:'POST',body:{date:localDate()}});
  reportsCache=null;await useComparisonPayload(payload);
}
async function list(page='reports',append=false){
  if(!account)return ensureAuth(()=>list(page).catch(error=>notice(error.message)));
  updateHeader();setActiveNav(page);
  const request=++listRequest;
  if(page==='properties'){
    if(propertiesCache)renderProperties(propertiesCache);else $('app').innerHTML='<h1>Properties</h1><section class="card skeleton">Loading saved properties…</section>';
    const result=await api('/properties');propertiesCache=result;
    if(currentPage==='properties'&&request===listRequest)renderProperties(result);return;
  }
  if(reportsCache&&!append){reports=reportsCache.reports;nextReportCursor=reportsCache.nextCursor;renderReports();}
  else if(!append)$('app').innerHTML='<h1>Your reports</h1><section class="card skeleton">Loading saved reports…</section>';
  const pageResult=await api(`/reports?take=50${append&&nextReportCursor?`&cursor=${encodeURIComponent(nextReportCursor)}`:''}`);
  reports=append?reports.concat(pageResult.reports):pageResult.reports;nextReportCursor=pageResult.nextCursor;
  reportsCache={reports:[...reports],nextCursor:nextReportCursor};
  if(currentPage==='reports'&&request===listRequest)renderReports();
}
function prefetchLists(){if(!account)return;api('/properties').then(result=>{propertiesCache=result;}).catch(()=>{});api('/reports?take=50').then(result=>{reportsCache=result;}).catch(()=>{});}
$('account-button').onclick=async()=>{
  if(!account)return ensureAuth(()=>draft?editor():run(()=>list()));
  await requestStorefront();
  modal(`<h2>Inspect account</h2><p>${esc(account.email)}</p><p>${account.active?`${account.remaining} reports left. ${account.cancellationScheduled?'Access ends':'Next billing period'} ${new Date(account.periodEnd).toLocaleDateString()}.`:'One complete report free. Existing reports stay available.'}</p><div class="stack">${(!native||storefront==='USA')?'<button id="manage">Manage subscription</button>':''}<button id="switch" class="secondary">Open booking Front Desk</button><button id="logout" class="quiet">Sign out of Marketel</button></div><details class="more-actions"><summary>More</summary><div class="stack"><button id="refresh" class="secondary">Refresh billing status</button><button id="delete-account" class="quiet danger">Delete Inspect account</button></div></details><p><a href="https://bookmarketel.com/inspect/terms.html">Inspect terms & privacy</a></p>`);
  $('refresh').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();notice('Account refreshed.');});
  if($('manage'))$('manage').onclick=()=>run(async()=>openExternal((await api('/billing',{method:'POST',body:{native}})).url));
  $('switch').onclick=()=>{localStorage.setItem('marketel.product','bookings');location.assign(native?'../frontdesk/index.html?native=ios':'/frontdesk');};
  $('logout').onclick=()=>run(async()=>{await api('/auth/logout',{method:'POST'});await logout();});
  $('delete-account').onclick=()=>{if(prompt('This permanently deletes Inspect reports and photos and cancels its subscription. Booking properties are unaffected. Type DELETE to confirm.')==='DELETE')run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});await logout();});};
};
async function logout(){session='';account=null;draft=null;reportsCache=null;propertiesCache=null;clearURLs();localStorage.removeItem('inspect.session');localStorage.removeItem('marketel.product');await stored('delete');if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectSignOut'});$('dialog').close();landing();}
$('nav').onclick=e=>{const page=e.target.closest('[data-page]')?.dataset.page;if(!page)return;if(page==='new')start();else if(page==='current')editor();else list(page).catch(error=>notice(error.message));};
$('dialog').addEventListener('close',()=>syncNativeInspectState(currentPage,true));
$('product-switch').onclick=event=>{if(!native)return;event.preventDefault();location.assign('../index.html?choose=1');};
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="http"]');if(native&&link){event.preventDefault();openExternal(link.href);}});
window.marketelInspectStorefront=country=>{storefront=country;const waiters=storefrontWaiters;storefrontWaiters=[];waiters.forEach(resolve=>resolve());};
window.marketelInspectExportResult=result=>notice(result==='complete'?'PDF export complete.':result==='busy'?'Close the open screen and try exporting again.':'PDF export failed. Please retry.');
window.marketelInspectNativeSelectTab=page=>{
  if(page==='current'){if(draft)editor();else run(()=>start());return;}
  list(page).catch(error=>notice(error.message));
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
// iOS keeps the layout viewport at full height when the keyboard opens, so the
// sheet has to be told where the visible area actually is.
function trackVisualViewport(){
  const viewport=window.visualViewport;
  if(!viewport)return;
  const apply=()=>{
    const root=document.documentElement;
    root.style.setProperty('--vv-height',`${Math.round(viewport.height)}px`);
    root.style.setProperty('--vv-top',`${Math.round(viewport.offsetTop)}px`);
    root.classList.toggle('kb-open',window.innerHeight-viewport.height>120);
  };
  viewport.addEventListener('resize',apply);
  viewport.addEventListener('scroll',apply);
  apply();
}
trackVisualViewport();
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
try{draft=await stored('get');await refresh();if(account){await syncInspectAttribution().catch(()=>{});prefetchLists();}if(draft)editor();else if(account)await list();else landing();if(new URLSearchParams(location.search).get('checkout')==='success'&&session){await api('/billing/refresh',{method:'POST'});await refresh();notice(account.active?'Inspect is ready. Your subscription is active.':'Payment confirmation is pending. Refresh billing status shortly.');}}catch(e){notice(e.message);if(draft)editor();else landing();}
