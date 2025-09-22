import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// This component ONLY displays the Stripe elements.
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

// This is the main component that controls the multi-step flow.
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    const [clientSecret, setClientSecret] = useState('');
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (bookingDetails && bookingDetails.subtotal) {
            // --- FIXED: Changed `apiBase.url` to the correct `apiBaseUrl` prop ---
            fetch(`${apiBaseUrl}/api/create-payment-intent`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
            })
            .then((res) => {
                if (!res.ok) { throw new Error('Failed to create payment intent'); }
                return res.json();
            })
            .then((data) => {
                if (!data.clientSecret) { throw new Error('Client secret not received'); }
                setClientSecret(data.clientSecret)
            })
            .catch(err => {
                console.error("Error fetching client secret:", err);
                setErrorMessage("Could not load payment form. Please try again.");
            });
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

    // --- NEW: Dynamic Back Button Logic ---
  // --- NEW: Your dynamic back button logic ---
    const handleBackStep = () => {
        if (currentStep === 1) {
            onBack(); // Go back to the main booking page
        } else {
            setCurrentStep(prev => prev - 1); // Go to previous step in the checkout
        }
    };

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info';
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
    
    if (!bookingDetails) {
        return <div style={{textAlign: 'center', padding: '50px'}}>Loading booking details...</div>;
    }
    
    const priceToday = bookingDetails.subtotal / 2;
    const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;
    const stripeOptions = { clientSecret, appearance: { theme: 'stripe' }, locale: 'en' };

    return (
        <>
            <div className="static-banner">
                ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotel.phone} — we're happy to help!
            </div>
            <div className="container-single-column" style={{ paddingBottom: currentStep < 3 ? '120px' : '40px' }}>
                <div className="guest-info-header">
                  <button onClick={handleBackStep} className="back-button">{getBackButtonText()}</button>
                    <button onClick={handleBackStep} className="back-button">
                        {getBackButtonText()}
                    </button>

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

                <div className="info-summary-wrapper" style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <div className="info-summary">
                        <div className="summary-card-details">
                            <p className="detail-line">{bookingDetails.name}</p>
                            <p className="detail-line">{bookingDetails.guests} {bookingDetails.guests > 1 ? 'Guests' : 'Guest'}</p>
                            <p className="detail-line">{bookingDetails.pets} {bookingDetails.pets === 1 ? 'Pet' : 'Pets'}</p>
                        </div>
                        <div className="summary-card-price">
                            <p className="price-line"><strong>{bookingDetails.nights}</strong> Nights</p>
                            <p className="price-line">Subtotal: <strong>${bookingDetails.subtotal.toFixed(2)}</strong></p>
                            <p className="price-line">Taxes & Fees: <strong>${bookingDetails.taxes.toFixed(2)}</strong></p>
                            <div className="total-breakdown">
                                <p className="pay-today">Only Pay ${priceToday.toFixed(2)} Today</p>
                                <p className="balance-due">Balance (${balanceDue.toFixed(2)}) When you arrive</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form className="guest-info-form" onSubmit={handleFinalSubmit} style={{ display: currentStep > 1 ? 'block' : 'none' }}>
                    {currentStep === 2 && (
                        <div className="form-grid">
                            <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                            <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                            <div className="form-field"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} /></div>
                            <div className="form-field"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="payment-placeholder">
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
                                        <label className="billing-address-title">Billing Address</label>
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
                            ) : ( <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p> )}
                        </div>
                    )}
                </form>

                {currentStep < 3 ? (
                    <div className="checkout-cta-container">
                        <button type="button" className="btn btn-confirm" style={{width: '100%'}} onClick={handleNextStep}>
                            {currentStep === 1 ? 'Proceed to Info' : 'Proceed to Payment'}
                        </button>
                    </div>
                ) : (
                    <div className="checkout-cta-container">
                        <button type="submit" form="guest-info-form-id" disabled={isProcessing || !stripe || !elements} className="btn btn-confirm" style={{width: '100%'}}>
                            {isProcessing ? "Processing..." : `Pay $${(priceToday).toFixed(2)} and Complete Booking`}
                        </button>
                        {errorMessage && <div className="error-message">{errorMessage}</div>}
                    </div>
                )}
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

