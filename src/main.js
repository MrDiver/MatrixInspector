import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { darkMode } from './lib/themeStore'
import { updateFavicon, initFaviconUpdater } from './lib/faviconUpdater'

// Initialize theme on page load
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark')
  darkMode.set(true)
}

// Initialize favicon with current theme
const storedTheme = localStorage.getItem('theme') || 'light'
updateFavicon(storedTheme)

// Subscribe to future theme changes
initFaviconUpdater()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
