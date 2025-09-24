import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);



const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// This is the main component that controls the multi-step flow.
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
    const [cardBrand, setCardBrand] = useState('');
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
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const latestFormData = useRef(formData);
    useEffect(() => { latestFormData.current = formData; }, [formData]);

    // New state for tabbed payment methods
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [paymentRequest, setPaymentRequest] = useState(null);
    const [walletType, setWalletType] = useState(null);

useEffect(() => {
    console.log('DEBUG - hasAttemptedSubmit changed:', hasAttemptedSubmit);
    console.log('DEBUG - errorMessage:', errorMessage);
    if (hasAttemptedSubmit) {
        console.trace('hasAttemptedSubmit was set to true here:');
    }
}, [hasAttemptedSubmit]);

useEffect(() => {
    console.log('DEBUG - errorMessage changed:', errorMessage);
}, [errorMessage]);

    // Fetch the Payment Intent from the server
useEffect(() => {
    if (bookingDetails && bookingDetails.subtotal) {
        setErrorMessage('');
        fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then((data) => {
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                console.error('No client secret received:', data);
                // Don't set user error here since they haven't attempted payment
            }
        })
        .catch((error) => {
            console.error('Failed to create payment intent:', error);
            // Don't set errorMessage here! User hasn't attempted to pay yet.
            // This prevents the error from showing on page load.
        });
    }
}, [bookingDetails, apiBaseUrl]);

    // Replace your multiple reset useEffects with this single one:
    useEffect(() => {
        // Reset error state when we're on payment step and have all required data
        if (currentStep === 3 && bookingDetails && clientSecret) {
            setHasAttemptedSubmit(false);
            setErrorMessage('');
            setFormErrors({});
        }
        // Also reset when navigating away from payment step
        else if (currentStep < 3) {
            setHasAttemptedSubmit(false);
            setErrorMessage('');
            setFormErrors({});
        }
    }, [currentStep, bookingDetails, clientSecret]);

    useEffect(() => {
                if (elements) {
                    const cardNumberElement = elements.getElement(CardNumberElement);
                    if (cardNumberElement) {
                        cardNumberElement.on('change', (event) => {
                            setCardBrand(event.brand || '');
                        });
                    }
                }
            }, [elements]);

    // Create and check for a Payment Request (Apple Pay / Google Pay)
    useEffect(() => {
        if (stripe && clientSecret && bookingDetails) {
            const amountInCents = Math.round((bookingDetails.subtotal / 2) * 100);
            const pr = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Booking Payment', amount: amountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            pr.canMakePayment().then(result => {
    if (result) {
        setPaymentRequest(pr);
        if (result.applePay) {
            setWalletType('Apple Pay');
        } else if (result.googlePay) {
            setWalletType('Google Pay');
        } else {
            setWalletType('Wallet');
        }
    }
}).catch(error => {
    console.warn('Payment request check failed:', error);
    // Don't set user-facing error here - just disable wallet option
    setPaymentRequest(null);
    setWalletType(null);
});

            // Add this helper function

            pr.on('paymentmethod', async (ev) => {
            // Use the ref to get the latest form data
            sessionStorage.setItem('guestInfo', JSON.stringify(latestFormData.current));
            sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));

            const { error: confirmError } = await stripe.confirmCardPayment(
                clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false }
            );
            if (confirmError) {
                ev.complete('fail');
                setHasAttemptedSubmit(true);
                setErrorMessage(confirmError.message);
                return;
            }
            ev.complete('success');
            window.location.href = `${window.location.origin}/confirmation?payment_intent_client_secret=${clientSecret}`;

        });
        }
    }, [stripe, clientSecret, bookingDetails]);


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
        if (currentStep === 1) {
             setCurrentStep(2);
        } else if (currentStep === 2) {
            if (validateInfoStep()) {
                setFormErrors({});
                setCurrentStep(3);
            }
        }
    };
    
    const handleBackStep = () => {
        if (currentStep === 1) onBack();
        else setCurrentStep(prev => prev - 1);
        setHasAttemptedSubmit(false); // Reset attempt state when going back
        setErrorMessage('');
    };

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({...prev, [name]: ''}));
        if (errorMessage) setErrorMessage('');
    };
    
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+1 ')) value = '+1 ';
        setFormData(prev => ({ ...prev, phone: value }));
        if (formErrors.phone) setFormErrors(prev => ({...prev, phone: ''}));
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
    // Main submit handler for CARD PAYMENTS
    const handleCardSubmit = async (e) => {
        e.preventDefault();
        setHasAttemptedSubmit(true); // Signal that a payment attempt has been made

        if (!stripe || !elements || !elements.getElement(CardNumberElement)) {
            // This is an unexpected error, but good to have a safeguard
            setErrorMessage("Payment components are not ready. Please refresh the page.");
            return;
        }

        // --- Address validation is now ONLY here ---
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }

        setIsProcessing(true);
        setErrorMessage(''); // Clear previous errors before a new attempt
        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(formData));

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardNumberElement),
                billing_details: {
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    phone: formData.phone,
                    address: {
                        line1: formData.address,
                        city: formData.city,
                        state: formData.state,
                        postal_code: formData.zip,
                        country: 'US',
                    },
                },
            },
        });

        if (error) {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(formData, paymentIntent.id);
        }
        setIsProcessing(false);
    };

    // Click handler for WALLET PAYMENTS
    const handleWalletPayment = async () => {
        // Reset state before showing the wallet
        setErrorMessage('');
        setHasAttemptedSubmit(false);

        if (paymentRequest) {
            paymentRequest.show();
        } else {
            // This is a fallback in case the wallet button is shown by mistake
            setErrorMessage("Digital wallet is not available. Please select another payment method.");
            setHasAttemptedSubmit(true);
        }
    };

    const getWalletLogoInfo = () => {
        if (walletType === 'Apple Pay') return { src: '/apple.svg', alt: 'Apple Pay', className: 'apple-pay-logo' };
        if (walletType === 'Google Pay') return { src: '/google.svg', alt: 'Google Pay', className: 'google-pay-logo' };
        return { src: '/credit.svg', alt: 'Wallet', className: 'payment-logo' }; // Fallback
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
            
            <div className="guest-info-container" style={{ paddingBottom: currentStep < 3 ? '120px' : '40px' }}>
                <div className="guest-info-header">
                    <button onClick={handleBackStep} className="back-button">{getBackButtonText()}</button>
                    <h1>Guest Information</h1>
                </div>

                <div className="checkout-progress-bar">
                    <div className={`progress-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Review Cart</span>
                    </div>
                    <div className={`progress-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Info</span>
                    </div>
                    <div className={`progress-step ${currentStep === 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Payment</span>
                    </div>
                </div>

                {currentStep === 1 && (
                    <div className="info-summary-wrapper">
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
                
                <form id="main-checkout-form" onSubmit={handleCardSubmit}>
                    <div className="form-wrapper" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                        <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />{formErrors.firstName && <span className="error-message">{formErrors.firstName}</span>}</div>
                        <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />{formErrors.lastName && <span className="error-message">{formErrors.lastName}</span>}</div>
                        <div className="form-field"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} />{formErrors.phone && <span className="error-message">{formErrors.phone}</span>}</div>
                        <div className="form-field"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required />{formErrors.email && <span className="error-message">{formErrors.email}</span>}</div>
                    </div>

                    <div className="payment-wrapper" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                        <img src="/stripe-checkout.png" alt="Guaranteed safe and secure checkout" className="stripe-badge-image" />
                        
                        {!clientSecret ? (<p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p>) : (
                           <>
                                <div className="payment-method-tabs">
                                    <button type="button" className={`tab-button ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => {
    setPaymentMethod('card');
    setHasAttemptedSubmit(false);
    setErrorMessage('');
}}>
                                        <img src="/credit.svg" alt="Card" className="credit-card-logo" /> Card
                                    </button>
                                    {walletType && (
                                        <button type="button" className={`tab-button ${paymentMethod === 'wallet' ? 'active' : ''}`} onClick={() => setPaymentMethod('wallet')}>
                                            <img src={getWalletLogoInfo().src} alt={getWalletLogoInfo().alt} className={getWalletLogoInfo().className} /> {walletType}
                                        </button>
                                    )}
                                </div>
                                <div className="payment-content">
    {paymentMethod === 'card' && (
        <div className="card-and-billing-container">
            <div className="split-card-fields">
                {/* Card Number Field */}
                <div className="card-field-wrapper">
                    <label>Card number</label>
                    <div className="card-field-container">
                        <CardNumberElement options={ELEMENT_OPTIONS} />
                        <div className="card-brands">
                            {/* Always show these icons, highlight the detected one */}
                            <img 
                                src="/visa.svg" 
                                alt="Visa" 
                                className={`card-brand-icon ${cardBrand === 'visa' ? 'active' : ''}`} 
                            />
                            <img 
                                src="/mastercard.svg" 
                                alt="Mastercard" 
                                className={`card-brand-icon ${cardBrand === 'mastercard' ? 'active' : ''}`} 
                            />
                            <img 
                                src="/express.svg" 
                                alt="American Express" 
                                className={`card-brand-icon ${cardBrand === 'amex' ? 'active' : ''}`} 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Expiry and CVC Row */}
                <div className="card-fields-row">
                    <div className="card-field-wrapper">
                        <label>Expiration date</label>
                        <div className="card-field-container">
                            <CardExpiryElement options={ELEMENT_OPTIONS} />
                        </div>
                    </div>
                    <div className="card-field-wrapper">
                        <label>CVC</label>
                        <div className="card-field-container">
                            <CardCvcElement options={ELEMENT_OPTIONS} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )}

    {paymentMethod === 'wallet' && walletType && (
        <div className="wallet-selection-message">
            <img src={getWalletLogoInfo().src} alt={getWalletLogoInfo().alt} className={`${getWalletLogoInfo().className} large-wallet-logo`} />
            <p className="wallet-selected-text">{walletType} selected.</p>
            <div className="wallet-info-box">
                <img src="/exit.svg" alt="Transfer to wallet" className="transfer-icon"/>
                <span>Another step will appear to securely submit your payment information.</span>
            </div>
        </div>
    )}

    {paymentMethod === 'wallet' && !walletType && (
        <div className="wallet-info-box">
            <p>Select your wallet provider above.</p>
        </div>
    )}
</div>

<div className="billing-address-section">
    <label className="billing-address-label">Billing Address</label>
    <div className="form-grid">
        <div className="form-field full-width">
            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="Start typing your address..." 
                    autoComplete="street-address"
                />
            </Autocomplete>
        </div>
        {isAddressSelected && (
            <div className="address-reveal-container visible">
                <div className="form-field">
                    <label>City</label>
                    <input 
                        type="text" 
                        name="city" 
                        value={formData.city} 
                        onChange={handleChange} 
                        autoComplete="address-level2"
                    />
                </div>
                <div className="form-field">
                    <label>State</label>
                    <input 
                        type="text" 
                        name="state" 
                        value={formData.state} 
                        onChange={handleChange} 
                        autoComplete="address-level1"
                    />
                </div>
                <div className="form-field">
                    <label>Zip</label>
                    <input 
                        type="text" 
                        name="zip" 
                        value={formData.zip} 
                        onChange={handleChange} 
                        autoComplete="postal-code"
                    />
                </div>
            </div>
        )}
    </div>
</div>
                           </>
                        )}
                        {errorMessage && hasAttemptedSubmit && <div className="error-message payment-error">{errorMessage}</div>}
                    </div>
                </form>
                
                <div className={`checkout-cta-container ${currentStep < 3 ? 'is-sticky' : ''}`}>
                    {currentStep < 3 ? (
                        <button type="button" className="btn btn-confirm" onClick={handleNextStep}>
                           { currentStep === 1 && "Proceed to Info" }
                           { currentStep === 2 && "Proceed to Payment" }
                        </button>
                    ) : (
                         <button 
                            type={paymentMethod === 'card' ? "submit" : "button"} 
                            form={paymentMethod === 'card' ? "main-checkout-form" : undefined}
                            className="btn btn-confirm" 
                            onClick={paymentMethod === 'wallet' ? handleWalletPayment : undefined}
                            disabled={isProcessing || !clientSecret || !stripe || !elements}
                        >
                            {isProcessing ? "Processing..." : `Pay $${priceToday.toFixed(2)} and Complete Booking`}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

// The wrapper provides the Stripe context to the entire page.
function GuestInfoPageWrapper(props) {
    return (
        <Elements stripe={stripePromise}>
            <GuestInfoPage {...props} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;