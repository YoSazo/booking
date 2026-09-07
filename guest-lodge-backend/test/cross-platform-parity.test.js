const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Front Desk ships one web build to iOS (via Capacitor), Android and desktop.
// Three features were gated behind isNativeFrontdeskApp(), and the response to
// hitting one was an apps.apple.com link opened with no platform check — on
// devices that cannot install from it, during the trial. These assert the gates
// stay down, because nothing stopped them going up the first time.

const src = (name) => fs.readFileSync(path.join(__dirname, '..', 'frontdesk', 'src', name), 'utf8');
const core = src('core.js');
const assistant = src('assistant.js');
const apps = src('apps.js');
const settings = src('settings.js');

test('no owner is sent to a store their device cannot install from', () => {
    assert.match(core, /const android = \/android\/i\.test\(navigator\.userAgent \|\| ''\);/);
    // The Android branch must return before the App Store window.open.
    const fn = core.slice(core.indexOf('function openFrontdeskAppDownload()'));
    const body = fn.slice(0, fn.indexOf('\n}\n'));
    assert.ok(
        body.indexOf('if (android)') < body.indexOf("window.open(appStoreUrl"),
        'the Android check must come before the App Store navigation'
    );
});

test('booking alerts can be turned on outside the installed app', () => {
    // The control shipped as style="display:none" and nothing ever cleared it,
    // so web push — which is fully wired and counts toward the booking-approval
    // channel check — was unreachable in a browser tab.
    assert.match(core, /btn\.style\.display = available \? '' : 'none';/);
    assert.match(core, /const available = pushSupported\(\) && !isNativeFrontdeskApp\(\);/);
});

test('the Front Desk Assistant opens on every platform', () => {
    // Neither entry point may bounce to a download.
    for (const fnName of ['openAssistantSheetNow', 'openFrontDeskAssistant']) {
        const at = assistant.indexOf(`function ${fnName}(`);
        assert.ok(at > -1, `${fnName} exists`);
        const body = assistant.slice(at, at + 400);
        assert.doesNotMatch(body, /openFrontdeskAppDownload/, `${fnName} must not bounce to a download`);
    }
    assert.doesNotMatch(assistant, /Assistant lives on your phone/);
    // Its readiness and trial-checklist entry points likewise.
    const readiness = core.slice(core.indexOf("if (action === 'assistant')"));
    assert.doesNotMatch(readiness.slice(0, 260), /openFrontdeskAppDownload\(\)/);
});

test('guest tools are not locked to the app', () => {
    // The wallet card, returning-guest offer, QR and every guest conversation
    // lived behind a download button on web.
    assert.match(apps, /const appsMainHtml = nativeGuestToolsHtml;/);
    assert.doesNotMatch(apps, /webAppLockHtml/);
    // And unread counts must not be forced to zero off-native.
    assert.match(core, /const appOnlySurface = true;/);
});

test('an owner can delete their account without an iPhone', () => {
    assert.match(settings, /const deletionControls = request/);
    assert.doesNotMatch(settings, /const deletionControls = !native \? '' :/);
    // Web must also learn about a pending deletion.
    assert.doesNotMatch(settings, /isNativeApp\(\)\s*\n\s*\? api\('GET', '\/api\/crm\/account-deletion\/status'\)/);
});

test('checkout stays web-side, which is what Apple requires', () => {
    // Regression guard in the opposite direction: goLive blocks native, not web.
    const at = settings.indexOf('async function goLive(');
    assert.ok(at > -1);
    assert.match(settings.slice(at, at + 320), /if \(isNativeApp\(\)\)/);
});
