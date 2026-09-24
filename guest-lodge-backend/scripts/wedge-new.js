'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { load } = require('../wedges/registry');
const id = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(id || '')) throw new Error('Usage: npm run wedge:new -- <lowercase-id>');
const { byId, byType } = load({ fixture: true });
if (byId[id] || byType[id] || fs.existsSync(path.join(__dirname, '../wedges', `${id}.js`))) throw new Error(`${id} already exists`);
const template = structuredClone(require('../wedges/moveout'));
const oldTypes = Object.keys(template.types);
const reportType = `${id}-report`, baselineType = `${id}-baseline`;
template.id = id;
template.product = 'TODO Product';
template.webTitle = `Marketel TODO Product — TODO promise`;
template.status = 'draft';
template.chooser = 'TODO one-line job';
template.termsIntro = 'TODO plain-language scope and limits';
template.listTypes = [reportType];
template.types = { [reportType]: template.types[oldTypes[0]], [baselineType]: template.types[oldTypes[1]] };
template.types[reportType].can.baseline = baselineType;
for (const [type, config] of Object.entries(template.types)) {
  config.brand = 'MARKETEL TODO PRODUCT';
  config.label = type === reportType ? 'TODO report' : 'TODO baseline record';
  config.eyebrow = `New ${config.label.toLowerCase()}`;
  config.disclaimer = 'TODO factual scope and limits';
  config.file = `${type}.pdf`;
  config.voiceInstruction = 'You format a spoken note. ${SHARED_VOICE_RULES} TODO product-specific boundaries. Return the required JSON only.';
  if (config.can.deadline) config.can.deadline = { text: 'TODO deadline guidance, or remove this capability' };
}
template.skin = { ...template.skin, product: 'TODO Product', home: `/${id}`, terms: `https://bookmarketel.com/${id}/terms`, termsLabel: 'TODO terms', documentLabel: 'MARKETEL TODO PRODUCT', navCreate: '+ New TODO report', listHeading: 'Your TODO reports', placesLede: 'TODO why saved places matter', emptyList: 'TODO first action' };
template.landing = { ...template.landing, type: reportType, title: 'TODO headline', lede: 'TODO one clear job', demoSaid: 'TODO spoken example', demoNote: 'TODO neutral result' };
template.landing.golden = { ...template.landing.golden, headline: 'TODO headline', sub: 'TODO subheading', cta: 'TODO call to action', proof: 'TODO honest proof', jobTitle: 'TODO first question' };
template.demo = { ...template.demo, heading: 'TODO demo', findings: template.demo.findings.map((finding, i) => ({ ...finding, photo: `${id}-${['one','two','three'][i]}`, label: `TODO finding ${i+1}`, said: 'TODO spoken description', note: 'TODO neutral note' })) };
template.appStore = { captions: ['TODO camera caption', 'TODO preview caption', 'TODO send caption', 'TODO link caption'] };
template.copy = { nouns: ['TODO noun'], forbidden: ['Claims', 'Incident', 'Inspect', 'damage', 'guest', 'check-in'] };
const file = path.join(__dirname, '../wedges', `${id}.js`);
fs.writeFileSync(file, `'use strict';\nmodule.exports = ${JSON.stringify(template, null, 2)};\n`);
(async () => {
  const sample = path.join(__dirname, '../public/inspect/sample');
  for (const [index, source] of ['inspect-carpet.jpg', 'inspect-wall.jpg', 'inspect-grout.jpg'].entries()) {
    const name = `${id}-${['one','two','three'][index]}`;
    await sharp(path.join(sample, source)).resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 65 }).toFile(path.join(sample, `${name}.jpg`));
    await sharp(path.join(sample, source)).resize({ width: 280, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(path.join(sample, `${name}-thumb.jpg`));
  }
  console.log(`Created wedges/${id}.js and six sample image placeholders. Replace TODO copy and photos, then run npm run wedges:build and npm run wedge:check -- ${id}.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
