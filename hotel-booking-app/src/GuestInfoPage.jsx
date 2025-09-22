import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// This component displays the Stripe elements and the final 'Pay' button
const StripePaymentForm = ({ bookingDetails, guestInfo, clientSecret, onComplete }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [paymentRequest, setPaymentRequest] = useState(null);

    // This logic is self-contained and correct.
    useEffect(() => {
        if (!stripe || !clientSecret || !bookingDetails) return;
        const amountInCents = Math.round((bookingDetails.subtotal / 2) * 100);
        const pr = stripe.paymentRequest({
            country: 'US', currency: 'usd',
            total: { label: 'Booking Payment', amount: amountInCents },
            requestPayerName: true, requestPayerEmail: true,
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
    }, [stripe, clientSecret, bookingDetails, guestInfo]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        if (!guestInfo.address || !guestInfo.city || !guestInfo.state || !guestInfo.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }
        setIsProcessing(true);
        setErrorMessage('');
        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(guestInfo));
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                receipt_email: guestInfo.email,
                return_url: `${window.location.origin}/confirmation`,
            },
            redirect: 'if_required'
        });
        if (error) {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(guestInfo, paymentIntent.id);
        }
        setIsProcessing(false);
    };

    return (
    <div className="secure-payment-frame">
        {paymentRequest && <PaymentRequestButtonElement options={{ paymentRequest, style: { paymentRequestButton: { theme: 'dark', height: '40px' } } }} />}
        {paymentRequest && <div className="payment-divider"><span>OR PAY WITH CARD</span></div>}
        <PaymentElement />
    </div>
);

// This is the main component that controls the multi-step flow.
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    // --- FIXED: The formErrors state is correctly defined here ---
    const [formErrors, setFormErrors] = useState({});
    const [clientSecret, setClientSecret] = useState('');
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);

    useEffect(() => {
        if (bookingDetails && bookingDetails.subtotal) {
            fetch(`${apiBaseUrl}/api/create-payment-intent`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
            })
            .then((res) => res.json()).then((data) => setClientSecret(data.clientSecret));
        }
    }, [bookingDetails, apiBaseUrl]);

    const validateInfoStep = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = "First name is required.";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
        if (!formData.email.trim()) errors.email = "Email is required.";
        if (formData.phone.replace(/\D/g, '').length < 11) errors.phone = "A valid phone number is required.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep = () => {
        if (currentStep === 2) {
            if (!validateInfoStep()) return;
        }
        setFormErrors({});
        setCurrentStep(prev => prev + 1);
    };

    const handleBackStep = () => {
        if (currentStep === 1) { onBack(); }
        else { setCurrentStep(prev => prev - 1); }
    };

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({...prev, [name]: ''}));
        }
    };
    
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+1 ')) { value = '+1 '; }
        setFormData(prev => ({ ...prev, phone: value }));
        if (formErrors.phone) { setFormErrors(prev => ({...prev, phone: ''})); }
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
          setFormData(prev => ({...prev, address: `${streetNumber} ${route}`.trim(), city, state, zip}));
        }
        setIsAddressSelected(true);
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        if (currentStep === 2) { // If on the info step, validate and move to payment
            if (validateInfoStep()) {
                setFormErrors({});
                setCurrentStep(3);
            }
            return;
        }

        if (currentStep === 3) { // If on the payment step, process the payment
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
        }
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
            
            {/* --- FIXED: The padding is now applied correctly here --- */}
            <div className="guest-info-container" style={{ paddingBottom: currentStep < 3 ? '120px' : '40px' }}>
                <div className="guest-info-header">
                    <button onClick={handleBackStep} className="back-button">{getBackButtonText()}</button>
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

                {/* --- RESTORED: All original JSX for your steps is back --- */}
                {currentStep === 1 && (
                    <div className="info-summary-wrapper" style={{ display: currentStep === 1 ? 'block' : 'none' }}>
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
                )}
                
                <form id="main-checkout-form" onSubmit={handleFinalSubmit}>
                    <div className="form-wrapper" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                        <div className="form-grid">
                            <label>First Name</label>
                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            {formErrors.firstName && <span className="error-message">{formErrors.firstName}</span>}
                        </div>
                        <div className="form-field">
                            <label>Last Name</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            {formErrors.lastName && <span className="error-message">{formErrors.lastName}</span>}
                        </div>
                        <div className="form-field">
                            <label>Phone Number</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} />
                            {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                        </div>
                        <div className="form-field">
                            <label>Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                            {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                        </div>
                    </div>

                <div className="payment-wrapper" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                     <div className="payment-placeholder">
                        <img src="/stripe-checkout.png" alt="Guaranteed safe and secure checkout" className="stripe-badge-image" />
                        {clientSecret ? (
                            <Elements options={stripeOptions} stripe={stripePromise}>
                                <StripePaymentForm 
                                    bookingDetails={bookingDetails} 
                                    guestInfo={formData} 
                                    onComplete={onComplete}
                                    clientSecret={clientSecret}
                                />
                                <div className="billing-address-section">
                                    <div className="form-grid">
                                        <div className="form-field full-width">
                                            <label>Billing Address</label>
                                            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing..." />
                                            </Autocomplete>
                                        </div>
                                        {isAddressSelected && (
                                            <div className="address-reveal-container visible">
                                                <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required/></div>
                                                <div className="form-field"><label>State</label><input type="text" name="state" value={formData.state} onChange={handleChange} required/></div>
                                                <div className="form-field"><label>Zip</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} required/></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Elements>
                        ) : ( <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p> )}
                    </div>
                </div>
                </form>
                
                {/* --- This button is now outside the forms and is conditionally sticky --- */}
                <div className={`checkout-cta-container ${currentStep < 3 ? 'is-sticky' : ''}`}>
                    {/* --- FIXED: The logic here is simplified. The button type changes based on the step --- */}
                    <button 
                        type={currentStep < 3 ? "button" : "submit"} 
                        form={currentStep === 3 ? "main-checkout-form" : undefined}
                        className="btn btn-confirm" 
                        onClick={currentStep < 3 ? handleNextStep : undefined}
                        disabled={currentStep === 3 && (isProcessing || !stripe || !elements)}
                    >
                        { currentStep === 1 && "Proceed to Info" }
                        { currentStep === 2 && "Proceed to Payment" }
                        { currentStep === 3 && (isProcessing ? "Processing..." : `Pay $${(priceToday).toFixed(2)} and Complete Booking`) }
                    </button>
                </div>
                {errorMessage && currentStep === 3 && <div className="error-message" style={{textAlign: 'center', marginTop: '-10px'}}>{errorMessage}</div>}
            </div>
        </>
    );
}

// The wrapper provides the Stripe context to the entire page.
function GuestInfoPageWrapper(props) {
    // This component does not need to call useStripe() itself.
    return (
        <Elements stripe={stripePromise}>
            <GuestInfoPage {...props} />
        </Elements>
    );
}}

export default GuestInfoPageWrapper;