/**
 * Event Bus - Central event management for Project Service
 * Provides event-driven communication between services and components
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 100;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);
    
    if (listeners.length >= this.maxListeners) {
      console.warn(`EventBus: Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`);
    }

    listeners.push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const listeners = this.events.get(event);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = null) {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) return;

    // Create event object
    const eventObj = {
      type: event,
      data,
      timestamp: Date.now()
    };

    // Call all listeners
    listeners.forEach(callback => {
      try {
        callback(eventObj.data, eventObj);
      } catch (error) {
        console.error(`EventBus: Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  once(event, callback) {
    const onceWrapper = (data, eventObj) => {
      callback(data, eventObj);
      this.off(event, onceWrapper);
    };
    
    this.on(event, onceWrapper);
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
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

  /**
   * Get debug information
   * @returns {Object} Debug info
   */
  getDebugInfo() {
    const info = {
      totalEvents: this.events.size,
      totalListeners: 0,
      events: {}
    };

    for (const [event, listeners] of this.events.entries()) {
      info.events[event] = listeners.length;
      info.totalListeners += listeners.length;
    }

    return info;
  }
}

// Export both class and singleton instance
export { EventBus };
export const eventBus = new EventBus();
export default eventBus;