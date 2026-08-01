import { crm } from './state.js';
import {
  Bath,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  CopyCheck,
  DoorOpen,
  Ellipsis,
  Globe,
  Inbox,
  Laptop,
  PawPrint,
  QrCode,
  Rocket,
  Share,
  Shirt,
  Smartphone,
  Sparkles,
  SquarePlus,
  ThermometerSnowflake,
  Tv,
  Waves,
  Wifi,
  Wind,
  createIcons,
} from 'lucide';

const bundledLucideIcons = {
  Bath,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  CopyCheck,
  DoorOpen,
  Ellipsis,
  Globe,
  Inbox,
  Laptop,
  PawPrint,
  QrCode,
  Rocket,
  Share,
  Shirt,
  Smartphone,
  Sparkles,
  SquarePlus,
  ThermometerSnowflake,
  Tv,
  Waves,
  Wifi,
  Wind,
};

// Keep the existing small global surface used throughout the Front Desk, but
// source it from the signed bundle instead of downloading executable
// JavaScript from a CDN at runtime.
window.lucide = {
  createIcons(options = {}) {
    createIcons({ ...options, icons: bundledLucideIcons });
  },
};

function ensureLucideLoaded() {
  return Promise.resolve();
}

async function optimizeRoomPhotoForUpload(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/webp' && file.size < 400000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxW = 1600;
    const maxH = 1200;
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxW / w, maxH / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', 0.82);
    });
    const base = (file.name || 'room-photo').replace(/\.[^.]+$/, '') || 'room-photo';
    return new File([blob], base + '.webp', { type: 'image/webp' });
  } catch (_) {
    return file;
  }
}

function scheduleDeferredMessagesLoad() {
  const run = () => {
    if (crm.currentFilter === 'apps') loadMessages();
    else loadMessageBadges();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 600);
}

// Mirrors DEAD_BOOKING_STATUSES in server.js. 'pending' is NOT dead — a booking
// awaiting owner approval still holds its room.
const DEAD_BOOKING_STATUSES = ['cancelled', 'canceled', 'released'];

function isDeadBooking(booking) {
  if (!booking) return true;
  return DEAD_BOOKING_STATUSES.includes(String(booking.status || '').trim().toLowerCase());
}

function isPendingApproval(booking) {
  return String(booking?.status || '').trim().toLowerCase() === 'pending';
}

export function exposeToWindow(obj) {
  Object.assign(window, obj);
}

export {
  ensureLucideLoaded,
  isDeadBooking,
  isPendingApproval,
  optimizeRoomPhotoForUpload,
  scheduleDeferredMessagesLoad,
};
