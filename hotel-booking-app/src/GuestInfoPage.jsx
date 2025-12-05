import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { trackInitiateCheckout, trackAddPaymentInfo } from './trackingService.js';
import TestimonialTrigger from './TestimonialTrigger.jsx';
import TestimonialPlayer from './TestimonialPlayer.jsx';
import { testimonials } from './TestimonialData.js';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentInfoModal from './PaymentInfoModal.jsx';

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
const [isPaymentInfoModalOpen, setIsPaymentInfoModalOpen] = useState(false);
const paymentFormRef = useRef(null);
const paymentOptionsRef = useRef(null);
const hasScrolledToPayment = useRef(false);

// Plan selection state - Default to 'reserve' for <7 nights, 'full' for 7+ nights initially
// For 7+ nights, plan selection page will let them choose between 'trial' and 'full'
// For <7 nights, plan selection page will let them choose between 'reserve' and 'full'
const [selectedPlan, setSelectedPlan] = useState('reserve');

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

// In GuestInfoPage.jsx, add this with your other useEffect hooks.
// REMOVE ALL PREVIOUS SCROLL/BLUR/VIEWPORT USEEFFECTS.

 // The empty array ensures this complex setup runs only once.


useEffect(() => {
  // Load selected plan from sessionStorage for both 7+ and <7 night bookings
  if (bookingDetails) {
    const savedPlan = sessionStorage.getItem('selectedPlan');
    if (savedPlan) {
      setSelectedPlan(savedPlan);
    } else {
      // Default to 'reserve' for <7 nights, keep 'reserve' as initial state
      if (bookingDetails.nights < 7) {
        setSelectedPlan('reserve');
      }
    }
  }
}, [bookingDetails]);

// Auto-select default plans when reaching plan selection step
useEffect(() => {
  if (currentStep === 3 && bookingDetails) {
    const savedPlan = sessionStorage.getItem('selectedPlan');
    // Only auto-select if no plan was previously selected
    if (!savedPlan) {
      if (bookingDetails.nights >= 7) {
        setSelectedPlan('payLater'); // Default to pay later for 7+ nights
      } else {
        setSelectedPlan('reserve'); // Default to reserve for <7 nights
      }
    }
  }
}, [currentStep, bookingDetails]);



    // Fetch the Payment Intent from the server





    // Replace your multiple reset useEffects with this single one:
    useEffect(() => {
        // Payment step is always 4 now (plan step is 3 for all bookings)
        const paymentStep = 4;
        
        // Reset error state when we're on payment step and have all required data
        if (currentStep === paymentStep && bookingDetails && clientSecret) {
            setHasAttemptedSubmit(false);
            setErrorMessage('');
            setFormErrors({});
        }
        // Also reset when navigating away from payment step
        else if (currentStep < paymentStep) {
            setHasAttemptedSubmit(false);
            setErrorMessage('');
            setFormErrors({});
            hasScrolledToPayment.current = false; // Reset scroll flag when leaving payment step
        }
    }, [currentStep, bookingDetails, clientSecret, selectedPlan]); // Add selectedPlan to dependencies

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
      
      // Always go to plan step (step 3) for both <7 and 7+ nights
      setCurrentStep(3);
    }
  } else if (currentStep === 3) {
    // User is on plan selection, proceed to payment (step 4)
    // Save the selected plan to sessionStorage
    sessionStorage.setItem('selectedPlan', selectedPlan);
    trackAddPaymentInfo(bookingDetails, formData);
    setCurrentStep(4);
  }
};
    
    const handleBackStep = () => {
  if (currentStep === 1) {
    onBack(); // Goes back to booking page
  } else if (currentStep === 2) {
    setCurrentStep(1); // Goes back to Review Cart
  } else if (currentStep === 3) {
    // Plan step - go back to info for both <7 and 7+ nights
    setCurrentStep(2); // Go back to Info step from Plan
  } else if (currentStep === 4) {
    // Payment step - go back to plan step
    setCurrentStep(3); // Go back to plan step
  }
  setHasAttemptedSubmit(false);
  setErrorMessage('');
};

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 3) return '< Back to Info'; // Plan step for both <7 and 7+ nights
        if (currentStep === 4) return '< Back to Plan'; // Payment step
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
        // Defensive check for autofill and other edge cases
        if (!e || !e.target) {
            console.warn('handlePhoneChange called without valid event object');
            return;
        }
        
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
        
        // If trial plan selected, use trial handler instead
        if (selectedPlan === 'trial') {
            handleTrialNightBooking(e);
            return;
        }
        
        // If reserve plan selected, use reserve handler instead
        if (selectedPlan === 'reserve') {
            handleReserveBooking(e);
            return;
        }
        
        // If pay later plan selected, use pay later handler instead
        if (selectedPlan === 'payLater') {
            handlePayLaterBooking(e);
            return;
        }
        
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

    const handleReserveBooking = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    setHasAttemptedSubmit(true);

    // Validate billing address first
    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
        setErrorMessage("Please fill out your billing address before proceeding.");
        return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    // Get original booking from sessionStorage
    const originalBooking = JSON.parse(sessionStorage.getItem('finalBooking'));
    
    // Create reserve booking (full stay dates, but only $20 payment now)
    const reserveBooking = {
        roomTypeID: originalBooking.roomTypeID,
        rateID: originalBooking.rateID,
        roomName: originalBooking.name,
        checkin: originalBooking.checkin,
        checkout: originalBooking.checkout,
        nights: originalBooking.nights,
        guests: originalBooking.guests,
        subtotal: originalBooking.subtotal,
        taxes: originalBooking.taxes,
        total: originalBooking.total,
        reservationCode: originalBooking.reservationCode,
        bookingType: 'reserve',
        amountPaidNow: 20,
        amountDueAtArrival: originalBooking.total - 20,
        isNonRefundable: true,
    };

    try {
        // Create new payment intent for $20 reserve amount
        const response = await fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: 20,
                bookingDetails: reserveBooking,
                guestInfo: formData,
                hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
            }),
        });

        const data = await response.json();

        if (!data.clientSecret) {
            throw new Error("Failed to create reserve payment");
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
                setIsProcessing(false);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Save reserve booking data for confirmation page
                sessionStorage.setItem('finalBooking', JSON.stringify(reserveBooking));
                
                // Complete the booking
                onComplete(formData, paymentIntent.id);
            }
        } else if (paymentMethod === 'wallet') {
            // Create payment request for $20
            const reserveAmountInCents = 2000; // $20
            
            const reservePaymentRequest = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Room Reservation', amount: reserveAmountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            // Set up payment method handler
            reservePaymentRequest.on('paymentmethod', async (ev) => {
                const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                    data.clientSecret, 
                    { payment_method: ev.paymentMethod.id }, 
                    { handleActions: false }
                );
                
                if (confirmError) {
                    ev.complete('fail');
                    setErrorMessage(confirmError.message);
                    setIsProcessing(false);
                    return;
                }
                
                ev.complete('success');
                
                // Save reserve booking for confirmation page
                sessionStorage.setItem('finalBooking', JSON.stringify(reserveBooking));
                
                onComplete(formData, paymentIntent.id);
            });

            // Show payment request
            const canMakePayment = await reservePaymentRequest.canMakePayment();
            
            if (!canMakePayment) {
                setErrorMessage("Digital wallet is not available. Please use card payment.");
                setIsProcessing(false);
                return;
            }

            try {
                await reservePaymentRequest.show();
            } catch (error) {
                console.log('Payment cancelled:', error);
                setErrorMessage("Payment cancelled");
                setIsProcessing(false);
            }
        }

    } catch (error) {
        console.error("Reserve booking failed:", error);
        setErrorMessage("Failed to process reservation. Please try again.");
        setIsProcessing(false);
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

    // ✅ CRITICAL FIX: Get ORIGINAL booking from sessionStorage to preserve full stay data
    const originalBooking = JSON.parse(sessionStorage.getItem('finalBooking'));
    
    // ✅ FIX: Ensure checkin is a Date object
    const checkinDate = originalBooking.checkin instanceof Date 
        ? originalBooking.checkin 
        : new Date(originalBooking.checkin);
    
    // Create checkout date (1 day after checkin)
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + 1);

    const trialBooking = {
        roomTypeID: originalBooking.roomTypeID,
        rateID: originalBooking.rateID,
        roomName: originalBooking.name,
        checkin: checkinDate.toISOString(),  // ✅ Now safe
        checkout: checkoutDate.toISOString(), // ✅ Now safe
        nights: 1,
        guests: originalBooking.guests,
        subtotal: 69,
        taxes: 6.90,
        total: 75.90,
        reservationCode: originalBooking.reservationCode,
        bookingType: 'trial',
        intendedNights: originalBooking.nights,  // ✅ Preserve original nights
        originalTotal: originalBooking.total,     // ✅ NEW: Preserve original total
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
                // ✅ Save trial booking data for confirmation page ONLY
                sessionStorage.setItem('finalBooking', JSON.stringify({
                    ...originalBooking,
                    checkin: checkinDate.toISOString(),
                    checkout: checkoutDate.toISOString(),
                    nights: 1,
                    total: 75.90,
                    subtotal: 69,
                    taxes: 6.90,
                    bookingType: 'trial',
                    intendedNights: originalBooking.nights,
                    originalTotal: originalBooking.total
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
                
                // ✅ Save trial booking for confirmation page ONLY
                sessionStorage.setItem('finalBooking', JSON.stringify({
                    ...originalBooking,
                    checkin: checkinDate.toISOString(),
                    checkout: checkoutDate.toISOString(),
                    nights: 1,
                    total: 75.90,
                    subtotal: 69,
                    taxes: 6.90,
                    bookingType: 'trial',
                    intendedNights: originalBooking.nights,
                    originalTotal: originalBooking.total
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

// NEW: Handle "Pay Later" booking with pre-authorization hold
const handlePayLaterBooking = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    setHasAttemptedSubmit(true);

    // Validate billing address first
    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
        setErrorMessage("Please fill out your billing address before proceeding.");
        return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    // Get original booking from sessionStorage
    const originalBooking = JSON.parse(sessionStorage.getItem('finalBooking'));
    
    const payLaterBooking = {
        roomTypeID: originalBooking.roomTypeID,
        rateID: originalBooking.rateID,
        roomName: originalBooking.name,
        checkin: originalBooking.checkin,
        checkout: originalBooking.checkout,
        nights: originalBooking.nights,
        guests: originalBooking.guests,
        subtotal: originalBooking.subtotal,
        taxes: originalBooking.taxes,
        total: originalBooking.total,
        reservationCode: originalBooking.reservationCode,
        bookingType: 'payLater',
        amountPaidNow: 0,
        amountDueAtArrival: originalBooking.total,
        preAuthHoldAmount: 75.90,
    };

    try {
        // Create pre-authorization hold (not a charge)
        const response = await fetch(`${apiBaseUrl}/api/create-preauth-hold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bookingDetails: payLaterBooking,
                guestInfo: formData,
                hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
            }),
        });

        const data = await response.json();

        if (!data.clientSecret) {
            throw new Error("Failed to create pre-authorization hold");
        }

        // Process payment based on method
        if (paymentMethod === 'card') {
            // Authorize the hold (doesn't charge)
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
                setErrorMessage(error.message || "Card authorization failed");
                setIsProcessing(false);
            } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
                // Hold successfully placed - now create the booking
                const bookingResponse = await fetch(`${apiBaseUrl}/api/complete-pay-later-booking`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        paymentIntentId: paymentIntent.id,
                        bookingDetails: payLaterBooking,
                        guestInfo: formData,
                        hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
                    }),
                });

                const bookingResult = await bookingResponse.json();

                if (bookingResult.success) {
                    // Save pay later booking data for confirmation page
                    sessionStorage.setItem('finalBooking', JSON.stringify(payLaterBooking));
                    
                    // Complete the booking
                    onComplete(formData, paymentIntent.id);
                } else {
                    setErrorMessage(bookingResult.message || "Failed to create booking");
                    setIsProcessing(false);
                }
            }
        } else if (paymentMethod === 'wallet') {
            // Create payment request for $75.90 hold
            const holdAmountInCents = 7590;
            
            const payLaterPaymentRequest = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Pre-Authorization Hold', amount: holdAmountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            // Set up payment method handler
            payLaterPaymentRequest.on('paymentmethod', async (ev) => {
                const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                    data.clientSecret, 
                    { payment_method: ev.paymentMethod.id }, 
                    { handleActions: false }
                );
                
                if (confirmError) {
                    ev.complete('fail');
                    setErrorMessage(confirmError.message);
                    setIsProcessing(false);
                    return;
                }
                
                if (paymentIntent && paymentIntent.status === 'requires_capture') {
                    // Hold placed - create booking
                    const bookingResponse = await fetch(`${apiBaseUrl}/api/complete-pay-later-booking`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            paymentIntentId: paymentIntent.id,
                            bookingDetails: payLaterBooking,
                            guestInfo: formData,
                            hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
                        }),
                    });

                    const bookingResult = await bookingResponse.json();

                    if (bookingResult.success) {
                        ev.complete('success');
                        
                        sessionStorage.setItem('finalBooking', JSON.stringify(payLaterBooking));
                        onComplete(formData, paymentIntent.id);
                    } else {
                        ev.complete('fail');
                        setErrorMessage(bookingResult.message);
                        setIsProcessing(false);
                    }
                } else {
                    ev.complete('fail');
                    setErrorMessage("Authorization failed");
                    setIsProcessing(false);
                }
            });

            // Show payment request
            const canMakePayment = await payLaterPaymentRequest.canMakePayment();
            
            if (!canMakePayment) {
                setErrorMessage("Digital wallet is not available. Please use card payment.");
                setIsProcessing(false);
                return;
            }

            try {
                await payLaterPaymentRequest.show();
            } catch (error) {
                console.log('Payment cancelled:', error);
                setErrorMessage("Payment cancelled");
                setIsProcessing(false);
            }
        }

    } catch (error) {
        console.error("Pay later booking failed:", error);
        setErrorMessage("Failed to process reservation. Please try again.");
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
    if (selectedPlan === 'trial') {
        return 'Book Trial Night - Pay $69 Now';
    } else if (selectedPlan === 'reserve') {
        return 'Reserve Room - Pay $20 Now';
    } else if (selectedPlan === 'payLater') {
        return 'Confirm Reservation - $0 Today';
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
            
            <div className="guest-info-container" style={{ paddingBottom: '120px' }}>
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
                    <div className={`progress-step ${currentStep >= 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Plan</span>
                    </div>
                    <div className={`progress-step ${currentStep === 4 ? 'completed active' : ''}`}>
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

                {/* Plan selection for 7+ nights */}
                {currentStep === 3 && bookingDetails && bookingDetails.nights >= 7 && (
                    <div className="payment-options-container">
                        {/* PAY LATER - NOW THE STAR OF THE SHOW! */}
                        <label className={`payment-option-radio ${selectedPlan === 'payLater' ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name="plan" 
                                value="payLater" 
                                checked={selectedPlan === 'payLater'}
                                onChange={() => setSelectedPlan('payLater')}
                            />
                            <div className="payment-option primary" style={{ 
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                                border: '2px solid #10b981',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                            }}>
                                <div className="option-header">
                                    <span className="option-title" style={{ color: '#0c5460' }}>⏱️ Reserve Now, Pay Later</span>
                                    <span className="option-badge" style={{ 
                                        backgroundColor: '#10b981',
                                        color: 'white'
                                    }}>⭐ Most Popular</span>
                                </div>
                                <div className="option-price" style={{ 
                                    color: '#10b981', 
                                    fontSize: '32px',
                                    fontWeight: '700'
                                }}>
                                    $0 Today
                                </div>
                                <div className="option-details">
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <br />
                                    <strong>{bookingDetails.nights} nights</strong>
                                    <br />
                                    Pay the full ${bookingDetails.total.toFixed(2)} when you arrive
                                    <br />
                                    <strong style={{ color: '#10b981' }}>🔒 We don't charge you anything today</strong>
                                </div>
                            </div>
                        </label>

                        {/* Trial Option - NOW SECOND */}
                        <label className={`payment-option-radio ${selectedPlan === 'trial' ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name="plan" 
                                value="trial" 
                                checked={selectedPlan === 'trial'}
                                onChange={() => setSelectedPlan('trial')}
                            />
                            <div className="payment-option secondary">
                                <div className="option-header">
                                    <span className="option-title">🔍 Try 1 Night First</span>
                                </div>
                                <div className="option-price trial">
                                    Only $69
                                </div>
                                <div className="option-details">
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(new Date(bookingDetails.checkin).getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <br />
                                    <strong>1 night trial</strong>
                                    <br />
                                    See the room, then extend to your full stay
                                    <br />
                                    <strong style={{ color: '#28a745' }}>Your $69 is 100% credited toward any longer stay</strong>
                                </div>
                            </div>
                        </label>

                        {/* Full Booking Option - NOW THIRD */}
                        <label className={`payment-option-radio ${selectedPlan === 'full' ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name="plan" 
                                value="full" 
                                checked={selectedPlan === 'full'}
                                onChange={() => setSelectedPlan('full')}
                            />
                            <div className="payment-option secondary">
                                <div className="option-header">
                                    <span className="option-title">Complete Your Booking</span>
                                </div>
                                <div className="option-price">
                                    Pay ${(bookingDetails.total / 2).toFixed(2)} Today
                                </div>
                                <div className="option-details">
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <br />
                                    <strong>{bookingDetails.nights} nights</strong>
                                    <br />
                                    Balance ${(bookingDetails.total / 2).toFixed(2)} due at check-in
                                    <br />
                                    <strong style={{ color: '#28a745' }}>✅ If room isn't as promised, 100% refund on the spot</strong>
                                </div>
                            </div>
                        </label>
                    </div>
                )}

                {/* Plan selection for <7 nights */}
                {currentStep === 3 && bookingDetails && bookingDetails.nights < 7 && (
                    <div className="payment-options-container">
                        {/* Reserve for $20 Option - DEFAULT */}
                        <label className={`payment-option-radio ${selectedPlan === 'reserve' ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name="plan" 
                                value="reserve" 
                                checked={selectedPlan === 'reserve'}
                                onChange={() => setSelectedPlan('reserve')}
                            />
                            <div className="payment-option primary">
                                <div className="option-header">
                                    <span className="option-title">💰 Reserve for $20</span>
                                    <span className="option-badge">Most Popular</span>
                                </div>
                                <div className="option-price trial">
                                    Only $20
                                </div>
                                <div className="option-details">
                                    Secure your booking with $20 deposit
                                    <br />
                                    Pay remaining ${(bookingDetails.total - 20).toFixed(2)} at check-in
                                    <br />
                                    <strong style={{ color: '#6c757d' }}>$20 deposit is non-refundable</strong>
                                </div>
                            </div>
                        </label>

                        {/* Standard Booking Option - SECONDARY */}
                        <label className={`payment-option-radio ${selectedPlan === 'full' ? 'selected' : ''}`}>
                            <input 
                                type="radio" 
                                name="plan" 
                                value="full" 
                                checked={selectedPlan === 'full'}
                                onChange={() => setSelectedPlan('full')}
                            />
                            <div className="payment-option secondary">
                                <div className="option-header">
                                    <span className="option-title">Complete Your Booking</span>
                                </div>
                                <div className="option-price">
                                    Pay ${(bookingDetails.total / 2).toFixed(2)} Today
                                </div>
                                <div className="option-details">
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <br />
                                    <strong>{bookingDetails.nights} nights</strong>
                                    <br />
                                    Balance ${(bookingDetails.total / 2).toFixed(2)} due at check-in
                                    <br />
                                    <strong style={{ color: '#28a745' }}>✅ If room isn't as promised, 100% refund on the spot</strong>
                                </div>
                            </div>
                        </label>
                    </div>
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

                    <div className="payment-wrapper" style={{ display: currentStep === 4 ? 'block' : 'none' }}>
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
  
  {/* Show Pay Later explanation banner */}
  {selectedPlan === 'payLater' && (
  <div className="money-back-guarantee" style={{ backgroundColor: '#e7f3ff', borderColor: '#17a2b8' }}>
    <div className="guarantee-content">
      <div className="guarantee-icon">💳</div>
      <div className="guarantee-text">
        <div className="guarantee-title" style={{ 
          color: '#0c5460', 
          textShadow: '0 0 1px rgba(0,0,0,0.1)',
          fontWeight: '700'
        }}>
          Card Verification - No Charge Today
        </div>
        <div className="guarantee-description" style={{ color: '#1a1a1a' }}>
          We'll verify your card is valid to secure your reservation. <strong>You won't be charged anything today.</strong>
          <br /><br />
          ✅ <strong>If you check in:</strong> Nothing happens to your card
          <br />
          ❌ <strong>If you don't show up:</strong> A $75.90 no-show fee will be charged
          <br /><br />
          Full payment of <strong>${bookingDetails.total.toFixed(2)}</strong> is due when you arrive at the hotel.
        </div>
      </div>
    </div>
  </div>
  )}
  
  {/* Only show money-back guarantee for non-reserve and non-payLater bookings */}
  {selectedPlan !== 'reserve' && selectedPlan !== 'payLater' && (
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
  )}
  
  {!clientSecret ? (
    <p style={{textAlign: 'center', padding: '20px'}}>Loading secure payment form...</p>
  ) : (
    <>
      {walletType ? (
        // Show tabs only if wallet is available
        <div className="payment-method-tabs">
          <button 
            type="button" 
            className={`tab-button ${paymentMethod === 'card' ? 'active' : ''}`} 
            onClick={() => {
              setPaymentMethod('card');
              setHasAttemptedSubmit(false);
              setErrorMessage('');
              setIsProcessing(false);
              setIsProcessingTrial(false);
            }}
          >
            <img src="/credit.svg" alt="Card" className="credit-card-logo" /> Card
          </button>
          <button 
            type="button" 
            className={`tab-button ${paymentMethod === 'wallet' ? 'active' : ''}`} 
            onClick={() => {
              setPaymentMethod('wallet');
              setHasAttemptedSubmit(false);
              setErrorMessage('');
              setIsProcessing(false);
              setIsProcessingTrial(false);
            }}
          >
            <img src={getWalletLogoInfo().src} alt={getWalletLogoInfo().alt} className={getWalletLogoInfo().className} /> 
            {walletType}
          </button>
        </div>
      ) : (
        // No tabs if only card available - just show "Payment Details" header
        <div className="payment-method-label">
          <img src="/credit.svg" alt="Card" className="credit-card-icon" />
          <span>Pay with Card</span>
        </div>
      )}
      
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
                
                

<div className={`checkout-cta-container sticky`} ref={currentStep === 4 ? paymentOptionsRef : null}>
  {currentStep !== 4 ? (
    <button type="button" className="btn btn-confirm" onClick={handleNextStep}>
      {currentStep === 1 && "Proceed to Info"}
      {currentStep === 2 && "Proceed to Plan"}
      {currentStep === 3 && "Proceed to Payment"}
    </button>
  ) : (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%'
    }}>
      {/* What Happens Next Link - Opens Modal */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '12px',
        padding: '0 20px',
        width: '100%'
      }}>
        <button
          type="button"
          onClick={() => setIsPaymentInfoModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            textDecoration: 'underline',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px',
            fontWeight: '500'
          }}
        >
          ❓ What happens after I pay?
        </button>
      </div>
      <button
      type={(selectedPlan === 'trial' || selectedPlan === 'reserve') ? "button" : (paymentMethod === 'card' ? "submit" : "button")}
      form={(selectedPlan === 'trial' || selectedPlan === 'reserve') ? undefined : (paymentMethod === 'card' ? "main-checkout-form" : undefined)}
      className="btn btn-confirm"
      onClick={
        selectedPlan === 'trial' 
          ? (e) => handleTrialNightBooking(e)
          : selectedPlan === 'reserve'
            ? (e) => handleReserveBooking(e)
            : (paymentMethod === 'wallet' ? handleWalletPayment : () => { window.userInitiatedSubmit = true; })
      }
      disabled={isProcessing || isProcessingTrial || !clientSecret || !stripe || !elements}
    >
      {(isProcessing || isProcessingTrial) ? "Processing..." : getPaymentButtonText()}
    </button>
    </div>
  )}
</div>
            </div>

            {/* Payment Info Modal */}
            {isPaymentInfoModalOpen && (
                <PaymentInfoModal
                    onClose={() => setIsPaymentInfoModalOpen(false)}
                    hotel={hotel}
                    selectedPlan={selectedPlan}
                    priceToday={priceToday}
                    balanceDue={balanceDue}
                />
            )}
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

