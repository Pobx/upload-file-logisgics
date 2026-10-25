-- 000001_init_schema.up.sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Document Types Master
CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO document_types (code, name) VALUES
    ('BL', 'Bill of Lading'),
    ('INVOICE', 'Invoice'),
    ('PACKING_LIST', 'Packing List'),
    ('CUSTOMS', 'Customs Declaration'),
    ('OTHER', 'Other Document');

-- Customers Master
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_normalized TEXT NOT NULL,
    customer_code TEXT UNIQUE,
    tax_id TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name_trgm ON customers USING gin (name_normalized gin_trgm_ops);

-- Import Batches
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    created_by UUID,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import Rows (Audit / Errors)
CREATE TABLE import_rows (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_no INT NOT NULL,
    raw JSONB NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT
);

CREATE INDEX idx_import_rows_batch ON import_rows (import_batch_id, row_no);

-- Job Orders
CREATE TABLE job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_no TEXT NOT NULL UNIQUE,
    bl_no TEXT,
    invoice_no TEXT,
    job_no_norm TEXT GENERATED ALWAYS AS (upper(btrim(job_no))) STORED,
    bl_no_norm TEXT GENERATED ALWAYS AS (upper(btrim(bl_no))) STORED,
    invoice_no_norm TEXT GENERATED ALWAYS AS (upper(btrim(invoice_no))) STORED,
    customer_id UUID NOT NULL REFERENCES customers(id),
    import_batch_id UUID REFERENCES import_batches(id),
    assignee_id UUID,
    data_source TEXT NOT NULL DEFAULT 'manual',
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    verified_at TIMESTAMPTZ,
    verified_batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Order Indexes for Search (exact/prefix and contains)
CREATE INDEX idx_jo_job_norm_bt ON job_orders (job_no_norm text_pattern_ops);
CREATE INDEX idx_jo_bl_norm_bt ON job_orders (bl_no_norm text_pattern_ops) WHERE bl_no IS NOT NULL;
CREATE INDEX idx_jo_inv_norm_bt ON job_orders (invoice_no_norm text_pattern_ops) WHERE invoice_no IS NOT NULL;

CREATE INDEX idx_jo_job_norm_trgm ON job_orders USING gin (job_no_norm gin_trgm_ops);
CREATE INDEX idx_jo_bl_norm_trgm ON job_orders USING gin (bl_no_norm gin_trgm_ops);
CREATE INDEX idx_jo_inv_norm_trgm ON job_orders USING gin (invoice_no_norm gin_trgm_ops);

CREATE INDEX idx_job_orders_created ON job_orders (created_at DESC, id DESC);
CREATE INDEX idx_job_orders_customer ON job_orders (customer_id);
CREATE INDEX idx_job_orders_assignee ON job_orders (assignee_id) WHERE assignee_id IS NOT NULL;

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    document_type_id INT NOT NULL REFERENCES document_types(id),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 TEXT NOT NULL,
    storage_provider TEXT NOT NULL DEFAULT 'sftp',
    storage_ref TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    provided_by_name TEXT,
    provided_by_type TEXT,
    search_vector TSVECTOR,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_documents_dedup ON documents (job_order_id, sha256, document_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_job_order ON documents (job_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created_at ON documents (created_at DESC);

-- User Profiles (Snapshot for reports)
CREATE TABLE user_profiles (
    sub UUID PRIMARY KEY,
    username TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    position TEXT,
    department TEXT,
    employee_id TEXT UNIQUE,
    email TEXT,
    source TEXT NOT NULL DEFAULT 'local',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_dept ON user_profiles (department);
CREATE INDEX idx_user_profiles_name_trgm ON user_profiles USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Revoked Tokens (Denylist)
CREATE TABLE revoked_tokens (
    id BIGSERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    value TEXT NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    UNIQUE (kind, value)
);

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);

-- Idempotency Keys
CREATE TABLE idempotency_keys (
    user_id UUID NOT NULL,
    idem_key TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    response_code INT,
    response_body JSONB,
    locked_until TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, idem_key)
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys (expires_at);

-- Import Conflicts
CREATE TABLE import_conflicts (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id UUID NOT NULL REFERENCES import_batches(id),
    job_order_id UUID NOT NULL REFERENCES job_orders(id),
    field TEXT NOT NULL,
    existing_value TEXT,
    csv_value TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflicts_status ON import_conflicts (status);

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC, id DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
