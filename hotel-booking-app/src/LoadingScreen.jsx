import React from 'react';

export default function LoadingScreen({ message = "Securing your room..." }) {
  return (
    <div className="loading-screen-overlay">
      <div className="loading-screen-minimal">
        {/* Elegant key icon with pulse */}
        <div className="loading-icon-wrapper">
          <svg 
            className="loading-key-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="5" />
            <path d="M11.5 11.5L22 22" />
            <path d="M18 18l2 2" />
            <path d="M15 15l2 2" />
          </svg>
          <div className="loading-pulse-ring"></div>
        </div>

        {/* Single message */}
        <p className="loading-text">{message}</p>
        
        {/* Subtle don't refresh hint */}
        <p className="loading-hint">Please don't close this page</p>
      </div>
    </div>
  );
}
