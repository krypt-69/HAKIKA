#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../../backups"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-hakika}"
DB_NAME="${DB_NAME:-hakika_db}"
DB_PASSWORD="${DB_PASSWORD:-hakika_dev}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$DAILY_DIR/hakika_backup_$TIMESTAMP.sql"

echo "Backup started at $(date)"
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
echo "Daily backup: ${BACKUP_FILE}.gz"

# Weekly backup (Sunday)
if [ "$(date +%u)" -eq 7 ]; then
    cp "${BACKUP_FILE}.gz" "$WEEKLY_DIR/"
    echo "Weekly backup saved"
fi

# Cleanup old backups
find "$DAILY_DIR" -name "*.gz" -mtime +30 -delete
find "$WEEKLY_DIR" -name "*.gz" -mtime +84 -delete

echo "Backup completed at $(date)"
