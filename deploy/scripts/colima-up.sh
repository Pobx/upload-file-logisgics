#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking Colima VM status..."
if ! colima status >/dev/null 2>&1; then
    echo "==> Starting Colima VM with 4 vCPU, 8GB RAM, virtiofs..."
    colima start --cpu 4 --memory 8 --disk 100 --vm-type vz --mount-type virtiofs
fi

echo "==> Verifying docstore mount..."
./deploy/scripts/mount-docstore.sh

echo "==> Launching Docker Compose stack..."
docker compose -f deploy/docker-compose.yml up -d

echo "==> Logistics Document Hub is running."
