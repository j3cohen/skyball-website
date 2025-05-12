"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface RaceTo300AnnouncementProps {
  className?: string
}

export default function RaceTo300Announcement({ className = "" }: RaceTo300AnnouncementProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const isDismissed = localStorage.getItem("race300AnnouncementDismissed") === "true"
    if (isDismissed) {
      setIsVisible(false)
    }
  }, [])

  const dismissAnnouncement = () => {
    setIsVisible(false)
    localStorage.setItem("race300AnnouncementDismissed", "true")
  }

  if (!isVisible) return null

  return (
    <div className={`relative overflow-hidden rounded-lg mb-6 ${className}`}>
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 animate-gradient-x p-4 sm:p-6 text-white shadow-lg">
        <button
          onClick={dismissAnnouncement}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss announcement"
        >
          <X size={20} />
        </button>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold mb-2 flex items-center">
            <span className="mr-2">🔥</span>
            The Race to 300 Has Begun
            <span className="ml-2">🔥</span>
          </h3>

          <div className="space-y-2 text-sm sm:text-base">
            <p>SkyBall is officially live — and we're rewarding the grind.</p>

            <p className="font-medium">
              Be the first player to reach 300 ranking points and win a $300 cash prize from SkyBall.
            </p>

            <p>
              Every official SkyBall tournament earns you points — and each one also comes with a $50 prize for the winner.
              Stack points, snag cash, and climb the rankings.
            </p>

            <p className="font-medium italic">Let's see who hits 300 first.</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/play?tab=tournaments"
              className="inline-block bg-white text-red-600 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              View Tournaments →
            </a>
            <a
              href="/rankings"
              className="inline-block bg-white text-red-600 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              View Rankings →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
