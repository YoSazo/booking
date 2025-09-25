import React, { useState, useEffect } from 'react';

function ImageLightbox({ images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- START: NEW PRELOADING LOGIC ---
  useEffect(() => {
    // This effect runs whenever the current image changes.
    // Its job is to secretly preload the next and previous images
    // so they are ready to be displayed instantly.

    // Preload the NEXT image
    const nextIndex = (currentIndex + 1) % images.length;
    const nextImage = new Image();
    nextImage.src = images[nextIndex];

    // Preload the PREVIOUS image
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const prevImage = new Image();
    prevImage.src = images[prevIndex];

  }, [currentIndex, images]); // Re-run this logic when the image changes
  // --- END: NEW PRELOADING LOGIC ---

  const goToPrevious = () => {
    setIsLoaded(false); // Hide image briefly to show loading state for fast clicks
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    setIsLoaded(false);
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
          {!isLoaded && <div className="loader"></div>}
          <img
            src={images[currentIndex]}
            alt={`Room image ${currentIndex + 1}`}
            className={`lightbox-image ${isLoaded ? 'visible' : ''}`}
            // This tells us when the image is fully loaded and ready to be shown
            onLoad={() => setIsLoaded(true)} 
          />
        </div>

        <button className="lightbox-nav-btn next" onClick={goToNext}>&#10095;</button>
        <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
      </div>
    </div>
  );
}

export default ImageLightbox;
