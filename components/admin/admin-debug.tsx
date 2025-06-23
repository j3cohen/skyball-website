"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("🔍 AdminDebug: Starting auth check...")

        // Check session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("📋 AdminDebug: Session result:", { session: !!session, error: sessionError })

        let profileData = null
        let profileError = null
        let allProfiles = null
        let allProfilesError = null

        if (session) {
          // Get specific profile
          const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

          profileData = data
          profileError = error

          console.log("👤 AdminDebug: Profile result:", { data, error })

          // Also get all profiles to see what's in the table
          const { data: allData, error: allError } = await supabase
            .from("profiles")
            .select("id, full_name, is_admin")
            .limit(10)

          allProfiles = allData
          allProfilesError = allError

          console.log("📊 AdminDebug: All profiles sample:", { allData, allError })
        }

        // Check environment variables
        const envCheck = {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
        }

        console.log("🔧 AdminDebug: Environment:", envCheck)

        setDebugInfo({
          session: session
            ? {
                userId: session.user.id,
                email: session.user.email,
                hasSession: true,
                userMetadata: session.user.user_metadata,
                appMetadata: session.user.app_metadata,
              }
            : null,
          sessionError: sessionError?.message || null,
          profile: profileData,
          profileError: profileError?.message || null,
          allProfiles,
          allProfilesError: allProfilesError?.message || null,
          environment: envCheck,
          timestamp: new Date().toISOString(),
          // Remove the protected property access
          supabaseConfig: {
            envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            envKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
          },
        })
      } catch (error) {
        console.error("❌ AdminDebug: Error:", error)
        if (error instanceof Error) {
          setDebugInfo({ error: error.message, stack: error.stack })
        } else {
          setDebugInfo({ error: String(error) })
        }
      }
    }

    checkAuth()
  }, [])

  if (!debugInfo) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Admin Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading debug info...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Admin Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Session:</strong>{" "}
              <span className={debugInfo.session ? "text-green-600" : "text-red-600"}>
                {debugInfo.session ? "✅ Found" : "❌ None"}
              </span>
              {debugInfo.session && <div className="text-xs text-gray-500">User: {debugInfo.session.email}</div>}
            </div>
            <div>
              <strong>Profile:</strong>{" "}
              <span className={debugInfo.profile ? "text-green-600" : "text-red-600"}>
                {debugInfo.profile ? "✅ Found" : "❌ None"}
              </span>
              {debugInfo.profileError && <div className="text-xs text-red-500">Error: {debugInfo.profileError}</div>}
            </div>
            <div>
              <strong>Is Admin:</strong>{" "}
              <span className={debugInfo.profile?.is_admin ? "text-green-600" : "text-red-600"}>
                {debugInfo.profile?.is_admin ? "✅ Yes" : "❌ No"}
              </span>
              {debugInfo.profile && (
                <div className="text-xs text-gray-500">Name: {debugInfo.profile.full_name || "No name"}</div>
              )}
            </div>
            <div>
              <strong>Environment:</strong>{" "}
              <span className={debugInfo.environment?.hasSupabaseUrl ? "text-green-600" : "text-red-600"}>
                {debugInfo.environment?.hasSupabaseUrl ? "✅ OK" : "❌ Missing"}
              </span>
            </div>
          </div>

          {/* Profile Issues */}
          {debugInfo.session && !debugInfo.profile && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h4 className="font-medium text-yellow-800">Profile Not Found</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your user session exists, but no profile was found in the database. This might mean:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>The profile hasn't been created yet</li>
                <li>There's an issue with the profiles table</li>
                <li>The user ID doesn't match</li>
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>User ID:</strong> {debugInfo.session.userId}
              </p>
            </div>
          )}

          {/* Admin Status */}
          {debugInfo.profile && !debugInfo.profile.is_admin && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h4 className="font-medium text-red-800">Not Admin</h4>
              <p className="text-sm text-red-700 mt-1">
                Your profile exists but is_admin is set to <strong>{String(debugInfo.profile.is_admin)}</strong>.
              </p>
              <p className="text-sm text-red-700 mt-2">To fix this, run this SQL in your Supabase dashboard:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs mt-2">
                UPDATE profiles SET is_admin = true WHERE id = '{debugInfo.session?.userId}';
              </code>
            </div>
          )}

          {/* Success */}
          {debugInfo.profile?.is_admin && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h4 className="font-medium text-green-800">✅ Admin Access Confirmed</h4>
              <p className="text-sm text-green-700 mt-1">You have admin access! The authentication should work now.</p>
            </div>
          )}

          {/* All Profiles Sample */}
          {debugInfo.allProfiles && debugInfo.allProfiles.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h4 className="font-medium text-blue-800">Profiles in Database</h4>
              <div className="text-xs mt-2 space-y-1">
                {debugInfo.allProfiles.map((profile: any) => (
                  <div key={profile.id} className="flex justify-between">
                    <span>{profile.full_name || "No name"}</span>
                    <span className={profile.is_admin ? "text-green-600" : "text-gray-500"}>
                      {profile.is_admin ? "Admin" : "User"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Debug Data */}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Full Debug Data</summary>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto mt-2">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}
