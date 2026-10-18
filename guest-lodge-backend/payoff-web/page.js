'use strict';
(() => {
  const content = window.PAYOFF_CONTENT;
  if (!content) return;
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: content.currency }).format(cents / 100);
  // Proof and portrait resources stay local. Never render owner text as HTML.
  const localImage = source => typeof source === 'string' && /^\/payoff\/assets\/[A-Za-z0-9_./-]+$/.test(source) && !source.includes('..');
  const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text === undefined ? {} : { textContent: text }) });
  const placeholder = (title, subtitle, className = '') => {
    const box = element('div', 'owner-placeholder '+className);
    box.append(element('span', 'slot-kicker', title));
    if (subtitle) box.append(element('p', '', subtitle));
    return box;
  };
  function proof(entry) {
    if (!entry || !localImage(entry.src) || typeof entry.alt !== 'string' || !entry.alt.trim()) return null;
    const figure = element('figure', 'proof-image');
    const image = new Image();
    image.src = entry.src; image.alt = entry.alt; image.loading = 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => figure.remove(), { once: true });
    figure.append(image);
    if (entry.caption) figure.append(element('figcaption', '', entry.caption));
    return figure;
  }
  for (const slot of document.querySelectorAll('.offer-slot')) {
    const template = document.querySelector('#offer-template');
    if (!template) continue;
    slot.append(template.content.cloneNode(true));
    slot.querySelector('[data-price]').textContent = money(content.priceCents).replace('.00', '')+' once';
    const cta = slot.querySelector('.cta');
    cta.dataset.placement = slot.dataset.placement;
  }
  const rating = document.querySelector('.rating-slot');
  if (rating) {
    if (content.rating && Number.isFinite(content.rating.stars) && content.rating.stars >= 0 && content.rating.stars <= 5 && content.rating.label) {
      const stars = element('div', 'rating-stars', '★'.repeat(Math.round(content.rating.stars)));
      stars.setAttribute('aria-hidden', 'true');
      const label = element('p', 'rating-label');
      label.append(element('strong', '', content.rating.label));
      if (content.rating.description) label.append(document.createTextNode(' '+content.rating.description));
      rating.append(stars, label);
      rating.setAttribute('aria-label', content.rating.stars+' out of 5. '+content.rating.label+(content.rating.description ? ' '+content.rating.description : ''));
    } else rating.append(placeholder('Your rating and customer proof', 'Add your supported rating or customer count.', 'rating-placeholder'));
  }
  for (const slot of document.querySelectorAll('[data-proof]')) {
    const group = slot.dataset.proof;
    const entries = group === 'checkout'
      ? [content.proof.early[1], content.proof.early[0], content.proof.main[0], content.proof.example[0]]
      : content.proof[group] || [];
    entries.forEach(entry => { const item = proof(entry); if (item) slot.append(item); });
  }
  const founder = content.founder;
  const founderRoot = document.getElementById('founder-content');
  if (founderRoot && founder) {
    if (founder.heading) founderRoot.querySelector('h2').textContent = founder.heading;
    if (Array.isArray(founder.paragraphs) && founder.paragraphs.length) {
      const story = element('div', 'founder-story');
      for (const paragraph of founder.paragraphs) story.append(element('p', '', paragraph));
      founderRoot.querySelector('[data-owner-slot="founder-story"]').replaceWith(story);
    }
    if (localImage(founder.image) && founder.imageAlt) {
      const image = new Image(); image.src = founder.image; image.alt = founder.imageAlt; image.className = 'founder-photo'; image.decoding = 'async'; image.loading = 'lazy';
      const slot = founderRoot.querySelector('[data-owner-slot="founder-photo"]');
      image.addEventListener('error', () => image.replaceWith(placeholder('Missing portrait', 'Check the supplied founder image.')), { once: true });
      slot.replaceWith(image);
      if (founder.caption) founderRoot.append(element('p', 'portrait-caption', founder.caption));
    }
  }
  if (content.refundPolicy) {
    document.querySelectorAll('.policy-slot,[data-policy-copy]').forEach(el => { el.textContent = content.refundPolicy; });
    const refund = document.querySelector('[data-owner-slot="refund"]');
    if (refund) refund.replaceChildren(element('p', '', content.refundPolicy));
  }
  for (const slot of document.querySelectorAll('[data-product-visual]')) {
    if (content.productImage && localImage(content.productImage.src) && content.productImage.alt) {
      const image = new Image(); image.src = content.productImage.src; image.alt = content.productImage.alt; image.loading = 'lazy'; slot.append(image); continue;
    }
    const demo = element('div', 'interface-demo');
    const top = element('div', 'interface-top');
    top.append(element('span', 'interface-logo', 'M'), element('span', '', content.product));
    const body = element('div', 'interface-body');
    for (const [label, value] of [['Monthly budget', '$250'], ['Projected payoff', '32 months']]) { const tile = element('div', ''); tile.append(element('span', '', label), element('strong', '', value)); body.append(tile); }
    const table = element('table', 'interface-table');
    table.setAttribute('aria-label', 'Illustrative debt balances');
    for (const [index, row] of [['Debt', 'Balance', 'APR'], ['Card', '$5,000', '24%'], ['Other debt', '$1,000', '0%']].entries()) { const tr = element('tr', ''); for (const cell of row) tr.append(element(index ? 'td' : 'th', '', cell)); table.append(tr); }
    demo.append(top, body, table); slot.append(demo, element('p', 'interface-caption', 'Interface illustration · example data · app not yet built'));
  }
  // Real press feedback, not focus-dependent; no tracking or remote requests.
  document.addEventListener('touchstart', () => {}, { passive: true });
  for (const cta of document.querySelectorAll('a.cta')) cta.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (cta.classList.contains('is-pressed')) return;
    cta.classList.add('is-pressed');
    setTimeout(() => location.assign(cta.href), 140);
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('.is-pressed').forEach(el => el.classList.remove('is-pressed')));
  const order = document.getElementById('order-form');
  if (order) {
    order.addEventListener('submit', event => event.preventDefault());
    document.querySelector('[data-base-price]').textContent = money(content.priceCents);
    content.addOns.forEach(addon => { const price = document.querySelector('[data-addon-price="'+addon.id+'"]'); if (price) price.textContent = money(addon.priceCents).replace('.00', '')+' once'; });
    const update = () => {
      const selected = content.addOns.filter(addon => document.getElementById(addon.id)?.checked);
      const lines = document.getElementById('summary-lines');
      lines.replaceChildren();
      for (const item of [{ name: 'Payoff plan', priceCents: content.priceCents }, ...selected]) { const row = element('div', 'summary-line'); row.append(element('span', '', item.name), element('span', '', money(item.priceCents))); lines.append(row); }
      document.getElementById('order-total').textContent = money(selected.reduce((sum, addon) => sum+addon.priceCents, content.priceCents));
    };
    order.addEventListener('change', update); window.addEventListener('pageshow', update); update();
  }
})();
