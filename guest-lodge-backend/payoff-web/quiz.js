'use strict';
// The quiz landing: the ad's hook, two one-tap questions, the cards one number
// at a time, then their real date on minimums, how much sooner a plan gets
// them out, and the locked plan behind the order page. Every number comes from
// the same engine the tool uses. Nothing typed here leaves the phone; the
// cards are handed to the tool (payoff.v1) when they go to pay.
(() => {
  const E = window.PayoffEngine;
  const track = window.PayoffTrack || { event() {}, paintOffers() {} };
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const KEY = 'payoff.quiz.v1';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date(), start = { year: now.getFullYear(), month: now.getMonth() };
  const money = cents => '$' + Math.round(cents / 100).toLocaleString('en-US');
  const monthName = date => `${MONTHS[date.month]} ${date.year}`;
  const duration = months => {
    const years = Math.floor(months / 12), rest = months % 12;
    return [years && `${years} year${years > 1 ? 's' : ''}`, rest && `${rest} month${rest > 1 ? 's' : ''}`].filter(Boolean).join(' ') || 'less than a month';
  };
  const parse = text => {
    const clean = String(text || '').replace(/[$,%\s]/g, '');
    return /^\d*\.?\d{0,2}$/.test(clean) && clean !== '' && clean !== '.' ? Number(clean) : NaN;
  };

  let quiz = { at: 0, count: 0, paying: null, cards: [], extra: null };
  try { quiz = { ...quiz, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { /* Start fresh. */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(quiz)); } catch { /* Optional. */ } };
  // Each step reaches the funnel once per visitor; never a number.
  const reached = detail => {
    try {
      const seen = JSON.parse(sessionStorage.getItem('payoff.quiz.seen') || '[]');
      if (seen.includes(detail)) return;
      sessionStorage.setItem('payoff.quiz.seen', JSON.stringify([...seen, detail]));
    } catch { /* Send it anyway. */ }
    track.event('PayoffQuizStep', detail);
  };

  const steps = () => ['count', 'paying', ...Array.from({ length: quiz.count }, (_, i) => ['balance', 'apr', 'minimum'].map(field => `${field}-${i}`)).flat(), 'reveal', 'extra', 'plan'];
  const debts = () => quiz.cards.slice(0, quiz.count).map((card, i) => ({ id: `q${i + 1}`, name: `Card ${i + 1}`, type: 'card',
    balance: Math.round(card.balance * 100), apr: card.apr, minimum: Math.round(card.minimum * 100) }));
  const outcome = extra => E.plan(debts(), { extra: Math.round(extra * 100), start });

  // Small builders. Text is always set as text, never as HTML.
  const el = (tag, className, text) => Object.assign(document.createElement(tag), { className: className || '', ...(text === undefined ? {} : { textContent: text }) });
  const words = (tag, className, text) => {
    const node = el(tag, className);
    text.split(' ').forEach((word, i) => { const span = el('span', 'word', word); span.style.setProperty('--i', i); node.append(span, ' '); });
    return node;
  };
  const go = (label, onClick, disabled = false) => {
    const button = el('button', 'go', label); button.type = 'button'; button.disabled = disabled;
    button.addEventListener('click', onClick); return button;
  };
  const choice = (label, onPick, className = '') => {
    const button = el('button', 'choice ' + className, label); button.type = 'button';
    // The next screen comes in inside the same tap: iPhone only raises the
    // keyboard for a field focused during the tap itself.
    button.addEventListener('click', () => { button.classList.add('picked'); onPick(); });
    return button;
  };
  const next = text => el('p', 'next', text);

  // The balance line falling month by month, for one plan or two.
  function chart(lines) {
    const width = 320, height = 130;
    const series = lines.map(({ plan }) => {
      const balances = new Map(debts().map(debt => [debt.id, debt.balance]));
      const points = [[...balances.values()].reduce((a, b) => a + b, 0)];
      for (const row of plan.rows) { for (const [id, value] of Object.entries(row.balances)) balances.set(id, Math.max(0, value)); points.push([...balances.values()].reduce((a, b) => a + b, 0)); }
      return points;
    });
    const months = Math.max(...series.map(points => points.length - 1), 1), top = Math.max(...series.map(points => Math.max(...points)), 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height + 4}`); svg.setAttribute('class', 'chart'); svg.setAttribute('aria-hidden', 'true');
    series.forEach((points, index) => {
      const step = Math.max(1, Math.ceil(points.length / 160));
      const d = points.map((value, month) => [month, value]).filter(([month]) => month % step === 0 || month === points.length - 1)
        .map(([month, value], i) => `${i ? 'L' : 'M'}${(month / months * width).toFixed(1)} ${(2 + (1 - value / top) * height).toFixed(1)}`).join(' ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d); path.setAttribute('class', 'line ' + lines[index].className); path.setAttribute('pathLength', '1');
      svg.append(path);
    });
    return svg;
  }

  function show(direction = 1) {
    const list = steps();
    quiz.at = Math.max(0, Math.min(quiz.at, list.length - 1));
    save();
    const name = list[quiz.at];
    const screen = render(name);
    screen.classList.add('screen', direction < 0 ? 'from-left' : 'from-right');
    stage.replaceChildren(screen);
    if (name === 'plan') { track.paintOffers(); startOffer(); }
    $('back').hidden = quiz.at === 0;
    $('progress').style.width = `${(6 + 94 * Math.pow(quiz.at / (list.length - 1), 0.65)).toFixed(1)}%`;
    document.body.dataset.step = name.replace(/-\d+$/, '');
    paintOffer();
    window.scrollTo(0, 0);
    // Focus the number field inside the tap that opened it, so the keyboard comes up.
    if (screen.classList.contains('number')) screen.querySelector('input').focus({ preventScroll: true });
  }
  const advance = () => { quiz.at += 1; show(1); };

  function render(name) {
    const [field, index] = name.split('-');
    if (name === 'count') return hook();
    if (name === 'paying') return paying();
    if (['balance', 'apr', 'minimum'].includes(field)) return number(field, Number(index));
    if (name === 'reveal') return reveal();
    if (name === 'extra') return extra();
    return plan();
  }

  // 1. The ad's hook, then the first tap.
  function hook() {
    const screen = el('section', 'hook');
    const hero = el('div', 'hero');
    const image = new Image(); image.src = '/payoff/assets/lauren-hero-0fde5d8d66.webp'; image.alt = ''; image.width = 780; image.height = 691; image.decoding = 'async';
    hero.append(image, words('p', 'caption', 'CREDIT CARD HOLDERS 👇'));
    const grid = el('div', 'choices grid');
    for (const [label, count] of [['1', 1], ['2', 2], ['3', 3], ['4+', 4]]) grid.append(choice(label, () => {
      quiz.count = count; quiz.cards = Array.from({ length: count }, (_, i) => quiz.cards[i] || {}); reached('q1'); advance();
    }));
    screen.append(hero, words('h1', 'q', 'How many credit cards are you paying off?'), grid,
      next('See your debt-free date in about 2 minutes. No bank login. No spreadsheet.'));
    return screen;
  }

  // 2. Where they are now; the answer only changes what we say back.
  const REPLIES = {
    minimums: 'No judgment. Most people start right here.',
    extra: 'Good. We’ll show what that extra really does.',
    max: 'Then let’s make every dollar count.',
    changes: 'That’s normal. We’ll plan around a steady amount.',
  };
  function paying() {
    const screen = el('section');
    screen.append(el('p', 'kicker', quiz.count === 1 ? 'One card. Let’s see it clearly.' : quiz.count === 4 ? '4 or more. Start with your 4 biggest.' : `${quiz.count} cards. Let’s line them up.`),
      words('h1', 'q', 'How are you paying them right now?'));
    const list = el('div', 'choices stack');
    for (const [key, label] of [['minimums', 'Mostly the minimums'], ['extra', 'A little extra when I can'], ['max', 'As much as I can'], ['changes', 'It changes month to month']]) {
      list.append(choice(label, () => { quiz.paying = key; reached('q2'); advance(); }));
    }
    screen.append(list, next('Next: your cards, one number at a time.'));
    return screen;
  }

  // 3. One number per screen. A close guess is fine; the tool lets them fix it.
  function number(field, index) {
    const card = quiz.cards[index] || (quiz.cards[index] = {});
    const last = index === quiz.count - 1;
    const screen = el('section', 'number');
    const kicker = index === 0 && field === 'balance' && quiz.paying ? REPLIES[quiz.paying] : `Card ${index + 1} of ${quiz.count}`;
    const question = { balance: `What’s the balance on card ${index + 1}?`, apr: `What’s card ${index + 1}’s interest rate (APR)?`, minimum: `What’s card ${index + 1}’s minimum payment?` }[field];
    const box = el('label', 'field');
    const input = el('input');
    Object.assign(input, { type: 'text', inputMode: 'decimal', autocomplete: 'off', enterKeyHint: 'next', id: `${field}-${index}`, placeholder: field === 'apr' ? '24.99' : field === 'balance' ? '4,200' : '35' });
    input.setAttribute('aria-label', question);
    if (card[field] !== undefined) input.value = String(card[field]);
    box.append(...(field === 'apr' ? [input, el('span', 'unit after', '%')] : [el('span', 'unit', '$'), input]));
    const error = el('p', 'error'); error.setAttribute('role', 'alert');
    const helpers = el('div', 'helpers');
    const estimate = () => Math.min(card.balance, Math.max(25, Math.round(card.balance * (card.apr || 0) / 1200 + card.balance * 0.01)));
    if (field === 'apr') helpers.append(chip('Not sure? Use 24%', '24'));
    if (field === 'minimum' && card.balance) helpers.append(chip(`Not sure? Use about $${estimate()}`, String(estimate())));
    function chip(label, value) {
      const button = el('button', 'chip', label); button.type = 'button';
      button.addEventListener('click', () => { input.value = value; submit(); });
      return button;
    }
    function submit() {
      const value = parse(input.value);
      const problem = !(value >= 0) || input.value.trim() === '' ? 'Enter a number. A close guess is fine.'
        : field === 'balance' && !(value > 0 && value <= 1000000) ? 'Enter the balance in dollars.'
        : field === 'apr' && value > 100 ? 'Enter the rate as a percent, like 24.99.'
        : field === 'minimum' && !(value > 0) ? 'Enter the minimum payment in dollars.'
        : field === 'minimum' && value > card.balance ? 'That’s more than the balance. Check the minimum payment.' : '';
      error.textContent = problem;
      if (problem) { input.focus(); return; }
      card[field] = value;
      if (field === 'minimum' && index === 0) reached('card-1');
      if (field === 'minimum' && last) reached('cards');
      advance();
    }
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } });
    input.addEventListener('input', () => { error.textContent = ''; });
    const total = quiz.cards.slice(0, quiz.count).reduce((sum, item) => sum + (item.balance || 0), 0);
    const nextText = field === 'balance' ? 'Next: its interest rate.' : field === 'apr' ? 'Next: its minimum payment.'
      : last ? 'Next: your debt-free date if you only pay the minimums.' : `Next: card ${index + 2}.`;
    screen.append(el('p', 'kicker', kicker), words('h1', 'q', question), box, error, helpers, go('Next', submit),
      el('p', 'hint', field === 'balance' ? 'It’s on your statement or in your card’s app. A close guess is fine.' : field === 'apr' ? 'It’s on your statement. You can change it later in your plan.' : 'It’s on your statement, next to the due date.'),
      ...(total && quiz.count > 1 ? [el('p', 'tally', `All your cards so far: ${money(total * 100)}`)] : []), next(nextText));
    return screen;
  }

  // 4. Their own date on minimums: the problem, in their numbers.
  function reveal() {
    const minimums = outcome(0).minimums;
    reached('reveal');
    const screen = el('section', 'reveal');
    if (minimums.months) {
      screen.append(el('p', 'kicker', 'If you only pay the minimums'), words('h1', 'q', 'You’d be debt-free in'), el('p', 'big', monthName(minimums.date)),
        el('p', 'sub', `That’s ${duration(minimums.months)} from now, with ${money(minimums.totalInterest)} paid in interest.`));
    } else {
      screen.append(el('p', 'kicker', 'If you only pay the minimums'), words('h1', 'q', 'These cards would never be paid off.'),
        el('p', 'sub', 'On at least one card the interest is bigger than the minimum, so the balance never goes down.'));
    }
    screen.append(chart([{ plan: minimums, className: 'slow' }]), go('Show me a faster way →', advance), next('Next: how much sooner it could be.'));
    return screen;
  }

  // 5. The moment it changes: every tap moves the date in front of them.
  function extra() {
    const screen = el('section', 'extra');
    const impact = el('div', 'impact'); impact.setAttribute('aria-live', 'polite');
    const graph = el('div', 'graph');
    const build = go('Build my plan →', () => { reached('extra'); advance(); }, quiz.extra === null);
    const chips = el('div', 'choices row');
    const other = el('input'); Object.assign(other, { type: 'text', inputMode: 'decimal', autocomplete: 'off', placeholder: 'Other', id: 'extra-other' });
    other.setAttribute('aria-label', 'Another amount each month');
    function paint() {
      if (quiz.extra === null) { impact.replaceChildren(el('strong', '', 'Tap an amount'), el('span', '', 'and watch your date move.')); graph.replaceChildren(chart([{ plan: outcome(0).minimums, className: 'slow' }])); return; }
      const result = outcome(quiz.extra), minimums = result.minimums, fastest = result.plans.find(plan => plan.key === result.fastest);
      graph.replaceChildren(chart([{ plan: minimums, className: 'slow' }, ...(fastest ? [{ plan: fastest, className: 'fast' }] : [])]));
      if (!fastest) { impact.replaceChildren(el('strong', '', 'Still not enough'), el('span', '', 'The interest outruns this amount. Try a bigger one.')); build.disabled = true; return; }
      build.disabled = false;
      const lead = quiz.extra === 0 ? 'Same money you pay now, used in the right order:' : `With ${money(quiz.extra * 100)} more a month:`;
      impact.replaceChildren(el('small', '', lead), ...(minimums.months
        ? [el('strong', '', `${duration(minimums.months - fastest.months)} sooner`), el('span', '', `and ${money(minimums.totalInterest - fastest.totalInterest)} less interest`)]
        : [el('strong', '', 'Paid off for good'), el('span', '', `in about ${duration(fastest.months)}, instead of never`)]));
      save();
    }
    for (const amount of [0, 50, 100, 200]) {
      const button = el('button', 'choice' + (quiz.extra === amount ? ' picked' : ''), amount ? `+$${amount}` : '$0'); button.type = 'button';
      button.addEventListener('click', () => { quiz.extra = amount; other.value = ''; chips.querySelectorAll('.choice').forEach(b => b.classList.toggle('picked', b === button)); paint(); });
      chips.append(button);
    }
    if (quiz.extra !== null && ![0, 50, 100, 200].includes(quiz.extra)) other.value = String(quiz.extra);
    other.addEventListener('input', () => {
      const value = parse(other.value);
      if (!(value >= 0)) return;
      quiz.extra = Math.min(value, 100000); chips.querySelectorAll('.choice').forEach(b => b.classList.remove('picked')); paint();
    });
    const otherBox = el('label', 'field small'); otherBox.append(el('span', 'unit', '+$'), other);
    screen.append(el('p', 'kicker', 'Here’s where it changes'), words('h1', 'q', 'What could you add each month, on top of the minimums?'),
      impact, graph, chips, otherBox, build, next('Next: your plan.'));
    paint();
    return screen;
  }

  // 6. What they've earned, and what the plan behind the order page holds.
  function plan() {
    const result = outcome(quiz.extra || 0), minimums = result.minimums, fastest = result.plans.find(item => item.key === result.fastest);
    reached('plan');
    const screen = el('section', 'plan');
    const headline = fastest && minimums.months ? `Your cards could be paid off ${duration(minimums.months - fastest.months)} sooner.`
      : fastest ? `Your cards could be paid off for good, in about ${duration(fastest.months)}.` : 'Your plan is ready.';
    const wins = el('ul', 'wins');
    for (const line of [fastest && minimums.months ? `${money(minimums.totalInterest - fastest.totalInterest)} less interest than paying minimums` : null,
      quiz.count === 1 ? 'A plan for your card, worked out to the month' : quiz.count === 2 ? 'A plan for both cards, worked out to the month' : `A plan for all ${quiz.count} cards, worked out to the month`, 'The exact order to pay them in'].filter(Boolean)) wins.append(el('li', '', line));
    const locked = el('div', 'locked');
    for (const [label, value] of [['Your debt-free date', '●●●●●●● 20●●'], ['Pay this card first', 'Card ●'], ['What to pay each month', '●●●●●']]) {
      const row = el('div', 'locked-row'); row.append(el('span', '', label), el('b', 'blurred', value)); locked.append(row);
    }
    const lock = el('p', 'lock', '🔒 Unlocks the moment you pay'); locked.append(lock);
    const offer = el('div', 'sales-offer'); offer.dataset.wording = 'today';
    const reg = el('p', 'offer-reg'); const s = el('s', '', '(Reg. price $375)'); s.dataset.offerAnchor = ''; reg.append(s);
    const today = el('p', 'offer-today'); const price = el('strong', '', 'Today: $33 (91% off)'); price.dataset.price = ''; const off = el('span'); off.dataset.off = ''; today.append(price, off);
    const saved = el('p', 'offer-saved'); saved.id = 'offer-saved'; saved.hidden = true;
    saved.append(el('span', '', 'That’s $5 (15%) off the $33 sale price. It’s saved for you for '), Object.assign(el('b', '', '30:00'), { id: 'offer-saved-clock' }), '.');
    offer.append(reg, today, saved);
    const unlock = el('a', 'go', 'Unlock My Plan →'); unlock.href = '/payoff/order';
    unlock.addEventListener('click', handOver);
    const proof = COMMENTS.map(([file, width, height, alt]) => {
      const image = new Image(); Object.assign(image, { src: `/payoff/assets/${file}`, width, height, alt, loading: 'lazy', decoding: 'async', className: 'proof' });
      return image;
    });
    screen.append(el('p', 'kicker', 'Your plan is ready'), words('h1', 'q', headline), wins, locked, offer, unlock,
      el('p', 'fine', 'One payment. Your plan opens right after you pay, with these cards already in it. 30-day money-back guarantee.'), ...proof);
    return screen;
  }
  const COMMENTS = [
    ['comment-nicole-58896e3927.webp', 748, 677, 'Facebook comment from Nicole: I typed in all my balances and it immediately showed me my payoff date and the plan that makes the most sense for me.'],
    ['comment-amanda-5fe641f7e2.webp', 748, 469, 'Facebook comment from Amanda: I bought this about a month ago and absolutely love it. I’ve already paid off two medical bills.'],
    ['comment-megan-070b24c8d2.webp', 748, 471, 'Facebook comment from Megan: I just put in my balances and payments and it showed me exactly what to do. I already paid off one smaller card.'],
    ['comment-tara-8c25b94a76.webp', 748, 456, 'Facebook comment from Tara: This has been so much easier than every debt spreadsheet I ever tried. I already knocked out one card.'],
    ['comment-heather-b27ecbf244.webp', 748, 521, 'Facebook comment from Heather: It showed me my plan, my next payoff, and how much faster I could be debt free if I paid a little extra.'],
  ];

  // The $5 checkout offer starts when they reach their plan (the order page
  // carries on with the same clock), and shows in the bar and under the price.
  let offer = null, offset = 0, ticking = null, base = 3300;
  const offerLeft = () => (offer && offer.discountCents > 0 ? offer.expiresAt - Date.now() - offset : 0);
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function paintOffer() {
    const ms = offerLeft(), active = ms > 0;
    $('offer-bar').hidden = !(active && document.body.dataset.step === 'plan');
    if (active) $('offer-bar-clock').textContent = clock(ms);
    const saved = $('offer-saved');
    if (saved) { saved.hidden = !active; if (active) $('offer-saved-clock').textContent = clock(ms); }
    const price = document.querySelector('.plan [data-price]');
    if (price && offer) price.textContent = window.PAYOFF_PRICE_LINES(active ? base - offer.discountCents : base).today[0];
    if (offer && !active && ticking) { clearInterval(ticking); ticking = null; }
  }
  function startOffer() {
    if (offer) return;
    fetch('/api/payoff/config?offer=1', { headers: track.headers || {} }).then(response => response.ok ? response.json() : null).then(config => {
      if (!config?.offer) return;
      offer = config.offer; base = config.priceCents || base;
      offset = Number.isFinite(config.serverNow) ? config.serverNow - Date.now() : 0;
      paintOffer();
      if (offerLeft() > 0) ticking = setInterval(paintOffer, 1000);
    }).catch(() => { /* The sale price stands. */ });
  }

  // The tool picks up the cards they typed (on this phone), unless it already has some.
  function handOver() {
    reached('unlock');
    try {
      const saved = JSON.parse(localStorage.getItem('payoff.v1') || 'null');
      if (!saved?.debts?.length) localStorage.setItem('payoff.v1', JSON.stringify({ debts: debts(), extra: Math.round((quiz.extra || 0) * 100), plan: null, seen: true }));
    } catch { /* The tool still works; they type the cards again. */ }
  }

  $('back').addEventListener('click', () => { if (quiz.at > 0) { quiz.at -= 1; show(-1); } });
  if (!E) { stage.append(el('p', 'next', 'Please reload the page.')); return; }
  if (quiz.at > 0 && !(quiz.count > 0)) quiz.at = 0;
  show(1);
})();
