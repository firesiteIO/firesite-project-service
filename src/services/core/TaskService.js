/**
 * Task Service - Task lifecycle management with events
 * Based on KaibanJS analysis for service-first architecture
 */

import { globalEvents } from '../../events/EnhancedEventBus.js';
import { TASK_STATUS } from '../../events/EventContracts.js';

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Task class representing a single task
 */
export class Task {
  constructor(config = {}) {
    // Core properties
    this.id = config.id || generateId();
    this.title = config.title || '';
    this.description = config.description || '';
    this.expectedOutput = config.expectedOutput || '';
    this.isDeliverable = config.isDeliverable || false;
    this.externalValidationRequired = config.externalValidationRequired || false;
    this.allowParallelExecution = config.allowParallelExecution || false;
    this.referenceId = config.referenceId;
    
    // Status and lifecycle
    this.status = TASK_STATUS.TODO;
    this.result = null;
    this.duration = null;
    this.lastUpdated = Date.now();
    this.createdAt = Date.now();
    
    // Dependencies and relationships
    this.dependencies = config.dependencies || [];
    this.dependents = []; // Tasks that depend on this one
    this.agent = config.agent || null;
    this.assignedAgentId = null;
    
    // Context and execution
    this.inputs = config.inputs || {};
    this.context = '';
    this.interpolatedTaskDescription = null;
    this.feedbackHistory = [];
    this.executionHistory = [];
    
    // Validation and output
    this.outputSchema = config.outputSchema || null;
    this.validationResult = null;
    
    // Statistics
    this.stats = {
      iterations: 0,
      startTime: null,
      endTime: null,
      totalThinkingTime: 0,
      totalActionTime: 0,
      retryCount: 0
    };
  }

  /**
   * Convert task to JSON for serialization
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      expectedOutput: this.expectedOutput,
      status: this.status,
      isDeliverable: this.isDeliverable,
      externalValidationRequired: this.externalValidationRequired,
      allowParallelExecution: this.allowParallelExecution,
      dependencies: this.dependencies,
      assignedAgentId: this.assignedAgentId,
      result: this.result,
      duration: this.duration,
      lastUpdated: this.lastUpdated,
      createdAt: this.createdAt,
      stats: this.stats
    };
  }

  /**
   * Create task from JSON
   */
  static fromJSON(data) {
    const task = new Task(data);
    Object.assign(task, data);
    return task;
  }
}

/**
 * Task Service - Manages task lifecycle and coordination
 */
export class TaskService {
  constructor(options = {}) {
    this.tasks = new Map();
    this.tasksByStatus = new Map();
    this.dependencyGraph = new Map();
    this.globalEvents = globalEvents;
    this.initialized = false;
    
    // Configuration
    this.maxConcurrentTasks = options.maxConcurrentTasks || 10;
    this.enableAutoRetry = options.enableAutoRetry !== false;
    this.maxRetries = options.maxRetries || 3;
    
    // Statistics
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageCompletionTime: 0,
      totalProcessingTime: 0
    };
    
    this._initializeStatusMaps();
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (this.initialized) return;
    
    this._setupEventListeners();
    this.initialized = true;
    
    console.log('TaskService initialized');
  }

  /**
   * Create a new task
   * @param {Object} taskConfig - Task configuration
   * @returns {Task} Created task
   */
  createTask(taskConfig) {
    const task = new Task(taskConfig);
    
    // Store task
    this.tasks.set(task.id, task);
    this._addToStatusMap(task.status, task.id);
    this._updateDependencyGraph(task);
    
    // Update statistics
    this.stats.totalTasks++;
    
    // Emit creation event
    this.globalEvents.emit('task:created', {
      task: task.toJSON()
    });
    
    console.log(`Task created: ${task.title} (${task.id})`);
    return task;
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   */
  updateStatus(taskId, newStatus, metadata = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const oldStatus = task.status;
    
    // Update task
    this._removeFromStatusMap(oldStatus, taskId);
    task.status = newStatus;
    task.lastUpdated = Date.now();
    this._addToStatusMap(newStatus, taskId);
    
    // Handle status-specific logic
    this._handleStatusTransition(task, oldStatus, newStatus, metadata);
    
    // Emit status change event
    this.globalEvents.emit('task:status-changed', {
      taskId,
      oldStatus,
      newStatus,
      metadata,
      timestamp: task.lastUpdated
    });
    
    console.log(`Task ${taskId} status: ${oldStatus} → ${newStatus}`);
  }

  /**
   * Assign agent to task
   * @param {string} taskId - Task ID
   * @param {string} agentId - Agent ID
   */
  assignAgent(taskId, agentId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.assignedAgentId = agentId;
    task.lastUpdated = Date.now();
    
    this.globalEvents.emit('task:agent-assigned', {
      taskId,
      agentId,
      timestamp: task.lastUpdated
    });
    
    console.log(`Agent ${agentId} assigned to task ${taskId}`);
  }

  /**
   * Start task execution
   * @param {string} taskId - Task ID
   * @param {Object} context - Execution context
   */
  startTask(taskId, context = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== TASK_STATUS.TODO) {
      throw new Error(`Task ${taskId} cannot be started from status: ${task.status}`);
    }

    // Check dependencies
    if (!this._areDependenciesSatisfied(task)) {
      this.updateStatus(taskId, TASK_STATUS.BLOCKED, {
        reason: 'Unsatisfied dependencies',
        dependencies: this._getUnsatisfiedDependencies(task)
      });
      return;
    }

    // Start execution
    task.stats.startTime = Date.now();
    this.updateStatus(taskId, TASK_STATUS.DOING);
    
    this.globalEvents.emit('task:started', {
      taskId,
      agentId: task.assignedAgentId,
      context,
      timestamp: task.stats.startTime
    });
  }

  /**
   * Complete task
   * @param {string} taskId - Task ID
   * @param {Object} result - Task result
   */
  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update task with result
    task.result = result;
    task.stats.endTime = Date.now();
    task.duration = task.stats.endTime - (task.stats.startTime || task.createdAt);
    
    // Determine final status
    const finalStatus = task.externalValidationRequired 
      ? TASK_STATUS.AWAITING_VALIDATION 
      : TASK_STATUS.DONE;
    
    this.updateStatus(taskId, finalStatus, { result });
    
    // Update statistics
    this.stats.completedTasks++;
    this._updateAverageCompletionTime();
    
    this.globalEvents.emit('task:completed', {
      taskId,
      result,
      duration: task.duration,
      agentId: task.assignedAgentId
    });
    
    // Check if this unblocks other tasks
    this._checkDependentTasks(taskId);
  }

  /**
   * Block task
   * @param {string} taskId - Task ID
   * @param {string} reason - Reason for blocking
   * @param {Array} dependencies - Blocking dependencies
   */
  blockTask(taskId, reason, dependencies = []) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    this.updateStatus(taskId, TASK_STATUS.BLOCKED, {
      reason,
      dependencies
    });
    
    this.globalEvents.emit('task:blocked', {
      taskId,
      reason,
      dependencies,
      agentId: task.assignedAgentId
    });
  }

  /**
   * Provide feedback for task
   * @param {string} taskId - Task ID
   * @param {Object} feedback - Feedback object
   */
  provideFeedback(taskId, feedback) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const feedbackObj = {
      id: generateId(),
      content: feedback.content || feedback,
      providerId: feedback.providerId || 'system',
      timestamp: Date.now(),
      type: feedback.type || 'general'
    };
    
    task.feedbackHistory.push(feedbackObj);
    task.lastUpdated = Date.now();
    
    // If task needs revision, update status
    if (task.status === TASK_STATUS.DONE || task.status === TASK_STATUS.AWAITING_VALIDATION) {
      this.updateStatus(taskId, TASK_STATUS.REVISE, { feedback: feedbackObj });
    }
    
    this.globalEvents.emit('task:feedback-provided', {
      taskId,
      feedback: feedbackObj,
      timestamp: feedbackObj.timestamp
    });
  }

  /**
   * Validate task
   * @param {string} taskId - Task ID
   * @param {Object} validation - Validation result
   */
  validateTask(taskId, validation = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== TASK_STATUS.AWAITING_VALIDATION) {
      throw new Error(`Task ${taskId} is not awaiting validation`);
    }

    task.validationResult = {
      validated: true,
      validator: validation.validator || 'system',
      comments: validation.comments || '',
      timestamp: Date.now()
    };
    
    this.updateStatus(taskId, TASK_STATUS.VALIDATED, { validation: task.validationResult });
    
    this.globalEvents.emit('task:validated', {
      taskId,
      validation: task.validationResult
    });
    
    // Check if this unblocks dependent tasks
    this._checkDependentTasks(taskId);
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @returns {Array<Task>} Tasks with the specified status
   */
  getTasksByStatus(status) {
    const taskIds = this.tasksByStatus.get(status) || [];
    return taskIds.map(id => this.tasks.get(id)).filter(Boolean);
  }

  /**
   * Get task dependencies
   * @param {string} taskId - Task ID
   * @returns {Array<string>} Dependency task IDs
   */
  getDependencies(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.dependencies : [];
  }

  /**
   * Get task dependents
   * @param {string} taskId - Task ID
   * @returns {Array<string>} Dependent task IDs
   */
  getDependents(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.dependents : [];
  }

  /**
   * Get all tasks
   * @returns {Array<Task>} All tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Task|null} Task or null if not found
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalActiveTasks: this.tasks.size,
      tasksByStatus: Object.fromEntries(
        Array.from(this.tasksByStatus.entries())
          .map(([status, taskIds]) => [status, taskIds.length])
      ),
      successRate: this.stats.totalTasks > 0 
        ? this.stats.completedTasks / this.stats.totalTasks 
        : 0
    };
  }

  // Private methods

  /**
   * Initialize status maps
   */
  _initializeStatusMaps() {
    for (const status of Object.values(TASK_STATUS)) {
      this.tasksByStatus.set(status, []);
    }
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Listen to agent status changes
    this.globalEvents.on('agent:status-changed', (data) => {
      // Handle agent status changes that might affect tasks
      this._handleAgentStatusChange(data);
    });
    
    // Listen to workflow events
    this.globalEvents.on('workflow:paused', () => {
      this._pauseAllActiveTasks();
    });
    
    this.globalEvents.on('workflow:resumed', () => {
      this._resumeAllPausedTasks();
    });
  }

  /**
   * Add task to status map
   */
  _addToStatusMap(status, taskId) {
    const statusTasks = this.tasksByStatus.get(status) || [];
    if (!statusTasks.includes(taskId)) {
      statusTasks.push(taskId);
      this.tasksByStatus.set(status, statusTasks);
    }
  }

  /**
   * Remove task from status map
   */
  _removeFromStatusMap(status, taskId) {
    const statusTasks = this.tasksByStatus.get(status) || [];
    const index = statusTasks.indexOf(taskId);
    if (index > -1) {
      statusTasks.splice(index, 1);
      this.tasksByStatus.set(status, statusTasks);
    }
  }

  /**
   * Update dependency graph
   */
  _updateDependencyGraph(task) {
    // Add task to graph
    if (!this.dependencyGraph.has(task.id)) {
      this.dependencyGraph.set(task.id, new Set());
    }
    
    // Add dependencies
    for (const depId of task.dependencies) {
      this.dependencyGraph.get(task.id).add(depId);
      
      // Add this task as dependent of the dependency
      const depTask = this.tasks.get(depId);
      if (depTask && !depTask.dependents.includes(task.id)) {
        depTask.dependents.push(task.id);
      }
    }
  }

  /**
   * Handle status transitions
   */
  _handleStatusTransition(task, oldStatus, newStatus, metadata) {
    switch (newStatus) {
      case TASK_STATUS.DOING:
        if (!task.stats.startTime) {
          task.stats.startTime = Date.now();
        }
        break;
        
      case TASK_STATUS.DONE:
      case TASK_STATUS.VALIDATED:
        if (!task.stats.endTime) {
          task.stats.endTime = Date.now();
        }
        break;
        
      case TASK_STATUS.BLOCKED:
        this.globalEvents.emit('task:blocked', {
          taskId: task.id,
          reason: metadata.reason || 'Unknown',
          dependencies: metadata.dependencies || []
        });
        break;
        
      case TASK_STATUS.AWAITING_VALIDATION:
        this.globalEvents.emit('task:validation-required', {
          taskId: task.id,
          requirements: metadata.requirements || []
        });
        break;
    }
  }

  /**
   * Check if dependencies are satisfied
   */
  _areDependenciesSatisfied(task) {
    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && (
        depTask.status === TASK_STATUS.DONE || 
        depTask.status === TASK_STATUS.VALIDATED
      );
    });
  }

  /**
   * Get unsatisfied dependencies
   */
  _getUnsatisfiedDependencies(task) {
    return task.dependencies.filter(depId => {
      const depTask = this.tasks.get(depId);
      return !depTask || (
        depTask.status !== TASK_STATUS.DONE && 
        depTask.status !== TASK_STATUS.VALIDATED
      );
    });
  }

  /**
   * Check dependent tasks for unblocking
   */
  _checkDependentTasks(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    for (const dependentId of task.dependents) {
      const dependentTask = this.tasks.get(dependentId);
      if (dependentTask && 
          dependentTask.status === TASK_STATUS.BLOCKED && 
          this._areDependenciesSatisfied(dependentTask)) {
        
        this.updateStatus(dependentId, TASK_STATUS.TODO, {
          reason: 'Dependencies satisfied'
        });
      }
    }
  }

  /**
   * Handle agent status changes
   */
  _handleAgentStatusChange(data) {
    // Find tasks assigned to this agent
    const agentTasks = Array.from(this.tasks.values())
      .filter(task => task.assignedAgentId === data.agentId);
    
    for (const task of agentTasks) {
      // Handle agent errors
      if (data.newStatus === 'TASK_COMPLETED' && task.status === TASK_STATUS.DOING) {
        // Agent completed task but task service didn't know
        console.warn(`Task ${task.id} completed by agent but service not notified`);
      }
    }
  }

  /**
   * Pause all active tasks
   */
  _pauseAllActiveTasks() {
    const activeTasks = this.getTasksByStatus(TASK_STATUS.DOING);
    for (const task of activeTasks) {
      this.updateStatus(task.id, TASK_STATUS.PAUSED, {
        reason: 'Workflow paused'
      });
    }
  }

  /**
   * Resume all paused tasks
   */
  _resumeAllPausedTasks() {
    const pausedTasks = this.getTasksByStatus(TASK_STATUS.PAUSED);
    for (const task of pausedTasks) {
      this.updateStatus(task.id, TASK_STATUS.DOING, {
        reason: 'Workflow resumed'
      });
    }
  }

  /**
   * Update average completion time
   */
  _updateAverageCompletionTime() {
    const completedTasks = this.getTasksByStatus(TASK_STATUS.DONE)
      .concat(this.getTasksByStatus(TASK_STATUS.VALIDATED));
    
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0);
      this.stats.averageCompletionTime = totalTime / completedTasks.length;
      this.stats.totalProcessingTime = totalTime;
    }
  }
}

// Create and export singleton instance
export const taskService = new TaskService();
export default taskService;