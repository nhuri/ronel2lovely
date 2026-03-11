-- Run this in Supabase SQL Editor
create table if not exists donations (
  id bigint generated always as identity primary key,
  full_name text,
  amount numeric(10, 2) not null,
  created_at timestamptz default now() not null
);

alter table donations enable row level security;

-- Allow anonymous inserts (server action uses admin client, but just in case)
create policy "Anyone can record a donation"
  on donations for insert with check (true);

-- Admins can view all donations
create policy "Admins can view donations"
  on donations for select using (true);
