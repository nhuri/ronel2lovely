export const DAILY_PROPOSAL_LIMIT = 5;
export const DAILY_PROPOSAL_LIMIT_MESSAGE =
  "אפשר לפתוח עד 5 הצעות ביום, הגעת למכסה היומית, המכסה תתחדש מחר";

/** Whether this candidate has already opened DAILY_PROPOSAL_LIMIT proposals today as the initiator */
export async function hasReachedDailyProposalLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  candidateId: number
): Promise<boolean> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id_1", candidateId)
    .gte("created_at", startOfToday.toISOString());

  return (count ?? 0) >= DAILY_PROPOSAL_LIMIT;
}
