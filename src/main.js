import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { darkMode } from './lib/themeStore'

// Initialize theme on page load
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark')
  darkMode.set(true)
}

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
