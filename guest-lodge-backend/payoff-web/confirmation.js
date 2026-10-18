'use strict';
// Orders that returned here (earlier checkouts) open the tool like new ones.
(() => {
  const heading = document.getElementById('confirmation-heading');
  const status = document.getElementById('confirmation-status');
  const retry = document.getElementById('confirmation-retry');
  const open = document.getElementById('confirmation-open');
  const sessionId = new URLSearchParams(location.search).get('session_id');
  async function confirm() {
    retry.hidden = true;
    heading.textContent = 'Confirming your order…';
    try {
      const response = await fetch('/api/payoff/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      const result = await response.json();
      if (!response.ok || !result.paid) throw new Error(result.message || 'We could not confirm your payment yet.');
      try { localStorage.setItem('payoff.access', result.access); sessionStorage.removeItem('payoff.attempt'); } catch { /* The link carries access. */ }
      heading.textContent = 'Your payment is confirmed';
      status.textContent = 'Opening your plan…';
      open.href = '/payoff/app?access=' + encodeURIComponent(result.access);
      open.hidden = false;
      location.replace(open.href);
    } catch (error) {
      heading.textContent = 'Payment confirmation is pending';
      status.textContent = (error.message || 'Please try again.') + ' If you were charged, do not pay again. Contact support@bookmarketel.com.';
      retry.hidden = false;
    }
  }
  retry.addEventListener('click', confirm);
  confirm();
})();
