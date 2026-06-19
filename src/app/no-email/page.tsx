import { createSupabaseAdminClient } from "@/lib/supabase/server";
import NoEmailClient from "./no-email-client";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function NoEmailPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const candidateId = id ? parseInt(id, 10) : NaN;

  if (!id || isNaN(candidateId)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
        dir="rtl"
      >
        <p className="text-gray-500 text-center">קישור לא תקין</p>
      </div>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: candidate } = await admin
    .from("candidates")
    .select("id, full_name, gender, availability_status")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
        dir="rtl"
      >
        <p className="text-gray-500 text-center">הפרופיל לא נמצא</p>
      </div>
    );
  }

  if (candidate.availability_status === "הקפאה") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
        dir="rtl"
      >
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-gray-700 font-medium mb-2">הפרופיל כבר הוסר מהאתר</p>
          <p className="text-gray-400 text-sm">לפרטים נוספים ניתן לפנות לצוות האתר</p>
        </div>
      </div>
    );
  }

  return (
    <NoEmailClient
      candidateId={candidateId}
      gender={candidate.gender as string}
    />
  );
}
