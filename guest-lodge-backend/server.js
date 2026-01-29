require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const xml2js = require('xml2js');
const http = require('http');
const https = require('https');

const app = express();
const prisma = new PrismaClient();

const allowedOrigins = [
    'https://suitestay.clickinns.com',
    'https://www.suitestay.clickinns.com',
    'https://homeplacesuites.clickinns.com',
    'https://www.homeplacesuites.clickinns.com',
    'https://myhomeplacesuites.com',
    'https://www.myhomeplacesuites.com',
    'https://guestlodgeminot.clickinns.com',
    'https://stcroix.clickinns.com',
    'https://clickinns.com',
    'https://www.clickinns.com',
    'http://localhost:3000',
    'http://localhost:5173',
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

// BookingCenter (SOAP/XML) - use BCDEMO creds for test environment
// Jeff: "You can only use BCDEMO in the TEST system"
const BOOKINGCENTER_TEST_SITE_ID = process.env.BOOKINGCENTER_TEST_SITE_ID || 'BCDEMO';
const BOOKINGCENTER_TEST_PASSWORD = process.env.BOOKINGCENTER_TEST_PASSWORD || 'expdistrobook21';
const BOOKINGCENTER_TEST_CHAIN_CODE = process.env.BOOKINGCENTER_TEST_CHAIN_CODE || 'BC';

const BOOKINGCENTER_ENDPOINTS = {
    // Defaults to test endpoints; override in Render env for production.
    availability: process.env.BOOKINGCENTER_AVAILABILITY_ENDPOINT || 'https://ws-server-test.bookingcenter.com/hotel_availability.php',
    booking: process.env.BOOKINGCENTER_BOOKING_ENDPOINT || 'https://ws-server-test.bookingcenter.com/new_booking.php',
};

// BookingCenter receipt type codes (site_receipt_types.phtml)
// Jeff: use an overlap like WOFF in both BCDEMO and STCROIX for initial integration.
// Default to PF (Phone or Fax) in BCDEMO since it doesn't require real card details.
// You can override via env per site once STCROIX is enabled.
const BOOKINGCENTER_TEST_RECEIPT_TYPE = process.env.BOOKINGCENTER_TEST_RECEIPT_TYPE || 'PF';


// Multi-hotel configuration
const hotelConfig = {
    'suite-stay': {
        pms: 'cloudbeds',
        propertyId: '100080519237760',
        roomIDMapping: {
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
        }
    },
    'home-place-suites': {
        pms: 'cloudbeds',
        propertyId: '113548817731712',
        roomIDMapping: {
            'Single King Room': {
                roomTypeID: '117057244229790',
                rates: {
                    nightly: '117057244229790', // Update with actual rate IDs
                    weekly: '117057244229790',
                    monthly: '117057244229790'
                }
            },
            'Double Queen Room': {
                roomTypeID: '116355544711397',
                rates: {
                    nightly: '116355544711397',
                    weekly: '116355544711397',
                    monthly: '116355544711397'
                }
            },
            'Double Queen Suite With Kitchenette': {
                roomTypeID: '117068633694351',
                rates: {
                    nightly: '117068633694351',
                    weekly: '117068633694351',
                    monthly: '117068633694351'
                }
            }
        }
    },
    'guest-lodge-minot': {
        pms: 'bookingcenter',
        siteId: process.env.BOOKINGCENTER_MINOT_SITE_ID,
        // Room mappings will be added once BookingCenter API is set up
        roomIDMapping: {}
    },
    'st-croix-wisconsin': {
        pms: 'bookingcenter',
        siteId: process.env.BOOKINGCENTER_STCROIX_SITE_ID || 'STCROIX',
        sitePassword: process.env.BOOKINGCENTER_STCROIX_SITE_PASSWORD,
        chainCode: process.env.BOOKINGCENTER_STCROIX_CHAIN_CODE || process.env.BOOKINGCENTER_CHAIN_CODE || 'BC',
        // Room mappings will be added once BookingCenter API is set up
        roomIDMapping: {}
    }
};

// Helper to get hotel config
const getHotelConfig = (hotelId) => {
    const config = hotelConfig[hotelId];
    if (!config) {
        throw new Error(`Hotel configuration not found for: ${hotelId}`);
    }
    return config;
};

// Legacy mapping for backwards compatibility (will be removed)
const roomIDMapping = hotelConfig['suite-stay'].roomIDMapping;
const PROPERTY_ID = hotelConfig['suite-stay'].propertyId;

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
    
    const noShowFeeInCents = 100; // $1.00

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
                noShowFeeAmount: '100',
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

        // Create booking in PMS with "Pay at Hotel" status
        const config = getHotelConfig(hotelId);

        // BookingCenter pay-later: we still save a booking (guarantee/verification handled by $1 hold on Stripe)
        if (config.pms === 'bookingcenter') {
            const pmsResponse = await createBookingCenterBooking(hotelId, bookingDetails, guestInfo);

            if (!pmsResponse.success) {
                // If booking fails, cancel the hold
                await stripe.paymentIntents.cancel(paymentIntentId);
                return res.status(400).json({
                    success: false,
                    message: pmsResponse.message || 'Failed to create reservation.'
                });
            }

            // Save to DB if possible (but don't fail booking if DB is down)
            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.reservationID,
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
                        preAuthHoldAmount: 1.00,
                        holdStatus: 'active'
                    }
                });
            } catch (dbError) {
                console.error("Failed to save pay-later booking to database:", dbError);
            }

            return res.json({
                success: true,
                message: 'Reservation created successfully. $1.00 hold placed on card.',
                reservationCode: pmsResponse.reservationID
            });
        }

        // Cloudbeds pay-later flow
        if (config.pms !== 'cloudbeds') {
            return res.status(400).json({ 
                success: false, 
                message: 'Pay later booking not yet supported for this hotel.' 
            });
        }

        const reservationData = {
            propertyID: config.propertyId,
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
            // Save to database with retry logic for cold starts
            let dbSaveSuccess = false;
            let retries = 2; // Reduced from 3 to 2 for faster booking
            
            while (!dbSaveSuccess && retries > 0) {
                try {
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
                            preAuthHoldAmount: 1.00,
                            holdStatus: 'active'
                        }
                    });
                    dbSaveSuccess = true;
                    console.log('✅ Booking saved to database');
                } catch (dbError) {
                    retries--;
                    if (dbError.code === 'P2002') {
                        // Unique constraint - booking already exists, that's OK
                        console.log('ℹ️ Booking already in database (duplicate prevented)');
                        dbSaveSuccess = true;
                    } else if (retries > 0) {
                        console.log(`⚠️ DB save failed, retrying... (${retries} attempts left)`);
                        await new Promise(r => setTimeout(r, 500)); // Wait 0.5 seconds before retry
                    } else {
                        console.error('❌ Failed to save to database after retries:', dbError.message);
                        // Don't fail the whole booking - Cloudbeds booking succeeded
                        // Webhook will handle saving to DB as backup
                    }
                }
            }

            res.json({
                success: true,
                message: 'Reservation created successfully. $1.00 hold placed on card.',
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
                amount_to_capture: 100 // Capture the full $1.00
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
            message: 'No-show fee of $1.00 charged successfully.',
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
            // Parse metadata first so we can check by reservation code
            const metadata = paymentIntent.metadata;
            const bookingDetails = JSON.parse(metadata.bookingDetails);
            const guestInfo = JSON.parse(metadata.guestInfo);
            const hotelId = metadata.hotelId;

            // Wait for 5 seconds while keeping the DB connection alive
            console.log('Webhook is pausing for 5 seconds to allow frontend to complete...');
            for (let i = 1; i <= 5; i++) {
                await prisma.$queryRaw`SELECT 1`; // Keep connection alive
                console.log(`Webhook waiting... ${i}/5 seconds`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Now, check if the frontend already created the booking record.
            // Check by BOTH PaymentIntent ID AND reservation code to catch race conditions
            const existingBooking = await prisma.booking.findFirst({
                where: {
                    OR: [
                        { stripePaymentIntentId: paymentIntent.id },
                        { ourReservationCode: bookingDetails.reservationCode }
                    ]
                }
            });

            if (existingBooking) {
                // If the record exists, the frontend was successful. Our job is done.
                console.log('✅ Frontend call was successful. Webhook signing off. No duplicates created.');
                return res.json({ received: true });
            }

            // If no record exists, it means the frontend call failed.
            // The webhook must now create the booking as a backup.
            console.log('⚠️ Frontend booking record not found. Creating backup booking...');

            // Get hotel config for this booking
            const config = getHotelConfig(hotelId);
            
            // Only process Cloudbeds hotels in webhook backup (BookingCenter will be added later)
            if (config.pms !== 'cloudbeds') {
                console.log(`⚠️ Webhook backup not yet implemented for ${config.pms}`);
                return res.json({ received: true });
            }

            // 1. Create the booking in Cloudbeds
            const reservationData = {
                propertyID: config.propertyId,
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

// Cloudbeds availability handler
async function getCloudbedsAvailability(hotelId, checkin, checkout) {
    const config = getHotelConfig(hotelId);
    const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const ratePlanType = getBestRatePlan(nights);

    const availabilityPromises = Object.entries(config.roomIDMapping).map(async ([roomName, ids]) => {
        const currentRateID = ids.rates[ratePlanType];
        const url = `https://hotels.cloudbeds.com/api/v1.2/getRatePlans?property_id=${config.propertyId}&startDate=${checkin}&endDate=${checkout}&detailedRates=true&roomTypeID=${ids.roomTypeID}`;
        
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
    return availableRooms.filter(room => room.available);
}

// -------------------------
// BookingCenter SOAP helpers
// -------------------------
const bcXmlParser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    attrkey: '$',
    charkey: '_',
    tagNameProcessors: [xml2js.processors.stripPrefix],
});

async function parseBcXml(xml) {
    return bcXmlParser.parseStringPromise(xml);
}

const BOOKINGCENTER_DEBUG_SOAP = (process.env.BOOKINGCENTER_DEBUG_SOAP || '').toLowerCase() === 'true';

function maskBookingCenterSecrets(xml) {
    if (!xml || typeof xml !== 'string') return xml;
    // Mask MessagePassword="..." in RequestorID blocks
    return xml.replace(/MessagePassword=\"[^\"]*\"/g, 'MessagePassword="***"');
}

function bcDebugLog(label, payload) {
    if (!BOOKINGCENTER_DEBUG_SOAP) return;
    console.log(`\n[BOOKINGCENTER_DEBUG] ${label}\n${maskBookingCenterSecrets(payload)}\n`);
}

async function postSoap(url, soapAction, xmlBody) {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const req = lib.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=ISO-8859-1',
                'SOAPAction': `"${soapAction}"`,
                'Accept': 'text/xml, application/xml, text/plain, */*',
                // Avoid compressed/chunked transfer issues behind Cloudflare
                'Accept-Encoding': 'identity',
                'Content-Length': Buffer.byteLength(xmlBody, 'latin1'),
                'User-Agent': 'Node.js BookingCenter Client',
                'Connection': 'close',
            },
        }, (res) => {
            let data = '';
            res.setEncoding('latin1');
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data,
                });
            });
        });

        req.on('error', reject);
        req.write(xmlBody, 'latin1');
        req.end();
    });
}

function bcSoapEnvelope(innerXml) {
    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                   xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    ${innerXml}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function bcTimestamp() {
    // BookingCenter examples use offsets like 2026-01-28T13:34:03-0800
    // Using ISO is usually accepted by SOAP servers; if not, we can format later.
    return new Date().toISOString();
}

function buildBcAvailRQ({ checkin, checkout, adults = 1, rooms = 1, siteId = BOOKINGCENTER_TEST_SITE_ID, sitePassword = BOOKINGCENTER_TEST_PASSWORD, chainCode = BOOKINGCENTER_TEST_CHAIN_CODE }) {
    const echoToken = Date.now().toString();

    // NOTE: In your captured example, Count="0" caused "Invalid Number of Guests".
    const safeAdults = Math.max(1, Number(adults) || 1);
    const safeRooms = Math.max(1, Number(rooms) || 1);

    return bcSoapEnvelope(
        `<OTA_HotelAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05">
  <parameters EchoToken="${echoToken}" TimeStamp="${bcTimestamp()}" Target="Production" Version="1.001">
    <POS>
      <Source ISOCurrency="USD"/>
      <RequestorID OTA_CodeType="10" ID="${siteId}" MessagePassword="${sitePassword}"/>
    </POS>
    <AvailRequestSegments>
      <AvailRequestSegment>
        <StayDateRange Start="${checkin}" End="${checkout}"/>
        <RoomStayCandidates>
          <RoomStayCandidate RoomTypeCode="" Quantity="${safeRooms}">
            <GuestCounts IsPerRoom="false">
              <GuestCount AgeQualifyingCode="10" Count="${safeAdults}"/>
            </GuestCounts>
          </RoomStayCandidate>
        </RoomStayCandidates>
        <HotelSearchCriteria>
          <Criterion>
            <HotelRef ChainCode="${chainCode}" HotelCode="${siteId}" AgentCode=""/>
          </Criterion>
        </HotelSearchCriteria>
      </AvailRequestSegment>
    </AvailRequestSegments>
  </parameters>
</OTA_HotelAvailRQ>`
    );
}

function buildBcHotelResRQ({
    checkin,
    checkout,
    roomTypeCode,
    ratePlanCode,
    guestInfo,
    guests = 1,
    // BookingCenter auth
    siteId = BOOKINGCENTER_TEST_SITE_ID,
    sitePassword = BOOKINGCENTER_TEST_PASSWORD,
    chainCode = BOOKINGCENTER_TEST_CHAIN_CODE,
    // Deposit/guarantee metadata
    depositAmount = 0,
    paymentTransactionTypeCode = 'Capture',
    receiptType = BOOKINGCENTER_TEST_RECEIPT_TYPE,
}) {
    const echoToken = Date.now().toString();
    const safeGuests = Math.max(1, Number(guests) || 1);

    // BookingCenter availability response includes PaymentPolicy/GuaranteePayment with a PaymentCode.
    // In your successful AvailRS sample, PaymentCode="31". Using it helps avoid "Invalid Payment Type".
    const paymentCode = '31';
    // TODO: if different properties return different payment codes, store it per-room from availability and pass through.

    const firstName = guestInfo.firstName || 'Guest';
    const lastName = guestInfo.lastName || 'Guest';

    return bcSoapEnvelope(
        `<OTA_HotelResRQ xmlns="http://www.opentravel.org/OTA/2003/05/hotelres">
  <parameters TimeStamp="${bcTimestamp()}" Version="1.001" EchoToken="${echoToken}" Target="Production">
    <POS>
      <Source ISOCurrency="USD"/>
      <RequestorID OTA_CodeType="10" ID="${siteId}" MessagePassword="${sitePassword}"/>
    </POS>
    <HotelReservations>
      <HotelReservation>
        <RoomStays>
          <RoomStay>
            <RoomTypes>
              <RoomType RoomTypeCode="${roomTypeCode}" NumberOfUnits="1"/>
            </RoomTypes>
            <RatePlans>
              <RatePlan RatePlanCode="${ratePlanCode}"/>
            </RatePlans>
            <GuestCounts>
              <GuestCount Count="${safeGuests}" AgeQualifyingCode="10"/>
            </GuestCounts>
            <TimeSpan Start="${checkin}" End="${checkout}"/>
            <Guarantee>
              <GuaranteesAccepted>
                <GuaranteeAccepted>
                  <PaymentTransactionTypeCode>Capture</PaymentTransactionTypeCode>
                  <PaymentCard>
                    <CardCode>${receiptType}</CardCode>
                    <CardNumber></CardNumber>
                    <CardHolderName></CardHolderName>
                    <ExpireDate></ExpireDate>
                  </PaymentCard>
                </GuaranteeAccepted>
              </GuaranteesAccepted>
            </Guarantee>
            <PaymentPolicies>
              <GuaranteePayment>
                <AmountPercent Amount="0" TaxInclusive="N" BasisType="No Deposit" />
              </GuaranteePayment>
            </PaymentPolicies>
            <BasicPropertyInfo HotelCode="${siteId}"/>
          </RoomStay>
        </RoomStays>
        <ResGuests>
          <ResGuest>
            <Profiles>
              <ProfileInfo>
                <Profile ProfileType="1">
                  <Customer>
                    <PersonName>
                      <GivenName>${firstName}</GivenName>
                      <Surname>${lastName}</Surname>
                    </PersonName>
                    ${guestInfo.phone ? `<Telephone PhoneTechType="1" PhoneNumber="${guestInfo.phone}"/>` : ''}
                    ${guestInfo.email ? `<Email>${guestInfo.email}</Email>` : ''}
                    <Address>
                      ${guestInfo.address ? `<AddressLine>${guestInfo.address}</AddressLine>` : ''}
                      ${guestInfo.city ? `<CityName>${guestInfo.city}</CityName>` : ''}
                      ${guestInfo.state ? `<StateProv>${guestInfo.state}</StateProv>` : ''}
                      ${guestInfo.zip ? `<PostalCode>${guestInfo.zip}</PostalCode>` : ''}
                      <CountryName>US</CountryName>
                    </Address>
                  </Customer>
                </Profile>
              </ProfileInfo>
            </Profiles>
          </ResGuest>
        </ResGuests>
      </HotelReservation>
    </HotelReservations>
  </parameters>
</OTA_HotelResRQ>`
    );
}

function extractBcErrors(otaResponse) {
    const errors = otaResponse?.parameters?.Errors?.Error;
    if (!errors) return null;
    const list = Array.isArray(errors) ? errors : [errors];
    return list.map(e => ({
        type: e?.$?.Type,
        code: e?.$?.Code,
        shortText: e?.$?.ShortText,
    }));
}

// BookingCenter availability handler (SOAP/XML)
async function getBookingCenterAvailability(hotelId, checkin, checkout) {
    const config = getHotelConfig(hotelId);
    if (!config.siteId || !config.sitePassword) {
        throw new Error(`Missing BookingCenter siteId/sitePassword for hotelId=${hotelId}`);
    }

    const xml = buildBcAvailRQ({
        checkin,
        checkout,
        adults: 1,
        rooms: 1,
        siteId: config.siteId,
        sitePassword: config.sitePassword,
        chainCode: config.chainCode,
    });

    bcDebugLog('HotelAvailRQ (request)', xml);

    const response = await postSoap(
        BOOKINGCENTER_ENDPOINTS.availability,
        'www.bookingcenter.com/xml:HotelAvailIn',
        xml
    );

    if (BOOKINGCENTER_DEBUG_SOAP) {
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail HTTP status=${response.status} content-type=${response.headers?.['content-type']} content-length=${response.headers?.['content-length']}`);
        console.log(`[BOOKINGCENTER_DEBUG] HotelAvail response length=${(response.data && response.data.length) || 0}`);
    }

    bcDebugLog('HotelAvailRS (response)', response.data);

    const parsed = await parseBcXml(response.data);
    const body = parsed?.Envelope?.Body;
    const ota = body?.OTA_HotelAvailRS;

    const errors = extractBcErrors(ota);
    if (errors) {
        console.error('BookingCenter availability errors:', errors);
        return [];
    }

    const roomStays = ota?.parameters?.RoomStays?.RoomStay || ota?.RoomStays?.RoomStay;
    if (!roomStays) return [];

    const stays = Array.isArray(roomStays) ? roomStays : [roomStays];

    return stays.map((stay) => {
        const ratePlan = stay?.RatePlans?.RatePlan;
        const roomType = stay?.RoomTypes?.RoomType;
        const roomRate = stay?.RoomRates?.RoomRate;
        const rate = roomRate?.Rates?.Rate;
        const base = rate?.Base?.$;

        const roomTypeCode = roomType?.$?.RoomTypeCode;
        const availableQty = Number(roomType?.$?.NumberOfUnits ?? 0) || 0;
        const ratePlanCode = ratePlan?.$?.RatePlanCode;

        // Room name comes from RoomTypeName/Text
        const roomName = roomType?.RoomTypeName?.Text?._ || roomType?.RoomTypeName?.Text || roomTypeCode || 'Room';

        // Optional pricing if you ever want it
        const amountBeforeTax = base?.AmountBeforeTax ? Number(base.AmountBeforeTax) : null;
        const amountAfterTax = base?.AmountAfterTax ? Number(base.AmountAfterTax) : null;

        return {
            roomName,
            available: availableQty > 0,
            roomsAvailable: availableQty,
            // For BookingCenter, treat rateID as RatePlanCode and roomTypeID as RoomTypeCode
            rateID: ratePlanCode,
            roomTypeID: roomTypeCode,
            // helpful extra fields (non-breaking)
            _bc: {
                currency: base?.CurrencyCode,
                amountBeforeTax,
                amountAfterTax,
                paymentCode: rate?.PaymentPolicy?.GuaranteePayment?.$?.PaymentCode,
            }
        };
    }).filter(r => r.available && r.rateID && r.roomTypeID);
}

app.post('/api/availability', async (req, res) => {
    const { hotelId, checkin, checkout } = req.body;
    
    try {
        const config = getHotelConfig(hotelId);
        let availableRooms;

        if (config.pms === 'cloudbeds') {
            availableRooms = await getCloudbedsAvailability(hotelId, checkin, checkout);
        } else if (config.pms === 'bookingcenter') {
            availableRooms = await getBookingCenterAvailability(hotelId, checkin, checkout);
        } else {
            return res.status(400).json({ success: false, message: `Unknown PMS type: ${config.pms}` });
        }

        res.json({ success: true, data: availableRooms });

    } catch (error) {
        console.error("Error fetching availability:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
    }
});

// Cloudbeds booking handler
async function createCloudbedsBooking(hotelId, bookingDetails, guestInfo) {
    const config = getHotelConfig(hotelId);
    const isTrial = bookingDetails.bookingType === 'trial';
    let rateIDToUse = bookingDetails.rateID;

    if (isTrial && bookingDetails.useNightlyRate) {
        const roomMapping = Object.entries(config.roomIDMapping).find(
            ([name, ids]) => ids.roomTypeID === bookingDetails.roomTypeID
        );
        
        if (roomMapping) {
            rateIDToUse = roomMapping[1].rates.nightly;
            console.log(`✅ Trial booking - switching to nightly rate: ${rateIDToUse}`);
        }
    }

    const reservationData = {
        propertyID: config.propertyId,
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

    const pmsResponse = await axios.post('https://api.cloudbeds.com/api/v1.3/postReservation', new URLSearchParams(reservationData), {
        headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
            'content-type': 'application/x-www-form-urlencoded',
        }
    });

    return pmsResponse.data;
}

// BookingCenter booking handler (SOAP/XML)
async function createBookingCenterBooking(hotelId, bookingDetails, guestInfo) {
    // bookingDetails.roomTypeID and bookingDetails.rateID come from frontend selection
    // For BookingCenter these should be RoomTypeCode and RatePlanCode respectively.
    const roomTypeCode = bookingDetails.roomTypeID;
    const initialRatePlanCode = bookingDetails.rateID;

    if (!roomTypeCode || !initialRatePlanCode) {
        return { success: false, message: 'Missing BookingCenter roomTypeCode or ratePlanCode.' };
    }

    // BookingCenter (per Jason): include PaymentCard with a receipt type code (e.g. TERM/PP/TRANS)
    // and leave card fields blank for externally handled payments.
    const isReserve = (bookingDetails.bookingType === 'payLater' || bookingDetails.bookingType === 'reserve' || bookingDetails.planType === 'reserve');
    // Jason: don't use CASH.
    const receiptType = isReserve ? 'TERM' : 'PP';

    const config = getHotelConfig(hotelId);
    if (!config.siteId || !config.sitePassword) {
        return { success: false, message: `Missing BookingCenter siteId/sitePassword for hotelId=${hotelId}` };
    }

    const checkin = new Date(bookingDetails.checkin).toISOString().split('T')[0];
    const checkout = new Date(bookingDetails.checkout).toISOString().split('T')[0];

    const attempt = async (ratePlanCode) => {
        const xml = buildBcHotelResRQ({
            checkin,
            checkout,
            roomTypeCode,
            ratePlanCode,
            guestInfo,
            guests: bookingDetails.guests,
            siteId: config.siteId,
            sitePassword: config.sitePassword,
            chainCode: config.chainCode,
            depositAmount: 0,
            paymentTransactionTypeCode: 'Capture',
            receiptType,
        });

        bcDebugLog('HotelResRQ (request)', xml);

        const response = await postSoap(
            BOOKINGCENTER_ENDPOINTS.booking,
            'www.bookingcenter.com/xml:HotelResIn',
            xml
        );

        if (BOOKINGCENTER_DEBUG_SOAP) {
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes HTTP status=${response.status} content-type=${response.headers?.['content-type']} content-length=${response.headers?.['content-length']}`);
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes headers=${JSON.stringify(response.headers || {})}`);
            console.log(`[BOOKINGCENTER_DEBUG] HotelRes response length=${(response.data && response.data.length) || 0}`);
        }

        bcDebugLog('HotelResRS (response)', response.data);

        if (response.status >= 400) {
            return { success: false, errors: [{ shortText: `HTTP ${response.status} from BookingCenter booking endpoint` }], raw: response.data };
        }

        const parsed = await parseBcXml(response.data);
        const body = parsed?.Envelope?.Body;
        const ota = body?.OTA_HotelResRS;

        const errors = extractBcErrors(ota);
        if (errors) {
            return { success: false, errors, raw: ota };
        }

        const reservationId =
            ota?.HotelReservations?.HotelReservation?.UniqueID?.$?.ID ||
            ota?.HotelReservations?.HotelReservation?.UniqueID?.$?.ID_Context ||
            ota?.HotelReservations?.HotelReservation?.ResGlobalInfo?.HotelReservationIDs?.HotelReservationID?.$?.ResID_Value ||
            ota?.HotelReservations?.HotelReservation?.ResGlobalInfo?.HotelReservationIDs?.HotelReservationID?.$?.ResID_Source ||
            null;

        // IMPORTANT: Don't treat the booking as successful unless BookingCenter returns a real confirmation ID.
        // Otherwise the frontend can show a success page even though nothing was created in the PMS.
        if (!reservationId) {
            return {
                success: false,
                message: 'BookingCenter did not return a reservation ID (confirmation).',
                raw: ota,
            };
        }

        return {
            success: true,
            reservationID: reservationId,
            message: 'Reservation created successfully.',
            raw: ota,
        };
    };

    // Attempt with the requested rate plan first
    let result = await attempt(initialRatePlanCode);
    if (result.success) return result;

    const errorText = (result.errors || []).map(e => e.shortText).join(' | ');
    const isAvailabilityError = /Not enough Availability/i.test(errorText);

    // If rate plan is rejected due to availability, retry with an alternate rate plan for the same room type.
    if (isAvailabilityError) {
        try {
            const available = await getBookingCenterAvailability(hotelId, checkin, checkout);
            const alternatives = available.filter(r => r.roomTypeID === roomTypeCode && r.rateID && r.rateID !== initialRatePlanCode);

            // Prefer a non-weekly rate plan if the weekly one is failing
            const preferred = alternatives.find(r => !(r.rateID || '').includes('WK')) || alternatives[0];

            if (preferred?.rateID) {
                console.log(`BookingCenter retry: ${initialRatePlanCode} failed, retrying with ${preferred.rateID} for RoomType ${roomTypeCode}`);
                const retryResult = await attempt(preferred.rateID);
                if (retryResult.success) return retryResult;

                const retryErrText = (retryResult.errors || []).map(e => e.shortText).join(' | ');
                console.error('BookingCenter booking retry errors:', retryErrText);
                return {
                    success: false,
                    message: retryErrText || errorText || 'BookingCenter booking failed',
                    errors: retryResult.errors || result.errors,
                };
            }
        } catch (e) {
            console.error('BookingCenter retry availability lookup failed:', e.message);
        }
    }

    console.error('BookingCenter booking errors:', result.errors);
    return {
        success: false,
        message: errorText || 'BookingCenter booking failed',
        errors: result.errors,
    };
}

app.post('/api/book', async (req, res) => {
    const { hotelId, bookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (!bookingDetails.rateID) {
        return res.status(400).json({ success: false, message: 'Invalid room name provided.' });
    }

    try {
        const config = getHotelConfig(hotelId);
        let pmsResponse;

        if (config.pms === 'cloudbeds') {
            pmsResponse = await createCloudbedsBooking(hotelId, bookingDetails, guestInfo);
        } else if (config.pms === 'bookingcenter') {
            pmsResponse = await createBookingCenterBooking(hotelId, bookingDetails, guestInfo);
        } else {
            return res.status(400).json({ success: false, message: `Unknown PMS type: ${config.pms}` });
        }

        if (pmsResponse.success) {
            // Save to database
            try {
                await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode,
                        pmsConfirmationCode: pmsResponse.reservationID,
                        hotelId: hotelId,
                        roomName: bookingDetails.name || bookingDetails.roomName,
                        bookingType: bookingDetails.bookingType || 'standard',
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
            success: pmsResponse.success,
            message: pmsResponse.success ? 'Reservation created successfully.' : pmsResponse.message,
            reservationCode: pmsResponse.reservationID,
            pmsResponse: pmsResponse
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

