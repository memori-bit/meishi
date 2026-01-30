ALTER TABLE leads
ALTER COLUMN workspace_id TYPE text;

ALTER TABLE custom_fields
ADD COLUMN IF NOT EXISTS workspace_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_id
  ON custom_fields(workspace_id);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_id
  ON leads(workspace_id);
