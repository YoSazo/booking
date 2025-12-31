import React, { useState, useEffect } from 'react';

export default function LoadingScreen({ message = "Securing Your Reservation..." }) {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // Fake progress bar (aesthetic only)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Stop at 90%, complete on actual success
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="loading-screen-overlay">
      <div className="loading-screen-content">
        {/* Animated spinner */}
        <div className="loading-spinner">
          <svg className="spinner-svg" viewBox="0 0 50 50">
            <circle
              className="spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
          </svg>
        </div>

        {/* Progress steps */}
        <div className="loading-steps">
          <div className="loading-step completed">
            <div className="step-icon">✓</div>
            <div className="step-text">Validating payment</div>
          </div>
          <div className="loading-step active">
            <div className="step-icon">
              <div className="step-spinner"></div>
            </div>
            <div className="step-text">Creating your reservation{dots}</div>
          </div>
          <div className="loading-step">
            <div className="step-icon">3</div>
            <div className="step-text">Confirming with hotel</div>
          </div>
        </div>

        {/* Main message */}
        <h2 className="loading-message">{message}</h2>
        <p className="loading-submessage">Please don't refresh or go back</p>

        {/* Progress bar */}
        <div className="loading-progress-bar">
          <div 
            className="loading-progress-fill" 
            style={{ width: `${Math.min(progress, 90)}%` }}
          ></div>
        </div>

        {/* Reassurance text */}
        <p className="loading-reassurance">Almost there! Your room is being reserved...</p>
      </div>
    </div>
  );
}
