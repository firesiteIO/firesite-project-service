/**
 * @fileoverview Controller for Claude AI middleware
 * @module routes/claude/claude.controller
 */

const claudeService = require("../../services/claude");
const { ERROR_TYPES, handleError } = require("../../utils/error-handler");
const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

/**
 * Health check for Claude middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.healthCheck = async (req, res) => {
  try {
    const status = await claudeService.checkStatus();
    return res.status(200).json({ status });
  } catch (error) {
    console.error("Claude health check error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Error checking Claude middleware status",
    });
  }
};

/**
 * Send message to Claude and get response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.chat = async (req, res) => {
  try {
    const { message, conversationId, context = {} } = req.body;
    
    // Log request details in development
    if (process.env.NODE_ENV === "development") {
      console.log("Claude chat request:", { message, conversationId, context });
    }
    
    // Add current directory if not provided
    if (!context.directory) {
      context.directory = process.cwd();
    }

    // Determine if streaming is requested (check query param or body property)
    const useStreaming = req.query.stream === 'true' || req.body.stream === true;
    
    if (useStreaming) {
      console.log("Using streaming response");
      
      // Configure SSE with CORS headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
      });
      
      // Stream the response
      await claudeService.streamMessage(
        message,
        conversationId,
        context,
        // Text chunk handler
        (text) => {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        },
        // Error handler
        (error) => {
          console.error("Streaming error:", error);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        },
        // Completion handler
        (info) => {
          res.write(`data: ${JSON.stringify({
            final: true,
            model: info.model,
            conversationId: info.conversationId
          })}\n\n`);
          res.end();
        }
      );
    } else {
      // Non-streaming response
      const response = await claudeService.sendMessage(
        message,
        conversationId,
        context
      );
      return res.status(200).json({ response });
    }
  } catch (error) {
    console.error("Claude chat error:", error);
    return res.status(500).json({
      error: error.message || "Error communicating with Claude",
    });
  }
};

/**
 * Execute terminal command
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.executeCommand = async (req, res) => {
  try {
    const { command } = req.body;

    // Execute the command with security precautions
    const result = await claudeService.executeCommand(command);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("Command execution error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Error executing command",
    });
  }
};

/**
 * Get file content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFileContent = async (req, res) => {
  try {
    const { filePath } = req.body;
    const content = await claudeService.getFileContent(filePath);
    return res.status(200).json({ content });
  } catch (error) {
    console.error("File read error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Error reading file",
    });
  }
};

/**
 * List files in directory
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.listFiles = async (req, res) => {
  try {
    const { directory } = req.body;
    const files = await claudeService.listFiles(directory);
    return res.status(200).json({ files });
  } catch (error) {
    console.error("Directory listing error:", error);
    return res.status(error.status || 500).json({
      error: error.message || "Error listing files",
    });
  }
};

/**
 * Get available prompt roles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPromptRoles = async (req, res) => {
  try {
    const promptRoles = await claudeService.getAvailablePromptRoles();
    return res.status(200).json({ promptRoles });
  } catch (error) {
    console.error("Error getting prompt roles:", error);
    return res.status(500).json({
      error: error.message || "Error retrieving prompt roles",
    });
  }
};
