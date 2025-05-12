import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SkyBall Investor Deck",
  description: "SkyBall investor and partner presentation deck",
}

export default function DeckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}