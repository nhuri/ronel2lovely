"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { FOLLOWUP_DELAY_OPTIONS, type FollowupDelay } from "@/lib/followup";
import {
  DIGEST_INTERVAL_OPTIONS,
  DEFAULT_NOTIFICATION_TYPE_MODES,
  ALL_NOTIFICATION_TYPES,
  type AdminNotificationTypeModes,
} from "@/lib/adminNotificationTypes";

export async function getMaxRecommendations(): Promise<number | "all"> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "max_recommendations")
    .single();
  if (!data) return 6;
  if (data.value === "all") return "all";
  const parsed = parseInt(data.value, 10);
  return isNaN(parsed) ? 6 : parsed;
}

export async function saveMaxRecommendations(
  value: number | "all"
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const strValue = value === "all" ? "all" : String(value);
  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "max_recommendations", value: strValue });
  if (error) {
    console.error("Settings save error:", error);
    return { success: false, error: "שגיאה בשמירת ההגדרות" };
  }
  return { success: true };
}

export async function getFollowupDelays(): Promise<{ first: FollowupDelay; second: FollowupDelay }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["followup_first_delay", "followup_second_delay"]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const valid = FOLLOWUP_DELAY_OPTIONS.map((o) => o.value);
  const first = valid.includes(map["followup_first_delay"] as FollowupDelay)
    ? (map["followup_first_delay"] as FollowupDelay)
    : "7d";
  const second = valid.includes(map["followup_second_delay"] as FollowupDelay)
    ? (map["followup_second_delay"] as FollowupDelay)
    : "30d";

  return { first, second };
}

export async function saveFollowupDelays(
  first: string,
  second: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("site_settings").upsert([
    { key: "followup_first_delay", value: first },
    { key: "followup_second_delay", value: second },
  ]);
  if (error) {
    console.error("Followup delay save error:", error);
    return { success: false, error: "שגיאה בשמירת ההגדרות" };
  }
  return { success: true };
}

/** Read, per notification type, whether it's sent immediately or batched into the periodic digest — plus the digest interval. */
export async function getAdminNotificationSettings(): Promise<{
  typeModes: AdminNotificationTypeModes;
  intervalMinutes: number;
}> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["admin_notification_type_modes", "admin_notification_interval_minutes"]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const typeModes: AdminNotificationTypeModes = { ...DEFAULT_NOTIFICATION_TYPE_MODES };
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
