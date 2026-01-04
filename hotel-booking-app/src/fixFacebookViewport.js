// Fix Facebook in-app browser viewport height bug
function fixFacebookViewport() {
  // Only run in Facebook/Instagram in-app browsers
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isFBBrowser = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1);
  
  if (!isFBBrowser) {
    console.log('Not Facebook browser, skipping viewport fix');
    return;
  }
  
  console.log('Facebook/Instagram browser detected - applying viewport fix');
  
  // Force correct viewport height
  const setHeight = () => {
    // Use screen.height instead of window.innerHeight (which is wrong in FB browser)
    const correctHeight = Math.min(window.innerHeight, screen.height);
    document.documentElement.style.setProperty('--real-vh', `${correctHeight * 0.01}px`);
    console.log(`Set --real-vh to ${correctHeight * 0.01}px`);
  };
  
  setHeight();
  window.addEventListener('resize', setHeight);
  window.addEventListener('orientationchange', setHeight);
}

// Run on page load
fixFacebookViewport();
