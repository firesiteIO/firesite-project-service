# TODO.md - Firesite Project Service

> Task tracking integrated with CONTEXT.md for seamless session handoffs

**Last Updated**: 2025-07-14
**Current Phase**: Phase 1 Complete ✅ - Ready for Phase 2 Development

## 🔥 NEXT SESSION TOP PRIORITY

### **StackBlitz WebContainer Hot Reload Investigation**
- **Status**: 🔴 Needs Investigation  
- **Issue**: Manual refresh required instead of hot module replacement
- **Impact**: Critical for developer experience and rapid iteration
- **Approach**: 
  - Compare WebContainer configuration with working Chat Service
  - Investigate Vite HMR settings for WebContainer environment
  - Test different WebContainer API configurations
  - Verify COOP/COEP headers and isolation requirements

## 🎯 Current Sprint: Phase 2 Feature Development

### In Progress
- [ ] **Test Core Functionality**
  - [ ] Verify drag-and-drop task movement between columns
  - [ ] Test AI Integration Panel controls and mode switching  
  - [ ] Validate all service connections and error handling
  - [ ] Test task creation via "Add Task" button functionality

### Up Next  
- [ ] **Implement Task Management Features**
  - [ ] Create task creation modal with form validation
  - [ ] Add task editing capabilities with proper state management
  - [ ] Implement task deletion with user confirmation
  - [ ] Add task filtering and search functionality

- [ ] **Advanced AI Integration**
  - [ ] Test MMCO/UACP/PACP context management
  - [ ] Implement AI mode context switching
  - [ ] Add intelligent task suggestions from Claude
  - [ ] Test MCP Max message sending and receiving

### Completed ✅ - This Session (Phase 1)
- [x] **Fixed CSS/Styling System**: Removed `fs-` prefixed classes causing display issues
- [x] **Firebase Functions Integration**: Connected on port 5000 with full endpoint access
- [x] **MCP Max Server Connection**: Established SSE connection with graceful session handling
- [x] **Service-First Architecture**: Event-driven communication fully operational
- [x] **Beautiful Kanban UI**: Full component system with proper styling and responsiveness
- [x] **Clean Console Achievement**: Zero connection errors, all services operational
- [x] **Environment Configuration**: Proper `.env` setup with working service URLs
- [x] **WebContainer Support**: COOP/COEP headers configured for StackBlitz compatibility

## 📋 Phase 2: Multi-Tier Implementation

### Projects & Sub-Projects
- [ ] Design project hierarchy service
- [ ] Implement organization → project → sub-project structure
- [ ] Create project management UI
- [ ] Add GitHub repository linking

### Team Management
- [ ] Implement team composition system
- [ ] Add human/AI/hybrid member types
- [ ] Create role assignment interface
- [ ] Build permission management

### MMCO Integration
- [ ] Design MMCO service interface
- [ ] Implement version tracking
- [ ] Add evolution handlers
- [ ] Create MMCO UI components

## 🚀 Phase 3: Agent Coordination

### Multi-Agent System
- [ ] Implement base agent types (PM, Dev, QA, Designer, Analyst)
- [ ] Create agent spawning system
- [ ] Build task decomposition logic
- [ ] Add checkout/conflict resolution

### Integration Points
- [ ] GitHub workflow automation
- [ ] Jira/Trello/Notion connectors
- [ ] Storybook integration
- [ ] Docker container management

## 💡 Backlog & Ideas

### Performance & Scaling
- [ ] Implement virtual scrolling for large boards
- [ ] Add WebSocket support for real-time updates
- [ ] Create offline sync queue
- [ ] Build caching layer

### Advanced Features
- [ ] AI-powered sprint planning
- [ ] Predictive task estimation
- [ ] Team performance analytics
- [ ] Cross-project resource planning

### Developer Experience
- [ ] Create CLI for project scaffolding
- [ ] Add VS Code extension
- [ ] Build component playground
- [ ] Create interactive documentation

## 🐛 Known Issues

### Current Bugs
- [ ] Firebase Functions offline (expected - graceful degradation working)
- [ ] MCP Max offline (expected - graceful degradation working)

### Technical Debt
- [ ] Refactor event naming for consistency
- [ ] Add comprehensive error boundaries
- [ ] Improve TypeScript definitions
- [ ] Enhance accessibility features

## 📝 Notes for Next Session

### Context References
- See `/docs/CONTEXT.md` for current position and handoff details
- Check `/docs/PROJECT_ARCHITECTURE.md` for system design
- Review `/docs/KAIBAN_ANALYSIS_PLAN.md` for extraction strategy

### Quick Commands
```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Check code quality
npm run code-quality

# View recent changes
git log --oneline -10
```

### Remember
- Service-first architecture always
- All AI operations through MCP Max
- Dog-food from Phase 2 onward
- Update CONTEXT.md before ending session

---

*This TODO list works in tandem with CONTEXT.md to ensure smooth handoffs between Claude sessions*