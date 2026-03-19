import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";

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
  const results = {
    weeklyProcessed: 0,
    monthlyProcessed: 0,
    errors: [] as string[],
  };

  // ── Step 1: Weekly follow-up ──────────────────────────────────────────────
  // Proposals at status "5" (התחלנו להפגש) with no week follow-up, updated 7+ days ago
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weeklyProposals } = await admin
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2")
    .eq("status", "5")
    .is("follow_up_week_sent_at", null)
    .lt("updated_at", weekAgo);

  for (const proposal of weeklyProposals ?? []) {
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

      // Create tokens for status options: נפגשו, פסלו, חתכו
      const [tok3, tok2, tok4] = await Promise.all([
        createToken(admin, proposal.id as number, "3"),
        createToken(admin, proposal.id as number, "2"),
        createToken(admin, proposal.id as number, "4"),
      ]);

      const statusOptions = [
        { label: "כן, נפגשנו", token: tok3 },
        { label: "לא, טרם יצאנו", token: tok2 },
        { label: "חתכנו לאחר פגישה", token: tok4 },
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
      results.errors.push(`Proposal ${proposal.id} (week): ${String(e)}`);
    }
  }

  // ── Step 2: Monthly follow-up ─────────────────────────────────────────────
  // Proposals at status "3" (נפגשו) with no month follow-up, updated 30+ days ago
  const monthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: monthlyProposals } = await admin
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2")
    .eq("status", "3")
    .is("follow_up_month_sent_at", null)
    .lt("updated_at", monthAgo);

  for (const proposal of monthlyProposals ?? []) {
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

      const [tok5, tok6] = await Promise.all([
        createToken(admin, proposal.id as number, "5"),
        createToken(admin, proposal.id as number, "6"),
      ]);

      const statusOptions = [
        { label: "ממשיכים להפגש", token: tok5 },
        { label: "סיימנו לאחר תקופה", token: tok6 },
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
      results.errors.push(`Proposal ${proposal.id} (month): ${String(e)}`);
    }
  }

  return Response.json(results);
}
