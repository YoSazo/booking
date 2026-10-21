'use strict';
// The story page: counted once per visitor, and each button tap before it
// opens the sales letter. checkout.js has already sent the landing and source.
(() => {
  const track = window.PayoffTrack;
  if (track) {
    let first = true;
    try { first = sessionStorage.getItem('payoff.storySent') !== track.visitor; sessionStorage.setItem('payoff.storySent', track.visitor || ''); } catch { /* Send it. */ }
    if (first) track.event('PayoffStory', 'viewed');
  }
  document.addEventListener('touchstart', () => {}, { passive: true });
  for (const cta of document.querySelectorAll('a.adv-cta')) cta.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (cta.classList.contains('is-pressed')) return;
    cta.classList.add('is-pressed');
    if (track) track.event('PayoffStory', 'tapped');
    setTimeout(() => location.assign(cta.href), 140);
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('.is-pressed').forEach(el => el.classList.remove('is-pressed')));
})();
