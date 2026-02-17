"use client";

import { useRef, useState } from "react";
import { createCandidate, type FieldErrors } from "./actions";
import Link from "next/link";
import Image from "next/image";

export default function NewCandidatePage() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [selectedGender, setSelectedGender] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => [...prev, ...files].slice(0, 3));
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.delete("images");
    for (const img of images) {
      formData.append("images", img);
    }

    const result = await createCandidate(formData);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      setSubmitting(false);
    } else if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">RL</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">
                {selectedGender === "נקבה" ? "הוספת מועמדת" : selectedGender === "זכר" ? "הוספת מועמד" : "הוספת מועמד חדש"}
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                {selectedGender === "נקבה" ? "מילוי פרטי המועמדת החדשה" : selectedGender === "זכר" ? "מילוי פרטי המועמד החדש" : "מילוי פרטים"}
              </p>
            </div>
          </div>
          <Link href="/admin" className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">חזרה לרשימה</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="פרטי התקשרות">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField name="email" label="אימייל" type="email" required placeholder="example@email.com" dir="ltr" error={fieldErrors.email} />
              <InputField name="phone_number" label="מספר טלפון" type="tel" required placeholder="050-0000000" dir="ltr" error={fieldErrors.phone_number} />
            </div>
          </Section>

          <Section title="פרטים אישיים">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField name="full_name" label="שם מלא" required placeholder="שם פרטי ומשפחה" error={fieldErrors.full_name} />
              <InputField name="id_number" label="מספר ת.ז." required placeholder="012345678" dir="ltr" error={fieldErrors.id_number} />
              <SelectField name="gender" label="מין" required options={["זכר", "נקבה"]} error={fieldErrors.gender} onChange={setSelectedGender} />
              <InputField name="birth_date" label="תאריך לידה" type="date" required dir="ltr" error={fieldErrors.birth_date} />
              <InputField name="residence" label="עיר מגורים" required placeholder="למשל: ירושלים" error={fieldErrors.residence} />
              <SelectField name="marital_status" label="מצב משפחתי" required options={selectedGender === "נקבה" ? ["רווקה", "גרושה", "אלמנה"] : selectedGender === "זכר" ? ["רווק", "גרוש", "אלמן"] : ["רווק/ה", "גרוש/ה", "אלמן/ה"]} error={fieldErrors.marital_status} />
              <InputField name="children_count" label="מספר ילדים" type="number" placeholder="0" dir="ltr" error={fieldErrors.children_count} />
              <SelectField name="religious_level" label="רמה דתית" required options={selectedGender === "נקבה" ? ["חרדית", "דתייה", "מסורתית", "חילונית", "דתייה לאומית", "דתי לאומי תורני"] : selectedGender === "זכר" ? ["חרדי", "דתי", "מסורתי", "חילוני", "דתי לאומי", "דתי לאומי תורני"] : ["חרדי/ת", "דתי/ה", "מסורתי/ת", "חילוני/ת", "דתי/ה לאומי/ת", "דתי לאומי תורני"]} error={fieldErrors.religious_level} />
              <InputField name="height" label="גובה (ס״מ)" type="number" required placeholder="170" dir="ltr" error={fieldErrors.height} />
              <InputField name="education" label="השכלה" required placeholder="למשל: תואר ראשון" error={fieldErrors.education} />
              <InputField name="occupation" label="תעסוקה" required placeholder="למשל: מהנדס תוכנה" error={fieldErrors.occupation} />
            </div>
          </Section>

          <Section title="תמונות פרופיל">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">תמונות (עד 3) <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-3 mt-2">
                {images.map((file, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                    <Image src={URL.createObjectURL(file)} alt={`תמונה ${i + 1}`} fill className="object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                  </div>
                ))}
                {images.length < 3 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${fieldErrors.images ? "border-red-400 bg-red-50 text-red-400" : "border-gray-300 hover:border-sky-400 text-gray-400 hover:text-sky-500"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[10px]">הוסף תמונה</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {!fieldErrors.images && <p className="mt-1.5 text-xs text-gray-400">יש להעלות לפחות תמונה אחת (עד 3)</p>}
              {fieldErrors.images && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.images}</p>}
            </div>
          </Section>

          <Section title="תיאור">
            <TextareaField name="about_me" label="תיאור אישי" required placeholder={selectedGender === "נקבה" ? "ספרי על עצמך..." : selectedGender === "זכר" ? "ספר על עצמך..." : "ספר/י על עצמך..."} hint="יש לכתוב לפחות 15 מילים" error={fieldErrors.about_me} />
            <TextareaField name="looking_for" label={selectedGender === "נקבה" ? "מה חשוב לי בבן הזוג" : selectedGender === "זכר" ? "מה חשוב לי בבת הזוג" : "מה חשוב לי בבן/בת הזוג"} required placeholder={selectedGender === "נקבה" ? "מה את מחפשת..." : selectedGender === "זכר" ? "מה אתה מחפש..." : "מה את/ה מחפש/ת..."} error={fieldErrors.looking_for} />
          </Section>

          <Section title="פרטי איש קשר">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField name="contact_person" label="שם איש קשר" required placeholder="שם מלא" error={fieldErrors.contact_person} />
              <InputField name="contact_person_phone" label="טלפון איש קשר" type="tel" required placeholder="050-0000000" dir="ltr" error={fieldErrors.contact_person_phone} />
            </div>
          </Section>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>}
          {Object.keys(fieldErrors).length > 0 && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">יש לתקן את השגיאות המסומנות בטופס</div>}

          <button type="submit" disabled={submitting} className="w-full py-3 text-base font-semibold text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-300 rounded-xl transition-colors shadow-sm">
            {submitting ? "שומר..." : selectedGender === "נקבה" ? "שמור מועמדת" : selectedGender === "זכר" ? "שמור מועמד" : "שמור מועמד/ת"}
          </button>
        </form>
      </main>
    </div>
  );
}

/* ── Form Components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-sky-500 rounded-full inline-block" />{title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function InputField({ name, label, type = "text", required, placeholder, dir, error }: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string; dir?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} dir={dir}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({ name, label, options, required, error, onChange }: {
  name: string; label: string; options: string[]; required?: boolean; error?: string; onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <select id={name} name={name} required={required}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`}>
        <option value="">בחר...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function TextareaField({ name, label, placeholder, required, hint, error }: {
  name: string; label: string; placeholder?: string; required?: boolean; hint?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <textarea id={name} name={name} rows={4} required={required} placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition-all resize-none ${error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"}`} />
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
