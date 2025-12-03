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
    }
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
      zIndex: 1000
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ 
        position: 'relative',
        minHeight: '100vh',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 40px 40px 40px'
      }}>
        {/* Close Button */}
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

        {/* Selected Dates Display - Top */}
        {startDate && endDate && (
          <div style={{
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({nights} {nights === 1 ? 'night' : 'nights'})
          </div>
        )}

        {/* Calendar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '30px',
          marginBottom: '30px'
        }}>
          <div className="calendar-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button onClick={() => changeMonth(-1)} style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>&lt;</button>
            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              margin: 0
            }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)} style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>&gt;</button>
          </div>
          <div className="calendar-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            <div className="calendar-day-name">Sun</div>
            <div className="calendar-day-name">Mon</div>
            <div className="calendar-day-name">Tue</div>
            <div className="calendar-day-name">Wed</div>
            <div className="calendar-day-name">Thu</div>
            <div className="calendar-day-name">Fri</div>
            <div className="calendar-day-name">Sat</div>
          </div>
          <div className="calendar-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}>{renderDays()}</div>
        </div>

        {/* Upsell / Price Display - Below Calendar */}
        <div style={{ marginBottom: '24px' }}>
          {showUpsell ? (
            <UpsellPrompt nights={nights} onConfirm={handleUpsellConfirm} onDecline={handleUpsellDecline} rates={rates} />
          ) : showShortStayPrice ? (
            <div style={{ 
              background: '#f0f9ff',
              border: '2px solid #0ea5e9',
              borderRadius: '12px',
              padding: '20px', 
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total Price: ${(nights * rates.NIGHTLY).toFixed(2)}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', marginTop: '8px' }}>Only Pay ${(nights * rates.NIGHTLY / 2).toFixed(2)} Today</div>
            </div>
          ) : nights > 0 ? (
            <PriceBadge nights={nights} rates={rates} />
          ) : null}
        </div>

        {/* Quick Book Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          justifyContent: 'center'
        }}>
          <button onClick={handleBookWeek} style={{
            flex: 1,
            maxWidth: '200px',
            padding: '14px 24px',
            background: '#f3f4f6',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#e5e7eb';
            e.target.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#f3f4f6';
            e.target.style.borderColor = '#e5e7eb';
          }}>
            📅 Book 1 Week
          </button>
          <button onClick={handleBookMonth} style={{
            flex: 1,
            maxWidth: '200px',
            padding: '14px 24px',
            background: '#f3f4f6',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#e5e7eb';
            e.target.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#f3f4f6';
            e.target.style.borderColor = '#e5e7eb';
          }}>
            📅 Book 1 Month
          </button>
        </div>

        {/* Done Button - Big and Prominent */}
        <button onClick={handleDone} style={{
          width: '100%',
          padding: '18px',
          background: '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#218838';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#28a745';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
        }}>
          ✓ Done - Continue to Booking
        </button>
      </div>
    </div>
  );
}

export default CalendarModal;
