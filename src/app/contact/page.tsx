import Link from "next/link";
import type { Metadata } from "next";
import { CopyEmailButton } from "./CopyEmailButton";

export const metadata: Metadata = {
  title: "צור קשר | Ronel Lovely",
  description: "יצירת קשר עם מיזם שידוכים לזכרו של רונאל בן משה",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-2">צור קשר</h1>
        <p className="text-sm text-gray-500 mb-6">
          לכל שאלה, פנייה או עזרה בנושא האתר — אנחנו כאן.
        </p>
        <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-xl border border-sky-100">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">מייל</p>
            <a href="mailto:ronel2lovely@gmail.com" className="text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors" dir="ltr">
              ronel2lovely@gmail.com
            </a>
          </div>
          <CopyEmailButton email="ronel2lovely@gmail.com" />
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            חזרה לעמוד הראשי
          </Link>
        </div>
      </div>
    </div>
  );
}
