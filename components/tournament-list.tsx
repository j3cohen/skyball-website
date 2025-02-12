"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function TournamentList() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold text-center mb-4">Tournaments Coming Soon</h2>
        <p className="text-center text-gray-600">
          We're excited to announce that SkyBall™ tournaments are in the works! Stay tuned for upcoming events where you
          can showcase your skills and compete with other SkyBall™ enthusiasts.
        </p>
        <p className="text-center text-gray-600 mt-4">
          Check back here for tournament announcements, dates, and registration information.
        </p>
      </CardContent>
    </Card>
  )
}

