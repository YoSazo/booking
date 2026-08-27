const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const files = [
    'frontdesk/index.html',
    'frontdesk/src/apps.js',
    'frontdesk/src/core.js',
    'frontdesk/src/native-onboarding.js',
    'frontdesk/src/reveal.js',
    'frontdesk/src/settings.js',
    'frontdesk/src/tour-apps.js',
    'setup.html',
];

const productCopy = files
    .map((file) => fs.readFileSync(path.join(backendRoot, file), 'utf8'))
    .join('\n');
const revealCopy = fs.readFileSync(path.join(backendRoot, 'frontdesk/src/reveal.js'), 'utf8');

test('owner and guest products never collapse into ambiguous app language', () => {
    assert.doesNotMatch(productCopy, /\bGuest App\b/);
    assert.doesNotMatch(productCopy, /\bguest app\b/);
    assert.doesNotMatch(productCopy, /guests? (?:download|install)(?:s|ed|ing)? your app/i);
});

test('core owner surfaces teach the permanent two-side vocabulary', () => {
    assert.match(productCopy, /Guests never download Front Desk/);
    assert.match(productCopy, /One owner app: Marketel Front Desk/);
    assert.match(productCopy, /Your guests use Guestel/);
    assert.match(productCopy, /Guests book on .*direct page/);
    assert.match(productCopy, /keep your property in Guestel/i);
});

test('walk-in handling states the action and booking-page outcome', () => {
    assert.match(productCopy, /Walk-in or another channel took a room\?/);
    assert.match(productCopy, /text the Marketel Front Desk contact what happened/);
    assert.match(productCopy, /reduces? (?:the )?remaining availability/i);
});

test('the reveal establishes the owner app before switching to Guestel', () => {
    const ownerApp = revealCopy.indexOf('Control your engine from one app.');
    const guestelInstall = revealCopy.indexOf('One tap keeps your property on their phone.');
    const guestel = revealCopy.indexOf('Keep every guest one tap away.');
    const assistant = revealCopy.indexOf('Nothing slips through the cracks.');
    const system = revealCopy.indexOf('The full direct-booking loop.');
    assert.ok(ownerApp >= 0, 'the Front Desk app bridge is missing');
    assert.ok(guestelInstall > ownerApp, 'the App Clip handoff appears before Front Desk is established as the owner app');
    assert.ok(guestel > guestelInstall, 'Guestel value appears before the guest handoff is explained');
    assert.ok(assistant > guestel, 'setup protection appears before the guest relationship is established');
    assert.ok(system > assistant, 'the complete loop appears before its parts are established');
    assert.match(revealCopy, /Your page, bookings, rooms and guest reach all live in Front Desk/);
    assert.match(revealCopy, /open Apple\\'s instant App Clip/);
    assert.match(revealCopy, /They save your property, book direct again/);
    assert.match(revealCopy, /The moment a request lands, Front Desk alerts you three ways/);
    assert.match(revealCopy, /Your page converts\. Front Desk runs it\. Guestel keeps them forever/);
    assert.match(revealCopy, /preloadCarouselScreens/);
    assert.match(revealCopy, /loading="eager"/);
    assert.match(revealCopy, /JourneyAppCarouselSlideViewed/);
    assert.match(revealCopy, /id: 'assistant'/);
    assert.match(revealCopy, /id: 'system'/);
    assert.doesNotMatch(revealCopy, /showcase-lightbox|expandable/);
    assert.doesNotMatch(revealCopy, /And if you miss it, your rule decides/);
});

test('activation turns the nightly rate into an editable break-even decision', () => {
    assert.match(revealCopy, /id="mvrActivationRate"/);
    assert.match(revealCopy, /data-mvr-rate-step="-5"/);
    assert.match(revealCopy, /Estimate uses a 15% OTA commission/);
    assert.match(revealCopy, /Three things you're activating/);
    assert.match(revealCopy, /Direct Booking Page/);
    assert.match(revealCopy, /Marketel Front Desk/);
    assert.match(revealCopy, /Guestel/);
    assert.match(productCopy, /previewActivation/);
    assert.match(revealCopy, /activationPreviewMode && crm\.hotelSubscribed/);
});
