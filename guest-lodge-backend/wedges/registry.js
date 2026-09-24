'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ID = /^[a-z][a-z0-9-]*$/;
const STATUSES = new Set(['live', 'hidden', 'draft']);
const OFFERS = new Set(['pay-at-export', 'first-free']);
const CAPABILITIES = new Set(['issueToggle', 'receipts', 'originals', 'shareable', 'location', 'photosOnly', 'free', 'sendable', 'eventTime', 'eventWord', 'baseline', 'deadline', 'signerHint']);

function validate(manifest, filename = '') {
  const bad = message => { throw new Error(`Invalid wedge ${filename || manifest?.id || '?'}: ${message}`); };
  if (!manifest || !ID.test(manifest.id) || typeof manifest.product !== 'string' || !manifest.product.trim()) bad('id and product are required');
  if (!STATUSES.has(manifest.status)) bad('unknown status');
  if (!OFFERS.has(manifest.offer?.mode) || !Number.isInteger(manifest.offer.reportPrice) || manifest.offer.reportPrice < 0) bad('invalid offer');
  if (!Array.isArray(manifest.listTypes) || !manifest.listTypes.length || !manifest.types || typeof manifest.types !== 'object') bad('types and listTypes are required');
  if (!manifest.skin || !manifest.landing || !manifest.appStore || typeof manifest.chooser !== 'string') bad('skin, landing, appStore and chooser are required');
  if (!manifest.roleLabels || typeof manifest.roleLabels !== 'object') bad('role labels are required');
  if (manifest.id !== 'inspect' && (!manifest.webTitle || !manifest.skin.home || !manifest.skin.terms)) bad('web title, home and terms are required');
  if (!['single', 'select'].includes(manifest.selection)) bad('selection must be single or select');
  if (manifest.id !== 'inspect' && (!manifest.landing.type || !manifest.types[manifest.landing.type])) bad('landing type must exist');
  if (!Array.isArray(manifest.appStore.captions) || !manifest.copy || !Array.isArray(manifest.copy.nouns) || !Array.isArray(manifest.copy.forbidden)) bad('captions and copy rules are required');
  for (const listed of manifest.listTypes) if (!manifest.types[listed]) bad(`unknown list type ${listed}`);
  for (const [id, type] of Object.entries(manifest.types)) {
    if (!ID.test(id) || !type.label || !type.brand || !type.file || !['room', 'entry'].includes(type.unit) || !Array.isArray(type.seeds) || !type.seeds.length || !type.disclaimer) bad(`incomplete type ${id}`);
    if (!type.signers?.manager || !type.signers?.other) bad(`signers missing for ${id}`);
    if (!manifest.roleLabels[type.signers.manager] || !manifest.roleLabels[type.signers.other]) bad(`signer labels missing for ${id}`);
    if (!type.voiceInstruction || !type.eyebrow || !type.dateLabel) bad(`voice instruction, eyebrow or date label missing for ${id}`);
    if (!type.can || Object.keys(type.can).some(key => !CAPABILITIES.has(key))) bad(`unknown capability for ${id}`);
    if (type.can.baseline && !manifest.types[type.can.baseline]) bad(`baseline ${type.can.baseline} missing for ${id}`);
    if (type.can.deadline && (typeof type.can.deadline.text !== 'string' || !type.can.deadline.text.trim()
      || (type.can.deadline.days !== undefined && (!Number.isInteger(type.can.deadline.days) || type.can.deadline.days < 1 || !type.can.deadline.from || !type.can.deadline.field)))) bad(`invalid deadline for ${id}`);
    if (type.can.photosOnly && !type.can.free) bad(`photos-only baseline ${id} must be free`);
  }
  if (manifest.demo && (!Array.isArray(manifest.demo.findings) || manifest.demo.findings.length !== 3
    || manifest.demo.findings.some(finding => !finding.photo || !finding.said || !finding.note))) bad('demo needs three complete findings');
  try { JSON.stringify(manifest); } catch { bad('must be JSON serializable'); }
  return manifest;
}

function load({ fixture = false } = {}) {
  const files = fs.readdirSync(__dirname).filter(name => /^[a-z][a-z0-9-]*\.js$/.test(name) && name !== 'registry.js').sort();
  if (fixture && fs.existsSync(path.join(__dirname, '_fixture.js'))) files.push('_fixture.js');
  const all = files.map(name => validate(require(path.join(__dirname, name)), name));
  const byId = Object.fromEntries(all.map(item => [item.id, item]));
  if (Object.keys(byId).length !== all.length) throw new Error('Duplicate wedge id');
  const byType = {};
  for (const item of all) for (const [id, type] of Object.entries(item.types)) {
    if (byType[id]) throw new Error(`Duplicate report type ${id}`);
    byType[id] = { wedge: item, type };
  }
  return { all, byId, byType, live: all.filter(item => item.status === 'live') };
}

module.exports = { load, validate, CAPABILITIES };
