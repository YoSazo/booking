import React, { useState } from 'react';

function GuestInfoPage({ bookingDetails, onBack, onComplete }) {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', address: '', city: '', state: '', zip: '',
    phone: '+1 ', email: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith('+1 ')) { value = '+1 '; }
    setFormData(prev => ({ ...prev, phone: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      errors.phone = 'Phone number must be 10 digits.';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      onComplete(formData);
    }
  };
  
  const priceToday = bookingDetails.subtotal / 2;
  const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;

  return (
    <div className="container">
      <div className="guest-info-header">
        <button onClick={onBack} className="back-button">&lt; Back to Booking</button>
        <h1>Guest Information</h1>
        <p>Please confirm your details to complete the booking.</p>
      </div>

      {/* --- NEW: The full booking summary is now displayed at the top of this page --- */}
      <div className="info-summary" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          <div className="summary-card-details">
            <p className="detail-line">{bookingDetails.name}</p>
            <p className="detail-line">{bookingDetails.guests} {bookingDetails.guests > 1 ? 'Guests' : 'Guest'}</p>
            <p className="detail-line">{bookingDetails.pets} {bookingDetails.pets === 1 ? 'Pet' : 'Pets'}</p>
          </div>
          <div className="summary-card-price">
            <p className="price-line"><strong>{bookingDetails.nights}</strong> Nights</p>
            <p className="price-line">Subtotal: <strong>${bookingDetails.subtotal.toFixed(2)}</strong></p>
            <p className="price-line">Taxes & Fees: <strong>${bookingDetails.taxes.toFixed(2)}</strong></p>
            <div className="total-breakdown">
              <p className="pay-today">Only Pay ${priceToday.toFixed(2)} Today</p>
              <p className="balance-due">Balance (${balanceDue.toFixed(2)} USD) When you arrive</p>
            </div>
          </div>
      </div>

      <form className="guest-info-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required/></div>
          <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required/></div>
          <div className="form-field full-width"><label>Address</label><input type="text" name="address" value={formData.address} onChange={handleChange} required/></div>
          <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} required/></div>
          <div className="form-field"><label>State / Province</label><input type="text" name="state" value={formData.state} onChange={handleChange} required/></div>
          <div className="form-field"><label>Zip / Postal Code</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} required/></div>
          <div className="form-field"><label>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} />
            {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
          </div>
          <div className="form-field full-width"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} required/></div>
        </div>
        <div className="payment-placeholder">
          <h3>Payment Information</h3>
          <div className="stripe-area">Stripe goes here</div>
          <button type="submit" className="btn btn-confirm" style={{width: '100%'}}>Complete Booking</button>
        </div>
      </form>
    </div>
  );
}

export default GuestInfoPage;