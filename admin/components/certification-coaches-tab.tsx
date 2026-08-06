"use client";

// Certified Coaches tab: the certifications registry with
// active/expired/revoked filter and CSV export.

import { useCallback, useEffect, useState } from "react";
import { buildCsv, triggerCsvDownload } from "@/lib/csv-export";

type Coach = {
  id: string;
  verify_code: string;
  full_name: string;
  email: string;
  issued_at: string;
  expires_at: string;
  status: "active" | "revoked";
  derived_status: "active" | "expired" | "revoked";
  cert_programs: { title: string } | null;
};

const FILTERS = ["all", "active", "expired", "revoked"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_BADGE: Record<Coach["derived_status"], string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-700",
};

export default function CertificationCoachesTab() {
  const [coaches, setCoaches] = useState<Coach[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setError(null);
    try {
      const qs = f === "all" ? "" : `?status=${f}`;
      const res = await fetch(`/api/admin/certification/coaches${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load coaches.");
      setCoaches(json.coaches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coaches.");
      setCoaches([]);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  function exportCsv() {
    if (!coaches?.length) return;
    const csv = buildCsv(
      ["Name", "Email", "Program", "Certificate No.", "Issued", "Expires", "Status"],
      coaches.map((c) => [
        c.full_name,
        c.email,
        c.cert_programs?.title ?? "",
        c.verify_code,
        new Date(c.issued_at).toLocaleDateString(),
        new Date(c.expires_at).toLocaleDateString(),
        c.derived_status,
      ])
    );
    triggerCsvDownload(csv, `certified-coaches-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-sky-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          disabled={!coaches?.length}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Cert No.</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(coaches ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                  {c.full_name}
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.email}</td>
                <td className="px-4 py-2.5 text-gray-600">{c.cert_programs?.title ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                  {c.verify_code}
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {new Date(c.issued_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {new Date(c.expires_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.derived_status]}`}
                  >
                    {c.derived_status}
                  </span>
                </td>
              </tr>
            ))}
            {coaches && coaches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No certified coaches{filter !== "all" ? ` (${filter})` : ""} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
