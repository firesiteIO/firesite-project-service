/**
 * Theme Service - Dark/Light mode management
 */

import { eventBus } from '../../core/events/event-bus.js';

class ThemeService {
  constructor() {
    this.currentTheme = 'light';
    this.initialized = false;
  }

  /**
   * Initialize theme service
   */
  initialize() {
    if (this.initialized) return;

    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    this.currentTheme = savedTheme || systemTheme;
    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });

    this.initialized = true;
    console.log(`Theme service initialized with ${this.currentTheme} theme`);
  }

  /**
   * Set theme
   * @param {string} theme - 'light' or 'dark'
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;

    this.currentTheme = theme;
    this.applyTheme(theme);
    localStorage.setItem('theme', theme);

    eventBus.emit('theme:changed', { theme });
  }

  /**
   * Toggle between light and dark theme
   */
  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Apply theme to DOM
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * Get current theme
   * @returns {string} Current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark mode is active
   * @returns {boolean} True if dark mode
   */
  isDark() {
    return this.currentTheme === 'dark';
  }
}

export const themeService = new ThemeService();
export default themeService;