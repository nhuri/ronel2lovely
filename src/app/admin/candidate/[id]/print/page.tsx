import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signCandidateImages } from "@/lib/storage";

export default async function CandidatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role === "candidate") {
    redirect("/login");
  }

  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) redirect("/admin");

  const { data: raw } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (!raw) redirect("/admin");

  const c = await signCandidateImages(raw);

  const { data: adminNotes } = await supabase
    .from("admin_notes")
    .select("id, note_text, created_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  const age = c.birth_date
    ? Math.floor((Date.now() - new Date(c.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : c.age ?? null;

  const imgs: string[] = c.image_urls ?? [];

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div style={{ marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", color: "#888", display: "block" }}>{label}</span>
        <span style={{ fontSize: "13px", color: "#111", fontWeight: 600 }}>{value}</span>
      </div>
    ) : null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "window.print()" }} />
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; background: #fff; color: #111; direction: rtl; }
      `}</style>

      {/* Back link — hidden when printing */}
      <div className="no-print" style={{ padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <a href={`/admin/candidate/${candidateId}`} style={{ fontSize: "13px", color: "#555", textDecoration: "none" }}>
          ← חזרה
        </a>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 20px" }} dir="rtl">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px", borderBottom: "2px solid #0ea5e9", paddingBottom: "16px" }}>
          {imgs[0] && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={imgs[0]} alt={c.full_name} style={{ width: "100px", height: "120px", objectFit: "contain", borderRadius: "8px", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0ea5e9", margin: "0 0 4px" }}>{c.full_name}</h1>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 8px" }}>
              {[c.gender, age ? `גיל ${age}` : null, c.residence].filter(Boolean).join(" · ")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {c.availability_status && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: c.availability_status === "תפוס" ? "#fef3c7" : "#d1fae5", color: c.availability_status === "תפוס" ? "#92400e" : "#065f46", fontWeight: 600 }}>
                  {c.availability_status}
                </span>
              )}
              {c.religious_level && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                  {c.religious_level}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two columns: personal details */}
        <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>פרטים אישיים</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px", marginBottom: "20px" }}>
          {field("שם מלא", c.full_name)}
          {field("מין", c.gender)}
          {field("גיל", age ? String(age) : null)}
          {field("עיר מגורים", c.residence)}
          {field("מצב משפחתי", c.marital_status)}
          {field("ילדים", c.children_count != null ? String(c.children_count) : null)}
          {field("רמה דתית", c.religious_level)}
          {field("גובה", c.height ? `${c.height} ס"מ` : null)}
          {field("השכלה", c.education)}
          {field("תעסוקה", c.occupation)}
          {field("השכלה תורנית", c.torah_education)}
          {field("שירות", c.military_service)}
        </div>

        {/* About me */}
        {c.about_me && (
          <>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>תיאור אישי</h2>
            <p style={{ fontSize: "12px", color: "#333", lineHeight: 1.7, marginBottom: "20px", whiteSpace: "pre-line", background: "#f0f9ff", borderRadius: "6px", padding: "10px" }}>{c.about_me}</p>
          </>
        )}

        {/* Looking for */}
        {c.looking_for && (
          <>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
              {c.gender === "נקבה" ? "מה אני מחפשת" : "מה אני מחפש"}
            </h2>
            <p style={{ fontSize: "12px", color: "#333", lineHeight: 1.7, marginBottom: "20px", whiteSpace: "pre-line", background: "#fdf2f8", borderRadius: "6px", padding: "10px" }}>{c.looking_for}</p>
          </>
        )}

        {/* Contact info */}
        <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px", breakBefore: "page" }}>פרטי קשר</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: "20px" }}>
          {field("אימייל", c.email)}
          {field("טלפון", c.phone_number)}
          {field("איש קשר", c.contact_person)}
          {field("טלפון איש קשר", c.contact_person_phone)}
        </div>

        {/* Additional photos */}
        {imgs.length > 1 && (
          <>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>תמונות נוספות</h2>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {imgs.slice(1).map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={url} alt="" style={{ width: "120px", height: "140px", objectFit: "contain", borderRadius: "6px" }} />
              ))}
            </div>
          </>
        )}

        {/* Admin notes */}
        {adminNotes && adminNotes.length > 0 && (
          <>
            <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0ea5e9", marginBottom: "10px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>הערות מנהל</h2>
            <div style={{ marginBottom: "20px" }}>
              {adminNotes.map((note) => (
                <div key={note.id} style={{ background: "#fffbeb", borderRadius: "6px", padding: "8px 10px", marginBottom: "6px", fontSize: "12px" }}>
                  <p style={{ margin: "0 0 4px", color: "#333" }}>{note.note_text}</p>
                  <span style={{ fontSize: "10px", color: "#888" }}>
                    {new Date(note.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: "10px", color: "#bbb", textAlign: "center", marginTop: "32px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
          הופק מתוך מערכת Ronel Lovely · {new Date().toLocaleDateString("he-IL")}
        </p>
      </div>
    </>
  );
}
