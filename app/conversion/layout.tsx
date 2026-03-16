import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Court Conversion",
  description: "Learn how to convert a tennis or pickleball court into a SkyBall™ court. See dimensions, line markings, and everything needed to get SkyBall-ready.",
  alternates: { canonical: "https://skyball.us/conversion" },
  openGraph: {
    title: "SkyBall™ Court Conversion Guide",
    description: "Learn how to convert a tennis or pickleball court into a SkyBall™ court. See dimensions, line markings, and everything needed to get SkyBall-ready.",
    url: "https://skyball.us/conversion",
  },
}

export default function ConversionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
