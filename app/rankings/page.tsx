import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RankingsContent from "@/components/rankings-content"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Rankings",
  description: "Official SkyBall™ player rankings. See who's leading the national standings, track points earned from tournaments, and find top players near you.",
  path: "/rankings",
  ogTitle: "SkyBall™ Player Rankings",
})

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

