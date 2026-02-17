"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { replyToInquiry, markInquiryRead } from "@/app/admin/candidate/[id]/actions";

interface CandidateBasic {
  id: number;
  full_name: string;
  image_urls: string[] | null;
}

interface Inquiry {
  id: number;
  candidate_id: number;
  category: string;
  message: string;
  created_at: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  candidate: CandidateBasic;
}

interface Props {
  inquiries: Inquiry[];
}

type FilterType = "all" | "אישי" | "שדרוג" | "unreplied";

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

function CandidateAvatar({ src, name }: { src?: string | null; name: string }) {
  return src ? (
    <Image
      src={src}
      alt={name}
      width={32}
      height={32}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: 32, height: 32 }}
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

export function InquiriesAdminClient({ inquiries }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      if (filter === "all") return true;
      if (filter === "unreplied") return !inq.admin_reply;
      return inq.category === filter;
    });
  }, [inquiries, filter]);

  const unreadCount = inquiries.filter((i) => !i.is_read).length;
  const unrepliedCount = inquiries.filter((i) => !i.admin_reply).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">
                פניות מועמדים
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                {unreadCount > 0 ? `${unreadCount} לא נקראו` : "הכל נקרא"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              חזרה לניהול
            </Link>
            <Link
              href="/admin/proposals"
              className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
            >
              הצעות שידוך
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                התנתקות
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6" dir="rtl">
        {/* Filter buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all" as FilterType, label: "הכל", count: inquiries.length },
              { key: "אישי" as FilterType, label: "פניות אישיות", count: inquiries.filter((i) => i.category === "אישי").length },
              { key: "שדרוג" as FilterType, label: "הצעות שדרוג", count: inquiries.filter((i) => i.category === "שדרוג").length },
              { key: "unreplied" as FilterType, label: "ללא תגובה", count: unrepliedCount },
            ]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === key
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Inquiries list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-1">אין פניות</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((inq) => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                onUpdated={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </main>
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

  const c = inquiry.candidate;

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
    <div
      className={`bg-white rounded-2xl shadow-sm border p-5 ${
        inquiry.is_read ? "border-gray-200" : "border-sky-300"
      }`}
    >
      {/* Header: candidate info + category + date */}
      <div className="flex items-center gap-3 mb-3">
        <CandidateAvatar src={c?.image_urls?.[0]} name={c?.full_name ?? ""} />
        <div className="flex-1 min-w-0">
          <Link
            href={`/admin/candidate/${c?.id}`}
            className="text-sm font-bold text-gray-800 hover:text-sky-600 transition-colors"
          >
            {c?.full_name ?? "—"}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <CategoryBadge category={inquiry.category} />
            <span className="text-[11px] text-gray-400">
              {new Date(inquiry.created_at).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
        {!inquiry.is_read && (
          <button
            onClick={handleMarkRead}
            className="text-[11px] text-sky-600 hover:text-sky-700 whitespace-nowrap"
          >
            סמן כנקרא
          </button>
        )}
      </div>

      {/* Message */}
      <p className="text-sm text-gray-700 whitespace-pre-line mb-3">
        {inquiry.message}
      </p>

      {/* Admin reply */}
      {inquiry.admin_reply ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[11px] text-emerald-600 font-medium mb-1">
            תגובת מנהל
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {inquiry.admin_reply}
          </p>
          <p className="text-[11px] text-emerald-500 mt-2">
            {inquiry.replied_at &&
              new Date(inquiry.replied_at).toLocaleString("he-IL")}
          </p>
        </div>
      ) : showReplyForm ? (
        <div className="space-y-2 mt-2">
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
              onClick={() => {
                setShowReplyForm(false);
                setReplyText("");
              }}
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
          className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors mt-1"
        >
          כתוב תגובה
        </button>
      )}
    </div>
  );
}
