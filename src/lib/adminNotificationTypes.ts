// Pure types and constants only — no server-only imports (no Supabase admin
// client, no "use server"). This file is imported directly by client
// components (the admin settings UI), so it must stay safe to bundle
// client-side.

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

export const ALL_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as AdminNotificationType[];

export const DEFAULT_NOTIFICATION_TYPE_MODES: AdminNotificationTypeModes = {
  new_candidate_admin_alert: "digest",
  daily_proposal_limit_reached: "digest",
  candidate_self_froze: "digest",
  unfreeze_request: "digest",
  candidate_email_update: "digest",
};
