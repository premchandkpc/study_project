# 📚 Senior SDE Study Lab

Visual, interactive, dynamic study platform for **Java · Go · Python · Microservices · System Design**.

Built with vanilla JavaScript in Angular-inspired architecture—no build step required.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start frontend (http://localhost:8080)
npm run dev

# Start backend agent server (http://localhost:3001)
npm run server
```

## 📁 Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed breakdown.

```
public/                  # Static HTML
src/
  ├── app.js            # Main framework
  ├── modules/          # Features (agents, topics)
  ├── services/         # Business logic
  ├── styles/           # CSS
  └── assets/           # Images/icons
server/                  # Express backend
config/                  # Configuration
docs/                    # Documentation
tests/                   # Test suite
```

## 🎯 Features

- **Angular-style Mini Framework**: Signal API, DI container, components
- **Multi-Agent System**: Specialist agents for Java, Go, Python, Microservices
- **Study Modules**: Interactive content for each domain
- **No Build Step**: Direct browser execution
- **Express Backend**: Optional agent API server

## 📖 Available Topics

- **Java**: JVM, GC, Concurrency, Spring, Streams, Records
- **Go**: Goroutines, Channels, Interfaces, Error Handling
- **Python**: Async/await, Decorators, Type hints, FastAPI
- **Microservices**: Architecture, Patterns, Communication
- **System Design**: Scalability, Reliability, Database Design
- **Agents**: Multi-agent orchestration, Skills registry

## 🛠️ Development

### Code Quality

```bash
npm run lint      # Fix linting issues
npm run format    # Format with Prettier
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start frontend with auto-open |
| `npm run start` | Start frontend only |
| `npm run server` | Start backend |
| `npm run server:dev` | Start backend with auto-reload |
| `npm run lint` | Fix ESLint issues |
| `npm run format` | Format code |

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

## 🏗️ Architecture Highlights

### Frontend Layer
- **index.html**: Entry point in `public/`
- **app.js**: Angular-inspired framework
- **Modules**: Topic and agent features
- **Services**: Reusable business logic
- **No dependencies**: Pure vanilla JavaScript

### Backend Layer (Optional)
- **Express.js**: HTTP server
- **Multi-Agent System**: Knowledge bases for each domain
- **CORS**: Enabled for development
- **Port**: 3001

### Signal API (Angular 17 style)
```javascript
const state = signal(initial);
state.set(newValue);
state.subscribe((value) => doSomething(value));
```

### Dependency Injection
```javascript
const service = Injector.inject("ServiceName");
```

## 📋 Next Steps

- [ ] Add TypeScript
- [ ] Implement Jest tests
- [ ] Set up Webpack/Vite build
- [ ] Add CI/CD pipeline
- [ ] Deploy frontend (Vercel/GitHub Pages)
- [ ] Deploy backend (Heroku/AWS Lambda)

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -am 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT © 2025

---

**Built with** ❤️ for senior SDE interview prep.
