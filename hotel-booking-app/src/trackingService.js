const getCookie = (name) => document.cookie.match(`[; ]?${name}=([^;]*)`)?.[1] || null;

const ZAPIER_WEBHOOKS = {
    Search: 'https://hooks.zapier.com/hooks/catch/YOUR_SEARCH_WEBHOOK_URL/',
    AddToCart: 'https://hooks.zapier.com/hooks/catch/YOUR_ADDTOCART_WEBHOOK_URL/',
    InitiateCheckout: 'https://hooks.zapier.com/hooks/catch/YOUR_INITIATECHECKOUT_WEBHOOK_URL/',
    Purchase: 'https://hooks.zapier.com/hooks/catch/YOUR_PURCHASE_WEBHOOK_URL/',
};

const sendEvent = (eventName, pixelEventName, capiPayload, pixelPayload, customEventID = null) => {
    const eventID = customEventID || `${eventName.toLowerCase()}.${Date.now()}`;
    const webhookUrl = ZAPIER_WEBHOOKS[eventName];
    
    if (!webhookUrl || !webhookUrl.includes('zapier.com')) {
        console.error(`Webhook for ${eventName} not found or is a placeholder.`);
    } else {
        const fullCapiPayload = {
            event_name: eventName,
            event_id: eventID,
            event_source_url: window.location.href,
            fbc: getCookie('_fbc'),
            fbp: getCookie('_fbp'),
            ...capiPayload,
        };
        if (navigator.sendBeacon) {
            navigator.sendBeacon(webhookUrl, JSON.stringify(fullCapiPayload));
        } else {
            fetch(webhookUrl, { method: 'POST', body: JSON.stringify(fullCapiPayload), keepalive: true });
        }
        console.log(`Sent ${eventName} CAPI event to Zapier (Event ID: ${eventID}):`, fullCapiPayload);
    }

    if (typeof fbq === 'function') {
        fbq('track', pixelEventName, pixelPayload, { eventID: eventID });
        console.log(`Sent ${pixelEventName} Pixel event (Event ID: ${eventID}):`, pixelPayload);
    } else {
        console.warn('fbq (Meta Pixel) function not found.');
    }
};

// --- FIXED: Restored the full function body ---
export const trackSearch = (checkinDate, checkoutDate) => {
    const searchData = {
        checkin_date: checkinDate.toISOString().split('T')[0],
        checkout_date: checkoutDate.toISOString().split('T')[0],
    };
    sendEvent('Search', 'Search', 
        { ...searchData, user_agent: navigator.userAgent, client_ip_address: null },
        searchData
    );
};

// --- FIXED: Restored the full function body ---
export const trackAddToCart = (bookingDetails) => {
    const cartData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        content_ids: [bookingDetails.id],
        num_items: bookingDetails.guests,
    };
    sendEvent('AddToCart', 'AddToCart', 
        { ...cartData, user_agent: navigator.userAgent, client_ip_address: null },
        cartData
    );
};

// --- FIXED: Restored the full function body ---
export const trackInitiateCheckout = (bookingDetails) => {
    const checkoutData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        num_items: bookingDetails.guests,
    };
    sendEvent('InitiateCheckout', 'InitiateCheckout', 
        { ...checkoutData, user_agent: navigator.userAgent, client_ip_address: null },
        checkoutData
    );
};

export const trackPurchase = (bookingDetails, guestInfo, reservationCode) => {
    const capiPayload = {
        user_data: {
            em: guestInfo.email, ph: guestInfo.phone.replace(/\D/g, ''), fn: guestInfo.firstName, ln: guestInfo.lastName,
            ad: { ct: guestInfo.city, st: guestInfo.state.toLowerCase(), zp: guestInfo.zip, country: 'us' },
            client_ip_address: null, client_user_agent: navigator.userAgent,
        }
    };
    const pixelPayload = { value: bookingDetails.total, currency: 'USD' };
    
    sendEvent('Purchase', 'Purchase', 
        { ...pixelPayload, ...capiPayload },
        pixelPayload,
        reservationCode
    );
};