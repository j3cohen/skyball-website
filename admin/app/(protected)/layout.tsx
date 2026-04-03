// app/(protected)/layout.tsx
// Auth guard + sidebar chrome for all protected admin pages.

import { redirect } from "next/navigation";
import { cookies }  from "next/headers";
import Link         from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import AdminSignOut from "@/components/admin-sign-out";

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
  // 1. Verify authenticated session
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  // 2. Verify admin role (uses service role to bypass RLS)
  const { data: adminRow } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("id", session.user.id)
    .single();

  if (!adminRow) redirect("/login");

  const pendingCount = await getPendingCount();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-gray-900 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <span className="text-lg font-bold text-white tracking-tight">SkyBall</span>
          <span className="ml-1 text-lg font-light text-sky-400">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/fulfillment" label="Fulfillment" badge={pendingCount} />
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
          <AdminSignOut />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm
                 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
