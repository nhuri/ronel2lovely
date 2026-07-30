import { queueAdminNotification } from "@/lib/adminNotifications";

export const DAILY_PROPOSAL_LIMIT = 5;

/** How many proposals this candidate has opened as the initiator since midnight */
export async function getDailyProposalCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  candidateId: number
): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id_1", candidateId)
    .gte("created_at", startOfToday.toISOString());

  return count ?? 0;
}

/** Whether this candidate has already opened DAILY_PROPOSAL_LIMIT proposals today as the initiator */
export async function hasReachedDailyProposalLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  candidateId: number
): Promise<boolean> {
  return (await getDailyProposalCount(supabase, candidateId)) >= DAILY_PROPOSAL_LIMIT;
}

export function dailyProposalLimitMessage(count: number): string {
  return `פתחת ${count}/${DAILY_PROPOSAL_LIMIT} הצעות היום, הגעת למכסה היומית, המכסה תתחדש מחר`;
}

/** Notify the site team by email that a candidate hit their daily proposal quota */
export async function notifyDailyProposalLimitReached(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  candidateId: number
): Promise<void> {
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name")
    .eq("id", candidateId)
    .maybeSingle();

  const name = (candidate?.full_name as string | undefined) ?? `מועמד/ת #${candidateId}`;

  await queueAdminNotification({
    type: "daily_proposal_limit_reached",
    message: `המועמד/ת <strong>${name}</strong> הגיע/ה למכסת ${DAILY_PROPOSAL_LIMIT} ההצעות היומית שלו/ה.`,
    candidateId,
  });
}
