-- Run this in Supabase SQL Editor
-- Tracks which candidate explicitly rejected a proposal (status "2"), so the
-- "reopen proposal" flow can tell whether the requesting candidate is the one
-- who rejected it (allowed to reopen) or the one who was rejected (blocked).
alter table proposals add column if not exists rejected_by_candidate_id bigint references candidates(id);
