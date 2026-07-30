"use client";

import { useState } from "react";
import { requestUnfreezeCode, confirmUnfreezeCode } from "./actions";

export function UnfreezeFlow({ candidateId }: { candidateId: number }) {
  const [step, setStep] = useState<"confirm" | "code">("confirm");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await requestUnfreezeCode(candidateId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setStep("code");
    }
  }

  async function handleResend() {
    setLoading(true);
    setError(null);
    setResent(false);
    const result = await requestUnfreezeCode(candidateId);
    setLoading(false);
    if (result.error) setError(result.error);
    else setResent(true);
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // On success this action redirects server-side and never returns here.
    const result = await confirmUnfreezeCode(code, candidateId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (step === "confirm") {
    return (
      <>
        <p className="text-sm text-gray-500 mb-6">
          הפרופיל שלך מוקפא כרגע ואינו פעיל. האם אתה מעוניין לשחרר את ההקפאה?
        </p>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-xl transition-colors mb-3"
        >
          {loading ? "שולח קוד..." : "כן, אני מעוניין/ת לשחרר"}
        </button>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmitCode}>
      <p className="text-sm text-gray-500 mb-4">
        שלחנו קוד אימות לכתובת המייל שלך. הזן/י אותו כדי להשלים את שחרור ההקפאה.
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="קוד אימות"
        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all mb-3"
      />
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl mb-3">
          {error}
        </div>
      )}
      {resent && !error && (
        <p className="text-emerald-600 text-xs mb-3">קוד חדש נשלח</p>
      )}
      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-xl transition-colors mb-2"
      >
        {loading ? "מאמת..." : "אשר קוד ושחרר הקפאה"}
      </button>
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="w-full px-6 py-2 text-xs text-sky-600 hover:text-sky-700 disabled:opacity-50 transition-colors"
      >
        שלח קוד מחדש
      </button>
    </form>
  );
}
