import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RankingsContent from "@/components/rankings-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rankings",
  description: "Official SkyBall™ player rankings. See who's leading the national standings, track points earned from tournaments, and find top players near you.",
  alternates: { canonical: "https://skyball.us/rankings" },
  openGraph: {
    title: "SkyBall™ Player Rankings",
    description: "Official SkyBall™ player rankings. See who's leading the national standings, track points earned from tournaments, and find top players near you.",
    url: "https://skyball.us/rankings",
  },
}

export default function RankingsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <RankingsContent />
      </main>
      <Footer />
    </>
  )
}

