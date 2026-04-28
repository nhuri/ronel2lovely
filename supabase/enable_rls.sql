-- ============================================================
-- RLS Security Hardening — Ronel Lovely
-- Run this entire script in Supabase SQL Editor
-- ============================================================
--
-- RATIONALE:
-- All server-side app traffic uses SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS entirely — so enabling RLS does NOT break the app.
-- Enabling RLS with no policies blocks direct REST API access via
-- the public anon key, protecting sensitive data (phone numbers,
-- system notes, OTP codes, etc.).
-- ============================================================


-- ============================================================
-- STEP 1: Enable RLS on tables currently without it
-- ============================================================

-- candidates (sensitive: phone_number, email, system_notes, image_urls)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- admin_notes (sensitive: internal admin notes)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- inquiries
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- proposal_notes
ALTER TABLE proposal_notes ENABLE ROW LEVEL SECURITY;

-- status_update_tokens (auth tokens — highly sensitive)
ALTER TABLE status_update_tokens ENABLE ROW LEVEL SECURITY;

-- sms_otps (auth OTP codes — highly sensitive)
ALTER TABLE sms_otps ENABLE ROW LEVEL SECURITY;

-- recommendation_rejections
ALTER TABLE recommendation_rejections ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 2: Fix overly permissive policies on existing RLS tables
-- ============================================================

-- DONATIONS: existing SELECT policy used "using (true)" which allowed
-- anyone to read all donations. Remove it — service_role handles reads.
DROP POLICY IF EXISTS "Admins can view donations" ON donations;

-- SITE_SETTINGS: existing policies used "using (true)" / "with check (true)"
-- without any auth check — effectively public read/write.
-- Remove them — service_role handles all settings operations.
DROP POLICY IF EXISTS "Admins can read settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON site_settings;


-- ============================================================
-- STEP 3: Verify — list all tables and their RLS status
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
