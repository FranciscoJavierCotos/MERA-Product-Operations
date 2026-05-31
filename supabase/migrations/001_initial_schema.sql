-- ============================================================
-- MERA — Initial Schema (complete, idempotent foundation)
--
-- Run this once against a fresh Supabase project to get the full
-- database structure. All subsequent changes live in the numbered
-- migrations that follow this file.
--
-- Before running, configure two database settings so the pg_net
-- webhook triggers can call your Edge Functions:
--
--   ALTER DATABASE postgres
--     SET app.supabase_url    = 'https://<your-ref>.supabase.co';
--   ALTER DATABASE postgres
--     SET app.supabase_anon_key = '<your-anon-key>';
--
-- These values are public (the anon key is safe to embed in SQL).
-- The Edge Functions use the injected SUPABASE_SERVICE_ROLE_KEY
-- for any privileged write-backs, which is never stored in SQL.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector: 768-dim embeddings
CREATE EXTENSION IF NOT EXISTS pg_net;   -- async HTTP from triggers


-- ============================================================
-- 2. ENUMS
-- ============================================================

CREATE TYPE user_role           AS ENUM ('admin', 'support_lead', 'support_member', 'client');
CREATE TYPE project_methodology AS ENUM ('scrum', 'kanban', 'waterfall');
CREATE TYPE project_status      AS ENUM ('active', 'archived');
CREATE TYPE sprint_status       AS ENUM ('planned', 'active', 'completed');
CREATE TYPE work_item_type      AS ENUM ('epic', 'story', 'task', 'bug');
CREATE TYPE work_item_status    AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'rework');


-- ============================================================
-- 4. LOOKUP TABLES  (SMALLINT PKs, seeded with defaults)
-- These are the source of truth for status/priority/etc values.
-- Adding a new status is a row INSERT, not a deploy.
-- ============================================================

-- ── 4a. Teams ────────────────────────────────────────────────
-- (created before profiles so the FK can be added there)

CREATE TYPE team_type_enum    AS ENUM ('business', 'support', 'engineering');
CREATE TYPE support_level_enum AS ENUM ('L1', 'L2', 'L3');

CREATE TABLE teams (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT              NOT NULL,
  description   TEXT,
  team_type     team_type_enum,
  support_level support_level_enum,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ── 4b. Ticket status lookup ─────────────────────────────────

CREATE TABLE ticket_statuses (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  badge_variant TEXT     NOT NULL DEFAULT 'secondary',
  is_final      BOOLEAN  NOT NULL DEFAULT false,
  display_order SMALLINT NOT NULL
);

INSERT INTO ticket_statuses (id, name, label, badge_variant, is_final, display_order) VALUES
  (1, 'new',              'New',                  'default',   false, 1),
  (2, 'pending_customer', 'Pending Customer Side', 'secondary', false, 2),
  (3, 'pending_internal', 'Pending Our Side',      'secondary', false, 3),
  (4, 'escalated',        'Escalated',             'secondary', false, 4),
  (5, 'resolved',         'Resolved',              'secondary', true,  5),
  (6, 'closed',           'Closed',                'secondary', true,  6);

-- ── 4c. Ticket priority lookup ───────────────────────────────

CREATE TABLE ticket_priorities (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

INSERT INTO ticket_priorities (id, name, label, color_class, display_order) VALUES
  (1, 'low',    'Low',    'bg-gray-100 text-gray-800 hover:bg-gray-100',       1),
  (2, 'medium', 'Medium', 'bg-blue-100 text-blue-800 hover:bg-blue-100',       2),
  (3, 'high',   'High',   'bg-orange-100 text-orange-800 hover:bg-orange-100', 3),
  (4, 'urgent', 'Urgent', 'bg-red-100 text-red-800 hover:bg-red-100',          4);

-- ── 4d. Ticket category lookup ───────────────────────────────

CREATE TABLE ticket_categories (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

INSERT INTO ticket_categories (id, name, label, display_order) VALUES
  (1, 'bug',                   'Bug',                   1),
  (2, 'feature_request',       'Feature Request',       2),
  (3, 'question',              'Question',              3),
  (4, 'configuration_request', 'Configuration Request', 4);

-- ── 4e. Ticket support level lookup ─────────────────────────

CREATE TABLE ticket_support_levels (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  description   TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

INSERT INTO ticket_support_levels (id, name, label, description, color_class, display_order) VALUES
  (1, 'L1', 'Level 1', 'Support Desk',      'bg-blue-100 text-blue-800',   1),
  (2, 'L2', 'Level 2', 'Technical Support', 'bg-amber-100 text-amber-800', 2),
  (3, 'L3', 'Level 3', 'Engineering',       'bg-red-100 text-red-800',     3);

-- ── 4f. Client temperature lookup ───────────────────────────

CREATE TABLE ticket_temperatures (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  emoji         TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  display_order SMALLINT NOT NULL
);

INSERT INTO ticket_temperatures (id, name, label, emoji, color_class, display_order) VALUES
  (1, 'cool', 'Good', '🟢', 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', 1),
  (2, 'warm', 'Warm', '🟡', 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', 2),
  (3, 'hot',  'Hot',  '🔴', 'bg-red-100 text-red-800 hover:bg-red-100',                                        3);

-- ── 4f-bis. Company health status lookup (migration 037) ────
-- Drives the CRM "happiness meter". `level` (1..5) drives the fill.

CREATE TABLE company_health_statuses (
  id            SMALLINT PRIMARY KEY,
  name          TEXT     NOT NULL UNIQUE,
  label         TEXT     NOT NULL,
  color_class   TEXT     NOT NULL,
  emoji         TEXT     NOT NULL,
  level         SMALLINT NOT NULL,
  display_order SMALLINT NOT NULL
);

INSERT INTO company_health_statuses (id, name, label, color_class, emoji, level, display_order) VALUES
  (1, 'critical', 'Critical', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',                '🔴', 1, 1),
  (2, 'at_risk',  'At Risk',  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',    '🟠', 2, 2),
  (3, 'neutral',  'Neutral',  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',    '🟡', 3, 3),
  (4, 'healthy',  'Healthy',  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',         '🟢', 4, 4),
  (5, 'thriving', 'Thriving', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', '🌟', 5, 5);

-- ── 4g. Free-form ticket tags ────────────────────────────────

CREATE TABLE tags (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  slug        TEXT    NOT NULL UNIQUE,
  color_class TEXT    NOT NULL DEFAULT 'bg-gray-100 text-gray-800'
);

-- ── 4h. KB source types (resolution vs. document) ───────────

CREATE TABLE kb_source_types (
  id   SMALLINT PRIMARY KEY,
  code TEXT     UNIQUE NOT NULL,
  label TEXT    NOT NULL
);

INSERT INTO kb_source_types (id, code, label) VALUES
  (1, 'resolution', 'Ticket Resolutions'),
  (2, 'document',   'Documentation');

-- ── 4i. KB document processing statuses ─────────────────────

CREATE TABLE kb_document_statuses (
  id   SMALLINT PRIMARY KEY,
  code TEXT     UNIQUE NOT NULL,
  label TEXT    NOT NULL
);

INSERT INTO kb_document_statuses (id, code, label) VALUES
  (1, 'pending',    'Pending'),
  (2, 'processing', 'Processing'),
  (3, 'ready',      'Ready'),
  (4, 'failed',     'Failed'),
  (5, 'archived',   'Archived');


-- ============================================================
-- 5. CORE ENTITY TABLES
-- ============================================================

-- ── 5a. Profiles ─────────────────────────────────────────────
-- Mirrors auth.users. Created automatically via trigger (section 11).

CREATE TABLE profiles (
  id          UUID      PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT      NOT NULL,
  full_name   TEXT      NOT NULL,
  role        user_role NOT NULL DEFAULT 'support_member',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
CREATE INDEX idx_profiles_role ON profiles (role);

-- ── Helper functions (depend on profiles) ────────────────────
-- Defined here so the profiles table already exists when Postgres
-- validates the SQL function bodies (PostgreSQL 16+ validates eagerly).

CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_support_or_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid
      AND role IN ('admin', 'support_lead', 'support_member')
  );
$$;

-- ── 5a-bis. Companies (CRM — migration 037) ──────────────────
-- Defined before tickets/projects so their company_id FK columns resolve.

CREATE TABLE companies (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  description       TEXT,
  industry          TEXT,
  website           TEXT,
  logo_url          TEXT,
  health_status_id  SMALLINT    NOT NULL REFERENCES company_health_statuses(id) DEFAULT 3,
  health_note       TEXT,
  health_updated_at TIMESTAMPTZ,
  health_updated_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  account_owner_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_health_status ON companies (health_status_id);
CREATE UNIQUE INDEX companies_name_ci      ON companies (lower(name));

CREATE TABLE company_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  title       TEXT,
  phone       TEXT,
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE INDEX idx_company_contacts_company ON company_contacts (company_id);

CREATE TABLE company_health_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_status_id SMALLINT    REFERENCES company_health_statuses(id),
  to_status_id   SMALLINT    NOT NULL REFERENCES company_health_statuses(id),
  note           TEXT,
  changed_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_health_history_company
  ON company_health_history (company_id, changed_at DESC);

-- ── 5b. Tickets ──────────────────────────────────────────────

CREATE TABLE tickets (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number        INTEGER     NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  cc_email             TEXT,
  -- Normalized FK references (lookup tables above)
  status_id            SMALLINT    NOT NULL DEFAULT 1 REFERENCES ticket_statuses(id),
  priority_id          SMALLINT    NOT NULL REFERENCES ticket_priorities(id),
  category_id          SMALLINT    REFERENCES ticket_categories(id),
  support_level_id     SMALLINT    REFERENCES ticket_support_levels(id),
  temperature_id       SMALLINT    REFERENCES ticket_temperatures(id),
  -- People + routing
  created_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  team_id              UUID        REFERENCES teams(id) ON DELETE SET NULL,
  company_id           UUID        REFERENCES companies(id) ON DELETE SET NULL,
  -- Client info (for tickets submitted on behalf of a client)
  client_email         TEXT,
  client_name          TEXT,
  -- Flexible payloads
  attachments          JSONB       NOT NULL DEFAULT '[]',
  custom_fields        JSONB       NOT NULL DEFAULT '{}',
  -- Time tracking
  time_worked_minutes  INTEGER     NOT NULL DEFAULT 0,
  -- Full-text search vector (maintained by trigger below)
  search_vector        TSVECTOR,
  -- Resolution narrative + AI embedding
  resolution           TEXT,
  resolution_plain     TEXT,       -- auto-stripped by trigger; never set manually
  resolution_embedding VECTOR(768),
  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status_id        ON tickets (status_id);
CREATE INDEX idx_tickets_priority_id      ON tickets (priority_id);
CREATE INDEX idx_tickets_category_id      ON tickets (category_id);
CREATE INDEX idx_tickets_support_level_id ON tickets (support_level_id);
CREATE INDEX idx_tickets_temperature_id   ON tickets (temperature_id);
CREATE INDEX idx_tickets_created_by       ON tickets (created_by);
CREATE INDEX idx_tickets_assigned_to      ON tickets (assigned_to);
CREATE INDEX idx_tickets_team_id          ON tickets (team_id);
CREATE INDEX idx_tickets_company          ON tickets (company_id);
CREATE INDEX idx_tickets_created_at       ON tickets (created_at DESC);
CREATE INDEX idx_tickets_search_vector    ON tickets USING gin(search_vector);
CREATE INDEX idx_tickets_resolution_hnsw
  ON tickets USING hnsw (resolution_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── 5c. Ticket ↔ Tag junction ────────────────────────────────

CREATE TABLE ticket_tags (
  ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id     UUID        NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags (ticket_id);
CREATE INDEX idx_ticket_tags_tag_id    ON ticket_tags (tag_id);

-- ── 5d. Tasks ────────────────────────────────────────────────

CREATE TYPE task_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE task_statuses (
  id         SMALLINT PRIMARY KEY,
  name       TEXT     NOT NULL UNIQUE,
  label      TEXT     NOT NULL,
  is_final   BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO task_statuses (id, name, label, is_final, sort_order) VALUES
  (1, 'pending',   'Pending',   FALSE, 0),
  (2, 'completed', 'Completed', TRUE,  1);

CREATE TABLE task_action_tags (
  id         SMALLINT PRIMARY KEY,
  name       TEXT     NOT NULL UNIQUE,
  label      TEXT     NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO task_action_tags (id, name, label, sort_order) VALUES
  ( 1, 'meeting',         'Meeting',         0),
  ( 2, 'pending_customer','Pending Customer', 1),
  ( 3, 'for_review',      'For Review',       2),
  ( 4, 'send_email',      'Send Email',       3),
  ( 5, 'follow_up',       'Follow Up',        4),
  ( 6, 'internal_review', 'Internal Review',  5),
  ( 7, 'documentation',   'Documentation',    6),
  ( 8, 'testing',         'Testing',          7),
  ( 9, 'deployment',      'Deployment',       8),
  (10, 'other',           'Other',            9);

CREATE TABLE tasks (
  id                 UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT               NOT NULL,
  description        TEXT,
  status_id          SMALLINT           NOT NULL DEFAULT 1 REFERENCES task_statuses(id),
  priority           task_priority_enum NOT NULL DEFAULT 'medium',
  action_tag_id      SMALLINT           NOT NULL DEFAULT 10 REFERENCES task_action_tags(id),
  ticket_id          UUID               REFERENCES tickets(id) ON DELETE SET NULL,
  assigned_to        UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by         UUID               REFERENCES profiles(id) ON DELETE SET NULL,
  due_date           DATE,
  completed_at       TIMESTAMPTZ,
  time_spent_minutes INTEGER,
  created_at         TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_ticket_id   ON tasks (ticket_id);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_status_id   ON tasks (status_id);
CREATE INDEX idx_tasks_due_date    ON tasks (due_date);

-- ── 5e. Ticket comments ──────────────────────────────────────

CREATE TABLE ticket_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT false,
  attachments JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket_id          ON ticket_comments (ticket_id, created_at DESC);
CREATE INDEX idx_ticket_comments_user_id             ON ticket_comments (user_id);
CREATE INDEX idx_ticket_comments_attachments_gin     ON ticket_comments USING gin (attachments jsonb_path_ops);

-- ── 5f. Ticket history (immutable audit trail) ───────────────
-- Written exclusively by DB triggers. App code must never INSERT here.

CREATE TABLE ticket_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  changes      JSONB       NOT NULL DEFAULT '{}',
  field_name   TEXT,
  old_value    TEXT,
  new_value    TEXT,
  source_table TEXT        NOT NULL DEFAULT 'tickets',
  source_id    UUID,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_history_ticket_id ON ticket_history (ticket_id, created_at DESC);
CREATE INDEX idx_ticket_history_user_id   ON ticket_history (user_id);

-- ── 5g. Integrations ─────────────────────────────────────────

CREATE TABLE integrations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        REFERENCES teams(id) ON DELETE SET NULL,
  service    TEXT        NOT NULL,
  config     JSONB       NOT NULL DEFAULT '{}',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integrations_team_id  ON integrations (team_id);
CREATE INDEX idx_integrations_service  ON integrations (service);


-- ============================================================
-- 6. SLA SYSTEM
-- ============================================================

-- ── 6a. SLA policies (one per priority) ──────────────────────

CREATE TABLE sla_policies (
  id                     UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT     NOT NULL,
  priority_id            SMALLINT NOT NULL REFERENCES ticket_priorities(id),
  response_time_minutes  INTEGER  NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  is_active              BOOLEAN  NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sla_policies_priority_id_unique UNIQUE (priority_id)
);

INSERT INTO sla_policies (name, priority_id, response_time_minutes, resolution_time_minutes) VALUES
  ('Urgent SLA', 4,   60,   240),
  ('High SLA',   3,  240,   480),
  ('Medium SLA', 2,  480,  1440),
  ('Low SLA',    1, 1440,  4320);

-- ── 6b. SLA instances (per-ticket SLA state) ─────────────────

CREATE TABLE sla_instances (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id            UUID        NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  policy_id            UUID        NOT NULL REFERENCES sla_policies(id),
  response_due_at      TIMESTAMPTZ NOT NULL,
  resolution_due_at    TIMESTAMPTZ NOT NULL,
  responded_at         TIMESTAMPTZ,
  paused_at            TIMESTAMPTZ,
  total_paused_minutes INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_instances_ticket_id           ON sla_instances (ticket_id);
CREATE INDEX idx_sla_instances_policy_id           ON sla_instances (policy_id);
CREATE INDEX idx_sla_instances_resolution_due      ON sla_instances (resolution_due_at);
CREATE INDEX idx_sla_instances_resolution_due_open ON sla_instances (resolution_due_at)
  WHERE responded_at IS NULL;
CREATE INDEX idx_sla_instances_response_due        ON sla_instances (response_due_at);


-- ============================================================
-- 7. AI KNOWLEDGE CENTER
-- ============================================================

-- ── 7a. Collections & tags ───────────────────────────────────

CREATE TABLE kb_collections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        UNIQUE NOT NULL,
  description   TEXT,
  owner_team_id UUID        REFERENCES teams(id)    ON DELETE SET NULL,
  environment   TEXT        NOT NULL DEFAULT 'production',
  archived_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE kb_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        UNIQUE NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7b. Documents, versions, chunks ─────────────────────────

CREATE TABLE kb_documents (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id        UUID        REFERENCES kb_collections(id) ON DELETE SET NULL,
  title                TEXT        NOT NULL,
  description          TEXT,
  source_type_id       SMALLINT    NOT NULL REFERENCES kb_source_types(id) DEFAULT 2,
  current_version_id   UUID,       -- FK added below after kb_document_versions exists
  ai_retrieval_enabled BOOLEAN     NOT NULL DEFAULT true,
  archived_at          TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE kb_document_versions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID        NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  version_number    INT         NOT NULL,
  storage_path      TEXT        NOT NULL,
  original_filename TEXT        NOT NULL,
  mime_type         TEXT        NOT NULL,
  file_size_bytes   BIGINT      NOT NULL,
  file_sha256       TEXT,
  extracted_text    TEXT,
  page_count        INT,
  status_id         SMALLINT    NOT NULL REFERENCES kb_document_statuses(id) DEFAULT 1,
  processing_error  TEXT,
  uploaded_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  UNIQUE (document_id, version_number)
);

-- Add the circular FK now that both tables exist
ALTER TABLE kb_documents
  ADD CONSTRAINT kb_documents_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES kb_document_versions(id)
  ON DELETE SET NULL;

CREATE TABLE kb_document_tags (
  document_id UUID NOT NULL REFERENCES kb_documents(id)  ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES kb_tags(id)       ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE kb_document_chunks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID        NOT NULL REFERENCES kb_document_versions(id) ON DELETE CASCADE,
  document_id         UUID        NOT NULL REFERENCES kb_documents(id)          ON DELETE CASCADE,
  chunk_index         INT         NOT NULL,
  content             TEXT        NOT NULL,
  content_tokens      INT,
  page_number         INT,
  embedding           VECTOR(768),
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_version_id, chunk_index)
);

CREATE INDEX idx_kb_chunks_embedding_hnsw
  ON kb_document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_kb_chunks_document_id   ON kb_document_chunks (document_id);
CREATE INDEX idx_kb_chunks_version_id    ON kb_document_chunks (document_version_id);
CREATE INDEX idx_kb_versions_document    ON kb_document_versions (document_id);
CREATE INDEX idx_kb_versions_status      ON kb_document_versions (status_id);
CREATE INDEX idx_kb_documents_collection ON kb_documents (collection_id);
CREATE INDEX idx_kb_documents_ai_enabled
  ON kb_documents (ai_retrieval_enabled) WHERE archived_at IS NULL;

-- ── 7c. Resolution-side AI controls ─────────────────────────

CREATE TABLE kb_resolution_settings (
  ticket_id            UUID        PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  ai_retrieval_enabled BOOLEAN     NOT NULL DEFAULT true,
  archived_at          TIMESTAMPTZ,
  collection_id        UUID        REFERENCES kb_collections(id) ON DELETE SET NULL,
  manual_notes         TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

-- ── 7d. Retrieval config (one row per environment) ──────────

CREATE TABLE kb_retrieval_config (
  environment          TEXT        PRIMARY KEY DEFAULT 'production',
  similarity_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.70
    CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
  max_results          INT         NOT NULL DEFAULT 5 CHECK (max_results > 0 AND max_results <= 50),
  source_weights       JSONB       NOT NULL DEFAULT '{"resolution":1.0,"document":1.0}',
  sources_enabled      JSONB       NOT NULL DEFAULT '{"resolution":true,"document":true}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO kb_retrieval_config (environment) VALUES ('production');

-- ── 7e. Audit + analytics ────────────────────────────────────

CREATE TABLE kb_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  action      TEXT        NOT NULL,
  actor_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kb_retrieval_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        REFERENCES tickets(id)  ON DELETE SET NULL,
  user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  query_text   TEXT,
  results      JSONB       NOT NULL DEFAULT '[]',
  result_count INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_audit_entity
  ON kb_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_kb_retrieval_log_created
  ON kb_retrieval_log (created_at DESC);


-- ============================================================
-- 8. SCRUM PROJECT MANAGEMENT
-- ============================================================

-- ── 8a. Projects ─────────────────────────────────────────────

CREATE TABLE projects (
  id                   UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  key                  TEXT                NOT NULL UNIQUE
                         CHECK (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
  name                 TEXT                NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description          TEXT,
  methodology          project_methodology NOT NULL DEFAULT 'scrum',
  status               project_status      NOT NULL DEFAULT 'active',
  team_id              UUID                REFERENCES teams(id)    ON DELETE SET NULL,
  company_id           UUID                REFERENCES companies(id) ON DELETE SET NULL,
  lead_id              UUID                REFERENCES profiles(id) ON DELETE SET NULL,
  next_item_number     INT                 NOT NULL DEFAULT 1 CHECK (next_item_number >= 1),
  sprint_duration_weeks SMALLINT           NOT NULL DEFAULT 2
                         CHECK (sprint_duration_weeks BETWEEN 1 AND 4),
  created_by           UUID                REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_team    ON projects (team_id);
CREATE INDEX idx_projects_company ON projects (company_id);
CREATE INDEX idx_projects_status  ON projects (status);

-- ── 8b. Sprints ───────────────────────────────────────────────

CREATE TABLE sprints (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  goal       TEXT,
  start_date DATE,
  end_date   DATE,
  status     sprint_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT sprints_date_order CHECK (
    start_date IS NULL OR end_date IS NULL OR end_date >= start_date
  )
);

-- One active sprint per project
CREATE UNIQUE INDEX uniq_sprints_one_active_per_project
  ON sprints (project_id) WHERE status = 'active';

CREATE INDEX idx_sprints_project ON sprints (project_id);
CREATE INDEX idx_sprints_status  ON sprints (status);

-- ── 8c. Work items ────────────────────────────────────────────

CREATE TABLE work_items (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID             NOT NULL REFERENCES projects(id)       ON DELETE CASCADE,
  sprint_id    UUID             REFERENCES sprints(id)                  ON DELETE SET NULL,
  item_key     TEXT             NOT NULL UNIQUE,
  type         work_item_type   NOT NULL DEFAULT 'story',
  status       work_item_status NOT NULL DEFAULT 'todo',
  priority_id  SMALLINT         REFERENCES ticket_priorities(id),
  title        TEXT             NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description  TEXT,
  story_points SMALLINT         CHECK (story_points IS NULL OR (story_points >= 0 AND story_points <= 100)),
  assigned_to  UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_id  UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id    UUID             REFERENCES work_items(id) ON DELETE SET NULL,
  rank         TEXT             NOT NULL,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT work_items_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX idx_work_items_board          ON work_items (project_id, sprint_id, status, rank);
CREATE INDEX idx_work_items_assigned_to    ON work_items (assigned_to);
CREATE INDEX idx_work_items_parent         ON work_items (parent_id);
CREATE INDEX idx_work_items_project_sprint ON work_items (project_id, sprint_id);

-- ── 8d. Work item comments ────────────────────────────────────

CREATE TABLE work_item_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID        NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  attachments  JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_item_comments_item                    ON work_item_comments (work_item_id, created_at DESC);
CREATE INDEX idx_work_item_comments_attachments_gin        ON work_item_comments USING gin (attachments jsonb_path_ops);

-- ── 8e. Work item history (audit trail) ─────────────────────
-- Written exclusively by DB triggers. App code must never INSERT here.

CREATE TABLE work_item_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID        NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  field_name   TEXT,
  old_value    TEXT,
  new_value    TEXT,
  changes      JSONB       NOT NULL DEFAULT '{}',
  source_table TEXT,
  source_id    UUID,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_item_history_item ON work_item_history (work_item_id, created_at DESC);


-- ============================================================
-- 9. ITEM LINKS (Tickets ↔ Work Items)
-- ============================================================

CREATE TABLE link_types (
  id            TEXT     PRIMARY KEY,
  inverse_id    TEXT     NOT NULL,
  label         TEXT     NOT NULL,
  inverse_label TEXT     NOT NULL,
  is_symmetric  BOOLEAN  NOT NULL DEFAULT FALSE,
  sort_order    SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO link_types (id, inverse_id, label, inverse_label, is_symmetric, sort_order) VALUES
  ('implements',     'implemented_by',  'Implements',     'Implemented by',  FALSE, 10),
  ('implemented_by', 'implements',      'Implemented by', 'Implements',      FALSE, 11),
  ('blocks',         'blocked_by',      'Blocks',         'Blocked by',      FALSE, 20),
  ('blocked_by',     'blocks',          'Blocked by',     'Blocks',          FALSE, 21),
  ('depends_on',     'depended_on_by',  'Depends on',     'Depended on by',  FALSE, 30),
  ('depended_on_by', 'depends_on',      'Depended on by', 'Depends on',      FALSE, 31),
  ('duplicates',     'duplicated_by',   'Duplicates',     'Duplicated by',   FALSE, 40),
  ('duplicated_by',  'duplicates',      'Duplicated by',  'Duplicates',      FALSE, 41),
  ('caused_by',      'causes',          'Caused by',      'Causes',          FALSE, 50),
  ('causes',         'caused_by',       'Causes',         'Caused by',       FALSE, 51),
  ('relates_to',     'relates_to',      'Relates to',     'Relates to',      TRUE,  60);

-- Self-referential FK (added after seed to avoid chicken-and-egg)
ALTER TABLE link_types
  ADD CONSTRAINT link_types_inverse_fk
  FOREIGN KEY (inverse_id) REFERENCES link_types(id) DEFERRABLE INITIALLY DEFERRED;

-- ── ticket_work_item_links — tickets → work items ─────────────

CREATE TABLE ticket_work_item_links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        NOT NULL REFERENCES tickets(id)    ON DELETE CASCADE,
  work_item_id UUID        NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  link_type    TEXT        NOT NULL REFERENCES link_types(id),
  is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
  note         TEXT,
  created_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT twil_unique      UNIQUE (ticket_id, work_item_id, link_type),
  CONSTRAINT twil_note_length CHECK  (note IS NULL OR length(note) <= 500)
);

CREATE UNIQUE INDEX twil_unique_primary
  ON ticket_work_item_links (ticket_id)
  WHERE is_primary = TRUE;

CREATE INDEX idx_twil_ticket_id    ON ticket_work_item_links (ticket_id);
CREATE INDEX idx_twil_work_item_id ON ticket_work_item_links (work_item_id);

-- ── work_item_links — work items → work items ─────────────────

CREATE TABLE work_item_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  UUID        NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  target_id  UUID        NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  link_type  TEXT        NOT NULL REFERENCES link_types(id),
  is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
  note       TEXT,
  created_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wil_no_self    CHECK  (source_id <> target_id),
  CONSTRAINT wil_unique     UNIQUE (source_id, target_id, link_type),
  CONSTRAINT wil_note_length CHECK (note IS NULL OR length(note) <= 500)
);

CREATE UNIQUE INDEX wil_unique_primary
  ON work_item_links (source_id)
  WHERE is_primary = TRUE;

CREATE INDEX idx_wil_source_id ON work_item_links (source_id);
CREATE INDEX idx_wil_target_id ON work_item_links (target_id);


-- ============================================================
-- 10. TEAM & PROJECT MEMBERSHIP TABLES (migration 034)
-- ============================================================

-- ── 10a. team_members — many-to-many users ↔ teams ──────────

CREATE TABLE team_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID        NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT team_members_unique_membership UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members (team_id);
CREATE INDEX idx_team_members_user_id ON team_members (user_id);

-- ── 10b. project_members — many-to-many users ↔ projects ────

CREATE TABLE project_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'developer' CHECK (role IN ('owner', 'developer', 'viewer')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT project_members_unique_membership UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members (project_id);
CREATE INDEX idx_project_members_user_id    ON project_members (user_id);

-- ── 10c. escalation_history — ticket support-level escalations ─

CREATE TABLE escalation_history (
  id                      UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id               UUID               NOT NULL REFERENCES tickets(id)  ON DELETE CASCADE,
  user_id                 UUID               REFERENCES profiles(id) ON DELETE SET NULL,
  from_support_level      support_level_enum,
  to_support_level        support_level_enum NOT NULL,
  from_team_id            UUID        REFERENCES teams(id) ON DELETE SET NULL,
  to_team_id              UUID        NOT NULL REFERENCES teams(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalation_history_ticket  ON escalation_history (ticket_id, created_at DESC);
CREATE INDEX idx_escalation_history_user    ON escalation_history (user_id);
CREATE INDEX idx_escalation_history_to_team ON escalation_history (to_team_id);

-- ── 10d. ticket_collaborators — secondary teams on a ticket ──

CREATE TABLE ticket_collaborators (
  id                 UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id          UUID               NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  team_id            UUID               NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  support_level      support_level_enum,
  added_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_collaborators_ticket ON ticket_collaborators (ticket_id, created_at DESC);
CREATE INDEX idx_ticket_collaborators_team   ON ticket_collaborators (team_id);


-- ============================================================
-- 10b. STORAGE BUCKETS
-- ============================================================

-- Ticket attachments (public read, auth write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760,   -- 10 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'text/plain','text/csv',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Knowledge-base documents (private, PDFs only, admin upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kb-documents',
  'kb-documents',
  false,
  52428800,   -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 11. TRIGGER FUNCTIONS
-- ============================================================

-- ── 11a. Auto-create profile on auth signup ──────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 11b. updated_at maintenance ──────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER teams_touch
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 11b-bis. Companies (CRM — migration 037) ─────────────────

CREATE TRIGGER companies_touch
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER company_contacts_touch
  BEFORE UPDATE ON company_contacts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Records every health_status_id change into company_health_history.
CREATE OR REPLACE FUNCTION log_company_health_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.health_status_id IS DISTINCT FROM OLD.health_status_id THEN
    INSERT INTO company_health_history (company_id, from_status_id, to_status_id, note, changed_by)
    VALUES (NEW.id, OLD.health_status_id, NEW.health_status_id, NEW.health_note, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER companies_health_history
  AFTER UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION log_company_health_change();


CREATE TRIGGER profiles_touch
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER tickets_touch
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER tasks_touch
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER ticket_comments_touch
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER integrations_touch
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER sla_policies_touch
  BEFORE UPDATE ON sla_policies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- KB
CREATE OR REPLACE FUNCTION kb_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER kb_collections_touch
  BEFORE UPDATE ON kb_collections
  FOR EACH ROW EXECUTE FUNCTION kb_touch_updated_at();

CREATE TRIGGER kb_documents_touch
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION kb_touch_updated_at();

CREATE TRIGGER kb_resolution_settings_touch
  BEFORE UPDATE ON kb_resolution_settings
  FOR EACH ROW EXECUTE FUNCTION kb_touch_updated_at();

CREATE TRIGGER kb_retrieval_config_touch
  BEFORE UPDATE ON kb_retrieval_config
  FOR EACH ROW EXECUTE FUNCTION kb_touch_updated_at();

-- Projects
CREATE OR REPLACE FUNCTION pm_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER projects_touch
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION pm_touch_updated_at();

CREATE TRIGGER sprints_touch
  BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION pm_touch_updated_at();

CREATE TRIGGER work_items_touch
  BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION pm_touch_updated_at();

CREATE TRIGGER work_item_comments_touch
  BEFORE UPDATE ON work_item_comments
  FOR EACH ROW EXECUTE FUNCTION pm_touch_updated_at();

-- ── 11c. Full-text search vector for tickets ─────────────────

CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')),       'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.client_name, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.client_email, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_update_search_vector
  BEFORE INSERT OR UPDATE OF title, description, client_name, client_email
  ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_search_vector();

-- ── 11d. Resolution plain-text sync ──────────────────────────

CREATE OR REPLACE FUNCTION strip_html_to_plain(html TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE v_text TEXT;
BEGIN
  IF html IS NULL THEN RETURN NULL; END IF;
  v_text := regexp_replace(html, '<[^>]+>', ' ', 'g');
  v_text := replace(v_text, '&nbsp;', ' ');
  v_text := replace(v_text, '&amp;',  '&');
  v_text := replace(v_text, '&lt;',   '<');
  v_text := replace(v_text, '&gt;',   '>');
  v_text := replace(v_text, '&quot;', '"');
  v_text := replace(v_text, '&#39;',  '''');
  v_text := regexp_replace(v_text, '\s+', ' ', 'g');
  v_text := btrim(v_text);
  RETURN NULLIF(v_text, '');
END;
$$;

CREATE OR REPLACE FUNCTION sync_resolution_plain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.resolution_plain := strip_html_to_plain(NEW.resolution);
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.resolution_plain, '') IS DISTINCT FROM COALESCE(NEW.resolution_plain, '') THEN
    NEW.resolution_embedding := NULL;  -- invalidate; edge function regenerates it
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_sync_resolution_plain
  BEFORE INSERT OR UPDATE OF resolution
  ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_resolution_plain();

-- ── 11e. Enforce resolution required on final status ─────────

CREATE OR REPLACE FUNCTION enforce_resolution_on_final_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE v_is_final BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status_id = NEW.status_id THEN
    RETURN NEW;
  END IF;
  SELECT is_final INTO v_is_final FROM ticket_statuses WHERE id = NEW.status_id;
  IF v_is_final IS TRUE
     AND (NEW.resolution IS NULL OR length(btrim(strip_html_to_plain(NEW.resolution))) = 0) THEN
    RAISE EXCEPTION
      'Resolution is required before marking a ticket resolved or closed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_enforce_resolution_on_final_status
  BEFORE INSERT OR UPDATE OF status_id, resolution
  ON tickets
  FOR EACH ROW EXECUTE FUNCTION enforce_resolution_on_final_status();

-- ── 11f. pg_net webhook: embed resolution via Edge Function ───
-- Reads URL + anon key from database settings set by the operator.
-- See the header of this file for how to configure them.

CREATE OR REPLACE FUNCTION request_resolution_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url      TEXT;
  v_anon_key TEXT;
BEGIN
  IF NEW.resolution_plain IS NULL OR length(NEW.resolution_plain) = 0 THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.resolution_plain, '') = COALESCE(NEW.resolution_plain, '') THEN
    RETURN NEW;
  END IF;

  v_url      := current_setting('app.supabase_url',     true);
  v_anon_key := current_setting('app.supabase_anon_key', true);

  IF v_url IS NULL OR v_anon_key IS NULL THEN
    -- Settings not configured — skip silently. Embeddings can be
    -- generated later by calling the Edge Function manually.
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/embed-resolution',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := jsonb_build_object('ticket_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_request_resolution_embedding
  AFTER INSERT OR UPDATE OF resolution
  ON tickets
  FOR EACH ROW EXECUTE FUNCTION request_resolution_embedding();

-- ── 11g. pg_net webhook: ingest document via Edge Function ────

CREATE OR REPLACE FUNCTION request_document_ingestion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url      TEXT;
  v_anon_key TEXT;
BEGIN
  IF NEW.status_id <> 1 THEN RETURN NEW; END IF;

  v_url      := current_setting('app.supabase_url',     true);
  v_anon_key := current_setting('app.supabase_anon_key', true);

  IF v_url IS NULL OR v_anon_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/ingest-document',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := jsonb_build_object('version_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER kb_document_versions_ingest_insert
  AFTER INSERT ON kb_document_versions
  FOR EACH ROW EXECUTE FUNCTION request_document_ingestion();

CREATE TRIGGER kb_document_versions_ingest_reprocess
  AFTER UPDATE OF status_id ON kb_document_versions
  FOR EACH ROW
  WHEN (NEW.status_id = 1 AND OLD.status_id <> 1)
  EXECUTE FUNCTION request_document_ingestion();

-- ── 11h. SLA: assign on ticket creation ──────────────────────

CREATE OR REPLACE FUNCTION assign_sla_on_ticket_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_policy sla_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_policy
  FROM sla_policies
  WHERE priority_id = NEW.priority_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO sla_instances (
      ticket_id, policy_id, response_due_at, resolution_due_at
    ) VALUES (
      NEW.id,
      v_policy.id,
      NEW.created_at + (v_policy.response_time_minutes  || ' minutes')::interval,
      NEW.created_at + (v_policy.resolution_time_minutes || ' minutes')::interval
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_sla_on_ticket_insert
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION assign_sla_on_ticket_insert();

-- ── 11i. SLA: pause/resume/reset on ticket update ────────────
-- Status IDs: pending_customer=2, resolved=5, closed=6

CREATE OR REPLACE FUNCTION manage_sla_on_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy     sla_policies%ROWTYPE;
  v_instance   sla_instances%ROWTYPE;
  v_pause_mins INTEGER;
  v_now        TIMESTAMPTZ := now();
BEGIN
  IF OLD.priority_id = NEW.priority_id AND OLD.status_id = NEW.status_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_instance FROM sla_instances WHERE ticket_id = NEW.id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Priority changed → replace SLA instance (reset from now)
  IF OLD.priority_id <> NEW.priority_id THEN
    SELECT * INTO v_policy
    FROM sla_policies
    WHERE priority_id = NEW.priority_id AND is_active = true LIMIT 1;
    IF FOUND THEN
      DELETE FROM sla_instances WHERE ticket_id = NEW.id;
      INSERT INTO sla_instances (ticket_id, policy_id, response_due_at, resolution_due_at)
      VALUES (
        NEW.id, v_policy.id,
        v_now + (v_policy.response_time_minutes  || ' minutes')::interval,
        v_now + (v_policy.resolution_time_minutes || ' minutes')::interval
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Status changed
  IF OLD.status_id <> NEW.status_id THEN
    IF NEW.status_id = 2 AND v_instance.paused_at IS NULL THEN
      -- Entering pending_customer → pause
      UPDATE sla_instances SET paused_at = v_now, updated_at = v_now
      WHERE ticket_id = NEW.id;

    ELSIF OLD.status_id = 2 AND NEW.status_id <> 2
          AND v_instance.paused_at IS NOT NULL THEN
      -- Leaving pending_customer → resume
      v_pause_mins := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_instance.paused_at))::integer / 60);
      IF NEW.status_id IN (5, 6) THEN
        UPDATE sla_instances SET
          paused_at = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          updated_at = v_now
        WHERE ticket_id = NEW.id;
      ELSE
        UPDATE sla_instances SET
          paused_at            = NULL,
          total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
          response_due_at      = v_instance.response_due_at + (v_pause_mins || ' minutes')::interval,
          resolution_due_at    = v_instance.resolution_due_at + (v_pause_mins || ' minutes')::interval,
          updated_at           = v_now
        WHERE ticket_id = NEW.id;
      END IF;

    ELSIF NEW.status_id IN (5, 6) AND v_instance.paused_at IS NOT NULL THEN
      -- Resolved/closed while still paused (safety net)
      v_pause_mins := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_instance.paused_at))::integer / 60);
      UPDATE sla_instances SET
        paused_at            = NULL,
        total_paused_minutes = v_instance.total_paused_minutes + v_pause_mins,
        updated_at           = v_now
      WHERE ticket_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER manage_sla_on_ticket_update
  AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION manage_sla_on_ticket_update();

-- ── 11j. SLA: mark responded on first agent comment ──────────

CREATE OR REPLACE FUNCTION mark_sla_response_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_commenter_role TEXT;
BEGIN
  IF NEW.is_internal THEN RETURN NEW; END IF;
  SELECT role INTO v_commenter_role FROM profiles WHERE id = NEW.user_id;
  IF v_commenter_role IN ('admin', 'support_lead', 'support_member') THEN
    UPDATE sla_instances
    SET responded_at = NEW.created_at, updated_at = now()
    WHERE ticket_id = NEW.ticket_id AND responded_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_sla_response_on_comment
  AFTER INSERT ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION mark_sla_response_on_comment();

-- ── 11k. Ticket history: field changes ───────────────────────

CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_old_label TEXT;
  v_new_label TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, source_table)
    VALUES (NEW.id, v_user_id, 'ticket_created', 'tickets');
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'title', OLD.title, NEW.title, 'tickets');
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'description', OLD.description, NEW.description, 'tickets');
  END IF;

  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    SELECT name INTO v_old_label FROM ticket_statuses WHERE id = OLD.status_id;
    SELECT name INTO v_new_label FROM ticket_statuses WHERE id = NEW.status_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'status', v_old_label, v_new_label, 'tickets');
  END IF;

  IF NEW.priority_id IS DISTINCT FROM OLD.priority_id THEN
    SELECT name INTO v_old_label FROM ticket_priorities WHERE id = OLD.priority_id;
    SELECT name INTO v_new_label FROM ticket_priorities WHERE id = NEW.priority_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'priority', v_old_label, v_new_label, 'tickets');
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    SELECT full_name INTO v_old_label FROM profiles WHERE id = OLD.assigned_to;
    SELECT full_name INTO v_new_label FROM profiles WHERE id = NEW.assigned_to;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table, metadata)
    VALUES (
      NEW.id, v_user_id, 'field_changed', 'assigned_to',
      OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, 'tickets',
      jsonb_build_object('old_label', v_old_label, 'new_label', v_new_label)
    );
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    SELECT name INTO v_old_label FROM teams WHERE id = OLD.team_id;
    SELECT name INTO v_new_label FROM teams WHERE id = NEW.team_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table, metadata)
    VALUES (
      NEW.id, v_user_id, 'field_changed', 'team_id',
      OLD.team_id::TEXT, NEW.team_id::TEXT, 'tickets',
      jsonb_build_object('old_label', v_old_label, 'new_label', v_new_label)
    );
  END IF;

  IF NEW.support_level_id IS DISTINCT FROM OLD.support_level_id THEN
    SELECT name INTO v_old_label FROM ticket_support_levels WHERE id = OLD.support_level_id;
    SELECT name INTO v_new_label FROM ticket_support_levels WHERE id = NEW.support_level_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'support_level', v_old_label, v_new_label, 'tickets');
  END IF;

  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    SELECT name INTO v_old_label FROM ticket_categories WHERE id = OLD.category_id;
    SELECT name INTO v_new_label FROM ticket_categories WHERE id = NEW.category_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'category', v_old_label, v_new_label, 'tickets');
  END IF;

  IF NEW.temperature_id IS DISTINCT FROM OLD.temperature_id THEN
    SELECT name INTO v_old_label FROM ticket_temperatures WHERE id = OLD.temperature_id;
    SELECT name INTO v_new_label FROM ticket_temperatures WHERE id = NEW.temperature_id;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'client_temperature', v_old_label, v_new_label, 'tickets');
  END IF;

  IF NEW.cc_email IS DISTINCT FROM OLD.cc_email THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value, source_table)
    VALUES (NEW.id, v_user_id, 'field_changed', 'cc_email', OLD.cc_email, NEW.cc_email, 'tickets');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_log_history
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();

-- ── 11l. Ticket history: task activity ───────────────────────

CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_id IS NULL THEN RETURN NEW; END IF;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, source_table, source_id, metadata)
    VALUES (
      NEW.ticket_id, v_user_id, 'task_added', 'task', 'tasks', NEW.id,
      jsonb_build_object('task_title', NEW.title, 'task_priority', NEW.priority, 'task_due_date', NEW.due_date::TEXT)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.ticket_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
      INSERT INTO ticket_history (ticket_id, user_id, action, field_name, source_table, source_id, metadata)
      VALUES (
        NEW.ticket_id, v_user_id, 'task_completed', 'task', 'tasks', NEW.id,
        jsonb_build_object('task_title', NEW.title, 'task_priority', NEW.priority, 'task_due_date', NEW.due_date::TEXT)
      );
    ELSE
      INSERT INTO ticket_history (ticket_id, user_id, action, field_name, source_table, source_id, metadata)
      VALUES (
        NEW.ticket_id, v_user_id, 'task_edited', 'task', 'tasks', NEW.id,
        jsonb_build_object(
          'task_title', NEW.title, 'task_priority', NEW.priority, 'task_due_date', NEW.due_date::TEXT,
          'old_task_title', OLD.title, 'old_task_priority', OLD.priority
        )
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.ticket_id IS NULL THEN RETURN OLD; END IF;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, source_table, source_id, metadata)
    VALUES (
      OLD.ticket_id, v_user_id, 'task_removed', 'task', 'tasks', OLD.id,
      jsonb_build_object('task_title', OLD.title, 'task_priority', OLD.priority, 'task_due_date', OLD.due_date::TEXT)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tasks_log_history
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- ── 11m. Work item: atomic key generation ────────────────────

CREATE OR REPLACE FUNCTION generate_work_item_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_key    TEXT;
  v_number INT;
BEGIN
  IF NEW.item_key IS NOT NULL AND length(NEW.item_key) > 0 THEN RETURN NEW; END IF;
  UPDATE projects
     SET next_item_number = next_item_number + 1
   WHERE id = NEW.project_id
  RETURNING key, next_item_number - 1 INTO v_key, v_number;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'project % not found while generating work item key', NEW.project_id;
  END IF;
  NEW.item_key := v_key || '-' || v_number::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_items_generate_key
  BEFORE INSERT ON work_items
  FOR EACH ROW EXECUTE FUNCTION generate_work_item_key();

-- ── 11n. Work item history ────────────────────────────────────

CREATE OR REPLACE FUNCTION log_work_item_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO work_item_history (work_item_id, user_id, action, metadata, changes)
    VALUES (NEW.id, v_actor, 'created',
      jsonb_build_object('item_key', NEW.item_key, 'title', NEW.title, 'type', NEW.type,
                         'status', NEW.status, 'priority_id', NEW.priority_id),
      jsonb_build_object('event', 'created', 'item_key', NEW.item_key, 'title', NEW.title,
                         'type', NEW.type));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'status', OLD.status::TEXT, NEW.status::TEXT,
              jsonb_build_object('field', 'status', 'old', OLD.status, 'new', NEW.status));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT,
              jsonb_build_object('field', 'assigned_to', 'old', OLD.assigned_to, 'new', NEW.assigned_to));
    END IF;
    IF NEW.priority_id IS DISTINCT FROM OLD.priority_id THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'priority_id', OLD.priority_id::TEXT, NEW.priority_id::TEXT,
              jsonb_build_object('field', 'priority_id', 'old', OLD.priority_id, 'new', NEW.priority_id));
    END IF;
    IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'sprint_id', OLD.sprint_id::TEXT, NEW.sprint_id::TEXT,
              jsonb_build_object('field', 'sprint_id', 'old', OLD.sprint_id, 'new', NEW.sprint_id));
    END IF;
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'title', OLD.title, NEW.title,
              jsonb_build_object('field', 'title', 'old', OLD.title, 'new', NEW.title));
    END IF;
    IF NEW.story_points IS DISTINCT FROM OLD.story_points THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'story_points', OLD.story_points::TEXT, NEW.story_points::TEXT,
              jsonb_build_object('field', 'story_points', 'old', OLD.story_points, 'new', NEW.story_points));
    END IF;
    IF NEW.type IS DISTINCT FROM OLD.type THEN
      INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value, new_value, changes)
      VALUES (NEW.id, v_actor, 'updated', 'type', OLD.type::TEXT, NEW.type::TEXT,
              jsonb_build_object('field', 'type', 'old', OLD.type, 'new', NEW.type));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER work_items_history_insert
  AFTER INSERT ON work_items
  FOR EACH ROW EXECUTE FUNCTION log_work_item_history();

CREATE TRIGGER work_items_history_update
  AFTER UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION log_work_item_history();

-- ── 11o. Item links → ticket_history + work_item_history ─────

CREATE OR REPLACE FUNCTION log_twil_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor       UUID := auth.uid();
  v_wi          RECORD;
  v_lt_label    TEXT;
  v_tkt         RECORD;
  v_target_meta JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT item_key, title, type INTO v_wi FROM work_items WHERE id = NEW.work_item_id;
    SELECT label INTO v_lt_label FROM link_types WHERE id = NEW.link_type;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value,
      source_table, source_id, metadata, changes)
    VALUES (
      NEW.ticket_id, v_actor, 'link_added', 'scrum_link', NULL,
      format('%s %s: %s', v_lt_label, v_wi.item_key, v_wi.title),
      'work_items', NEW.work_item_id,
      jsonb_build_object('item_key', v_wi.item_key, 'title', v_wi.title, 'type', v_wi.type,
        'link_type', NEW.link_type, 'is_primary', NEW.is_primary),
      jsonb_build_object('event', 'linked', 'item_key', v_wi.item_key, 'link_type', NEW.link_type)
    );
    SELECT ticket_number, title INTO v_tkt FROM tickets WHERE id = NEW.ticket_id;
    v_target_meta := jsonb_build_object(
      'source_kind', 'ticket', 'ticket_id', NEW.ticket_id,
      'ticket_number', v_tkt.ticket_number, 'ticket_title', v_tkt.title,
      'link_type', NEW.link_type);
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, new_value,
      source_table, source_id, metadata, changes)
    VALUES (NEW.work_item_id, v_actor, 'link_added', 'link', NEW.link_type,
      'tickets', NEW.ticket_id, v_target_meta,
      jsonb_build_object('event', 'linked', 'ticket_id', NEW.ticket_id,
        'ticket_number', v_tkt.ticket_number, 'link_type', NEW.link_type));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_primary IS DISTINCT FROM OLD.is_primary THEN
      SELECT item_key, title INTO v_wi FROM work_items WHERE id = NEW.work_item_id;
      INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value,
        source_table, source_id, metadata, changes)
      VALUES (
        NEW.ticket_id, v_actor, 'link_primary_changed', 'scrum_link',
        OLD.is_primary::TEXT, NEW.is_primary::TEXT, 'work_items', NEW.work_item_id,
        jsonb_build_object('item_key', v_wi.item_key, 'title', v_wi.title,
          'link_type', NEW.link_type, 'is_primary', NEW.is_primary),
        jsonb_build_object('event', 'primary_changed', 'item_key', v_wi.item_key,
          'is_primary', NEW.is_primary)
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT item_key, title, type INTO v_wi FROM work_items WHERE id = OLD.work_item_id;
    SELECT label INTO v_lt_label FROM link_types WHERE id = OLD.link_type;
    INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value,
      source_table, source_id, metadata, changes)
    VALUES (
      OLD.ticket_id, v_actor, 'link_removed', 'scrum_link',
      format('%s %s: %s', COALESCE(v_lt_label, OLD.link_type),
        COALESCE(v_wi.item_key, '?'), COALESCE(v_wi.title, '?')),
      NULL, 'work_items', OLD.work_item_id,
      jsonb_build_object('item_key', v_wi.item_key, 'title', v_wi.title, 'link_type', OLD.link_type),
      jsonb_build_object('event', 'unlinked', 'item_key', v_wi.item_key, 'link_type', OLD.link_type)
    );
    SELECT ticket_number, title INTO v_tkt FROM tickets WHERE id = OLD.ticket_id;
    v_target_meta := jsonb_build_object(
      'source_kind', 'ticket', 'ticket_id', OLD.ticket_id,
      'ticket_number', v_tkt.ticket_number, 'link_type', OLD.link_type);
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value,
      source_table, source_id, metadata, changes)
    VALUES (OLD.work_item_id, v_actor, 'link_removed', 'link', OLD.link_type,
      'tickets', OLD.ticket_id, v_target_meta,
      jsonb_build_object('event', 'unlinked', 'ticket_id', OLD.ticket_id,
        'ticket_number', v_tkt.ticket_number, 'link_type', OLD.link_type));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER twil_ticket_history
  AFTER INSERT OR UPDATE OR DELETE ON ticket_work_item_links
  FOR EACH ROW EXECUTE FUNCTION log_twil_history();

CREATE OR REPLACE FUNCTION log_wil_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor       UUID := auth.uid();
  v_source_wi   RECORD;
  v_target_wi   RECORD;
  v_source_meta JSONB;
  v_target_meta JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT item_key, title, type INTO v_source_wi FROM work_items WHERE id = NEW.source_id;
    SELECT item_key, title, type INTO v_target_wi FROM work_items WHERE id = NEW.target_id;
    v_target_meta := jsonb_build_object(
      'source_kind', 'work_item', 'work_item_id', NEW.source_id,
      'item_key', v_source_wi.item_key, 'title', v_source_wi.title,
      'type', v_source_wi.type, 'link_type', NEW.link_type);
    v_source_meta := jsonb_build_object(
      'target_kind', 'work_item', 'work_item_id', NEW.target_id,
      'item_key', v_target_wi.item_key, 'title', v_target_wi.title,
      'type', v_target_wi.type, 'link_type', NEW.link_type);
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, new_value,
      source_table, source_id, metadata, changes)
    VALUES (NEW.target_id, v_actor, 'link_added', 'link', NEW.link_type,
      'work_items', NEW.source_id, v_target_meta,
      jsonb_build_object('event', 'linked', 'source_id', NEW.source_id,
        'item_key', v_source_wi.item_key, 'link_type', NEW.link_type));
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, new_value,
      source_table, source_id, metadata, changes)
    VALUES (NEW.source_id, v_actor, 'link_added', 'link', NEW.link_type,
      'work_items', NEW.target_id, v_source_meta,
      jsonb_build_object('event', 'linked', 'target_id', NEW.target_id,
        'item_key', v_target_wi.item_key, 'link_type', NEW.link_type));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT item_key, title, type INTO v_source_wi FROM work_items WHERE id = OLD.source_id;
    SELECT item_key, title, type INTO v_target_wi FROM work_items WHERE id = OLD.target_id;
    v_target_meta := jsonb_build_object(
      'source_kind', 'work_item', 'work_item_id', OLD.source_id,
      'item_key', v_source_wi.item_key, 'link_type', OLD.link_type);
    v_source_meta := jsonb_build_object(
      'target_kind', 'work_item', 'work_item_id', OLD.target_id,
      'item_key', v_target_wi.item_key, 'link_type', OLD.link_type);
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value,
      source_table, source_id, metadata, changes)
    VALUES (OLD.target_id, v_actor, 'link_removed', 'link', OLD.link_type,
      'work_items', OLD.source_id, v_target_meta,
      jsonb_build_object('event', 'unlinked', 'source_id', OLD.source_id,
        'item_key', v_source_wi.item_key, 'link_type', OLD.link_type));
    INSERT INTO work_item_history (work_item_id, user_id, action, field_name, old_value,
      source_table, source_id, metadata, changes)
    VALUES (OLD.source_id, v_actor, 'link_removed', 'link', OLD.link_type,
      'work_items', OLD.target_id, v_source_meta,
      jsonb_build_object('event', 'unlinked', 'target_id', OLD.target_id,
        'item_key', v_target_wi.item_key, 'link_type', OLD.link_type));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER wil_work_item_history
  AFTER INSERT OR DELETE ON work_item_links
  FOR EACH ROW EXECUTE FUNCTION log_wil_history();


-- ── 11p. Security: prevent role self-elevation ───────────────
-- Blocks any non-admin authenticated session from changing the
-- `role` column on any profiles row. This is defense-in-depth on
-- top of the API-layer field check in the PATCH /users/:id route.
--
-- Why a trigger and not column-level REVOKE?
--   Column privileges interact awkwardly with Supabase's
--   anon/authenticated role hierarchy and would conflict with
--   the profiles_admin_update RLS policy. A trigger is more
--   explicit and auditable.
--
-- Why SECURITY DEFINER?
--   The function does a SELECT on profiles to determine the
--   caller's role. SECURITY DEFINER ensures this lookup always
--   succeeds regardless of the calling session's RLS context.
--
-- Introduced in migration 033 and back-ported to this baseline
-- so fresh installations are secure from the first run.

CREATE OR REPLACE FUNCTION prevent_role_self_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid;
  v_caller_role user_role;
BEGIN
  -- auth.uid() returns the JWT subject of the authenticated session.
  -- Under service_role it is NULL — allow all service_role operations.
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Short-circuit: role column is not actually changing.
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Look up the *caller's* current role.
  -- SECURITY DEFINER ensures this SELECT always succeeds.
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = v_caller_id;

  -- Admins may change any role on any row.
  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admin is attempting a role change — block it.
  RAISE EXCEPTION
    'security_violation: role changes require admin privileges (caller: %, target: %)',
    v_caller_id, NEW.id
  USING ERRCODE = 'insufficient_privilege';

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prevent_role_self_elevation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_elevation();

COMMENT ON FUNCTION prevent_role_self_elevation() IS
  'SECURITY DEFINER trigger: blocks non-admin authenticated users from '
  'changing the role column on any profiles row. Admin callers and '
  'service_role sessions (NULL auth.uid) are allowed through.';


-- ============================================================
-- 12. STORED PROCEDURES / RPC FUNCTIONS
-- ============================================================

-- ── 12a. RBAC helpers for projects ───────────────────────────

CREATE OR REPLACE FUNCTION pm_can_read_project(p_project_id UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM projects pr, profiles pf
     WHERE pr.id = p_project_id
       AND pf.id = p_user
       AND pf.role <> 'client'
       AND (
         pf.role IN ('admin','support_lead')
         OR pr.lead_id = pf.id
         OR pr.team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.user_id = p_user)
       )
  );
$$;

CREATE OR REPLACE FUNCTION pm_can_write_project(p_project_id UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM projects pr, profiles pf
     WHERE pr.id = p_project_id
       AND pf.id = p_user
       AND pf.role <> 'client'
       AND (
         pf.role IN ('admin','support_lead')
         OR pr.lead_id = pf.id
         OR pr.team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.user_id = p_user)
       )
  );
$$;

-- ── 12b. Atomic "set primary link" ───────────────────────────

CREATE OR REPLACE FUNCTION set_primary_item_link(p_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_ticket_id UUID;
  v_source_id  UUID;
BEGIN
  SELECT ticket_id INTO v_ticket_id FROM ticket_work_item_links WHERE id = p_link_id;
  IF FOUND THEN
    UPDATE ticket_work_item_links SET is_primary = FALSE
     WHERE ticket_id = v_ticket_id AND is_primary AND id <> p_link_id;
    UPDATE ticket_work_item_links SET is_primary = TRUE WHERE id = p_link_id;
    RETURN;
  END IF;
  SELECT source_id INTO v_source_id FROM work_item_links WHERE id = p_link_id;
  IF FOUND THEN
    UPDATE work_item_links SET is_primary = FALSE
     WHERE source_id = v_source_id AND is_primary AND id <> p_link_id;
    UPDATE work_item_links SET is_primary = TRUE WHERE id = p_link_id;
    RETURN;
  END IF;
  RAISE EXCEPTION 'link % not found', p_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_primary_item_link(UUID) TO authenticated;

-- ── 12d. Semantic search: ticket resolutions ──────────────────

CREATE OR REPLACE FUNCTION match_resolutions(
  query_embedding   VECTOR(768),
  match_count       INT  DEFAULT 5,
  exclude_ticket_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, ticket_number INT, title TEXT, resolution TEXT, similarity REAL)
LANGUAGE SQL STABLE SECURITY INVOKER AS $$
  SELECT
    t.id, t.ticket_number, t.title, t.resolution,
    1 - (t.resolution_embedding <=> query_embedding) AS similarity
  FROM tickets t
  JOIN ticket_statuses s ON s.id = t.status_id
  WHERE t.resolution_embedding IS NOT NULL
    AND s.is_final = TRUE
    AND (exclude_ticket_id IS NULL OR t.id <> exclude_ticket_id)
  ORDER BY t.resolution_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── 12e. Unified knowledge retrieval (resolutions + KB docs) ──

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding  VECTOR(768),
  match_threshold  NUMERIC DEFAULT NULL,
  match_count      INT     DEFAULT NULL
)
RETURNS TABLE (
  source_type TEXT, source_id UUID, chunk_id UUID,
  title TEXT, snippet TEXT, similarity NUMERIC, metadata JSONB
)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  cfg         RECORD;
  v_threshold NUMERIC;
  v_count     INT;
  v_w_res     NUMERIC;
  v_w_doc     NUMERIC;
  v_en_res    BOOLEAN;
  v_en_doc    BOOLEAN;
BEGIN
  SELECT * INTO cfg FROM kb_retrieval_config WHERE environment = 'production';
  v_threshold := COALESCE(match_threshold, cfg.similarity_threshold);
  v_count     := COALESCE(match_count,     cfg.max_results);
  v_w_res     := COALESCE((cfg.source_weights  ->> 'resolution')::NUMERIC, 1.0);
  v_w_doc     := COALESCE((cfg.source_weights  ->> 'document')::NUMERIC,   1.0);
  v_en_res    := COALESCE((cfg.sources_enabled ->> 'resolution')::BOOLEAN, true);
  v_en_doc    := COALESCE((cfg.sources_enabled ->> 'document')::BOOLEAN,   true);

  RETURN QUERY
  WITH res AS (
    SELECT
      'resolution'::TEXT                                                        AS source_type,
      t.id                                                                      AS source_id,
      NULL::UUID                                                                AS chunk_id,
      t.title                                                                   AS title,
      LEFT(COALESCE(t.resolution_plain, ''), 400)                              AS snippet,
      ((1 - (t.resolution_embedding <=> query_embedding))::NUMERIC * v_w_res)  AS similarity,
      jsonb_build_object('ticket_number', t.ticket_number)                     AS metadata
    FROM tickets t
    LEFT JOIN kb_resolution_settings s ON s.ticket_id = t.id
    WHERE v_en_res
      AND t.resolution_embedding IS NOT NULL
      AND COALESCE(s.ai_retrieval_enabled, true) = true
      AND s.archived_at IS NULL
  ),
  docs AS (
    SELECT
      'document'::TEXT                                                         AS source_type,
      d.id                                                                     AS source_id,
      c.id                                                                     AS chunk_id,
      d.title                                                                  AS title,
      LEFT(c.content, 400)                                                     AS snippet,
      ((1 - (c.embedding <=> query_embedding))::NUMERIC * v_w_doc)            AS similarity,
      jsonb_build_object('page', c.page_number, 'chunk_index', c.chunk_index, 'document_id', d.id) AS metadata
    FROM kb_document_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE v_en_doc
      AND c.embedding IS NOT NULL
      AND d.ai_retrieval_enabled
      AND d.archived_at IS NULL
      AND d.current_version_id = c.document_version_id
  )
  SELECT * FROM (SELECT * FROM res UNION ALL SELECT * FROM docs) merged
  WHERE merged.similarity >= v_threshold
  ORDER BY merged.similarity DESC
  LIMIT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_knowledge(VECTOR(768), NUMERIC, INT) TO authenticated;


-- ============================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================

-- ── Teams ────────────────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_read_authenticated"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "teams_admin_write"
  ON teams FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ── Companies (CRM — migration 037) ──────────────────────────
ALTER TABLE company_health_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_health_history  ENABLE ROW LEVEL SECURITY;

-- company_health_statuses: readable by any authenticated user.
CREATE POLICY "company_health_statuses_read" ON company_health_statuses FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "company_health_statuses_service" ON company_health_statuses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- companies: read = support_or_admin; write = admin only.
CREATE POLICY "companies_read" ON companies FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated
  USING (is_support_or_admin(auth.uid()))
  WITH CHECK (is_support_or_admin(auth.uid()));
CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "companies_service" ON companies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- company_contacts: read + write = support_or_admin.
CREATE POLICY "company_contacts_read" ON company_contacts FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));
CREATE POLICY "company_contacts_write" ON company_contacts FOR ALL TO authenticated
  USING (is_support_or_admin(auth.uid()))
  WITH CHECK (is_support_or_admin(auth.uid()));
CREATE POLICY "company_contacts_service" ON company_contacts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- company_health_history: read + write = support_or_admin (rows written by the trigger).
CREATE POLICY "company_health_history_read" ON company_health_history FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));
CREATE POLICY "company_health_history_write" ON company_health_history FOR ALL TO authenticated
  USING (is_support_or_admin(auth.uid()))
  WITH CHECK (is_support_or_admin(auth.uid()));
CREATE POLICY "company_health_history_service" ON company_health_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Profiles ─────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "profiles_service"
  ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Tickets ──────────────────────────────────────────────────
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Support staff see all; clients see only their own
CREATE POLICY "tickets_read"
  ON tickets FOR SELECT TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY "tickets_insert"
  ON tickets FOR INSERT TO authenticated
  WITH CHECK (
    is_support_or_admin(auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "tickets_update"
  ON tickets FOR UPDATE TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY "tickets_delete"
  ON tickets FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "tickets_service"
  ON tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Tags + ticket_tags ───────────────────────────────────────
ALTER TABLE tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_read_authenticated"
  ON tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "tags_admin_write"
  ON tags FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "ticket_tags_read_authenticated"
  ON ticket_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_tags_write_support"
  ON ticket_tags FOR ALL TO authenticated
  USING (is_support_or_admin(auth.uid()))
  WITH CHECK (is_support_or_admin(auth.uid()));

-- ── Tasks ────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_read"
  ON tasks FOR SELECT TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    is_support_or_admin(auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_service"
  ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Ticket comments ──────────────────────────────────────────
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Non-internal comments: all who can read the ticket
-- Internal (is_internal=true): support staff only
CREATE POLICY "ticket_comments_read"
  ON ticket_comments FOR SELECT TO authenticated
  USING (
    (NOT is_internal AND (
      is_support_or_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND (created_by = auth.uid() OR assigned_to = auth.uid()))
    ))
    OR (is_internal AND is_support_or_admin(auth.uid()))
  );

CREATE POLICY "ticket_comments_insert"
  ON ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      is_support_or_admin(auth.uid())
      OR (NOT is_internal AND EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND created_by = auth.uid()))
    )
  );

CREATE POLICY "ticket_comments_update"
  ON ticket_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ticket_comments_delete"
  ON ticket_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "ticket_comments_service"
  ON ticket_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Ticket history (read-only for app; trigger writes) ────────
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_history_read"
  ON ticket_history FOR SELECT TO authenticated
  USING (
    is_support_or_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND (created_by = auth.uid() OR assigned_to = auth.uid()))
  );

CREATE POLICY "ticket_history_service"
  ON ticket_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Integrations ─────────────────────────────────────────────
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_read_support"
  ON integrations FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));

CREATE POLICY "integrations_write_admin"
  ON integrations FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ── SLA ──────────────────────────────────────────────────────
ALTER TABLE sla_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_policies_read_authenticated"
  ON sla_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "sla_policies_admin_write"
  ON sla_policies FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "sla_instances_read_authenticated"
  ON sla_instances FOR SELECT TO authenticated USING (true);

CREATE POLICY "sla_instances_service"
  ON sla_instances FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Ticket lookup tables ──────────────────────────────────────
ALTER TABLE ticket_statuses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_priorities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_support_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_temperatures   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_statuses_read_authenticated"
  ON ticket_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_statuses_admin_write"
  ON ticket_statuses FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "ticket_priorities_read_authenticated"
  ON ticket_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_priorities_admin_write"
  ON ticket_priorities FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "ticket_categories_read_authenticated"
  ON ticket_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_categories_admin_write"
  ON ticket_categories FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "ticket_support_levels_read_authenticated"
  ON ticket_support_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_temperatures_read_authenticated"
  ON ticket_temperatures FOR SELECT TO authenticated USING (true);

-- ── KB tables ─────────────────────────────────────────────────
ALTER TABLE kb_source_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_statuses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_collections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_chunks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_resolution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_retrieval_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_retrieval_log       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_source_types_read"     ON kb_source_types     FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_document_statuses_read" ON kb_document_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "kb_collections_read"    ON kb_collections FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_collections_write"   ON kb_collections FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_collections_service" ON kb_collections FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_tags_read"    ON kb_tags FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_tags_write"   ON kb_tags FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_tags_service" ON kb_tags FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_documents_read"    ON kb_documents FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_documents_write"   ON kb_documents FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_documents_service" ON kb_documents FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_document_versions_read"    ON kb_document_versions FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_document_versions_write"   ON kb_document_versions FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_document_versions_service" ON kb_document_versions FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_document_tags_read"    ON kb_document_tags FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_document_tags_write"   ON kb_document_tags FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_document_tags_service" ON kb_document_tags FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_document_chunks_read"    ON kb_document_chunks FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_document_chunks_write"   ON kb_document_chunks FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_document_chunks_service" ON kb_document_chunks FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_resolution_settings_read"    ON kb_resolution_settings FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_resolution_settings_write"   ON kb_resolution_settings FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_resolution_settings_service" ON kb_resolution_settings FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_retrieval_config_read"    ON kb_retrieval_config FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_retrieval_config_write"   ON kb_retrieval_config FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_retrieval_config_service" ON kb_retrieval_config FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_audit_log_read"         ON kb_audit_log FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "kb_audit_log_admin_insert" ON kb_audit_log FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "kb_audit_log_service"      ON kb_audit_log FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "kb_retrieval_log_read"    ON kb_retrieval_log FOR SELECT TO authenticated USING (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_retrieval_log_insert"  ON kb_retrieval_log FOR INSERT TO authenticated WITH CHECK (is_support_or_admin(auth.uid()));
CREATE POLICY "kb_retrieval_log_service" ON kb_retrieval_log FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- ── Storage policies ─────────────────────────────────────────
-- ticket-attachments: any authenticated user can read; support+ can write
CREATE POLICY "ticket_attachments_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND is_support_or_admin(auth.uid()));

CREATE POLICY "ticket_attachments_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND is_support_or_admin(auth.uid()));

-- kb-documents: support+ read; admin write
CREATE POLICY "kb_docs_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-documents' AND is_support_or_admin(auth.uid()));

CREATE POLICY "kb_docs_storage_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-documents' AND is_admin(auth.uid()));

CREATE POLICY "kb_docs_storage_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'kb-documents' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'kb-documents' AND is_admin(auth.uid()));

CREATE POLICY "kb_docs_storage_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kb-documents' AND is_admin(auth.uid()));

-- ── Projects / Scrum ─────────────────────────────────────────
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints            ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_history  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_read"   ON projects FOR SELECT TO authenticated USING (pm_can_read_project(id, auth.uid()));
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles pf WHERE pf.id = auth.uid() AND pf.role <> 'client'
      AND (pf.role IN ('admin','support_lead')
           OR (projects.lead_id IS NOT NULL AND projects.lead_id = pf.id)
           OR (projects.team_id IS NOT NULL AND projects.team_id IN (
                 SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
               )))
  ));
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (pm_can_write_project(id, auth.uid())) WITH CHECK (pm_can_write_project(id, auth.uid()));
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "projects_service" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "sprints_read"    ON sprints FOR SELECT TO authenticated USING (pm_can_read_project(project_id, auth.uid()));
CREATE POLICY "sprints_write"   ON sprints FOR ALL    TO authenticated
  USING (pm_can_write_project(project_id, auth.uid())) WITH CHECK (pm_can_write_project(project_id, auth.uid()));
CREATE POLICY "sprints_service" ON sprints FOR ALL    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "work_items_read"    ON work_items FOR SELECT TO authenticated USING (pm_can_read_project(project_id, auth.uid()));
CREATE POLICY "work_items_write"   ON work_items FOR ALL    TO authenticated
  USING (pm_can_write_project(project_id, auth.uid())) WITH CHECK (pm_can_write_project(project_id, auth.uid()));
CREATE POLICY "work_items_service" ON work_items FOR ALL    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "work_item_comments_read" ON work_item_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = work_item_comments.work_item_id AND pm_can_read_project(wi.project_id, auth.uid())));
CREATE POLICY "work_item_comments_insert" ON work_item_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = work_item_comments.work_item_id AND pm_can_write_project(wi.project_id, auth.uid())));
CREATE POLICY "work_item_comments_update" ON work_item_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "work_item_comments_delete" ON work_item_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "work_item_comments_service" ON work_item_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "work_item_history_read" ON work_item_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = work_item_history.work_item_id AND pm_can_read_project(wi.project_id, auth.uid())));
CREATE POLICY "work_item_history_service" ON work_item_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Item links ────────────────────────────────────────────────
ALTER TABLE link_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_work_item_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_links          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_types_read"    ON link_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "link_types_service" ON link_types FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY "twil_read" ON ticket_work_item_links FOR SELECT TO authenticated
  USING (
    pm_can_read_project((SELECT project_id FROM work_items WHERE id = work_item_id), auth.uid())
    AND EXISTS (
      SELECT 1 FROM tickets t JOIN profiles pf ON pf.id = auth.uid()
       WHERE t.id = ticket_id
         AND (pf.role IN ('admin','support_lead','support_member')
              OR t.created_by = auth.uid()
              OR t.assigned_to = auth.uid())
    )
  );
CREATE POLICY "twil_insert" ON ticket_work_item_links FOR INSERT TO authenticated
  WITH CHECK (
    pm_can_write_project((SELECT project_id FROM work_items WHERE id = work_item_id), auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                  AND role IN ('admin','support_lead','support_member'))
  );
CREATE POLICY "twil_update" ON ticket_work_item_links FOR UPDATE TO authenticated
  USING  (pm_can_write_project((SELECT project_id FROM work_items WHERE id = work_item_id), auth.uid()))
  WITH CHECK (pm_can_write_project((SELECT project_id FROM work_items WHERE id = work_item_id), auth.uid()));
CREATE POLICY "twil_delete" ON ticket_work_item_links FOR DELETE TO authenticated
  USING  (pm_can_write_project((SELECT project_id FROM work_items WHERE id = work_item_id), auth.uid()));
CREATE POLICY "twil_service" ON ticket_work_item_links FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "wil_read" ON work_item_links FOR SELECT TO authenticated
  USING (
    pm_can_read_project((SELECT project_id FROM work_items WHERE id = source_id), auth.uid())
    AND pm_can_read_project((SELECT project_id FROM work_items WHERE id = target_id), auth.uid())
  );
CREATE POLICY "wil_insert" ON work_item_links FOR INSERT TO authenticated
  WITH CHECK (
    pm_can_write_project((SELECT project_id FROM work_items WHERE id = source_id), auth.uid())
    AND pm_can_write_project((SELECT project_id FROM work_items WHERE id = target_id), auth.uid())
  );
CREATE POLICY "wil_update" ON work_item_links FOR UPDATE TO authenticated
  USING  (pm_can_write_project((SELECT project_id FROM work_items WHERE id = source_id), auth.uid()))
  WITH CHECK (pm_can_write_project((SELECT project_id FROM work_items WHERE id = source_id), auth.uid()));
CREATE POLICY "wil_delete" ON work_item_links FOR DELETE TO authenticated
  USING  (pm_can_write_project((SELECT project_id FROM work_items WHERE id = source_id), auth.uid()));
CREATE POLICY "wil_service" ON work_item_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── team_members ──────────────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_read"
  ON team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM team_members tm2
       WHERE tm2.team_id = team_members.team_id
         AND tm2.user_id = auth.uid()
         AND tm2.role    = 'lead'
    )
  );

CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM team_members tm2
       WHERE tm2.team_id = team_members.team_id
         AND tm2.user_id = auth.uid()
         AND tm2.role    = 'lead'
    )
  );

CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE TO authenticated
  USING (
    is_admin(auth.uid())
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM team_members tm2
       WHERE tm2.team_id = team_members.team_id
         AND tm2.user_id = auth.uid()
         AND tm2.role    = 'lead'
    )
  );

CREATE POLICY "team_members_service"
  ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── project_members ───────────────────────────────────────────
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_read"
  ON project_members FOR SELECT TO authenticated
  USING (pm_can_read_project(project_id, auth.uid()));

CREATE POLICY "project_members_insert"
  ON project_members FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = project_members.project_id
         AND (p.lead_id = auth.uid() OR p.team_id IN (
           SELECT tm.team_id FROM team_members tm
            WHERE tm.user_id = auth.uid() AND tm.role = 'lead'
         ))
    )
  );

CREATE POLICY "project_members_update"
  ON project_members FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = project_members.project_id AND p.lead_id = auth.uid()
    )
  );

CREATE POLICY "project_members_delete"
  ON project_members FOR DELETE TO authenticated
  USING (
    is_admin(auth.uid())
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = project_members.project_id AND p.lead_id = auth.uid()
    )
  );

CREATE POLICY "project_members_service"
  ON project_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── escalation_history ────────────────────────────────────────
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_history_read"
  ON escalation_history FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));

CREATE POLICY "escalation_history_insert"
  ON escalation_history FOR INSERT TO authenticated
  WITH CHECK (is_support_or_admin(auth.uid()));

CREATE POLICY "escalation_history_service"
  ON escalation_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── ticket_collaborators ──────────────────────────────────────
ALTER TABLE ticket_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_collaborators_read"
  ON ticket_collaborators FOR SELECT TO authenticated
  USING (is_support_or_admin(auth.uid()));

CREATE POLICY "ticket_collaborators_insert"
  ON ticket_collaborators FOR INSERT TO authenticated
  WITH CHECK (is_support_or_admin(auth.uid()));

CREATE POLICY "ticket_collaborators_delete"
  ON ticket_collaborators FOR DELETE TO authenticated
  USING (is_support_or_admin(auth.uid()));

CREATE POLICY "ticket_collaborators_service"
  ON ticket_collaborators FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- 15. UTILITY RPC FUNCTIONS (migration 038)
-- ============================================================

-- Returns the single most-retrieved KB source title in the last N days.
-- Replaces O(n × m) JS aggregation in services/knowledge.ts:getKpiSnapshot.

CREATE OR REPLACE FUNCTION get_top_kb_source(days_back INT DEFAULT 7)
RETURNS TABLE (title TEXT, cnt BIGINT)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT
    elem->>'title'  AS title,
    count(*)        AS cnt
  FROM kb_retrieval_log,
       jsonb_array_elements(results) AS elem
  WHERE created_at >= now() - (days_back || ' days')::interval
    AND elem->>'title' IS NOT NULL
  GROUP BY title
  ORDER BY cnt DESC
  LIMIT 1;
$$;


-- ============================================================
-- 16. OPERATIONAL MAINTENANCE FUNCTIONS (migrations 042-043)
-- ============================================================

-- ── 16a. Embedding retry — migration 042 ─────────────────────
-- Re-fires the embed-resolution Edge Function for any ticket
-- whose resolution_plain is populated but resolution_embedding
-- is still NULL after the 1-hour grace period (pg_net failure).

CREATE OR REPLACE FUNCTION requeue_missing_embeddings()
RETURNS TABLE (requeued_count INT, error_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url      TEXT;
  v_anon_key TEXT;
  v_count    INT := 0;
  v_ticket   RECORD;
BEGIN
  v_url      := current_setting('app.supabase_url',     true);
  v_anon_key := current_setting('app.supabase_anon_key', true);

  IF v_url IS NULL OR v_anon_key IS NULL THEN
    RETURN QUERY SELECT 0, 'app.supabase_url or app.supabase_anon_key not configured'::TEXT;
    RETURN;
  END IF;

  FOR v_ticket IN
    SELECT id
    FROM tickets
    WHERE resolution_plain IS NOT NULL
      AND length(resolution_plain) > 0
      AND resolution_embedding IS NULL
      AND updated_at < now() - INTERVAL '1 hour'
    ORDER BY updated_at ASC
    LIMIT 100
  LOOP
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/embed-resolution',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body    := jsonb_build_object('ticket_id', v_ticket.id)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION requeue_missing_embeddings() TO service_role;

-- ── 16b. Stuck document auto-fail — migration 042 ────────────
-- Finds kb_document_versions stuck in processing (status_id=2)
-- for more than 10 minutes, marks them failed, and logs to
-- kb_audit_log so operators can see what happened.

CREATE OR REPLACE FUNCTION mark_stuck_documents()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_ver   RECORD;
BEGIN
  FOR v_ver IN
    SELECT id
    FROM kb_document_versions
    WHERE status_id = 2
      AND updated_at < now() - INTERVAL '10 minutes'
  LOOP
    UPDATE kb_document_versions
    SET
      status_id        = 4,
      processing_error = 'Timed out in processing state (auto-marked by mark_stuck_documents)',
      processed_at     = now()
    WHERE id = v_ver.id;

    INSERT INTO kb_audit_log (entity_type, entity_id, action, payload)
    VALUES (
      'document_version',
      v_ver.id,
      'ingest_stuck',
      jsonb_build_object('error', 'Stuck in processing for > 10 min; auto-failed by mark_stuck_documents()')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_stuck_documents() TO service_role;

-- ── 16c. TTL archival — migration 043 ────────────────────────
-- Deletes rows older than p_retention_days (default 730 = 24
-- months) from the six unbounded append-only audit tables.
-- Returns per-table deleted counts. Called monthly by pg_cron
-- (if enabled) or manually by operators.

CREATE OR REPLACE FUNCTION purge_old_records(
  p_retention_days INT DEFAULT 730
)
RETURNS TABLE (table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff            TIMESTAMPTZ := now() - make_interval(days => p_retention_days);
  v_ticket_history    BIGINT;
  v_work_item_history BIGINT;
  v_kb_audit          BIGINT;
  v_kb_retrieval      BIGINT;
  v_company_health    BIGINT;
  v_escalation        BIGINT;
BEGIN
  DELETE FROM ticket_history         WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_ticket_history = ROW_COUNT;

  DELETE FROM work_item_history      WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_work_item_history = ROW_COUNT;

  DELETE FROM kb_audit_log           WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_kb_audit = ROW_COUNT;

  DELETE FROM kb_retrieval_log       WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_kb_retrieval = ROW_COUNT;

  DELETE FROM company_health_history WHERE changed_at < v_cutoff;
  GET DIAGNOSTICS v_company_health = ROW_COUNT;

  DELETE FROM escalation_history     WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_escalation = ROW_COUNT;

  RETURN QUERY VALUES
    ('ticket_history',         v_ticket_history),
    ('work_item_history',      v_work_item_history),
    ('kb_audit_log',           v_kb_audit),
    ('kb_retrieval_log',       v_kb_retrieval),
    ('company_health_history', v_company_health),
    ('escalation_history',     v_escalation);
END;
$$;

GRANT EXECUTE ON FUNCTION purge_old_records(INT) TO service_role;
