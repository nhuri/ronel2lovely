import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InquiriesAdminClient } from "./inquiries-client";

export default async function AdminInquiriesPage() {
  const supabase = await createSupabaseServerClient();

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role === "candidate") {
    redirect("/login");
  }

  // Fetch all inquiries with candidate info
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(
      "*, candidate:candidates!candidate_id(id, full_name, image_urls)"
    )
    .order("created_at", { ascending: false });

  return <InquiriesAdminClient inquiries={inquiries ?? []} />;
}
