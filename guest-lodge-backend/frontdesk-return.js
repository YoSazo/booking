function buildFrontdeskReturnPath({ hotelId = '', activated = false, reveal = '' } = {}) {
    const params = new URLSearchParams();
    const cleanHotelId = String(hotelId || '').trim();
    if (cleanHotelId) params.set('hotelId', cleanHotelId);
    if (activated) params.set('activated', '1');
    else if (reveal === 'checkout' || reveal === '1') {
        params.set('welcome', '1');
        params.set('reveal', reveal);
    }
    const query = params.toString();
    return `/frontdesk${query ? `?${query}` : ''}`;
}

module.exports = { buildFrontdeskReturnPath };
