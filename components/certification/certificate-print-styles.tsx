// components/certification/certificate-print-styles.tsx
// Print rules scoped to the certificate pages by being rendered only there —
// @page is a global at-rule, so putting it in globals.css would force every
// printable page on the site to landscape.
//
// The certificate is a dark card, and browsers drop background colours when
// printing unless print-color-adjust says otherwise — without this the PDF
// comes out as white text on white paper.

export default function CertificatePrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@page { size: letter landscape; margin: 0.4in; }
@media print {
  html, body { background: #fff; }
  .cert-card {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    break-inside: avoid;
  }
}
`,
      }}
    />
  );
}
