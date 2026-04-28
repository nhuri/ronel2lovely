-- Run this in Supabase SQL Editor
create table if not exists page_visits (
  id bigserial primary key,
  visited_at timestamptz not null default now(),
  visitor_id text not null,
  page text not null default '/'
);

create index if not exists page_visits_visited_at_idx on page_visits (visited_at);
create index if not exists page_visits_visitor_id_idx on page_visits (visitor_id);

alter table page_visits enable row level security;

create policy "Service role can insert page visits"
  on page_visits for insert with check (true);

create policy "Service role can read page visits"
  on page_visits for select using (true);
