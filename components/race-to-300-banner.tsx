"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, X } from "lucide-react"
import Link from "next/link"

interface RaceTo300AnnouncementProps {
  className?: string
}

export default function RaceTo300Announcement({ className = "" }: RaceTo300AnnouncementProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <Alert className={`mb-6 border-sky-200 bg-sky-50 relative ${className}`}>
      <Trophy className="h-5 w-5 text-sky-600" />
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-sky-600 hover:text-sky-800 transition"
        aria-label="Dismiss Race to 300 announcement"
      >
        <X className="w-4 h-4" />
      </button>

      <AlertDescription className="text-center py-2 text-sm sm:text-base">
        <span className="font-semibold text-sky-800">RACE TO 300</span> – Be the first to reach 300 ranking points and
        win <span className="font-semibold">$300</span> from SkyBall. Each tournament winner also gets{" "}
        <span className="font-semibold">$50</span>.
        <Link href="/play?tab=tournaments" className="text-sky-600 hover:text-sky-800 underline ml-1">
          View tournaments
        </Link>
        {" • "}
        <Link href="/rankings" className="text-sky-600 hover:text-sky-800 underline ml-1">
          View rankings
        </Link>
        .
      </AlertDescription>
    </Alert>
  )
}
