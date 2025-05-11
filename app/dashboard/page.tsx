import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RegisteredTournaments from "@/components/registered-tournaments"
import AvailableTournamentPasses from "@/components/available-tournament-passes"
import TournamentPassHistory from "@/components/tournament-pass-history"

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
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your Upcoming Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <RegisteredTournaments/>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your Tournament Passes</CardTitle>
              </CardHeader>
              <CardContent>
                <AvailableTournamentPasses/>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Buy Tournament Passes</CardTitle>
              </CardHeader>
              <CardContent>
                <BuyPassSection />
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your Tournament Pass History</CardTitle>
              </CardHeader>
              <CardContent>
                <TournamentPassHistory/>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
