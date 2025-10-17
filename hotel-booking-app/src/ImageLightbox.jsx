import React, { useState, useEffect } from 'react';

function ImageLightbox({ images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [loadedImages, setLoadedImages] = useState(new Set());

  // --- START: NEW PRELOADING LOGIC ---

  useEffect(() => {
    const newLoadedImages = new Set();
    
    images.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        newLoadedImages.add(index);
        setLoadedImages(new Set(newLoadedImages));
      };
    });
  }, [images]);
 // Re-run this logic when the image changes
  // --- END: NEW PRELOADING LOGIC ---

  const goToPrevious = () => {
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };


  const goToNext = () => {
    const isLastImage = currentIndex === images.length - 1;
    const newIndex = isLastImage ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex]); // Re-bind keys when index changes

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close-btn" onClick={onClose}>&times;</button>
        <button className="lightbox-nav-btn prev" onClick={goToPrevious}>&#10094;</button>
        
        <div className="lightbox-image-container">
          {/* We show a simple loader if the image isn't cached yet */}
          <img
  src={images[currentIndex]}
  alt={`Room image ${currentIndex + 1}`}
  className="lightbox-image"
/>
        </div>

        <button className="lightbox-nav-btn next" onClick={goToNext}>&#10095;</button>
        <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
      </div>
    </div>
  );
}

export default ImageLightbox;
