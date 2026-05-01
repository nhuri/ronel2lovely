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

  // Prevent page-level scroll on the landing page (both html and body)
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
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
    <div className="flex flex-col lg:min-h-screen" dir="rtl">

      {/* ── Two-column content ── */}
      <div className="flex lg:flex-1">

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
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-start lg:justify-center bg-white px-5 sm:px-8 py-4 lg:py-10">
        {/* Mobile-only image — capped height accounting for site banner */}
        <div className="lg:hidden w-full max-w-sm mb-2 rounded-xl overflow-hidden shadow bg-sky-100" style={{ maxHeight: "20vh" }}>
          <Image
            src="/ronel-web-new.png"
            alt="סמ״ר רונאל בן משה ז״ל"
            width={800}
            height={450}
            className="w-full h-full object-contain object-top"
            priority
          />
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
