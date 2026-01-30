CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NULL,
  company_name text NOT NULL,
  person_name text NOT NULL,
  department text NULL,
  title text NULL,
  email text NULL,
  phone text NULL,
  mobile text NULL,
  address text NULL,
  website text NULL,
  raw_text_front text NULL,
  raw_text_back text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
