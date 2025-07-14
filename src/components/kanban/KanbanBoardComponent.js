/**
 * Kanban Board Component - Revolutionary AI-human collaborative interface
 * Based on KaibanJS UI analysis with service-first architecture
 */

import BaseComponent from '../base/BaseComponent.js';
import { taskService } from '../../services/core/TaskService.js';
import { TASK_STATUS, WORKFLOW_STATUS } from '../../events/EventContracts.js';

/**
 * Kanban Board Component implementing the extracted UI patterns
 */
export class KanbanBoardComponent extends BaseComponent {
  get defaultState() {
    return {
      ...super.defaultState,
      columns: [],
      tasks: [],
      selectedTask: null,
      workflowStatus: WORKFLOW_STATUS.INITIAL,
      aiMode: 'development', // development, mcp-max, offline
      connectionStatus: {
        firebase: false,
        mcpMax: false,
        webContainer: true
      },
      showAIPanel: true,
      draggedTask: null
    };
  }

  generateClasses() {
    const base = super.generateClasses();
    
    return {
      ...base,
      
      // Main container
      container: 'relative bg-slate-900 overflow-hidden rounded-xl ring-1 ring-slate-700',
      fullScreen: 'fixed top-0 left-0 w-screen h-screen z-50',
      
      // AI Integration Panel
      aiPanel: {
        container: 'ai-integration-panel mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-orange-400',
        header: 'flex justify-between items-center mb-4',
        title: 'text-lg font-medium text-green-800 font-bold',
        controls: 'flex gap-2',
        status: 'flex items-center gap-2 text-sm',
        indicator: {
          online: 'w-2 h-2 rounded-full bg-green-500',
          offline: 'w-2 h-2 rounded-full bg-red-500',
          unknown: 'w-2 h-2 rounded-full bg-yellow-500'
        }
      },
      
      // Board layout
      board: {
        desktop: 'hidden md:grid grid-cols-4 gap-3 divide-x divide-slate-700',
        mobile: 'block md:hidden',
        column: 'px-3 min-h-0 flex flex-col',
        columnHeader: 'flex justify-between items-center mb-4',
        columnTitle: 'text-sm font-medium text-slate-200',
        columnCount: 'text-xs text-slate-400',
        taskList: 'space-y-3 flex-1 overflow-y-auto'
      },
      
      // Task cards based on KaibanJS analysis
      task: {
        card: 'ring-1 ring-slate-950 rounded-lg bg-slate-800 p-4 hover:ring-indigo-500 cursor-pointer transition-all duration-200',
        header: 'flex justify-between items-start',
        title: 'text-sm font-medium text-slate-200',
        description: 'text-xs text-slate-400 mt-2',
        tags: 'mt-3 flex gap-2 flex-wrap',
        footer: 'mt-3 flex justify-between items-center',
        progress: 'flex items-center gap-1'
      },
      
      // Status badges from KaibanJS
      status: {
        todo: 'bg-slate-500/15 text-slate-400',
        doing: 'bg-blue-500/15 text-blue-400',
        blocked: 'bg-red-500/15 text-red-400',
        done: 'bg-green-500/15 text-green-400',
        awaitingValidation: 'bg-indigo-500/15 text-indigo-500'
      },
      
      // Activity indicators
      activity: {
        counter: 'bg-slate-400 rounded-full px-1 text-[10px] text-slate-900 font-medium group-hover:bg-indigo-500',
        label: 'text-xs text-slate-400'
      }
    };
  }

  _setupEventListeners() {
    super._setupEventListeners();
    
    // Task service events
    this._listenToGlobalEvent('task:created', this._handleTaskCreated);
    this._listenToGlobalEvent('task:status-changed', this._handleTaskStatusChanged);
    this._listenToGlobalEvent('task:agent-assigned', this._handleTaskAgentAssigned);
    
    // Agent events
    this._listenToGlobalEvent('agent:status-changed', this._handleAgentStatusChanged);
    
    // Workflow events
    this._listenToGlobalEvent('workflow:started', this._handleWorkflowStarted);
    this._listenToGlobalEvent('workflow:completed', this._handleWorkflowCompleted);
    this._listenToGlobalEvent('workflow:blocked', this._handleWorkflowBlocked);
    
    // UI events
    this._listenToGlobalEvent('ui:task-card-clicked', this._handleTaskCardClicked);
  }

  _onMounted() {
    // Initialize with default columns and load tasks
    this._initializeColumns();
    this._loadTasks();
    this._updateConnectionStatus();
  }

  template() {
    if (this.state.loading) {
      return this._createLoadingSpinner('lg');
    }

    if (this.state.error) {
      return this._createErrorMessage(this.state.error, true);
    }

    return `
      <div class="${this.classes.container} ${this.className}">
        ${this._renderAIPanel()}
        ${this._renderDesktopBoard()}
        ${this._renderMobileBoard()}
      </div>
    `;
  }

  _renderAIPanel() {
    if (!this.state.showAIPanel) return '';
    
    const { connectionStatus, aiMode, workflowStatus } = this.state;
    
    return `
      <div class="${this.classes.aiPanel.container}">
        <div class="${this.classes.aiPanel.header}">
          <h3 class="${this.classes.aiPanel.title}">AI Integration Panel</h3>
          <div class="${this.classes.aiPanel.controls}">
            <button class="${this.classes.button.secondary}" onclick="this.closest('[data-component]').__component.toggleAIPanel()">
              Hide Panel
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Connection Status -->
          <div class="bg-white/5 p-3 rounded">
            <h4 class="text-sm font-medium text-slate-700 mb-2">Connection Status</h4>
            <div class="space-y-2">
              ${this._renderConnectionStatus('Firebase Functions', connectionStatus.firebase)}
              ${this._renderConnectionStatus('MCP Max Server', connectionStatus.mcpMax)}
              ${this._renderConnectionStatus('WebContainer', connectionStatus.webContainer)}
            </div>
          </div>
          
          <!-- AI Mode -->
          <div class="bg-white/5 p-3 rounded">
            <h4 class="text-sm font-medium text-slate-700 mb-2">AI Mode</h4>
            <div class="text-sm text-slate-600">
              <strong>Current:</strong> ${aiMode}
            </div>
            <div class="mt-2">
              <select class="text-xs p-1 rounded bg-white/10" onchange="this.closest('[data-component]').__component.setAIMode(this.value)">
                <option value="development" ${aiMode === 'development' ? 'selected' : ''}>Development</option>
                <option value="mcp-max" ${aiMode === 'mcp-max' ? 'selected' : ''}>MCP Max</option>
                <option value="offline" ${aiMode === 'offline' ? 'selected' : ''}>Offline</option>
              </select>
            </div>
          </div>
          
          <!-- Workflow Status -->
          <div class="bg-white/5 p-3 rounded">
            <h4 class="text-sm font-medium text-slate-700 mb-2">Workflow & Stats</h4>
            <div class="text-sm text-slate-600 space-y-1">
              <div><strong>Status:</strong> ${workflowStatus}</div>
              <div><strong>Tasks:</strong> ${this.state.tasks.length}</div>
              <div><strong>Demo Mode:</strong> Active</div>
            </div>
            <div class="mt-2 flex gap-1">
              <button class="${this.classes.button.primary} text-xs py-1 px-2" onclick="this.closest('[data-component]').__component.startWorkflow()">
                Start
              </button>
              <button class="${this.classes.button.secondary} text-xs py-1 px-2" onclick="this.closest('[data-component]').__component.pauseWorkflow()">
                Pause
              </button>
              <button class="${this.classes.button.secondary} text-xs py-1 px-2" onclick="this.closest('[data-component]').__component.createDemoTask()">
                Add Task
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderConnectionStatus(name, isConnected) {
    const statusClass = isConnected 
      ? this.classes.aiPanel.indicator.online
      : this.classes.aiPanel.indicator.offline;
    
    return `
      <div class="${this.classes.aiPanel.status}">
        <div class="${statusClass}"></div>
        <span class="text-xs text-slate-600">${name}</span>
      </div>
    `;
  }

  _renderDesktopBoard() {
    return `
      <div class="${this.classes.board.desktop}">
        ${this.state.columns.map(column => this._renderColumn(column)).join('')}
      </div>
    `;
  }

  _renderMobileBoard() {
    // Mobile swiper implementation would go here
    return `
      <div class="${this.classes.board.mobile}">
        <div class="text-center text-slate-400 p-8">
          Mobile swiper implementation coming soon...
        </div>
      </div>
    `;
  }

  _renderColumn(column) {
    const tasks = this._getTasksForColumn(column.status);
    
    return `
      <div class="${this.classes.board.column}" data-column="${column.id}">
        <div class="${this.classes.board.columnHeader}">
          <h3 class="${this.classes.board.columnTitle}">${column.title}</h3>
          <span class="${this.classes.board.columnCount}">${tasks.length}</span>
        </div>
        
        <div class="${this.classes.board.taskList}" data-status="${column.status}">
          ${tasks.map(task => this._renderTaskCard(task)).join('')}
        </div>
      </div>
    `;
  }

  _renderTaskCard(task) {
    return `
      <div class="${this.classes.task.card} group" 
           data-task="${task.id}" 
           onclick="this.closest('[data-component]').__component.selectTask('${task.id}')">
        
        <div class="${this.classes.task.header}">
          <h4 class="${this.classes.task.title}">${task.title || 'Untitled Task'}</h4>
          ${task.status === TASK_STATUS.AWAITING_VALIDATION ? this._renderValidationBadge() : ''}
        </div>
        
        <p class="${this.classes.task.description}">${task.description || 'No description'}</p>
        
        <div class="${this.classes.task.tags}">
          ${this._renderTaskTags(task)}
        </div>
        
        <div class="${this.classes.task.footer}">
          ${this._renderAgentAvatar(task)}
          ${this._renderTaskProgress(task)}
        </div>
      </div>
    `;
  }

  _renderValidationBadge() {
    return this._createBadge('Awaiting Validation', 'info');
  }

  _renderTaskTags(task) {
    const tags = [];
    
    // Status badge
    tags.push(this._createBadge(task.status, this._getStatusVariant(task.status)));
    
    // Priority badge (if applicable)
    if (task.priority) {
      tags.push(this._createBadge(task.priority, 'warning'));
    }
    
    // Deliverable badge
    if (task.isDeliverable) {
      tags.push(this._createBadge('Deliverable', 'success'));
    }
    
    return tags.join('');
  }

  _renderAgentAvatar(task) {
    if (!task.assignedAgentId) {
      return `
        <div class="text-xs text-slate-500">
          No agent assigned
        </div>
      `;
    }
    
    return this._createAvatar(task.assignedAgentId, null, 'sm');
  }

  _renderTaskProgress(task) {
    if (!task.stats?.iterations) {
      return '';
    }
    
    return `
      <div class="${this.classes.activity.counter}">
        ${task.stats.iterations}
      </div>
      <span class="${this.classes.activity.label}">iterations</span>
    `;
  }

  _bindEventHandlers() {
    // Store reference to component for event handlers
    this.container.setAttribute('data-component', 'true');
    this.container.__component = this;
    
    // Add drag and drop event listeners
    this._setupDragAndDrop();
  }

  _setupDragAndDrop() {
    // Drag and drop implementation
    const taskCards = this.container.querySelectorAll('[data-task]');
    
    taskCards.forEach(card => {
      card.draggable = true;
      
      card.addEventListener('dragstart', (e) => {
        const taskId = card.getAttribute('data-task');
        this.setState({ draggedTask: taskId });
        e.dataTransfer.setData('text/plain', taskId);
      });
      
      card.addEventListener('dragend', () => {
        this.setState({ draggedTask: null });
      });
    });
    
    // Drop zones
    const dropZones = this.container.querySelectorAll('[data-status]');
    
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('bg-indigo-500/10');
      });
      
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('bg-indigo-500/10');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('bg-indigo-500/10');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = zone.getAttribute('data-status');
        
        this._moveTask(taskId, newStatus);
      });
    });
  }

  // Component methods

  toggleAIPanel() {
    this.setState({ showAIPanel: !this.state.showAIPanel });
  }

  setAIMode(mode) {
    this.setState({ aiMode: mode });
    this._updateConnectionStatus();
  }

  selectTask(taskId) {
    this.setState({ selectedTask: taskId });
    
    this.globalEvents.emit('ui:task-card-clicked', {
      taskId,
      source: 'kanban-board'
    });
  }

  startWorkflow() {
    this.globalEvents.emit('ui:workflow-control-action', {
      action: 'start',
      teamId: 'default-team'
    });
  }

  pauseWorkflow() {
    this.globalEvents.emit('ui:workflow-control-action', {
      action: 'pause',
      teamId: 'default-team'
    });
  }

  createDemoTask() {
    const demoTasks = [
      'Implement agent coordination patterns',
      'Add real-time collaboration features', 
      'Build advanced UI animations',
      'Create team management interface',
      'Add workflow analytics dashboard',
      'Implement context evolution system'
    ];
    
    const randomTask = demoTasks[Math.floor(Math.random() * demoTasks.length)];
    
    // Use the global TaskService to create a task
    if (window.projectApp?.services?.taskService) {
      window.projectApp.services.taskService.createTask({
        title: randomTask,
        description: 'Generated demo task for testing the beautiful UI',
        isDeliverable: Math.random() > 0.5
      });
    }
  }

  retry() {
    this.clearError();
    this._loadTasks();
  }

  // Private methods

  _initializeColumns() {
    const columns = [
      { id: 'todo', title: 'To Do', status: TASK_STATUS.TODO },
      { id: 'doing', title: 'In Progress', status: TASK_STATUS.DOING },
      { id: 'blocked', title: 'Blocked', status: TASK_STATUS.BLOCKED },
      { id: 'done', title: 'Done', status: TASK_STATUS.DONE }
    ];
    
    this.setState({ columns });
  }

  _loadTasks() {
    try {
      const tasks = taskService.getAllTasks();
      this.setState({ tasks, loading: false });
    } catch (error) {
      this.setError(error);
    }
  }

  _updateConnectionStatus() {
    // Mock connection status based on AI mode
    const connectionStatus = {
      firebase: this.state.aiMode !== 'offline',
      mcpMax: this.state.aiMode === 'mcp-max',
      webContainer: true
    };
    
    this.setState({ connectionStatus });
  }

  _getTasksForColumn(status) {
    return this.state.tasks.filter(task => task.status === status);
  }

  _getStatusVariant(status) {
    const variants = {
      [TASK_STATUS.TODO]: 'default',
      [TASK_STATUS.DOING]: 'info',
      [TASK_STATUS.BLOCKED]: 'error',
      [TASK_STATUS.DONE]: 'success',
      [TASK_STATUS.AWAITING_VALIDATION]: 'warning'
    };
    
    return variants[status] || 'default';
  }

  _moveTask(taskId, newStatus) {
    try {
      taskService.updateStatus(taskId, newStatus, {
        source: 'kanban-board-drag-drop'
      });
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  }

  // Event handlers

  _handleTaskCreated(data) {
    this._loadTasks();
  }

  _handleTaskStatusChanged(data) {
    this._loadTasks();
  }

  _handleTaskAgentAssigned(data) {
    this._loadTasks();
  }

  _handleAgentStatusChanged(data) {
    // Update UI to reflect agent status changes
    this.render();
  }

  _handleWorkflowStarted(data) {
    this.setState({ workflowStatus: WORKFLOW_STATUS.RUNNING });
  }

  _handleWorkflowCompleted(data) {
    this.setState({ workflowStatus: WORKFLOW_STATUS.FINISHED });
  }

  _handleWorkflowBlocked(data) {
    this.setState({ workflowStatus: WORKFLOW_STATUS.BLOCKED });
  }

  _handleTaskCardClicked(data) {
    // Could show task details modal here
    console.log('Task clicked:', data.taskId);
  }
}

export default KanbanBoardComponent;