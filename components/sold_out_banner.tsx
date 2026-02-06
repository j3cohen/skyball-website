"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface SoldOutBannerProps {
  message?: string
  className?: string
}

export default function SoldOutBanner({
  message = "SkyBall Pro Rackets are currently sold out. Orders will ship beginning the week of February 15th.",
  className = "",
}: SoldOutBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  if (!isVisible) return null

  return (
    <div className={`relative mx-auto max-w-4xl ${className}`}>
      <div className="relative rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 text-sm sm:text-base shadow-sm">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  )
}
