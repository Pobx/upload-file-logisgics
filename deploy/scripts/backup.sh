#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/docsearch_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "==> Starting database backup to ${BACKUP_FILE}..."
docker exec -t docsearch-postgres pg_dump -U docsearch docsearch_app | gzip > "${BACKUP_FILE}"
echo "==> Backup completed successfully: $(ls -lh "${BACKUP_FILE}")"

# Retention: Remove backups older than 14 days
echo "==> Purging backups older than 14 days..."
find "${BACKUP_DIR}" -name "docsearch_backup_*.sql.gz" -mtime +14 -delete || true
echo "==> Backup maintenance complete."
