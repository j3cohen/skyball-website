// lib/product-bom.ts
//
// Single source of truth for "what base units does this line item actually
// contain?" — the bill of materials (BOM) behind every SKU we sell.
//
// Selling one "Partners Pack – Pro" ships 4 Pro rackets and a 3-pack of balls.
// This module is what lets analytics and fulfillment agree on that fact.
// Consumers: the units-sold report, box-size classification, and the
// fulfillment cheat sheet.
//
// Deliberately colour-agnostic: it reports *how many* 3-packs a line contains,
// never which colour. The cheat sheet layers colour on top from customizations.

import type { OrderDataItem } from "./order-types";

// ── Components ─────────────────────────────────────────────────────────────

export type ComponentId =
  | "racket_pro"
  | "racket_starter"
  | "racket_original"
  | "net"
  | "ball"
  | "grip"
  | "racket_cover"
  | "crewneck";

/** Display order for the units report and any inventory listing. */
export const COMPONENT_ORDER: ComponentId[] = [
  "racket_pro",
  "racket_starter",
  "racket_original",
  "net",
  "ball",
  "grip",
  "racket_cover",
  "crewneck",
];

export const COMPONENT_LABELS: Record<ComponentId, string> = {
  racket_pro:      "Racket – Pro",
  racket_starter:  "Racket – Starter",
  racket_original: "Racket – Original",
  net:             "Net",
  ball:            "Balls",
  grip:            "Over Grip",
  racket_cover:    "Racket Cover",
  crewneck:        "Crewneck",
};

export const RACKET_COMPONENTS: ComponentId[] = [
  "racket_pro",
  "racket_starter",
  "racket_original",
];

/** Ball pack sizes we stock. Used for "which tubes did these balls come from?" */
export type BallPackSize = 3 | 8 | 12 | 30 | 50;
export const BALL_PACK_SIZES: BallPackSize[] = [3, 8, 12, 30, 50];

export type Bom = {
  /** Component counts for ONE unit of the SKU. */
  components: Partial<Record<ComponentId, number>>;
  /** Ball-pack provenance for ONE unit of the SKU, when known. */
  ballPacks?: Partial<Record<BallPackSize, number>>;
};

export type BomSource =
  | "catalog"    // matched a known slug or product-name pattern
  | "override"   // hand-entered in BOM_OVERRIDES
  | "inferred"   // counts parsed out of a free-text product name
  | "non_goods"  // fees, entry fees — intentionally contributes nothing
  | "unmapped";  // we genuinely don't know; surfaced in the UI

export type BomResolution = { bom: Bom; source: BomSource };

const EMPTY_BOM: Bom = { components: {} };

// ── Non-goods ──────────────────────────────────────────────────────────────
// Line items that are never physical product. These contribute nothing and are
// NOT flagged as unmapped, because there is nothing to map.

const NON_GOODS = [
  /^delivery fee$/,
  /^shipping cost$/,
  /^payment link$/,
  /entry fee/,
  /open.?play/,
];

// ── Manual overrides ───────────────────────────────────────────────────────
//
// Exact product-name matches (lowercased, trimmed) for one-off custom and
// international orders whose names state no counts. Anything not listed here
// and not otherwise resolvable lands in the "Unmapped" bucket in the units
// report — visible, never silently dropped.
//
// To add one, copy the name exactly as it appears in the Unmapped list:
//
//   "canada pack": { components: { racket_original: 4, ball: 12 } },
//
// Known-unmapped names in the order history as of Aug 2026, pending real
// figures — add them above as they're confirmed:
//   canada pack · courtx demo kit · cleveland racquet club pack ·
//   repasky purchase · custom order · custom india pack · skyball india pack ·
//   custom club kit · demo skyball kit · skyball custom kit · skyball au pack ·
//   hk association trial · pickl social club kit ·
//   skyball partner starter international
export const BOM_OVERRIDES: Record<string, Bom> = {};

// ── Catalog: slug → BOM ────────────────────────────────────────────────────
// Slugs come straight from the Supabase `products` table, so these are exact.
// Orders imported from Stripe often carry no slug, which is what the
// name-pattern rules below are for.

const SLUG_BOM: Record<string, Bom> = {
  // Bundles
  "skyball-essentials-pro":     { components: { racket_pro: 2,     ball: 3 }, ballPacks: { 3: 1 } },
  "skyball-essentials-starter": { components: { racket_starter: 2, ball: 3 }, ballPacks: { 3: 1 } },
  "partners-pack-pro":          { components: { racket_pro: 4,     ball: 3 }, ballPacks: { 3: 1 } },
  "partners-pack-starter":      { components: { racket_starter: 4, ball: 3 }, ballPacks: { 3: 1 } },
  "anywhere-kit-pro":           { components: { racket_pro: 4,     ball: 6, net: 1 }, ballPacks: { 3: 2 } },
  "anywhere-kit-starter":       { components: { racket_starter: 4, ball: 6, net: 1 }, ballPacks: { 3: 2 } },

  // Rackets. `skyball-racket` is the standard two-piece aluminium frame — the
  // same racket that ships inside the Starter kits.
  "skyball-racket-pro": { components: { racket_pro: 1 } },
  "skyball-racket":     { components: { racket_starter: 1 } },

  // Balls
  "skyball-3-pack":  { components: { ball: 3 },  ballPacks: { 3: 1 } },
  "skyball-12-pack": { components: { ball: 12 }, ballPacks: { 12: 1 } },
  "skyball-50-pack": { components: { ball: 50 }, ballPacks: { 50: 1 } },

  // Accessories
  "skyball-net":                             { components: { net: 1 } },
  "skyball-crewneck-1":                      { components: { crewneck: 1 } },
  "professional-over-grip-skyball":          { components: { grip: 1 } },
  "professional-over-grips-skyball-2-pack":  { components: { grip: 2 } },
  "professional-over-grips-skyball-4-pack":  { components: { grip: 4 } },
  "skyball-overgrip-white":                  { components: { grip: 1 } },
  "skyball-overgrip-blue":                   { components: { grip: 1 } },
  "skyball-overgrip-orange":                 { components: { grip: 1 } },
  "skyball-overgrip-pink":                   { components: { grip: 1 } },
  "skyball-overgrip-yellow":                 { components: { grip: 1 } },
  "skyball-racket-bag":                      { components: { racket_cover: 1 } },
  "skyball-racket-bag-x2":                   { components: { racket_cover: 2 } },
  "skyball-racket-bag-x4":                   { components: { racket_cover: 4 } },
};

// ── Generation detection ───────────────────────────────────────────────────

/**
 * Which racket generation a name refers to. Names predating the Pro/Starter
 * split say neither, and get their own bucket so historical totals stay honest
 * rather than being folded into a generation that didn't exist yet.
 *
 * `\bpro\b` deliberately does not match "Professional Over Grips".
 */
function racketComponent(low: string): ComponentId {
  if (/\bpro\b/.test(low))  return "racket_pro";
  if (/starter/.test(low))  return "racket_starter";
  return "racket_original";
}

/** Pack size from "(Set of 4)", "(4 Pack)" or a trailing "x4". Defaults to 1. */
function packCount(low: string): number {
  const m =
    low.match(/\(set of (\d+)\)/) ??
    low.match(/\((\d+)\s*pack\)/) ??
    low.match(/[\s-]x(\d+)\b/);
  return m ? Number(m[1]) : 1;
}

// ── Catalog: name patterns ─────────────────────────────────────────────────

/**
 * Resolve a BOM from a free-text product name. Order matters — accessories are
 * checked before the kit and racket rules so that "Racket Cover (Set of 4)"
 * and "Professional Over Grips – SkyBall" don't get read as rackets or balls.
 */
function bomFromName(low: string): Bom | null {
  // Accessories first
  if (/racket cover|racket bag/.test(low)) {
    return { components: { racket_cover: packCount(low) } };
  }
  if (/grip/.test(low)) {
    return { components: { grip: packCount(low) } };
  }
  if (/crewneck/.test(low)) {
    return { components: { crewneck: 1 } };
  }

  // Bundles
  const racket = racketComponent(low);
  if (/anywhere/.test(low)) {
    return { components: { [racket]: 4, ball: 6, net: 1 }, ballPacks: { 3: 2 } };
  }
  if (/partners?[\s-]?pack/.test(low)) {
    return { components: { [racket]: 4, ball: 3 }, ballPacks: { 3: 1 } };
  }
  if (/essentials/.test(low)) {
    return { components: { [racket]: 2, ball: 3 }, ballPacks: { 3: 1 } };
  }

  // Standalone net (kits are already handled above)
  if (/\bnet\b/.test(low)) {
    return { components: { net: 1 } };
  }

  // Individual rackets. Only "racket" — "racquet" is a different spelling that
  // in practice only shows up in club names, not product descriptions.
  if (/racket/.test(low)) {
    return { components: { [racket]: 1 } };
  }

  // Ball packs: "3-Pack", "12 Pack", "24-Pack". Only reached after the grip and
  // cover rules, so "(4 Pack)" grips can't land here.
  const pack = low.match(/(\d+)[\s-]?pack/);
  if (pack) {
    const n = Number(pack[1]);
    const bom: Bom = { components: { ball: n } };
    if ((BALL_PACK_SIZES as number[]).includes(n)) {
      bom.ballPacks = { [n as BallPackSize]: 1 };
    }
    return bom;
  }

  return null;
}

// ── Free-text inference ────────────────────────────────────────────────────
//
// Custom and international orders are hand-typed in Stripe and usually spell
// out what's inside: "Pro Pack Int -- 4 rackets 12 balls". Parsing those counts
// beats dropping the line entirely, and every hit is flagged `inferred` so the
// guesses stay auditable in the UI.

const RACKET_RE = /(\d+)[\s-]*(?:(?:sky\s*ball|pro|starter|official|premium)[\s-]+)*rackets?\b/i;

// The negative lookahead stops "4 SkyBall Rackets & 16 SkyBalls" from reading
// "4 SkyBall" as four balls — it backtracks and finds "16 SkyBalls" instead.
const BALL_RE = /(\d+)[\s-]*(?:(?:official|pro|starter)[\s-]+)*(?:sky\s*)?balls?\b(?![\s-]*rackets?)/i;

type Inferred = { rackets?: number; balls?: number };

function inferFromName(low: string): Inferred | null {
  const r = low.match(RACKET_RE);
  const b = low.match(BALL_RE);
  if (!r && !b) return null;
  const out: Inferred = {};
  if (r) out.rackets = Number(r[1]);
  if (b) out.balls   = Number(b[1]);
  return out;
}

/**
 * Layer inferred counts over a pattern-derived BOM. Explicit counts in the name
 * are stronger evidence than a fuzzy substring match, so they win — but only
 * for the components they actually mention.
 *
 * "Int Partner Pack -- Starter Rackets + 12 Balls" matches the Partners Pack
 * pattern (4 starter rackets, one 3-pack) and states 12 balls, so it resolves
 * to 4 starter rackets + 12 loose balls.
 */
function mergeInferred(base: Bom | null, inf: Inferred, low: string): Bom {
  const components: Partial<Record<ComponentId, number>> = { ...(base?.components ?? {}) };
  let ballPacks = base?.ballPacks;

  if (inf.rackets != null) {
    for (const id of RACKET_COMPONENTS) delete components[id];
    components[racketComponent(low)] = inf.rackets;
  }
  if (inf.balls != null) {
    components.ball = inf.balls;
    // The stated total supersedes the pattern's pack provenance, and a
    // free-text name never tells us which tubes it was packed from.
    ballPacks = undefined;
  }

  return ballPacks ? { components, ballPacks } : { components };
}

// ── Resolution ─────────────────────────────────────────────────────────────

/**
 * Resolve one order line item to its BOM (per single unit — callers multiply by
 * quantity themselves).
 *
 * Order: non-goods → manual override → catalog slug → free-text inference
 * layered over name patterns → unmapped.
 */
export function resolveBom(item: OrderDataItem): BomResolution {
  const name = (item.product_name ?? item.slug ?? "").trim();
  const low  = name.toLowerCase();
  const slug = (item.slug ?? "").trim().toLowerCase();

  if (!low) return { bom: EMPTY_BOM, source: "unmapped" };

  if (NON_GOODS.some((re) => re.test(low))) {
    return { bom: EMPTY_BOM, source: "non_goods" };
  }

  const override = BOM_OVERRIDES[low];
  if (override) return { bom: override, source: "override" };

  const bySlug = SLUG_BOM[slug];
  if (bySlug) return { bom: bySlug, source: "catalog" };

  const byName = bomFromName(low);
  const inf    = inferFromName(low);

  if (inf) return { bom: mergeInferred(byName, inf, low), source: "inferred" };
  if (byName) return { bom: byName, source: "catalog" };

  return { bom: EMPTY_BOM, source: "unmapped" };
}

// ── Aggregation ────────────────────────────────────────────────────────────

export type ExplodedTotals = {
  components: Record<ComponentId, number>;
  ballPacks:  Record<BallPackSize, number>;
  /** Line items we could not decompose, so the UI can surface them. */
  unmapped:   { name: string; units: number }[];
  /** Line items decomposed by parsing their name — shown for auditability. */
  inferred:   { name: string; units: number; bom: Bom }[];
};

export function emptyComponents(): Record<ComponentId, number> {
  return Object.fromEntries(COMPONENT_ORDER.map((c) => [c, 0])) as Record<ComponentId, number>;
}

export function emptyBallPacks(): Record<BallPackSize, number> {
  return Object.fromEntries(BALL_PACK_SIZES.map((s) => [s, 0])) as Record<BallPackSize, number>;
}

/** Explode a set of line items into total base units. */
export function explodeItems(items: OrderDataItem[]): ExplodedTotals {
  const components = emptyComponents();
  const ballPacks  = emptyBallPacks();
  const unmappedMap = new Map<string, number>();
  const inferredMap = new Map<string, { units: number; bom: Bom }>();

  for (const item of items) {
    const qty  = item.quantity ?? 1;
    const name = (item.product_name ?? item.slug ?? "Unknown").trim();
    const { bom, source } = resolveBom(item);

    if (source === "unmapped") {
      unmappedMap.set(name, (unmappedMap.get(name) ?? 0) + qty);
      continue;
    }
    if (source === "non_goods") continue;

    if (source === "inferred") {
      const cur = inferredMap.get(name);
      inferredMap.set(name, { units: (cur?.units ?? 0) + qty, bom });
    }

    for (const [id, n] of Object.entries(bom.components)) {
      components[id as ComponentId] += (n ?? 0) * qty;
    }
    for (const [size, n] of Object.entries(bom.ballPacks ?? {})) {
      ballPacks[Number(size) as BallPackSize] += (n ?? 0) * qty;
    }
  }

  return {
    components,
    ballPacks,
    unmapped: [...unmappedMap.entries()]
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units),
    inferred: [...inferredMap.entries()]
      .map(([name, v]) => ({ name, units: v.units, bom: v.bom }))
      .sort((a, b) => b.units - a.units),
  };
}

// ── Convenience for box sizing ─────────────────────────────────────────────

/** Total rackets and balls in one line item, quantity included. */
export function itemUnitCounts(item: OrderDataItem): {
  rackets: number;
  balls: number;
  nets: number;
} {
  const qty = item.quantity ?? 1;
  const { bom } = resolveBom(item);
  const rackets = RACKET_COMPONENTS.reduce((s, id) => s + (bom.components[id] ?? 0), 0);
  return {
    rackets: rackets * qty,
    balls:   (bom.components.ball ?? 0) * qty,
    nets:    (bom.components.net  ?? 0) * qty,
  };
}
