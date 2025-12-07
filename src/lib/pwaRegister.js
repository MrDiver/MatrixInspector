/**
 * PWA Registration and Update Handling
 * Registers the service worker and notifies user of updates
 */

export async function registerPWA() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/MatrixInspector/sw.js', {
        scope: './'
      });

      console.log('Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // New SW activated, notify user
            console.log('New version available! Page will update on next visit.');
            // Optionally show a toast/notification to user
            if (window.__updateNotification) {
              window.__updateNotification();
            }
          }
        });
      });

      // Handle controller change (on page refresh after update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}
