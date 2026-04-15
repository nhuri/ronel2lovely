"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { FOLLOWUP_DELAY_OPTIONS, type FollowupDelay } from "@/lib/followup";

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
