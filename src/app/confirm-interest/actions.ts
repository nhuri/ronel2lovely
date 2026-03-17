"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";

export type ConfirmResult =
  | {
      status: "success";
      fromName: string;
      fromPhone: string;
      fromEmail: string | null;
      notificationsSent: number;
      notificationErrors: string[];
    }
  | { status: "already_used" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error"; message: string };

export async function confirmMutualInterest(token: string): Promise<ConfirmResult> {
  const admin = createSupabaseAdminClient();

  // Fetch token record
  const { data: tokenData, error: tokenError } = await admin
    .from("interest_tokens")
    .select("token, proposal_id, from_candidate_id, to_candidate_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenData) return { status: "invalid" };
  if (tokenData.used_at) return { status: "already_used" };
  if (new Date(tokenData.expires_at) < new Date()) return { status: "expired" };

  // Mark token as used
  await admin
    .from("interest_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Update proposal status to "5" (דייטים)
  if (tokenData.proposal_id) {
    await admin
      .from("proposals")
      .update({ status: "5" })
      .eq("id", tokenData.proposal_id);
  }

  // Fetch both candidates — only what we need for emails
  const [{ data: fromCand }, { data: toCand }] = await Promise.all([
    admin
      .from("candidates")
      .select("id, full_name, gender, phone_number, email, contact_person_phone")
      .eq("id", tokenData.from_candidate_id)
      .single(),
    admin
      .from("candidates")
      .select("id, full_name, gender, phone_number, email, contact_person_phone")
      .eq("id", tokenData.to_candidate_id)
      .single(),
  ]);

  if (!fromCand || !toCand) {
    return { status: "error", message: "שגיאה בטעינת פרטי המועמדים" };
  }

  const isSmsEmail = (e: string | null) =>
    !e || e.endsWith("@sms.ronellovely.co.il");

  const infoOf = (c: typeof fromCand) => ({
    name: c.full_name as string,
    gender: c.gender as string,
    phone: (c.contact_person_phone as string) || (c.phone_number as string) || "",
    email: isSmsEmail(c.email as string | null) ? null : (c.email as string),
  });

  const from = infoOf(fromCand);
  const to = infoOf(toCand);

  // Shared match page URL — each user sees the OTHER candidate when they log in
  const matchUrl = tokenData.proposal_id
    ? `https://ronel-lovely.com/my-profile/match/${tokenData.proposal_id}`
    : null;

  // ── Minimal text-like email (no personal data — reduces spam score) ─────────
  const matchEmail = (recipientName: string, otherName: string) => `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#059669;font-weight:bold;margin:0 0 4px;">Ronel Lovely</p>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        בונים בתים לזכרו של רונאל
      </p>

      <p style="font-size:16px;font-weight:bold;color:#059669;margin:0 0 16px;">🎉 יש לך התאמה הדדית!</p>

      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;">
        שלום ${recipientName},<br/>
        <strong>${otherName}</strong> אישר/ה עניין הדדי. לצפייה בפרטי ההתקשרות היכנס/י לאתר:
      </p>

      ${matchUrl ? `
      <div style="text-align:center;margin:0 0 8px;">
        <a href="${matchUrl}"
           style="display:inline-block;padding:13px 28px;background:#059669;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:bold;">
          לצפייה בפרטי ההתקשרות
        </a>
        <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">הקישור מחייב כניסה לאתר</p>
      </div>
      ` : ""}

      <p style="font-size:11px;color:#9ca3af;margin-top:28px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;">
        Ronel Lovely — ronel-lovely.com
      </p>
    </div>`;

  // ── Send email notifications ───────────────────────────────────────────────
  let notificationsSent = 0;
  const notificationErrors: string[] = [];

  // Notify original sender (from / A) — they see B's details on the match page
  if (from.email) {
    const result = await sendEmailWithLog({
      to: from.email,
      subject: `🎉 ${to.name} גם מעוניינ/ת — Ronel Lovely`,
      html: matchEmail(from.name, to.name),
      context: "mutual_confirmation_from",
      fromCandidateId: tokenData.from_candidate_id as number,
      toCandidateId: tokenData.to_candidate_id as number,
    });
    if (result.success) notificationsSent++;
    else notificationErrors.push(`מייל ל${from.name}: ${result.error}`);
  }

  // Notify confirmer (to / B) — they see A's details on the match page
  if (to.email) {
    const result = await sendEmailWithLog({
      to: to.email,
      subject: `🎉 אישרת עניין — ${from.name} גם מעוניינ/ת — Ronel Lovely`,
      html: matchEmail(to.name, from.name),
      context: "mutual_confirmation_to",
      fromCandidateId: tokenData.from_candidate_id as number,
      toCandidateId: tokenData.to_candidate_id as number,
    });
    if (result.success) notificationsSent++;
    else notificationErrors.push(`מייל ל${to.name}: ${result.error}`);
  }

  return {
    status: "success",
    fromName: from.name,
    fromPhone: from.phone,
    fromEmail: from.email,
    notificationsSent,
    notificationErrors,
  };
}
