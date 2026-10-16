'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('../wedges/registry');

const root = path.resolve(__dirname, '..');
const ios = path.resolve(root, '../marketel-frontdesk-ios/www');
const web = path.join(root, 'public/inspect');
const { all, live } = load();
const data = Object.fromEntries(all.map(item => [item.id, item]));
const generated = `// Generated from guest-lodge-backend/wedges/*.js. Run npm run wedges:build.\nwindow.MARKETEL_WEDGES = ${JSON.stringify(data, null, 2)};\n`;

const files = [path.join(web, 'wedges.js'), path.join(ios, 'inspect/wedges.js')];
// What the iPhone app's menu offers. Since 2026-10-15 it is Marketel Trace in
// place of Claims: Claims stays live on the web and on /funnel, and its emailed
// sign-in links still open it in the app, but the menu no longer offers it.
// Trace is its own page (trace-web), not a report wedge, so it is listed here.
const APP_MENU = [{ id: 'trace', product: 'Trace', chooser: 'Trace any picture onto paper.' }];
void live;
const choice = APP_MENU.map(item => `      <button class="choice" data-product="${item.id}"><span><strong>${item.product}</strong><small>${item.chooser}</small></span><span class="arrow" aria-hidden="true">→</span></button>`).join('\n') + '\n      <p class="soon">More tools coming soon.</p>\n      ';
// Marketel Trace ships inside the app as a copy of trace-web.
const traceSource = path.join(root, 'trace-web');
const traceTarget = path.join(ios, 'trace');
const listFiles = (base, dir = base) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? listFiles(base, path.join(dir, entry.name)) : [path.relative(base, path.join(dir, entry.name))]).sort();
const traceFiles = base => listFiles(base);
const chooserPath = path.join(ios, 'index.html');
let chooser = fs.readFileSync(chooserPath, 'utf8');
const replace = (source, start, end, value) => {
  const pattern = new RegExp(`(${start})[\\s\\S]*?(${end})`);
  if (!pattern.test(source)) throw new Error(`Missing generated section ${start}`);
  return source.replace(pattern, (_, open, close) => open + value + close);
};
chooser = replace(chooser, '<!-- WEDGE_CHOICES_START -->', '<!-- WEDGE_CHOICES_END -->', '\n' + choice);
chooser = replace(chooser, '/\\* WEDGE_PRODUCTS_START \\*/', '/\\* WEDGE_PRODUCTS_END \\*/', ` ${JSON.stringify(all.map(item => item.id))} `);
chooser = replace(chooser, '/\\* WEDGE_NAMES_START \\*/', '/\\* WEDGE_NAMES_END \\*/', ` ${JSON.stringify(Object.fromEntries(all.map(item => [item.id, item.product])))} `);

if (process.argv.includes('--check')) {
  for (const file of files) if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== generated) throw new Error(`${file} is stale; run npm run wedges:build`);
  if (fs.readFileSync(chooserPath, 'utf8') !== chooser) throw new Error('App chooser is stale; run npm run wedges:build');
  const shipped = fs.existsSync(traceTarget) ? traceFiles(traceTarget) : [];
  if (JSON.stringify(shipped) !== JSON.stringify(traceFiles(traceSource))) throw new Error('App copy of Marketel Trace is stale; run npm run wedges:build');
  for (const file of traceFiles(traceSource)) {
    if (!fs.readFileSync(path.join(traceSource, file)).equals(fs.readFileSync(path.join(traceTarget, file)))) throw new Error(`App copy of trace/${file} is stale; run npm run wedges:build`);
  }
  console.log('Generated wedge assets are current.');
} else {
  for (const file of files) fs.writeFileSync(file, generated);
  fs.writeFileSync(chooserPath, chooser);
  fs.rmSync(traceTarget, { recursive: true, force: true });
  for (const file of traceFiles(traceSource)) {
    fs.mkdirSync(path.dirname(path.join(traceTarget, file)), { recursive: true });
    fs.copyFileSync(path.join(traceSource, file), path.join(traceTarget, file));
  }
  console.log('Generated wedge data, app chooser and the app copy of Marketel Trace.');
}
