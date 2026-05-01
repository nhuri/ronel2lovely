"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp, sendSmsOtp, verifySmsOtp, sendManagerOtp, verifyManagerOtp } from "./actions";
import Image from "next/image";
import Link from "next/link";

type Step = "email" | "otp";
type SmsStep = "phone" | "code";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  // Lock viewport to exactly 100dvh: no scroll, body becomes a flex column so
  // the login page fills the remaining height after banner + video strip.
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100dvh";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.display = "";
      document.body.style.flexDirection = "";
    };
  }, []);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // SMS modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsStep, setSmsStep] = useState<SmsStep>("phone");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsToken, setSmsToken] = useState("");
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);

  // Manager registration modal state
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [mgrStep, setMgrStep] = useState<"email" | "otp">("email");
  const [mgrEmail, setMgrEmail] = useState("");
  const [mgrToken, setMgrToken] = useState("");
  const [mgrError, setMgrError] = useState<string | null>(null);
  const [mgrLoading, setMgrLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await sendOtp(email);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setStep("otp");
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await verifyOtp(email, token, next);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, verifyOtp redirects server-side
  }

  async function handleSendSmsOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSmsError(null);
    setSmsLoading(true);

    const result = await sendSmsOtp(smsPhone);

    if (result?.error) {
      setSmsError(result.error);
      setSmsLoading(false);
    } else {
      setSmsStep("code");
      setSmsLoading(false);
    }
  }

  async function handleVerifySmsOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSmsError(null);
    setSmsLoading(true);

    const result = await verifySmsOtp(smsPhone, smsToken, next);

    if (result?.error) {
      setSmsError(result.error);
      setSmsLoading(false);
    }
    // On success, verifySmsOtp redirects server-side
  }

  async function handleSendManagerOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMgrError(null);
    setMgrLoading(true);

    const result = await sendManagerOtp(mgrEmail);
    if (result?.error) {
      setMgrError(result.error);
      setMgrLoading(false);
    } else {
      setMgrStep("otp");
      setMgrLoading(false);
    }
  }

  async function handleVerifyManagerOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMgrError(null);
    setMgrLoading(true);

    const result = await verifyManagerOtp(mgrEmail, mgrToken);
    if (result?.error) {
      setMgrError(result.error);
      setMgrLoading(false);
    }
    // On success, verifyManagerOtp redirects server-side
  }

  function openManagerModal() {
    setShowManagerModal(true);
    setMgrStep("email");
    setMgrEmail("");
    setMgrToken("");
    setMgrError(null);
  }

  function closeManagerModal() {
    setShowManagerModal(false);
    setMgrStep("email");
    setMgrEmail("");
    setMgrToken("");
    setMgrError(null);
  }

  function openSmsModal() {
    setError(null);
    setShowSmsModal(true);
  }

  function closeSmsModal() {
    setShowSmsModal(false);
    setSmsStep("phone");
    setSmsPhone("");
    setSmsToken("");
    setSmsError(null);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col" dir="rtl">

      {/* ── Two-column content ── */}
      <div className="flex flex-1 min-h-0">

      {/* ── Right side: Image + video thumbnail ── */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-sky-100 items-start justify-center overflow-hidden">
        <Image
          src="/ronel-web-new.png"
          alt="סמ״ר רונאל בן משה ז״ל"
          fill
          className="object-contain object-top"
          priority
        />
      </div>

      {/* ── Left side: Login Form ── */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-start lg:justify-center bg-white px-5 sm:px-8 pt-3 pb-2 lg:py-10">
        {/* Mobile-only image — capped height accounting for site banner */}
        <div className="lg:hidden w-full max-w-sm mb-4 rounded-xl overflow-hidden shadow bg-sky-100" style={{ maxHeight: "20vh" }}>
          <Image
            src="/ronel-web-new.png"
            alt="סמ״ר רונאל בן משה ז״ל"
            width={800}
            height={450}
            className="w-full h-full object-contain object-top"
            priority
          />
        </div>

        {/* Desktop only: memorial links (above) + video link (below), stacked vertically */}
        <div className="hidden lg:flex flex-col w-full mb-4 gap-1.5">
          {/* Row 1: memorial links */}
          <div className="flex justify-end gap-4 flex-wrap">
            <a
              href="https://chaim-beronel.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium transition-colors"
              title="אתר זיכרון לרונאל"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              אתר זיכרון
            </a>
            <a
              href="https://www.instagram.com/remember_ronel?igsh=ZW80bjE3bnpvaXJ1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium transition-colors"
              title="אינסטגרם"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              אינסטגרם
            </a>
            <a
              href="https://www.tiktok.com/@remember_ronel?_r=1&_t=ZS-95ztIJ4zEzV"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-medium transition-colors"
              title="טיקטוק"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/>
              </svg>
              טיקטוק
            </a>
          </div>
          {/* Row 2: video link */}
          <div className="flex justify-end">
            <a
              href="/VID-20260429-WA0055.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sky-500 hover:text-sky-600 text-xs font-medium transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] flex-shrink-0">▶</span>
              סרטון הסבר על האתר
            </a>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base font-bold">RL</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">ברוכים הבאים</h1>
            </div>
            <h2 className="text-sm font-semibold text-sky-600 mb-2">
              הניצחון של רונאל הוא השמחה של כולנו
            </h2>
            <p className="text-gray-400 mt-1">
              {step === "email"
                ? "הכנס אימייל לקבלת קוד אימות"
                : `קוד אימות נשלח אל ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-600 mb-1.5"
                >
                  אימייל
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  dir="ltr"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
              >
                {loading ? "שולח..." : "שלח קוד אימות"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-600 mb-1.5"
                >
                  קוד אימות (8 ספרות)
                </label>
                <input
                  id="token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  dir="ltr"
                  placeholder="00000000"
                  maxLength={8}
                  value={token}
                  onChange={(e) =>
                    setToken(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
              >
                {loading ? "מאמת..." : "אימות והתחברות"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setToken("");
                  setError(null);
                }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                שינוי כתובת אימייל
              </button>
            </form>
          )}

          {/* SMS migration block */}
          <div className="mt-6">
            <button
              type="button"
              onClick={openSmsModal}
              className="w-full py-3 bg-gradient-to-l from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 active:from-rose-700 active:to-pink-700 transition-all shadow-sm text-xs leading-snug"
            >
              התחברות עבור מועמדים שנרשמו לאתר בגרסה הישנה (ללא מייל)
            </button>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Link
              href="/new-candidate"
              className="block text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors"
            >
              מועמד חדש? הצטרף עכשיו!
            </Link>
            <button
              type="button"
              onClick={openManagerModal}
              className="text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors"
            >
              הצטרפו כשגרירים: רשמו חברים ובני משפחה למערכת
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
            <Link href="/about" className="hover:text-gray-600 transition-colors">
              איך האתר עובד?
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              תנאי שימוש ופרטיות
            </Link>
          </div>

          <p className="text-center text-xs text-gray-300 mt-4">
            Ronel Lovely &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      </div>{/* end flex-1 two-column */}

      {/* ── SMS Login Modal ── */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              type="button"
              onClick={closeSmsModal}
              className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg"
            >
              &times;
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-1">
              התחברות באמצעות SMS
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {smsStep === "phone"
                ? "הכנס את מספר הטלפון איתו נרשמת באתר הישן"
                : "קוד אימות נשלח אליך ב-SMS"}
            </p>

            {smsStep === "phone" ? (
              <form onSubmit={handleSendSmsOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="smsPhone"
                    className="block text-sm font-medium text-gray-600 mb-1.5"
                  >
                    מספר טלפון
                  </label>
                  <input
                    id="smsPhone"
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="050-0000000"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  />
                </div>

                {smsError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                    {smsError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={smsLoading}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
                >
                  {smsLoading ? "שולח..." : "שלח קוד SMS"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifySmsOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="smsToken"
                    className="block text-sm font-medium text-gray-600 mb-1.5"
                  >
                    קוד אימות (6 ספרות)
                  </label>
                  <input
                    id="smsToken"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    dir="ltr"
                    placeholder="000000"
                    maxLength={6}
                    value={smsToken}
                    onChange={(e) =>
                      setSmsToken(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                {smsError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                    {smsError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={smsLoading}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
                >
                  {smsLoading ? "מאמת..." : "אימות והתחברות"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmsStep("phone");
                    setSmsToken("");
                    setSmsError(null);
                  }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  שינוי מספר טלפון
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Manager Registration Modal ── */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              type="button"
              onClick={closeManagerModal}
              className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-lg"
            >
              &times;
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-1">
              הרשמה כשליח/שדכן
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {mgrStep === "email"
                ? "הרשמה עבור שליחים ושדכנים שרוצים לנהל פרופילי מועמדים. הכנס את כתובת האימייל שלך."
                : `קוד אימות נשלח אל ${mgrEmail}`}
            </p>

            {mgrStep === "email" ? (
              <form onSubmit={handleSendManagerOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="mgrEmail"
                    className="block text-sm font-medium text-gray-600 mb-1.5"
                  >
                    אימייל
                  </label>
                  <input
                    id="mgrEmail"
                    type="email"
                    required
                    dir="ltr"
                    placeholder="example@email.com"
                    value={mgrEmail}
                    onChange={(e) => setMgrEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    קראתי ואני מסכים/ה ל
                    <a href="/terms" target="_blank" className="text-sky-500 hover:text-sky-600 underline font-medium">
                      תנאי השימוש ומדיניות הפרטיות
                    </a>
                  </span>
                </label>

                {mgrError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                    {mgrError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mgrLoading}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
                >
                  {mgrLoading ? "שולח..." : "שלח קוד אימות"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyManagerOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="mgrToken"
                    className="block text-sm font-medium text-gray-600 mb-1.5"
                  >
                    קוד אימות (8 ספרות)
                  </label>
                  <input
                    id="mgrToken"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    dir="ltr"
                    placeholder="00000000"
                    maxLength={8}
                    value={mgrToken}
                    onChange={(e) =>
                      setMgrToken(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                {mgrError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                    {mgrError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mgrLoading}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
                >
                  {mgrLoading ? "מאמת..." : "אימות והרשמה"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMgrStep("email");
                    setMgrToken("");
                    setMgrError(null);
                  }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  שינוי כתובת אימייל
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
