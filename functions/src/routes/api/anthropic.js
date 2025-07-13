/**
 * @fileoverview Anthropic API proxy routes
 * @module routes/api/anthropic
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const path = require("path");
const { handleError } = require("../../utils/error-handler");
const createRateLimiter = require("../../middleware/rate-limit");
const cors = require("cors");

// Apply CORS to all routes in this router with expanded configuration
router.use(
  cors({
    origin: true, // Allow any origin
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "x-api-key",
      "anthropic-version",
    ],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Ensure environment variables are loaded if not already
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    require("dotenv").config({
      path: path.resolve(__dirname, "../../../.env.development"),
    });
    console.log("Loaded environment variables from .env.development");
  } catch (err) {
    console.error("Error loading environment variables:", err);
  }
}

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";

/**
 * Helper function to forward request to Anthropic API
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<void>}
 */
async function forwardToAnthropic(req, res, endpoint = "") {
  try {
    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Missing Anthropic API key");
      return handleError(500, "Missing Anthropic API key", req, res);
    }

    // Build target URL
    const targetUrl = `${ANTHROPIC_API_BASE}${endpoint}`;
    console.log(`Proxying Anthropic API request to: ${targetUrl}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request content-type: ${req.headers["content-type"]}`);

    // Forward the request to Anthropic API
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      data: req.body,
      responseType:
        req.headers.accept === "text/event-stream" ? "stream" : "json",
    });

    // Handle streaming responses (for SSE/streaming)
    if (req.headers.accept === "text/event-stream") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      response.data.pipe(res);
      return;
    }

    // Return the response data
    console.log(`Response status: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error proxying to Anthropic API:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }

    if (error.request) {
      console.error("No response received, request details:", {
        method: error.request.method,
        path: error.request.path,
        headers: error.request.getHeaders(),
      });
    }

    // Otherwise, handle as a generic error
    handleError(
      500,
      error.message || "Error proxying to Anthropic API",
      req,
      res
    );
  }
}

/**
 * Specific route for messages endpoint
 * This endpoint forwards requests to the Anthropic messages API
 *
 * @route POST /messages
 * @body {object} request - The full request body to forward to Anthropic
 * @returns {object} Anthropic API response
 */
router.post(
  "/messages",
  createRateLimiter({ max: 10, windowMs: 60000 }),
  (req, res) => {
    console.log("=== Anthropic Messages Endpoint Hit ===");
    console.log(
      "Request body:",
      JSON.stringify(req.body).substring(0, 200) + "..."
    );
    console.log("Request headers:", req.headers);
    return forwardToAnthropic(req, res, "/messages");
  }
);

/**
 * Proxy for all other Anthropic API requests
 * This endpoint forwards requests to the Anthropic API, adding the necessary
 * authentication headers and handling CORS issues for web clients.
 *
 * @route POST /*
 * @body {object} request - The full request body to forward to Anthropic
 * @returns {object} Anthropic API response
 */
router.post(
  "*",
  createRateLimiter({ max: 10, windowMs: 60000 }),
  (req, res) => {
    // For any route other than explicitly defined ones above
    const pathSuffix = req.path === "/" ? "" : req.path;
    return forwardToAnthropic(req, res, pathSuffix);
  }
);

// Handle OPTIONS requests explicitly for CORS preflight
router.options(
  "*",
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "x-api-key",
      "anthropic-version",
    ],
    credentials: true,
  })
);

// Add a test endpoint for web clients to check connectivity
router.get("/test-connection", (req, res) => {
  res.json({
    status: "ok",
    message: "Anthropic API proxy is operational",
    timestamp: new Date().toISOString(),
  });
});

// Simple endpoint for testing
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Anthropic API root endpoint is working",
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    api_key_available: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Add a debug endpoint to test direct API connectivity
router.get("/debug-api", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing API key",
        message: "Anthropic API key is not configured",
      });
    }

    // Try a simple request to the Anthropic API
    const response = await axios({
      method: "POST",
      url: `${ANTHROPIC_API_BASE}/messages`,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      data: {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully connected to Anthropic API",
      api_version: response.headers["anthropic-version"],
      model: response.data.model,
      response_id: response.data.id,
    });
  } catch (error) {
    console.error("Debug API error:", error.message);

    let errorDetails = {
      message: error.message,
    };

    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
    }

    return res.status(500).json({
      error: "API connectivity test failed",
      details: errorDetails,
    });
  }
});

module.exports = router;
