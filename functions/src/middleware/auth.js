/**
 * @fileoverview Authentication middleware for Firebase Functions
 * @module middleware/auth
 */

const { admin } = require("../../config/firebase-admin");
const { handleError } = require("../utils/error-handler");

/**
 * Authentication middleware levels
 */
const authMiddleware = {
  /**
   * Always authenticate as service account for API routes
   * This simplifies the auth for now until we implement a proper login system
   */
  optional: async (req, res, next) => {
    try {
      console.log("Using Admin SDK auth for API request");
      // Set a default service account user
      req.user = {
        uid: "server-side-app",
        email: "admin@firesite.ai",
        name: "Firesite Admin",
        is_service_account: true,
        admin: true,
      };
      next();
    } catch (error) {
      console.error("Auth Error:", error);
      next();
    }
  },

  /**
   * Require valid Firebase ID token
   */
  required: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return handleError(401, req, res);
      }

      const idToken = authHeader.split("Bearer ")[1];
      req.user = await admin.auth().verifyIdToken(idToken);
      next();
    } catch (error) {
      console.error("Auth Error:", error);
      handleError(401, req, res);
    }
  },

  /**
   * Require service account authentication
   */
  serviceOnly: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return handleError(401, req, res);
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      if (!decodedToken.service_account) {
        return handleError(403, req, res);
      }

      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Auth Error:", error);
      handleError(401, req, res);
    }
  },

  // Middleware to protect routes
  protect: async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return handleError("UNAUTHORIZED", req, res);
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return handleError("UNAUTHORIZED", req, res);
    }
  },

  // Middleware for admin-only routes
  requireAdmin: (req, res, next) => {
    if (!req.user || !req.user.admin) {
      return handleError("FORBIDDEN", req, res);
    }
    next();
  },
};

/**
 * Middleware to validate Firebase ID tokens with bypass option for local testing
 * For local development/testing, authentication can be bypassed
 * by setting the SKIP_AUTH_FOR_TESTING environment variable
 */
exports.validateFirebaseIdToken = async (req, res, next) => {
  console.log("Validating Firebase ID token...");

  // For local testing, we can bypass authentication
  if (process.env.SKIP_AUTH_FOR_TESTING === "true") {
    console.log("Authentication bypassed for local testing");
    // Add a fake user for context in services
    req.user = {
      uid: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    };
    return next();
  }

  // Check for authorization header
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    console.error("No Firebase ID token was passed");
    return res.status(403).json({ error: "Unauthorized" });
  }

  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else if (req.cookies) {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie or authorization header
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    console.log("ID Token verified:", decodedIdToken.uid);
    req.user = decodedIdToken;
    return next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    return res.status(403).json({ error: "Unauthorized" });
  }
};

module.exports = authMiddleware;
