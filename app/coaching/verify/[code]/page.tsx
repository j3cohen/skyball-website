// app/coaching/verify/[code]/page.tsx
// Public certificate verification: anyone with the code on a
// certificate can confirm it's genuine, active, and unexpired.

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify Certificate | SkyBall",
  robots: { index: false, follow: false },
};

export default async function VerifyCertificatePage({
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

  let programTitle: string | null = null;
  if (cert) {
    const { data: program } = await supabaseAdmin
      .from("cert_programs")
      .select("title")
      .eq("id", cert.program_id)
      .single<{ title: string }>();
    programTitle = program?.title ?? null;
  }

  const expired = cert ? new Date(cert.expires_at).getTime() < Date.now() : false;
  const revoked = cert?.status === "revoked";
  const valid = !!cert && !expired && !revoked;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-white rounded-xl shadow p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Certificate verification
            </p>

            {!cert ? (
              <>
                <h1 className="mt-2 text-2xl font-bold text-red-700">Not found</h1>
                <p className="mt-3 text-gray-700">
                  No certificate matches the code{" "}
                  <span className="font-mono">{params.code}</span>. Check the code on the
                  certificate and try again.
                </p>
              </>
            ) : (
              <>
                <h1
                  className={`mt-2 text-2xl font-bold ${
                    valid ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {valid ? "Valid certificate ✓" : revoked ? "Revoked" : "Expired"}
                </h1>
                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Certified coach</dt>
                    <dd className="font-semibold text-gray-900 text-lg">{cert.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Program</dt>
                    <dd className="font-medium text-gray-900">
                      {programTitle ?? "SkyBall Certification"}
                    </dd>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <dt className="text-gray-500">Certified</dt>
                      <dd className="font-medium text-gray-900">{fmt(cert.issued_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">
                        {expired ? "Expired" : "Valid through"}
                      </dt>
                      <dd className={`font-medium ${expired ? "text-red-700" : "text-gray-900"}`}>
                        {fmt(cert.expires_at)}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-gray-500">Certificate no.</dt>
                    <dd className="font-mono text-gray-900">{cert.verify_code}</dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
