// components/certification/certificate-view.tsx
// The certificate itself — designed as a digital badge: a dark, screenshot-
// friendly card people share, with a QR to the public verification page.
// Shared by the real certificate page (/coaching/certificate/[code]) and the
// sample preview (/coaching/certificate/preview) so the two can never drift.
//
// Palette is sampled from the logo JPG, which has its navy field baked in —
// matching BRAND_NAVY exactly is what lets the logo sit on the card with no
// visible seam. Don't drift these values from the artwork.

import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

const BRAND_NAVY = "#02004A";
const BRAND_CYAN = "#27C3F2";
const LOGO_URL =
  "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/SkyBall+logo_B.jpg";

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

/**
 * Shrink the name a step at a time so long ones stay on one line. Real names
 * run past 40 characters (double-barrelled surnames, full middle names), and
 * a fixed size either overflows or forces an ugly mid-word break.
 */
function nameSizeClass(name: string) {
  if (name.length > 40) return "text-xl sm:text-2xl md:text-3xl";
  if (name.length > 30) return "text-2xl sm:text-3xl md:text-4xl";
  if (name.length > 22) return "text-3xl sm:text-4xl md:text-5xl";
  return "text-4xl sm:text-5xl md:text-6xl";
}

export default async function CertificateView({
  fullName,
  programTitle,
  issuedAt,
  expiresAt,
  verifyCode,
  sample = false,
}: CertificateViewProps) {
  const verifyUrl = `${SITE_URL}/coaching/verify/${verifyCode}`;

  // Rendered server-side into inline SVG: no extra request, no client JS, and
  // it survives being screenshotted or saved with the page.
  const qrSvg = await QRCode.toString(verifyUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: BRAND_NAVY, light: "#FFFFFF" },
  });

  return (
    <div
      // cert-card: print rules hook — see certificate-print-styles.tsx. The
      // printed version deliberately keeps the rounded card and its colours so
      // the PDF matches what's on screen.
      className="cert-card relative w-full overflow-hidden rounded-2xl shadow-2xl print:shadow-none"
      style={{
        backgroundColor: BRAND_NAVY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Cyan edge + soft glow: reads as "credential" without gold-foil cliché */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: `linear-gradient(90deg, ${BRAND_CYAN}, #FFFFFF, ${BRAND_CYAN})` }}
      />
      {/* Glows stay in the lower corners on purpose: the logo is a JPG with a
          flat #02004A field baked in, so anything that lightens the canvas
          behind it makes a visible rectangle. Keep the top of the card flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: BRAND_CYAN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: BRAND_CYAN }}
      />

      {sample && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="rotate-[-24deg] text-[5rem] font-black uppercase tracking-widest text-white/10 md:text-[9rem]">
            Sample
          </span>
        </div>
      )}

      <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10 md:px-14">
        {/* Logo — the JPG's navy field matches the card, so no seam shows.
            The file carries generous internal padding, so -my trims it back. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="SkyBall"
          className="mx-auto -my-3 h-20 w-auto sm:h-24 md:h-28"
        />

        <p
          className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.35em] sm:text-xs"
          style={{ color: BRAND_CYAN }}
        >
          Certified Coach
        </p>

        <div className="mt-7 text-center sm:mt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            This certifies that
          </p>
          {/* Full content width, not max-w-2xl — long names need the room */}
          <p
            className={`mt-2.5 break-words font-bold leading-tight text-white [text-wrap:balance] ${nameSizeClass(
              fullName
            )}`}
          >
            {fullName}
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/60">
            has completed all requirements of the
          </p>
          <p className="mx-auto mt-1.5 max-w-2xl text-lg font-semibold text-white [text-wrap:balance] sm:text-xl">
            {programTitle}
          </p>
        </div>

        {/* Details + QR */}
        <div className="mt-8 flex flex-col-reverse items-center gap-6 border-t border-white/10 pt-6 sm:mt-9 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <dl className="flex flex-wrap justify-center gap-x-9 gap-y-4 text-center sm:flex-nowrap sm:justify-start sm:text-left">
            <div>
              <dt className="whitespace-nowrap text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                Date certified
              </dt>
              <dd className="mt-1 whitespace-nowrap text-sm font-semibold text-white">
                {fmt(issuedAt)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                Valid through
              </dt>
              <dd className="mt-1 whitespace-nowrap text-sm font-semibold text-white">
                {fmt(expiresAt)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                Certificate no.
              </dt>
              <dd
                className="mt-1 whitespace-nowrap font-mono text-sm font-semibold"
                style={{ color: BRAND_CYAN }}
              >
                {verifyCode}
              </dd>
            </div>
          </dl>

          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div
              className="rounded-lg bg-white p-2 [&>svg]:block [&>svg]:h-[4.25rem] [&>svg]:w-[4.25rem]"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
              Scan to verify
            </p>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[0.65rem] text-white/30">
          {verifyUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}
