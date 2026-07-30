import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const repositoryRoot = path.resolve(root, '..');
const failures = [];

function read(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function expect(content, pattern, message) {
  if (!pattern.test(content)) failures.push(message);
}

function expectLength(relativePath, maximum) {
  const value = read(relativePath).trim();
  if (value.length > maximum) {
    failures.push(`${relativePath} is ${value.length} characters; maximum is ${maximum}`);
  }
}

const info = read('ios/App/App/Info.plist');
const entitlements = read('ios/App/App/App.entitlements');
const privacyManifest = read('ios/App/App/PrivacyInfo.xcprivacy');
const project = read('ios/App/App.xcodeproj/project.pbxproj');
const delegate = read('ios/App/App/AppDelegate.swift');
const capacitor = read('capacitor.config.json');
const exportOptions = read('ios/ExportOptions.plist');
const bundledFrontDesk = read('www/frontdesk/index.html');

expect(info, /<key>CFBundleDisplayName<\/key>\s*<string>Marketel Front Desk<\/string>/,
  'Info.plist must use the Marketel Front Desk display name');
expect(info, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/,
  'Info.plist must declare standard exempt encryption usage');
expect(entitlements, /<key>aps-environment<\/key>/,
  'Push notification entitlement is missing');
expect(privacyManifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/,
  'Privacy manifest must explicitly disable tracking');
expect(project, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/,
  'Xcode target does not reference App.entitlements');
expect(project, /PrivacyInfo\.xcprivacy in Resources/,
  'Xcode target does not embed PrivacyInfo.xcprivacy');
expect(delegate, /registerForRemoteNotifications\(\)/,
  'AppDelegate does not register for remote notifications');
expect(delegate, /MARKETEL_CONFIRM_BOOKING/,
  'AppDelegate is missing native booking actions');
expect(delegate, /marketelNativeContactResult/,
  'AppDelegate does not return the native contact result to Front Desk');
expect(delegate, /case "tourMode":/,
  'AppDelegate does not lock native navigation during the native walkthrough');
expect(delegate, /title: "Front Desk Assistant"[\s\S]{0,220}sendWebAction\("assistant"\)/,
  'Native menu does not expose Front Desk Assistant');
expect(delegate, /title: "Replay app tour"[\s\S]{0,220}sendWebAction\("tour"\)/,
  'Native menu does not expose tour replay clearly');
expect(capacitor, /"appId":\s*"com\.bookmarketel\.frontdesk"/,
  'Capacitor app ID must match com.bookmarketel.frontdesk');
if (/"url"\s*:\s*"https?:\/\//.test(capacitor)) {
  failures.push('Capacitor must load the bundled Front Desk, not a remote server URL');
}
if (/clarity\.ms|unpkg\.com/.test(bundledFrontDesk)) {
  failures.push('Bundled Front Desk must not load analytics or executable JavaScript from a CDN');
}
const bundledAssetsPath = path.resolve(root, 'www/frontdesk/assets');
const bundledAssets = fs.existsSync(bundledAssetsPath)
  ? fs.readdirSync(bundledAssetsPath)
  : [];
if (!bundledAssets.some(filename => /^native-onboarding-.*\.js$/.test(filename))) {
  failures.push('Bundled Front Desk is missing the native onboarding module');
}
for (const match of bundledFrontDesk.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  const referencedFile = path.resolve(root, 'www/frontdesk', match[1]);
  if (!fs.existsSync(referencedFile)) {
    failures.push(`Bundled Front Desk references missing file ${match[1]}`);
  }
}
expect(exportOptions, /<key>com\.bookmarketel\.frontdesk<\/key>/,
  'Export options do not contain the Marketel bundle ID');

expectLength('app-store/subtitle.txt', 30);
expectLength('app-store/keywords.txt', 100);
expectLength('app-store/promotional-text.txt', 170);
expectLength('app-store/description.txt', 4000);

const backendServerPath = path.resolve(repositoryRoot, 'guest-lodge-backend/server.js');
const backendServer = fs.existsSync(backendServerPath)
  ? fs.readFileSync(backendServerPath, 'utf8')
  : '';
expect(backendServer, /APNS_BUNDLE_ID[\s\S]{0,180}com\.bookmarketel\.frontdesk/,
  'Backend APNs topic does not match the iOS bundle ID');
expect(backendServer, /\/api\/crm\/account-deletion\/request/,
  'Backend account deletion endpoint is missing');
expect(backendServer, /req\.crmIsNativeClient[\s\S]{0,220}Subscription purchases are not available/,
  'Backend native purchase gate is missing');

for (const relativePath of [
  'www/frontdesk/index.html',
  '../guest-lodge-backend/privacy.html',
  '../guest-lodge-backend/terms.html',
  '../guest-lodge-backend/app-support.html',
  'app-store/review-notes.md',
  'app-store/privacy-labels.md',
  'app-store/submission-checklist.md',
]) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) failures.push(`Missing ${relativePath}`);
}

if (failures.length) {
  console.error('Marketel iOS release-readiness checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Marketel iOS release-readiness checks passed.');
