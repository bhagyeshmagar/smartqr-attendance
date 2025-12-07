.PHONY: up down build migrate seed test lint clean logs

# Docker Compose commands
up:
	docker-compose -f infra/docker-compose.yml up -d

up-build:
	docker-compose -f infra/docker-compose.yml up -d --build

down:
	docker-compose -f infra/docker-compose.yml down

logs:
	docker-compose -f infra/docker-compose.yml logs -f

logs-backend:
	docker-compose -f infra/docker-compose.yml logs -f backend

logs-frontend:
	docker-compose -f infra/docker-compose.yml logs -f frontend

# Database commands
migrate:
	docker-compose -f infra/docker-compose.yml exec backend npx prisma migrate deploy

migrate-dev:
	docker-compose -f infra/docker-compose.yml exec backend npx prisma migrate dev

seed:
	docker-compose -f infra/docker-compose.yml exec backend npx prisma db seed

studio:
	cd backend && npx prisma studio

# Testing
test:
	cd backend && npm test
	cd frontend && npm test

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

test-e2e:
	cd backend && npm run test:e2e

# Linting
lint:
	cd backend && npm run lint
	cd frontend && npm run lint

lint-fix:
	cd backend && npm run lint:fix
	cd frontend && npm run lint:fix

# Build
build:
	cd backend && npm run build
	cd frontend && npm run build

# Clean up
clean:
	docker-compose -f infra/docker-compose.yml down -v
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist

# Development (local without Docker)
dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

# Install dependencies
install:
	cd backend && npm install
	cd frontend && npm install

# Generate Prisma client
generate:
	cd backend && npx prisma generate

# Reset database (dangerous!)
db-reset:
	docker-compose -f infra/docker-compose.yml exec backend npx prisma migrate reset --force

# Shell into containers
shell-backend:
	docker-compose -f infra/docker-compose.yml exec backend sh

shell-db:
	docker-compose -f infra/docker-compose.yml exec postgres psql -U postgres -d smartqr

shell-redis:
	docker-compose -f infra/docker-compose.yml exec redis redis-cli
