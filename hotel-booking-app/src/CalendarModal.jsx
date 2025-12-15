import React, { useState, useEffect } from 'react';
import PriceBadge from './PriceBadge.jsx';
import UpsellPrompt from './UpsellPrompt.jsx';
import { trackSearch } from './trackingService.js';

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout, rates }) {
  const [startDate, setStartDate] = useState(initialCheckin);
  const [endDate, setEndDate] = useState(initialCheckout);
  const [currentDate, setCurrentDate] = useState(initialCheckin || new Date());
  const [upsellDeclined, setUpsellDeclined] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialCheckin);
      setEndDate(initialCheckout);
      setCurrentDate(initialCheckin || new Date());
      setUpsellDeclined(false);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
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
        } else {
            // Clicking same or earlier date resets
            setStartDate(normalizedDay);
            setEndDate(null);
            setUpsellDeclined(false);
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
  };

  const handleBookWeek = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 7);
    setStartDate(start);
    setEndDate(newEndDate);
    setUpsellDeclined(false);
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

  return (
    <div className={`calendar-modal ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="calendar-container" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-scroll-area">
          <div className="calendar-header">
            <button onClick={() => changeMonth(-1)}>&lt;</button>
            <h3>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)}>&gt;</button>
          </div>
          <div className="calendar-grid">
            <div className="calendar-day-name">Sun</div><div className="calendar-day-name">Mon</div><div className="calendar-day-name">Tue</div><div className="calendar-day-name">Wed</div><div className="calendar-day-name">Thu</div><div className="calendar-day-name">Fri</div><div className="calendar-day-name">Sat</div>
          </div>
          <div className="calendar-grid">{renderDays()}</div>
        </div>
        <div className="modal-actions-footer">
          <div className="price-card">
            <div className="calendar-price-badge">
              {showUpsell ? (
                <UpsellPrompt nights={nights} onConfirm={handleUpsellConfirm} onDecline={handleUpsellDecline} rates={rates} />
              ) : showShortStayPrice ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '16px', lineHeight: '1.4' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total Price: ${(nights * rates.NIGHTLY).toFixed(2)}</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>Reserve for $0 Today</div>
                  <div style={{ fontSize: '16px', color: '#666', marginTop: '8px' }}>Pay ${(nights * rates.NIGHTLY).toFixed(2)} When You Arrive</div>
                </div>
              ) : ( <PriceBadge nights={nights} rates={rates} /> )}
            </div>
          </div>
          <div className="calendar-footer-buttons">
            <button className="quick-book-btn" onClick={handleBookWeek}>Book 1 Week</button>
            <button className="quick-book-btn" onClick={handleBookMonth}>Book 1 Month</button>
            <button className="btn" onClick={handleDone}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;
