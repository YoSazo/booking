import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// This component displays the Stripe elements and the final 'Pay' button
// NO CHANGES NEEDED IN THIS COMPONENT
const StripePaymentForm = ({ bookingDetails, guestInfo, clientSecret, onComplete, errorMessage, setErrorMessage, isProcessing, setIsProcessing }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentRequest, setPaymentRequest] = useState(null);
    const [showPaymentButtons, setShowPaymentButtons] = useState(false);

    const handleWalletClick = (e) => {
        return true;
    };

    useEffect(() => {
        const timer = setTimeout(() => setShowPaymentButtons(true), 300);
        return () => clearTimeout(timer);
    }, []);

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
            if (!guestInfo.address || !guestInfo.city || !guestInfo.state || !guestInfo.zip) {
                setErrorMessage("Please fill out your billing address before proceeding.");
                ev.complete('fail');
                return;
            }
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
    }, [stripe, clientSecret, bookingDetails, guestInfo, setErrorMessage]);

    return (
        <div className="secure-payment-frame">
            {paymentRequest && showPaymentButtons && (
                <PaymentRequestButtonElement
                    options={{
                        paymentRequest,
                        style: { paymentRequestButton: { theme: 'dark', height: '40px' } }
                    }}
                    onClick={handleWalletClick}
                />
            )}

            {paymentRequest && (
                <div className="payment-divider">
                    <span>OR PAY WITH CARD</span>
                </div>
            )}

            <PaymentElement />
        </div>
    );
};

// This is the main component that controls the multi-step flow.
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl, clientSecret }) {
    const stripe = useStripe();
    const elements = useElements();
    const [currentStep, setCurrentStep] = useState(1);
    const addressInputRef = useRef(null);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // ✅ NEW STATE: This will control the rendering of the Stripe form.
    const [showStripeForm, setShowStripeForm] = useState(false);

    const paymentHeaderRef = useRef(null);

    // ✅ MODIFIED EFFECT: This now delays the appearance of the Stripe form itself.
    useEffect(() => {
        if (currentStep === 3) {
            // Ensure the form is hidden initially when switching to step 3
            setShowStripeForm(false);
            // Set a short timer to allow the UI to update and then show the form
            const timer = setTimeout(() => {
                setErrorMessage(''); // Clear any lingering errors
                setShowStripeForm(true); // Now, render the Stripe form
            }, 100); // A 100ms delay is usually enough
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    const handleAddressPaste = (e) => {
        setTimeout(() => {
            const input = e.target;
            if (input) {
                const event = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    bubbles: true,
                    cancelable: true,
                });
                input.dispatchEvent(event);
            }
        }, 100);
    };

    const validateInfoStep = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = "First name is required.";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
        if (!formData.email.trim()) {
            errors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = "Please enter a valid email address.";
        }
        if (formData.phone.replace(/\D/g, '').length < 11) {
            errors.phone = "A valid phone number is required.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePaymentStep = () => {
        return (
            formData.address.trim() !== "" &&
            formData.city.trim() !== "" &&
            formData.state.trim() !== "" &&
            formData.zip.trim() !== ""
        );
    };

    const handleNextStep = () => {
        if (currentStep === 2 && !validateInfoStep()) return;
        setFormErrors({});
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handleBackStep = () => {
        setErrorMessage('');
        if (currentStep === 1) onBack();
        else setCurrentStep(prev => prev - 1);
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
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (
            errorMessage.includes("billing address") &&
            ['address', 'city', 'state', 'zip'].includes(name) &&
            value.trim() !== ''
        ) {
            setErrorMessage('');
        }
    };

    const handlePhoneChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+1 ')) { value = '+1 '; }
        setFormData(prev => ({ ...prev, phone: value }));
        if (formErrors.phone) { setFormErrors(prev => ({ ...prev, phone: '' })); }
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
            setFormData(prev => ({ ...prev, address: `${streetNumber} ${route}`.trim(), city, state, zip }));
            setErrorMessage('');
        }
        setIsAddressSelected(true);
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        if (!validatePaymentStep()) {
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
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(formData, paymentIntent.id);
        }
    };

    if (!bookingDetails) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading booking details...</div>;
    }

    const priceToday = bookingDetails.subtotal / 2;
    const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;
    
    return (
        <>
            <div className="static-banner">
                ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotel.phone} — we're happy to help!
            </div>

            <div className="guest-info-container" style={{ paddingBottom: currentStep < 3 ? '120px' : '40px' }}>
                <div className="guest-info-header">
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

                {/* --- Steps 1 and 2 are unchanged --- */}
                {currentStep === 1 && (
                    <div className="info-summary-wrapper">
                        {/* ... your step 1 JSX ... */}
                    </div>
                )}
                <form id="main-checkout-form" onSubmit={handleFinalSubmit}>
                    <div className="form-wrapper" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                        {/* ... your step 2 JSX ... */}
                    </div>

                    <div className="payment-wrapper" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                        <div className="payment-placeholder">
                            <img
                                src="/stripe-checkout.png"
                                alt="Guaranteed safe and secure checkout"
                                className="stripe-badge-image"
                                tabIndex="-1"
                            />
                            {clientSecret && showStripeForm ? ( // ✅ CONDITIONALLY RENDER HERE
                                <>
                                    <StripePaymentForm
                                        bookingDetails={bookingDetails}
                                        guestInfo={formData}
                                        onComplete={onComplete}
                                        clientSecret={clientSecret}
                                        errorMessage={errorMessage}
                                        setErrorMessage={setErrorMessage}
                                        isProcessing={isProcessing}
                                        setIsProcessing={setIsProcessing}
                                    />
                                    {/* ... rest of your payment section ... */}
                                    <div className="billing-address-section">
                                      {/* ... your address form fields ... */}
                                    </div>
                                </>
                            ) : (
                                <p style={{ textAlign: 'center', padding: '20px' }}>
                                    Loading secure payment form...
                                </p>
                            )}
                        </div>
                    </div>
                </form>

                <div className={`checkout-cta-container ${currentStep < 3 ? 'is-sticky' : ''}`}>
                    <button
                        type={currentStep < 3 ? "button" : "submit"}
                        form={currentStep === 3 ? "main-checkout-form" : undefined}
                        className="btn btn-confirm"
                        onClick={currentStep < 3 ? handleNextStep : undefined}
                        disabled={currentStep === 3 && (isProcessing || !stripe || !elements)}
                    >
                        {currentStep === 1 && "Proceed to Info"}
                        {currentStep === 2 && "Proceed to Payment"}
                        {currentStep === 3 && (isProcessing ? "Processing..." : `Pay $${(priceToday).toFixed(2)} and Complete Booking`)}
                    </button>
                    <div className="cta-error-wrapper">
                        {errorMessage && (<div className="error-message">{errorMessage}</div>)}
                    </div>
                </div>
            </div>
        </>
    );
}

// NO CHANGES NEEDED IN THE WRAPPER
function GuestInfoPageWrapper({ clientSecret, ...props }) {
    if (!clientSecret) {
        return <p style={{ textAlign: "center", padding: "50px" }}>Loading payment form...</p>;
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" }, locale: "en" }}
        >
            <GuestInfoPage {...props} clientSecret={clientSecret} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;