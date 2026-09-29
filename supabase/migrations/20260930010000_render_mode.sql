-- JavaScript rendering per audit: 'auto' renders only when the start page's content depends on JS.
alter table public.audits
  add column render_mode text not null default 'auto' check (render_mode in ('auto', 'always', 'never'));
