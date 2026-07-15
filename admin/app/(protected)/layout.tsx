// app/(protected)/layout.tsx
// Auth guard + nav chrome for all protected admin pages.

import { redirect }                    from "next/navigation";
import { cookies }                     from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin }               from "@/lib/server/supabaseAdmin";
import AdminNav                        from "@/components/admin-nav";

async function getPendingCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("fulfillment_status", "pending");
  return count ?? 0;
}

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify authenticated session.
  // createServerComponentClient handles both the old v0.9 array cookie format
  // and the v0.10 object format, and correctly reassembles chunked cookies.
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login?reason=no-session");
  const user = session.user;

  // 2. Verify admin role (uses service role to bypass RLS)
  const { data: adminRow } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!adminRow) redirect("/login?reason=not-admin");

  const pendingCount = await getPendingCount();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-100">
      <AdminNav email={user.email ?? ""} pendingCount={pendingCount} />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
