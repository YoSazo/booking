import React, { useState, useEffect } from 'react';
import PriceBadge from './PriceBadge.jsx';
import UpsellPrompt from './UpsellPrompt.jsx';

const NIGHTLY = 59; // We need the nightly rate here for the new calculation

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout, currentRate = 70 }) {
  const [startDate, setStartDate] = useState(initialCheckin);
  const [endDate, setEndDate] = useState(initialCheckout);
  const [currentDate, setCurrentDate] = useState(initialCheckin || new Date());
  
  // --- NEW: State to track if the user has seen and declined the upsell ---
  const [upsellDeclined, setUpsellDeclined] = useState(false);

  useEffect(() => {
    setStartDate(initialCheckin);
    setEndDate(initialCheckout);
  }, [initialCheckin, initialCheckout]);

  const handleDayClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (day > startDate) {
      setEndDate(day);
    } else {
      setStartDate(day);
      setEndDate(null);
    }
    // --- NEW: Reset the upsell state whenever a new date is picked ---
    setUpsellDeclined(false);
  };
  
  const handleDone = () => {
    if (startDate && endDate) {
      onDatesChange({ start: startDate, end: endDate });
      onClose();
    } else {
        alert("Please select a check-out date.");
    }
  };

  // --- NEW: The "No" button will now call this function ---
  const handleUpsellDecline = () => {
    setUpsellDeclined(true); // Simply record that the upsell was declined
  };

  const handleBookMonth = () => {
    const start = startDate || new Date();
    start.setHours(0,0,0,0);
    const newEndDate = new Date(start);
    newEndDate.setDate(newEndDate.getDate() + 28);
    setStartDate(start);
    setEndDate(newEndDate);
    setUpsellDeclined(false); // Reset upsell state
  };

  const handleUpsellConfirm = () => {
      if (!startDate) return;
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 7);
      setEndDate(newEndDate);
      setUpsellDeclined(false); // Reset upsell state
  };

  const changeMonth = (amount) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const renderDays = () => {
    // ... (renderDays function remains exactly the same)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
          <div className="calendar-day-content">{i}<span className="calendar-day-price">${currentRate.toFixed(1)}</span></div>
        </div>
      );
    }
    return days;
  };

  const nights = (startDate && endDate) ? Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;

  // --- NEW: Variables for our three potential views ---
  const showUpsell = nights > 0 && nights < 7 && !upsellDeclined;
  const showShortStayPrice = nights > 0 && nights < 7 && upsellDeclined;

  return (
    <div className={`calendar-modal ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="calendar-container" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-card">
          <div className="calendar-header">
            <button onClick={() => changeMonth(-1)}>&lt;</button>
            <h3>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)}>&gt;</button>
          </div>
          <div className="calendar-grid">
            <div className="calendar-day-name">Sun</div><div className="calendar-day-name">Mon</div><div className="calendar-day-name">Tue</div><div className="calendar-day-name">Wed</div><div className="calendar-day-name">Thu</div><div className="calendar-day-name">Fri</div><div className="calendar-day-name">Sat</div>
          </div>
          <div className="calendar-grid">{renderDays()}</div>
          <div className="calendar-card-footer">
              <button className="quick-book-btn" onClick={handleBookMonth}>Book 1 Month</button>
          </div>
        </div>
        
        <div className="price-card">
          <div className="calendar-price-badge">
            {/* --- UPDATED: New 3-way conditional rendering --- */}
            {showUpsell ? (
              <UpsellPrompt 
                nights={nights} 
                onConfirm={handleUpsellConfirm} 
                onDecline={handleUpsellDecline} 
              />
            ) : showShortStayPrice ? (
              // --- NEW: The price display for short stays ---
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '16px', lineHeight: '1.4' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                  Total Price: ${(nights * NIGHTLY).toFixed(2)}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>
                  Only Pay ${(nights * NIGHTLY / 2).toFixed(2)} Today
                </div>
              </div>
            ) : (
              <PriceBadge nights={nights} />
            )}
          </div>
        </div>
        
        <div className="calendar-footer">
          <button className="btn" onClick={handleDone}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;