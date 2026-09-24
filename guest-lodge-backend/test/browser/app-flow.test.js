'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report, wait } = require('./harness');
const path = require('node:path');
const sample = name => path.join(__dirname, '../../public/inspect/sample', name);

test('saved session starts on Reports without a sign-in flash; a tap beats slow startup', async () => {
  const h = await open({ native: true, slowList: 900, slowAccount: 300, accountData: { businessName: 'Pine Stays' } });
  try {
    await h.page.waitForSelector('#new-report');
    assert.match(await h.body(), /reports/i);
    assert.doesNotMatch(await h.body(), /\bLoading…\b/);
    await h.page.click('#new-report');
    await h.page.waitForSelector('#setup-property');
    await wait(1100);
    assert.ok(await h.page.locator('#setup-property').count(), 'startup must not redraw over setup');
    assert.ok(h.shell.some(message => message.type === 'inspectState' && message.authenticated === true));
    h.assertClean();
  } finally { await h.close(); }
});

test('property add and refused delete leave an honest list', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'], refuseDelete: true });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.evaluate(() => window.marketelInspectNativeSelectTab('properties'));
    await h.page.waitForSelector('[data-delete-property]');
    assert.match(await h.body(), /Pine Cottage/);
    await h.page.locator('[data-delete-property]').first().click();
    await h.page.waitForSelector('#flow-confirm');
    await h.page.click('#flow-confirm');
    await h.page.waitForSelector('.property-row:not(.is-leaving)');
    assert.match(await h.body(), /Could not delete property/);
    assert.match(await h.body(), /Pine Cottage/);
    h.assertClean();
  } finally { await h.close(); }
});

test('paying in the native app hands off to the default browser', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' } });
  try {
    await h.page.waitForSelector('#plans');
    await h.page.click('#plans');
    await h.page.waitForSelector('#buy');
    await h.page.click('#buy');
    await h.page.waitForTimeout(100);
    assert.ok(h.shell.some(message => message.type === 'openPurchase' && /checkout\.stripe\.com/.test(message.url)));
    assert.equal(h.purchases[0]?.tool, 'claims');
    h.assertClean();
  } finally { await h.close(); }
});

test('finalized report stays under Reports and its PDF reaches the native share sheet', async () => {
  const saved = report('damage', { finalizedAt: new Date().toISOString(), document: { propertyName: 'Pine Cottage', author: 'A. Host', type: 'damage', date: '2026-09-23', rooms: [{ name: 'Kitchen', observation: 'Cabinet hinge broken.', issue: false, photos: [] }], signatures: [] } });
  const h = await open({ native: true, reports: [saved], accountData: { businessName: 'Pine Stays', active: true, remaining: 300 } });
  try {
    await h.page.waitForSelector('[data-open]');
    await h.page.click('[data-open]');
    await h.page.waitForSelector('#pdf');
    await h.page.click('#pdf');
    assert.ok(h.shell.some(message => message.type === 'inspectExportPDF' && message.reportId === saved.id));
    await h.page.evaluate(() => window.marketelInspectNativeSelectTab('reports'));
    assert.match(await h.body(), /Pine Cottage/);
    h.assertClean();
  } finally { await h.close(); }
});

test('refused report delete restores the row', async () => {
  const saved = report('damage', { finalizedAt: new Date().toISOString() });
  const h = await open({ native: true, reports: [saved], refuseDelete: true });
  try {
    await h.page.waitForSelector('[data-delete-report]');
    await h.page.click('[data-delete-report]');
    await h.page.waitForSelector('#flow-confirm');
    await h.page.click('#flow-confirm');
    await h.page.waitForSelector('.report-row:not(.is-leaving)');
    assert.match(await h.body(), /Could not delete report/);
    assert.match(await h.body(), /Pine Cottage/);
    h.assertClean();
  } finally { await h.close(); }
});

test('polish can be declined or applied without losing the original note', async () => {
  const h = await open({ accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('.write-own');
    await h.page.click('.write-own summary');
    await h.page.fill('[data-field="observation"]', 'A mark by the door.');
    await h.page.click('[data-ai]');
    await h.page.waitForSelector('#keep-ai');
    await h.page.click('#keep-ai');
    assert.equal(await h.page.inputValue('[data-field="observation"]'), 'A mark by the door.');
    await h.page.click('[data-ai]');
    await h.page.waitForSelector('#accept-ai');
    await h.page.click('#accept-ai');
    assert.equal(await h.page.inputValue('[data-field="observation"]'), 'The fixture wording.');
    assert.match(await h.body(), /Note updated/);
    h.assertClean();
  } finally { await h.close(); }
});

test('Claims uploads while editing, computes the filing date, sends dated photos, and starts fresh', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays', active: true, remaining: 5 },
    properties: ['Pine Cottage'], sentPhoto: sample('claims-carpet-thumb.jpg') });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('[data-files]', { state: 'attached' });
    await h.page.click('#to-details');
    await h.page.fill('#checkout-date', '2026-09-25');
    await h.page.click('#to-rooms');
    await h.page.setInputFiles('[data-files]', sample('claims-wall-thumb.jpg'));
    await h.page.waitForSelector('[data-photo-id] figcaption');
    await h.page.waitForFunction(() => [...document.querySelectorAll('[data-photo-id] figcaption')].some(el => el.textContent.includes('Saved')));
    assert.equal(h.data.photoCount, 1, 'photo uploads before Send');
    const beforeBytes = await h.page.locator('[data-photo-id] img').first().evaluate(async image => (await (await fetch(image.src)).blob()).size);
    await h.page.click('#preview');
    await h.page.waitForSelector('#send-report');
    await h.page.click('#send-report');
    await h.page.waitForSelector('#delivery-share');
    assert.match(await h.page.locator('.deadline').innerText(), /File by Oct 9 — 14 days after check-out/);
    assert.equal(h.data.photoCount, 1, 'Send reuses the background upload');
    await h.page.waitForFunction(size => { const image = document.querySelector('.report-photo'); return image && image.complete && image.naturalWidth && image.src.startsWith('blob:') && fetch(image.src).then(r => r.blob()).then(blob => blob.size === size); }, require('node:fs').statSync(sample('claims-carpet-thumb.jpg')).size);
    const afterBytes = await h.page.locator('.report-photo').first().evaluate(async image => (await (await fetch(image.src)).blob()).size);
    assert.notEqual(afterBytes, beforeBytes, 'sent report adopts the server display copy');
    await h.page.click('#delivery-share');
    await h.page.waitForSelector('#copy-link');
    await h.page.evaluate(() => { document.execCommand = () => true; });
    await h.page.click('#copy-link');
    await h.page.waitForSelector('#copy-link.is-done');
    assert.equal(await h.page.locator('#copy-link').innerText(), 'Copied ✓');
    assert.ok(h.shell.some(message => message.type === 'inspectHaptic' && message.style === 'success'));
    const noticeAbove = await h.page.evaluate(() => {
      let popover = false;
      try { popover = document.querySelector('#notice').matches(':popover-open'); } catch {}
      return popover || !!document.querySelector('#dialog .toast.in-sheet');
    });
    assert.ok(noticeAbove, 'copy confirmation is visible over the open share sheet');
    await h.page.click('#dialog-close');
    await h.page.click('#another-report');
    await h.page.waitForSelector('#setup-property');
    assert.equal(await h.page.inputValue('#setup-property'), '', 'new report starts with a fresh property');
    await h.page.click('#flow-cancel');
    await h.page.waitForSelector('#pdf');
    assert.ok(await h.page.locator('.report-photo').count(), 'closing setup returns to sent report with its photo');
    h.assertClean();
  } finally { await h.close(); }
});

test('a dead photo blob repairs from storage and a slow tap has feedback without focus', async () => {
  const h = await open({ native: true, slowRewrite: 700, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    const pressed = await h.page.evaluate(() => {
      const button = document.querySelector('#new-report');
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      return button.classList.contains('is-pressed') && getComputedStyle(button).transform !== 'none';
    });
    assert.ok(pressed, 'pointerdown dips the button');
    await h.page.evaluate(() => document.querySelector('#new-report').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })));
    await h.page.waitForFunction(() => !document.querySelector('#new-report').classList.contains('is-pressed'));
    await h.page.click('#new-report');
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('[data-files]', { state: 'attached' });
    await h.page.setInputFiles('[data-files]', sample('claims-wall-thumb.jpg'));
    await h.page.waitForSelector('[data-photo-id] img');
    const id = await h.page.locator('[data-photo-id]').first().getAttribute('data-photo-id');
    await h.page.locator('[data-photo-id] img').first().evaluate(image => { image.src = 'blob:http://app.test/dead-photo'; });
    await h.page.waitForFunction(photoId => { const image = document.querySelector(`img[data-photo="${photoId}"]`); return image && image.complete && image.naturalWidth > 0 && image.src !== 'blob:http://app.test/dead-photo'; }, id);
    await h.page.click('.write-own summary');
    await h.page.fill('[data-field="observation"]', 'Scuff beside the door.');
    await h.page.click('[data-ai]');
    await h.page.waitForSelector('[data-ai].is-busy');
    const busy = await h.page.locator('[data-ai]').evaluate(button => ({ focused: document.activeElement === button, disabled: button.disabled, spinner: getComputedStyle(button, '::after').content }));
    assert.deepEqual(busy, { focused: false, disabled: true, spinner: '""' });
    await h.page.waitForSelector('#keep-ai');
    h.assertClean();
  } finally { await h.close(); }
});

test('a saved signature is one tap on the next report', async () => {
  const saved = report('damage', { document: { propertyName: 'Pine Cottage', author: '', type: 'damage', date: '2026-09-24',
    rooms: [{ name: 'Kitchen', observation: 'Cabinet hinge damaged.', issue: false, photos: [] }], signatures: [] } });
  const h = await open({ native: true, reports: [saved], accountData: { active: true, remaining: 5 } });
  try {
    await h.page.waitForSelector('[data-open]');
    await h.page.click('[data-open]');
    await h.page.waitForSelector('[data-files]', { state: 'attached' });
    await h.page.setInputFiles('[data-files]', sample('claims-wall-thumb.jpg'));
    await h.page.waitForSelector('[data-photo-id]');
    await h.page.click('#preview');
    await h.page.waitForSelector('[data-sign="owner"]');
    await h.page.click('[data-sign="owner"]');
    await h.page.fill('#signer-name', 'Alex Host');
    const box = await h.page.locator('#signature-pad').boundingBox();
    await h.page.mouse.move(box.x + 30, box.y + 50);
    await h.page.mouse.down();
    await h.page.mouse.move(box.x + 90, box.y + 75);
    await h.page.mouse.up();
    await h.page.click('#save-signature');
    await h.page.waitForSelector('.signature-preview');
    assert.ok(await h.page.evaluate(() => !!JSON.parse(localStorage.getItem('inspect.signature') || 'null')?.strokes?.length));
    await h.page.click('#send-report');
    await h.page.waitForSelector('#delivery-pdf');
    assert.equal(await h.page.locator('#name-field').count(), 0, 'remembered signer name avoids a second prompt');
    await h.page.click('#delivery-later');
    await h.page.click('#another-report');
    await h.page.waitForSelector('#setup-business');
    await h.page.fill('#setup-business', 'Pine Stays');
    await h.page.click('#setup-next');
    await h.page.fill('#setup-property', 'Second Cottage');
    await h.page.click('#setup-build');
    await h.page.waitForSelector('#preview');
    await h.page.click('#preview');
    await h.page.waitForSelector('[data-sign-saved="owner"]');
    assert.match(await h.body(), /Sign as Alex Host/);
    await h.page.click('[data-sign-saved="owner"]');
    assert.match(await h.body(), /Signed as Alex Host/);
    assert.ok(await h.page.locator('.signature-preview').count());
    h.assertClean();
  } finally { await h.close(); }
});

test('Send asks for an unknown author inside the current report and remembers the answer', async () => {
  const saved = report('damage', { document: { propertyName: 'Pine Cottage', author: '', type: 'damage', date: '2026-09-24',
    rooms: [{ name: 'Kitchen', observation: 'A mark beside the sink.', issue: false, photos: [] }], signatures: [] } });
  const h = await open({ native: true, reports: [saved], accountData: { active: true, remaining: 5 } });
  try {
    await h.page.waitForSelector('[data-open]');
    await h.page.click('[data-open]');
    await h.page.waitForSelector('[data-files]', { state: 'attached' });
    await h.page.setInputFiles('[data-files]', sample('claims-wall-thumb.jpg'));
    await h.page.waitForSelector('[data-photo-id]');
    await h.page.click('#preview');
    await h.page.click('#send-report');
    await h.page.waitForSelector('#name-field');
    assert.ok(await h.page.locator('#dialog').evaluate(dialog => dialog.open), 'name is asked in a sheet over the report');
    assert.ok(await h.page.locator('#send-report').count(), 'the report remains behind the sheet');
    await h.page.fill('#name-field', 'Alex Host');
    await h.page.click('#name-go');
    await h.page.waitForSelector('#delivery-pdf');
    assert.equal(h.data.reports.find(row => row.id === saved.id).document.author, 'Alex Host');
    assert.equal(await h.page.evaluate(() => localStorage.getItem('inspect.author')), 'Alex Host');
    h.assertClean();
  } finally { await h.close(); }
});
