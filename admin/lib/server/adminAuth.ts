// lib/server/adminAuth.ts
// Shared helper: verify a request comes from an authenticated admin user.
// Used in every /api/admin/* route handler.

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import type { Session } from "@supabase/auth-helpers-nextjs";

export async function requireAdminSession(): Promise<Session | null> {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("id", session.user.id)
    .single();

  return data ? session : null;
}
