"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import AdminNavigation from "@/components/admin/admin-navigation"
import Footer from "@/components/footer"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check session (same pattern as registration page)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login?from=/admin")
          return
        }

        setUser(session.user)

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin, full_name")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Profile error:", profileError.message)
          router.push("/permission-denied")
          return
        }

        if (!profile?.is_admin) {
          router.push("/permission-denied")
          return
        }

        setIsAdmin(true)
        setLoading(false)
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/permission-denied")
      }
    }

    checkAdminAccess()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect, so don't render anything
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation user={user} />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">SkyBall Admin Dashboard</h1>
              <p className="text-gray-600">Manage tournaments, registrations, passes, and users</p>
            </div>
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
