/**
 * @fileoverview Claude AI routes configuration
 * @module routes/claude
 */

const express = require("express");
const router = express.Router();
const claudeController = require("./controller");
const {
  validateChat,
  validateExecute,
  validateFile,
  validateListFiles,
} = require("./validation");
const createRateLimiter = require("../../middleware/rate-limit");
const claudeSecurity = require("../../middleware/claude-security");

// Apply Claude-specific rate limiter
const claudeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute
  message: "Too many requests to Claude API, please try again later",
});

// Apply Claude-specific security middleware to all routes
router.use(claudeSecurity);

// Health check endpoint
router.get("/health", claudeController.healthCheck);

// Chat with Claude endpoint
router.post("/chat", claudeRateLimiter, validateChat, claudeController.chat);

// Terminal command execution endpoint
router.post(
  "/execute",
  claudeRateLimiter,
  validateExecute,
  claudeController.executeCommand
);

// File content endpoint
router.post(
  "/file",
  claudeRateLimiter,
  validateFile,
  claudeController.getFileContent
);

// List files endpoint
router.post(
  "/list-files",
  claudeRateLimiter,
  validateListFiles,
  claudeController.listFiles
);

// Get available prompt roles from MCP server
router.get("/prompt-roles", claudeController.getPromptRoles);

module.exports = router;
