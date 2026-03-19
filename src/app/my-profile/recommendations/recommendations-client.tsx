"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { ScoredMatch } from "@/lib/matching";
import { sendInterestEmail, rejectRecommendation } from "./actions";

interface Props {
  matches: ScoredMatch[];
  gender: string;
  candidateId: number;
}

export function RecommendationsClient({ matches, gender, candidateId }: Props) {
  const [visibleMatches, setVisibleMatches] = useState<ScoredMatch[]>(matches);
  const [selectedMatch, setSelectedMatch] = useState<ScoredMatch | null>(null);
  const [sentToIds, setSentToIds] = useState<Set<number>>(new Set());
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const handleSent = (id: number) => {
    setSentToIds((prev) => new Set(prev).add(id));
  };

  const handleReject = async (matchId: number, reason: string) => {
    await rejectRecommendation(candidateId, matchId, reason);
    setVisibleMatches((prev) => prev.filter((m) => (m.candidate.id as number) !== matchId));
    setRejectingId(null);
    if (selectedMatch && (selectedMatch.candidate.id as number) === matchId) {
      setSelectedMatch(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Intro */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
          ההתאמות המומלצות שלך
        </h2>
        <p className="text-xs text-gray-500">
          {gender === "נקבה"
            ? "בחרנו עבורך את המועמדים המתאימים ביותר לפרופיל שלך. ההתאמות מתבססות על גיל, רמה דתית, מצב משפחתי ומיקום."
            : "בחרנו עבורך את המועמדות המתאימות ביותר לפרופיל שלך. ההתאמות מתבססות על גיל, רמה דתית, מצב משפחתי ומיקום."}
        </p>
      </div>

      {/* Match cards */}
      {visibleMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">אין התאמות כרגע</p>
          <p className="text-sm">נחפש עבורך שוב בקרוב</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMatches.map((match, index) => (
            <MatchCard
              key={match.candidate.id}
              match={match}
              rank={index + 1}
              sent={sentToIds.has(match.candidate.id as number)}
              onClick={() => setSelectedMatch(match)}
              onReject={() => setRejectingId(match.candidate.id as number)}
            />
          ))}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectingId !== null && (
        <RejectModal
          matchId={rejectingId}
          matchName={visibleMatches.find((m) => (m.candidate.id as number) === rejectingId)?.candidate.full_name as string ?? ""}
          onConfirm={handleReject}
          onCancel={() => setRejectingId(null)}
        />
      )}

      {/* Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          gender={gender}
          candidateId={candidateId}
          alreadySent={sentToIds.has(selectedMatch.candidate.id as number)}
          onSent={handleSent}
          onReject={() => {
            setRejectingId(selectedMatch.candidate.id as number);
            setSelectedMatch(null);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

function MatchCard({
  match,
  rank,
  sent,
  onClick,
  onReject,
}: {
  match: ScoredMatch;
  rank: number;
  sent: boolean;
  onClick: () => void;
  onReject: () => void;
}) {
  const c = match.candidate;
  const img = (c.image_urls as string[] | null)?.[0];

  return (
    <div className="relative w-full text-right bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-pink-200 transition-all">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex cursor-pointer"
      >
        {/* Photo */}
        <div className="relative w-32 sm:w-40 flex-shrink-0 bg-gray-100">
          {img ? (
            <Image
              src={img}
              alt={c.full_name as string}
              fill
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {/* Rank badge */}
          <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-sm">
            {rank}
          </span>
          {/* Sent badge */}
          {sent && (
            <span className="absolute bottom-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              נשלח ✓
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-4 text-right">
          <h3 className="font-bold text-gray-800 text-base leading-tight">
            {c.full_name as string}
          </h3>

          <div className="mt-2 space-y-1">
            <InfoRow label="גיל" value={c.age != null ? String(c.age) : "-"} />
            <InfoRow label="עיר" value={(c.residence as string) || "-"} />
            <InfoRow label="רמה דתית" value={(c.religious_level as string) || "-"} />
            <InfoRow label="תעסוקה" value={(c.occupation as string) || "-"} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {c.marital_status && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                {c.marital_status as string}
              </span>
            )}
            {c.education && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                {c.education as string}
              </span>
            )}
          </div>

          <p className="text-[10px] text-pink-400 mt-2 font-medium">לחצו לפרטים נוספים</p>
        </div>
      </button>

      {/* Reject button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onReject(); }}
        className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full transition-colors"
      >
        לא מתאים/ה
      </button>
    </div>
  );
}

function RejectModal({
  matchId,
  matchName,
  onConfirm,
  onCancel,
}: {
  matchId: number;
  matchName: string;
  onConfirm: (matchId: number, reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
        <h3 className="text-base font-bold text-gray-800">הסרת המלצה</h3>
        <p className="text-sm text-gray-600">{matchName} לא יופיע/תופיע יותר ברשימת ההמלצות שלך.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="סיבה (אופציונלי)"
          rows={2}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(matchId, reason)}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors"
          >
            הסר
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchDetailModal({
  match,
  gender,
  candidateId,
  alreadySent,
  onSent,
  onReject,
  onClose,
}: {
  match: ScoredMatch;
  gender: string;
  candidateId: number;
  alreadySent: boolean;
  onSent: (id: number) => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const c = match.candidate;
  const imgs = (c.image_urls as string[] | null) ?? [];
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showConfirm && confirmRef.current) {
      confirmRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showConfirm]);

  const matchId = c.id as number;
  const recipientGender = c.gender as string;
  const interestedText = gender === "זכר" ? "אני מעוניין להכיר" : "אני מעוניינת להכיר";
  const sentLabel = recipientGender === "זכר" ? "נשלח מייל למועמד ✓" : "נשלח מייל למועמדת ✓";
  const confirmText =
    recipientGender === "זכר"
      ? `לחיצה על אישור תשלח מייל ל${c.full_name}. הוא יקבל את הפרטים שלך וכתובת המייל שלך. ויוכל ליצור אתך קשר במידה ותהיה התאמה הדדית.`
      : `לחיצה על אישור תשלח מייל ל${c.full_name}. היא תקבל את הפרטים שלך וכתובת המייל שלך. ותוכל ליצור אתך קשר במידה ותהיה התאמה הדדית.`;

  const handleConfirm = async () => {
    setSending(true);
    setError(null);
    setShowConfirm(false);
    const res = await sendInterestEmail(candidateId, matchId);
    setSending(false);
    if (res.success) {
      onSent(matchId);
    } else {
      setError(res.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showConfirm) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Photo */}
        <div className="relative w-full bg-gray-900 rounded-t-2xl overflow-hidden">
          {imgs.length > 0 ? (
            <div className="w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgs[0]}
                alt={c.full_name as string}
                className="w-full max-h-[50vh] object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4" dir="rtl">
          <h2 className="text-xl font-bold text-gray-800">
            {c.full_name as string}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <DetailItem label="גיל" value={c.age != null ? String(c.age) : "-"} />
            <DetailItem label="עיר" value={(c.residence as string) || "-"} />
            <DetailItem label="רמה דתית" value={(c.religious_level as string) || "-"} />
            <DetailItem label="מצב משפחתי" value={(c.marital_status as string) || "-"} />
            <DetailItem label="תעסוקה" value={(c.occupation as string) || "-"} />
            <DetailItem label="השכלה" value={(c.education as string) || "-"} />
            {c.height && (
              <DetailItem label="גובה" value={`${c.height} ס״מ`} />
            )}
          </div>

          {c.about_me && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] text-gray-400 font-medium mb-1">קצת על עצמי</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {c.about_me as string}
              </p>
            </div>
          )}

          {/* Interest button area */}
          {alreadySent ? (
            <div className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-sm text-center">
              {sentLabel}
            </div>
          ) : sending ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <svg className="animate-spin w-10 h-10 text-pink-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-gray-500">שולח מייל...</p>
            </div>
          ) : showConfirm ? (
            <div ref={confirmRef} className="bg-pink-50 border border-pink-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">{confirmText}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-gradient-to-l from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-rose-600 transition-all"
                >
                  אישור ❤️
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-2">
              <div className="text-center py-3 px-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                נסה שוב
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 bg-gradient-to-l from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 active:from-pink-700 active:to-rose-700 transition-all shadow-sm text-sm"
            >
              {interestedText} ❤️
            </button>
          )}

          <button
            onClick={onReject}
            className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            לא מתאים/ה — הסר מהרשימה
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 font-medium w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
