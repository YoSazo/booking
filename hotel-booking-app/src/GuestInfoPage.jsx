import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
// UPDATED IMPORT: Added PaymentRequestButtonElement
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// UPDATED PROPS: clientSecret is now required here
const CheckoutForm = ({ bookingDetails, guestInfo, onComplete, clientSecret }) => {
    // State for the Payment Request object (Apple Pay / Google Pay)
    const [paymentRequest, setPaymentRequest] = useState(null);
    const amountInCents = Math.round((bookingDetails.subtotal / 2) * 100);

    // --- PAYMENT REQUEST API LOGIC ---
    useEffect(() => {
        if (!stripe || !clientSecret || !bookingDetails) return;

        // 1. Create the Payment Request object
        const pr = stripe.paymentRequest({
            country: 'US',
            currency: 'usd',
            total: {
                label: 'Booking Payment',
                amount: amountInCents,
            },
            requestPayerName: true,
            requestPayerEmail: true,
        });

        // 2. Check if Apple Pay/Google Pay is available
        pr.canMakePayment().then(result => {
            if (result) {
                setPaymentRequest(pr);
            }
        });

        // 3. Handle the payment confirmation event
        pr.on('paymentmethod', async (ev) => {
            setIsProcessing(true);
            
            // Store data immediately BEFORE Stripe redirects (CRITICAL FIX)
            sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
            sessionStorage.setItem('guestInfo', JSON.stringify(guestInfo));

            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                { payment_method: ev.paymentMethod.id },
                { handleActions: false }
            );

            if (confirmError) {
                ev.complete('fail');
                setErrorMessage(confirmError.message || "Payment authorization failed.");
                setIsProcessing(false);
                return;
            }

            ev.complete('success'); 

            if (paymentIntent && paymentIntent.status === 'requires_action') {
                const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
                if (actionError) {
                    setErrorMessage(actionError.message);
                    setIsProcessing(false);
                    return;
                }
            }
            
            // SUCCESS: Redirect to the return page to finalize the booking
            window.location.href = `${window.location.origin}/confirmation?payment_intent_client_secret=${clientSecret}`;
        });

        return () => {
            if (pr) pr.off('paymentmethod');
        };

    }, [stripe, clientSecret, amountInCents, bookingDetails, guestInfo]);
    // --- END PAYMENT REQUEST API LOGIC ---


    // Standard card submission handling (remains the same)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);

        if (!guestInfo.address || !guestInfo.city || !guestInfo.state || !guestInfo.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }

        setIsProcessing(true);
        sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));
        sessionStorage.setItem('guestInfo', JSON.stringify(guestInfo));
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { receipt_email: guestInfo.email, return_url: `${window.location.origin}/confirmation` },
            redirect: 'if_required'
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("An unexpected error occurred.");
            }
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // This handles card payments that succeed without a redirect
            onComplete(guestInfo, paymentIntent.id);
        }
    };
    

    return (
        <form onSubmit={handleSubmit}> 
            <div className="secure-payment-frame">
                {/* 1. Payment Request Button (Apple Pay/Google Pay) */}
                {paymentRequest ? (
                    <PaymentRequestButtonElement 
                        options={{
                            paymentRequest,
                            style: {
                                paymentRequestButton: {
                                    theme: 'dark',
                                    height: '40px',
                                },
                            },
                        }}
                    />
                ) : (
                    null
                )}
                
                <div className="payment-divider">
                    <span>OR PAY WITH CARD</span>
                </div>
                {/* 2. Payment Element (Standard Card) */}
                <PaymentElement 
                    options={{
                      wallets: {
                          applePay: 'never'
                      }
                    }}
                />
            </div>
            
            <button disabled={isProcessing || !stripe || !elements} className="btn btn-confirm" style={{ width: '100%', marginTop: '20px' }}>
                {isProcessing ? "Processing..." : `Pay $${(bookingDetails.subtotal / 2).toFixed(2)} and Complete Booking`}
            </button>
            {errorMessage && <div className="error-message" style={{textAlign: 'center', marginTop: '10px'}}>{errorMessage}</div>}
        </form>
    );
};


function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl }) {
  // --- NEW: State to manage which step of the checkout we are on ---
  const [currentStep, setCurrentStep] = useState(1); // 1: Review, 2: Info, 3: Payment
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '+1 ', email: '',
    address: '', city: '', state: '', zip: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [autocomplete, setAutocomplete] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [isAddressSelected, setIsAddressSelected] = useState(false);


  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    if (bookingDetails && bookingDetails.subtotal) {
        fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: bookingDetails.subtotal / 2, hotelUrl: hotel.url
            }),
        })
        .then((res) => res.json())
        .then((data) => setClientSecret(data.clientSecret));
    }
  }, [bookingDetails, apiBaseUrl, hotel.url]);

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
      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';
      let zip = '';
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
        address: `${streetNumber} ${route}`.trim(),
        city: city,
        state: state,
        zip: zip,
      }));
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
    setIsAddressSelected(true);
  };
  
  const priceToday = bookingDetails.subtotal / 2;
  const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;
  
  // FIX: Add explicit locale for stability on iOS/WebKit browsers
  const stripeOptions = { clientSecret, appearance: { theme: 'stripe' }, locale: 'en' };
  const handleNextStep = () => {
      // Validate the simplified form before moving to payment
      if (currentStep === 2) {
          if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return; // Exit the function early
          }
      }
      setCurrentStep(prev => prev + 1);
  };
  const getProgressWidth = () => {
      if (currentStep === 1) return '0%';
      if (currentStep === 2) return '50%';
      if (currentStep === 3) return '100%';
      return '0%';
  };

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

        {/* --- NEW: The Progress Bar --- */}
        <div className="checkout-progress-bar">
            <div className="progress-step completed">
                <div className="step-circle"></div>
                <span className="step-name">Review Cart</span>
            </div>
            <div className={`progress-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
                <div className="step-circle"></div>
                <span className="step-name">Info</span>
            </div>
            <div className={`progress-step ${currentStep === 3 ? 'active' : ''}`}>
                <div className="step-circle"></div>
                <span className="step-name">Payment</span>
            </div>
            <div className="progress-line"><div className="progress-line-fill" style={{width: getProgressWidth()}}></div></div>
        </div>

        {/* --- Step 1: Review Cart --- */}
        {currentStep === 1 && (
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
        )}

        {/* --- Step 2 & 3: Main Form Container --- */}
        {currentStep > 1 && (
            <div className="guest-info-form">
                {/* --- Step 2 Content: Simplified Info Form --- */}
                {currentStep === 2 && (
                    <div className="form-grid">
                        <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required/></div>
                        <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required/></div>
                        <div className="form-field"><label>Phone Number</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} />
                          {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                        </div>
                        <div className="form-field"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required/></div>
                    </div>
                )}

                {/* --- Step 3 Content: Payment and Billing Address --- */}
                {currentStep === 3 && (
                    <div className="payment-placeholder">
                      <img 
                          src="/stripe-checkout.png" 
                          alt="Guaranteed safe and secure checkout" 
                          className="stripe-badge-image" 
                      />
                      {clientSecret ? (
                        <Elements options={stripeOptions} stripe={stripePromise}>
                          <CheckoutForm 
                              bookingDetails={bookingDetails} 
                              guestInfo={formData} 
                              onComplete={onComplete} 
                              clientSecret={clientSecret}
                          />
                        </Elements>
                      ) : ( <p>Loading...</p> )}
                      
                      <div className="billing-address-section">
                          <h4 className="billing-address-title">Billing Address</h4>
                          <div className="form-grid">
                            <div className="form-field full-width">
                              <label>Address</label>
                              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing your address..." />
                              </Autocomplete>
                            </div>
                            <div className={`address-reveal-container ${isAddressSelected ? 'visible' : ''}`}>
                              {isAddressSelected && (
                                <>
                                  <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required/></div>
                                  <div className="form-field"><label>State / Province</label><input type="text" name="state" value={formData.state} onChange={handleChange} required/></div>
                                  <div className="form-field"><label>Zip / Postal Code</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} required/></div>
                                </>
                              )}
                            </div>
                          </div>
                      </div>
                    </div>
                )}
            </div>
        )}
        
        {/* --- The Main CTA Button (hidden on the final payment step) --- */}
        {currentStep < 3 && (
            <div className="checkout-cta-container">
                 <button className="btn btn-confirm" style={{width: '100%'}} onClick={handleNextStep}>
                    {currentStep === 1 ? 'Proceed to Info' : 'Proceed to Payment'}
                </button>
            </div>
        )}
      </div>
    </>
  );
}

export default GuestInfoPage;