/**
 * MMCO (Micro Meta Context Objects) Service
 * Manages context objects for AI interactions and context evolution
 * Integrates with MCP MAX for advanced context management
 */

import { eventBus } from '../core/events/event-bus.js';
import { mcpMaxService } from './mcp-max-service.js';
import { firebaseService } from './firebase-service.js';

export class MMCOService {
  constructor() {
    this.isInitialized = false;
    this.contextObjects = new Map();
    this.contextHistory = [];
    this.activeContexts = new Set();
    
    // Context object types
    this.contextTypes = {
      project: 'Project-level context for overall project management',
      task: 'Task-specific context for individual work items',
      user: 'User preference and behavior context',
      session: 'Session-specific context for current work session',
      ai: 'AI behavior and learning context',
      system: 'System-level context for technical operations'
    };
    
    // Context evolution tracking
    this.evolutionHistory = [];
    this.evolutionRules = new Map();
  }

  /**
   * Initialize MMCO service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🧠 Initializing MMCO Service...');
      
      // Ensure MCP MAX is initialized for context management
      await mcpMaxService.initialize();
      
      // Load existing contexts from storage
      await this._loadContextsFromStorage();
      
      // Setup context evolution rules
      this._setupEvolutionRules();
      
      // Setup event listeners for context updates
      this._setupEventListeners();
      
      this.isInitialized = true;
      eventBus.emit('mmco:initialized', { 
        service: this, 
        contextCount: this.contextObjects.size 
      });
      
      console.log(`✅ MMCO Service initialized with ${this.contextObjects.size} contexts`);
    } catch (error) {
      console.error('❌ Failed to initialize MMCO Service:', error);
      throw error;
    }
  }

  /**
   * Create a new context object
   */
  async createContext(type, data, options = {}) {
    try {
      const contextId = this._generateContextId(type);
      
      const contextObject = {
        id: contextId,
        type: type,
        data: data,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1,
          evolving: options.evolving !== false, // Default to true
          priority: options.priority || 'medium',
          tags: options.tags || [],
          source: options.source || 'user'
        },
        relationships: {
          parent: options.parent || null,
          children: [],
          dependencies: options.dependencies || [],
          related: []
        },
        evolution: {
          changeCount: 0,
          lastEvolved: null,
          evolutionTriggers: [],
          learningContext: {}
        }
      };
      
      this.contextObjects.set(contextId, contextObject);
      this.activeContexts.add(contextId);
      
      // Set context in MCP MAX if it's active
      if (mcpMaxService.isInitialized) {
        await this._syncContextWithMCPMax(contextObject);
      }
      
      // Save to storage
      await this._saveContextsToStorage();
      
      eventBus.emit('mmco:context-created', { 
        contextId, 
        type, 
        data: contextObject 
      });
      
      console.log(`✅ Created ${type} context: ${contextId}`);
      return contextObject;
      
    } catch (error) {
      console.error('❌ Error creating context:', error);
      throw error;
    }
  }

  /**
   * Update existing context and trigger evolution
   */
  async updateContext(contextId, updates, trigger = 'manual') {
    try {
      const context = this.contextObjects.get(contextId);
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }
      
      // Store previous state for evolution tracking
      const previousState = JSON.parse(JSON.stringify(context.data));
      
      // Apply updates
      Object.assign(context.data, updates);
      context.metadata.updated = new Date().toISOString();
      context.metadata.version += 1;
      
      // Track evolution
      if (context.metadata.evolving) {
        await this._evolveContext(context, previousState, trigger);
      }
      
      // Sync with MCP MAX
      if (this.activeContexts.has(contextId)) {
        await this._syncContextWithMCPMax(context);
      }
      
      // Save to storage
      await this._saveContextsToStorage();
      
      eventBus.emit('mmco:context-updated', { 
        contextId, 
        updates, 
        context 
      });
      
      return context;
      
    } catch (error) {
      console.error('❌ Error updating context:', error);
      throw error;
    }
  }

  /**
   * Get context by ID
   */
  getContext(contextId) {
    return this.contextObjects.get(contextId);
  }

  /**
   * Get contexts by type
   */
  getContextsByType(type) {
    return Array.from(this.contextObjects.values())
      .filter(context => context.type === type);
  }

  /**
   * Get active contexts (currently being used by AI)
   */
  getActiveContexts() {
    return Array.from(this.activeContexts)
      .map(id => this.contextObjects.get(id))
      .filter(Boolean);
  }

  /**
   * Activate context for AI use
   */
  async activateContext(contextId) {
    try {
      const context = this.contextObjects.get(contextId);
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }
      
      this.activeContexts.add(contextId);
      
      // Sync with MCP MAX
      await this._syncContextWithMCPMax(context);
      
      eventBus.emit('mmco:context-activated', { contextId, context });
      
      console.log(`✅ Activated context: ${contextId}`);
      return context;
      
    } catch (error) {
      console.error('❌ Error activating context:', error);
      throw error;
    }
  }

  /**
   * Deactivate context
   */
  async deactivateContext(contextId) {
    try {
      this.activeContexts.delete(contextId);
      
      eventBus.emit('mmco:context-deactivated', { contextId });
      
      console.log(`✅ Deactivated context: ${contextId}`);
      
    } catch (error) {
      console.error('❌ Error deactivating context:', error);
      throw error;
    }
  }

  /**
   * Create project context for the current project
   */
  async createProjectContext(projectData) {
    return await this.createContext('project', {
      name: projectData.name || 'Firesite Project Service',
      description: projectData.description || 'AI-powered project management system',
      goals: [
        'Replace mock implementations with real infrastructure',
        'Integrate Firebase Functions with MCP MAX',
        'Implement KaibanJS multi-agent coordination',
        'Enable context evolution and learning'
      ],
      currentPhase: 'integration',
      technologies: [
        'Firebase Functions',
        'MCP MAX Server',
        'KaibanJS',
        'Vite',
        'JavaScript ES6+'
      ],
      team: {
        human: ['Tom Butler'],
        ai: ['Claude', 'Planning Agent', 'Development Agent', 'Testing Agent']
      },
      preferences: {
        codeStyle: 'ES6+ modules with JSDoc',
        architecture: 'Service-first with event-driven communication',
        testing: 'Comprehensive unit and integration tests',
        documentation: 'Clear, practical documentation'
      }
    }, {
      evolving: true,
      priority: 'high',
      tags: ['project', 'infrastructure', 'ai-integration']
    });
  }

  /**
   * Create task context for specific tasks
   */
  async createTaskContext(taskData, projectContextId) {
    return await this.createContext('task', {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: taskData.status || taskData.columnId,
      estimatedHours: taskData.estimatedHours,
      actualHours: 0,
      complexity: 'unknown',
      dependencies: [],
      blockers: [],
      learnings: [],
      aiAssistance: {
        suggestionsUsed: [],
        implementationApproach: null,
        testingStrategy: null,
        documentation: null
      }
    }, {
      parent: projectContextId,
      evolving: true,
      priority: taskData.priority || 'medium',
      tags: ['task', taskData.priority || 'medium']
    });
  }

  /**
   * Create session context for current work session
   */
  async createSessionContext() {
    return await this.createContext('session', {
      startTime: new Date().toISOString(),
      goals: [],
      completedTasks: [],
      currentFocus: null,
      aiInteractions: [],
      learnings: [],
      challenges: [],
      achievements: []
    }, {
      evolving: true,
      priority: 'medium',
      tags: ['session', 'current']
    });
  }

  /**
   * Evolve context based on new information and triggers
   */
  async _evolveContext(context, previousState, trigger) {
    try {
      const evolution = {
        timestamp: new Date().toISOString(),
        trigger: trigger,
        previousState: previousState,
        currentState: context.data,
        changes: this._detectChanges(previousState, context.data),
        evolutionType: this._determineEvolutionType(trigger)
      };
      
      context.evolution.changeCount += 1;
      context.evolution.lastEvolved = evolution.timestamp;
      context.evolution.evolutionTriggers.push(trigger);
      
      // Apply evolution rules
      await this._applyEvolutionRules(context, evolution);
      
      // Learn from the evolution
      await this._extractLearnings(context, evolution);
      
      // Store evolution history
      this.evolutionHistory.push({
        contextId: context.id,
        evolution: evolution
      });
      
      // Keep only last 1000 evolution records
      if (this.evolutionHistory.length > 1000) {
        this.evolutionHistory = this.evolutionHistory.slice(-1000);
      }
      
      eventBus.emit('mmco:context-evolved', { 
        contextId: context.id, 
        evolution 
      });
      
      console.log(`🧬 Context evolved: ${context.id} (${trigger})`);
      
    } catch (error) {
      console.error('❌ Error evolving context:', error);
    }
  }

  /**
   * Sync context with MCP MAX
   */
  async _syncContextWithMCPMax(context) {
    try {
      if (!mcpMaxService.isInitialized) return;
      
      // Create MMCO for MCP MAX
      const mmcoData = {
        contextId: context.id,
        type: context.type,
        data: context.data,
        metadata: context.metadata,
        evolving: context.metadata.evolving
      };
      
      await mcpMaxService.setMMCOContext(mmcoData);
      
    } catch (error) {
      console.error('❌ Error syncing context with MCP MAX:', error);
    }
  }

  /**
   * Setup evolution rules
   */
  _setupEvolutionRules() {
    // Task completion rule
    this.evolutionRules.set('task-completed', {
      condition: (context, evolution) => {
        return context.type === 'task' && 
               evolution.changes.some(change => 
                 change.field === 'status' && 
                 change.newValue === 'done'
               );
      },
      action: async (context, evolution) => {
        // Update project context with completion data
        const projectContext = this._findParentContext(context, 'project');
        if (projectContext) {
          await this.updateContext(projectContext.id, {
            tasksCompleted: (projectContext.data.tasksCompleted || 0) + 1,
            lastTaskCompleted: context.data.title
          }, 'task-completion');
        }
      }
    });
    
    // Learning accumulation rule
    this.evolutionRules.set('learning-accumulation', {
      condition: (context, evolution) => {
        return evolution.changes.some(change => 
          change.field === 'learnings' || 
          change.field === 'aiAssistance'
        );
      },
      action: async (context, evolution) => {
        // Extract and store learnings for future reference
        const learnings = context.data.learnings || [];
        if (learnings.length > 0) {
          context.evolution.learningContext = {
            ...context.evolution.learningContext,
            lastLearning: learnings[learnings.length - 1],
            totalLearnings: learnings.length
          };
        }
      }
    });
  }

  /**
   * Apply evolution rules to context
   */
  async _applyEvolutionRules(context, evolution) {
    for (const [ruleName, rule] of this.evolutionRules.entries()) {
      try {
        if (rule.condition(context, evolution)) {
          await rule.action(context, evolution);
          console.log(`📋 Applied evolution rule: ${ruleName}`);
        }
      } catch (error) {
        console.error(`❌ Error applying evolution rule ${ruleName}:`, error);
      }
    }
  }

  /**
   * Extract learnings from context evolution
   */
  async _extractLearnings(context, evolution) {
    const learnings = [];
    
    // Analyze changes for patterns
    for (const change of evolution.changes) {
      if (change.field === 'status' && change.newValue === 'done') {
        learnings.push({
          type: 'completion',
          insight: `Task "${context.data.title}" completed successfully`,
          timestamp: evolution.timestamp
        });
      }
      
      if (change.field === 'actualHours' && change.oldValue !== undefined) {
        const timeDiff = change.newValue - (change.oldValue || 0);
        learnings.push({
          type: 'time-tracking',
          insight: `Time spent: ${timeDiff} hours on "${context.data.title}"`,
          timestamp: evolution.timestamp
        });
      }
    }
    
    // Store learnings in context
    if (learnings.length > 0) {
      context.evolution.learningContext = {
        ...context.evolution.learningContext,
        extractedLearnings: [
          ...(context.evolution.learningContext.extractedLearnings || []),
          ...learnings
        ]
      };
    }
  }

  /**
   * Setup event listeners for automatic context updates
   */
  _setupEventListeners() {
    // Listen for task updates
    eventBus.on('kanban:task:created', async (data) => {
      const projectContexts = this.getContextsByType('project');
      if (projectContexts.length > 0) {
        await this.createTaskContext(data.task, projectContexts[0].id);
      }
    });
    
    eventBus.on('kanban:task:updated', async (data) => {
      const taskContexts = this.getContextsByType('task');
      const taskContext = taskContexts.find(ctx => 
        ctx.data.title === data.task.title
      );
      
      if (taskContext) {
        await this.updateContext(taskContext.id, {
          status: data.task.columnId,
          priority: data.task.priority,
          updatedAt: data.task.updatedAt
        }, 'task-update');
      }
    });
    
    // Listen for AI interactions
    eventBus.on('ai:execution-complete', async (data) => {
      const sessionContexts = this.getContextsByType('session');
      if (sessionContexts.length > 0) {
        const sessionContext = sessionContexts[0];
        await this.updateContext(sessionContext.id, {
          aiInteractions: [
            ...(sessionContext.data.aiInteractions || []),
            {
              timestamp: new Date().toISOString(),
              execution: data.execution
            }
          ]
        }, 'ai-interaction');
      }
    });
  }

  /**
   * Load contexts from storage
   */
  async _loadContextsFromStorage() {
    try {
      const data = localStorage.getItem('firesite-mmco');
      if (data) {
        const parsed = JSON.parse(data);
        this.contextObjects = new Map(parsed.contexts || []);
        this.evolutionHistory = parsed.evolutionHistory || [];
        this.activeContexts = new Set(parsed.activeContexts || []);
      }
    } catch (error) {
      console.error('❌ Error loading contexts from storage:', error);
    }
  }

  /**
   * Save contexts to storage
   */
  async _saveContextsToStorage() {
    try {
      const data = {
        contexts: Array.from(this.contextObjects.entries()),
        evolutionHistory: this.evolutionHistory,
        activeContexts: Array.from(this.activeContexts),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('firesite-mmco', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error saving contexts to storage:', error);
    }
  }

  /**
   * Generate unique context ID
   */
  _generateContextId(type) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Detect changes between states
   */
  _detectChanges(oldState, newState) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changes.push({
          field: key,
          oldValue: oldState[key],
          newValue: newState[key]
        });
      }
    }
    
    return changes;
  }

  /**
   * Determine evolution type based on trigger
   */
  _determineEvolutionType(trigger) {
    const types = {
      'manual': 'user-driven',
      'task-update': 'system-driven',
      'ai-interaction': 'ai-driven',
      'completion': 'milestone-driven'
    };
    
    return types[trigger] || 'unknown';
  }

  /**
   * Find parent context of given type
   */
  _findParentContext(context, type) {
    if (!context.relationships.parent) return null;
    
    const parent = this.contextObjects.get(context.relationships.parent);
    if (!parent) return null;
    
    if (parent.type === type) return parent;
    
    return this._findParentContext(parent, type);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalContexts: this.contextObjects.size,
      activeContexts: this.activeContexts.size,
      evolutionHistory: this.evolutionHistory.length,
      contextTypes: Object.keys(this.contextTypes),
      evolutionRules: this.evolutionRules.size
    };
  }
}

// Export singleton instance
export const mmcoService = new MMCOService();
export default mmcoService;