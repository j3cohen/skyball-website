"use client";

// Purchases & Seats tab: every certification purchase with its seats,
// claim links (copy button), and seat revoke/restore controls.

import { useCallback, useEffect, useState } from "react";

type Seat = {
  id: string;
  claim_token: string;
  status: "unclaimed" | "claimed" | "revoked";
  claimed_email: string | null;
  claimed_name: string | null;
  claimed_at: string | null;
};

type Purchase = {
  id: string;
  stripe_session_id: string;
  purchaser_email: string | null;
  purchaser_name: string | null;
  seat_count: number;
  amount_total_cents: number | null;
  created_at: string;
  cert_programs: { title: string } | null;
  cert_offers: { name: string } | null;
  cert_seats: Seat[];
};

const SEAT_BADGE: Record<Seat["status"], string> = {
  unclaimed: "bg-amber-100 text-amber-800",
  claimed: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-700",
};

function claimUrl(token: string) {
  return `${window.location.origin.replace("admin.", "")}/coaching/claim/${token}`.replace(
    ":3001",
    ":3000"
  );
}

export default function CertificationPurchasesTab() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busySeat, setBusySeat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/certification/purchases");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load purchases.");
      setPurchases(json.purchases);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchases.");
      setPurchases([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink(seat: Seat) {
    await navigator.clipboard.writeText(claimUrl(seat.claim_token));
    setCopied(seat.id);
    setTimeout(() => setCopied((c) => (c === seat.id ? null : c)), 1500);
  }

  async function setSeatStatus(seat: Seat, status: "revoked" | "unclaimed") {
    setBusySeat(seat.id);
    try {
      const res = await fetch(`/api/admin/certification/seats/${seat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update seat.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update seat.");
    } finally {
      setBusySeat(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="space-y-4">
        {(purchases ?? []).map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {p.cert_offers?.name ?? "Certification"} — {p.cert_programs?.title ?? ""}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {p.purchaser_name || p.purchaser_email || "Unknown buyer"} ·{" "}
                  {new Date(p.created_at).toLocaleDateString()} ·{" "}
                  {p.amount_total_cents != null
                    ? `$${(p.amount_total_cents / 100).toFixed(2)}`
                    : "—"}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {p.cert_seats.filter((s) => s.status === "claimed").length}/{p.seat_count} claimed
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {p.cert_seats.map((s, i) => (
                <li key={s.id} className="px-5 py-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500 w-12">#{i + 1}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEAT_BADGE[s.status]}`}
                  >
                    {s.status}
                  </span>
                  <span className="flex-1 min-w-[10rem] text-sm text-gray-700 truncate">
                    {s.status === "claimed"
                      ? `${s.claimed_name || s.claimed_email || "claimed"}${
                          s.claimed_at ? ` · ${new Date(s.claimed_at).toLocaleDateString()}` : ""
                        }`
                      : s.status === "unclaimed"
                        ? "Link not yet used"
                        : "Revoked"}
                  </span>
                  {s.status !== "revoked" && (
                    <button
                      onClick={() => copyLink(s)}
                      className="px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors"
                    >
                      {copied === s.id ? "Copied!" : "Copy claim link"}
                    </button>
                  )}
                  {s.status !== "revoked" ? (
                    <button
                      onClick={() => setSeatStatus(s, "revoked")}
                      disabled={busySeat === s.id}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Revoke
                    </button>
                  ) : (
                    !s.claimed_at && (
                      <button
                        onClick={() => setSeatStatus(s, "unclaimed")}
                        disabled={busySeat === s.id}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        Restore
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {purchases && purchases.length === 0 && !error && (
          <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
            No purchases yet.
          </p>
        )}
      </div>
    </div>
  );
}
