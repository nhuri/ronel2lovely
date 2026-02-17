import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <h1 className="text-base font-bold text-gray-800">
              איך האתר עובד?
            </h1>
          </div>
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            חזרה להתחברות
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Introduction */}
        <Section title="ברוכים הבאים ל-Ronel Lovely">
          <p className="text-sm text-gray-600 leading-relaxed">
            Ronel Lovely היא מערכת שידוכים דיגיטלית שמטרתה לחבר בין מועמדים
            ומועמדות לחיי זוגיות. המערכת מאפשרת ניהול פרופילים, הצעות שידוך
            והתאמות חכמות.
          </p>
        </Section>

        {/* Roles */}
        <Section title="סוגי משתמשים">
          <div className="space-y-4">
            <RoleCard
              title="מועמד/ת"
              description="אדם שמחפש שידוך ונרשם למערכת עם הפרטים האישיים שלו."
              features={[
                "יצירת פרופיל אישי עם תמונות, תיאור ופרטים אישיים",
                "צפייה בהצעות שידוך שהתקבלו",
                "עדכון סטטוס הצעות (אישור, דחייה, עדכון התקדמות)",
                "צפייה בהתאמות מומלצות מהמערכת",
                "שליחת פניות למנהל המערכת",
                "הקפאת פרופיל באופן זמני",
              ]}
            />
            <RoleCard
              title="שגריר / שדכן / מנהל"
              description="אדם שמנהל פרופילי מועמדים עבור אחרים (חברים, בני משפחה וכו')."
              features={[
                "רישום מועמדים חדשים למערכת",
                "ניהול מספר פרופילי מועמדים מחשבון אחד",
                "שליחת קישורי הזמנה למועמדים למילוי פרטים בעצמם",
                "מעבר בין פרופילים שונים בלחיצה",
                "יצירת הצעות שידוך עבור המועמדים",
                "מעקב אחרי סטטוס ההצעות",
              ]}
            />
          </div>
        </Section>

        {/* How Registration Works */}
        <Section title="תהליך ההרשמה">
          <div className="space-y-3">
            <Step
              number={1}
              title="הרשמה כמועמד"
              text='לחצו על "מועמד חדש? הצטרף עכשיו!" בדף ההתחברות ומלאו את כל הפרטים הנדרשים כולל תמונות.'
            />
            <Step
              number={2}
              title="הרשמה כשגריר/שדכן"
              text='לחצו על "הצטרפו כשגרירים" בדף ההתחברות, הזינו אימייל וקבלו קוד אימות. לאחר ההרשמה תועברו ליצירת פרופיל מועמד ראשון.'
            />
            <Step
              number={3}
              title="אימות והתחברות"
              text="ההתחברות מתבצעת באמצעות קוד אימות שנשלח לכתובת האימייל שלכם. אין צורך לזכור סיסמה."
            />
          </div>
        </Section>

        {/* Features */}
        <Section title="מה אפשר לעשות באתר?">
          <div className="space-y-3">
            <Feature
              title="פרופיל אישי"
              text="ניהול הפרטים האישיים, תמונות, תיאור עצמי ומה חשוב לי בבן/בת הזוג. ניתן לעדכן בכל עת."
            />
            <Feature
              title="הצעות שידוך"
              text="צפייה בהצעות שהתקבלו, עדכון סטטוס (נפגשו, מתקדם, חתכו וכו'), הוספת הערות ויצירת הצעות חדשות."
            />
            <Feature
              title="התאמות מומלצות"
              text="המערכת מציגה 3 התאמות מומלצות על בסיס גיל, רמה דתית, מצב משפחתי ומיקום גיאוגרפי."
            />
            <Feature
              title="פניות"
              text="שליחת פניות ושאלות למנהל המערכת בנושאים שונים וקבלת מענה."
            />
            <Feature
              title="קישורי הזמנה"
              text="שגרירים יכולים ליצור קישורי הזמנה ולשלוח אותם למועמדים למילוי פרטים בעצמם."
            />
            <Feature
              title="הקפאת פרופיל"
              text="ניתן להקפיא את הפרופיל באופן זמני. הפרופיל לא יהיה פעיל עד לשחרור ההקפאה."
            />
          </div>
        </Section>

        {/* Navigation Guide */}
        <Section title="ניווט באזור האישי">
          <div className="space-y-2">
            <NavItem label="הפרופיל שלי" text="צפייה ועריכה של הפרטים האישיים והתמונות" />
            <NavItem label="ההצעות שלי" text="רשימת כל הצעות השידוך, עדכון סטטוס והוספת הערות" />
            <NavItem label="פניות" text="שליחת פניות למנהל המערכת וצפייה בתשובות" />
            <NavItem label="הצעות מומלצות" text="3 התאמות מומלצות שהמערכת בחרה עבורך" />
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-4">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors shadow-sm text-sm"
          >
            חזרה לדף ההתחברות
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function RoleCard({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
      <h3 className="font-bold text-gray-800 text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-sky-500 mt-0.5 flex-shrink-0">&#x2713;</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{text}</p>
      </div>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-r-2 border-sky-200 pr-3">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{text}</p>
    </div>
  );
}

function NavItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-medium flex-shrink-0">
        {label}
      </span>
      <span className="text-gray-500">{text}</span>
    </div>
  );
}
