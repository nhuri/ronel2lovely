import type { Metadata } from "next";
import "./globals.css";
import { SiteBanner } from "./site-banner";
import { VisitTracker } from "./visit-tracker";

export const metadata: Metadata = {
  title: {
    default: "Ronel Lovely - בונים בתים לזכרו של רונאל בן משה | אתר שידוכים",
    template: "%s | Ronel Lovely",
  },
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
  openGraph: {
    title: "Ronel Lovely - בונים בתים לזכרו של רונאל בן משה",
    description:
      "הניצחון של רונאל הוא השמחה של כולנו. מיזם שידוכים לזכר סמ״ר רונאל בן משה ז״ל.",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="overflow-x-hidden w-full">
      <body className="bg-gray-50 text-gray-900 min-h-screen overflow-x-hidden overscroll-x-none w-full">
        <VisitTracker />
        <SiteBanner />
        {children}
      </body>
    </html>
  );
}
