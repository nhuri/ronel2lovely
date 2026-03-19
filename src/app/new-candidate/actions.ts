"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toE164 } from "@/lib/phone";

export type FieldErrors = Record<string, string>;
export type CreateCandidateResult = {
  error?: string;
  fieldErrors?: FieldErrors;
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
  { key: "contact_person", label: "איש קשר" },
  { key: "contact_person_phone", label: "טלפון איש קשר" },
];

// All text fields we read from the form (required + optional)
const ALL_FIELDS = [...REQUIRED_FIELDS.map((f) => f.key), "email", "children_count"];

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

export async function createCandidate(
  formData: FormData
): Promise<CreateCandidateResult | undefined> {
  const supabase = await createSupabaseServerClient();

  const raw: Record<string, string> = {};
  for (const key of ALL_FIELDS) {
    raw[key] = ((formData.get(key) as string) ?? "").trim();
  }

  // ── 1. Required field validation ──
  const fieldErrors: FieldErrors = {};

  for (const { key, label } of REQUIRED_FIELDS) {
    if (!raw[key]) {
      fieldErrors[key] = `${label} הוא שדה חובה`;
    }
  }

  // ── 2. Description minimum 15 words ──
  if (raw.about_me) {
    const wordCount = raw.about_me.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 15) {
      fieldErrors.about_me = "תיאור אישי חייב לכלול לפחות 15 מילים";
    }
  }

  // ── 3. Image validation (1–3 images required) ──
  const imageFiles = formData.getAll("images") as File[];
  const validImages = imageFiles.filter((f) => f.size > 0);
  if (validImages.length === 0) {
    fieldErrors.images = "יש להעלות לפחות תמונה אחת";
  } else if (validImages.length > 3) {
    fieldErrors.images = "ניתן להעלות עד 3 תמונות בלבד";
  }

  // ── 4. Unique email & phone checks ──
  if (raw.email && !fieldErrors.email) {
    const { data: existingEmail } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", raw.email)
      .limit(1)
      .maybeSingle();

    if (existingEmail) {
      fieldErrors.email = "האימייל הזה כבר רשום במערכת";
    }
  }

  // Normalize phone numbers to E.164 (+972) format
  if (raw.phone_number) raw.phone_number = toE164(raw.phone_number);
  if (raw.contact_person_phone) raw.contact_person_phone = toE164(raw.contact_person_phone);

  if (raw.phone_number && !fieldErrors.phone_number) {
    const { data: existingPhone } = await supabase
      .from("candidates")
      .select("id")
      .eq("phone_number", raw.phone_number)
      .limit(1)
      .maybeSingle();

    if (existingPhone) {
      fieldErrors.phone_number = "מספר הטלפון הזה כבר רשום במערכת";
    }
  }

  // Return all field errors at once
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // ── 5. Upload images to Supabase Storage ──
  const imageUrls: string[] = [];
  for (const file of validImages) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("candidate-images")
      .upload(path, file);

    if (uploadError) {
      return { error: `שגיאה בהעלאת תמונה: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("candidate-images").getPublicUrl(path);

    imageUrls.push(publicUrl);
  }

  // ── 6. Determine manager_id ──
  let managerId: string | null = null;
  const forOther = formData.get("for_other") === "1";
  const inviteToken = ((formData.get("invite_token") as string) ?? "").trim();

  // Check current auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (inviteToken) {
    // Invitation flow: look up invitation and use its manager_id
    const { data: invitation } = await supabase
      .from("invitations")
      .select("id, manager_id, used_at")
      .eq("token", inviteToken)
      .maybeSingle();

    if (!invitation) {
      return { error: "קישור ההזמנה אינו תקין" };
    }
    if (invitation.used_at) {
      return { error: "קישור ההזמנה כבר נוצל" };
    }
    managerId = invitation.manager_id;
  } else if (forOther && user?.user_metadata?.role === "candidate") {
    // Logged-in user creating for someone else
    managerId = user.id;
  }

  // ── 7. Build record ──
  const record: Record<string, string | number | string[] | null> = {
    full_name: raw.full_name,
    email: raw.email,
    contact_person: raw.contact_person,
    contact_person_phone: raw.contact_person_phone,
    phone_number: raw.phone_number,
    gender: raw.gender,
    birth_date: raw.birth_date,
    residence: raw.residence,
    marital_status: raw.marital_status,
    children_count: raw.children_count ? parseInt(raw.children_count, 10) : null,
    religious_level: raw.religious_level,
    height: parseInt(raw.height, 10),
    education: raw.education,
    occupation: raw.occupation,
    about_me: raw.about_me,
    looking_for: raw.looking_for,
    image_urls: imageUrls,
    age: calculateAge(raw.birth_date),
    manager_id: managerId,
  };

  const { data: insertedCandidate, error } = await supabase
    .from("candidates")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Mark invitation as used
  if (inviteToken && insertedCandidate) {
    await supabase
      .from("invitations")
      .update({ used_at: new Date().toISOString(), candidate_id: insertedCandidate.id })
      .eq("token", inviteToken);
  }

  // Redirect based on context
  if (managerId && user) {
    // Manager created a profile → go back to their dashboard
    redirect(`/my-profile?candidate_id=${insertedCandidate.id}`);
  } else if (inviteToken) {
    // Invitation flow (not logged in) → show success page
    redirect("/new-candidate/success");
  } else {
    // Regular self-registration → go to login
    redirect("/login");
  }
}
