CREATE TABLE IF NOT EXISTS routing_content_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id text NOT NULL CHECK (
    profile_id IN ('obgyn', 'oncology', 'bsk', 'dermatology', 'infectious', 'road_accident')
  ),
  content_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'archived')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  document jsonb NOT NULL,
  rule_set jsonb NOT NULL,
  created_by text NOT NULL DEFAULT 'admin' CHECK (created_by = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, content_version),
  CHECK (document->>'profileId' = profile_id),
  CHECK (document->>'contentVersion' = content_version),
  CHECK (document->>'status' = status),
  CHECK (rule_set->>'profileId' = profile_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS routing_one_approved_version_per_profile
  ON routing_content_versions (profile_id)
  WHERE status = 'approved';

ALTER TABLE routing_content_versions
  ADD COLUMN IF NOT EXISTS based_on_version_id bigint
  REFERENCES routing_content_versions(id) ON DELETE RESTRICT;

ALTER TABLE routing_content_versions
  ADD COLUMN IF NOT EXISTS based_on_content_version text;

CREATE TABLE IF NOT EXISTS routing_content_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id bigint NOT NULL REFERENCES routing_content_versions(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision >= 1),
  document jsonb NOT NULL,
  rule_set jsonb NOT NULL,
  saved_by text NOT NULL DEFAULT 'admin' CHECK (saved_by = 'admin'),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, revision)
);

CREATE TABLE IF NOT EXISTS routing_admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id bigint REFERENCES routing_content_versions(id) ON DELETE RESTRICT,
  profile_id text NOT NULL,
  action text NOT NULL CHECK (
    action IN ('create_draft', 'save_draft', 'submit_review', 'approve', 'archive')
  ),
  actor text NOT NULL DEFAULT 'admin' CHECK (actor = 'admin'),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routing_versions_profile_updated
  ON routing_content_versions (profile_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS routing_audit_version_created
  ON routing_admin_audit_log (version_id, created_at DESC);
