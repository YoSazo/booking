import React, { useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
// UPDATED IMPORT: Added PaymentRequestButtonElement
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// UPDATED PROPS: clientSecret is now required here
const CheckoutForm = ({ bookingDetails, guestInfo, onComplete, clientSecret }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
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

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { receipt_email: guestInfo.email, return_url: `${window.location.origin}/confirmation`,},
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
                    <p style={{textAlign: 'center', padding: '10px 0'}}>Checking wallet availability...</p>
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


function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete , apiBaseUrl }) {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', address: '', city: '', state: '', zip: '',
    phone: '+1 ', email: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [autocomplete, setAutocomplete] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // We check for bookingDetails.subtotal now, not bookingDetails.total
    if (bookingDetails && bookingDetails.subtotal) {

        // --- THIS IS THE CORRECTED FETCH CALL ---
        fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // The body now ONLY contains the amount, which is what the server expects.
            body: JSON.stringify({ 
                amount: bookingDetails.subtotal / 2, hotelUrl: hotel.url
            }),
        })
        .then((res) => {
            if (!res.ok) {
                // This makes the error message more descriptive
                throw new Error('Failed to create payment intent');
            }
            return res.json();
        })
        .then((data) => {
             if (!data.clientSecret) {
                throw new Error("Client secret not received from server.");
             }
             setClientSecret(data.clientSecret)
        })
        .catch(error => {
            // This will now log the detailed error to your browser console
            console.error("Error fetching client secret:", error);
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
  };
  
  const priceToday = bookingDetails.subtotal / 2;
  const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;
  
  // FIX: Add explicit locale for stability on iOS/WebKit browsers
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
          <p>Please provide your details to complete the booking.</p>
        </div>
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
        <div className="guest-info-form">
          <div className="form-grid">
            <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required/></div>
            <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required/></div>
            <div className="form-field full-width">
              <label>Address</label>
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing your address..." />
              </Autocomplete>
            </div>
            <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required/></div>
            <div className="form-field"><label>State / Province</label><input type="text" name="state" value={formData.state} onChange={handleChange} required/></div>
            <div className="form-field"><label>Zip / Postal Code</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} required/></div>
            <div className="form-field"><label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} />
              {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
            </div>
            <div className="form-field full-width"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required/></div>
          </div>
          <div className="payment-placeholder">
            <img src="/stripe-checkout.png" alt="Powered by Stripe" className="stripe-badge-image" />
            {clientSecret ? (
              <Elements options={stripeOptions} stripe={stripePromise}>
                <CheckoutForm 
                    bookingDetails={bookingDetails} 
                    guestInfo={formData} 
                    onComplete={onComplete} 
                    clientSecret={clientSecret}
                />
              </Elements>
            ) : (
              <p style={{textAlign: 'center'}}>Loading secure payment form...</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GuestInfoPage;