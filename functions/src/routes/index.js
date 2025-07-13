/**
 * @fileoverview Main router configuration
 * @module routes
 */

const express = require("express");
const cors = require("cors");
const router = express.Router();
const { ERROR_TYPES, handleError } = require("../utils/error-handler");
const { admin, db } = require("../../config/firebase-admin");

// Make admin and db available to other modules if needed
exports.admin = admin;
exports.db = db;

// Core middleware
router.use(cors({ origin: true }));

// Request logging middleware
router.use((req, res, next) => {
  console.log("=== Incoming Request ===");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Query:", req.query);
  next();
});

// Define root-level routes (hello and ip endpoints)
router.get("/hello", (req, res) => {
  const hostname = req.hostname;
  try {
    console.log("Hello endpoint hit");
    res.json({
      message: `Hello! Welcome to Firesite Backend powered by Express and Firebase Functions! (${hostname})`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleError(500, "Internal server error", req, res);
  }
});

// Get the IP address of the request
router.get("/ip", function (req, res) {
  res.json({
    ip: req.ip,
    ips: req.ips,
    headers: req.headers,
  });
});

// Import route modules
const apiRoutes = require("./api");
const dataRoutes = require("./data");
const claudeRoutes = require("./claude");
const testClaudeRoutes = require("./test-claude");

// Mount routes
router.use("/api", apiRoutes); // For /api/* routes
router.use("/data", dataRoutes); // For /data/*
router.use("/claude", claudeRoutes); // For /claude/*
router.use("/test-claude", testClaudeRoutes); // For testing Claude with MCP

// Error handlers
router.use((req, res) => handleError(404, "Resource not found", req, res));
router.use((err, req, res, next) => {
  console.error("Error:", err);
  handleError(
    err.status || 500,
    err.message || "Internal server error",
    req,
    res
  );
});

module.exports = router;
