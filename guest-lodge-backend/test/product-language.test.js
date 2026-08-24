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
    const ownerApp = revealCopy.indexOf('The Front Desk you just used is your real app.');
    const guestel = revealCopy.indexOf('Your property stays in their Guestel wallet.');
    assert.ok(ownerApp >= 0, 'the Front Desk app bridge is missing');
    assert.ok(guestel > ownerApp, 'Guestel appears before Front Desk is established as the owner app');
    assert.match(revealCopy, /Download Marketel from the App Store/);
    assert.match(revealCopy, /Every reservation lands in one place/);
    assert.match(revealCopy, /Change a room-night in seconds/);
    assert.match(revealCopy, /They can book you again without an OTA/);
    assert.match(revealCopy, /JourneyAppCarouselSlideViewed/);
    assert.match(revealCopy, /Booking page converts\./);
    assert.match(revealCopy, /Front Desk runs it\./);
    assert.match(revealCopy, /Guestel keeps them\./);
    assert.match(revealCopy, /openAppCarouselLightbox/);
    assert.doesNotMatch(revealCopy, /And if you miss it, your rule decides/);
});
