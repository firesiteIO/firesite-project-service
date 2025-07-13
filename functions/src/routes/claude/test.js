/**
 * @fileoverview Test endpoint for Claude integration with MCP
 */
const express = require("express");
const router = express.Router();
const claudeService = require("../../services/claude");
const { validateFirebaseIdToken } = require("../../middleware/auth");

// Get Claude API status
router.get("/status", async (req, res) => {
  try {
    const status = await claudeService.checkStatus();
    res.json(status);
  } catch (error) {
    console.error("Error checking Claude status:", error);
    res.status(500).json({
      error: "Failed to check Claude API status",
      message: error.message,
    });
  }
});

// Get available prompt roles from MCP
router.get("/prompts", async (req, res) => {
  try {
    const prompts = await claudeService.getAvailablePromptRoles();
    res.json(prompts);
  } catch (error) {
    console.error("Error getting prompt roles:", error);
    res.status(500).json({
      error: "Failed to get prompt roles",
      message: error.message,
    });
  }
});

// Test endpoint to send a message to Claude with MCP context
router.post("/message", validateFirebaseIdToken, async (req, res) => {
  try {
    const { message, conversationId, promptRole, currentFile, directory } =
      req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Create context object with MCP-specific fields
    const context = {
      promptRole: promptRole || "developer",
      currentFile,
      directory,
      userId: req.user ? req.user.uid : null,
    };

    // Send the message to Claude via the service
    const response = await claudeService.sendMessage(
      message,
      conversationId || "test-conversation",
      context
    );

    res.json({
      message: response,
      source: "claude-with-mcp",
    });
  } catch (error) {
    console.error("Error sending message to Claude:", error);
    res.status(500).json({
      error: "Failed to send message to Claude",
      message: error.message,
    });
  }
});

module.exports = router;
