"use client";

// Create, edit and delete saved regions.
//
// The country picker is built from countries that actually appear in the order
// data, with their order counts — so you're grouping real destinations rather
// than scrolling a list of 200 mostly-irrelevant codes.

import { useEffect, useMemo, useState } from "react";
import { X, Pencil, Trash2, Plus } from "lucide-react";
import { useRegions, countryLabel, type SavedRegion } from "@/lib/regions";

type CountryOption = { code: string; orders: number };

type Props = { onClose: () => void };

export default function RegionManagerModal({ onClose }: Props) {
  const { regions, save, remove } = useRegions();

  const [options, setOptions] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SavedRegion | null>(null);
  const [name, setName]       = useState("");
  const [picked, setPicked]   = useState<Set<string>>(new Set());
  const [search, setSearch]   = useState("");
  const [error, setError]     = useState<string | null>(null);

  // Countries seen in the data, most-used first.
  useEffect(() => {
    fetch("/api/admin/analytics/revenue")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.countryBreakdown ?? []) as { country: string; count: number }[];
        setOptions(rows.map((r) => ({ code: r.country.toUpperCase(), orders: r.count })));
      })
      .catch(() => setError("Couldn't load the country list."))
      .finally(() => setLoading(false));
  }, []);

  const claimed = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of regions) {
      if (editing && r.id === editing.id) continue;
      for (const c of r.countries) m.set(c.toUpperCase(), r.name);
    }
    return m;
  }, [regions, editing]);

  const visible = options.filter(
    (o) =>
      !search.trim() ||
      o.code.includes(search.toUpperCase()) ||
      countryLabel(o.code).toLowerCase().includes(search.toLowerCase())
  );

  function startNew() {
    setEditing({ id: "", name: "", countries: [] });
    setName("");
    setPicked(new Set());
    setError(null);
  }

  function startEdit(r: SavedRegion) {
    setEditing(r);
    setName(r.name);
    setPicked(new Set(r.countries.map((c) => c.toUpperCase())));
    setError(null);
  }

  function toggle(code: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Give the region a name."); return; }
    if (picked.size === 0) { setError("Pick at least one country."); return; }
    const clash = regions.find(
      (r) => r.id !== editing?.id && r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) { setError(`You already have a region called "${clash.name}".`); return; }

    save({ id: editing?.id || undefined, name: trimmed, countries: [...picked] });
    setEditing(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editing ? (editing.id ? "Edit region" : "New region") : "Regions"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Saved on this device · group countries to filter the whole dashboard
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {!editing ? (
            /* ── List ─────────────────────────────────────────────────── */
            <div className="space-y-2">
              {regions.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No regions yet. Create one to filter the dashboard by a group of countries.
                </p>
              )}
              {regions.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {r.countries.length} countr{r.countries.length === 1 ? "y" : "ies"} ·{" "}
                      {r.countries.slice(0, 6).map((c) => c.toUpperCase()).join(", ")}
                      {r.countries.length > 6 && ` +${r.countries.length - 6}`}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(r)}
                    className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                    aria-label={`Edit ${r.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <button
                onClick={startNew}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed
                           border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors
                           hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                <Plus size={15} /> New region
              </button>
            </div>
          ) : (
            /* ── Editor ───────────────────────────────────────────────── */
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="EMEA, Nordics, Key accounts…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500">
                    Countries <span className="text-gray-400">({picked.size} selected)</span>
                  </label>
                  {picked.size > 0 && (
                    <button
                      onClick={() => setPicked(new Set())}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search countries…"
                  className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                {loading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                    {visible.map((o) => {
                      const owner = claimed.get(o.code);
                      return (
                        <label
                          key={o.code}
                          className="flex cursor-pointer items-center gap-2.5 border-b border-gray-50 px-3 py-1.5
                                     text-sm transition-colors last:border-0 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(o.code)}
                            onChange={() => toggle(o.code)}
                          />
                          <span className="min-w-0 flex-1 truncate text-gray-800">
                            {countryLabel(o.code)}
                          </span>
                          {owner && (
                            <span
                              className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                              title={`Also in "${owner}" — regions may overlap`}
                            >
                              {owner}
                            </span>
                          )}
                          <span className="shrink-0 tabular-nums text-xs text-gray-400">{o.orders}</span>
                        </label>
                      );
                    })}
                    {visible.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-gray-400">No countries match.</p>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-400">
                  Counts are orders all-time. Regions may overlap — a country can sit in more than one.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-6 py-4">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(null)}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white
                           transition-colors hover:bg-sky-700"
              >
                {editing.id ? "Save changes" : "Create region"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white
                         transition-colors hover:bg-sky-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
