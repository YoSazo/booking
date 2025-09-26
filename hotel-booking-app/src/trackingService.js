// hotel-booking-app/src/trackingService.js

// --- 1. ADD HELPER FUNCTIONS AT THE TOP ---

// A simple function to generate a unique ID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// A function to set a cookie that lasts for a specified number of days
const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

const getCookie = (name) => document.cookie.match(`[; ]?${name}=([^;]*)`)?.[1] || null;

// This function gets the existing external_id from a cookie or creates a new one.
const getExternalId = () => {
    let externalId = getCookie('external_id');
    if (!externalId) {
        // Create a new ID if one doesn't exist
        externalId = `extid.${Date.now()}.${generateUUID()}`;
        // Store the new ID in a cookie for 1 year
        setCookie('external_id', externalId, 365); 
    }
    return externalId;
};


// --- 2. UPDATE THE sendEventToServer FUNCTION ---

const TRACKING_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/track`;

const ZAPIER_WEBHOOKS = {
    Search: 'https://hooks.zapier.com/hooks/catch/23096608/uu9wu4u/',
    AddToCart: 'https://hooks.zapier.com/hooks/catch/23096608/uu9whix/',
    InitiateCheckout: 'https://hooks.zapier.com/hooks/catch/23096608/umy17ci/',
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
        // Ensure the user_data object exists and add the external_id to it
        user_data: { 
            ...payload.user_data,
            external_id: getExternalId(), // <-- ADD THE EXTERNAL ID HERE
        }
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


// --- 3. (RECOMMENDED) ADD A PageView EVENT ---
// This ensures the external_id is created as soon as a user lands on your site.

export const trackPageView = () => {
    const eventID = `pageview.${Date.now()}`;
    // The external_id will be added automatically by sendEventToServer
    sendEventToServer('PageView', { event_id: eventID }); 
    
    if (typeof fbq === 'function') {
        fbq('track', 'PageView', {}, { eventID: eventID });
    }
};


// --- NO CHANGES NEEDED BELOW THIS LINE ---
// The rest of your tracking functions (trackSearch, trackAddToCart, etc.) 
// will now automatically include the external_id.

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