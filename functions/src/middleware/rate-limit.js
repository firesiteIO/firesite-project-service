/**
 * @fileoverview Rate limiting middleware
 * @module middleware/rate-limit
 */

const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");

class FirestoreStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.db = admin.firestore();
    // Fallback in-memory store for when Firestore is not available
    this.memoryStore = new Map();
  }

  async increment(key) {
    if (!key) {
      throw new Error("Rate limit key is required");
    }

    // For development or when Firestore is not available, use in-memory store
    if (
      process.env.NODE_ENV === "development" ||
      process.env.FUNCTIONS_EMULATOR === "true"
    ) {
      return this._incrementMemory(key);
    }

    // Sanitize the key for use as a document ID
    const docId = encodeURIComponent(key).replace(/[.#$[\]]/g, "_");
    const ref = this.db.collection("rateLimits").doc(docId);

    try {
      const now = Date.now();
      const doc = await ref.get();

      if (!doc.exists || (doc.exists && doc.data().expires < now)) {
        // Create new document or reset expired one
        const resetTime = new Date(now + this.windowMs);
        await ref.set({
          count: 1,
          expires: resetTime.getTime(),
          totalHits: 1,
          key: docId,
        });
        return { totalHits: 1, resetTime };
      } else {
        // Update existing document
        const data = doc.data();
        const newCount = data.count + 1;
        await ref.update({
          count: newCount,
          totalHits: (data.totalHits || 0) + 1,
        });
        return {
          totalHits: newCount,
          resetTime: new Date(data.expires),
        };
      }
    } catch (error) {
      console.error("Rate limit error:", error);
      // If Firestore fails, fall back to memory store
      return this._incrementMemory(key);
    }
  }

  // In-memory fallback implementation
  _incrementMemory(key) {
    const now = Date.now();
    let record = this.memoryStore.get(key);
    const resetTime = new Date(now + this.windowMs);

    if (!record || record.expires < now) {
      record = {
        count: 1,
        expires: resetTime.getTime(),
        totalHits: 1,
      };
    } else {
      record.count += 1;
      record.totalHits += 1;
    }

    this.memoryStore.set(key, record);
    return { totalHits: record.count, resetTime };
  }

  async decrement(key) {
    if (!key) return;

    // For development or when Firestore is not available, use in-memory store
    if (
      process.env.NODE_ENV === "development" ||
      process.env.FUNCTIONS_EMULATOR === "true"
    ) {
      const record = this.memoryStore.get(key);
      if (record && record.count > 0) {
        record.count -= 1;
        record.totalHits = Math.max(0, record.totalHits - 1);
        this.memoryStore.set(key, record);
      }
      return;
    }

    const docId = encodeURIComponent(key).replace(/[.#$[\]]/g, "_");
    try {
      const ref = this.db.collection("rateLimits").doc(docId);
      const doc = await ref.get();
      if (doc.exists) {
        const current = doc.data();
        if (current.count > 0) {
          await ref.update({
            count: current.count - 1,
            totalHits: Math.max(0, (current.totalHits || 1) - 1),
          });
        }
      }
    } catch (error) {
      console.error("Rate limit decrement error:", error);
    }
  }

  async resetKey(key) {
    if (!key) return;

    // For development or when Firestore is not available, use in-memory store
    if (
      process.env.NODE_ENV === "development" ||
      process.env.FUNCTIONS_EMULATOR === "true"
    ) {
      this.memoryStore.delete(key);
      return;
    }

    const docId = encodeURIComponent(key).replace(/[.#$[\]]/g, "_");
    try {
      await this.db.collection("rateLimits").doc(docId).delete();
    } catch (error) {
      console.error("Rate limit reset error:", error);
    }
  }
}

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limit each IP to 100 requests per windowMs
    message = "Too many requests, please try again later.",
  } = options;

  const store = new FirestoreStore(windowMs);

  return rateLimit({
    windowMs,
    max,
    message,
    store,
    keyGenerator: (req) => {
      // Get IP from various possible sources
      const ip =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        "unknown";

      // Include the route in the key to separate limits by endpoint
      const route = req.path || req.originalUrl || "/";
      return `${ip}-${route}`;
    },
    skip: (req) => {
      // Always skip rate limiting for local development
      if (
        process.env.NODE_ENV === "development" ||
        process.env.FUNCTIONS_EMULATOR === "true"
      ) {
        return true;
      }

      // Get IP from various possible sources
      const ip =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        "unknown";

      // Skip rate limiting for localhost
      const isLocalhost =
        ip === "localhost" ||
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.includes("::ffff:127.0.0.1");

      return isLocalhost;
    },
    statusCode: 429, // Too Many Requests
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  });
};

module.exports = createRateLimiter;
