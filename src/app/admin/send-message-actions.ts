"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTwilioSms } from "@/lib/twilio";
import { Resend } from "resend";

export type BulkMessageResult = {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

export async function sendBulkMessage(
  candidateIds: number[],
  message: string,
  channel: "sms" | "email"
): Promise<BulkMessageResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role === "candidate") {
    return { sent: 0, failed: 0, skipped: 0, errors: ["אין הרשאה לבצע פעולה זו"] };
  }

  if (!message.trim()) {
    return { sent: 0, failed: 0, skipped: 0, errors: ["הודעה ריקה"] };
  }

  if (candidateIds.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, errors: ["לא נבחרו מועמדים"] };
  }

  const { data: candidates, error: fetchError } = await supabase
    .from("candidates")
    .select("id, full_name, phone_number, email")
    .in("id", candidateIds);

  if (fetchError || !candidates) {
    return { sent: 0, failed: 0, skipped: 0, errors: ["שגיאה בשליפת נתוני מועמדים"] };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (channel === "sms") {
    for (const candidate of candidates) {
      const phone = candidate.phone_number;
      if (!phone) {
        skipped++;
        continue;
      }
      try {
        await sendTwilioSms(phone, message);
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${candidate.full_name}: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
      }
    }
  } else {
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const candidate of candidates) {
      const email = candidate.email;
      if (!email || email.endsWith("@sms.ronellovely.co.il")) {
        skipped++;
        continue;
      }
      try {
        await resend.emails.send({
          from: "Ronel Lovely <onboarding@resend.dev>",
          replyTo: "ronel2lovely@gmail.com",
          to: email,
          subject: "הודעה מ-Ronel Lovely",
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Ronel Lovely</h1>
                <p style="color: #bae6fd; margin: 4px 0 0; font-size: 13px;">הודעה מהמערכת</p>
              </div>
              <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          `,
        });
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${candidate.full_name}: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
      }
    }
  }

  return { sent, failed, skipped, errors };
}
