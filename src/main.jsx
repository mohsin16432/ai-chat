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
        })
        .catch((error) => {
          console.warn('PWA ServiceWorker registration failed:', error);
        });
    });
  } else {
    // FIX: Automatically find and unregister any stuck service workers on localhost
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('🧹 Stuck local Service Worker detected and cleared.');
            // Force reload the page once to clear intercepted route caches
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