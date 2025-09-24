const getCookie = (name) => document.cookie.match(`[; ]?${name}=([^;]*)`)?.[1] || null;
const TRACKING_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/track`;


const ZAPIER_WEBHOOKS = {
    Search: 'https://hooks.zapier.com/hooks/catch/23096608/uu9wu4u/',
    AddToCart: 'https://hooks.zapier.com/hooks/catch/23096608/uu9whix/',
    InitiateCheckout: 'https://hooks.zapier.com/hooks/catch/23096608/umy17ci/',
    // New Webhook for AddPaymentInfo event
    AddPaymentInfo: 'https://hooks.zapier.com/hooks/catch/23096608/u11il0b/',
    Purchase: 'https://hooks.zapier.com/hooks/catch/23096608/umyhejw/',
};

const sendEventToServer = (eventName, payload) => {
    const fullPayload = {
        event_name: eventName,
        event_source_url: window.location.href,
        fbc: getCookie('_fbc'),
        fbp: getCookie('_fbp'),
        ...payload,
    };

    if (navigator.sendBeacon) {
        navigator.sendBeacon(TRACKING_ENDPOINT, JSON.stringify(fullPayload));
    } else {
        fetch(TRACKING_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(fullPayload),
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        });
    }
    console.log(`Sent ${eventName} event to our backend:`, fullPayload);
};

const sendEventToPixel = (pixelEventName, payload, eventID) => {
    if (typeof fbq === 'function') {
        fbq('track', pixelEventName, payload, { eventID: eventID });
        console.log(`Sent ${pixelEventName} Pixel event (Event ID: ${eventID}):`, payload);
    } else {
        console.warn('fbq (Meta Pixel) function not found.');
    }
};

export const trackSearch = (checkinDate, checkoutDate) => {
    const eventID = `search.${Date.now()}`;
    const searchData = {
        checkin_date: checkinDate.toISOString().split('T')[0],
        checkout_date: checkoutDate.toISOString().split('T')[0],
    };
    sendEventToPixel('Search', searchData, eventID);
    sendEventToServer('Search', { ...searchData, event_id: eventID });
};

export const trackAddToCart = (bookingDetails) => {
    const eventID = `addtocart.${Date.now()}`;
    const cartData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        content_ids: [bookingDetails.id],
        num_items: bookingDetails.guests,
    };
    sendEventToPixel('AddToCart', cartData, eventID);
    sendEventToServer('AddToCart', { ...cartData, event_id: eventID });
};

export const trackInitiateCheckout = (bookingDetails) => {
    const eventID = `initiatecheckout.${Date.now()}`;
    const checkoutData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        num_items: bookingDetails.guests,
    };
    sendEventToPixel('InitiateCheckout', checkoutData, eventID);
    sendEventToServer('InitiateCheckout', { ...checkoutData, event_id: eventID });
};

// New tracking function for when a user submits their info and proceeds to payment
export const trackAddPaymentInfo = (bookingDetails, guestInfo) => {
    const eventID = `addpaymentinfo.${Date.now()}`;
    const pixelPayload = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        num_items: bookingDetails.guests,
    };
    const serverPayload = {
        ...pixelPayload,
        event_id: eventID,
        user_data: {
            em: guestInfo.email,
            ph: guestInfo.phone.replace(/\D/g, ''),
            fn: guestInfo.firstName,
            ln: guestInfo.lastName,
        }
    };
    sendEventToPixel('AddPaymentInfo', pixelPayload, eventID);
    sendEventToServer('AddPaymentInfo', serverPayload);
};


export const trackPurchase = (bookingDetails, guestInfo, reservationCode) => {
    const eventID = reservationCode;
    const pixelPayload = {
        value: bookingDetails.total,
        currency: 'USD',
    };
    const serverPayload = {
        ...pixelPayload,
        event_id: eventID,
        user_data: {
            em: guestInfo.email,
            ph: guestInfo.phone.replace(/\D/g, ''),
            fn: guestInfo.firstName,
            ln: guestInfo.lastName,
            ad: {
                ct: guestInfo.city,
                st: guestInfo.state.toLowerCase(),
                zp: guestInfo.zip,
                country: 'us',
            },
        }
    };
    sendEventToPixel('Purchase', pixelPayload, eventID);
    sendEventToServer('Purchase', serverPayload);
};
