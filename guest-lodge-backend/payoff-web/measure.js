'use strict';
// What each Payoff page records after the landing, once per visitor: how long
// it was on screen, how far down they got (the sales letter's sections, the
// order page's form, extras and button) and what they tapped. order.js adds the
// form's own steps through PayoffMeasure.mark. Step names only, never what
// anyone types. checkout.js has already sent the landing and source.
(() => {
  const track = window.PayoffTrack;
  const page = document.body.dataset.page;
  const name = { story: 'PayoffStory', sales: 'PayoffLetter', order: 'PayoffOrder' }[page];
  if (!track || !name || (page === 'sales' && document.body.dataset.variant !== 'letter')) return;

  // Each step once per visitor, however often they reload or scroll back.
  // True when this call sent it.
  const sent = new Set();
  const mark = detail => {
    if (sent.has(detail)) return false;
    sent.add(detail);
    const key = `payoff.${name}.${detail}`;
    try { if (sessionStorage.getItem(key) === track.visitor) return false; sessionStorage.setItem(key, track.visitor || ''); } catch { /* Send it. */ }
    track.event(name, detail);
    return true;
  };
  window.PayoffMeasure = { mark };

  // Seconds on screen, counted only while the tab is showing: ten seconds is a
  // real reader, not a bounce.
  let seconds = 0;
  const clock = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    seconds += 1;
    if ([10, 60, 180].includes(seconds)) mark('time' + seconds);
    if (seconds >= 180) clearInterval(clock);
  }, 1000);
  if (page === 'story') return; // story.js records its own reading steps.

  // A part of the page is reached once its top is above this share of the
  // screen. Reaching one counts the ones before it, so a fast fling past a
  // section still counts it.
  const spots = page === 'sales'
    ? [...document.querySelectorAll('section[data-section]:not([data-section="hero"])')].map(el => ({ el, detail: el.dataset.section, at: 0.5 }))
    : [['#order-form', 'saw-form'], ['.bumps', 'saw-addons'], ['#buy-button', 'saw-button']]
      .map(([selector, detail]) => ({ el: document.querySelector(selector), detail, at: 0.75 })).filter(spot => spot.el);
  const measure = () => {
    const last = spots.reduce((found, spot, index) => (spot.el.getBoundingClientRect().top < innerHeight * spot.at ? index : found), -1);
    spots.slice(0, last + 1).forEach(spot => mark(spot.detail));
    const height = document.documentElement.scrollHeight;
    if (page === 'sales' && height && (scrollY + innerHeight) / height >= 0.98) mark('end');
  };
  let pending = false;
  const onScroll = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; measure(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  addEventListener('load', onScroll);
  onScroll();
  if (page !== 'sales') return;

  // Which button sent them on, by the section it sits in, and which answers they opened.
  document.addEventListener('click', event => {
    const cta = event.target.closest?.('a.cta');
    if (cta) mark('tap-' + (cta.dataset.placement || 'other'));
  }, true);
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!details.open) return;
    if (details.closest('[data-section="faq"]')) mark('faq-open');
    else if (details.classList.contains('calculation-details')) mark('math-open');
  }, true);
})();
