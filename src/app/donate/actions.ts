"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function recordDonation(
  amount: number,
  fullName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!amount || amount <= 0) {
    return { success: false, error: "סכום לא תקין" };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("donations").insert({
    amount,
    full_name: fullName?.trim() || null,
  });

  if (error) {
    console.error("Donation insert error:", error);
    return { success: false, error: "שגיאה בשמירת הנתונים. נסה שוב." };
  }

  return { success: true };
}
