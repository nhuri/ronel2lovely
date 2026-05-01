import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ronel Lovely - בונים בתים לזכרו של רונאל בן משה | אתר שידוכים",
  description:
    "בונים בתים לזכרו של רונאל בן משה. הניצחון של רונאל הוא השמחה של כולנו. הצטרפו למיזם שידוכים שבוחר להמשיך בדרך של חיים, חיבור ואהבה. דווקא מתוך הכאב, אנחנו יוצרים תקווה ומחברים בין לבבות. כל שידוך הוא עוד ניצחון של החיים.",
  keywords: [
    "רונאל בן משה",
    "סמ״ר רונאל בן משה",
    "אתר שידוכים לדתיים",
    "זוגיות לדתיים",
    "הקמת בית בישראל",
    "מיזם שידוכים לזכר חייל",
  ],
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Video strip — below site banner, only on login page */}
      {/* dir=ltr on wrapper so flex order is predictable: spacer(left/form) then strip(right/image) */}
      <div className="flex" dir="ltr">
        <div className="hidden lg:block lg:w-2/5 bg-white border-t border-gray-100" />
        <div className="w-full lg:flex-1 bg-sky-700 border-t border-sky-600 px-4 py-1.5 flex items-center" dir="rtl">
          <a
            href="/VID-20260429-WA0055.mp4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white text-xs font-medium"
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] flex-shrink-0">▶</span>
            סרטון הסבר על האתר
          </a>
        </div>
      </div>
      {children}
    </>
  );
}
