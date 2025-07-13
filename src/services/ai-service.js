/**
 * AI Service
 * Integrates Firebase Functions Claude API and MCP MAX for advanced AI capabilities
 * Replaces the mock claude-code-integration.js with real implementations
 */

import { eventBus } from '../core/events/event-bus.js';
import { firebaseService } from './firebase-service.js';
import { mcpMaxService } from './mcp-max-service.js';

export class AIService {
  constructor() {
    this.isInitialized = false;
    this.preferredMode = 'mcp-max'; // Prefer MCP MAX, fallback to Firebase Claude
    this.currentMode = null;
    
    // Rate limiting for cost optimization
    this.rateLimits = {
      maxRequestsPerHour: 50,
      currentRequests: 0,
      hourlyReset: Date.now() + (60 * 60 * 1000)
    };
    
    // Task execution tracking
    this.activeExecutions = new Map();
    this.executionHistory = [];
  }

  /**
   * Initialize AI service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing AI Service...');
      
      // Initialize both Firebase and MCP MAX services
      await Promise.all([
        firebaseService.initialize(),
        mcpMaxService.initialize()
      ]);
      
      // Determine the best mode based on availability
      await this._determineBestMode();
      
      this.isInitialized = true;
      eventBus.emit('ai:initialized', { 
        service: this, 
        mode: this.currentMode 
      });
      
      console.log(`✅ AI Service initialized in ${this.currentMode} mode`);
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Analyze board and provide insights
   */
  async analyzeBoard(boardData) {
    if (this.currentMode === 'mcp-max' && mcpMaxService.isConnected) {
      // Use MCP MAX for analysis
      return await this._executeViaMCPMax({
        type: 'board_analysis',
        prompt: this._buildBoardAnalysisPrompt(boardData),
        context: boardData,
        aiRole: 'analysis'
      });
    } else if (this.currentMode === 'firebase' && firebaseService.isConnected) {
      // Use Firebase Claude for analysis
      return await this._executeViaFirebase({
        type: 'board_analysis',
        prompt: this._buildBoardAnalysisPrompt(boardData),
        context: boardData
      });
    } else {
      // Offline mode - provide intelligent local analysis
      const tasks = boardData.tasks || [];
      const analysis = this._performLocalAnalysis(tasks);
      return {
        success: true,
        result: {
          summary: `Offline Analysis: Found ${tasks.length} tasks across ${boardData.columns?.length || 4} columns.\n\n${analysis}`,
          suggestions: this._generateLocalSuggestions(tasks),
          mode: 'offline'
        },
        mode: 'offline',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate task suggestions for a project context
   */
  async generateTaskSuggestions(context) {
    try {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      console.log('🔮 Generating task suggestions...');
      
      const prompt = this._buildTaskSuggestionPrompt(context);
      const result = await this._executeAIRequest({
        type: 'task_suggestions',
        prompt,
        context,
        aiRole: 'planning'
      });
      
      this._updateRateLimit();
      return this._parseTaskSuggestions(result);
    } catch (error) {
      console.error('❌ Error generating task suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze task complexity and provide estimates
   */
  async analyzeTaskComplexity(task) {
    try {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      console.log('📊 Analyzing task complexity...');
      
      const prompt = this._buildComplexityAnalysisPrompt(task);
      const result = await this._executeAIRequest({
        type: 'complexity_analysis',
        prompt,
        task,
        aiRole: 'analysis'
      });
      
      this._updateRateLimit();
      return this._parseComplexityAnalysis(result);
    } catch (error) {
      console.error('❌ Error analyzing task complexity:', error);
      throw error;
    }
  }

  /**
   * Generate code or implementation suggestions
   */
  async generateImplementationSuggestions(task) {
    try {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      console.log('💡 Generating implementation suggestions...');
      
      const prompt = this._buildImplementationPrompt(task);
      const result = await this._executeAIRequest({
        type: 'implementation',
        prompt,
        task,
        aiRole: 'development'
      });
      
      this._updateRateLimit();
      return this._parseImplementationSuggestions(result);
    } catch (error) {
      console.error('❌ Error generating implementation suggestions:', error);
      throw error;
    }
  }

  /**
   * Create test plans for tasks
   */
  async generateTestPlan(task) {
    try {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      console.log('🧪 Generating test plan...');
      
      const prompt = this._buildTestPlanPrompt(task);
      const result = await this._executeAIRequest({
        type: 'test_plan',
        prompt,
        task,
        aiRole: 'testing'
      });
      
      this._updateRateLimit();
      return this._parseTestPlan(result);
    } catch (error) {
      console.error('❌ Error generating test plan:', error);
      throw error;
    }
  }

  /**
   * Create documentation for completed tasks
   */
  async generateDocumentation(task) {
    try {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      console.log('📚 Generating documentation...');
      
      const prompt = this._buildDocumentationPrompt(task);
      const result = await this._executeAIRequest({
        type: 'documentation',
        prompt,
        task,
        aiRole: 'documentation'
      });
      
      this._updateRateLimit();
      return this._parseDocumentation(result);
    } catch (error) {
      console.error('❌ Error generating documentation:', error);
      throw error;
    }
  }

  /**
   * Execute AI request with streaming support
   */
  async executeWithStreaming(request, onData, onComplete, onError) {
    try {
      const executionId = `execution-${Date.now()}`;
      this.activeExecutions.set(executionId, {
        id: executionId,
        type: request.type,
        startTime: Date.now(),
        status: 'running'
      });

      if (this.currentMode === 'mcp-max') {
        // Use MCP MAX streaming
        const eventSource = await mcpMaxService.createTaskStream(
          request,
          (data) => {
            onData(data);
            eventBus.emit('ai:stream-data', { executionId, data });
          },
          (error) => {
            this._handleExecutionError(executionId, error);
            onError(error);
          }
        );

        // Handle completion
        const result = await this._waitForStreamCompletion(eventSource);
        this._handleExecutionComplete(executionId, result);
        onComplete(result);

        return result;
      } else {
        // Use Firebase Functions (no streaming, but still async)
        const result = await this._executeViaFirebase(request);
        this._handleExecutionComplete(executionId, result);
        onComplete(result);
        return result;
      }
    } catch (error) {
      console.error('❌ Error in streaming execution:', error);
      onError(error);
      throw error;
    }
  }

  /**
   * Get current AI service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentMode: this.currentMode,
      rateLimitStatus: this._getRateLimitStatus(),
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.length
    };
  }

  /**
   * Switch AI mode (mcp-max or firebase)
   */
  async switchMode(mode) {
    if (mode === this.currentMode) return;
    
    console.log(`🔄 Switching AI mode from ${this.currentMode} to ${mode}`);
    
    // Validate the target mode is available
    if (mode === 'mcp-max' && !mcpMaxService.isInitialized) {
      throw new Error('MCP MAX service not available');
    }
    if (mode === 'firebase' && !firebaseService.isInitialized) {
      throw new Error('Firebase service not available');
    }
    
    this.currentMode = mode;
    eventBus.emit('ai:mode-switched', { mode });
  }

  // Private methods

  /**
   * Determine the best AI mode based on service availability
   */
  async _determineBestMode() {
    try {
      // Test MCP MAX availability
      if (mcpMaxService.isInitialized && mcpMaxService.isConnected) {
        this.currentMode = 'mcp-max';
        console.log('✅ Using MCP MAX for AI operations');
        return;
      }
    } catch (error) {
      console.warn('⚠️ MCP MAX not available:', error.message);
    }

    try {
      // Test Firebase Claude availability
      await firebaseService.getClaudeHealth();
      this.currentMode = 'firebase';
      console.log('✅ Using Firebase Claude for AI operations');
      return;
    } catch (error) {
      console.warn('⚠️ Firebase Claude not available:', error.message);
    }

    // Fallback to mock mode for development
    console.log('📴 All AI services unavailable, running in development mode');
    this.currentMode = 'development';
  }

  /**
   * Execute AI request using the current mode
   */
  async _executeAIRequest(request) {
    if (this.currentMode === 'mcp-max') {
      return await this._executeViaMCPMax(request);
    } else if (this.currentMode === 'firebase') {
      return await this._executeViaFirebase(request);
    } else {
      return await this._executeViaDevelopmentMode(request);
    }
  }

  /**
   * Execute via MCP MAX
   */
  async _executeViaMCPMax(request) {
    try {
      // Set appropriate AI role
      await mcpMaxService.setAIMode(request.aiRole);
      
      // Set context if available
      if (request.context) {
        await mcpMaxService.setMMCOContext({
          type: request.type,
          context: request.context,
          timestamp: new Date().toISOString()
        });
      }
      
      // Execute task
      const result = await mcpMaxService.executeTask(request.prompt);
      
      return {
        success: true,
        result: result,
        mode: 'mcp-max',
        aiRole: request.aiRole,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ MCP MAX execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute via Firebase Functions
   */
  async _executeViaFirebase(request) {
    try {
      const result = await firebaseService.sendToClaudeChat(request.prompt, {
        mode: request.type,
        context: request.context
      });
      
      return {
        success: true,
        result: result,
        mode: 'firebase',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Firebase execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute via development mode (mock responses)
   */
  async _executeViaDevelopmentMode(request) {
    try {
      console.log('🔧 Using development mode for AI request');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const mockResults = {
        task_suggestions: [
          {
            title: 'Implement user authentication',
            description: 'Add secure login and registration functionality',
            complexity: 'medium',
            priority: 'high',
            estimatedHours: 8
          },
          {
            title: 'Create task notification system',
            description: 'Send notifications when tasks are updated',
            complexity: 'low',
            priority: 'medium',
            estimatedHours: 4
          },
          {
            title: 'Add real-time collaboration features',
            description: 'Enable multiple users to work on the same board',
            complexity: 'high',
            priority: 'high',
            estimatedHours: 16
          }
        ],
        complexity_analysis: {
          complexity: Math.floor(Math.random() * 10) + 1,
          timeEstimate: Math.floor(Math.random() * 20) + 2,
          challenges: ['Integration complexity', 'Testing requirements', 'Performance considerations'],
          risks: ['API dependencies', 'User experience impact'],
          analysis: 'This task appears to have moderate complexity with standard implementation patterns.'
        },
        implementation: {
          approach: 'Implement using modern web standards with proper error handling',
          steps: [
            'Plan the architecture and data flow',
            'Create the core functionality',
            'Add error handling and validation',
            'Write comprehensive tests',
            'Document the implementation'
          ],
          considerations: ['Performance', 'Security', 'Maintainability']
        },
        test_plan: {
          unitTests: ['Component rendering', 'Function logic', 'Edge cases'],
          integrationTests: ['API interactions', 'User workflows'],
          e2eTests: ['Complete user journeys', 'Cross-browser compatibility']
        },
        documentation: {
          overview: 'Comprehensive documentation for the implemented feature',
          usage: 'Step-by-step usage instructions',
          examples: 'Code examples and practical use cases'
        }
      };
      
      const result = mockResults[request.type] || `Mock response for ${request.type}: This is a development mode simulation.`;
      
      return {
        success: true,
        result: result,
        mode: 'development',
        timestamp: new Date().toISOString(),
        mock: true
      };
    } catch (error) {
      console.error('❌ Development mode execution failed:', error);
      throw error;
    }
  }

  /**
   * Perform local analysis when offline
   */
  _performLocalAnalysis(tasks) {
    if (tasks.length === 0) {
      return "No tasks found. Consider adding some tasks to get started!";
    }

    const priorities = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const columns = tasks.reduce((acc, task) => {
      acc[task.columnId] = (acc[task.columnId] || 0) + 1;
      return acc;
    }, {});

    let analysis = `Priority Distribution:\n`;
    Object.entries(priorities).forEach(([priority, count]) => {
      analysis += `- ${priority}: ${count} tasks\n`;
    });

    analysis += `\nColumn Distribution:\n`;
    Object.entries(columns).forEach(([column, count]) => {
      analysis += `- ${column}: ${count} tasks\n`;
    });

    return analysis;
  }

  /**
   * Generate local suggestions when offline
   */
  _generateLocalSuggestions(tasks) {
    const suggestions = [];
    
    if (tasks.length === 0) {
      suggestions.push("Add your first task to get started");
      suggestions.push("Break down large goals into smaller, actionable tasks");
    } else {
      if (tasks.filter(t => t.priority === 'high').length === 0) {
        suggestions.push("Consider adding priority levels to important tasks");
      }
      
      if (tasks.filter(t => t.description).length < tasks.length * 0.5) {
        suggestions.push("Add descriptions to tasks for better clarity");
      }
      
      const todoTasks = tasks.filter(t => t.columnId === 'todo');
      if (todoTasks.length > 5) {
        suggestions.push("Consider moving some tasks to 'In Progress' to maintain focus");
      }
    }

    return suggestions;
  }

  /**
   * Build prompt for board analysis
   */
  _buildBoardAnalysisPrompt(boardData) {
    return `As a project management AI, analyze this Kanban board and provide insights:

Board: ${boardData.name || 'Project Board'}
Tasks: ${JSON.stringify(boardData.tasks || [], null, 2)}
Columns: ${JSON.stringify(boardData.columns || [], null, 2)}

Provide analysis including:
- Overall project health
- Task distribution insights
- Priority recommendations
- Workflow suggestions
- Potential bottlenecks

Format as structured analysis.`;
  }

  /**
   * Build prompt for task suggestions
   */
  _buildTaskSuggestionPrompt(context) {
    return `As a project planning AI, analyze the following context and suggest specific, actionable tasks:

Context: ${JSON.stringify(context, null, 2)}

Please provide 3-5 concrete task suggestions that would move this project forward. For each task, include:
- Clear, actionable title
- Brief description
- Estimated complexity (low/medium/high)
- Priority level
- Any dependencies

Format as JSON array of task objects.`;
  }

  /**
   * Build prompt for complexity analysis
   */
  _buildComplexityAnalysisPrompt(task) {
    return `As a technical analysis AI, analyze the complexity of this task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}

Provide analysis including:
- Complexity rating (1-10)
- Time estimate (hours)
- Key challenges
- Required skills/knowledge
- Risk factors
- Dependencies

Format as JSON object.`;
  }

  /**
   * Build prompt for implementation suggestions
   */
  _buildImplementationPrompt(task) {
    return `As a development AI, provide implementation guidance for this task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}

Provide:
- Step-by-step implementation approach
- Code examples or pseudocode
- Best practices to follow
- Potential pitfalls to avoid
- Testing strategies

Format as structured response.`;
  }

  /**
   * Build prompt for test plan generation
   */
  _buildTestPlanPrompt(task) {
    return `As a testing AI, create a comprehensive test plan for this task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}

Include:
- Unit test cases
- Integration test scenarios
- Edge cases to consider
- Test data requirements
- Acceptance criteria

Format as structured test plan.`;
  }

  /**
   * Build prompt for documentation generation
   */
  _buildDocumentationPrompt(task) {
    return `As a documentation AI, create clear documentation for this completed task:

Task: ${task.title}
Description: ${task.description || 'No description provided'}

Include:
- Overview of what was implemented
- How to use/interact with the feature
- Configuration or setup required
- Examples
- Troubleshooting guide

Format as markdown documentation.`;
  }

  /**
   * Parse task suggestions from AI response
   */
  _parseTaskSuggestions(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: return raw response
      return [{
        title: 'AI Generated Suggestion',
        description: response.result,
        complexity: 'medium',
        priority: 'medium'
      }];
    } catch (error) {
      console.error('❌ Error parsing task suggestions:', error);
      return [];
    }
  }

  /**
   * Parse complexity analysis from AI response
   */
  _parseComplexityAnalysis(response) {
    try {
      const jsonMatch = response.result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        complexity: 5,
        timeEstimate: 4,
        analysis: response.result
      };
    } catch (error) {
      console.error('❌ Error parsing complexity analysis:', error);
      return { complexity: 5, timeEstimate: 4, analysis: response.result };
    }
  }

  /**
   * Parse implementation suggestions
   */
  _parseImplementationSuggestions(response) {
    return {
      suggestions: response.result,
      timestamp: response.timestamp,
      mode: response.mode
    };
  }

  /**
   * Parse test plan
   */
  _parseTestPlan(response) {
    return {
      testPlan: response.result,
      timestamp: response.timestamp,
      mode: response.mode
    };
  }

  /**
   * Parse documentation
   */
  _parseDocumentation(response) {
    return {
      documentation: response.result,
      timestamp: response.timestamp,
      mode: response.mode
    };
  }

  /**
   * Check rate limits
   */
  _checkRateLimit() {
    // Reset hourly counter if needed
    if (Date.now() > this.rateLimits.hourlyReset) {
      this.rateLimits.currentRequests = 0;
      this.rateLimits.hourlyReset = Date.now() + (60 * 60 * 1000);
    }

    return this.rateLimits.currentRequests < this.rateLimits.maxRequestsPerHour;
  }

  /**
   * Update rate limit tracking
   */
  _updateRateLimit() {
    this.rateLimits.currentRequests += 1;
    eventBus.emit('ai:rate-limit-updated', this._getRateLimitStatus());
  }

  /**
   * Get rate limit status
   */
  _getRateLimitStatus() {
    return {
      ...this.rateLimits,
      remainingRequests: Math.max(0, this.rateLimits.maxRequestsPerHour - this.rateLimits.currentRequests),
      resetTime: new Date(this.rateLimits.hourlyReset).toLocaleString()
    };
  }

  /**
   * Handle execution completion
   */
  _handleExecutionComplete(executionId, result) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;
      
      this.executionHistory.push(execution);
      this.activeExecutions.delete(executionId);
      
      // Keep only last 100 executions
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100);
      }
      
      eventBus.emit('ai:execution-complete', { execution });
    }
  }

  /**
   * Handle execution error
   */
  _handleExecutionError(executionId, error) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'error';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error.message;
      
      this.executionHistory.push(execution);
      this.activeExecutions.delete(executionId);
      
      eventBus.emit('ai:execution-error', { execution, error });
    }
  }

  /**
   * Wait for stream completion (simplified implementation)
   */
  async _waitForStreamCompletion(eventSource) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Stream timeout'));
      }, 60000); // 1 minute timeout

      eventSource.addEventListener('complete', (event) => {
        clearTimeout(timeout);
        eventSource.close();
        resolve(JSON.parse(event.data));
      });

      eventSource.addEventListener('error', (event) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error(event.data || 'Stream error'));
      });
    });
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;