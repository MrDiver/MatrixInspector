import { writable, derived } from 'svelte/store';

export const themes = [
  {
    id: 'light',
    name: 'Aurora Light',
    accent: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  },
  {
    id: 'dark',
    name: 'Midnight',
    accent: 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #1f2937 100%)'
  },
  {
    id: 'sunset',
    name: 'Sunset Neon',
    accent: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #ff6a88 100%)'
  },
  {
    id: 'ocean',
    name: 'Oceanic',
    accent: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 50%, #8fd3f4 100%)'
  },
  {
    id: 'cyber',
    name: 'Cyber Lime',
    accent: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 50%, #0047ff 100%)'
  }
];

export const themePalettes = {
  light: ['#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30b0fe', '#a8edea', '#fed6e3', '#ffeaa7', '#fd79a8', '#6c5ce7', '#00b894', '#fdcb6e'],
  dark: ['#7dd3fc', '#a78bfa', '#f472b6', '#22d3ee', '#22c55e', '#f97316', '#eab308', '#38bdf8', '#c084fc', '#f472b6', '#22c55e', '#f59e0b'],
  sunset: ['#ff9a9e', '#fad0c4', '#ff6a88', '#ff99f7', '#ffc3a0', '#fbc2eb', '#a18cd1', '#f8cdda', '#ffdde1', '#ffb5a7', '#ffd97d', '#ff6f91'],
  ocean: ['#5b86e5', '#36d1dc', '#8fd3f4', '#00c9ff', '#92fe9d', '#5ee7df', '#66a6ff', '#a2facf', '#90f7ec', '#4facfe', '#43e97b', '#30b0fe'],
  cyber: ['#00f5a0', '#00d9f5', '#0047ff', '#7cf3d1', '#8be9fd', '#50fa7b', '#bd93f9', '#ff79c6', '#ffb86c', '#ff5555', '#69ff97', '#7af8ff']
};

const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
export const selectedTheme = writable(storedTheme || 'light');

export const currentPalette = derived(selectedTheme, (themeId) => {
  return themePalettes[themeId] || themePalettes.light;
});

function applyTheme(themeId) {
  if (typeof window === 'undefined') return;
  document.documentElement.dataset.theme = themeId;
  // Keep legacy dark class for any existing selectors
  if (themeId === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', themeId);
}

selectedTheme.subscribe(value => {
  applyTheme(value);
});

export const darkMode = derived(selectedTheme, v => v === 'dark');

export function setTheme(themeId) {
  selectedTheme.set(themeId);
}

// Initialize immediately for SSR/SPA hydration
applyTheme(storedTheme || 'light');
