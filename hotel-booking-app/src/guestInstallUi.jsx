import React from 'react';

export const BRAND = '#2E7D5B';

export const INSTALL_THEME = {
  green: BRAND,
  greenLight: '#4CAF7D',
  greenPale: '#E8F5EE',
  bg: '#EEF2EF',
  white: '#FFFFFF',
  text: '#1A2B22',
  textMuted: '#6B7D72',
  border: '#D8E4DC',
  shadow: '0 2px 12px rgba(46,125,91,0.10)',
};

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export function resolvePropertyIconUrl(hotel, rooms) {
  const roomList = Array.isArray(rooms) && rooms.length ? rooms : hotel?.rooms;
  const firstRoom = Array.isArray(roomList) ? roomList[0] : null;
  return hotel?.appIconUrl
    || firstRoom?.imageUrls?.[0]
    || firstRoom?.images?.[0]?.url
    || firstRoom?.imageUrl
    || '';
}

export function resolveGuestelWalletImageUrl(hotel, rooms) {
  const roomList = Array.isArray(rooms) && rooms.length ? rooms : hotel?.rooms;
  const firstRoom = Array.isArray(roomList) ? roomList[0] : null;
  return hotel?.guestelWalletImageUrl
    || firstRoom?.imageUrls?.[0]
    || firstRoom?.images?.[0]?.url
    || firstRoom?.imageUrl
    || hotel?.appIconUrl
    || '';
}

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
