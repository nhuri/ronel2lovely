import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ConfirmButton } from "./confirm-button";
import Link from "next/link";

export default async function ConfirmInterestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPage message="קישור לא תקין או חסר." />;
  }

  const admin = createSupabaseAdminClient();

  const { data: tokenData } = await admin
    .from("interest_tokens")
    .select("token, from_candidate_id, to_candidate_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (!tokenData) {
    return <ErrorPage message="קישור לא תקין." />;
  }

  if (tokenData.used_at) {
    return (
      <PageShell>
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">ההתאמה כבר אושרה</h2>
          <p className="text-sm text-gray-500">קישור זה כבר שומש. בדוק/י את המייל שנשלח עם פרטי ההתקשרות.</p>
        </div>
      </PageShell>
    );
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return <ErrorPage message="קישור זה פג תוקף. צור/י קשר עם צוות האתר." />;
  }

  // Fetch from_candidate details to display
  const { data: fromCand } = await admin
    .from("candidates")
    .select("id, full_name, gender, age, residence, religious_level, marital_status, image_urls")
    .eq("id", tokenData.from_candidate_id)
    .single();

  if (!fromCand) {
    return <ErrorPage message="שגיאה בטעינת פרטי המועמד." />;
  }

  const fromName = fromCand.full_name as string;
  const fromGender = fromCand.gender as string;
  const fromTitle = fromGender === "זכר" ? "המועמד" : "המועמדת";
  const fromPhoto = (fromCand.image_urls as string[] | null)?.[0] ?? null;

  return (
    <PageShell>
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">{fromTitle}</p>
          <h2 className="text-xl font-bold text-gray-800">{fromName}</h2>
          <p className="text-xs text-gray-400 mt-1">שלח/ה לך בקשת היכרות דרך Ronel Lovely</p>
        </div>

        {/* Profile card */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          {fromPhoto && (
            <div className="flex justify-center pt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fromPhoto}
                alt={fromName}
                className="w-32 h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
              />
            </div>
          )}
          <div className="p-4 space-y-1.5 text-sm text-gray-600">
            {fromCand.age && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 w-24">גיל:</span>
                <span>{fromCand.age as number}</span>
              </div>
            )}
            {fromCand.residence && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 w-24">עיר:</span>
                <span>{fromCand.residence as string}</span>
              </div>
            )}
            {fromCand.religious_level && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 w-24">רמה דתית:</span>
                <span>{fromCand.religious_level as string}</span>
              </div>
            )}
            {fromCand.marital_status && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 w-24">מצב משפחתי:</span>
                <span>{fromCand.marital_status as string}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirm button */}
        <ConfirmButton token={token} fromName={fromName} fromGender={fromGender} />

        <p className="text-center text-xs text-gray-400">
          לחיצה תשלח לשניכם מייל עם פרטי ההתקשרות
          <br />
          ותעדכן את הסטטוס ל&quot;דייטים&quot; אוטומטית
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      <header className="bg-gradient-to-l from-sky-600 to-sky-700 text-white py-3 px-4">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">RL</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Ronel Lovely</p>
            <p className="text-[11px] text-sky-200 leading-tight">בונים בתים לזכרו של רונאל</p>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 w-full max-w-sm">
          {children}
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-gray-400">
        <Link href="/login" className="hover:text-gray-600 transition-colors">
          חזרה לאתר
        </Link>
      </footer>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="text-center space-y-3">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800">קישור לא תקין</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <Link
          href="/login"
          className="inline-block mt-2 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors"
        >
          חזרה לאתר
        </Link>
      </div>
    </PageShell>
  );
}
