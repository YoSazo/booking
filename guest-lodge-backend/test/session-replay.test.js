const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const recorder = fs.readFileSync(path.join(root, 'public', 'marketel-session-replay.js'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'landing.html'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'setup.html'), 'utf8');
const frontdesk = fs.readFileSync(path.join(root, 'frontdesk', 'index.html'), 'utf8');

test('Clarity and Smartlook cover the web funnel without recording the native app', () => {
    assert.match(recorder, /y93wrwbvgb/);
    assert.match(recorder, /d5c0866c4148f2c64d8e7a6a48c10cedeb8b3eb4/);
    assert.match(recorder, /https:\/\/www\.clarity\.ms\/tag\//);
    assert.match(recorder, /https:\/\/web-sdk\.smartlook\.com\/recorder\.js/);
    assert.match(recorder, /isLocal \|\| isNative/);
    assert.match(recorder, /__MARKETEL_SESSION_REPLAY_LOADED__/);
    for (const html of [landing, setup, frontdesk]) {
        assert.match(html, /\/marketel-session-replay\.js/);
        assert.doesNotMatch(html, /wvc5g15yl5/);
    }
});
