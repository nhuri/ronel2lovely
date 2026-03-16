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
