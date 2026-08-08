"use client";

// Saved regions — named groups of countries, e.g. "EMEA" or "Nordics".
//
// Stored in localStorage for now: no backend involved, so definitions live on
// the machine that made them. The dashboard filters by the *countries* a region
// resolves to, never by its id, so the server never needs to know these exist.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "skyball_admin_regions_v1";

export type SavedRegion = {
  id: string;
  name: string;
  /** ISO-3166 alpha-2 codes, uppercase. */
  countries: string[];
};

/** Country display names, shared by every card that renders a country. */
export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom", IE: "Ireland",
  AU: "Australia", NZ: "New Zealand", DE: "Germany", FR: "France",
  ES: "Spain", IT: "Italy", NL: "Netherlands", BE: "Belgium",
  CH: "Switzerland", AT: "Austria", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", PL: "Poland", PT: "Portugal",
  CZ: "Czechia", SK: "Slovakia", HU: "Hungary", RO: "Romania",
  GR: "Greece", TR: "Turkey", IL: "Israel", AE: "United Arab Emirates",
  SA: "Saudi Arabia", KW: "Kuwait", QA: "Qatar", ZA: "South Africa",
  JP: "Japan", KR: "South Korea", CN: "China", HK: "Hong Kong",
  TW: "Taiwan", SG: "Singapore", MY: "Malaysia", TH: "Thailand",
  PH: "Philippines", ID: "Indonesia", VN: "Vietnam", IN: "India",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile",
  CO: "Colombia", PE: "Peru", CR: "Costa Rica", PA: "Panama",
};

/** "US" → "United States"; the no-address bucket stays readable. */
export function countryLabel(code: string): string {
  if (!code || code.toUpperCase() === "UNKNOWN") return "Unknown / no address";
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

// ── Filter encoding ────────────────────────────────────────────────────────
//
// A saved region reaches the API as an explicit country list, so the server
// resolves exactly what the UI showed even though it has never seen the region.

export const COUNTRIES_PREFIX = "countries:";

export function encodeRegion(countries: string[]): string {
  return COUNTRIES_PREFIX + countries.map((c) => c.toUpperCase()).join(",");
}

export function decodeRegion(value: string): string[] | null {
  if (!value.startsWith(COUNTRIES_PREFIX)) return null;
  return value.slice(COUNTRIES_PREFIX.length).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
}

// ── Storage ────────────────────────────────────────────────────────────────

function read(): SavedRegion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SavedRegion =>
        r && typeof r.id === "string" && typeof r.name === "string" && Array.isArray(r.countries)
    );
  } catch {
    return [];
  }
}

function write(regions: SavedRegion[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
    // Same-tab listeners: the native `storage` event only fires cross-tab.
    window.dispatchEvent(new Event("skyball-regions-changed"));
  } catch {
    /* quota or private mode — the UI keeps working, it just won't persist */
  }
}

function newId(): string {
  return `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** Saved regions plus CRUD, kept in sync across every component on the page. */
export function useRegions() {
  const [regions, setRegions] = useState<SavedRegion[]>([]);

  useEffect(() => {
    setRegions(read());
    const sync = () => setRegions(read());
    window.addEventListener("skyball-regions-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("skyball-regions-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((region: Omit<SavedRegion, "id"> & { id?: string }) => {
    const current = read();
    const id = region.id ?? newId();
    const next = region.id && current.some((r) => r.id === region.id)
      ? current.map((r) => (r.id === region.id ? { ...r, ...region, id } : r))
      : [...current, { ...region, id }];
    write(next);
    setRegions(next);
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((r) => r.id !== id);
    write(next);
    setRegions(next);
  }, []);

  return { regions, save, remove };
}
