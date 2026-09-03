import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { guestelInvocationUrl, guestelQrInvocationUrl } from '../src/appClipInstall.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Guestel button links invoke Apple and retain property context', () => {
  const url = new URL(guestelInvocationUrl({ hotelId: 'hotel-a/b', intent: 'add' }));
  assert.equal(url.origin, 'https://appclip.apple.com');
  assert.equal(url.searchParams.get('p'), 'com.bookmarketel.guestel.Clip');
  assert.equal(url.searchParams.get('hotelId'), 'hotel-a/b');
  assert.equal(url.searchParams.get('intent'), 'add');
});

test('Guestel QR links use the associated App Clip route and keep handoff data', () => {
  const url = new URL(guestelQrInvocationUrl({
    hotelId: 'hotel-a/b',
    intent: 'stay',
    handoffToken: 'one-use-token',
    ref: 'confirmation',
  }));
  assert.equal(url.origin, 'https://clip.mktel.co');
  assert.equal(url.pathname, '/clip/hotel-a%2Fb');
  assert.equal(url.searchParams.get('intent'), 'stay');
  assert.equal(url.searchParams.get('handoff'), 'one-use-token');
  assert.equal(url.searchParams.get('ref'), 'confirmation');
});

test('the booking web app contains no guest PWA install machinery', () => {
  const sourceFiles = fs.readdirSync(path.join(root, 'src'))
    .filter((file) => /\.(?:js|jsx)$/.test(file))
    .map((file) => fs.readFileSync(path.join(root, 'src', file), 'utf8'))
    .join('\n');
  // display-mode/standalone may still be used to distinguish browser chrome
  // from an installed or native viewport. The retired behavior is prompting,
  // installing, or teaching a guest to add this website as a PWA.
  assert.doesNotMatch(sourceFiles, /beforeinstallprompt|appinstalled|Add to Home Screen/i);
  assert.equal(fs.existsSync(path.join(root, 'public', 'engine-sw.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'public', 'sw.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'public', 'manifest-simple-crm.json')), false);
});

test('QR handoffs render locally rather than leaking their URL to an image API', () => {
  const qrSource = fs.readFileSync(path.join(root, 'src', 'GuestelQrCode.jsx'), 'utf8');
  assert.match(qrSource, /import\('qrcode'\)/);
  assert.doesNotMatch(qrSource, /api\.qrserver|chart\.googleapis/);
});

test('owner previews demonstrate Guestel without invoking Apple', () => {
  const bannerSource = fs.readFileSync(path.join(root, 'src', 'InstallAppBanner.jsx'), 'utf8');
  const guestInfoSource = fs.readFileSync(path.join(root, 'src', 'GuestInfoPage.jsx'), 'utf8');
  const previewBranch = bannerSource.slice(
    bannerSource.indexOf('if (ownerPreview)'),
    bannerSource.indexOf('if (hotelSubscribed !== true)')
  );

  assert.match(previewBranch, /marketel:guestel-preview-requested/);
  assert.doesNotMatch(previewBranch, /guestelInvocationUrl|location\.assign/);
  assert.match(bannerSource, /ownerPreview \? 'Preview'/);
  assert.match(guestInfoSource, /hotelSubscribed=\{hotel\?\.subscribed !== false\}/);
  assert.match(guestInfoSource, /frontdesk-checkout-preview/);
});
