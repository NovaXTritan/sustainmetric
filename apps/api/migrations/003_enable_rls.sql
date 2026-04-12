-- Migration 003: Enable Row Level Security on all tenant-scoped tables
-- Depends on: 002_create_tables.sql

-- ============================================================
-- Helper function: extract tenant_id from Supabase JWT
-- When using service_role key, RLS is bypassed.
-- When using anon key + user JWT, this extracts tenant_id.
-- For our FastAPI backend using service_role, RLS is bypassed,
-- but we enforce tenant isolation in application code.
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_tenant()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Enable RLS on all tenant-scoped tables
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE brsr_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: tenant isolation
-- Each policy ensures users can only see rows matching their tenant
-- ============================================================

-- users
CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (tenant_id = current_user_tenant());

-- sites
CREATE POLICY tenant_isolation_sites ON sites
    FOR ALL USING (tenant_id = current_user_tenant());

-- projects
CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL USING (tenant_id = current_user_tenant());

-- queries
CREATE POLICY tenant_isolation_queries ON queries
    FOR ALL USING (tenant_id = current_user_tenant());

-- query_inputs
CREATE POLICY tenant_isolation_query_inputs ON query_inputs
    FOR ALL USING (tenant_id = current_user_tenant());

-- query_outputs
CREATE POLICY tenant_isolation_query_outputs ON query_outputs
    FOR ALL USING (tenant_id = current_user_tenant());

-- audit_log
CREATE POLICY tenant_isolation_audit_log ON audit_log
    FOR ALL USING (tenant_id = current_user_tenant());

-- brsr_exports
CREATE POLICY tenant_isolation_brsr_exports ON brsr_exports
    FOR ALL USING (tenant_id = current_user_tenant());

-- policy_chunks
CREATE POLICY tenant_isolation_policy_chunks ON policy_chunks
    FOR ALL USING (tenant_id = current_user_tenant());

-- ============================================================
-- Service role bypass: Supabase service_role key bypasses RLS
-- automatically, so our FastAPI backend (using service_role key)
-- can access all rows and enforce tenant isolation in code.
-- ============================================================
