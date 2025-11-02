// hotel-booking-app/src/TestimonialTrigger.jsx

import React from 'react';

function TestimonialTrigger({ onClick, thumbnailUrl }) {
  return (
    <div className="testimonial-trigger-container">
      <div className="testimonial-trigger-card" onClick={onClick}>
        <div className="testimonial-thumbnail-wrapper">
          <img src={thumbnailUrl} alt="Video testimonial" className="testimonial-thumbnail" />
          <div className="testimonial-play-button">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="30" fill="rgba(0, 0, 0, 0.7)" />
              <polygon points="23,18 23,42 40,30" fill="white" />
            </svg>
          </div>
        </div>
        <p className="testimonial-trigger-text">Watch Ve Granger's 33-Night Stay (See why she trusted us)</p>
      </div>
    </div>
  );
}

export default TestimonialTrigger;