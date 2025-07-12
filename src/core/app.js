/**
 * Firesite Project Service - Main Application Controller
 * Orchestrates the initialization and management of all services and components
 */

import { eventBus } from './events/event-bus.js';
import { themeService } from '../services/ui/theme.service.js';
import { aiService } from '../services/ai/ai.service.js';
import { kanbanService } from '../services/kanban/kanban.service.js';
import { projectService } from '../services/project/project.service.js';

class ProjectApp {
  constructor() {
    this.initialized = false;
    this.services = {};
    this.components = {};
    this.state = {
      loading: true,
      connected: false,
      currentProject: null
    };
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing Firesite Project Service...');

    try {
      // Initialize core services
      await this.initializeServices();
      
      // Initialize UI components
      await this.initializeUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial state
      await this.loadInitialState();
      
      // Mark as initialized
      this.initialized = true;
      this.state.loading = false;
      
      // Show main app
      this.showMainApp();
      
      console.log('✅ Firesite Project Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Project Service:', error);
      throw error;
    }
  }

  /**
   * Initialize core services
   */
  async initializeServices() {
    console.log('🔧 Initializing services...');

    // Initialize services in dependency order
    this.services = {
      // Core services
      eventBus: eventBus,
      theme: themeService,
      
      // AI integration
      ai: aiService,
      
      // Project management
      project: projectService,
      kanban: kanbanService
    };

    // Initialize each service
    for (const [name, service] of Object.entries(this.services)) {
      try {
        if (service.initialize) {
          await service.initialize();
          console.log(`✅ ${name} service initialized`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} service:`, error);
        throw new Error(`Service initialization failed: ${name}`);
      }
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    console.log('🎨 Initializing UI components...');

    // Initialize theme
    this.services.theme.initialize();
    
    // Setup theme toggle
    this.setupThemeToggle();
    
    // Update version display
    this.updateVersionDisplay();
    
    // Initialize status indicators
    this.updateConnectionStatus('connecting');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // AI service events
    eventBus.on('ai:connected', () => {
      this.state.connected = true;
      this.updateConnectionStatus('connected');
      this.updateAIStatus('connected');
    });

    eventBus.on('ai:disconnected', () => {
      this.state.connected = false;
      this.updateConnectionStatus('disconnected');
      this.updateAIStatus('disconnected');
    });

    eventBus.on('ai:error', (data) => {
      console.error('AI service error:', data.error);
      this.updateAIStatus('error', data.error.message);
    });

    // Project events
    eventBus.on('project:loaded', (data) => {
      this.state.currentProject = data.project;
      this.updateProjectDisplay();
    });

    eventBus.on('project:changed', (data) => {
      this.state.currentProject = data.project;
      this.updateProjectDisplay();
    });

    // Kanban events
    eventBus.on('kanban:updated', () => {
      this.updateKanbanDisplay();
    });

    // Global error handling
    eventBus.on('error', (data) => {
      console.error('Global error:', data.error);
      this.showErrorNotification(data.error.message);
    });
  }

  /**
   * Load initial application state
   */
  async loadInitialState() {
    console.log('📂 Loading initial state...');

    try {
      // Try to connect to AI service
      await this.services.ai.connect();
      
      // Load default project or create new one
      await this.services.project.loadDefaultProject();
      
      // Initialize Kanban board
      await this.services.kanban.initializeBoard();
      
    } catch (error) {
      console.warn('⚠️ Some services failed to initialize:', error);
      // Continue with limited functionality
    }
  }

  /**
   * Show the main application interface
   */
  showMainApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen && mainApp) {
      loadingScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      mainApp.classList.add('animate-fade-in');
    }
  }

  /**
   * Setup theme toggle functionality
   */
  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.services.theme.toggle();
      });
    }
  }

  /**
   * Update version display
   */
  updateVersionDisplay() {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      versionElement.textContent = this.getVersion();
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status, message = '') {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      const statusText = {
        'connected': 'Connected to AI',
        'connecting': 'Connecting to AI...',
        'disconnected': 'AI Disconnected',
        'error': message || 'Connection Error'
      };
      
      statusElement.textContent = statusText[status] || status;
    }
  }

  /**
   * Update AI status indicator
   */
  updateAIStatus(status, message = '') {
    const aiStatus = document.getElementById('ai-status');
    if (!aiStatus) return;

    const statusConfig = {
      'connected': {
        dot: 'bg-green-500 animate-pulse',
        text: 'AI Connected',
        color: 'text-green-600 dark:text-green-400'
      },
      'connecting': {
        dot: 'bg-yellow-500 animate-pulse',
        text: 'AI Connecting...',
        color: 'text-yellow-600 dark:text-yellow-400'
      },
      'disconnected': {
        dot: 'bg-red-500',
        text: 'AI Disconnected',
        color: 'text-red-600 dark:text-red-400'
      },
      'error': {
        dot: 'bg-red-500',
        text: message || 'AI Error',
        color: 'text-red-600 dark:text-red-400'
      }
    };

    const config = statusConfig[status] || statusConfig.disconnected;
    
    aiStatus.innerHTML = `
      <div class="w-2 h-2 ${config.dot} rounded-full"></div>
      <span class="text-sm ${config.color}">${config.text}</span>
    `;
  }

  /**
   * Update project display
   */
  updateProjectDisplay() {
    // Update project-related UI elements
    const projectTitle = document.querySelector('[data-project-title]');
    if (projectTitle && this.state.currentProject) {
      projectTitle.textContent = this.state.currentProject.name;
    }
  }

  /**
   * Update Kanban display
   */
  updateKanbanDisplay() {
    // Trigger Kanban board refresh
    if (this.services.kanban) {
      this.services.kanban.refreshBoard();
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    // Simple error notification - can be enhanced with toast system
    console.error('Error notification:', message);
    
    // TODO: Implement proper notification system
    // For now, just log to console
  }

  /**
   * Get application version
   */
  getVersion() {
    return __APP_VERSION__ || '1.0.0';
  }

  /**
   * Get application state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get service by name
   */
  getService(name) {
    return this.services[name];
  }

  /**
   * Cleanup and destroy
   */
  async destroy() {
    console.log('🧹 Destroying Project Service...');

    // Cleanup services
    for (const service of Object.values(this.services)) {
      if (service.destroy) {
        await service.destroy();
      }
    }

    this.initialized = false;
  }
}

// Export singleton instance
export const projectApp = new ProjectApp();
export default projectApp;