const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '..');
const repo = path.resolve(backend, '..');
const setup = fs.readFileSync(path.join(backend, 'setup.html'), 'utf8');
const server = fs.readFileSync(path.join(backend, 'server.js'), 'utf8');
const reveal = fs.readFileSync(path.join(backend, 'frontdesk/src/reveal.js'), 'utf8');
const roomCard = fs.readFileSync(path.join(repo, 'hotel-booking-app/src/RoomCard.jsx'), 'utf8');
const guestInfo = fs.readFileSync(path.join(repo, 'hotel-booking-app/src/GuestInfoPage.jsx'), 'utf8');
const installBanner = fs.readFileSync(path.join(repo, 'hotel-booking-app/src/InstallAppBanner.jsx'), 'utf8');
const roomPlaceholder = fs.readFileSync(path.join(backend, 'public/room-placeholder.svg'), 'utf8');

test('a personalized preview never invents room claims', () => {
    const amenityParser = roomCard.slice(
        roomCard.indexOf('const getAmenityList'),
        roomCard.indexOf('const amenityList')
    );
    assert.match(amenityParser, /if \(!amenitiesText\.trim\(\)\) return \[\]/);
    assert.doesNotMatch(amenityParser, /For guests, show defaults/);
    assert.doesNotMatch(roomCard, /Spacious • Fully Furnished/);
    assert.doesNotMatch(roomPlaceholder, />Add your room photo</);
    assert.match(roomCard, /From \$\$\{nightlyPrice\.toFixed\(0\)\} \/ night/);
    assert.match(guestInfo, /Number\(bookingDetails\.taxes\) > 0/);
});

test('self-serve setup does not silently invent discounts or tax', () => {
    assert.match(setup, /Math\.round\(nightly \* 7\)/);
    assert.match(setup, /Math\.round\(nightly \* 28\)/);
    assert.match(setup, /taxRate: existingRates\.taxRate \?\? 0/);

    const setupRatesRoute = server.slice(
        server.indexOf("app.post('/api/setup/:token/rates'"),
        server.indexOf('// Complete setup')
    );
    assert.match(setupRatesRoute, /parsedTaxRate >= 0 && parsedTaxRate <= 1/);
    assert.doesNotMatch(setupRatesRoute, /taxRate: taxRate \|\| 0\.10/);
});

test('room setup advances immediately to ready while the property builds in the background', () => {
    const roomStep = setup.slice(
        setup.indexOf('async function addRoomAndFinish'),
        setup.indexOf('window._siteReady = false')
    );
    assert.match(roomStep, /setupBuildInFlight = true;\s*goToStep\(2\);/);
    assert.match(roomStep, /Promise\.all\(\[hotelRequest, roomRequest, ratesRequest\]\)/);
    assert.doesNotMatch(roomStep, /showLoading\(/);
    assert.match(roomStep, /handoffToReveal\('automatic'\)/);

    const completeRoute = server.slice(
        server.indexOf("app.post('/api/setup/:token/complete'"),
        server.indexOf('// Polled by setup.html')
    );
    assert.match(completeRoute, /setupProgressStep: \{ lt: 4 \}/);
    assert.doesNotMatch(completeRoute, /setupComplete: true, active: true, setupProgressStep: 4/);
});

test('setup defers qualification and extended configuration while keeping one photo optional', () => {
    assert.doesNotMatch(setup, /id="demandFitQuestion"|data\.demandFitAnswer/);
    assert.doesNotMatch(setup, /id="hotelAddress"|id="hotelPhone"/);
    assert.match(setup, /id="rmUnits" value="1"/);
    assert.match(setup, /id="setupRoomPhoto"[\s\S]*Add one room photo[\s\S]*\(optional\)/);
    assert.match(setup, /pendingPhotoPrep = prepareSetupPhoto/);
    assert.match(setup, /Promise\.all\(\[completeRequest, photoUpload\]\)/);
    assert.match(server, /demandFitAnswer/);
    assert.match(server, /marketelDemandFitMessage/);
    assert.match(server, /demandFit,/);
    assert.match(reveal, /demandFitRevealMessage/);
    assert.match(reveal, /result\?\.demandFit/);
});

test('the owner preview explains activation and the room-money flow honestly', () => {
    assert.doesNotMatch(installBanner, /Available once this property finishes setup/);
    assert.doesNotMatch(installBanner, /\{locked \? 'Locked'/);
    assert.match(installBanner, /This is what Add opens for guests/);
    assert.match(installBanner, /This turns on when you activate Marketel/);
    assert.match(reveal, /temporary \$1 hold/);
    assert.match(reveal, /Marketel never holds your room revenue/);

    assert.doesNotMatch(reveal, /function startBookingChallenge|function showBookingChallengePrompt/);
    const livePreview = reveal.slice(
        reveal.indexOf('function showExpandedPreview'),
        reveal.indexOf('function recordHubDepth')
    );
    assert.match(livePreview, /live booking page/);
    assert.match(livePreview, /temporary \$1 hold/);
    assert.match(livePreview, /id="mvrClosePreview">Close/);
    assert.doesNotMatch(livePreview, /challenge|timer|editor/);
});

test('Guestel preview stays inside the owner reveal', () => {
    assert.match(installBanner, /marketel:guestel-preview-requested/);
    // Only an embedded preview is intercepted. ownerPreview is also true in a
    // standalone "Preview your site" tab, where there is no reveal to stay
    // inside and the owner should see their real App Clip open.
    assert.match(installBanner, /ownerPreview && embeddedPreview \? 'Preview'/);
    assert.match(installBanner, /const embeddedPreview = typeof window !== 'undefined' && window\.parent !== window;/);
    assert.match(installBanner, /if \(ownerPreview && embeddedPreview\) \{/);
    assert.match(guestInfo, /hotelSubscribed=\{hotel\?\.subscribed !== false\}/);
    assert.match(reveal, /messageType === 'marketel:guestel-preview-requested'/);
    assert.match(reveal, /openGuestelPreviewFromBooking\(\)/);
    assert.match(reveal, /const returnToBooking = closed === 'guestel' && !!livePreview/);
    assert.match(reveal, /livePreview\.removeAttribute\('aria-hidden'\)/);
    assert.match(reveal, /visitedItems\.add\(item\.id\)/);
});
