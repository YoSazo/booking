import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// This component now ONLY displays the Stripe elements and has no submit button of its own.
const StripePaymentForm = ({ bookingDetails, guestInfo, clientSecret }) => {
    const stripe = useStripe();
    const [paymentRequest, setPaymentRequest] = useState(null);
    const amountInCents = Math.round((bookingDetails.subtotal / 2) * 100);

    useEffect(() => {
        if (!stripe || !clientSecret) return;
        const pr = stripe.paymentRequest({
            country: 'US',
            currency: 'usd',
            total: { label: 'Booking Payment', amount: amountInCents },
            requestPayerName: true,
            requestPayerEmail: true,
        });
        pr.canMakePayment().then(result => { if (result) setPaymentRequest(pr); });
        pr.on('paymentmethod', async (ev) => {
            sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
            sessionStorage.setItem('guestInfo', JSON.stringify(guestInfo));
            const { error: confirmError } = await stripe.confirmCardPayment(
                clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false }
            );
            if (confirmError) { ev.complete('fail'); return; }
            ev.complete('success');
            window.location.href = `${window.location.origin}/confirmation?payment_intent_client_secret=${clientSecret}`;
        });
        return () => { if (pr) pr.off('paymentmethod'); };
    }, [stripe, clientSecret, amountInCents, bookingDetails, guestInfo]);

    return (
        <div className="secure-payment-frame">
            {paymentRequest && (
                 <PaymentRequestButtonElement options={{ paymentRequest, style: { paymentRequestButton: { theme: 'dark', height: '40px' } } }} />
            )}
            {paymentRequest && <div className="payment-divider"><span>OR PAY WITH CARD</span></div>}
            <PaymentElement />
        </div>
    );
};

function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    const [clientSecret, setClientSecret] = useState('');
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    
    // Stripe hooks and state are now correctly placed in the main component.
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (bookingDetails && bookingDetails.subtotal) {
            fetch(`${apiBaseUrl}/api/create-payment-intent`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
            })
            .then((res) => res.json()).then((data) => setClientSecret(data.clientSecret));
        }
    }, [bookingDetails, apiBaseUrl]);

    const handlePhoneChange = (e) => {
      let value = e.target.value;
      if (!value.startsWith('+1 ')) { value = '+1 '; }
      setFormData(prev => ({ ...prev, phone: value }));
    };
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };
    const onLoad = (autoC) => setAutocomplete(autoC);
    const onPlaceChanged = () => {
        if (autocomplete !== null) {
          const place = autocomplete.getPlace();
          const components = place.address_components;
          let streetNumber = '', route = '', city = '', state = '', zip = '';
          for (const component of components) {
            const types = component.types;
            if (types.includes('street_number')) streetNumber = component.long_name;
            if (types.includes('route')) route = component.long_name;
            if (types.includes('locality')) city = component.long_name;
            if (types.includes('administrative_area_level_1')) state = component.short_name;
            if (types.includes('postal_code')) zip = component.long_name;
          }
          setFormData(prev => ({
            ...prev,
            address: `${streetNumber} ${route}`.trim(), city, state, zip,
          }));
        }
        setIsAddressSelected(true);
    };

    const handleNextStep = () => {
        if (currentStep === 2) {
            if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
                alert("Please fill out all your information before proceeding.");
                return;
            }
        }
        setCurrentStep(prev => prev + 1);
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');

        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(formData));

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                receipt_email: formData.email,
                return_url: `${window.location.origin}/confirmation`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(formData, paymentIntent.id);
        }
        
        setIsProcessing(false);
    };
    
    const priceToday = bookingDetails.subtotal / 2;
    const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;
    const stripeOptions = { clientSecret, appearance: { theme: 'stripe' }, locale: 'en' };

    return (
        <>
            <div className="static-banner">
                ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotel.phone} — we're happy to help!
            </div>
            <div className="container-single-column">
                <div className="guest-info-header">
                    <button onClick={onBack} className="back-button">&lt; Back to Booking</button>
                    <h1>Guest Information</h1>
                </div>

                <div className="checkout-progress-bar">
                    <div className={`progress-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}>
                        <div className="step-circle"></div>
                        <span className="step-name">Review Cart</span>
                    </div>
                    <div className={`progress-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
                        <div className="step-circle"></div>
                        <span className="step-name">Info</span>
                    </div>
                    <div className={`progress-step ${currentStep === 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}>
                        <div className="step-circle"></div>
                        <span className="step-name">Payment</span>
                    </div>
                </div>

                {currentStep === 1 && (
                    <div className="info-summary">{/* Review Cart Details */}</div>
                )}

                {/* The main form wraps steps 2 and 3 and uses the final submit handler */}
                <form className="guest-info-form" onSubmit={handleFinalSubmit}>
                    {currentStep === 2 && (
                        <div className="form-grid">{/* Simplified Info Form Fields */}</div>
                    )}

                    {currentStep === 3 && (
                        <div className="payment-placeholder">
                            {/* The trust badge is now a standard, reliable img tag */}
                            <img 
                                src="/stripe-checkout.png" 
                                alt="Guaranteed safe and secure checkout" 
                                className="stripe-badge-image" 
                            />
                            {clientSecret ? (
                                <Elements options={stripeOptions} stripe={stripePromise}>
                                    <StripePaymentForm 
                                        bookingDetails={bookingDetails} 
                                        guestInfo={formData} 
                                        clientSecret={clientSecret}
                                    />
                                    <div className="billing-address-section">
                                        <h4 className="billing-address-title">Billing Address</h4>
                                        <div className="form-grid">
                                            <div className="form-field full-width">
                                                <label>Address</label>
                                                <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                                    <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing your address..." />
                                                </Autocomplete>
                                            </div>
                                            {isAddressSelected && (
                                                <div className={`address-reveal-container visible`}>
                                                    <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required/></div>
                                                    <div className="form-field"><label>State / Province</label><input type="text" name="state" value={formData.state} onChange={handleChange} required/></div>
                                                    <div className="form-field"><label>Zip / Postal Code</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} required/></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Elements>
                            ) : ( <p>Loading...</p> )}
                        </div>
                    )}
                    
                    {/* The main CTA button is now outside the conditional rendering of steps */}
                    {currentStep < 3 ? (
                        <div className="checkout-cta-container">
                            <button type="button" className="btn btn-confirm" style={{width: '100%'}} onClick={handleNextStep}>
                                {currentStep === 1 ? 'Proceed to Info' : 'Proceed to Payment'}
                            </button>
                        </div>
                    ) : (
                        <div className="checkout-cta-container">
                            <button type="submit" disabled={isProcessing || !stripe || !elements} className="btn btn-confirm" style={{width: '100%'}}>
                                {isProcessing ? "Processing..." : `Pay $${(priceToday).toFixed(2)} and Complete Booking`}
                            </button>
                            {errorMessage && <div className="error-message" style={{textAlign: 'center', marginTop: '10px'}}>{errorMessage}</div>}
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}

// The wrapper provides the Stripe context to the entire page, solving the error.
function GuestInfoPageWrapper(props) {
    return (
        <Elements stripe={stripePromise}>
            <GuestInfoPage {...props} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;