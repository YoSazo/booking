import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { trackInitiateCheckout, trackAddPaymentInfo } from './trackingService.js';
import TestimonialTrigger from './TestimonialTrigger.jsx';
import TestimonialPlayer from './TestimonialPlayer.jsx';
import { testimonials } from './TestimonialData.js';
import { useNavigate, useLocation } from 'react-router-dom';

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
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl, clientSecret }) {
    // Add this at the very top of your component, before any other code
    const [cardBrand, setCardBrand] = useState('');
    const stripe = useStripe();
    const elements = useElements();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '+1 ', email: '',
        address: '', city: '', state: '', zip: '',
    });
    const location = useLocation();
    const navigate = useNavigate();
    const [formErrors, setFormErrors] = useState({});
    // const [clientSecret, setClientSecret] = useState('');
    const [autocomplete, setAutocomplete] = useState(null);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isProcessingTrial, setIsProcessingTrial] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const latestFormData = useRef(formData);
    // In GuestInfoPage.jsx, with your other state and refs
const isInteractingWithAutocomplete = useRef(false);
const [isTestimonialOpen, setIsTestimonialOpen] = useState(false);
const paymentFormRef = useRef(null);
const paymentOptionsRef = useRef(null);
const hasScrolledToPayment = useRef(false);

// Always show trial option for 7+ night bookings
const showTrialOption = true;

    // In GuestInfoPage.jsx, add this function alongside your other handlers

const handleAddressPaste = (e) => {
    // Prevent the default paste behavior
    e.preventDefault();
    // Get the text that was pasted from the clipboard
    const pastedText = e.clipboardData.getData('text');
    
    // Immediately update the form state so the user sees the pasted text
    setFormData(prev => ({ ...prev, address: pastedText }));

    // Use Google's Geocoder to find the address
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: pastedText }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const place = results[0];
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

            // Update the form with the parsed address components
            setFormData(prev => ({
                ...prev,
                address: `${streetNumber} ${route}`.trim(),
                city,
                state,
                zip
            }));

            // This is crucial: unhide the city, state, and zip fields
            setIsAddressSelected(true);
        } else {
            console.warn('Geocode was not successful for the following reason: ' + status);
        }
    });
};

// Now, find your address input inside the <Autocomplete> component
// and add the onPaste handler to it.

<input
    type="text"
    name="address"
    value={formData.address}
    onChange={handleChange}
    onPaste={handleAddressPaste} // <-- ADD THIS LINE
    placeholder="Start typing or paste your address..."
    autoComplete="street-address"
    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
/>


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

// In GuestInfoPage.jsx, add this with your other useEffect hooks.
// REMOVE ALL PREVIOUS SCROLL/BLUR/VIEWPORT USEEFFECTS.

 // The empty array ensures this complex setup runs only once.

useEffect(() => {
  // If navigating from plan page, go directly to step 3
  if (location.state?.goToPayment) {
    setCurrentStep(3);
    // Clear the state so it doesn't trigger again
    window.history.replaceState({}, document.title);
  }
}, [location]);



useEffect(() => {
        
    }, []);

useEffect(() => {
    console.log('DEBUG - errorMessage changed:', errorMessage);
}, [errorMessage]);

    // Fetch the Payment Intent from the server


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
            hasScrolledToPayment.current = false; // Reset scroll flag when leaving step 3
        }
    }, [currentStep, bookingDetails, clientSecret]);

    // Auto-scroll to payment options when reaching step 3 (ONE TIME ONLY)

    // In GuestInfoPage.jsx, add this with your other useEffect hooks

useEffect(() => {
    const handleMouseDown = (event) => {
        // More comprehensive check for autocomplete interaction
        if (event.target.closest('.pac-container') || 
            event.target.closest('.pac-item') ||
            event.target.classList.contains('pac-item')) {
            isInteractingWithAutocomplete.current = true;
        }
    };

    const handleMouseUp = () => {
        // Longer delay to ensure autocomplete selection completes
        setTimeout(() => {
            isInteractingWithAutocomplete.current = false;
        }, 500); // Increased from 100ms to 500ms
    };

    // Also listen for clicks directly on pac-container elements
    const handleAutocompleteClick = () => {
        isInteractingWithAutocomplete.current = true;
        setTimeout(() => {
            isInteractingWithAutocomplete.current = false;
        }, 500);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add a more specific listener for autocomplete clicks
    document.addEventListener('click', (event) => {
        if (event.target.closest('.pac-container')) {
            handleAutocompleteClick();
        }
    });

    return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
    };
}, []);


    // In GuestInfoPage.jsx, add this with your other useEffect hooks

useEffect(() => {
    // When this component mounts, forcefully remove any inline overflow
    // styles that may have been left behind by a modal on a previous page.
    document.body.style.overflow = '';

    // The CSS rule in index.css will now take effect reliably.

    // Cleanup function in case this component ever needs one
    return () => {
        // No cleanup needed, as we want the body's default scroll behavior.
    };
}, []); // Empty array ensures this runs only once on mount.


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
            const amountInCents = Math.round((bookingDetails.total / 2) * 100);
            const pr = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Booking Payment', amount: amountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            pr.canMakePayment().then(result => {
                console.log('Stripe canMakePayment result:', result);
    if (result) {
        setPaymentRequest(pr);
        
        // --- CORRECTED PRIORITY ---
        // 1. Prioritize native device wallets first for the best experience.
        if (result.applePay) {
            setWalletType('Apple Pay');
        } else if (result.googlePay) {
            setWalletType('Google Pay');
        } 
        // 2. Fallback to Link if no native wallet is found.
        else if (result.link) {
            setWalletType('Link');
        } 
        // 3. A generic fallback if something unexpected is available.
        else {
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
                // Save form data to sessionStorage
                sessionStorage.setItem('guestInfo', JSON.stringify(latestFormData.current));
                sessionStorage.setItem('finalBooking', JSON.stringify(bookingDetails));

                // Confirm the payment with Stripe
                const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                    clientSecret, 
                    { payment_method: ev.paymentMethod.id }, 
                    { handleActions: false }
                );
                
                if (confirmError) {
                    ev.complete('fail');
                    setHasAttemptedSubmit(true);
                    setErrorMessage(confirmError.message);
                    setIsProcessing(false);
                    return;
                }
                
                ev.complete('success');
                
                // ✅ Call onComplete directly (just like card payments do)
                onComplete(latestFormData.current, paymentIntent.id);
            });
        }
    }, [stripe, clientSecret, bookingDetails]);


    const validateInfoStep = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";

    // --- Replace the old email check with this ---
    if (!formData.email.trim()) {
        errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email format.";
    }
    // --- End of new email check ---

    if (formData.phone.replace(/\D/g, '').length < 11) errors.phone = "A valid phone number is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
};

    const handleNextStep = () => {
  if (currentStep === 1) {
    setCurrentStep(2);
    trackInitiateCheckout(bookingDetails);
  } else if (currentStep === 2) {
    if (validateInfoStep()) {
      setFormErrors({});
      trackAddPaymentInfo(bookingDetails, formData);
      
      // Check if we should show the plan page
      if (bookingDetails.nights >= 7) {
        // Navigate to Plan page for 7+ night bookings
        navigate('/plan');
      } else {
        // Go directly to payment step for <7 nights
        setCurrentStep(3);
      }
    }
  }
};
    
    const handleBackStep = () => {
  if (currentStep === 1) {
    onBack(); // Goes back to booking page
  } else if (currentStep === 2) {
    setCurrentStep(1); // Goes back to Review Cart
  } else if (currentStep === 3) {
    // Check if we came from plan page
    if (sessionStorage.getItem('selectedPlan')) {
      navigate('/plan'); // Go back to plan page
    } else {
      setCurrentStep(2); // Go back to Info step
    }
  }
  setHasAttemptedSubmit(false);
  setErrorMessage('');
};

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info';
    };

    const handleChange = (e) => {
        // Defensive check for autofill and other edge cases
        if (!e || !e.target) {
            console.warn('handleChange called without valid event object');
            return;
        }
        
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Real-time validation feedback - clear errors as user types valid data
        if (formErrors[name]) {
            // Check if the field now has valid content
            let isValid = false;
            if (name === 'firstName' || name === 'lastName') {
                isValid = value.trim().length > 0;
            } else if (name === 'email') {
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            }
            
            // Clear the error if field is now valid
            if (isValid) {
                setFormErrors(prev => ({...prev, [name]: ''}));
            }
        }
        
        if (errorMessage) setErrorMessage('');
    };
    
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+1 ')) value = '+1 ';
        
        // Limit phone number to 10 digits (plus country code = 11 total)
        const digitCount = value.replace(/\D/g, '').length;
        if (digitCount > 11) {
            return; // Don't update if exceeding max length
        }
        
        setFormData(prev => ({ ...prev, phone: value }));
        
        // Real-time validation feedback for phone
        if (formErrors.phone) {
            // Clear error if phone number is now valid (11 digits including country code)
            if (digitCount >= 11) {
                setFormErrors(prev => ({...prev, phone: ''}));
            }
        }
    };

    const onLoad = (autoC) => setAutocomplete(autoC);
    const onPlaceChanged = () => {
    // Set flag to prevent scrolling during place selection
    isInteractingWithAutocomplete.current = true;
    
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
        
        setFormData(prev => ({
            ...prev, 
            address: `${streetNumber} ${route}`.trim(), 
            city, 
            state, 
            zip
        }));
    }
    
    setIsAddressSelected(true);
    
    // Clear the flag after a delay
    setTimeout(() => {
        isInteractingWithAutocomplete.current = false;
    }, 1000);
};
    // Main submit handler for CARD PAYMENTS
    const handleCardSubmit = async (e) => {
        e.preventDefault();
        if (!window.userInitiatedSubmit) {
        console.warn('Form submitted without user interaction - ignoring');
        return;
    }
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

        try {
      const updateRes = await fetch(`${apiBaseUrl}/api/update-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSecret: clientSecret, guestInfo: formData }),
      });
      const updateData = await updateRes.json();
      if (!updateData.success) {
        throw new Error('Failed to update payment details.');
      }
    } catch (updateError) {
      setErrorMessage(updateError.message || "Could not save guest info. Please try again.");
      setIsProcessing(false);
      return;
    }


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
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onComplete(formData, paymentIntent.id);
        }
    };

    const handleTrialNightBooking = async (e) => {
    e?.preventDefault();      // Prevent default form behavior
    e?.stopPropagation();     // Stop event from bubbling up
    
    setHasAttemptedSubmit(true);

    // Validate billing address first
    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
        setErrorMessage("Please fill out your billing address before proceeding.");
        return;
    }

    setIsProcessingTrial(true);
    setErrorMessage('');

    // ✅ FIX: Ensure checkin is a Date object
    const checkinDate = bookingDetails.checkin instanceof Date 
        ? bookingDetails.checkin 
        : new Date(bookingDetails.checkin);
    
    // Create checkout date (1 day after checkin)
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + 1);

    const trialBooking = {
        roomTypeID: bookingDetails.roomTypeID,
        rateID: bookingDetails.rateID,
        roomName: bookingDetails.name,
        checkin: checkinDate.toISOString(),  // ✅ Now safe
        checkout: checkoutDate.toISOString(), // ✅ Now safe
        nights: 1,
        guests: bookingDetails.guests,
        subtotal: 69,
        taxes: 6.90,
        total: 75.90,
        reservationCode: bookingDetails.reservationCode,
        bookingType: 'trial',
        intendedNights: bookingDetails.nights,
        useNightlyRate: true,
    };

    try {
        // Create new payment intent for trial amount
        const response = await fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: 75.90,
                bookingDetails: trialBooking,
                guestInfo: formData,
                hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
            }),
        });

        const data = await response.json();

        if (!data.clientSecret) {
            throw new Error("Failed to create trial payment");
        }

        // Update payment intent with guest info
        await fetch(`${apiBaseUrl}/api/update-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                clientSecret: data.clientSecret, 
                guestInfo: formData 
            }),
        });

        // Process payment based on method
        if (paymentMethod === 'card') {
            const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
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
                setErrorMessage(error.message || "Payment failed");
                setIsProcessingTrial(false);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Save session data with trial flag
                sessionStorage.setItem('finalBooking', JSON.stringify({
                    ...bookingDetails,
                    checkin: checkinDate.toISOString(),    // ✅ Save as ISO string
                    checkout: checkoutDate.toISOString(),  // ✅ Save as ISO string
                    nights: 1,
                    total: 75.90,
                    subtotal: 69,
                    taxes: 6.90,
                    bookingType: 'trial',
                    intendedNights: bookingDetails.nights
                }));
                
                // Complete the booking
                onComplete(formData, paymentIntent.id);
            }
        } else if (paymentMethod === 'wallet') {
            // Create a NEW payment request for the trial amount
            const trialAmountInCents = Math.round(75.90 * 100);
            
            const trialPaymentRequest = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Trial Night Booking', amount: trialAmountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            // Set up the payment method handler
            trialPaymentRequest.on('paymentmethod', async (ev) => {
                const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                    data.clientSecret, 
                    { payment_method: ev.paymentMethod.id }, 
                    { handleActions: false }
                );
                
                if (confirmError) {
                    ev.complete('fail');
                    setErrorMessage(confirmError.message);
                    setIsProcessingTrial(false);
                    return;
                }
                
                ev.complete('success');
                
                // Save session data with trial flag
                sessionStorage.setItem('finalBooking', JSON.stringify({
                    ...bookingDetails,
                    checkin: checkinDate.toISOString(),
                    checkout: checkoutDate.toISOString(),
                    nights: 1,
                    total: 75.90,
                    subtotal: 69,
                    taxes: 6.90,
                    bookingType: 'trial',
                    intendedNights: bookingDetails.nights
                }));
                
                onComplete(formData, paymentIntent.id);
            });

            // Show the payment request
            const canMakePayment = await trialPaymentRequest.canMakePayment();
            
            if (!canMakePayment) {
                setErrorMessage("Digital wallet is not available. Please use card payment.");
                setIsProcessingTrial(false);
                return;
            }

            try {
                await trialPaymentRequest.show();
            } catch (error) {
                console.log('Payment cancelled:', error);
                setErrorMessage("Payment cancelled");
                setIsProcessingTrial(false);
            }
        }

    } catch (error) {
        console.error("Trial night booking failed:", error);
        setErrorMessage("Failed to process trial booking. Please try again.");
        setIsProcessing(false);
    }
};

    // Click handler for WALLET PAYMENTS
    const handleWalletPayment = () => {
    setHasAttemptedSubmit(true);

    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
        setErrorMessage("Please fill out your billing address before proceeding.");
        return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    if (!paymentRequest) {
        setErrorMessage("Digital wallet is not available. Please select another payment method.");
        setIsProcessing(false);
        return;
    }

    // CRITICAL: Call .show() IMMEDIATELY in the click handler (synchronously)
    // This must happen BEFORE any async operations for Apple Pay to work
    const showPromise = paymentRequest.show();
    
    // Now handle the promise
    showPromise
        .then(async (paymentResponse) => {
            // Payment sheet opened successfully
            // Now do the async update
            try {
                const updateRes = await fetch(`${apiBaseUrl}/api/update-payment-intent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientSecret: clientSecret, guestInfo: formData }),
                });
                const updateData = await updateRes.json();
                if (!updateData.success) {
                    throw new Error('Failed to update payment details.');
                }
            } catch (updateError) {
                console.error('Failed to update payment intent:', updateError);
                // Payment sheet is still open, so this error won't show to user
                // The paymentmethod event handler will handle the actual payment
            }
        })
        .catch((error) => {
            // User cancelled or payment sheet failed to open
            console.log('Payment sheet cancelled or failed:', error);
            setErrorMessage(error.message || "Payment cancelled or failed to open.");
            setIsProcessing(false);
        });
};

    const getWalletLogoInfo = () => {
        if (walletType === 'Apple Pay') return { src: '/apple.svg', alt: 'Apple Pay', className: 'apple-pay-logo' };
        if (walletType === 'Google Pay') return { src: '/google.svg', alt: 'Google Pay', className: 'google-pay-logo' };
        if (walletType === 'Link') return { src: '/Link.svg', alt: 'Link', className: 'link-pay-logo' };
        return { src: '/credit.svg', alt: 'Wallet', className: 'payment-logo' }; // Fallback
    };

    
    // Redirect to home if booking details are missing
    useEffect(() => {
        if (!bookingDetails || !clientSecret) {
            navigate('/');
        }
    }, [bookingDetails, clientSecret, navigate]);

    if (!bookingDetails) {
        return null; // Don't render anything while redirecting
    }

    const getPaymentButtonText = () => {
    const selectedPlan = sessionStorage.getItem('selectedPlan') || 'full';
    
    if (selectedPlan === 'trial') {
        return 'Book Trial Night - Pay $69 Now';
    } else {
        const priceToday = bookingDetails.total / 2;
        return `Pay $${priceToday.toFixed(2)} and Complete Booking`;
    }
    };
    
    const priceToday = bookingDetails.total / 2;
    const balanceDue = (bookingDetails.total / 2);
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

                {currentStep === 2 && (
                    <>
                        <TestimonialTrigger 
                        onClick={() => setIsTestimonialOpen(true)}
                        thumbnailUrl={testimonials[0].thumbnailUrl}
                        />
                        {isTestimonialOpen && (
                        <TestimonialPlayer
                            testimonials={testimonials}
                            startIndex={0}
                            onClose={() => {
                            setIsTestimonialOpen(false);
                            // Scroll to payment form after a tiny delay (lets modal close first)
                            setTimeout(() => {
                                paymentFormRef.current?.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start' 
                                });
                            }, 100);
                            }}
                        />
                        )}
                    </>
                    )}

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
                
                <form id="main-checkout-form" onSubmit={handleCardSubmit} noValidate>
                    <div className="form-wrapper" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                        <div className="form-field"><label>First Name <span style={{ color: 'red' }}>*</span></label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />{formErrors.firstName && <span className="error-message">{formErrors.firstName}</span>}</div>
                        <div className="form-field"><label>Last Name <span style={{ color: 'red' }}>*</span></label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />{formErrors.lastName && <span className="error-message">{formErrors.lastName}</span>}</div>
                        <div className="form-field"><label>Phone Number <span style={{ color: 'red' }}>*</span></label><input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} required />{formErrors.phone && <span className="error-message">{formErrors.phone}</span>}</div>
                        <div className="form-field"><label>Email Address <span style={{ color: 'red' }}>*</span></label><input type="email" name="email" value={formData.email} onChange={handleChange} required />{formErrors.email && <span className="error-message">{formErrors.email}</span>}</div>
                    </div>

                    <div className="payment-wrapper" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
  <div className="money-back-guarantee">
    <div className="guarantee-content">
      <div className="guarantee-icon">🛡️</div>
      <div className="guarantee-text">
        <div className="guarantee-title">100% Money-Back Guarantee</div>
        <div className="guarantee-description">
          If the room isn't exactly what we promised when you arrive, we'll refund 100% of what you paid on the spot. No questions asked.
        </div>
      </div>
    </div>
  </div>
  
  <div className="stripe-badge-container">
    <img 
      src="stripe.svg" 
      alt="Powered by Stripe" 
      className="stripe-badge"
      onError={(e) => {
        console.log('Stripe badge failed to load');
        e.target.style.display = 'none';
      }}
    />
  </div>
  
  <div className="secure-checkout-badge">
    <img src="/lock.svg" alt="Secure Checkout" className="lock-icon" />
    <span>Guaranteed safe and secure Checkout</span>
  </div>
  
  {!clientSecret ? (
    <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p>
  ) : (
    <>
      <div className="payment-method-tabs">
        <button 
          type="button" 
          className={`tab-button ${paymentMethod === 'card' ? 'active' : ''}`} 
          onClick={() => {
            setPaymentMethod('card');
            setHasAttemptedSubmit(false);
            setErrorMessage('');
            setIsProcessing(false);
          }}
        >
          <img src="/credit.svg" alt="Card" className="credit-card-logo" /> Card
        </button>
        {walletType && (
          <button 
            type="button" 
            className={`tab-button ${paymentMethod === 'wallet' ? 'active' : ''}`} 
            onClick={() => {
              setPaymentMethod('wallet');
              setHasAttemptedSubmit(false);
              setErrorMessage('');
              setIsProcessing(false);
            }}
          >
            <img src={getWalletLogoInfo().src} alt={getWalletLogoInfo().alt} className={getWalletLogoInfo().className} /> 
            {walletType}
          </button>
        )}
      </div>
      
      <div className="payment-content">
        {paymentMethod === 'card' && (
          <div className="card-and-billing-container">
            <div className="split-card-fields">
              <div className="card-field-wrapper">
                <label>Card number</label>
                <div className="card-field-container">
                  <CardNumberElement options={ELEMENT_OPTIONS} />
                  <div className="card-brands">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
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
                
                // Replace the entire checkout-cta-container section at the bottom with:

<div className={`checkout-cta-container ${currentStep === 3 ? 'payment-step' : ''}`} ref={currentStep === 3 ? paymentOptionsRef : null}>
  {currentStep < 3 ? (
    <button type="button" className="btn btn-confirm" onClick={handleNextStep}>
      {currentStep === 1 && "Proceed to Info"}
      {currentStep === 2 && "Proceed to Payment"}
    </button>
  ) : (
    <button
      type={paymentMethod === 'card' ? "submit" : "button"}
      form={paymentMethod === 'card' ? "main-checkout-form" : undefined}
      className="btn btn-confirm"
      onClick={paymentMethod === 'wallet' ? handleWalletPayment : () => { window.userInitiatedSubmit = true; }}
      disabled={isProcessing || !clientSecret || !stripe || !elements}
    >
      {isProcessing ? "Processing..." : getPaymentButtonText()}
    </button>
  )}
</div>
            </div>
        </>
    );
}

// The wrapper provides the Stripe context to the entire page.
function GuestInfoPageWrapper(props) {
    // The Elements provider just needs the stripePromise.
    // The options are not needed for individual elements.
    return (
        <Elements stripe={stripePromise}>
            <GuestInfoPage {...props} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;

