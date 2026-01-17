import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, Zap, CheckCircle, AlertCircle, ShieldCheck, CheckCircle2, Lightbulb } from 'lucide-react';
import { Autocomplete } from '@react-google-maps/api';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { trackInitiateCheckout, trackAddPaymentInfo } from './trackingService.js';
import TestimonialTrigger from './TestimonialTrigger.jsx';
import TestimonialPlayer from './TestimonialPlayer.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { testimonials } from './TestimonialData.js';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentInfoModal from './PaymentInfoModal.jsx';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);



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
    
    // Auto-hide loading screen when processing finishes
    useEffect(() => {
        if (!isProcessing && !isProcessingTrial) {
            setShowLoadingScreen(false);
        }
    }, [isProcessing, isProcessingTrial]);
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

// Plan selection state - Default to 'payLater' for all stays
// For 7+ nights: payLater, trial, full options
// For <7 nights: payLater, full options (same as 7+ but without trial)
const [selectedPlan, setSelectedPlan] = useState('payLater');

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


useEffect(() => {
  // Load selected plan from sessionStorage for both 7+ and <7 night bookings
  if (bookingDetails) {
    const savedPlan = sessionStorage.getItem('selectedPlan');
    if (savedPlan) {
      setSelectedPlan(savedPlan);
    } else {
      // Default to 'payLater' for <7 nights (same as 7+ nights)
      if (bookingDetails.nights < 7) {
        setSelectedPlan('payLater');
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
        setSelectedPlan('payLater'); // Default to pay later for <7 nights (same as 7+)
      }
    }
    
    // Smooth scroll to just below progress bar when plan page loads
    setTimeout(() => {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }, 100);
  }
  
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
  
}, [currentStep, bookingDetails]);

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
    // Each payment plan (payLater, trial, reserve, full) creates its OWN payment request with correct amount
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
    
    // Clear the flag after a delay
    setTimeout(() => {
        isInteractingWithAutocomplete.current = false;
    }, 1000);
};
    // Main submit handler for FULL PAYMENT (handles both card and wallet)
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

    const handleReserveBooking = async (e) => {
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
    // Only show loading screen for card payments, not wallet
    if (paymentMethod === 'card') {
        setShowLoadingScreen(true);
    }
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

    setIsProcessingTrial(true);
    // Only show loading screen for card payments, not wallet
    if (paymentMethod === 'card') {
        setShowLoadingScreen(true);
    }
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

    // Calculate nightly rate with taxes (10% tax rate)
    const nightlyRate = originalBooking.subtotal / originalBooking.nights; // Get per-night subtotal
    const nightlyTaxes = nightlyRate * 0.10; // 10% tax
    const trialTotal = nightlyRate + nightlyTaxes;

    const trialBooking = {
        roomTypeID: originalBooking.roomTypeID,
        rateID: originalBooking.rateID,
        roomName: originalBooking.name,
        checkin: checkinDate.toISOString(),  // ✅ Now safe
        checkout: checkoutDate.toISOString(), // ✅ Now safe
        nights: 1,
        guests: originalBooking.guests,
        subtotal: nightlyRate,
        taxes: nightlyTaxes,
        total: trialTotal,
        reservationCode: originalBooking.reservationCode,
        bookingType: 'trial',
        intendedNights: originalBooking.nights,  // ✅ Preserve original nights
        originalTotal: originalBooking.total,     // ✅ NEW: Preserve original total
        useNightlyRate: true,
    };

    try {
        // Create new payment intent for trial amount (1 night with taxes)
        const response = await fetch(`${apiBaseUrl}/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: trialTotal,
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
                    total: trialTotal,
                    subtotal: nightlyRate,
                    taxes: nightlyTaxes,
                    bookingType: 'trial',
                    intendedNights: originalBooking.nights,
                    originalTotal: originalBooking.total
                }));
                
                // Complete the booking
                onComplete(formData, paymentIntent.id);
            }
        } else if (paymentMethod === 'wallet') {
            // Create a NEW payment request for the trial amount
            const trialAmountInCents = Math.round(trialTotal * 100);
            
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
                    total: trialTotal,
                    subtotal: nightlyRate,
                    taxes: nightlyTaxes,
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
                hotelId: import.meta.env.VITE_HOTEL_ID || 'suite-stay'
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
            {showLoadingScreen && <LoadingScreen message="Securing Your Reservation..." />}
            
            <div style={{ position: 'sticky', top: '0', zIndex: 1001, paddingTop: '8px', paddingBottom: '2px', marginBottom: '8px' }}>
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
                    <div className={`progress-step ${currentStep >= 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Plan</span>
                    </div>
                    <div className={`progress-step ${currentStep === 4 ? 'completed active' : ''}`}>
                        <div className="step-circle"></div><span className="step-name">Payment</span>
                    </div>
                    </div>


                {/* Plan selection for 7+ nights - DESKTOP PREMIUM DESIGN */}
                {currentStep === 3 && bookingDetails && bookingDetails.nights >= 7 && (
                    <>
                        {/* Premium Header */}
                        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '-12px' }}>
                            <div style={{
                                display: 'inline-block',
                                background: 'white',
                                borderRadius: '12px',
                                padding: '16px 24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                marginBottom: '-4px'
                            }}>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                                    Your Stay
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                    {bookingDetails.nights} nights • Total: ${bookingDetails.total.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Premium Plan Cards Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px',
                            marginBottom: '32px'
                        }}>
                            {/* Pay Later Plan */}
                            <div
                                className="premium-plan-card"
                                onClick={() => setSelectedPlan('payLater')}
                                style={{
                                    background: selectedPlan === 'payLater' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'white',
                                    border: `3px solid ${selectedPlan === 'payLater' ? '#10b981' : '#e5e7eb'}`,
                                    borderRadius: '16px',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: selectedPlan === 'payLater' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: selectedPlan === 'payLater' ? '0 12px 24px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div className="premium-plan-badge" style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    ⭐ Most Popular
                                </div>
                                <div className="premium-plan-icon-box" style={{
                                    width: '56px',
                                    height: '56px',
                                    background: selectedPlan === 'payLater' ? 'white' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    marginTop: '8px'
                                }}>
                                    <Clock size={isMobile ? 17 : 28} color="#10b981" strokeWidth={2.5} />
                                </div>
                                <h3 className="premium-plan-title" style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                                    Pay Later
                                </h3>
                                <div className="premium-plan-price" style={{ fontSize: '36px', fontWeight: '800', color: '#10b981', margin: '8px 0', lineHeight: '1' }}>
                                    $0
                                    <span className="premium-plan-price-span" style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginLeft: '8px' }}>today</span>
                                </div>
                                <p className="premium-plan-subtitle" style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                                    Pay when you arrive
                                </p>
                                <div style={{ flex: 1 }}>
                                    <div className="premium-plan-check-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={isMobile ? 14 : 18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span className="premium-plan-check-text" style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Zero payment today</span>
                                    </div>
                                    <div className="premium-plan-check-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={isMobile ? 14 : 18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span className="premium-plan-check-text" style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Full amount at check-in</span>
                                    </div>
                                </div>
                                {selectedPlan === 'payLater' && (
                                    <div className="premium-plan-selected" style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: '#10b981',
                                        fontSize: '14px'
                                    }}>
                                        ✓ Selected
                                    </div>
                                )}
                            </div>

                            {/* Complete Booking Plan */}
                            <div
                                className="premium-plan-card"
                                onClick={() => setSelectedPlan('full')}
                                style={{
                                    background: selectedPlan === 'full' ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' : 'white',
                                    border: `3px solid ${selectedPlan === 'full' ? '#8b5cf6' : '#e5e7eb'}`,
                                    borderRadius: '16px',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: selectedPlan === 'full' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: selectedPlan === 'full' ? '0 12px 24px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    ⭐ Secure & Save
                                </div>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    background: selectedPlan === 'full' ? 'white' : 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    marginTop: '8px'
                                }}>
                                    <Shield size={28} color="#8b5cf6" strokeWidth={2.5} />
                                </div>
                                <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                                    Complete Booking
                                </h3>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: '#8b5cf6', margin: '8px 0', lineHeight: '1' }}>
                                    ${(bookingDetails.total / 2).toFixed(2)}
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginLeft: '8px' }}>today</span>
                                </div>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                                    Pay half now, half later
                                </p>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Lock in your rate today</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Balance due at check-in</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>100% refund if room not as promised</span>
                                    </div>
                                </div>
                                {selectedPlan === 'full' && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: '#8b5cf6',
                                        fontSize: '14px'
                                    }}>
                                        ✓ Selected
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Plan selection for <7 nights - DESKTOP PREMIUM DESIGN */}
                {currentStep === 3 && bookingDetails && bookingDetails.nights < 7 && (
                    <>
                        {/* Premium Header */}
                        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '-12px' }}>
                            <div style={{
                                display: 'inline-block',
                                background: 'white',
                                borderRadius: '12px',
                                padding: '16px 24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                marginBottom: '-4px'
                            }}>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                                    Your Stay
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                                    {new Date(bookingDetails.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(bookingDetails.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                    {bookingDetails.nights} nights • Total: ${bookingDetails.total.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Premium Plan Cards Grid - Only 2 Plans */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px',
                            marginBottom: '32px',
                            maxWidth: '700px',
                            marginLeft: 'auto',
                            marginRight: 'auto'
                        }}>
                            {/* Pay Later Plan */}
                            <div
                                className="premium-plan-card"
                                onClick={() => setSelectedPlan('payLater')}
                                style={{
                                    background: selectedPlan === 'payLater' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'white',
                                    border: `3px solid ${selectedPlan === 'payLater' ? '#10b981' : '#e5e7eb'}`,
                                    borderRadius: '16px',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: selectedPlan === 'payLater' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: selectedPlan === 'payLater' ? '0 12px 24px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    ⭐ Most Popular
                                </div>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    background: selectedPlan === 'payLater' ? 'white' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    marginTop: '8px'
                                }}>
                                    <Clock size={28} color="#10b981" strokeWidth={2.5} />
                                </div>
                                <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                                    Pay Later
                                </h3>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: '#10b981', margin: '8px 0', lineHeight: '1' }}>
                                    $0
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginLeft: '8px' }}>today</span>
                                </div>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                                    Pay when you arrive
                                </p>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Zero payment today</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Full amount at check-in</span>
                                    </div>
                                </div>
                                {selectedPlan === 'payLater' && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: '#10b981',
                                        fontSize: '14px'
                                    }}>
                                        ✓ Selected
                                    </div>
                                )}
                            </div>

                            {/* Complete Booking Plan */}
                            <div
                                className="premium-plan-card"
                                onClick={() => setSelectedPlan('full')}
                                style={{
                                    background: selectedPlan === 'full' ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' : 'white',
                                    border: `3px solid ${selectedPlan === 'full' ? '#8b5cf6' : '#e5e7eb'}`,
                                    borderRadius: '16px',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: selectedPlan === 'full' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: selectedPlan === 'full' ? '0 12px 24px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    ⭐ Secure & Save
                                </div>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    background: selectedPlan === 'full' ? 'white' : 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    marginTop: '8px'
                                }}>
                                    <Shield size={28} color="#8b5cf6" strokeWidth={2.5} />
                                </div>
                                <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                                    Complete Booking
                                </h3>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: '#8b5cf6', margin: '8px 0', lineHeight: '1' }}>
                                    ${(bookingDetails.total / 2).toFixed(2)}
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginLeft: '8px' }}>today</span>
                                </div>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                                    Pay half now, half later
                                </p>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Lock in your rate today</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>Balance due at check-in</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={18} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>100% refund if room not as promised</span>
                                    </div>
                                </div>
                                {selectedPlan === 'full' && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: '#8b5cf6',
                                        fontSize: '14px'
                                    }}>
                                        ✓ Selected
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

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
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="4" r="2"/>
                                            <circle cx="18" cy="8" r="2"/>
                                            <circle cx="20" cy="16" r="2"/>
                                            <circle cx="9" cy="10" r="2"/>
                                            <path d="M8.5 13.5c0 0-1.5 2-1.5 4.5s1.5 2.5 2.5 2.5 2.5 0 2.5-2.5-1.5-4.5-1.5-4.5"/>
                                        </svg>
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
                                <div className="price-row">
                                    <span>Room ({bookingDetails.nights} nights)</span>
                                    <span className="price-value">${bookingDetails.subtotal.toFixed(2)}</span>
                                </div>
                                
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
                            
                            {/* Testimonial below the form */}
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
                                    }}
                                />
                            )}
                        </>
                    )}

                    <div className="payment-wrapper" style={{ display: currentStep === 4 ? 'block' : 'none' }}>
  {/* Stripe Badge & Security - Combined Header */}
  <div style={{
    background: 'linear-gradient(to right, rgb(248, 250, 252), white)',
    borderBottom: '1px solid rgb(226, 232, 240)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: '#475569',
      flex: '1 1 auto',
      minWidth: '200px'
    }}>
      <svg 
        width="22" 
        height="22" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: '500',
        lineHeight: '1.4'
      }}>
        Guaranteed safe and secure checkout
      </span>
    </div>
    
    <div style={{
      background: '#334155',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: 0,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ fontSize: '12px', fontWeight: '500' }}>Powered by</span>
      <span style={{ 
        fontSize: '16px', 
        fontWeight: '700', 
        letterSpacing: '-0.5px' 
      }}>
        stripe
      </span>
    </div>
  </div>
  
  
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
        {/* Card fields with animation */}
        <div className={`card-fields-section ${paymentMethod === 'card' ? 'visible' : ''}`}>

          <div className="card-and-billing-container">
            <div className="split-card-fields">
              <div className="card-field-wrapper">
                <label>Card number</label>
                <div className="card-field-container">
                  <CardNumberElement 
                    options={ELEMENT_OPTIONS}
                    onChange={(e) => {
                      setCardBrand(e.brand);
                      setCardComplete(prev => ({ ...prev, cardNumber: e.complete }));
                      setCardNumberError(!!e.error); // Track if there's an error
                      if (e.error) {
                        setFormErrors(prev => ({ ...prev, cardNumber: e.error.message }));
                      } else {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.cardNumber;
                          return newErrors;
                        });
                      }
                    }}
                  />
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
                    <CardExpiryElement 
                      options={ELEMENT_OPTIONS}
                      onChange={(e) => {
                        setCardComplete(prev => ({ ...prev, cardExpiry: e.complete }));
                        if (e.error) {
                          setFormErrors(prev => ({ ...prev, cardExpiry: e.error.message }));
                        } else {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.cardExpiry;
                            return newErrors;
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="card-field-wrapper">
                  <label>CVC</label>
                  <div className="card-field-container">
                    <CardCvcElement 
                      options={ELEMENT_OPTIONS}
                      onChange={(e) => {
                        setCardComplete(prev => ({ ...prev, cardCvc: e.complete }));
                        if (e.error) {
                          setFormErrors(prev => ({ ...prev, cardCvc: e.error.message }));
                        } else {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.cardCvc;
                            return newErrors;
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Address Section - Always visible for both card and wallet */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f0f0f0', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div className="card-field-wrapper">
              <label>Billing Address</label>
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  placeholder="Start typing your address..." 
                  autoComplete="street-address"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0070f3';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
              </Autocomplete>
            </div>
            
            {/* Address fields with slide-down animation - Now stacked vertically */}
            <div ref={addressFieldsRef} className={`address-fields-container ${isAddressSelected ? 'visible' : ''}`}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px', 
                marginTop: '12px',
                maxWidth: '100%'
              }}>
                <div className="card-field-wrapper">
                  <label>City</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    autoComplete="address-level2"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      padding: '14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0070f3';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="card-field-wrapper">
                  <label>State</label>
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    autoComplete="address-level1"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      padding: '14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0070f3';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="card-field-wrapper">
                  <label>Zip</label>
                  <input 
                    ref={zipFieldRef}
                    type="text" 
                    name="zip" 
                    value={formData.zip} 
                    onChange={handleChange} 
                    autoComplete="postal-code"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      padding: '14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Inter, sans-serif',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0070f3';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* WHY WE NEED YOUR CARD - Critical explanation banner */}
            {selectedPlan === 'payLater' && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '16px 18px',
                marginTop: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <ShieldCheck size={24} color="#10b981" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#065f46', marginBottom: '8px' }}>
                      Why we need your card
                    </div>
                    <div style={{ fontSize: '14px', color: '#047857', lineHeight: '1.6' }}>
                      <strong>Please fill out your payment details above.</strong> We place a $1 hold to confirm you're a real person with a valid card - this secures your room and prevents fake bookings.
                      <br /><br />
                      ✅ <strong>$1 hold released immediately</strong><br />
                      ✅ <strong>You won't be charged today</strong><br />
                      ✅ <strong>Pay ${bookingDetails.total.toFixed(2)} when you arrive</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet selected indicator - inside card section */}
            {paymentMethod === 'wallet' && walletType && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                marginTop: '16px'
              }}>
                <img 
                  src={getWalletLogoInfo().src} 
                  alt={getWalletLogoInfo().alt} 
                  style={{ height: '32px' }} 
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '600', color: '#333' }}>
                    {walletType} Selected
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    A payment modal will appear after clicking the final button
                  </p>
                </div>
              </div>
            )}
          </div>

        {paymentMethod === 'wallet' && !walletType && (
          <div className="wallet-info-box">
            <p>Select your wallet provider above.</p>
          </div>
        )}
      </div>
    </>
  )}
  {errorMessage && hasAttemptedSubmit && (
  <div 
    ref={errorMessageRef}
    className="error-message payment-error"
    style={{
      padding: '16px',
      marginTop: '20px',
      backgroundColor: '#fee',
      border: '2px solid #dc3545',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600'
    }}
  >
    ⚠️ {errorMessage}
  </div>
)}
</div>
                </form>
                
                

<div className={`checkout-cta-container sticky`} ref={currentStep === 4 ? paymentOptionsRef : null}>
  {currentStep !== 4 ? (
    <button type="button" className="btn btn-confirm btn-wider" onClick={handleNextStep}>
      {currentStep === 1 && "Continue to Info"}
      {currentStep === 2 && "Continue to Plan"}
      {currentStep === 3 && "Continue to Payment"}
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
        type={(selectedPlan === 'trial' || selectedPlan === 'reserve') ? "button" : (paymentMethod === 'card' ? "submit" : "button")}
        form={(selectedPlan === 'trial' || selectedPlan === 'reserve') ? undefined : (paymentMethod === 'card' ? "main-checkout-form" : undefined)}
        className="btn btn-confirm btn-wider"
        onClick={
          selectedPlan === 'trial' 
            ? (e) => handleTrialNightBooking(e)
            : selectedPlan === 'reserve'
              ? (e) => handleReserveBooking(e)
              : selectedPlan === 'payLater'
                ? (e) => handlePayLaterBooking(e)
                : selectedPlan === 'full'
                  ? (e) => handleCardSubmit(e)
                  : () => { window.userInitiatedSubmit = true; }
        }
        disabled={isProcessing || isProcessingTrial || !clientSecret || !stripe || !elements}
      >
        {(isProcessing || isProcessingTrial) ? "Processing..." : getPaymentButtonText()}
      </button>
      
      {/* Pay Later reassurance text - below button */}
      {selectedPlan === 'payLater' && (
        <div style={{
          textAlign: 'center',
          marginTop: '4px',
          color: '#047857',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          $0 charged today • $1.00 verification only
        </div>
      )}
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

