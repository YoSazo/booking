import React, { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import ConfirmationPage from './ConfirmationPage.jsx'; // We'll reuse our existing confirmation page

function CheckoutReturnPage() {
    const stripe = useStripe();
    const [status, setStatus] = useState('loading');
    const [bookingData, setBookingData] = useState(null);

    useEffect(() => {
        if (!stripe) return;

        const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
        if (!clientSecret) return;

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case 'succeeded':
                    // In a real app, you'd fetch the final booking data from your backend here
                    // For now, we'll retrieve it from sessionStorage where we'll save it
                    const savedBooking = JSON.parse(sessionStorage.getItem('finalBooking'));
                    const savedGuest = JSON.parse(sessionStorage.getItem('guestInfo'));
                    
                    if (savedBooking && savedGuest) {
                        // --- THIS IS THE CRUCIAL NEW LINE ---
                        // Finalize the booking by calling the function from App.jsx
                        onComplete(savedGuest, paymentIntent.id); 
                        // ------------------------------------

                        setBookingData({
                            bookingDetails: savedBooking,
                            guestInfo: savedGuest,
                            // Use the code from the saved data for display
                            reservationCode: savedBooking.reservationCode, 
                        });
                        setStatus('succeeded');
                    } else {
                        // If session data is missing, something went wrong
                        setStatus('error');
                    }
                    break;
                case 'processing':
                    setStatus('processing');
                    break;
                default:
                    setStatus('error');
                    break;
            }
        });
    }, [stripe, onComplete]);


    if (status === 'loading') {
        return <div style={{textAlign: 'center', padding: '50px'}}>Loading confirmation...</div>;
    }

    if (status === 'succeeded' && bookingData) {
        return <ConfirmationPage {...bookingData} />;
    }

    if (status === 'processing') {
        return <div style={{textAlign: 'center', padding: '50px'}}>Payment is processing. We will email your confirmation shortly.</div>;
    }

    return <div style={{textAlign: 'center', padding: '50px'}}>Payment failed. Please return to the booking page to try again.</div>;
}

export default CheckoutReturnPage;