const native = location.protocol === 'capacitor:' || location.protocol === 'ionic:';
if(native)document.documentElement.classList.add('native-inspect-shell');
const API = native ? 'https://bookmarketel.com/api/inspect' : '/api/inspect';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session = localStorage.getItem('inspect.session') || '';
let account = null, draft = null, reports = [], nextReportCursor = null, busy = false, preview = false, storefront = null, storefrontWaiters = [];
let currentPage = 'current';
const urls = new Map();
const localDate = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const uid = () => crypto.randomUUID?.() || `${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(2)).join('_')}`;
const newDocument = propertyName => ({ propertyName: propertyName || '', author: '', type: 'routine', date: localDate(), rooms: [{ name: 'Living room', observation: '', issue: false, photos: [] }] });
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
async function api(path, options = {}) {
  const headers = { ...(session ? { Authorization: `Bearer ${session}` } : {}), ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) };
  const response = await fetch(API + path, { ...options, headers: { ...headers, ...options.headers }, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) { session = ''; account = null; localStorage.removeItem('inspect.session'); }
    throw Object.assign(new Error(error.error || 'Could not complete that action. Please retry.'), { status: response.status });
  }
  return options.blob ? response.blob() : response.json();
}
async function run(fn) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
  try { await fn(); } catch (error) { notice(error.message); }
  finally { busy = false; document.querySelectorAll('button').forEach(b => b.disabled = false); }
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
  if (preview || draft.finalizedAt) return reportPreview();
  $('app').innerHTML = `<div class="row spread"><div><small class="eyebrow">New condition report</small><h1>What did you observe?</h1></div><span class="status">${draft.serverId ? 'Draft · save changes online' : 'Draft stored on this device'}</span></div><p class="muted">Add photos and your own observations. Preview first; no account needed yet.</p><section class="card grid"><label>Property / unit name<input id="property" maxlength="160" value="${esc(d.propertyName)}" placeholder="Oak Street · Unit 2"></label><label>Your name<input id="author" maxlength="120" value="${esc(d.author)}" placeholder="Report prepared by"></label><label>Inspection date<input type="date" id="date" value="${esc(d.date)}"></label><label>Report type<select id="type">${['routine','move-in','move-out'].map(t => `<option ${d.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></section><div id="rooms">${d.rooms.map((r,i) => `<section class="card" data-room="${i}"><div class="row spread"><label>Room name<input data-field="name" maxlength="100" value="${esc(r.name)}"></label><button class="quiet danger" data-remove-room="${i}">Remove room</button></div><div class="row"><label class="button secondary">Add photos<input type="file" data-files="${i}" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></label><label class="button secondary">Take photo<input type="file" data-camera="${i}" accept="image/*" capture="environment" hidden></label></div><div class="photo-grid">${r.photos.map((id,p) => `<figure><img src="${esc(photoURL(id))}" alt="Property photo ${p+1}"><figcaption>${draft.files.find(f=>f.id===id)?.remoteId ? 'Uploaded' : 'On this device'}</figcaption><div class="photo-actions"><button class="quiet" data-move="${i},${p},-1" aria-label="Move photo earlier">←</button><button class="quiet" data-delete="${i},${p}" aria-label="Remove photo">Remove</button><button class="quiet" data-move="${i},${p},1" aria-label="Move photo later">→</button></div></figure>`).join('')}</div><label>Observations<textarea maxlength="4000" data-field="observation" placeholder="Describe only what you observed. Use your keyboard microphone to dictate.">${esc(r.observation)}</textarea></label><label class="issue"><input data-field="issue" type="checkbox" ${r.issue ? 'checked' : ''}>Issue noted</label><button class="quiet" data-ai="${i}">Help word this clearly</button></section>`).join('')}</div><button id="add-room" class="secondary">+ Add room</button><div class="actions row"><button id="preview">Preview report →</button><button id="save" class="quiet">Save online</button></div>`;
  for (const [id,key] of [['property','propertyName'],['author','author'],['date','date'],['type','type']]) $(id).oninput = event => { d[key] = event.target.value; remember(); };
  $('rooms').oninput = event => { const field = event.target.dataset.field; if (!field) return; d.rooms[Number(event.target.closest('[data-room]').dataset.room)][field] = field === 'issue' ? event.target.checked : event.target.value; remember(); };
  $('rooms').onchange = event => { if (event.target.matches('input[type=file]')) run(() => addPhotos(event.target)); };
  $('rooms').onclick = event => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.dataset.removeRoom !== undefined) { if (d.rooms.length === 1) return notice('Keep at least one room.'); if (confirm('Remove this room and its photos from the report?')) { d.rooms.splice(Number(b.dataset.removeRoom),1); remember(); editor(); } }
    if (b.dataset.delete) { const [i,p] = b.dataset.delete.split(',').map(Number); const [id] = d.rooms[i].photos.splice(p,1); const url=urls.get(id);if(url)URL.revokeObjectURL(url);urls.delete(id);remember();editor(); }
    if (b.dataset.move) { const [i,p,offset] = b.dataset.move.split(',').map(Number); const a=d.rooms[i].photos; if (p+offset>=0 && p+offset<a.length) { [a[p],a[p+offset]]=[a[p+offset],a[p]]; remember(); editor(); } }
    if (b.dataset.ai !== undefined) rewrite(Number(b.dataset.ai));
  };
  $('add-room').onclick = () => { if (d.rooms.length >=30) return notice('Maximum 30 rooms.'); d.rooms.push({name:'Room',observation:'',issue:false,photos:[]});remember();editor(); };
  $('preview').onclick = () => { preview=true;reportPreview(); };
  $('save').onclick = () => ensureAuth(() => run(async()=>{await save();notice('Report saved online.');editor();}));
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
function ensureAuth(after) {
  if(session && account) return after();
  modal(`<h2>Keep your report.</h2><p>Verify your email to save, export and recover your work on another device. Your first complete report is free.</p><form id="email-form"><label>Email<input id="email" type="email" required autocomplete="email"></label><button>Send sign-in code</button></form><form id="code-form" hidden><label>Six-digit code<input id="code" inputmode="numeric" pattern="[0-9]{6}" required autocomplete="one-time-code"></label><button>Verify and continue</button></form>`);
  let email='';
  $('email-form').onsubmit=e=>{e.preventDefault();run(async()=>{email=$('email').value;await api('/auth/request',{method:'POST',body:{email}});$('code-form').hidden=false;notice('Check your email for the code.');});};
  $('code-form').onsubmit=e=>{e.preventDefault();run(async()=>{
    const result=await api('/auth/verify',{method:'POST',body:{email,code:$('code').value}});
    session=result.token;localStorage.setItem('inspect.session',session);account=result;updateHeader();$('dialog').close();
  }).then(()=>{if(account) after();});};
}
async function refresh(){if(session){account=await api('/account');updateHeader();}}
async function save() {
  if(!draft.document.propertyName.trim())throw new Error('Enter a property name.');
  const referenced=draft.document.rooms.flatMap(room=>room.photos);
  if(referenced.some(id=>!draft.files.some(file=>file.id===id)))throw new Error('A report photo is missing from this device. Remove it or add it again.');
  if(!draft.serverId){const r=await api('/reports',{method:'POST',body:{...draft.document,rooms:draft.document.rooms.map(r=>({...r,photos:[]}))}});draft.serverId=r.id;await persist();}
  // Remove remotely uploaded photos the operator took out of the report before
  // adding replacements. This keeps the 100-photo quota truthful.
  const existingDoc={...draft.document,rooms:draft.document.rooms.map(r=>({...r,photos:r.photos.map(id=>draft.files.find(f=>f.id===id)?.remoteId).filter(Boolean)}))};
  await api(`/reports/${draft.serverId}`,{method:'PUT',body:existingDoc});
  for(const room of draft.document.rooms) for(const id of room.photos){
    const f=draft.files.find(f=>f.id===id);if(!f)throw new Error('A report photo is missing from this device. Remove it or add it again.');if(f.remoteId)continue;
    notice('Uploading report photos… Keep this page open.');
    const form=new FormData();form.append('photo',f.blob,f.name||'photo.jpg');form.append('source',f.source);
    const a=await api(`/reports/${draft.serverId}/photos`,{method:'POST',body:form});f.remoteId=a.id;await persist();
  }
  const doc={...draft.document,rooms:draft.document.rooms.map(r=>({...r,photos:r.photos.map(id=>draft.files.find(f=>f.id===id)?.remoteId).filter(Boolean)}))};
  await api(`/reports/${draft.serverId}`,{method:'PUT',body:doc});await persist();
}
function reportPreview(){
  updateHeader();setActiveNav('current');const d=draft.document;
  $('app').innerHTML=`<div class="row spread"><small class="eyebrow">${draft.finalizedAt?'Finalized report':'Your report preview'}</small>${!draft.finalizedAt?'<button class="quiet" id="edit">← Edit</button>':''}</div><article class="card"><small>MARKETEL INSPECT</small><h1>${esc(d.propertyName)||'Your property'}</h1><p class="muted">${esc(d.type)} · ${esc(d.date)} · ${esc(d.author)||'Author not entered'}</p>${d.rooms.map(r=>`<section><h2>${esc(r.name)}${r.issue?' · Issue noted':''}</h2><p class="report-note">${esc(r.observation)||'No observation recorded.'}</p>${r.photos.map(id=>`<img class="report-photo" src="${esc(photoURL(id))}" alt="Recorded room condition"><small>${draft.files.find(f=>f.id===id)?.source==='camera'?'Camera capture':'Imported photo'}</small>`).join('')}</section>`).join('')}<p><small>Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.</small></p></article><div class="actions row">${draft.finalizedAt?'<button id="pdf">Download PDF</button><button id="share" class="secondary">Create private share link</button><button id="revoke" class="quiet">Revoke link</button>':'<button id="finalize">Save & export my report →</button>'}</div><p class="muted">${draft.finalizedAt?'This version cannot change. Create a new report for corrections.':'Finalizing freezes this version. Your first report includes PDF export and a revocable share link, free.'}</p>`;
  if($('edit'))$('edit').onclick=()=>{preview=false;editor();};
  if($('finalize'))$('finalize').onclick=()=>ensureAuth(()=>run(async()=>{
    await refresh();if(!account.freeAvailable&&(!account.active||!account.remaining))return offer();
    if(!draft.document.author.trim())throw new Error('Add your name in the editor before finalizing.');
    await save();const r=await api(`/reports/${draft.serverId}/finalize`,{method:'POST'});draft.finalizedAt=r.finalizedAt;await persist();await refresh();reportPreview();notice('Your report is ready. Download the PDF or create a private link.');
  }));
  if($('pdf'))$('pdf').onclick=()=>run(async()=>{
    if(native){window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectExportPDF',reportId:draft.serverId,token:session});return;}
    const blob=await api(`/reports/${draft.serverId}/pdf`,{blob:true});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='inspection-report.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  });
  if($('share'))$('share').onclick=()=>run(async()=>{const r=await api(`/reports/${draft.serverId}/share`,{method:'POST'});modal(`<h2>Private report link</h2><p>Anyone with this link can read and download this version. Creating a new link replaces the previous one.</p><input id="share-url" readonly value="${esc(r.url)}"><button id="copy-link">Copy link</button>`);$('copy-link').onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(r.url);}catch{$('share-url').select();document.execCommand('copy');}notice('Link copied.');});});
  if($('revoke'))$('revoke').onclick=()=>run(async()=>{await api(`/reports/${draft.serverId}/share`,{method:'DELETE'});notice('Shared link revoked.');});
}
function rewrite(index){ensureAuth(()=>run(async()=>{
  await save();const original=draft.document.rooms[index].observation;
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
  modal(`<h2>Ready for the next property?</h2><div class="price">$29 <small>/month</small></div><p>30 reports per billing period · One operator<br>Up to 100 photos per report<br>10 optional wording suggestions per report</p><button id="buy" class="wide">Continue with Inspect — $29/month</button><p><small>$29 charged today, then monthly until cancelled. Cancel renewal anytime. Existing finalized reports remain available. <a href="https://bookmarketel.com/inspect/terms.html">Inspect terms</a></small></p>`);
  $('buy').onclick=()=>run(async()=>{const r=await api('/checkout',{method:'POST',body:{native}});openExternal(r.url);});
}
function openExternal(url){if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'openBrowser',url});else location.assign(url);}
async function list(page='reports',append=false){
  if(!account)return ensureAuth(()=>run(()=>list(page)));
  updateHeader();setActiveNav(page);
  if(page==='properties'){
    const names=(await api('/properties')).properties;
    $('app').innerHTML=`<h1>Properties</h1><p class="muted">Properties appear here when you save a report. No booking setup required.</p>${names.map((n,i)=>`<section class="card row spread"><strong>${esc(n)}</strong><button class="secondary" data-property="${i}">New report</button></section>`).join('')}`;
    document.querySelectorAll('[data-property]').forEach(b=>b.onclick=()=>start(names[Number(b.dataset.property)]));return;
  }
  const pageResult=await api(`/reports?take=50${append&&nextReportCursor?`&cursor=${encodeURIComponent(nextReportCursor)}`:''}`);
  reports=append?reports.concat(pageResult.reports):pageResult.reports;nextReportCursor=pageResult.nextCursor;
  $('app').innerHTML=`<h1>Your reports</h1><p class="muted">${account.freeAvailable?'Your first complete report is free.':account.active?`${account.remaining} reports remaining this billing period.`:'Your saved reports remain available.'}</p>${reports.length?'':'<section class="card">No saved reports yet. Start your first walkthrough.</section>'}${reports.map(r=>`<section class="card row spread"><div><strong>${esc(r.document.propertyName)}</strong><p class="muted">${esc(r.document.date)} · ${r.finalizedAt?'Finalized':'Draft'}</p></div><div><button data-open="${r.id}" class="secondary">Open</button><button data-delete-report="${r.id}" class="quiet danger">Delete</button></div></section>`).join('')}${nextReportCursor?'<button id="older" class="secondary">Load older reports</button>':''}<button id="new-report">+ New report</button>${!account.active&&!account.freeAvailable&&(!native||storefront==='USA')?'<button id="plans" class="quiet">Continue with Inspect</button>':''}`;
  if($('older'))$('older').onclick=()=>run(()=>list('reports',true));
  $('new-report').onclick=()=>start();if($('plans'))$('plans').onclick=offer;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>run(async()=>{
    if(draft&&!draft.finalizedAt&&draft.serverId!==b.dataset.open&&!confirm('Replace the draft on this device? Save it online first to keep it.'))return;
    const r=await api(`/reports/${b.dataset.open}`);const next={document:r.document,serverId:r.id,finalizedAt:r.finalizedAt,files:[]};
    for(let i=0;i<r.attachments.length;i+=6){const loaded=await Promise.all(r.attachments.slice(i,i+6).map(async a=>({id:a.id,remoteId:a.id,blob:await api(`/reports/${r.id}/photos/${a.id}`,{blob:true}),source:a.source})));next.files.push(...loaded);}
    clearURLs();draft=next;
    await persist();preview=!!r.finalizedAt;editor();
  }));
  document.querySelectorAll('[data-delete-report]').forEach(b=>b.onclick=()=>{if(confirm('Permanently delete this report, its photos and shared link? This does not restore report allowance.'))run(async()=>{await api(`/reports/${b.dataset.deleteReport}`,{method:'DELETE'});if(draft?.serverId===b.dataset.deleteReport){draft=null;await stored('delete');clearURLs();}await list();});});
}
$('account-button').onclick=async()=>{
  if(!account)return ensureAuth(()=>draft?editor():run(()=>list()));
  await requestStorefront();
  modal(`<h2>Inspect account</h2><p>${esc(account.email)}</p><p>${account.active?`${account.remaining} reports left. ${account.cancellationScheduled?'Access ends':'Next billing period'} ${new Date(account.periodEnd).toLocaleDateString()}.`:'One complete report free. Existing reports stay available.'}</p><div class="stack"><button id="refresh">Refresh billing status</button>${(!native||storefront==='USA')?'<button id="manage" class="secondary">Manage subscription</button>':''}<button id="switch" class="secondary">Open booking Front Desk</button><button id="logout" class="quiet">Sign out of Marketel</button><button id="delete-account" class="quiet danger">Delete Inspect account</button></div><p><a href="https://bookmarketel.com/inspect/terms.html">Inspect terms & privacy</a></p>`);
  $('refresh').onclick=()=>run(async()=>{await api('/billing/refresh',{method:'POST'});await refresh();$('dialog').close();notice('Account refreshed.');});
  if($('manage'))$('manage').onclick=()=>run(async()=>openExternal((await api('/billing',{method:'POST',body:{native}})).url));
  $('switch').onclick=()=>{localStorage.setItem('marketel.product','bookings');location.assign(native?'../frontdesk/index.html?native=ios':'/frontdesk');};
  $('logout').onclick=()=>run(async()=>{await api('/auth/logout',{method:'POST'});await logout();});
  $('delete-account').onclick=()=>{if(prompt('This permanently deletes Inspect reports and photos and cancels its subscription. Booking properties are unaffected. Type DELETE to confirm.')==='DELETE')run(async()=>{await api('/account',{method:'DELETE',body:{confirm:'DELETE'}});await logout();});};
};
async function logout(){session='';account=null;draft=null;clearURLs();localStorage.removeItem('inspect.session');localStorage.removeItem('marketel.product');await stored('delete');if(native)window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectSignOut'});$('dialog').close();landing();}
$('nav').onclick=e=>{const page=e.target.closest('[data-page]')?.dataset.page;if(!page)return;if(page==='new')start();else if(page==='current')editor();else run(()=>list(page));};
$('dialog').addEventListener('close',()=>syncNativeInspectState(currentPage,true));
$('product-switch').onclick=event=>{if(!native)return;event.preventDefault();location.assign('../index.html?choose=1');};
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="http"]');if(native&&link){event.preventDefault();openExternal(link.href);}});
window.marketelInspectStorefront=country=>{storefront=country;const waiters=storefrontWaiters;storefrontWaiters=[];waiters.forEach(resolve=>resolve());};
window.marketelInspectExportResult=result=>notice(result==='complete'?'PDF export complete.':result==='busy'?'Close the open screen and try exporting again.':'PDF export failed. Please retry.');
window.marketelInspectNativeSelectTab=page=>{
  if(page==='current'){if(draft)editor();else run(()=>start());return;}
  run(()=>list(page));
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
window.addEventListener('pagehide',()=>remember());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)run(async()=>{await api('/billing/refresh',{method:'POST'}).catch(()=>{});await refresh();});});
if(native){localStorage.setItem('marketel.product','inspect');showNativeKeyboardDoneButton();syncNativeInspectState('current',true);window.webkit?.messageHandlers?.marketelShell?.postMessage({type:'inspectStorefront'});}
try{draft=await stored('get');await refresh();if(draft)editor();else if(account)await list();else landing();if(new URLSearchParams(location.search).get('checkout')==='success'&&session){await api('/billing/refresh',{method:'POST'});await refresh();notice(account.active?'Inspect is ready. Your subscription is active.':'Payment confirmation is pending. Refresh billing status shortly.');}}catch(e){notice(e.message);if(draft)editor();else landing();}
