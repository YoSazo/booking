'use strict';
// The Interest Cutter's words: the offer pages, the locked preview and the
// call scripts. DRAFT for Lauren to review and edit before launch. Scripts
// help people ask; they never promise what a card company will say.
window.PAYOFF_CUTTER = {
  name: 'Interest Cutter',
  prices: { regular: 14700, offer: 10700, discount: 4700 },
  offer: {
    progress: ['Order complete', 'Optional upgrade', 'Open your plan'],
    headline: 'WAIT! Your plan isn’t complete yet...',
    ready: 'Your Payoff plan is ready',
    gap: 'It shows you the fastest order to pay off your debt. But it can’t lower your interest rates. And that’s where most of your money is going.',
    question: 'The next question almost everyone has after seeing their date is: “Can I get the interest itself lowered?”',
    built: 'So we built the Interest Cutter.',
    benefits: [
      'Word-for-word call scripts to ask your card companies for a lower rate, a late-fee refund, or their hardship program',
      'See if a 0% balance transfer or a consolidation loan would actually save you money, after fees, before you switch',
      'Never miss when a 0% promo ends',
    ],
    // Worked out with PayoffEngine.compareLowerRate: $65,000 across five cards
    // and three loans, $1,350 a month, the two highest-rate cards moved to an
    // 18-month 0% card (3% fee, $20,000 limit, 24.99% after).
    example: {
      label: 'Example: $65,000 of debt, $1,350 a month',
      current: { title: 'Plan as it is', interest: '$54,228 interest', date: 'Debt-free 2034' },
      option: { title: 'With a 0% transfer on two cards', interest: '$31,518 interest + fees', date: 'Debt-free 2032' },
      saving: 'Saves $22,710 after fees',
      note: 'An example, not your numbers. Inside Payoff, the Interest Cutter runs your own debts.',
    },
    yes: 'YES! Add the Interest Cutter to my plan',
    oneClick: 'One click. No card to re-enter.',
    guarantee: 'Covered by the same 30-day money-back guarantee.',
    no: 'No thanks, I’ll keep paying full interest',
  },
  discount: {
    headline: 'I get it. Money’s tight right now.',
    lead: 'That’s exactly why you’re paying off debt. So here’s the Interest Cutter for less than half: one lowered rate could save you more than it costs.',
    yes: 'YES! Add it for 47',
    no: 'No thanks, take me to my plan',
  },
  locked: {
    title: 'Interest Cutter',
    lead: 'Your plan picks the order. This checks whether you can lower the rate itself.',
    yes: 'Get the Interest Cutter, $147',
  },
  disclaimer: 'Scripts are suggestions for your own calls. Card companies decide whether to lower a rate, refund a fee or offer a hardship program, and nothing here guarantees they will. Comparisons are estimates from the numbers you enter, before any credit check, and not financial advice.',
  scripts: [
    {
      id: 'rate',
      title: 'Ask for a lower interest rate',
      when: 'Best for a card you’ve had a while and paid on time.',
      lines: [
        'Hi, my name is [your name] and I’ve been a cardholder since [year]. I’m calling about my interest rate.',
        'I’m working on a plan to pay this card off, and my current APR is [your APR]. I’d like to ask whether you can lower it.',
        'I’ve received other offers with lower rates [only say this if it’s true], but I’d rather keep my account with you.',
        'What’s the lowest rate you can offer me today?',
        'If they say no: Thank you. Is there anyone else I could speak to, or a time I could call back when I might qualify?',
      ],
      log: ['Company', 'Date called', 'Who I spoke to', 'What they said', 'New APR'],
    },
    {
      id: 'fee',
      title: 'Ask for a late fee to be refunded',
      when: 'Best when the late payment was a one-off.',
      lines: [
        'Hi, I’m calling about a late fee of [amount] on my statement from [month].',
        'I’ve been a cardholder for [years] and I normally pay on time. This was a one-time slip because [short honest reason].',
        'Would you be able to refund that fee as a courtesy?',
        'If they say yes: Thank you. Could you confirm when I’ll see the credit on my account?',
      ],
      log: ['Company', 'Date called', 'Fee amount', 'Refunded?'],
    },
    {
      id: 'hardship',
      title: 'Ask about a hardship program',
      when: 'For a real change: a job loss, medical bills, a drop in income.',
      lines: [
        'Hi, I’m calling because [what changed: I lost hours at work / we had medical bills], and I want to keep paying what I owe.',
        'Do you have a hardship or payment-assistance program? I’d like to know what it offers.',
        'What would it do to my interest rate and my monthly payment, and for how long?',
        'Would it close my card or affect my credit report? Can you send me the terms in writing?',
      ],
      log: ['Company', 'Date called', 'Program offered', 'New rate', 'How long', 'Terms received?'],
    },
  ],
};
