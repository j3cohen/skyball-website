// lib/cert-utils.ts
// Certification admin helpers. (Admin is its own workspace — the root
// app's lib/ is not importable here, so the YouTube helper is
// intentionally duplicated from lib/certification/types.ts.)

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function dollarInputToCents(value: string): number | null {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export type CertEquipmentItem = { label: string; qty: number };

export type CertOffer = {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  seat_count: number;
  equipment_items: CertEquipmentItem[];
  active: boolean;
  position: number;
};

export type CertQuestion = {
  id?: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
};

export type CertSection = {
  id: string;
  program_id: string;
  position: number;
  title: string;
  intro_enabled: boolean;
  intro_title: string | null;
  intro_body: string | null;
  video_url: string | null;
  pass_threshold_type: "percent" | "count" | null;
  pass_threshold_value: number | null;
  retake_cooldown_minutes: number | null;
  cert_questions: (CertQuestion & { id: string })[];
};

export type CertProgram = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  pass_threshold_type: "percent" | "count";
  pass_threshold_value: number;
  retake_cooldown_minutes: number;
  expiry_months: number;
  status: "draft" | "published" | "archived";
};
