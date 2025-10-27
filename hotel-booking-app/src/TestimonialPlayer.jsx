// hotel-booking-app/src/TestimonialPlayer.jsx

import React, { useState, useEffect, useRef } from 'react';

function TestimonialPlayer({ testimonials, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const videoRef = useRef(null);

  const currentTestimonial = testimonials[currentIndex];
// At the top with your other useEffects
// Replace your current useEffect with this:

useEffect(() => {
  // Prevent body scroll on ALL devices when modal is open
  document.body.style.overflow = 'hidden';
  
  // Re-enable scroll when modal closes
  return () => {
    document.body.style.overflow = '';
  };
}, []);
  // Auto-play when testimonial changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, [currentIndex]);

  const goToPrevious = () => {
    const isFirst = currentIndex === 0;
    const newIndex = isFirst ? testimonials.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLast = currentIndex === testimonials.length - 1;
    const newIndex = isLast ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="testimonial-overlay" onClick={onClose}>
      <div className="testimonial-content" onClick={(e) => e.stopPropagation()}>
        <button className="testimonial-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

<div className="testimonial-counter">{currentIndex + 1} / {testimonials.length}</div>
        
          <>
            <button className="testimonial-nav-btn prev" onClick={goToPrevious}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button className="testimonial-nav-btn next" onClick={goToNext}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
       

        <div className="testimonial-video-container">
          <video
            ref={videoRef}
            src={currentTestimonial.videoUrl}
            controls
            autoPlay
            className="testimonial-video"
          />
          <div className="testimonial-guest-info">
            {currentTestimonial.name} - {currentTestimonial.nights} nights
          </div>
          <div className="testimonial-confirmation-container">
            <img
              src={currentTestimonial.confirmationImageUrl}
              alt={`${currentTestimonial.name}'s booking confirmation`}
              className="testimonial-confirmation-image"
            />
          </div>
        </div>

        
        <div style={{ textAlign: 'center', width: '100%' }}>
        </div>
        
      </div>
    </div>
  );
}

export default TestimonialPlayer;