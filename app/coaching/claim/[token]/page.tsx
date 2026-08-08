// app/coaching/claim/[token]/page.tsx
// Seat-claim page. Signed out → sign-in/sign-up CTA that returns here.
// Signed in → confirm & claim, then straight into the course.

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { certFetch, CertApiError } from "@/lib/certification/client";

export default function CoachingClaimPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  async function claim() {
    if (!token) return;
    setClaiming(true);
    setError(null);
    try {
      await certFetch("/api/certification/claim", { method: "POST", body: { token } });
      router.push("/coaching/course");
    } catch (e) {
      if (e instanceof CertApiError && e.status === 409 && /already have access/i.test(e.message)) {
        setAlreadyEnrolled(true);
      } else {
        setError(e instanceof Error ? e.message : "Could not claim this seat.");
      }
      setClaiming(false);
    }
  }

  const loginHref = token
    ? `/login?from=${encodeURIComponent(`/coaching/claim/${token}`)}`
    : "/login";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-white rounded-xl shadow p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              SkyBall Coaching Certification
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Claim your seat</h1>

            {signedIn === null ? (
              <p className="mt-4 text-gray-600">Checking your session…</p>
            ) : !signedIn ? (
              <>
                <p className="mt-4 text-gray-700">
                  Your certification is tied to your SkyBall account, so sign in — or create a
                  free account — to claim this seat.
                </p>
                <div className="mt-6">
                  <Link href={loginHref}>
                    <Button size="lg">Sign in / Create account</Button>
                  </Link>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  You&apos;ll come right back here after signing in.
                </p>
              </>
            ) : alreadyEnrolled ? (
              <>
                <p className="mt-4 text-gray-700">
                  You already have access to this course — this seat link stays available for
                  someone else.
                </p>
                <div className="mt-6">
                  <Link href="/coaching/course">
                    <Button size="lg">Go to my course</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-gray-700">
                  Claiming this seat starts your certification course under your account. Each
                  seat can only be used once.
                </p>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-6 flex gap-3">
                  <Button size="lg" onClick={claim} disabled={claiming || !token}>
                    {claiming ? "Claiming…" : "Claim seat & start course"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
