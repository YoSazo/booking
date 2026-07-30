import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './fixFacebookViewport.js'; // Fix Facebook in-app browser viewport bug

const ownerPreview = new URLSearchParams(window.location.search).has('preview') || window !== window.parent;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {!ownerPreview && <Analytics />}
    </BrowserRouter>
  </React.StrictMode>,
);
