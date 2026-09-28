'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open, report, JPEG, cameraShot, cameraSay, cameraDone, newAppReport } = require('./harness');

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

// Recorded at the moment the page asks the shell for the camera, so it can be
// said what was already on screen then.
const watchCameraRequests = page => page.evaluate(() => {
  window.__cameraAsks = [];
  const shell = window.webkit.messageHandlers.marketelShell, post = shell.postMessage.bind(shell);
  shell.postMessage = message => { if (message.type === 'inspectCamera') window.__cameraAsks.push({ page: !!document.querySelector('.camera-companion'), entering: !!document.querySelector('.camera-companion.is-entering') }); return post(message); };
});

test('a new report opens the camera at once: no setup, no question, and the page is drawn before the sheet', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await watchCameraRequests(h.page);
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    assert.deepEqual(await h.page.evaluate(() => window.__cameraAsks), [{ page: true, entering: true }], 'drawn, and rising, before the sheet is asked for');
    assert.ok(h.shell.some(message => message.type === 'inspectCamera' && message.room === 0));
    const text = await h.body();
    assert.doesNotMatch(text, /Which room|Which rental|Step 1 of|business/i, 'nothing is asked first');
    assert.equal(await h.page.locator('#hud-room, #setup-property, #setup-business').count(), 0);
    assert.match(text, /What you say appears here\./);
    assert.equal(await h.page.locator('[data-camera-room]').first().innerText(), 'Finding 1\n0');
    assert.equal((await h.page.textContent('#hud-next')).trim(), '+ another');
    // The sheet arriving does not redraw the page it is arriving over.
    await h.page.evaluate(() => { window.__same = document.querySelector('.camera-companion'); window.marketelInspectCameraOpened('0'); });
    assert.equal(await h.page.evaluate(() => window.__same === document.querySelector('.camera-companion')), true);
    h.assertClean();
  } finally { await h.close(); }
});

test('"+ another" is a new finding straight away, and a shot pops into the strip without the page blinking', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await cameraShot(h.page);
    await h.page.waitForSelector('.camera-strip figure.is-fresh');
    assert.equal(await h.page.locator('.camera-companion.is-entering').count(), 0, 'only the new photo moves');
    assert.match(await h.page.locator('[data-camera-room]').first().innerText(), /Finding 1\s+1/);
    await h.page.click('#hud-next');
    assert.equal(await h.page.locator('[data-camera-room]').count(), 2);
    assert.match(await h.page.locator('[data-camera-room].is-active').innerText(), /Finding 2\s+0/);
    assert.ok(h.shell.some(message => message.type === 'inspectCameraRoom' && message.room === 1), 'the open camera is pointed at the new finding');
    await cameraShot(h.page, 1);
    await h.page.waitForSelector('.camera-strip figure.is-fresh');
    // Closing drops nothing that has a photo, and lands on the property question.
    await cameraDone(h.page);
    await h.page.waitForSelector('#property');
    assert.match(await h.body(), /Which rental property\?/);
    assert.equal((await h.page.textContent('#to-rooms')).trim(), 'Build my report →');
    h.assertClean();
  } finally { await h.close(); }
});

test('holding the shutter listens, files the words on the finding, and the mic button still works', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await h.page.evaluate(() => window.marketelInspectHold('start'));
    assert.match(await h.page.locator('.hud-note').innerText(), /Listening…/);
    assert.equal(await h.page.locator('.hud-note.is-live').count(), 1);
    await h.page.evaluate(() => window.marketelInspectDictationText(JSON.stringify({ text: 'Kitchen, chipped counter edge' })));
    assert.equal(await h.page.locator('.hud-note').innerText(), 'Kitchen, chipped counter edge');
    await h.page.evaluate(() => window.marketelInspectAudioCaptured(JSON.stringify({ dataUrl: '' })));
    assert.equal(await h.page.locator('.hud-note.is-live').count(), 0, 'letting go stops listening');
    assert.equal(await h.page.locator('.hud-note').innerText(), 'Kitchen, chipped counter edge');
    // A second hold adds to the same finding rather than replacing it.
    await cameraSay(h.page, 'Second chip by the tap');
    assert.equal(await h.page.locator('.hud-note').innerText(), 'Kitchen, chipped counter edge\nSecond chip by the tap');
    // The mic button beside the photos is the same recording, by tapping.
    await h.page.click('#hud-talk');
    assert.ok(h.shell.some(message => message.type === 'inspectDictate'));
    await h.page.click('#hud-talk');
    assert.ok(h.shell.some(message => message.type === 'inspectDictateStop'));
    h.assertClean();
  } finally { await h.close(); }
});

test('a finding is named after the room it mentions, and pairs with the check-in of that room', async () => {
  const baseline = report('check-in', { finalizedAt: new Date().toISOString(), document: {
    propertyName: 'Pine Cottage', author: '', type: 'check-in', date: '2026-09-20',
    rooms: [{ name: 'Kitchen', observation: '', issue: false, photos: ['before-1'] }], signatures: [],
    photoTimes: { 'before-1': { takenAt: '2026-09-20T15:25:00Z', zone: 'UTC' } }
  }, attachments: [{ id: 'before-1', source: 'camera', createdAt: '2026-09-20T15:26:00Z' }] });
  const h = await open({ native: true, reports: [baseline], properties: ['Pine Cottage'], accountData: { businessName: 'Pine Stays' } });
  try {
    await newAppReport(h, { said: 'Kitchen, chipped counter edge beside the sink.' });
    await h.page.click('[data-pick-property="Pine Cottage"]');
    await h.page.waitForSelector('#send-report');
    // The report reads "Kitchen", not "Finding 1", and shows its check-in as the before.
    const text = await h.body();
    assert.match(text, /Kitchen/);
    assert.doesNotMatch(text, /Finding 1/);
    assert.match(text, /Compared with the check-in|Before · check-in/i);
    // From the editor, the camera keeps the before in reach for that finding.
    await h.page.click('#edit');
    await h.page.waitForSelector('[data-native-camera]');
    await h.page.click('[data-native-camera]');
    await h.page.waitForSelector('.camera-companion');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await h.page.waitForSelector('.camera-strip .is-before');
    assert.match(await h.page.locator('.camera-strip .is-before').innerText(), /Before/);
    assert.match(await h.page.locator('[data-camera-room]').first().innerText(), /Kitchen\s+1/);
    await h.page.click('[data-before]');
    await h.page.waitForSelector('.before-photo');
    assert.match(await h.body(), /Before · check-in Sep 20, 2026/i);
    await h.page.click('#before-back');
    await h.page.waitForSelector('.camera-companion');
    await cameraShot(h.page);
    await h.page.waitForSelector('.camera-strip figure:not(.is-before) small');
    assert.match(await h.page.locator('.camera-strip figure:not(.is-before) small').first().innerText(), /\d{1,2}:\d{2}\s*(AM|PM)/);
    h.assertClean();
  } finally { await h.close(); }
});

test('a camera opened and closed with nothing in it leaves no report behind', async () => {
  const h = await open({ native: true, accountData: { businessName: 'Pine Stays' }, properties: ['Pine Cottage'] });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    await h.page.click('#hud-next');
    await cameraDone(h.page);
    await h.page.waitForSelector('#new-report');
    assert.equal(await h.page.locator('#property').count(), 0, 'no details step for nothing');
    assert.doesNotMatch(await h.body(), /No observation recorded|Finding/);
    // And nothing is waiting to be resumed: the next new report is a clean camera.
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    assert.equal(await h.page.locator('[data-camera-room]').count(), 1);
    h.assertClean();
  } finally { await h.close(); }
});

// The camera is the same for a detailer's car: no word in it says room.
test('intake, opened by its address, has no rooms in its words', async () => {
  const h = await open({ native: true, arm: 'intake', properties: ['White Tacoma'], accountData: { businessName: 'Shine Mobile Detailing' } });
  try {
    await h.page.waitForSelector('#new-report');
    await h.page.click('#new-report');
    await h.page.waitForSelector('.camera-companion');
    await h.page.evaluate(() => window.marketelInspectCameraOpened('0'));
    assert.equal((await h.page.textContent('#hud-next')).trim(), '+ another');
    assert.doesNotMatch(await h.body(), /\broom\b/i);
    await cameraShot(h.page);
    await cameraDone(h.page);
    await h.page.waitForSelector('#property');
    assert.match(await h.body(), /Which vehicle\?/);
    await h.page.click('[data-pick-property="White Tacoma"]');
    await h.page.waitForSelector('#send-report');
    h.assertClean();
  } finally { await h.close(); }
});
