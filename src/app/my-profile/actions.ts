"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isTerminalStatus } from "@/lib/proposals";
import { toE164 } from "@/lib/phone";

export type FieldErrors = Record<string, string>;
export type ProfileActionResult = {
  error?: string;
  fieldErrors?: FieldErrors;
  success?: boolean;
  imageUrls?: string[];
};

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "full_name", label: "שם מלא" },
  { key: "phone_number", label: "מספר טלפון" },
  { key: "gender", label: "מין" },
  { key: "birth_date", label: "תאריך לידה" },
  { key: "residence", label: "עיר מגורים" },
  { key: "marital_status", label: "מצב משפחתי" },
  { key: "religious_level", label: "רמה דתית" },
  { key: "height", label: "גובה" },
  { key: "education", label: "השכלה" },
  { key: "occupation", label: "תעסוקה" },
  { key: "about_me", label: "תיאור אישי" },
  { key: "looking_for", label: "מה חשוב לי בבן/בת הזוג" },
  { key: "id_number", label: "מספר ת.ז." },
  { key: "contact_person", label: "איש קשר" },
  { key: "contact_person_phone", label: "טלפון איש קשר" },
];

const ALL_FIELDS = [...REQUIRED_FIELDS.map((f) => f.key), "children_count"];

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

type CandidateContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  candidateId: number;
};

/**
 * Verify the current user is a candidate/manager and resolve a specific candidate.
 * Uses manager_id for lookup, with email/phone fallback + automatic backfill.
 */
async function verifyCandidate(candidateId?: number): Promise<CandidateContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "candidate") {
    return null;
  }

  // Primary: manager_id lookup
  const { data: managed } = await supabase
    .from("candidates")
    .select("id")
    .eq("manager_id", user.id);

  let managedIds = (managed ?? []).map((c) => c.id);

  // Fallback: email/phone lookup + backfill manager_id
  if (managedIds.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallbackCandidate: any = null;

    if (user.email) {
      const { data } = await supabase
        .from("candidates")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      fallbackCandidate = data;
    } else {
      const dbPhone = user.user_metadata?.db_phone;
      if (dbPhone) {
        const { data } = await supabase
          .from("candidates")
          .select("id")
          .eq("phone_number", dbPhone)
          .maybeSingle();
        fallbackCandidate = data;
      }
    }

    if (!fallbackCandidate) return null;

    // Backfill manager_id
    await supabase
      .from("candidates")
      .update({ manager_id: user.id })
      .eq("id", fallbackCandidate.id)
      .is("manager_id", null);

    managedIds = [fallbackCandidate.id];
  }

  // If a specific candidate was requested, verify ownership
  if (candidateId) {
    if (!managedIds.includes(candidateId)) return null;
    return { supabase, userId: user.id, candidateId };
  }

  // Auto-select if only one candidate
  if (managedIds.length === 1) {
    return { supabase, userId: user.id, candidateId: managedIds[0] };
  }

  // Multiple candidates but no selection - cannot proceed
  return null;
}

export async function updateMyProfile(
  formData: FormData,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase } = ctx;

  const raw: Record<string, string> = {};
  for (const key of ALL_FIELDS) {
    raw[key] = ((formData.get(key) as string) ?? "").trim();
  }

  // ── Validation ──
  const fieldErrors: FieldErrors = {};

  for (const { key, label } of REQUIRED_FIELDS) {
    if (!raw[key]) {
      fieldErrors[key] = `${label} הוא שדה חובה`;
    }
  }

  // Description minimum 15 words
  if (raw.about_me) {
    const wordCount = raw.about_me
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    if (wordCount < 15) {
      fieldErrors.about_me = "תיאור אישי חייב לכלול לפחות 15 מילים";
    }
  }

  // Normalize phone numbers to E.164 (+972) format
  if (raw.phone_number) raw.phone_number = toE164(raw.phone_number);
  if (raw.contact_person_phone) raw.contact_person_phone = toE164(raw.contact_person_phone);

  // Unique phone check (exclude own record)
  if (raw.phone_number && !fieldErrors.phone_number) {
    const { data: existingPhone } = await supabase
      .from("candidates")
      .select("id, email, phone_number")
      .eq("phone_number", raw.phone_number)
      .limit(1)
      .maybeSingle();

    if (existingPhone && existingPhone.id !== ctx.candidateId) {
      fieldErrors.phone_number = "מספר הטלפון הזה כבר רשום במערכת";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // ── Handle images ──
  const keepImages: string[] = formData.getAll("keep_images") as string[];
  const newImageFiles: File[] = formData.getAll("new_images").filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  const totalImages = keepImages.length + newImageFiles.length;
  if (totalImages > 3) {
    return { error: "ניתן להעלות עד 3 תמונות" };
  }

  const uploadedUrls: string[] = [];
  if (newImageFiles.length > 0) {
    const adminClient = createSupabaseAdminClient();
    for (const file of newImageFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await adminClient.storage
        .from("candidate-images")
        .upload(path, file);
      if (uploadError) {
        return { error: `שגיאה בהעלאת תמונה: ${uploadError.message}` };
      }
      const { data: { publicUrl } } = adminClient.storage
        .from("candidate-images")
        .getPublicUrl(path);
      uploadedUrls.push(publicUrl);
    }
  }

  const finalImageUrls = [...keepImages, ...uploadedUrls];

  // ── Update only the candidate's own record ──
  const { error } = await supabase
    .from("candidates")
    .update({
      full_name: raw.full_name,
      phone_number: raw.phone_number,
      gender: raw.gender,
      birth_date: raw.birth_date,
      residence: raw.residence,
      marital_status: raw.marital_status,
      children_count: raw.children_count
        ? parseInt(raw.children_count, 10)
        : null,
      religious_level: raw.religious_level,
      height: parseInt(raw.height, 10),
      education: raw.education,
      occupation: raw.occupation,
      about_me: raw.about_me,
      looking_for: raw.looking_for,
      id_number: raw.id_number,
      contact_person: raw.contact_person,
      contact_person_phone: raw.contact_person_phone,
      age: calculateAge(raw.birth_date),
      image_urls: finalImageUrls,
    })
    .eq("id", ctx.candidateId);

  if (error) {
    return { error: error.message };
  }

  return { success: true, imageUrls: finalImageUrls };
}

export async function deleteMyProfile(
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase } = ctx;

  // Soft delete: set availability_status to 'הקפאה' instead of deleting
  const { error } = await supabase
    .from("candidates")
    .update({ availability_status: "הקפאה" })
    .eq("id", ctx.candidateId);

  if (error) {
    return { error: error.message };
  }

  // Sign out and redirect to login
  await supabase.auth.signOut();
  redirect("/login");
}

/** Restore a frozen profile (unfreeze) */
export async function restoreMyProfile(
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase } = ctx;

  const { error } = await supabase
    .from("candidates")
    .update({ availability_status: null })
    .eq("id", ctx.candidateId)
    .eq("availability_status", "הקפאה");

  if (error) {
    return { error: error.message };
  }

  redirect("/my-profile?restored=1");
}

/** Update candidate email (for phone-auth users who need to add email) */
export async function updateCandidateEmail(
  newEmail: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase, userId } = ctx;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return { error: "כתובת האימייל אינה תקינה" };
  }

  // Check email uniqueness in candidates table
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("email", newEmail)
    .limit(1)
    .maybeSingle();

  if (existingCandidate) {
    return { error: "כתובת האימייל הזו כבר רשומה במערכת" };
  }

  // 1. Update candidate record in DB
  const { error: dbError } = await supabase
    .from("candidates")
    .update({ email: newEmail })
    .eq("id", ctx.candidateId);

  if (dbError) {
    return { error: dbError.message };
  }

  // 2. Update auth user's email (auto-confirm since they verified via phone)
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });

  if (authError) {
    // Rollback the DB update
    await supabase
      .from("candidates")
      .update({ email: null })
      .eq("id", ctx.candidateId);
    return { error: authError.message };
  }

  return { success: true };
}

export async function createProposalByCandidate(
  candidateId2: number,
  notes?: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) return { error: "אין הרשאה לבצע פעולה זו" };

  const { supabase } = ctx;
  const myId = ctx.candidateId;

  if (myId === candidateId2) {
    return { error: "לא ניתן ליצור הצעה עם עצמך" };
  }

  // Validate second candidate exists and is active
  const { data: other } = await supabase
    .from("candidates")
    .select("id, availability_status")
    .eq("id", candidateId2)
    .maybeSingle();

  if (!other) return { error: "המועמד שנבחר לא נמצא" };

  if (other.availability_status === "הקפאה" || other.availability_status === "התחתנו") {
    return { error: "המועמד שנבחר מוקפא או נשוי" };
  }

  // Check for duplicate proposal
  const { data: existing } = await supabase
    .from("proposals")
    .select("id")
    .or(
      `and(candidate_id_1.eq.${myId},candidate_id_2.eq.${candidateId2}),and(candidate_id_1.eq.${candidateId2},candidate_id_2.eq.${myId})`
    )
    .limit(1)
    .maybeSingle();

  if (existing) return { error: "כבר קיימת הצעת שידוך עבור זוג זה" };

  const { error } = await supabase.from("proposals").insert({
    candidate_id_1: myId,
    candidate_id_2: candidateId2,
    status: "1",
    notes: notes?.trim() || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function submitInquiry(
  category: string,
  message: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const trimmed = message.trim();
  if (!trimmed) return { error: "תוכן הפנייה ריק" };
  if (category !== "אישי" && category !== "שדרוג") {
    return { error: "יש לבחור סיווג לפנייה" };
  }

  const { supabase } = ctx;

  const { error } = await supabase
    .from("inquiries")
    .insert({
      candidate_id: ctx.candidateId,
      category,
      message: trimmed,
    });

  if (error) return { error: error.message };
  return { success: true };
}

/** Helper to verify candidate and check they belong to a proposal */
async function verifyCandidateProposal(proposalId: number, candidateId?: number) {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) return null;

  const { supabase } = ctx;
  const cId = ctx.candidateId;

  // Get candidate name for note authoring
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name")
    .eq("id", cId)
    .maybeSingle();

  if (!candidate) return null;

  // Verify candidate is part of this proposal
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2, status")
    .eq("id", proposalId)
    .or(`candidate_id_1.eq.${cId},candidate_id_2.eq.${cId}`)
    .maybeSingle();

  if (!proposal) return null;

  return { supabase, candidateId: cId, candidateName: candidate.full_name, proposal };
}

export async function updateProposalStatusByCandidate(
  proposalId: number,
  newStatus: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const result = await verifyCandidateProposal(proposalId, candidateId);
  if (!result) return { error: "אין הרשאה לבצע פעולה זו" };

  const { supabase, proposal } = result;

  const { error } = await supabase
    .from("proposals")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { error: error.message };

  // Auto-freeze on terminal statuses
  if (isTerminalStatus(newStatus)) {
    const statusLabel = newStatus === "7" ? "התארסו" : "התחתנו";
    await supabase
      .from("candidates")
      .update({ availability_status: statusLabel })
      .in("id", [proposal.candidate_id_1, proposal.candidate_id_2]);
  }

  return { success: true };
}

export async function addProposalNoteByCandidate(
  proposalId: number,
  noteText: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const result = await verifyCandidateProposal(proposalId, candidateId);
  if (!result) return { error: "אין הרשאה לבצע פעולה זו" };

  const trimmed = noteText.trim();
  if (!trimmed) return { error: "תוכן ההערה ריק" };

  const { supabase, candidateName } = result;

  const { error } = await supabase.from("proposal_notes").insert({
    proposal_id: proposalId,
    note_text: trimmed,
    author_type: candidateName,
  });

  if (error) return { error: error.message };

  // Update proposal updated_at
  await supabase
    .from("proposals")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  return { success: true };
}

export type InvitationResult = {
  error?: string;
  url?: string;
};

/** Create an invitation link for a manager to send to a new candidate */
export async function createInvitationLink(): Promise<InvitationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "candidate") {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { data, error } = await supabase
    .from("invitations")
    .insert({ manager_id: user.id })
    .select("token")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { url: `/new-candidate?invite=${data.token}` };
}
