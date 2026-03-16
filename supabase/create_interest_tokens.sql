-- Run this in Supabase SQL Editor
create table if not exists interest_tokens (
  token text primary key,
  proposal_id bigint references proposals(id) on delete cascade,
  from_candidate_id bigint not null,
  to_candidate_id bigint not null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

alter table interest_tokens enable row level security;
-- All reads/writes go through the service-role admin client — no public access needed
