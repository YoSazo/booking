/**
 * Get hotel ID based on the current URL/domain
 * This allows a single deployment to serve multiple hotels
 */

// Map domains/subdomains to hotel IDs
const domainMap = {
  // Production domains
  'suitestay.clickinns.com': 'suite-stay',
  'clickinns.com': 'suite-stay',
  'www.clickinns.com': 'suite-stay',
  
  // St. Croix (add actual domain when ready)
  'stcroix.clickinns.com': 'st-croix-wisconsin',
  
  // Home Place Suites
  'homeplacesuites.clickinns.com': 'home-place-suites',
  'myhomeplacesuites.com': 'home-place-suites',
  'www.myhomeplacesuites.com': 'home-place-suites',
  
  // Guest Lodge Minot
  'guestlodgeminot.clickinns.com': 'guest-lodge-minot',
  
  // Local development - default to suite-stay
  'localhost': 'suite-stay',
  '127.0.0.1': 'suite-stay',
};

// You can also use path-based routing if preferred
// e.g., clickinns.com/suite-stay, clickinns.com/home-place-suites
const pathMap = {
  '/suite-stay': 'suite-stay',
  '/home-place-suites': 'home-place-suites',
  '/guest-lodge-minot': 'guest-lodge-minot',
  '/st-croix-wisconsin': 'st-croix-wisconsin',
};

/**
 * Determines the hotel ID from the current URL
 * Priority: 1) URL path, 2) Domain/subdomain, 3) Env var fallback, 4) Default
 */
export function getHotelId() {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_HOTEL_ID || 'suite-stay';
  }

  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // First, check path-based routing (e.g., /suite-stay/...)
  for (const [path, hotelId] of Object.entries(pathMap)) {
    if (pathname.startsWith(path)) {
      return hotelId;
    }
  }

  // Then, check domain-based routing
  if (domainMap[hostname]) {
    return domainMap[hostname];
  }

  // Check for ngrok or other dev tunnels - use env var
  if (hostname.includes('ngrok') || hostname.includes('vercel.app')) {
    return import.meta.env.VITE_HOTEL_ID || 'suite-stay';
  }

  // Fallback to env var or default
  return import.meta.env.VITE_HOTEL_ID || 'suite-stay';
}

/**
 * Add a new domain mapping at runtime (useful for testing)
 */
export function addDomainMapping(domain, hotelId) {
  domainMap[domain] = hotelId;
}

/**
 * Get all configured domains for a hotel
 */
export function getDomainsForHotel(hotelId) {
  return Object.entries(domainMap)
    .filter(([_, id]) => id === hotelId)
    .map(([domain]) => domain);
}

export default getHotelId;
