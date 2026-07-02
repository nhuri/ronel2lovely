import Link from "next/link";
import type { Metadata } from "next";
import { DonationButton } from "./donation-button";

export const metadata: Metadata = {
  title: "תרומה | Ronel Lovely",
  description: "תרומה למיזם השידוכים לזכרו של רונאל בן משה",
};

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">בונים בתים לזכרו של רונאל</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          כל תרומה עוזרת למיזם השידוכים בחסות עמותת חיים ברונאל להמשיך ולחבר בין מועמדים ומועמדות לחיי זוגיות.
          לחיצה על הכפתור תעביר אותך לדף תרומה מאובטח.
        </p>
        <DonationButton variant="page" />
        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            חזרה לעמוד הראשי
          </Link>
        </div>
      </div>
    </div>
  );
}
