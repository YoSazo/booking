import React, { useState, useEffect } from 'react';

function ImageLightbox({ images, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [allLoaded, setAllLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Do not preload the entire gallery up-front.
  // Preloading 8–12 large images can add 10–20MB and delay initial page interactivity.
  // Instead, show immediately and rely on browser caching + natural loading as users navigate.
  useEffect(() => {
    setAllLoaded(true);
  }, [images]);

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
  }, [currentIndex]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {allLoaded ? (
          <>
            <button className="lightbox-nav-btn prev" onClick={goToPrevious}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            
            <div className="lightbox-image-container">
              {images.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`Room image ${index + 1}`}
                  className="lightbox-image"
                  style={{
                    display: index === currentIndex ? 'block' : 'none'
                  }}
                />
              ))}
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
              Loading images... {loadedCount} / {images.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageLightbox;