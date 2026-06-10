import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './fixFacebookViewport.js'; // Fix Facebook in-app browser viewport bug
import { GuestProvider } from './GuestProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <GuestProvider>
        <App />
        <Analytics />
      </GuestProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
