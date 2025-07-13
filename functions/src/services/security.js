/**
 * @fileoverview Security service for authentication and rate limiting
 * @module services/security
 */

class SecurityService {
  constructor() {
    this.rateLimits = new Map();
    this.authTokens = new Map();
    this.config = {
      defaultRateLimit: 100, // requests per minute
      defaultBurstLimit: 10, // concurrent requests
      defaultTokenTTL: 3600000, // 1 hour
    };
  }

  /**
   * Secure a function with authentication and rate limiting
   * @param {Function} fn - Function to secure
   * @param {Object} options - Security options
   * @returns {Function} Wrapped function with security checks
   */
  secure(fn, options = {}) {
    const {
      requireAuth = true,
      rateLimit = true,
      customRateLimit = this.config.defaultRateLimit,
      customBurstLimit = this.config.defaultBurstLimit,
    } = options;

    return async (...args) => {
      const token = this.extractToken(args);

      if (requireAuth && !this.isValidToken(token)) {
        throw new Error('Authentication required');
      }

      if (rateLimit && !this.checkRateLimit(token, customRateLimit, customBurstLimit)) {
        throw new Error('Rate limit exceeded');
      }

      try {
        const result = await fn(...args);
        return result;
      } finally {
        if (rateLimit) {
          this.updateRateLimit(token);
        }
      }
    };
  }

  /**
   * Extract token from function arguments
   * @private
   */
  extractToken(args) {
    // Look for token in common places
    for (const arg of args) {
      if (typeof arg === 'string' && arg.startsWith('Bearer ')) {
        return arg.slice(7);
      }
      if (arg && typeof arg === 'object') {
        if (arg.idToken) return arg.idToken;
        if (arg.token) return arg.token;
        if (arg.authorization && arg.authorization.startsWith('Bearer ')) {
          return arg.authorization.slice(7);
        }
      }
    }
    return null;
  }

  /**
   * Validate authentication token
   * @private
   */
  isValidToken(token) {
    if (!token) return false;
    const tokenData = this.authTokens.get(token);
    if (!tokenData) return false;

    const now = Date.now();
    if (now > tokenData.expires) {
      this.authTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Check rate limit for a token
   * @private
   */
  checkRateLimit(token, rateLimit, burstLimit) {
    const now = Date.now();
    const key = token || 'anonymous';

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, {
        requests: [],
        concurrent: 0,
      });
    }

    const limits = this.rateLimits.get(key);

    // Clean up old requests
    limits.requests = limits.requests.filter(time => now - time < 60000);

    // Check rate limit
    if (limits.requests.length >= rateLimit) {
      return false;
    }

    // Check burst limit
    if (limits.concurrent >= burstLimit) {
      return false;
    }

    limits.concurrent++;
    return true;
  }

  /**
   * Update rate limit tracking after request completion
   * @private
   */
  updateRateLimit(token) {
    const key = token || 'anonymous';
    const limits = this.rateLimits.get(key);
    if (!limits) return;

    limits.requests.push(Date.now());
    limits.concurrent = Math.max(0, limits.concurrent - 1);
  }

  /**
   * Register a new authentication token
   * @param {string} token - Authentication token
   * @param {Object} metadata - Token metadata
   */
  registerToken(token, metadata = {}) {
    const { ttl = this.config.defaultTokenTTL } = metadata;
    this.authTokens.set(token, {
      ...metadata,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Remove an authentication token
   * @param {string} token - Authentication token
   */
  removeToken(token) {
    this.authTokens.delete(token);
    this.rateLimits.delete(token);
  }

  /**
   * Clean up expired tokens and rate limits
   */
  cleanup() {
    const now = Date.now();

    // Clean up expired tokens
    for (const [token, data] of this.authTokens.entries()) {
      if (now > data.expires) {
        this.authTokens.delete(token);
        this.rateLimits.delete(token);
      }
    }

    // Clean up rate limits for anonymous users
    if (this.rateLimits.has('anonymous')) {
      const limits = this.rateLimits.get('anonymous');
      limits.requests = limits.requests.filter(time => now - time < 60000);
      if (limits.requests.length === 0 && limits.concurrent === 0) {
        this.rateLimits.delete('anonymous');
      }
    }
  }

  /**
   * Get security metrics
   * @returns {Object} Security metrics
   */
  getMetrics() {
    return {
      activeTokens: this.authTokens.size,
      rateLimitedUsers: this.rateLimits.size,
      config: this.config,
    };
  }
}

// Export singleton instance
module.exports = new SecurityService();
