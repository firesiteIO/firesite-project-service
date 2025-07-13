/**
 * Firesite Project Service - Main Application Controller
 * Revolutionary service-first architecture with event-driven communication
 */

import { globalEvents } from '../events/EnhancedEventBus.js';
import { taskService } from '../services/core/TaskService.js';
import { componentRegistry } from '../components/base/ComponentRegistry.js';
import KanbanBoardComponent from '../components/kanban/KanbanBoardComponent.js';

// Legacy service imports for backward compatibility
import { themeService } from '../services/ui/theme.service.js';
import { webContainerService } from '../services/webcontainer-service.js';
import { firebaseService } from '../services/firebase-service.js';
import { mcpMaxService } from '../services/mcp-max-service.js';
import { aiService } from '../services/ai-service.js';

class ProjectApp {
  constructor() {
    this.initialized = false;
    this.services = {};
    this.components = {};
    this.state = {
      loading: true,
      connected: false,
      currentProject: null,
      aiMode: 'development'
    };
    
    // Enhanced event system
    this.globalEvents = globalEvents;
  }

  /**
   * Initialize the application with service-first architecture
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing Firesite Project Service with Service-First Architecture...');

    try {
      // Phase 1: Initialize core infrastructure
      await this.initializeCoreServices();
      
      // Phase 2: Initialize component system
      await this.initializeComponentSystem();
      
      // Phase 3: Initialize UI components
      await this.initializeUI();
      
      // Phase 4: Setup event system
      this.setupEventListeners();
      
      // Phase 5: Load initial state
      await this.loadInitialState();
      
      // Mark as initialized
      this.initialized = true;
      this.state.loading = false;
      
      // Make globally available for component testing
      if (typeof window !== 'undefined') {
        window.projectApp = this;
      }
      
      // Show main app
      this.showMainApp();
      
      console.log('✅ Firesite Project Service initialized successfully with service-first architecture');
      
    } catch (error) {
      console.error('❌ Failed to initialize Project Service:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize core services with enhanced event system
   */
  async initializeCoreServices() {
    console.log('🔧 Initializing core services...');

    // Initialize enhanced event system first
    this.services.globalEvents = this.globalEvents;
    
    // Initialize new service-first architecture services
    this.services.taskService = taskService;
    this.services.taskService.initialize();
    
    // Initialize legacy services for backward compatibility
    this.services.theme = themeService;
    this.services.webContainer = webContainerService;
    this.services.firebase = firebaseService;
    this.services.mcpMax = mcpMaxService;
    this.services.ai = aiService;

    // Initialize legacy services with graceful degradation
    const legacyServices = ['webContainer', 'firebase', 'mcpMax', 'ai'];
    
    for (const serviceName of legacyServices) {
      try {
        await this.services[serviceName].initialize();
        console.log(`✅ ${serviceName} service initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${serviceName} service:`, error);
        console.log(`⚠️ ${serviceName} service failed, continuing with graceful degradation`);
      }
    }
  }

  /**
   * Initialize component system
   */
  async initializeComponentSystem() {
    console.log('🎨 Initializing component system...');
    
    // Register our new component types
    componentRegistry.registerType('KanbanBoard', KanbanBoardComponent, {
      enableAutoRender: true,
      enableStateLogging: true
    });
    
    console.log('✅ Component system initialized');
  }

  /**
   * Initialize UI components with new architecture
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
    
    // Initialize new KanbanBoard component
    const kanbanContainer = document.getElementById('kanban-board');
    if (kanbanContainer) {
      this.components.kanbanBoard = componentRegistry.createAndMount('KanbanBoard', {
        container: kanbanContainer,
        className: 'h-full'
      });
      
      console.log('✅ New KanbanBoard component initialized');
    } else {
      console.warn('⚠️ Kanban board container not found');
    }
    
    // Initialize status indicators
    this.updateConnectionStatus('connecting');
  }

  /**
   * Setup enhanced event listeners
   */
  setupEventListeners() {
    console.log('📡 Setting up enhanced event listeners...');
    
    // Task service events
    this.globalEvents.on('task:created', (data) => {
      console.log('✅ Task created:', data.task.title);
      this.updateAIStatus('connected', 'Task Created');
    });

    this.globalEvents.on('task:status-changed', (data) => {
      console.log('🔄 Task status changed:', data.taskId, data.oldStatus, '→', data.newStatus);
    });

    this.globalEvents.on('task:agent-assigned', (data) => {
      console.log('🤖 Agent assigned to task:', data.taskId, data.agentId);
    });

    // Agent events
    this.globalEvents.on('agent:status-changed', (data) => {
      console.log('🤖 Agent status changed:', data.agentId, data.oldStatus, '→', data.newStatus);
    });

    // Workflow events
    this.globalEvents.on('workflow:started', (data) => {
      console.log('🚀 Workflow started:', data.teamId);
      this.updateAIStatus('connected', 'Workflow Running');
    });

    this.globalEvents.on('workflow:completed', (data) => {
      console.log('✅ Workflow completed:', data.teamId);
      this.updateAIStatus('connected', 'Workflow Complete');
    });

    // UI events
    this.globalEvents.on('ui:task-card-clicked', (data) => {
      console.log('👆 Task card clicked:', data.taskId);
      this.handleTaskCardClicked(data.taskId);
    });

    this.globalEvents.on('ui:workflow-control-action', (data) => {
      console.log('🎮 Workflow control action:', data.action);
      this.handleWorkflowControl(data.action, data.teamId);
    });

    // Component lifecycle events
    this.globalEvents.on('ui:component-mounted', (data) => {
      console.log('🏗️ Component mounted:', data.componentType, data.componentId);
    });

    this.globalEvents.on('ui:component-destroyed', (data) => {
      console.log('🧹 Component destroyed:', data.componentType, data.componentId);
    });

    // Global error handling
    this.globalEvents.on('error', (data) => {
      console.error('Global error:', data.error);
      this.showErrorNotification(data.error.message);
    });

    // Legacy compatibility events
    this.globalEvents.on('kanban-board:initialized', () => {
      console.log('✅ Legacy Kanban Board compatibility event');
      this.updateConnectionStatus('connected');
    });
  }

  /**
   * Load initial application state
   */
  async loadInitialState() {
    console.log('📂 Loading initial state...');

    try {
      // Create some demo tasks for development
      await this.createDemoTasks();
      
      // Set initial AI status
      this.updateAIStatus('connected', 'Service-First Architecture Ready');
      
    } catch (error) {
      console.warn('⚠️ Some initialization failed:', error);
      this.updateAIStatus('error', 'Initialization Warning');
    }
  }

  /**
   * Create demo tasks for development
   */
  async createDemoTasks() {
    console.log('📝 Creating demo tasks...');
    
    const demoTasks = [
      {
        title: 'Implement Service-First Architecture',
        description: 'Build event-driven architecture with service contracts and component system',
        isDeliverable: true
      },
      {
        title: 'Extract KaibanJS Patterns',
        description: 'Analyze and implement multi-agent coordination patterns',
        isDeliverable: true
      },
      {
        title: 'Create Beautiful UI Components',
        description: 'Build responsive Tailwind components with Firesite design system'
      },
      {
        title: 'Test AI Integration',
        description: 'Verify MCP Max and agent services are working correctly'
      }
    ];

    for (const taskData of demoTasks) {
      this.services.taskService.createTask(taskData);
    }
    
    console.log(`✅ Created ${demoTasks.length} demo tasks`);
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
   * Handle initialization error
   */
  handleInitializationError(error) {
    console.error('Initialization failed:', error);
    
    // Show error in UI
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 m-4">
          <h3 class="text-red-400 font-medium mb-2">Initialization Failed</h3>
          <p class="text-red-300 text-sm">${error.message}</p>
          <button class="mt-3 px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                  onclick="location.reload()">
            Retry
          </button>
        </div>
      `;
      errorContainer.classList.remove('hidden');
    }
    
    this.updateAIStatus('error', error.message);
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
        'connected': 'Service-First Architecture Connected',
        'connecting': 'Initializing Services...',
        'disconnected': 'Services Disconnected',
        'error': message || 'Service Error'
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
        text: message || 'Service-First Architecture Active',
        color: 'text-green-600 dark:text-green-400'
      },
      'connecting': {
        dot: 'bg-yellow-500 animate-pulse',
        text: message || 'Initializing Services...',
        color: 'text-yellow-600 dark:text-yellow-400'
      },
      'disconnected': {
        dot: 'bg-red-500',
        text: message || 'Services Offline',
        color: 'text-red-600 dark:text-red-400'
      },
      'error': {
        dot: 'bg-red-500',
        text: message || 'Service Error',
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
    const title = prompt('Task title:');
    if (title && title.trim()) {
      const description = prompt('Task description (optional):') || '';
      
      console.log(`📝 Creating task: ${title.trim()}`);
      
      // Create task using new TaskService
      this.services.taskService.createTask({
        title: title.trim(),
        description: description,
        isDeliverable: confirm('Is this a deliverable task?')
      });
    }
  }

  /**
   * Handle AI Assist request
   */
  handleAIAssistRequest() {
    console.log('🤖 AI Assist requested');
    
    const options = [
      'Analyze Task Dependencies',
      'Suggest Agent Assignments', 
      'Optimize Workflow',
      'Generate Task Breakdown',
      'Check Service Health'
    ];
    
    const choice = prompt(`AI Assist Options:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nChoose option (1-${options.length}):`);
    
    if (choice && choice >= 1 && choice <= options.length) {
      const selectedOption = options[choice - 1];
      console.log(`🎯 AI Assist: ${selectedOption}`);
      
      // Emit AI assist event
      this.globalEvents.emit('ui:ai-assist-requested', {
        option: selectedOption,
        optionIndex: parseInt(choice) - 1
      });
      
      // For now, show stats
      if (choice == 5) {
        this.showServiceStats();
      } else {
        alert(`AI Assist: ${selectedOption}\n\nFeature coming soon with full MCP Max integration!`);
      }
    }
  }

  /**
   * Show service statistics
   */
  showServiceStats() {
    const taskStats = this.services.taskService.getStats();
    const componentStats = componentRegistry.getStats();
    
    const statsMessage = `
Service-First Architecture Statistics:

Tasks:
- Total: ${taskStats.totalActiveTasks}
- Completed: ${taskStats.completedTasks}
- Success Rate: ${(taskStats.successRate * 100).toFixed(1)}%

Components:
- Registered Types: ${componentStats.registeredTypes}
- Active Components: ${componentStats.activeComponents}
- Mounted: ${componentStats.mountedComponents}

Event System:
- Event Types: ${this.globalEvents.eventNames().length}
- Total Events Processed: ${this.globalEvents.getStats().totalEvents}
    `.trim();
    
    alert(statsMessage);
  }

  /**
   * Handle settings request
   */
  handleSettingsRequest() {
    console.log('⚙️ Settings requested');
    
    const settings = `
Firesite Project Service Settings:

✅ Service-First Architecture: Active
✅ Enhanced Event System: Active  
✅ Component Registry: Active
✅ Task Service: Active
⚠️ Agent Service: Development Mode
⚠️ MCP Max Integration: Offline Fallback
⚠️ Firebase Functions: Graceful Degradation

AI Mode: ${this.state.aiMode}
Theme: ${this.services.theme.getCurrentTheme()}
    `.trim();
    
    alert(settings);
  }

  /**
   * Handle task card clicked
   */
  handleTaskCardClicked(taskId) {
    const task = this.services.taskService.getTask(taskId);
    if (task) {
      const action = prompt(`Task: ${task.title}\n\nActions:\n1. Edit\n2. Delete\n3. Change Status\n4. Assign Agent\n\nChoose action (1-4):`);
      
      switch(action) {
        case '1':
          this.editTask(task);
          break;
        case '2':
          this.deleteTask(task);
          break;
        case '3':
          this.changeTaskStatus(task);
          break;
        case '4':
          this.assignAgent(task);
          break;
      }
    }
  }

  /**
   * Handle workflow control
   */
  handleWorkflowControl(action, teamId) {
    console.log(`🎮 Workflow ${action} for team ${teamId}`);
    
    // Emit workflow events for other services to handle
    this.globalEvents.emit(`workflow:${action}`, { teamId });
    
    alert(`Workflow ${action} triggered!\n\nThis will be fully implemented when TeamOrchestrationService is complete.`);
  }

  /**
   * Edit task
   */
  editTask(task) {
    const newTitle = prompt('New title:', task.title);
    if (newTitle && newTitle.trim() && newTitle !== task.title) {
      // For now, we'll create an updated task - proper editing will come with task update functionality
      console.log(`Editing task ${task.id}: ${task.title} → ${newTitle.trim()}`);
      alert('Task editing will be implemented when TaskService.updateTask is added!');
    }
  }

  /**
   * Delete task
   */
  deleteTask(task) {
    if (confirm(`Delete task: ${task.title}?`)) {
      console.log(`Deleting task ${task.id}: ${task.title}`);
      alert('Task deletion will be implemented when TaskService.deleteTask is added!');
    }
  }

  /**
   * Change task status
   */
  changeTaskStatus(task) {
    const statuses = ['TODO', 'DOING', 'BLOCKED', 'DONE', 'AWAITING_VALIDATION'];
    const choice = prompt(`Current status: ${task.status}\n\nNew status:\n${statuses.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nChoose (1-${statuses.length}):`);
    
    if (choice && choice >= 1 && choice <= statuses.length) {
      const newStatus = statuses[parseInt(choice) - 1];
      this.services.taskService.updateStatus(task.id, newStatus, {
        source: 'manual-ui-change'
      });
    }
  }

  /**
   * Assign agent to task
   */
  assignAgent(task) {
    const agentId = prompt('Agent ID:');
    if (agentId && agentId.trim()) {
      this.services.taskService.assignAgent(task.id, agentId.trim());
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    console.error('Error notification:', message);
    
    // TODO: Implement proper toast notification system
    // For now, just log to console and show alert
    alert(`Error: ${message}`);
  }

  /**
   * Get application version
   */
  getVersion() {
    return '2.0.0-service-first';
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

    // Destroy all components
    componentRegistry.destroyAll();
    
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