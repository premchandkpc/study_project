.PHONY: install dev start server server-dev run stop lint format help

APP_DIR := angular-study-app

install:
	cd $(APP_DIR) && npm install

dev:
	@-lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	cd $(APP_DIR) && npm run dev

start:
	cd $(APP_DIR) && npm run start

server:
	cd $(APP_DIR) && npm run server

server-dev:
	cd $(APP_DIR) && npm run server:dev

run:
	@echo "Starting frontend on :8080 and backend on :3001..."
	@cd $(APP_DIR) && npm run server:dev & cd $(APP_DIR) && npm run dev

stop:
	@echo "Killing servers on ports 8080 and 3001..."
	@-lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@-lsof -ti :3001 | xargs kill -9 2>/dev/null || true
	@echo "Done."

lint:
	cd $(APP_DIR) && npm run lint

format:
	cd $(APP_DIR) && npm run format

help:
	@echo ""
	@echo "  make install     install npm dependencies"
	@echo "  make dev         frontend  → http://localhost:8080  (auto-open, no cache)"
	@echo "  make start       frontend  → http://localhost:8080  (no auto-open)"
	@echo "  make server      backend   → http://localhost:3001"
	@echo "  make server-dev  backend   → auto-reload on file change"
	@echo "  make run         frontend + backend together"
	@echo "  make stop        kill both servers"
	@echo "  make lint        eslint --fix"
	@echo "  make format      prettier --write"
	@echo ""
