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
    assert.match(productCopy, /You run everything from Marketel Front Desk/);
    assert.match(productCopy, /Marketel Front Desk remains your owner app/);
    assert.match(productCopy, /Guests book on .*direct page/);
    assert.match(productCopy, /keep your property in Guestel/i);
});

test('walk-in handling states the action and booking-page outcome', () => {
    assert.match(productCopy, /Walk-in or another channel took a room\?/);
    assert.match(productCopy, /text the Marketel Front Desk contact what happened/);
    assert.match(productCopy, /reduces? (?:the )?remaining availability/i);
});

test('the reveal makes the owner app and Guestel distinct, optional proofs', () => {
    const ownerApp = revealCopy.indexOf('Marketel Front Desk is a real App Store app.');
    const guestel = revealCopy.indexOf("id: 'guestel'");
    assert.ok(ownerApp >= 0, 'the Front Desk app proof is missing');
    assert.ok(guestel >= 0, 'the Guestel proof is missing');
    assert.match(revealCopy, /Edit your booking page and manage bookings and availability from your phone/);
    assert.match(revealCopy, /tap Add on your booking page, open Apple’s instant App Clip, save your property in Guestel/);
    assert.match(revealCopy, /frontdeskYourPageUrl/);
    assert.match(revealCopy, /guestelAddBookingPageUrl/);
    assert.match(revealCopy, /guestelAppClipCardUrl/);
    assert.match(revealCopy, /guestelAppClipInviteUrl/);
    assert.match(revealCopy, /guestelPropertySavedUrl/);
    assert.match(revealCopy, /guestelWalletReadyUrl/);
    assert.match(revealCopy, /guestelHotelsUrl/);
    assert.match(revealCopy, /guestelChooseRoomUrl/);
    assert.match(revealCopy, /guestelChatUrl/);
    assert.match(revealCopy, /preloadCarouselScreens/);
    assert.match(revealCopy, /loading="eager"/);
    assert.match(revealCopy, /JourneyAppCarouselSlideViewed/);
    assert.match(revealCopy, /startGuestelAutoplay/);
    assert.match(revealCopy, /data-sheet-dismiss>Close/);
    assert.doesNotMatch(revealCopy, /startBookingChallenge|showBookingChallengePrompt/);
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
