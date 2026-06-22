import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "SkyBall for Schools",
  description: "Bring SkyBall™ to your school's PE program. Easy to learn, inclusive, and packed with health benefits. Equipment sets, curriculum guides, and tournament support included.",
  path: "/skyball-for-schools",
  ogTitle: "SkyBall™ for Schools",
})

export default function SkyBallForSchoolsLayout({ children }: { children: React.ReactNode }) {
  return children
}
