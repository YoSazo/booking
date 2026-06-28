import { crm } from './state.js';

let lucideLoadPromise = null;

function ensureLucideLoaded() {
  if (typeof lucide !== 'undefined') return Promise.resolve();
  if (lucideLoadPromise) return lucideLoadPromise;
  lucideLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('lucide load failed'));
    document.head.appendChild(s);
  });
  return lucideLoadPromise;
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
    if (crm.currentFilter === 'bookings') loadMessages();
    else loadMessageBadges();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 600);
}

export function exposeToWindow(obj) {
  Object.assign(window, obj);
}

export { ensureLucideLoaded, optimizeRoomPhotoForUpload, scheduleDeferredMessagesLoad };
