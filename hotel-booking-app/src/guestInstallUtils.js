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

function firstRoomImage(hotel, rooms) {
  const roomList = Array.isArray(rooms) && rooms.length ? rooms : hotel?.rooms;
  const firstRoom = Array.isArray(roomList) ? roomList[0] : null;
  return firstRoom?.imageUrls?.[0]
    || firstRoom?.images?.[0]?.url
    || firstRoom?.imageUrl
    || '';
}

export function resolvePropertyIconUrl(hotel, rooms) {
  return hotel?.appIconUrl || firstRoomImage(hotel, rooms);
}

export function resolveGuestelWalletImageUrl(hotel, rooms) {
  return hotel?.guestelWalletImageUrl
    || firstRoomImage(hotel, rooms)
    || hotel?.appIconUrl
    || '';
}
