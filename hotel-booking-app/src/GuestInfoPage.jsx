import React, { useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';

function GuestInfoPage({ bookingDetails, onBack, onComplete }) {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', address: '', city: '', state: '', zip: '',
    phone: '+1 ', email: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [autocomplete, setAutocomplete] = useState(null);

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

  const onLoad = (autoC) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const components = place.address_components;
      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';
      let zip = '';
      for (const component of components) {
        const types = component.types;
        if (types.includes('street_number')) streetNumber = component.long_name;
        if (types.includes('route')) route = component.long_name;
        if (types.includes('locality')) city = component.long_name;
        if (types.includes('administrative_area_level_1')) state = component.short_name;
        if (types.includes('postal_code')) zip = component.long_name;
      }
      setFormData(prev => ({
        ...prev,
        address: `${streetNumber} ${route}`.trim(),
        city: city,
        state: state,
        zip: zip,
      }));
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };
  
  const priceToday = bookingDetails.subtotal / 2;
  const balanceDue = (bookingDetails.subtotal / 2) + bookingDetails.taxes;

  return (
    <>
      <div className="static-banner">
        ✅ Free Cancellation up to <strong>7 days before</strong> arrival. 📞 Questions? Call (701) 289-5992 — we're happy to help!
      </div>
      <div className="container">
        <div className="guest-info-header">
          <button onClick={onBack} className="back-button">&lt; Back to Booking</button>
          <h1>Guest Information</h1>
          <p>Please provide your details to complete the booking.</p>
        </div>

        {/* --- FIXED: The summary card content is now restored --- */}
        <div className="info-summary">
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
                <p className="balance-due">Balance (${balanceDue.toFixed(2)}) When you arrive</p>
              </div>
            </div>
        </div>

        <form className="guest-info-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required/></div>
            <div className="form-field"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required/></div>
            <div className="form-field full-width">
              <label>Address</label>
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="Start typing your address..." />
              </Autocomplete>
            </div>
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
            <div className="stripe-area">Stripe Payment Gateway will be integrated here.</div>
            <button type="submit" className="btn btn-confirm" style={{width: '100%'}}>Complete Booking</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default GuestInfoPage;