import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "SkyBall for Schools",
  description: "Bring SkyBall™ to your school's PE program. Easy to learn, inclusive, and packed with health benefits. Equipment sets, curriculum guides, and tournament support included.",
  alternates: { canonical: "https://skyball.us/skyball-for-schools" },
  openGraph: {
    title: "SkyBall™ for Schools",
    description: "Bring SkyBall™ to your school's PE program. Easy to learn, inclusive, and packed with health benefits. Equipment sets, curriculum guides, and tournament support included.",
    url: "https://skyball.us/skyball-for-schools",
  },
}

export default function SkyBallForSchoolsLayout({ children }: { children: React.ReactNode }) {
  return children
}
