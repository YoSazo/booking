import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// This component displays the Stripe elements and the final 'Pay' button
const StripePaymentForm = ({ bookingDetails, guestInfo, clientSecret, onComplete, errorMessage, setErrorMessage, isProcessing, setIsProcessing }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [paymentRequest, setPaymentRequest] = useState(null);
    const [showPaymentButtons, setShowPaymentButtons] = useState(false);

    const handleWalletClick = (e) => {
        // FIXED: Only validate when wallet button is actually clicked
        if (!guestInfo.address) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return false;
        }
        return true;
    };

    useEffect(() => {
        const timer = setTimeout(() => setShowPaymentButtons(true), 300);
        return () => clearTimeout(timer);
    }, []);

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
            // FIXED: Validate address before processing payment
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
    const paymentHeaderRef = useRef(null);

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

    // FIXED: This function now ONLY validates info step fields and NEVER sets main error message
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

    // FIXED: Simple function that only returns true/false, no error setting
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
        setErrorMessage('');
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

        // Clear inline errors
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        // FIXED: Clear billing address error when user types in any address field
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
            // FIXED: Clear error when address is selected
            setErrorMessage('');
        }
        setIsAddressSelected(true);
    };

    // FIXED: This is the ONLY place where billing address validation should set the main error
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
    const stripeOptions = { clientSecret, appearance: { theme: 'stripe' }, locale: 'en' };

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
                        <div className="form-field">
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
                            <img
                                src="/stripe-checkout.png"
                                alt="Guaranteed safe and secure checkout"
                                className="stripe-badge-image"
                                tabIndex="-1"
                            />
                            {clientSecret ? (
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

                                    <div className="billing-address-section">
                                        <div className="form-grid">
                                            <div className="form-field full-width">
                                                <label>Billing Address</label>
                                                <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                                    <input
                                                        type="text"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        placeholder="Start typing..."
                                                        readOnly
                                                        onTouchStart={(e) => e.target.removeAttribute('readonly')}
                                                        onPaste={handleAddressPaste}
                                                        autoComplete="off"
                                                    />
                                                </Autocomplete>
                                            </div>
                                            {isAddressSelected && (
                                                <div className="address-reveal-container visible">
                                                    <div className="form-field">
                                                        <label>City</label>
                                                        <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                                                    </div>
                                                    <div className="form-field">
                                                        <label>State</label>
                                                        <input type="text" name="state" value={formData.state} onChange={handleChange} required />
                                                    </div>
                                                    <div className="form-field">
                                                        <label>Zip</label>
                                                        <input type="text" name="zip" value={formData.zip} onChange={handleChange} required />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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

// The wrapper provides the Stripe context to the entire page.
function GuestInfoPageWrapper({ clientSecret, ...props }) {
    if (!clientSecret) {
        return <p style={{ textAlign: "center", padding: "50px" }}>Loading payment form...</p>;
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret,
                appearance: { theme: "stripe" },
                locale: "en",
            }}
        >
            <GuestInfoPage {...props} clientSecret={clientSecret} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;