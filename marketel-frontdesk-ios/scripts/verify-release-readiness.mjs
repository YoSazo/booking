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
const bundledInspect = read('www/inspect/index.html');
const bundledRoot = read('www/index.html');

// The Home Screen label truncates around 11-12 characters, so the icon uses the
// short brand name. "Marketel Front Desk" rendered as "MarketelFr…", cutting off
// exactly the words that identified the app.
expect(info, /<key>CFBundleDisplayName<\/key>\s*<string>Marketel<\/string>/,
  'Info.plist must use the Marketel Home Screen display name');
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
expect(delegate, /case "openBrowser":[\s\S]{0,180}presentInAppBrowser/,
  'AppDelegate does not keep booking-page previews inside the app');
// A spoken note is recorded and uploaded to be written up, so audio is data
// the app collects, and App Store Connect's labels must say so too.
expect(privacyManifest, /NSPrivacyCollectedDataTypeAudioData<\/string>\s*<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>\s*<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/,
  'Privacy manifest must declare the voice notes the app uploads as audio data');
// Paying for Marketel opens in the default browser, not the in-app sheet, and
// the page Stripe returns to links back in with the app's own URL scheme.
expect(delegate, /case "openPurchase":[\s\S]{0,160}openPurchaseInDefaultBrowser/,
  'AppDelegate does not send purchases to the default browser');
expect(delegate, /func openPurchaseInDefaultBrowser[\s\S]{0,500}UIApplication\.shared\.open\(url\)/,
  'Purchases must open with UIApplication.shared.open, not an in-app browser');
expect(info, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>com\.bookmarketel\.frontdesk<\/string>/,
  'Info.plist does not register the return-to-app URL scheme');
expect(delegate, /open url: URL[\s\S]{0,400}"com\.bookmarketel\.frontdesk"/,
  'AppDelegate does not answer the return-to-app URL scheme');
expect(read('www/inspect/inspect.js'), /type:'openPurchase'/,
  'Inspect does not ask the shell to open purchases in the default browser');
if (/openExternal\((?:r\.url|\(await api\('\/billing')/.test(read('www/inspect/inspect.js'))) {
  failures.push('A checkout or billing link still opens in the in-app browser');
}
for (const page of ['www/inspect/checkout-return.html', '../guest-lodge-backend/public/inspect/checkout-return.html']) {
  expect(read(page), /href="com\.bookmarketel\.frontdesk:\/\/return"/,
    `${page} does not link back into the app`);
}
expect(delegate, /case "inspectStorefront":[\s\S]{0,100}sendInspectStorefront/,
  'AppDelegate does not provide the App Store storefront to Inspect');
expect(delegate, /case "inspectExportPDF":[\s\S]{0,220}exportInspectPDF/,
  'AppDelegate does not provide a native Inspect PDF export');
expect(delegate, /case "inspectState":[\s\S]{0,180}showInspectProduct\(/,
  'AppDelegate does not give Inspect the native navigation shell');
expect(delegate, /func showInspectProduct[\s\S]{0,700}setShellProduct\(\.inspect\)/,
  'AppDelegate does not switch the shell to Inspect when a tool page reports in');
expect(delegate, /inspectReportsTabItem[\s\S]{0,900}inspectPropertiesTabItem/,
  'AppDelegate does not provide native Inspect tabs');
expect(delegate, /case "tourMode":/,
  'AppDelegate does not lock native navigation during the native walkthrough');
expect(delegate, /case "openAssistant":[\s\S]{0,120}presentNativeAssistant\(\)/,
  'Web fallback cannot open the native Front Desk Assistant');
expect(delegate, /sheet\.detents = \[\.medium\(\), \.large\(\)\][\s\S]{0,120}sheet\.selectedDetentIdentifier = \.medium/,
  'Native Front Desk Assistant must open at half height and expand to full height');
expect(project, /NativeAssistant\.swift in Sources/,
  'Xcode target does not compile NativeAssistant.swift');
expect(project, /NativeProperties\.swift in Sources/,
  'Xcode target does not compile NativeProperties.swift');
read('ios/App/App/NativeProperties.swift');
const nativeAssistant = read('ios/App/App/NativeAssistant.swift');
expect(nativeAssistant, /navigationBarItems\(trailing: Button\("Done"\)/,
  'Native Front Desk Assistant must keep Done in the top-right');
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
if (/<script[^>]+src=["']https?:/i.test(bundledInspect)) {
  failures.push('Bundled Inspect must not load executable JavaScript from a remote origin');
}
expect(read('www/inspect/inspect.js'), /type:'inspectState'[\s\S]{0,180}selectedTab/,
  'Bundled Inspect does not synchronize its native tab selection');
// Claims is the only job on the menu while it is the one running ads. The other
// two stay routable, and a hidden one that someone last used must not skip the
// menu and land them straight back in it.
expect(bundledRoot, /data-product="claims"/,
  'The native app entry must offer Claims');
if (/data-product="(inspect|incident)"/.test(bundledRoot)) {
  failures.push('The native app entry offers a tool that is meant to be hidden for now');
}
expect(bundledRoot, /const products = \['inspect', 'claims', 'incident'\]/,
  'The native app entry must still be able to open all three report jobs');
expect(bundledRoot, /if \(!choosing && offered\.includes\(selected\)\) return open\(selected\);/,
  'The native app entry reopens a tool that is not on its menu');
expect(bundledRoot, /marketel\.product[\s\S]*inspect\/index\.html\?arm=\$\{product\}/,
  'The native app entry does not preserve the selected report job');
expect(bundledRoot, /localStorage\.getItem\('crmToken'\)/,
  'An existing Front Desk owner must still reach their booking workspace');
expect(bundledRoot, /type: 'chooserState'/,
  'The native app entry must ask the shell for its floating glass bar');
expect(read('www/inspect/inspect.js'), /type:'inspectAuth'[\s\S]*window\.marketelInspectAuthVerify=/,
  'Bundled Inspect must hand sign-in to the native glass banner');
expect(delegate, /case "inspectAuth":[\s\S]{0,400}case "inspectAuthResult":/,
  'The native shell does not open the glass sign-in drawer');
expect(delegate, /case "chooserState":/,
  'The native shell does not show its glass bar over the tool chooser');
// Capacitor makes the web view the controller's root view, so the native bar
// lives inside it: disabling the web view kills every control in the bar.
if (/webView\?\.isUserInteractionEnabled\s*=/.test(delegate)) {
  failures.push('Never disable the whole web view: the native glass bar is inside it');
}
// A chooser restored from the back/forward cache must undo its departure, and
// hops between tools must replace the page rather than leave one cached.
expect(bundledRoot, /addEventListener\('pageshow'[\s\S]{0,200}classList\.remove\('leaving'\)/,
  'The tool chooser must recover from a back/forward cache restore');
if (/location\.assign\('\.\.\/(index|frontdesk)/.test(read('www/inspect/inspect.js'))) {
  failures.push('Hops between tools must use location.replace, never location.assign');
}
// One line, invisible when missing: without it a page sheet dims and swallows
// the half-screen above the camera, and the room list there answers nothing.
expect(delegate, /sheet\.largestUndimmedDetentIdentifier = \.medium/,
  'The camera sheet must leave the half-screen above it live');
expect(delegate, /inputAccessoryView = toolbar/,
  'Native sign-in fields need a Done bar to dismiss the keyboard');
for (const file of ['DMSans-Regular', 'DMSans-Medium', 'DMSans-Bold']) {
  if (!fs.existsSync(path.resolve(root, `www/native-fonts/${file}.ttf`))) failures.push(`Missing www/native-fonts/${file}.ttf`);
}
if (!fs.existsSync(path.resolve(root, 'ios/App/App/Assets.xcassets/MarketelWordmark.imageset/marketel-wordmark.svg'))) {
  failures.push('Missing the Marketel wordmark asset for the native banner');
}
const bundledAssetsPath = path.resolve(root, 'www/frontdesk/assets');
const bundledAssets = fs.existsSync(bundledAssetsPath)
  ? fs.readdirSync(bundledAssetsPath)
  : [];
if (!bundledAssets.some(filename => /^native-onboarding-.*\.js$/.test(filename))) {
  failures.push('Bundled Front Desk is missing the native onboarding module');
}
for (const relativePath of ['www/inspect/index.html', 'www/inspect/inspect.js', 'www/inspect/inspect.css']) {
  if (!fs.existsSync(path.resolve(root, relativePath))) failures.push(`Missing ${relativePath}`);
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

// The policy must describe what the app actually does with voice, and keep
// the promise the "No tracking" label rests on.
const privacyPolicy = read('../guest-lodge-backend/privacy.html');
expect(privacyPolicy, /Voice notes: when you tap the microphone/,
  'Privacy policy must say voice notes are recorded and uploaded');
expect(privacyPolicy, /OpenAI<\/strong> — to transcribe voice notes/,
  'Privacy policy must name OpenAI for voice notes');
expect(privacyPolicy, /Meta advertising measurement is disabled inside the Marketel app \(including purchases started from it\)/,
  'Privacy policy must keep Meta out of the app, including app-started purchases');

if (failures.length) {
  console.error('Marketel iOS release-readiness checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Marketel iOS release-readiness checks passed.');
