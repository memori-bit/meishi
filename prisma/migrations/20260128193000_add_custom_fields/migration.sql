CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT '',
  label text NOT NULL,
  type text NOT NULL,
  options text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_lead_id
  ON lead_custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_field_id
  ON lead_custom_field_values(field_id);

CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_id
  ON custom_fields(workspace_id);
