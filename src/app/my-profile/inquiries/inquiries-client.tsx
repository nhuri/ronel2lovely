"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitInquiry } from "@/app/my-profile/actions";

interface Inquiry {
  id: number;
  category: string;
  message: string;
  created_at: string;
  admin_reply: string | null;
  replied_at: string | null;
}

interface Props {
  inquiries: Inquiry[];
  gender?: string;
  candidateId?: number;
}

function CategoryBadge({ category }: { category: string }) {
  const isPersonal = category === "אישי";
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
        isPersonal
          ? "bg-sky-100 text-sky-700"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {isPersonal ? "פנייה אישית" : "הצעת שדרוג"}
    </span>
  );
}

export function InquiriesClient({ inquiries, gender, candidateId }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<"אישי" | "שדרוג">("אישי");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const result = await submitInquiry(category, message, candidateId);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      setMessage("");
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* New inquiry form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />
          פנייה חדשה
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {gender === "נקבה" ? "פה תוכלי לפנות למערכת לעזרה אישית או להציע שיפורים ושדרוגים לשיפור חווית המשתמש" : "פה תוכל לפנות למערכת לעזרה אישית או להציע שיפורים ושדרוגים לשיפור חווית המשתמש"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Category picker */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategory("אישי")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                category === "אישי"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              פנייה אישית
            </button>
            <button
              type="button"
              onClick={() => setCategory("שדרוג")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                category === "שדרוג"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              הצעת שדרוג
            </button>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder={
              category === "אישי"
                ? gender === "נקבה" ? "תארי את הפנייה שלך..." : "תאר את הפנייה שלך..."
                : gender === "נקבה" ? "תארי את השיפור או השדרוג שתרצי לראות..." : "תאר את השיפור או השדרוג שתרצה לראות..."
            }
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none"
          />

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
              הפנייה נשלחה בהצלחה
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !message.trim()}
            className="w-full py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-sm"
          >
            {saving ? "שולח..." : "שלח פנייה"}
          </button>
        </form>
      </div>

      {/* Inquiries list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-gray-400 rounded-full inline-block" />
          הפניות שלי ({inquiries.length})
        </h2>

        {inquiries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            עדיין לא שלחת פניות
          </p>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CategoryBadge category={inq.category} />
                  <span className="text-[11px] text-gray-400">
                    {new Date(inq.created_at).toLocaleString("he-IL")}
                  </span>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-line mb-2">
                  {inq.message}
                </p>

                {inq.admin_reply ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
                    <p className="text-[11px] text-emerald-600 font-medium mb-1">
                      תגובת המערכת
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {inq.admin_reply}
                    </p>
                    <p className="text-[11px] text-emerald-500 mt-2">
                      {inq.replied_at &&
                        new Date(inq.replied_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-1">
                    ממתין לתגובה
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
