import { writable } from 'svelte/store';

export const darkMode = writable(
  typeof window !== 'undefined' && localStorage.getItem('darkMode') === 'true'
);

// Subscribe to dark mode changes and persist to localStorage
darkMode.subscribe(isDark => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('darkMode', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
});
