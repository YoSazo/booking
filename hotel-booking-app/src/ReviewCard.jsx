import React, { useState } from 'react';

function ReviewCard({ reviews }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const currentReview = reviews[currentIndex];

  return (
    <div className="review-carousel">
      <button className="review-nav-btn prev" onClick={handlePrevious}>
        ‹
      </button>
      
      <div className="review-card">
        <p className="review-text">"{currentReview.text}"</p>
        <div>
          <p className="review-author">– {currentReview.author}, {currentReview.location}</p>
          <div className="review-stars">
            {'⭐'.repeat(currentReview.rating)}
          </div>
        </div>
      </div>

      <button className="review-nav-btn next" onClick={handleNext}>
        ›
      </button>

      <div className="review-dots">
        {reviews.map((_, index) => (
          <span
            key={index}
            className={`review-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default ReviewCard;