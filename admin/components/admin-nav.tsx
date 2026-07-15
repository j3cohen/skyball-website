"use client";

// Responsive admin navigation: fixed sidebar on desktop, top bar + off-canvas
// drawer on mobile. Rendered by the protected layout (server component), which
// passes down the auth email and pending-order count.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AdminSignOut from "@/components/admin-sign-out";

export default function AdminNav({
  email,
  pendingCount,
}: {
  email: string;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between bg-gray-900 pl-4 pr-1">
        <Link href="/fulfillment" className="flex items-center">
          <Brand />
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
              {pendingCount}
            </span>
          )}
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-3 text-gray-300 hover:text-white transition-colors"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── Mobile drawer + backdrop ───────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col
                    transform transition-transform duration-200 md:hidden
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between pl-5 pr-1 py-3 border-b border-gray-800">
          <Brand />
          <button
            onClick={() => setOpen(false)}
            className="p-3 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <NavLinks pendingCount={pendingCount} mobile />
        <Footer email={email} />
      </aside>

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-gray-900 flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <Brand />
        </div>
        <NavLinks pendingCount={pendingCount} />
        <Footer email={email} />
      </aside>
    </>
  );
}

function Brand() {
  return (
    <span>
      <span className="text-lg font-bold text-white tracking-tight">SkyBall</span>
      <span className="ml-1 text-lg font-light text-sky-400">Admin</span>
    </span>
  );
}

function NavLinks({
  pendingCount,
  mobile = false,
}: {
  pendingCount: number;
  mobile?: boolean;
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      <NavLink href="/fulfillment" label="Fulfillment" badge={pendingCount} mobile={mobile} />
      <NavLink href="/revenue" label="Revenue" mobile={mobile} />
      <NavLink href="/sales" label="Sales Data" mobile={mobile} />
    </nav>
  );
}

function NavLink({
  href,
  label,
  badge,
  mobile,
}: {
  href: string;
  label: string;
  badge?: number;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-md px-3 text-sm
                  text-gray-300 hover:bg-gray-800 hover:text-white transition-colors
                  ${mobile ? "py-2.5" : "py-2"}`}
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

function Footer({ email }: { email: string }) {
  return (
    <div className="px-4 py-4 border-t border-gray-800 space-y-2">
      <p className="text-xs text-gray-500 truncate">{email}</p>
      <AdminSignOut />
    </div>
  );
}
