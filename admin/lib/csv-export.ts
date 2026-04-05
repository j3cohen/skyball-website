// RFC 4180-compliant CSV generation for Pirate Ship bulk label import.

export type CsvOrderRow = {
  customer_name:  string | null | undefined;
  customer_email: string | null | undefined;
  address_line1:  string | null | undefined;
  address_line2:  string | null | undefined;
  city:           string | null | undefined;
  state:          string | null | undefined;
  zip:            string | null | undefined;
  country:        string | null | undefined;
  length:  number;
  width:   number;
  height:  number;
  pounds:  number;
  ounces:  number;
};

const HEADERS = [
  "Name", "Email", "Address 1", "Address 2", "City", "State",
  "Zip", "Country", "Length", "Width", "Height", "Pounds", "Ounces",
];

function esc(val: string | number | null | undefined): string {
  if (val == null || val === "") return "";
  const s = String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvString(rows: CsvOrderRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      esc(r.customer_name),
      esc(r.customer_email),
      esc(r.address_line1),
      esc(r.address_line2),
      esc(r.city),
      esc(r.state),
      esc(r.zip),
      esc(r.country),
      r.length,
      r.width,
      r.height,
      r.pounds,
      r.ounces,
    ].join(","));
  }
  return lines.join("\n");
}

export function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
