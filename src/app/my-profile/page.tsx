import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { restoreMyProfile } from "./actions";
import { ProfileClient } from "./profile-client";
import { resolveCandidate } from "@/lib/candidate-resolver";
import { CandidateSelectionPage } from "./candidate-selector";
import { signCandidateImages } from "@/lib/storage";

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string; candidate_id?: string }>;
}) {
  const params = await searchParams;
  const requestedId = params.candidate_id ? parseInt(params.candidate_id, 10) : undefined;

  const { candidate, allCandidates, needsSelection, supabase, user } =
    await resolveCandidate(requestedId);

  if (!user || user.user_metadata?.role !== "candidate") {
    redirect("/login");
  }

  // Multiple candidates, no selection → show selector page
  if (needsSelection) {
    return (
      <CandidateSelectionPage
        candidates={allCandidates.map((c) => ({
          id: c.id as number,
          full_name: c.full_name as string,
          image_urls: c.image_urls as string[] | null,
        }))}
        basePath="/my-profile"
      />
    );
  }

  if (!candidate) {
    // Manager with no candidates yet — force them to add one
    redirect("/new-candidate");
  }

  // Sync age column from birth_date on every page load
  if (candidate.birth_date) {
    const birth = new Date(candidate.birth_date as string);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (candidate.age !== age) {
      await supabase
        .from("candidates")
        .update({ age })
        .eq("id", candidate.id);
      candidate.age = age;
    }
  }

  // Frozen candidate — show restore option
  if (candidate.availability_status === "הקפאה") {
    const cId = candidate.id as number;
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span className="text-amber-600 text-lg">*</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">הפרופיל מוקפא</h1>
          <p className="text-sm text-gray-500 mb-6">
            הפרופיל מוקפא כרגע ואינו פעיל. לחץ על הכפתור למטה כדי לשחרר את ההקפאה.
          </p>
          <form action={async () => { "use server"; await restoreMyProfile(cId); }} className="mb-3">
            <button
              type="submit"
              className="w-full px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
            >
              שחרר הקפאה
            </button>
          </form>
          <form action={logout}>
            <button
              type="submit"
              className="w-full px-6 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              התנתקות
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Check if profile is incomplete (missing required fields)
  const requiredKeys = [
    "full_name", "gender", "birth_date", "residence", "marital_status",
    "religious_level", "height", "education", "occupation",
    "about_me", "looking_for", "contact_person", "contact_person_phone",
  ];
  const isIncomplete = requiredKeys.some(
    (key) => !candidate[key] || String(candidate[key]).trim() === ""
  );

  // Phone-auth users without email must add one before using the profile
  // SMS login creates a temp email like phone_972...@sms.ronellovely.co.il
  const hasRealEmail = user.email && !user.email.endsWith("@sms.ronellovely.co.il");
  const needsEmail = !hasRealEmail
    && candidate != null
    && (!candidate.email || (candidate.email as string).trim() === "");

  const wasRestored = params.restored === "1";

  const signedCandidate = await signCandidateImages(candidate);

  return (
    <ProfileClient
      candidate={signedCandidate}
      candidateId={candidate.id as number}
      allCandidates={allCandidates.map((c) => ({
        id: c.id as number,
        full_name: c.full_name as string,
        image_urls: c.image_urls as string[] | null,
      }))}
      startInEditMode={isIncomplete || wasRestored}
      needsEmail={needsEmail}
    />
  );
}
