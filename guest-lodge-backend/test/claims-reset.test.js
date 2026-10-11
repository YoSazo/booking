'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { resetClaimsLaunch, parseArgs } = require('../scripts/claims-reset');

const { fixture, snapshot } = require('./helpers/claims-reset-fixture');
function generated(backendRoot) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(backendRoot, 'public/inspect/wedges.js'), 'utf8'), context);
  return context.window.MARKETEL_WEDGES.claims;
}

test('reset reopens an expired $49 offer for 48 hours and synchronizes terms, mirrors and cache versions', t => {
  const { root, backendRoot } = fixture(t);
  const now = Date.parse('2030-01-10T12:00:00Z');
  const original = require(path.join(backendRoot, 'wedges/claims.js'));
  assert.ok(Date.parse(original.offer.launch.until) < now, 'the original offer has expired');
  const version = Number(fs.readFileSync(path.join(backendRoot, 'public/inspect/index.html'), 'utf8').match(/\?v=(\d+)/)[1]);
  const result = resetClaimsLaunch({ backendRoot, now });
  assert.equal(result.hours, 48);
  assert.equal(result.until, '2030-01-12T12:00:00Z');
  const claims = generated(backendRoot);
  assert.equal(claims.offer.launch.price, 49);
  assert.equal(claims.offer.lifetime, 199);
  assert.equal(claims.offer.launch.until, result.until);
  assert.ok(claims.termsIntro.includes(result.deadline));
  for (const name of ['index.html', 'terms.html', 'wedges.js']) {
    assert.deepEqual(fs.readFileSync(path.join(backendRoot, 'public/inspect', name)), fs.readFileSync(path.join(root, 'marketel-frontdesk-ios/www/inspect', name)));
  }
  const terms = fs.readFileSync(path.join(backendRoot, 'public/inspect/terms.html'), 'utf8');
  assert.ok(terms.includes(`$49 USD at its launch price until ${result.deadline}`));
  assert.match(terms, /3-day money-back guarantee/);
  assert.ok(!terms.includes('October 13, 2026'));
  const index = fs.readFileSync(path.join(backendRoot, 'public/inspect/index.html'), 'utf8');
  assert.deepEqual([...index.matchAll(/\?v=(\d+)/g)].map(match => Number(match[1])), [version + 1, version + 1, version + 1]);
  // Running it later creates another real deadline instead of retaining cached data.
  const next = resetClaimsLaunch({ backendRoot, now: Date.parse('2030-03-01T12:00:00Z') });
  assert.equal(next.until, '2030-03-03T12:00:00Z');
  assert.equal(generated(backendRoot).offer.launch.until, next.until);
});

test('custom durations and Pacific daylight-saving time produce the same deadline in the terms', t => {
  const { backendRoot } = fixture(t);
  const result = resetClaimsLaunch({ backendRoot, now: Date.parse('2030-07-01T12:00:10Z'), hours: 24 });
  assert.equal(result.until, '2030-07-02T12:01:00Z');
  assert.equal(result.deadline, '5:01 AM Pacific on July 2, 2030');
});

test('dry run and invalid durations never alter the offer files', t => {
  const { root, backendRoot } = fixture(t);
  const before = snapshot(root);
  assert.equal(resetClaimsLaunch({ backendRoot, dryRun: true }).hours, 48);
  assert.deepEqual(snapshot(root), before);
  for (const hours of [0, -1, 1.5, NaN, Infinity, 8761]) assert.throws(() => resetClaimsLaunch({ backendRoot, hours }), /--hours/);
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(parseArgs(['--hours', '24', '--dry-run']), { hours: 24, dryRun: true });
  assert.throws(() => parseArgs(['--push']), /Unknown argument/);
});

test('a failed rebuild rolls back the manifest, terms, asset versions and partially generated data', t => {
  const { root, backendRoot } = fixture(t);
  const before = snapshot(root);
  fs.writeFileSync(path.join(backendRoot, 'scripts/wedges-build.js'), "require('node:fs').writeFileSync(require('node:path').join(__dirname, '../public/inspect/wedges.js'), 'partial'); throw new Error('Fixture build failure');");
  assert.throws(() => resetClaimsLaunch({ backendRoot }), /All changes were restored/);
  assert.deepEqual(snapshot(root), before);
});
