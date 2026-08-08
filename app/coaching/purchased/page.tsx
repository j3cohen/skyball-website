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
  const [mailedState, setMailedState] = useState<"idle" | "opened" | "copied">("idle");
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

  // Opens the buyer's own mail client with the seat links pre-filled — we
  // don't send anything server-side, so nothing leaves the browser.
  function emailLinks() {
    if (!info) return;
    const origin = window.location.origin;
    const lines = info.seats.map(
      (s, i) =>
        `Seat ${i + 1}: ${origin}/coaching/claim/${s.claimToken}` +
        (s.status === "claimed" ? " (already claimed)" : "")
    );
    const subject = `Your SkyBall coaching certification seat links`;
    const body = [
      `${info.offerName} — ${info.programTitle}`,
      "",
      ...lines,
      "",
      "Send each person their own link. They'll sign in (or create a free SkyBall account) to start the course.",
    ].join("\r\n");
    const href = `mailto:${encodeURIComponent(
      info.purchaserEmail ?? ""
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Mail clients silently truncate very long mailto URLs, which would drop
    // seat links. Past that point, fall back to the clipboard.
    if (href.length > 1800) {
      void navigator.clipboard.writeText(lines.join("\n"));
      setMailedState("copied");
      return;
    }
    window.location.href = href;
    setMailedState("opened");
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

                <div className="mt-4">
                  <Button onClick={emailLinks} variant="outline">
                    Email these links to me
                  </Button>
                  {mailedState === "opened" && (
                    <p className="mt-2 text-sm text-gray-500">
                      Opening your email app with the links filled in — just hit send.
                    </p>
                  )}
                  {mailedState === "copied" && (
                    <p className="mt-2 text-sm text-gray-500">
                      Too many links for an email draft — all {info.seats.length} links were
                      copied to your clipboard instead. Paste them somewhere safe.
                    </p>
                  )}
                </div>

                <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">
                      Copy your seat links now, email them to yourself, or bookmark this page.
                    </span>{" "}
                    This page is the only way back to them — the Stripe receipt emailed to{" "}
                    {info.purchaserEmail ?? "you"} confirms payment but doesn&apos;t link back
                    here. Lost them? Email{" "}
                    <a href="mailto:info@skyball.us" className="font-medium underline">
                      info@skyball.us
                    </a>{" "}
                    and we&apos;ll resend your seat links.
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
