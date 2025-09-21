require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const prisma = new PrismaClient();

const allowedOrigins = [
    'https://myhomeplacesuites.com',      // Alloow the non-www version
    'https://www.myhomeplacesuites.com', // Allow the www version
    'http://localhost:5173'            // Allow local development
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
    Purchase: process.env.ZAPIER_PURCHASE_URL,
};


// In your server.js

// File: guest-lodge-backend/server.js

app.post('/api/create-payment-intent', async (req, res) => {
    const { amount } = req.body;
    const amountInCents = Math.round(amount * 100);

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ error: { message: "Invalid amount provided." } });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            // ✅ Only "card" and optionally "link" here
            // Wallets like Apple Pay and Google Pay are automatically included under "card"
            payment_method_types: ['card', 'link'], 
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe API Error creating payment intent:", error.message);
        res.status(400).send({ error: { message: error.message || "Failed to create payment intent due to an API error." } });
    }
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

            return {
                roomName: roomName,
                available: specificRatePlan ? specificRatePlan.roomsAvailable > 0 : false,
                totalRate: specificRatePlan ? specificRatePlan.totalRate : null,
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
    if (hotelId !== 'home-place-suites') {
         return res.status(400).json({ success: false, message: 'This endpoint is only for Home Place Suites.' });
    }
    if (!bookingDetails.rateID) {
        return res.status(400).json({ success: false, message: 'Invalid room name provided.' });
    }
    const reservationData = {
        propertyID: PROPERTY_ID,
        startDate: bookingDetails.checkin.split('T')[0],
        endDate: bookingDetails.checkout.split('T')[0],
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

    try {
        // Step 1: Make the reservation with the PMS (Cloudbeds)
        const pmsResponse = await axios.post('https://api.cloudbeds.com/api/v1.3/postReservation', new URLSearchParams(reservationData), {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
                'content-type': 'application/x-www-form-urlencoded',
            }
        });

        if (pmsResponse.data.success) {
            // Step 2: If PMS booking is successful, save a record to OUR database
            try {
                const newBooking = await prisma.booking.create({
                    data: {
                        stripePaymentIntentId: paymentIntentId,
                        ourReservationCode: bookingDetails.reservationCode, // The code from the frontend
                        pmsConfirmationCode: pmsResponse.data.reservationID, // The REAL code from Cloudbeds
                        hotelId: hotelId,
                        roomName: bookingDetails.name,
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
                console.log('Successfully saved booking to our database:', newBooking.id);
            } catch (dbError) {
                // IMPORTANT: Log if our database fails, but don't fail the whole request
                console.error("CRITICAL: Failed to save confirmed booking to our database.", dbError);
            }
        }
        
        // Step 3: Forward the original success response from the PMS to the frontend
        res.json({
            success: pmsResponse.data.success,
            message: pmsResponse.data.success ? 'Reservation created successfully.' : pmsResponse.data.message,
            reservationCode: pmsResponse.data.reservationID,
            pmsResponse: pmsResponse.data // Keep original response for debug/future use
        });

    } catch (error) {
        console.error("Error creating reservation with Cloudbeds:", error.response?.data || error.message);
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

