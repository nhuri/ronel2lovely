import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { restoreMyProfile, requestAdminUnfreeze } from "./actions";
import { ProfileClient } from "./profile-client";
import { resolveCandidate } from "@/lib/candidate-resolver";
import { CandidateSelectionPage } from "./candidate-selector";
import { signCandidateImages } from "@/lib/storage";

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string; unfreeze_requested?: string; candidate_id?: string; tab?: string }>;
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
    // No linked candidates — add one
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
    const frozenByAdmin = candidate.removed_by === "admin";
    const unfreezeRequested = params.unfreeze_requested === "1";

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span className="text-amber-600 text-lg">*</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">הפרופיל מוקפא</h1>

          {frozenByAdmin ? (
            unfreezeRequested ? (
              <p className="text-sm text-gray-500 mb-6">
                הבקשה נשלחה לצוות האתר. נחזור אליך בהקדם לגבי שחרור ההקפאה.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  הפרופיל שלך הוקפא ע&quot;י המנהל. יש ליצור קשר עם צוות האתר על מנת לשחרר את ההקפאה,
                  במייל{" "}
                  <a href="mailto:ronel2lovely@gmail.com" className="text-sky-600">
                    ronel2lovely@gmail.com
                  </a>
                  .
                </p>
                <form action={async () => { "use server"; await requestAdminUnfreeze(cId); }} className="mb-3">
                  <button
                    type="submit"
                    className="w-full px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors"
                  >
                    שלח בקשת שחרור לצוות
                  </button>
                </form>
              </>
            )
          ) : (
            <>
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
            </>
          )}

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
    "about_me", "looking_for",
  ];
  const isIncomplete = requiredKeys.some(
    (key) => !candidate[key] || String(candidate[key]).trim() === ""
  );

  // Show email modal whenever the candidate row has no real email in our DB.
  // We intentionally do NOT rely on the auth user's email because the two can
  // drift out of sync (e.g. auth updated but candidates table not, or vice-versa).
  const candidateEmail = (candidate.email as string | null) ?? "";
  const needsEmail =
    candidate != null &&
    (candidateEmail.trim() === "" ||
      candidateEmail.endsWith("@sms.ronellovely.co.il"));

  const wasRestored = params.restored === "1";

  const signedCandidate = await signCandidateImages(candidate);

  // Detect ambassador: any managed candidate was registered by this user as ambassador
  const isAmbassador = allCandidates.some(
    (c) =>
      c.ambassador_id === user.id ||
      (c.contact_person_email as string | null)?.toLowerCase() === user.email?.toLowerCase()
  );

  // Redirect complete profiles to recommendations on first landing
  // Skip redirect if the user explicitly navigated to their profile via tab=profile
  const wantsProfile = params.tab === "profile";
  if (!isIncomplete && !wasRestored && !needsEmail && !wantsProfile) {
    const cidParam = allCandidates.length > 1 && candidate.id ? `?candidate_id=${candidate.id}` : "";
    redirect(`/my-profile/recommendations${cidParam}`);
  }

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
      ambassadorUserId={isAmbassador ? user.id : undefined}
    />
  );
}
