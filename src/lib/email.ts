import { Resend } from "resend";
import { createSupabaseAdminClient } from "./supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend and log the attempt (success or failure) to the
 * email_logs Supabase table so admins can see every outbound email.
 */
export async function sendEmailWithLog(opts: {
  to: string;
  subject: string;
  html: string;
  /** Identifies the flow, e.g. "interest_email" | "mutual_confirmation_from" | "mutual_confirmation_to" | "bulk_message" */
  context: string;
  fromCandidateId?: number | null;
  toCandidateId?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  let status = "sent";
  let errorMessage: string | undefined;

  try {
    await resend.emails.send({
      from: "Ronel Lovely <noreply@ronel-lovely.com>",
      replyTo: "ronel2lovely@gmail.com",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[Email] Failed to send to ${opts.to}:`, errorMessage);
  }

  // Log to DB — best-effort, never throws
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("email_logs").insert({
      to_address: opts.to,
      subject: opts.subject,
      status,
      error_message: errorMessage ?? null,
      context: opts.context,
      from_candidate_id: opts.fromCandidateId ?? null,
      to_candidate_id: opts.toCandidateId ?? null,
    });
  } catch (logErr) {
    console.error("[Email] Failed to write log:", logErr);
  }

  return status === "sent"
    ? { success: true }
    : { success: false, error: errorMessage };
}
