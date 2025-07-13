# Model Context Protocol (MCP) Integration

This document provides detailed information about the integration of the Model Context Protocol (MCP) server with Firebase Functions to enhance Claude's capabilities.

## What is MCP?

The Model Context Protocol (MCP) is a standardized protocol for communication between AI assistants and their local environment. It enables Claude to:

1. Access information about the local development environment
2. Retrieve file system information and content
3. Execute safe commands in a controlled manner
4. Switch between different specialized roles with tailored prompt templates

## Architecture

The integration involves three main components:

1. **MCP Server**: A local Node.js/Express server that provides context from the development environment
2. **Firebase Functions**: Backend services that communicate with both Claude and the MCP server
3. **Claude AI**: The AI assistant that receives enhanced context from the MCP server

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ Firebase App │───►│ Firebase        │    │ Anthropic    │
│ (Flutter)    │◄───│ Functions       │◄──►│ Claude API   │
└──────────────┘    └─────────────────┘    └──────────────┘
                           │  ▲
                           ▼  │
                    ┌─────────────────┐
                    │ MCP Server      │
                    │ (Local)         │
                    └─────────────────┘
                           │  ▲
                           ▼  │
                    ┌─────────────────┐
                    │ Local Dev       │
                    │ Environment     │
                    └─────────────────┘
```

## MCP Server Features

The MCP server provides several key features:

### 1. Context Provider

Gathers information about:

- Current directory structure
- Git repository information (branch, status, recent commits)
- File contents with syntax highlighting
- Project configuration files

### 2. Prompt Templates

- Multiple role-based templates (Developer, Researcher, Planner)
- Each template customizes Claude's behavior for specific tasks
- Templates can be switched dynamically during a conversation

### 3. Command Execution

- Safe execution of terminal commands
- Security restrictions to prevent dangerous operations
- Output capture and formatting

### 4. API Endpoints

- `/health`: Server status and configuration
- `/context`: Current environment context
- `/context/file`: Specific file information and content
- `/prompts`: Available prompt templates
- `/prompts/:id`: Specific prompt template
- `/execute`: Execute commands safely

## Integration Components

### 1. MCP Client (Firebase Functions)

The `mcp-client.js` file in Firebase Functions provides methods to communicate with the MCP server:

```javascript
// Key methods in mcp-client.js
exports.checkHealth = async () => { ... }
exports.getPrompts = async () => { ... }
exports.getPrompt = async (promptId) => { ... }
exports.getContext = async (options) => { ... }
exports.getFileInfo = async (filePath) => { ... }
exports.executeCommand = async (command, options) => { ... }
```

### 2. Claude Service Enhancement

The Claude service is enhanced to retrieve context from the MCP server:

```javascript
// In claude.js
if (USE_MCP_SERVER) {
  // Get prompt template based on role
  const promptTemplate = await mcpClient.getPrompt(
    context.promptRole || "developer"
  );

  // Get project context
  const projectContext = await mcpClient.getContext({
    directory: context.directory,
    format: "markdown",
  });

  // Enhance system prompt
  systemPrompt = promptTemplate.content + "\n\n" + projectContext;
}
```

### 3. Test Endpoints

Test endpoints allow verification of MCP integration:

```javascript
// In routes/claude/test.js
router.get('/status', async (req, res) => { ... });
router.get('/prompts', async (req, res) => { ... });
router.post('/message', async (req, res) => { ... });
```

## Environment Configuration

Key environment variables for MCP integration:

```
# MCP Server configuration
MCP_SERVER_URL=http://localhost:3001
USE_MCP_SERVER=true
MCP_REQUEST_TIMEOUT=10000

# Development settings
SKIP_AUTH_FOR_TESTING=true
```

## Testing the Integration

### Test Scripts

1. **MCP Server Test**:

   - `test-mcp.js`: Tests direct connection to the MCP server
   - Verifies server health, prompt templates, and context retrieval

2. **Claude Integration Test**:
   - `test-claude-client.js`: Tests Claude integration with MCP
   - Verifies Claude can access MCP context and use prompt templates

### Test Workflow

1. Start the MCP server:

   ```bash
   cd /path/to/firesite-mcp
   npm run dev
   ```

2. Start Firebase Functions:

   ```bash
   cd /path/to/firesite_app
   firebase serve --only functions
   ```

3. Run the test scripts:
   ```bash
   cd /path/to/firesite_app/functions
   npm run test:mcp
   node src/tests/test-claude-client.js
   ```

## Security Considerations

1. **Local Development Only**:

   - MCP integration is primarily designed for local development
   - In production, use controlled environment variables and secure APIs

2. **Command Execution**:

   - Strict validation of commands to prevent dangerous operations
   - Timeout limits on command execution
   - Consider disabling in production environments

3. **File Access**:
   - Limit file access to specific directories
   - Prevent path traversal attacks
   - Be careful with exposing sensitive file content

## Troubleshooting

### Common Issues

1. **Server Connection**:

   - Verify MCP server is running on the correct port
   - Check environment variables are set correctly
   - Ensure network connectivity between Functions and MCP server

2. **Prompt Templates**:

   - Verify prompt templates exist and are correctly formatted
   - Check prompt ID matches what the client is requesting

3. **Context Retrieval**:
   - Ensure directory paths exist and are accessible
   - Check file permissions
   - Verify git repository is initialized if git info is requested

### Debugging

1. Enable detailed logging:

   ```javascript
   // Add to mcp-client.js
   axios.interceptors.request.use((request) => {
     console.log("Request:", request);
     return request;
   });
   ```

2. Check MCP server logs for errors

3. Use the test scripts to isolate issues:
   ```bash
   npm run test:mcp
   ```

## Next Steps

1. **Enhance Security**:

   - Add proper authentication for MCP server
   - Implement more granular permissions
   - Add request rate limiting

2. **Improve Performance**:

   - Add caching for context information
   - Optimize file content retrieval
   - Implement incremental updates

3. **Expand Capabilities**:
   - Add more specialized prompt templates
   - Implement project-specific context handling
   - Add support for more tools and integrations
