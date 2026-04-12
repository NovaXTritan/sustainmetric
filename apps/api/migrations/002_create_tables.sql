-- Migration 002: Create all 10 core tables
-- Depends on: 001_enable_extensions.sql

-- ============================================================
-- 1. tenants — maps to Firebase Auth custom claims or org logic
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    monthly_query_quota INT NOT NULL DEFAULT 5000,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. users — linked to Firebase Auth UID
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- ============================================================
-- 3. sites — reusable location bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    city TEXT NOT NULL DEFAULT 'Delhi',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);

-- ============================================================
-- 4. projects — group sites under a project for BRSR reporting
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- ============================================================
-- 5. queries — each analysis run
-- ============================================================
CREATE TABLE IF NOT EXISTS queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    site_id UUID REFERENCES sites(id),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'fetching_data', 'processing', 'completed', 'failed')),
    error_message TEXT,
    served_from_cache BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queries_tenant_id ON queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);

-- ============================================================
-- 6. query_inputs — raw data from each fetcher
-- ============================================================
CREATE TABLE IF NOT EXISTS query_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    source_url TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    freshness_seconds INT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_inputs_query_id ON query_inputs(query_id);

-- ============================================================
-- 7. query_outputs — Gemini analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS query_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_used TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    prompt_tokens INT,
    completion_tokens INT,
    cost_inr DOUBLE PRECISION DEFAULT 0,
    raw_response JSONB NOT NULL DEFAULT '{}',
    validated_response JSONB NOT NULL DEFAULT '{}',
    validation_warnings JSONB DEFAULT '[]',
    cache_source TEXT,  -- NULL, 'prewarmed', 'previous_query'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_outputs_query_id ON query_outputs(query_id);

-- ============================================================
-- 8. audit_log — immutable record of every protected action
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    request_method TEXT,
    request_path TEXT,
    request_body JSONB,
    response_status INT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================
-- 9. brsr_exports — generated BRSR Principle 6 reports
-- ============================================================
CREATE TABLE IF NOT EXISTS brsr_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    report_period TEXT NOT NULL,
    principle_6_data JSONB NOT NULL DEFAULT '{}',
    format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'pdf', 'xlsx')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brsr_exports_tenant_id ON brsr_exports(tenant_id);

-- ============================================================
-- 10. policy_chunks — RAG embeddings for policy documents
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_document TEXT NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_chunks_tenant_id ON policy_chunks(tenant_id);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_policy_chunks_embedding
    ON policy_chunks USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Auto-update updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'tenants', 'users', 'sites', 'projects', 'queries', 'brsr_exports'
    ]) LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();', tbl
        );
    END LOOP;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- triggers already exist
END;
$$;
