const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'frontdesk', 'src', 'core.js'), 'utf8');

// A return token carries an owner across one boundary and expires in a day.
// The browser stored it as its session, so Front Desk signed owners out with
// "Unauthorized" a day after they arrived from setup or Stripe — and because
// the client treats any 401 as signed-out, it discarded the credential and
// demanded a PIN the owner may never have been given.
test('a handoff token is never left standing in as the session', () => {
    assert.match(server, /function generateCrmSessionToken\(hotelId, options = \{\}\)/);
    assert.match(server, /function verifyCrmSessionToken\(token\)/);
    assert.match(server, /purpose: 'frontdesk-session'/);

    // The session must outlive the handoff it replaces, or this fixes nothing.
    assert.match(server, /const CRM_SESSION_TOKEN_EXPIRY_MS = NATIVE_SESSION_TOKEN_EXPIRY_MS/);
    const returnExpiry = server.match(/const CRM_RETURN_TOKEN_EXPIRY_MS = ([^;]+);/);
    assert.ok(returnExpiry, 'return token expiry is no longer declared');
    assert.match(returnExpiry[1], /24 \* 60 \* 60 \* 1000/);
});

test('crmAuth accepts the session token and scopes it to one property', () => {
    const auth = server.slice(server.indexOf('const crmAuth = '), server.indexOf('\n};', server.indexOf('const crmAuth = ')));
    assert.match(auth, /const sessionAuth = returnAuth \? null : verifyCrmSessionToken\(token\)/);
    // Scoped to exactly the hotel it proved access to, never a wildcard.
    assert.match(auth, /sessionAuth\s*\n?\s*\?\s*\[sessionAuth\.hotelId\]/);
    // A session token must not fall through to PIN or dogfood widening.
    assert.match(auth, /returnAuth \|\| sessionAuth \|\| nativeAuth\s*\n?\s*\?\s*\[\]/);
    assert.match(auth, /!returnAuth\s*\n\s*&& !sessionAuth\s*\n\s*&& !nativeAuth/);
});

test('the client trades every proven browser credential for a durable session', () => {
    assert.match(core, /async function upgradeToDurableSession\([^)]*\)/);
    // Browser PINs and handoff tokens are exchanged, while already-durable and
    // native credentials are left alone.
    assert.match(core, /token\.startsWith\('fds_'\)/);
    assert.match(core, /token\.startsWith\('fdn_'\)/);
    assert.match(core, /isNativeFrontdeskApp\(\)/);
    // Only accept a real session back, never echo whatever the server sent.
    assert.match(core, /data\.token\.startsWith\('fds_'\)/);
    // Runs after bootstrap succeeds — that success is the proof the token works.
    assert.match(core, /startCrmApp\(verification, \{ bootstrapped: true \}\);\s*\n[\s\S]{0,200}upgradeToDurableSession\(verification\)/);
    // A failed upgrade must never sign anyone out; the handoff still has time.
    assert.match(core, /upgradeToDurableSession\(verification\)\.catch\(\(\) => \{\}\)/);
});

test('dogfood replay authorization survives the browser session exchange', () => {
    assert.match(server, /dogfoodPreview: !!options\.dogfoodPreview/);
    assert.match(server, /dogfoodPreview: !!payload\.dogfoodPreview/);
    assert.match(server, /isDogfoodPreviewAccess = !!sessionAuth\?\.dogfoodPreview/);
    assert.match(server, /dogfoodPreview: !!req\.crmIsDogfoodPreview/);
    assert.match(core, /crm\.isDogfoodPreview = !!\(verification && verification\.nativePreviewAccess\)/);
    assert.match(core, /crm\.isMasterPin \|\| crm\.isDogfoodPreview/);
});

test('a support reply reaches the owner in the app, not only by email', () => {
    const start = server.indexOf("app.post('/api/admin/support/:threadId/reply'");
    assert.notEqual(start, -1, 'the admin reply route is missing');
    const reply = server.slice(start, start + 4000);
    assert.ok(reply.includes('sendPushToHotel'), 'support replies still only send email');
    assert.match(reply, /type: 'support_reply'/);
    // Notifying must not be able to fail the reply itself.
    assert.match(reply, /void sendPushToHotel[\s\S]{0,800}\.catch\(\(\) => \{\}\)/);
});
