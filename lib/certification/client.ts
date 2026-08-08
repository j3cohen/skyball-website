// lib/certification/client.ts
"use client";

// Bearer-token fetch for the certification learner APIs. Main-site
// sessions live in localStorage (mobile-project auth), so API routes
// authenticate via the Authorization header rather than cookies.

import { supabase } from "@/lib/supabaseClient";

export class CertApiError extends Error {
  status: number;
  retryAt: string | null;
  constructor(message: string, status: number, retryAt: string | null = null) {
    super(message);
    this.status = status;
    this.retryAt = retryAt;
  }
}

/** Current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function certFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown }
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new CertApiError("Sign in to continue.", 401);

  const { body, headers, ...rest } = init ?? {};
  const requestInit: RequestInit = {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...((headers as Record<string, string>) ?? {}),
    },
  };
  if (body !== undefined) requestInit.body = JSON.stringify(body);

  const res = await fetch(path, requestInit);

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    retryAt?: string;
  } & T;
  if (!res.ok) {
    throw new CertApiError(
      json.error ?? "Something went wrong. Please try again.",
      res.status,
      json.retryAt ?? null
    );
  }
  return json;
}
