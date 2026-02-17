import Link from "next/link";

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">ההרשמה הושלמה בהצלחה!</h1>
        <p className="text-sm text-gray-500 mb-6">
          הפרטים שלך נשמרו במערכת. המנהל שלך יוכל לצפות בפרופיל ולנהל את ההצעות עבורך.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
        >
          לעמוד ההתחברות
        </Link>
      </div>
    </div>
  );
}
