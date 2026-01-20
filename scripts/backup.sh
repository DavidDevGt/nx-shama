#!/bin/bash

# Database Backup Script for Shama Core Platform

set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/shama_backup_${TIMESTAMP}.sql.gz"

echo "📦 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
docker compose exec -T postgres pg_dump -U shama_user shama_platform | gzip > "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "shama_backup_*.sql.gz" -mtime +30 -delete

echo "🧹 Cleaned old backups"