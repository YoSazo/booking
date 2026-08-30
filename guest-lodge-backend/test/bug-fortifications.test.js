const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.join(__dirname, '..');
const repo = path.join(backend, '..');
const server = fs.readFileSync(path.join(backend, 'server.js'), 'utf8');
const core = fs.readFileSync(path.join(backend, 'frontdesk', 'src', 'core.js'), 'utf8');
const settings = fs.readFileSync(path.join(backend, 'frontdesk', 'src', 'settings.js'), 'utf8');
const apps = fs.readFileSync(path.join(backend, 'frontdesk', 'src', 'apps.js'), 'utf8');
const guestel = path.join(repo, 'marketel-guestel-ios', 'Guestel');

test('Front Desk bug fixes preserve truthful state and removable clutter', () => {
    assert.match(core, /function dismissDeclinedLead\(id, guestLabel\)/);
    assert.match(core, /payment-declined\/\$\{encodeURIComponent\(id\)\}/);
    assert.match(core, /crm\.bookings = crm\.bookings\.filter/);

    const saveDay = core.slice(core.indexOf('async function saveAvailabilityDay'), core.indexOf('async function saveRoomType'));
    assert.match(saveDay, /const unchanged =/);
    assert.match(saveDay, /if \(unchanged\) \{\s*closeAvailabilityDayPopover\(\);\s*return;/);

    assert.match(core, /marketelGrowthDiscoveryDismissed:/);
    assert.match(core, /aria-label="Dismiss Get found tips"/);
    assert.doesNotMatch(core, /Watch a real notification arrive/);
});

test('Front Desk Guestel covers and custom amenities have production fallbacks', () => {
    assert.match(server, /guestelWalletFallbackImageUrl: absolutePublicAssetUrl/);
    assert.match(apps, /function guestelWalletDisplayImageUrl\(\)/);
    assert.match(apps, /crm\.guestelWalletImageUrl\s*\|\| crm\.guestelWalletFallbackImageUrl\s*\|\| roomFallback/);
    assert.match(settings, /\+ Custom amenity/);
    assert.match(settings, /id="amenityCustomModal" data-marketel-keyboard-surface/);
    assert.doesNotMatch(settings, /placeholder="Or type a custom one/);
});

test('Guestel removes stale hotels safely and confirms destructive gestures', () => {
    const api = fs.readFileSync(path.join(guestel, 'BookingAPI.swift'), 'utf8');
    const store = fs.readFileSync(path.join(guestel, 'Store.swift'), 'utf8');
    const hotels = fs.readFileSync(path.join(guestel, 'HotelsView.swift'), 'utf8');
    const messages = fs.readFileSync(path.join(guestel, 'MessagesView.swift'), 'utf8');

    assert.match(server, /!hotel \|\| hotel\.active === false/);
    assert.match(api, /case http\(statusCode: Int, message: String\)/);
    assert.match(api, /statusCode == 404 \|\| statusCode == 410/);
    assert.match(store, /removeMissingHotel\(hotelId\)/);
    assert.match(store, /guestel\.hidden-hotels\.v1/);
    assert.match(hotels, /\.contextMenu \{/);
    assert.match(hotels, /\.alert\("Remove this hotel\?"/);
    assert.match(messages, /\.alert\("Delete this conversation\?"/);
    assert.doesNotMatch(messages, /\.confirmationDialog\(/);
});
