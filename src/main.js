/**
 * Firesite Project Service - Main Application Entry Point
 * AI-Powered Kanban Management with KaibanJS Integration
 */

import './assets/css/main.css';
import { projectApp } from './core/app.js';
import { config, isFirebaseConfigured } from './core/config/firebase-config.js';

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Firesite Project Service starting...');
  console.log('📊 Environment:', config.environment);
  console.log('🔥 Firebase configured:', isFirebaseConfigured());
  console.log('🎯 Features enabled:', config.features);
  
  try {
    // Initialize the main application
    await projectApp.initialize();
    
    console.log('✅ Firesite Project Service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firesite Project Service:', error);
    
    // Show error state in UI
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div class="text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">Failed to Initialize</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">${error.message}</p>
          <button onclick="location.reload()" class="mt-4 bg-firesite-500 hover:bg-firesite-600 text-white px-4 py-2 rounded-lg transition-colors">
            Retry
          </button>
        </div>
      `;
    }
  }
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept();
}