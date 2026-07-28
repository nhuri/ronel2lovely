"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isTerminalStatus } from "@/lib/proposals";
import { toE164 } from "@/lib/phone";
import { queueAdminNotification } from "@/lib/adminNotifications";
import { isValidRemovalReason, removalReasonLabel } from "@/lib/removalReasons";
import {
  hasReachedDailyProposalLimit,
  notifyDailyProposalLimitReached,
  DAILY_PROPOSAL_LIMIT_MESSAGE,
} from "@/lib/proposalLimits";

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
];

// Contact person for inquiries — optional for self-managed candidates, but it's
// the only real contact channel for candidates with an ambassador (see
// src/lib/contact.ts), so it stays required for those (checked separately below).
const CONTACT_PERSON_FIELDS: { key: string; label: string }[] = [
  { key: "contact_person", label: "איש קשר" },
  { key: "contact_person_phone", label: "טלפון איש קשר" },
];

const ALL_FIELDS = [
  ...REQUIRED_FIELDS.map((f) => f.key),
  ...CONTACT_PERSON_FIELDS.map((f) => f.key),
  "children_count",
  "torah_education",
];

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

  return applyProfileUpdate(ctx.supabase, ctx.candidateId, formData);
}

/**
 * Shared validation + update logic behind updateMyProfile, factored out so
 * admin-side editing (src/app/admin/candidate/[id]/actions.ts) can reuse it
 * with its own authorization check instead of verifyCandidate's ownership rule.
 */
export async function applyProfileUpdate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  candidateId: number,
  formData: FormData
): Promise<ProfileActionResult> {
  const raw: Record<string, string> = {};
  for (const key of ALL_FIELDS) {
    raw[key] = ((formData.get(key) as string) ?? "").trim();
  }

  // Candidates with an ambassador have no contact info of their own — the
  // contact person fields are their only real contact channel, so keep them required.
  const { data: candidateRow } = await supabase
    .from("candidates")
    .select("ambassador_id")
    .eq("id", candidateId)
    .maybeSingle();
  const hasAmbassador = !!candidateRow?.ambassador_id;

  const requiredFields = hasAmbassador
    ? [...REQUIRED_FIELDS, ...CONTACT_PERSON_FIELDS]
    : REQUIRED_FIELDS;

  // ── Validation ──
  const fieldErrors: FieldErrors = {};

  for (const { key, label } of requiredFields) {
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

    if (existingPhone && existingPhone.id !== candidateId) {
      fieldErrors.phone_number = "מספר הטלפון הזה כבר רשום במערכת";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const militaryService = (formData.getAll("military_service") as string[]).filter(Boolean).join(",");

  // ── Handle images ──
  const keepImages: string[] = formData.getAll("keep_images") as string[];
  const newImageFiles: File[] = formData.getAll("new_images").filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  const totalImages = keepImages.length + newImageFiles.length;
  if (totalImages === 0) {
    return { fieldErrors: { images: "יש להעלות לפחות תמונה אחת" } };
  }
  if (totalImages > 3) {
    return { fieldErrors: { images: "ניתן להעלות עד 3 תמונות" } };
  }

  // Fetch current images so we can archive any that are being replaced/removed
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("image_urls, removed_image_urls")
    .eq("id", candidateId)
    .maybeSingle();
  const previousImageUrls: string[] = existingCandidate?.image_urls ?? [];
  const previousRemovedImageUrls: string[] = existingCandidate?.removed_image_urls ?? [];

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

  // Images the candidate removed: archive their URLs instead of deleting the
  // underlying Storage file, so they stay retrievable but are no longer shown.
  const removedImageUrls = previousImageUrls.filter((url) => !finalImageUrls.includes(url));
  const finalRemovedImageUrls = [
    ...previousRemovedImageUrls,
    ...removedImageUrls.filter((url) => !previousRemovedImageUrls.includes(url)),
  ];

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
      torah_education: raw.torah_education || null,
      military_service: militaryService || null,
      contact_person: raw.contact_person || null,
      contact_person_phone: raw.contact_person_phone || null,
      age: calculateAge(raw.birth_date),
      image_urls: finalImageUrls,
      removed_image_urls: finalRemovedImageUrls,
    })
    .eq("id", candidateId);

  if (error) {
    return { error: error.message };
  }

  return { success: true, imageUrls: finalImageUrls };
}

export async function deleteMyProfile(
  reason: string,
  reasonOther: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  if (!isValidRemovalReason(reason)) {
    return { error: "יש לבחור סיבה להקפאת הפרופיל" };
  }
  const trimmedOther = reasonOther.trim();
  if (reason === "other" && !trimmedOther) {
    return { error: "יש לפרט את הסיבה" };
  }

  const { supabase } = ctx;

  // Soft delete: set availability_status to 'הקפאה' instead of deleting
  const { data: updated, error } = await supabase
    .from("candidates")
    .update({
      availability_status: "הקפאה",
      removal_reason: reason,
      removal_reason_other: reason === "other" ? trimmedOther : null,
      removed_by: "candidate",
    })
    .eq("id", ctx.candidateId)
    .select("full_name")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Notify the site team that a candidate froze their own profile
  const reasonText = reason === "other" ? trimmedOther : removalReasonLabel(reason);
  await queueAdminNotification({
    type: "candidate_self_froze",
    message: `המועמד/ת <strong>${updated?.full_name ?? ""}</strong> הקפיא/ה את הפרופיל שלו/ה. סיבה: ${reasonText ?? "לא צוינה"}`,
    linkUrl: `https://ronel-lovely.com/admin/candidate/${ctx.candidateId}`,
    candidateId: ctx.candidateId,
  }).catch(() => {}); // Non-critical

  // Sign out and redirect to login
  await supabase.auth.signOut();
  redirect("/login");
}

/** Current count of candidates married through the initiative — used to tell a
 * candidate reporting their own marriage which couple number they are. */
export async function getMarriedCoupleCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("availability_status", "התחתנו");
  return count ?? 0;
}

/**
 * Shared logic behind reporting a marriage/engagement through the initiative:
 * freezes the candidate's profile as married (counted in the site banner),
 * records the partner's phone for the team to follow up, and also marks the
 * partner as married if they're a registered candidate found by that phone
 * number. Factored out so the admin-triggered freeze flow
 * (src/app/admin/candidate/[id]/actions.ts) can reuse it with its own
 * authorization check instead of verifyCandidate's ownership rule.
 */
export async function applyMarriageViaInitiative(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  candidateId: number,
  partnerPhone: string,
  removedBy: "candidate" | "admin"
): Promise<ProfileActionResult & { fullName?: string }> {
  const trimmedPhone = partnerPhone.trim();
  if (!trimmedPhone) {
    return { error: "יש להזין מספר טלפון" };
  }
  const normalizedPhone = toE164(trimmedPhone);
  const adminClient = createSupabaseAdminClient();

  const { data: updated, error } = await supabase
    .from("candidates")
    .update({
      availability_status: "התחתנו",
      removal_reason: "married_via",
      removal_reason_other: null,
      removed_by: removedBy,
      system_notes: `מספר טלפון של בן/בת הזוג: ${normalizedPhone}`,
    })
    .eq("id", candidateId)
    .select("full_name")
    .single();

  if (error) {
    return { error: error.message };
  }

  // If the partner is also a registered candidate, mark them married too and
  // close out the proposal between them (mirrors updateProposalStatusByCandidate)
  const { data: partner } = await adminClient
    .from("candidates")
    .select("id")
    .eq("phone_number", normalizedPhone)
    .neq("id", candidateId)
    .maybeSingle();

  if (partner) {
    await adminClient
      .from("candidates")
      .update({ availability_status: "התחתנו" })
      .eq("id", partner.id);

    await adminClient
      .from("proposals")
      .update({ status: "9", updated_at: new Date().toISOString() })
      .or(
        `and(candidate_id_1.eq.${candidateId},candidate_id_2.eq.${partner.id}),and(candidate_id_1.eq.${partner.id},candidate_id_2.eq.${candidateId})`
      );
  }

  return { success: true, fullName: updated?.full_name ?? "" };
}

/**
 * A candidate reporting they got married through the initiative: freezes their
 * profile as married (counted in the site banner), records the partner's phone
 * for the team to follow up, and also marks the partner as married if they're
 * a registered candidate found by that phone number.
 */
export async function reportMarriageViaInitiative(
  partnerPhone: string,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const result = await applyMarriageViaInitiative(ctx.supabase, ctx.candidateId, partnerPhone, "candidate");
  if (result.error) return result;

  await queueAdminNotification({
    type: "candidate_self_froze",
    message: `🎉 המועמד/ת <strong>${result.fullName}</strong> התחתן/ה דרך המיזם! מספר טלפון של בן/בת הזוג לבירור: ${toE164(partnerPhone.trim())}`,
    linkUrl: `https://ronel-lovely.com/admin/candidate/${ctx.candidateId}`,
    candidateId: ctx.candidateId,
  }).catch(() => {}); // Non-critical

  await ctx.supabase.auth.signOut();
  redirect("/login");
}

/** Restore a frozen profile (unfreeze) — only for profiles the candidate froze themselves */
export async function restoreMyProfile(
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase } = ctx;

  const { data: current } = await supabase
    .from("candidates")
    .select("removed_by")
    .eq("id", ctx.candidateId)
    .eq("availability_status", "הקפאה")
    .maybeSingle();

  if (!current) {
    redirect("/my-profile");
  }

  // Profiles frozen by an admin can only be unfrozen by contacting the team.
  if (current.removed_by === "admin") {
    return { error: "הפרופיל הוקפא על ידי המנהל ולא ניתן לשחררו באופן עצמאי" };
  }

  const { error } = await supabase
    .from("candidates")
    .update({
      availability_status: null,
      removal_reason: null,
      removal_reason_other: null,
      removed_by: null,
    })
    .eq("id", ctx.candidateId)
    .eq("availability_status", "הקפאה");

  if (error) {
    return { error: error.message };
  }

  redirect("/my-profile?restored=1");
}

/** Notify the site team that a candidate wants an admin-initiated freeze lifted */
export async function requestAdminUnfreeze(
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) {
    return { error: "אין הרשאה לבצע פעולה זו" };
  }

  const { supabase } = ctx;

  const { data: current } = await supabase
    .from("candidates")
    .select("full_name, removed_by")
    .eq("id", ctx.candidateId)
    .eq("availability_status", "הקפאה")
    .eq("removed_by", "admin")
    .maybeSingle();

  if (!current) {
    return { error: "לא נמצא פרופיל מוקפא הממתין לשחרור" };
  }

  const result = await queueAdminNotification({
    type: "unfreeze_request",
    message: `המועמד/ת <strong>${current.full_name}</strong> מעוניין/ת לשחרר את הפרופיל המוקפא שלו/ה.`,
    candidateId: ctx.candidateId,
  });

  if (!result.success) {
    return { error: result.error ?? "שליחת הבקשה נכשלה, נסה שוב" };
  }

  redirect("/my-profile?unfreeze_requested=1");
}

/**
 * Shared email-update logic behind updateCandidateEmail, factored out so
 * admin-side editing (src/app/admin/candidate/[id]/actions.ts) can reuse it
 * with its own authorization check instead of verifyCandidate's ownership rule.
 */
export async function applyEmailUpdate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  candidateId: number,
  newEmail: string
): Promise<ProfileActionResult> {
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

  // Fetch candidate name + manager_id (the auth user this row logs in as, if any)
  const { data: candidateData } = await supabase
    .from("candidates")
    .select("full_name, manager_id")
    .eq("id", candidateId)
    .maybeSingle();

  // 1. Update candidate record in DB
  const { error: dbError } = await supabase
    .from("candidates")
    .update({ email: newEmail })
    .eq("id", candidateId);

  if (dbError) {
    return { error: dbError.message };
  }

  // 2. Update auth user's email (auto-confirm since they verified via phone).
  // Ambassador-managed candidates may have no manager_id (they don't log in
  // themselves) — skip the auth update in that case.
  if (candidateData?.manager_id) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      candidateData.manager_id,
      { email: newEmail, email_confirm: true }
    );

    if (authError) {
      // Rollback the DB update
      await supabase
        .from("candidates")
        .update({ email: null })
        .eq("id", candidateId);
      return { error: authError.message };
    }
  }

  // 3. Notify admin of the email change
  const candidateName = candidateData?.full_name ?? "מועמד/ת";
  await queueAdminNotification({
    type: "candidate_email_update",
    message: `המועמד/ת <strong>${candidateName}</strong> עידכן/ה את כתובת המייל שלו/שלה לכתובת: <strong style="direction:ltr;unicode-bidi:embed;">${newEmail}</strong>`,
    candidateId,
  });

  return { success: true };
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

  return applyEmailUpdate(ctx.supabase, ctx.candidateId, newEmail);
}

export async function toggleAvailability(
  isAvailable: boolean,
  candidateId?: number
): Promise<ProfileActionResult> {
  const ctx = await verifyCandidate(candidateId);
  if (!ctx) return { error: "אין הרשאה לבצע פעולה זו" };

  const { supabase } = ctx;
  // isAvailable=true → clear "תפוס"; isAvailable=false → set "תפוס"
  const newStatus = isAvailable ? null : "תפוס";
  const { data, error } = await supabase
    .from("candidates")
    .update({ availability_status: newStatus })
    .eq("id", ctx.candidateId)
    .select("id");

  if (error) return { error: error.message };
  // RLS can silently no-op an update (0 rows affected, no error) — surface that
  // instead of reporting success while the DB value stays unchanged.
  if (!data || data.length === 0) return { error: "עדכון הסטטוס נכשל, נסה/י שוב" };
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

  if (await hasReachedDailyProposalLimit(supabase, myId)) {
    await notifyDailyProposalLimitReached(supabase, myId);
    return { error: DAILY_PROPOSAL_LIMIT_MESSAGE };
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

  const { proposal } = result;

  // Use admin client to bypass RLS for write operations
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from("proposals")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { error: error.message };

  // Auto-freeze on terminal statuses (8=התארסו, 9=התחתנו)
  if (isTerminalStatus(newStatus)) {
    const statusLabel = newStatus === "8" ? "התארסו" : "התחתנו";
    await adminClient
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

  const { candidateName } = result;

  // Use admin client to bypass RLS for write operations
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient.from("proposal_notes").insert({
    proposal_id: proposalId,
    note_text: trimmed,
    author_type: candidateName,
  });

  if (error) return { error: error.message };

  await adminClient
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
