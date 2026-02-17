import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewCandidateForm } from "./new-candidate-form";

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Check if user is logged in (optional - for "register for someone else" flow)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user && user.user_metadata?.role === "candidate";

  return (
    <NewCandidateForm
      isLoggedIn={isLoggedIn}
      inviteToken={params.invite}
    />
  );
}
