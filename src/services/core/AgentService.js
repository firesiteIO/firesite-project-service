/**
 * Agent Service - Core agent functionality with status management
 * Based on KaibanJS analysis for service-first architecture
 */

import { globalEvents } from '../../events/EnhancedEventBus.js';
import { AGENT_STATUS } from '../../events/EventContracts.js';

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Base Agent Service - Foundation for all agent types
 */
export class BaseAgentService {
  constructor(config = {}) {
    // Core properties
    this.id = config.id || generateId();
    this.name = config.name || 'Unnamed Agent';
    this.role = config.role || 'Generic Agent';
    this.goal = config.goal || 'Complete assigned tasks';
    this.background = config.background || 'AI agent designed to assist with various tasks';
    this.tools = config.tools || [];
    this.maxIterations = config.maxIterations || 10;
    this.forceFinalAnswer = config.forceFinalAnswer || false;
    
    // Status management
    this.status = AGENT_STATUS.INITIAL;
    this.currentTask = null;
    this.iterationCount = 0;
    this.lastActivity = Date.now();
    
    // Context and environment
    this.env = {};
    this.context = '';
    this.workingMemory = new Map();
    
    // Performance tracking
    this.stats = {
      tasksCompleted: 0,
      totalIterations: 0,
      averageIterationTime: 0,
      errors: 0,
      successRate: 0
    };
    
    // Event system
    this.globalEvents = null;
    this.initialized = false;
    
    // Promise management for cancellation
    this.activePromises = new Set();
  }

  /**
   * Initialize agent with event system and environment
   * @param {Object} globalEvents - Event system instance
   * @param {Object} env - Environment configuration
   */
  initialize(globalEvents, env = {}) {
    this.globalEvents = globalEvents;
    this.env = { ...this.env, ...env };
    this.initialized = true;
    
    this._setupEventListeners();
    this._emitStatusChange(AGENT_STATUS.INITIAL, 'Agent initialized');
    
    console.log(`Agent ${this.name} (${this.id}) initialized`);
  }

  /**
   * Work on a task using the ReAct pattern
   * @param {Object} task - Task to work on
   * @param {Object} inputs - Task inputs
   * @param {string} context - Additional context
   * @returns {Promise<Object>} Task result
   */
  async workOnTask(task, inputs = {}, context = '') {
    if (!this.initialized) {
      throw new Error('Agent must be initialized before working on tasks');
    }

    this.currentTask = task;
    this.context = context;
    this.iterationCount = 0;
    
    this._emitStatusChange(AGENT_STATUS.ITERATION_START, 'Starting task work');
    
    const startTime = Date.now();
    
    try {
      const result = await this._executeThinkingLoop(task, inputs, context);
      
      // Update stats
      this.stats.tasksCompleted++;
      this.stats.totalIterations += this.iterationCount;
      this.stats.averageIterationTime = (Date.now() - startTime) / this.iterationCount;
      this._updateSuccessRate(true);
      
      this._emitStatusChange(AGENT_STATUS.TASK_COMPLETED, 'Task completed successfully');
      
      return result;
      
    } catch (error) {
      this.stats.errors++;
      this._updateSuccessRate(false);
      
      this.globalEvents.emit('agent:error', {
        agentId: this.id,
        error: error.message,
        taskId: task.id,
        context: this.context,
        stackTrace: error.stack
      });
      
      throw error;
    } finally {
      this.currentTask = null;
      this.iterationCount = 0;
      this._cleanupActivePromises();
    }
  }

  /**
   * Work on feedback for a task
   * @param {Object} task - Task to work on
   * @param {Array} feedbackList - List of feedback items
   * @param {string} context - Additional context
   * @returns {Promise<Object>} Updated result
   */
  async workOnFeedback(task, feedbackList, context) {
    this.currentTask = task;
    this.context = context;
    
    this._emitStatusChange(AGENT_STATUS.THINKING, 'Processing feedback');
    
    // Incorporate feedback into context
    const feedbackContext = feedbackList.map(f => f.content).join('\n');
    const enhancedContext = `${context}\n\nFeedback:\n${feedbackContext}`;
    
    return this.workOnTask(task, {}, enhancedContext);
  }

  /**
   * Resume work on a task
   * @param {Object} task - Task to resume
   * @returns {Promise<void>}
   */
  async workOnTaskResume(task) {
    this.currentTask = task;
    this._emitStatusChange(AGENT_STATUS.ITERATION_START, 'Resuming task work');
    
    // Resume from stored context
    const storedContext = this.workingMemory.get(`task_${task.id}_context`) || '';
    return this.workOnTask(task, {}, storedContext);
  }

  /**
   * Set agent status
   * @param {string} status - New status
   * @param {string} reason - Reason for status change
   */
  setStatus(status, reason = '') {
    this._emitStatusChange(status, reason);
  }

  /**
   * Update environment
   * @param {Object} env - Environment updates
   */
  updateEnv(env) {
    this.env = { ...this.env, ...env };
    console.log(`Agent ${this.name} environment updated`);
  }

  /**
   * Reset agent state
   */
  reset() {
    this.status = AGENT_STATUS.INITIAL;
    this.currentTask = null;
    this.iterationCount = 0;
    this.context = '';
    this.workingMemory.clear();
    this._cleanupActivePromises();
    
    console.log(`Agent ${this.name} reset to initial state`);
  }

  /**
   * Get agent statistics
   * @returns {Object} Agent statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentStatus: this.status,
      currentTask: this.currentTask?.id || null,
      uptime: Date.now() - this.lastActivity,
      workingMemorySize: this.workingMemory.size
    };
  }

  // Private methods

  /**
   * Execute the thinking loop (ReAct pattern)
   * @param {Object} task - Task to work on
   * @param {Object} inputs - Task inputs
   * @param {string} context - Task context
   * @returns {Promise<Object>} Task result
   */
  async _executeThinkingLoop(task, inputs, context) {
    let finalAnswer = null;
    
    while (!finalAnswer && this.iterationCount < this.maxIterations) {
      this.iterationCount++;
      
      this.globalEvents.emit('agent:thinking-start', {
        agentId: this.id,
        taskId: task.id,
        iteration: this.iterationCount,
        context: this.context
      });
      
      this._emitStatusChange(AGENT_STATUS.THINKING, `Iteration ${this.iterationCount}`);
      
      try {
        // Thinking phase
        const thinkingResult = await this._executeThinking(task, inputs, context);
        
        this.globalEvents.emit('agent:thinking-end', {
          agentId: this.id,
          taskId: task.id,
          result: thinkingResult,
          iteration: this.iterationCount
        });
        
        // Determine action type
        const actionType = this._determineActionType(thinkingResult);
        
        switch (actionType) {
          case 'FINAL_ANSWER':
            finalAnswer = this._handleFinalAnswer(thinkingResult);
            break;
            
          case 'EXECUTING_ACTION':
            this.context = await this._executeAction(thinkingResult);
            break;
            
          case 'SELF_QUESTION':
            this._emitStatusChange(AGENT_STATUS.SELF_QUESTION, 'Asking self question');
            this.context += `\nSelf-question: ${thinkingResult.question}`;
            break;
            
          default:
            throw new Error(`Unknown action type: ${actionType}`);
        }
        
        // Store progress in working memory
        this.workingMemory.set(`task_${task.id}_context`, this.context);
        
      } catch (error) {
        this._emitStatusChange(AGENT_STATUS.THINKING_ERROR, error.message);
        throw error;
      }
    }
    
    if (!finalAnswer && this.iterationCount >= this.maxIterations) {
      this._emitStatusChange(AGENT_STATUS.MAX_ITERATIONS_ERROR, 'Maximum iterations exceeded');
      throw new Error(`Agent ${this.name} exceeded maximum iterations (${this.maxIterations})`);
    }
    
    this._emitStatusChange(AGENT_STATUS.FINAL_ANSWER, 'Final answer provided');
    
    this.globalEvents.emit('agent:final-answer', {
      agentId: this.id,
      taskId: task.id,
      answer: finalAnswer,
      iterations: this.iterationCount
    });
    
    return finalAnswer;
  }

  /**
   * Execute thinking phase (override in subclasses)
   * @param {Object} task - Task to think about
   * @param {Object} inputs - Task inputs
   * @param {string} context - Current context
   * @returns {Promise<Object>} Thinking result
   */
  async _executeThinking(task, inputs, context) {
    // Default implementation - override in subclasses
    return {
      thought: `I need to complete task: ${task.description}`,
      action: 'final_answer',
      answer: `Task "${task.title}" has been processed by ${this.name}`
    };
  }

  /**
   * Determine action type from thinking result
   * @param {Object} thinkingResult - Result from thinking
   * @returns {string} Action type
   */
  _determineActionType(thinkingResult) {
    if (thinkingResult.action === 'final_answer' || this.forceFinalAnswer) {
      return 'FINAL_ANSWER';
    }
    
    if (thinkingResult.action && thinkingResult.action !== 'think') {
      return 'EXECUTING_ACTION';
    }
    
    if (thinkingResult.question) {
      return 'SELF_QUESTION';
    }
    
    return 'FINAL_ANSWER'; // Default fallback
  }

  /**
   * Handle final answer
   * @param {Object} thinkingResult - Thinking result
   * @returns {Object} Final answer
   */
  _handleFinalAnswer(thinkingResult) {
    return {
      answer: thinkingResult.answer || thinkingResult.thought,
      confidence: thinkingResult.confidence || 0.8,
      reasoning: thinkingResult.thought,
      iterations: this.iterationCount,
      agentId: this.id,
      timestamp: Date.now()
    };
  }

  /**
   * Execute action (override in subclasses)
   * @param {Object} thinkingResult - Thinking result with action
   * @returns {Promise<string>} Updated context
   */
  async _executeAction(thinkingResult) {
    this._emitStatusChange(AGENT_STATUS.EXECUTING_ACTION, `Executing: ${thinkingResult.action}`);
    
    this.globalEvents.emit('agent:action-executing', {
      agentId: this.id,
      action: thinkingResult.action,
      tool: thinkingResult.tool || 'default',
      taskId: this.currentTask?.id,
      parameters: thinkingResult.parameters
    });
    
    // Default action execution - override in subclasses
    const observation = `Action "${thinkingResult.action}" executed successfully`;
    
    this.globalEvents.emit('agent:observation', {
      agentId: this.id,
      observation,
      context: this.context,
      taskId: this.currentTask?.id,
      iteration: this.iterationCount
    });
    
    this._emitStatusChange(AGENT_STATUS.OBSERVATION, 'Processing observation');
    
    return `${this.context}\nAction: ${thinkingResult.action}\nObservation: ${observation}`;
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Listen for task assignments
    this.globalEvents.on('task:agent-assigned', (data) => {
      if (data.agentId === this.id) {
        console.log(`Agent ${this.name} assigned to task ${data.taskId}`);
      }
    });
    
    // Listen for workflow controls
    this.globalEvents.on('workflow:paused', () => {
      this._cleanupActivePromises();
    });
    
    this.globalEvents.on('workflow:stopped', () => {
      this.reset();
    });
  }

  /**
   * Emit status change event
   * @param {string} newStatus - New status
   * @param {string} reason - Reason for change
   */
  _emitStatusChange(newStatus, reason = '') {
    if (!this.globalEvents) return;
    
    const oldStatus = this.status;
    this.status = newStatus;
    this.lastActivity = Date.now();
    
    this.globalEvents.emit('agent:status-changed', {
      agentId: this.id,
      oldStatus,
      newStatus,
      reason,
      timestamp: this.lastActivity
    });
  }

  /**
   * Update success rate
   * @param {boolean} success - Whether operation was successful
   */
  _updateSuccessRate(success) {
    const totalOperations = this.stats.tasksCompleted + this.stats.errors;
    if (totalOperations > 0) {
      this.stats.successRate = this.stats.tasksCompleted / totalOperations;
    }
  }

  /**
   * Cleanup active promises
   */
  _cleanupActivePromises() {
    for (const promise of this.activePromises) {
      if (promise.abort) {
        promise.abort();
      }
    }
    this.activePromises.clear();
  }

  /**
   * Track promise for cancellation
   * @param {Promise} promise - Promise to track
   */
  _trackPromise(promise) {
    this.activePromises.add(promise);
    promise.finally(() => {
      this.activePromises.delete(promise);
    });
    return promise;
  }
}

/**
 * Agent Factory for creating different agent types
 */
export class AgentFactory {
  static createAgent(type = 'base', config = {}) {
    switch (type.toLowerCase()) {
      case 'base':
      case 'generic':
        return new BaseAgentService(config);
      
      // Future agent types can be added here
      case 'react':
        // Will implement ReactAgentService later
        return new BaseAgentService({ ...config, type: 'react' });
      
      default:
        console.warn(`Unknown agent type: ${type}, creating base agent`);
        return new BaseAgentService(config);
    }
  }
  
  static getAvailableTypes() {
    return ['base', 'generic', 'react'];
  }
}

export default BaseAgentService;