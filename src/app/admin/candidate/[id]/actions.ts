"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { isValidRemovalReason } from "@/lib/removalReasons";
import { applyProfileUpdate, applyEmailUpdate, applyMarriageViaInitiative, type ProfileActionResult } from "@/app/my-profile/actions";
import { queueAdminNotification } from "@/lib/adminNotifications";

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

/** Admin: edit a candidate's profile directly, reusing the same validation the candidate's own edit form uses */
export async function updateCandidateProfileAsAdmin(
  formData: FormData,
  candidateId: number
): Promise<ProfileActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  // Use admin client to bypass RLS — see freezeCandidateProfile below.
  const adminClient = createSupabaseAdminClient();
  return applyProfileUpdate(adminClient, candidateId, formData);
}

/** Admin: set/change a candidate's email, reusing the same logic the candidate's own email form uses */
export async function updateCandidateEmailAsAdmin(
  candidateId: number,
  newEmail: string
): Promise<ProfileActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  const adminClient = createSupabaseAdminClient();
  return applyEmailUpdate(adminClient, candidateId, newEmail);
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

  // Use admin client to bypass RLS — the candidates table's only UPDATE
  // policy is scoped to the candidate's own manager_id, not admins.
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
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

/** Admin: freeze a candidate as married/engaged through the initiative (mirrors reportMarriageViaInitiative) */
export async function reportMarriageViaInitiativeAsAdmin(
  candidateId: number,
  partnerPhone: string
): Promise<ActionResult> {
  const verified = await verifyAdmin();
  if (!verified) return { error: "אין הרשאה" };

  const adminClient = createSupabaseAdminClient();
  const result = await applyMarriageViaInitiative(adminClient, candidateId, partnerPhone, "admin");
  if (result.error) return { error: result.error };

  await queueAdminNotification({
    type: "candidate_self_froze",
    message: `🎉 המועמד/ת <strong>${result.fullName}</strong> סומן/ה כמי שהתחתן/ה דרך המיזם (ע״י מנהל).`,
    linkUrl: `https://ronel-lovely.com/admin/candidate/${candidateId}`,
    candidateId,
  }).catch(() => {}); // Non-critical

  return { success: true };
}

/** Admin: restore (unfreeze) a candidate profile */
export async function restoreCandidateProfile(
  candidateId: number
): Promise<ActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה" };

  // Use admin client to bypass RLS — see freezeCandidateProfile above.
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
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
