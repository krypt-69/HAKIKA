#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../../backups"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-hakika}"
DB_NAME="${DB_NAME:-hakika_db}"
DB_PASSWORD="${DB_PASSWORD:-hakika_dev}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hakika_backup_$TIMESTAMP.sql"
mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_NAME@$DB_HOST:$DB_PORT to $BACKUP_FILE ..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo "Backup successful: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "Backup failed – empty file"
    exit 1
fi
