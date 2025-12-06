require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const prisma = new PrismaClient();

const allowedOrigins = [
    'https://suitestay.clickinns.com',      // Alloow the non-wwww version
    'https://www.suitestay.clickinns.com', // Allow the www version
    'http://localhost:3000'       ,     // Allow local development
];

const corsOptions = {
    origin: (origin, callback) => {
        // --- This console log will help us debug on Render ---
        console.log("--- CORS CHECK ---");
        console.log("Request Origin:", origin);
        console.log("Allowed Origins:", allowedOrigins);
        // ---------------------------------------------

        // Allow requests with no origin (like mobile apps or curl requests) or from our allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            console.log("CORS Check Passed.");
            callback(null, true);
        } else {
            console.error("CORS Check FAILED.");
            callback(new Error('Not allowed by CORS'));
        }
    }
};



// Webhook needs raw body
app.use('/api/stripe-webhook', express.raw({type: 'application/json'}));
app.use(cors(corsOptions));

app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/stripe-webhook')) {
        next();
    } else {
        express.json()(req, res, next);
    }
});

app.use(express.json());
app.use(express.text());
app.set('trust proxy', true);

const PORT = 3001;
const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY;
const PROPERTY_ID = '100080519237760';

const roomIDMapping = {
    'King Room': {
        roomTypeID: '104645995540719',
        rates: {
            nightly: '104645995540724',
            weekly: '163454677930189',
            monthly: '163455843680424'
        }
    },
    'Double Full Bed': {
        roomTypeID: '104644269441156',
        rates: {
            nightly: '104644269441201',
            weekly: '163455410200730',
            monthly: '163456335478922'
        }
    }
};

const getBestRatePlan = (nights) => {
    if (nights >= 28) {
        return 'monthly';
    }
    if (nights >= 7) {
        return 'weekly';
    }
    return 'nightly';
};


const ZAPIER_URLS = {
    Search: process.env.ZAPIER_SEARCH_URL,
    AddToCart: process.env.ZAPIER_ADDTOCART_URL,
    InitiateCheckout: process.env.ZAPIER_INITIATECHECKOUT_URL,
    AddPaymentInfo: process.env.ZAPIER_PAYMENT_INFO_URL,
    Purchase: process.env.ZAPIER_PURCHASE_URL,
};


// In your server.jss

// File: guest-lodge-backend/server.js

app.post('/api/create-payment-intent', async (req, res) => {
    const { amount, bookingDetails, guestInfo, hotelId } = req.body;
    const amountInCents = Math.round(amount * 100);

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ error: { message: "Invalid amount provided." } });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingDetails: JSON.stringify(bookingDetails),
                guestInfo: JSON.stringify(guestInfo),
                hotelId: hotelId
            }
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe API Error creating payment intent:", error.message);
        res.status(400).send({ error: { message: error.message || "Failed to create payment intent due to an API error." } });
    }
});

app.post('/api/update-payment-intent', async (req, res) => {
  const { clientSecret, guestInfo } = req.body;

  // The clientSecret contains the Payment Intent ID
  const paymentIntentId = clientSecret.split('_secret')[0];

  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        // We only need to update the guestInfo, the bookingDetails are already there
        guestInfo: JSON.stringify(guestInfo)
      }
    });
    res.send({ success: true });
  } catch (error) {
    console.error("Failed to update payment intent:", error.message);
    res.status(400).send({ success: false, error: { message: error.message } });
  }
});

// NEW: Create pre-authorization hold for "Reserve Now, Pay Later"
app.post('/api/create-preauth-hold', async (req, res) => {
    const { bookingDetails, guestInfo, hotelId } = req.body;
    
    const noShowFeeInCents = 7590; // $75.90

    try {
        // Create a PaymentIntent with manual capture
        // This places a hold on the card without charging
        const paymentIntent = await stripe.paymentIntents.create({
            amount: noShowFeeInCents,
            currency: 'usd',
            capture_method: 'manual', // 🔑 KEY: This creates a hold instead of charging
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingDetails: JSON.stringify(bookingDetails),
                guestInfo: JSON.stringify(guestInfo),
                hotelId: hotelId,
                bookingType: 'payLater',
                noShowFeeAmount: '7590',
                holdType: 'pre_authorization'
            },
            description: `Pre-authorization hold for ${bookingDetails.roomName} - ${bookingDetails.nights} nights`
        });
        
        res.send({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error("Stripe API Error creating pre-auth hold:", error.message);
        res.status(400).send({ 
            error: { message: error.message || "Failed to create pre-authorization hold." } 
        });
    }
});

// NEW: Complete pay later booking after pre-auth hold succeeds
app.post('/api/complete-pay-later-booking', async (req, res) => {
    const { paymentIntentId, guestInfo, bookingDetails, hotelId } = req.body;

    try {
        // Verify the payment intent is authorized (not captured)
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'requires_capture') {
            return res.status(400).json({ 
                success: false, 
                message: 'Pre-authorization hold not successful.' 
            });
        }

        // Create booking in Cloudbeds with "Pay at Hotel" status
        const reservationData = {
            propertyID: PROPERTY_ID,
            startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
            endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
            guestFirstName: guestInfo.firstName,
            guestLastName: guestInfo.lastName,
            guestCountry: 'US',
            guestZip: guestInfo.zip,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            paymentMethod: "cash", // Marked as pay at hotel
            sendEmailConfirmation: "true",
            rooms: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: 1, 
                roomRateID: bookingDetails.rateID 
            }]),
            adults: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: bookingDetails.guests 
            }]),
            children: JSON.stringify([{ 
                roomTypeID: bookingDetails.roomTypeID, 
                quantity: 0 
            }]),
        };

        const pmsResponse = await axios.post(
            'https://api.cloudbeds.com/api/v1.3/postReservation',
            new URLSearchParams(reservationData),
            {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
                    'content-type': 'application/x-www-form-urlencoded',
                }
            }
        );

        if (pmsResponse.data.success) {
            // Save to database
            await prisma.booking.create({
                data: {
                    stripePaymentIntentId: paymentIntentId,
                    ourReservationCode: bookingDetails.reservationCode,
                    pmsConfirmationCode: pmsResponse.data.reservationID,
                    hotelId: hotelId,
                    roomName: bookingDetails.name || bookingDetails.roomName,
                    bookingType: 'payLater',
                    checkinDate: new Date(bookingDetails.checkin),
                    checkoutDate: new Date(bookingDetails.checkout),
                    nights: bookingDetails.nights,
                    guestFirstName: guestInfo.firstName,
                    guestLastName: guestInfo.lastName,
                    guestEmail: guestInfo.email,
                    guestPhone: guestInfo.phone,
                    subtotal: bookingDetails.subtotal,
                    taxesAndFees: bookingDetails.taxes,
                    grandTotal: bookingDetails.total,
                    amountPaidNow: 0,
                    preAuthHoldAmount: 75.90,
                    holdStatus: 'active'
                }
            });

            res.json({
                success: true,
                message: 'Reservation created successfully. $75.90 hold placed on card.',
                reservationCode: pmsResponse.data.reservationID
            });
        } else {
            // If booking fails, cancel the hold
            await stripe.paymentIntents.cancel(paymentIntentId);
            
            res.status(400).json({
                success: false,
                message: pmsResponse.data.message || 'Failed to create reservation.'
            });
        }

    } catch (error) {
        console.error("Error completing pay later booking:", error.response?.data || error.message);
        console.error("Full error stack:", error.stack);
        
        // Try to cancel hold if something went wrong
        try {
            await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (cancelError) {
            console.error("Failed to cancel hold:", cancelError.message);
        }
        
        // Return detailed error for debugging
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || error.message || 'Failed to complete reservation.',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// NEW: Release pre-auth hold when guest checks in
app.post('/api/release-hold', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking || booking.bookingType !== 'payLater') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid booking or not a pay-later reservation.' 
            });
        }

        if (booking.holdStatus !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Hold already released or captured.' 
            });
        }

        // Cancel the payment intent to release the hold
        await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);

        // Update booking record
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                holdStatus: 'released',
                holdReleasedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Pre-authorization hold released successfully.'
        });

    } catch (error) {
        console.error("Error releasing hold:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to release hold.' 
        });
    }
});

// NEW: Capture pre-auth hold as no-show fee
app.post('/api/capture-no-show-fee', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking || booking.bookingType !== 'payLater') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid booking or not a pay-later reservation.' 
            });
        }

        if (booking.holdStatus !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Hold already released or captured.' 
            });
        }

        // Capture the held funds
        const paymentIntent = await stripe.paymentIntents.capture(
            booking.stripePaymentIntentId,
            {
                amount_to_capture: 7590 // Capture the full $75.90
            }
        );

        // Update booking record
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                holdStatus: 'captured',
                holdCapturedAt: new Date(),
                noShowFeePaid: true
            }
        });

        res.json({
            success: true,
            message: 'No-show fee of $75.90 charged successfully.',
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error("Error capturing no-show fee:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to capture no-show fee.' 
        });
    }
});



// REPLACE your entire webhook with this one:
app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('💰 Payment succeeded via webhook:', paymentIntent.id);

        try {
            // --- THIS IS THE CRUCIAL FIX ---
            // Wait for 5 seconds to give the frontend API call a head start to finish.
            console.log('Webhook is pausing for 5 seconds to allow frontend to complete...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Now, check if the frontend already created the booking record.
            const existingBooking = await prisma.booking.findUnique({
                where: { stripePaymentIntentId: paymentIntent.id }
            });

            if (existingBooking) {
                // If the record exists, the frontend was successful. Our job is done.
                console.log('✅ Frontend call was successful. Webhook signing off. No duplicates created.');
                return res.json({ received: true });
            }

            // If no record exists, it means the frontend call failed.
            // The webhook must now create the booking as a backup.
            console.log('⚠️ Frontend booking record not found. Creating backup booking...');
            const metadata = paymentIntent.metadata;
            const bookingDetails = JSON.parse(metadata.bookingDetails);
            const guestInfo = JSON.parse(metadata.guestInfo);
            const hotelId = metadata.hotelId;

            // 1. Create the booking in Cloudbeds
            const reservationData = {
                propertyID: PROPERTY_ID,
                startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
                endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
                guestFirstName: guestInfo.firstName,
                guestLastName: guestInfo.lastName,
                guestCountry: 'US',
                guestZip: guestInfo.zip,
                guestEmail: guestInfo.email,
                guestPhone: guestInfo.phone,
                paymentMethod: "cash",
                sendEmailConfirmation: "true",
                rooms: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: 1, roomRateID: bookingDetails.rateID }]),
                adults: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: bookingDetails.guests }]),
                children: JSON.stringify([{ roomTypeID: bookingDetails.roomTypeID, quantity: 0 }]),
            };

            const pmsResponse = await axios.post(
                'https://api.cloudbeds.com/api/v1.3/postReservation',
                new URLSearchParams(reservationData),
                { headers: { 'accept': 'application/json', 'authorization': `Bearer ${CLOUDBEDS_API_KEY}`, 'content-type': 'application/x-www-form-urlencoded' } }
            );

            // 2. If Cloudbeds booking is successful, save the record to our database.
            if (pmsResponse.data.success) {
                console.log('✅ Backup booking created in Cloudbeds via webhook:', pmsResponse.data.reservationID);

                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntent.id,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.data.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: bookingDetails.bookingType || 'standard', // 🆕 Save booking type
                        checkinDate: new Date(bookingDetails.checkin),
                        checkoutDate: new Date(bookingDetails.checkout),
                        nights: bookingDetails.nights,
                        guestFirstName: guestInfo.firstName,
                        guestLastName: guestInfo.lastName,
                        guestEmail: guestInfo.email,
                        guestPhone: guestInfo.phone,
                        subtotal: bookingDetails.subtotal,
                        taxesAndFees: bookingDetails.taxes,
                        grandTotal: bookingDetails.total
                    }
                });
                console.log('✅ Backup booking record saved to DB by webhook.');

                // 3. Fire the purchase event since the webhook did the work.
                if (process.env.ZAPIER_PURCHASE_URL) {
                    await axios.post(process.env.ZAPIER_PURCHASE_URL, { /* ...your zapier data... */ });
                    console.log('✅ Purchase event fired via webhook.');
                }
            }
        } catch (error) {
            // This will catch any unexpected errors during the backup process.
            console.error('❌ A critical error occurred in the webhook backup process:', error);
        }
    }

    // Always respond with 200 to Stripe to prevent retries.
    res.json({ received: true });
});


// --- API ENDPOINTS ---
app.post('/api/availability', async (req, res) => {
    const { hotelId, checkin, checkout } = req.body;
    if (hotelId !== 'suite-stay') {
        return res.status(400).json({ success: false, message: 'This endpoint is only for Home Place Suites.' });
    }
    const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const ratePlanType = getBestRatePlan(nights);

    try {
        const availabilityPromises = Object.entries(roomIDMapping).map(async ([roomName, ids]) => {
            const currentRateID = ids.rates[ratePlanType];
            const url = `https://hotels.cloudbeds.com/api/v1.2/getRatePlans?property_id=${PROPERTY_ID}&startDate=${checkin}&endDate=${checkout}&detailedRates=true&roomTypeID=${ids.roomTypeID}`;
            
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${CLOUDBEDS_API_KEY}` }
            });
            
            const specificRatePlan = response.data.data.find(rate => rate.rateID === currentRateID);

            return {
                roomName: roomName,
                available: specificRatePlan ? specificRatePlan.roomsAvailable > 0 : false,
                roomsAvailable: specificRatePlan ? specificRatePlan.roomsAvailable : 0,
                rateID: currentRateID,
                roomTypeID: ids.roomTypeID
            };
        });

        const availableRooms = await Promise.all(availabilityPromises);
        res.json({ success: true, data: availableRooms.filter(room => room.available) });

    } catch (error) {
        console.error("Error fetching availability from Cloudbeds:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
    }
});

app.post('/api/book', async (req, res) => {
    const { hotelId, bookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (hotelId !== 'suite-stay') {
         return res.status(400).json({ success: false, message: 'This endpoint is only for Home Place Suites.' });
    }

    const isTrial = bookingDetails.bookingType === 'trial';

    let rateIDToUse = bookingDetails.rateID;

    if (isTrial && bookingDetails.useNightlyRate) {
        // Find the room's nightly rate ID
        const roomMapping = Object.entries(roomIDMapping).find(
            ([name, ids]) => ids.roomTypeID === bookingDetails.roomTypeID
        );
        
        if (roomMapping) {
            rateIDToUse = roomMapping[1].rates.nightly; // Use nightly rate
            console.log(`✅ Trial booking - switching to nightly rate: ${rateIDToUse}`);
        }
    }
    
    if (!bookingDetails.rateID) {
        return res.status(400).json({ success: false, message: 'Invalid room name provided.' });
    }
    
    const reservationData = {
        propertyID: PROPERTY_ID,
        startDate: new Date(bookingDetails.checkin).toISOString().split('T')[0],
        endDate: new Date(bookingDetails.checkout).toISOString().split('T')[0],
        guestFirstName: guestInfo.firstName,
        guestLastName: guestInfo.lastName,
        guestCountry: 'US',
        guestZip: guestInfo.zip,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        paymentMethod: "cash",
        sendEmailConfirmation: "true",
        rooms: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: 1, 
            roomRateID: rateIDToUse  
        }]),
        adults: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: bookingDetails.guests 
        }]),
        children: JSON.stringify([{ 
            roomTypeID: bookingDetails.roomTypeID, 
            quantity: 0 
        }]),
    };

    try {
        const pmsResponse = await axios.post('https://api.cloudbeds.com/api/v1.3/postReservation', new URLSearchParams(reservationData), {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
                'content-type': 'application/x-www-form-urlencoded',
            }
        });

        if (pmsResponse.data.success) {
            // Save to database
            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.data.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: bookingDetails.bookingType || 'standard', // 🆕 Save booking type
                        checkinDate: new Date(bookingDetails.checkin),
                        checkoutDate: new Date(bookingDetails.checkout),
                        nights: bookingDetails.nights,
                        guestFirstName: guestInfo.firstName,
                        guestLastName: guestInfo.lastName,
                        guestEmail: guestInfo.email,
                        guestPhone: guestInfo.phone,
                        subtotal: bookingDetails.subtotal,
                        taxesAndFees: bookingDetails.taxes,
                        grandTotal: bookingDetails.total
                    }
                });
            } catch (dbError) {
                console.error("Failed to save to database:", dbError);
            }
        }
        
        res.json({
            success: pmsResponse.data.success,
            message: pmsResponse.data.success ? 'Reservation created successfully.' : pmsResponse.data.message,
            reservationCode: pmsResponse.data.reservationID,
            pmsResponse: pmsResponse.data
        });

    } catch (error) {
        console.error("Error creating reservation:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to create reservation.' });
    }
});


app.post('/api/track', async (req, res) => {
    let body;
    try {
        body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body;
    } catch (e) {
        console.error("Failed to parse tracking request body:", req.body);
        return res.status(400).json({ success: false, message: "Invalid request format." });
    }

    if (!body || Object.keys(body).length === 0) {
        return res.status(200).send({ success: true, message: "Empty track request ignored." });
    }

    const { event_name, ...eventData } = body;
    const webhookUrl = ZAPIER_URLS[event_name];

    if (!webhookUrl) {
        const errorMessage = `Received track request for unknown event: '${event_name}'`;
        console.error(errorMessage);
        return res.status(400).json({ success: false, message: errorMessage });
    }
    if (!webhookUrl.startsWith('https://hooks.zapier.com')) {
        const errorMessage = `The webhook URL for '${event_name}' seems to be missing or incorrect in your .env file.`;
        console.error(errorMessage);
        return res.status(500).json({ success: false, message: errorMessage });
    }

    // Add event_time as Unix timestamp (required for accurate Meta tracking)
    const enrichedPayload = { 
        ...eventData, 
        event_time: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        client_ip_address: req.ip, 
        user_agent: req.headers['user-agent'] 
    };
    
    try {
        await axios.post(webhookUrl, enrichedPayload);
        console.log(`Successfully forwarded '${event_name}' event to Zapier with IP: ${req.ip} and event_time: ${enrichedPayload.event_time}`);
        res.status(200).json({ success: true, message: 'Event tracked.' });
    } catch (error) {
        console.error(`Failed to forward event to Zapier for '${event_name}'. Status: ${error.response?.status}. Message: ${error.message}`);
        res.status(500).json({ success: false, message: 'Event tracking failed on the server.' });
    }
});


app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

