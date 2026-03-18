import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "SkyBall Facilities",
  description: "Explore SkyBall™ court facilities and venue options. Convert existing tennis or pickleball courts, or build new SkyBall-ready spaces for your community.",
  alternates: { canonical: "https://skyball.us/facilities" },
  openGraph: {
    title: "SkyBall™ Facilities — Courts & Venues",
    description: "Explore SkyBall™ court facilities and venue options. Convert existing tennis or pickleball courts, or build new SkyBall-ready spaces for your community.",
    url: "https://skyball.us/facilities",
  },
}

export default function FacilitiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
