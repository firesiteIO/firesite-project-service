/**
 * Real Kanban Board Component
 * Main UI component for rendering and managing the REAL Kanban board
 * Uses actual services - no mock data or fake AI agents
 */

import { eventBus } from '../../core/events/event-bus.js';
import { kanbanService } from '../../services/kanban/kanban.service.js';
import { aiService } from '../../services/ai-service.js';
import { kaibanService } from '../../services/kaiban-service.js';
import Sortable from 'sortablejs';

export class KanbanBoard {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.board = null;
    this.sortableInstances = [];
    this.isInitialized = false;
    
    this._setupEventListeners();
  }

  /**
   * Initialize the Kanban board
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🎯 Initializing Kanban Board UI...');
      
      if (!this.container) {
        throw new Error(`Container with ID '${this.containerId}' not found`);
      }
      
      // Wait for Kanban service to be ready
      if (!kanbanService.isInitialized) {
        await kanbanService.initialize();
      }
      
      this.board = kanbanService.getCurrentBoard();
      this.render();
      this._setupDragAndDrop();
      
      this.isInitialized = true;
      eventBus.emit('kanban-board:initialized', { component: this });
      
      console.log('✅ Kanban Board UI initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Kanban Board:', error);
      throw error;
    }
  }

  /**
   * Render the entire board - REAL Kanban with REAL services
   */
  render() {
    if (!this.board) {
      this.container.innerHTML = this._renderEmptyState();
      return;
    }

    // Add AI controls and real Kanban board
    this.container.innerHTML = `
      <!-- Real AI Integration Panel -->
      <div class="ai-integration-panel mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Real AI Services</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Connected to Firebase Functions & MCP MAX</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button id="ai-analyze-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors">
              Analyze Tasks
            </button>
            <button id="ai-suggest-btn" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors">
              AI Suggestions
            </button>
          </div>
        </div>
      </div>

      <!-- Real Kanban Board Grid -->
      <div class="kanban-board-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${this.board.columns.map(column => this._renderColumn(column)).join('')}
      </div>
    `;
    
    // Setup AI controls
    this._setupAIControls();
    
    // Re-setup drag and drop after re-render
    this._setupDragAndDrop();
  }

  /**
   * Render a single column
   */
  _renderColumn(column) {
    const tasksHtml = column.tasks.map(task => this._renderTask(task)).join('');
    
    return `
      <div class="kanban-column bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4" 
           data-column-id="${column.id}">
        <!-- Column Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${column.color}"></div>
            <h3 class="font-medium text-gray-900 dark:text-white">${column.title}</h3>
            <span class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
              ${column.tasks.length}
            </span>
          </div>
          <button class="add-task-column-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  data-column-id="${column.id}"
                  title="Add task to ${column.title}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
        
        <!-- Tasks Container -->
        <div class="kanban-tasks space-y-3 min-h-[200px]" data-column-id="${column.id}">
          ${tasksHtml}
        </div>
        
        <!-- Add Task Button -->
        <button class="add-task-btn w-full mt-4 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:hover:border-gray-500 dark:hover:text-gray-300 transition-colors"
                data-column-id="${column.id}">
          <span class="text-sm">+ Add a task</span>
        </button>
      </div>
    `;
  }

  /**
   * Render a single task card
   */
  _renderTask(task) {
    const priorityColors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    
    const labelsHtml = task.labels.map(label => 
      `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded-full">${label}</span>`
    ).join(' ');
    
    const aiIcon = task.aiGenerated ? `
      <div class="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" title="AI Generated via Real Services">
        <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
    ` : '';
    
    const connectionIcon = task.offline ? `
      <div class="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center" title="Created in Offline Mode">
        <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4l12 12M4 16l12-12"></path>
        </svg>
      </div>
    ` : `
      <div class="absolute top-2 left-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="Connected to Real Services">
        <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
        </svg>
      </div>
    `;
    
    return `
      <div class="kanban-task bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-3 cursor-move hover:shadow-md transition-shadow relative"
           data-task-id="${task.id}"
           data-column-id="${task.columnId}">
        ${connectionIcon}
        ${aiIcon}
        
        <!-- Task Content -->
        <div class="mb-2">
          <h4 class="font-medium text-gray-900 dark:text-white text-sm mb-1 pr-8 pl-6">
            ${task.title}
          </h4>
          ${task.description ? `
            <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
              ${task.description}
            </p>
          ` : ''}
        </div>
        
        <!-- Task Meta -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <span class="priority-badge px-2 py-1 rounded-full ${priorityColors[task.priority]}">
              ${task.priority}
            </span>
            ${task.estimatedHours ? `
              <span class="text-gray-500 dark:text-gray-400">
                ${task.estimatedHours}h
              </span>
            ` : ''}
          </div>
          
          <div class="flex items-center space-x-1">
            ${task.dueDate ? `
              <span class="text-gray-500 dark:text-gray-400">
                ${new Date(task.dueDate).toLocaleDateString()}
              </span>
            ` : ''}
            <button class="task-menu-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    data-task-id="${task.id}">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Labels -->
        ${labelsHtml ? `
          <div class="mt-2 flex flex-wrap gap-1">
            ${labelsHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render empty state
   */
  _renderEmptyState() {
    return `
      <div class="col-span-full flex items-center justify-center py-12">
        <div class="text-center">
          <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No board available</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">Create your first project board to get started</p>
          <button id="create-board-btn" class="bg-firesite-500 hover:bg-firesite-600 text-white px-4 py-2 rounded-lg transition-colors">
            Create Board
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Set up drag and drop functionality
   */
  _setupDragAndDrop() {
    // Destroy existing sortable instances
    this.sortableInstances.forEach(instance => instance.destroy());
    this.sortableInstances = [];

    // Set up sortable for each column
    const taskContainers = this.container.querySelectorAll('.kanban-tasks');
    
    taskContainers.forEach(container => {
      const sortable = Sortable.create(container, {
        group: 'kanban-tasks',
        animation: 150,
        ghostClass: 'kanban-task-ghost',
        chosenClass: 'kanban-task-chosen',
        dragClass: 'kanban-task-drag',
        
        onEnd: (evt) => {
          this._handleTaskMove(evt);
        }
      });
      
      this.sortableInstances.push(sortable);
    });
  }

  /**
   * Handle task move via drag and drop
   */
  async _handleTaskMove(evt) {
    const taskId = evt.item.dataset.taskId;
    const newColumnId = evt.to.dataset.columnId;
    const newIndex = evt.newIndex;
    
    try {
      await kanbanService.moveTask(taskId, newColumnId, newIndex);
      console.log(`✅ Task ${taskId} moved to ${newColumnId} at index ${newIndex}`);
    } catch (error) {
      console.error('❌ Failed to move task:', error);
      // Revert the move in UI
      this.render();
    }
  }

  /**
   * Setup AI controls
   */
  _setupAIControls() {
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const suggestBtn = document.getElementById('ai-suggest-btn');
    
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this._handleAIAnalysis());
    }
    
    if (suggestBtn) {
      suggestBtn.addEventListener('click', () => this._handleAISuggestions());
    }
  }

  /**
   * Handle AI analysis of current tasks
   */
  async _handleAIAnalysis() {
    console.log('🤖 Running AI analysis of tasks...');
    
    if (!this.board || !this.board.columns) {
      console.warn('⚠️ No board data available for analysis');
      return;
    }

    try {
      // Collect all tasks from all columns
      const allTasks = this.board.columns.flatMap(column => column.tasks);
      
      if (allTasks.length === 0) {
        alert('No tasks available for analysis. Add some tasks first!');
        return;
      }

      // Use real AI service for analysis
      const analysis = await aiService.analyzeBoard({
        tasks: allTasks,
        columns: this.board.columns,
        boardName: this.board.name
      });

      // Show results
      alert(`AI Analysis Results:\n\n${analysis.summary || 'Analysis completed!'}`);
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      alert('AI analysis temporarily unavailable. Running in offline mode.');
    }
  }

  /**
   * Handle AI suggestions for new tasks
   */
  async _handleAISuggestions() {
    console.log('🤖 Getting AI suggestions for new tasks...');
    
    try {
      // Use real AI service for suggestions
      const suggestions = await aiService.generateTaskSuggestions({
        currentTasks: this.board?.columns?.flatMap(c => c.tasks) || [],
        boardContext: this.board?.name || 'Project Board'
      });

      if (suggestions && suggestions.length > 0) {
        const suggestionText = suggestions.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n');
        const choice = prompt(`AI Suggestions:\n\n${suggestionText}\n\nChoose a number to add (1-${suggestions.length}) or Cancel:`);
        
        if (choice && choice >= 1 && choice <= suggestions.length) {
          const selectedSuggestion = suggestions[choice - 1];
          await kanbanService.createTask({
            ...selectedSuggestion,
            boardId: this.board.id,
            aiGenerated: true
          });
        }
      } else {
        alert('AI suggestions temporarily unavailable. Running in offline mode.');
      }
      
    } catch (error) {
      console.error('❌ AI suggestions failed:', error);
      alert('AI suggestions temporarily unavailable. Running in offline mode.');
    }
  }

  /**
   * Set up event listeners
   */
  _setupEventListeners() {
    // Listen for Kanban service events
    eventBus.on('kanban:task:created', () => {
      this.board = kanbanService.getCurrentBoard();
      this.render();
    });
    
    eventBus.on('kanban:task:updated', () => {
      this.board = kanbanService.getCurrentBoard();
      this.render();
    });
    
    eventBus.on('kanban:task:deleted', () => {
      this.board = kanbanService.getCurrentBoard();
      this.render();
    });
    
    eventBus.on('kanban:task:moved', () => {
      this.board = kanbanService.getCurrentBoard();
      // Don't re-render here to avoid interrupting drag and drop
    });
    
    // Handle UI interactions
    this.container.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      
      if (target.classList.contains('add-task-btn') || target.classList.contains('add-task-column-btn')) {
        const columnId = target.dataset.columnId;
        this._handleAddTask(columnId);
      } else if (target.classList.contains('task-menu-btn')) {
        const taskId = target.dataset.taskId;
        this._handleTaskMenu(taskId, event);
      } else if (target.id === 'create-board-btn') {
        this._handleCreateBoard();
      }
    });
  }

  /**
   * Handle add task button click
   */
  _handleAddTask(columnId) {
    eventBus.emit('kanban-board:add-task-requested', { columnId });
  }

  /**
   * Handle task menu button click
   */
  _handleTaskMenu(taskId, event) {
    eventBus.emit('kanban-board:task-menu-requested', { taskId, event });
  }

  /**
   * Handle create board button click
   */
  _handleCreateBoard() {
    eventBus.emit('kanban-board:create-board-requested');
  }
}

export default KanbanBoard;