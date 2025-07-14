# Rolling Context Document - Firesite Project Service

> This is a living document that evolves with every session, providing seamless context handoff between Claude instances.

**Last Updated**: 2025-07-14 by Claude Code
**Current Phase**: Phase 1 Complete - Advanced Feature Development
**Session Count**: 3

## 🎯 Current Mission

**Immediate Goal**: Verify console status per new standards, then address StackBlitz WebContainer hot reload
**Context**: Revolutionary AI-human collaborative project management system - implementing rigorous verification standards

## 📍 Current Position

### What We Just Completed 
- ✅ **Service-First Architecture**: Initial implementation complete
- ✅ **CSS/Styling System**: Fixed `fs-` prefixed Tailwind classes  
- ✅ **External Service Integration**: Firebase Functions and MCP Max connections established
- ✅ **Event-Driven Communication**: EnhancedEventBus implemented
- ✅ **Component System**: BaseComponent and KanbanBoardComponent implemented
- ✅ **Testing Infrastructure**: Vitest setup with 95% coverage thresholds
- ✅ **First Test Suite**: TaskService tests passing (13 tests)

### ⚠️ VERIFICATION PENDING
**CRITICAL**: Following new standards, "completion" requires verification:
- 🔍 **Console Status**: NOT VERIFIED - need to check browser DevTools and server logs
- 🔍 **Test Coverage**: Initial setup complete, full coverage assessment needed
- 🔍 **Quality Gates**: All quality commands must pass before declaring completion

### What We're Working On Now
- 🔄 **TOP PRIORITY**: Fix StackBlitz WebContainer hot reload (manual refresh currently required)
- 🔄 **Phase 2 Features**: Advanced drag-drop, AI integration testing, task forms

### Next Immediate Steps (VERIFICATION FIRST)
1. **🔍 Console Verification**: Check browser DevTools and server logs for any unresolved errors
2. **🔗 Server Connection Validation**: Test all endpoints (Firebase Functions port 5000, MCP Max port 3002)
3. **⚡ StackBlitz Hot Reload Fix**: Compare with Chat Service implementation to restore HMR
4. **🧪 Coverage Assessment**: Run test coverage to establish current baseline
5. **🎯 Phase 2 Implementation**: Begin advanced feature development with verified foundation

## 🧠 Key Decisions & Learnings

### Architectural Decisions
- **Service-First Only**: All AI operations proxy through MCP Max (we don't handle AI logic)
- **MMCO Evolution**: Auto-evolve with version history, no complex rollback needed
- **Team Orchestration**: Task decomposition + checkout system for conflict resolution
- **Infrastructure Split**: Project Service handles PM, MCP Max handles AI orchestration

### Technical Discoveries
- KaibanJS is React-based, we're building vanilla JS (user hates React)
- Must translate React patterns to event-driven architecture
- WebContainer support working with COOP/COEP headers (HMR needs debugging)
- Offline mode gracefully handles missing services
- **Working Endpoints Verified**:
  - Firebase Functions: `http://localhost:5000/firesite-ai-f3bc8/us-central1/*`
  - MCP Max Server: `http://localhost:3002/*` (1 connection active)
- **Environment**: Development mode fully configured with proper API keys
- **Event-Driven Architecture**: EnhancedEventBus with service communication
- **Service Integrations**: TaskService, FirebaseService, MCPMaxService, AIService, WebContainerService

### User Preferences
- Hates React (building vanilla JS instead)
- Prefers StackBlitz WebContainers ($60/month subscription)
- Wants full attribution to KaibanJS team
- Dog-fooding is critical (Phase 2 onwards)

## 🔗 Critical Resources

### Codebase Locations
- **Main Project**: `/Users/thomasbutler/Documents/Firesite/firesite-project-service`
- **MCP Max Server**: `/Users/thomasbutler/Documents/Firesite/firesite-mcp-max` (Port 3002)
- **Chat Service**: `/Users/thomasbutler/Documents/Firesite/firesite-chat-service` (Port 5173)
- **KaibanJS Fork**: `/Users/thomasbutler/Documents/Firesite/firesite-ai-kanban`
- **Board UI Fork**: `/Users/thomasbutler/Documents/Firesite/firesite-kaiban-board`
- **Component Library**: `/Users/thomasbutler/Documents/Firesite/firesite-io-slim`
- **Firebase Functions**: Port 5001 (when running)

### Multi-Project Integration Notes
**CRITICAL**: This is NOT a standalone project - expect frequent toggling between:
1. **Project Service** (UI, project management, task coordination)
2. **MCP Max** (AI proxy, MMCO evolution, Docker orchestration) 
3. **Chat Service** (embedded UI components, real-time communication)

**Current Session Scope**: Project Service only (KaibanJS analysis phase)
**Future Sessions Will Require**: Multi-project coordination for MMCO implementation

### Live References
- **KaibanJS Demo**: https://www.kaibanjs.com/#kaiban-board
- **Documentation**: See PROJECT_ARCHITECTURE.md for complete system design

### Integration Points
- Firebase Functions API: `/api/tasks`, `/api/projects`, `/api/claude`
- MCP Max API: `/api/sessions`, `/api/execute`, `/api/context`
- WebContainer: Full support enabled in Vite config

## 🚀 Active Development Threads

### Thread 1: Foundation Verification & Console Health ⚡ ACTIVE
**Status**: 🔄 In Progress
**Goal**: Establish verified baseline before Phase 2 development
**Tasks**:
- Console error verification (browser + server logs)
- Server connection validation (Firebase Functions, MCP Max) 
- StackBlitz WebContainer hot reload restoration
- Test coverage baseline assessment
**Priority**: CRITICAL - Must complete before advancing

### Thread 2: Service Contract Implementation 🎯 UP NEXT
**Status**: Ready to Begin  
**Goal**: Implement core service contracts from KaibanJS extraction
**Based On**: KAIBAN_EXTRACTION_REPORT.md service specifications
**Tasks**:
- AgentService with lifecycle management
- Enhanced TaskService with dependency handling
- TeamOrchestrationService for multi-agent coordination
- Event system enhancements for service communication
**Target**: Complete foundational services for Phase 2

### Thread 3: Advanced UI Components 🎨 PHASE 2
**Status**: Designed, ready for implementation
**Goal**: Production-ready Kanban interface with AI integration
**Based On**: KAIBAN_UI_ANALYSIS.md component specifications
**Tasks**:
- Enhanced KanbanBoardComponent with responsive design
- TaskCard components with drag-drop interactions
- AgentStatusPanel and AIIntegrationPanel
- Mobile-responsive swiper implementation

### Thread 4: MMCO Integration & Context Evolution 🧠 FUTURE
**Status**: Designed, waiting for MCP Max coordination
**Goal**: Portable context that evolves with tasks
**Integration**: All MMCO operations handled by MCP Max server
**Requirements**: Threads 1-3 completion, MCP Max service coordination

## ⚠️ Known Issues & Constraints

### Current Limitations
- Firebase Functions offline (connection refused) - graceful degradation working
- MCP Max offline (404 errors) - graceful degradation working
- No React in this project (must translate all KaibanJS patterns)

### Resource Constraints
- 50 Claude requests per 5 hours (shared between agents + humans)
- Must balance automated agent work with human interaction needs

## 💡 Ideas for Next Session

### If Continuing Current Work
1. Complete KaibanJS pattern extraction
2. Create service contracts for agent operations
3. Design event flows for multi-agent coordination
4. Start implementing team management structure

### If Starting Fresh Thread
1. Review this context document first
2. Check TODO.md for current task status
3. Read any new commits or changes
4. Continue from "Next Immediate Steps" above

## 🔄 Context Evolution

### Session 1 Summary
- Initial setup, discovered React in KaibanJS
- Built fake demo (wrong approach)
- User clarified: remove fakes, build real infrastructure

### Session 2 Summary 
- Removed all fake components
- Integrated real services with offline fallbacks  
- Documented complete architecture
- ✅ **COMPLETED**: Full KaibanJS analysis phase
- ✅ **DELIVERED**: Complete extraction report with service contracts
- ✅ **COMPLETED**: Service-first implementation - Phase 1 COMPLETE

### Session 3 Summary (Current)
- ✅ **Context Consolidation**: Combined duplicate CONTEXT.md files successfully
- ✅ **Auto-Branching Protocol**: Created new branch `feature/phase2-webcontainer-hotreload-2025-07-14-1546`
- ✅ **Testing Standards**: Implemented rigorous 95% coverage requirement with console error verification
- ✅ **Testing Infrastructure**: Vitest setup complete with first TaskService test suite (13 tests passing)
- ✅ **Protocol Updates**: Updated CLAUDE.md with mandatory verification standards  
- ✅ **Documentation Deep Dive**: Comprehensive analysis of all project docs, architecture, and KaibanJS extraction
- ✅ **Phase 2 Planning**: Detailed roadmap based on service contracts and UI specifications
- 🔄 **IN PROGRESS**: Foundation verification (console + server validation)

### Patterns Observed
- User values clear communication about technical challenges
- Dog-fooding is essential (use what we build)
- Service-first architecture is non-negotiable
- Real infrastructure > mock demos
- **NEW**: Rigorous verification prevents overstated achievements
- **NEW**: Console error verification is mandatory before "completion"

## 🔍 IMMEDIATE VERIFICATION PLAN

### 1. Console Error Assessment (NEXT TASK)
**Verification Steps**:
- Open browser DevTools Console tab
- Check for any red errors or unresolved warnings
- Test all major UI interactions (task creation, status changes)
- Document any issues found

### 2. Server Connection Validation
**Firebase Functions (Port 5000)**:
- Test `/claude/health` endpoint
- Verify `/api/tasks` CRUD operations
- Check authentication flow

**MCP Max Server (Port 3002)**:  
- Test `/health` endpoint
- Verify `/mcp/sse` connection
- Test message sending via `/mcp/messages`

### 3. Test Coverage Baseline
**Commands to Run**:
```bash
npm run test:coverage
npm run code-quality
```

### 4. StackBlitz Hot Reload Investigation
**Compare with Chat Service**:
- Check Vite configuration differences
- Verify WebContainer API usage
- Test COOP/COEP header settings

---

## 🌿 Git Status

**Current Branch**: main
**Last Commit**: [to be determined at session start]
**Status**: [to be determined at session start]

### Branch History
- **Previous Branch**: main - [initial setup and real infrastructure integration]
- **Current Work**: main - [needs new branch for KaibanJS analysis]
- **Next Branch**: feature/kaiban-analysis-2025-07-13-[time] - [will be created this session]

## 🤝 Handoff Protocol

**For Next Claude Instance**:
1. **Run Auto-Branching Protocol**: Check git status and create new branch if needed
2. Start by reading this CONTEXT.md
3. Check TODO.md for task status
4. Review recent commits with `git log --oneline -10`
5. Look for any new instructions in CLAUDE.md
6. Continue from "Current Position" section above
7. **End Session Protocol**: Auto-commit and push work with context-aware messages

**Remember**: 
- We're building infrastructure for human potential
- Service-first architecture always
- All AI operations go through MCP Max
- Dog-food everything from Phase 2 onward
- Git discipline is automated - just follow the protocol

---

*This document should be updated at the end of each session or at significant milestones*