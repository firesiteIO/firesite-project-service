/**
 * Firebase Functions Integration Service
 * Provides real connection to Firebase Functions API endpoints
 */

import { eventBus } from '../core/events/event-bus.js';

export class FirebaseService {
  constructor() {
    // Firebase Functions URL - using the real Firebase project ID from the context
    this.baseURL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://localhost:5001/firesite-ai-f3bc8/us-central1';
    this.apiURL = `${this.baseURL}/api`;
    this.claudeURL = `${this.baseURL}/claude`;
    this.isInitialized = false;
  }

  /**
   * Initialize Firebase service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔥 Initializing Firebase service...');
      
      // Test connection to Firebase Functions
      const healthCheck = await this._testConnection();
      if (!healthCheck.success) {
        console.warn('⚠️ Firebase Functions not available, some features may be limited');
      }

      this.isInitialized = true;
      eventBus.emit('firebase:initialized', { service: this });
      
      console.log('✅ Firebase service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase service:', error);
      throw error;
    }
  }

  // Task Management API

  /**
   * Get all tasks
   * @param {Object} params - Query parameters (projectId, status)
   * @returns {Promise<Array>} Array of tasks
   */
  async getTasks(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${this.apiURL}/tasks?${queryString}` : `${this.apiURL}/tasks`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get tasks: ${response.status} ${response.statusText}`);
      }

      const tasks = await response.json();
      eventBus.emit('firebase:tasks-loaded', { tasks });
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      eventBus.emit('firebase:error', { operation: 'getTasks', error: error.message });
      throw error;
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task object
   */
  async getTask(taskId) {
    try {
      const response = await fetch(`${this.apiURL}/tasks/${taskId}`, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get task: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching task:', error);
      eventBus.emit('firebase:error', { operation: 'getTask', error: error.message });
      throw error;
    }
  }

  /**
   * Create new task
   * @param {Object} task - Task data (must include title)
   * @returns {Promise<Object>} Created task with ID
   */
  async createTask(task) {
    try {
      const response = await fetch(`${this.apiURL}/tasks`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create task: ${response.status}`);
      }

      const createdTask = await response.json();
      eventBus.emit('firebase:task-created', { task: createdTask });
      return createdTask;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      eventBus.emit('firebase:error', { operation: 'createTask', error: error.message });
      throw error;
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Task updates
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`${this.apiURL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }

      const updatedTask = await response.json();
      eventBus.emit('firebase:task-updated', { task: updatedTask });
      return updatedTask;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      eventBus.emit('firebase:error', { operation: 'updateTask', error: error.message });
      throw error;
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    try {
      const response = await fetch(`${this.apiURL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
      }

      eventBus.emit('firebase:task-deleted', { taskId });
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      eventBus.emit('firebase:error', { operation: 'deleteTask', error: error.message });
      throw error;
    }
  }

  /**
   * Move task to different group
   * @param {string} taskId - Task ID
   * @param {string} groupId - Target group ID
   * @returns {Promise<Object>} Updated task
   */
  async moveTask(taskId, groupId) {
    try {
      const response = await fetch(`${this.apiURL}/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify({ groupId })
      });

      if (!response.ok) {
        throw new Error(`Failed to move task: ${response.status} ${response.statusText}`);
      }

      const movedTask = await response.json();
      eventBus.emit('firebase:task-moved', { task: movedTask, groupId });
      return movedTask;
    } catch (error) {
      console.error('❌ Error moving task:', error);
      eventBus.emit('firebase:error', { operation: 'moveTask', error: error.message });
      throw error;
    }
  }

  // Project Management API

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of projects
   */
  async getProjects() {
    try {
      const response = await fetch(`${this.apiURL}/projects`, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.status} ${response.statusText}`);
      }

      const projects = await response.json();
      eventBus.emit('firebase:projects-loaded', { projects });
      return projects;
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      eventBus.emit('firebase:error', { operation: 'getProjects', error: error.message });
      throw error;
    }
  }

  /**
   * Create new project
   * @param {Object} project - Project data (must include name)
   * @returns {Promise<Object>} Created project with ID
   */
  async createProject(project) {
    try {
      const response = await fetch(`${this.apiURL}/projects`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(project)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create project: ${response.status}`);
      }

      const createdProject = await response.json();
      eventBus.emit('firebase:project-created', { project: createdProject });
      return createdProject;
    } catch (error) {
      console.error('❌ Error creating project:', error);
      eventBus.emit('firebase:error', { operation: 'createProject', error: error.message });
      throw error;
    }
  }

  /**
   * Update project
   * @param {string} projectId - Project ID
   * @param {Object} updates - Project updates
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updates) {
    try {
      const response = await fetch(`${this.apiURL}/projects/${projectId}`, {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.status} ${response.statusText}`);
      }

      const updatedProject = await response.json();
      eventBus.emit('firebase:project-updated', { project: updatedProject });
      return updatedProject;
    } catch (error) {
      console.error('❌ Error updating project:', error);
      eventBus.emit('firebase:error', { operation: 'updateProject', error: error.message });
      throw error;
    }
  }

  // Claude AI Integration API

  /**
   * Send message to Claude
   * @param {string} message - Message to send
   * @param {Object} options - Additional options (mode, context, etc.)
   * @returns {Promise<Object>} Claude response
   */
  async sendToClaudeChat(message, options = {}) {
    try {
      const response = await fetch(`${this.claudeURL}/chat`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({
          message,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message to Claude: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      eventBus.emit('firebase:claude-response', { result });
      return result;
    } catch (error) {
      console.error('❌ Error sending message to Claude:', error);
      eventBus.emit('firebase:error', { operation: 'sendToClaudeChat', error: error.message });
      throw error;
    }
  }

  /**
   * Get Claude health status
   * @returns {Promise<Object>} Health status
   */
  async getClaudeHealth() {
    try {
      const response = await fetch(`${this.claudeURL}/health`, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get Claude health: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting Claude health:', error);
      eventBus.emit('firebase:error', { operation: 'getClaudeHealth', error: error.message });
      throw error;
    }
  }

  /**
   * Get available prompt roles from Claude
   * @returns {Promise<Array>} Array of prompt roles
   */
  async getClaudePromptRoles() {
    try {
      const response = await fetch(`${this.claudeURL}/prompt-roles`, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get prompt roles: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting prompt roles:', error);
      eventBus.emit('firebase:error', { operation: 'getClaudePromptRoles', error: error.message });
      throw error;
    }
  }

  // Private methods

  /**
   * Test connection to Firebase Functions
   */
  async _testConnection() {
    try {
      // Try to fetch projects as a health check
      const response = await fetch(`${this.apiURL}/projects`, {
        method: 'GET',
        headers: this._getHeaders()
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get headers for API requests
   */
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      // Add any authentication headers here if needed
      // For now, Firebase Functions use auth.optional middleware
    };
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;