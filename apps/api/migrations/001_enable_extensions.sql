-- Migration 001: Enable required PostgreSQL extensions
-- Run this FIRST against the Supabase SQL editor

-- pgvector for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable moddatetime for auto-updated_at triggers
CREATE EXTENSION IF NOT EXISTS moddatetime;
