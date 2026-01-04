import React, { useState, useEffect } from 'react';
import PriceBadge from './PriceBadge.jsx';
import UpsellPrompt from './UpsellPrompt.jsx';
import { trackSearch } from './trackingService.js';
import { calculateTieredPrice } from './priceCalculator.js';

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout, rates }) {
  const [startDate, setStartDate] = useState(initialCheckin);
  const [endDate, setEndDate] = useState(initialCheckout);
  const [currentDate, setCurrentDate] = useState(initialCheckin || new Date());
  const [upsellDeclined, setUpsellDeclined] = useState(false);
  const [activeQuickBook, setActiveQuickBook] = useState(null); // Track which quick book button was clicked

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialCheckin);
      setEndDate(initialCheckout);
      setCurrentDate(initialCheckin || new Date());
      setUpsellDeclined(false);
      setActiveQuickBook(null); // Reset quick book highlighting
      
      // Prevent body scroll when modal is open - iOS Safari fix
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%'; // Prevent horizontal shift
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, initialCheckin, initialCheckout]);

  const handleDayClick = (day) => {
    console.log('Clicked day:', day);
    console.log('Current startDate:', startDate);
    console.log('Current endDate:', endDate);
    
    // Normalize the clicked day to midnight
    const normalizedDay = new Date(day);
    normalizedDay.setHours(0, 0, 0, 0);
    
    // If no start date OR both dates are already set, reset to new start
    if (!startDate || (startDate && endDate)) {
        setStartDate(normalizedDay);
        setEndDate(null);
        setUpsellDeclined(false);
        setActiveQuickBook(null); // Clear quick book highlighting when manually selecting
        return;
    }
    
    // Only start date is set
    if (startDate && !endDate) {
        // Normalize start date for comparison
        const normalizedStart = new Date(startDate);
        normalizedStart.setHours(0, 0, 0, 0);
        
        if (normalizedDay.getTime() > normalizedStart.getTime()) {
            // Set as end date
            setEndDate(normalizedDay);
            setUpsellDeclined(false);
            setActiveQuickBook(null); // Clear quick book highlighting
        } else {
            // Clicking same or earlier date resets
            setStartDate(normalizedDay);
            setEndDate(null);
            setUpsellDeclined(false);
            setActiveQuickBook(null); // Clear quick book highlighting
        }
    }
};
  
  const handleDone = () => {
    if (startDate && endDate) {
      trackSearch(startDate, endDate);
      onDatesChange({ start: startDate, end: endDate });
      onClose();
    } else {
      alert("Please select a check-out date.");
    }
  };

  const handleUpsellDecline = () => { setUpsellDeclined(true); };

  const handleBookMonth = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 28);
    setStartDate(start);
    setEndDate(newEndDate);
    setUpsellDeclined(false);
    setActiveQuickBook('month'); // Mark month button as active
  };

  const handleBookWeek = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 7);
    setStartDate(start);
    setEndDate(newEndDate);
    setUpsellDeclined(false);
    setActiveQuickBook('week'); // Mark week button as active
  };

  const handleUpsellConfirm = () => {
    if (!startDate) return;
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() + 7);
    setEndDate(newEndDate);
    setUpsellDeclined(false);
  };

  const changeMonth = (amount) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let days = [];
    for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`blank-${i}`} className="calendar-day other-month"></div>); }
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      let className = "calendar-day";
      if (day < today) className += " disabled";
      if (day.getTime() === today.getTime()) className += " today";
      if (startDate) {
        const startTime = new Date(startDate).setHours(0,0,0,0);
        if (day.getTime() === startTime) className += " selected-start";
        if(endDate) {
           const endTime = new Date(endDate).setHours(0,0,0,0);
           if (day.getTime() === endTime) className += " selected-end";
           if (day.getTime() > startTime && day.getTime() < endTime) className += " in-range";
           if (day.getTime() === startTime && day.getTime() === endTime) className += " selected-end";
        }
      }
      days.push(
        <div key={i} className={className} onClick={() => !className.includes('disabled') && handleDayClick(day)}>
          <div className="calendar-day-content">{i}</div>
        </div>
      );
    }
    return days;
  };

  const nights = (startDate && endDate) ? Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;
  const showUpsell = nights > 0 && nights < 7 && !upsellDeclined;
  const showShortStayPrice = nights > 0 && nights < 7 && upsellDeclined;

  // Dynamically adjust calendar body padding based on footer height
  useEffect(() => {
    if (!isOpen) return;
    
    const adjustPadding = () => {
      const footer = document.querySelector('.calendar-modal-footer');
      const body = document.querySelector('.calendar-modal-body');
      
      if (footer && body) {
        const footerHeight = footer.offsetHeight;
        body.style.paddingBottom = `${footerHeight + 20}px`; // Footer height + 20px buffer
      }
    };
    
    // Adjust on open and when content changes
    adjustPadding();
    
    // Re-adjust after a short delay (for animations/rendering)
    const timer = setTimeout(adjustPadding, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen, showUpsell, showShortStayPrice, nights]);

  // Smooth scroll to pricing section when dates are selected (mobile only)
  useEffect(() => {
    if (!isOpen || nights === 0) return;
    
    // Only auto-scroll on mobile devices (where screen space is limited)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    const scrollToPricing = () => {
      const body = document.querySelector('.calendar-modal-body');
      const pricingSection = document.querySelector('.calendar-price-breakdown');
      
      if (body && pricingSection) {
        // Scroll to show the pricing section (current price, discount, or short stay total)
        pricingSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      }
    };
    
    // Delay to ensure content is rendered
    const timer = setTimeout(scrollToPricing, 150);
    
    return () => clearTimeout(timer);
  }, [isOpen, nights, showUpsell, showShortStayPrice]);

  return (
    <div className={`calendar-modal-fullscreen ${isOpen ? 'open' : ''}`}>
      <div className="calendar-modal-overlay" onClick={onClose}></div>
      <div className="calendar-modal-content">
        {/* Header with Close Button */}
        {/* Combined Header with Month Navigation and Close Button */}
        <div className="calendar-modal-header">
          <div className="calendar-header-nav">
            <button onClick={() => changeMonth(-1)} className="month-nav-btn">&lt;</button>
            <h3 className="month-year-text">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)} className="month-nav-btn">&gt;</button>
          </div>
          <button className="calendar-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="calendar-modal-body">
          <div className="calendar-content-wrapper">

            {/* Calendar Grid */}
            <div className="calendar-grid">
              <div className="calendar-day-name">Sun</div><div className="calendar-day-name">Mon</div><div className="calendar-day-name">Tue</div><div className="calendar-day-name">Wed</div><div className="calendar-day-name">Thu</div><div className="calendar-day-name">Fri</div><div className="calendar-day-name">Sat</div>
            </div>
            <div className="calendar-grid">{renderDays()}</div>

            {/* Current Selection Price (shown when upsell is active) */}
            {showUpsell && (
              <div className="calendar-price-breakdown">
                <div className="calendar-current-selection">
                  <span className="price-label">Current selection:</span>
                  <span className="current-price">${(nights * rates.NIGHTLY).toFixed(2)}</span>
                  <span className="night-count">({nights} night{nights > 1 ? 's' : ''})</span>
                </div>
              </div>
            )}

            {/* Price Comparison in Body (Scrollable) */}
            {nights >= 7 && (() => {
              const originalPrice = nights * rates.NIGHTLY;
              const discountedPrice = calculateTieredPrice(nights, rates);
              const savings = originalPrice - discountedPrice;
              
              return (
                <div className="calendar-price-breakdown">
                  <div className="calendar-price-comparison">
                    <div className="calendar-original-price">
                      <span className="price-label">Original Price (at ${rates.NIGHTLY}/night):</span>
                      <span className="strikethrough-price">${originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="calendar-savings-badge">
                      ⬇️ You Saved ${savings.toFixed(2)}!
                    </div>
                    <div className="calendar-discounted-price">
                      <span className="price-label">{nights >= 28 ? 'Monthly' : 'Weekly'} Discount Total:</span>
                      <span className="discount-price">${discountedPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Short Stay Total in Body (Scrollable) */}
            {nights > 0 && nights < 7 && upsellDeclined && (
              <div className="calendar-price-breakdown">
                <div className="calendar-price-comparison">
                  <div className="calendar-total-price">
                    <span className="price-label">Total Price:</span>
                    <span className="total-price">${(nights * rates.NIGHTLY).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer with Quick Book Buttons + Reserve CTA + Done Button */}
        <div className="calendar-modal-footer">
          <div className="calendar-footer-content">
            {/* Quick Book Buttons */}
            <div className="calendar-quick-book-buttons">
              <button 
                className={`quick-book-btn ${activeQuickBook === 'week' ? 'active' : ''}`} 
                onClick={handleBookWeek}
              >
                Book 1 Week
              </button>
              <button 
                className={`quick-book-btn ${activeQuickBook === 'month' ? 'active' : ''}`} 
                onClick={handleBookMonth}
              >
                Book 1 Month
              </button>
            </div>
            
            {/* Upsell OR Reserve CTA */}
            {showUpsell ? (
              <UpsellPrompt nights={nights} onConfirm={handleUpsellConfirm} onDecline={handleUpsellDecline} rates={rates} />
            ) : nights > 0 && (
              <div className="calendar-reserve-zero-box">
                <div className="reserve-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </div>
                <div>
                  <div className="reserve-title">Reserve for $0 Today</div>
                  <div className="reserve-subtitle">Pay ${nights >= 7 ? calculateTieredPrice(nights, rates).toFixed(2) : (nights * rates.NIGHTLY).toFixed(2)} When You Arrive</div>
                </div>
              </div>
            )}
            
            {/* Done Button */}
            <button className="calendar-done-btn" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;
