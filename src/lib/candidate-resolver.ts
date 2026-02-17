"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the current auth user's managed candidates.
 * Used by server components to determine which candidate to display.
 *
 * Strategy:
 * 1. Look up candidates by manager_id = auth user.id
 * 2. Fallback: look up by email/phone (for users not yet migrated)
 *    and backfill manager_id automatically
 * 3. If requestedCandidateId is given, verify ownership
 * 4. If only one candidate, auto-select it
 * 5. If multiple and no selection, return needsSelection = true
 */
export async function resolveCandidate(requestedCandidateId?: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "candidate") {
    return { candidate: null, allCandidates: [] as Record<string, unknown>[], needsSelection: false, supabase, user };
  }

  // Primary: manager_id lookup
  let { data: allCandidates } = await supabase
    .from("candidates")
    .select("*")
    .eq("manager_id", user.id);

  // Fallback: email/phone lookup + backfill
  if (!allCandidates || allCandidates.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = null;

    if (user.email) {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      fallback = data;
    } else {
      const dbPhone = user.user_metadata?.db_phone;
      if (dbPhone) {
        const { data } = await supabase
          .from("candidates")
          .select("*")
          .eq("phone_number", dbPhone)
          .maybeSingle();
        fallback = data;
      }
    }

    if (fallback) {
      // Backfill manager_id
      await supabase
        .from("candidates")
        .update({ manager_id: user.id })
        .eq("id", fallback.id)
        .is("manager_id", null);
      allCandidates = [fallback];
    } else {
      allCandidates = [];
    }
  }

  if (allCandidates.length === 0) {
    return { candidate: null, allCandidates: [], needsSelection: false, supabase, user };
  }

  // Resolve specific candidate
  if (requestedCandidateId) {
    const candidate = allCandidates.find((c) => c.id === requestedCandidateId);
    if (!candidate) {
      // Requested candidate not managed by this user
      return { candidate: null, allCandidates, needsSelection: true, supabase, user };
    }
    return { candidate, allCandidates, needsSelection: false, supabase, user };
  }

  // Auto-select if only one
  if (allCandidates.length === 1) {
    return { candidate: allCandidates[0], allCandidates, needsSelection: false, supabase, user };
  }

  // Multiple candidates, no selection made
  return { candidate: null, allCandidates, needsSelection: true, supabase, user };
}
