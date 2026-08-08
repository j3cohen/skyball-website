"use client";

// /certification — coaching-certification admin home.
// Tabs: Programs (build/edit courses) · Purchases & Seats · Certified Coaches.

import { useState } from "react";
import CertificationProgramsTab from "@/components/certification-programs-tab";
import CertificationPurchasesTab from "@/components/certification-purchases-tab";
import CertificationCoachesTab from "@/components/certification-coaches-tab";

type Tab = "programs" | "purchases" | "coaches";

const TABS: { key: Tab; label: string }[] = [
  { key: "programs", label: "Programs" },
  { key: "purchases", label: "Purchases & Seats" },
  { key: "coaches", label: "Certified Coaches" },
];

export default function CertificationPage() {
  const [tab, setTab] = useState<Tab>("programs");

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Certification</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Build certification programs, track purchases, and manage certified coaches
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "programs" && <CertificationProgramsTab />}
      {tab === "purchases" && <CertificationPurchasesTab />}
      {tab === "coaches" && <CertificationCoachesTab />}
    </div>
  );
}
