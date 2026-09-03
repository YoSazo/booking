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

test('room setup advances immediately while the property builds in the background', () => {
    const roomStep = setup.slice(
        setup.indexOf('async function addRoomAndFinish'),
        setup.indexOf('window._siteReady = false')
    );
    assert.match(roomStep, /setupBuildInFlight = true;\s*goToStep\(3\);/);
    assert.match(roomStep, /Promise\.all\(\[roomRequest, ratesRequest\]\)/);
    assert.doesNotMatch(roomStep, /showLoading\(/);

    const completeRoute = server.slice(
        server.indexOf("app.post('/api/setup/:token/complete'"),
        server.indexOf('// Polled by setup.html')
    );
    assert.match(completeRoute, /setupProgressStep: \{ lt: 3 \}/);
    assert.doesNotMatch(completeRoute, /setupComplete: true, active: true, setupProgressStep: 3/);
});

test('the owner preview explains activation and the room-money flow honestly', () => {
    assert.doesNotMatch(installBanner, /Available once this property finishes setup/);
    assert.doesNotMatch(installBanner, /\{locked \? 'Locked'/);
    assert.match(installBanner, /Guestel is included when you activate Marketel/);
    assert.match(reveal, /Your room money stays yours/);
    assert.match(reveal, /temporary \$1 card verification/);
    assert.match(reveal, /Marketel never holds the room payment/);

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
