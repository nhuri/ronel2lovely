"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp, sendSmsOtp, verifySmsOtp } from "./actions";
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
    // Lock viewport only on desktop — on mobile/tablet the page must scroll freely
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100dvh";
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
      document.body.style.display = "flex";
      document.body.style.flexDirection = "column";
    }
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
    <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[3fr_2fr]" dir="rtl">

      {/* ── Image panel: top strip on mobile/tablet, right cell on lg+ ── */}
      <div className="w-full h-48 sm:h-64 md:h-72 flex-shrink-0 relative bg-sky-100 overflow-hidden">
        <Image
          src="/ronel-enter-page.jpg"
          alt="סמ״ר רונאל בן משה ז״ל"
          fill
          className="object-contain lg:object-cover"
          priority
        />
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-col items-center justify-start lg:justify-center bg-white px-5 sm:px-8 py-6 overflow-y-auto">
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
            <Link
              href="/new-candidate?mode=ambassador"
              className="text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors"
            >
              הצטרפו כשגרירים: רשמו חברים ובני משפחה למערכת
            </Link>
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
