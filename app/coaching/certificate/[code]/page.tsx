// app/coaching/certificate/[code]/page.tsx
// The holder's certificate page. Reachable by certificate code (the code is
// the credential — it only appears on the holder's results screen and
// certificate). Treated as a digital badge: the primary action is sharing the
// link, which anyone can then verify at /coaching/verify/<code>.
//
// The certificate artwork lives in components/certification/
// certificate-view.tsx, shared with /coaching/certificate/preview.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import CertificateView from "@/components/certification/certificate-view";
import ShareCertificate from "@/components/certification/share-certificate";

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link href="/coaching/course" className="text-sm font-medium text-primary underline">
            ← Back to course
          </Link>
          <ShareCertificate
            verifyUrl={`${SITE_URL}/coaching/verify/${cert.verify_code}`}
          />
        </div>

        <CertificateView
          fullName={cert.full_name}
          programTitle={program?.title ?? "SkyBall Coaching Certification"}
          issuedAt={cert.issued_at}
          expiresAt={cert.expires_at}
          verifyCode={cert.verify_code}
        />

        <p className="mt-6 text-center text-sm text-gray-500 print:hidden">
          Share the link and anyone can confirm it&apos;s genuine — no account needed. The QR
          code goes to the same verification page.
        </p>
      </div>
    </main>
  );
}
