"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToInquiry, markInquiryRead } from "./actions";

interface Inquiry {
  id: number;
  category: string;
  message: string;
  created_at: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
}

interface Props {
  candidateId: number;
  inquiries: Inquiry[];
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

export function InquiriesSection({ candidateId: _candidateId, inquiries }: Props) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />
        פניות ({inquiries.length})
      </h2>

      {inquiries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">אין פניות</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <InquiryCard
              key={inq.id}
              inquiry={inq}
              onUpdated={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({
  inquiry,
  onUpdated,
}: {
  inquiry: Inquiry;
  onUpdated: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;
    setError(null);
    setSaving(true);
    const result = await replyToInquiry(inquiry.id, replyText);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      setReplyText("");
      setSaving(false);
      onUpdated();
    }
  }

  async function handleMarkRead() {
    await markInquiryRead(inquiry.id);
    onUpdated();
  }

  return (
    <div className={`border rounded-xl p-4 ${inquiry.is_read ? "border-gray-200" : "border-sky-300 bg-sky-50/30"}`}>
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={inquiry.category} />
        <span className="text-[11px] text-gray-400">
          {new Date(inquiry.created_at).toLocaleString("he-IL")}
        </span>
        {!inquiry.is_read && (
          <button
            onClick={handleMarkRead}
            className="text-[11px] text-sky-600 hover:text-sky-700 mr-auto"
          >
            סמן כנקרא
          </button>
        )}
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-line mb-3">
        {inquiry.message}
      </p>

      {/* Admin reply */}
      {inquiry.admin_reply ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
          <p className="text-[11px] text-emerald-600 font-medium mb-1">תגובת מנהל</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {inquiry.admin_reply}
          </p>
          <p className="text-[11px] text-emerald-500 mt-2">
            {inquiry.replied_at && new Date(inquiry.replied_at).toLocaleString("he-IL")}
          </p>
        </div>
      ) : (
        <div className="mt-2">
          {showReplyForm ? (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                placeholder="כתוב תגובה..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent focus:bg-white transition-all resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReply}
                  disabled={saving || !replyText.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? "שולח..." : "שלח תגובה"}
                </button>
                <button
                  onClick={() => { setShowReplyForm(false); setReplyText(""); }}
                  className="px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ביטול
                </button>
                {error && <span className="text-xs text-red-600">{error}</span>}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              כתוב תגובה
            </button>
          )}
        </div>
      )}
    </div>
  );
}
