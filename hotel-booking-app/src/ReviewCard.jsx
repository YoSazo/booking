import React from 'react';

function ReviewCard({ text, author, location, rating }) {
  return (
    <div className="review-card">
      <p className="review-text">"{text}"</p>
      <div>
        <p className="review-author">– {author}, {location}</p>
        <div className="review-stars">
          {'⭐'.repeat(rating)}
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;