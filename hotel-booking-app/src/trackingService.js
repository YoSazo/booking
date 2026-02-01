// Track which events have fired this session
const getSessionEvents = () => {
  const stored = sessionStorage.getItem('firedEvents');
  return stored ? JSON.parse(stored) : {
    PageView: false,
    Search: false,
    AddToCart: false,
    InitiateCheckout: false,
    AddPaymentInfo: false,
    Purchase: false
  };
};

const saveSessionEvent = (eventName) => {
  const events = getSessionEvents();
  events[eventName] = true;
  sessionStorage.setItem('firedEvents', JSON.stringify(events));
};

const shouldFireEvent = (eventName) => {
  const events = getSessionEvents();
  if (events[eventName]) {
    console.log(`⚠️ ${eventName} already fired this session - skipping`);
    return false;
  }
  saveSessionEvent(eventName);
  return true;
};

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
    // Try multiple sources for fbc
    let fbc = getCookie('_fbc') || sessionStorage.getItem('_fbc');
    
    // If still missing, try to reconstruct from fbclid
    if (!fbc) {
        const fbclid = sessionStorage.getItem('fbclid');
        if (fbclid) {
            fbc = `fb.1.${Date.now()}.${fbclid}`;
            // Try to set cookie again
            setCookie('_fbc', fbc, 90);
        }
    }
    
    const fullPayload = {
        event_name: eventName,
        event_source_url: window.location.href,
        fbc: fbc,
        fbp: getCookie('_fbp'),
        ...payload,
        user_data: { 
            ...payload.user_data,
            external_id: getExternalId(),
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
    console.log(`Sent ${eventName} event:`, fullPayload);
};

// Send events to Google Analytics 4
const sendEventToGA4 = (eventName, payload) => {
    if (typeof gtag === 'function') {
        gtag('event', eventName, payload);
        console.log(`Sent ${eventName} GA4 event:`, payload);
    } else {
        console.warn('gtag (Google Analytics) function not found.');
    }
};


// --- 3. (RECOMMENDED) ADD A PageView EVENT ---
// This ensures the external_id is created as soon as a user lands on your site.

export const trackPageView = () => {
    if (!shouldFireEvent('PageView')) return;
    const eventID = `pageview.${Date.now()}`;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    sendEventToServer('PageView', { event_id: eventID, event_time: eventTime });
    sendEventToPixel('PageView', {}, eventID); 

    sendEventToGA4('page_view', {
        page_location: window.location.href,
        page_title: document.title
    });
};


// --- NO CHANGES NEEDED BELOW THIS LINE ---
// The rest of your tracking functions (trackSearch, trackAddToCart, etc.) 
// will now automatically include the external_id.

const sendEventToPixel = (pixelEventName, payload, eventID) => {
    if (typeof fbq === 'function') {
        // Create a copy of the payload to avoid mutating the original object
        const pixelPayload = { ...payload };

        // Ensure the user_data object exists
        if (!pixelPayload.user_data) {
            pixelPayload.user_data = {};
        }

        // Add the external_id to the user_data object
        pixelPayload.user_data.external_id = getExternalId();

        fbq('track', pixelEventName, pixelPayload, { eventID: eventID });
        console.log(`Sent ${pixelEventName} Pixel event (Event ID: ${eventID}):`, pixelPayload);
    } else {
        console.warn('fbq (Meta Pixel) function not found.');
    }
};

export const trackSearch = (checkinDate, checkoutDate) => {
    // Don't use shouldFireEvent for Search - allow multiple searches per session
    const eventID = `search.${Date.now()}`;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const searchData = {
        checkin_date: checkinDate.toISOString().split('T')[0],
        checkout_date: checkoutDate.toISOString().split('T')[0],
    };
    sendEventToPixel('Search', searchData, eventID);
    sendEventToServer('Search', { ...searchData, event_id: eventID, event_time: eventTime });

    sendEventToGA4('search', {
        search_term: `${searchData.checkin_date} to ${searchData.checkout_date}`,
        checkin_date: searchData.checkin_date,
        checkout_date: searchData.checkout_date
    });
    
    console.log(`✅ Search event fired for ${searchData.checkin_date} to ${searchData.checkout_date}`);
};

export const trackAddToCart = (bookingDetails) => {
    // Don't use shouldFireEvent for AddToCart - allow multiple room selections per session
    const eventID = `addtocart.${Date.now()}`;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const cartData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        content_ids: [bookingDetails.id],
        num_items: bookingDetails.guests,
    };
    sendEventToPixel('AddToCart', cartData, eventID);
    sendEventToServer('AddToCart', { ...cartData, event_id: eventID, event_time: eventTime });

    sendEventToGA4('add_to_cart', {
        currency: 'USD',
        value: bookingDetails.subtotal,
        items: [{
            item_id: bookingDetails.id,
            item_name: bookingDetails.name,
            quantity: bookingDetails.guests,
            price: bookingDetails.subtotal
        }]
    });
    
    console.log(`✅ AddToCart event fired for ${bookingDetails.name} - $${bookingDetails.subtotal}`);
};

export const trackInitiateCheckout = (bookingDetails) => {
    if (!shouldFireEvent('InitiateCheckout')) return;
    const eventID = `initiatecheckout.${Date.now()}`;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const checkoutData = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        num_items: bookingDetails.guests,
    };
    sendEventToPixel('InitiateCheckout', checkoutData, eventID);
    sendEventToServer('InitiateCheckout', { ...checkoutData, event_id: eventID, event_time: eventTime });

    sendEventToGA4('begin_checkout', {
        currency: 'USD',
        value: bookingDetails.subtotal,
        items: [{
            item_id: bookingDetails.id,
            item_name: bookingDetails.name,
            quantity: bookingDetails.guests,
            price: bookingDetails.subtotal
        }]
    });
};

export const trackAddPaymentInfo = (bookingDetails, guestInfo) => {
    if (!shouldFireEvent('AddPaymentInfo')) return;
    const eventID = `addpaymentinfo.${Date.now()}`;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    // Reserve-for-$0 funnel: treat AddPaymentInfo as "reached payment step" / "ready to reserve".
    // Avoid relying on sessionStorage plan state (trial/reserve/full) since the primary offer is payLater.
    const plan = 'payLater';

    const pixelPayload = {
        value: bookingDetails.subtotal,
        currency: 'USD',
        content_name: bookingDetails.name,
        num_items: bookingDetails.guests,
        content_type: plan,
    };

    const serverPayload = {
        ...pixelPayload,
        event_id: eventID,
        event_time: eventTime,
        nights: bookingDetails.nights,
        plan_selected: plan,
        checkin_date: bookingDetails.checkin ? new Date(bookingDetails.checkin).toISOString().split('T')[0] : null,
        checkout_date: bookingDetails.checkout ? new Date(bookingDetails.checkout).toISOString().split('T')[0] : null,
        user_data: {
            em: guestInfo.email,
            ph: guestInfo.phone.replace(/\D/g, ''),
            fn: guestInfo.firstName,
            ln: guestInfo.lastName,
        }
    };

    sendEventToPixel('AddPaymentInfo', pixelPayload, eventID);
    sendEventToServer('AddPaymentInfo', serverPayload);

    sendEventToGA4('add_payment_info', {
        currency: 'USD',
        value: bookingDetails.subtotal,
        items: [{
            item_id: bookingDetails.id,
            item_name: bookingDetails.name,
            quantity: bookingDetails.guests,
            price: bookingDetails.subtotal
        }]
    });
};


export const trackPurchase = (bookingDetails, guestInfo, reservationCode) => {
    if (!shouldFireEvent('Purchase')) return;
    const eventID = reservationCode;
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const totalAmount = (bookingDetails.subtotal || 0) + (bookingDetails.taxes || 0);
    
    // Pixel payload (browser-side) - doesn't include PII
    const pixelPayload = {
        value: totalAmount,
        currency: 'USD',
        content_name: bookingDetails.name,
        content_ids: [bookingDetails.id],
        content_type: 'product',
        num_items: bookingDetails.guests,
    };
    
    // Server payload (includes PII for better matching)
    const serverPayload = {
        value: totalAmount,
        currency: 'USD',
        event_id: eventID,
        event_time: eventTime,
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
    
    // Send to BOTH browser pixel AND server (Meta deduplicates using eventID)
    sendEventToPixel('Purchase', pixelPayload, eventID);
    sendEventToServer('Purchase', serverPayload);
    console.log('Purchase event sent to both browser and server with event_id:', eventID);

    sendEventToGA4('purchase', {
        transaction_id: reservationCode,
        value: bookingDetails.total,
        currency: 'USD',
        items: [{
            item_id: bookingDetails.id,
            item_name: bookingDetails.name,
            quantity: bookingDetails.guests,
            price: bookingDetails.subtotal
        }]
    });
};