import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker in production only to avoid local dev caching
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const base = import.meta.env.BASE_URL || '/ai-chat/';
      const swPath = `${base}sw.js`.replace(/\/+/g, '/');
      
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('PWA ServiceWorker registered with scope:', registration.scope);

          // Force update check on load
          registration.update();

          // Listen for new service worker installation
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New update available! Refresh to apply
                    console.log('🔄 New PWA update downloaded. Refreshing application...');
                    window.location.reload();
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('PWA ServiceWorker registration failed:', error);
        });
    });

    // Ensure state transitions trigger reloading
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  } else {
    // Automatically find and unregister any stuck service workers on localhost
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('🧹 Stuck local Service Worker detected and cleared.');
            window.location.reload();
          }
        });
      }
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)