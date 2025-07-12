# Firesite Project Service - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firesite MCP Max server (for AI features)

### Installation
```bash
# Navigate to project directory
cd /Users/thomasbutler/Documents/Firesite/firesite-project-service

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5174`

### Development Environment
For full functionality, run these services:

```bash
# Terminal 1: MCP Max (AI features)
cd /Users/thomasbutler/Documents/Firesite/firesite-mcp-max
npm run dev  # Port 3002

# Terminal 2: Chat Service (optional integration)
cd /Users/thomasbutler/Documents/Firesite/firesite-chat-service  
npm run dev  # Port 5173

# Terminal 3: Project Service (this service)
cd /Users/thomasbutler/Documents/Firesite/firesite-project-service
npm run dev  # Port 5174
```

## 📋 Next Steps

### KaibanJS Integration
1. Fork https://github.com/kaiban-ai/KaibanJS to Firesite organization
2. Clone forked repository into `src/lib/kaiban/`
3. Integrate KaibanJS APIs with Firesite services
4. Implement AI-powered enhancements

### Current Status
- ✅ Project structure created
- ✅ Vite configuration ready
- ✅ Tailwind CSS configured
- ✅ Base application architecture
- ⏳ KaibanJS integration pending
- ⏳ AI service connection pending

### Testing
```bash
npm run test              # Run tests
npm run test:coverage     # Coverage report
npm run lint              # Code quality
```

Ready for KaibanJS integration and AI-powered Kanban development! 🎯