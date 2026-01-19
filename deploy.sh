#!/bin/bash
set -euo pipefail

echo "🚀 Shama Core Platform - Production Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available (v2 integrated)
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose v2 is not available. Please ensure Docker is properly installed."
    exit 1
fi

# Check if secrets exist
log_info "Checking secrets..."
if [ ! -f "./secrets/db_password.txt" ]; then
    log_error "Database password secret not found at ./secrets/db_password.txt"
    exit 1
fi

if [ ! -f "./secrets/jwt_secret.txt" ]; then
    log_error "JWT secret not found at ./secrets/jwt_secret.txt"
    exit 1
fi

if [ ! -f "./secrets/minio_password.txt" ]; then
    log_warn "MinIO password secret not found. Using default."
    echo "minioadmin123" > ./secrets/minio_password.txt
fi

# Build services
log_info "Building service images..."
docker compose build --parallel

# Run database migrations (if any)
log_info "Running database migrations..."
# TODO: Implement migrations
# docker compose run --rm sales-svc npm run migration:run

# Start services
log_info "Starting services..."
docker compose up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Health checks
log_info "Running health checks..."

services=("gateway" "inventory-svc" "crm-svc" "sales-svc" "postgres" "nats" "redis" "minio")

for service in "${services[@]}"; do
    if docker compose ps | grep -q "${service}.*Up"; then
        log_info "✅ ${service} is running"
    else
        log_error "❌ ${service} failed to start"
        log_info "Showing logs for ${service}:"
        docker compose logs ${service}
        exit 1
    fi
done

# Test API endpoints
log_info "Testing API endpoints..."
if curl -f -s http://localhost:5000/health > /dev/null; then
    log_info "✅ Gateway health check passed"
else
    log_error "❌ Gateway health check failed"
fi

log_info "🎉 Deployment completed successfully!"
echo ""
echo "📊 Access URLs:"
echo "  • API Gateway: http://localhost:5000"
echo "  • Grafana: http://localhost:5007 (admin/admin)"
echo "  • MinIO Console: http://localhost:5005 (minioadmin/minioadmin123)"
echo "  • Loki: http://localhost:5006"
echo ""
echo "📝 Useful commands:"
echo "  • View logs: docker compose logs -f <service>"
echo "  • Stop services: docker compose down"
echo "  • Restart service: docker compose restart <service>"