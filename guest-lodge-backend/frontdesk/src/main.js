import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './styles/core.css';
import { bindFormKeyboardViewport, enableNativeKeyboardAccessoryBar } from './formKeyboard.js';
import './core.js';

enableNativeKeyboardAccessoryBar();
bindFormKeyboardViewport();

// The HTML boot guard uses this signal to distinguish a slow property lookup
// from a JavaScript bundle that failed during a rolling deployment.
window.__MARKETEL_FRONTDESK_BUNDLE_READY__ = true;
window.dispatchEvent(new Event('marketel:frontdesk-bundle-ready'));
