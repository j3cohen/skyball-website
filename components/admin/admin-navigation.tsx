"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

interface AdminNavigationProps {
  user: any
}

export default function AdminNavigation({ user }: AdminNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
      ? "border-indigo-500 text-gray-900 bg-indigo-50"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
  }

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/tournaments", label: "Tournaments" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/matches", label: "Matches" },
    { href: "/admin/match-sets", label: "Match Sets" },
    { href: "/admin/points", label: "Points" },
    { href: "/admin/registrations", label: "Registrations" },
    { href: "/admin/passes", label: "Passes" },
    { href: "/admin/profiles", label: "Profiles" },
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              SkyBall
            </Link>

            <div className="hidden lg:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${isActive(item.href)} whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm rounded-t-md`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-3">
          <div className="grid grid-cols-3 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${isActive(item.href)} text-center py-2 px-2 text-xs font-medium rounded`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
