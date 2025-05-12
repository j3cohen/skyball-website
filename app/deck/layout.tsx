// app/deck/layout.tsx

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SkyBall Info Deck",
  description: "SkyBall information presentation deck",
}

export default function DeckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}