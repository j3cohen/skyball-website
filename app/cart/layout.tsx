import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your SkyBall™ cart and proceed to checkout.",
  robots: { index: false, follow: false },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
