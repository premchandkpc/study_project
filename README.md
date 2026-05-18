# Senior SDE Study Lab

An interactive, visual study platform for mastering Java, Go, Python, Microservices, AI Agents, and modern distributed system patterns.

## Project Overview

This project is a dual-stack application:

- **Frontend**: Angular-style single-page application with interactive components for studying programming concepts, microservices architectures, and distributed systems
- **Backend**: Express.js mock microservice agent that provides AI-driven knowledge base replies

## Prerequisites

- **Node.js** (v14 or higher) — for running the backend server
- **npm** (comes with Node.js)
- Any modern web browser (Chrome, Firefox, Safari, Edge)
- **Python 3** (optional) — if using Python's built-in HTTP server for the frontend
- **Git** — for version control

## Project Structure

```
study_project/
├── README.md                          # This file
├── CLAUDE.md                          # Project documentation
├── AGENTS.md                          # Agent configuration
├── angular-study-app/
│   ├── index.html                     # Main HTML entry point
│   ├── app.js                         # Angular-style mini framework + app logic
│   ├── styles.css                     # Global styles
│   ├── topics/                        # Curriculum topic modules
│   │   ├── java.js
│   │   ├── golang.js
│   │   ├── python.js
│   │   ├── microservices.js
│   │   └── agents.js
│   └── agents/                        # Backend server
│       ├── package.json
│       ├── server.js                  # Express server (port 3001)
│       ├── agent-widget.js            # Agent widget component
│       ├── agent.css                  # Agent widget styles
│       └── node_modules/              # Dependencies
```

## Installation

### Step 1: Clone and Install Backend Dependencies

```bash
# Navigate to the project root
cd study_project/

# Install backend dependencies
cd angular-study-app/agents/
npm install
cd ../../
```

### Step 2: Verify Installation

```bash
# Check Node.js and npm versions
node --version  # Should be v14+
npm --version
```

## Running the Application

### Option 1: Backend Only (Recommended for Development)

Start the backend server on port 3001:

```bash
cd angular-study-app/agents/
npm start
# or: npm run dev
```

Expected output:

```
🤖 Study Agent server running at http://localhost:3001
   GET  /api/agent?msg=java
   POST /api/agent  { "msg": "tell me about kafka" }
   GET  /health
```

Then open a separate terminal and serve the frontend using Python:

```bash
cd angular-study-app/

# Python 3
python3 -m http.server 8000

# Python 2 (if Python 3 not available)
python -m SimpleHTTPServer 8000
```

Visit **http://localhost:8000** in your browser.

### Option 2: Using Node.js HTTP Server for Frontend

In a separate terminal from the backend:

```bash
cd angular-study-app/

# Install http-server globally (one time)
npm install -g http-server

# Run frontend server
http-server -p 8000
```

Visit **http://localhost:8000** in your browser.

### Option 3: Using VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Browser will open at `http://127.0.0.1:5500`

## Development Workflow

### Running Backend in Development Mode

```bash
cd angular-study-app/agents/
npm run dev
```

This starts the Express server with auto-restart on file changes (if nodemon is installed).

### Modifying Frontend

1. Edit files in `angular-study-app/` (HTML, CSS, JS)
2. Refresh browser or use Live Reload
3. No build step required (vanilla JS)

### Modifying Backend

1. Edit files in `angular-study-app/agents/`
2. Restart server: `npm start`
3. Or if using nodemon: auto-restarts on save

### Adding New Topics

1. Create a new file in `angular-study-app/topics/` (e.g., `topics/rust.js`)
2. Follow the pattern from existing topic files
3. Add script tag to `index.html`
4. Update server knowledge base in `agents/server.js` if needed

## Testing

### Test Backend API

#### Health Check

```bash
# Via curl
curl http://localhost:3001/health

# Expected response:
# {"status":"ok"}
```

#### Test Agent Endpoint (GET)

```bash
curl "http://localhost:3001/api/agent?msg=java"

# Expected response:
# {"reply":"☕ **Java**: Strongly typed, JVM-based...","timestamp":"2026-05-11T..."}
```

#### Test Agent Endpoint (POST)

```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"msg":"tell me about kafka"}'

# Expected response:
# {"reply":"📨 **Kafka**: Distributed event log...","timestamp":"2026-05-11T..."}
```

### Test Frontend in Browser

1. Navigate to http://localhost:8000
2. Verify the page loads without console errors
3. Click on topics in the sidebar to verify navigation works
4. Use the agent widget to test backend communication
5. Check browser console for any errors: Press `F12` → Console tab

### Test CORS (if frontend and backend on different domains)

Backend should respond with CORS headers:

```bash
curl -i http://localhost:3001/health

# Should include:
# Access-Control-Allow-Origin: *
```

## API Reference

### Backend Endpoints

#### GET /health

Health check endpoint.

```bash
curl http://localhost:3001/health
```

**Response:**

```json
{ "status": "ok" }
```

#### GET /api/agent?msg=<query>

Get an agent reply based on a query string.

```bash
curl "http://localhost:3001/api/agent?msg=microservices"
```

**Response:**

```json
{
  "reply": "🔧 **Microservices**: Decompose by bounded context...",
  "timestamp": "2026-05-11T12:00:00.000Z"
}
```

#### POST /api/agent

Get an agent reply based on request body.

```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"msg":"spring boot"}'
```

**Response:**

```json
{
  "reply": "🌱 **Spring Boot**: Auto-configuration + dependency injection...",
  "timestamp": "2026-05-11T12:00:00.000Z"
}
```

### Supported Agent Keywords

- `java` — Java best practices
- `go`, `golang` — Go/Golang patterns
- `python` — Python tips
- `microservice`, `microservices` — Microservices patterns
- `spring` — Spring Boot framework
- `kafka` — Kafka messaging
- `rest` — REST API design
- `docker` — Docker containerization
- `kubernetes` — Kubernetes orchestration
- `grpc` — gRPC protocols
- `sql` — SQL optimization
- `redis` — Redis usage
- `agent`, `agents` — AI agents concepts

## Troubleshooting

### Backend won't start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>

# Try a different port by editing agents/server.js
```

### Frontend can't connect to backend

- Ensure backend server is running on http://localhost:3001
- Check browser console for CORS errors
- Verify CORS is enabled in `agents/server.js`
- Check that ports match (frontend shouldn't hardcode wrong port)

### Port 8000 already in use

```bash
# Use a different port
python3 -m http.server 9000

# Then visit http://localhost:9000
```

### Module not found errors

```bash
# Reinstall dependencies
cd angular-study-app/agents/
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Build for Production (Frontend)

No build step required — simply deploy the `angular-study-app/` directory to a static hosting service (GitHub Pages, Vercel, Netlify, etc.).

### Deploy Backend

```bash
# Install production dependencies only
npm ci --production

# Use a process manager (recommended)
npm install -g pm2
pm2 start agents/server.js --name "study-agent"

# Or use a container
docker build -t study-agent .
docker run -p 3001:3001 study-agent
```

## Environment Variables

Create a `.env` file in `angular-study-app/agents/` if needed:

```bash
PORT=3001
NODE_ENV=production
```

Then load in `server.js`:

```javascript
const PORT = process.env.PORT || 3001;
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Create a pull request

## License

This project is for educational purposes. See CLAUDE.md for project scope.

## Quick Reference

| Command                                           | Description                       |
| ------------------------------------------------- | --------------------------------- |
| `cd angular-study-app/agents && npm start`        | Start backend server (port 3001)  |
| `python3 -m http.server 8000`                     | Start frontend server (port 8000) |
| `curl http://localhost:3001/health`               | Test backend health               |
| `curl "http://localhost:3001/api/agent?msg=java"` | Test agent endpoint               |
| `npm install`                                     | Install backend dependencies      |
| `rm -rf node_modules && npm install`              | Clean install dependencies        |

## Support

For issues or questions:

- Check the Troubleshooting section above
- Review console errors in browser DevTools (F12)
- Check git history: `git log --oneline`
- Review CLAUDE.md for project scope
