// Testimonials and founder content confirmed genuine by the owner.
window.PAYOFF_CONTENT = {
  product: 'Marketel Payoff',
  priceCents: 3300,
  currency: 'USD',
  purchaseNotices: [
    { id: 'nicole-20261019', name: 'Nicole', city: 'Bentley, Kansas', purchasedAt: '2026-10-19T15:04:45Z' },
    { id: 'megan-20261019', name: 'Megan', city: 'Westport, New York', purchasedAt: '2026-10-19T16:44:45Z' },
    { id: 'rachel-20261019', name: 'Rachel', city: 'Woodland, Minnesota', purchasedAt: '2026-10-19T14:04:45Z' },
  ],
  rating: {
    stars: 5,
    label: 'Join 10,000+ people',
    description: 'using Marketel Payoff to turn their balances into a clear plan for paying off debt.',
  },
  proof: {
    early: [
      { src: '/payoff/assets/testimony-alexis-hannah.png', width: 1122, height: 1402, alt: 'Testimonials from Alexis and Hannah' },
      { src: '/payoff/assets/email-to-lauren.png', width: 1122, height: 1402, alt: 'Email from Jeanne to Lauren' },
    ],
    problem: [
      { src: '/payoff/assets/testimony-heather.png', width: 1448, height: 1086, alt: 'Testimonial from Heather' },
      { src: '/payoff/assets/testimony-brittany.png', width: 1448, height: 1086, alt: 'Testimonial from Brittany' },
    ],
    example: [
      { src: '/payoff/assets/testimony-barbara.png', width: 1122, height: 1402, alt: 'Testimonial from Barbara' },
      { src: '/payoff/assets/testimony-lindsay.png', width: 1448, height: 1086, alt: 'Testimonial from Lindsay' },
      { src: '/payoff/assets/testimony-amanda.png', width: 1448, height: 1086, alt: 'Testimonial from Amanda' },
      { src: '/payoff/assets/testimony-tara.png', width: 1448, height: 1086, alt: 'Testimonial from Tara' },
    ],
    main: [
      { src: '/payoff/assets/testimony-nicole.png', width: 1122, height: 1402, alt: 'Testimonial from Nicole' },
      { src: '/payoff/assets/testimony-megan.png', width: 1448, height: 1086, alt: 'Testimonial from Megan' },
      { src: '/payoff/assets/testimony-rachel.png', width: 1122, height: 1402, alt: 'Email from Rachel to Lauren' },
      { src: '/payoff/assets/testimony-dana.png', width: 1122, height: 1402, alt: 'Email from Dana to Lauren' },
      { src: '/payoff/assets/testimony-melissa.png', width: 1122, height: 1402, alt: 'Email from Melissa to Lauren' },
      { src: '/payoff/assets/testimony-sandy.png', width: 1122, height: 1402, alt: 'Email from Sandy to Lauren' },
      null,
    ],
  }, // Each non-null entry: { src: '/payoff/assets/review.jpg', alt: 'Description', caption: '' }
  founder: {
    heading: 'Meet Lauren, A Mom Who Gets It',
    // Biography transcribed from the owner’s image.
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
    imageAlt: 'Lauren, founder of Marketel Payoff',
    caption: '',
  },
  productImage: { src: '/payoff/assets/tool-result.jpg', alt: 'Marketel Payoff showing a debt-free date and five plans compared', caption: 'The real app, with the example numbers above' },
  refundPolicy: null, // Publish only a policy the owner approves and can honor.
  addOns: [
    { id: 'cashflow', name: 'Cash-flow calendar', priceCents: 2200 },
    { id: 'reset', name: 'Spending reset', priceCents: 900 },
  ],
};
