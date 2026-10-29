'use strict';
// Payoff product page: picture gallery, order options, testimonial
// tabs, the sticky button, and the example numbers worked out by engine.js
// (the app's own maths), so the chart and face-off match what the app shows.
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const money = cents => '$' + Math.round(cents / 100).toLocaleString('en-US');

  // Gallery: thumbnails swap the main picture; arrows step through them.
  const main = $('[data-main]');
  const thumbs = $$('[data-thumbs] .thumb');
  const show = index => {
    const thumb = thumbs[(index + thumbs.length) % thumbs.length];
    thumbs.forEach(t => t.classList.toggle('is-on', t === thumb));
    main.src = thumb.dataset.src; main.alt = thumb.dataset.alt;
    thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i)));
  const current = () => thumbs.findIndex(t => t.classList.contains('is-on'));
  $('[data-prev]').addEventListener('click', () => show(current() - 1));
  $('[data-next]').addEventListener('click', () => show(current() + 1));

  // Order options: the button shows the chosen option's price, and carries its
  // add-ons to the order page, which ticks the ones saved in payoff.addons.
  // While the checkout's $5-off offer is running, every price shows it, as the
  // sales letter does, so this page and the order page agree.
  const options = $$('.option');
  let offCents = 0;
  const priceOf = option => ((Math.round(Number(option.dataset.price) * 100) - offCents) / 100).toFixed(2);
  const paint = () => {
    options.forEach(o => {
      o.querySelector('.opt-price').textContent = '$' + priceOf(o);
      o.querySelector('.opt-save').textContent = 'Save $' + Math.round(Number(o.dataset.reg) - Number(priceOf(o)));
    });
    $$('[data-base-price]').forEach(el => { el.textContent = '$' + priceOf(options[0]); });
    const chosen = $('.option.is-on') || options[0];
    $('[data-cta-price]').textContent = '$' + priceOf(chosen);
    $('[data-cta-reg]').textContent = '$' + chosen.dataset.reg;
  };
  options.forEach(option => option.addEventListener('click', () => {
    options.forEach(o => { o.classList.toggle('is-on', o === option); o.setAttribute('aria-checked', String(o === option)); });
    paint();
    window.PayoffMeasure?.mark('option-' + option.dataset.option);
  }));
  const refreshOffer = () => fetch('/api/payoff/config?offer=preview', { headers: window.PayoffTrack?.headers || {} })
    .then(r => (r.ok ? r.json() : null))
    .then(config => { offCents = config?.checkoutOffer?.discountCents === 500 ? 500 : 0; paint(); })
    .catch(() => { /* The listed prices stand. */ });
  refreshOffer();
  addEventListener('pageshow', event => { if (event.persisted) refreshOffer(); });
  $('[data-cta]').addEventListener('click', () => {
    const chosen = $('.option.is-on');
    try { sessionStorage.setItem('payoff.addons', JSON.stringify((chosen?.dataset.extras || '').split(' ').filter(Boolean))); } catch { /* The order page still lets them tick the add-ons. */ }
  });

  // Testimonial tabs.
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(t => { t.classList.toggle('is-on', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
    $$('.slide').forEach(slide => { slide.hidden = slide.dataset.group !== tab.dataset.tab; });
    $('[data-slides]').scrollLeft = 0;
  }));

  // Sticky button once the order box has scrolled away.
  const buy = $('[data-buy]'), sticky = $('[data-sticky]');
  new IntersectionObserver(([entry]) => { sticky.hidden = entry.isIntersecting || entry.boundingClientRect.top > 0; }).observe(buy);

  // The example: three cards, a medical bill and a car loan ($33,600, $965 a month in minimums).
  const engine = window.PayoffEngine;
  if (!engine) return;
  const debts = [
    { name: 'Capital One', type: 'card', balance: 840000, apr: 29.99, minimum: 25200 },
    { name: 'Chase Freedom', type: 'card', balance: 520000, apr: 24.99, minimum: 15600 },
    { name: 'Discover', type: 'card', balance: 310000, apr: 27.24, minimum: 9300 },
    { name: 'Medical bill', type: 'loan', balance: 230000, apr: 0, minimum: 7500 },
    { name: 'Car loan', type: 'loan', balance: 1460000, apr: 8.9, minimum: 38900 },
  ];
  const now = new Date();
  const start = { year: now.getFullYear(), month: now.getMonth() };
  const result = engine.plan(debts, { start });
  const minimums = result.minimums;
  const best = result.plans.find(p => p.key === result.fastest);
  if (!minimums || !minimums.date || !best) return;
  const dateText = d => `${MONTHS[d.month]} ${d.year}`;
  const fill = (attr, text) => $$(`[${attr}]`).forEach(el => { el.textContent = text; });
  fill('data-min-date', dateText(minimums.date));
  fill('data-min-year', String(minimums.date.year));
  fill('data-min-interest', money(minimums.totalInterest));
  fill('data-plan-date', dateText(best.date));
  fill('data-plan-year', String(best.date.year));
  fill('data-plan-interest', money(best.totalInterest));
  fill('data-monthly', money(debts.reduce((sum, d) => sum + d.minimum, 0)));
  fill('data-saved', money(minimums.totalInterest - best.totalInterest));
  const sooner = minimums.months - best.months;
  fill('data-years-sooner', `${Math.floor(sooner / 12)} years ${sooner % 12} months sooner`);

  // The payment chart: what minimums-only asks for each month, year by year.
  const box = $('[data-chart-payment]');
  const paid = minimums.rows.map(row => Object.values(row.payments).reduce((sum, v) => sum + v, 0));
  const W = 340, H = 230, L = 44, R = 12, T = 18, B = 34;
  const maxY = Math.ceil(paid[0] / 20000) * 20000;
  const x = m => L + (m / (paid.length - 1)) * (W - L - R);
  const y = v => T + (1 - v / maxY) * (H - T - B);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, text) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  for (let v = 0; v <= maxY; v += maxY / 4) {
    svg.append(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: '#eee3de', 'stroke-width': 1 }));
    svg.append(el('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#6e5660' }, money(v)));
  }
  const step = Math.max(1, Math.round(paid.length / 120));
  let line = '';
  for (let m = 0; m < paid.length; m += step) line += `${m ? 'L' : 'M'}${x(m).toFixed(1)},${y(paid[m]).toFixed(1)}`;
  line += `L${x(paid.length - 1).toFixed(1)},${y(paid[paid.length - 1]).toFixed(1)}`;
  const grad = el('linearGradient', { id: 'shrink', x1: 0, y1: 0, x2: 1, y2: 0 });
  grad.append(el('stop', { offset: '0%', 'stop-color': '#23a548' }), el('stop', { offset: '35%', 'stop-color': '#f2a516' }), el('stop', { offset: '100%', 'stop-color': '#d93a3a' }));
  const defs = el('defs', {}); defs.append(grad); svg.append(defs);
  svg.append(el('path', { d: `${line}L${x(paid.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, fill: '#fde8e4', opacity: 0.7 }));
  svg.append(el('path', { d: line, fill: 'none', stroke: 'url(#shrink)', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  const yearSpan = Math.ceil(paid.length / 12);
  for (let yr = 0; yr <= yearSpan; yr += Math.max(5, Math.round(yearSpan / 5 / 5) * 5)) {
    const m = Math.min(paid.length - 1, yr * 12);
    svg.append(el('text', { x: x(m), y: H - 12, 'text-anchor': 'middle', 'font-size': 10, fill: '#6e5660' }, String(start.year + yr)));
  }
  // Labels on the real curve: where it starts, two later years, and the end.
  const marks = [
    [0, `Starts at ${money(paid[0])}`, '#23a548'],
    [Math.min(paid.length - 1, 36), `${money(paid[Math.min(paid.length - 1, 36)])} by ${start.year + 3}`, '#f2a516'],
    [Math.min(paid.length - 1, 120), `${money(paid[Math.min(paid.length - 1, 120)])} by ${start.year + 10}`, '#e8762c'],
    [paid.length - 1, `Done: ${dateText(minimums.date)}`, '#d93a3a'],
  ];
  marks.forEach(([m, label, colour], i) => {
    const cx = x(m), cy = y(paid[m]);
    svg.append(el('circle', { cx, cy, r: 4.5, fill: colour, stroke: '#fff', 'stroke-width': 2 }));
    const right = i < 2;
    const tw = label.length * 5.6 + 14;
    const bx = right ? Math.min(cx + 8, W - R - tw) : Math.max(L, cx - tw - 8);
    // The first label sits above its point, the second below, so the two early ones never overlap.
    const by = Math.max(T, Math.min(i === 1 ? cy + 10 : cy - (i === 3 ? 34 : 26), H - B - 22));
    svg.append(el('rect', { x: bx, y: by, width: tw, height: 18, rx: 9, fill: colour }));
    svg.append(el('text', { x: bx + tw / 2, y: by + 12.5, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#fff' }, label));
  });
  box.append(svg);
})();
