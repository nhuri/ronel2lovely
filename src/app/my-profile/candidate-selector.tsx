"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createInvitationLink } from "./actions";
import { logout } from "@/app/login/actions";

interface CandidateOption {
  id: number;
  full_name: string;
  image_urls: string[] | null;
}

/**
 * Dropdown selector for managers with multiple candidates.
 * Shown in the header when a candidate is selected.
 */
export function CandidateSelectorDropdown({
  candidates,
  currentCandidateId,
  basePath = "/my-profile",
}: {
  candidates: CandidateOption[];
  currentCandidateId: number;
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const current = candidates.find((c) => c.id === currentCandidateId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (candidates.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
      >
        <span className="max-w-[120px] truncate">{current?.full_name}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {candidates.map((c) => {
            const img = c.image_urls?.[0];
            const isActive = c.id === currentCandidateId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  router.push(`${basePath}?candidate_id=${c.id}`);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right hover:bg-gray-50 transition-colors ${isActive ? "bg-sky-50 text-sky-700 font-medium" : "text-gray-700"}`}
              >
                {img ? (
                  <Image src={img} alt="" width={28} height={28} className="rounded-full object-cover w-7 h-7" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                    {c.full_name?.[0]}
                  </div>
                )}
                <span className="truncate">{c.full_name}</span>
                {isActive && (
                  <svg className="w-4 h-4 mr-auto text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                router.push("/new-candidate");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-sky-600 hover:bg-sky-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-lg font-light">
                +
              </div>
              <span>הוסף מועמד חדש</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full-page candidate selection (shown when needsSelection === true).
 */
export function CandidateSelectionPage({
  candidates,
  basePath = "/my-profile",
}: {
  candidates: CandidateOption[];
  basePath?: string;
}) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreateInvite() {
    setInviteLoading(true);
    const result = await createInvitationLink();
    if (result.url) {
      const fullUrl = `${window.location.origin}${result.url}`;
      setInviteUrl(fullUrl);
    }
    setInviteLoading(false);
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">RL</span>
          </div>
          <h1 className="text-base font-bold text-gray-800">בחר מועמד</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {candidates.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-7 h-7 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">ברוכים הבאים!</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              עדיין אין מועמדים בחשבון שלך. הוסף מועמד חדש או שלח קישור הזמנה.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              יש לך כמה מועמדים. בחר את המועמד שברצונך לצפות בו:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {candidates.map((c) => {
            const img = c.image_urls?.[0];
            return (
              <button
                key={c.id}
                onClick={() => router.push(`${basePath}?candidate_id=${c.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all text-right"
              >
                {img ? (
                  <Image src={img} alt="" width={48} height={48} className="rounded-xl object-cover w-12 h-12 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg flex-shrink-0">
                    {c.full_name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{c.full_name}</p>
                </div>
              </button>
            );
              })}
            </div>
          </>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push("/new-candidate")}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            + הוסף מועמד חדש
          </button>

          {/* Invitation link */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-bold text-gray-800 mb-2">קישור הרשמה למועמד חדש</p>
            <p className="text-xs text-gray-500 mb-3">
              צור קישור הזמנה ושלח אותו למועמד. המועמד ימלא את הפרטים שלו והפרופיל יקושר אליך אוטומטית.
            </p>

            {!inviteUrl ? (
              <button
                onClick={handleCreateInvite}
                disabled={inviteLoading}
                className="w-full py-2.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 rounded-xl transition-colors"
              >
                {inviteLoading ? "יוצר קישור..." : "צור קישור הזמנה"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    dir="ltr"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors whitespace-nowrap"
                  >
                    {copied ? "הועתק!" : "העתק"}
                  </button>
                </div>
                <button
                  onClick={handleCreateInvite}
                  className="text-xs text-sky-600 hover:text-sky-700 transition-colors"
                >
                  צור קישור חדש
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <form action={logout} className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              התנתקות
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
