import Image from "next/image";
import Link from "next/link";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "Ronel Lovely",
  url: "https://ronel-lovely.com",
  description:
    "מיזם שידוכים חברתי, ללא כוונת רווח, לזכרו של סמ״ר רונאל בן משה ז״ל. חיבור בין רווקים ורווקות לחיי זוגיות מתוך אמונה שכל שידוך הוא עוד ניצחון של החיים.",
  sameAs: [
    "https://www.instagram.com/remember_ronel",
    "https://www.tiktok.com/@remember_ronel",
    "https://chaim-beronel.org/",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "ronel2lovely@gmail.com",
    contactType: "customer support",
  },
};

export default function HomePage() {
  return (
    <div dir="rtl">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
      />

      {/* Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <span className="text-base font-bold text-gray-800">Ronel Lovely</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-sky-600 transition-colors">
              איך זה עובד
            </a>
            <a href="#about" className="hover:text-sky-600 transition-colors">
              אודות המיזם
            </a>
            <Link href="/donate" className="hover:text-sky-600 transition-colors">
              תרומה
            </Link>
            <Link href="/contact" className="hover:text-sky-600 transition-colors">
              צור קשר
            </Link>
          </nav>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors flex-shrink-0"
          >
            הרשמה / התחברות
          </Link>
        </div>
      </header>

      <main className="bg-gray-100">
        {/* Hero */}
        <section className="bg-gradient-to-b from-sky-50 to-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="inline-block text-xs font-semibold text-sky-700 bg-sky-100 rounded-full px-3 py-1 mb-4">
                מיזם שידוכים ללא כוונת רווח
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                בונים בתים לזכרו של רונאל
              </h1>
              <p className="mt-4 text-base text-gray-600 leading-relaxed">
                Ronel Lovely הוא מיזם שידוכים חברתי, המוקדש לזכרו של סמ&quot;ר
                רונאל בן משה ז&quot;ל. אנחנו מחברים בין רווקים ורווקות לחיי
                זוגיות — מתוך אמונה שדווקא מהכאב אפשר לצמוח תקווה, וכל שידוך
                הוא עוד ניצחון של החיים.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="px-6 py-3 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-sm transition-colors"
                >
                  להרשמה / התחברות
                </Link>
                <a
                  href="#how-it-works"
                  className="px-6 py-3 text-sm font-semibold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl transition-colors"
                >
                  איך זה עובד?
                </a>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/ronel-enter-page.jpg"
                alt="רונאל בן משה ז״ל"
                width={768}
                height={512}
                sizes="(min-width: 768px) 480px, 100vw"
                priority
                className="w-full h-auto rounded-2xl shadow-md object-cover"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            איך המערכת עובדת?
          </h2>
          <p className="text-sm text-gray-600 text-center mb-8 max-w-xl mx-auto">
            שלושה שלבים פשוטים, בלי עלות ובלי מחויבות — עד להצעת השידוך הראשונה
            שלכם.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            <StepCard
              number={1}
              title="הרשמה"
              text="לוחצים על 'הרשמה / התחברות', מזינים כתובת אימייל ומקבלים קוד אימות. אין צורך בסיסמה."
            />
            <StepCard
              number={2}
              title="יצירת פרופיל"
              text="מוסיפים תמונות, תיאור אישי ומה חשוב לכם בבן/בת הזוג. אפשר לעדכן את הפרופיל בכל עת."
            />
            <StepCard
              number={3}
              title="קבלת הצעות"
              text="המערכת ומתנדבי המיזם מאתרים התאמות מומלצות ומציגים לכם הצעות שידוך לאורך הדרך."
            />
          </div>
        </section>

        {/* About & vision */}
        <section id="about" className="bg-white border-y border-gray-200 scroll-mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              אודות המיזם והחזון החברתי
            </h2>
            <p className="text-sm text-gray-600 text-center mb-8 max-w-xl mx-auto">
              הניצחון של רונאל הוא השמחה של כולנו
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-2">מאיפה זה התחיל</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  המיזם קם לזכרו של סמ&quot;ר רונאל בן משה ז&quot;ל, מתוך רצון
                  להמשיך את הדרך שהוא סימן — דרך של חיים, חיבור ואהבה. במקום
                  להישאר בכאב, בחרנו ליצור תקווה: מרחב שמחבר בין לבבות ומקים
                  בתים חדשים בישראל.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-2">מי מפעיל את המיזם</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ronel Lovely מופעל בהתנדבות, ללא כוונת רווח, בשיתוף עמותת{" "}
                  <a
                    href="https://chaim-beronel.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:text-sky-800 underline"
                  >
                    חיים ברונאל
                  </a>
                  . ההרשמה, יצירת הפרופיל וההצעות במערכת — חינם, לכולם.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
              <Link
                href="/about"
                className="px-5 py-2.5 font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
              >
                עוד פרטים על המערכת
              </Link>
              <Link
                href="/donate"
                className="px-5 py-2.5 font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
              >
                לתרומה למיזם
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            מוכנים להתחיל את הדרך שלכם?
          </h2>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            ההרשמה חינמית ולוקחת רק כמה דקות. אנחנו כאן כדי לעזור לכל הצעד.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3.5 text-base font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-sm transition-colors"
          >
            להרשמה / התחברות
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <span className="text-white font-bold text-base">Ronel Lovely</span>
            <p className="mt-2 text-gray-400 leading-relaxed">
              מיזם שידוכים חברתי ללא כוונת רווח, לזכרו של סמ&quot;ר רונאל בן
              משה ז&quot;ל.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">קישורים</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  איך המערכת עובדת
                </Link>
              </li>
              <li>
                <Link href="/donate" className="hover:text-white transition-colors">
                  תרומה למיזם
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  הרשמה / התחברות
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">מידע משפטי ויצירת קשר</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms#privacy" className="hover:text-white transition-colors">
                  מדיניות פרטיות
                </Link>
              </li>
              <li>
                <Link href="/terms#terms" className="hover:text-white transition-colors">
                  תנאי שימוש
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  צור קשר
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Ronel Lovely. כל הזכויות שמורות.
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: number;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="w-8 h-8 rounded-full bg-sky-700 text-white flex items-center justify-center text-sm font-bold mb-3">
        {number}
      </div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}
