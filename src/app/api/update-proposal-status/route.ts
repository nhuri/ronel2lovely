import { createSupabaseAdminClient } from "@/lib/supabase/server";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

function successHtml(message: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>Ronel Lovely</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: white; border-radius: 16px; padding: 32px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    h2 { color: #059669; margin-bottom: 8px; font-size: 18px; }
    p { color: #6b7280; font-size: 14px; margin: 0 0 20px; }
    a { display: inline-block; padding: 10px 24px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>✓ ${message}</h2>
    <p>תודה על העדכון!</p>
    <a href="https://ronel-lovely.com/my-profile">לפרופיל שלי</a>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>Ronel Lovely</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: white; border-radius: 16px; padding: 32px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    h2 { color: #ef4444; margin-bottom: 8px; font-size: 18px; }
    p { color: #6b7280; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <h2>שגיאה</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(errorHtml("קישור לא תקין."), { headers: HTML_HEADERS });
  }

  const admin = createSupabaseAdminClient();
  const { data: tokenData } = await admin
    .from("status_update_tokens")
    .select("token, proposal_id, new_status, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!tokenData) {
    return new Response(errorHtml("קישור לא תקין."), { headers: HTML_HEADERS });
  }

  if (tokenData.used_at) {
    return new Response(successHtml("הסטטוס כבר עודכן בעבר."), {
      headers: HTML_HEADERS,
    });
  }

  if (new Date(tokenData.expires_at as string) < new Date()) {
    return new Response(errorHtml("קישור זה פג תוקף."), {
      headers: HTML_HEADERS,
    });
  }

  await Promise.all([
    admin
      .from("proposals")
      .update({ status: tokenData.new_status })
      .eq("id", tokenData.proposal_id),
    admin
      .from("status_update_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token),
  ]);

  return new Response(successHtml("הסטטוס עודכן בהצלחה."), {
    headers: HTML_HEADERS,
  });
}
