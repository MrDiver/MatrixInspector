// Theme-aware favicon updater
import { selectedTheme } from './themeStore';

const themeColors = {
  light: ['#667eea', '#a8edea', '#f093fb', '#fa709a'],      // Aurora Light
  dark: ['#7dd3fc', '#c084fc', '#f472b6', '#f97316'],         // Midnight
  sunset: ['#ff9a9e', '#f8cdda', '#ff6a88', '#fbc2eb'],       // Sunset Neon
  ocean: ['#5b86e5', '#a2facf', '#8fd3f4', '#5ee7df'],        // Oceanic
  cyber: ['#00f5a0', '#ff79c6', '#0047ff', '#50fa7b']         // Cyber Lime
};

export function updateFavicon(themeId) {
  if (typeof document === 'undefined') return;
  
  const colors = themeColors[themeId] || themeColors.light;
  const [primary, cyan, pink, rose] = colors;

  // Create SVG as data URL with theme colors
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" fill="${primary}"/>
    <rect x="18" y="2" width="12" height="12" rx="2" fill="${cyan}"/>
    <rect x="2" y="18" width="12" height="12" rx="2" fill="${pink}"/>
    <rect x="18" y="18" width="12" height="12" rx="2" fill="${rose}"/>
  </svg>`;

  const dataUrl = 'data:image/svg+xml;base64,' + btoa(svg);
  
  // Update or create favicon link
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    document.head.appendChild(favicon);
  }
  favicon.href = dataUrl;
}

// Initialize favicon updater - only subscribe if in browser
export function initFaviconUpdater() {
  if (typeof window === 'undefined') return;
  
  // Subscribe to theme changes
  if (selectedTheme && typeof selectedTheme.subscribe === 'function') {
    selectedTheme.subscribe(themeId => {
      updateFavicon(themeId);
    });
  }
}
