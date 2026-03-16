"use server";

import { randomUUID } from "crypto";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInterestEmail(
  candidateId: number,
  matchCandidateId: number
): Promise<{ success: boolean; message: string }> {
  const supabase = await createSupabaseServerClient();

  // Verify the current user owns this candidate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "לא מחובר" };
  }

  // Fetch both candidates
  const [{ data: sender }, { data: recipient }] = await Promise.all([
    supabase
      .from("candidates")
      .select(
        "id, full_name, gender, age, residence, religious_level, marital_status, occupation, education, height, about_me, image_urls, contact_person, contact_person_phone, phone_number, email"
      )
      .eq("id", candidateId)
      .single(),
    supabase
      .from("candidates")
      .select("id, full_name, gender, email")
      .eq("id", matchCandidateId)
      .single(),
  ]);

  if (!sender || !recipient) {
    return { success: false, message: "לא נמצאו פרטי המועמדים" };
  }

  const recipientEmail = recipient.email as string | null;
  if (!recipientEmail || recipientEmail.trim() === "" || recipientEmail.endsWith("@sms.ronellovely.co.il")) {
    return {
      success: false,
      message: "למועמד/ת זו אין כתובת מייל. ניתן לפנות לצוות האתר.",
    };
  }

  const senderName = sender.full_name as string;
  const senderGender = sender.gender as string;
  const recipientName = recipient.full_name as string;
  const recipientGender = recipient.gender as string;
  const senderEmail = sender.email as string | null;
  const showSenderEmail = senderEmail && !senderEmail.endsWith("@sms.ronellovely.co.il");

  // Gender-aware Hebrew text
  const senderTitle = senderGender === "זכר" ? "המועמד" : "המועמדת";
  const senderWants = senderGender === "זכר" ? "מעוניין" : "מעוניינת";
  const senderPossessive = senderGender === "זכר" ? "שלו" : "שלה";
  const recipientCan = recipientGender === "זכר" ? "תוכל" : "תוכלי";
  const recipientThoughts = recipientGender === "זכר" ? "את מחשבותיך" : "את מחשבותייך";
  const dear = recipientGender === "זכר" ? "היקר" : "היקרה";
  const recipientAlsoInterested = recipientGender === "זכר" ? "כן, גם אני מעוניין!" : "כן, גם אני מעוניינת!";

  const contactPhone =
    (sender.contact_person_phone as string) || (sender.phone_number as string) || "";
  const contactName = (sender.contact_person as string) || senderName;
  const senderPhoto = (sender.image_urls as string[] | null)?.[0] ?? null;

  // ── Create proposal + interest token BEFORE building email ──────────────────
  let confirmUrl: string | null = null;
  try {
    const adminClient = createSupabaseAdminClient();

    let proposalId: number | null = null;
    const { data: existing } = await adminClient
      .from("proposals")
      .select("id")
      .or(
        `and(candidate_id_1.eq.${candidateId},candidate_id_2.eq.${matchCandidateId}),and(candidate_id_1.eq.${matchCandidateId},candidate_id_2.eq.${candidateId})`
      )
      .limit(1)
      .maybeSingle();

    if (existing) {
      proposalId = existing.id;
    } else {
      const { data: newProposal } = await adminClient
        .from("proposals")
        .insert({
          candidate_id_1: candidateId,
          candidate_id_2: matchCandidateId,
          status: "1",
        })
        .select("id")
        .single();
      proposalId = newProposal?.id ?? null;
    }

    if (proposalId) {
      const token = randomUUID();
      await adminClient.from("interest_tokens").insert({
        token,
        proposal_id: proposalId,
        from_candidate_id: candidateId,
        to_candidate_id: matchCandidateId,
      });
      confirmUrl = `https://ronel-lovely.com/confirm-interest?token=${token}`;
    }
  } catch (e) {
    console.error("Proposal/token creation error:", e);
    // Non-critical — email will still be sent without the confirm button
  }

  const emailHtml = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">Ronel Lovely</h1>
        <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">בונים בתים לזכרו של רונאל</p>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">
          שלום ${recipientName} ${dear},
        </h2>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.7;">
          ${senderTitle} <strong>${senderName}</strong> ${senderWants} לבדוק התאמה לפתיחת הצעה איתך.
        </p>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.7;">
          ${recipientCan} לכתוב ישירות למייל ${senderPossessive} ${recipientThoughts} על ההצעה (מתאים או לא מתאים?).
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0;">
          ${senderPhoto ? `
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${senderPhoto}" alt="${senderName}" style="width: 160px; height: 200px; object-fit: cover; border-radius: 10px; border: 2px solid #e5e7eb;" />
          </div>
          ` : ""}
          <h3 style="color: #374151; margin: 0 0 12px; font-size: 15px;">פרטים על ${senderName}:</h3>
          <table style="width: 100%; font-size: 14px; color: #4b5563;">
            ${sender.age ? `<tr><td style="padding: 4px 0; font-weight: bold; width: 110px;">גיל:</td><td>${sender.age}</td></tr>` : ""}
            ${sender.residence ? `<tr><td style="padding: 4px 0; font-weight: bold;">עיר:</td><td>${sender.residence}</td></tr>` : ""}
            ${sender.religious_level ? `<tr><td style="padding: 4px 0; font-weight: bold;">רמה דתית:</td><td>${sender.religious_level}</td></tr>` : ""}
            ${sender.marital_status ? `<tr><td style="padding: 4px 0; font-weight: bold;">מצב משפחתי:</td><td>${sender.marital_status}</td></tr>` : ""}
            ${sender.occupation ? `<tr><td style="padding: 4px 0; font-weight: bold;">תעסוקה:</td><td>${sender.occupation}</td></tr>` : ""}
            ${sender.education ? `<tr><td style="padding: 4px 0; font-weight: bold;">השכלה:</td><td>${sender.education}</td></tr>` : ""}
            ${sender.height ? `<tr><td style="padding: 4px 0; font-weight: bold;">גובה:</td><td>${sender.height} ס״מ</td></tr>` : ""}
            ${showSenderEmail ? `<tr><td style="padding: 4px 0; font-weight: bold;">מייל:</td><td><a href="mailto:${senderEmail}" style="color: #0284c7;">${senderEmail}</a></td></tr>` : ""}
          </table>
          ${sender.about_me ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: bold; font-size: 13px; color: #374151;">קצת על ${senderName}:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.6; white-space: pre-line;">${sender.about_me}</p>
          </div>
          ` : ""}
        </div>

        ${contactPhone ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            <strong>לבירורים ופרטים נוספים:</strong><br/>
            ${contactName} — <a href="tel:${contactPhone}" style="color: #0284c7;">${contactPhone}</a>
          </p>
        </div>
        ` : ""}

        ${confirmUrl ? `
        <div style="text-align: center; margin: 24px 0 16px;">
          <a href="${confirmUrl}"
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: bold;">
            ✓ ${recipientAlsoInterested}
          </a>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">לחיצה על הכפתור תשלח לשניכם פרטי התקשרות ותפתח הצעה רשמית. הקישור תקף ל-14 יום.</p>
        </div>
        ` : ""}

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
          הודעה זו נשלחה באמצעות מערכת Ronel Lovely<br/>
          <a href="https://ronel-lovely.com" style="color: #0ea5e9;">ronel-lovely.com</a>
        </p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Ronel Lovely <noreply@ronel-lovely.com>",
      replyTo: "ronel2lovely@gmail.com",
      to: recipientEmail,
      subject: `${senderName} ${senderWants} לבדוק התאמה איתך — Ronel Lovely`,
      html: emailHtml,
    });

    return { success: true, message: "המייל נשלח בהצלחה!" };
  } catch (err) {
    console.error("Resend error:", err);
    return { success: false, message: "שגיאה בשליחת המייל. נסה שוב מאוחר יותר." };
  }
}
