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
      {/* Mobile strip: video link (right) + memorial icon links (left) */}
      <div className="bg-sky-700 border-t border-sky-600 px-4 py-1.5 flex items-center gap-4" dir="rtl">
        <a
          href="/VID-20260429-WA0055.mp4"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white text-xs font-medium"
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] flex-shrink-0">▶</span>
          סרטון הסבר על האתר
        </a>
        <a href="https://chaim-beronel.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-xs transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          אתר זיכרון
        </a>
        <a href="https://www.instagram.com/remember_ronel?igsh=ZW80bjE3bnpvaXJ1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-xs transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          אינסטגרם
        </a>
        <a href="https://www.tiktok.com/@remember_ronel?_r=1&_t=ZS-95ztIJ4zEzV" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/80 hover:text-white text-xs transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/>
          </svg>
          טיקטוק
        </a>
      </div>
      {children}
    </>
  );
}
