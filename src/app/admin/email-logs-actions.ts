"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type EmailLog = {
  id: number;
  sent_at: string;
  to_address: string;
  subject: string;
  status: string;
  error_message: string | null;
  context: string;
  from_candidate_id: number | null;
  to_candidate_id: number | null;
};

export async function getEmailLogs(): Promise<EmailLog[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("email_logs")
    .select("id, sent_at, to_address, subject, status, error_message, context, from_candidate_id, to_candidate_id")
    .order("sent_at", { ascending: false })
    .limit(200);
  return (data ?? []) as EmailLog[];
}
