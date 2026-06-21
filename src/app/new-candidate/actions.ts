"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toE164 } from "@/lib/phone";
import { sendEmailWithLog } from "@/lib/email";

export type FieldErrors = Record<string, string>;
export type CreateCandidateResult = {
  error?: string;
  fieldErrors?: FieldErrors;
  success?: boolean;
  email?: string;
};

const BASE_REQUIRED_FIELDS: { key: string; label: string }[] = [
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
  { key: "email", label: "אימייל" },
  { key: "military_service", label: "שירות" },
];

const AMBASSADOR_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "contact_person", label: "שם השגריר" },
  { key: "contact_person_phone", label: "טלפון השגריר" },
  { key: "contact_person_email", label: "אימייל השגריר" },
  { key: "contact_person_gender", label: "מין השגריר" },
];

// All text fields we read from the form (required + optional)
const ALL_FIELDS = [
  ...BASE_REQUIRED_FIELDS.map((f) => f.key),
  ...AMBASSADOR_REQUIRED_FIELDS.map((f) => f.key),
  "children_count", "torah_education", "mode",
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

export async function createCandidate(
  formData: FormData
): Promise<CreateCandidateResult | undefined> {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const raw: Record<string, string> = {};
  for (const key of ALL_FIELDS) {
    raw[key] = ((formData.get(key) as string) ?? "").trim();
  }

  const ambassadorIdFromParam = ((formData.get("ambassador_id") as string) ?? "").trim();
  const isAmbassadorMode = raw.mode === "ambassador" || !!ambassadorIdFromParam;
  // Ambassador contact fields are only required when collecting them (mode=ambassador, not pre-identified)
  const needsAmbassadorFields = isAmbassadorMode && !ambassadorIdFromParam;
  const REQUIRED_FIELDS = [
    ...BASE_REQUIRED_FIELDS,
    ...(needsAmbassadorFields ? AMBASSADOR_REQUIRED_FIELDS : []),
  ];

  // ── 1. Required field validation ──
  const fieldErrors: FieldErrors = {};

  for (const { key, label } of REQUIRED_FIELDS) {
    if (!raw[key]) {
      fieldErrors[key] = `${label} הוא שדה חובה`;
    }
  }

  // ── 2. Minimum age 17 ──
  if (raw.birth_date && calculateAge(raw.birth_date) < 17) {
    fieldErrors.birth_date = "הנרשם חייב להיות בן/בת לפחות 17 שנים";
  }

  // ── 3. Description minimum 15 words ──
  if (raw.about_me) {
    const wordCount = raw.about_me.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 15) {
      fieldErrors.about_me = "תיאור אישי חייב לכלול לפחות 15 מילים";
    }
  }

  // ── 4. Image validation (1–3 images required) ──
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

    const { error: uploadError } = await adminSupabase.storage
      .from("candidate-images")
      .upload(path, file);

    if (uploadError) {
      return { error: `שגיאה בהעלאת תמונה: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from("candidate-images").getPublicUrl(path);

    imageUrls.push(publicUrl);
  }

  // ── 5b. (no multi-value fields) ──

  // ── 6. Determine manager_id and ambassador_id ──
  let managerId: string | null = null;
  let ambassadorId = ambassadorIdFromParam || null;
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
  } else if (ambassadorId) {
    // Pre-authenticated ambassador (old flow fallback)
    managerId = ambassadorId;
  } else if (isAmbassadorMode && raw.contact_person_email) {
    // Ambassador mode: create or find auth account for the ambassador
    const ambassadorEmail = raw.contact_person_email.toLowerCase();

    // generateLink creates user if not exists and returns their ID without sending email
    const { data: linkData } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: ambassadorEmail,
      options: { data: { role: "candidate" } },
    });

    if (linkData?.user) {
      ambassadorId = linkData.user.id;
      // Ensure role metadata is set
      await adminSupabase.auth.admin.updateUserById(ambassadorId, {
        user_metadata: { role: "candidate" },
      });
      managerId = ambassadorId;
    }
  } else if (user && user.email?.toLowerCase() !== raw.email?.toLowerCase()) {
    managerId = user.id;
  }

  // ── 7. Build record ──
  const record: Record<string, string | number | string[] | null> = {
    full_name: raw.full_name,
    email: raw.email,
    contact_person: raw.contact_person || null,
    contact_person_phone: raw.contact_person_phone || null,
    contact_person_email: raw.contact_person_email || null,
    contact_person_gender: raw.contact_person_gender || null,
    phone_number: raw.phone_number,
    gender: raw.gender,
    birth_date: raw.birth_date,
    residence: raw.residence,
    marital_status: raw.marital_status,
    children_count: raw.children_count ? parseInt(raw.children_count, 10) : null,
    religious_level: raw.religious_level,
    height: (() => { const h = parseFloat(raw.height); return Math.round(h >= 1 && h < 10 ? h * 100 : h); })(),
    education: raw.education,
    occupation: raw.occupation,
    about_me: raw.about_me,
    looking_for: raw.looking_for,
    torah_education: raw.torah_education || null,
    military_service: raw.military_service || null,
    image_urls: imageUrls,
    age: calculateAge(raw.birth_date),
    manager_id: managerId,
    ambassador_id: ambassadorId,
  };

  const { data: insertedCandidate, error } = await adminSupabase
    .from("candidates")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Mark invitation as used
  if (inviteToken && insertedCandidate) {
    await adminSupabase
      .from("invitations")
      .update({ used_at: new Date().toISOString(), candidate_id: insertedCandidate.id })
      .eq("token", inviteToken);
  }

  // Send welcome email to the candidate
  const candidateEmail = raw.email?.trim();
  if (candidateEmail && insertedCandidate) {
    await sendEmailWithLog({
      to: candidateEmail,
      subject: "ברוכים הבאים ל-Ronel Lovely!",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #374151;">
          <p style="font-size: 13px; color: #0284c7; font-weight: bold; margin: 0 0 4px;">Ronel Lovely</p>
          <p style="font-size: 11px; color: #94a3b8; margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">בונים בתים לזכרו של רונאל</p>
          <p style="font-size: 16px; margin: 0 0 16px;">שלום וברוכים הבאים!</p>
          <p style="font-size: 15px; line-height: 1.8; margin: 0 0 16px;">הפרופיל שלך נרשם בהצלחה באתר השידוכים Ronel Lovely.</p>
          <p style="font-size: 14px; font-weight: bold; color: #374151; margin: 0 0 8px;">כמה טיפים לתחילת הדרך:</p>
          <ul style="font-size: 14px; line-height: 2; margin: 0 0 16px; padding-right: 20px; color: #4b5563;">
            <li>לצפייה בהצעות מומלצות — היכנסו לאזור האישי ובחרו &quot;הצעות מומלצות&quot;</li>
            <li>לפתיחת הצעה — לחצו על מועמד/ת שמעניינת אתכם ולחצו &quot;אני מעוניין/ת להכיר&quot;</li>
            <li>לרענון ההצעות המומלצות - לחצו על הצעה מסוימת כלא מתאימה ותקבלו הצעה אחרת במקומה</li>
          </ul>
          <p style="font-size: 14px; line-height: 1.8; margin: 0 0 16px;">לכל שאלה או עזרה — צוות האתר זמין בכתובת: <a href="mailto:ronel2lovely@gmail.com" style="color: #0284c7;">ronel2lovely@gmail.com</a></p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center;">Ronel Lovely — ronel-lovely.com</p>
        </div>
      `,
      context: "welcome_email",
      toCandidateId: insertedCandidate.id,
    }).catch(() => {}); // Non-critical
  }

  // Redirect based on context
  if (managerId && user) {
    // Logged-in manager/ambassador created a profile → back to their dashboard
    redirect(`/my-profile?candidate_id=${insertedCandidate.id}`);
  } else if (isAmbassadorMode) {
    // Ambassador submitted without being logged in → success page with login prompt
    redirect("/new-candidate/success?ambassador=1");
  } else if (inviteToken) {
    // Invitation flow → success page
    redirect("/new-candidate/success");
  } else {
    // Regular self-registration → return success so client can show email confirmation modal
    return { success: true, email: candidateEmail };
  }
}
