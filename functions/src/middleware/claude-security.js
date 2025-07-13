/**
 * @fileoverview Security middleware for Claude API endpoints
 * @module middleware/claude-security
 */

const path = require("path");

/**
 * Middleware to enhance security for Claude-related operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = (req, res, next) => {
  // Only apply security checks to specific endpoints
  if (req.path === "/execute") {
    const { command } = req.body;

    // Skip validation if no command is present
    if (!command) {
      return next();
    }

    // Define patterns for potentially dangerous commands
    const dangerousPatterns = [
      "rm -rf",
      "sudo",
      "chmod 777",
      "format",
      ";",
      "&&",
      "||",
      "`",
      "$(", // Command chaining/injection
      "curl -o",
      "wget", // Downloading files
      ">",
      ">>",
      "2>", // Redirection
      "eval",
      "exec", // Code execution
    ];

    // Check for dangerous command patterns
    if (dangerousPatterns.some((pattern) => command.includes(pattern))) {
      return res.status(403).json({
        error: "Command rejected due to security concerns",
      });
    }
  }

  // Validate file paths to prevent path traversal
  if (req.path === "/file" || req.path === "/list-files") {
    const filePath = req.body.filePath || req.body.directory;

    // Skip validation if no path is present
    if (!filePath) {
      return next();
    }

    // Normalize the path to resolve '..' segments
    const normalizedPath = path.normalize(filePath);

    // Check for path traversal attempts
    if (normalizedPath.includes("..")) {
      return res.status(403).json({
        error: "Invalid path - directory traversal not allowed",
      });
    }

    // Check for access to sensitive directories
    const sensitiveDirectories = [
      "/etc",
      "/var/log",
      "/root",
      "/home",
      "C:\\Windows",
      "C:\\Program Files",
    ];

    if (sensitiveDirectories.some((dir) => normalizedPath.startsWith(dir))) {
      return res.status(403).json({
        error: "Access to this directory is restricted",
      });
    }
  }

  // Development-only features
  if (
    process.env.NODE_ENV !== "development" &&
    (req.path === "/execute" || req.path === "/list-files")
  ) {
    return res.status(403).json({
      error: "This feature is only available in development environment",
    });
  }

  next();
};
