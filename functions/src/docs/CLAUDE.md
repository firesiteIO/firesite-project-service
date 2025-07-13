Claude Integration Guide for Firesite Functions
This guide explains how to integrate the Claude API with your existing Firebase Functions setup for the Firesite app.
Overview
The Claude integration consists of:

Backend components for Firebase Functions
Flutter widget components for your app's right drawer

Backend Setup
Step 1: File Structure Setup
Create the following directory structure in your Firebase Functions project:
Copyfunctions/src/
├── routes/
│ └── claude/
│ ├── index.js
│ ├── claude.controller.js
│ └── claude.validation.js
│
├── middleware/
│ └── claude-security.js
│
└── services/
└── claude-service.js
Step 2: Update Dependencies
Add the Anthropic SDK to your package.json:
bashCopycd functions
npm install @anthropic-ai/sdk@0.12.2 --save
Step 3: Environment Configuration

Update .env.development and .env.production with Claude settings:

CopyANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-3-7-sonnet-20240229
MAX_TOKENS=4000
COMMAND_TIMEOUT=10000
STRICT_COMMAND_VALIDATION=false

Update development.json and production.json with Claude configuration:

jsonCopy{
"claude": {
"enabled": true,
"model": "claude-3-7-sonnet-20240229",
"maxTokens": 4000,
"commandTimeout": 10000,
"strictCommandValidation": false,
"conversationHistoryLimit": 20
}
}
Step 4: Update Main Router
Modify the main router (src/routes/index.js) to include Claude routes:
javascriptCopyconst claudeRoutes = require("./claude");
router.use("/claude", claudeRoutes);
Step 5: Deploy Functions
Test locally first using the Firebase emulator:
bashCopyfirebase emulators:start --only functions
When ready, deploy to Firebase:
bashCopyfirebase deploy --only functions

## MCP Integration for Enhanced Context

The Model Context Protocol (MCP) server enhances Claude's capabilities by providing local context about your development environment. With this integration, Claude can:

1. Access your local file system (with appropriate permissions)
2. Understand your project structure
3. See git information like branches and commits
4. Switch between different specialized prompt "roles" (Developer, Planner, Researcher)

### Step 1: Install MCP Client

Add the MCP client to your services:

```javascript
// services/mcp-client.js
const axios = require("axios");
const path = require("path");

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const REQUEST_TIMEOUT = parseInt(
  process.env.MCP_REQUEST_TIMEOUT || "10000",
  10
);

// Create axios instance with default configuration
const mcpAxios = axios.create({
  baseURL: MCP_SERVER_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Client methods for MCP server communication
exports.checkHealth = async () => {
  /* ... */
};
exports.getPrompts = async () => {
  /* ... */
};
exports.getPrompt = async (promptId) => {
  /* ... */
};
exports.getContext = async (options = {}) => {
  /* ... */
};
exports.getFileInfo = async (filePath) => {
  /* ... */
};
exports.executeCommand = async (command, options = {}) => {
  /* ... */
};
```

### Step 2: Update Environment Configuration

Add MCP-specific settings to .env.development:

```
# MCP Server configuration
MCP_SERVER_URL=http://localhost:3001
USE_MCP_SERVER=true
MCP_REQUEST_TIMEOUT=10000
SKIP_AUTH_FOR_TESTING=true
```

### Step 3: Enhance Claude Service with MCP Context

Modify the Claude service to leverage MCP context:

```javascript
// In claude.js service
// When sending a message to Claude

if (USE_MCP_SERVER) {
  try {
    // Get the appropriate prompt template based on role
    const promptRole = context.promptRole || "developer";
    const promptTemplate = await mcpClient.getPrompt(promptRole);

    if (promptTemplate && promptTemplate.content) {
      // Use the prompt template as the base
      systemPrompt = promptTemplate.content;

      // Add project context
      const projectContext = await mcpClient.getContext({
        directory: context.directory,
        format: "markdown",
      });

      if (projectContext) {
        systemPrompt += `\n\n${projectContext}`;
      }
    }
  } catch (error) {
    console.error("Error getting context from MCP server:", error.message);
  }
}
```

### Step 4: Add Test Endpoints

Create endpoints for testing the MCP integration:

```javascript
// routes/test-claude.js
const router = express.Router();

// Get Claude API status
router.get("/status", async (req, res) => {
  /* ... */
});

// Get available prompt roles from MCP
router.get("/prompts", async (req, res) => {
  /* ... */
});

// Test endpoint to send a message to Claude with MCP context
router.post("/message", async (req, res) => {
  /* ... */
});

module.exports = router;
```

### Step 5: Testing the Integration

Create a test client for verifying the integration:

```javascript
// tests/test-claude-client.js
const axios = require("axios");
const readline = require("readline");

// Test endpoints and functionality
async function checkClaudeStatus() {
  /* ... */
}
async function getPromptRoles() {
  /* ... */
}
async function sendMessageToClaude(message, promptRole) {
  /* ... */
}

// Run the test
runTest();
```

Client-Side Flutter Setup
Follow the instructions from the previous document to set up the Flutter side:

Add required dependencies to pubspec.yaml
Create the Claude module structure in your Flutter app
Integrate with your right drawer

Configuration Options
Backend Configuration
You can customize the Claude behavior through the following environment variables:

ANTHROPIC_API_KEY: Your API key from Anthropic
CLAUDE_MODEL: Model to use (default: claude-3-7-sonnet-20240229)
MAX_TOKENS: Maximum tokens for Claude response
COMMAND_TIMEOUT: Timeout for terminal commands in milliseconds
STRICT_COMMAND_VALIDATION: Enable stricter security validation

MCP Configuration Options:
MCP_SERVER_URL: URL for the MCP server (default: http://localhost:3001)
USE_MCP_SERVER: Enable/disable MCP integration (default: true)
MCP_REQUEST_TIMEOUT: Timeout for MCP requests in milliseconds
SKIP_AUTH_FOR_TESTING: Bypass authentication for local testing

Flutter Configuration
The Flutter widget can be configured with:

API endpoint pointing to your Firebase Functions
Customized UI appearance
Optional speech-to-text integration

Security Considerations
The Claude integration provides access to:

AI capabilities via the Claude API
File system access (for viewing code)
Terminal command execution (dev mode only)

To enhance security:

File access and command execution are restricted in production
Path traversal protection is implemented
Command validation prevents dangerous operations
Rate limiting is applied to all endpoints

When using MCP:

- Only enable in development environments
- Use appropriate authentication for production
- Limit file system access to project directories

Testing and Verification
After setup, test the integration with:

Health check: GET /app/claude/health
Chat endpoint: POST /app/claude/chat
File operations: POST /app/claude/file
Command execution: POST /app/claude/execute (dev only)

For MCP-specific testing:

- Health check: GET /test-claude/status
- Prompt roles: GET /test-claude/prompts
- Message endpoint: POST /test-claude/message

Troubleshooting
Common issues:

API Connection Issues: Check your Anthropic API key and network connectivity
Authentication: Ensure your Firebase Auth is set up correctly
File Access: Check file permissions and paths
Rate Limiting: Check if you're hitting rate limits
Security Middleware: Security validation might block legitimate requests

MCP-specific issues:

- MCP Server Connection: Verify the MCP server is running on the correct port
- Context Errors: Check that directory paths exist and are accessible
- Prompt Template Errors: Verify prompt templates are correctly formatted

For detailed logs:
bashCopyfirebase functions:log
Maintenance and Updates
When upgrading the Claude integration:

Check for new versions of the Anthropic SDK
Update the CLAUDE_MODEL parameter for newer models
Test changes in development before deploying to production

For MCP updates:

- Keep the MCP server implementation in sync with changes to the Claude service
- Update prompt templates as needed for new capabilities
- Test with realistic project structures
