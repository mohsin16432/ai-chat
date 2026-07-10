import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Detect if running inside an Android/iOS WebView container
const isNativeWebView = window.location.protocol === 'file:' || navigator.userAgent.includes('Capacitor');

if (isNativeWebView) {
  // Inject helper class to the root HTML node for native safe area paddings
  document.documentElement.classList.add('native-app');
}

// Register Service Worker on the web only
if ('serviceWorker' in navigator && !isNativeWebView) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const base = import.meta.env.BASE_URL || '/ai-chat/';
      const swPath = `${base}sw.js`.replace(/\/+/g, '/');
      
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('PWA ServiceWorker registered with scope:', registration.scope);
          registration.update();

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('🔄 New PWA update downloaded. Refreshing...');
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

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  } else {
    // Clear stuck local service workers during web development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('🧹 Stuck local Service Worker cleared.');
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