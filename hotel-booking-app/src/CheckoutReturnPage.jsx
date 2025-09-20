import React, { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';

function CheckoutReturnPage({ onComplete }) {
    const stripe = useStripe();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!stripe) return;

        const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
        if (!clientSecret) {
            console.error("No client secret found in return URL.");
            setStatus('error');
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case 'succeeded':
                    const savedGuestInfo = JSON.parse(sessionStorage.getItem('guestInfo'));
                    
                    if (savedGuestInfo) {
                        onComplete(savedGuestInfo, paymentIntent.id);
                    } else {
                        setStatus('error');
                        console.error("Could not retrieve guest info from session storage after payment.");
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

    return <div style={{textAlign: 'center', padding: '50px'}}>Finalizing your booking...</div>;
}

export default CheckoutReturnPage;