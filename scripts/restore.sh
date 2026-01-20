#!/bin/bash

# Database Restore Script for Shama Core Platform

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -la ./backups/shama_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "🛑 Stopping services..."
docker compose stop sales-svc crm-svc inventory-svc

echo "🔄 Restoring database from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U shama_user -d shama_platform

echo "▶️  Starting services..."
docker compose start sales-svc crm-svc inventory-svc

echo "✅ Database restored successfully!"