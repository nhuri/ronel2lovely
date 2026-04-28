"use client";

import { useEffect, useState, useCallback } from "react";
import { getEmailLogs, EmailLog } from "./email-logs-actions";

const CONTEXT_LABELS: Record<string, string> = {
  interest_email: "בקשת היכרות",
  mutual_confirmation_from: "אישור עניין – שולח",
  mutual_confirmation_to: "אישור עניין – מאשר",
  bulk_message: "הודעה המונית",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailLogsTab() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-bold text-gray-800">יומן מיילים</h2>
          {!loading && logs.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                ✓ {sentCount} נשלחו
              </span>
              {failedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                  ✕ {failedCount} נכשלו
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "טוען..." : "רענן"}
        </button>
      </div>

      {/* Note about login emails */}
      <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        הלוג מציג מיילים שנשלחו דרך הקוד (בקשות היכרות, אישורי עניין, הודעות המוניות).
        מיילי הזדהות (קישור כניסה) מנוהלים ישירות ע&quot;י Supabase ולא מופיעים כאן.
      </p>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">טוען...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p className="text-base mb-1">אין רשומות בלוג</p>
          <p className="text-xs">מיילים יופיעו כאן לאחר שישלחו</p>
        </div>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">שעה</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">נמען</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">נושא</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">הקשר</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-gray-50 transition-colors ${log.status === "failed" ? "bg-red-50/40" : "bg-white"}`}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {formatDate(log.sent_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {log.to_address}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    <span className="block truncate" title={log.subject}>
                      {log.subject}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {CONTEXT_LABELS[log.context] ?? log.context}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        ✓ נשלח
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          ✕ נכשל
                        </span>
                        {log.error_message && (
                          <p className="text-xs text-red-500 max-w-xs leading-snug">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && (
        <p className="text-xs text-gray-400 text-center">מציג עד 200 הרשומות האחרונות</p>
      )}
    </div>
  );
}
