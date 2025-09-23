import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);


// --- NEW: SVG Icons for Payment Tabs ---
const LOGOS = {
  card: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNCIgcng9IjIiLz48bGluZSB4MT0iMiIgeTE9IjEwIiB4Mj0iMjIiIHkyPSIxMCIvPjwvc3ZnPg==',
  'Apple Pay': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJjdXJyZW50Q29sb3IiPjxwYXRoIGQ9Ik0xOS4xOCw5LjU0YTMuNCwzLjQsMCwwLDAtMS4yMS0uMiw0Ljg3LDQuODcsMCwwLDAtMy42LDEuNyw0LjMyLDQuMzIsMCwwLDAtMS4yNiwzLjIyLDUsNSwwLDAsMCwyLjM3LDQuMzIsNC4xNyw0LjE3LDAsMCwwLDIuODMuOTQsMi41LDIuNSwwLDAsMCwxLS4xMyw0LjQyLDQuNDIsMCwwLDAsMi4zOS0yLjYxLDEuMjUsMS4yNSwwLDAsMSwxLjE3LS43OSwxLjE4LDEuMTgsMCwwLDEsLjg0LjM4LDEuMywxLjMsMCwwLDEsLjIxLDEuNTUsNi44Niw2Ljg2LDAsMCwxLTMuNjYsNC4xLDYsNiwwLDAsMS00LjIyLjk1LDYuNTMsNi41MywwLDAsMS01LTIuMjhBNi4yOSw2LjI5LDAsMCwxLDguMzUsMTRhNi43Niw2Ljc2LDAsMCwxLDMtNS40Niw2LjQsNi40LDAsMCwxLDQuNDktMS41OCw0LjcyLDQuNzIsMCwwLDEsMi41My41OCwxLjIyLDEuMjIsMCwwLDEsLjUxLjkzLDEuMzIsMS4zMiwwLDAsMS0xLC44OEEuMTcsMS4xNywwLDAsMSwxOS4xOCw5LjU0Wk0xNS4wNywzLjY5YTQuNSw0LjUsMCwwLDAtMS42MywzLjMxLDQuMzUsNC4zNSwwLDAsMCwxLjM1LTIuNTN BNC4yLDQuMiwwLDAsMCwxNS4wNywzLjY5WiIvPjwvc3ZnPg==',
  'Google Pay': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJjdXJyZW50Q29sb3IiPjxwYXRoIGQ9Ik0yMC40LDkuNkgxOXYtLjhBMi4xLDIuMSwwLDAsMCwxNy45LDYuN0g1LjdBMi4xLDIuMSwwLDAsMCwzLjYsOC44djcuNmEyLjEsMi4xLDAsMCwwLDIuMSwyLjFoMTIuMmEyLjEsMi4xLDAsMCwwLDIuMS0yLjF2LTEuMWguNGExLjgsMS44LDAsMCwwLDEuOC0xLjhWMTFBNTEuOCwxLjgsMCwwLDAsMjAuNCw5LjZaTTUuNyw4LjhoMTIuMmEuMS4xLDAsMCwxLC4xLjF2LjdINS42di0uN0EuMS4xLDAsMCwxLDUuNyw4LjhabTEyLjIsOGEuMS4xLDAsMCwxLS4xLjFINTdhLjEuMSwwLDAsMS0uMS0uMVYxMi4ySDE4djQuNlptMi41LTQuNWwuMy4zLDAsMCwxLS4zLjNoLS40VjExLjFoLjRhLjMuMywwLDAsMSwuMy4zWiIvPjxwYXRoIGQ9Ik0xMi45LDEzLjh2MS4zaDIuM2ExLjksMS45LDAsMSwxLTEuOS0xLjksMiwyLDAsMCwxLDEuNS43bC45LS45YTMuMSwzLjEsMCwxLDAtMi40LDUuMSwzLjIsMy4yLDAsMCwwLDMuMi0zLjJWMTMuOFoiLz48L3N2Zz4=',
};


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

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

// This is the main component that controls the multi-step flow.
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

    // New state for tabbed payment methods
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [paymentRequest, setPaymentRequest] = useState(null);
    const [walletType, setWalletType] = useState(null);

    // Fetch the Payment Intent from the server
    useEffect(() => {
        if (bookingDetails && bookingDetails.subtotal) {
            fetch(`${apiBaseUrl}/api/create-payment-intent`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
            })
            .then((res) => res.json()).then((data) => setClientSecret(data.clientSecret));
        }
    }, [bookingDetails, apiBaseUrl]);

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
                        setWalletType('Wallet'); // Fallback
                    }
                }
            });

            pr.on('paymentmethod', async (ev) => {
                sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
                sessionStorage.setItem('guestInfo', JSON.stringify(formData));
                const { error: confirmError } = await stripe.confirmCardPayment(
                    clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false }
                );
                if (confirmError) {
                    ev.complete('fail');
                    setErrorMessage(confirmError.message);
                    return;
                }
                ev.complete('success');
                window.location.href = `${window.location.origin}/confirmation?payment_intent_client_secret=${clientSecret}`;
            });
        }
    }, [stripe, clientSecret, bookingDetails, formData]);


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
        if (!stripe || !elements || !elements.getElement(CardElement)) return;
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');
        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(formData));

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement),
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
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }
        if (paymentRequest) {
            paymentRequest.show();
        }
    };

    const renderWalletIcon = () => {
        if (walletType === 'Apple Pay') return <ApplePayLogo />;
        if (walletType === 'Google Pay') return <GooglePayLogo />;
        return null;
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
                                    <button type="button" className={`tab-button ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>
                                        <img src={LOGOS.card} alt="Card" className="payment-logo" /> Card
                                    </button>
                                    {walletType && (
                                        <button type="button" className={`tab-button ${paymentMethod === 'wallet' ? 'active' : ''}`} onClick={() => setPaymentMethod('wallet')}>
                                            <img src={LOGOS[walletType]} alt={walletType} className="payment-logo" /> {walletType}
                                        </button>
                                    )}
                                </div>
                                
                                <div className="payment-content">
                                    {paymentMethod === 'card' && (
    <div className="card-and-billing-container">
        {/* --- UPDATED: Split Card Fields --- */}
        <div className="split-card-fields">
            <div className="card-field-wrapper">
                <label>Card number</label>
                <CardNumberElement options={ELEMENT_OPTIONS} />
            </div>
            <div className="card-field-wrapper half-width">
                <label>Expiration</label>
                <CardExpiryElement options={ELEMENT_OPTIONS} />
            </div>
            <div className="card-field-wrapper half-width">
                <label>CVC</label>
                <CardCvcElement options={ELEMENT_OPTIONS} />
            </div>
        </div>
    </div>
)}
                                </div>

                                <div className="billing-address-section">
                                    <label className="billing-address-label">Billing Address</label>
                                    <div className="form-grid">
                                        <div className="form-field full-width">
                                            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing your address..." />
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
                           </>
                        )}
                        {errorMessage && <div className="error-message payment-error">{errorMessage}</div>}
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