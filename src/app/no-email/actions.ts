"use server";

import { randomUUID } from "crypto";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { toE164 } from "@/lib/phone";
import { sendTwilioSms } from "@/lib/twilio";
import { sendEmailWithLog } from "@/lib/email";
import { redirect } from "next/navigation";
import { isValidRemovalReason } from "@/lib/removalReasons";

type ActionResult = { success?: boolean; error?: string };

async function lookupOtp(e164Phone: string, token: string) {
  const admin = createSupabaseAdminClient();
  const { data: otp } = await admin
    .from("sms_otps")
    .select("id")
    .eq("phone", e164Phone)
    .eq("code", token)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { admin, otp };
}

/** Send OTP to the phone number, optionally verifying it belongs to candidateId */
export async function sendNoEmailOtp(
  phone: string,
  candidateId: number | null
): Promise<ActionResult> {
  // Use admin client — user is unauthenticated, RLS would block the regular client
  const admin = createSupabaseAdminClient();
  const e164Phone = toE164(phone);

  let query = admin.from("candidates").select("id").eq("phone_number", e164Phone);
  if (candidateId !== null) query = query.eq("id", candidateId);
  const { data: candidate } = await query.maybeSingle();

  if (!candidate) {
    return { error: candidateId !== null ? "מספר הטלפון אינו תואם לפרופיל זה" : "מספר הטלפון לא נמצא במערכת" };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertError } = await admin
    .from("sms_otps")
    .insert({ phone: e164Phone, code, expires_at: expiresAt });

  if (insertError) {
    return { error: "שגיאה בשמירת קוד האימות. נסה שוב מאוחר יותר." };
  }

  try {
    await sendTwilioSms(
      e164Phone,
      `קוד האימות שלך באתר Ronel Lovely: ${code}`
    );
  } catch {
    return { error: "שגיאה בשליחת SMS. נסה שוב מאוחר יותר." };
  }

  return { success: true };
}

/** Validate OTP without consuming it (used for the "view" flow pre-check) */
export async function validateNoEmailOtp(
  phone: string,
  token: string
): Promise<ActionResult> {
  const e164Phone = toE164(phone);
  const { otp } = await lookupOtp(e164Phone, token);
  if (!otp) return { error: "קוד אימות שגוי או שפג תוקפו" };
  return { success: true };
}

/** Verify OTP then freeze (soft-delete) the candidate's profile */
export async function verifyAndFreeze(
  phone: string,
  token: string,
  candidateId: number | null,
  reason: string,
  reasonOther: string
): Promise<ActionResult> {
  if (!isValidRemovalReason(reason)) {
    return { error: "יש לבחור סיבה להסרת הפרופיל" };
  }
  const trimmedOther = reasonOther.trim();
  if (reason === "other" && !trimmedOther) {
    return { error: "יש לפרט את הסיבה" };
  }

  const e164Phone = toE164(phone);
  const { admin, otp } = await lookupOtp(e164Phone, token);

  if (!otp) return { error: "קוד אימות שגוי או שפג תוקפו" };
  await admin.from("sms_otps").delete().eq("id", otp.id);

  let query = admin.from("candidates").select("id").eq("phone_number", e164Phone);
  if (candidateId !== null) query = query.eq("id", candidateId);
  const { data: candidate } = await query.maybeSingle();

  if (!candidate) return { error: "מספר הטלפון אינו תואם לפרופיל זה" };

  const { error } = await admin
    .from("candidates")
    .update({
      availability_status: "הקפאה",
      removal_reason: reason,
      removal_reason_other: reason === "other" ? trimmedOther : null,
      removed_by: "candidate",
    })
    .eq("id", candidate.id);

  if (error) return { error: "שגיאה בהסרת הפרופיל. נסה שוב." };

  return { success: true };
}

/** Verify OTP, save email to candidate, create auth session, redirect to proposals */
export async function verifyAndAddEmail(
  phone: string,
  token: string,
  email: string,
  candidateId: number | null
): Promise<ActionResult> {
  const e164Phone = toE164(phone);
  const { admin, otp } = await lookupOtp(e164Phone, token);

  if (!otp) return { error: "קוד אימות שגוי או שפג תוקפו" };
  await admin.from("sms_otps").delete().eq("id", otp.id);

  let query = admin.from("candidates").select("id, manager_id, full_name, gender").eq("phone_number", e164Phone);
  if (candidateId !== null) query = query.eq("id", candidateId);
  const { data: candidate } = await query.maybeSingle();

  if (!candidate) return { error: "מספר הטלפון אינו תואם לפרופיל זה" };

  const normalizedEmail = email.trim().toLowerCase();

  // Check email not taken by another candidate
  const { data: takenBy } = await admin
    .from("candidates")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", candidateId)
    .maybeSingle();

  if (takenBy) return { error: "כתובת המייל כבר קיימת במערכת" };

  await admin
    .from("candidates")
    .update({ email: normalizedEmail })
    .eq("id", candidateId);

  // Find or create auth user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authUser: any = null;

  if (candidate.manager_id) {
    const { data: existing } = await admin.auth.admin.getUserById(
      candidate.manager_id
    );
    authUser = existing?.user;
    if (authUser) {
      await admin.auth.admin.updateUserById(authUser.id, {
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { role: "candidate" },
      });
    }
  }

  if (!authUser) {
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { role: "candidate" },
      });
    if (createError) return { error: "שגיאה ביצירת חשבון. נסה שוב." };
    authUser = newUser.user;

    await admin
      .from("candidates")
      .update({ manager_id: authUser.id })
      .eq("id", candidateId);
  }

  // Establish session via magic link
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

  if (linkError || !linkData) return { error: "שגיאה בהתחברות. נסה שוב." };

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: linkData.properties.email_otp,
    type: "email",
  });

  if (verifyError) return { error: "שגיאה בהתחברות. נסה שוב." };

  await sendEmailWithLog({
    to: normalizedEmail,
    subject: "כתובת המייל שלך עודכנה באתר Ronel Lovely",
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #374151;">
        <p style="font-size: 13px; color: #0284c7; font-weight: bold; margin: 0 0 4px;">Ronel Lovely</p>
        <p style="font-size: 15px; line-height: 1.8; margin: 16px 0;">
          כתובת המייל שלך עודכנה בהצלחה לאתר השידוכים ronel-lovely.
        </p>
        <p style="font-size: 13px; color: #6b7280;">מעתה תקבל/י עדכונים והצעות שידוך ישירות למייל זה.</p>
      </div>
    `,
    context: "email_updated",
    toCandidateId: candidateId,
  });

  // Send interest emails for all open proposals where this candidate is the recipient
  const recipientName = candidate.full_name as string;
  const recipientGender = candidate.gender as string;
  const dear = recipientGender === "זכר" ? "היקר" : "היקרה";

  const { data: openProposals } = await admin
    .from("proposals")
    .select("id, candidate_id_1")
    .eq("candidate_id_2", candidateId)
    .eq("status", "1");

  if (openProposals && openProposals.length > 0) {
    for (const proposal of openProposals) {
      const { data: sender } = await admin
        .from("candidates")
        .select("id, full_name, gender")
        .eq("id", proposal.candidate_id_1)
        .maybeSingle();

      if (!sender) continue;

      const senderName = sender.full_name as string;
      const senderGender = sender.gender as string;
      const senderTitle = senderGender === "זכר" ? "המועמד" : "המועמדת";
      const senderWants = senderGender === "זכר" ? "מעוניין" : "מעוניינת";

      const token = randomUUID();
      await admin.from("interest_tokens").insert({
        token,
        proposal_id: proposal.id,
        from_candidate_id: proposal.candidate_id_1,
        to_candidate_id: candidateId,
      });

      const confirmUrl = `https://ronel-lovely.com/confirm-interest?token=${token}`;

      await sendEmailWithLog({
        to: normalizedEmail,
        subject: `${senderName} ${senderWants} לבדוק התאמה איתך — Ronel Lovely`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #374151;">
            <p style="font-size: 13px; color: #0284c7; font-weight: bold; margin: 0 0 4px;">Ronel Lovely</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
              בונים בתים לזכרו של רונאל
            </p>
            <p style="font-size: 16px; margin: 0 0 16px;">שלום ${recipientName} ${dear},</p>
            <p style="font-size: 15px; line-height: 1.8; margin: 0 0 20px;">
              ${senderTitle} <strong>${senderName}</strong> ${senderWants} לבדוק התאמה לפתיחת הצעה איתך.
            </p>
            <div style="text-align: center; margin: 0 0 8px;">
              <a href="${confirmUrl}"
                 style="display: inline-block; padding: 13px 28px; background: #059669; color: white; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: bold;">
                צפייה בפרופיל
              </a>
            </div>
            <p style="font-size: 11px; color: #9ca3af; margin-top: 28px; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center;">
              Ronel Lovely — ronel-lovely.com
            </p>
          </div>
        `,
        context: "interest_email",
        fromCandidateId: proposal.candidate_id_1,
        toCandidateId: candidateId,
      });
    }
  }

  redirect("/my-profile/proposals?interest_email_sent=1");
}
