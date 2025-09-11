export const hotelData = {
  // --- First Hotel ---
  'guest-lodge-minot': {
    name: 'Guest Lodge Minot',
    subtitle: 'No Leases. No Background Checks. No Credit Checks.',
    phone: '(701) 289-5992',
    rooms: [
      { id: 1, name: 'Deluxe Single King', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 3, imageUrl: '/KING-BED.jpg' },
      { id: 2, name: 'Deluxe Double Queen', amenities: 'Free WiFi • 30" TV • Workstation • Fridge • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 4, imageUrl: '/QWEEN-BED.jpg' },
    ]
  },
  // --- Second Hotel (Example) ---
  'prairie-suites-bismarck': {
    name: 'Prairie Suites Bismarck',
    subtitle: 'Your Home on the Prairie. Extended Stays Welcome.',
    phone: '(701) 555-1234',
    rooms: [
      { id: 1, name: 'Studio Suite', amenities: 'Free WiFi • Kitchenette • Free Parking', description: 'A cozy studio perfect for long-term stays, featuring a handy kitchenette.', maxOccupancy: 2, imageUrl: '/STUDIO-SUITE.jpg' },
      { id: 2, name: 'Family Apartment', amenities: 'Two Bedrooms • Full Kitchen • Weekly Housekeeping', description: 'Our largest unit, perfect for families or crews, with a full kitchen and separate living area.', maxOccupancy: 6, imageUrl: '/FAMILY-APP.jpg' },
    ]
  },
  // You can add a third, fourth, etc., hotel here in the future
};