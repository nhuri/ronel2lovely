"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMOVAL_REASONS, removalReasonLabel } from "@/lib/removalReasons";
import { freezeCandidateProfile, restoreCandidateProfile } from "./actions";

interface Props {
  candidateId: number;
  availabilityStatus: string | null;
  removalReason: string | null;
  removalReasonOther: string | null;
  removedBy: string | null;
}

export function CandidateStatusSection({
  candidateId,
  availabilityStatus,
  removalReason,
  removalReasonOther,
  removedBy,
}: Props) {
  const router = useRouter();
  const isFrozen = availabilityStatus === "הקפאה";
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFreeze() {
    setError(null);
    if (!reason) return setError("יש לבחור סיבה");
    if (reason === "other" && !reasonOther.trim()) return setError("יש לפרט את הסיבה");

    setSaving(true);
    const result = await freezeCandidateProfile(candidateId, reason, reasonOther);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setShowConfirm(false);
    router.refresh();
  }

  async function handleRestore() {
    setError(null);
    setSaving(true);
    const result = await restoreCandidateProfile(candidateId);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (isFrozen) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-4" dir="rtl">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-red-700">
              הפרופיל מוקפא{removedBy === "admin" ? " (ע״י מנהל)" : ""}
            </p>
            {removalReason && (
              <p className="text-xs text-red-600 mt-0.5">
                סיבה: {removalReasonLabel(removalReason)}
                {removalReason === "other" && removalReasonOther ? ` — ${removalReasonOther}` : ""}
              </p>
            )}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <button
            onClick={handleRestore}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? "משחרר..." : "שחרר הקפאה"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-4" dir="rtl">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          הקפאת פרופיל (מנהל)
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-red-700 mb-3">
            הקפאת הפרופיל תסתיר אותו ממאגרי ההתאמה. ניתן לשחרר בכל עת.
          </p>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">מה הסיבה?</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
            >
              <option value="">בחר סיבה...</option>
              {REMOVAL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {reason === "other" && (
              <textarea
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                rows={2}
                placeholder="פרט את הסיבה..."
                className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all resize-none"
              />
            )}
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleFreeze}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
            >
              {saving ? "מקפיא..." : "הקפא פרופיל"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setError(null); }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
