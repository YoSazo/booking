import React, { useState } from 'react';

// You can easily change your questions and answers here
const faqs = [
  {
    question: 'What’s included in the price?',
    answer: 'Utilities, Wi-Fi, furniture, housekeeping, and parking—no extra fees.'
  },
  {
    question: 'Is housekeeping really included?',
    answer: 'Yes! Your room is cleaned weekly at no extra cost.'
  },
  {
    question: 'How long can I stay?',
    answer: 'Stay as long as you like—renew monthly at the front desk.'
  },
];

function HelpWidget({ phone }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  if (!isOpen) {
    return (
      <div className="help-widget-container">
        <button className="help-widget-pill" onClick={() => setIsOpen(true)}>
          Need help?
        </button>
      </div>
    );
  }

  return (
    <div className="help-widget-container">
      <div className="help-widget-panel">
        <div className="faq-header">
          <h3>Frequently Asked Questions</h3>
          <button className="faq-close-btn" onClick={() => setIsOpen(false)}>&times;</button>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button className="faq-question" onClick={() => toggleAccordion(index)}>
                {faq.question}
                <span className={activeIndex === index ? 'indicator open' : 'indicator'}>+</span>
              </button>
              <div className={activeIndex === index ? 'faq-answer open' : 'faq-answer'}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="faq-footer">
           <p>Questions? Call us → {phone}</p>
        </div>
      </div>
    </div>
  );
}

export default HelpWidget;