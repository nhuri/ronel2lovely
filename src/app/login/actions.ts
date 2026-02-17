"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/phone";
import { sendTwilioSms } from "@/lib/twilio";

export type OtpResult = {
  error?: string;
  success?: boolean;
  showPhoneFlow?: boolean;
};

const ADMIN_EMAIL = "ronel2lovely@gmail.com";

/** Step 1 – Send an OTP code to the user's email (with pre-verification) */
export async function sendOtp(email: string): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  // Admin email — always allowed
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;

  if (!isAdmin) {
    // Check if this email belongs to a candidate
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      // Check if this email belongs to an existing manager/matchmaker (auth user with role=candidate)
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingManager = existingUsers?.users?.find(
        (u) => u.email === email && u.user_metadata?.role === "candidate"
      );

      if (!existingManager) {
        return {
          error: "כתובת מייל זו לא קיימת במערכת. ניתן להירשם כמועמד חדש או כשליח/שדכן.",
          showPhoneFlow: true,
        };
      }
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/** Step 2 – Verify the OTP code the user received via email */
export async function verifyOtp(
  email: string,
  token: string
): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: "אימות נכשל, נסה שוב" };
  }

  // Determine role: admin only for the designated admin email, otherwise candidate
  const currentRole = user.user_metadata?.role;

  if (!currentRole) {
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL;

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    const role = isAdmin ? "admin" : "candidate";

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role },
    });

    // Backfill manager_id for existing candidates
    if (candidate) {
      await supabase
        .from("candidates")
        .update({ manager_id: user.id })
        .eq("id", candidate.id)
        .is("manager_id", null);
    }

    redirect(role === "candidate" ? "/my-profile" : "/admin");
  }

  // Backfill manager_id on every login (for candidates migrated after initial login)
  if (currentRole === "candidate") {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", email)
      .is("manager_id", null)
      .limit(1)
      .maybeSingle();

    if (candidate) {
      await supabase
        .from("candidates")
        .update({ manager_id: user.id })
        .eq("id", candidate.id)
        .is("manager_id", null);
    }
  }

  redirect(currentRole === "candidate" ? "/my-profile" : "/admin");
}

/** Send SMS OTP via Twilio to a phone number (only for candidates without email) */
export async function sendSmsOtp(phone: string): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  const e164Phone = toE164(phone);

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, email, phone_number")
    .eq("phone_number", e164Phone)
    .limit(1)
    .maybeSingle();

  if (!candidate) {
    return { error: "מספר הטלפון לא נמצא במערכת" };
  }

  // This flow is ONLY for candidates without email
  if (candidate.email && candidate.email.trim() !== "") {
    return {
      error: "למספר זה קיימת כתובת אימייל במערכת. יש להתחבר באמצעות אימייל.",
    };
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in sms_otps table (expires in 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from("sms_otps").insert({
    phone: e164Phone,
    code,
    expires_at: expiresAt,
  });

  // Send via Twilio
  try {
    await sendTwilioSms(e164Phone, `קוד האימות שלך באתר Ronel Lovely: ${code}`);
  } catch {
    return { error: "שגיאה בשליחת SMS. נסה שוב מאוחר יותר." };
  }

  return { success: true };
}

/** Verify SMS OTP (Twilio-based) and log the user in */
export async function verifySmsOtp(
  phone: string,
  token: string
): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  const e164Phone = toE164(phone);

  // Check OTP in sms_otps table
  const { data: otp } = await supabase
    .from("sms_otps")
    .select("id, code, expires_at")
    .eq("phone", e164Phone)
    .eq("code", token)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return { error: "קוד אימות שגוי או שפג תוקפו" };
  }

  // Delete used OTP
  await supabase.from("sms_otps").delete().eq("id", otp.id);

  // Find candidate by phone
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, manager_id")
    .eq("phone_number", e164Phone)
    .maybeSingle();

  if (!candidate) {
    return { error: "מספר הטלפון לא נמצא במערכת" };
  }

  // Create or find auth user for this phone-only candidate
  const tempEmail = `phone_${e164Phone.replace("+", "")}@sms.ronellovely.co.il`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authUser: any = null;

  if (candidate.manager_id) {
    // Auth user already exists
    const { data: existing } = await supabase.auth.admin.getUserById(candidate.manager_id);
    authUser = existing?.user;

    // Ensure the user has an email for session creation
    if (authUser && !authUser.email) {
      await supabase.auth.admin.updateUserById(authUser.id, {
        email: tempEmail,
        email_confirm: true,
      });
    }
  }

  if (!authUser) {
    // Create a new auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: { role: "candidate", db_phone: e164Phone },
    });

    if (createError) {
      return { error: "שגיאה ביצירת חשבון. נסה שוב." };
    }
    authUser = newUser.user;
  }

  // Ensure role is set
  if (!authUser.user_metadata?.role) {
    await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: { role: "candidate", db_phone: e164Phone },
    });
  }

  // Generate magic link to create a session
  const userEmail = authUser.email || tempEmail;
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
  });

  if (linkError || !linkData) {
    return { error: "שגיאה בהתחברות. נסה שוב." };
  }

  // Verify the magic link OTP to establish session cookie
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: userEmail,
    token: linkData.properties.email_otp,
    type: "email",
  });

  if (verifyError) {
    return { error: "שגיאה בהתחברות. נסה שוב." };
  }

  // Backfill manager_id
  if (!candidate.manager_id) {
    await supabase
      .from("candidates")
      .update({ manager_id: authUser.id })
      .eq("id", candidate.id)
      .is("manager_id", null);
  }

  redirect("/my-profile");
}

/** Send OTP for manager/matchmaker registration (no candidate record needed) */
export async function sendManagerOtp(email: string): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  // Check if email is already registered as a candidate
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existingCandidate) {
    return {
      error: "כתובת מייל זו כבר רשומה כמועמד/ת במערכת. יש להתחבר דרך המסך הרגיל.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/** Verify OTP for manager registration and set role to candidate (manager) */
export async function verifyManagerOtp(
  email: string,
  token: string
): Promise<OtpResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: "אימות נכשל, נסה שוב" };
  }

  // Set role to "candidate" (which means manager/matchmaker in this system)
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { role: "candidate" },
  });

  // New manager must add at least one candidate first
  redirect("/new-candidate");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
