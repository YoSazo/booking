import React from 'react';
import { BRAND } from './guestInstallUtils.js';

export function HotelIcon({ hotelName, appIconUrl, size = 68, style = {} }) {
  const initial = (hotelName || 'H').trim().charAt(0).toUpperCase();
  const base = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.25),
    flexShrink: 0,
    boxShadow: size >= 60 ? '0 8px 18px rgba(46,125,91,0.28)' : undefined,
    ...style,
  };
  if (appIconUrl) return <img src={appIconUrl} alt="" style={{ ...base, objectFit: 'cover' }} />;
  return (
    <div style={{
      ...base,
      background: BRAND,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.46,
      fontWeight: 800,
    }}>
      {initial}
    </div>
  );
}
