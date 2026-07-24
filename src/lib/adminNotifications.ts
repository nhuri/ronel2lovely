import { createSupabaseAdminClient } from "./supabase/server";
import { sendEmailWithLog } from "./email";

export type AdminNotificationType =
  | "new_candidate_admin_alert"
  | "candidate_self_froze"
  | "daily_proposal_limit_reached"
  | "unfreeze_request"
  | "candidate_email_update";

export type AdminNotificationMode = "immediate" | "digest";

export type AdminNotificationTypeModes = Record<AdminNotificationType, AdminNotificationMode>;

export const DIGEST_INTERVAL_OPTIONS = [
  { value: 60, label: "כל שעה" },
  { value: 120, label: "כל שעתיים" },
  { value: 240, label: "כל 4 שעות" },
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<AdminNotificationType, string> = {
  new_candidate_admin_alert: "הצטרפות מועמד חדש",
  daily_proposal_limit_reached: "מכסת הצעות יומית",
  candidate_self_froze: "הקפאת פרופיל עצמית",
  unfreeze_request: "בקשת שחרור הקפאה",
  candidate_email_update: "עדכון כתובת מייל",
};

const ALL_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as AdminNotificationType[];

const DEFAULT_TYPE_MODES: AdminNotificationTypeModes = {
  new_candidate_admin_alert: "digest",
  daily_proposal_limit_reached: "digest",
  candidate_self_froze: "digest",
  unfreeze_request: "digest",
  candidate_email_update: "digest",
};

const ADMIN_EMAIL = "ronel2lovely@gmail.com";

function buildNotificationHtml(message: string, linkUrl?: string | null): string {
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#0284c7;font-weight:bold;margin:0 0 4px;">Ronel Lovely — התראה פנימית</p>
      <p style="font-size:15px;line-height:1.8;margin:16px 0;">${message}</p>
      ${linkUrl ? `<div style="text-align:center;margin:0 0 20px;"><a href="${linkUrl}" style="display:inline-block;padding:13px 28px;background:#0284c7;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:bold;">צפייה</a></div>` : ""}
    </div>`;
}

/** Read, per notification type, whether it's sent immediately or batched into the periodic digest — plus the digest interval. */
export async function getAdminNotificationSettings(): Promise<{
  typeModes: AdminNotificationTypeModes;
  intervalMinutes: number;
}> {
  "use server";
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["admin_notification_type_modes", "admin_notification_interval_minutes"]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const typeModes: AdminNotificationTypeModes = { ...DEFAULT_TYPE_MODES };
  if (map["admin_notification_type_modes"]) {
    try {
      const parsed = JSON.parse(map["admin_notification_type_modes"]) as Record<string, string>;
      for (const type of ALL_NOTIFICATION_TYPES) {
        if (parsed[type] === "immediate" || parsed[type] === "digest") {
          typeModes[type] = parsed[type];
        }
      }
    } catch {
      // Malformed value — fall back to defaults for everything.
    }
  }

  const parsedInterval = parseInt(map["admin_notification_interval_minutes"] ?? "", 10);
  const validIntervals: number[] = DIGEST_INTERVAL_OPTIONS.map((o) => o.value);
  const intervalMinutes = validIntervals.includes(parsedInterval) ? parsedInterval : 60;

  return { typeModes, intervalMinutes };
}

/** Save, per notification type, whether it's sent immediately or batched — plus the digest interval. */
export async function saveAdminNotificationSettings(
  typeModes: AdminNotificationTypeModes,
  intervalMinutes: number
): Promise<{ success: boolean; error?: string }> {
  "use server";
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("site_settings").upsert([
    { key: "admin_notification_type_modes", value: JSON.stringify(typeModes) },
    { key: "admin_notification_interval_minutes", value: String(intervalMinutes) },
  ]);
  if (error) {
    console.error("Admin notification settings save error:", error);
    return { success: false, error: "שגיאה בשמירת ההגדרות" };
  }
  return { success: true };
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
