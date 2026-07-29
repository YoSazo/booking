import React, { useCallback, useEffect, useState } from 'react';

function ImageLightbox({ images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const currentImage = images[currentIndex] || images[0] || '';

  useEffect(() => {
    setImageLoaded(false);
  }, [currentImage]);

  // A hidden <img> for every photo still downloads every source. Preload only
  // the most likely next photo so navigation stays quick without fetching the
  // entire gallery.
  useEffect(() => {
    if (images.length < 2) return;
    const nextImage = new Image();
    nextImage.src = images[(currentIndex + 1) % images.length];
  }, [currentIndex, images]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((index) => (
      index === 0 ? images.length - 1 : index - 1
    ));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((index) => (
      index === images.length - 1 ? 0 : index + 1
    ));
  }, [images.length]);
  
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
  }, [goToNext, goToPrevious, onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {currentImage ? (
          <>
            <button className="lightbox-nav-btn prev" onClick={goToPrevious}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            
            <div className="lightbox-image-container">
              {!imageLoaded && (
                <div className="lightbox-shimmer">
                  <div className="shimmer-animation"></div>
                </div>
              )}
              <img
                src={currentImage}
                alt={`Room image ${currentIndex + 1}`}
                className="lightbox-image"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                style={{ opacity: imageLoaded ? 1 : 0 }}
              />
            </div>

            <button className="lightbox-nav-btn next" onClick={goToNext}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            
            <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
          </>
        ) : (
          <div className="lightbox-loader">
            <div style={{ color: '#fff', fontSize: '18px', textAlign: 'center' }}>
              No photos available.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageLightbox;
