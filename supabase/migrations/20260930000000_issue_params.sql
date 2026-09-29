-- Issue messages are rendered in the viewer's language from rule_id + params.
-- `message` keeps the English text (fallback for issues stored before this migration).
alter table public.audit_issues add column params jsonb;
