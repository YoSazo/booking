import React, { useState, useEffect } from 'react'; // FIXED: Added useEffect to the import
import { Autocomplete } from '@react-google-maps/api';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ bookingDetails, guestInfo, onComplete }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { receipt_email: guestInfo.email },
            redirect: 'if_required' 
        });

        if (error) {
            // This error is for card payments. Express checkout errors are handled separately.
            if (error.type === "card_error" || error.type === "validation_error") {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("An unexpected error occurred.");
            }
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(guestInfo, paymentIntent.id);
        }
    };

    const onConfirmExpressCheckout = ({paymentIntent}) => {
        if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(guestInfo, paymentIntent.id);
        } else {
            setErrorMessage("Express payment failed. Please try another method.");
        }
    };


    return (
        <form onSubmit={handleSubmit}>
            {/* --- NEW: The Express Checkout button --- */}
            {/* This will automatically show Apple Pay or Google Pay if available */}
            <ExpressCheckoutElement onConfirm={onConfirmExpressCheckout} />
            
            {/* A divider to separate the two payment options */}
            <div className="payment-divider">
                <span>OR PAY WITH CARD</span>
            </div>

            <PaymentElement />
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
    if (bookingDetails && bookingDetails.subtotal) {
        fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: bookingDetails.subtotal / 2 }),
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error('Failed to create payment intent');
            }
            return res.json();
        })
        .then((data) => {
            if (!data.clientSecret) {
                console.error("Client secret not received from server.");
                return;
            }
            setClientSecret(data.clientSecret)
        })
        .catch(error => console.error("Error fetching client secret:", error));
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
  
  const stripeOptions = { clientSecret, appearance: { theme: 'stripe' } };

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
            {/* --- UPDATED: Replaced the h3 tag with the Stripe badge --- */}
            <div className="stripe-badge-container">
              <svg width="110px" height="25px" viewBox="0 0 110 25" version="1.1" xmlns="http://www.w3.org/2000/svg">
                  <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                      <g transform="translate(-1.000000, 0.000000)">
                          <g transform="translate(1.000000, 0.000000)">
                              <path d="M101.201,10.494 C101.201,8.342 99.429,6.953 96.93,6.953 L93.635,6.953 L93.635,13.882 L96.93,13.882 C99.429,13.882 101.201,12.493 101.201,10.494 M91.131,4.45 L97.225,4.45 C101.53,4.45 103.738,7.185 103.738,10.468 C103.738,13.752 101.53,16.487 97.225,16.487 L91.131,16.487 L91.131,4.45 Z" fill="#6A7383"></path>
                              <rect fill="#6A7383" x="85.405" y="4.45" width="2.463" height="12.037"></rect>
                              <path d="M79.678,10.494 C79.678,8.342 77.906,6.953 75.407,6.953 L72.112,6.953 L72.112,13.882 L75.407,13.882 C77.906,13.882 79.678,12.493 79.678,10.494 M69.593,4.45 L75.705,4.45 C80.011,4.45 82.219,7.185 82.219,10.468 C82.219,13.752 80.011,16.487 75.705,16.487 L69.593,16.487 L69.593,4.45 Z" fill="#6A7383"></path>
                              <path d="M60.032,12.222 C60.032,9.816 58.749,8.203 56.195,8.203 C53.64,8.203 52.358,9.816 52.358,12.222 C52.358,14.628 53.64,16.24 56.195,16.24 C58.749,16.24 60.032,14.628 60.032,12.222 M49.879,12.222 C49.879,8.293 52.92,5.7 56.195,5.7 C59.469,5.7 62.51,8.293 62.51,12.222 C62.51,16.151 59.469,18.744 56.195,18.744 C52.92,18.744 49.879,16.151 49.879,12.222" fill="#6A7383"></path>
                              <path d="M38.809,4.45 L34.02,12.983 L34.02,4.45 L31.52,4.45 L31.52,18.571 L33.951,18.571 L38.809,9.88 L38.809,18.571 L41.309,18.571 L41.309,4.45 L38.809,4.45 Z" fill="#6A7383"></path>
                              <path d="M21.365,12.222 C21.365,9.816 20.082,8.203 17.528,8.203 C14.973,8.203 13.691,9.816 13.691,12.222 C13.691,14.628 14.973,16.24 17.528,16.24 C20.082,16.24 21.365,14.628 21.365,12.222 M11.205,12.222 C11.205,8.293 14.246,5.7 17.528,5.7 C20.803,5.7 23.843,8.293 23.843,12.222 C23.843,16.151 20.803,18.744 17.528,18.744 C14.246,18.744 11.205,16.151 11.205,12.222" fill="#6A7383"></path>
                              <path d="M0,5.701 L2.463,5.701 L2.463,8.257 L4.821,8.257 L4.821,10.638 L2.463,10.638 L2.463,14.072 C2.463,14.887 3.013,15.222 3.829,15.222 L4.787,15.222 L4.787,17.521 L3.203,17.521 C1.431,17.521 0,16.487 0,14.48 L0,5.701 Z" fill="#6A7383"></path>
                          </g>
                      </g>
                  </g>
              </svg>
            </div>
            {clientSecret ? (
              <Elements options={stripeOptions} stripe={stripePromise}>
                <CheckoutForm bookingDetails={bookingDetails} guestInfo={formData} onComplete={onComplete} />
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