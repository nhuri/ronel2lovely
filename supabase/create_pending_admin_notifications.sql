-- Run this in Supabase SQL Editor
-- Admin-facing notifications (new candidate, daily quota reached, self-freeze,
-- unfreeze request, email update) are queued here instead of emailed
-- immediately. An hourly cron job (/api/cron/admin-digest) batches every
-- unsent row into a single digest email and marks them sent.
create table if not exists pending_admin_notifications (
  id bigserial primary key,
  type text not null,
  message text not null,
  link_url text,
  candidate_id bigint,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists pending_admin_notifications_unsent_idx
  on pending_admin_notifications (created_at)
  where sent_at is null;

alter table pending_admin_notifications enable row level security;

create policy "Service role can insert pending admin notifications"
  on pending_admin_notifications for insert with check (true);

create policy "Service role can read pending admin notifications"
  on pending_admin_notifications for select using (true);

create policy "Service role can update pending admin notifications"
  on pending_admin_notifications for update using (true);
