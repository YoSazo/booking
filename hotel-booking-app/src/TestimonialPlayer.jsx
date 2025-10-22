// hotel-booking-app/src/TestimonialPlayer.jsx

import React, { useState, useEffect, useRef } from 'react';

function TestimonialPlayer({ testimonials, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const videoRef = useRef(null);

  const currentTestimonial = testimonials[currentIndex];

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

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && testimonials.length > 1) goToPrevious();
      if (e.key === 'ArrowRight' && testimonials.length > 1) goToNext();
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isZoomed, testimonials.length]);

  return (
    <div className="testimonial-overlay" onClick={onClose}>
      <div className="testimonial-content" onClick={(e) => e.stopPropagation()}>
        <button className="testimonial-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {testimonials.length > 1 && (
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
        )}

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
          
          <div className="testimonial-confirmation-wrapper">
            <div className={`testimonial-confirmation-container ${isZoomed ? 'zoomed' : ''}`}>
              <img
                src={currentTestimonial.confirmationImageUrl}
                alt={`${currentTestimonial.name}'s booking confirmation`}
                className="testimonial-confirmation-image"
                onClick={toggleZoom}
              />
            </div>
            <button className="zoom-hint" onClick={toggleZoom}>
              {isZoomed ? '🔍 Tap to zoom out' : '🔍 Tap to zoom in'}
            </button>
          </div>
        </div>

        {testimonials.length > 1 && (
          <div className="testimonial-counter">{currentIndex + 1} / {testimonials.length}</div>
        )}
      </div>
    </div>
  );
}

export default TestimonialPlayer;