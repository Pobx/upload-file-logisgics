.PHONY: up down restart test lint migrate seed-testinfra build clean

SHELL := /bin/bash

up:
	@echo "Starting application containers..."
	docker compose -f deploy/docker-compose.yml up -d

obs-up:
	@echo "Starting LGTM observability stack..."
	docker compose -f deploy/docker-compose.observability.yml up -d

obs-down:
	@echo "Stopping LGTM observability stack..."
	docker compose -f deploy/docker-compose.observability.yml down

down:
	@echo "Stopping application containers..."
	docker compose -f deploy/docker-compose.yml down

testinfra:
	@echo "Starting testinfra profile (OpenLDAP + Samba + SFTP)..."
	docker compose -f deploy/docker-compose.testinfra.yml --profile testinfra up -d

seed-testinfra:
	@echo "Seeding testinfra data..."
	./deploy/scripts/seed-testinfra.sh

test: test-be test-fe

test-be:
	@echo "Running backend unit tests..."
	cd apps/api && go test -v -race ./...

test-fe:
	@echo "Running frontend unit tests..."
	cd apps/web && npm test

lint: lint-be lint-fe

lint-be:
	@echo "Linting backend..."
	cd apps/api && go vet ./...

lint-fe:
	@echo "Linting frontend..."
	cd apps/web && npx tsc --noEmit

migrate:
	@echo "Running migrations..."
	docker compose -f deploy/docker-compose.yml run --rm migrate

build:
	@echo "Building backend..."
	cd apps/api && go build -o bin/server ./cmd/server
	cd apps/api && go build -o bin/worker ./cmd/worker
	@echo "Building frontend..."
	cd apps/web && npm run build

clean:
	@echo "Cleaning artifacts..."
	rm -rf apps/api/bin apps/web/dist
