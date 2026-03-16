-- Run this in Supabase SQL Editor
create table if not exists site_settings (
  key text primary key,
  value text not null
);

-- Default: show 6 recommendations per candidate
insert into site_settings (key, value)
values ('max_recommendations', '6')
on conflict (key) do nothing;

-- Only the admin (service role / authenticated) can read/write
alter table site_settings enable row level security;

create policy "Admins can read settings"
  on site_settings for select using (true);

create policy "Admins can update settings"
  on site_settings for update using (true);

create policy "Admins can insert settings"
  on site_settings for insert with check (true);
