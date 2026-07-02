"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidRemovalReason } from "@/lib/removalReasons";

export type ActionResult = { error?: string; success?: boolean };

async function verifyAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role === "candidate") return null;
  return supabase;
}

export async function addAdminNote(
  candidateId: number,
  noteText: string
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  const trimmed = noteText.trim();
  if (!trimmed) return { error: "תוכן ההערה ריק" };

  const { error } = await supabase
    .from("admin_notes")
    .insert({ candidate_id: candidateId, note_text: trimmed });

  if (error) return { error: error.message };
  return { success: true };
}

export async function replyToInquiry(
  inquiryId: number,
  replyText: string
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  const trimmed = replyText.trim();
  if (!trimmed) return { error: "תוכן התגובה ריק" };

  const { error } = await supabase
    .from("inquiries")
    .update({
      admin_reply: trimmed,
      replied_at: new Date().toISOString(),
      is_read: true,
    })
    .eq("id", inquiryId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markInquiryRead(
  inquiryId: number
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  const { error } = await supabase
    .from("inquiries")
    .update({ is_read: true })
    .eq("id", inquiryId);

  if (error) return { error: error.message };
  return { success: true };
}

/** Admin: soft delete (freeze) a candidate profile, recording the reason */
export async function freezeCandidateProfile(
  candidateId: number,
  reason: string,
  reasonOther: string
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  if (!isValidRemovalReason(reason)) {
    return { error: "יש לבחור סיבה להקפאת הפרופיל" };
  }
  const trimmedOther = reasonOther.trim();
  if (reason === "other" && !trimmedOther) {
    return { error: "יש לפרט את הסיבה" };
  }

  const { error } = await supabase
    .from("candidates")
    .update({
      availability_status: "הקפאה",
      removal_reason: reason,
      removal_reason_other: reason === "other" ? trimmedOther : null,
      removed_by: "admin",
    })
    .eq("id", candidateId);

  if (error) return { error: error.message };
  return { success: true };
}

/** Admin: restore (unfreeze) a candidate profile */
export async function restoreCandidateProfile(
  candidateId: number
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  const { error } = await supabase
    .from("candidates")
    .update({
      availability_status: null,
      removal_reason: null,
      removal_reason_other: null,
      removed_by: null,
    })
    .eq("id", candidateId);

  if (error) return { error: error.message };
  return { success: true };
}
