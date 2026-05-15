# Project Architecture

## Directory Structure

```
angular-study-app/
├── public/                 # Static assets served by http-server
│   └── index.html         # Entry point HTML
├── src/                   # Source code
│   ├── app.js             # Main application entry point
│   ├── modules/           # Feature modules
│   │   ├── agents/        # Multi-agent system
│   │   │   ├── agent-widget.html
│   │   │   ├── agent-widget.js
│   │   │   ├── agent.css
│   │   │   ├── multi-agent.js
│   │   │   └── skills-registry.js
│   │   └── topics/        # Study content modules
│   │       ├── java.js
│   │       ├── golang.js
│   │       ├── python.js
│   │       ├── microservices.js
│   │       ├── sysdesign.js
│   │       └── agents.js
│   ├── services/          # Reusable business logic
│   │   └── TopicsService.js
│   ├── utils/             # Utility functions
│   ├── styles/            # CSS files
│   │   └── styles.css
│   └── assets/            # Images, icons, etc.
├── server/                # Backend services
│   └── agents/
│       └── server.js      # Express.js server
├── config/                # Configuration files
├── docs/                  # Documentation
├── tests/                 # Test files
├── package.json
├── .env.example           # Environment variables template
├── .eslintrc.json         # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## Layers

### 1. Frontend (No Build Step)
- **Vanilla JavaScript** with Angular-inspired patterns
- **Services**: Dependency injection (Injector), signal-based reactivity
- **Components**: Web Components following single responsibility
- **Modules**: Feature-based organization (agents, topics)

### 2. Backend (Optional)
- **Framework**: Express.js
- **Purpose**: Multi-agent API, knowledge bases
- **Port**: 3001
- **CORS**: Enabled for localhost:8080

### 3. Configuration
- Environment variables: `.env.example`
- Code quality: ESLint + Prettier
- Build: Ready for Webpack/Vite integration

## Development Scripts

```bash
npm run dev       # Start frontend on :8080 with auto-open
npm run start     # Start frontend on :8080
npm run server    # Start backend on :3001
npm run server:dev # Start backend with auto-reload
npm run lint      # Fix ESLint issues
npm run format    # Format code with Prettier
```

## Key Concepts

### Signal-Based Reactivity
```javascript
const state = signal(initial);
state.set(newValue);
state.subscribe((value) => { /* reaction */ });
```

### Dependency Injection
```javascript
const TopicsService = Injector.inject("TopicsService");
```

### Multi-Agent System
- Skills Registry: Centralized knowledge base
- Orchestrator: Routes queries to appropriate agent
- Agents: Java, Go, Python, Microservices specialists

## Next Steps

1. Add build step (Webpack/Vite)
2. Implement unit tests (Jest)
3. Add TypeScript for type safety
4. Integrate backend API calls
5. Deploy to cloud (Vercel/GitHub Pages for frontend, Heroku/AWS for backend)
