"use server";

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { toE164 } from "@/lib/phone";
import { sendTwilioSms } from "@/lib/twilio";
import { sendEmailWithLog } from "@/lib/email";
import { redirect } from "next/navigation";

type ActionResult = { success?: boolean; error?: string };

/** Send OTP to the phone number, verifying it belongs to the given candidateId */
export async function sendNoEmailOtp(
  phone: string,
  candidateId: number
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const e164Phone = toE164(phone);

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .eq("phone_number", e164Phone)
    .maybeSingle();

  if (!candidate) {
    return { error: "מספר הטלפון אינו תואם לפרופיל זה" };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase
    .from("sms_otps")
    .insert({ phone: e164Phone, code, expires_at: expiresAt });

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

/** Verify OTP then freeze (soft-delete) the candidate's profile */
export async function verifyAndFreeze(
  phone: string,
  token: string,
  candidateId: number
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const e164Phone = toE164(phone);

  const { data: otp } = await supabase
    .from("sms_otps")
    .select("id")
    .eq("phone", e164Phone)
    .eq("code", token)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { error: "קוד אימות שגוי או שפג תוקפו" };
  await supabase.from("sms_otps").delete().eq("id", otp.id);

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .eq("phone_number", e164Phone)
    .maybeSingle();

  if (!candidate) return { error: "מספר הטלפון אינו תואם לפרופיל זה" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("candidates")
    .update({ availability_status: "הקפאה" })
    .eq("id", candidateId);

  if (error) return { error: "שגיאה בהסרת הפרופיל. נסה שוב." };

  return { success: true };
}

/** Verify OTP, save email to candidate, create auth session, redirect to recommendations */
export async function verifyAndAddEmail(
  phone: string,
  token: string,
  email: string,
  candidateId: number
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const e164Phone = toE164(phone);

  const { data: otp } = await supabase
    .from("sms_otps")
    .select("id")
    .eq("phone", e164Phone)
    .eq("code", token)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { error: "קוד אימות שגוי או שפג תוקפו" };
  await supabase.from("sms_otps").delete().eq("id", otp.id);

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, manager_id")
    .eq("id", candidateId)
    .eq("phone_number", e164Phone)
    .maybeSingle();

  if (!candidate) return { error: "מספר הטלפון אינו תואם לפרופיל זה" };

  const normalizedEmail = email.trim().toLowerCase();

  // Check email not taken by another candidate
  const { data: takenBy } = await supabase
    .from("candidates")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", candidateId)
    .maybeSingle();

  if (takenBy) return { error: "כתובת המייל כבר קיימת במערכת" };

  const admin = createSupabaseAdminClient();

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

  redirect("/my-profile/recommendations");
}
