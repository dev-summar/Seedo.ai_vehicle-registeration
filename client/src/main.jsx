import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import App from './App';
import './index.css';

// Favicon from env (same as PI-360 icon so one env var can control both)
const faviconUrl = import.meta.env.VITE_PI360_ICON_URL || import.meta.env.VITE_FAVICON_URL || 'https://pi360.net/pi360_website/wordpress/wp-content/uploads/2025/12/icon-pi360.png';
const link = document.querySelector('link[rel="icon"]');
if (link && faviconUrl) link.href = faviconUrl;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
