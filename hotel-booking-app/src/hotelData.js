export const hotelData = {
  // --- First Hotel ---
  'guest-lodge-minot': {
    name: 'Guest Lodge Minot',
    subtitle: 'No Leases. No Background Checks. No Credit Checks. Just Simple Extended Living.',
    address: '1937 N Broadway, Minot, ND 58703',
    phone: '(701) 289-5992',
    pms: 'bookingcenter',
    propertyCode: 'Dont know yet',
    // NEW: Hotel-specific rates
    rates: {
      NIGHTLY: 59,
      WEEKLY: 250,
      MONTHLY: 950,
    },
    // NEW: Hotel-specific reviews
    reviews: [
      {
        text: "Best place to stay at in MINOT! They are renovating everything! I mean everything, Literally so clean and nice! Keep it up management and crew.",
        author: "Chico",
        location: "ND",
        rating: 5,
      },
      {
        text: "Front desk was helpful and the room was nice. The remodel looks awesome. Zuber was extremely friendly and accommodating. 10/10 would stay here again.",
        author: "Harbor Clooten",
        location: "ND",
        rating: 5,
      },
    ],
    rooms: [
      { id: 1, name: 'Deluxe Single King', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 3, imageUrl: '/KING-BED.jpg', imageUrls: [
            '/kingbedbart.jpg',
            'https://placehold.co/400x400/667280/ffffff?text=King+Bathroom',
            'https://placehold.co/400x400/7989a1/ffffff?text=Workstation',
        ] },

      


      { id: 2, name: 'Deluxe Double Queen', amenities: 'Free WiFi • 30" TV • Workstation • Fridge • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 4, imageUrl: '/QWEEN-BED.jpg', imageUrls: [
            '/kingbedbart.jpg',
            'https://placehold.co/400x400/667280/ffffff?text=King+Bathroom',
            'https://placehold.co/400x400/7989a1/ffffff?text=Workstation',
        ]  },
    ]
  },
  // --- Second Hotel (Example with different data) ---
  'home-place-suites': {
    name: 'Home Place Suites',
    subtitle: 'No Leases. No Background Checks. No Credit Checks. Just Simple Extended Living.',
    phone: '(918) 212-6296',
    address: '1410 SE Washington Blvd Suite 2, Bartlesville, OK 74006',
    pms: 'Cloudbeds',
    propertyCode: '113548817731712',
    rates: {
      NIGHTLY: 69,
      WEEKLY: 299,
      MONTHLY: 1099,
    },
    reviews: [
      {
        text: "Perfect for a Work Trip – Comfortable, Quiet, and Convenient I stayed at Home Place Suites for a work assignment and had a great experience. The room was spacious, clean, and very comfortable—perfect for an extended stay.",
        author: "Rachelle Soper",
        location: "OK",
        rating: 5,
      },
      {
        text: "Our reservation at home place suits was the best choice we could have made. After staying at Extended stay last weekend, I so wish I would have cancelled there and booked here.",
        author: "B Moody",
        location: "OK",
        rating: 5,
      },
    ],
    rooms: [
      { id: 1, name: 'Single King Room', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 4, imageUrls: [
            'kingbedbart.jpg',
            'IMG_4300.jpg',
            'IMG_4325.jpg',
        ] },
      { id: 2, name: 'Double Queen Room', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 7, imageUrls: [
            'twoqueenbart.jpg',
            'IMG_4300.jpg',
            'IMG_4325.jpg',
        ] },
    ]
  },

// --- Second Hotel (Example with different data) ---
  'suite-inn': {
    name: 'Suite Inn',
    subtitle: 'No Leases. No Background Checks. No Credit Checks. Just Simple Extended Living.',
    phone: '(605) 388-0959',
    address: '2520 Tower Rd, Rapid City, SD 57701',
    pms: 'bookingcenter',
    propertyCode: 'Dont know yet',
    rates: {
      NIGHTLY: 69,
      WEEKLY: 350,
      MONTHLY: 950,
    },
    reviews: [
      {
        text: "Very impressed with the new ownership! They removed all the old beds & old furniture and now it is a gorgeous hotel!",
        author: "Kim D",
        location: "SD",
        rating: 5,
      },
      {
        text: "Me and my kids stayed here several weeks And I have to say it's such a beautiful change. I wouldn't have stayed if it was how I remembered it. It has an elegant look and with a full size fridge and 3 in 1 oven and good size tv. I was very pleased especially with the gm being understanding. Highly recommend it if you on a budget and can't afford a deposit. Friendly staff :)",
        author: "Lariah High Hawk",
        location: "SD",
        rating: 5,
      },
    ],
    rooms: [
      { id: 1, name: 'Single King Room', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 4, imageUrl: 'doublequeenrapid.jpg', imageUrls: [
            '/kingbedbart.jpg',
            'https://placehold.co/400x400/667280/ffffff?text=King+Bathroom',
            'https://placehold.co/400x400/7989a1/ffffff?text=Workstation',
        ] },
      { id: 2, name: 'Double Queen Room', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 7, imageUrl: 'singlekingrapid.jpg', imageUrls: [
            '/kingbedbart.jpg',
            'https://placehold.co/400x400/667280/ffffff?text=King+Bathroom',
            'https://placehold.co/400x400/7989a1/ffffff?text=Workstation',
        ] },
    ]
  },



};

