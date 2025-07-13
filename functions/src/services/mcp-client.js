/**
 * @fileoverview Client for communicating with the MCP server
 * @module services/mcp-client
 */

const axios = require("axios");
const path = require("path");

// Load environment variables if not already loaded
if (!process.env.MCP_SERVER_URL) {
  try {
    require("dotenv").config({
      path: path.resolve(__dirname, "../../.env.development"),
    });
  } catch (err) {
    console.error("Error loading environment variables:", err);
  }
}

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const REQUEST_TIMEOUT = parseInt(
  process.env.MCP_REQUEST_TIMEOUT || "10000",
  10
);

// Log MCP server configuration
console.log("=== MCP Client Configuration ===");
console.log("MCP Server URL:", MCP_SERVER_URL);
console.log("Request Timeout:", REQUEST_TIMEOUT);

// Create axios instance with default configuration
const mcpAxios = axios.create({
  baseURL: MCP_SERVER_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to log requests in development
if (process.env.NODE_ENV === "development") {
  mcpAxios.interceptors.request.use(
    (config) => {
      console.log(`MCP Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error("MCP Request Error:", error);
      return Promise.reject(error);
    }
  );

  mcpAxios.interceptors.response.use(
    (response) => {
      console.log(`MCP Response: ${response.status} ${response.statusText}`);
      return response;
    },
    (error) => {
      console.error("MCP Response Error:", error.message);
      if (error.response) {
        console.error("Response Status:", error.response.status);
        console.error("Response Data:", error.response.data);
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Check MCP server health
 * @returns {Promise<Object>} Server health status
 */
exports.checkHealth = async () => {
  try {
    const response = await mcpAxios.get("/health");

    if (response.status === 200) {
      return {
        available: true,
        server: response.data,
      };
    } else {
      return {
        available: false,
        error: `Unexpected response: ${response.status}`,
      };
    }
  } catch (error) {
    return {
      available: false,
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Get available prompts from MCP server
 * @returns {Promise<Array>} List of available prompts
 */
exports.getPrompts = async () => {
  try {
    const response = await mcpAxios.get("/prompts");
    return response.data;
  } catch (error) {
    console.error("Error getting prompts from MCP server:", error.message);
    throw error;
  }
};

/**
 * Get a specific prompt template by ID
 * @param {string} promptId - ID of the prompt to retrieve
 * @returns {Promise<Object>} Prompt template
 */
exports.getPrompt = async (promptId) => {
  try {
    const response = await mcpAxios.get(`/prompts/${promptId}`);
    return response.data;
  } catch (error) {
    console.error(
      `Error getting prompt ${promptId} from MCP server:`,
      error.message
    );
    throw error;
  }
};

/**
 * Get context information from MCP server
 * @param {Object} options - Context options
 * @param {string} [options.directory] - Directory to get context for
 * @param {string} [options.format] - Format of the response (text, markdown, json)
 * @returns {Promise<string>} Context information
 */
exports.getContext = async (options = {}) => {
  try {
    const response = await mcpAxios.get("/context", {
      params: options,
    });
    return response.data;
  } catch (error) {
    console.error("Error getting context from MCP server:", error.message);
    throw error;
  }
};

/**
 * Get file information from MCP server
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} File information including content
 */
exports.getFileInfo = async (filePath) => {
  try {
    const response = await mcpAxios.get("/context/file", {
      params: {
        path: filePath,
      },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error getting file info for ${filePath} from MCP server:`,
      error.message
    );
    throw error;
  }
};

/**
 * Execute a command via the MCP server
 * @param {string} command - Command to execute
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Command execution results
 */
exports.executeCommand = async (command, options = {}) => {
  try {
    const response = await mcpAxios.post("/execute", {
      command,
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error("Error executing command via MCP server:", error.message);
    throw error;
  }
};

// Task-related functions have been migrated to Firebase Functions
// These functions are now maintained for backward compatibility
// and will forward requests to Firebase Functions

// Configure Firebase Functions URL
const FIREBASE_FUNCTIONS_URL = process.env.FIREBASE_FUNCTIONS_URL || "http://localhost:5000/firesite-ai-f3bc8/us-central1";
const FIREBASE_API_URL = `${FIREBASE_FUNCTIONS_URL}/api`;

// Create axios instance for Firebase Functions
const firebaseAxios = axios.create({
  baseURL: FIREBASE_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all tasks (now forwarded to Firebase Functions)
 * @param {Object} options - Query options
 * @param {string} [options.projectId] - Filter by project ID
 * @param {string} [options.status] - Filter by task status
 * @returns {Promise<Array>} List of tasks
 */
exports.listTasks = async (options = {}) => {
  try {
    console.log("Forwarding listTasks request to Firebase Functions");
    const response = await firebaseAxios.get("/tasks", {
      params: options,
    });
    return response.data;
  } catch (error) {
    console.error("Error listing tasks from Firebase Functions:", error.message);
    throw error;
  }
};

/**
 * Get a specific task by ID (now forwarded to Firebase Functions)
 * @param {string} taskId - ID of the task to retrieve
 * @returns {Promise<Object>} Task object
 */
exports.getTask = async (taskId) => {
  try {
    console.log(`Forwarding getTask request for ${taskId} to Firebase Functions`);
    const response = await firebaseAxios.get(`/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    console.error(
      `Error getting task ${taskId} from Firebase Functions:`,
      error.message
    );
    throw error;
  }
};

/**
 * Create a new task (now forwarded to Firebase Functions)
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task with ID
 */
exports.createTask = async (taskData) => {
  try {
    console.log("Forwarding createTask request to Firebase Functions");
    const response = await firebaseAxios.post("/tasks", taskData);
    return response.data;
  } catch (error) {
    console.error("Error creating task via Firebase Functions:", error.message);
    throw error;
  }
};

/**
 * Update a task (now forwarded to Firebase Functions)
 * @param {string} taskId - ID of the task to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
exports.updateTask = async (taskId, updates) => {
  try {
    console.log(`Forwarding updateTask request for ${taskId} to Firebase Functions`);
    const response = await firebaseAxios.put(`/tasks/${taskId}`, updates);
    return response.data;
  } catch (error) {
    console.error(
      `Error updating task ${taskId} via Firebase Functions:`,
      error.message
    );
    throw error;
  }
};

/**
 * Delete a task (now forwarded to Firebase Functions)
 * @param {string} taskId - ID of the task to delete
 * @returns {Promise<boolean>} Whether deletion was successful
 */
exports.deleteTask = async (taskId) => {
  try {
    console.log(`Forwarding deleteTask request for ${taskId} to Firebase Functions`);
    await firebaseAxios.delete(`/tasks/${taskId}`);
    return true;
  } catch (error) {
    console.error(
      `Error deleting task ${taskId} via Firebase Functions:`,
      error.message
    );
    throw error;
  }
};

/**
 * Move a task to a different group/column (now forwarded to Firebase Functions)
 * @param {string} taskId - ID of the task to move
 * @param {string} groupId - Destination group ID
 * @returns {Promise<Object>} Updated task
 */
exports.moveTask = async (taskId, groupId) => {
  try {
    console.log(`Forwarding moveTask request for ${taskId} to Firebase Functions`);
    const response = await firebaseAxios.put(`/tasks/${taskId}/move`, {
      groupId,
    });
    return response.data;
  } catch (error) {
    console.error(`Error moving task ${taskId} via Firebase Functions:`, error.message);
    throw error;
  }
};
