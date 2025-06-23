"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { Download, Eye } from "lucide-react"

type Registration = {
  id: string
  tournament_id: string
  user_id: string
  registered_at: string
  tournaments: {
    name: string
    date: string
    time: string
  }
  profiles: {
    full_name: string
  } | null
}

export default function RegistrationManager() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          tournaments (name, date, time),
          profiles (full_name)
        `)
        .order("registered_at", { ascending: false })

      if (error) throw error
      setRegistrations(data || [])
    } catch (error) {
      console.error("Error fetching registrations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportRegistrations = () => {
    const csv = [
      ["Tournament", "Participant", "Registration Date"],
      ...registrations.map((reg) => [
        reg.tournaments.name,
        reg.profiles?.full_name || "Unknown",
        new Date(reg.registered_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "registrations.csv"
    a.click()
  }

  if (isLoading) {
    return <div>Loading registrations...</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Registration Management</CardTitle>
        <Button onClick={exportRegistrations}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registrations.map((registration) => (
            <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{registration.tournaments.name}</h3>
                <p className="text-sm text-gray-600">Participant: {registration.profiles?.full_name || "Unknown"}</p>
                <p className="text-sm text-gray-500">
                  Registered: {new Date(registration.registered_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
