'use strict';
(() => {
  const heading = document.getElementById('confirmation-heading');
  const status = document.getElementById('confirmation-status');
  const retry = document.getElementById('confirmation-retry');
  const details = document.getElementById('confirmation-details');
  const sessionId = new URLSearchParams(location.search).get('session_id');
  async function confirm() {
    retry.hidden = true;
    heading.textContent = 'Confirming your preorder…';
    try {
      const response = await fetch('/api/payoff/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      const result = await response.json();
      if (!response.ok || !result.paid) throw new Error(result.message || 'We could not confirm your payment yet.');
      heading.textContent = 'Your preorder is confirmed';
      status.textContent = result.emailSent ? 'Thank you. Your order confirmation has been emailed to your checkout address.' : 'Your payment is confirmed. The confirmation email is delayed; please keep your order reference.';
      details.replaceChildren();
      for (const text of [...result.items, 'Total paid: ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result.totalCents / 100), 'Order reference: ' + result.reference]) {
        const p = document.createElement('p'); p.textContent = text; details.append(p);
      }
      try { sessionStorage.removeItem('payoff.attempt'); sessionStorage.removeItem('payoff.addons'); } catch { /* Optional. */ }
    } catch (error) {
      heading.textContent = 'Payment confirmation is pending';
      status.textContent = (error.message || 'Please try again.') + ' If you were charged, do not pay again. Contact support@bookmarketel.com.';
      retry.hidden = false;
    }
  }
  retry.addEventListener('click', confirm);
  confirm();
})();
