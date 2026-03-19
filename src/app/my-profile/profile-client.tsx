"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import {
  updateMyProfile,
  deleteMyProfile,
  updateCandidateEmail,
  toggleAvailability,
  type FieldErrors,
} from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Candidate = Record<string, any>;

interface CandidateOption {
  id: number;
  full_name: string;
  image_urls: string[] | null;
}

export function ProfileClient({
  candidate: initial,
  candidateId,
  allCandidates,
  startInEditMode = false,
  needsEmail = false,
  readOnly = false,
  backUrl,
  hideHeader = false,
}: {
  candidate: Candidate;
  candidateId?: number;
  allCandidates?: CandidateOption[];
  startInEditMode?: boolean;
  needsEmail?: boolean;
  readOnly?: boolean;
  backUrl?: string;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">(startInEditMode ? "edit" : "view");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [c, setC] = useState(initial);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [keepImages, setKeepImages] = useState<string[]>(initial.image_urls ?? []);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mandatory email modal state (for phone-auth users)
  const [showEmailModal, setShowEmailModal] = useState(needsEmail);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  // Build candidate_id param for navigation links (multi-candidate support)
  const cidParam = allCandidates && allCandidates.length > 1 && candidateId
    ? `?candidate_id=${candidateId}` : "";

  const imgs: string[] = c.image_urls ?? [];
  const age = c.birth_date
    ? Math.floor(
        (Date.now() - new Date(c.birth_date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : c.age ?? null;

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    keepImages.forEach((url) => formData.append("keep_images", url));
    editImages.forEach((file) => formData.append("new_images", file));
    const result = await updateMyProfile(formData, candidateId);

    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      setSaving(false);
    } else if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      // Update local state from form values
      const updated = { ...c };
      formData.forEach((val, key) => {
        if (key !== "keep_images" && key !== "new_images") updated[key] = val;
      });
      if (updated.children_count)
        updated.children_count = parseInt(updated.children_count, 10);
      if (updated.height) updated.height = parseInt(updated.height, 10);
      if (result.imageUrls) updated.image_urls = result.imageUrls;
      setC(updated);
      setEditImages([]);
      setKeepImages(result.imageUrls ?? keepImages);
      setSaving(false);
      setMode("view");
      router.refresh();
    }
  }

  async function handleToggleAvailability(newValue: boolean) {
    setTogglingAvail(true);
    const result = await toggleAvailability(newValue, candidateId);
    if (!result?.error) setC({ ...c, is_available: newValue });
    setTogglingAvail(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteMyProfile(candidateId);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
    // On success, deleteMyProfile redirects to /login
  }

  // ── MANDATORY EMAIL MODAL (blocks profile for phone-auth users) ──
  if (showEmailModal) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span className="text-white text-lg font-bold">@</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">
            נדרשת כתובת אימייל
          </h2>
          <p className="text-sm text-gray-500 mb-5 text-center">
            על מנת להמשיך, יש להזין כתובת אימייל תקינה שתשויך לפרופיל שלך
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEmailError(null);
              setEmailSaving(true);
              const result = await updateCandidateEmail(newEmail, candidateId);
              if (result?.error) {
                setEmailError(result.error);
                setEmailSaving(false);
              } else {
                setShowEmailModal(false);
                router.refresh();
              }
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="newEmail"
                className="block text-sm font-medium text-gray-600 mb-1.5"
              >
                כתובת אימייל
              </label>
              <input
                id="newEmail"
                type="email"
                required
                dir="ltr"
                placeholder="example@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            {emailError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                {emailError}
              </div>
            )}

            <button
              type="submit"
              disabled={emailSaving}
              className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-all shadow-sm text-base"
            >
              {emailSaving ? "שומר..." : "שמור והמשך"}
            </button>
          </form>

          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              התנתקות
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ──
  if (mode === "view") {
    return (
      <div className={`${readOnly ? "" : "min-h-screen"} bg-gray-100`} dir="rtl">
        {!hideHeader && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">RL</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-800 leading-tight">{readOnly ? "צפייה בפרופיל" : "הפרופיל שלי"}</h1>
                  <p className="text-[11px] text-gray-400 leading-tight">{c.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {readOnly ? (
                  <Link
                    href={backUrl ?? "/admin"}
                    className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    חזרה לניהול
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/my-profile/proposals${cidParam}`}
                      className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      ההצעות שלי
                    </Link>
                    <Link
                      href={`/my-profile/inquiries${cidParam}`}
                      className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      פניות
                    </Link>
                    <Link
                      href={`/my-profile/recommendations${cidParam}`}
                      className="px-4 py-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
                    >
                      הצעות מומלצות
                    </Link>
                    <button
                      onClick={() => setMode("edit")}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
                    >
                      עריכת פרופיל
                    </button>
                    <form action={logout}>
                      <button type="submit" className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        התנתקות
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {imgs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`flex gap-1 overflow-x-auto p-1 ${imgs.length === 1 ? "justify-center" : ""}`}>
                {imgs.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative flex-shrink-0 w-60 h-72 rounded-xl overflow-hidden block cursor-pointer">
                    <Image src={url} alt={`${c.full_name} ${i + 1}`} fill className="object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <ViewSection title="פרטים אישיים">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="שם מלא" value={c.full_name} />
              <Field label="מין" value={c.gender} />
              <Field label="גיל" value={age != null ? String(age) : null} />
              <Field label="עיר מגורים" value={c.residence} />
              <Field label="מצב משפחתי" value={c.marital_status} />
              <Field label="ילדים" value={c.children_count != null ? String(c.children_count) : null} />
              <Field label="רמה דתית" value={c.religious_level} />
              <Field label="גובה" value={c.height ? `${c.height} ס"מ` : null} />
              <Field label="השכלה" value={c.education} />
              <Field label="תעסוקה" value={c.occupation} />
            </div>
          </ViewSection>

          {c.about_me && (
            <ViewSection title="תיאור אישי">
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-sky-50/50 border border-sky-100 rounded-xl p-4">{c.about_me}</p>
            </ViewSection>
          )}

          {c.looking_for && (
            <ViewSection title={c.gender === "נקבה" ? "מה אני מחפשת" : "מה אני מחפש"}>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-pink-50/50 border border-pink-100 rounded-xl p-4">{c.looking_for}</p>
            </ViewSection>
          )}

          <ViewSection title="פרטי קשר">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="אימייל" value={c.email} dir="ltr" />
                <Field label="טלפון" value={c.phone_number} dir="ltr" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="איש קשר" value={c.contact_person} />
                {c.contact_person_phone && <Field label="טלפון איש קשר" value={c.contact_person_phone} dir="ltr" />}
              </div>
            </div>
          </ViewSection>

          {/* Availability toggle */}
          {!readOnly && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <p className="text-sm font-bold text-gray-700 mb-3">סטטוס זמינות</p>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.is_available === false ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {c.is_available === false
                    ? (c.gender === "נקבה" ? "תפוסה" : "תפוס")
                    : (c.gender === "נקבה" ? "פנויה" : "פנוי")}
                </span>
                <button
                  onClick={() => handleToggleAvailability(c.is_available === false)}
                  disabled={togglingAvail}
                  className="text-sm text-sky-600 hover:text-sky-700 underline disabled:opacity-50"
                >
                  {togglingAvail ? "שומר..." : c.is_available === false ? "סמן כפנוי/ה" : "סמן כתפוס/ה"}
                </button>
              </div>
            </div>
          )}

          {/* Freeze Profile */}
          {!readOnly && <div className="pt-4 border-t border-gray-200">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                הקפאת פרופיל
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-700 mb-3">
                  {c.gender === "נקבה"
                    ? "האם את בטוחה שברצונך להקפיא את הפרופיל? לא תוכלי להתחבר עד שתשוחרר ההקפאה."
                    : "האם אתה בטוח שברצונך להקפיא את הפרופיל? לא תוכל להתחבר עד שתשוחרר ההקפאה."
                  }
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
                  >
                    {deleting ? "מקפיא..." : "כן, הקפא את הפרופיל"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>
          )}
        </main>
      </div>
    );
  }

  // ── EDIT MODE ──
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">עריכת פרופיל</h1>
              <p className="text-[11px] text-gray-400 leading-tight">{c.full_name}</p>
            </div>
          </div>
          <button
            onClick={() => { setMode("view"); setFieldErrors({}); setError(null); setEditImages([]); setKeepImages(c.image_urls ?? []); }}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ביטול
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleUpdate} className="space-y-6">
          <EditSection title="תמונות פרופיל">
            <div className="flex flex-wrap gap-3">
              {keepImages.map((url, i) => (
                <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group flex-shrink-0">
                  <Image src={url} alt={`תמונה ${i + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setKeepImages(keepImages.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}
              {editImages.map((file, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-sky-300 group flex-shrink-0">
                  <Image src={URL.createObjectURL(file)} alt={`תמונה חדשה ${i + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditImages(editImages.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}
              {(keepImages.length + editImages.length) < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-sky-400 text-gray-400 hover:text-sky-500 flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px]">הוסף תמונה</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && keepImages.length + editImages.length < 3) {
                  setEditImages([...editImages, file]);
                }
                e.target.value = "";
              }}
            />
            {keepImages.length + editImages.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">לא נבחרו תמונות. ניתן להוסיף עד 3 תמונות.</p>
            )}
          </EditSection>

          <EditSection title="פרטים אישיים">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditInput name="full_name" label="שם מלא" required defaultValue={c.full_name} error={fieldErrors.full_name} />
              <EditInput name="phone_number" label="מספר טלפון" type="tel" required defaultValue={c.phone_number} dir="ltr" error={fieldErrors.phone_number} />
              <EditSelect name="gender" label="מין" required options={["זכר", "נקבה"]} defaultValue={c.gender} error={fieldErrors.gender} />
              <EditInput name="birth_date" label="תאריך לידה" type="date" required defaultValue={c.birth_date ?? ""} dir="ltr" error={fieldErrors.birth_date} />
              <EditInput name="residence" label="עיר מגורים" required defaultValue={c.residence} error={fieldErrors.residence} />
              <EditSelect name="marital_status" label="מצב משפחתי" required options={c.gender === "נקבה" ? ["רווקה", "גרושה", "אלמנה"] : ["רווק", "גרוש", "אלמן"]} defaultValue={c.marital_status} error={fieldErrors.marital_status} />
              <EditInput name="children_count" label="מספר ילדים" type="number" defaultValue={c.children_count ?? ""} dir="ltr" error={fieldErrors.children_count} />
              <EditSelect name="religious_level" label="רמה דתית" required options={c.gender === "נקבה" ? ["חרדית", "דתייה", "מסורתית", "חילונית", "דתייה לאומית", "דתי לאומי תורני"] : ["חרדי", "דתי", "מסורתי", "חילוני", "דתי לאומי", "דתי לאומי תורני"]} defaultValue={c.religious_level} error={fieldErrors.religious_level} />
              <EditInput name="height" label="גובה (ס״מ)" type="number" required defaultValue={c.height ?? ""} dir="ltr" error={fieldErrors.height} />
              <EditInput name="education" label="השכלה" required defaultValue={c.education} error={fieldErrors.education} />
              <EditInput name="occupation" label="תעסוקה" required defaultValue={c.occupation} error={fieldErrors.occupation} />
            </div>
          </EditSection>

          <EditSection title="תיאור">
            <EditTextarea name="about_me" label="תיאור אישי" required defaultValue={c.about_me ?? ""} hint="יש לכתוב לפחות 15 מילים" error={fieldErrors.about_me} />
            <EditTextarea name="looking_for" label={c.gender === "נקבה" ? "מה חשוב לי בבן הזוג" : "מה חשוב לי בבת הזוג"} required defaultValue={c.looking_for ?? ""} error={fieldErrors.looking_for} />
          </EditSection>

          <EditSection title="פרטי איש קשר">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditInput name="contact_person" label="שם איש קשר" required defaultValue={c.contact_person ?? ""} error={fieldErrors.contact_person} />
              <EditInput name="contact_person_phone" label="טלפון איש קשר" type="tel" required defaultValue={c.contact_person_phone ?? ""} dir="ltr" error={fieldErrors.contact_person_phone} />
            </div>
          </EditSection>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>}
          {Object.keys(fieldErrors).length > 0 && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">יש לתקן את השגיאות המסומנות בטופס</div>}

          <button type="submit" disabled={saving} className="w-full py-3 text-base font-semibold text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-300 rounded-xl transition-colors shadow-sm">
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </form>
      </main>
    </div>
  );
}

/* ── View Components ── */

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />{title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) {
  return (
    <div>
      <span className="text-[11px] text-gray-400 font-medium block">{label}</span>
      <p className={`text-sm font-semibold text-gray-800 mt-0.5 ${dir === "ltr" ? "direction-ltr text-right" : ""}`} style={dir === "ltr" ? { direction: "ltr", textAlign: "right" } : undefined}>{value || "-"}</p>
    </div>
  );
}

/* ── Edit Components ── */

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />{title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function EditInput({ name, label, type = "text", required, defaultValue, placeholder, dir, error }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number; placeholder?: string; dir?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} dir={dir}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EditSelect({ name, label, options, required, defaultValue, error }: {
  name: string; label: string; options: string[]; required?: boolean; defaultValue?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <select id={name} name={name} required={required} defaultValue={defaultValue ?? ""}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`}>
        <option value="">בחר...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EditTextarea({ name, label, required, defaultValue, placeholder, hint, error }: {
  name: string; label: string; required?: boolean; defaultValue?: string; placeholder?: string; hint?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <textarea id={name} name={name} rows={4} required={required} defaultValue={defaultValue} placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`} />
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
