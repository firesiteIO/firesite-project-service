/**
 * KaibanJS Integration Service
 * Connects real KaibanJS agents to MCP MAX AI instances
 * Replaces mock agents with production-ready multi-agent coordination
 */

import { Agent, Task, Team } from 'kaibanjs';
import { eventBus } from '../core/events/event-bus.js';
import { mcpMaxService } from './mcp-max-service.js';
import { firebaseService } from './firebase-service.js';

export class KaibanService {
  constructor() {
    this.isInitialized = false;
    this.agents = new Map();
    this.teams = new Map();
    this.activeTasks = new Map();
    this.currentTeam = null;
    
    // Agent role configurations
    this.agentConfigs = {
      planning: {
        name: 'Planning Agent',
        role: 'Project Planner & Strategist',
        goal: 'Create comprehensive project plans and break down complex tasks into manageable components',
        backstory: 'An experienced project manager with deep expertise in software development lifecycle and agile methodologies.',
        tools: ['task_analysis', 'project_planning', 'requirement_gathering'],
        maxTokens: 4000,
        temperature: 0.3
      },
      development: {
        name: 'Development Agent',
        role: 'Senior Software Developer',
        goal: 'Implement features, write high-quality code, and provide technical solutions',
        backstory: 'A seasoned full-stack developer with expertise in modern web technologies, AI integration, and best practices.',
        tools: ['code_generation', 'technical_analysis', 'architecture_design'],
        maxTokens: 6000,
        temperature: 0.2
      },
      testing: {
        name: 'Testing Agent',
        role: 'Quality Assurance Engineer',
        goal: 'Design comprehensive test strategies and ensure code quality',
        backstory: 'A meticulous QA engineer with expertise in automated testing, test-driven development, and quality assurance.',
        tools: ['test_planning', 'test_generation', 'quality_analysis'],
        maxTokens: 3000,
        temperature: 0.1
      },
      documentation: {
        name: 'Documentation Agent',
        role: 'Technical Writer & Documentation Specialist',
        goal: 'Create clear, comprehensive documentation for all project components',
        backstory: 'A skilled technical writer who specializes in making complex technical concepts accessible and well-documented.',
        tools: ['documentation_generation', 'content_creation', 'knowledge_organization'],
        maxTokens: 4000,
        temperature: 0.4
      },
      review: {
        name: 'Review Agent',
        role: 'Code Review & Architecture Specialist',
        goal: 'Review code quality, architecture decisions, and provide improvement suggestions',
        backstory: 'A senior architect with extensive experience in code review, system design, and technical excellence.',
        tools: ['code_review', 'architecture_analysis', 'performance_optimization'],
        maxTokens: 4000,
        temperature: 0.2
      }
    };
  }

  /**
   * Initialize KaibanJS service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing KaibanJS Service...');
      
      // Ensure MCP MAX and Firebase are initialized
      await Promise.all([
        mcpMaxService.initialize(),
        firebaseService.initialize()
      ]);
      
      // Create AI agents
      await this._createAgents();
      
      // Create default project team
      await this._createProjectTeam();
      
      this.isInitialized = true;
      eventBus.emit('kaiban:initialized', { 
        service: this, 
        agentCount: this.agents.size,
        teamCount: this.teams.size 
      });
      
      console.log(`✅ KaibanJS Service initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.error('❌ Failed to initialize KaibanJS Service:', error);
      throw error;
    }
  }

  /**
   * Execute task with appropriate agent team
   */
  async executeTask(taskData, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🚀 Executing task with KaibanJS: ${taskData.title}`);
      
      // Determine the best agent for this task
      const agent = this._selectAgentForTask(taskData);
      
      // Create KaibanJS Task
      const kaibanTask = new Task({
        description: this._buildTaskDescription(taskData),
        expectedOutput: this._buildExpectedOutput(taskData),
        agent: agent,
        context: {
          originalTask: taskData,
          projectContext: options.projectContext,
          priority: taskData.priority,
          deadline: taskData.dueDate
        }
      });

      // Set MCP MAX context for the agent's AI role
      await this._setMCPMaxContext(agent, taskData);
      
      // Execute the task
      const executionId = `task-${Date.now()}`;
      this.activeTasks.set(executionId, {
        id: executionId,
        kaibanTask,
        originalTask: taskData,
        agent: agent.name,
        startTime: Date.now(),
        status: 'running'
      });

      eventBus.emit('kaiban:task-started', { 
        executionId, 
        task: taskData, 
        agent: agent.name 
      });

      // Execute with error handling
      const result = await this._executeWithRetry(kaibanTask, 3);
      
      // Update task status
      const execution = this.activeTasks.get(executionId);
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;
      
      this.activeTasks.delete(executionId);
      
      eventBus.emit('kaiban:task-completed', { 
        executionId, 
        result, 
        duration: execution.duration 
      });

      return {
        success: true,
        result: result,
        agent: agent.name,
        executionTime: execution.duration,
        executionId
      };
      
    } catch (error) {
      console.error('❌ KaibanJS task execution failed:', error);
      eventBus.emit('kaiban:task-error', { task: taskData, error: error.message });
      throw error;
    }
  }

  /**
   * Execute collaborative task with multiple agents
   */
  async executeCollaborativeTask(taskData, agentRoles = ['planning', 'development']) {
    try {
      if (!this.currentTeam) {
        throw new Error('No team available for collaborative execution');
      }

      console.log(`👥 Executing collaborative task: ${taskData.title}`);
      
      // Create tasks for each agent role
      const tasks = agentRoles.map(role => {
        const agent = this.agents.get(role);
        return new Task({
          description: this._buildCollaborativeTaskDescription(taskData, role),
          expectedOutput: this._buildCollaborativeExpectedOutput(taskData, role),
          agent: agent,
          context: {
            originalTask: taskData,
            collaborativeRole: role,
            otherAgents: agentRoles.filter(r => r !== role)
          }
        });
      });

      // Execute tasks sequentially or in parallel based on dependencies
      const results = await this._executeCollaborativeTasks(tasks);
      
      eventBus.emit('kaiban:collaborative-task-completed', { 
        task: taskData, 
        results, 
        agents: agentRoles 
      });

      return {
        success: true,
        results: results,
        agents: agentRoles,
        collaborative: true
      };
      
    } catch (error) {
      console.error('❌ Collaborative task execution failed:', error);
      throw error;
    }
  }

  /**
   * Get agent suggestions for a task type
   */
  getAgentSuggestions(taskData) {
    const suggestions = [];
    
    // Analyze task to suggest appropriate agents
    const taskText = `${taskData.title} ${taskData.description || ''}`.toLowerCase();
    
    if (taskText.includes('plan') || taskText.includes('strategy') || taskText.includes('requirement')) {
      suggestions.push({
        agent: 'planning',
        confidence: 0.9,
        reason: 'Task involves planning and strategy'
      });
    }
    
    if (taskText.includes('code') || taskText.includes('implement') || taskText.includes('develop')) {
      suggestions.push({
        agent: 'development',
        confidence: 0.8,
        reason: 'Task involves coding and implementation'
      });
    }
    
    if (taskText.includes('test') || taskText.includes('quality') || taskText.includes('bug')) {
      suggestions.push({
        agent: 'testing',
        confidence: 0.8,
        reason: 'Task involves testing and quality assurance'
      });
    }
    
    if (taskText.includes('document') || taskText.includes('readme') || taskText.includes('guide')) {
      suggestions.push({
        agent: 'documentation',
        confidence: 0.7,
        reason: 'Task involves documentation'
      });
    }
    
    if (taskText.includes('review') || taskText.includes('refactor') || taskText.includes('optimize')) {
      suggestions.push({
        agent: 'review',
        confidence: 0.7,
        reason: 'Task involves code review and optimization'
      });
    }
    
    // Default to planning agent if no specific match
    if (suggestions.length === 0) {
      suggestions.push({
        agent: 'planning',
        confidence: 0.5,
        reason: 'Default agent for general task planning'
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      agentCount: this.agents.size,
      teamCount: this.teams.size,
      activeTasks: this.activeTasks.size,
      availableAgents: Array.from(this.agents.keys()),
      currentTeam: this.currentTeam?.name || null
    };
  }

  // Private methods

  /**
   * Create AI agents with MCP MAX integration
   */
  async _createAgents() {
    for (const [roleKey, config] of Object.entries(this.agentConfigs)) {
      try {
        const agent = new Agent({
          name: config.name,
          role: config.role,
          goal: config.goal,
          backstory: config.backstory,
          verbose: true,
          allowDelegation: false,
          tools: await this._createToolsForAgent(roleKey),
          llmConfig: {
            provider: 'custom',
            model: 'claude-3-5-sonnet-20240620',
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            customProvider: this._createMCPMaxProvider(roleKey)
          }
        });
        
        this.agents.set(roleKey, agent);
        console.log(`✅ Created ${config.name} agent`);
        
      } catch (error) {
        console.error(`❌ Failed to create ${config.name} agent:`, error);
      }
    }
  }

  /**
   * Create project team with all agents
   */
  async _createProjectTeam() {
    try {
      const teamAgents = Array.from(this.agents.values());
      
      this.currentTeam = new Team({
        name: 'Firesite Project Team',
        agents: teamAgents,
        process: 'sequential', // Tasks execute sequentially by default
        verbose: true,
        memory: true,
        callbacks: {
          onTaskStart: (task) => {
            eventBus.emit('kaiban:team-task-start', { task });
          },
          onTaskComplete: (task, result) => {
            eventBus.emit('kaiban:team-task-complete', { task, result });
          }
        }
      });
      
      this.teams.set('main', this.currentTeam);
      console.log('✅ Created Firesite Project Team');
      
    } catch (error) {
      console.error('❌ Failed to create project team:', error);
      throw error;
    }
  }

  /**
   * Create MCP MAX provider for agent
   */
  _createMCPMaxProvider(agentRole) {
    return async (prompt, options = {}) => {
      try {
        // Set the appropriate AI mode in MCP MAX
        await mcpMaxService.setAIMode(agentRole);
        
        // Execute the task
        const result = await mcpMaxService.executeTask(prompt);
        
        return {
          content: result.result || result,
          usage: {
            promptTokens: result.tokensUsed?.prompt || 0,
            completionTokens: result.tokensUsed?.completion || 0,
            totalTokens: result.tokensUsed?.total || 0
          }
        };
      } catch (error) {
        console.error(`❌ MCP MAX provider error for ${agentRole}:`, error);
        throw error;
      }
    };
  }

  /**
   * Create tools for specific agent role
   */
  async _createToolsForAgent(roleKey) {
    const tools = [];
    
    // Role-specific tools
    switch (roleKey) {
      case 'planning':
        tools.push(
          this._createTaskAnalysisTool(),
          this._createProjectPlanningTool()
        );
        break;
      case 'development':
        tools.push(
          this._createCodeGenerationTool(),
          this._createTechnicalAnalysisTool()
        );
        break;
      case 'testing':
        tools.push(
          this._createTestPlanningTool(),
          this._createQualityAnalysisTool()
        );
        break;
      case 'documentation':
        tools.push(
          this._createDocumentationTool(),
          this._createContentCreationTool()
        );
        break;
      case 'review':
        tools.push(
          this._createCodeReviewTool(),
          this._createArchitectureAnalysisTool()
        );
        break;
    }
    
    return tools;
  }

  /**
   * Select the best agent for a task
   */
  _selectAgentForTask(taskData) {
    const suggestions = this.getAgentSuggestions(taskData);
    const bestMatch = suggestions[0];
    
    return this.agents.get(bestMatch.agent);
  }

  /**
   * Set MCP MAX context for agent execution
   */
  async _setMCPMaxContext(agent, taskData) {
    const context = {
      agent: {
        name: agent.name,
        role: agent.role,
        goal: agent.goal
      },
      task: {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        type: taskData.type || 'general'
      },
      project: {
        name: 'Firesite Project Service',
        context: 'AI-powered project management system'
      }
    };
    
    await mcpMaxService.setMMCOContext(context);
  }

  /**
   * Build task description for KaibanJS
   */
  _buildTaskDescription(taskData) {
    return `
Task: ${taskData.title}

Description: ${taskData.description || 'No additional description provided.'}

Priority: ${taskData.priority || 'Medium'}

Context: This task is part of the Firesite Project Service development, an AI-powered project management system that integrates with Firebase Functions and MCP MAX for advanced AI capabilities.

Please provide a comprehensive response that includes:
1. Analysis of the task requirements
2. Recommended approach or solution
3. Implementation steps if applicable
4. Potential challenges and mitigation strategies
5. Success criteria and testing considerations
`.trim();
  }

  /**
   * Build expected output for KaibanJS task
   */
  _buildExpectedOutput(taskData) {
    const taskType = this._determineTaskType(taskData);
    
    switch (taskType) {
      case 'planning':
        return 'A detailed project plan with clear steps, milestones, and deliverables';
      case 'development':
        return 'Implementation approach with code examples and technical specifications';
      case 'testing':
        return 'Comprehensive test plan with test cases and quality assurance strategy';
      case 'documentation':
        return 'Clear, well-structured documentation with examples and usage instructions';
      case 'review':
        return 'Detailed review findings with specific improvement recommendations';
      default:
        return 'A comprehensive analysis and actionable recommendations for the task';
    }
  }

  /**
   * Build collaborative task description
   */
  _buildCollaborativeTaskDescription(taskData, agentRole) {
    const baseDescription = this._buildTaskDescription(taskData);
    
    return `${baseDescription}

Your Role: You are working as the ${agentRole} specialist in a collaborative team. Focus on your specific expertise while considering how your work will integrate with other team members.

Collaboration Notes:
- This is a team effort with multiple AI agents working together
- Your output will be used by other team members
- Ensure your response is clear and actionable for team integration
`.trim();
  }

  /**
   * Build collaborative expected output
   */
  _buildCollaborativeExpectedOutput(taskData, agentRole) {
    const outputs = {
      planning: 'Strategic plan and task breakdown that development and testing teams can follow',
      development: 'Implementation details and code that testing and documentation teams can work with',
      testing: 'Test strategy and quality requirements that align with development plans',
      documentation: 'Documentation that captures all team deliverables and decisions',
      review: 'Review feedback that improves all team outputs'
    };
    
    return outputs[agentRole] || this._buildExpectedOutput(taskData);
  }

  /**
   * Execute tasks with retry logic
   */
  async _executeWithRetry(task, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Task execution attempt ${attempt}/${maxRetries}`);
        const result = await task.execute();
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute collaborative tasks
   */
  async _executeCollaborativeTasks(tasks) {
    const results = [];
    
    // Execute sequentially for now (can be enhanced for parallel execution)
    for (const task of tasks) {
      try {
        const result = await this._executeWithRetry(task);
        results.push({
          agent: task.agent.name,
          result: result,
          success: true
        });
      } catch (error) {
        results.push({
          agent: task.agent.name,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * Determine task type from task data
   */
  _determineTaskType(taskData) {
    const suggestions = this.getAgentSuggestions(taskData);
    return suggestions[0]?.agent || 'planning';
  }

  /**
   * Create tool implementations (simplified versions)
   */
  _createTaskAnalysisTool() {
    return {
      name: 'task_analysis',
      description: 'Analyze task requirements and complexity',
      execute: async (input) => `Task analysis for: ${input}`
    };
  }

  _createProjectPlanningTool() {
    return {
      name: 'project_planning',
      description: 'Create project plans and roadmaps',
      execute: async (input) => `Project plan for: ${input}`
    };
  }

  _createCodeGenerationTool() {
    return {
      name: 'code_generation',
      description: 'Generate code and technical implementations',
      execute: async (input) => `Code implementation for: ${input}`
    };
  }

  _createTechnicalAnalysisTool() {
    return {
      name: 'technical_analysis',
      description: 'Analyze technical requirements and architecture',
      execute: async (input) => `Technical analysis for: ${input}`
    };
  }

  _createTestPlanningTool() {
    return {
      name: 'test_planning',
      description: 'Create comprehensive test plans',
      execute: async (input) => `Test plan for: ${input}`
    };
  }

  _createQualityAnalysisTool() {
    return {
      name: 'quality_analysis',
      description: 'Analyze code quality and suggest improvements',
      execute: async (input) => `Quality analysis for: ${input}`
    };
  }

  _createDocumentationTool() {
    return {
      name: 'documentation_generation',
      description: 'Generate comprehensive documentation',
      execute: async (input) => `Documentation for: ${input}`
    };
  }

  _createContentCreationTool() {
    return {
      name: 'content_creation',
      description: 'Create technical content and guides',
      execute: async (input) => `Content creation for: ${input}`
    };
  }

  _createCodeReviewTool() {
    return {
      name: 'code_review',
      description: 'Review code for quality and best practices',
      execute: async (input) => `Code review for: ${input}`
    };
  }

  _createArchitectureAnalysisTool() {
    return {
      name: 'architecture_analysis',
      description: 'Analyze system architecture and design',
      execute: async (input) => `Architecture analysis for: ${input}`
    };
  }
}

// Export singleton instance
export const kaibanService = new KaibanService();
export default kaibanService;