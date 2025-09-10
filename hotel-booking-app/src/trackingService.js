const getCookie = (name) => document.cookie.match(`[; ]?${name}=([^;]*)`)?.[1] || null;

const ZAPIER_WEBHOOKS = {
    Search: 'https://hooks.zapier.com/hooks/catch/YOUR_SEARCH_WEBHOOK_URL/',
    AddToCart: 'https://hooks.zapier.com/hooks/catch/YOUR_ADDTOCART_WEBHOOK_URL/',
    InitiateCheckout: 'https://hooks.zapier.com/hooks/catch/YOUR_INITIATECHECKOUT_WEBHOOK_URL/',
    Purchase: 'https://hooks.zapier.com/hooks/catch/YOUR_PURCHASE_WEBHOOK_URL/',
};

// --- UPDATED: This function now accepts an optional custom eventID ---
const sendEvent = (eventName, pixelEventName, capiPayload, pixelPayload, customEventID = null) => {
    // Use the custom ID if provided (for Purchases), otherwise generate one.
    const eventID = customEventID || `${eventName.toLowerCase()}.${Date.now()}`;

    // --- 1. Send to Zapier (Server-Side CAPI) ---
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

    // --- 2. Send to Meta Pixel (Browser-Side) ---
    if (typeof fbq === 'function') {
        fbq('track', pixelEventName, pixelPayload, { eventID: eventID });
        console.log(`Sent ${pixelEventName} Pixel event (Event ID: ${eventID}):`, pixelPayload);
    } else {
        console.warn('fbq (Meta Pixel) function not found.');
    }
};

// ... (trackSearch, trackAddToCart, trackInitiateCheckout functions are the same)
export const trackSearch = (checkinDate, checkoutDate) => { /* ... */ };
export const trackAddToCart = (bookingDetails) => { /* ... */ };
export const trackInitiateCheckout = (bookingDetails) => { /* ... */ };


export const trackPurchase = (bookingDetails, guestInfo, reservationCode) => {
    const capiPayload = {
        user_data: {
            em: guestInfo.email, ph: guestInfo.phone.replace(/\D/g, ''), fn: guestInfo.firstName, ln: guestInfo.lastName,
            ad: { ct: guestInfo.city, st: guestInfo.state.toLowerCase(), zp: guestInfo.zip, country: 'us' },
            client_ip_address: null, client_user_agent: navigator.userAgent,
        }
    };
    const pixelPayload = { value: bookingDetails.total, currency: 'USD' };
    
    // --- UPDATED: We now pass the reservationCode as the customEventID ---
    sendEvent('Purchase', 'Purchase', 
        { ...pixelPayload, ...capiPayload },
        pixelPayload,
        reservationCode // This will now be used as the event_id
    );
};