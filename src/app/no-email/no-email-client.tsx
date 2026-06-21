"use client";

import { useState } from "react";
import {
  sendNoEmailOtp,
  validateNoEmailOtp,
  verifyAndFreeze,
  verifyAndAddEmail,
} from "./actions";

type Option = "remove" | "view" | null;
type Step = "options" | "phone" | "otp" | "email" | "done";

interface Props {
  candidateId: number | null;
  gender: string | null;
}

export default function NoEmailClient({ candidateId, gender }: Props) {
  const isMale = gender !== "נקבה"; // default to male forms when gender unknown

  const [option, setOption] = useState<Option>(null);
  const [step, setStep] = useState<Step>("options");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  function chooseOption(opt: Option) {
    setOption(opt);
    setStep("phone");
    setError(null);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await sendNoEmailOtp(phone, candidateId);
    setLoading(false);
    if (res.error) return setError(res.error);
    setOtp("");
    setResendMsg(null);
    setStep("otp");
  }

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    setError(null);
    const res = await sendNoEmailOtp(phone, candidateId);
    setResending(false);
    if (res.error) setError(res.error);
    else { setOtp(""); setResendMsg("קוד חדש נשלח אליך ב-SMS"); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (option === "remove") {
      const res = await verifyAndFreeze(phone, otp, candidateId);
      setLoading(false);
      if (res.error) return setError(res.error);
      setStep("done");
    } else {
      const res = await validateNoEmailOtp(phone, otp);
      setLoading(false);
      if (res.error) return setError(res.error);
      setStep("email");
    }
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verifyAndAddEmail(phone, otp, email, candidateId);
    setLoading(false);
    if (res?.error) setError(res.error);
    // On success, server redirects to /my-profile/recommendations
  }

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all";

  const primaryBtn =
    "w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base";

  const errorBox = error && (
    <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
      {error}
    </div>
  );

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-500 rounded-2xl mb-3">
            <span className="text-white font-bold text-lg">RL</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Ronel Lovely</h1>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          {/* ── Step: options ── */}
          {step === "options" && (
            <>
              <p className="text-gray-700 font-medium text-center mb-6 leading-relaxed">
                מועמד התעניין בפרופיל שלך.
                <br />
                {isMale ? "בחר" : "בחרי"} מה ברצונך לעשות:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => chooseOption("view")}
                  className="w-full py-4 px-5 rounded-xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-right transition-all"
                >
                  <div className="text-base">צפיה בפרטי המועמד</div>
                  <div className="text-xs font-normal text-sky-500 mt-0.5">
                    {isMale ? "עדכן" : "עדכני"} את כתובת המייל שלך {isMale ? "וצפה" : "וצפי"} בהצעה
                  </div>
                </button>

                <button
                  onClick={() => chooseOption("remove")}
                  className="w-full py-4 px-5 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-right transition-all"
                >
                  <div className="text-base">הסר את הפרופיל שלי מהאתר</div>
                  <div className="text-xs font-normal text-rose-400 mt-0.5">
                    הפרופיל שלך יוסר לאחר אימות מספר הטלפון
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Step: phone ── */}
          {step === "phone" && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                {option === "remove"
                  ? "הסרת הפרופיל"
                  : "צפיה בפרטי המועמד"}
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                {isMale ? "הכנס" : "הכניסי"} את מספר הטלפון שלך לקבלת קוד אימות
              </p>

              {option === "view" && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 mb-4 text-sm text-sky-700 leading-relaxed">
                  על מנת לצפות בפרטי המועמד עליך לעדכן את כתובת המייל שלך
                  באתר. {isMale ? "הכנס" : "הכניסי"} את מספר הטלפון שלך ולאחר
                  מכן {isMale ? "הכנס" : "הכניסי"} את קוד האימות שנשלח אליך
                  בSMS.
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    מספר טלפון
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="050-0000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {errorBox}
                <button type="submit" disabled={loading} className={primaryBtn}>
                  {loading ? "שולח..." : "שלח קוד SMS"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("options"); setError(null); }}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  חזור
                </button>
              </form>
            </>
          )}

          {/* ── Step: otp ── */}
          {step === "otp" && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-1">קוד אימות</h2>
              <p className="text-sm text-gray-500 mb-5">
                קוד אימות נשלח אליך ב-SMS
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    קוד אימות (6 ספרות)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    dir="ltr"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                    className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                  />
                </div>
                {errorBox}
                {resendMsg && (
                  <div className="text-green-700 text-sm bg-green-50 border border-green-100 p-3 rounded-xl text-center">
                    {resendMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className={
                    option === "remove"
                      ? "w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 active:bg-rose-700 disabled:opacity-50 transition-all shadow-sm text-base"
                      : primaryBtn
                  }
                >
                  {loading
                    ? "מאמת..."
                    : option === "remove"
                    ? "הסר את הפרופיל שלי"
                    : "אמת ועבור לשלב הבא"}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-2 text-sm text-sky-500 hover:text-sky-700 transition-colors disabled:opacity-50"
                >
                  {resending ? "שולח..." : "שלח קוד חדש"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(null); setResendMsg(null); }}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  שינוי מספר טלפון
                </button>
              </form>
            </>
          )}

          {/* ── Step: email (option "view" only) ── */}
          {step === "email" && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                עדכון כתובת מייל
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                {isMale ? "הכנס" : "הכניסי"} את כתובת המייל שלך. לאחר מכן תועבר
                ישירות לעמוד ההצעות בפרופיל שלך.
              </p>

              <form onSubmit={handleAddEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    כתובת מייל
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {errorBox}
                <button type="submit" disabled={loading} className={primaryBtn}>
                  {loading ? "שומר ומתחבר..." : isMale ? "שמור מייל וצפה בהצעה" : "שמורי מייל וצפי בהצעה"}
                </button>
              </form>
            </>
          )}

          {/* ── Step: done (remove success) ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                הפרופיל הוסר בהצלחה
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                הפרופיל שלך הוסר מהאתר.
                <br />
                לשאלות ניתן לפנות לצוות האתר במייל ronel2lovely@gmail.com
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
