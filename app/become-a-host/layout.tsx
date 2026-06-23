import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Become a SkyBall Host",
  description: "Host a SkyBall™ tournament in your community. Get marketing support, organization guidance, and connect with the SkyBall network.",
  path: "/become-a-host",
  ogTitle: "Become a SkyBall™ Host",
})

export default function BecomeAHostLayout({ children }: { children: React.ReactNode }) {
  return children
}
