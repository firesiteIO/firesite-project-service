# Firesite Project Service - Complete Architecture Documentation

## Project Vision & Mission

The Firesite.ai Project Service provides a revolutionary service-first, AI-assisted project and task management that leverages the context-aware AI system of Firesite.ai. The service provides intelligent, AI planned project and task creation and management via Kanban boards that understand your project context and offer AI-powered, multi agentic assistance for task creation, prioritization, and workflow optimization.

**Firesite is building a fundamentally new paradigm in technology** - one that inverts the traditional relationship between humans and software. Our mission is to create systems that adapt to humans, rather than forcing humans to adapt to static technology. This isn't just another productivity tool. This is the foundation for a fundamentally different relationship between humans and technology—where software becomes a true extension of human potential rather than a constraint upon it.

## Core Architectural Philosophy

### Service-First Architecture
- **Event-driven communication** via GlobalEvents system
- **Decoupled services** that communicate through events  
- **Multi-tier storage** strategy (localStorage, Firebase, GitHub Gists)
- **Clean separation** between UI, services, and core functionality

### Division of Responsibilities

#### Firesite Project Service (This Application)
**Role: Project Management & UI Layer**
```
📊 PROJECT MANAGEMENT RESPONSIBILITIES
├── Projects (create, manage, track lifecycle)
├── Tasks (dependencies, status, workflows)  
├── Team Members (humans + AI agents registry)
├── Tool Registry (available MCP servers, APIs, credentials)
├── Assignments (who does what, task delegation)
├── State Tracking (current status of all elements)
├── UI/UX (Tailwind CSS components, user interactions)
└── Integration Points (GitHub, Jira, Trello, Notion)
```

#### Firesite.ai MCP Max Server (External Dependency)
**Role: AI Orchestration & Intelligence Layer**
```
🤖 AI ORCHESTRATION RESPONSIBILITIES
├── MMCO (creation, evolution, management, versioning)
├── Permissioning (access control, credential management)
├── AI Communication (ALL Claude interactions)
├── Agentic Transformations (role switching, agent spawning)
├── Agent Assignments (AI task delegation & coordination)
├── Claude Proxy (acts as proxy for ALL AI operations)
├── Docker Orchestration (MCP server container management)
└── Context Evolution (MMCO transmutation as tasks progress)
```

### Integration Pattern
```
Firesite Project Service → Firesite.ai MCP Max → Claude APIs
         ↓                        ↓                ↓
    "Task X created"         "Execute with        Response back
    "Team Y assigned"         MMCO context"       to Project
    "Tool Z required"         + Permissions"      Service
```

## Multi-Tier Project Structure

### Hierarchical Organization
```
Organization Level
├── Projects (Website, Marketing, Core Code, etc.)
│   ├── Sub-Projects (Components, Testing, Content Creation)
│   │   ├── Task Boards (Kanban-style workflow management)
│   │   │   ├── Tasks (Individual work items with MMCO context)
│   │   │   │   └── Dynamic Subtasking (AI created sub tasks when necessary)
│   │   │   └── Agents (Dynamic assignment: human, AI, hybrid)
│   │   └── Integration Points (GitHub repos, external systems)
│   └── Team Compositions (mixed human/AI teams)
└── Global Resources (Tools, Credentials, Templates)
```

### Project Types & Flexibility
- **Extensible System**: Supports any project type
- **Dynamic Adaptation**: Workflows adapt based on project context
- **Sub-Project Support**: Nested project hierarchies
- **Examples**: Write core application code, create website, build marketing campaign, write blog content, analyze traffic patterns, test and QA work

## MMCO (Micro Meta Context Objects)

### Definition
**MMCO = "Portable and Evolving Context" for Claude** The MMCO is a fluid JSON framework created, managed and "evolved" directly by AI to provide all the context it needs to understand each task, its place in the project hieracrhy, progress, history and to identify to tools and permissions required to move toward completeion.

Each MMCO JSON object carries:
- **Task Information**: What needs to be done, how it relates to project vision
- **Evolution History**: Previous decisions, learned patterns, accumulated knowledge
- **Permissions & Credentials**: Access to tools, MCP servers, APIs
- **Vision Links**: References to project goals, parent contexts
- **Tool Provisioning**: Docker container specifications for MCP servers

### Example MMCO Structure
```json
{
  "mmco": {
    "task": {
      "id": "FPS-001",
      "title": "Implement Real Kanban Board",
      "description": "Replace mock UI with real service-driven Kanban",
      "priority": "critical",
      "phase": "development"
    },
    "context_evolution": {
      "version": "1.3.2",
      "previous_decisions": [
        "Rejected React integration due to vanilla JS requirement",
        "Adopted service-first architecture pattern"
      ],
      "learned_patterns": [
        "Event-driven communication works well for this team",
        "Offline-first design prevents deployment blockers"
      ],
      "accumulated_knowledge": [
        "User prefers StackBlitz WebContainers over local development",
        "Integration with existing Firesite patterns is critical"
      ]
    },
    "credential_mapping": {
      "github_mcp": "docker://firesite/github-mcp:latest",
      "auth_endpoint": "https://auth.firesite.ai/tokens",
      "permissions": ["read:repo", "write:issues", "create:branch"]
    },
    "vision_links": {
      "project_vision": "https://firesite.ai/vision/project-service",
      "parent_context": "mmco://firesite-ecosystem-123",
      "related_tasks": ["FPS-002", "FPS-003"]
    },
    "external_links": {
      "github": {
        "repo": "firesite-io/firesite-project-service",
        "branch": "feature/real-kanban-integration",
        "pr_hooks": true
      },
      "project_management": {
        "notion": "database/project-service-tasks"
      },
      "sync_strategy": "bidirectional"
    },
    "tool_requirements": [
      "firebase-functions-mcp",
      "github-integration-mcp",
      "claude-code-sdk"
    ]
  },
  "metadata": {
    "created": "2025-07-13",
    "version": "1.3.2",
    "last_evolution": "2025-07-13T10:30:00Z",
    "assigned_to": {
      "primary": "claude-code",
      "secondary": "human:tom-butler",
      "oversight": "claude-pm-agent"
    }
  }
}
```

### MMCO Evolution Strategy
- **Auto-evolve** as tasks progress
- **Maintain version history** within the MMCO
- **Rely on GitHub branch management** for code rollbacks
- **Handled entirely by MCP Max server**

## Team Architecture

### Expanded "Teams" Concept (Inspired by KaibanJS)
```
Team Composition Structure:
├── AI Members
│   ├── Claude.ai (chat interface)
│   ├── Claude Code (development environment)
│   ├── Claude Code SDK (programmatic integration)
│   ├── Specialized Agents (PM, Dev, QA, Designer, Analyst)
│   │   └── Role-specific prompting for each agent type
│   └── Dynamic Agent Spawning (traffic cops, research, testing)
├── Human Members
│   ├── Direct team members (developers, designers, PM)
│   └── Hybrid Tools (Claude in Cursor for human-guided coding)
├── External Integrations
│   ├── Third-party APIs (Jira, Trello, Notion)
│   ├── Development Tools (GitHub, Firebase, StackBlitz)
│   └── Specialized MCP servers (spun up in Docker as needed)
└── Resource Management
    ├── 50 Claude requests per 5 hours (shared between agents + humans)
    └── Intelligent request prioritization and queuing
```

### Base Agent Types (From KaibanJS Pattern)
1. **Project Manager Agent**: Task coordination, timeline management
2. **Developer Agent**: Code implementation, architecture decisions  
3. **QA Agent**: Testing, quality assurance, bug detection
4. **Designer Agent**: UI/UX design, component creation
5. **Analyst Agent**: Data analysis, performance monitoring

### Team Orchestration & Conflict Resolution
- **Task Decomposition**: Break tasks into non-conflicting subtasks
- **Checkout System**: Exclusive access to code sections during work
- **Recombination Logic**: Merge subtask results when complete
- **Traffic Cop Agents**: Manage workflow conflicts and priorities

## Technology Stack

### Core Technologies
- **Frontend**: Vanilla JavaScript (ES6+), Vite, Tailwind CSS
- **Architecture**: Service-First with Event-Driven Communication
- **Development**: StackBlitz WebContainers, Node.js
- **Backend**: Firebase Functions, Firestore
- **AI Integration**: Firesite.ai MCP Max Server
- **Version Control**: GitHub with CodeFlow and Workflows
- **Containerization**: Docker (for MCP servers)

### Key Integrations
- **WebContainer Service**: StackBlitz WebContainers with COOP/COEP headers
- **Firebase Service**: Real-time data sync, authentication
- **MCP MAX Service**: AI orchestration and agent management  
- **GitHub Integration**: Repository management, branch control, PR automation
- **Storybook Integration**: Component documentation and testing
- **Component Library**: firesite-io-slim as "Lego toybox" for reusable Tailwind components

### Development Tools Integration
- **Agentic Testing**: Vite test suites, automated QA
- **Storybook**: Tight integration for component development
- **StackBlitz CodeFlow**: Agent-accessible development environment
- **StackBlitz Web IDE**: Full IDE access for AI agents
- **Container Management**: Agents can spawn their own testing environments

## KaibanJS Integration Strategy

### What We're "Stealing" (With Full Attribution)
- **Multi-Agent Orchestration Patterns**: How they coordinate different agent types
- **Task Dependency Management**: Workflow between agents
- **Visual Board Layout**: Tailwind CSS components and responsive design
- **Agent Communication Protocols**: Context passing between agents
- **Workflow State Management**: Project progression tracking
- **Teams Concept**: Heavy emphasis on team-based development
- **Storybook Integration**: Component development and documentation

### What We're Building Better
```
KaibanJS Concept → Our Service-First Implementation
─────────────────────────────────────────────────
React Components → Vanilla JS with Event Bus
Internal State → Service-managed state with Firebase sync
Hardcoded Agents → Dynamic agents via MCP MAX
Static Workflows → MMCO-driven adaptive workflows  
Basic AI calls → Full Firesite.ai MCP Max integration
Limited Teams → Extended teams (human + AI + hybrid tools)
```

### Reference Repositories
- **Source**: `/Users/thomasbutler/Documents/Firesite/firesite-ai-kanban` (KaibanJS core)
- **UI Components**: `/Users/thomasbutler/Documents/Firesite/firesite-kaiban-board` (React board)
- **Component Library**: `/Users/thomasbutler/Documents/Firesite/firesite-io-slim` (Tailwind components)

## Security & Permissions

### Credential Management
- **Client-specific .env files**: All credentials stored securely
- **MCP Max handled**: Credential access managed by MCP Max server  
- **Docker isolation**: MCP servers run in isolated containers
- **Ephemeral containers**: Spin up/down per task for security

### Permission System
- **MMCO-defined**: Permissions specified in MMCO objects
- **Tool-specific**: Each MCP server has defined permission scopes
- **Dynamic provisioning**: Containers created with minimal required permissions
- **Audit trail**: All permission grants and usage tracked

## Future Vision & Attribution

### Blockchain Attribution System (Future-Ready)
- **Contribution Tracking**: All AI and human work attributed and logged
- **Solana Integration Points**: Architecture ready for blockchain activation
- **Immutable Record**: Fair and transparent recognition of all contributions
- **No Live Transactions**: Until public release and extensive testing
- **Breadcrumb System**: Comments and hooks placed for future activation

### Planned Extensions (Post-MVP)
1. **Auto-generated Storybook stories** for UI components
2. **Advanced MMCO evolution** with machine learning
3. **Cross-project knowledge transfer** between MMCOs
4. **Blockchain attribution activation** with Solana
5. **Advanced agent spawning** for specialized tasks
6. **Integration with additional IDEs** and development tools

## Development Phases

### Phase 1: Foundation (Current)
- ✅ Service-first architecture implementation
- ✅ Real infrastructure connections (Firebase, MCP Max)
- ✅ WebContainer integration with StackBlitz
- 🔄 KaibanJS pattern analysis and extraction
- 🔄 Multi-tier project/task structure
- 🔄 Basic MMCO integration

### Phase 2: Agent Integration
- Team composition and agent assignment
- Task decomposition and conflict resolution  
- MMCO evolution and context passing
- GitHub workflow integration
- Basic multi-agent coordination
- DOG FOOD CONSUMPTION moving forward from here

### Phase 3: Advanced Features
- Storybook auto-integration
- Advanced agent spawning
- Cross-system synchronization (Jira, Trello, Notion)
- Performance optimization and scaling

### Phase 4: Attribution & Ecosystem
- Blockchain attribution system activation
- Public release preparation
- Advanced AI collaboration features
- Ecosystem expansion and third-party integrations

## Success Metrics

### Technical Goals
- **Real Infrastructure**: 100% real service integration (no mocks)
- **Offline Capability**: Graceful degradation when services unavailable
- **Agent Coordination**: Smooth multi-agent task execution
- **Performance**: Sub-second response times for UI interactions
- **Scalability**: Support for 100+ concurrent tasks across projects

### User Experience Goals  
- **Intuitive Interface**: Clear distinction between human and AI work
- **Transparent Operations**: Visible status of all agents and tasks
- **Reliable Workflows**: Consistent task progression and completion
- **Flexible Team Composition**: Easy assignment of human/AI team members

### Vision Achievement
- **Human-AI Collaboration**: True team member status for Claude
- **Adaptive Technology**: Systems that evolve with user needs
- **Fair Attribution**: Transparent recognition of all contributions
- **Infrastructure for Potential**: Foundation for revolutionary human-tech relationships

---

*This architecture document represents our complete understanding as of July 13, 2025. It will evolve as the project progresses, maintaining our core vision while adapting to new insights and requirements.*