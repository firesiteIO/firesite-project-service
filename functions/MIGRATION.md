# API Migration Summary

This document summarizes the migration of API functionality from the MCP server to Firebase Functions.

## Overview

The following API integrations have been migrated from the MCP server to Firebase Functions to properly separate concerns:

1. **Claude API Integration**
   - Moved all Anthropic API communication to Firebase Functions
   - MCP server now only provides context to Claude

2. **Task API Integration**
   - Moved all task-related routes to Firebase Functions
   - Updated MCP client to forward task requests to Firebase Functions

The new architecture:
- **MCP Server (localhost:3001)**: Now focuses solely on providing context and tools to Claude in the Flutter app
- **Firebase Functions (localhost:5000)**: Now handles all API connections, including Anthropic API and Firestore access

## Changes Made

### Firebase Functions

1. **Enhanced Claude Service**
   - Added streaming support to the Claude service
   - Updated to handle both streaming and non-streaming requests

2. **Updated Claude Controller**
   - Modified the chat endpoint to support streaming responses
   - Ensured compatibility with the MCP server's response format

3. **Updated Validation**
   - Added support for the 'stream' parameter in chat requests

4. **Added Documentation**
   - Created README.md with architecture overview and usage instructions
   - Added environment variable templates

5. **Added Testing**
   - Created a test script to verify the migration

### MCP Server

1. **Removed Claude Routes**
   - Removed the Claude routes from the server.ts file
   - Removed direct Anthropic API communication

2. **Removed Task Routes**
   - Removed the task routes from the server.ts file
   - Removed direct Firestore access for tasks

3. **Updated Claude Service**
   - Modified the Claude service to forward requests to Firebase Functions
   - Kept context provision functionality intact

4. **Updated MCP Client**
   - Modified the MCP client to forward task requests to Firebase Functions
   - Maintained the same API for backward compatibility

5. **Added Environment Variables**
   - Added FIREBASE_FUNCTIONS_URL to the environment variables

## Testing the Migration

To test the migration, run the following commands:

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

3. Run the Claude API migration test script:
```bash
cd /path/to/firesite_app/functions
npm run test:migration
```

The Claude API test script will verify:
- Firebase Functions Claude health endpoint
- Firebase Functions Claude chat endpoint
- MCP server health endpoint
- MCP server forwarding to Firebase Functions

4. Run the Task API migration test script:
```bash
cd /path/to/firesite_app/functions
npm run test:task-migration
```

The Task API test script will verify:
- Firebase Functions task endpoints (create, read, update, delete)
- MCP client forwarding to Firebase Functions
- Removal of task routes from MCP server

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

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Flutter App   │────▶│   MCP Server    │────▶│ Firebase Funcs  │
│                 │     │  localhost:3001 │     │ localhost:5000/ │
└─────────────────┘     └─────────────────┘     │ firesite-ai-... │
        │                       ▲                └────────┬────────┘
        │                       │                         │
        │                       │                         ▼
        │                       │                ┌─────────────────┐
        │                       │                │                 │
        │                       └────────────────┤  Anthropic API  │
        │                                        │                 │
        └────────────────────────────────────────┘                 │
                                                 └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │                 │
                                                 │   Firestore     │
                                                 │                 │
                                                 └─────────────────┘
```

The updated architecture:
1. Flutter App communicates with MCP Server for context
2. MCP Server provides context to Firebase Functions
3. Firebase Functions communicates with Anthropic API
4. Firebase Functions communicates with Firestore for data storage
5. Flutter App can also communicate directly with Firebase Functions

## Environment Variables

### Firebase Functions

An example environment file has been created at `functions/.env.example`. To set up your environment:

```bash
# If you don't have an .env.development file yet, copy the example file
cd /path/to/firesite_app/functions
cp .env.example .env.development

# Edit the file to add your Anthropic API key
nano .env.development
```

> **Important**: If you already have an `.env.development` file, don't overwrite it. Instead, add any missing variables from `.env.example` to your existing file.

### MCP Server

An example environment file has been created at `firesite-mcp/.env.example`. To set up your environment:

```bash
# If you don't have an .env.development file yet, copy the example file
cd /path/to/firesite-mcp
cp .env.example .env.development

# Edit the file if needed
nano .env.development
```

> **Important**: If you already have an `.env.development` file, don't overwrite it. Instead, add any missing variables from `.env.example` to your existing file.

## Dynamic Port Discovery

The system supports dynamic port discovery:

1. If the default ports (5000 for Firebase Functions, 3001 for MCP server) are in use, the servers will automatically use alternative ports.
2. The actual ports in use will be displayed in the console when the servers start.
3. The servers will automatically discover each other's ports through environment variables.
4. The test script uses environment variables with fallbacks to discover the correct ports.

## Flutter App Updates

1. **Updated Task Service**
   - Modified the `FirestoreTaskService` to use Firebase Functions instead of the MCP server
   - Updated the base URL from `http://localhost:3001/api` to `http://localhost:5000/firesite-ai-f3bc8/us-central1/api`
   - Updated class documentation to reflect the change

## Next Steps

1. **Monitor the system** for any issues or performance problems
2. **Test the Flutter app** with the updated task service
3. **Deploy the changes** to production when ready
