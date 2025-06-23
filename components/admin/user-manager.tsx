"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"

type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  current_city: string | null
  updated_at: string | null
}

export default function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("updated_at", { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error("Error fetching profiles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading users...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{profile.full_name || "No name"}</h3>
                <p className="text-sm text-gray-600">
                  {profile.current_city && `${profile.current_city} • `}
                  {profile.phone || "No phone"}
                </p>
                <p className="text-sm text-gray-500">
                  Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "Never"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
