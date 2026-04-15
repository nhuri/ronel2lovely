import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";
import { getFollowupDelays } from "@/app/admin/settings-actions";
import { followupDelayToMs } from "@/lib/followup";

export const runtime = "nodejs";

const BASE_URL = "https://ronel-lovely.com";

function isSmsEmail(e: string | null | undefined): boolean {
  return !e || e.endsWith("@sms.ronellovely.co.il");
}

function followupEmailHtml(
  recipientName: string,
  question: string,
  statusOptions: { label: string; token: string }[]
): string {
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#059669;font-weight:bold;margin:0 0 4px;">Ronel Lovely</p>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        בונים בתים לזכרו של רונאל
      </p>

      <p style="font-size:16px;font-weight:bold;color:#374151;margin:0 0 16px;">שלום ${recipientName},</p>
      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;">${question}</p>

      <div style="display:flex;flex-direction:column;gap:8px;margin:0 0 20px;">
        ${statusOptions.map((opt) => `
        <a href="${BASE_URL}/api/update-proposal-status?token=${opt.token}"
           style="display:block;padding:12px 20px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;text-decoration:none;border-radius:10px;font-size:14px;text-align:center;">
          ${opt.label}
        </a>`).join("")}
      </div>

      <p style="font-size:11px;color:#9ca3af;margin-top:28px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;">
        Ronel Lovely — ronel-lovely.com
      </p>
    </div>`;
}

async function createToken(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  proposalId: number,
  newStatus: string
): Promise<string | null> {
  const { data } = await admin
    .from("status_update_tokens")
    .insert({
      proposal_id: proposalId,
      new_status: newStatus,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("token")
    .single();
  return data?.token ?? null;
}

export async function GET(request: Request) {
  if (
    request.headers.get("Authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const delays = await getFollowupDelays();
  const results = {
    weeklyProcessed: 0,
    monthlyProcessed: 0,
    errors: [] as string[],
  };

  // ── Step 1: First follow-up ───────────────────────────────────────────────
  // Proposals at status "3" (2 המועמדים מעוניינים) with no first follow-up yet
  const firstDelayMs = followupDelayToMs(delays.first);
  const firstCutoff = new Date(Date.now() - firstDelayMs).toISOString();

  const { data: firstProposals } = await admin
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2")
    .eq("status", "3")
    .is("follow_up_week_sent_at", null)
    .lt("updated_at", firstCutoff);

  for (const proposal of firstProposals ?? []) {
    try {
      const [{ data: c1 }, { data: c2 }] = await Promise.all([
        admin
          .from("candidates")
          .select("id, full_name, email")
          .eq("id", proposal.candidate_id_1 as number)
          .single(),
        admin
          .from("candidates")
          .select("id, full_name, email")
          .eq("id", proposal.candidate_id_2 as number)
          .single(),
      ]);
      if (!c1 || !c2) continue;

      // Status options: "נפגשנו" → "4" (נפגשו), "לא יצאנו" → "2", "חתכנו" → "5" (חתכו לאחר שנפגשו)
      const [tok4, tok2, tok5] = await Promise.all([
        createToken(admin, proposal.id as number, "4"),
        createToken(admin, proposal.id as number, "2"),
        createToken(admin, proposal.id as number, "5"),
      ]);

      const statusOptions = [
        { label: "כן, נפגשנו", token: tok4 },
        { label: "לא, טרם יצאנו", token: tok2 },
        { label: "חתכנו לאחר פגישה", token: tok5 },
      ].filter((o) => o.token !== null) as { label: string; token: string }[];

      for (const cand of [c1, c2]) {
        const email = cand.email as string | null;
        if (isSmsEmail(email)) continue;
        await sendEmailWithLog({
          to: email!,
          subject: "עדכון ממערכת Ronel Lovely — האם נפגשתם?",
          html: followupEmailHtml(
            cand.full_name as string,
            "האם יצאתם לפגישה?",
            statusOptions
          ),
          context: "followup_week",
          fromCandidateId: proposal.candidate_id_1 as number,
          toCandidateId: proposal.candidate_id_2 as number,
        });
      }

      await admin
        .from("proposals")
        .update({ follow_up_week_sent_at: new Date().toISOString() })
        .eq("id", proposal.id);

      results.weeklyProcessed++;
    } catch (e) {
      results.errors.push(`Proposal ${proposal.id} (first): ${String(e)}`);
    }
  }

  // ── Step 2: Second follow-up ──────────────────────────────────────────────
  // Proposals at status "4" (נפגשו) with no second follow-up yet
  const secondDelayMs = followupDelayToMs(delays.second);
  const secondCutoff = new Date(Date.now() - secondDelayMs).toISOString();

  const { data: secondProposals } = await admin
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2")
    .eq("status", "4")
    .is("follow_up_month_sent_at", null)
    .lt("updated_at", secondCutoff);

  for (const proposal of secondProposals ?? []) {
    try {
      const [{ data: c1 }, { data: c2 }] = await Promise.all([
        admin
          .from("candidates")
          .select("id, full_name, email")
          .eq("id", proposal.candidate_id_1 as number)
          .single(),
        admin
          .from("candidates")
          .select("id, full_name, email")
          .eq("id", proposal.candidate_id_2 as number)
          .single(),
      ]);
      if (!c1 || !c2) continue;

      // Status options: ממשיכים → "6" (דייטים מתקדם), סיימנו → "7" (חתכו לאחר תקופה)
      const [tok6, tok7] = await Promise.all([
        createToken(admin, proposal.id as number, "6"),
        createToken(admin, proposal.id as number, "7"),
      ]);

      const statusOptions = [
        { label: "ממשיכים להפגש", token: tok6 },
        { label: "סיימנו לאחר תקופה", token: tok7 },
      ].filter((o) => o.token !== null) as { label: string; token: string }[];

      for (const cand of [c1, c2]) {
        const email = cand.email as string | null;
        if (isSmsEmail(email)) continue;
        await sendEmailWithLog({
          to: email!,
          subject: "עדכון ממערכת Ronel Lovely — איך הולך?",
          html: followupEmailHtml(
            cand.full_name as string,
            "איך הולך? עדכנו אותנו על ההתקדמות:",
            statusOptions
          ),
          context: "followup_month",
          fromCandidateId: proposal.candidate_id_1 as number,
          toCandidateId: proposal.candidate_id_2 as number,
        });
      }

      await admin
        .from("proposals")
        .update({ follow_up_month_sent_at: new Date().toISOString() })
        .eq("id", proposal.id);

      results.monthlyProcessed++;
    } catch (e) {
      results.errors.push(`Proposal ${proposal.id} (second): ${String(e)}`);
    }
  }

  return Response.json(results);
}
