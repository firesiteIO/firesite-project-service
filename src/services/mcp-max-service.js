/**
 * MCP MAX Integration Service
 * Based on proven patterns from Firesite Chat Service
 * Provides advanced multi-AI instance system with context management
 */

import { eventBus } from '../core/events/event-bus.js';

export class MCPMaxService {
  constructor() {
    // Server configuration based on Chat Service patterns
    this.baseServerUrl = import.meta.env.VITE_MCP_BASE_URL || 'http://localhost:3001';
    this.maxServerUrl = import.meta.env.VITE_MCP_MAX_URL || 'http://localhost:3002';
    this.currentServerUrl = this.maxServerUrl; // Default to MAX server
    this.currentMode = 'max';
    
    // Session management
    this.sessionId = null;
    this.isConnected = false;
    this.isInitialized = false;
    
    // Context state management
    this.contextState = {
      mmco: null,        // Micro Meta Context Objects
      uacp: null,        // Universal AI Context Profile  
      pacp: null,        // Personal AI Context Profile
      systemPrompt: null,
      aiRole: 'development', // Default role for project management
      model: null
    };
    
    // Health monitoring
    this.healthCheckInterval = null;
  }

  /**
   * Initialize MCP MAX service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing MCP MAX service...');
      
      // Test connection and create session
      const connected = await this.ensureConnection();
      if (!connected) {
        console.log('📴 MCP servers not available, running in offline mode');
        this.isInitialized = true; // Mark as initialized but not connected
        return;
      }

      // Create initial session
      await this.createSession();
      
      // Setup health monitoring
      this._setupHealthMonitoring();
      
      this.isInitialized = true;
      eventBus.emit('mcp-max:initialized', { service: this, sessionId: this.sessionId });
      
      console.log('✅ MCP MAX service initialized with session:', this.sessionId);
    } catch (error) {
      console.error('❌ Failed to initialize MCP MAX service:', error);
      throw error;
    }
  }

  /**
   * Ensure connection to MCP servers with fallback
   */
  async ensureConnection() {
    if (this.isConnected) return true;
    
    const connected = await this.connect();
    
    // Auto-fallback if MAX is unavailable (pattern from Chat Service)
    if (!connected && this.currentMode === 'max') {
      console.log('🚨 MCP Max unavailable, falling back to base server');
      await this.switchToServer('base');
      return await this.connect();
    }
    
    return connected;
  }

  /**
   * Connect to current MCP server
   */
  async connect() {
    try {
      const response = await fetch(`${this.currentServerUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        this.isConnected = true;
        eventBus.emit('mcp-max:connected', { 
          server: this.currentMode, 
          url: this.currentServerUrl 
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to connect to ${this.currentMode} server:`, error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Switch between MCP servers
   */
  async switchToServer(mode) {
    this.currentMode = mode;
    this.currentServerUrl = mode === 'max' ? this.maxServerUrl : this.baseServerUrl;
    this.isConnected = false;
    this.sessionId = null; // Reset session when switching servers
    
    eventBus.emit('mcp-max:server-switched', { mode, url: this.currentServerUrl });
  }

  /**
   * Create new session (required for MCP MAX)
   */
  async createSession(initialContext = {}) {
    try {
      const sessionData = {
        projectContext: {
          name: 'Firesite Project Service',
          type: 'project-management',
          capabilities: ['task-management', 'ai-coordination', 'context-evolution']
        },
        ...initialContext
      };

      const response = await fetch(`${this.currentServerUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionId = data.session?.sessionId || data.sessionId;
      
      eventBus.emit('mcp-max:session-created', { sessionId: this.sessionId });
      console.log('✅ MCP session created:', this.sessionId);
      
      return this.sessionId;
    } catch (error) {
      console.error('❌ Error creating MCP session:', error);
      throw error;
    }
  }

  /**
   * Set AI mode/role for specialized tasks
   */
  async setAIMode(mode, customPrompt = null) {
    try {
      if (!this.sessionId) {
        await this.createSession();
      }

      const payload = {
        role: mode,
        customPrompt: customPrompt
      };
      
      const response = await fetch(
        `${this.currentServerUrl}/api/sessions/${this.sessionId}/ai-role`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set AI mode: ${response.status} ${response.statusText}`);
      }

      this.contextState.aiRole = mode;
      eventBus.emit('mcp-max:ai-mode-changed', { mode, customPrompt });
      console.log('✅ AI mode set to:', mode);

      return await response.json();
    } catch (error) {
      console.error('❌ Error setting AI mode:', error);
      throw error;
    }
  }

  /**
   * Set MMCO (Micro Meta Context Objects) for project context
   */
  async setMMCOContext(mmcoContext) {
    try {
      if (!this.sessionId) {
        await this.createSession();
      }

      const response = await fetch(
        `${this.currentServerUrl}/api/sessions/${this.sessionId}/mmcp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mmcoContext)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set MMCO context: ${response.status} ${response.statusText}`);
      }

      this.contextState.mmco = mmcoContext;
      eventBus.emit('mcp-max:mmco-updated', { mmcoContext });
      console.log('✅ MMCO context updated');

      return await response.json();
    } catch (error) {
      console.error('❌ Error setting MMCO context:', error);
      throw error;
    }
  }

  /**
   * Set UACP (Universal AI Context Profile)
   */
  async setUACPContext(uacpContext) {
    try {
      if (!this.sessionId) {
        await this.createSession();
      }

      const response = await fetch(
        `${this.currentServerUrl}/api/sessions/${this.sessionId}/uacp`,
        {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uacpContext)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set UACP context: ${response.status} ${response.statusText}`);
      }

      this.contextState.uacp = uacpContext;
      eventBus.emit('mcp-max:uacp-updated', { uacpContext });
      console.log('✅ UACP context updated');

      return await response.json();
    } catch (error) {
      console.error('❌ Error setting UACP context:', error);
      throw error;
    }
  }

  /**
   * Execute task with planning AI instance
   */
  async executeWithPlanning(task) {
    await this.setAIMode('planning');
    return await this.executeTask(task);
  }

  /**
   * Execute task with development AI instance
   */
  async executeWithDevelopment(task) {
    await this.setAIMode('development');
    return await this.executeTask(task);
  }

  /**
   * Execute task with testing AI instance
   */
  async executeWithTesting(task) {
    await this.setAIMode('testing');
    return await this.executeTask(task);
  }

  /**
   * Execute task with documentation AI instance
   */
  async executeWithDocumentation(task) {
    await this.setAIMode('documentation');
    return await this.executeTask(task);
  }

  /**
   * Generic task execution with current AI mode
   */
  async executeTask(task) {
    try {
      if (!this.sessionId) {
        await this.createSession();
      }

      // Prepare request with full context (pattern from Chat Service)
      const requestData = this._prepareRequestData(task);

      const response = await fetch(`${this.currentServerUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Task execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      eventBus.emit('mcp-max:task-executed', { 
        task, 
        result, 
        aiRole: this.contextState.aiRole 
      });

      return result;
    } catch (error) {
      console.error('❌ Error executing task:', error);
      eventBus.emit('mcp-max:task-error', { task, error: error.message });
      throw error;
    }
  }

  /**
   * Create streaming connection for real-time task execution
   */
  async createTaskStream(task, onData, onError) {
    try {
      if (!this.sessionId) {
        await this.createSession();
      }

      // Use session-specific SSE endpoint for MCP MAX
      const sseEndpoint = this.currentMode === 'max' ? 
        `/mcp/sse/${this.sessionId}` : 
        '/mcp/sse';

      const eventSource = new EventSource(`${this.currentServerUrl}${sseEndpoint}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onData(data);
        } catch (error) {
          console.error('❌ Error parsing SSE data:', error);
          onError(error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        onError(error);
      };

      // Send initial task to start the stream
      await this.executeTask(task);

      return eventSource;
    } catch (error) {
      console.error('❌ Error creating task stream:', error);
      onError(error);
      throw error;
    }
  }

  /**
   * Get current context state
   */
  getContextState() {
    return {
      ...this.contextState,
      sessionId: this.sessionId,
      serverMode: this.currentMode,
      isConnected: this.isConnected
    };
  }

  /**
   * Get available AI instances
   */
  async getAIInstances() {
    try {
      const response = await fetch(`${this.currentServerUrl}/instances`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI instances: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting AI instances:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Prepare request data with full context (pattern from Chat Service)
   */
  _prepareRequestData(task) {
    return {
      message: typeof task === 'string' ? task : task.description || task.title,
      conversationId: this.sessionId,
      systemPrompt: this.contextState.systemPrompt,
      context: {
        mmco: this.contextState.mmco,
        uacp: this.contextState.uacp, 
        pacp: this.contextState.pacp,
        role: this.contextState.aiRole,
        model: this.contextState.model,
        task: task
      }
    };
  }

  /**
   * Setup health monitoring
   */
  _setupHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const wasConnected = this.isConnected;
      const isConnected = await this.connect();
      
      if (wasConnected && !isConnected) {
        eventBus.emit('mcp-max:connection-lost', { server: this.currentMode });
      } else if (!wasConnected && isConnected) {
        eventBus.emit('mcp-max:connection-restored', { server: this.currentMode });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isConnected = false;
    this.isInitialized = false;
    this.sessionId = null;
    
    eventBus.emit('mcp-max:destroyed');
  }
}

// Export singleton instance
export const mcpMaxService = new MCPMaxService();
export default mcpMaxService;