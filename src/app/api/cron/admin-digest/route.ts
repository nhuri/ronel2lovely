import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmailWithLog } from "@/lib/email";
import {
  getAdminNotificationSettings,
  NOTIFICATION_TYPE_LABELS,
  type AdminNotificationType,
} from "@/lib/adminNotifications";

export const runtime = "nodejs";

const ADMIN_EMAIL = "ronel2lovely@gmail.com";

const SECTION_ORDER: AdminNotificationType[] = [
  "new_candidate_admin_alert",
  "daily_proposal_limit_reached",
  "candidate_self_froze",
  "unfreeze_request",
  "candidate_email_update",
];

type PendingRow = {
  id: number;
  type: string;
  message: string;
  link_url: string | null;
  candidate_id: number | null;
};

function buildDigestHtml(rows: PendingRow[]): string {
  // Group by (type, candidate_id) — a candidate retrying the same action
  // repeatedly (e.g. hitting the daily proposal quota over and over) should
  // collapse into one line with a count, not flood the digest.
  const groups = new Map<string, { row: PendingRow; count: number }>();
  for (const row of rows) {
    const key = `${row.type}:${row.candidate_id ?? row.message}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { row, count: 1 });
    }
  }

  const byType = new Map<string, { row: PendingRow; count: number }[]>();
  for (const entry of groups.values()) {
    const list = byType.get(entry.row.type) ?? [];
    list.push(entry);
    byType.set(entry.row.type, list);
  }

  const sections = SECTION_ORDER.filter((type) => byType.has(type))
    .map((type) => {
      const items = byType.get(type)!;
      const title = NOTIFICATION_TYPE_LABELS[type];
      const lines = items
        .map(({ row, count }) => {
          const suffix = count > 1 ? ` (×${count})` : "";
          const link = row.link_url
            ? ` — <a href="${row.link_url}" style="color:#0284c7;">צפייה</a>`
            : "";
          return `<li style="margin-bottom:8px;">${row.message}${suffix}${link}</li>`;
        })
        .join("");
      return `
        <h3 style="font-size:14px;color:#0284c7;margin:20px 0 8px;">${title}</h3>
        <ul style="margin:0;padding-inline-start:20px;font-size:14px;line-height:1.6;">${lines}</ul>`;
    })
    .join("");

  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#374151;">
      <p style="font-size:13px;color:#0284c7;font-weight:bold;margin:0 0 4px;">Ronel Lovely — סיכום התראות</p>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        ${rows.length} התראות ממתינות
      </p>
      ${sections}
    </div>`;
}

export async function GET(request: Request) {
  if (
    request.headers.get("Authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { intervalMinutes } = await getAdminNotificationSettings();

  // Enforce the admin's chosen digest interval even if this route happens to
  // be pinged more often than that by the external scheduler.
  const { data: lastDigest } = await admin
    .from("email_logs")
    .select("sent_at")
    .eq("context", "admin_notification_digest")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastDigest?.sent_at) {
    const intervalMs = intervalMinutes * 60 * 1000;
    const elapsedMs = Date.now() - new Date(lastDigest.sent_at as string).getTime();
    if (elapsedMs < intervalMs) {
      return Response.json({
        sent: false,
        reason: "interval_not_elapsed",
        nextEligibleAt: new Date(
          new Date(lastDigest.sent_at as string).getTime() + intervalMs
        ).toISOString(),
      });
    }
  }

  const { data: rows, error } = await admin
    .from("pending_admin_notifications")
    .select("id, type, message, link_url, candidate_id")
    .is("sent_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return Response.json({ sent: false, count: 0 });
  }

  const result = await sendEmailWithLog({
    to: ADMIN_EMAIL,
    subject: `סיכום התראות (${rows.length})`,
    html: buildDigestHtml(rows as PendingRow[]),
    context: "admin_notification_digest",
  });

  if (!result.success) {
    return Response.json({ sent: false, count: rows.length, error: result.error }, { status: 500 });
  }

  await admin
    .from("pending_admin_notifications")
    .update({ sent_at: new Date().toISOString() })
    .in("id", rows.map((r) => r.id));

  return Response.json({ sent: true, count: rows.length });
}
