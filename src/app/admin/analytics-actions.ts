"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AnalyticsStats = {
  uniqueVisitorsToday: number;
  uniqueVisitorsThisWeek: number;
  totalVisitsToday: number;
  totalVisitsThisWeek: number;
  newProposalsThisWeek: number;
  newProposalsToday: number;
  totalProposals: number;
  /** Proposals that reached a meeting (status 4,6,8,9) */
  successfulProposals: number;
  successRate: number;
};

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const supabase = createSupabaseAdminClient();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const todayISO = startOfToday.toISOString();
  const weekISO = startOfWeek.toISOString();

  const [
    visitsToday,
    visitsWeek,
    proposalsToday,
    proposalsWeek,
    allProposals,
    successfulProposals,
  ] = await Promise.all([
    supabase
      .from("page_visits")
      .select("visitor_id")
      .gte("visited_at", todayISO),
    supabase
      .from("page_visits")
      .select("visitor_id")
      .gte("visited_at", weekISO),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekISO),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .in("status", ["4", "6", "8", "9"]),
  ]);

  const todayRows = visitsToday.data ?? [];
  const weekRows = visitsWeek.data ?? [];

  const uniqueToday = new Set(todayRows.map((r) => r.visitor_id)).size;
  const uniqueWeek = new Set(weekRows.map((r) => r.visitor_id)).size;

  const total = allProposals.count ?? 0;
  const successful = successfulProposals.count ?? 0;
  const rate = total > 0 ? Math.round((successful / total) * 100) : 0;

  return {
    uniqueVisitorsToday: uniqueToday,
    uniqueVisitorsThisWeek: uniqueWeek,
    totalVisitsToday: todayRows.length,
    totalVisitsThisWeek: weekRows.length,
    newProposalsToday: proposalsToday.count ?? 0,
    newProposalsThisWeek: proposalsWeek.count ?? 0,
    totalProposals: total,
    successfulProposals: successful,
    successRate: rate,
  };
}
