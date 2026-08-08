"use client";

// Programs tab: list certification programs, create new ones.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  expiry_months: number;
  section_count: number;
  offer_count: number;
  purchase_count: number;
  updated_at: string;
};

const STATUS_BADGE: Record<ProgramRow["status"], string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-200 text-gray-600",
};

export default function CertificationProgramsTab() {
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/certification/programs");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load programs.");
      setPrograms(json.programs);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} If the cert tables don't exist yet, run supabase/migrations/20260805_certifications.sql in the website project's SQL editor.`
          : "Failed to load programs."
      );
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProgram() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/certification/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create program.");
      setNewTitle("");
      setShowCreate(false);
      window.location.href = `/certification/${json.program.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create program.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {programs ? `${programs.length} program${programs.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
        >
          New program
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-3">
        {(programs ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/certification/${p.id}`}
            className="block bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 hover:border-sky-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {p.section_count} section{p.section_count === 1 ? "" : "s"} ·{" "}
                  {p.offer_count} offer{p.offer_count === 1 ? "" : "s"} ·{" "}
                  {p.purchase_count} purchase{p.purchase_count === 1 ? "" : "s"} · Cert valid{" "}
                  {p.expiry_months} mo
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}
              >
                {p.status}
              </span>
            </div>
          </Link>
        ))}
        {programs && programs.length === 0 && !error && (
          <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
            No programs yet. Create one to start building your certification course.
          </p>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New program</h2>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProgram()}
              placeholder="SkyBall Coaching Certification — Level 1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProgram}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
