/**
 * @fileoverview Performance monitoring service
 * @module services/performance
 */

class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Monitor a function call with performance metrics
   * @param {Function} fn - Function to monitor
   * @param {string} name - Name of the operation
   * @returns {Function} Wrapped function with performance monitoring
   */
  monitor(fn, name) {
    return async (...args) => {
      const startTime = Date.now();
      this.startTimes.set(name, startTime);

      try {
        const result = await fn(...args);
        this.recordMetric(name, Date.now() - startTime);
        return result;
      } catch (error) {
        this.recordError(name, error);
        throw error;
      }
    };
  }

  /**
   * Record a performance metric
   * @param {string} name - Name of the operation
   * @param {number} duration - Duration in milliseconds
   */
  recordMetric(name, duration) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: -Infinity,
        errors: 0,
        lastError: null,
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
  }

  /**
   * Record an error for an operation
   * @param {string} name - Name of the operation
   * @param {Error} error - Error that occurred
   */
  recordError(name, error) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: -Infinity,
        errors: 0,
        lastError: null,
      });
    }

    const metric = this.metrics.get(name);
    metric.errors++;
    metric.lastError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    };
  }

  /**
   * Get performance metrics for all operations
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const metricsObj = {};
    for (const [name, metric] of this.metrics) {
      metricsObj[name] = {
        ...metric,
        currentOperation: this.startTimes.has(name)
          ? {
              startTime: this.startTimes.get(name),
              elapsedTime: Date.now() - this.startTimes.get(name),
            }
          : null,
      };
    }
    return metricsObj;
  }

  /**
   * Reset all performance metrics
   */
  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Export singleton instance
module.exports = new PerformanceService();
