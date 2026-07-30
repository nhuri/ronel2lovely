"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";
import { getEffectiveContact } from "@/lib/contact";

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

export type RejectResult =
  | { status: "success" }
  | { status: "already_used" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error"; message: string };

export async function rejectInterest(token: string): Promise<RejectResult> {
  const admin = createSupabaseAdminClient();

  const { data: tokenData, error: tokenError } = await admin
    .from("interest_tokens")
    .select("token, proposal_id, to_candidate_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenData) return { status: "invalid" };
  if (tokenData.used_at) return { status: "already_used" };
  if (new Date(tokenData.expires_at) < new Date()) return { status: "expired" };

  await admin
    .from("interest_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  if (tokenData.proposal_id) {
    const { error } = await admin
      .from("proposals")
      .update({ status: "2", rejected_by_candidate_id: tokenData.to_candidate_id })
      .eq("id", tokenData.proposal_id);
    if (error) return { status: "error", message: error.message };
  }

  return { status: "success" };
}

/**
 * Shared by both "confirm" flows reachable from the confirm-interest page:
 * full mutual interest (status "3", both candidates marked תפוס) and the
 * lighter "I'd like more details before we meet" option (status "10", both
 * stay available). Both exchange full contact details identically — they only
 * differ in the resulting proposal status and whether availability changes.
 */
async function completeInterestConfirmation(
  token: string,
  mode: "mutual" | "inquiry"
): Promise<ConfirmResult> {
  const resultStatus = mode === "mutual" ? "3" : "10";
  const markUnavailable = mode === "mutual";
  const emailContextSuffix = mode === "mutual" ? "mutual_confirmation" : "inquiry_confirmation";

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

  // Update proposal status
  if (tokenData.proposal_id) {
    await admin
      .from("proposals")
      .update({ status: resultStatus })
      .eq("id", tokenData.proposal_id);
  }

  if (markUnavailable) {
    // Mark both candidates as unavailable (תפוס)
    await admin
      .from("candidates")
      .update({ availability_status: "תפוס" })
      .in("id", [tokenData.from_candidate_id, tokenData.to_candidate_id]);
  }

  // Fetch both candidates — only what we need for emails
  const [{ data: fromCand }, { data: toCand }] = await Promise.all([
    admin
      .from("candidates")
      .select("id, full_name, gender, phone_number, email, contact_person, contact_person_phone, contact_person_email, ambassador_id")
      .eq("id", tokenData.from_candidate_id)
      .single(),
    admin
      .from("candidates")
      .select("id, full_name, gender, phone_number, email, contact_person, contact_person_phone, contact_person_email, ambassador_id")
      .eq("id", tokenData.to_candidate_id)
      .single(),
  ]);

  if (!fromCand || !toCand) {
    return { status: "error", message: "שגיאה בטעינת פרטי המועמדים" };
  }

  const isSmsEmail = (e: string | null) =>
    !e || e.endsWith("@sms.ronellovely.co.il");

  const infoOf = (c: typeof fromCand) => {
    const effective = getEffectiveContact(c);
    return {
      name: c.full_name as string,
      gender: c.gender as string,
      phone: effective.phone || "",
      email: isSmsEmail(effective.email) ? null : effective.email,
      hasAmbassador: effective.hasAmbassador,
      ambassadorName: (c.contact_person as string | null) || null,
    };
  };

  const from = infoOf(fromCand);
  const to = infoOf(toCand);

  // Shared match page URL — each user sees the OTHER candidate when they log in
  const matchUrl = tokenData.proposal_id
    ? `https://ronel-lovely.com/my-profile/match/${tokenData.proposal_id}`
    : null;

  // ── Notification email with contact details ──────────────────────────────────
  const candidateTitle = (gender: string) => (gender === "זכר" ? "המועמד" : "המועמדת");

  const matchEmail = (
    recipient: ReturnType<typeof infoOf>,
    recipientRole: "from" | "to",
    otherName: string,
    otherPhone: string,
    otherEmail: string | null,
    otherGender: string
  ) => {
    // If the recipient has an ambassador, this email actually reaches the
    // ambassador — address them directly and refer to the candidate in third person.
    const greeting = recipient.hasAmbassador
      ? recipient.ambassadorName
        ? `שלום ${recipient.ambassadorName},`
        : "שלום,"
      : `שלום ${recipient.name},`;

    // The "I'd like more details before we meet" flow (mode "inquiry") is a
    // softer step than full mutual confirmation — the email sent back to
    // whoever originally opened the proposal ("from") should say so plainly
    // instead of implying a done-deal mutual match.
    const isInquiryFrom = mode === "inquiry" && recipientRole === "from";

    const otherWillBeHappy = otherGender === "נקבה" ? "תשמח" : "ישמח";
    const otherHisHer = otherGender === "נקבה" ? "שלה" : "שלו";
    const otherHeShe = otherGender === "נקבה" ? "היא" : "הוא";
    const otherToHimHer = otherGender === "נקבה" ? "לה" : "לו";
    const otherHimHer = otherGender === "נקבה" ? "אותה" : "אותו";
    // These two address the recipient directly ("that you send…"), so they use
    // the recipient's own gender, not otherGender.
    const recipientWillSend = recipient.gender === "נקבה" ? "שתשלחי" : "שתשלח";
    const recipientWillInvite = recipient.gender === "נקבה" ? "שתזמיני" : "שתזמין";

    const headline = isInquiryFrom
      ? "💬 יש התעניינות בהצעה שלך!"
      : recipient.hasAmbassador
        ? "🎉 יש התאמה הדדית!"
        : "🎉 יש לך התאמה הדדית!";

    const bodyLine = isInquiryFrom
      ? recipient.hasAmbassador
        ? `<strong>${otherName}</strong> רואה פוטנציאל בהצעה עם ${candidateTitle(recipient.gender)} שלך, <strong>${recipient.name}</strong>, ו${otherWillBeHappy} לשמוע יותר פרטים על ההצעה. פרטי הקשר ${otherHisHer} מופיעים מטה, ו${otherHeShe} ${otherWillBeHappy} ${recipientWillSend} ${otherToHimHer} מספר לבירורים, או ${recipientWillInvite} ${otherHimHer} לברר יותר פרטים דרכך.`
        : `<strong>${otherName}</strong> רואה פוטנציאל בהצעה זו ו${otherWillBeHappy} לשמוע יותר פרטים על ההצעה. פרטי הקשר ${otherHisHer} מופיעים מטה, ו${otherHeShe} ${otherWillBeHappy} ${recipientWillSend} ${otherToHimHer} מספר לבירורים, או ${recipientWillInvite} ${otherHimHer} לברר יותר פרטים דרכך.`
      : recipient.hasAmbassador
        ? `<strong>${otherName}</strong> ${otherGender === "נקבה" ? "אישרה" : "אישר"} עניין הדדי עם ${candidateTitle(recipient.gender)} שלך, <strong>${recipient.name}</strong>.`
        : `<strong>${otherName}</strong> ${otherGender === "נקבה" ? "אישרה" : "אישר"} עניין הדדי.`;

    return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#059669;font-weight:bold;margin:0 0 4px;">Ronel Lovely</p>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        בונים בתים לזכרו של רונאל
      </p>

      <p style="font-size:16px;font-weight:bold;color:#059669;margin:0 0 16px;">${headline}</p>

      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;">
        ${greeting}<br/>
        ${bodyLine}
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:bold;color:#166534;margin:0 0 10px;">פרטי קשר</p>
        ${otherPhone ? `<p style="font-size:14px;color:#374151;margin:0 0 6px;">טלפון: <strong>${otherPhone}</strong></p>` : ""}
        ${otherEmail ? `<p style="font-size:14px;color:#374151;margin:0;">מייל: <strong>${otherEmail}</strong></p>` : ""}
      </div>

      ${matchUrl ? `
      <div style="text-align:center;margin:0 0 8px;">
        <a href="${matchUrl}"
           style="display:inline-block;padding:13px 28px;background:#059669;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:bold;">
          לצפייה בפרופיל המלא
        </a>
        <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">הקישור מחייב כניסה לאתר</p>
      </div>
      ` : ""}

      <p style="font-size:11px;color:#9ca3af;margin-top:28px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;">
        Ronel Lovely — ronel-lovely.com
      </p>
    </div>`;
  };

  // ── Send email notifications ───────────────────────────────────────────────
  let notificationsSent = 0;
  const notificationErrors: string[] = [];

  // Notify original sender (from / A) — email includes B's contact details
  if (from.email) {
    const subject = mode === "inquiry"
      ? `${to.name} רואה פוטנציאל ו${to.gender === "נקבה" ? "מעוניינת" : "מעוניין"} בפרטים נוספים — Ronel Lovely`
      : `🎉 ${to.name} גם ${to.gender === "נקבה" ? "מעוניינת" : "מעוניין"} — Ronel Lovely`;
    const result = await sendEmailWithLog({
      to: from.email,
      subject,
      html: matchEmail(from, "from", to.name, to.phone, to.email, to.gender),
      context: `${emailContextSuffix}_from`,
      fromCandidateId: tokenData.from_candidate_id as number,
      toCandidateId: tokenData.to_candidate_id as number,
    });
    if (result.success) notificationsSent++;
    else notificationErrors.push(`מייל ל${from.name}: ${result.error}`);
  }

  // Notify confirmer (to / B) — email includes A's contact details
  if (to.email) {
    const result = await sendEmailWithLog({
      to: to.email,
      subject: `🎉 אישרת עניין — ${from.name} גם ${from.gender === "נקבה" ? "מעוניינת" : "מעוניין"} — Ronel Lovely`,
      html: matchEmail(to, "to", from.name, from.phone, from.email, from.gender),
      context: `${emailContextSuffix}_to`,
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

export async function confirmMutualInterest(token: string): Promise<ConfirmResult> {
  return completeInterestConfirmation(token, "mutual");
}

/**
 * Lighter alternative to full confirmation: the recipient wants contact
 * details exchanged so they can inquire before committing to meet, but
 * neither candidate should be marked תפוס yet.
 */
export async function confirmInquiryInterest(token: string): Promise<ConfirmResult> {
  return completeInterestConfirmation(token, "inquiry");
}
