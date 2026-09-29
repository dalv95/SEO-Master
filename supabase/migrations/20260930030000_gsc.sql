-- Google Search Console: one Google connection per user (an agency's account usually has access
-- to many client properties), a property per project, daily totals and query × page detail.

create table public.google_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  google_email text,
  -- AES-256-GCM ciphertext; readable only server-side (no column grant to API roles).
  refresh_token_enc text not null,
  -- Set when Google rejects the token (e.g. access revoked); the user must reconnect.
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;
revoke all on public.google_connections from anon, authenticated;
grant select (user_id, google_email, last_error, created_at, updated_at) on public.google_connections to authenticated;
grant delete on public.google_connections to authenticated;
create policy "read own google connection" on public.google_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "disconnect own google connection" on public.google_connections
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.projects
  add column gsc_property text,
  add column gsc_synced_at timestamptz,
  add column gsc_sync_error text,
  -- Earliest date whose query × page detail has been imported (null = initial import pending).
  add column gsc_detail_from date;

-- Exact daily totals (16 months). Totals from query × page rows undercount because Google
-- hides rare queries, so these come from a separate date-only request.
create table public.gsc_daily (
  project_id uuid not null references public.projects (id) on delete cascade,
  date date not null,
  clicks int not null,
  impressions int not null,
  ctr real not null,
  position real not null,
  primary key (project_id, date)
);

-- Query × page detail, kept for 120 days (enough for 28-day vs previous 28-day analyses).
create table public.gsc_rows (
  project_id uuid not null references public.projects (id) on delete cascade,
  date date not null,
  query text not null,
  page text not null,
  clicks int not null,
  impressions int not null,
  position real not null,
  primary key (project_id, date, query, page)
);
create index gsc_rows_project_page_idx on public.gsc_rows (project_id, page, date);

alter table public.gsc_daily enable row level security;
alter table public.gsc_rows enable row level security;
create policy "read own gsc daily" on public.gsc_daily
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "read own gsc rows" on public.gsc_rows
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

-- Aggregations over a date window. SECURITY INVOKER: RLS on gsc_rows still applies.
-- Position is impression-weighted, like Search Console's own averages.
create function public.gsc_query_page_stats(p_project uuid, p_from date, p_to date, p_limit int default 5000)
returns table (query text, page text, clicks bigint, impressions bigint, avg_position double precision)
language sql stable security invoker set search_path = ''
as $$
  select r.query, r.page, sum(r.clicks), sum(r.impressions),
         sum(r.position * r.impressions) / nullif(sum(r.impressions), 0)
  from public.gsc_rows r
  where r.project_id = p_project and r.date between p_from and p_to
  group by r.query, r.page
  order by sum(r.impressions) desc
  limit p_limit
$$;

create function public.gsc_page_stats(p_project uuid, p_from date, p_to date)
returns table (page text, clicks bigint, impressions bigint, avg_position double precision)
language sql stable security invoker set search_path = ''
as $$
  select r.page, sum(r.clicks), sum(r.impressions),
         sum(r.position * r.impressions) / nullif(sum(r.impressions), 0)
  from public.gsc_rows r
  where r.project_id = p_project and r.date between p_from and p_to
  group by r.page
$$;
