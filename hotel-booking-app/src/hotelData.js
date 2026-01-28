export const hotelData = {
  // --- First Hotel ---
  'guest-lodge-minot': {
    name: 'Guest Lodge Minot',
    url: 'https://www.myhomeplacesuites.com',
    subtitle: 'No Deposits. No Leases. No Credit Checks. Just Simple Extended Living.',
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
    url: 'https://www.myhomeplacesuites.com',
    subtitle: 'No Deposits. No Leases. No Credit Checks. Just Simple Extended Living.',
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
        text: "Home Place Suites was a lifesaver. No credit checks, no deposit, and I was able to stay for months just renewing—no hassle. For anyone struggling with housing barriers, this place is unreal.",
        author: "Hanson M.",
        location: "OK",
        rating: 5,
      },
      {
        text: "Perfect for a Work Trip – Comfortable, Quiet, and Convenient I stayed at Home Place Suites for a work assignment and had a great experience. The room was spacious, clean, and very comfortable—perfect for an extended stay.",
        author: "Rachelle Soper",
        location: "OK",
        rating: 5,
      },
    ],
    rooms: [
      { id: 1, name: 'Single King Room', roomTypeID: '117057244229790', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 4, imageUrls: [
            'kingbedbart.jpg',
            'Bed-high.jpg',
            'IMG_4300.jpg',
            'TV.jpg',
            'toilet.jpg',
            'IMG_4325.jpg',
            'reception.jpg',
            'Pool.jpg',
            'hallway.jpg',
            'lobby2.jpg',
            'vend.jpg',
            'Outside.jpg',
            'Lobby.jpg',
            'bathroomamen.jpg',
        ] },
      { id: 2, name: 'Double Queen Room', roomTypeID: '116355544711397', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 7, imageUrls: [
            'twoqueenbart.jpg',
            'IMG_4300.jpg',
            'TV.jpg',
            'toilet.jpg',
            'IMG_4325.jpg',
            'hallway.jpg',
            'reception.jpg',
            'lobby2.jpg',
            'vend.jpg',
            'Pool.jpg',
            'Outside.jpg',
            'Lobby.jpg',
            'bathroomamen.jpg',
        ] },

      { id: 3, name: 'Double Queen Suite With Kitchenette', roomTypeID: '117068633694351', amenities: 'Free WiFi • 30" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two queen beds and a Kitchenette, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 7, imageUrls: [
            'double-kitchen.jpeg',
            'Kitchen-front-view.jpg',
            'kitchen.jpeg',
            'TV.jpg',
            'toilet.jpg',
            'IMG_4300.jpg',
            'hallway.jpg',
            'IMG_4325.jpg',
            'reception.jpg',
            'Pool.jpg',
            'lobby2.jpg',
            'vend.jpg',
            'Outside.jpg',
            'Lobby.jpg',
            'bathroomamen.jpg',
        ] },
    ]
  },


  // --- St. Croix, WI ---
  'st-croix-wisconsin': {
    name: 'St Croix Falls',
    url: 'https://stcroix.clickinns.com',
    subtitle: 'No Deposits. No Leases. No Credit Checks. Just Simple Extended Living.',
    phone: '715-204-9757',
    address: '726 S Vincent St, St Croix Falls, WI 54024',
    pms: 'bookingcenter',
    propertyCode: 'TBD',
    rates: {
      NIGHTLY: 69,
      WEEKLY: 299,
      MONTHLY: 999,
    },
    // Reviews currently not displayed in UI, keeping empty for now
    reviews: [],
    // Temporary images copied from Suite Stay – replace later
    rooms: [
      {
        id: 1,
        name: 'King Room',
        amenities: 'Free WiFi • 60" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping',
        description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.',
        maxOccupancy: 3,
        imageUrl: 'kingbedsuitestay.JPG',
        imageUrls: [
          'kingbedsuitestay.JPG',
          'doublesuitestay2.JPG',
          'doublesuitestay3.JPG',
          'suitestaybathroom.jpg',
          'sinksuitestay.JPG',
          'tvsuitestay.JPG',
          'workspacesuitestay.JPG',
          'suitestayoutside.jpeg',
          'suitestayreception.jpeg',
        ],
      },
      {
        id: 2,
        name: 'Double Full Bed',
        amenities: 'Free WiFi • 60" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping',
        description: 'Fully furnished with two full-size beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.',
        maxOccupancy: 4,
        imageUrl: 'doublesuitestay.JPG',
        imageUrls: [
          'doublesuitestay.JPG',
          'doublesuitestay2.JPG',
          'doublesuitestay3.JPG',
          'suitestaybathroom.jpg',
          'sinksuitestay.JPG',
          'tvsuitestay.JPG',
          'workspacesuitestay.JPG',
          'suitestayoutside.jpeg',
          'suitestayreception.jpeg',
        ],
      },
    ],
  },

  // --- Suite Stay (Talladega, AL) ---
  'suite-stay': {
    name: 'Suite Stay',
    url: 'clickinns.com',
    subtitle: 'No Deposits. No Leases. No Credit Checks. Just Simple Extended Living.',
    phone: '256-207-8086',
    address: '65600 AL-77, Talladega, AL 35160',
    pms: 'Cloudbeds',
    propertyCode: 'Dont know yet',
    rates: {
      NIGHTLY: 69,
      WEEKLY: 299,
      MONTHLY: 999,
    },
    reviews: [
      {
        text: "The Suite Stay was a lifesaver. No credit checks, no deposit, and I was able to stay for months just renewing—no hassle. For anyone struggling with housing barriers, this place is unreal.",
        author: "Kim D",
        location: "AL",
        rating: 5,
      },
      {
        text: "Perfect for a Work Trip – Comfortable, Quiet, and Convenient I stayed at the Suite Stay for a work assignment and had a great experience. The room was spacious, clean, and very comfortable—perfect for an extended stay.",
        author: "Lariah High Hawk",
        location: "AL",
        rating: 5,
      },
    ],
    rooms: [
      { id: 1, name: 'King Room', amenities: 'Free WiFi • 60" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'A spacious, fully furnished room with a king-sized bed, no utility fees, and everything you need to move in today. Enjoy weekly housekeeping and free parking.', maxOccupancy: 3, imageUrl: 'kingbedsuitestay.JPG', imageUrls: [
            'kingbedsuitestay.JPG',
            'doublesuitestay2.JPG',
            'doublesuitestay3.JPG',
            'suitestaybathroom.jpg',
            'sinksuitestay.JPG',
            'tvsuitestay.JPG',
            'workspacesuitestay.JPG',
            'suitestayoutside.jpeg',
            'suitestayreception.jpeg',
        ] },
      { id: 2, name: 'Double Full Bed', amenities: 'Free WiFi • 60" TV • Fridge • Workstation • Bath • Free Parking • Weekly Housekeeping', description: 'Fully furnished with two full-size beds, no utility fees, and ready to move in. Includes a workstation, Wi-Fi, and weekly housekeeping.', maxOccupancy: 4, imageUrl: 'doublesuitestay.JPG', imageUrls: [
            'doublesuitestay.JPG',
            'doublesuitestay2.JPG',
            'doublesuitestay3.JPG',
            'suitestaybathroom.jpg',
            'sinksuitestay.JPG',
            'tvsuitestay.JPG',
            'workspacesuitestay.JPG',
            'suitestayoutside.jpeg',
            'suitestayreception.jpeg',
        ] },
    ]
  },



};

