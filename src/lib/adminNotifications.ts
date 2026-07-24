// Server-only logic. Never import this from a Client Component — it pulls
// in the Supabase admin (service-role) client. Client-safe types/constants
// live in "./adminNotificationTypes"; the get/save Server Actions used by
// the admin settings UI live in "@/app/admin/settings-actions".

import { createSupabaseAdminClient } from "./supabase/server";
import { sendEmailWithLog } from "./email";
import { getAdminNotificationSettings } from "@/app/admin/settings-actions";
import { NOTIFICATION_TYPE_LABELS, type AdminNotificationType } from "./adminNotificationTypes";

const ADMIN_EMAIL = "ronel2lovely@gmail.com";

function buildNotificationHtml(message: string, linkUrl?: string | null): string {
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#0284c7;font-weight:bold;margin:0 0 4px;">Ronel Lovely — התראה פנימית</p>
      <p style="font-size:15px;line-height:1.8;margin:16px 0;">${message}</p>
      ${linkUrl ? `<div style="text-align:center;margin:0 0 20px;"><a href="${linkUrl}" style="display:inline-block;padding:13px 28px;background:#0284c7;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:bold;">צפייה</a></div>` : ""}
    </div>`;
}

/**
 * Queue an admin-facing notification. Per its type's configured mode, it's
 * either stored for the next /api/cron/admin-digest run to batch, or
 * emailed right away.
 */
export async function queueAdminNotification(opts: {
  type: AdminNotificationType;
  message: string;
  linkUrl?: string | null;
  candidateId?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const { typeModes } = await getAdminNotificationSettings();

  if (typeModes[opts.type] === "immediate") {
    return sendEmailWithLog({
      to: ADMIN_EMAIL,
      subject: NOTIFICATION_TYPE_LABELS[opts.type],
      html: buildNotificationHtml(opts.message, opts.linkUrl),
      context: opts.type,
      toCandidateId: opts.candidateId ?? null,
    });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("pending_admin_notifications").insert({
    type: opts.type,
    message: opts.message,
    link_url: opts.linkUrl ?? null,
    candidate_id: opts.candidateId ?? null,
  });

  if (error) {
    console.error("[AdminNotification] Failed to queue:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}
