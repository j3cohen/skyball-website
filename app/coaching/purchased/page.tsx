// app/coaching/purchased/page.tsx
// Post-checkout success page: polls the purchase endpoint (covers
// Stripe webhook lag) and shows one claim link per seat with copy
// buttons. The buyer distributes the links; each seat holder signs in
// (or creates an account) when claiming.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";

type PurchaseInfo = {
  programTitle: string;
  offerName: string;
  purchaserEmail: string | null;
  seats: { claimToken: string; status: string }[];
};

export default function CoachingPurchasedPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams?.session_id;
  const [info, setInfo] = useState<PurchaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const attempts = useRef(0);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `/api/certification/purchase?session_id=${encodeURIComponent(sessionId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load your purchase.");
      setInfo(json);
      setError(null);
    } catch (e) {
      attempts.current += 1;
      if (attempts.current < 10) {
        setTimeout(load, 2000); // webhook lag — retry up to ~20s
      } else {
        setError(
          e instanceof Error ? e.message : "Could not load your purchase. Refresh to retry."
        );
      }
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(token: string) {
    const url = `${window.location.origin}/coaching/claim/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow p-8">
            {!sessionId ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Missing purchase reference</h1>
                <p className="mt-2 text-gray-600">
                  Open this page from your checkout confirmation, or contact us with your
                  receipt.
                </p>
              </>
            ) : !info && !error ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Finalizing your purchase…</h1>
                <p className="mt-2 text-gray-600">
                  Payment received — preparing your certification seats. This takes a few
                  seconds.
                </p>
              </>
            ) : error ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Almost there</h1>
                <p className="mt-2 text-red-600">{error}</p>
              </>
            ) : info ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">You&apos;re in! 🎉</h1>
                <p className="mt-2 text-gray-700">
                  {info.offerName} — {info.programTitle}
                </p>
                <p className="mt-4 text-gray-600">
                  Below is one private claim link per certification seat.{" "}
                  <span className="font-medium text-gray-900">
                    Send each person their own link
                  </span>{" "}
                  — they&apos;ll sign in (or create a free SkyBall account) to start the course.
                  Taking it yourself? Just open your link.
                </p>

                <ul className="mt-6 space-y-2">
                  {info.seats.map((s, i) => (
                    <li
                      key={s.claimToken}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-gray-500 w-14">
                        Seat {i + 1}
                      </span>
                      <span className="flex-1 truncate font-mono text-xs text-gray-600">
                        /coaching/claim/{s.claimToken.slice(0, 8)}…
                      </span>
                      {s.status === "claimed" ? (
                        <span className="text-xs font-medium text-green-700">Claimed ✓</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => copy(s.claimToken)}>
                          {copied === s.claimToken ? "Copied!" : "Copy link"}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">Save this page&apos;s address</span> — it&apos;s
                    your seat dashboard. A Stripe receipt was emailed to{" "}
                    {info.purchaserEmail ?? "you"}; the receipt link brings you back here
                    anytime.
                  </p>
                </div>

                <div className="mt-6">
                  <Link href="/coaching">
                    <Button variant="outline">Back to Coaching</Button>
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
