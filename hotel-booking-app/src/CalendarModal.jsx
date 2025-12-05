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

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'white',
      overflowY: 'auto',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ 
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '30px 24px',
        maxHeight: '95vh',
        overflowY: 'auto'
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#f3f4f6';
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Calendar header */}
        <h2 style={{
          fontSize: '26px',
          fontWeight: '700',
          marginBottom: '24px',
          color: '#1a1a1a',
          textAlign: 'center'
        }}>
          Select Your Dates
        </h2>

        {/* Calendar container */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
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

        {/* Quick book buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <button className="quick-book-btn" onClick={handleBookWeek} style={{
            flex: '1',
            minWidth: '130px',
            padding: '13px 18px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            📅 Book 1 Week
          </button>
          <button className="quick-book-btn" onClick={handleBookMonth} style={{
            flex: '1',
            minWidth: '130px',
            padding: '13px 18px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            📅 Book 1 Month
          </button>
        </div>

        {/* Price display and upsell */}
        {showUpsell ? (
          <div style={{
            background: '#fff7ed',
            border: '2px solid #fb923c',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <UpsellPrompt nights={nights} onConfirm={handleUpsellConfirm} onDecline={handleUpsellDecline} rates={rates} />
          </div>
        ) : showShortStayPrice ? (
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#333' }}>Total Price: ${(nights * rates.NIGHTLY).toFixed(2)}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981', marginTop: '10px' }}>Only Pay ${(nights * rates.NIGHTLY / 2).toFixed(2)} Today</div>
          </div>
        ) : nights > 0 ? (
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <PriceBadge nights={nights} rates={rates} />
          </div>
        ) : null}

        {/* Done button */}
        <button 
          className="btn" 
          onClick={handleDone}
          style={{
            width: '100%',
            padding: '17px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#059669';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#10b981';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
        >
          {startDate && endDate ? `Continue with ${nights} Night${nights > 1 ? 's' : ''}` : 'Select Check-out Date'}
        </button>
      </div>
    </div>
  );
}

export default CalendarModal;
