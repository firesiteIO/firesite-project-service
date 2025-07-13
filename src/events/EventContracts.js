/**
 * Event Contracts - Defines event payload structures and validation
 * Based on KaibanJS analysis for service-first architecture
 */

// Agent Status Lifecycle
export const AGENT_STATUS = {
  INITIAL: 'INITIAL',
  THINKING: 'THINKING',
  THINKING_END: 'THINKING_END',
  THINKING_ERROR: 'THINKING_ERROR',
  THOUGHT: 'THOUGHT',
  EXECUTING_ACTION: 'EXECUTING_ACTION',
  USING_TOOL: 'USING_TOOL',
  USING_TOOL_END: 'USING_TOOL_END',
  USING_TOOL_ERROR: 'USING_TOOL_ERROR',
  OBSERVATION: 'OBSERVATION',
  FINAL_ANSWER: 'FINAL_ANSWER',
  TASK_COMPLETED: 'TASK_COMPLETED',
  MAX_ITERATIONS_ERROR: 'MAX_ITERATIONS_ERROR',
  ISSUES_PARSING_LLM_OUTPUT: 'ISSUES_PARSING_LLM_OUTPUT',
  SELF_QUESTION: 'SELF_QUESTION',
  ITERATION_START: 'ITERATION_START',
  ITERATION_END: 'ITERATION_END'
};

// Task Status States
export const TASK_STATUS = {
  TODO: 'TODO',
  DOING: 'DOING',
  BLOCKED: 'BLOCKED',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  REVISE: 'REVISE',
  DONE: 'DONE',
  AWAITING_VALIDATION: 'AWAITING_VALIDATION',
  VALIDATED: 'VALIDATED',
  ABORTED: 'ABORTED'
};

// Workflow Status Management
export const WORKFLOW_STATUS = {
  INITIAL: 'INITIAL',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  ERRORED: 'ERRORED',
  FINISHED: 'FINISHED',
  BLOCKED: 'BLOCKED'
};

// Event Contracts
export const EVENT_CONTRACTS = {
  // Agent Events
  'agent:status-changed': {
    required: ['agentId', 'oldStatus', 'newStatus'],
    optional: ['metadata', 'timestamp'],
    description: 'Agent status transition event'
  },
  'agent:thinking-start': {
    required: ['agentId', 'taskId', 'iteration'],
    optional: ['context', 'metadata'],
    description: 'Agent begins thinking phase'
  },
  'agent:thinking-end': {
    required: ['agentId', 'taskId', 'result'],
    optional: ['iteration', 'duration'],
    description: 'Agent completes thinking phase'
  },
  'agent:action-executing': {
    required: ['agentId', 'action', 'tool'],
    optional: ['taskId', 'parameters'],
    description: 'Agent executing action with tool'
  },
  'agent:observation': {
    required: ['agentId', 'observation', 'context'],
    optional: ['taskId', 'iteration'],
    description: 'Agent processes observation'
  },
  'agent:final-answer': {
    required: ['agentId', 'taskId', 'answer'],
    optional: ['confidence', 'metadata'],
    description: 'Agent provides final answer'
  },
  'agent:error': {
    required: ['agentId', 'error'],
    optional: ['taskId', 'context', 'stackTrace'],
    description: 'Agent encounters error'
  },

  // Task Events
  'task:created': {
    required: ['task'],
    optional: ['metadata'],
    description: 'New task created'
  },
  'task:status-changed': {
    required: ['taskId', 'oldStatus', 'newStatus'],
    optional: ['metadata', 'timestamp'],
    description: 'Task status transition'
  },
  'task:agent-assigned': {
    required: ['taskId', 'agentId'],
    optional: ['timestamp'],
    description: 'Agent assigned to task'
  },
  'task:started': {
    required: ['taskId', 'agentId'],
    optional: ['context', 'inputs'],
    description: 'Task execution started'
  },
  'task:completed': {
    required: ['taskId', 'result'],
    optional: ['agentId', 'duration', 'metadata'],
    description: 'Task completed successfully'
  },
  'task:blocked': {
    required: ['taskId', 'reason'],
    optional: ['agentId', 'dependencies'],
    description: 'Task blocked by dependencies or issues'
  },
  'task:feedback-provided': {
    required: ['taskId', 'feedback'],
    optional: ['providerId', 'timestamp'],
    description: 'Feedback provided for task'
  },
  'task:validation-required': {
    required: ['taskId'],
    optional: ['validator', 'requirements'],
    description: 'Task requires external validation'
  },
  'task:validated': {
    required: ['taskId'],
    optional: ['validator', 'comments'],
    description: 'Task validated successfully'
  },
  'task:error': {
    required: ['taskId', 'error'],
    optional: ['agentId', 'context'],
    description: 'Task execution error'
  },

  // Workflow Events
  'workflow:started': {
    required: ['teamId'],
    optional: ['inputs', 'metadata'],
    description: 'Workflow execution started'
  },
  'workflow:paused': {
    required: ['teamId'],
    optional: ['reason'],
    description: 'Workflow paused'
  },
  'workflow:resumed': {
    required: ['teamId'],
    optional: ['resumeContext'],
    description: 'Workflow resumed'
  },
  'workflow:completed': {
    required: ['teamId', 'result'],
    optional: ['stats', 'duration'],
    description: 'Workflow completed successfully'
  },
  'workflow:blocked': {
    required: ['teamId', 'reason'],
    optional: ['blockedTasks'],
    description: 'Workflow blocked'
  },
  'workflow:error': {
    required: ['teamId', 'error'],
    optional: ['context', 'failedTasks'],
    description: 'Workflow error occurred'
  },

  // Team Events
  'team:agents-added': {
    required: ['teamId', 'agents'],
    optional: ['metadata'],
    description: 'Agents added to team'
  },
  'team:tasks-added': {
    required: ['teamId', 'tasks'],
    optional: ['metadata'],
    description: 'Tasks added to team'
  },

  // UI Events
  'ui:task-card-clicked': {
    required: ['taskId'],
    optional: ['source', 'metadata'],
    description: 'Task card clicked in UI'
  },
  'ui:agent-panel-opened': {
    required: ['agentId'],
    optional: ['source'],
    description: 'Agent panel opened'
  },
  'ui:workflow-control-action': {
    required: ['action', 'teamId'],
    optional: ['parameters'],
    description: 'Workflow control action triggered'
  }
};

/**
 * Event Contract Validator
 */
export class EventContractValidator {
  /**
   * Validate event payload against contract
   * @param {string} eventName - Event name
   * @param {Object} payload - Event payload
   * @returns {Object} Validation result
   */
  static validate(eventName, payload) {
    const contract = EVENT_CONTRACTS[eventName];
    
    if (!contract) {
      return {
        valid: false,
        error: `No contract defined for event: ${eventName}`,
        missing: [],
        extra: []
      };
    }

    const result = {
      valid: true,
      error: null,
      missing: [],
      extra: []
    };

    // Check required fields
    for (const field of contract.required) {
      if (!(field in payload)) {
        result.missing.push(field);
        result.valid = false;
      }
    }

    // Check for extra fields (not in required or optional)
    const allowedFields = [...contract.required, ...(contract.optional || [])];
    for (const field in payload) {
      if (!allowedFields.includes(field)) {
        result.extra.push(field);
      }
    }

    if (!result.valid) {
      result.error = `Event ${eventName} missing required fields: ${result.missing.join(', ')}`;
    }

    return result;
  }

  /**
   * Get contract for event
   * @param {string} eventName - Event name
   * @returns {Object|null} Event contract
   */
  static getContract(eventName) {
    return EVENT_CONTRACTS[eventName] || null;
  }

  /**
   * List all available events
   * @returns {Array<string>} Event names
   */
  static getAvailableEvents() {
    return Object.keys(EVENT_CONTRACTS);
  }

  /**
   * Generate event documentation
   * @returns {string} Documentation string
   */
  static generateDocs() {
    let docs = '# Event Contracts Documentation\n\n';
    
    const categories = {
      'Agent Events': [],
      'Task Events': [],
      'Workflow Events': [],
      'Team Events': [],
      'UI Events': []
    };

    // Categorize events
    for (const [eventName, contract] of Object.entries(EVENT_CONTRACTS)) {
      if (eventName.startsWith('agent:')) {
        categories['Agent Events'].push({ eventName, contract });
      } else if (eventName.startsWith('task:')) {
        categories['Task Events'].push({ eventName, contract });
      } else if (eventName.startsWith('workflow:')) {
        categories['Workflow Events'].push({ eventName, contract });
      } else if (eventName.startsWith('team:')) {
        categories['Team Events'].push({ eventName, contract });
      } else if (eventName.startsWith('ui:')) {
        categories['UI Events'].push({ eventName, contract });
      }
    }

    // Generate documentation
    for (const [category, events] of Object.entries(categories)) {
      if (events.length === 0) continue;
      
      docs += `## ${category}\n\n`;
      
      for (const { eventName, contract } of events) {
        docs += `### ${eventName}\n`;
        docs += `${contract.description}\n\n`;
        docs += `**Required:** ${contract.required.join(', ')}\n`;
        if (contract.optional?.length) {
          docs += `**Optional:** ${contract.optional.join(', ')}\n`;
        }
        docs += '\n';
      }
    }

    return docs;
  }
}

export default {
  AGENT_STATUS,
  TASK_STATUS,
  WORKFLOW_STATUS,
  EVENT_CONTRACTS,
  EventContractValidator
};