-- Run this in Supabase SQL Editor
create table if not exists email_logs (
  id bigserial primary key,
  sent_at timestamptz not null default now(),
  to_address text not null,
  subject text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text,
  context text not null default 'general',
  from_candidate_id bigint,
  to_candidate_id bigint
);

alter table email_logs enable row level security;

create policy "Service role can insert email logs"
  on email_logs for insert with check (true);

create policy "Service role can read email logs"
  on email_logs for select using (true);
