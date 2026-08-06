// components/certification/certificate-view.tsx
// The printable certificate itself. Shared by the real certificate page
// (/coaching/certificate/[code]) and the sample preview
// (/coaching/certificate/preview) so the two can never drift.

import { SITE_URL } from "@/lib/seo";

export type CertificateViewProps = {
  fullName: string;
  programTitle: string;
  issuedAt: string;
  expiresAt: string;
  verifyCode: string;
  /** Watermarks the certificate as a non-issued sample. */
  sample?: boolean;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CertificateView({
  fullName,
  programTitle,
  issuedAt,
  expiresAt,
  verifyCode,
  sample = false,
}: CertificateViewProps) {
  return (
    <div className="bg-white p-2 shadow-xl print:shadow-none">
      <div className="relative border-4 border-gray-900 p-1">
        {sample && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="rotate-[-24deg] text-[5rem] md:text-[7rem] font-black uppercase tracking-widest text-gray-900/10">
              Sample
            </span>
          </div>
        )}
        <div className="border border-gray-400 px-8 py-12 text-center md:px-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
            SkyBall™
          </p>
          <h1 className="mt-4 text-3xl font-bold uppercase tracking-wide text-gray-900 md:text-4xl">
            Certificate of Completion
          </h1>
          <p className="mt-8 text-sm uppercase tracking-wide text-gray-500">
            This certifies that
          </p>
          <p className="mt-3 font-serif text-4xl text-gray-900 md:text-5xl">{fullName}</p>
          <p className="mx-auto mt-8 max-w-md text-gray-700">
            has successfully completed all requirements of the
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{programTitle}</p>

          <div className="mx-auto mt-10 flex max-w-md items-center justify-between text-sm text-gray-600">
            <div className="text-left">
              <p className="font-semibold text-gray-900">{fmt(issuedAt)}</p>
              <p className="mt-0.5 border-t border-gray-400 pt-1">Date certified</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{fmt(expiresAt)}</p>
              <p className="mt-0.5 border-t border-gray-400 pt-1">Valid through</p>
            </div>
          </div>

          <div className="mt-10 text-xs text-gray-500">
            <p>
              Certificate no. <span className="font-mono">{verifyCode}</span>
            </p>
            <p className="mt-1">
              Verify at{" "}
              <span className="font-mono">
                {SITE_URL}/coaching/verify/{verifyCode}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
