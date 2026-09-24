import fs from 'fs';
const API = 'https://bookmarketel.com/api/inspect';
// Production walk of App Review's path with the review account. Run by hand:
//   INSPECT_REVIEW_EMAIL=… INSPECT_REVIEW_CODE=… node test/browser/review-walk.mjs
// It deletes everything it creates. Taken times are set from the server's
// upload time, because a local clock running fast makes them future and dropped. Uses one report credit (topped up to 25 at sign-in).
const signin = await (await fetch(API + '/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.INSPECT_REVIEW_EMAIL, code: process.env.INSPECT_REVIEW_CODE }) })).json();
if (!signin.token) { console.log('Review sign-in failed:', signin.error || signin); process.exit(1); }
const { token } = signin;
const H = { Authorization: `Bearer ${token}` };
const out = [];
const step = (name, ok, detail = '') => { out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const call = async (path, opts = {}) => {
  const r = await fetch(API + path, { ...opts, headers: { ...H, ...(opts.json ? { 'content-type': 'application/json' } : {}), ...opts.headers }, body: opts.json ? JSON.stringify(opts.json) : opts.body });
  const type = r.headers.get('content-type') || '';
  const body = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, type, body };
};
const jpeg = fs.readFileSync(new URL('../../public/inspect/sample/claims-wall-thumb.jpg', import.meta.url));
// Property deletion removes every report under the same name. Isolate each
// production walk so cleanup cannot touch a previous walk or a real report.
const propertyName = `Review Walkthrough ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const photo = async (id, kind) => { const f = new FormData(); f.append('photo', new Blob([jpeg], { type: 'image/jpeg' }), 'photo.jpg'); f.append('source', 'camera'); f.append('takenAt', new Date().toISOString()); f.append('zone', 'America/Chicago'); if (kind) f.append('kind', kind); return call(`/reports/${id}/photos`, { method: 'POST', body: f }); };
const today = new Date().toISOString().slice(0, 10);
const doc = (type, photos = [], extra = {}) => ({ propertyName, type, date: today, author: 'App Review', rooms: [{ name: 'Bathroom', observation: type === 'check-in' ? '' : 'Toilet paper holder torn off the wall.', issue: false, photos }], signatures: [], ...extra });
const made = [];
try {
  const acct = await call('/account'); step('signed in as the review account', acct.status === 200 && acct.body.credits >= 1, `credits ${acct.body.credits}`);
  const prop = await call('/properties', { method: 'POST', json: { name: propertyName } }); step('add a property', prop.status === 200, String(prop.status));
  // Check-in first, so the damage report has a "before".
  const ci = await call('/reports', { method: 'POST', json: doc('check-in') }); made.push(ci.body.id); step('start a check-in', ci.status === 200, String(ci.status));
  const cp = await photo(ci.body.id); step('upload a check-in photo', cp.status === 200, String(cp.status));
  await call(`/reports/${ci.body.id}`, { method: 'PUT', json: doc('check-in', [cp.body.id]) });
  const cf = await call(`/reports/${ci.body.id}/finalize`, { method: 'POST' }); step('save the check-in (free)', cf.status === 200 && !!cf.body.finalizedAt, String(cf.status));
  // Damage report.
  const dr = await call('/reports', { method: 'POST', json: { ...doc('damage'), baselineReportId: ci.body.id } }); made.push(dr.body.id); step('start a damage report linked to the check-in', dr.status === 200, `${dr.status} baseline ${dr.body.baselineReportId || 'none'}`);
  const dp = await photo(dr.body.id); step('upload a damage photo', dp.status === 200, String(dp.status));
  const rp = await photo(dr.body.id, 'receipt'); step('upload a receipt', rp.status === 200, String(rp.status));
  const put = await call(`/reports/${dr.body.id}`, { method: 'PUT', json: doc('damage', [dp.body.id], { checkoutDate: today, photoTimes: { [dp.body.id]: { takenAt: new Date(Date.parse(dp.body.createdAt) - 60000).toISOString(), zone: 'America/Chicago' } }, rooms: [{ name: 'Bathroom', observation: 'Toilet paper holder torn off the wall.', issue: false, photos: [dp.body.id], receipts: [rp.body.id] }] }) });
  step('save the report online', put.status === 200, put.status === 200 ? '' : JSON.stringify(put.body));
  const pol = await call(`/reports/${dr.body.id}/rewrite`, { method: 'POST', json: { observation: 'holder ripped off wall left side gone' } }); step('Polish typed note (OpenAI)', pol.status === 200 && !!pol.body.suggestion, pol.body.suggestion || JSON.stringify(pol.body));
  const fin = await call(`/reports/${dr.body.id}/finalize`, { method: 'POST' }); step('send it using a credit, no purchase', fin.status === 200 && !!fin.body.finalizedAt, fin.status === 200 ? '' : JSON.stringify(fin.body));
  const after = await call('/account'); step('a credit was used', after.body.credits === acct.body.credits - 1, `${acct.body.credits} → ${after.body.credits}`);
  const sh = await call(`/reports/${dr.body.id}/share`, { method: 'POST' }); step('create a private link', sh.status === 200 && /\/shared\//.test(sh.body.url), sh.body.url ? 'ok' : JSON.stringify(sh.body));
  const page = await fetch(sh.body.url); const html = await page.text();
  step('the link opens the report', page.status === 200 && html.includes(propertyName), String(page.status));
  step('with dated photo captions', /Taken [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2}/.test(html));
  step('the check-in shown as the before', /Before · check-in/.test(html));
  step('and receipts under their own heading', /Receipts &amp; estimates|Receipts & estimates/.test(html));
  const shotMatch = html.match(/src="([^"]+)"/g) || [];
  const pdf = await call(`/reports/${dr.body.id}/pdf`); step('download the PDF', pdf.status === 200 && /pdf/.test(pdf.type) && pdf.body.length > 5000, `${pdf.type} ${pdf.body.length} bytes`);
  const img = await call(`/reports/${dr.body.id}/photos/${dp.body.id}`); step('the dated photo copy loads', img.status === 200 && /image/.test(img.type), `${img.type} ${img.body.length} bytes`);
  const list = await call('/reports?types=damage'); step('it appears under Reports', list.status === 200 && list.body.reports.some(r => r.id === dr.body.id));
  const props = await call('/properties'); const row = props.body.propertyDetails.find(p => p.name === propertyName);
  step('Properties shows the last check-in and report', !!row?.latestCheckIn && row.latestType === 'damage', JSON.stringify({ checkIn: !!row?.latestCheckIn, latestType: row?.latestType }));
} catch (e) { out.push('STOPPED: ' + e.message.slice(0, 300)); }
finally {
  // Leave the account empty for the reviewer.
  const del = await call('/properties', { method: 'DELETE', json: { name: propertyName } }).catch(e => ({ status: e.message }));
  for (const id of made) await call(`/reports/${id}`, { method: 'DELETE' }).catch(() => {});
  const left = await call('/reports'); const props = await call('/properties');
  out.push(`cleanup: property delete ${del.status}; reports left ${left.body.reports?.length ?? '?'}; properties left ${props.body.properties?.length ?? '?'}`);
  console.log(out.join('\n'));
}
