/**
 * Service Worker Registration Script
 * Registers the service worker with the correct scope for GitHub Pages subpath
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        '/MatrixInspector/sw.js',
        {
          scope: '/MatrixInspector/'
        }
      );
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}
