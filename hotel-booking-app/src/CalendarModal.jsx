import React, { useState, useEffect } from 'react';
import PriceBadge from './PriceBadge.jsx';
import UpsellPrompt from './UpsellPrompt.jsx';
import { trackSearch } from './trackingService.js';

const NIGHTLY = 59;

function CalendarModal({ isOpen, onClose, onDatesChange, initialCheckin, initialCheckout }) {
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
    }
  }, [isOpen, initialCheckin, initialCheckout]);

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
    setUpsellDeclined(false);
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
          <div className="calendar-day-content">{i}<span className="calendar-day-price">${NIGHTLY.toFixed(1)}</span></div>
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
        
        {/* --- This is now the ONLY scrollable part --- */}
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
        
        {/* --- This is the new "Sticky Footer" that is ALWAYS visible --- */}
        <div className="modal-actions-footer">
          <div className="price-card">
            <div className="calendar-price-badge">
              {showUpsell ? (
                <UpsellPrompt nights={nights} onConfirm={handleUpsellConfirm} onDecline={handleUpsellDecline} />
              ) : showShortStayPrice ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '16px', lineHeight: '1.4' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total Price: ${(nights * NIGHTLY).toFixed(2)}</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success-color)', marginTop: '10px' }}>Only Pay ${(nights * NIGHTLY / 2).toFixed(2)} Today</div>
                </div>
              ) : ( <PriceBadge nights={nights} /> )}
            </div>
          </div>
          
          <div className="calendar-footer-buttons">
            <button className="quick-book-btn" onClick={handleBookMonth}>Book 1 Month</button>
            <button className="btn" onClick={handleDone}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarModal;