/**
 * Firesite Project Service - Main Application Controller
 * Orchestrates the initialization and management of all services and components
 */

import { eventBus } from './events/event-bus.js';
import { themeService } from '../services/ui/theme.service.js';
import { webContainerService } from '../services/webcontainer-service.js';
import { kanbanService } from '../services/kanban/kanban.service.js';
import { firebaseService } from '../services/firebase-service.js';
import { mcpMaxService } from '../services/mcp-max-service.js';
import { aiService } from '../services/ai-service.js';
import { kaibanService } from '../services/kaiban-service.js';
import { mmcoService } from '../services/mmco-service.js';

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
      
      // Development environment
      webContainer: webContainerService,
      
      // Infrastructure services
      firebase: firebaseService,
      mcpMax: mcpMaxService,
      ai: aiService,
      kaiban: kaibanService,
      mmco: mmcoService,
      
      // Project management
      kanban: kanbanService
    };

    // Initialize all services
    const serviceNames = ['webContainer', 'firebase', 'mcpMax', 'ai', 'kaiban', 'mmco', 'kanban'];
    
    for (const serviceName of serviceNames) {
      try {
        await this.services[serviceName].initialize();
        console.log(`✅ ${serviceName} service initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${serviceName} service:`, error);
        // Don't throw for infrastructure services - allow graceful degradation
        if (serviceName === 'kanban') {
          throw new Error(`Service initialization failed: ${serviceName}`);
        } else {
          console.log(`⚠️ ${serviceName} service failed, continuing with degraded functionality`);
        }
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
    
    // Setup header buttons
    this.setupHeaderButtons();
    
    // Update version display
    this.updateVersionDisplay();
    
    // Initialize REAL Kanban Board using our Firebase/MCP MAX services
    const { default: KanbanBoard } = await import('../components/kanban/kanban-board.js');
    this.components.kanbanBoard = new KanbanBoard('kanban-board');
    await this.components.kanbanBoard.initialize();
    
    // Initialize status indicators
    this.updateConnectionStatus('connecting');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Real Kanban Board events
    eventBus.on('kanban-board:initialized', () => {
      console.log('✅ Real Kanban Board initialized');
      this.updateConnectionStatus('connected');
      this.updateAIStatus('connected', 'Real AI Services Ready');
    });

    eventBus.on('kanban:task:created', (data) => {
      console.log('✅ Task created:', data.task.title);
    });

    eventBus.on('kanban:task:moved', (data) => {
      console.log('✅ Task moved:', data.task.title);
    });

    // Kanban board UI events
    eventBus.on('kanban-board:add-task-requested', (data) => {
      this.handleAddTaskRequest(data.columnId);
    });

    eventBus.on('kanban-board:task-menu-requested', (data) => {
      this.handleTaskMenuRequest(data.taskId, data.event);
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
      // Kanban service is already initialized
      // Set up initial UI state
      this.updateAIStatus('disconnected'); // Start as disconnected, will connect later
      
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
   * Setup header button functionality
   */
  setupHeaderButtons() {
    // Add Task button
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.handleAddTaskFromHeader();
      });
    }

    // AI Assist button
    const aiAssistBtn = document.getElementById('ai-assist-btn');
    if (aiAssistBtn) {
      aiAssistBtn.addEventListener('click', () => {
        this.handleAIAssistRequest();
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.handleSettingsRequest();
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
        'connected': 'AI Connected',
        'connecting': 'AI Connecting...',
        'disconnected': 'AI Disconnected',
        'error': message || 'Connection Error'
      };
      
      statusElement.textContent = statusText[status] || status;
    }
    
    // Also update the main AI status to keep them in sync
    this.updateAIStatus(status, message);
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
   * Handle add task request from header button
   */
  handleAddTaskFromHeader() {
    // Simple prompt for now - can be enhanced with modal later
    const title = prompt('Task title:');
    if (title && title.trim()) {
      const description = prompt('Task description (optional):') || '';
      
      // For now, add to the "To Do" column (first column)
      // This could be enhanced to let user choose column
      const columnId = 'todo'; // Default column
      
      console.log(`📝 Creating task: ${title.trim()}`);
      
      // Add task to the real Kanban service
      const boardData = this.services.kanban.getCurrentBoard();
      if (boardData) {
        this.services.kanban.createTask({
          title: title.trim(),
          description: description,
          columnId: columnId,
          boardId: boardData.id
        });
      }
    }
  }

  /**
   * Handle add task request
   */
  handleAddTaskRequest(columnId) {
    // Simple prompt for now - can be enhanced with modal later
    const title = prompt('Task title:');
    if (title && title.trim()) {
      const boardData = this.services.kanban.getCurrentBoard();
      if (boardData) {
        this.services.kanban.createTask({
          title: title.trim(),
          description: '',
          columnId,
          boardId: boardData.id
        });
      }
    }
  }

  /**
   * Handle AI Assist request
   */
  handleAIAssistRequest() {
    console.log('🤖 AI Assist requested');
    
    const options = [
      'Run Safe AI Tests',
      'Analyze Current Tasks', 
      'Generate Task Suggestions',
      'Optimize Workflow'
    ];
    
    const choice = prompt(`AI Assist Options:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nChoose option (1-${options.length}):`);
    
    if (choice && choice >= 1 && choice <= options.length) {
      const selectedOption = options[choice - 1];
      console.log(`🎯 AI Assist: ${selectedOption}`);
      
      // Trigger the appropriate AI action
      if (choice == 1 && this.components.kanbanBoard) {
        // Run real AI analysis
        this.components.kanbanBoard._handleAIAnalysis();
      } else {
        alert(`AI Assist: ${selectedOption} - Coming soon!`);
      }
    }
  }

  /**
   * Handle settings request
   */
  handleSettingsRequest() {
    console.log('⚙️ Settings requested');
    alert('Settings panel - Coming soon!\n\nCurrent features:\n- Theme toggle (working)\n- AI-powered Kanban (working)\n- Safe AI testing (working)');
  }

  /**
   * Handle task menu request
   */
  handleTaskMenuRequest(taskId, event) {
    // Simple alert for now - can be enhanced with context menu later
    const action = prompt('Action (edit/delete):');
    if (action === 'delete') {
      if (confirm('Delete this task?')) {
        this.services.kanban.deleteTask(taskId);
      }
    } else if (action === 'edit') {
      const task = this.services.kanban.tasks.get(taskId);
      if (task) {
        const newTitle = prompt('New title:', task.title);
        if (newTitle && newTitle.trim() && newTitle !== task.title) {
          this.services.kanban.updateTask(taskId, { title: newTitle.trim() });
        }
      }
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