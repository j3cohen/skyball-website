"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import Link from "next/link"

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
    <div className={`relative overflow-hidden rounded-md mb-4 mx-auto max-w-4xl ${className}`}>
      <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 sm:px-6 text-yellow-900 shadow-sm text-sm sm:text-base relative">
        <button
          onClick={dismissAnnouncement}
          className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X size={16} />
        </button>

        <p className="font-medium mb-1">
          🎯 The Race to 300 is on — first to 300 ranking points wins $300.
        </p>
        <p>
          Each tournament earns you points. Every winner gets $50. 
          <span className="ml-1 font-semibold italic">Let’s see who hits 300 first.</span>
        </p>

        <div className="mt-3 flex gap-3">
          <Link
            href="/play?tab=tournaments"
            className="inline-block text-sm text-yellow-900 font-medium hover:underline"
          >
            View Tournaments →
          </Link>
          <Link
            href="/rankings"
            className="inline-block text-sm text-yellow-900 font-medium hover:underline"
          >
            View Rankings →
          </Link>
        </div>
      </div>
    </div>
  )
}
