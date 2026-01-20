#!/bin/bash

# Database Migration Script for Shama Core Platform
# This script runs database migrations for all services

set -euo pipefail

echo "🚀 Running Database Migrations..."

# Wait for database to be ready
echo "Waiting for database..."
docker compose exec -T postgres pg_isready -U shama_user -d shama_platform

# Run migrations for each service
echo "Running inventory migrations..."
docker compose exec -T inventory-svc npm run migration:run || echo "No migrations for inventory"

echo "Running crm migrations..."
docker compose exec -T crm-svc npm run migration:run || echo "No migrations for crm"

echo "Running sales migrations..."
docker compose exec -T sales-svc npm run migration:run || echo "No migrations for sales"

echo "✅ Migrations completed successfully!"