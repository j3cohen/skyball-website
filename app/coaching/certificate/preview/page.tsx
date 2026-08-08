// app/coaching/certificate/preview/page.tsx
// A sample certificate — what a coach receives on completion. Used by
// the demo course flow (?demo=1) and handy for showing the design to
// customers. Static route, so it takes precedence over [code].
// Renders the SAME component as a real certificate, watermarked SAMPLE.

import Link from "next/link";
import type { Metadata } from "next";
import CertificateView from "@/components/certification/certificate-view";
import PrintButton from "@/components/certification/print-button";

export const metadata: Metadata = {
  title: "Sample Certificate | SkyBall Coaching",
  robots: { index: false, follow: false },
};

export default function CertificatePreviewPage() {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 24);

  return (
    <main className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/coaching" className="text-sm font-medium text-primary underline">
            ← Back to Coaching
          </Link>
          <PrintButton />
        </div>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 print:hidden">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Sample only.</span> This is what your certificate
            looks like after you complete the course — it is not a real credential and the
            verification code is not valid.
          </p>
        </div>

        <CertificateView
          sample
          fullName="Alex Rivera"
          programTitle="SkyBall Coaching Certification — Level 1"
          issuedAt={issuedAt.toISOString()}
          expiresAt={expiresAt.toISOString()}
          verifyCode="SB-SAMPLE-0000"
        />
      </div>
    </main>
  );
}
