"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMOVAL_REASONS, removalReasonLabel } from "@/lib/removalReasons";
import { coupleOrdinalPhrase } from "@/lib/coupleOrdinal";
import { getMarriedCoupleCount } from "@/app/my-profile/actions";
import { freezeCandidateProfile, restoreCandidateProfile, reportMarriageViaInitiativeAsAdmin } from "./actions";

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

  // Congratulations flow — mirrors the candidate's own self-freeze popups
  // (src/app/my-profile/profile-client.tsx) for the two engagement reasons.
  const [marriagePopup, setMarriagePopup] = useState<"none" | "outside" | "via">("none");
  const [marriedOrdinal, setMarriedOrdinal] = useState<number | null>(null);
  const [loadingOrdinal, setLoadingOrdinal] = useState(false);
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerPhoneError, setPartnerPhoneError] = useState<string | null>(null);
  const [sendingMarriage, setSendingMarriage] = useState(false);

  async function doFreeze() {
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

  async function handleFreeze() {
    setError(null);
    if (!reason) return setError("יש לבחור סיבה");
    if (reason === "other" && !reasonOther.trim()) return setError("יש לפרט את הסיבה");

    if (reason === "married_outside") {
      setMarriagePopup("outside");
      return;
    }
    if (reason === "married_via") {
      setLoadingOrdinal(true);
      const count = await getMarriedCoupleCount();
      setMarriedOrdinal(count + 1);
      setLoadingOrdinal(false);
      setMarriagePopup("via");
      return;
    }

    await doFreeze();
  }

  function handleOutsideCongratsClose() {
    setMarriagePopup("none");
    doFreeze();
  }

  async function handleSendMarriageViaInitiative() {
    setPartnerPhoneError(null);
    if (!partnerPhone.trim()) {
      setPartnerPhoneError("יש להזין מספר טלפון");
      return;
    }
    setSendingMarriage(true);
    const result = await reportMarriageViaInitiativeAsAdmin(candidateId, partnerPhone);
    setSendingMarriage(false);
    if (result?.error) {
      setPartnerPhoneError(result.error);
      return;
    }
    setMarriagePopup("none");
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
              disabled={saving || loadingOrdinal}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
            >
              {saving || loadingOrdinal ? "מקפיא..." : "הקפא פרופיל"}
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

      {/* Congratulations modal — candidate got engaged/married outside the initiative */}
      {marriagePopup === "outside" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-7 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">מזל טוב!</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              איחולים חמים מכל צוות האתר!
            </p>
            <button
              onClick={handleOutsideCongratsClose}
              disabled={saving}
              className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 disabled:opacity-50 transition-all text-sm"
            >
              {saving ? "מעדכן..." : "תודה!"}
            </button>
          </div>
        </div>
      )}

      {/* Congratulations modal — candidate got engaged/married through the initiative */}
      {marriagePopup === "via" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-7 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">באמת? ממש מתרגשים לשמוע!!!</h2>
            <p className="text-base font-bold text-emerald-600 mb-2">מזל טוב!</p>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              אתם {marriedOrdinal != null ? coupleOrdinalPhrase(marriedOrdinal) : ""} שמתחתן דרך המיזם!
            </p>
            <div className="text-right mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                מספר הטלפון של בן/בת הזוג
              </label>
              <input
                type="tel"
                dir="ltr"
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                placeholder="050-0000000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all"
              />
              {partnerPhoneError && <p className="mt-1 text-xs text-red-600">{partnerPhoneError}</p>}
            </div>
            <button
              onClick={handleSendMarriageViaInitiative}
              disabled={sendingMarriage}
              className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 disabled:opacity-50 transition-all text-sm"
            >
              {sendingMarriage ? "שולח..." : "שלח"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
