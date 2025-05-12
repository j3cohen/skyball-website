import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RankingsContent from "@/components/rankings-content"
import RaceTo300Announcement from "@/components/race-to-300-banner"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SkyBall Rankings",
  description: "View the current SkyBall player rankings and leaderboard.",
}

export default function RankingsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <RaceTo300Announcement />
        <RankingsContent />
      </main>
      <Footer />
    </>
  )
}

