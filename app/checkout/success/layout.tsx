import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your SkyBall™ order has been placed successfully.",
  robots: { index: false, follow: false },
}

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
