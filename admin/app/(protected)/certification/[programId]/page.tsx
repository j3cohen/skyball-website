"use client";

// /certification/[programId] — program editor.

import CertProgramEditor from "@/components/cert-program-editor";

export default function CertProgramPage({
  params,
}: {
  params: { programId: string };
}) {
  return <CertProgramEditor programId={params.programId} />;
}
