import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Court Conversion",
  description: "Learn how to convert a tennis or pickleball court into a SkyBall™ court. See dimensions, line markings, and everything needed to get SkyBall-ready.",
  path: "/conversion",
  ogTitle: "SkyBall™ Court Conversion Guide",
})

export default function ConversionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
