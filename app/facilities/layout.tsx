// app/deck/layout.tsx

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SkyBall Facilities Deck",
  description: "SkyBall facilities presentation deck",
}

export default function DeckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}