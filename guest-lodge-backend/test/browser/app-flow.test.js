'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report, wait } = require('./harness');

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
