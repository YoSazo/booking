'use strict';
(() => {
  if (document.body.dataset.page !== 'sales') return;
  const records = window.PAYOFF_CONTENT?.purchaseNotices;
  if (!Array.isArray(records)) return;
  const STORAGE = 'payoff.purchaseNotices.seen.v1';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const FIRST_DELAY = 12000, DISPLAY_TIME = 7000, BETWEEN_DELAY = 18000;
  let seen;
  try {
    seen = new Set(JSON.parse(localStorage.getItem(STORAGE) || '[]'));
    localStorage.setItem(STORAGE, JSON.stringify([...seen]));
  } catch { return; }
  const pending = records.filter(record => {
    const at = Date.parse(record.purchasedAt), age = Date.now() - at;
    return record.id && record.name && Number.isFinite(at) && age >= 0 && age < MAX_AGE && !seen.has(record.id);
  }).sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));
  if (!pending.length) return;
  const card = document.createElement('aside');
  card.className = 'purchase-notice'; card.hidden = true;
  card.setAttribute('aria-label', 'Recent purchase');
  const icon = new Image();
  icon.src = '/marketel-frontdesk-icon.png'; icon.alt = ''; icon.width = 42; icon.height = 42;
  const copy = document.createElement('div'); copy.className = 'purchase-notice-copy';
  const message = document.createElement('p'); message.setAttribute('role', 'status');
  const time = document.createElement('time');
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'purchase-notice-close';
  close.setAttribute('aria-label', 'Dismiss purchase notifications'); close.textContent = '×';
  copy.append(message, time); card.append(icon, copy, close); document.body.append(card);
  let active = null, timer = null, stopped = false;
  const ageLabel = at => {
    const minutes = Math.floor((Date.now() - Date.parse(at)) / 60000);
    if (minutes < 1) return 'Less than a minute ago';
    if (minutes < 60) return `About ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    return `About ${hours} hour${hours === 1 ? '' : 's'} ago`;
  };
  function next() {
    if (stopped) return;
    if (document.hidden) { timer = setTimeout(next, 1000); return; }
    active = pending.shift();
    if (!active) { card.remove(); return; }
    if (Date.now() - Date.parse(active.purchasedAt) >= MAX_AGE) return next();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE) || '[]');
      if (stored.includes(active.id)) return next();
      seen = new Set([...stored, active.id]);
      localStorage.setItem(STORAGE, JSON.stringify([...seen]));
    } catch { card.remove(); return; }
    message.replaceChildren();
    const name = document.createElement('strong'); name.textContent = active.name;
    message.append(name);
    if (active.city) {
      const city = document.createElement('span'); city.className = 'purchase-notice-location';
      city.textContent = ` (${active.city})`; message.append(city);
    }
    message.append(document.createElement('br'), document.createTextNode('Purchased Marketel Payoff'));
    time.dateTime = active.purchasedAt; time.textContent = ageLabel(active.purchasedAt);
    card.hidden = false;
    timer = setTimeout(() => { card.hidden = true; active = null; timer = setTimeout(next, BETWEEN_DELAY); }, DISPLAY_TIME);
  }
  const refresh = setInterval(() => {
    if (active && !card.hidden) {
      if (Date.now() - Date.parse(active.purchasedAt) >= MAX_AGE) card.hidden = true;
      else time.textContent = ageLabel(active.purchasedAt);
    }
    if (!card.isConnected) clearInterval(refresh);
  }, 1000);
  close.addEventListener('click', () => { stopped = true; clearTimeout(timer); clearInterval(refresh); card.remove(); });
  timer = setTimeout(next, FIRST_DELAY);
})();
