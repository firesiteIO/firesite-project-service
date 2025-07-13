/**
 * @fileoverview Service for communication with Claude AI API
 * @module services/claude-service
 */

const { Anthropic } = require("@anthropic-ai/sdk");
const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const util = require("util");
const execPromise = util.promisify(exec);
const mcpClient = require("./mcp-client");

// Ensure environment variables are loaded if not already
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    require("dotenv").config({
      path: path.resolve(__dirname, "../../.env.development"),
    });
    console.log("Loaded environment variables from .env.development");
  } catch (err) {
    console.error("Error loading environment variables:", err);
  }
}

// Load environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-7-sonnet-20250219";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "4000", 10);
const COMMAND_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT || "10000", 10); // 10 seconds default
const STRICT_COMMAND_VALIDATION =
  process.env.STRICT_COMMAND_VALIDATION === "true";
const USE_MCP_SERVER = process.env.USE_MCP_SERVER !== "false"; // Enable MCP by default

// Log configuration for debugging
console.log("=== Claude Service Configuration ===");
console.log("API Key Configured:", ANTHROPIC_API_KEY ? "Yes" : "No");
console.log("Model:", CLAUDE_MODEL);
console.log("Max Tokens:", MAX_TOKENS);
console.log("MCP Server:", USE_MCP_SERVER ? "Enabled" : "Disabled");
console.log("MCP Server URL:", process.env.MCP_SERVER_URL || "Not configured");

// Check MCP server connection if enabled
if (USE_MCP_SERVER) {
  mcpClient
    .checkHealth()
    .then((status) => {
      if (status.available) {
        console.log(
          "MCP Server connected successfully:",
          status.server?.server?.name || "Unknown"
        );
      } else {
        console.warn("MCP Server not available:", status.error);
      }
    })
    .catch((err) => {
      console.error("Error checking MCP server:", err.message);
    });
}

// Initialize Anthropic client if API key is available
let anthropic = null;
if (ANTHROPIC_API_KEY) {
  try {
    anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    console.log("Claude API client initialized successfully");
  } catch (error) {
    console.error("Error initializing Claude API client:", error);
  }
} else {
  console.warn("No ANTHROPIC_API_KEY found in environment variables");
}

// In-memory conversation store
// In a production app, consider using Firebase Firestore
const conversations = {};

/**
 * Get or create a conversation history
 * @param {string} id - Conversation ID
 * @returns {Array} Conversation messages
 */
function getOrCreateConversation(id = "default") {
  if (!conversations[id]) {
    conversations[id] = [];
  }
  return conversations[id];
}

/**
 * Check Claude API connection status
 * @returns {Promise<Object>} Status information
 */
exports.checkStatus = async () => {
  try {
    if (!ANTHROPIC_API_KEY || !anthropic) {
      return {
        available: false,
        message: "Anthropic API key not configured",
      };
    }

    // Simple message to test connection
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    });

    if (response) {
      return {
        available: true,
        model: CLAUDE_MODEL,
      };
    }
  } catch (error) {
    console.error("Claude API connection error:", error);
    return {
      available: false,
      message: error.message || "Error connecting to Claude API",
    };
  }
};

/**
 * Send a message to Claude API
 * @param {string} message - User message
 * @param {string} [conversationId='default'] - Conversation ID
 * @param {Object} [context={}] - Context information
 * @returns {Promise<string>} Claude's response
 */
exports.sendMessage = async (
  message,
  conversationId = "default",
  context = {}
) => {
  if (!ANTHROPIC_API_KEY || !anthropic) {
    throw new Error(
      "Anthropic API key not configured or client initialization failed"
    );
  }

  // Get or create conversation history
  const conversation = getOrCreateConversation(conversationId);

  // Add user message to conversation
  conversation.push({
    role: "user",
    content: message,
  });

  // Default system prompt
  let systemPrompt = `You are Claude, an AI assistant integrated directly into a Firebase Functions backend environment.
You're helping with a project that uses Express, Firebase, and Node.js.
${context.currentProject ? `Current project: ${context.currentProject}` : ""}`;

  // Include file content if specified
  let fileContent = "";
  if (
    context.currentFile &&
    context.currentFile !== "none" &&
    context.currentFile.trim() !== ""
  ) {
    try {
      fileContent = await fs.readFile(context.currentFile, "utf8");
      systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``;
    } catch (err) {
      console.error(`Could not read file ${context.currentFile}:`, err);
    }
  }

  // Enhanced with MCP server context if enabled
  if (USE_MCP_SERVER) {
    try {
      console.log("Getting context from MCP server...");
      
      // Get the appropriate prompt template based on role
      const promptRole = context.promptRole || "developer";
      console.log(`Using prompt role: ${promptRole}`);
      
      try {
        const promptTemplate = await mcpClient.getPrompt(promptRole);
        
        if (promptTemplate && promptTemplate.content) {
          console.log("Successfully retrieved prompt template from MCP server");
          // Use the prompt template as the base
          systemPrompt = promptTemplate.content;
        } else {
          console.log("No prompt template content received from MCP server");
        }
      } catch (promptError) {
        console.error("Error getting prompt template:", promptError.message);
      }

      // Always try to get project context
      try {
        const directory = context.directory || process.cwd();
        console.log(`Getting context for directory: ${directory}`);
        
        const projectContext = await mcpClient.getContext({
          directory: directory,
          format: "markdown",
        });

        if (projectContext) {
          console.log("Successfully retrieved project context from MCP server");
          systemPrompt += `\n\n${typeof projectContext === 'string' ? projectContext : JSON.stringify(projectContext, null, 2)}`;
        } else {
          console.log("No project context received from MCP server");
        }
      } catch (contextError) {
        console.error("Error getting project context:", contextError.message);
      }

      // If a specific file is provided, get its content from MCP
      if (context.currentFile && context.currentFile !== "none" && context.currentFile.trim() !== "") {
        try {
          console.log(`Getting file info for: ${context.currentFile}`);
          const fileInfo = await mcpClient.getFileInfo(context.currentFile);
          
          if (fileInfo && fileInfo.content) {
            console.log("Successfully retrieved file content from MCP server");
            systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileInfo.content}\n\`\`\``;
          } else {
            console.log("No file content received from MCP server");
          }
        } catch (fileError) {
          console.error("Error getting file info:", fileError.message);
          // Fall back to local file reading
          try {
            fileContent = await fs.readFile(context.currentFile, "utf8");
            systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``;
          } catch (err) {
            console.error(`Could not read file ${context.currentFile}:`, err);
          }
        }
      }

      // Add note about MCP access
      systemPrompt +=
        "\n\nIMPORTANT: You have access to the MCP server which provides local context about files, directories, and git information. This allows you to better understand the user's development environment. When appropriate, acknowledge that you can see this context.";
    } catch (error) {
      console.error("Error getting context from MCP server:", error.message);
    }
  }

  // Add default instructions about developer preferences
  systemPrompt += `\n\nThe developer prefers direct, unvarnished feedback. Be blunt about issues, don't sugarcoat criticisms, and focus on practical solutions. They prefer vanilla JavaScript, Node.js, Express, and Firebase for backend work. For mobile, they use Flutter.

Your task is to help build effective, scalable solutions. Prioritize constructive criticism over positive reinforcement.`;

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: systemPrompt,
      messages: conversation,
      max_tokens: MAX_TOKENS,
    });

    // Extract response text
    const claudeResponse = response.content[0].text;

    // Add Claude's response to conversation history
    conversation.push({
      role: "assistant",
      content: claudeResponse,
    });

    // Limit conversation history to last 20 messages to avoid token limits
    if (conversation.length > 20) {
      conversation.splice(0, conversation.length - 20);
    }

    return claudeResponse;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    throw new Error(error.message || "Error communicating with Claude API");
  }
};

/**
 * Stream a message to Claude API with SSE
 * @param {string} message - User message
 * @param {string} [conversationId='default'] - Conversation ID
 * @param {Object} [context={}] - Context information
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onError - Callback for errors
 * @param {Function} onComplete - Callback for completion
 * @returns {Promise<void>}
 */
exports.streamMessage = async (
  message,
  conversationId = "default",
  context = {},
  onChunk,
  onError,
  onComplete
) => {
  if (!ANTHROPIC_API_KEY || !anthropic) {
    throw new Error(
      "Anthropic API key not configured or client initialization failed"
    );
  }

  // Get or create conversation history
  const conversation = getOrCreateConversation(conversationId);

  // Add user message to conversation
  conversation.push({
    role: "user",
    content: message,
  });

  // Default system prompt
  let systemPrompt = `You are Claude, an AI assistant integrated directly into a Firebase Functions backend environment.
You're helping with a project that uses Express, Firebase, and Node.js.
${context.currentProject ? `Current project: ${context.currentProject}` : ""}`;

  // Include file content if specified
  let fileContent = "";
  if (
    context.currentFile &&
    context.currentFile !== "none" &&
    context.currentFile.trim() !== ""
  ) {
    try {
      fileContent = await fs.readFile(context.currentFile, "utf8");
      systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``;
    } catch (err) {
      console.error(`Could not read file ${context.currentFile}:`, err);
    }
  }

  // Enhanced with MCP server context if enabled
  if (USE_MCP_SERVER) {
    try {
      console.log("Getting context from MCP server for streaming...");
      
      // Get the appropriate prompt template based on role
      const promptRole = context.promptRole || "developer";
      console.log(`Using prompt role: ${promptRole}`);
      
      try {
        const promptTemplate = await mcpClient.getPrompt(promptRole);
        
        if (promptTemplate && promptTemplate.content) {
          console.log("Successfully retrieved prompt template from MCP server");
          // Use the prompt template as the base
          systemPrompt = promptTemplate.content;
        } else {
          console.log("No prompt template content received from MCP server");
        }
      } catch (promptError) {
        console.error("Error getting prompt template:", promptError.message);
      }

      // Always try to get project context
      try {
        const directory = context.directory || process.cwd();
        console.log(`Getting context for directory: ${directory}`);
        
        const projectContext = await mcpClient.getContext({
          directory: directory,
          format: "markdown",
        });

        if (projectContext) {
          console.log("Successfully retrieved project context from MCP server");
          systemPrompt += `\n\n${typeof projectContext === 'string' ? projectContext : JSON.stringify(projectContext, null, 2)}`;
        } else {
          console.log("No project context received from MCP server");
        }
      } catch (contextError) {
        console.error("Error getting project context:", contextError.message);
      }

      // If a specific file is provided, get its content from MCP
      if (context.currentFile && context.currentFile !== "none" && context.currentFile.trim() !== "") {
        try {
          console.log(`Getting file info for: ${context.currentFile}`);
          const fileInfo = await mcpClient.getFileInfo(context.currentFile);
          
          if (fileInfo && fileInfo.content) {
            console.log("Successfully retrieved file content from MCP server");
            systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileInfo.content}\n\`\`\``;
          } else {
            console.log("No file content received from MCP server");
          }
        } catch (fileError) {
          console.error("Error getting file info:", fileError.message);
          // Fall back to local file reading
          try {
            fileContent = await fs.readFile(context.currentFile, "utf8");
            systemPrompt += `\n\nCurrent file content:\n\`\`\`\n${fileContent}\n\`\`\``;
          } catch (err) {
            console.error(`Could not read file ${context.currentFile}:`, err);
          }
        }
      }

      // Add note about MCP access
      systemPrompt +=
        "\n\nIMPORTANT: You have access to the MCP server which provides local context about files, directories, and git information. This allows you to better understand the user's development environment. When appropriate, acknowledge that you can see this context.";
    } catch (error) {
      console.error("Error getting context from MCP server:", error.message);
    }
  }

  // Add default instructions about developer preferences
  systemPrompt += `\n\nThe developer prefers direct, unvarnished feedback. Be blunt about issues, don't sugarcoat criticisms, and focus on practical solutions. They prefer vanilla JavaScript, Node.js, Express, and Firebase for backend work. For mobile, they use Flutter.

Your task is to help build effective, scalable solutions. Prioritize constructive criticism over positive reinforcement.`;

  try {
    // Track the full response for conversation history
    let fullResponse = "";

    // Stream the response using Anthropic SDK
    console.log("Starting stream from Anthropic API...");
    const streamStartTime = Date.now();

    await anthropic.messages
      .stream({
        model: CLAUDE_MODEL,
        system: systemPrompt,
        messages: conversation,
        max_tokens: MAX_TOKENS,
      })
      .on("text", (text) => {
        // Call the chunk callback
        onChunk(text);
        
        // Accumulate the full response
        fullResponse += text;
      })
      .on("error", (err) => {
        console.error("Error in stream:", err);
        onError(err);
      })
      .on("end", () => {
        // Log completion
        const totalTime = Date.now() - streamStartTime;
        console.log(`Stream complete after ${totalTime}ms`);
        
        // Add Claude's response to conversation history
        conversation.push({
          role: "assistant",
          content: fullResponse,
        });

        // Limit conversation history to last 20 messages to avoid token limits
        if (conversation.length > 20) {
          conversation.splice(0, conversation.length - 20);
        }
        
        // Call the completion callback
        onComplete({
          model: CLAUDE_MODEL,
          conversationId: conversationId || "default",
        });
      });
  } catch (error) {
    console.error("Error streaming from Claude API:", error);
    onError(error);
  }
};

/**
 * Execute a terminal command
 * @param {string} command - Command to execute
 * @returns {Promise<string>} Command output
 */
exports.executeCommand = async (command) => {
  // Additional security validation
  if (STRICT_COMMAND_VALIDATION) {
    const dangerousPatterns = [
      "rm -rf",
      "sudo",
      "chmod",
      "format",
      ";",
      "&&",
      "||",
      "`",
      "$(", // Command chaining/injection
      "curl -o",
      "wget", // Downloading files
      ">",
      ">>", // Redirection
      "eval", // Code execution
    ];

    if (dangerousPatterns.some((pattern) => command.includes(pattern))) {
      const error = new Error("Command rejected due to security concerns");
      error.status = 403;
      throw error;
    }
  }

  try {
    // Execute command with timeout
    const { stdout, stderr } = await execPromise(command, {
      timeout: COMMAND_TIMEOUT,
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    if (stderr) {
      console.warn("Command produced stderr:", stderr);
    }

    return stdout || "Command executed successfully with no output";
  } catch (error) {
    // If the command fails, include the error message in the response
    console.error("Command execution error:", error);

    const errorObj = new Error(error.message || "Error executing command");
    errorObj.status = 500;
    throw errorObj;
  }
};

/**
 * Get file content
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} File content
 */
exports.getFileContent = async (filePath) => {
  try {
    // Check for invalid file paths
    if (!filePath || filePath === "none" || filePath.trim() === "") {
      const error = new Error("Invalid or missing file path");
      error.status = 400;
      throw error;
    }

    // Security check - validate file path
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes("..")) {
      const error = new Error("Invalid file path");
      error.status = 403;
      throw error;
    }

    // Try to get file from MCP server first if enabled
    if (USE_MCP_SERVER) {
      try {
        const fileInfo = await mcpClient.getFileInfo(filePath);
        if (fileInfo && fileInfo.content) {
          return fileInfo.content;
        }
      } catch (error) {
        console.warn(
          `MCP file retrieval failed, falling back to local: ${error.message}`
        );
      }
    }

    const content = await fs.readFile(filePath, "utf8");
    return content;
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFoundError = new Error(`File not found: ${filePath}`);
      notFoundError.status = 404;
      throw notFoundError;
    }

    if (!error.status) {
      error.status = 500;
    }

    throw error;
  }
};

/**
 * List files in directory
 * @param {string} directory - Directory path
 * @returns {Promise<Array>} Array of file objects
 */
exports.listFiles = async (directory) => {
  try {
    // Security check - validate directory path
    const normalizedPath = path.normalize(directory);
    if (normalizedPath.includes("..")) {
      const error = new Error("Invalid directory path");
      error.status = 403;
      throw error;
    }

    const files = await fs.readdir(directory, { withFileTypes: true });

    // Process file information
    const fileList = files.map((file) => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(directory, file.name),
    }));

    return fileList;
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFoundError = new Error(`Directory not found: ${directory}`);
      notFoundError.status = 404;
      throw notFoundError;
    }

    if (!error.status) {
      error.status = 500;
    }

    throw error;
  }
};

/**
 * Get available prompt roles from MCP server
 * @returns {Promise<Array>} List of available prompt roles
 */
exports.getAvailablePromptRoles = async () => {
  if (!USE_MCP_SERVER) {
    return [{ id: "default", name: "Default" }];
  }

  try {
    const prompts = await mcpClient.getPrompts();
    return prompts || [{ id: "default", name: "Default" }];
  } catch (error) {
    console.error("Error getting prompt roles:", error.message);
    return [{ id: "default", name: "Default" }];
  }
};
