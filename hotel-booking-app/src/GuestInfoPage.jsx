import React, { useState, useEffect, useRef } from 'react';

import { Shield, Clock, Zap, CheckCircle, AlertCircle, ShieldCheck, CheckCircle2, Lightbulb, PawPrint } from 'lucide-react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { trackInitiateCheckout, trackAddPaymentInfo } from './trackingService.js';
import TestimonialTrigger from './TestimonialTrigger.jsx';
import TestimonialPlayer from './TestimonialPlayer.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { testimonials } from './TestimonialData.js';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentInfoModal from './PaymentInfoModal.jsx';
import getHotelId from './utils/getHotelId';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
// Strategy 3: preload Stripe JS early (on checkout entry) but avoid mounting heavy payment UI until Step 4.
const hotelId = getHotelId();



const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSmoothing: 'antialiased',
      lineHeight: '1.5',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
    complete: {
      color: '#424770',
    },
  },
  showIcon: false, // Disable Stripe's icon - we use custom SVGs on the right
};

// This is the main component that controls the multi-step flow.
function GuestInfoPage({ hotel, bookingDetails, onBack, onComplete, apiBaseUrl, clientSecret }) {
    // Add this at the very top of your component, before any other code
    const [cardBrand, setCardBrand] = useState('');
    const [cardComplete, setCardComplete] = useState({
        cardNumber: false,
        cardExpiry: false,
        cardCvc: false
    });
    const [cardNumberError, setCardNumberError] = useState(false);
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
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    
    // Preload Stripe.js as early as possible so Step 4 feels instant.
    useEffect(() => {
        // Trigger the underlying Stripe.js script download ASAP.
        stripePromise?.catch(() => {});
    }, []);

    // Auto-hide loading screen when processing finishes
    useEffect(() => {
        if (!isProcessing) {
            setShowLoadingScreen(false);
        }
    }, [isProcessing]);
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
const errorMessageRef = useRef(null);
const addressFieldsRef = useRef(null);
const zipFieldRef = useRef(null);

// Plan selection removed - always use payLater (Reserve for $0)
const selectedPlan = 'payLater';

// Mobile detection for responsive plan cards
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);

// Helper function to get mobile-optimized styles (70% smaller vertically)
const getMobileStyles = () => {
    if (!isMobile) return {};
    return {
        cardPadding: '12px', // reduced from 24px
        iconSize: 17, // reduced from 28
        iconBox: '34px', // reduced from 56px
        iconMarginBottom: '8px', // reduced from 16px
        titleFontSize: '16px', // reduced from 22px
        priceFontSize: '24px', // reduced from 36px
        priceSpanFontSize: '12px', // reduced from 16px
        subtitleFontSize: '11px', // reduced from 14px
        subtitleMargin: '0 0 10px 0', // reduced from 0 0 20px 0
        checkIconSize: 14, // reduced from 18
        checkTextFontSize: '11px', // reduced from 14px
        checkMargin: '6px', // reduced from 12px
        badgePadding: '4px 12px', // reduced from 6px 16px
        badgeFontSize: '10px', // reduced from 12px
        badgeTop: '-8px', // reduced from -12px
        selectedPadding: '8px', // reduced from 12px
        selectedFontSize: '11px', // reduced from 14px
        selectedMarginTop: '10px', // reduced from 16px
        borderWidth: '2px', // reduced from 3px
        borderRadius: '12px' // reduced from 16px
    };
};

const mobileStyles = getMobileStyles();

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


// selectedPlan sessionStorage loading removed - always payLater

// Smooth scroll handling for step changes (plan step removed)
useEffect(() => {
  // Smooth scroll to top on Step 2 (Info page) so form is visible
  if (currentStep === 2) {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }
  
  // Smooth scroll to just below progress bar on Step 4 (Payment page)
  if (currentStep === 4) {
    setTimeout(() => {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 100);
  }
  
}, [currentStep]);

// Auto-scroll to error message when it appears
useEffect(() => {
  if (errorMessage && hasAttemptedSubmit && errorMessageRef.current) {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      errorMessageRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  }
}, [errorMessage, hasAttemptedSubmit]);

// Auto-scroll when address fields appear - for Facebook/Instagram in-app browser, scroll to button
useEffect(() => {
  if (isAddressSelected) {
    // Detect Facebook/Instagram in-app browser
    const isFacebookBrowser = /FBAN|FBAV|Instagram/.test(navigator.userAgent);
    
    // Wait for animation to complete
    setTimeout(() => {
      if (isFacebookBrowser && selectedPlan === 'payLater') {
        // For Facebook/Instagram users on Pay Later, scroll to show button and text below
        const buttonContainer = document.querySelector('.checkout-cta-container');
        if (buttonContainer) {
          // Scroll so the entire button container fits in viewport with buffer at bottom
          const containerTop = buttonContainer.offsetTop;
          const containerHeight = buttonContainer.offsetHeight;
          const scrollPosition = containerTop - (window.innerHeight - containerHeight) / 2;
          
          window.scrollTo({ 
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      } else if (zipFieldRef.current) {
        // For regular browsers, scroll to zip field (button is sticky anyway)
        zipFieldRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
    }, 450); // Wait for 0.4s animation + 50ms buffer
  }
}, [isAddressSelected, selectedPlan]);



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
    // NOTE: This is ONLY used to detect if wallet is available and which type
    // Each payment plan (payLater, reserve, full) creates its OWN payment request with correct amount
    useEffect(() => {
        if (stripe && clientSecret && bookingDetails) {
            // Use a minimal amount just to check wallet availability - this won't be used for actual payment
            const pr = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Booking Payment', amount: 100 }, // Minimal amount just for detection
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

            // NOTE: No payment handler here - each plan creates its own payment request with proper handler
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
    
    // If there are errors, scroll to bottom to see phone field (last field) with errors
    if (Object.keys(errors).length > 0) {
        setTimeout(() => {
            // Scroll to phone field (bottom field) to show all error messages
            const phoneField = document.querySelector('input[name="phone"]');
            if (phoneField) {
                phoneField.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 100);
    }
    
    return Object.keys(errors).length === 0;
};

    const handleNextStep = (e) => {
  // Prevent form submission when clicking navigation buttons
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (currentStep === 1) {
    setCurrentStep(2);
    trackInitiateCheckout(bookingDetails);
  } else if (currentStep === 2) {
    if (validateInfoStep()) {
      setFormErrors({});

      // Optimization: skip the Plan step entirely and go straight to payment.
      // (Reserve for $0 is the default and the primary funnel.)
      trackAddPaymentInfo(bookingDetails, formData);
      setCurrentStep(4);
    }
  }
};
    
    const handleBackStep = () => {
  if (currentStep === 1) {
    onBack(); // Goes back to booking page
  } else if (currentStep === 2) {
    setCurrentStep(1); // Goes back to Review Cart
  } else if (currentStep === 4) {
    // Payment step - go back to Info
    setCurrentStep(2);
  }
  setHasAttemptedSubmit(false);
  setErrorMessage('');
};

    const getBackButtonText = () => {
        if (currentStep === 1) return '< Back to Booking';
        if (currentStep === 2) return '< Back to Cart';
        if (currentStep === 4) return '< Back to Info'; // Payment step
    };

    const handleChange = (e) => {
        // Defensive check for autofill and other edge cases
        if (!e || !e.target) {
            console.warn('handleChange called without valid event object');
            return;
        }
        
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Fallback: Show city/state/zip if user types address manually (autocomplete might not work)
        if (name === 'address' && value.length >= 10 && !isAddressSelected) {
            setTimeout(() => {
                // Only reveal if still not selected (autocomplete didn't trigger)
                if (!isAddressSelected && formData.address.length >= 10) {
                    setIsAddressSelected(true);
                }
            }, 2000); // Wait 2 seconds to give autocomplete a chance
        }
        
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
    
    // Scroll to bottom to show the CTA button after address fields populate
    setTimeout(() => {
        window.scrollTo({ 
            top: document.documentElement.scrollHeight, 
            behavior: 'smooth' 
        });
        isInteractingWithAutocomplete.current = false;
    }, 500);
};
    // Main submit handler for FULL PAYMENT (handles both card and wallet)
    const handleCardSubmit = async (e) => {
        // Prevent accidental double-submits (double-click, Enter key, rerenders)
        if (isProcessing) {
            console.log('Payment already processing, ignoring duplicate submit');
            e?.preventDefault();
            return;
        }
        e.preventDefault();
        
        // Always use pay later handler (Reserve for $0)
        handlePayLaterBooking(e);
        return;
        
        setHasAttemptedSubmit(true); // Signal that a payment attempt has been made

        // For CARD payment, validate card fields FIRST
        if (paymentMethod === 'card') {
            if (!stripe || !elements || !elements.getElement(CardNumberElement)) {
                setErrorMessage("Payment components are not ready. Please refresh the page.");
                return;
            }
            
            // Validate card is filled out
            const cardNumberElement = elements.getElement(CardNumberElement);
            if (!cardNumberElement || !cardNumberElement._complete) {
                setErrorMessage("Please fill out your card information before proceeding.");
                return;
            }
        }

        // Validate billing address for BOTH card and wallet payments (checked AFTER card info)
        if (!formData.address || !formData.city || !formData.state || !formData.zip) {
            setErrorMessage("Please fill out your billing address before proceeding.");
            return;
        }

        setIsProcessing(true);
        // Only show loading screen for CARD payments, not wallet (wallet has its own modal)
        if (paymentMethod === 'card') {
            setShowLoadingScreen(true);
        }
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
            if (paymentMethod === 'card') {
                setShowLoadingScreen(false);
            }
            return;
        }

        // Process based on payment method
        if (paymentMethod === 'card') {
            // CARD PAYMENT
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
                // If the PaymentIntent already succeeded, treat as success (prevents Stripe double-confirm error)
                if (error.code === 'payment_intent_unexpected_state' && error.payment_intent?.status === 'succeeded') {
                    console.log('Payment already succeeded, proceeding to booking...');
                    onComplete(formData, error.payment_intent.id);
                    return;
                }

                setErrorMessage(error.message || "An unexpected error occurred.");
                setIsProcessing(false);
                setShowLoadingScreen(false);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onComplete(formData, paymentIntent.id);
            }
        } else if (paymentMethod === 'wallet') {
            // WALLET PAYMENT
            const fullAmountInCents = Math.round((bookingDetails.total / 2) * 100);
            
            const fullPaymentRequest = stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Booking Payment', amount: fullAmountInCents },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            // Set up payment method handler
            fullPaymentRequest.on('paymentmethod', async (ev) => {
                const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                    clientSecret, 
                    { payment_method: ev.paymentMethod.id }, 
                    { handleActions: false }
                );
                
                if (confirmError) {
                    if (confirmError.code === 'payment_intent_unexpected_state' && confirmError.payment_intent?.status === 'succeeded') {
                        console.log('Wallet payment already succeeded, proceeding to booking...');
                        ev.complete('success');
                        onComplete(formData, confirmError.payment_intent.id);
                        return;
                    }

                    ev.complete('fail');
                    setErrorMessage(confirmError.message);
                    setIsProcessing(false);
                    setShowLoadingScreen(false);
                    return;
                }
                
                ev.complete('success');
                onComplete(formData, paymentIntent.id);
            });

            // Show payment request
            const canMakePayment = await fullPaymentRequest.canMakePayment();
            
            if (!canMakePayment) {
                setErrorMessage("Digital wallet is not available. Please use card payment.");
                setIsProcessing(false);
                setShowLoadingScreen(false);
                return;
            }

            try {
                await fullPaymentRequest.show();
            } catch (error) {
                console.log('Payment cancelled:', error);
                setErrorMessage("Payment cancelled");
                setIsProcessing(false);
                setShowLoadingScreen(false);
            }
        }
    };


// NEW: Handle "Pay Later" booking with pre-authorization hold
const handlePayLaterBooking = async (e) => {
    // Prevent accidental double-submits
    if (isProcessing || isProcessingTrial) {
        console.log('Payment already processing, ignoring duplicate submit');
        e?.preventDefault();
        return;
    }

    e?.preventDefault();
    e?.stopPropagation();
    
    setHasAttemptedSubmit(true);

    // Process payment based on method
    if (paymentMethod === 'card') {
        // ✅ Validate card is filled out FIRST
        const cardNumberElement = elements.getElement(CardNumberElement);
        if (!cardNumberElement || !cardNumberElement._complete) {
            setErrorMessage("Please fill out your card information before proceeding.");
            return;
        }
    }

    // ✅ Validate billing address for BOTH card and wallet (checked AFTER card info)
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
        preAuthHoldAmount: 1.00,
    };

    try {
        // Create pre-authorization hold (not a charge)
        const response = await fetch(`${apiBaseUrl}/api/create-preauth-hold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bookingDetails: payLaterBooking,
                guestInfo: formData,
                hotelId: hotelId
            }),
        });

        const data = await response.json();

        if (!data.clientSecret) {
            throw new Error("Failed to create pre-authorization hold");
        }

        // Only show loading screen for card payments, not wallet
        if (paymentMethod === 'card') {
            setShowLoadingScreen(true);
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
                if (error.code === 'payment_intent_unexpected_state' && error.payment_intent?.status === 'succeeded') {
                    console.log('Authorization already succeeded, proceeding...');
                    // Treat as if the hold succeeded; continue to attempt booking creation
                    const bookingResponse = await fetch(`${apiBaseUrl}/api/complete-pay-later-booking`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            paymentIntentId: error.payment_intent.id,
                            bookingDetails: payLaterBooking,
                            guestInfo: formData,
                            hotelId: hotelId
                        }),
                    });

                    const bookingResult = await bookingResponse.json();

                    if (bookingResult.success) {
                        sessionStorage.setItem('finalBooking', JSON.stringify(payLaterBooking));
                        onComplete(formData, error.payment_intent.id);
                        return;
                    }
                }

                setErrorMessage(error.message || "Card authorization failed");
                setIsProcessing(false);
                setShowLoadingScreen(false);
            } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
                // Hold successfully placed - now create the booking
                const bookingResponse = await fetch(`${apiBaseUrl}/api/complete-pay-later-booking`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        paymentIntentId: paymentIntent.id,
                        bookingDetails: payLaterBooking,
                        guestInfo: formData,
                        hotelId: hotelId
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
                    setShowLoadingScreen(false);
                }
            }
        } else if (paymentMethod === 'wallet') {
            // Create payment request for $1.00 hold
            const holdAmountInCents = 100;
            
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
                    if (confirmError.code === 'payment_intent_unexpected_state' && confirmError.payment_intent?.status === 'succeeded') {
                        console.log('Wallet authorization already succeeded, proceeding...');
                        const bookingResponse = await fetch(`${apiBaseUrl}/api/complete-pay-later-booking`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                paymentIntentId: confirmError.payment_intent.id,
                                bookingDetails: payLaterBooking,
                                guestInfo: formData,
                                hotelId: hotelId
                            }),
                        });

                        const bookingResult = await bookingResponse.json();

                        if (bookingResult.success) {
                            ev.complete('success');
                            sessionStorage.setItem('finalBooking', JSON.stringify(payLaterBooking));
                            onComplete(formData, confirmError.payment_intent.id);
                            return;
                        }
                    }

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
                            hotelId: hotelId
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
        return 'Confirm Reservation - $0 Today';
    };
    
    const priceToday = bookingDetails.total / 2;
    const balanceDue = (bookingDetails.total / 2);
    const stripeOptions = { clientSecret, appearance: { theme: 'stripe' }, locale: 'en' };

    return (
        <>
            {showLoadingScreen && <LoadingScreen message="Securing Your Reservation..." />}
            
            <div style={{ position: 'relative', paddingTop: '8px', paddingBottom: '2px', marginBottom: '8px' }}>
                {/* Back Button - Green Pill */}
                <button onClick={handleBackStep} className="back-button-pill" style={{ marginLeft: '20px', marginBottom: '12px' }}>
                    {getBackButtonText()}
                </button>
                
                <div className="static-banner">
                    ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call {hotel.phone} — we're happy to help!
                </div>
            </div>
            
            <div className="guest-info-container" style={{ paddingBottom: '120px', paddingTop: '0' }}>
                <div className="checkout-progress-bar">
                    <div className={`progress-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Review Cart</span>
                    </div>
                    <div className={`progress-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Info</span>
                    </div>
                    <div className={`progress-step ${currentStep === 4 ? 'completed active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Payment</span>
                    </div>
                    </div>


                {/* Plan selection for 7+ nights - DESKTOP PREMIUM DESIGN */}

                {/* Plan selection for <7 nights - DESKTOP PREMIUM DESIGN */}

                {currentStep === 1 && (
                    <div className="modern-review-cart-wrapper">
                        {/* Reservation Details Card */}
                        <div className="modern-card reservation-details-card">
                            <div className="card-header">
                                <h2>Reservation Details</h2>
                                <button 
                                    type="button"
                                    onClick={handleBackStep} 
                                    className="edit-button"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    Edit
                                </button>
                            </div>
                            
                            <div className="details-grid">
                                <div className="detail-item">
                                    <div className="detail-icon calendar-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="detail-label">Room Type</div>
                                        <div className="detail-value">{bookingDetails.name}</div>
                                    </div>
                                </div>
                                
                                <div className="detail-item">
                                    <div className="detail-icon users-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="detail-label">Guests</div>
                                        <div className="detail-value">{bookingDetails.guests} {bookingDetails.guests > 1 ? 'Guests' : 'Guest'}</div>
                                    </div>
                                </div>
                                
                                <div className="detail-item">
                                    <div className="detail-icon pets-icon">
                                        <PawPrint size={20} />
                                    </div>
                                    <div>
                                        <div className="detail-label">Pets</div>
                                        <div className="detail-value">{bookingDetails.pets} {bookingDetails.pets === 1 ? 'Pet' : 'Pets'}</div>
                                    </div>
                                </div>
                                
                                <div className="detail-item">
                                    <div className="detail-icon nights-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="detail-label">Duration</div>
                                        <div className="detail-value">{bookingDetails.nights} Nights</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="dates-section">
                                <div className="date-row">
                                    <span className="date-label">Check-in</span>
                                    <span className="date-value">{new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="date-row">
                                    <span className="date-label">Check-out</span>
                                    <span className="date-value">{new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Price Breakdown Card */}
                        <div className="modern-card price-breakdown-card">
                            <div className="card-header">
                                <h2>Price Breakdown</h2>
                            </div>
                            
                            <div className="price-items">
                                {(() => {
                                    const standardRate = 69; // $69 per night
                                    const standardTotal = standardRate * bookingDetails.nights;
                                    const actualTotal = bookingDetails.subtotal;
                                    const savings = standardTotal - actualTotal;
                                    
                                    // Show crossed-out price for 7+ nights with savings
                                    if (bookingDetails.nights >= 7 && savings > 0) {
                                        return (
                                            <>
                                                <div className="price-row" style={{ 
                                                    paddingBottom: '8px',
                                                    borderBottom: '1px solid #f3f4f6'
                                                }}>
                                                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                                                        Nightly Rate ({bookingDetails.nights} nights × $69)
                                                    </span>
                                                    <span style={{ 
                                                        color: '#9ca3af',
                                                        fontSize: '14px',
                                                        textDecoration: 'line-through'
                                                    }}>
                                                        ${standardTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="price-row" style={{ paddingTop: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span>Room ({bookingDetails.nights} nights)</span>
                                                        <span style={{ 
                                                            fontSize: '12px', 
                                                            color: '#10b981',
                                                            fontWeight: '600'
                                                        }}>
                                                            {bookingDetails.nights >= 28 ? '🎉 Monthly Rate - ' : '✨ Weekly Rate - '}
                                                            Save ${savings.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <span className="price-value" style={{ color: '#10b981', fontWeight: '700' }}>
                                                        ${actualTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    } else {
                                        return (
                                            <div className="price-row">
                                                <span>Room ({bookingDetails.nights} nights)</span>
                                                <span className="price-value">${bookingDetails.subtotal.toFixed(2)}</span>
                                            </div>
                                        );
                                    }
                                })()}
                                
                                <div className="price-row">
                                    <div className="price-label-with-info">
                                        <span>Taxes & Fees</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="12" y1="16" x2="12" y2="12"/>
                                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                                        </svg>
                                    </div>
                                    <span className="price-value">${bookingDetails.taxes.toFixed(2)}</span>
                                </div>
                                
                                <div className="price-total-row">
                                    <span className="total-label">Total</span>
                                    <span className="total-value">${bookingDetails.total.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            {/* Reserve for $0 Box */}
                            <div className="reserve-zero-box">
                                <div className="reserve-header">
                                    <div className="shield-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="reserve-title">Reserve for $0 Today</div>
                                        <div className="reserve-subtitle">No payment required now</div>
                                    </div>
                                </div>
                                
                                <div className="due-at-arrival">
                                    <div className="due-row">
                                        <span>Due at arrival:</span>
                                        <span className="due-amount">${bookingDetails.total.toFixed(2)}</span>
                                    </div>
                                    <div className="due-date">Pay when you check in on {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <form id="main-checkout-form" onSubmit={handleCardSubmit} noValidate>
                    {currentStep === 2 && (
                        <>
                            <div className="modern-card guest-info-card">
                                <div className="card-header">
                                    <h2>Contact Information</h2>
                                </div>
                                <div className="info-form-fields">
                                    <div className="form-field">
                                        <label>First Name <span style={{ color: 'red' }}>*</span></label>
                                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                        {formErrors.firstName && <span className="error-message">{formErrors.firstName}</span>}
                                    </div>
                                    <div className="form-field">
                                        <label>Last Name <span style={{ color: 'red' }}>*</span></label>
                                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                                        {formErrors.lastName && <span className="error-message">{formErrors.lastName}</span>}
                                    </div>
                                    <div className="form-field">
                                        <label>Phone Number <span style={{ color: 'red' }}>*</span></label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} required />
                                        {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                                    </div>
                                    <div className="form-field">
                                        <label>Email Address <span style={{ color: 'red' }}>*</span></label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                                        {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                                    </div>
                                </div>
                            </div>
                            
                        </>
                    )}

                    {currentStep === 4 && (
                      <PaymentStep
                        clientSecret={clientSecret}
                        selectedPlan={selectedPlan}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        walletType={walletType}
                        formData={formData}
                        handleChange={handleChange}
                        hasAttemptedSubmit={hasAttemptedSubmit}
                        setHasAttemptedSubmit={setHasAttemptedSubmit}
                        errorMessage={errorMessage}
                        setErrorMessage={setErrorMessage}
                        setIsProcessing={setIsProcessing}
                        setIsProcessingTrial={setIsProcessingTrial}
                        bookingDetails={bookingDetails}
                        errorMessageRef={errorMessageRef}
                        getWalletLogoInfo={getWalletLogoInfo}
                      />
                    )}
                </form>
                
                

<div className={`checkout-cta-container sticky`} ref={currentStep === 4 ? paymentOptionsRef : null}>
  {currentStep !== 4 ? (
    <button type="button" className="btn btn-confirm btn-wider" onClick={handleNextStep}>
      {currentStep === 1 && "Continue to Info"}
      {currentStep === 2 && "Continue to Payment"}
    </button>
  ) : (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%',
      gap: '4px'
    }}>
      <button
        type={paymentMethod === 'card' ? "submit" : "button"}
        form={paymentMethod === 'card' ? "main-checkout-form" : undefined}
        className="btn btn-confirm btn-wider"
        onClick={(e) => handlePayLaterBooking(e)}
        disabled={isProcessing || !clientSecret || !stripe || !elements}
      >
        {isProcessing ? "Processing..." : getPaymentButtonText()}
      </button>
      
      {/* Pay Later reassurance text - below button */}
      <div style={{
        textAlign: 'center',
        marginTop: '4px',
        color: '#047857',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        $0 charged today • $1.00 verification only
      </div>
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
    const [elementsOptions] = useState({
        fonts: [
            {
                cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
            },
        ],
        appearance: {
            theme: 'stripe',
            variables: {
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSizeBase: '16px',
                colorPrimary: '#10b981',
                colorDanger: '#dc2626',
                spacingUnit: '4px',
                borderRadius: '8px',
            },
        },
    });

    return (
        <Elements stripe={stripePromise} options={elementsOptions}>
            <GuestInfoPage {...props} />
        </Elements>
    );
}

export default GuestInfoPageWrapper;

