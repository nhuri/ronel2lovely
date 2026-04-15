"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

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

// Valid delay values and their ms equivalents
export const FOLLOWUP_DELAY_OPTIONS = [
  { value: "1m",  label: "דקה אחת (לבדיקה)" },
  { value: "1h",  label: "שעה אחת" },
  { value: "1d",  label: "יום אחד" },
  { value: "7d",  label: "שבוע" },
  { value: "30d", label: "חודש" },
] as const;
export type FollowupDelay = typeof FOLLOWUP_DELAY_OPTIONS[number]["value"];

export function followupDelayToMs(delay: string): number {
  switch (delay) {
    case "1m":  return 60 * 1000;
    case "1h":  return 60 * 60 * 1000;
    case "1d":  return 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    default:    return 7 * 24 * 60 * 60 * 1000; // "7d"
  }
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
