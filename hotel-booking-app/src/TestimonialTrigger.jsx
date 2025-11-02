// hotel-booking-app/src/TestimonialTrigger.jsx

import React from 'react';

function TestimonialTrigger({ onClick, videoUrl }) {
  return (
    <div className="testimonial-trigger-container">
      <div className="testimonial-trigger-card" onClick={onClick}>
        <div className="testimonial-thumbnail-wrapper">
          <video 
            src={videoUrl} 
            className="testimonial-thumbnail-video"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="testimonial-tap-prompt">
            Tap to Unmute
          </div>
        </div>
        <p className="testimonial-trigger-text">Watch Ve Granger's 33-Night Stay (See why she trusted us)</p>
      </div>
    </div>
  );
}

export default TestimonialTrigger;