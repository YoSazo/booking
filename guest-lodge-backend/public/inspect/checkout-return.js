// Checkout, a cancelled checkout and the billing portal all return here, so the
// page says which one happened. Without this script it still reads correctly.
const copy = {
  success: ['Payment received.', 'Go back to Marketel to carry on. Your access is ready there.'],
  cancelled: ['Nothing was charged.', 'Go back to Marketel whenever you are ready.'],
  billing: ['All done here.', 'Go back to Marketel to carry on. Any change you made shows there.'],
}[new URLSearchParams(location.search).get('status')];
if (copy) {
  document.getElementById('return-title').textContent = copy[0];
  document.getElementById('return-lede').textContent = copy[1];
}
