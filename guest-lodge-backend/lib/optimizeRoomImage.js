const path = require('path');

let sharp;
try {
    sharp = require('sharp');
} catch (_) {
    sharp = null;
}

/**
 * Resize and convert room photos to WebP for fast guest booking pages.
 * Falls back to original buffer if sharp is unavailable.
 */
async function optimizeRoomImageBuffer(buffer, mimetype) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return { buffer, contentType: mimetype || 'image/jpeg', ext: '.jpg' };
    }
    if (!sharp) {
        const ext = guessExt(mimetype);
        return { buffer, contentType: mimetype || 'image/jpeg', ext };
    }
    try {
        const out = await sharp(buffer)
            .rotate()
            .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82, effort: 4 })
            .toBuffer();
        return { buffer: out, contentType: 'image/webp', ext: '.webp' };
    } catch (e) {
        console.error('optimizeRoomImageBuffer:', e.message);
        const ext = guessExt(mimetype);
        return { buffer, contentType: mimetype || 'image/jpeg', ext };
    }
}

function guessExt(mimetype) {
    if (mimetype === 'image/png') return '.png';
    if (mimetype === 'image/webp') return '.webp';
    return '.jpg';
}

module.exports = { optimizeRoomImageBuffer };
