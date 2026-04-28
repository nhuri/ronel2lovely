-- ============================================================
-- RLS Policies — Ronel Lovely
-- Run in Supabase SQL Editor (after enable_rls.sql)
-- ============================================================
--
-- ARCHITECTURE NOTE:
-- • createSupabaseAdminClient() uses service_role → bypasses RLS
--   (admin dashboard, all data mutations)
-- • createSupabaseServerClient() uses user JWT → RLS applies
--   (my-profile pages, recommendations, proposals browsing)
--
-- POLICY LOGIC:
-- • anon  → blocked (no policy = default deny)
-- • authenticated candidates → can SELECT what they need
-- • admin (ronel2lovely@gmail.com) → uses admin client (service_role),
--   RLS is bypassed entirely → no explicit policy needed
-- ============================================================


-- ============================================================
-- candidates
-- ============================================================
-- Any logged-in user can read candidates (needed for recommendations,
-- profile browsing, and the candidate-selection flow).
-- Fine-grained authorization is enforced by server-side code.
CREATE POLICY "authenticated_select_candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow the server client to backfill manager_id on first login
-- (resolveCandidate writes manager_id = auth.uid() when it was NULL).
-- Only allows updating a row that currently belongs to this user OR has no owner.
CREATE POLICY "candidate_backfill_manager_id"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING  (manager_id IS NULL OR manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());


-- ============================================================
-- proposals
-- ============================================================
-- Authenticated users read proposals (my-proposals page, match page).
-- The server checks that the user is actually a party to the proposal.
CREATE POLICY "authenticated_select_proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- proposal_notes
-- ============================================================
-- proposal_notes is joined inside proposals queries, so it also
-- needs a SELECT policy or the join returns empty.
CREATE POLICY "authenticated_select_proposal_notes"
  ON proposal_notes
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- recommendation_rejections
-- ============================================================
-- Candidates read their own rejection list on the recommendations page.
CREATE POLICY "authenticated_select_rejections"
  ON recommendation_rejections
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- Verify — check policies and RLS status
-- ============================================================
SELECT
  t.tablename,
  t.rowsecurity          AS rls_enabled,
  p.policyname,
  p.cmd                  AS operation,
  p.roles
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
ORDER BY t.tablename, p.policyname;
