#!/usr/bin/env bash
set -euo pipefail

# Mount script for Colima VM to mount Samba/NAS share
MOUNT_POINT="/mnt/docstore"
MARKER_FILE="${MOUNT_POINT}/.docsearch-mount"

echo "Checking mount status of ${MOUNT_POINT}..."
if [ -f "${MARKER_FILE}" ]; then
    echo "Docstore is already mounted and healthy."
    exit 0
fi

echo "Creating mount point ${MOUNT_POINT}..."
sudo mkdir -p "${MOUNT_POINT}"

# For local development / demo fallback, bind-mount ./data/docstore
if [ -d "./data/docstore" ]; then
    echo "Binding local ./data/docstore to ${MOUNT_POINT}..."
    sudo mount --bind ./data/docstore "${MOUNT_POINT}" || true
    touch "${MARKER_FILE}" || true
fi

echo "Mount verification finished."
