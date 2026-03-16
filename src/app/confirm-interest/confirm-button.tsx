"use client";

import { useState } from "react";
import { confirmMutualInterest } from "./actions";

type Props = {
  token: string;
  fromName: string;
  fromGender: string;
};

export function ConfirmButton({ token, fromName, fromGender }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ fromPhone: string; fromEmail: string | null } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setState("loading");
    const res = await confirmMutualInterest(token);
    if (res.status === "success") {
      setState("success");
      setResult({ fromPhone: res.fromPhone, fromEmail: res.fromEmail });
    } else if (res.status === "already_used") {
      setState("error");
      setErrorMsg("קישור זה כבר שומש. בדוק את המייל שנשלח לשניכם.");
    } else if (res.status === "expired") {
      setState("error");
      setErrorMsg("קישור זה פג תוקף. צור/י קשר עם צוות האתר.");
    } else {
      setState("error");
      setErrorMsg("שגיאה. נסה/י שוב או צור/י קשר עם צוות האתר.");
    }
  };

  if (state === "success") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mx-auto">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 text-center">
          🎉 מזל טוב! ההתאמה נרשמה!
        </h3>
        <p className="text-sm text-gray-600 text-center">
          שלחנו לשניכם מייל עם פרטי ההתקשרות. סטטוס ההצעה עודכן ל"דייטים".
        </p>
        {(result?.fromPhone || result?.fromEmail) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-emerald-800">פרטי קשר של {fromName}:</p>
            {result.fromPhone && (
              <a
                href={`tel:${result.fromPhone}`}
                className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {result.fromPhone}
              </a>
            )}
            {result.fromEmail && (
              <a
                href={`mailto:${result.fromEmail}`}
                className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {result.fromEmail}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
        <p className="text-sm text-red-600">{errorMsg}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={state === "loading"}
      className="w-full py-4 bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-2xl font-bold text-lg transition-all shadow-md"
    >
      {state === "loading" ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          שולח...
        </span>
      ) : (
        `✓ כן, גם אני ${fromGender === "זכר" ? "מעוניין" : "מעוניינת"} להכיר ${fromGender === "זכר" ? "אותו" : "אותה"}!`
      )}
    </button>
  );
}
