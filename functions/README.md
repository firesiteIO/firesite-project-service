# Firesite Firebase Functions

This directory contains the Firebase Functions for the Firesite application, including the Claude AI integration.

## Architecture

The Firesite ecosystem consists of two main components:

1. **MCP Server** (localhost:3001): Provides context to Claude in the Flutter app
2. **Firebase Functions** (localhost:5000): Handles all API connections, including the Anthropic API

The MCP server provides context about the local development environment, which is then used by Firebase Functions when communicating with the Anthropic API. This ensures that Claude has access to the necessary context about the project, files, and directories.

### Claude Integration

The Claude AI integration is now handled by Firebase Functions, which provides the following endpoints:

- `GET /claude/health`: Health check for Claude AI integration
- `POST /claude/chat`: Chat endpoint for Claude AI integration (supports streaming)
- `POST /claude/execute`: Command execution endpoint for Claude AI integration
- `POST /claude/file`: File content endpoint for Claude AI integration
- `POST /claude/list-files`: List files endpoint for Claude AI integration
- `GET /claude/prompt-roles`: Get available prompt roles from MCP server

The MCP server now forwards all Claude API requests to Firebase Functions, while still providing context to the Flutter app.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create or update your `.env.development` file:

```bash
# If you don't have an .env.development file yet, copy the example file
cp .env.example .env.development

# Edit the file to add your Anthropic API key
nano .env.development
```

> **Important**: If you already have an `.env.development` file, don't overwrite it. Instead, add any missing variables from `.env.example` to your existing file.

3. Start the Firebase Functions server:

```bash
npm run serve
```

> **Note**: The system supports dynamic port discovery. If the default ports (5000 for Firebase Functions, 3001 for MCP server) are in use, the servers will automatically use alternative ports. The actual ports in use will be displayed in the console when the servers start.

## Running the System

To run the complete system:

1. Start the MCP server:

```bash
cd /path/to/firesite-mcp
npm run dev
```

2. Start the Firebase Functions server:

```bash
cd /path/to/firesite_app/functions
npm run serve
```

3. Start the Flutter app:

```bash
cd /path/to/firesite_app
flutter run -d chrome
```

## API Usage

### Chat with Claude

```javascript
// Non-streaming request
const response = await fetch('http://localhost:5000/firesite-ai-f3bc8/us-central1/claude/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello, Claude!',
    conversationId: 'my-conversation',
    context: {
      currentProject: 'Firesite',
      currentFile: '/path/to/file.dart',
    },
  }),
});

const data = await response.json();
console.log(data.response);

// Streaming request
const response = await fetch('http://localhost:5000/firesite-ai-f3bc8/us-central1/claude/chat?stream=true', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({
    message: 'Hello, Claude!',
    conversationId: 'my-conversation',
    stream: true,
    context: {
      currentProject: 'Firesite',
      currentFile: '/path/to/file.dart',
    },
  }),
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      
      if (data.content) {
        // Handle content chunk
        console.log(data.content);
      } else if (data.error) {
        // Handle error
        console.error(data.error);
      } else if (data.final) {
        // Handle completion
        console.log('Stream complete');
      }
    }
  }
}
