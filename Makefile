.PHONY: help dev dev-backend dev-frontend dev-infra build test lint clean docker-base

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────
# Development
# ──────────────────────────────────────

dev: dev-infra dev-backend dev-frontend ## Start full dev environment

dev-infra: ## Start infrastructure (PostgreSQL)
	docker compose -f docker-compose.dev.yml up -d

dev-backend: ## Start Go backend with hot reload
	cd backend && go run ./cmd/server/

dev-frontend: ## Start Next.js dev server
	cd frontend && pnpm dev

# ──────────────────────────────────────
# Build
# ──────────────────────────────────────

build: build-backend build-frontend docker-base ## Build everything

build-backend: ## Build Go binary
	cd backend && go build -o bin/server ./cmd/server/

build-frontend: ## Build Next.js production
	cd frontend && pnpm build

docker-base: ## Build the base machine Docker image
	docker build -t distsim-base:latest ./containers/base

# ──────────────────────────────────────
# Test
# ──────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run Go tests
	cd backend && go test ./...

test-frontend: ## Run frontend tests
	cd frontend && pnpm test

# ──────────────────────────────────────
# Quality
# ──────────────────────────────────────

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Run Go linter
	cd backend && go vet ./...

lint-frontend: ## Run ESLint
	cd frontend && pnpm lint

fmt: ## Format all code
	cd backend && gofmt -w .
	cd frontend && pnpm format

# ──────────────────────────────────────
# Docker Compose (production)
# ──────────────────────────────────────

up: docker-base ## Start everything in Docker
	docker compose up -d --build

down: ## Stop everything
	docker compose down

logs: ## Tail all logs
	docker compose logs -f

# ──────────────────────────────────────
# Cleanup
# ──────────────────────────────────────

clean: ## Remove build artifacts and containers
	rm -rf backend/bin
	rm -rf frontend/.next frontend/node_modules
	docker compose down --volumes --remove-orphans 2>/dev/null || true
	docker compose -f docker-compose.dev.yml down --volumes 2>/dev/null || true

clean-sessions: ## Remove all distsim session containers and networks
	docker ps -a --filter "label=distsim.session" -q | xargs -r docker rm -f
	docker network ls --filter "label=distsim.session" -q | xargs -r docker network rm
