import { sendEmailWithLog } from "@/lib/email";

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

  await sendEmailWithLog({
    to: "ronel2lovely@gmail.com",
    subject: `מכסת הצעות יומית — ${name}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #374151;">
        <p style="font-size: 13px; color: #0284c7; font-weight: bold; margin: 0 0 4px;">Ronel Lovely — התראה פנימית</p>
        <p style="font-size: 15px; line-height: 1.8; margin: 16px 0;">
          המועמד/ת <strong>${name}</strong> הגיע/ה למכסת ${DAILY_PROPOSAL_LIMIT} ההצעות היומית שלו/ה.
        </p>
      </div>
    `,
    context: "daily_proposal_limit_reached",
    fromCandidateId: candidateId,
  });
}
