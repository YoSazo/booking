import React, { useState, useEffect } from 'react';

function ImageLightbox({ images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);


  // --- NEW: Preload all images when the lightbox opens ---
  useEffect(() => {
    images.forEach(imageSrc => {
      const img = new Image();
      img.src = imageSrc;
    });
  }, [images]); // This runs once when the component first loads
  // Add keyboard navigation (left/right arrows, escape key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, currentIndex]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close-btn" onClick={onClose}>&times;</button>
      <button className="lightbox-nav-btn prev" onClick={handlePrev}>&#10094;</button>
      
      <img 
        src={images[currentIndex]} 
        alt={`Full screen view ${currentIndex + 1}`} 
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
      
      <button className="lightbox-nav-btn next" onClick={handleNext}>&#10095;</button>
    </div>
  );
}

export default ImageLightbox;