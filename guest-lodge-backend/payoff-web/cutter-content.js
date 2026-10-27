'use strict';
// The call scripts in the Coach's lower-rate tools (they were the Interest
// Cutter), and the note under them. DRAFT for Lauren to review and edit.
// Scripts help people ask; they never promise what a card company will say.
window.PAYOFF_CUTTER = {
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
