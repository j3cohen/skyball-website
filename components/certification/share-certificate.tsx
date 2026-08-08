"use client";

// Share controls for the certificate. It's treated as a digital badge first —
// people send the link far more often than they print it — so copying the
// verification URL is the primary action and print is secondary.

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ShareCertificate({ verifyUrl }: { verifyUrl: string }) {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={copy}>{copied ? "Link copied ✓" : "Copy share link"}</Button>
      <Button variant="outline" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
    </div>
  );
}
