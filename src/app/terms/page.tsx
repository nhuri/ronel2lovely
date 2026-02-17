import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <h1 className="text-base font-bold text-gray-800">
              תנאי שימוש ומדיניות פרטיות
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
        {/* Terms of Use */}
        <Section title="תנאי שימוש">
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <Clause number={1} title="כללי">
              <p>
                אתר Ronel Lovely (להלן: &quot;האתר&quot;) הוא מערכת שידוכים מקוונת
                המיועדת לחיבור בין מועמדים ומועמדות לחיי זוגיות. השימוש באתר
                מהווה הסכמה לתנאי השימוש המפורטים להלן.
              </p>
            </Clause>

            <Clause number={2} title="הרשמה ופרטים אישיים">
              <p>
                המשתמש מתחייב למסור פרטים אישיים נכונים, מדויקים ועדכניים בעת
                ההרשמה לאתר. מסירת פרטים כוזבים מהווה הפרה של תנאי השימוש ועלולה
                להוביל להסרת הפרופיל מהמערכת.
              </p>
            </Clause>

            <Clause number={3} title="שימוש ראוי">
              <ul className="list-disc list-inside space-y-1 mr-2">
                <li>האתר מיועד למטרות שידוכים בלבד</li>
                <li>אין להשתמש באתר למטרות מסחריות, שיווקיות או פרסומיות</li>
                <li>אין להעלות תוכן פוגעני, בלתי הולם או מטעה</li>
                <li>אין להטריד משתמשים אחרים או לפגוע בפרטיותם</li>
                <li>אין להשתמש באתר באופן שעלול לפגוע בתפקודו התקין</li>
              </ul>
            </Clause>

            <Clause number={4} title="תמונות ותוכן">
              <p>
                המשתמש מתחייב כי התמונות והתוכן שהוא מעלה לאתר הם שלו או
                שהוא בעל הרשאה מתאימה להשתמש בהם. מנהלי האתר רשאים להסיר תוכן
                שאינו עומד בתנאי השימוש.
              </p>
            </Clause>

            <Clause number={5} title="ניהול פרופילים עבור אחרים">
              <p>
                שגרירים ושדכנים הנרשמים לניהול פרופילים עבור אחרים מתחייבים כי
                קיבלו הסכמה מפורשת מהמועמדים לרישומם במערכת ולשיתוף פרטיהם
                האישיים ותמונותיהם.
              </p>
            </Clause>

            <Clause number={6} title="הצעות שידוך">
              <p>
                האתר מציע התאמות והצעות שידוך על בסיס אלגוריתמים ונתונים שהוזנו.
                האתר אינו מתחייב להתאמה מושלמת ואינו אחראי לתוצאות המפגשים
                בין המועמדים.
              </p>
            </Clause>

            <Clause number={7} title="הקפאה והסרת פרופיל">
              <p>
                המשתמש רשאי להקפיא או לבקש הסרת הפרופיל שלו בכל עת. מנהלי האתר
                רשאים להסיר פרופילים שמפרים את תנאי השימוש ללא הודעה מוקדמת.
              </p>
            </Clause>

            <Clause number={8} title="הגבלת אחריות">
              <p>
                האתר מסופק &quot;כמות שהוא&quot; (AS IS). מנהלי האתר אינם אחראים לכל
                נזק ישיר או עקיף הנובע מהשימוש באתר, כולל אך לא מוגבל לנזקים
                הנובעים מפגישות בין מועמדים.
              </p>
            </Clause>

            <Clause number={9} title="שינויים בתנאים">
              <p>
                מנהלי האתר רשאים לעדכן את תנאי השימוש מעת לעת. המשך השימוש
                באתר לאחר עדכון התנאים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </Clause>
          </div>
        </Section>

        {/* Privacy Policy */}
        <Section title="מדיניות פרטיות">
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <Clause number={1} title="מידע שאנו אוספים">
              <ul className="list-disc list-inside space-y-1 mr-2">
                <li>פרטים אישיים: שם, תאריך לידה, מין, מצב משפחתי, כתובת מגורים</li>
                <li>פרטי התקשרות: כתובת אימייל, מספר טלפון</li>
                <li>מידע נוסף: גובה, השכלה, תעסוקה, רמה דתית, תיאור אישי</li>
                <li>תמונות פרופיל</li>
                <li>מספר תעודת זהות</li>
                <li>פרטי איש קשר</li>
              </ul>
            </Clause>

            <Clause number={2} title="שימוש במידע">
              <p>המידע שנאסף משמש למטרות הבאות:</p>
              <ul className="list-disc list-inside space-y-1 mr-2 mt-2">
                <li>יצירת פרופיל במערכת השידוכים והצגתו למועמדים פוטנציאליים</li>
                <li>התאמה אלגוריתמית בין מועמדים</li>
                <li>שליחת הודעות אימות והתראות</li>
                <li>ניהול ותפעול המערכת</li>
                <li>שיפור השירות והחוויה באתר</li>
              </ul>
            </Clause>

            <Clause number={3} title="שיתוף מידע">
              <p>
                הפרטים האישיים שלך עשויים להיות מוצגים למועמדים אחרים במערכת
                לצורך הצעות שידוך. איננו מוכרים, משכירים או מעבירים מידע אישי
                לצדדים שלישיים שאינם קשורים לפעילות האתר.
              </p>
            </Clause>

            <Clause number={4} title="אבטחת מידע">
              <p>
                אנו נוקטים באמצעים סבירים לאבטחת המידע האישי שלך, כולל הצפנת
                תקשורת, אחסון מאובטח ובקרת גישה. עם זאת, אין באפשרותנו
                להבטיח אבטחה מוחלטת של המידע.
              </p>
            </Clause>

            <Clause number={5} title="שמירת מידע">
              <p>
                המידע האישי שלך נשמר במערכת כל עוד חשבונך פעיל. בעת הקפאה
                או מחיקת פרופיל, המידע עשוי להישמר לתקופה סבירה לצרכים
                טכניים ומשפטיים.
              </p>
            </Clause>

            <Clause number={6} title="זכויות המשתמש">
              <p>עומדות לרשותך הזכויות הבאות:</p>
              <ul className="list-disc list-inside space-y-1 mr-2 mt-2">
                <li>עיון במידע האישי שלך ועדכונו בכל עת</li>
                <li>הקפאת הפרופיל באופן זמני</li>
                <li>בקשת מחיקת המידע מהמערכת</li>
                <li>פנייה למנהלי האתר בכל שאלה הנוגעת לפרטיות</li>
              </ul>
            </Clause>

            <Clause number={7} title="שימוש בשירותי צד שלישי">
              <p>
                האתר משתמש בשירותי צד שלישי לצורך תפעול, כגון שירותי אחסון,
                שליחת הודעות SMS ואימייל. שירותים אלו כפופים למדיניות הפרטיות
                שלהם.
              </p>
            </Clause>

            <Clause number={8} title="יצירת קשר">
              <p>
                לכל שאלה, בקשה או תלונה בנושא פרטיות, ניתן לפנות אלינו
                באמצעות מערכת הפניות באזור האישי באתר.
              </p>
            </Clause>
          </div>
        </Section>

        <p className="text-center text-xs text-gray-400">
          עודכן לאחרונה: פברואר 2026
        </p>

        <div className="text-center pb-4">
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

function Clause({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-bold text-gray-700 text-sm mb-1">
        {number}. {title}
      </h3>
      {children}
    </div>
  );
}
