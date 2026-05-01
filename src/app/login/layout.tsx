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
{children}
    </>
  );
}
