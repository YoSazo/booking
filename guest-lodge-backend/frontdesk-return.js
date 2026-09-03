function buildFrontdeskReturnPath({ hotelId = '', activated = false, reveal = '', checkoutCancelled = false } = {}) {
    const params = new URLSearchParams();
    const cleanHotelId = String(hotelId || '').trim();
    if (cleanHotelId) params.set('hotelId', cleanHotelId);
    if (activated) params.set('activated', '1');
    else if (reveal === 'checkout' || reveal === '1' || /^step-[0-2]$/.test(String(reveal))) {
        // The value reveal replaced the legacy Front Desk welcome walkthrough.
        // Sending both flags lets the old modal compete with (and, if the
        // reveal chunk is delayed, visibly replace) the actual setup payoff.
        // A reveal return is therefore one destination, never two.
        params.set('reveal', reveal);
    }
    if (checkoutCancelled) params.set('checkoutCancelled', '1');
    const query = params.toString();
    return `/frontdesk${query ? `?${query}` : ''}`;
}

module.exports = { buildFrontdeskReturnPath };
