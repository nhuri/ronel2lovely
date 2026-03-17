import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const proposalIdNum = parseInt(proposalId, 10);

  if (isNaN(proposalIdNum)) {
    return <ErrorShell message="מזהה הצעה לא תקין." />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/my-profile/match/${proposalId}`);
  }

  // Find all candidates managed by this user
  const { data: myCandidates } = await supabase
    .from("candidates")
    .select("id")
    .eq("manager_id", user.id);

  if (!myCandidates || myCandidates.length === 0) {
    return <ErrorShell message="לא נמצא פרופיל מועמד עבור משתמש זה." />;
  }

  const myCandidateIds = myCandidates.map((c) => c.id as number);

  // Fetch the proposal
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2, status")
    .eq("id", proposalIdNum)
    .single();

  if (!proposal) {
    return <ErrorShell message="ההצעה לא נמצאה." />;
  }

  const cid1 = proposal.candidate_id_1 as number;
  const cid2 = proposal.candidate_id_2 as number;

  // Verify user is part of this proposal
  const myIdInProposal = myCandidateIds.find((id) => id === cid1 || id === cid2);
  if (!myIdInProposal) {
    return <ErrorShell message="אין לך הרשאה לצפות בדף זה." />;
  }

  // The other candidate is whichever one is NOT the user's
  const otherCandidateId = myIdInProposal === cid1 ? cid2 : cid1;

  const admin = createSupabaseAdminClient();
  const { data: other } = await admin
    .from("candidates")
    .select(
      "id, full_name, gender, age, residence, religious_level, marital_status, occupation, education, height, about_me, image_urls, phone_number, email, contact_person, contact_person_phone"
    )
    .eq("id", otherCandidateId)
    .single();

  if (!other) {
    return <ErrorShell message="לא ניתן לטעון פרטי המועמד." />;
  }

  const isSmsEmail = (e: string | null) =>
    !e || e.endsWith("@sms.ronellovely.co.il");

  const name = other.full_name as string;
  const gender = other.gender as string;
  const title = gender === "נקבה" ? "המועמדת" : "המועמד";
  const photo = (other.image_urls as string[] | null)?.[0] ?? null;
  const phone =
    (other.contact_person_phone as string) ||
    (other.phone_number as string) ||
    null;
  const displayEmail = isSmsEmail(other.email as string | null)
    ? null
    : (other.email as string);
  const contactPerson = (other.contact_person as string) || null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-sky-600 to-sky-700 text-white py-3 px-4">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">RL</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Ronel Lovely</p>
            <p className="text-[11px] text-sky-200 leading-tight">
              בונים בתים לזכרו של רונאל
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-sm mx-auto space-y-4">
          {/* Name */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <h1 className="text-xl font-bold text-gray-800">{name}</h1>
          </div>

          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {photo && (
              <div className="flex justify-center pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={name}
                  className="w-36 h-48 object-cover rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
            )}

            <div className="p-4 space-y-1.5 text-sm text-gray-600">
              {other.age && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    גיל:
                  </span>
                  <span>{other.age as number}</span>
                </div>
              )}
              {other.residence && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    עיר:
                  </span>
                  <span>{other.residence as string}</span>
                </div>
              )}
              {other.religious_level && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    רמה דתית:
                  </span>
                  <span>{other.religious_level as string}</span>
                </div>
              )}
              {other.marital_status && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    מצב משפחתי:
                  </span>
                  <span>{other.marital_status as string}</span>
                </div>
              )}
              {other.occupation && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    תעסוקה:
                  </span>
                  <span>{other.occupation as string}</span>
                </div>
              )}
              {other.education && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    השכלה:
                  </span>
                  <span>{other.education as string}</span>
                </div>
              )}
              {other.height && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-28 flex-shrink-0">
                    גובה:
                  </span>
                  <span>{other.height as number} ס״מ</span>
                </div>
              )}
            </div>

            {other.about_me && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  קצת עליי:
                </p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {other.about_me as string}
                </p>
              </div>
            )}
          </div>

          {/* Contact details */}
          {(phone || displayEmail) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-emerald-800">פרטי קשר</p>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {contactPerson ? `${contactPerson}: ` : ""}
                  {phone}
                </a>
              )}
              {displayEmail && (
                <a
                  href={`mailto:${displayEmail}`}
                  className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {displayEmail}
                </a>
              )}
            </div>
          )}

          <Link
            href="/my-profile"
            className="block text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            חזרה לפרופיל שלי
          </Link>
        </div>
      </main>
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center space-y-3 max-w-sm w-full">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800">שגיאה</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <Link
          href="/my-profile"
          className="inline-block mt-2 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors"
        >
          חזרה לפרופיל
        </Link>
      </div>
    </div>
  );
}
