import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import UpcomingTournaments from "@/components/upcoming-tournaments"
// import TournamentList from "@/components/tournament-list"

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Find and register for upcoming SkyBall™ tournaments near you. Compete for rankings points, prizes, and the title of top SkyBall player.",
  alternates: { canonical: "https://skyball.us/tournaments" },
  openGraph: {
    title: "SkyBall™ Tournaments",
    description: "Find and register for upcoming SkyBall™ tournaments near you. Compete for rankings points, prizes, and the title of top SkyBall player.",
    url: "https://skyball.us/tournaments",
  },
}

export default function TournamentsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">SkyBall™ Tournaments</h1>
          {/* <TournamentList /> */}
          <UpcomingTournaments />
        </div>
      </main>
      <Footer />
    </>
  )
}

