const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const handler = server.slice(server.indexOf('function serveFrontdesk('), server.indexOf('\nfunction marketelFrontdeskOrigin('));
function renderFrontdesk({ production = false, fallback = false } = {}) {
  const headers = {};
  let html;
  const context = {
    fs: { ...fs, existsSync: file => fallback && file.endsWith('/public/frontdesk/index.html') ? false : fs.existsSync(file) },
    FRONTDESK_BUILT: path.join(root, 'public/frontdesk/index.html'),
    FRONTDESK_LEGACY: path.join(root, 'simple-crm.html'),
    cachedFrontdeskHtml: '', process: { env: { NODE_ENV: production ? 'production' : 'development' } },
  };
  vm.createContext(context); vm.runInContext(handler, context);
  const res = { setHeader: (key, value) => { headers[key] = value; }, type() { return this; },
    send: value => { html = value; }, sendFile: () => { throw new Error('Unexpected HTML read failure'); } };
  context.serveFrontdesk({}, res);
  if (production) context.serveFrontdesk({}, res);
  return { html, headers };
}
for (const options of [{}, { production: true }, { fallback: true }]) {
  test(`Front Desk preserves module identity (${JSON.stringify(options)})`, () => {
    const { html, headers } = renderFrontdesk(options);
    const entry = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)[1];
    const entryUrl = new URL(entry, 'https://bookmarketel.com');
    // Query suffixes create a second entry instance when a lazy chunk imports
    // the same file by its canonical URL, rerunning boot and resetting the tab.
    assert.equal(entryUrl.search, '');
    assert.match(entryUrl.pathname, /\/assets\/index-[\w-]+\.js$/);
    assert.equal(headers['Cache-Control'], 'no-cache');
    for (const match of html.matchAll(/(?:src|href)="(\/frontdesk\/assets\/[^\"]+)"/g)) {
      const url = new URL(match[1], entryUrl);
      assert.equal(url.search, '');
      assert.ok(fs.existsSync(path.join(root, 'public', url.pathname)), `Missing asset: ${url.pathname}`);
    }
    const entryName = path.basename(entryUrl.pathname);
    const files = fs.readdirSync(path.join(root, 'public/frontdesk/assets')).filter(file => file.endsWith('.js'));
    for (const file of files) {
      const source = fs.readFileSync(path.join(root, 'public/frontdesk/assets', file), 'utf8');
      for (const match of source.matchAll(/from["'](\.\/[^"']+\.js)["']/g)) {
        if (path.basename(match[1]) !== entryName) continue;
        assert.equal(new URL(match[1], new URL(`/frontdesk/assets/${file}`, entryUrl)).href, entryUrl.href);
      }
    }
  });
}
