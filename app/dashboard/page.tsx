import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RegisteredTournaments from "@/components/registered-tournaments"
import AvailableTournamentPasses from "@/components/available-tournament-passes"
import TournamentPassHistory from "@/components/tournament-pass-history"
import UpcomingTournaments from "@/components/upcoming-tournaments"

// 'at' ts-ignore – we only render this client-side
const BuyPassSection = dynamic(() => import("@/components/buy-pass-section"), {
  ssr: false,
})

export const revalidate = 0

export default async function DashboardPage() {

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 space-y-8">
           {/* 1) Upcoming tournaments + inline register buttons */}
          <UpcomingTournaments />

          {/* 2) What they’ve registered for already */}
          <RegisteredTournaments />

          {/* 3) What passes they still have */}
          <AvailableTournamentPasses />

          {/* 4) Purchase more passes */}
          <Card>
            <CardHeader>
              <CardTitle>Buy Tournament Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <BuyPassSection />
            </CardContent>
          </Card>

          {/* 5) Full history of pass activity */}
          <TournamentPassHistory />
        </div>
      </main>
      <Footer />
    </>
  )
}
