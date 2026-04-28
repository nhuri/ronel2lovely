"use client";

import { useState } from "react";
import { CandidatesGrid } from "./candidates-grid";
import { SendMessageTab } from "./send-message-tab";
import { SettingsTab } from "./settings-tab";
import { EmailLogsTab } from "./email-logs-tab";
import { AnalyticsTab } from "./analytics-tab";
import type { FollowupDelay } from "@/lib/followup";
import type { AnalyticsStats } from "./analytics-actions";

type MessageCandidate = {
  id: number;
  full_name: string;
  gender?: string | null;
  phone_number?: string | null;
  email?: string | null;
  image_urls?: string[] | null;
};

type AdminTabsProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allCandidates: any[];
  genders: string[];
  religiousLevels: string[];
  maxRecommendations: number | "all";
  followupFirst: FollowupDelay;
  followupSecond: FollowupDelay;
  analyticsStats: AnalyticsStats;
};

export function AdminTabs({ candidates, allCandidates, genders, religiousLevels, maxRecommendations, followupFirst, followupSecond, analyticsStats }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<"candidates" | "message" | "settings" | "emails" | "analytics">("candidates");

  return (
    <div dir="rtl">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "candidates"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          מועמדים
          <span className={`mr-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === "candidates" ? "bg-sky-400 text-white" : "bg-gray-100 text-gray-500"}`}>
            {candidates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("message")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "message"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          שליחת הודעה
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "settings"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          הגדרות
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "emails"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          מיילים
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === "analytics"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          אנליטיקה
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "candidates" && (
        <CandidatesGrid
          candidates={candidates}
          genders={genders}
          religiousLevels={religiousLevels}
        />
      )}
      {activeTab === "message" && (
        <SendMessageTab candidates={allCandidates as MessageCandidate[]} />
      )}
      {activeTab === "settings" && (
        <SettingsTab
          initialValue={maxRecommendations}
          initialFollowupFirst={followupFirst}
          initialFollowupSecond={followupSecond}
        />
      )}
      {activeTab === "emails" && (
        <EmailLogsTab />
      )}
      {activeTab === "analytics" && (
        <AnalyticsTab stats={analyticsStats} />
      )}
    </div>
  );
}
