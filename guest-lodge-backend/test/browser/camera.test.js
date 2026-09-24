'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report, JPEG } = require('./harness');

test('a property check-in enters native capture for that property', async () => {
  const h = await open({ native: true, properties: ['Pine Cottage'], accountData: { businessName: 'Pine Stays' } });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.evaluate(() => window.marketelInspectNativeSelectTab('properties'));
    await h.page.waitForSelector('[data-baseline]');
    await h.page.click('[data-baseline]');
    await h.page.waitForTimeout(100);
    assert.ok(h.shell.some(message => message.type === 'inspectCamera'));
    assert.match(await h.body(), /Kitchen|Check-in|Camera/i);
    h.assertClean();
  } finally { await h.close(); }
});

test('native camera keeps room chips, dated shots and the matching Before photo in reach', async () => {
  const baseline = report('check-in', { finalizedAt: new Date().toISOString(), document: {
    propertyName: 'Pine Cottage', author: '', type: 'check-in', date: '2026-09-20',
    rooms: [{ name: 'Kitchen', observation: '', issue: false, photos: ['before-1'] }], signatures: [],
    photoTimes: { 'before-1': { takenAt: '2026-09-20T15:25:00Z', zone: 'UTC' } }
  }, attachments: [{ id: 'before-1', source: 'camera', createdAt: '2026-09-20T15:26:00Z' }] });
  const h = await open({ native: true, reports: [baseline], properties: ['Pine Cottage'], accountData: { businessName: 'Pine Stays' } });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('[data-native-camera]');
    await h.page.click('[data-native-camera]');
    await h.page.waitForSelector('#hud-room');
    await h.page.fill('#hud-room', 'Kitchen');
    await h.page.click('#hud-room-form button[type="submit"]');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await h.page.waitForSelector('.camera-strip .is-before');
    assert.match(await h.page.locator('.camera-strip .is-before').innerText(), /Before/);
    assert.equal(await h.page.locator('[data-camera-room]').first().innerText(), 'Kitchen\n0');
    await h.page.click('[data-before]');
    await h.page.waitForSelector('.before-photo');
    assert.match(await h.body(), /Before · check-in Sep 20, 2026/i);
    await h.page.click('#before-back');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await h.page.evaluate(dataUrl => window.marketelInspectPhotoCaptured(JSON.stringify({ room: 0, dataUrl })), `data:image/jpeg;base64,${JPEG.toString('base64')}`);
    await h.page.waitForSelector('.camera-strip figure:not(.is-before) small');
    const shotTime = await h.page.locator('.camera-strip figure:not(.is-before) small').first().innerText();
    assert.match(shotTime, /\d{1,2}:\d{2}\s*(AM|PM)/);
    assert.match(await h.page.locator('[data-camera-room]').first().innerText(), /Kitchen\s+1/);
    await h.page.click('#hud-next');
    await h.page.waitForSelector('#hud-room');
    assert.match(await h.body(), /Which room are you in\?/);
    h.assertClean();
  } finally { await h.close(); }
});
