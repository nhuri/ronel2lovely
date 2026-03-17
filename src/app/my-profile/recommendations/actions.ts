"use server";

import { randomUUID } from "crypto";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";

export async function sendInterestEmail(
  candidateId: number,
  matchCandidateId: number
): Promise<{ success: boolean; message: string }> {
  const supabase = await createSupabaseServerClient();

  // Verify the current user owns this candidate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "לא מחובר" };
  }

  // Fetch both candidates
  const [{ data: sender }, { data: recipient }] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, full_name, gender")
      .eq("id", candidateId)
      .single(),
    supabase
      .from("candidates")
      .select("id, full_name, gender, email")
      .eq("id", matchCandidateId)
      .single(),
  ]);

  if (!sender || !recipient) {
    return { success: false, message: "לא נמצאו פרטי המועמדים" };
  }

  const recipientEmail = recipient.email as string | null;
  if (!recipientEmail || recipientEmail.trim() === "" || recipientEmail.endsWith("@sms.ronellovely.co.il")) {
    return {
      success: false,
      message: "למועמד/ת זו אין כתובת מייל. ניתן לפנות לצוות האתר.",
    };
  }

  const senderName = sender.full_name as string;
  const senderGender = sender.gender as string;
  const recipientName = recipient.full_name as string;
  const recipientGender = recipient.gender as string;

  // Gender-aware Hebrew text
  const senderTitle = senderGender === "זכר" ? "המועמד" : "המועמדת";
  const senderWants = senderGender === "זכר" ? "מעוניין" : "מעוניינת";
  const dear = recipientGender === "זכר" ? "היקר" : "היקרה";
  const recipientAlsoInterested = recipientGender === "זכר" ? "כן, גם אני מעוניין!" : "כן, גם אני מעוניינת!";

  // ── Create proposal + interest token BEFORE building email ──────────────────
  let confirmUrl: string | null = null;
  let matchUrl: string | null = null;
  try {
    const adminClient = createSupabaseAdminClient();

    let proposalId: number | null = null;
    const { data: existing } = await adminClient
      .from("proposals")
      .select("id")
      .or(
        `and(candidate_id_1.eq.${candidateId},candidate_id_2.eq.${matchCandidateId}),and(candidate_id_1.eq.${matchCandidateId},candidate_id_2.eq.${candidateId})`
      )
      .limit(1)
      .maybeSingle();

    if (existing) {
      proposalId = existing.id;
    } else {
      const { data: newProposal } = await adminClient
        .from("proposals")
        .insert({
          candidate_id_1: candidateId,
          candidate_id_2: matchCandidateId,
          status: "1",
        })
        .select("id")
        .single();
      proposalId = newProposal?.id ?? null;
    }

    if (proposalId) {
      const token = randomUUID();
      await adminClient.from("interest_tokens").insert({
        token,
        proposal_id: proposalId,
        from_candidate_id: candidateId,
        to_candidate_id: matchCandidateId,
      });
      confirmUrl = `https://ronel-lovely.com/confirm-interest?token=${token}`;
      matchUrl = `https://ronel-lovely.com/my-profile/match/${proposalId}`;
    }
  } catch (e) {
    console.error("Proposal/token creation error:", e);
    // Non-critical — email will still be sent without the buttons
  }

  // ── Minimal, text-like email (no personal data — reduces spam score) ────────
  const emailHtml = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #374151;">

      <p style="font-size: 13px; color: #0284c7; font-weight: bold; margin: 0 0 4px;">Ronel Lovely</p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
        בונים בתים לזכרו של רונאל
      </p>

      <p style="font-size: 16px; margin: 0 0 16px;">שלום ${recipientName} ${dear},</p>

      <p style="font-size: 15px; line-height: 1.8; margin: 0 0 20px;">
        ${senderTitle} <strong>${senderName}</strong> ${senderWants} לבדוק התאמה לפתיחת הצעה איתך.
      </p>

      ${matchUrl ? `
      <div style="text-align: center; margin: 0 0 16px;">
        <a href="${matchUrl}"
           style="display: inline-block; padding: 13px 28px; background: #0284c7; color: white; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: bold;">
          צפה/י בפרופיל המלא
        </a>
        <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0;">הקישור מחייב כניסה לאתר</p>
      </div>
      ` : ""}

      ${confirmUrl ? `
      <div style="text-align: center; margin: 8px 0 0;">
        <a href="${confirmUrl}"
           style="display: inline-block; padding: 13px 28px; background: #059669; color: white; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: bold;">
          ✓ ${recipientAlsoInterested}
        </a>
        <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0;">לחיצה תשלח לשניכם פרטי התקשרות. הקישור תקף ל-14 יום.</p>
      </div>
      ` : ""}

      <p style="font-size: 11px; color: #9ca3af; margin-top: 28px; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center;">
        Ronel Lovely — ronel-lovely.com
      </p>
    </div>
  `;

  const result = await sendEmailWithLog({
    to: recipientEmail,
    subject: `${senderName} ${senderWants} לבדוק התאמה איתך — Ronel Lovely`,
    html: emailHtml,
    context: "interest_email",
    fromCandidateId: candidateId,
    toCandidateId: matchCandidateId,
  });

  if (result.success) return { success: true, message: "המייל נשלח בהצלחה!" };
  return { success: false, message: "שגיאה בשליחת המייל. נסה שוב מאוחר יותר." };
}
