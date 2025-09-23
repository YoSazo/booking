import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Main component for the multi-step guest info and payment flow
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
    const stripe = useStripe();
    const elements = useElements();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [clientSecret, setClientSecret] = useState('');
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // New state for the Vercel-style payment tabs
    const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'wallet'
    const [paymentRequest, setPaymentRequest] = useState(null);

    // Effect to create a payment intent on the server
    useEffect(() => {
        if (bookingDetails && bookingDetails.subtotal > 0) {
            fetch(`${apiBaseUrl}/api/create-payment-intent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
            })
            .then((res) => res.json())
            .then((data) => setClientSecret(data.clientSecret));
        }
    }, [bookingDetails, apiBaseUrl]);

    // Effect to set up the Payment Request (for Apple Pay / Google Pay)
    useEffect(() => {
        if (!stripe || !clientSecret || !bookingDetails) return;

        const amountInCents = Math.round((bookingDetails.subtotal / 2) * 100);
        const pr = stripe.paymentRequest({
            country: 'US',
            currency: 'usd',
            total: { label: 'Booking Deposit', amount: amountInCents },
            requestPayerName: true,
            requestPayerEmail: true,
        });

        pr.canMakePayment().then(result => {
            if (result) {
                setPaymentRequest(pr);
            } else {
                setPaymentMethod('card'); // Default to card if no wallet is available
            }
        });

        const handlePaymentMethod = async (ev) => {
            sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
            sessionStorage.setItem('guestInfo', JSON.stringify(formData));
            
            // Confirm the payment intent with the payment method from the wallet
            const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: ev.paymentMethod.id,
            }, {
                handleActions: false,
            });

            if (confirmError) {
                ev.complete('fail');
                setErrorMessage(confirmError.message || 'An unexpected error occurred.');
                return;
            }
            
            ev.complete('success');
            if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_confirmation") {
                 const { error } = await stripe.confirmCardPayment(clientSecret);
                 if(error) {
                    setErrorMessage("Failed to confirm payment. Please try again.");
                    return;
                 }
            }
            onComplete(formData, paymentIntent.id);
        };

        pr.on('paymentmethod', handlePaymentMethod);

        return () => {
            pr.off('paymentmethod', handlePaymentMethod);
        };
    }, [stripe, clientSecret, bookingDetails, formData, onComplete]);


    // Validation for the personal info step
    const validateInfoStep = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = "First name is required.";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errors.email = "A valid email is required.";
        if (formData.phone.replace(/\D/g, '').length < 11) errors.phone = "A valid phone number is required.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    // Validation for the billing address
    const validateBillingStep = () => {
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your complete billing address.");
            return false;
        }
        return true;
    };

    // --- NAVIGATION LOGIC ---
    const handleNextStep = () => {
        if (currentStep === 2 && !validateInfoStep()) return;
        setFormErrors({});
        setCurrentStep(prev => prev + 1);
    };

    const handleBackStep = () => {
        if (currentStep === 1) onBack();
        else setCurrentStep(prev => prev - 1);
    };

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info';
    };

    // --- FORM INPUT HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
    };
    
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+1 ')) value = '+1 ';
        setFormData(prev => ({ ...prev, phone: value }));
        if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
    };

    // --- GOOGLE AUTOCOMPLETE HANDLERS ---
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
            setIsAddressSelected(true);
            setErrorMessage(''); // Clear address error on selection
        }
    };

    // --- FINAL SUBMISSION HANDLER ---
    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!validateBillingStep()) return;
        if (!stripe || !elements) {
            setErrorMessage("Payment system is not ready. Please wait.");
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');
        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(formData));

        if (paymentMethod === 'card') {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: { receipt_email: formData.email },
                redirect: 'if_required'
            });

            if (error) {
                setErrorMessage(error.message || "An unexpected error occurred.");
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onComplete(formData, paymentIntent.id);
            }
            setIsProcessing(false);

        } else if (paymentMethod === 'wallet') {
            if (paymentRequest) {
                paymentRequest.show(); // This triggers the 'paymentmethod' event listener from the useEffect
            } else {
                setErrorMessage("Wallet payment is not available on this device.");
            }
            setIsProcessing(false); // Processing is handled inside the event listener
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
            <style>{`
                .payment-method-tabs { display: flex; border-radius: 8px; background-color: #f3f4f6; padding: 4px; margin-bottom: 24px; }
                .payment-method-tabs button { flex: 1; padding: 10px 16px; border: none; background-color: transparent; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 0.2s ease, color 0.2s ease; color: #6b7280; }
                .payment-method-tabs button.active { background-color: #ffffff; color: #111827; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
                .wallet-placeholder { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; color: #4b5563; margin-bottom: 24px; font-size: 14px; }
                .billing-address-section { margin-top: 24px; }
                .billing-address-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #111827; }
                .payment-error { margin-top: 16px; color: #ef4444; text-align: center; font-size: 14px; }
                .secure-payment-frame { padding-top: 8px; }
                .form-wrapper .error-message { color: #ef4444; font-size: 13px; padding-top: 4px; }
            `}</style>

            <div className="static-banner">
                ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotel.phone} — we're happy to help!
            </div>
            
            <div className="guest-info-container" style={{ paddingBottom: currentStep < 3 ? '120px' : '40px' }}>
                <div className="guest-info-header">
                    <button onClick={handleBackStep} className="back-button">{getBackButtonText()}</button>
                    <h1>Guest Information</h1>
                </div>

                <div className="checkout-progress-bar">
                    <div className={`progress-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}><div className="step-circle"></div><span className="step-name">Review Cart</span></div>
                    <div className={`progress-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}><div className="step-circle"></div><span className="step-name">Info</span></div>
                    <div className={`progress-step ${currentStep === 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}><div className="step-circle"></div><span className="step-name">Payment</span></div>
                </div>

                {currentStep === 1 && (
                    <div className="info-summary-wrapper">
                        <div className="summary-card-details"><p className="detail-line">{bookingDetails.name}</p><p className="detail-line">{bookingDetails.guests} {bookingDetails.guests > 1 ? 'Guests' : 'Guest'}</p><p className="detail-line">{bookingDetails.pets} {bookingDetails.pets === 1 ? 'Pet' : 'Pets'}</p></div>
                        <div className="summary-card-price"><p className="price-line"><strong>{bookingDetails.nights}</strong> Nights</p><p className="price-line">Subtotal: <strong>${bookingDetails.subtotal.toFixed(2)}</strong></p><p className="price-line">Taxes & Fees: <strong>${bookingDetails.taxes.toFixed(2)}</strong></p><div className="total-breakdown"><p className="pay-today">Only Pay ${priceToday.toFixed(2)} Today</p><p className="balance-due">Balance (${balanceDue.toFixed(2)}) When you arrive</p></div></div>
                    </div>
                )}
                
                <form id="main-checkout-form" onSubmit={handleFinalSubmit}>
                    <div className="form-wrapper" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                        <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /><span className="error-message">{formErrors.firstName}</span></div>
                        <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /><span className="error-message">{formErrors.lastName}</span></div>
                        <div className="form-field"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} /><span className="error-message">{formErrors.phone}</span></div>
                        <div className="form-field"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /><span className="error-message">{formErrors.email}</span></div>
                    </div>

                    <div className="payment-wrapper" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                        {clientSecret ? (
                            <>
                                <div className="payment-method-tabs">
                                    <button type="button" onClick={() => setPaymentMethod('card')} className={paymentMethod === 'card' ? 'active' : ''}>Card</button>
                                    {paymentRequest && <button type="button" onClick={() => setPaymentMethod('wallet')} className={paymentMethod === 'wallet' ? 'active' : ''}>Apple Pay / Google Pay</button>}
                                </div>
                                
                                <div className="payment-form-content">
                                    {paymentMethod === 'card' && <div className="secure-payment-frame"><PaymentElement /></div>}
                                    {paymentMethod === 'wallet' && <div className="wallet-placeholder"><p>After filling in your address, click the payment button below to open the Apple Pay / Google Pay modal.</p></div>}
                                    
                                    <div className="billing-address-section">
                                        <h3>Billing Address</h3>
                                        <div className="form-grid">
                                            <div className="form-field full-width">
                                                <label>Address</label>
                                                <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}><input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing..." /></Autocomplete>
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
                                    {errorMessage && <div className="payment-error">{errorMessage}</div>}
                                </div>
                            </>
                        ) : ( <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p> )}
                    </div>
                </form>
                
                <div className={`checkout-cta-container ${currentStep < 3 ? 'is-sticky' : ''}`}>
                    <button 
                        type={currentStep < 3 ? "button" : "submit"} 
                        form={currentStep === 3 ? "main-checkout-form" : undefined}
                        className="btn btn-confirm" 
                        onClick={currentStep < 3 ? handleNextStep : undefined}
                        disabled={isProcessing || (currentStep === 3 && !stripe)}
                    >
                        { currentStep === 1 && "Proceed to Info" }
                        { currentStep === 2 && "Proceed to Payment" }
                        { currentStep === 3 && (isProcessing ? "Processing..." : `Pay $${(priceToday).toFixed(2)} and Complete Booking`) }
                    </button>
                </div>
            </div>
        </>
    );
}

// Wrapper provides the Stripe context to the entire page
function GuestInfoPageWrapper(props) {
    const { clientSecret, bookingDetails } = props;
    const stripeOptions = { 
        clientSecret, 
        appearance: { theme: 'stripe' }, 
        locale: 'en' 
    };

    // We must render Elements conditionally based on clientSecret availability
    return (
        <>
            {clientSecret && bookingDetails ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                    <GuestInfoPage {...props} />
                </Elements>
            ) : (
                // A loading state while the client secret is being fetched in App.jsx
                <div style={{textAlign: 'center', padding: '80px'}}>Loading secure payment portal...</div>
            )}
        </>
    );
}

export default GuestInfoPageWrapper;
