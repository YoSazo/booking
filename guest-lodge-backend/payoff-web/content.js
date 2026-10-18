// Rating/count, founder history and supplied proof are source-marked mockups.
// Public hostnames display disclosures; these are not verified customer claims.
window.PAYOFF_CONTENT = {
  localMockup: true,
  product: 'Marketel Payoff',
  priceCents: 3300,
  currency: 'USD',
  rating: {
    stars: 5,
    label: 'Join 10,000+ people',
    description: 'using Marketel Payoff to turn their balances into a clear plan for paying off debt.',
    mockup: true,
  },
  proof: {
    early: [
      { src: '/payoff/assets/testimony-alexis-hannah.png', alt: 'Supplied comment mockup showing Alexis and Hannah', mockup: true },
      { src: '/payoff/assets/email-to-lauren.png', alt: 'Supplied email mockup from Jeanne addressed to Lauren', mockup: true },
    ],
    problem: [
      { src: '/payoff/assets/testimony-heather.png', alt: 'Supplied comment mockup attributed to Heather', mockup: true },
      { src: '/payoff/assets/testimony-brittany.png', alt: 'Supplied comment mockup attributed to Brittany', mockup: true },
    ],
    example: [
      { src: '/payoff/assets/testimony-barbara.png', alt: 'Supplied comment mockup attributed to Barbara', mockup: true },
      { src: '/payoff/assets/testimony-lindsay.png', alt: 'Supplied comment mockup attributed to Lindsay', mockup: true },
      { src: '/payoff/assets/testimony-amanda.png', alt: 'Supplied comment mockup attributed to Amanda', mockup: true },
      { src: '/payoff/assets/testimony-tara.png', alt: 'Supplied comment mockup attributed to Tara', mockup: true },
    ],
    main: [
      { src: '/payoff/assets/testimony-nicole.png', alt: 'Supplied comment mockup attributed to Nicole', mockup: true },
      { src: '/payoff/assets/testimony-megan.png', alt: 'Supplied comment mockup attributed to Megan', mockup: true },
      { src: '/payoff/assets/testimony-rachel.png', alt: 'Supplied email mockup attributed to Rachel and addressed to Lauren', mockup: true },
      { src: '/payoff/assets/testimony-dana.png', alt: 'Supplied email mockup attributed to Dana and addressed to Lauren', mockup: true },
      { src: '/payoff/assets/testimony-melissa.png', alt: 'Supplied email mockup attributed to Melissa and addressed to Lauren', mockup: true },
      { src: '/payoff/assets/testimony-sandy.png', alt: 'Supplied email mockup attributed to Sandy and addressed to Lauren', mockup: true },
      null,
    ],
  }, // Each non-null entry: { src: '/payoff/assets/review.jpg', alt: 'Description', caption: '' }
  founder: {
    heading: 'Meet Lauren, A Mom Who Gets It',
    // Faithful text extraction from the supplied image, not independently
    // verified founder history. Local design material, not publication-ready.
    mockup: true,
    paragraphs: [
      'I’m a mom who knows what it feels like to stare at numbers and feel completely overwhelmed.',
      'I wanted a real plan to pay off debt, but I hated spreadsheets. They felt confusing, cold, and way too easy to mess up.',
      'What I really needed was something simpler — a tool that could do the math for me, show me my payoff timeline, and help me test different payment options without starting over.',
      'So I built software that turns debt payoff into a clear step-by-step plan. Enter your debts once, see your options right away, and watch how small changes can move your payoff date faster.',
      'It’s everything I wish I had back when I was stressed, avoiding my balances, and trying to figure it all out alone.',
      'Now it helps families organize their debt, compare strategies, and finally feel like becoming debt-free is actually possible.',
      'My mission is simple: make debt payoff feel less overwhelming, less spreadsheet-heavy, and a lot more doable.',
      'I’d be honored to help you too.',
    ],
    image: '/payoff/assets/lauren-portrait.png',
    imageAlt: 'Portrait supplied for the Lauren founder-layout mockup',
    caption: 'Supplied founder portrait mockup',
  },
  productImage: null, // { src, alt }; fallback is explicitly an interface illustration.
  refundPolicy: null, // Publish only a policy the owner approves and can honor.
  addOns: [
    { id: 'cashflow', name: 'Cash-flow calendar', priceCents: 2200 },
    { id: 'reset', name: 'Spending reset', priceCents: 900 },
  ],
};
