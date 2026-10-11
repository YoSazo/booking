'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

const source = path.resolve(__dirname, '../..');
const files = ['guest-lodge-backend/public/inspect/inspect.js', 'guest-lodge-backend/public/inspect/inspect.css',
  'marketel-frontdesk-ios/www/inspect/inspect.js', 'marketel-frontdesk-ios/www/inspect/inspect.css', 'guest-lodge-backend/wedges/claims.js', 'guest-lodge-backend/public/inspect/index.html',
  'guest-lodge-backend/public/inspect/terms.html', 'guest-lodge-backend/public/inspect/wedges.js',
  'marketel-frontdesk-ios/www/inspect/index.html', 'marketel-frontdesk-ios/www/inspect/terms.html',
  'marketel-frontdesk-ios/www/inspect/wedges.js', 'marketel-frontdesk-ios/www/index.html'];
const snapshot = root => files.map(file => fs.readFileSync(path.join(root, file)));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marketel-claims-reset-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('marketel-claims-reset-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const backendRoot = path.join(root, 'guest-lodge-backend');
  fs.mkdirSync(path.join(backendRoot, 'scripts'), { recursive: true });
  fs.cpSync(path.join(source, 'wedges'), path.join(backendRoot, 'wedges'), { recursive: true });
  fs.copyFileSync(path.join(source, 'scripts/wedges-build.js'), path.join(backendRoot, 'scripts/wedges-build.js'));
  for (const file of files.filter(file => !file.endsWith('wedges/claims.js'))) {
    const dest = path.join(root, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.resolve(source, '..', file), dest);
  }
  return { root, backendRoot };
}

module.exports = { fixture, snapshot };
