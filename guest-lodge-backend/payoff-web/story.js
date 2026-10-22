'use strict';
// The story page: counted once per visitor, how far down they read and whether
// the first button reached the screen, and each button tap before it opens the
// sales letter. checkout.js has already sent the landing and source.
(() => {
  const track = window.PayoffTrack;
  // Each step once per visitor, however often they reload or scroll back.
  const once = detail => {
    if (!track) return;
    const key = 'payoff.story.' + detail;
    try { if (sessionStorage.getItem(key) === track.visitor) return; sessionStorage.setItem(key, track.visitor || ''); } catch { /* Send it. */ }
    track.event('PayoffStory', detail);
  };
  once('viewed');

  const depths = [25, 50, 75, 100];
  const reached = new Set();
  const measure = () => {
    const height = document.documentElement.scrollHeight;
    const seen = height ? (window.scrollY + window.innerHeight) / height * 100 : 0;
    for (const depth of depths) if (!reached.has(depth) && seen >= (depth === 100 ? 98 : depth)) { reached.add(depth); once('scroll' + depth); }
    if (reached.size === depths.length) window.removeEventListener('scroll', onScroll);
  };
  let pending = false;
  const onScroll = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; measure(); }); } };
  window.addEventListener('scroll', onScroll, { passive: true });

  const first = document.querySelector('a.adv-cta');
  if (first && 'IntersectionObserver' in window) {
    const watch = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { once('button'); watch.disconnect(); }
    }, { threshold: 0.6 });
    watch.observe(first);
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
