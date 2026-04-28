"use client";

import { useState, type ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
  count?: number;
  color: string;
  content: ReactNode;
}

export function CandidateTabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");

  return (
    <div dir="rtl" className="overflow-x-hidden">
      {/* Tab bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-2 text-sm font-medium rounded-xl transition-colors ${
                activeTab === tab.key
                  ? `${tab.color} text-white`
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`mr-1 text-xs ${
                    activeTab === tab.key
                      ? "text-white/80"
                      : "text-gray-400"
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        {tabs.map((tab) => (
          <div key={tab.key} className={activeTab === tab.key ? "" : "hidden"}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
