import React, { useState, useEffect } from 'react';
import { trackSearch } from './trackingService.js';

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout, rates }) {
  const [startDate, setStartDate] = useState(initialCheckin);
  const [endDate, setEndDate] = useState(initialCheckout);
  const [currentDate, setCurrentDate] = useState(initialCheckin || new Date());

  // Helper to get minimum booking date (for St. Croix 4 PM cutoff)
  const getMinBookingDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isStCroix = window.location.hostname.includes('stcroix.clickinns.com');
    if (isStCroix) {
      const centralTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const centralHour = new Date(centralTime).getHours();
      if (centralHour >= 16) { // 4 PM or later
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
    }
    return today;
  };

  useEffect(() => {
    if (isOpen) {
      const minDate = getMinBookingDate();
      
      // If initialCheckin is before minDate, adjust it
      let adjustedCheckin = initialCheckin;
      if (initialCheckin) {
        const checkinNormalized = new Date(initialCheckin);
        checkinNormalized.setHours(0, 0, 0, 0);
        if (checkinNormalized < minDate) {
          adjustedCheckin = minDate;
        }
      }
      
      setStartDate(adjustedCheckin);
      setEndDate(initialCheckout);
      setCurrentDate(adjustedCheckin || minDate);
      
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
    // Normalize the clicked day to midnight
    const normalizedDay = new Date(day);
    normalizedDay.setHours(0, 0, 0, 0);
    
    // If no start date OR both dates are already set, reset to new start
    if (!startDate || (startDate && endDate)) {
        setStartDate(normalizedDay);
        setEndDate(null);
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
        } else {
            // Clicking same or earlier date resets
            setStartDate(normalizedDay);
            setEndDate(null);
        }
    }
};
  
  const handleApply = () => {
    if (startDate && endDate) {
      trackSearch(startDate, endDate);
      onDatesChange({ start: startDate, end: endDate });
      onClose();
    } else {
      alert("Please select check-in and check-out dates.");
    }
  };

  const handleBookMonth = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 28);
    
    // Immediately apply and search
    trackSearch(start, newEndDate);
    onDatesChange({ start: start, end: newEndDate });
    onClose();
  };

  const handleBookWeek = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 7);
    
    // Immediately apply and search
    trackSearch(start, newEndDate);
    onDatesChange({ start: start, end: newEndDate });
    onClose();
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
    
    // For St. Croix: after 4 PM Central, treat today as unavailable (BookingCenter API cutoff)
    let minBookingDate = today;
    const isStCroix = window.location.hostname.includes('stcroix.clickinns.com');
    if (isStCroix) {
      // Get current time in Central timezone (America/Chicago)
      const centralTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const centralHour = new Date(centralTime).getHours();
      if (centralHour >= 16) { // 4 PM or later
        minBookingDate = new Date(today);
        minBookingDate.setDate(minBookingDate.getDate() + 1); // Tomorrow is the earliest
      }
    }
    
    let days = [];
    for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`blank-${i}`} className="calendar-day other-month"></div>); }
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      let className = "calendar-day";
      if (day < minBookingDate) className += " disabled";
      if (day.getTime() === today.getTime() && day >= minBookingDate) className += " today";
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

            {/* Show nights selected */}
            {nights > 0 && (
              <div className="calendar-nights-selected">
                {nights} night{nights !== 1 ? 's' : ''} selected
              </div>
            )}

            {/* Quick Book Buttons - styled as buttons that trigger search */}
            <div className="calendar-quick-book-section">
              <button 
                className="quick-book-action-btn" 
                onClick={handleBookWeek}
              >
                Book 1 Week
              </button>
              <button 
                className="quick-book-action-btn" 
                onClick={handleBookMonth}
              >
                Book 1 Month
              </button>
            </div>

            {/* Apply Button */}
            <button 
              className="calendar-apply-btn" 
              onClick={handleApply}
              disabled={!startDate || !endDate}
            >
              Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CalendarModal;
