#!/bin/bash
# Postgres backup — runs inside the postgres container via docker exec
# Usage: ./backup.sh  (or via cron)

set -euo pipefail

BACKUP_DIR="/home/jal/edel-racing/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/edel_racing_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec edel-racing-postgres-1 pg_dump -U postgres edel_racing | gzip > "$FILE"

echo "Backup saved: $FILE"

# Keep only last 14 backups
cd "$BACKUP_DIR" && ls -t edel_racing_*.sql.gz | tail -n +15 | xargs -r rm --
