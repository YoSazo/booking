const crypto = require('crypto');

function cleanText(value, max = 500) {
    return String(value || '').trim().slice(0, max);
}

function normalizeMetaEmail(value) {
    return cleanText(value, 320).toLowerCase();
}

function normalizeMetaPhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    // Marketel currently serves US properties. Meta expects the country code,
    // while owners commonly enter a ten-digit domestic number.
    if (digits.length === 10) digits = `1${digits}`;
    return digits.slice(0, 15);
}

function hashMetaValue(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function cleanMetaBrowserId(value, kind) {
    const text = cleanText(value, 220);
    if (!text) return '';
    const prefix = kind === 'fbc' ? /^fb\.1\./ : /^fb\.1\./;
    return prefix.test(text) && /^[A-Za-z0-9._-]+$/.test(text) ? text : '';
}

function cleanSourceUrl(value) {
    const text = cleanText(value, 500);
    if (!text) return '';
    try {
        const url = new URL(text);
        return /^https?:$/.test(url.protocol) ? url.toString().slice(0, 500) : '';
    } catch (_) {
        return '';
    }
}

function touchValue(body, key) {
    const latest = body?.journeyLatestTouch && typeof body.journeyLatestTouch === 'object'
        ? body.journeyLatestTouch
        : {};
    const first = body?.journeyFirstTouch && typeof body.journeyFirstTouch === 'object'
        ? body.journeyFirstTouch
        : {};
    return body?.[key] || latest[key] || first[key] || '';
}

function marketelMetaRequestContext(req, cookieValues = {}) {
    const body = req?.body && typeof req.body === 'object' ? req.body : {};
    return {
        fbp: cleanMetaBrowserId(touchValue(body, 'fbp') || cookieValues.fbp, 'fbp'),
        fbc: cleanMetaBrowserId(touchValue(body, 'fbc') || cookieValues.fbc, 'fbc'),
        sourceUrl: cleanSourceUrl(
            body.metaSourceUrl
            || req?.headers?.referer
            || req?.headers?.referrer
            || ''
        ),
    };
}

function buildMarketelCapiEvent(eventName, input = {}) {
    const userData = {};
    const email = normalizeMetaEmail(input.email);
    const phone = normalizeMetaPhone(input.phone);
    const externalId = cleanText(input.externalId, 180).toLowerCase();
    if (email) userData.em = [hashMetaValue(email)];
    if (phone) userData.ph = [hashMetaValue(phone)];
    if (externalId) userData.external_id = [hashMetaValue(externalId)];
    if (input.ip) userData.client_ip_address = cleanText(input.ip, 100);
    if (input.userAgent) userData.client_user_agent = cleanText(input.userAgent, 500);
    const fbp = cleanMetaBrowserId(input.fbp, 'fbp');
    const fbc = cleanMetaBrowserId(input.fbc, 'fbc');
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const event = {
        event_name: cleanText(eventName, 80),
        event_time: Math.max(1, Math.floor(Number(input.eventTime) || Date.now() / 1000)),
        event_id: cleanText(input.eventId, 160) || `${cleanText(eventName, 80).toLowerCase()}.${Date.now()}`,
        action_source: 'website',
        user_data: userData,
    };
    const sourceUrl = cleanSourceUrl(input.sourceUrl);
    if (sourceUrl) event.event_source_url = sourceUrl;

    const value = Number(input.value);
    const customData = {};
    if (Number.isFinite(value) && value >= 0 && input.value !== '' && input.value !== null && input.value !== undefined) {
        customData.value = value;
        customData.currency = cleanText(input.currency || 'USD', 3).toUpperCase();
    }
    const contentName = cleanText(input.contentName, 500);
    if (contentName) customData.content_name = contentName;
    if (Object.keys(customData).length) event.custom_data = customData;
    return event;
}

function marketelCapiRetryDelayMs(attempts) {
    const delays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000, 12 * 60 * 60_000];
    return delays[Math.min(Math.max(0, Number(attempts) - 1), delays.length - 1)];
}

module.exports = {
    buildMarketelCapiEvent,
    cleanMetaBrowserId,
    cleanSourceUrl,
    marketelCapiRetryDelayMs,
    marketelMetaRequestContext,
    normalizeMetaEmail,
    normalizeMetaPhone,
};
