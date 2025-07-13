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
      container: 'fs-relative fs-bg-slate-900 fs-overflow-hidden fs-rounded-xl fs-ring-1 fs-ring-slate-700',
      fullScreen: 'fs-fixed fs-top-0 fs-left-0 fs-w-screen fs-h-screen fs-z-50',
      
      // AI Integration Panel
      aiPanel: {
        container: 'fs-ai-integration-panel fs-mb-6 fs-bg-gradient-to-r fs-from-blue-50 fs-to-purple-50 fs-p-4 fs-rounded-lg',
        header: 'fs-flex fs-justify-between fs-items-center fs-mb-4',
        title: 'fs-text-lg fs-font-medium fs-text-slate-800',
        controls: 'fs-flex fs-gap-2',
        status: 'fs-flex fs-items-center fs-gap-2 fs-text-sm',
        indicator: {
          online: 'fs-w-2 fs-h-2 fs-rounded-full fs-bg-green-500',
          offline: 'fs-w-2 fs-h-2 fs-rounded-full fs-bg-red-500',
          unknown: 'fs-w-2 fs-h-2 fs-rounded-full fs-bg-yellow-500'
        }
      },
      
      // Board layout
      board: {
        desktop: 'fs-hidden md:fs-grid fs-grid-cols-4 fs-gap-3 fs-divide-x fs-divide-slate-700',
        mobile: 'fs-block md:fs-hidden',
        column: 'fs-px-3 fs-min-h-0 fs-flex fs-flex-col',
        columnHeader: 'fs-flex fs-justify-between fs-items-center fs-mb-4',
        columnTitle: 'fs-text-sm fs-font-medium fs-text-slate-200',
        columnCount: 'fs-text-xs fs-text-slate-400',
        taskList: 'fs-space-y-3 fs-flex-1 fs-overflow-y-auto'
      },
      
      // Task cards based on KaibanJS analysis
      task: {
        card: 'fs-ring-1 fs-ring-slate-950 fs-rounded-lg fs-bg-slate-800 fs-p-4 hover:fs-ring-indigo-500 fs-cursor-pointer fs-transition-all fs-duration-200',
        header: 'fs-flex fs-justify-between fs-items-start',
        title: 'fs-text-sm fs-font-medium fs-text-slate-200',
        description: 'fs-text-xs fs-text-slate-400 fs-mt-2',
        tags: 'fs-mt-3 fs-flex fs-gap-2 fs-flex-wrap',
        footer: 'fs-mt-3 fs-flex fs-justify-between fs-items-center',
        progress: 'fs-flex fs-items-center fs-gap-1'
      },
      
      // Status badges from KaibanJS
      status: {
        todo: 'fs-bg-slate-500/15 fs-text-slate-400',
        doing: 'fs-bg-blue-500/15 fs-text-blue-400',
        blocked: 'fs-bg-red-500/15 fs-text-red-400',
        done: 'fs-bg-green-500/15 fs-text-green-400',
        awaitingValidation: 'fs-bg-indigo-500/15 fs-text-indigo-500'
      },
      
      // Activity indicators
      activity: {
        counter: 'fs-bg-slate-400 fs-rounded-full fs-px-1 fs-text-[10px] fs-text-slate-900 fs-font-medium group-hover:fs-bg-indigo-500',
        label: 'fs-text-xs fs-text-slate-400'
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
        
        <div class="fs-grid fs-grid-cols-1 md:fs-grid-cols-3 fs-gap-4">
          <!-- Connection Status -->
          <div class="fs-bg-white/5 fs-p-3 fs-rounded">
            <h4 class="fs-text-sm fs-font-medium fs-text-slate-700 fs-mb-2">Connection Status</h4>
            <div class="fs-space-y-2">
              ${this._renderConnectionStatus('Firebase Functions', connectionStatus.firebase)}
              ${this._renderConnectionStatus('MCP Max Server', connectionStatus.mcpMax)}
              ${this._renderConnectionStatus('WebContainer', connectionStatus.webContainer)}
            </div>
          </div>
          
          <!-- AI Mode -->
          <div class="fs-bg-white/5 fs-p-3 fs-rounded">
            <h4 class="fs-text-sm fs-font-medium fs-text-slate-700 fs-mb-2">AI Mode</h4>
            <div class="fs-text-sm fs-text-slate-600">
              <strong>Current:</strong> ${aiMode}
            </div>
            <div class="fs-mt-2">
              <select class="fs-text-xs fs-p-1 fs-rounded fs-bg-white/10" onchange="this.closest('[data-component]').__component.setAIMode(this.value)">
                <option value="development" ${aiMode === 'development' ? 'selected' : ''}>Development</option>
                <option value="mcp-max" ${aiMode === 'mcp-max' ? 'selected' : ''}>MCP Max</option>
                <option value="offline" ${aiMode === 'offline' ? 'selected' : ''}>Offline</option>
              </select>
            </div>
          </div>
          
          <!-- Workflow Status -->
          <div class="fs-bg-white/5 fs-p-3 fs-rounded">
            <h4 class="fs-text-sm fs-font-medium fs-text-slate-700 fs-mb-2">Workflow</h4>
            <div class="fs-text-sm fs-text-slate-600">
              <strong>Status:</strong> ${workflowStatus}
            </div>
            <div class="fs-mt-2 fs-flex fs-gap-1">
              <button class="${this.classes.button.primary} fs-text-xs fs-py-1 fs-px-2" onclick="this.closest('[data-component]').__component.startWorkflow()">
                Start
              </button>
              <button class="${this.classes.button.secondary} fs-text-xs fs-py-1 fs-px-2" onclick="this.closest('[data-component]').__component.pauseWorkflow()">
                Pause
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
        <span class="fs-text-xs fs-text-slate-600">${name}</span>
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
        <div class="fs-text-center fs-text-slate-400 fs-p-8">
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
        <div class="fs-text-xs fs-text-slate-500">
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
        zone.classList.add('fs-bg-indigo-500/10');
      });
      
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('fs-bg-indigo-500/10');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('fs-bg-indigo-500/10');
        
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