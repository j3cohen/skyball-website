// app/coaching/certificate/[code]/page.tsx
// Print-friendly certificate page. Reachable by certificate code (the
// code is the credential — it only appears on the holder's results
// screen and certificate). Print → browser's Save as PDF covers the
// "save/mail" cases; the verify URL printed on the certificate lets
// anyone confirm validity.
//
// The certificate artwork lives in components/certification/
// certificate-view.tsx, shared with /coaching/certificate/preview.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import CertificateView from "@/components/certification/certificate-view";
import PrintButton from "@/components/certification/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SkyBall Coaching Certificate",
  robots: { index: false, follow: false },
};

export default async function CertificatePage({
  params,
}: {
  params: { code: string };
}) {
  const { data: cert } = await supabaseAdmin
    .from("cert_certifications")
    .select("verify_code, program_id, full_name, issued_at, expires_at, status")
    .eq("verify_code", params.code)
    .maybeSingle<{
      verify_code: string;
      program_id: string;
      full_name: string;
      issued_at: string;
      expires_at: string;
      status: string;
    }>();

  if (!cert || cert.status !== "active") notFound();

  const { data: program } = await supabaseAdmin
    .from("cert_programs")
    .select("title")
    .eq("id", cert.program_id)
    .single<{ title: string }>();

  return (
    <main className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        {/* Screen-only controls */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href="/coaching/course" className="text-sm font-medium text-primary underline">
            ← Back to course
          </Link>
          <PrintButton />
        </div>

        <CertificateView
          fullName={cert.full_name}
          programTitle={program?.title ?? "SkyBall Coaching Certification"}
          issuedAt={cert.issued_at}
          expiresAt={cert.expires_at}
          verifyCode={cert.verify_code}
        />

        <p className="mt-6 text-center text-sm text-gray-500 print:hidden">
          Tip: use your browser&apos;s print dialog and choose &ldquo;Save as PDF&rdquo; to keep
          a digital copy, or email the PDF to anyone who needs it.
        </p>
      </div>
    </main>
  );
}
