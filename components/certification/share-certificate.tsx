"use client";

// Share controls for the certificate. It's treated as a digital badge first —
// people send the link far more often than they print it — so copying and
// emailing the verification URL lead, and print is the fallback.

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ShareCertificate({
  verifyUrl,
  fullName,
  programTitle,
  verifyCode,
}: {
  verifyUrl: string;
  fullName: string;
  programTitle: string;
  verifyCode: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the URL is
      // printed on the certificate itself, so this is a soft failure.
      setCopied(false);
    }
  }

  // No recipient in the mailto, so the compose window opens with an empty
  // To: field — send it to yourself or to anyone who needs to see it.
  const mailto =
    `mailto:?subject=${encodeURIComponent(
      `SkyBall Coaching Certificate — ${fullName}`
    )}` +
    `&body=${encodeURIComponent(
      `${fullName} is a certified SkyBall coach.\n\n` +
        `Program: ${programTitle}\n` +
        `Certificate no.: ${verifyCode}\n\n` +
        `View and verify it here:\n${verifyUrl}\n`
    )}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={copy}>{copied ? "Link copied ✓" : "Copy share link"}</Button>
      <a href={mailto}>
        <Button variant="outline">Email it</Button>
      </a>
      <Button variant="outline" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
    </div>
  );
}
