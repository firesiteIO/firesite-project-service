/**
 * @fileoverview Firebase Functions Express application setup
 * @module index
 */

// Load environment variables first, before other imports
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env.development"),
});

// Log environment status after loading
console.log("=== Environment Setup ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log(
  "ANTHROPIC_API_KEY configured:",
  process.env.ANTHROPIC_API_KEY ? "Yes" : "No"
);
console.log("CLAUDE_MODEL:", process.env.CLAUDE_MODEL);

const functions = require("firebase-functions");
const express = require("express");
const { admin } = require("../config/firebase-admin"); // Import from central source
const engines = require("consolidate");
const createRateLimiter = require("./middleware/rate-limit");
const cors = require("cors");

// Firebase Admin is already initialized in ../config/firebase-admin.js

// Express app initialization
const app = express();

// Create CORS middleware with enhanced options
const corsOptions = {
  origin: '*', // Allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "x-api-key",
    "anthropic-version",
  ],
  credentials: true,
  maxAge: 86400, // Cache preflight requests for 24 hours
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-api-key, anthropic-version');
  next();
});

// Serve static files with proper MIME types
const staticPath =
  process.env.FUNCTIONS_EMULATOR === "true"
    ? path.join(__dirname, "../../../dist") // Development: serve from local dist
    : path.join(__dirname, "../../../dist"); // Production: serve from deployed dist

console.log("=== Server Initialization ===");
console.log("FUNCTIONS_EMULATOR:", process.env.FUNCTIONS_EMULATOR);
console.log("Static Path:", staticPath);

// View engine configuration
app.engine("hbs", engines.handlebars);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "hbs");

app.use(
  express.static(staticPath, {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.set("Content-Type", "text/css");
      }
    },
  })
);

// Middleware configuration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Apply rate limiting before routes
app.use(
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);

// Route configuration
const routes = require("./routes/index");
const apiRoutes = require("./routes/api"); // Import API routes directly

// Mount routes based on environment
if (process.env.FUNCTIONS_EMULATOR === "true") {
  // Development: Mount at root and also make API accessible at /api
  app.use("/", routes);
  app.use("/api", apiRoutes); // Expose API routes directly at /api
} else {
  // Production: Mount under /app and also make API accessible at /api
  app.use("/app", routes);
  app.use("/api", apiRoutes); // Expose API routes directly at /api
}

// Import the SSE background task functions
const backgroundTasks = require("./routes/sse/background-tasks");

// Register the background task functions
exports.startBackgroundTask = backgroundTasks.startBackgroundTask;
exports.updateTaskProgress = backgroundTasks.updateTaskProgress;
exports.getTaskDetails = backgroundTasks.getTaskDetails;
exports.listTasks = backgroundTasks.listTasks;

// Print debug info for API routes
console.log("=== API Configuration ===");
console.log("API routes mounted at: /api");
console.log("API ping endpoint: /api/ping");
console.log("Test API endpoint: /testApi");

// Export Firebase Functions
module.exports = {
  app: functions.https.onRequest(app),
  // Claude routes function
  claude: functions.https.onRequest((req, res) => {
    // Log Claude requests
    console.log(`Claude Request: ${req.method} ${req.path}`);
    
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      // Set CORS headers for preflight requests
      res.set("Access-Control-Allow-Origin", "*");
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept"
      );
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }
    
    // Set CORS headers for regular requests
    res.set("Access-Control-Allow-Origin", "*");
    
    // Mount Claude routes directly
    const claudeApp = express();
    
    // Enable CORS
    claudeApp.use(cors(corsOptions));
    
    // Middleware configuration
    claudeApp.use(express.json());
    claudeApp.use(express.urlencoded({ extended: true }));
    
    // Import Claude routes
    const claudeRoutes = require("./routes/claude");
    
    // Mount Claude routes at the root
    claudeApp.use("/", claudeRoutes);
    
    // Pass the request to the Express app
    return claudeApp(req, res);
  }),
  // API routes function
  api: functions.https.onRequest((req, res) => {
    // Log all API requests
    console.log(`API Request: ${req.method} ${req.originalUrl}`);

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      // Set CORS headers for preflight requests
      res.set("Access-Control-Allow-Origin", "*");
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }

    // Set CORS headers for regular requests
    res.set("Access-Control-Allow-Origin", "*");

    // Simple test endpoint
    if (req.path === "/ping") {
      console.log("Ping endpoint hit");
      return res.json({ message: "pong", timestamp: new Date().toISOString() });
    }

    // Mount API routes directly
    const apiApp = express();

    // Enable CORS
    apiApp.use(cors({ origin: true }));

    // Middleware configuration
    apiApp.use(express.json());
    apiApp.use(express.urlencoded({ extended: true }));

    // Apply rate limiting
    apiApp.use(
      createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      })
    );

    // Mount API routes at the root
    apiApp.use("/", apiRoutes);

    // Pass the request to the Express app
    return apiApp(req, res);
  }),
  // Claude-specific helper functions (optional)
  claudeStatus: functions.https.onRequest((req, res) => {
    const claudeService = require("./services/claude");
    claudeService
      .checkStatus()
      .then((status) => res.json(status))
      .catch((error) => res.status(500).json({ error: error.message }));
  }),
  // Simple test endpoint directly as a function
  testApi: functions.https.onRequest((req, res) => {
    console.log("Direct test API endpoint hit");
    res.json({
      message: "Direct test API endpoint working!",
      timestamp: new Date().toISOString(),
    });
  }),
};
