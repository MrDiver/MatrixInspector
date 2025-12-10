import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { updateFavicon, initFaviconUpdater } from './lib/faviconUpdater'

// Initialize favicon with current theme
const storedTheme = localStorage.getItem('theme') || 'light'
updateFavicon(storedTheme)

// Subscribe to future theme changes
initFaviconUpdater()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
