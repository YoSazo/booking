import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './fixFacebookViewport.js'; // Fix Facebook in-app browser viewport bug
import { isNativeGuestelContext } from './nativeGuestelContext.js';

const ownerPreview = new URLSearchParams(window.location.search).has('preview') || window !== window.parent;
const websiteAnalyticsEnabled = !ownerPreview && !isNativeGuestelContext();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {websiteAnalyticsEnabled && <Analytics />}
    </BrowserRouter>
  </React.StrictMode>,
);
