"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";

export type ConfirmResult =
  | {
      status: "success";
      fromName: string;
      fromPhone: string;
      fromEmail: string | null;
      notificationsSent: number;
      notificationErrors: string[];
    }
  | { status: "already_used" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error"; message: string };

export async function confirmMutualInterest(token: string): Promise<ConfirmResult> {
  const admin = createSupabaseAdminClient();

  // Fetch token record
  const { data: tokenData, error: tokenError } = await admin
    .from("interest_tokens")
    .select("token, proposal_id, from_candidate_id, to_candidate_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenData) return { status: "invalid" };
  if (tokenData.used_at) return { status: "already_used" };
  if (new Date(tokenData.expires_at) < new Date()) return { status: "expired" };

  // Mark token as used
  await admin
    .from("interest_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Update proposal status to "5" (דייטים)
  if (tokenData.proposal_id) {
    await admin
      .from("proposals")
      .update({ status: "5" })
      .eq("id", tokenData.proposal_id);
  }

  // Fetch both candidates
  const [{ data: fromCand }, { data: toCand }] = await Promise.all([
    admin
      .from("candidates")
      .select("id, full_name, gender, age, residence, phone_number, email, contact_person, contact_person_phone, image_urls")
      .eq("id", tokenData.from_candidate_id)
      .single(),
    admin
      .from("candidates")
      .select("id, full_name, gender, age, residence, phone_number, email, contact_person, contact_person_phone, image_urls")
      .eq("id", tokenData.to_candidate_id)
      .single(),
  ]);

  if (!fromCand || !toCand) {
    return { status: "error", message: "שגיאה בטעינת פרטי המועמדים" };
  }

  const isSmsEmail = (e: string | null) =>
    !e || e.endsWith("@sms.ronellovely.co.il");

  const infoOf = (c: typeof fromCand) => ({
    name: c.full_name as string,
    gender: c.gender as string,
    phone: (c.contact_person_phone as string) || (c.phone_number as string) || "",
    email: isSmsEmail(c.email as string | null) ? null : (c.email as string),
    contactPerson: (c.contact_person as string) || null,
    photo: (c.image_urls as string[] | null)?.[0] ?? null,
    age: c.age as number | null,
    residence: c.residence as string | null,
  });

  const from = infoOf(fromCand);
  const to = infoOf(toCand);

  // ── HTML email helpers ─────────────────────────────────────────────────────
  const contactBlock = (p: typeof from) => `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:16px 0;">
      ${p.photo ? `<div style="text-align:center;margin-bottom:12px;"><img src="${p.photo}" style="width:120px;height:150px;object-fit:cover;border-radius:10px;border:2px solid #e5e7eb;"/></div>` : ""}
      <h3 style="margin:0 0 10px;font-size:15px;color:#166534;">${p.name}</h3>
      <table style="width:100%;font-size:14px;color:#374151;">
        ${p.age ? `<tr><td style="padding:3px 0;font-weight:bold;width:100px;">גיל:</td><td>${p.age}</td></tr>` : ""}
        ${p.residence ? `<tr><td style="padding:3px 0;font-weight:bold;">עיר:</td><td>${p.residence}</td></tr>` : ""}
        ${p.phone ? `<tr><td style="padding:3px 0;font-weight:bold;">טלפון:</td><td><a href="tel:${p.phone}" style="color:#0284c7;">${p.phone}</a></td></tr>` : ""}
        ${p.contactPerson ? `<tr><td style="padding:3px 0;font-weight:bold;">איש קשר:</td><td>${p.contactPerson}</td></tr>` : ""}
        ${p.email ? `<tr><td style="padding:3px 0;font-weight:bold;">מייל:</td><td><a href="mailto:${p.email}" style="color:#0284c7;">${p.email}</a></td></tr>` : ""}
      </table>
    </div>`;

  const emailWrapper = (body: string) => `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#059669,#10b981);color:white;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;">🎉 התאמה הדדית!</h1>
        <p style="margin:5px 0 0;font-size:13px;opacity:.9;">Ronel Lovely — בונים בתים לזכרו של רונאל</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        ${body}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">
          הודעה זו נשלחה באמצעות מערכת Ronel Lovely<br/>
          <a href="https://ronel-lovely.com" style="color:#0ea5e9;">ronel-lovely.com</a>
        </p>
      </div>
    </div>`;

  const toTitle = to.gender === "נקבה" ? "המועמדת" : "המועמד";
  const fromTitle = from.gender === "נקבה" ? "המועמדת" : "המועמד";
  const toHeShe = to.gender === "נקבה" ? "היא" : "הוא";
  const fromPossessive = from.gender === "נקבה" ? "שלה" : "שלו";

  // ── Send email notifications ───────────────────────────────────────────────
  let notificationsSent = 0;
  const notificationErrors: string[] = [];

  // Notify original sender (from / A)
  if (from.email) {
    const result = await sendEmailWithLog({
      to: from.email,
      subject: `🎉 ${to.name} גם מעוניינ/ת! הנה פרטי ההתקשרות — Ronel Lovely`,
      html: emailWrapper(`
        <p style="color:#1f2937;font-size:16px;font-weight:bold;">בשורות טובות!</p>
        <p style="color:#4b5563;font-size:15px;line-height:1.7;">
          ${toTitle} <strong>${to.name}</strong> אישר/ה שגם ${toHeShe} מעוניינ/ת. הנה פרטי ההתקשרות:
        </p>
        ${contactBlock(to)}
        <p style="color:#6b7280;font-size:13px;">סטטוס ההצעה עודכן אוטומטית ל"דייטים".</p>
      `),
      context: "mutual_confirmation_from",
      fromCandidateId: tokenData.from_candidate_id as number,
      toCandidateId: tokenData.to_candidate_id as number,
    });
    if (result.success) notificationsSent++;
    else notificationErrors.push(`מייל ל${from.name}: ${result.error}`);
  }

  // Notify confirmer (to / B)
  if (to.email) {
    const result = await sendEmailWithLog({
      to: to.email,
      subject: `✓ אישרת עניין — הנה פרטי ${from.name} — Ronel Lovely`,
      html: emailWrapper(`
        <p style="color:#1f2937;font-size:16px;font-weight:bold;">אישרת עניין בהצעה!</p>
        <p style="color:#4b5563;font-size:15px;line-height:1.7;">
          שלחנו גם ל${fromTitle} <strong>${from.name}</strong> את פרטיך. הנה פרטי ההתקשרות ${fromPossessive}:
        </p>
        ${contactBlock(from)}
        <p style="color:#6b7280;font-size:13px;">סטטוס ההצעה עודכן אוטומטית ל"דייטים".</p>
      `),
      context: "mutual_confirmation_to",
      fromCandidateId: tokenData.from_candidate_id as number,
      toCandidateId: tokenData.to_candidate_id as number,
    });
    if (result.success) notificationsSent++;
    else notificationErrors.push(`מייל ל${to.name}: ${result.error}`);
  }

  return {
    status: "success",
    fromName: from.name,
    fromPhone: from.phone,
    fromEmail: from.email,
    notificationsSent,
    notificationErrors,
  };
}
