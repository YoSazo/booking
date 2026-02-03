import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutReturnPage from './CheckoutReturnPage.jsx';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutReturnPageWrapper(props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutReturnPage {...props} />
    </Elements>
  );
}
