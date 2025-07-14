/**
 * MCP Server Manager Service
 * Copied from working firesite-chat-service patterns
 * Handles switching between base MCP server and MCP Max server
 * while maintaining seamless project service integration
 */

import { eventBus } from '../core/events/event-bus.js';

export class MCPMaxService {
  constructor(options = {}) {
    this.options = {
      serverUrl: 'http://localhost:3002', // MCP Max only
      timeout: 10000,
      retryAttempts: 3,
      ...options
    };

    this.serverUrl = this.options.serverUrl;
    this.isConnected = false;
    this.eventSource = null;
    this.sessionId = null;
    this.isInitialized = false;
    
    // AI Mode and Context state
    this.currentAIMode = null;
    this.mmcoContext = null;
    this.uacpContext = null;
    this.pacpContext = null;
  }

  /**
   * Initialize MCP service - copied from Chat Service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Firesite MCP Max service initializing...');
      console.log(`📡 Server URL: ${this.serverUrl}`);
      
      // Test connection and create session
      const connected = await this.connect();
      if (!connected) {
        console.log('📴 MCP Max server not available, running in offline mode');
        this.isInitialized = true; // Mark as initialized but not connected
        return;
      }
      
      this.isInitialized = true;
      eventBus.emit('mcp-max:initialized', { service: this, sessionId: this.sessionId });
      
      console.log('✅ Firesite MCP Max service initialized with session:', this.sessionId);
    } catch (error) {
      console.error('❌ Failed to initialize Firesite MCP Max service:', error);
      this.isInitialized = true; // Mark as initialized but failed
      throw error;
    }
  }


  /**
   * Test if MCP Max server is available
   */
  async testServerConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      console.warn(`MCP Max server connection test failed:`, error.message);
      return false;
    }
  }

  /**
   * AI Mode Management for Firesite Project Service
   */
  async setAIMode(mode, customPrompt = null) {
    if (!this.isConnected) {
      console.warn('Not connected to MCP Max server');
      return false;
    }

    try {
      const payload = {
        role: mode,
        customPrompt: customPrompt
      };

      console.log(`🤖 Setting AI mode with payload:`, payload);

      const response = await fetch(`${this.serverUrl}/api/sessions/${this.sessionId}/ai-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.currentAIMode = mode;
        console.log(`🤖 AI Mode set to: ${mode}`);
        return true;
      } else {
        console.error('Failed to set AI mode:', await response.text());
        return false;
      }

    } catch (error) {
      console.error('Error setting AI mode:', error);
      return false;
    }
  }

  /**
   * Context Management for Firesite Project Service
   */
  async setMMCOContext(mmcoContext) {
    if (!this.isConnected) {
      console.warn('Not connected to MCP Max server');
      return false;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/sessions/${this.sessionId}/mmcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mmcoContext)
      });

      if (response.ok) {
        this.mmcoContext = mmcoContext;
        console.log('📋 MMCO Context updated');
        return true;
      } else {
        console.error('Failed to set MMCO context:', await response.text());
        return false;
      }

    } catch (error) {
      console.error('Error setting MMCO context:', error);
      return false;
    }
  }

  async setUACPContext(uacpContext) {
    if (!this.isConnected) {
      console.warn('Not connected to MCP Max server');
      return false;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/sessions/${this.sessionId}/uacp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uacpContext)
      });

      if (response.ok) {
        this.uacpContext = uacpContext;
        console.log('🏢 UACP Context updated');
        return true;
      } else {
        console.error('Failed to set UACP context:', await response.text());
        return false;
      }

    } catch (error) {
      console.error('Error setting UACP context:', error);
      return false;
    }
  }

  /**
   * Create a new session with MCP Max
   */
  async createSession(initialContext = {}) {
    // Your MCP Max server doesn't have session management
    // Use a basic session ID instead
    this.sessionId = 'project-service-' + Date.now();
    console.log(`📝 Using basic session (no session API available): ${this.sessionId}`);
    return this.sessionId;
  }

  /**
   * Connect to MCP Max server via SSE
   */
  async connect() {
    if (this.isConnected) {
      console.log('Already connected to MCP Max server');
      return true;
    }

    try {
      // Test server availability first
      const isAvailable = await this.testServerConnection();
      if (!isAvailable) {
        throw new Error(`MCP Max server at ${this.serverUrl} is not available`);
      }

      // Create a basic session ID
      if (!this.sessionId) {
        await this.createSession();
      }

      // Use basic SSE endpoint (your server doesn't support session-based SSE)
      const sseEndpoint = '/mcp/sse';
      this.eventSource = new EventSource(`${this.serverUrl}${sseEndpoint}`);
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        console.log(`✅ Connected to MCP Max server via ${sseEndpoint}`);
      };

      this.eventSource.onerror = (error) => {
        console.error(`💥 MCP Max SSE connection error:`, error);
        this.isConnected = false;
      };

      return true;

    } catch (error) {
      console.error('Failed to connect to MCP Max server:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from MCP Max server
   */
  async disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.sessionId = null;
    console.log(`🔌 Disconnected from MCP Max server`);
  }

  /**
   * Send message to MCP Max server
   */
  async sendMessage(content, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const payload = {
        content: content,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        ...options
      };

      const response = await fetch(`${this.serverUrl}/mcp/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error sending message to MCP Max server:', error);
      throw error;
    }
  }

  /**
   * Get current server status and capabilities
   */
  getStatus() {
    return {
      mode: 'max',
      serverUrl: this.serverUrl,
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      capabilities: {
        aiModes: true,
        contextObjects: true,
        sessions: true
      },
      context: {
        aiMode: this.currentAIMode,
        hasMMCO: !!this.mmcoContext,
        hasUACP: !!this.uacpContext,
        hasPACP: !!this.pacpContext
      }
    };
  }
}

// Export singleton instance
export const mcpMaxService = new MCPMaxService();
export default mcpMaxService;