require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const prisma = new PrismaClient();

const allowedOrigins = [
    'https://myhomeplacesuites.com',      // Alloow the non-wwww version
    'https://www.myhomeplacesuites.com', // Allow the www version
    'http://localhost:3000'            // Allow local development
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
const PROPERTY_ID = '113548817731712';

const roomIDMapping = {
    'Single King Room': {
        roomTypeID: '117057244229790',
        rates: {
            nightly: '117057244229807',
            weekly: '121313720520953',
            monthly: '131632531103971'
        }
    },
    'Double Queen Room': {
        roomTypeID: '116355544711397',
        rates: {
            nightly: '116355544711421',
            weekly: '144727534629093',
            monthly: '131632375537874'
        }
    },

    'Double Queen Suite With Kitchenette': {
        roomTypeID: '117068633694351', // Replace with actual Room Type ID
        rates: {
            nightly: '117068633694362',
            weekly: '121313468612837',
            monthly: '131637796552937'
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
    if (hotelId !== 'home-place-suites') {
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

            if (specificRatePlan) {
                // Calculate the subtotal (room rate before taxes) by dividing totalRate by 1.10
                // This assumes a 10% tax rate, which matches your calculation elsewhere
                const totalRate = specificRatePlan.totalRate;
                const subtotal = totalRate / 1.25; // Remove the 10% tax
                const taxes = totalRate - subtotal; // Calculate actual tax amount

                return {
                    roomName: roomName,
                    available: specificRatePlan.roomsAvailable > 0,
                    roomsAvailable: specificRatePlan.roomsAvailable,
                    subtotal: parseFloat(subtotal.toFixed(2)), // Room rate before taxes
                    taxesAndFees: parseFloat(taxes.toFixed(2)), // Actual tax amount
                    grandTotal: totalRate, // Total including taxes
                    rateID: currentRateID,
                    roomTypeID: ids.roomTypeID
                };
            }

            return {
                roomName: roomName,
                available: false,
                roomsAvailable: 0,
                subtotal: null,
                taxesAndFees: null,
                grandTotal: null,
                rateID: currentRateID,
                roomTypeID: ids.roomTypeID
            };
        });

        console.log('🔍 Searching for dates:', checkin, 'to', checkout);
        console.log('🔍 Rate Plan ID:', currentRateID);
        console.log('🔍 Cloudbeds Response:', JSON.stringify(specificRatePlan, null, 2));

        const availableRooms = await Promise.all(availabilityPromises);
        res.json({ success: true, data: availableRooms.filter(room => room.available) });

    } catch (error) {
        console.error("Error fetching availability from Cloudbeds:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
    }
});

app.post('/api/book', async (req, res) => {
    const { hotelId, bookingDetails, guestInfo, paymentIntentId } = req.body;
    
    if (hotelId !== 'home-place-suites') {
         return res.status(400).json({ success: false, message: 'This endpoint is only for Home Place Suites.' });
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
                        roomName: bookingDetails.name || bookingDetails.roomName, // ← FIXED
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

    const enrichedPayload = { ...eventData, client_ip_address: req.ip, user_agent: req.headers['user-agent'] };
    
    try {
        await axios.post(webhookUrl, enrichedPayload);
        console.log(`Successfully forwarded '${event_name}' event to Zapier with IP: ${req.ip}`);
        res.status(200).json({ success: true, message: 'Event tracked.' });
    } catch (error) {
        console.error(`Failed to forward event to Zapier for '${event_name}'. Status: ${error.response?.status}. Message: ${error.message}`);
        res.status(500).json({ success: false, message: 'Event tracking failed on the server.' });
    }
});


app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

