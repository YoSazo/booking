const test = require('node:test');
const assert = require('node:assert/strict');

const { optimizeRoomImageBuffer } = require('../lib/optimizeRoomImage');

// A valid 1 × 1 PNG. Setup also prepares WebP in the browser, but this server
// boundary is the guarantee that every saved booking-page photo is optimized.
const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);

test('room uploads are resized and stored as WebP', async () => {
    const result = await optimizeRoomImageBuffer(TINY_PNG, 'image/png');

    assert.equal(result.contentType, 'image/webp');
    assert.equal(result.ext, '.webp');
    assert.equal(result.buffer.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(result.buffer.subarray(8, 12).toString('ascii'), 'WEBP');
});
