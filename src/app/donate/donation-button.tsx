"use client";

import { useState } from "react";
import { recordDonation } from "./actions";

const DONATION_URL =
  "https://pay.grow.link/aa2b4891bc8e6a009aae2746b5dbb201-MzAxMDU0Nw";

export function DonationButton() {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    window.open(DONATION_URL, "_blank", "noopener,noreferrer");
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-lg border border-white/30 transition-colors"
      >
        ❤️ תרומה
      </button>

      {showModal && <DonationModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function DonationModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("אנא הכנס סכום תקין");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await recordDonation(num, fullName || undefined);
    setSubmitting(false);
    if (res.success) {
      setDone(true);
    } else {
      setError(res.error ?? "שגיאה בשמירה");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" dir="rtl">
        {done ? (
          /* Success */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">תודה רבה על תרומתך!</h3>
            <p className="text-sm text-gray-500">
              התרומה תועדה במערכת. כל תרומה עוזרת למיזם לבנות עוד בתים לזכרו של רונאל.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              סגור
            </button>
          </div>
        ) : (
          /* Form */
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">תיעוד תרומה</h3>
                <p className="text-xs text-gray-400 mt-0.5">לאחר השלמת התרומה</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-sky-700 leading-relaxed">
                העברנו אותך לדף התרומה המאובטח. לאחר שתסיים, נשמח אם תעדכן כאן את
                סכום התרומה כדי שנוכל לתעד את האימפקט של המיזם.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  סכום התרומה (₪) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="לדוגמה: 100"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  שם מלא (אופציונלי)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="לדוגמה: ישראל ישראלי"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {submitting ? "שומר..." : "שלח ✓"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm transition-colors"
                >
                  דלג
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
