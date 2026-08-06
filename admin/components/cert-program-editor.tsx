"use client";

// Full program editor: settings card (pass rules, cooldown, expiry,
// publish), offers card (packs incl. equipment combos), and the
// ordered section list (add / reorder / delete / edit via the
// section slide-over panel).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CertOfferModal from "@/components/cert-offer-modal";
import CertSectionPanel from "@/components/cert-section-panel";
import {
  centsToDollarInput,
  type CertOffer,
  type CertProgram,
  type CertSection,
} from "@/lib/cert-utils";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export default function CertProgramEditor({ programId }: { programId: string }) {
  const [program, setProgram] = useState<CertProgram | null>(null);
  const [offers, setOffers] = useState<CertOffer[]>([]);
  const [sections, setSections] = useState<CertSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Settings form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thresholdType, setThresholdType] = useState<"percent" | "count">("percent");
  const [thresholdValue, setThresholdValue] = useState("80");
  const [cooldown, setCooldown] = useState("0");
  const [expiryMonths, setExpiryMonths] = useState("24");
  const [savingSettings, setSavingSettings] = useState(false);

  const [offerModal, setOfferModal] = useState<{ open: boolean; offer: CertOffer | null }>({
    open: false,
    offer: null,
  });
  const [openSection, setOpenSection] = useState<CertSection | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/certification/programs/${programId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load program.");
      setProgram(json.program);
      setOffers(json.offers);
      setSections(json.sections);
      setTitle(json.program.title);
      setDescription(json.program.description ?? "");
      setThresholdType(json.program.pass_threshold_type);
      setThresholdValue(String(json.program.pass_threshold_value));
      setCooldown(String(json.program.retake_cooldown_minutes));
      setExpiryMonths(String(json.program.expiry_months));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load program.");
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certification/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          pass_threshold_type: thresholdType,
          pass_threshold_value: Number.parseInt(thresholdValue, 10) || 0,
          retake_cooldown_minutes: Number.parseInt(cooldown, 10) || 0,
          expiry_months: Number.parseInt(expiryMonths, 10) || 24,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save settings.");
      setProgram(json.program);
      flash("Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function setStatus(status: CertProgram["status"]) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/certification/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update status.");
      setProgram(json.program);
      flash(status === "published" ? "Program published — it's live." : `Status: ${status}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/certification/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: programId, title: newSectionTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add section.");
      setNewSectionTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add section.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection(id: string) {
    if (!window.confirm("Delete this section and its questions?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/certification/sections/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete section.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete section.");
    } finally {
      setBusy(false);
    }
  }

  async function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSections(reordered); // optimistic
    await fetch("/api/admin/certification/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, ordered_ids: reordered.map((s) => s.id) }),
    });
    await load();
  }

  async function deleteOffer(offer: CertOffer) {
    if (!window.confirm(`Delete offer "${offer.name}"?`)) return;
    const res = await fetch(`/api/admin/certification/offers/${offer.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to delete offer.");
      return;
    }
    await load();
  }

  async function toggleOffer(offer: CertOffer) {
    await fetch(`/api/admin/certification/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !offer.active }),
    });
    await load();
  }

  if (!program) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        {error ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/certification" className="text-sm text-sky-700 hover:text-sky-900">
          ← All programs
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{program.title}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                program.status === "published"
                  ? "bg-green-100 text-green-800"
                  : program.status === "draft"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {program.status}
            </span>
            {program.status !== "published" ? (
              <button
                onClick={() => setStatus("published")}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Publish
              </button>
            ) : (
              <button
                onClick={() => setStatus("draft")}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Unpublish
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Sales page: <span className="font-mono">/coaching</span> · Slug:{" "}
          <span className="font-mono">{program.slug}</span>
        </p>
      </div>

      {notice && (
        <p className="mb-4 text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Program settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (shown on the sales page)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default pass threshold
            </label>
            <div className="flex gap-2">
              <select
                value={thresholdType}
                onChange={(e) => setThresholdType(e.target.value as "percent" | "count")}
                className={inputCls}
              >
                <option value="percent">% correct</option>
                <option value="count"># correct</option>
              </select>
              <input
                value={thresholdValue}
                inputMode="numeric"
                onChange={(e) => setThresholdValue(e.target.value)}
                className={`${inputCls} w-24`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default retake wait (minutes)
            </label>
            <input
              value={cooldown}
              inputMode="numeric"
              onChange={(e) => setCooldown(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificate valid for (months)
            </label>
            <input
              value={expiryMonths}
              inputMode="numeric"
              onChange={(e) => setExpiryMonths(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {savingSettings ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      {/* Offers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Offers (what customers can buy)</h2>
          <button
            onClick={() => setOfferModal({ open: true, offer: null })}
            className="px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
          >
            + Add offer
          </button>
        </div>
        <div className="space-y-2">
          {offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex-1 min-w-[12rem]">
                <p className="font-medium text-gray-900">
                  {o.name}{" "}
                  {!o.active && (
                    <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                      inactive
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  ${centsToDollarInput(o.price_cents)} · {o.seat_count} seat
                  {o.seat_count === 1 ? "" : "s"}
                  {o.equipment_items.length > 0 &&
                    ` · ${o.equipment_items.map((i) => `${i.qty}× ${i.label}`).join(", ")}`}
                </p>
              </div>
              <button
                onClick={() => toggleOffer(o)}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {o.active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => setOfferModal({ open: true, offer: o })}
                className="px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => deleteOffer(o)}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
          {offers.length === 0 && (
            <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center">
              No offers yet — customers can&apos;t buy until at least one active offer exists.
            </p>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Course sections (in order)</h2>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0 || busy}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveSection(i, 1)}
                  disabled={i === sections.length - 1 || busy}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <button
                onClick={() => setOpenSection(s)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="font-medium text-gray-900 truncate">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-gray-500">
                  {s.intro_enabled ? "Intro slide · " : ""}
                  {s.video_url ? "Video · " : "No video · "}
                  {s.cert_questions.length} question{s.cert_questions.length === 1 ? "" : "s"}
                  {s.pass_threshold_type !== null || s.retake_cooldown_minutes !== null
                    ? " · custom pass rules"
                    : ""}
                </p>
              </button>
              <button
                onClick={() => setOpenSection(s)}
                className="px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => deleteSection(s.id)}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSection()}
            placeholder="New section title"
            className={inputCls}
          />
          <button
            onClick={addSection}
            disabled={busy || !newSectionTitle.trim()}
            className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            Add section
          </button>
        </div>
      </div>

      {offerModal.open && (
        <CertOfferModal
          programId={programId}
          offer={offerModal.offer}
          onClose={() => setOfferModal({ open: false, offer: null })}
          onSaved={async () => {
            setOfferModal({ open: false, offer: null });
            await load();
          }}
        />
      )}

      {openSection && (
        <CertSectionPanel
          section={openSection}
          onClose={() => setOpenSection(null)}
          onSaved={async () => {
            setOpenSection(null);
            await load();
            flash("Section saved.");
          }}
        />
      )}
    </div>
  );
}
