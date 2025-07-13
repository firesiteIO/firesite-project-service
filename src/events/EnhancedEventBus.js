/**
 * Enhanced Event Bus - Advanced event management with contracts and validation
 * Based on KaibanJS analysis for service-first architecture
 */

import { EventContractValidator } from './EventContracts.js';

/**
 * Enhanced Event Bus with contract validation and advanced features
 */
export class EnhancedEventBus {
  constructor(options = {}) {
    this.events = new Map();
    this.maxListeners = options.maxListeners || 100;
    this.enableValidation = options.enableValidation !== false;
    this.enableLogging = options.enableLogging || false;
    this.logLevel = options.logLevel || 'warn'; // 'debug', 'info', 'warn', 'error'
    
    // Event flow tracking
    this.eventFlows = new Map();
    this.flowHistory = [];
    this.maxFlowHistory = options.maxFlowHistory || 1000;
    
    // Performance tracking
    this.stats = {
      totalEvents: 0,
      eventsPerSecond: 0,
      lastResetTime: Date.now()
    };
    
    // Event middleware
    this.middleware = {
      pre: [], // Before event emission
      post: [] // After event emission
    };
  }

  /**
   * Subscribe to an event with enhanced features
   * @param {string|Array<string>} events - Event name(s)
   * @param {Function} callback - Event handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(events, callback, options = {}) {
    const eventArray = Array.isArray(events) ? events : [events];
    const unsubscribers = [];

    for (const event of eventArray) {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }

      const listeners = this.events.get(event);
      
      if (listeners.length >= this.maxListeners) {
        this._log('warn', `Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`);
      }

      // Enhanced listener object
      const listener = {
        callback,
        once: options.once || false,
        priority: options.priority || 0,
        context: options.context || null,
        filter: options.filter || null,
        subscriptionTime: Date.now(),
        callCount: 0
      };

      listeners.push(listener);
      
      // Sort by priority (higher priority first)
      listeners.sort((a, b) => b.priority - a.priority);

      // Create unsubscriber for this event
      const unsubscriber = () => this.off(event, callback);
      unsubscribers.push(unsubscriber);
    }

    // Return combined unsubscriber
    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Subscribe to an event once
   * @param {string|Array<string>} events - Event name(s)
   * @param {Function} callback - Event handler
   * @param {Object} options - Subscription options
   */
  once(events, callback, options = {}) {
    return this.on(events, callback, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const listeners = this.events.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(listener => listener.callback === callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event with validation and middleware
   * @param {string} event - Event name
   * @param {*} payload - Event payload
   * @param {Object} options - Emission options
   */
  async emit(event, payload = {}, options = {}) {
    const startTime = Date.now();
    
    // Validate payload against contract
    if (this.enableValidation) {
      const validation = EventContractValidator.validate(event, payload);
      if (!validation.valid) {
        this._log('warn', `Event validation failed for ${event}:`, validation.error);
        // For now, only warn about validation failures during development
        // Don't throw errors to allow graceful operation
      }
      
      if (validation.extra.length > 0) {
        this._log('debug', `Event ${event} has extra fields:`, validation.extra);
      }
    }

    // Create enhanced event object
    const eventObj = {
      type: event,
      payload,
      timestamp: Date.now(),
      source: options.source || 'unknown',
      id: this._generateEventId(),
      sequence: this.stats.totalEvents
    };

    // Pre-emission middleware
    for (const middleware of this.middleware.pre) {
      try {
        await middleware(eventObj);
      } catch (error) {
        this._log('error', `Pre-emission middleware error for ${event}:`, error);
      }
    }

    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      this._log('debug', `No listeners for event: ${event}`);
      return;
    }

    // Track event flow
    this._trackEventFlow(event, eventObj);

    const results = [];
    const listenersToRemove = [];

    // Call all listeners
    for (const listener of listeners) {
      try {
        // Apply filter if present
        if (listener.filter && !listener.filter(eventObj.payload, eventObj)) {
          continue;
        }

        listener.callCount++;
        
        // Call the listener
        const result = await listener.callback(eventObj.payload, eventObj);
        results.push(result);

        // Remove once listeners
        if (listener.once) {
          listenersToRemove.push(listener);
        }

      } catch (error) {
        this._log('error', `Event listener error for ${event}:`, error);
        
        // Track error in event object
        eventObj.error = error;
      }
    }

    // Remove once listeners
    if (listenersToRemove.length > 0) {
      const remainingListeners = listeners.filter(l => !listenersToRemove.includes(l));
      if (remainingListeners.length === 0) {
        this.events.delete(event);
      } else {
        this.events.set(event, remainingListeners);
      }
    }

    // Post-emission middleware
    for (const middleware of this.middleware.post) {
      try {
        await middleware(eventObj, results);
      } catch (error) {
        this._log('error', `Post-emission middleware error for ${event}:`, error);
      }
    }

    // Update stats
    this._updateStats();
    
    // Log performance
    const duration = Date.now() - startTime;
    this._log('debug', `Event ${event} emitted to ${listeners.length} listeners in ${duration}ms`);

    return results;
  }

  /**
   * Add middleware
   * @param {string} type - 'pre' or 'post'
   * @param {Function} middleware - Middleware function
   */
  use(type, middleware) {
    if (type === 'pre' || type === 'post') {
      this.middleware[type].push(middleware);
    } else {
      throw new Error(`Invalid middleware type: ${type}. Use 'pre' or 'post'.`);
    }
  }

  /**
   * Define an event flow
   * @param {string} flowName - Flow name
   * @param {Array<string>} events - Ordered list of events
   */
  defineFlow(flowName, events) {
    this.eventFlows.set(flowName, {
      events,
      currentStep: 0,
      started: false,
      completed: false
    });
  }

  /**
   * Start an event flow
   * @param {string} flowName - Flow name
   * @param {Object} initialData - Initial data
   */
  startFlow(flowName, initialData = {}) {
    const flow = this.eventFlows.get(flowName);
    if (!flow) {
      throw new Error(`Unknown flow: ${flowName}`);
    }

    flow.started = true;
    flow.currentStep = 0;
    flow.completed = false;
    flow.startTime = Date.now();
    flow.data = { ...initialData };

    this._log('info', `Starting flow: ${flowName}`);
    return this._executeFlowStep(flowName);
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const now = Date.now();
    const elapsed = (now - this.stats.lastResetTime) / 1000;
    
    return {
      totalEvents: this.stats.totalEvents,
      eventsPerSecond: elapsed > 0 ? this.stats.totalEvents / elapsed : 0,
      totalListeners: this._getTotalListeners(),
      uniqueEvents: this.events.size,
      activeFlows: Array.from(this.eventFlows.values()).filter(f => f.started && !f.completed).length,
      flowHistory: this.flowHistory.length
    };
  }

  /**
   * Get debug information
   * @returns {Object} Debug info
   */
  getDebugInfo() {
    const info = {
      ...this.getStats(),
      events: {},
      flows: Object.fromEntries(this.eventFlows),
      recentEvents: this.flowHistory.slice(-10)
    };

    for (const [event, listeners] of this.events.entries()) {
      info.events[event] = {
        listenerCount: listeners.length,
        totalCalls: listeners.reduce((sum, l) => sum + l.callCount, 0),
        priorities: listeners.map(l => l.priority)
      };
    }

    return info;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats.totalEvents = 0;
    this.stats.lastResetTime = Date.now();
    this.flowHistory = [];
  }

  /**
   * Remove all listeners
   * @param {string} event - Optional event name
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all event names
   * @returns {Array<string>} Array of event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  // Private methods

  _log(level, message, ...args) {
    if (!this.enableLogging) return;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      console[level](`[EventBus] ${message}`, ...args);
    }
  }

  _generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _trackEventFlow(event, eventObj) {
    this.flowHistory.push({
      event,
      timestamp: eventObj.timestamp,
      id: eventObj.id
    });

    // Trim history if needed
    if (this.flowHistory.length > this.maxFlowHistory) {
      this.flowHistory = this.flowHistory.slice(-this.maxFlowHistory);
    }
  }

  _updateStats() {
    this.stats.totalEvents++;
  }

  _getTotalListeners() {
    let total = 0;
    for (const listeners of this.events.values()) {
      total += listeners.length;
    }
    return total;
  }

  async _executeFlowStep(flowName) {
    const flow = this.eventFlows.get(flowName);
    if (!flow || flow.currentStep >= flow.events.length) {
      if (flow) {
        flow.completed = true;
        flow.endTime = Date.now();
        this._log('info', `Flow completed: ${flowName}`);
      }
      return;
    }

    const eventName = flow.events[flow.currentStep];
    this._log('debug', `Executing flow step ${flow.currentStep + 1}: ${eventName}`);
    
    await this.emit(eventName, flow.data, { source: `flow:${flowName}` });
    
    flow.currentStep++;
    return this._executeFlowStep(flowName);
  }
}

// Create enhanced global instance
export const globalEvents = new EnhancedEventBus({
  enableValidation: true,
  enableLogging: true,
  logLevel: 'info'
});

export default globalEvents;