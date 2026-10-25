#!/usr/bin/env bash
set -euo pipefail

echo "==> Seeding testinfra data..."
echo "1. Checking directory marker for storage..."
mkdir -p ./data/docstore
touch ./data/docstore/.docsearch-mount

echo "2. Seeding sample test CSV..."
mkdir -p ./data/samples
cat << 'EOF' > ./data/samples/sample_job_orders.csv
JobOrder,B/L,Invoice,Customer Name
JO-2026-0001,BL-TH-9901,INV-2026-001,Siam Logistics Corp
JO-2026-0002,BL-TH-9902,INV-2026-002,Bangkok Freight Ltd
JO-2026-0003,BL-TH-9903,INV-2026-003,Eastern Sea Transport Co
JO-2026-0004,,,Siam Logistics Corp
JO-2026-0005,BL-TH-9905,,Thai Maritime Agency
EOF

echo "==> Seeding testinfra complete."
