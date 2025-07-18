"use client"

import { useState } from "react"
import { X } from "lucide-react"
import Link from "next/link"

interface RaceTo300AnnouncementProps {
  className?: string
}

export default function RaceTo300Announcement({ className = "" }: RaceTo300AnnouncementProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className={`relative overflow-hidden rounded-md mb-6 mx-auto max-w-4xl ${className}`}>
      <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 sm:px-6 text-yellow-900 shadow-sm text-sm sm:text-base relative">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800 transition"
          aria-label="Dismiss Race to 300 announcement"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="font-medium mb-1">
          🎯 Congrats to Oliver He for winning The Race to 300 — and taking home the $300.
        </p>
        <p>
          More tournaments coming soon!
          <span className="ml-1 font-semibold italic">Cash prizes at every tournament.</span>
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
