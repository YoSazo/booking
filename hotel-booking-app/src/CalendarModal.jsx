import React, { useState, useEffect } from 'react';
import PriceBadge from './PriceBadge.jsx';
import UpsellPrompt from './UpsellPrompt.jsx'; // Import the new component

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout, currentRate = 70 }) {
  const [startDate, setStartDate] = useState(initialCheckin);
  const [endDate, setEndDate] = useState(initialCheckout);
  const [currentDate, setCurrentDate] = useState(initialCheckin || new Date());

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
  };
  
  // This is what the "Done" and "No" buttons will do
  const handleDone = () => {
    if (startDate && endDate) {
      onDatesChange({ start: startDate, end: endDate });
      onClose();
    } else {
        alert("Please select a check-out date.");
    }
  };

  // --- NEW: Handler for the "YES!" button ---
  const handleUpsellConfirm = () => {
      if (!startDate) return;
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 7); // Extend stay to 7 nights from start date
      setEndDate(newEndDate);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`blank-${i}`} className="calendar-day other-month"></div>);
    }

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
          <div className="calendar-day-content">
            {i}
            <span className="calendar-day-price">${currentRate.toFixed(1)}</span>
          </div>
        </div>
      );
    }
    return days;
  };

  const nights = (startDate && endDate) ? Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;

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
        </div>

        <div className="price-card">
          <div className="calendar-price-badge">
            {/* --- NEW: Conditional Rendering Logic --- */}
            {(nights > 0 && nights < 7) ? (
              <UpsellPrompt 
                nights={nights} 
                onConfirm={handleUpsellConfirm} 
                onDecline={handleDone} 
              />
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