.PHONY: install dev start server server-dev run stop lint format help

FRONTEND_PORT := 8080
BACKEND_PORT  := 3001

install:
	npm install

dev:
	@-lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	npm run dev

start:
	npm run start

server:
	npm run server

server-dev:
	npm run server:dev

run:
	@echo "Starting frontend on :$(FRONTEND_PORT) and backend on :$(BACKEND_PORT)..."
	@npm run server:dev & npm run dev

stop:
	@echo "Killing servers on ports $(FRONTEND_PORT) and $(BACKEND_PORT)..."
	@-lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti :$(BACKEND_PORT)  | xargs kill -9 2>/dev/null || true
	@echo "Done."

lint:
	npm run lint

format:
	npm run format

help:
	@echo ""
	@echo "  make install     install npm dependencies"
	@echo "  make dev         frontend  → http://localhost:$(FRONTEND_PORT)  (auto-open, no cache)"
	@echo "  make start       frontend  → http://localhost:$(FRONTEND_PORT)  (no auto-open)"
	@echo "  make server      backend   → http://localhost:$(BACKEND_PORT)"
	@echo "  make server-dev  backend   → auto-reload on file change"
	@echo "  make run         frontend + backend together"
	@echo "  make stop        kill both servers"
	@echo "  make lint        eslint --fix"
	@echo "  make format      prettier --write"
	@echo ""
