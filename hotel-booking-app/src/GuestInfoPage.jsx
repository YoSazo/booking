import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { countries } from './countries';
import Autocomplete from 'react-google-autocomplete';

// --- Stripe Promise ---
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// --- Main Component ---
const GuestInfoPage = ({ bookingDetails, onComplete }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  // This check now works correctly because bookingDetails is received as a prop
  if (!bookingDetails) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold">Session expired or invalid access.</h1>
        <p>Please start your booking again.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
          Go to Homepage
        </button>
      </div>
    );
  }

  const {
    room,
    total: totalPrice,
    nights,
    guests,
    checkin: checkIn,
    checkout: checkOut
  } = bookingDetails;

  // New state for managing the selected payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'United States',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  // --- Style for the new payment UI ---
  const paymentMethodButtonStyle = (method) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    border:
      selectedPaymentMethod === method ? '2px solid #007bff' : '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: selectedPaymentMethod === method ? '#f0f7ff' : '#fff',
    fontWeight: '600',
    flex: 1,
    minWidth: '100px',
    textAlign: 'center',
    transition: 'all 0.2s ease-in-out',
  });

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  const createPaymentIntent = useCallback(async () => {
    if (!totalPrice || totalPrice <= 0) return;
    try {
      const response = await fetch('http://localhost:4242/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(totalPrice * 100) }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error('Failed to create payment intent.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while setting up the payment.');
    }
  }, [totalPrice]);

  useEffect(() => {
    createPaymentIntent();
  }, [createPaymentIntent]);

  useEffect(() => {
    if (stripe && clientSecret) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Total',
          amount: Math.round(totalPrice * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      pr.canMakePayment().then((result) => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      pr.on('paymentmethod', async (ev) => {
        const { paymentMethod, walletName } = ev;
        const { error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: paymentMethod.id },
          { handleActions: false }
        );
        if (confirmError) {
          ev.complete('fail');
          setError(
            `Payment confirmation failed: ${confirmError.message || 'Unknown error'}`
          );
        } else {
          ev.complete('success');
          navigate('/confirmation', {
            state: {
              ...location.state,
              guestInfo: formData,
              paymentMethod: walletName,
            },
          });
        }
      });
    }
  }, [stripe, clientSecret, totalPrice, navigate, bookingDetails, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceSelected = (place) => {
    let address = '';
    let city = '';
    let state = '';
    let zip = '';

    const streetNumber =
      place.address_components.find((c) => c.types.includes('street_number'))
        ?.long_name || '';
    const route =
      place.address_components.find((c) => c.types.includes('route'))
        ?.long_name || '';
    address = `${streetNumber} ${route}`.trim();

    city =
      place.address_components.find((c) => c.types.includes('locality'))
        ?.long_name || '';
    state =
      place.address_components.find((c) =>
        c.types.includes('administrative_area_level_1')
      )?.short_name || '';
    zip =
      place.address_components.find((c) => c.types.includes('postal_code'))
        ?.long_name || '';

    setFormData((prev) => ({
      ...prev,
      address,
      city,
      state,
      zip,
    }));
  };

  const isFormComplete = () => {
    return (
      formData.fullName &&
      formData.email &&
      formData.phone &&
      formData.address &&
      formData.city &&
      formData.state &&
      formData.zip
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || !isFormComplete()) {
      setError('Please fill out all required fields before proceeding.');
      return;
    }
    setProcessing(true);
    setError(null);

    if (selectedPaymentMethod === 'card') {
      const cardElement = elements.getElement(CardElement);
      const { error: createPaymentMethodError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: formData.fullName,
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
        });

      if (paymentMethodError) {
          setError(paymentMethodError.message);
          setProcessing(false);
          return;
      }

      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod.id,
        }
      );

      if (confirmError) {
        setError(
          confirmError.message || 'An error occurred during payment confirmation.'
        );
      } else {
        if (onComplete) onComplete(formData, paymentIntent.id); // Or navigate directly
        navigate('/confirmation', {
          state: {
            ...location.state,
            guestInfo: formData,
            paymentMethod: 'Card',
          },
        });
      }
    } else if (selectedPaymentMethod === 'wallet' && paymentRequest) {
        paymentRequest.show();
    } else if (selectedPaymentMethod === 'amazon' || selectedPaymentMethod === 'paypal') {
        alert(`Redirecting to ${selectedPaymentMethod === 'amazon' ? 'Amazon Pay' : 'PayPal'}...`);
    }

    setProcessing(false);
  };

  const { name, beds } = room;

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Complete Your Booking</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card bg-base-100 shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Guest Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ... (form fields for name, email, etc.) ... */}
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Payment Method</h2>

              <div className="flex gap-2 mb-6">
                <div
                  style={paymentMethodButtonStyle('card')}
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  Card
                </div>
                {paymentRequest && (
                  <div
                    style={paymentMethodButtonStyle('wallet')}
                    onClick={() => setSelectedPaymentMethod('wallet')}
                  >
                   Apple Pay / Google Pay
                  </div>
                )}
                 <div
                    style={paymentMethodButtonStyle('amazon')}
                    onClick={() => setSelectedPaymentMethod('amazon')}
                    >
                    Amazon Pay
                </div>
              </div>

              <div>
                {selectedPaymentMethod === 'card' && (
                  <div>
                    <label className="label font-semibold">Card Details</label>
                    <div
                      className="p-4 border rounded-lg"
                      style={{ borderColor: '#ddd' }}
                    >
                      <CardElement options={cardElementOptions} />
                    </div>
                  </div>
                )}
                {selectedPaymentMethod === 'wallet' && (
                  <div className="text-center p-4 bg-gray-100 rounded-lg">
                    <p>The <strong>Apple Pay / Google Pay</strong> modal will appear after you click "Complete Payment".</p>
                  </div>
                )}
                {selectedPaymentMethod === 'amazon' && (
                   <div className="text-center p-4 bg-gray-100 rounded-lg">
                    <p>The <strong>Amazon Pay</strong> modal will appear after you click "Complete Payment".</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                 <h3 className="text-xl font-semibold mb-3">Billing Address</h3>
                 <Autocomplete
                   className="input input-bordered w-full"
                   apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                   onPlaceSelected={handlePlaceSelected}
                   options={{
                     types: ['address'],
                     componentRestrictions: { country: 'us' },
                   }}
                   placeholder="Start typing your address..."
                 />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <input type="text" value={formData.city} placeholder="City" className="input input-bordered" readOnly />
                    <input type="text" value={formData.state} placeholder="State" className="input input-bordered" readOnly />
                    <input type="text" value={formData.zip} placeholder="ZIP Code" className="input input-bordered" readOnly />
                 </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full text-lg"
              disabled={processing || !stripe || !clientSecret}
            >
              {processing
                ? 'Processing...'
                : `Pay $${totalPrice.toFixed(2)} and Complete Booking`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl p-6 sticky top-8">
            <h2 className="text-2xl font-semibold mb-4">Your Booking</h2>
            <div className="space-y-2">
              <p><strong>Room:</strong> {name} ({beds})</p>
              <p><strong>Check-in:</strong> {new Date(checkIn).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> {new Date(checkOut).toLocaleDateString()}</p>
              <p><strong>Duration:</strong> {nights} nights</p>
              <p><strong>Guests:</strong> {guests}</p>
              <div className="divider"></div>
              <p className="text-xl font-bold">Total: ${totalPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Wrapper Component ---
const GuestInfoPageWrapper = (props) => (
  <Elements stripe={stripePromise}>
    <GuestInfoPage {...props} />
  </Elements>
);

export default GuestInfoPageWrapper;