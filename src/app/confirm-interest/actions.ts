"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type ConfirmResult =
  | { status: "success"; fromName: string; fromPhone: string; fromEmail: string | null }
  | { status: "already_used" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error"; message: string };

export async function confirmMutualInterest(token: string): Promise<ConfirmResult> {
  const admin = createSupabaseAdminClient();

  // Fetch token record
  const { data: tokenData } = await admin
    .from("interest_tokens")
    .select("token, proposal_id, from_candidate_id, to_candidate_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (!tokenData) return { status: "invalid" };
  if (tokenData.used_at) return { status: "already_used" };
  if (new Date(tokenData.expires_at) < new Date()) return { status: "expired" };

  // Mark token as used
  await admin
    .from("interest_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Update proposal status to "5" (דייטים מתקדם)
  if (tokenData.proposal_id) {
    await admin
      .from("proposals")
      .update({ status: "5" })
      .eq("id", tokenData.proposal_id);
  }

  // Fetch both candidates' full contact details
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

  // Build contact detail helpers
  const contactOf = (c: typeof fromCand) => ({
    name: (c.full_name as string),
    phone: (c.contact_person_phone as string) || (c.phone_number as string) || "",
    email: (() => {
      const e = c.email as string | null;
      return e && !e.endsWith("@sms.ronellovely.co.il") ? e : null;
    })(),
    contactPerson: (c.contact_person as string) || null,
    photo: (c.image_urls as string[] | null)?.[0] ?? null,
    age: c.age as number | null,
    residence: c.residence as string | null,
  });

  const from = contactOf(fromCand);
  const to = contactOf(toCand);

  const contactBlock = (person: typeof from) => `
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; margin: 16px 0;">
      ${person.photo ? `<div style="text-align:center;margin-bottom:12px;"><img src="${person.photo}" style="width:120px;height:150px;object-fit:cover;border-radius:10px;border:2px solid #e5e7eb;" /></div>` : ""}
      <h3 style="margin:0 0 10px;font-size:15px;color:#166534;">${person.name}</h3>
      <table style="width:100%;font-size:14px;color:#374151;">
        ${person.age ? `<tr><td style="padding:3px 0;font-weight:bold;width:100px;">גיל:</td><td>${person.age}</td></tr>` : ""}
        ${person.residence ? `<tr><td style="padding:3px 0;font-weight:bold;">עיר:</td><td>${person.residence}</td></tr>` : ""}
        ${person.phone ? `<tr><td style="padding:3px 0;font-weight:bold;">טלפון:</td><td><a href="tel:${person.phone}" style="color:#0284c7;">${person.phone}</a></td></tr>` : ""}
        ${person.contactPerson ? `<tr><td style="padding:3px 0;font-weight:bold;">איש קשר:</td><td>${person.contactPerson}</td></tr>` : ""}
        ${person.email ? `<tr><td style="padding:3px 0;font-weight:bold;">מייל:</td><td><a href="mailto:${person.email}" style="color:#0284c7;">${person.email}</a></td></tr>` : ""}
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

  const toGender = toCand.gender as string;
  const toTitle = toGender === "נקבה" ? "המועמדת" : "המועמד";
  const fromGender = fromCand.gender as string;
  const fromTitle = fromGender === "נקבה" ? "המועמדת" : "המועמד";

  const emailPromises: Promise<unknown>[] = [];

  // Email to the original sender (from)
  if (from.email) {
    emailPromises.push(
      resend.emails.send({
        from: "Ronel Lovely <noreply@ronel-lovely.com>",
        replyTo: "ronel2lovely@gmail.com",
        to: from.email,
        subject: `🎉 ${to.name} גם מעוניינ/ת! הנה פרטי ההתקשרות — Ronel Lovely`,
        html: emailWrapper(`
          <p style="color:#1f2937;font-size:16px;font-weight:bold;">בשורות טובות!</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;">
            ${toTitle} <strong>${to.name}</strong> אישר/ה שגם ${toGender === "נקבה" ? "היא" : "הוא"} מעוניינ/ת. הנה פרטי ההתקשרות:
          </p>
          ${contactBlock(to)}
          <p style="color:#6b7280;font-size:13px;">סטטוס ההצעה עודכן אוטומטית ל"דייטים".</p>
        `),
      })
    );
  }

  // Email to the confirmer (to)
  if (to.email) {
    emailPromises.push(
      resend.emails.send({
        from: "Ronel Lovely <noreply@ronel-lovely.com>",
        replyTo: "ronel2lovely@gmail.com",
        to: to.email,
        subject: `✓ אישרת עניין — הנה פרטי ${from.name} — Ronel Lovely`,
        html: emailWrapper(`
          <p style="color:#1f2937;font-size:16px;font-weight:bold;">אישרת עניין בהצעה!</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;">
            שלחנו גם ל${fromTitle} <strong>${from.name}</strong> את פרטיך. הנה פרטי ההתקשרות ${fromGender === "נקבה" ? "שלה" : "שלו"}:
          </p>
          ${contactBlock(from)}
          <p style="color:#6b7280;font-size:13px;">סטטוס ההצעה עודכן אוטומטית ל"דייטים".</p>
        `),
      })
    );
  }

  const results = await Promise.allSettled(emailPromises);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Mutual interest email [${i}] failed:`, r.reason);
    }
  });

  return {
    status: "success",
    fromName: from.name,
    fromPhone: from.phone,
    fromEmail: from.email,
  };
}
