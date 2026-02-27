import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Become a SkyBall Host",
  description: "Host a SkyBall™ tournament in your community. Get marketing support, organization guidance, and connect with the SkyBall network.",
  alternates: { canonical: "https://skyball.us/become-a-host" },
  openGraph: {
    title: "Become a SkyBall™ Host",
    description: "Host a SkyBall™ tournament in your community. Get marketing support, organization guidance, and connect with the SkyBall network.",
    url: "https://skyball.us/become-a-host",
  },
}

export default function BecomeAHostLayout({ children }: { children: React.ReactNode }) {
  return children
}
