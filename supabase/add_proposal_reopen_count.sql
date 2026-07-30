-- Run this in Supabase SQL Editor
-- Counts how many times a proposal has been reopened via the candidate
-- "reopen proposal" flow, so it can be capped (currently: 3 times).
alter table proposals add column if not exists reopen_count integer not null default 0;
