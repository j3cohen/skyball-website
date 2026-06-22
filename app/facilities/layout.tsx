import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "SkyBall Facilities",
  description: "Explore SkyBall™ court facilities and venue options. Convert existing tennis or pickleball courts, or build new SkyBall-ready spaces for your community.",
  path: "/facilities",
  ogTitle: "SkyBall™ Facilities — Courts & Venues",
})

export default function FacilitiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
