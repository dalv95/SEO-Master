-- SEO Master: projects, audits (also used as the job queue), crawled pages and issues.

create type audit_status as enum ('queued', 'running', 'completed', 'failed');
create type issue_severity as enum ('critical', 'warning', 'notice');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  url text not null check (url ~* '^https?://'),
  created_at timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects (owner_id);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  status audit_status not null default 'queued',
  max_pages int not null default 500 check (max_pages between 1 and 5000),
  pages_crawled int not null default 0,
  score int check (score between 0 and 100),
  category_scores jsonb,
  -- robots.txt / sitemap summary from the crawl
  crawl_summary jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index audits_project_id_idx on public.audits (project_id, created_at desc);
-- The worker claims jobs with: where status = 'queued' order by created_at for update skip locked
create index audits_queued_idx on public.audits (created_at) where status = 'queued';

create table public.audit_pages (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  url text not null,
  final_url text not null,
  status int not null,
  depth int not null,
  is_html boolean not null,
  title text,
  meta_description text,
  word_count int,
  response_time_ms int,
  bytes int,
  -- remaining ParsedPage fields (headings, links, redirect chain, ...)
  data jsonb not null default '{}'
);
create index audit_pages_audit_id_idx on public.audit_pages (audit_id);

create table public.audit_issues (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  url text not null,
  rule_id text not null,
  category text not null,
  severity issue_severity not null,
  message text not null,
  evidence text,
  fix_hint jsonb
);
create index audit_issues_audit_id_idx on public.audit_issues (audit_id, severity, rule_id);

-- Row level security: users only see their own projects and everything under them.
-- The worker connects with the service role / postgres user and bypasses RLS.
alter table public.projects enable row level security;
alter table public.audits enable row level security;
alter table public.audit_pages enable row level security;
alter table public.audit_issues enable row level security;

create policy "own projects" on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "read own audits" on public.audits
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

-- Users may only enqueue audits; status/results are written by the worker.
create policy "queue own audits" on public.audits
  for insert to authenticated
  with check (
    status = 'queued'
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy "read own audit pages" on public.audit_pages
  for select to authenticated
  using (exists (
    select 1 from public.audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.owner_id = (select auth.uid())
  ));

create policy "read own audit issues" on public.audit_issues
  for select to authenticated
  using (exists (
    select 1 from public.audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.owner_id = (select auth.uid())
  ));
