import React, { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';

// This page is now just a temporary loading screen that finalizes the booking
function CheckoutReturnPage({ onComplete }) {
    const stripe = useStripe();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!stripe) {
            // Stripe.js has not yet loaded.
            return;
        }

        const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
        if (!clientSecret) {
            console.error("No client secret found in return URL.");
            setStatus('error');
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case 'succeeded':
                    // Payment was successful! Now, get the user data we saved earlier.
                    let savedGuestInfo = JSON.parse(sessionStorage.getItem('guestInfo'));
                    
                    // START FIX 2: Fallback for Express Checkout to ensure required data is present
                    // Check if essential data is missing (common with wallet payments)
                    if (!savedGuestInfo || !savedGuestInfo.email || !savedGuestInfo.firstName) {
                        // Extract name and email from the Stripe Payment Intent, which is reliable
                        const name = paymentIntent.shipping?.name || paymentIntent.billing_details?.name || 'Express Guest';
                        const [firstName, ...lastNameParts] = name.split(' ');
                        
                        savedGuestInfo = {
                            // Extract data from Payment Intent or use safe placeholders
                            firstName: firstName || 'Express',
                            lastName: lastNameParts.join(' ') || 'Guest',
                            email: paymentIntent.receipt_email || paymentIntent.billing_details?.email || 'unknown@example.com',
                            phone: paymentIntent.shipping?.phone || 'N/A',
                            zip: paymentIntent.shipping?.address?.postal_code || paymentIntent.billing_details?.address?.postal_code || 'N/A',
                            // Add placeholders for other mandatory fields required by your backend
                            address: 'N/A',
                            city: 'N/A',
                            state: 'N/A',
                        };
                        // Clear the local session storage item for this booking (optional but good practice)
                        sessionStorage.removeItem('guestInfo');
                    }
                    // END FIX 2
                    
                    if (savedGuestInfo && savedGuestInfo.email) {
                        // Finalize the booking by calling the main function from App.jsx
                        onComplete(savedGuestInfo, paymentIntent.id);
                    } else {
                        // If the essential email is still missing, we must error out.
                        setStatus('error');
                        console.error("Could not retrieve essential guest info after payment.");
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

    if (status === 'processing') {
        return <div style={{textAlign: 'center', padding: '50px'}}>Your payment is processing. You will be redirected shortly...</div>;
    }
    
    if (status === 'error') {
        return <div style={{textAlign: 'center', padding: '50px'}}>There was an error with your payment. Please return to the booking page or contact us.</div>;
    }

    // Default loading state while we finalize
    return <div style={{textAlign: 'center', padding: '50px'}}>Finalizing your booking...</div>;
}

export default CheckoutReturnPage;