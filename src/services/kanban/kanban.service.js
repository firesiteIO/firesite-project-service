/**
 * Kanban Service
 * Core service for managing Kanban boards, columns, and tasks
 */

import { eventBus } from '../../core/events/event-bus.js';
import { config } from '../../core/config/firebase-config.js';
import { firebaseService } from '../firebase-service.js';
import { v4 as uuidv4 } from 'uuid';

export class KanbanService {
  constructor() {
    this.boards = new Map();
    this.tasks = new Map();
    this.columns = new Map();
    this.currentBoardId = null;
    this.currentProjectId = null;
    this.isInitialized = false;
    
    // Default column configuration
    this.defaultColumns = [
      { id: 'todo', title: 'To Do', color: '#6b7280', order: 0 },
      { id: 'in-progress', title: 'In Progress', color: '#f59e0b', order: 1 },
      { id: 'review', title: 'Review', color: '#8b5cf6', order: 2 },
      { id: 'done', title: 'Done', color: '#10b981', order: 3 }
    ];
    
    this._setupEventListeners();
  }

  /**
   * Initialize the Kanban service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('📋 Initializing Kanban Service...');
      
      // Initialize Firebase service first
      await firebaseService.initialize();
      
      // Load data from Firebase and storage
      await this._loadFromStorage();
      
      // Try to create default project if Firebase is available
      try {
        const projects = await firebaseService.getProjects();
        if (projects.length === 0) {
          await this.createDefaultProject();
        }
        
        // Load tasks from Firebase
        await this._syncTasksFromFirebase();
      } catch (error) {
        console.log('📴 Firebase not available, running in offline mode');
        // Create a local project for offline development
        this.currentProjectId = 'local-project-' + Date.now();
        await this._saveToStorage();
      }
      
      // Create default board if none exists
      if (this.boards.size === 0) {
        await this.createDefaultBoard();
      }
      
      // Set current board to first available
      if (!this.currentBoardId && this.boards.size > 0) {
        this.currentBoardId = this.boards.keys().next().value;
      }
      
      this.isInitialized = true;
      eventBus.emit('kanban:initialized', { service: this });
      
      console.log('✅ Kanban Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Kanban Service:', error);
      throw error;
    }
  }

  /**
   * Create a new board
   */
  async createBoard(name, description = '') {
    const boardId = uuidv4();
    const board = {
      id: boardId,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columnOrder: this.defaultColumns.map(col => col.id)
    };
    
    this.boards.set(boardId, board);
    
    // Create default columns for the board
    for (const columnConfig of this.defaultColumns) {
      const column = {
        ...columnConfig,
        boardId,
        tasks: []
      };
      this.columns.set(`${boardId}:${columnConfig.id}`, column);
    }
    
    await this._saveToStorage();
    eventBus.emit('kanban:board:created', { board });
    
    return board;
  }

  /**
   * Create default board for new users
   */
  async createDefaultBoard() {
    const board = await this.createBoard(
      'Firesite Project Service Development',
      'AI-powered Kanban board for managing the development of this very system'
    );
    
    // Set this as the current board
    this.currentBoardId = board.id;
    
    // Add some initial tasks to demonstrate the system
    await this.createTask({
      title: 'Set up basic Kanban functionality',
      description: 'Create the core Kanban board with drag-and-drop support',
      columnId: 'in-progress',
      boardId: board.id,
      priority: 'high',
      labels: ['development', 'core']
    });
    
    await this.createTask({
      title: 'Integrate AI assistance for task management',
      description: 'Connect with MCP MAX for AI-powered task suggestions and management',
      columnId: 'todo',
      boardId: board.id,
      priority: 'high',
      labels: ['ai', 'integration']
    });
    
    await this.createTask({
      title: 'Implement real-time collaboration features',
      description: 'Add Firebase real-time updates for multi-user collaboration',
      columnId: 'todo',
      boardId: board.id,
      priority: 'medium',
      labels: ['collaboration', 'firebase']
    });

    // Save the updated state with currentBoardId
    await this._saveToStorage();

    return board;
  }

  /**
   * Create default project in Firebase
   */
  async createDefaultProject() {
    try {
      const project = await firebaseService.createProject({
        name: 'Firesite Project Service Development',
        description: 'AI-powered project management for developing the Firesite Project Service'
      });
      
      this.currentProjectId = project.id;
      await this._saveToStorage();
      
      console.log('✅ Default project created:', project.id);
      return project;
    } catch (error) {
      console.error('❌ Error creating default project:', error);
      throw error;
    }
  }

  /**
   * Sync tasks from Firebase Functions
   */
  async _syncTasksFromFirebase() {
    try {
      if (!this.currentProjectId) return;
      
      const firebaseTasks = await firebaseService.getTasks({ 
        projectId: this.currentProjectId 
      });
      
      // Convert Firebase tasks to local format
      for (const firebaseTask of firebaseTasks) {
        const task = {
          id: firebaseTask.id,
          title: firebaseTask.title,
          description: firebaseTask.description || '',
          columnId: firebaseTask.status || 'todo',
          boardId: this.currentBoardId,
          priority: firebaseTask.priority || 'medium',
          labels: [],
          assignee: null,
          dueDate: null,
          estimatedHours: null,
          createdAt: firebaseTask.createdAt,
          updatedAt: firebaseTask.updatedAt,
          createdBy: firebaseTask.createdBy,
          aiGenerated: false,
          aiSuggestions: []
        };
        
        this.tasks.set(task.id, task);
      }
      
      console.log(`✅ Synced ${firebaseTasks.length} tasks from Firebase`);
    } catch (error) {
      console.error('❌ Error syncing tasks from Firebase:', error);
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      let task;
      
      // Try to create task in Firebase Functions first
      try {
        const firebaseTask = await firebaseService.createTask({
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.columnId || 'todo',
          priority: taskData.priority || 'medium',
          projectId: taskData.projectId || this.currentProjectId
        });

        // Create local task for board display
        task = {
          id: firebaseTask.id,
          title: firebaseTask.title,
          description: firebaseTask.description || '',
          columnId: firebaseTask.status,
          boardId: taskData.boardId,
          priority: firebaseTask.priority,
          labels: taskData.labels || [],
          assignee: taskData.assignee || null,
          dueDate: taskData.dueDate || null,
          estimatedHours: taskData.estimatedHours || null,
          createdAt: firebaseTask.createdAt,
          updatedAt: firebaseTask.updatedAt,
          createdBy: firebaseTask.createdBy,
          aiGenerated: taskData.aiGenerated || false,
          aiSuggestions: taskData.aiSuggestions || []
        };
      } catch (firebaseError) {
        console.log('📴 Firebase unavailable, creating local task');
        
        // Create local task without Firebase
        const taskId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        task = {
          id: taskId,
          title: taskData.title,
          description: taskData.description || '',
          columnId: taskData.columnId || 'todo',
          boardId: taskData.boardId,
          priority: taskData.priority || 'medium',
          labels: taskData.labels || [],
          assignee: taskData.assignee || null,
          dueDate: taskData.dueDate || null,
          estimatedHours: taskData.estimatedHours || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'offline-user',
          aiGenerated: taskData.aiGenerated || false,
          aiSuggestions: taskData.aiSuggestions || [],
          offline: true // Mark as offline task
        };
      }
      
      this.tasks.set(task.id, task);
      
      // Add task to column
      const columnKey = `${taskData.boardId}:${task.columnId}`;
      const column = this.columns.get(columnKey);
      if (column) {
        column.tasks.push(task.id);
      }
      
      await this._saveToStorage();
      eventBus.emit('kanban:task:created', { task });
      
      return task;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  /**
   * Move task between columns
   */
  async moveTask(taskId, newColumnId, newIndex = -1) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    const oldColumnKey = `${task.boardId}:${task.columnId}`;
    const newColumnKey = `${task.boardId}:${newColumnId}`;
    
    const oldColumn = this.columns.get(oldColumnKey);
    const newColumn = this.columns.get(newColumnKey);
    
    if (!oldColumn || !newColumn) {
      throw new Error('Invalid column');
    }
    
    // Remove from old column
    const oldIndex = oldColumn.tasks.indexOf(taskId);
    if (oldIndex > -1) {
      oldColumn.tasks.splice(oldIndex, 1);
    }
    
    // Add to new column
    if (newIndex >= 0 && newIndex < newColumn.tasks.length) {
      newColumn.tasks.splice(newIndex, 0, taskId);
    } else {
      newColumn.tasks.push(taskId);
    }
    
    // Update task
    task.columnId = newColumnId;
    task.updatedAt = new Date().toISOString();
    
    await this._saveToStorage();
    eventBus.emit('kanban:task:moved', { 
      task, 
      oldColumnId: task.columnId, 
      newColumnId,
      oldIndex,
      newIndex 
    });
    
    return task;
  }

  /**
   * Update task
   */
  async updateTask(taskId, updates) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      
      // Update task in Firebase
      const firebaseUpdates = {
        title: updates.title,
        description: updates.description,
        status: updates.columnId || updates.status,
        priority: updates.priority
      };
      
      const updatedFirebaseTask = await firebaseService.updateTask(taskId, firebaseUpdates);
      
      // Update local task
      Object.assign(task, updates, {
        updatedAt: updatedFirebaseTask.updatedAt
      });
      
      await this._saveToStorage();
      eventBus.emit('kanban:task:updated', { task, updates });
      
      return task;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      
      // Delete from Firebase
      await firebaseService.deleteTask(taskId);
      
      // Remove from column
      const columnKey = `${task.boardId}:${task.columnId}`;
      const column = this.columns.get(columnKey);
      if (column) {
        const index = column.tasks.indexOf(taskId);
        if (index > -1) {
          column.tasks.splice(index, 1);
        }
      }
      
      this.tasks.delete(taskId);
      
      await this._saveToStorage();
      eventBus.emit('kanban:task:deleted', { task });
      
      return task;
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Get current board data
   */
  getCurrentBoard() {
    if (!this.currentBoardId) return null;
    
    const board = this.boards.get(this.currentBoardId);
    if (!board) return null;
    
    const columns = board.columnOrder.map(columnId => {
      const column = this.columns.get(`${this.currentBoardId}:${columnId}`);
      if (!column) return null;
      
      const tasks = column.tasks.map(taskId => this.tasks.get(taskId)).filter(Boolean);
      
      return {
        ...column,
        tasks
      };
    }).filter(Boolean);
    
    return {
      ...board,
      columns
    };
  }

  /**
   * Set up event listeners
   */
  _setupEventListeners() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'firesite-kanban') {
        this._loadFromStorage();
        eventBus.emit('kanban:external:update');
      }
    });
  }

  /**
   * Load data from storage
   */
  async _loadFromStorage() {
    try {
      if (config.features.offlineMode) {
        // Load from localStorage for offline mode
        const data = localStorage.getItem('firesite-kanban');
        if (data) {
          const parsed = JSON.parse(data);
          this.boards = new Map(parsed.boards || []);
          this.tasks = new Map(parsed.tasks || []);
          this.columns = new Map(parsed.columns || []);
          this.currentBoardId = parsed.currentBoardId || null;
          this.currentProjectId = parsed.currentProjectId || null;
        }
      }
    } catch (error) {
      console.error('Failed to load Kanban data from storage:', error);
    }
  }

  /**
   * Save data to storage
   */
  async _saveToStorage() {
    try {
      if (config.features.offlineMode) {
        // Save to localStorage for offline mode
        const data = {
          boards: Array.from(this.boards.entries()),
          tasks: Array.from(this.tasks.entries()),
          columns: Array.from(this.columns.entries()),
          currentBoardId: this.currentBoardId,
          currentProjectId: this.currentProjectId,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('firesite-kanban', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save Kanban data to storage:', error);
    }
  }
}

// Export singleton instance
export const kanbanService = new KanbanService();
export default kanbanService;