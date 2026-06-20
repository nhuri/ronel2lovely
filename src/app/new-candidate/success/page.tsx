import Link from "next/link";

export default async function RegistrationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ambassador?: string }>;
}) {
  const params = await searchParams;
  const isAmbassador = params.ambassador === "1";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-3">ההרשמה הושלמה בהצלחה!</h1>

        {isAmbassador ? (
          <p className="text-sm text-gray-500 mb-4">
            פרטי המועמד/ת נשמרו במערכת. כדי לנהל את הפרופיל ולראות הצעות שידוך, התחבר/י עם האימייל שהזנת בפרטי השגריר.
          </p>
        ) : (
          <div className="text-sm text-gray-600 mb-5 space-y-3 text-right">
            <p>
              שלחנו לך מייל לכתובת שרשמת — בדוק/י שהמייל הגיע לתיבת הדואר שלך.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs leading-relaxed">
              <p className="font-semibold mb-1">חשוב לוודא!</p>
              <p>
                וודא/י שהקלדת כתובת מייל נכונה ובדוק/י שהמייל לא הגיע לתיקיית הספאם.
                יצירת הצעות בין מועמדים נעשית דרך המייל — ללא מייל תקין לא תוכל/י לקבל הצעות.
              </p>
            </div>
          </div>
        )}

        <Link
          href="/login"
          className="inline-block px-6 py-2.5 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
        >
          {isAmbassador ? "התחבר/י לניהול המועמד/ת" : "לעמוד ההתחברות"}
        </Link>
      </div>
    </div>
  );
}
